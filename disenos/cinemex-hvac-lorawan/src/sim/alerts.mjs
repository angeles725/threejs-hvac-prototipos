/**
 * Deterministic alert DERIVATION for the menu's Alertas section.
 *
 * MENU DATA ONLY. The 3D fault machinery was deleted by the client simplification (2026-07-15)
 * and stays deleted: nothing here creates scene states or fault telemetry. An alert is a pure
 * read over deviations the healthy simulation already produces — a reading outside its comfort
 * band, a weak LoRaWAN link, a meter above its demand ceiling. Same tick, same alerts.
 */
import { APP_CONFIG } from '../config.mjs';
import { createInteractionModel } from '../scene/interaction.js';
import { COMFORT_TOLERANCE_C, createDashboardModel } from '../dashboard/model.mjs';
import { createEnergyModel } from './energy.mjs';

export const ALERT_CATEGORIES = Object.freeze(['HVAC', 'Temperatura', 'Comunicación', 'Sistema']);

export const ALERT_THRESHOLDS = Object.freeze({
  // A reading is alertable only past its ±COMFORT_TOLERANCE_C band (strictly outside).
  comfortToleranceC: COMFORT_TOLERANCE_C,
  // Critical when the deviation doubles the tolerance.
  temperatureCriticalC: COMFORT_TOLERANCE_C * 2,
  rssiFloorDbm: -95,
  rssiCriticalDbm: -103,
  unitKwCeiling: 14.2,
  unitKwCriticalFactor: 1.2,
});

const CATEGORY_ORDER = new Map(ALERT_CATEGORIES.map((category, index) => [category, index]));
const SEVERITY_ORDER = Object.freeze({ 'crítica': 0, advertencia: 1 });

const signed = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;

/**
 * Pure derivation over already-shaped readings. Strict thresholds: sitting exactly on a
 * boundary is healthy — only crossing it fires.
 */
export function deriveAlerts({ units = [], links = [], meters = [] } = {}, thresholds = ALERT_THRESHOLDS) {
  const alerts = [];

  for (const unit of units) {
    const outside = unit.temperature < unit.band[0] || unit.temperature > unit.band[1];
    if (!outside) continue;
    const delta = unit.temperature - unit.setpoint;
    const critical = Math.abs(delta) > thresholds.temperatureCriticalC;
    alerts.push({
      id: `temp:${unit.id}`,
      category: 'Temperatura',
      severity: critical ? 'crítica' : 'advertencia',
      deviceId: unit.id,
      zoneLabel: unit.zoneLabel ?? null,
      message: `${unit.zoneLabel ?? unit.id}: ${unit.temperature.toFixed(1)} °C, ${signed(delta)} °C vs consigna`,
      value: unit.temperature,
    });
  }

  for (const link of links) {
    if (!(link.rssi < thresholds.rssiFloorDbm)) continue;
    alerts.push({
      id: `rssi:${link.id}`,
      category: 'Comunicación',
      severity: link.rssi < thresholds.rssiCriticalDbm ? 'crítica' : 'advertencia',
      deviceId: link.id,
      zoneLabel: null,
      message: `${link.id}: señal LoRaWAN débil (${link.rssi} dBm)`,
      value: link.rssi,
    });
  }

  for (const meter of meters) {
    if (!(meter.kw > thresholds.unitKwCeiling)) continue;
    const critical = meter.kw > thresholds.unitKwCeiling * thresholds.unitKwCriticalFactor;
    alerts.push({
      id: `kw:${meter.unitId}`,
      category: 'HVAC',
      severity: critical ? 'crítica' : 'advertencia',
      deviceId: meter.unitId,
      zoneLabel: meter.zoneLabel ?? null,
      message: `${meter.unitId}${meter.zoneLabel ? ` (${meter.zoneLabel})` : ''}: demanda alta, ${meter.kw.toFixed(1)} kW`,
      value: meter.kw,
    });
  }

  alerts.sort((a, b) => (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || CATEGORY_ORDER.get(a.category) - CATEGORY_ORDER.get(b.category)
    || a.deviceId.localeCompare(b.deviceId)
  ));
  return Object.freeze(alerts.map((alert) => Object.freeze(alert)));
}

/**
 * Client round 4 (2026-07-18) — resolved-episode policy. "Resueltas (hoy)" walks the sim day
 * (00:00 of the current sim date up to the live tick) on the product's own 30-minute series
 * grid (360 ticks at 5 s/tick) and counts every deviation that LEFT its alarm band and came
 * back inside. The day may start before the sim epoch (tick 0 is 12:00): those negative ticks
 * are the same presentation-history convention the 24 h series already use.
 * Only the SMOOTH deterministic series are walked (zone temperature, meter demand); the
 * LoRaWAN link metric has no persistence between ticks, so counting "episodes" over it would
 * be a sampling artifact — Comunicación alerts stay instantaneous-only, honestly.
 */
export const RESOLVED_POLICY = Object.freeze({
  sampleStrideTicks: 360,
});

const SECONDS_PER_DAY = 86_400;
const EPOCH_SECONDS_INTO_DAY = 43_200; // The sim epoch (2026-01-01) starts at 12:00 UTC.

/** Reading snapshot at one sample tick: the same shapes deriveAlerts consumes. */
function readingsAt(tick) {
  const dashboard = createDashboardModel({ tick });
  const energy = createEnergyModel({ tick });
  return {
    timestamp: dashboard.units[0].timestamp,
    units: dashboard.units.map((unit) => ({
      id: unit.tc300Id,
      zoneLabel: unit.zoneLabel,
      temperature: unit.temperature,
      setpoint: unit.setpoint,
      outside: unit.temperature < unit.band[0] || unit.temperature > unit.band[1],
      delta: unit.temperature - unit.setpoint,
    })),
    meters: energy.perUnit.map(({ unitId, zoneLabel, kw }) => ({
      id: unitId,
      zoneLabel,
      kw,
      outside: kw > ALERT_THRESHOLDS.unitKwCeiling,
    })),
  };
}

/** Walk the sim day and return every normalized episode, newest resolution first. */
export function deriveResolvedEpisodes({ tick = 0 } = {}) {
  const stepSeconds = APP_CONFIG.animation.stepSeconds;
  const secondsIntoDay = ((EPOCH_SECONDS_INTO_DAY + tick * stepSeconds) % SECONDS_PER_DAY
    + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  const dayStartTick = tick - Math.floor(secondsIntoDay / stepSeconds);
  const sampleTicks = [];
  for (let sample = dayStartTick; sample < tick; sample += RESOLVED_POLICY.sampleStrideTicks) {
    sampleTicks.push(sample);
  }
  sampleTicks.push(tick); // The live tick closes the walk: whatever is outside NOW stays active.

  const episodes = [];
  const openByDevice = new Map();
  for (const sampleTick of sampleTicks) {
    const { timestamp, units, meters } = readingsAt(sampleTick);
    const observations = [
      ...units.map((unit) => ({
        key: `temp:${unit.id}`,
        category: 'Temperatura',
        deviceId: unit.id,
        zoneLabel: unit.zoneLabel,
        outside: unit.outside,
        magnitude: Math.abs(unit.delta),
        critical: Math.abs(unit.delta) > ALERT_THRESHOLDS.temperatureCriticalC,
        message: `${unit.zoneLabel}: ${unit.temperature.toFixed(1)} °C, ${signed(unit.delta)} °C vs consigna`,
      })),
      ...meters.map((meter) => ({
        key: `kw:${meter.id}`,
        category: 'HVAC',
        deviceId: meter.id,
        zoneLabel: meter.zoneLabel,
        outside: meter.outside,
        magnitude: meter.kw,
        critical: meter.kw > ALERT_THRESHOLDS.unitKwCeiling * ALERT_THRESHOLDS.unitKwCriticalFactor,
        message: `${meter.id}${meter.zoneLabel ? ` (${meter.zoneLabel})` : ''}: demanda alta, ${meter.kw.toFixed(1)} kW`,
      })),
    ];
    for (const observation of observations) {
      const open = openByDevice.get(observation.key);
      if (observation.outside) {
        // Track the WORST sample of the ongoing episode — it decides severity and the detail.
        if (!open || observation.magnitude > open.magnitude) openByDevice.set(observation.key, observation);
      } else if (open) {
        openByDevice.delete(observation.key);
        episodes.push(Object.freeze({
          id: `${observation.key}:${sampleTick}`,
          category: open.category,
          severity: open.critical ? 'crítica' : 'advertencia',
          deviceId: open.deviceId,
          zoneLabel: open.zoneLabel ?? null,
          message: open.message,
          resolvedTick: sampleTick,
          resolvedAt: timestamp,
        }));
      }
    }
  }
  episodes.sort((a, b) => (
    b.resolvedTick - a.resolvedTick
    || CATEGORY_ORDER.get(a.category) - CATEGORY_ORDER.get(b.category)
    || a.deviceId.localeCompare(b.deviceId)
  ));
  return Object.freeze(episodes);
}

/** The live derivation: one tick in, the section's whole model out. */
export function createAlertsModel({ tick = 0 } = {}) {
  const dashboard = createDashboardModel({ tick });
  const interaction = createInteractionModel({ state: 'architecture', tick, selection: 'none' });
  const energy = createEnergyModel({ tick });

  const units = dashboard.units.map((unit) => ({
    id: unit.tc300Id,
    zoneLabel: unit.zoneLabel,
    temperature: unit.temperature,
    setpoint: unit.setpoint,
    band: unit.band,
  }));
  const links = Object.entries(interaction.linkMetrics)
    .filter(([, metrics]) => typeof metrics.rssi === 'number')
    .map(([id, metrics]) => ({ id, rssi: metrics.rssi }));
  const meters = energy.perUnit.map(({ unitId, zoneLabel, kw }) => ({ unitId, zoneLabel, kw }));

  const alerts = deriveAlerts({ units, links, meters });
  const countsByCategory = Object.fromEntries(ALERT_CATEGORIES.map((category) => [
    category,
    alerts.filter((alert) => alert.category === category).length,
  ]));

  // Client round 4: the model also carries the sim-day resolved walk and the live sim clock, so
  // the section can date every row honestly and count "Resueltas (hoy)" from real history.
  const resolved = deriveResolvedEpisodes({ tick });

  return Object.freeze({
    tick,
    timestamp: dashboard.units[0].timestamp,
    alerts,
    countsByCategory: Object.freeze(countsByCategory),
    total: alerts.length,
    resolved,
    resolvedToday: resolved.length,
  });
}
