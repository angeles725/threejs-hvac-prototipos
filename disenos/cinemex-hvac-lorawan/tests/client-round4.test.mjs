/**
 * Client round 4 (2026-07-18) — three approved mockups over the deterministic sims.
 * Written FIRST (strict TDD). Contracts:
 *  - Energía sim grows a documented seeded distribution split (4 segments, shares sum to 100),
 *    period comparisons (vs same previous day / vs previous month) and sparkline series.
 *  - Alertas sim grows a resolved-episode walk over the sim day (30-min grid, deterministic).
 *  - HVAC section becomes KPI strip + sortable/filterable/searchable table with CSV export
 *    (pure row derivation + pure serializer).
 *  - Shell gains the sidebar brand block; main.js wires the new delegated view-state patterns.
 * Every visible number derives from the sims — mockup values are illustrative only.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TC300_DEVICES } from '../src/config.mjs';
import { createDashboardModel } from '../src/dashboard/model.mjs';
import {
  createEnergyDistribution,
  createEnergyModel,
  createFleetEnergySeries,
  createMonthDailySeries,
  createPreviousDaySeries,
  createUnitEnergySeries,
  ENERGY_POLICY,
} from '../src/sim/energy.mjs';
import {
  createAlertsModel,
  deriveResolvedEpisodes,
  RESOLVED_POLICY,
} from '../src/sim/alerts.mjs';
import {
  ALERTS_PAGE_SIZE,
  deriveHvacRows,
  formatSimDateTime,
  hvacRowsToCsv,
  renderSectionHtml,
} from '../src/dock/sections.mjs';

// ---------------------------------------------------------------------------
// Energía sim: distribution split, comparisons, sparkline series
// ---------------------------------------------------------------------------

test('energy distribution: four seeded segments whose shares sum to exactly 100', () => {
  const dist = createEnergyDistribution({ tick: 0 });
  assert.deepEqual(dist, createEnergyDistribution({ tick: 0 }), 'same tick, same split');
  assert.deepEqual(
    dist.segments.map(({ label }) => label),
    ['Climatización', 'Ventilación', 'Iluminación', 'Otros'],
  );
  const shareSum = dist.segments.reduce((total, { sharePct }) => total + sharePct, 0);
  assert.equal(Number(shareSum.toFixed(1)), 100, 'one-decimal shares sum to exactly 100');
  for (const segment of dist.segments) {
    assert.ok(segment.sharePct > 0 && segment.sharePct < 80, `${segment.label} share out of bounds`);
    assert.ok(segment.kw > 0);
  }
  // The RTU compression load dominates the building by construction.
  assert.ok(
    dist.segments[0].sharePct >= Math.max(...dist.segments.slice(1).map(({ sharePct }) => sharePct)),
    'Climatización is the dominant share',
  );
  // The split is auditable: segment kW adds up to the total it claims.
  const kwSum = dist.segments.reduce((total, { kw }) => total + kw, 0);
  assert.ok(Math.abs(kwSum - dist.totalKw) < 0.5, 'segment kW audits against the total');
  // The live RTU wave moves the split with the tick.
  assert.notDeepEqual(dist.segments, createEnergyDistribution({ tick: 900 }).segments);
});

test('energy model derives the period comparisons deterministically', () => {
  const model = createEnergyModel({ tick: 0 });
  assert.ok(Number.isInteger(model.dayBeforeKwh) && model.dayBeforeKwh > 0);
  assert.equal(
    model.vsSameDayPct,
    Number((((model.previousDayKwh - model.dayBeforeKwh) / model.dayBeforeKwh) * 100).toFixed(1)),
    'the day comparison audits against its own kWh pair',
  );
  assert.ok(Number.isInteger(model.previousMonthKwh) && model.previousMonthKwh > 0);
  assert.equal(
    model.vsPreviousMonthPct,
    Number((((model.monthKwh - model.previousMonthKwh) / model.previousMonthKwh) * 100).toFixed(1)),
    'the month comparison audits against its own kWh pair',
  );
  assert.ok(Math.abs(model.vsSameDayPct) <= 8, 'sensible day-over-day bound');
  assert.ok(Math.abs(model.vsPreviousMonthPct) <= 8, 'sensible month-over-month bound');
  assert.deepEqual(model, createEnergyModel({ tick: 0 }));
});

test('fleet and period sparkline series are seeded, sized and deterministic', () => {
  const fleet = createFleetEnergySeries();
  assert.equal(fleet.length, ENERGY_POLICY.points);
  assert.deepEqual(fleet, createFleetEnergySeries());
  // The fleet series is the pointwise sum of the fourteen unit series — auditable.
  const unitSeries = TC300_DEVICES.map((_, index) => createUnitEnergySeries(index));
  for (const [index, value] of fleet.entries()) {
    const manual = unitSeries.reduce((total, series) => total + series[index], 0);
    assert.ok(Math.abs(value - manual) < 0.06, `fleet point ${index} audits against the unit sum`);
  }
  const previousDay = createPreviousDaySeries();
  assert.equal(previousDay.length, ENERGY_POLICY.points);
  assert.deepEqual(previousDay, createPreviousDaySeries());
  assert.ok(previousDay.every((value) => value > 0));
  const month = createMonthDailySeries();
  assert.equal(month.length, ENERGY_POLICY.monthPoints);
  assert.deepEqual(month, createMonthDailySeries());
  assert.ok(month.every((value) => value > 0));
  assert.notDeepEqual(previousDay, fleet, 'yesterday rides its own seeded stream');
});

// ---------------------------------------------------------------------------
// Alertas sim: resolved episodes over the sim day
// ---------------------------------------------------------------------------

test('resolved episodes walk the sim day on the 30-min grid, deterministically', () => {
  assert.equal(RESOLVED_POLICY.sampleStrideTicks, 360, '30 sim-minutes at 5 s/tick — the series grid');
  const episodes = deriveResolvedEpisodes({ tick: 0 });
  assert.deepEqual(episodes, deriveResolvedEpisodes({ tick: 0 }), 'same tick, same episodes');
  assert.ok(episodes.length > 0, 'the oscillating sim day has normalized episodes by noon');
  for (const episode of episodes) {
    assert.ok(['Temperatura', 'HVAC'].includes(episode.category),
      'episodes walk the smooth thermal/demand series only');
    assert.match(episode.severity, /^(advertencia|crítica)$/);
    assert.ok(Number.isInteger(episode.resolvedTick) && episode.resolvedTick <= 0);
    assert.match(episode.resolvedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'resolution rides the sim clock');
    assert.ok(episode.message.length > 0);
    assert.ok(episode.id.includes(String(episode.resolvedTick)), 'episode ids stay unique per resolution');
  }
  const ticks = episodes.map(({ resolvedTick }) => resolvedTick);
  assert.deepEqual([...ticks].sort((a, b) => b - a), ticks, 'newest resolution first');
});

test('alerts model carries the resolved day walk and the sim timestamp', () => {
  const model = createAlertsModel({ tick: 0 });
  assert.deepEqual(model.resolved, deriveResolvedEpisodes({ tick: 0 }));
  assert.equal(model.resolvedToday, model.resolved.length);
  assert.match(model.timestamp, /^2026-01-01T12:00:00/, 'tick 0 is the sim epoch noon');
  assert.deepEqual(createAlertsModel({ tick: 0 }), model, 'the extended model stays deterministic');
});

// ---------------------------------------------------------------------------
// Shared formatting: sim-clock dates in the mockup format
// ---------------------------------------------------------------------------

test('formatSimDateTime renders the mockup date format from the sim clock', () => {
  assert.equal(formatSimDateTime('2026-01-01T12:00:00.000Z'), '1 Ene 2026 12:00');
  assert.equal(formatSimDateTime('2026-03-20T09:05:30.000Z'), '20 Mar 2026 09:05');
  assert.equal(formatSimDateTime('2025-12-31T23:30:00.000Z'), '31 Dic 2025 23:30');
  assert.equal(formatSimDateTime(null), 'N/D', 'a missing clock renders the es-MX convention');
});

// ---------------------------------------------------------------------------
// HVAC rows: pure derivation (search/filter/sort) + CSV serializer
// ---------------------------------------------------------------------------

test('hvac rows derive, search, filter and sort purely over the view state', () => {
  const base = deriveHvacRows({ tick: 0 });
  assert.deepEqual(base, deriveHvacRows({ tick: 0 }), 'same tick+view, same rows');
  assert.equal(base.rows.length, 14);
  assert.equal(base.rows[0].unitId, 'RTU-01', 'default sort: unidad ascending');
  assert.equal(base.rows.at(-1).unitId, 'RTU-14');
  assert.equal(base.modeCounts.cooling + base.modeCounts.standby, 14, 'the legend audits');

  // Search is case- and diacritic-insensitive over unit tag and zone name.
  const byZone = deriveHvacRows({ tick: 0, view: { hvacQuery: 'DULCERIA' } });
  assert.equal(byZone.rows.length, 1);
  assert.equal(byZone.rows[0].zoneLabel, 'Dulcería');
  const byUnit = deriveHvacRows({ tick: 0, view: { hvacQuery: 'rtu-0' } });
  assert.equal(byUnit.rows.length, 9, 'RTU-01…09 match the tag query');

  // Mode filter speaks only the truthful states.
  const cooling = deriveHvacRows({ tick: 0, view: { hvacMode: 'cooling' } });
  assert.ok(cooling.rows.length > 0);
  assert.ok(cooling.rows.every(({ mode }) => mode === 'cooling'));
  const standby = deriveHvacRows({ tick: 0, view: { hvacMode: 'standby' } });
  assert.equal(cooling.rows.length + standby.rows.length, 14);

  // Temp sort, both directions.
  const desc = deriveHvacRows({ tick: 0, view: { hvacSort: 'temp', hvacDir: 'desc' } });
  const temps = desc.rows.map(({ temperature }) => temperature);
  assert.deepEqual([...temps].sort((a, b) => b - a), temps);
  const asc = deriveHvacRows({ tick: 0, view: { hvacSort: 'temp', hvacDir: 'asc' } });
  assert.deepEqual(asc.rows.map(({ temperature }) => temperature), [...temps].reverse());
});

test('hvac CSV serializer is a pure function and escapes fields', () => {
  const { rows } = deriveHvacRows({ tick: 0 });
  const csv = hvacRowsToCsv(rows);
  assert.equal(csv, hvacRowsToCsv(rows), 'same rows, same bytes');
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 15, 'header + 14 rows');
  assert.match(lines[0], /^Unidad,/);
  assert.match(lines[1], /^RTU-01,TC300-01,/);
  const escaped = hvacRowsToCsv([{
    unitId: 'RTU-99', tc300Id: 'TC300-99', zoneLabel: 'Sala, "VIP"',
    temperature: 22, setpoint: 22, deviation: 0, mode: 'standby',
  }]);
  assert.match(escaped, /"Sala, ""VIP"""/, 'commas and quotes are CSV-escaped');
});

// ---------------------------------------------------------------------------
// HVAC section HTML (mockup 1)
// ---------------------------------------------------------------------------

test('hvac renders the four-card strip: promo + three derived KPI cards with info tooltips', () => {
  const html = renderSectionHtml('hvac', { tick: 0 });
  // Promo card: copy about the live 3D model + a REAL navigation to Tablero. No view names.
  assert.match(html, /Ver en la sala/);
  assert.match(html, /data-go-section="tablero"/, 'the button actually navigates');
  // KPI 1: mean of the fourteen live zone temperatures.
  const units = createDashboardModel({ tick: 0 }).units;
  const mean = (units.reduce((total, { temperature }) => total + temperature, 0) / units.length).toFixed(1);
  assert.match(html, /Temp\. promedio/i);
  assert.match(html, new RegExp(mean.replace('.', '\\.')));
  assert.match(html, /Todas las zonas/);
  // KPI 2: zones outside ±1.5 °C, as "N / 14".
  const outside = units.filter(({ temperature, band }) => temperature < band[0] || temperature > band[1]).length;
  assert.match(html, /Zonas fuera de banda/i);
  assert.match(html, new RegExp(`${outside}\\s*<small>/ 14</small>`));
  assert.match(html, /Requieren atención/);
  // KPI 3: cooling units as "N / 14" + "% del total".
  const model = deriveHvacRows({ tick: 0 });
  assert.match(html, /Equipos enfriando/i);
  assert.match(html, new RegExp(`${model.modeCounts.cooling}\\s*<small>/ 14</small>`));
  assert.match(html, new RegExp(`${Math.round((model.modeCounts.cooling / 14) * 100)}% del total`));
  // Every KPI card carries an accessible derivation tooltip (title + aria-label).
  const infos = html.match(/class="kpi-info"[^>]*title="[^"]+"[^>]*aria-label="[^"]+"/g) ?? [];
  assert.equal(infos.length, 3, 'three info glyphs explain their derivations');
  // No section may name a camera view.
  assert.doesNotMatch(html, /Red completa|[Pp]lanta térmica|Fachada/);
});

test('hvac renders the unidades table: toolbar, sortable headers, truthful rows, footer', () => {
  const html = renderSectionHtml('hvac', { tick: 0 });
  assert.match(html, /Unidades por zona/i);
  // Toolbar: live search, filters toggle, CSV export — all wired, none decorative.
  assert.match(html, /data-hvac-search/);
  assert.match(html, /placeholder="Buscar unidad o zona…"/);
  assert.match(html, /data-hvac-filters/);
  assert.match(html, /data-export-csv/);
  // Sortable UNIDAD + TEMP headers with aria-sort; default unidad ascending.
  assert.match(html, /aria-sort="ascending"[^>]*>\s*<button[^>]*data-hvac-sort="unidad"/);
  assert.match(html, /data-hvac-sort="temp"/);
  // Rows: "RTU-01 · TC300-01" pair, signed deviation inks, truthful mode pills, working chevron.
  assert.match(html, /RTU-01<\/b> · TC300-01/);
  assert.ok((html.match(/class="dev-(?:pos|neg|zero)/g) ?? []).length >= 14, 'every row inks its deviation');
  assert.match(html, /dashboard\.html\?unit=RTU-01/, 'the chevron reuses the unit-page mechanism');
  // Footer: live legend + honest count + pager (one page → both ends disabled but present).
  assert.match(html, /En espera/);
  assert.match(html, /Enfriando/);
  assert.match(html, /Mostrando 1 a 14 de 14 unidades/);
  assert.match(html, /data-hvac-page="prev"[^>]*disabled/);
  assert.match(html, /data-hvac-page="next"[^>]*disabled/);
  // The zone-card grid this table replaces must not resurrect.
  assert.doesNotMatch(html, /data-zone-detail|zone-card/);
});

test('hvac view state drives search, mode filter and sorting deterministically', () => {
  const searched = renderSectionHtml('hvac', { tick: 0, view: { hvacQuery: 'dulceria' } });
  assert.match(searched, /Dulcería/);
  assert.doesNotMatch(searched, /Vestíbulo y recepción/);
  assert.match(searched, /value="dulceria"/, 'the input keeps its query across re-renders');
  assert.match(searched, /Mostrando 1 a 1 de 1 unidades/);

  const filtered = renderSectionHtml('hvac', { tick: 0, view: { hvacFilters: true, hvacMode: 'cooling' } });
  assert.match(filtered, /data-hvac-mode="cooling"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(filtered, /pill-ok">En espera/, 'only cooling rows remain');

  const sorted = renderSectionHtml('hvac', { tick: 0, view: { hvacSort: 'temp', hvacDir: 'desc' } });
  assert.match(sorted, /aria-sort="descending"[^>]*>\s*<button[^>]*data-hvac-sort="temp"/);
  assert.equal(sorted, renderSectionHtml('hvac', { tick: 0, view: { hvacSort: 'temp', hvacDir: 'desc' } }));
});

// ---------------------------------------------------------------------------
// Energía section HTML (mockup 2)
// ---------------------------------------------------------------------------

test('energía renders the four-card row: three period KPIs with sparklines + the donut', () => {
  const html = renderSectionHtml('energia', { tick: 0 });
  const energy = createEnergyModel({ tick: 0 });
  // AHORA: live kW + colored delta vs previous day + fleet sparkline.
  assert.match(html, new RegExp(energy.nowKw.toFixed(1).replace('.', '\\.')));
  assert.match(html, /vs\. día anterior/);
  // DÍA ANTERIOR / MES: kWh + their own derived comparisons.
  assert.match(html, /vs\. mismo día ant\./);
  assert.match(html, /vs\. mes anterior/);
  const sparks = html.match(/class="chispa chispa-kpi"/g) ?? [];
  assert.equal(sparks.length, 3, 'each period card carries its sparkline');
  // Donut: four segments + legend with one-decimal percentages + honest sim-clock foot.
  assert.match(html, /Distribución actual/i);
  assert.match(html, /class="donut"/);
  assert.equal((html.match(/<circle[^>]*class="donut-seg/g) ?? []).length, 4);
  const dist = createEnergyDistribution({ tick: 0 });
  for (const segment of dist.segments) {
    assert.match(html, new RegExp(`${segment.label}[\\s\\S]{0,80}${segment.sharePct.toFixed(1).replace('.', '\\.')}%`));
  }
  assert.match(html, /Actualizado: 1 Ene 2026 12:00/);
});

test('energía meter table: per-row sparkline, kW sort desc default, page-size select', () => {
  const html = renderSectionHtml('energia', { tick: 0 });
  assert.match(html, /Medición por unidad/i);
  assert.equal((html.match(/chispa chispa-energia/g) ?? []).length, 14, 'one 24 h strip per meter');
  assert.match(html, /aria-sort="descending"[^>]*>\s*<button[^>]*data-energy-sort/);
  // Default sort: kW descending — the first data row carries the fleet's max kW.
  const maxKw = Math.max(...createEnergyModel({ tick: 0 }).perUnit.map(({ kw }) => kw));
  // Ronda B (responsive, 2026-07-18) conscious edit: the kW cell now carries `data-th="kW"`
  // so the phone tier can label it as a card row — the assert targets that cell explicitly.
  const firstKwCell = html.slice(html.indexOf('<tbody>')).match(/<td class="num" data-th="kW">([\d.]+)<\/td>/);
  assert.equal(firstKwCell?.[1], maxKw.toFixed(1));
  // Unit cell: tag chip + truthful status dot; chevron links to the unit page.
  assert.ok((html.match(/class="tag-chip num"/g) ?? []).length >= 14);
  assert.match(html, /dashboard\.html\?unit=RTU-/);
  // Footer: honest count + functional rows-per-page select + pager.
  assert.match(html, /Mostrando 14 de 14 unidades/);
  assert.match(html, /Filas por página/);
  assert.match(html, /data-energy-page-size/);
  assert.match(html, /<option value="10">10<\/option>/);
  assert.match(html, /<option value="25" selected>25<\/option>/);
  assert.match(html, /data-energy-page="prev"[^>]*disabled/);
});

test('energía view state pages and sorts the meter table deterministically', () => {
  const paged = renderSectionHtml('energia', { tick: 0, view: { energyPageSize: 10 } });
  assert.equal((paged.match(/chispa chispa-energia/g) ?? []).length, 10, 'page size 10 shows 10 rows');
  assert.match(paged, /Mostrando 1 a 10 de 14 unidades/);
  assert.match(paged, /<option value="10" selected>10<\/option>/);
  const tail = renderSectionHtml('energia', { tick: 0, view: { energyPageSize: 10, energyPage: 2 } });
  assert.equal((tail.match(/chispa chispa-energia/g) ?? []).length, 4, 'the tail page shows the remainder');
  assert.match(tail, /Mostrando 11 a 14 de 14 unidades/);
  const ascending = renderSectionHtml('energia', { tick: 0, view: { energyDir: 'asc' } });
  const minKw = Math.min(...createEnergyModel({ tick: 0 }).perUnit.map(({ kw }) => kw));
  // Ronda B conscious edit (see above): the kW cell is addressed by its data-th label.
  const firstKwCell = ascending.slice(ascending.indexOf('<tbody>')).match(/<td class="num" data-th="kW">([\d.]+)<\/td>/);
  assert.equal(firstKwCell?.[1], minKw.toFixed(1));
});

// ---------------------------------------------------------------------------
// Alertas section HTML (mockup 3)
// ---------------------------------------------------------------------------

test('alertas renders counted chips, the three summary cards and the derivación aside', () => {
  const html = renderSectionHtml('alertas', { tick: 0 });
  const model = createAlertsModel({ tick: 0 });
  // Chips carry live counts over the whole day universe (active + resolved).
  assert.match(html, /data-alert-cat="all"/);
  assert.match(html, /data-alert-cat="Temperatura"/);
  assert.match(html, /cat-chip-empty/, 'zero-count categories look disabled but stay functional');
  // Summary cards: live counts + functional severity chevrons.
  const critical = model.alerts.filter(({ severity }) => severity === 'crítica').length;
  const warning = model.alerts.filter(({ severity }) => severity === 'advertencia').length;
  assert.match(html, /Críticas/);
  assert.match(html, /Requieren atención inmediata/);
  assert.match(html, /Revisión recomendada/);
  assert.match(html, /Resueltas \(hoy\)/);
  assert.match(html, /Alertas normalizadas/);
  assert.match(html, new RegExp(`data-alert-sev="crítica"[\\s\\S]{0,600}?>${critical}<`));
  assert.match(html, new RegExp(`data-alert-sev="advertencia"[\\s\\S]{0,600}?>${warning}<`));
  assert.match(html, new RegExp(`data-alert-sev="resuelta"[\\s\\S]{0,600}?>${model.resolvedToday}<`));
  // Aside: honest derivation copy + decorative handcrafted illustration.
  assert.match(html, /class="alerts-layout/);
  assert.match(html, /Derivación/);
  assert.match(html, /restablece\s+sola/);
  assert.match(html, /class="deriv-art"[^>]*aria-hidden="true"/);
});

test('alertas table: reference columns, sim-clock dates, estado pills, kebab with real actions', () => {
  const html = renderSectionHtml('alertas', { tick: 0 });
  for (const column of ['Dispositivo', 'Categoría', 'Severidad', 'Detalle', 'Estado']) {
    assert.match(html, new RegExp(`<th[^>]*>${column}</th>`));
  }
  assert.match(html, /data-alert-sort="fecha"/, 'the date column sorts');
  assert.match(html, /aria-sort="descending"/, 'newest first by default');
  // Active rows lead (current sim timestamp) with estado Activa.
  assert.match(html, /1 Ene 2026 12:00/);
  assert.match(html, /pill pill-accent">Activa/);
  assert.match(html, /class="sev sev-(?:critical|warn)"/);
  // Footer: honest count over the full universe + page size select + numbered pager.
  const model = createAlertsModel({ tick: 0 });
  const universe = model.total + model.resolvedToday;
  assert.match(html, new RegExp(`Mostrando 1 a ${ALERTS_PAGE_SIZE} de ${universe} alertas`));
  assert.match(html, /data-alert-page-size/);
  assert.match(html, /data-alert-page="2"/, 'numbered pager pages are real buttons');
  assert.match(html, /data-alert-page="prev"[^>]*disabled/);
  // Kebab: closed by default, opens through view state with REAL actions only.
  assert.match(html, /data-alert-menu="/);
  const firstId = model.alerts[0].id;
  const open = renderSectionHtml('alertas', { tick: 0, view: { alertMenu: firstId } });
  assert.match(open, /Copiar detalle/);
  assert.match(open, /data-copy-detail="/);
});

test('alertas view state filters by severity and pages the day universe deterministically', () => {
  const resolved = renderSectionHtml('alertas', { tick: 0, view: { alertSev: 'resuelta' } });
  assert.match(resolved, /pill pill-ok">Resuelta/);
  assert.doesNotMatch(resolved, /pill pill-accent">Activa/, 'the resolved filter hides active rows');
  assert.match(resolved, /data-alert-sev="resuelta"[^>]*aria-pressed="true"/);
  const critical = renderSectionHtml('alertas', { tick: 0, view: { alertSev: 'crítica' } });
  assert.doesNotMatch(critical, /class="sev sev-warn"/, 'the critical filter hides warnings');
  const bigger = renderSectionHtml('alertas', { tick: 0, view: { alertPageSize: 25 } });
  assert.match(bigger, /Mostrando 1 a 25 de \d+ alertas/);
  assert.equal(bigger, renderSectionHtml('alertas', { tick: 0, view: { alertPageSize: 25 } }));
});

// ---------------------------------------------------------------------------
// Shell: sidebar brand block (user override — sanctioned logo exception)
// ---------------------------------------------------------------------------

test('index.html carries the sidebar brand block above the pin', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /class="brand"/);
  // Client round 5 (2026-07-18): the AI-invented multi-hue swirl and "Water Core" subtitle are
  // retired; the real Cinemex logo asset ships as a rounded chip with an alt text.
  assert.match(html, /class="brand-logo"[^>]*src="\.\/assets\/cinemex-logo\.png"/, 'the real logo asset ships');
  assert.match(html, /class="brand-logo"[^>]*alt="Cinemex"/);
  assert.doesNotMatch(html, /brand-mark/, 'the fake handcrafted swirl is gone');
  assert.doesNotMatch(html, /Water Core/, 'the AI-invented subtitle is gone');
  const brandAt = html.indexOf('class="brand"');
  const pinAt = html.indexOf('id="menu-pin"');
  assert.ok(brandAt > -1 && brandAt < pinAt, 'the brand block sits above "Menú fijado"');
});

// ---------------------------------------------------------------------------
// main.js: delegated wiring for the new view-state patterns
// ---------------------------------------------------------------------------

test('main.js wires every round-4 control through the delegated view-state pattern', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /data-go-section/, 'the promo button navigates sections');
  assert.match(main, /data-hvac-sort/);
  assert.match(main, /data-hvac-mode/);
  assert.match(main, /data-hvac-filters/);
  assert.match(main, /data-hvac-search/, 'live search re-renders through the pure builder');
  assert.match(main, /addEventListener\('input'/, 'search is a delegated input listener');
  assert.match(main, /addEventListener\('change'/, 'page-size selects are delegated');
  assert.match(main, /cinemex-unidades\.csv/, 'the CSV download names the bound filename');
  assert.match(main, /data:text\/csv/, 'export rides a data: URI');
  assert.match(main, /data-alert-sev/);
  assert.match(main, /data-alert-page-size/);
  assert.match(main, /data-energy-page-size/);
  assert.match(main, /data-copy-detail/);
  assert.match(main, /clipboard/, 'copy detail is a real clipboard action');
  assert.doesNotMatch(main, /data-zone-detail/, 'the retired zone-card handler leaves with its cards');
});
