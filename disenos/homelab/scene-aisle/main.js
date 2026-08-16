// main.js — scene-aisle entry point.
// Wires runtime + assembly + UI controls + window.__qaFraming + window.__qaState.

import * as THREE from 'three';
import { createRuntime, solveRadius, applyCameraPose, CAMERA_VIEWS } from './src/scene/runtime.mjs';
import { buildAisle, verifyAll, verifyCriticalsAreVisible } from './src/scene/aisle.mjs';
import { createInteraction, verifyClickAgreesWithSight,
         verifyPickCannotReachThroughSolids } from './src/scene/interaction.mjs';
import { LED_COLORS } from '../src/scene/rack-cabinet.mjs';

const CURRENT_PASS = 'FINAL';
const PASSES = ['BLOCKOUT', 'STRUCTURAL', 'MATERIALS', 'SURFACE', 'LIGHTING', 'INTERACTION', 'OPTIMIZATION', 'FINAL'];
// PASSES validated the QUERY PARAM but never CURRENT_PASS, so the constant this file ships
// with was the one value in the system nothing checked — 'LIGHTING-CAMERA' sat here for a
// whole pass without being a member of the list, and a plain typo would have been just as
// silent. The externally-supplied value was guarded and the locally-authored one was trusted,
// which is backwards: the local one is the one that gets edited every pass.
if (!PASSES.includes(CURRENT_PASS)) {
  console.error(`[main] CURRENT_PASS "${CURRENT_PASS}" is not one of ${PASSES.join(', ')}`);
}
const bootPass = (() => {
  const p = (new URLSearchParams(location.search).get('pass') || '').toUpperCase();
  return PASSES.includes(p) ? p : CURRENT_PASS;
})();

const canvas = document.getElementById('canvas');
const { renderer, scene, camera, controls } = createRuntime(canvas);

const aisle = buildAisle();
scene.add(aisle.root);
verifyAll(scene, aisle.materials);

// ── Camera solve ──────────────────────────────────────────────────────────────
// EACH VIEW GETS ITS OWN SUBJECT. The first version solved both views against the whole row
// of cabinets, which is right for the aisle shot and wrong for a detail shot: the hero view
// then framed the CENTRE OF THE SCENE from far enough away to contain all six cabinets, put
// the eye at x=5.30 — outside the corridor — and landed its centre pixel on the exterior wall.
//
// A view is defined by what it must SHOW, not by the scene it happens to live in.
function visibleBoxOf(node) {
  node.updateMatrixWorld(true);
  const b = new THREE.Box3();
  node.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    for (let o = m.parent; o; o = o.parent) if (!o.visible) return;
    b.union(new THREE.Box3().setFromObject(m, true));
  });
  return b;
}

function subjectFor(viewName) {
  if (viewName === 'hero-rack') {
    // THE EQUIPMENT STACK, not the whole cabinet. This view exists to show the mounted
    // devices; framing the entire 2.1 m cabinet inside a 2 m corridor is geometrically
    // impossible at fov 50 — the solver ran out of room, fell back to r=12 and put the eye
    // 10 m away through the far wall. A view's subject is what it must SHOW.
    const eq = aisle.hero.getObjectByName('rack_equipment');
    if (eq) return visibleBoxOf(eq);
    return visibleBoxOf(aisle.hero);
  }
  const b = new THREE.Box3();
  for (const c of aisle.cabinets) b.union(visibleBoxOf(c));
  if (aisle.figure?.visible) b.union(visibleBoxOf(aisle.figure));
  return b;
}
const framingSubject = () => subjectFor(state.view);

let solved = {};
function solveCamera() {
  scene.updateMatrixWorld(true);
  const aspect = camera.aspect || 16 / 9;
  for (const [name, view] of Object.entries(CAMERA_VIEWS)) {
    // The detail view is capped so the solver cannot walk the eye out through a wall to fit
    // its subject. A corridor is 2 m wide; a camera 5 m off-axis is outdoors.
    // A corridor is 2 m wide, so the eye has ~1 m of room off the cabinet face. Capped at
    // 2.4 m: any further and the camera stands inside the opposite cabinet, which renders
    // that cabinet's interior wall and nothing else.
    const maxR = name === 'hero-rack' ? 2.4 : 40.0;
    solved[name] = solveRadius(subjectFor(name), view, aspect, 0.94, maxR);
  }
  applyView();
}

function applyView(next) {
  if (next) state.view = next;
  applyCameraPose(camera, controls, solved[state.view], CAMERA_VIEWS[state.view]);
  if (btnView) {
    btnView.textContent = `VISTA: ${state.view === 'aisle' ? 'PASILLO' : 'RACK'}`;
    btnView.classList.toggle('active', state.view !== 'aisle');
  }
}

window.__qaFraming = () => {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const mvp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const b = framingSubject();
  const mn = b.min; const mx = b.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ];
  const hudEl = document.querySelector('#hud');
  const hud = hudEl ? (r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }))(hudEl.getBoundingClientRect()) : null;
  return { mvpElements: Array.from(mvp.elements), corners, W: innerWidth, H: innerHeight, hud };
};

const state = { doors: 'open', led: 'blue', figure: true, view: 'aisle', autoRotate: false };
const LED_INDEX = { blue: 0, white: 1, green: 2 };

window.__qaState = () => {
  const first = aisle.cabinetApis[0];
  return {
    pass: bootPass,
    hudPassText: document.getElementById('hud-pass')?.textContent ?? null,
    cabinets: aisle.cabinets.length,
    doors: state.doors,
    meshDoorVisibleActual: !!first?.meshDoor?.visible,
    glassDoorVisibleActual: !!first?.glassDoor?.visible,
    led: state.led,
    ledEmissiveActual: first?.ledMat ? `#${first.ledMat.emissive.getHexString()}` : null,
    figure: state.figure,
    figureVisibleActual: !!aisle.figure?.visible,
    view: state.view,
    autoRotate: state.autoRotate,
    cameraPos: [camera.position.x, camera.position.y, camera.position.z],
    solvedRadius: Object.fromEntries(Object.entries(solved).map(([k, v]) => [k, +v.radius.toFixed(3)])),
  };
};

const hudStateEl = document.getElementById('hud-state');
function updateHudState() {
  hudStateEl.textContent = `doors:${state.doors} · led:${state.led} · figure:${state.figure ? 'on' : 'off'} · autorotate:${state.autoRotate ? 'yes' : 'no'}`;
}

const btnDoors = document.getElementById('btn-doors');
const btnLed = document.getElementById('btn-led');
const btnFigure = document.getElementById('btn-figure');
const btnView = document.getElementById('btn-view');
const btnAutorotate = document.getElementById('btn-autorotate');

function applyDoors(mode) {
  state.doors = mode === 'closed' ? 'closed' : 'open';
  // Drive every cabinet through ITS OWN api. The scene never reaches into a device's meshes —
  // that would be a second source of truth for something the asset already owns.
  for (const api of aisle.cabinetApis) {
    if (api?.meshDoor) api.meshDoor.visible = state.doors === 'closed';
    if (api?.glassDoor) api.glassDoor.visible = state.doors === 'open';
  }
  btnDoors.textContent = `▤ PUERTAS: ${state.doors === 'open' ? 'ABIERTAS' : 'CERRADAS'}`;
  btnDoors.classList.toggle('active', state.doors === 'closed');
  updateHudState();
}

function applyLed(name) {
  state.led = LED_INDEX[name] === undefined ? 'blue' : name;
  const c = LED_COLORS[LED_INDEX[state.led]];
  for (const api of aisle.cabinetApis) {
    if (api?.ledMat) api.ledMat.emissive = new THREE.Color(c.hex);
    if (api?.ledGlowMat) api.ledGlowMat.color = new THREE.Color(c.hex);
  }
  btnLed.textContent = `◈ LED: ${c.name}`;
  btnLed.classList.toggle('active', state.led !== 'blue');
  updateHudState();
}

function applyFigure(on) {
  state.figure = !!on;
  if (aisle.figure) aisle.figure.visible = state.figure;
  btnFigure.textContent = `☺ FIGURA: ${state.figure ? 'ON' : 'OFF'}`;
  btnFigure.classList.toggle('active', state.figure);
  // The figure is part of the framing subject, so hiding it changes what must be framed.
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

btnDoors.addEventListener('click', () => applyDoors(state.doors === 'open' ? 'closed' : 'open'));
btnLed.addEventListener('click', () => {
  const order = ['blue', 'white', 'green'];
  applyLed(order[(order.indexOf(state.led) + 1) % order.length]);
});
btnFigure.addEventListener('click', () => applyFigure(!state.figure));
btnView.addEventListener('click', () => applyView(state.view === 'aisle' ? 'hero-rack' : 'aisle'));
btnAutorotate.addEventListener('click', () => applyAutoRotate(!state.autoRotate));

// ?doors=closed|open  ?led=blue|white|green  ?figure=on|off  ?cam=aisle|hero-rack  ?autorotate=yes|no
function applyURLParams() {
  const p = new URLSearchParams(location.search);
  if (p.has('doors')) state.doors = p.get('doors') === 'closed' ? 'closed' : 'open';
  if (p.has('led') && LED_INDEX[p.get('led')] !== undefined) state.led = p.get('led');
  if (p.has('figure')) state.figure = p.get('figure') !== 'off';
  if (p.has('autorotate')) state.autoRotate = p.get('autorotate') === 'yes';
  const c = p.get('cam');
  if (c && CAMERA_VIEWS[c]) state.view = c;
}
applyURLParams();

// EVERY axis driven at boot, URL or not — a toggle that only runs on a click leaves the
// default capture showing one thing while the HUD reports another.
document.getElementById('hud-pass').textContent = `Pase ${bootPass}`;
applyDoors(state.doors);
applyLed(state.led);
applyFigure(state.figure);
applyAutoRotate(state.autoRotate);

solveCamera();

// Run AFTER the solve, because it needs the solved eye positions — the whole point is that a
// critical can be present, attached, correctly scaled and still outside what the camera shows.
verifyCriticalsAreVisible(scene, (v) => {
  const s = solved[v];
  if (!s) return null;
  const view = CAMERA_VIEWS[v];
  // A real camera, posed exactly as the view would be, so the guard can test the FRUSTUM and
  // not merely whether a ray arrives.
  const cam = new THREE.PerspectiveCamera(view.fov ?? camera.fov, camera.aspect || 16 / 9, 0.05, 200);
  applyCameraPose(cam, null, s, view);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return { eye: cam.position.clone(), cam };
});

window.addEventListener('resize', () => { solveCamera(); });

// ── interaction ────────────────────────────────────────────────────────────────
// Wired AFTER state and applyView exist, and given the SAME applyView the buttons use, so a
// click and a button press cannot drift into two different notions of "change the view".
const interaction = createInteraction({
  dom: renderer.domElement,
  camera,
  scene,
  aisle,
  state,
  apply: { view: (name) => applyView(name) },
});

// Run at boot rather than only under a probe: both rules arrived as MANDATORY carry-overs from
// closed assets, and a rule that is only checked when someone remembers to check it is exactly
// how the PDU shipped a pick that reached through solid geometry.
if (verifyPickCannotReachThroughSolids(interaction, camera, aisle.root)
  + verifyClickAgreesWithSight(interaction, camera, aisle.root) > 0) {
  console.error('[main] interaction guards failed at boot');
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

document.documentElement.setAttribute('data-app-ready', 'true');
