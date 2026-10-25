# Especificação: Edição de Estoque Sempre Persistir Corretamente

Referência: [issue #49](https://github.com/verticalpartsIA/Asset-Manager/issues/49).

## Contexto e Objetivo

Ao editar um item de estoque (película ou tinta) — por exemplo, mudar a
quantidade de 0 para 1 — o sistema registra a alteração no Log do Sistema
como concluída com sucesso, mas a listagem de Estoque continua mostrando o
valor anterior, como se a edição nunca tivesse acontecido. Isso quebra a
confiança no controle de estoque: a equipe acredita que atualizou a
quantidade, mas o sistema continua operando com o valor desatualizado
(inclusive mantendo alertas incorretos de "Esgotado"/"Baixo").

Esta funcionalidade garante que toda edição de um item de estoque seja
refletida de forma confiável na listagem, eliminando a causa da divergência
entre o que é registrado no log e o que realmente aparece no estoque.

## Requisitos Funcionais (FR)

- [FR01]: Ao editar qualquer campo de um item de estoque (película ou
  tinta) e salvar, a listagem de Estoque reflete imediatamente os novos
  valores.
- [FR02]: O valor editado permanece correto após navegar para outra tela e
  voltar, e após recarregar a página.
- [FR03]: Cada item de estoque tem um identificador que nunca é
  compartilhado por outro item, mesmo quando vários itens são cadastrados
  em sequência muito rápida.
- [FR04]: Editar um item de estoque nunca altera, duplica ou afeta um item
  diferente.
- [FR05]: Excluir um item de estoque remove exatamente aquele item, nunca
  mais de um.

## Regras de Negócio

- Toda ação sobre um item de estoque (editar, usar, excluir) é aplicada
  exclusivamente ao item identificado, sem ambiguidade.

## Perfis de Acesso Afetados

- **Administrador** e **Técnico**: usam o módulo de Estoque hoje; passam a
  ter confiabilidade total ao editar, usar ou excluir itens.
- **Usuário**: não é afetado (sem acesso ao módulo de Estoque).

## Fora do Escopo (Out of Scope)

- Qualquer mudança visual na tela de Estoque.
- Auditoria histórica de quando duplicidades, se existirem, foram criadas.

## Cenários de Aceitação

- Dado um item de estoque com quantidade 0 (Esgotado), quando o usuário
  edita a quantidade para 1 e salva, então a listagem de Estoque mostra a
  quantidade 1 imediatamente e o status deixa de ser "Esgotado".
- Dado o cenário acima, quando o usuário navega para outra tela e volta
  para Estoque (ou recarrega a página), então o valor 1 continua sendo
  exibido.
- Dado que dois itens de estoque são cadastrados em sequência muito rápida
  (ex.: vários itens cadastrados um atrás do outro), quando ambos são
  salvos, então cada um tem um identificador diferente do outro.
- Dado um item de estoque, quando o usuário o exclui, então somente aquele
  item desaparece da listagem — nenhum outro item é afetado.

## Decisões de Clarificação

1. **O bug provavelmente é colisão de ID na criação de itens de estoque
   (`'SUP-' + Date.now()`, sem sufixo único). Além de corrigir a geração de
   ID daqui pra frente, devemos verificar/limpar duplicatas que já possam
   existir na produção (Supabase real)?**
   - A) Só corrigir o código
   - B) Também verificar duplicatas na produção
   - **Decisão:** A — corrige a causa raiz para qualquer cadastro novo;
     não toca dados de produção nesta rodada. Duplicatas antigas, se
     existirem, ficam para tratamento sob demanda, separado desta feature.
