# Constituição do Projeto — Asset Manager (VerticalParts)

Este arquivo é a **Constituição** do projeto: a fonte de verdade consultada por
todas as skills do fluxo de desenvolvimento orientado por especificação
(`/specify`, `/clarify`, `/plan`, `/tasks`, `/analyze`, `/implement`). Qualquer
especificação, plano ou tarefa que conflite com as regras abaixo deve ser
ajustada ou ter o conflito explicitamente resolvido com o usuário.

## 1. Propósito do Sistema

Portal interno de gestão de ativos de TI da VerticalParts (notebooks,
celulares, monitores, periféricos, ferramentas): cadastro, alocação,
histórico técnico, estoque, suporte e auditoria, substituindo o controle por
planilhas descentralizadas.

## 2. Stack Técnica (fonte de verdade — reflete o código real do repositório)

- **Frontend**: HTML + JavaScript vanilla, servido como site estático
  (`public/index.html`, `public/vp-integration.js`). **Não há** bundler,
  transpilador ou framework de UI (React/Vite) em uso — o README descreve uma
  stack aspiracional/desatualizada; não trate isso como verdade técnica atual.
- **Lógica de domínio**: isolada em `public/js/domain/*.js` (ex.: `uid.js`,
  `sla.js`) como funções puras, testadas via `node --test`
  (`tests/domain/*.test.mjs`).
- **Backend/dados**: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
  Migrações versionadas em `supabase/migrations/*.sql`.
- **Servidor local**: `server.js` (Express) — **apenas** para desenvolvimento
  local (`npm run dev`/`npm start`). Nunca é usado em produção.
- **Deploy**: `.github/workflows/deploy-hostinger.yml` publica o conteúdo
  estático de `public/` via SSH/SCP para hospedagem compartilhada Hostinger.
  `server.js`, `package*.json` e afins não vão para produção.

Qualquer proposta de mudar essa stack (ex.: introduzir um framework ou
bundler) deve ser o próprio objeto de uma especificação (`/specify`) e
passar por `/clarify` explicitamente — nunca deve ser uma decisão silenciosa
de uma tarefa de implementação.

## 3. Regras Arquiteturais (não-negociáveis)

- RLS (Row Level Security) sempre ativo em toda tabela Supabase que contenha
  dado sensível ou específico de usuário/papel.
- A chave `service_role` do Supabase **nunca** é exposta no frontend; apenas
  a chave `anon` pública, protegida por RLS.
- Regras de negócio e cálculos (ex.: geração de UID, cálculo de SLA) vivem em
  `public/js/domain/` como funções puras e testáveis — nunca embutidas
  inline em handlers de UI dentro de `public/index.html` ou
  `public/vp-integration.js`.
- Toda mudança de schema é feita por uma nova migração versionada em
  `supabase/migrations/`; migrações já aplicadas nunca são editadas
  retroativamente.
- Sem dependências de build (bundlers/frameworks) além do que já existe,
  salvo decisão explícita registrada via `/specify` + `/clarify`.

## 4. Perfis de Acesso

| Perfil | Permissões |
| --- | --- |
| Administrador | Acesso total: configurações, usuários, logs e exclusões definitivas |
| Técnico | Ativos, estoque, suporte, histórico, checklists e base de conhecimento |
| Usuário | Meus dispositivos, abertura de chamados e ciência de checklists |

Toda nova funcionalidade deve declarar explicitamente quais perfis podem
acessá-la.

## 5. Testes

- Toda regra de negócio nova ou alterada em `public/js/domain/` precisa de
  teste correspondente em `tests/domain/`, executável via `npm test`
  (`node --test`).
- Nenhuma tarefa de implementação é considerada concluída com testes
  quebrando.

## 6. Fluxo de Desenvolvimento Orientado por Especificação

Toda funcionalidade não-trivial segue este fluxo, nesta ordem:

1. **`/specify`** — gera `specs/<NNN>-<slug>/spec.md`: comportamento e regras
   de negócio, sem detalhes técnicos.
2. **`/clarify`** — lê a especificação mais recente, identifica ambiguidades
   e **pára** para perguntar ao usuário antes de prosseguir.
3. **`/plan`** — cruza a especificação com esta Constituição e gera
   `research.md`, `data-model.md` e `plan.md` na mesma pasta.
4. **`/tasks`** — decompõe o plano em tarefas atômicas e sequenciais em
   `tasks.md`.
5. **`/analyze`** — audita spec + plano + tarefas contra esta Constituição e
   relata inconsistências antes de qualquer código ser escrito.
6. **`/implement`** — executa as tarefas, escreve testes e roda `npm test`.

Os artefatos de cada funcionalidade ficam em `specs/<NNN>-<slug>/` (ver
`specs/README.md`). Esta Constituição (`CLAUDE.md`) é sempre a referência
final em caso de conflito.

## 7. Convenções

- Commits e documentação de produto em português.
- Migrações nomeadas com timestamp + descrição, seguindo o padrão já usado em
  `supabase/migrations/`.
