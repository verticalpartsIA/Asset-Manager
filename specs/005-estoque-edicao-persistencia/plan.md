# Plano Técnico: Edição de Estoque Sempre Persistir Corretamente

Stack usada: HTML + JavaScript vanilla, nenhuma dependência nova
(Constituição, seção 2).

## 1. Corrigir a geração de id em `cadastrarSuprimento`

Em `public/index.html`, trocar:

```js
const novoItem = {
  id: 'SUP-' + Date.now(),
  ...
};
```

por (mesma convenção já usada em `pushNotification`/`queueEmail`,
`public/index.html:5706,5845`):

```js
const novoItem = {
  id: 'SUP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  ...
};
```

Isso elimina a colisão de id mesmo quando vários itens são cadastrados em
sequência muito rápida — resolve FR03/FR04/FR05 da spec (cada item com id
único; editar/usar/excluir um item nunca afeta outro).

Nenhum módulo de domínio novo (ver `research.md` — mesmo padrão já usado
inline em dois outros lugares do arquivo, sem extração para domínio).

## 2. Nenhuma outra mudança de código é necessária

`confirmarEditarSuprimento`, `confirmarUsarSuprimento`, `excluirSuprimento`
e `renderEstoque` já estão corretos — eles operam sobre `id` assumindo que
é único; o bug estava inteiramente na geração do id, não na lógica que o
consome. Corrigindo a geração, FR01/FR02 (edição refletida e persistente)
passam a valer naturalmente, porque deixa de haver duas linhas
disputando o mesmo id.

## 3. Testes

Sem teste de domínio novo (nenhuma função pura nova — ver `research.md`).
Validação é manual via navegador (Playwright), coberta na Fase de
Validação do `tasks.md`, incluindo especificamente o cenário de cadastro
rápido em sequência que causava a colisão.
