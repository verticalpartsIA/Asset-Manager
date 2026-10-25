/**
 * Regras puras de correspondência da Busca Rápida de Ativos
 * (specs/001-busca-rapida-ativos). Nenhuma dessas funções toca
 * localStorage/Supabase/DOM — recebem dados como parâmetro e devolvem
 * resultado, testáveis isoladamente com `node --test` (ver uid.js/sla.js).
 */

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
