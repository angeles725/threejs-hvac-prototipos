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
};

/** Smallest radius keeping every corner of `box` inside ndc +/- margin. */
/**
 * @param {THREE.Box3} box    the subject this VIEW must frame — not necessarily the whole scene
 * @param {number} maxRadius  a corridor has walls; a solve that walks the camera through one
 *                            produces a technically-correct framing of the outside of a wall
 */
export function solveRadius(box, view = CAMERA_VIEW, aspect = 16 / 9, margin = 0.94, maxRadius = 40.0) {
  const target = box.getCenter(new THREE.Vector3());
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(view.fov ?? FOV, aspect, 0.05, 200);
  const mn = box.min; const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ].map((c) => new THREE.Vector3(...c));
  for (let r = 1.0; r <= maxRadius; r += 0.02) {
    cam.position.set(
      target.x + r * Math.cos(el) * Math.sin(az),
      target.y + r * Math.sin(el),
      target.z + r * Math.cos(el) * Math.cos(az),
    );
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
    + `${view.fov ?? FOV} — clamping to the cap; the subject will be cropped`);
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
