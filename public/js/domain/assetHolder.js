/**
 * Regra pura de resolução do responsável atual de um ativo
 * (specs/001-busca-rapida-ativos). Não toca localStorage/Supabase/DOM —
 * recebe as listas de alocações e colaboradores já carregadas e devolve o
 * resultado, testável isoladamente com `node --test` (ver uid.js/sla.js).
 */

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
