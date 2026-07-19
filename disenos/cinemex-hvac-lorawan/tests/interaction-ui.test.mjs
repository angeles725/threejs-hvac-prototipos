import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG, TC300_DEVICES, UC100_DEVICES } from '../src/config.mjs';
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

const LAYER_NAMES = ['architecture', 'roof', 'walls', 'hvac', 'rs485', 'lorawan', 'internet', 'labels'];

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
// Client simplification (2026-07-15): the fault/hot scenario states are gone —
// the two visual states are the whole vocabulary.
// ---------------------------------------------------------------------------

test('both scene states are driveable query values, not an atomic reset', () => {
  const warnings = [];
  for (const state of ['architecture', 'engineering']) {
    const parsed = parseQueryState(`?state=${state}&links=all&tick=0`, (message) => warnings.push(message));
    assert.equal(parsed.sceneState, state, `${state} must survive the parser`);
    assert.notDeepEqual(parsed, DEFAULT_QUERY_STATE, `${state} must not collapse to the canonical default`);
  }
  assert.equal(warnings.length, 0);
});

test('the removed fault/hot scenario states reset the state atomically', () => {
  for (const state of ['fault-tc300', 'fault-uc100-b', 'fault-internet', 'hot-sala-3', 'hot-kitchen']) {
    assert.deepEqual(parseQueryState(`?state=${state}`, () => {}), DEFAULT_QUERY_STATE, `${state} must be unknown`);
  }
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
  const parsed = parseQueryState('?state=engineering&camera=engineering-section&links=all&selection=UC100-B&tick=30');
  const query = serializeQueryState(parsed);
  assert.match(query, /state=engineering/);
  assert.match(query, /selection=UC100-B/);
  assert.match(query, /tick=30/);
  // A captured URL is a fixed point: reloading it and re-serializing yields the same URL.
  const reloaded = parseQueryState(`?${query}`);
  assert.equal(serializeQueryState(reloaded), query);
  assert.equal(reloaded.sceneState, 'engineering');
  assert.equal(reloaded.selection, 'UC100-B');
  assert.equal(reloaded.tick, 30);
  // The surface pass pinned the frame tokens to the tail of the contract order.
  assert.match(query, /poster_frame=0&display_frame=0$/);
});

// ---------------------------------------------------------------------------
// The healthy model — the fault machinery is gone; the model is telemetry,
// selection and the deterministic tick, nothing else.
// ---------------------------------------------------------------------------

test('the scene-state vocabulary is exactly the two visual states', () => {
  assert.deepEqual(Object.keys(INTERACTION_SCENE_STATES), ['architecture', 'engineering']);
  assert.equal(resolveSceneState('architecture').visualMode, 'architectural');
  assert.equal(resolveSceneState('engineering').visualMode, 'engineering');
  assert.equal(resolveSceneState('fault-tc300'), null);
  assert.equal(resolveSceneState('hot-kitchen'), null);
});

test('the healthy model exposes telemetry and selection, and no fault-era derivations', () => {
  const model = createInteractionModel({ state: 'engineering', tick: 0 });
  for (const { id } of TC300_DEVICES) {
    assert.equal(model.telemetry[id].communication, 'normal', `${id} must be healthy`);
    assert.equal(model.telemetry[id].status, 'normal', `${id} must be healthy`);
  }
  for (const { id } of UC100_DEVICES) assert.equal(model.linkMetrics[id].lorawan, 'normal');
  for (const gone of ['deviceStatus', 'routeStatus', 'zoneHalos', 'alarms', 'niagaraDelivery', 'faultId']) {
    assert.equal(gone in model, false, `${gone} must not exist on the model`);
  }
});

test('the model is deterministic: same state, tick and selection — same model', () => {
  const before = createInteractionModel({ state: 'engineering', tick: 30 });
  const replay = createInteractionModel({ state: 'engineering', tick: 30 });
  assert.deepEqual(replay.telemetry, before.telemetry);
  assert.deepEqual(replay.linkMetrics, before.linkMetrics);
  assert.deepEqual(replay.selectionPath, before.selectionPath);
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
  // The RF rings are periodic but never land back on their tick-0 value at tick 30.
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

test('the interaction pools are fixed, fully live, and unhighlighted without a selection', () => {
  const { asset } = buildArchitecture();
  const state = asset.setInteractionState({ state: 'engineering', tick: 0, selection: 'none' });

  assert.equal(state.packets.pooled > 0, true);
  assert.equal(state.packets.pooled, asset.interactionPools.packetCapacity);
  // Healthy by construction: every packet in the fixed pool is live, always.
  assert.equal(state.packets.active, state.packets.pooled);
  assert.equal(state.overlays.selected, 0);
  assert.equal(state.halos.selection, 0);
  assert.equal(state.suppressed, 0);
  // The fault-era pools are gone: no alarm or offline overlays exist to query.
  assert.deepEqual(asset.interactionPools.overlayEntities('alarm'), []);
  assert.deepEqual(asset.interactionPools.overlayEntities('offline'), []);
});

test('deselecting is deterministic: the unselected model returns byte for byte', () => {
  const { asset } = buildArchitecture();
  const before = asset.setInteractionState({ state: 'engineering', tick: 0, selection: 'none' });
  asset.setInteractionState({ state: 'engineering', tick: 0, selection: 'TC300-08' });
  const after = asset.setInteractionState({ state: 'engineering', tick: 0, selection: 'none' });
  assert.deepEqual(after, before);
  assert.equal(asset.interactionPools.overlayEntities('selected').length, 0);
});

// Limpieza fase 2 (2026-07-18): the `zones` layer (engineering plan-band volumes) was retired
// with the engineering visual mode, and the zone-volume stability contract left with it.

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
    assert.equal(['rs485-green', 'lorawan-blue', 'ethernet-blue'].includes(key), true, `${key} is not a gated media key`);
  }
  const owners = new Set(selected.map(({ statusOwner }) => statusOwner));
  assert.equal(owners.has('TC300-07'), false, 'a neighbour on the same bus must not be highlighted');
});
