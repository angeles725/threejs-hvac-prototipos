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
import { LIGHTING_RIG } from '../src/scene/lighting.js';
import {
  createSemanticGroups,
  resolvePixelRatio,
} from '../src/scene/runtime.js';

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
    // Client mandate (2026-07-15): the `labels` toggle left the canonical contract with the
    // device-label billboard system it drove (alongside the earlier `light_state`/`places` removals).
    // Client single-view correction (2026-07-18): `camera` left the URL contract entirely — the
    // scene ships ONE fixed view (the whole-building `network` preset, pinned in the state), so
    // no deep link can surface another view and the serialized URL never names one.
    // Limpieza fase 2 (2026-07-18): `cutaway`, `mode` and `nav` left the contract with the
    // retired cutaway feature, the retired engineering visual mode and the retired
    // first-person navigation.
    'state=architecture&material_state=neutral&roof=1&walls=1&view=all&rs485=0&lorawan=0&internet=0&selection=none&tick=0&poster_frame=0&display_frame=0',
  );
  assert.equal(parsed.camera, 'network', 'the state pins the single fixed view');
});

test('query state accepts a complete inspection state; retired tokens are inert', () => {
  const parsed = parseQueryState(
    // Limpieza fase 2: `mode=engineering`, `nav=first-person` and `cutaway=1` are unknown tokens
    // now — ignored like any other stranger, they neither apply nor trip the atomic reset of the
    // live axes.
    '?mode=engineering&nav=first-person&roof=0&walls=0&cutaway=1&view=hvac&rs485=1&lorawan=1&internet=1',
  );

  assert.deepEqual(parsed, {
    visualMode: 'architectural',
    sceneState: 'architecture',
    // Single-view correction (2026-07-18): camera is a pinned constant, never URL-driven.
    camera: 'network',
    materialState: 'neutral',
    roof: false,
    walls: false,
    view: 'hvac',
    rs485: true,
    lorawan: true,
    internet: true,
    selection: 'none',
    tick: 0,
    tickExplicit: false,
    posterFrame: 0,
    displayFrame: 0,
    // Correction item E: the cartelera's iframe embed mode joined the canonical state.
    embed: false,
  });
});

test('query state keeps the DesignSpec state vocabulary; camera tokens are inert', () => {
  // Single-view correction (2026-07-18): `camera` is not part of the URL contract anymore. A
  // `?camera=...` token is an UNKNOWN parameter — ignored like any other stranger, it neither
  // moves the pinned view nor trips the atomic reset of the rest of the state.
  const architectural = parseQueryState(
    '?camera=neutral&state=architecture&roof=on&walls=on&tick=0',
  );
  assert.equal(architectural.visualMode, 'architectural');
  assert.equal(architectural.camera, 'network', 'a camera token never moves the pinned view');
  assert.equal(architectural.roof, true);
  assert.equal(architectural.walls, true);

  const engineering = parseQueryState(
    '?camera=engineering-section&state=engineering&roof=off&links=all&tick=0',
  );
  assert.equal(engineering.visualMode, 'engineering');
  assert.equal(engineering.camera, 'network', 'a camera token never moves the pinned view');
  assert.equal(engineering.roof, false);
  assert.deepEqual(
    [engineering.rs485, engineering.lorawan, engineering.internet],
    [true, true, true],
  );
});

test('malformed query tokens fall back atomically and emit one warning', () => {
  const warnings = [];
  const parsed = parseQueryState(
    '?camera=moon&roof=yes&walls=nope&view=devices&rs485=x&lorawan=x&internet=x&labels=x',
    (message) => warnings.push(message),
  );

  assert.deepEqual(parsed, DEFAULT_QUERY_STATE);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /query state/i);
});

test('camera controller applies presets and rejects unknown names', () => {
  // Limpieza fase 2 (2026-07-18): first-person navigation was retired — the controller is
  // orbit-only and its movement/bounds contract left with the feature.
  const { camera, orbitControls } = createCameraHarness();
  const controller = createCameraController({ camera, orbitControls });

  assert.equal(controller.applyPreset('network'), true);
  assert.deepEqual(
    [camera.position.x, camera.position.y, camera.position.z],
    CAMERA_PRESETS.network.position,
  );
  assert.deepEqual(
    [orbitControls.target.x, orbitControls.target.y, orbitControls.target.z],
    CAMERA_PRESETS.network.target,
  );
  assert.equal(controller.applyPreset('not-a-preset'), false);
  assert.equal(controller.applyPreset('lobby'), false, 'the retired evidence presets are gone');
  controller.dispose();
});

// Limpieza fase 2 (2026-07-18): the evidence/look-dev framing contracts ("fixed evidence
// cameras frame targets tightly", the grazing/Sala-3/engineering-section/complete-network
// framings and the derived schematic-detail camera) were retired with the pruned preset
// catalogue and the removed network-schematic board module.

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

test('the grazing look-dev machinery left the runtime with the retired preset catalogue', async () => {
  // Limpieza fase 2 (2026-07-18): `setLookdevCamera` (the per-camera exposure/key swing for the
  // grazing look-dev view) was retired — the single shipped view runs the authority exposure set
  // at construction. The lighting authority keeps its grazing DATA as historical look-dev record.
  const runtimeSource = await readFile(new URL('../src/scene/runtime.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(runtimeSource, /setLookdevCamera/);
  assert.doesNotMatch(mainSource, /setLookdevCamera/);
  assert.doesNotMatch(mainSource, /cameraSelect/);
  assert.match(runtimeSource, /toneMappingExposure = LIGHTING_TONE_MAPPING\.exposure/);
  // A retired look-dev token stays inert in the URL, like every other stranger.
  assert.equal(parseQueryState('?camera=grazing').camera, 'network');
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

test('materials pass accepts deterministic material state; camera tokens stay inert', () => {
  const parsed = parseQueryState('?camera=reference-match&material_state=neutral');
  assert.equal(parsed.camera, 'network', 'single-view: no URL token moves the pinned view');
  assert.equal(parsed.materialState, 'neutral');
});

// Limpieza fase 2 (2026-07-18): the look-dev / structural-evidence camera contracts
// ("materials look-dev cameras", "structural attempt 3 evidence cameras", the grazing and
// material-floor framings) were retired with the QA preset family. Retired camera tokens stay
// inert in the URL, like every other stranger:
test('retired evidence camera tokens are inert in the URL', () => {
  for (const camera of ['family-master', 'rs485-master', 'roof-service', 'material-floor', 'neutral']) {
    assert.equal(parseQueryState(`?camera=${camera}`).camera, 'network');
  }
});

test('layer controller switches views and layers without inventing assets', () => {
  const names = [
    'architecture', 'roof', 'walls', 'hvac',
    'rs485', 'lorawan', 'internet', 'labels',
  ];
  const groups = Object.fromEntries(names.map((name) => [name, { visible: true }]));
  const controller = createLayerController({ groups });

  controller.setView('architecture');
  assert.equal(groups.architecture.visible, true);
  assert.equal(groups.hvac.visible, false);

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
    'architecture', 'roof', 'walls', 'hvac',
    'rs485', 'lorawan', 'internet', 'labels',
  ]);
  assert.ok(Object.values(groups).every((group) => group.children.length === 0));
});

test('HTML shell exposes Spanish project identity and semantic controls', async () => {
  const html = await readFile(new URL('index.html', APP_ROOT), 'utf8');

  assert.match(html, /Cinemex – Integración HVAC LoRaWAN/);
  assert.match(html, /<main[^>]+id="app"/);
  // Single-view correction (2026-07-18): the camera <select> died with every other view
  // switcher — the shell carries no view list and no view label of any kind.
  assert.doesNotMatch(html, /camera-select/);
  assert.doesNotMatch(html, /<option/);
  assert.match(html, /<section[^>]+id="fatal-panel"[^>]+role="alert"/);
  assert.match(html, /<output[^>]+id="app-status"[^>]+aria-live="polite"/);
});
