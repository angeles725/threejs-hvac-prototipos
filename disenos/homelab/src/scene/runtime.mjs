// runtime.mjs — renderer, scene, camera, OrbitControls, house-rig lights.
//
// Constraints for headless SwiftShader (QA gate):
//   NO RectAreaLight          — stalls shader compile; probe returns 0 draws
//   NO MeshPhysicalMaterial.transmission — same stall
//   NO scene.environmentIntensity       — dead property in r160; use material.envMapIntensity
//   NO logarithmicDepthBuffer           — not needed, avoids precision issues
//   shadowMap OFF at blockout            — budget + SwiftShader compat

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ renderer, scene, camera, controls, lights }}
 */
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

  // IBL — RoomEnvironment for reflections on metallic rails
  // Intensity controlled via material.envMapIntensity (not scene.environmentIntensity)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // --- House lighting rig (P5d LIGHTING-CAMERA pass) --------------------------
  // Design note: the rack is a VERTICAL METAL subject — 2 m tall front face.
  // A top-heavy key alone leaves vertical faces dark. Strategy:
  //   • Key: moderate height (not straight overhead), sweeping from right
  //   • Front fill: strong — primary source for the vertical door face + interior
  //   • Interior fill: low, frontal, illuminates rack inside for open-door shots
  //   • Fill left: cool complement, prevents harsh shadow on left panels
  //   • Rim: cold back separation from dark background
  // envMapIntensity on metals (rails 2.2, frame 0.6) provides specular depth.
  // NEVER raise metalness to fix flat read — raise envMapIntensity or light instead.

  const hemi = new THREE.HemisphereLight(0xd0e8f8, 0x1a2030, 0.48);
  hemi.name = 'hemi_light';
  scene.add(hemi);

  // Key: right-front, moderate elevation — balances top cap and front door face
  const key = new THREE.DirectionalLight(0xfff9f2, 1.25);
  key.name = 'key_light';
  key.position.set(5, 6, 7);   // less overhead than (6,10,8), more frontal reach
  key.castShadow = false;
  scene.add(key);

  // Front fill: primary source for vertical door face (metalness 0 painted steel)
  // Boosted from 0.35 → 0.60; also reaches rack interior through open mesh door.
  const front = new THREE.DirectionalLight(0xf2f6ff, 0.60);
  front.name = 'front_fill';
  front.position.set(1.5, 2.5, 10);
  front.castShadow = false;
  scene.add(front);

  // Interior fill: low-angle frontal, aimed into the open rack at el≈12°.
  // Illuminates rear rails and interior panels for open-door capture (deferred #1).
  const interior = new THREE.DirectionalLight(0xe8eeff, 0.38);
  interior.name = 'interior_fill';
  interior.position.set(1, 1.2, 9);   // very frontal, low — reaches inside
  interior.castShadow = false;
  scene.add(interior);

  // Fill left: cool complement, moderates shadow on left side panel
  const fill = new THREE.DirectionalLight(0xc8deff, 0.35);
  fill.name = 'fill_light';
  fill.position.set(-7, 4, 5);
  fill.castShadow = false;
  scene.add(fill);

  // Rim: cold back-light separates cabinet from dark background
  const rim = new THREE.DirectionalLight(0x80aee0, 0.28);
  rim.name = 'rim_light';
  rim.position.set(-4, 3, -9);
  rim.castShadow = false;
  scene.add(rim);

  // --- Camera — fov 40, azimuth 42°, elevation 22° (hero composition) --------
  // Spec range: az 40-45°, el 20-28°. el=22° gives hero look without shooting
  // too far over the top. r=4.0 for full-height visibility.
  //   dx = 4.0 * cos(22°) * sin(42°) ≈ 2.484
  //   dy = 4.0 * sin(22°)            ≈ 1.498
  //   dz = 4.0 * cos(22°) * cos(42°) ≈ 2.756
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
  const TARGET = new THREE.Vector3(0, 1.0, 0);
  camera.position.set(TARGET.x + 2.484, TARGET.y + 1.498, TARGET.z + 2.756);
  camera.lookAt(TARGET);

  // --- OrbitControls ----------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;   // REQUIRED — rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(TARGET);
  controls.minDistance = 1.0;
  controls.maxDistance = 30;
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

  const lights = { hemi, key, fill, front, interior, rim };
  return { renderer, scene, camera, controls, lights };
}
