-- Ponte híbrida: coleções não-centrais do app ficam em JSONB;
-- colunas 'details' guardam campos do app sem coluna tipada (hardware etc.).

alter table asset_manager.assets    add column if not exists details jsonb not null default '{}'::jsonb;
alter table asset_manager.employees add column if not exists details jsonb not null default '{}'::jsonb;

create table if not exists asset_manager.app_state (
  collection  text primary key,
  data        jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table asset_manager.app_state enable row level security;
drop policy if exists "am_authenticated_all" on asset_manager.app_state;
create policy "am_authenticated_all" on asset_manager.app_state
  as permissive for all to authenticated using (true) with check (true);

grant select, insert, update, delete on asset_manager.app_state to authenticated;
grant all on asset_manager.app_state to service_role;
