# Research: Alertas de Estoque Baixo por E-mail

## Onde o status do estoque muda hoje (investigação no código)

O status de um item de estoque (`Disponível` / `Baixo` / `Esgotado`) é
recalculado por `recalcularStatusSuprimento(qtd, tipo)`
(`public/index.html:4039`), com limiares: `qtd <= 0` → `Esgotado`;
`qtd <= 1` (tinta) ou `qtd <= 3` (película) → `Baixo`; caso contrário →
`Disponível`.

Esse recálculo só acontece em **três pontos de mutação**, cada um seguido
de uma chamada a `verificarEstoqueBaixoItem(item)`:

1. `cadastrarSuprimento` (`public/index.html:3984-3990`) — item novo, sem
   status anterior.
2. `confirmarEditarSuprimento` (`public/index.html:4079-4082`) — edição
   manual da quantidade.
3. `confirmarUsarSuprimento` (`public/index.html:4113-4117`) — baixa de
   quantidade por uso.

**Achado importante:** o verificador periódico `checkLowStockAlerts()`
(`public/index.html:5784-5795`), chamado a cada 10s via
`executarVerificacoesNotificacao` (`public/index.html:5671,5673-5679`),
**não recalcula nada** — ele só relê `s.status` (já gravado por um dos três
pontos acima) e reenvia a notificação interna já existente, com dedup de
360 min (`pushNotification`, `public/index.html:5680-5689`). Ou seja, uma
mudança de status **só pode acontecer** nos três pontos de mutação listados
acima; o verificador periódico nunca produz uma transição nova. Por isso,
a lógica de e-mail (que dispara só em cruzamento de nível, por decisão de
`/clarify`) só precisa ser adicionada nesses três pontos — o verificador
periódico continua como está, sem nenhuma mudança, e ainda assim cumpre o
que o FR04 da spec pede (o alerta por e-mail acaba "coberto" porque toda
mudança real de nível passa por um desses três lugares).

## Por que a Decisão de Clarificação 1 original não funcionava na prática

`adicionarUsuario()` (`public/index.html:2755-2773`), usada para criar
contas de Administrador e Técnico em Configurações → Usuários, só grava
`{ username, password, role, name }` — nunca `employee_id` nem `email`. Os
usuários padrão semeados em `USUARIOS_PADRAO`
(`public/index.html:2127-2132`) também não têm esses campos. Só contas de
perfil **Usuário**, criadas via "Cadastrar Colaborador"
(`public/index.html:3641`), recebem `employee_id` e `email`. Isso foi
levantado de volta ao usuário no `/plan` e corrigiu a Decisão 1 do
`/clarify` (ver `spec.md`, Decisão 3): o destinatário agora é um endereço
fixo de e-mail da equipe de TI, não resolvido a partir de contas de
usuário.

## Mecanismo de e-mail existente (reutilizado, não reimplementado)

`queueEmail(to, subject, body, meta)` (`public/index.html:5824-5836`) já
implementa a "fila de e-mails" simulada exigida pela Constituição (seção
2 — Edge Functions "uso previsto, ainda não implementado"): grava um
registro em `SK.emailQueue` (`am_email_queue`), loga via `addLog`, e marca
`status: 'Enviado (simulado)'`. Essa função é chamada diretamente por essa
feature, uma vez (já que há um único destinatário fixo) — sem alterar sua
assinatura nem seu comportamento.

## Convenção de domínio a seguir

Mesma convenção de `public/js/domain/uid.js`, `sla.js`, `assetSearch.js` e
`assetHolder.js`: funções puras exportadas por ES Module, expostas também
em `window.<Nome>Domain` para uso pelo script inline global, testadas em
`tests/domain/<arquivo>.test.mjs` com `node:test`.

## Fontes consultadas

- `public/index.html`: `recalcularStatusSuprimento`, `cadastrarSuprimento`,
  `confirmarEditarSuprimento`, `confirmarUsarSuprimento`,
  `verificarEstoqueBaixoItem`, `checkLowStockAlerts`,
  `executarVerificacoesNotificacao`, `pushNotification`, `adicionarUsuario`,
  `queueEmail`.
- `CLAUDE.md`, seções 2, 3 e 5.
- `specs/002-alertas-estoque-baixo-email/spec.md` (Decisões de
  Clarificação 1-3).
