/**
 * Simulated wall clock for the DHL workbench — the ONE mapping from scene ticks to a
 * deterministic date/time, shared by every derived surface that needs a timestamp
 * (alerts, energy comparisons, maintenance countdown, the "Actualizado …" footers).
 *
 * Convention (mirrored from the cinemex sibling, re-anchored for DHL): the sim day starts at
 * NOON of the epoch date, and every scene tick advances 15 minutes — consistent with the
 * equipment sim's TICKS_PER_HOUR = 4 (4 ticks = 1 hour, 96 ticks = one wavePeriodTicks day).
 * Nothing here reads the real clock: same tick in, same instant out.
 */
export const SIM_EPOCH_ISO = '2026-07-18T12:00:00.000Z';
export const MINUTES_PER_TICK = 15;

const EPOCH_MS = new Date(SIM_EPOCH_ISO).getTime();

/** Tick → ISO timestamp at epoch + tick·15 min (UTC, so it renders identically everywhere). */
export function simTimestamp(tick = 0) {
  return new Date(EPOCH_MS + tick * MINUTES_PER_TICK * 60_000).toISOString();
}

/** Tick → hour-of-day in [0, 24) (integer hours advance every 4 ticks). */
export function simHourOfDay(tick = 0) {
  const minutes = (12 * 60 + tick * MINUTES_PER_TICK) % (24 * 60);
  return minutes / 60;
}

/** Tick → day index since the epoch (0 = epoch day), for day/week derivations. */
export function simDayIndex(tick = 0) {
  return Math.floor((12 * 60 + tick * MINUTES_PER_TICK) / (24 * 60));
}
