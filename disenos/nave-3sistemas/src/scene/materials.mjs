// Scene materials — one canonical instance per material-id from design-spec.yaml.
// Only this module creates materials. All scene builders consume this map.
//
// Bare-metal materials use envMapIntensity 1.9 (the brushed-stainless recipe) plus a
// HemisphereLight + frontal DirectionalLight in the house rig. scene.environmentIntensity
// does NOT exist in r160 — use material.envMapIntensity only.

import * as THREE from 'three';

function std(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

function phys(color, metalness, roughness, extra = {}) {
  // clearcoat is safe in headless SwiftShader. transmission is NOT (stalls shader compile).
  return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, ...extra });
}

/**
 * Create and return the canonical material map.
 * The luminaireLens entry exposes a mutable emissiveIntensity so main.js can bind it to the
 * dim fraction without touching material creation again.
 */
export function makeMaterials() {
  // --- spec material-ids -----------------------------------------------------------------
  const concreteFloor = std('#5a5e63', 0.0, 0.92);

  // Painted metal: clearcoat needs MeshPhysicalMaterial
  const wallCladding = phys('#8e959c', 0.0, 0.62, {
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });

  const structuralSteel = std('#4c5157', 0.0, 0.70);

  // Bare metal: envMapIntensity 1.9, not scene.environmentIntensity
  const galvanizedDuct = std('#b9bec4', 0.9, 0.38, { envMapIntensity: 1.9 });

  const machineEnamel = phys('#54585c', 0.0, 0.45, {
    clearcoat: 0.90,
    clearcoatRoughness: 0.12,
  });

  const receiverBlue = phys('#2d4a63', 0.0, 0.42, {
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });

  const luminaireHousing = std('#c4c8cc', 0.9, 0.42, { envMapIntensity: 1.9 });

  // Lens: emissiveIntensity is driven by the dim fraction from model.scene.luminaireIntensity.
  // The emissive colour matches the diffuse so at full output the lens reads white.
  const luminaireLens = std('#f2f4f0', 0.0, 0.28, {
    emissive: new THREE.Color('#f2f4f0'),
    emissiveIntensity: 1.0, // overwritten each frame
  });

  const stainlessPipe = std('#d2d6d8', 0.9, 0.30, { envMapIntensity: 1.9 });

  // --- blockout utility materials (no spec id, not in the design palette) ---------------
  const humanFigure = std('#c8a87a', 0.0, 0.85);   // warm neutral — readable as person
  const diffuserWhite = std('#d8dde2', 0.0, 0.50);  // plain white ceiling diffuser disc
  const louverGray = std('#6a7078', 0.2, 0.70);     // exhaust louver grille

  // Refrigerant circuit materials (Extension 5)
  // Suction line: closed-cell foam insulation — matte light blue-grey, clearly thicker
  const refrigerantSuction = std('#9bb8c2', 0.0, 0.88);
  // Liquid line: bare copper tube
  const refrigerantLiquid = std('#b87333', 0.9, 0.32, { envMapIntensity: 1.9 });
  // Evaporator coil face: aluminium-fin coil colour
  const evapCoilFace = std('#7ba7c2', 0.5, 0.55);

  return {
    // spec ids
    concreteFloor,
    wallCladding,
    structuralSteel,
    galvanizedDuct,
    machineEnamel,
    receiverBlue,
    luminaireHousing,
    luminaireLens,
    stainlessPipe,
    // blockout utility
    humanFigure,
    diffuserWhite,
    louverGray,
    // refrigerant circuit (Extension 5)
    refrigerantSuction,
    refrigerantLiquid,
    evapCoilFace,
  };
}
