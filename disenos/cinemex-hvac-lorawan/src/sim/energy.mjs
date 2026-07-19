/**
 * Deterministic electrical metering for the menu's Energía section.
 *
 * Menu data ONLY: nothing here touches scene state. Seeded by the simulation's own animation
 * seed (APP_CONFIG.animation.seed), so the same tick always yields the same meters, and the
 * headline kW is the SUM of its own per-unit table — the table can always be audited against
 * the number above it.
 */
import { APP_CONFIG, TC300_DEVICES, ZONES } from '../config.mjs';
import { createSeededRandom } from '../dashboard/series.mjs';
import { deterministicUnit, round } from './seed.mjs';

export const ENERGY_POLICY = Object.freeze({
  seedBase: APP_CONFIG.animation.seed,
  // Offset the energy walks away from the temperature walks (series.mjs uses stride 37 from the
  // same base) so the two families never share a PRNG stream.
  seedOffset: 7481,
  seedStride: 53,
  points: 48,
  // Nominal supply and the demand wave each meter rides (kW around its zone base).
  voltageNominal: 227,
  waveAmplitudeKw: 1.1,
  // Average equivalent full-load hours: how "yesterday" and "the month" scale from live demand.
  previousDayHours: 19.5,
  daysPerMonth: 26.4,
  // Client round 4 (2026-07-18) — distribution split policy. The RTU meters are the only live
  // feed, so the split derives from them: each packaged unit spends a seeded, per-unit share of
  // its demand on the supply fan (Ventilación) and the rest on compression (Climatización).
  // The house lighting is ALWAYS ON in this representation (2026-07-15 decision), so Iluminación
  // is a fixed building baseline; Otros (proyección, dulcería, TI) is the remaining fixed base.
  fanShareBase: 0.17,
  fanShareSpread: 0.06,
  lightingKw: 16.8,
  otherKw: 9.4,
  // Period sparklines: yesterday rides its own seeded stream; the month series is one point per
  // equivalent day (26 full days inside the 26.4-day scaling policy above).
  previousDaySeed: 9203,
  monthSeed: 9901,
  monthPoints: 26,
});

const SECONDS_PER_DAY = 86_400;

/** Base electrical demand per zone kind/family — a packaged RTU sized for the room it serves. */
const BASE_KW = Object.freeze({
  large: 11.2,
  medium: 9.6,
  small: 8.1,
  lobby: 12.4,
  concessions: 11.1,
  kitchen: 13.9,
  'ticket-checkpoint': 6.9,
  'central-corridor': 7.3,
  administration: 6.2,
});

function baseKwFor(device) {
  const zone = ZONES.find(({ id }) => id === device.zoneId);
  if (zone?.kind === 'auditorium') {
    const room = APP_CONFIG.auditoriums.find(({ zoneId }) => zoneId === device.zoneId);
    return BASE_KW[room.family];
  }
  return BASE_KW[device.zoneId];
}

/** One meter row: kW rides a per-unit phase wave; V and PF are stable per-unit facts. */
function meterFor(device, tick, seed) {
  const zone = ZONES.find(({ id }) => id === device.zoneId);
  const phase = deterministicUnit(seed, `energy:${device.id}`) * Math.PI * 2;
  const kw = round(baseKwFor(device) + ENERGY_POLICY.waveAmplitudeKw * Math.sin(phase + tick * 0.03));
  const voltage = ENERGY_POLICY.voltageNominal
    + Math.round((deterministicUnit(seed, `voltage:${device.id}`) - 0.5) * 4);
  const powerFactor = round(0.87 + deterministicUnit(seed, `pf:${device.id}`) * 0.07, 2);
  return Object.freeze({
    unitId: `RTU-${device.id.slice(-2)}`,
    tc300Id: device.id,
    zoneLabel: zone.label,
    kw,
    voltage,
    powerFactor,
  });
}

export function createEnergyModel({ tick = 0 } = {}) {
  const seed = ENERGY_POLICY.seedBase;
  const perUnit = TC300_DEVICES.map((device) => meterFor(device, tick, seed));
  const nowKw = round(perUnit.reduce((total, { kw }) => total + kw, 0));
  const baseTotalKw = TC300_DEVICES.reduce((total, device) => total + baseKwFor(device), 0);
  const previousDayKwh = Math.round(baseTotalKw * ENERGY_POLICY.previousDayHours);
  const monthKwh = Math.round(previousDayKwh * ENERGY_POLICY.daysPerMonth);
  const vsPreviousDayPct = round(((nowKw - baseTotalKw) / baseTotalKw) * 100);
  // Client round 4 — period comparisons. The sim only owns ONE modeled day/month, so the earlier
  // periods are seeded plausibilities anchored to the modeled ones: a ±6% seeded factor keyed on
  // the elapsed sim day (resp. a ±5% factor for the previous month). Deterministic per tick.
  const elapsedDays = Math.floor((tick * APP_CONFIG.animation.stepSeconds) / SECONDS_PER_DAY);
  const dayFactor = (deterministicUnit(seed, `vs-day:${elapsedDays}`) - 0.5) * 0.12;
  const dayBeforeKwh = Math.round(previousDayKwh * (1 + dayFactor));
  const vsSameDayPct = round(((previousDayKwh - dayBeforeKwh) / dayBeforeKwh) * 100);
  const monthFactor = (deterministicUnit(seed, 'vs-month:0') - 0.5) * 0.1;
  const previousMonthKwh = Math.round(monthKwh * (1 + monthFactor));
  const vsPreviousMonthPct = round(((monthKwh - previousMonthKwh) / previousMonthKwh) * 100);
  return Object.freeze({
    tick,
    nowKw,
    previousDayKwh,
    monthKwh,
    vsPreviousDayPct,
    dayBeforeKwh,
    vsSameDayPct,
    previousMonthKwh,
    vsPreviousMonthPct,
    perUnit: Object.freeze(perUnit),
  });
}

/** Distribution categories, in mockup order. Climatización/Ventilación split the live RTU
 *  demand per the seeded fan share; Iluminación/Otros are the documented fixed baselines. */
const DISTRIBUTION_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'climatizacion', label: 'Climatización' }),
  Object.freeze({ id: 'ventilacion', label: 'Ventilación' }),
  Object.freeze({ id: 'iluminacion', label: 'Iluminación' }),
  Object.freeze({ id: 'otros', label: 'Otros' }),
]);

/**
 * Client round 4 — deterministic building-load split for the Energía donut.
 * Derivation (documented, all seeded — no invented feeds):
 *  - Each RTU meter's live kW splits into supply-fan power (a per-unit seeded share within
 *    fanShareBase..fanShareBase+fanShareSpread) and compression power.
 *  - Iluminación is the always-on house-lighting baseline; Otros the remaining fixed base.
 * Shares carry ONE decimal and are largest-remainder corrected so they always sum to 100.0.
 */
export function createEnergyDistribution({ tick = 0 } = {}) {
  const seed = ENERGY_POLICY.seedBase;
  const model = createEnergyModel({ tick });
  let compressionKw = 0;
  let fanKw = 0;
  for (const meter of model.perUnit) {
    const fanShare = ENERGY_POLICY.fanShareBase
      + deterministicUnit(seed, `fan-share:${meter.tc300Id}`) * ENERGY_POLICY.fanShareSpread;
    fanKw += meter.kw * fanShare;
    compressionKw += meter.kw * (1 - fanShare);
  }
  const kwBySegment = [compressionKw, fanKw, ENERGY_POLICY.lightingKw, ENERGY_POLICY.otherKw];
  const totalKw = kwBySegmentSum(kwBySegment);
  // One-decimal shares that sum to exactly 100.0: floor to tenths, then hand the missing tenths
  // to the largest remainders (deterministic tie-break by segment order).
  const rawTenths = kwBySegment.map((kw) => (kw / totalKw) * 1000);
  const tenths = rawTenths.map((value) => Math.floor(value));
  let missing = 1000 - tenths.reduce((total, value) => total + value, 0);
  const order = rawTenths
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let cursor = 0; missing > 0; cursor = (cursor + 1) % order.length, missing -= 1) {
    tenths[order[cursor].index] += 1;
  }
  const segments = DISTRIBUTION_SEGMENTS.map((segment, index) => Object.freeze({
    ...segment,
    kw: round(kwBySegment[index]),
    sharePct: tenths[index] / 10,
  }));
  return Object.freeze({ tick, totalKw: round(totalKw), segments: Object.freeze(segments) });
}

const kwBySegmentSum = (values) => values.reduce((total, value) => total + value, 0);

/** Fleet 24 h kW series: the pointwise sum of the fourteen unit series — always auditable
 *  against the per-unit strips the Energía table shows. */
export function createFleetEnergySeries({ points = ENERGY_POLICY.points } = {}) {
  const unitSeries = TC300_DEVICES.map((_, index) => createUnitEnergySeries(index, { points }));
  return Array.from({ length: points }, (_, index) => (
    round(unitSeries.reduce((total, series) => total + series[index], 0))
  ));
}

/** Seeded mean-reverting walk shared by the period sparklines. */
function seededWalk({ seed, base, points, noise, floor }) {
  const random = createSeededRandom(seed);
  const series = [];
  let value = base;
  for (let index = 0; index < points; index += 1) {
    value += (random() - 0.5) * noise + (base - value) * 0.2;
    series.push(Math.max(floor, round(value, 2)));
  }
  return series;
}

/** Yesterday's fleet kW curve (48 half-hour points) on its own seeded stream. */
export function createPreviousDaySeries({ points = ENERGY_POLICY.points } = {}) {
  const baseTotalKw = TC300_DEVICES.reduce((total, device) => total + baseKwFor(device), 0);
  return seededWalk({
    seed: ENERGY_POLICY.seedBase + ENERGY_POLICY.previousDaySeed,
    base: baseTotalKw,
    points,
    noise: 6,
    floor: 1,
  });
}

/** The month's daily kWh series (one point per equivalent day). */
export function createMonthDailySeries({ points = ENERGY_POLICY.monthPoints } = {}) {
  const baseTotalKw = TC300_DEVICES.reduce((total, device) => total + baseKwFor(device), 0);
  const previousDayKwh = Math.round(baseTotalKw * ENERGY_POLICY.previousDayHours);
  return seededWalk({
    seed: ENERGY_POLICY.seedBase + ENERGY_POLICY.monthSeed,
    base: previousDayKwh,
    points,
    noise: previousDayKwh * 0.08,
    floor: 1,
  });
}

/**
 * 24 h kW series for one unit (Tendencias): the same mulberry32 walk family as the temperature
 * series in dashboard/series.mjs, seeded on its own offset stream, mean-reverting around the
 * unit's base demand so a flat-ish line is the healthy read.
 */
export function createUnitEnergySeries(unitIndex, { points = ENERGY_POLICY.points } = {}) {
  if (!Number.isInteger(unitIndex) || unitIndex < 0) {
    throw new RangeError('A unit energy series needs the unit registry index.');
  }
  const device = TC300_DEVICES[unitIndex];
  const base = device ? baseKwFor(device) : 9;
  const random = createSeededRandom(
    ENERGY_POLICY.seedBase + ENERGY_POLICY.seedOffset + unitIndex * ENERGY_POLICY.seedStride,
  );
  const series = [];
  let value = base;
  for (let index = 0; index < points; index += 1) {
    value += (random() - 0.5) * 0.9 + (base - value) * 0.2;
    series.push(Math.max(0.1, round(value, 2)));
  }
  return series;
}
