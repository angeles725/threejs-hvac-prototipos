// ups-panduit.mjs — Panduit SmartZone UPS (3U, U05N11V) · P5a STRUCTURAL
//
// Blockout PASSED at 0.80 once its two non-geometry defects were fixed. This pass turns
// the massing into structure:
//   - the VENT GRILLE was three raised BARS. A ventilation slot is an OPENING; bars
//     standing proud of the bezel are the opposite of the critical feature they serve.
//   - side_vents and rear_panel were DECLARED IN THE HIERARCHY AND EMPTY. A node that
//     renders nothing is a promise the model does not keep.
//   - every front-panel feature sat with its back face EXACTLY on the bezel plane, which
//     z-fights: coincident faces are decided by Float32 rounding, so the winner flips as
//     the camera moves.
// Guards ported from the sibling asset now fail the build on all three classes.
//
// SCALE: 1 voxel = 0.1 m (blockout_scale from design-spec.yaml)
// All geometry in meters. Device sits on the floor (Y=0 at bottom face).
//
// Declared variant: U05N11V — 440 × 666.5 × 131 mm (W × D × H)
// Rack ears: 19" face = 482.6 mm; ear width = (482.6 - 440) / 2 ≈ 21.3 mm per side
//
// Hierarchy matches design-spec.yaml:
//   root → ups_chassis → rack_ears, front_panel → touch_display, power_button,
//                                                  led_indicators, vent_grille
//                      → side_vents
//                      → rear_panel

import * as THREE from 'three';
import { makeScreen } from './decals.mjs';

// ── Dimensions (meters) ───────────────────────────────────────────────────────
const UPS_W  = 0.440;   // chassis width
const UPS_H  = 0.131;   // chassis height (3U)
const UPS_D  = 0.6665;  // chassis depth (VRLA battery bay)
const EAR_W  = 0.0213;  // rack ear tab width per side
const EAR_H  = 0.110;   // ear height (slightly shorter than chassis — flange inset)
const EAR_T  = 0.003;   // ear thickness

const FP_W   = UPS_W;           // front panel: full chassis width (bezel flush with body)
const FP_H   = UPS_H;
const FP_T   = 0.006;            // front panel depth (proud 6 mm)

const LCD_W  = 0.094;            // ~3.5" touch display, landscape (approximately 94×56 mm at 3.5")
const LCD_H  = 0.056;
const LCD_T  = 0.003;

const BTN_R  = 0.012;            // power button cylinder radius
const BTN_T  = 0.008;            // power button depth

const LED_W  = 0.008;            // individual LED lens width
const LED_H  = 0.008;
const LED_T  = 0.003;
const LED_N  = 4;                // number of status LEDs

const VENT_W = 0.280;            // front vent grille width
// 18 mm -> 9 mm, and the pitch with it. THE GRILLE DID NOT FIT THE PANEL. Three 18 mm
// slots at a 22 mm pitch need ~66 mm of face, and the space below the display block is
// 32.5 mm — so the third slot was placed at y = -0.0085, hanging 18.7 mm BELOW the
// chassis floor, floating in mid-air. It had been there since the blockout and survived
// six passes and three gates: the vent guard only checked DEPTH behind the bezel, and the
// framing checks boxed the whole subject, so a stray part was simply framed along with
// everything else. Nothing asked whether a part was ON the object.
const VENT_H = 0.009;            // vent slot height (one grille strip)
const VENT_PITCH = 0.0105;       // three slots now fit the 32.5 mm below the display
const VENT_N = 3;                // number of vent strips on front

// ── Materials (blockout palette — will be refined at P5b) ─────────────────────
function makeMaterials() {
  // Chassis body: dark charcoal, matte painted steel
  const chassisMat = new THREE.MeshStandardMaterial({
    color: '#1c1d22',
    roughness: 0.55,
    metalness: 0.0,
  });
  chassisMat.name = 'chassis_steel';

  // Front bezel: matte black ABS
  const bezelMat = new THREE.MeshStandardMaterial({
    color: '#101115',
    roughness: 0.65,
    metalness: 0.0,
  });
  bezelMat.name = 'front_bezel';

  // Rack ears: bare galvanized steel
  const earMat = new THREE.MeshStandardMaterial({
    color: '#8a8e95',
    roughness: 0.42,
    metalness: 0.90,
  });
  earMat.name = 'rack_ears_metal';
  earMat.envMapIntensity = 1.4;   // metalness 0.90 → strong IBL response

  // LCD: dark glass panel
  const lcdMat = new THREE.MeshStandardMaterial({
    // emissive white at intensity 0: the screen artwork is an emissiveMap, so the map
    // supplies the colour and this is the dial the power state turns.
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.0,
    color: '#07090f',
    // 0.04 -> 0.05, matching the spec. The traceability sweep caught the divergence; an
    // undocumented 0.01 in code is trivial on its own and is exactly how a model drifts
    // away from its contract one harmless step at a time. The spec governs.
    roughness: 0.05,
    metalness: 0.0,
  });
  lcdMat.name = 'lcd_glass';

  // Power button: dark ABS
  const btnMat = new THREE.MeshStandardMaterial({
    color: '#141519',
    roughness: 0.55,
    metalness: 0.0,
  });
  btnMat.name = 'power_button_plastic';

  // Status LEDs (off state for blockout; emissive enabled in interaction pass)
  const ledMat = new THREE.MeshStandardMaterial({
    color: '#060810',
    roughness: 0.45,
    metalness: 0.0,
    emissive: new THREE.Color(0x20c020),
    emissiveIntensity: 0.0,   // off by default; set to 1.4 when power=on
  });
  ledMat.name = 'led_status';

  // Vent throat — the dark interior of every slot, front and side. This is what makes an
  // opening read as an opening; without it a recess is just a slightly darker bar.
  const ventCavityMat = new THREE.MeshStandardMaterial({
    color: '#0b0c0e',
    roughness: 0.78,
    metalness: 0.0,
  });
  ventCavityMat.name = 'vent_cavity';

  // ── P5a MATERIALS tuning ───────────────────────────────────────────────────
  // envMapIntensity is the r160-correct IBL dial; scene.environmentIntensity does not
  // exist in r160 and setting it is a silent no-op.
  for (const m of [chassisMat, bezelMat, earMat, lcdMat, btnMat, ledMat, ventCavityMat]) {
    m.envMapIntensity = 1.0;
  }

  // GLASS READ for the display. The runtime forbids MeshPhysicalMaterial.transmission —
  // it stalls shader compile under headless SwiftShader and the probe comes back with 0
  // draws — so real refraction is off the table. What actually makes a dark screen read
  // as glass is not transparency anyway: it is a MIRROR-SHARP reflection of the room on a
  // near-black base. Roughness is already 0.05 from the spec; the missing half was the
  // environment it has to reflect.
  lcdMat.envMapIntensity = 2.20;

  // Bare metal is the only other surface that should mirror the room.
  earMat.envMapIntensity = 1.25;

  // VENT THROATS the other way. A slot interior is an occluded cavity, and giving it full
  // room light is exactly what flattens a recess back into a darker bar — which is the
  // defect the structural pass just removed. Dropping this is the honest lever for
  // "reads as an opening"; a blacker albedo would only fake it.
  ventCavityMat.envMapIntensity = 0.28;

  return { chassisMat, bezelMat, earMat, lcdMat, btnMat, ledMat, ventCavityMat };
}

// ── Builder ────────────────────────────────────────────────────────────────────
/**
 * Build the UPS scene graph and add it to `scene`.
 * @param {THREE.Scene} scene
 * @returns {{ root, ledMat }}
 */



/**
 * CONTAINMENT. Every part must lie ON the device. This is the assertion nothing was
 * making, and its absence let a ventilation slot hang 18.7 mm below the chassis floor
 * through six passes and three gates — a part in mid-air, framed along with everything
 * else because the framing checks box the WHOLE subject and never ask whether the subject
 * is one object.
 *
 * Two axes are load-bearing here and one is not:
 *   Y is absolute — a 3U unit that pokes above or below its own height fouls whatever is
 *     racked next to it. Nothing may leave the chassis in Y. No exceptions.
 *   X allows exactly one exception, the 19" mounting flanges, which are a critical
 *     feature and are supposed to project.
 *   Z is not checked: the bezel stands proud at the front and the service panel at the
 *     rear, both by design, and both are already asserted where it matters.
 */
function verifyPartsAreOnTheDevice(root) {
  const body = new THREE.Box3().setFromObject(root.getObjectByName('ups_body'), true);
  const ears = new THREE.Box3().setFromObject(root.getObjectByName('rack_ears'), true);
  const problems = [];
  const TOL = 0.0005;

  root.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o, true);
    if (b.max.y > body.max.y + TOL || b.min.y < body.min.y - TOL) {
      problems.push(`${o.name}: y ${b.min.y.toFixed(4)}..${b.max.y.toFixed(4)} leaves the chassis ${body.min.y.toFixed(4)}..${body.max.y.toFixed(4)}`);
    }
    if (b.max.x > ears.max.x + TOL || b.min.x < ears.min.x - TOL) {
      problems.push(`${o.name}: x ${b.min.x.toFixed(4)}..${b.max.x.toFixed(4)} projects past even the rack ears`);
    }
  });

  if (problems.length) { console.error('[ups] PART OFF THE DEVICE:', problems.join(' · ')); return false; }
  return true;
}

// ── Geometry cache (P5a OPTIMIZATION) ────────────────────────────────────────
// Measured: 44 geometry objects for 16 distinct SHAPES. The 18 side-vent slots each built
// their own identical BoxGeometry, and so did the four LEDs, the three front throats, the
// three lips, the three blades and both rack ears. Geometries here are immutable — nothing
// mutates vertex data after construction — so sharing them is free.
//
// NOTE ON WHAT IS *NOT* DONE: the 18 slots are not collapsed into an InstancedMesh. That
// would cut 18 draws we do not need (this build sits at 18% of its budget) at the cost of
// 18 individually named meshes. Sharing geometry has no such cost; instancing does. Same
// call as the sibling assets: do not trade verifiability for headroom you already have.
const _geo = new Map();
function cachedGeo(key, make) {
  let g = _geo.get(key);
  if (!g) { g = make(); _geo.set(key, g); }
  return g;
}
const boxGeo = (w, h, d) => cachedGeo(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const cylGeo = (rt, rb, h, seg) => cachedGeo(`c:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const torusGeo = (r, t, rs, ts) => cachedGeo(`t:${r}:${t}:${rs}:${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts));

/** Exposed so the optimization check can prove the cache is actually being hit. */
export function geometryCacheSize() { return _geo.size; }

// ── Build-time guards ────────────────────────────────────────────────────────
// Ported from the sibling asset, where each one caught a real defect that no render
// review had flagged. console.error, NOT console.assert — assert is invisible to the QA
// gate and would let a broken build through at exit 0.

/**
 * Z-FIGHT. Overlapping VOLUMES are fine and often required — seated parts are meant to
 * interpenetrate. What fights is two VISIBLE surfaces at the same depth over the same
 * footprint: neither wins consistently, because vertex positions are Float32 and the
 * winner flips as the camera moves. Same-material pairs are skipped: whichever of two
 * identical faces wins, the pixel is the same, so flagging them is noise that trains
 * people to ignore the guard.
 */
function verifyNoCoincidentPlanes(root, tol = 0.00002) {
  const boxes = [];
  root.traverse((o) => {
    if (o.isMesh) boxes.push({ n: o.name, mat: o.material, b: new THREE.Box3().setFromObject(o, true) });
  });
  const problems = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[i].mat === boxes[j].mat) continue;
      const A = boxes[i].b;
      const B = boxes[j].b;
      const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x);
      const oy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
      if (ox <= 0.0005 || oy <= 0.0005) continue;
      for (const [face, av, bv] of [['FRONT', A.max.z, B.max.z], ['REAR', A.min.z, B.min.z]]) {
        if (Math.abs(av - bv) < tol) {
          problems.push(`${boxes[i].n} / ${boxes[j].n} share a ${face} plane at z=${av.toFixed(5)} over ${(ox * oy * 1e6).toFixed(0)} mm2`);
        }
      }
    }
  }
  if (problems.length) { console.error('[ups] Z-FIGHT RISK:', problems.join(' · ')); return false; }
  return true;
}

/**
 * NO EMPTY DECLARED NODES. side_vents and rear_panel shipped through the blockout as
 * groups that rendered nothing — a promise in the hierarchy the model did not keep, and
 * one a screenshot cannot reveal because you cannot see what is not there.
 */
function verifyNoEmptyGroups(root, names) {
  const problems = [];
  for (const n of names) {
    const g = root.getObjectByName(n);
    if (!g) { problems.push(`${n}: node missing entirely`); continue; }
    let meshes = 0;
    g.traverse((o) => { if (o.isMesh) meshes += 1; });
    if (meshes === 0) problems.push(`${n}: declared in the hierarchy and renders NOTHING`);
  }
  if (problems.length) { console.error('[ups] EMPTY DECLARED NODE:', problems.join(' · ')); return false; }
  return true;
}

/**
 * VENTS MUST BE OPENINGS. The blockout's grille was three bars standing PROUD of the
 * bezel, which is the opposite of the critical feature it serves. Asserted directly so
 * the mistake cannot come back by way of a sign flip.
 */
function verifyVentsAreRecessed(root, frontZ) {
  const problems = [];
  root.traverse((o) => {
    if (!o.isMesh || !/^vent_throat_/.test(o.name)) return;
    const z = new THREE.Box3().setFromObject(o, true).max.z;
    if (z >= frontZ - 0.0005) {
      problems.push(`${o.name} front at ${z.toFixed(5)} is not behind the bezel face ${frontZ.toFixed(5)} — a raised bar, not a slot`);
    }
  });
  if (problems.length) { console.error('[ups] VENTS NOT RECESSED:', problems.join(' · ')); return false; }
  return true;
}

export function buildUPS(scene) {
  const { chassisMat, bezelMat, earMat, lcdMat, btnMat, ledMat, ventCavityMat } = makeMaterials();

  // Root — scene node, centered at world origin (bottom face at Y=0)
  const root = new THREE.Group();
  root.name = 'root';
  scene.add(root);

  // ── ups_chassis ──────────────────────────────────────────────────────────────
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'ups_chassis';
  root.add(chassisGroup);

  // Main body box — centered at (0, UPS_H/2, 0) so bottom sits at Y=0
  const bodyGeo = boxGeo(UPS_W, UPS_H, UPS_D);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.name = 'ups_body';
  bodyMesh.position.set(0, UPS_H / 2, 0);
  chassisGroup.add(bodyMesh);

  // ── rack_ears ────────────────────────────────────────────────────────────────
  const earGroup = new THREE.Group();
  earGroup.name = 'rack_ears';
  chassisGroup.add(earGroup);

  const earGeo = boxGeo(EAR_W, EAR_H, EAR_T);
  // Ears mount at the front face of the chassis (z = +UPS_D/2)
  // Left ear: centered at x = -(UPS_W/2 + EAR_W/2)
  // Right ear: centered at x = +(UPS_W/2 + EAR_W/2)
  const EAR_Y = (UPS_H - EAR_H) / 2 + EAR_H / 2;  // vertically centered, slight inset from top
  const EAR_Z = UPS_D / 2 - EAR_T / 2;              // flush with front face

  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.name = 'ear_left';
  leftEar.position.set(-(UPS_W / 2 + EAR_W / 2), UPS_H / 2, EAR_Z);
  earGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.name = 'ear_right';
  rightEar.position.set(+(UPS_W / 2 + EAR_W / 2), UPS_H / 2, EAR_Z);
  earGroup.add(rightEar);

  // ── front_panel ──────────────────────────────────────────────────────────────
  const fpGroup = new THREE.Group();
  fpGroup.name = 'front_panel';
  chassisGroup.add(fpGroup);

  // Front panel bezel — flush/slightly proud of chassis front face
  const fpGeo = boxGeo(FP_W, FP_H, FP_T);
  const fpMesh = new THREE.Mesh(fpGeo, bezelMat);
  fpMesh.name = 'front_bezel';
  fpMesh.position.set(0, UPS_H / 2, UPS_D / 2 + FP_T / 2);
  fpGroup.add(fpMesh);

  // Front panel Z baseline (front face of bezel)
  const FP_FRONT = UPS_D / 2 + FP_T;

  // ── touch_display (left-center of front face) ─────────────────────────────
  const lcdGroup = new THREE.Group();
  lcdGroup.name = 'touch_display';
  fpGroup.add(lcdGroup);

  // A display is glass set BEHIND a bezel, not a slab glued on top. The blockout's slab
  // also sat with its back face exactly on the bezel plane — a coincident pair that
  // z-fights, because Float32 decides the winner and the winner flips with the camera.
  const LCD_X = -0.080;
  const LCD_FRAME = 0.0050;        // frame width around the glass
  const LCD_PROUD = 0.0025;        // how far the frame stands off the bezel
  const LCD_SEAT  = 0.0006;        // frame bites into the bezel instead of kissing it

  // Screen artwork rides on the shared lcd material as an EMISSIVE map, never a
  // base-colour map: a base map would light the pane even with the unit powered down.
  const { texture: screenTex } = makeScreen();
  if (screenTex && !lcdMat.emissiveMap) {
    lcdMat.emissiveMap = screenTex;
    lcdMat.needsUpdate = true;
  }

  // Glass, RECESSED behind the frame front — that recess is what reads as a screen.
  const lcdMesh = new THREE.Mesh(boxGeo(LCD_W, LCD_H, LCD_T), lcdMat);
  lcdMesh.name = 'lcd_panel';
  lcdMesh.position.set(LCD_X, UPS_H / 2, FP_FRONT + LCD_PROUD - 0.0012 - LCD_T / 2);
  lcdGroup.add(lcdMesh);

  // Frame: four bars around the glass, standing proud and seated into the bezel.
  const fw = LCD_W + 2 * LCD_FRAME;
  const fh = LCD_H + 2 * LCD_FRAME;
  const fz = FP_FRONT - LCD_SEAT + (LCD_PROUD + LCD_SEAT) / 2;
  const fd = LCD_PROUD + LCD_SEAT;
  for (const [w, h, dx, dy, nm] of [
    [fw, LCD_FRAME, 0, (fh - LCD_FRAME) / 2, 'top'],
    [fw, LCD_FRAME, 0, -(fh - LCD_FRAME) / 2, 'bottom'],
    [LCD_FRAME, fh - 2 * LCD_FRAME, -(fw - LCD_FRAME) / 2, 0, 'left'],
    [LCD_FRAME, fh - 2 * LCD_FRAME, (fw - LCD_FRAME) / 2, 0, 'right'],
  ]) {
    const bar = new THREE.Mesh(boxGeo(w, h, fd), bezelMat);
    bar.name = `lcd_frame_${nm}`;
    bar.position.set(LCD_X + dx, UPS_H / 2 + dy, fz);
    lcdGroup.add(bar);
  }

  // ── power_button (right of LCD, vertically centered) ─────────────────────
  const btnGroup = new THREE.Group();
  btnGroup.name = 'power_button';
  fpGroup.add(btnGroup);

  // A panel button sits in a collar, not on the paint. The collar is what stops a finger
  // pressing it by accident and what makes it read as a control rather than a sticker.
  const BTN_X = 0.120;
  const collar = new THREE.Mesh(
    cylGeo(BTN_R + 0.0035, BTN_R + 0.0035, 0.0040, 20),
    bezelMat,
  );
  collar.name = 'power_btn_collar';
  collar.rotation.x = Math.PI / 2;
  collar.position.set(BTN_X, UPS_H / 2, FP_FRONT - 0.0006 + 0.0020);
  btnGroup.add(collar);

  const btnMesh = new THREE.Mesh(cylGeo(BTN_R, BTN_R, BTN_T, 16), btnMat);
  btnMesh.name = 'power_btn_cap';
  btnMesh.rotation.x = Math.PI / 2;   // face forward (+Z)
  // Cap face sits just BELOW the collar rim: recessed, so it reads as pressable.
  btnMesh.position.set(BTN_X, UPS_H / 2, FP_FRONT + 0.0006 - BTN_T / 2);
  btnGroup.add(btnMesh);

  // ── led_indicators (column right of power button) ─────────────────────────
  const ledGroup = new THREE.Group();
  ledGroup.name = 'led_indicators';
  fpGroup.add(ledGroup);

  const LED_X_START = 0.158;                        // rightmost column
  const LED_Y_START = UPS_H / 2 + (LED_N - 1) * 0.014 / 2;  // top of 4-LED column
  for (let i = 0; i < LED_N; i++) {
    const ledGeo = boxGeo(LED_W, LED_H, LED_T);
    const m = new THREE.Mesh(ledGeo, ledMat);
    m.name = `led_${i}`;
    // Seated 0.6 mm INTO the bezel: the blockout put the back face exactly on the plane,
    // which is a coincident pair, and it left the lens floating rather than fitted.
    m.position.set(LED_X_START, LED_Y_START - i * 0.014, FP_FRONT - 0.0006 + LED_T / 2);
    ledGroup.add(m);
  }

  // ── vent_grille — RECESSED SLOTS, not raised bars ────────────────────────
  // The blockout stood three bars PROUD of the bezel. A ventilation slot is an opening:
  // raised bars are the opposite of what the critical feature describes, and no amount of
  // shading makes a bump read as a hole. Rebuilt as real recesses, each with a louvre
  // blade formed INWARD — a stamped louvre is pressed out of the panel, so nothing
  // projects past the face.
  const ventGroup = new THREE.Group();
  ventGroup.name = 'vent_grille';
  fpGroup.add(ventGroup);

  const VENT_RECESS = 0.0030;      // how far the slot floor sits behind the bezel face
  const VENT_SEAT   = 0.0005;      // slots bite into the bezel rather than kissing it
  const VENT_Y_START = 0.028;      // top slot sits just under the display block

  for (let i = 0; i < VENT_N; i++) {
    const y = VENT_Y_START - i * VENT_PITCH;

    // The dark throat behind the opening — what actually reads as a slot.
    const throat = new THREE.Mesh(
      boxGeo(VENT_W, VENT_H, 0.0020),
      ventCavityMat,
    );
    throat.name = `vent_throat_${i}`;
    throat.position.set(0, y, FP_FRONT - VENT_RECESS - 0.0010 + VENT_SEAT);
    ventGroup.add(throat);

    // BRIGHT LIP along the slot's lower edge (P5a surface). The blade already gives the
    // shadow; what a stamped vent also has is a folded metal edge that catches light and
    // draws a hard bright line under every slot. Measured, the blade-to-throat separation
    // was 12.1x but both sit on a near-black chassis — this lip is what lets the grille
    // read from the hero without leaning on the side vents to carry ventilation.
    const lip = new THREE.Mesh(
      boxGeo(VENT_W, 0.0016, 0.0022),
      earMat,                                  // the one bright material on this chassis
    );
    lip.name = `vent_lip_${i}`;
    // Front face 0.4 mm BEHIND the bezel plane. The first placement put it exactly ON
    // that plane and the coincident-plane guard fired over 448 mm2 — correctly: a folded
    // edge sits inside the pressed opening, it does not finish flush with the panel.
    lip.position.set(0, y - VENT_H / 2 - 0.0004, FP_FRONT - 0.0015);
    ventGroup.add(lip);

    // Louvre blade: tilted about the horizontal axis so it overhangs the slot from above
    // and throws the hard shadow line a vented panel has. Seated INSIDE the recess.
    const blade = new THREE.Mesh(
      boxGeo(VENT_W - 0.004, 0.0030, 0.0012),
      chassisMat,
    );
    blade.name = `vent_blade_${i}`;
    blade.rotation.x = -0.5;
    blade.position.set(0, y + VENT_H / 2 - 0.0018, FP_FRONT - VENT_RECESS + 0.0006);
    ventGroup.add(blade);
  }

  // ── side_vents — the declared group was EMPTY ────────────────────────────
  // A node declared in the hierarchy that renders nothing is a promise the model does not
  // keep, and the ventilation critical explicitly reaches the SIDE faces. This chassis is
  // 666 mm deep, so the flanks are its two largest surfaces; leaving them blank also left
  // the silhouette reading as a featureless slab.
  const sideVentGroup = new THREE.Group();
  sideVentGroup.name = 'side_vents';
  chassisGroup.add(sideVentGroup);

  const SIDE_SLOTS = 9;
  const SIDE_PITCH = 0.048;
  const SIDE_Z0 = -0.20;
  for (const sign of [-1, 1]) {
    for (let i = 0; i < SIDE_SLOTS; i++) {
      const z = SIDE_Z0 + i * SIDE_PITCH;
      const throat = new THREE.Mesh(
        boxGeo(0.0020, 0.060, 0.012),
        ventCavityMat,
      );
      throat.name = `side_vent_${sign < 0 ? 'l' : 'r'}_${i}`;
      // Sunk into the flank, so the slot is a depression rather than a stripe.
      throat.position.set(sign * (UPS_W / 2 - 0.0010), UPS_H / 2, z);
      sideVentGroup.add(throat);
    }
  }

  // ── rear_panel — the other EMPTY declared group ──────────────────────────
  // WHAT IS BUILT HERE IS DELIBERATELY MINIMAL, and the reason is evidence. P1-DATASHEETS
  // §2 covers this unit's form factor, dimensions, rating and FRONT face; it says nothing
  // whatsoever about the rear layout. So this pass builds only what is functionally forced
  // and refuses to invent the rest:
  //   - a recessed service panel: every rack device has one, and a flat back face was the
  //     placeholder this pass exists to replace
  //   - an exhaust fan aperture: a 5 kVA UPS is forced-air cooled and the front grille
  //     already takes air in, so it must leave somewhere
  // NOT BUILT: output receptacles. A UPS certainly has them and they are certainly not on
  // the front — but their COUNT and TYPE are unsourced, and a specific receptacle array is
  // a claim about the product. Recorded as an open item instead of guessed at.
  const rearGroup = new THREE.Group();
  rearGroup.name = 'rear_panel';
  chassisGroup.add(rearGroup);

  const REAR_Z = -UPS_D / 2;
  const panel = new THREE.Mesh(
    boxGeo(0.300, 0.090, 0.0040),
    bezelMat,
  );
  panel.name = 'rear_service_panel';
  panel.position.set(0, UPS_H / 2, REAR_Z + 0.0018);   // seated INTO the back face
  rearGroup.add(panel);

  const fanBore = new THREE.Mesh(
    cylGeo(0.036, 0.036, 0.0060, 24),
    ventCavityMat,
  );
  fanBore.name = 'rear_fan_bore';
  fanBore.rotation.x = Math.PI / 2;
  fanBore.position.set(-0.100, UPS_H / 2, REAR_Z + 0.0012);
  rearGroup.add(fanBore);

  const fanRing = new THREE.Mesh(
    torusGeo(0.036, 0.0035, 8, 28),
    chassisMat,
  );
  fanRing.name = 'rear_fan_ring';
  fanRing.position.set(-0.100, UPS_H / 2, REAR_Z - 0.0008);
  rearGroup.add(fanRing);

  const planesOk = verifyNoCoincidentPlanes(root);
  const groupsOk = verifyNoEmptyGroups(root, ['rack_ears', 'front_panel', 'touch_display',
    'power_button', 'led_indicators', 'vent_grille', 'side_vents', 'rear_panel']);
  const ventsOk = verifyVentsAreRecessed(root, FP_FRONT);
  const onDeviceOk = verifyPartsAreOnTheDevice(root);
  if (planesOk && groupsOk && ventsOk && onDeviceOk) console.log('[ups] built · guards passed');

  return { root, ledMat, lcdMat };
}
