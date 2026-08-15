// Bay structure — floor slab, column grid, roof trusses, wall cladding.
// 40 m x 20 m x 8 m industrial bay centred on the world origin.
// 1 unit = 1 m throughout.
//
// Column grid: 8 m bay spacing in X (6 lines: x = -20, -12, -4, 4, 12, 20),
// perimeter lines only in Z (z = -10, +10) => 12 columns total.
//
// Trusses are ALWAYS visible — they are structural framing, not a weather
// envelope. Only the roof DECK is layer-toggled so a viewer with roof OFF
// can still see the truss lines spanning above the luminaires.

import * as THREE from 'three';

// X-axis column lines at 8 m spacing covering the 40 m span
const COL_XS = [-20, -12, -4, 4, 12, 20];
// Z-axis perimeter lines only
const COL_ZS = [-10, 10];

/**
 * Build the bay structure group.
 * @returns {{ group, floorGroup, columnGroup, trussGroup, roofGroup, wallGroup }}
 *   trussGroup — always visible structural framing (never layer-toggled).
 *   roofGroup  — roof DECK only; layer-toggled by the 'roof' key.
 */
export function buildBay(mats) {
  const group = new THREE.Group();
  group.name = 'bay_structure';

  // ------------------------------------------------------------------
  // Floor slab  (pivot [0,0,0])
  // ------------------------------------------------------------------
  const floorGroup = new THREE.Group();
  floorGroup.name = 'floor_slab';

  const slabGeo = new THREE.BoxGeometry(40, 0.20, 20);
  const slab = new THREE.Mesh(slabGeo, mats.concreteFloor);
  // Center of the 0.20 m slab sits at y = -0.10 so its top face is flush with y = 0.
  slab.position.set(0, -0.10, 0);
  slab.name = 'slab';
  floorGroup.add(slab);
  group.add(floorGroup);

  // ------------------------------------------------------------------
  // Column grid  (pivot [0,0,0])
  //
  // I-section profile (view from +y, section in the xz plane):
  //   web  : 60 mm thick (x), 180 mm clear depth (z)
  //   flanges: 240 mm wide (x), 58 mm thick (z)
  //   total depth: 0.18 + 2 × 0.058 = 0.296 m ≈ 0.30 m
  //   gap between web end-face and flange inner face: 2 mm (avoids coplanar z-fighting)
  // Three InstancedMeshes × 12 instances = one draw-call equivalent per piece.
  // ------------------------------------------------------------------
  const columnGroup = new THREE.Group();
  columnGroup.name = 'column_grid';

  const colCount = COL_XS.length * COL_ZS.length; // 12

  // Web plate (thin in x, full 8 m height, 180 mm deep in z)
  const colWebGeo = new THREE.BoxGeometry(0.06, 8.0, 0.180);
  const webMesh = new THREE.InstancedMesh(colWebGeo, mats.structuralSteel, colCount);
  webMesh.name = 'column_webs';

  // Flanges (wide in x, full 8 m height, 58 mm thick in z)
  // Flange centre at ±0.121 m from column centre:
  //   web ±z face at ±0.090, gap 0.002, flange inner face at ±0.092,
  //   flange centre at ±(0.092 + 0.029) = ±0.121
  const colFlgGeo = new THREE.BoxGeometry(0.24, 8.0, 0.058);
  const flgPlusMesh = new THREE.InstancedMesh(colFlgGeo, mats.structuralSteel, colCount);
  flgPlusMesh.name = 'column_flanges_plus';
  const flgMinusMesh = new THREE.InstancedMesh(colFlgGeo, mats.structuralSteel, colCount);
  flgMinusMesh.name = 'column_flanges_minus';

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (const x of COL_XS) {
    for (const z of COL_ZS) {
      // Web — centred at column position
      dummy.position.set(x, 4.0, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      webMesh.setMatrixAt(idx, dummy.matrix);

      // Flange at +z side
      dummy.position.set(x, 4.0, z + 0.121);
      dummy.updateMatrix();
      flgPlusMesh.setMatrixAt(idx, dummy.matrix);

      // Flange at −z side
      dummy.position.set(x, 4.0, z - 0.121);
      dummy.updateMatrix();
      flgMinusMesh.setMatrixAt(idx, dummy.matrix);

      idx++;
    }
  }
  webMesh.instanceMatrix.needsUpdate = true;
  flgPlusMesh.instanceMatrix.needsUpdate = true;
  flgMinusMesh.instanceMatrix.needsUpdate = true;

  columnGroup.add(webMesh);
  columnGroup.add(flgPlusMesh);
  columnGroup.add(flgMinusMesh);
  group.add(columnGroup);

  // ------------------------------------------------------------------
  // Roof trusses — ALWAYS VISIBLE structural frame (not layer-toggled).
  // Separated from the deck so the truss silhouette remains visible when
  // the 'roof' layer is off (luminaire-grid, bay-structure shots).
  // One truss per x-line, spanning z = -10 to +10 (20 m).
  // Pivot at y = 8.0 (wall-plate level).
  // ------------------------------------------------------------------
  const trussGroup = new THREE.Group();
  trussGroup.name = 'roof_trusses';
  trussGroup.position.set(0, 8.0, 0);

  const TRUSS_HEIGHT = 1.20; // m between chord centroids

  const botChordGeo = new THREE.BoxGeometry(0.25, 0.35, 20.3); // bottom chord beam
  const topChordGeo = new THREE.BoxGeometry(0.25, 0.25, 20.3); // top chord (smaller)
  // Web verticals (simplified N-truss): 5 web members per truss at z = -8, -4, 0, 4, 8
  const webGeo = new THREE.BoxGeometry(0.12, 1.15, 0.12);

  for (const x of COL_XS) {
    // Bottom chord at the truss level (y=0 relative to trussGroup = world y=8)
    const bc = new THREE.Mesh(botChordGeo, mats.structuralSteel);
    bc.position.set(x, 0.175, 0); // half-height above the pivot line
    trussGroup.add(bc);

    // Top chord
    const tc = new THREE.Mesh(topChordGeo, mats.structuralSteel);
    tc.position.set(x, TRUSS_HEIGHT + 0.125, 0);
    trussGroup.add(tc);

    // Web members
    for (const wz of [-8, -4, 0, 4, 8]) {
      const web = new THREE.Mesh(webGeo, mats.structuralSteel);
      web.position.set(x, TRUSS_HEIGHT / 2 + 0.175, wz);
      trussGroup.add(web);
    }
  }

  // Purlins: secondary beams spanning x, sitting on the top chord (also structural — always on)
  const purlinGeo = new THREE.BoxGeometry(40.3, 0.20, 0.15);
  for (const pz of [-8, -4, 0, 4, 8]) {
    const purlin = new THREE.Mesh(purlinGeo, mats.structuralSteel);
    purlin.position.set(0, TRUSS_HEIGHT + 0.25, pz);
    trussGroup.add(purlin);
  }

  group.add(trussGroup);

  // ------------------------------------------------------------------
  // Roof deck — weather envelope; layer-toggled by the 'roof' key.
  // Only the cladding panel lives here. Trusses stay visible above.
  // ------------------------------------------------------------------
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roof_deck_layer';
  roofGroup.position.set(0, 8.0, 0); // same pivot as trussGroup

  const deckGeo = new THREE.BoxGeometry(40.15, 0.12, 20.15);
  const deck = new THREE.Mesh(deckGeo, mats.wallCladding);
  deck.position.set(0, TRUSS_HEIGHT + 0.43, 0);
  deck.name = 'roof_deck';
  roofGroup.add(deck);

  group.add(roofGroup);

  // ------------------------------------------------------------------
  // Wall cladding  (pivot [0,0,0], layer-toggled)
  // Four perimeter wall panels — separate meshes so individual faces can
  // be toggled independently in a later pass. Separated 2 mm outward from
  // the theoretical column face to avoid z-fighting at corners.
  // ------------------------------------------------------------------
  const wallGroup = new THREE.Group();
  wallGroup.name = 'wall_cladding';

  // Side walls (run along x, at z = ±10)
  const sideWallGeo = new THREE.BoxGeometry(40.30, 8.0, 0.15);
  const wallPZ = new THREE.Mesh(sideWallGeo, mats.wallCladding);
  wallPZ.position.set(0, 4.0, 10.08);   // +Z exterior face
  wallPZ.name = 'wall_pz';
  wallGroup.add(wallPZ);

  const wallNZ = new THREE.Mesh(sideWallGeo, mats.wallCladding);
  wallNZ.position.set(0, 4.0, -10.08);  // -Z exterior face
  wallNZ.name = 'wall_nz';
  wallGroup.add(wallNZ);

  // End walls (x = ±20). BOTH are built.
  //
  // An earlier revision DELETED the +X end wall so the hero camera could see the compressor-room
  // louvers through the gap. That traded one problem for a worse one: the thermal model computes
  // Q_envelope over the full 1760 m2 envelope (four walls + roof + slab, design-spec.yaml
  // bay_envelope_area_m2), so a bay drawn with three walls SHOWS one thing while the dashboard
  // COMPUTES another — the exact two-surfaces-contradict defect this design exists to avoid.
  // And a deleted wall is not a hidden wall: the roof is behind a layer toggle, so a viewer knows
  // it exists; a wall removed from every layer simply is not there, and the `bay-envelope` shot
  // that must prove "reads as a closed industrial building" would show a hole.
  //
  // The louvers are framed by the dedicated `compressor-room` view instead, which is what a
  // per-feature camera preset is FOR. Interior visibility stays available through the `walls`
  // layer toggle, which is reversible and self-documenting.
  const endWallGeo = new THREE.BoxGeometry(0.15, 8.0, 20.30);

  const wallNX = new THREE.Mesh(endWallGeo, mats.wallCladding);
  wallNX.position.set(-20.08, 4.0, 0);  // -X exterior face
  wallNX.name = 'wall_nx';
  wallGroup.add(wallNX);

  const wallPX = new THREE.Mesh(endWallGeo, mats.wallCladding);
  wallPX.position.set(20.08, 4.0, 0);   // +X exterior face
  wallPX.name = 'wall_px';
  wallGroup.add(wallPX);

  group.add(wallGroup);

  return { group, floorGroup, columnGroup, trussGroup, roofGroup, wallGroup };
}
