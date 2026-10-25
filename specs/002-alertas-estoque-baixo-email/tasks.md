# Tasks: Alertas de Estoque Baixo por E-mail

Sem Fase 1 (Dados): `plan.md`/`data-model.md` concluem que nenhuma migração
Supabase é necessária — o destinatário é uma constante de código, não um
dado persistido, e o resto já vive em `localStorage` como hoje.

## Fase 2 — Domínio

- [x] **T001** — Criar `public/js/domain/stockAlert.js` com as funções
  puras `cruzouNivelCritico` e `montarAlertaEstoqueEmail` (ver `plan.md`,
  seção 1), seguindo o padrão de `public/js/domain/uid.js` (ES module +
  `window.StockAlertDomain` ao final).
  **Arquivo:** `public/js/domain/stockAlert.js`
  **Pronto quando:** o módulo exporta as duas funções nomeadas, não toca
  `localStorage`/DOM/Supabase, e expõe `window.StockAlertDomain` com as
  mesmas duas funções.

## Fase 3 — Testes de Domínio

- [x] **T002** — Criar `tests/domain/stockAlert.test.mjs`, importando de
  `../../public/js/domain/stockAlert.js`, cobrindo todos os casos listados
  em `plan.md` seção 7: `Disponível→Baixo`, `Baixo→Esgotado`,
  `Disponível→Esgotado` (todos `true`); `Baixo→Baixo` sem mudança,
  `Esgotado→Baixo` e `Esgotado→Disponível` (melhora, todos `false`);
  `null`/`undefined→Baixo` (item novo já crítico, `true`);
  `null`/`undefined→Disponível` (item novo sem criticidade, `false`); e o
  texto correto de `montarAlertaEstoqueEmail` para película em "Baixo" e
  para tinta em "Esgotado".
  **Depende de:** T001.
  **Arquivo:** `tests/domain/stockAlert.test.mjs`
  **Pronto quando:** `node --test tests/domain/stockAlert.test.mjs` passa
  sem falhas.

- [x] **T003** — Rodar `npm test` (suíte completa) e confirmar que nenhum
  teste existente quebrou com o módulo novo.
  **Depende de:** T002.
  **Pronto quando:** `npm test` termina sem falhas.

## Fase 4 — Interface

- [x] **T004** — Adicionar a constante `ESTOQUE_ALERTA_EMAIL_TI = ''`
  junto às demais constantes de configuração (`SK`, `USUARIOS_PADRAO`) em
  `public/index.html`, com comentário explicando que deve ser preenchida
  com o e-mail da equipe de TI antes de uso em produção.
  **Arquivo:** `public/index.html`
  **Pronto quando:** a constante existe, vazia por padrão, e é acessível
  por todo o script inline (mesmo escopo de `SK`).

- [x] **T005** — Carregar o módulo novo em `public/index.html`, junto aos
  `<script type="module">` de `uid.js`/`sla.js`/`assetSearch.js`/
  `assetHolder.js`.
  **Depende de:** T001.
  **Arquivo:** `public/index.html`
  **Pronto quando:** a nova tag `<script type="module">` está presente e
  `window.StockAlertDomain` fica disponível ao carregar a página.

- [x] **T006** — Alterar `verificarEstoqueBaixoItem(item)` para
  `verificarEstoqueBaixoItem(item, statusAnterior)`: manter a lógica de
  notificação interna existente **sem nenhuma alteração**, e adicionar
  depois dela a chamada a `window.StockAlertDomain.cruzouNivelCritico` e,
  se `true` e `ESTOQUE_ALERTA_EMAIL_TI` não estiver vazio, montar o e-mail
  com `montarAlertaEstoqueEmail` e enviar via `queueEmail` (conforme
  `plan.md`, seção 4).
  **Depende de:** T004, T005.
  **Arquivo:** `public/index.html`
  **Pronto quando:** chamar `verificarEstoqueBaixoItem(item, 'Disponível')`
  com `item.status === 'Baixo'` e `ESTOQUE_ALERTA_EMAIL_TI` preenchido gera
  uma entrada na Fila de E-mails, e a notificação interna continua idêntica
  a antes da mudança.

- [x] **T007** — Atualizar `cadastrarSuprimento` para chamar
  `verificarEstoqueBaixoItem(novoItem, null)` em vez de
  `verificarEstoqueBaixoItem(novoItem)` (item novo, sem status anterior).
  **Depende de:** T006.
  **Arquivo:** `public/index.html`
  **Pronto quando:** cadastrar um item já nascendo em "Baixo" ou "Esgotado"
  (quantidade inicial baixa) dispara o e-mail de alerta.

- [x] **T008** — Atualizar `confirmarEditarSuprimento`: capturar
  `const statusAnterior = s.status;` **antes** de
  `s.status = recalcularStatusSuprimento(qtd, s.type);`, e trocar
  `verificarEstoqueBaixoItem(s)` por
  `verificarEstoqueBaixoItem(s, statusAnterior)`.
  **Depende de:** T006.
  **Arquivo:** `public/index.html`
  **Pronto quando:** editar a quantidade de um item de "Disponível" para
  "Baixo" dispara o e-mail; editar sem mudar o nível não dispara.

- [x] **T009** — Atualizar `confirmarUsarSuprimento`: mesma mudança de
  T008 (capturar `statusAnterior` antes do recálculo, passar como segundo
  argumento a `verificarEstoqueBaixoItem`).
  **Depende de:** T006.
  **Arquivo:** `public/index.html`
  **Pronto quando:** usar uma quantidade que leva o item de "Baixo" para
  "Esgotado" dispara o e-mail de "Esgotado".

`checkLowStockAlerts()` e `executarVerificacoesNotificacao()` **não são
alterados** — conforme `research.md`, eles nunca recalculam `status`, só
releem o valor já gravado pelas tarefas acima.

## Fase 5 — Validação

- [x] **T010** — Com `ESTOQUE_ALERTA_EMAIL_TI` temporariamente preenchido
  num ambiente de teste, validar manualmente os cenários de aceitação do
  `spec.md`: cruzar `Disponível→Baixo` gera e-mail; cruzar `Baixo→Esgotado`
  gera outro; visualizar um item sem mudar a quantidade não gera e-mail;
  aguardar a reverificação periódica (10s) sem mudar a quantidade não gera
  e-mail duplicado; reabastecer um item esgotado para acima do limite de
  "Baixo" e deixá-lo cair de novo depois gera um novo e-mail.
  **Depende de:** T001, T002, T003, T004, T005, T006, T007, T008, T009.
  **Pronto quando:** todos os cenários acima se comportam exatamente como
  descrito no `spec.md`.

- [x] **T011** — Com `ESTOQUE_ALERTA_EMAIL_TI` vazio (valor padrão),
  confirmar que nenhum e-mail é enviado ao cruzar um nível crítico, mas que
  a notificação interna (sino) continua aparecendo normalmente (FR08).
  **Depende de:** T006.
  **Pronto quando:** cruzar um nível crítico com a constante vazia não gera
  nenhuma entrada na Fila de E-mails, mas gera a notificação interna
  normalmente.
