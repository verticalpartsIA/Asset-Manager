import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarUid,
  reaproveitarUidLiberado,
  proximoSequencial,
  extrairNumeroDoUid,
  liberarUid
} from '../../public/js/domain/uid.js';

test('formatarUid preenche com zeros à esquerda até 3 dígitos', () => {
  assert.equal(formatarUid(1), '001');
  assert.equal(formatarUid(42), '042');
  assert.equal(formatarUid(1000), '1000');
});

test('reaproveitarUidLiberado retorna null quando não há UID liberado', () => {
  assert.equal(reaproveitarUidLiberado({}, 'NB'), null);
  assert.equal(reaproveitarUidLiberado({ NB: [] }, 'NB'), null);
});

test('reaproveitarUidLiberado prioriza o menor número e remove só ele da lista', () => {
  const resultado = reaproveitarUidLiberado({ NB: [3, 1, 2] }, 'NB');
  assert.equal(resultado.numero, 1);
  assert.deepEqual(resultado.liberados, { NB: [2, 3] });
});

test('reaproveitarUidLiberado não muda o objeto original (imutável)', () => {
  const original = { NB: [5, 2] };
  reaproveitarUidLiberado(original, 'NB');
  assert.deepEqual(original, { NB: [5, 2] });
});

test('proximoSequencial começa em 1 quando o tipo ainda não tem sequência', () => {
  const resultado = proximoSequencial({}, 'CL');
  assert.equal(resultado.numero, 1);
  assert.deepEqual(resultado.sequencia, { CL: 1 });
});

test('proximoSequencial incrementa a partir do valor atual', () => {
  const resultado = proximoSequencial({ CL: 7 }, 'CL');
  assert.equal(resultado.numero, 8);
  assert.deepEqual(resultado.sequencia, { CL: 8 });
});

test('extrairNumeroDoUid lê o último segmento do UID', () => {
  assert.equal(extrairNumeroDoUid('VP-NB-2026-007'), 7);
  assert.equal(extrairNumeroDoUid('VP-CL-2026-042'), 42);
});

test('extrairNumeroDoUid retorna null para UID inválido', () => {
  assert.equal(extrairNumeroDoUid(''), null);
  assert.equal(extrairNumeroDoUid(undefined), null);
  assert.equal(extrairNumeroDoUid('VP-NB-2026-ABC'), null);
});

test('liberarUid adiciona o número extraído do UID à lista do tipo', () => {
  const resultado = liberarUid({}, 'VP-NB-2026-003', 'NB');
  assert.deepEqual(resultado, { NB: [3] });
});

test('liberarUid é idempotente — não duplica o mesmo número', () => {
  const primeira = liberarUid({}, 'VP-NB-2026-003', 'NB');
  const segunda = liberarUid(primeira, 'VP-NB-2026-003', 'NB');
  assert.deepEqual(segunda, { NB: [3] });
});

test('liberarUid ignora UID sem número válido', () => {
  assert.deepEqual(liberarUid({}, 'sem-numero', 'NB'), {});
});

test('cenário completo: excluir 3 ativos e cadastrar reaproveita o menor UID primeiro', () => {
  let liberados = {};
  liberados = liberarUid(liberados, 'VP-NB-2026-001', 'NB');
  liberados = liberarUid(liberados, 'VP-NB-2026-002', 'NB');
  liberados = liberarUid(liberados, 'VP-NB-2026-003', 'NB');

  const reaproveitado1 = reaproveitarUidLiberado(liberados, 'NB');
  assert.equal(reaproveitado1.numero, 1);
  liberados = reaproveitado1.liberados;

  const reaproveitado2 = reaproveitarUidLiberado(liberados, 'NB');
  assert.equal(reaproveitado2.numero, 2);
});
