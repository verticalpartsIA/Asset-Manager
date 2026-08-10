-- issue #7 — índice de cobertura para a FK app_state.updated_by
-- (advisor: unindexed_foreign_keys). DDL trivial e aditiva.
create index if not exists app_state_updated_by_idx
  on asset_manager.app_state (updated_by);
