# Client round 5 — the five remaining section mockups (Ventiladores / Cuarto / Iluminación / Clima / Horarios)

Date: 2026-07-18 · Pipeline: single writer, strict TDD (RED-first) · Scope: `disenos/cinemex-hvac-lorawan/` only.

## Direction

The client approved five more mockups covering every section round 4 did not touch. Same
standing rules as round 4: 1:1 anatomy against the images, mockup number/date formats — but
every VALUE derives live from the deterministic sims (never mockup numbers), every visible
control works or is omitted, no camera-view labels anywhere, and all illustration is
handcrafted inline SVG (24-grid / 2 px / currentColor; decorative pieces aria-hidden on
B43 accent-soft fills). The round-4 vocabulary (icon tiles, KPI heroes, toolbar + sortable
tables through the delegated view-state pattern, donut, `formatSimDateTime`, kebab actions)
is REUSED everywhere — no parallel mechanisms were invented.

## What shipped

### Ventiladores (replaces the note + flat read-only table)
- Top strip (`kpi-row-5`): "Estado del inventario" card (fan tile + (i) tooltip + the
  surviving honest copy with an inline `Automático` chip) + four derived KPI cards:
  Total ventiladores (14 unidades, 100% del inventario), Automáticos (green check tile,
  count + share), Manual (hand glyph, 0 + 0%), Conectividad (wifi glyph, 100% operativos,
  "14 / 14 conectados") — all computed from the live telemetry (`fan`/`communication`).
- "Ventiladores de suministro" table: round-4 toolbar (live diacritic-insensitive search,
  Filtros popover with truthful Bus A–D chips, functional Exportar CSV), sortable
  Unidad/Zona headers, dot-pill Ventilador state, Fuente ("TC300 · bus A" from the real
  per-unit bus), kebab with REAL actions only (Ver unidad → `dashboard.html?unit=…`,
  Copiar detalle → clipboard). Footer: "Mostrando 1 a 14 de 14 ventiladores", functional
  "25 por página" select (10/25) and ‹ › pager.
- Right aside "Resumen de estado": green shield banner ("Operación normal · Todos los
  ventiladores…") CONDITIONAL on the derived all-automatic state (a warn variant renders
  otherwise); "Fuentes de conexión" donut with per-bus counts traced from the REAL
  topology (A 5 · B 4 · C 4 · D 1 — the mockup's A4/B5/C5 was wrong and the sim wins);
  "Distribución por zona" rows from the documented zone-group mapping; live-data banner
  with the sim clock.
- New pure derivations (exported, tested): `deriveVentRows` (search/filter/sort/page),
  `ventRowsToCsv`, `deriveBusUnits` (from `UC100_DEVICES.memberIds`), `deriveZoneGroups`.

**Zone-group mapping (documented, derived from `config.mjs` ZONES — never hand-tallied):**
kind `public`/`circulation` → Áreas públicas (4: vestíbulo, dulcería, revisión, pasillo);
kind `auditorium` → Salas (8); kind `service` + `administration` → Operaciones (1);
kind `service` + `kitchen` → Servicios (1).

### Cuarto de máquinas (replaces the round-3 rtu-card grid)
- Top strip (8-track `cuarto-strip`): intro card (gear tile + copy + DECORATIVE handcrafted
  isometric rack illustration, aria-hidden); "Ver en la sala" card (eye tile, copy about
  monitoring live from Tablero without naming any view, real `data-go-section="tablero"`
  button); four KPIs: RTU activas ("14 / 14", green "100% operativas"), Prom. horas
  compresor (wave glyph, 432 h = documented `PLANT_POLICY.compressorDuty` 0.6 × 24 h ×
  30 days, "Promedio mensual"), Nodos UC100 (4, "En línea"), Alertas (red bell tile, live
  active count, red "Requieren atención" when > 0).
- "Flota RTU" table: search/Filtros(bus chips)/Exportar CSV toolbar; columns Unidad
  (tag chip + delivery dot), Zona, Horas compresor (i), Horas ventilador (i), Consigna
  ("22.0°", mockup format), Gabinete · caída ("Rack telecom (frente) · RS-485 · UC100-A"
  from the traced plant model). Footer count + "Filas por página" (10/25) + pager.
  New pure derivations: `deriveFleetRows`, `fleetRowsToCsv`.
- Right aside "Rack telecom · RS-485 · UC100": "Estado del sistema: Óptimo" CONDITIONAL on
  the truthful COMMUNICATION domain (no active Comunicación alerts; thermal deviations
  belong to the Alertas KPI, not the rack's status line); DECORATIVE rack ↔ UC100-A…D
  diagram (green status dots, dashed links, "RS-485 · buses de campo" caption); 2×2
  mini-stats (RS-485 activos 4 · Controles conectados 14 · Nodos en línea 14 / 14 ·
  Última sincronización "Hace N s" from the sim clock modulo a 60 s poll cadence).

### Iluminación (copy REWRITTEN honestly; scenes selectable again)
- Row 1: "Alumbrado del complejo" (sun tile + honest copy: lighting permanently on;
  scenes describe light mood; selection marks the console's active scene) + "Escenas"
  group with (i): four SELECTABLE cards (sun/clapper/moon/lamp glyphs, title + one-line
  description, `data-light-scene` + `aria-pressed` riding `view.lightScene`).
- Row 2 (all from the NEW `src/sim/lighting.mjs`): "Escena activa" (glyph + name + desc +
  chip "Desde 12:00 · hora simulada", or "Selección manual" when overridden), "Luminarias
  operativas" ("223 / 228", "97.8% operativas", progress bar — seeded per-area inventory,
  failure draw scaled by area size), "Consumo de iluminación" (kWh Hoy = the always-on
  `ENERGY_POLICY.lightingKw` baseline integrated over today's sim hours, "vs. ayer ±N.N%"
  with the round-4 seeded-comparison convention), "Ahorro estimado (mes)" ("N.N%",
  "vs. mismo mes anterior", chip "Equivale a N kWh" — all auditing against their own pairs).
- Row 3: "Programación del día" vertical timeline (10:00 Apertura ✓ Completada · 12:00
  Función Activa · 19:00 Exteriores · 22:00 Cierre — statuses off the sim clock) + footer
  link "Ver horarios completos →" (`data-go-section="horarios"`); "Estado por área"
  handcrafted SVG block plan echoing the REAL layout (west/east salas, corridor,
  checkpoint, kitchen, office, dulcería, lobby, exterior band) with per-area dot + % and
  the threshold legend (Óptimo ≥ 95 / Atención 90–94 / Crítico < 90 / Sin datos);
  "Automatización y escenas" informational rows WITHOUT CTAs.
- Footer line: "Actualizado <sim> · Datos en tiempo real desde la red LoRaWAN".

### Clima (hero + derived cards + carousel)
- Row 1: hero "Ahora · Ciudad de México" ((i) tooltip, large decorative condition
  illustration, huge "24.8 °C", condition, Humedad/Viento sub-readouts with glyphs,
  "Actualizado <sim>"); "Próximos 5 días" carousel: the sim owns 7 seeded days → 5 per
  page with two FUNCTIONAL dots (`view.climaPage`); day cards carry full day name,
  "hi° / lo°", condition glyph + text, per-day seeded humidity % and wind (new forecast
  fields, same seeded family); "Fuente" aside: antenna tile + honest rewritten copy
  ("simulación determinista… ningún dato sale del complejo"), neutral chip "Serie
  simulada · misma marca de tiempo que la telemetría" (NO fake "Servicio meteorológico
  Conectado"), "Última actualización <full sim date>".
- Row 2 (all from the new `createWeatherModel().derived`, documented formulas): "Índice
  UV" (big index + level, 5-band scale with marker, advice line), "Sensación térmica"
  (big °C + delta label + 8-point half-hour trend sparkline WITH the honest hover
  contract + trend label), "Probabilidad de lluvia" (big % + Ahora/+6/+12/+18/+24 h bar
  chart with % labels), "Relación con demanda HVAC" (SVG ring "66% Alta" + one-line
  honest derivation).
- Bottom strip "Resumen de condiciones": thermometer tile + two-line deterministic
  summary + Punto de rocío (Magnus formula, label), Visibilidad (km, label), Presión
  atmosférica (hPa, label).

### Horarios (countdown + summary + truthful aside)
- "Semana operativa": the seven day cards with boxed Apertura/Cierre values (unchanged data).
- "Calendario de consignas": per-period status dot (completada/activa/programada off the
  sim clock), Horario, Salas, Zonas comunes; below it the highlight banner "Próximo cambio
  Función estelar · 17:00" + right-aligned countdown chip "En 5 h 0 min" (minutes-only
  under the hour), all from the new `deriveScheduleStatus`.
- "Resumen semanal": Total de aperturas 7 · Total de cierres 7 · Horas de operación
  "13.4 h Promedio por día" (past-midnight closings counted across) · Consigna promedio
  salas "22.8 °C" (+ current period) — computed from the declared week/calendar.
- Amber "Nota" aside: calendar tile + surviving truthful facts (TC300 18–26 °C; kitchen
  service setpoint all day); "Lineamientos" checklist of THREE TRUE claims (weekday
  automation; all setpoints inside TC300 limits; kitchen constant) — the mockup's manual
  override/reset claims were REWRITTEN because the product has no manual setpoint UI;
  "Ver historial de cambios" toggle (`view.horariosHistory`) rendering today's REAL
  period transitions so far (10:00 Apertura · 12:00 Matiné at sim noon).
- Footer: "Última actualización: <full sim date> · Zona horaria: UTC-06:00 (CDMX)".

### Shell (`main.js`)
All round-5 controls ride the SAME delegated view-state pattern: `data-vent-sort/filters/
bus/page/menu/page-size/search`, `data-cuarto-search/filters/bus/page/page-size`,
`data-light-scene`, `data-clima-page`, `data-horarios-history`. The search-input and
page-size listeners generalized into declarative selector→key tables. `data-export-csv`
now serves the ACTIVE section (hvac/ventiladores/cuarto, each with its own serializer and
filename). `data-copy-detail` closes whichever kebab menu was open.

## New sim surfaces

- `src/sim/lighting.mjs` (NEW): `LIGHTING_AREAS` (declared per-area totals over the real
  zone registry), seeded operative counts (failure draw scaled by area size),
  `LIGHT_SCENE_PROGRAM` (10:00/12:00/19:00/22:00, aligned with the operating schedule),
  sim-clock statuses, manual-override semantics, consumption/savings anchored to
  `ENERGY_POLICY.lightingKw` + `daysPerMonth` so Iluminación and Energía tell one story.
- `src/sim/weather.mjs`: `derived` block — UV (condition ceiling × solar window peaking
  13:00, WHO level bands), feels-like (dry-bulb + 0.04·(RH−50) − 0.06·wind, 8-sample
  half-hour trend), rain probability (condition base + seeded jitter per day/offset),
  HVAC relation (documented linear map of temp/RH against the cooling band), dew point
  (Magnus a=17.62 b=243.12), visibility and sea-level pressure with label rules. Forecast
  days gained seeded `humidityPct`/`windKmh` (same per-day family, tick-less).
- `src/sim/schedules.mjs`: `deriveScheduleStatus` — active period (with overnight Cierre
  carry-over), next-change countdown, today's transitions, weekly summary (13.4 h avg,
  22.8 °C mean salas), weekday label from the 2026-01-01 Thursday epoch.

## Contracts changed (old → new)

| Contract | Old | New |
| --- | --- | --- |
| `ventiladores` body | note card + flat 4-col table, zero buttons/inputs | KPI strip + toolbar table (`view.ventSort/ventDir/ventQuery/ventBus/ventPage/ventPageSize/ventMenu`) + estado aside |
| `cuarto` body | 14 `rtu-card`s + bus summary card, `<table>` banned | intro/promo cards + 4 KPIs + Flota RTU table (`view.cuartoQuery/cuartoBus/cuartoFilters/cuartoPage/cuartoPageSize`) + rack aside |
| `cuarto` "Ver en la sala" | banned copy (`no jump card`) | required again as REAL section navigation (no view named) |
| `iluminacion` scenes | read-only facts, `<button>` and `data-light-scene` banned | selectable cards (`view.lightScene`, aria-pressed); light/section-state ONLY |
| `main.js` `data-light-scene` | banned (`doesNotMatch data-light-scene|lightScene`) | required as a pure view-state control; still may never reach the camera controller |
| `clima` forecast | 7 `dia` chips, single strip | 5-per-page carousel (`view.climaPage`, 2 functional dots) + derived cards |
| `horarios` body | week grid + calendar + note card | + status dots, countdown banner, weekly summary KPIs, truthful lineamientos, history toggle (`view.horariosHistory`) |
| `createWeatherModel` | `{city, tick, current, forecast}` | + `derived` (uv/feelsLike/rain/hvacRelation/dew/visibility/pressure), forecast + `humidityPct`/`windKmh` |
| `createScheduleModel` | only export surface | + `deriveScheduleStatus({tick})` |
| Sections donut | Energía-only (`DONUT_SEGMENT_CLASS`) | parameterized (`classFor`/`ariaLabel`); Ventiladores bus donut reuses it |

One authored-test correction during GREEN: the round-5 consigna assertion was written as
"22.0 °C" but the spec mandates the mockup format ("22.0°"); the regex was fixed to the
mockup format (documented here, not silently).

## Honesty deviations / resolutions

- **Lighting-scene 3D hook — the decision:** the runtime never had a lighting hook to
  reinstate. The retired `data-light-scene` handler (pre single-view round) only MOVED THE
  CAMERA toward the scene's area, and that path is dead by the single-view rule; the house
  rig itself is a static, evidence-gated lighting pass (`src/scene/lighting.js`) with no
  per-scene variation API. Re-authoring the gated rig for four moods was out of reach for
  a UI round, so the spec's documented fallback applies: scenes are selectable as the
  SECTION's active-scene state (driving the Escena activa card deterministically), and the
  copy promises exactly that — never that the 3D changes.
- The mockup's "Configurar escenas y reglas" CTA is OMITTED (it promises config UI the
  product does not have); the Automatización rows are informational only.
- The mockup's "Baños" map area is omitted (the validated plan has no such zone) and its
  "Salas 5–7" grouping is corrected to the as-built "Salas 5–8"; "Revisión de boletos"
  joins the map because it is a real zone.
- Weather-source copy: rewritten as "simulación determinista… Serie simulada · misma marca
  de tiempo que la telemetría" with a neutral chip — no "Servicio meteorológico Conectado".
- The rack aside's "Estado del sistema" is scoped to the COMMUNICATION domain (its own
  subject): zero active Comunicación alerts → Óptimo, else "Con alertas". The building's
  thermal alerts render in the Alertas KPI beside it, so nothing is hidden.
- The rack diagram's mockup label "RS-485 · Red troncal" is corrected to "RS-485 · buses
  de campo": the four UC100s sit on four separate field buses (validated topology), not
  one trunk. All four UC100 chips are shown, so the "… N más" overflow row does not apply.
- Horarios lineamientos: the mockup's "setpoints can be adjusted manually from operative
  mode" and "manual changes reset at the next period" claims are NOT true of this product
  (no manual setpoint UI) — replaced by three verifiable claims.
- Iluminación "ayer"/"mes anterior" and the savings figure are seeded plausibilities
  anchored to the fixed lighting baseline (the sim owns one modeled day/month) — same
  documented convention as the round-4 energy comparisons; every rendered percentage
  audits against its own kWh pair.
- Bus donut counts come from `UC100_DEVICES.memberIds` (5/4/4/1), not the mockup's 4/5/5.

## Verification

- Strict TDD: `tests/client-round5.test.mjs` (17 tests) written first and RED (module-load
  failure on the missing sims/exports), then implementation; the five conflicting round-3/4
  contracts in `tests/dock-sections.test.mjs` updated consciously (documented above).
- Full suite: **331 tests, 331 pass, 0 fail** (was 314 before the round).
- `node --check` clean on every touched JS/MJS file; publish bundle regenerated
  (`node build-publish.mjs` → `publish/p/cinemex`).
- Headless-Chrome eye check (swiftshader), driving real `.nav-item` clicks and at least one
  interaction per section (zona sort + kebab, flota search "cocina", scene selection
  Cierre, carousel page 2, history toggle). **Zero console errors**, banned view-label
  sweep clean. Every capture was LOOKED at against the spec; two layout defects found and
  fixed in-round (the cuarto strip needed the page-grid span; narrow zone-map blocks
  stacked their % to stop label collisions; the 5-day strip needed minmax(0,1fr)).

## Captures

- `runs/assets/client-round5-mockups-ventiladores.png` (+ `-sorted-kebab`)
- `runs/assets/client-round5-mockups-cuarto.png` (+ `-search`)
- `runs/assets/client-round5-mockups-iluminacion.png` (+ `-cierre`)
- `runs/assets/client-round5-mockups-clima.png` (+ `-page2`)
- `runs/assets/client-round5-mockups-horarios.png` (+ `-history`)

## Real-branding pass (2026-07-18)

Client asked for the actual Cinemex logo — "solo lo que importa del logo" — in place of the
AI-invented multi-hue swirl mark and its invented subtitle.

- **Logo crop**: `images.png` (596x335, official red field) trimmed with ImageMagick
  (`-fuzz 6% -trim +repage` → 354x79 content) then re-bordered 12px in the logo's own red
  `srgb(239,41,68)` for breathing room → **378x103** `assets/cinemex-logo.png` (spiral + wordmark).
- **Favicons**: `unnamed.webp` (240x240 spiral mark) resized to `assets/favicon-32.png` (32x32)
  and `assets/apple-touch-icon.png` (180x180). No `.ico` — modern `<link rel="icon" type="image/png">`
  is enough. Both replace the old inline red-square SVG data-URI favicon in index.html + dashboard.html.
- **Sidebar brand block** (index.html): the `.brand-mark` swirl SVG and the
  `<span class="brand-name"><b>Cinemex</b><span>…</span></span>` pair are GONE. Replaced by
  `<img class="brand-logo" src="./assets/cinemex-logo.png" alt="Cinemex">`, styled as a rounded
  (9px) red chip at height 2.6rem, width auto. **The invented subtitle beside the wordmark was
  REMOVED** — the real wordmark already reads "Cinemex", so no text label rides beside it.
- dashboard.html had no sidebar brand block (only the `marquesina` h1) — only its favicon changed.
  portal/index.html already had its own (blue, multi-project) favicon and was left untouched.
- **styles.css**: retired `.brand-mark` / `.brand-name` rules; added `.brand-logo` chip; dropped the
  now-dead `.brand-name` mobile-drawer override (drawer still shows the logo left-aligned).
- **build-publish.mjs**: added `cpSync(assets → publish/p/cinemex/assets)` so the logo + favicons
  ship (they follow the styles.css verbatim-copy pattern; static files, nothing to obfuscate).
- **Tests**: the `client-round4.test.mjs` "sidebar brand block" assertions were rewritten
  (old → new): `match(/brand-mark/)` + `match(/Water Core/)` + `match(/Cinemex<\/b>/)` →
  `match(brand-logo src=./assets/cinemex-logo.png)` + `match(alt="Cinemex")` +
  `doesNotMatch(/brand-mark/)` + `doesNotMatch(/Water Core/)`. Suite: **292/292 green**.
- **Eye-check** (headless Chrome, swiftshader): logo crisp, corners rounded, not stretched, sits
  well on the light sidebar in both desktop (1440x900) and mobile drawer (390x844). All three
  asset URLs + both pages' `<link rel="icon">`/`apple-touch-icon` served 200. Zero console errors.

### Real-branding captures

- `runs/assets/brand-real-desktop.png` — full desktop shell
- `runs/assets/brand-real-sidebar.png` — sidebar close-up (logo chip)
- `runs/assets/brand-real-mobile.png` — mobile drawer open
