# Research: Busca Rápida de Ativos

## Como a tela de Ativos funciona hoje (investigação no código)

- `renderAtivos()` (`public/index.html:3130`) é a função que popula
  `#ativos-table-body`. Ela lê os dados de `getData(SK.assets)`
  (`localStorage`, chave `am_assets`) — **não** faz uma consulta direta ao
  Supabase no momento da renderização. O Supabase entra via sincronização em
  segundo plano (`vp-integration.js` + tabelas `app_state`/mirror descritas
  em `supabase/README.md`), fora do escopo desta feature.
- Já existe um filtro por status (`ativoFiltro`, variável de módulo definida
  em `public/index.html:3112`) acionado pelos botões "Todos / Disponíveis /
  Alocados / Manutenção / Inativos / Descartados"
  (`public/index.html:1111-1116`, função `filtrarAtivos(filtro)` em
  `public/index.html:3159`). `renderAtivos()` aplica esse filtro sobre
  `scopedItems` antes de desenhar a tabela.
- Para o perfil **Usuário**, `renderAtivos()` já restringe os itens via
  `ativosSobTutelaDoUsuarioAtual()` (`public/index.html:3116`) — a busca
  precisa atuar **depois** desse escopo, nunca contornando-o (ver
  Constituição, seção 4 — perfis de acesso).
- Não existe hoje nenhuma coluna "Responsável atual" na tabela de Ativos
  para Admin/Técnico — a coluna "Observação" (`public/index.html:3144`)
  mostra o campo de observação do ativo, e só inclui dados de alocação
  quando a visão é a do próprio Usuário (`userScoped`). Para exibir o
  responsável atual na busca (FR05 da spec), é preciso cruzar
  `getData(SK.allocations)` (alocação com `status === 'active'` e
  `asset_uid === uid`) com `getData(SK.employees)` — esse cruzamento já é
  feito de forma pontual em vários lugares do arquivo (ex.:
  `public/index.html:2998`, `:3819`, `:4802`), mas nunca foi extraído como
  função reutilizável/testável.
- Os campos relevantes para a busca existem no objeto `asset`: `uid`,
  `serial` (sempre preenchido) e `imei` (só para `type === 'CL'`, ver
  `public/index.html:3147` e o formulário de cadastro).

## Convenção de domínio já estabelecida (a seguir à risca)

`public/js/domain/uid.js` e `public/js/domain/sla.js` já implementam o
padrão exigido pela Constituição (seção 3) para lógica de negócio pura e
testável:

1. Funções puras exportadas via ES Module (`export function ...`), sem
   tocar `localStorage`/`Supabase`/DOM — recebem dados como parâmetro e
   devolvem resultado.
2. No final do arquivo, as funções são expostas em `window.<Nome>Domain`
   (ex.: `window.UidDomain`, `window.SlaDomain`) para serem chamadas pelo
   script inline global de `public/index.html` (que não é um módulo).
3. Carregadas via `<script type="module" src="./js/domain/<arquivo>.js">`
   no `<head>` de `public/index.html` (linhas 22 e 24).
4. Testadas em `tests/domain/<arquivo>.test.mjs` com `node:test` +
   `node:assert/strict`, importando as funções nomeadas diretamente do
   módulo (não via `window`).

Esta feature segue exatamente essa convenção — ver `plan.md`.

## Decisão: nenhuma mudança de schema/Supabase é necessária

A busca opera inteiramente sobre dados já carregados no cliente
(`SK.assets`, `SK.allocations`, `SK.employees`). Não há necessidade de nova
tabela, coluna ou política de RLS — ver `data-model.md`.

## Fontes consultadas

- `public/index.html` (funções `renderAtivos`, `filtrarAtivos`,
  `ativosSobTutelaDoUsuarioAtual`, `alocacaoAtivaDoUsuarioAtual`, e os usos
  de `window.UidDomain` / `window.SlaDomain`).
- `public/js/domain/uid.js` e `public/js/domain/sla.js` (padrão de módulo de
  domínio a seguir).
- `tests/domain/uid.test.mjs` e `tests/domain/sla.test.mjs` (padrão de
  teste a seguir).
- `CLAUDE.md`, seções 2, 3 e 5 (stack, regras arquiteturais e testes).
