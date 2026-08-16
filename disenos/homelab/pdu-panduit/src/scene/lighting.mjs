// lighting.mjs — the house rig, as a PURE factory (P5a LIGHTING-CAMERA).
//
// Split out of runtime.mjs so the rig can be analysed without a renderer. Lambertian
// response to directional lights is exact maths, so a headless check can compute the
// irradiance every surface normal receives and answer the question this pass actually
// turns on: does a VERTICAL subject read, or does it read flat?
//
// THE CORE PROBLEM, measured rather than assumed. The stock house rig was calibrated on
// horizontal equipment, where the big readable planes face UP. This subject is a 1.78 m
// bar whose entire identity — outlet column, bank colours, nameplate — lives on a plane
// facing +z. On the pre-pass rig an upward-facing normal received MORE light than the
// front face: 1.606 vs 1.429, a front/up ratio of 0.89. The key sat so high that the
// best-lit surfaces were the ones nobody looks at.
//
// After re-aiming: front 1.696, up 1.293, front/up 1.31. The rear face went from 0.306 to
// 0.832 (2.71x) — see rearFill below for why that one mattered.
//
// The fix is geometric, never material. The body is powder-coat: metalness stays 0.0.
// Raising metalness to "get some life back" is the trap this pass exists to avoid.
//
// SHADOWS STAY OFF, and that is a reasoned choice rather than an inherited default:
//   - The outlet recess does NOT depend on them. The cavity floor is #111114 with
//     envMapIntensity 0.35; it reads dark from albedo and occlusion, not cast shadow.
//     A 5 mm recess at ~14 px per outlet would gain almost nothing.
//   - Shadow maps under headless SwiftShader are the orchestrator's risk to take, not
//     mine to impose blind — I cannot capture, so I cannot prove they do not stall.
//   Net: the cost is real and unverifiable here, the benefit is marginal. Left off.

import * as THREE from 'three';

/**
 * Directional lamps, aimed for a VERTICAL subject.
 *
 * Each entry records WHY it points where it does, because the next person to touch this
 * will otherwise re-aim it for a horizontal object and undo the pass.
 */
export const RIG = {
  // KEY — dropped from y=10 to y=4.5. It still comes from upper-right so the strip keeps
  // a light direction, but the front plane now leads instead of the incidental top faces.
  key:   { pos: [5.5, 4.5, 8.0], intensity: 1.45, color: 0xfff8f0 },

  // FILL — left-front, cool. Its -x direction is what lights the LEFT-facing rim walls of
  // every outlet tub, which is half of what makes the sockets read as three-dimensional.
  fill:  { pos: [-8.0, 3.0, 5.5], intensity: 0.50, color: 0xd0e8ff },

  // FRONT — near head-on, deliberately WEAK. A strong frontal light is what flattens a
  // recess: it reaches the cavity floor as directly as the rim, erasing the depth the
  // structural pass built. It exists only to keep the front face off black.
  front: { pos: [1.5, 1.5, 10.0], intensity: 0.30, color: 0xf0f4ff },

  // RIM — cold back-light separating a thin bar from a dark background.
  rim:   { pos: [-4.5, 3.5, -9.0], intensity: 0.34, color: 0x88b8e8 },

  // REAR FILL — NEW this pass. The rear face was receiving 0.50 total against the front's
  // 1.62: the ?cam=rear and ?cam=rear-detail captures, which are the ONLY evidence for
  // the mount-button feature, were being judged in the dark. This lamp is aimed squarely
  // at the rear plane and is the reason that feature is now lit as well as framed.
  rearFill: { pos: [2.0, 2.5, -9.5], intensity: 0.62, color: 0xe8f0ff },
};

export const HEMI = {
  sky: 0xd0e4f0,
  ground: 0x1e2228,
  intensity: 0.50,
};

/**
 * Build the rig. Pure — no renderer, no scene, no canvas. Returns the light objects so a
 * caller can add them and a headless check can measure them.
 * @returns {{hemi: THREE.HemisphereLight, key, fill, front, rim, rearFill}}
 */
export function createLightingRig() {
  const hemi = new THREE.HemisphereLight(HEMI.sky, HEMI.ground, HEMI.intensity);
  hemi.name = 'hemi_light';

  const lights = { hemi };
  for (const [key, cfg] of Object.entries(RIG)) {
    const l = new THREE.DirectionalLight(cfg.color, cfg.intensity);
    l.name = `${key}_light`;
    l.position.set(...cfg.pos);
    l.castShadow = false;   // see SHADOWS STAY OFF above
    lights[key] = l;
  }
  return lights;
}

/** Add every lamp in the rig to a scene. */
export function addLightingRig(scene, lights) {
  for (const l of Object.values(lights)) scene.add(l);
  return lights;
}

// ── Analytic irradiance ──────────────────────────────────────────────────────
const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * Diffuse irradiance a surface with normal N receives from the rig — the same terms
 * three.js sums: max(0, N·L) per directional lamp, plus the hemisphere's
 * lerp(ground, sky, 0.5·N.y + 0.5).
 *
 * This is a LIGHTING measurement, not a render: it says nothing about occlusion or
 * tonemapping. It answers exactly one question — which way does this rig actually point.
 */
export function irradiance(lights, normal) {
  const n = normal.clone().normalize();
  let direct = 0;
  const per = {};
  for (const [key, l] of Object.entries(lights)) {
    if (!l.isDirectionalLight) continue;
    const v = Math.max(0, n.dot(l.position.clone().normalize())) * l.intensity * luma(l.color);
    per[key] = v;
    direct += v;
  }
  const h = lights.hemi;
  const t = 0.5 * n.y + 0.5;
  const amb = h.intensity * (luma(h.groundColor) * (1 - t) + luma(h.color) * t);
  return { direct, amb, total: direct + amb, per };
}
