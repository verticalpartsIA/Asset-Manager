# Data Model: Busca por Responsável e Departamento em Ativos

## Mudança de schema necessária

**Nenhuma.** Por exigência da Constituição (seção 3), esta feature é
somente leitura sobre dados que já existem em `localStorage`
(`SK.assets`, `SK.allocations`, `SK.employees`) — os mesmos já lidos pela
feature 001. Nenhuma migração em `supabase/migrations/` é necessária.

## Entidades existentes consultadas (sem alteração de schema)

Mesmas três entidades da feature 001 (ver
`specs/001-busca-rapida-ativos/data-model.md`), com um campo adicional do
`employee` passando a ser lido:

### `employee` (`SK.employees`)

| Campo | Tipo | Uso nesta feature |
| --- | --- | --- |
| `id` | string/number | Já usado (cruzamento com `allocation.employee_id`) |
| `name` | string | Já usado (nome do responsável) |
| `depto` | string | **Novo nesta feature** — departamento do responsável, comparado com o termo de busca |

Nenhum campo novo é adicionado ao objeto `employee` — `depto` já existe e
já é preenchido no cadastro de colaborador; esta feature só passa a lê-lo
para fins de busca.

## Mudança aditiva na regra derivada "responsável atual" (feature 001)

```
responsável_atual(asset) =
  allocation em SK.allocations onde allocation.asset_uid == asset.uid
                               e allocation.status == 'active'
  → employee em SK.employees onde employee.id == allocation.employee_id
  → { employeeId: employee.id, employeeName: employee.name,
      employeeDepartment: employee.depto }  // employeeDepartment é novo
  → ou null, se nenhuma alocação ativa for encontrada
```

`employeeDepartment` é um campo novo no objeto retornado por
`resolveCurrentHolder` — aditivo, não quebra nenhum consumidor existente
(a coluna "Responsável Atual" da feature 001 só lê `employeeName`).

## RLS

Não aplicável — nenhuma tabela Supabase nova ou consulta nova é
introduzida por esta feature.
