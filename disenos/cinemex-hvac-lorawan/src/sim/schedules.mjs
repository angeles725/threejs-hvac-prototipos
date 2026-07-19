/**
 * Operating schedule for the menu's Horarios section: the weekly sala grid and the RTU setpoint
 * calendar. Static deterministic data (no PRNG needed — a schedule IS a declaration), kept inside
 * the simulation's own setpoint limits so the calendar never promises a temperature the TC300
 * contract cannot hold.
 */
import { APP_CONFIG, deepFreeze } from '../config.mjs';

export const WEEKLY_SCHEDULE = deepFreeze([
  { day: 'Lunes', abbr: 'Lun', opening: '10:30', closing: '23:30' },
  { day: 'Martes', abbr: 'Mar', opening: '10:30', closing: '23:30' },
  { day: 'Miércoles', abbr: 'Mié', opening: '10:30', closing: '23:30' },
  { day: 'Jueves', abbr: 'Jue', opening: '10:30', closing: '23:30' },
  { day: 'Viernes', abbr: 'Vie', opening: '10:30', closing: '00:30' },
  { day: 'Sábado', abbr: 'Sáb', opening: '10:00', closing: '00:30' },
  { day: 'Domingo', abbr: 'Dom', opening: '10:00', closing: '23:00' },
]);

/**
 * Setpoint calendar per daypart. `salasC` drives the auditorium RTUs, `comunesC` the public
 * zones (lobby, dulcería, pasillo); kitchen keeps its own service setpoint all day. All values
 * sit inside SETPOINT_LIMITS (18–26 °C).
 */
export const SETPOINT_CALENDAR = deepFreeze([
  { period: 'Apertura', window: '10:00–12:00', salasC: 23, comunesC: 23.5 },
  { period: 'Matiné', window: '12:00–17:00', salasC: 22.5, comunesC: 23 },
  { period: 'Función estelar', window: '17:00–22:00', salasC: 22, comunesC: 22.5 },
  { period: 'Cierre', window: '22:00–cierre', salasC: 23.5, comunesC: 24 },
]);

export function createScheduleModel() {
  return Object.freeze({ week: WEEKLY_SCHEDULE, calendar: SETPOINT_CALENDAR });
}

// ---------------------------------------------------------------------------
// Client round 5 (2026-07-18) — sim-clock derivations for the Horarios mockup: which period is
// active NOW, when the next change lands (countdown), which transitions already happened today,
// and the weekly summary. Deterministic per tick; the sim epoch is 2026-01-01 12:00 (Thursday).
// ---------------------------------------------------------------------------

/** Sim epoch weekday: 2026-01-01 is a Thursday (index 4 with Sunday = 0). */
const BASE_DAY_INDEX = 4;
const DAY_LABELS = Object.freeze(['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']);
const EPOCH_MINUTES = 12 * 60;

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Operating hours of one weekly row; a past-midnight closing counts across it. */
function dailyHours({ opening, closing }) {
  const open = minutesOf(opening);
  const close = minutesOf(closing);
  return ((close <= open ? close + 1440 : close) - open) / 60;
}

export function deriveScheduleStatus({ tick = 0 } = {}) {
  const elapsedMinutes = Math.floor((tick * APP_CONFIG.animation.stepSeconds) / 60);
  const minutesOfDay = (EPOCH_MINUTES + elapsedMinutes) % 1440;
  const elapsedDays = Math.floor((EPOCH_MINUTES + elapsedMinutes) / 1440);
  const dayIndex = (BASE_DAY_INDEX + elapsedDays) % 7;

  // Period starts come from the calendar windows themselves ("HH:MM–…"), never re-typed.
  const starts = SETPOINT_CALENDAR.map((period) => ({
    ...period,
    time: period.window.slice(0, 5),
    startMin: minutesOf(period.window.slice(0, 5)),
  }));
  const begun = starts.filter(({ startMin }) => startMin <= minutesOfDay);
  // Before the first boundary (early morning) the overnight carry-over is Cierre.
  const active = begun.at(-1) ?? starts.at(-1);
  const periods = starts.map((period) => Object.freeze({
    period: period.period,
    window: period.window,
    salasC: period.salasC,
    comunesC: period.comunesC,
    time: period.time,
    status: period.period === active.period
      ? 'activa'
      : period.startMin <= minutesOfDay ? 'completada' : 'programada',
  }));

  // Next change: the first boundary still ahead today, else tomorrow's Apertura.
  const upcoming = starts.find(({ startMin }) => startMin > minutesOfDay);
  const next = upcoming ?? starts[0];
  const minutesUntil = upcoming
    ? upcoming.startMin - minutesOfDay
    : 1440 - minutesOfDay + starts[0].startMin;
  const hours = Math.floor(minutesUntil / 60);
  const countdownLabel = hours > 0
    ? `En ${hours} h ${minutesUntil % 60} min`
    : `En ${minutesUntil} min`;

  const totalHours = WEEKLY_SCHEDULE.reduce((sum, day) => sum + dailyHours(day), 0);
  const meanSalasC = SETPOINT_CALENDAR.reduce((sum, { salasC }) => sum + salasC, 0)
    / SETPOINT_CALENDAR.length;

  return Object.freeze({
    tick,
    minutesOfDay,
    dayIndex,
    dayLabel: DAY_LABELS[dayIndex],
    periods: Object.freeze(periods),
    activePeriod: Object.freeze({ period: active.period, window: active.window, salasC: active.salasC }),
    nextChange: Object.freeze({
      period: next.period,
      time: next.time,
      minutesUntil,
      countdownLabel,
    }),
    transitionsToday: Object.freeze(begun.map((period) => Object.freeze({
      period: period.period,
      time: period.time,
      salasC: period.salasC,
      comunesC: period.comunesC,
    }))),
    weekly: Object.freeze({
      openings: WEEKLY_SCHEDULE.length,
      closings: WEEKLY_SCHEDULE.length,
      avgDailyHours: Number((totalHours / WEEKLY_SCHEDULE.length).toFixed(1)),
      avgSalasC: Number(meanSalasC.toFixed(1)),
    }),
  });
}
