-- =====================================================================
-- RLS + grants para o schema asset_manager
-- Modelo inicial: qualquer colaborador AUTENTICADO (SSO/login VP) usa o app.
-- 'anon' fica totalmente fora (sem grant + RLS sem policy = negado).
-- Refinamento por papel (Administrador/Técnico/Usuário) fica para o
-- retrofit do frontend, quando o app passar a usar auth.uid()/profiles.level.
-- =====================================================================

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
    execute format('alter table asset_manager.%I enable row level security;', t);
    execute format($p$
      create policy "am_authenticated_all" on asset_manager.%I
        as permissive for all to authenticated
        using (true) with check (true);
    $p$, t);
  end loop;
end $$;

-- Exposição via PostgREST: authenticated e service_role.
-- (anon deliberadamente NÃO recebe usage — app é interno, atrás de login.)
grant usage on schema asset_manager to authenticated, service_role;

grant select, insert, update, delete on all tables in schema asset_manager
  to authenticated;
grant all on all tables in schema asset_manager to service_role;

grant usage, select on all sequences in schema asset_manager
  to authenticated, service_role;

-- Novos objetos futuros herdam os mesmos grants
alter default privileges in schema asset_manager
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema asset_manager
  grant all on tables to service_role;
alter default privileges in schema asset_manager
  grant usage, select on sequences to authenticated, service_role;
