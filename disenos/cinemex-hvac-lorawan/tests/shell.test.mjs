import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_QUERY_STATE,
  parseQueryState,
  serializeQueryState,
} from '../src/controllers/query-state.js';
import {
  CAMERA_PRESETS,
  createCameraController,
} from '../src/controllers/camera.js';
import { createLayerController } from '../src/controllers/layers.js';
import { LIGHTING_RIG, LIGHTING_TONE_MAPPING } from '../src/scene/lighting.js';
import {
  createSemanticGroups,
  resolvePixelRatio,
} from '../src/scene/runtime.js';
import { createArchitecturePlan } from '../src/scene/architecture.js';
import { NETWORK_SCHEMATIC_BOARD, resolveBoardNormal } from '../src/scene/network-schematic.js';

const APP_ROOT = new URL('../', import.meta.url);

function createPosition(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    set(nextX, nextY, nextZ) {
      this.x = nextX;
      this.y = nextY;
      this.z = nextZ;
    },
  };
}

function createCameraHarness() {
  const camera = {
    aspect: 1,
    fov: 40,
    position: createPosition(),
    lookAtCalls: [],
    projectionUpdates: 0,
    lookAt(x, y, z) {
      this.lookAtCalls.push([x, y, z]);
    },
    updateProjectionMatrix() {
      this.projectionUpdates += 1;
    },
  };
  const orbitControls = {
    enabled: true,
    target: createPosition(),
    updateCalls: 0,
    update() {
      this.updateCalls += 1;
    },
    dispose() {},
  };
  return { camera, orbitControls };
}

test('query state has a stable canonical default and serializes in contract order', () => {
  const warnings = [];
  const parsed = parseQueryState('', (message) => warnings.push(message));

  assert.deepEqual(parsed, DEFAULT_QUERY_STATE);
  assert.equal(warnings.length, 0);
  assert.equal(
    serializeQueryState(parsed),
    'mode=architectural&state=architecture&camera=isometric&nav=orbit&material_state=neutral&light_state=on&roof=1&walls=1&cutaway=0&view=all&rs485=0&lorawan=0&internet=0&labels=1&selection=none&tick=0&poster_frame=0&display_frame=0',
  );
});

test('query state accepts a complete engineering inspection state', () => {
  const parsed = parseQueryState(
    '?mode=engineering&camera=network&nav=first-person&roof=0&walls=0&cutaway=1&view=hvac&rs485=1&lorawan=1&internet=1&labels=0',
  );

  assert.deepEqual(parsed, {
    visualMode: 'engineering',
    // The INTERACTION-UI pass added the DesignSpec's scene/selection/tick axes to the same
    // canonical state: `mode=engineering` with no `state` token still means the engineering state.
    sceneState: 'engineering',
    camera: 'network',
    navigation: 'first-person',
    materialState: 'neutral',
    lightState: 'on',
    roof: false,
    walls: false,
    cutaway: true,
    view: 'hvac',
    rs485: true,
    lorawan: true,
    internet: true,
    labels: false,
    labelsExplicit: true,
    selection: 'none',
    tick: 0,
    tickExplicit: false,
    posterFrame: 0,
    displayFrame: 0,
  });
  // Derived: `labels` is only explicit when the URL actually carries the token.
  assert.equal(parseQueryState('?mode=engineering').labelsExplicit, false);
  assert.equal(parseQueryState('?labels=1').labelsExplicit, true);
});

test('query state accepts DesignSpec blockout camera and state vocabulary', () => {
  const architectural = parseQueryState(
    '?camera=neutral&state=architecture&roof=on&walls=on&tick=0',
  );
  assert.equal(architectural.visualMode, 'architectural');
  assert.equal(architectural.camera, 'neutral');
  assert.equal(architectural.roof, true);
  assert.equal(architectural.walls, true);

  const engineering = parseQueryState(
    '?camera=engineering-section&state=engineering&roof=off&cutaway=on&links=all&tick=0',
  );
  assert.equal(engineering.visualMode, 'engineering');
  assert.equal(engineering.camera, 'engineering-section');
  assert.equal(engineering.roof, false);
  assert.equal(engineering.cutaway, true);
  assert.deepEqual(
    [engineering.rs485, engineering.lorawan, engineering.internet],
    [true, true, true],
  );
});

test('malformed query tokens fall back atomically and emit one warning', () => {
  const warnings = [];
  const parsed = parseQueryState(
    '?mode=wireframe&camera=moon&nav=fly&roof=yes&walls=nope&cutaway=maybe&view=devices&rs485=x&lorawan=x&internet=x&labels=x',
    (message) => warnings.push(message),
  );

  assert.deepEqual(parsed, DEFAULT_QUERY_STATE);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /query state/i);
});

test('camera controller applies presets and bounds first-person movement', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });

  assert.equal(Object.keys(CAMERA_PRESETS).length, 10);
  assert.equal(controller.applyPreset('lobby'), true);
  assert.deepEqual(
    [camera.position.x, camera.position.y, camera.position.z],
    CAMERA_PRESETS.lobby.position,
  );
  assert.deepEqual(
    [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    CAMERA_PRESETS.lobby.target,
  );
  assert.equal(controller.applyPreset('not-a-preset'), false);
  assert.equal(controller.applyPreset('engineering-section'), true);
  assert.deepEqual(
    [camera.position.x, camera.position.y, camera.position.z],
    [46, 24, 42],
  );

  controller.setNavigationMode('first-person');
  controller.setMovementIntent({ forward: 1, right: 1 });
  controller.update(120);

  assert.equal(controller.getState().navigation, 'first-person');
  assert.equal(orbitControls.enabled, false);
  assert.equal(camera.position.y, 1.7);
  assert.ok(camera.position.x <= 29 && camera.position.x >= -29);
  assert.ok(camera.position.z <= 21 && camera.position.z >= -21);
  controller.dispose();
});

test('fixed evidence cameras frame targets tightly and apply their field of view', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });
  // The presets whose framing no later pass owns keep their literal contract.
  const expected = {
    neutral: { position: [54, 44, 58], target: [0, 1.5, -1], fov: 52 },
    kitchen: { position: [-17, 2.4, 17.4], target: [-10, 1.7, 12.6], fov: 60 },
    corridor: { position: [0, 3.2, 9.5], target: [0, 1.35, -8], fov: 65 },
    technical: { position: [0, 26, -20.5], target: [0, 0, -19.3], fov: 65 },
    ug67: { position: [2, 4.05, 3.55], target: [3.15, 3.45, 2], fov: 55 },
  };

  for (const [name, framing] of Object.entries(expected)) {
    assert.equal(controller.applyPreset(name), true);
    assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], framing.position);
    assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], framing.target);
    assert.equal(camera.fov, framing.fov);
  }

  // `facade` and `lobby` are the LIGHTING-CAMERA pass's own compositions: pinning their numbers
  // here would freeze the framing the pass was told to fix. What the CONTROLLER owes them is a
  // faithful application of whatever the preset declares — that is what is asserted instead.
  for (const name of ['facade', 'lobby']) {
    const framing = CAMERA_PRESETS[name];
    assert.equal(controller.applyPreset(name), true);
    assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], [...framing.position]);
    assert.deepEqual(
      [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
      [...framing.target],
    );
    assert.equal(camera.fov, framing.fov);
  }
  assert.equal(camera.projectionUpdates, 7);
  // Derived: interior fit-out presets must stand under the 4.5 m public roof, not above it.
  const plan = createArchitecturePlan();
  const publicBand = plan.bands.find(({ id }) => id === 'front-public');
  for (const name of ['lobby', 'concessions', 'kitchen']) {
    const { position, target } = CAMERA_PRESETS[name];
    assert.ok(position[1] < publicBand.height, `${name} camera must stay under the public roof`);
    assert.ok(
      position[2] > publicBand.bounds.z[0] && position[2] < publicBand.bounds.z[1],
      `${name} camera must stand inside the public band`,
    );
    assert.ok(target[2] > publicBand.bounds.z[0] && target[2] < publicBand.bounds.z[1]);
  }
  controller.dispose();
});

test('structural evidence preserves grazing/network views and improves Sala 3 framing', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });
  const expected = {
    grazing: { position: [25, 7.5, 44], target: [0, 2.15, 21], fov: 54 },
    'sala-3': { position: [-8.2, 5.8, -8.95], target: [-25.5, 1.7, -8.95], fov: 70 },
    'engineering-section': { position: [46, 24, 42], target: [6, 1, -1], fov: 55 },
    'complete-network': { position: [82, 49, 48], target: [10, 4.2, -2], fov: 50 },
  };

  for (const [name, framing] of Object.entries(expected)) {
    assert.equal(controller.applyPreset(name), true);
    assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], framing.position);
    assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], framing.target);
    assert.equal(camera.fov, framing.fov);
  }

  // Derived: the schematic detail preset is owned by the board it frames, never by a stale literal.
  assert.equal(controller.applyPreset('network-schematic-detail'), true);
  assert.deepEqual(
    [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    [...NETWORK_SCHEMATIC_BOARD.position],
    'the detail camera must target the board centre',
  );
  const normal = resolveBoardNormal();
  const offset = [camera.position.x, camera.position.y, camera.position.z]
    .map((value, axis) => value - NETWORK_SCHEMATIC_BOARD.position[axis]);
  const distance = Math.hypot(...offset);
  assert.ok(
    normal.reduce((sum, value, axis) => sum + value * offset[axis], 0) / distance > 0.98,
    'the detail camera must stand on the board normal',
  );
  controller.dispose();
});

// The structural and materials passes ran on a temporary look-dev rig (a bright hemisphere plus an
// over-driven sun) whose only job was to raise neutral scene value before the lighting pass
// existed. The lighting-camera pass replaces it with the house rig, so these tests now guard the
// PROPERTY those passes needed — enough neutral value on an interior surface to judge a material —
// instead of the literal fixtures they happened to be written against.
test('the scene still delivers neutral interior value after the look-dev rig is replaced', async () => {
  const runtimeSource = await readFile(new URL('../src/scene/runtime.js', import.meta.url), 'utf8');

  assert.match(runtimeSource, /new THREE\.AmbientLight/);
  assert.match(runtimeSource, /scene\.environment = environmentTexture/);

  // Derived: ambient + fill + rim + IBL still give an interior (unlit-by-key) surface a floor of
  // diffuse value, which is what the neutral look-dev captures were reading.
  const { key, fill, rim, ambient } = LIGHTING_RIG;
  const neutralFloor = ambient.intensity + fill.intensity * 0.35 + rim.intensity * 0.2;
  assert.ok(neutralFloor >= 0.4, `interior neutral value collapsed to ${neutralFloor.toFixed(2)}`);
  assert.ok(key.intensity > neutralFloor * 2, 'the key must still dominate the ambient floor');
});

test('materials realism reset adds a neutral PMREM response rig and restrained fill', async () => {
  const runtimeSource = await readFile(new URL('../src/scene/runtime.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../main.js', import.meta.url), 'utf8');

  assert.match(mainSource, /RoomEnvironment\.js/);
  assert.match(runtimeSource, /PMREMGenerator/);
  assert.match(runtimeSource, /new RoomEnvironment\(\)/);
  // Derived: the fill stays a fill — cool, and a fraction of the key, never a second key.
  assert.ok(LIGHTING_RIG.fill.intensity < LIGHTING_RIG.key.intensity / 3);
});

test('final materials attempt scopes exposure and key angle changes to the grazing look-dev camera', async () => {
  const runtimeSource = await readFile(new URL('../src/scene/runtime.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../main.js', import.meta.url), 'utf8');

  assert.match(runtimeSource, /function setLookdevCamera\(cameraName\)/);
  // Derived: grazing stops down and swings the key across the facade; both come from the authority.
  assert.ok(LIGHTING_TONE_MAPPING.grazingExposure < LIGHTING_TONE_MAPPING.exposure);
  assert.notDeepEqual([...LIGHTING_RIG.key.grazingPosition], [...LIGHTING_RIG.key.position]);
  assert.ok(LIGHTING_RIG.key.grazingPosition[1] < LIGHTING_RIG.key.position[1], 'grazing light must be low');
  assert.match(mainSource, /runtime\.setLookdevCamera\(queryState\.camera\)/);
  assert.match(mainSource, /runtime\.setLookdevCamera\(button\.dataset\.camera\)/);
});

test('query state accepts the DesignSpec grazing evidence camera', () => {
  assert.equal(parseQueryState('?camera=grazing').camera, 'grazing');
});

test('surface evidence frames parse and serialize deterministically', () => {
  const parsed = parseQueryState('?state=architecture&poster_frame=1&display_frame=1&tick=0');

  assert.equal(parsed.posterFrame, 1);
  assert.equal(parsed.displayFrame, 1);
  assert.match(serializeQueryState(parsed), /poster_frame=1&display_frame=1$/);
  assert.deepEqual(
    parseQueryState('?poster_frame=7&display_frame=wat', () => {}),
    DEFAULT_QUERY_STATE,
  );
});

test('materials pass accepts deterministic material state and reference-match camera', () => {
  const parsed = parseQueryState('?camera=reference-match&material_state=neutral');
  assert.equal(parsed.camera, 'reference-match');
  assert.equal(parsed.materialState, 'neutral');
});

test('materials look-dev cameras match the DesignSpec neutral, grazing and reference views', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });
  const expected = {
    neutral: { position: [54, 44, 58], target: [0, 1.5, -1], fov: 52 },
    grazing: { position: [25, 7.5, 44], target: [0, 2.15, 21], fov: 54 },
    'reference-match': { position: [-7.5, 4.2, -8.9], target: [-27.5, 3, -8.9], fov: 70 },
    'family-master': { position: [8, 26, -1], target: [-17, 1.5, -4], fov: 60 },
    technical: { position: [0, 26, -20.5], target: [0, 0, -19.3], fov: 65 },
  };
  for (const [name, framing] of Object.entries(expected)) {
    assert.equal(controller.applyPreset(name), true);
    assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], framing.position);
    assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], framing.target);
    assert.equal(camera.fov, framing.fov);
  }
  controller.dispose();
});

test('structural attempt 3 accepts dedicated family, RS-485 and roof-service evidence cameras', () => {
  for (const camera of ['family-master', 'rs485-master', 'roof-service']) {
    assert.equal(parseQueryState(`?camera=${camera}`).camera, camera);
  }
});

test('structural attempt 3 evidence cameras compare family masters and roof containment', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });
  const expected = {
    'family-master': { position: [8, 26, -1], target: [-17, 1.5, -4], fov: 60 },
    'rs485-master': { position: [0, 48, 2], target: [0, 0.8, -3], fov: 56 },
    'roof-service': { position: [9, 12, -4], target: [0, 8, -11], fov: 45 },
  };

  for (const [name, framing] of Object.entries(expected)) {
    assert.equal(controller.applyPreset(name), true);
    assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], framing.position);
    assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], framing.target);
    assert.equal(camera.fov, framing.fov);
  }
  controller.dispose();
});

test('materials grazing camera is a low facade and circulation three-quarter', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });

  assert.equal(controller.applyPreset('grazing'), true);
  assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], [25, 7.5, 44]);
  assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], [0, 2.15, 21]);
  assert.equal(camera.fov, 54);
  controller.dispose();
});

test('materials floor camera exposes public tile and corridor carpet in one finish comparison', () => {
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });

  assert.equal(parseQueryState('?camera=material-floor').camera, 'material-floor');
  assert.equal(controller.applyPreset('material-floor'), true);
  assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], [25, 4.2, 16]);
  assert.deepEqual([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z], [0, 0.1, 7]);
  assert.equal(camera.fov, 52);
  controller.dispose();
});

test('layer controller switches modes, views and clipping without inventing assets', () => {
  const names = [
    'architecture', 'roof', 'walls', 'hvac', 'zones',
    'rs485', 'lorawan', 'internet', 'labels',
  ];
  const groups = Object.fromEntries(names.map((name) => [name, { visible: true }]));
  const renderer = { localClippingEnabled: false, clippingPlanes: [] };
  const materialModes = [];
  const cutawayModes = [];
  const materials = {
    setEngineeringMode(enabled) {
      materialModes.push(enabled);
    },
    setCutaway(enabled, plane) {
      cutawayModes.push([enabled, plane]);
    },
  };
  const clippingPlane = { constant: 0 };
  const controller = createLayerController({
    groups,
    renderer,
    materials,
    clippingPlane,
  });

  controller.setVisualMode('engineering');
  controller.setCutaway(true);
  controller.setView('architecture');
  assert.equal(groups.architecture.visible, true);
  assert.equal(groups.hvac.visible, false);
  assert.equal(renderer.localClippingEnabled, true);
  assert.deepEqual(renderer.clippingPlanes, []);
  assert.deepEqual(materialModes, [true]);
  assert.deepEqual(cutawayModes.at(-1), [true, clippingPlane]);
  assert.ok(cutawayModes.every(([, plane]) => plane === clippingPlane));

  controller.setView('hvac');
  controller.setLayer('rs485', true);
  assert.equal(groups.architecture.visible, false);
  assert.equal(groups.hvac.visible, true);
  assert.equal(groups.rs485.visible, true);
  assert.equal(controller.setView('unknown'), false);
});

test('runtime caps DPR and creates empty semantic layer groups', () => {
  class Group {
    constructor() {
      this.children = [];
      this.name = '';
    }
  }

  assert.equal(resolvePixelRatio(3), 1.5);
  assert.equal(resolvePixelRatio(1.25), 1.25);
  assert.equal(resolvePixelRatio(Number.NaN), 1);

  const groups = createSemanticGroups({ Group });
  assert.deepEqual(Object.keys(groups), [
    'architecture', 'roof', 'walls', 'hvac', 'zones',
    'rs485', 'lorawan', 'internet', 'labels',
  ]);
  assert.ok(Object.values(groups).every((group) => group.children.length === 0));
});

test('HTML shell exposes Spanish project identity and semantic controls', async () => {
  const html = await readFile(new URL('index.html', APP_ROOT), 'utf8');

  assert.match(html, /Cinemex – Integración HVAC LoRaWAN/);
  assert.match(html, /<main[^>]+id="app"/);
  assert.match(html, /<button[^>]+data-camera="facade"/);
  assert.match(html, /<button[^>]+id="navigation-toggle"/);
  assert.match(html, /<section[^>]+id="fatal-panel"[^>]+role="alert"/);
  assert.match(html, /<output[^>]+id="app-status"[^>]+aria-live="polite"/);
});
