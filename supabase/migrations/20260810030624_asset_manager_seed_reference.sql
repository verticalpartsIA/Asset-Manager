-- Seed idempotente das tabelas de referência (valores vindos do app.js atual)

insert into asset_manager.departments (name) values
  ('ADMINISTRAÇÃO'),('ALMOXERIFADO'),('ASSEIO E CONSERVAÇÃO'),('AUTOMAÇÃO'),
  ('COMERCIAL'),('COMPRAS'),('COPA'),('DIRETORIA'),('ENGENHARIA'),('EXPEDIÇÃO'),
  ('FINANCEIRO'),('GENTE E GESTÃO'),('INSTALAÇÃO E MANUTENÇÃO'),('LOGISTICA'),
  ('MARKETING'),('MONTAGEM'),('MOTORISTA'),('OPERAÇÕES'),('PCP'),('PÓS VENDA'),
  ('PRODUÇÃO'),('QUALIDADE'),('SERRALHEIRO'),('TI')
on conflict (name) do nothing;

insert into asset_manager.job_roles (name) values
  ('Analista'),('Gerente'),('Coordenador'),('Supervisor'),('Técnico'),
  ('Assistente'),('Diretor'),('Operador'),('Auxiliar'),('Engenheiro'),
  ('Inspetor'),('Comprador'),('Almoxarife'),('Conferente'),('Motorista'),
  ('Atendente'),('Serralheiro'),('Vendedor'),('Desenvolvedor')
on conflict (name) do nothing;

insert into asset_manager.asset_types (code, label) values
  ('NB','Notebook'),('DT','Desktop'),('MN','Monitor'),('IM','Impressora'),
  ('CL','Celular'),('TB','Tablet'),('TC','Teclado'),('MO','Mouse'),
  ('HS','Headset'),('OU','Outro')
on conflict (code) do nothing;
