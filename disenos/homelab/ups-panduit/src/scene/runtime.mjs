// runtime.mjs — renderer, scene, camera, OrbitControls, house-rig lights for ups-panduit.
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight          — stalls shader compile
//   NO MeshPhysicalMaterial.transmission — stalls SwiftShader
//   NO scene.environmentIntensity       — dead property in r160; use material.envMapIntensity
//   NO logarithmicDepthBuffer
//   shadowMap OFF at blockout            — budget + SwiftShader compat

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLightingRig, addLightingRig } from './lighting.mjs';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ renderer, scene, camera, controls, lights }}
 */

export const FOV = 40;

/**
 * Camera pose. Angles are declared; the RADIUS AND TARGET are SOLVED from the geometry
 * that was actually built.
 *
 * THIS IS THE DEFECT THAT FAILED BLOCKOUT attempt 1. The pose was hard-coded at r = 0.80
 * with a target of (0, 0.0655, 0), both derived from the 440 x 131 mm FRONT FACE while
 * the unit is 666 mm DEEP. The framed subject is therefore 0.4826 x 0.1485 x 0.6805 m,
 * and the camera was placed as if it were a third of that: fullyVisible=false, cropped.
 * A radius is a property of the built object, never of a spec field — which is why
 * `camera.r_m` has been struck from the spec rather than corrected there.
 *
 * ANGLES ALSO CHANGED, and the measurement is why. All four critical features involve
 * the FRONT face, but with a 680 mm depth the TOP face is five times its area, so at the
 * declared az 35 / el 20 the top took 51% of the projected silhouette and the front only
 * 25%. Dropping elevation alone does not fix it — at az 35 / el 12 the top still leads
 * 37% to 31%. Azimuth had to come down as well. At az 24 / el 10 the front leads at 40%,
 * top 35%, side 25% — the front wins the frame while the side still carries the depth
 * read that makes this unit recognisably a deep rack UPS.
 */
// Elevation 10 -> 8, at P6, and the reason matters more than the number.
//
// The original 24/10 was chosen by measuring the projected share of each face — and that
// measurement used the subject's BOUNDING BOX, which at the time was 18.7 mm too tall
// because a ventilation slot was hanging below the chassis in mid-air. The front face
// looked like it led at 40% against 35%. With the stray part removed and the box honest,
// the same angle reports 38% front against 38% top: the featureless top getting equal
// billing with the face that carries all four critical features.
//
// Two degrees restores it — front 41%, top 33%, side 26% — and the side keeps the 666 mm
// depth read. A camera tuned against a corrupted measurement is not a camera decision, so
// this is the correction, not a preference.
export const CAMERA_VIEW = { azimuth_deg: 24, elevation_deg: 8 };

/**
 * Named views. `rear` is added at the interaction pass to close a gap the lighting pass
 * exposed: the rear service panel and fan bore are BUILT and no capture state pointed at
 * them, so geometry that exists could never be judged. Same elevation and the mirrored
 * azimuth, so the two shots are directly comparable.
 */
export const CAMERA_VIEWS = {
  front: CAMERA_VIEW,
  rear: { azimuth_deg: 204, elevation_deg: 8 },
};

/**
 * Smallest radius keeping every corner of `box` inside ndc +/-margin.
 * Solved numerically over the CORNERS, not from a bounding sphere: the sphere formula
 * (R / sin(fov/2)) treats a flat 480 x 148 x 680 box as a ball and over-estimates by
 * about 25% here — 1.24 m against the 0.99 m the corners actually need — which would
 * throw away a quarter of the subject's pixels to empty background.
 */
export function solveRadius(box, view = CAMERA_VIEW, aspect = 16 / 9, margin = 0.94) {
  const target = box.getCenter(new THREE.Vector3());
  const az = (view.azimuth_deg * Math.PI) / 180;
  const el = (view.elevation_deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.01, 100);
  const mn = box.min;
  const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ].map((c) => new THREE.Vector3(...c));

  for (let r = 0.30; r <= 6.0; r += 0.002) {
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

/** Place the camera on the solved pose. */
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
  const W = canvas.parentElement?.clientWidth  || window.innerWidth;
  const H = canvas.parentElement?.clientHeight || window.innerHeight;

  // --- Renderer ---------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false; // blockout: no shadows

  // --- Scene ------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06080d');

  // IBL — RoomEnvironment for specular reflections on rack ears (metalness 0.90)
  // Intensity controlled via material.envMapIntensity per-material (NOT scene.environmentIntensity)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // --- House lighting rig — horizontal appliance adaptation -------------------
  // The UPS is a HORIZONTAL device (440mm wide × 131mm tall).
  // Unlike the vertical rack cabinet, the front face is short and wide.
  // Strategy:
  //   • Key: right-front, moderate elevation — illuminates front face + right side
  //   • Front fill: direct frontal — primary for the front panel details (LCD, LEDs)
  //   • Top fill: low power, from above — illuminates the flat top face (visible at el=20°)
  //   • Fill left: cool complement — moderates shadow on left side
  //   • Rim: cold back-light — separation from dark background
  // NEVER raise metalness to fix flat read — raise envMapIntensity or fill light instead.

  // Aimed for THIS subject and analysed headlessly — see src/scene/lighting.mjs.
  // If something reads flat, re-aim a lamp there; never raise metalness.
  const lights = addLightingRig(scene, createLightingRig());

  // --- Camera ------------------------------------------------------------------
  // Created at a placeholder pose. The REAL pose is solved in main.js AFTER the geometry
  // exists — see solveRadius below for why that ordering is not optional.
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 100);
  const TARGET = new THREE.Vector3(0, 0.0655, 0);
  camera.position.set(TARGET.x + 0.431, TARGET.y + 0.274, TARGET.z + 0.616);
  camera.lookAt(TARGET);

  // --- OrbitControls ----------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;   // REQUIRED — rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(TARGET);
  controls.minDistance = 0.2;
  controls.maxDistance = 10;
  controls.update();

  // --- Resize handler ---------------------------------------------------------
  function onResize() {
    const wrap = canvas.parentElement;
    const nW = wrap?.clientWidth  || window.innerWidth;
    const nH = wrap?.clientHeight || window.innerHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, controls, lights };
}
