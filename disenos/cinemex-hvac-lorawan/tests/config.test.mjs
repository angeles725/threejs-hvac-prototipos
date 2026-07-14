import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APP_CONFIG,
  AUDITORIUMS,
  GATEWAYS,
  TC300_DEVICES,
  TC300_WALL_FACE_TOLERANCE_M,
  UC100_DEVICES,
} from '../src/config.mjs';
import { validateConfig } from '../src/validation.mjs';

const EXPECTED_TC300_ZONES = Object.freeze({
  'TC300-01': 'lobby',
  'TC300-02': 'concessions',
  'TC300-03': 'ticket-checkpoint',
  'TC300-04': 'central-corridor',
  'TC300-05': 'kitchen',
  'TC300-06': 'sala-1',
  'TC300-07': 'sala-2',
  'TC300-08': 'sala-3',
  'TC300-09': 'sala-4',
  'TC300-10': 'sala-5',
  'TC300-11': 'sala-6',
  'TC300-12': 'sala-7',
  'TC300-13': 'sala-8',
  'TC300-14': 'administration',
});

test('config exposes the exact cinema and device inventory', () => {
  assert.equal(AUDITORIUMS.length, 8);
  assert.equal(TC300_DEVICES.length, 14);
  assert.equal(UC100_DEVICES.length, 4);
  assert.equal(GATEWAYS.length, 1);
  assert.deepEqual(
    Object.fromEntries(TC300_DEVICES.map(({ id, zoneId }) => [id, zoneId])),
    EXPECTED_TC300_ZONES,
  );
});

test('auditorium families and capacities satisfy the required distribution', () => {
  const byFamily = Object.groupBy(AUDITORIUMS, ({ family }) => family);

  assert.deepEqual(
    Object.fromEntries(Object.entries(byFamily).map(([family, rooms]) => [family, rooms.length])),
    { large: 2, medium: 4, small: 2 },
  );
  assert.ok(byFamily.small.every(({ capacity }) => capacity >= 70 && capacity <= 90));
  assert.ok(byFamily.medium.every(({ capacity }) => capacity >= 100 && capacity <= 130));
  assert.ok(byFamily.large.every(({ capacity }) => capacity >= 160 && capacity <= 200));
});

test('all TC300 placements are neutral, 1.5 m AFF and clear of prohibited influences', () => {
  for (const thermostat of TC300_DEVICES) {
    assert.equal(thermostat.position[1], 1.5, thermostat.id);
    assert.equal(thermostat.placement.interiorOrNeutralWall, true, thermostat.id);
    assert.equal(thermostat.placement.nearDoor, false, thermostat.id);
    assert.equal(thermostat.placement.belowDiffuser, false, thermostat.id);
    assert.equal(thermostat.placement.nearHeatOrMoisture, false, thermostat.id);
  }
});

test('configuration validation accepts the canonical config and rejects count or placement drift', () => {
  assert.deepEqual(validateConfig(APP_CONFIG), { valid: true, errors: [] });

  const missingThermostat = {
    ...APP_CONFIG,
    devices: { ...APP_CONFIG.devices, tc300: APP_CONFIG.devices.tc300.slice(1) },
  };
  assert.match(validateConfig(missingThermostat).errors.join('\n'), /exactly 14 TC300/i);

  const invalidPlacement = structuredClone(APP_CONFIG);
  invalidPlacement.devices.tc300[0].position[1] = 2.1;
  invalidPlacement.devices.tc300[0].placement.nearDoor = true;
  const errors = validateConfig(invalidPlacement).errors.join('\n');
  assert.match(errors, /TC300-01.*1\.50 m AFF/i);
  assert.match(errors, /TC300-01.*near a door/i);
});

test('authoritative identifiers and collections cannot be mutated at runtime', () => {
  assert.equal(Object.isFrozen(APP_CONFIG), true);
  assert.equal(Object.isFrozen(TC300_DEVICES), true);
  assert.throws(() => {
    TC300_DEVICES[0].id = 'TC300-99';
  }, TypeError);
});

test('validation enforces global identity and exact TC300, UC100, UG67 and Niagara inventories', () => {
  const duplicateAcrossCollections = structuredClone(APP_CONFIG);
  duplicateAcrossCollections.devices.uc100[0].id = 'TC300-01';
  assert.match(validateConfig(duplicateAcrossCollections).errors.join('\n'), /duplicate entity ID.*TC300-01/i);

  const unknownThermostat = structuredClone(APP_CONFIG);
  unknownThermostat.devices.tc300[0].id = 'TC300-99';
  assert.match(validateConfig(unknownThermostat).errors.join('\n'), /TC300 inventory.*TC300-01.*TC300-99/i);

  const unknownGateway = structuredClone(APP_CONFIG);
  unknownGateway.devices.gateways[0].id = 'UG67-99';
  assert.match(validateConfig(unknownGateway).errors.join('\n'), /UG67 inventory.*UG67-01.*UG67-99/i);

  const unknownNiagara = structuredClone(APP_CONFIG);
  unknownNiagara.network.nodes.find(({ id }) => id === 'niagara-supervisor').id = 'niagara-shadow';
  assert.match(validateConfig(unknownNiagara).errors.join('\n'), /Niagara inventory.*niagara-supervisor.*niagara-shadow/i);
});

test('validation rejects any membership drift, including unknown, missing and duplicate members', () => {
  const unknownMember = structuredClone(APP_CONFIG);
  unknownMember.devices.uc100[0].memberIds.push('TC300-99');
  assert.match(validateConfig(unknownMember).errors.join('\n'), /UC100-A membership.*unknown.*TC300-99/i);

  const missingMember = structuredClone(APP_CONFIG);
  missingMember.devices.uc100[1].memberIds = missingMember.devices.uc100[1].memberIds.filter((id) => id !== 'TC300-08');
  assert.match(validateConfig(missingMember).errors.join('\n'), /UC100-B membership.*missing.*TC300-08/i);

  const duplicateMember = structuredClone(APP_CONFIG);
  duplicateMember.devices.uc100[2].memberIds.push('TC300-10');
  assert.match(validateConfig(duplicateMember).errors.join('\n'), /UC100-C membership.*duplicate.*TC300-10/i);
});

test('canonical placement is exact and permits only the documented 0.15 m wall-face tolerance', () => {
  assert.equal(TC300_WALL_FACE_TOLERANCE_M, 0.15);
  const concessions = APP_CONFIG.zones.find(({ id }) => id === 'concessions');
  const tc30002 = APP_CONFIG.devices.tc300.find(({ id }) => id === 'TC300-02');
  assert.ok(Math.abs(tc30002.position[0] - concessions.bounds.x[1]) <= TC300_WALL_FACE_TOLERANCE_M + 1e-12);

  const movedCanonicalDevice = structuredClone(APP_CONFIG);
  movedCanonicalDevice.devices.tc300[0].position[0] += 0.5;
  assert.match(validateConfig(movedCanonicalDevice).errors.join('\n'), /TC300-01.*canonical position/i);

  const outsideWallFace = structuredClone(APP_CONFIG);
  outsideWallFace.devices.tc300[1].position[0] = concessions.bounds.x[1] + 0.151;
  assert.match(validateConfig(outsideWallFace).errors.join('\n'), /TC300-02.*wall-face tolerance/i);
});
