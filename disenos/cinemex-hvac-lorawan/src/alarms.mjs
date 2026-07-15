/**
 * Alarm derivation.
 *
 * `message` is USER-FACING copy rendered verbatim in `#alarm-list`, so it is written in es-MX to
 * match the rest of the application shell ("Sin alarmas activas.", "Sistema listo"). Everything the
 * code reasons about — `kind`, `severity`, `id`, device and node identifiers — stays in English.
 */
import { createTopology, evaluateReachability } from './topology.mjs';

const HIGH_LIMIT = 27.5;
const LOW_LIMIT = 18;

/** The alarm thresholds, exported for the dashboard's verdict/band derivations — ONE authority. */
export const ALARM_LIMITS = Object.freeze({ high: HIGH_LIMIT, low: LOW_LIMIT });

export function deriveAlarms(config, state) {
  const alarms = [];
  const zones = new Map(config.zones.map((zone) => [zone.id, zone]));
  const topology = createTopology(config);

  for (const thermostat of config.devices.tc300) {
    const reading = state.telemetry[thermostat.id];
    const zone = zones.get(thermostat.zoneId);
    const reachability = evaluateReachability(topology, state.healthById, thermostat.id);

    if (reading.communication === 'offline') {
      alarms.push({
        id: `communication:${thermostat.id}`,
        kind: 'communication',
        severity: 'alarm',
        deviceId: thermostat.id,
        zoneId: thermostat.zoneId,
        causeId: thermostat.id,
        reachesNiagara: false,
        // No id prefix: the HUD already renders `${deviceId} · ${message}`, so repeating it here
        // produced "TC300-08 · TC300-08 sin comunicación". The message carries the fact, not the id.
        message: `Sin comunicación; sus datos no llegan a Niagara.`,
      });
      continue;
    }
    if (!reachability.reachable) {
      alarms.push({
        id: `reachability:${thermostat.id}`,
        kind: 'reachability',
        severity: 'alarm',
        deviceId: thermostat.id,
        zoneId: thermostat.zoneId,
        causeId: reachability.causeId,
        reachesNiagara: false,
        message: `Ruta de datos de ${thermostat.id} interrumpida en ${reachability.causeId}.`,
      });
    }
    if (reading.temperature > HIGH_LIMIT) {
      alarms.push({
        id: `temperature-high:${thermostat.id}`,
        kind: 'temperature-high',
        severity: 'alarm',
        deviceId: thermostat.id,
        zoneId: thermostat.zoneId,
        causeId: thermostat.id,
        reachesNiagara: reachability.reachable,
        message: `Temperatura alta en ${zone.label} (${reading.temperature.toFixed(1)} °C).`,
      });
    } else if (reading.temperature < LOW_LIMIT) {
      alarms.push({
        id: `temperature-low:${thermostat.id}`,
        kind: 'temperature-low',
        severity: 'alarm',
        deviceId: thermostat.id,
        zoneId: thermostat.zoneId,
        causeId: thermostat.id,
        reachesNiagara: reachability.reachable,
        message: `Temperatura baja en ${zone.label} (${reading.temperature.toFixed(1)} °C).`,
      });
    }
  }
  return Object.freeze(alarms.map(Object.freeze));
}

