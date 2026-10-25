# Especificação: Desktop com os mesmos campos de TI do Notebook

Referência: [issue #44](https://github.com/verticalpartsIA/Asset-Manager/issues/44).

## Contexto e Objetivo

Ao cadastrar um ativo do tipo Notebook, o formulário exibe campos
adicionais de gestão de TI (Service Tag, Sistema Operacional, Windows
Update, Antivírus, HD/SSD, Processador, RAM, Bitlocker ID, Bitlocker
Recovery Pass, Anydesk, Ingressou no Intune). Ao selecionar o tipo Desktop,
nenhum desses campos aparece — o sistema mostra "Nenhum campo adicional
para este tipo de ativo", mesmo Desktops tendo exatamente as mesmas
características técnicas que Notebooks.

Esta funcionalidade faz o tipo Desktop usar os mesmos campos adicionais já
existentes para Notebook, em todos os lugares do sistema onde esses campos
aparecem.

## Requisitos Funcionais (FR)

- [FR01]: Ao cadastrar um novo ativo do tipo Desktop, o formulário exibe os
  mesmos 11 campos adicionais hoje exibidos para Notebook.
- [FR02]: Ao editar um ativo do tipo Desktop já cadastrado, o formulário de
  edição exibe os mesmos campos, pré-preenchidos com os valores salvos.
- [FR03]: Na tela de detalhes de um ativo do tipo Desktop, os mesmos campos
  são exibidos (somente leitura), com os valores salvos.
- [FR04]: Os valores preenchidos nesses campos, para um ativo Desktop, são
  salvos e recuperados exatamente como já acontece para Notebook.
- [FR05]: Ativos do tipo Notebook continuam funcionando exatamente como
  hoje — nenhuma mudança de comportamento para esse tipo.

## Regras de Negócio

- Os rótulos, textos de exemplo (placeholder) e opções dos campos são
  idênticos aos já usados para Notebook — não é necessário criar nenhum
  campo, rótulo ou opção nova.
- Ativos Desktop cadastrados antes desta correção não têm esses dados
  preenchidos (ficam em branco/"—" até alguém editar o ativo e preencher).

## Perfis de Acesso Afetados

- **Administrador**: cadastra e edita ativos — passa a ver os campos de TI
  também para Desktop.
- **Técnico**: visualiza detalhes de ativos — passa a ver os campos de TI
  também para Desktop.
- **Usuário**: não é afetado (não cadastra nem edita ativos).

## Fora do Escopo (Out of Scope)

- Qualquer campo novo que não exista hoje para Notebook.
- Mudança nos campos de outros tipos de ativo (Celular, Tablet, Headset,
  Monitor, Impressora, Teclado, Mouse, Outro).

## Cenários de Aceitação

- Dado que o usuário está cadastrando um novo ativo, quando seleciona o
  tipo "Desktop (DK)", então os 11 campos adicionais de TI aparecem no
  formulário, iguais aos de Notebook.
- Dado um ativo Desktop com campos de TI preenchidos, quando o usuário
  abre a tela de Detalhes desse ativo, então os valores salvos aparecem
  corretamente.
- Dado um ativo Desktop já cadastrado, quando o usuário abre o modal de
  Editar, então os campos aparecem pré-preenchidos com os valores salvos e
  as alterações são persistidas ao salvar.

## Decisões de Clarificação

Nenhuma ambiguidade de negócio encontrada no `/clarify` — a própria issue
#44 já deixa claro o comportamento esperado ("os campos adicionais devem
ser os mesmos para ambos os tipos"), sem nenhuma decisão em aberto.
