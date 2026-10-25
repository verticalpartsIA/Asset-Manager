import test from 'node:test';
import assert from 'node:assert/strict';
import { cruzouNivelCritico, montarAlertaEstoqueEmail } from '../../public/js/domain/stockAlert.js';

test('cruzouNivelCritico detecta piora de Disponível para Baixo', () => {
  assert.equal(cruzouNivelCritico('Disponível', 'Baixo'), true);
});

test('cruzouNivelCritico detecta piora de Baixo para Esgotado', () => {
  assert.equal(cruzouNivelCritico('Baixo', 'Esgotado'), true);
});

test('cruzouNivelCritico detecta piora direta de Disponível para Esgotado', () => {
  assert.equal(cruzouNivelCritico('Disponível', 'Esgotado'), true);
});

test('cruzouNivelCritico retorna false quando o nível não muda', () => {
  assert.equal(cruzouNivelCritico('Baixo', 'Baixo'), false);
  assert.equal(cruzouNivelCritico('Esgotado', 'Esgotado'), false);
  assert.equal(cruzouNivelCritico('Disponível', 'Disponível'), false);
});

test('cruzouNivelCritico retorna false quando o nível melhora', () => {
  assert.equal(cruzouNivelCritico('Esgotado', 'Baixo'), false);
  assert.equal(cruzouNivelCritico('Esgotado', 'Disponível'), false);
  assert.equal(cruzouNivelCritico('Baixo', 'Disponível'), false);
});

test('cruzouNivelCritico trata item novo (sem status anterior) já crítico como cruzamento', () => {
  assert.equal(cruzouNivelCritico(null, 'Baixo'), true);
  assert.equal(cruzouNivelCritico(undefined, 'Esgotado'), true);
});

test('cruzouNivelCritico não alerta para item novo que já nasce Disponível', () => {
  assert.equal(cruzouNivelCritico(null, 'Disponível'), false);
  assert.equal(cruzouNivelCritico(undefined, 'Disponível'), false);
});

test('montarAlertaEstoqueEmail monta o texto de uma película em Baixo', () => {
  const item = { type: 'pelicula', model: 'Samsung Galaxy A54', specifics: 'Fosca', quantity: 2, status: 'Baixo' };
  const alerta = montarAlertaEstoqueEmail(item);
  assert.equal(alerta.subject, 'Alerta de Estoque: Película Samsung Galaxy A54 (Fosca) — Baixo');
  assert.equal(alerta.body, 'Película Samsung Galaxy A54 (Fosca) com apenas 2 unidade(s) restante(s).');
});

test('montarAlertaEstoqueEmail monta o texto de uma tinta em Esgotado', () => {
  const item = { type: 'tinta', model: 'HP DeskJet', specifics: 'Preta', quantity: 0, status: 'Esgotado' };
  const alerta = montarAlertaEstoqueEmail(item);
  assert.equal(alerta.subject, 'Alerta de Estoque: Tinta HP DeskJet (Preta) — Esgotado');
  assert.equal(alerta.body, 'Tinta HP DeskJet (Preta) está esgotada no estoque.');
});
