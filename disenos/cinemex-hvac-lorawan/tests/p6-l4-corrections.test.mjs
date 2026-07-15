import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { CAMERA_PRESETS } from '../src/controllers/camera.js';
import { parseQueryState } from '../src/controllers/query-state.js';
import {
  RTU_PACKAGE,
  createArchitecturePlan,
  createArchitectureStructure,
  resolveSpineAssemblyVisibility,
} from '../src/scene/architecture.js';
import {
  LIGHTING_ROOF_OPEN_FILL_LIFT,
  resolveZoneFillGain,
} from '../src/scene/lighting.js';
import { MATERIAL_SPECS, createMaterialRegistry } from '../src/scene/materials.js';
import {
  TEMPERATURE_CHIP,
  createChipEnvelope,
  formatChipTemperature,
  isCameraOutside,
  resolveChipPose,
} from '../src/scene/temperature-chips.js';

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
    AdditiveBlending: 'additive',
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

const spineMeshesOf = (asset) => asset.meshes.filter((mesh) => (
  mesh.userData.layer === 'architecture'
    && (mesh.userData.entities?.length ?? 0) > 0
    && mesh.userData.entities.every(({ kind }) => String(kind).startsWith('roof-service'))
));

// ---------------------------------------------------------------------------
// M1 — the duct network reads galvanized, not near-black.
// RED before the fix: the plant sat in the CORRIDOR lighting zone (the x/z bands ignore Y),
// so the corridor dim rejected the sun on rooftop equipment standing in full daylight.
// ---------------------------------------------------------------------------

test('M1: the spine plant and branches are exterior-lit galvanized metal', () => {
  const { asset, materialRegistry } = buildArchitecture({ withRegistry: true });
  const spine = spineMeshesOf(asset);
  assert.ok(spine.length >= 3, 'mains, plant collars and branches must form dedicated buckets');
  for (const mesh of spine) {
    assert.equal(mesh.userData.lightingZone, 'exterior', `${mesh.name} would take the corridor dim and render near-black`);
  }
  // The duct bucket rides the CANONICAL pooled galvanized material — undimmed, palette entry reused.
  const ductMesh = spine.find((mesh) => mesh.userData.materialKey === 'duct-galv');
  assert.ok(ductMesh, 'the duct network must own its bucket (M3 toggles it as one assembly)');
  assert.equal(ductMesh.material, materialRegistry.materials.galvanizedDuct);
  assert.ok(MATERIAL_SPECS.galvanizedDuct.metalness >= 0.9, 'the declared read is light METALLIC galvanized');
  const luminance = (color) => (
    ((color >> 16) & 0xff) * 0.2126 + ((color >> 8) & 0xff) * 0.7152 + (color & 0xff) * 0.0722
  );
  assert.ok(
    luminance(MATERIAL_SPECS.galvanizedDuct.color) > luminance(MATERIAL_SPECS.shellCharcoal.color) * 3,
    'galvanized must separate decisively from the charcoal the judge saw',
  );
  // Every branch box moved into the dedicated bucket — none left behind in the shared steel.
  const strayBranches = instancesOf(asset, ({ metadata }) => metadata.kind === 'roof-service-branch')
    .filter(({ materialKey }) => !['duct-galv', 'containment-orange'].includes(materialKey));
  assert.deepEqual(strayBranches.map(({ metadata }) => metadata.entityId), []);
});

// ---------------------------------------------------------------------------
// M3 — the spine assembly follows the Techo toggle in architecture mode.
// RED before the fix: neither the rule nor the dedicated buckets existed; roof-off left the
// assembly hovering over the open trench.
// ---------------------------------------------------------------------------

test('M3: roof-off architecture hides the spine assembly; engineering keeps it', () => {
  assert.equal(resolveSpineAssemblyVisibility('architectural', { roofVisible: true }), true);
  assert.equal(resolveSpineAssemblyVisibility('architectural', { roofVisible: false }), false);
  assert.equal(resolveSpineAssemblyVisibility('engineering', { roofVisible: false }), true);
  assert.equal(resolveSpineAssemblyVisibility('engineering', { roofVisible: true }), true);

  const { asset } = buildArchitecture();
  const spine = spineMeshesOf(asset);
  assert.ok(spine.every((mesh) => mesh.visible === true), 'architecture with the roof on shows the plant');
  asset.setRoofLayerVisible(false);
  assert.ok(spine.every((mesh) => mesh.visible === false), 'roof-off architecture must take the plant with the plates');
  asset.setLabelPolicy({ visualMode: 'engineering' });
  assert.ok(spine.every((mesh) => mesh.visible === true), 'engineering keeps the mains regardless of the roof toggle');
  asset.setLabelPolicy({ visualMode: 'architectural' });
  asset.setRoofLayerVisible(true);
  assert.ok(spine.every((mesh) => mesh.visible === true));
});

// ---------------------------------------------------------------------------
// M2 — the checkpoint is dressed: counter caps, a scanner/POS block, a staff proxy.
// RED before the fix: the two podiums were bare boxes and no human stood in the lane.
// ---------------------------------------------------------------------------

test('M2: counter caps, POS block and a staff proxy dress the checkpoint', () => {
  const { asset } = buildArchitecture();
  const caps = instancesOf(asset, ({ metadata }) => metadata.component === 'checkpoint-counter-cap');
  assert.equal(caps.length, 2, 'one counter cap per podium');
  for (const cap of caps) {
    const podiumTop = 1.8; // the gated checkpoint blocks: centre 0.9, height 1.8
    const base = cap.position[1] - cap.size[1] / 2;
    const top = cap.position[1] + cap.size[1] / 2;
    assert.ok(base < podiumTop && top > podiumTop, 'the cap must cross the podium top plane (no shared plane)');
  }
  const posBody = instancesOf(asset, ({ metadata }) => metadata.component === 'checkpoint-pos-body');
  const posScreen = instancesOf(asset, ({ metadata }) => metadata.component === 'checkpoint-pos-screen');
  assert.equal(posBody.length, 1);
  assert.equal(posScreen.length, 1);
  assert.equal(posScreen[0].materialKey, 'surface-pos-screen', 'the screen rides the gated emissive POS channel');

  const staff = asset.plan.structural.humanReferences.find(({ id }) => id === 'human-checkpoint-staff');
  assert.ok(staff, 'a staff proxy must exist');
  const zone = APP_CONFIG.zones.find(({ id }) => id === 'ticket-checkpoint');
  assert.ok(Math.abs(staff.position[0]) < 1.2, 'the staff proxy stands inside the accessible lane');
  assert.ok(staff.position[2] > zone.bounds.z[0] && staff.position[2] < zone.bounds.z[1]);
  const torso = instancesOf(asset, ({ metadata }) => (
    metadata.entityId === 'human-checkpoint-staff' && metadata.component === 'torso'
  ));
  assert.equal(torso.length, 1, 'the staff proxy must be emitted like every human reference');
});

// ---------------------------------------------------------------------------
// M4 — roof-off architecture lifts the room fill; every gated state is untouched.
// RED before the fix: resolveZoneFillGain ignored the roof toggle entirely.
// ---------------------------------------------------------------------------

test('M4: the fill lift exists ONLY in the roof-off architecture state', () => {
  const base = resolveZoneFillGain({ visualMode: 'architectural', lightState: 'on' });
  assert.equal(
    resolveZoneFillGain({ visualMode: 'architectural', lightState: 'on', roofVisible: false }),
    base * LIGHTING_ROOF_OPEN_FILL_LIFT,
  );
  assert.equal(
    resolveZoneFillGain({ visualMode: 'architectural', lightState: 'on', roofVisible: true }),
    base,
    'roof-on architecture is gated and must not move',
  );
  assert.equal(
    resolveZoneFillGain({ visualMode: 'engineering', lightState: 'on', roofVisible: false }),
    resolveZoneFillGain({ visualMode: 'engineering', lightState: 'on', roofVisible: true }),
    'engineering has its own gated lift; the roof toggle must not stack another',
  );
  // Back-compat: the two-argument calls of every existing gated test resolve as roof-on.
  assert.equal(resolveZoneFillGain({ visualMode: 'architectural', lightState: 'off' }) > 0, true);
  assert.ok(LIGHTING_ROOF_OPEN_FILL_LIFT > 1 && LIGHTING_ROOF_OPEN_FILL_LIFT <= 2, 'a SMALL lift, not a relight');
});

// ---------------------------------------------------------------------------
// M5 — the outer public-band units snap to their own outer clamp limits.
// RED before the fix: the westmost pair sat 7.0 m apart and merged at the facade glancing angle.
// ---------------------------------------------------------------------------

test('M5: multi-unit lanes push their end units to the outer clamp limits', () => {
  const plan = createArchitecturePlan();
  const units = plan.structural.roofService.packagedUnits;
  const publicRow = units
    .filter(({ plateOwner }) => plateOwner === 'front-public-roof')
    .sort((a, b) => a.position[0] - b.position[0]);
  assert.equal(publicRow.length, 6);

  const zoneOf = (unit) => APP_CONFIG.zones.find(({ id }) => id === unit.zoneId);
  const westmost = publicRow[0];
  const eastmost = publicRow[publicRow.length - 1];
  // Derived, not hand-placed: the end units rest exactly on their own zone-clamp limits.
  assert.ok(
    Math.abs(westmost.position[0] - (zoneOf(westmost).bounds.x[0] + RTU_PACKAGE.clearance.x)) < 1e-9,
    'the westmost unit must snap to its western clamp limit',
  );
  assert.ok(
    Math.abs(eastmost.position[0] - (zoneOf(eastmost).bounds.x[1] - RTU_PACKAGE.clearance.x)) < 1e-9,
    'the eastmost unit must snap to its eastern clamp limit',
  );
  // The correction the judge asked for, measured: the westmost pair no longer sits in-line-close.
  assert.ok(
    publicRow[1].position[0] - publicRow[0].position[0] >= 9,
    `westmost pair gap ${(publicRow[1].position[0] - publicRow[0].position[0]).toFixed(2)} m still merges at glancing angles`,
  );
  // Zone ownership is untouched: still one unit per zone, every unit above its own zone's plate.
  assert.equal(new Set(units.map(({ zoneId }) => zoneId)).size, 14);
  for (const unit of publicRow) {
    const zone = zoneOf(unit);
    assert.ok(unit.position[0] >= zone.bounds.x[0] && unit.position[0] <= zone.bounds.x[1]);
  }
});

// ---------------------------------------------------------------------------
// Item 15 — live temperature chips (Safran pattern, library markers-ui/sims-floating-banner).
// RED before the fix: src/scene/temperature-chips.js did not exist.
// ---------------------------------------------------------------------------

test('item 15: fourteen chips read the one simulation the alarms read, and recolor on alarm', () => {
  const { asset } = buildArchitecture();
  const chips = asset.temperatureChips;
  assert.ok(chips, 'the chip field must build');
  assert.equal(chips.chips.length, 14, 'one chip per packaged unit');
  assert.equal(chips.getStats().chips, 14);

  // Healthy boot: every chip carries its zone's live reading, no halo anywhere.
  const healthyModel = asset.getInteractionModel();
  for (const chip of chips.chips) {
    assert.equal(
      formatChipTemperature(chip.reading.temperature),
      formatChipTemperature(healthyModel.telemetry[chip.unit.tc300Id].temperature),
      `${chip.unit.tc300Id} chip must read the model's own telemetry`,
    );
    assert.equal(chip.halo.visible, false, 'a normal chip is clean — no halo');
    assert.equal(chip.badgeMaterial.toneMapped, false, 'ACES would wash the canvas without toneMapped:false');
    assert.equal(chip.haloMaterial.toneMapped, false);
    assert.equal(chip.badge.renderOrder, TEMPERATURE_CHIP.renderOrder.badge);
    assert.equal(chip.halo.renderOrder, TEMPERATURE_CHIP.renderOrder.halo);
  }

  // A hot state recolors ITS chip automatically: same derivation the alarm list reads.
  asset.setInteractionState({ state: 'hot-sala-3', tick: 0 });
  const hotModel = asset.getInteractionModel();
  const hotChip = chips.chipsById.get('TC300-08');
  assert.equal(hotModel.deviceStatus['TC300-08'], 'alarm');
  assert.equal(hotChip.reading.alarm, true);
  assert.equal(hotChip.halo.visible, true, 'the alarm chip pulses an additive halo');
  assert.equal(hotChip.reading.temperature, hotModel.telemetry['TC300-08'].temperature);
  const others = chips.chips.filter((chip) => chip.unit.tc300Id !== 'TC300-08');
  assert.ok(others.every((chip) => chip.halo.visible === false), 'only the alarmed zone lights a halo');

  // Restore: the chip returns to the clean read.
  asset.setInteractionState({ state: 'engineering', tick: 0 });
  assert.equal(chips.chipsById.get('TC300-08').halo.visible, false);
});

test('item 15: the badge canvas redraws on the sample cadence and on state changes, never per tick', () => {
  const { asset } = buildArchitecture();
  const chips = asset.temperatureChips;
  const bootRedraws = chips.getStats().redraws;
  assert.ok(bootRedraws >= 14, 'every chip draws once at boot');

  // Ticks inside one reading sample: poses move, canvases do not redraw.
  for (let tick = 1; tick < TEMPERATURE_CHIP.readingIntervalTicks; tick += 1) {
    asset.setInteractionState({ tick });
  }
  assert.equal(chips.getStats().redraws, bootRedraws, 'a tick inside the sample window must never repaint');

  // Sixty ticks total: the live telemetry refreshes on the deterministic cadence, bounded hard.
  for (let tick = TEMPERATURE_CHIP.readingIntervalTicks; tick <= 60; tick += 1) {
    asset.setInteractionState({ tick });
  }
  const afterMinute = chips.getStats().redraws;
  const samples = Math.floor(60 / TEMPERATURE_CHIP.readingIntervalTicks);
  assert.ok(afterMinute > bootRedraws, 'live readings must actually refresh');
  assert.ok(
    afterMinute - bootRedraws <= samples * 14,
    `redraws are bounded by the sample cadence (${afterMinute - bootRedraws} > ${samples * 14})`,
  );

  // A state change repaints immediately — and ONLY the chips whose reading changed.
  const beforeFault = chips.getStats().redraws;
  asset.setInteractionState({ state: 'hot-kitchen', tick: 60 });
  const afterFault = chips.getStats().redraws;
  assert.ok(afterFault > beforeFault, 'the kitchen chip must repaint red at once');
  assert.ok(afterFault - beforeFault < 14, 'unchanged chips must not repaint');

  // Deterministic pose: t0/t30 are exact functions of the tick clock.
  const at0 = resolveChipPose(0, 3);
  const at40 = resolveChipPose(TEMPERATURE_CHIP.bob.periodTicks, 3);
  assert.ok(Math.abs(at0.bob - at40.bob) < 1e-12, 'the bob is periodic on the tick clock');
  assert.notDeepEqual(resolveChipPose(0, 3), resolveChipPose(30, 3), 't0 and t30 must differ');
  assert.throws(() => formatChipTemperature(Number.NaN), RangeError);
  assert.equal(formatChipTemperature(22.451), '22.5 °C');
});

// ---------------------------------------------------------------------------
// Item 16 — exterior-only visibility, pure and preset-proven.
// RED before the fix: neither isCameraOutside nor the envelope existed.
// ---------------------------------------------------------------------------

test('item 16: the envelope derives from the building and classifies every preset correctly', () => {
  const envelope = createChipEnvelope({ building: APP_CONFIG.building, maxPlateTop: 9.02 });
  assert.deepEqual([...envelope.x], [-30, 30]);
  assert.deepEqual([...envelope.z], [-22.5, 22.5]);
  assert.equal(envelope.margin, 2);
  assert.ok(Math.abs(envelope.minOverheadY - 10.02) < 1e-9);

  const { asset } = buildArchitecture();
  const hidden = ['lobby', 'concessions', 'kitchen', 'checkpoint', 'corridor', 'ug67'];
  for (const name of hidden) {
    assert.equal(
      isCameraOutside(asset.chipEnvelope, CAMERA_PRESETS[name].position),
      false,
      `${name} stands inside the envelope: chips must hide`,
    );
  }
  // The validator's boundary case: reference-match is INSIDE the building — chips hidden.
  assert.equal(isCameraOutside(asset.chipEnvelope, [-7.5, 4.2, -8.9]), false);

  const visible = ['facade', 'auditorium', 'network', 'top'];
  for (const name of visible) {
    assert.equal(
      isCameraOutside(asset.chipEnvelope, CAMERA_PRESETS[name].position),
      true,
      `${name} stands outside: chips must show`,
    );
  }
  // `technical` is exterior BY CONTRACT: y=30 clears the overhead rule (roof plates + 1 m).
  assert.equal(isCameraOutside(asset.chipEnvelope, CAMERA_PRESETS.technical.position), true);
  assert.throws(() => isCameraOutside(asset.chipEnvelope, null), TypeError);
});

test('item 16: the chip group follows the camera across presets and live positions', () => {
  const { asset } = buildArchitecture();
  const group = asset.temperatureChips.group;
  assert.equal(group.visible, true, 'boot camera (isometric) is exterior');
  asset.setEvidenceCamera('lobby');
  assert.equal(group.visible, false, 'an interior preset hides the whole field');
  asset.setEvidenceCamera('neutral');
  assert.equal(group.visible, true);
  asset.setEvidenceCamera('reference-match');
  assert.equal(group.visible, false, 'the in-envelope lookdev position hides the chips');
  // The live orbit path: the runtime feeds raw positions every frame.
  assert.equal(asset.setChipCameraPosition({ x: 0, y: 50, z: 0 }), true);
  assert.equal(asset.setChipCameraPosition({ x: 0, y: 2, z: 0 }), false);
  assert.equal(group.visible, false);
});

// ---------------------------------------------------------------------------
// Item 17 — the `top` thermal roof plan preset, spec+code+enum in sync.
// RED before the fix: no `top` preset, `camera=top` tripped the atomic query reset.
// ---------------------------------------------------------------------------

test('item 17: top preset exists, is driveable, suppresses the zone banners, matches the spec', async () => {
  assert.deepEqual([...CAMERA_PRESETS.top.position], [0, 95, 6]);
  assert.deepEqual([...CAMERA_PRESETS.top.target], [0, 0, -2]);
  assert.equal(CAMERA_PRESETS.top.fov, 55);

  // Driveable, non-resetting query value (the atomic-reset trap).
  const parsed = parseQueryState('?camera=top&state=engineering&links=all');
  assert.equal(parsed.camera, 'top');
  assert.equal(parsed.sceneState, 'engineering', 'camera=top must not reset the rest of the state');

  const { asset } = buildArchitecture();
  asset.setEvidenceCamera('top');
  const overview = asset.billboards.filter((sprite) => sprite.userData.visibilityScope === 'overview');
  assert.ok(overview.length > 0);
  assert.ok(overview.every((sprite) => sprite.visible === false), 'the zone banners would bury the thermal plan');
  assert.equal(asset.temperatureChips.group.visible, true, 'the thermal roof plan IS the chip field');

  const spec = await readFile(new URL('../design-spec.yaml', import.meta.url), 'utf8');
  const match = spec.match(/top: \{position: \[([^\]]+)\], target: \[([^\]]+)\], fov: (\d+)\}/);
  assert.ok(match, 'the spec must carry the top preset');
  const parse = (list) => list.split(',').map((value) => Number(value.trim()));
  assert.deepEqual(parse(match[1]), [...CAMERA_PRESETS.top.position]);
  assert.deepEqual(parse(match[2]), [...CAMERA_PRESETS.top.target]);
  assert.equal(Number(match[3]), CAMERA_PRESETS.top.fov);

  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-camera="top"/, 'the preset must be reachable from the UI');
});
