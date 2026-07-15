import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { ALARM_LIMITS } from '../src/alarms.mjs';
import { createInteractionModel } from '../src/scene/interaction.js';
import {
  COMFORT_TOLERANCE_C,
  DASHBOARD_DEFAULT_QUERY,
  EQUIPMENT_EXCEEDANCE_C,
  buildDashboardUrl,
  buildViewerUrl,
  createDashboardModel,
  deriveUnitVerdict,
  formatReadingTime,
  orderForBoard,
  parseDashboardQuery,
  serializeDashboardQuery,
  tc300FromUnitId,
  unitIdFromTc300,
} from '../src/dashboard/model.mjs';
import { SERIES_POLICY, createUnitSeries } from '../src/dashboard/series.mjs';
import { bannerHtml, pillFor, slotHtml, sparklineSvg, unitViewHtml } from '../src/dashboard/render.mjs';

// ---------------------------------------------------------------------------
// Unit identity — the dashboard's RTU ids are the 3D scene's packaged units.
// ---------------------------------------------------------------------------

test('dashboard: RTU ids map 1:1 onto the TC300 registry and reject unknown units', () => {
  assert.equal(unitIdFromTc300('TC300-08'), 'RTU-08');
  assert.equal(tc300FromUnitId('RTU-08'), 'TC300-08');
  assert.equal(tc300FromUnitId('RTU-15'), null, 'there is no fifteenth unit');
  assert.equal(tc300FromUnitId('rtu-08'), null);
  assert.equal(tc300FromUnitId(''), null);
  assert.equal(unitIdFromTc300('TC300-99'), null);
});

// ---------------------------------------------------------------------------
// Deep-link contract — parse/serialize fixed point, atomic-safe defaults.
// ---------------------------------------------------------------------------

test('dashboard: the deep-link query round-trips as a fixed point', () => {
  for (const query of [
    { unit: 'RTU-08', state: 'hot-sala-3', tick: 30 },
    { unit: null, state: 'architecture', tick: 0 },
    { unit: 'RTU-01', state: 'fault-internet', tick: 0 },
  ]) {
    const parsed = parseDashboardQuery(`?${serializeDashboardQuery(query)}`);
    assert.deepEqual(parsed, { ...DASHBOARD_DEFAULT_QUERY, ...query });
    // Fixed point: serializing what we parsed changes nothing.
    assert.equal(serializeDashboardQuery(parsed), serializeDashboardQuery(query));
  }
  // The fleet URL stays bare — defaults are omitted.
  assert.equal(serializeDashboardQuery(DASHBOARD_DEFAULT_QUERY), '');
  assert.equal(buildDashboardUrl({}), 'dashboard.html');
  assert.equal(buildDashboardUrl({ unit: 'RTU-08' }), 'dashboard.html?unit=RTU-08');
});

test('dashboard: malformed deep-links degrade to the fleet, never to a broken view', () => {
  assert.deepEqual(parseDashboardQuery('?unit=RTU-99'), DASHBOARD_DEFAULT_QUERY);
  assert.deepEqual(parseDashboardQuery('?unit=<script>'), DASHBOARD_DEFAULT_QUERY);
  assert.deepEqual(parseDashboardQuery('?state=on-fire&tick=-3'), DASHBOARD_DEFAULT_QUERY);
  assert.deepEqual(
    parseDashboardQuery('?unit=RTU-05&state=hot-kitchen&tick=12'),
    { unit: 'RTU-05', state: 'hot-kitchen', tick: 12 },
  );
});

test('dashboard: the breadcrumb back to the 3D viewer carries the unit context', () => {
  assert.equal(buildViewerUrl({}), 'index.html');
  assert.equal(buildViewerUrl({ state: 'hot-sala-3' }), 'index.html?state=hot-sala-3');
  assert.equal(
    buildViewerUrl({ state: 'hot-sala-3', unitId: 'RTU-08' }),
    'index.html?state=hot-sala-3&camera=top&selection=TC300-08',
  );
  assert.equal(buildViewerUrl({ unitId: 'RTU-99' }), 'index.html', 'an unknown unit adds no context');
});

// ---------------------------------------------------------------------------
// View model derivation — one source of truth, deterministic.
// ---------------------------------------------------------------------------

test('dashboard: same sim inputs produce the same view model, straight from the interaction model', () => {
  const first = createDashboardModel({ state: 'hot-sala-3', tick: 0 });
  const second = createDashboardModel({ state: 'hot-sala-3', tick: 0 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(first, (key, value) => (value instanceof Map ? undefined : value))),
    JSON.parse(JSON.stringify(second, (key, value) => (value instanceof Map ? undefined : value))),
  );

  assert.equal(first.units.length, 14);
  const reference = createInteractionModel({ state: 'hot-sala-3', tick: 0, selection: 'none' });
  for (const unit of first.units) {
    assert.equal(unit.temperature, reference.telemetry[unit.tc300Id].temperature, `${unit.unitId} must read the sim`);
    assert.equal(unit.alarm, reference.deviceStatus[unit.tc300Id] === 'alarm');
    assert.deepEqual([...unit.band], [unit.setpoint - COMFORT_TOLERANCE_C, unit.setpoint + COMFORT_TOLERANCE_C]);
    assert.equal(unit.chain.length, 7, 'sensor → RS-485 → UC → LoRaWAN → UG67 → IP → Niagara');
    assert.equal(unit.chain[0].label, unit.tc300Id);
    assert.equal(unit.chain.at(-1).label, 'Niagara N4');
  }
  const hot = first.unitsById.get('RTU-08');
  assert.equal(hot.alarm, true);
  assert.equal(hot.estado, 'alarma');
  assert.equal(first.rollup.alarma, 1);
  assert.equal(first.rollup.entregando, 14, 'a hot zone still delivers to Niagara');
  assert.equal(first.alarms[0].unitId, 'RTU-08');
});

test('dashboard: a communication fault reads as stopped delivery with a dead chain tail', () => {
  const model = createDashboardModel({ state: 'fault-tc300', tick: 0 });
  const unit = model.unitsById.get('RTU-08');
  assert.equal(unit.delivered, false);
  assert.equal(pillFor(unit).text, 'DETENIDO');
  assert.equal(unit.chain.at(-1).estado, 'sin-dato');
  assert.equal(unit.chain.at(-1).valor, 'sin datos de esta unidad');
  assert.equal(model.rollup.entregando, 13);
  // The healthy neighbours keep a live chain.
  const neighbour = model.unitsById.get('RTU-07');
  assert.equal(neighbour.delivered, true);
  assert.ok(neighbour.chain.every(({ estado }) => estado === 'ok'));
});

test('dashboard: the board orders salas 1..8 first, then the common zones', () => {
  const model = createDashboardModel({});
  const order = model.boardUnits.map(({ zoneId }) => zoneId);
  assert.deepEqual(order.slice(0, 8), ['sala-1', 'sala-2', 'sala-3', 'sala-4', 'sala-5', 'sala-6', 'sala-7', 'sala-8']);
  assert.equal(new Set(order).size, 14);
  // The ordering is a pure function of the units, not of the render.
  assert.deepEqual(orderForBoard(model.units).map(({ zoneId }) => zoneId), order);
  const sala3 = model.boardUnits[2];
  assert.equal(sala3.salaNumber, 3);
  assert.equal(typeof sala3.familyTag, 'string');
});

// ---------------------------------------------------------------------------
// Verdict derivation — comfort vs equipment vs data-trust (graft c).
// ---------------------------------------------------------------------------

test('dashboard: the operator verdict derives from alarm, delivery and exceedance', () => {
  assert.equal(deriveUnitVerdict({}).kind, 'sin-accion');
  assert.match(deriveUnitVerdict({}).text, /Sin acción requerida/);
  assert.equal(deriveUnitVerdict({ alarm: true, delivered: true, exceedance: EQUIPMENT_EXCEEDANCE_C }).kind, 'equipo');
  assert.equal(deriveUnitVerdict({ alarm: true, delivered: true, exceedance: 0.5 }).kind, 'confort');
  assert.equal(deriveUnitVerdict({ alarm: true, delivered: false, exceedance: 9 }).kind, 'datos');
  assert.equal(deriveUnitVerdict({ alarm: false, delivered: false }).kind, 'datos');

  // Against the real scenario states: the kitchen fault exceeds the limit by 3.7 °C (equipment);
  // sala 3 sits 1.9 °C over (comfort-watch); a comm loss is a data-trust verdict.
  const kitchen = createDashboardModel({ state: 'hot-kitchen', tick: 0 }).unitsById.get('RTU-05');
  assert.equal(kitchen.verdict.kind, 'equipo');
  assert.ok(kitchen.temperature - ALARM_LIMITS.high >= EQUIPMENT_EXCEEDANCE_C);
  const sala3 = createDashboardModel({ state: 'hot-sala-3', tick: 0 }).unitsById.get('RTU-08');
  assert.equal(sala3.verdict.kind, 'confort');
  const commLoss = createDashboardModel({ state: 'fault-tc300', tick: 0 }).unitsById.get('RTU-08');
  assert.equal(commLoss.verdict.kind, 'datos');
  const healthy = createDashboardModel({}).unitsById.get('RTU-01');
  assert.equal(healthy.verdict.kind, 'sin-accion');
});

// ---------------------------------------------------------------------------
// 24 h series — seeded deterministic, anchored to the live truth.
// ---------------------------------------------------------------------------

test('dashboard: the 24h series is seeded deterministic and anchored to the live reading', () => {
  assert.equal(SERIES_POLICY.seedBase, APP_CONFIG.animation.seed, 'the seed is the sim\'s own seed');
  const reading = { setpoint: 22, temperature: 22.4, alarm: false };
  const a = createUnitSeries(3, reading);
  const b = createUnitSeries(3, reading);
  assert.deepEqual(a, b, 'same unit, same series — capturable');
  assert.equal(a.length, SERIES_POLICY.points);
  assert.equal(a.at(-1), reading.temperature, 'the last point IS the live reading');
  assert.notDeepEqual(createUnitSeries(4, reading), a, 'each unit owns its own history');

  // Flat line = healthy: the whole healthy series stays inside the comfort band.
  const spread = Math.max(...a) - Math.min(...a);
  assert.ok(spread < COMFORT_TOLERANCE_C * 2, `a healthy series must read flat (spread ${spread.toFixed(2)})`);

  // An alarm series ramps into the failure across the last five hours.
  const alarmSeries = createUnitSeries(7, { setpoint: 22, temperature: 29.4, alarm: true });
  assert.equal(alarmSeries.at(-1), 29.4);
  assert.ok(alarmSeries[SERIES_POLICY.rampFrom - 1] < 24, 'the ramp starts from a healthy level');
  for (let i = SERIES_POLICY.rampFrom; i < SERIES_POLICY.points; i += 1) {
    assert.ok(alarmSeries[i] >= alarmSeries[i - 1] - 1e-9, 'the failure develops monotonically');
  }
  assert.throws(() => createUnitSeries(-1, reading), RangeError);
  assert.throws(() => createUnitSeries(0, { setpoint: Number.NaN, temperature: 22 }), RangeError);
});

// ---------------------------------------------------------------------------
// Render fragments — the deterministic facts of the grafts.
// ---------------------------------------------------------------------------

test('dashboard: banner, slots and unit view carry the grafted, es-MX operator surface', () => {
  const hot = createDashboardModel({ state: 'hot-sala-3', tick: 0 });
  const banner = bannerHtml(hot);
  assert.match(banner, /Alarma activa/);
  assert.match(banner, /data-unidad="RTU-08"/, 'the banner jumps straight to the unit');
  assert.match(banner, />Ver unidad</, 'the bound fix: an unambiguous operator action');
  assert.doesNotMatch(banner, /Ver función/);
  assert.equal(bannerHtml(createDashboardModel({})), '', 'no alarms, no banner');

  const slot = slotHtml(hot.unitsById.get('RTU-08'));
  assert.match(slot, /class="slot en-alarma"/);
  assert.match(slot, /<svg class="chispa"/, 'graft (a): every row carries its sparkline');
  assert.match(slot, /29\.4 °C/);

  const view = unitViewHtml(hot.unitsById.get('RTU-08'));
  assert.match(view, /veredicto veredicto-confort/, 'graft (c): the verdict phrase closes the unit view');
  assert.match(view, /Cadena de entrega/);
  assert.match(view, /EN VIVO/, 'the mandatory STATUS pill');

  const healthyView = unitViewHtml(createDashboardModel({}).unitsById.get('RTU-01'));
  assert.match(healthyView, /Sin acción requerida/);

  const sparkline = sparklineSvg(hot.unitsById.get('RTU-08'), { tone: 'inverse' });
  assert.match(sparkline, /stroke="var\(--canvas\)"/, 'inside reverse video the dim stroke would fail contrast');
});

test('dashboard: reading times derive from the sim clock, never from Date.now', () => {
  assert.equal(formatReadingTime('2026-07-15T21:47:12.000Z'), '21:47:12');
  assert.equal(formatReadingTime(undefined), '—');
  const t0 = createDashboardModel({ tick: 0 }).readingTime;
  const t30 = createDashboardModel({ tick: 30 }).readingTime;
  assert.notEqual(t0, t30, 'the tick clock advances the reading timestamp');
  assert.equal(createDashboardModel({ tick: 0 }).readingTime, t0, 'and it is reproducible');
});
