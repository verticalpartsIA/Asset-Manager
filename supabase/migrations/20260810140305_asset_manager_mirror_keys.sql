-- =====================================================================
-- Migration PREPARADA (revisar antes de aplicar) — issue #3
-- Chaves de espelho para employees/allocations + details em allocations.
--
-- O espelho relacional (vp-integration.js → syncMirror) faz upsert por uma
-- chave natural do app e propaga DELETE. Para employees e allocations essa
-- chave é `app_id` (o id do objeto no app). Aditiva e segura: colunas novas
-- e nuláveis; NÃO afeta o app em produção (que ignora estas tabelas).
--
-- ⚠️ Ordem: aplicar ESTA migration ANTES de mergear o código da issue #3 na
-- main. Se o código subir sem as colunas, o espelho de employees/allocations
-- simplesmente falha em silêncio (best-effort) — o app segue normal.
-- =====================================================================

-- Colunas de chave natural do app + carga bruta
alter table asset_manager.employees   add column if not exists app_id  text;
alter table asset_manager.allocations add column if not exists app_id  text;
alter table asset_manager.allocations add column if not exists details jsonb not null default '{}'::jsonb;

-- Únicos p/ permitir upsert onConflict=app_id (múltiplos NULL são permitidos)
create unique index if not exists employees_app_id_key   on asset_manager.employees(app_id);
create unique index if not exists allocations_app_id_key on asset_manager.allocations(app_id);
