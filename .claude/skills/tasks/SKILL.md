---
name: tasks
description: Decompõe o plano técnico em tarefas atômicas, sequenciais e verificáveis. Quarto passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Tasks — Decomposição de Tarefas

## Objetivo
Fracionar o plano técnico (`plan.md`) em tarefas pequenas, sequenciais,
independentes e verificáveis.

## Instruções

1. Identifique a feature alvo (mesma lógica das skills anteriores).
2. Leia `plan.md`, `data-model.md` e `research.md` gerados por `/plan`, além
   de `CLAUDE.md`.
3. Crie `specs/<NNN>-<slug>/tasks.md` dividindo o trabalho em fases
   adequadas ao stack real deste projeto (omita fases que não se apliquem à
   feature em questão):
   - **Fase 1 — Dados**: migrações Supabase (`supabase/migrations/*.sql`) e
     políticas de RLS necessárias.
   - **Fase 2 — Domínio**: funções de regra de negócio em
     `public/js/domain/` (puras, testáveis).
   - **Fase 3 — Testes de Domínio**: testes em `tests/domain/*.test.mjs`
     cobrindo a Fase 2.
   - **Fase 4 — Interface**: alterações em `public/index.html` /
     `public/vp-integration.js` (telas, formulários, integração com
     Supabase).
   - **Fase 5 — Validação**: checklist manual de aceitação com base nos
     "Cenários de Aceitação" do `spec.md`.
4. Nomeie as tarefas sequencialmente (`T001`, `T002`, ...), cada uma com:
   - Descrição objetiva do que fazer.
   - Arquivo(s) afetado(s).
   - Critério de pronto (o que deve ser verdade ao concluir).
5. Marque dependências entre tarefas quando existirem (ex.: "depende de
   T003") e ordene o arquivo de forma que uma tarefa nunca apareça antes de
   suas dependências.
6. Use checkboxes Markdown (`- [ ] T001 ...`) para permitir acompanhar o
   progresso durante o `/implement`.
7. Ao final, informe que `tasks.md` está pronto e recomende rodar
   `/analyze` antes de `/implement`.

## Saída
- `specs/<NNN>-<slug>/tasks.md`
