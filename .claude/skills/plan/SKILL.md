---
name: plan
description: Cria o plano de arquitetura técnica e o modelo de dados a partir da especificação já clarificada, respeitando a Constituição do projeto. Terceiro passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Plan — Planejamento Técnico

## Objetivo
Criar o plano de arquitetura técnica e o modelo de dados, cruzando a
especificação aprovada (`spec.md`, já clarificada) com as restrições da
Constituição (`CLAUDE.md`).

## Instruções

1. Identifique a feature alvo (mesma lógica do `/clarify`: pasta indicada
   pelo usuário ou `specs/<NNN>-*/` de maior número).
2. Confira se `spec.md` já tem a seção `## Decisões de Clarificação` (ou
   seja, que `/clarify` já rodou). Se faltar e houver ambiguidades óbvias no
   texto, recomende rodar `/clarify` antes de continuar em vez de assumir
   respostas.
3. Leia `CLAUDE.md` e confirme a stack permitida para este projeto: HTML +
   JavaScript vanilla, Supabase (Postgres + Auth + Storage + Edge
   Functions), deploy estático via GitHub Actions para Hostinger — ver
   seção "Stack Técnica" da Constituição. Não proponha frameworks,
   bundlers ou bibliotecas fora do que a Constituição autoriza, a menos que
   isso seja o próprio objeto da especificação em questão.
4. Gere três artefatos dentro de `specs/<NNN>-<slug>/`:
   - **`research.md`**: decisões técnicas que exigiram investigação (ex.:
     como o RLS do Supabase deve tratar um novo caso, limitações de uma API
     usada), com as referências/fontes consultadas.
   - **`data-model.md`**: entidades, colunas, tipos, chaves,
     relacionamentos e políticas de RLS necessárias (tabelas novas ou
     alteradas em `supabase/migrations/`).
   - **`plan.md`**: plano técnico detalhado — quais arquivos/módulos serão
     criados ou alterados (ex.: novo módulo em `public/js/domain/`, nova
     migração, alteração em `public/index.html` ou
     `public/vp-integration.js`), fluxo de dados e passos de implementação
     em ordem lógica.
5. Toda decisão arquitetural deve apontar explicitamente para a regra da
   Constituição que a justifica (ex.: "lógica de SLA fica em
   `public/js/domain/sla.js` por exigência da seção 3 da Constituição").
6. Ao final, informe os três arquivos gerados e recomende rodar `/tasks` em
   seguida.

## Saída
- `specs/<NNN>-<slug>/research.md`
- `specs/<NNN>-<slug>/data-model.md`
- `specs/<NNN>-<slug>/plan.md`
