-- =====================================================================
-- Asset Manager — 3º app residente no Core (ubdkoqxfwcraftesgmbw)
-- Todo o modelo vive num schema DEDICADO 'asset_manager'.
-- Identidade de usuário: SEMPRE reusa public.profiles (nunca duplica).
-- Nada no schema public é alterado por esta migração.
-- =====================================================================

create schema if not exists asset_manager;

-- Função de updated_at isolada no schema do app
create or replace function asset_manager.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Tabelas de referência ----------
create table asset_manager.departments (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  color       text,
  created_at  timestamptz not null default now()
);

create table asset_manager.job_roles (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table asset_manager.asset_types (
  id          bigint generated always as identity primary key,
  code        text not null unique,          -- ex.: NB, CL, MN
  label       text not null,                 -- ex.: Notebook, Celular
  created_at  timestamptz not null default now()
);

-- Sequência p/ gerar UID VP-<TIPO>-<ANO>-<NNNNN>
create table asset_manager.asset_sequences (
  year        int  not null,
  type_code   text not null,
  last_number int  not null default 0,
  primary key (year, type_code)
);

-- ---------- Colaboradores (recebem ativos) ----------
-- Conceito de negócio: NÃO é o usuário de login. Login = public.profiles.
create table asset_manager.employees (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  email          text,
  department_id  bigint references asset_manager.departments(id) on delete set null,
  job_role_id    bigint references asset_manager.job_roles(id)   on delete set null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Ativos ----------
create table asset_manager.assets (
  id             uuid primary key default gen_random_uuid(),
  uid            text not null unique,
  type_id        bigint references asset_manager.asset_types(id) on delete set null,
  brand          text,
  model          text,
  serial_number  text,
  imei           text,
  status         text not null default 'Disponível'
                 check (status in ('Disponível','Alocado','Manutenção','Inativo','Descartado')),
  value          numeric(12,2),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Alocações ----------
create table asset_manager.allocations (
  id             uuid primary key default gen_random_uuid(),
  asset_id       uuid not null references asset_manager.assets(id) on delete cascade,
  employee_id    uuid references asset_manager.employees(id) on delete set null,
  allocated_at   timestamptz not null default now(),
  returned_at    timestamptz,
  condition_out  text,
  condition_in   text,
  notes          text,
  is_current     boolean not null default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---------- Histórico técnico + fotos ----------
create table asset_manager.asset_history (
  id                    uuid primary key default gen_random_uuid(),
  asset_id              uuid not null references asset_manager.assets(id) on delete cascade,
  event_type            text,
  previous_employee_id  uuid references asset_manager.employees(id) on delete set null,
  description           text,
  technical_opinion     text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

create table asset_manager.asset_history_photos (
  id           uuid primary key default gen_random_uuid(),
  history_id   uuid not null references asset_manager.asset_history(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---------- Estoque (películas / tintas) ----------
create table asset_manager.stock_items (
  id            uuid primary key default gen_random_uuid(),
  category      text not null check (category in ('pelicula','tinta')),
  phone_model   text,
  printer_model text,
  material      text,
  color         text,
  level         text,
  quantity      int not null default 0,
  status        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table asset_manager.stock_usage (
  id             uuid primary key default gen_random_uuid(),
  stock_item_id  uuid not null references asset_manager.stock_items(id) on delete cascade,
  quantity       int not null,
  employee_id    uuid references asset_manager.employees(id) on delete set null,
  used_by        uuid references public.profiles(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

-- ---------- Suporte ----------
create table asset_manager.tickets (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,
  title         text not null,
  description   text,
  priority      text not null default 'Média'
                check (priority in ('Baixa','Média','Alta','Crítica')),
  status        text not null default 'Aberto'
                check (status in ('Aberto','Em Andamento','Resolvido','Fechado')),
  category      text,
  employee_id   uuid references asset_manager.employees(id) on delete set null,
  asset_id      uuid references asset_manager.assets(id) on delete set null,
  opened_by     uuid references public.profiles(id) on delete set null,
  assigned_to   uuid references public.profiles(id) on delete set null,
  sla_due_at    timestamptz,
  resolved_at   timestamptz,
  deleted_at    timestamptz,          -- lixeira (retenção 90 dias)
  delete_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table asset_manager.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references asset_manager.tickets(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create table asset_manager.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references asset_manager.tickets(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---------- Base de conhecimento ----------
create table asset_manager.knowledge_articles (
  id          uuid primary key default gen_random_uuid(),
  category    text,
  title       text not null,
  body        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Checklists "Cuida que Dura" ----------
create table asset_manager.checklists (
  id          uuid primary key default gen_random_uuid(),
  year        int,
  semester    int check (semester in (1,2)),
  title       text,
  category    text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table asset_manager.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references asset_manager.checklists(id) on delete cascade,
  label        text not null,
  category     text,
  done         boolean not null default false,
  sort_order   int not null default 0
);

create table asset_manager.checklist_signatures (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references asset_manager.checklists(id) on delete cascade,
  signer_id    uuid references public.profiles(id) on delete set null,
  role_context text check (role_context in ('colaborador','gestao','ti')),
  signed_at    timestamptz not null default now()
);

-- ---------- Log do sistema ----------
create table asset_manager.system_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text,
  details    text,
  log_type   text,
  created_at timestamptz not null default now()
);

-- ---------- Fila de e-mails ----------
create table asset_manager.email_queue (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  subject    text,
  body       text,
  status     text not null default 'pending',
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

-- ---------- Índices em FKs e colunas de filtro comuns ----------
create index on asset_manager.employees(department_id);
create index on asset_manager.employees(job_role_id);
create index on asset_manager.assets(type_id);
create index on asset_manager.assets(status);
create index on asset_manager.allocations(asset_id);
create index on asset_manager.allocations(employee_id);
create index on asset_manager.allocations(created_by);
create index on asset_manager.allocations(asset_id) where is_current;
create index on asset_manager.asset_history(asset_id);
create index on asset_manager.asset_history(previous_employee_id);
create index on asset_manager.asset_history(created_by);
create index on asset_manager.asset_history_photos(history_id);
create index on asset_manager.stock_usage(stock_item_id);
create index on asset_manager.stock_usage(employee_id);
create index on asset_manager.stock_usage(used_by);
create index on asset_manager.tickets(status);
create index on asset_manager.tickets(employee_id);
create index on asset_manager.tickets(asset_id);
create index on asset_manager.tickets(opened_by);
create index on asset_manager.tickets(assigned_to);
create index on asset_manager.tickets(deleted_at);
create index on asset_manager.ticket_messages(ticket_id);
create index on asset_manager.ticket_messages(author_id);
create index on asset_manager.ticket_attachments(ticket_id);
create index on asset_manager.knowledge_articles(created_by);
create index on asset_manager.checklists(created_by);
create index on asset_manager.checklist_items(checklist_id);
create index on asset_manager.checklist_signatures(checklist_id);
create index on asset_manager.checklist_signatures(signer_id);
create index on asset_manager.system_logs(actor_id);
create index on asset_manager.system_logs(created_at);
create index on asset_manager.email_queue(status);

-- ---------- Triggers updated_at ----------
create trigger set_updated_at before update on asset_manager.employees
  for each row execute function asset_manager.set_updated_at();
create trigger set_updated_at before update on asset_manager.assets
  for each row execute function asset_manager.set_updated_at();
create trigger set_updated_at before update on asset_manager.stock_items
  for each row execute function asset_manager.set_updated_at();
create trigger set_updated_at before update on asset_manager.tickets
  for each row execute function asset_manager.set_updated_at();
create trigger set_updated_at before update on asset_manager.knowledge_articles
  for each row execute function asset_manager.set_updated_at();
