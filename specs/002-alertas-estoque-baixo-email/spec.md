# Especificação: Alertas de Estoque Baixo por E-mail

## Contexto e Objetivo

O sistema já avisa dentro do próprio Asset Manager quando um item de
estoque (película de celular ou tinta de impressora) atinge o nível "Baixo"
ou "Esgotado" — mas esse aviso só aparece como notificação interna, visível
apenas para quem está com a sessão aberta e confere o sino de notificações
no momento certo. Quem cuida da reposição desses suprimentos muitas vezes
só percebe a falta quando já é tarde, porque não está olhando o sistema o
dia inteiro.

Esta funcionalidade adiciona o envio de um e-mail automático sempre que um
item de estoque entra em nível "Baixo" ou "Esgotado", para que os
responsáveis pela reposição sejam avisados mesmo sem estar com o sistema
aberto.

## Requisitos Funcionais (FR)

- [FR01]: Sempre que um item de estoque (película ou tinta) muda de status
  para "Baixo", o sistema envia um e-mail de alerta.
- [FR02]: Sempre que um item de estoque muda de status para "Esgotado", o
  sistema envia um e-mail de alerta — mesmo que já tenha enviado um alerta
  de "Baixo" para esse mesmo item anteriormente.
- [FR03]: O e-mail identifica claramente o item (tipo — película ou tinta,
  modelo, e a especificação: material da película ou cor/tipo da tinta), a
  quantidade atual e o nível atingido ("Baixo" ou "Esgotado").
- [FR04]: O alerta por e-mail é avaliado nos mesmos momentos em que hoje já
  é gerada a notificação interna de estoque baixo/esgotado (cadastro de novo
  item, uso/baixa de quantidade, e verificação periódica de níveis), sem
  exigir nenhuma ação manual de quem usa o sistema.
- [FR05]: O sistema envia o e-mail **apenas uma vez por cruzamento de
  nível** — não reenvia lembretes repetidos para o mesmo item enquanto ele
  permanecer no mesmo nível crítico sem mudança de quantidade (diferente da
  notificação interna, que já reenvia um lembrete a cada 6h; o e-mail é mais
  intrusivo e não deve repetir dessa forma).
- [FR06]: O e-mail de alerta fica registrado na Fila de E-mails (mesma tela
  de auditoria onde já aparecem os convites de acesso enviados), com
  data/hora, destinatário(s) e o conteúdo da mensagem.
- [FR07]: O destinatário do alerta é um endereço de e-mail fixo da equipe de
  TI, definido uma única vez no sistema — não depende de nenhuma conta de
  usuário ter e-mail cadastrado, e não existe tela para alterá-lo (ver
  Decisão de Clarificação 3, que substitui a Decisão 1 original).
- [FR08]: Se esse endereço fixo não estiver definido (campo vazio), nenhum
  e-mail é enviado — mas a notificação interna (sino) continua funcionando
  normalmente de qualquer forma.

## Regras de Negócio

- Um e-mail só é disparado quando o item efetivamente **cruza** para um
  nível mais crítico do que estava antes (de "Disponível" para "Baixo", de
  "Baixo" para "Esgotado", ou diretamente de "Disponível" para "Esgotado"
  quando a baixa de quantidade é grande o suficiente).
- Aumentar a quantidade de um item (reabastecimento) nunca dispara e-mail —
  só a piora do nível dispara.
- Depois que um item é reabastecido para "Disponível" e cai novamente para
  "Baixo" ou "Esgotado" no futuro, isso conta como um novo cruzamento de
  nível e gera um novo alerta por e-mail normalmente.
- O conteúdo do e-mail segue o mesmo texto/tom já usado hoje nas
  notificações internas de estoque (ex.: "Película Samsung Galaxy A54
  (Fosca) com apenas 2 unidade(s) restante(s).").

## Perfis de Acesso Afetados

- **Administrador** e **Técnico**: são quem gerencia o módulo de Estoque
  hoje (cadastro, uso, edição e exclusão de suprimentos); o alerta vai para
  um e-mail fixo de TI (ver FR07/FR08), não para o e-mail individual de
  cada conta.
- **Usuário**: não é afetado — não tem acesso ao módulo de Estoque.

## Fora do Escopo (Out of Scope)

- Tela de configuração de destinatários do e-mail de alerta (quem recebe
  fica definido nesta primeira versão, não é configurável pela interface).
- Envio real de e-mail via SMTP/provedor externo — o sistema hoje só
  registra e-mails numa fila simulada (visível na tela de Log do Sistema);
  esta funcionalidade usa esse mesmo mecanismo já existente, sem implementar
  o envio real.
- Alertas de estoque para qualquer tipo de item além de películas e tintas
  (o sistema não tem outros tipos de suprimento hoje).
- Alertas por outros canais além de e-mail (WhatsApp, notificação push no
  navegador, Slack etc.) — a notificação interna por sino já existe e
  continua como está; esta funcionalidade só adiciona o e-mail.

## Cenários de Aceitação

- Dado um item de estoque com quantidade acima do limite de "Baixo", quando
  sua quantidade é reduzida (uso) até atingir o limite de "Baixo", então um
  e-mail de alerta de estoque baixo é enviado e aparece registrado na Fila
  de E-mails.
- Dado um item já no nível "Baixo", quando sua quantidade chega a zero,
  então um e-mail de alerta de "Esgotado" é enviado, mesmo já tendo sido
  enviado um alerta de "Baixo" para esse item anteriormente.
- Dado um item no nível "Disponível", quando ele é apenas visualizado na
  tela de Estoque sem nenhuma mudança de quantidade, então nenhum e-mail é
  enviado.
- Dado um item no nível "Baixo" que acabou de gerar um alerta por e-mail,
  quando o sistema reverifica os níveis de estoque pouco tempo depois sem
  nenhuma mudança de quantidade, então nenhum e-mail duplicado é enviado.
- Dado um item esgotado que é reabastecido para um nível acima de "Baixo",
  quando ele volta a cair para "Baixo" novamente depois, então um novo
  e-mail de alerta é enviado normalmente.
- Dado um item que cruza para "Baixo" e o e-mail fixo de TI não está
  definido, quando o cruzamento é detectado, então nenhum e-mail é
  enviado, mas a notificação interna aparece normalmente.
- Dado um item que permanece em "Baixo" por vários dias sem nenhuma mudança
  de quantidade, quando o sistema reverifica os níveis periodicamente,
  então nenhum e-mail adicional é enviado (só a notificação interna
  continua reaparecendo a cada 6h, como já acontece hoje).

## Decisões de Clarificação

1. **Contas de Administrador/Técnico nem sempre têm e-mail cadastrado (só
   quando vinculadas a um colaborador com e-mail — ex.: o admin padrão
   "supporte" não tem). Para quem o alerta deve ir?**
   - A) Colaboradores vinculados com e-mail
   - B) E-mail fixo de TI
   - C) Outro mecanismo
   - **Decisão:** A — envia para o e-mail de cada colaborador vinculado a
     uma conta Admin/Técnico que tiver e-mail cadastrado. Contas sem
     colaborador vinculado não recebem (FR07/FR08).

2. **A notificação interna já existente reenvia um lembrete a cada 6h
   enquanto o item continuar "Baixo"/"Esgotado". O alerta por e-mail deve
   repetir do mesmo jeito, ou só ser enviado uma vez por cruzamento de
   nível?**
   - A) Só uma vez por cruzamento
   - B) Mesmo comportamento do interno (a cada 6h)
   - C) Outro intervalo
   - **Decisão:** A — o e-mail é mais intrusivo que a notificação interna;
     envia só quando o nível piora, sem lembretes repetidos (FR05).

3. **(Levantado no `/plan`, corrige a Decisão 1) A investigação mais a
   fundo de como contas de Administrador/Técnico são criadas
   (`adicionarUsuario()`) mostrou que elas nunca têm colaborador vinculado
   nem e-mail próprio — só contas de perfil Usuário têm isso. Ou seja, a
   Decisão 1 ("colaborador vinculado") nunca encontraria destinatário na
   prática. Como resolver?**
   - A) E-mail fixo de TI, sem tela de configuração
   - B) Adicionar campo de e-mail às contas Admin/Técnico (expande escopo)
   - C) Manter como decidido, aceitando que hoje não envia a ninguém
   - D) Outro mecanismo
   - **Decisão:** A — um endereço fixo definido uma única vez no sistema,
     sem depender de nenhuma conta de usuário ter e-mail cadastrado e sem
     tela de configuração (consistente com "Fora do Escopo", que já
     descartava uma tela de configuração de destinatários). **Esta decisão
     substitui a Decisão 1** (FR07/FR08 foram atualizados).
