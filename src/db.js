const { MongoClient } = require('mongodb');
let db;
async function conectar() {
const cliente = new MongoClient(process.env.MONGODB_URI);
await cliente.connect();
db = cliente.db('tr_operativos'); // base propia del módulo
return db;
}
function obtenerDb() {
if (!db) throw new Error('Base de datos no conectada');
return db;
}
// Genera identificadores como OP-000001 o I-000001
async function siguienteId(prefijo) {
const r = await obtenerDb().collection('contadores').findOneAndUpdate(
{ _id: prefijo }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' });

return `${prefijo}-${String(r.n).padStart(6, '0')}`;
}
module.exports = { conectar, obtenerDb, siguienteId };