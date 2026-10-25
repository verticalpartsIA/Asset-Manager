# Especificação: Busca Rápida de Ativos

## Contexto e Objetivo

Hoje, para encontrar um ativo específico na tela de Ativos, o usuário precisa
rolar ou filtrar manualmente por tipo/status entre todos os equipamentos
cadastrados. Isso é lento quando a pessoa já sabe qual equipamento procura
(por exemplo, ao atender um chamado de suporte e precisar confirmar o
responsável atual de um notebook pelo UID impresso na etiqueta, ou localizar
um celular pelo IMEI informado pelo colaborador).

A **Busca Rápida de Ativos** permite localizar um ativo digitando parte do
seu UID, número de série ou IMEI, vendo instantaneamente status, tipo e
responsável atual sem precisar abrir o cadastro completo. O valor é reduzir
o tempo de localização de um ativo de minutos (rolagem/filtros manuais) para
segundos.

## Requisitos Funcionais (FR)

- [FR01]: A tela de Ativos exibe um campo de busca sempre visível, acima da
  lista de ativos.
- [FR02]: Ao digitar no campo de busca, o sistema filtra a lista de ativos
  exibida em tempo real, sem exigir que o usuário pressione um botão ou
  tecla de confirmação.
- [FR03]: A busca considera correspondência parcial — o termo digitado pode
  aparecer em qualquer posição do UID, serial ou IMEI (não precisa ser
  prefixo) — e não diferencia maiúsculas de minúsculas. A busca é acionada a
  partir do 1º caractere digitado, sem limite mínimo de caracteres.
- [FR04]: A busca compara o texto digitado com o UID do ativo, o número de
  série e o IMEI (quando aplicável ao tipo de ativo).
- [FR05]: Cada resultado exibido mostra, no mínimo: UID, tipo do ativo,
  status atual e nome do responsável atual (ou "Disponível" quando não há
  responsável).
- [FR06]: Quando nenhum ativo corresponde ao texto digitado, o sistema exibe
  uma mensagem clara informando que nenhum resultado foi encontrado.
- [FR07]: Limpar o campo de busca volta a exibir a lista completa de ativos
  (respeitando os demais filtros já aplicados na tela, como tipo ou status,
  quando existirem).
- [FR08]: A busca funciona em conjunto com os filtros já existentes na tela
  de Ativos (ex.: filtro por tipo ou status) — ambos se combinam, não se
  substituem.

## Regras de Negócio

- A busca rápida é somente leitura: não permite editar, excluir ou alterar
  status de um ativo diretamente a partir dos resultados; para isso, o
  usuário continua abrindo o cadastro completo do ativo.
- Ativos descartados continuam aparecendo nos resultados de busca (o
  histórico de um ativo descartado ainda pode ser consultado), salvo se um
  filtro de status ativo na tela os excluir explicitamente.
- Não há limite na quantidade de resultados exibidos: todos os ativos que
  correspondem ao termo buscado são mostrados de uma vez.

## Perfis de Acesso Afetados

- **Administrador** e **Técnico**: têm acesso à tela de Ativos e, portanto, à
  busca rápida, exatamente como já têm acesso à listagem completa hoje.
- **Usuário**: não é afetado — não tem acesso à tela de Ativos (apenas a
  "Meus Dispositivos"), então esta funcionalidade não se aplica a esse
  perfil.

## Fora do Escopo (Out of Scope)

- Busca por nome do responsável, departamento, marca/modelo ou outros campos
  que não sejam UID, número de série ou IMEI (pode ser uma evolução futura).
- Busca global (fora da tela de Ativos), por exemplo, a partir do Dashboard
  ou de outras telas do sistema.
- Busca "fuzzy"/aproximada que tolere erros de digitação — apenas
  correspondência parcial literal (substring).
- Atalhos de teclado dedicados ou histórico de buscas recentes.
- Qualquer mudança na forma como o UID, serial ou IMEI são gerados ou
  armazenados.

## Cenários de Aceitação

- Dado que existem ativos cadastrados com UIDs variados, quando o usuário
  digita um trecho de UID no campo de busca, então a lista exibe apenas os
  ativos cujo UID contém esse trecho, mostrando status, tipo e responsável
  atual de cada um.
- Dado que o usuário digita um trecho que corresponde ao número de série de
  um ativo (mas não ao UID), quando a busca é executada, então esse ativo
  aparece nos resultados.
- Dado que o usuário digita um trecho que não corresponde a nenhum UID,
  serial ou IMEI cadastrado, quando a busca é executada, então o sistema
  exibe a mensagem de "nenhum resultado encontrado" e nenhuma linha da
  lista é exibida.
- Dado que o usuário já aplicou um filtro de tipo (ex.: "Notebook") e em
  seguida digita um termo de busca, quando a busca é executada, então os
  resultados exibidos respeitam tanto o filtro de tipo quanto o termo
  buscado.
- Dado que o usuário limpa o campo de busca após ter digitado um termo,
  quando o campo fica vazio, então a lista volta a exibir todos os ativos
  permitidos pelos demais filtros ativos na tela.

## Decisões de Clarificação

1. **A busca deve filtrar a lista a partir de quantos caracteres digitados?**
   - A) A partir de 1 caractere
   - B) A partir de 2 caracteres
   - C) Outro critério
   - **Decisão:** A — a busca filtra a cada tecla digitada, desde o 1º
     caractere.

2. **Como deve funcionar a correspondência parcial do termo buscado?**
   - A) Contém em qualquer posição (ex.: "057" encontra "VP-NB-2026-00057")
   - B) Apenas no início (prefixo)
   - **Decisão:** A — correspondência por substring, em qualquer posição do
     UID, serial ou IMEI.

3. **A spec continha uma regra especulativa sobre normalizar acentos para o
   futuro, mas UID/serial/IMEI normalmente não têm acentos. O que fazer com
   essa regra?**
   - A) Remover a regra
   - B) Manter como requisito explícito
   - **Decisão:** A — regra removida da especificação; não é relevante hoje
     e pode ser revisitada se um caso de uso real surgir.

4. **Deve haver limite na quantidade de resultados exibidos quando muitos
   ativos correspondem ao termo buscado?**
   - A) Sem limite, mostra todos
   - B) Limitar e indicar que há mais
   - **Decisão:** A — sem limite; todos os resultados correspondentes são
     exibidos.
