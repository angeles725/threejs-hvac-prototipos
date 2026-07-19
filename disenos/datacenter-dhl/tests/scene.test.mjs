/**
 * P1-5 — headless scene tests for the forked room monolith (index.html).
 *
 * The skeleton's own __HEADLESS__ convention is the hook: the inline module script builds the
 * full scene graph without renderer/controls when `window.__HEADLESS__` is set. Following the
 * cinemex builder-test pattern (stub THREE + Proxy 2D context), the test extracts the inline
 * script, strips its import lines, and runs it as a function with the REAL sim/chips modules
 * injected — so EQUIP registration, chip creation, the banner and the stats all execute for
 * counting, no browser needed.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EQUIPMENT_INSTANCES,
  chipReadingsOf,
  createEquipmentModel,
} from '../src/sim/equipment.mjs';
import {
  createDhlBanner,
  createEquipmentChips,
  resolveChipAccent,
} from '../src/scene/equipment-chips.js';

const HTML_URL = new URL('../index.html', import.meta.url);
const DIR_URL = new URL('./', HTML_URL);

// ---------------------------------------------------------------------------
// Minimal Three.js + document stubs (the cinemex builder-test shape).
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
  clone() { return new StubVector3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { return this.set(a.x - b.x, a.y - b.y, a.z - b.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { return this; }
}

class StubQuaternion {
  setFromAxisAngle() { return this; }
  setFromUnitVectors() { return this; }
  clone() { return new StubQuaternion(); }
}

class StubObject3D {
  constructor() {
    this.position = new StubVector3();
    this.rotation = { x: 0, y: 0, z: 0, set: () => undefined };
    this.scale = { set: () => undefined, setScalar: () => undefined };
    this.quaternion = new StubQuaternion();
    this.matrix = {};
    this.userData = {};
  }

  updateMatrix() {}
}

class StubGroup extends StubObject3D {
  constructor() {
    super();
    this.children = [];
    this.visible = true;
  }

  add(...objects) { for (const child of objects) { this.children.push(child); child.parent = this; } return this; }
  remove(child) { this.children = this.children.filter((entry) => entry !== child); return this; }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse?.(callback); }
  rotateX() { return this; }
  rotateZ() { return this; }
}

class StubMesh extends StubGroup {
  constructor(geometry, material) {
    super();
    this.isMesh = true;
    this.geometry = geometry;
    this.material = material;
    this.renderOrder = 0;
  }
}

class StubInstancedMesh extends StubMesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.isMesh = false;
    this.isInstancedMesh = true;
    this.count = count;
    this.instanceMatrix = { needsUpdate: false, setUsage: () => undefined };
  }

  setMatrixAt() {}
}

class StubSprite extends StubGroup {
  constructor(material) {
    super();
    this.isSprite = true;
    this.material = material;
    this.renderOrder = 0;
  }
}

function createThreeStub() {
  class Geometry {
    constructor(...args) {
      this.args = args;
      this.attributes = {
        position: {
          count: 0, getX: () => 0, getY: () => 0, getZ: () => 0, setXYZ: () => undefined, needsUpdate: false,
        },
      };
    }

    rotateX() { return this; }
    translate() { return this; }
    scale() { return this; }
    computeVertexNormals() { return this; }
    dispose() {}
  }
  class MaterialStub {
    constructor(parameters = {}) { Object.assign(this, parameters); }
    dispose() {}
  }
  class ShapeStub {
    constructor() { this.holes = []; }
    moveTo() { return this; }
    lineTo() { return this; }
    quadraticCurveTo() { return this; }
    absarc() { return this; }
    closePath() { return this; }
  }
  class TextureStub {
    constructor(image) { this.image = image; this.repeat = { set: () => undefined }; this.needsUpdate = false; }
    dispose() {}
  }
  class LightStub extends StubGroup {
    constructor() {
      super();
      this.shadow = { mapSize: { set: () => undefined }, camera: {}, bias: 0 };
      this.target = new StubGroup();
    }
  }
  class Box3Stub {
    constructor() { this.max = { x: 1, y: 2.5, z: 1 }; this.min = { x: 0, y: 0, z: 0 }; }
    setFromObject() { return this; }
    getCenter(target) { return target.set(0.5, 1.25, 0.5); }
  }
  return {
    Scene: StubGroup,
    Group: StubGroup,
    Object3D: StubObject3D,
    Mesh: StubMesh,
    InstancedMesh: StubInstancedMesh,
    Sprite: StubSprite,
    Color: class { constructor(value) { this.value = value; } },
    Fog: class {},
    Vector2: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
    Vector3: StubVector3,
    Quaternion: StubQuaternion,
    Matrix4: class { compose() { return this; } },
    Box3: Box3Stub,
    Shape: ShapeStub,
    Path: ShapeStub,
    BoxGeometry: Geometry,
    PlaneGeometry: Geometry,
    CylinderGeometry: Geometry,
    SphereGeometry: Geometry,
    TorusGeometry: Geometry,
    ExtrudeGeometry: Geometry,
    LatheGeometry: Geometry,
    MeshStandardMaterial: MaterialStub,
    MeshPhysicalMaterial: MaterialStub,
    SpriteMaterial: MaterialStub,
    CanvasTexture: TextureStub,
    AmbientLight: LightStub,
    DirectionalLight: LightStub,
    SRGBColorSpace: 'srgb',
    RepeatWrapping: 'repeat',
    DynamicDrawUsage: 'dynamic',
    DoubleSide: 'double',
    PCFSoftShadowMap: 'pcfsoft',
    ACESFilmicToneMapping: 'aces',
  };
}

// ---------------------------------------------------------------------------
// Inline-script extraction: run the monolith's scene-graph portion under node.
// ---------------------------------------------------------------------------

async function readInlineModule() {
  const html = await readFile(HTML_URL, 'utf8');
  const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html must keep its inline module script');
  return { html, code: match[1] };
}

async function runSceneGraph({ withDocument = true } = {}) {
  const { code } = await readInlineModule();
  const body = `${code.replace(/^import .*$/gm, '')}\nreturn { EQUIP, R, ROW_PILLS, chips, banner, sim };`;
  const run = new Function(
    'THREE', 'EQUIPMENT_INSTANCES', 'chipReadingsOf', 'createEquipmentModel',
    'createEquipmentChips', 'createDhlBanner', 'window', 'document',
    // The wrapper shadows window/document per run: __HEADLESS__ skips renderer/controls,
    // while the document stub (when present) exercises the real chip/banner draw path.
    `"use strict";\n${body}`,
  );
  const windowStub = { __HEADLESS__: true };
  const documentStub = withDocument ? createDocumentStub() : undefined;
  const result = run(
    createThreeStub(), EQUIPMENT_INSTANCES, chipReadingsOf, createEquipmentModel,
    createEquipmentChips, createDhlBanner, windowStub, documentStub,
  );
  return { ...result, stats: windowStub.__SCENE_STATS__ };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('route table resolves to 6 real detail files on disk', async () => {
  const { html } = await readInlineModule();
  const tableMatch = html.match(/const R = \{([\s\S]*?)\};/);
  assert.ok(tableMatch, 'index.html must keep the R route table');
  const routes = [...tableMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)]
    .map(([, kind, route]) => ({ kind, route }));
  assert.deepEqual(routes.map(({ kind }) => kind).sort(),
    ['crac', 'dry', 'inrow', 'pdu', 'rack', 'ups']);
  for (const { kind, route } of routes) {
    const resolved = fileURLToPath(new URL(route, DIR_URL));
    assert.ok(existsSync(resolved), `${kind} route must resolve on disk: ${resolved}`);
  }
});

test('F2a: every detail view carries the 24 h chart hover contract', async () => {
  const { html } = await readInlineModule();
  const tableMatch = html.match(/const R = \{([\s\S]*?)\};/);
  const routes = [...tableMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)].map(([, , route]) => route);
  assert.equal(routes.length, 6);
  // The room posts the wall clock the tooltips date against (openDetail envelope).
  assert.match(html, /clock: Date\.now\(\)/, 'dhl:reading must carry the sim wall clock');
  for (const route of routes) {
    const detail = await readFile(fileURLToPath(new URL(route, DIR_URL)), 'utf8');
    assert.ok(detail.includes('class="chart-tip"') || detail.includes(".className='chart-tip'"),
      `${route}: hover tooltip present`);
    assert.match(detail, /id="chart" tabindex="0" aria-label=/,
      `${route}: chart is keyboard-focusable with an es-MX label`);
    assert.match(detail, /var hoverSeries=\[/, `${route}: hover series wired`);
    assert.match(detail, /ArrowLeft/, `${route}: arrow keys step the point`);
    assert.match(detail, /msg\.clock === 'number'\) window\.__DHL_CLOCK__ = msg\.clock/,
      `${route}: receiver adopts the room's wall clock for honest dates`);
  }
});

test('headless scene graph: EQUIP matches the placement block and the sim registry', async () => {
  const { EQUIP, sim, stats } = await runSceneGraph();
  assert.equal(EQUIP.length, 11, '3 CRAC + 2 in-row + 1 UPS + 1 PDU + 1 dry + 3 hero racks');
  assert.equal(stats.equip, 11);
  assert.deepEqual(
    EQUIP.map(({ id }) => id).sort(),
    EQUIPMENT_INSTANCES.map(({ id }) => id).sort(),
    'every registered pivot names a sim instance and vice versa',
  );
  assert.ok(EQUIP.every(({ pivot, route }) => pivot.userData.route === route));
  assert.equal(sim.units.filter(({ status }) => status === 'warn').length, 1);
});

test('every registered pivot gets a chip, fed with its sim reading', async () => {
  const { EQUIP, chips, stats } = await runSceneGraph();
  assert.ok(chips, 'chips must exist when a document is present');
  assert.equal(chips.chips.length, EQUIP.length);
  assert.equal(stats.chips, EQUIP.length);
  for (const { id } of EQUIP) {
    const chip = chips.chipsById.get(id);
    assert.ok(chip, `chip for ${id}`);
    assert.ok(chip.key, `chip for ${id} must have received its sim reading`);
    assert.equal(chip.badge.userData.equipmentId, id);
  }
  assert.equal(chips.getStats().redraws, EQUIP.length, 'one initial draw per chip, none per frame');
});

test('the DHL banner exists over the room and stays out of the chips toggle group', async () => {
  const { chips, banner } = await runSceneGraph();
  assert.ok(banner, 'banner must exist when a document is present');
  assert.equal(banner.sprite.userData.kind, 'dhl-banner');
  assert.ok(!chips.group.children.includes(banner.sprite), 'banner is brand chrome, not a chip');
  const [x, y, z] = banner.sprite.userData.anchor;
  assert.ok(y > 3.05, 'banner floats above the glass walls');
  assert.ok(x > -0.7 && x < 6.9 && z > -3.4 && z < 14.6, 'banner hangs over the room footprint');
});

test('fully headless (no document): the scene still builds and chips/banner no-op cleanly', async () => {
  const { EQUIP, chips, banner, stats } = await runSceneGraph({ withDocument: false });
  assert.equal(EQUIP.length, 11);
  assert.equal(chips, null);
  assert.equal(banner, null);
  assert.equal(stats.chips, 0);
  assert.equal(stats.banner, false);
  assert.ok(stats.instCount > 0 && stats.meshTotal > 0, 'instanced silhouettes still count');
});

test('chip factory honors prefers-reduced-motion: ticks never move the rest pose', () => {
  const THREE = createThreeStub();
  const documentObject = createDocumentStub();
  const units = [{ id: 'rack-01', kind: 'rack', anchor: [0, 2, 0] }];
  const still = createEquipmentChips({ THREE, documentObject, units, reducedMotion: true });
  still.setTick(17);
  const restY = still.chips[0].badge.position.y;
  still.setTick(53);
  assert.equal(still.chips[0].badge.position.y, restY);

  const moving = createEquipmentChips({ THREE, documentObject, units, reducedMotion: false });
  moving.setTick(12);
  const bobbedY = moving.chips[0].badge.position.y;
  moving.setTick(24);
  assert.notEqual(moving.chips[0].badge.position.y, bobbedY);

  const banner = createDhlBanner({ THREE, documentObject, position: [3, 5, 10], reducedMotion: true });
  banner.setTick(40);
  assert.equal(banner.sprite.position.y, 5);
});

test('single fixed view: no camera selector, no view labels, boot pinned to the room framing', async () => {
  const { html } = await readInlineModule();
  // Client round 3 correction: the 3D room gets exactly ONE fixed view — the whole-room
  // framing the scene boots with. The camera select (and every other way to select or
  // even NAME a view) leaves the product surface entirely; a single view needs no label.
  for (const gone of ['viewer-camera', 'camera-select', 'applyCameraPreset', 'CAMERA_PRESETS',
    'Vista general', 'Pasillo frío', 'Planta (superior)', 'Equipos (órbita baja)',
    'aria-label="Cámara"']) {
    assert.ok(!html.includes(gone), `${gone} must not linger in index.html`);
  }
  // Boot pins the one framing: the inherited whole-room camera position and orbit target.
  assert.match(html, /camera\.position\.set\(16, 12, 21\)/, 'boot camera is the whole-room framing');
  assert.match(html, /controls\.target\.set\(3\.2, 1\.1, 6\)/, 'boot orbit target matches');
  // The deck toggles stay gone — their behaviors remain defaults: chips ON, rotation OFF,
  // shadows ON.
  for (const gone of ['chips-toggle', 'rotate-toggle', 'shadows-toggle', 'fullscreen-toggle',
    'deck-vista', 'deck-full', 'deck-camara', 'class="deck"']) {
    assert.ok(!html.includes(gone), `${gone} must not linger in index.html`);
  }
  assert.match(html, /controls\.autoRotate = false/, 'rotation defaults OFF');
  assert.match(html, /renderer\.shadowMap\.enabled = true/, 'shadows default ON');
});

test('chip accents: warn/alarm override the kind accent with the B43 status hues', () => {
  assert.equal(resolveChipAccent('rack', 'normal').border, '#3b6ff5');
  assert.equal(resolveChipAccent('dry', 'normal').border, '#5c6b84');
  assert.equal(resolveChipAccent('inrow', 'warn').border, '#f5a623');
  assert.equal(resolveChipAccent('pdu', 'alarm').border, '#e5484d');
});
