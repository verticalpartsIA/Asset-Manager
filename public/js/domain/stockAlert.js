/**
 * Regras puras de detecção de cruzamento de nível de estoque e montagem do
 * texto do alerta por e-mail (specs/002-alertas-estoque-baixo-email).
 * Nenhuma dessas funções toca localStorage/Supabase/DOM — recebem dados
 * como parâmetro e devolvem resultado, testáveis isoladamente com
 * `node --test` (ver uid.js/sla.js).
 */

const NIVEL_SEVERIDADE = { 'Disponível': 0, 'Baixo': 1, 'Esgotado': 2 };

export function cruzouNivelCritico(statusAnterior, statusNovo) {
  const severidadeAnterior = Object.prototype.hasOwnProperty.call(NIVEL_SEVERIDADE, statusAnterior)
    ? NIVEL_SEVERIDADE[statusAnterior] : 0; // sem status anterior (item novo) = parte de "Disponível"
  const severidadeNova = Object.prototype.hasOwnProperty.call(NIVEL_SEVERIDADE, statusNovo)
    ? NIVEL_SEVERIDADE[statusNovo] : 0;
  return severidadeNova >= 1 && severidadeNova > severidadeAnterior;
}

export function montarAlertaEstoqueEmail(item) {
  const nome = (item.type === 'pelicula' ? 'Película' : 'Tinta') + ' ' + item.model + ' (' + item.specifics + ')';
  const corpo = item.status === 'Esgotado'
    ? nome + ' está esgotada no estoque.'
    : nome + ' com apenas ' + item.quantity + ' unidade(s) restante(s).';
  const assunto = 'Alerta de Estoque: ' + nome + ' — ' + item.status;
  return { subject: assunto, body: corpo };
}

if (typeof window !== 'undefined') {
  window.StockAlertDomain = {
    cruzouNivelCritico: cruzouNivelCritico,
    montarAlertaEstoqueEmail: montarAlertaEstoqueEmail
  };
}
