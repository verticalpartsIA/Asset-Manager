# Data Model: Desktop com os mesmos campos de TI do Notebook

## Mudança de schema necessária

**Nenhuma.** Os campos (`serviceTag`, `so`, `winupdate`, `antivirus`, `hd`,
`processador`, `ram`, `bitlockerId`, `bitlockerPass`, `anydesk`, `intune`)
já existem no objeto `asset` para o tipo `'NB'` — esta feature só passa a
gravar/ler os mesmos campos também quando `asset.type === 'DK'`. Nenhuma
migração em `supabase/migrations/` é necessária.

## RLS

Não aplicável — nenhuma tabela nova, nenhuma coluna nova.
