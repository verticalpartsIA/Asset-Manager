# Plano Técnico: Busca Rápida de Ativos

Stack usada: HTML + JavaScript vanilla, nenhuma dependência nova
(Constituição, seção 2 — nenhuma proposta de framework/bundler é necessária
nem desejável aqui).

## 1. Novo módulo de domínio: lógica de busca (puro, testável)

**Arquivo novo:** `public/js/domain/assetSearch.js`

Segue exatamente o padrão de `public/js/domain/uid.js` /
`public/js/domain/sla.js` (Constituição, seção 3 — regras de negócio
isoladas em `public/js/domain/`, nunca embutidas em handlers de UI):

```js
export function normalizarTermoBusca(termo) {
  return String(termo || '').trim().toLowerCase();
}

export function ativoCorrespondeABusca(asset, termoNormalizado) {
  if (!termoNormalizado) return true;
  const campos = [asset && asset.uid, asset && asset.serial, asset && asset.imei];
  return campos.some(function (campo) {
    return String(campo || '').toLowerCase().indexOf(termoNormalizado) !== -1;
  });
}

export function filtrarAtivosPorBusca(items, termo, getAsset) {
  const termoNormalizado = normalizarTermoBusca(termo);
  if (!termoNormalizado) return items;
  const resolveAsset = getAsset || function (item) { return item; };
  return items.filter(function (item) {
    return ativoCorrespondeABusca(resolveAsset(item), termoNormalizado);
  });
}

if (typeof window !== 'undefined') {
  window.AssetSearchDomain = {
    normalizarTermoBusca: normalizarTermoBusca,
    ativoCorrespondeABusca: ativoCorrespondeABusca,
    filtrarAtivosPorBusca: filtrarAtivosPorBusca
  };
}
```

`filtrarAtivosPorBusca` recebe um `getAsset` extrator porque, em
`renderAtivos()`, os itens filtrados são `{ asset, allocation }`, não o
`asset` puro — mantém a função reutilizável sem acoplar ao formato interno
da tela.

## 2. Novo módulo de domínio: resolução do responsável atual (puro, testável)

**Arquivo novo:** `public/js/domain/assetHolder.js`

```js
export function resolveCurrentHolder(assetUid, allocations, employees) {
  const alocacaoAtiva = (allocations || []).find(function (al) {
    return al && al.asset_uid === assetUid && al.status === 'active';
  });
  if (!alocacaoAtiva) return null;
  const employee = (employees || []).find(function (e) {
    return e && String(e.id) === String(alocacaoAtiva.employee_id);
  });
  return employee ? { employeeId: employee.id, employeeName: employee.name } : null;
}

if (typeof window !== 'undefined') {
  window.AssetHolderDomain = { resolveCurrentHolder: resolveCurrentHolder };
}
```

Implementa a regra documentada em `data-model.md` (seção "responsável
atual"). Extraída como função própria (em vez de ir dentro de
`assetSearch.js`) porque resolve um conceito reutilizável fora do contexto
de busca (ex.: poderia futuramente ser usada em Relatórios ou Histórico).

## 3. Alterações em `public/index.html`

1. Carregar os dois módulos novos junto aos já existentes (linhas 22-24):
   ```html
   <script type="module" src="./js/domain/uid.js"></script>
   <script type="module" src="./js/domain/sla.js"></script>
   <script type="module" src="./js/domain/assetSearch.js"></script>
   <script type="module" src="./js/domain/assetHolder.js"></script>
   ```
2. Adicionar o campo de busca na barra de filtros da tela de Ativos
   (`public/index.html:1107-1118`, dentro de `.table-header-bar`, ao lado
   dos botões de status já existentes):
   ```html
   <input type="search" id="ativos-busca" class="input-search"
          placeholder="Buscar por UID, serial ou IMEI..."
          oninput="buscarAtivos(this.value)" aria-label="Buscar ativos por UID, serial ou IMEI">
   ```
3. Adicionar a coluna "Responsável Atual" no cabeçalho da tabela
   (`public/index.html:1120`), entre "Status" e "Observação" (ou ao final,
   decisão de layout livre na implementação, desde que coerente com FR05).
4. Nova variável de módulo `ativoBusca = ''` ao lado de `ativoFiltro`
   (`public/index.html:3112`).
5. Nova função, ao lado de `filtrarAtivos` (`public/index.html:3159`):
   ```js
   function buscarAtivos(termo) { ativoBusca = termo; renderAtivos(); }
   ```
6. Em `renderAtivos()` (`public/index.html:3130`), depois de aplicar o
   filtro de status existente e antes de montar `tbody.innerHTML`, aplicar a
   busca sobre o resultado já escopado/filtrado:
   ```js
   filtered = window.AssetSearchDomain.filtrarAtivosPorBusca(
     filtered, ativoBusca, function (item) { return item.asset; }
   );
   ```
7. Para cada linha renderizada, calcular o responsável atual usando
   `window.AssetHolderDomain.resolveCurrentHolder(a.uid, getData(SK.allocations), getData(SK.employees))`
   e exibir `holder ? holder.employeeName : 'Disponível'` na nova coluna.
   (Observação de performance: para listas grandes, calcular
   `getData(SK.allocations)`/`getData(SK.employees)` uma vez antes do
   `.map()`, não a cada linha — ponto de atenção para `/tasks`.)
8. Ajustar a mensagem de "nenhum resultado" já existente
   (`public/index.html:3157`) para cobrir o caso de busca sem resultado
   (FR06 da spec) — o texto genérico "Nenhum ativo encontrado" já cumpre o
   requisito sem alteração, mas confirmar na implementação.

## 4. Testes (Constituição, seção 5)

**Arquivos novos:**
- `tests/domain/assetSearch.test.mjs` — cobre: termo vazio retorna tudo;
  correspondência por substring em UID, serial e IMEI; case-insensitive;
  nenhum campo bate → filtra tudo fora; `filtrarAtivosPorBusca` com
  `getAsset` extraindo de `{ asset, allocation }`.
- `tests/domain/assetHolder.test.mjs` — cobre: nenhuma alocação ativa →
  `null`; alocação ativa sem employee correspondente → `null`; alocação
  ativa com employee → retorna nome; múltiplas alocações (uma inativa, uma
  ativa) → usa só a ativa.

## 5. Fora do escopo desta implementação (reafirmando a spec)

- Nenhuma migração Supabase.
- Nenhuma mudança em `vp-integration.js` (não depende de sincronização).
- Nenhuma busca por nome de responsável/departamento/marca — só
  UID/serial/IMEI, conforme FR04 e "Fora do Escopo" da spec.
