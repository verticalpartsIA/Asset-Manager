---
name: specify
description: Gera uma especificação funcional (spec.md) a partir da solicitação do usuário, sem detalhes técnicos. Primeiro passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Specify — Gerar Especificação

## Objetivo
Criar um documento de especificação funcional baseado na solicitação do
usuário, focando estritamente no comportamento do sistema e nas regras de
negócio — **sem incluir detalhes técnicos** (tecnologias, frameworks, nomes
de tabelas, classes ou infraestrutura).

## Instruções

1. Leia atentamente a solicitação do usuário (argumentos passados ao
   comando). Se estiver vazia ou vaga demais para especificar, pergunte ao
   usuário qual funcionalidade deve ser especificada antes de prosseguir.
2. Leia `CLAUDE.md` (a Constituição do projeto) para garantir que os
   requisitos respeitam as diretrizes globais (stack, regras arquiteturais,
   perfis de acesso).
3. Determine o diretório da funcionalidade:
   - Liste `specs/` e identifique o maior prefixo numérico `NNN` já usado.
   - Gere um slug curto em kebab-case a partir do nome da funcionalidade.
   - Use `specs/<NNN+1 com 3 dígitos>-<slug>/` (ex.: `specs/001-...`).
4. Escreva `specs/<NNN>-<slug>/spec.md` seguindo este modelo:

   ```markdown
   # Especificação: [Nome da Funcionalidade]

   ## Contexto e Objetivo
   - Descreva o problema que está sendo resolvido e o valor para o usuário.

   ## Requisitos Funcionais (FR)
   - [FR01]: ...
   - [FR02]: ...

   ## Regras de Negócio
   - ...

   ## Fora do Escopo (Out of Scope)
   - O que NÃO será feito nesta versão.

   ## Cenários de Aceitação
   - Dado que... Quando... Então...
   ```

5. Preencha cada seção com conteúdo real e específico — nunca deixe
   placeholders genéricos ("a definir", "etc.") sem necessidade.
6. Não inclua nomes de tecnologia, bibliotecas, tabelas de banco ou
   arquitetura — isso pertence à etapa `/plan`.
7. Declare explicitamente quais perfis de acesso (Administrador, Técnico,
   Usuário — ver `CLAUDE.md`) são afetados pela funcionalidade.
8. Ao final, informe ao usuário o caminho do arquivo criado e recomende
   rodar `/clarify` em seguida.

## Saída
- Um novo arquivo `specs/<NNN>-<slug>/spec.md`.
