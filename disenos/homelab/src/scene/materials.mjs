// materials.mjs — flat blockout palette for rack-cabinet P4a BLOCKOUT pass.
// One canonical MeshStandardMaterial per spec material-id.
// No PBR tuning, no image textures — those are materials/surface passes.
//
// Note: scene.environmentIntensity does NOT exist in three r160.
// Per-material envMapIntensity is the live knob (brushed-stainless recipe).

import * as THREE from 'three';

function std(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

/**
 * Create and return the canonical blockout material map.
 * Matches design-spec.yaml material ids.
 * @returns {Object} material map
 */
export function makeMaterials() {
  // frame_black — painted-metal cabinet frame/posts/plinth
  const frame = std('#1b1b20', 0.0, 0.55);
  frame.name = 'frame_black';

  // panel_dark — side/rear panels (slightly lighter than frame)
  const panel = std('#222228', 0.0, 0.60);
  panel.name = 'panel_dark';

  // rails_metal — galvanized/zinc 19" mounting rails
  // envMapIntensity 1.9 per bare-metal brushed-stainless recipe
  const rail = std('#8a8f96', 0.9, 0.45, { envMapIntensity: 1.9 });
  rail.name = 'rails_metal';

  // glass_door — smoked tempered glass, transmissive via opacity
  // NO transmission: it stalls SwiftShader shader compile.
  // Use transparent + opacity instead.
  const glassDoor = std('#aeb8bf', 0.0, 0.05, {
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  glassDoor.name = 'glass_door';

  // lever_handle — black coated plastic lever
  const lever = std('#141418', 0.0, 0.40);
  lever.name = 'lever_handle';

  // caster — dark rubber/metal caster wheel
  const caster = std('#2a2a32', 0.2, 0.60);
  caster.name = 'caster';

  // plinth — base plinth cap (slightly darker than frame for visual separation)
  const plinth = std('#111116', 0.0, 0.65);
  plinth.name = 'plinth';

  return { frame, panel, rail, glassDoor, lever, caster, plinth };
}
