# Data Model: Edição de Estoque Sempre Persistir Corretamente

## Mudança de schema necessária

**Nenhuma.** O campo `id` do objeto `supply` já existe; esta correção só
muda como seu valor é gerado (mais resistente a colisão), sem alterar o
tipo ou o formato geral (continua uma string começando com `SUP-`).
Nenhuma migração em `supabase/migrations/` é necessária.

## RLS

Não aplicável.
