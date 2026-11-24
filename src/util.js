function error(res, status, codigo, mensaje) {
return res.status(status).json({ error: { codigo, mensaje } });
}
// Envuelve una función async para que sus errores lleguen al manejador global
const ruta = (fn) => (req, res, next) => Promise.resolve(fn(req, res, 
next)).catch(next);
function paginacion(req) {
const page = Math.max(parseInt(req.query.page) || 1, 1);
const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
return { page, limit, skip: (page - 1) * limit };
}
const esTexto = (v, max = 100) => typeof v === 'string' && v.trim().length > 
0 && v.length <= max;
const RUT_RE = /^[0-9]{7,8}-[0-9kK]$/;
module.exports = { error, ruta, paginacion, esTexto, RUT_RE };