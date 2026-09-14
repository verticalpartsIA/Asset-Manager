/**
 * Classificação de SLA de chamados (issue #13 — testabilidade).
 * Extraído de public/index.html (getSlaIndicator e checkSLAAlerts, que
 * duplicavam o mesmo cálculo/limiar de "próximo do vencimento"). Função pura:
 * recebe status/prazo/agora, devolve a classificação — quem chama decide o
 * que renderizar ou notificar.
 */

// Abaixo deste número de horas restantes o chamado é considerado "próximo
// do vencimento" (mesmo limiar usado nos dois lugares antes da extração).
export const SLA_PROXIMO_HORAS = 4;

const STATUS_CONCLUIDO = ['resolvido', 'fechado'];

/**
 * @param {string} status status atual do chamado (ex: 'aberto', 'resolvido')
 * @param {string|Date} slaDueAt data-limite do SLA (ISO string ou Date)
 * @param {number|Date} agora instante de referência (Date.now() ou Date) — parâmetro
 *   explícito em vez de ler o relógio internamente, para o cálculo ficar determinístico em teste.
 * @returns {{situacao: 'concluido'|'expirado'|'proximo'|'ok', horasRestantes: number}}
 *   horasRestantes pode ser negativo (chamado vencido) e não é arredondado — quem
 *   exibe decide a precisão (Math.round/Math.max conforme o contexto).
 */
export function classificarSla(status, slaDueAt, agora) {
  if (STATUS_CONCLUIDO.indexOf(status) !== -1) {
    return { situacao: 'concluido', horasRestantes: null };
  }
  const dueMs = (slaDueAt instanceof Date ? slaDueAt : new Date(slaDueAt)).getTime();
  const agoraMs = agora instanceof Date ? agora.getTime() : agora;
  const horasRestantes = (dueMs - agoraMs) / (1000 * 60 * 60);
  if (horasRestantes <= 0) return { situacao: 'expirado', horasRestantes: horasRestantes };
  if (horasRestantes <= SLA_PROXIMO_HORAS) return { situacao: 'proximo', horasRestantes: horasRestantes };
  return { situacao: 'ok', horasRestantes: horasRestantes };
}

if (typeof window !== 'undefined') {
  window.SlaDomain = { SLA_PROXIMO_HORAS: SLA_PROXIMO_HORAS, classificarSla: classificarSla };
}
