# Data Model: Busca Rápida de Ativos

## Mudança de schema necessária

**Nenhuma.** Por exigência da Constituição (seção 3 — "Toda mudança de
schema é feita por uma nova migração versionada"), só se cria migração
quando há mudança real de schema; esta feature é somente leitura sobre
dados que já existem no cliente, então nenhuma migração em
`supabase/migrations/` é adicionada e nenhuma política de RLS é alterada.

## Entidades existentes consultadas (somente leitura)

A busca lê (sem alterar) três coleções já carregadas em `localStorage` via
`getData(SK.<chave>)` (`public/index.html`, mapa `SK` em torno da linha
2103):

### `asset` (`SK.assets`, chave `am_assets`)

| Campo | Tipo | Uso na busca |
| --- | --- | --- |
| `uid` | string | Campo de correspondência (contém, case-insensitive) |
| `serial` | string | Campo de correspondência (contém, case-insensitive) |
| `imei` | string (opcional, só `type === 'CL'`) | Campo de correspondência (contém, case-insensitive) |
| `type` | string (código: `NB`, `DK`, `MN`, `PR`, `CL`, `TB`, `KB`, `MS`, `HS`, `OT`) | Exibido no resultado (via `typeLabel`, já existente) |
| `status` | string (`available`, `assigned`, `maintenance`, `inactive`, `discarded`) | Exibido no resultado (já exibido hoje) e combinável com o filtro de status existente (`ativoFiltro`) |

### `allocation` (`SK.allocations`)

| Campo | Tipo | Uso na busca |
| --- | --- | --- |
| `asset_uid` | string | Chave de cruzamento com `asset.uid` |
| `employee_id` | string/number | Chave de cruzamento com `employee.id` |
| `status` | string (`'active'` = alocação vigente) | Filtra qual alocação representa o responsável atual |

### `employee` (`SK.employees`)

| Campo | Tipo | Uso na busca |
| --- | --- | --- |
| `id` | string/number | Chave de cruzamento com `allocation.employee_id` |
| `name` | string | Exibido como "Responsável atual" no resultado |

## Regra derivada: "responsável atual" de um ativo

Não é um campo armazenado — é derivado em tempo de leitura:

```
responsável_atual(asset) =
  allocation em SK.allocations onde allocation.asset_uid == asset.uid
                               e allocation.status == 'active'
  → employee em SK.employees onde employee.id == allocation.employee_id
  → employee.name, ou "Disponível" se nenhuma alocação ativa for encontrada
```

Essa regra vira a função pura `resolveCurrentHolder` descrita em `plan.md`.

## RLS

Não aplicável — nenhuma tabela nova ou consulta Supabase nova é introduzida
por esta feature.
