import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarSla, SLA_PROXIMO_HORAS } from '../../public/js/domain/sla.js';

const AGORA = new Date('2026-09-14T12:00:00Z').getTime();

test('chamado resolvido é sempre "concluido", mesmo com prazo já vencido', () => {
  const resultado = classificarSla('resolvido', '2026-09-14T10:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'concluido');
  assert.equal(resultado.horasRestantes, null);
});

test('chamado fechado é sempre "concluido"', () => {
  const resultado = classificarSla('fechado', '2026-09-20T00:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'concluido');
});

test('prazo no passado é "expirado", com horas restantes negativas', () => {
  const resultado = classificarSla('aberto', '2026-09-14T10:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'expirado');
  assert.equal(resultado.horasRestantes, -2);
});

test('prazo exatamente agora é "expirado" (limite inclusivo)', () => {
  const resultado = classificarSla('aberto', '2026-09-14T12:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'expirado');
  assert.equal(resultado.horasRestantes, 0);
});

test('dentro do limiar de SLA_PROXIMO_HORAS é "proximo"', () => {
  const resultado = classificarSla('aberto', '2026-09-14T15:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'proximo');
  assert.equal(resultado.horasRestantes, 3);
});

test('exatamente no limiar (4h) ainda é "proximo" (limite inclusivo)', () => {
  const resultado = classificarSla('aberto', '2026-09-14T16:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'proximo');
  assert.equal(resultado.horasRestantes, SLA_PROXIMO_HORAS);
});

test('acima do limiar é "ok"', () => {
  const resultado = classificarSla('aberto', '2026-09-14T20:00:00Z', AGORA);
  assert.equal(resultado.situacao, 'ok');
  assert.equal(resultado.horasRestantes, 8);
});

test('aceita Date além de string ISO para slaDueAt e agora', () => {
  const resultado = classificarSla('aberto', new Date('2026-09-14T14:00:00Z'), new Date(AGORA));
  assert.equal(resultado.situacao, 'proximo');
  assert.equal(resultado.horasRestantes, 2);
});
