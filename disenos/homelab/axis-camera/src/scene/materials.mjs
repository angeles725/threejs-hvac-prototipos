// materials.mjs — the nine spec materials, built once (P4 BLOCKOUT).
//
// CONTRACT: this file is the ONLY place a colour, metalness or roughness for this asset is
// written. Every previous asset in this run drifted at least one value between spec and
// code, and each time the fix was to reconcile the CODE to the contract, never the reverse.
// Keeping the table in one module makes a traceability sweep a comparison rather than a hunt.
//
// HEADLESS CONSTRAINT THAT SHAPES THE WHOLE ASSET:
// the QA gate renders under SwiftShader, where MeshPhysicalMaterial.transmission stalls the
// shader compile. The clear bubble — the defining feature of a dome camera — therefore
// CANNOT use real transmission. It is a MeshStandardMaterial with transparent + opacity and
// a very low roughness, so the glass read comes from the specular highlight and from what
// is legible through it, not from refraction.

import * as THREE from 'three';

/** Spec table, verbatim. Values here must equal design-spec.yaml materials[]. */
export const SPEC = {
  housing_white:     { color: '#eceded', metalness: 0.0, roughness: 0.45 },
  // SMOKED, not clear-white. #dfe6ea -> #8a949c at the lighting pass, and this is the
  // asset's central failure caught by measuring AFTER the tone curve.
  //
  // A near-white bubble sitting in E = 1.715 contributes 1.342 of its own linear luminance,
  // which dominates the alpha blend: the matte black shroud behind it, which renders 0.002
  // bare, came through at 0.671 on screen — 76% of the white collar next to it. The optical
  // cavity stopped reading as a cavity and the dome read as a LIGHT FITTING, which is
  // precisely the failure the shroud exists to prevent. Smoking the bubble drops the veiled
  // cavity to 0.335, or 38% of the collar.
  //
  // Defensible as well as necessary: security domes are commonly smoked exactly so the lens
  // direction cannot be read, and the spec records the tint as unpublished (open item) with
  // clear-vs-smoked called out as a real product difference. Transmission is unchanged at
  // 0.42 — the interior is no less visible, the bubble simply stops glowing over it.
  dome_clear:        { color: '#8a949c', metalness: 0.0, roughness: 0.06, opacity: 0.42, transparent: true },
  shroud_black:      { color: '#0b0c0e', metalness: 0.0, roughness: 0.90 },
  lens_barrel:       { color: '#17181a', metalness: 0.0, roughness: 0.55 },
  // envMapIntensity raised for THIS material specifically (see below). Glass separates from
  // the matte barrel behind it by REFLECTION, not by albedo — both are near-black
  // dielectrics and their diffuse terms are 65% apart on a base so dark that the difference
  // is carried almost entirely by the highlight.
  lens_glass:        { color: '#080b12', metalness: 0.0, roughness: 0.08, envMap: 1.10 },
  lens_ring:         { color: '#a2a7ad', metalness: 0.9, roughness: 0.35 },
  // EMISSIVE declared here, at the materials pass, because a status indicator that emits
  // nothing is not an indicator. The body colour is the UNLIT diffuser; `emissive` is what
  // makes it a lamp. The INTENSITY stays the lighting pass's dial.
  status_led:        { color: '#0a1410', metalness: 0.0, roughness: 0.35,
  //   INTENSITY CLOSED AT LIGHTING-CAMERA: 1.0 -> 4.0. At 1.0 the LIT indicator rendered
  //   0.620 on screen against 0.879 for the housing around it — an energised lamp DARKER
  //   than its own bezel, which reads as off. 4.0 puts it at 0.914.
  //   Note the ceiling: ACES compression means even intensity 8 only reaches 1.11x the
  //   collar, so pushing past 4 blows the lamp out without buying separation. The rest of
  //   the read comes from hue — a saturated green against neutral white.
                       emissive: '#2fd07a', emissiveIntensity: 4.0 },
  axis_wordmark:     { color: '#1a1c1f', metalness: 0.0, roughness: 0.50 },
  // Darkened from #d8d9d5. The white body against a white ceiling separated by only 18%,
  // and the prop exists to CLARIFY the mounting, not to camouflage the subject into it.
  // Dropping the scenery is the right lever; brightening the product to escape its own
  // backdrop would be changing the asset to fix the set.
  ceiling_prop_tile: { color: '#bcbeba', metalness: 0.0, roughness: 0.85 },
};

export function createMaterials() {
  const mats = {};
  for (const [id, s] of Object.entries(SPEC)) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(s.color),
      metalness: s.metalness,
      roughness: s.roughness,
    });
    m.name = id;
    if (s.emissive) {
      m.emissive = new THREE.Color(s.emissive);
      m.emissiveIntensity = s.emissiveIntensity;
    }
    if (s.transparent) {
      m.transparent = true;
      m.opacity = s.opacity;
      // A hemisphere is seen from inside and outside at once — a ray entering the bubble
      // crosses its wall twice. Single-sided would make the far wall vanish and the dome
      // would read as a bowl.
      m.side = THREE.DoubleSide;
      // Without this the bubble writes depth and hides the optics it is supposed to reveal:
      // the transparent surface would occlude everything drawn after it. This single flag is
      // the difference between a clear dome and an opaque lid.
      m.depthWrite = false;
    }
    // Specular return on the metal ring and the lens element comes from the environment map,
    // set per material — scene.environmentIntensity is a DEAD PROPERTY in r160 and setting
    // it silently does nothing, which is how a whole recipe went unapplied on a sibling asset.
    m.envMapIntensity = s.envMap ?? (s.metalness >= 0.85 ? 1.15 : 0.55);
    mats[id] = m;
  }
  return mats;
}

/**
 * Compare the live materials against the spec table. Reports with console.error so the QA
 * gate sees it. Returns the failure count.
 */
export function verifyMaterialsMatchSpec(mats) {
  let bad = 0;
  const fail = (msg) => { console.error(`[materials] ${msg}`); bad += 1; };
  for (const [id, s] of Object.entries(SPEC)) {
    const m = mats[id];
    if (!m) { fail(`${id} declared in spec but never built`); continue; }
    const hex = `#${m.color.getHexString()}`;
    if (hex !== s.color) fail(`${id} colour drifted: code ${hex} vs spec ${s.color}`);
    if (Math.abs(m.metalness - s.metalness) > 1e-6) fail(`${id} metalness drifted: ${m.metalness} vs ${s.metalness}`);
    if (Math.abs(m.roughness - s.roughness) > 1e-6) fail(`${id} roughness drifted: ${m.roughness} vs ${s.roughness}`);
    // NEAR-BINARY METALNESS is a spec rule, and the mid-range is where "make it shinier"
    // hides. Glass and matte plastic are dielectrics; a metallic shortcut on either would be
    // a lie about the material used to paper over a lighting fault.
    if (m.metalness > 0.05 && m.metalness < 0.85) fail(`${id} metalness ${m.metalness} is in the forbidden mid-range`);
    // An EMISSIVE declared in the table but black in the material emits nothing, and
    // `emissiveIntensity > 0` does not catch it — three.js defaults that to 1 while the
    // colour defaults to black, so the obvious assertion passes over a dead indicator.
    if (s.emissive) {
      const eh = `#${m.emissive.getHexString()}`;
      if (eh !== s.emissive) fail(`${id} emissive drifted: code ${eh} vs spec ${s.emissive}`);
      if (m.emissive.getHex() === 0) fail(`${id} declares an emissive but renders black`);
      if (!(m.emissiveIntensity > 0)) fail(`${id} emissive intensity is ${m.emissiveIntensity}`);
    }
  }
  return bad;
}
