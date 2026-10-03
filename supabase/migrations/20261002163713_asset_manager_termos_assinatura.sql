-- =====================================================================
-- Termos de responsabilidade — assinatura digital por link (issue #46)
--
-- O app é estático e o termo (colaborador, itens, estados, fotos) vive em
-- app_state['termos']. Esta migration adiciona só o que precisa de servidor:
--   • termo_assinaturas — link único (somente o HASH do token é guardado),
--     expiração, snapshot do documento e evidências da assinatura;
--   • RPCs públicas (anon) que só enxergam UM termo, via token;
--   • limite de tentativas inválidas por IP (proteção contra enumeração).
-- Aditiva: não altera tabelas existentes.
-- =====================================================================

create table if not exists asset_manager.termo_assinaturas (
  id              uuid primary key default gen_random_uuid(),
  termo_id        text not null,
  token_hash      text not null unique,
  canal           text not null check (canal in ('WHATSAPP', 'EMAIL')),
  status          text not null default 'enviado' check (status in ('enviado', 'assinado', 'cancelado')),
  expira_em       timestamptz not null,
  conteudo        jsonb not null,            -- snapshot imutável do documento exibido/assinado
  assinante_nome  text,
  assinatura_img  text,                      -- data URL da assinatura desenhada (opcional)
  assinado_em     timestamptz,
  ip              text,
  user_agent      text,
  documento_hash  text,                      -- sha-256 de (conteudo + nome + assinado_em)
  criado_por      uuid references public.profiles(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index if not exists termo_assinaturas_termo_idx on asset_manager.termo_assinaturas(termo_id);

create table if not exists asset_manager.termo_tentativas_invalidas (
  id        bigserial primary key,
  ip        text not null,
  criado_em timestamptz not null default now()
);
create index if not exists termo_tentativas_ip_idx on asset_manager.termo_tentativas_invalidas(ip, criado_em);

alter table asset_manager.termo_assinaturas enable row level security;
alter table asset_manager.termo_tentativas_invalidas enable row level security;

-- Somente staff (Administrador/Técnico — asset_manager.is_staff()) lê e escreve; o snapshot
-- e as evidências (nome, assinatura, IP, user agent) não ficam expostos a usuários comuns.
-- anon NÃO acessa as tabelas: só as RPCs abaixo.
drop policy if exists "termo_assinaturas_authenticated" on asset_manager.termo_assinaturas;
drop policy if exists "termo_assinaturas_staff" on asset_manager.termo_assinaturas;
create policy "termo_assinaturas_staff" on asset_manager.termo_assinaturas
  as permissive for all to authenticated
  using (asset_manager.is_staff()) with check (asset_manager.is_staff());
grant select, insert, update on asset_manager.termo_assinaturas to authenticated;
grant all on asset_manager.termo_assinaturas to service_role;
grant all on asset_manager.termo_tentativas_invalidas to service_role;

-- IP do cliente a partir dos headers do PostgREST.
create or replace function asset_manager._termo_ip()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(split_part(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ''), ',', 1), ''),
    'desconhecido');
$$;

create or replace function asset_manager._termo_hash(p_texto text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p_texto, 'utf8'), 'sha256'), 'hex');
$$;

-- Bloqueia o IP após 20 tentativas inválidas em 10 minutos.
create or replace function asset_manager._termo_bloqueado(p_ip text)
returns boolean language sql stable set search_path = '' as $$
  select count(*) >= 20 from asset_manager.termo_tentativas_invalidas
  where ip = p_ip and criado_em > now() - interval '10 minutes';
$$;

-- Consulta pública: devolve a situação do link e, se válido, o documento.
create or replace function asset_manager.termo_publico_obter(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text := asset_manager._termo_ip();
  v_row asset_manager.termo_assinaturas%rowtype;
begin
  if asset_manager._termo_bloqueado(v_ip) then
    return jsonb_build_object('situacao', 'bloqueado');
  end if;
  select * into v_row from asset_manager.termo_assinaturas
    where token_hash = asset_manager._termo_hash(coalesce(p_token, ''));
  if not found then
    insert into asset_manager.termo_tentativas_invalidas(ip) values (v_ip);
    return jsonb_build_object('situacao', 'invalido');
  end if;
  if v_row.status = 'assinado' then
    return jsonb_build_object('situacao', 'assinado', 'assinado_em', v_row.assinado_em);
  elsif v_row.status = 'cancelado' then
    return jsonb_build_object('situacao', 'cancelado');
  elsif v_row.expira_em <= now() then
    return jsonb_build_object('situacao', 'expirado');
  end if;
  return jsonb_build_object('situacao', 'valido', 'expira_em', v_row.expira_em, 'conteudo', v_row.conteudo);
end;
$$;

-- Assinatura pública: uso único; registra data/hora, IP, user agent e hash do documento.
create or replace function asset_manager.termo_publico_assinar(
  p_token text, p_nome text, p_assinatura text, p_user_agent text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text := asset_manager._termo_ip();
  v_row asset_manager.termo_assinaturas%rowtype;
  v_agora timestamptz := now();
begin
  if asset_manager._termo_bloqueado(v_ip) then
    return jsonb_build_object('situacao', 'bloqueado');
  end if;
  if coalesce(btrim(p_nome), '') = '' then
    return jsonb_build_object('situacao', 'nome_obrigatorio');
  end if;
  select * into v_row from asset_manager.termo_assinaturas
    where token_hash = asset_manager._termo_hash(coalesce(p_token, '')) for update;
  if not found then
    insert into asset_manager.termo_tentativas_invalidas(ip) values (v_ip);
    return jsonb_build_object('situacao', 'invalido');
  end if;
  if v_row.status = 'assinado' then return jsonb_build_object('situacao', 'assinado'); end if;
  if v_row.status = 'cancelado' then return jsonb_build_object('situacao', 'cancelado'); end if;
  if v_row.expira_em <= v_agora then return jsonb_build_object('situacao', 'expirado'); end if;

  update asset_manager.termo_assinaturas set
    status = 'assinado', assinante_nome = btrim(p_nome),
    assinatura_img = nullif(left(coalesce(p_assinatura, ''), 400000), ''),
    assinado_em = v_agora, ip = v_ip, user_agent = left(coalesce(p_user_agent, ''), 400),
    documento_hash = asset_manager._termo_hash(v_row.conteudo::text || '|' || btrim(p_nome) || '|' || v_agora::text)
  where id = v_row.id;
  return jsonb_build_object('situacao', 'assinado', 'assinado_em', v_agora);
end;
$$;

revoke all on function asset_manager.termo_publico_obter(text) from public;
revoke all on function asset_manager.termo_publico_assinar(text, text, text, text) from public;
grant execute on function asset_manager.termo_publico_obter(text) to anon, authenticated;
grant execute on function asset_manager.termo_publico_assinar(text, text, text, text) to anon, authenticated;
