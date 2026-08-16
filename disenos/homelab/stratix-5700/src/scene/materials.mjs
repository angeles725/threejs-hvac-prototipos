// materials.mjs — PBR palette, transcribed 1:1 from design-spec.yaml §materials.
//
// The spec is the contract: color / metalness / roughness here must not drift from it.
// Metalness is NEAR-BINARY by spec rule — 0.0-0.05 dielectric, 0.85-1.0 bare metal.
// Nothing in between. If a surface reads flat, fix it in the LIGHTING pass by re-aiming a
// lamp; never by nudging metalness. The enclosure is a coated finish, i.e. a dielectric.

import * as THREE from 'three';

/** LED states. `off` is not a colour choice — an unlit LED must emit nothing at all. */
export const LED_STATES = {
  off:   { emissive: '#000000', intensity: 0.0 },
  green: { emissive: '#3ee07a', intensity: 1.30 },
  amber: { emissive: '#ffb020', intensity: 1.30 },
  red:   { emissive: '#ff3b30', intensity: 1.30 },
};

export function createMaterials() {
  const mk = (p) => new THREE.MeshStandardMaterial(p);

  const materials = {
    housing: mk({ name: 'housing_charcoal', color: '#3a3d42', metalness: 0.0, roughness: 0.60 }),

    // --- port block -----------------------------------------------------------
    portHousing: mk({ name: 'port_housing', color: '#17181b', metalness: 0.0, roughness: 0.45 }),
    // The dark throat is what separates a real port from a painted rectangle
    // (critical feature port-block-10).
    portCavity:  mk({ name: 'port_cavity',  color: '#0c0d10', metalness: 0.0, roughness: 0.72 }),
    portShield:  mk({ name: 'port_shield',  color: '#9aa0a8', metalness: 0.9, roughness: 0.40 }),

    // --- diagnostics ----------------------------------------------------------
    // One material per LED COLOUR, not per LED: the system column and the per-port row
    // switch state together, so sharing keeps the toggle to three assignments.
    ledGreen: mk({ name: 'led_green', color: '#0a1410', metalness: 0.0, roughness: 0.35,
                   emissive: new THREE.Color(LED_STATES.off.emissive), emissiveIntensity: 0 }),
    ledAmber: mk({ name: 'led_amber', color: '#141008', metalness: 0.0, roughness: 0.35,
                   emissive: new THREE.Color(LED_STATES.off.emissive), emissiveIntensity: 0 }),
    ledRed:   mk({ name: 'led_red',   color: '#140a0a', metalness: 0.0, roughness: 0.35,
                   emissive: new THREE.Color(LED_STATES.off.emissive), emissiveIntensity: 0 }),

    // --- top terminal blocks --------------------------------------------------
    terminalBlock: mk({ name: 'terminal_block', color: '#1c1d20', metalness: 0.0, roughness: 0.50 }),
    terminalScrew: mk({ name: 'terminal_screw', color: '#a8adb4', metalness: 0.9, roughness: 0.45 }),

    // --- mounting -------------------------------------------------------------
    dinClip:  mk({ name: 'din_clip_steel', color: '#8e939a', metalness: 0.9, roughness: 0.50 }),
    railSteel: mk({ name: 'rail_steel',    color: '#b4b8bd', metalness: 0.9, roughness: 0.55 }),

    // --- livery ---------------------------------------------------------------
    liveryPrint: mk({ name: 'livery_print', color: '#e8e8e4', metalness: 0.0, roughness: 0.60 }),
    liveryRed:   mk({ name: 'livery_red',   color: '#c8102e', metalness: 0.0, roughness: 0.55 }),
  };

  // envMapIntensity is the r160-correct IBL dial. scene.environmentIntensity does NOT
  // exist in r160 — setting it is a silent no-op.
  for (const m of Object.values(materials)) m.envMapIntensity = 1.0;
  // Bare metals are the only surfaces that should mirror the room.
  // 1.30 -> 1.70. THE SINGLE AUTHORISED ATTEMPT at making the SFP mouth stand out, and
  // it comes with a caveat worth stating rather than burying: this scene has NO ambient
  // occlusion of any kind, so three.js already gives a metal sleeve sitting at the bottom
  // of a 3.4 mm throat the FULL environment — more than it would physically receive. The
  // original 1.30 was already generous on those grounds, so this raise is not
  // compensating occlusion, it is a rendering dial being turned past physical.
  //
  // That is defensible for a small part on a hero render and it fabricates no claim about
  // the product, but it is the LAST such turn: if the mouth still does not read, the
  // honest conclusion is that the distinction is genuinely subtle at real scale, which is
  // what the review already found. No more lamps, no more rounds.
  materials.portShield.envMapIntensity = 1.70;
  materials.terminalScrew.envMapIntensity = 1.20;
  materials.dinClip.envMapIntensity = 1.15;
  // A jack throat is an occluded cavity; letting it take full room light would flatten
  // the recess. This is the honest lever for "reads dark" — not a blacker albedo.
  materials.portCavity.envMapIntensity = 0.30;

  return materials;
}

/** Every live material keyed by its SPEC id, for the traceability check. */
export function materialsBySpecId(materials) {
  const out = {};
  for (const m of Object.values(materials)) out[m.name] = m;
  return out;
}

/**
 * Drive the LED banks. `on` energises them to their nominal states; `off` returns every
 * lamp to true black. Colours are per-material so one call moves the whole board.
 */
export function setLedState(materials, on) {
  const apply = (mat, state) => {
    const s = LED_STATES[state];
    mat.emissive.set(s.emissive);
    mat.emissiveIntensity = s.intensity;
  };
  apply(materials.ledGreen, on ? 'green' : 'off');
  apply(materials.ledAmber, on ? 'amber' : 'off');
  apply(materials.ledRed, on ? 'red' : 'off');
  return on;
}
