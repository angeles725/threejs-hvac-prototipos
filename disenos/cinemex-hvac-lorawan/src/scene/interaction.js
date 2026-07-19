import { APP_CONFIG } from '../config.mjs';
import { createTopology, traceFrom } from '../topology.mjs';
import { createSimulationState } from '../simulation.mjs';

/**
 * The INTERACTION-UI pass owns the DesignSpec's `deterministic_query_states`. The client
 * simplification (2026-07-15) removed the fault/hot scenario states: the two visual states are
 * all that remain, and every value is DERIVED from the one healthy simulation/topology pair the
 * domain already owns — this module never declares a second source of truth for the chain.
 */
export const INTERACTION_SCENE_STATES = Object.freeze({
  architecture: Object.freeze({ visualMode: 'architectural' }),
  engineering: Object.freeze({ visualMode: 'engineering' }),
});

export const INTERACTION_STATE_VALUES = Object.freeze(Object.keys(INTERACTION_SCENE_STATES));
export const INTERACTION_LINK_VALUES = Object.freeze(['none', 'rs485', 'lorawan', 'internet', 'all']);
export const INTERACTION_SELECTION_VALUES = Object.freeze([
  'none',
  ...APP_CONFIG.devices.tc300.map(({ id }) => id),
  ...APP_CONFIG.devices.uc100.map(({ id }) => id),
  ...APP_CONFIG.devices.gateways.map(({ id }) => id),
]);

const CLIENT_IDS = Object.freeze(['client-pc', 'client-tablet', 'client-smartphone']);

/** Route identities, mirrored from the architecture plan's own entity ids. One vocabulary. */
export const routeIds = Object.freeze({
  drop: (tc300Id) => `${tc300Id}-contained-drop`,
  trunk: (uc100Id) => `${uc100Id}-contained-route`,
  lorawan: (uc100Id) => `lorawan-${uc100Id}-UG67-01`,
  gatewayEthernet: 'UG67-01-contained-ethernet',
  ipChain: 'conceptual-ip-chain',
});

/** Deterministic animation: `tick` is the only clock a capture ever sees. */
export const INTERACTION_PACKET_STEP = 0.031;
export const INTERACTION_WAVE_RINGS = Object.freeze({ count: 3, period: 40, minRadius: 0.5, maxRadius: 3.4 });

export function resolveSceneState(token) {
  return INTERACTION_SCENE_STATES[token] ?? null;
}

export function resolveLinkLayers(value) {
  if (!INTERACTION_LINK_VALUES.includes(value)) return null;
  return {
    rs485: value === 'all' || value === 'rs485',
    lorawan: value === 'all' || value === 'lorawan',
    internet: value === 'all' || value === 'internet',
  };
}

/** Position of one packet on its route at one tick. Pure, periodic, allocation free. */
export function resolvePacketT(tick, phase = 0) {
  const value = (tick * INTERACTION_PACKET_STEP + phase) % 1;
  return value < 0 ? value + 1 : value;
}

export function resolveWaveRing(tick = 0, index = 0) {
  const progress = resolvePacketT(tick, index / INTERACTION_WAVE_RINGS.count);
  const { minRadius, maxRadius } = INTERACTION_WAVE_RINGS;
  return Object.freeze({
    scale: minRadius + (maxRadius - minRadius) * progress,
    // A ring fades as it expands: the far edge of the RF pulse is the faint one.
    opacity: 0.85 * (1 - progress),
  });
}

/** Walks a polyline by ARC LENGTH, so a packet keeps a constant speed across uneven segments. */
export function samplePolyline(points, t) {
  const lengths = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = Math.hypot(
      ...points[index + 1].map((value, axis) => value - points[index][axis]),
    );
    lengths.push(length);
    total += length;
  }
  if (total === 0) return [...points[0]];
  const target = Math.min(Math.max(t, 0), 1) * total;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (travelled + lengths[index] >= target || index === lengths.length - 1) {
      const local = lengths[index] === 0 ? 0 : (target - travelled) / lengths[index];
      return points[index].map((value, axis) => (
        value + (points[index + 1][axis] - value) * Math.min(1, Math.max(0, local))
      ));
    }
    travelled += lengths[index];
  }
  return [...points.at(-1)];
}

function resolveSelectionPath(config, topology, selection) {
  const empty = { nodeIds: [], routeIds: [] };
  if (!selection || selection === 'none') return empty;

  const thermostat = config.devices.tc300.find(({ id }) => id === selection);
  const concentrator = config.devices.uc100.find(({ id }) => id === selection);
  const gateway = config.devices.gateways.find(({ id }) => id === selection);
  if (!thermostat && !concentrator && !gateway) return empty;

  const trace = traceFrom(topology, selection);
  const nodeIds = [...trace.nodeIds, ...CLIENT_IDS];
  const ids = [];
  if (thermostat) {
    ids.push(routeIds.drop(thermostat.id), routeIds.trunk(thermostat.uc100Id), routeIds.lorawan(thermostat.uc100Id));
  }
  if (concentrator) {
    ids.push(routeIds.trunk(concentrator.id), routeIds.lorawan(concentrator.id));
  }
  ids.push(routeIds.gatewayEthernet, routeIds.ipChain);
  return { nodeIds, routeIds: ids };
}

/**
 * The single interaction model behind every capture URL: one state token, one tick, one selection.
 * Two calls with the same arguments always return the same model. The simulation is always the
 * deterministic HEALTHY one — the fault machinery was removed by the client simplification.
 */
export function createInteractionModel({
  state = 'engineering',
  tick = 0,
  selection = 'none',
  config = APP_CONFIG,
} = {}) {
  const scene = resolveSceneState(state) ?? INTERACTION_SCENE_STATES.engineering;
  const topology = createTopology(config);
  const simulation = createSimulationState(config, { tick });

  return Object.freeze({
    state,
    tick,
    selection,
    visualMode: scene.visualMode,
    telemetry: simulation.telemetry,
    linkMetrics: simulation.linkMetrics,
    selectionPath: Object.freeze(resolveSelectionPath(config, topology, selection)),
  });
}
