// materials.mjs — the eleven spec materials, built once (P4 BLOCKOUT).
//
// CONTRACT: this file is the ONLY place a colour, metalness or roughness for this asset is
// written. Every asset in this run drifted at least one value between spec and code, and
// each time the fix was to reconcile the CODE to the contract, never the reverse.

import * as THREE from 'three';

/** Spec table, verbatim. Values here must equal design-spec.yaml materials[]. */
export const SPEC = {
  // ── PALETTE SOLVED FROM THE EXPOSURE TARGET AT MATERIALS ──────────────────────
  // The blockout palette put three of four front surfaces on the FLOOR of the tone curve —
  // chassis 0.042, module face 0.103, PSU face 0.074 of 1.0 — which is why the front
  // furniture was reported as unreadable even though the divisions are 16.7 px wide and
  // every adjacent pair cleared 20% Weber. Weber is a RATIO: two blacks 59% apart are still
  // two blacks.
  //
  // These three are SOLVED, not picked: inverting the tone curve at this rig's front
  // irradiance for targets of 0.19 / 0.29 / 0.43. And solved as a SET — the first attempt
  // opened PSU-vs-module to 49% and closed PSU-vs-chassis to 8%, because separation is a
  // property of the whole set and moving one surface moves it relative to every other.
  //
  // Still "dark powder-coated": #41454b is charcoal, not black. The colour is UNSOURCED —
  // P1 records form factor, dimensions, weight and front inventory and nothing about finish
  // — which is what makes this available to solve rather than a value to preserve.
  chassis_black:  { color: '#41454b', metalness: 0.0, roughness: 0.55 },
  ear_steel:      { color: '#a8adb4', metalness: 0.9, roughness: 0.42 },
  module_face:    { color: '#5f656e', metalness: 0.0, roughness: 0.50 },
  slot_cavity:    { color: '#0b0c0e', metalness: 0.0, roughness: 0.80 },
  psu_face:       { color: '#4e535a', metalness: 0.0, roughness: 0.52 },
  // ── INTENSITY 4.0 -> 2.0, RE-MEASURED AGAINST THIS HOUSING ────────────────────
  // 4.0 was SEEDED from the sibling Axis, whose lamp sat on a WHITE collar rendering 0.879 —
  // there the lit LED was DARKER than its own bezel until it reached 4. This chassis is
  // charcoal and its bay faces land at 0.29-0.43, so the lamp clears its surround at 1.
  //
  // The reason to stop at 2 is CHROMA, which luminance alone cannot see. Tone mapping is
  // applied PER CHANNEL, so an over-driven emissive saturates every channel toward 1.0 and
  // the lamp goes WHITE. Measured: saturation 87% (blue) / 92% (green) at intensity 2,
  // falling to 72% / 82% at 4 and 49% / 63% at 8.
  //
  // On this asset that trade is one-sided. `psu-state-colours` is a critical about HUE — blue
  // standby versus green enabled — so washing the lamps toward white to buy 0.25x more
  // luminance would spend the very thing the feature exists to show. A borrowed number is
  // not a measured one, and here the two disagree.
  led_blue:       { color: '#0a1014', metalness: 0.0, roughness: 0.35,
                    emissive: '#3aa0ff', emissiveIntensity: 2.0 },
  led_green:      { color: '#0a1410', metalness: 0.0, roughness: 0.35,
                    emissive: '#2fd07a', emissiveIntensity: 2.0 },
  port_shield:    { color: '#9aa0a8', metalness: 0.9, roughness: 0.40 },
  port_cavity:    { color: '#0c0d10', metalness: 0.0, roughness: 0.72 },
  // Lifted with the rest of the panel so the connector has visible FORM rather than reading
  // as a hole: it stays the darkest thing on the face by a wide margin, which is what makes
  // a moulded block read against a metal panel.
  terminal_block: { color: '#2a2c30', metalness: 0.0, roughness: 0.50 },
  panduit_livery: { color: '#e8e8e4', metalness: 0.0, roughness: 0.50 },
};

export function createMaterials() {
  const mats = {};
  for (const [id, s] of Object.entries(SPEC)) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(s.color), metalness: s.metalness, roughness: s.roughness,
    });
    m.name = id;
    if (s.emissive) {
      m.emissive = new THREE.Color(s.emissive);
      m.emissiveIntensity = s.emissiveIntensity;
    }
    // Specular return comes from the environment map, set PER MATERIAL —
    // scene.environmentIntensity is a DEAD PROPERTY in r160 and setting it silently does
    // nothing, which is how a whole recipe went unapplied on a sibling asset.
    m.envMapIntensity = s.metalness >= 0.85 ? 1.15 : 0.55;
    mats[id] = m;
  }
  return mats;
}

/** Compare the live materials against the spec table. Returns the failure count. */
export function verifyMaterialsMatchSpec(mats) {
  let bad = 0;
  const fail = (m) => { console.error(`[materials] ${m}`); bad += 1; };
  for (const [id, s] of Object.entries(SPEC)) {
    const m = mats[id];
    if (!m) { fail(`${id} declared in spec but never built`); continue; }
    const hex = `#${m.color.getHexString()}`;
    if (hex !== s.color) fail(`${id} colour drifted: code ${hex} vs spec ${s.color}`);
    if (Math.abs(m.metalness - s.metalness) > 1e-6) fail(`${id} metalness drifted`);
    if (Math.abs(m.roughness - s.roughness) > 1e-6) fail(`${id} roughness drifted`);
    if (m.metalness > 0.05 && m.metalness < 0.85) fail(`${id} metalness ${m.metalness} is in the forbidden mid-range`);
    // AN EMISSIVE DECLARED BUT BLACK EMITS NOTHING, and `emissiveIntensity > 0` does not
    // catch it: three.js defaults that to 1 while the COLOUR defaults to black, so the
    // obvious assertion passes over a dead indicator. Carried from the Axis materials pass,
    // where exactly that check reported every material as emitting while none did.
    if (s.emissive) {
      const eh = `#${m.emissive.getHexString()}`;
      if (eh !== s.emissive) fail(`${id} emissive drifted: code ${eh} vs spec ${s.emissive}`);
      if (m.emissive.getHex() === 0) fail(`${id} declares an emissive but renders black`);
      if (!(m.emissiveIntensity > 0)) fail(`${id} emissive intensity is ${m.emissiveIntensity}`);
    }
  }
  return bad;
}
