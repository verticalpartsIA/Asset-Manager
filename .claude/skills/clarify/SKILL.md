---
name: clarify
description: Analisa a especificação mais recente em busca de ambiguidades e lacunas antes do planejamento técnico, parando para perguntar ao usuário. Segundo passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Clarify — Clarificar Requisitos

## Objetivo
Analisar a especificação atual (`spec.md`) em busca de ambiguidades, lacunas
ou pontos omissos antes de avançar para o planejamento técnico (`/plan`).

## Instruções

1. Identifique a especificação alvo:
   - Se o usuário indicar uma pasta/feature nos argumentos, use-a.
   - Caso contrário, use a pasta `specs/<NNN>-*/` de maior número (a mais
     recente).
   - Se `specs/` estiver vazia, avise o usuário e sugira rodar `/specify`
     primeiro.
2. Leia `CLAUDE.md` (Constituição) e o `spec.md` identificado.
3. Identifique:
   - Requisitos ambíguos ou incompletos.
   - Comportamentos omissos (casos de erro, permissões por perfil, estados
     vazios, concorrência).
   - Conflitos com a Constituição (stack, regras arquiteturais, perfis de
     acesso).
4. **Pare a execução** — não avance para `/plan` sozinho. Apresente as
   dúvidas ao usuário como perguntas diretas e numeradas, com alternativas
   objetivas (A/B/C) quando fizer sentido. Exemplo:

   ```
   1. Quando um ativo é devolvido sem o parecer técnico, o sistema deve:
      A) Bloquear a devolução até o parecer ser preenchido
      B) Permitir e marcar como "pendente de parecer"
      C) Outro comportamento (descreva)
   ```

5. Prefira a ferramenta de pergunta estruturada ao usuário quando as opções
   forem discretas; use texto numerado para perguntas mais abertas.
6. Ao receber as respostas, registre as decisões em uma nova seção
   `## Decisões de Clarificação` ao final do `spec.md`, com a pergunta e a
   resposta escolhida (não apague as perguntas — elas documentam o porquê
   da decisão).
7. Só informe que a especificação está pronta para `/plan` depois que todas
   as ambiguidades relevantes tiverem resposta registrada.

## Saída
- `spec.md` atualizado com a seção `## Decisões de Clarificação`.
- Nenhuma ambiguidade crítica deve ficar sem resposta antes de liberar o
  `/plan`.
