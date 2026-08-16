// materials.mjs — PBR palette, transcribed 1:1 from design-spec.yaml §materials.
//
// The spec is the contract: color / metalness / roughness here must not drift from it.
// Metalness is NEAR-BINARY by spec rule — 0.0-0.05 dielectric, 0.85-1.0 bare metal.
// Nothing in between. If a surface reads flat, fix it in the LIGHTING pass, never by
// nudging metalness (see memory: downward-facing metal / vertical-subject lighting).

import * as THREE from 'three';

/** Body color variants — spec materials body_red / body_blue / body_black.
 *  Panduit markets the color range for A/B feed identification (P1-DATASHEETS §1). */
export const BODY_VARIANTS = {
  red:   { id: 'body_red',   color: '#a8231c', label: 'ROJO (FEED A)' },
  blue:  { id: 'body_blue',  color: '#1d4a8f', label: 'AZUL (FEED B)' },
  black: { id: 'body_black', color: '#1b1b20', label: 'NEGRO' },
};

/** LCD emissive states — spec material lcd_emissive.
 *  Off = unlit body color; on = backlit TFT. emissiveIntensity is tuned at the lighting pass. */
// P5a LIGHTING: the ON state now drives an emissiveMap (the procedural screen), so the
// glow has structure instead of being one flat lit rectangle. Intensity comes DOWN from
// 1.6 to 1.25 precisely because the map is not uniform — its lit pixels are near-white,
// and keeping 1.6 on top of them would clip a 40 mm screen to a white blob under ACES.
// The emissive TINT stays neutral-white; the map supplies the blue-green screen colour.
export const LCD_STATES = {
  off: { emissive: '#000000', intensity: 0.0 },
  on:  { emissive: '#ffffff', intensity: 1.25 },
};

/**
 * Build the full material set. One instance per id — meshes share these by reference so
 * a variant swap (feed A/B, LCD on/off) is a single .color / .emissive assignment.
 * @returns {Record<string, THREE.MeshStandardMaterial>}
 */
export function createMaterials() {
  const mk = (params) => new THREE.MeshStandardMaterial(params);

  const materials = {
    // --- receptacles ----------------------------------------------------------
    // Panduit differentiates EL2P outlets by COLOURED SOCKET HOUSING — aqua / grey /
    // white circuit banks — not by indicator lights. One uniform housing colour missed
    // a real identity cue of this product. Colours are named by the sources; the hex
    // values and the bank boundaries are inferred (see design-spec.yaml amendment).
    outletBankAqua: mk({
      name: 'outlet_bank_aqua',
      color: '#3fa8b4',
      metalness: 0.0,
      roughness: 0.45,
    }),
    outletBankGrey: mk({
      name: 'outlet_bank_grey',
      color: '#9a9a96',
      metalness: 0.0,
      roughness: 0.45,
    }),
    outletBankWhite: mk({
      name: 'outlet_bank_white',
      color: '#e4e4df',
      metalness: 0.0,
      roughness: 0.45,
    }),
    // The dark recess interior is what separates a real outlet from a painted decal.
    // Critical feature `outlet-column-42` lives or dies on this reading.
    outletCavity: mk({
      name: 'outlet_cavity',
      color: '#111114',
      metalness: 0.0,
      roughness: 0.7,
    }),

    // --- head module ----------------------------------------------------------
    lcd: mk({
      name: 'lcd_emissive',
      color: '#0a0c12',
      metalness: 0.0,
      roughness: 0.15,
      emissive: new THREE.Color(LCD_STATES.off.emissive),
      emissiveIntensity: LCD_STATES.off.intensity,
    }),
    portMetal: mk({
      name: 'port_metal',
      color: '#9aa0a8',
      metalness: 0.9,
      roughness: 0.4,
    }),
    labelPrint: mk({
      name: 'label_print',
      color: '#efefe9',
      metalness: 0.0,
      roughness: 0.6,
    }),
    // Silkscreen legend on the bezel rail. Transparent map so only the glyphs print and
    // the powder-coat reads through — which also means it works unchanged for the red,
    // blue and black bodies instead of needing one baked strip per colour.
    silkscreen: mk({
      name: 'silkscreen_print',
      color: '#eeeee8',
      metalness: 0.0,
      roughness: 0.6,
      transparent: true,
      depthWrite: false,   // decal over an opaque rail; avoids sorting artefacts
    }),


    // --- appendages -----------------------------------------------------------
    cordRubber: mk({
      name: 'cord_rubber',
      color: '#141416',
      metalness: 0.0,
      roughness: 0.85,
    }),
  };

  // envMapIntensity is the r160-correct IBL dial. scene.environmentIntensity does NOT
  // exist in r160 — setting it is a silent no-op (see memory).
  //
  // P5a MATERIALS tuning. Dielectrics stay at 1.0; the only lifts are physical:
  //   - port_metal is the one bare metal in the palette, so it is the only surface that
  //     should mirror the room. It also sits at the bottom of a 3.5 mm socket, where it
  //     sees a narrow cone of environment — the lift compensates the occlusion rather
  //     than faking shininess.
  //   - outlet_cavity is dropped BELOW 1.0 on purpose. It is a shadowed throat; letting
  //     it pick up full room light is what would flatten the recess the structural pass
  //     just built. This is the honest lever for "reads dark" — not a blacker albedo.
  for (const m of Object.values(materials)) m.envMapIntensity = 1.0;
  materials.portMetal.envMapIntensity = 1.35;
  materials.outletCavity.envMapIntensity = 0.35;

  return materials;
}

/**
 * Every live material, keyed by its SPEC id (material.name). The traceability check
 * walks this against design-spec.yaml, so a material that drifts from the contract —
 * or exists only in code — is caught instead of quietly rendering.
 * Body variants are built per strip, so they are constructed here on demand.
 */
export function materialsBySpecId(materials) {
  const out = {};
  for (const m of Object.values(materials)) out[m.name] = m;
  for (const key of Object.keys(BODY_VARIANTS)) {
    const bm = createBodyMaterial(key);
    out[bm.name] = bm;
  }
  return out;
}

/**
 * One body material PER STRIP — the A/B pair must show red and blue AT THE SAME TIME,
 * so a single shared material with a swappable color cannot express it (critical
 * feature ab-feed-red-blue-pair).
 * @param {'red'|'blue'|'black'} variant
 */
export function createBodyMaterial(variant) {
  const v = BODY_VARIANTS[variant];
  if (!v) throw new Error(`unknown body variant: ${variant}`);
  const m = new THREE.MeshStandardMaterial({
    name: v.id,
    color: v.color,
    metalness: 0.0,   // powder-coat is a dielectric — never raise this to fix a flat read
    roughness: 0.55,
  });
  m.envMapIntensity = 1.0;
  return m;
}

/** Toggle the head LCD backlight. @param {boolean} on */
export function setLcdState(materials, on) {
  const s = on ? LCD_STATES.on : LCD_STATES.off;
  materials.lcd.emissive.set(s.emissive);
  materials.lcd.emissiveIntensity = s.intensity;
  return s;
}
