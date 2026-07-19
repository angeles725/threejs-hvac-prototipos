/**
 * Deterministic lighting inventory + scene program for the menu's Iluminación section.
 *
 * Menu data ONLY — nothing here touches the 3D scene. The house lighting is ALWAYS ON in this
 * representation (2026-07-15 decision), so this module never simulates switching: it derives
 * (a) a seeded per-area luminaire inventory over the REAL zone layout, (b) the daily scene
 * program with statuses read off the sim clock, and (c) lighting consumption/savings anchored
 * to the same always-on lighting baseline the Energía donut uses (ENERGY_POLICY.lightingKw),
 * so both sections tell one coherent story.
 *
 * Honesty bounds (documented): the sim owns ONE modeled day/month, so "ayer" and "mes
 * anterior" are seeded plausibilities anchored to the modeled baseline — every rendered
 * percentage audits against its own kWh pair, same convention as the round-4 energy cards.
 */
import { APP_CONFIG } from '../config.mjs';
import { ENERGY_POLICY } from './energy.mjs';
import { deterministicUnit, round } from './seed.mjs';

const SECONDS_PER_DAY = 86_400;
/** Sim epoch is 12:00 — minutes-of-day start there (same convention as the telemetry clock). */
const EPOCH_MINUTES = 12 * 60;

export const LIGHTING_SIM_POLICY = Object.freeze({
  // Seeded unavailable luminaires per area: 0..failureMax, keyed per area (not per day) so the
  // inventory is a stable fact of the representation, not a churn animation.
  failureMax: 2,
  // "Ayer a esta misma hora" seeded envelope (±4%) and the month-over-month saving (2–6%).
  dayFactorSpread: 0.08,
  savingsMin: 0.02,
  savingsSpread: 0.04,
});

/**
 * The luminaire inventory, over the REAL zone layout (config.mjs ZONES / AUDITORIUMS). Counts
 * are declared design baselines (a room's luminaire count is a declaration, like a schedule);
 * what the sim DERIVES is the seeded operative count under each total. The mockup's "Baños"
 * area is omitted: the validated plan has no such zone (documented deviation). Salas group
 * 1–4 (west) / 5–8 (east) as built — the mockup's "5–7" miscounts the east wing.
 */
export const LIGHTING_AREAS = Object.freeze([
  Object.freeze({ id: 'lobby', label: 'Vestíbulo', total: 36 }),
  Object.freeze({ id: 'concessions', label: 'Dulcería', total: 18 }),
  Object.freeze({ id: 'ticket-checkpoint', label: 'Revisión de boletos', total: 8 }),
  Object.freeze({ id: 'central-corridor', label: 'Pasillo central', total: 24 }),
  Object.freeze({ id: 'salas-oeste', label: 'Salas 1–4', total: 48 }),
  Object.freeze({ id: 'salas-este', label: 'Salas 5–8', total: 48 }),
  Object.freeze({ id: 'kitchen', label: 'Cocina', total: 14 }),
  Object.freeze({ id: 'administration', label: 'Oficina', total: 10 }),
  Object.freeze({ id: 'exterior', label: 'Exteriores y fachada', total: 22 }),
]);

/**
 * The daily scene program: WHEN each operating moment begins, aligned with the operating
 * schedule (schedules.mjs): opening at 10:00, matiné/función from noon, the exterior façade
 * program at dusk, closing circulation from 22:00. A scene describes light mood only — it
 * never named a camera and never will (single-view rule).
 */
export const LIGHT_SCENE_PROGRAM = Object.freeze([
  Object.freeze({ sceneId: 'apertura', time: '10:00' }),
  Object.freeze({ sceneId: 'funcion', time: '12:00' }),
  Object.freeze({ sceneId: 'exteriores', time: '19:00' }),
  Object.freeze({ sceneId: 'cierre', time: '22:00' }),
]);

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Minutes-of-day of the sim clock at this tick (epoch = 12:00). */
export function simMinutesOfDay(tick) {
  return (EPOCH_MINUTES + Math.floor((tick * APP_CONFIG.animation.stepSeconds) / 60)) % 1440;
}

export function createLightingModel({ tick = 0, sceneId = null } = {}) {
  const seed = APP_CONFIG.animation.seed;
  const minutes = simMinutesOfDay(tick);
  const elapsedDays = Math.floor((tick * APP_CONFIG.animation.stepSeconds) / SECONDS_PER_DAY);

  // --- Inventory: seeded operative counts under the declared totals. The failure draw is
  // scaled by area size (a 48-lamp wing can carry two outages; an 8-lamp checkpoint cannot),
  // so small areas never render an implausible outage share in a healthy representation. ---
  const areas = LIGHTING_AREAS.map((area) => {
    const failures = Math.min(
      LIGHTING_SIM_POLICY.failureMax,
      Math.floor(
        deterministicUnit(seed, `lum:${area.id}`)
        * (LIGHTING_SIM_POLICY.failureMax + 1) * (area.total / 48),
      ),
    );
    const operative = area.total - failures;
    return Object.freeze({
      ...area,
      operative,
      pct: round((operative / area.total) * 100),
    });
  });
  const total = areas.reduce((sum, area) => sum + area.total, 0);
  const operative = areas.reduce((sum, area) => sum + area.operative, 0);
  const fleet = Object.freeze({ total, operative, pct: round((operative / total) * 100) });

  // --- Scene program statuses off the sim clock. Before the first entry (early morning) the
  // carry-over from yesterday's last scene (Cierre) is the active one. ---
  const startsBeforeNow = LIGHT_SCENE_PROGRAM.filter((entry) => minutesOf(entry.time) <= minutes);
  const scheduled = startsBeforeNow.at(-1) ?? LIGHT_SCENE_PROGRAM.at(-1);
  const program = LIGHT_SCENE_PROGRAM.map((entry) => Object.freeze({
    ...entry,
    status: entry.sceneId === scheduled.sceneId
      ? 'activa'
      : minutesOf(entry.time) <= minutes ? 'completada' : 'programada',
  }));
  const known = LIGHT_SCENE_PROGRAM.some((entry) => entry.sceneId === sceneId);
  const manual = known && sceneId !== scheduled.sceneId;
  const activeSceneId = known ? sceneId : scheduled.sceneId;

  // --- Consumption: the always-on baseline integrated over today's hours so far. ---
  const hoursToday = minutes / 60;
  const todayKwh = Math.round(ENERGY_POLICY.lightingKw * hoursToday);
  const dayFactor = (deterministicUnit(seed, `lum-day:${elapsedDays}`) - 0.5)
    * LIGHTING_SIM_POLICY.dayFactorSpread;
  const yesterdayKwh = Math.max(1, Math.round(ENERGY_POLICY.lightingKw * hoursToday * (1 + dayFactor)));
  const vsYesterdayPct = todayKwh === 0
    ? 0
    : round(((todayKwh - yesterdayKwh) / yesterdayKwh) * 100);

  // --- Savings vs the seeded previous month, anchored to the same baseline. ---
  const monthKwh = Math.round(ENERGY_POLICY.lightingKw * 24 * ENERGY_POLICY.daysPerMonth);
  const savingFactor = LIGHTING_SIM_POLICY.savingsMin
    + deterministicUnit(seed, 'lum-month:0') * LIGHTING_SIM_POLICY.savingsSpread;
  const previousMonthKwh = Math.round(monthKwh / (1 - savingFactor));
  const savings = Object.freeze({
    monthKwh,
    previousMonthKwh,
    equivalentKwh: previousMonthKwh - monthKwh,
    pct: round(((previousMonthKwh - monthKwh) / previousMonthKwh) * 100),
  });

  return Object.freeze({
    tick,
    minutesOfDay: minutes,
    areas: Object.freeze(areas),
    fleet,
    program: Object.freeze(program),
    scheduledSceneId: scheduled.sceneId,
    activeSceneId,
    manual,
    activeSince: scheduled.time,
    consumption: Object.freeze({ todayKwh, yesterdayKwh, vsYesterdayPct }),
    savings,
  });
}
