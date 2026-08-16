// main.js — pdu-panduit entry point.
// Wires runtime + scene builder + UI controls + the __qaFraming / __qaState hooks.
// The pass being rendered is CURRENT_PASS below — bump it when the design advances.

import * as THREE from 'three';
import { createRuntime, applyCameraView, CAMERA_VIEWS } from './src/scene/runtime.mjs';
import { buildPduPair } from './src/scene/pdu-strip.mjs';
import { createInteraction } from './src/scene/interaction.mjs';

// ── Current pass ─────────────────────────────────────────────────────────────
// BUMP THIS when the design advances a pass. The HUD label is evidence the blind judge
// reads, so a stale one is a false claim about what is being shown. It is written into
// the DOM from here (never hard-coded in index.html, which is how it stayed on
// "BLOCKOUT" for the whole structural pass) and echoed in __qaState, so a probe can
// cross-check the rendered label against the state instead of trusting the pixels.
const CURRENT_PASS = 'OPTIMIZATION';
const PASSES = ['BLOCKOUT', 'STRUCTURAL', 'MATERIALS', 'SURFACE', 'LIGHTING', 'INTERACTION', 'OPTIMIZATION', 'DETAIL'];

// ── Bootstrap ────────────────────────────────────────────────────────────────
// The camera view is read BEFORE the runtime is built, so the very first rendered
// frame is already the requested pose — a capture must never depend on a later nudge.
const params = new URLSearchParams(window.location.search);
const bootView = (() => {
  const v = params.get('cam');
  return v && CAMERA_VIEWS[v] ? v : 'front';
})();
const bootPass = (() => {
  const p = (params.get('pass') || '').toUpperCase();
  return PASSES.includes(p) ? p : CURRENT_PASS;
})();

const canvas = document.getElementById('canvas');
const { renderer, scene, camera, controls } = createRuntime(canvas, { view: bootView });
const pdu = buildPduPair(scene);
const { root, feedA, feedB } = pdu;

// ── window.__qaFraming — per recipe qa-framing-hook.md ─────────────────────
// Zero-arg closure: returns camera MVP + subject 8-corner AABB as raw data.
// SUBJECT = root (the pdu_root Group).
// Do NOT return verdict booleans — the consumer (framing-probe.mjs) computes ok/fail.
window.__qaFraming = () => {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const mvp = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  // Only VISIBLE strips define the subject box: when a feed is soloed, framing must follow
  // what is actually on screen, not the hidden twin (see memory: toggle-audit-turns-things-off).
  const box = new THREE.Box3();
  for (const strip of [feedA, feedB]) {
    if (strip.visible) box.expandByObject(strip);
  }
  if (box.isEmpty()) box.setFromObject(root, true);
  const mn = box.min;
  const mx = box.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z],
    [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z],
    [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ];
  const rectOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  };
  // `hud` stays for the existing probe contract. `panels` is new: this pass is captured
  // with --page, so the control panel and the interaction legend are part of the frame
  // too. A probe checking only #hud would happily pass a subject buried under them.
  const panels = [
    { id: 'hud', rect: rectOf('#hud') },
    { id: 'controls', rect: rectOf('#controls') },
    { id: 'hotspots', rect: rectOf('#hotspots') },
  ].filter((p) => p.rect);
  return {
    mvpElements: Array.from(mvp.elements), corners,
    W: innerWidth, H: innerHeight,
    hud: rectOf('#hud'),
    panels,
  };
};

// ── window.__qaState — what is actually ON, for the capture harness ──────────
// A probe that clicks blindly disables what defaults on and manufactures fake
// "nothing visible" defects. Expose the truth instead of making it guess.
window.__qaState = () => ({
  feed: state.feed,
  head: state.head,
  mounts: state.mounts,
  black: state.black,
  view: state.view,
  autoRotate: state.autoRotate,
  built: pdu.built,
  // Pass label, twice: what the code intends and what the DOM actually shows. If they
  // ever disagree, the capture is mislabelled and the probe can say so.
  pass: bootPass,
  hotspots: window.__qaHotspots ? window.__qaHotspots().map(h => ({ id: h.id, clickable: !!h.clickable })) : null,
  hudPassText: document.getElementById('hud-pass')?.textContent ?? null,
  visible: { feedA: feedA.visible, feedB: feedB.visible },
  // Camera position is part of the state a probe must be able to read back: two shots
  // that differ only by URL but render identically are exactly how the mounts capture
  // went unnoticed at attempt 1.
  cameraPos: [camera.position.x, camera.position.y, camera.position.z],
});

// ── UI state ─────────────────────────────────────────────────────────────────
const state = {
  feed: 'ab',        // 'ab' (both) | 'a' (red solo) | 'b' (blue solo)
  head: false,       // LCD backlight
  mounts: false,     // rear keyhole mount buttons
  black: false,      // body_black variant (the black strips seen beside the A/B pair)
  view: bootView,    // 'front' (P3-approved) | 'front-detail' | 'rear' | 'rear-detail'
  autoRotate: false,
};

// apply* run once at boot BEFORE the interaction module exists, so the legend refresh
// has to be a no-op until then rather than throwing during startup.
function refreshLegend() { if (typeof renderHotspotLegend === 'function') renderHotspotLegend(); }

const FEED_CYCLE = ['ab', 'a', 'b'];
const FEED_LABEL = { ab: 'A+B', a: 'A (ROJO)', b: 'B (AZUL)' };

function applyFeed() {
  feedA.visible = state.feed === 'ab' || state.feed === 'a';
  feedB.visible = state.feed === 'ab' || state.feed === 'b';
  refreshLegend();
  // Each strip owns its body material (feedA red, feedB blue), so the pair reads as A/B
  // by color with both visible — soloing only hides one, it never recolors the other.
  btnFeed.textContent = `FEED: ${FEED_LABEL[state.feed]}`;
  btnFeed.classList.toggle('active', state.feed !== 'ab');
}

function applyHead() {
  pdu.setLcd(state.head);
  btnHead.textContent = `DISPLAY: ${state.head ? 'ON' : 'OFF'}`;
  btnHead.classList.toggle('active', state.head);
}

function applyMounts() {
  pdu.setMountButtons(state.mounts);
  refreshLegend();
  btnMounts.textContent = `BOTONES MONTAJE: ${state.mounts ? 'SÍ' : 'NO'}`;
  btnMounts.classList.toggle('active', state.mounts);
}

function applyBlack() {
  pdu.setBodyBlack(state.black);
  btnBlack.textContent = `CUERPO: ${state.black ? 'NEGRO' : 'A/B ROJO-AZUL'}`;
  btnBlack.classList.toggle('active', state.black);
}

function applyAutoRotate() {
  controls.autoRotate = state.autoRotate;
  btnAutoRotate.textContent = `AUTO-ROTAR: ${state.autoRotate ? 'SÍ' : 'NO'}`;
  btnAutoRotate.classList.toggle('active', state.autoRotate);
}

const VIEW_CYCLE = ['front', 'front-detail', 'rear', 'rear-detail'];
const VIEW_LABEL = {
  front: 'FRENTE',
  'front-detail': 'FRENTE DETALLE',
  rear: 'TRASERA',
  'rear-detail': 'TRASERA DETALLE',
};

function applyView() {
  applyCameraView(camera, controls, state.view);
  btnView.textContent = `VISTA: ${VIEW_LABEL[state.view]}`;
  btnView.classList.toggle('active', state.view !== 'front');
  // Which hotspots are reachable depends on the camera: from the front the mount buttons
  // are behind the strip. Re-derive rather than leave a stale legend.
  refreshLegend();
}

// ── Button handlers ───────────────────────────────────────────────────────────
const btnFeed       = document.getElementById('btn-feed');
const btnHead       = document.getElementById('btn-head');
const btnMounts     = document.getElementById('btn-mounts');
const btnBlack      = document.getElementById('btn-black');
const btnView       = document.getElementById('btn-view');
const btnAutoRotate = document.getElementById('btn-autorotate');

// BODY BLACK — makes the spec's declared body_black variant reachable
btnBlack.addEventListener('click', () => {
  state.black = !state.black;
  applyBlack();
});

// VIEW FRONT-REAR — the rear poses are what make the mount buttons capturable at all
btnView.addEventListener('click', () => {
  state.view = VIEW_CYCLE[(VIEW_CYCLE.indexOf(state.view) + 1) % VIEW_CYCLE.length];
  applyView();
});

// FEED A-B — cycles both -> A solo -> B solo
btnFeed.addEventListener('click', () => {
  state.feed = FEED_CYCLE[(FEED_CYCLE.indexOf(state.feed) + 1) % FEED_CYCLE.length];
  applyFeed();
});

// HEAD DISPLAY ON-OFF
btnHead.addEventListener('click', () => {
  state.head = !state.head;
  applyHead();
});

// SHOW MOUNT BUTTONS
btnMounts.addEventListener('click', () => {
  state.mounts = !state.mounts;
  applyMounts();
});

// AUTO-ROTATE
btnAutoRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  applyAutoRotate();
});

// ── URL state params (load-time, for headless multi-shot capture) ─────────────
// Reads ?cam=front|front-detail|rear|rear-detail  ?feed=ab|a|b  ?head=on|off
// ?mounts=0|1  ?body=black on cold load.
// (?cam is consumed earlier, at bootView, so the first frame is already in the right pose.)
// Routed through the SAME apply* functions as the buttons — one source of truth per axis,
// so a URL capture cannot diverge from what a click produces.
// GATES.md: "THE CAPTURE URL IS A FIRST-CLASS CODE PATH — test the LOAD, not the click."
(function applyURLParams() {
  const p = params;   // one parse for the whole file; ?cam and ?pass were read at boot

  const feed = p.get('feed');
  if (feed && FEED_CYCLE.includes(feed)) state.feed = feed;

  const head = p.get('head');
  if (head === 'on' || head === '1') state.head = true;

  const mounts = p.get('mounts');
  if (mounts === '1' || mounts === 'on') state.mounts = true;

  const body = p.get('body');
  if (body === 'black') state.black = true;
})();

// Apply every axis unconditionally at boot, URL-driven or not — this is what keeps the
// default view and the captured view on the same code path.
// ── Raycast hotspots — the MODEL itself is interactive, not just the panel ────
const hsLog = document.getElementById('hs-log');
const hsList = document.getElementById('hs-list');

const interaction = createInteraction({
  renderer, camera, scene, pdu, state,
  apply: { feed: applyFeed, head: applyHead, mounts: applyMounts, black: applyBlack, view: applyView },
  onAction: (msg) => { hsLog.textContent = msg; renderHotspotLegend(); },
});

// The legend is the only affordance visible in a STILL page capture — no cursor exists
// there to trigger a hover tooltip. It also marks which hotspots are currently reachable,
// using the module's real occlusion test rather than assuming they all are.
function renderHotspotLegend() {
  const rows = interaction.qaHotspots();
  hsList.replaceChildren(...rows.map((h) => {
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

// HUD pass label — written from code so index.html can never drift out of date.
document.getElementById('hud-pass').textContent = `Pase ${bootPass}`;

applyFeed();
applyHead();
applyMounts();
applyBlack();
applyView();       // state.view was already seeded from ?cam= before the runtime was built
applyAutoRotate();
renderHotspotLegend();

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Signal app ready (lets capture harness know the scene settled)
document.documentElement.setAttribute('data-app-ready', 'true');

animate();
