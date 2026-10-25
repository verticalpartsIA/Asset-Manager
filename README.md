# 💻 Asset Manager — VerticalParts

> **Portal interno de gestão de ativos da VerticalParts.**
> Cadastro, alocação, histórico técnico, estoque, suporte, checklists e auditoria de equipamentos em um único lugar.

🌐 **Produção:** `[preencher com a URL final]`
🚀 **Deploy:** Hostinger (site estático, publicado via GitHub Actions)
🗄️ **Backend:** Supabase

---

## Por que este projeto existe?

A VerticalParts opera com um volume crescente de equipamentos — notebooks, celulares, monitores, periféricos e ferramentas — distribuídos entre diversos setores. Antes do Asset Manager, esse controle dependia de planilhas descentralizadas, sem histórico confiável de responsabilidade, condição de uso ou auditoria.

O **Asset Manager** centraliza esse controle e oferece:

- Cadastro único de ativos com UID automático e status rastreável
- Alocação e devolução com registro de condição
- Histórico técnico com pareceres, observações e múltiplas fotos
- Destaque do usuário anterior em cada movimentação
- Controle de estoque de películas e tintas de impressora
- Central de suporte com chamados, SLA e base de conhecimento
- Checklists de conservação com fluxo de ciência
- Relatórios com exportação em PDF e Excel
- Log do sistema para auditoria completa
- Controle de acesso por papel (Administrador, Técnico e Usuário)

---

## Stack Técnico

| Camada | Tecnologia |
| :---: | --- |
| Frontend | HTML + JavaScript (vanilla), sem framework ou bundler |
| Lógica de domínio | ES Modules puros em `public/js/domain/` (ex.: UID, SLA), testados com `node --test` |
| Estilo | CSS customizado + Google Fonts (Poppins) |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| Edge Functions | Supabase Edge Functions (Deno) — uso previsto, ainda não implementado no repositório |
| Deploy | Hostinger (hospedagem compartilhada, site estático publicado via GitHub Actions) |
| Bibliotecas client-side | Chart.js, jsPDF + autotable e QRCode.js, carregadas via `<script>` em `public/index.html` |

> `server.js` (Express) existe apenas para rodar o site localmente em
> desenvolvimento — a produção não roda Node/Passenger, é servida como
> arquivos estáticos (ver "Deploy na Hostinger").

---

## Módulos do Sistema

| Módulo | Acesso | Descrição |
| --- | --- | --- |
| Dashboard | Admin / Técnico | KPIs de ativos, alocações, colaboradores e estoque |
| Meus Dispositivos | Usuário | Equipamentos alocados ao colaborador logado |
| Termos de responsabilidade | Admin / Técnico | Termo único com até 10 equipamentos, fotos, envio por WhatsApp/e-mail e assinatura digital por link (`/assinar/<token>`); alimenta o Histórico de ativos |
| Relatórios | Admin / Técnico | Filtros avançados e exportação em PDF e Excel |
| Ativos | Admin / Técnico | Cadastro, edição, status, hardware e QR Code |
| Estoque | Admin / Técnico | Películas de celular e tintas de impressora |
| Colaboradores | Admin | Cadastro, ativação e inativação |
| Alocações | Admin / Técnico | Vinculação de ativos aos colaboradores |
| Suporte | Todos | Chamados, base de conhecimento e painel técnico |
| Histórico de Ativos | Admin / Técnico | Timeline, pareceres técnicos e fotos |
| Checklists | Todos | Checklist semestral com fluxo de ciência |
| Configurações | Admin | Tipos de ativo, departamentos, cargos e usuários |
| Log do Sistema | Admin | Auditoria de ações e fila de e-mails |

---

## Perfis de Acesso

| Perfil | Permissões |
| --- | --- |
| Administrador | Acesso total, configurações, usuários, logs e exclusões definitivas |
| Técnico | Ativos, estoque, suporte, histórico, checklists e base de conhecimento |
| Usuário | Meus dispositivos, abertura de chamados e ciência de checklists |

---

## Backend — Supabase

| Serviço | Uso previsto |
| --- | --- |
| Auth | Login, sessão e controle de usuários |
| PostgreSQL | Ativos, colaboradores, alocações, estoque, chamados, histórico, checklists e logs |
| Storage | Fotos de histórico, anexos de chamados e evidências de checklist |
| Edge Functions | Envio de e-mails, integrações e rotinas server-side (Deno) |
| RLS | Proteção das tabelas por papel e permissão |

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-ou-service-role
```

> **Importante:** como o site é estático, o browser não recebe variáveis de
> ambiente do `.env` — a URL e a chave `anon` do Supabase usadas pelo
> frontend estão fixas diretamente em `public/vp-integration.js`. O `.env`
> local controla apenas a porta do servidor de desenvolvimento (`server.js`).
> A chave `anon` é pública por natureza, mas o acesso aos dados deve
> continuar protegido por RLS. Nunca exponha a chave `service_role` no
> frontend.

### Tabelas principais

```txt
profiles
employees
departments
roles
assets
allocations
asset_history
stock_items
stock_usage
tickets
ticket_messages
knowledge_articles
checklists
checklist_items
checklist_signatures
system_logs
email_queue
```

### Buckets de Storage

```txt
asset-history-photos
ticket-attachments
checklist-evidences
```

---

## Gestão de Ativos

Cada ativo possui UID automático, tipo, marca/modelo, serial ou IMEI, status, histórico de alocações, histórico técnico e QR Code.

Tipos suportados:

```txt
Notebook · Desktop · Monitor · Impressora · Celular
Tablet · Teclado · Mouse · Headset · Outro
```

Status possíveis:

```txt
Disponível · Alocado · Manutenção · Inativo · Descartado
```

Exemplos de UID:

```txt
VP-NB-2026-00001
VP-CL-2026-00001
```

---

## Histórico com Múltiplas Fotos

1. O técnico/admin seleciona o ativo
2. O campo "Usuário Anterior" é preenchido automaticamente com base na última alocação, com destaque visual
3. Ao marcar "Usuário permanece o mesmo", o nome real é mantido com o sufixo "(sem mudança)"
4. Uma ou mais fotos podem ser anexadas de uma vez (input multiple)
5. As fotos são enviadas ao Supabase Storage e vinculadas ao registro
6. No card do histórico, as fotos aparecem em galeria de miniaturas
7. Clicar em qualquer miniatura abre a foto ampliada (lightbox)

Registros antigos com apenas uma foto continuam sendo exibidos normalmente (fallback automático).

---

## Estoque de Suprimentos

### Películas de celular

| Campo | Descrição |
| --- | --- |
| Modelo do celular | Aparelho compatível |
| Material / Tipo | Tipo de película |
| Quantidade | Saldo em estoque |
| Status | Disponível, baixo ou esgotado |

### Tintas de impressora

| Campo | Descrição |
| --- | --- |
| Modelo da impressora | Impressora compatível |
| Cor / Tipo | Cor ou tipo de tinta |
| Nível | Cheio, quase cheio, na metade ou menos da metade |
| Quantidade | Saldo em estoque |
| Status | Disponível, baixo ou esgotado |

Alertas automáticos:

```txt
🟡 Estoque baixo
🔴 Estoque esgotado
```

---

## Central de Suporte

- Abertura de chamados com prioridade: Baixa, Média, Alta ou Crítica
- Vinculação com colaborador e equipamento
- Anexo de arquivos
- Painel técnico com fila de atendimento
- Indicadores: total, em aberto, resolvidos, SLA expirado, MTTR médio, heatmap por departamento e evolução em 6 meses
- Base de conhecimento com categorias: Acesso e Primeiros Passos, Periféricos, Impressoras, Rede, E-mail, Office e PABX
- Lixeira com retenção de 90 dias, restauração e exclusão definitiva com motivo

---

## Checklists "Cuida que Dura"

Checklist semestral de conservação com categorias: Limpeza, Organização, Conservação Física, Segurança e Registro TI.

Fluxo de ciência:

1. O checklist é criado pelo time técnico
2. O colaborador responsável confirma a ciência
3. A gestão confirma a ciência
4. A TI confirma a ciência
5. O sistema calcula o percentual de conformidade

A confirmação é individual por login.

---

## Log do Sistema

Eventos registrados:

```txt
Cadastro · Exclusão · Alteração · Inativação · Descarte
Limpeza de Log · Login · Logout · Chamado · E-mail
```

Exportação em CSV e fila de e-mails integrada às Edge Functions do Supabase.

---

## Estrutura do Repositório

```txt
asset-manager/
├── .claude/             # Configuração do Claude Code (skills do fluxo de especificação, launch.json)
├── .github/workflows/   # CI/CD — deploy estático automático para a Hostinger
├── public/              # Frontend estático (HTML + JS vanilla), servido pelo server.js em dev
│   └── js/domain/        # Lógica de domínio pura (UID, SLA), testada em tests/domain/
├── supabase/            # Migrations versionadas do schema do banco
├── tests/               # Testes automatizados (node --test)
├── reports/             # Relatórios de revisão (arquitetura, banco, design, handoff)
├── specs/               # Artefatos do fluxo de desenvolvimento orientado por especificação
├── CLAUDE.md            # Constituição do projeto (regras para o fluxo de especificação)
├── .env.example         # Modelo de variáveis de ambiente (porta do servidor local)
├── .gitignore
├── deploy.sh            # Script de deploy via cron/pull (ver observação em "Deploy na Hostinger")
├── package.json         # Dependências e scripts do servidor de desenvolvimento local
├── package-lock.json    # Lock de versões
├── server.js            # Servidor Node.js — apenas para desenvolvimento local
└── README.md
```

---

## Como Executar Localmente

```bash
# Clone o repositório
git clone [URL do repositório]
cd asset-manager

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env

# Inicie o servidor
node server.js
```

Acesse o endereço exibido no terminal (ex.: `http://localhost:3000`).

---

## Deploy na Hostinger

O mecanismo ativo é o **deploy estático automático** via
`.github/workflows/deploy-hostinger.yml`: a cada push em `main`, o workflow
publica o conteúdo de `public/` em `public_html/` via SSH/SCP. `server.js`
**não roda em produção** — ele existe só para desenvolvimento local (ver
"Como Executar Localmente"). Os secrets necessários ficam em Settings →
Secrets and variables → Actions do repositório
(`HOSTINGER_SSH_HOST`, `HOSTINGER_SSH_PORT`, `HOSTINGER_SSH_USER`,
`HOSTINGER_SSH_PASSWORD`, `HOSTINGER_REMOTE_PATH`); sem eles, o workflow roda
como CI mas pula o deploy.

> Também existe um `deploy.sh` no repositório, pensado para um modelo
> alternativo (cron fazendo `git pull` + `npm ci` direto no servidor). Ele não
> é acionado pelo workflow do GitHub Actions — confirme com quem administra a
> hospedagem qual dos dois mecanismos está de fato ativo antes de assumir um
> ou outro.

### Deploy manual (alternativa)

1. Envie o conteúdo da pasta `public/` para `public_html/`
2. Ative o SSL/HTTPS no domínio

---

## Segurança

- Não versionar credenciais sensíveis (`.env` no `.gitignore`)
- Nunca expor `service_role` no frontend
- RLS ativo em todas as tabelas
- Dados fictícios em ambientes de teste
- Motivo obrigatório em ações críticas: descarte, inativação, exclusão definitiva e limpeza de log
- Auditoria de login, logout e alterações administrativas

---

## Roadmap

- [ ] Integração completa com Supabase Auth
- [ ] Upload de fotos e anexos para Supabase Storage
- [ ] Policies RLS por papel
- [ ] Envio real de e-mails via Edge Functions
- [ ] Importação de histórico via API do ClickUp
- [ ] Relatórios agendados
- [ ] Dashboard avançado de SLA

---

## Repositório

| Item | Valor |
| --- | --- |
| Repositório | `[preencher com a URL do repositório]` |
| Acesso | Uso interno — colaboradores autorizados da VerticalParts |
| URL Produção | `[preencher quando publicado]` |
| Backend | Supabase |
| Hospedagem | Hostinger |

---

## Contributors

- Fernanda Freires - Gelson Simões

---

**Uso interno — VerticalParts**
