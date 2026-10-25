import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alocar, devolver, realocar, validarAlocacao, colaboradoresNaListaDeAlocacao,
  inativacoesPendentesDeRegistro, registrarInativacao, aplicarAtomicamente, criarRegistroHistorico,
  revalidarAlocacoesTermo
} from '../../public/js/domain/movimentacao.js';

const resp = { id: 'u1', name: 'Admin', role: 'admin' };
function estadoBase() {
  return {
    employees: [
      { id: 1, name: 'Ana', status: 'active' },
      { id: 2, name: 'Bruno', status: 'inactive' },
      { id: 3, name: 'Carla', status: 'active' },
      { id: 4, name: 'Davi', status: 'inactive' }
    ],
    assets: [
      { uid: 'NB-1', brand: 'Dell', model: 'X', status: 'available' },
      { uid: 'NB-2', brand: 'HP', model: 'Y', status: 'assigned' },
      { uid: 'MS-1', brand: 'Logi', model: 'M', status: 'available' }
    ],
    allocations: [{ id: 'al1', employee_id: 2, asset_uid: 'NB-2', status: 'active', date: '2026-01-01T00:00:00Z' }],
    history: []
  };
}

test('colaborador inativo não pode receber alocação', () => {
  const e = estadoBase();
  assert.equal(validarAlocacao(e.employees[1], e.assets[0]).ok, false);
  assert.throws(() => alocar(e, { assetUid: 'NB-1', employeeId: 2, responsavel: resp }), /inativo/);
});

test('ativo indisponível não pode ser alocado', () => {
  const e = estadoBase();
  assert.throws(() => alocar(e, { assetUid: 'NB-2', employeeId: 1, responsavel: resp }), /não está disponível/);
});

test('alocação grava movimento e histórico juntos, sem alterar o estado original', () => {
  const e = estadoBase();
  const r = alocar(e, { assetUid: 'NB-1', employeeId: 1, responsavel: resp, estado: 'bom' });
  assert.equal(r.assets.find(a => a.uid === 'NB-1').status, 'assigned');
  assert.equal(r.history.length, 1);
  assert.equal(r.history[0].tipo_movimentacao, 'ALOCACAO');
  assert.equal(r.history[0].colaborador_id, 1);
  assert.equal(r.history[0].estado, 'bom');
  assert.equal(r.history[0].usuario_responsavel_id, 'u1');
  assert.equal(e.assets[0].status, 'available');
  assert.equal(e.history.length, 0);
});

test('devolução libera o ativo e registra DEVOLUCAO; avariado vai para manutenção', () => {
  const e = estadoBase();
  const ok = devolver(e, { alocacaoId: 'al1', responsavel: resp });
  assert.equal(ok.assets.find(a => a.uid === 'NB-2').status, 'available');
  // al1 é uma alocação legada (sem historico_registrado) — devolver() precisa
  // materializar o evento de ALOCACAO original antes do de DEVOLUCAO, senão
  // ele some do histórico assim que o flag abaixo for marcado (achado da
  // revisão do PR #48).
  assert.deepEqual(ok.history.map(h => h.tipo_movimentacao), ['ALOCACAO', 'DEVOLUCAO']);
  assert.equal(ok.history[0].created_at, e.allocations[0].date);
  assert.equal(ok.allocations[0].status, 'inactive');
  assert.equal(ok.allocations[0].historico_registrado, true);
  const avar = devolver(e, { alocacaoId: 'al1', estado: 'avariado', responsavel: resp });
  assert.equal(avar.assets.find(a => a.uid === 'NB-2').status, 'maintenance');
});

test('devolução de alocação já registrada (não-legada) não duplica o evento de ALOCACAO', () => {
  const e = estadoBase();
  e.allocations[0].historico_registrado = true; // já passou pelo serviço de movimentação
  const r = devolver(e, { alocacaoId: 'al1', responsavel: resp });
  assert.deepEqual(r.history.map(h => h.tipo_movimentacao), ['DEVOLUCAO']);
});

test('realocação gera DEVOLUCAO + ALOCACAO e o inativo sai da lista', () => {
  const e = estadoBase();
  // al1 é legada: a 1ª ALOCACAO abaixo é o backfill do evento original (ver
  // teste de devolução); a realocação em si continua gerando exatamente
  // DEVOLUCAO + ALOCACAO.
  const r = realocar(e, { alocacaoId: 'al1', novoEmployeeId: 3, responsavel: resp });
  assert.deepEqual(r.history.map(h => h.tipo_movimentacao), ['ALOCACAO', 'DEVOLUCAO', 'ALOCACAO']);
  assert.equal(r.assets.find(a => a.uid === 'NB-2').status, 'assigned');
  const lista = colaboradoresNaListaDeAlocacao(e.employees, r.allocations);
  assert.equal(lista.some(l => l.employee.id === 2), false);
});

test('realocação para colaborador inativo é recusada', () => {
  const e = estadoBase();
  assert.throws(() => realocar(e, { alocacaoId: 'al1', novoEmployeeId: 4, responsavel: resp }), /inativo/);
});

test('lista de alocação: inativo com ativos aparece (com pendência); sem ativos some', () => {
  const e = estadoBase();
  const lista = colaboradoresNaListaDeAlocacao(e.employees, e.allocations);
  const ids = lista.map(l => l.employee.id);
  assert.deepEqual(ids, [1, 2, 3]);
  const bruno = lista.find(l => l.employee.id === 2);
  assert.equal(bruno.inativo, true);
  assert.equal(bruno.pendentes.length, 1);
});

test('devolução encerra a pendência do inativo', () => {
  const e = estadoBase();
  const r = devolver(e, { alocacaoId: 'al1', responsavel: resp });
  const lista = colaboradoresNaListaDeAlocacao(e.employees, r.allocations);
  assert.equal(lista.some(l => l.employee.id === 2), false);
});

test('inativação com ativos gera um único registro INATIVACAO (idempotente)', () => {
  const e = estadoBase();
  let pend = inativacoesPendentesDeRegistro(e.employees, e.allocations, e.history);
  assert.equal(pend.length, 1);
  const r = registrarInativacao(e, { employee: pend[0].employee, alocacao: pend[0].alocacao, responsavel: resp });
  assert.equal(r.history[0].tipo_movimentacao, 'INATIVACAO');
  pend = inativacoesPendentesDeRegistro(e.employees, e.allocations, r.history);
  assert.equal(pend.length, 0);
});

test('colaborador inativo sem ativos não gera registro de inativação', () => {
  const e = estadoBase();
  const pend = inativacoesPendentesDeRegistro(e.employees, e.allocations, e.history);
  assert.equal(pend.some(p => p.employee.id === 4), false);
});

test('aplicarAtomicamente reverte tudo se uma gravação falhar', () => {
  const dados = { a: 1, b: 2, c: 3 };
  const store = {
    get: k => dados[k],
    set: (k, v) => { if (k === 'c') throw new Error('falha'); dados[k] = v; }
  };
  assert.throws(() => aplicarAtomicamente(store, [
    { chave: 'a', valor: 10 }, { chave: 'b', valor: 20 }, { chave: 'c', valor: 30 }
  ]), /falha/);
  assert.deepEqual(dados, { a: 1, b: 2, c: 3 });
});

test('registro de histórico exige tipo válido e ativo', () => {
  assert.throws(() => criarRegistroHistorico({ tipoMovimentacao: 'X', asset: {} }), /inválido/);
  assert.throws(() => criarRegistroHistorico({ tipoMovimentacao: 'ALOCACAO' }), /sem ativo/);
});

test('revalidarAlocacoesTermo: item já vinculado e ativo (reenvio de termo ainda enviado) não é tocado', () => {
  const e = estadoBase();
  e.allocations.push({ id: 'alT', employee_id: 1, asset_uid: 'NB-1', status: 'active', termo_id: 'T1', historico_registrado: true });
  e.assets.find(a => a.uid === 'NB-1').status = 'assigned';
  const termo = { id: 'T1', colaborador_id: 1, itens: [{ asset_uid: 'NB-1', estado: 'bom' }] };
  const r = revalidarAlocacoesTermo(e, termo, resp);
  assert.deepEqual(r.allocations, e.allocations);
  assert.equal(r.history.length, 0);
});

test('revalidarAlocacoesTermo: alocação do termo foi revertida na expiração (ativo voltou a available) e é recriada', () => {
  const e = estadoBase();
  const termo = { id: 'T1', colaborador_id: 1, itens: [{ asset_uid: 'NB-1', estado: 'bom', observacao: '' }] };
  const r = revalidarAlocacoesTermo(e, termo, resp);
  const nova = r.allocations.find(a => a.asset_uid === 'NB-1' && a.status === 'active');
  assert.ok(nova, 'deveria recriar a alocação');
  assert.equal(nova.termo_id, 'T1');
  assert.equal(nova.termo_status, 'pendente');
  assert.equal(r.assets.find(a => a.uid === 'NB-1').status, 'assigned');
  assert.equal(r.history.length, 1);
  assert.equal(r.history[0].tipo_movimentacao, 'ALOCACAO');
});

test('revalidarAlocacoesTermo: ativo foi realocado a outra pessoa desde a expiração — recusa reenvio', () => {
  const e = estadoBase();
  e.allocations.push({ id: 'alOutro', employee_id: 3, asset_uid: 'NB-1', status: 'active', historico_registrado: true });
  e.assets.find(a => a.uid === 'NB-1').status = 'assigned';
  const termo = { id: 'T1', colaborador_id: 1, itens: [{ asset_uid: 'NB-1', estado: 'bom' }] };
  assert.throws(() => revalidarAlocacoesTermo(e, termo, resp), /não está mais disponível/);
});

test('revalidarAlocacoesTermo: vinculação retroativa desfeita na expiração é relinkada ao termo', () => {
  const e = estadoBase();
  // al1 já está com o colaborador 2 (sem termo) — simula posse retroativa cujo vínculo foi removido na expiração.
  const termo = { id: 'T1', colaborador_id: 2, itens: [{ asset_uid: 'NB-2', estado: 'bom' }] };
  const r = revalidarAlocacoesTermo(e, termo, resp);
  const al = r.allocations.find(a => a.id === 'al1');
  assert.equal(al.termo_id, 'T1');
  assert.equal(al.termo_status, 'pendente');
  assert.equal(al.termo_retroativo, true);
  assert.equal(r.history.length, 0);
});
