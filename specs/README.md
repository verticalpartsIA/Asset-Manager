# specs/ — Artefatos de Especificação

Cada funcionalidade desenvolvida via fluxo de desenvolvimento orientado por
especificação (ver `CLAUDE.md`, seção 6) tem sua própria pasta aqui, nomeada
`<NNN>-<slug>` (ex.: `001-checklist-semestral`), contendo, conforme as
etapas forem executadas:

| Arquivo | Gerado por | Conteúdo |
| --- | --- | --- |
| `spec.md` | `/specify` | Comportamento e regras de negócio (sem detalhes técnicos) |
| `spec.md` (seção extra) | `/clarify` | `## Decisões de Clarificação` com perguntas e respostas |
| `research.md` | `/plan` | Decisões técnicas e referências consultadas |
| `data-model.md` | `/plan` | Entidades, colunas, tipos, RLS |
| `plan.md` | `/plan` | Plano técnico: arquivos a criar/alterar, passos |
| `tasks.md` | `/tasks` | Tarefas atômicas sequenciais (`T001`, `T002`, ...) |
| `analysis.md` (opcional) | `/analyze` | Relatório de auditoria, se o usuário pedir para registrar |

Ordem de uso: `/specify` → `/clarify` → `/plan` → `/tasks` → `/analyze` →
`/implement`. A pasta de maior número é considerada a "feature atual" quando
nenhuma é indicada explicitamente.
