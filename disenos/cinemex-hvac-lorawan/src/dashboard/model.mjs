/**
 * Cartelera dashboard view model — DERIVED, never declared.
 *
 * One source of truth: `createInteractionModel` (the same deterministic healthy simulation the
 * 3D viewer reads). This module reshapes that model for the operator's read: what every zone
 * measures now, comfort vs consigna, and what the unit has been doing. It owns NO data — only
 * presentation derivations, each documented. The fault/alarm scenario machinery was removed by
 * the client simplification (2026-07-15): the simulation is always healthy.
 */
import { APP_CONFIG, AUDITORIUMS, TC300_DEVICES } from '../config.mjs';
import { createInteractionModel } from '../scene/interaction.js';

/**
 * Presentation comfort band around the unit's setpoint (±1.5 °C). It drives the gray band
 * graphics and the deviation tags; a healthy reading can legitimately wander outside it.
 */
export const COMFORT_TOLERANCE_C = 1.5;

const UNIT_PREFIX = 'RTU-';
const FAMILY_TAG = Object.freeze({ large: 'L', medium: 'M', small: 'S' });

/** `TC300-08` → `RTU-08` (the packaged unit the 3D scene calls `rtu-TC300-08`). */
export function unitIdFromTc300(tc300Id) {
  const device = TC300_DEVICES.find(({ id }) => id === tc300Id);
  return device ? `${UNIT_PREFIX}${tc300Id.slice(-2)}` : null;
}

/** `RTU-08` → `TC300-08`, or null when the unit does not exist (bad deep-link). */
export function tc300FromUnitId(unitId) {
  if (typeof unitId !== 'string' || !unitId.startsWith(UNIT_PREFIX)) return null;
  const tc300Id = `TC300-${unitId.slice(UNIT_PREFIX.length)}`;
  return TC300_DEVICES.some(({ id }) => id === tc300Id) ? tc300Id : null;
}

export const DASHBOARD_DEFAULT_QUERY = Object.freeze({ unit: null, tick: 0 });

/**
 * Deep-link contract: `dashboard.html?unit=RTU-08&tick=30` reproduces the unit view cold.
 * Unknown units fall back to the fleet; unknown ticks to the default — the dashboard never
 * boots into an unrepresentable state.
 */
export function parseDashboardQuery(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  const query = { ...DASHBOARD_DEFAULT_QUERY };
  const unit = params.get('unit');
  if (unit && tc300FromUnitId(unit)) query.unit = unit;
  const tick = params.get('tick');
  if (tick && /^\d+$/.test(tick)) query.tick = Number(tick);
  return query;
}

/** Fixed serialization order; defaults are omitted so the fleet URL stays bare. */
export function serializeDashboardQuery(query = {}) {
  const normalized = { ...DASHBOARD_DEFAULT_QUERY, ...query };
  const params = new URLSearchParams();
  if (normalized.unit && tc300FromUnitId(normalized.unit)) params.set('unit', normalized.unit);
  if (Number.isInteger(normalized.tick) && normalized.tick > 0) params.set('tick', String(normalized.tick));
  return params.toString();
}

export function buildDashboardUrl(query = {}, base = 'dashboard.html') {
  const search = serializeDashboardQuery(query);
  return search ? `${base}?${search}` : base;
}

/**
 * Breadcrumb back to the 3D viewer. From a unit view the context travels with the operator as
 * the SELECTION only: that unit's thermostat opens selected. Single-view correction
 * (2026-07-18): the link stopped carrying `camera` — the viewer ships one fixed view, so a
 * deep link naming another one would be surfacing a view the product no longer has.
 */
export function buildViewerUrl({ unitId = null } = {}, base = 'index.html') {
  const params = new URLSearchParams();
  const tc300Id = unitId ? tc300FromUnitId(unitId) : null;
  if (tc300Id) {
    params.set('selection', tc300Id);
  }
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/**
 * Correction item E — the EMBED deep-link: the SAME viewer URL the breadcrumb builds, plus
 * `embed=1`. The viewer strips its chrome and frames the selected unit's rooftop RTU; the unit
 * view hosts it in an iframe, so there is exactly ONE geometry source of truth.
 */
export function buildEmbedUrl({ unitId = null } = {}, base = 'index.html') {
  const viewerUrl = buildViewerUrl({ unitId }, base);
  return `${viewerUrl}${viewerUrl.includes('?') ? '&' : '?'}embed=1`;
}

/** `2026-07-15T21:47:12.000Z` → `21:47:12` (the sim's own deterministic clock, not Date.now).
 *  A missing clock renders as `N/D` — the es-MX operator convention, never a dash glyph. */
export function formatReadingTime(timestamp) {
  return typeof timestamp === 'string' && timestamp.length >= 19 ? timestamp.slice(11, 19) : 'N/D';
}

/** Board order — the cartelera reads salas first (1..8), then the common zones by registry. */
export function orderForBoard(units) {
  return [...units].sort((a, b) => {
    if (a.salaNumber !== null && b.salaNumber !== null) return a.salaNumber - b.salaNumber;
    if (a.salaNumber !== null) return -1;
    if (b.salaNumber !== null) return 1;
    return a.tc300Id.localeCompare(b.tc300Id);
  });
}

/**
 * The whole dashboard, derived from one interaction-model evaluation. Same inputs → same model:
 * the tick is the entire input surface.
 */
export function createDashboardModel({ tick = 0 } = {}) {
  const model = createInteractionModel({ state: 'architecture', tick, selection: 'none' });

  const units = TC300_DEVICES.map((device, index) => {
    const reading = model.telemetry[device.id];
    const zone = APP_CONFIG.zones.find(({ id }) => id === device.zoneId);
    const room = AUDITORIUMS.find(({ zoneId }) => zoneId === device.zoneId) ?? null;
    const band = Object.freeze([
      reading.setpoint - COMFORT_TOLERANCE_C,
      reading.setpoint + COMFORT_TOLERANCE_C,
    ]);
    return Object.freeze({
      unitId: unitIdFromTc300(device.id),
      tc300Id: device.id,
      uc100Id: device.uc100Id,
      bus: device.uc100Id.at(-1),
      zoneId: device.zoneId,
      zoneLabel: zone.label,
      salaNumber: room ? Number(room.zoneId.split('-')[1]) : null,
      familyTag: room ? FAMILY_TAG[room.family] : null,
      seriesIndex: index,
      temperature: reading.temperature,
      setpoint: reading.setpoint,
      band,
      timestamp: reading.timestamp,
      readingTime: formatReadingTime(reading.timestamp),
    });
  });

  const unitsById = new Map(units.map((unit) => [unit.unitId, unit]));

  return Object.freeze({
    tick: model.tick,
    units: Object.freeze(units),
    unitsById,
    boardUnits: Object.freeze(orderForBoard(units)),
    rollup: Object.freeze({
      total: units.length,
      statusText: 'Sistema listo · Telemetría en vivo',
    }),
    readingTime: formatReadingTime(units[0]?.timestamp),
  });
}
