// axis-camera.mjs — the mini-dome itself (P4 BLOCKOUT).
//
// SUBJECT: a generic indoor fixed mini-dome. NOT an M3085-V — see design-spec.yaml. Nothing
// in this file prints a model number, because nothing in the evidence supports one.
//
// THIS ASSET INVERTS THE RUN'S ASSUMPTIONS, and the guards at the bottom exist because of it:
//   - It hangs from a CEILING. Everything is at negative y. A bubble-up model would be a
//     well-made picture of the wrong object, and would pass every check written for a box.
//   - Its enclosure is TRANSPARENT and must be seen THROUGH. Four previous assets treated
//     occlusion as "a cavity reads dark"; here the failure mode is a veil. A dome nobody can
//     look inside is indistinguishable from a smoke detector, and an empty shell behind a
//     translucent surface passes a pixel gate.
//   - Its envelope is a CYLINDER, not a box. The containment guard is written for that shape
//     rather than copied from the sibling asset, because an axis-aligned box around a disc
//     leaves the corners free and a part can drift into them unnoticed.

import * as THREE from 'three';
import { makeWordmark, facedMaterials } from './decals.mjs';
import {
  MOUNT_BASE_DIA, BUBBLE_DIA, TOTAL_H, BUBBLE_R,
  BASE_H, RING_H, BODY_H, BODY_DIA, BASE_BOTTOM, APEX_Y, CEILING_Y,
  SHROUD_MOUTH_DIA, SHROUD_TIP_DIA, SHROUD_H,
  LENS_MODULE_DIA, LENS_MODULE_LEN, LENS_GLASS_DIA, LENS_TILT_DEG, LENS_PAN_DEG,
  LED_DIA, bubbleRadiusAt, verifyDerivations, arcSegments,
  YOKE_ARM_X, YOKE_ARM_W, YOKE_ARM_T, YOKE_DROP, TRUNNION_R, TRUNNION_LEN,
  GASKET_H, GASKET_T,
} from './dims.mjs';

// ── geometry cache ───────────────────────────────────────────────────────────────
// Sharing geometry is free; instancing costs named, individually addressable meshes. With
// almost nothing repeated on this subject, only the cache is worth having.
const _geo = new Map();
const key = (...a) => a.join('|');
function cyl(rt, rb, h, seg = null, open = false) {
  // Segments SOLVED from the radius unless a caller pins them — see arcSegments().
  seg ??= arcSegments(Math.max(rt, rb));
  const k = key('cyl', rt, rb, h, seg, open);
  if (!_geo.has(k)) _geo.set(k, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
  return _geo.get(k);
}
function box(w, h, d) {
  // Boxes were bypassing the cache entirely, so the two yoke arms — identical in every
  // dimension — allocated one BufferGeometry each. Trivial in triangles, but it is real
  // duplication and geometry SHARING costs nothing: unlike instancing, it does not collapse
  // named, individually addressable meshes.
  const k = key('box', w, h, d);
  if (!_geo.has(k)) _geo.set(k, new THREE.BoxGeometry(w, h, d));
  return _geo.get(k);
}
function hemisphereDown(r, wseg = null, hseg = 32) {
  wseg ??= arcSegments(r);
  // theta 0 is +y. The LOWER half is thetaStart = PI/2.
  const k = key('hemi', r, wseg, hseg);
  if (!_geo.has(k)) _geo.set(k, new THREE.SphereGeometry(r, wseg, hseg, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
  return _geo.get(k);
}
export function geometryCacheSize() { return _geo.size; }

/** Parts that are scenery, not product. Excluded from the subject box and its guards. */
export const PROPS = new Set(['ceiling_prop']);

/**
 * The bounding box OF THE SUBJECT — not of the scene graph under `root`.
 *
 * THIS EXISTS BECAUSE Box3.setFromObject IGNORES `visible`. The ceiling prop defaults to
 * hidden and is 400 mm across; a plain setFromObject(root) therefore returns a
 * 400 x 62 x 400 box for a 101 x 56 x 101 device, and every framing solve, every framing
 * metric and every containment check downstream would be measuring a tile the viewer cannot
 * even see. It is the same failure the sibling asset shipped with a floating vent slot —
 * a box that describes something other than the object — arriving by a different route.
 *
 * Hidden geometry and declared props are both excluded, because "what the camera must frame"
 * is what is visible and part of the product.
 */
export function subjectBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((m) => {
    if (!m.isMesh || !m.visible || PROPS.has(m.name)) return;
    for (let o = m.parent; o; o = o.parent) if (!o.visible) return;
    box.union(new THREE.Box3().setFromObject(m, true));
  });
  return box;
}

const mesh = (geo, mat, name, y = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.y = y;
  return m;
};

/**
 * Build the camera.
 * @param {Object} mats materials from materials.mjs
 * @returns {{root: THREE.Group, parts: Object, setTilt: Function, setDome: Function, setCeiling: Function}}
 */
export function buildAxisCamera(mats) {
  const root = new THREE.Group();
  root.name = 'camera_root';

  // ── mount base: the part that meets the ceiling ────────────────────────────────
  const mount = new THREE.Group();
  mount.name = 'mount_base';
  root.add(mount);

  // Seated 0.5 mm INTO the ring rather than resting on it. The two abutted exactly, which
  // is a coincident plane wearing the disguise of a join — it produced no shimmer only
  // because both parts share one material, so nothing would ever have flagged it.
  mount.add(mesh(cyl(BODY_DIA / 2, BODY_DIA / 2, BODY_H + 0.0012), mats.housing_white,
                 'base_body', CEILING_Y - (BODY_H + 0.0012) / 2));

  // The collar that covers the ceiling cutout. Wider than the body on purpose — that
  // overhang IS the critical feature; without it the bubble runs straight into the ceiling
  // and the only cue that this is an installed device disappears.
  const ring = mesh(cyl(MOUNT_BASE_DIA / 2, MOUNT_BASE_DIA / 2, RING_H), mats.housing_white,
                    'trim_ring', CEILING_Y - BODY_H - RING_H / 2);
  mount.add(ring);

  // Status indicator, on the underside of the collar where it can actually be seen from
  // below. Colour and position are UNSOURCED — see open_items; this is a placement that
  // reads, not a measurement.
  // Seated HALF IN, HALF PROUD. Sitting it flush put its underside at exactly the ring's
  // underside — two faces of different materials at the same depth, which is a shimmer, not
  // a join. An indicator stands slightly proud of its housing anyway.
  const led = mesh(cyl(LED_DIA / 2, LED_DIA / 2, 0.0012), mats.status_led,
                   'status_led', CEILING_Y - BASE_H);
  led.position.x = MOUNT_BASE_DIA / 2 - 0.010;
  mount.add(led);

  // Wordmark carrier: "AXIS" only, never a model number. At blockout this is a seated slab;
  // the surface pass replaces its face with a CanvasTexture, which is what printing is.
  // MOVED OUT TO THE VISIBLE COLLAR and turned TANGENTIAL.
  //
  // It sat at r = 34.5 mm, which put it straddling the bubble gasket at r = 39.9 mm — a
  // printed mark crossing a rubber seal, which is not where anyone prints anything. The
  // collar between the gasket and the ring's outer edge is 10.6 mm of free annulus, so the
  // plate runs ALONG the arc (long axis in z) instead of radially: 18 mm of text fits
  // tangentially where it could never fit radially.
  //   outer reach sqrt(47.5^2 + 9^2) = 48.3 mm < 50.5 mm ring edge
  //   inner reach 42.5 mm > 39.9 mm gasket
  // ARTWORK ON ONE FACE ONLY. The map goes on group 3 (-y, the face pointing at the viewer
  // of a ceiling device); the other five carry the plain housing material. A single mapped
  // material on a BoxGeometry paints all six groups, which is how the sibling asset grew a
  // red thread down the edge of its logo plate.
  const { texture: markTex } = makeWordmark();
  const markFace = mats.axis_wordmark.clone();
  markFace.name = 'axis_wordmark_face';
  if (markTex) markFace.map = markTex;
  // LONG AXIS IN LOCAL X, then the whole plate rotated 90 degrees to sit tangentially.
  //
  // Built first with the long axis in z, which occupies the same world volume but maps
  // differently: on the -y face of a BoxGeometry, U runs along local X and V along local Z.
  // With the length in z the text had to be rotated into V — and the orientation solve says
  // that reads BOTTOM-TO-TOP on screen, which is exactly what the capture showed. Putting
  // the length in X lets the text run along U with no canvas rotation at all, which the same
  // solve reports as upright in BOTH capture states.
  //
  // The world position and bounding box are unchanged; only the UV axis the lettering
  // follows is different. Rotating the mesh does not change which face is -y, so the artwork
  // stays on the face that points at the viewer of a ceiling device.
  const mark = new THREE.Mesh(box(0.018, 0.0008, 0.005),
                              facedMaterials(markFace, mats.housing_white, 3));
  mark.name = 'axis_wordmark';
  mark.rotation.y = Math.PI / 2;        // local +x -> world -z: tangential to the collar
  mark.position.set(-0.045, CEILING_Y - BASE_H, 0);
  mount.add(mark);

  // ── inner shroud: the matte black cone inside the bubble ───────────────────────
  // Functionally forced. Without it the clear bubble shows the white body's inside, light
  // bounces back into the lens, and the whole thing reads as a light fitting.
  // OPEN-ENDED and DoubleSide: a shroud is a tube, and a capped one would be the opaque lid
  // this asset exists to avoid.
  // Mouth EMBEDDED 0.5 mm into the base rather than flush with it. A tube whose rim lands
  // exactly on the ring's underside shimmers along the whole circumference.
  const shroud = mesh(cyl(SHROUD_MOUTH_DIA / 2, SHROUD_TIP_DIA / 2, SHROUD_H, null, true),
                      mats.shroud_black, 'inner_shroud', BASE_BOTTOM - SHROUD_H / 2 + 0.0012);
  shroud.userData.shell = true;      // open tube — has no interior to be inside of
  shroud.material = mats.shroud_black;
  mats.shroud_black.side = THREE.DoubleSide;
  root.add(shroud);

  // ── lens module: ARTICULATED ───────────────────────────────────────────────────
  // The cradle is the pivot. Tilt and pan are applied to the GROUP so every child moves
  // together and the optical axis can be read straight off its world matrix.
  // HIERARCHY IS THE STRUCTURE HERE, so it mirrors the mechanism:
  //   pan_yoke  rotates in PAN and carries the arms          (the bracket moves with pan)
  //   cradle    rotates in TILT and carries the optics       (the module swings in the yoke)
  // Hanging both off one group would have the support arms tilting with the thing they are
  // supposed to be holding, which is not a mechanism, it is a rigid body.
  const panYoke = new THREE.Group();
  panYoke.name = 'pan_yoke';
  panYoke.position.set(0, BASE_BOTTOM - YOKE_DROP, 0);
  root.add(panYoke);

  // The arms, in their OWN group.
  //
  // Not parented straight to pan_yoke, because pan_yoke is also the parent of the cradle —
  // so a hotspot addressing `pan_yoke` addresses a node that CONTAINS the lens module, and
  // every point sampled on it lands on the optics instead. The interaction check caught it:
  // the yoke reported unreachable, blocked by `lens`, from every angle. Overlapping hotspot
  // subtrees are ambiguous by construction; giving the arms their own group makes the two
  // addressable independently.
  const yokeArms = new THREE.Group();
  yokeArms.name = 'yoke_arms';
  panYoke.add(yokeArms);

  // They reach UP from the tilt axis into the base plate, overlapping it by 0.5 mm so the
  // joint is seated rather than touching.
  for (const sign of [-1, 1]) {
    const arm = mesh(box(YOKE_ARM_T, YOKE_DROP + 0.0005, YOKE_ARM_W),
                     mats.lens_barrel, sign < 0 ? 'yoke_arm_l' : 'yoke_arm_r',
                     (YOKE_DROP + 0.0005) / 2);
    arm.position.x = sign * YOKE_ARM_X;
    yokeArms.add(arm);
  }

  const cradle = new THREE.Group();
  cradle.name = 'lens_module';
  panYoke.add(cradle);

  // TAPERED, 30 mm at the back to 19 mm at the front — not a plain cylinder.
  //
  // As a straight 30 mm tube this module OCCLUDED ITS OWN LENS. Tilt it 22 degrees and the
  // rim of a 15 mm radius drops 15·sin22 = 5.6 mm, while a 7 mm lens standing 1.4 mm proud
  // only reaches 4.0 mm: the barrel's own edge hung BELOW the glass and blocked every
  // oblique sightline to it. The AABBs said it plainly — barrel to y=-50.5 mm, glass only
  // to -48.8 mm.
  //
  // Real optical modules taper toward the front element for the same geometric reason. This
  // is the physical fix; narrowing the front lifts the rim clear of the lens it surrounds.
  const barrel = mesh(cyl(LENS_MODULE_DIA / 2, 0.0095, LENS_MODULE_LEN),
                      mats.lens_barrel, 'lens_barrel', -LENS_MODULE_LEN / 2);
  cradle.add(barrel);

  // A RETAINING RING IS A RING — OPEN-ENDED, so the element shows through it.
  //
  // Built first as a solid cylinder of larger radius sitting at the same depth as the glass,
  // which meant it ENCLOSED the element completely: 8.8 mm of opaque metal wrapped around a
  // 7 mm lens that was thereby invisible from every angle. The framing check caught it by
  // firing a ray at the optics and finding lens_ring in the way.
  //
  // That is the opaque-lid failure again, now at the scale of the optics: a part that seals
  // the very thing the asset exists to show, while every count, envelope and containment
  // check reports it present and correct.
  // 3.0 -> 1.2 mm TALL, and the element now sits PROUD of it rather than sunk inside.
  //
  // Opening the ring was necessary but not sufficient. At 3 mm tall around a 14 mm lens this
  // was a lens HOOD, not a retaining ring, and the framing check measured the consequence:
  // from the hero angle — 51 degrees off the optical axis — 0 of 130 sampled points on the
  // element could be reached, because every sightline crossed the tube wall. From the
  // near-axial `under` view it read 92%, which is exactly how this hides: the state that
  // looks straight at it sees it perfectly.
  //
  // A real retaining ring is thin and the front element stands slightly proud of it. Both
  // corrections are physical, not compositional — the geometry was wrong, so the geometry
  // changed, rather than moving the camera to an angle that flattered it.
  const lring = mesh(cyl(LENS_GLASS_DIA / 2 + 0.0012, LENS_GLASS_DIA / 2 + 0.0012, 0.0012, null, true),
                     mats.lens_ring, 'lens_ring', -LENS_MODULE_LEN - 0.0004);
  lring.userData.shell = true;
  cradle.add(lring);

  // Standing 0.2 mm proud of the ring's mouth — proud, not flush, because two faces at the
  // same depth is a shimmer rather than a join.
  // Standing 1.5 mm PROUD of the ring's mouth. Any ring wider than the lens occludes it at
  // an oblique angle unless the lens reaches past it — so the clearance is bought with the
  // element's projection, not by shrinking the ring into invisibility.
  const glass = mesh(cyl(LENS_GLASS_DIA / 2, LENS_GLASS_DIA / 2, 0.0030),
                     mats.lens_glass, 'lens_glass', -LENS_MODULE_LEN - 0.0015);
  cradle.add(glass);

  // Trunnions: the stubs that make the tilt axis a physical thing rather than a transform.
  // They belong to the MODULE and turn inside the arms, so they are children of the cradle.
  for (const sign of [-1, 1]) {
    const tr = new THREE.Mesh(cyl(TRUNNION_R, TRUNNION_R, TRUNNION_LEN), mats.lens_ring);
    tr.name = sign < 0 ? 'trunnion_l' : 'trunnion_r';
    tr.rotation.z = Math.PI / 2;                 // lie along local x — the tilt axis
    tr.position.x = sign * (YOKE_ARM_X - 0.0004);
    cradle.add(tr);
  }

  // ── the bubble ─────────────────────────────────────────────────────────────────
  // Centred on the base plane so its equator meets the ring tangentially and its apex lands
  // exactly at the published total height.
  // GASKET FIRST. At blockout the bubble's rim ended exactly where the base ended — an
  // abutment, not a joint, and the contact check reported the bubble touching nothing. A
  // real dome seats its bubble in a compressible gasket; this one overlaps both parts.
  // Sized to HUG THE BUBBLE'S RIM (0.4 mm outside it) and reach up into the ring by 2.2 mm.
  // The first attempt sat 1.6 mm clear of the bubble and touched nothing but the status LED
  // — a gasket sealing a gap it did not span.
  const gasket = mesh(cyl(BUBBLE_R + 0.0004, BUBBLE_R + 0.0004, GASKET_H + 0.0008, null, true),
                      mats.shroud_black, 'bubble_gasket', BASE_BOTTOM + 0.0007);
  gasket.userData.shell = true;
  mount.add(gasket);

  const bubble = mesh(hemisphereDown(BUBBLE_R), mats.dome_clear, 'dome_bubble', BASE_BOTTOM);
  bubble.userData.shell = true;      // an open hemisphere, not a ball
  root.add(bubble);

  // ── context prop, default OFF ──────────────────────────────────────────────────
  // A dome floating in space is ORIENTATION-AMBIGUOUS: it reads equally as a dome sitting on
  // a table, which is a different object. This resolves it, and is toggleable so it can
  // never be mistaken for the product.
  const ceiling = new THREE.Mesh(box(0.40, 0.006, 0.40), mats.ceiling_prop_tile);
  ceiling.name = 'ceiling_prop';
  // Lifted 0.4 mm clear of the ceiling plane. Its underside sat exactly on the body's top
  // face, and two coincident faces shimmer whether or not one of them is scenery. At this
  // subject's scale 0.4 mm is 0.4% of the diameter — invisible in any capture, and the prop
  // is context rather than product, so the tiny gap costs nothing it was there to buy.
  ceiling.position.y = CEILING_Y + 0.0004 + 0.003;
  ceiling.visible = false;
  root.add(ceiling);

  // ── state ──────────────────────────────────────────────────────────────────────
  const state = { tilt: LENS_TILT_DEG, pan: LENS_PAN_DEG, dome: true, ceiling: false };
  // SIGN AND PAN BOTH MATTER, and both were wrong.
  //
  // rotateX(+deg) on a down-pointing axis tilts it toward -z. The hero camera stands at +z,
  // so the lens was aimed AWAY from the only angle the asset is captured from: the front
  // element's visible-surface count came out 0 of 0 — not occluded, simply facing backwards.
  // Nothing else could see it. The envelope was right, containment was right, the tilt
  // magnitude was right, and the camera was looking at the back of the lens.
  //
  // The pan default moves 0 -> 35 to match the hero azimuth (spec confidence: low, so it is
  // pre-authorised to refine). An installed camera points down the aisle it watches, and the
  // hero stands in that aisle — so aiming the optics at the viewer is what the device does,
  // not a pose chosen to flatter the shot.
  // PAN GOES ON THE YOKE, TILT ON THE CRADLE. Splitting them is the whole reason the yoke
  // exists as its own group, and the first version got it wrong: it applied BOTH to the
  // cradle, so the support arms stayed put while the module swung 35 degrees away from them
  // and the trunnions — the parts that are supposed to ride IN the arms — left their
  // bearings entirely. The contact graph found it: trunnions touching the barrel and
  // nothing else.
  //
  // A hierarchy that names a mechanism it does not implement is worse than no hierarchy,
  // because the names invite you to assume the behaviour.
  function applyPose() {
    panYoke.rotation.set(0, (state.pan * Math.PI) / 180, 0);
    cradle.rotation.set((-state.tilt * Math.PI) / 180, 0, 0);
    panYoke.updateMatrixWorld(true);
  }
  function setTilt(deg) { state.tilt = deg; applyPose(); }
  function setPan(deg) { state.pan = deg; applyPose(); }
  function setDome(on) { state.dome = !!on; bubble.visible = !!on; }
  function setCeiling(on) { state.ceiling = !!on; ceiling.visible = !!on; }
  setTilt(LENS_TILT_DEG);

  const parts = { mount, ring, led, mark, gasket, shroud, panYoke, cradle, barrel, lring, glass, bubble, ceiling };
  return { root, parts, state, setTilt, setPan, setDome, setCeiling };
}

// ═══ GUARDS ══════════════════════════════════════════════════════════════════════
// All report with console.error. NEVER console.assert — the QA gate cannot see it, and a
// guard the gate cannot see has already passed a build over floating geometry in this run.

/** World-space vertex sample of a mesh — the honest way to ask where a part actually is. */
function sampleVerts(m, stride = 7) {
  const pos = m.geometry?.attributes?.position;
  if (!pos) return [];
  const out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += stride) {
    out.push(v.fromBufferAttribute(pos, i).clone().applyMatrix4(m.matrixWorld));
  }
  return out;
}

/**
 * CYLINDRICAL containment. The envelope of this subject is a disc of radius 50.5 mm hanging
 * 56 mm below the ceiling — NOT a box. An axis-aligned box would leave the corners free, and
 * a part sitting in a corner is outside the real device while inside the checked volume.
 *
 * The sibling asset shipped a slot floating 18.7 mm below its chassis through six passes
 * because nothing ever asked whether each part was ON the device. This asks.
 */
export function verifyPartsAreInsideTheEnvelope(root) {
  root.updateMatrixWorld(true);          // ancestors do NOT refresh themselves
  const R = MOUNT_BASE_DIA / 2 + 1e-4;
  let bad = 0;
  root.traverse((m) => {
    if (!m.isMesh || m.name === 'ceiling_prop') return;   // the prop is scenery, not the product
    for (const p of sampleVerts(m)) {
      const r = Math.hypot(p.x, p.z);
      if (r > R) {
        console.error(`[axis] ${m.name} reaches r=${(r * 1000).toFixed(1)} mm, outside the ${(R * 1000).toFixed(1)} mm envelope`);
        bad += 1; return;
      }
      if (p.y > CEILING_Y + 1e-4 || p.y < APEX_Y - 1e-4) {
        console.error(`[axis] ${m.name} at y=${(p.y * 1000).toFixed(1)} mm is outside [${(APEX_Y * 1000).toFixed(1)}, 0]`);
        bad += 1; return;
      }
    }
  });
  return bad;
}

/**
 * Every INTERIOR part must fit the hemisphere AT ITS OWN DEPTH. Fitting inside the overall
 * envelope is a far weaker claim: a part can satisfy it while poking through the bubble wall.
 */
export function verifyInteriorFitsInsideBubble(root) {
  root.updateMatrixWorld(true);
  // The structural pass added four load-bearing parts INSIDE the bubble, and a support that
  // punches through the wall it is mounted behind is no better than an optic that does. The
  // list grows with the assembly; a containment check that still names only the blockout's
  // parts is a check that quietly stopped covering the object.
  const INTERIOR = ['inner_shroud', 'lens_barrel', 'lens_ring', 'lens_glass',
                    'yoke_arm_l', 'yoke_arm_r', 'trunnion_l', 'trunnion_r'];
  let bad = 0;
  for (const name of INTERIOR) {
    const m = root.getObjectByName(name);
    if (!m) { console.error(`[axis] interior part ${name} missing`); bad += 1; continue; }
    for (const p of sampleVerts(m, 3)) {
      if (p.y > BASE_BOTTOM) continue;                 // above the equator it is inside the base
      const r = Math.hypot(p.x, p.z);
      const limit = bubbleRadiusAt(p.y);
      if (r > limit - 1e-4) {
        console.error(`[axis] ${name} punches through the bubble: r=${(r * 1000).toFixed(1)} mm ` +
                      `vs wall ${(limit * 1000).toFixed(1)} mm at y=${(p.y * 1000).toFixed(1)} mm`);
        bad += 1; break;
      }
    }
  }
  return bad;
}

/**
 * ORIENTATION. A ceiling camera hangs. This is the check a bubble-up product-shot model
 * fails and every other check passes — the failure is not a defect in any part, it is the
 * whole object being the wrong way up.
 */
export function verifyDomeHangsBelowMount(root) {
  root.updateMatrixWorld(true);
  let bad = 0;
  const b = new THREE.Box3().setFromObject(root.getObjectByName('dome_bubble'), true);
  const r = new THREE.Box3().setFromObject(root.getObjectByName('trim_ring'), true);
  if (b.max.y > r.min.y + 1e-4) {
    console.error('[axis] the bubble is not below the trim ring — the camera is inverted');
    bad += 1;
  }
  if (Math.abs(b.min.y - APEX_Y) > 5e-4) {
    console.error(`[axis] apex at ${(b.min.y * 1000).toFixed(1)} mm, expected ${(APEX_Y * 1000).toFixed(1)} mm`);
    bad += 1;
  }
  return bad;
}

/**
 * THE ASSET'S DEFINING CLAIM: the bubble is see-through AND there is something behind it.
 *
 * Either half alone is worthless. A transparent material over an empty cavity is a hollow
 * shell that photographs fine; solid optics behind an opaque cap is a smoke detector. This
 * asserts both, and that the bubble does not write depth — a transparent surface with
 * depthWrite on occludes everything drawn after it, which is exactly the opaque-lid failure
 * wearing a transparent material.
 */
export function verifyBubbleRevealsInterior(root) {
  root.updateMatrixWorld(true);
  let bad = 0;
  const bubble = root.getObjectByName('dome_bubble');
  if (!bubble) { console.error('[axis] no bubble'); return 1; }
  const mat = bubble.material;
  if (!mat.transparent || mat.opacity >= 0.95) {
    console.error(`[axis] the bubble is not transparent (transparent=${mat.transparent} opacity=${mat.opacity})`);
    bad += 1;
  }
  if (mat.depthWrite) {
    console.error('[axis] the bubble writes depth — it would occlude the optics it must reveal');
    bad += 1;
  }
  if (mat.side !== THREE.DoubleSide) {
    console.error('[axis] the bubble is single-sided — its far wall would vanish and it would read as a bowl');
    bad += 1;
  }
  // And there must actually BE an interior inside the hemisphere.
  const inside = ['inner_shroud', 'lens_barrel', 'lens_glass']
    .map((n) => root.getObjectByName(n)).filter(Boolean);
  if (inside.length < 3) {
    console.error(`[axis] only ${inside.length}/3 interior parts exist — a clear dome over nothing`);
    bad += 1;
  }
  return bad;
}

/**
 * The lens must be OFF-AXIS. A lens pointing straight down at the exact centre of a dome is
 * what a smoke detector or a downlight looks like; the tilt is the identity cue.
 */
export function verifyLensIsOffAxis(root, minDeg = 10) {
  root.updateMatrixWorld(true);
  const cradle = root.getObjectByName('lens_module');
  if (!cradle) { console.error('[axis] no lens cradle'); return 1; }
  const axis = new THREE.Vector3(0, -1, 0).applyQuaternion(
    cradle.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const deg = THREE.MathUtils.radToDeg(axis.angleTo(new THREE.Vector3(0, -1, 0)));
  if (deg < minDeg) {
    console.error(`[axis] optical axis is only ${deg.toFixed(1)} deg off vertical — reads as a detector, not a camera`);
    return 1;
  }
  return 0;
}

/** Coplanar opaque faces of DIFFERENT materials shimmer. Same material cannot. */
export function verifyNoCoincidentPlanes(root, tol = 0.00002) {
  root.updateMatrixWorld(true);
  const boxes = [];
  root.traverse((m) => {
    if (!m.isMesh || m.material?.transparent || PROPS.has(m.name)) return;
    boxes.push({ name: m.name, mat: m.material, box: new THREE.Box3().setFromObject(m, true) });
  });
  let bad = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxes[i].mat === boxes[j].mat) continue;
      const a = boxes[i].box; const b = boxes[j].box;
      const overlapXZ = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 0.002
                     && Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > 0.002;
      if (!overlapXZ) continue;
      for (const [ya, yb] of [[a.max.y, b.max.y], [a.min.y, b.min.y], [a.max.y, b.min.y], [a.min.y, b.max.y]]) {
        if (Math.abs(ya - yb) < tol) {
          console.error(`[axis] coincident horizontal faces: ${boxes[i].name} / ${boxes[j].name} at y=${ya.toFixed(5)}`);
          bad += 1;
        }
      }
    }
  }
  return bad;
}

/**
 * Minimum distance from a world-space point to a mesh's SURFACE.
 *
 * Point-to-surface, not point-to-vertex, and the distinction decides the answer. Vertex
 * distance cannot see interpenetration at all: a stud embedded 0.6 mm into a ring has no
 * vertex anywhere near the ring's vertices, so a vertex test calls a solid joint "floating".
 * Nor can bounding boxes help — the AABB of a cone CONTAINS ITS OWN EMPTY INTERIOR, so box
 * overlap calls a module suspended in mid-air "in contact" with the shroud around it. The
 * two naive tests fail in opposite directions; only the surface distance is right in both.
 */
function distanceToSurface(p, mesh, triStride = 1) {
  const g = mesh.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const n = idx ? idx.count : pos.count;
  let min = Infinity;
  for (let i = 0; i + 2 < n; i += 3 * triStride) {
    const i0 = idx ? idx.getX(i) : i;
    const i1 = idx ? idx.getX(i + 1) : i + 1;
    const i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
    tri.set(a, b, c);
    tri.closestPointToPoint(p, closest);
    const d = closest.distanceTo(p);
    if (d < min) min = d;
    if (min === 0) return 0;
  }
  return min;
}

/**
 * Is a world point INSIDE a closed mesh? Ray-parity, counting every triangle crossing with
 * backface culling off.
 *
 * Needed because surface distance alone fails in the opposite direction from bounding boxes:
 * when one part is FULLY SWALLOWED by another — a body seated 1.2 mm into a ring that is
 * 2 mm thicker in every direction — its surfaces are nowhere near the other's, and a
 * distance test calls the most solid joint in the assembly "floating". Deepening the embed
 * makes that worse, not better, which is the tell that the test was measuring the wrong
 * property.
 *
 * ONLY for closed solids. Run on the open shroud it would call the module suspended in its
 * middle "inside" it, resurrecting exactly the false contact this whole guard exists to
 * avoid — so shells are tagged at construction and skipped here.
 */
function isInside(p, mesh) {
  if (mesh.userData.shell) return false;
  const g = mesh.geometry;
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
    a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
    if (ray.intersectTriangle(a, b, c, false, hit)) crossings += 1;
  }
  return crossings % 2 === 1;
}

/** Do two parts touch or interpenetrate? Symmetric: surface proximity OR containment. */
export function partsTouch(m1, m2, tol = 0.0005) {
  const v = new THREE.Vector3();
  for (const [from, to] of [[m1, m2], [m2, m1]]) {
    const pos = from.geometry.attributes.position;
    // ADAPTIVE. A fixed stride is a sampling density chosen for the biggest mesh and applied
    // to the smallest: a 24-segment trunnion sampled every 4th vertex reported no contact
    // with the arm it literally sits inside. Sample small parts exhaustively.
    const stride = Math.max(1, Math.floor(pos.count / 96));
    for (let i = 0; i < pos.count; i += stride) {
      const p = v.fromBufferAttribute(pos, i).clone().applyMatrix4(from.matrixWorld);
      if (distanceToSurface(p, to, 1) <= tol) return true;
      if (isInside(p, to)) return true;
    }
  }
  return false;
}

/**
 * NOTHING MAY FLOAT. Every part must reach the mount base through a chain of real contacts.
 *
 * This is the guard the sibling asset did not have. A vent slot hung 18.7 mm below its
 * chassis for six passes and three gates because every check asked "is it inside the
 * envelope?" and none asked "is it attached to anything?". A part can be perfectly within
 * bounds, correctly sized, correctly named, and connected to nothing.
 */
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
  // Flood from the parts that ARE the mounting: everything else must be reachable.
  const seen = new Set(['trim_ring', 'base_body'].filter((n) => adj.has(n)));
  const queue = [...seen];
  while (queue.length) {
    for (const nb of adj.get(queue.pop()) ?? []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  let bad = 0;
  for (const m of parts) {
    if (!seen.has(m.name)) {
      console.error(`[axis] ${m.name} is not connected to the mount — it floats`);
      bad += 1;
    }
  }
  return bad;
}

/**
 * A MAPPED MATERIAL MUST NOT SIT ON A MULTI-GROUP GEOMETRY AS A SINGLE MATERIAL.
 *
 * BoxGeometry has six material groups. Assign one mapped material to it and the artwork is
 * painted on every face — the sibling asset shipped a hero with a red thread running down
 * the side of its logo plate for exactly this reason, and it took elimination to find
 * because no count, envelope or contact check can see a texture on the wrong face.
 */
export function verifyNoWrapAroundTextures(root) {
  root.updateMatrixWorld(true);
  let bad = 0;
  root.traverse((m) => {
    if (!m.isMesh) return;
    const groups = m.geometry.groups?.length ?? 0;
    if (groups <= 1) return;
    if (Array.isArray(m.material)) return;          // per-face assignment: correct
    if (m.material.map) {
      console.error(`[axis] ${m.name}: a mapped material on ${groups} geometry groups — the artwork wraps every face`);
      bad += 1;
    }
  });
  return bad;
}

/** Run every guard. Returns total failures. */
export function verifyAll(root) {
  const n = verifyDerivations()
    + verifyNothingFloats(root)
    + verifyPartsAreInsideTheEnvelope(root)
    + verifyInteriorFitsInsideBubble(root)
    + verifyDomeHangsBelowMount(root)
    + verifyBubbleRevealsInterior(root)
    + verifyLensIsOffAxis(root)
    + verifyNoCoincidentPlanes(root)
    + verifyNoWrapAroundTextures(root);
  if (n === 0) console.log('[axis] built · guards passed');
  return n;
}
