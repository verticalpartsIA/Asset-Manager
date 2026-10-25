# Tasks: Busca por Responsável e Departamento em Ativos

Sem Fase 1 (Dados): `plan.md`/`data-model.md` concluem que nenhuma migração
Supabase é necessária — o campo `depto` do colaborador já existe.

## Fase 2 — Domínio

- [x] **T001** — Estender `resolveCurrentHolder` em
  `public/js/domain/assetHolder.js` (arquivo existente, da feature 001)
  para também retornar `employeeDepartment` (lendo `employee.depto`),
  conforme `plan.md` seção 1. Mudança aditiva: não remover nem renomear
  `employeeId`/`employeeName`.
  **Arquivo:** `public/js/domain/assetHolder.js`
  **Pronto quando:** `resolveCurrentHolder` retorna
  `{ employeeId, employeeName, employeeDepartment }` quando há alocação
  ativa com colaborador encontrado, e continua retornando `null` nos
  mesmos casos de hoje (sem alocação ativa, ou colaborador não encontrado).

- [x] **T002** — Estender `public/js/domain/assetSearch.js` (arquivo
  existente, da feature 001): `ativoCorrespondeABusca` ganha um terceiro
  parâmetro opcional `holder` e passa a comparar também
  `holder.employeeName`/`holder.employeeDepartment`; `filtrarAtivosPorBusca`
  ganha um quarto parâmetro opcional `getHolder`, conforme `plan.md`
  seção 2.
  **Depende de:** T001 (para o formato do holder).
  **Arquivo:** `public/js/domain/assetSearch.js`
  **Pronto quando:** chamar as duas funções sem o novo parâmetro continua
  se comportando exatamente como antes (retrocompatibilidade), e chamar
  com um `holder`/`getHolder` passa a considerar nome e departamento na
  correspondência.

## Fase 3 — Testes de Domínio

- [x] **T003** — Atualizar `tests/domain/assetHolder.test.mjs` (arquivo
  existente): adicionar `employeeDepartment` nos objetos esperados dos
  testes que já verificam retorno com colaborador encontrado; confirmar
  que os testes de "sem alocação ativa" e "sem colaborador correspondente"
  continuam retornando `null` sem nenhuma mudança.
  **Depende de:** T001.
  **Pronto quando:** `node --test tests/domain/assetHolder.test.mjs` passa
  sem falhas.

- [x] **T004** — Atualizar `tests/domain/assetSearch.test.mjs` (arquivo
  existente): adicionar casos novos — busca pelo nome do responsável
  encontra o ativo; busca pelo departamento do responsável encontra o
  ativo; holder `null` (ativo sem responsável) não gera falso positivo nem
  erro; confirmar que todos os testes já existentes (chamadas sem holder)
  continuam passando sem alteração, comprovando retrocompatibilidade.
  **Depende de:** T002.
  **Pronto quando:** `node --test tests/domain/assetSearch.test.mjs` passa
  sem falhas.

- [x] **T005** — Rodar `npm test` (suíte completa) e confirmar que nenhum
  teste existente quebrou.
  **Depende de:** T003, T004.
  **Pronto quando:** `npm test` termina sem falhas.

## Fase 4 — Interface

- [x] **T006** — Reorganizar `renderAtivos()` em `public/index.html`
  conforme `plan.md` seção 3: mover `allocationsAtuais`/`employeesAtuais`
  para o início da função (antes do filtro de status); resolver o holder
  de cada item de `scopedItems` **uma única vez** (`item.holder = ...`);
  passar `function(item) { return item.holder; }` como `getHolder` na
  chamada de `filtrarAtivosPorBusca`; no `.map()` de renderização, trocar
  a chamada a `resolveCurrentHolder` por `item.holder` (reaproveitando o
  valor já calculado, sem resolver duas vezes por item).
  **Depende de:** T001, T002.
  **Arquivo:** `public/index.html`
  **Pronto quando:** buscar pelo nome de um colaborador ou pelo
  departamento dele filtra corretamente a tabela de Ativos, combinando
  com o filtro de status já existente, e a coluna "Responsável Atual"
  continua mostrando o nome correto (sem regressão da feature 001).

## Fase 5 — Validação

- [x] **T007** — Validar manualmente os cenários de aceitação do
  `spec.md`: buscar pelo nome de um colaborador encontra o(s) ativo(s)
  dele; buscar por um departamento encontra todos os ativos alocados a
  colaboradores desse departamento; um ativo sem responsável atual não
  aparece buscando um nome/departamento, mas aparece buscando seu
  UID/serial; um ativo realocado não aparece buscando o nome do
  responsável **anterior**; um termo que bate no UID de um ativo e no
  departamento de outro traz os dois.
  **Depende de:** T006.
  **Pronto quando:** todos os cenários acima se comportam exatamente como
  descrito no `spec.md`.

- [x] **T008** — Confirmar que o comportamento já existente da feature 001
  continua funcionando sem regressão: busca por UID/serial/IMEI, busca
  combinada com filtro de status, mensagem de "nenhum resultado", e
  limpar a busca restaura a lista completa.
  **Depende de:** T006.
  **Pronto quando:** repetir os cenários de aceitação de
  `specs/001-busca-rapida-ativos/spec.md` continua funcionando
  exatamente como antes.

- [x] **T009** — Confirmar, logado como perfil Usuário, que a busca por
  responsável/departamento continua restrita aos equipamentos sob a
  tutela desse usuário (não expõe nome/departamento de responsáveis de
  outros ativos fora do seu escopo).
  **Depende de:** T006.
  **Pronto quando:** buscar pelo próprio nome ou departamento, logado
  como Usuário, filtra corretamente dentro do conjunto já restrito de
  ativos sob sua tutela, sem vazar nenhum ativo de fora desse escopo.
