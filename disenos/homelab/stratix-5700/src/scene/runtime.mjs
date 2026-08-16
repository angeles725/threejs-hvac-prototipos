// runtime.mjs — renderer, scene, camera, OrbitControls, house-rig lights.
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight                    — stalls shader compile; probe returns 0 draws
//   NO MeshPhysicalMaterial.transmission — same stall
//   NO scene.environmentIntensity        — dead property in r160; use material.envMapIntensity
//   shadowMap OFF                        — budget + SwiftShader compat

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLightingRig, addLightingRig } from './lighting.mjs';

export const FOV = 38;

/**
 * Camera views. Angles come from the spec; the RADIUS is SOLVED at build time from the
 * subject's real bounding box — never from a nominal dimension.
 *
 * That distinction cost a gate cycle on the previous asset: seeding the distance from
 * `dimensions_real.length` framed the chassis and cropped an appendage that hung outside
 * it. Here the top terminal blocks stand proud of the enclosure and the DIN clip hangs
 * behind and below it, so the framed subject is strictly larger than the declared
 * envelope. solveRadius() reads the box that was actually built.
 */
export const CAMERA_VIEWS = {
  // Standard diagonal grammar, and correct for THIS subject: it is near-cubic, so one
  // shot reveals the front face, the top terminal blocks and a flank together — and
  // three of the five critical features live on those two planes.
  front: { azimuth_deg: 42, elevation_deg: 24 },
  // Rear: proves the DIN clip. Same elevation and radius, mirrored azimuth.
  rear: { azimuth_deg: 222, elevation_deg: 24 },
  // Evidence shot for the port block and the LED column, which are small on the hero view.
  // A detail shot fills more of the frame, which is the point — but at narrower aspect
  // ratios that pushed the subject under the bottom-right controls panel. A subject
  // buried under an opaque panel is the false-green this project has already been bitten
  // by, so this view carries its OWN ndc margin instead of the default 0.94.
  'port-detail': { azimuth_deg: 30, elevation_deg: 10, margin: 0.72 },
};

/**
 * Smallest radius that keeps every corner of `box` inside ndc ±margin at this fov.
 * Solved numerically because the tilt makes the closed form fiddly, and because a
 * numeric solve cannot drift from the geometry the way a hand-computed constant can.
 */
export function solveRadius(box, view, aspect = 16 / 9, margin = null) {
  const m = margin ?? view.margin ?? 0.94;
  const target = box.getCenter(new THREE.Vector3());
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.001, 100);
  const mn = box.min;
  const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ].map((c) => new THREE.Vector3(...c));

  for (let r = 0.10; r <= 4.0; r += 0.002) {
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
      if (Math.abs(p.x) > m || Math.abs(p.y) > m) { fits = false; break; }
    }
    if (fits) return { radius: r, target };
  }
  console.error('[runtime] no radius frames the subject — check the bounding box');
  return { radius: 1.0, target };
}

/** Place the camera on a named view against a solved radius/target. */
export function applyCameraView(camera, controls, viewName, solved) {
  const v = CAMERA_VIEWS[viewName];
  if (!v) throw new Error(`unknown camera view: ${viewName}`);
  const s = solved[viewName];
  const az = (v.azimuth_deg * Math.PI) / 180;
  const el = (v.elevation_deg * Math.PI) / 180;
  const t = s.target;
  camera.position.set(
    t.x + s.radius * Math.cos(el) * Math.sin(az),
    t.y + s.radius * Math.sin(el),
    t.z + s.radius * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(t);
  camera.updateProjectionMatrix();
  if (controls) { controls.target.copy(t); controls.update(); }
  return v;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ view?: string }} [opts]
 */
export function createRuntime(canvas, opts = {}) {
  const W = canvas.parentElement?.clientWidth || window.innerWidth;
  const H = canvas.parentElement?.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06080d');

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // The rig is re-aimed for THIS subject at the lighting pass. Unlike the previous asset
  // — a vertical bar where up-facing light was wasted — this one's identity is split
  // between a FRONT plane and a TOP plane, so both have to be lit.
  const lights = addLightingRig(scene, createLightingRig());

  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.001, 100);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;   // REQUIRED — a rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.05;
  controls.maxDistance = 5;

  function onResize() {
    const wrap = canvas.parentElement;
    const nW = wrap?.clientWidth || window.innerWidth;
    const nH = wrap?.clientHeight || window.innerHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, controls, lights };
}
