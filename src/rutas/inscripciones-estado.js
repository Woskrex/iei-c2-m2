const express = require('express');
const { requiereToken } = require('../auth');
const { obtenerDb } = require('../db');
const { error } = require('../util');
const { puedeTransitar } = require('../estados');

const router = express.Router();

router.patch('/:inscripcionId', requiereToken, async (req, res) => {

  const { inscripcionId } = req.params;
  const { estado } = req.body || {};

  const db = obtenerDb();

  const inscripcion = await db
    .collection('inscripciones')
    .findOne({ inscripcionId });

  if (!inscripcion) {
    return error(
      res,
      404,
      'INSCRIPCION_NO_ENCONTRADA',
      'La inscripción no existe'
    );
  }

  if (!puedeTransitar(inscripcion.estado, estado)) {
    return error(
      res,
      409,
      'TRANSICION_INVALIDA',
      'Cambio de estado no permitido'
    );
  }

  await db.collection('inscripciones').updateOne(
    { inscripcionId },
    { $set: { estado } }
  );

  res.json({
    inscripcionId,
    estado
  });

});

module.exports = router;