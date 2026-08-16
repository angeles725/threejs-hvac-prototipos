// lighting.mjs — the house rig, as a PURE factory (P5a LIGHTING-CAMERA).
//
// Split out of runtime.mjs so the rig can be measured without a renderer. Lambertian
// response to directional lights is exact maths, so a headless check can compute the
// irradiance every surface normal receives and answer the question this pass turns on:
// where is the light actually going, and does that match where the features are?
//
// Extracting it also removes a whole error class. Measuring the rig by hand-transcribing
// its numbers into a test file put a key light at (3.0, 2.5, 4.0) that the code has at
// (2.5, 2.0, 3.0) — a measurement of a rig that did not exist. Importing the real module
// cannot drift from the real module.
//
// THIS SUBJECT IS THE OPPOSITE OF THE SIBLING SWITCH, and the rig arrived tuned for a
// different problem again:
//   FRONT (+z) — display, power button, LED array, front grille, rack ears
//                -> ALL FOUR critical features
//   TOP   (+y) — 440 x 666 mm, the LARGEST face on the chassis, and carries NO feature
//   SIDE  (±x) — the 666 mm depth read and the 18 vent slots
//   REAR  (-z) — the service panel; no capture state points at it
// The Stratix had a critical ON its top face and needed its key raised. Here the top is a
// big empty plane: light spent on it is light not spent on the four criticals at the
// front. Same house rig, opposite correct answer — for the third time in this project.

import * as THREE from 'three';

export const RIG = {
  // KEY — right-front. Dropped from y=2.0 to y=1.4 so it rakes the front panel instead of
  // washing the empty top. It keeps its +x bias, which is what separates the two flanks.
  key:   { pos: [2.5, 1.4, 3.4], intensity: 1.20, color: 0xfff9f2 },

  // FRONT FILL — the primary source for the panel that carries every critical feature.
  // Raised 0.72 -> 0.85. Unlike a deep jack throat, these recesses are shallow (2.5 mm)
  // and their read comes from the louvre blade and the bright stamped lip, not from
  // starving the face of light, so a stronger frontal does not flatten them here.
  front: { pos: [0.5, 0.5, 5.0], intensity: 0.85, color: 0xf2f6ff },

  // TOP FILL — cut 0.40 -> 0.22. It exists only to stop the largest face going dead
  // black, not to compete with the front for the eye.
  top:   { pos: [0, 5.0, 1.0], intensity: 0.22, color: 0xdce8f4 },

  // FILL LEFT — cool complement. The -x flank is the shaded one; this keeps its vent
  // slots from disappearing entirely while preserving the spread that reads as depth.
  fill:  { pos: [-4.0, 2.0, 3.0], intensity: 0.34, color: 0xc8deff },

  // RIM — cold back-light separating a dark chassis from a dark background.
  rim:   { pos: [-2.0, 1.5, -5.0], intensity: 0.26, color: 0x80aee0 },
};

export const HEMI = { sky: 0xd0e8f8, ground: 0x1a2030, intensity: 0.45 };

/** Build the rig. Pure — no renderer, no scene, no canvas. */
export function createLightingRig() {
  const hemi = new THREE.HemisphereLight(HEMI.sky, HEMI.ground, HEMI.intensity);
  hemi.name = 'hemi_light';
  const lights = { hemi };
  for (const [key, cfg] of Object.entries(RIG)) {
    const l = new THREE.DirectionalLight(cfg.color, cfg.intensity);
    l.name = `${key}_light`;
    l.position.set(...cfg.pos);
    l.castShadow = false;
    lights[key] = l;
  }
  return lights;
}

/** Add every lamp to a scene. */
export function addLightingRig(scene, lights) {
  for (const l of Object.values(lights)) scene.add(l);
  return lights;
}

// ── Analytic irradiance ──────────────────────────────────────────────────────
const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * Diffuse irradiance a surface with normal N receives — the same terms three.js sums:
 * max(0, N·L) per directional lamp plus the hemisphere's lerp(ground, sky, 0.5·N.y + 0.5).
 *
 * This measures light DIRECTION, not occlusion. It can prove where a rig points; it
 * cannot say how much light survives into a cavity. The capture arbitrates that.
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
