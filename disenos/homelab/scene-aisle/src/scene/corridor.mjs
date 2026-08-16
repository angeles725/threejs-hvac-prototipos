// corridor.mjs — the office corridor the aisle sits in (P4 BLOCKOUT).
//
// EVERY PROP HERE IS BUILT, NOTHING IS DOWNLOADED. The external CC0/CC-BY mesh track was
// deferred by decision. Worth recording separately: tools/verify-external-asset.mjs — the
// hard gate the catalog mandates for any external mesh (licence, provenance, sha256, zero
// external URIs, scale sanity) — DOES NOT EXIST in this repo, so that track has no door even
// if it is reopened later.
//
// COLOURS ARE REFERENCE-CORRECTED WHERE THE PHOTOGRAPHS SETTLE THEM. The floor is the clearest
// case: authored #8a7358 from the words "wood-look tile floor", which is an accurate
// description that built the wrong picture — site-01/05/08 show a pale grey-beige plank.
// The others are still judged by eye from the frames rather than sampled pixel-wise, and say
// so in the spec.

import * as THREE from 'three';
import { LIGHT_RIG } from './runtime.mjs';
import { makePlankFloorTexture, makeCarpetTexture, makeCeilingPanelTexture } from './textures.mjs';
import { AISLE_WIDTH, AISLE_LENGTH, CEILING_H, HUMAN_H, RACK_D } from './dims.mjs';

const CORRIDOR_W = AISLE_WIDTH + 2 * RACK_D + 0.6;   // aisle + both cabinet rows + wall gap

export function createCorridorMaterials() {
  const mk = (name, opts) => { const m = new THREE.MeshStandardMaterial(opts); m.name = name; return m; };
  return {
    // ---- MATERIALS PASS ----------------------------------------------------------------
    // Every value below was SOLVED by inverting the tone curve, not picked by eye: the target
    // is the PIXEL the photographs show, and the albedo that lands there is searched for. The
    // curve used is the one read out of the vendored r160 bundle — ACES in its RRT/ODT MATRIX
    // form, exposure 1.05, BRDF_Lambert = albedo/PI, and no PI factor on light intensity
    // (_useLegacyLights is false). Each result is checked across a SWEPT environment
    // irradiance (0.15 / 0.35 / 0.60), because the PMREM'd RoomEnvironment contribution is not
    // analytic: a value that only works at one env level is not solved, it is fitted.
    // LIGHT WOOD PLANK, not access tile. Both site-01 and site-05 show long boards running
    // down the corridor with grain and dark seams — it is an office fit-out, and modelling
    // 600 mm raised-floor tiles here would import a datacentre convention the photographs
    // plainly contradict.
    floor_wood_tile: mk('floor_wood_tile', {
      color: 0xc5bcb2, metalness: 0, roughness: 0.55, envMapIntensity: 0.8,
      map: makePlankFloorTexture() }),
    wall_neutral: mk('wall_neutral', { color: 0xd9d9d6, metalness: 0, roughness: 0.85 }),
    // Brighter and glossier than the wall it sits against — a skirting that matches the wall
    // is a skirting nobody can see.
    skirting: mk('skirting', { color: 0xf2f2ee, metalness: 0, roughness: 0.35, envMapIntensity: 1.1 }),

    // THE DARK SURFACES WERE RENDERING AS HOLES. Measured through the curve, the previous
    // values landed at rgb(1..3) — below the absolute exposure floor, and DARKER THAN THE
    // SCENE BACKGROUND. A stool and a pendant are silhouettes that have to read against that
    // background; at luma 1 they were subtracting from it. Solved to ~34, which reads as a
    // dark object rather than an absence. This is not "lightening the design": the albedo of
    // real black plastic is around 0.04-0.05 linear, and 0x18191c is far below even that.
    ceiling_deck: mk('ceiling_deck', {
      color: 0x888f9e, metalness: 0, roughness: 0.8, envMapIntensity: 0.6 }),
    // THE REFERENCE CORRECTED THIS, AND IT WAS A GUARD OF MINE THAT WAS ASSERTING THE WRONG
    // THING. I had declared these panels COOL daylight (0xa8c8e8, warmth -17) and written
    // verifyLuminairesKeepTheirOwnHue to enforce sign -1 on them. site-01 and site-05 both
    // show the opposite: the translucent panels read WARM — filtered sunlight, golden where
    // the sun strikes them. The guard's shape was right and its declared identity was wrong,
    // which is the failure mode a guard cannot catch about itself: it will defend a mistaken
    // decision as loyally as a correct one.
    ceiling_daylight: mk('ceiling_daylight', {
      color: 0xe8eef2, metalness: 0, roughness: 0.9, map: makeCeilingPanelTexture(),
      emissive: new THREE.Color(0xffe4b8), emissiveIntensity: 1.15,
    }),
    // THE THREE WHITES CANNOT BE SEPARATED BY COLOUR, and the solver is what proved it: asked
    // for luma 96 / 132 / 158 it returned #fafaf5, #fffffc and #fffcf5 — all pinned against
    // the top of the albedo range — and all three still landed within 3 luma of each other.
    // There is no headroom left above white. So they are separated by ROUGHNESS instead,
    // which moves the specular term the diffuse solver cannot reach: the deck beam is
    // semi-matte structural steel, the lounge ceiling is flat plasterboard, and the smoke
    // detector is glossy moulded plastic. Same albedo, three different surfaces.
    ceiling_beam: mk('ceiling_beam', {
      color: 0xe4e4e0, metalness: 0, roughness: 0.7, envMapIntensity: 1.0 }),
    lounge_ceiling: mk('lounge_ceiling', {
      color: 0xf0f0ec, metalness: 0, roughness: 0.95, envMapIntensity: 0.7 }),
    smoke_detector: mk('smoke_detector', {
      color: 0xe8e8e4, metalness: 0, roughness: 0.35, envMapIntensity: 1.2 }),

    // Painted steel tray, not a flat yellow stripe — it has to catch a highlight to read as
    // metal. envMapIntensity is the live control here: scene.environmentIntensity is DEAD in
    // r160 and silently does nothing, so the per-material property is the only working lever.
    cable_tray: mk('cable_tray', {
      color: 0xd8b62a, metalness: 0.35, roughness: 0.45, envMapIntensity: 1.3 }),

    // A clean pane seen head-on reflects about 4% (F0 = 0.04) and shows what is BEHIND it —
    // so measuring it against the wall and finding them similar is the glass working, not a
    // defect. What identifies it is the mullions, the frame, and the grazing-angle
    // reflection, which is why envMapIntensity is raised rather than the opacity.
    glass_partition: mk('glass_partition', {
      color: 0xc8d6dd, metalness: 0, roughness: 0.05,
      transparent: true, opacity: 0.18, envMapIntensity: 2.2,
    }),
    pendant_lamp_black: mk('pendant_lamp_black', {
      color: 0x57554f, metalness: 0.2, roughness: 0.45, envMapIntensity: 1.1 }),
    // AMBER SURVIVES BY LOSING INTENSITY, NOT GAINING IT. At 0xffd9a0 x2.0 the pendant
    // rendered rgb(243,236,221) — a warm-white lamp with no amber left, because a high
    // emissive pushes all three channels into the top of the curve where they converge.
    // Saturating the colour and LOWERING the intensity gives rgb(243,192,90), stable across
    // the whole env sweep. The material was never the problem; the pixel was.
    pendant_lamp_emissive: mk('pendant_lamp_emissive', {
      color: 0x141210, metalness: 0, roughness: 0.4,
      emissive: new THREE.Color(0xff9a30), emissiveIntensity: 1.25,
    }),
    // The daylight haze the towers stand against — deliberately LIGHTER than the towers, so
    // the silhouette reads by contrast rather than by its own brightness.
    sky_haze: mk('sky_haze', {
      color: 0x9fb6cc, metalness: 0, roughness: 1.0,
      emissive: new THREE.Color(0x6f8ba8), emissiveIntensity: 0.55,
    }),
    tower_far: mk('tower_far', { color: 0x8ea2b6, metalness: 0, roughness: 0.9 }),
    tower_near: mk('tower_near', { color: 0x5f7186, metalness: 0, roughness: 0.85 }),
    lounge_carpet: mk('lounge_carpet', {
      color: 0x5c6b58, metalness: 0, roughness: 0.95, map: makeCarpetTexture() }),
    downlight: mk('downlight', {
      color: 0xf6f2ea, metalness: 0, roughness: 0.5,
      emissive: new THREE.Color(0xffe8c0), emissiveIntensity: 1.71,
    }),
    // Anodised aluminium, so it holds an edge highlight against the sky behind it.
    window_mullion: mk('window_mullion', {
      color: 0x6d737c, metalness: 0.65, roughness: 0.35, envMapIntensity: 1.4 }),
    bar_top: mk('bar_top', {
      color: 0x43474a, metalness: 0.15, roughness: 0.3, envMapIntensity: 1.2 }),
    stool: mk('stool', { color: 0x53555b, metalness: 0.1, roughness: 0.55, envMapIntensity: 1.0 }),
    purple_accent: mk('purple_accent', {
      color: 0x2a1a3a, metalness: 0, roughness: 0.8,
      emissive: new THREE.Color(0x7a3fd0), emissiveIntensity: 1.2,
    }),
    human_figure_mat: mk('human_figure_mat', { color: 0x4a5560, metalness: 0, roughness: 0.8 }),
  };
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const put = (geo, mat, name, pos) => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(...pos);
  return m;
};

export function buildCorridor(mats) {
  const root = new THREE.Group();
  root.name = 'corridor';

  // The aisle runs along +z toward the glass door and the lounge beyond, which is the
  // viewpoint site-01 and site-05 are taken from.
  const zMid = AISLE_LENGTH / 2 - 1.5;

  root.add(put(box(CORRIDOR_W, 0.02, AISLE_LENGTH), mats.floor_wood_tile,
               'floor', [0, -0.01, zMid]));

  // Ceiling: a dark deck with translucent daylight panels between white cross-beams. Not one
  // flat plane — the beams are what give the corridor its rhythm in both aisle photographs.
  root.add(put(box(CORRIDOR_W, 0.04, AISLE_LENGTH), mats.ceiling_deck,
               'ceiling_deck', [0, CEILING_H + 0.02, zMid]));
  const panelW = AISLE_WIDTH + 0.4;
  root.add(put(box(panelW, 0.012, AISLE_LENGTH - 0.4), mats.ceiling_daylight,
               'ceiling_daylight', [0, CEILING_H - 0.006, zMid]));
  const beams = new THREE.Group();
  beams.name = 'ceiling_beams';
  root.add(beams);
  const beamGeo = box(CORRIDOR_W, 0.06, 0.07);
  for (let i = 0; i < 6; i += 1) {
    beams.add(put(beamGeo, mats.ceiling_beam, `beam_${i}`,
                  [0, CEILING_H - 0.03, zMid - AISLE_LENGTH / 2 + 0.9 + i * 1.45]));
  }
  // Yellow cable tray, visible overhead in site-03, site-06 and site-07. site-07 shows it
  // CROSSING the aisle as well as running along it, which is what makes it read as a tray
  // rather than a stripe.
  root.add(put(box(0.22, 0.05, AISLE_LENGTH - 1.0), mats.cable_tray,
               'cable_tray', [CORRIDOR_W / 2 - 0.5, CEILING_H - 0.16, zMid]));
  root.add(put(box(CORRIDOR_W - 0.8, 0.05, 0.20), mats.cable_tray,
               'cable_tray_cross', [0, CEILING_H - 0.16, zMid - 1.6]));

  // Purple accent washing the dark deck — site-03, site-05, site-07.
  root.add(put(box(0.30, 0.02, 2.4), mats.purple_accent,
               'purple_accent', [-CORRIDOR_W / 2 + 0.6, CEILING_H - 0.06, zMid + 1.2]));

  // Round smoke detectors on the deck — site-03.
  for (let i = 0; i < 2; i += 1) {
    root.add(put(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), mats.smoke_detector,
                 `smoke_detector_${i}`, [0.4, CEILING_H - 0.03, zMid - 2.2 + i * 3.4]));
  }

  // Side walls, behind the cabinet rows.
  for (const sign of [-1, 1]) {
    root.add(put(box(0.05, CEILING_H, AISLE_LENGTH), mats.wall_neutral,
                 sign < 0 ? 'wall_left' : 'wall_right',
                 [sign * CORRIDOR_W / 2, CEILING_H / 2, zMid]));
    // Skirting. site-05 shows a white board where the wall meets the plank floor, and without
    // it a wall and a floor that share a light neutral tone merge into one surface at the
    // join — the corner stops reading as a corner.
    root.add(put(box(0.02, 0.09, AISLE_LENGTH), mats.skirting,
                 sign < 0 ? 'skirting_left' : 'skirting_right',
                 [sign * (CORRIDOR_W / 2 - 0.035), 0.045, zMid]));
  }

  // The glass partition and sliding door at the end of the aisle, with the lounge beyond.
  // depthWrite OFF: a transparent wall that writes depth occludes everything drawn after it,
  // which would hide the very lounge it is supposed to show through. That single flag is the
  // difference between a glass wall and an opaque one.
  mats.glass_partition.depthWrite = false;
  mats.glass_partition.side = THREE.DoubleSide;
  const zEnd = zMid + AISLE_LENGTH / 2;
  root.add(put(box(CORRIDOR_W, CEILING_H, 0.02), mats.glass_partition,
               'glass_partition', [0, CEILING_H / 2, zEnd - 0.02]));

  // The lounge: carpet, a far window wall with a low-contrast skyline, and two dome pendants.
  const lounge = new THREE.Group();
  lounge.name = 'lounge';
  root.add(lounge);
  lounge.add(put(box(CORRIDOR_W + 2, 0.02, 4.0), mats.lounge_carpet,
                 'lounge_carpet', [0, -0.008, zEnd + 2.0]));
  // A SKYLINE, NOT A PAINTED WALL. The blockout put one flat blue-grey plane behind the
  // window, which is the same failure the unmullioned pane had: an object standing in for a
  // view instead of being one. What makes a distant city read is PARALLAX AND SILHOUETTE —
  // two depths of tower against a lighter haze, so the near band occludes the far one and the
  // roofline breaks the horizontal.
  //
  // The haze is EMISSIVE and the towers are not, deliberately: the sky behind a skyline is
  // BRIGHTER than the buildings in front of it, so the silhouette reads by CONTRAST rather
  // than by lighting the towers up.
  lounge.add(put(box(CORRIDOR_W + 4, CEILING_H * 1.6, 0.06), mats.sky_haze,
                 'sky_haze', [0, CEILING_H * 0.5, zEnd + 5.2]));

  // A FIXED TABLE, not a random skyline: a view that reshuffles between captures cannot be
  // compared against the previous attempt, and Math.random() would make every judgement
  // unrepeatable.
  const FAR  = [[-3.30, 1.05, 0.62], [-2.10, 1.55, 0.48], [-1.05, 0.86, 0.70],
                [0.15, 1.72, 0.55], [1.30, 1.14, 0.64], [2.35, 1.48, 0.50], [3.40, 0.94, 0.68]];
  const NEAR = [[-2.70, 0.72, 0.86], [-0.60, 1.02, 0.74], [1.05, 0.64, 0.92], [2.90, 0.88, 0.80]];
  FAR.forEach(([x, h, w], i) =>
    lounge.add(put(box(w, h, 0.05), mats.tower_far, `tower_far_${i}`, [x, h / 2, zEnd + 4.85])));
  NEAR.forEach(([x, h, w], i) =>
    lounge.add(put(box(w, h, 0.05), mats.tower_near, `tower_near_${i}`, [x, h / 2, zEnd + 4.55])));
  // The lounge ceiling is its own surface — white, with recessed downlights.
  lounge.add(put(box(CORRIDOR_W + 2, 0.03, 4.0), mats.lounge_ceiling,
                 'lounge_ceiling', [0, CEILING_H + 0.015, zEnd + 2.0]));
  for (let i = 0; i < 4; i += 1) {
    lounge.add(put(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16), mats.downlight,
                   `downlight_${i}`, [-1.6 + i * 1.1, CEILING_H - 0.008, zEnd + 2.9]));
  }

  // CONICAL BELL SHADES, not hemispheres. site-07 shows two black bell pendants on cords
  // over the bar — the blockout's half-spheres were the wrong lamp.
  for (const x of [-0.9, 0.9]) {
    const tag = x < 0 ? 'l' : 'r';
    lounge.add(put(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 6), mats.pendant_lamp_black,
                   `pendant_cord_${tag}`, [x, CEILING_H - 0.31, zEnd + 1.6]));
    lounge.add(put(new THREE.CylinderGeometry(0.055, 0.19, 0.22, 20, 1, true),
                   mats.pendant_lamp_black, `pendant_shade_${tag}`,
                   [x, CEILING_H - 0.73, zEnd + 1.6]));
    lounge.add(put(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 20), mats.pendant_lamp_emissive,
                   `pendant_lamp_${tag}`, [x, CEILING_H - 0.84, zEnd + 1.6]));
  }
  mats.pendant_lamp_black.side = THREE.DoubleSide;   // an open shade is seen from inside too

  // The window wall carries MULLIONS. A single flat pane reads as a painted backdrop; the
  // vertical divisions are what make it a window in every frame that shows one.
  for (let i = 0; i < 6; i += 1) {
    lounge.add(put(box(0.05, CEILING_H, 0.05), mats.window_mullion,
                   `mullion_${i}`, [-2.9 + i * 1.16, CEILING_H / 2, zEnd + 3.95]));
  }

  // High bar and stools against the window — site-07. Masses only; this is structural, and a
  // scene pass authors no furniture detail it cannot evidence.
  lounge.add(put(box(3.2, 0.05, 0.42), mats.bar_top, 'bar_top', [0, 1.05, zEnd + 3.5]));
  for (let i = 0; i < 4; i += 1) {
    const x = -1.2 + i * 0.8;
    lounge.add(put(new THREE.CylinderGeometry(0.03, 0.03, 0.66, 8), mats.stool,
                   `stool_leg_${i}`, [x, 0.33, zEnd + 3.15]));
    lounge.add(put(box(0.36, 0.05, 0.34), mats.stool, `stool_seat_${i}`, [x, 0.68, zEnd + 3.15]));
    lounge.add(put(box(0.34, 0.40, 0.04), mats.stool, `stool_back_${i}`, [x, 0.90, zEnd + 3.32]));
  }

  return { root, corridorWidth: CORRIDOR_W, zEnd };
}

/**
 * A NEUTRAL SILHOUETTE, not a character. Its only job is scale — a viewer sizing a 2 m cabinet
 * against a person needs proportion, not a face. Anything more detailed invites judging a
 * person instead of an aisle, and nothing in the photographs describes one.
 */
export function buildHumanFigure(mats) {
  const g = new THREE.Group();
  g.name = 'human_figure';
  const legs = HUMAN_H * 0.47, torso = HUMAN_H * 0.34, head = HUMAN_H * 0.13;
  g.add(put(box(0.34, legs, 0.20), mats.human_figure_mat, 'figure_legs', [0, legs / 2, 0]));
  g.add(put(box(0.42, torso, 0.24), mats.human_figure_mat, 'figure_torso', [0, legs + torso / 2, 0]));
  g.add(put(new THREE.SphereGeometry(head / 2, 16, 12), mats.human_figure_mat, 'figure_head',
            [0, legs + torso + head / 2, 0]));
  return g;
}

/**
 * ZONE SEPARATION: lounge furniture belongs in the LOUNGE, not in the aisle.
 *
 * A scene-only failure. Every piece is correctly built and correctly scaled; what can go wrong
 * is which side of the glass it ends up on — and once the aisle camera looks toward the
 * lounge, a stool standing in the walkway reads as a stool in a datacentre.
 */
export function verifyLoungeStaysBehindTheGlass(scene) {
  scene.updateMatrixWorld(true);
  const glass = scene.getObjectByName('glass_partition');
  const lounge = scene.getObjectByName('lounge');
  if (!glass || !lounge) { console.error('[corridor] glass partition or lounge missing'); return 1; }
  const gz = new THREE.Box3().setFromObject(glass, true).max.z;
  let bad = 0;
  for (const o of lounge.children) {
    const b = new THREE.Box3().setFromObject(o, true);
    if (b.min.z < gz - 0.01) {
      console.error(`[corridor] ${o.name} reaches into the aisle side of the glass (z ${(b.min.z * 1000).toFixed(0)} mm vs partition ${(gz * 1000).toFixed(0)} mm)`);
      bad += 1;
    }
  }
  return bad;
}

/** Ceiling fittings HANG from the ceiling — they do not float below it. */
export function verifyCeilingFittingsAreAttached(scene, ceilingY) {
  scene.updateMatrixWorld(true);
  let bad = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (!/^(pendant_cord|downlight|smoke_detector|cable_tray|purple_accent)/.test(o.name)) return;
    const b = new THREE.Box3().setFromObject(o, true);
    // Its top must reach the ceiling plane. A fitting whose highest point sits 200 mm below
    // the deck is hanging from nothing — the floating-part failure, one storey up.
    if (b.max.y < ceilingY - 0.20) {
      console.error(`[corridor] ${o.name} tops out at ${(b.max.y * 1000).toFixed(0)} mm, ${((ceilingY - b.max.y) * 1000).toFixed(0)} mm below the ceiling — it hangs from nothing`);
      bad += 1;
    }
  });
  return bad;
}

/** The corridor must actually enclose the aisle it is built around. */
export function verifyCorridorEnclosesTheAisle(scene) {
  scene.updateMatrixWorld(true);
  let bad = 0;
  const floor = scene.getObjectByName('floor');
  const ceiling = scene.getObjectByName('ceiling_deck');
  if (!floor || !ceiling) { console.error('[corridor] floor or ceiling missing'); return 1; }
  const fb = new THREE.Box3().setFromObject(floor, true);
  const cb = new THREE.Box3().setFromObject(ceiling, true);
  if (cb.min.y <= fb.max.y) { console.error('[corridor] the ceiling is not above the floor'); bad += 1; }

  // Every cabinet must stand ON the floor and UNDER the ceiling — the enclosure check that a
  // device's own suite can never make, because a device has no room around it.
  for (const cab of scene.children.flatMap((c) => (/^aisle_/.test(c.name) ? c.children : []))) {
    const b = new THREE.Box3().setFromObject(cab, true);
    if (b.min.y < fb.max.y - 0.01) { console.error(`[corridor] ${cab.name} sinks through the floor`); bad += 1; }
    if (b.max.y > cb.min.y) { console.error(`[corridor] ${cab.name} pushes through the ceiling`); bad += 1; }
    if (b.min.x < fb.min.x || b.max.x > fb.max.x) { console.error(`[corridor] ${cab.name} overhangs the floor`); bad += 1; }
  }
  const fig = scene.getObjectByName('human_figure');
  if (fig) {
    const b = new THREE.Box3().setFromObject(fig, true);
    if (Math.abs(b.min.y) > 0.02) { console.error(`[corridor] the figure does not stand on the floor (y ${(b.min.y * 1000).toFixed(0)} mm)`); bad += 1; }
    if (b.max.y > cb.min.y) { console.error('[corridor] the figure does not fit under the ceiling'); bad += 1; }
  }
  return bad;
}

// ---------------------------------------------------------------------------------------
// A MATERIAL IS NOT A PIXEL. Every check before this pass judged hex values, and a hex value
// says nothing about what reaches the screen: 0x18191c is a perfectly reasonable "black
// plastic" that rendered at rgb(1,1,2) — darker than the scene background, so the stool was
// SUBTRACTING from the image instead of appearing in it. Nothing caught it because nothing
// was looking at the far end of the pipeline.
//
// The curve below is r160's ACES in its RRT/ODT MATRIX form, transcribed from the vendored
// bundle rather than remembered — the widely-quoted Narkowicz fit is a DIFFERENT, brighter
// curve, and judging against it would let genuinely black surfaces pass.
const _ACES_IN  = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]];
const _ACES_OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
const _mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const _fit = (v) => v.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081));

const _srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const _hexLin = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((c) => _srgbToLin(c / 255));
const _norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

// Per-CHANNEL, not a luma scalar: a scalar models the rig as white, and this rig is not —
// the key is warm (0xfff6ec) and the fill and window light are both blue.
function rigIrradiance(n, env) {
  const out = [0, 0, 0];
  for (const d of Object.values(LIGHT_RIG.dirs)) {
    const L = _norm(d.pos);
    const ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    const c = _hexLin(d.color);
    for (let k = 0; k < 3; k += 1) out[k] += ndl * c[k] * d.intensity;
  }
  const w = 0.5 * n[1] + 0.5;
  const sky = _hexLin(LIGHT_RIG.hemi.sky), grd = _hexLin(LIGHT_RIG.hemi.ground);
  for (let k = 0; k < 3; k += 1) out[k] += (grd[k] + (sky[k] - grd[k]) * w) * LIGHT_RIG.hemi.intensity + env;
  return out;
}

function tonemappedChannels(colour, irr, emissive, emissiveIntensity, exposure = LIGHT_RIG.exposure) {
  // A NaN HERE WOULD MAKE EVERY GUARD PASS. This function once received the scalar env term
  // where the per-channel irradiance belongs; irr[k] came back undefined, every arithmetic
  // result was NaN, and `NaN < threshold` is FALSE — so the guard reported success on a
  // skyline with no silhouette at all. Comparisons cannot detect their own bad input, so the
  // check has to be here, where the value is still inspectable.
  if (!Array.isArray(irr) || irr.length !== 3 || !irr.every(Number.isFinite)) {
    throw new TypeError(`tonemappedLuma needs a 3-channel irradiance, got ${JSON.stringify(irr)}`);
  }
  const lin = [colour.r, colour.g, colour.b];
  const rad = lin.map((c, k) => (c * irr[k]) / Math.PI);
  if (emissive) {
    for (let k = 0; k < 3; k += 1) rad[k] += [emissive.r, emissive.g, emissive.b][k] * emissiveIntensity;
  }
  const mapped = _mul(_ACES_OUT, _fit(_mul(_ACES_IN, rad.map((x) => (x * exposure) / 0.6))))
    .map((x) => Math.min(1, Math.max(0, x)));
  const srgb = mapped.map((c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  return srgb.map((c) => c * 255);
}

// Luma collapses three channels into one, which is exactly the information a hue check needs.
const tonemappedPixel = (colour, irr, emissive, eInt) => tonemappedChannels(colour, irr, emissive, eInt);
function tonemappedLuma(colour, irr, emissive, eInt, exposure) {
  const p = tonemappedChannels(colour, irr, emissive, eInt, exposure);
  return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
}

// Swept, not a single point: the PMREM'd RoomEnvironment contribution is not analytic, so a
// value that only clears the floor at the bright end has not cleared it.
const _ENV_SWEEP = [0.15, 0.35, 0.60];
const N_FRONT = [0, 0, -1];
const NORMALS = [[0, 1, 0], [0, -1, 0], N_FRONT, [1, 0, 0], [-1, 0, 0]];
const FLOOR_LUMA = 12;     // below this a surface reads as a hole, not as a dark object

export function verifyNoSurfaceRendersAsAHole(mats) {
  let failed = 0;
  for (const [name, m] of Object.entries(mats)) {
    if (!m?.isMaterial || m.transparent) continue;   // glass is meant to disappear
    // The BEST-oriented normal, not the worst: any surface facing away from every lamp is dark
    // by geometry, and failing those would flag correct work. This guard is deliberately
    // conservative — it only fires when a surface cannot clear the floor even when well lit,
    // which is the case that is unambiguously a hole.
    // A COLOUR MAP MULTIPLIES THE MATERIAL COLOUR, so judging m.color alone reads a textured
    // surface as brighter than it renders. Each generator records what it does to the albedo.
    const tint = m.map?.userData?.meanFactor ?? 1;
    const shaded = m.color.clone().multiplyScalar(tint);
    const worst = Math.min(..._ENV_SWEEP.map((env) => Math.max(...NORMALS.map((n) =>
      tonemappedLuma(shaded, rigIrradiance(n, env), m.emissive, m.emissiveIntensity ?? 0)))));
    if (worst < FLOOR_LUMA) {
      console.error(`[corridor] "${name}" renders at luma ${worst.toFixed(1)} through the tone `
        + `curve (floor ${FLOOR_LUMA}) — it reads as a hole, not as a surface`);
      failed += 1;
    }
  }
  return failed;
}

// The silhouette only exists if the sky is BRIGHTER than the towers. Asserting the hex values
// differ would be vacuous — two different colours can tonemap to the same pixel, which is
// exactly what the three white ceiling materials do.
export function verifySkylineReadsAsSilhouette(mats) {
  let failed = 0;
  for (const env of _ENV_SWEEP) {
    const haze = tonemappedLuma(mats.sky_haze.color, rigIrradiance(N_FRONT, env),
                                mats.sky_haze.emissive, mats.sky_haze.emissiveIntensity);
    for (const t of ['tower_far', 'tower_near']) {
      const tower = tonemappedLuma(mats[t].color, rigIrradiance(N_FRONT, env), mats[t].emissive, mats[t].emissiveIntensity ?? 0);
      if (haze - tower < 8) {
        console.error(`[corridor] at env ${env} the haze (${haze.toFixed(0)}) does not stand `
          + `clear of ${t} (${tower.toFixed(0)}) — the skyline has no silhouette`);
        failed += 1;
      }
    }
  }
  return failed;
}

// Three luminaires that tonemap to the same white are one luminaire drawn three times. The
// pendant is the reason this exists: at 0xffd9a0 x2.0 it rendered rgb(243,236,221), which is
// not an amber lamp, and no hex-level check could have said so.
// SEPARATION, NOT SATURATION. The first version of this guard demanded every luminaire carry
// a strong tint, which is simply wrong: the lounge downlight IS warm-white and the ceiling
// panel IS near-neutral daylight, by design. Demanding they be colourful would have failed
// two correct materials to catch one wrong one — the criterion, not the design, was at fault.
//
// What actually went wrong with the pendant is that its amber DIED IN THE CURVE while the
// material stayed amber. So the property to assert is that the declared warm/cool identity
// SURVIVES to the pixel, and that the three lamps stay distinguishable from each other.
export function verifyLuminairesKeepTheirOwnHue(mats) {
  const warmth = (m) => {
    const px = tonemappedPixel(m.color, rigIrradiance([0, -1, 0], 0.35), m.emissive, m.emissiveIntensity ?? 0);
    return px[0] - px[2];        // red minus blue: positive is warm, negative is cool
  };
  // Zoned, because separation is only meaningful between lamps that appear TOGETHER. The
  // first version demanded all three differ, which would have failed the aisle ceiling panel
  // against a lounge downlight it is never seen beside — and both are warm in the reference.
  // Two luminaires in different rooms are allowed to be the same colour.
  const lamps = {
    ceiling_daylight: { sign: +1, label: 'sun-filtered ceiling panel', zone: 'aisle' },
    pendant_lamp_emissive: { sign: +1, label: 'amber pendant', min: 60, zone: 'lounge' },
    downlight: { sign: +1, label: 'warm-white downlight', zone: 'lounge' },
  };
  let failed = 0;
  const measured = {};
  for (const [name, want] of Object.entries(lamps)) {
    const w = warmth(mats[name]);
    measured[name] = w;
    if (Math.sign(w) !== want.sign && Math.abs(w) > 2) {
      console.error(`[corridor] "${name}" is meant to read as a ${want.label} but tonemaps `
        + `to warmth ${w.toFixed(0)} — the tint inverted in the curve`);
      failed += 1;
    }
    if (want.min != null && Math.abs(w) < want.min) {
      console.error(`[corridor] "${name}" tonemaps to warmth ${w.toFixed(0)}, below the ${want.min} `
        + 'its accent role needs — saturate the emissive and LOWER the intensity; raising it '
        + 'pushes all three channels into the top of the curve, where they converge to white');
      failed += 1;
    }
  }
  const names = Object.keys(lamps);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      if (lamps[names[i]].zone !== lamps[names[j]].zone) continue;
      const d = Math.abs(measured[names[i]] - measured[names[j]]);
      if (d < 25) {
        console.error(`[corridor] "${names[i]}" and "${names[j]}" share the ${lamps[names[i]].zone} `
          + `and tonemap only ${d.toFixed(0)} apart — they render as the same lamp drawn twice`);
        failed += 1;
      }
    }
  }
  return failed;
}

// THE RIG MUST AGREE WITH THE PRACTICALS IT SHARES A ROOM WITH. This is deliberately written
// as a relation between TWO PARTS OF THE SYSTEM — the hemisphere sky colour and the emissive
// of the ceiling panels — rather than against a constant I typed. A guard that checks work
// against a declared constant will defend that constant even after it turns out to be wrong,
// which is exactly what happened to verifyLuminairesKeepTheirOwnHue: it enforced a COOL
// ceiling panel that the reference photographs show as warm, and every green run confirmed my
// error back to me. A guard relating two parts of the model cannot go stale that way — change
// the panel and the requirement on the rig follows automatically.
export function verifyRigAgreesWithItsPracticals(mats) {
  const warmthOf = (c) => c.r - c.b;
  const panel = mats.ceiling_daylight;
  const panelWarmth = warmthOf(panel.emissive) * (panel.emissiveIntensity ?? 1);
  const skyWarmth = warmthOf(new THREE.Color(LIGHT_RIG.hemi.sky));
  let failed = 0;
  if (Math.abs(panelWarmth) > 0.02 && Math.sign(skyWarmth) !== Math.sign(panelWarmth)) {
    console.error('[corridor] the ceiling panels are '
      + `${panelWarmth > 0 ? 'warm' : 'cool'} but the hemisphere sky is `
      + `${skyWarmth > 0 ? 'warm' : 'cool'} — a surface facing up at those panels would be lit `
      + 'by a ceiling that is not the one in the room');
    failed += 1;
  }
  // Same argument downward: the bounce colour has to come from the floor that is actually there.
  const floorWarmth = warmthOf(mats.floor_wood_tile.color);
  const groundWarmth = warmthOf(new THREE.Color(LIGHT_RIG.hemi.ground));
  if (Math.abs(floorWarmth) > 0.02 && Math.sign(groundWarmth) !== Math.sign(floorWarmth)) {
    console.error('[corridor] the floor is '
      + `${floorWarmth > 0 ? 'warm' : 'cool'} but the hemisphere ground bounce is `
      + `${groundWarmth > 0 ? 'warm' : 'cool'} — downward faces are lit by a floor that is not there`);
    failed += 1;
  }
  return failed;
}
