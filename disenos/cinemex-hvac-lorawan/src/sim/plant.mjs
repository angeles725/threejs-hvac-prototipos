/**
 * Plant-room fleet detail for the menu's Cuarto de máquinas section.
 *
 * Runtime hours are a deterministic derivation: a seeded per-unit base (the fleet was not
 * installed yesterday) plus the sim clock's own elapsed time at a fixed duty cycle. The
 * topology facts (cabinet, bus, RS-485 drop) are TRACED over the validated topology, never
 * declared twice. Menu data only — no scene state.
 */
import { APP_CONFIG, TC300_DEVICES, UC100_DEVICES, ZONES } from '../config.mjs';
import { createSimulationState } from '../simulation.mjs';
import { createTopology, traceFrom } from '../topology.mjs';
import { deterministicUnit } from './seed.mjs';

export const PLANT_POLICY = Object.freeze({
  baseHoursMin: 1400,
  baseHoursSpread: 3200,
  // Fixed duty cycles applied to the sim clock's elapsed hours (tick * stepSeconds / 3600).
  compressorDuty: 0.6,
  fanDuty: 0.85,
  // The supply fan runs whenever the unit ventilates, so its base always outruns the compressor.
  fanBaseFactor: 1.22,
});

export function createPlantModel({ tick = 0 } = {}) {
  const seed = APP_CONFIG.animation.seed;
  const topology = createTopology(APP_CONFIG);
  const telemetry = createSimulationState(APP_CONFIG, { tick }).telemetry;
  const cabinetById = new Map(UC100_DEVICES.map(({ id, cabinet }) => [id, cabinet]));
  const elapsedHours = (tick * APP_CONFIG.animation.stepSeconds) / 3600;

  const units = TC300_DEVICES.map((device) => {
    const zone = ZONES.find(({ id }) => id === device.zoneId);
    const trace = traceFrom(topology, device.id);
    const baseHours = PLANT_POLICY.baseHoursMin
      + deterministicUnit(seed, `hours:${device.id}`) * PLANT_POLICY.baseHoursSpread;
    const compressorHours = Math.round(baseHours + elapsedHours * PLANT_POLICY.compressorDuty);
    const fanHours = Math.round(baseHours * PLANT_POLICY.fanBaseFactor + elapsedHours * PLANT_POLICY.fanDuty);
    return Object.freeze({
      unitId: `RTU-${device.id.slice(-2)}`,
      tc300Id: device.id,
      zoneLabel: zone.label,
      uc100Id: device.uc100Id,
      bus: device.uc100Id.at(-1),
      cabinet: cabinetById.get(device.uc100Id),
      // First hop of the traced canonical path: the thermostat's RS-485 drop to its concentrator.
      dropLabel: `${trace.media[0] === 'rs485' ? 'RS-485' : trace.media[0]} → ${trace.nodeIds[1]}`,
      compressorHours,
      fanHours,
      setpoint: telemetry[device.id].setpoint,
    });
  });

  return Object.freeze({ tick, units: Object.freeze(units) });
}
