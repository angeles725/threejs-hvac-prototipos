const preset = (position, target, fov = null) => Object.freeze({
  position: Object.freeze(position),
  target: Object.freeze(target),
  fov,
});

/**
 * Limpieza fase 2 (2026-07-18): the catalogue is pruned to what production actually reaches —
 * the single fixed `network` view the product boots on. The old evidence/look-dev presets
 * (facade, lobby, kitchen, technical, ug67, top, …) and the whole QA_CAMERA_PRESETS family
 * existed only for retired QA/evidence capacity and left with it. `ISOMETRIC_PRESET` (the
 * construction-time chip camera) and the embed unit framing below remain live product paths.
 */
export const CAMERA_PRESETS = Object.freeze({
  // User tweak (2026-07-15): pulled ~40% closer to the target ([70,48,72] → here) so the full
  // network reads bigger in frame.
  network: preset([45.6, 28.8, 43.2], [9, 0, 0]),
});

// Lowered onto the house hero band (azimuth 40-45 deg, elevation 20-28 deg). At y=52 the default
// framing sat at 28.8 deg of elevation, just above the band, and read as a plan rather than a hero.
export const ISOMETRIC_PRESET = preset([66, 46, 68], [0, 0, 0]);

/**
 * Correction item E — the EMBED close view over one packaged rooftop unit. A 3/4 stand (equal
 * plan offsets, elevated) at ~11.3 m: inside the orbit min/max band (8..150), close enough that
 * the RTU fills the iframe, angled enough to read cabinet, hood and curb as a machine.
 */
export const EMBED_UNIT_VIEW = Object.freeze({
  offset: Object.freeze([7, 5.5, 7]),
  fov: 50,
});

/** Frame one packaged unit from the plan (deep-linked `?embed=1&selection=TC300-XX`). Pure. */
export function resolveUnitClosePreset(unit) {
  if (!Array.isArray(unit?.position) || !Number.isFinite(unit?.cabinetCentreY)) {
    throw new TypeError('An embed framing needs a packaged unit with position and cabinetCentreY.');
  }
  const target = [unit.position[0], unit.cabinetCentreY, unit.position[2]];
  return preset(
    target.map((value, axis) => value + EMBED_UNIT_VIEW.offset[axis]),
    target,
    EMBED_UNIT_VIEW.fov,
  );
}

/**
 * UX item 8 — smooth dolly. three.js OrbitControls NEVER damps its dolly: `enableDamping` applies
 * to rotate/pan only, and every wheel notch lands as an instant distance step. The controller
 * therefore owns the zoom: wheel input accumulates a TARGET distance (clamped to the controls'
 * own min/max), and `update()` approaches it exponentially along the camera->target axis.
 */
export const SMOOTH_DOLLY = Object.freeze({
  // OrbitControls' own per-notch scale (0.95^zoomSpeed) — kept so the zoom SPEED feels unchanged;
  // only the delivery becomes continuous.
  scalePerNotch: 0.95,
  notchDeltaPx: 100,
  // Exponential approach rate (1/s): ~63% of the remaining distance closes in 1/rate seconds.
  approachRate: 9,
  // Snap-to-rest distance: one centimetre is invisible at every preset scale and lets the glide
  // terminate instead of asymptoting forever.
  restThreshold: 0.01,
});

/** The distance the dolly should rest at after one wheel event, clamped to the controls' range. */
export function resolveDollyTarget(currentTarget, wheelDeltaY, { minDistance = 0.1, maxDistance = Infinity } = {}) {
  if (!Number.isFinite(currentTarget) || currentTarget <= 0) {
    throw new RangeError('A dolly target needs a positive current distance.');
  }
  const notches = (Number(wheelDeltaY) || 0) / SMOOTH_DOLLY.notchDeltaPx;
  const scaled = currentTarget * SMOOTH_DOLLY.scalePerNotch ** -notches;
  return Math.min(maxDistance, Math.max(minDistance, scaled));
}

/** One exponential step toward the target distance. Pure, so convergence is testable. */
export function stepDollyDistance(current, target, deltaSeconds) {
  const safeDelta = Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
  const blend = 1 - Math.exp(-SMOOTH_DOLLY.approachRate * safeDelta);
  const next = current + (target - current) * blend;
  return Math.abs(next - target) <= SMOOTH_DOLLY.restThreshold ? target : next;
}

function copyPoint(target, values) {
  target.set(values[0], values[1], values[2]);
}

/**
 * Orbit-only controller. Limpieza fase 2 (2026-07-18): the first-person navigation mode
 * (WASD movement, eye-height clamp, bounds) was retired — free orbit is the operator's only
 * movement, exactly what the shipped product exposes.
 */
export function createCameraController({ camera, orbitControls } = {}) {
  if (!camera || !orbitControls) throw new TypeError('camera and orbitControls are required.');

  let activePreset = 'isometric';

  // Smooth dolly (UX item 8): the controller owns the zoom so the wheel stops stepping.
  // `dollyTarget === null` means "at rest" — presets never fight a stale target.
  let dollyTarget = null;
  const currentDistance = () => Math.hypot(
    camera.position.x - orbitControls.target.x,
    camera.position.y - orbitControls.target.y,
    camera.position.z - orbitControls.target.z,
  );
  const onWheel = (event) => {
    if (orbitControls.enabled === false) return;
    event.preventDefault?.();
    dollyTarget = resolveDollyTarget(dollyTarget ?? currentDistance(), event.deltaY, orbitControls);
  };
  if (orbitControls.domElement?.addEventListener) {
    orbitControls.enableZoom = false;
    orbitControls.domElement.addEventListener('wheel', onWheel, { passive: false });
  }

  function applyDollyStep(deltaSeconds) {
    if (dollyTarget === null) return;
    const distance = currentDistance();
    if (distance <= 0) { dollyTarget = null; return; }
    const next = stepDollyDistance(distance, dollyTarget, deltaSeconds);
    const scale = next / distance;
    camera.position.x = orbitControls.target.x + (camera.position.x - orbitControls.target.x) * scale;
    camera.position.y = orbitControls.target.y + (camera.position.y - orbitControls.target.y) * scale;
    camera.position.z = orbitControls.target.z + (camera.position.z - orbitControls.target.z) * scale;
    if (next === dollyTarget) dollyTarget = null;
  }

  /** An exact framing (position/target/fov), named or ad hoc (the embed unit view uses this). */
  function applyFraming(framing, presetName = 'custom') {
    if (!framing?.position || !framing?.target) return false;
    // A framing is exact: any in-flight smooth dolly is cancelled, never blended.
    dollyTarget = null;
    copyPoint(camera.position, framing.position);
    copyPoint(orbitControls.target, framing.target);
    if (framing.fov !== null && framing.fov !== undefined) {
      camera.fov = framing.fov;
      camera.updateProjectionMatrix();
    }
    orbitControls.update();
    activePreset = presetName;
    return true;
  }

  function applyPreset(name) {
    const selected = name === 'isometric' ? ISOMETRIC_PRESET : CAMERA_PRESETS[name];
    if (!selected) return false;
    return applyFraming(selected, name);
  }

  function update(deltaSeconds = 0) {
    // Dolly first: OrbitControls derives its spherical radius from the camera position it reads
    // on update, so the smoothed distance survives the controls' own damping pass.
    applyDollyStep(deltaSeconds);
    orbitControls.update();
  }

  function getState() {
    return Object.freeze({ activePreset, dollyTarget });
  }

  function dispose() {
    orbitControls.domElement?.removeEventListener?.('wheel', onWheel);
    orbitControls.dispose?.();
  }

  return { applyPreset, applyFraming, update, getState, dispose };
}
