// Dev-only tuning UI — a hideable lil-gui panel to tune the camera / light rig / exposure
// live and EXPORT the result as JSON that pastes straight back into main.js PRESETS and the
// runtime light rig.
//
// LOAD PATH (important): this module and lil-gui are imported DYNAMICALLY and ONLY when the page
// is opened with ?dev=1 (see main.js). The gate/capture path never passes ?dev, so it never loads
// lil-gui and the production render is byte-identical to before. Ship disabled.
//
// Offline: lil-gui is vendored at vendor/lil-gui/ and resolved via the local importmap ("lil-gui").
// Nothing here reaches the network.

import GUI from 'lil-gui';

const hex = (c) => '#' + c.getHexString();

/**
 * @param {object} ctx
 * @param {THREE.PerspectiveCamera} ctx.camera
 * @param {OrbitControls} ctx.controls
 * @param {THREE.WebGLRenderer} ctx.renderer
 * @param {THREE.Scene} ctx.scene
 * @param {{hemi,key,fill,rim}} ctx.lights
 * @param {THREE.DirectionalLight} ctx.inspectionFill
 * @param {Record<string, object>} ctx.presets           PRESETS map from main.js
 * @param {(key:string)=>void} ctx.applyViewPreset
 * @param {typeof import('three')} ctx.THREE
 */
export function initDevUI(ctx) {
  const { camera, controls, renderer, scene, lights, inspectionFill, presets, applyViewPreset } = ctx;

  const gui = new GUI({ title: 'DEV — tuning (?dev=1)' });
  gui.domElement.style.zIndex = '9999';

  // --- View presets ----------------------------------------------------------
  const presetKeys = Object.keys(presets);
  const viewProxy = { preset: presetKeys[0] };
  gui.add(viewProxy, 'preset', presetKeys).name('jump to preset').onChange((k) => {
    applyViewPreset(k);
    refresh();
  });

  // --- Camera ----------------------------------------------------------------
  const fCam = gui.addFolder('Camera');
  fCam.add(camera, 'fov', 20, 80, 1).name('fov').onChange(() => camera.updateProjectionMatrix());

  const camPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const camTgt = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
  const bindVec = (folder, proxy, apply, range = 60) => {
    for (const ax of ['x', 'y', 'z']) {
      folder.add(proxy, ax, -range, range, 0.1).name(ax).onChange(apply).listen();
    }
  };
  const fPos = fCam.addFolder('position');
  bindVec(fPos, camPos, () => { camera.position.set(camPos.x, camPos.y, camPos.z); });
  const fTgt = fCam.addFolder('target');
  bindVec(fTgt, camTgt, () => { controls.target.set(camTgt.x, camTgt.y, camTgt.z); controls.update(); });

  // --- Renderer / atmosphere -------------------------------------------------
  const fRen = gui.addFolder('Renderer');
  fRen.add(renderer, 'toneMappingExposure', 0.2, 2.0, 0.01).name('exposure');
  if (scene.fog) {
    fRen.add(scene.fog, 'near', 0, 300, 1).name('fog near');
    fRen.add(scene.fog, 'far', 0, 400, 1).name('fog far');
  }

  // --- Light rig -------------------------------------------------------------
  const fLights = gui.addFolder('Lights');
  // Hemisphere: intensity only (position is irrelevant for a hemi light)
  fLights.add(lights.hemi, 'intensity', 0, 3, 0.01).name('hemi');
  // Directional lights: intensity + position + color
  for (const name of ['key', 'fill', 'rim']) {
    const L = lights[name];
    const f = fLights.addFolder(name);
    f.add(L, 'intensity', 0, 3, 0.01).name('intensity');
    const col = { hex: hex(L.color) };
    f.addColor(col, 'hex').name('color').onChange((v) => L.color.set(v));
    const p = { x: L.position.x, y: L.position.y, z: L.position.z };
    bindVec(f.addFolder('position'), p, () => L.position.set(p.x, p.y, p.z), 40);
  }

  // --- Inspection fill (per-preset scoped light) -----------------------------
  const fInsp = gui.addFolder('Inspection fill');
  fInsp.add(inspectionFill, 'visible').name('visible');
  fInsp.add(inspectionFill, 'intensity', 0, 3, 0.01).name('intensity');
  const inspCol = { hex: hex(inspectionFill.color) };
  fInsp.addColor(inspCol, 'hex').name('color').onChange((v) => inspectionFill.color.set(v));
  const inspPos = { x: inspectionFill.position.x, y: inspectionFill.position.y, z: inspectionFill.position.z };
  bindVec(fInsp.addFolder('position'), inspPos, () => inspectionFill.position.set(inspPos.x, inspPos.y, inspPos.z), 40);

  // --- Export ----------------------------------------------------------------
  const snapshot = () => ({
    camera: {
      fov: round(camera.fov, 1),
      position: vec(camera.position),
      target: vec(controls.target),
    },
    exposure: round(renderer.toneMappingExposure, 3),
    fog: scene.fog ? { near: round(scene.fog.near, 1), far: round(scene.fog.far, 1) } : null,
    lights: {
      hemi: { intensity: round(lights.hemi.intensity, 3) },
      key:  dirLight(lights.key),
      fill: dirLight(lights.fill),
      rim:  dirLight(lights.rim),
    },
    inspectionFill: {
      visible: inspectionFill.visible,
      intensity: round(inspectionFill.intensity, 3),
      position: vec(inspectionFill.position),
      color: hex(inspectionFill.color),
    },
  });

  const actions = {
    'log JSON': () => console.log('[dev-ui] snapshot\n' + JSON.stringify(snapshot(), null, 2)),
    'download JSON': () => download('nave-3sistemas-tuning.json', JSON.stringify(snapshot(), null, 2)),
    'copy to clipboard': async () => {
      const txt = JSON.stringify(snapshot(), null, 2);
      try { await navigator.clipboard.writeText(txt); console.log('[dev-ui] copied to clipboard'); }
      catch { console.log('[dev-ui] clipboard blocked — JSON logged instead\n' + txt); }
    },
  };
  const fExp = gui.addFolder('Export');
  for (const k of Object.keys(actions)) fExp.add(actions, k);

  // Keep displays honest while OrbitControls moves the camera under the user's mouse.
  function refresh() {
    camPos.x = camera.position.x; camPos.y = camera.position.y; camPos.z = camera.position.z;
    camTgt.x = controls.target.x; camTgt.y = controls.target.y; camTgt.z = controls.target.z;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }
  const refreshTimer = setInterval(refresh, 250);

  console.log('[dev-ui] active — press the panel or open with ?dev=1. Export folder writes JSON you paste into PRESETS.');
  return { gui, snapshot, destroy: () => { clearInterval(refreshTimer); gui.destroy(); } };
}

// --- helpers -----------------------------------------------------------------
const round = (n, d) => Number(n.toFixed(d));
const vec = (v) => [round(v.x, 2), round(v.y, 2), round(v.z, 2)];
const dirLight = (L) => ({ intensity: round(L.intensity, 3), position: vec(L.position), color: '#' + L.color.getHexString() });

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
