import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { CAMERA_PRESETS, QA_CAMERA_PRESETS } from '../src/controllers/camera.js';
import { parseQueryState } from '../src/controllers/query-state.js';
import {
  createArchitecturePlan,
  resolvePublicRoofVisibility,
  resolveTechnicalLabelVisibility,
} from '../src/scene/architecture.js';
import { resolveEngineeringOpacity, resolveShellLayerOpacity } from '../src/scene/lighting.js';
import { MATERIAL_SPECS, createMaterialRegistry } from '../src/scene/materials.js';
import {
  BOARD_ARROWHEAD,
  BOARD_CAPTION,
  createNetworkSchematicLayout,
  createNetworkSchematicModel,
  createNetworkSchematicTexture,
  estimateCaptionWidth,
  fitCaptionFontSize,
  resolveNetworkEvidenceVisibility,
} from '../src/scene/network-schematic.js';
import {
  SURFACE_ATLAS_LAYOUT,
  SURFACE_ATLAS_TILES,
  SURFACE_ENGINEERING_CONTRAST,
  SURFACE_NETWORK_LABEL_POLICY,
  SURFACE_NETWORK_MEDIA,
  SURFACE_ROOF_CLIP_CAMERAS,
  createPosterArtwork,
  createSurfaceDetailPlan,
  projectedMetresToPixels,
  resolveNetworkMediaWidthScale,
} from '../src/scene/surfaces.js';

const PLAN = createNetworkSchematicModel({
  appConfig: APP_CONFIG,
  architecturePlan: createArchitecturePlan(),
});
const LAYOUT = createNetworkSchematicLayout(PLAN);

function canvasHarness() {
  const operations = [];
  const context = new Proxy({
    operations,
    measureText: (value) => ({ width: String(value).length * 18 }),
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
    documentObject: { createElement: (tag) => (tag === 'canvas' ? canvas : null) },
  };
}

function segmentLength(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function distance(from, to) {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

// Correction 1 + 3: every board edge states its direction and is longer than its own arrowhead.
test('board correction 1/3: every schematic edge carries an arrowhead longer edges than the glyph', () => {
  const edgeIds = LAYOUT.edges.map(({ id }) => id);

  assert.ok(edgeIds.includes('ethernet-internet-niagara'), 'the INTERNET -> NIAGARA hop must be a drawn edge');
  assert.equal(new Set(edgeIds).size, edgeIds.length, 'edge ids must stay unique');
  assert.equal(LAYOUT.edges.filter(({ medium }) => medium === 'rs485').length, 4);
  assert.equal(LAYOUT.edges.filter(({ medium }) => medium === 'lorawan').length, 4);
  assert.equal(LAYOUT.edges.filter(({ medium }) => medium === 'ethernet').length, 6);

  for (const edge of LAYOUT.edges) {
    assert.equal(edge.arrowhead, true, `${edge.id} must state its direction`);
    const last = segmentLength(edge.points.at(-2), edge.points.at(-1));
    assert.ok(
      last >= BOARD_ARROWHEAD.length,
      `${edge.id} terminal segment (${last.toFixed(1)} px) is shorter than its arrowhead (${BOARD_ARROWHEAD.length} px)`,
    );
  }

  const ethernetRow = ['router', 'internet', 'niagara'].map((id) => LAYOUT.boxes.find((box) => box.id === id));
  for (let index = 0; index < ethernetRow.length - 1; index += 1) {
    const gap = ethernetRow[index + 1].x - (ethernetRow[index].x + ethernetRow[index].width);
    assert.ok(gap > BOARD_ARROWHEAD.length, `ETHERNET row gap ${gap} px must exceed the arrowhead length`);
  }
});

// Correction 2: captions are measured, not assumed.
test('board correction 2: every caption fits inside its own box at the minimum legible size', () => {
  const captions = Object.entries(LAYOUT.captions);
  assert.ok(captions.length >= 6);

  for (const [boxId, caption] of captions) {
    const box = LAYOUT.boxes.find(({ id }) => id === boxId);
    assert.ok(box, `caption ${caption} must own a box`);
    const inner = box.width - BOARD_CAPTION.padding * 2;
    const size = fitCaptionFontSize(caption, box.width);
    assert.ok(size >= BOARD_CAPTION.minSize, `${caption} cannot be fitted above ${BOARD_CAPTION.minSize} px`);
    assert.ok(
      estimateCaptionWidth(caption, size) <= inner,
      `${caption} overflows its box at ${size} px`,
    );
  }
});

// Correction 4: the model-link pill leaves the node body and four links land on four labelled ports.
test('board correction 4: the bridge pill sits clear of the UG67 node and four RF ports are labelled', () => {
  const ug67 = LAYOUT.boxes.find(({ id }) => id === 'ug67');
  const badge = LAYOUT.boxes.find(({ id }) => id === 'bridge-badge');

  assert.ok(badge, 'the model-link pill must be a first-class layout box');
  assert.ok(
    badge.y >= ug67.y + ug67.height || badge.x >= ug67.x + ug67.width,
    'the pill must sit below or beside the UG67 node body',
  );
  assert.equal(LAYOUT.overlaps.length, 0);

  assert.equal(LAYOUT.ug67Ports.length, 4);
  assert.deepEqual(LAYOUT.ug67Ports.map(({ label }) => label), ['RF1', 'RF2', 'RF3', 'RF4']);
  assert.equal(new Set(LAYOUT.ug67Ports.map(({ y }) => y)).size, 4);
  for (const port of LAYOUT.ug67Ports) {
    assert.ok(port.y > ug67.y && port.y < ug67.y + ug67.height, 'ports must stay on the node body');
    assert.ok(
      port.y < badge.y || port.y > badge.y + badge.height,
      `port ${port.label} must not be occluded by the model-link pill`,
    );
  }
  const lorawanEdges = LAYOUT.edges.filter(({ medium }) => medium === 'lorawan');
  assert.deepEqual(
    lorawanEdges.map(({ portId }) => portId),
    LAYOUT.ug67Ports.map(({ label }) => label),
    'four LoRaWAN links must land on the four labelled ports',
  );

  const harness = canvasHarness();
  class CanvasTexture { constructor(canvas) { this.image = canvas; } }
  createNetworkSchematicTexture({
    THREE: { CanvasTexture, SRGBColorSpace: 'srgb', LinearMipmapLinearFilter: 'm', LinearFilter: 'l' },
    documentObject: harness.documentObject,
    model: PLAN,
    layout: LAYOUT,
  });
  const rendered = harness.context.operations
    .filter(([operation]) => operation === 'fillText')
    .map(([, value]) => value);
  for (const label of ['RF1', 'RF2', 'RF3', 'RF4']) {
    assert.ok(rendered.includes(label), `missing rendered port label ${label}`);
  }
});

// Correction 5: in-model media must survive the complete-network camera distance.
test('correction 5: network media stay above the legibility floor at the complete-network camera', () => {
  const preset = QA_CAMERA_PRESETS[SURFACE_NETWORK_MEDIA.camera];
  const viewDistance = distance(preset.position, preset.target);
  const scale = resolveNetworkMediaWidthScale(SURFACE_NETWORK_MEDIA.camera);

  assert.ok(scale > 1, 'the complete-network camera must widen the media');
  assert.equal(resolveNetworkMediaWidthScale('corridor'), 1, 'other cameras keep true media width');

  const widths = Object.values(SURFACE_NETWORK_MEDIA.widths);
  const thinnest = Math.min(...widths);
  const projected = (metres) => projectedMetresToPixels(metres, {
    distance: viewDistance,
    fovDegrees: preset.fov,
    viewportHeightPx: SURFACE_NETWORK_MEDIA.evidenceViewportHeightPx,
  });

  assert.ok(
    projected(thinnest) < SURFACE_NETWORK_MEDIA.minimumProjectedPx,
    'the unscaled media must be the defect this correction removes',
  );
  for (const [name, width] of Object.entries(SURFACE_NETWORK_MEDIA.widths)) {
    assert.ok(
      projected(width * scale) >= SURFACE_NETWORK_MEDIA.minimumProjectedPx,
      `${name} projects ${projected(width * scale).toFixed(2)} px, below the legibility floor`,
    );
  }

  const visibility = resolveNetworkEvidenceVisibility('complete-network');
  assert.equal(visibility.densePhysicalNetwork, true, 'the physical chain must be visible at its own preset');
  assert.equal(visibility.technicalLabels, true);
  assert.equal(resolveNetworkEvidenceVisibility('network-schematic-detail').densePhysicalNetwork, false);
});

// Correction 6: the external blocks are wired and captioned, not anonymous slabs.
test('correction 6: the external Ethernet run connects UG67 to router, internet, Niagara and clients', () => {
  const plan = createArchitecturePlan();
  const { external, ipChain } = plan.topologyProxies;
  const ethernetRoute = plan.structural.containment.ug67EthernetRoute;
  const router = external.find(({ kind }) => kind === 'router');
  const cloud = external.find(({ kind }) => kind === 'cloud');
  const server = external.find(({ kind }) => kind === 'server');

  assert.deepEqual(ethernetRoute.points.at(-1), router.position, 'the Ethernet run must terminate on the router');
  assert.deepEqual(ipChain.points.slice(1), [router.position, cloud.position, server.position]);
  assert.equal(ipChain.clientBranches.length, 3);
  assert.ok(ipChain.clientBranches.every(({ start }) => (
    JSON.stringify(start) === JSON.stringify(server.position)
  )), 'client branches must leave the Niagara supervisor');

  const captions = plan.billboards.technical.filter(({ kind }) => kind === 'external');
  assert.equal(captions.length, external.length);
  assert.deepEqual(captions.map(({ text }) => text), [
    'ROUTER / FIREWALL', 'INTERNET', 'NIAGARA', 'PC', 'TABLET', 'SMARTPHONE',
  ]);

  const preset = QA_CAMERA_PRESETS['complete-network'];
  const viewDistance = distance(preset.position, preset.target);
  const factor = SURFACE_NETWORK_LABEL_POLICY.scaleByKind.external;
  for (const caption of captions) {
    const widthPx = projectedMetresToPixels(caption.scale[0] * factor, {
      distance: viewDistance,
      fovDegrees: preset.fov,
      viewportHeightPx: SURFACE_NETWORK_MEDIA.evidenceViewportHeightPx,
    });
    assert.ok(widthPx >= 40, `${caption.text} projects ${widthPx.toFixed(1)} px wide and stays unreadable`);
  }
});

// Correction 7: the fit-out presets must look at the fit-out, not at the roof slab.
test('correction 7: lobby, concessions and kitchen sit inside the public band with the roof clipped', () => {
  const plan = createArchitecturePlan();
  const band = plan.bands.find(({ id }) => id === 'front-public');

  for (const name of ['lobby', 'concessions', 'kitchen']) {
    const preset = CAMERA_PRESETS[name];
    const [x, y, z] = preset.position;
    assert.ok(z > band.bounds.z[0] && z < band.bounds.z[1], `${name} camera must sit inside the public band`);
    assert.ok(x >= band.bounds.x[0] && x <= band.bounds.x[1]);
    assert.ok(y > 0 && y < band.height, `${name} camera must stay under the public roof (${band.height} m)`);
    const [targetX, , targetZ] = preset.target;
    assert.ok(targetZ > band.bounds.z[0] && targetZ < band.bounds.z[1], `${name} target must stay in the fit-out`);
    assert.ok(targetX >= band.bounds.x[0] && targetX <= band.bounds.x[1]);
    assert.equal(resolvePublicRoofVisibility(name), false, `${name} must clip the public roof`);
    assert.ok(SURFACE_ROOF_CLIP_CAMERAS.includes(name));
  }
  assert.equal(resolvePublicRoofVisibility('facade'), true);
  assert.equal(resolvePublicRoofVisibility('isometric'), true);
});

// Correction 8: the architecture state is not allowed to leak technical device labels.
test('correction 8: technical labels are engineering-only unless labels are explicitly requested', () => {
  assert.equal(resolveTechnicalLabelVisibility({ visualMode: 'architectural', labels: true, labelsExplicit: false }), false);
  assert.equal(resolveTechnicalLabelVisibility({ visualMode: 'architectural', labels: true, labelsExplicit: true }), true);
  assert.equal(resolveTechnicalLabelVisibility({ visualMode: 'architectural', labels: false, labelsExplicit: true }), false);
  assert.equal(resolveTechnicalLabelVisibility({ visualMode: 'engineering', labels: true, labelsExplicit: false }), true);
  assert.equal(resolveTechnicalLabelVisibility({ visualMode: 'engineering', labels: false, labelsExplicit: true }), false);

  assert.equal(parseQueryState('?state=architecture&poster_frame=0').labelsExplicit, false);
  assert.equal(parseQueryState('?state=architecture&labels=on').labelsExplicit, true);
  assert.equal(parseQueryState('?mode=engineering&labels=on&links=all').labelsExplicit, true);
});

// Correction 9: the facade poster bank carries real, frame-changing artwork.
test('correction 9: the facade poster bank owns four generated panels that change between frames', () => {
  const plan = createArchitecturePlan();
  const bank = plan.facade.posterBank;
  const facadeOuterFace = plan.facade.marquee.position[2] - plan.facade.marquee.size[2] / 2;

  assert.equal(bank.panels.length, 4);
  assert.equal(new Set(bank.panels.map(({ variant }) => variant)).size, 4);
  for (const panel of bank.panels) {
    assert.ok(panel.size[0] <= 1.8 && panel.size[1] <= 2.2, 'poster panels stay inside the placeholder limit');
    assert.ok(panel.position[2] > facadeOuterFace, 'panels must sit on the outer facade face');
    assert.ok(Math.abs(panel.position[0]) <= 30);
  }
  const xs = bank.panels.map(({ position }) => position[0]).sort((a, b) => a - b);
  assert.equal(new Set(xs).size, 4, 'panels must not stack on one another');

  for (const frame of [0, 1]) {
    for (const panel of bank.panels) {
      assert.ok(SURFACE_ATLAS_TILES.includes(`poster-${frame}${panel.variant}`));
      assert.ok(SURFACE_ATLAS_LAYOUT[`poster-${frame}${panel.variant}`]);
    }
  }

  const artworks = [0, 1].flatMap((frame) => (
    ['a', 'b', 'c', 'd'].map((variant) => JSON.stringify(createPosterArtwork(frame, variant)))
  ));
  assert.equal(new Set(artworks).size, 8, 'every poster panel and frame must draw distinct artwork');
  for (const variant of ['a', 'b', 'c', 'd']) {
    assert.notEqual(
      JSON.stringify(createPosterArtwork(0, variant)),
      JSON.stringify(createPosterArtwork(1, variant)),
      `poster ${variant} must visibly change between frame 0 and frame 1`,
    );
  }
});

// Correction 10: the menu boards belong to the counter, not to mid-air.
test('correction 10: menu boards are counter-scaled and mounted on the service back wall', () => {
  const plan = createArchitecturePlan();
  const counter = plan.blockoutProxies.frontOfHouse.find(({ kind }) => kind === 'concession-counter');
  const { menuBoards, serviceBackWall } = plan.frontOfHouseSurfaces;
  const counterTop = counter.position[1] + counter.size[1] / 2;
  const counterFront = counter.position[2] + counter.size[2] / 2;
  const counterBack = counter.position[2] - counter.size[2] / 2;
  const facadeGlassZ = plan.facade.entrances[0].position[2];

  assert.ok(menuBoards.length >= 3);
  for (const board of menuBoards) {
    assert.ok(board.size.every((value) => value >= 1.2 && value <= 1.8), `board ${board.id} is not a 1.2-1.8 m board`);
    assert.ok(board.position[1] - board.size[1] / 2 >= counterTop, 'boards must hang above the service line');
    assert.ok(board.position[2] < counterBack, 'boards must sit behind the counter, on the back wall');
    assert.ok(facadeGlassZ - board.position[2] > 5, 'boards must not reach the facade glass');
    assert.ok(Math.abs(board.position[2] - serviceBackWall.position[2]) <= serviceBackWall.size[2], 'boards must touch the back wall');
    assert.ok(board.position[2] < counterFront);
  }
  assert.ok(serviceBackWall.position[1] - serviceBackWall.size[1] / 2 >= counterTop - 0.01);
});

// Correction 11: the claimed front-of-house and evacuation cues need real geometry.
test('correction 11: POS, snack machine and corridor wayfinding cues are generated geometry', () => {
  const plan = createArchitecturePlan();
  const surfacePlan = createSurfaceDetailPlan();
  const categories = new Set(surfacePlan.details.map(({ category }) => category));

  for (const required of ['pos-cue', 'snack-machine-cue', 'wayfinding-marking', 'exit-sign']) {
    assert.ok(categories.has(required), `missing surface category ${required}`);
  }

  const { evacuationArrows, corridorExitSigns } = plan.wayfinding;
  const corridor = plan.centralCorridor.bounds;

  assert.ok(evacuationArrows.length >= 4);
  assert.ok(corridorExitSigns.length >= 4);
  for (const arrow of evacuationArrows) {
    assert.ok(arrow.position[0] >= corridor.x[0] && arrow.position[0] <= corridor.x[1]);
    assert.ok(arrow.position[2] >= corridor.z[0] && arrow.position[2] <= corridor.z[1]);
    assert.equal(Math.sign(arrow.direction[2]), 1, 'evacuation arrows must point out toward the public band');
  }
  for (const sign of corridorExitSigns) {
    assert.ok(Math.abs(sign.position[0]) <= Math.abs(corridor.x[0]) + 0.2, 'exit signs mount on the corridor walls');
    assert.ok(sign.position[1] >= 2, 'exit signs must stay above head height');
    assert.equal(sign.tile, 'exit');
  }
});

// Correction 12: the auditorium side walls must read as absorptive, not as drywall.
test('correction 12: auditorium side walls receive a charcoal acoustic lining', () => {
  const plan = createArchitecturePlan();
  const linings = plan.auditoriumAcousticLinings;
  const luminance = (color) => (
    ((color >> 16) & 0xff) * 0.2126 + ((color >> 8) & 0xff) * 0.7152 + (color & 0xff) * 0.0722
  );

  assert.equal(new Set(linings.map(({ auditoriumId }) => auditoriumId)).size, 8);
  assert.ok(linings.length >= 16, 'both side walls of every auditorium must be lined');

  for (const lining of linings) {
    const room = plan.auditoriums.find(({ id }) => id === lining.auditoriumId);
    assert.ok(lining.position[0] >= room.bounds.x[0] && lining.position[0] <= room.bounds.x[1]);
    assert.ok(lining.position[2] >= room.bounds.z[0] - 0.2 && lining.position[2] <= room.bounds.z[1] + 0.2);
    assert.equal(lining.materialKey, 'auditorium-acoustic-wall');
  }
  assert.ok(
    luminance(MATERIAL_SPECS.auditoriumAcousticFabric.color) < luminance(MATERIAL_SPECS.shellWarmWhite.color) * 0.35,
    'the acoustic lining must be far darker than the shell white',
  );
});

// Correction 13: the engineering state must let one route be traced by eye.
test('correction 13: engineering contrast lowers seat and zone bleed and lifts media emission', () => {
  const contrast = SURFACE_ENGINEERING_CONTRAST;

  assert.ok(contrast.seatOpacity <= contrast.shellOpacity / 2, 'seats must bleed less than the shell');
  assert.ok(contrast.zoneOpacity <= 0.05, 'zone volumes must stop washing the media');
  // The surface pass guarded "media emission beats the translucent shell" with a raw multiplier
  // floor of 1.25. The surface REVIEW then found that the same multiplier clips the media to white
  // and destroys the legend colour, so the lighting pass owns the magnitude. What still has to hold
  // is the RELATION, and it now holds against the de-ghosted shell it actually competes with:
  // media emission per unit of shell alpha must stay far above unity.
  const shellAlpha = resolveShellLayerOpacity();
  assert.ok(
    contrast.mediaEmissiveIntensity / shellAlpha >= 5,
    'media emission must still out-run the translucent shell it is drawn behind',
  );
  assert.equal(MATERIAL_SPECS.rs485Green.emissiveIntensity, contrast.mediaEmissiveIntensity);
  assert.equal(MATERIAL_SPECS.networkBlue.emissiveIntensity, contrast.mediaEmissiveIntensity);

  class Material {
    constructor(parameters = {}) { Object.assign(this, parameters); this.disposeCalls = 0; }
    dispose() { this.disposeCalls += 1; }
  }
  const THREE = {
    MeshStandardMaterial: Material,
    MeshPhysicalMaterial: Material,
  };
  const registry = createMaterialRegistry(THREE);
  registry.registerCutawayMaterials([
    registry.materials.seatBurgundyFabric,
    registry.materials.auditoriumCarpet,
  ]);
  registry.setEngineeringMode(true);

  // The de-ghosting factor is applied uniformly, so the relation the surface pass gated survives
  // it: the seats still bleed less than the shell they sit behind.
  assert.equal(registry.materials.seatBurgundyFabric.opacity, resolveEngineeringOpacity(contrast.seatOpacity));
  assert.equal(registry.materials.shellWarmWhite.opacity, resolveShellLayerOpacity());
  assert.ok(
    registry.materials.seatBurgundyFabric.opacity <= registry.materials.shellWarmWhite.opacity / 2,
    'seats must still bleed less than the shell after de-ghosting',
  );
  assert.equal(registry.materials.rs485Green.opacity ?? 1, 1, 'media must stay opaque in engineering');

  registry.setEngineeringMode(false);
  assert.equal(registry.materials.seatBurgundyFabric.opacity, 1);
});
