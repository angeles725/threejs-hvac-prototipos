import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { APP_CONFIG, TC300_DEVICES, UC100_DEVICES } from '../src/config.mjs';
import { deriveHudModel } from '../src/hud.mjs';
import {
  DEFAULT_QUERY_STATE,
  parseQueryState,
  serializeQueryState,
} from '../src/controllers/query-state.js';
import {
  INTERACTION_LINK_VALUES,
  INTERACTION_PACKET_STEP,
  INTERACTION_SCENE_STATES,
  INTERACTION_SELECTION_VALUES,
  createInteractionModel,
  resolveHaloPulse,
  resolveLinkLayers,
  resolvePacketT,
  resolveSceneState,
  resolveWaveRing,
  samplePolyline,
} from '../src/scene/interaction.js';
import { resolvePickedSelection } from '../src/controllers/picking.js';
import { createArchitectureStructure } from '../src/scene/architecture.js';
import { createMaterialRegistry } from '../src/scene/materials.js';

// ---------------------------------------------------------------------------
// Scene stubs — identical contract to the lighting/surface suites: assert what the
// BUILDER emits, never a simulated pixel.
// ---------------------------------------------------------------------------

function createContext() {
  return new Proxy({
    measureText: (value) => ({ width: String(value).length * 12 }),
    canvas: { width: 0, height: 0 },
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

class StubVector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(other) { return this.set(other.x, other.y, other.z); }
  normalize() { return this; }
  addScaledVector() { return this; }
  project() { return this; }
}

class StubGroup {
  constructor() {
    this.children = [];
    this.visible = true;
    this.userData = {};
    this.position = new StubVector3();
    this.rotation = { x: 0, y: 0, z: 0, set: () => undefined };
    this.scale = { set: () => undefined, setScalar: () => undefined };
  }

  add(child) { this.children.push(child); child.parent = this; }
  remove(child) { this.children = this.children.filter((entry) => entry !== child); }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse?.(callback); }
}

class StubMesh extends StubGroup {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.renderOrder = 0;
  }
}

class StubInstancedMesh extends StubMesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
    this.instanceMatrix = { needsUpdate: false };
  }

  setMatrixAt() {}
  computeBoundingSphere() {}
}

class StubObject3D {
  constructor() {
    this.position = new StubVector3();
    this.rotation = { set: () => undefined };
    this.scale = { set: () => undefined, setScalar: () => undefined };
    this.quaternion = { setFromUnitVectors: () => undefined };
    this.matrix = {};
  }

  updateMatrix() {}
}

function createThreeStub() {
  class Geometry {
    constructor(...args) { this.args = args; }
    rotateX() { return this; }
    setAttribute() { return this; }
    setFromPoints() { return this; }
    computeVertexNormals() { return this; }
    dispose() {}
  }
  class MaterialStub {
    constructor(parameters = {}) { Object.assign(this, parameters); }
    clone() { return new MaterialStub({ ...this }); }
    dispose() {}
  }
  return {
    BoxGeometry: Geometry,
    ConeGeometry: Geometry,
    PlaneGeometry: Geometry,
    TorusGeometry: Geometry,
    BufferGeometry: Geometry,
    CylinderGeometry: Geometry,
    Float32BufferAttribute: class { constructor(values) { this.values = values; } },
    InstancedMesh: StubInstancedMesh,
    Mesh: StubMesh,
    Line: StubMesh,
    Sprite: StubMesh,
    Group: StubGroup,
    Object3D: StubObject3D,
    Vector3: StubVector3,
    MeshStandardMaterial: MaterialStub,
    MeshPhysicalMaterial: MaterialStub,
    MeshBasicMaterial: MaterialStub,
    LineBasicMaterial: MaterialStub,
    SpriteMaterial: MaterialStub,
    CanvasTexture: class { constructor(canvas) { this.image = canvas; } dispose() {} },
    DataTexture: class {
      constructor(data, width, height) {
        this.image = { data, width, height };
        this.repeat = { set: () => undefined };
      }

      dispose() {}
    },
    Vector2: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
    RGBAFormat: 'rgba',
    UnsignedByteType: 'ubyte',
    RepeatWrapping: 'repeat',
    DoubleSide: 'double',
    SRGBColorSpace: 'srgb',
    ClampToEdgeWrapping: 'clamp',
    LinearMipmapLinearFilter: 'mipmap',
    LinearFilter: 'linear',
  };
}

const LAYER_NAMES = ['architecture', 'roof', 'walls', 'hvac', 'rs485', 'lorawan', 'internet', 'zones', 'labels'];

function buildArchitecture() {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas'
      ? { width: 0, height: 0, getContext: () => createContext() }
      : null),
  };
  try {
    const THREE = createThreeStub();
    const groups = Object.fromEntries(LAYER_NAMES.map((name) => [name, new StubGroup()]));
    const materialRegistry = createMaterialRegistry(THREE);
    const asset = createArchitectureStructure({ THREE, groups, materialRegistry });
    return { asset, groups, materialRegistry };
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

// ---------------------------------------------------------------------------
// Query vocabulary — the spec's `deterministic_query_states` must be DRIVEABLE.
// An unknown value on a known key resets the whole state atomically, so a capture
// set built from spec-literal URLs would otherwise be N pictures of the default view.
// ---------------------------------------------------------------------------

test('every DesignSpec scene state is a driveable query value, not an atomic reset', () => {
  const warnings = [];
  for (const state of ['architecture', 'engineering', 'fault-tc300', 'fault-uc100-b', 'fault-internet', 'hot-sala-3', 'hot-kitchen']) {
    const parsed = parseQueryState(`?state=${state}&links=all&tick=0`, (message) => warnings.push(message));
    assert.equal(parsed.sceneState, state, `${state} must survive the parser`);
    assert.notDeepEqual(parsed, DEFAULT_QUERY_STATE, `${state} must not collapse to the canonical default`);
  }
  assert.equal(warnings.length, 0);
});

test('fault and hot states force the engineering visual mode they are captured in', () => {
  for (const state of ['fault-tc300', 'fault-uc100-b', 'fault-internet', 'hot-sala-3', 'hot-kitchen']) {
    assert.equal(parseQueryState(`?state=${state}`).visualMode, 'engineering');
  }
  // A stale mode token can never contradict the scene state that owns the capture.
  assert.equal(parseQueryState('?state=fault-internet&mode=architectural').visualMode, 'engineering');
});

test('selection and tick are parsed, not silently ignored as unknown keys', () => {
  const parsed = parseQueryState('?state=engineering&links=all&selection=TC300-08&tick=30');
  assert.equal(parsed.selection, 'TC300-08');
  assert.equal(parsed.tick, 30);
  assert.equal(parsed.tickExplicit, true);
  assert.equal(parseQueryState('?selection=none').selection, 'none');
  assert.equal(parseQueryState('?tick=0').tick, 0);
  // Unknown device ids stay atomic failures: a typo must not silently capture the default view.
  assert.deepEqual(parseQueryState('?selection=TC300-99', () => {}), DEFAULT_QUERY_STATE);
  assert.deepEqual(parseQueryState('?tick=-1', () => {}), DEFAULT_QUERY_STATE);
  assert.equal(DEFAULT_QUERY_STATE.tickExplicit, false);
});

test('the links vocabulary implements every declared value, not only `all`', () => {
  assert.deepEqual(INTERACTION_LINK_VALUES, ['none', 'rs485', 'lorawan', 'internet', 'all']);
  assert.deepEqual(resolveLinkLayers('none'), { rs485: false, lorawan: false, internet: false });
  assert.deepEqual(resolveLinkLayers('rs485'), { rs485: true, lorawan: false, internet: false });
  assert.deepEqual(resolveLinkLayers('lorawan'), { rs485: false, lorawan: true, internet: false });
  assert.deepEqual(resolveLinkLayers('internet'), { rs485: false, lorawan: false, internet: true });
  assert.deepEqual(resolveLinkLayers('all'), { rs485: true, lorawan: true, internet: true });

  const rs485Only = parseQueryState('?state=engineering&links=rs485');
  assert.deepEqual([rs485Only.rs485, rs485Only.lorawan, rs485Only.internet], [true, false, false]);
  const none = parseQueryState('?state=engineering&links=none');
  assert.deepEqual([none.rs485, none.lorawan, none.internet], [false, false, false]);
});

test('the interaction state round-trips through the serialized capture URL', () => {
  const parsed = parseQueryState('?state=fault-uc100-b&camera=engineering-section&links=all&selection=UC100-B&tick=30');
  const query = serializeQueryState(parsed);
  assert.match(query, /state=fault-uc100-b/);
  assert.match(query, /selection=UC100-B/);
  assert.match(query, /tick=30/);
  // A captured URL is a fixed point: reloading it and re-serializing yields the same URL.
  const reloaded = parseQueryState(`?${query}`);
  assert.equal(serializeQueryState(reloaded), query);
  assert.equal(reloaded.sceneState, 'fault-uc100-b');
  assert.equal(reloaded.selection, 'UC100-B');
  assert.equal(reloaded.tick, 30);
  // The surface pass pinned the frame tokens to the tail of the contract order.
  assert.match(query, /poster_frame=0&display_frame=0$/);
});

// ---------------------------------------------------------------------------
// Fault propagation — DERIVED from the one topology, never a second source of truth.
// ---------------------------------------------------------------------------

test('every scene state maps onto the canonical simulation fault, or onto none', () => {
  assert.deepEqual(Object.keys(INTERACTION_SCENE_STATES), [
    'architecture', 'engineering', 'fault-tc300', 'fault-uc100-b',
    'fault-internet', 'hot-sala-3', 'hot-kitchen',
  ]);
  assert.equal(resolveSceneState('architecture').faultId, null);
  assert.equal(resolveSceneState('engineering').faultId, null);
  assert.equal(resolveSceneState('fault-tc300').faultId, 'tc300-communication-loss');
  assert.equal(resolveSceneState('fault-uc100-b').faultId, 'uc100-failure');
  assert.equal(resolveSceneState('fault-internet').faultId, 'internet-loss');
  assert.equal(resolveSceneState('hot-sala-3').faultId, 'auditorium-high-temperature');
  assert.equal(resolveSceneState('hot-kitchen').faultId, 'kitchen-high-temperature');
  assert.equal(resolveSceneState('fault-nothing'), null);
});

test('a healthy engineering state leaves every endpoint and every route normal', () => {
  const model = createInteractionModel({ state: 'engineering', tick: 0 });
  for (const { id } of [...TC300_DEVICES, ...UC100_DEVICES, ...APP_CONFIG.devices.gateways, ...APP_CONFIG.network.nodes]) {
    assert.equal(model.deviceStatus[id], 'normal', `${id} must be healthy`);
  }
  assert.equal(Object.values(model.routeStatus).every((status) => status === 'normal'), true);
  assert.equal(model.alarms.length, 0);
  assert.deepEqual(model.zoneHalos, []);
  assert.equal(model.niagaraDelivery.stopped.length, 0);
});

test('fault-tc300 breaks exactly one thermostat and only its own drop route', () => {
  const model = createInteractionModel({ state: 'fault-tc300', tick: 0 });
  assert.equal(model.deviceStatus['TC300-08'], 'alarm');
  // The bus keeps working for the other three members: a comm loss is not a bus failure.
  for (const id of ['TC300-06', 'TC300-07', 'TC300-09']) assert.equal(model.deviceStatus[id], 'normal');
  assert.equal(model.deviceStatus['UC100-B'], 'normal');
  assert.equal(model.routeStatus['TC300-08-contained-drop'], 'blocked');
  assert.equal(model.routeStatus['TC300-07-contained-drop'], 'normal');
  assert.equal(model.routeStatus['UC100-B-contained-route'], 'normal');
  assert.equal(model.routeStatus['lorawan-UC100-B-UG67-01'], 'normal');
  assert.deepEqual(model.niagaraDelivery.stopped, ['TC300-08']);
  assert.deepEqual(model.zoneHalos.map(({ zoneId }) => zoneId), ['sala-3']);
});

test('fault-uc100-b propagates along the RS-485 bus it owns, and no further', () => {
  const model = createInteractionModel({ state: 'fault-uc100-b', tick: 0 });
  assert.equal(model.deviceStatus['UC100-B'], 'alarm');
  // Dependents are unreachable, not faulty: red then gray, exactly as `visual_states` declares.
  for (const id of ['TC300-06', 'TC300-07', 'TC300-08', 'TC300-09']) {
    assert.equal(model.deviceStatus[id], 'unreachable', `${id} must gray out`);
    assert.equal(model.routeStatus[`${id}-contained-drop`], 'blocked');
  }
  assert.equal(model.routeStatus['UC100-B-contained-route'], 'blocked');
  assert.equal(model.routeStatus['lorawan-UC100-B-UG67-01'], 'blocked');
  // The other three buses, the gateway and the whole IP chain stay healthy.
  for (const id of ['UC100-A', 'UC100-C', 'UC100-D', 'UG67-01', 'router-firewall', 'internet', 'niagara-supervisor']) {
    assert.equal(model.deviceStatus[id], 'normal', `${id} must stay healthy`);
  }
  assert.equal(model.routeStatus['conceptual-ip-chain'], 'normal');
  assert.deepEqual(
    model.niagaraDelivery.stopped,
    ['TC300-06', 'TC300-07', 'TC300-08', 'TC300-09'],
  );
  assert.deepEqual(
    model.zoneHalos.map(({ zoneId }) => zoneId),
    ['sala-1', 'sala-2', 'sala-3', 'sala-4'],
  );
});

test('fault-internet stops delivery on the shared backbone and spares the field devices', () => {
  const model = createInteractionModel({ state: 'fault-internet', tick: 0 });
  assert.equal(model.deviceStatus.internet, 'alarm');
  // The backbone cannot deliver: gateway, router and supervisor all gray out.
  for (const id of ['UG67-01', 'router-firewall', 'niagara-supervisor', 'client-pc', 'client-tablet', 'client-smartphone']) {
    assert.equal(model.deviceStatus[id], 'unreachable', `${id} must gray out`);
  }
  // The field keeps measuring: no thermostat and no concentrator is recoloured.
  for (const { id } of [...TC300_DEVICES, ...UC100_DEVICES]) {
    assert.equal(model.deviceStatus[id], 'normal', `${id} must stay healthy`);
  }
  assert.equal(model.routeStatus['UC100-A-contained-route'], 'normal');
  assert.equal(model.routeStatus['lorawan-UC100-A-UG67-01'], 'normal');
  assert.equal(model.routeStatus['UG67-01-contained-ethernet'], 'blocked');
  assert.equal(model.routeStatus['conceptual-ip-chain'], 'blocked');
  assert.equal(model.niagaraDelivery.stopped.length, TC300_DEVICES.length);
});

test('the hot states raise an active alarm without breaking a single link', () => {
  const hotSala = createInteractionModel({ state: 'hot-sala-3', tick: 0 });
  assert.equal(hotSala.deviceStatus['TC300-08'], 'alarm');
  assert.equal(hotSala.alarms.some(({ kind, deviceId }) => kind === 'temperature-high' && deviceId === 'TC300-08'), true);
  assert.equal(Object.values(hotSala.routeStatus).every((status) => status === 'normal'), true);
  assert.equal(hotSala.niagaraDelivery.stopped.length, 0);
  assert.deepEqual(hotSala.zoneHalos.map(({ zoneId }) => zoneId), ['sala-3']);

  const hotKitchen = createInteractionModel({ state: 'hot-kitchen', tick: 0 });
  assert.equal(hotKitchen.deviceStatus['TC300-05'], 'alarm');
  assert.equal(Object.values(hotKitchen.routeStatus).every((status) => status === 'normal'), true);
  assert.deepEqual(hotKitchen.zoneHalos.map(({ zoneId }) => zoneId), ['kitchen']);
});

test('restoring the state is deterministic: the healthy model returns byte for byte', () => {
  const before = createInteractionModel({ state: 'engineering', tick: 30 });
  createInteractionModel({ state: 'fault-uc100-b', tick: 30 });
  const after = createInteractionModel({ state: 'engineering', tick: 30 });
  assert.deepEqual(after.deviceStatus, before.deviceStatus);
  assert.deepEqual(after.routeStatus, before.routeStatus);
});

// ---------------------------------------------------------------------------
// Selection — one exact end-to-end path through the canonical chain.
// ---------------------------------------------------------------------------

test('selecting a thermostat highlights exactly its canonical end-to-end path', () => {
  const model = createInteractionModel({ state: 'engineering', selection: 'TC300-08', tick: 0 });
  assert.deepEqual(model.selectionPath.nodeIds, [
    'TC300-08', 'UC100-B', 'UG67-01', 'router-firewall', 'internet', 'niagara-supervisor',
    'client-pc', 'client-tablet', 'client-smartphone',
  ]);
  assert.deepEqual(model.selectionPath.routeIds, [
    'TC300-08-contained-drop',
    'UC100-B-contained-route',
    'lorawan-UC100-B-UG67-01',
    'UG67-01-contained-ethernet',
    'conceptual-ip-chain',
  ]);
  // No shortcut edge, and no second bus is ever pulled into the path.
  assert.equal(model.selectionPath.nodeIds.includes('UC100-A'), false);
  assert.equal(model.selectionPath.routeIds.includes('TC300-07-contained-drop'), false);
});

test('selection resolves for the concentrator and the gateway too', () => {
  const uc = createInteractionModel({ state: 'engineering', selection: 'UC100-B' });
  assert.equal(uc.selectionPath.nodeIds[0], 'UC100-B');
  assert.equal(uc.selectionPath.routeIds.includes('UC100-B-contained-route'), true);
  assert.equal(uc.selectionPath.routeIds.includes('lorawan-UC100-B-UG67-01'), true);
  assert.equal(uc.selectionPath.nodeIds.includes('UG67-01'), true);

  const gateway = createInteractionModel({ state: 'engineering', selection: 'UG67-01' });
  assert.equal(gateway.selectionPath.nodeIds.includes('niagara-supervisor'), true);
  assert.equal(gateway.selectionPath.routeIds.includes('UG67-01-contained-ethernet'), true);
  assert.equal(gateway.selectionPath.routeIds.includes('TC300-08-contained-drop'), false);

  assert.deepEqual(createInteractionModel({ selection: 'none' }).selectionPath, { nodeIds: [], routeIds: [] });
  assert.equal(INTERACTION_SELECTION_VALUES.includes('TC300-08'), true);
  assert.equal(INTERACTION_SELECTION_VALUES.includes('UG67-01'), true);
  assert.equal(INTERACTION_SELECTION_VALUES.includes('none'), true);
});

test('a raycast hit resolves to the device that owns the geometry it struck', () => {
  const hit = {
    object: {
      userData: {
        layer: 'hvac',
        entities: [
          { instanceId: 0, entityId: 'TC300-08', kind: 'tc300-status-ring' },
          { instanceId: 1, entityId: 'UC100-B', kind: 'uc100-device' },
        ],
      },
    },
    instanceId: 0,
  };
  assert.equal(resolvePickedSelection(hit), 'TC300-08');
  assert.equal(resolvePickedSelection({ ...hit, instanceId: 1 }), 'UC100-B');
  // Architecture geometry is not selectable: a click on a wall must not clear the URL contract.
  assert.equal(resolvePickedSelection({
    object: { userData: { layer: 'walls', entities: [{ instanceId: 0, entityId: 'west-public-wall' }] } },
    instanceId: 0,
  }), null);
  assert.equal(resolvePickedSelection(null), null);
  assert.equal(resolvePickedSelection({ object: { userData: {} } }), null);
});

// ---------------------------------------------------------------------------
// Animation — two deterministic ticks, a FIXED pool, no per-frame allocation.
// ---------------------------------------------------------------------------

test('tick 0 and tick 30 are two different, reproducible packet frames', () => {
  assert.equal(resolvePacketT(0, 0), 0);
  assert.notEqual(resolvePacketT(30, 0), resolvePacketT(0, 0));
  // Same tick, same phase, same position — always.
  assert.equal(resolvePacketT(30, 0.25), resolvePacketT(30, 0.25));
  assert.equal(resolvePacketT(30, 0), (INTERACTION_PACKET_STEP * 30) % 1);
  // The pulses are periodic but never land back on their tick-0 value at tick 30.
  assert.notEqual(resolveHaloPulse(30).scale, resolveHaloPulse(0).scale);
  assert.notEqual(resolveWaveRing(30, 0).scale, resolveWaveRing(0, 0).scale);
});

test('a polyline sample walks the route by arc length', () => {
  const points = [[0, 0, 0], [10, 0, 0], [10, 0, 10]];
  assert.deepEqual(samplePolyline(points, 0), [0, 0, 0]);
  assert.deepEqual(samplePolyline(points, 1), [10, 0, 10]);
  assert.deepEqual(samplePolyline(points, 0.5), [10, 0, 0]);
  assert.deepEqual(samplePolyline(points, 0.25), [5, 0, 0]);
});

// ---------------------------------------------------------------------------
// The Three.js adapter — what the BUILDER emits for each state.
// ---------------------------------------------------------------------------

test('the interaction pools are fixed, and empty in the gated healthy states', () => {
  const { asset } = buildArchitecture();
  const state = asset.setInteractionState({ state: 'engineering', tick: 0, selection: 'none' });

  assert.equal(state.packets.pooled > 0, true);
  assert.equal(state.packets.pooled, asset.interactionPools.packetCapacity);
  // Healthy: every packet in the fixed pool is live, and nothing is recoloured.
  assert.equal(state.packets.active, state.packets.pooled);
  assert.equal(state.overlays.alarm, 0);
  assert.equal(state.overlays.offline, 0);
  assert.equal(state.overlays.selected, 0);
  assert.equal(state.halos.alarm, 0);
  assert.equal(state.halos.selection, 0);
  assert.equal(state.zoneHalos, 0);
  assert.equal(state.suppressed, 0);
});

test('a fault recolours the affected instances through the gated alarm/offline palette', () => {
  const { asset } = buildArchitecture();
  const state = asset.setInteractionState({ state: 'fault-uc100-b', tick: 0 });

  assert.equal(state.overlays.alarm > 0, true, 'UC100-B must carry alarm-red instances');
  assert.equal(state.overlays.offline > 0, true, 'its four dependents must gray out');
  // Every recoloured instance is removed from its own base mesh: no double geometry, no z-fight.
  assert.equal(state.suppressed, state.overlays.alarm + state.overlays.offline);
  assert.equal(state.halos.alarm > 0, true);
  assert.equal(state.zoneHalos, 4, 'the four west rooms carry a fault halo');
  // The packets that used to ride bus B are the delivery evidence: they stop.
  assert.equal(state.packets.active < state.packets.pooled, true);
  assert.equal(state.packets.pooled, asset.interactionPools.packetCapacity);

  const alarmEntities = asset.interactionPools.overlayEntities('alarm');
  assert.equal(alarmEntities.every(({ entityId }) => entityId === 'UC100-B'), true);
  const offlineEntities = asset.interactionPools.overlayEntities('offline');
  const offlineOwners = new Set(offlineEntities.map(({ statusOwner }) => statusOwner));
  for (const owner of [
    'TC300-06', 'TC300-07', 'TC300-08', 'TC300-09',
    'TC300-06-contained-drop', 'TC300-09-contained-drop',
    'UC100-B-contained-route', 'lorawan-UC100-B-UG67-01',
  ]) {
    assert.equal(offlineOwners.has(owner), true, `${owner} must gray out`);
  }
  // Nothing outside bus B is touched: no neighbouring bus, no thermostat, no IP hop.
  for (const owner of [
    'TC300-01', 'UC100-A', 'UC100-A-contained-route', 'lorawan-UC100-C-UG67-01',
    'UG67-01', 'conceptual-ip-chain', 'UG67-01-contained-ethernet',
  ]) {
    assert.equal(offlineOwners.has(owner), false, `${owner} must stay healthy`);
  }
});

test('restoring from a fault returns the scene to the exact gated healthy state', () => {
  const { asset } = buildArchitecture();
  const healthy = asset.setInteractionState({ state: 'engineering', tick: 0 });
  asset.setInteractionState({ state: 'fault-internet', tick: 30 });
  const restored = asset.setInteractionState({ state: 'engineering', tick: 0 });
  assert.deepEqual(restored, healthy);
  assert.equal(asset.interactionPools.overlayEntities('alarm').length, 0);
  assert.equal(asset.interactionPools.overlayEntities('offline').length, 0);
});

test('no zone, band or room mesh disappears in any interaction state', () => {
  const { asset } = buildArchitecture();
  const zoneMeshes = asset.meshes.filter((mesh) => mesh.userData.layer === 'zones');
  const roomEntities = (mesh) => (mesh.userData.instances ?? []).length;
  const before = zoneMeshes.map(roomEntities);

  for (const state of Object.keys(INTERACTION_SCENE_STATES)) {
    asset.setInteractionState({ state, tick: 30, selection: 'TC300-08' });
    assert.deepEqual(zoneMeshes.map(roomEntities), before, `${state} dropped a zone volume`);
    for (const mesh of zoneMeshes) {
      assert.equal(mesh.count, (mesh.userData.instances ?? []).length, `${state} zeroed a zone mesh`);
    }
  }
});

test('selection highlights the path without hiding the medium it rides on', () => {
  const { asset } = buildArchitecture();
  const state = asset.setInteractionState({ state: 'engineering', selection: 'TC300-08', tick: 0 });
  assert.equal(state.overlays.selected > 0, true);
  assert.equal(state.halos.selection > 0, true);
  // The selected path is emissive-boosted in ITS OWN medium colour: the RS-485 green never
  // becomes a fourth media colour that the endpoint legend cannot explain.
  const selected = asset.interactionPools.overlayEntities('selected');
  const media = new Set(selected.map(({ materialKey }) => materialKey));
  for (const key of media) {
    assert.equal(['rs485-green', 'lorawan-blue', 'ethernet-blue', 'tc-black', 'tc-blue', 'uc-white', 'gateway-dark', 'endpoint-router', 'endpoint-cloud', 'endpoint-server', 'endpoint-pc', 'endpoint-tablet', 'endpoint-phone'].includes(key), true, `${key} is not a gated media/device key`);
  }
  const owners = new Set(selected.map(({ statusOwner }) => statusOwner));
  assert.equal(owners.has('TC300-07'), false, 'a neighbour on the same bus must not be highlighted');
});

// ---------------------------------------------------------------------------
// HUD consistency — the status line, its severity and the alarm list are ONE derivation.
// The bug this locks down: `#app-status` claimed "Sin alarmas" while `#alarm-list` was
// showing an active alarm, because the boot path wrote the status line a second time.
// ---------------------------------------------------------------------------

test('the HUD status line never contradicts the alarm list, in any state of the vocabulary', () => {
  for (const state of Object.keys(INTERACTION_SCENE_STATES)) {
    for (const tick of [0, 30]) {
      const model = createInteractionModel({ state, tick });
      const hud = deriveHudModel(model);
      const hasAlarms = model.alarms.length > 0;

      // The invariant, derived — not a literal asserted for one lucky state.
      assert.equal(hud.alarmItems.length > 0, true, `${state} must always render an alarm list`);
      assert.equal(
        hud.claimsNoAlarms,
        !hasAlarms,
        `${state}: the status line claims "sin alarmas" while the alarm list holds ${model.alarms.length}`,
      );
      assert.equal(/[Ss]in alarmas/.test(hud.statusText), !hasAlarms, `${state}: status copy contradicts the alarms`);
      assert.equal(hud.severity, hasAlarms ? 'alarm' : 'normal', `${state}: severity must follow the alarms`);
      assert.equal(hud.alarmCount, model.alarms.length, `${state}: the counted events must be the derived events`);

      // One list item per alarm, and each item names the device the alarm belongs to.
      if (hasAlarms) {
        assert.equal(hud.alarmItems.length, model.alarms.length, `${state}: an alarm was dropped from the list`);
        for (const [index, alarm] of model.alarms.entries()) {
          assert.equal(hud.alarmItems[index].severity, 'alarm');
          assert.equal(hud.alarmItems[index].text.startsWith(`${alarm.deviceId} · `), true);
        }
      } else {
        assert.equal(hud.alarmItems.length, 1);
        assert.equal(hud.alarmItems[0].severity, 'normal');
      }
    }
  }
});

test('the status line reports the delivery it can prove, and never a phantom Niagara outage', () => {
  // hot-kitchen alarms WITHOUT stopping a single thermostat: the copy must not imply data loss.
  const hot = deriveHudModel(createInteractionModel({ state: 'hot-kitchen', tick: 0 }));
  assert.equal(hot.severity, 'alarm');
  assert.equal(hot.stoppedCount, 0);
  assert.equal(/sin datos/.test(hot.statusText), false, 'no thermostat stopped reporting in hot-kitchen');

  // fault-internet stops every thermostat: the copy must say so, with the derived count.
  const outage = deriveHudModel(createInteractionModel({ state: 'fault-internet', tick: 0 }));
  assert.equal(outage.stoppedCount, TC300_DEVICES.length);
  assert.match(outage.statusText, new RegExp(`sin datos de ${TC300_DEVICES.length} termostato`));
});

test('the boot path owns no second status writer: the HUD has one source of truth', async () => {
  const source = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  // Any literal status copy in main.js is, by construction, a surface that cannot follow the alarms.
  assert.equal(/Sistema (listo|en alarma)/.test(source), false, 'main.js must not hard-code the status copy');
  assert.equal(/[Ss]in alarmas/.test(source), false, 'main.js must not hard-code an "sin alarmas" claim');
  assert.match(source, /deriveHudModel/, 'main.js must render the HUD from the derived model');
});
