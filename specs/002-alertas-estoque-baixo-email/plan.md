# Plano Técnico: Alertas de Estoque Baixo por E-mail

Stack usada: HTML + JavaScript vanilla, nenhuma dependência nova
(Constituição, seção 2).

## 1. Novo módulo de domínio: detecção de cruzamento e texto do alerta

**Arquivo novo:** `public/js/domain/stockAlert.js`, seguindo o padrão já
usado em `uid.js`/`sla.js`/`assetSearch.js`/`assetHolder.js` (Constituição,
seção 3 — lógica de negócio isolada e testável):

```js
const NIVEL_SEVERIDADE = { 'Disponível': 0, 'Baixo': 1, 'Esgotado': 2 };

export function cruzouNivelCritico(statusAnterior, statusNovo) {
  const severidadeAnterior = NIVEL_SEVERIDADE.hasOwnProperty(statusAnterior)
    ? NIVEL_SEVERIDADE[statusAnterior] : 0; // sem status anterior (item novo) = parte de "Disponível"
  const severidadeNova = NIVEL_SEVERIDADE.hasOwnProperty(statusNovo) ? NIVEL_SEVERIDADE[statusNovo] : 0;
  return severidadeNova >= 1 && severidadeNova > severidadeAnterior;
}

export function montarAlertaEstoqueEmail(item) {
  const nome = (item.type === 'pelicula' ? 'Película' : 'Tinta') + ' ' + item.model + ' (' + item.specifics + ')';
  const corpo = item.status === 'Esgotado'
    ? nome + ' está esgotada no estoque.'
    : nome + ' com apenas ' + item.quantity + ' unidade(s) restante(s).';
  const assunto = 'Alerta de Estoque: ' + nome + ' — ' + item.status;
  return { subject: assunto, body: corpo };
}

if (typeof window !== 'undefined') {
  window.StockAlertDomain = { cruzouNivelCritico: cruzouNivelCritico, montarAlertaEstoqueEmail: montarAlertaEstoqueEmail };
}
```

O texto do corpo reaproveita literalmente as mesmas frases já usadas em
`verificarEstoqueBaixoItem`/`checkLowStockAlerts` para a notificação
interna (`public/index.html:5790,5792,5800,5802`), cumprindo a regra da
spec de manter o mesmo texto/tom.

## 2. Nova constante de configuração

Em `public/index.html`, junto às demais constantes de configuração (`SK`,
`USUARIOS_PADRAO`, por volta da linha 2132):

```js
const ESTOQUE_ALERTA_EMAIL_TI = ''; // preencher com o e-mail da equipe de TI antes de usar em produção
```

## 3. Carregar o novo módulo

Junto aos demais `<script type="module">` de domínio (`public/index.html`,
linhas 22-27):

```html
<script type="module" src="./js/domain/stockAlert.js"></script>
```

## 4. Alterar `verificarEstoqueBaixoItem` para também avaliar o e-mail

`public/index.html:5796-5804`. Assinatura ganha um segundo parâmetro
opcional `statusAnterior`; a notificação interna existente (linhas
5799-5803) **não muda em nada** — a única adição é depois dela:

```js
function verificarEstoqueBaixoItem(item, statusAnterior) {
  if (!item) return;
  const nome = (item.type === 'pelicula' ? 'Película' : 'Tinta') + ' ' + item.model + ' (' + item.specifics + ')';
  if (item.status === 'Esgotado') {
    pushNotification({ /* ...inalterado... */ });
  } else if (item.status === 'Baixo') {
    pushNotification({ /* ...inalterado... */ });
  }
  if (ESTOQUE_ALERTA_EMAIL_TI && window.StockAlertDomain.cruzouNivelCritico(statusAnterior, item.status)) {
    const alerta = window.StockAlertDomain.montarAlertaEstoqueEmail(item);
    queueEmail(ESTOQUE_ALERTA_EMAIL_TI, alerta.subject, alerta.body, { tipo: 'alerta-estoque', itemId: item.id, nivel: item.status });
  }
}
```

## 5. Atualizar os três pontos de mutação para passar o status anterior

- **`cadastrarSuprimento`** (`public/index.html:3990`): trocar
  `verificarEstoqueBaixoItem(novoItem);` por
  `verificarEstoqueBaixoItem(novoItem, null);` — item novo, sem status
  anterior (deixa explícito que é intencional, não um esquecimento).
- **`confirmarEditarSuprimento`** (`public/index.html:4079-4082`): capturar
  `const statusAnterior = s.status;` **antes** da linha
  `s.status = recalcularStatusSuprimento(qtd, s.type);`, e trocar
  `verificarEstoqueBaixoItem(s);` por
  `verificarEstoqueBaixoItem(s, statusAnterior);`.
- **`confirmarUsarSuprimento`** (`public/index.html:4113-4117`): mesma
  mudança — capturar `statusAnterior` antes de recalcular, passar como
  segundo argumento.

## 6. `checkLowStockAlerts()` — sem alteração

Conforme `research.md`, esse verificador periódico (chamado a cada 10s)
nunca recalcula `status`, só relê o valor já gravado por um dos três pontos
acima. Como a lógica de e-mail só dispara em cruzamento real de nível, e
cruzamento só pode acontecer nesses três pontos, **nenhuma mudança é
necessária** em `checkLowStockAlerts()` nem em
`executarVerificacoesNotificacao()`.

## 7. Testes (Constituição, seção 5)

**Arquivo novo:** `tests/domain/stockAlert.test.mjs`, cobrindo:
- `cruzouNivelCritico`: `Disponível→Baixo` = `true`; `Baixo→Esgotado` =
  `true`; `Disponível→Esgotado` = `true`; `Baixo→Baixo` (sem mudança) =
  `false`; `Esgotado→Baixo` e `Esgotado→Disponível` (melhora) = `false`;
  `null`/`undefined→Baixo` (item novo já crítico) = `true`;
  `null`/`undefined→Disponível` (item novo sem criticidade) = `false`.
- `montarAlertaEstoqueEmail`: texto correto para película em "Baixo", para
  tinta em "Esgotado", incluindo modelo/especificação/quantidade conforme
  o item.

## 8. Fora do escopo desta implementação (reafirmando a spec)

- Nenhuma migração Supabase, nenhuma mudança em `vp-integration.js`.
- Nenhuma tela de configuração do e-mail de TI (constante de código,
  conforme Decisão de Clarificação 3).
- Nenhuma mudança em `adicionarUsuario`/telas de Usuários ou Colaboradores.
