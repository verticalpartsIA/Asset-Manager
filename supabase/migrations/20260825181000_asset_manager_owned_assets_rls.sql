-- Issue #37: colaboradores comuns veem somente ativos sob sua tutela.
-- Admin/Técnico continuam com inventário completo.

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

create or replace function asset_manager.current_employee_row_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from asset_manager.employees e
  where e.app_id = (select auth.uid())::text
  limit 1;
$$;

grant execute on function asset_manager.current_employee_row_id() to authenticated;

alter table asset_manager.assets enable row level security;
alter table asset_manager.allocations enable row level security;
alter table asset_manager.app_state enable row level security;

drop policy if exists "am_authenticated_all" on asset_manager.assets;
drop policy if exists "am_read_all_authenticated" on asset_manager.assets;
drop policy if exists "am_write_staff" on asset_manager.assets;
drop policy if exists "am_update_staff" on asset_manager.assets;
drop policy if exists "am_delete_staff" on asset_manager.assets;

create policy "am_assets_read_staff_or_current_holder" on asset_manager.assets
  as permissive for select to authenticated
  using (
    asset_manager.is_staff()
    or (
      status <> 'Descartado'
      and exists (
        select 1
        from asset_manager.allocations al
        where al.asset_id = assets.id
          and al.employee_id = asset_manager.current_employee_row_id()
          and al.is_current is true
          and al.returned_at is null
      )
    )
  );

create policy "am_assets_insert_staff" on asset_manager.assets
  as permissive for insert to authenticated with check (asset_manager.is_staff());
create policy "am_assets_update_staff" on asset_manager.assets
  as permissive for update to authenticated
  using (asset_manager.is_staff()) with check (asset_manager.is_staff());
create policy "am_assets_delete_staff" on asset_manager.assets
  as permissive for delete to authenticated using (asset_manager.is_staff());

drop policy if exists "am_authenticated_all" on asset_manager.allocations;
drop policy if exists "am_read_all_authenticated" on asset_manager.allocations;
drop policy if exists "am_write_staff" on asset_manager.allocations;
drop policy if exists "am_update_staff" on asset_manager.allocations;
drop policy if exists "am_delete_staff" on asset_manager.allocations;

create policy "am_allocations_read_staff_or_own_current" on asset_manager.allocations
  as permissive for select to authenticated
  using (
    asset_manager.is_staff()
    or (
      employee_id = asset_manager.current_employee_row_id()
      and is_current is true
      and returned_at is null
    )
  );

create policy "am_allocations_insert_staff" on asset_manager.allocations
  as permissive for insert to authenticated with check (asset_manager.is_staff());
create policy "am_allocations_update_staff" on asset_manager.allocations
  as permissive for update to authenticated
  using (asset_manager.is_staff()) with check (asset_manager.is_staff());
create policy "am_allocations_delete_staff" on asset_manager.allocations
  as permissive for delete to authenticated using (asset_manager.is_staff());

drop policy if exists "am_authenticated_all" on asset_manager.app_state;
drop policy if exists "am_state_read" on asset_manager.app_state;
drop policy if exists "am_state_insert" on asset_manager.app_state;
drop policy if exists "am_state_update" on asset_manager.app_state;
drop policy if exists "am_state_delete_staff" on asset_manager.app_state;

create policy "am_state_read_non_sensitive_or_staff" on asset_manager.app_state
  as permissive for select to authenticated
  using (
    asset_manager.is_staff()
    or collection not in ('assets', 'allocations')
  );

create policy "am_state_insert_non_sensitive_or_staff" on asset_manager.app_state
  as permissive for insert to authenticated
  with check (
    asset_manager.is_staff()
    or collection not in ('assets', 'allocations')
  );

create policy "am_state_update_non_sensitive_or_staff" on asset_manager.app_state
  as permissive for update to authenticated
  using (
    asset_manager.is_staff()
    or collection not in ('assets', 'allocations')
  )
  with check (
    asset_manager.is_staff()
    or collection not in ('assets', 'allocations')
  );

create policy "am_state_delete_staff" on asset_manager.app_state
  as permissive for delete to authenticated using (asset_manager.is_staff());
