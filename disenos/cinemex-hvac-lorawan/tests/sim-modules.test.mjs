/**
 * Lateral-menu round — deterministic seeded sim modules (BUILD obligation W2/W5).
 * Written FIRST (strict TDD): every module must produce the same output for the same
 * tick, follow simulation.mjs's deterministic conventions, and stay honest about what
 * the healthy simulation can actually claim.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG, TC300_DEVICES, UC100_DEVICES } from '../src/config.mjs';
import { SETPOINT_LIMITS } from '../src/simulation.mjs';
import {
  createEnergyModel,
  createUnitEnergySeries,
  ENERGY_POLICY,
} from '../src/sim/energy.mjs';
import { createWeatherModel, WEATHER_CONDITIONS } from '../src/sim/weather.mjs';
import {
  createScheduleModel,
  SETPOINT_CALENDAR,
  WEEKLY_SCHEDULE,
} from '../src/sim/schedules.mjs';
import { createPlantModel } from '../src/sim/plant.mjs';
import {
  ALERT_CATEGORIES,
  ALERT_THRESHOLDS,
  createAlertsModel,
  deriveAlerts,
} from '../src/sim/alerts.mjs';

const round1 = (value) => Number(value.toFixed(1));

// ---------------------------------------------------------------------------
// Energy
// ---------------------------------------------------------------------------

test('energy model is deterministic: same tick, same model', () => {
  assert.deepEqual(createEnergyModel({ tick: 0 }), createEnergyModel({ tick: 0 }));
  assert.deepEqual(createEnergyModel({ tick: 120 }), createEnergyModel({ tick: 120 }));
  assert.notDeepEqual(
    createEnergyModel({ tick: 0 }).perUnit,
    createEnergyModel({ tick: 500 }).perUnit,
    'the tick must actually move the electrical readings',
  );
});

test('energy model meters every RTU in registry order with plausible electrics', () => {
  const model = createEnergyModel({ tick: 0 });
  assert.equal(model.perUnit.length, TC300_DEVICES.length);
  assert.deepEqual(
    model.perUnit.map(({ tc300Id }) => tc300Id),
    TC300_DEVICES.map(({ id }) => id),
  );
  for (const meter of model.perUnit) {
    assert.match(meter.unitId, /^RTU-\d{2}$/);
    assert.equal(typeof meter.zoneLabel, 'string');
    assert.ok(meter.kw >= 4 && meter.kw <= 17, `${meter.unitId} kW out of band: ${meter.kw}`);
    assert.ok(Number.isInteger(meter.voltage) && meter.voltage >= 220 && meter.voltage <= 232);
    assert.ok(meter.powerFactor >= 0.85 && meter.powerFactor <= 0.97);
  }
});

test('energy headline is the sum of the per-unit meters and the periods nest', () => {
  const model = createEnergyModel({ tick: 42 });
  const sum = round1(model.perUnit.reduce((total, { kw }) => total + kw, 0));
  assert.equal(model.nowKw, sum, 'the headline must be the sum of its own table');
  assert.ok(Number.isInteger(model.previousDayKwh) && model.previousDayKwh > 0);
  assert.ok(Number.isInteger(model.monthKwh) && model.monthKwh > model.previousDayKwh);
  assert.equal(typeof model.vsPreviousDayPct, 'number');
});

test('per-unit energy series are seeded, stable, and sized like the temp series', () => {
  const first = createUnitEnergySeries(0);
  assert.equal(first.length, 48);
  assert.deepEqual(first, createUnitEnergySeries(0), 'same index, same series');
  assert.notDeepEqual(first, createUnitEnergySeries(1), 'each unit gets its own walk');
  assert.ok(first.every((value) => value > 0), 'kW never goes negative');
  assert.throws(() => createUnitEnergySeries(-1), RangeError);
  assert.ok(ENERGY_POLICY.seedStride > 0);
});

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

test('weather model is deterministic and speaks the fixed condition vocabulary', () => {
  assert.deepEqual(createWeatherModel({ tick: 0 }), createWeatherModel({ tick: 0 }));
  const model = createWeatherModel({ tick: 0 });
  assert.equal(model.city, 'Ciudad de México');
  assert.ok(WEATHER_CONDITIONS.includes(model.current.condition));
  assert.ok(model.current.temperature >= 5 && model.current.temperature <= 35);
  assert.ok(model.current.humidityPct >= 20 && model.current.humidityPct <= 90);
  assert.ok(model.current.windKmh >= 0 && model.current.windKmh <= 40);
});

test('weather forecast is a coherent 7-day strip', () => {
  // CONTRACT CHANGE (client round 3, 2026-07-18, BMS reference): the strip grows 5 → 7 days.
  // Same seeded per-day derivation, two more day offsets — no new data source.
  const { forecast } = createWeatherModel({ tick: 300 });
  assert.equal(forecast.length, 7);
  for (const day of forecast) {
    assert.match(day.dayLabel, /^(Dom|Lun|Mar|Mié|Jue|Vie|Sáb)$/);
    assert.ok(day.minC < day.maxC, `${day.dayLabel}: min must stay under max`);
    assert.ok(WEATHER_CONDITIONS.includes(day.condition));
  }
});

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

test('weekly schedule covers the seven days with parseable hours', () => {
  assert.equal(WEEKLY_SCHEDULE.length, 7);
  assert.deepEqual(
    WEEKLY_SCHEDULE.map(({ day }) => day),
    ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  );
  for (const entry of WEEKLY_SCHEDULE) {
    assert.match(entry.opening, /^\d{2}:\d{2}$/);
    assert.match(entry.closing, /^\d{2}:\d{2}$/);
  }
});

test('setpoint calendar stays inside the simulation setpoint limits', () => {
  assert.ok(SETPOINT_CALENDAR.length >= 3);
  for (const period of SETPOINT_CALENDAR) {
    assert.equal(typeof period.period, 'string');
    for (const value of [period.salasC, period.comunesC]) {
      assert.ok(
        value >= SETPOINT_LIMITS.min && value <= SETPOINT_LIMITS.max,
        `${period.period}: ${value} °C escapes the TC300 setpoint limits`,
      );
    }
  }
  const model = createScheduleModel();
  assert.deepEqual(model.week, WEEKLY_SCHEDULE);
  assert.deepEqual(model.calendar, SETPOINT_CALENDAR);
});

// ---------------------------------------------------------------------------
// Plant room (runtime hours derived over the topology)
// ---------------------------------------------------------------------------

test('plant model derives one row per RTU with topology-backed facts', () => {
  const model = createPlantModel({ tick: 0 });
  assert.equal(model.units.length, TC300_DEVICES.length);
  const cabinetById = new Map(UC100_DEVICES.map(({ id, cabinet }) => [id, cabinet]));
  for (const [index, unit] of model.units.entries()) {
    const device = TC300_DEVICES[index];
    assert.equal(unit.tc300Id, device.id);
    assert.equal(unit.bus, device.uc100Id.at(-1));
    assert.equal(unit.uc100Id, device.uc100Id);
    assert.equal(unit.cabinet, cabinetById.get(device.uc100Id));
    assert.match(unit.dropLabel, /^RS-485 → UC100-[A-D]$/);
    assert.ok(unit.compressorHours > 0);
    assert.ok(unit.fanHours > unit.compressorHours, 'the fan always outruns the compressor');
    assert.ok(unit.setpoint >= SETPOINT_LIMITS.min && unit.setpoint <= SETPOINT_LIMITS.max);
  }
});

test('plant runtime hours are deterministic and advance with the tick', () => {
  assert.deepEqual(createPlantModel({ tick: 10 }), createPlantModel({ tick: 10 }));
  const early = createPlantModel({ tick: 0 }).units[0];
  const late = createPlantModel({ tick: 200_000 }).units[0];
  assert.ok(late.compressorHours > early.compressorHours, 'hours accumulate over ticks');
});

// ---------------------------------------------------------------------------
// Alerts (derived from sim deviations — menu data only, never scene state)
// ---------------------------------------------------------------------------

test('alert derivation returns empty for zero deviations', () => {
  const alerts = deriveAlerts({
    units: [{ id: 'TC300-01', zoneLabel: 'Vestíbulo', temperature: 22, setpoint: 22, band: [20.5, 23.5] }],
    links: [{ id: 'UC100-A', rssi: -60 }],
    meters: [{ unitId: 'RTU-01', zoneLabel: 'Vestíbulo', kw: 9 }],
  });
  assert.deepEqual(alerts, []);
});

test('alert thresholds are strict: the boundary itself never fires', () => {
  const band = [20.5, 23.5];
  const atEdge = deriveAlerts({
    units: [{ id: 'TC300-01', zoneLabel: 'Vestíbulo', temperature: band[1], setpoint: 22, band }],
    links: [{ id: 'UC100-A', rssi: ALERT_THRESHOLDS.rssiFloorDbm }],
    meters: [{ unitId: 'RTU-01', zoneLabel: 'Vestíbulo', kw: ALERT_THRESHOLDS.unitKwCeiling }],
  });
  assert.deepEqual(atEdge, [], 'sitting exactly on every threshold is still healthy');

  const pastEdge = deriveAlerts({
    units: [{ id: 'TC300-01', zoneLabel: 'Vestíbulo', temperature: band[1] + 0.1, setpoint: 22, band }],
    links: [{ id: 'UC100-A', rssi: ALERT_THRESHOLDS.rssiFloorDbm - 1 }],
    meters: [{ unitId: 'RTU-01', zoneLabel: 'Vestíbulo', kw: ALERT_THRESHOLDS.unitKwCeiling + 0.1 }],
  });
  assert.equal(pastEdge.length, 3);
  assert.deepEqual(
    [...new Set(pastEdge.map(({ category }) => category))].sort(),
    ['Comunicación', 'HVAC', 'Temperatura'].sort(),
  );
});

test('derived alerts carry category, severity and an es-MX message', () => {
  const alerts = deriveAlerts({
    units: [{ id: 'TC300-05', zoneLabel: 'Cocina y preparación', temperature: 27.9, setpoint: 22, band: [20.5, 23.5] }],
    links: [{ id: 'UC100-D', rssi: -104 }],
    meters: [],
  });
  assert.equal(alerts.length, 2);
  for (const alert of alerts) {
    assert.ok(ALERT_CATEGORIES.includes(alert.category));
    assert.match(alert.severity, /^(advertencia|crítica)$/);
    assert.equal(typeof alert.message, 'string');
    assert.ok(alert.message.length > 0);
  }
  // A deviation past twice the tolerance and an RSSI under the hard floor are both critical.
  assert.ok(alerts.every(({ severity }) => severity === 'crítica'));
});

test('alerts model is deterministic over the live simulation and counts all four categories', () => {
  assert.deepEqual(createAlertsModel({ tick: 0 }), createAlertsModel({ tick: 0 }));
  const model = createAlertsModel({ tick: 0 });
  assert.deepEqual(Object.keys(model.countsByCategory), [...ALERT_CATEGORIES]);
  assert.equal(
    model.total,
    Object.values(model.countsByCategory).reduce((sum, count) => sum + count, 0),
  );
  assert.equal(model.countsByCategory.Sistema, 0, 'the healthy sim derives no system faults — honest zero');
  for (const alert of model.alerts) {
    assert.ok(ALERT_CATEGORIES.includes(alert.category));
  }
});

test('alerts derive only from the one healthy simulation seed', () => {
  // Every alert references a device the config actually owns.
  const knownIds = new Set([
    ...TC300_DEVICES.map(({ id }) => id),
    ...UC100_DEVICES.map(({ id }) => id),
    ...TC300_DEVICES.map(({ id }) => `RTU-${id.slice(-2)}`),
  ]);
  const model = createAlertsModel({ tick: 90 });
  for (const alert of model.alerts) {
    assert.ok(knownIds.has(alert.deviceId), `${alert.deviceId} is not a configured device`);
  }
  assert.equal(APP_CONFIG.animation.seed, 30067, 'the sim seed contract the modules inherit');
});
