import { NETWORK } from './config.mjs';

const TARGET_ID = 'niagara-supervisor';
const CANONICAL_MEDIA_ORDER = 'rs485>lorawan>ethernet>ethernet>ethernet';

function entityNodes(config) {
  return [
    ...(config.devices?.tc300 ?? []),
    ...(config.devices?.uc100 ?? []),
    ...(config.devices?.gateways ?? []),
    ...(config.network?.nodes ?? []),
  ];
}

export function createTopology(config) {
  const nodes = new Map(entityNodes(config).map((node) => [node.id, node]));
  const edges = (config.network?.edges ?? []).map((edge, index) => Object.freeze({ id: `edge-${index + 1}`, ...edge }));
  const outgoing = new Map();
  for (const edge of edges) {
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge);
    outgoing.set(edge.from, bucket);
  }
  return Object.freeze({ nodes, edges: Object.freeze(edges), outgoing });
}

export function traceFrom(topology, sourceId, targetId = TARGET_ID) {
  if (!topology.nodes.has(sourceId)) throw new Error(`Unknown topology source ${sourceId}.`);
  const nodeIds = [sourceId];
  const edges = [];
  const visited = new Set([sourceId]);
  let cursor = sourceId;

  while (cursor !== targetId) {
    const candidates = topology.outgoing.get(cursor) ?? [];
    const next = candidates.find(({ to }) => to === targetId || !visited.has(to));
    if (!next) throw new Error(`No canonical path from ${sourceId} to ${targetId}.`);
    if (visited.has(next.to)) throw new Error(`Topology cycle detected at ${next.to}.`);
    edges.push(next);
    nodeIds.push(next.to);
    visited.add(next.to);
    cursor = next.to;
  }

  return Object.freeze({
    sourceId,
    targetId,
    nodeIds: Object.freeze(nodeIds),
    edges: Object.freeze(edges),
    media: Object.freeze(edges.map(({ medium }) => medium)),
  });
}

function validateMedia(errors, edge, deviceById) {
  const source = deviceById.get(edge.from);
  const target = deviceById.get(edge.to);
  if (source?.type === 'tc300' && target?.type === 'ug67') {
    errors.push(`Forbidden shortcut ${edge.from} → ${edge.to}; TC300 must connect through its UC100.`);
  }
  if (source?.type === 'tc300' && (target?.type !== 'uc100' || edge.medium !== 'rs485')) {
    errors.push(`${edge.from} must reach its UC100 only through RS-485.`);
  }
  if (source?.type === 'uc100' && target?.type === 'ug67') {
    if (edge.medium !== 'lorawan') errors.push(`${edge.from} → ${edge.to} must use LoRaWAN.`);
    if (edge.physical !== false) errors.push(`${edge.from} → ${edge.to} must be wireless, never a physical cable.`);
  }
  if (source?.type === 'ug67' && edge.medium !== 'ethernet') {
    errors.push(`${edge.from} backhaul must use Ethernet.`);
  }
}

function normalizeEdgeLabel(label) {
  return typeof label === 'string' ? label.normalize('NFC') : label;
}

function edgeSignature({ from, to, medium, label, physical }) {
  return JSON.stringify([from, to, medium, normalizeEdgeLabel(label), physical]);
}

function describeEdge({ from, to, medium, label, physical }) {
  return `${from} → ${to} (${medium}, label=${JSON.stringify(normalizeEdgeLabel(label))}, physical=${String(physical)})`;
}

function checkExactEdgeSet(errors, edges) {
  const expectedBySignature = new Map();
  const actualBySignature = new Map();
  for (const edge of NETWORK.edges) {
    const signature = edgeSignature(edge);
    const bucket = expectedBySignature.get(signature) ?? [];
    bucket.push(edge);
    expectedBySignature.set(signature, bucket);
  }
  for (const edge of edges) {
    const signature = edgeSignature(edge);
    const bucket = actualBySignature.get(signature) ?? [];
    bucket.push(edge);
    actualBySignature.set(signature, bucket);
  }

  for (const [signature, expected] of expectedBySignature) {
    const actual = actualBySignature.get(signature) ?? [];
    for (let index = actual.length; index < expected.length; index += 1) {
      errors.push(`Missing edge ${describeEdge(expected[index])}.`);
    }
  }
  for (const [signature, actual] of actualBySignature) {
    const expected = expectedBySignature.get(signature) ?? [];
    for (let index = expected.length; index < actual.length; index += 1) {
      const duplicate = expected.length > 0 ? ' duplicate' : '';
      errors.push(`Unexpected edge${duplicate} ${describeEdge(actual[index])}.`);
    }
  }
}

export function validateTopology(config) {
  const errors = [];
  const nodes = entityNodes(config);
  const deviceById = new Map(nodes.map((node) => [node.id, node]));
  const edges = config.network?.edges ?? [];

  checkExactEdgeSet(errors, edges);

  for (const edge of edges) {
    if (!deviceById.has(edge.from) || !deviceById.has(edge.to)) {
      errors.push(`Edge ${edge.from} → ${edge.to} references an unknown node.`);
      continue;
    }
    validateMedia(errors, edge, deviceById);
  }

  const topology = createTopology(config);
  for (const thermostat of config.devices?.tc300 ?? []) {
    const outgoing = topology.outgoing.get(thermostat.id) ?? [];
    const expectedOwner = thermostat.uc100Id;
    if (outgoing.length !== 1 || outgoing[0].to !== expectedOwner) {
      errors.push(`${thermostat.id} must have one RS-485 edge to ${expectedOwner}.`);
    }
    try {
      const trace = traceFrom(topology, thermostat.id);
      if (trace.media.join('>') !== CANONICAL_MEDIA_ORDER) {
        errors.push(`${thermostat.id} has non-canonical media order ${trace.media.join('>')}.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  return { valid: errors.length === 0, errors };
}
