# Tasks: Busca Rápida de Ativos

Sem Fase 1 (Dados): `plan.md`/`data-model.md` concluem que nenhuma migração
Supabase é necessária — esta feature é somente leitura sobre dados já
carregados no cliente.

## Fase 2 — Domínio

- [ ] **T001** — Criar `public/js/domain/assetSearch.js` com as funções
  puras `normalizarTermoBusca`, `ativoCorrespondeABusca` e
  `filtrarAtivosPorBusca` (ver `plan.md`, seção 1), seguindo o padrão de
  `public/js/domain/uid.js` (ES module + `window.AssetSearchDomain` ao
  final).
  **Arquivo:** `public/js/domain/assetSearch.js`
  **Pronto quando:** o módulo exporta as três funções nomeadas, não toca
  `localStorage`/DOM/Supabase, e expõe `window.AssetSearchDomain` com as
  mesmas três funções.

- [ ] **T002** — Criar `public/js/domain/assetHolder.js` com a função pura
  `resolveCurrentHolder` (ver `plan.md`, seção 2 e `data-model.md`, regra
  "responsável atual"), seguindo o mesmo padrão (`window.AssetHolderDomain`
  ao final).
  **Arquivo:** `public/js/domain/assetHolder.js`
  **Pronto quando:** o módulo exporta `resolveCurrentHolder`, recebe
  `allocations`/`employees` como parâmetros (sem ler `localStorage`
  diretamente), e expõe `window.AssetHolderDomain`.
  *(Independente de T001 — pode ser feita em paralelo.)*

## Fase 3 — Testes de Domínio

- [ ] **T003** — Criar `tests/domain/assetSearch.test.mjs`, importando de
  `../../public/js/domain/assetSearch.js` (não via `window`), cobrindo:
  termo vazio retorna tudo; match por substring em `uid`; match em
  `serial`; match em `imei`; case-insensitive; nenhum campo bate → item
  filtrado fora; `filtrarAtivosPorBusca` com `getAsset` extraindo de
  `{ asset, allocation }`.
  **Depende de:** T001.
  **Arquivo:** `tests/domain/assetSearch.test.mjs`
  **Pronto quando:** `node --test tests/domain/assetSearch.test.mjs` passa
  sem falhas.

- [ ] **T004** — Criar `tests/domain/assetHolder.test.mjs`, importando
  `resolveCurrentHolder` de `../../public/js/domain/assetHolder.js`,
  cobrindo: nenhuma alocação ativa para o `asset_uid` → `null`; alocação
  ativa mas sem `employee` correspondente → `null`; alocação ativa com
  `employee` → retorna `{ employeeId, employeeName }`; lista com uma
  alocação inativa e uma ativa para o mesmo ativo → usa somente a ativa.
  **Depende de:** T002.
  **Arquivo:** `tests/domain/assetHolder.test.mjs`
  **Pronto quando:** `node --test tests/domain/assetHolder.test.mjs` passa
  sem falhas.

- [ ] **T005** — Rodar `npm test` (suíte completa) e confirmar que nenhum
  teste existente quebrou com os dois módulos novos.
  **Depende de:** T003, T004.
  **Pronto quando:** `npm test` termina sem falhas.

## Fase 4 — Interface

- [ ] **T006** — Carregar os dois módulos novos em `public/index.html`,
  junto aos `<script type="module">` de `uid.js`/`sla.js` (linhas 22-24).
  **Depende de:** T001, T002 (os arquivos precisam existir).
  **Arquivo:** `public/index.html`
  **Pronto quando:** as duas novas tags `<script type="module">` estão
  presentes e `window.AssetSearchDomain`/`window.AssetHolderDomain` ficam
  disponíveis ao carregar a página (checar no console do navegador).

- [ ] **T007** — Adicionar o campo de busca (`input#ativos-busca`) na barra
  de filtros da tela de Ativos (`.table-header-bar`, ao lado dos botões de
  status), com placeholder "Buscar por UID, serial ou IMEI..." e
  `aria-label` equivalente.
  **Depende de:** T006.
  **Arquivo:** `public/index.html`
  **Pronto quando:** o campo aparece visualmente na tela de Ativos, acima
  da tabela, sem quebrar o layout dos botões de status existentes.

- [ ] **T008** — Adicionar a variável de módulo `ativoBusca = ''` (ao lado
  de `ativoFiltro`) e a função `buscarAtivos(termo)` (ao lado de
  `filtrarAtivos`), chamada pelo `oninput` do campo criado em T007.
  **Depende de:** T007.
  **Arquivo:** `public/index.html`
  **Pronto quando:** digitar no campo de busca chama `buscarAtivos` e
  atualiza `ativoBusca` a cada tecla.

- [ ] **T009** — Em `renderAtivos()`, aplicar
  `window.AssetSearchDomain.filtrarAtivosPorBusca(filtered, ativoBusca, item => item.asset)`
  depois do filtro de status existente e antes de montar `tbody.innerHTML`.
  **Depende de:** T008.
  **Arquivo:** `public/index.html`
  **Pronto quando:** digitar um termo no campo filtra a tabela em tempo
  real, combinando corretamente com o filtro de status já ativo (FR08 da
  spec) e respeitando o escopo por perfil (`ativosSobTutelaDoUsuarioAtual`
  continua intacto para o perfil Usuário).

- [ ] **T010** — Adicionar a coluna "Responsável Atual" no cabeçalho da
  tabela e, para cada linha, calcular o responsável via
  `window.AssetHolderDomain.resolveCurrentHolder(a.uid, allocations, employees)`
  (carregando `allocations`/`employees` **uma vez** antes do `.map()`, não a
  cada linha), exibindo o nome ou "Disponível" quando `null`. Mostrar a
  coluna igualmente na visão restrita do perfil Usuário (`userScoped`) —
  ver Decisão de Clarificação 5 do `spec.md`: não há branch por papel aqui.
  Atualizar também os dois `colspan="8"` hardcoded (`public/index.html`,
  mensagens de "nenhum colaborador vinculado" e "nenhum ativo encontrado")
  para `colspan="9"`, já que a tabela passa a ter 9 colunas.
  **Depende de:** T009.
  **Arquivo:** `public/index.html`
  **Pronto quando:** cada linha da tabela de Ativos (Admin/Técnico e visão
  restrita do Usuário) mostra o responsável atual ou "Disponível" (FR05 da
  spec), e as duas mensagens de linha vazia continuam alinhadas com a nova
  contagem de colunas.

- [ ] **T011** — Confirmar/ajustar a mensagem de lista vazia já existente
  (`'Nenhum ativo encontrado'`) para cobrir o caso de busca sem resultado
  (FR06 da spec), limpar o campo de busca restaurando a lista completa
  (FR07) respeitando os demais filtros ativos.
  **Depende de:** T009.
  **Arquivo:** `public/index.html`
  **Pronto quando:** buscar um termo sem correspondência mostra a mensagem
  de "nenhum resultado" e limpar o campo restaura a lista (combinada com o
  filtro de status, se houver um ativo).

## Fase 5 — Validação

- [ ] **T012** — Validar manualmente, como Administrador e como Técnico, os
  5 cenários de aceitação do `spec.md` (busca por trecho de UID; busca por
  serial; busca sem correspondência; busca combinada com filtro de status;
  limpar a busca restaura a lista).
  **Depende de:** T006, T007, T008, T009, T010, T011.
  **Pronto quando:** todos os 5 cenários se comportam exatamente como
  descrito no `spec.md`.

- [ ] **T013** — Confirmar, logado como Usuário, que a tela de Ativos
  (visão restrita aos equipamentos sob sua tutela) exibe a busca e a coluna
  de responsável normalmente, que o escopo
  `ativosSobTutelaDoUsuarioAtual()` não foi alterado por engano pelas
  mudanças em `renderAtivos()`, e que a página "Meus Dispositivos" (tela
  separada, fora do escopo desta feature) continua funcionando como antes.
  **Depende de:** T009, T010.
  **Pronto quando:** logar como Usuário mostra o campo de busca e a coluna
  de responsável na tela de Ativos, filtrando corretamente apenas os
  equipamentos sob sua tutela, sem regressão em "Meus Dispositivos".
