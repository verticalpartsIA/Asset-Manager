/**
 * Regras puras dos Termos de responsabilidade (issue #46): limites, ativos
 * disponíveis, máquina de status, expiração, token de assinatura e template.
 * A interface e a página pública de assinatura usam estas mesmas funções.
 */

export const LIMITE_ITENS = 10;
export const LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024;
export const LIMITE_IMAGENS_POR_TERMO = 20;
export const FORMATOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
export const VALIDADE_PADRAO_DIAS = 7;

export const STATUS_TERMO = {
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  ASSINADO: 'assinado',
  EXPIRADO: 'expirado',
  CANCELADO: 'cancelado'
};

export const ESTADOS_ITEM = ['novo', 'bom', 'usado', 'avariado'];

const TRANSICOES = {
  rascunho: ['enviado', 'cancelado'],
  enviado: ['enviado', 'assinado', 'expirado', 'cancelado'], // enviado→enviado = reenvio
  assinado: [],
  expirado: ['enviado', 'cancelado'], // reenviar gera novo link
  cancelado: []
};

export function podeTransicionar(de, para) {
  return (TRANSICOES[de] || []).indexOf(para) !== -1;
}

/** 1 a 10 itens, sem repetição, com estado válido. */
export function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return { ok: false, erro: 'Selecione ao menos 1 equipamento.' };
  if (itens.length > LIMITE_ITENS) return { ok: false, erro: 'Um termo aceita no máximo ' + LIMITE_ITENS + ' equipamentos.' };
  const vistos = {};
  for (const item of itens) {
    if (vistos[item.asset_uid]) return { ok: false, erro: 'Equipamento ' + item.asset_uid + ' repetido no termo.' };
    vistos[item.asset_uid] = true;
    if (ESTADOS_ITEM.indexOf(item.estado) === -1) return { ok: false, erro: 'Informe o estado do equipamento ' + item.asset_uid + '.' };
  }
  return { ok: true };
}

/** Só ativos 'available' e sem alocação ativa nem termo em aberto. */
export function ativosDisponiveisParaTermo(assets, allocations, termos) {
  const alocados = {};
  (allocations || []).forEach(function (al) { if (al.status === 'active') alocados[al.asset_uid] = true; });
  const emTermo = {};
  (termos || []).forEach(function (t) {
    if (t.status === STATUS_TERMO.RASCUNHO || t.status === STATUS_TERMO.ENVIADO) {
      (t.itens || []).forEach(function (i) { emTermo[i.asset_uid] = true; });
    }
  });
  return (assets || []).filter(function (a) { return a.status === 'available' && !alocados[a.uid] && !emTermo[a.uid]; });
}

export function validarImagem(arquivo, totalAtual) {
  if (FORMATOS_IMAGEM.indexOf(arquivo.type) === -1) return { ok: false, erro: 'Formato não aceito (use JPG, PNG ou WEBP).' };
  if (arquivo.size > LIMITE_IMAGEM_BYTES) return { ok: false, erro: 'Imagem acima de 5 MB.' };
  if ((totalAtual || 0) >= LIMITE_IMAGENS_POR_TERMO) return { ok: false, erro: 'Máximo de ' + LIMITE_IMAGENS_POR_TERMO + ' imagens por termo.' };
  return { ok: true };
}

export function calcularExpiracao(agora, dias) {
  const base = agora instanceof Date ? agora : new Date(agora);
  return new Date(base.getTime() + (dias || VALIDADE_PADRAO_DIAS) * 86400000).toISOString();
}

export function estaExpirado(expiraEm, agora) {
  return new Date(expiraEm).getTime() <= (agora instanceof Date ? agora.getTime() : (agora == null ? Date.now() : agora));
}

/** Token aleatório criptograficamente seguro (hex, 256 bits). */
export function gerarToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/** Só o hash é armazenado; o token em claro vai apenas no link enviado. */
export async function hashToken(token) {
  const dados = new TextEncoder().encode(token);
  const h = await globalThis.crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function escaparHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Substitui {{campo}} no texto do modelo; campos desconhecidos viram vazio. Escapa HTML. */
export function renderizarTemplate(conteudo, vars) {
  return String(conteudo || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, function (_, k) {
    return escaparHtml(vars && vars[k] != null ? vars[k] : '');
  });
}

export function listaEquipamentosTexto(itens, descricoes) {
  return (itens || []).map(function (i, n) {
    const d = descricoes && descricoes[i.asset_uid] ? descricoes[i.asset_uid] : '';
    return (n + 1) + '. ' + i.asset_uid + (d ? ' - ' + d : '') + ' — estado: ' + i.estado + (i.observacao ? ' (' + i.observacao + ')' : '');
  }).join('\n');
}

export const TEMPLATE_PADRAO = {
  versao: 1,
  conteudo:
    'TERMO DE RESPONSABILIDADE PELO USO DE EQUIPAMENTOS\n\n' +
    'Eu, {{colaborador_nome}}, documento {{colaborador_documento}}, cargo {{colaborador_cargo}}, declaro ter recebido da VerticalParts, em {{data}}, os equipamentos abaixo relacionados, nas condições descritas:\n\n' +
    '{{equipamentos}}\n\n' +
    'Comprometo-me a: (i) utilizá-los exclusivamente para fins profissionais; (ii) zelar por sua conservação; (iii) comunicar imediatamente ao setor de TI qualquer defeito, perda, furto ou roubo; e (iv) devolvê-los quando solicitado ou ao término do vínculo, nas mesmas condições, ressalvado o desgaste natural.\n\n' +
    'Estou ciente de que danos causados por mau uso, negligência ou dolo poderão ser apurados na forma da lei e das políticas internas da empresa.'
};

/** Link de WhatsApp com mensagem pré-preenchida (solução inicial, sem provedor). */
export function linkWhatsapp(telefone, mensagem) {
  let num = String(telefone || '').replace(/\D/g, '');
  if (!num) return null;
  if (num.length <= 11) num = '55' + num;
  return 'https://wa.me/' + num + '?text=' + encodeURIComponent(mensagem);
}

export function mensagemEnvio(nome, link, expiraEm) {
  return 'Olá, ' + nome + '! Segue o link para leitura e assinatura do seu Termo de Responsabilidade de equipamentos (VerticalParts): ' +
    link + ' — válido até ' + new Date(expiraEm).toLocaleDateString('pt-BR') + '.';
}

if (typeof window !== 'undefined') {
  window.TermosDomain = {
    LIMITE_ITENS: LIMITE_ITENS, STATUS_TERMO: STATUS_TERMO, ESTADOS_ITEM: ESTADOS_ITEM, VALIDADE_PADRAO_DIAS: VALIDADE_PADRAO_DIAS,
    TEMPLATE_PADRAO: TEMPLATE_PADRAO, podeTransicionar: podeTransicionar, validarItens: validarItens,
    ativosDisponiveisParaTermo: ativosDisponiveisParaTermo, validarImagem: validarImagem,
    calcularExpiracao: calcularExpiracao, estaExpirado: estaExpirado, gerarToken: gerarToken, hashToken: hashToken,
    renderizarTemplate: renderizarTemplate, listaEquipamentosTexto: listaEquipamentosTexto,
    linkWhatsapp: linkWhatsapp, mensagemEnvio: mensagemEnvio
  };
}
