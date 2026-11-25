# Módulo 2: Operativos de esterilización y chipeo (ES3)

Sistema municipal de tenencia responsable de mascotas, Antofagasta. Sección IEI-C1.
Este módulo gestiona operativos de esterilización y microchip: creación de operativos con cupos,
inscripción de animales (con lista de espera), confirmación, cancelación y registro de la atención.

- Prototipo desplegado: https://iei-c2-m2.onrender.com
- Repositorio: https://github.com/Woskrex/iei-c2-m2
- Taiga: https://tree.taiga.io/project/yonah-ti3043-iei-c1-m2

## Tecnologías

Node.js 18 o superior, Express, MongoDB Atlas (base propia `tr_operativos`) y una interfaz web simple en `public/`.
Se despliega en Render (PaaS). El inicio de sesión y la validación del token los entrega el núcleo del docente.

## Cómo ejecutarlo en local

```
git clone https://github.com/Woskrex/iei-c2-m2.git
cd iei-c2-m2
npm install
```

Crear un archivo `.env` (no se sube al repositorio) copiando `.env.example` y completando `MONGODB_URI`:

```
PORT=3000
NUCLEO_URL=https://nucleo-tr.onrender.com
M1_URL=https://nucleo-tr.onrender.com
MONGODB_URI=<cadena de conexión de MongoDB Atlas>
```

Cargar datos de prueba (borra y recrea las colecciones del módulo) y arrancar:

```
node scripts/sembrar.js
npm start
```

Abrir http://localhost:3000. Para repetir las peticiones de `entrega.json`: `node scripts/verificar.js http://localhost:3000`
(después volver a ejecutar `node scripts/sembrar.js`).

## Usuarios de prueba (clave común: tenencia2026)

| Perfil | RUT |
|---|---|
| funcionario | 17777777-3 |
| vecino | 11111111-1 |
| veterinario | 15555555-6 |
| comunitario | 13333333-9 |

## Endpoints

| Método | Ruta | Perfil | Historia |
|---|---|---|---|
| POST | /api/operativos/operativos | funcionario | HU-01 |
| GET | /api/operativos/operativos?sedeId&fecha&page&limit | cualquiera con token | HU-03 |
| POST | /api/operativos/inscripciones | vecino, comunitario | HU-04 |
| PATCH | /api/operativos/inscripciones/{id} | vecino, comunitario, funcionario | HU-06, HU-08 |
| POST | /api/operativos/atenciones | veterinario | HU-09 |

Errores con el formato `{"error": {"codigo", "mensaje"}}`. Sin token responde 401 y con perfil incorrecto 403.

## Historias implementadas

| Historia | Responsable | Estado |
|---|---|---|
| HU-01 Crear operativo | Fernando Villagran | Funciona |
| HU-03 Consultar operativos | Brian Burgos | Funciona |
| HU-04 Inscribir animal | Zahir Gallardo | Funciona |
| HU-06 Cancelar y HU-08 Confirmar | Rodrigo Zepeda | Completar según el estado real |
| HU-09 Registrar atención | Axel Muñoz | Funciona |
