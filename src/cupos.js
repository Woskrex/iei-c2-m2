// src/cupos.js - reserva, libera y reparte cupos
const { obtenerDb } = require('./db');

// Reserva un cupo solo si quedan (condición e incremento ocurren juntos, de forma atómica)
async function reservarCupo(operativoId, servicio) {
  const campo = `cupos.${servicio}`;
  const r = await obtenerDb().collection('operativos').updateOne(
    { operativoId, [campo]: { $exists: true }, $expr: { $lt: [`$${campo}.ocupados`, `$${campo}.total`] } },
    { $inc: { [`${campo}.ocupados`]: 1 } });
  return r.modifiedCount === 1;
}

async function liberarCupo(operativoId, servicio) {
  await obtenerDb().collection('operativos').updateOne(
    { operativoId }, { $inc: { [`cupos.${servicio}.ocupados`]: -1 } });
}

// Intenta reservar todos los servicios; si falta alguno, devuelve los ya reservados
async function reservarTodos(operativoId, servicios) {
  const reservados = [];
  for (const s of servicios) {
    if (await reservarCupo(operativoId, s)) reservados.push(s);
    else { for (const r of reservados) await liberarCupo(operativoId, r); return false; }
  }
  return true;
}

// Cuando se libera un cupo, sube a quienes esperan, en orden de llegada (RN-07)
async function ofrecerCupos(operativoId) {
  const col = obtenerDb().collection('inscripciones');
  const espera = await col.find({ operativoId, estado: 'en_lista_espera' })
    .sort({ fechaSolicitud: 1 }).toArray();
  for (const e of espera) {
    if (await reservarTodos(operativoId, e.servicios)) {
      await col.updateOne({ inscripcionId: e.inscripcionId }, { $set: { estado: 'solicitada' } });
    }
  }
}

module.exports = { reservarCupo, liberarCupo, reservarTodos, ofrecerCupos };