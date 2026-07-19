/**
 * Deterministic 24 h series per unit — the hotel dashboard's seeding policy, re-derived for
 * cinemex: mulberry32 PRNG, seed = the simulation's OWN animation seed (APP_CONFIG.animation.seed
 * = 30067) + unitIndex * 37, 48 points (one every 30 min). The series is PRESENTATION history
 * anchored to the live truth: it mean-reverts around the unit's setpoint (flat line = healthy)
 * and its last point IS the live temperature — the one value the simulation owns.
 */
import { APP_CONFIG } from '../config.mjs';

export const SERIES_POLICY = Object.freeze({
  seedBase: APP_CONFIG.animation.seed,
  seedStride: 37,
  points: 48,
  minutesPerPoint: 30,
  // Mean-reverting walk parameters: ±0.25 °C noise, 15% pull back to the setpoint per step.
  noiseAmplitude: 0.5,
  reversion: 0.15,
});

/** mulberry32 — same generator family the hotel policy documented. */
export function createSeededRandom(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} unitIndex   0-based index in the TC300 registry order.
 * @param {{ setpoint: number, temperature: number }} reading
 * @returns {number[]} 48 samples, oldest first; the last sample equals `temperature`.
 */
export function createUnitSeries(unitIndex, { setpoint, temperature } = {}) {
  if (!Number.isInteger(unitIndex) || unitIndex < 0) {
    throw new RangeError('A unit series needs the unit registry index.');
  }
  if (!Number.isFinite(setpoint) || !Number.isFinite(temperature)) {
    throw new RangeError('A unit series needs the live setpoint and temperature.');
  }
  const random = createSeededRandom(SERIES_POLICY.seedBase + unitIndex * SERIES_POLICY.seedStride);
  const points = [];
  let value = setpoint;
  for (let index = 0; index < SERIES_POLICY.points; index += 1) {
    value += (random() - 0.5) * SERIES_POLICY.noiseAmplitude + (setpoint - value) * SERIES_POLICY.reversion;
    points.push(value);
  }
  points[SERIES_POLICY.points - 1] = temperature;
  return points;
}
