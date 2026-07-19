# Client round 3 — 2026-07-18 · BMS reference restyle (deck removal + section re-layouts)

**Direction.** The client sent screenshots of a real BMS ("Kamay Botany Bay Visitor Centre",
dark theme). Established rule honored throughout: the reference is a **content/structure guide
only** — the B43 light tokens (`styles.css` `:root`) are byte-untouched, all UI copy stays es-MX,
no new libraries, no palette changes.

**Suite: 293 → 296 pass / 0 fail** (`node --test tests/*.test.mjs`, strict TDD: contracts
rewritten RED first, then implemented to GREEN). `node --check` clean on every touched JS/MJS.

## A — The Vista deck is gone; the camera survives

- `index.html`: the whole `.deck` block (mode segmented control, camera select, layer chips,
  cutaway, fullscreen) is deleted. The camera `<select id="camera-select">` survives — same id,
  all 12 options — as a compact overlay control inside the hero viewer (the reference's
  "3d View" pattern). Outside Tablero it hides with the hero pane via the existing
  `[data-view="page"]` CSS rule; embed mode hides it via `body.embed .viewer-camera`. Never
  removed from the DOM at runtime.
- `main.js`: dead handlers removed — `[data-mode]` click, `[data-layer]` change,
  `#cutaway-toggle`, `#fullscreen-toggle`, `updatePressedState` (function + both calls). The
  scene runs on the query-state defaults (architectural, roof+walls on, network layers off,
  cutaway off). **Module APIs intact**: `applyInteraction`, `layerController.setLayer/
  setCutaway/hydrate`, `parseQueryState`/`serializeQueryState` unchanged — URL deep links still
  drive every axis; only the DOM wiring died. Canonical query-state serialization is unchanged
  (still emits mode/state/layers/cutaway defaults).

## B — Section re-layouts (all data from the existing deterministic sims)

- **hvac**: flat 14-row table → zone card grid (name, big temp, setpoint chip, deviation,
  aforo) + read-only detail aside (estado, temp, consigna, desvío, modo, ventilador, aforo).
  Card click re-renders through the pure builder with `view.zone` (delegated click in the
  shell); default = first zone, so the no-JS static render is meaningful. `data-room-view="top"`
  jump kept.
- **cuarto**: table → one equipment card per RTU (icon block, RTU/TC300 tag, truthful mode
  chip, labeled value boxes for compressor/fan hours + consigna + constant "Automático" fan)
  plus a read-only RS-485 bus summary card (four UC100 buses: gabinete, drop count) — the
  reference's PID-card shape with zero fake controls. `data-room-view="technical"` kept.
- **energia**: the three period cards restyle as KPI heroes (big number + unit + subtitle,
  subtitles derived from `ENERGY_POLICY`). Meter table keeps ONLY truthful columns (kW, V, FP);
  a note states that per-phase and frequency measurements do not exist in the sim — the
  reference's phase/frequency column families were **not** fabricated.
- **alertas**: category filter chips row (Todas + 4 categories, counts), columns
  Categoría/Dispositivo/Estado/Severidad (+ honest Detalle), pagination footer "1-8 de N"
  (page size 8; ~10 alerts derive at tick 0 so pagination is real). Filter + pager work through
  the same delegated-click → pure-builder re-render (`view.alertCat`, `view.alertPage`);
  static fallback = first page, all categories. "Estado: Activa" is honest by construction
  (derived alerts only exist while active; auto-reset note kept).
- **clima**: current conditions became a hero (big temp, condition, humidity/wind read boxes);
  forecast strip grew 5 → 7 day chips (same seeded per-day derivation, two more offsets —
  `src/sim/weather.mjs`).
- **tendencias**: the 28 strips regroup into two chart-grid groups with category headers
  (Temperaturas / Energía), Trend-Logs style. Same `sparklineSvg`/`energySparkSvg` builders,
  same data-points/data-unit hover contract, same delegated pointer handler.
- **ventiladores / iluminacion / horarios / tablero**: untouched.

## Contracts consciously updated (old → new)

| Contract | Old | New |
| --- | --- | --- |
| `tests/dock-sections.test.mjs` shell test | deck + every gated control present | deck/mode/layers/cutaway/fullscreen absent; camera-select (12 options) inside the viewer |
| hvac section | 14-row table + deviation | zone card grid + detail aside, `view.zone` API |
| cuarto section | 6-column table | 14 rtu-cards + bus-summary card |
| energia section | 3 plain KPI cards | 3 `kpi-hero` cards + truthful-columns note |
| alertas section | static chips + 4-column table | filter chips (buttons) + Categoría/Dispositivo/Estado/Severidad/Detalle + pager, `view.alertCat/alertPage` API |
| clima section | KPI card + 5-day strip | `clima-hero` + 7-day strip |
| tendencias section | one flat grid, temp+kW pairs | two `trend-group`s with headers |
| `renderSectionHtml(id, {tick})` | — | `renderSectionHtml(id, {tick, view})` (view optional, deterministic) |
| `tests/sim-modules.test.mjs` weather | forecast.length === 5 | forecast.length === 7 |
| `tests/p6-l2-corrections.test.mjs` item 9 | cutaway handler exists and must not re-bake | no cutaway handler at all (control left the DOM); warmup-before-readiness + `bootCutaway` kept |

## Could not be done truthfully

- Per-phase voltage/current and frequency columns (energia): the sim exposes one supply voltage
  and FP per meter — fabricating L1/L2/L3 or Hz would invent data. Stated in-page instead.
- Fan "Standby" states on cuarto cards: the sim's fan state is constantly `automatic`; the
  varying chip is the truthful cooling/standby *mode* from the same telemetry.

## Fidelity pass (same day) — visual richness over the round-3 structure

Client feedback on the round-3 structure vs. their BMS reference screenshots: sections read
FLAT. Scope confirmed with the user: enrich cards/panels ONLY — no floor-plan map, no dark
theme, B43 `:root` tokens byte-untouched, flat language (no glows/gradients).

**Suite: 296 pass / 0 fail** (asserts rewritten RED-first inside the existing contracts).
`node --check` clean on `main.js`, `src/dock/sections.mjs`, `src/controllers/query-state.js`.

What landed (all handcrafted inline SVG on one 24px grid / 2px stroke / `currentColor` —
no icon fonts, no libraries; every figure still comes from the same deterministic sims):

- **hvac** — zone cards lead with the BIG temperature (2.3rem/650, tabular) plus a setpoint
  group (target glyph) and an occupancy group (person glyph) that renders ONLY where the sim
  has aforo; bottom row = mode + deviation chips. The detail aside regrouped into Térmica /
  Operación / Ocupación with readouts in bordered value boxes (`detail-group-head`/`detail-val`).
- **cuarto** — RTU cards: 2.9rem accent-soft icon tile with the 24-grid RTU glyph, one-line
  "RTU-NN **Zona**" tagline (muted tag + bold name) over a TC300/bus meta line, value boxes
  with the compound label grammar ("Horas · Compresor") and muted unit suffixes, status chip
  pinned top-right. Grid min-width raised to 17rem + ellipsis guards (first capture showed
  head overflow; fixed and re-captured).
- **energia** — the three KPI heroes grow to 2.7rem/650 with the inline muted unit.
- **alertas** — filter chips became true pills; rows carry a category glyph (fan/thermo/
  antenna/chipset), bold device id, and severity as a colored dot + text on the EXISTING
  warn/alarm inks; pager right-aligned with visible disabled ends.
- **clima** — hero gains the current-condition glyph (40px); day chips carry their own glyph
  (sun/cloud-sun/cloud/rain, closed sim vocabulary) and the hi-in-ink / lo-muted pair.
- **tendencias** — every tile is an instrument tile: hairline border, bold title, muted
  "Últimas 24 h · 1 punto / 30 min" subtitle.

### Camera scope (user request, cinemex only)

The `#camera-select` dropdown curates exactly SIX views, in order: Fachada, Vestíbulo,
Dulcería, Boletos, Pasillo, Planta térmica (`facade/lobby/concessions/checkpoint/corridor/
top`). `CAMERA_PRESETS` keeps every preset — section jumps (cuarto→technical, hvac→top,
lighting scenes) now apply presets directly through the shared pipeline, and deep links stay
valid. Boot default moved `network` → `facade` (canonical serialization assert updated
RED-first in `tests/shell.test.mjs`). When the active camera is not among the six, the select
shows NO selected option (`selectedIndex = -1`) instead of lying.

### Eye-check evidence (headless Chrome + SwiftShader, zero console/page/network errors)

`runs/assets/client-round3-fidelity-{tablero,hvac,cuarto,energia,alertas,clima,tendencias}.png`
— reviewed against the reference anatomy: icon tiles, big numbers, value boxes, pills,
dot severities, glyph day chips and the disabled pager ends are all visible in the captures.
The tablero capture shows the compact six-option selector on the canvas (option list also
DOM-asserted by the capture script: values + boot selection `facade`).

### Not done truthfully

- Clima hero carries 2 labeled sub-readouts (Humedad, Viento) instead of the reference's
  3-4: the weather sim exposes no other current-conditions point, and none was invented.

## Single-view correction (client, same day — supersedes the "Camera scope" section above)

Client direction: the 3D scene gets exactly ONE fixed view — the whole-building shot that the
`network` preset produces — and NO UI label may name any view. A single view needs no label.

### What changed

- **Camera select deleted.** The `#camera-select` dropdown, its `.viewer-camera` wrapper, its
  CSS (including the `body.embed` hide rule) and all of its `main.js` wiring
  (`syncCameraSelect`, `applyCameraThroughPipeline`, the change listener) are gone. Nothing
  replaces it.
- **Boot pinned to the single view.** `DEFAULT_QUERY_STATE.camera` is the pinned constant
  `'network'`; `main.js` applies it through the existing boot pipeline (applyPreset,
  setLookdevCamera, setEvidenceCamera, chips-by-live-camera). Free orbit remains the
  operator's movement. Layer coherence holds: `network` is in neither roof-clip list, so the
  boot state is roof+walls on — exactly the p6-l2 per-camera rules;
  `layerController.hydrate(queryState)` and `applyInteraction` survive untouched.
- **`camera` left the URL contract** (conscious contract change, RED-first). It is no longer
  parsed (a `?camera=...` token is an unknown parameter: ignored, never applied, never an
  atomic-reset trigger) and no longer serialized. The preset catalogue survives inside
  `src/controllers/camera.js` for module-level evidence tests and QA hooks only.
  `buildViewerUrl`/`buildEmbedUrl` stopped emitting `camera=top`; unit context travels as
  `selection` alone (the embed close-up is selection-driven via `resolveUnitClosePreset`, so
  the cartelera twin still frames its unit).
- **Section jumps removed.** The "Ver en la sala" cards, `data-room-view` affordances and the
  `SECTIONS[id].camera` key are gone (HVAC keeps a plain read-rule note card). Lighting
  scenes stopped naming cameras too: they render as read-only program facts (no buttons), and
  the `data-light-scene` handler left `main.js`. `workbench.connectScene` no longer takes a
  `presetApplier`.

### Label sweep (removed vs. kept)

Removed (named a camera view or view switching): the six option labels (Fachada, Vestíbulo,
Dulcería, Boletos, Pasillo, Planta térmica) with the select; `aria-label="Cámara"`; HVAC
subtitle trimmed "· planta térmica"; both "Ver en la sala" cards and their "la cámara en la
planta térmica / el cuarto técnico" copy; Iluminación copy "mueve la vista del modelo …
el Tablero abre con esa vista"; the "Red completa" mentions in `main.js`/query-state comments.
Also rewritten for zero ambiguity: "Esta vista es de solo lectura" → "Esta sección…"
(Ventiladores), fatal panel "la vista 3D" → "el modelo 3D".

Kept (physical zone/section labels, not views): zone registry labels "Vestíbulo y recepción",
"Dulcería", "Pasillo central", "Revisión de boletos" (`src/config.mjs`); lighting scene
descriptions "Vestíbulo y recepción listos", "Fachada y marquesina" (describe areas of the
program); dashboard internal ids `vista-flota`/`vista-unidad` (page ids, not camera views);
"Ver en el visor 3D / Abrir en el visor 3D" (names the viewer product, not a view).

Note: `publish/p/cinemex/index.html` still contains the OLD dropdown — it is a stale build
artifact from a previous ship and is regenerated by `build-publish.mjs`; product sources are
clean (`rg -i "red completa" index.html main.js dashboard.html styles.css src/ portal/` → 0).

### Tests (RED-first, all green)

Contracts consciously changed across `tests/shell.test.mjs` (canonical serialization without
`camera`, pinned-view asserts, no select in the HTML shell, evidence cameras module-level
only), `tests/dock-sections.test.mjs` (no `camera` keys, no jump affordances, read-only
Iluminación, selector-free shell/main), `tests/dashboard.test.mjs` + `tests/ux-corrections.test.mjs`
(viewer/embed URLs without `camera=top`), `tests/p6-l4-corrections.test.mjs` (`top` stays a
module/spec preset, unreachable from UI/URL). RED run: 15 failing as intended → GREEN:
**296/296 pass** (same count as the morning baseline).

### Eye-check evidence (headless Chrome + SwiftShader, zero console/page errors)

`runs/assets/client-round3-singleview-{tablero,hvac,cuarto}.png` — reviewed: the tablero shows
the whole-building view rendered with the roof chip field, NO selector and no view label
anywhere; HVAC and Cuarto pages carry no "Ver en la sala" card and name no view; Iluminación
renders zero buttons. The capture script also DOM-asserted: no `#camera-select`, no
`.viewer-camera`, zero `<option>` in the viewer, no `[data-room-view]`, no view-name strings
in any captured page text, and an empty console-error list.
