# Especificação: Busca por Responsável e Departamento em Ativos

## Contexto e Objetivo

A Busca Rápida de Ativos (já existente) permite localizar um ativo por UID,
número de série ou IMEI, mas não por quem está com o equipamento ou de qual
departamento essa pessoa faz parte. Quando um gestor ou técnico sabe apenas
o nome do colaborador ou o departamento (ex.: "quais notebooks estão com o
pessoal do Financeiro?", "qual ativo está com a Fernanda?"), hoje precisa
abrir cada ativo individualmente ou perguntar para alguém, já que a busca
atual não cobre esse caso.

Esta funcionalidade estende a busca já existente na tela de Ativos para
também considerar o nome do responsável atual do ativo e o departamento
desse responsável, sem remover nem alterar o comportamento já existente de
busca por UID/serial/IMEI.

## Requisitos Funcionais (FR)

- [FR01]: O mesmo campo de busca já existente na tela de Ativos passa a
  também considerar o nome do responsável atual do ativo (quando houver) e
  o departamento desse responsável.
- [FR02]: A busca continua funcionando exatamente como hoje para UID,
  serial e IMEI — os critérios novos (responsável e departamento) se somam
  aos já existentes, não os substituem. Um ativo aparece no resultado se o
  termo buscado corresponder a **qualquer um** dos campos: UID, serial,
  IMEI, nome do responsável atual ou departamento do responsável atual.
- [FR03]: A correspondência por nome do responsável e por departamento
  segue as mesmas regras já estabelecidas para a busca existente:
  correspondência parcial, em qualquer posição do texto, sem diferenciar
  maiúsculas de minúsculas, a partir do 1º caractere digitado.
- [FR04]: Ativos sem responsável atual (status "Disponível") não têm nome
  nem departamento para comparar — continuam aparecendo normalmente nos
  resultados quando o termo bate em UID/serial/IMEI, mas nunca aparecem só
  por causa de um termo de busca de responsável/departamento (já que não
  há responsável).
- [FR05]: A busca por departamento considera sempre o departamento atual
  do colaborador responsável, não um histórico de departamentos em que ele
  já trabalhou.

## Regras de Negócio

- O departamento comparado é sempre o do colaborador vinculado à alocação
  **ativa** do ativo (o mesmo colaborador já exibido como "Responsável
  Atual"), nunca o departamento de alocações passadas/devolvidas.
- Um ativo que já foi devolvido por um colaborador e realocado para outro
  só aparece numa busca pelo nome/departamento do responsável **atual**,
  nunca pelo nome/departamento de um responsável anterior.
- Esta busca não expõe nenhum dado que a tela de Ativos já não exiba: nome
  do responsável e departamento já são informações visíveis na tela (nome
  na coluna "Responsável Atual"); a busca só passa a permitir filtrar por
  esses campos, não adiciona nenhuma informação nova à tela.

## Perfis de Acesso Afetados

- **Administrador** e **Técnico**: mesma tela de Ativos de hoje, ganham a
  possibilidade de buscar também por responsável/departamento.
- **Usuário**: continua vendo a busca na visão restrita aos próprios
  equipamentos; como o Usuário só vê seus próprios ativos, buscar pelo
  próprio nome ou departamento é possível, mas pouco útil na prática (a
  lista já é pequena e só contém os equipamentos dele mesmo).

## Fora do Escopo (Out of Scope)

- Busca por marca/modelo do ativo (continua fora de escopo).
- Busca por colaboradores que não sejam o responsável **atual** — ou seja,
  encontrar um ativo pelo nome de quem já o usou no passado não faz parte
  desta busca rápida (esse histórico já existe, de forma diferente, na
  tela de Histórico de Ativos).
- Autocomplete ou sugestões de nomes/departamentos enquanto a pessoa
  digita — a busca continua sendo um filtro simples de texto.
- Filtro dedicado por departamento (ex.: um menu suspenso de
  departamentos) — esta funcionalidade cobre só a busca textual pelo nome
  do departamento, dentro do mesmo campo de busca já existente.

## Cenários de Aceitação

- Dado um ativo alocado para um colaborador do departamento "Financeiro",
  quando o usuário busca pelo nome desse colaborador, então o ativo aparece
  no resultado.
- Dado um ou mais ativos alocados para colaboradores do departamento
  "Financeiro", quando o usuário busca por "financeiro", então todos esses
  ativos aparecem no resultado.
- Dado um ativo com status "Disponível" (sem responsável), quando o
  usuário busca por um nome de colaborador ou por um departamento, então
  esse ativo não aparece nos resultados dessa busca específica (mas
  continua aparecendo numa busca por um UID/serial/IMEI válido).
- Dado um ativo que já foi devolvido por um colaborador e realocado para
  outro, quando o usuário busca pelo nome do colaborador **anterior**,
  então o ativo não aparece nos resultados.
- Dado que o termo buscado corresponde ao UID de um ativo e também ao
  departamento do responsável de outro ativo diferente, quando a busca é
  executada, então ambos os ativos aparecem no resultado.
