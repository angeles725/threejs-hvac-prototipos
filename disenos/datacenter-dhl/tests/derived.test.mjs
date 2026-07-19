/**
 * DHL mirror round 1 — deterministic sim EXTENSIONS that back the round-4/5 section anatomy
 * (ported from the cinemex sibling's approved generation, re-derived for datacenter data).
 *
 * Contract under test (RED-first):
 *   - sim clock: tick → deterministic timestamp / hour-of-day (15 min per tick, noon epoch);
 *   - weather `derived` block: UV (solar window × condition ceiling, WHO bands), feels-like
 *     (documented formula), rain probability, HVAC-demand relation, dew point (Magnus),
 *     visibility and pressure — every figure derived, no second climate truth; forecast days
 *     gain seeded humidityPct/windKmh;
 *   - energy rollup gains truthful facility distribution (TI / Enfriamiento / Otros, summing to
 *     the PDU delivery) plus seeded day/month comparisons that audit against their own kWh;
 *   - alerts gain a sim timestamp and a TRUTHFUL resolved-episode day-walk (DHL's margin-safe
 *     waves never cross a threshold, so resolvedToday is an honest 0 — the machinery is real);
 *   - maintenance status: current sim day/time, the next upcoming window + countdown, and a
 *     weekly summary — all from the declared windows, nothing invented.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { SIM_POLICY, createEquipmentModel } from '../src/sim/equipment.mjs';
import {
  MINUTES_PER_TICK,
  SIM_EPOCH_ISO,
  simHourOfDay,
  simTimestamp,
} from '../src/sim/clock.mjs';
import {
  createEnergyRollup,
  createSiteAlerts,
  createSiteWeather,
  deriveMaintenanceStatus,
  deriveResolvedEpisodes,
} from '../src/sim/site.mjs';

const TICKS = [0, 7, 31, 100];

test('clock: 15 min per tick from the noon epoch, deterministic hour-of-day', () => {
  assert.equal(MINUTES_PER_TICK, 15);
  assert.equal(simTimestamp(0), new Date(SIM_EPOCH_ISO).toISOString());
  // 4 ticks = 1 hour (TICKS_PER_HOUR); epoch is noon.
  assert.equal(simHourOfDay(0), 12);
  assert.equal(simHourOfDay(4), 13);
  assert.equal(simHourOfDay(48), 0, 'wraps at midnight (48 ticks = 12 h)');
  const a = simTimestamp(31);
  assert.equal(a, simTimestamp(31), 'deterministic');
  assert.equal(new Date(a).getTime() - new Date(SIM_EPOCH_ISO).getTime(), 31 * 15 * 60_000);
});

test('weather derived: UV rides the solar window and the condition ceiling (WHO bands)', () => {
  for (const tick of TICKS) {
    const { derived } = createSiteWeather({ tick });
    assert.ok(derived.uv.index >= 0 && derived.uv.index <= 11, `tick ${tick} UV in range`);
    assert.ok(derived.uv.level.length > 0 && derived.uv.advice.length > 0);
  }
  // Deterministic; solar noon (13:00, tick 4) is at least as strong as dawn (tick 48 = 00:00 → 0).
  const noon = createSiteWeather({ tick: 4 }).derived.uv.index;
  const midnight = createSiteWeather({ tick: 48 }).derived.uv.index;
  assert.equal(midnight, 0, 'no UV at night');
  assert.ok(noon > midnight, 'the solar window peaks by day');
});

test('weather derived: feels-like, rain, HVAC relation, dew/visibility/pressure all present', () => {
  const { derived, current } = createSiteWeather({ tick: 0 });
  // Feels-like formula: dry-bulb + 0.04·(RH−50) − 0.06·wind.
  const expected = Number((current.temperatureC + 0.04 * (current.humidityPct - 50)
    - 0.06 * current.windKmh).toFixed(1));
  assert.equal(derived.feelsLike.c, expected, 'feels-like follows the documented formula');
  assert.ok(typeof derived.feelsLike.deltaLabel === 'string');
  assert.ok(derived.rain.nowPct >= 0 && derived.rain.nowPct <= 100);
  assert.ok(Array.isArray(derived.rain.days) && derived.rain.days.length >= 3);
  assert.ok(derived.hvacRelation.pct >= 0 && derived.hvacRelation.pct <= 100);
  assert.ok(['Baja', 'Media', 'Alta'].includes(derived.hvacRelation.level));
  assert.ok(Number.isFinite(derived.dew.c) && derived.dew.label.length > 0);
  assert.ok(derived.visibility.km > 0 && derived.pressure.hpa > 800);
});

test('weather: forecast days gain seeded humidity and wind, still 7 deterministic days', () => {
  const a = createSiteWeather({ tick: 31 });
  const b = createSiteWeather({ tick: 31 });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.equal(a.forecast.length, 7);
  for (const day of a.forecast) {
    assert.ok(day.humidityPct >= 10 && day.humidityPct <= 90, `${day.dayLabel} humidity`);
    assert.ok(day.windKmh >= 2 && day.windKmh <= 30, `${day.dayLabel} wind`);
  }
});

test('energy distribution: truthful segments that sum to the PDU delivery and to 100%', () => {
  for (const tick of [0, 31]) {
    const rollup = createEnergyRollup({ tick });
    const dist = rollup.distribution;
    assert.ok(Array.isArray(dist.segments) && dist.segments.length >= 2);
    // Shares sum to exactly 100.0 (largest-remainder corrected).
    const pctSum = Number(dist.segments.reduce((acc, s) => acc + s.pct, 0).toFixed(1));
    assert.equal(pctSum, 100, `tick ${tick} shares sum to 100`);
    // Every segment kW is a real sub-read; the IT segment equals the rack rollup.
    const it = dist.segments.find((s) => s.key === 'ti');
    assert.equal(it.kw, rollup.itLoadKw, 'TI segment IS the instrumented rack sum');
    // The segments never exceed the delivered PDU load.
    const kwSum = Number(dist.segments.reduce((acc, s) => acc + s.kw, 0).toFixed(1));
    assert.ok(kwSum <= rollup.pdu.kw + 0.05, `tick ${tick} segments fit the PDU delivery`);
  }
});

test('energy comparisons: seeded day/month deltas audit against their own kWh pairs', () => {
  const rollup = createEnergyRollup({ tick: 0 });
  assert.ok(Number.isFinite(rollup.nowKw) && rollup.nowKw === rollup.pdu.kw);
  assert.ok(rollup.previousDayKwh > 0 && Number.isFinite(rollup.vsPreviousDayPct));
  // The rendered percentage must reconcile with the kWh pair it claims to compare.
  const todayKwh = rollup.todayKwh;
  const audit = Number((((todayKwh - rollup.previousDayKwh) / rollup.previousDayKwh) * 100).toFixed(1));
  assert.equal(rollup.vsPreviousDayPct, audit, 'vs-previous-day audits against its kWh pair');
});

test('alerts: gain a sim timestamp; resolved-episode day-walk is a real, honest derivation', () => {
  for (const tick of TICKS) {
    const alerts = createSiteAlerts({ tick });
    assert.equal(alerts.timestamp, simTimestamp(tick), `tick ${tick} timestamp`);
    assert.ok(Array.isArray(alerts.resolved), 'resolved list present');
    assert.equal(alerts.resolvedToday, alerts.resolved.length, 'resolvedToday counts the list');
    // DHL's non-warn units sit safely below their thresholds by margin construction, so the
    // day-walk finds no band re-entries: an HONEST zero, not a fabricated history.
    assert.equal(alerts.resolvedToday, 0, `tick ${tick}: margin-safe sim → 0 resolved episodes`);
  }
  const episodes = deriveResolvedEpisodes({ tick: 95 });
  assert.ok(Array.isArray(episodes) && episodes.length === 0, 'the walk returns a real (empty) list');
});

test('maintenance status: current sim day/time, the next window + countdown, weekly summary', () => {
  const status = deriveMaintenanceStatus({ tick: 0 });
  assert.ok(status.now.dayLabel.length > 0 && /^\d{2}:\d{2}$/.test(status.now.time));
  assert.ok(status.next && status.next.label.length > 0);
  assert.match(status.countdownLabel, /^En \d+ (h|min)/);
  assert.equal(status.weeklySummary.totalWindows, SIM_POLICY.kinds ? 11 : 11);
  assert.ok(status.weeklySummary.totalWindows === 11, 'one window per registered instance');
  const again = deriveMaintenanceStatus({ tick: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(status)), JSON.parse(JSON.stringify(again)));
});
