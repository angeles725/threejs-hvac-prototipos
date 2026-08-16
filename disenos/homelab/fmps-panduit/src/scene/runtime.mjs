// runtime.mjs — renderer, scene, camera, controls for fmps-panduit (P4 BLOCKOUT).
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight                      — stalls shader compile
//   NO MeshPhysicalMaterial.transmission  — stalls SwiftShader
//   NO scene.environmentIntensity         — dead property in r160; use material.envMapIntensity
//   NO logarithmicDepthBuffer
//   shadowMap OFF at blockout

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLightingRig, addLightingRig } from './lighting.mjs';

export const FOV = 40;   // equipment hero

/**
 * ELEVATION 3 — THE LOWEST IN THIS RUN, and solved at P2 rather than discovered at a gate.
 *
 * Every one of the five criticals is on the FRONT face. Front area 20752 mm^2; TOP area
 * 269773 mm^2 — the featureless lid is THIRTEEN TIMES the face that carries the identity.
 * Projected face shares over the built envelope:
 *     az 26 / el 8  ->  front 28%  top 57%  side 16%   (the lid dominates outright)
 *     az 26 / el 5  ->  front 35%  top 45%  side 20%   (the lid still leads)
 *     az 26 / el 3  ->  front 43%  top 33%  side 24%   (the front leads, side keeps depth)
 *
 * The sibling UPS needed elevation 8 for a lid 5x its front. At 13x, 5 is not enough.
 *
 * RE-SOLVE AGAINST THE BUILT BOX, not against these spec figures: the UPS's angle was tuned
 * against a bounding box inflated by a floating part, and a framing metric is only ever as
 * good as the containment guard underneath it.
 */
export const CAMERA_VIEW = { azimuth_deg: 26, elevation_deg: 3 };

export const CAMERA_VIEWS = {
  hero: CAMERA_VIEW,
  'front-detail': { azimuth_deg: 8, elevation_deg: 2 },   // close on the NMC and the bay pitch
};

/**
 * Smallest radius keeping every corner of `box` inside ndc +/- margin.
 *
 * Solved numerically over the CORNERS, never from a bounding sphere: R/sin(fov/2) treats the
 * subject as a ball and over-estimates badly for a flat disc like this one, throwing away
 * pixels to empty background.
 *
 * SOLVE PER STATE. Removing the bubble (?dome=off) changes the bounding box, and a radius
 * solved for one state and reused for another is how a subject gets cropped.
 */
export function solveRadius(box, view = CAMERA_VIEW, aspect = 16 / 9, margin = 0.94) {
  const target = box.getCenter(new THREE.Vector3());
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.001, 100);
  const mn = box.min; const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ].map((c) => new THREE.Vector3(...c));

  for (let r = 0.3; r <= 8.0; r += 0.002) {
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
  console.error('[runtime] no radius frames the subject — check the bounding box');
  return { radius: 1.5, target };
}

export function applyCameraPose(camera, controls, solved, view = CAMERA_VIEW) {
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const t = solved.target;
  const r = solved.radius;
  camera.position.set(
    t.x + r * Math.cos(el) * Math.sin(az),
    t.y + r * Math.sin(el),
    t.z + r * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(t);
  camera.updateProjectionMatrix();
  if (controls) { controls.target.copy(t); controls.update(); }
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
  scene.background = new THREE.Color('#06080d');

  // IBL for the rack ears and the RJ45 cage (metalness 0.9). Intensity is per-material —
  // scene.environmentIntensity is dead in r160.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const lights = addLightingRig(scene, createLightingRig());

  // Placeholder pose. The real one is solved in main.js AFTER the geometry exists — a radius
  // is a property of the built object, never of a spec field.
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 100);
  const TARGET = new THREE.Vector3(0, 0, 0);
  camera.position.set(0.45, 0.05, 0.95);
  camera.lookAt(TARGET);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;      // REQUIRED — a rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(TARGET);
  controls.minDistance = 0.2;
  controls.maxDistance = 6;
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
