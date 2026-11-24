const { error } = require('./util');
async function requiereToken(req, res, next) {
const cabecera = req.headers.authorization || '';
if (!/^Bearer\s+\S+/i.test(cabecera)) {
return error(res, 401, 'TOKEN_REQUERIDO', 'Falta el encabezado 
Authorization: Bearer <token>');
}
try {
const r = await 
fetch(`${process.env.NUCLEO_URL}/api/nucleo/sesiones/actual`, {
headers: { Authorization: cabecera },
signal: AbortSignal.timeout(5000)
});
if (r.status === 401) return error(res, 401, 'TOKEN_INVALIDO', 'El token 
no es válido o expiró');
if (!r.ok) throw new Error('el núcleo respondió ' + r.status);
req.usuario = await r.json(); // { rut, perfil, nombre }
next();
} catch (e) {
Page 7 of 28
Guía paso a paso: prototipo ES3 (Módulo 2)
return error(res, 503, 'NUCLEO_NO_DISPONIBLE', 'No se pudo validar la 
sesión, intente nuevamente');
}
}
function requierePerfil(...perfiles) {
return (req, res, next) => {
if (!perfiles.includes(req.usuario.perfil)) {
return error(res, 403, 'PERFIL_NO_AUTORIZADO', 'Su perfil no puede 
realizar esta acción');
}
next();
};
}
module.exports = { requiereToken, requierePerfil };