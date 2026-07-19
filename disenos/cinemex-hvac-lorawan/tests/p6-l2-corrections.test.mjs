import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TC300_DEVICES } from '../src/config.mjs';
import {
  CAMERA_PRESETS,
  SMOOTH_DOLLY,
  createCameraController,
  resolveDollyTarget,
  stepDollyDistance,
} from '../src/controllers/camera.js';
import { runShaderWarmup } from '../src/controllers/warmup.js';
import {
  PUBLIC_ROOF_PLATE,
  RTU_PACKAGE,
  createArchitecturePlan,
  createArchitectureStructure,
} from '../src/scene/architecture.js';
import {
  LIGHTING_EMISSION_CHANNELS,
  resolveEmissiveIntensity,
  resolveInteriorCeilingVisibility,
} from '../src/scene/lighting.js';
import { MATERIAL_SPECS, createMaterialRegistry } from '../src/scene/materials.js';
import { createMenuDisplayArtwork } from '../src/scene/surfaces.js';

// ---------------------------------------------------------------------------
// Minimal Three.js + document stubs (the shape every builder test in this suite uses).
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
    DoubleSide: 'double',
    SRGBColorSpace: 'srgb',
    ClampToEdgeWrapping: 'clamp',
    LinearMipmapLinearFilter: 'mipmap',
    LinearFilter: 'linear',
  };
}

const LAYER_NAMES = ['architecture', 'roof', 'walls', 'hvac', 'rs485', 'lorawan', 'internet', 'labels'];

function buildArchitecture({ withRegistry = false } = {}) {
  const previousDocument = globalThis.document;
  globalThis.document = createDocumentStub();
  try {
    const groups = Object.fromEntries(LAYER_NAMES.map((name) => [name, new StubGroup()]));
    const materialRegistry = withRegistry ? createMaterialRegistry(createThreeStub()) : undefined;
    const asset = createArchitectureStructure({ THREE: createThreeStub(), groups, materialRegistry });
    return { asset, groups, materialRegistry };
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

function instancesOf(asset, predicate) {
  return asset.meshes.flatMap((mesh) => (mesh.userData.instances ?? []).map((instance) => ({
    ...instance,
    meshName: mesh.name,
    meshLayer: mesh.userData.layer,
  }))).filter(predicate);
}

const aabb = ({ position, size }) => ({
  min: position.map((value, axis) => value - size[axis] / 2),
  max: position.map((value, axis) => value + size[axis] / 2),
});

const aabbsIntersect = (a, b) => [0, 1, 2].every((axis) => (
  a.min[axis] < b.max[axis] - 1e-9 && a.max[axis] > b.min[axis] + 1e-9
));

// ---------------------------------------------------------------------------
// Limpieza fase 2 (2026-07-18): the P1/1b/P6d preset-framing and roof-clip contracts (the
// line-of-sight harness, SURFACE_ROOF_CLIP_CAMERAS / SURFACE_REAR_ROOF_CLIP_CAMERAS, and the
// per-camera roof-clip behaviour) were retired with the evidence preset catalogue — the product
// ships one fixed view where no roof clip ever fires. The network-schematic board module and
// its visibility rule left the tree with them.
// ---------------------------------------------------------------------------

test('P1 (superseded by the 2026-07-15 client mandate): the billboard system is gone entirely', () => {
  // The P1 correction suppressed the giant overview zone labels at the checkpoint camera. The
  // client mandate then deleted the whole device-label billboard system, so the invariant is now
  // structural: the asset exposes no billboard collection at all.
  const { asset } = buildArchitecture();
  asset.setEvidenceCamera('network');
  assert.equal('billboards' in asset, false, 'the asset must not expose any billboard collection');
});

test('P2: external endpoint proxies stay hidden in the shipped architectural state', () => {
  // Limpieza fase 2 (2026-07-18): the engineering mode that restored the external IP chain was
  // retired — the proxies are pinned hidden, exactly the shipped architectural behaviour.
  const { asset } = buildArchitecture();
  const proxies = asset.meshes.filter((mesh) => String(mesh.userData.materialKey).startsWith('endpoint-'));
  assert.equal(proxies.length, 6, 'router, internet, Niagara, PC, tablet and smartphone proxies');

  asset.setEvidenceCamera('network');
  assert.ok(proxies.every((mesh) => mesh.visible === false), 'an external proxy leaked into the architecture state');

  // `visual_states.architecture` keeps `devices: subtle` — the BUILDING devices stay.
  const buildingDevices = asset.meshes.filter((mesh) => (
    mesh.userData.layer === 'hvac'
      && ['tc-black', 'uc-white', 'gateway-dark'].includes(mesh.userData.materialKey)
  ));
  assert.ok(buildingDevices.length >= 3);
  assert.ok(buildingDevices.every((mesh) => mesh.visible === true), 'a building device vanished from architecture');
});

// ---------------------------------------------------------------------------
// P3 — per-family roof articulation.
// RED before the fix: the family plates mapped to shellCharcoal and carried no edge fascia.
// ---------------------------------------------------------------------------

test('P3: family roof plates are light concrete with dark fascia outlining every plate', () => {
  const { asset, materialRegistry } = buildArchitecture({ withRegistry: true });

  for (const family of ['large', 'medium', 'small']) {
    const plateMesh = asset.meshes.find((mesh) => mesh.userData.materialKey === `${family}-roof`);
    assert.ok(plateMesh, `${family} plates must exist`);
    assert.equal(
      plateMesh.material,
      materialRegistry.materials.exteriorConcrete,
      `${family} plates must reuse the gated exteriorConcrete palette entry`,
    );
  }
  const luminance = (color) => (
    ((color >> 16) & 0xff) * 0.2126 + ((color >> 8) & 0xff) * 0.7152 + (color & 0xff) * 0.0722
  );
  assert.ok(
    luminance(MATERIAL_SPECS.exteriorConcrete.color) > luminance(MATERIAL_SPECS.shellCharcoal.color) * 2.5,
    'the plate material must be decisively lighter than the charcoal that merged the slabs',
  );

  const plan = asset.plan;
  const plates = instancesOf(asset, ({ metadata }) => metadata.kind === 'auditorium-roof-panel');
  assert.equal(plates.length, 8, 'one plate per auditorium');
  const heightsByFamily = new Map();
  for (const plate of plates) {
    heightsByFamily.set(plate.metadata.family, plate.position[1]);
  }
  assert.equal(new Set(heightsByFamily.values()).size, 3, 'the three families must keep distinct plate heights');

  // CONTRACT CHANGE (L3 item 11): the fascia PROTRUDES 0.02 above its plate instead of sharing
  // its plane (the shared plane z-fought under rotation), and equal-height shared borders emit no
  // band (there is no step to articulate, and twin coplanar bands were the worst flicker source).
  const fascias = instancesOf(asset, ({ metadata }) => metadata.kind === 'roof-fascia');
  assert.equal(fascias.length, 28, 'four edges per plate minus the four equal-height shared borders');
  for (const room of plan.auditoriums) {
    const own = fascias.filter(({ metadata }) => metadata.auditoriumId === room.id);
    assert.ok(own.length === 3 || own.length === 4, `${room.id} must be outlined on every stepped edge`);
    const plateTop = room.height + 0.22;
    for (const band of own) {
      const top = band.position[1] + band.size[1] / 2;
      assert.ok(
        top > plateTop && top <= plateTop + 0.02 + 1e-9,
        `${room.id} fascia must protrude (a shared plane flickers), by 0.02 at most`,
      );
    }
  }
  // Envelope guard: the articulation adds at most the 2 cm anti-coplanar protrusion.
  const ceiling = Math.max(...plates.map(({ position, size }) => position[1] + size[1] / 2));
  assert.ok(fascias.every(({ position, size }) => position[1] + size[1] / 2 <= ceiling + 0.02 + 1e-6));
});

// ---------------------------------------------------------------------------
// P4 — display_frame 1 restructures the menu BODY, not only the header.
// RED before the fix: `createMenuDisplayArtwork` did not exist and both frames drew the
// same three body bars — the 564 px header-only delta the P6 judge measured.
// ---------------------------------------------------------------------------

test('P4: menu display frames 0 and 1 differ structurally in the body', () => {
  for (const style of [0, 1, 2]) {
    const before = createMenuDisplayArtwork(0, style);
    const after = createMenuDisplayArtwork(1, style);

    assert.notEqual(before.header.color, after.header.color, 'the header band colour must change');
    assert.notEqual(before.header.title, after.header.title);
    assert.notEqual(before.background, after.background, 'the body background must change');
    assert.notEqual(before.rows.length, after.rows.length, 'the row count must change');
    // No body row of frame 1 sits on a frame-0 row line: the whole body moves, not a corner of it.
    const rowLines = new Set(before.rows.map(({ top }) => top));
    assert.ok(after.rows.every(({ top }) => !rowLines.has(top)), 'frame 1 rows must not reuse frame 0 row lines');
    const rowColors = new Set(before.rows.map(({ color }) => color));
    assert.ok(after.rows.every(({ color }) => !rowColors.has(color)), 'frame 1 rows must not reuse frame 0 row colours');
    // Frame 1 adds a price column frame 0 never had.
    assert.equal(before.prices.length, 0);
    assert.equal(after.prices.length, after.rows.length);
  }
});

test('P4: frame 0 reproduces the gated concessions drawing exactly', () => {
  for (const style of [0, 1, 2]) {
    const artwork = createMenuDisplayArtwork(0, style);
    assert.equal(artwork.background, '#10141d');
    assert.equal(artwork.header.color, '#d71920');
    assert.equal(artwork.rows.length, 3);
    artwork.rows.forEach((row, index) => {
      assert.equal(row.top, 0.39 + index * 0.17);
      assert.equal(row.heightFactor, 0.045);
      assert.equal(row.color, index % 2 ? '#f4d35e' : '#e5e7eb');
    });
  }
  assert.throws(() => createMenuDisplayArtwork(0, 3), RangeError);
});

// ---------------------------------------------------------------------------
// P5 (superseded by the 2026-07-15 simplification) — the lights-off state is gone.
// The aisle/step LEDs simply hold their gated ON value; no channel has an OFF branch.
// ---------------------------------------------------------------------------

test('P5: the aisle/step LED channel holds its gated always-on value', () => {
  const aisle = LIGHTING_EMISSION_CHANNELS['aisle-step-led'];
  assert.equal(resolveEmissiveIntensity(aisle), 0.4 * 2.4, 'the gated ON value must not move');
  for (const definition of Object.values(LIGHTING_EMISSION_CHANNELS)) {
    assert.equal('offIntensityScale' in definition, false, 'no channel declares an OFF residual');
  }
});

test('P5: the pruned aisle LED strips stay out of the build and no light toggle exists', () => {
  // Interior prune (2026-07-18, maintainer-ordered): the strips' gated emissive VALUE is still
  // asserted above from the pure channel authority; the built meshes left with the sealed rooms
  // (17-view capture diff: zero shipped pixels), so the built-mesh emissive read retired.
  const { asset } = buildArchitecture({ withRegistry: true });
  const strips = asset.meshes.filter((mesh) => mesh.userData.materialKey === 'aisle-step-led');
  assert.equal(strips.length, 0, 'the pruned aisle LED strips crept back into the build');
  assert.equal('setLightState' in asset, false, 'the light-state switch left the asset API');
});

// ---------------------------------------------------------------------------
// Item 7 — the Techo toggle drives the interior ceilings with the roof panels.
// RED before the fix: `resolveInteriorCeilingVisibility` ignored the roof layer, so
// architecture + roof=off kept the flush dark ceilings — the "second roof".
// ---------------------------------------------------------------------------

test('item 7: interior ceilings follow the roof toggle in architecture; engineering unchanged', () => {
  assert.equal(resolveInteriorCeilingVisibility('architectural', { roofVisible: true }), true);
  assert.equal(resolveInteriorCeilingVisibility('architectural', { roofVisible: false }), false);
  assert.equal(resolveInteriorCeilingVisibility('engineering', { roofVisible: true }), false);
  assert.equal(resolveInteriorCeilingVisibility('engineering', { roofVisible: false }), false);
  // The gated one-argument behaviour survives.
  assert.equal(resolveInteriorCeilingVisibility('architectural'), true);
  assert.equal(resolveInteriorCeilingVisibility('engineering'), false);
});

test('item 7: setRoofLayerVisible(false) hides the built ceilings and restores them', () => {
  const { asset } = buildArchitecture();
  const ceilings = asset.meshes.filter((mesh) => mesh.userData.materialKey === 'interior-ceiling');
  assert.ok(ceilings.length > 0);
  assert.ok(ceilings.every((mesh) => mesh.visible === true), 'architecture + roof on: ceilings visible');
  asset.setRoofLayerVisible(false);
  assert.ok(ceilings.every((mesh) => mesh.visible === false), 'architecture + roof off: ceilings must leave with the roof');
  asset.setRoofLayerVisible(true);
  assert.ok(ceilings.every((mesh) => mesh.visible === true));
});

// ---------------------------------------------------------------------------
// Item 8 — smooth dolly. RED before the fix: OrbitControls applied every wheel notch as an
// instant distance step (`enableZoom` was never disabled and no dolly target existed).
// ---------------------------------------------------------------------------

function createCameraHarness() {
  const point = () => {
    const value = { x: 0, y: 0, z: 0 };
    value.set = (x, y, z) => { value.x = x; value.y = y; value.z = z; };
    return value;
  };
  const camera = {
    position: point(),
    fov: 40,
    projectionUpdates: 0,
    updateProjectionMatrix() { this.projectionUpdates += 1; },
    lookAt() {},
  };
  const listeners = {};
  const orbitControls = {
    target: point(),
    enabled: true,
    enableZoom: true,
    minDistance: 8,
    maxDistance: 150,
    domElement: {
      addEventListener: (type, handler) => { listeners[type] = handler; },
      removeEventListener: (type) => { delete listeners[type]; },
    },
    update() {},
    dispose() {},
  };
  return { camera, orbitControls, listeners };
}

test('item 8: the dolly target derives from the wheel and clamps to the controls range', () => {
  const range = { minDistance: 8, maxDistance: 150 };
  // OrbitControls semantics: deltaY < 0 (wheel up) dollies IN by its own 0.95 scale.
  const oneNotchIn = resolveDollyTarget(100, -100, range);
  assert.ok(Math.abs(oneNotchIn - 95) < 1e-9, 'one notch in must match OrbitControls own 0.95 scale');
  const oneNotchOut = resolveDollyTarget(100, 100, range);
  assert.ok(Math.abs(oneNotchOut - 100 / 0.95) < 1e-9);
  let target = 20;
  for (let i = 0; i < 200; i += 1) target = resolveDollyTarget(target, -100, range);
  assert.equal(target, range.minDistance, 'zooming in forever must rest exactly at minDistance');
  target = 20;
  for (let i = 0; i < 200; i += 1) target = resolveDollyTarget(target, 100, range);
  assert.equal(target, range.maxDistance);
  assert.throws(() => resolveDollyTarget(0, -100, range), RangeError);
});

test('item 8: the exponential step converges monotonically and snaps at the rest threshold', () => {
  let distance = 100;
  const target = 50;
  let previousGap = Math.abs(distance - target);
  for (let i = 0; i < 60; i += 1) {
    distance = stepDollyDistance(distance, target, 1 / 60);
    const gap = Math.abs(distance - target);
    assert.ok(gap <= previousGap + 1e-12, 'the approach must never overshoot or oscillate');
    previousGap = gap;
  }
  assert.equal(distance, target, 'one second at 60 fps must reach rest exactly');
  // A zero/garbage delta never moves backwards.
  assert.equal(stepDollyDistance(100, 50, 0), 100);
  assert.equal(stepDollyDistance(100, 50, Number.NaN), 100);
  assert.ok(SMOOTH_DOLLY.approachRate > 0);
});

test('item 8: the controller owns the zoom — wheel accumulates, update glides, presets cancel', () => {
  const { camera, orbitControls, listeners } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });
  assert.equal(orbitControls.enableZoom, false, 'OrbitControls own stepping dolly must be disabled');
  assert.equal(typeof listeners.wheel, 'function');

  controller.applyPreset('isometric'); // position [66,46,68], target [0,0,0]
  const distance = () => Math.hypot(
    camera.position.x - orbitControls.target.x,
    camera.position.y - orbitControls.target.y,
    camera.position.z - orbitControls.target.z,
  );
  const initial = distance();
  let prevented = 0;
  // Three notches IN (deltaY < 0 dollies in, matching OrbitControls).
  listeners.wheel({ deltaY: -300, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1, 'the wheel must be consumed, not left to scroll the page');
  const wheelTarget = controller.getState().dollyTarget;
  assert.ok(Math.abs(wheelTarget - initial * 0.95 ** 3) < 1e-9);
  assert.equal(distance(), initial, 'the wheel alone must not jump the camera');

  controller.update(1 / 60);
  const afterOneFrame = distance();
  assert.ok(afterOneFrame < initial, 'update must glide toward the target');
  assert.ok(afterOneFrame > wheelTarget, 'one frame must not teleport to the target');
  for (let i = 0; i < 240; i += 1) controller.update(1 / 60);
  assert.ok(Math.abs(distance() - wheelTarget) < 1e-6, 'the glide must settle on the exact wheel target');
  assert.equal(controller.getState().dollyTarget, null, 'a settled dolly rests');

  // A preset is an exact framing: any in-flight dolly is cancelled.
  listeners.wheel({ deltaY: -600, preventDefault: () => {} });
  assert.notEqual(controller.getState().dollyTarget, null);
  controller.applyPreset('network');
  assert.equal(controller.getState().dollyTarget, null);
  assert.deepEqual(
    [camera.position.x, camera.position.y, camera.position.z],
    [...CAMERA_PRESETS.network.position],
  );

  controller.dispose();
  assert.equal(listeners.wheel, undefined, 'dispose must remove the wheel listener');
});

// ---------------------------------------------------------------------------
// Item 9 — boot-time shader warm-up. RED before the fix: no warm-up existed; the first
// selection paid the shader compile interactively.
// CONTRACT CHANGE (limpieza fase 2, 2026-07-18): the cutaway feature was retired, so the
// second compile pass that pre-paid the flipped clipping variants left with it. The warm-up
// is a single boot-configuration compile now.
// ---------------------------------------------------------------------------

test('item 9: the warm-up compiles the boot configuration exactly once', () => {
  let compiles = 0;
  const renderer = { compile() { compiles += 1; } };

  const summary = runShaderWarmup({ renderer, scene: {}, camera: {} });
  assert.equal(summary.compiles, 1);
  assert.equal(compiles, 1, 'one pass: the boot configuration itself');

  assert.throws(() => runShaderWarmup({ scene: {}, camera: {} }), TypeError);
});

test('item 9: main.js warms up before readiness', async () => {
  const source = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  const warmupAt = source.indexOf('runShaderWarmup({');
  const readyAt = source.indexOf("dataset.appReady = 'true'");
  assert.ok(warmupAt > 0 && readyAt > 0);
  assert.ok(warmupAt < readyAt, 'captures wait on data-app-ready: warming after it would race them');
  // Limpieza fase 2 (2026-07-18): the cutaway feature is fully retired — no DOM control, no
  // handler, no URL token, no clipping-variant warmup coupling.
  assert.doesNotMatch(source, /cutaway/i, 'no cutaway machinery survives in main.js');
});

// ---------------------------------------------------------------------------
// Item 10 — 14 packaged rooftop units, one per TC300 zone (spec `packaged_hvac_units`).
// RED before the fix: `plan.structural.roofService.packagedUnits` did not exist.
// ---------------------------------------------------------------------------

test('item 10: one derived packaged unit per TC300 zone, seated inside its own roof plate', () => {
  const plan = createArchitecturePlan();
  const units = plan.structural.roofService.packagedUnits;
  assert.equal(units.length, 14);

  const zoneIds = units.map(({ zoneId }) => zoneId);
  assert.equal(new Set(zoneIds).size, 14, 'one_per_tc300_zone: every zone exactly once');
  assert.deepEqual(new Set(zoneIds), new Set(TC300_DEVICES.map(({ zoneId }) => zoneId)));

  // The mirrored public plate constant matches the plate the builder actually emits.
  assert.deepEqual(PUBLIC_ROOF_PLATE.bounds, { x: [-30, 30], z: [10.5, 22.5] });
  assert.ok(Math.abs(PUBLIC_ROOF_PLATE.top - (4.61 + 0.22 / 2)) < 1e-9);

  for (const unit of units) {
    // Spec dimensions.
    assert.deepEqual(unit.size, [...RTU_PACKAGE.size]);
    // The curb footprint stays on its plate.
    const [x, top, z] = unit.position;
    const half = { x: unit.size[0] / 2, z: unit.size[2] / 2 };
    assert.ok(x - half.x >= unit.plateBounds.x[0] && x + half.x <= unit.plateBounds.x[1], `${unit.id} overhangs its plate in x`);
    assert.ok(z - half.z >= unit.plateBounds.z[0] && z + half.z <= unit.plateBounds.z[1], `${unit.id} overhangs its plate in z`);
    assert.equal(top, unit.plateTop, `${unit.id} must seat ON the plate top face`);
    // supply_drop template: through the plate with at least the spec overlap.
    assert.ok(unit.supplyDrop.overlapWithPlate >= RTU_PACKAGE.supplyDrop.requiredOverlap);
    assert.equal(unit.supplyDrop.start[1] - unit.supplyDrop.end[1], 0.5, 'unit-local -0.60 -> -1.10');
    assert.ok(unit.supplyDrop.end[1] < unit.plateTop, 'the drop must enter the plate, not float on it');
  }

  // No two units collide, and none collides with the existing roof plant.
  const unitBoxes = units.map((unit) => aabb({
    position: [unit.position[0], unit.position[1] + (RTU_PACKAGE.curbHeight + unit.size[1]) / 2, unit.position[2]],
    size: [unit.size[0], RTU_PACKAGE.curbHeight + unit.size[1], unit.size[2]],
  }));
  for (let a = 0; a < unitBoxes.length; a += 1) {
    for (let b = a + 1; b < unitBoxes.length; b += 1) {
      assert.ok(!aabbsIntersect(unitBoxes[a], unitBoxes[b]), `${units[a].id} collides with ${units[b].id}`);
    }
  }
  const plant = plan.structural.roofService.routes.flatMap((route) => [
    aabb(route.plenum), aabb(route.main), aabb(route.sleeve),
  ]);
  for (const [index, box] of unitBoxes.entries()) {
    for (const plantBox of plant) {
      assert.ok(!aabbsIntersect(box, plantBox), `${units[index].id} collides with the rooftop plant`);
    }
  }
});

test('item 10: the builder emits every RTU part, in the roof layer, in contact with its plate', () => {
  const { asset, groups } = buildArchitecture();
  const parts = instancesOf(asset, ({ metadata }) => String(metadata.kind).startsWith('rtu-'));
  const byKind = new Map();
  for (const part of parts) {
    byKind.set(part.metadata.kind, (byKind.get(part.metadata.kind) ?? 0) + 1);
    assert.equal(part.meshLayer, 'roof', `${part.metadata.entityId} must live on the roof layer (Techo toggle, eng roof=off)`);
  }
  // CONTRACT CHANGE (L3 item 12): the master is now the two-section V10 read — AH cap, condenser
  // platform, section divider, end grille, guard bars and handles joined the part list.
  for (const [kind, expected] of [
    ['rtu-curb', 14], ['rtu-cabinet', 14], ['rtu-cap', 14], ['rtu-condenser-platform', 14],
    ['rtu-section-divider', 14], ['rtu-condenser-grille', 14],
    ['rtu-intake-hood', 14], ['rtu-intake-hood-throat', 14], ['rtu-supply-drop', 14],
    ['rtu-condenser-fan', 14], ['rtu-fan-guard', 14],
    ['rtu-fan-guard-bar-1', 14], ['rtu-fan-guard-bar-2', 14],
    ['rtu-panel-seam-1', 14], ['rtu-panel-seam-2', 14],
    ['rtu-panel-handle-1', 14], ['rtu-panel-handle-2', 14],
  ]) {
    assert.equal(byKind.get(kind), expected, `expected ${expected} × ${kind}`);
  }

  // The mirrored PUBLIC_ROOF_PLATE constant is pinned to the plate the builder actually emits.
  const publicRoof = instancesOf(asset, ({ metadata }) => metadata.entityId === 'front-public-roof')[0];
  assert.ok(publicRoof, 'the front public roof panel must exist');
  assert.ok(Math.abs((publicRoof.position[1] + publicRoof.size[1] / 2) - PUBLIC_ROOF_PLATE.top) < 1e-9);
  assert.deepEqual(
    [publicRoof.position[0] - publicRoof.size[0] / 2, publicRoof.position[0] + publicRoof.size[0] / 2],
    PUBLIC_ROOF_PLATE.bounds.x,
  );
  assert.deepEqual(
    [publicRoof.position[2] - publicRoof.size[2] / 2, publicRoof.position[2] + publicRoof.size[2] / 2],
    PUBLIC_ROOF_PLATE.bounds.z,
  );

  // CONTRACT CHANGE (L3 item 11): visible contact is now contact by INTERPENETRATION — the curb
  // base sits 0.03 below the plate top face, because sharing the plane exactly z-fought.
  const units = new Map(asset.plan.structural.roofService.packagedUnits.map((unit) => [unit.id, unit]));
  for (const curb of parts.filter(({ metadata }) => metadata.kind === 'rtu-curb')) {
    const unit = units.get(curb.metadata.rtuId);
    assert.ok(unit, `${curb.metadata.entityId} names no unit`);
    const base = curb.position[1] - curb.size[1] / 2;
    assert.ok(base < unit.plateTop, `${unit.id} curb floats off its plate`);
    assert.ok(unit.plateTop - base <= 0.03 + 1e-9, `${unit.id} curb sinks too deep into its plate`);
    assert.ok(curb.position[1] + curb.size[1] / 2 > unit.plateTop, `${unit.id} curb must stay visible above the plate`);
  }

  // Draw budget: per-part instancing keeps the whole fleet within six added draws.
  const rtuMeshes = asset.meshes.filter((mesh) => (
    String(mesh.userData.materialKey).startsWith('rtu-')
      || (mesh.userData.layer === 'roof' && mesh.userData.materialKey === 'surface-metal')
  ));
  assert.ok(rtuMeshes.length <= 6, `the RTU fleet costs ${rtuMeshes.length} draws; the budget is 6`);
  assert.ok(rtuMeshes.every((mesh) => mesh.parent === groups.roof || groups.roof.children.includes(mesh)));

  // The fan pools carry real per-unit entities for the picker/QA to audit.
  const fanMesh = asset.meshes.find((mesh) => mesh.name === 'structural-roof-rtu-fan-pool');
  assert.equal(fanMesh.count, 14);
  assert.equal(fanMesh.userData.entities.length, 14);
});

// Limpieza fase 2 (2026-07-18): the spec/code preset-sync contract retired with the pruned
// preset catalogue — design-spec.yaml keeps the historical evidence framings, the code ships
// only the single live `network` view.
