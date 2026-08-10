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
      auth: { persistSession: false, autoRefreshToken: !!s.ref, detectSessionInUrl: false },
      global: { headers: { Authorization: 'Bearer ' + s.tok } }
    });
    if (s.ref) { try { await client.auth.setSession({ access_token: s.tok, refresh_token: s.ref }); } catch (e) {} }

    var user = null;
    try { var r = await client.auth.getUser(s.tok); user = r.data && r.data.user; } catch (e) {}
    if (!user) { console.warn('[VP] sso_token inválido/expirado.'); return false; }

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
      employee_id: null,
      department: prof && prof.department || null,
      sso: true
    };
    try { localStorage.setItem(SK.sessao, JSON.stringify(session)); } catch (e) {}
    VP.authed = true; VP.enabled = true; VP.session = session; VP.user = user;
    cleanUrl();
    return true;
  };

  // -------------------------------------------------------------- LOAD
  VP.loadAll = async function () {
    if (!VP.authed) return;
    var rows = [];
    try { var r = await db().from('app_state').select('collection,data'); rows = r.data || []; }
    catch (e) { console.warn('[VP] loadAll falhou (schema exposto?):', e && e.message); return; }
    var map = {};
    rows.forEach(function (row) { map[row.collection] = row.data; });
    Object.keys(SYNCED).forEach(function (col) {
      if (map[col] !== undefined && map[col] !== null) {
        try { localStorage.setItem(SYNCED[col], JSON.stringify(map[col])); } catch (e) {}
        VP._baseline[col] = map[col]; // snapshot do login p/ o merge por registro (issue #2)
      }
    });
    VP.ready = true;
    return true;
  };

  // -------------------------------------------------------------- SAVE
  // Espelho relacional (best-effort) da entidade central 'assets'.
  function normalizeStatus(s) {
    var ok = ['Disponível', 'Alocado', 'Manutenção', 'Inativo', 'Descartado'];
    return ok.indexOf(s) >= 0 ? s : 'Disponível';
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function assetToDb(a) {
    return {
      uid: a.uid,
      brand: a.marca || a.brand || null,
      model: a.modelo || a.model || null,
      serial_number: a.serial || a.serial_number || null,
      imei: a.imei || null,
      status: normalizeStatus(a.status),
      value: num(a.valor != null ? a.valor : a.value),
      details: a
    };
  }
  async function mirrorAssets(arr) {
    if (!Array.isArray(arr) || !arr.length) return;
    var rows = arr.filter(function (a) { return a && a.uid; }).map(assetToDb);
    if (!rows.length) return;
    try { await db().from('assets').upsert(rows, { onConflict: 'uid' }); }
    catch (e) { console.warn('[VP] espelho assets falhou:', e && e.message); }
  }

  VP.save = async function (storageKey, value) {
    if (!VP.enabled || !VP.ready) return;
    var col = KEY_TO_COL[storageKey];
    if (!col) return; // sessao/tema/desconhecida → só local

    // Merge por registro (issue #2): relê a cópia do servidor e aplica só as
    // mudanças deste cliente, preservando o que outros usuários gravaram.
    // Fail-safe: qualquer problema cai na gravação direta (comportamento antigo).
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
    } catch (e) { console.warn('[VP] save app_state falhou:', col, e && e.message); }
    if (col === 'assets') { mirrorAssets(toWrite); }
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
