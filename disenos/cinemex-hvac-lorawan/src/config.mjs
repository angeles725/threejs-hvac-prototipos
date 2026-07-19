/** Canonical, meter-based configuration shared by the domain and Three.js adapters. */

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

const auditorium = (zoneId, side, family, capacity, bounds, height) => ({
  id: `auditorium-${zoneId}`,
  zoneId,
  label: `Sala ${Number(zoneId.split('-')[1])}`,
  side,
  family,
  capacity,
  bounds,
  height,
});

export const BUILDING = deepFreeze({
  width: 60,
  depth: 45,
  publicHeight: 4.5,
  auditoriumHeightRange: [7, 9],
  units: 'm',
});

export const AUDITORIUMS = deepFreeze([
  auditorium('sala-1', 'west', 'large', 182, { x: [-29.5, -4.2], z: [2, 10.5] }, 8.8),
  auditorium('sala-2', 'west', 'medium', 120, { x: [-29.5, -4.2], z: [-5.3, 2] }, 8),
  auditorium('sala-3', 'west', 'medium', 120, { x: [-29.5, -4.2], z: [-12.6, -5.3] }, 8),
  auditorium('sala-4', 'west', 'small', 80, { x: [-29.5, -4.2], z: [-18.5, -12.6] }, 7.2),
  auditorium('sala-5', 'east', 'large', 182, { x: [4.2, 29.5], z: [2, 10.5] }, 8.8),
  auditorium('sala-6', 'east', 'medium', 120, { x: [4.2, 29.5], z: [-5.3, 2] }, 8),
  auditorium('sala-7', 'east', 'medium', 120, { x: [4.2, 29.5], z: [-12.6, -5.3] }, 8),
  auditorium('sala-8', 'east', 'small', 80, { x: [4.2, 29.5], z: [-18.5, -12.6] }, 7.2),
]);

export const ZONES = deepFreeze([
  { id: 'lobby', label: 'Vestíbulo y recepción', kind: 'public', bounds: { x: [-29, 29], z: [15.5, 22] } },
  { id: 'concessions', label: 'Dulcería', kind: 'public', bounds: { x: [-13, 13], z: [15, 18.5] } },
  { id: 'ticket-checkpoint', label: 'Revisión de boletos', kind: 'public', bounds: { x: [-3.5, 3.5], z: [10.5, 14.7] } },
  { id: 'central-corridor', label: 'Pasillo central', kind: 'circulation', bounds: { x: [-3.5, 3.5], z: [-18.5, 10.5] } },
  { id: 'kitchen', label: 'Cocina y preparación', kind: 'service', bounds: { x: [-13, -4.5], z: [10.5, 15] } },
  { id: 'administration', label: 'Oficina administrativa', kind: 'service', bounds: { x: [-29, -21], z: [10.5, 15.5] } },
  ...AUDITORIUMS.map(({ zoneId, label, bounds }) => ({ id: zoneId, label, kind: 'auditorium', bounds })),
]);

/**
 * A wall-mounted face may sit just outside a room's logical centerline bounds.
 * TC300-02 intentionally uses the full 0.15 m allowance at the concessions wall.
 */
export const TC300_WALL_FACE_TOLERANCE_M = 0.15;

const neutralPlacement = (note, overrides = {}) => ({
  interiorOrNeutralWall: true,
  nearDoor: false,
  belowDiffuser: false,
  nearHeatOrMoisture: false,
  note,
  ...overrides,
});

const tc300 = (number, zoneId, uc100Id, position, placement) => ({
  id: `TC300-${String(number).padStart(2, '0')}`,
  type: 'tc300',
  zoneId,
  uc100Id,
  position,
  placement,
});

export const TC300_DEVICES = deepFreeze([
  tc300(1, 'lobby', 'UC100-A', [-17, 1.5, 19], neutralPlacement('Interior column, eight metres from entrance glazing.')),
  tc300(2, 'concessions', 'UC100-A', [13.15, 1.5, 17], neutralPlacement('Interior end wall opposite heat and refrigeration.')),
  tc300(3, 'ticket-checkpoint', 'UC100-A', [-3.25, 1.5, 12], neutralPlacement('Interior rail wall clear of controlled opening.')),
  tc300(4, 'central-corridor', 'UC100-A', [3.25, 1.5, -1.5], neutralPlacement('Interior corridor wall between doors.')),
  tc300(5, 'kitchen', 'UC100-D', [-12.75, 1.5, 11.7], neutralPlacement('Neutral return-side wall away from hood, steam and grease.', { nearRepresentativeReturn: true })),
  tc300(6, 'sala-1', 'UC100-B', [-16, 1.5, 2.15], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(7, 'sala-2', 'UC100-B', [-16, 1.5, -5.15], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(8, 'sala-3', 'UC100-B', [-16, 1.5, -12.45], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(9, 'sala-4', 'UC100-B', [-16, 1.5, -18.35], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(10, 'sala-5', 'UC100-C', [16, 1.5, 2.15], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(11, 'sala-6', 'UC100-C', [16, 1.5, -5.15], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(12, 'sala-7', 'UC100-C', [16, 1.5, -12.45], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(13, 'sala-8', 'UC100-C', [16, 1.5, -18.35], neutralPlacement('Lateral occupied-zone wall.')),
  tc300(14, 'administration', 'UC100-A', [-24, 1.5, 12], neutralPlacement('Interior office wall away from façade and door.')),
]);

export const UC100_DEVICES = deepFreeze([
  { id: 'UC100-A', type: 'uc100', cabinet: 'telecom-front', position: [8, 1.55, 11], memberIds: ['TC300-01', 'TC300-02', 'TC300-03', 'TC300-04', 'TC300-14'] },
  { id: 'UC100-B', type: 'uc100', cabinet: 'left-control', position: [-16, 1.55, -21.2], memberIds: ['TC300-06', 'TC300-07', 'TC300-08', 'TC300-09'] },
  { id: 'UC100-C', type: 'uc100', cabinet: 'right-control', position: [16, 1.55, -21.2], memberIds: ['TC300-10', 'TC300-11', 'TC300-12', 'TC300-13'] },
  { id: 'UC100-D', type: 'uc100', cabinet: 'kitchen-control', position: [-5.2, 1.55, 13.2], memberIds: ['TC300-05'], reservedInputs: ['temperature', 'humidity', 'pressure', 'energy'] },
]);

export const GATEWAYS = deepFreeze([
  { id: 'UG67-01', type: 'ug67', position: [3.15, 3.5, 2], antennas: 2, mount: 'central-high-wall', power: 'ups-backed' },
]);

export const EXTERNAL_NODES = deepFreeze([
  { id: 'router-firewall', type: 'router', label: 'Router / Firewall' },
  { id: 'internet', type: 'internet', label: 'Internet' },
  { id: 'niagara-supervisor', type: 'server', label: 'Niagara Supervisor', integration: 'conceptual-network-server-or-ip-adapter' },
  { id: 'client-pc', type: 'client', label: 'PC' },
  { id: 'client-tablet', type: 'client', label: 'Tablet' },
  { id: 'client-smartphone', type: 'client', label: 'Smartphone' },
]);

const edge = (from, to, medium, label, physical) => ({ from, to, medium, label, physical });
export const NETWORK = deepFreeze({
  nodes: EXTERNAL_NODES,
  edges: [
    ...TC300_DEVICES.map(({ id, uc100Id }) => edge(id, uc100Id, 'rs485', 'RS-485 / Modbus RTU', true)),
    ...UC100_DEVICES.map(({ id }) => edge(id, 'UG67-01', 'lorawan', 'LoRaWAN RF', false)),
    edge('UG67-01', 'router-firewall', 'ethernet', 'Ethernet', true),
    edge('router-firewall', 'internet', 'ethernet', 'Ethernet / Internet', true),
    edge('internet', 'niagara-supervisor', 'ethernet', 'Conceptual IP integration', true),
    edge('niagara-supervisor', 'client-pc', 'ethernet', 'Remote access', true),
    edge('niagara-supervisor', 'client-tablet', 'ethernet', 'Remote access', true),
    edge('niagara-supervisor', 'client-smartphone', 'ethernet', 'Remote access', true),
  ],
});

export const APP_CONFIG = deepFreeze({
  id: 'cinemex-hvac-lorawan',
  building: BUILDING,
  zones: ZONES,
  auditoriums: AUDITORIUMS,
  devices: { tc300: TC300_DEVICES, uc100: UC100_DEVICES, gateways: GATEWAYS },
  network: NETWORK,
  colors: {
    brandRed: '#c8102e',
    rs485: '#22c55e',
    lorawan: '#38bdf8',
    ethernet: '#2563eb',
  },
  animation: { speed: 1, seed: 30067, stepSeconds: 5 },
});
