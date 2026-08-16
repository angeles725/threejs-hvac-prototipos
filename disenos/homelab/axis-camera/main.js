// main.js — axis-camera entry point.
// Wires runtime + builder + UI controls + window.__qaFraming + window.__qaState.

import * as THREE from 'three';
import { createRuntime, solveRadius, applyCameraPose, CAMERA_VIEWS } from './src/scene/runtime.mjs';
import { createMaterials, verifyMaterialsMatchSpec } from './src/scene/materials.mjs';
import { createLightingRig, verifyDownwardNormalsAreLit } from './src/scene/lighting.mjs';
import { buildAxisCamera, verifyAll, subjectBox } from './src/scene/axis-camera.mjs';
import { createInteraction } from './src/scene/interaction.mjs';

// BUMP THIS when the design advances. The HUD label is evidence a judge reads, so a stale
// one is a false claim about what is being shown. It is written into the DOM from here so
// the markup cannot drift, and echoed in __qaState so a probe can cross-check it.
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
const cam3d = buildAxisCamera(mats);
const root = cam3d.root;
scene.add(root);

// Guards run at boot, in the page, so the QA gate's console sweep sees them.
verifyMaterialsMatchSpec(mats);
verifyAll(root);
verifyDownwardNormalsAreLit(lights);

// ── Camera solve ──────────────────────────────────────────────────────────────
// Solved AFTER the build, against the box that actually exists — a radius is a property of
// the built object, never of a spec field.
//
// AND RE-SOLVED PER STATE: hiding the bubble changes the bounding box. A radius solved with
// the dome on and reused with it off frames a subject that is no longer there.
let solved = {};
function solveCamera() {
  // subjectBox, NOT setFromObject(root): Box3.setFromObject IGNORES `visible`, so the
  // hidden 400 mm ceiling prop would be framed instead of the 101 mm camera.
  const box = subjectBox(root);
  const aspect = camera.aspect || 16 / 9;
  for (const [name, view] of Object.entries(CAMERA_VIEWS)) solved[name] = solveRadius(box, view, aspect);
  applyView();
}

function applyView(next) {
  if (next) state.view = next;
  applyCameraPose(camera, controls, solved[state.view], CAMERA_VIEWS[state.view]);
  if (btnView) {
    btnView.textContent = `VISTA: ${state.view === 'hero' ? 'HERO' : 'INFERIOR'}`;
    btnView.classList.toggle('active', state.view !== 'hero');
  }
  // Which hotspots are reachable depends on the camera, so the legend must be re-derived
  // rather than left stale.
  if (typeof renderHotspotLegend === 'function') renderHotspotLegend();
}

// ── window.__qaFraming ────────────────────────────────────────────────────────
window.__qaFraming = () => {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const mvp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  // Same reason as the solve: the framing metric must describe the SUBJECT.
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
const state = { dome: true, tilt: 22, ceiling: false, view: 'hero', autoRotate: false };

window.__qaState = () => {
  // Report the DRIVEN values beside the claimed ones. A state object saying dome:true while
  // the mesh is hidden is exactly the contradiction that shipped a dark hero on the sibling
  // asset, and no probe can see it from the state alone.
  const bubble = root.getObjectByName('dome_bubble');
  const cradle = root.getObjectByName('lens_module');
  const axis = new THREE.Vector3(0, -1, 0)
    .applyQuaternion(cradle.getWorldQuaternion(new THREE.Quaternion())).normalize();
  return {
    pass: bootPass,
    hudPassText: document.getElementById('hud-pass')?.textContent ?? null,
    dome: state.dome,
    domeVisibleActual: !!bubble?.visible,
    domeOpacityActual: bubble?.material?.opacity ?? null,
    // The indicator's DRIVEN emission, reported as colour AND intensity. Intensity alone
    // proves nothing: three.js defaults it to 1 over a black emissive, so a dead lamp
    // reports a healthy number.
    ledEmissiveHex: `#${mats.status_led.emissive.getHexString()}`,
    ledEmissiveIntensity: mats.status_led.emissiveIntensity,
    tilt: state.tilt,
    opticalAxisActual: [+axis.x.toFixed(4), +axis.y.toFixed(4), +axis.z.toFixed(4)],
    tiltOffVerticalDeg: +THREE.MathUtils.radToDeg(axis.angleTo(new THREE.Vector3(0, -1, 0))).toFixed(2),
    ceiling: state.ceiling,
    ceilingVisibleActual: !!root.getObjectByName('ceiling_prop')?.visible,
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
    `dome:${state.dome ? 'on' : 'off'} · tilt:${state.tilt}° · ceiling:${state.ceiling ? 'on' : 'off'} · autorotate:${state.autoRotate ? 'yes' : 'no'}`;
}

// ── controls ──────────────────────────────────────────────────────────────────
const btnDome = document.getElementById('btn-dome');
const btnTilt = document.getElementById('btn-tilt');
const btnCeiling = document.getElementById('btn-ceiling');
const btnView = document.getElementById('btn-view');
const btnAutorotate = document.getElementById('btn-autorotate');

const TILTS = [0, 22, 45];

function applyDome(on) {
  state.dome = !!on;
  cam3d.setDome(state.dome);
  btnDome.textContent = `◍ CÚPULA: ${state.dome ? 'ON' : 'OFF'}`;
  btnDome.classList.toggle('active', state.dome);
  // The bubble is part of the silhouette, so hiding it changes what has to be framed.
  if (Object.keys(solved).length) solveCamera();
  updateHudState();
  if (typeof renderHotspotLegend === 'function') renderHotspotLegend();
}

function applyTilt(deg) {
  state.tilt = deg;
  cam3d.setTilt(deg);
  btnTilt.textContent = `⌖ INCLINACIÓN: ${deg}°`;
  btnTilt.classList.toggle('active', deg !== 22);
  updateHudState();
  if (typeof renderHotspotLegend === 'function') renderHotspotLegend();
}

function applyCeiling(on) {
  state.ceiling = !!on;
  cam3d.setCeiling(state.ceiling);
  btnCeiling.textContent = `▤ TECHO: ${state.ceiling ? 'ON' : 'OFF'}`;
  btnCeiling.classList.toggle('active', state.ceiling);
  updateHudState();
}

function applyAutoRotate(yes) {
  state.autoRotate = yes;
  controls.autoRotate = yes;
  btnAutorotate.textContent = `↻ AUTO-ROTATE: ${yes ? 'ON' : 'OFF'}`;
  btnAutorotate.classList.toggle('active', yes);
  updateHudState();
}

btnDome.addEventListener('click', () => applyDome(!state.dome));
btnTilt.addEventListener('click', () => applyTilt(TILTS[(TILTS.indexOf(state.tilt) + 1) % TILTS.length]));
btnCeiling.addEventListener('click', () => applyCeiling(!state.ceiling));
btnAutorotate.addEventListener('click', () => applyAutoRotate(!state.autoRotate));
btnView.addEventListener('click', () => applyView(state.view === 'hero' ? 'under' : 'hero'));

// ── Raycast hotspots — the camera itself is interactive ──────────────────────
const hsLog = document.getElementById('hs-log');
const hsList = document.getElementById('hs-list');

const interaction = createInteraction({
  renderer, camera, cam3d, state,
  apply: { dome: applyDome, tilt: applyTilt, ceiling: applyCeiling, view: applyView },
  onAction: (msg) => { hsLog.textContent = msg; renderHotspotLegend(); },
});

// The legend is the only affordance visible in a STILL page capture — no cursor exists
// there to trigger a hover tooltip. It dims a hotspot that is not currently reachable,
// using the module's real occlusion test rather than assuming they all are.
function renderHotspotLegend() {
  hsList.replaceChildren(...interaction.qaHotspots().map((h) => {
    const li = document.createElement('li');
    li.className = h.clickable ? '' : 'off';
    const dot = document.createElement('span');
    dot.className = 'hs-dot';
    li.append(dot, document.createTextNode(h.label));
    return li;
  }));
}

window.__qaHotspots = () => interaction.qaHotspots();
window.__qaInteract = (id) => interaction.qaInteract(id);

// ── URL params ────────────────────────────────────────────────────────────────
// ?dome=on|off  ?tilt=0|22|45  ?ceiling=on|off  ?cam=hero|under  ?autorotate=yes|no
function applyURLParams() {
  const p = new URLSearchParams(location.search);
  if (p.has('dome')) state.dome = p.get('dome') !== 'off';
  if (p.has('tilt')) {
    const t = Number(p.get('tilt'));
    if (TILTS.includes(t)) state.tilt = t;
  }
  if (p.has('ceiling')) state.ceiling = p.get('ceiling') === 'on';
  if (p.has('autorotate')) state.autoRotate = p.get('autorotate') === 'yes';
  const c = p.get('cam');
  if (c && CAMERA_VIEWS[c]) state.view = c;
}
applyURLParams();

// EVERY axis is driven at boot, URL or not. A toggle that only runs on a click leaves the
// default capture rendering one thing while the HUD reports another — the sibling asset
// shipped exactly that, with dark LEDs under a "power:on" label.
document.getElementById('hud-pass').textContent = `Pase ${bootPass}`;
applyDome(state.dome);
applyTilt(state.tilt);
applyCeiling(state.ceiling);
applyAutoRotate(state.autoRotate);

// solveCamera(), NOT a bare applyView(): the solve must have run before any pose is applied,
// or `solved` is still {} and applyCameraPose throws at module level, killing the page.
solveCamera();
renderHotspotLegend();

window.addEventListener('resize', () => { solveCamera(); });

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

document.documentElement.setAttribute('data-app-ready', 'true');
