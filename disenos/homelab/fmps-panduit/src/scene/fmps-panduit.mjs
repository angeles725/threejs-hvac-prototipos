// fmps-panduit.mjs — the 1U transmitter chassis (P4 BLOCKOUT).
//
// SUBJECT: Panduit PXTC1ARA, Class 4 Transmitter Chassis. FMPS = Fault Managed Power System
// — pulsed HVDC over copper to remote receivers. NOT an environmental sensor, NOT a SmartZone
// gateway; the acronym invites both and P1 rules both out.
//
// THE SHAPE OF THIS SUBJECT'S RISK, which is what the guards below are for:
//   - It is 445 x 43 x 559 mm. The DEPTH is thirteen times the height and the LID is
//     thirteen times the front face — while all five criticals are on that front face. The
//     framing and the rig both have to fight that, and the camera is solved at elevation 3.
//   - Its front-face LAYOUT is inferred. The elements are sourced (nine slots, three PSUs,
//     an RJ45, an alarm connector, LEDs) but their arrangement is a declared choice at
//     confidence: low. Nothing here may quietly harden into a claim.
//   - Bays that are not RECESSED are painted rectangles. A sibling asset shipped an outlet
//     cavity of literally zero depth and it took a measurement, not an eye, to catch.

import * as THREE from 'three';
import { makeLivery, facedMaterials } from './decals.mjs';
import {
  BODY_W, HEIGHT, DEPTH, EAR_SPAN, EAR_T, EAR_H, EAR_W,
  SLOT_N, SLOT_W, SLOT_H, PSU_N, PSU_W, PSU_H, NMC_W,
  RJ45_W, RJ45_H, LED_DIA, ALARM_W,
  EDGE_MARGIN, ZONE_GAP, RECESS, FRONT_Z, NMC_X0, SLOTS_X0, PSUS_X0,
  HANDLE_W, HANDLE_H, HANDLE_D, PSU_HANDLE_W,
  EAR_HOLE_D, EAR_HOLE_N, EAR_HOLE_DY, DIVIDER_W, DIVIDER_D,
  verifyDerivations,
} from './dims.mjs';

// ── geometry cache ───────────────────────────────────────────────────────────────
// Sharing geometry is free; instancing costs named, individually addressable meshes — which
// every containment guard and every interaction hotspot depends on.
const _geo = new Map();
const key = (...a) => a.join('|');
function box(w, h, d) {
  const k = key('box', w, h, d);
  if (!_geo.has(k)) _geo.set(k, new THREE.BoxGeometry(w, h, d));
  return _geo.get(k);
}
function cyl(r, h, seg = 20) {
  const k = key('cyl', r, h, seg);
  if (!_geo.has(k)) _geo.set(k, new THREE.CylinderGeometry(r, r, h, seg));
  return _geo.get(k);
}
export function geometryCacheSize() { return _geo.size; }

/**
 * Centre-z for a slab of given depth whose FRONT face should sit at `front`.
 *
 * Everything on this asset's face is stacked in z within a few millimetres, and positioning
 * slabs by their CENTRE is how three different depths ended up sharing one front plane. The
 * quantity that matters visually is where the front lands, so that is what gets specified.
 */
const atFront = (front, depth) => front - depth / 2;

// One z-stack, declared once, so no two layers can silently land on the same plane.
export const Z = {};

const mesh = (geo, mat, name, pos = [0, 0, 0]) => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(...pos);
  return m;
};

/**
 * Four bars forming a rectangular frame with an OPEN aperture.
 *
 * Extracted because this file needed it three times — the chassis front, the RJ45 shield and
 * the NMC faceplate — and each time it was first built as a SOLID plate that buried whatever
 * it was supposed to surround. Without CSG a "hole" has to be assembled, and assembling it by
 * hand three times is three chances to forget.
 *
 * @returns {THREE.Mesh[]} top, bottom, left, right
 */
function frameBars(outerW, outerH, barT, depth, mat, prefix, cx, cy, cz) {
  const innerH = Math.max(0, outerH - 2 * barT);
  return [
    ['top', outerW, barT, 0, (outerH - barT) / 2],
    ['bottom', outerW, barT, 0, -(outerH - barT) / 2],
    ['left', barT, innerH, -(outerW - barT) / 2, 0],
    ['right', barT, innerH, (outerW - barT) / 2, 0],
  ].map(([suffix, w, h, dx, dy]) =>
    mesh(box(w, h, depth), mat, `${prefix}_${suffix}`, [cx + dx, cy + dy, cz]));
}

/** Parts that are scenery rather than product. None on this asset, kept for guard symmetry. */
export const PROPS = new Set();

/**
 * The FIXED STRUCTURE of the chassis — the parts that never come out of the rack.
 *
 * Named as a SET rather than as one mesh, because the shell stopped being a single box when
 * the front opened into a frame. A guard that exempts `chassis_body` by name silently starts
 * failing the moment the thing it means is built from five pieces instead of one, and the
 * exemption is where that kind of drift hides.
 */
export const CHASSIS_STRUCTURE = new Set([
  'chassis_body', 'frame_top', 'frame_bottom', 'frame_left', 'frame_right',
]);

/**
 * The bounding box OF THE SUBJECT — not of the scene graph.
 * Box3.setFromObject IGNORES `visible`, so hidden state geometry (blanking plates behind
 * populated modules) would otherwise inflate the box the camera is solved against. A sibling
 * asset framed a 400 mm prop instead of a 101 mm device for exactly this reason.
 */
export function subjectBox(root) {
  root.updateMatrixWorld(true);
  const b = new THREE.Box3();
  root.traverse((m) => {
    if (!m.isMesh || !m.visible || PROPS.has(m.name)) return;
    for (let o = m.parent; o; o = o.parent) if (!o.visible) return;
    b.union(new THREE.Box3().setFromObject(m, true));
  });
  return b;
}

export function buildFMPS(mats) {
  const root = new THREE.Group();
  root.name = 'chassis_root';

  // THE FRONT Z-STACK. Front to back, every layer at its own depth:
  Object.assign(Z, {
    panel:  FRONT_Z,                    // the chassis face itself
    cage:   FRONT_Z - RECESS + 0.0012,  // the jack's shield, PROUD of the faceplate
    face:   FRONT_Z - RECESS,           // module / PSU / NMC faces — RECESS behind the panel
    led:    FRONT_Z - RECESS + 0.0006,  // lamps stand slightly proud of their face
    blank:  FRONT_Z - RECESS - 0.0006,  // blanking plates sit a touch deeper than a module
    // THE CAVITY IS THE BACK OF THE HOLE, NOT A LID OVER IT.
    // It sat at FRONT_Z - 0.0005, i.e. IN FRONT of the module face it was supposed to frame,
    // so the "recess" was a solid dark slab covering the very part it existed to surround.
    // It belongs BEHIND the face, slightly wider, so what shows is a dark border around a
    // lighter module — which is what a bay looks like.
    cavity: FRONT_Z - RECESS - 0.0040,
    throat: FRONT_Z - RECESS - 0.0022,  // the jack's bore, behind the cage
  });

  // ── the 1U shell ───────────────────────────────────────────────────────────────
  //
  // NOT A SOLID BOX TO THE FRONT PLANE. It was, and that BURIED the entire front face: the
  // nine module faces, the three PSU faces, all thirteen LEDs, the RJ45 cage and throat, the
  // dividers and every cavity sat INSIDE a closed slab. A ray from the camera hit
  // chassis_body first, every time, in every view. What actually rendered was the four things
  // that stood proud of the panel — the handles, the alarm block and the livery — which read
  // convincingly enough as "a row of bays" to pass three captures.
  //
  // The guard that should have caught it measured the wrong property: verifyBaysAreRecessed
  // asserts a face sits BEHIND the front plane, which is exactly what a buried part does.
  // WITHOUT AN OPENING, RECESSED IS BURIED. Recess is meaningful only relative to a hole.
  //
  // So the shell stops behind the bays, and the front is a FRAME around the bay aperture.
  const shellD = DEPTH - 0.0125;
  root.add(mesh(box(BODY_W, HEIGHT, shellD), mats.chassis_black,
                'chassis_body', [0, 0, FRONT_Z - 0.0125 - shellD / 2]));

  // The front frame: four bars leaving the bay area open. Top and bottom span the full width;
  // left and right close the margins beside the NMC and PSU zones.
  const frame = new THREE.Group();
  frame.name = 'front_frame';
  root.add(frame);
  const apTop = SLOT_H / 2, apBot = -SLOT_H / 2;
  const apLeft = NMC_X0, apRight = PSUS_X0 + PSU_N * PSU_W;
  const frameD = 0.0125;
  const fz = atFront(FRONT_Z, frameD);
  frame.add(mesh(box(BODY_W, HEIGHT / 2 - apTop, frameD), mats.chassis_black,
                 'frame_top', [0, (HEIGHT / 2 + apTop) / 2, fz]));
  frame.add(mesh(box(BODY_W, HEIGHT / 2 + apBot, frameD), mats.chassis_black,
                 'frame_bottom', [0, -(HEIGHT / 2 - apBot) / 2, fz]));
  frame.add(mesh(box(apLeft + BODY_W / 2, SLOT_H, frameD), mats.chassis_black,
                 'frame_left', [(-BODY_W / 2 + apLeft) / 2, 0, fz]));
  frame.add(mesh(box(BODY_W / 2 - apRight, SLOT_H, frameD), mats.chassis_black,
                 'frame_right', [(apRight + BODY_W / 2) / 2, 0, fz]));

  // ── rack ears: EIA-310, and the widest thing on the asset ──────────────────────
  const ears = new THREE.Group();
  ears.name = 'rack_ears';
  root.add(ears);
  for (const sign of [-1, 1]) {
    // Seated 1.5 mm INTO the body flank rather than abutted to it. Two faces at the same
    // depth is a shimmer, not a join — and when both parts share a material nothing would
    // ever flag it, which is how a fake joint survives.
    const ear = mesh(box(EAR_W + 0.0015, EAR_H, 0.010), mats.ear_steel,
                     sign < 0 ? 'ear_l' : 'ear_r',
                     [sign * (BODY_W / 2 + EAR_W / 2 - 0.00075), 0, FRONT_Z - 0.005]);
    ears.add(ear);
    // MOUNTING HOLES. A flange with no hole cannot take a screw, and taking a screw is the
    // entire claim of the rack-ears critical. The EIA-310 vertical pitch is 0.625 in; two
    // holes is what a 1U ear carries. Modelled as seated dark discs rather than by CSG —
    // the read comes from the contrast of the bore, not from a boolean.
    for (let h = 0; h < EAR_HOLE_N; h += 1) {
      const hy = (h - (EAR_HOLE_N - 1) / 2) * EAR_HOLE_DY;
      // Seated PROUD of the flange face, not inside it. Buried in the ear they read as
      // nothing at all — the whole point of a dark disc standing in for a bore is that it is
      // the surface the eye lands on.
      const hole = mesh(cyl(EAR_HOLE_D / 2, 0.0060), mats.slot_cavity,
                        `${sign < 0 ? 'ear_l' : 'ear_r'}_hole_${h}`,
                        [sign * (BODY_W / 2 + EAR_W / 2 - 0.00075), hy, atFront(FRONT_Z + 0.0003, 0.0060)]);
      hole.rotation.x = Math.PI / 2;
      ears.add(hole);
    }
  }

  // ── nine module bays ───────────────────────────────────────────────────────────
  // Each bay is a RECESSED cavity carrying a module face and its own status LED. Blanking
  // plates are built for every bay at the same time as the modules, because a toggle that
  // hides more than its counterpart restores leaves holes — a sibling asset shipped exactly
  // that, and the fix is to construct both halves in one place.
  const modules = new THREE.Group();
  modules.name = 'module_bank';
  root.add(modules);
  const bayY = 0;
  for (let i = 0; i < SLOT_N; i += 1) {
    const cx = SLOTS_X0 + SLOT_W * (i + 0.5);
    modules.add(mesh(box(SLOT_W - 0.0015, SLOT_H, 0.012), mats.slot_cavity,
                     `slot_cavity_${i}`, [cx, bayY, atFront(Z.cavity, 0.012)]));
    // Positioned by its FRONT surface, not its centre: a 3 mm plate centred at FRONT_Z-RECESS
    // has its face only 1 mm behind the plane, and the recess guard measures the face. The
    // first version got 1.00 mm of recess where it meant 2.5, which is the difference between
    // a bay and a bevel.
    const face = mesh(box(SLOT_W - 0.0035, SLOT_H - 0.0020, 0.0030), mats.module_face,
                      `module_face_${i}`, [cx, bayY, atFront(Z.face, 0.0030)]);
    modules.add(face);
    const led = mesh(cyl(LED_DIA / 2, 0.0016), mats.led_green, `slot_led_${i}`,
                     [cx, bayY - SLOT_H / 2 + 0.005, atFront(Z.led, 0.0016)]);
    led.rotation.x = Math.PI / 2;      // lie flat against the face, pointing at the viewer
    modules.add(led);
    // EXTRACTION HANDLE. A hot-swap module has to come OUT; without a grip there is no way
    // to withdraw it. This is what makes the bay read as a bay rather than as a rectangle
    // drawn on a plate, and it is the only relief on a front band 349 px tall at dpr3.
    const handle = mesh(box(HANDLE_W, HANDLE_H, HANDLE_D), mats.module_face,
                        `module_handle_${i}`,
                        [cx, bayY + SLOT_H / 2 - 0.006, atFront(Z.face + HANDLE_D - 0.0008, HANDLE_D)]);
    modules.add(handle);
    // The chassis wall between this bay and the next. Nine slots with no dividers is one
    // continuous plate with nine faces on it.
    if (i < SLOT_N - 1) {
      // The divider has to reach the FRONT. Anchored off the cavity it sat 3.6 mm behind the
      // module faces it is supposed to separate — a wall behind the things it divides — and
      // touched nothing, which is how the blanking plates ended up floating in `partial`.
      modules.add(mesh(box(DIVIDER_W, SLOT_H, DIVIDER_D), mats.chassis_black,
                       `bay_divider_${i}`, [cx + SLOT_W / 2, bayY, atFront(Z.face + 0.0005, DIVIDER_D)]));
    }
    // The blanking plate for the same bay, hidden while the module is present.
    // WIDER THAN THE APERTURE, and at the face depth. A blanking plate laps over the
    // dividers either side and screws to them — that is what makes it a plate rather than a
    // panel floating in a hole. Built at 26.5 mm it spanned less than the opening and, once
    // the cavity moved to its correct depth, touched nothing at all in the `partial` state.
    const blank = mesh(box(SLOT_W + 0.0010, SLOT_H - 0.0020, 0.0018), mats.chassis_black,
                       `blank_plate_${i}`, [cx, bayY, atFront(Z.face, 0.0018)]);
    blank.visible = false;
    modules.add(blank);
  }

  // ── three PSU bays ─────────────────────────────────────────────────────────────
  const psus = new THREE.Group();
  psus.name = 'psu_bank';
  root.add(psus);
  for (let i = 0; i < PSU_N; i += 1) {
    const cx = PSUS_X0 + PSU_W * (i + 0.5);
    psus.add(mesh(box(PSU_W - 0.0015, PSU_H, 0.012), mats.slot_cavity,
                  `psu_cavity_${i}`, [cx, bayY, atFront(Z.cavity, 0.012)]));
    psus.add(mesh(box(PSU_W - 0.0035, PSU_H - 0.0020, 0.0030), mats.psu_face,
                  `psu_face_${i}`, [cx, bayY, atFront(Z.face, 0.0030)]));
    psus.add(mesh(box(PSU_HANDLE_W, HANDLE_H, HANDLE_D), mats.psu_face,
                  `psu_handle_${i}`,
                  [cx, bayY + PSU_H / 2 - 0.006, atFront(Z.face + HANDLE_D - 0.0008, HANDLE_D)]));
    if (i < PSU_N - 1) {
      psus.add(mesh(box(DIVIDER_W, PSU_H, DIVIDER_D), mats.chassis_black,
                    `psu_divider_${i}`, [cx + PSU_W / 2, bayY, atFront(Z.face + 0.0005, DIVIDER_D)]));
    }
    const led = mesh(cyl(LED_DIA / 2, 0.0016), mats.led_blue, `psu_led_${i}`,
                     [cx - PSU_W / 2 + 0.008, bayY - PSU_H / 2 + 0.005, atFront(Z.led, 0.0016)]);
    led.rotation.x = Math.PI / 2;
    psus.add(led);
  }

  // ── NMC zone: RJ45 + dry-contact alarm ─────────────────────────────────────────
  const nmc = new THREE.Group();
  nmc.name = 'nmc_zone';
  root.add(nmc);
  const nmcCx = NMC_X0 + NMC_W / 2;
  nmc.add(mesh(box(NMC_W - 0.0015, SLOT_H, 0.012), mats.slot_cavity,
               'nmc_cavity', [nmcCx, bayY, atFront(Z.cavity, 0.012)]));
  // The NMC faceplate is a FRAME too. As a solid plate it sat 0.2 mm in front of the jack
  // and hid it — the third time in this file that a plate buried the thing it surrounds.
  for (const bar of frameBars(NMC_W - 0.0035, SLOT_H - 0.0020, 0.0055, 0.0030,
                              mats.module_face, 'nmc_face', nmcCx, bayY, atFront(Z.face, 0.0030))) {
    nmc.add(bar);
  }
  // The jack: a shielded cage with a REAL throat behind it. A rectangle painted on the face
  // is the failure this feature exists to avoid.
  const jackY = bayY + 0.004;
  // STEPPED IN Z. Built first with cage, throat and the surrounding cavity all sharing a
  // front plane at z=277.0 — three coincident faces of three different materials, which is a
  // shimmer along every edge of the jack.
  // THE CAGE IS A FRAME, NOT A PLATE — the same lesson as the front panel, one level down.
  //
  // Built as a solid box it covered its own throat: the bore sat 1 mm behind an unbroken
  // shield and could not be seen from either declared view, so the jack read as a metal
  // rectangle rather than as an opening. `nmc-rj45-and-alarm` is a critical specifically
  // about it being "a dark cavity with a visible keyway, not a printed rectangle".
  //
  // Four bars leave the aperture open; the throat sits directly behind them, overlapping so
  // there is no gap for the eye to fall through.
  for (const bar of frameBars(RJ45_W, RJ45_H, 0.0015, 0.0016, mats.port_shield,
                              'rj45_cage', nmcCx, jackY, atFront(Z.cage, 0.0016))) {
    nmc.add(bar);
  }
  nmc.add(mesh(box(RJ45_W - 0.0032, RJ45_H - 0.0032, 0.0075), mats.port_cavity,
               'rj45_throat', [nmcCx, jackY, atFront(Z.cage - 0.0004, 0.0075)]));
  nmc.add(mesh(box(ALARM_W, 0.0090, 0.0055), mats.terminal_block,
               'alarm_block', [nmcCx, bayY - 0.010, atFront(FRONT_Z + 0.0020, 0.0055)]));
  const nmcLed = mesh(cyl(LED_DIA / 2, 0.0016), mats.led_green, 'nmc_led',
                      [nmcCx + NMC_W / 2 - 0.006, jackY, atFront(Z.led, 0.0016)]);
  nmcLed.rotation.x = Math.PI / 2;
  nmc.add(nmcLed);

  // ── livery ─────────────────────────────────────────────────────────────────────
  // At blockout a seated slab; the surface pass replaces its face with a CanvasTexture,
  // which is what printing actually is. NO ELECTRICAL RATINGS, ever — P1 carries no voltage,
  // current or power figure for this unit, and a plausible wrong rating silkscreened at 12 px
  // is worse than a missing line.
  // MOVED INTO THE FREE BAND ABOVE THE BAYS.
  //
  // It was printed straight over the third PSU bay — 30 x 4 mm of overlap with the cavity,
  // the face and the handle. A manufacturer's mark silkscreened across a hot-swap module is
  // not a livery, it is a mark on a part that gets pulled out of the chassis.
  //
  // The band between the bays (16.5 mm) and the chassis top (21.5 mm) is 5 mm tall, which is
  // what a 1U front actually leaves for print. The plate takes 3.5 mm of it with margin.
  const liveryH = 0.0035;
  const liveryY = (SLOT_H / 2 + HEIGHT / 2) / 2;
  // ARTWORK ON ONE FACE ONLY — group 4 is +z, the front of a rack chassis. The other five
  // carry the plain chassis material. A single mapped material on a BoxGeometry paints all
  // six groups, which is how a sibling asset grew a red thread down the edge of its plate.
  const { texture: liveryTex } = makeLivery();
  const liveryFace = mats.panduit_livery.clone();
  liveryFace.name = 'panduit_livery_face';
  if (liveryTex) liveryFace.map = liveryTex;
  const livery = new THREE.Mesh(box(0.044, liveryH, 0.0012),
                                facedMaterials(liveryFace, mats.chassis_black, 4));
  livery.name = 'panduit_livery';
  livery.position.set(BODY_W / 2 - 0.028, liveryY, atFront(FRONT_Z + 0.0006, 0.0012));
  root.add(livery);

  // ── state ──────────────────────────────────────────────────────────────────────
  const state = { psu: 'standby', modules: 'all' };
  const POPULATED_IN_PARTIAL = 6;      // the last three bays empty out

  function applyPsuState(mode) {
    state.psu = mode === 'enabled' ? 'enabled' : 'standby';
    const on = state.psu === 'enabled';
    for (let i = 0; i < PSU_N; i += 1) {
      const led = root.getObjectByName(`psu_led_${i}`);
      if (led) led.material = on ? mats.led_green : mats.led_blue;
    }
  }
  function applyModulePopulation(mode) {
    state.modules = mode === 'partial' ? 'partial' : 'all';
    const n = state.modules === 'partial' ? POPULATED_IN_PARTIAL : SLOT_N;
    for (let i = 0; i < SLOT_N; i += 1) {
      const populated = i < n;
      // BOTH HALVES DRIVEN IN ONE PLACE. A hide-list and a restore-list that are written
      // separately diverge silently, and the bay left with neither a module nor a plate is a
      // hole nobody notices until a capture.
      // BOTH HALVES, AND EVERY PART OF EACH HALF. The handle belongs to the module: leaving
      // it visible over a blanking plate is a handle attached to nothing, which is the
      // floating-part failure wearing a state toggle.
      for (const [name, vis] of [[`module_face_${i}`, populated], [`slot_led_${i}`, populated],
                                 [`module_handle_${i}`, populated],
                                 [`blank_plate_${i}`, !populated]]) {
        const o = root.getObjectByName(name);
        if (o) o.visible = vis;
      }
    }
  }
  applyPsuState(state.psu);
  applyModulePopulation(state.modules);

  return { root, state, applyPsuState, applyModulePopulation };
}

// ═══ GUARDS ══════════════════════════════════════════════════════════════════════
// All report with console.error. NEVER console.assert — the QA gate cannot see it.

function distanceToSurface(p, m) {
  const g = m.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const n = idx ? idx.count : pos.count;
  let min = Infinity;
  for (let i = 0; i + 2 < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i;
    const i1 = idx ? idx.getX(i + 1) : i + 1;
    const i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
    tri.set(a, b, c);
    tri.closestPointToPoint(p, closest);
    const d = closest.distanceTo(p);
    if (d < min) min = d;
    if (min === 0) return 0;
  }
  return min;
}

function isInside(p, m) {
  const g = m.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const ray = new THREE.Ray(p, new THREE.Vector3(0.5773, 0.5773, 0.5773));
  const n = idx ? idx.count : pos.count;
  let crossings = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i;
    const i1 = idx ? idx.getX(i + 1) : i + 1;
    const i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
    if (ray.intersectTriangle(a, b, c, false, hit)) crossings += 1;
  }
  return crossings % 2 === 1;
}

/**
 * Do two parts touch or interpenetrate? Surface proximity OR containment.
 *
 * BOTH TESTS ARE NEEDED AND THEY FAIL IN OPPOSITE DIRECTIONS. A bounding box around a
 * concave part contains its own void, so box overlap calls a floating part "in contact".
 * Vertex distance cannot see interpenetration at all, so a stud embedded 0.6 mm into a ring
 * reads as "floating" — and deepening the embed makes that WORSE, which is the tell that the
 * test measures the wrong property. Carried whole from the Axis structural pass.
 */
export function partsTouch(m1, m2, tol = 0.0005) {
  const v = new THREE.Vector3();
  for (const [from, to] of [[m1, m2], [m2, m1]]) {
    const pos = from.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(pos.count / 96));
    for (let i = 0; i < pos.count; i += stride) {
      const p = v.fromBufferAttribute(pos, i).clone().applyMatrix4(from.matrixWorld);
      if (distanceToSurface(p, to) <= tol) return true;
      if (isInside(p, to)) return true;
    }
  }
  return false;
}

/** NOTHING MAY FLOAT. Every visible part must reach the chassis through real contacts. */
export function verifyNothingFloats(root, tol = 0.0005) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((m) => { if (m.isMesh && m.visible && !PROPS.has(m.name)) parts.push(m); });
  const adj = new Map(parts.map((m) => [m.name, []]));
  for (let i = 0; i < parts.length; i += 1) {
    for (let j = i + 1; j < parts.length; j += 1) {
      if (partsTouch(parts[i], parts[j], tol)) {
        adj.get(parts[i].name).push(parts[j].name);
        adj.get(parts[j].name).push(parts[i].name);
      }
    }
  }
  // Flood from the whole fixed structure, not from one box.
  const seen = new Set([...CHASSIS_STRUCTURE].filter((n) => adj.has(n)));
  const queue = [...seen];
  while (queue.length) {
    for (const nb of adj.get(queue.pop()) ?? []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  let bad = 0;
  for (const m of parts) {
    if (!seen.has(m.name)) { console.error(`[fmps] ${m.name} is not connected to the chassis — it floats`); bad += 1; }
  }
  return bad;
}

/**
 * Containment. The envelope is a BOX here, unlike the sibling dome — but X carries exactly
 * one declared exception: the 19-inch mounting flanges, which are a critical feature and by
 * definition wider than the body.
 */
export function verifyPartsAreOnTheDevice(root) {
  root.updateMatrixWorld(true);
  // Z ALLOWS A DECLARED FRONT PROTRUSION. A pluggable dry-contact terminal block stands
  // proud of the panel — that is what makes it pluggable — exactly as the sibling UPS's bezel
  // and service panel do. The allowance is 5 mm and it is stated, not silently generous:
  // anything reaching further than that is a defect, not a connector.
  const FRONT_PROTRUSION_ALLOWANCE = 0.005;
  const lim = {
    x: EAR_SPAN / 2 + 1e-4,
    y: HEIGHT / 2 + 1e-4,
    zBack: DEPTH / 2 + 1e-4,
    zFront: DEPTH / 2 + FRONT_PROTRUSION_ALLOWANCE,
  };
  let bad = 0;
  root.traverse((m) => {
    if (!m.isMesh) return;
    const b = new THREE.Box3().setFromObject(m, true);
    // Y IS ABSOLUTE: a 1U unit that pokes above or below its height fouls its neighbours in
    // the rack. This is the guard the sibling UPS lacked when a vent slot hung 18.7 mm below
    // its chassis for six passes.
    if (b.min.y < -lim.y || b.max.y > lim.y) {
      console.error(`[fmps] ${m.name} breaks the 1U height: y ${(b.min.y * 1000).toFixed(1)}..${(b.max.y * 1000).toFixed(1)} mm`);
      bad += 1;
    }
    if (b.min.x < -lim.x || b.max.x > lim.x) {
      console.error(`[fmps] ${m.name} reaches past the flange span: x ${(b.min.x * 1000).toFixed(1)}..${(b.max.x * 1000).toFixed(1)} mm`);
      bad += 1;
    }
    if (b.min.z < -lim.zBack || b.max.z > lim.zFront) {
      console.error(`[fmps] ${m.name} sits outside the chassis depth: z ${(b.min.z * 1000).toFixed(1)}..${(b.max.z * 1000).toFixed(1)} mm`);
      bad += 1;
    }
  });
  return bad;
}

/**
 * Bays must be RECESSED. A bay level with the face plane is a painted rectangle, and no count
 * or envelope check can tell the two apart — a sibling asset shipped an outlet cavity of
 * literally ZERO depth and it took a measurement to find.
 */
export function verifyBaysAreRecessed(root, minDepth = 0.0015) {
  // NOTE: this measures depth ONLY. Depth behind a solid panel is burial, not recess — see
  // verifyBayContentsAreVisible, which is the check that actually matters and the one this
  // asset was missing.
  root.updateMatrixWorld(true);
  let bad = 0;
  const facePlane = FRONT_Z;
  root.traverse((m) => {
    if (!m.isMesh || !/^(module_face|psu_face|nmc_face)/.test(m.name)) return;
    const b = new THREE.Box3().setFromObject(m, true);
    const behind = facePlane - b.max.z;
    if (behind < minDepth) {
      console.error(`[fmps] ${m.name} sits ${(behind * 1000).toFixed(2)} mm behind the face — a painted rectangle, not a bay`);
      bad += 1;
    }
  });
  return bad;
}

/** Coplanar opaque faces of DIFFERENT materials shimmer. Same material cannot. */
export function verifyNoCoincidentPlanes(root, tol = 0.00002) {
  root.updateMatrixWorld(true);
  const boxes = [];
  root.traverse((m) => {
    if (!m.isMesh || !m.visible || m.material?.transparent) return;
    boxes.push({ name: m.name, mat: m.material, box: new THREE.Box3().setFromObject(m, true) });
  });
  let bad = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxes[i].mat === boxes[j].mat) continue;
      const a = boxes[i].box; const b = boxes[j].box;
      const ovXY = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 0.002
                && Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y) > 0.002;
      if (!ovXY) continue;
      for (const [za, zb] of [[a.max.z, b.max.z], [a.min.z, b.min.z], [a.max.z, b.min.z], [a.min.z, b.max.z]]) {
        if (Math.abs(za - zb) < tol) {
          console.error(`[fmps] coincident front faces: ${boxes[i].name} / ${boxes[j].name} at z=${za.toFixed(5)}`);
          bad += 1;
        }
      }
    }
  }
  return bad;
}

/** A mapped material must not sit on a multi-group geometry as a SINGLE material. */
export function verifyNoWrapAroundTextures(root) {
  root.updateMatrixWorld(true);
  let bad = 0;
  root.traverse((m) => {
    if (!m.isMesh) return;
    const groups = m.geometry.groups?.length ?? 0;
    if (groups <= 1 || Array.isArray(m.material)) return;
    if (m.material.map) {
      console.error(`[fmps] ${m.name}: a mapped material on ${groups} geometry groups — the artwork wraps every face`);
      bad += 1;
    }
  });
  return bad;
}

/**
 * EVERY POPULATED BAY IS COMPLETE. A bay with a face but no handle, or a handle with no face,
 * is a half-built bay — and counts alone cannot see it, because the count of each part is
 * still right. This checks the SET per bay, in whatever state the model is currently in.
 */
export function verifyBaysAreComplete(root) {
  root.updateMatrixWorld(true);
  let bad = 0;
  const vis = (n) => root.getObjectByName(n)?.visible ?? false;
  for (let i = 0; i < SLOT_N; i += 1) {
    const face = vis(`module_face_${i}`);
    const parts = { handle: vis(`module_handle_${i}`), led: vis(`slot_led_${i}`) };
    for (const [what, present] of Object.entries(parts)) {
      if (present !== face) {
        console.error(`[fmps] bay ${i}: module face ${face ? 'present' : 'absent'} but ${what} ${present ? 'present' : 'absent'}`);
        bad += 1;
      }
    }
    if (face === vis(`blank_plate_${i}`)) {
      console.error(`[fmps] bay ${i}: has ${face ? 'BOTH' : 'NEITHER'} a module and a blanking plate`);
      bad += 1;
    }
  }
  for (let i = 0; i < PSU_N; i += 1) {
    if (!vis(`psu_handle_${i}`)) { console.error(`[fmps] psu ${i} has no handle`); bad += 1; }
  }
  return bad;
}

/**
 * PRINTED MARKS DO NOT SIT ON REMOVABLE PARTS.
 *
 * The livery was silkscreened across the third PSU bay — over its cavity, face and handle.
 * Nothing else could see it: the plate was inside the envelope, attached, correctly sized
 * and correctly coloured. It was simply printed on a component that gets pulled out of the
 * chassis, which is a claim about the product that is plainly wrong.
 */
export function verifyLiveryIsOnTheChassis(root) {
  root.updateMatrixWorld(true);
  const mark = root.getObjectByName('panduit_livery');
  if (!mark) { console.error('[fmps] no livery'); return 1; }
  const L = new THREE.Box3().setFromObject(mark, true);
  let bad = 0;
  root.traverse((m) => {
    if (!m.isMesh || m.name === 'panduit_livery' || CHASSIS_STRUCTURE.has(m.name)) return;
    const o = new THREE.Box3().setFromObject(m, true);
    const ov = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1);
    if (ov(L.min.x, L.max.x, o.min.x, o.max.x) > 0 && ov(L.min.y, L.max.y, o.min.y, o.max.y) > 0) {
      console.error(`[fmps] the livery is printed over ${m.name} — a mark on a removable part`);
      bad += 1;
    }
  });
  return bad;
}

/**
 * BAY CONTENTS MUST BE REACHABLE BY A RAY FROM THE FRONT.
 *
 * The guard this asset shipped three passes without. Everything else was satisfied — the
 * parts were inside the envelope, attached, correctly sized, correctly coloured, correctly
 * counted and correctly recessed — while a solid front panel stood in front of all of them.
 * Depth alone cannot tell a recess from a burial; only a ray can.
 */
export function verifyBayContentsAreVisible(root) {
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  // Straight down the front axis, from well clear of the chassis.
  const origin = new THREE.Vector3(0, 0, FRONT_Z + 1.0);
  let bad = 0;
  const targets = [];
  root.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    if (/^(module_face|psu_face|nmc_face|slot_led|psu_led|nmc_led|rj45_cage|rj45_throat)/.test(m.name)) targets.push(m);
  });
  for (const t of targets) {
    // SAMPLE THE FACE, do not aim at its centre. A part can be legitimately covered at one
    // point by something MOUNTED ON IT — the NMC face carries the RJ45 cage right at its
    // middle — and reporting that as hidden would be the same centre-point mistake that
    // called a sibling asset's yoke unreachable. The question is what SHARE is visible.
    const b = new THREE.Box3().setFromObject(t, true);
    let seen = 0; let tried = 0; let blocker = null;
    for (let ix = 0; ix < 5; ix += 1) {
      for (let iy = 0; iy < 3; iy += 1) {
        const x = THREE.MathUtils.lerp(b.min.x, b.max.x, (ix + 0.5) / 5);
        const y = THREE.MathUtils.lerp(b.min.y, b.max.y, (iy + 0.5) / 3);
        tried += 1;
        ray.set(new THREE.Vector3(x, y, origin.z), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(root, true).filter((h) => {
          let v = true;
          for (let o = h.object; o; o = o.parent) if (!o.visible) { v = false; break; }
          return v;
        })[0];
        if (hit?.object === t) seen += 1; else blocker ??= hit?.object.name ?? 'nothing';
      }
    }
    if (seen / tried < 0.25) {
      console.error(`[fmps] ${t.name} is ${(seen / tried * 100).toFixed(0)}% visible from the front — blocked by ${blocker}`);
      bad += 1;
    }
  }
  return bad;
}

/** Run every guard. Returns total failures. */
export function verifyAll(root) {
  const n = verifyDerivations()
    + verifyNothingFloats(root)
    + verifyPartsAreOnTheDevice(root)
    + verifyBaysAreRecessed(root)
    + verifyBaysAreComplete(root)
    + verifyBayContentsAreVisible(root)
    + verifyNoCoincidentPlanes(root)
    + verifyNoWrapAroundTextures(root)
    + verifyLiveryIsOnTheChassis(root);
  if (n === 0) console.log('[fmps] built · guards passed');
  return n;
}
