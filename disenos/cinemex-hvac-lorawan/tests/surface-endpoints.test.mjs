import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG, TC300_DEVICES } from '../src/config.mjs';
import { createArchitectureStructure } from '../src/scene/architecture.js';
import { MATERIAL_SPECS } from '../src/scene/materials.js';
import {
  SURFACE_LORAWAN_DASH,
  SURFACE_NETWORK_MEDIA,
  isDirectionMarkerSampleVisibleOnDashedRoute,
  resolveDashCount,
  resolveTrayOffset,
} from '../src/scene/surfaces.js';

// ---------------------------------------------------------------------------
// Minimal Three.js + document stubs. They exist so the tests can assert what the
// BUILDER actually emits, not only what the plan promises.
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

function createDocumentStub() {
  return {
    createElement: (tag) => (tag === 'canvas'
      ? { width: 0, height: 0, getContext: () => createContext() }
      : null),
  };
}

class StubVector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(other) { return this.set(other.x, other.y, other.z); }
  normalize() { return this; }
  addScaledVector() { return this; }
  project() { return this; }
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
  globalThis.document = createDocumentStub();
  try {
    const groups = Object.fromEntries(LAYER_NAMES.map((name) => [name, new StubGroup()]));
    const asset = createArchitectureStructure({ THREE: createThreeStub(), groups });
    return { asset, groups };
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

/** Every instance the builder pushed into an InstancedMesh, flattened with its metadata. */
function instancesOf(asset, predicate) {
  return asset.meshes.flatMap((mesh) => (mesh.userData.instances ?? []).map((instance) => ({
    ...instance,
    meshName: mesh.name,
  }))).filter(predicate);
}

function aabb({ position, size }) {
  return {
    min: position.map((value, axis) => value - size[axis] / 2),
    max: position.map((value, axis) => value + size[axis] / 2),
  };
}

function contains(outer, inner) {
  return [0, 1, 2].every((axis) => (
    outer.min[axis] <= inner.min[axis] + 1e-6 && outer.max[axis] >= inner.max[axis] - 1e-6
  ));
}

// ---------------------------------------------------------------------------
// Correction 1 — the 14 TC300 endpoints are real surface devices.
// ---------------------------------------------------------------------------

test('correction 1: every TC300 is a surface device with a dark-glass face and a blue status ring', () => {
  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const bodies = plan.structural.devices.tc300;

  const faces = instancesOf(asset, ({ metadata }) => metadata.kind === 'tc300-glass-face');
  const rings = instancesOf(asset, ({ metadata }) => metadata.kind === 'tc300-status-ring');

  assert.equal(faces.length, 14, 'every thermostat needs its own dark-glass face');
  assert.equal(new Set(rings.map(({ metadata }) => metadata.entityId)).size, 14, 'every thermostat needs a status ring');

  for (const device of bodies) {
    const body = aabb(device);
    const face = faces.find(({ metadata }) => metadata.entityId === device.id);
    assert.ok(face, `${device.id} has no dark-glass face`);

    // Derived: the face is glass on the device front, never a second, bigger body.
    assert.equal(face.metadata.materialRole, 'dark-glass');
    const faceBox = aabb(face);
    assert.ok(faceBox.max[0] <= body.max[0] + 1e-6 && faceBox.min[0] >= body.min[0] - 1e-6, `${device.id} face is wider than its body`);
    assert.ok(faceBox.max[1] <= body.max[1] + 1e-6 && faceBox.min[1] >= body.min[1] - 1e-6, `${device.id} face is taller than its body`);
    assert.ok(faceBox.min[2] >= body.max[2] - 1e-6, `${device.id} face must sit on the front of the body`);

    const deviceRings = rings.filter(({ metadata }) => metadata.entityId === device.id);
    assert.ok(deviceRings.length >= 4, `${device.id} status ring must enclose the face on four sides`);
    for (const segment of deviceRings) {
      const ringBox = aabb(segment);
      // The readability budget is the ring and the chip, never a fattened body.
      assert.ok(
        ringBox.min[0] >= body.min[0] - 1e-6 && ringBox.max[0] <= body.max[0] + 1e-6
          && ringBox.min[1] >= body.min[1] - 1e-6 && ringBox.max[1] <= body.max[1] + 1e-6,
        `${device.id} ring segment escapes the true device footprint (device inflation)`,
      );
      assert.equal(segment.materialKey, 'tc-blue');
    }
  }

  // Device bodies keep the accepted structural scale: no inflation anywhere.
  assert.deepEqual(bodies[0].size, [0.1, 0.1136, 0.026]);
});

// ---------------------------------------------------------------------------
// Correction 2 — the drop lands ON the device face.
// ---------------------------------------------------------------------------

test('correction 2: every RS-485 drop terminates on the TC300 face behind a terminal gland', () => {
  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const devices = new Map(plan.structural.devices.tc300.map((device) => [device.id, device]));

  const conductors = instancesOf(asset, ({ metadata, materialKey }) => (
    materialKey === 'rs485-green' && metadata.kind === 'contained-rs485-drop'
  ));
  const glands = instancesOf(asset, ({ metadata }) => metadata.kind === 'tc300-terminal-gland');

  assert.equal(glands.length, 14, 'every drop needs one terminal gland on the device face');

  for (const device of devices.values()) {
    const body = aabb(device);
    const faceTop = body.max[1];

    const gland = glands.find(({ metadata }) => metadata.entityId === device.id);
    assert.ok(gland, `${device.id} drop still ends on a bare junction cube`);
    const glandBox = aabb(gland);

    // Derived: the gland caps the cable ON the body, and never swallows the device.
    assert.ok(glandBox.min[1] >= faceTop - 1e-6, `${device.id} gland must sit on the device, not inside it`);
    assert.ok(
      gland.size[0] < device.size[0] && gland.size[2] <= device.size[0],
      `${device.id} gland is larger than the device it caps`,
    );

    const arriving = conductors.filter(({ metadata }) => metadata.terminalOwner === device.id);
    assert.ok(arriving.length >= 1, `${device.id} has no drop conductor`);

    // Derived: exactly the segment that reaches the device must stop on its face — no deeper.
    const overDevice = arriving.filter((conductor) => {
      const box = aabb(conductor);
      return box.min[0] <= device.position[0] && box.max[0] >= device.position[0]
        && box.min[2] <= device.position[2] && box.max[2] >= device.position[2];
    });
    assert.ok(overDevice.length >= 1, `${device.id} has no conductor arriving over the device`);
    const landing = overDevice.reduce((best, candidate) => (
      aabb(candidate).min[1] < aabb(best).min[1] ? candidate : best
    ));
    assert.ok(
      Math.abs(aabb(landing).min[1] - faceTop) <= 1e-6,
      `${device.id} drop stops at y=${aabb(landing).min[1].toFixed(3)} instead of landing on the face (${faceTop.toFixed(3)})`,
    );
    // and no conductor may run through the device body any more.
    for (const conductor of arriving) {
      assert.ok(!contains(aabb(conductor), body), `${device.id} is still swallowed by its own drop`);
    }
  }

  // The old olive terminal cube is gone: no orange box may cover a device body.
  const orange = instancesOf(asset, ({ materialKey }) => materialKey === 'containment-orange');
  for (const device of devices.values()) {
    const body = aabb(device);
    for (const box of orange) {
      assert.ok(!contains(aabb(box), body), `${device.id} is buried under ${box.metadata.entityId}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Correction 3 — the board leaves the UG67 -> router sightline.
// ---------------------------------------------------------------------------

// Limpieza fase 2 (2026-07-18): correction 3 (the diagram board's occlusion evidence at the
// complete-network camera) retired with the removed network-schematic board module and the
// QA evidence presets.

// ---------------------------------------------------------------------------
// Correction 4 — LoRaWAN is not Ethernet.
// ---------------------------------------------------------------------------

test('correction 4: LoRaWAN reads dashed and cyan while Ethernet stays a continuous, deeper blue tube', () => {
  const { asset } = buildArchitecture();

  const lorawan = instancesOf(asset, ({ materialKey }) => materialKey === 'lorawan-blue');
  const ethernet = instancesOf(asset, ({ materialKey }) => materialKey === 'ethernet-blue');
  const dashes = lorawan.filter(({ metadata }) => metadata.kind === 'lorawan-link');

  assert.ok(dashes.length > 0, 'the LoRaWAN links must be built from dashes');
  assert.equal(
    ethernet.some(({ metadata }) => Number.isFinite(metadata.dashIndex)),
    false,
    'the Ethernet run must stay a continuous tube',
  );

  // Derived: every dash and every gap is shorter than the shortest continuous Ethernet segment.
  const dashLength = (instance) => Math.max(...instance.size);
  const longestDash = Math.max(...dashes.map(dashLength));
  const shortestEthernet = Math.min(...ethernet
    .filter(({ metadata }) => metadata.kind !== 'ethernet-port')
    .map(dashLength));
  assert.ok(
    longestDash < shortestEthernet,
    `a ${longestDash.toFixed(2)} m dash cannot read as RF beside a ${shortestEthernet.toFixed(2)} m Ethernet tube`,
  );

  // The dash policy shortens both mark and gap: period is derived from the route length.
  const link = asset.plan.topologyProxies.lorawanLinks[0];
  const points = [link.start, ...link.via, link.renderEnd];
  const segmentLength = Math.hypot(...points[0].map((value, axis) => points[1][axis] - value));
  const dashCount = resolveDashCount(segmentLength);
  assert.ok(dashCount >= segmentLength / SURFACE_LORAWAN_DASH.periodMetres - 1);
  assert.ok(SURFACE_LORAWAN_DASH.dutyCycle < 0.5, 'the gap must be at least as long as the mark');
  assert.ok(
    segmentLength / dashCount <= SURFACE_LORAWAN_DASH.periodMetres * 1.5,
    'dash period must stay short enough to read as a dashed RF path',
  );

  // Colour separation comes from the spec palette, not from a shared "network blue".
  const channel = (color, shift) => (color >> shift) & 0xff;
  const separation = (a, b) => Math.hypot(
    channel(a, 16) - channel(b, 16),
    channel(a, 8) - channel(b, 8),
    channel(a, 0) - channel(b, 0),
  );
  const luminance = (color) => (
    channel(color, 16) * 0.2126 + channel(color, 8) * 0.7152 + channel(color, 0) * 0.0722
  );
  const lorawanColor = MATERIAL_SPECS.lorawanBlue.color;
  const ethernetColor = MATERIAL_SPECS.ethernetBlue.color;

  assert.equal(lorawanColor, Number.parseInt(APP_CONFIG.colors.lorawan.slice(1), 16));
  assert.equal(ethernetColor, Number.parseInt(APP_CONFIG.colors.ethernet.slice(1), 16));
  assert.notEqual(lorawanColor, MATERIAL_SPECS.networkBlue.color, 'RF may not reuse the shared network blue');
  assert.notEqual(ethernetColor, MATERIAL_SPECS.networkBlue.color, 'Ethernet may not reuse the shared network blue');
  // The two classes must part in hue AND in value, so distance cannot collapse them together.
  assert.ok(
    separation(lorawanColor, ethernetColor) >= 80,
    `the two blue media classes are only ${separation(lorawanColor, ethernetColor).toFixed(0)} apart in RGB`,
  );
  assert.ok(
    luminance(ethernetColor) <= luminance(lorawanColor) * 0.7,
    'the Ethernet blue must read clearly darker than the RF cyan',
  );

  // Every LoRa arrowhead still touches a rendered dash under the new policy.
  const markers = asset.meshes
    .filter((mesh) => mesh.name === 'surface-lorawan-single-arrowheads')
    .flatMap((mesh) => mesh.userData.placements ?? []);
  assert.equal(markers.length, 4);
  for (const marker of markers) {
    assert.equal(
      isDirectionMarkerSampleVisibleOnDashedRoute(marker.routeComponentT, marker.dashPolicy),
      true,
      'a LoRa arrowhead is anchored in a gap and reads as detached',
    );
  }
});

// ---------------------------------------------------------------------------
// Correction 5 — the RS-485 green survives its own containment.
// ---------------------------------------------------------------------------

test('correction 5: the RS-485 conductor is exposed beside its tray, at any evidence media scale', () => {
  const { asset } = buildArchitecture();
  const widths = SURFACE_NETWORK_MEDIA.widths;

  assert.equal(MATERIAL_SPECS.rs485Green.color, 0x29d67d, 'the spec green is the only RS-485 green');

  const conductors = instancesOf(asset, ({ materialKey }) => materialKey === 'rs485-green');
  const trays = instancesOf(asset, ({ metadata }) => (
    metadata.component === 'continuous-cable-tray' || metadata.component === 'drop-cable-tray'
  ));

  assert.ok(conductors.length > 0 && trays.length > 0);
  for (const tray of trays) {
    assert.ok(Array.isArray(tray.mediaOffset), 'a tray must declare the offset that keeps the conductor visible');
    assert.ok(
      Math.hypot(...tray.mediaOffset) > 0,
      'a concentric tray hides the conductor it is supposed to carry',
    );
  }

  // Derived: no conductor may be enclosed by the tray that backs it, at any width scale.
  for (const scale of [1, SURFACE_NETWORK_MEDIA.widthScale]) {
    const scaled = (instance) => ({
      position: instance.position.map((value, axis) => (
        value - (instance.mediaOffset?.[axis] ?? 0) + (instance.mediaOffset?.[axis] ?? 0) * scale
      )),
      size: instance.size.map((value) => (
        value <= instance.mediaWidth * 1.001 ? value * scale : value
      )),
    });
    for (const conductor of conductors) {
      for (const tray of trays) {
        if (tray.metadata.entityId !== conductor.metadata.entityId) continue;
        assert.ok(
          !contains(aabb(scaled(tray)), aabb(scaled(conductor))),
          `${conductor.metadata.entityId} conductor is buried inside its tray at scale ${scale}`,
        );
      }
    }
  }

  // The offset is derived from the two cross-sections, so the faces touch instead of overlapping.
  assert.equal(resolveTrayOffset(widths.rs485Tray, widths.rs485Trunk), (widths.rs485Tray + widths.rs485Trunk) / 2);
});

// ---------------------------------------------------------------------------
// Correction 6 — no RF ticks in the architecture state.
// ---------------------------------------------------------------------------

// Limpieza fase 2 (2026-07-18): corrections 6 and 7 (the UG67 RF tick marks and the board
// caption clearances) retired with the removed network-schematic board module — the RF detail
// could only ever show in the retired engineering mode at the retired ug67 camera.

// ---------------------------------------------------------------------------
// Correction 8 — the whole poster bank is inside the facade frame.
// ---------------------------------------------------------------------------

// Limpieza fase 2 (2026-07-18): correction 8 (the facade preset's poster-bank framing) retired
// with the pruned preset catalogue.

// ---------------------------------------------------------------------------
// Correction 9 — the concession bar sells something, and the lobby looks at its fit-out.
// ---------------------------------------------------------------------------

test('correction 9: the concession counter carries popcorn and refrigeration displays', () => {
  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const counter = plan.blockoutProxies.frontOfHouse.find(({ kind }) => kind === 'concession-counter');
  const counterTop = counter.position[1] + counter.size[1] / 2;
  const counterX = [counter.position[0] - counter.size[0] / 2, counter.position[0] + counter.size[0] / 2];

  const popcorn = instancesOf(asset, ({ metadata }) => metadata.kind === 'popcorn-display-cue');
  const fridges = instancesOf(asset, ({ metadata }) => metadata.kind === 'refrigeration-display-cue');

  assert.ok(popcorn.length >= 2, 'the concession bar needs a popcorn line');
  assert.ok(fridges.length >= 2, 'the concession bar needs refrigerated displays');

  for (const cue of [...popcorn, ...fridges]) {
    assert.ok(
      cue.position[0] >= counterX[0] && cue.position[0] <= counterX[1],
      `${cue.metadata.entityId} is not on the concession counter`,
    );
    assert.ok(
      cue.position[1] + cue.size[1] / 2 > counterTop,
      `${cue.metadata.entityId} is buried under the counter top`,
    );
  }

  const bodies = popcorn.filter(({ metadata }) => metadata.component === 'body');
  for (const body of bodies) {
    assert.ok(body.position[1] - body.size[1] / 2 >= counterTop - 1e-6, 'popcorn units stand on the counter');
  }
});

// Limpieza fase 2 (2026-07-18): correction 9's lobby-preset framing retired with the pruned
// preset catalogue; the concession-counter geometry contract above remains.
