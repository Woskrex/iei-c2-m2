// src/rutas/inscripciones-crear.js - HU-04: inscribir un animal en un operativo
const express = require('express');
const { requiereToken, requierePerfil } = require('../auth');
const { obtenerDb, siguienteId } = require('../db');
const { obtenerAnimal } = require('../nucleo');
const { reservarTodos } = require('../cupos');
const { error, ruta, esTexto } = require('../util');

const router = express.Router();
const SERVICIOS = ['esterilizacion', 'microchip'];

router.post('/', requiereToken, requierePerfil('vecino', 'comunitario'), ruta(async (req, res) => {
  const { operativoId, animalId, servicios } = req.body || {};

  // 1. Validar formato (solo strings: evita inyección NoSQL)
  if (!esTexto(operativoId) || !esTexto(animalId) || !Array.isArray(servicios)
      || !servicios.length || !servicios.every((s) => SERVICIOS.includes(s))) {
    return error(res, 400, 'DATOS_INVALIDOS',
      'Se requiere operativoId, animalId y servicios (esterilizacion y/o microchip)');
  }

  // 2. El operativo existe y ofrece esos servicios
  const db = obtenerDb();
  const op = await db.collection('operativos').findOne({ operativoId });
  if (!op) return error(res, 404, 'OPERATIVO_NO_ENCONTRADO', 'El operativo no existe');
  if (!servicios.every((s) => op.cupos[s])) {
    return error(res, 400, 'SERVICIO_NO_OFRECIDO', 'El operativo no ofrece alguno de esos servicios');
  }

  // 3. El animal existe en el M1 (se reenvía el token: RN-05)
  const r = await obtenerAnimal(animalId, req.headers.authorization);
  if (r.status === 404) return error(res, 404, 'ANIMAL_NO_ENCONTRADO', 'El animal no existe');
  if (r.status === 401 || r.status === 403) {
    return error(res, r.status, 'ANIMAL_NO_ACCESIBLE', 'No puede inscribir ese animal');
  }
  const animal = r.animal;

  // 4. Reglas de negocio (409: petición válida que choca con el estado de los datos)
  if (animal.estado === 'fallecido') return error(res, 409, 'ANIMAL_FALLECIDO', 'El animal está fallecido');
  if (!['perro', 'gato'].includes(animal.especie)) {
    return error(res, 409, 'ESPECIE_NO_PERMITIDA', 'Solo se aceptan perros y gatos');
  }
  const activa = await db.collection('inscripciones').findOne(
    { operativoId, animalId, estado: { $in: ['en_lista_espera', 'solicitada', 'confirmada'] } });
  if (activa) return error(res, 409, 'INSCRIPCION_DUPLICADA', 'El animal ya está inscrito en este operativo');

  // 5. Reservar cupos; sin cupo NO se rechaza, queda en lista de espera (RN-06)
  const hayCupo = await reservarTodos(operativoId, servicios);
  const doc = {
    inscripcionId: await siguienteId('I'),
    operativoId, animalId,
    solicitanteRut: req.usuario.rut,
    servicios,
    estado: hayCupo ? 'solicitada' : 'en_lista_espera',
    fechaSolicitud: new Date().toISOString()
  };
  await db.collection('inscripciones').insertOne(doc);
  delete doc._id;
  res.status(201).json(doc);
}));

module.exports = router;