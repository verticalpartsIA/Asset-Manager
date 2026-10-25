# Data Model: Alertas de Estoque Baixo por E-mail

## Mudança de schema necessária

**Nenhuma.** Por exigência da Constituição (seção 3), migração só é criada
quando há mudança real de schema. Esta feature lê e escreve apenas
coleções que já existem em `localStorage` (`SK.supplies`, `SK.emailQueue`)
e não introduz nenhuma tabela, coluna ou política de RLS nova.

## Entidade existente alterada (sem mudança de schema)

### `supply` (`SK.supplies`)

Nenhum campo novo é adicionado ao objeto. O campo já existente `status`
(`'Disponível' | 'Baixo' | 'Esgotado'`, calculado por
`recalcularStatusSuprimento`) passa a ser comparado com seu valor **antes**
da mutação (capturado localmente na função que está editando o item, não
persistido) para detectar cruzamento de nível — ver `plan.md`.

## Novo valor de configuração (constante de código, sem UI)

Por decisão da spec (Decisão de Clarificação 3), o destinatário do alerta é
um endereço fixo, não ligado a nenhuma conta de usuário nem a nenhuma
tabela. Segue o mesmo padrão já usado no projeto para configuração sem tela
própria (ex.: `SUPABASE_URL`/`SUPABASE_ANON` como constantes no topo de
`public/vp-integration.js`):

```js
// public/index.html, próximo às demais constantes de configuração (SK, USUARIOS_PADRAO)
const ESTOQUE_ALERTA_EMAIL_TI = ''; // preencher com o e-mail da equipe de TI antes de usar em produção
```

Valor vazio por padrão: nenhum e-mail real foi inventado para este campo,
pois a Constituição não documenta um endereço oficial da VerticalParts e
inventar um seria arriscado. Com o valor vazio, o comportamento cai
exatamente no FR08 da spec (nenhum e-mail enviado, notificação interna
continua normal) até que alguém preencha esse valor no código-fonte.

## Entidade existente consultada (sem alteração): `email` na Fila de E-mails

`queueEmail(to, subject, body, meta)` (já existente) é reutilizada sem
mudança de assinatura. O alerta de estoque usa
`meta: { tipo: 'alerta-estoque', itemId: item.id, nivel: item.status }`
para diferenciar esses registros de outros tipos de e-mail (convites etc.)
na Fila de E-mails, caso seja útil filtrar no futuro — não é exibido na UI
hoje (`renderFilaEmails` não filtra por `meta`), então não há mudança de
interface aqui.

## RLS

Não aplicável — nenhuma tabela Supabase nova ou consulta nova é
introduzida por esta feature (tudo roda sobre `localStorage`, como o resto
do módulo de Estoque hoje).
