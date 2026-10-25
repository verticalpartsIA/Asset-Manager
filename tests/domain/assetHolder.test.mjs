import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCurrentHolder } from '../../public/js/domain/assetHolder.js';

test('resolveCurrentHolder retorna null quando não há alocação ativa para o ativo', () => {
  const allocations = [{ asset_uid: 'VP-NB-2026-001', employee_id: 1, status: 'returned' }];
  const employees = [{ id: 1, name: 'Fernanda Freires' }];
  assert.equal(resolveCurrentHolder('VP-NB-2026-001', allocations, employees), null);
});

test('resolveCurrentHolder retorna null quando a alocação ativa não tem colaborador correspondente', () => {
  const allocations = [{ asset_uid: 'VP-NB-2026-001', employee_id: 99, status: 'active' }];
  const employees = [{ id: 1, name: 'Fernanda Freires' }];
  assert.equal(resolveCurrentHolder('VP-NB-2026-001', allocations, employees), null);
});

test('resolveCurrentHolder retorna o colaborador (com departamento) quando há alocação ativa correspondente', () => {
  const allocations = [{ asset_uid: 'VP-NB-2026-001', employee_id: 1, status: 'active' }];
  const employees = [{ id: 1, name: 'Fernanda Freires', depto: 'FINANCEIRO' }];
  assert.deepEqual(resolveCurrentHolder('VP-NB-2026-001', allocations, employees), {
    employeeId: 1,
    employeeName: 'Fernanda Freires',
    employeeDepartment: 'FINANCEIRO'
  });
});

test('resolveCurrentHolder usa apenas a alocação ativa quando há uma inativa e uma ativa para o mesmo ativo', () => {
  const allocations = [
    { asset_uid: 'VP-NB-2026-001', employee_id: 1, status: 'returned' },
    { asset_uid: 'VP-NB-2026-001', employee_id: 2, status: 'active' }
  ];
  const employees = [
    { id: 1, name: 'Fernanda Freires', depto: 'FINANCEIRO' },
    { id: 2, name: 'Giovanna Maeno', depto: 'TI' }
  ];
  assert.deepEqual(resolveCurrentHolder('VP-NB-2026-001', allocations, employees), {
    employeeId: 2,
    employeeName: 'Giovanna Maeno',
    employeeDepartment: 'TI'
  });
});

test('resolveCurrentHolder compara employee_id/id com tolerância a tipo (string vs number)', () => {
  const allocations = [{ asset_uid: 'VP-NB-2026-001', employee_id: '1', status: 'active' }];
  const employees = [{ id: 1, name: 'Fernanda Freires', depto: 'FINANCEIRO' }];
  assert.deepEqual(resolveCurrentHolder('VP-NB-2026-001', allocations, employees), {
    employeeId: 1,
    employeeName: 'Fernanda Freires',
    employeeDepartment: 'FINANCEIRO'
  });
});

test('resolveCurrentHolder lida com listas vazias ou ausentes sem lançar erro', () => {
  assert.equal(resolveCurrentHolder('VP-NB-2026-001', [], []), null);
  assert.equal(resolveCurrentHolder('VP-NB-2026-001', undefined, undefined), null);
});
