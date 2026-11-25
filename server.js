require('dotenv').config();
const express = require('express');
const { conectar } = require('./src/db');
const { error } = require('./src/util');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));

// Cada integrante agrega aquí la línea de su ruta cuando suba su archivo
app.use('/api/operativos/operativos', require('./src/rutas/operativos'));
app.use('/api/operativos/atenciones', require('./src/rutas/atenciones'));
app.use('/api/operativos/inscripciones', require('./src/rutas/inscripciones-estado'));

app.use((req, res) => error(res, 404, 'RUTA_NO_ENCONTRADA', 'No existe esa ruta'));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return error(res, 400, 'JSON_INVALIDO', 'El cuerpo no es un JSON válido');
  console.error(err.message);
  error(res, 500, 'ERROR_INTERNO', 'Error interno del servidor');
});

const PORT = process.env.PORT || 3000;
conectar()
  .then(() => app.listen(PORT, () => console.log(`Escuchando en ${PORT}`)))
  .catch((err) => {
  console.error(err);
  process.exit(1);
});