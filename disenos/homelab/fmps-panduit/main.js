// main.js — fmps-panduit entry point.
// Wires runtime + builder + UI controls + window.__qaFraming + window.__qaState.

import * as THREE from 'three';
import { createRuntime, solveRadius, applyCameraPose, CAMERA_VIEWS } from './src/scene/runtime.mjs';
import { createMaterials, verifyMaterialsMatchSpec } from './src/scene/materials.mjs';
import { verifyFrontOutshinesTheLid } from './src/scene/lighting.mjs';
import { buildFMPS, verifyAll, subjectBox } from './src/scene/fmps-panduit.mjs';

// BUMP THIS when the design advances. The HUD label is evidence a judge reads, so a stale one
// is a false claim about what is being shown. Written into the DOM from here so the markup
// cannot drift, and echoed in __qaState so a probe can cross-check it.
const CURRENT_PASS = 'FINAL';
const PASSES = ['BLOCKOUT', 'STRUCTURAL', 'MATERIALS', 'SURFACE', 'LIGHTING', 'INTERACTION', 'OPTIMIZATION', 'FINAL'];
const bootPass = (() => {
  const p = (new URLSearchParams(location.search).get('pass') || '').toUpperCase();
  return PASSES.includes(p) ? p : CURRENT_PASS;
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const { renderer, scene, camera, controls, lights } = createRuntime(canvas);

const mats = createMaterials();
const chassis = buildFMPS(mats);
const root = chassis.root;
scene.add(root);

// Guards run at boot, in the page, so the QA gate's console sweep sees them.
verifyMaterialsMatchSpec(mats);
verifyAll(root);
verifyFrontOutshinesTheLid(lights);

// ── Camera solve ──────────────────────────────────────────────────────────────
// Solved AFTER the build, against the box that actually exists. A radius is a property of the
// built object, never of a spec field — and subjectBox, not setFromObject, because
// Box3.setFromObject IGNORES `visible` and the hidden blanking plates would inflate it.
let solved = {};
function solveCamera() {
  const box = subjectBox(root);
  const aspect = camera.aspect || 16 / 9;
  for (const [name, view] of Object.entries(CAMERA_VIEWS)) solved[name] = solveRadius(box, view, aspect);
  applyView();
}

function applyView(next) {
  if (next) state.view = next;
  applyCameraPose(camera, controls, solved[state.view], CAMERA_VIEWS[state.view]);
  if (btnView) {
    btnView.textContent = `VISTA: ${state.view === 'hero' ? 'HERO' : 'DETALLE'}`;
    btnView.classList.toggle('active', state.view !== 'hero');
  }
}

// ── window.__qaFraming ────────────────────────────────────────────────────────
window.__qaFraming = () => {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const mvp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const b = subjectBox(root);
  const mn = b.min; const mx = b.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ];
  const hudEl = document.querySelector('#hud');
  const hud = hudEl
    ? (r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }))(hudEl.getBoundingClientRect())
    : null;
  return { mvpElements: Array.from(mvp.elements), corners, W: innerWidth, H: innerHeight, hud };
};

// ── state ─────────────────────────────────────────────────────────────────────
const state = { psu: 'standby', modules: 'all', view: 'hero', autoRotate: false };

window.__qaState = () => {
  // Report the DRIVEN values beside the claimed ones. A state object saying enabled while the
  // lamps render blue is the contradiction that shipped a dark hero on a sibling asset, and
  // no probe can see it from the state alone.
  const psuLed = root.getObjectByName('psu_led_0');
  const populated = [];
  for (let i = 0; i < 9; i += 1) {
    if (root.getObjectByName(`module_face_${i}`)?.visible) populated.push(i);
  }
  return {
    pass: bootPass,
    hudPassText: document.getElementById('hud-pass')?.textContent ?? null,
    psu: state.psu,
    psuLedMaterialActual: psuLed?.material?.name ?? null,
    psuLedEmissiveHex: psuLed ? `#${psuLed.material.emissive.getHexString()}` : null,
    psuLedEmissiveIntensity: psuLed?.material?.emissiveIntensity ?? null,
    modules: state.modules,
    populatedBaysActual: populated.length,
    blanksVisibleActual: Array.from({ length: 9 }, (_, i) => root.getObjectByName(`blank_plate_${i}`)?.visible)
      .filter(Boolean).length,
    view: state.view,
    autoRotate: state.autoRotate,
    cameraPos: [camera.position.x, camera.position.y, camera.position.z],
    solvedRadius: Object.fromEntries(Object.entries(solved).map(([k, v]) => [k, +v.radius.toFixed(4)])),
  };
};

// ── HUD ───────────────────────────────────────────────────────────────────────
const hudStateEl = document.getElementById('hud-state');
function updateHudState() {
  hudStateEl.textContent =
    `psu:${state.psu} · modules:${state.modules} · autorotate:${state.autoRotate ? 'yes' : 'no'}`;
}

// ── controls ──────────────────────────────────────────────────────────────────
const btnPsu = document.getElementById('btn-psu');
const btnModules = document.getElementById('btn-modules');
const btnView = document.getElementById('btn-view');
const btnAutorotate = document.getElementById('btn-autorotate');

function applyPsu(mode) {
  chassis.applyPsuState(mode);
  state.psu = chassis.state.psu;
  btnPsu.textContent = `⏻ PSU: ${state.psu === 'enabled' ? 'ENABLED' : 'STANDBY'}`;
  btnPsu.classList.toggle('active', state.psu === 'enabled');
  updateHudState();
}

function applyModules(mode) {
  chassis.applyModulePopulation(mode);
  state.modules = chassis.state.modules;
  btnModules.textContent = `▦ MÓDULOS: ${state.modules === 'all' ? '9/9' : '6/9'}`;
  btnModules.classList.toggle('active', state.modules === 'partial');
  // Removing modules changes the silhouette only marginally, but the box is what the camera
  // is solved against, so re-solve rather than assume.
  if (Object.keys(solved).length) solveCamera();
  updateHudState();
}

function applyAutoRotate(yes) {
  state.autoRotate = yes;
  controls.autoRotate = yes;
  btnAutorotate.textContent = `↻ AUTO-ROTATE: ${yes ? 'ON' : 'OFF'}`;
  btnAutorotate.classList.toggle('active', yes);
  updateHudState();
}

btnPsu.addEventListener('click', () => applyPsu(state.psu === 'enabled' ? 'standby' : 'enabled'));
btnModules.addEventListener('click', () => applyModules(state.modules === 'all' ? 'partial' : 'all'));
btnView.addEventListener('click', () => applyView(state.view === 'hero' ? 'front-detail' : 'hero'));
btnAutorotate.addEventListener('click', () => applyAutoRotate(!state.autoRotate));

// ── URL params ────────────────────────────────────────────────────────────────
// ?psu=standby|enabled  ?modules=all|partial  ?cam=hero|front-detail  ?autorotate=yes|no
function applyURLParams() {
  const p = new URLSearchParams(location.search);
  if (p.has('psu')) state.psu = p.get('psu') === 'enabled' ? 'enabled' : 'standby';
  if (p.has('modules')) state.modules = p.get('modules') === 'partial' ? 'partial' : 'all';
  if (p.has('autorotate')) state.autoRotate = p.get('autorotate') === 'yes';
  const c = p.get('cam');
  if (c && CAMERA_VIEWS[c]) state.view = c;
}
applyURLParams();

// EVERY axis is driven at boot, URL or not. A toggle that only runs on a click leaves the
// default capture rendering one thing while the HUD reports another — a sibling asset shipped
// exactly that, with dark LEDs under a "power:on" label.
document.getElementById('hud-pass').textContent = `Pase ${bootPass}`;
applyPsu(state.psu);
applyModules(state.modules);
applyAutoRotate(state.autoRotate);

// solveCamera(), NOT a bare applyView(): the solve must have run before any pose is applied,
// or `solved` is still {} and applyCameraPose throws at module level, killing the page.
solveCamera();

window.addEventListener('resize', () => { solveCamera(); });

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

document.documentElement.setAttribute('data-app-ready', 'true');
