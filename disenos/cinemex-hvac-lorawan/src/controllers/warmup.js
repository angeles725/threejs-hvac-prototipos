/**
 * UX item 9 — first-use shader-compile hitch.
 *
 * The first device selection used to freeze the app for hundreds of milliseconds THE FIRST time
 * only: the emissive-boosted selection/status overlay materials compile lazily on their first
 * visible frame. The second use hits WebGLRenderer's program cache and is instant — exactly what
 * the user saw.
 *
 * This warm-up pays that cost during load, before `data-app-ready` is set (the capture harness
 * waits on that flag, so cold-load evidence still sees a fully settled state):
 * `renderer.compile(scene, camera)` in the exact boot configuration. `compile()` traverses the
 * whole graph regardless of visibility, so the hidden interaction pools (alarm/offline/selection/
 * highlight/halo materials) get their programs here — that removes the first-selection hitch
 * without touching any state.
 *
 * Limpieza fase 2 (2026-07-18): the cutaway feature was retired, so the second compile pass that
 * pre-paid the flipped clipping-plane shader variants left with it. One pass remains.
 */
export function runShaderWarmup({ renderer, scene, camera } = {}) {
  if (!renderer?.compile || !scene || !camera) {
    throw new TypeError('A renderer with compile(), a scene and a camera are required.');
  }
  renderer.compile(scene, camera);
  return Object.freeze({ compiles: 1 });
}
