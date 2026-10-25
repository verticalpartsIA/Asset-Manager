---
name: implement
description: Executa as tarefas de tasks.md sequencialmente, gerando código, migrações e testes. Último passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Implement — Implementação e Testes

## Objetivo
Executar as tarefas mapeadas em `tasks.md`, gerando o código-fonte,
aplicando migrações e rodando os testes automatizados.

## Instruções

1. Identifique a feature alvo (mesma lógica das skills anteriores). Se
   `/analyze` ainda não rodou ou apontou violações críticas (❌) não
   resolvidas, avise o usuário e confirme antes de prosseguir.
2. Leia `tasks.md` e execute as tarefas **sequencialmente**, respeitando as
   dependências indicadas.
3. Respeite rigorosamente os limites definidos em `CLAUDE.md`, em especial:
   - Lógica de negócio isolada em `public/js/domain/*.js`, nunca embutida
     diretamente em handlers de UI.
   - Nenhuma tabela nova sem política RLS correspondente.
   - Nenhuma chave `service_role` no frontend.
   - Toda alteração de schema via nova migração em `supabase/migrations/`,
     nunca editando migrações já aplicadas.
4. Para cada regra de negócio nova ou alterada, escreva o teste
   correspondente em `tests/domain/*.test.mjs` (usando `node:test` /
   `node:assert`, conforme já usado no projeto).
5. Ao concluir cada tarefa, marque-a como feita em `tasks.md`
   (`- [x] T00N ...`).
6. Ao final de todas as tarefas, rode `npm test` para garantir que tudo
   passa sem erros. Se o projeto tiver outras checagens relevantes (lint,
   validação de HTML), rode-as também.
7. Reporte um resumo do que foi implementado, quais arquivos mudaram e o
   resultado dos testes. Nunca declare a feature concluída se os testes não
   passaram.

## Saída
- Código-fonte, migrações e testes implementados conforme `tasks.md`.
- `tasks.md` atualizado com o progresso (checkboxes marcados).
- Resultado da execução de `npm test` reportado ao usuário.
