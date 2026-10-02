import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarItens, ativosDisponiveisParaTermo, podeTransicionar, estaExpirado, calcularExpiracao,
  gerarToken, hashToken, renderizarTemplate, validarImagem, linkWhatsapp, LIMITE_ITENS
} from '../../public/js/domain/termos.js';

const item = n => ({ asset_uid: 'A-' + n, estado: 'bom' });

test('aceita de 1 a 10 itens e bloqueia o 11º', () => {
  assert.equal(validarItens([item(1)]).ok, true);
  assert.equal(validarItens(Array.from({ length: LIMITE_ITENS }, (_, i) => item(i))).ok, true);
  const r = validarItens(Array.from({ length: LIMITE_ITENS + 1 }, (_, i) => item(i)));
  assert.equal(r.ok, false);
  assert.match(r.erro, /no máximo 10/);
});

test('rejeita lista vazia, item repetido e estado inválido', () => {
  assert.equal(validarItens([]).ok, false);
  assert.equal(validarItens([item(1), item(1)]).ok, false);
  assert.equal(validarItens([{ asset_uid: 'A-1', estado: 'quebrado' }]).ok, false);
});

test('só ativos disponíveis, sem alocação e sem termo em aberto', () => {
  const assets = [
    { uid: 'A', status: 'available' }, { uid: 'B', status: 'assigned' },
    { uid: 'C', status: 'available' }, { uid: 'D', status: 'available' }, { uid: 'E', status: 'maintenance' }
  ];
  const allocations = [{ asset_uid: 'C', status: 'active' }, { asset_uid: 'A', status: 'inactive' }];
  const termos = [{ status: 'enviado', itens: [{ asset_uid: 'D' }] }, { status: 'cancelado', itens: [{ asset_uid: 'A' }] }];
  assert.deepEqual(ativosDisponiveisParaTermo(assets, allocations, termos).map(a => a.uid), ['A']);
});

test('transições de status', () => {
  assert.equal(podeTransicionar('rascunho', 'enviado'), true);
  assert.equal(podeTransicionar('enviado', 'assinado'), true);
  assert.equal(podeTransicionar('enviado', 'enviado'), true);
  assert.equal(podeTransicionar('expirado', 'enviado'), true);
  assert.equal(podeTransicionar('assinado', 'cancelado'), false);
  assert.equal(podeTransicionar('cancelado', 'enviado'), false);
});

test('expiração do link', () => {
  const agora = new Date('2026-10-01T12:00:00Z');
  const exp = calcularExpiracao(agora, 7);
  assert.equal(exp, '2026-10-08T12:00:00.000Z');
  assert.equal(estaExpirado(exp, new Date('2026-10-08T11:59:59Z')), false);
  assert.equal(estaExpirado(exp, new Date('2026-10-08T12:00:00Z')), true);
});

test('token é aleatório, longo e o hash é determinístico e diferente do token', async () => {
  const t1 = gerarToken(), t2 = gerarToken();
  assert.equal(t1.length, 64);
  assert.notEqual(t1, t2);
  const h = await hashToken(t1);
  assert.equal(h, await hashToken(t1));
  assert.notEqual(h, t1);
  assert.equal(h.length, 64);
});

test('template substitui campos e escapa HTML', () => {
  const out = renderizarTemplate('Olá {{ nome }}, {{faltando}}!', { nome: '<b>Ana</b>' });
  assert.equal(out, 'Olá &lt;b&gt;Ana&lt;/b&gt;, !');
});

test('validação de imagens', () => {
  assert.equal(validarImagem({ type: 'image/png', size: 1000 }, 0).ok, true);
  assert.equal(validarImagem({ type: 'image/gif', size: 1000 }, 0).ok, false);
  assert.equal(validarImagem({ type: 'image/jpeg', size: 6 * 1024 * 1024 }, 0).ok, false);
  assert.equal(validarImagem({ type: 'image/jpeg', size: 10 }, 20).ok, false);
});

test('link do WhatsApp normaliza telefone brasileiro', () => {
  assert.match(linkWhatsapp('(11) 98888-7777', 'oi'), /^https:\/\/wa\.me\/5511988887777\?text=oi$/);
  assert.equal(linkWhatsapp('', 'oi'), null);
});
