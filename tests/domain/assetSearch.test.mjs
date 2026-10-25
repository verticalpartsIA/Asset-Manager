import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarTermoBusca,
  ativoCorrespondeABusca,
  filtrarAtivosPorBusca
} from '../../public/js/domain/assetSearch.js';

test('normalizarTermoBusca remove espaços nas pontas e deixa minúsculo', () => {
  assert.equal(normalizarTermoBusca('  VP-NB  '), 'vp-nb');
  assert.equal(normalizarTermoBusca(undefined), '');
  assert.equal(normalizarTermoBusca(null), '');
});

test('ativoCorrespondeABusca retorna true para termo vazio (sem filtro)', () => {
  assert.equal(ativoCorrespondeABusca({ uid: 'VP-NB-2026-001' }, ''), true);
});

test('ativoCorrespondeABusca encontra por substring no UID', () => {
  const asset = { uid: 'VP-NB-2026-00057', serial: 'XYZ', imei: null };
  assert.equal(ativoCorrespondeABusca(asset, '0005'), true);
  assert.equal(ativoCorrespondeABusca(asset, '999'), false);
});

test('ativoCorrespondeABusca encontra por substring no serial', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'SN-ABC-123', imei: null };
  assert.equal(ativoCorrespondeABusca(asset, 'abc'), true);
});

test('ativoCorrespondeABusca encontra por substring no IMEI', () => {
  const asset = { uid: 'VP-CL-2026-001', serial: 'SN-1', imei: '356938035643809' };
  assert.equal(ativoCorrespondeABusca(asset, '3809'), true);
});

test('ativoCorrespondeABusca não diferencia maiúsculas de minúsculas', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'AbC-123', imei: null };
  assert.equal(ativoCorrespondeABusca(asset, 'abc'), true);
  assert.equal(ativoCorrespondeABusca(asset, normalizarTermoBusca('ABC')), true);
});

test('ativoCorrespondeABusca retorna false quando nenhum campo bate', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'SN-1', imei: null };
  assert.equal(ativoCorrespondeABusca(asset, 'zzz'), false);
});

test('ativoCorrespondeABusca lida com campos ausentes sem lançar erro', () => {
  assert.equal(ativoCorrespondeABusca({}, 'algo'), false);
  assert.equal(ativoCorrespondeABusca(null, 'algo'), false);
});

test('filtrarAtivosPorBusca retorna a lista original quando o termo é vazio', () => {
  const items = [{ uid: 'A' }, { uid: 'B' }];
  assert.deepEqual(filtrarAtivosPorBusca(items, '', (x) => x), items);
  assert.deepEqual(filtrarAtivosPorBusca(items, '   ', (x) => x), items);
});

test('filtrarAtivosPorBusca filtra usando o extrator getAsset', () => {
  const items = [
    { asset: { uid: 'VP-NB-2026-001', serial: 'SN-1' }, allocation: null },
    { asset: { uid: 'VP-CL-2026-002', serial: 'SN-2' }, allocation: null }
  ];
  const resultado = filtrarAtivosPorBusca(items, 'cl-2026', function (item) { return item.asset; });
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].asset.uid, 'VP-CL-2026-002');
});

test('filtrarAtivosPorBusca sem getAsset trata os itens como o próprio ativo', () => {
  const items = [{ uid: 'VP-NB-2026-001' }, { uid: 'VP-CL-2026-002' }];
  const resultado = filtrarAtivosPorBusca(items, 'nb');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].uid, 'VP-NB-2026-001');
});

test('ativoCorrespondeABusca encontra por nome do responsável (holder)', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'SN-1', imei: null };
  const holder = { employeeName: 'Fernanda Freires', employeeDepartment: 'FINANCEIRO' };
  assert.equal(ativoCorrespondeABusca(asset, 'fernanda', holder), true);
});

test('ativoCorrespondeABusca encontra por departamento do responsável (holder)', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'SN-1', imei: null };
  const holder = { employeeName: 'Fernanda Freires', employeeDepartment: 'FINANCEIRO' };
  assert.equal(ativoCorrespondeABusca(asset, 'financeiro', holder), true);
});

test('ativoCorrespondeABusca com holder null não gera falso positivo nem erro', () => {
  const asset = { uid: 'VP-NB-2026-001', serial: 'SN-1', imei: null };
  assert.equal(ativoCorrespondeABusca(asset, 'financeiro', null), false);
  assert.equal(ativoCorrespondeABusca(asset, 'fernanda', undefined), false);
});

test('filtrarAtivosPorBusca filtra usando o extrator getHolder (nome e departamento)', () => {
  const items = [
    { asset: { uid: 'VP-NB-2026-001' }, holder: { employeeName: 'Fernanda Freires', employeeDepartment: 'FINANCEIRO' } },
    { asset: { uid: 'VP-CL-2026-002' }, holder: { employeeName: 'Giovanna Maeno', employeeDepartment: 'TI' } },
    { asset: { uid: 'VP-NB-2026-003' }, holder: null }
  ];
  const porNome = filtrarAtivosPorBusca(items, 'giovanna', (i) => i.asset, (i) => i.holder);
  assert.equal(porNome.length, 1);
  assert.equal(porNome[0].asset.uid, 'VP-CL-2026-002');

  const porDepartamento = filtrarAtivosPorBusca(items, 'financeiro', (i) => i.asset, (i) => i.holder);
  assert.equal(porDepartamento.length, 1);
  assert.equal(porDepartamento[0].asset.uid, 'VP-NB-2026-001');
});

test('filtrarAtivosPorBusca sem getHolder ignora nome/departamento (retrocompatível)', () => {
  const items = [
    { asset: { uid: 'VP-NB-2026-001' }, holder: { employeeName: 'Fernanda Freires', employeeDepartment: 'FINANCEIRO' } }
  ];
  const resultado = filtrarAtivosPorBusca(items, 'fernanda', (i) => i.asset);
  assert.equal(resultado.length, 0);
});
