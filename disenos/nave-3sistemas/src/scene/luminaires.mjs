// Luminaire grid — 18 UFO highbay fixtures in a 6 × 3 grid at y = 7.0 m.
//
// Positions come from luminairePositions() — imported from the sim so the scene and
// simulation can NEVER disagree about how many fixtures exist or where they are.
//
// Instancing: two InstancedMesh objects (housing + lens) keep draw calls low.
// Pendant stems: one InstancedMesh for the 18 short mounting rods.
//
// Lighting: a small pool of NON-SHADOW PointLights (one per column, 6 total) serves
// the whole grid. 18 shadow-casting lights would blow the draw budget and stall SwiftShader.

import * as THREE from 'three';
import { luminairePositions } from '../sim/lighting.mjs';

// Geometry constants from design-spec.yaml
const HOUSING_R   = 0.175;  // diameter 0.35 m → radius 0.175 m
const HOUSING_H   = 0.22;   // body height
const LENS_R      = 0.155;  // slightly narrower lens disc
const LENS_H      = 0.025;
// Pendant rod: from roof truss underside y=7.85 to top of housing y=7.0+HOUSING_H/2=7.11
const PENDANT_H   = 7.85 - (7.0 + HOUSING_H / 2); // ≈ 0.64 m
const PENDANT_R   = 0.015;

// Pool-light column x-positions (same 6 as the column grid)
const POOL_XS = [-16.67, -10.0, -3.33, 3.33, 10.0, 16.67];
const POOL_INTENSITY_BASE = 2.5; // scaled by luminaireIntensity each frame

/**
 * Build the lighting system group.
 * @returns {{ group, housingMesh, lensMesh, poolLights }}
 *   - housingMesh / lensMesh: InstancedMesh objects (no per-frame update needed)
 *   - poolLights: Array of PointLight (intensity driven from model.scene.luminaireIntensity)
 */
export function buildLuminaires(mats) {
  const group = new THREE.Group();
  group.name = 'lighting_system';

  const luminaireGrid = new THREE.Group();
  luminaireGrid.name = 'luminaire_grid';
  luminaireGrid.position.set(0, 0, 0); // pivot [0,7,0] is achieved by the instance matrices

  const positions = luminairePositions(); // [{x, y, z, index}, ...]  y=7.0 for all

  const count = positions.length; // 18

  // --- housing InstancedMesh ---
  const housingGeo = new THREE.CylinderGeometry(HOUSING_R, HOUSING_R, HOUSING_H, 24);
  const housingMesh = new THREE.InstancedMesh(housingGeo, mats.luminaireHousing, count);
  housingMesh.name = 'luminaire_housings';

  // --- lens InstancedMesh (bottom face of housing) ---
  const lensGeo = new THREE.CylinderGeometry(LENS_R, LENS_R, LENS_H, 24);
  const lensMesh = new THREE.InstancedMesh(lensGeo, mats.luminaireLens, count);
  lensMesh.name = 'luminaire_lenses';

  // --- pendant stems InstancedMesh ---
  const pendantGeo = new THREE.CylinderGeometry(PENDANT_R, PENDANT_R, PENDANT_H, 8);
  const pendantMesh = new THREE.InstancedMesh(pendantGeo, mats.structuralSteel, count);
  pendantMesh.name = 'luminaire_pendants';

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const p = positions[i];

    // housing — centred at mount height
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    housingMesh.setMatrixAt(i, dummy.matrix);

    // lens — flush with the bottom face of housing
    dummy.position.set(p.x, p.y - HOUSING_H / 2 - LENS_H / 2, p.z);
    dummy.updateMatrix();
    lensMesh.setMatrixAt(i, dummy.matrix);

    // pendant — hangs from truss underside down to the top of the housing
    const pendantCY = p.y + HOUSING_H / 2 + PENDANT_H / 2;
    dummy.position.set(p.x, pendantCY, p.z);
    dummy.updateMatrix();
    pendantMesh.setMatrixAt(i, dummy.matrix);
  }
  housingMesh.instanceMatrix.needsUpdate = true;
  lensMesh.instanceMatrix.needsUpdate = true;
  pendantMesh.instanceMatrix.needsUpdate = true;

  luminaireGrid.add(housingMesh);
  luminaireGrid.add(lensMesh);

  // Pendant sub-group (spec: luminaire_pendants pivot [0,7.85,0])
  const pendantGroup = new THREE.Group();
  pendantGroup.name = 'luminaire_pendants';
  pendantGroup.add(pendantMesh);
  group.add(pendantGroup);

  group.add(luminaireGrid);

  // --- PointLight pool (6 lights, no shadows, capped intensity) ---
  // One light per column position, at y=6.8 (between luminaire base and slab).
  const poolLights = [];
  for (const px of POOL_XS) {
    const pl = new THREE.PointLight(0xfff8f0, POOL_INTENSITY_BASE, 20, 2); // decay=2
    pl.castShadow = false;
    pl.position.set(px, 6.4, 0);
    group.add(pl);
    poolLights.push(pl);
  }

  return { group, luminaireGrid, housingMesh, lensMesh, poolLights };
}
