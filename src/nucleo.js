async function sedeExiste(sedeId) {
const r = await 
fetch(`${process.env.NUCLEO_URL}/api/nucleo/catalogos/sedes/${encodeURICompon
ent(sedeId)}`,
{ signal: AbortSignal.timeout(5000) });
return r.ok;
}
// Pregunta al M1 (simulado o real) por un animal, usando el token del 
usuario
async function obtenerAnimal(animalId, authorization) {
const r = await 
fetch(`${process.env.M1_URL}/api/registro/animales/${encodeURIComponent(anima
lId)}`,
{ headers: { Authorization: authorization }, signal: 
AbortSignal.timeout(5000) });
if (r.status === 404 || r.status === 401 || r.status === 403) return { 
status: r.status };
if (!r.ok) throw new Error('el M1 respondió ' + r.status);
return { status: 200, animal: await r.json() };
}
module.exports = { sedeExiste, obtenerAnimal };