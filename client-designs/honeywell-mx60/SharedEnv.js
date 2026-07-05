/**
 * SharedEnv.js — single-instance PMREM environment texture for all 3D detail
 * scenes (UP, Cárcamo). Inspired by Reflow's `_sharedCache` pattern in
 * `historyListMixin.js`: do the heavy work once, reuse from then on.
 *
 * Why a dedicated off-screen renderer?
 *   The texture returned by `PMREMGenerator.fromScene()` is a render-target
 *   texture — its data lives in the GPU context of the renderer that
 *   produced it. If that renderer is destroyed (which happens every time a
 *   detail page unmounts), the texture goes with it.
 *
 *   To share the texture across multiple short-lived scene renderers, we
 *   need to keep the *generating* renderer alive forever. This module owns
 *   that renderer, hidden off-screen, and never disposes it.
 *
 * Cost: one extra WebGL context that lives for the page lifetime. Browsers
 * cap WebGL contexts at 16+; one permanent slot is fine.
 *
 * Mounts MUST NOT call `texture.dispose()` on the returned env.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let _sourceRenderer = null;
let _envTexture = null;

/**
 * Returns the shared PMREM environment texture. First call builds it; later
 * calls return the cached instance for free.
 */
export function getEnvTexture() {
  if (_envTexture) return _envTexture;

  // Tiny invisible canvas — the renderer never paints to screen, only to
  // its internal render target during PMREM generation.
  _sourceRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  _sourceRenderer.setSize(1, 1);

  const pmrem = new THREE.PMREMGenerator(_sourceRenderer);
  _envTexture = pmrem.fromScene(new RoomEnvironment(_sourceRenderer), 0.04).texture;
  // Generator is a temp utility; the resulting texture is what we keep.
  pmrem.dispose();

  return _envTexture;
}
