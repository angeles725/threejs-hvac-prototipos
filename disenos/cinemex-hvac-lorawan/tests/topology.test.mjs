import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { createTopology, traceFrom, validateTopology } from '../src/topology.mjs';
import { selectThermostatsForUc100, selectTrace } from '../src/selectors.mjs';

test('UC100 membership contains every thermostat exactly once and matches the canonical groups', () => {
  assert.deepEqual(selectThermostatsForUc100(APP_CONFIG, 'UC100-A').map(({ id }) => id), [
    'TC300-01', 'TC300-02', 'TC300-03', 'TC300-04', 'TC300-14',
  ]);
  assert.deepEqual(selectThermostatsForUc100(APP_CONFIG, 'UC100-D').map(({ id }) => id), ['TC300-05']);

  const allMembers = APP_CONFIG.devices.uc100.flatMap(({ memberIds }) => memberIds);
  assert.equal(allMembers.length, 14);
  assert.equal(new Set(allMembers).size, 14);
});

test('a thermostat trace uses RS-485, LoRaWAN and Ethernet in canonical order', () => {
  const topology = createTopology(APP_CONFIG);
  const trace = traceFrom(topology, 'TC300-08');

  assert.deepEqual(trace.nodeIds, [
    'TC300-08', 'UC100-B', 'UG67-01', 'router-firewall', 'internet', 'niagara-supervisor',
  ]);
  assert.deepEqual(trace.media, ['rs485', 'lorawan', 'ethernet', 'ethernet', 'ethernet']);
  assert.equal(trace.edges[0].label, 'RS-485 / Modbus RTU');
  assert.equal(trace.edges[1].physical, false);
  assert.deepEqual(selectTrace(APP_CONFIG, 'TC300-05').nodeIds.slice(0, 3), ['TC300-05', 'UC100-D', 'UG67-01']);
});

test('topology validation rejects direct TC300-to-UG67 shortcuts and incorrect media', () => {
  assert.deepEqual(validateTopology(APP_CONFIG), { valid: true, errors: [] });

  const shortcut = structuredClone(APP_CONFIG);
  shortcut.network.edges.push({ from: 'TC300-01', to: 'UG67-01', medium: 'lorawan', physical: false });
  assert.match(validateTopology(shortcut).errors.join('\n'), /shortcut.*TC300-01.*UG67-01/i);

  const wiredLorawan = structuredClone(APP_CONFIG);
  const ucToGateway = wiredLorawan.network.edges.find(({ from }) => from === 'UC100-A');
  ucToGateway.medium = 'ethernet';
  ucToGateway.physical = true;
  const errors = validateTopology(wiredLorawan).errors.join('\n');
  assert.match(errors, /UC100-A.*UG67-01.*LoRaWAN/i);
  assert.match(errors, /UC100-A.*wireless/i);
});

test('all configured nodes can reach Niagara without inventing reverse or shortcut links', () => {
  const topology = createTopology(APP_CONFIG);
  for (const thermostat of APP_CONFIG.devices.tc300) {
    const trace = traceFrom(topology, thermostat.id);
    assert.equal(trace.nodeIds.at(-1), 'niagara-supervisor', thermostat.id);
    assert.equal(trace.edges.length, 5, thermostat.id);
  }
  assert.equal(topology.edges.some(({ from, to }) => from.startsWith('TC300-') && to === 'UG67-01'), false);
});

test('topology validation rejects every extra edge, including non-TC shortcuts', () => {
  const ucToNiagara = structuredClone(APP_CONFIG);
  ucToNiagara.network.edges.push({
    from: 'UC100-A',
    to: 'niagara-supervisor',
    medium: 'ethernet',
    label: 'Forbidden shortcut',
    physical: true,
  });
  assert.match(validateTopology(ucToNiagara).errors.join('\n'), /unexpected edge.*UC100-A.*niagara-supervisor/i);

  const duplicateCanonicalEdge = structuredClone(APP_CONFIG);
  duplicateCanonicalEdge.network.edges.push(structuredClone(duplicateCanonicalEdge.network.edges[0]));
  assert.match(validateTopology(duplicateCanonicalEdge).errors.join('\n'), /unexpected edge.*duplicate/i);
});

test('topology validation rejects missing edges and endpoint or type mutations', () => {
  const missing = structuredClone(APP_CONFIG);
  missing.network.edges = missing.network.edges.filter(({ from }) => from !== 'TC300-08');
  assert.match(validateTopology(missing).errors.join('\n'), /missing edge.*TC300-08.*UC100-B/i);

  const mutatedEndpoint = structuredClone(APP_CONFIG);
  mutatedEndpoint.network.edges.find(({ from }) => from === 'TC300-08').to = 'UC100-C';
  const endpointErrors = validateTopology(mutatedEndpoint).errors.join('\n');
  assert.match(endpointErrors, /missing edge.*TC300-08.*UC100-B/i);
  assert.match(endpointErrors, /unexpected edge.*TC300-08.*UC100-C/i);

  const mutatedType = structuredClone(APP_CONFIG);
  mutatedType.network.edges.find(({ from }) => from === 'internet').medium = 'lorawan';
  const typeErrors = validateTopology(mutatedType).errors.join('\n');
  assert.match(typeErrors, /missing edge.*internet.*niagara-supervisor.*ethernet/i);
  assert.match(typeErrors, /unexpected edge.*internet.*niagara-supervisor.*lorawan/i);
});

test('topology validation rejects a native-driver claim replacing the conceptual Niagara label', () => {
  const nativeDriverClaim = structuredClone(APP_CONFIG);
  const internetToNiagara = nativeDriverClaim.network.edges.find(
    ({ from, to }) => from === 'internet' && to === 'niagara-supervisor',
  );
  assert.equal(internetToNiagara.label, 'Conceptual IP integration');

  internetToNiagara.label = 'Native Niagara direct driver';

  const result = validateTopology(nativeDriverClaim);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /missing edge.*internet.*niagara-supervisor/i);
  assert.match(result.errors.join('\n'), /unexpected edge.*internet.*niagara-supervisor/i);
});
