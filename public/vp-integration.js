/* =====================================================================
 * VP Integration — SSO (token do vpsistema) + persistência no Supabase
 * (schema asset_manager, projeto Core ubdkoqxfwcraftesgmbw).
 *
 * Estratégia HÍBRIDA e segura para um app que nasceu em localStorage:
 *  - Fonte de verdade do app: tabela asset_manager.app_state (uma linha JSONB
 *    por coleção). Assim TODAS as telas passam a ler/gravar no Supabase sem
 *    reescrever a camada de render (que é síncrona e usa getData/saveData).
 *  - Espelho relacional (best-effort, não-fatal): ao salvar 'assets', também
 *    faz upsert na tabela tipada asset_manager.assets (onConflict uid) para o
 *    Painel Executivo/SQL enxergarem por coluna. Erro aqui nunca quebra o app.
 *
 * SSO: token-only (sem mexer no portal). O sso-proxy do vpsistema entrega
 * https://assetmanager.vpsistema.com/?sso_token=<JWT>. Aqui a gente lê esse
 * token, valida, pega o profile em public.profiles e monta a sessão do app.
 *
 * Requer (etapa manual no painel Supabase): expor o schema 'asset_manager' em
 * Settings → API → Exposed schemas. Sem isso o PostgREST responde 404.
 * ===================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://ubdkoqxfwcraftesgmbw.supabase.co';
  // Chave ANON é pública por design (protegida por RLS). Mesma do vpsistema.
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGtvcXhmd2NyYWZ0ZXNnbWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjUwMjcsImV4cCI6MjA5MDY0MTAyN30.s1A15nFQVne94gbz0511L2IYvHdTcgYeL0H8YU80iI8';
  var SCHEMA = 'asset_manager';

  // Espelho das chaves de localStorage do app (o app usa exatamente estas).
  var SK = {
    assets: 'am_assets', employees: 'am_employees', allocations: 'am_allocations',
    departamentos: 'am_departamentos', cargos: 'am_cargos', usuarios: 'am_usuarios',
    tema: 'am_tema', sessao: 'am_sessao', systemLog: 'am_system_log',
    sequenciaAtivos: 'am_sequencia_ativos', tickets: 'am_tickets',
    ticketsTrash: 'am_tickets_trash', comments: 'am_comments', articles: 'am_articles',
    assetHistory: 'am_asset_history', checklists: 'am_checklists', supplies: 'am_supplies',
    tiposAtivo: 'am_tipos_ativo', notifications: 'am_notifications',
    notifDedup: 'am_notif_dedup', emailQueue: 'am_email_queue', dashboardOrder: 'am_dashboard_order'
  };

  // Coleções sincronizadas no Supabase (sessao/tema ficam locais).
  // Nome lógico -> chave localStorage.
  var SYNCED = {
    assets: SK.assets, employees: SK.employees, allocations: SK.allocations,
    departamentos: SK.departamentos, cargos: SK.cargos, usuarios: SK.usuarios,
    systemLog: SK.systemLog, sequenciaAtivos: SK.sequenciaAtivos, tickets: SK.tickets,
    ticketsTrash: SK.ticketsTrash, comments: SK.comments, articles: SK.articles,
    assetHistory: SK.assetHistory, checklists: SK.checklists, supplies: SK.supplies,
    tiposAtivo: SK.tiposAtivo, notifications: SK.notifications, notifDedup: SK.notifDedup,
    emailQueue: SK.emailQueue, dashboardOrder: SK.dashboardOrder
  };
  // localStorage key -> nome lógico da coleção
  var KEY_TO_COL = {};
  Object.keys(SYNCED).forEach(function (c) { KEY_TO_COL[SYNCED[c]] = c; });

  var client = null;
  var VP = window.VP = { ready: false, authed: false, session: null, user: null, enabled: false, _baseline: {} };

  function db() { return client.schema(SCHEMA); }

  // ---- Indicador de sincronização ----
  // Mostra um selo quando as alterações NÃO estão indo para o Supabase (sessão
  // SSO caiu/expirou → grava só no localStorage) e some quando está tudo certo.
  var _syncHide = null;
  function syncBadgeEl() {
    var el = document.getElementById('vp-sync');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vp-sync';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9997;display:none;align-items:center;gap:6px;font-family:Poppins,sans-serif;font-size:12px;font-weight:600;padding:6px 11px;border-radius:999px;border:1px solid transparent;box-shadow:0 4px 14px rgba(0,0,0,.18);';
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }
  function _dot(c) { return '<span style="width:8px;height:8px;border-radius:50%;background:' + c + ';display:inline-block"></span>'; }
  VP.updateSync = function () {
    var el = syncBadgeEl();
    var synced = VP.enabled && VP.ready && !VP._saveErr;
    if (_syncHide) { clearTimeout(_syncHide); _syncHide = null; }
    if (synced) {
      el.style.display = 'flex';
      el.style.background = 'rgba(16,185,129,.14)'; el.style.color = '#059669'; el.style.borderColor = 'rgba(16,185,129,.45)';
      el.style.cursor = 'default'; el.title = ''; el.onclick = null;
      el.innerHTML = _dot('#10b981') + 'Sincronizado';
      _syncHide = setTimeout(function () { el.style.display = 'none'; }, 4000); // some quando ok
    } else {
      el.style.display = 'flex';
      el.style.background = 'rgba(245,158,11,.16)'; el.style.color = '#b45309'; el.style.borderColor = 'rgba(245,158,11,.55)';
      el.style.cursor = 'pointer';
      el.title = 'Suas alterações estão salvas só neste navegador. Reentre pelo card do vpsistema.com para sincronizar com o servidor.';
      el.onclick = function () { try { window.open('https://vpsistema.com', '_blank', 'noopener'); } catch (e) {} };
      el.innerHTML = _dot('#f59e0b') + (VP._saveErr ? 'Falha ao sincronizar' : 'Não sincronizado') + ' — reentrar';
    }
  };

  // Lê TODAS as linhas de uma tabela em páginas de 1000 (issue #6). O PostgREST
  // limita cada select a ~1000 linhas por padrão; sem paginar, coleções grandes
  // seriam truncadas silenciosamente — e com a gravação por registro (#4) os
  // registros além de 1000 poderiam ser tratados como "removidos".
  async function selectAllRows(table, columns) {
    var PAGE = 1000, from = 0, out = [];
    while (true) {
      var r = await db().from(table).select(columns).range(from, from + PAGE - 1);
      var rows = (r && r.data) || [];
      out = out.concat(rows);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  // ---- Merge 3-vias por registro (issue #2: evita lost-update) ----
  // Descobre o campo de identidade da coleção; null = coleção não-mesclável
  // (listas de strings, mapas) → grava por sobrescrita (comportamento antigo).
  function idResolver(col) {
    if (col === 'assets') return function (r) { return r && (r.uid != null ? r.uid : r.id); };
    var withId = { employees:1, allocations:1, tickets:1, ticketsTrash:1, comments:1,
                   articles:1, assetHistory:1, checklists:1, supplies:1, notifications:1 };
    if (withId[col]) return function (r) { return r && r.id; };
    return null;
  }
  // Aplica só as mudanças DESTE cliente (local vs baseline) sobre a cópia
  // ATUAL do servidor — preservando registros de outros usuários. Se algo
  // impedir um merge seguro (falta de id, tipo inesperado), devolve `local`
  // (= sobrescrita; nunca pior que hoje).
  function vpMerge(baseline, local, server, idOf) {
    if (!Array.isArray(local)) return local;
    if (!Array.isArray(server)) return local; // sem cópia no servidor → grava local
    baseline = Array.isArray(baseline) ? baseline : [];
    function mapById(arr) { var m = {}; for (var i=0;i<arr.length;i++){ var id=idOf(arr[i]); if(id==null||id==='') return null; m[id]=arr[i]; } return m; }
    var L = mapById(local), B = mapById(baseline), S = mapById(server);
    if (!L || !B || !S) return local; // algum registro sem id → sobrescrita segura
    var out = {}; Object.keys(S).forEach(function (k) { out[k] = S[k]; });
    Object.keys(L).forEach(function (k) { // insert/update deste cliente
      if (!(k in B) || JSON.stringify(L[k]) !== JSON.stringify(B[k])) out[k] = L[k];
    });
    Object.keys(B).forEach(function (k) { if (!(k in L)) delete out[k]; }); // delete deste cliente
    return Object.keys(out).map(function (k) { return out[k]; });
  }
  VP._merge = vpMerge; // exposto p/ teste

  // ---------------------------------------------------------------- SSO
  function readSSO() {
    var tok = null, ref = null;
    try {
      var q = new URLSearchParams(location.search);
      tok = q.get('sso_token'); ref = q.get('sso_refresh');
      if (!tok && location.hash) {
        var h = new URLSearchParams(location.hash.replace(/^#/, ''));
        tok = h.get('sso_token'); ref = ref || h.get('sso_refresh');
      }
    } catch (e) {}
    return { tok: tok, ref: ref };
  }

  function levelToRole(level) {
    var l = (level || '').toLowerCase();
    if (l.indexOf('admin') >= 0) return 'admin';
    if (l.indexOf('tecn') >= 0 || l.indexOf('técn') >= 0 || l.indexOf('suporte') >= 0) return 'tecnico';
    return 'user';
  }

  function profileToEmployee(profile) {
    return {
      id: profile.id,
      name: profile.name || profile.email || 'Colaborador',
      email: profile.email || '',
      depto: profile.department || '',
      cargo: profile.level || 'Colaborador',
      status: profile.is_active === false ? 'inactive' : 'active',
      is_department_lead: !!profile.is_department_lead,
      is_placeholder: !!profile.is_placeholder,
      source: 'vpsistema',
      created_at: profile.created_at || null
    };
  }

  async function buildSessionFromUser(user) {
    var prof = null;
    try {
      var p = await client.from('profiles').select('*').eq('id', user.id).single();
      prof = p.data;
    } catch (e) {}

    var session = {
      id: user.id,
      email: user.email,
      username: user.email,
      name: (prof && prof.name) || (user.email || '').split('@')[0],
      role: levelToRole(prof && prof.level),
      employee_id: prof && prof.id || null,
      department: prof && prof.department || null,
      sso: true
    };
    try { localStorage.setItem(SK.sessao, JSON.stringify(session)); } catch (e) {}
    VP.authed = true; VP.enabled = true; VP.session = session; VP.user = user;
    return session;
  }

  // Remove sso_token da URL depois de consumir (não deixa o JWT na barra).
  function cleanUrl() {
    try {
      var u = new URL(location.href);
      u.searchParams.delete('sso_token'); u.searchParams.delete('sso_refresh');
      history.replaceState({}, document.title, u.pathname + (u.search || '') + '');
    } catch (e) {}
  }

  VP.bootSSO = async function () {
    var s = readSSO();
    if (!s.tok) return false;
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[VP] supabase-js não carregou; SSO indisponível.');
      return false;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: !!s.ref, autoRefreshToken: !!s.ref, detectSessionInUrl: false },
      global: { headers: { Authorization: 'Bearer ' + s.tok } }
    });
    if (s.ref) { try { await client.auth.setSession({ access_token: s.tok, refresh_token: s.ref }); } catch (e) {} }

    var user = null;
    try { var r = await client.auth.getUser(s.tok); user = r.data && r.data.user; } catch (e) {}
    if (!user) { console.warn('[VP] sso_token inválido/expirado.'); return false; }

    await buildSessionFromUser(user, s.tok);
    cleanUrl();
    return true;
  };

  VP.bootExistingSession = async function () {
    if (!window.supabase || !window.supabase.createClient) return false;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    var session = null;
    try {
      var s = await client.auth.getSession();
      session = s.data && s.data.session;
    } catch (e) {}
    if (!session || !session.access_token) return false;
    var user = null;
    try {
      var r = await client.auth.getUser();
      user = r.data && r.data.user;
    } catch (e) {}
    if (!user) return false;
    await buildSessionFromUser(user, session.access_token);
    return true;
  };

  VP.signOut = async function () {
    try {
      if (!client && window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
          auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
        });
      }
      if (client && client.auth) await client.auth.signOut();
    } catch (e) {}
  };

  // -------------------------------------------------------------- LOAD
  VP.loadAll = async function () {
    if (!VP.authed) return;
    var staffSession = !!(VP.session && (VP.session.role === 'admin' || VP.session.role === 'tecnico'));
    var rows = [];
    try { var r = await db().from('app_state').select('collection,data'); rows = r.data || []; }
    catch (e) { console.warn('[VP] app_state indisponível; seguindo com colaboradores do portal:', e && e.message); rows = []; }
    var map = {};
    rows.forEach(function (row) { map[row.collection] = row.data; });

    // Não-promovidas: fonte de verdade é o app_state (JSONB).
    Object.keys(SYNCED).forEach(function (col) {
      if (col === 'employees' || PROMOTED[col]) return;
      if (map[col] !== undefined && map[col] !== null) {
        try { localStorage.setItem(SYNCED[col], JSON.stringify(map[col])); } catch (e) {}
        VP._baseline[col] = map[col]; // baseline p/ o merge por registro (issue #2)
      }
    });

    // Promovidas (issue #4): fonte de verdade são as tabelas tipadas (details).
    // Fallback p/ app_state se a tipada estiver vazia (transição/erro).
    for (var i = 0; i < PROMOTED_KEYS.length; i++) {
      var col = PROMOTED_KEYS[i], cfg = PROMOTED[col], arr = null;
      if (col === 'employees') continue;
      try { var t = await selectAllRows(cfg.table, 'details'); arr = t.map(function (x) { return x.details; }).filter(Boolean); }
      catch (e) { arr = null; }
      if (arr && arr.length) {
        try { localStorage.setItem(SYNCED[col], JSON.stringify(arr)); } catch (e) {}
        VP._baseline[col] = arr;
      } else if (!staffSession && (col === 'assets' || col === 'allocations')) {
        try { localStorage.setItem(SYNCED[col], JSON.stringify([])); } catch (e) {}
        VP._baseline[col] = [];
      } else if (map[col] !== undefined && map[col] !== null) {
        try { localStorage.setItem(SYNCED[col], JSON.stringify(map[col])); } catch (e) {}
        VP._baseline[col] = map[col];
      }
    }
    await VP.loadPortalEmployees();
    VP.ready = true;
    VP.updateSync();
    return true;
  };

  // -------------------------------------------------------------- SAVE
  // Promoção relacional (issue #4): para assets/employees/allocations, as
  // tabelas TIPADAS são a fonte de verdade e a gravação é POR REGISTRO
  // (upsert só do que mudou + delete só do que saiu) — sem rewrite da coleção
  // inteira. O objeto do app vive em details (leitura lossless). As demais
  // coleções continuam no app_state (JSONB) com merge por registro (issue #2).
  var STATUS_MAP = { available:'Disponível', assigned:'Alocado', maintenance:'Manutenção', inactive:'Inativo', discarded:'Descartado' };
  var STATUS_OK = ['Disponível','Alocado','Manutenção','Inativo','Descartado'];
  function mapStatus(s) { return STATUS_MAP[s] || (STATUS_OK.indexOf(s) >= 0 ? s : 'Disponível'); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

  function assetToDb(a) {
    return {
      uid: a.uid, type_id: resolveTypeId(a.type), brand: a.marca || a.brand || null, model: a.modelo || a.model || null,
      serial_number: a.serial || a.serial_number || null, imei: a.imei || null,
      status: mapStatus(a.status), value: num(a.valor != null ? a.valor : a.value), details: a
    };
  }

  // Mapas de resolução (nome/uid/app_id -> id) carregados sob demanda.
  var maps = { dept:null, role:null, assetUid:null, empApp:null, typeByCode:null, typeByLabel:null };
  async function loadRefMaps() {
    if (!maps.dept) { try { var d = await db().from('departments').select('id,name'); maps.dept = {}; (d.data||[]).forEach(function(r){ maps.dept[r.name]=r.id; }); } catch(e){ maps.dept={}; } }
    if (!maps.role) { try { var j = await db().from('job_roles').select('id,name'); maps.role = {}; (j.data||[]).forEach(function(r){ maps.role[r.name]=r.id; }); } catch(e){ maps.role={}; } }
  }
  async function loadFkMaps() {
    try { var a = await selectAllRows('assets', 'id,uid'); maps.assetUid = {}; a.forEach(function(r){ maps.assetUid[r.uid]=r.id; }); } catch(e){ maps.assetUid={}; }
    try { var e = await selectAllRows('employees', 'id,app_id'); maps.empApp = {}; e.forEach(function(r){ if(r.app_id!=null) maps.empApp[String(r.app_id)]=r.id; }); } catch(e){ maps.empApp={}; }
  }
  // issue #8: resolve assets.type_id. O app guarda o CÓDIGO do tipo (NB/DK/PR…),
  // que diverge de alguns códigos do seed (DK↔DT, PR↔IM, KB↔TC, MS↔MO, OT↔OU),
  // então traduzimos código-do-app → rótulo → id (com fallback por código/rótulo).
  var APP_TYPE_TO_LABEL = { NB:'Notebook', DK:'Desktop', MN:'Monitor', PR:'Impressora',
                            CL:'Celular', TB:'Tablet', KB:'Teclado', MS:'Mouse', HS:'Headset', OT:'Outro' };
  async function loadTypeMap() {
    if (maps.typeByCode) return;
    maps.typeByCode = {}; maps.typeByLabel = {};
    try {
      var r = await db().from('asset_types').select('id,code,label');
      (r.data || []).forEach(function (t) {
        maps.typeByCode[t.code] = t.id;
        if (t.label) maps.typeByLabel[String(t.label).toLowerCase()] = t.id;
      });
    } catch (e) {}
  }
  function resolveTypeId(t) {
    if (t == null || t === '') return null;
    var label = APP_TYPE_TO_LABEL[t];
    if (label && maps.typeByLabel && maps.typeByLabel[label.toLowerCase()] != null) return maps.typeByLabel[label.toLowerCase()];
    if (maps.typeByCode && maps.typeByCode[t] != null) return maps.typeByCode[t];
    if (maps.typeByLabel && maps.typeByLabel[String(t).toLowerCase()] != null) return maps.typeByLabel[String(t).toLowerCase()];
    return null;
  }
  function employeeToDb(e) {
    return {
      app_id: String(e.id), full_name: e.name || null, email: e.email || null,
      is_active: e.status !== 'inactive',
      department_id: (maps.dept && maps.dept[e.depto]) || null,
      job_role_id: (maps.role && maps.role[e.cargo]) || null, details: e
    };
  }

  async function syncPortalEmployeeMirror(employees) {
    if (!Array.isArray(employees) || !employees.length) return;
    try {
      await loadRefMaps();
      await db().from('employees').upsert(employees.map(employeeToDb), { onConflict: 'app_id' });
    } catch (e) {
      console.warn('[VP] espelho de colaboradores do portal falhou:', e && e.message);
    }
  }

  VP.loadPortalEmployees = async function () {
    if (!VP.authed || !client) return false;
    try {
      var profiles = await selectAllPortalProfiles();
      var employees = profiles.map(profileToEmployee);
      localStorage.setItem(SK.employees, JSON.stringify(employees));
      VP._baseline.employees = employees;
      await syncPortalEmployeeMirror(employees);
      if (VP.session && VP.user) {
        var current = employees.find(function(e) { return e.id === VP.user.id; });
        VP.session.employee_id = current ? current.id : null;
        try { localStorage.setItem(SK.sessao, JSON.stringify(VP.session)); } catch (e) {}
      }
      return true;
    } catch (e) {
      console.warn('[VP] loadPortalEmployees falhou:', e && e.message);
      return false;
    }
  };

  async function selectAllPortalProfiles() {
    var PAGE = 1000, from = 0, out = [];
    while (true) {
      var r = await client
        .from('profiles')
        .select('id,email,name,department,level,is_active,is_department_lead,is_placeholder')
        .order('name')
        .range(from, from + PAGE - 1);
      if (r.error) throw r.error;
      var rows = r.data || [];
      out = out.concat(rows);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }
  function allocationToDb(a) {
    return {
      app_id: String(a.id),
      asset_id: (maps.assetUid && maps.assetUid[a.asset_uid]) || null,
      employee_id: (maps.empApp && maps.empApp[String(a.employee_id)]) || null,
      allocated_at: a.date || null, is_current: a.status === 'active', details: a
    };
  }

  // Coleções promovidas: tipado = fonte de verdade, gravação por registro.
  var PROMOTED = {
    assets:      { table: 'assets',      key: 'uid',    keyOf: function (r) { return r && r.uid; },        toDb: assetToDb,      prep: loadTypeMap },
    employees:   { table: 'employees',   key: 'app_id', keyOf: function (r) { return r && String(r.id); }, toDb: employeeToDb,   prep: loadRefMaps },
    allocations: { table: 'allocations', key: 'app_id', keyOf: function (r) { return r && String(r.id); }, toDb: allocationToDb, prep: loadFkMaps }
  };
  var PROMOTED_KEYS = Object.keys(PROMOTED);

  // Diff por chave: o que mudou/entrou (changed) e o que saiu (removed) entre
  // o baseline (visão anterior deste cliente) e o valor atual.
  function diffByKey(baseline, value, keyOf) {
    var B = {}; (Array.isArray(baseline) ? baseline : []).forEach(function (r) { var k = keyOf(r); if (k != null) B[k] = r; });
    var changed = [], curKeys = [];
    value.forEach(function (r) {
      var k = keyOf(r); if (k == null) return; curKeys.push(k);
      if (!(k in B) || JSON.stringify(r) !== JSON.stringify(B[k])) changed.push(r);
    });
    var removed = Object.keys(B).filter(function (k) { return curKeys.indexOf(k) < 0; });
    return { changed: changed, removed: removed };
  }

  // Grava a coleção promovida POR REGISTRO. Fail-safe: se algo falhar, cai no
  // app_state (a coleção inteira) — o dado nunca se perde; só aí reamplifica.
  async function savePromoted(col, value) {
    if (!Array.isArray(value)) return;
    var cfg = PROMOTED[col];
    try {
      if (cfg.prep) await cfg.prep();
      var d = diffByKey(VP._baseline[col], value, cfg.keyOf);
      if (d.changed.length) await db().from(cfg.table).upsert(d.changed.map(cfg.toDb), { onConflict: cfg.key });
      if (d.removed.length) await db().from(cfg.table).delete().in(cfg.key, d.removed);
      VP._baseline[col] = value;
      VP._saveErr = false; VP.updateSync();
    } catch (e) {
      console.warn('[VP] savePromoted ' + col + ' falhou; fallback app_state:', e && e.message);
      VP._saveErr = true; VP.updateSync();
      try {
        await db().from('app_state').upsert({ collection: col, data: value, updated_at: new Date().toISOString(), updated_by: (VP.user && VP.user.id) || null }, { onConflict: 'collection' });
        VP._baseline[col] = value;
      } catch (e2) {}
    }
  }

  VP.save = async function (storageKey, value) {
    if (!VP.enabled || !VP.ready) return;
    var col = KEY_TO_COL[storageKey];
    if (!col) return; // sessao/tema/desconhecida → só local
    if (col === 'employees') return; // colaboradores vêm do public.profiles (portal vpsistema.com)

    // Promovidas (issue #4): gravação por registro nas tabelas tipadas.
    if (PROMOTED[col]) { await savePromoted(col, value); return; }

    // Não-promovidas — merge por registro (issue #2): relê a cópia do servidor
    // e aplica só as mudanças deste cliente. Fail-safe: cai na gravação direta.
    var toWrite = value;
    try {
      var idOf = idResolver(col);
      if (idOf && Array.isArray(value)) {
        var cur = null;
        try {
          var r = await db().from('app_state').select('data').eq('collection', col).maybeSingle();
          cur = r && r.data ? r.data.data : null;
        } catch (e) { cur = null; }
        toWrite = vpMerge(VP._baseline[col], value, cur, idOf);
      }
    } catch (e) { toWrite = value; }

    try {
      await db().from('app_state').upsert({
        collection: col,
        data: toWrite,
        updated_at: new Date().toISOString(),
        updated_by: (VP.user && VP.user.id) || null
      }, { onConflict: 'collection' });
      VP._baseline[col] = value; // baseline = visão deste cliente (não o merge)
      VP._saveErr = false; VP.updateSync();
    } catch (e) { console.warn('[VP] save app_state falhou:', col, e && e.message); VP._saveErr = true; VP.updateSync(); }
  };

  // Envolve getData/saveData do app (definidos no script inline) para
  // escrever também no Supabase. Chamado pelo glue depois que o app carrega.
  VP.wrapDataLayer = function () {
    if (typeof window.saveData === 'function' && !window.saveData.__vpWrapped) {
      var _save = window.saveData;
      window.saveData = function (key, data) {
        _save(key, data);            // mantém o localStorage (cache síncrono)
        try { VP.save(key, data); } catch (e) {} // write-through async
      };
      window.saveData.__vpWrapped = true;
    }
  };
})();
