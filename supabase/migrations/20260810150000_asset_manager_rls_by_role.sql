-- =====================================================================
-- Migration PREPARADA (revisar antes de aplicar) — issue #1 / Achado F1
-- RLS por papel no schema asset_manager.
--
-- Substitui a policy permissiva única `am_authenticated_all`
-- (FOR ALL TO authenticated USING true WITH CHECK true) por policies
-- separadas de LEITURA (todos os autenticados) e ESCRITA (só staff =
-- Administrador/Técnico, lidos de public.profiles.level).
--
-- ⚠️ DEPENDÊNCIA ARQUITETURAL (importante):
-- Enquanto a PONTE JSONB (asset_manager.app_state) for o caminho de escrita
-- do app, o controle por papel NÃO protege as entidades individualmente —
-- toda a coleção é gravada numa única linha de app_state, então a RLS não
-- distingue "usuário abrindo chamado" de "usuário editando ativo".
-- Por isso:
--   • As tabelas TIPADAS abaixo já recebem o estado final (leitura p/ todos,
--     escrita só staff). Hoje o app não escreve nelas (exceto o espelho de
--     'assets', que só é escrito por admin/técnico), então isto NÃO quebra o
--     app atual.
--   • app_state mantém INSERT/UPDATE abertos a qualquer autenticado (o app
--     depende disso p/ persistir ações de usuário comum: chamados, ciência de
--     checklist, notificações). Só o DELETE de uma coleção inteira é
--     restrito a staff.
-- O controle por papel só fica COMPLETO após a promoção relacional
-- (issues #2/#3/#4). Recomenda-se aplicar F1 JUNTO com a promoção.
-- =====================================================================

-- ---------- Helper: o usuário logado é staff (admin/técnico)? ----------
-- STABLE + security definer + search_path fixo (evita function_search_path_mutable).
create or replace function asset_manager.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.level from public.profiles p where p.id = (select auth.uid())),
    ''
  ) ~* '(admin|t[eé]cnic|suporte)';
$$;

grant execute on function asset_manager.is_staff() to authenticated;

-- ---------- Tabelas tipadas: leitura p/ todos, escrita só staff ----------
do $$
declare t text;
begin
  foreach t in array array[
    'departments','job_roles','asset_types','asset_sequences','employees',
    'assets','allocations','asset_history','asset_history_photos',
    'stock_items','stock_usage','tickets','ticket_messages','ticket_attachments',
    'knowledge_articles','checklists','checklist_items','checklist_signatures',
    'system_logs','email_queue'
  ]
  loop
    -- remove a policy permissiva antiga
    execute format('drop policy if exists "am_authenticated_all" on asset_manager.%I;', t);

    -- LEITURA: qualquer colaborador autenticado
    execute format($p$
      create policy "am_read_all_authenticated" on asset_manager.%I
        as permissive for select to authenticated using (true);
    $p$, t);

    -- ESCRITA (insert/update/delete): só staff
    execute format($p$
      create policy "am_write_staff" on asset_manager.%I
        as permissive for insert to authenticated with check (asset_manager.is_staff());
    $p$, t);
    execute format($p$
      create policy "am_update_staff" on asset_manager.%I
        as permissive for update to authenticated
        using (asset_manager.is_staff()) with check (asset_manager.is_staff());
    $p$, t);
    execute format($p$
      create policy "am_delete_staff" on asset_manager.%I
        as permissive for delete to authenticated using (asset_manager.is_staff());
    $p$, t);
  end loop;
end $$;

-- ---------- app_state (ponte JSONB): interino ----------
-- Leitura + INSERT/UPDATE abertos a qualquer autenticado (necessário enquanto
-- o app grava tudo aqui). DELETE de coleção inteira só staff.
drop policy if exists "am_authenticated_all" on asset_manager.app_state;

create policy "am_state_read" on asset_manager.app_state
  as permissive for select to authenticated using (true);
create policy "am_state_insert" on asset_manager.app_state
  as permissive for insert to authenticated with check (true);
create policy "am_state_update" on asset_manager.app_state
  as permissive for update to authenticated using (true) with check (true);
create policy "am_state_delete_staff" on asset_manager.app_state
  as permissive for delete to authenticated using (asset_manager.is_staff());

-- =====================================================================
-- ROLLBACK (para referência — reverte ao estado permissivo anterior):
--   do $$ declare t text; begin
--     foreach t in array array[... todas as 21 tabelas ...] loop
--       execute format('drop policy if exists "am_read_all_authenticated" on asset_manager.%I;', t);
--       execute format('drop policy if exists "am_write_staff" on asset_manager.%I;', t);
--       execute format('drop policy if exists "am_update_staff" on asset_manager.%I;', t);
--       execute format('drop policy if exists "am_delete_staff" on asset_manager.%I;', t);
--       execute format('create policy "am_authenticated_all" on asset_manager.%I
--         as permissive for all to authenticated using (true) with check (true);', t);
--     end loop; end $$;
--   drop function if exists asset_manager.is_staff();
-- =====================================================================
