// lighting.mjs — the house rig, aimed at a subject whose lid is 13x its face (P4 BLOCKOUT).
//
// This is the fifth time in this run that the inherited rig answers a different subject, and
// it is the UPS's problem taken to an extreme:
//   PDU      — wasted light on up-facing normals; key lowered.
//   Stratix  — a critical ON the top face; key RAISED.
//   UPS      — a top face 5x the front, carrying nothing; key lowered.
//   Axis     — every critical facing DOWN; a source added BELOW.
//   THIS     — a top face THIRTEEN TIMES the front, carrying nothing.
//
// Front area 20752 mm^2; top area 269773 mm^2. Every one of the five criticals is on the
// front. Light spent on up-facing normals is light spent where nothing is judged, and at 13x
// that waste is larger here than on any previous asset.
//
// Extracted as a PURE FACTORY so the analytic check imports the real rig instead of a
// hand-transcribed copy — transcribing one on a sibling asset produced a careful measurement
// of a key light at a position the code never had.

import * as THREE from 'three';

export const RIG = {
  // KEY — low and to the right-front, RAKING the front panel rather than washing the lid.
  key:   { pos: [2.6, 0.75, 4.2], intensity: 1.25, color: 0xfff9f2 },

  // FRONT FILL — the primary source for the face that carries every critical. The bays are
  // shallow recesses (2.5 mm) whose read comes from the cavity edge, not from starving the
  // face of light, so a strong frontal does not flatten them.
  front: { pos: [0.3, 0.35, 5.0], intensity: 0.92, color: 0xf2f6ff },

  // TOP FILL — deliberately the smallest in the run. It exists only to stop the largest face
  // going dead black, never to compete with the front for the eye.
  top:   { pos: [0, 5.0, 1.2], intensity: 0.14, color: 0xdce8f4 },

  // FILL LEFT — cool complement; keeps the -x flank and its ear from disappearing.
  fill:  { pos: [-4.0, 1.2, 3.2], intensity: 0.34, color: 0xc8deff },

  // RIM — cold back-light separating a dark chassis from a dark background.
  rim:   { pos: [-2.0, 1.0, -5.0], intensity: 0.26, color: 0x80aee0 },
};

export const HEMI = { sky: 0xd0e8f8, ground: 0x1a2030, intensity: 0.42 };

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
 * Measures light DIRECTION, never occlusion: it can prove where a rig points, not how much
 * light survives into a cavity. The capture arbitrates that.
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
 * The pass/fail this rig exists for: the FRONT face — where all five criticals live — must
 * out-receive the featureless top. Reports with console.error and returns the failure count.
 */
export function verifyFrontOutshinesTheLid(lights, margin = 1.15) {
  const front = irradiance(lights, new THREE.Vector3(0, 0, 1)).total;
  const top = irradiance(lights, new THREE.Vector3(0, 1, 0)).total;
  let bad = 0;
  if (front < top * margin) {
    console.error(`[lighting] front ${front.toFixed(3)} vs lid ${top.toFixed(3)} ` +
                  `(ratio ${(front / top).toFixed(2)}) — the face carrying every critical is not clearly the brightest`);
    bad += 1;
  }
  return bad;
}
