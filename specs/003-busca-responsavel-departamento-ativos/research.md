# Research: Busca por Responsável e Departamento em Ativos

## Estado atual do código (feature 001, já mesclada)

- `public/js/domain/assetSearch.js` já implementa a busca por UID/serial/
  IMEI: `ativoCorrespondeABusca(asset, termoNormalizado)` compara só campos
  do próprio `asset`; `filtrarAtivosPorBusca(items, termo, getAsset)` aceita
  um extrator `getAsset` porque os itens filtrados em `renderAtivos()` são
  `{ asset, allocation }`, não o `asset` puro.
- `public/js/domain/assetHolder.js` já implementa
  `resolveCurrentHolder(assetUid, allocations, employees)`, que cruza a
  alocação ativa do ativo com o colaborador e devolve
  `{ employeeId, employeeName }` — **não inclui o departamento hoje**.
- O departamento do colaborador é armazenado no campo `emp.depto`
  (`public/index.html`, `cadastrarColaborador`, ~linha 3641), com valores
  fixos em maiúsculas (ex.: `"FINANCEIRO"`, `"TI"`, `"GENTE E GESTÃO"`) —
  a mesma lista do `<select id="col-depto">`.
- Em `renderAtivos()` (`public/index.html:3160-3172`), a ordem atual é:
  1. calcula `scopedItems` (respeita o escopo do perfil Usuário);
  2. aplica o filtro de status (`ativoFiltro`);
  3. aplica a busca (`filtrarAtivosPorBusca`) — **aqui o holder ainda não
     foi resolvido**, pois `allocationsAtuais`/`employeesAtuais` só são
     carregados **depois** (linhas 3171-3172), para popular a coluna
     "Responsável Atual" no `.map()` de cada linha.

**Achado-chave:** para a busca também considerar responsável/departamento,
o holder de cada item precisa estar resolvido **antes** do filtro de
busca, não só antes do `.map()` de renderização. A forma mais simples e
sem duplicar trabalho é mover o carregamento de `allocationsAtuais`/
`employeesAtuais` para o início da função (antes mesmo do filtro de
status) e resolver o holder de cada item uma única vez, reaproveitando o
mesmo valor tanto no filtro de busca quanto na renderização da linha —
em vez de chamar `resolveCurrentHolder` duas vezes por item (uma no
filtro, outra no `.map()`).

## Extensão necessária no domínio (feature 001 evolui, não é substituída)

- `resolveCurrentHolder` precisa passar a devolver também
  `employeeDepartment` (lendo `employee.depto`), além do já existente
  `employeeName`. É uma mudança **aditiva**: quem já consome só
  `holder.employeeName` (a coluna "Responsável Atual") continua funcionando
  sem nenhuma alteração.
- `ativoCorrespondeABusca` e `filtrarAtivosPorBusca` precisam aceitar um
  terceiro/quarto parâmetro opcional com a informação do responsável —
  mantendo compatibilidade retroativa (chamadas existentes sem esse
  parâmetro continuam funcionando exatamente como hoje, já que a feature
  001 não tem mais nenhum outro ponto de chamada dessas funções além de
  `renderAtivos()`).

## Convenção de domínio a seguir

Mesma convenção já usada em todos os módulos de `public/js/domain/`:
funções puras, exportadas por ES Module, expostas em `window.<Nome>Domain`,
testadas em `tests/domain/<arquivo>.test.mjs`.

## Fontes consultadas

- `public/js/domain/assetSearch.js`, `assetHolder.js` (código e testes
  existentes da feature 001).
- `public/index.html`: `renderAtivos`, `cadastrarColaborador` (campo
  `depto`), lista de departamentos do `<select id="col-depto">`.
- `CLAUDE.md`, seções 2, 3 e 5.
- `specs/003-busca-responsavel-departamento-ativos/spec.md` (Decisão de
  Clarificação 1).
