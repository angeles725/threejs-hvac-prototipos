// runtime.mjs — renderer, scene, camera, controls (P4 BLOCKOUT).
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight                      — stalls shader compile
//   NO MeshPhysicalMaterial.transmission  — stalls SwiftShader; THE BUBBLE IS AFFECTED,
//                                           see materials.mjs for what replaces it
//   NO scene.environmentIntensity         — dead property in r160; use material.envMapIntensity
//   NO logarithmicDepthBuffer
//   shadowMap OFF at blockout

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLightingRig, addLightingRig } from './lighting.mjs';

export const FOV = 40;   // slightly wider than the Stratix's 38, so the full circle of the
                         // trim ring stays inside the frame at a close working distance

/**
 * NEGATIVE ELEVATION — the first in this run, and it is forced by the subject.
 *
 * An indoor mini-dome is ceiling-mounted: the flat base plate is up against the ceiling and
 * the bubble hangs below. All five critical features (bubble, optics, shroud, tilt, collar)
 * are on the UNDERSIDE. A positive elevation frames the base plate, which carries nothing at
 * all, and puts the entire subject behind it.
 *
 * The framing convention exists to frame the criticals. For this subject that means looking
 * UP — the way anyone actually sees a security camera. Confirmed at the P3 gate before the
 * blockout was built against it.
 */
export const CAMERA_VIEW = { azimuth_deg: 35, elevation_deg: -22 };

export const CAMERA_VIEWS = {
  hero:  CAMERA_VIEW,
  under: { azimuth_deg: 35, elevation_deg: -68 },  // near-axial: the optics read head-on
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

  for (let r = 0.05; r <= 3.0; r += 0.0005) {
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
  return { radius: 0.6, target };
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
  scene.background = new THREE.Color('#070a10');

  // IBL for the lens ring (metalness 0.9) and the specular highlight that sells the bubble
  // as glass. Intensity is per-material — see materials.mjs.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const lights = addLightingRig(scene, createLightingRig());

  // Placeholder pose. The real one is solved in main.js AFTER the geometry exists — a radius
  // is a property of the built object, never of a spec field.
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.001, 100);
  const TARGET = new THREE.Vector3(0, -0.028, 0);
  camera.position.set(0.14, -0.12, 0.20);
  camera.lookAt(TARGET);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;      // REQUIRED — a rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(TARGET);
  controls.minDistance = 0.06;
  controls.maxDistance = 3;
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
