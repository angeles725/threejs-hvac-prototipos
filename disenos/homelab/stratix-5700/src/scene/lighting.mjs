// lighting.mjs — the house rig, as a PURE factory (P5a LIGHTING-CAMERA).
//
// Split out of runtime.mjs so the rig can be analysed without a renderer. Lambertian
// response to directional lights is exact maths, so a headless check can compute the
// irradiance every surface normal receives and answer the question this pass actually
// turns on: does a VERTICAL subject read, or does it read flat?
//
// THE CORE PROBLEM IS NOT THE SAME ONE AS THE PREVIOUS ASSET, and this file arrived as a
// verbatim copy of that asset's rig, so it had the wrong answer baked in.
//
// That subject was a 1.78 m vertical bar: its whole identity sat on a plane facing +z, and
// upward-facing light was waste, so the key was pulled DOWN to y=4.5 to stop the top faces
// out-shining the front.
//
// THIS subject is a compact box whose identity is split across TWO planes:
//   FRONT (+z) — port block, LED column, livery      -> 3 of 5 critical features
//   TOP   (+y) — the screw terminal blocks            -> 1 critical of its own
//   REAR  (-z) — the DIN latch                        -> 1 critical, seen at ?cam=rear
// The approved hero is a 42/24 diagonal chosen precisely to show front and top together,
// so suppressing the top here would darken a critical feature to solve a problem this
// subject does not have.
//
// MEASURED, inherited rig -> re-aimed:
//   FRONT 1.696 -> 1.742    TOP 1.293 -> 1.500 (+16%)    REAR 0.832 (unchanged)
//   front/top 1.31 -> 1.16  ·  rear/front 0.48  ·  side spread 1.78  ·  front/side 1.73
// Front still leads, the terminal blocks are properly lit, the rear view stays usable, and
// the two flanks stay far enough apart in value for the louvre blades to throw a line.

import * as THREE from 'three';

export const RIG = {
  // KEY — dropped from y=10 to y=4.5. It still comes from upper-right so the strip keeps
  // a light direction, but the front plane now leads instead of the incidental top faces.
  // Raised from y=4.5 to 6.5. The previous asset needed it low; this one has a critical
  // feature ON the top face, so the key has to reach it.
  key:   { pos: [5.5, 6.5, 8.0], intensity: 1.45, color: 0xfff8f0 },

  // FILL — left-front, cool. Its -x direction is what lights the LEFT-facing rim walls of
  // every outlet tub, which is half of what makes the sockets read as three-dimensional.
  fill:  { pos: [-8.0, 3.0, 5.5], intensity: 0.50, color: 0xd0e8ff },

  // FRONT — near head-on, raised 0.30 -> 0.45 to answer the review's note that the SFP
  // THROATS read under-lit. A throat is an occluded cavity: the only lamp whose rays
  // actually enter it is one pointing down its axis.
  //
  // The counter-risk is real and is why it is 0.45 and not 1.0 — a frontal light strong
  // enough to fill a throat is also strong enough to flatten it, reaching the cavity floor
  // as directly as the rim. Measured, front/side contrast went 1.63 -> 1.73 at this value,
  // so the recess reading did not degrade. HONEST LIMIT: this model computes DIRECTION,
  // not occlusion, so it can tell you a lamp points into the throat but not how much light
  // survives the trip. The capture is the arbiter of that.
  front: { pos: [1.5, 1.5, 10.0], intensity: 0.45, color: 0xf0f4ff },

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
