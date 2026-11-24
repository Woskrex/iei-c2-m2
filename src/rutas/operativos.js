const express = require('express');
const { requiereToken, requierePerfil } = require('../auth');
const { obtenerDb, siguienteId } = require('../db');
const { sedeExiste } = require('../nucleo');
const { error, ruta, RUT_RE } = require('../util');

const router = express.Router();
const SERVICIOS = ['esterilizacion', 'microchip'];

// HU-01: crear operativo (solo funcionario)
router.post('/', requiereToken, requierePerfil('funcionario'), ruta(async (req, res) => {
  const { sedeId, fechaHora, veterinarioRut, cupos } = req.body || {};

  if (typeof sedeId !== 'string' || !(await sedeExiste(sedeId))) {
    return error(res, 400, 'SEDE_INVALIDA', 'La sede no existe en el catálogo');
  }

  const fecha = new Date(fechaHora);
  if (typeof fechaHora !== 'string' || isNaN(fecha) || fecha <= new Date()) {
    return error(res, 400, 'FECHA_INVALIDA', 'La fecha debe estar en formato ISO 8601 y ser futura');
  }

  if (typeof veterinarioRut !== 'string' || !RUT_RE.test(veterinarioRut)) {
    return error(res, 400, 'RUT_INVALIDO', 'El RUT del veterinario debe tener el formato 12345678-9');
  }

  const servicios = Object.keys(cupos || {});
  const cuposValidos = servicios.length > 0 && servicios.every(
    (s) => SERVICIOS.includes(s) && Number.isInteger(cupos[s]) && cupos[s] >= 0
  );
  if (!cuposValidos) {
    return error(res, 400, 'CUPOS_INVALIDOS', 'Indique cupos enteros mayores o iguales a 0 para esterilizacion y/o microchip');
  }

  const doc = {
    operativoId: await siguienteId('OP'),
    sedeId,
    fechaHora: fecha.toISOString(),
    veterinarioRut,
    cupos: Object.fromEntries(servicios.map((s) => [s, { total: cupos[s], ocupados: 0 }])),
    estado: 'abierto',
    creadoPor: req.usuario.rut,
    creadoEn: new Date().toISOString()
  };

  await obtenerDb().collection('operativos').insertOne(doc);
  delete doc._id;
  res.status(201).json(doc);
}));

module.exports = router;