import assert from 'node:assert/strict';
import test from 'node:test';

import { parseQueryState } from '../src/controllers/query-state.js';
import { createArchitecturePlan } from '../src/scene/architecture.js';
import { resolveEngineeringOpacity, resolveShellLayerOpacity } from '../src/scene/lighting.js';
import { MATERIAL_SPECS, createMaterialRegistry } from '../src/scene/materials.js';
import {
  SURFACE_ATLAS_LAYOUT,
  SURFACE_ATLAS_TILES,
  SURFACE_ENGINEERING_CONTRAST,
  createPosterArtwork,
  createSurfaceDetailPlan,
} from '../src/scene/surfaces.js';

// Limpieza fase 2 (2026-07-18): the network-schematic board module was removed (unreachable
// after the engineering mode and QA evidence presets retired), so the board layout/caption/
// texture contracts (corrections 1-4) and the complete-network media-legibility evidence
// (correction 5) left with it.

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
});

// Limpieza fase 2 (2026-07-18): correction 7 (the lobby/concessions/kitchen fit-out presets
// and their public-roof clip) retired with the pruned preset catalogue and the removed
// roof-clip machinery.

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

  // The de-ghosting relation survives at the authority level: the seats' derived opacity stays
  // below half the shell's. (Limpieza fase 2, 2026-07-18: the registry's engineering mode was
  // retired with the engineering visual state; the lighting derivation keeps the contract.)
  assert.ok(
    resolveEngineeringOpacity(contrast.seatOpacity) <= resolveShellLayerOpacity() / 2,
    'seats must still bleed less than the shell after de-ghosting',
  );
});
