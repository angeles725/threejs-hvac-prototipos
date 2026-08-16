// Rooftop air-cooled condenser + refrigerant lines — Extension 5.
//
// Dimensions (confidence: low — class estimate for a 50–60 kW condenser):
//   Body : 2.2 m (x) × 1.3 m (y) × 1.1 m (z)
//   Fans : two axial fans, 0.63 m diameter, facing UP (+y)
//
// World placement: x = -5, base y = 8.5, z = 1.5
//   → body centre at (-5, 9.15, 1.5)
//
// The AHU sits at (-12, 8.6, 0). Both units are on the same roof, visible
// side-by-side in the 'exterior' camera preset (roof ON, from +z above).
//
// Refrigerant lines:
//   Suction  (cold, insulated): radius 0.06 m, material: refrigerantSuction
//   Liquid   (warm, bare):      radius 0.03 m, material: refrigerantLiquid
//   Both attach at the AHU +x face (x = -10.25) and the condenser -x face (x = -6.1),
//   at world y = 9.15 (mid-height of the condenser body), z interpolated linearly.
//   Using THREE.js quaternion alignment avoids gimbal issues.

import * as THREE from 'three';

const COND_X    = -5;
const COND_Y    = 8.5;   // base (on roof)
const COND_Z    = 1.5;
const COND_W    = 2.2;   // x
const COND_H    = 1.3;   // y
const COND_D    = 1.1;   // z
const FAN_R     = 0.315; // fan blade radius (two fit in COND_W with margin)
const FAN_SEP   = 0.55;  // ±x offset from condenser centre

// Pipe connection heights (world y)
const PIPE_Y    = COND_Y + COND_H * 0.5; // mid-body height ≈ 9.15

// AHU right (+x) face — body is 3.5 m wide centred at x=-12 → face at x=-10.25
// The pipe exits the AHU side at z=0 (AHU is centred on z=0)
const AHU_CONN  = new THREE.Vector3(-10.25, PIPE_Y, 0);

// Condenser left (−x) face — body centred at COND_X, half-width COND_W/2
const COND_CONN = new THREE.Vector3(COND_X - COND_W / 2, PIPE_Y, COND_Z);

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Create one CylinderGeometry pipe aligned between two world-space points. */
function pipeMesh(start, end, radius, mat) {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 12, 1, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).lerp(end, 0.5);
  // CylinderGeometry default axis is +y; rotate to align with dir
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  return mesh;
}

/** Create a simple fan disc (blade group). Returned group spins around its local +y axis.
 *  The group is placed at world coords; spin animation drives rotation.y in main.js.
 */
function fanPivot(worldX, worldY, worldZ, mat) {
  const g = new THREE.Group();
  g.name = `cond_fan_${worldX.toFixed(1)}`;

  // Blade disc (represents spinning blades)
  const bladeGeo = new THREE.CylinderGeometry(FAN_R, FAN_R, 0.04, 20);
  const blade = new THREE.Mesh(bladeGeo, mat);
  blade.name = 'cond_fan_blade';
  g.add(blade);

  // Hub
  const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10);
  const hub = new THREE.Mesh(hubGeo, mat);
  hub.name = 'cond_fan_hub';
  g.add(hub);

  // Ring guard (just outside blade radius, thin tube)
  const ringGeo = new THREE.TorusGeometry(FAN_R + 0.02, 0.02, 6, 24);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.rotation.x = Math.PI / 2; // face up
  ring.name = 'cond_fan_ring';
  g.add(ring);

  g.position.set(worldX, worldY, worldZ);
  return g;
}

// --------------------------------------------------------------------------
// Main builder
// --------------------------------------------------------------------------

/**
 * Build the rooftop condenser + refrigerant lines.
 *
 * @returns {{
 *   group: THREE.Group,
 *   condenserFanPivots: THREE.Group[],
 * }}
 */
export function buildCondenser(mats) {
  const group = new THREE.Group();
  group.name = 'condenser_system';

  // --- Condenser body --------------------------------------------------------
  const bodyGeo = new THREE.BoxGeometry(COND_W, COND_H, COND_D);
  const body = new THREE.Mesh(bodyGeo, mats.machineEnamel);
  body.name = 'cond_body';
  body.position.set(COND_X, COND_Y + COND_H / 2, COND_Z);
  body.userData.system = 'hvac';
  group.add(body);

  // Coil grille faces on the long sides (+z and -z) — represented as flat panels
  // slightly proud of the body (2 mm offset) with a visually distinct material.
  const grilleW = COND_W - 0.1;
  const grilleH = COND_H - 0.08;
  const grilleMat = mats.evapCoilFace; // same coil-colour helps identify it as a heat exchanger

  for (const side of [-1, 1]) {
    const grillGeo = new THREE.BoxGeometry(grilleW, grilleH, 0.04);
    const grill = new THREE.Mesh(grillGeo, grilleMat);
    grill.name = `cond_coil_grill_z${side > 0 ? 'plus' : 'minus'}`;
    grill.position.set(
      COND_X,
      COND_Y + COND_H / 2,
      COND_Z + side * (COND_D / 2 + 0.002), // 2 mm outside the body face
    );
    grill.userData.system = 'hvac';
    group.add(grill);
  }

  // --- Condenser fans (top of unit, spinning during operation) ----------------
  const fanY = COND_Y + COND_H + 0.02; // just above body top face (2 mm clear)
  const fanMat = mats.structuralSteel;
  const condenserFanPivots = [];

  for (const dx of [-FAN_SEP, +FAN_SEP]) {
    const fp = fanPivot(COND_X + dx, fanY, COND_Z, fanMat);
    fp.userData.system = 'hvac';
    group.add(fp);
    condenserFanPivots.push(fp);
  }

  // --- Refrigerant lines -------------------------------------------------------
  // Suction line: insulated, larger radius — runs from AHU to condenser
  const suctionOffset = new THREE.Vector3(0, 0.06, 0); // offset above liquid line
  const suctionStart  = AHU_CONN.clone().add(suctionOffset);
  const suctionEnd    = COND_CONN.clone().add(suctionOffset);

  const suctionPipe = pipeMesh(suctionStart, suctionEnd, 0.06, mats.refrigerantSuction);
  suctionPipe.name = 'refrigerant_suction_line';
  suctionPipe.userData.system = 'hvac';
  group.add(suctionPipe);

  // Liquid line: bare copper, smaller radius — parallel to suction, 0.13 m below
  const liquidOffset = new THREE.Vector3(0, -0.07, 0);
  const liquidStart  = AHU_CONN.clone().add(liquidOffset);
  const liquidEnd    = COND_CONN.clone().add(liquidOffset);

  const liquidPipe = pipeMesh(liquidStart, liquidEnd, 0.03, mats.refrigerantLiquid);
  liquidPipe.name = 'refrigerant_liquid_line';
  liquidPipe.userData.system = 'hvac';
  group.add(liquidPipe);

  // End-cap stubs at both attachment points (AHU side)
  // These make it visually clear that the pipes TERMINATE at the AHU wall, not float.
  for (const [offset, radius, mat] of [
    [suctionOffset, 0.06, mats.refrigerantSuction],
    [liquidOffset,  0.03, mats.refrigerantLiquid],
  ]) {
    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.01, radius + 0.01, 0.06, 10),
      mat,
    );
    stub.rotation.z = Math.PI / 2; // align with x-axis (wall penetration direction)
    stub.position.copy(AHU_CONN).add(offset);
    stub.position.x += 0.03; // push stub slightly into the wall
    stub.name = `stub_ahu_${mat === mats.refrigerantSuction ? 'suction' : 'liquid'}`;
    stub.userData.system = 'hvac';
    group.add(stub);
  }

  // End-cap stubs at condenser side
  for (const [offset, radius, mat] of [
    [suctionOffset, 0.06, mats.refrigerantSuction],
    [liquidOffset,  0.03, mats.refrigerantLiquid],
  ]) {
    const stub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.01, radius + 0.01, 0.06, 10),
      mat,
    );
    stub.rotation.z = Math.PI / 2;
    stub.position.copy(COND_CONN).add(offset);
    stub.position.x -= 0.03; // push into condenser body
    stub.name = `stub_cond_${mat === mats.refrigerantSuction ? 'suction' : 'liquid'}`;
    stub.userData.system = 'hvac';
    group.add(stub);
  }

  return { group, condenserFanPivots };
}
