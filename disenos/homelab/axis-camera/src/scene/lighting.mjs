// lighting.mjs — the house rig, INVERTED for a ceiling-mounted subject (P4 BLOCKOUT).
//
// This is the fourth time in this run that the inherited rig answers a different subject,
// and the first time the answer differs in KIND rather than in degree:
//   PDU      — wasted light on up-facing normals; key lowered.
//   Stratix  — a critical ON the top face; key RAISED.
//   UPS      — a large empty top face; key lowered again.
//   THIS     — every critical faces DOWN. No position on a ceiling arc reaches them.
//
// That last one is not a tuning gap, it is a geometric contradiction. Lambertian response is
// max(0, N·L): for a normal pointing at the floor and a lamp above the subject, the dot
// product is negative and the term CLAMPS TO ZERO. Intensity multiplies zero. The rig does
// not need turning up, it needs a source that does not exist in the house rig — one BELOW.
//
// Physically this is the light a real ceiling camera lives in: almost everything reaching
// its underside has bounced off the floor first. So the fix is not a trick, it is modelling
// the actual light of the actual installation.
//
// AND NOT BY RAISING METALNESS. The shroud and the barrel are matte dielectrics. Making them
// metallic to catch a highlight would be a lie about the material used to paper over a
// lighting fault — the spec forbids it explicitly and the gate affirmed the ban.
//
// Extracted as a PURE FACTORY so the analytic check imports the real rig instead of a
// hand-transcribed copy. Transcribing one on the sibling asset produced a measurement of a
// key light at a position the code never had.

import * as THREE from 'three';

export const RIG = {
  // KEY — BELOW and to the right-front. The lamp that actually lights this subject.
  key:    { pos: [2.2, -2.8, 3.2], intensity: 1.15, color: 0xfff7ee },

  // UNDER FILL — straight up into the bubble and the optics. The four criticals live on
  // surfaces this lamp is the only one to reach.
  under:  { pos: [0.2, -4.2, 1.4], intensity: 0.78, color: 0xf0f4ff },

  // RING GRAZE — near-horizontal, so the trim ring's edge and the 11 mm collar overhang
  // catch a rim of light instead of dissolving into the body.
  graze:  { pos: [-3.4, -0.5, 2.6], intensity: 0.40, color: 0xd8e6ff },

  // TOP — deliberately tiny. The base plate faces INTO the ceiling and is never framed by a
  // contrapicado hero. Spending light there is spending it where nothing is judged, which is
  // precisely the mistake the PDU pass caught.
  top:    { pos: [0.5, 4.0, 1.0], intensity: 0.10, color: 0xdce8f4 },

  // RIM — cold separation of a white body from a dark background.
  rim:    { pos: [-1.8, -1.2, -4.2], intensity: 0.28, color: 0x86b2e4 },
};

// GROUND IS BRIGHTER THAN SKY, which looks wrong until you remember which way this object
// faces. The hemisphere term is lerp(ground, sky, 0.5·N.y + 0.5); every surface that matters
// here has N.y < 0 and therefore samples mostly GROUND. On a normal subject this would be
// backwards — on this one it is the ambient a ceiling fixture actually receives.
export const HEMI = { sky: 0x2a3340, ground: 0xc4d2e2, intensity: 0.55 };

/** Build the rig. Pure — no renderer, no scene, no canvas. */
export function createLightingRig() {
  const hemi = new THREE.HemisphereLight(HEMI.sky, HEMI.ground, HEMI.intensity);
  hemi.name = 'hemi_light';
  const lights = { hemi };
  for (const [k, cfg] of Object.entries(RIG)) {
    const l = new THREE.DirectionalLight(cfg.color, cfg.intensity);
    l.name = `${k}_light`;
    l.position.set(...cfg.pos);
    l.castShadow = false;
    lights[k] = l;
  }
  return lights;
}

export function addLightingRig(scene, lights) {
  for (const l of Object.values(lights)) scene.add(l);
  return lights;
}

// ── Analytic irradiance ──────────────────────────────────────────────────────────
const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * Diffuse irradiance a surface with normal N receives — the same terms three.js sums.
 * Measures light DIRECTION, not occlusion: it can prove where a rig points, never how much
 * light survives into a cavity or through a translucent wall. The capture arbitrates that.
 */
export function irradiance(lights, normal) {
  const n = normal.clone().normalize();
  let direct = 0;
  const per = {};
  for (const [k, l] of Object.entries(lights)) {
    if (!l.isDirectionalLight) continue;
    const v = Math.max(0, n.dot(l.position.clone().normalize())) * l.intensity * luma(l.color);
    per[k] = v;
    direct += v;
  }
  const h = lights.hemi;
  const t = 0.5 * n.y + 0.5;
  const amb = h.intensity * (luma(h.groundColor) * (1 - t) + luma(h.color) * t);
  return { direct, amb, total: direct + amb, per };
}

/**
 * The pass/fail this asset's rig exists for: DOWNWARD normals — where every critical lives —
 * must receive irradiance comparable to the upward-facing base plate that nothing looks at.
 * Reports with console.error and returns the failure count.
 */
export function verifyDownwardNormalsAreLit(lights, ratioMin = 1.0) {
  const down = irradiance(lights, new THREE.Vector3(0, -1, 0)).total;
  const up = irradiance(lights, new THREE.Vector3(0, 1, 0)).total;
  let bad = 0;
  if (down < up * ratioMin) {
    console.error(`[lighting] downward normals get ${down.toFixed(3)} vs ${up.toFixed(3)} upward ` +
                  `(ratio ${(down / up).toFixed(2)}) — the criticals are darker than the face nobody sees`);
    bad += 1;
  }
  return bad;
}
