import {
  LIGHTING_FOG,
  LIGHTING_HOUSE_FIXTURES,
  LIGHTING_RIG,
  LIGHTING_TONE_MAPPING,
  resolveAmbientIntensity,
  resolveFixtureIntensity,
} from './lighting.js';

const SEMANTIC_GROUP_NAMES = Object.freeze([
  'architecture', 'roof', 'walls', 'hvac',
  'rs485', 'lorawan', 'internet', 'labels',
]);

export function resolvePixelRatio(devicePixelRatio, cap = 1.5) {
  const value = Number(devicePixelRatio);
  return Number.isFinite(value) && value > 0 ? Math.min(value, cap) : 1;
}

/** Creates layer roots only. Asset builders populate these groups in later SDD tasks. */
export function createSemanticGroups(THREE) {
  if (!THREE?.Group) throw new TypeError('Three.Group is required.');
  return Object.fromEntries(SEMANTIC_GROUP_NAMES.map((name) => {
    const group = new THREE.Group();
    group.name = `layer-${name}`;
    return [name, group];
  }));
}

export function createSceneRuntime({ THREE, RoomEnvironment, container, materials, windowObject = globalThis.window } = {}) {
  if (!THREE?.WebGLRenderer || !container) throw new TypeError('Three.js and a render container are required.');

  const scene = new THREE.Scene();
  scene.name = 'cinemex-hvac-scene';
  scene.background = new THREE.Color(LIGHTING_FOG.color);
  scene.fog = new THREE.Fog(LIGHTING_FOG.color, LIGHTING_FOG.near, LIGHTING_FOG.far);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  camera.position.set(66, 46, 68);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  // Boot cut 4 (2026-07-18): the live renderer caps DPR at 1.25 (was the 1.5 default) — with
  // antialias on, the sharpness delta is marginal and the fragment load drops ~31% on 2x displays.
  // `resolvePixelRatio`'s own default cap stays 1.5 (it is the asserted module contract).
  renderer.setPixelRatio(resolvePixelRatio(windowObject?.devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING_TONE_MAPPING.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Static sun: the shadow map is baked once and re-baked only on state changes that move casters.
  renderer.shadowMap.autoUpdate = false;
  container.append(renderer.domElement);

  const groups = createSemanticGroups(THREE);
  scene.add(...Object.values(groups));

  // Neutral PMREM look-dev response: material calibration only, not final scene lighting.
  let pmremGenerator = null;
  let roomEnvironment = null;
  let environmentTexture = null;
  if (RoomEnvironment && THREE.PMREMGenerator) {
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    roomEnvironment = new RoomEnvironment();
    environmentTexture = pmremGenerator.fromScene(roomEnvironment, LIGHTING_RIG.environmentBlur).texture;
    environmentTexture.name = 'cinemex-neutral-material-environment';
    scene.environment = environmentTexture;
  }

  // The house rig: key/fill/rim/ambient at the ratios the DesignSpec and the HANDBOOK declare.
  const sun = new THREE.DirectionalLight(LIGHTING_RIG.key.color, LIGHTING_RIG.key.intensity);
  sun.name = 'architectural-key';
  sun.position.set(...LIGHTING_RIG.key.position);
  sun.castShadow = LIGHTING_RIG.key.castShadow;
  const { mapSize, radius, near, far, bias, normalBias } = LIGHTING_RIG.key.shadow;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.camera.left = -radius;
  sun.shadow.camera.right = radius;
  sun.shadow.camera.top = radius;
  sun.shadow.camera.bottom = -radius;
  sun.shadow.camera.near = near;
  sun.shadow.camera.far = far;
  sun.shadow.bias = bias;
  sun.shadow.normalBias = normalBias;
  sun.shadow.camera.updateProjectionMatrix();

  const fill = new THREE.DirectionalLight(LIGHTING_RIG.fill.color, LIGHTING_RIG.fill.intensity);
  fill.name = 'house-fill';
  fill.position.set(...LIGHTING_RIG.fill.position);
  const rim = new THREE.DirectionalLight(LIGHTING_RIG.rim.color, LIGHTING_RIG.rim.intensity);
  rim.name = 'house-rim';
  rim.position.set(...LIGHTING_RIG.rim.position);
  const ambient = new THREE.AmbientLight(LIGHTING_RIG.ambient.color, resolveAmbientIntensity());
  ambient.name = 'house-ambient-bounce';
  scene.add(sun, fill, rim, ambient);

  /**
   * The HOUSE rig. The exterior key/fill/rim above no longer reach the lobby, the corridor or the
   * auditoriums — every interior surface reflects only `zoneDim` of them. The value inside the
   * building is produced here instead, by real distance-bounded fixtures that pool and fall off, by
   * the zone fill the materials carry, and by the emissive channels the architecture asset owns.
   *
   * `LIGHTING_HOUSE_FIXTURES` also carries the three forecourt lights: the marquee pool on the
   * apron, the graded key across the white elevation and the varied specular on the red canopy.
   * No fixture casts a shadow, per the DesignSpec runtime target.
   */
  const interiorFixtures = [];
  // Interior prune (2026-07-18, maintainer-ordered): PointLights ignore occluders, so a fixture
  // is prunable only when a per-light capture diff proves it moves no reachable pixel. Measured
  // over the 17-view envelope: lobby, corridor and forecourt fixtures all graze shipped pixels
  // (glazing, corridor-slot walls, forecourt) and STAY; of the eight auditoriumAisle fixtures
  // only the FIRST (sala 1, nearest the front height-step band) contributes — positions 2-8 are
  // byte-identical off and are not instantiated. `LIGHTING_HOUSE_FIXTURES` keeps the full design
  // table; this is a runtime instantiation cut only (7 fewer live PointLights per shader).
  const PRUNED_FIXTURE_POSITIONS = { auditoriumAisle: (index) => index > 0 };
  if (THREE.PointLight) {
    for (const [id, fixture] of Object.entries(LIGHTING_HOUSE_FIXTURES)) {
      const intensity = resolveFixtureIntensity(fixture);
      fixture.positions.forEach((position, index) => {
        if (PRUNED_FIXTURE_POSITIONS[id]?.(index)) return;
        const light = new THREE.PointLight(
          fixture.color,
          intensity,
          fixture.distance,
          fixture.decay,
        );
        light.name = `interior-fixture-${id}-${index + 1}`;
        light.position.set(...position);
        light.castShadow = false;
        light.userData = { fixtureId: id, zone: fixture.zone };
        scene.add(light);
        interiorFixtures.push(light);
      });
    }
  }

  /** Bake the static sun shadow. Called once after the build and on any caster-visibility change. */
  function bakeShadows() {
    renderer.shadowMap.needsUpdate = true;
  }

  let disposed = false;

  function resize() {
    if (disposed) return;
    const { width = 1, height = 1 } = container.getBoundingClientRect();
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
  }

  const ResizeObserverClass = windowObject?.ResizeObserver;
  const resizeObserver = ResizeObserverClass ? new ResizeObserverClass(resize) : null;
  const requestFrame = windowObject?.requestAnimationFrame?.bind(windowObject);
  const cancelFrame = windowObject?.cancelAnimationFrame?.bind(windowObject);
  const scheduleTimer = windowObject?.setTimeout?.bind(windowObject);
  const cancelTimer = windowObject?.clearTimeout?.bind(windowObject);
  let resizeFrame = 0;
  const resizeTimers = new Set();

  function clearResizeTimers() {
    for (const timer of resizeTimers) cancelTimer?.(timer);
    resizeTimers.clear();
  }

  function scheduleWindowResize() {
    // Apply once immediately; software renderers can run below 10 FPS, making a RAF-only
    // resize settle too late for the CSS viewport that already changed.
    resize();
    clearResizeTimers();
    // CSS grid height can settle after the first measurement. Two short wall-clock samples
    // keep the backing store coherent even when SwiftShader starves ResizeObserver/RAF.
    for (const delay of [70, 140, 260]) {
      let timer = 0;
      timer = scheduleTimer?.(() => {
        resizeTimers.delete(timer);
        resize();
      }, delay) ?? 0;
      if (timer) resizeTimers.add(timer);
    }
    if (!requestFrame) {
      return;
    }
    if (resizeFrame) cancelFrame?.(resizeFrame);
    // Viewport resize events may precede the final CSS grid height. Measure after two frames.
    resizeFrame = requestFrame(() => {
      resizeFrame = requestFrame(() => {
        resizeFrame = 0;
        resize();
      });
    });
  }

  resizeObserver?.observe(container);
  windowObject?.addEventListener?.('resize', scheduleWindowResize);
  resize();

  function render() {
    if (!disposed) renderer.render(scene, camera);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (resizeFrame) cancelFrame?.(resizeFrame);
    clearResizeTimers();
    resizeObserver?.disconnect();
    windowObject?.removeEventListener?.('resize', scheduleWindowResize);
    materials?.dispose?.();
    environmentTexture?.dispose?.();
    roomEnvironment?.dispose?.();
    pmremGenerator?.dispose?.();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    scene, camera, renderer, groups, interiorFixtures,
    bakeShadows, render, resize, dispose,
  };
}
