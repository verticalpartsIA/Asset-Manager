/**
 * Regras puras de geração/reaproveitamento de UID de ativos (issue #40).
 * Extraído de public/index.html (funções gerarNumeroSequencial e
 * liberarUidPorExclusao) como primeiro passo do épico #15 (A5 — testabilidade):
 * nenhuma dessas funções toca localStorage/Supabase, então podem ser testadas
 * isoladamente com `node --test`. index.html continua responsável por ler o
 * estado atual, chamar estas funções, e persistir o resultado (getData/saveData).
 */

export function formatarUid(numero) {
  return String(numero).padStart(3, '0');
}

/**
 * Tenta reaproveitar o menor UID liberado por uma exclusão definitiva
 * (nunca por inativação — ver issue #40).
 * @returns {{numero: number, liberados: object} | null} null se não há UID liberado para o tipo.
 */
export function reaproveitarUidLiberado(liberadosPorTipo, tipo) {
  const atuais = (liberadosPorTipo && Array.isArray(liberadosPorTipo[tipo])) ? liberadosPorTipo[tipo] : [];
  if (atuais.length === 0) return null;
  const ordenados = atuais.slice().sort(function (a, b) { return a - b; });
  const numero = ordenados[0];
  const restantes = ordenados.slice(1);
  const liberados = Object.assign({}, liberadosPorTipo, { [tipo]: restantes });
  return { numero: numero, liberados: liberados };
}

/**
 * Gera o próximo número sequencial (quando não há UID liberado a reaproveitar).
 */
export function proximoSequencial(sequenciaPorTipo, tipo) {
  const atual = (sequenciaPorTipo && sequenciaPorTipo[tipo]) || 0;
  const numero = atual + 1;
  const sequencia = Object.assign({}, sequenciaPorTipo, { [tipo]: numero });
  return { numero: numero, sequencia: sequencia };
}

/**
 * Extrai o número sequencial de um UID no formato VP-{TIPO}-{ANO}-{NNN}.
 * @returns {number|null}
 */
export function extrairNumeroDoUid(uid) {
  const partes = String(uid || '').split('-');
  const numeroStr = partes[partes.length - 1];
  const numero = parseInt(numeroStr, 10);
  return isNaN(numero) ? null : numero;
}

/**
 * Marca o UID de um ativo excluído definitivamente como disponível para reuso.
 * Idempotente: liberar o mesmo UID duas vezes não duplica a entrada.
 */
export function liberarUid(liberadosPorTipo, uid, tipo) {
  const numero = extrairNumeroDoUid(uid);
  if (!tipo || numero === null) return liberadosPorTipo || {};
  const atuais = (liberadosPorTipo && Array.isArray(liberadosPorTipo[tipo])) ? liberadosPorTipo[tipo] : [];
  if (atuais.indexOf(numero) !== -1) return liberadosPorTipo;
  return Object.assign({}, liberadosPorTipo, { [tipo]: atuais.concat([numero]) });
}

if (typeof window !== 'undefined') {
  window.UidDomain = {
    formatarUid: formatarUid,
    reaproveitarUidLiberado: reaproveitarUidLiberado,
    proximoSequencial: proximoSequencial,
    extrairNumeroDoUid: extrairNumeroDoUid,
    liberarUid: liberarUid
  };
}
