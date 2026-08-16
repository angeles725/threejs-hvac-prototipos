// runtime.mjs — renderer, scene, camera, controls for the aisle (P4 BLOCKOUT).
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight · NO MeshPhysicalMaterial.transmission · NO scene.environmentIntensity
//   (dead in r160 — use material.envMapIntensity) · NO logarithmicDepthBuffer · shadowMap off.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AISLE_LENGTH, CEILING_H } from './dims.mjs';

export const FOV = 50;   // WIDER than any device hero (38-40). An aisle reads by perspective
                         // convergence down its length, not by maximising one face.

/**
 * Looking ALONG the aisle, from a standing eye height, which is the viewpoint site-01 and
 * site-05 are taken from — the one the reference-match will be judged against.
 */
// AZIMUTH 192, NOT 12 — the camera stands at the CLOSED end and looks TOWARD the glass door
// and the lounge, which is the viewpoint both aisle photographs are taken from. At 12 the
// camera sat at the lounge end looking the other way: the office context that
// `office-corridor-context` is about was BEHIND the lens (dot -0.89) and the frame ended on a
// blank wall. "The subject fits the frame" was true the whole time; it is simply not the same
// question as "the frame shows what matters".
export const CAMERA_VIEW = { azimuth_deg: 192, elevation_deg: 6, fov: 50 };
export const CAMERA_VIEWS = {
  aisle: CAMERA_VIEW,
  // Across the aisle at the populated cabinet. AZIMUTH 270 puts the eye on the opposite side
  // of the walkway looking at +x, where the hero cabinet stands. At 68 the solver placed it at
  // x=5.30 — outside the corridor entirely, with the centre pixel on the exterior wall.
  // FOV 75, WIDER THAN THE AISLE SHOT, and forced by the room rather than chosen.
  // The equipment stack is ~2 m tall and the corridor gives ~1 m of standoff. At fov 50 the
  // near corners need 2.7 m of distance, which puts the eye inside the opposite cabinet — the
  // solver found no radius at all and fell back to 12 m through the far wall. A photographer
  // in a 2 m corridor reaches for a wide lens; the geometry leaves no other move.
  'hero-rack': { azimuth_deg: 270, elevation_deg: 8, fov: 75 },
  // A 101 mm device hanging at 2.7 m is a speck in a 9 m corridor — correct at 1:1 and
  // unreadable, which is a FRAMING problem, not a scale one. Enlarging the dome would make the
  // scene lie about the hardware; a dedicated view costs nothing and keeps 1:1 intact.
  //
  // ELEVATION IS NEGATIVE: the eye sits BELOW the dome looking up, which is the only way a
  // ceiling device reads — from above it is a disc. Not straight underneath either, or the
  // hemisphere collapses to a circle; -32 degrees keeps the dome's profile and the body behind
  // it both legible. FOV 40 rather than the 50/75 the other two use: a detail lens, and narrow
  // enough that the 15 cm standoff does not distort the dome into an egg.
  'camera-detail': { azimuth_deg: 210, elevation_deg: -32, fov: 40 },
};

/** Smallest radius keeping every corner of `box` inside ndc +/- margin. */
/**
 * @param {THREE.Box3} box    the subject this VIEW must frame — not necessarily the whole scene
 * @param {number} maxRadius  a corridor has walls; a solve that walks the camera through one
 *                            produces a technically-correct framing of the outside of a wall
 */
/**
 * @param {THREE.Box3} [bounds]  the room. A radius cap is a crude stand-in for "stay indoors":
 *   it happens to work for a subject near the middle of the corridor and fails for one against
 *   a surface. The ceiling camera is the case that breaks it — it hangs AT the ceiling, so any
 *   view looking up at it walks the eye through the slab within centimetres, at a radius no cap
 *   would object to. Constraining the resulting EYE POSITION says what was actually meant.
 */
export function solveRadius(box, view = CAMERA_VIEW, aspect = 16 / 9, margin = 0.94, maxRadius = 40.0, bounds = null) {
  const target = box.getCenter(new THREE.Vector3());
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(view.fov ?? FOV, aspect, 0.05, 200);
  const mn = box.min; const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ].map((c) => new THREE.Vector3(...c));
  // THE SEARCH USED TO START AT 1.0 m WITH A 20 mm STEP, which silently encodes "the subject is
  // rack-sized". A 101 mm ceiling camera needs about 0.15 m of standoff at fov 40, so the loop
  // began an order of magnitude too far away, never tested a radius that fits, and returned the
  // first value it ever tried. Scale the start and the step to the SUBJECT instead of assuming
  // one — a solver with a hard-coded floor is only a solver for the size it was written against.
  const diag = box.getSize(new THREE.Vector3()).length();
  const r0 = Math.max(0.06, diag * 0.25);
  const step = Math.max(0.004, diag * 0.01);

  // "KEEP THE EYE INSIDE THE ROOM" IS NOT A UNIVERSAL RULE — it depends on whether the subject
  // is an OBJECT IN the room or the room ITSELF. Confining the eye is right for the ceiling
  // camera, which hangs at the slab and would otherwise be viewed from inside it. Applied to
  // the aisle shot it is incoherent: that subject spans the whole 9 m corridor, and no fov
  // between 50 and 75 finds any pose inside the room, because you cannot photograph a 9 m
  // corridor from within its own 9 m — a real photographer backs through the doorway.
  //
  // So the constraint is decided by MEASUREMENT rather than by a list of view names: it applies
  // when the subject actually fits inside the room with room to spare. A list would have to be
  // edited every time a view is added, and would be wrong the first time someone forgot.
  let useBounds = false;
  if (bounds) {
    const rs = box.getSize(new THREE.Vector3());
    const rb = bounds.getSize(new THREE.Vector3());
    useBounds = rs.x < rb.x * 0.6 && rs.z < rb.z * 0.6;
    if (!useBounds) {
      console.warn('[runtime] subject spans the room, so the eye is not confined to it — '
        + 'a view of the room itself has to stand outside it');
    }
  }
  for (let r = r0; r <= maxRadius; r += step) {
    cam.position.set(
      target.x + r * Math.cos(el) * Math.sin(az),
      target.y + r * Math.sin(el),
      target.z + r * Math.cos(el) * Math.cos(az),
    );
    // Reject the pose before measuring the framing: a beautifully framed shot taken from
    // inside the ceiling slab is not a candidate.
    if (useBounds && !bounds.containsPoint(cam.position)) continue;
    cam.lookAt(target);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    const mvp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    let fits = true;
    for (const c of corners) {
      const p = c.clone().applyMatrix4(mvp);
      if (Math.abs(p.x) > margin || Math.abs(p.y) > margin) { fits = false; break; }
    }
    if (fits) return { radius: r, target };
  }
  // THE FALLBACK USED TO IGNORE THE CAP. Returning r=12 when nothing fits within maxRadius
  // defeats the exact purpose the cap serves — it walks the eye out through the corridor wall
  // and frames the outside of the room. Not firing today (aisle solves at 4.88 of 40,
  // hero-rack at 1.86 of 2.4) but latent: the first pass that grows a subject would have hit
  // it silently. Clamping to maxRadius keeps the camera in the room and lets the CROP be
  // visible, which is the honest failure — a partially cropped subject is a reportable defect,
  // a camera outside the building is a confusing one.
  console.error(`[runtime] no radius within ${maxRadius} m frames this subject at fov `
    + `${view.fov ?? FOV}${useBounds ? ' while keeping the eye inside the room' : ''} — clamping to `
    + 'the cap; the subject will be cropped');
  return { radius: maxRadius, target, cappedWithoutFitting: true };
}

export function applyCameraPose(camera, controls, solved, view = CAMERA_VIEW) {
  // The FOV belongs to the VIEW, not to the runtime: a corridor detail shot and an aisle shot
  // are different lenses, and applying a pose without its lens silently frames the wrong
  // amount of the world.
  if (view.fov && camera.fov !== view.fov) camera.fov = view.fov;
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const t = solved.target; const r = solved.radius;
  camera.position.set(
    t.x + r * Math.cos(el) * Math.sin(az),
    t.y + r * Math.sin(el),
    t.z + r * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(t);
  camera.updateProjectionMatrix();
  if (controls) { controls.target.copy(t); controls.update(); }
}

// EXPORTED AS DATA so the material guards can judge the tone-mapped pixel against the rig that
// actually ships. The first version of those guards used only the environment term and read
// every surface ~30x too dark — a guard that models a different rig than the renderer is not
// measuring the image, it is measuring a fiction.
export const LIGHT_RIG = {
  // THE RIG WAS CONTRADICTING ITS OWN PRACTICALS. sky was 0xdbe8f2 — cool — while the ceiling
  // panels overhead are warm filtered sunlight, so a surface facing straight UP at those
  // golden panels was receiving BLUE light (warmth -0.098). And ground was 0x2a2a28, a near
  // black that models a dark floor, when the floor is LIGHT WOOD PLANK: anything facing down
  // was lit by a room that does not exist.
  //
  // Solved to hold the EXPOSURE while reversing the tint — front-face luma moves 0.90 -> 0.92,
  // because the materials pass resolved every albedo against this exposure and shifting the
  // level would silently invalidate that work. Warmth on an up-facing normal goes -0.098 ->
  // +0.225, and the floor bounce 0.36 -> 0.43 and turns warm.
  hemi: { sky: 0xffe4c4, ground: 0x7d6f5e, intensity: 0.50 },
  dirs: {
    // Each lamp stands for a source that is VISIBLE in the reference, which is what keeps the
    // rig honest: key = the warm ceiling panels, fill = the blue-green door LED strips
    // washing the opposite row (the only cool side source in the room), depth = the daylight
    // through the lounge window wall.
    key:   { pos: [3.0, 3.2, -2.0], intensity: 0.85, color: 0xfff6ec },
    fill:  { pos: [-3.5, 2.4, 1.5], intensity: 0.40, color: 0xd8e6ff },
    depth: { pos: [0.0, 2.0, 9.0], intensity: 0.55, color: 0xe8f0ff },
  },
  exposure: 1.05,
};

// Derived from the SAME dims the corridor is built from, so the room the solver is confined to
// and the room that is modelled cannot drift apart.
// DERIVED FROM THE MODELLED FLOOR, not from typed extents. The first version of this used
// constants assembled out of dims, and they disagreed with the actual floor slab by enough to
// reject a legitimate camera pose — a room the solver believes in that does not match the room
// that was built is the same class of error as a rig that contradicts its practicals.
export function roomBounds(scene, margin = 0.12) {
  const floor = scene.getObjectByName?.('floor');
  if (!floor) {
    console.error('[runtime] no floor mesh — cannot derive the room the camera must stay inside');
    return null;
  }
  const b = new THREE.Box3().setFromObject(floor, true);
  b.min.y = margin;                       // eye stays above the deck
  b.max.y = CEILING_H - 0.05;             // and below the slab
  b.expandByVector(new THREE.Vector3(-margin, 0, -margin));
  return b;
}

export function createRuntime(canvas) {
  const W = canvas.parentElement?.clientWidth || window.innerWidth;
  const H = canvas.parentElement?.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e13);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // A corridor rig, not an equipment rig. The scene has PRACTICALS of its own — the ceiling
  // daylight panels and the pendant lamps are emissive geometry — so these lamps are a base
  // that keeps the cabinets readable, not the whole answer.
  const lights = {};
  lights.hemi = new THREE.HemisphereLight(LIGHT_RIG.hemi.sky, LIGHT_RIG.hemi.ground, LIGHT_RIG.hemi.intensity);
  lights.hemi.name = 'hemi_light';
  const dirs = LIGHT_RIG.dirs;
  for (const [k, cfg] of Object.entries(dirs)) {
    const l = new THREE.DirectionalLight(cfg.color, cfg.intensity);
    l.name = `${k}_light`;
    l.position.set(...cfg.pos);
    l.castShadow = false;
    lights[k] = l;
  }
  for (const l of Object.values(lights)) scene.add(l);

  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 200);
  const TARGET = new THREE.Vector3(0, CEILING_H / 2, AISLE_LENGTH / 4);
  camera.position.set(1.5, 1.6, -4.0);
  camera.lookAt(TARGET);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(TARGET);
  controls.minDistance = 1.0;
  controls.maxDistance = 40;
  controls.update();

  function onResize() {
    const wrap = canvas.parentElement;
    const nW = wrap?.clientWidth || window.innerWidth;
    const nH = wrap?.clientHeight || window.innerHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, controls, lights, onResize };
}
