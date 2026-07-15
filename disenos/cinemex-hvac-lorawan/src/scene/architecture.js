import {
  APP_CONFIG,
  AUDITORIUMS,
  GATEWAYS,
  TC300_DEVICES,
  UC100_DEVICES,
  ZONES,
} from '../config.mjs';
import {
  createNetworkSchematicComposition,
  resolveNetworkEvidenceVisibility,
} from './network-schematic.js';
import { MATERIAL_SPECS } from './materials.js';
import {
  INTERACTION_WAVE_RINGS,
  createInteractionModel,
  resolveHaloPulse,
  resolvePacketT,
  resolveWaveRing,
  routeIds,
  samplePolyline,
} from './interaction.js';
import { CAMERA_PRESETS, QA_CAMERA_PRESETS } from '../controllers/camera.js';
import {
  LIGHTING_EMISSION_CHANNELS,
  LIGHTING_INTERIOR_CEILING_COLOR,
  LIGHTING_PRESET_ZONE_OWNER,
  applyZoneLighting,
  resolveEmissiveIntensity,
  resolveInteriorCeilingVisibility,
  resolveLightingZone,
  resolveZoneDim,
  setZoneFillGain,
  zoneNeedsVariant,
} from './lighting.js';
import {
  POSTER_VARIANTS,
  SURFACE_DIRECTION_MARKER,
  SURFACE_ENGINEERING_CONTRAST,
  SURFACE_LORAWAN_DASH,
  SURFACE_NETWORK_LABEL_POLICY,
  SURFACE_NETWORK_MEDIA,
  SURFACE_NETWORK_ROLLUPS,
  SURFACE_REAR_ROOF_CLIP_CAMERAS,
  SURFACE_ROOF_CLIP_CAMERAS,
  SURFACE_RS485_EVIDENCE_POLICY,
  SURFACE_TC300_LABEL_POLICY,
  createDirectionMarkerPlacement,
  createDirectionMarkerViewTransform,
  createSurfaceAtlas,
  createSurfaceDetailPlan,
  isDirectionMarkerSampleVisibleOnDashedRoute,
  refineDirectionMarkerScale,
  resolveDashCount,
  resolveDirectionMarkerScale,
  resolveNetworkMediaWidthScale,
  resolveTc300LabelPlacement,
  resolveTrayOffset,
  snapSampleToDashCentre,
  validateSurfacePlacements,
} from './surfaces.js';

/** The public roof buries the lobby, concessions and kitchen fit-out from their own presets. */
export function resolvePublicRoofVisibility(cameraName) {
  return !SURFACE_ROOF_CLIP_CAMERAS.includes(cameraName);
}

/** The rear service roof buries the corridor, doors and UC cabinets from the technical preset. */
export function resolveRearRoofVisibility(cameraName) {
  return !SURFACE_REAR_ROOF_CLIP_CAMERAS.includes(cameraName);
}

/**
 * `visual_states.architecture` declares `labels: selective`: technical device labels are an
 * engineering artefact and must never leak into the architecture state by default.
 */
export function resolveTechnicalLabelVisibility({
  visualMode = 'architectural',
  labels = true,
  labelsExplicit = false,
} = {}) {
  if (!labels) return false;
  return visualMode === 'engineering' || labelsExplicit === true;
}

const TECHNICAL_BILLBOARD_KINDS = Object.freeze([
  'tc300', 'uc100', 'ug67', 'external', 'bus-group', 'bus-rollup',
]);

// SCALE: 1 world unit = 1 metre. Structural geometry stays finish-agnostic.
export const ARCHITECTURE_ASSET_ID = 'shell-circulation-facade';

const REQUIREMENT_ARCHITECTURE = Object.freeze(['CIN-ARCH-001']);
const REQUIREMENT_FACADE = Object.freeze(['CIN-ARCH-001', 'CIN-ARCH-002']);
const PORTAL_CENTRES_Z = Object.freeze([6.25, -1.65, -8.95, -15.55]);
const AUDITORIUM_FAMILY_PROFILES = deepFreeze({
  large: {
    proxyWidth: 24,
    proxyDepth: 8,
    volumeHeight: 8.4,
    tierCount: 7,
    screenSize: [0.18, 5.2, 7.2],
  },
  medium: {
    proxyWidth: 20,
    proxyDepth: 5.6,
    volumeHeight: 6,
    tierCount: 5,
    screenSize: [0.18, 3.9, 5],
  },
  small: {
    proxyWidth: 16,
    proxyDepth: 3.5,
    volumeHeight: 3.8,
    tierCount: 3,
    screenSize: [0.18, 2.7, 3.2],
  },
});
const STRUCTURAL_FAMILY_PROFILES = deepFreeze({
  large: { width: 24, height: 8.4, tiers: 7 },
  medium: { width: 20, height: 7.2, tiers: 5 },
  small: { width: 16, height: 6, tiers: 3 },
});

/**
 * Spec amendment 2026-07-14 (`roof_hvac.children.packaged_hvac_units`): one packaged rooftop unit
 * per TC300 zone, at the `dimensions_real` RTU size, seated on a curb, with a supply drop entering
 * the roof plate. The silhouette vocabulary (cabinet / condenser fan circle on top / intake hood /
 * curb) follows the house Trane RTU family; the scale and palette are this design's own.
 */
export const RTU_PACKAGE = deepFreeze({
  size: [2.5, 1.2, 1.5], // rtu_package_length_m × height_m × width_m
  curbHeight: 0.25,
  curbSize: [2.1, 0.25, 1.1],
  // Half-footprint plus a 0.1 m margin: the derived clamp that keeps a unit inside its roof plate.
  clearance: { x: 1.35, z: 0.85 },
  fan: { radius: 0.5, height: 0.05 },
  // `supply_drop` template: unit-local [0,-0.60,0] → [0,-1.10,0], i.e. cabinet base to 0.25 m below
  // the plate top face — through the 0.22 m plate, overlap ≥ the spec's 0.20.
  supplyDrop: { size: [0.45, 0.5, 0.45], requiredOverlap: 0.2 },
});

/** The front public roof plate the builder emits at line "front-public-roof" — mirrored here so the
 * RTU derivation and the emitted panel share one truth (a test pins them together). */
export const PUBLIC_ROOF_PLATE = deepFreeze({
  top: 4.72,
  bounds: { x: [-30, 30], z: [10.5, 22.5] },
});

const clampToRange = (value, [minimum, maximum]) => Math.min(maximum, Math.max(minimum, value));
const insetRange = ([minimum, maximum], margin) => [minimum + margin, maximum - margin];

/**
 * One packaged unit per thermostat, derived — never hand-scattered. The x lane comes from the
 * owning TC300 (clamped into the zone and plate), the z from the zone centre (clamped into the
 * plate): the unit stands on the roof above the zone it serves, or on the nearest plate point when
 * the zone (the roofless central corridor) offers none.
 */
function createPackagedUnitPlan(auditoriums) {
  const zoneById = new Map(ZONES.map((zone) => [zone.id, zone]));
  return TC300_DEVICES.map((device) => {
    const zone = zoneById.get(device.zoneId);
    const room = auditoriums.find(({ zoneId }) => zoneId === device.zoneId) ?? null;
    const plate = room
      ? { top: room.height + 0.22, bounds: room.bounds, owner: `${room.id}-roof-panel` }
      : { ...PUBLIC_ROOF_PLATE, owner: 'front-public-roof' };
    const laneX = insetRange(
      [
        Math.max(plate.bounds.x[0], zone.bounds.x[0]),
        Math.min(plate.bounds.x[1], zone.bounds.x[1]),
      ],
      RTU_PACKAGE.clearance.x,
    );
    const x = clampToRange(device.position[0], laneX);
    const z = clampToRange(
      centre(zone.bounds.z),
      insetRange(plate.bounds.z, RTU_PACKAGE.clearance.z),
    );
    const base = plate.top;
    return {
      id: `rtu-${device.id}`,
      tc300Id: device.id,
      zoneId: device.zoneId,
      plateOwner: plate.owner,
      plateTop: base,
      plateBounds: plate.bounds,
      // Base point ON the plate top face: the curb seats here, in visible contact.
      position: [x, base, z],
      size: [...RTU_PACKAGE.size],
      curbSize: [...RTU_PACKAGE.curbSize],
      supplyDrop: {
        // unit-local [0,-0.60,0] → [0,-1.10,0] realized in world space.
        start: [x, base + RTU_PACKAGE.curbHeight, z],
        end: [x, base - RTU_PACKAGE.curbHeight, z],
        overlapWithPlate: Math.min(RTU_PACKAGE.curbHeight, 0.22),
      },
      metadata: metadata(`rtu-${device.id}`, 'rtu-package-unit', REQUIREMENT_ARCHITECTURE, {
        tc300Id: device.id,
        zoneId: device.zoneId,
        plateOwner: plate.owner,
      }),
    };
  });
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function metadata(entityId, kind, requirementIds = REQUIREMENT_ARCHITECTURE, extra = {}) {
  return {
    entityId,
    assetId: ARCHITECTURE_ASSET_ID,
    kind,
    requirementIds,
    pass: 'blockout',
    ...extra,
  };
}

function structuralMetadata(entityId, kind, requirementIds = REQUIREMENT_ARCHITECTURE, extra = {}) {
  return metadata(entityId, kind, requirementIds, {
    pass: 'structural',
    temporaryProxy: false,
    ...extra,
  });
}

function surfaceMetadata(entityId, kind, requirementIds = REQUIREMENT_ARCHITECTURE, extra = {}) {
  return metadata(entityId, kind, requirementIds, {
    pass: 'surface',
    temporaryProxy: false,
    generated: true,
    protectedContentSafe: true,
    ...extra,
  });
}

function technicalRoom(id, x) {
  return {
    id,
    bounds: { x, z: [-22.2, -20.2] },
    metadata: metadata(id, 'technical-room', REQUIREMENT_ARCHITECTURE, {
      circulationConnection: 'rear-service-corridor',
    }),
  };
}

function endpoint(id, kind, position, size, materialKey) {
  return {
    id,
    kind,
    position,
    size,
    materialKey,
    metadata: metadata(id, kind, ['HVAC-IOT-003'], { temporaryProxy: true }),
  };
}

function billboard(
  id,
  kind,
  text,
  position,
  scale,
  layer,
  accent,
  visibilityScope = 'always',
  metadataExtra = {},
) {
  return {
    id,
    kind,
    text,
    position,
    scale,
    layer,
    accent,
    billboard: true,
    halo: true,
    visibilityScope,
    metadata: metadata(id, `${kind}-billboard`, ['CIN-ARCH-001', 'HVAC-IOT-003'], {
      temporaryProxy: true,
      ...metadataExtra,
    }),
  };
}

/** Pure, serializable authority consumed by tests and the Three.js adapter. */
export function createArchitecturePlan() {
  const portals = [];
  for (const side of ['west', 'east']) {
    const offset = side === 'west' ? 0 : 4;
    for (let index = 0; index < 4; index += 1) {
      const roomNumber = offset + index + 1;
      portals.push({
        id: `portal-sala-${roomNumber}`,
        auditoriumId: `auditorium-sala-${roomNumber}`,
        side,
        position: [side === 'west' ? -4.05 : 4.05, 1.2, PORTAL_CENTRES_Z[index]],
        width: 2.2,
        height: 2.4,
        metadata: metadata(`portal-sala-${roomNumber}`, 'auditorium-portal', REQUIREMENT_ARCHITECTURE, {
          roomNumber,
          accessible: true,
        }),
      });
    }
  }

  const auditoriums = AUDITORIUMS.map((room) => ({
    id: room.id,
    zoneId: room.zoneId,
    family: room.family,
    capacity: room.capacity,
    bounds: room.bounds,
    height: room.height,
    metadata: metadata(room.id, 'auditorium-mass', REQUIREMENT_ARCHITECTURE, {
      family: room.family,
      roomNumber: Number(room.zoneId.split('-')[1]),
    }),
  }));
  const frontOfHouse = [
    ['foh-lobby', 'lobby', [16, 0.18, 19], [24, 0.36, 5], 'foh-lobby'],
    ['foh-ticketing', 'ticketing', [-21, 1.2, 19], [10, 2.4, 1.6], 'foh-ticket'],
    ['foh-waiting', 'waiting', [19, 0.55, 17.5], [8, 1.1, 2.4], 'foh-waiting'],
    ['foh-concession', 'concession-counter', [0, 1.1, 16], [24, 2.2, 1.4], 'foh-concession'],
    ['foh-kitchen', 'kitchen-workline', [-8.5, 1, 12.5], [12, 2, 3.2], 'foh-kitchen'],
    ['foh-checkpoint', 'checkpoint-lane', [0, 0.9, 11.7], [8, 1.8, 2.4], 'foh-checkpoint'],
  ].map(([id, kind, position, size, materialKey]) => ({
    id,
    kind,
    position,
    size,
    materialKey,
    ...(kind === 'checkpoint-lane' ? { accessGapWidth: 2.4, openAccess: true } : {}),
    metadata: metadata(id, `front-of-house-${kind}`, REQUIREMENT_FACADE, { temporaryProxy: true }),
  }));

  const external = [
    endpoint('router-firewall-proxy', 'router', [36, 1.2, 0], [1.8, 1.3, 1.2], 'endpoint-router'),
    endpoint('internet-cloud-proxy', 'cloud', [42, 2.2, 0], [2.5, 1.7, 1.2], 'endpoint-cloud'),
    endpoint('niagara-server-proxy', 'server', [48, 1.8, 0], [2.2, 3.2, 1.4], 'endpoint-server'),
    endpoint('pc-proxy', 'pc', [54, 1.2, 8], [1.8, 1.4, 0.5], 'endpoint-pc'),
    endpoint('tablet-proxy', 'tablet', [54, 1, 0], [1.1, 1.4, 0.35], 'endpoint-tablet'),
    endpoint('phone-proxy', 'phone', [54, 1, -8], [0.65, 1.25, 0.28], 'endpoint-phone'),
  ];
  const ug67 = endpoint('UG67-01-proxy', 'ug67', GATEWAYS[0].position, [0.7, 1, 0.32], 'gateway-dark');
  ug67.antennas = 2;

  const rs485Trunks = [
    {
      id: 'rs485-trunk-a',
      groupId: 'A',
      uc100Id: 'UC100-A',
      start: [-24, 2.8, 14.5],
      end: [13, 2.8, 14.5],
      cabinetEnd: UC100_DEVICES.find(({ id }) => id === 'UC100-A').position,
    },
    {
      id: 'rs485-trunk-b',
      groupId: 'B',
      uc100Id: 'UC100-B',
      start: [-4.85, 0.22, 6.2],
      end: [-4.85, 0.22, -21.2],
      cabinetEnd: UC100_DEVICES.find(({ id }) => id === 'UC100-B').position,
    },
    {
      id: 'rs485-trunk-c',
      groupId: 'C',
      uc100Id: 'UC100-C',
      start: [4.85, 0.22, 6.2],
      end: [4.85, 0.22, -21.2],
      cabinetEnd: UC100_DEVICES.find(({ id }) => id === 'UC100-C').position,
    },
    {
      id: 'rs485-trunk-d',
      groupId: 'D',
      uc100Id: 'UC100-D',
      start: [-12.7, 2.8, 11.2],
      end: [-5.2, 2.8, 11.2],
      cabinetEnd: UC100_DEVICES.find(({ id }) => id === 'UC100-D').position,
    },
  ].map((trunk) => ({ ...trunk, metadata: metadata(trunk.id, 'rs485-trunk', ['HVAC-IOT-003']) }));
  const rs485Drops = TC300_DEVICES.map((device) => {
    let end;
    if (device.uc100Id === 'UC100-A') end = [device.position[0], 2.8, 14.5];
    else if (device.uc100Id === 'UC100-B') end = [-4.85, 0.22, device.position[2]];
    else if (device.uc100Id === 'UC100-C') end = [4.85, 0.22, device.position[2]];
    else end = [-12.7, 2.8, 11.2];
    return {
      id: `rs485-drop-${device.id}`,
      tc300Id: device.id,
      uc100Id: device.uc100Id,
      start: device.position,
      end,
      metadata: metadata(`rs485-drop-${device.id}`, 'rs485-drop', ['HVAC-IOT-003']),
    };
  });
  const lorawanLanes = {
    'UC100-A': { via: [18, 6.4, 8], renderEnd: [3.8, 4.1, 2] },
    'UC100-B': { via: [-24, 6.8, -5], renderEnd: [2.5, 3.8, 2] },
    'UC100-C': { via: [25, 7.2, -5], renderEnd: [3.8, 3.8, 2] },
    'UC100-D': { via: [-12, 7.6, 8], renderEnd: [3.15, 4.5, 2] },
  };
  const lorawanLinks = UC100_DEVICES.map((device) => ({
    id: `lorawan-${device.id}-UG67-01`,
    from: device.id,
    to: 'UG67-01',
    start: device.position,
    end: GATEWAYS[0].position,
    via: [lorawanLanes[device.id].via],
    renderEnd: lorawanLanes[device.id].renderEnd,
    physical: false,
    metadata: metadata(`lorawan-${device.id}-UG67-01`, 'lorawan-link', ['HVAC-IOT-003']),
  }));
  const ipPoints = [GATEWAYS[0].position, ...external.slice(0, 3).map(({ position }) => position)];

  const familyTag = { large: 'L', medium: 'M', small: 'S' };
  const architectureBillboards = [
    ...auditoriums.map((room, index) => billboard(
      `room-family-label-${index + 1}`,
      'room-family',
      `${index + 1} · ${familyTag[room.family]}`,
      [centre(room.bounds.x), room.height + 1.15, centre(room.bounds.z)],
      [5.2, 1.45],
      'labels',
      '#e11d48',
      'overview',
    )),
    billboard('foh-label-lobby-tickets', 'foh', 'LOBBY / TICKETS', [-10.5, 3.8, 19], [8.4, 1.2], 'labels', '#f59e0b', 'overview'),
    billboard('foh-label-concessions', 'foh', 'CONCESSIONS', [0, 3.7, 16], [7.2, 1.2], 'labels', '#e11d48', 'overview'),
    billboard('foh-label-kitchen', 'foh', 'KITCHEN', [-8.5, 3.7, 12.5], [5.3, 1.1], 'labels', '#94a3b8', 'overview'),
    billboard('foh-label-checkpoint', 'foh', 'CHECKPOINT', [7.5, 3.5, 12], [6.4, 1.1], 'labels', '#16a34a', 'overview'),
    billboard('rear-strip-label', 'rear-strip', 'REAR SERVICE', [0, 5.55, -20.5], [8.2, 1.25], 'labels', '#0ea5e9', 'overview'),
  ];
  const externalText = ['ROUTER / FIREWALL', 'INTERNET', 'NIAGARA', 'PC', 'TABLET', 'SMARTPHONE'];
  const technicalBillboards = [
    // The chip carries the canonical endpoint id: the first node of the chain must be nameable
    // in the model, not only on the diagram board.
    ...TC300_DEVICES.map((device) => billboard(
      `tc-label-${device.id}`,
      'tc300',
      device.id,
      [device.position[0], device.position[1] + 1.05, device.position[2]],
      [2.1, 0.58],
      'hvac',
      '#38bdf8',
      'always',
      { devicePosition: [...device.position], zoneId: device.zoneId },
    )),
    ...UC100_DEVICES.map((device, index) => {
      const anchorOffset = [
        index % 2 === 0 ? 2.8 : -2.8,
        1.25 + index * 0.18,
        index < 2 ? 1.2 : -1.2,
      ];
      return billboard(
        `uc-label-${device.id}`,
        'uc100',
        `UC-${device.id.at(-1)}`,
        [
          device.position[0] + anchorOffset[0],
          device.position[1] + anchorOffset[1],
          device.position[2] + anchorOffset[2],
        ],
        [2.5, 0.65],
        'hvac',
        '#f8fafc',
        'always',
        { anchorOffset },
      );
    }),
    billboard('gateway-label', 'ug67', 'UG67', [4.1, 4.15, 1.4], [1.2, 0.3], 'hvac', '#38bdf8'),
    ...external.map((node, index) => billboard(
      `external-label-${node.id}`,
      'external',
      externalText[index],
      [node.position[0], node.position[1] + node.size[1] / 2 + 1, node.position[2]],
      [3.7, 0.75],
      'internet',
      '#2563eb',
    )),
    ...rs485Trunks.map((trunk) => billboard(
      `bus-label-${trunk.groupId}`,
      'bus-group',
      `BUS ${trunk.groupId}`,
      [(trunk.start[0] + trunk.end[0]) / 2, Math.max(trunk.start[1], trunk.end[1]) + 1.1, (trunk.start[2] + trunk.end[2]) / 2],
      [2.8, 0.68],
      'rs485',
      '#22c55e',
    )),
    ...rs485Trunks.map((trunk, index) => billboard(
      `network-rollup-${trunk.groupId}`,
      'bus-rollup',
      SURFACE_NETWORK_ROLLUPS[index].text,
      [
        (trunk.start[0] + trunk.end[0]) / 2,
        Math.max(trunk.start[1], trunk.end[1]) + 2.0,
        (trunk.start[2] + trunk.end[2]) / 2,
      ],
      [6.2, 0.72],
      'rs485',
      '#22c55e',
      'always',
    )),
  ];

  const rearTechnical = {
    serviceCorridor: {
      id: 'rear-service-corridor',
      bounds: { x: [-29, 29], z: [-20, -18.5] },
      clearWidth: 1.5,
      metadata: metadata('rear-service-corridor', 'service-circulation'),
    },
    separatingWall: { z: [-20.2, -20], thickness: 0.2 },
    rooms: [
      technicalRoom('electrical-storage-janitor', [-29, -20.5]),
      technicalRoom('left-control', [-20, -12]),
      technicalRoom('hvac-control-telecom', [3.8, 11.5]),
      technicalRoom('right-control', [12, 20]),
    ],
  };
  const facade = {
    marquee: {
      id: 'facade-red-marquee',
      position: [0, 4.25, 22.7],
      size: [34, 0.55, 2.2],
      materialKey: 'brand-red',
      metadata: metadata('facade-red-marquee', 'facade-marquee', REQUIREMENT_FACADE),
    },
    identity: {
      id: 'cinemex-wordmark-blockout',
      text: 'Cinemex',
      kind: 'seven-segment-wordmark-proxy',
      position: [0, 5.18, 23.05],
      size: [15, 0.95, 0.24],
      metadata: metadata('cinemex-wordmark-blockout', 'facade-identity', REQUIREMENT_FACADE),
    },
    entrances: [-4.8, -2.4, 0, 2.4, 4.8].map((x, index) => ({
      id: `entrance-${index + 1}`,
      position: [x, 1.35, 22.35],
      size: [1.8, 2.7, 0.16],
      accessibleWidth: index === 2 ? 1.4 : 0.9,
      metadata: metadata(`entrance-${index + 1}`, 'glazed-entrance', REQUIREMENT_FACADE, {
        accessible: index === 2,
      }),
    })),
    // Generated abstract poster bank, inboard of the east pier: four panels, four artworks, two
    // frames. It sits clear of the entrance bank and fully inside the facade preset's frame.
    posterBank: {
      id: 'facade-digital-poster-bank',
      backing: {
        id: 'facade-poster-bank-backing',
        position: [9.35, 1.8, 22.57],
        size: [7, 2.4, 0.06],
      },
      panels: POSTER_VARIANTS.map((variant, index) => ({
        id: `facade-poster-panel-${index + 1}`,
        variant,
        position: [6.95 + index * 1.6, 1.8, 22.63],
        size: [1.5, 2],
        metadata: metadata(`facade-poster-panel-${index + 1}`, 'facade-poster-panel', REQUIREMENT_FACADE),
      })),
    },
  };
  const concessionCounter = frontOfHouse.find(({ kind }) => kind === 'concession-counter');
  const counterTop = concessionCounter.position[1] + concessionCounter.size[1] / 2;
  const counterBack = concessionCounter.position[2] - concessionCounter.size[2] / 2;
  // Menu boards belong to the counter: a service bulkhead behind the line carries plausible boards.
  const serviceBackWall = {
    id: 'concession-service-back-wall',
    position: [0, counterTop + 1.1, 15],
    size: [22, 2, 0.2],
    materialKey: 'surface-dark',
    metadata: metadata('concession-service-back-wall', 'concession-back-wall', REQUIREMENT_FACADE),
  };
  const menuBoards = [-6, 0, 6].map((x, index) => ({
    id: `concession-menu-${index + 1}`,
    style: index,
    position: [x, counterTop + 0.8, serviceBackWall.position[2] + serviceBackWall.size[2] / 2 + 0.03],
    size: [1.7, 1.3],
    metadata: metadata(`concession-menu-${index + 1}`, 'concession-menu-board', REQUIREMENT_FACADE),
  }));
  // The dominant concession bar has to sell something: warmers and chilled displays stand ON the
  // counter deck, derived from the accepted counter proxy so nothing floats or clips.
  const counterDeckZ = concessionCounter.position[2] - 0.1;
  const popcornUnits = [-4.6, 4.6].map((x, index) => ({
    id: `concession-popcorn-${index + 1}`,
    kind: 'popcorn-display-cue',
    deckZ: counterDeckZ,
    body: { position: [x, counterTop + 0.475, counterDeckZ], size: [1.5, 0.95, 0.75] },
    glass: { position: [x, counterTop + 0.52, counterDeckZ + 0.395], size: [1.2, 0.55, 0.04] },
    kettle: { position: [x, counterTop + 1, counterDeckZ], size: [1.5, 0.1, 0.75] },
  }));
  const refrigerationUnits = [-10, 10].map((x, index) => ({
    id: `concession-cooler-${index + 1}`,
    kind: 'refrigeration-display-cue',
    deckZ: counterDeckZ,
    body: { position: [x, counterTop + 0.75, counterDeckZ], size: [1.6, 1.5, 0.8] },
    glass: { position: [x, counterTop + 0.75, counterDeckZ + 0.42], size: [1.3, 1.2, 0.04] },
    shelves: [-0.4, 0, 0.4].map((offset, shelfIndex) => ({
      id: `concession-cooler-${index + 1}-shelf-${shelfIndex + 1}`,
      position: [x, counterTop + 0.75 + offset, counterDeckZ + 0.4],
      size: [1.2, 0.1, 0.03],
      variant: shelfIndex,
    })),
  }));
  const frontOfHouseSurfaces = { serviceBackWall, menuBoards, popcornUnits, refrigerationUnits };

  // Corridor evacuation and wayfinding: floor arrows point out to the public band, signs sit on the walls.
  const wayfinding = {
    evacuationArrows: [8, 3, -2, -7, -12].map((z, index) => ({
      id: `corridor-evacuation-arrow-${index + 1}`,
      position: [0, 0.055, z],
      direction: [0, 0, 1],
      width: 1.1,
      metadata: metadata(`corridor-evacuation-arrow-${index + 1}`, 'evacuation-arrow', REQUIREMENT_ARCHITECTURE),
    })),
    corridorExitSigns: ['west', 'east'].flatMap((side) => (
      [9.5, 2.5, -5.5, -12].map((z, index) => ({
        id: `corridor-exit-sign-${side}-${index + 1}`,
        side,
        tile: 'exit',
        position: [side === 'west' ? -3.54 : 3.54, 2.6, z],
        size: [1.05, 0.42],
        rotationY: side === 'west' ? Math.PI / 2 : -Math.PI / 2,
        metadata: metadata(`corridor-exit-sign-${side}-${index + 1}`, 'corridor-exit-sign', REQUIREMENT_ARCHITECTURE),
      }))
    )),
  };

  // Auditorium side walls read as absorptive charcoal instead of drywall white.
  const auditoriumAcousticLinings = auditoriums.flatMap((room) => {
    const liningHeight = room.height - 0.4;
    const sideWalls = [room.bounds.z[0] + 0.045, room.bounds.z[1] - 0.045].map((z, index) => ({
      id: `${room.id}-acoustic-lining-side-${index + 1}`,
      auditoriumId: room.id,
      materialKey: 'auditorium-acoustic-wall',
      position: [centre(room.bounds.x), liningHeight / 2, z],
      size: [extent(room.bounds.x) - 0.2, liningHeight, 0.09],
    }));
    const west = room.bounds.x[1] < 0;
    return [
      ...sideWalls,
      {
        id: `${room.id}-acoustic-lining-end`,
        auditoriumId: room.id,
        materialKey: 'auditorium-acoustic-wall',
        position: [
          west ? room.bounds.x[0] + 0.045 : room.bounds.x[1] - 0.045,
          liningHeight / 2,
          centre(room.bounds.z),
        ],
        size: [0.09, liningHeight, extent(room.bounds.z) - 0.2],
      },
    ];
  }).map((lining) => ({
    ...lining,
    metadata: surfaceMetadata(lining.id, 'acoustic-panel-rhythm'),
  }));

  const rs485RoutePoints = {
    'UC100-A': [[8, 1.55, 11], [8, 2.8, 11], [8, 2.8, 14.5], [-24, 2.8, 14.5]],
    'UC100-B': [[-16, 1.55, -21.2], [-16, 0.8, -21.2], [-16, 0.8, -20.1], [-3.15, 0.8, -20.1], [-3.15, 0.35, -20.1], [-3.15, 0.35, 6.2]],
    'UC100-C': [[16, 1.55, -21.2], [16, 0.8, -21.2], [16, 0.8, -20.1], [3.15, 0.8, -20.1], [3.15, 0.35, -20.1], [3.15, 0.35, 6.2]],
    'UC100-D': [[-5.2, 1.55, 13.2], [-5.2, 2.8, 13.2], [-5.2, 2.8, 11.2], [-12.7, 2.8, 11.2]],
  };
  const rs485Routes = UC100_DEVICES.map((device) => ({
    id: `${device.id}-contained-route`,
    terminalOwner: device.id,
    points: rs485RoutePoints[device.id],
    terminalPosition: device.position,
    trayBacked: true,
    junctionContact: true,
    contactCoherent: true,
    metadata: structuralMetadata(`${device.id}-contained-route`, 'contained-rs485-trunk', ['HVAC-IOT-003']),
  }));
  const tc300Drops = TC300_DEVICES.map((device) => {
    let junction;
    let intermediate;
    if (device.uc100Id === 'UC100-A') {
      junction = [device.position[0], 2.8, 14.5];
      intermediate = [device.position[0], 2.8, device.position[2]];
    } else if (device.uc100Id === 'UC100-B') {
      junction = [-3.15, 0.35, device.position[2]];
      intermediate = [-3.15, 1.8, device.position[2]];
    } else if (device.uc100Id === 'UC100-C') {
      junction = [3.15, 0.35, device.position[2]];
      intermediate = [3.15, 1.8, device.position[2]];
    } else {
      junction = [-12.7, 2.8, 11.2];
      intermediate = [-12.7, 2.8, device.position[2]];
    }
    const points = [
      { position: junction, kind: 'junction' },
      { position: intermediate, kind: 'tray' },
    ];
    if (device.uc100Id === 'UC100-B' || device.uc100Id === 'UC100-C') {
      points.push({
        position: [device.uc100Id === 'UC100-B' ? -3.72 : 3.72, 1.8, device.position[2]],
        kind: 'wall-sleeve',
      });
      points.push({ position: [device.position[0], 1.8, device.position[2]], kind: 'room-tray' });
    }
    points.push({ position: device.position, kind: 'terminal', owner: device.id });
    return {
      id: `${device.id}-contained-drop`,
      terminalOwner: device.id,
      uc100Owner: device.uc100Id,
      junctionId: `junction-${device.id}`,
      points,
      terminalPosition: device.position,
      trayBacked: true,
      junctionContact: true,
      contactCoherent: true,
      metadata: structuralMetadata(`${device.id}-contained-drop`, 'contained-rs485-drop', ['HVAC-IOT-003']),
    };
  });
  const auditoriumWallCrossings = TC300_DEVICES
    .filter(({ uc100Id }) => uc100Id === 'UC100-B' || uc100Id === 'UC100-C')
    .map((device) => ({
      id: `sleeve-${device.id}`,
      deviceId: device.id,
      position: [device.uc100Id === 'UC100-B' ? -3.72 : 3.72, 1.8, device.position[2]],
      size: [0.4, 0.28, 0.4],
      kind: 'sleeve',
      visible: true,
      metadata: structuralMetadata(`sleeve-${device.id}`, 'rs485-wall-sleeve', ['HVAC-IOT-003']),
    }));
  const technicalWallCrossings = ['UC100-B', 'UC100-C'].map((deviceId) => ({
    id: `sleeve-${deviceId}-rear-separation`,
    deviceId,
    position: [deviceId === 'UC100-B' ? -16 : 16, 0.8, -20.1],
    size: [0.4, 0.4, 0.32],
    kind: 'sleeve',
    visible: true,
    metadata: structuralMetadata(`sleeve-${deviceId}-rear-separation`, 'rs485-wall-sleeve', ['HVAC-IOT-003']),
  }));
  const gatewayEthernetPort = [3.15, 3.46, 2.0505];

  const structural = {
    pass: 'structural',
    sections: {
      foundationSlabThickness: 0.25,
      roofPanelThickness: 0.22,
      exteriorWallThickness: 0.4,
      interiorWallThickness: 0.25,
    },
    auditoriumShells: auditoriums.map((room) => ({
      id: `${room.id}-structural-shell`,
      auditoriumId: room.id,
      family: room.family,
      bounds: room.bounds,
      wallHeight: room.height,
      roofElevation: room.height,
      roofPanelThickness: 0.22,
      perimeterWallThickness: 0.4,
      perimeterClosed: true,
      visibleEnvelope: STRUCTURAL_FAMILY_PROFILES[room.family],
      familyMaster: {
        tierCount: STRUCTURAL_FAMILY_PROFILES[room.family].tiers,
        crossAisle: true,
        sideAisles: 2,
        wheelchairVoid: true,
        screenWall: true,
        projectionNiche: true,
        entryOpening: true,
        emergencyOpening: true,
      },
      metadata: structuralMetadata(`${room.id}-structural-shell`, 'auditorium-structural-shell'),
    })),
    portalAssemblies: portals.map((portal) => ({
      id: `${portal.id}-assembly`,
      portalId: portal.id,
      side: portal.side,
      position: portal.position,
      opening: {
        trueOpening: true,
        clearWidth: portal.width,
        clearHeight: portal.height,
        opensTo: portal.auditoriumId,
      },
      frame: { jambThickness: 0.14, headThickness: 0.16, depth: 0.72 },
      door: { type: 'acoustic-double-leaf', leafCount: 2, thickness: 0.1 },
      threshold: { depth: 0.72, height: 0.08 },
      acousticReturnDepth: 0.72,
      metadata: structuralMetadata(`${portal.id}-assembly`, 'acoustic-portal-assembly'),
    })),
    emergencyDoors: auditoriums.map((room) => {
      const west = room.bounds.x[1] < 0;
      const z = Math.min(...room.bounds.z) + 1.05;
      return {
        id: `${room.id}-emergency-door`,
        auditoriumId: room.id,
        side: west ? 'west' : 'east',
        position: [west ? -29.62 : 29.62, 1.1, z],
        opening: {
          trueOpening: true,
          clearWidth: 1.1,
          clearHeight: 2.2,
          opensTo: 'exterior',
        },
        frame: { jambThickness: 0.12, headThickness: 0.14, depth: 0.5 },
        door: { type: 'acoustic-emergency', leafCount: 1, thickness: 0.1 },
        threshold: { depth: 0.5, height: 0.08 },
        metadata: structuralMetadata(`${room.id}-emergency-door`, 'auditorium-emergency-door'),
      };
    }),
    facade: {
      entranceAssemblies: facade.entrances.map((entrance, index) => ({
        id: `${entrance.id}-structural`,
        position: entrance.position,
        opening: {
          trueOpening: true,
          clearWidth: entrance.accessibleWidth,
          clearHeight: 2.4,
          accessible: index === 2,
        },
        frame: { jambThickness: 0.1, headThickness: 0.12, depth: 0.2 },
        glazing: { safetyGlass: true, thickness: 0.012 },
        metadata: structuralMetadata(`${entrance.id}-structural`, 'framed-glazed-entry', REQUIREMENT_FACADE),
      })),
      accessibleRoute: {
        id: 'accessible-forecourt-route',
        centreX: 0,
        width: 1.4,
        position: [0, 0.035, 24.55],
        size: [1.4, 0.07, 4.4],
        thresholdPosition: [0, 0.04, 22.35],
        metadata: structuralMetadata('accessible-forecourt-route', 'accessible-route', REQUIREMENT_FACADE),
      },
      marqueeSupports: [-14, -8.4, -2.8, 2.8, 8.4, 14].map((x, index) => ({
        id: `marquee-support-${index + 1}`,
        position: [x, 4.04, 22.3],
        size: [0.18, 0.72, 1.0],
        attached: true,
        facadeContact: true,
        canopyContact: true,
        metadata: structuralMetadata(`marquee-support-${index + 1}`, 'marquee-support', REQUIREMENT_FACADE),
      })),
      signSupports: [-5.4, -1.8, 1.8, 5.4].map((x, index) => ({
        id: `sign-support-${index + 1}`,
        position: [x, 4.62, 23.02],
        size: [0.12, 0.24, 0.24],
        attached: true,
        canopyContact: true,
        signContact: true,
        metadata: structuralMetadata(`sign-support-${index + 1}`, 'facade-sign-support', REQUIREMENT_FACADE),
      })),
    },
    rearTechnical: {
      rooms: rearTechnical.rooms.map((room) => ({
        id: `${room.id}-structure`,
        roomId: room.id,
        bounds: room.bounds,
        enclosed: true,
        wallThickness: 0.2,
        height: 4.5,
        metadata: structuralMetadata(`${room.id}-structure`, 'technical-room-structure'),
      })),
      serviceDoors: rearTechnical.rooms.map((room) => ({
        id: `${room.id}-service-door`,
        roomId: room.id,
        position: [centre(room.bounds.x), 1.05, -20.08],
        opening: {
          trueOpening: true,
          clearWidth: 1.05,
          clearHeight: 2.1,
          opensTo: rearTechnical.serviceCorridor.id,
        },
        frame: { jambThickness: 0.1, headThickness: 0.12, depth: 0.45 },
        door: { type: 'technical-service', leafCount: 1, thickness: 0.08 },
        threshold: { depth: 0.45, height: 0.07 },
        metadata: structuralMetadata(`${room.id}-service-door`, 'technical-service-door'),
      })),
    },
    kitchenExtraction: {
      hoodBody: {
        id: 'kitchen-extract-hood',
        position: [-8.75, 2.35, 12.25],
        size: [3.6, 0.6, 1.6],
        metadata: structuralMetadata('kitchen-extract-hood', 'kitchen-hood'),
      },
      hoodOutlet: {
        id: 'kitchen-hood-outlet',
        position: [-8.75, 2.7, 12.25],
        size: [0.5, 0.2, 0.5],
        metadata: structuralMetadata('kitchen-hood-outlet', 'hood-outlet'),
      },
      duct: {
        id: 'kitchen-extract-duct-root',
        socketPosition: [-8.75, 2.7, 12.25],
        topPosition: [-8.75, 4.48, 12.25],
        size: [0.5, 1.78, 0.5],
        vertical: true,
        contactOverlap: true,
        metadata: structuralMetadata('kitchen-extract-duct-root', 'vertical-extract-duct'),
      },
      routeStubs: 0,
    },
    roofService: {
      packagedUnits: createPackagedUnitPlan(auditoriums),
      routes: [
        ['supply', -1.2],
        ['return', 1.2],
      ].map(([medium, x]) => {
        const plenumId = `roof-${medium}-plenum`;
        const socketPosition = [x, 8.15, -12];
        return {
          id: `roof-${medium}-route`,
          medium,
          rootOverlap: true,
          plenum: {
            id: plenumId,
            position: [x, 7.82, -12],
            socketPosition,
            size: [0.9, 0.9, 1.1],
            metadata: structuralMetadata(plenumId, 'roof-service-plenum'),
          },
          main: {
            id: `roof-${medium}-main`,
            owner: plenumId,
            position: [x, 8.36, -9.25],
            size: [0.9, 0.72, 6.1],
            metadata: structuralMetadata(`roof-${medium}-main`, 'roof-service-main'),
          },
          sleeve: {
            id: `roof-${medium}-owned-sleeve`,
            owner: plenumId,
            position: socketPosition,
            size: [1.15, 0.24, 1.15],
            metadata: structuralMetadata(`roof-${medium}-owned-sleeve`, 'roof-service-sleeve'),
          },
        };
      }),
    },
    devices: {
      tc300: TC300_DEVICES.map((device) => ({
        id: device.id,
        kind: 'tc300',
        position: device.position,
        size: [0.1, 0.1136, 0.026],
        materialKey: 'tc-black',
        metadata: structuralMetadata(device.id, 'tc300-device', ['HVAC-IOT-001']),
      })),
      uc100: UC100_DEVICES.map((device) => ({
        id: device.id,
        kind: 'uc100',
        position: device.position,
        size: [0.07, 0.045, 0.013],
        materialKey: 'uc-white',
        metadata: structuralMetadata(device.id, 'uc100-device', ['HVAC-IOT-002']),
      })),
      ug67: [{
        id: 'UG67-01',
        kind: 'ug67',
        position: GATEWAYS[0].position,
        size: [0.164, 0.24, 0.0909],
        antennaLength: 0.6,
        materialKey: 'gateway-dark',
        metadata: structuralMetadata('UG67-01', 'ug67-device', ['HVAC-IOT-003']),
      }],
    },
    containment: {
      uc100BusRoots: rs485Trunks.map((trunk) => {
        const device = UC100_DEVICES.find(({ id }) => id === trunk.uc100Id);
        return {
          id: `${trunk.uc100Id}-rs485-root`,
          socketOwner: trunk.uc100Id,
          socketPosition: device.position,
          routeJoin: trunk.end,
          medium: 'rs485',
          contactCoherent: true,
          metadata: structuralMetadata(`${trunk.uc100Id}-rs485-root`, 'owned-rs485-socket', ['HVAC-IOT-003']),
        };
      }),
      ug67AntennaRoots: [-0.055, 0.055].map((offset, index) => ({
        id: `UG67-01-antenna-root-${index + 1}`,
        socketOwner: 'UG67-01',
        socketPosition: [
          GATEWAYS[0].position[0] + offset,
          GATEWAYS[0].position[1] + 0.12,
          GATEWAYS[0].position[2],
        ],
        vertical: true,
        contactCoherent: true,
        seatedOnBody: true,
        metadata: structuralMetadata(`UG67-01-antenna-root-${index + 1}`, 'owned-antenna-socket', ['HVAC-IOT-003']),
      })),
      rs485Routes,
      tc300Drops,
      wallCrossings: [...auditoriumWallCrossings, ...technicalWallCrossings],
      ug67EthernetPort: {
        id: 'UG67-01-ethernet-port',
        owner: 'UG67-01',
        position: gatewayEthernetPort,
        metadata: structuralMetadata('UG67-01-ethernet-port', 'ethernet-port', ['HVAC-IOT-003']),
      },
      ug67EthernetRoute: {
        id: 'UG67-01-contained-ethernet',
        points: [gatewayEthernetPort, [4.2, 3.46, 2.0505], [4.2, 1.2, 2.0505], [4.2, 1.2, 0], [36, 1.2, 0]],
        contactCoherent: true,
        metadata: structuralMetadata('UG67-01-contained-ethernet', 'contained-ethernet-route', ['HVAC-IOT-003']),
      },
      futureSleeves: [
        ['kitchen-extract-sleeve', [-8.75, 4.48, 12.25], 'kitchen-shell'],
        ['roof-supply-sleeve', [-1.2, 8.15, -12], 'auditorium-roof'],
        ['roof-return-sleeve', [1.2, 8.15, -12], 'auditorium-roof'],
      ].map(([id, position, owner]) => ({
        id,
        position,
        size: [0.5, 0.18, 0.5],
        owner,
        reservedForLaterAsset: true,
        metadata: structuralMetadata(id, 'containment-sleeve', ['CIN-ARCH-001']),
      })),
    },
    humanReferences: [
      ['human-forecourt', [-3, 0, 25.1], 1.72],
      ['human-lobby', [8, 0, 19], 1.7],
      ['human-corridor', [0.8, 0, -3], 1.74],
      ['human-kitchen', [-6.2, 0, 13.4], 1.68],
      ['human-technical', [24, 0, -19.2], 1.75],
    ].map(([id, position, height]) => ({
      id,
      position,
      height,
      lowPoly: true,
      metadata: structuralMetadata(id, 'human-scale-reference'),
    })),
  };

  return deepFreeze({
    assetId: ARCHITECTURE_ASSET_ID,
    surface: createSurfaceDetailPlan(),
    units: 'metres',
    footprint: { x: [-30, 30], z: [-22.5, 22.5] },
    bands: [
      { id: 'front-public', bounds: { x: [-30, 30], z: [10.5, 22.5] }, height: 4.5 },
      { id: 'auditorium-spine', bounds: { x: [-30, 30], z: [-18.5, 10.5] }, height: 8.2 },
      { id: 'rear-service', bounds: { x: [-30, 30], z: [-22.5, -18.5] }, height: 4.5 },
    ],
    centralCorridor: {
      id: 'central-corridor',
      bounds: { x: [-3.5, 3.5], z: [-18.5, 10.5] },
      clearWidth: 7,
      metadata: metadata('central-corridor', 'circulation-spine'),
    },
    auditoriums,
    auditoriumOuterWalls: auditoriums.map((room) => ({
      id: `${room.id}-outer-wall`,
      auditoriumId: room.id,
      side: room.bounds.x[1] < 0 ? 'west' : 'east',
      height: room.height,
      bounds: room.bounds,
      metadata: metadata(`${room.id}-outer-wall`, 'auditorium-perimeter-wall'),
    })),
    portals,
    rearTechnical,
    facade,
    frontOfHouseSurfaces,
    wayfinding,
    auditoriumAcousticLinings,
    structural,
    blockoutProxies: {
      auditoriums: auditoriums.map((room) => {
        const profile = AUDITORIUM_FAMILY_PROFILES[room.family];
        return {
          id: `${room.id}-family-proxy`,
          auditoriumId: room.id,
          family: room.family,
          bounds: room.bounds,
          screenSlab: true,
          ...profile,
          aisleGapWidth: 1.2,
          wheelchairBayWidth: 3.6,
          aisleGap: { continuous: true, width: 1.2 },
          wheelchairBay: { clear: true, width: 3.6, depth: 2.4, clearTierCount: 2 },
          metadata: metadata(`${room.id}-family-proxy`, 'auditorium-family-proxy', ['CIN-ARCH-003'], { temporaryProxy: true }),
        };
      }),
      frontOfHouse,
    },
    topologyProxies: {
      tc300: TC300_DEVICES.map((device) => endpoint(`${device.id}-proxy`, 'tc300', device.position, [0.34, 0.5, 0.2], 'tc-black')),
      uc100: UC100_DEVICES.map((device) => endpoint(`${device.id}-proxy`, 'uc100', device.position, [0.75, 1, 0.28], 'uc-white')),
      ug67,
      external,
      rs485Trunks,
      rs485Drops,
      lorawanLinks,
      ipChain: {
        id: 'conceptual-ip-chain',
        points: ipPoints,
        clientBranches: external.slice(3).map(({ position }) => ({ start: external[2].position, end: position })),
        metadata: metadata('conceptual-ip-chain', 'ethernet-ip-chain', ['HVAC-IOT-003', 'HVAC-IOT-004']),
      },
    },
    billboards: {
      architecture: architectureBillboards,
      technical: technicalBillboards,
    },
  });
}

function centre(bounds) {
  return (bounds[0] + bounds[1]) / 2;
}

function extent(bounds) {
  return bounds[1] - bounds[0];
}

function createFlatMaterials(THREE, materialRegistry) {
  const localOwned = [];
  const custom = (color, options = {}) => ({
    type: 'standard',
    color,
    roughness: 0.84,
    metalness: 0,
    ...options,
  });
  const zone = (color) => custom(color, {
    transparent: true,
    opacity: SURFACE_ENGINEERING_CONTRAST.zoneOpacity,
    depthWrite: false,
  });
  /**
   * A house-lighting emission channel. Its colour and its intensity both come from the lighting
   * pass's cinema hierarchy, so the facade/menus > commercial > corridor > auditorium ladder can
   * never be broken by a stray literal, and `light_state=off` can switch exactly this set.
   */
  const emissionChannel = (key, options = {}) => {
    const definition = LIGHTING_EMISSION_CHANNELS[key];
    return custom(definition.color, {
      emissive: definition.emissive,
      emissiveIntensity: resolveEmissiveIntensity(definition, 'on'),
      ...options,
    });
  };
  const definitions = {
    'floor-charcoal': 'exteriorConcrete',
    'exterior-concrete': 'exteriorConcrete',
    'lobby-gloss-tile': 'lobbyGlossTile',
    'auditorium-carpet': 'auditoriumCarpet',
    'site-gray': 'exteriorConcrete',
    'brand-red': 'cinemaRedPainted',
    'identity-white': 'shellWarmWhite',
    'glass-blue': 'facadeGlass',
    'facade-frame-charcoal': 'shellCharcoal',
    'structural-steel': 'galvanizedDuct',
    'service-door': 'shellCharcoal',
    'containment-orange': custom(0xf59e0b, { roughness: 0.48 }),
    'accessible-yellow': emissionChannel('accessible-yellow', { roughness: 0.46 }),
    'hood-steel': 'kitchenStainless',
    'human-neutral': custom(0xe2e8f0),
    'human-dark': 'shellCharcoal',
    'portal-dark': 'auditoriumAcousticFabric',
    'auditorium-acoustic-wall': 'auditoriumAcousticFabric',
    'portal-red': 'cinemaRedPainted',
    'public-roof': 'exteriorConcrete',
    /**
     * P6 correction P3: as charcoal, the eight per-room plates read from the exterior as two merged
     * dark slabs — the blockout's 2/4/2 articulation was gone. The plates are now the same light
     * concrete as the public/rear roofs, so the family HEIGHT STEPS carry shadow lines again and
     * the existing charcoal seams/fascia outline each plate. Palette unchanged: `exteriorConcrete`
     * is a gated entry, reused.
     */
    'large-roof': 'exteriorConcrete',
    'medium-roof': 'exteriorConcrete',
    'small-roof': 'exteriorConcrete',
    'rear-roof': 'exteriorConcrete',
    'rear-strip-blue': 'exteriorConcrete',
    // Zone volumes are wayfinding hints, not a wash over the network media they sit on top of.
    'zone-public': zone(0xf59e0b),
    'zone-corridor': zone(0x8b5cf6),
    'zone-large': zone(0xdc2626),
    'zone-medium': zone(0xf43f5e),
    'zone-small': zone(0xfb7185),
    'zone-service': zone(0x0ea5e9),
    'foh-lobby': 'lobbyGlossTile',
    'foh-ticket': 'offlineGray',
    'foh-waiting': 'offlineGray',
    'foh-concession': 'offlineGray',
    'foh-kitchen': 'offlineGray',
    'foh-checkpoint': 'offlineGray',
    // The screen is the auditorium's dominant light source, not a white box lit from outside.
    'screen-emissive': emissionChannel('screen-emissive', { roughness: 0.62 }),
    'seating-burgundy': 'seatBurgundyFabric',
    'aisle-dark': 'auditoriumCarpet',
    'wheelchair-blue': emissionChannel('wheelchair-blue', { roughness: 0.42 }),
    'tc-black': 'tc300BlackGlass',
    'tc-blue': 'tc300BlueRing',
    'uc-white': 'uc100WhitePcabs',
    'gateway-dark': 'ug67DarkMountingShell',
    'endpoint-router': custom(0x0ea5e9, { roughness: 0.42, emissive: 0x075985, emissiveIntensity: 0.45 }),
    'endpoint-cloud': custom(0x67e8f9, { roughness: 0.4, emissive: 0x0e7490, emissiveIntensity: 0.45 }),
    'endpoint-server': custom(0x8b5cf6, { roughness: 0.46, emissive: 0x4c1d95, emissiveIntensity: 0.45 }),
    'endpoint-pc': custom(0xf59e0b, { roughness: 0.48, emissive: 0x92400e, emissiveIntensity: 0.4 }),
    'endpoint-tablet': custom(0x22c55e, { roughness: 0.48, emissive: 0x14532d, emissiveIntensity: 0.4 }),
    'endpoint-phone': custom(0xf97316, { roughness: 0.48, emissive: 0x9a3412, emissiveIntensity: 0.4 }),
    'rs485-green': 'rs485Green',
    // Two distinct blue media classes: dashed cyan RF versus a continuous, deeper Ethernet tube.
    'lorawan-blue': 'lorawanBlue',
    'ethernet-blue': 'ethernetBlue',
    'shell-gray': 'shellWarmWhite',
    'surface-dark': 'shellCharcoal',
    'surface-metal': 'galvanizedDuct',
    'surface-white': 'shellWarmWhite',
    'surface-carpet': custom(0x5b2230, { roughness: 0.92 }),
    'surface-marking': emissionChannel('surface-marking', { roughness: 0.5 }),
    'surface-concrete-a': custom(0xc9ced2, { roughness: 0.9 }),
    'surface-concrete-b': custom(0xe0e2e1, { roughness: 0.82 }),
    'surface-seal': custom(0x8f2432, { roughness: 0.72 }),
    'surface-pos': emissionChannel('surface-pos', { roughness: 0.34 }),
    'surface-pos-screen': emissionChannel('surface-pos-screen', { roughness: 0.3 }),
    'surface-snack-graphic': emissionChannel('surface-snack-graphic', { roughness: 0.42 }),
    'surface-popcorn': emissionChannel('surface-popcorn', { roughness: 0.38 }),
    'surface-cooler-glass': emissionChannel('surface-cooler-glass', { roughness: 0.16 }),
    'surface-exit-green': emissionChannel('surface-exit-green', { roughness: 0.5 }),
    // The CINEMEX word sign is the brightest thing on the site: it is the top rung of the cinema
    // hierarchy and the one channel that must obviously go dark at `light_state=off`.
    'facade-sign-emissive': emissionChannel('facade-sign-emissive', { roughness: 0.4 }),
    /**
     * The red canopy, promoted from plain paint to a real emission channel. The whole point of the
     * facade lights-on/off pair is that the marquee visibly goes out, and as `brand-red` it could
     * not: a lit red slab and an unlit red slab are the same slab. Its lit value is now carried by
     * emission over a deep unlit canopy red, so the palette identity survives and the channel is
     * real. Its low roughness lets the three forecourt fixtures return VARIED specular across its
     * 34 m instead of the "one specular edge strip" the grazing review reported.
     */
    'marquee-canopy': emissionChannel('marquee-canopy', {
      type: 'physical',
      roughness: 0.3,
      metalness: 0.02,
      clearcoat: 0.52,
      clearcoatRoughness: 0.24,
    }),
    // The house fixtures the DesignSpec `lighting_notes` name, one material per family.
    'marquee-downlight': emissionChannel('marquee-downlight', { roughness: 0.36 }),
    'lobby-ceiling-panel': emissionChannel('lobby-ceiling-panel', { roughness: 0.42 }),
    'corridor-ceiling-strip': emissionChannel('corridor-ceiling-strip', { roughness: 0.44 }),
    'aisle-step-led': emissionChannel('aisle-step-led', { roughness: 0.4 }),
    /**
     * The soffit the emissive panels are recessed INTO. Review defect 7: "the ceiling plane itself
     * is pure black between the emissive panels, so the panels read as slabs floating in a void."
     * At 0x1b1e25 it had almost no albedo for the room's floor bounce to return; it is now a
     * neutral mid-dark, and the lobby fill's `ground` term (the lit gloss tile throwing light back
     * up) lifts it to a real lit-ceiling value. Architectural state only: engineering still sees
     * through to the RS-485 trunks in the ceiling containment.
     */
    'interior-ceiling': custom(LIGHTING_INTERIOR_CEILING_COLOR, { roughness: 0.9 }),
    'roof-seam-charcoal': 'shellCharcoal',
    // Packaged rooftop units reuse the gated painted-metal device pair — light cabinet, dark
    // curb/trim — so the roofscape and the UG67 read as one equipment family. No palette entry
    // is added; both canonical materials already exist.
    'rtu-cabinet': 'ug67WhitePcAluminum',
    'rtu-dark': 'ug67DarkMountingShell',
    'surface-service': custom(0x64748b, { roughness: 0.6, metalness: 0.12 }),
    'direction-amber': custom(0xffd43b, {
      roughness: 0.34,
      emissive: 0xb45309,
      emissiveIntensity: SURFACE_DIRECTION_MARKER.emissiveIntensity,
      depthTest: SURFACE_DIRECTION_MARKER.depthTest,
      depthWrite: SURFACE_DIRECTION_MARKER.depthWrite,
    }),
  };

  const byKey = Object.fromEntries(Object.entries(definitions).map(([key, source]) => {
    if (materialRegistry?.getMaterial) {
      return [key, typeof source === 'string'
        ? materialRegistry.getMaterial(source)
        : materialRegistry.getMaterial('architecture:' + key, source)];
    }
    const spec = typeof source === 'string'
      ? { type: 'standard', color: 0xc9cdd4, roughness: 0.72, metalness: 0 }
      : source;
    const { type, ...parameters } = spec;
    const MaterialClass = type === 'physical' && THREE.MeshPhysicalMaterial
      ? THREE.MeshPhysicalMaterial
      : THREE.MeshStandardMaterial;
    const material = new MaterialClass(parameters);
    localOwned.push(material);
    return [key, material];
  }));

  /**
   * A surface inside the building must not reflect the exterior sun at full strength. Since three.js
   * cannot mask a light per object, each (material, zone) pair gets its own variant carrying the
   * zone's dim in its shader. The exterior zone always reuses the canonical material, so the shell,
   * the facade, the site, the devices and the network media are untouched by all of this.
   */
  const variantsByZone = new Map();
  const variantsByKey = new Map();
  const zoneLitMaterials = [];

  function resolveZoneMaterial(key, zone) {
    const base = byKey[key];
    if (!base || !zoneNeedsVariant(zone)) return base;
    const variantKey = `${key}@${zone}`;
    if (variantsByZone.has(variantKey)) return variantsByZone.get(variantKey);
    const variant = typeof base.clone === 'function'
      ? base.clone()
      : Object.assign(Object.create(Object.getPrototypeOf(base)), base);
    variant.name = `${base.name ?? `cinemex-architecture:${key}`}@${zone}`;
    applyZoneLighting(variant, zone);
    variantsByZone.set(variantKey, variant);
    if (!variantsByKey.has(key)) variantsByKey.set(key, []);
    variantsByKey.get(key).push(variant);
    zoneLitMaterials.push(variant);
    localOwned.push(variant);
    return variant;
  }

  /** Every material instance that carries a key — the canonical one plus each zone variant. */
  function materialsForKey(key) {
    return [byKey[key], ...(variantsByKey.get(key) ?? [])].filter(Boolean);
  }

  return {
    byKey, owned: localOwned, resolveZoneMaterial, materialsForKey, zoneLitMaterials,
  };
}

function digitSegments(digit) {
  const segmentMap = {
    1: ['br', 'tr'],
    2: ['top', 'tr', 'mid', 'bl', 'bottom'],
    3: ['top', 'tr', 'mid', 'br', 'bottom'],
    4: ['tl', 'mid', 'tr', 'br'],
    5: ['top', 'tl', 'mid', 'br', 'bottom'],
    6: ['top', 'tl', 'mid', 'bl', 'br', 'bottom'],
    7: ['top', 'tr', 'br'],
    8: ['top', 'tl', 'tr', 'mid', 'bl', 'br', 'bottom'],
  };
  return segmentMap[digit];
}

/**
 * Builds only the first HEAVY asset through SURFACE. Repeated section pieces share one
 * BoxGeometry and are grouped into one InstancedMesh per semantic layer/color pair.
 */
export function createArchitectureStructure({ THREE, groups, materialRegistry } = {}) {
  if (!THREE?.BoxGeometry || !THREE?.ConeGeometry || !THREE?.InstancedMesh || !groups) {
    throw new TypeError('Three.js and semantic groups are required for the architecture structure.');
  }

  const plan = createArchitecturePlan();
  const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
  const directionMarkerGeometry = new THREE.ConeGeometry(
    SURFACE_DIRECTION_MARKER.radius,
    SURFACE_DIRECTION_MARKER.length,
    3,
  );
  directionMarkerGeometry.rotateX(Math.PI / 2);
  const {
    byKey: materials,
    owned: ownedMaterials,
    resolveZoneMaterial,
    materialsForKey,
    zoneLitMaterials,
  } = createFlatMaterials(THREE, materialRegistry);
  // The live house state the zone-fill uniform is derived from: `light_state` and the visual mode
  // both move the room bounce, and both arrive through their own setter.
  const houseState = { lightState: 'on', visualMode: 'architectural' };
  const cutawayMaterialKeys = Object.keys(materials).filter((key) => ![
    'tc-black', 'tc-blue', 'uc-white', 'gateway-dark',
    'rs485-green', 'lorawan-blue', 'ethernet-blue',
    SURFACE_DIRECTION_MARKER.materialKey,
    // The RTU keys SHARE the gateway's canonical painted metals: registering them for the cutaway/
    // engineering treatment would drag the gated opaque UG67 body into translucency with them.
    // The units live on the `roof` layer, which every engineering capture hides outright.
  ].includes(key) && !key.startsWith('endpoint-') && !key.startsWith('zone-') && !key.startsWith('rtu-'));
  const buckets = new Map();
  const directionMarkerBuckets = new Map();
  const directionMarkerMeshes = [];
  const meshes = [];
  const billboardSprites = [];
  const surfaceMeshes = [];
  let surfaceAtlas = null;
  let surfaceAtlasMaterial = null;

  function addBox(
    layer,
    materialKey,
    position,
    size,
    entityMetadata,
    rotationY = 0,
    mediaWidth = 0,
    mediaOffset = null,
  ) {
    // The lighting zone is DERIVED from where the box lands in the DesignSpec plan bands, so the
    // ladder can never drift from the building: one bucket per (layer, material, zone).
    const zone = resolveLightingZone({ layer, position });
    const key = `${layer}:${materialKey}:${zone}`;
    if (!buckets.has(key)) buckets.set(key, { layer, materialKey, zone, instances: [] });
    buckets.get(key).instances.push({
      layer,
      materialKey,
      zone,
      position,
      size,
      rotationY,
      mediaWidth,
      mediaOffset,
      metadata: entityMetadata,
    });
  }

  function addSegment(layer, materialKey, start, end, width, entityMetadata) {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const length = Math.hypot(dx, dz);
    addBox(
      layer,
      materialKey,
      [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
      [width, width, Math.max(width, length)],
      entityMetadata,
      Math.atan2(dx, dz),
      width,
    );
  }

  function addAxisSegment(layer, materialKey, start, end, width, entityMetadata, mediaOffset = null) {
    const delta = end.map((value, axis) => Math.abs(value - start[axis]));
    addBox(
      layer,
      materialKey,
      start.map((value, axis) => (value + end[axis]) / 2),
      delta.map((value) => Math.max(width, value)),
      entityMetadata,
      0,
      width,
      mediaOffset,
    );
  }

  function addAxisPolyline(layer, materialKey, points, width, entityMetadata) {
    for (let index = 0; index < points.length - 1; index += 1) {
      addAxisSegment(layer, materialKey, points[index], points[index + 1], width, {
        ...entityMetadata,
        routeSegment: index,
      });
    }
  }

  /**
   * A tray drawn on the conductor's own centre line swallows it, and the specified RS-485 green
   * only survives as a pale mint bleed through the translucent tray. The tray is therefore carried
   * one half-cross-section off the route: its face touches the conductor and the green stays lit.
   */
  function addTrayPolyline(layer, materialKey, points, trayWidth, conductorWidth, entityMetadata) {
    const gap = resolveTrayOffset(trayWidth, conductorWidth);
    for (let index = 0; index < points.length - 1; index += 1) {
      const delta = points[index + 1].map((value, axis) => Math.abs(value - points[index][axis]));
      const vertical = delta[1] > Math.max(delta[0], delta[2]);
      const offset = vertical ? [0, 0, -gap] : [0, -gap, 0];
      addAxisSegment(
        layer,
        materialKey,
        points[index].map((value, axis) => value + offset[axis]),
        points[index + 1].map((value, axis) => value + offset[axis]),
        trayWidth,
        { ...entityMetadata, routeSegment: index },
        offset,
      );
    }
  }

  function addDashedSegment(layer, materialKey, start, end, width, entityMetadata, dashCount = 7) {
    for (let index = 0; index < dashCount; index += 1) {
      const fromT = index / dashCount;
      const toT = Math.min(1, fromT + SURFACE_LORAWAN_DASH.dutyCycle / dashCount);
      const interpolate = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);
      addSegment(layer, materialKey, interpolate(start, end, fromT), interpolate(start, end, toT), width, {
        ...entityMetadata,
        dashIndex: index,
      });
    }
  }

  function addSurfaceArrowhead(layer, start, end, entityId, options = {}) {
    const { dashPolicy = null, ...placementOptions } = options;
    const placement = createDirectionMarkerPlacement(start, end, placementOptions);
    if (!directionMarkerBuckets.has(layer)) directionMarkerBuckets.set(layer, []);
    directionMarkerBuckets.get(layer).push({
      ...placement,
      dashPolicy,
      metadata: surfaceMetadata(entityId, 'media-arrowhead', ['HVAC-IOT-003'], {
        terminalAdjacent: true,
        visualRole: 'terminal-direction-arrowhead',
        component: 'single-arrowhead',
        routeComponentId: entityId.replace(/-direction$/, ''),
        routeAnchor: [...placement.routeAnchor],
        routeTangent: [...placement.tangent],
        routeComponentT: placement.routeComponentT,
        orientationErrorRadians: placement.orientationErrorRadians,
        baseContactDistance: placement.baseContactDistance,
        projectedMinPx: placement.projectedMinPx,
        projectedMaxPx: placement.projectedMaxPx,
        viewPriority: SURFACE_DIRECTION_MARKER.viewPriority,
        topologyImpact: SURFACE_DIRECTION_MARKER.topologyImpact,
      }),
    });
  }

  // Site datum and exact 60 × 45 m structural slab.
  addBox('architecture', 'site-gray', [0, -0.18, 25.4], [42, 0.18, 5.4], metadata('forecourt', 'site'));
  addBox(
    'architecture',
    'floor-charcoal',
    [0, -plan.structural.sections.foundationSlabThickness / 2, 0],
    [60, plan.structural.sections.foundationSlabThickness, 45],
    structuralMetadata('foundation-slab', 'structural-slab'),
  );
  // Material-owned finish plates change only the PBR read, not accepted massing.
  addBox(
    'architecture',
    'lobby-gloss-tile',
    [0, 0.02, 16.5],
    [59, 0.04, 11.5],
    structuralMetadata('front-public-material-floor', 'material-finish-plate'),
  );
  addBox(
    'architecture',
    'auditorium-carpet',
    [0, 0.02, -4],
    [6.8, 0.04, 29],
    structuralMetadata('central-corridor-material-floor', 'material-finish-plate'),
  );
  for (const room of plan.auditoriums) {
    addBox(
      'architecture',
      'auditorium-carpet',
      [centre(room.bounds.x), 0.02, centre(room.bounds.z)],
      [extent(room.bounds.x) - 0.7, 0.04, extent(room.bounds.z) - 0.45],
      structuralMetadata(`${room.id}-material-floor`, 'material-finish-plate'),
    );
  }
  const accessibleRoute = plan.structural.facade.accessibleRoute;
  addBox('architecture', 'accessible-yellow', accessibleRoute.position, accessibleRoute.size, accessibleRoute.metadata);
  addBox(
    'architecture',
    'accessible-yellow',
    accessibleRoute.thresholdPosition,
    [accessibleRoute.width, 0.08, 0.8],
    { ...accessibleRoute.metadata, component: 'wide-centre-threshold' },
  );
  for (const direction of [-1, 1]) {
    addBox(
      'architecture',
      'accessible-yellow',
      [accessibleRoute.centreX + direction * accessibleRoute.width / 2, 0.075, accessibleRoute.position[2]],
      [0.08, 0.08, accessibleRoute.size[2]],
      { ...accessibleRoute.metadata, component: 'route-edge', side: direction },
    );
  }
  addBox(
    'architecture',
    'rear-strip-blue',
    [0, 0.035, -19.25],
    [58, 0.07, 1.5],
    structuralMetadata('rear-service-clear-strip', 'service-corridor-floor'),
  );

  // Finish-agnostic roof panels sit on their exact public/family/rear wall heights.
  addBox('roof', 'public-roof', [0, 4.61, 16.5], [60, 0.22, 12], structuralMetadata('front-public-roof', 'roof-panel'));
  for (const room of plan.auditoriums) {
    const proxy = plan.blockoutProxies.auditoriums.find(({ auditoriumId }) => auditoriumId === room.id);
    const side = room.bounds.x[1] < 0 ? 'west' : 'east';
    const volumeX = side === 'west'
      ? room.bounds.x[1] - proxy.proxyWidth / 2
      : room.bounds.x[0] + proxy.proxyWidth / 2;
    addBox(
      'roof',
      `${room.family}-roof`,
      [centre(room.bounds.x), room.height + 0.11, centre(room.bounds.z)],
      [extent(room.bounds.x), 0.22, extent(room.bounds.z)],
      structuralMetadata(`${room.id}-roof-panel`, 'auditorium-roof-panel', REQUIREMENT_ARCHITECTURE, {
        auditoriumId: room.id,
        family: room.family,
      }),
    );
    addBox(
      'zones',
      `zone-${room.family}`,
      [volumeX, proxy.volumeHeight / 2, centre(room.bounds.z)],
      [proxy.proxyWidth, proxy.volumeHeight, proxy.proxyDepth],
      room.metadata,
    );
  }
  addBox('roof', 'rear-roof', [0, 4.61, -20.5], [60, 0.22, 4], structuralMetadata('rear-service-roof', 'roof-panel'));

  // P6 correction P3 — plate articulation. Every family plate gets a charcoal edge fascia hanging
  // 0.55 m below its own top, so each of the eight plates is OUTLINED and the 2/4/2 height steps
  // read from the exterior finals. Nothing rises: the fascia top is flush with the plate top, so
  // the 7–9 m envelope is untouched. Shares the existing `surface-dark` bucket (zero new draws).
  for (const room of plan.auditoriums) {
    const plateTop = room.height + 0.22;
    const fascia = { depth: 0.55, thickness: 0.12 };
    const fasciaY = plateTop - fascia.depth / 2;
    const spanX = extent(room.bounds.x) + fascia.thickness * 2;
    for (const [edge, zEdge] of [['north', room.bounds.z[1]], ['south', room.bounds.z[0]]]) {
      addBox(
        'roof',
        'surface-dark',
        [centre(room.bounds.x), fasciaY, zEdge],
        [spanX, fascia.depth, fascia.thickness],
        structuralMetadata(`${room.id}-roof-fascia-${edge}`, 'roof-fascia', REQUIREMENT_ARCHITECTURE, {
          auditoriumId: room.id,
          family: room.family,
          plateTop,
        }),
      );
    }
    for (const [edge, xEdge] of [['west', room.bounds.x[0]], ['east', room.bounds.x[1]]]) {
      addBox(
        'roof',
        'surface-dark',
        [xEdge, fasciaY, centre(room.bounds.z)],
        [fascia.thickness, fascia.depth, extent(room.bounds.z)],
        structuralMetadata(`${room.id}-roof-fascia-${edge}`, 'roof-fascia', REQUIREMENT_ARCHITECTURE, {
          auditoriumId: room.id,
          family: room.family,
          plateTop,
        }),
      );
    }
  }

  // Packaged rooftop units — spec `packaged_hvac_units`, one per TC300 zone, positions derived in
  // `createPackagedUnitPlan`. Boxes share three instanced buckets; the condenser fan circle and its
  // guard ring are two dedicated pools added after the buckets are emitted.
  for (const unit of plan.structural.roofService.packagedUnits) {
    const [x, top, z] = unit.position;
    const part = (component, requirement = REQUIREMENT_ARCHITECTURE) => structuralMetadata(
      `${unit.id}-${component}`,
      `rtu-${component}`,
      requirement,
      { rtuId: unit.id, tc300Id: unit.tc300Id, zoneId: unit.zoneId, component },
    );
    // Curb first: seated ON the plate top face — the visible roof contact the spec demands.
    addBox('roof', 'rtu-dark', [x, top + 0.125, z], [...unit.curbSize], part('curb'));
    addBox('roof', 'rtu-cabinet', [x, top + 0.85, z], [...unit.size], part('cabinet'));
    // Overhanging dark top cap — the trane-family roof trim band.
    addBox('roof', 'rtu-dark', [x, top + 1.48, z], [2.56, 0.06, 1.56], part('cap'));
    // Hooded outdoor-air intake on one long side, with a dark throat under the hood lip.
    addBox('roof', 'rtu-cabinet', [x - 0.75, top + 1.12, z + 0.86], [0.6, 0.5, 0.26], part('intake-hood'));
    addBox('roof', 'rtu-dark', [x - 0.75, top + 0.9, z + 0.9], [0.54, 0.08, 0.18], part('intake-hood-throat'));
    // Access-panel seams on both long faces.
    for (const [index, seamX] of [-0.42, 0.46].entries()) {
      addBox('roof', 'rtu-dark', [x + seamX, top + 0.82, z], [0.025, 0.92, 1.52], part(`panel-seam-${index + 1}`));
    }
    // `supply_drop` template realized: cabinet base outlet through the curb into the plate.
    addBox(
      'roof',
      'surface-metal',
      [x, top, z],
      [...RTU_PACKAGE.supplyDrop.size],
      part('supply-drop', ['CIN-ARCH-001', 'HVAC-IOT-001']),
    );
  }

  // Temporary family proxies make all three room types and the Sala 3 evidence countable.
  for (const proxy of plan.blockoutProxies.auditoriums) {
    const room = plan.auditoriums.find(({ id }) => id === proxy.auditoriumId);
    const side = room.bounds.x[1] < 0 ? 'west' : 'east';
    const direction = side === 'west' ? 1 : -1;
    const screenX = side === 'west' ? room.bounds.x[0] + 0.55 : room.bounds.x[1] - 0.55;
    const roomDepth = extent(room.bounds.z);
    addBox('architecture', 'screen-emissive', [screenX, 0.3 + proxy.screenSize[1] / 2, centre(room.bounds.z)], proxy.screenSize, {
      ...proxy.metadata,
      component: 'screen-slab',
    });
    const tierSpan = proxy.proxyWidth * 0.4;
    const baseX = side === 'west' ? room.bounds.x[1] - 2 : room.bounds.x[0] + 2;
    for (let tier = 0; tier < proxy.tierCount; tier += 1) {
      const progress = (tier + 0.5) / proxy.tierCount;
      const x = baseX - direction * progress * tierSpan;
      const tierHeight = 0.42 + tier * 0.28;
      const halfDepth = (roomDepth - proxy.aisleGapWidth) / 2;
      for (const zDirection of [-1, 1]) {
        if (tier < proxy.wheelchairBay.clearTierCount && zDirection === 1) continue;
        addBox(
          'architecture',
          'seating-burgundy',
          [x, tierHeight / 2, centre(room.bounds.z) + zDirection * (proxy.aisleGapWidth / 2 + halfDepth / 2)],
          [Math.max(1.2, tierSpan / proxy.tierCount * 0.88), tierHeight, halfDepth * 0.86],
          { ...proxy.metadata, component: 'tier-mass', tier, side: zDirection },
        );
      }
    }
    addBox('architecture', 'aisle-dark', [centre(room.bounds.x), 0.08, centre(room.bounds.z)], [extent(room.bounds.x) - 2, 0.16, proxy.aisleGapWidth], {
      ...proxy.metadata,
      component: 'aisle-gap',
    });
    const bayProgress = proxy.wheelchairBay.clearTierCount / 2 / proxy.tierCount;
    const bayX = baseX - direction * bayProgress * tierSpan;
    const positiveHalfDepth = (roomDepth - proxy.aisleGapWidth) / 2;
    const bayZ = centre(room.bounds.z) + proxy.aisleGapWidth / 2 + positiveHalfDepth / 2;
    const outline = { ...proxy.metadata, component: 'wheelchair-bay-outline' };
    for (const xOffset of [-proxy.wheelchairBay.width / 2, proxy.wheelchairBay.width / 2]) {
      addBox('architecture', 'wheelchair-blue', [bayX + xOffset, 0.18, bayZ], [0.14, 0.36, proxy.wheelchairBay.depth], outline);
    }
    addBox(
      'architecture',
      'wheelchair-blue',
      [bayX, 0.18, bayZ + proxy.wheelchairBay.depth / 2],
      [proxy.wheelchairBay.width, 0.36, 0.14],
      outline,
    );
  }

  // Geometry-only family frames expose the 2/4/2 width, height and tier grammar without labels.
  for (const shell of plan.structural.auditoriumShells) {
    const room = plan.auditoriums.find(({ id }) => id === shell.auditoriumId);
    const proxy = plan.blockoutProxies.auditoriums.find(({ auditoriumId }) => auditoriumId === room.id);
    const west = room.bounds.x[1] < 0;
    const outward = west ? -1 : 1;
    const corridorEdge = west ? room.bounds.x[1] : room.bounds.x[0];
    const outerEdge = corridorEdge + outward * shell.visibleEnvelope.width;
    const xCentre = (corridorEdge + outerEdge) / 2;
    const zEdges = [Math.min(...room.bounds.z) + 0.3, Math.max(...room.bounds.z) - 0.3];
    const frameMetadata = {
      ...shell.metadata,
      component: 'visible-family-frame',
      family: shell.family,
      tierCount: shell.visibleEnvelope.tiers,
    };
    for (const z of zEdges) {
      addBox(
        'architecture',
        'structural-steel',
        [xCentre, shell.visibleEnvelope.height, z],
        [shell.visibleEnvelope.width, 0.28, 0.28],
        frameMetadata,
      );
      for (const x of [corridorEdge, outerEdge]) {
        addBox(
          'architecture',
          'structural-steel',
          [x, shell.visibleEnvelope.height / 2, z],
          [0.28, shell.visibleEnvelope.height, 0.28],
          frameMetadata,
        );
      }
    }
    for (const x of [corridorEdge, outerEdge]) {
      addBox(
        'architecture',
        'structural-steel',
        [x, shell.visibleEnvelope.height, centre(room.bounds.z)],
        [0.28, 0.28, extent(room.bounds.z) - 0.6],
        frameMetadata,
      );
    }

    // A comparable cinema master in every room: side/cross aisles, screen-wall frame,
    // wheelchair void and a recessed projection niche. Labels remain supplementary.
    const aisleLength = shell.visibleEnvelope.width - 1.2;
    const aisleX = corridorEdge + outward * (shell.visibleEnvelope.width / 2 + 0.15);
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'aisle-dark',
        [aisleX, 0.11, centre(room.bounds.z) + zDirection * (extent(room.bounds.z) / 2 - 0.48)],
        [aisleLength, 0.22, 0.62],
        { ...frameMetadata, component: 'family-side-aisle', side: zDirection },
      );
    }
    const crossX = corridorEdge + outward * shell.visibleEnvelope.width * 0.43;
    addBox(
      'architecture',
      'aisle-dark',
      [crossX, 0.13, centre(room.bounds.z)],
      [0.74, 0.26, Math.max(1.2, extent(room.bounds.z) - 0.65)],
      { ...frameMetadata, component: 'family-cross-aisle' },
    );

    /**
     * `aisle_step_leds` — the channel this pass OWNS, and the reason the auditorium can be a dark
     * room at all. A low blue LED line runs along both side aisles and both flanks of the cross
     * aisle: it is what grazes the stepped seat blocks and carves their silhouettes out of the
     * dark, and it is one of the channels `light_state=off` switches.
     */
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'aisle-step-led',
        [
          aisleX,
          0.235,
          centre(room.bounds.z) + zDirection * (extent(room.bounds.z) / 2 - 0.48 - 0.33),
        ],
        [aisleLength, 0.07, 0.06],
        { ...frameMetadata, component: 'aisle-step-led', side: zDirection, lightingChannel: 'aisle_step_leds' },
      );
      addBox(
        'architecture',
        'aisle-step-led',
        [crossX + zDirection * 0.4, 0.275, centre(room.bounds.z)],
        [0.06, 0.07, Math.max(1.2, extent(room.bounds.z) - 0.65)],
        { ...frameMetadata, component: 'cross-aisle-step-led', side: zDirection, lightingChannel: 'aisle_step_leds' },
      );
    }

    /**
     * The in-room exit signs, RE-ORIENTED. Review defect: "the in-room exit signs are reduced to
     * 2-3 px green dashes and are not readable; eng-sala-3 shows the same signs rendering as crisp
     * green EXIT plates, so the geometry and the emissive exist and are simply under-driven."
     *
     * They were never under-driven. They were EDGE-ON. The plate measured 0.62 m along x by 0.26 m
     * in y by 0.05 m in z — and both cameras that are supposed to prove it, `sala-3` and
     * `reference-match`, look due WEST, straight down the room's x axis. The face they presented to
     * those cameras was the 0.05 x 0.26 m edge: a 1 px by 7 px green dash, exactly as reported. The
     * emissive was doing its job on a surface nobody could see. (eng-sala-3 reads them because the
     * engineering state makes the shell translucent and the sign is seen through the wall, from the
     * side.)
     *
     * A sign is only readable if its face spans the two axes the camera does not look down. These
     * are now blade-mounted plates — thin on x, 0.34 m tall and 0.9 m deep in z — hanging just
     * inboard of each side wall above the exit, which is where a cinema puts them and which is the
     * orientation an audience walking out along the row actually reads.
     */
    const exitSignX = room.bounds.x[west ? 0 : 1] - outward * shell.visibleEnvelope.width * 0.3;
    const exitSignDepth = 0.9;
    const exitSignInset = extent(room.bounds.z) / 2 - 0.16 - exitSignDepth / 2;
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'surface-exit-green',
        [exitSignX, 2.45, centre(room.bounds.z) + zDirection * exitSignInset],
        [0.05, 0.34, exitSignDepth],
        metadata(
          `${room.id}-exit-sign-${zDirection > 0 ? 'north' : 'south'}`,
          'auditorium-exit-sign',
          REQUIREMENT_ARCHITECTURE,
          { auditoriumId: room.id, side: zDirection, lightingChannel: 'exit_signs' },
        ),
      );
    }

    const screenX = west ? room.bounds.x[0] + 0.48 : room.bounds.x[1] - 0.48;
    const screenHeight = proxy.screenSize[1];
    const screenWidth = proxy.screenSize[2];
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'structural-steel',
        [screenX, 0.3 + screenHeight / 2, centre(room.bounds.z) + zDirection * (screenWidth / 2 + 0.14)],
        [0.32, screenHeight + 0.55, 0.28],
        { ...frameMetadata, component: 'screen-wall-jamb', side: zDirection },
      );
    }
    addBox(
      'architecture',
      'structural-steel',
      [screenX, 0.58 + screenHeight, centre(room.bounds.z)],
      [0.32, 0.28, screenWidth + 0.55],
      { ...frameMetadata, component: 'screen-wall-head' },
    );

    const nicheX = corridorEdge + outward * 1.15;
    const nicheWidth = Math.min(2.5, Math.max(1.6, extent(room.bounds.z) * 0.32));
    addBox(
      'architecture',
      'floor-charcoal',
      [nicheX, 3.25, centre(room.bounds.z)],
      [1.25, 1.85, nicheWidth],
      { ...frameMetadata, component: 'projection-niche-recess' },
    );
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'structural-steel',
        [nicheX - outward * 0.68, 3.25, centre(room.bounds.z) + zDirection * (nicheWidth / 2 + 0.1)],
        [0.26, 2.15, 0.2],
        { ...frameMetadata, component: 'projection-niche-jamb', side: zDirection },
      );
    }
    addBox(
      'architecture',
      'structural-steel',
      [nicheX - outward * 0.68, 4.36, centre(room.bounds.z)],
      [0.26, 0.2, nicheWidth + 0.4],
      { ...frameMetadata, component: 'projection-niche-head' },
    );
  }

  for (const proxy of plan.blockoutProxies.frontOfHouse) {
    if (proxy.kind !== 'checkpoint-lane') {
      addBox('architecture', proxy.materialKey, proxy.position, proxy.size, proxy.metadata);
      continue;
    }
    const sideWidth = (proxy.size[0] - proxy.accessGapWidth) / 2;
    const offset = proxy.accessGapWidth / 2 + sideWidth / 2;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        proxy.materialKey,
        [proxy.position[0] + direction * offset, proxy.position[1], proxy.position[2]],
        [sideWidth, proxy.size[1], proxy.size[2]],
        { ...proxy.metadata, component: 'checkpoint-side', openAccess: true },
      );
    }
  }

  const kitchenExtraction = plan.structural.kitchenExtraction;
  addBox(
    'architecture',
    'hood-steel',
    kitchenExtraction.hoodBody.position,
    kitchenExtraction.hoodBody.size,
    kitchenExtraction.hoodBody.metadata,
  );
  addBox(
    'architecture',
    'containment-orange',
    kitchenExtraction.hoodOutlet.position,
    kitchenExtraction.hoodOutlet.size,
    kitchenExtraction.hoodOutlet.metadata,
  );
  addBox(
    'architecture',
    'hood-steel',
    [
      kitchenExtraction.duct.socketPosition[0],
      (kitchenExtraction.duct.socketPosition[1] + kitchenExtraction.duct.topPosition[1]) / 2,
      kitchenExtraction.duct.socketPosition[2],
    ],
    kitchenExtraction.duct.size,
    kitchenExtraction.duct.metadata,
  );

  // ---------------------------------------------------------------------------
  // The HOUSE LIGHTING fit-out. DesignSpec `lighting_notes`: emissive ceiling panels in the lobby
  // and concessions, low warm strips in the corridor, and a dark auditorium lit only by its own
  // aisle, exit and screen light. None of this changes massing, topology, device positions, route
  // paths or the surface detail plan: it is the fixtures the building was always missing.
  // ---------------------------------------------------------------------------

  // The apron the facade camera stands on. Without it the hero framing was a thin band of building
  // between two voids: nothing under the camera returned a single lit pixel.
  addBox(
    'architecture',
    'exterior-concrete',
    [0, -0.09, 40.05],
    [80, 0.18, 23.9],
    metadata('entrance-apron', 'site', REQUIREMENT_FACADE),
  );

  // Under-marquee downlights: this pass's `exterior_lights` channel, and the strongest proof in the
  // facade pair that `light_state` reaches the exterior.
  for (const [index, x] of [-13.6, -6.8, 0, 6.8, 13.6].entries()) {
    addBox(
      'architecture',
      'marquee-downlight',
      [x, plan.facade.marquee.position[1] - plan.facade.marquee.size[1] / 2 - 0.035, 22.7],
      [2.4, 0.07, 0.6],
      metadata(`marquee-downlight-${index + 1}`, 'exterior-light', REQUIREMENT_FACADE, {
        lightingChannel: 'exterior_lights',
      }),
    );
  }

  // The interior soffits. With the public roof clipped for the lobby/concessions/kitchen presets,
  // and with no roof at all over the corridor, every interior frame opened onto pure black.
  addBox(
    'architecture',
    'interior-ceiling',
    [0, 4.42, 16.4],
    [58.8, 0.12, 11.6],
    metadata('public-band-soffit', 'interior-ceiling'),
  );
  addBox(
    'architecture',
    'interior-ceiling',
    [0, 4.42, -4],
    [7.1, 0.12, 29],
    metadata('central-corridor-soffit', 'interior-ceiling'),
  );

  /**
   * THE AUDITORIUM CEILING — the surface the whole of lighting lineage 1 was blind to.
   *
   * Until now the ceiling of every auditorium was the UNDERSIDE OF ITS ROOF PANEL, and that panel is
   * on layer `roof`. `LIGHTING_UNDIMMED_LAYERS` lists `roof`, because rooftop plant sits inside the
   * footprint in x/z and must not be dimmed as though it were indoors — so `resolveLightingZone`
   * hands every roof box the `exterior` zone and a dim of 1.0. The darkest room in the building had
   * a ceiling that reflected the sun at full strength, and — because the runtime adds every
   * PointLight to the scene, and `WebGLRenderer` filters lights by the CAMERA's layers and never by
   * the lit object's — it also took the auditorium's own lamps, which `resolveFixtureIntensity`
   * pre-compensates by 1/dim = 147x, at their raw intensity. Hence: "large soft blue-white glow
   * pools that clip toward white", "visually the brightest ceiling in the entire capture set", and a
   * four-tier ladder inverted at its darkest rung.
   *
   * One roof box cannot be a sunlit roof plane and a dark cinema ceiling at once, which is the same
   * problem the envelope walls already have and the same answer: the interior gets its own finish
   * plane, on the `architecture` layer, positioned by the plan bands, and therefore classified
   * `auditorium` and lit as the auditorium. It sits flush under the roof panel and occludes it from
   * every interior camera. Like the other soffits it is architectural-state only, so the engineering
   * captures keep seeing straight through to the ceiling containment — which is why `eng-sala-3`
   * always read correctly while the architecture state did not.
   */
  for (const room of plan.auditoriums) {
    addBox(
      'architecture',
      'interior-ceiling',
      [centre(room.bounds.x), room.height - 0.06, centre(room.bounds.z)],
      [extent(room.bounds.x) - 0.3, 0.12, extent(room.bounds.z) - 0.3],
      metadata(`${room.id}-ceiling`, 'interior-ceiling', REQUIREMENT_ARCHITECTURE, {
        auditoriumId: room.id,
      }),
    );
  }

  // Lobby / concession luminaires: emissive panels the eye can find, plus the real PointLights in
  // `LIGHTING_INTERIOR_FIXTURES` that give them a pool and a falloff toward the rear wall.
  for (const [index, position] of [
    [-19, 4.3, 18.6], [0, 4.3, 18.6], [19, 4.3, 18.6], [-9, 4.3, 13.4], [9, 4.3, 13.4],
  ].entries()) {
    addBox(
      'architecture',
      'lobby-ceiling-panel',
      position,
      [7.2, 0.08, 1.3],
      metadata(`lobby-ceiling-panel-${index + 1}`, 'lobby-luminaire', REQUIREMENT_ARCHITECTURE),
    );
  }

  // Warm corridor strips, running the full spine. They stay low: the exit signs and the accent
  // markings must remain the brightest things in the corridor frame.
  for (const [index, x] of [-1.7, 1.7].entries()) {
    addBox(
      'architecture',
      'corridor-ceiling-strip',
      [x, 4.3, -4],
      [0.22, 0.07, 27.5],
      metadata(`corridor-ceiling-strip-${index + 1}`, 'corridor-luminaire', REQUIREMENT_ARCHITECTURE),
    );
  }

  // Interior linings on the inner face of the envelope. The shell boxes are single-sided masses:
  // one box cannot be a sunlit exterior elevation and a dim interior wall at the same time, so the
  // interior gets its own finish plane and its own rung of the ladder.
  for (const side of [-1, 1]) {
    addBox(
      'walls',
      'shell-gray',
      [side * 29.45, 2.25, 16.4],
      [0.12, 4.4, 11.6],
      metadata(`${side < 0 ? 'west' : 'east'}-public-lining`, 'interior-lining'),
    );
    addBox(
      'walls',
      'auditorium-acoustic-wall',
      [side * 29.45, 4.4, -4],
      [0.12, 8.8, 28.8],
      metadata(`${side < 0 ? 'west' : 'east'}-auditorium-lining`, 'interior-lining'),
    );
  }

  // Engineering volumes make the three plan bands and disjoint circulation explicit.
  addBox('zones', 'zone-public', [0, 2.2, 16.5], [59, 4.4, 11.5], metadata('front-public-zone', 'plan-band'));
  addBox('zones', 'zone-corridor', [0, 1.4, -4], [7, 2.8, 29], plan.centralCorridor.metadata);
  addBox('zones', 'zone-service', [0, 1.1, -19.25], [58, 2.2, 1.5], plan.rearTechnical.serviceCorridor.metadata);
  for (const room of plan.rearTechnical.rooms) {
    addBox(
      'zones',
      'zone-service',
      [centre(room.bounds.x), 1.1, centre(room.bounds.z)],
      [extent(room.bounds.x), 2.2, extent(room.bounds.z)],
      room.metadata,
    );
  }

  // Outer shell. The front is split around the entrance/glazing bank rather than covered.
  addBox('walls', 'shell-gray', [-29.8, 2.25, 16.5], [0.4, 4.5, 12], metadata('west-public-wall', 'exterior-wall'));
  addBox('walls', 'shell-gray', [29.8, 2.25, 16.5], [0.4, 4.5, 12], metadata('east-public-wall', 'exterior-wall'));
  addBox('walls', 'shell-gray', [-29.8, 2.25, -20.5], [0.4, 4.5, 4], metadata('west-rear-wall', 'exterior-wall'));
  addBox('walls', 'shell-gray', [29.8, 2.25, -20.5], [0.4, 4.5, 4], metadata('east-rear-wall', 'exterior-wall'));
  for (const wall of plan.auditoriumOuterWalls) {
    const emergency = plan.structural.emergencyDoors.find(({ auditoriumId }) => auditoriumId === wall.auditoriumId);
    const zMinimum = Math.min(...wall.bounds.z);
    const zMaximum = Math.max(...wall.bounds.z);
    const openingHalf = emergency.opening.clearWidth / 2;
    const openingMinimum = emergency.position[2] - openingHalf;
    const openingMaximum = emergency.position[2] + openingHalf;
    const x = wall.side === 'west' ? -29.8 : 29.8;
    for (const [minimum, maximum, suffix] of [
      [zMinimum, openingMinimum, 'before'],
      [openingMaximum, zMaximum, 'after'],
    ]) {
      if (maximum <= minimum) continue;
      addBox(
        'walls',
        'shell-gray',
        [x, wall.height / 2, (minimum + maximum) / 2],
        [plan.structural.sections.exteriorWallThickness, wall.height, maximum - minimum],
        structuralMetadata(`${wall.id}-${suffix}`, 'auditorium-perimeter-wall', REQUIREMENT_ARCHITECTURE, {
          auditoriumId: wall.auditoriumId,
        }),
      );
    }
    const headerHeight = wall.height - emergency.opening.clearHeight;
    addBox(
      'walls',
      'shell-gray',
      [x, emergency.opening.clearHeight + headerHeight / 2, emergency.position[2]],
      [plan.structural.sections.exteriorWallThickness, headerHeight, emergency.opening.clearWidth],
      structuralMetadata(`${wall.id}-emergency-header`, 'emergency-opening-header'),
    );
  }
  addBox('walls', 'shell-gray', [0, 2.25, -22.3], [60, 4.5, 0.4], metadata('rear-exterior-wall', 'exterior-wall'));
  addBox('walls', 'shell-gray', [-20.5, 2.25, 22.3], [19, 4.5, 0.4], metadata('facade-west-pier', 'facade-wall', REQUIREMENT_FACADE));
  addBox('walls', 'shell-gray', [20.5, 2.25, 22.3], [19, 4.5, 0.4], metadata('facade-east-pier', 'facade-wall', REQUIREMENT_FACADE));
  addBox('walls', 'shell-gray', [0, 3.95, 22.3], [22, 1.1, 0.4], metadata('facade-entry-header', 'facade-wall', REQUIREMENT_FACADE));

  // Public/auditorium threshold and the rear separation wall establish the three bands.
  addBox('walls', 'shell-gray', [-16.75, 2.25, 10.5], [25.5, 4.5, 0.25], metadata('front-west-threshold', 'band-wall'));
  addBox('walls', 'shell-gray', [16.75, 2.25, 10.5], [25.5, 4.5, 0.25], metadata('front-east-threshold', 'band-wall'));

  // Corridor walls are segmented to leave four true 2.2 m portals on each side.
  const roomZBounds = [[10.5, 2], [2, -5.3], [-5.3, -12.6], [-12.6, -18.5]];
  for (const side of ['west', 'east']) {
    const x = side === 'west' ? -3.72 : 3.72;
    for (let index = 0; index < roomZBounds.length; index += 1) {
      const [top, bottom] = roomZBounds[index];
      const portalZ = PORTAL_CENTRES_Z[index];
      const portalHalf = 1.1;
      const room = plan.auditoriums[index + (side === 'west' ? 0 : 4)];
      const wallHeight = room.height;
      const openingHeight = 2.4;
      const headerHeight = wallHeight - openingHeight;
      const upperDepth = top - (portalZ + portalHalf);
      const lowerDepth = (portalZ - portalHalf) - bottom;
      addBox('walls', 'shell-gray', [x, openingHeight + headerHeight / 2, portalZ], [0.25, headerHeight, 2.2], metadata(`${side}-portal-header-${index + 1}`, 'portal-header'));
      addBox('walls', 'shell-gray', [x, wallHeight / 2, (top + portalZ + portalHalf) / 2], [0.25, wallHeight, upperDepth], metadata(`${side}-corridor-upper-${index + 1}`, 'corridor-wall'));
      addBox('walls', 'shell-gray', [x, wallHeight / 2, (portalZ - portalHalf + bottom) / 2], [0.25, wallHeight, lowerDepth], metadata(`${side}-corridor-lower-${index + 1}`, 'corridor-wall'));
    }
  }

  // Auditorium separators make all eight masses legible even with roofs hidden.
  for (const [z, height] of [[2, 8.8], [-5.3, 8], [-12.6, 8], [-18.5, 7.2]]) {
    addBox('walls', 'shell-gray', [-16.65, height / 2, z], [25.7, height, 0.2], metadata(`west-divider-${z}`, 'auditorium-divider'));
    addBox('walls', 'shell-gray', [16.65, height / 2, z], [25.7, height, 0.2], metadata(`east-divider-${z}`, 'auditorium-divider'));
  }

  // Rear technical construction: room dividers plus a separating wall with four true openings.
  for (const room of plan.structural.rearTechnical.rooms) {
    for (const x of room.bounds.x) {
      addBox(
        'walls',
        'shell-gray',
        [x, room.height / 2, centre(room.bounds.z)],
        [room.wallThickness, room.height, extent(room.bounds.z)],
        room.metadata,
      );
    }
  }
  const serviceDoors = [...plan.structural.rearTechnical.serviceDoors]
    .sort((left, right) => left.position[0] - right.position[0]);
  let rearWallCursor = -29.6;
  for (const door of serviceDoors) {
    const halfWidth = door.opening.clearWidth / 2;
    const openingMinimum = door.position[0] - halfWidth;
    const openingMaximum = door.position[0] + halfWidth;
    if (openingMinimum > rearWallCursor) {
      addBox(
        'walls',
        'shell-gray',
        [(rearWallCursor + openingMinimum) / 2, 2.25, -20.1],
        [openingMinimum - rearWallCursor, 4.5, 0.2],
        structuralMetadata(`rear-separation-${door.id}-before`, 'rear-separating-wall'),
      );
    }
    const headerHeight = 4.5 - door.opening.clearHeight;
    addBox(
      'walls',
      'shell-gray',
      [door.position[0], door.opening.clearHeight + headerHeight / 2, -20.1],
      [door.opening.clearWidth, headerHeight, 0.2],
      structuralMetadata(`${door.id}-opening-header`, 'service-opening-header'),
    );
    rearWallCursor = openingMaximum;
  }
  if (rearWallCursor < 29.6) {
    addBox(
      'walls',
      'shell-gray',
      [(rearWallCursor + 29.6) / 2, 2.25, -20.1],
      [29.6 - rearWallCursor, 4.5, 0.2],
      structuralMetadata('rear-separation-final', 'rear-separating-wall'),
    );
  }
  for (const door of serviceDoors) {
    const { clearWidth, clearHeight } = door.opening;
    const { jambThickness, headThickness, depth } = door.frame;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'structural-steel',
        [door.position[0] + direction * (clearWidth / 2 + jambThickness / 2), clearHeight / 2, door.position[2]],
        [jambThickness, clearHeight, depth],
        { ...door.metadata, component: 'jamb' },
      );
    }
    addBox(
      'architecture',
      'structural-steel',
      [door.position[0], clearHeight + headThickness / 2, door.position[2]],
      [clearWidth + jambThickness * 2, headThickness, depth],
      { ...door.metadata, component: 'head' },
    );
    addBox(
      'architecture',
      'service-door',
      door.position,
      [clearWidth - 0.08, clearHeight - 0.06, door.door.thickness],
      { ...door.metadata, component: 'door-leaf' },
    );
    addBox(
      'architecture',
      'structural-steel',
      [door.position[0], door.threshold.height / 2, door.position[2]],
      [clearWidth + jambThickness * 2, door.threshold.height, door.threshold.depth],
      { ...door.metadata, component: 'threshold' },
    );
  }

  // Façade structure: attached marquee/sign supports and five framed glazed entries.
  // The canopy is an EMISSION CHANNEL, not paint: `light_state=off` must visibly put it out.
  addBox('architecture', 'marquee-canopy', plan.facade.marquee.position, plan.facade.marquee.size, plan.facade.marquee.metadata);
  addBox('architecture', 'facade-sign-emissive', plan.facade.identity.position, plan.facade.identity.size, plan.facade.identity.metadata);
  for (const support of plan.structural.facade.marqueeSupports) {
    addBox('architecture', 'brand-red', support.position, support.size, support.metadata);
  }
  for (const support of plan.structural.facade.signSupports) {
    addBox('architecture', 'facade-frame-charcoal', support.position, support.size, support.metadata);
  }
  for (const entrance of plan.structural.facade.entranceAssemblies) {
    const { clearWidth, clearHeight } = entrance.opening;
    const { jambThickness, headThickness, depth } = entrance.frame;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'facade-frame-charcoal',
        [entrance.position[0] + direction * (clearWidth / 2 + jambThickness / 2), clearHeight / 2, entrance.position[2]],
        [jambThickness, clearHeight, depth],
        { ...entrance.metadata, component: 'jamb' },
      );
    }
    addBox(
      'architecture',
      'facade-frame-charcoal',
      [entrance.position[0], clearHeight + headThickness / 2, entrance.position[2]],
      [clearWidth + jambThickness * 2, headThickness, depth],
      { ...entrance.metadata, component: 'head' },
    );
    addBox(
      'architecture',
      'glass-blue',
      [entrance.position[0], clearHeight / 2, entrance.position[2]],
      [clearWidth - 0.08, clearHeight - 0.08, entrance.glazing.thickness],
      { ...entrance.metadata, component: 'glazed-leaf' },
    );
    addBox(
      'architecture',
      entrance.opening.accessible ? 'accessible-yellow' : 'facade-frame-charcoal',
      [entrance.position[0], 0.04, entrance.position[2]],
      [clearWidth + jambThickness * 2, 0.08, depth],
      { ...entrance.metadata, component: 'entry-threshold' },
    );
  }

  // Eight framed acoustic double-leaf assemblies sit inside the true corridor openings.
  for (const assembly of plan.structural.portalAssemblies) {
    const portal = plan.portals.find(({ id }) => id === assembly.portalId);
    const { clearWidth, clearHeight } = assembly.opening;
    const { jambThickness, headThickness, depth } = assembly.frame;
    const leafWidth = (clearWidth - 0.08) / 2;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'structural-steel',
        [assembly.position[0], clearHeight / 2, assembly.position[2] + direction * (clearWidth / 2 + jambThickness / 2)],
        [depth, clearHeight, jambThickness],
        { ...assembly.metadata, component: 'jamb' },
      );
      addBox(
        'architecture',
        'portal-dark',
        [assembly.position[0], clearHeight / 2, assembly.position[2] + direction * (leafWidth / 2 + 0.02)],
        [assembly.door.thickness, clearHeight - 0.06, leafWidth],
        { ...assembly.metadata, component: 'acoustic-leaf', leaf: direction },
      );
    }
    addBox(
      'architecture',
      'structural-steel',
      [assembly.position[0], clearHeight + headThickness / 2, assembly.position[2]],
      [depth, headThickness, clearWidth + jambThickness * 2],
      { ...assembly.metadata, component: 'head' },
    );
    addBox(
      'architecture',
      'structural-steel',
      [assembly.position[0], assembly.threshold.height / 2, assembly.position[2]],
      [assembly.threshold.depth, assembly.threshold.height, clearWidth + jambThickness * 2],
      { ...assembly.metadata, component: 'threshold' },
    );
    addBox('architecture', 'portal-red', [portal.position[0], 2.62, portal.position[2]], [0.22, 0.32, portal.width], structuralMetadata(`${portal.id}-header`, 'portal-sign'));
    const roomNumber = portal.metadata.roomNumber;
    const signX = portal.position[0] + (portal.side === 'west' ? 0.14 : -0.14);
    const direction = portal.side === 'west' ? 1 : -1;
    const positions = {
      top: [signX, 3.18, portal.position[2]],
      mid: [signX, 2.98, portal.position[2]],
      bottom: [signX, 2.78, portal.position[2]],
      tl: [signX, 3.08, portal.position[2] + direction * 0.11],
      tr: [signX, 3.08, portal.position[2] - direction * 0.11],
      bl: [signX, 2.88, portal.position[2] + direction * 0.11],
      br: [signX, 2.88, portal.position[2] - direction * 0.11],
    };
    for (const segment of digitSegments(roomNumber)) {
      const horizontal = ['top', 'mid', 'bottom'].includes(segment);
      addBox(
        'labels',
        'identity-white',
        positions[segment],
        horizontal ? [0.08, 0.055, 0.24] : [0.08, 0.16, 0.055],
        metadata(`sala-${roomNumber}-digit-${segment}`, 'room-number'),
      );
    }
  }

  // Exterior emergency openings receive acoustic leaves and frames without filling the wall void.
  for (const door of plan.structural.emergencyDoors) {
    const { clearWidth, clearHeight } = door.opening;
    const { jambThickness, headThickness, depth } = door.frame;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'structural-steel',
        [door.position[0], clearHeight / 2, door.position[2] + direction * (clearWidth / 2 + jambThickness / 2)],
        [depth, clearHeight, jambThickness],
        { ...door.metadata, component: 'jamb' },
      );
    }
    addBox(
      'architecture',
      'structural-steel',
      [door.position[0], clearHeight + headThickness / 2, door.position[2]],
      [depth, headThickness, clearWidth + jambThickness * 2],
      { ...door.metadata, component: 'head' },
    );
    addBox(
      'architecture',
      'service-door',
      door.position,
      [door.door.thickness, clearHeight - 0.06, clearWidth - 0.08],
      { ...door.metadata, component: 'emergency-leaf' },
    );
    addBox(
      'architecture',
      'structural-steel',
      [door.position[0], door.threshold.height / 2, door.position[2]],
      [door.threshold.depth, door.threshold.height, clearWidth + jambThickness * 2],
      { ...door.metadata, component: 'threshold' },
    );
  }

  // Reserved shell sleeves prove future containment locations without building later assets.
  for (const sleeve of plan.structural.containment.futureSleeves) {
    addBox('architecture', 'containment-orange', sleeve.position, sleeve.size, sleeve.metadata);
  }
  for (const route of plan.structural.roofService.routes) {
    addBox('architecture', 'hood-steel', route.plenum.position, route.plenum.size, route.plenum.metadata);
    addBox('architecture', 'structural-steel', route.main.position, route.main.size, route.main.metadata);
    addBox('architecture', 'containment-orange', route.sleeve.position, route.sleeve.size, route.sleeve.metadata);
    addBox(
      'architecture',
      'containment-orange',
      [route.plenum.socketPosition[0], 8.26, route.plenum.socketPosition[2]],
      [0.7, 0.42, 0.7],
      { ...route.plenum.metadata, component: 'plenum-main-overlap-collar' },
    );
  }

  // SURFACE-owned response stays restrained and batched: joints, seals, hardware,
  // floor pattern and roof cues explain construction without changing accepted massing.
  for (const [panelIndex, x] of [-26.5, -22.5, -18.5, 18.5, 22.5, 26.5].entries()) {
    for (const [rowIndex, y] of [0.75, 2.12, 3.49].entries()) {
      addBox(
        'architecture',
        (panelIndex + rowIndex) % 2 ? 'surface-concrete-a' : 'surface-concrete-b',
        [x, y, 22.525],
        [3.72, 1.18, 0.035],
        surfaceMetadata(`facade-breakup-${panelIndex + 1}-${rowIndex + 1}`, 'facade-breakup', REQUIREMENT_FACADE),
      );
    }
  }
  for (const [index, x] of [-28, -24, -20, -17, -11, 11, 17, 20, 24, 28].entries()) {
    addBox(
      'architecture',
      'surface-dark',
      [x, 2.2, 22.555],
      [0.045, 4.15, 0.035],
      surfaceMetadata(`facade-panel-joint-${index + 1}`, 'wall-joint'),
    );
  }
  for (const [index, y] of [1.45, 3.05].entries()) {
    addBox(
      'architecture',
      'surface-dark',
      [0, y, 22.56],
      [59.2, 0.035, 0.04],
      surfaceMetadata(`facade-horizontal-joint-${index + 1}`, 'wall-joint'),
    );
  }
  for (const entrance of plan.structural.facade.entranceAssemblies) {
    addBox(
      'architecture',
      'surface-white',
      [entrance.position[0], 1.12, entrance.position[2] + 0.025],
      [entrance.opening.clearWidth - 0.12, 0.075, 0.035],
      surfaceMetadata(`${entrance.id}-safety-band`, 'glass-safety-band', REQUIREMENT_FACADE),
    );
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'surface-white',
        [entrance.position[0] + direction * entrance.opening.clearWidth * 0.28, 1.12, entrance.position[2] + 0.03],
        [0.13, 0.16, 0.04],
        surfaceMetadata(`${entrance.id}-safety-marker-${direction}`, 'glass-safety-band', REQUIREMENT_FACADE),
      );
    }
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'surface-metal',
        [entrance.position[0] + direction * 0.17, 1.12, entrance.position[2] + 0.06],
        [0.035, 0.68, 0.045],
        surfaceMetadata(`${entrance.id}-handle-${direction}`, 'door-hardware', REQUIREMENT_FACADE),
      );
    }
    addBox(
      'architecture',
      'surface-metal',
      [entrance.position[0] + 0.27, 1.02, entrance.position[2] + 0.065],
      [0.1, 0.16, 0.055],
      surfaceMetadata(`${entrance.id}-lock`, 'door-hardware', REQUIREMENT_FACADE),
    );
    addBox(
      'architecture',
      'surface-metal',
      [entrance.position[0], 0.095, entrance.position[2] + 0.025],
      [entrance.opening.clearWidth + 0.16, 0.035, 0.32],
      surfaceMetadata(`${entrance.id}-surface-threshold`, 'door-hardware', REQUIREMENT_FACADE),
    );
  }
  for (const assembly of plan.structural.portalAssemblies) {
    const { clearWidth, clearHeight } = assembly.opening;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'surface-seal',
        [assembly.position[0], clearHeight / 2, assembly.position[2] + direction * (clearWidth / 2 - 0.035)],
        [assembly.door.thickness + 0.035, clearHeight - 0.05, 0.055],
        surfaceMetadata(`${assembly.id}-seal-${direction}`, 'portal-seal'),
      );
    }
    addBox(
      'architecture',
      'surface-seal',
      [assembly.position[0], clearHeight - 0.035, assembly.position[2]],
      [assembly.door.thickness + 0.035, 0.055, clearWidth - 0.06],
      surfaceMetadata(`${assembly.id}-head-seal`, 'portal-seal'),
    );
  }

  for (const [index, z] of [11.4, 14.4, 17.4, 20.4].entries()) {
    addBox(
      'architecture',
      'surface-dark',
      [0, 0.048, z],
      [58.2, 0.012, 0.025],
      surfaceMetadata(`public-floor-joint-z-${index + 1}`, 'floor-joint'),
    );
  }
  for (const [index, x] of [-24, -18, -12, -6, 0, 6, 12, 18, 24].entries()) {
    addBox(
      'architecture',
      'surface-dark',
      [x, 0.048, 16.5],
      [0.025, 0.012, 10.8],
      surfaceMetadata(`public-floor-joint-x-${index + 1}`, 'floor-joint'),
    );
  }
  for (const [index, x] of [-8.2, -2.75, 2.75, 8.2].entries()) {
    addBox(
      'architecture',
      'surface-pos',
      [x, 2.28, 16.77],
      [1.2 + (index % 2) * 0.18, 0.62, 0.12],
      surfaceMetadata(`concession-pos-${index + 1}`, 'pos-cue', REQUIREMENT_FACADE, { variant: index }),
    );
    addBox(
      'architecture',
      'surface-metal',
      [x, 1.88, 16.7],
      [0.16, 0.34, 0.16],
      surfaceMetadata(`concession-pos-stand-${index + 1}`, 'pos-cue', REQUIREMENT_FACADE),
    );
  }
  for (const [index, x] of [-8.2, -2.75, 2.75, 8.2].entries()) {
    addBox(
      'architecture',
      'surface-pos-screen',
      [x, 2.42, 16.84],
      [0.9 + (index % 2) * 0.12, 0.26, 0.03],
      surfaceMetadata(`concession-pos-screen-${index + 1}`, 'pos-cue', REQUIREMENT_FACADE, { variant: index }),
    );
  }
  for (const [index, x] of [-10.4, -6.4, 6.4, 10.4].entries()) {
    const height = index % 2 ? 1.55 : 1.85;
    addBox(
      'architecture',
      index % 2 ? 'surface-service' : 'surface-seal',
      [x, height / 2 + 0.16, 14.72],
      [1.35 + (index % 2) * 0.3, height, 0.72],
      surfaceMetadata(`snack-machine-${index + 1}`, 'snack-machine-cue', REQUIREMENT_FACADE, { variant: index }),
    );
    addBox(
      'architecture',
      'surface-pos',
      [x, height * 0.65, 15.09],
      [0.85, 0.34, 0.05],
      surfaceMetadata(`snack-machine-face-${index + 1}`, 'snack-machine-cue', REQUIREMENT_FACADE),
    );
    // Generated product bands make the machines read as merchandised units, not blank slabs.
    for (const [bandIndex, offset] of [0.28, 0.02, -0.24].entries()) {
      addBox(
        'architecture',
        bandIndex === 1 ? 'surface-snack-graphic' : 'surface-pos-screen',
        [x, height * 0.65 + offset - 0.42, 15.11],
        [0.7 + (bandIndex % 2) * 0.14, 0.1, 0.03],
        surfaceMetadata(
          `snack-machine-graphic-${index + 1}-${bandIndex + 1}`,
          'snack-machine-cue',
          REQUIREMENT_FACADE,
          { variant: bandIndex },
        ),
      );
    }
  }
  const { serviceBackWall, popcornUnits, refrigerationUnits } = plan.frontOfHouseSurfaces;
  addBox(
    'architecture',
    serviceBackWall.materialKey,
    serviceBackWall.position,
    serviceBackWall.size,
    surfaceMetadata(serviceBackWall.id, 'menu-display', REQUIREMENT_FACADE),
  );
  for (const unit of popcornUnits) {
    addBox('architecture', 'surface-metal', unit.body.position, unit.body.size, surfaceMetadata(
      unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'body' },
    ));
    addBox('architecture', 'surface-popcorn', unit.glass.position, unit.glass.size, surfaceMetadata(
      unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'glass' },
    ));
    addBox('architecture', 'surface-dark', unit.kettle.position, unit.kettle.size, surfaceMetadata(
      unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'kettle' },
    ));
  }
  for (const unit of refrigerationUnits) {
    addBox('architecture', 'surface-dark', unit.body.position, unit.body.size, surfaceMetadata(
      unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'body' },
    ));
    addBox('architecture', 'surface-cooler-glass', unit.glass.position, unit.glass.size, surfaceMetadata(
      unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'glass' },
    ));
    for (const shelf of unit.shelves) {
      addBox(
        'architecture',
        shelf.variant === 1 ? 'surface-snack-graphic' : 'surface-pos-screen',
        shelf.position,
        shelf.size,
        surfaceMetadata(unit.id, unit.kind, REQUIREMENT_FACADE, { component: 'shelf', variant: shelf.variant }),
      );
    }
  }
  const posterBank = plan.facade.posterBank;
  addBox(
    'architecture',
    'surface-dark',
    posterBank.backing.position,
    posterBank.backing.size,
    surfaceMetadata(posterBank.backing.id, 'poster-placeholder', REQUIREMENT_FACADE),
  );
  for (const arrow of plan.wayfinding.evacuationArrows) {
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'surface-exit-green',
        [
          arrow.position[0] + direction * arrow.width * 0.26,
          arrow.position[1],
          arrow.position[2] - arrow.direction[2] * 0.18,
        ],
        [arrow.width * 0.62, 0.018, 0.1],
        surfaceMetadata(`${arrow.id}-${direction > 0 ? 'right' : 'left'}`, 'wayfinding-marking'),
        direction * arrow.direction[2] * Math.PI * 0.22,
      );
    }
    addBox(
      'architecture',
      'surface-exit-green',
      [arrow.position[0], arrow.position[1], arrow.position[2] + arrow.direction[2] * 0.5],
      [0.12, 0.018, 0.9],
      surfaceMetadata(`${arrow.id}-shaft`, 'wayfinding-marking'),
    );
  }
  for (const lining of plan.auditoriumAcousticLinings) {
    addBox('architecture', lining.materialKey, lining.position, lining.size, lining.metadata);
  }
  for (const [index, x] of [-24, -20.5, -17].entries()) {
    addBox(
      'architecture',
      'surface-pos',
      [x, 1.25, 19.86],
      [1.15, 1.4, 0.1],
      surfaceMetadata(`ticket-kiosk-face-${index + 1}`, 'pos-cue', REQUIREMENT_FACADE, { variant: index }),
    );
  }
  addBox(
    'architecture',
    'hood-steel',
    [-8.5, 2.08, 12.5],
    [11.7, 0.12, 3],
    surfaceMetadata('kitchen-stainless-worktop', 'kitchen-service-cue', REQUIREMENT_FACADE),
  );
  for (const [index, x] of [-12.7, -10.4, -8.1, -5.8].entries()) {
    addBox(
      'architecture',
      index % 2 ? 'surface-service' : 'surface-dark',
      [x, 1.15, 14.08],
      [1.9, 1.45, 0.08],
      surfaceMetadata(`kitchen-cabinet-face-${index + 1}`, 'kitchen-service-cue', REQUIREMENT_FACADE, { variant: index }),
    );
    addBox(
      'architecture',
      'surface-metal',
      [x + 0.62, 1.15, 14.14],
      [0.06, 0.34, 0.04],
      surfaceMetadata(`kitchen-cabinet-pull-${index + 1}`, 'kitchen-service-cue', REQUIREMENT_FACADE),
    );
  }
  addBox(
    'architecture',
    'surface-marking',
    [-8.5, 0.055, 14.35],
    [9.5, 0.02, 0.09],
    surfaceMetadata('kitchen-service-floor-mark', 'kitchen-service-cue', REQUIREMENT_FACADE),
  );
  for (const door of plan.structural.emergencyDoors) {
    addBox(
      'architecture',
      'surface-marking',
      [door.side === 'west' ? -29.42 : 29.42, 0.055, door.position[2]],
      [0.7, 0.02, 0.12],
      surfaceMetadata(`${door.id}-exit-floor-mark`, 'exit-sign'),
    );
  }
  for (const door of plan.structural.rearTechnical.serviceDoors) {
    addBox(
      'architecture',
      'surface-service',
      [door.position[0], 0.065, -19.82],
      [door.opening.clearWidth, 0.03, 0.12],
      surfaceMetadata(`${door.id}-service-floor-mark`, 'service-sign'),
    );
  }
  for (let index = 0; index < 12; index += 1) {
    const z = 8.5 - index * 2.25;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'surface-carpet',
        [direction * 1.45, 0.052, z],
        [2.25, 0.016, 0.085],
        surfaceMetadata(`corridor-carpet-chevron-${index + 1}-${direction}`, 'carpet-pattern'),
        direction * Math.PI * 0.18,
      );
    }
  }
  for (const room of plan.auditoriums) {
    const panelHeight = Math.min(3.8, room.height - 0.8);
    const minimumX = Math.min(...room.bounds.x) + 1.8;
    const maximumX = Math.max(...room.bounds.x) - 1.8;
    for (const [wallIndex, z] of [
      Math.min(...room.bounds.z) + 0.14,
      Math.max(...room.bounds.z) - 0.14,
    ].entries()) {
      for (let panelIndex = 0; panelIndex < 5; panelIndex += 1) {
        const x = minimumX + (maximumX - minimumX) * (panelIndex / 4);
        addBox(
          'architecture',
          panelIndex % 2 ? 'surface-seal' : 'surface-dark',
          [x, panelHeight / 2 + 0.35, z],
          [1.05, panelHeight, 0.09],
          surfaceMetadata(`${room.id}-acoustic-panel-${wallIndex + 1}-${panelIndex + 1}`, 'acoustic-panel-rhythm'),
        );
      }
    }
    for (const zDirection of [-1, 1]) {
      addBox(
        'architecture',
        'surface-marking',
        [centre(room.bounds.x), 0.175, centre(room.bounds.z) + zDirection * 0.62],
        [extent(room.bounds.x) - 2.6, 0.018, 0.055],
        surfaceMetadata(`${room.id}-aisle-edge-${zDirection}`, 'aisle-marking'),
      );
    }
    for (let markIndex = 0; markIndex < 6; markIndex += 1) {
      const t = (markIndex + 1) / 7;
      const west = room.bounds.x[1] < 0;
      const x = west
        ? room.bounds.x[1] - t * (extent(room.bounds.x) - 2.8)
        : room.bounds.x[0] + t * (extent(room.bounds.x) - 2.8);
      const z = centre(room.bounds.z) + ((markIndex % 3) - 1) * 1.15;
      addBox(
        'architecture',
        'surface-carpet',
        [x, 0.054, z],
        [1.35 + (markIndex % 2) * 0.35, 0.016, 0.055],
        surfaceMetadata(`${room.id}-carpet-breakup-${markIndex + 1}`, 'carpet-pattern'),
        (markIndex % 2 ? 1 : -1) * Math.PI * (0.08 + markIndex * 0.006),
      );
    }
  }

  // Own bucket: the public roof seams are clipped together with the public roof panel they belong to.
  for (const [index, z] of [11.2, 13.8, 16.4, 19, 21.6].entries()) {
    addBox(
      'roof',
      'roof-seam-charcoal',
      [0, 4.735, z],
      [59.2, 0.035, 0.045],
      surfaceMetadata(`public-roof-seam-${index + 1}`, 'roof-seam'),
    );
  }
  for (const room of plan.auditoriums) {
    addBox(
      'roof',
      'surface-dark',
      [centre(room.bounds.x), room.height + 0.235, centre(room.bounds.z)],
      [extent(room.bounds.x) - 0.8, 0.035, 0.05],
      surfaceMetadata(`${room.id}-roof-seam`, 'roof-seam'),
    );
  }
  for (const sleeve of plan.structural.containment.futureSleeves) {
    const [x, y, z] = sleeve.position;
    for (const [axis, direction] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]]) {
      const alongX = axis === 'x';
      addBox(
        'roof',
        'surface-marking',
        [x + (alongX ? direction * 0.38 : 0), y + 0.12, z + (!alongX ? direction * 0.38 : 0)],
        alongX ? [0.08, 0.24, 0.84] : [0.84, 0.24, 0.08],
        surfaceMetadata(`${sleeve.id}-curb-${axis}-${direction}`, 'roof-curb'),
      );
    }
    addBox(
      'roof',
      'surface-white',
      [x, y + 0.255, z],
      [0.42, 0.025, 0.12],
      surfaceMetadata(`${sleeve.id}-surface-marking`, 'containment-marking'),
    );
  }
  for (const route of plan.structural.roofService.routes) {
    const [x, , z] = route.plenum.position;
    for (const [axis, direction] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]]) {
      const alongX = axis === 'x';
      addBox(
        'roof',
        direction > 0 ? 'surface-white' : 'surface-service',
        [x + (alongX ? direction * 0.53 : 0), 8.285, z + (!alongX ? direction * 0.63 : 0)],
        alongX ? [0.08, 0.05, 1.32] : [1.12, 0.05, 0.08],
        surfaceMetadata(`${route.id}-flashing-${axis}-${direction}`, 'roof-curb'),
      );
    }
    for (const [markIndex, markZ] of [-10.9, -8.6, -6.7].entries()) {
      addBox(
        'roof',
        markIndex === 1 ? 'surface-white' : 'surface-marking',
        [x, 8.735, markZ],
        [0.98, 0.025, 0.09],
        surfaceMetadata(`${route.id}-service-band-${markIndex + 1}`, 'containment-marking'),
      );
    }
  }

  // Simple metre-scaled people make doors, counters and equipment readable without detail assets.
  for (const person of plan.structural.humanReferences) {
    const [x, groundY, z] = person.position;
    const legHeight = person.height * 0.42;
    const torsoHeight = person.height * 0.38;
    const headHeight = person.height * 0.16;
    for (const direction of [-1, 1]) {
      addBox(
        'architecture',
        'human-dark',
        [x + direction * 0.09, groundY + legHeight / 2, z],
        [0.13, legHeight, 0.16],
        { ...person.metadata, component: 'leg', side: direction },
      );
    }
    addBox(
      'architecture',
      'human-neutral',
      [x, groundY + legHeight + torsoHeight / 2, z],
      [0.42, torsoHeight, 0.22],
      { ...person.metadata, component: 'torso' },
    );
    addBox(
      'architecture',
      'human-neutral',
      [x, groundY + person.height - headHeight / 2, z],
      [0.25, headHeight, 0.25],
      { ...person.metadata, component: 'head' },
    );
  }

  // The first node of the canonical chain. The body keeps its true 100 mm width; readability is
  // carried by the dark-glass face, the emissive blue status ring and the ID chip, never by
  // inflating the device, exactly as the UC100 and UG67 endpoints already do.
  const TC300_RING_THICKNESS = 0.012;
  const TC300_FACE_DEPTH = 0.004;
  for (const device of plan.structural.devices.tc300) {
    const [x, y, z] = device.position;
    const [width, height, depth] = device.size;
    const faceZ = z + depth / 2 + TC300_FACE_DEPTH / 2;
    addBox('hvac', device.materialKey, device.position, device.size, device.metadata);
    addBox(
      'hvac',
      'tc-black',
      [x, y, faceZ],
      [width - TC300_RING_THICKNESS * 2, height - TC300_RING_THICKNESS * 2, TC300_FACE_DEPTH],
      surfaceMetadata(device.id, 'tc300-glass-face', ['HVAC-IOT-001'], {
        component: 'face',
        materialRole: 'dark-glass',
      }),
    );
    for (const [component, offsetX, offsetY, ringWidth, ringHeight] of [
      ['ring-top', 0, (height - TC300_RING_THICKNESS) / 2, width, TC300_RING_THICKNESS],
      ['ring-bottom', 0, -(height - TC300_RING_THICKNESS) / 2, width, TC300_RING_THICKNESS],
      ['ring-left', -(width - TC300_RING_THICKNESS) / 2, 0, TC300_RING_THICKNESS, height],
      ['ring-right', (width - TC300_RING_THICKNESS) / 2, 0, TC300_RING_THICKNESS, height],
    ]) {
      addBox(
        'hvac',
        'tc-blue',
        [x + offsetX, y + offsetY, faceZ],
        [ringWidth, ringHeight, TC300_FACE_DEPTH],
        surfaceMetadata(device.id, 'tc300-status-ring', ['HVAC-IOT-001'], { component }),
      );
    }
  }
  for (const device of plan.structural.devices.uc100) {
    addBox('hvac', device.materialKey, device.position, device.size, device.metadata);
  }
  const gateway = plan.structural.devices.ug67[0];
  addBox('hvac', gateway.materialKey, gateway.position, gateway.size, gateway.metadata);
  for (const antenna of plan.structural.containment.ug67AntennaRoots) {
    addBox('hvac', 'containment-orange', antenna.socketPosition, [0.045, 0.03, 0.045], {
      ...antenna.metadata,
      component: 'seated-socket-collar',
    });
    addBox('hvac', 'lorawan-blue', [
      antenna.socketPosition[0],
      antenna.socketPosition[1] + gateway.antennaLength / 2,
      antenna.socketPosition[2],
    ], [0.018, gateway.antennaLength, 0.018], {
      ...antenna.metadata,
      component: 'antenna',
    });
  }
  for (const root of plan.structural.containment.uc100BusRoots) {
    addBox('hvac', 'containment-orange', root.socketPosition, [0.12, 0.1, 0.1], root.metadata);
  }
  const ethernetPort = plan.structural.containment.ug67EthernetPort;
  addBox('hvac', 'ethernet-blue', ethernetPort.position, [0.06, 0.045, 0.035], ethernetPort.metadata);
  for (const node of plan.topologyProxies.external) {
    addBox('hvac', node.materialKey, node.position, node.size, node.metadata);
  }
  const mediaWidths = SURFACE_NETWORK_MEDIA.widths;
  for (const route of plan.structural.containment.rs485Routes) {
    addTrayPolyline(
      'rs485',
      'hood-steel',
      route.points,
      mediaWidths.rs485Tray,
      mediaWidths.rs485Trunk,
      { ...route.metadata, component: 'continuous-cable-tray' },
    );
    addAxisPolyline('rs485', 'rs485-green', route.points, mediaWidths.rs485Trunk, route.metadata);
    for (const point of route.points) {
      addBox('rs485', 'containment-orange', point, [0.2, 0.18, 0.2], {
        ...route.metadata,
        component: point === route.points[0] ? 'uc-terminal-contact' : 'tray-junction-contact',
      });
    }
    const arrowStart = route.points.at(-2);
    const arrowEnd = route.points.at(-1);
    addSurfaceArrowhead(
      'rs485',
      arrowStart,
      arrowEnd,
      `${route.id}-direction`,
    );
  }
  const tc300ById = new Map(plan.structural.devices.tc300.map((device) => [device.id, device]));
  for (const drop of plan.structural.containment.tc300Drops) {
    const device = tc300ById.get(drop.terminalOwner);
    // Render-only clip: the accepted route path is untouched, but its last centimetres stop on the
    // device face instead of running through the body, which used to be buried under the old cube.
    const faceTop = device.position[1] + device.size[1] / 2;
    const planPoints = drop.points.map(({ position }) => position);
    const points = [
      ...planPoints.slice(0, -1),
      [device.position[0], faceTop, device.position[2]],
    ];
    addTrayPolyline(
      'rs485',
      'hood-steel',
      points,
      mediaWidths.rs485DropTray,
      mediaWidths.rs485Drop,
      { ...drop.metadata, component: 'drop-cable-tray' },
    );
    addAxisPolyline('rs485', 'rs485-green', points, mediaWidths.rs485Drop, {
      ...drop.metadata,
      terminalOwner: drop.terminalOwner,
    });
    addBox('rs485', 'containment-orange', points[0], [0.18, 0.14, 0.18], {
      ...drop.metadata,
      component: 'tray-junction',
    });
    // Terminal cue: a gland caps the cable ON the device face, so the drop lands on a thermostat.
    // It belongs to the containment layer, so hiding the cabling leaves a clean device behind.
    addBox(
      'rs485',
      'containment-orange',
      [device.position[0], faceTop + 0.015, device.position[2]],
      [0.05, 0.03, 0.05],
      surfaceMetadata(device.id, 'tc300-terminal-gland', ['HVAC-IOT-003'], {
        component: 'cable-gland',
        terminalOwner: device.id,
      }),
    );
  }
  for (const crossing of plan.structural.containment.wallCrossings) {
    addBox('rs485', 'containment-orange', crossing.position, crossing.size, crossing.metadata);
  }
  // RF is drawn as short marks with longer gaps, at a period derived from each lane's own length,
  // so it can never be confused with the continuous Ethernet tube beside it.
  for (const [linkIndex, link] of plan.topologyProxies.lorawanLinks.entries()) {
    const points = [link.start, ...link.via, link.renderEnd];
    let terminalDashPolicy = null;
    for (let index = 0; index < points.length - 1; index += 1) {
      const laneLength = Math.hypot(
        ...points[index + 1].map((value, axis) => value - points[index][axis]),
      );
      const dashCount = resolveDashCount(laneLength);
      addDashedSegment('lorawan', 'lorawan-blue', points[index], points[index + 1], mediaWidths.lorawan, {
        ...link.metadata,
        laneSegment: index,
      }, dashCount);
      if (index === points.length - 2) {
        terminalDashPolicy = { dashCount, dashCoverage: SURFACE_LORAWAN_DASH.dutyCycle };
      }
    }
    const arrowStart = points.at(-2);
    const arrowEnd = points.at(-1);
    // Snap the requested sample onto the dash that owns it, then prove the arrowhead touches it.
    const terminalT = snapSampleToDashCentre(
      [0.15, 0.29, 0.43, 0.575][linkIndex],
      terminalDashPolicy,
    );
    if (!isDirectionMarkerSampleVisibleOnDashedRoute(terminalT, terminalDashPolicy)) {
      throw new RangeError(`LoRa direction marker ${link.id} must touch a rendered dash.`);
    }
    addSurfaceArrowhead(
      'lorawan',
      arrowStart,
      arrowEnd,
      `${link.id}-direction`,
      { terminalT, dashPolicy: terminalDashPolicy },
    );
  }
  const chain = plan.topologyProxies.ipChain;
  addAxisPolyline(
    'internet',
    'ethernet-blue',
    plan.structural.containment.ug67EthernetRoute.points,
    mediaWidths.ethernetRoute,
    plan.structural.containment.ug67EthernetRoute.metadata,
  );
  addSurfaceArrowhead(
    'internet',
    plan.structural.containment.ug67EthernetRoute.points.at(-2),
    plan.structural.containment.ug67EthernetRoute.points.at(-1),
    'ug67-niagara-direction',
  );
  for (let index = 1; index < chain.points.length - 1; index += 1) {
    addSegment('internet', 'ethernet-blue', chain.points[index], chain.points[index + 1], mediaWidths.ethernetChain, {
      ...chain.metadata,
      segmentIndex: index,
    });
  }
  for (const branch of chain.clientBranches) {
    addSegment('internet', 'ethernet-blue', branch.start, branch.end, mediaWidths.ethernetRoute, chain.metadata);
  }

  // One generated atlas and six merged batches cover all wordmarks, signs, posters
  // and menu frames. This avoids one texture and one draw call per graphic.
  const screenSurfaceEntries = (frame) => plan.auditoriums.map((room) => {
    const proxy = plan.blockoutProxies.auditoriums.find(({ auditoriumId }) => auditoriumId === room.id);
    const west = room.bounds.x[1] < 0;
    const screenX = west ? room.bounds.x[0] + 0.55 : room.bounds.x[1] - 0.55;
    return {
      id: `${room.id}-screen-content-${frame}`,
      tile: `screen-${frame}`,
      position: [screenX + (west ? 0.101 : -0.101), 0.3 + proxy.screenSize[1] / 2, centre(room.bounds.z)],
      size: [proxy.screenSize[2] * 0.9, proxy.screenSize[1] * 0.88],
      rotationY: west ? Math.PI / 2 : -Math.PI / 2,
      metadata: surfaceMetadata(`${room.id}-screen-content-${frame}`, 'screen-content', REQUIREMENT_ARCHITECTURE, { frame }),
    };
  });
  const atlasBatchDefinitions = {
    identity: [{
      id: 'facade-cinemex-word-sign', tile: 'cinemex',
      position: [0, 5.18, 23.185], size: [11.8, 0.78], rotationY: 0,
      metadata: surfaceMetadata('facade-cinemex-word-sign', 'facade-word-sign', REQUIREMENT_FACADE),
    }],
    labels: [
      ...plan.portals.map((portal) => ({
        id: `${portal.id}-room-number-plate`,
        tile: `room-${portal.metadata.roomNumber}`,
        position: [portal.side === 'west' ? -3.54 : 3.54, 3.03, portal.position[2]],
        size: [0.62, 0.62],
        rotationY: portal.side === 'west' ? Math.PI / 2 : -Math.PI / 2,
        metadata: surfaceMetadata(`${portal.id}-room-number-plate`, 'room-number'),
      })),
      ...plan.structural.rearTechnical.serviceDoors.map((door) => ({
        id: `${door.id}-service-sign`, tile: 'service',
        position: [door.position[0], 2.55, -19.96], size: [1.35, 0.45], rotationY: 0,
        metadata: surfaceMetadata(`${door.id}-service-sign`, 'service-sign'),
      })),
      ...plan.structural.emergencyDoors.map((door) => ({
        id: `${door.id}-exit-sign`, tile: 'exit',
        position: [door.side === 'west' ? -29.84 : 29.84, 2.62, door.position[2]],
        size: [1.05, 0.42],
        rotationY: door.side === 'west' ? Math.PI / 2 : -Math.PI / 2,
        metadata: surfaceMetadata(`${door.id}-exit-sign`, 'exit-sign'),
      })),
      ...plan.structural.containment.wallCrossings.slice(0, 4).map((crossing) => ({
        id: `${crossing.id}-marking`, tile: 'rs485',
        position: [crossing.position[0] + (crossing.position[0] < 0 ? 0.16 : -0.16), 2.12, crossing.position[2]],
        size: [0.7, 0.25],
        rotationY: crossing.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
        metadata: surfaceMetadata(`${crossing.id}-marking`, 'containment-marking'),
      })),
      ...plan.wayfinding.corridorExitSigns.map((sign) => ({
        id: sign.id,
        tile: sign.tile,
        position: [...sign.position],
        size: [...sign.size],
        rotationY: sign.rotationY,
        metadata: surfaceMetadata(sign.id, 'wayfinding-marking'),
      })),
    ],
    ...Object.fromEntries([0, 1].map((frame) => [`poster${frame}`, [
      ...plan.portals.map((portal, index) => ({
        id: `${portal.id}-poster-frame-${frame}`,
        tile: `poster-${frame}${POSTER_VARIANTS[index % POSTER_VARIANTS.length]}`,
        position: [portal.side === 'west' ? -3.545 : 3.545, 1.35, portal.position[2] + 1.65],
        size: [1.05, 1.5],
        rotationY: portal.side === 'west' ? Math.PI / 2 : -Math.PI / 2,
        metadata: surfaceMetadata(`${portal.id}-poster-frame-${frame}`, 'poster-placeholder', REQUIREMENT_ARCHITECTURE, { frame }),
      })),
      ...plan.facade.posterBank.panels.map((panel) => ({
        id: `${panel.id}-frame-${frame}`,
        tile: `poster-${frame}${panel.variant}`,
        position: [...panel.position],
        size: [...panel.size],
        rotationY: 0,
        metadata: surfaceMetadata(`${panel.id}-frame-${frame}`, 'poster-placeholder', REQUIREMENT_FACADE, { frame }),
      })),
    ]])),
    ...Object.fromEntries([0, 1].map((frame) => [`display${frame}`, [
      ...plan.frontOfHouseSurfaces.menuBoards.map((board) => ({
        id: `${board.id}-frame-${frame}`,
        tile: [`display-${frame}`, `display-${frame}b`, `display-${frame}c`][board.style],
        position: [...board.position],
        size: [...board.size],
        rotationY: 0,
        metadata: surfaceMetadata(`${board.id}-frame-${frame}`, 'menu-display', REQUIREMENT_FACADE, { frame }),
      })),
      ...screenSurfaceEntries(frame),
    ]])),
  };
  const surfacePlacements = Object.entries(atlasBatchDefinitions).flatMap(([batchName, entries]) => (
    entries.map((entry) => Object.freeze({
      id: entry.id,
      kind: entry.metadata.kind,
      parentLayer: batchName === 'labels' ? 'labels' : 'architecture',
      localSpace: 'world-root',
      visibilityOnly: true,
      position: [...entry.position],
      size: [...entry.size],
      rotationY: entry.rotationY ?? 0,
    }))
  ));
  validateSurfacePlacements(surfacePlacements);

  const dummy = new THREE.Object3D();
  const directionMarkerAxis = new THREE.Vector3(0, 0, 1);
  for (const bucket of buckets.values()) {
    const zoneMaterial = resolveZoneMaterial(bucket.materialKey, bucket.zone);
    const mesh = new THREE.InstancedMesh(sharedGeometry, zoneMaterial, bucket.instances.length);
    mesh.name = bucket.zone === 'exterior'
      ? `structural-${bucket.layer}-${bucket.materialKey}`
      : `structural-${bucket.layer}-${bucket.materialKey}-${bucket.zone}`;
    mesh.userData = {
      assetId: ARCHITECTURE_ASSET_ID,
      pass: 'structural',
      layer: bucket.layer,
      materialKey: bucket.materialKey,
      lightingZone: bucket.zone,
      zoneDim: resolveZoneDim(bucket.zone),
      entities: bucket.instances.map(({ metadata: entityMetadata }, instanceId) => ({ instanceId, ...entityMetadata })),
    };
    bucket.instances.forEach((instance, index) => {
      dummy.position.set(...instance.position);
      dummy.rotation.set(0, instance.rotationY, 0);
      dummy.scale.set(...instance.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = bucket.layer !== 'zones';
    mesh.receiveShadow = bucket.layer !== 'labels';
    mesh.userData.instances = bucket.instances;
    groups[bucket.layer].add(mesh);
    meshes.push(mesh);
  }

  // Registered only now: the zone variants do not exist until the buckets have been emitted, and
  // every one of them must still go translucent in the engineering state.
  materialRegistry?.registerCutawayMaterials?.(
    cutawayMaterialKeys.flatMap((key) => materialsForKey(key)),
  );

  for (const [layer, instances] of directionMarkerBuckets) {
    const mesh = new THREE.InstancedMesh(
      directionMarkerGeometry,
      materials[SURFACE_DIRECTION_MARKER.materialKey],
      instances.length,
    );
    mesh.name = `surface-${layer}-single-arrowheads`;
    mesh.userData = {
      assetId: ARCHITECTURE_ASSET_ID,
      pass: 'surface',
      entities: instances.map(({ metadata: entityMetadata }, instanceId) => ({ instanceId, ...entityMetadata })),
      instancesPerMarker: SURFACE_DIRECTION_MARKER.instancesPerMarker,
      geometryRole: SURFACE_DIRECTION_MARKER.geometry,
      baseLength: SURFACE_DIRECTION_MARKER.length,
      baseRadius: SURFACE_DIRECTION_MARKER.radius,
      projectedMinPx: SURFACE_DIRECTION_MARKER.projectedMinPx,
      projectedMaxPx: SURFACE_DIRECTION_MARKER.projectedMaxPx,
      placements: instances,
    };
    instances.forEach((instance, index) => {
      const transform = createDirectionMarkerViewTransform(instance, 1);
      dummy.position.set(...transform.position);
      dummy.quaternion.setFromUnitVectors(
        directionMarkerAxis,
        new THREE.Vector3(...transform.axis),
      );
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = SURFACE_DIRECTION_MARKER.renderOrder;
    mesh.frustumCulled = false;
    groups[layer].add(mesh);
    meshes.push(mesh);
    directionMarkerMeshes.push(mesh);
  }

  // The RTU condenser-fan circles: the one part of the packaged-unit silhouette a box cannot carry.
  // One flat dark cylinder (the fan opening) and one light guard ring per unit, instanced 14× each,
  // both on the `roof` layer so they hide with the roof exactly like the cabinets under them.
  const rtuFanGeometries = [];
  {
    const rtuUnits = plan.structural.roofService.packagedUnits;
    const fanGeometry = new THREE.CylinderGeometry(
      RTU_PACKAGE.fan.radius,
      RTU_PACKAGE.fan.radius,
      RTU_PACKAGE.fan.height,
      24,
    );
    const guardGeometry = new THREE.TorusGeometry(RTU_PACKAGE.fan.radius * 0.92, 0.028, 8, 28)
      .rotateX(Math.PI / 2);
    rtuFanGeometries.push(fanGeometry, guardGeometry);
    for (const [name, geometry, materialKey, lift] of [
      ['rtu-fan-pool', fanGeometry, 'rtu-dark', 1.51 + RTU_PACKAGE.fan.height / 2],
      ['rtu-fan-guard-pool', guardGeometry, 'rtu-cabinet', 1.51 + RTU_PACKAGE.fan.height + 0.03],
    ]) {
      const mesh = new THREE.InstancedMesh(geometry, materials[materialKey], rtuUnits.length);
      mesh.name = `structural-roof-${name}`;
      mesh.userData = {
        assetId: ARCHITECTURE_ASSET_ID,
        pass: 'structural',
        layer: 'roof',
        materialKey,
        lightingZone: 'exterior',
        zoneDim: resolveZoneDim('exterior'),
        instances: rtuUnits.map((unit) => ({
          layer: 'roof',
          materialKey,
          zone: 'exterior',
          // The fan bay sits over the condenser end of the cabinet, on the dark top cap.
          position: [unit.position[0] + 0.55, unit.position[1] + lift, unit.position[2]],
          size: [1, 1, 1],
          rotationY: 0,
          mediaWidth: 0,
          mediaOffset: null,
          metadata: structuralMetadata(
            `${unit.id}-${name === 'rtu-fan-pool' ? 'condenser-fan' : 'fan-guard'}`,
            name === 'rtu-fan-pool' ? 'rtu-condenser-fan' : 'rtu-fan-guard',
            REQUIREMENT_ARCHITECTURE,
            { rtuId: unit.id, tc300Id: unit.tc300Id, zoneId: unit.zoneId },
          ),
        })),
      };
      mesh.userData.entities = mesh.userData.instances.map(
        ({ metadata: entityMetadata }, instanceId) => ({ instanceId, ...entityMetadata }),
      );
      mesh.userData.instances.forEach((instance, index) => {
        dummy.position.set(...instance.position);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      groups.roof.add(mesh);
      meshes.push(mesh);
    }
  }

  function createAtlasBatch(name, entries, layer) {
    if (!entries.length || !surfaceAtlas || !surfaceAtlasMaterial) return null;
    const positions = [];
    const uvs = [];
    for (const entry of entries) {
      const tile = surfaceAtlas.tiles[entry.tile];
      const halfWidth = entry.size[0] / 2;
      const halfHeight = entry.size[1] / 2;
      const cosine = Math.cos(entry.rotationY ?? 0);
      const sine = Math.sin(entry.rotationY ?? 0);
      const corners = [
        [-halfWidth, -halfHeight, tile.u0, tile.v0],
        [halfWidth, -halfHeight, tile.u1, tile.v0],
        [halfWidth, halfHeight, tile.u1, tile.v1],
        [-halfWidth, halfHeight, tile.u0, tile.v1],
      ];
      for (const cornerIndex of [0, 1, 2, 0, 2, 3]) {
        const [localX, localY, u, v] = corners[cornerIndex];
        positions.push(
          entry.position[0] + cosine * localX,
          entry.position[1] + localY,
          entry.position[2] - sine * localX,
        );
        uvs.push(u, v);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, surfaceAtlasMaterial);
    mesh.name = `surface-atlas-${name}`;
    mesh.renderOrder = layer === 'labels' ? 850 : 30;
    mesh.userData = {
      assetId: ARCHITECTURE_ASSET_ID,
      pass: 'surface',
      batch: name,
      entities: entries.map(({ metadata: entityMetadata }) => entityMetadata),
      placements: surfacePlacements.filter(({ id }) => entries.some((entry) => entry.id === id)),
    };
    groups[layer].add(mesh);
    surfaceMeshes.push(mesh);
    return mesh;
  }

  const canvasDocument = globalThis.document;
  const frameMeshes = { poster: {}, display: {} };
  if (
    canvasDocument
    && THREE.CanvasTexture
    && THREE.MeshBasicMaterial
    && THREE.BufferGeometry
    && THREE.Float32BufferAttribute
    && THREE.Mesh
  ) {
    surfaceAtlas = createSurfaceAtlas({ THREE, documentObject: canvasDocument, anisotropy: 4 });
    surfaceAtlasMaterial = new THREE.MeshBasicMaterial({
      map: surfaceAtlas.texture,
      transparent: false,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    createAtlasBatch('identity', atlasBatchDefinitions.identity, 'architecture');
    createAtlasBatch('labels', atlasBatchDefinitions.labels, 'labels');
    frameMeshes.poster[0] = createAtlasBatch('poster-0', atlasBatchDefinitions.poster0, 'architecture');
    frameMeshes.poster[1] = createAtlasBatch('poster-1', atlasBatchDefinitions.poster1, 'architecture');
    frameMeshes.display[0] = createAtlasBatch('display-0', atlasBatchDefinitions.display0, 'architecture');
    frameMeshes.display[1] = createAtlasBatch('display-1', atlasBatchDefinitions.display1, 'architecture');
  }

  // Screen-facing labels preserve true device geometry scale while making counts auditable.
  if (canvasDocument && THREE.Sprite && THREE.SpriteMaterial && THREE.CanvasTexture) {
    for (const label of [...plan.billboards.architecture, ...plan.billboards.technical]) {
      const canvas = canvasDocument.createElement('canvas');
      canvas.width = 768;
      canvas.height = 192;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.shadowColor = label.accent;
      context.shadowBlur = 28;
      context.fillStyle = 'rgba(2, 6, 23, 0.92)';
      context.strokeStyle = label.accent;
      context.lineWidth = 12;
      context.beginPath();
      context.roundRect(18, 18, canvas.width - 36, canvas.height - 36, 34);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#f8fafc';
      context.font = `800 ${label.text.length > 12 ? 58 : 72}px system-ui, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label.text, canvas.width / 2, canvas.height / 2 + 3);

      const texture = new THREE.CanvasTexture(canvas);
      if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `structural-billboard-${label.id}`;
      sprite.position.set(...label.position);
      sprite.scale.set(label.scale[0], label.scale[1], 1);
      sprite.renderOrder = 1000;
      sprite.frustumCulled = false;
      sprite.userData = {
        ...label.metadata,
        billboardKind: label.kind,
        text: label.text,
        halo: label.halo,
        visibilityScope: label.visibilityScope,
        basePosition: [...label.position],
        baseScale: [...label.scale],
        baseRenderOrder: 1000,
        activeScaleFactor: 1,
      };
      groups.labels.add(sprite);
      billboardSprites.push(sprite);
    }
  }

  const networkSchematic = createNetworkSchematicComposition({
    THREE,
    groups,
    documentObject: canvasDocument,
    appConfig: APP_CONFIG,
    architecturePlan: plan,
  });
  // Zone variants split a bucket into several meshes, so these sets are resolved from the bucket's
  // own layer/material identity rather than from a name that a zone suffix can move.
  const denseNetworkMeshes = meshes.filter((mesh) => (
    ['rs485', 'lorawan', 'internet', 'zones'].includes(mesh.userData.layer)
      || /^surface-(?:rs485|lorawan|internet)-/.test(mesh.name)
  ));
  const networkMediaMeshes = meshes.filter((mesh) => (
    Array.isArray(mesh.userData.instances)
      && mesh.userData.instances.some(({ mediaWidth }) => mediaWidth > 0)
  ));
  const publicRoofMeshes = meshes.filter((mesh) => (
    mesh.userData.layer === 'roof'
      && ['public-roof', 'roof-seam-charcoal'].includes(mesh.userData.materialKey)
  ));
  /** The rear service roof, clipped for the technical preset the way the public roof is clipped. */
  const rearRoofMeshes = meshes.filter((mesh) => (
    mesh.userData.layer === 'roof' && mesh.userData.materialKey === 'rear-roof'
  ));
  /**
   * P6 correction P2: the external schematic endpoint proxies (router/internet/Niagara/PC/tablet/
   * smartphone) are network evidence. `visual_states.architecture` hides the network, so these
   * proxies rendered as unlabeled floating boxes in every architecture capture. Each proxy owns its
   * bucket (unique `endpoint-*` material key), so the filter is exact.
   */
  const externalProxyMeshes = meshes.filter((mesh) => (
    mesh.userData.layer === 'hvac' && String(mesh.userData.materialKey).startsWith('endpoint-')
  ));
  /** The dark interior soffits: architectural state only, so engineering keeps seeing the ceiling. */
  const interiorCeilingMeshes = meshes.filter((mesh) => mesh.userData.materialKey === 'interior-ceiling');
  let activeMediaWidthCamera = null;

  /** The transform one instance renders at, at the CURRENT evidence camera. One authority. */
  function resolveInstanceTransform(instance, cameraName = activeMediaWidthCamera) {
    const scale = resolveNetworkMediaWidthScale(cameraName, instance.materialKey);
    const base = instance.mediaWidth;
    const size = base > 0
      ? instance.size.map((value) => (value <= base * 1.001 ? value * scale : value))
      : instance.size;
    // A tray's stand-off scales with its own cross-section, so it can never close over the
    // conductor it carries: the two faces stay tangent at every evidence scale.
    const position = instance.mediaOffset
      ? instance.position.map((value, axis) => (
        value - instance.mediaOffset[axis] + instance.mediaOffset[axis] * scale
      ))
      : instance.position;
    return { position, size, rotationY: instance.rotationY };
  }

  function writeInstanceMatrix(mesh, index, { position, size, rotationY = 0 }, hidden = false) {
    dummy.position.set(...position);
    dummy.rotation.set(0, rotationY, 0);
    if (hidden) dummy.scale.set(0, 0, 0);
    else dummy.scale.set(...size);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  /**
   * True media cross-sections vanish below one pixel at the complete-network distance. Only the
   * cross-section is widened; every route position, length and terminal contact is preserved.
   * The widening is resolved PER MEDIUM: a dash that is widened like a continuous tube stops
   * being a dash and becomes a bead.
   */
  function setNetworkMediaWidthScale(cameraName) {
    if (cameraName === activeMediaWidthCamera) return activeMediaWidthCamera;
    for (const mesh of networkMediaMeshes) {
      mesh.userData.instances.forEach((instance, index) => {
        writeInstanceMatrix(mesh, index, resolveInstanceTransform(instance, cameraName));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere?.();
    }
    activeMediaWidthCamera = cameraName;
    return cameraName;
  }

  // -------------------------------------------------------------------------
  // INTERACTION-UI: selection, fault colours, alarm halos and the fixed packet pool.
  //
  // Nothing below invents a topology, a material colour or a route. The statuses come from
  // `createInteractionModel` (which derives them from the one simulation/topology pair), the
  // colours are the gated `alarm_red` / `offline_gray` palette entries and the media's own
  // emissive channel, and every packet rides a route the structural pass already accepted.
  //
  // A recoloured instance is REMOVED from its base mesh (zero scale) and re-emitted into a status
  // overlay mesh at the same transform, so a fault can never double-draw or z-fight the healthy
  // geometry it replaces, and a restore is exact.
  // -------------------------------------------------------------------------
  const STATUS_LAYERS = Object.freeze(['hvac', 'rs485', 'lorawan', 'internet']);
  const MEDIA_SPEC_BY_KEY = Object.freeze({
    'rs485-green': 'rs485Green',
    'lorawan-blue': 'lorawanBlue',
    'ethernet-blue': 'ethernetBlue',
  });
  const DEVICE_STATUS_KEYS = Object.freeze([
    'tc-black', 'tc-blue', 'uc-white', 'gateway-dark',
    'endpoint-router', 'endpoint-cloud', 'endpoint-server',
    'endpoint-pc', 'endpoint-tablet', 'endpoint-phone',
  ]);
  const EXTERNAL_PROXY_OWNER = Object.freeze({
    'router-firewall-proxy': 'router-firewall',
    'internet-cloud-proxy': 'internet',
    'niagara-server-proxy': 'niagara-supervisor',
    'pc-proxy': 'client-pc',
    'tablet-proxy': 'client-tablet',
    'phone-proxy': 'client-smartphone',
  });
  const STATUS_DEVICE_IDS = new Set([
    ...TC300_DEVICES.map(({ id }) => id),
    ...UC100_DEVICES.map(({ id }) => id),
    ...GATEWAYS.map(({ id }) => id),
  ]);
  const STATUS_ROUTE_IDS = new Set([
    ...TC300_DEVICES.map(({ id }) => routeIds.drop(id)),
    ...UC100_DEVICES.flatMap(({ id }) => [routeIds.trunk(id), routeIds.lorawan(id)]),
    routeIds.gatewayEthernet,
    routeIds.ipChain,
  ]);

  function resolveStatusOwner(entityId) {
    if (STATUS_DEVICE_IDS.has(entityId)) return { statusOwner: entityId, statusKind: 'device' };
    if (STATUS_ROUTE_IDS.has(entityId)) return { statusOwner: entityId, statusKind: 'route' };
    if (EXTERNAL_PROXY_OWNER[entityId]) {
      return { statusOwner: EXTERNAL_PROXY_OWNER[entityId], statusKind: 'device' };
    }
    // The antennas and the RJ45 port are parts of the gateway body, and fail with it.
    if (typeof entityId === 'string' && entityId.startsWith('UG67-01')) {
      return { statusOwner: 'UG67-01', statusKind: 'device' };
    }
    return null;
  }

  const statusRecords = [];
  for (const mesh of meshes) {
    const { layer, materialKey } = mesh.userData;
    if (!STATUS_LAYERS.includes(layer)) continue;
    const media = Boolean(MEDIA_SPEC_BY_KEY[materialKey]);
    if (!media && !DEVICE_STATUS_KEYS.includes(materialKey)) continue;
    (mesh.userData.instances ?? []).forEach((instance, index) => {
      const owner = resolveStatusOwner(instance.metadata?.entityId);
      if (!owner) return;
      const record = {
        mesh, index, instance, layer, materialKey, media, ...owner,
      };
      statusRecords.push(record);
      // The picker reads the selection back off the same table the builder emitted.
      const entity = mesh.userData.entities?.[index];
      if (entity) entity.statusOwner = owner.statusKind === 'device' ? owner.statusOwner : undefined;
    });
  }

  function statusMaterial(key, spec) {
    if (materialRegistry?.getMaterial) return materialRegistry.getMaterial(key, spec);
    const { type, ...parameters } = spec;
    const MaterialClass = type === 'physical' && THREE.MeshPhysicalMaterial
      ? THREE.MeshPhysicalMaterial
      : THREE.MeshStandardMaterial;
    const material = new MaterialClass(parameters);
    ownedMaterials.push(material);
    return material;
  }

  const INTERACTION_HIGHLIGHT_GAIN = 3;
  const alarmMaterial = statusMaterial('interaction:alarm', MATERIAL_SPECS.alarmRed);
  const offlineMaterial = statusMaterial('interaction:offline', MATERIAL_SPECS.offlineGray);
  const alarmHaloMaterial = statusMaterial('interaction:alarm-halo', {
    ...MATERIAL_SPECS.alarmRed,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const zoneHaloMaterial = statusMaterial('interaction:alarm-zone', {
    ...MATERIAL_SPECS.alarmRed,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  // The selection cue is the schematic's own cyan model-link colour, so a highlighted endpoint and
  // the board that names it read as the same system. It never replaces a media colour.
  const selectionHaloMaterial = statusMaterial('interaction:selection-halo', {
    type: 'standard',
    color: 0x22d3ee,
    metalness: 0,
    roughness: 0.3,
    emissive: 0x0891b2,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  /** The selected path glows in ITS OWN medium colour: emission is boosted, hue is untouched. */
  const highlightMaterials = Object.fromEntries(Object.entries(MEDIA_SPEC_BY_KEY).map(([key, spec]) => [
    key,
    statusMaterial(`interaction:highlight-${key}`, {
      ...MATERIAL_SPECS[spec],
      emissiveIntensity: (MATERIAL_SPECS[spec].emissiveIntensity ?? 0.4) * INTERACTION_HIGHLIGHT_GAIN,
    }),
  ]));

  const haloGeometry = new THREE.TorusGeometry(1, 0.06, 8, 32);

  function createPool(name, layer, geometry, material, capacity) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, capacity));
    mesh.name = `interaction-${name}`;
    mesh.count = 0;
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 900;
    mesh.userData = {
      assetId: ARCHITECTURE_ASSET_ID,
      pass: 'interaction-ui',
      pool: name,
      layer,
      capacity: Math.max(1, capacity),
      entries: [],
    };
    groups[layer].add(mesh);
    interactionMeshes.push(mesh);
    return mesh;
  }

  const interactionMeshes = [];
  const overlayMeshes = new Map();
  for (const layer of STATUS_LAYERS) {
    const capacity = statusRecords.filter((record) => record.layer === layer).length;
    overlayMeshes.set(`${layer}:alarm`, createPool(`${layer}-alarm-overlay`, layer, sharedGeometry, alarmMaterial, capacity));
    overlayMeshes.set(`${layer}:offline`, createPool(`${layer}-offline-overlay`, layer, sharedGeometry, offlineMaterial, capacity));
    if (layer === 'hvac') continue;
    const key = { rs485: 'rs485-green', lorawan: 'lorawan-blue', internet: 'ethernet-blue' }[layer];
    overlayMeshes.set(`${layer}:selected`, createPool(`${layer}-selected-overlay`, layer, sharedGeometry, highlightMaterials[key], capacity));
  }

  const alarmHaloMesh = createPool('alarm-halo-pool', 'hvac', haloGeometry, alarmHaloMaterial, STATUS_DEVICE_IDS.size + 6);
  const selectionHaloMesh = createPool('selection-halo-pool', 'hvac', haloGeometry, selectionHaloMaterial, 16);
  const zoneHaloMesh = createPool('alarm-zone-pool', 'zones', sharedGeometry, zoneHaloMaterial, APP_CONFIG.zones.length);
  const waveRingMesh = createPool('lorawan-wave-rings', 'lorawan', haloGeometry, highlightMaterials['lorawan-blue'], INTERACTION_WAVE_RINGS.count);

  /** Every device the halos and the picker can address, with the point they are anchored on. */
  const devicePositions = new Map([
    ...plan.structural.devices.tc300.map(({ id, position }) => [id, position]),
    ...plan.structural.devices.uc100.map(({ id, position }) => [id, position]),
    [GATEWAYS[0].id, plan.structural.devices.ug67[0].position],
    ...plan.topologyProxies.external.map(({ id, position }) => [
      EXTERNAL_PROXY_OWNER[id], position,
    ]),
  ]);

  /**
   * The FIXED packet pool. Every packet is one route, one phase and one medium, resolved from the
   * accepted route geometry — so a packet can never travel where a cable does not.
   */
  const packetDefinitions = [];
  const pushPacket = (medium, routeId, points, phase) => {
    packetDefinitions.push({
      id: `packet-${routeId}-${packetDefinitions.length}`, medium, routeId, points, phase,
    });
  };
  for (const [index, drop] of plan.structural.containment.tc300Drops.entries()) {
    // Data flows from the thermostat to its concentrator: the drop is walked device → junction.
    const points = drop.points.map(({ position }) => position).slice().reverse();
    pushPacket('rs485', routeIds.drop(drop.terminalOwner), points, (index % 7) / 7);
  }
  for (const [index, route] of plan.structural.containment.rs485Routes.entries()) {
    const points = route.points.slice().reverse();
    for (const phase of [0, 0.5]) {
      pushPacket('rs485', routeIds.trunk(route.terminalOwner), points, (phase + index * 0.12) % 1);
    }
  }
  for (const [index, link] of plan.topologyProxies.lorawanLinks.entries()) {
    pushPacket('lorawan', routeIds.lorawan(link.from), [link.start, ...link.via, link.renderEnd], index / 4);
  }
  pushPacket('ethernet', routeIds.gatewayEthernet, plan.structural.containment.ug67EthernetRoute.points, 0.2);
  for (const phase of [0.1, 0.6]) {
    pushPacket('ethernet', routeIds.ipChain, plan.topologyProxies.ipChain.points.slice(1), phase);
  }
  for (const [index, branch] of plan.topologyProxies.ipChain.clientBranches.entries()) {
    pushPacket('ethernet', routeIds.ipChain, [branch.start, branch.end], 0.25 + index * 0.2);
  }

  const PACKET_LAYER = Object.freeze({ rs485: 'rs485', lorawan: 'lorawan', ethernet: 'internet' });
  const PACKET_MATERIAL_KEY = Object.freeze({ rs485: 'rs485-green', lorawan: 'lorawan-blue', ethernet: 'ethernet-blue' });
  const PACKET_BASE_SIZE = 0.34;
  const packetMeshes = Object.fromEntries(Object.entries(PACKET_LAYER).map(([medium, layer]) => [
    medium,
    createPool(
      `${medium}-packet-pool`,
      layer,
      sharedGeometry,
      highlightMaterials[PACKET_MATERIAL_KEY[medium]],
      packetDefinitions.filter((packet) => packet.medium === medium).length,
    ),
  ]));

  let interactionModel = createInteractionModel({ state: 'architecture', tick: 0, selection: 'none' });
  let densePhysicalNetwork = true;

  let statusFingerprint = null;
  let statusSummary = { alarm: 0, offline: 0, selected: 0, suppressed: 0 };

  function applyInteraction() {
    const model = interactionModel;
    // Statuses only move when the state, the selection or the media cross-section moves. The tick
    // moves every frame, so the per-instance status pass is fingerprinted out of the animation.
    const fingerprint = `${model.state}|${model.selection}|${activeMediaWidthCamera}|${densePhysicalNetwork}`;
    if (fingerprint !== statusFingerprint) {
      statusSummary = applyStatusOverlays(model);
      statusFingerprint = fingerprint;
    }
    return applyAnimationPools(model, statusSummary);
  }

  function applyStatusOverlays(model) {
    const overlayEntries = new Map();
    for (const key of overlayMeshes.keys()) overlayEntries.set(key, []);
    const suppressed = new Set();

    for (const record of statusRecords) {
      const status = record.statusKind === 'device'
        ? model.deviceStatus[record.statusOwner]
        : model.routeStatus[record.statusOwner];
      let bucket = null;
      if (status === 'alarm') bucket = 'alarm';
      else if (status === 'unreachable' || status === 'blocked') bucket = 'offline';
      else if (record.media && model.selectionPath.routeIds.includes(record.statusOwner)) bucket = 'selected';
      if (!bucket) continue;
      const key = `${record.layer}:${bucket}`;
      if (!overlayEntries.has(key)) continue;
      overlayEntries.get(key).push(record);
      suppressed.add(record);
    }

    for (const record of statusRecords) {
      writeInstanceMatrix(
        record.mesh,
        record.index,
        resolveInstanceTransform(record.instance),
        suppressed.has(record),
      );
      record.mesh.instanceMatrix.needsUpdate = true;
    }

    const counts = { alarm: 0, offline: 0, selected: 0 };
    for (const [key, entries] of overlayEntries) {
      const mesh = overlayMeshes.get(key);
      const status = key.split(':')[1];
      counts[status] += entries.length;
      entries.forEach((record, index) => {
        writeInstanceMatrix(mesh, index, resolveInstanceTransform(record.instance));
      });
      mesh.count = entries.length;
      mesh.visible = entries.length > 0 && densePhysicalNetwork;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.entries = entries.map(({ instance, materialKey, statusOwner }) => ({
        entityId: instance.metadata?.entityId,
        statusOwner,
        materialKey,
      }));
      mesh.computeBoundingSphere?.();
    }
    return { ...counts, suppressed: suppressed.size };
  }

  function applyAnimationPools(model, summary) {
    const pulse = resolveHaloPulse(model.tick);
    const alarmDevices = [...devicePositions.keys()].filter((id) => model.deviceStatus[id] === 'alarm');
    alarmDevices.forEach((id, index) => {
      const position = devicePositions.get(id);
      writeInstanceMatrix(alarmHaloMesh, index, {
        position: [position[0], position[1], position[2]],
        size: [pulse.scale, pulse.scale, pulse.scale],
      });
    });
    alarmHaloMesh.count = alarmDevices.length;
    alarmHaloMesh.visible = alarmDevices.length > 0;
    alarmHaloMesh.material.opacity = pulse.opacity;
    alarmHaloMesh.instanceMatrix.needsUpdate = true;

    const selectedDevices = model.selectionPath.nodeIds.filter((id) => devicePositions.has(id));
    selectedDevices.forEach((id, index) => {
      const position = devicePositions.get(id);
      writeInstanceMatrix(selectionHaloMesh, index, {
        position: [position[0], position[1], position[2]],
        size: [1.25, 1.25, 1.25],
      });
    });
    selectionHaloMesh.count = selectedDevices.length;
    selectionHaloMesh.visible = selectedDevices.length > 0;
    selectionHaloMesh.instanceMatrix.needsUpdate = true;

    model.zoneHalos.forEach((halo, index) => {
      writeInstanceMatrix(zoneHaloMesh, index, {
        position: [centre(halo.bounds.x), halo.height / 2, centre(halo.bounds.z)],
        size: [extent(halo.bounds.x), halo.height, extent(halo.bounds.z)].map((value) => value * pulse.scale),
      });
    });
    zoneHaloMesh.count = model.zoneHalos.length;
    zoneHaloMesh.visible = model.zoneHalos.length > 0;
    zoneHaloMesh.material.opacity = 0.1 + pulse.opacity * 0.12;
    zoneHaloMesh.instanceMatrix.needsUpdate = true;

    const packetCounts = { rs485: 0, lorawan: 0, ethernet: 0 };
    for (const packet of packetDefinitions) {
      if (model.routeStatus[packet.routeId] !== 'normal') continue;
      const mesh = packetMeshes[packet.medium];
      const index = packetCounts[packet.medium];
      const widthScale = resolveNetworkMediaWidthScale(
        activeMediaWidthCamera,
        PACKET_MATERIAL_KEY[packet.medium],
      );
      const size = PACKET_BASE_SIZE * widthScale;
      writeInstanceMatrix(mesh, index, {
        position: samplePolyline(packet.points, resolvePacketT(model.tick, packet.phase)),
        size: [size, size, size],
      });
      packetCounts[packet.medium] += 1;
    }
    let activePackets = 0;
    for (const [medium, mesh] of Object.entries(packetMeshes)) {
      mesh.count = packetCounts[medium];
      mesh.visible = packetCounts[medium] > 0 && densePhysicalNetwork;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere?.();
      activePackets += packetCounts[medium];
    }

    // The RF pulse the gateway is receiving: rings expand and fade on the same deterministic tick.
    const gatewayPosition = devicePositions.get('UG67-01');
    const rings = Array.from({ length: INTERACTION_WAVE_RINGS.count }, (unused, index) => (
      resolveWaveRing(model.tick, index)
    ));
    rings.forEach((ring, index) => {
      writeInstanceMatrix(waveRingMesh, index, {
        position: [...gatewayPosition],
        size: [ring.scale, ring.scale, ring.scale],
      });
    });
    const lorawanLive = model.routeStatus[routeIds.lorawan('UC100-A')] === 'normal'
      || model.routeStatus[routeIds.lorawan('UC100-C')] === 'normal';
    waveRingMesh.count = lorawanLive ? rings.length : 0;
    waveRingMesh.visible = lorawanLive && densePhysicalNetwork;
    waveRingMesh.instanceMatrix.needsUpdate = true;

    return Object.freeze({
      state: model.state,
      tick: model.tick,
      selection: model.selection,
      visualMode: model.visualMode,
      packets: Object.freeze({ pooled: packetDefinitions.length, active: activePackets }),
      overlays: Object.freeze({
        alarm: summary.alarm, offline: summary.offline, selected: summary.selected,
      }),
      halos: Object.freeze({ alarm: alarmDevices.length, selection: selectedDevices.length }),
      zoneHalos: model.zoneHalos.length,
      suppressed: summary.suppressed,
      niagaraDelivery: model.niagaraDelivery,
    });
  }

  /**
   * The one entry point the UI, the URL and the capture harness all go through. `state` is the
   * DesignSpec scene state, `tick` is the deterministic clock, `selection` is the highlighted
   * endpoint. Any of the three may change without the other two moving.
   */
  function setInteractionState({ state, tick, selection } = {}) {
    interactionModel = createInteractionModel({
      state: state ?? interactionModel.state,
      tick: Number.isFinite(tick) ? tick : interactionModel.tick,
      selection: selection ?? interactionModel.selection,
    });
    return applyInteraction();
  }

  function getInteractionModel() {
    return interactionModel;
  }

  const interactionPools = Object.freeze({
    packetCapacity: packetDefinitions.length,
    packetDefinitions,
    meshes: interactionMeshes,
    overlayEntities: (status) => [...overlayMeshes.entries()]
      .filter(([key]) => key.endsWith(`:${status}`))
      .flatMap(([, mesh]) => mesh.userData.entries),
  });

  /**
   * `light_state` — the lighting pass's two deterministic evidence states. It switches the house
   * emission channels only: the network media, the TC300 status ring and the direction markers
   * stay lit, so an engineering capture with the lights off still proves a live system.
   */
  function setLightState(lightState = 'on') {
    for (const [key, definition] of Object.entries(LIGHTING_EMISSION_CHANNELS)) {
      // Every zone variant of the channel, not just the canonical one: the corridor strips and the
      // sala screens live in dimmed zones and would otherwise never have switched at all.
      for (const material of materialsForKey(key)) {
        material.emissiveIntensity = resolveEmissiveIntensity(definition, lightState);
        material.needsUpdate = true;
      }
    }
    houseState.lightState = lightState;
    applyZoneFillGain();
    return lightState;
  }

  /**
   * The third half of `light_state`, and the one the engineering lift also moves: the ROOM BOUNCE.
   * The emissives switch, the PointLights switch — and the fill, which is what actually carries the
   * value of every surface no luminaire stands over, has to switch with them or a lights-off
   * capture keeps a fully lit room. It is a uniform, so neither state change rebuilds a program.
   */
  function applyZoneFillGain() {
    for (const material of zoneLitMaterials) setZoneFillGain(material, houseState);
  }

  function setSurfaceFrame({ posterFrame = 0, displayFrame = 0 } = {}) {
    const selectedPoster = posterFrame === 1 ? 1 : 0;
    const selectedDisplay = displayFrame === 1 ? 1 : 0;
    for (const frame of [0, 1]) {
      if (frameMeshes.poster[frame]) frameMeshes.poster[frame].visible = frame === selectedPoster;
      if (frameMeshes.display[frame]) frameMeshes.display[frame].visible = frame === selectedDisplay;
    }
    return Object.freeze({ posterFrame: selectedPoster, displayFrame: selectedDisplay });
  }
  setSurfaceFrame();

  function getSurfaceState() {
    return Object.freeze({
      placementFingerprint: surfacePlacements.map((placement) => (
        `${placement.id}:${placement.parentLayer}:${placement.position.join(',')}:${placement.size.join(',')}`
      )).join('|'),
      placements: surfacePlacements.length,
      visibleFrames: Object.freeze({
        poster0: Boolean(frameMeshes.poster[0]?.visible),
        poster1: Boolean(frameMeshes.poster[1]?.visible),
        display0: Boolean(frameMeshes.display[0]?.visible),
        display1: Boolean(frameMeshes.display[1]?.visible),
      }),
    });
  }

  function updateDirectionMarkerView({ camera, viewport } = {}) {
    if (!camera || !Number.isFinite(viewport?.width) || !Number.isFinite(viewport?.height)
      || viewport.width <= 0 || viewport.height <= 0) return false;
    camera.updateMatrixWorld?.(true);
    const base = new THREE.Vector3();
    const unscaledTip = new THREE.Vector3();
    const projectedBase = new THREE.Vector3();
    const projectedTip = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const project = (source, target) => {
      target.copy(source).project(camera);
      return [
        (target.x + 1) * viewport.width / 2,
        (1 - target.y) * viewport.height / 2,
      ];
    };

    for (const mesh of directionMarkerMeshes) {
      mesh.userData.placements.forEach((placement, index) => {
        base.set(...placement.routeAnchor);
        tangent.set(...placement.tangent).normalize();
        unscaledTip.copy(base).addScaledVector(tangent, SURFACE_DIRECTION_MARKER.length);
        const basePx = project(base, projectedBase);
        const tipPx = project(unscaledTip, projectedTip);
        const unscaledProjectedLength = Math.hypot(tipPx[0] - basePx[0], tipPx[1] - basePx[1]);
        let scale = resolveDirectionMarkerScale(unscaledProjectedLength);
        unscaledTip.copy(base).addScaledVector(tangent, SURFACE_DIRECTION_MARKER.length * scale);
        const renderedTipPx = project(unscaledTip, projectedTip);
        const renderedProjectedLength = Math.hypot(
          renderedTipPx[0] - basePx[0],
          renderedTipPx[1] - basePx[1],
        );
        scale = refineDirectionMarkerScale(scale, renderedProjectedLength);
        const transform = createDirectionMarkerViewTransform(placement, scale);
        dummy.position.set(...transform.position);
        dummy.quaternion.setFromUnitVectors(directionMarkerAxis, tangent);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);

        const entity = mesh.userData.entities[index];
        entity.activeViewScale = scale;
        entity.renderedLength = transform.renderedLength;
        entity.baseContactDistance = transform.baseContactDistance;
        entity.projectedLengthPx = unscaledProjectedLength * scale;
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere?.();
    }
    return true;
  }

  const labelPolicy = { visualMode: 'architectural', labels: true, labelsExplicit: false };
  let activeEvidenceCamera = 'isometric';
  // The Techo layer toggle, mirrored into the asset so the interior ceilings can follow the roof
  // panels they are the underside of (UX item 7: hiding the roof used to reveal a "second roof").
  let roofLayerVisible = true;

  function setEvidenceCamera(cameraName, viewContext) {
    activeEvidenceCamera = cameraName;
    updateDirectionMarkerView(viewContext);
    const networkVisibility = resolveNetworkEvidenceVisibility(cameraName, {
      visualMode: labelPolicy.visualMode,
    });
    const evidencePreset = CAMERA_PRESETS[cameraName] ?? QA_CAMERA_PRESETS[cameraName] ?? null;
    networkSchematic.setVisibility(networkVisibility);
    for (const mesh of denseNetworkMeshes) mesh.visible = networkVisibility.densePhysicalNetwork;
    // The interaction pools ride the same evidence rule as the media they annotate: the schematic
    // detail camera frames the board alone, and no packet or halo may float in front of it.
    densePhysicalNetwork = networkVisibility.densePhysicalNetwork;
    for (const mesh of publicRoofMeshes) mesh.visible = resolvePublicRoofVisibility(cameraName);
    for (const mesh of rearRoofMeshes) mesh.visible = resolveRearRoofVisibility(cameraName);
    // The external IP chain is engineering evidence; the architecture state shows only the building.
    for (const mesh of externalProxyMeshes) mesh.visible = labelPolicy.visualMode === 'engineering';
    const ceilingVisible = resolveInteriorCeilingVisibility(labelPolicy.visualMode, {
      roofVisible: roofLayerVisible,
    });
    for (const mesh of interiorCeilingMeshes) mesh.visible = ceilingVisible;
    setNetworkMediaWidthScale(cameraName);
    // The media cross-section the pools sit on just changed: re-derive them from the same model.
    applyInteraction();
    const technicalLabelsAllowed = resolveTechnicalLabelVisibility(labelPolicy);
    const surfaceCleanCameras = new Set([
      'facade', 'grazing', 'lobby', 'concessions', 'corridor',
    ]);
    const kitchenLabelTransforms = {
      'tc-label-TC300-05': { position: [-12.75, 2.0, 11.7], scale: [0.82, 0.22] },
      'uc-label-UC100-D': { position: [-5.2, 2.0, 13.2], scale: [0.9, 0.24] },
      'bus-label-D': { position: [-5.2, 2.34, 12.6], scale: [0.9, 0.24] },
    };
    const ug67LabelTransforms = {
      'gateway-label': { position: [3.82, 4.35, 2], scale: [1.2, 0.3] },
      'uc-label-UC100-A': { position: [4.65, 4.22, 1.35], scale: [0.82, 0.22] },
      'uc-label-UC100-B': { position: [4.78, 3.84, 1.75], scale: [0.82, 0.22] },
      'uc-label-UC100-C': { position: [4.78, 3.44, 2.18], scale: [0.82, 0.22] },
      'uc-label-UC100-D': { position: [4.65, 3.06, 2.58], scale: [0.82, 0.22] },
    };

    const materialLookdevLabels = new Set([
      'uc-label-UC100-A',
      'uc-label-UC100-B',
      'uc-label-UC100-C',
      'uc-label-UC100-D',
      'gateway-label',
      'bus-label-A',
      'bus-label-B',
      'bus-label-C',
      'bus-label-D',
    ]);

    for (const sprite of billboardSprites) {
      const scope = sprite.userData.visibilityScope;
      const kind = sprite.userData.billboardKind;
      sprite.position.set(...sprite.userData.basePosition);
      sprite.scale.set(sprite.userData.baseScale[0], sprite.userData.baseScale[1], 1);
      sprite.renderOrder = sprite.userData.baseRenderOrder;
      sprite.userData.activeScaleFactor = 1;
      if (!networkVisibility.technicalLabels) sprite.visible = false;
      else if (TECHNICAL_BILLBOARD_KINDS.includes(kind) && !technicalLabelsAllowed) sprite.visible = false;
      else if (kind === 'tc300' && evidencePreset
        && (SURFACE_TC300_LABEL_POLICY.cameras.includes(cameraName)
          || LIGHTING_PRESET_ZONE_OWNER[cameraName] === sprite.userData.zoneId)) {
        // The canonical chain must start somewhere visible: the ID chip names the thermostat
        // wherever it survives its own projection, and is culled everywhere else. The one endpoint
        // that OWNS the zone a preset frames is never culled by distance alone.
        const placement = resolveTc300LabelPlacement({
          cameraName,
          preset: evidencePreset,
          chipPosition: sprite.userData.basePosition,
          chipWidthMetres: sprite.userData.baseScale[0],
          zoneOwned: LIGHTING_PRESET_ZONE_OWNER[cameraName] === sprite.userData.zoneId,
        });
        sprite.visible = placement.visible;
        if (placement.visible) {
          sprite.scale.set(
            sprite.userData.baseScale[0] * placement.scale,
            sprite.userData.baseScale[1] * placement.scale,
            1,
          );
          sprite.renderOrder = SURFACE_TC300_LABEL_POLICY.renderOrder;
          sprite.userData.activeScaleFactor = placement.scale;
        }
      }
      else if (cameraName === 'kitchen') {
        const transform = kitchenLabelTransforms[sprite.userData.entityId];
        sprite.visible = Boolean(transform);
        if (transform) {
          sprite.position.set(...transform.position);
          sprite.scale.set(transform.scale[0], transform.scale[1], 1);
        }
      }
      else if (surfaceCleanCameras.has(cameraName)) sprite.visible = false;
      else if (cameraName === 'sala-3') {
        sprite.visible = sprite.userData.entityId === 'sala-3-wheelchair-label';
      }
      else if (cameraName === 'neutral') {
        sprite.visible = materialLookdevLabels.has(sprite.userData.entityId);
      }
      else if (cameraName === 'reference-match') {
        sprite.visible = ['tc-label-TC300-07', 'tc-label-TC300-08'].includes(sprite.userData.entityId);
      }
      else if (cameraName === 'ug67') {
        const transform = ug67LabelTransforms[sprite.userData.entityId];
        sprite.visible = Boolean(transform);
        if (transform) {
          sprite.position.set(...transform.position);
          sprite.scale.set(transform.scale[0], transform.scale[1], 1);
          sprite.renderOrder = 1240;
        }
      }
      else if (cameraName === SURFACE_NETWORK_LABEL_POLICY.camera) {
        sprite.visible = SURFACE_NETWORK_LABEL_POLICY.visibleKinds.includes(kind);
        if (sprite.visible) {
          const scaleFactor = SURFACE_NETWORK_LABEL_POLICY.scaleByKind[kind] ?? 1;
          sprite.scale.set(
            sprite.userData.baseScale[0] * scaleFactor,
            sprite.userData.baseScale[1] * scaleFactor,
            1,
          );
          sprite.renderOrder = SURFACE_NETWORK_LABEL_POLICY.priorityByKind[kind] ?? 1200;
          sprite.userData.activeScaleFactor = scaleFactor;
        }
      }
      else if (scope === 'overview') {
        // `checkpoint` joined this list with P6 correction P1: the giant floating zone labels were
        // half of what buried the checkpoint fit-out in its own required view.
        if (['kitchen', 'checkpoint', 'family-master', 'roof-service'].includes(cameraName)) sprite.visible = false;
        else sprite.visible = !['sala-3', 'technical', 'ug67', 'rs485-master'].includes(cameraName);
      }
      else if (scope === 'sala-3') sprite.visible = cameraName === 'sala-3';
      else if (cameraName === 'technical') sprite.visible = [
        'uc-label-UC100-B',
        'uc-label-UC100-C',
      ].includes(sprite.userData.entityId);
      else if (cameraName === 'family-master' || cameraName === 'roof-service') sprite.visible = false;
      else if (cameraName === SURFACE_RS485_EVIDENCE_POLICY.camera) {
        sprite.visible = SURFACE_RS485_EVIDENCE_POLICY.visibleKinds.includes(kind);
      }
      else sprite.visible = true;
    }
  }
  /** Architecture state suppresses technical labels; engineering (or an explicit request) restores them. */
  function setLabelPolicy(next = {}) {
    if (next.visualMode === 'architectural' || next.visualMode === 'engineering') {
      labelPolicy.visualMode = next.visualMode;
      // `lighting_notes.engineering`: raise the neutral fill. Attempt 2 raised only the AmbientLight,
      // which every interior surface rejects by its own zone dim, so eng-neutral stayed murky.
      houseState.visualMode = next.visualMode;
      applyZoneFillGain();
    }
    if ('labels' in next) labelPolicy.labels = Boolean(next.labels);
    if ('labelsExplicit' in next) labelPolicy.labelsExplicit = Boolean(next.labelsExplicit);
    setEvidenceCamera(activeEvidenceCamera);
    return Object.freeze({ ...labelPolicy });
  }

  /** UX item 7: the Techo checkbox drives the interior ceilings together with the roof panels. */
  function setRoofLayerVisible(visible) {
    roofLayerVisible = Boolean(visible);
    setEvidenceCamera(activeEvidenceCamera);
    return roofLayerVisible;
  }

  setEvidenceCamera('isometric');

  function dispose() {
    networkSchematic.dispose();
    for (const mesh of interactionMeshes) mesh.parent?.remove(mesh);
    haloGeometry.dispose();
    for (const mesh of meshes) mesh.parent?.remove(mesh);
    for (const mesh of surfaceMeshes) {
      mesh.parent?.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const sprite of billboardSprites) {
      sprite.parent?.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    surfaceAtlasMaterial?.dispose();
    surfaceAtlas?.dispose();
    directionMarkerGeometry.dispose();
    for (const geometry of rtuFanGeometries) geometry.dispose();
    sharedGeometry.dispose();
    for (const material of ownedMaterials) material.dispose();
  }

  return Object.freeze({
    assetId: ARCHITECTURE_ASSET_ID,
    pass: 'interaction-ui',
    plan,
    meshes,
    surfaceMeshes,
    surfacePlacements,
    billboards: billboardSprites,
    networkSchematic,
    interactionPools,
    setEvidenceCamera,
    setLabelPolicy,
    setLightState,
    setRoofLayerVisible,
    setSurfaceFrame,
    setInteractionState,
    getInteractionModel,
    getSurfaceState,
    dispose,
  });
}
