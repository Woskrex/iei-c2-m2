
const express = require('express');
const { requiereToken, requierePerfil } = require('../auth');
const { obtenerDb, siguienteId } = require('../db');
const { error, ruta, esTexto } = require('../util');

const router = express.Router();

// HU-09: registrar atención (solo veterinario)
router.post('/', requiereToken, requierePerfil('veterinario'), ruta(async (req, res) => {
  const { inscripcionId, resultado, microchip, fechaControlRecomendada } = req.body || {};

  if (!esTexto(inscripcionId) || !esTexto(resultado, 500)) {
    return error(res, 400, 'DATOS_INVALIDOS', 'Se requiere inscripcionId y resultado');
  }

  const db = obtenerDb();
  const insc = await db.collection('inscripciones').findOne({ inscripcionId });

  if (!insc) {
    return error(res, 404, 'INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
  }

  if (insc.estado !== 'confirmada') {
    return error(res, 409, 'INSCRIPCION_NO_CONFIRMADA', 'Solo se atiende una inscripción confirmada');
  }

  // RN-02: validar microchip cuando el servicio lo requiere
  if (insc.servicios.includes('microchip')) {
    if (typeof microchip !== 'string' || !/^[0-9]{15}$/.test(microchip)) {
      return error(res, 400, 'MICROCHIP_INVALIDO', 'El microchip debe tener 15 dígitos');
    }

    const duplicado = await db.collection('atenciones').findOne({ microchip });
    if (duplicado) {
      return error(res, 409, 'MICROCHIP_DUPLICADO', 'Ese microchip ya fue registrado');
    }
  }

  // Validar fecha de control recomendada (opcional)
  let control = null;
  if (fechaControlRecomendada !== undefined) {
    const f = new Date(fechaControlRecomendada);
    if (typeof fechaControlRecomendada !== 'string' || isNaN(f)) {
      return error(res, 400, 'FECHA_INVALIDA', 'La fecha de control debe estar en formato ISO 8601');
    }
    control = f.toISOString();
  }

  const doc = {
    atencionId: await siguienteId('AT'),
    inscripcionId,
    animalId: insc.animalId,
    servicios: insc.servicios,
    resultado,
    microchip: insc.servicios.includes('microchip') ? microchip : null,
    fechaControlRecomendada: control,
    veterinarioRut: req.usuario.rut,
    fecha: new Date().toISOString()
  };

  await db.collection('atenciones').insertOne(doc);

  await db.collection('inscripciones').updateOne(
    { inscripcionId },
    { $set: { estado: 'atendida' } }
  );

  delete doc._id;
  res.status(201).json(doc);
}));

module.exports = router;
