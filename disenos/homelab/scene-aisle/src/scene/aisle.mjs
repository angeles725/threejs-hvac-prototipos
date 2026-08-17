// aisle.mjs — the assembly (P4 BLOCKOUT).
//
// THIS ASSET NESTS OTHER ASSETS. Every device is imported from ITS OWN folder by relative
// path, never copied here, so there is exactly one source of truth per device and a fix in a
// device reaches the scene automatically. The importmap resolves `three` once, from this
// folder's vendor, so all six builders share a single three.js instance — two copies would
// mean instanceof checks failing silently across the boundary.
//
// AND THE SCENE AUTHORS NO DEVICE DETAIL. Each device brings its own gated material contract,
// its own guards and its own interaction API. If a device reads wrong in context that is a
// defect in the asset that owns it — reopened with approval, never patched here. A scene that
// restates a device's colours becomes a second source of truth, and the first drift lands there.

import * as THREE from 'three';
import { buildRackCabinet, LED_COLORS } from '../../../src/scene/rack-cabinet.mjs';
import { buildUPS } from '../../../ups-panduit/src/scene/ups-panduit.mjs';
import { buildStratix } from '../../../stratix-5700/src/scene/stratix.mjs';
import { buildPduPair } from '../../../pdu-panduit/src/scene/pdu-strip.mjs';
import { buildFMPS } from '../../../fmps-panduit/src/scene/fmps-panduit.mjs';
import { createMaterials as fmpsMaterials } from '../../../fmps-panduit/src/scene/materials.mjs';
import { buildAxisCamera } from '../../../axis-camera/src/scene/axis-camera.mjs';
import { createMaterials as axisMaterials } from '../../../axis-camera/src/scene/materials.mjs';
import { buildCorridor, buildHumanFigure, createCorridorMaterials, verifyCorridorEnclosesTheAisle,
         verifyLoungeStaysBehindTheGlass, verifyCeilingFittingsAreAttached,
         verifyNoSurfaceRendersAsAHole, verifySkylineReadsAsSilhouette,
         verifyLuminairesKeepTheirOwnHue, verifyRigAgreesWithItsPracticals } from './corridor.mjs';
import {
  AISLE_WIDTH, AISLE_LENGTH, CEILING_H, RACKS_PER_SIDE, RACK_PITCH,
  RACK_W, RACK_H, RACK_D, UPS_U_POS, FMPS_U_POS, uToY, verifyDerivations,
} from './dims.mjs';

/**
 * THE SIX ASSETS DO NOT SHARE A BUILDER CONVENTION, and assembly is the only place that shows.
 *
 * Two shapes exist in this codebase:
 *   SCENE-ADDING   build(scene)  — creates its own root and calls scene.add(root) internally.
 *                  rack-cabinet, ups-panduit, stratix-5700, pdu-panduit.
 *   ROOT-RETURNING build(mats)   — takes materials, adds nothing, returns { root, ... }.
 *                  fmps-panduit, axis-camera.
 *
 * Neither is wrong and each is fine in isolation, which is exactly why the divergence survived
 * six gates: nothing before now had to call more than one of them. Handling it with a single
 * helper that "just works" would hide it, so the two are named and separate — a reader
 * integrating a seventh asset needs to know both shapes exist.
 */
function mountSceneAdding(name, buildFn) {
  const holder = new THREE.Group();
  holder.name = name;
  const api = buildFn(holder);        // the builder adds its root into the holder
  return { holder, api };
}

function mountRootReturning(name, buildFn, mats) {
  const holder = new THREE.Group();
  holder.name = name;
  const api = buildFn(mats);
  if (!api?.root?.isObject3D) {
    console.error(`[aisle] ${name}: expected a root-returning builder, got ${typeof api}`);
    return { holder, api };
  }
  holder.add(api.root);
  return { holder, api };
}

/**
 * Bounding box of the VISIBLE geometry under a node.
 *
 * Box3.setFromObject IGNORES `visible`, and two assets carry hidden state geometry — the
 * dome's 400 mm ceiling prop and the FMPS's blanking plates. Measuring with them included
 * reports a 101 mm camera as 400 mm across and calls it a scale error. Learned on the dome;
 * it costs nothing to carry here and would have cost a false alarm not to.
 */
function visibleBox(node) {
  node.updateMatrixWorld(true);
  const b = new THREE.Box3();
  node.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    for (let o = m.parent; o; o = o.parent) if (!o.visible) return;
    b.union(new THREE.Box3().setFromObject(m, true));
  });
  return b;
}

/**
 * Place a mounted device by its MEASURED bounding box rather than by its origin.
 *
 * THE SIX ASSETS DO NOT SHARE AN ORIGIN CONVENTION, and this is the second divergence that
 * only assembly reveals. Measured:
 *   rack-cabinet  base at y=0        ups-panduit  base at y=0
 *   fmps-panduit  CENTRED in y       stratix-5700 centred, roughly
 *   axis-camera   ceiling plane at y=0, hanging below
 *   pdu-panduit   y offset -108 mm, x offset 21 mm
 *
 * Every one is reasonable for the asset that chose it. None is wrong. But mounting a device
 * "at rack unit N" means putting its BOTTOM at that height, and a caller who assumes the
 * origin is the bottom will float three of the six. So the placement measures what it is
 * placing instead of trusting a convention that was never agreed.
 */
function seat(holder, { bottomY, centreX = 0, frontZ = null }) {
  // MEASURE IN THE SPACE YOU ARE ABOUT TO CORRECT IN.
  //
  // The first version measured the holder's WORLD box and then adjusted holder.position,
  // which is LOCAL to its parent. That works only while no rotation sits between the two —
  // and the hero cabinet is turned 90 degrees to face the aisle, so a +x local nudge moves
  // the device along world -z and the correction lands sideways. The rack's box came out
  // 1789 mm wide where the cabinet is 1146, with the equipment pushed out of its own frame.
  //
  // So the content is measured in the HOLDER'S OWN space: world matrices, brought back
  // through the holder's inverse. Then the correction and the measurement are in the same
  // frame and rotation is irrelevant.
  holder.updateMatrixWorld(true);
  const toLocal = holder.matrixWorld.clone().invert();
  const b = new THREE.Box3();
  const v = new THREE.Vector3();
  holder.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    for (let o = m.parent; o && o !== holder; o = o.parent) if (!o.visible) return;
    const pos = m.geometry.attributes.position;
    const mat = m.matrixWorld.clone().premultiply(toLocal);
    for (let i = 0; i < pos.count; i += 1) {
      b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(mat));
    }
  });
  if (b.isEmpty()) { console.error(`[aisle] ${holder.name} has no visible geometry to seat`); return; }
  holder.position.y += bottomY - b.min.y;
  holder.position.x += centreX - (b.min.x + b.max.x) / 2;
  if (frontZ !== null) holder.position.z += frontZ - b.max.z;
  holder.updateMatrixWorld(true);
}

export function buildAisle() {
  const root = new THREE.Group();
  root.name = 'scene_root';

  // ── the corridor first, so everything else can be seated against its floor ─────
  const corridorMats = createCorridorMaterials();
  const corridor = buildCorridor(corridorMats);
  root.add(corridor.root);

  // ── the two facing rows ────────────────────────────────────────────────────────
  // The first authoring put ONE row here, from a description that said "several cabinets in a
  // row". The photographs show two rows facing each other across the aisle — accurate words,
  // wrong picture.
  const cabinets = [];
  const cabinetApis = [];    // each cabinet's own door/LED handles — the scene drives state
                             // THROUGH the asset's API rather than reaching into its meshes.
  const rowZ0 = -((RACKS_PER_SIDE - 1) * RACK_PITCH) / 2;
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const row = new THREE.Group();
    row.name = `aisle_${side}`;
    root.add(row);
    for (let i = 0; i < RACKS_PER_SIDE; i += 1) {
      const { holder, api } = mountSceneAdding(`rack_${side}_${i}`, buildRackCabinet);
      cabinetApis.push(api);
      // WHITE AND BLACK CABINETS ALTERNATE. site-01 and site-07 both show dark cabinets
      // standing between white ones — the blockout built six identical white frames.
      //
      // Applied THROUGH the asset's own FRAME_VARIANTS, not by inventing colours here: the
      // variant is one the rack already declares, so the scene is selecting from the device's
      // contract rather than writing a second one. That is the line the no-redeclare rule
      // draws — choosing a declared option is not authoring a new material.
      if ((i + (side === 'right' ? 1 : 0)) % 3 === 1 && api?.FRAME_VARIANTS) {
        const v = api.FRAME_VARIANTS.black;
        api.frameMat?.color.set(v.frame);
        api.plinthMat?.color.set(v.plinth);
        api.panelMat?.color.set(v.panel);
        api.rearPanelMat?.color.set(v.panel);
      }

      // THE DOOR LEDS ARE THE DOMINANT VISUAL IN BOTH site-01 AND site-05, and they are NOT
      // all one colour: the reference shows green-cyan strips in some cabinets standing beside
      // blue and white ones. Driven through the rack's own LED_COLORS and ledMat/ledGlowMat,
      // for the same reason the frame variant is — the asset already declares this axis, so
      // selecting a value on it is using its contract rather than writing a second one.
      //
      // Deterministic by index, never random: a scene whose lighting reshuffles between
      // captures cannot be compared against its own previous attempt.
      const led = LED_COLORS[(i * 2 + (side === 'right' ? 1 : 0)) % LED_COLORS.length];
      api?.ledMat?.emissive?.set(led.hex);
      api?.ledGlowMat?.color?.set(led.hex);
      // Turn first, THEN measure. The cabinet's own bbox is not symmetric about its origin
      // (its doors reach 63 mm further one way), so a placement computed before the rotation
      // is a placement of a shape that no longer exists.
      holder.rotation.y = sign < 0 ? Math.PI / 2 : -Math.PI / 2;
      holder.position.set(0, 0, rowZ0 + i * RACK_PITCH);
      row.add(holder);
      holder.updateMatrixWorld(true);
      const rb = visibleBox(holder);
      // Push it back until its aisle-facing edge lands exactly on the aisle boundary.
      const aisleEdge = sign * (AISLE_WIDTH / 2);
      holder.position.x += aisleEdge - (sign < 0 ? rb.max.x : rb.min.x);
      holder.updateMatrixWorld(true);
      cabinets.push(holder);
    }
  }

  // ── the populated cabinet ──────────────────────────────────────────────────────
  // One of the six carries the real equipment. The others stand as built — which is what the
  // photographs show: cabinets of cabling and patch panels, not of our five devices.
  const hero = cabinets[RACKS_PER_SIDE];        // first cabinet of the right-hand row
  hero.name = 'hero_rack';

  // THE HERO GETS THE GLASS DOOR (the rack's Variant B, which it already builds and leaves
  // hidden). site-05 shows glass-fronted cabinets beside the mesh-fronted ones, so this is
  // reference-backed rather than convenient — but it is also what makes the carried-over
  // transparency rule LOAD-BEARING instead of theoretical. The whole point of that rule is
  // that someone looking at the UPS through a glass door must be able to click it, and with
  // every door opaque there was no pane in front of any device to exercise it. A rule nothing
  // exercises is not known to work.
  const heroApi = cabinetApis[RACKS_PER_SIDE];
  if (heroApi?.glassDoor && heroApi?.meshDoor) {
    heroApi.glassDoor.visible = true;
    heroApi.meshDoor.visible = false;      // two doors in the same plane is one door too many
  } else {
    console.error('[aisle] the hero cabinet exposes no door variants — the transparency rule '
      + 'would go untested');
  }
  const equipment = new THREE.Group();
  equipment.name = 'rack_equipment';
  hero.add(equipment);

  // Devices are placed in the HERO'S local frame, so they turn with it. Mounting them in
  // world space and hoping the numbers line up is how equipment ends up floating beside a
  // cabinet that was rotated after the fact.
  //
  // AND THE RAILS ARE MEASURED OFF THE CABINET, not assumed to be at local zero. The cabinet's
  // own geometry is not centred on its origin either — its bbox runs x[-310, 310] but
  // z[-510, 636], because the door reaches further one way. Treating local x=0 as "the middle
  // of the rack" pushed the whole equipment stack 643 mm out through the cabinet's side,
  // which is the same mistake as assuming a device's origin is its base, one level in.
  const cabBox = (() => {
    hero.updateMatrixWorld(true);
    const toLocal = hero.matrixWorld.clone().invert();
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    const rackRoot = hero.getObjectByName('rack_root');
    (rackRoot ?? hero).traverse((m) => {
      if (!m.isMesh || !m.visible) return;
      const pos = m.geometry.attributes.position;
      const mat = m.matrixWorld.clone().premultiply(toLocal);
      for (let i = 0; i < pos.count; i += 1) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(mat));
    });
    return b;
  })();
  const railX = (cabBox.min.x + cabBox.max.x) / 2;   // the cabinet's real centreline
  const railZ = cabBox.max.z - 0.10;                 // just inside its real front face

  const ups = mountSceneAdding('mounted_ups', buildUPS);
  equipment.add(ups.holder);

  // THE UPS SHIPPED INTO THIS SCENE POWERED DOWN. Its LCD and status LEDs are authored with
  // real emissive colours (#ffffff and #20c020) but emissiveIntensity 0, and the asset's own
  // source says so in as many words: "off by default; set to 1.4 when power=on". Standalone,
  // its main.js starts at power:'on' and applies 1.4 / 1.15. The scene mounted the device and
  // never threw that switch, so for every pass since blockout the hero cabinet has carried a
  // UPS with a dead screen — which is most of why its front reads as an unreadable black
  // slab. It is not primarily a lighting problem: a lit LCD reads on its own.
  //
  // The values are the ASSET'S, not invented here — the same line as FRAME_VARIANTS and
  // LED_COLORS. Selecting a declared state is using the contract; picking a brightness that
  // looked nice would be authoring a second one.
  const UPS_POWER_ON = { led: 1.4, lcd: 1.15 };     // from ups-panduit/main.js applyPowerState
  if (ups.api?.ledMat && ups.api?.lcdMat) {
    ups.api.ledMat.emissiveIntensity = UPS_POWER_ON.led;
    ups.api.lcdMat.emissiveIntensity = UPS_POWER_ON.lcd;
  } else {
    console.error('[aisle] the UPS exposes no ledMat/lcdMat — it will render powered down');
  }
  seat(ups.holder, { bottomY: uToY(UPS_U_POS), centreX: railX, frontZ: railZ });

  const fmps = mountRootReturning('mounted_fmps', buildFMPS, fmpsMaterials());
  equipment.add(fmps.holder);
  seat(fmps.holder, { bottomY: uToY(FMPS_U_POS), centreX: railX, frontZ: railZ });

  // The Stratix is DIN-rail, not rack-mounted — it does not consume a U. It sits on a rail
  // inside the cabinet, which is why it has no U assignment in the spec.
  const stratix = mountSceneAdding('mounted_stratix', buildStratix);
  equipment.add(stratix.holder);
  seat(stratix.holder, { bottomY: uToY(20), centreX: railX - 0.14, frontZ: railZ - 0.02 });

  // The PDU pair: BLUE (A) and RED (B), vertical, SIDE BY SIDE in the interior plane and
  // revealed when the front door opens. site-08 corrected this — the first authoring had them
  // on opposite rear posts, which is a real configuration but not this site's.
  const pdu = mountSceneAdding('mounted_pdu_pair', buildPduPair);
  equipment.add(pdu.holder);
  seat(pdu.holder, { bottomY: 0.10, centreX: railX + 0.16, frontZ: cabBox.max.z - 0.40 });

  // ── the ceiling camera ─────────────────────────────────────────────────────────
  // Built in its own frame with the ceiling plane at y=0 and the dome hanging below, so it
  // mounts by translating to the ceiling height — no rotation, no re-derivation.
  const axis = mountRootReturning('ceiling_camera', buildAxisCamera, axisMaterials());
  axis.holder.position.set(0, CEILING_H, rowZ0 + RACK_PITCH);
  root.add(axis.holder);

  // ── the scale figure ───────────────────────────────────────────────────────────
  // Standing IN the aisle, a little down the corridor, which is where the person appears in
  // site-03 and site-05.
  const figure = buildHumanFigure(corridorMats);
  figure.position.set(0.35, 0, rowZ0 + RACKS_PER_SIDE * RACK_PITCH + 1.1);
  root.add(figure);

  return {
    root,
    cabinets,
    cabinetApis,
    hero,
    // The hero's api by name, so nothing downstream has to know HOW the hero is indexed.
    // main.js reading cabinetApis[0] and calling it "the cabinet" was already inexact — index 0
    // is an empty cabinet on the left row — and becomes plainly false once only the hero moves.
    heroApi,
    corridor,
    figure,
    materials: corridorMats,
    api: { ups: ups.api, fmps: fmps.api, stratix: stratix.api, pdu: pdu.api, axis: axis.api },
  };
}

// ═══ GUARDS ══════════════════════════════════════════════════════════════════════
// console.error, never console.assert — the QA gate cannot see the latter.

/**
 * EVERY DEVICE IS INSIDE THE CABINET THAT HOLDS IT.
 *
 * The assembly-specific failure: a device correct in its own frame, placed wrong in the
 * scene's. Nothing in the device's own suite can see it, because every one of those checks
 * runs in the device's local space where it has always been right.
 */
export function verifyEquipmentIsInsideItsRack(scene) {
  scene.updateMatrixWorld(true);
  const hero = scene.getObjectByName('hero_rack');
  if (!hero) { console.error('[aisle] no hero rack'); return 1; }
  const rackBox = visibleBox(hero);
  let bad = 0;
  for (const n of ['mounted_ups', 'mounted_fmps', 'mounted_stratix', 'mounted_pdu_pair']) {
    const o = scene.getObjectByName(n);
    if (!o) { console.error(`[aisle] ${n} missing`); bad += 1; continue; }
    const b = visibleBox(o);
    if (!rackBox.containsBox(b)) {
      console.error(`[aisle] ${n} is not inside its cabinet: device y[${(b.min.y * 1000).toFixed(0)}, ` +
                    `${(b.max.y * 1000).toFixed(0)}] vs rack y[${(rackBox.min.y * 1000).toFixed(0)}, ` +
                    `${(rackBox.max.y * 1000).toFixed(0)}] mm`);
      bad += 1;
    }
  }
  return bad;
}

/**
 * CROSS-ASSET SCALE COHERENCE.
 *
 * Six assets built separately, each declaring 1 unit = 1 m. If one of them is off by a factor
 * the scene is where it shows — and it makes every OTHER asset look wrong at the same time,
 * which is why it is a critical here and nowhere else.
 */
export function verifyScaleCoherence(scene) {
  scene.updateMatrixWorld(true);
  const EXPECT = {                       // metres, from each asset's own gated spec
    mounted_ups:  { y: 0.131, tol: 0.004 },
    mounted_fmps: { y: 0.043, tol: 0.004 },
    ceiling_camera: { y: 0.056, tol: 0.004 },
  };
  let bad = 0;
  for (const [name, e] of Object.entries(EXPECT)) {
    const o = scene.getObjectByName(name);
    if (!o) { console.error(`[aisle] ${name} missing`); bad += 1; continue; }
    const s = visibleBox(o).getSize(new THREE.Vector3());
    if (Math.abs(s.y - e.y) > e.tol) {
      console.error(`[aisle] ${name} height ${(s.y * 1000).toFixed(1)} mm in the scene vs ` +
                    `${(e.y * 1000).toFixed(1)} mm in its own spec — a scale error`);
      bad += 1;
    }
  }
  // And the relationship the eye actually reads: a 3U device is three times a 1U one.
  const ups = scene.getObjectByName('mounted_ups');
  const fmps = scene.getObjectByName('mounted_fmps');
  if (ups && fmps) {
    const hu = visibleBox(ups).getSize(new THREE.Vector3()).y;
    const hf = visibleBox(fmps).getSize(new THREE.Vector3()).y;
    const ratio = hu / hf;
    if (ratio < 2.6 || ratio > 3.4) {
      console.error(`[aisle] the 3U UPS is ${ratio.toFixed(2)}x the 1U FMPS — should read ~3x`);
      bad += 1;
    }
  }
  return bad;
}

/** Nothing may intersect the walkable aisle: it is a corridor people stand in. */
// A DOOR THAT OPENS IS SUPPOSED TO REACH INTO THE AISLE. The first version of this guard
// demanded that NOTHING cross the walkway boundary, which was a faithful reading of a scene
// where the doors never moved — it swapped an opaque panel for a transparent one in place. The
// moment they swing, that criterion fires six times on correct behaviour: a 120° door on a
// 620 mm cabinet reaches 374 mm into a 2 m aisle, which is what a real cabinet door does.
//
// So the question splits in two, and only one half was ever really about clearance:
//   · THE CABINET BODY must never intrude. That is a placement defect and stays a hard failure.
//   · THE DOORS may intrude, but must leave enough width to walk through.
// Collapsing both into one boundary test made the guard unable to tell a misplaced cabinet from
// a working hinge.
// MEASURED SWEEP, so the threshold is not a number picked by feel: door reach into the aisle
// peaks at 90° (462 mm), NOT at the widest angle — past 90 the panel folds back toward the
// cabinet side and by 180° it reaches nothing at all. Worst case across the whole arc leaves
// 1076 mm of walkway, comfortably above this minimum.
//
// Which means this clearance test CANNOT FIRE with the current geometry. That is worth saying
// plainly rather than letting it look like an active check: it is a tripwire for a future
// change — a narrower aisle, a deeper cabinet, rows moved closer — not something guarding a
// live risk today. Its negative control has to manufacture such a change to prove it works at
// all, and does.
const MIN_WALKWAY_M = 0.90;      // a service aisle a person can still pass through

export function verifyAisleIsClear(scene) {
  scene.updateMatrixWorld(true);
  const half = AISLE_WIDTH / 2;
  let bad = 0;
  let worstReach = 0;
  let worstName = null;

  for (const holder of scene.getObjectByName('scene_root')?.children ?? []) {
    if (!/^aisle_(left|right)$/.test(holder.name)) continue;
    for (const cab of holder.children) {
      // Measure the body WITHOUT its doors, so a swung door cannot be mistaken for a cabinet
      // standing in the walkway.
      const doors = [];
      cab.traverse((o) => { if (/^front_(mesh|glass)_door$/.test(o.name) && o.visible) doors.push(o); });
      const wasVisible = doors.map((d) => d.visible);
      doors.forEach((d) => { d.visible = false; });
      scene.updateMatrixWorld(true);
      const body = visibleBox(cab);
      doors.forEach((d, i) => { d.visible = wasVisible[i]; });
      scene.updateMatrixWorld(true);

      // A 1 mm tolerance: the cabinet is seated flush ON the boundary, and float arithmetic
      // makes "exactly on" land a hair either side.
      if (body.min.x < half - 0.001 && body.max.x > -half + 0.001) {
        console.error(`[aisle] the BODY of ${cab.name} stands in the walkable aisle: `
          + `x[${(body.min.x * 1000).toFixed(0)}, ${(body.max.x * 1000).toFixed(0)}] mm`);
        bad += 1;
      }

      // Now the doors, judged on the width they leave rather than on whether they cross a line.
      for (const d of doors) {
        const db = visibleBox(d);
        const reach = holder.name === 'aisle_left' ? db.max.x + half : half - db.min.x;
        if (reach > worstReach) { worstReach = reach; worstName = cab.name; }
      }
    }
  }

  const free = AISLE_WIDTH - 2 * Math.max(0, worstReach);
  if (free < MIN_WALKWAY_M) {
    console.error(`[aisle] open doors leave only ${(free * 1000).toFixed(0)} mm of walkway `
      + `(worst reach ${(worstReach * 1000).toFixed(0)} mm at ${worstName}); `
      + `${(MIN_WALKWAY_M * 1000).toFixed(0)} mm is the minimum a person can pass`);
    bad += 1;
  }
  return bad;
}

/**
 * CAN A JUDGE SEE THE CRITICALS FROM THE VIEW THAT MUST SHOW THEM?
 *
 * The check this asset shipped its first attempt without, and the gate failed on exactly the
 * gap: the blockout verified that the subject FIT the frame, which is not the same question as
 * whether the frame SHOWS what matters. One view aimed out through the building's exterior
 * wall; the other put the office context behind the lens. Both framed their bounding box
 * perfectly.
 *
 * This is the FMPS lesson at scene scale — presence is not visibility — and a scene has far
 * more occluders than a device, so it matters more here, not less.
 *
 * REACHABILITY IS NOT FRAMING, and the first version of this guard confused the two. It fired
 * correctly on the hero view aimed through a wall, and stayed SILENT on the aisle view aimed
 * away from the lounge — because a ray from the eye to an object BEHIND the camera arrives
 * perfectly well. Nothing was in the way; it was simply not in shot.
 *
 * So the test has two halves that must both hold: the point is INSIDE THE FRUSTUM (in front,
 * within the field of view) AND no opaque surface stands between it and the eye. Measuring
 * only the second is how a guard written to catch a framing defect misses a framing defect.
 *
 * @param {(name:string)=>{eye:THREE.Vector3, cam:THREE.Camera}} eyeFor  solved pose for a view
 */
export function verifyCriticalsAreVisible(scene, eyeFor) {
  scene.updateMatrixWorld(true);
  const shown = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  const ray = new THREE.Raycaster();
  const root = scene.getObjectByName('scene_root') ?? scene;

  function share(node, eye, cam) {
    let seen = 0, tried = 0, blocker = null, offscreen = 0;
    const frustum = cam
      ? new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
      : null;
    node.traverse((m) => {
      if (!m.isMesh || !shown(m)) return;
      const pos = m.geometry.attributes.position, nrm = m.geometry.attributes.normal;
      if (!pos || !nrm) return;
      const nmat = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
      const stride = Math.max(1, Math.floor(pos.count / 30));
      for (let i = 0; i < pos.count; i += stride) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        const n = new THREE.Vector3().fromBufferAttribute(nrm, i).applyMatrix3(nmat).normalize();
        const dir = eye.clone().sub(p).normalize();
        if (n.dot(dir) <= 0.15) continue;
        tried += 1;
        // IN FRAME FIRST. A point behind the camera is reachable and invisible.
        if (frustum && !frustum.containsPoint(p)) { offscreen += 1; continue; }
        ray.set(eye, p.clone().sub(eye).normalize());
        const dist = eye.distanceTo(p);
        let blocked = false;
        for (const h of ray.intersectObject(root, true)) {
          if (h.distance >= dist - 1e-3) break;
          if (!shown(h.object)) continue;
          const mm = h.object.material;
          if (Array.isArray(mm) ? mm.every((x) => x.transparent) : mm?.transparent) continue;
          let own = false;
          for (let o = h.object; o; o = o.parent) if (o === node) { own = true; break; }
          if (own) continue;
          blocked = true; blocker ??= h.object.name; break;
        }
        if (!blocked) seen += 1;
      }
    });
    return { share: tried ? seen / tried : 0, tried, blocker, offscreen };
  }

  // WHAT EACH VIEW MUST SHOW — DERIVED FROM THE DECLARED CRITICALS, not from taste.
  //
  //   aisle-of-racks            -> aisle_left, aisle_right
  //   office-corridor-context   -> lounge (the corridor's context, seen down the aisle)
  //   (important) human-scale   -> human_figure
  //   hero-rack-populated       -> mounted_ups, mounted_fmps, mounted_stratix
  //   dual-feed-pdu-pair        -> mounted_pdu_pair
  //
  // TWO THINGS ARE DELIBERATELY ABSENT, and both were caught by writing the list from the
  // spec instead of from what looked good:
  //   - the GLASS PARTITION. Transparent by design, so demanding its own surface be visible
  //     asks a window to be opaque. office-corridor-context is satisfied by the lounge seen
  //     THROUGH it.
  //   - the CEILING DAYLIGHT PANELS. Real, photographed, and NOT a declared critical. They
  //     fall outside the aisle camera's upward field of view, and the honest response is to
  //     stop asserting something the contract never asked for — not to tilt the hero shot
  //     until a non-critical fits. If they should be visible, that is a spec change first.
  //   - THE CEILING CAMERA, which is why 'camera-detail' exists. At 1:1 it is a 101 mm device
  //     2.7 m up: correct, and unreadable in either of the other two views. It was never a
  //     MUST_SHOW for them and still is not — a view answers for what it exists to show. But
  //     a view created specifically to show it must be held to exactly that, by RAY rather
  //     than by presence, which is the lesson the FMPS taught this run at some cost.
  const MUST_SHOW = {
    aisle: ['aisle_left', 'aisle_right', 'human_figure', 'lounge'],
    'hero-rack': ['mounted_ups', 'mounted_fmps', 'mounted_pdu_pair', 'mounted_stratix'],
    'camera-detail': ['ceiling_camera'],
  };
  let bad = 0;
  for (const [view, names] of Object.entries(MUST_SHOW)) {
    const pose = eyeFor(view);
    if (!pose?.eye) { console.error(`[aisle] no solved eye for view ${view}`); bad += 1; continue; }
    for (const n of names) {
      const node = scene.getObjectByName(n);
      if (!node) { console.error(`[aisle] ${view}: ${n} is missing from the scene`); bad += 1; continue; }
      const v = share(node, pose.eye, pose.cam);
      if (v.share <= 0.10) {
        const why = v.offscreen > v.tried * 0.5 ? 'OUT OF FRAME'
          : v.blocker ? `blocked by ${v.blocker}` : 'not visible';
        console.error(`[aisle] ${view}: ${n} is ${(v.share * 100).toFixed(0)}% visible — ${why} — the judge cannot see it`);
        bad += 1;
      }
    }
  }
  return bad;
}

// mats is REQUIRED, not optional. The three material guards judge the tone-mapped pixel, and
// a signature that let them be skipped when the argument is missing would turn them into
// checks that pass by not running — which is the exact failure they were written against.
export function verifyAll(scene, mats) {
  if (!mats?.sky_haze) {
    console.error('[aisle] verifyAll needs the corridor materials — the pixel guards cannot run '
      + 'without them, and silently skipping them would be a check that passes by not running');
    return 1;
  }
  const n = verifyDerivations()
    + verifyEquipmentIsInsideItsRack(scene)
    + verifyScaleCoherence(scene)
    + verifyAisleIsClear(scene)
    + verifyCorridorEnclosesTheAisle(scene.getObjectByName('scene_root') ?? scene)
    + verifyLoungeStaysBehindTheGlass(scene)
    + verifyCeilingFittingsAreAttached(scene, CEILING_H)
    + verifyNoSurfaceRendersAsAHole(mats)
    + verifySkylineReadsAsSilhouette(mats)
    + verifyLuminairesKeepTheirOwnHue(mats)
    + verifyRigAgreesWithItsPracticals(mats)
    + verifyBudget(scene.getObjectByName('scene_root') ?? scene).failed
    + verifyEveryAuthoredLampIsSwitchedOn(scene);
  if (n === 0) console.log('[aisle] assembled · guards passed');
  return n;
}

// A MESH IS NOT A DRAW CALL. The budget counter used a plain traverse and reported 610 where
// the renderer issues 523: 87 meshes in this graph are hidden — the six cabinets' unused door
// variants and the hero's switched-off mesh door — and a hidden mesh is skipped by the
// renderer entirely. That inflated figure went out in four consecutive pass reports as
// "612 draws (51%)" when the real load was 523 (44%). Counting the thing that is easy to
// count instead of the thing being budgeted is how a budget silently measures the wrong load.
//
// Hidden geometry is still reported, because it is not free: three r160 does NOT test
// `visible` when raycasting (only `layers`, see intersectObject in the bundle), so every
// hidden mesh is still intersected on each pointer move.
export function verifyBudget(root, { maxDraws = 1200, maxTris = 200000 } = {}) {
  let draws = 0, tris = 0, hidden = 0, hiddenTris = 0;
  root.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry;
    const t = (g.index ? g.index.count : g.attributes.position.count) / 3;
    let visible = true;
    for (let o = m; o; o = o.parent) if (!o.visible) { visible = false; break; }
    if (!visible) { hidden += 1; hiddenTris += t; return; }
    draws += 1; tris += t;
  });
  let failed = 0;
  if (draws > maxDraws) {
    console.error(`[aisle] ${draws} draw calls exceeds the ${maxDraws} budget`);
    failed += 1;
  }
  if (tris > maxTris) {
    console.error(`[aisle] ${Math.round(tris)} triangles exceeds the ${maxTris} budget`);
    failed += 1;
  }
  return { failed, draws, tris, hidden, hiddenTris };
}

// AN AUTHORED EMISSIVE SITTING AT INTENSITY 0 IS A LAMP SOMEBODY FORGOT TO SWITCH ON.
//
// This is the mirror image of the trap recorded earlier in the run: three defaults
// emissiveIntensity to 1 over a BLACK emissive, so `emissiveIntensity > 0` is a vacuous test
// that passes on a dead lamp. The signature that actually discriminates is the opposite pair —
// a NON-BLACK emissive colour, which somebody deliberately authored, sitting at intensity 0.
//
// It caught a real one: the UPS shipped into this scene powered down for every pass since
// blockout. Its LCD (#ffffff) and status LEDs (#20c020) were authored and left at 0, because
// the scene mounted the device and never applied the power state its own main.js starts with.
// Nothing noticed, because a dark screen on a black bezel looks like a black bezel.
//
// Stated as a property of the RESULT, not of any particular builder, so it stays true however
// the assembly is rewritten. A lamp that is meant to be off must say so in its own userData —
// the exception then lives next to the decision instead of in a list here that would go stale.
export function verifyEveryAuthoredLampIsSwitchedOn(root) {
  const dark = new Map();
  root.traverse((m) => {
    if (!m.isMesh) return;
    let visible = true;
    for (let o = m; o; o = o.parent) if (!o.visible) { visible = false; break; }
    if (!visible) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material])) {
      const e = mat?.emissive;
      if (!e || e.r + e.g + e.b < 0.001) continue;          // black emissive: not a lamp
      if ((mat.emissiveIntensity ?? 1) > 0) continue;
      if (mat.userData?.intentionallyOff) continue;          // declared where the decision is
      dark.set(mat.name || m.name, `#${e.getHexString()}`);
    }
  });
  for (const [name, hex] of dark) {
    console.error(`[aisle] "${name}" has an authored emissive ${hex} at intensity 0 — a lamp `
      + 'that was built and never switched on; set it, or mark userData.intentionallyOff');
  }
  return dark.size;
}
