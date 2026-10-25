-- Permite ao anon (visitante não autenticado) acessar o schema asset_manager —
-- pré-requisito do PostgREST para resolver a chamada às RPCs públicas de
-- termos (termo_publico_obter/termo_publico_assinar), usadas pela página
-- /assinar/<token> (issue #46). A migration 20261002163713 já concedia
-- EXECUTE nas duas funções a anon, mas sem USAGE no schema o PostgREST
-- rejeita a chamada antes de chegar à função ("permission denied for schema
-- asset_manager"). Não concede acesso a tabelas: ambas as RPCs são security
-- definer e a RLS de termo_assinaturas segue restrita a staff.
grant usage on schema asset_manager to anon;
