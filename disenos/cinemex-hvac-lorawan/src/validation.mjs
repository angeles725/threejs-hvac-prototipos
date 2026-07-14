import {
  AUDITORIUMS,
  EXTERNAL_NODES,
  GATEWAYS,
  TC300_DEVICES,
  TC300_WALL_FACE_TOLERANCE_M,
  UC100_DEVICES,
} from './config.mjs';

const EXPECTED_COUNTS = Object.freeze({ auditoriums: 8, tc300: 14, uc100: 4, gateways: 1 });
const EXPECTED_FAMILY_COUNTS = Object.freeze({ small: 2, medium: 4, large: 2 });
const CAPACITY_RANGES = Object.freeze({ small: [70, 90], medium: [100, 130], large: [160, 200] });

function checkCount(errors, label, values, expected) {
  if (!Array.isArray(values) || values.length !== expected) {
    errors.push(`Configuration must define exactly ${expected} ${label}.`);
  }
}

function checkUniqueIds(errors, collections) {
  const ids = collections.flat().map(({ id }) => id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`Duplicate entity IDs across collections: ${[...new Set(duplicates)].join(', ')}.`);
}

function checkExactInventory(errors, label, actualIds, expectedIds) {
  const actual = new Set(actualIds);
  const expected = new Set(expectedIds);
  const missing = [...expected].filter((id) => !actual.has(id));
  const unexpected = [...actual].filter((id) => !expected.has(id));
  if (missing.length || unexpected.length || actualIds.length !== expectedIds.length) {
    const details = [
      missing.length ? `missing ${missing.join(', ')}` : null,
      unexpected.length ? `unexpected ${unexpected.join(', ')}` : null,
      actualIds.length !== expectedIds.length ? `expected ${expectedIds.length}, received ${actualIds.length}` : null,
    ].filter(Boolean);
    errors.push(`${label} inventory mismatch: ${details.join('; ')}.`);
  }
}

function checkAuditoriums(errors, auditoriums) {
  const familyCounts = { small: 0, medium: 0, large: 0 };
  for (const room of auditoriums ?? []) {
    const range = CAPACITY_RANGES[room.family];
    if (!range) {
      errors.push(`${room.id} has unsupported auditorium family ${room.family}.`);
      continue;
    }
    familyCounts[room.family] += 1;
    if (room.capacity < range[0] || room.capacity > range[1]) {
      errors.push(`${room.id} capacity ${room.capacity} is outside ${room.family} range ${range[0]}–${range[1]}.`);
    }
  }
  if (Object.entries(EXPECTED_FAMILY_COUNTS).some(([family, count]) => familyCounts[family] !== count)) {
    errors.push('Auditorium families must be exactly 2 small, 4 medium and 2 large.');
  }
}

function coordinatesMatch(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((value, index) => Math.abs(value - expected[index]) < 1e-9);
}

function withinRange(value, [min, max], tolerance = 0) {
  const floatingPointMargin = Number.EPSILON * 16;
  return value >= min - tolerance - floatingPointMargin && value <= max + tolerance + floatingPointMargin;
}

function checkPlacements(errors, thermostats, zones) {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const canonicalById = new Map(TC300_DEVICES.map((device) => [device.id, device]));
  for (const device of thermostats ?? []) {
    const zone = zoneById.get(device.zoneId);
    const canonical = canonicalById.get(device.id);
    if (!zone) errors.push(`${device.id} references unknown zone ${device.zoneId}.`);
    if (device.position?.[1] !== 1.5) errors.push(`${device.id} must be mounted at 1.50 m AFF.`);
    if (!device.placement?.interiorOrNeutralWall) errors.push(`${device.id} must use an interior or neutral wall.`);
    if (device.placement?.nearDoor) errors.push(`${device.id} cannot be near a door.`);
    if (device.placement?.belowDiffuser) errors.push(`${device.id} cannot be below a diffuser.`);
    if (device.placement?.nearHeatOrMoisture) errors.push(`${device.id} cannot be near heat, steam, grease or moisture.`);
    if (canonical) {
      if (device.zoneId !== canonical.zoneId) errors.push(`${device.id} must use canonical zone ${canonical.zoneId}.`);
      if (device.uc100Id !== canonical.uc100Id) errors.push(`${device.id} must use canonical UC100 ${canonical.uc100Id}.`);
      if (!coordinatesMatch(device.position, canonical.position)) {
        errors.push(`${device.id} must use canonical position [${canonical.position.join(', ')}].`);
      }
      for (const key of ['interiorOrNeutralWall', 'nearDoor', 'belowDiffuser', 'nearHeatOrMoisture', 'nearRepresentativeReturn']) {
        if (device.placement?.[key] !== canonical.placement?.[key]) {
          errors.push(`${device.id} canonical placement flag ${key} must be ${String(canonical.placement?.[key])}.`);
        }
      }
    }
    if (zone?.bounds && (!withinRange(device.position?.[0], zone.bounds.x, TC300_WALL_FACE_TOLERANCE_M)
      || !withinRange(device.position?.[2], zone.bounds.z, TC300_WALL_FACE_TOLERANCE_M))) {
      errors.push(`${device.id} exceeds the documented ${TC300_WALL_FACE_TOLERANCE_M.toFixed(2)} m wall-face tolerance for ${zone.id}.`);
    }
  }
}

function checkMembership(errors, thermostats, concentrators) {
  const declared = concentrators.flatMap(({ id, memberIds = [] }) => memberIds.map((memberId) => [memberId, id]));
  const membershipCount = new Map();
  for (const [memberId] of declared) membershipCount.set(memberId, (membershipCount.get(memberId) ?? 0) + 1);

  for (const thermostat of thermostats) {
    if (membershipCount.get(thermostat.id) !== 1) errors.push(`${thermostat.id} must occur exactly once in UC100 membership.`);
    const declaredOwner = declared.find(([memberId]) => memberId === thermostat.id)?.[1];
    if (declaredOwner && declaredOwner !== thermostat.uc100Id) {
      errors.push(`${thermostat.id} owner mismatch: ${thermostat.uc100Id} versus ${declaredOwner}.`);
    }
  }

  const knownIds = new Set(TC300_DEVICES.map(({ id }) => id));
  const canonicalByUc100 = new Map(UC100_DEVICES.map(({ id, memberIds }) => [id, memberIds]));
  for (const concentrator of concentrators) {
    const canonical = canonicalByUc100.get(concentrator.id);
    if (!canonical) continue;
    const counts = new Map();
    for (const memberId of concentrator.memberIds ?? []) counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
    const unknown = [...counts.keys()].filter((id) => !knownIds.has(id));
    const missing = canonical.filter((id) => !counts.has(id));
    const duplicate = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
    const extra = [...counts.keys()].filter((id) => knownIds.has(id) && !canonical.includes(id));
    if (unknown.length) errors.push(`${concentrator.id} membership has unknown members: ${unknown.join(', ')}.`);
    if (missing.length) errors.push(`${concentrator.id} membership is missing: ${missing.join(', ')}.`);
    if (duplicate.length) errors.push(`${concentrator.id} membership has duplicate members: ${duplicate.join(', ')}.`);
    if (extra.length) errors.push(`${concentrator.id} membership has extra canonical devices: ${extra.join(', ')}.`);
  }
}

export function validateConfig(config) {
  const errors = [];
  const auditoriums = config?.auditoriums ?? [];
  const tc300 = config?.devices?.tc300 ?? [];
  const uc100 = config?.devices?.uc100 ?? [];
  const gateways = config?.devices?.gateways ?? [];

  checkCount(errors, 'auditoriums', auditoriums, EXPECTED_COUNTS.auditoriums);
  checkCount(errors, 'TC300 devices', tc300, EXPECTED_COUNTS.tc300);
  checkCount(errors, 'UC100 devices', uc100, EXPECTED_COUNTS.uc100);
  checkCount(errors, 'UG67 gateways', gateways, EXPECTED_COUNTS.gateways);
  checkUniqueIds(errors, [config?.zones ?? [], auditoriums, tc300, uc100, gateways, config?.network?.nodes ?? []]);
  checkExactInventory(errors, 'TC300', tc300.map(({ id }) => id), TC300_DEVICES.map(({ id }) => id));
  checkExactInventory(errors, 'UC100', uc100.map(({ id }) => id), UC100_DEVICES.map(({ id }) => id));
  checkExactInventory(errors, 'UG67', gateways.map(({ id }) => id), GATEWAYS.map(({ id }) => id));
  checkExactInventory(
    errors,
    'Niagara',
    (config?.network?.nodes ?? []).filter(({ type }) => type === 'server').map(({ id }) => id),
    EXTERNAL_NODES.filter(({ type }) => type === 'server').map(({ id }) => id),
  );
  checkAuditoriums(errors, auditoriums);
  checkPlacements(errors, tc300, config?.zones ?? []);
  checkMembership(errors, tc300, uc100);

  return { valid: errors.length === 0, errors };
}
