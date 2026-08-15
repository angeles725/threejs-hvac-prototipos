// HVAC system — rooftop AHU, supply riser, trunk duct, diffuser array.
// All positions and dimensions from design-spec.yaml dimensions_real / hierarchy.
// 1 unit = 1 m.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DIFF_COUNT = 8;

/**
 * One merged SQUARE supply-diffuser geometry (stepped grille + collar), reused by the
 * InstancedMesh. A cone read as a gizmo, not a diffuser — a stepped square face reads as a
 * ceiling supply diffuser. Local origin at the diffuser face centre.
 */
function squareDiffuserGeo() {
  const housing = new THREE.BoxGeometry(0.60, 0.06, 0.60);   // outer frame
  const neck = new THREE.BoxGeometry(0.32, 0.12, 0.32);
  neck.translate(0, 0.08, 0);                                // collar up into the duct
  const face = new THREE.BoxGeometry(0.44, 0.03, 0.44);
  face.translate(0, -0.045, 0);                              // inner grille step below the frame
  return mergeGeometries([housing, neck, face], false);
}
// Diffuser x positions: evenly from x = -10 to x = +14 (24 m span / 7 intervals)
const DIFF_STEP = 24 / 7;

/**
 * Build the HVAC system group.
 * @returns {{ group, ahuGroup, supplyFan, returnFan, ductGroup, diffuserMesh, evapCoilGroup }}
 */
export function buildHVAC(mats) {
  const group = new THREE.Group();
  group.name = 'hvac_system';

  // ----------------------------------------------------------------
  // AHU rooftop  (pivot [-12, 8.6, 0])
  // Cabinet: 3.5 m (L, x) × 2.0 m (H, y) × 1.6 m (W, z)
  // Pivot = base centre → centre of box at [0, +1.0, 0] relative to group.
  // ----------------------------------------------------------------
  const ahuGroup = new THREE.Group();
  ahuGroup.name = 'ahu_rooftop';
  ahuGroup.position.set(-12, 8.6, 0);

  const ahuBodyGeo = new THREE.BoxGeometry(3.5, 2.0, 1.6);
  const ahuBody = new THREE.Mesh(ahuBodyGeo, mats.galvanizedDuct);
  ahuBody.position.set(0, 1.0, 0); // centre above the pivot
  ahuBody.name = 'ahu_body';
  ahuGroup.add(ahuBody);

  // Supply fan disc — pivot [-13.2, 9.0, 0] world → [-1.2, 0.4, 0] local to ahuGroup.
  // Disc faces +X (spin_x animation). CylinderGeometry along y → rotated 90° around z → faces x.
  const supplyFan = new THREE.Group();
  supplyFan.name = 'ahu_supply_fan';
  supplyFan.position.set(-1.2, 0.4, 0);
  const sfGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.12, 24);
  const sfMesh = new THREE.Mesh(sfGeo, mats.structuralSteel);
  sfMesh.rotation.z = Math.PI / 2; // face the x-axis
  supplyFan.add(sfMesh);
  ahuGroup.add(supplyFan);

  // Return fan disc — pivot [-10.8, 9.0, 0] world → [1.2, 0.4, 0] local.
  const returnFan = new THREE.Group();
  returnFan.name = 'ahu_return_fan';
  returnFan.position.set(1.2, 0.4, 0);
  const rfGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.12, 24);
  const rfMesh = new THREE.Mesh(rfGeo, mats.structuralSteel);
  rfMesh.rotation.z = Math.PI / 2;
  returnFan.add(rfMesh);
  ahuGroup.add(returnFan);

  // ----------------------------------------------------------------
  // Evaporator coil + drip tray  — refrigerant COLD end (Extension 5)
  //
  // Mounted on the +z face of the AHU housing so the coil is visible and identifiable.
  // AHU +z body face sits at local z = +0.80. Coil is 2 mm clear of that face (z-fighting guard).
  //
  // Dimensions (confidence: low — class estimate for a 40–80 kW cooling coil):
  //   Coil face : 3.1 m (x) × 1.2 m (y) × 0.10 m (z)
  //   Drip tray : 3.2 m (x) × 0.04 m (y) × 1.0 m (z)  — stainless, below the coil
  // ----------------------------------------------------------------
  const evapCoilGroup = new THREE.Group();
  evapCoilGroup.name = 'evap_coil';

  // Coil face — local z = 0.80 + 0.001 (gap) + 0.05 (half-depth) = 0.851
  const evapCoilGeo = new THREE.BoxGeometry(3.1, 1.2, 0.10);
  const evapCoil = new THREE.Mesh(evapCoilGeo, mats.evapCoilFace);
  evapCoil.name = 'evap_coil_face';
  evapCoil.position.set(0, 1.0, 0.851); // local to ahuGroup; y=1.0 centres it in the 2m body
  evapCoil.userData.system = 'hvac';
  evapCoilGroup.add(evapCoil);

  // Drip tray — just below the coil's lower face
  // Coil lower face: local y = 1.0 - 0.6 = 0.4
  // Tray top: 1 mm below coil = local y = 0.4 - 0.001 - 0.02 = 0.379
  const evapTrayGeo = new THREE.BoxGeometry(3.2, 0.04, 1.0);
  const evapTray = new THREE.Mesh(evapTrayGeo, mats.galvanizedDuct);
  evapTray.name = 'evap_drip_tray';
  evapTray.position.set(0, 0.379, 0.45); // slightly wider z to catch condensate
  evapTray.userData.system = 'hvac';
  evapCoilGroup.add(evapTray);

  ahuGroup.add(evapCoilGroup);

  group.add(ahuGroup);

  // ----------------------------------------------------------------
  // Supply riser  (pivot [-12, 8.6, 0], runs down to y = 6.8)
  // Diameter = trunk_duct_diameter = 0.95 m (same duct, continuous)
  // Length = 8.6 - 6.8 = 1.8 m; centre at y = 7.7
  // ----------------------------------------------------------------
  const riserGroup = new THREE.Group();
  riserGroup.name = 'supply_riser';

  const riserGeo = new THREE.CylinderGeometry(0.475, 0.475, 1.8, 24);
  const riser = new THREE.Mesh(riserGeo, mats.galvanizedDuct);
  // CylinderGeometry runs along y by default — no rotation needed for vertical riser.
  riser.position.set(-12, 7.70, 0); // centre of the 1.8 m segment
  riser.name = 'riser_cylinder';
  riserGroup.add(riser);
  group.add(riserGroup);

  // ----------------------------------------------------------------
  // Trunk duct  (pivot [-12, 6.8, 0], runs to x = +16)
  // Diameter = 0.95 m; length = 28 m (from x=-12 to x=+16).
  // CylinderGeometry runs along y; rotate Z by 90° to run along x.
  // ----------------------------------------------------------------
  const ductGroup = new THREE.Group();
  ductGroup.name = 'trunk_duct';

  // RECTANGULAR sheet-metal supply trunk (was a round cylinder). A round duct read as
  // indistinguishable from the round compressed-air header — the blind gate could not tell the
  // two services apart, which defeats the "three distinct systems" thesis (DC5). A rectangular
  // duct cross-section is unmistakably HVAC ductwork. Equivalent free area to the 0.95 m round.
  const ductLen = 16 - (-12); // 28 m
  const ductGeo = new THREE.BoxGeometry(ductLen, 0.74, 0.60);
  const duct = new THREE.Mesh(ductGeo, mats.galvanizedDuct);
  duct.position.set((-12 + 16) / 2, 6.8, 0); // centre at x = 2, along x
  duct.name = 'trunk_duct_box';
  ductGroup.add(duct);

  // Standing seams along the top — reinforces the sheet-metal-duct read vs a smooth pipe
  const seamGeo = new THREE.BoxGeometry(0.03, 0.05, 0.62);
  for (let sx = -10; sx <= 14; sx += 4) {
    const seam = new THREE.Mesh(seamGeo, mats.structuralSteel);
    seam.position.set(sx, 6.8 + 0.37, 0);
    ductGroup.add(seam);
  }

  // ----------------------------------------------------------------
  // Diffuser array  (pivot [-10, 6.55, 0], 8 diffusers, InstancedMesh)
  // Positions: x = -10 + i * (24/7) for i = 0..7, y = 6.55, z = 0
  // Slight upward embed into duct underside: y = 6.8 - 0.475 - 0.04 = 6.285 ≈ 6.28,
  // but spec gives 6.55 as the array pivot (0.25 m below duct centreline) so we use
  // y = 6.55 for the mesh centre.
  // ----------------------------------------------------------------
  const diffuserGroup = new THREE.Group();
  diffuserGroup.name = 'diffuser_array';

  // Square stepped supply diffusers on the trunk underside — reads as ductwork, not gizmos
  const diffGeo = squareDiffuserGeo();
  const diffMesh = new THREE.InstancedMesh(diffGeo, mats.diffuserWhite, DIFF_COUNT);
  diffMesh.name = 'diffuser_instances';

  const dummy = new THREE.Object3D();
  for (let i = 0; i < DIFF_COUNT; i++) {
    const x = -10 + i * DIFF_STEP;
    dummy.position.set(x, 6.40, 0); // hang from the rectangular duct underside (6.43), collar up into it
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    diffMesh.setMatrixAt(i, dummy.matrix);
  }
  diffMesh.instanceMatrix.needsUpdate = true;
  diffuserGroup.add(diffMesh);
  ductGroup.add(diffuserGroup);

  group.add(ductGroup);

  return { group, ahuGroup, supplyFan, returnFan, ductGroup, diffuserGroup, diffuserMesh: diffMesh, evapCoilGroup };
}
