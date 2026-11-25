const TRANSICIONES = {
  en_lista_espera: ['solicitada', 'cancelada'],
  solicitada: ['confirmada', 'cancelada'],
  confirmada: ['atendida', 'no_asistio', 'cancelada'],
  atendida: [],
  no_asistio: [],
  cancelada: []
};

const puedeTransitar = (de, a) => (TRANSICIONES[de] || []).includes(a);

module.exports = { TRANSICIONES, puedeTransitar };