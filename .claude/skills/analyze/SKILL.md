---
name: analyze
description: Audita spec, plano e tarefas em conjunto com a Constituição antes da implementação, relatando inconsistências. Quinto passo do fluxo de desenvolvimento orientado por especificação deste projeto.
---

# Analyze — Análise Crítica

## Objetivo
Realizar uma auditoria cruzada para verificar se as tarefas cobrem o plano,
se o plano atende à especificação, e se tudo cumpre estritamente a
Constituição (`CLAUDE.md`) antes de qualquer código ser escrito.

## Instruções

1. Identifique a feature alvo (mesma lógica das skills anteriores).
2. Leia em conjunto: `CLAUDE.md`, `spec.md`, `research.md`, `data-model.md`,
   `plan.md` e `tasks.md` da feature.
3. Verifique:
   - Toda regra de negócio e requisito funcional do `spec.md` está coberto
     por pelo menos uma tarefa em `tasks.md`.
   - O `plan.md`/`data-model.md` não viola nenhuma regra arquitetural da
     Constituição (ex.: lógica de negócio fora de `public/js/domain/`,
     tabela sem RLS, exposição de `service_role`, dependência de stack não
     autorizada).
   - Não há tarefas redundantes, conflitantes ou fora de ordem (ex.: tarefa
     de interface antes da migração de dados da qual depende).
   - Tipos de dados e nomes de campos são consistentes entre
     `data-model.md` e as tarefas que os implementam.
   - Os perfis de acesso declarados na especificação são respeitados nas
     tarefas de interface/API.
4. Apresente um relatório estruturado ao usuário:
   - ✅ Pontos conformes
   - ⚠️ Inconsistências encontradas (com referência ao arquivo/seção)
   - ❌ Violações da Constituição (crítico — bloqueia o `/implement` até
     resolver)
5. Pergunte ao usuário se deseja que você aplique as correções
   automaticamente nos arquivos (`spec.md`/`plan.md`/`tasks.md`) antes de
   liberar o `/implement`, ou se prefere revisar manualmente.
6. Nunca inicie `/implement` sozinho a partir desta skill — a decisão de
   avançar é sempre do usuário.
7. Se o usuário pedir para registrar o relatório, salve-o em
   `specs/<NNN>-<slug>/analysis.md`.

## Saída
- Relatório de análise apresentado ao usuário no chat (opcionalmente também
  salvo em `specs/<NNN>-<slug>/analysis.md`).
