/**
 * Regras puras de movimentação de ativos (issue #47 e base da #46).
 *
 * Toda alocação, devolução ou inativação-com-ativos passa por aqui: as regras
 * de negócio (colaborador inativo não recebe ativo, pendência de inativo) e a
 * construção do registro de Histórico de ativos ficam num lugar só, para a
 * alocação manual e o termo de responsabilidade não divergirem.
 */

export const TIPO_MOVIMENTACAO = {
  ALOCACAO: 'ALOCACAO',
  DEVOLUCAO: 'DEVOLUCAO',
  INATIVACAO: 'INATIVACAO'
};

// tipo (campo `tipo` já usado pelo Histórico) correspondente a cada movimentação
const TIPO_HISTORICO = {
  ALOCACAO: 'alocacao',
  DEVOLUCAO: 'desalocacao',
  INATIVACAO: 'inativacao'
};

export function alocacoesAtivasDe(allocations, employeeId) {
  return (allocations || []).filter(function (al) {
    return al.status === 'active' && String(al.employee_id) === String(employeeId);
  });
}

/**
 * Lista de colaboradores exibida na tela de Alocações: ativos + inativos que
 * ainda têm ativos em posse (filtro por posse, não só por status). Colaborador
 * inativo sem ativos some da lista.
 */
export function colaboradoresNaListaDeAlocacao(employees, allocations) {
  const resultado = [];
  (employees || []).forEach(function (emp) {
    const pendentes = alocacoesAtivasDe(allocations, emp.id);
    const inativo = emp.status === 'inactive';
    if (!inativo || pendentes.length > 0) {
      resultado.push({ employee: emp, inativo: inativo, pendentes: pendentes });
    }
  });
  return resultado;
}

/** Regras de alocação validadas fora da interface (também valem para API/importação). */
export function validarAlocacao(employee, asset) {
  if (!employee) return { ok: false, erro: 'Colaborador não encontrado.' };
  if (employee.status !== 'active') {
    return { ok: false, erro: 'Colaborador inativo não pode receber novas alocações.' };
  }
  if (!asset) return { ok: false, erro: 'Ativo não encontrado.' };
  if (asset.status !== 'available') {
    return { ok: false, erro: 'O ativo ' + asset.uid + ' não está disponível para alocação.' };
  }
  return { ok: true };
}

export function descricaoAtivo(asset) {
  return asset ? ((asset.brand || '') + ' ' + (asset.model || '')).trim() : '';
}

/**
 * Registro de Histórico de ativos de uma movimentação. `origem: 'sistema'`
 * impede edição/exclusão manual — o registro não pode ser ignorado.
 */
export function criarRegistroHistorico(dados) {
  const tipoMov = dados.tipoMovimentacao;
  if (!TIPO_HISTORICO[tipoMov]) throw new Error('Tipo de movimentação inválido: ' + tipoMov);
  if (!dados.asset) throw new Error('Movimentação sem ativo.');
  const agora = dados.agora || new Date().toISOString();
  const nome = dados.employee ? dados.employee.name : 'Desconhecido';
  const estado = dados.estado || 'integro';
  const parecerBase = {
    ALOCACAO: 'Equipamento alocado para ' + nome + '.',
    DEVOLUCAO: 'Equipamento devolvido por ' + nome + '.',
    INATIVACAO: 'Colaborador ' + nome + ' inativado com este ativo ainda em sua posse (pendente de devolução ou realocação).'
  }[tipoMov];
  return {
    id: 'H' + (dados.idSufixo || (Date.now() + '-' + Math.random().toString(36).slice(2, 7))),
    asset_uid: dados.asset.uid,
    asset_desc: descricaoAtivo(dados.asset),
    usuario_anterior: nome,
    usuario_novo: dados.usuarioNovo || '',
    condicao: estado,
    tipo: TIPO_HISTORICO[tipoMov],
    tipo_movimentacao: tipoMov,
    colaborador_id: dados.employee ? dados.employee.id : null,
    estado: estado,
    alocacao_id: dados.alocacaoId || null,
    termo_id: dados.termoId || null,
    usuario_responsavel_id: dados.responsavel ? (dados.responsavel.id || dados.responsavel.username || null) : null,
    parecer: parecerBase + (dados.observacao ? ' Obs: ' + dados.observacao : ''),
    fotos: dados.fotos || [],
    foto: null,
    autor: dados.responsavel ? dados.responsavel.name : 'Sistema',
    autor_role: dados.responsavel ? dados.responsavel.role : 'sistema',
    origem: 'sistema',
    created_at: agora
  };
}

/**
 * Executa várias gravações como uma unidade (tudo ou nada): se qualquer
 * gravação falhar, as já feitas são revertidas para o valor anterior.
 * `store` = { get(chave), set(chave, valor) }.
 */
export function aplicarAtomicamente(store, escritas) {
  const anteriores = [];
  try {
    escritas.forEach(function (w) {
      anteriores.push({ chave: w.chave, valor: store.get(w.chave) });
      store.set(w.chave, w.valor);
    });
  } catch (erro) {
    for (let i = anteriores.length - 1; i >= 0; i--) {
      try { store.set(anteriores[i].chave, anteriores[i].valor); } catch (e) { /* melhor esforço */ }
    }
    throw erro;
  }
}

function clonar(v) { return JSON.parse(JSON.stringify(v)); }

/**
 * Serviço único de movimentação. Opera sobre cópias do estado e devolve as
 * gravações a aplicar (via aplicarAtomicamente) — movimento e histórico saem
 * sempre juntos.
 * estado = { assets, allocations, history, employees }
 */
export function alocar(estado, p) {
  const asset = estado.assets.find(function (a) { return a.uid === p.assetUid; });
  const employee = estado.employees.find(function (e) { return String(e.id) === String(p.employeeId); });
  const v = validarAlocacao(employee, asset);
  if (!v.ok) throw new Error(v.erro);
  const assets = clonar(estado.assets);
  const allocations = clonar(estado.allocations);
  const history = clonar(estado.history);
  assets.find(function (a) { return a.uid === p.assetUid; }).status = 'assigned';
  const agora = p.agora || new Date().toISOString();
  const alocacao = {
    id: p.alocacaoId || ('al' + Date.now() + Math.random().toString(36).slice(2, 6)),
    employee_id: p.employeeId, asset_uid: p.assetUid, date: agora, status: 'active',
    historico_registrado: true, termo_id: p.termoId || null
  };
  allocations.push(alocacao);
  history.push(criarRegistroHistorico({
    tipoMovimentacao: TIPO_MOVIMENTACAO.ALOCACAO, asset: asset, employee: employee,
    estado: p.estado, termoId: p.termoId, responsavel: p.responsavel, observacao: p.observacao,
    fotos: p.fotos, agora: agora, alocacaoId: alocacao.id
  }));
  return { assets: assets, allocations: allocations, history: history, alocacao: alocacao };
}

export function devolver(estado, p) {
  const allocations = clonar(estado.allocations);
  const alloc = allocations.find(function (a) { return a.id === p.alocacaoId; });
  if (!alloc || alloc.status !== 'active') throw new Error('Alocação ativa não encontrada.');
  const assets = clonar(estado.assets);
  const asset = assets.find(function (a) { return a.uid === alloc.asset_uid; });
  if (!asset) throw new Error('Ativo da alocação não encontrado.');
  const employee = estado.employees.find(function (e) { return String(e.id) === String(alloc.employee_id); });
  const history = clonar(estado.history);
  const estadoAtivo = p.estado || 'integro';
  alloc.status = 'inactive';
  alloc.devolvido_em = p.agora || new Date().toISOString();
  alloc.historico_registrado = true;
  asset.status = estadoAtivo === 'avariado' ? 'maintenance' : 'available';
  if (p.observacao) asset.observacao = p.observacao;
  history.push(criarRegistroHistorico({
    tipoMovimentacao: TIPO_MOVIMENTACAO.DEVOLUCAO, asset: asset, employee: employee,
    estado: estadoAtivo, termoId: p.termoId, responsavel: p.responsavel, observacao: p.observacao,
    fotos: p.fotos, agora: alloc.devolvido_em, alocacaoId: alloc.id
  }));
  return { assets: assets, allocations: allocations, history: history, alocacao: alloc };
}

/**
 * Realocação: devolução + alocação no mesmo passo (dois registros de histórico:
 * DEVOLUCAO do colaborador anterior e ALOCACAO ao novo).
 */
export function realocar(estado, p) {
  const dev = devolver(estado, { alocacaoId: p.alocacaoId, estado: p.estado, observacao: p.observacao, responsavel: p.responsavel, agora: p.agora, termoId: p.termoId });
  const uid = dev.alocacao.asset_uid;
  // o ativo volta a "available" na devolução; a alocação seguinte o reserva ao novo colaborador
  const ativoLiberado = dev.assets.find(function (a) { return a.uid === uid; });
  if (ativoLiberado.status === 'maintenance') {
    throw new Error('Ativo avariado não pode ser realocado direto; envie para manutenção primeiro.');
  }
  const novo = alocar({ assets: dev.assets, allocations: dev.allocations, history: dev.history, employees: estado.employees }, {
    assetUid: uid, employeeId: p.novoEmployeeId, responsavel: p.responsavel, estado: p.estado,
    observacao: p.observacao, agora: p.agora, termoId: p.termoId
  });
  return novo;
}

/** Registro de INATIVACAO para uma posse pendente de colaborador inativo (não altera a alocação). */
export function registrarInativacao(estado, p) {
  const asset = estado.assets.find(function (a) { return a.uid === p.alocacao.asset_uid; });
  if (!asset) throw new Error('Ativo da alocação não encontrado.');
  const history = clonar(estado.history);
  history.push(criarRegistroHistorico({
    tipoMovimentacao: TIPO_MOVIMENTACAO.INATIVACAO, asset: asset, employee: p.employee,
    estado: p.estado, responsavel: p.responsavel, agora: p.agora, alocacaoId: p.alocacao.id
  }));
  return { history: history };
}

/**
 * Inativações de colaborador com ativos ainda não registradas no histórico.
 * Idempotente: um registro INATIVACAO por (colaborador, ativo) enquanto a posse durar.
 */
export function inativacoesPendentesDeRegistro(employees, allocations, history) {
  const pendentes = [];
  (employees || []).forEach(function (emp) {
    if (emp.status !== 'inactive') return;
    alocacoesAtivasDe(allocations, emp.id).forEach(function (al) {
      const jaRegistrado = (history || []).some(function (h) {
        return h.tipo_movimentacao === TIPO_MOVIMENTACAO.INATIVACAO &&
          String(h.colaborador_id) === String(emp.id) && h.alocacao_id === al.id;
      });
      if (!jaRegistrado) pendentes.push({ employee: emp, alocacao: al });
    });
  });
  return pendentes;
}

if (typeof window !== 'undefined') {
  window.MovDomain = {
    TIPO_MOVIMENTACAO: TIPO_MOVIMENTACAO, alocacoesAtivasDe: alocacoesAtivasDe,
    colaboradoresNaListaDeAlocacao: colaboradoresNaListaDeAlocacao, validarAlocacao: validarAlocacao,
    criarRegistroHistorico: criarRegistroHistorico, aplicarAtomicamente: aplicarAtomicamente,
    alocar: alocar, devolver: devolver, realocar: realocar,
    inativacoesPendentesDeRegistro: inativacoesPendentesDeRegistro, registrarInativacao: registrarInativacao
  };
}
