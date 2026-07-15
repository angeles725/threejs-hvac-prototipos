import { APP_CONFIG } from './src/config.mjs';
import { validateConfig } from './src/validation.mjs';
import { createCameraController } from './src/controllers/camera.js';
import { createLayerController } from './src/controllers/layers.js';
import { resolvePickedSelectionFromIntersections } from './src/controllers/picking.js';
import { parseQueryState, serializeQueryState } from './src/controllers/query-state.js';
import { runShaderWarmup } from './src/controllers/warmup.js';
import { createArchitectureStructure } from './src/scene/architecture.js';
import { createMaterialRegistry } from './src/scene/materials.js';
import { createSceneRuntime } from './src/scene/runtime.js';
import { deriveHudModel } from './src/hud.mjs';

/** The deterministic clock: `tick` is the unit both the animation and every capture URL speak. */
const TICKS_PER_SECOND = 6;

function showFatal(error) {
  const safeError = error instanceof Error ? error : new Error(String(error));
  globalThis.showFatalApplicationError?.(safeError);
}

function updatePressedState(selector, activeValue, attribute) {
  document.querySelectorAll(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[attribute] === activeValue));
  });
}

function writeQueryState(state) {
  const params = new URLSearchParams(serializeQueryState(state));
  // The live application runs its own clock. Only a URL that PINNED a tick keeps one, so a reload
  // of a hand-driven session never freezes the packets on a frame the user never asked for.
  if (!state.tickExplicit) params.delete('tick');
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

async function startApplication() {
  const validation = validateConfig(APP_CONFIG);
  if (!validation.valid) throw new Error(`Configuración inválida: ${validation.errors.join(' ')}`);

  const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);

  const viewer = document.querySelector('#viewer');
  const materialRegistry = createMaterialRegistry(THREE);
  const runtime = createSceneRuntime({
    THREE,
    RoomEnvironment,
    container: viewer,
    materials: materialRegistry,
  });
  const architectureAsset = createArchitectureStructure({
    THREE,
    groups: runtime.groups,
    materialRegistry,
  });
  const orbitControls = new OrbitControls(runtime.camera, runtime.renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.06;
  orbitControls.minDistance = 8;
  orbitControls.maxDistance = 150;
  orbitControls.maxPolarAngle = Math.PI * 0.49;
  orbitControls.target.set(0, 0, 0);

  const cameraController = createCameraController({ camera: runtime.camera, orbitControls });
  const layerController = createLayerController({
    groups: runtime.groups,
    renderer: runtime.renderer,
    materials: materialRegistry,
    clippingPlane: runtime.clippingPlane,
  });
  const queryState = parseQueryState(location.search);
  const createEvidenceViewContext = () => ({
    camera: runtime.camera,
    viewport: {
      width: runtime.renderer.domElement.clientWidth,
      height: runtime.renderer.domElement.clientHeight,
    },
  });
  layerController.hydrate(queryState);
  cameraController.applyPreset(queryState.camera);
  runtime.setLookdevCamera(queryState.camera);
  architectureAsset.setLabelPolicy({
    visualMode: queryState.visualMode,
    labels: queryState.labels,
    labelsExplicit: queryState.labelsExplicit,
  });
  // The interior ceilings are the underside of the roof: they follow the Techo layer (UX item 7).
  architectureAsset.setRoofLayerVisible(queryState.roof);
  architectureAsset.setEvidenceCamera(queryState.camera, createEvidenceViewContext());
  architectureAsset.setSurfaceFrame({
    posterFrame: queryState.posterFrame,
    displayFrame: queryState.displayFrame,
  });
  // Both halves of the channel set: the emissive fixtures the asset owns, and the interior
  // PointLights the runtime owns. Attempt 1 switched only the first, so the corridor and sala
  // captures came back byte-for-byte identical between light_state=on and light_state=off.
  architectureAsset.setLightState(queryState.lightState);
  runtime.setLightState(queryState.lightState);
  runtime.setVisualMode(queryState.visualMode);
  architectureAsset.setInteractionState({
    state: queryState.sceneState,
    tick: queryState.tick,
    selection: queryState.selection,
  });
  cameraController.setNavigationMode(queryState.navigation);
  // The sun shadow is static: bake it once the scene exists, and again whenever a state change
  // moves or hides a caster.
  runtime.bakeShadows();

  const mutableQuery = { ...queryState };
  const status = document.querySelector('#app-status');
  const navigationButton = document.querySelector('#navigation-toggle');
  const navigationHelp = document.querySelector('#navigation-help');

  document.querySelectorAll('[data-camera]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!cameraController.applyPreset(button.dataset.camera)) return;
      runtime.setLookdevCamera(button.dataset.camera);
      architectureAsset.setEvidenceCamera(button.dataset.camera, createEvidenceViewContext());
      mutableQuery.camera = button.dataset.camera;
      mutableQuery.navigation = 'orbit';
      navigationButton.setAttribute('aria-pressed', 'false');
      navigationButton.textContent = 'Primera persona';
      navigationHelp.textContent = 'Orbitar: arrastra. Desplazar: botón derecho. Zoom: rueda.';
      writeQueryState(mutableQuery);
    });
  });

  // The visual mode and the scene state are one axis: switching the mode drops any active fault,
  // so the two can never disagree in the URL the button writes back.
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      applyInteraction({
        state: button.dataset.mode === 'engineering' ? 'engineering' : 'architecture',
      });
    });
  });

  document.querySelectorAll('[data-light-state]').forEach((button) => {
    button.addEventListener('click', () => {
      const lightState = button.dataset.lightState;
      architectureAsset.setLightState(lightState);
      runtime.setLightState(lightState);
      mutableQuery.lightState = lightState;
      updatePressedState('[data-light-state]', lightState, 'lightState');
      writeQueryState(mutableQuery);
    });
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      layerController.setView(view);
      mutableQuery.view = view;
      updatePressedState('[data-view]', view, 'view');
      writeQueryState(mutableQuery);
    });
  });

  document.querySelectorAll('[data-layer]').forEach((input) => {
    input.checked = Boolean(queryState[input.dataset.layer]);
    input.addEventListener('change', () => {
      layerController.setLayer(input.dataset.layer, input.checked);
      mutableQuery[input.dataset.layer] = input.checked;
      if (input.dataset.layer === 'labels') {
        mutableQuery.labelsExplicit = true;
        architectureAsset.setLabelPolicy({ labels: input.checked, labelsExplicit: true });
      }
      // The interior ceilings ride the Techo toggle, or hiding the roof reveals a "second roof".
      if (input.dataset.layer === 'roof') architectureAsset.setRoofLayerVisible(input.checked);
      if (input.dataset.layer === 'roof' || input.dataset.layer === 'walls') runtime.bakeShadows();
      writeQueryState(mutableQuery);
    });
  });

  const cutaway = document.querySelector('#cutaway-toggle');
  cutaway.checked = queryState.cutaway;
  cutaway.addEventListener('change', () => {
    layerController.setCutaway(cutaway.checked);
    mutableQuery.cutaway = cutaway.checked;
    // No shadow re-bake here: `clipShadows` is never enabled, so the clipping planes do not touch
    // the shadow depth pass — the old re-bake was pure per-toggle cost. The remaining first-toggle
    // shader compile is paid at boot by `runShaderWarmup`.
    writeQueryState(mutableQuery);
  });

  document.querySelector('#camera-reset').addEventListener('click', () => {
    cameraController.applyPreset('isometric');
    runtime.setLookdevCamera('isometric');
    architectureAsset.setEvidenceCamera('isometric', createEvidenceViewContext());
    mutableQuery.camera = 'isometric';
    mutableQuery.navigation = 'orbit';
    navigationButton.setAttribute('aria-pressed', 'false');
    navigationButton.textContent = 'Primera persona';
    writeQueryState(mutableQuery);
  });

  navigationButton.addEventListener('click', () => {
    const enabled = cameraController.getState().navigation !== 'first-person';
    cameraController.setNavigationMode(enabled ? 'first-person' : 'orbit');
    mutableQuery.navigation = enabled ? 'first-person' : 'orbit';
    navigationButton.setAttribute('aria-pressed', String(enabled));
    navigationButton.textContent = enabled ? 'Volver a órbita' : 'Primera persona';
    navigationHelp.textContent = enabled
      ? 'Primera persona acotada: usa W, A, S, D o las flechas.'
      : 'Orbitar: arrastra. Desplazar: botón derecho. Zoom: rueda.';
    writeQueryState(mutableQuery);
  });

  document.querySelector('#fullscreen-toggle').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      status.textContent = 'El navegador bloqueó el modo de pantalla completa.';
    }
  });

  // -------------------------------------------------------------------------
  // INTERACTION-UI: scene state, selection and the deterministic tick.
  // -------------------------------------------------------------------------
  const selectionDetail = document.querySelector('#selection-detail');
  const selectionPathList = document.querySelector('#selection-path');
  const alarmList = document.querySelector('#alarm-list');

  function describeStatus(status) {
    if (status === 'alarm') return 'alarma';
    if (status === 'unreachable') return 'sin comunicación';
    return 'normal';
  }

  function renderInteractionPanels() {
    const model = architectureAsset.getInteractionModel();
    // One derivation feeds the status line, the severity dot and the alarm list: the three surfaces
    // cannot disagree about whether the system is in alarm.
    const hud = deriveHudModel(model);
    status.textContent = hud.statusText;
    document.documentElement.dataset.systemStatus = hud.severity;

    alarmList.replaceChildren(...hud.alarmItems.map((item) => {
      const element = document.createElement('li');
      element.textContent = item.text;
      element.dataset.severity = item.severity;
      return element;
    }));

    if (model.selection === 'none') {
      selectionDetail.textContent = 'Ningún dispositivo seleccionado.';
      selectionPathList.replaceChildren();
      return;
    }
    const telemetry = model.telemetry[model.selection];
    selectionDetail.textContent = `${model.selection} · ${describeStatus(model.deviceStatus[model.selection])}`
      + (telemetry ? ` · ${telemetry.temperature.toFixed(1)} °C · consigna ${telemetry.setpoint} °C` : '');
    selectionPathList.replaceChildren(...model.selectionPath.nodeIds.map((nodeId) => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = nodeId;
      const state = document.createElement('span');
      state.textContent = describeStatus(model.deviceStatus[nodeId]);
      item.append(name, state);
      return item;
    }));
  }

  function applyInteraction({ state, selection, tick } = {}) {
    architectureAsset.setInteractionState({ state, selection, tick });
    const model = architectureAsset.getInteractionModel();
    if (state !== undefined) {
      mutableQuery.sceneState = model.state;
      mutableQuery.visualMode = model.visualMode;
      layerController.setVisualMode(model.visualMode);
      runtime.setVisualMode(model.visualMode);
      architectureAsset.setLabelPolicy({ visualMode: model.visualMode });
      updatePressedState('[data-mode]', model.visualMode, 'mode');
      updatePressedState('[data-scene-state]', model.state, 'sceneState');
      runtime.bakeShadows();
    }
    if (selection !== undefined) mutableQuery.selection = model.selection;
    if (tick !== undefined) mutableQuery.tick = model.tick;
    renderInteractionPanels();
    if (state !== undefined || selection !== undefined) writeQueryState(mutableQuery);
  }

  document.querySelectorAll('[data-scene-state]').forEach((button) => {
    button.addEventListener('click', () => applyInteraction({ state: button.dataset.sceneState }));
  });
  document.querySelector('#fault-restore').addEventListener('click', () => {
    applyInteraction({ state: 'engineering', selection: mutableQuery.selection });
  });

  const speedInput = document.querySelector('#animation-speed');
  const speedOutput = document.querySelector('#animation-speed-value');
  let animationSpeed = Number(speedInput.value);
  speedInput.addEventListener('input', () => {
    animationSpeed = Math.min(2, Math.max(0.25, Number(speedInput.value) || 1));
    speedOutput.textContent = `${animationSpeed}×`;
  });

  // Raycast selection. Only the HVAC/IoT endpoints answer, and the answer is the URL contract.
  // A drag is an orbit, never a selection: the pick only fires when the pointer barely moved.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pressOrigin = { x: 0, y: 0 };
  const CLICK_SLOP_PX = 5;
  runtime.renderer.domElement.addEventListener('pointerdown', (event) => {
    pressOrigin.x = event.clientX;
    pressOrigin.y = event.clientY;
  });
  runtime.renderer.domElement.addEventListener('pointerup', (event) => {
    if (Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > CLICK_SLOP_PX) return;
    const bounds = runtime.renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, runtime.camera);
    const hits = raycaster.intersectObjects(runtime.groups.hvac.children, true);
    const picked = resolvePickedSelectionFromIntersections(hits);
    applyInteraction({ selection: picked ?? 'none' });
  });

  updatePressedState('[data-mode]', queryState.visualMode, 'mode');
  updatePressedState('[data-view]', queryState.view, 'view');
  updatePressedState('[data-light-state]', queryState.lightState, 'lightState');
  updatePressedState('[data-scene-state]', queryState.sceneState, 'sceneState');
  navigationButton.setAttribute('aria-pressed', String(queryState.navigation === 'first-person'));
  renderInteractionPanels();

  let previousTime = performance.now();
  let animationFrame = 0;
  // A pinned `tick` freezes the scene on that exact frame: a capture is never a race with a clock.
  const frozenTick = queryState.tickExplicit;
  let elapsedTicks = queryState.tick;
  let appliedTick = queryState.tick;
  function animate(now) {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;
    cameraController.update(deltaSeconds);
    // The temperature chips are exterior-only: the LIVE camera decides, so a free orbit crossing
    // the envelope hides/shows them exactly like the presets do.
    architectureAsset.setChipCameraPosition(runtime.camera.position);
    if (!frozenTick) {
      elapsedTicks += Math.min(0.25, Math.max(0, deltaSeconds)) * TICKS_PER_SECOND * animationSpeed;
      const tick = Math.floor(elapsedTicks);
      if (tick !== appliedTick) {
        appliedTick = tick;
        architectureAsset.setInteractionState({ tick });
      }
    }
    runtime.render();
    animationFrame = requestAnimationFrame(animate);
  }
  animationFrame = requestAnimationFrame(animate);

  function dispose() {
    cancelAnimationFrame(animationFrame);
    cameraController.dispose();
    architectureAsset.dispose();
    runtime.dispose();
    delete globalThis.__cinemexApp;
  }

  globalThis.__cinemexApp = Object.freeze({
    config: APP_CONFIG,
    runtime,
    cameraController,
    layerController,
    materialRegistry,
    architectureAsset,
    dispose,
  });
  window.addEventListener('pagehide', dispose, { once: true });
  // Pay every first-use shader compile (cutaway clipping variants, selection/status overlays)
  // BEFORE readiness: captures wait on `data-app-ready`, so warming later would race them, and
  // warming restores the byte-identical boot state.
  runShaderWarmup({
    renderer: runtime.renderer,
    scene: runtime.scene,
    camera: runtime.camera,
    materialRegistry,
    clippingPlane: runtime.clippingPlane,
    bootCutaway: queryState.cutaway,
  });
  document.documentElement.dataset.appReady = 'true';
  // The readiness flag is a DOM dataset, never a second status writer: the boot path used to
  // overwrite the derived status line here with a hard-coded healthy copy, so a fault URL loaded
  // with an alarm list AND a HUD that denied it. Readiness is the dot's `data-app-ready`; the
  // status copy stays derived from the alarms.
  renderInteractionPanels();

  // QA instrumentation hook. `renderer.info.render` is three.js's own exact per-frame accounting —
  // the ground truth for draw calls and triangles. The external probe used to infer them by wrapping
  // WebGL draw entry points, which counted every InstancedMesh as ONE instance: it reported 59 draws
  // / 708 tris (about 12 triangles per draw — the size of a single box) for the whole multiplex, and
  // returned the same figure for two completely different cameras. A performance pass optimizing
  // against that number would be optimizing against a fiction.
  window.__qaRenderInfo = () => ({
    calls: runtime.renderer.info.render.calls,
    triangles: runtime.renderer.info.render.triangles,
    lines: runtime.renderer.info.render.lines,
    points: runtime.renderer.info.render.points,
    geometries: runtime.renderer.info.memory.geometries,
    textures: runtime.renderer.info.memory.textures,
    programs: runtime.renderer.info.programs?.length ?? null,
  });
}

startApplication().catch(showFatal);
