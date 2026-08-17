// main.js — rack-cabinet P5f OPTIMIZATION entry point
// Wires runtime + scene builder + UI controls + window.__qaFraming + window.__qaState.

import * as THREE from 'three';
import { createRuntime } from './src/scene/runtime.mjs';
import { buildRackCabinet, LED_COLORS } from './src/scene/rack-cabinet.mjs';

// ── Bootstrap ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const { renderer, scene, camera, controls } = createRuntime(canvas);
const {
  root, meshDoor, glassDoor,
  ledMat, ledGlowMat,
  frameMat, plinthMat, panelMat, rearPanelMat,
  FRAME_VARIANTS,
} = buildRackCabinet(scene);

// ── window.__qaFraming — per recipe qa-framing-hook.md ─────────────────────
window.__qaFraming = () => {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const mvp = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const b  = new THREE.Box3().setFromObject(root, true);
  const mn = b.min, mx = b.max;
  const corners = [
    [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z],
    [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
    [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z],
    [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
  ];
  const hudEl = document.querySelector('#hud');
  const hud   = hudEl
    ? (r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }))(hudEl.getBoundingClientRect())
    : null;
  return { mvpElements: Array.from(mvp.elements), corners, W: innerWidth, H: innerHeight, hud };
};

// ── UI state ──────────────────────────────────────────────────────────────────
const state = {
  doorType:   'MESH',   // 'MESH' | 'GLASS'
  doorOpen:   false,
  ledIdx:     0,        // index into LED_COLORS
  autoRotate: false,
  frameColor: 'white',  // 'white' | 'black'
};

const DOOR_OPEN_ANGLE = -2.09;  // 120° swing, clockwise from above
const DOOR_LERP = 0.10;         // per frame, matching the catalogue reference

// ANIMATED SWING, not a snap. The door used to jump to its final angle in one assignment,
// which reads as a door that was ALWAYS open rather than one that opens — the movement is the
// whole point of a hinge. Both groups already pivot correctly on the hinge edge (each sits at
// -DOOR_W/2 and offsets its panel by +DOOR_W/2), so nothing about the geometry needed fixing;
// only the drive.
let doorPos = 0;        // 0 closed .. 1 open, the animated value
let doorTarget = 0;

// immediate=true SETTLES INSTEAD OF ANIMATING, and it is not a convenience: the boot path
// applies ?open=1 before the first frame, and a capture taken right after load would otherwise
// photograph a door frozen a few degrees into its swing. A state applied at boot has no
// animation to show — there was no previous state to move from.
function applyDoorState(immediate = false) {
  doorTarget = state.doorOpen ? 1 : 0;
  if (immediate) doorPos = doorTarget;
  driveDoors();
}

function driveDoors() {
  const angle = DOOR_OPEN_ANGLE * doorPos;
  meshDoor.rotation.y  = state.doorType === 'MESH'  ? angle : 0;
  glassDoor.rotation.y = state.doorType === 'GLASS' ? angle : 0;
}

function stepDoorSwing() {
  if (doorPos === doorTarget) return;
  doorPos += (doorTarget - doorPos) * DOOR_LERP;
  if (Math.abs(doorTarget - doorPos) <= 0.001) doorPos = doorTarget;
  driveDoors();
}

// ── Dynamic HUD state line ────────────────────────────────────────────────────
const hudStateEl = document.getElementById('hud-state');

function updateHudState() {
  if (!hudStateEl) return;
  const dt  = state.doorType === 'MESH' ? 'MESH' : 'VIDRIO';
  const ds  = state.doorOpen   ? 'ABIERTA' : 'CERRADA';
  const lc  = LED_COLORS[state.ledIdx].name;
  const gb  = state.frameColor === 'white' ? 'BLANCO' : 'NEGRO';
  const rot = state.autoRotate ? '↻' : '—';
  hudStateEl.textContent = `${gb} · ${dt} · ${ds} · ${lc} · ${rot}`;
}

// ── window.__qaState — interaction gate reads this ────────────────────────────
// Returns a plain serialisable snapshot of all interactive state axes.
// REPORTS THE ANGLE, NOT ONLY THE FLAG. A state object saying doorOpen:true while the door is
// three degrees into its swing is the same class of lie as a HUD reading ON over unlit
// geometry: the label agrees with the intent and disagrees with the pixels. doorSettled tells a
// probe whether what it is about to capture is the finished pose.
window.__qaSettleDoors = () => { doorPos = doorTarget; driveDoors(); return doorPos; };

window.__qaState = () => ({
  doorType:   state.doorType,
  doorOpen:   state.doorOpen,
  doorPos:    Number(doorPos.toFixed(4)),
  doorAngleRad: Number((DOOR_OPEN_ANGLE * doorPos).toFixed(4)),
  doorSettled: doorPos === doorTarget,
  glassDoorAngleActual: Number(glassDoor.rotation.y.toFixed(4)),
  meshDoorAngleActual:  Number(meshDoor.rotation.y.toFixed(4)),
  ledIdx:     state.ledIdx,
  ledColor:   LED_COLORS[state.ledIdx].name,
  autoRotate: state.autoRotate,
  frameColor: state.frameColor,
});

// ── DOM button refs ───────────────────────────────────────────────────────────
const btnDoorType   = document.getElementById('btn-door-type');
const btnOpenDoor   = document.getElementById('btn-open-door');
const btnLedColor   = document.getElementById('btn-led-color');
const btnAutoRotate = document.getElementById('btn-autorotate');
const btnFrameColor = document.getElementById('btn-frame-color');

// ── Button handlers ───────────────────────────────────────────────────────────

// DOOR TYPE MESH-GLASS
btnDoorType.addEventListener('click', () => {
  state.doorType = state.doorType === 'MESH' ? 'GLASS' : 'MESH';
  state.doorOpen = false;
  meshDoor.visible  = state.doorType === 'MESH';
  glassDoor.visible = state.doorType === 'GLASS';
  applyDoorState();
  btnDoorType.textContent = `PUERTA: ${state.doorType === 'MESH' ? 'MESH' : 'VIDRIO'}`;
  btnOpenDoor.textContent = 'ABRIR PUERTA: NO';
  btnDoorType.classList.toggle('active', state.doorType === 'GLASS');
  btnOpenDoor.classList.remove('active');
  updateHudState();
});

// OPEN DOOR
btnOpenDoor.addEventListener('click', () => {
  state.doorOpen = !state.doorOpen;
  applyDoorState();
  btnOpenDoor.textContent = `ABRIR PUERTA: ${state.doorOpen ? 'SÍ' : 'NO'}`;
  btnOpenDoor.classList.toggle('active', state.doorOpen);
  updateHudState();
});

// LED COLOR BLUE-WHITE-GREEN
btnLedColor.addEventListener('click', () => {
  state.ledIdx = (state.ledIdx + 1) % LED_COLORS.length;
  const c = LED_COLORS[state.ledIdx];
  ledMat.emissive.set(c.hex);
  ledGlowMat.color.set(c.hex);
  btnLedColor.textContent = `LED COLOR: ${c.name}`;
  updateHudState();
});

// FRAME COLOR WHITE-BLACK
btnFrameColor.addEventListener('click', () => {
  state.frameColor = state.frameColor === 'white' ? 'black' : 'white';
  const v = FRAME_VARIANTS[state.frameColor];
  frameMat.color.set(v.frame);
  plinthMat.color.set(v.plinth);
  panelMat.color.set(v.panel);
  rearPanelMat.color.set(v.panel);
  btnFrameColor.textContent = `GABINETE: ${state.frameColor === 'white' ? 'BLANCO' : 'NEGRO'}`;
  btnFrameColor.classList.toggle('active', state.frameColor === 'black');
  updateHudState();
});

// AUTO-ROTATE
btnAutoRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  btnAutoRotate.textContent = `AUTO-ROTAR: ${state.autoRotate ? 'SÍ' : 'NO'}`;
  btnAutoRotate.classList.toggle('active', state.autoRotate);
  updateHudState();
});

// ── Raycast hotspot system ────────────────────────────────────────────────────
// Each hotspot is a Mesh with a named handler. Handlers delegate to button
// clicks so there is a single code path for each state axis.
const raycaster    = new THREE.Raycaster();
const pointer      = new THREE.Vector2();
const hotspotMeshes   = [];                // Mesh[] registered for intersection
const hotspotHandlers = new Map();         // uuid → { handler, label }
const hotspotTip      = document.getElementById('hotspot-tip');

function registerHotspot(obj, handler, label) {
  obj.traverse(child => {
    if (child.isMesh) {
      hotspotMeshes.push(child);
      hotspotHandlers.set(child.uuid, { handler, label });
    }
  });
}

// — Door panel (mesh variant) → toggle open / closed
const meshDoorPanel = root.getObjectByName('mesh_door_panel');
if (meshDoorPanel) {
  hotspotMeshes.push(meshDoorPanel);
  hotspotHandlers.set(meshDoorPanel.uuid, {
    handler: () => btnOpenDoor.click(),
    label:   'PUERTA · ABRIR / CERRAR',
  });
}

// — Lever (mesh door) → same open/close action
const leverMesh = root.getObjectByName('lever_handle_mesh');
if (leverMesh) registerHotspot(leverMesh, () => btnOpenDoor.click(), 'PALANCA · ABRIR / CERRAR');

// — Glass door panel → toggle open / closed
const glassDoorPanel = root.getObjectByName('glass_door_panel');
if (glassDoorPanel) {
  hotspotMeshes.push(glassDoorPanel);
  hotspotHandlers.set(glassDoorPanel.uuid, {
    handler: () => btnOpenDoor.click(),
    label:   'PUERTA VIDRIO · ABRIR / CERRAR',
  });
}

// — Lever (glass door) → same open/close action
const leverGlass = root.getObjectByName('lever_handle_glass');
if (leverGlass) registerHotspot(leverGlass, () => btnOpenDoor.click(), 'PALANCA · ABRIR / CERRAR');

// — LED bars → cycle LED color
['led_top', 'led_bottom', 'led_left', 'led_right'].forEach(name => {
  const ledMesh = root.getObjectByName(name);
  if (ledMesh) {
    hotspotMeshes.push(ledMesh);
    hotspotHandlers.set(ledMesh.uuid, {
      handler: () => btnLedColor.click(),
      label:   'LED · CAMBIAR COLOR',
    });
  }
});

// ── Pointer move — cursor + tooltip ──────────────────────────────────────────
canvas.addEventListener('pointermove', e => {
  const rect = canvas.getBoundingClientRect();
  pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Only test meshes that belong to a currently visible ancestor
  const visible = hotspotMeshes.filter(m => {
    let o = m; while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  });

  const hits = raycaster.intersectObjects(visible, false);
  if (hits.length > 0) {
    const { label } = hotspotHandlers.get(hits[0].object.uuid) || {};
    canvas.style.cursor = 'pointer';
    if (hotspotTip && label) {
      hotspotTip.textContent = label;
      hotspotTip.style.display = 'block';
      hotspotTip.style.left = `${e.clientX + 14}px`;
      hotspotTip.style.top  = `${e.clientY -  8}px`;
    }
  } else {
    canvas.style.cursor = 'default';
    if (hotspotTip) hotspotTip.style.display = 'none';
  }
});

canvas.addEventListener('pointerleave', () => {
  canvas.style.cursor = 'default';
  if (hotspotTip) hotspotTip.style.display = 'none';
});

// ── Click — fire hotspot handler ──────────────────────────────────────────────
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const visible = hotspotMeshes.filter(m => {
    let o = m; while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  });

  const hits = raycaster.intersectObjects(visible, false);
  if (hits.length > 0) {
    const entry = hotspotHandlers.get(hits[0].object.uuid);
    if (entry?.handler) entry.handler();
  }
});

// ── URL state params (load-time, for headless multi-shot capture) ─────────────
(function applyURLParams() {
  const p = new URLSearchParams(window.location.search);

  const door = p.get('door');
  if (door === 'glass' && state.doorType !== 'GLASS') {
    state.doorType = 'GLASS';
    meshDoor.visible  = false;
    glassDoor.visible = true;
    btnDoorType.textContent = 'PUERTA: VIDRIO';
    btnDoorType.classList.add('active');
  }

  const open = p.get('open');
  if (open === '1' && !state.doorOpen) {
    state.doorOpen = true;
    applyDoorState(true);      // settle: there is no previous state to swing from
    btnOpenDoor.textContent = 'ABRIR PUERTA: SÍ';
    btnOpenDoor.classList.add('active');
  }

  const ledMap = { blue: 0, white: 1, green: 2 };
  const led = p.get('led');
  if (led && ledMap[led] !== undefined && ledMap[led] !== state.ledIdx) {
    state.ledIdx = ledMap[led];
    const c = LED_COLORS[state.ledIdx];
    ledMat.emissive.set(c.hex);
    ledGlowMat.color.set(c.hex);
    btnLedColor.textContent = `LED COLOR: ${c.name}`;
  }

  updateHudState();   // sync HUD to whatever URL params set
})();

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  stepDoorSwing();
  controls.update();
  renderer.render(scene, camera);
}

document.documentElement.setAttribute('data-app-ready', 'true');
animate();
