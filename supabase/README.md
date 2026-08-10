# Migrations — schema `asset_manager` (projeto Core `ubdkoqxfwcraftesgmbw`)

Este diretório versiona o schema do Asset Manager, que vive **isolado** no
schema `asset_manager` do Supabase do vpsistema (Core). A identidade de
usuário reusa `public.profiles` — nada em `public` é alterado.

## Ordem das migrations

| Arquivo | Aplicada? | O quê |
| --- | --- | --- |
| `20260810030533_asset_manager_schema_structure.sql` | ✅ | Schema + 20 tabelas + índices + triggers `updated_at` |
| `20260810030555_asset_manager_rls_and_grants.sql` | ✅ | RLS (permissiva inicial) + grants (authenticated/service_role; anon fora) |
| `20260810030624_asset_manager_seed_reference.sql` | ✅ | Seed de departamentos, cargos e tipos de ativo |
| `20260810111650_asset_manager_hybrid_bridge.sql` | ✅ | `details` jsonb + tabela `app_state` (ponte JSONB) |
| `20260810140305_asset_manager_mirror_keys.sql` | ✅ | `app_id`/`details` p/ espelho de employees/allocations (issue #3) |
| `20260810150000_asset_manager_rls_by_role.sql` | ⏳ **preparada, não aplicada** | RLS por papel (issue #1) — aplicar quando aprovado |

## Como aplicar

O deploy do site (GitHub Actions → Hostinger) é **estático** e **não** roda
migrations. Aplique-as no banco por um destes caminhos:

- **Supabase CLI**: `supabase link --project-ref ubdkoqxfwcraftesgmbw && supabase db push`
- **Dashboard**: SQL Editor, colando o conteúdo do arquivo.
- **MCP/API**: `apply_migration` (foi como as ✅ acima foram aplicadas).

> As migrations ✅ foram aplicadas via MCP e depois **exportadas** para cá a
> partir de `supabase_migrations.schema_migrations` (fonte de verdade), para o
> schema ser reproduzível a partir do repositório (issue #5).
