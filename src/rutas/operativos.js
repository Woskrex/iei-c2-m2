const express = require('express');
const { requiereToken, requierePerfil } = require('../auth');
const { obtenerDb, siguienteId } = require('../db');
const { sedeExiste } = require('../nucleo');
const { error, ruta, paginacion, RUT_RE } = require('../util');

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
        (s) => SERVICIOS.includes(s) &&
               Number.isInteger(cupos[s]) &&
               cupos[s] >= 0
    );

    if (!cuposValidos) {
        return error(res, 400, 'CUPOS_INVALIDOS',
            'Indique cupos enteros mayores o iguales a 0 para esterilizacion y/o microchip');
    }

    const doc = {
        operativoId: await siguienteId('OP'),
        sedeId,
        fechaHora: fecha.toISOString(),
        veterinarioRut,
        cupos: Object.fromEntries(
            servicios.map((s) => [s, { total: cupos[s], ocupados: 0 }])
        ),
        estado: 'abierto',
        creadoPor: req.usuario.rut,
        creadoEn: new Date().toISOString()
    };

    await obtenerDb().collection('operativos').insertOne(doc);

    delete doc._id;

    res.status(201).json(doc);
}));


//  HU-03: consultar operativos disponibles
router.get('/', requiereToken, ruta(async (req, res) => {
    const { page, limit, skip } = paginacion(req);

    // Consultar solamente operativos abiertos
    const filtro = { estado: 'abierto' };

    // Filtrar por sede si el usuario indica una
    if (req.query.sedeId) {
        const sedeId = String(req.query.sedeId);

        // Si la sede no existe en el catálogo del núcleo, es un 404
        if (!(await sedeExiste(sedeId))) {
            return error(res, 404, 'SEDE_NO_ENCONTRADA', 'La sede no existe en el catálogo');
        }

        filtro.sedeId = sedeId;
    }

    // Filtrar por fecha si el usuario indica una
    if (req.query.fecha) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.fecha))) {
            return error(res, 400, 'FECHA_INVALIDA', 'Use el formato AAAA-MM-DD');
        }

        filtro.fechaHora = {
            $gte: `${req.query.fecha}T00:00:00.000Z`,
            $lte: `${req.query.fecha}T23:59:59.999Z`
        };
    }

    const col = obtenerDb().collection('operativos');

    // Obtener los operativos de la página solicitada
    const datos = await col.find(filtro, { projection: { _id: 0 } })
        .sort({ fechaHora: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

    // Contar los operativos que cumplen los filtros
    const total = await col.countDocuments(filtro);

    res.json({
        page,
        limit,
        total,
        datos
    });
}));

// Consultar un operativo por id (404 si no existe)
router.get('/:operativoId', requiereToken, ruta(async (req, res) => {
    const op = await obtenerDb().collection('operativos').findOne(
        { operativoId: String(req.params.operativoId) },
        { projection: { _id: 0 } }
    );

    if (!op) return error(res, 404, 'OPERATIVO_NO_ENCONTRADO', 'El operativo no existe');

    res.json(op);
}));

module.exports = router;