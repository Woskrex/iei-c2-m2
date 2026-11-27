// Borra y recrea los datos de prueba del módulo.
// Uso: node scripts/sembrar.js
// CUIDADO: elimina todo lo que haya en la base de MONGODB_URI.
require('dotenv').config();
const { conectar, obtenerDb } = require('../src/db');

async function sembrar() {
  await conectar();
  const db = obtenerDb();

  // 1. Limpiar las colecciones del módulo
  const colecciones = ['operativos', 'inscripciones', 'atenciones', 'contadores'];
  for (const nombre of colecciones) {
    await db.collection(nombre).deleteMany({});
  }

  // 2. Un operativo futuro con cupos (3 de 5 de esterilización ya ocupados)
  await db.collection('operativos').insertOne({
    operativoId: 'OP-000001',
    sedeId: 'SV-01',
    fechaHora: '2026-12-15T14:00:00.000Z',
    veterinarioRut: '15555555-6',
    cupos: {
      esterilizacion: { total: 5, ocupados: 3 },
      microchip: { total: 5, ocupados: 0 }
    },
    estado: 'abierto',
    creadoPor: '17777777-3',
    creadoEn: new Date().toISOString()
  });

  // 3. Tres inscripciones, una para probar cada historia
  const base = {
    operativoId: 'OP-000001',
    solicitanteRut: '11111111-1',
    servicios: ['esterilizacion'],
    fechaSolicitud: new Date().toISOString()
  };
  await db.collection('inscripciones').insertMany([
    { ...base, inscripcionId: 'I-000001', animalId: 'SIM-000002', estado: 'confirmada' }, // HU-09
    { ...base, inscripcionId: 'I-000002', animalId: 'SIM-000008', estado: 'solicitada' }, // HU-06 (Garfield, de 11111111-1)
    { ...base, inscripcionId: 'I-000003', animalId: 'SIM-000003', solicitanteRut: '12222222-5', estado: 'solicitada' }  // HU-08 (Rocky, de 12222222-5)
  ]);

  // 4. Contadores: el siguiente id que se genere continúa desde aquí
  await db.collection('contadores').insertMany([
    { _id: 'OP', n: 1 },
    { _id: 'I', n: 3 }
  ]);

  console.log('Datos de prueba listos');
}

sembrar()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error al sembrar:', e.message);
    process.exit(1);
  });