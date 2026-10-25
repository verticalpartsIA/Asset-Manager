# Research: Desktop com os mesmos campos de TI do Notebook

## Pontos exatos no código que tratam `'NB'` e precisam tratar `'DK'` também

Localizados via `grep -n "=== 'NB'"` em `public/index.html`:

1. **`renderAtivos()`** (`~3186-3189`) — coluna "Info Extra" da tabela:
   mostra `ST: <serviceTag>` para NB; DK cai no `else` implícito (`—`).
2. **`mostrarDetalhesAtivo()`** (`~3222-3230`) — modal de Detalhes: bloco
   somente-leitura com os 11 campos para NB; DK não tem bloco (`else`
   final do `if/else if` não existe para DK, cai sem nenhum campo extra).
3. **`gerarCamposDinamicosHtml()`** (`~3358-3371`) — função única que gera
   o HTML dos campos, reaproveitada tanto pelo formulário de cadastro
   (`renderDynamicAssetFields`, prefixo `cad-`) quanto pelo modal de edição
   (`abrirModalEditarAtivo`, prefixo `edit-`). Esta é a função-chave: um
   único ajuste aqui já cobre cadastro e edição ao mesmo tempo.
4. **`cadastrarAtivo()`** (`~3419-3430`) — lê os valores dos campos do
   formulário de cadastro e grava no novo objeto `asset`.
5. **`confirmarEditarAtivo()`** (`~3491-3502`) — lê os valores dos campos
   do formulário de edição e grava no objeto `asset` existente.

Em todos os 5 pontos, o padrão é idêntico:
`if (a.type === 'CL') { ... } else if (a.type === 'NB') { ... } else if (...)`.
A correção é a mesma em todos: trocar a condição de `tipo === 'NB'` (ou
`a.type === 'NB'`) por `tipo === 'NB' || tipo === 'DK'` (ou equivalente com
`a.type`).

## Por que não é lógica de negócio nova em `public/js/domain/`

Esta mudança não introduz nenhuma regra de cálculo ou decisão nova — é
apenas estender uma condição `type === 'NB'` já existente para também
cobrir `'DK'`, em cinco pontos de apresentação/persistência de formulário.
Não há nada aqui que se beneficie de extração para um módulo de domínio
puro (Constituição, seção 3, aplica-se a regras de negócio e cálculos, não
a qual tipo de ativo mostra qual formulário). Por isso, nenhum teste de
`tests/domain/` é necessário para esta mudança.

## Fontes consultadas

- `public/index.html`: `renderAtivos`, `mostrarDetalhesAtivo`,
  `gerarCamposDinamicosHtml`, `cadastrarAtivo`, `confirmarEditarAtivo`.
- `CLAUDE.md`, seção 3.
- [Issue #44](https://github.com/verticalpartsIA/Asset-Manager/issues/44).
