# Plano Técnico: Busca por Responsável e Departamento em Ativos

Stack usada: HTML + JavaScript vanilla, nenhuma dependência nova
(Constituição, seção 2). Esta feature **estende** os módulos de domínio já
criados pela feature 001, em vez de criar módulos paralelos — evita duplicar
a regra de correspondência de busca em dois lugares.

## 1. Estender `public/js/domain/assetHolder.js`

Adicionar `employeeDepartment` ao retorno de `resolveCurrentHolder`
(mudança aditiva, não quebra a coluna "Responsável Atual" da feature 001,
que só lê `employeeName`):

```js
export function resolveCurrentHolder(assetUid, allocations, employees) {
  const alocacaoAtiva = (allocations || []).find(function (al) {
    return al && al.asset_uid === assetUid && al.status === 'active';
  });
  if (!alocacaoAtiva) return null;
  const employee = (employees || []).find(function (e) {
    return e && String(e.id) === String(alocacaoAtiva.employee_id);
  });
  return employee
    ? { employeeId: employee.id, employeeName: employee.name, employeeDepartment: employee.depto }
    : null;
}
```

## 2. Estender `public/js/domain/assetSearch.js`

Adicionar um parâmetro opcional de "holder" tanto em `ativoCorrespondeABusca`
quanto em `filtrarAtivosPorBusca`, mantendo compatibilidade retroativa
(parâmetro omitido = comportamento idêntico ao de hoje):

```js
export function ativoCorrespondeABusca(asset, termoNormalizado, holder) {
  if (!termoNormalizado) return true;
  const campos = [
    asset && asset.uid,
    asset && asset.serial,
    asset && asset.imei,
    holder && holder.employeeName,
    holder && holder.employeeDepartment
  ];
  return campos.some(function (campo) {
    return String(campo || '').toLowerCase().indexOf(termoNormalizado) !== -1;
  });
}

export function filtrarAtivosPorBusca(items, termo, getAsset, getHolder) {
  const termoNormalizado = normalizarTermoBusca(termo);
  if (!termoNormalizado) return items;
  const resolveAsset = getAsset || function (item) { return item; };
  const resolveHolder = getHolder || function () { return null; };
  return items.filter(function (item) {
    return ativoCorrespondeABusca(resolveAsset(item), termoNormalizado, resolveHolder(item));
  });
}
```

## 3. Alterações em `public/index.html` — `renderAtivos()`

(`public/index.html:3160-3172` no estado atual). Mover o carregamento de
`allocationsAtuais`/`employeesAtuais` para o **início** da função (antes do
filtro de status), resolver o holder de cada item **uma única vez** e
reaproveitá-lo tanto no filtro de busca quanto na renderização da linha
(em vez de resolver duas vezes por item, como seria se só acrescentássemos
o parâmetro sem reorganizar):

```js
function renderAtivos() {
  const userScoped = currentUser && currentUser.role === 'user';
  const scopedItems = userScoped ? ativosSobTutelaDoUsuarioAtual() : getData(SK.assets).map(function(asset) { return { asset: asset, allocation: null }; });
  const allocationsAtuais = getData(SK.allocations);
  const employeesAtuais = getData(SK.employees);
  scopedItems.forEach(function (item) {
    item.holder = window.AssetHolderDomain.resolveCurrentHolder(item.asset.uid, allocationsAtuais, employeesAtuais);
  });
  let filtered = scopedItems;
  if (ativoFiltro !== 'todos') filtered = scopedItems.filter(function(item) { return item.asset.status === ativoFiltro; });
  filtered = window.AssetSearchDomain.filtrarAtivosPorBusca(
    filtered, ativoBusca,
    function(item) { return item.asset; },
    function(item) { return item.holder; }
  );
  const tbody = document.getElementById('ativos-table-body');
  if (userScoped && (!currentUser || !currentUser.employee_id)) {
    tbody.innerHTML = '...'; // inalterado
    return;
  }
  tbody.innerHTML = filtered.map(function(item) {
    // ...
    const holder = item.holder; // reaproveita em vez de chamar resolveCurrentHolder de novo
    const responsavelAtual = holder ? holder.employeeName : 'Disponível';
    // ...
  }).join('') || '...'; // inalterado
}
```

Nenhuma outra tela ou função é alterada — a busca continua sendo acionada
pelo mesmo campo `#ativos-busca` e pela mesma `buscarAtivos(termo)` já
existentes.

## 4. Testes (Constituição, seção 5)

- **`tests/domain/assetHolder.test.mjs`** (arquivo existente, da feature
  001): adicionar `employeeDepartment` nos objetos esperados dos testes
  que já verificam um retorno com colaborador encontrado, e confirmar que
  os testes de "sem colaborador"/"sem alocação ativa" continuam retornando
  `null` (comportamento inalterado).
- **`tests/domain/assetSearch.test.mjs`** (arquivo existente, da feature
  001): adicionar casos novos cobrindo `ativoCorrespondeABusca` e
  `filtrarAtivosPorBusca` com um terceiro/quarto argumento de holder:
  busca pelo nome do responsável encontra o ativo; busca pelo departamento
  encontra o ativo; busca sem holder (ou com holder `null`, ativo
  "Disponível") não quebra e não gera falso positivo; os testes já
  existentes (sem holder) continuam passando sem nenhuma alteração, para
  confirmar retrocompatibilidade.

## 5. Fora do escopo desta implementação (reafirmando a spec)

- Nenhuma migração Supabase.
- Nenhuma mudança em `vp-integration.js`.
- Nenhuma busca por marca/modelo, nenhum filtro dedicado de departamento,
  nenhum autocomplete.
