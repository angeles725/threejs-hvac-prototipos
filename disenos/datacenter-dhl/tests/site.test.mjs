/**
 * P2-3 site-sim tests (TDD-first) — exterior weather, energy rollups, derived alerts,
 * maintenance windows and 24 h trend series for the dock sections.
 *
 * Contract under test (BRIEF item 5 + phase-2 work order):
 *   - ONE ambient source: the weather model's current temperature IS SIM_POLICY.ambientC,
 *     the same number the dry cooler rejects against — no second weather truth;
 *   - energy rollups: every aggregate equals the sum of its own table rows (auditable);
 *   - alerts derive from the equipment sim statuses — exactly one warn, zero alarms,
 *     and the alert names the model's own warn unit;
 *   - maintenance: one deterministic off-hours window per registered instance;
 *   - trends: 24 hourly points per unit, resampled from the SAME deterministic model.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_INSTANCES,
  SIM_POLICY,
  createEquipmentModel,
} from '../src/sim/equipment.mjs';
import {
  ALERT_CATEGORIES,
  createEnergyRollup,
  createMaintenanceModel,
  createSiteAlerts,
  createSiteWeather,
  createTrendSeries,
} from '../src/sim/site.mjs';

const TICKS = [0, 7, 31, 100];

test('weather: current exterior temperature IS the sim ambient (one source, CDMX)', () => {
  for (const tick of TICKS) {
    const weather = createSiteWeather({ tick });
    assert.equal(weather.current.temperatureC, SIM_POLICY.ambientC, `tick ${tick}`);
    assert.equal(weather.city, 'Ciudad de México');
  }
});

test('weather: deterministic, plausible and with a 7-day forecast band (client round 3)', () => {
  const a = createSiteWeather({ tick: 31 });
  const b = createSiteWeather({ tick: 31 });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.equal(a.forecast.length, 7);
  assert.equal(new Set(a.forecast.map(({ dayLabel }) => dayLabel)).size, 7, 'day labels stay distinct');
  for (const day of a.forecast) {
    assert.ok(day.minC < day.maxC, `${day.dayLabel} min < max`);
    assert.ok(day.maxC >= 25 && day.maxC <= 35, `${day.dayLabel} max ${day.maxC}`);
    assert.ok(day.minC >= 8 && day.minC <= 18, `${day.dayLabel} min ${day.minC}`);
    assert.ok(day.condition.length > 0);
  }
  assert.ok(a.current.humidityPct >= 15 && a.current.humidityPct <= 60);
  assert.ok(a.current.windKmh >= 2 && a.current.windKmh <= 25);
});

test('energy rollup: every aggregate equals the sum of its own rows', () => {
  for (const tick of TICKS) {
    const rollup = createEnergyRollup({ tick });
    const sum = (rows) => Number(rows.reduce((acc, row) => acc + row.kw, 0).toFixed(1));
    assert.equal(rollup.itLoadKw, sum(rollup.racks), `tick ${tick} IT rollup`);
    assert.equal(rollup.coolingKw, sum(rollup.inrows), `tick ${tick} cooling rollup`);
    assert.equal(rollup.racks.length, 3);
    assert.equal(rollup.inrows.length, 2);
  }
});

test('energy rollup: PDU/UPS figures are the sim values themselves, not a parallel truth', () => {
  for (const tick of [0, 31]) {
    const rollup = createEnergyRollup({ tick });
    const model = createEquipmentModel({ tick });
    assert.equal(rollup.pdu.kw, model.byId.get('pdu-01').values.loadKw);
    assert.equal(rollup.pdu.loadPct, model.byId.get('pdu-01').values.loadPct);
    assert.equal(rollup.ups.kw, model.byId.get('ups-01').values.loadKw);
    assert.equal(rollup.ups.runtimeMin, model.byId.get('ups-01').values.runtimeMin);
  }
});

test('alerts: exactly one warn derived from the sim, zero alarms, names the warn unit', () => {
  for (const tick of TICKS) {
    const alerts = createSiteAlerts({ tick });
    const model = createEquipmentModel({ tick });
    assert.equal(alerts.total, 1, `tick ${tick}`);
    assert.equal(alerts.alerts.length, 1);
    const [alert] = alerts.alerts;
    assert.equal(alert.id, model.warnId, 'the alert names the model warn unit');
    assert.equal(alert.severity, 'advertencia');
    assert.ok(alert.message.length > 0);
    assert.ok(!alert.message.includes('—'), 'em dashes are banned in copy');
    assert.equal(alerts.alerts.filter(({ severity }) => severity === 'alarma').length, 0);
  }
});

test('alerts: the message carries the gauge reading and its threshold (auditable derivation)', () => {
  const alerts = createSiteAlerts({ tick: 0 });
  const model = createEquipmentModel({ tick: 0 });
  const warnUnit = model.byId.get(model.warnId);
  const [alert] = alerts.alerts;
  assert.equal(alert.kind, warnUnit.kind);
  assert.equal(alert.label, warnUnit.label);
  assert.ok(alert.message.includes(String(alert.reading)), 'message quotes the reading');
  assert.ok(alert.message.includes(String(alert.threshold)), 'message quotes the threshold');
});

test('alerts: every alert carries a category from the closed vocabulary (client round 3)', () => {
  // The category is DERIVED from the gauge family the alert fires on — never asserted by
  // hand: thermal gauges (inlet, delta T, approach) → Térmica, EC fan speed → Ventilación,
  // electrical load → Energía. The filter chips on the Alertas page consume this vocabulary.
  assert.deepEqual([...ALERT_CATEGORIES], ['Térmica', 'Ventilación', 'Energía']);
  const KIND_CATEGORY = {
    rack: 'Térmica', inrow: 'Térmica', dry: 'Térmica',
    crac: 'Ventilación',
    pdu: 'Energía', ups: 'Energía',
  };
  for (const tick of TICKS) {
    for (const alert of createSiteAlerts({ tick }).alerts) {
      assert.ok(ALERT_CATEGORIES.includes(alert.category), `${alert.id} category in vocabulary`);
      assert.equal(alert.category, KIND_CATEGORY[alert.kind], `${alert.id} category derives from its gauge family`);
    }
  }
});

test('maintenance: one deterministic off-hours window per registered instance', () => {
  const a = createMaintenanceModel();
  const b = createMaintenanceModel();
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.equal(a.windows.length, EQUIPMENT_INSTANCES.length);
  const ids = a.windows.map(({ id }) => id).sort();
  assert.deepEqual(ids, EQUIPMENT_INSTANCES.map(({ id }) => id).sort());
  for (const window of a.windows) {
    assert.match(window.window, /^\d{2}:\d{2} a \d{2}:\d{2}$/);
    const startHour = Number(window.window.slice(0, 2));
    assert.ok(startHour >= 1 && startHour <= 6, `${window.id} off-hours start ${startHour}`);
    assert.ok(window.day.length > 0 && window.task.length > 0);
  }
});

test('trends: 24 hourly points per unit, resampled from the same deterministic model', () => {
  const trends = createTrendSeries();
  assert.equal(trends.entries.length, EQUIPMENT_INSTANCES.length);
  const model0 = createEquipmentModel({ tick: 0 });
  for (const entry of trends.entries) {
    assert.equal(entry.series.length, 2, `${entry.id} carries two series`);
    for (const series of entry.series) {
      assert.equal(series.points.length, 24, `${entry.id} ${series.field}`);
      // Hour 0 is the tick-0 model itself: the trends never invent a second data source.
      assert.equal(series.points[0], model0.byId.get(entry.id).values[series.field]);
      assert.equal(series.last, series.points.at(-1));
    }
  }
  const again = createTrendSeries();
  assert.deepEqual(JSON.parse(JSON.stringify(trends)), JSON.parse(JSON.stringify(again)));
});
