# Research: Edição de Estoque Sempre Persistir Corretamente

## Investigação da causa raiz

Descartei primeiro a hipótese (levantada por outra sessão, não confirmada)
de que o problema seria o Supabase sobrescrevendo o `localStorage`. Lendo
`public/vp-integration.js:505-514`, o `saveData` "envolvido" (`wrapDataLayer`)
chama a função original síncrona **antes** de qualquer coisa
(`_save(key, data)`), e o envio ao Supabase (`VP.save`) é assíncrono e
**nunca escreve de volta no `localStorage`** (`VP.save`, linhas 467-501, só
dá `upsert` em `app_state`). Ou seja, o valor local correto já está salvo
antes de qualquer chamada ao Supabase — essa hipótese não explica o
sintoma (reversão na mesma sessão, sem reload).

**Causa real encontrada**: `cadastrarSuprimento()` (`public/index.html`,
~linha 3978) gera o id do item assim:

```js
id: 'SUP-' + Date.now(),
```

Sem nenhum sufixo para desempate. Se dois itens forem cadastrados muito
rapidamente em sequência (ex.: cadastro em lote de várias tintas, como o
próprio relato da issue #49 descreve — "vários cadastros de tintas Epson"
pouco antes do bug), dois registros podem receber **o mesmo `id`**
(`Date.now()` tem resolução de 1ms, e não há nenhum `disabled`/debounce no
botão "Adicionar ao Estoque").

Com dois itens duplicados compartilhando o mesmo `id`:
- `confirmarEditarSuprimento()` usa `supplies.find(x => x.id === id)` —
  encontra e edita **só a primeira ocorrência** no array.
- `renderEstoque()` itera **todos** os itens do array e renderiza uma linha
  para cada um — o usuário vê duas linhas quase idênticas (ex.: "Epson /
  Black 504"), uma com o valor novo e outra com o valor antigo, e pode
  facilmente interpretar isso como "a edição não persistiu" (exatamente o
  que a própria Fernanda já suspeitava no relato: "vale verificar se
  existem itens duplicados").
- `excluirSuprimento(id)` usa `supplies.filter(s => s.id !== id)` — **remove
  todas** as ocorrências daquele id de uma vez, o que também explica o
  "Suprimento Excluído" registrado pouco antes no log do relato.

## Convenção já existente no próprio código para evitar essa classe de bug

O mesmo tipo de id (`Date.now()` + sufixo aleatório) **já é usado** em
outros dois lugares deste arquivo, evitando exatamente essa colisão:

```js
// Notificações (public/index.html:5706)
id: 'N-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
// Fila de e-mails (public/index.html:5845)
id: 'EMAIL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
```

A correção mais simples e consistente é aplicar a mesma convenção já usada
nestes dois lugares à criação de suprimentos — não introduz um padrão novo,
só estende o já existente ao único lugar que ainda não o usava.

## Por que não é lógica de negócio nova em `public/js/domain/`

Gerar um id com timestamp + sufixo aleatório é uma convenção de
infraestrutura já usada inline em dois outros lugares deste mesmo arquivo,
sem nenhuma extração para domínio. Por consistência com o padrão já
estabelecido (e para não introduzir uma abstração nova para três usos
praticamente idênticos), a correção segue inline, no mesmo estilo.

## Nota à parte (fora do escopo desta issue)

O mesmo padrão de risco (`id: 'a' + Date.now()`, sem sufixo) existe também
na criação de **ativos** (`cadastrarAtivo`, ver `specs/004-desktop-campos-ti`).
Não foi reportado nenhum bug relacionado a isso, e corrigi-lo não faz parte
da issue #49 — fica registrado aqui como risco conhecido para avaliação
futura, sem ação nesta feature (decisão do usuário: só corrigir estoque
agora, ver Decisão de Clarificação 1 do `spec.md`).

## Fontes consultadas

- `public/index.html`: `cadastrarSuprimento`, `confirmarEditarSuprimento`,
  `confirmarUsarSuprimento`, `excluirSuprimento`, `renderEstoque`,
  `pushNotification` (id com sufixo aleatório), `queueEmail` (id com
  sufixo aleatório).
- `public/vp-integration.js`: `wrapDataLayer`, `VP.save` (descarta a
  hipótese de causa pelo Supabase).
- [Issue #49](https://github.com/verticalpartsIA/Asset-Manager/issues/49).
