# Tasks: Desktop com os mesmos campos de TI do Notebook

Sem Fase 1 (Dados) e sem Fase 2/3 (Domínio/Testes de domínio) — mudança é
só de apresentação/persistência de formulário (ver `research.md`).

## Fase 4 — Interface

- [x] **T001** — Em `renderAtivos()`, estender a condição da coluna "Info
  Extra" de `a.type === 'NB'` para também cobrir `a.type === 'DK'`.
  **Arquivo:** `public/index.html`
  **Pronto quando:** um ativo Desktop com `serviceTag` preenchido mostra
  "ST: ..." na coluna Info Extra, igual a um Notebook.

- [x] **T002** — Em `mostrarDetalhesAtivo()`, estender o bloco de detalhes
  de `a.type === 'NB'` para também cobrir `a.type === 'DK'`.
  **Arquivo:** `public/index.html`
  **Pronto quando:** abrir Detalhes de um ativo Desktop mostra os 11
  campos de TI com os valores salvos.

- [x] **T003** — Em `gerarCamposDinamicosHtml()`, estender a condição de
  `tipo === 'NB'` para também cobrir `tipo === 'DK'`.
  **Arquivo:** `public/index.html`
  **Pronto quando:** selecionar "Desktop (DK)" no cadastro ou abrir o
  modal de edição de um Desktop mostra os mesmos 11 campos de Notebook.

- [x] **T004** — Em `cadastrarAtivo()`, estender a gravação dos campos de
  `tipo === 'NB'` para também cobrir `tipo === 'DK'`.
  **Depende de:** T003.
  **Arquivo:** `public/index.html`
  **Pronto quando:** cadastrar um Desktop com os campos preenchidos salva
  corretamente todos os valores no ativo.

- [x] **T005** — Em `confirmarEditarAtivo()`, estender a gravação dos
  campos de `a.type === 'NB'` para também cobrir `a.type === 'DK'`.
  **Depende de:** T003.
  **Arquivo:** `public/index.html`
  **Pronto quando:** editar um Desktop e alterar os campos persiste as
  mudanças corretamente.

## Fase 5 — Validação

- [x] **T006** — Validar manualmente em navegador: cadastrar um Desktop
  preenchendo os 11 campos; abrir Detalhes e confirmar os valores; editar
  e alterar um valor; confirmar que Notebook continua funcionando sem
  nenhuma mudança (FR05).
  **Depende de:** T001, T002, T004, T005.
  **Pronto quando:** todos os cenários de aceitação do `spec.md` passam.
