# Tasks: Edição de Estoque Sempre Persistir Corretamente

Sem Fase 1 (Dados) e sem Fase 2/3 (Domínio/Testes de domínio) — a correção
é uma mudança pontual de geração de id, seguindo convenção já existente no
próprio arquivo (ver `research.md`/`plan.md`).

## Fase 4 — Interface

- [x] **T001** — Em `cadastrarSuprimento()`, trocar `id: 'SUP-' + Date.now()`
  por `id: 'SUP-' + Date.now() + '-' + Math.floor(Math.random() * 1000)`
  (mesma convenção de `pushNotification`/`queueEmail`).
  **Arquivo:** `public/index.html`
  **Pronto quando:** cadastrar vários itens de estoque em sequência muito
  rápida nunca produz dois itens com o mesmo `id`.

## Fase 5 — Validação

- [x] **T002** — Reproduzir o cenário original do bug: cadastrar um item
  com quantidade 0, editar para 1, e confirmar que a listagem de Estoque
  mostra 1 imediatamente (sem precisar recarregar a página).
  **Depende de:** T001.
  **Pronto quando:** o comportamento bate com o cenário de aceitação
  correspondente do `spec.md`.

- [x] **T003** — Cadastrar vários itens de estoque em sequência muito
  rápida (simulando o relato original — "vários cadastros de tintas
  seguidos") e confirmar que todos recebem ids diferentes, sem nenhuma
  linha duplicada na listagem.
  **Depende de:** T001.
  **Pronto quando:** o cenário de aceitação de cadastro rápido do
  `spec.md` passa.

- [x] **T004** — Editar um item de estoque e confirmar que apenas aquele
  item é alterado; excluir um item e confirmar que apenas aquele item
  desaparece (FR04/FR05).
  **Depende de:** T001.
  **Pronto quando:** nenhuma ação em um item afeta outro item da listagem.
