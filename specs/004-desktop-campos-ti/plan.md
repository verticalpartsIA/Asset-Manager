# Plano Técnico: Desktop com os mesmos campos de TI do Notebook

Stack usada: HTML + JavaScript vanilla, nenhuma dependência nova
(Constituição, seção 2). Mudança pontual em `public/index.html`, nos 5
pontos mapeados em `research.md` — trocar a condição `'NB'` por
`('NB' || 'DK')` em cada um:

1. `renderAtivos()` — coluna "Info Extra": `a.type === 'NB'` →
   `(a.type === 'NB' || a.type === 'DK')`.
2. `mostrarDetalhesAtivo()` — bloco de detalhes: `a.type === 'NB'` →
   `(a.type === 'NB' || a.type === 'DK')`.
3. `gerarCamposDinamicosHtml()` — geração do formulário: `tipo === 'NB'` →
   `(tipo === 'NB' || tipo === 'DK')`.
4. `cadastrarAtivo()` — gravação no cadastro: `tipo === 'NB'` →
   `(tipo === 'NB' || tipo === 'DK')`.
5. `confirmarEditarAtivo()` — gravação na edição: `a.type === 'NB'` →
   `(a.type === 'NB' || a.type === 'DK')`.

Nenhum módulo de domínio novo (ver `research.md` — não é lógica de negócio
isolável, é condição de apresentação/persistência de formulário).

## Testes

Sem teste de domínio (nenhuma função pura nova). Validação é manual via
navegador (Playwright), coberta na Fase de Validação do `tasks.md`.
