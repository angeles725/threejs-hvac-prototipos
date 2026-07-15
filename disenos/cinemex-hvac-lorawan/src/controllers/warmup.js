/**
 * UX item 9 — first-use shader-compile hitch.
 *
 * Two interactions used to freeze the app for hundreds of milliseconds THE FIRST time only:
 * the "Sección" (cutaway) toggle and the first device selection. Both are shader compilation,
 * not per-frame cost. Toggling `renderer.localClippingEnabled` + material clipping planes changes
 * shader defines, so every cutaway-registered material relinks its program on the first flip; the
 * emissive-boosted selection/status overlay materials compile lazily on their first visible frame.
 * The second use hits WebGLRenderer's program cache and is instant — exactly what the user saw.
 *
 * This warm-up pays that cost during load, before `data-app-ready` is set (the capture harness
 * waits on that flag, so cold-load evidence still sees a fully settled state):
 *
 *   1. `renderer.compile(scene, camera)` in the exact boot configuration. `compile()` traverses
 *      the whole graph regardless of visibility, so the hidden interaction pools (alarm/offline/
 *      selection/highlight/halo materials) get their programs here — that removes the
 *      first-selection hitch without touching any state.
 *   2. The same compile with the cutaway state FLIPPED (clipping planes + localClippingEnabled),
 *      so both program variants of every cutaway material land in the cache.
 *   3. Byte-identical restore of the boot cutaway state.
 *
 * Engineering-mode flips (opacity/transparent/depthWrite) are uniforms and pipeline state, not
 * shader defines — they need no warm-up. Light-state flips are emissive uniforms — same.
 */
export function runShaderWarmup({
  renderer,
  scene,
  camera,
  materialRegistry,
  clippingPlane,
  bootCutaway = false,
} = {}) {
  if (!renderer?.compile || !scene || !camera) {
    throw new TypeError('A renderer with compile(), a scene and a camera are required.');
  }
  const boot = Boolean(bootCutaway);

  // Pass 1: the boot configuration itself (covers every lazily-created overlay material).
  renderer.compile(scene, camera);

  // Pass 2: the OTHER cutaway variant, so the first user toggle is a cache hit either way.
  const flipped = !boot;
  renderer.localClippingEnabled = flipped;
  materialRegistry?.setCutaway?.(flipped, clippingPlane);
  renderer.compile(scene, camera);

  // Restore the boot state exactly — the capture URLs' cold-load evidence must not change.
  renderer.localClippingEnabled = boot;
  materialRegistry?.setCutaway?.(boot, clippingPlane);

  return Object.freeze({
    compiles: 2,
    warmedCutawayVariant: flipped,
    restoredCutaway: boot,
  });
}
