# DEV — modo desarrollador + bitácora de sesión

## Modo desarrollador (localhost)

Un hook **SessionStart** (`.claude/hooks/dev-server.sh`, registrado en `.claude/settings.json`)
lanza automáticamente un servidor local que sirve la **fuente sin ofuscar** (con devtools/consola
libres) al iniciar/reanudar la sesión. Es idempotente (no arranca doble) y no bloquea la sesión.

- Dashboard + 3D embebido: <http://localhost:8777/dashboard-energetico-v1.html>
- Gemelo 3D standalone: <http://localhost:8777/hotel-realista-ensamblado.html>
- Si `localhost` no mapea desde Windows: usa la IP de WSL (`hostname -I`), p. ej. `http://192.168.100.100:8777/…`

**Por qué**: este entorno WSL no puede crear contexto WebGL, así que la QA visual del 3D se hace
en un navegador real. Los cambios en la fuente se ven al **refrescar** (no requiere rebuild).
Log del server: `/tmp/hotel-dev-8777.log`. Arranque manual: `python3 -m http.server 8777`.

## Publicar a producción (ofuscado)

`node build-publish.mjs` → `publish/` (ofuscado) →
`CLOUDFLARE_API_TOKEN="$(cat .cf-token)" npx wrangler pages deploy publish --project-name=hotel-energia --branch=main`.
Producción: hotel-energia.pages.dev / hotel.angeles-group.org. (Los tokens `cfut_` expiran.)

## Sistema de diseño

**B11 "Industrial Blueprint"**: papel `#ECE3CF` + navy `#1F3A5F` + óxido `#C2410C`, IBM Plex Sans
Condensed/Mono, esquinas rectas, sin sombras/blur/glow. El visor 3D interno se queda oscuro
(navy blueprint `#1f3a5f`). No copiar el look oscuro-teal del casino/MX60.

---

## Bitácora de esta sesión (2026-07-06)

Referencias detalladas en `threejs-block41.md` / `42` / `43` + `INDEX.md` (Research-SDD RUN 8).

### Entorno y realismo del gemelo 3D
- Terreno con relieve + biomas (paleta voxel) + cielo; **mar estático** (la animación se veía mal).
- Vegetación, boardwalk, mobiliario de playa, caseta del cuarto de máquinas de alberca.
- Temperatura promedio por piso (panel + etiquetas).
- Tuberías/ductos corregidos a paridad con el voxel (riser CHW a UMA, loop de alberca, condensado 2 tubos, ducto azotea→shaft).

### Interacción
- **Selección** de cuartos y de los 18 equipos → outline por estado + enfoque de cámara + badge "Vista enfocada".
- Advertencias/alarmas **resaltadas** permanentemente.
- **Barra de estado** vertical (derecha-centro) con filtro por estado → drill-down de alertas.
- **Vista de DETALLE** (overlay a pantalla completa): 3D enfocado de solo esa unidad (reutiliza los
  builders), cockpit de KPIs con gauges, diagnóstico predictivo. Abre con "Ver detalle". (Iteración A;
  faltan gráficas Chart.js + insights — plan en `threejs-block43.md §43.2`.)

### Dashboard + estilo
- Sección "Mantenimiento predictivo" + **reporte PDF** (imprimir + descargar con jsPDF).
- Toda la UI del 3D realineada a **B11**.
- Fix cross-iframe: el chrome del dashboard se ocultaba sobre la vista de detalle (postMessage
  `detail-open`/`detail-close`).
- Layout responsive (móvil/tablet), paneles sin solaparse; etiquetas de escena removidas.

### Análisis de referencia (para la vista de detalle)
- `Honeywell-MX60` (web + módulo Niagara `chihuahua`) y `niagara-casino` (React, origen del diseño):
  el detail view = página dedicada con 3D enfocado + gauges + gráficas; todo Three.js/Chart.js
  portable, solo la fuente de datos es de Niagara/Supabase.

### Pendiente (próxima sesión)
- QA visual en navegador real (localhost o producción).
- Detail overlay It.B (gráficas Chart.js: banda de confort + línea "ayer") + It.C (motor de insights).
- Datos reales en vez de simulados; opcional: aislar por zona, partículas de flujo en tuberías.
