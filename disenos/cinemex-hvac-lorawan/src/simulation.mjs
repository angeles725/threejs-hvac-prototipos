import { deepFreeze } from './config.mjs';

export const SETPOINT_LIMITS = deepFreeze({ min: 18, max: 26 });

const BASE_TIMESTAMP_MS = Date.UTC(2026, 0, 1, 12, 0, 0);

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicUnit(seed, key) {
  let value = (hashString(key) ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 0xffffffff;
}

const round = (value, digits = 1) => Number(value.toFixed(digits));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function setpointsFrom(config, previousTelemetry = {}) {
  return Object.fromEntries(config.devices.tc300.map(({ id }) => [id, previousTelemetry[id]?.setpoint ?? 22]));
}

/**
 * The deterministic HEALTHY simulation — the one line of truth left after the client
 * simplification (2026-07-15) removed the fault-injection machinery. Same seed and tick always
 * produce the same telemetry; every reading stays inside the comfort envelope by construction.
 */
function createNominal(config, { seed, tick, setpoints }) {
  const auditoriumById = new Map(config.auditoriums.map((room) => [room.zoneId, room]));
  const timestamp = new Date(BASE_TIMESTAMP_MS + tick * config.animation.stepSeconds * 1000).toISOString();
  const telemetry = {};

  for (const thermostat of config.devices.tc300) {
    const phase = deterministicUnit(seed, thermostat.id) * Math.PI * 2;
    const temperature = round(23 + 2.7 * Math.sin(phase + tick * 0.04));
    const room = auditoriumById.get(thermostat.zoneId);
    const occupancyWave = (Math.sin(phase * 0.7 + tick * 0.025) + 1) / 2;
    const occupancy = room ? Math.round(room.capacity * (0.18 + occupancyWave * 0.72)) : null;
    const setpoint = setpoints[thermostat.id];
    telemetry[thermostat.id] = {
      temperature,
      setpoint,
      mode: temperature > setpoint + 0.3 ? 'cooling' : 'standby',
      fan: 'automatic',
      communication: 'normal',
      occupancy,
      timestamp,
      status: 'normal',
    };
  }

  const healthById = Object.fromEntries([
    ...config.devices.tc300,
    ...config.devices.uc100,
    ...config.devices.gateways,
    ...config.network.nodes,
  ].map(({ id }) => [id, 'normal']));
  const linkMetrics = {};
  for (const uc100 of config.devices.uc100) {
    const signal = deterministicUnit(seed, `${uc100.id}:${tick}`);
    linkMetrics[uc100.id] = {
      rssi: Math.round(-105 + signal * 52),
      lastCommunication: timestamp,
      packetsSent: tick * uc100.memberIds.length,
      power: 'normal',
      lorawan: 'normal',
    };
  }
  linkMetrics['UG67-01'] = {
    packetsReceived: tick * config.devices.tc300.length,
    internet: 'normal',
    lorawan: 'normal',
    niagara: 'normal',
    ipAddress: '10.67.0.21',
  };

  return { telemetry, healthById, linkMetrics };
}

function rebuild(config, state) {
  const nominal = createNominal(config, {
    seed: state.seed,
    tick: state.tick,
    setpoints: setpointsFrom(config, state.telemetry),
  });
  return deepFreeze({ ...state, ...nominal });
}

export function createSimulationState(config, options = {}) {
  const state = {
    seed: Number.isInteger(options.seed) ? options.seed : config.animation.seed,
    tick: Number.isInteger(options.tick) ? options.tick : 0,
    telemetry: {},
  };
  return rebuild(config, state);
}

export function advanceSimulation(config, state, steps = 1) {
  const safeSteps = Math.max(1, Math.trunc(steps));
  return rebuild(config, { ...state, tick: state.tick + safeSteps });
}

export function setSetpoint(config, state, deviceId, value) {
  if (!state.telemetry[deviceId]) throw new Error(`Unknown thermostat ${deviceId}.`);
  if (!Number.isFinite(value)) throw new TypeError('Setpoint must be a finite number.');
  const telemetry = structuredClone(state.telemetry);
  telemetry[deviceId].setpoint = clamp(value, SETPOINT_LIMITS.min, SETPOINT_LIMITS.max);
  return rebuild(config, { ...state, telemetry });
}
