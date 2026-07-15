import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TC300_DEVICES, ZONES } from '../src/config.mjs';
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
  resolvePublicRoofVisibility,
  resolveRearRoofVisibility,
} from '../src/scene/architecture.js';
import {
  LIGHTING_EMISSION_CHANNELS,
  resolveEmissiveIntensity,
  resolveInteriorCeilingVisibility,
} from '../src/scene/lighting.js';
import { MATERIAL_SPECS, createMaterialRegistry } from '../src/scene/materials.js';
import { resolveNetworkEvidenceVisibility } from '../src/scene/network-schematic.js';
import {
  SURFACE_REAR_ROOF_CLIP_CAMERAS,
  SURFACE_ROOF_CLIP_CAMERAS,
  createMenuDisplayArtwork,
} from '../src/scene/surfaces.js';

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

const LAYER_NAMES = ['architecture', 'roof', 'walls', 'hvac', 'rs485', 'lorawan', 'internet', 'zones', 'labels'];

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
// Line-of-sight harness: the deterministic half of "the preset frames its subject".
// Occluders replicate a `state=architecture&roof=on&walls=on` capture with the
// per-camera roof clips applied — the exact configuration of the failed P6 views.
// ---------------------------------------------------------------------------

function captureOccluders(asset, cameraName) {
  const boxes = [];
  for (const mesh of asset.meshes) {
    const { layer, materialKey } = mesh.userData;
    if (!['architecture', 'roof', 'walls'].includes(layer)) continue;
    if (layer === 'roof' && !resolvePublicRoofVisibility(cameraName)
      && ['public-roof', 'roof-seam-charcoal'].includes(materialKey)) continue;
    if (layer === 'roof' && !resolveRearRoofVisibility(cameraName) && materialKey === 'rear-roof') continue;
    for (const instance of mesh.userData.instances ?? []) {
      const rotation = instance.rotationY ?? 0;
      let [sx, sy, sz] = instance.size;
      if (rotation) {
        const cos = Math.abs(Math.cos(rotation));
        const sin = Math.abs(Math.sin(rotation));
        [sx, sz] = [sx * cos + sz * sin, sx * sin + sz * cos];
      }
      boxes.push({
        id: String(instance.metadata?.entityId ?? ''),
        min: [instance.position[0] - sx / 2, instance.position[1] - sy / 2, instance.position[2] - sz / 2],
        max: [instance.position[0] + sx / 2, instance.position[1] + sy / 2, instance.position[2] + sz / 2],
      });
    }
  }
  return boxes;
}

function segmentHitsBox(origin, target, box) {
  let entry = 0;
  let exit = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = target[axis] - origin[axis];
    if (Math.abs(delta) < 1e-9) {
      if (origin[axis] < box.min[axis] || origin[axis] > box.max[axis]) return false;
      continue;
    }
    let first = (box.min[axis] - origin[axis]) / delta;
    let second = (box.max[axis] - origin[axis]) / delta;
    if (first > second) [first, second] = [second, first];
    entry = Math.max(entry, first);
    exit = Math.min(exit, second);
    if (entry > exit) return false;
  }
  return entry > 1e-4 && entry < 0.999;
}

function assertLineOfSight(asset, cameraName, samples) {
  const preset = CAMERA_PRESETS[cameraName];
  const boxes = captureOccluders(asset, cameraName);
  for (const { name, point, exclude = [] } of samples) {
    const towardCamera = point.map((value, axis) => preset.position[axis] - value);
    const length = Math.hypot(...towardCamera);
    const sample = point.map((value, axis) => value + (towardCamera[axis] / length) * 0.12);
    const blocker = boxes.find((box) => (
      !exclude.some((token) => box.id.includes(token))
      && segmentHitsBox(preset.position, sample, box)
    ));
    assert.equal(
      blocker,
      undefined,
      `${cameraName} preset cannot see "${name}": blocked by ${blocker?.id}`,
    );
  }
}

// ---------------------------------------------------------------------------
// P1 — the ticket checkpoint preset frames the checkpoint, not the roof plane.
// RED before the fix: the preset stood at [12,7,23], ABOVE the 4.5 m roof plane, with the
// overview zone labels visible at its own camera.
// ---------------------------------------------------------------------------

test('P1: the checkpoint preset stands under the roof plane and clips the public roof', () => {
  const preset = CAMERA_PRESETS.checkpoint;
  assert.ok(preset.position[1] < 4.5, 'the camera must stand under the 4.5 m public roof plane');
  assert.ok(SURFACE_ROOF_CLIP_CAMERAS.includes('checkpoint'));
  assert.equal(resolvePublicRoofVisibility('checkpoint'), false);
  // The target is the checkpoint zone itself.
  const zone = ZONES.find(({ id }) => id === 'ticket-checkpoint');
  assert.ok(preset.target[2] > zone.bounds.z[0] && preset.target[2] < zone.bounds.z[1]);
  assert.ok(preset.target[0] > zone.bounds.x[0] && preset.target[0] < zone.bounds.x[1]);
});

test('P1: gates, accessible lane and band wall are in unobstructed line of sight', () => {
  const { asset } = buildArchitecture();
  assertLineOfSight(asset, 'checkpoint', [
    { name: 'west gate visible span', point: [-1.7, 1.5, 11.7], exclude: ['foh-checkpoint'] },
    { name: 'east gate top', point: [2.6, 1.78, 11.7], exclude: ['foh-checkpoint'] },
    { name: 'east gate south face', point: [2.6, 1.2, 10.52], exclude: ['foh-checkpoint'] },
    { name: 'accessible lane floor', point: [0, 0.06, 12.3] },
    { name: 'band back wall behind the checkpoint', point: [0, 3.0, 14.6] },
  ]);
});

test('P1: the giant overview zone labels are suppressed at the checkpoint camera', () => {
  const { asset } = buildArchitecture();
  asset.setEvidenceCamera('checkpoint');
  const overview = asset.billboards.filter((sprite) => sprite.userData.visibilityScope === 'overview');
  assert.ok(overview.length > 0, 'the overview labels must exist for the suppression to mean anything');
  assert.ok(overview.every((sprite) => sprite.visible === false), 'an overview label leaked into the checkpoint frame');
});

// ---------------------------------------------------------------------------
// 1b — the kitchen preset reads workline + hood + hood->duct contact + service door.
// RED before the fix: the old framing ([-17,2.4,17.4] -> [-10,1.7,12.6]) cropped the hood
// and the duct out of the frame (the LOS existed; the composition discarded it).
// ---------------------------------------------------------------------------

test('1b: the kitchen preset keeps hood, hood outlet, duct contact and service door in sight', () => {
  const { asset } = buildArchitecture();
  const extraction = asset.plan.structural.kitchenExtraction;
  assertLineOfSight(asset, 'kitchen', [
    {
      name: 'hood body front',
      point: [
        extraction.hoodBody.position[0],
        extraction.hoodBody.position[1],
        extraction.hoodBody.position[2] + extraction.hoodBody.size[2] / 2,
      ],
      exclude: ['hood'],
    },
    { name: 'hood outlet', point: [...extraction.hoodOutlet.position], exclude: ['hood', 'kitchen-extract'] },
    { name: 'duct at the soffit', point: [extraction.duct.socketPosition[0], 4.3, extraction.duct.socketPosition[2]], exclude: ['kitchen-extract'] },
    { name: 'kitchen service door area', point: [-11.5, 1.2, 14.9] },
  ]);
  // The vertical span of the correction: the framing must hold the worktop AND the duct root.
  const preset = CAMERA_PRESETS.kitchen;
  assert.ok(preset.position[1] >= 3, 'the camera must rise enough to hold the duct in frame');
  assert.ok(preset.target[1] >= 2, 'the aim must lift off the worktop toward the hood line');
});

// ---------------------------------------------------------------------------
// P6d — the technical preset looks through the section cut.
// RED before the fix: the rear roof was never clipped and the preset showed roof planes.
// ---------------------------------------------------------------------------

test('P6d: the technical preset clips the rear roof and sees corridor, wall, doors and UC100-B', () => {
  assert.deepEqual([...SURFACE_REAR_ROOF_CLIP_CAMERAS], ['technical']);
  assert.equal(resolveRearRoofVisibility('technical'), false);
  assert.equal(resolveRearRoofVisibility('isometric'), true);
  assert.equal(resolveRearRoofVisibility('facade'), true);

  const { asset } = buildArchitecture();
  assertLineOfSight(asset, 'technical', [
    { name: '1.5 m service corridor floor (west)', point: [-10, 0.08, -19.25] },
    { name: 'service corridor floor at the UC100-B door', point: [-16, 0.08, -19.4] },
    { name: 'separating wall', point: [-14, 2.2, -20.19], exclude: ['rear-separation'] },
    { name: 'left-control door head', point: [-16, 2.32, -20.15], exclude: ['left-control-service-door'] },
    { name: 'UC100-B cabinet', point: [-16, 1.55, -21.14], exclude: ['UC100-B'] },
    { name: 'left-control room floor', point: [-17.5, 0.08, -21.2] },
    { name: 'right-control room floor', point: [16, 0.08, -21.2] },
  ]);
});

test('P6d: the built rear roof panel actually hides at the technical camera and returns elsewhere', () => {
  const { asset } = buildArchitecture();
  const rearRoof = asset.meshes.filter((mesh) => mesh.userData.materialKey === 'rear-roof');
  assert.ok(rearRoof.length > 0);
  asset.setEvidenceCamera('technical');
  assert.ok(rearRoof.every((mesh) => mesh.visible === false));
  asset.setEvidenceCamera('isometric');
  assert.ok(rearRoof.every((mesh) => mesh.visible === true));
});

// ---------------------------------------------------------------------------
// P2 — the external schematic chain and the diagram board are engineering evidence.
// RED before the fix: the endpoint proxies rendered in every architecture capture and
// `resolveNetworkEvidenceVisibility('complete-network', { visualMode: 'architectural' })`
// returned `schematic: true`.
// ---------------------------------------------------------------------------

test('P2: the diagram board is hidden in the architecture state at complete-network', () => {
  assert.equal(
    resolveNetworkEvidenceVisibility('complete-network', { visualMode: 'architectural' }).schematic,
    false,
  );
  assert.equal(
    resolveNetworkEvidenceVisibility('complete-network', { visualMode: 'engineering' }).schematic,
    true,
  );
  // The board's own inspection preset stays a board view — it exists for nothing else.
  assert.equal(resolveNetworkEvidenceVisibility('network-schematic-detail').schematic, true);
});

test('P2: external endpoint proxies hide in architecture and return in engineering', () => {
  const { asset } = buildArchitecture();
  const proxies = asset.meshes.filter((mesh) => String(mesh.userData.materialKey).startsWith('endpoint-'));
  assert.equal(proxies.length, 6, 'router, internet, Niagara, PC, tablet and smartphone proxies');

  // Boot state is architectural: the building must stand alone.
  asset.setEvidenceCamera('complete-network');
  assert.ok(proxies.every((mesh) => mesh.visible === false), 'an external proxy leaked into the architecture state');
  assert.equal(asset.networkSchematic.root.visible, false, 'the board leaked into the architecture state');

  // `visual_states.architecture` keeps `devices: subtle` — the BUILDING devices stay.
  const buildingDevices = asset.meshes.filter((mesh) => (
    mesh.userData.layer === 'hvac'
      && ['tc-black', 'uc-white', 'gateway-dark'].includes(mesh.userData.materialKey)
  ));
  assert.ok(buildingDevices.length >= 3);
  assert.ok(buildingDevices.every((mesh) => mesh.visible === true), 'a building device vanished from architecture');

  asset.setLabelPolicy({ visualMode: 'engineering' });
  assert.ok(proxies.every((mesh) => mesh.visible === true), 'the external chain must return in engineering');
  assert.equal(asset.networkSchematic.root.visible, true);

  asset.setLabelPolicy({ visualMode: 'architectural' });
  assert.ok(proxies.every((mesh) => mesh.visible === false), 'the mode round-trip must restore the hidden chain');
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
// P5 — the aisle/step LEDs keep a lights-off floor; the ON ladder is untouched.
// RED before the fix: `resolveEmissiveIntensity(aisle, 'off')` was 0 and the sala fell
// below silhouette legibility. (The perceptual outcome is render-judged.)
// ---------------------------------------------------------------------------

test('P5: only the aisle/step LED channel keeps a declared lights-off floor', () => {
  const aisle = LIGHTING_EMISSION_CHANNELS['aisle-step-led'];
  const on = resolveEmissiveIntensity(aisle, 'on');
  const off = resolveEmissiveIntensity(aisle, 'off');
  assert.equal(on, 0.4 * 2.4, 'the gated ON value must not move');
  assert.ok(off > 0, 'the OFF floor must exist');
  assert.ok(on / off >= 3, 'the pair must still read as two states');
  for (const [key, definition] of Object.entries(LIGHTING_EMISSION_CHANNELS)) {
    if (key === 'aisle-step-led') continue;
    assert.equal(resolveEmissiveIntensity(definition, 'off'), 0, `${key} must still go fully dark`);
  }
});

test('P5: setLightState(off) leaves the built aisle LED strips emitting at the floor', () => {
  const { asset } = buildArchitecture({ withRegistry: true });
  const strips = asset.meshes.filter((mesh) => mesh.userData.materialKey === 'aisle-step-led');
  assert.ok(strips.length > 0, 'the aisle LED strips must exist in the build');
  asset.setLightState('off');
  const aisle = LIGHTING_EMISSION_CHANNELS['aisle-step-led'];
  for (const mesh of strips) {
    assert.equal(mesh.material.emissiveIntensity, resolveEmissiveIntensity(aisle, 'off'));
    assert.ok(mesh.material.emissiveIntensity > 0);
  }
  asset.setLightState('on');
  for (const mesh of strips) {
    assert.equal(mesh.material.emissiveIntensity, resolveEmissiveIntensity(aisle, 'on'));
  }
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
  // Engineering behaviour is untouched by the toggle.
  asset.setLabelPolicy({ visualMode: 'engineering' });
  assert.ok(ceilings.every((mesh) => mesh.visible === false));
  asset.setRoofLayerVisible(true);
  assert.ok(ceilings.every((mesh) => mesh.visible === false), 'engineering never shows the interior ceilings');
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
  const controller = createCameraController({ camera, orbitControls, eventTarget: null });
  assert.equal(orbitControls.enableZoom, false, 'OrbitControls own stepping dolly must be disabled');
  assert.equal(typeof listeners.wheel, 'function');

  controller.applyPreset('neutral'); // position [54,44,58], target [0,1.5,-1]
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
  controller.applyPreset('kitchen');
  assert.equal(controller.getState().dollyTarget, null);
  assert.deepEqual(
    [camera.position.x, camera.position.y, camera.position.z],
    [...CAMERA_PRESETS.kitchen.position],
  );

  // First-person ignores the wheel entirely.
  controller.setNavigationMode('first-person');
  listeners.wheel({ deltaY: 300, preventDefault: () => {} });
  assert.equal(controller.getState().dollyTarget, null, 'first-person must never inherit an orbit dolly');
  controller.dispose();
  assert.equal(listeners.wheel, undefined, 'dispose must remove the wheel listener');
});

// ---------------------------------------------------------------------------
// Item 9 — boot-time shader warm-up. RED before the fix: no warm-up existed; the first
// cutaway toggle and the first selection paid the shader compile interactively.
// ---------------------------------------------------------------------------

test('item 9: the warm-up compiles both cutaway variants and restores the exact boot state', () => {
  const compiles = [];
  const cutawayCalls = [];
  const renderer = {
    localClippingEnabled: false,
    compile() { compiles.push(this.localClippingEnabled); },
  };
  const materialRegistry = { setCutaway: (enabled, plane) => cutawayCalls.push([enabled, plane]) };
  const plane = { isPlane: true };

  const summary = runShaderWarmup({
    renderer, scene: {}, camera: {}, materialRegistry, clippingPlane: plane, bootCutaway: false,
  });
  assert.equal(summary.compiles, 2);
  assert.deepEqual(compiles, [false, true], 'boot variant first, then the flipped clipping variant');
  assert.deepEqual(cutawayCalls, [[true, plane], [false, plane]], 'flip, then byte-identical restore');
  assert.equal(renderer.localClippingEnabled, false, 'the boot clipping state must be restored');

  compiles.length = 0;
  cutawayCalls.length = 0;
  renderer.localClippingEnabled = true;
  const engineeringBoot = runShaderWarmup({
    renderer, scene: {}, camera: {}, materialRegistry, clippingPlane: plane, bootCutaway: true,
  });
  assert.deepEqual(compiles, [true, false], 'a cutaway boot warms the UNclipped variant instead');
  assert.equal(renderer.localClippingEnabled, true);
  assert.equal(engineeringBoot.restoredCutaway, true);

  assert.throws(() => runShaderWarmup({ scene: {}, camera: {} }), TypeError);
});

test('item 9: main.js warms up before readiness and stops re-baking shadows on cutaway', async () => {
  const source = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  const warmupAt = source.indexOf('runShaderWarmup({');
  const readyAt = source.indexOf("dataset.appReady = 'true'");
  assert.ok(warmupAt > 0 && readyAt > 0);
  assert.ok(warmupAt < readyAt, 'captures wait on data-app-ready: warming after it would race them');
  const cutawayHandler = source.slice(
    source.indexOf('cutaway.addEventListener'),
    source.indexOf('writeQueryState(mutableQuery);', source.indexOf('cutaway.addEventListener')),
  );
  assert.ok(cutawayHandler.length > 0);
  assert.doesNotMatch(
    cutawayHandler,
    /bakeShadows/,
    'clipShadows is never enabled, so the cutaway toggle must not pay a shadow re-bake',
  );
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

// ---------------------------------------------------------------------------
// Spec/code preset sync — the corrections order it explicitly for the touched presets.
// ---------------------------------------------------------------------------

test('spec sync: the three reframed presets carry identical values in design-spec.yaml', async () => {
  const spec = await readFile(new URL('../design-spec.yaml', import.meta.url), 'utf8');
  const entry = (name) => {
    const match = spec.match(new RegExp(
      `${name}: \\{position: \\[([^\\]]+)\\], target: \\[([^\\]]+)\\], fov: (\\d+)\\}`,
    ));
    assert.ok(match, `spec camera preset ${name} not found`);
    const parse = (list) => list.split(',').map((value) => Number(value.trim()));
    return { position: parse(match[1]), target: parse(match[2]), fov: Number(match[3]) };
  };
  for (const [specName, codeName] of [
    ['ticket_checkpoint', 'checkpoint'],
    ['technical_room', 'technical'],
    ['kitchen', 'kitchen'],
  ]) {
    const fromSpec = entry(specName);
    const fromCode = CAMERA_PRESETS[codeName];
    assert.deepEqual(fromSpec.position, [...fromCode.position], `${specName} position drifted from the code`);
    assert.deepEqual(fromSpec.target, [...fromCode.target], `${specName} target drifted from the code`);
    assert.equal(fromSpec.fov, fromCode.fov, `${specName} fov drifted from the code`);
  }
});
