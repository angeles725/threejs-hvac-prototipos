/**
 * Lateral-menu round — dock section builders and menu taxonomy (BUILD obligations W1/W2).
 * The taxonomy is the B-graft (OPERACIÓN/ANÁLISIS); every section renders honest es-MX
 * content over the deterministic sims; the shell keeps every gated selector alive.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TC300_DEVICES } from '../src/config.mjs';
import { CAMERA_PRESETS } from '../src/controllers/camera.js';
import { createInteractionModel } from '../src/scene/interaction.js';
import { createAlertsModel } from '../src/sim/alerts.mjs';
import {
  LIGHTING_SCENES,
  MENU_GROUPS,
  renderSectionHtml,
  SECTION_IDS,
  SECTIONS,
} from '../src/dock/sections.mjs';

// ---------------------------------------------------------------------------
// Taxonomy (graft from study B)
// ---------------------------------------------------------------------------

test('menu taxonomy is the two bound groups in the bound order', () => {
  assert.equal(MENU_GROUPS.length, 2);
  assert.deepEqual(MENU_GROUPS.map(({ label }) => label), ['Operación', 'Análisis']);
  assert.deepEqual(
    MENU_GROUPS[0].sections,
    ['tablero', 'hvac', 'ventiladores', 'cuarto', 'iluminacion'],
  );
  assert.deepEqual(
    MENU_GROUPS[1].sections,
    ['energia', 'tendencias', 'alertas', 'clima', 'horarios'],
  );
  assert.deepEqual(SECTION_IDS, [...MENU_GROUPS[0].sections, ...MENU_GROUPS[1].sections]);
});

test('every section carries an es-MX label and subtitle; the jump-bar flag died with full pages', () => {
  for (const id of SECTION_IDS) {
    assert.equal(typeof SECTIONS[id].label, 'string');
    assert.ok(SECTIONS[id].label.length > 0);
    assert.equal(typeof SECTIONS[id].sub, 'string');
    assert.ok(SECTIONS[id].sub.length > 0, `${id} must carry a subtitle for the breadcrumb header`);
    // Full-page direction (2026-07-16): every non-Tablero section renders as a full page with a
    // breadcrumb header, so the dock's sticky "↑ Modelo 3D" jump bar — and its `long` flag —
    // no longer exist. The registry must not resurrect them.
    assert.equal('long' in SECTIONS[id], false, `${id} must not carry the retired long flag`);
  }
});

test('no section or lighting scene names a camera anymore (single fixed view)', () => {
  // Single-view correction (2026-07-18): the scene ships ONE fixed view, so the section registry
  // and the lighting scenes stopped naming cameras entirely — no jump, no silent preset, no
  // label. CAMERA_PRESETS itself survives as a module-level concern (evidence/QA), which is why
  // the pinned boot preset must still be real.
  assert.ok('network' in CAMERA_PRESETS, 'the pinned single view must stay a real preset');
  for (const id of SECTION_IDS) {
    assert.equal('camera' in SECTIONS[id], false, `${id} must not name a camera`);
  }
  for (const scene of Object.values(LIGHTING_SCENES)) {
    assert.equal('camera' in scene, false, 'a lighting scene must not name a camera');
    assert.equal(typeof scene.label, 'string');
    assert.equal(typeof scene.description, 'string');
  }
  assert.deepEqual(
    Object.keys(LIGHTING_SCENES),
    ['apertura', 'funcion', 'cierre', 'exteriores'],
  );
});

// ---------------------------------------------------------------------------
// Section rendering (deterministic over the tick)
// ---------------------------------------------------------------------------

test('every section renders deterministic non-empty HTML', () => {
  for (const id of SECTION_IDS) {
    const html = renderSectionHtml(id, { tick: 0 });
    assert.equal(typeof html, 'string');
    assert.ok(html.length > 0, `${id} must render content`);
    assert.equal(html, renderSectionHtml(id, { tick: 0 }), `${id} must be deterministic`);
  }
  assert.throws(() => renderSectionHtml('nope'), RangeError);
});

test('tablero digests zones, energy, weather and alert count in one glance', () => {
  const html = renderSectionHtml('tablero', { tick: 0 });
  assert.match(html, /Energía ahora/);
  assert.match(html, /kW/);
  assert.match(html, /Clima/);
  assert.match(html, /Alertas activas/);
  assert.match(html, /Vestíbulo y recepción/);
  assert.match(html, /Consigna/);
});

test('hvac renders the mockup strip and the unidades table (client round 4)', () => {
  const html = renderSectionHtml('hvac', { tick: 0 });
  // CONTRACT CHANGE (client round 4, 2026-07-18, approved mockup): the zone-card grid + detail
  // aside became a 4-card top strip (promo + three derived KPIs) and one sortable/filterable
  // table. "Ver en la sala" returns as a REAL navigation to Tablero (no camera view is named).
  for (const device of TC300_DEVICES) assert.match(html, new RegExp(device.id));
  assert.doesNotMatch(html, /data-zone-detail|data-zone-panel|zone-card/, 'the zone grid died with the mockup');
  assert.match(html, /<table/, 'the unidades table is back, per the mockup');
  assert.match(html, /Ver en la sala/);
  assert.match(html, /data-go-section="tablero"/, 'the promo button truly navigates');
  assert.match(html, /Temp\. promedio/i);
  assert.match(html, /Zonas fuera de banda/i);
  assert.match(html, /Equipos enfriando/i);
  for (const column of ['Unidad', 'Zona', 'Temp', 'Consigna', 'Desvío', 'Modo']) {
    assert.match(html, new RegExp(column));
  }
  assert.match(html, /data-hvac-search/, 'the search box filters live');
  assert.match(html, /data-export-csv/, 'the export control downloads the live rows');
  // Occupancy left this section with the zone cards; the modes stay the truthful pair.
  const telemetry = createInteractionModel({ state: 'architecture', tick: 0, selection: 'none' }).telemetry;
  const cooling = TC300_DEVICES.filter(({ id }) => telemetry[id].mode === 'cooling').length;
  assert.match(html, new RegExp(`${cooling} Enfriando`), 'the footer legend audits against the sim');
  // Single-view rule still binding: no copy names a camera view.
  assert.doesNotMatch(html, /data-room-view|Red completa|[Pp]lanta térmica/);
});

test('ventiladores is honestly read-only over the mockup anatomy (client round 5)', () => {
  const html = renderSectionHtml('ventiladores', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the note + flat table became
  // KPI cards, the round-4 toolbar table and the estado aside. The buttons/inputs that exist
  // now are all FUNCTIONAL presentation controls (search, sort, filter, export, pager, kebab);
  // the fan state itself stays a read-only truthful fact and the copy still says so.
  assert.match(html, /Automático/);
  assert.match(html, /solo lectura/i);
  assert.match(html, /data-vent-search/, 'the search input is live, not decorative');
  assert.match(html, /data-export-csv/, 'the export control downloads the live rows');
  assert.match(html, /Bus A · 5 unidades/, 'the donut legend audits the real topology');
  assert.doesNotMatch(html, /data-fan-mode|Encender|Apagar/, 'no fake local-control affordance');
});

test('cuarto de máquinas renders the flota table and the rack aside (client round 5)', () => {
  const html = renderSectionHtml('cuarto', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the round-3 rtu-card grid
  // became the FLOTA RTU toolbar table + KPI strip + rack/RS-485 aside. "Ver en la sala"
  // returns as REAL section navigation (no camera view is named — the single-view rule holds).
  assert.doesNotMatch(html, /class="rtu-card"/, 'the card grid died with the mockup');
  assert.match(html, /<table/, 'the flota table is back, per the mockup');
  assert.match(html, /Horas compresor/);
  assert.match(html, /Horas ventilador/);
  assert.match(html, /RTU-01/);
  assert.match(html, /RTU-14/);
  assert.match(html, /RS-485/);
  assert.match(html, /[Gg]abinete/);
  assert.match(html, /Rack telecom \(frente\) · RS-485 · UC100-A/, 'cabinet · drop traced from topology');
  assert.match(html, /Ver en la sala/);
  assert.match(html, /data-go-section="tablero"/, 'the promo button truly navigates');
  assert.doesNotMatch(html, /data-room-view/, 'no camera-jump affordance resurrects');
});

test('iluminación scenes are selectable SECTION state and state the always-on truth', () => {
  const html = renderSectionHtml('iluminacion', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the scenes are SELECTABLE
  // cards again — but selection drives the SECTION's active-scene state only (the runtime never
  // had a lighting hook; the retired handler moved the CAMERA, which stays dead). The copy
  // promises exactly that and nothing about the 3D; the always-on truth survives.
  for (const scene of Object.values(LIGHTING_SCENES)) {
    assert.match(html, new RegExp(scene.label));
  }
  assert.equal((html.match(/data-light-scene="/g) ?? []).length, 4, 'four selectable scene cards');
  assert.match(html, /aria-pressed="true"/, 'the active scene is visibly selected');
  assert.match(html, /encendid/i, 'the section must state that house lighting is always on');
  assert.doesNotMatch(html, /cámara|vista/i, 'no copy names a camera or view');
});

test('energía renders KPI hero cards and the truthful meter table', () => {
  const html = renderSectionHtml('energia', { tick: 0 });
  assert.match(html, /Ahora/);
  assert.match(html, /Día anterior/);
  assert.match(html, /Mes/);
  // Client round 3 (2026-07-18, BMS reference): the three period cards restyle as KPI heroes
  // (big number + unit + subtitle) — same numbers, same derivations.
  assert.equal((html.match(/kpi-hero/g) ?? []).length >= 3, true, 'the three period cards are heroes');
  assert.match(html, /kWh/);
  assert.match(html, /FP/);
  const rows = html.match(/RTU-\d{2}/g) ?? [];
  assert.ok(new Set(rows).size === 14, 'all fourteen meters render');
  // The sim meters expose kW, one supply voltage and FP only: the reference's per-phase
  // voltage/current and frequency columns would be fabricated data and must not render.
  assert.doesNotMatch(html, /Fase [ABC1-3]|>L[123]<|Hz/, 'no fabricated phase or frequency columns');
});

test('tendencias reuses the sparkline builder for temp and adds energy strips', () => {
  const html = renderSectionHtml('tendencias', { tick: 0 });
  // Client round 3 (2026-07-18, BMS reference): the strips regroup into a chart grid with one
  // category header per group (Temperaturas / Energía), Trend-Logs style.
  assert.equal((html.match(/class="trend-group"/g) ?? []).length, 2, 'two category groups');
  assert.match(html, /Temperaturas</);
  assert.match(html, /Energía</);
  const sparks = html.match(/<svg/g) ?? [];
  assert.ok(sparks.length >= 28, 'one temperature and one energy strip per unit');
  assert.match(html, /class="chispa"/, 'the shipped sparkline builder is reused, not duplicated');
  // Hover contract (full-page round): every sparkline carries its points + unit as data so the
  // shell's ONE delegated pointer handler can serve the whole grid without re-deriving series.
  const hoverSparks = html.match(/data-points="[\d.,-]+"/g) ?? [];
  assert.ok(hoverSparks.length >= 28, 'temp and energy strips both carry hover data points');
  assert.match(html, /data-unit="°C"/);
  assert.match(html, /data-unit="kW"/);
  // Visual fidelity pass (2026-07-18): every tile carries a timeframe subtitle under its
  // title, so the grid reads as instrument tiles.
  assert.equal((html.match(/class="trend-sub"/g) ?? []).length, 28, 'one timeframe subtitle per tile');
});

test('alertas renders filter chips, the reference columns and a pagination footer', () => {
  const html = renderSectionHtml('alertas', { tick: 0 });
  // CONTRACT CHANGE (client round 4, 2026-07-18, approved mockup): the table now walks the whole
  // sim-day universe (active + resolved episodes), the page size moved 8 → 10 with a functional
  // "Filas por página" select, and the pager gained numbered pages.
  assert.match(html, /data-alert-cat="all"/, 'the "Todas" chip anchors the filter row');
  for (const category of ['HVAC', 'Temperatura', 'Comunicación', 'Sistema']) {
    assert.match(html, new RegExp(`data-alert-cat="${category}"`));
  }
  for (const column of ['Categoría', 'Dispositivo', 'Estado', 'Severidad', 'Detalle']) {
    assert.match(html, new RegExp(`<th[^>]*>${column}</th>`));
  }
  assert.match(html, /data-alert-row/);
  assert.match(html, /Mostrando 1 a 10 de \d+ alertas/, 'static fallback: first page, no filters');
  // Fidelity: category glyph per row, bold device, severity as dot + text on existing inks.
  assert.equal((html.match(/class="cat-cell"/g) ?? []).length, 10, 'every visible row leads with its category glyph');
  assert.equal((html.match(/class="cell-device num"/g) ?? []).length, 10, 'device names render bold');
  assert.ok((html.match(/class="sev sev-(?:warn|critical|ok)"/g) ?? []).length >= 1, 'severity is a dot + text');
  assert.doesNotMatch(html, /pill pill-(?:critical|warn)">(?:crítica|advertencia)/, 'severity stopped being a pill');
  assert.match(html, /data-alert-page="prev"[^>]*disabled/);
  assert.match(html, /data-alert-page="next"/);
  assert.match(html, /restablece|Sin alertas/i, 'reset behavior is stated, not faked');
});

test('alertas view state filters by category and paginates deterministically', () => {
  const model = createAlertsModel({ tick: 0 });
  const universe = model.total + model.resolvedToday;
  const pageCount = Math.ceil(universe / 10);
  const paged = renderSectionHtml('alertas', { tick: 0, view: { alertPage: pageCount } });
  assert.match(paged, new RegExp(`a ${universe} de ${universe} alertas`), 'the last page shows the tail slice');
  assert.match(paged, /data-alert-page="next"[^>]*disabled/);
  const filtered = renderSectionHtml('alertas', { tick: 0, view: { alertCat: 'Comunicación' } });
  assert.match(filtered, /data-alert-cat="Comunicación"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(filtered, /class="cat-cell">[^<]*<\/span>Temperatura/, 'only the chosen category remains');
  const clean = renderSectionHtml('alertas', { tick: 0, view: { alertCat: 'Sistema' } });
  assert.match(clean, /Sin alertas/, 'an empty filtered read explains itself');
});

test('clima renders the hero and the 5-per-page forecast carousel', () => {
  const html = renderSectionHtml('clima', { tick: 0 });
  assert.match(html, /Ciudad de México/);
  assert.match(html, /simulad/i, 'weather is labeled as simulated data');
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the 7-chip strip became a
  // 5-per-page carousel with functional dots (the sim still owns 7 seeded days), the hero
  // gained the decorative condition illustration, and the derived weather cards joined.
  assert.match(html, /class="clima-hero"/);
  assert.match(html, /Humedad/);
  assert.match(html, /Viento/);
  const days = html.match(/class="dia"/g) ?? [];
  assert.equal(days.length, 5, 'five day cards per carousel page');
  assert.equal((html.match(/data-clima-page="/g) ?? []).length, 2, 'two functional carousel dots');
  assert.match(html, /class="clima-illus"/, 'the hero shows the decorative condition illustration');
  assert.equal((html.match(/class="dia-glyph"/g) ?? []).length, 5, 'one condition glyph per day chip');
  assert.equal((html.match(/class="dia-hi"/g) ?? []).length, 5, 'the high leads in ink');
  assert.equal((html.match(/class="dia-lo"/g) ?? []).length, 5, 'the low reads muted');
  assert.match(html, /Índice UV/i, 'the derived cards render');
});

test('horarios renders the weekly grid and the setpoint calendar', () => {
  const html = renderSectionHtml('horarios', { tick: 0 });
  for (const day of ['Lunes', 'Domingo']) assert.match(html, new RegExp(day));
  assert.match(html, /Apertura/);
  assert.match(html, /consigna|Consigna/);
  // Full-page re-layout: a REAL weekly grid (7 day columns), scrolling inside its own card.
  assert.match(html, /class="week-grid"/);
  assert.equal((html.match(/class="week-day"/g) ?? []).length, 7, 'seven day columns');
});

// ---------------------------------------------------------------------------
// Shell contract: the workbench keeps every gated selector alive
// ---------------------------------------------------------------------------

test('index.html carries the workbench: grouped menu, dock — the deck AND the camera select are gone', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  // The old top command bar stays gone. CONTRACT CHANGE (client round 3, 2026-07-18): the Vista
  // deck died too — mode toggle, layer checkboxes, cutaway and fullscreen left the DOM. The scene
  // runs on its defaults (architectural, roof+walls on, network layers off, cutaway off); deep
  // links through query-state still drive every axis.
  assert.doesNotMatch(html, /command-bar/);
  assert.doesNotMatch(html, /class="deck"/, 'the Vista deck must not resurrect');
  assert.doesNotMatch(html, /data-mode=/);
  assert.doesNotMatch(html, /data-layer=/);
  assert.doesNotMatch(html, /cutaway-toggle/);
  assert.doesNotMatch(html, /fullscreen-toggle/);

  // Menu: grouped taxonomy, one button per section, labeled pin affordance.
  for (const id of SECTION_IDS) assert.match(html, new RegExp(`data-section="${id}"`));
  assert.match(html, /Operación/);
  assert.match(html, /Análisis/);
  assert.match(html, /id="menu-pin"/);
  assert.match(html, /Menú fijado/);

  // Dock: heading pair, peel affordance (A-graft). The jump-back bar (B-graft) died with the
  // full-page direction: the sections that earned it render as full pages with a breadcrumb now.
  assert.match(html, /id="dock-title"/);
  assert.match(html, /id="dock-pin"/);
  assert.match(html, /id="dock-content"/);
  assert.doesNotMatch(html, /dock-jump/, 'the retired jump bar must not resurrect');

  // Full-page lane: breadcrumb header + full-width content grid beside the menu.
  assert.match(html, /id="section-page"/);
  assert.match(html, /class="page-crumb"/);
  assert.match(html, /id="page-crumb-section"/);
  assert.match(html, /id="page-content"/);

  // Single-view correction (2026-07-18): the camera select is GONE — the scene ships exactly
  // ONE fixed view, and a single view needs no selector and no label. No markup may name a view.
  assert.doesNotMatch(html, /camera-select/, 'no camera selector survives the single view');
  assert.doesNotMatch(html, /viewer-camera/, 'the floating camera control leaves the viewer');
  assert.doesNotMatch(html, /<option/, 'no view list of any kind remains in the shell');
  for (const viewLabel of ['Red completa', 'Planta térmica', 'Fachada', 'Dulcería', 'Boletos']) {
    assert.doesNotMatch(html, new RegExp(viewLabel), `no UI label may name a view (${viewLabel})`);
  }
});

test('main.js drops the deck AND camera wiring: the scene boots pinned to its one view', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  // Client round 3 (2026-07-18): the dead deck handlers left with their DOM. The module APIs
  // (applyInteraction, layerController, query-state hydrate) stay — deep links keep working.
  assert.doesNotMatch(main, /data-mode/);
  assert.doesNotMatch(main, /data-layer/);
  assert.doesNotMatch(main, /cutaway-toggle/);
  assert.doesNotMatch(main, /fullscreen/i);
  assert.doesNotMatch(main, /updatePressedState/);
  // Single-view correction (2026-07-18): the camera select died, and with it every view-switch
  // path — no select wiring, no section camera jumps. The boot applies the ONE pinned preset
  // from the query-state constant and nothing rewires it. CONTRACT CHANGE (client round 5):
  // data-light-scene RETURNS as a pure view-state control — it writes `lightScene` into the
  // section view and re-renders; it must never reach the camera controller.
  assert.doesNotMatch(main, /camera-select|cameraSelect/);
  assert.doesNotMatch(main, /data-room-view|roomView/, 'section pages promise no camera jumps');
  assert.match(main, /data-light-scene/, 'scene selection rides the delegated view-state pattern');
  assert.doesNotMatch(main, /lightScene[^\n]*applyPreset|applyPreset[^\n]*lightScene/,
    'a scene selection never touches the camera');
  assert.match(main, /cameraController\.applyPreset\(queryState\.camera\)/, 'boot pins the single view');
  assert.match(main, /layerController\.hydrate\(queryState\)/, 'URL deep links still drive layers/cutaway');
  assert.match(main, /applyInteraction\(/, 'the interaction pipeline survives the deck');
});
