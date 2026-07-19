/**
 * P2-3 dock-section tests (TDD-first) — registry order, builders and section↔scene wiring
 * for the DHL workbench dock.
 *
 * Contract under test (BRIEF items 5/7 + phase-2 work order + the full-page direction):
 *   - the ten sections, in the BRIEF's grouped order (Operación / Análisis);
 *   - every builder renders a non-empty HTML string; unknown ids fail loudly;
 *   - Alertas shows the sim's one warn instance; Energía's rollup equals its table;
 *   - Tendencias renders 24 h sparklines per equipment (two per unit) carrying the
 *     data-points/data-unit hover contract;
 *   - full-page layout: no `long` jump-back flag remains; HVAC/Cuarto carry a PLAIN
 *     "Ver en la sala" navigation jump (no camera promise); Horarios lays its windows
 *     out as a real 7-day weekly grid;
 *   - single fixed view (client round 3 correction): the product surface has exactly ONE
 *     view — no section names a camera, no per-section chip forcing remains, and no
 *     user-facing copy names a view or view switching;
 *   - Iluminación scenes vary the existing rig deterministically (three distinct presets);
 *   - client round 3 (BMS reference as CONTENT guide): HVAC is a unit card grid with a
 *     read-only detail aside; Cuarto renders Plant-Room equipment cards plus the loop
 *     summary; Energía leads with KPI heroes; Alertas gains category chips + pager;
 *     Clima is a hero + 7-day strip; Tendencias groups under category headers.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { EQUIPMENT_INSTANCES, createEquipmentModel } from '../src/sim/equipment.mjs';
import {
  ALERTS_PAGE_SIZE,
  LIGHTING_SCENES,
  MENU_GROUPS,
  SECTIONS,
  SECTION_IDS,
  deriveAlertRows,
  deriveEnergyRows,
  deriveFanRows,
  deriveFleetRows,
  deriveHvacRows,
  energyRowsToCsv,
  fanRowsToCsv,
  fleetRowsToCsv,
  hvacRowsToCsv,
  renderSectionHtml,
} from '../src/dock/sections.mjs';
import { ALERT_CATEGORIES, createEnergyRollup, createSiteAlerts } from '../src/sim/site.mjs';

test('registry order: the ten BRIEF sections in the two menu groups', () => {
  assert.deepEqual(SECTION_IDS, [
    'tablero', 'hvac', 'ventiladores', 'cuarto', 'iluminacion',
    'energia', 'tendencias', 'alertas', 'clima', 'horarios',
  ]);
  assert.deepEqual(MENU_GROUPS.map(({ id }) => id), ['operacion', 'analisis']);
  assert.deepEqual(MENU_GROUPS.flatMap(({ sections }) => [...sections]), SECTION_IDS);
  for (const id of SECTION_IDS) {
    assert.ok(SECTIONS[id].label.length > 0, `${id} label`);
    assert.ok(SECTIONS[id].sub.length > 0, `${id} sub`);
    // Full-page direction: the sticky "↑ Modelo 3D" jump-back is gone (pages carry a
    // breadcrumb header instead), so the `long` flag has no consumer and must not linger.
    assert.ok(!('long' in SECTIONS[id]), `${id} carries no dead long flag`);
  }
});

test('single fixed view: no section names a camera and no per-section chip forcing remains', () => {
  // Client round 3 correction: the 3D room gets exactly ONE fixed view (the whole-room
  // framing). The old per-section `camera` field and the `forceChips` override are gone —
  // sections can no longer select, force or even NAME a view; chips keep their global
  // default (ON) everywhere.
  for (const id of SECTION_IDS) {
    assert.ok(!('camera' in SECTIONS[id]), `${id}: no section names a camera`);
    assert.ok(!('forceChips' in SECTIONS[id]), `${id}: no section forces chips`);
  }
});

test('every section builder renders non-empty HTML; unknown ids throw', () => {
  for (const id of SECTION_IDS) {
    const html = renderSectionHtml(id, { tick: 0 });
    assert.ok(html.length > 40, `${id} renders content`);
    assert.ok(html.includes('class="card'), `${id} uses the card vocabulary`);
    assert.ok(!html.includes('—'), `${id}: em dashes are banned in copy`);
  }
  assert.throws(() => renderSectionHtml('nope', { tick: 0 }), RangeError);
});

test('Alertas: the sim warn unit appears, labeled, at any tick', () => {
  for (const tick of [0, 31, 100]) {
    const model = createEquipmentModel({ tick });
    const warnUnit = model.byId.get(model.warnId);
    const html = renderSectionHtml('alertas', { tick });
    assert.ok(html.includes(warnUnit.label), `tick ${tick}: warn unit ${warnUnit.id} shows up`);
    assert.ok(html.includes('advertencia') || html.includes('Advertencia'), `tick ${tick}`);
  }
});

test('Energía (round-4 mirror): three period cards + distribution donut + sparkline table', () => {
  const tick = 31;
  const rollup = createEnergyRollup({ tick });
  const html = renderSectionHtml('energia', { tick });
  // Four top cards: Ahora / Día anterior / Mes (kpi-hero) + a distribution donut card.
  assert.equal((html.match(/kpi-hero/g) ?? []).length, 4, 'three period heroes + the donut card');
  assert.ok(html.includes('class="donut"'), 'the distribution donut renders');
  assert.ok(html.includes(rollup.nowKw.toFixed(1)), 'Ahora quotes the live fleet kW');
  // Distribution: shares sum to 100.0 and the TI segment IS the instrumented rack rollup.
  const pctSum = Number(rollup.distribution.segments.reduce((acc, s) => acc + s.pct, 0).toFixed(1));
  assert.equal(pctSum, 100);
  for (const seg of rollup.distribution.segments) {
    assert.ok(html.includes(seg.pct.toFixed(1)), `${seg.key} share shown`);
  }
  // Per-unit sparkline table: sortable kW, functional page-size, every instrumented row present.
  assert.ok(html.includes('data-energy-sort="kw"'), 'kW column is sortable');
  assert.ok(html.includes('data-energy-page-size'), 'page-size select present');
  const data = deriveEnergyRows({ tick });
  assert.equal(data.total, 7, 'racks + in-row + PDU + UPS instrumented rows');
  for (const row of data.rows) assert.ok(html.includes(row.kw.toFixed(1)), `${row.id} kW present`);
  // The CSV export round-trips the current rows.
  assert.ok(energyRowsToCsv(data.rows).startsWith('Unidad,Tipo'));
});

test('Tendencias: two 24 h sparklines per registered equipment, hover data embedded', () => {
  const html = renderSectionHtml('tendencias', { tick: 0 });
  const cards = html.match(/trend-card/g) ?? [];
  assert.equal(cards.length, EQUIPMENT_INSTANCES.length);
  const sparks = html.match(/<svg class="chispa"/g) ?? [];
  assert.equal(sparks.length, EQUIPMENT_INSTANCES.length * 2);
  // F2b hover contract: every sparkline carries its 24 hourly points and unit as data
  // attributes for the workbench's delegated tooltip (hora + valor).
  const dataPoints = html.match(/data-points="[^"]+"/g) ?? [];
  assert.equal(dataPoints.length, EQUIPMENT_INSTANCES.length * 2);
  for (const attr of dataPoints) {
    assert.equal(attr.split(',').length, 24, 'each sparkline embeds its 24 hourly points');
  }
  const dataUnits = html.match(/data-unit="[^"]*"/g) ?? [];
  assert.equal(dataUnits.length, EQUIPMENT_INSTANCES.length * 2);
  for (const { label } of EQUIPMENT_INSTANCES) {
    assert.ok(html.includes(label), `${label} card present`);
  }
});

test('Tendencias: the cards group under category headers — Térmicas then Energía', () => {
  // Client round 3 (Trend-Logs style): the same cards, same sparklines, same hover contract,
  // regrouped by gauge family. Térmicas = crac + inrow + rack + dry (9 units), Energía =
  // pdu + ups (2). No unit is dropped and no third group is invented.
  const html = renderSectionHtml('tendencias', { tick: 0 });
  const heads = [...html.matchAll(/class="trend-group-head">([^<]+)</g)].map(([, title]) => title);
  assert.deepEqual(heads, ['Térmicas', 'Energía']);
  const groups = html.split('trend-group-head').slice(1);
  const countCards = (chunk) => (chunk.match(/trend-card/g) ?? []).length;
  assert.equal(countCards(groups[0]), 9, 'thermal family: 3 CRAC + 2 in-row + 3 racks + dry');
  assert.equal(countCards(groups[1]), 2, 'electrical family: PDU + UPS');
});

test('full pages: "Ver en la sala" is plain navigation naming no view; Iluminación says where it lands', () => {
  // Single-view correction: the jump is honest navigation back to the Tablero room —
  // it no longer promises (or performs) any camera change or chip forcing, and its copy
  // names no view. "Pasillo frío" as a PHYSICAL aisle stays legal elsewhere; here the
  // old copy tied it to a camera move, so it goes.
  for (const sectionId of ['hvac', 'cuarto']) {
    const html = renderSectionHtml(sectionId, { tick: 0 });
    assert.ok(html.includes('data-room-jump'), `${sectionId}: plain navigation jump present`);
    assert.ok(!html.includes('data-room-view'), `${sectionId}: no camera-preset jump remains`);
    assert.ok(!html.includes('data-room-chips'), `${sectionId}: no chip forcing remains`);
    assert.ok(!/c[áa]mara/i.test(html), `${sectionId}: copy names no camera`);
    assert.ok(!/[óo]rbita/i.test(html), `${sectionId}: copy names no orbit framing`);
    assert.ok(!/vista/i.test(html), `${sectionId}: copy names no view`);
  }
  const iluminacion = renderSectionHtml('iluminacion', { tick: 0 });
  assert.ok(iluminacion.includes('se aplica a la sala 3D del Tablero'),
    'Iluminación labels honestly where the scene lands');
});

test('HVAC (round-4 mirror): KPI strip + technical toolbar table (search/filters/CSV/sort/pager)', () => {
  const html = renderSectionHtml('hvac', { tick: 0 });
  const data = deriveHvacRows({ tick: 0 });
  assert.equal(data.thermalTotal, 8, '3 CRAC + 2 in-row + 3 racks');
  // KPI strip: "Ver en la sala" promo + three derived tiles (avg supply, out-of-band, cooling).
  assert.ok(html.includes('kpi-row-4') && html.includes('data-room-jump'), 'promo + KPI strip');
  assert.ok(html.includes(data.avgSupply.toFixed(1)), 'avg supply-temp KPI is derived');
  assert.ok(html.includes(`${data.outOfBand} / ${data.thermalTotal}`), 'units-out-of-band N / M');
  assert.ok(html.includes(`${data.coolingCount} / ${data.thermalTotal}`), 'cooling count N / M');
  // Toolbar: diacritic-insensitive search + Filtros + Exportar CSV.
  assert.ok(html.includes('data-hvac-search'), 'search box');
  assert.ok(html.includes('data-export-csv'), 'CSV export');
  // Sortable headers carry aria-sort.
  assert.ok(html.includes('data-hvac-sort="unidad"') && html.includes('data-hvac-sort="temp"'));
  assert.ok(html.includes('aria-sort'), 'headers expose aria-sort');
  for (const row of data.rows) assert.ok(html.includes(row.id), `${row.id} row present`);
  // Filtros popover opens through the view state with truthful status chips.
  const open = renderSectionHtml('hvac', { tick: 0, view: { hvacFilters: true } });
  assert.ok(open.includes('filter-pop') && open.includes('data-hvac-mode="warn"'), 'status filter chips');
  // Search + sort re-derive through the same pure builder (no DOM).
  const searched = deriveHvacRows({ tick: 0, view: { hvacQuery: 'crác' } });
  assert.ok(searched.rows.length === 3 && searched.rows.every((r) => r.kind === 'crac'), 'diacritic-insensitive');
  const sorted = deriveHvacRows({ tick: 0, view: { hvacSort: 'temp', hvacDir: 'desc' } });
  assert.ok(sorted.rows[0].temp >= sorted.rows.at(-1).temp, 'temp sort desc');
  // CSV serializer round-trips the header.
  assert.ok(hvacRowsToCsv(data.rows).startsWith('Unidad,Tipo'));
});

test('Cuarto (round-5 mirror): intro/promo + KPIs + Flota table + read-only loop-summary aside', () => {
  const model = createEquipmentModel({ tick: 0 });
  const html = renderSectionHtml('cuarto', { tick: 0 });
  const data = deriveFleetRows({ tick: 0 });
  assert.equal(data.total, 3, 'UPS + PDU + dry cooler plant units');
  // Top strip: intro + "Ver en la sala" promo + four KPIs.
  assert.ok(html.includes('cuarto-strip') && html.includes('data-room-jump'), 'strip + real navigation');
  // Flota toolbar table: search + kind Filtros + CSV + every plant row.
  assert.ok(html.includes('data-cuarto-search') && html.includes('data-export-csv'), 'Flota toolbar');
  for (const row of data.rows) assert.ok(html.includes(row.id), `${row.id} row present`);
  const ups = model.byId.get('ups-01').values;
  const dry = model.byId.get('dry-01').values;
  assert.ok(html.includes(`${ups.runtimeMin} min`), 'UPS autonomy is the sim value');
  // The chilled-water loop summary is DHL's truthful analog of the RS-485 rack aside: mini-stats,
  // the one ambient source + water in/out/approach — read-only, zero fake plant controls.
  assert.ok(html.includes('mini-stats'), 'the loop summary renders as mini-stats');
  assert.ok(html.includes(dry.ambientC.toFixed(1)) && html.includes(dry.waterOutC.toFixed(1)),
    'loop summary quotes the ambient source and water out');
  assert.ok(html.includes(dry.approachK.toFixed(1)), 'dry cooler approach is the sim value');
  // The only inputs are the toolbar search/select — no fake plant controls are simulated.
  assert.ok(!html.includes('type="range"') && !html.includes('type="number"'), 'no fake control inputs');
  assert.ok(fleetRowsToCsv(data.rows).startsWith('Unidad,Tipo'));
});

test('Alertas (round-4 mirror): category chips + severity summary cards + kebab + numbered pager + aside', () => {
  const tick = 0;
  const data = deriveAlertRows({ tick });
  const [alert] = createSiteAlerts({ tick }).alerts;
  const html = renderSectionHtml('alertas', { tick });
  // Category chips: Todas + one per closed-vocabulary category (universe counts).
  assert.equal((html.match(/data-alert-cat=/g) ?? []).length, ALERT_CATEGORIES.length + 1);
  assert.ok(html.includes('data-alert-cat="all" aria-pressed="true"'), 'static default: all categories');
  // Three severity summary cards (Críticas / Advertencia / Resueltas hoy), each a chevron filter.
  assert.equal((html.match(/data-alert-sev=/g) ?? []).length, 3);
  assert.ok(html.includes('Resueltas (hoy)'), 'resolved-today summary card');
  assert.equal(data.counts.criticas, 0, 'no alarms by construction');
  assert.equal(data.counts.advertencia, 1, 'exactly one warn');
  assert.equal(data.counts.resueltas, 0, 'honest zero resolved episodes (margin-safe sim)');
  // Dense table: Equipo / Categoría / Severidad / Detalle / Fecha-hora (sortable) / Estado + kebab.
  for (const column of ['Equipo', 'Categoría', 'Severidad', 'Detalle', 'Estado']) {
    assert.ok(html.includes(column), `${column} column present`);
  }
  assert.ok(html.includes('data-alert-sort="fecha"'), 'timestamp column sortable');
  assert.ok(html.includes(alert.label), 'the row names the warn unit');
  assert.equal((html.match(/class="cat-cell"/g) ?? []).length, 1, 'the one row leads with its category glyph');
  assert.ok((html.match(/class="sev sev-(?:warn|critical)"/g) ?? []).length >= 1, 'severity is a dot badge');
  assert.ok(html.includes('data-alert-menu'), 'kebab per row');
  assert.ok(html.includes('data-alert-page-size'), 'functional page-size select');
  assert.ok(ALERTS_PAGE_SIZE === 10, 'default page size mirrored to 10');
  // Derivación aside with the decorative handcrafted illustration.
  assert.ok(html.includes('deriv-card') && html.includes('deriv-art'), 'Derivación aside + decorative art');
  // Severity chevron filters through the same builder; an empty severity says so honestly.
  const crit = renderSectionHtml('alertas', { tick, view: { alertSev: 'alarma' } });
  assert.ok(crit.includes('Sin alertas'), 'no crítica rows → honest empty state');
  // Category filter keeps the warn row under its own family.
  const match = renderSectionHtml('alertas', { tick, view: { alertCat: alert.category } });
  assert.ok(match.includes(alert.label) && match.includes(`data-alert-cat="${alert.category}" aria-pressed="true"`));
  // Kebab opens a menu with a real "Copiar detalle" action.
  const menu = renderSectionHtml('alertas', { tick, view: { alertMenu: `${data.pageRows[0].id}-0` } });
  assert.ok(menu.includes('action-menu') && menu.includes('data-copy-detail'));
});

test('Tablero: digest of all eleven units plus the folded room legend', () => {
  const html = renderSectionHtml('tablero', { tick: 0 });
  for (const { label } of EQUIPMENT_INSTANCES) {
    assert.ok(html.includes(label), `${label} in the estado table`);
  }
  assert.ok(html.includes('Leyenda'), 'the old #legend folds into a Tablero card');
});

test('Iluminación: three deterministic rig presets, mutually distinct', () => {
  assert.deepEqual(Object.keys(LIGHTING_SCENES), ['dia', 'mantenimiento', 'noche']);
  const rigs = Object.values(LIGHTING_SCENES).map(({ rig }) => rig);
  for (const rig of rigs) {
    for (const channel of ['ambient', 'key', 'fill', 'rim']) {
      assert.equal(typeof rig[channel], 'number', `${channel} is a number`);
      assert.ok(rig[channel] > 0, `${channel} keeps the room lit`);
    }
  }
  const signatures = rigs.map((rig) => JSON.stringify(rig));
  assert.equal(new Set(signatures).size, 3, 'the three presets differ');
  const html = renderSectionHtml('iluminacion', { tick: 0 });
  for (const key of Object.keys(LIGHTING_SCENES)) {
    assert.ok(html.includes(`data-light-scene="${key}"`), `${key} button present`);
  }
});

test('Horarios (round-5 mirror): week grid + countdown banner + weekly summary + nota aside; Clima quotes the ambient source', () => {
  const horarios = renderSectionHtml('horarios', { tick: 0 });
  const dayHeads = horarios.match(/class="week-day-head"/g) ?? [];
  assert.equal(dayHeads.length, 7, 'the week grid renders all seven day columns');
  const slots = horarios.match(/class="week-equip"/g) ?? [];
  assert.equal(slots.length, EQUIPMENT_INSTANCES.length, 'every window becomes exactly one slot');
  for (const { label } of EQUIPMENT_INSTANCES) {
    assert.ok(horarios.includes(label), `${label} maintenance window`);
  }
  // Next-change countdown banner + weekly-summary KPIs + truthful nota aside + history toggle.
  assert.ok(horarios.includes('next-change') && /En \d+ (h|min)/.test(horarios), 'countdown banner');
  assert.ok(horarios.includes('resumen-semanal'), 'weekly summary KPIs');
  assert.ok(horarios.includes('nota-card') && horarios.includes('Lineamientos'), 'truthful nota aside');
  assert.ok(horarios.includes('data-horarios-history'), 'history toggle present');
  const history = renderSectionHtml('horarios', { tick: 0, view: { horariosHistory: true } });
  assert.ok(history.includes('history-list'), 'the toggle reveals today\'s windows');

  const clima = renderSectionHtml('clima', { tick: 0 });
  assert.ok(clima.includes('31.5'), 'the exterior reading is SIM_POLICY.ambientC itself');
  assert.ok(clima.includes('dry cooler'), 'the copy names the coupling to the dry cooler');
});

test('Clima (round-5 mirror): hero + 5-per-page carousel + derived cards + condition summary', () => {
  const html = renderSectionHtml('clima', { tick: 0 });
  assert.ok(html.includes('clima-hero'), 'current conditions render as a hero');
  assert.ok(html.includes('Humedad') && html.includes('Viento'), 'hero quotes seeded humidity/wind');
  assert.ok(html.includes('class="clima-glyph"'), 'the hero shows the current condition glyph');
  // Carousel: 5 day chips per page, two functional dots, labeled honestly.
  assert.equal((html.match(/class="dia"/g) ?? []).length, 5, 'five day chips per page');
  assert.equal((html.match(/data-clima-page=/g) ?? []).length, 2, 'two functional carousel dots');
  assert.ok(html.includes('Próximos 5 días'), 'the carousel is labeled honestly');
  const page2 = renderSectionHtml('clima', { tick: 0, view: { climaPage: 1 } });
  assert.equal((page2.match(/class="dia"/g) ?? []).length, 2, 'page 2 shows the remaining two days');
  // Derived cards: UV, Sensación térmica, Probabilidad de lluvia, Relación con demanda HVAC.
  for (const label of ['Índice UV', 'Sensación térmica', 'Probabilidad de lluvia', 'Relación con demanda HVAC']) {
    assert.ok(html.includes(label), `${label} card present`);
  }
  // Condition summary strip: dew / visibility / pressure.
  assert.ok(html.includes('cond-strip') && html.includes('Punto de rocío') && html.includes('Presión atmosférica'));
  // Honest cut is labeled: DHL's fixed exterior ambient means no intra-day sensación trend.
  assert.ok(html.includes('sin variación intradía'), 'the feels-like cut is documented');
});

test('Tendencias: every tile carries a timeframe subtitle (visual fidelity pass)', () => {
  const html = renderSectionHtml('tendencias', { tick: 0 });
  assert.equal((html.match(/class="trend-sub"/g) ?? []).length, EQUIPMENT_INSTANCES.length,
    'one timeframe subtitle per instrument tile');
});
