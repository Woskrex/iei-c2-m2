// Repite las peticiones de entrega.json, igual que lo hará el docente.
// Uso:   node scripts/verificar.js https://su-prototipo.onrender.com
// ATENCIÓN: HU-04, HU-06 y HU-09 cambian datos. Después de verificar,
// ejecute node scripts/sembrar.js para dejar los datos como al inicio.
const fs = require('fs');
const path = require('path');

const NUCLEO = (process.env.NUCLEO_URL || 'https://nucleo-tr.onrender.com').replace(/\/$/, '');
const CLAVE = 'tenencia2026';
const RUT_POR_PERFIL = {
  vecino: '11111111-1',
  funcionario: '17777777-3',
  veterinario: '15555555-6',
  comunitario: '13333333-9'
};

const entrega = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'entrega.json'), 'utf8'));
const base = (process.argv[2] || entrega.prototipo).replace(/\/$/, '');

async function iniciarSesion(perfil) {
  const rut = RUT_POR_PERFIL[perfil];
  if (!rut) throw new Error(`No conozco un usuario de prueba para el perfil ${perfil}`);
  const r = await fetch(`${NUCLEO}/api/nucleo/sesiones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut, clave: CLAVE }),
    signal: AbortSignal.timeout(30000)
  });
  const datos = await r.json();
  if (!r.ok || !datos.token) throw new Error(`No se pudo iniciar sesión como ${perfil}`);
  return datos.token;
}

async function llamar(metodo, ruta, token, cuerpo) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(base + ruta, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(30000) // Render gratuito puede tardar en despertar
  });
  return r.status;
}

async function main() {
  console.log(`Probando contra ${base}\n`);
  let fallas = 0;

  const avisos = [];
  if (base.includes('?')) avisos.push('El campo prototipo de entrega.json todavía tiene un signo ?');
  for (const h of entrega.historias) {
    if (String(h.responsable).includes('?')) avisos.push(`${h.id}: falta el responsable`);
  }
  avisos.forEach((a) => console.log('AVISO:', a));
  if (avisos.length) console.log('');

  // Sin token debe responder 401 (lo exige la lista de la entrega)
  const primera = entrega.historias[0].verificacion;
  const sinToken = await llamar(primera.metodo, primera.ruta, null, primera.cuerpo);
  const okSinToken = sinToken === 401;
  if (!okSinToken) fallas++;
  console.log(`${okSinToken ? 'OK   ' : 'FALLA'} sin token -> ${sinToken} (esperado 401)`);

  for (const h of entrega.historias) {
    const v = h.verificacion;
    try {
      const token = await iniciarSesion(v.perfil);
      const status = await llamar(v.metodo, v.ruta, token, v.cuerpo);
      const ok = status === v.esperado;
      if (!ok) fallas++;
      console.log(`${ok ? 'OK   ' : 'FALLA'} ${h.id} ${v.metodo} ${v.ruta} (${v.perfil}) -> ${status} (esperado ${v.esperado})`);
    } catch (e) {
      fallas++;
      console.log(`FALLA ${h.id}: ${e.message}`);
    }
  }

  console.log(fallas === 0 ? '\nTodo en orden.' : `\n${fallas} comprobación(es) fallaron.`);
  console.log('Recuerde ejecutar node scripts/sembrar.js antes de la revisión real.');
  process.exit(fallas === 0 ? 0 : 1);
}

main();