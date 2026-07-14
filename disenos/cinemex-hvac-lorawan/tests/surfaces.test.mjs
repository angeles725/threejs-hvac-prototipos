import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SURFACE_ATLAS_TILES,
  SURFACE_DIRECTION_MARKER,
  SURFACE_DIRECTION_MARKER_VIEW_POLICY,
  SURFACE_NETWORK_LABEL_POLICY,
  SURFACE_NETWORK_ROLLUPS,
  SURFACE_NETWORK_VIEW_POLICY,
  SURFACE_RS485_EVIDENCE_POLICY,
  SURFACE_TC300_LABEL_POLICY,
  createDashedRouteSampleEvidence,
  createDirectionMarkerPlacement,
  createDirectionMarkerViewTransform,
  createSurfaceAtlas,
  createSurfaceDetailPlan,
  isDirectionMarkerSampleVisibleOnDashedRoute,
  refineDirectionMarkerScale,
  resolveDirectionMarkerScale,
  validateNetworkViewportEvidence,
  validateProjectedDirectionMarkers,
  validateSurfacePlacements,
} from '../src/scene/surfaces.js';
import { CAMERA_PRESETS, QA_CAMERA_PRESETS } from '../src/controllers/camera.js';
import { NETWORK_SCHEMATIC_BOARD } from '../src/scene/network-schematic.js';

function createCanvasHarness() {
  const operations = [];
  const context = new Proxy({
    operations,
    measureText: (text) => ({ width: String(text).length * 10 }),
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => operations.push([property, ...args]);
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
  const canvas = { width: 0, height: 0, getContext: () => context };
  return {
    canvas,
    context,
    documentObject: { createElement: (tag) => tag === 'canvas' ? canvas : null },
  };
}

test('surface plan owns every required shell detail without protected film content', () => {
  const plan = createSurfaceDetailPlan();
  const categories = new Set(plan.details.map(({ category }) => category));

  for (const required of [
    'facade-word-sign', 'wall-joint', 'glass-safety-band', 'door-hardware',
    'portal-seal', 'room-number', 'floor-joint', 'carpet-pattern',
    'roof-seam', 'roof-curb', 'service-sign', 'exit-sign',
    'containment-marking', 'poster-placeholder', 'menu-display',
    'acoustic-panel-rhythm', 'screen-content',
    'facade-breakup', 'pos-cue', 'snack-machine-cue', 'kitchen-service-cue',
    'media-arrowhead', 'aisle-marking',
  ]) assert.ok(categories.has(required), `missing surface detail category: ${required}`);

  assert.equal(plan.identity.text, 'Cinemex');
  assert.deepEqual(plan.frames, { poster: [0, 1], display: [0, 1] });
  assert.ok(plan.details.every(({ generated, protectedContentSafe }) => (
    generated === true && protectedContentSafe === true
  )));
  assert.doesNotMatch(JSON.stringify(plan), /(?:marvel|disney|warner|universal|netflix|avatar|star wars)/i);
});

test('surface placement contract rejects giant, non-finite or wrongly parented planes', () => {
  const valid = [{
    id: 'menu-1', kind: 'menu-display', parentLayer: 'architecture',
    localSpace: 'world-root', visibilityOnly: true,
    position: [0, 3, 15.13], size: [1.7, 1.3], rotationY: 0,
  }];

  assert.equal(validateSurfacePlacements(valid), true);
  // Derived: a menu board is a counter-scaled board, never a room-wide slab.
  assert.throws(() => validateSurfacePlacements([{ ...valid[0], size: [5.2, 1.4] }]), /surface placement/i);
  for (const invalid of [
    { ...valid[0], size: [500, 140] },
    { ...valid[0], position: [Number.NaN, 3, 16] },
    { ...valid[0], parentLayer: 'scene-root' },
    { ...valid[0], localSpace: 'parent-scaled' },
    { ...valid[0], visibilityOnly: false },
  ]) assert.throws(() => validateSurfacePlacements([invalid]), /surface placement/i);
});

test('surface correction caps one route-attached arrowhead without lateral or vertical float', () => {
  assert.deepEqual(SURFACE_DIRECTION_MARKER, {
    materialKey: 'direction-amber',
    geometry: 'triangular-cone',
    radius: 0.075,
    length: 0.9,
    instancesPerMarker: 1,
    terminalT: 0.82,
    projectedMinPx: 16,
    projectedMaxPx: 18,
    projectedTargetPx: 16.5,
    projectedMaxWidthPx: 8,
    minimumGlyphSeparationPx: 8,
    viewPriority: 'network-terminal-overlay',
    emissive: true,
    engineeringOpaque: true,
    emissiveIntensity: 0.65,
    depthTest: true,
    depthWrite: false,
    renderOrder: 1180,
    topologyImpact: false,
  });
  assert.deepEqual(SURFACE_DIRECTION_MARKER_VIEW_POLICY, {
    minPx: 16,
    maxPx: 18,
    targetPx: 16.5,
    maxWidthPx: 8,
    minimumSeparationPx: 8,
    minimumScale: 0.05,
    maximumScale: 12,
  });
});

test('surface correction anchors the cone base on the sampled route and follows its 3D tangent', () => {
  const placement = createDirectionMarkerPlacement([2, 1, 3], [8, 5, -5]);
  const length = Math.hypot(6, 4, -8);

  assert.deepEqual(placement.routeAnchor.map((value) => Number(value.toFixed(6))), [6.92, 4.28, -3.56]);
  assert.deepEqual(placement.tangent.map((value) => Number(value.toFixed(6))), [
    Number((6 / length).toFixed(6)),
    Number((4 / length).toFixed(6)),
    Number((-8 / length).toFixed(6)),
  ]);
  assert.equal(placement.orientationErrorRadians, 0);
  assert.equal(placement.baseContactDistance, 0);
  assert.equal(placement.component, 'single-arrowhead');
  assert.equal(placement.instances, 1);
  assert.equal(placement.routeComponentT, 0.82);

  const staggered = createDirectionMarkerPlacement([0, 2, 0], [10, 2, 0], { terminalT: 0.9 });
  assert.deepEqual(staggered.routeAnchor, [9, 2, 0]);
  assert.deepEqual(staggered.tangent, [1, 0, 0]);
  assert.equal(staggered.routeComponentT, 0.9);
});

test('surface correction preserves route contact while scaling arrows into the screen-space band', () => {
  const placement = createDirectionMarkerPlacement([0, 0, 0], [10, 0, 0]);
  const scale = resolveDirectionMarkerScale(40);
  const transform = createDirectionMarkerViewTransform(placement, scale);

  assert.equal(scale, 0.4125);
  assert.equal(Number(transform.renderedLength.toFixed(6)), 0.37125);
  assert.deepEqual(transform.basePosition, placement.routeAnchor);
  assert.deepEqual(transform.position.map((value) => Number(value.toFixed(6))), [8.385625, 0, 0]);
  assert.deepEqual(transform.axis, [1, 0, 0]);
  assert.equal(transform.baseContactDistance, 0);

  assert.equal(resolveDirectionMarkerScale(2), 8.25, 'far views must grow only the annotation to 16.5 px');
  assert.equal(resolveDirectionMarkerScale(100), 0.165, 'close views must shrink the annotation to 16.5 px');
  assert.equal(Number(refineDirectionMarkerScale(8.25, 15.64).toFixed(6)), 8.703645);
  assert.throws(() => refineDirectionMarkerScale(1, 0), /positive and finite/i);
});

test('surface correction samples LoRa direction markers on rendered dash intervals', () => {
  const samples = [0.15, 0.29, 0.43, 0.575];
  for (const sample of samples) {
    assert.equal(
      isDirectionMarkerSampleVisibleOnDashedRoute(sample),
      true,
      `${sample} must land on a visible LoRa dash`,
    );
  }
  for (const sample of [0.68, 0.8]) {
    assert.equal(
      isDirectionMarkerSampleVisibleOnDashedRoute(sample),
      false,
      `${sample} must expose the dashed-route gap regression`,
    );
  }
  const evidence = createDashedRouteSampleEvidence(samples);
  assert.deepEqual(evidence.dashCells, [1, 2, 3, 4]);
  assert.deepEqual(evidence.phases.map((phase) => Number(phase.toFixed(3))), [0.05, 0.03, 0.01, 0.025]);
  assert.equal(evidence.allVisible, true);
  assert.equal(evidence.distinctDashCells, true);
});

test('surface correction rejects wide, crowded or duplicate projected route markers', () => {
  const valid = [
    { routeComponentId: 'rs485-a', projectedLengthPx: 16.4, projectedWidthPx: 5.2, bounds: { minX: 0, minY: 0, maxX: 5.2, maxY: 16.4 } },
    { routeComponentId: 'lorawan-b', projectedLengthPx: 17.1, projectedWidthPx: 6.1, bounds: { minX: 14, minY: 0, maxX: 20.1, maxY: 17.1 } },
  ];
  assert.equal(validateProjectedDirectionMarkers(valid), true);
  assert.throws(() => validateProjectedDirectionMarkers([
    valid[0],
    { ...valid[1], routeComponentId: 'rs485-a' },
  ]), /unique route component/i);
  assert.throws(() => validateProjectedDirectionMarkers([
    valid[0],
    { ...valid[1], bounds: { ...valid[1].bounds, minX: 12, maxX: 18.1 } },
  ]), /separation/i);
  assert.throws(() => validateProjectedDirectionMarkers([
    { ...valid[0], projectedLengthPx: 15 },
  ]), /screen-space band/i);
  assert.throws(() => validateProjectedDirectionMarkers([
    { ...valid[0], projectedWidthPx: 8.1 },
  ]), /lateral width/i);
});

test('complete-network uses endpoint hierarchy and four TC rollups while dedicated RS-485 retains every thermostat', () => {
  assert.deepEqual(SURFACE_NETWORK_LABEL_POLICY, {
    camera: 'complete-network',
    visibleKinds: ['uc100', 'ug67', 'external', 'bus-rollup'],
    culledKinds: ['bus-group', 'room-family', 'foh', 'rear-strip'],
    scaleByKind: { uc100: 1.5, ug67: 2.2, external: 1.5, 'bus-rollup': 1.4 },
    priorityByKind: { uc100: 1230, ug67: 1260, external: 1210, 'bus-rollup': 1200 },
  });
  // Derived: at ~100 m the caption must survive the projection, so no visible kind may shrink.
  for (const kind of SURFACE_NETWORK_LABEL_POLICY.visibleKinds) {
    assert.ok(
      SURFACE_NETWORK_LABEL_POLICY.scaleByKind[kind] > 1,
      `${kind} captions must grow, not shrink, at the complete-network distance`,
    );
  }
  // The thermostats are no longer culled by the endpoint hierarchy: their own policy owns them,
  // and it must cover the complete-network camera so the chain has a visible first node there.
  assert.equal(SURFACE_NETWORK_LABEL_POLICY.culledKinds.includes('tc300'), false);
  assert.ok(SURFACE_TC300_LABEL_POLICY.cameras.includes(SURFACE_NETWORK_LABEL_POLICY.camera));
  assert.ok(SURFACE_TC300_LABEL_POLICY.scaleByCamera[SURFACE_NETWORK_LABEL_POLICY.camera] > 1);
  assert.deepEqual(SURFACE_NETWORK_ROLLUPS.map(({ id, text }) => ({ id, text })), [
    { id: 'A', text: 'BUS A · TC01/02/03/04/14' },
    { id: 'B', text: 'BUS B · TC06–09' },
    { id: 'C', text: 'BUS C · TC10–13' },
    { id: 'D', text: 'BUS D · TC05' },
  ]);
  assert.deepEqual(SURFACE_RS485_EVIDENCE_POLICY, {
    camera: 'rs485-master',
    visibleKinds: ['tc300', 'uc100', 'bus-group'],
    requiredCounts: { tc300: 14, uc100: 4, 'bus-group': 4 },
  });
});

test('complete-network preset keeps endpoint evidence inside margins with useful occupancy', () => {
  assert.deepEqual(QA_CAMERA_PRESETS['complete-network'], {
    position: [82, 49, 48],
    target: [10, 4.2, -2],
    fov: 50,
  });
  // Derived: the detail preset is generated from the board, so the two can never drift apart.
  assert.deepEqual(QA_CAMERA_PRESETS['network-schematic-detail'].target, [...NETWORK_SCHEMATIC_BOARD.position]);
  assert.equal(QA_CAMERA_PRESETS['network-schematic-detail'].fov, 48);
  assert.deepEqual(SURFACE_NETWORK_VIEW_POLICY, {
    minimumMarginRatio: 0.02,
    maximumMarginRatio: 0.98,
    minimumOccupancyWidthRatio: 0.55,
    minimumOccupancyHeightRatio: 0.25,
  });
  assert.equal(validateNetworkViewportEvidence({
    viewport: { width: 1000, height: 800 },
    bounds: { minX: 40, minY: 30, maxX: 930, maxY: 670 },
  }), true);
  assert.throws(() => validateNetworkViewportEvidence({
    viewport: { width: 1000, height: 800 },
    bounds: { minX: 40, minY: 30, maxX: 500, maxY: 180 },
  }), /occupancy/i);
});

test('corridor surface camera stays below roof members and focuses wayfinding height', () => {
  assert.deepEqual(CAMERA_PRESETS.corridor, {
    position: [0, 3.2, 9.5],
    target: [0, 1.35, -8],
    fov: 65,
  });
  assert.ok(Math.abs(CAMERA_PRESETS.corridor.position[0]) < 3.5, 'camera must remain inside the clear corridor width');
  assert.ok(CAMERA_PRESETS.corridor.position[1] < 4, 'camera must remain below roof-frame members');
  assert.ok(CAMERA_PRESETS.corridor.target[1] <= 1.4, 'target must prioritize room numbers, exits, posters and carpet');
});

test('surface atlas is one deterministic shared sRGB mipmapped texture with bounded anisotropy', () => {
  const { canvas, context, documentObject } = createCanvasHarness();
  const disposed = [];
  class CanvasTexture {
    constructor(source) {
      this.image = source;
      this.generateMipmaps = false;
      this.anisotropy = 0;
      this.dispose = () => disposed.push(this);
    }
  }
  const THREE = {
    CanvasTexture,
    SRGBColorSpace: 'srgb',
    LinearMipmapLinearFilter: 'mipmap-linear',
    LinearFilter: 'linear',
    ClampToEdgeWrapping: 'clamp',
  };

  const first = createSurfaceAtlas({ THREE, documentObject, anisotropy: 32 });
  const firstOperations = JSON.stringify(context.operations);
  const secondHarness = createCanvasHarness();
  const second = createSurfaceAtlas({
    THREE,
    documentObject: secondHarness.documentObject,
    anisotropy: 32,
  });

  assert.equal(canvas.width, 1024);
  assert.equal(canvas.height, 1024);
  assert.equal(Object.keys(first.tiles).length, SURFACE_ATLAS_TILES.length);
  assert.equal(new Set(Object.values(first.tiles).map(({ index }) => index)).size, SURFACE_ATLAS_TILES.length);
  const wordmark = first.tiles.cinemex;
  assert.ok(
    (wordmark.u1 - wordmark.u0) / (wordmark.v1 - wordmark.v0) >= 7,
    'wordmark atlas allocation must preserve a readable banner aspect',
  );
  assert.equal(first.texture.colorSpace, 'srgb');
  assert.equal(first.texture.generateMipmaps, true);
  assert.equal(first.texture.minFilter, 'mipmap-linear');
  assert.equal(first.texture.magFilter, 'linear');
  assert.equal(first.texture.anisotropy, 4);
  assert.equal(firstOperations, JSON.stringify(secondHarness.context.operations));
  assert.notEqual(first.texture, second.texture);

  first.dispose();
  first.dispose();
  assert.equal(disposed.length, 1, 'atlas texture is disposed exactly once');
  second.dispose();
});

test('surface integration uses one atlas and deterministic poster/display query frames', async () => {
  const architecture = await readFile(new URL('../src/scene/architecture.js', import.meta.url), 'utf8');
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  const smoke = await readFile(new URL('../qa/browser-smoke.mjs', import.meta.url), 'utf8');

  assert.match(architecture, /createSurfaceAtlas/);
  assert.match(architecture, /setSurfaceFrame/);
  assert.match(architecture, /getSurfaceState/);
  assert.match(architecture, /surfaceCleanCameras/);
  assert.match(architecture, /validateSurfacePlacements\(surfacePlacements\)/);
  assert.match(architecture, /transparent: false/);
  assert.match(architecture, /depthWrite: true/);
  assert.match(architecture, /pass: 'surface'/);
  assert.match(main, /architectureAsset\.setSurfaceFrame\(\{/);
  assert.match(main, /posterFrame: queryState\.posterFrame/);
  assert.match(main, /displayFrame: queryState\.displayFrame/);
  assert.match(architecture, /SURFACE_DIRECTION_MARKER/);
  assert.match(architecture, /terminalAdjacent: true/);
  assert.match(architecture, /createDirectionMarkerPlacement/);
  assert.match(architecture, /createDirectionMarkerViewTransform/);
  assert.match(architecture, /resolveDirectionMarkerScale/);
  assert.match(architecture, /\[0\.15, 0\.29, 0\.43, 0\.575\]/);
  assert.match(architecture, /snapSampleToDashCentre\(/);
  assert.match(architecture, /isDirectionMarkerSampleVisibleOnDashedRoute\(terminalT, terminalDashPolicy\)/);
  assert.match(architecture, /routeAnchor/);
  assert.match(architecture, /routeComponentId/);
  assert.match(architecture, /single-arrowhead/);
  assert.match(architecture, /SURFACE_NETWORK_LABEL_POLICY/);
  assert.doesNotMatch(architecture, /chevron-arm|diamond-hub/);
  assert.match(main, /createEvidenceViewContext/);
  assert.match(main, /setEvidenceCamera\([^,]+, createEvidenceViewContext\(\)\)/);
  assert.match(smoke, /captureLiveSceneSnapshot/);
  assert.match(smoke, /nonGeneratedHash/);
  assert.match(smoke, /concessions-frame0-frame1/);
  assert.match(smoke, /corridor-labels-on-off/);
  assert.match(smoke, /sala3-frame0-frame1/);
  assert.match(smoke, /pixelRegionHash/);
});
