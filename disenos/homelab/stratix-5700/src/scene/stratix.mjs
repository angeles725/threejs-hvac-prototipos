// stratix.mjs — Allen-Bradley Stratix 5700 (1783-BMS10CGP) · P4a BLOCKOUT (massing).
//
// SCALE: 1 voxel = 0.01 m  (blockout_scale; 1 unit = 1 m)
//
// Massing only: silhouette + proportions + named parts. But the five critical features
// must already read, because each one gates this pass alone:
//   1. din-rail-body        — compact box, NO rack ears, spring latch on the REAR wall
//   2. port-block-10        — 5 cols x 2 rows of RECESSED jacks with keyways
//   3. diagnostic-led-column— six named system LEDs down the LEFT of the face
//   4. top-terminal-blocks  — screw terminals standing proud of the TOP face
//   5. allen-bradley-livery — charcoal body, red logo block, product silkscreen
//
// There is no CSG on this track, so a recess cannot be subtracted — it is built as walls
// around an empty middle. A solid plate with dark decals would satisfy a pixel count and
// fail the feature.
//
// Every part landing on a face of the housing is SEATED into it rather than placed on the
// plane. Coincident faces z-fight, and vertex positions are Float32Array, so two planes
// equal in float64 land microns apart once stored — enough for a bbox overlap test to
// call a seated part "floating".

import * as THREE from 'three';
import {
  D, HALF_W, HALF_H, HALF_D, FRONT_Z, REAR_Z, TOP_Y,
  PORT_ZONE, MID_ZONE, LIVERY_ZONE, verifyDims,
} from './dims.mjs';
import { createMaterials, setLedState } from './materials.mjs';
import { makeLivery, makeLedLabels } from './decals.mjs';

const SEAT = 0.0005;

// ── Geometry cache ───────────────────────────────────────────────────────────
// Built in from the start rather than retrofitted: shapes repeat heavily here (six
// identical LED lenses, ten identical jack throats, three terminal blocks) and geometry
// is immutable once constructed, so sharing is free.
const _geo = new Map();
const cached = (k, make) => { let g = _geo.get(k); if (!g) { g = make(); _geo.set(k, g); } return g; };
const box = (w, h, d) => cached(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (r, h, s) => cached(`c:${r}:${h}:${s}`, () => new THREE.CylinderGeometry(r, r, h, s));
export const geometryCacheSize = () => _geo.size;

// ── Port block layout (derived — see dims.mjs) ───────────────────────────────
const BLOCK_W = D.portCols * D.portColPitch;         // 0.080
const BLOCK_H = D.portRows * D.portRowPitch;         // 0.030
const BLOCK_X0 = -BLOCK_W / 2;
const BLOCK_Y_MID = (PORT_ZONE.y0 + PORT_ZONE.y1) / 2;
const BLOCK_Y0 = BLOCK_Y_MID - BLOCK_H / 2;
const APERTURE_W = 0.0135;
const APERTURE_H = 0.0110;
const WALL_X = D.portColPitch - APERTURE_W;          // 0.0025
const WALL_Y = D.portRowPitch - APERTURE_H;          // 0.0040
const CAVITY_DEPTH = 0.0045;                          // jack throat depth

// P5a STRUCTURAL — Z-FIGHT FIX. The module faces used to sit EXACTLY flush with the
// housing front at z = FRONT_Z. Two visible surfaces at identical depth over 2805 mm2 is
// textbook z-fighting, and Float32 vertex storage means neither wins consistently — it
// shimmers as the camera moves. A ganged connector bezel genuinely stands a little proud
// of the panel it is fitted through, so the physical answer and the rendering answer
// agree: push the block out rather than nudge one surface by an arbitrary epsilon.
const BLOCK_PROUD = 0.0006;
const BLOCK_FRONT_Z = FRONT_Z + BLOCK_PROUD;
const CAVITY_FLOOR_Z = BLOCK_FRONT_Z - CAVITY_DEPTH;
// The shield sat with its BACK plane exactly on the cavity floor — the same coincidence
// one layer down, hidden inside the throat. Given its own standoff.
const SHIELD_GAP = 0.0004;

const colX = (i) => BLOCK_X0 + (i + 0.5) * D.portColPitch;
const rowY = (j) => BLOCK_Y0 + (j + 0.5) * D.portRowPitch;

// ── System LED column ────────────────────────────────────────────────────────
// Names and order from the user manual's state table [CERT-a].
export const SYSTEM_LEDS = ['EIP Mod', 'EIP Net', 'Setup', 'DC_A', 'DC_B', 'Alarm Out'];
const LED_COL_X = -HALF_W + 0.008;
const LED_MID_Y = (MID_ZONE.y0 + MID_ZONE.y1) / 2;
const ledY = (i) => LED_MID_Y + (i - (SYSTEM_LEDS.length - 1) / 2) * D.ledPitch;

// ── Top terminal blocks ──────────────────────────────────────────────────────
// Dual DC inputs plus a six-pin alarm relay [CERT-a]. Widths follow the pin counts.
const TERMINALS = [
  { name: 'pwr_a', x: -0.031, w: 0.020, pins: 3 },
  { name: 'pwr_b', x: -0.008, w: 0.020, pins: 3 },
  { name: 'alarm', x:  0.022, w: 0.030, pins: 6 },
];
const TERM_H = 0.010;
const TERM_D = 0.014;
const TERM_Z = 0.020;

/**
 * Build the switch and add it to the scene.
 * @param {THREE.Scene} scene
 */
export function buildStratix(scene) {
  const dimsOk = verifyDims();
  const m = createMaterials();

  const root = new THREE.Group();
  root.name = 'stratix_root';

  root.add(buildHousing(m));
  root.add(buildPortBlock(m));
  root.add(buildPortLeds(m));
  root.add(buildSystemLedBank(m));
  root.add(buildExpressSetup(m));
  root.add(buildSdSlot(m));
  root.add(buildTopTerminals(m));
  root.add(buildDinClip(m));
  root.add(buildFrontLivery(m));

  const rail = buildDinRailProp(m);
  root.add(rail);

  scene.add(root);

  const attachOk = verifyAttachments(root);
  const planesOk = verifyNoCoincidentPlanes(root);
  const wrapOk = verifyNoWrapAroundTextures(root);
  if (dimsOk && attachOk && planesOk && wrapOk) console.log('[stratix] built · guards passed');

  return {
    root,
    materials: m,
    setLeds: (on) => setLedState(m, on),
    setRail: (on) => { rail.visible = on; },
    built: true,
  };
}


/**
 * A textured slab whose artwork appears ONLY on its front face.
 *
 * A BoxGeometry has six material groups, and a single mapped material paints the artwork
 * onto ALL of them — including the 0.8 mm side edges, where it shows up as a smeared
 * sliver of whatever happened to fall there. That is what put a thin red thread beside
 * the livery in the hero capture: the only red anywhere in this model lives inside the
 * livery canvas, so a red artefact could only ever have been the texture bleeding onto an
 * edge. Group order is px, nx, py, ny, pz, nz — index 4 is the front.
 *
 * The edges take the HOUSING material rather than the label's own, because this livery is
 * silkscreen printed on the panel: it has no label stock to show a cut edge.
 */
function texturedSlab(w, h, d, artMat, edgeMat, name) {
  const faces = [edgeMat, edgeMat, edgeMat, edgeMat, artMat, edgeMat];
  const mesh = new THREE.Mesh(box(w, h, d), faces);
  mesh.name = name;
  return mesh;
}

// ── housing ──────────────────────────────────────────────────────────────────
function buildHousing(m) {
  const g = new THREE.Group();
  g.name = 'housing';

  const body = new THREE.Mesh(box(D.width, D.height, D.depth), m.housing);
  body.name = 'housing_body';
  g.add(body);

  // Vent slots on both flanks — an IP30 open-style enclosure is louvred, and the slots
  // also break up two large flat faces that would otherwise read as a featureless brick.
  const SLOTS = 7;
  const slotW = 0.0012;
  const slotH = 0.040;
  const vents = new THREE.InstancedMesh(box(slotW, slotH, 1), m.portCavity, SLOTS * 2);
  vents.name = 'housing_vents';
  const mx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  let k = 0;
  for (const sign of [-1, 1]) {
    for (let i = 0; i < SLOTS; i++) {
      const z = -0.045 + i * 0.013;
      // Sunk into the flank so the slot is a real depression, not a stripe on the surface.
      scl.set(1, 1, 0.0016);
      pos.set(sign * (HALF_W - 0.0008), 0.010, z);
      mx.compose(pos, q, scl);
      vents.setMatrixAt(k++, mx);
    }
  }
  vents.instanceMatrix.needsUpdate = true;
  g.add(vents);

  // LOUVRE BLADES (P5a surface). The recesses above are real depressions, but a louvre is
  // not a slot — it is a slot with an ANGLED BLADE over it, which is what throws the
  // characteristic hard shadow line down a vented flank. Deferred from structural on the
  // grounds that it is surface relief; delivered here.
  const blades = new THREE.InstancedMesh(box(0.0026, slotH, 0.0008), m.housing, SLOTS * 2);
  blades.name = 'housing_louvre_blades';
  const e = new THREE.Euler();
  let b = 0;
  for (const sign of [-1, 1]) {
    for (let i = 0; i < SLOTS; i++) {
      const z = -0.045 + i * 0.013;
      // Tilted about the vertical axis so the blade overhangs its slot; the sign flip
      // keeps both flanks angled the same way relative to their own outward normal
      // rather than mirroring into a chevron.
      //
      // FORMED INWARD. The first version stood the blade 1.7 mm PROUD of the flank and
      // the no-rack-ears guard fired — rightly, and it also had the physics backwards: a
      // stamped louvre is pressed OUT OF the panel, so the blade lives inside the opening
      // and nothing projects past the enclosure. It still breaks the light exactly the
      // same way, because the shadow comes from the tilt, not from sticking out.
      e.set(0, sign * -0.55, 0);
      q.setFromEuler(e);
      scl.set(1, 1, 1);
      pos.set(sign * (HALF_W - 0.0016), 0.010, z + 0.0016);
      mx.compose(pos, q, scl);
      blades.setMatrixAt(b++, mx);
    }
  }
  blades.instanceMatrix.needsUpdate = true;
  g.add(blades);

  return g;
}

// ── port_block — 10 recessed jacks, 5 cols x 2 rows ──────────────────────────
function buildPortBlock(m) {
  const g = new THREE.Group();
  g.name = 'port_block';

  // Back plate: the dark floor every jack throat bottoms out on. Seated into the housing.
  const backD = 0.0030;
  const back = new THREE.Mesh(box(BLOCK_W, BLOCK_H, backD), m.portCavity);
  back.name = 'port_back_plate';
  back.position.set(0, BLOCK_Y_MID, CAVITY_FLOOR_Z - backD / 2 + SEAT);
  g.add(back);

  // The grid of module walls IS the recess: build them around empty middles rather than
  // subtracting holes from a plate.
  const mx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  const vCount = D.portCols + 1;
  const hCount = D.portRows + 1;
  const walls = new THREE.InstancedMesh(box(1, 1, 1), m.portHousing, vCount + hCount);
  walls.name = 'port_module_walls';
  let w = 0;
  for (let i = 0; i < vCount; i++) {
    scl.set(WALL_X, BLOCK_H, CAVITY_DEPTH);
    pos.set(BLOCK_X0 + i * D.portColPitch, BLOCK_Y_MID, CAVITY_FLOOR_Z + CAVITY_DEPTH / 2);
    mx.compose(pos, q, scl);
    walls.setMatrixAt(w++, mx);
  }
  for (let j = 0; j < hCount; j++) {
    scl.set(BLOCK_W, WALL_Y, CAVITY_DEPTH);
    pos.set(0, BLOCK_Y0 + j * D.portRowPitch, CAVITY_FLOOR_Z + CAVITY_DEPTH / 2);
    mx.compose(pos, q, scl);
    walls.setMatrixAt(w++, mx);
  }
  walls.instanceMatrix.needsUpdate = true;
  g.add(walls);

  // Shield liner at the bottom of each throat — the jack's plated cage, and the reason
  // port_shield is a rendered material rather than a declared-but-unused one.
  const n = D.portCols * D.portRows;
  const shields = new THREE.InstancedMesh(
    box(APERTURE_W - 0.001, APERTURE_H - 0.001, 0.0012), m.portShield, n,
  );
  shields.name = 'port_shields';
  // KEYWAY: the tab slot below each jack. This is the cue that says RJ45 rather than
  // "square hole" — a lazy model omits it and the block reads as a grid of pockets.
  //
  // ONLY the RJ45 columns get one. The fifth column is the pair of combo RJ45/SFP ports,
  // and the critical feature names that distinction explicitly ("eight RJ45 in the left
  // four columns and two combo RJ45/SFP in the fifth"). Until now column 5 was
  // pixel-identical to the other four, so the block satisfied the COUNT and the RECESS
  // while saying nothing about the mix — a feature half-met is still a feature unmet.
  const rj45Count = (D.portCols - 1) * D.portRows;      // 8
  const sfpCount = D.portRows;                          // 2
  const keys = new THREE.InstancedMesh(box(0.0040, 0.0022, 0.0016), m.portCavity, rj45Count);
  keys.name = 'port_keyways';

  // An SFP cage is a metal sleeve: a wider, FLATTER opening with a plated collar visible
  // at its mouth, and no tab slot at all. Those three differences are what separate it
  // from an RJ45 at a glance.
  // P5a SURFACE. The rim was 0.9 mm and read WEAK in the port-detail capture despite a
  // 39x luma separation from the module plastic — a thin rim occludes itself at an
  // oblique angle, so the assignment was right and the PROMINENCE was wrong. Widened to
  // a real SLEEVE, which is also what an SFP cage physically is: a plated metal tube
  // lining the whole opening, not a picture frame around it. The physical answer and the
  // legibility answer agree again.
  const SFP_W = 0.0118;
  const SFP_H = 0.0076;
  const BAR = 0.0022;
  const cages = new THREE.InstancedMesh(box(1, 1, 1), m.portShield, sfpCount * 4);
  cages.name = 'sfp_cages';
  const slots = new THREE.InstancedMesh(box(SFP_W - 2 * BAR, SFP_H - 2 * BAR, 0.0014), m.portCavity, sfpCount);
  slots.name = 'sfp_slots';

  let p = 0;
  let kk = 0;
  let cc = 0;
  let ss = 0;
  const sfpCol = D.portCols - 1;
  for (let j = 0; j < D.portRows; j++) {
    for (let i = 0; i < D.portCols; i++) {
      const x = colX(i);
      const y = rowY(j);
      mx.makeTranslation(x, y, CAVITY_FLOOR_Z + SHIELD_GAP + 0.0006);
      shields.setMatrixAt(p, mx);
      p++;

      if (i !== sfpCol) {
        mx.makeTranslation(x, y - APERTURE_H / 2 + 0.0011, CAVITY_FLOOR_Z + SHIELD_GAP + 0.0026);
        keys.setMatrixAt(kk++, mx);
        continue;
      }

      // collar: four bars framing the opening, standing at the mouth of the pocket
      // A sleeve has depth: it runs from the throat floor out to the module face instead
      // of sitting as a flat ring at one z.
      const sleeveD = 0.0034;
      const zc = CAVITY_FLOOR_Z + SHIELD_GAP + sleeveD / 2;
      const bars = [
        [SFP_W, BAR, 0, SFP_H / 2 - BAR / 2],
        [SFP_W, BAR, 0, -(SFP_H / 2 - BAR / 2)],
        [BAR, SFP_H - 2 * BAR, -(SFP_W / 2 - BAR / 2), 0],
        [BAR, SFP_H - 2 * BAR, SFP_W / 2 - BAR / 2, 0],
      ];
      for (const [sx, sy, dx, dy] of bars) {
        scl.set(sx, sy, sleeveD);
        pos.set(x + dx, y + dy, zc);
        mx.compose(pos, q, scl);
        cages.setMatrixAt(cc++, mx);
      }
      mx.makeTranslation(x, y, CAVITY_FLOOR_Z + SHIELD_GAP + 0.0014);
      slots.setMatrixAt(ss++, mx);
    }
  }
  shields.instanceMatrix.needsUpdate = true;
  keys.instanceMatrix.needsUpdate = true;
  cages.instanceMatrix.needsUpdate = true;
  slots.instanceMatrix.needsUpdate = true;
  g.add(shields, keys, cages, slots);

  return g;
}

// ── port_leds — per-port link/activity, in the strip above the block ─────────
function buildPortLeds(m) {
  const g = new THREE.Group();
  g.name = 'port_leds';

  const n = D.portCols * D.portRows;               // one per jack
  const y = BLOCK_Y0 + BLOCK_H + 0.0025;           // in the gap above the module block

  // NOT ALL GREEN. The manual documents per-port LEDs in green AND amber (amber = the
  // port is disabled or faulted), and the spec declares an led_amber material on that
  // evidence — but every lens was wired to green, so the model could not reach a state
  // its own contract declared. A managed switch with every port in an identical state is
  // also the less honest picture: two of ten sit amber here, which shows the board
  // carries more than one condition at once.
  //
  // This is an ILLUSTRATIVE state, not a measurement: it makes no claim about which ports
  // are disabled on any real unit, in the same way the display shows structure without
  // fabricating numbers.
  const AMBER_PORTS = new Set([3, 6]);
  const lensGeo = box(0.0025, 0.0018, 0.0010);
  const green = new THREE.InstancedMesh(lensGeo, m.ledGreen, n - AMBER_PORTS.size);
  green.name = 'port_led_lenses_link';
  const amber = new THREE.InstancedMesh(lensGeo, m.ledAmber, AMBER_PORTS.size);
  amber.name = 'port_led_lenses_alert';

  const mx = new THREE.Matrix4();
  let k = 0;
  let gi = 0;
  let ai = 0;
  for (let i = 0; i < D.portCols; i++) {
    for (let s = 0; s < D.portRows; s++) {
      // two lenses per column, one for each jack in that ganged module
      const x = colX(i) + (s === 0 ? -0.0038 : 0.0038);
      mx.makeTranslation(x, y, FRONT_Z - 0.0004);
      if (AMBER_PORTS.has(k)) amber.setMatrixAt(ai++, mx);
      else green.setMatrixAt(gi++, mx);
      k++;
    }
  }
  green.instanceMatrix.needsUpdate = true;
  amber.instanceMatrix.needsUpdate = true;
  g.add(green, amber);

  return g;
}

// ── system_led_bank — six named diagnostic LEDs down the LEFT edge ───────────
function buildSystemLedBank(m) {
  const g = new THREE.Group();
  g.name = 'system_led_bank';

  // Colour assignment follows the manual's state table: the two EtherNet/IP/module LEDs
  // and the alarm can go red; the power and setup indicators are green-only.
  const RED_CAPABLE = new Set([0, 1, 5]);           // EIP Mod, EIP Net, Alarm Out
  SYSTEM_LEDS.forEach((name, i) => {
    const mat = RED_CAPABLE.has(i) ? m.ledRed : m.ledGreen;
    const lens = new THREE.Mesh(box(0.0030, 0.0025, 0.0010), mat);
    lens.name = `sys_led_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    lens.position.set(LED_COL_X, ledY(i), FRONT_Z - 0.0004);
    g.add(lens);

  });

  // ONE textured strip for all six labels rather than six blank plates. Printing them as
  // a single canvas aligned to the lens pitch means a label cannot drift off its lamp:
  // the strip spans exactly the lens column, so row i is over lens i by construction.
  // Names are the manual's own state-table labels [CERT-a].
  const { texture, layout } = makeLedLabels(SYSTEM_LEDS);
  if (!m._ledLabelMat) {
    const mat = m.liveryPrint.clone();
    mat.name = m.liveryPrint.name;
    mat.transparent = true;
    mat.depthWrite = false;
    if (texture) mat.map = texture;
    m._ledLabelMat = mat;
  }
  const stripH = SYSTEM_LEDS.length * D.ledPitch;
  const stripW = stripH * (layout.w / layout.h);
  const strip = texturedSlab(stripW, stripH, 0.0008, m._ledLabelMat, m.housing, 'sys_led_label_strip');
  strip.position.set(LED_COL_X + 0.0040 + stripW / 2, ledY(2.5), FRONT_Z);
  g.add(strip);

  return g;
}

// ── express_setup — recessed push-button ─────────────────────────────────────
function buildExpressSetup(m) {
  const g = new THREE.Group();
  g.name = 'express_setup';

  const wellD = 0.0050;
  const well = new THREE.Mesh(cyl(0.0042, wellD, 16), m.portCavity);
  well.name = 'setup_well';
  well.rotation.x = Math.PI / 2;
  well.position.set(0.028, 0.008, FRONT_Z - wellD / 2 + SEAT);
  g.add(well);

  // The button head stops BELOW the face plane — that is what "recessed" means, and the
  // important_feature is written to reject a printed dot.
  const head = new THREE.Mesh(cyl(0.0028, 0.0020, 16), m.portHousing);
  head.name = 'setup_button';
  head.rotation.x = Math.PI / 2;
  head.position.set(0.028, 0.008, FRONT_Z - 0.0028);
  g.add(head);

  return g;
}

// ── sd_slot — front-face aperture (POSITION IS A PHOTO APPROXIMATION) ────────
function buildSdSlot(m) {
  const g = new THREE.Group();
  g.name = 'sd_slot';

  const throatD = 0.0040;
  const throat = new THREE.Mesh(box(0.0250, 0.0035, throatD), m.portCavity);
  throat.name = 'sd_throat';
  throat.position.set(0.028, -0.012, FRONT_Z - throatD / 2 + SEAT);
  g.add(throat);

  // Recessed 0.5 mm rather than flush: its front face was coplanar with the housing.
  const lip = new THREE.Mesh(box(0.0290, 0.0016, 0.0012), m.portHousing);
  lip.name = 'sd_lip';
  lip.position.set(0.028, -0.012 - 0.0026, FRONT_Z - 0.0011);
  g.add(lip);

  return g;
}

// ── top_terminals — screw blocks standing proud of the TOP face ──────────────
function buildTopTerminals(m) {
  const g = new THREE.Group();
  g.name = 'top_terminals';

  const mx = new THREE.Matrix4();
  const screwGeo = cyl(0.0016, 0.0016, 10);
  const totalPins = TERMINALS.reduce((a, t) => a + t.pins, 0);
  const screws = new THREE.InstancedMesh(screwGeo, m.terminalScrew, totalPins);
  screws.name = 'terminal_screws';
  let s = 0;

  for (const t of TERMINALS) {
    const blk = new THREE.Mesh(box(t.w, TERM_H + SEAT, TERM_D), m.terminalBlock);
    blk.name = `terminal_${t.name}`;
    // Seated INTO the top face; the block stands TERM_H proud of it.
    blk.position.set(t.x, TOP_Y + TERM_H / 2 - SEAT / 2, TERM_Z);
    g.add(blk);

    const pitch = t.w / t.pins;
    for (let i = 0; i < t.pins; i++) {
      mx.makeTranslation(
        t.x - t.w / 2 + (i + 0.5) * pitch,
        TOP_Y + TERM_H - 0.0004,
        TERM_Z,
      );
      screws.setMatrixAt(s++, mx);
    }
  }
  screws.instanceMatrix.needsUpdate = true;
  g.add(screws);

  return g;
}

// ── din_clip — spring latch on the REAR wall (P5a STRUCTURAL sculpt) ────────
//
// The blockout proved the clip EXISTED — a bracket plus two boxes reaching behind the
// rear wall. It did not read as a latch, because a latch is not a protruding tab: it is
// a fixed hook that catches the rail's upper lip and a LEAF SPRING that snaps over the
// lower one, with a pull tab you put a screwdriver into.
//
// Both are extruded PROFILES rather than boxes. Axis convention matters and has bitten
// this project before: ExtrudeGeometry runs along local +Z, and rotation.y = PI/2 maps
// local (x,y,z) -> world (z, y, -x). So a profile authored in local XY becomes world
// (-z, y) — local +x reads as "further behind the rear wall", which is exactly the
// direction these parts grow. The build asserts the resulting bbox is wider in X than
// in Z, so a silently mis-rotated extrusion cannot pass.
function buildDinClip(m) {
  const g = new THREE.Group();
  g.name = 'din_clip';

  const CLIP_W = 0.026;
  const RAIL_MID_Y = 0.004;                       // the 35 mm rail span is centred here
  const RAIL_TOP = RAIL_MID_Y + D.dinClipH / 2;   // 0.0215
  const RAIL_BOT = RAIL_MID_Y - D.dinClipH / 2;   // -0.0135

  /** Extrude a closed profile along world X and park it behind the rear wall. */
  const extrude = (pts, name, mat, width = CLIP_W) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.translate(0, 0, -width / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.rotation.y = Math.PI / 2;                // local +z -> world +x (the extrusion axis)
    mesh.position.z = REAR_Z + 0.0020;            // seats 2 mm INTO the rear wall
    return mesh;
  };

  // Backing plate the whole assembly is riveted to — the only flat part left.
  const plate = new THREE.Mesh(box(CLIP_W + 0.006, D.dinClipH + 0.004, 0.0035), m.dinClip);
  plate.name = 'din_backplate';
  plate.position.set(0, RAIL_MID_Y, REAR_Z + 0.0010);
  g.add(plate);

  // FIXED HOOK, upper: goes back, drops down over the rail lip, then returns forward.
  // The return is what makes it a hook instead of a shelf.
  g.add(extrude([
    [0.0000, RAIL_TOP + 0.0020],
    [0.0080, RAIL_TOP + 0.0020],
    [0.0080, RAIL_TOP - 0.0060],
    [0.0056, RAIL_TOP - 0.0060],
    [0.0056, RAIL_TOP - 0.0022],
    [0.0000, RAIL_TOP - 0.0022],
  ], 'din_hook_upper', m.dinClip));

  // LEAF SPRING, lower: a thin blade that sweeps back and down, curls forward into the
  // catch that grips the lower lip, then continues into the pull tab. Authored as a
  // spine with a constant 1.2 mm thickness so it reads as sheet metal, not a wedge.
  const SPINE = [
    [0.0000, RAIL_BOT + 0.0040],
    [0.0062, RAIL_BOT - 0.0035],
    [0.0088, RAIL_BOT - 0.0110],
    [0.0050, RAIL_BOT - 0.0165],
    [0.0058, RAIL_BOT - 0.0250],
  ];
  const T = 0.0012;
  const outer = [];
  const inner = [];
  for (let i = 0; i < SPINE.length; i++) {
    const [x, y] = SPINE[i];
    const [px, py] = SPINE[Math.max(0, i - 1)];
    const [nx, ny] = SPINE[Math.min(SPINE.length - 1, i + 1)];
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    // normal to the spine, so the blade keeps its thickness through the curl
    outer.push([x + dy * T / 2, y - dx * T / 2]);
    inner.push([x - dy * T / 2, y + dx * T / 2]);
  }
  g.add(extrude([...outer, ...inner.reverse()], 'din_leaf_spring', m.dinClip, CLIP_W - 0.004));

  // Pull tab: the flattened end a screwdriver levers against.
  const tab = new THREE.Mesh(box(CLIP_W - 0.004, 0.0060, 0.0022), m.dinClip);
  tab.name = 'din_pull_tab';
  tab.position.set(0, RAIL_BOT - 0.0272, REAR_Z - 0.0058);
  g.add(tab);

  return g;
}

// ── front_livery — AB logo block + product silkscreen plate ──────────────────
function buildFrontLivery(m) {
  const g = new THREE.Group();
  g.name = 'front_livery';

  const midY = (LIVERY_ZONE.y0 + LIVERY_ZONE.y1) / 2;

  // One textured plate replaces the three placeholder mass blocks: the red Allen-Bradley
  // block, the Stratix 5700 product name and the catalogue number now READ instead of
  // standing in. Aspect is taken from the canvas so nothing is stretched.
  const { texture, layout } = makeLivery();
  if (!m._liveryMat) {
    const mat = m.liveryPrint.clone();
    mat.name = m.liveryPrint.name;
    mat.transparent = true;
    mat.depthWrite = false;
    if (texture) mat.map = texture;
    m._liveryMat = mat;
  }
  // A THIN BOX, not a Plane. A zero-thickness plane placed 0.3 mm off the face is not
  // attached to anything — the attachment guard caught it floating, correctly. A printed
  // label does have a hair of thickness, so an 0.8 mm slab straddling the face satisfies
  // both guards at once: it OVERLAPS the housing (no floating part) and its front sits
  // 0.4 mm proud (no coincident plane).
  const PW = 0.070;
  const PH = PW * (layout.h / layout.w);
  const plate = texturedSlab(PW, PH, 0.0008, m._liveryMat, m.housing, 'livery_plate');
  plate.position.set(-0.006, midY + 0.004, FRONT_Z);
  g.add(plate);

  return g;
}

// ── din_rail_prop — EN 50022 top-hat, CONTEXT ONLY, default off ──────────────
function buildDinRailProp(m) {
  const g = new THREE.Group();
  g.name = 'din_rail_prop';
  g.visible = false;   // not part of the product; ?rail=on shows it

  // EN 50022: 35 mm across the hat, 7.5 mm deep, ~1 mm steel. Published standard, so the
  // profile is sourced even though the prop itself is scenery.
  const L = 0.26;
  const T = 0.0010;
  const railZ = REAR_Z - 0.0075;

  const face = new THREE.Mesh(box(L, 0.0350, T), m.railSteel);
  face.name = 'rail_face';
  face.position.set(0, 0.004, railZ);
  g.add(face);

  for (const sign of [-1, 1]) {
    const web = new THREE.Mesh(box(L, T, 0.0075), m.railSteel);
    web.name = sign < 0 ? 'rail_web_lower' : 'rail_web_upper';
    web.position.set(0, 0.004 + sign * (0.0350 / 2 - T / 2), railZ + 0.0075 / 2);
    g.add(web);

    const lip = new THREE.Mesh(box(L, 0.0060, T), m.railSteel);
    lip.name = sign < 0 ? 'rail_lip_lower' : 'rail_lip_upper';
    lip.position.set(0, 0.004 + sign * (0.0350 / 2 - 0.0030), railZ + 0.0075);
    g.add(lip);
  }

  return g;
}


/**
 * Z-FIGHT GUARD. Overlapping VOLUMES are fine and often required — seated parts are meant
 * to interpenetrate. What fights is two VISIBLE surfaces at the same depth over the same
 * footprint: neither wins consistently, because vertex positions are Float32 and the
 * winner flips as the camera moves.
 *
 * This exists because the blockout shipped exactly that: the port module faces sat flush
 * with the housing front over 2805 mm2, and it read as shimmer in two capture states. A
 * human noticing shimmer in a render is a slow and unreliable detector; this is a fast
 * and certain one, so it runs on every build.
 */
function verifyNoCoincidentPlanes(root, tol = 0.00002) {
  // OCCUPANCY, not object bounds. An InstancedMesh's bbox is the hull of every instance,
  // so two interleaved instanced parts — the green and amber halves of one LED row — look
  // like they share a footprint when their individual lenses never touch. Comparing hulls
  // reported that as a z-fight and would have pushed a correct model into a fake fix.
  // Expand each instanced object into its per-instance boxes and compare THOSE.
  const boxes = [];
  const m4 = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        const b = o.geometry.boundingBox.clone().applyMatrix4(m4).applyMatrix4(o.matrixWorld);
        boxes.push({ name: `${o.name}[${i}]`, owner: o.name, mat: o.material, box: b });
      }
    } else {
      boxes.push({ name: o.name, owner: o.name, mat: o.material, box: new THREE.Box3().setFromObject(o, true) });
    }
  });

  const problems = [];
  const seen = new Set();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i].box;
      const B = boxes[j].box;
      const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x);
      const oy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
      if (ox <= 0.0005 || oy <= 0.0005) continue;   // no shared footprint worth fighting over
      // SAME MATERIAL CANNOT SHIMMER. Z-fighting is only visible when the two surfaces
      // differ in appearance; whichever of two identical +z faces wins the depth test,
      // the pixel is the same. The grid walls of one module block cross each other by
      // construction, and flagging that would be noise that trains people to ignore the
      // guard — which is worse than not having it.
      if (boxes[i].mat === boxes[j].mat) continue;
      for (const [face, av, bv] of [['FRONT', A.max.z, B.max.z], ['REAR', A.min.z, B.min.z]]) {
        if (Math.abs(av - bv) >= tol) continue;
        // Report once per owner pair per face; a 10-instance clash is one defect, not ten.
        const key = `${boxes[i].owner}|${boxes[j].owner}|${face}`;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push(`${boxes[i].name} / ${boxes[j].name} share a ${face} plane at z=${av.toFixed(5)} over ${(ox * oy * 1e6).toFixed(0)} mm2`);
      }
    }
  }

  if (problems.length) {
    console.error('[stratix] Z-FIGHT RISK:', problems.join(' · '));
    return false;
  }
  return true;
}


/**
 * A mapped material on a whole BoxGeometry paints its artwork onto all six faces. That is
 * almost never intended and it produced a visible artefact in a delivered hero capture, so
 * it is checked rather than remembered.
 */
function verifyNoWrapAroundTextures(root) {
  const problems = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (!o.material.map) return;
    const groups = o.geometry.groups?.length ?? 0;
    if (groups > 1) {
      problems.push(`${o.name}: one mapped material across ${groups} geometry groups — the artwork wraps onto every face, edges included`);
    }
  });
  if (problems.length) {
    console.error('[stratix] TEXTURE WRAP:', problems.join(' · '));
    return false;
  }
  return true;
}

// ── Build-time guards ────────────────────────────────────────────────────────
// console.error, NOT console.assert — assert is invisible to the QA gate and would let
// floating geometry through at exit 0.
function verifyAttachments(root) {
  const problems = [];
  const bodyBox = new THREE.Box3().setFromObject(root.getObjectByName('housing_body'), true);
  const MIN_OVERLAP = 0.0001;

  // Measured regardless of visibility, so a default-off part cannot hide a defect. The
  // rail prop is excluded ON PURPOSE: it is scenery and is meant NOT to touch the body.
  for (const name of ['port_block', 'port_leds', 'system_led_bank', 'express_setup',
                      'sd_slot', 'top_terminals', 'din_clip', 'front_livery']) {
    const node = root.getObjectByName(name);
    if (!node) { problems.push(`${name}: node missing`); continue; }
    const b = new THREE.Box3().setFromObject(node, true);
    if (b.isEmpty()) { problems.push(`${name}: empty geometry`); continue; }
    const ov = [
      Math.min(bodyBox.max.x, b.max.x) - Math.max(bodyBox.min.x, b.min.x),
      Math.min(bodyBox.max.y, b.max.y) - Math.max(bodyBox.min.y, b.min.y),
      Math.min(bodyBox.max.z, b.max.z) - Math.max(bodyBox.min.z, b.min.z),
    ];
    if (Math.min(...ov) < MIN_OVERLAP) {
      problems.push(`${name}: NOT SEATED — overlap [${ov.map((v) => (v * 1000).toFixed(2)).join(', ')}] mm`);
    }
  }

  // EXTRUSION AXIS. ExtrudeGeometry runs along local +Z and the latch parts are rotated
  // to lay that along world X. A mis-rotated extrude does not throw — it silently lays
  // the part along the wrong axis and still renders something plausible, which is the
  // failure mode this project has hit before. Assert the shape instead of trusting it.
  for (const name of ['din_hook_upper', 'din_leaf_spring']) {
    const n = root.getObjectByName(name);
    if (!n) { problems.push(`${name}: missing`); continue; }
    const sz = new THREE.Box3().setFromObject(n, true).getSize(new THREE.Vector3());
    if (sz.x <= sz.z) {
      problems.push(`${name}: extruded along the wrong axis (x ${sz.x.toFixed(4)} <= z ${sz.z.toFixed(4)})`);
    }
  }

  // The port block must span its declared field, not collapse to a point.
  const pb = new THREE.Box3().setFromObject(root.getObjectByName('port_block'), true);
  if ((pb.max.x - pb.min.x) < BLOCK_W * 0.9) {
    problems.push(`port block spans ${(pb.max.x - pb.min.x).toFixed(4)}, expected ~${BLOCK_W}`);
  }

  // NO RACK EARS: nothing may stick out sideways past the enclosure width. This is the
  // geometric form of critical feature din-rail-body, which a rack-style model fails.
  const all = new THREE.Box3().setFromObject(root, true);
  const railProp = root.getObjectByName('din_rail_prop');
  const wasVisible = railProp.visible;
  railProp.visible = false;
  const noProp = new THREE.Box3();
  root.traverse((o) => { if (o.isMesh && o.parent?.name !== 'din_rail_prop') noProp.expandByObject(o); });
  railProp.visible = wasVisible;
  if (noProp.max.x > HALF_W + 0.001 || noProp.min.x < -HALF_W - 0.001) {
    problems.push(`something projects sideways past the enclosure (x ${noProp.min.x.toFixed(4)}..${noProp.max.x.toFixed(4)} vs +/-${HALF_W}) — reads as rack ears`);
  }

  if (problems.length) {
    console.error('[stratix] GUARD FAILED:', problems.join(' · '));
    return false;
  }
  return true;
}
