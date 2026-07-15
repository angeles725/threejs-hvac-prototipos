/**
 * Cartelera dashboard view model — DERIVED, never declared.
 *
 * One source of truth: `createInteractionModel` (the same simulation/topology/alarm derivation the
 * 3D viewer and its HUD read). This module reshapes that model for the operator's four decisions
 * (BRIEF.md): what is wrong now, comfort vs equipment, is the data trustworthy, what has the unit
 * been doing. It owns NO data — only presentation derivations, each documented.
 */
import { APP_CONFIG, AUDITORIUMS, TC300_DEVICES } from '../config.mjs';
import { ALARM_LIMITS } from '../alarms.mjs';
import { deriveHudModel } from '../hud.mjs';
import {
  INTERACTION_SCENE_STATES,
  createInteractionModel,
  routeIds,
} from '../scene/interaction.js';

/**
 * Presentation comfort band around the unit's setpoint (±1.5 °C). It drives ONLY the gray band
 * graphics; the alarm truth stays the simulation's (`deviceStatus` / ALARM_LIMITS).
 */
export const COMFORT_TOLERANCE_C = 1.5;

/**
 * Verdict threshold: an alarm whose reading exceeds the alarm limit by ≥ 2 °C reads as an
 * EQUIPMENT failure (cooling lost); under it, as a comfort deviation worth watching first.
 */
export const EQUIPMENT_EXCEEDANCE_C = 2;

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

export const DASHBOARD_DEFAULT_QUERY = Object.freeze({ unit: null, state: 'architecture', tick: 0 });

/**
 * Deep-link contract: `dashboard.html?unit=RTU-08&state=hot-sala-3&tick=30` reproduces the unit
 * view cold. Unknown units fall back to the fleet; unknown states/ticks to the defaults — the
 * dashboard never boots into an unrepresentable state.
 */
export function parseDashboardQuery(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  const query = { ...DASHBOARD_DEFAULT_QUERY };
  const unit = params.get('unit');
  if (unit && tc300FromUnitId(unit)) query.unit = unit;
  const state = params.get('state');
  if (state && state in INTERACTION_SCENE_STATES) query.state = state;
  const tick = params.get('tick');
  if (tick && /^\d+$/.test(tick)) query.tick = Number(tick);
  return query;
}

/** Fixed serialization order; defaults are omitted so the fleet URL stays bare. */
export function serializeDashboardQuery(query = {}) {
  const normalized = { ...DASHBOARD_DEFAULT_QUERY, ...query };
  const params = new URLSearchParams();
  if (normalized.unit && tc300FromUnitId(normalized.unit)) params.set('unit', normalized.unit);
  if (normalized.state !== DASHBOARD_DEFAULT_QUERY.state && normalized.state in INTERACTION_SCENE_STATES) {
    params.set('state', normalized.state);
  }
  if (Number.isInteger(normalized.tick) && normalized.tick > 0) params.set('tick', String(normalized.tick));
  return params.toString();
}

export function buildDashboardUrl(query = {}, base = 'dashboard.html') {
  const search = serializeDashboardQuery(query);
  return search ? `${base}?${search}` : base;
}

/**
 * Breadcrumb back to the 3D viewer. From a unit view the context travels with the operator:
 * the viewer opens on the thermal roof plan with that unit's thermostat selected.
 */
export function buildViewerUrl({ state = 'architecture', unitId = null } = {}, base = 'index.html') {
  const params = new URLSearchParams();
  if (state !== 'architecture' && state in INTERACTION_SCENE_STATES) params.set('state', state);
  const tc300Id = unitId ? tc300FromUnitId(unitId) : null;
  if (tc300Id) {
    params.set('camera', 'top');
    params.set('selection', tc300Id);
  }
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/**
 * The operator verdict at the unit view's foot (graft c). Pure derivation from the three facts
 * the BRIEF names: alarm state, Niagara delivery, and how far past the alarm limit the reading is.
 */
export function deriveUnitVerdict({ alarm = false, delivered = true, exceedance = 0 } = {}) {
  if (!delivered) {
    return Object.freeze({
      kind: 'datos',
      text: 'El dato no está llegando a Niagara: restablece la ruta antes de confiar en la lectura local.',
    });
  }
  if (alarm && exceedance >= EQUIPMENT_EXCEEDANCE_C) {
    return Object.freeze({
      kind: 'equipo',
      text: 'El dato llega bien: la falla es del equipo, no de la red. Candidata a despacho de mantenimiento.',
    });
  }
  if (alarm) {
    return Object.freeze({
      kind: 'confort',
      text: 'Desviación de confort con ruta de datos sana. Ajusta la consigna u observa antes de despachar.',
    });
  }
  return Object.freeze({
    kind: 'sin-accion',
    text: 'Unidad dentro de consigna y ruta de datos completa. Sin acción requerida.',
  });
}

const HOP_STATE = Object.freeze({ normal: 'ok', alarm: 'falla', unreachable: 'sin-dato', blocked: 'sin-dato' });
const hopState = (status) => HOP_STATE[status] ?? 'ok';
const worst = (...states) => (states.includes('falla') ? 'falla' : states.includes('sin-dato') ? 'sin-dato' : 'ok');

/** `2026-07-15T21:47:12.000Z` → `21:47:12` (the sim's own deterministic clock, not Date.now). */
export function formatReadingTime(timestamp) {
  return typeof timestamp === 'string' && timestamp.length >= 19 ? timestamp.slice(11, 19) : '—';
}

/**
 * The unit's canonical chain as instrument-line hops. Node/route states come from the SAME
 * reachability the alarms use; the per-hop nameplate values (baud, polling, RF) are spec
 * constants, labeled as such — the LIVE facts per hop are its state and the reading time.
 */
function deriveUnitChain(device, model, delivered) {
  const bus = device.uc100Id.at(-1);
  const reading = model.telemetry[device.id];
  const time = formatReadingTime(reading.timestamp);
  return Object.freeze([
    {
      id: device.id,
      label: device.id,
      medio: 'sensor de zona',
      estado: hopState(model.deviceStatus[device.id] === 'alarm' ? 'normal' : model.deviceStatus[device.id]),
      valor: `${reading.temperature.toFixed(1)} °C · ${time}`,
    },
    {
      id: `rs485-${bus}`,
      label: `RS-485 ${bus}`,
      medio: 'bus de campo',
      estado: worst(hopState(model.routeStatus[routeIds.drop(device.id)]), hopState(model.routeStatus[routeIds.trunk(device.uc100Id)])),
      valor: '19.2 kbps · par trenzado',
    },
    {
      id: device.uc100Id,
      label: device.uc100Id,
      medio: 'controlador',
      estado: hopState(model.deviceStatus[device.uc100Id]),
      valor: `sondeo cada ${APP_CONFIG.animation.stepSeconds} s`,
    },
    {
      id: `lorawan-${bus}`,
      label: 'LoRaWAN',
      medio: 'radio 915 MHz',
      estado: hopState(model.routeStatus[routeIds.lorawan(device.uc100Id)]),
      valor: 'SF7 · enlace fijo',
    },
    {
      id: 'UG67-01',
      label: 'UG67',
      medio: 'gateway',
      estado: hopState(model.deviceStatus['UG67-01']),
      valor: 'uplink Ethernet',
    },
    {
      id: 'ip-chain',
      label: 'Ethernet / IP',
      medio: 'router · internet',
      estado: worst(hopState(model.routeStatus[routeIds.gatewayEthernet]), hopState(model.routeStatus[routeIds.ipChain])),
      valor: 'LAN técnica',
    },
    {
      id: 'niagara-supervisor',
      label: 'Niagara N4',
      medio: 'supervisorio',
      estado: delivered ? 'ok' : 'sin-dato',
      valor: delivered ? `dato de las ${time}` : 'sin datos de esta unidad',
    },
  ].map(Object.freeze));
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
 * the state/tick pair is the entire input surface.
 */
export function createDashboardModel({ state = 'architecture', tick = 0 } = {}) {
  const model = createInteractionModel({ state, tick, selection: 'none' });
  const hud = deriveHudModel(model);
  const stopped = new Set(model.niagaraDelivery?.stopped ?? []);

  const units = TC300_DEVICES.map((device, index) => {
    const reading = model.telemetry[device.id];
    const zone = APP_CONFIG.zones.find(({ id }) => id === device.zoneId);
    const room = AUDITORIUMS.find(({ zoneId }) => zoneId === device.zoneId) ?? null;
    const alarm = model.deviceStatus[device.id] === 'alarm';
    const delivered = !stopped.has(device.id);
    const band = Object.freeze([
      reading.setpoint - COMFORT_TOLERANCE_C,
      reading.setpoint + COMFORT_TOLERANCE_C,
    ]);
    const exceedance = Math.max(
      0,
      reading.temperature - ALARM_LIMITS.high,
      ALARM_LIMITS.low - reading.temperature,
    );
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
      alarm,
      delivered,
      estado: alarm ? 'alarma' : 'normal',
      timestamp: reading.timestamp,
      readingTime: formatReadingTime(reading.timestamp),
      chain: deriveUnitChain(device, model, delivered),
      verdict: deriveUnitVerdict({ alarm, delivered, exceedance }),
    });
  });

  const unitsById = new Map(units.map((unit) => [unit.unitId, unit]));
  const alarms = (model.alarms ?? []).map((alarm) => Object.freeze({
    ...alarm,
    unitId: unitIdFromTc300(alarm.deviceId),
    zoneLabel: APP_CONFIG.zones.find(({ id }) => id === alarm.zoneId)?.label ?? alarm.zoneId,
  }));

  return Object.freeze({
    state: model.state,
    tick: model.tick,
    units: Object.freeze(units),
    unitsById,
    boardUnits: Object.freeze(orderForBoard(units)),
    alarms: Object.freeze(alarms),
    rollup: Object.freeze({
      total: units.length,
      normal: units.filter(({ alarm }) => !alarm).length,
      alarma: units.filter(({ alarm }) => alarm).length,
      entregando: units.filter(({ delivered }) => delivered).length,
      statusText: hud.statusText,
      severity: hud.severity,
    }),
    readingTime: formatReadingTime(units[0]?.timestamp),
  });
}
