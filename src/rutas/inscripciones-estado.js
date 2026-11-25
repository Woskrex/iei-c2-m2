const express = require('express');
const { requiereToken, requierePerfil } = require('../auth');
const { obtenerDb } = require('../db');
const { liberarCupo, ofrecerCupos } = require('../cupos');
const { puedeTransitar } = require('../estados');
const { error, ruta } = require('../util');

const router = express.Router();


router.patch('/:inscripcionId',
  requiereToken,
  requierePerfil('vecino', 'comunitario', 'funcionario'),
  ruta(async (req, res) => {
    const nuevo = (req.body || {}).estado;
    if (!['confirmada', 'cancelada'].includes(nuevo)) {
      return error(res, 400, 'ESTADO_INVALIDO', 'El estado debe ser confirmada o cancelada');
    }

    const db = obtenerDb();
    const inscripciones = db.collection('inscripciones');
    const insc = await inscripciones.findOne({ inscripcionId: String(req.params.inscripcionId) });
    if (!insc) {
      return error(res, 404, 'INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
    }

    
    const esFuncionario = req.usuario.perfil === 'funcionario';
    if (!esFuncionario && insc.solicitanteRut !== req.usuario.rut) {
      return error(res, 403, 'NO_ES_SU_INSCRIPCION', 'Solo puede modificar sus propias inscripciones');
    }
    if (nuevo === 'confirmada' && !esFuncionario) {
      return error(res, 403, 'PERFIL_NO_AUTORIZADO', 'Solo el funcionario confirma inscripciones');
    }

    
    if (!puedeTransitar(insc.estado, nuevo)) {
      return error(res, 409, 'TRANSICION_INVALIDA',
        `No se puede pasar de ${insc.estado} a ${nuevo}`);
    }

    if (nuevo === 'cancelada') {
      
      const op = await db.collection('operativos').findOne({ operativoId: insc.operativoId });
      const horas = (new Date(op.fechaHora) - new Date()) / 36e5;
      if (horas < 24) {
        return error(res, 409, 'FUERA_DE_PLAZO',
          'Solo se puede cancelar hasta 24 horas antes del operativo');
      }
      const teniaCupo = insc.estado !== 'en_lista_espera';
      await inscripciones.updateOne(
        { inscripcionId: insc.inscripcionId },
        { $set: { estado: 'cancelada' } }
      );
      if (teniaCupo) {
        for (const servicio of insc.servicios) await liberarCupo(insc.operativoId, servicio);
        await ofrecerCupos(insc.operativoId); 
      }
    } else {
      await inscripciones.updateOne(
        { inscripcionId: insc.inscripcionId },
        { $set: { estado: 'confirmada' } }
      );
    }

    const actualizada = await inscripciones.findOne(
      { inscripcionId: insc.inscripcionId },
      { projection: { _id: 0 } }
    );
    res.json(actualizada);
  })
);

module.exports = router;