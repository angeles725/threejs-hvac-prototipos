import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { createInteractionModel } from '../src/scene/interaction.js';
import {
  COMFORT_TOLERANCE_C,
  DASHBOARD_DEFAULT_QUERY,
  buildDashboardUrl,
  buildViewerUrl,
  createDashboardModel,
  formatReadingTime,
  orderForBoard,
  parseDashboardQuery,
  serializeDashboardQuery,
  tc300FromUnitId,
  unitIdFromTc300,
} from '../src/dashboard/model.mjs';
import { SERIES_POLICY, createUnitSeries } from '../src/dashboard/series.mjs';
import { rollupHtml, slotHtml, sparklineSvg, unitViewHtml } from '../src/dashboard/render.mjs';

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
// Client simplification (2026-07-15): the `state` scenario key died with the
// fault machinery — `unit` and `tick` are the whole input surface.
// ---------------------------------------------------------------------------

test('dashboard: the deep-link query round-trips as a fixed point', () => {
  for (const query of [
    { unit: 'RTU-08', tick: 30 },
    { unit: null, tick: 0 },
    { unit: 'RTU-01', tick: 0 },
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
  // The removed `state` scenario key is ignored, never parsed back into the model.
  assert.deepEqual(
    parseDashboardQuery('?unit=RTU-05&state=hot-kitchen&tick=12'),
    { unit: 'RTU-05', tick: 12 },
  );
});

test('dashboard: the breadcrumb back to the 3D viewer carries the unit context', () => {
  assert.equal(buildViewerUrl({}), 'index.html');
  // Single-view correction (2026-07-18): the breadcrumb travels with the SELECTION only — the
  // viewer ships one fixed view, so the link stopped naming a camera.
  assert.equal(
    buildViewerUrl({ unitId: 'RTU-08' }),
    'index.html?selection=TC300-08',
  );
  assert.equal(buildViewerUrl({ unitId: 'RTU-99' }), 'index.html', 'an unknown unit adds no context');
});

// ---------------------------------------------------------------------------
// View model derivation — one source of truth, deterministic.
// ---------------------------------------------------------------------------

test('dashboard: same sim inputs produce the same view model, straight from the interaction model', () => {
  const first = createDashboardModel({ tick: 0 });
  const second = createDashboardModel({ tick: 0 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(first, (key, value) => (value instanceof Map ? undefined : value))),
    JSON.parse(JSON.stringify(second, (key, value) => (value instanceof Map ? undefined : value))),
  );

  assert.equal(first.units.length, 14);
  const reference = createInteractionModel({ state: 'architecture', tick: 0, selection: 'none' });
  for (const unit of first.units) {
    assert.equal(unit.temperature, reference.telemetry[unit.tc300Id].temperature, `${unit.unitId} must read the sim`);
    assert.deepEqual([...unit.band], [unit.setpoint - COMFORT_TOLERANCE_C, unit.setpoint + COMFORT_TOLERANCE_C]);
    // Simplification: no alarm/delivery/verdict/chain derivations survive on a unit.
    for (const gone of ['alarm', 'delivered', 'estado', 'verdict', 'chain']) {
      assert.equal(gone in unit, false, `${gone} must not exist on a unit`);
    }
  }
  assert.equal(first.rollup.total, 14);
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
// 24 h series — seeded deterministic, anchored to the live truth.
// ---------------------------------------------------------------------------

test('dashboard: the 24h series is seeded deterministic and anchored to the live reading', () => {
  assert.equal(SERIES_POLICY.seedBase, APP_CONFIG.animation.seed, 'the seed is the sim\'s own seed');
  const reading = { setpoint: 22, temperature: 22.4 };
  const a = createUnitSeries(3, reading);
  const b = createUnitSeries(3, reading);
  assert.deepEqual(a, b, 'same unit, same series — capturable');
  assert.equal(a.length, SERIES_POLICY.points);
  assert.equal(a.at(-1), reading.temperature, 'the last point IS the live reading');
  assert.notDeepEqual(createUnitSeries(4, reading), a, 'each unit owns its own history');

  // Flat line = healthy: the whole healthy series stays inside the comfort band.
  const spread = Math.max(...a) - Math.min(...a);
  assert.ok(spread < COMFORT_TOLERANCE_C * 2, `a healthy series must read flat (spread ${spread.toFixed(2)})`);

  // Simplification: the alarm ramp died with the fault machinery.
  assert.equal('rampFrom' in SERIES_POLICY, false, 'no alarm ramp policy survives');

  assert.throws(() => createUnitSeries(-1, reading), RangeError);
  assert.throws(() => createUnitSeries(0, { setpoint: Number.NaN, temperature: 22 }), RangeError);
});

// ---------------------------------------------------------------------------
// Render fragments — the deterministic facts of the healthy operator surface.
// ---------------------------------------------------------------------------

test('dashboard: slots, rollup and unit view carry the healthy es-MX operator surface', async () => {
  const model = createDashboardModel({ tick: 0 });
  const render = await import('../src/dashboard/render.mjs');
  // Simplification: the alarm banner and the alarm/coms status vocabulary are gone.
  for (const gone of ['bannerHtml', 'slotStatusFor', 'pillFor']) {
    assert.equal(gone in render, false, `${gone} must not be exported`);
  }

  const slot = slotHtml(model.unitsById.get('RTU-08'));
  assert.match(slot, /class="slot"/, 'no alarm row variant survives');
  assert.doesNotMatch(slot, /en-alarma|ALARMA|SIN COMS/);
  assert.match(slot, /<svg class="chispa"/, 'graft (a): every row carries its sparkline');
  assert.match(slot, /vs consigna/, 'item H: the deviation tag is a healthy-model fact and stays');

  const rollup = rollupHtml(model);
  assert.match(rollup, /Flota: <b>14 unidades<\/b>/);
  assert.doesNotMatch(rollup, /Alarma/);

  const view = unitViewHtml(model.unitsById.get('RTU-08'));
  // Correction round item F: the delivery-chain panel (and its verdict foot) left the surface.
  assert.doesNotMatch(view, /Cadena de entrega/);
  assert.doesNotMatch(view, /veredicto/);
  assert.match(view, /EN VIVO/, 'the one live STATUS pill');

  const sparkline = sparklineSvg(model.unitsById.get('RTU-08'));
  assert.match(sparkline, /stroke="var\(--dim\)"/, 'the sparkline stays a quiet dim strip');
});

test('dashboard: reading times derive from the sim clock, never from Date.now', () => {
  assert.equal(formatReadingTime('2026-07-15T21:47:12.000Z'), '21:47:12');
  assert.equal(formatReadingTime(undefined), 'N/D', 'missing clock reads N/D, never a dash glyph');
  const t0 = createDashboardModel({ tick: 0 }).readingTime;
  const t30 = createDashboardModel({ tick: 30 }).readingTime;
  assert.notEqual(t0, t30, 'the tick clock advances the reading timestamp');
  assert.equal(createDashboardModel({ tick: 0 }).readingTime, t0, 'and it is reproducible');
});
