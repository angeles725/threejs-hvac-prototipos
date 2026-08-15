// Scene runtime — renderer, base scene, house-rig lights, camera, OrbitControls.
// Factored out of main.js so the entry point focuses on wiring, not boilerplate.
//
// Lighting rig constraints (headless SwiftShader):
//   NO RectAreaLight  — stalls the shader compile; probe returns 0 draws
//   NO MeshPhysicalMaterial.transmission  — same stall
//   NO scene.environmentIntensity  — does not exist in r160; use material.envMapIntensity
//   NO logarithmicDepthBuffer  — not needed here, avoids precision issues

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ renderer, scene, camera, controls, lights }}
 */
export function createRuntime(canvas) {
  // Use the canvas container size so the renderer respects the dashboard layout.
  // Module scripts run after CSS is applied, so clientWidth/Height are correct here.
  const wrap = canvas.parentElement;
  const W = (wrap && wrap.clientWidth > 0) ? wrap.clientWidth : window.innerWidth;
  const H = (wrap && wrap.clientHeight > 0) ? wrap.clientHeight : window.innerHeight;

  // --- Renderer ---------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    logarithmicDepthBuffer: false,  // PROHIBITED — not needed and avoids precision quirks
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = false; // blockout: no shadows (budget + SwiftShader compat)

  // --- Scene ------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070A0F');

  // Slight fog to push the far end of the bay into distance perspective
  scene.fog = new THREE.Fog(0x070a0f, 120, 280);

  // --- House lighting rig (spec: house-rig) -----------------------------------
  // Hemisphere: warm sky, cool ground
  const hemi = new THREE.HemisphereLight(0xd0e4f0, 0x282c1e, 0.55);
  hemi.name = 'hemi_light';
  scene.add(hemi);

  // Key: upper right front, angled to read the industrial equipment
  const key = new THREE.DirectionalLight(0xfff4e0, 1.35);
  key.name = 'key_light';
  key.position.set(28, 32, 22);
  key.castShadow = false;
  scene.add(key);

  // Fill: left front, cool, roughly half the key intensity
  const fill = new THREE.DirectionalLight(0xe0ecff, 0.42);
  fill.name = 'fill_light';
  fill.position.set(-22, 14, 18);
  fill.castShadow = false;
  scene.add(fill);

  // Rim/back: cold backlight to separate vertical metal faces from the background
  const rim = new THREE.DirectionalLight(0xaac8f0, 0.28);
  rim.name = 'rim_light';
  rim.position.set(-14, 6, -32);
  rim.castShadow = false;
  scene.add(rim);

  // --- Camera (spec: fov 55, azimuth 42°, elevation 24°) ----------------------
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.5, 350);

  // Default hero position — set properly in main.js via applyViewPreset()
  camera.position.set(35, 28, 40);
  camera.lookAt(0, 4, 0);

  // --- OrbitControls ----------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = false;    // REQUIRED — a rotating scene never settles for capture
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 200;
  controls.target.set(0, 4, 0);
  controls.update();

  // --- Resize handler ---------------------------------------------------------
  // Sizes from the canvas parent so the renderer stays within the dashboard column.
  function onResize() {
    const w = canvas.parentElement;
    const nW = (w && w.clientWidth > 0) ? w.clientWidth : window.innerWidth;
    const nH = (w && w.clientHeight > 0) ? w.clientHeight : window.innerHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH, false); // false: don't override CSS; HTML attrs are enough
  }
  window.addEventListener('resize', onResize);

  // Exposed for the dev-only tuning UI (src/dev/dev-ui.mjs). The gate/production path never
  // reads these; they are returned so the operator can tune the rig live and export a preset.
  const lights = { hemi, key, fill, rim };

  return { renderer, scene, camera, controls, lights };
}
