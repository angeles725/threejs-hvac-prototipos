import { APP_CONFIG } from '../config.mjs';
import { createTopology, evaluateReachability, traceFrom } from '../topology.mjs';
import { FAULT_IDS, createSimulationState, injectFault } from '../simulation.mjs';
import { deriveAlarms } from '../alarms.mjs';

/**
 * The INTERACTION-UI pass owns the DesignSpec's `deterministic_query_states`. Every value here is a
 * capture URL the gate can drive, and every fault is DERIVED from the one simulation/topology pair
 * the domain already owns — this module never declares a second source of truth for the chain.
 */
export const INTERACTION_SCENE_STATES = Object.freeze({
  architecture: Object.freeze({ visualMode: 'architectural', faultId: null }),
  engineering: Object.freeze({ visualMode: 'engineering', faultId: null }),
  'fault-tc300': Object.freeze({ visualMode: 'engineering', faultId: FAULT_IDS.TC300_COMMUNICATION_LOSS }),
  'fault-uc100-b': Object.freeze({ visualMode: 'engineering', faultId: FAULT_IDS.UC100_FAILURE }),
  'fault-internet': Object.freeze({ visualMode: 'engineering', faultId: FAULT_IDS.INTERNET_LOSS }),
  'hot-sala-3': Object.freeze({ visualMode: 'engineering', faultId: FAULT_IDS.AUDITORIUM_HIGH_TEMPERATURE }),
  'hot-kitchen': Object.freeze({ visualMode: 'engineering', faultId: FAULT_IDS.KITCHEN_HIGH_TEMPERATURE }),
});

export const INTERACTION_STATE_VALUES = Object.freeze(Object.keys(INTERACTION_SCENE_STATES));
export const INTERACTION_LINK_VALUES = Object.freeze(['none', 'rs485', 'lorawan', 'internet', 'all']);
export const INTERACTION_SELECTION_VALUES = Object.freeze([
  'none',
  ...APP_CONFIG.devices.tc300.map(({ id }) => id),
  ...APP_CONFIG.devices.uc100.map(({ id }) => id),
  ...APP_CONFIG.devices.gateways.map(({ id }) => id),
]);

/** The shared IP backbone: the nodes EVERY thermostat has to cross to reach the supervisor. */
export const INTERACTION_BACKBONE = Object.freeze([
  'UG67-01', 'router-firewall', 'internet', 'niagara-supervisor',
]);
const CLIENT_IDS = Object.freeze(['client-pc', 'client-tablet', 'client-smartphone']);
const NIAGARA_ID = 'niagara-supervisor';

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
export const INTERACTION_HALO_PULSE = Object.freeze({ period: 44, minScale: 0.86, maxScale: 1.18, minOpacity: 0.4, maxOpacity: 0.9 });
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

const wave = (tick, period, phase = 0) => (
  (Math.sin(((tick / period) + phase) * Math.PI * 2) + 1) / 2
);

export function resolveHaloPulse(tick = 0) {
  const unit = wave(tick, INTERACTION_HALO_PULSE.period);
  return Object.freeze({
    scale: INTERACTION_HALO_PULSE.minScale
      + (INTERACTION_HALO_PULSE.maxScale - INTERACTION_HALO_PULSE.minScale) * unit,
    opacity: INTERACTION_HALO_PULSE.minOpacity
      + (INTERACTION_HALO_PULSE.maxOpacity - INTERACTION_HALO_PULSE.minOpacity) * unit,
  });
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

function zoneVolume(config, zoneId) {
  const zone = config.zones.find(({ id }) => id === zoneId);
  if (!zone) return null;
  const room = config.auditoriums.find(({ zoneId: id }) => id === zoneId);
  return Object.freeze({
    zoneId,
    label: zone.label,
    bounds: zone.bounds,
    height: room ? room.height : 3,
  });
}

/**
 * The whole fault model, derived from the canonical topology:
 *
 * - the offline node is the ALARM (red);
 * - a field device whose own path to Niagara crosses the offline node is UNREACHABLE (gray) —
 *   this is how a UC100 failure grays exactly its four thermostats and nothing else;
 * - a BACKBONE node that can no longer deliver to Niagara is UNREACHABLE — this is how an internet
 *   loss grays the gateway, the router, the supervisor and the remote clients while every
 *   thermostat and concentrator keeps measuring, exactly as `visual_states.fault_states` declares.
 */
function resolveDeliveryStatus(config, topology, simulation) {
  const health = simulation.healthById;
  const status = {};
  const nodeIds = [
    ...config.devices.tc300.map(({ id }) => id),
    ...config.devices.uc100.map(({ id }) => id),
    ...config.devices.gateways.map(({ id }) => id),
    ...config.network.nodes.map(({ id }) => id),
  ];
  const offlineIds = nodeIds.filter((id) => health[id] === 'offline');

  const crosses = (sourceId, offlineId) => {
    if (sourceId === NIAGARA_ID || CLIENT_IDS.includes(sourceId)) return false;
    try {
      return traceFrom(topology, sourceId).nodeIds.includes(offlineId);
    } catch {
      return false;
    }
  };

  for (const id of nodeIds) {
    if (health[id] === 'offline') {
      status[id] = 'offline';
      continue;
    }
    const backbone = INTERACTION_BACKBONE.includes(id) || CLIENT_IDS.includes(id);
    const blocked = offlineIds.some((offlineId) => {
      if (offlineId === id) return false;
      // A backbone break stops the backbone. It does NOT gray the field: every thermostat and
      // concentrator keeps measuring and keeps its own medium lit, which is exactly what
      // `visual_states.fault_states.internet-loss` shows (red then gray along the IP path only).
      if (backbone) return INTERACTION_BACKBONE.includes(offlineId);
      return !INTERACTION_BACKBONE.includes(offlineId) && crosses(id, offlineId);
    });
    status[id] = blocked ? 'unreachable' : 'normal';
  }
  return status;
}

/**
 * The COLOUR of a device: the delivery status, plus the temperature alarms that do not break a
 * single link. A hot room is red and still reporting — `niagara_delivery: active_alarm`.
 */
function resolveDeviceStatus(config, deliveryStatus, simulation) {
  const status = {};
  for (const [id, delivery] of Object.entries(deliveryStatus)) {
    if (delivery === 'offline') status[id] = 'alarm';
    else if (simulation.telemetry[id]?.status === 'alarm') status[id] = 'alarm';
    else status[id] = delivery === 'unreachable' ? 'unreachable' : 'normal';
  }
  return status;
}

/** A route carries DATA, so it is coloured by delivery, never by a temperature alarm. */
function resolveRouteStatus(config, deliveryStatus) {
  const live = (id) => deliveryStatus[id] === 'normal';
  // A device that is merely starved is still POWERED: the RF the gateway receives from a healthy
  // concentrator keeps arriving even while the gateway's own backhaul is down. Only a dead node
  // kills the medium that lands on it.
  const alive = (id) => deliveryStatus[id] !== 'offline';
  const status = {};
  for (const device of config.devices.tc300) {
    status[routeIds.drop(device.id)] = live(device.id) && live(device.uc100Id) ? 'normal' : 'blocked';
  }
  for (const device of config.devices.uc100) {
    // The trunk is the BUS, not one member: a single dead thermostat does not kill it.
    status[routeIds.trunk(device.id)] = live(device.id) ? 'normal' : 'blocked';
    status[routeIds.lorawan(device.id)] = live(device.id) && alive('UG67-01') ? 'normal' : 'blocked';
  }
  status[routeIds.gatewayEthernet] = live('UG67-01') && live('router-firewall') ? 'normal' : 'blocked';
  status[routeIds.ipChain] = ['router-firewall', 'internet', NIAGARA_ID].every(live) ? 'normal' : 'blocked';
  return status;
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
 * Two calls with the same arguments always return the same model — that is what makes a fault
 * capture and its restore comparable.
 */
export function createInteractionModel({
  state = 'engineering',
  tick = 0,
  selection = 'none',
  config = APP_CONFIG,
} = {}) {
  const scene = resolveSceneState(state) ?? INTERACTION_SCENE_STATES.engineering;
  const topology = createTopology(config);
  const base = createSimulationState(config, { tick });
  const simulation = scene.faultId ? injectFault(config, base, scene.faultId) : base;
  const alarms = deriveAlarms(config, simulation);
  const deliveryStatus = resolveDeliveryStatus(config, topology, simulation);
  const deviceStatus = resolveDeviceStatus(config, deliveryStatus, simulation);
  const routeStatus = resolveRouteStatus(config, deliveryStatus);

  // Delivery is a TOPOLOGY question, not a colour question: a hot thermostat is red and still
  // reports, and an internet loss stops all fourteen without recolouring a single field device.
  const stoppedIds = config.devices.tc300
    .filter(({ id }) => simulation.telemetry[id].communication === 'offline'
      || !evaluateReachability(topology, simulation.healthById, id).reachable)
    .map(({ id }) => id);

  const haloZoneIds = config.devices.tc300
    .filter(({ id }) => deviceStatus[id] !== 'normal')
    .map(({ zoneId }) => zoneId);
  const zoneHalos = [...new Set(haloZoneIds)]
    .map((zoneId) => zoneVolume(config, zoneId))
    .filter(Boolean)
    .sort((left, right) => left.zoneId.localeCompare(right.zoneId));

  return Object.freeze({
    state,
    tick,
    selection,
    visualMode: scene.visualMode,
    faultId: scene.faultId,
    deviceStatus: Object.freeze(deviceStatus),
    deliveryStatus: Object.freeze(deliveryStatus),
    routeStatus: Object.freeze(routeStatus),
    telemetry: simulation.telemetry,
    linkMetrics: simulation.linkMetrics,
    alarms,
    zoneHalos: Object.freeze(zoneHalos),
    niagaraDelivery: Object.freeze({
      stopped: Object.freeze(stoppedIds),
      active: Object.freeze(config.devices.tc300
        .map(({ id }) => id)
        .filter((id) => !stoppedIds.includes(id))),
    }),
    selectionPath: Object.freeze(resolveSelectionPath(config, topology, selection)),
  });
}
