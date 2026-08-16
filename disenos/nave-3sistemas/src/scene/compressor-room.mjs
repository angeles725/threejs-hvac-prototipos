// Compressed-air system — compressor room enclosure, equipment, piping.
// All positions from design-spec.yaml hierarchy pivots. 1 unit = 1 m.
//
// Room footprint: x [9, 19], z [-9, -3], y [0, 4]
// Exterior +X wall (x=19) carries two 1.2 m louvers + two exhaust fans at z [-7.2, -4.8].

import * as THREE from 'three';

// ---- helpers ----------------------------------------------------------------

/**
 * Build a cylinder mesh connecting world points A and B.
 * CylinderGeometry runs along y by default; we rotate it to face the direction A→B.
 */
function pipeBetween(A, B, radius, mat) {
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  if (len < 0.001) return null;

  const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
  const mesh = new THREE.Mesh(geo, mat);

  // Centre at midpoint
  mesh.position.copy(A).lerp(B, 0.5);

  // Rotate from (0,1,0) to the direction vector
  const up = new THREE.Vector3(0, 1, 0);
  const normDir = dir.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(up, normDir);
  mesh.quaternion.copy(q);

  return mesh;
}

/**
 * Add rotary-screw canopy IDENTITY to a package group: a base skid frame and a stack of
 * ventilation louvers on the +X (key-lit) face — the two cues that separate a screw-compressor
 * canopy from a plain box. W = cabinet width (x), D = depth (z). Local origin at the slab.
 */
function addCanopyDetails(grp, W, D, mats) {
  // Base skid — a dark channel frame proud of the cabinet footprint, so the package sits ON a skid
  const skidGeo = new THREE.BoxGeometry(W + 0.12, 0.18, D + 0.12);
  const skid = new THREE.Mesh(skidGeo, mats.structuralSteel);
  skid.position.set(0, 0.09, 0);
  skid.name = 'skid_base';
  grp.add(skid);

  // Ventilation louvers on the +X face — the signature screw-compressor canopy look.
  // A stack of tilted slats reads unmistakably as a ventilated enclosure, not a crate.
  const slatGeo = new THREE.BoxGeometry(0.06, 0.05, D * 0.68);
  const xFace = W / 2 + 0.005;
  for (let i = 0; i < 8; i++) {
    const slat = new THREE.Mesh(slatGeo, mats.louverGray);
    slat.position.set(xFace, 0.55 + i * 0.12, 0);
    slat.rotation.z = -0.42; // tilt so the slats read as angled intake louvers
    slat.name = `canopy_louver_${i}`;
    grp.add(slat);
  }
}

// ---- main builder -----------------------------------------------------------

/**
 * Build the compressed-air system group.
 * @returns {{
 *   group,
 *   enclosureGroup,   // wall panels — toggled by 'enclosure' layer
 *   equipmentGroup,   // compressors, receiver, dryer — always visible
 *   pipingGroup,      // header + distribution main — always visible
 *   exhaustFanGroup,  // two fan discs — animated by exhaust fraction
 *   leadFanGroup,     // cooling fan on lead compressor — animated
 *   lagFanGroup,      // cooling fan on lag compressor — animated
 * }}
 */
export function buildCompressorRoom(mats) {
  const group = new THREE.Group();
  group.name = 'compressed_air_system';

  // ==========================================================================
  // ENCLOSURE WALLS  (pivot [14, 0, -6])
  // Room: x [9,19], z [-9,-3], y [0,4]
  // ==========================================================================
  const enclosureGroup = new THREE.Group();
  enclosureGroup.name = 'compressor_room_enclosure';

  // Shared wall thickness
  const T = 0.15;

  // Left wall  x=9 (inner face, thickness into room)
  const leftWallGeo = new THREE.BoxGeometry(T, 4.0, 6.0 + T * 2);
  const leftWall = new THREE.Mesh(leftWallGeo, mats.wallCladding);
  leftWall.position.set(9.0 - T / 2, 2.0, -6.0);
  leftWall.name = 'enc_wall_left';
  enclosureGroup.add(leftWall);

  // Right wall x=19 (exterior face — carries louvers and fans)
  const rightWallGeo = new THREE.BoxGeometry(T, 4.0, 6.0 + T * 2);
  const rightWall = new THREE.Mesh(rightWallGeo, mats.wallCladding);
  rightWall.position.set(19.0 + T / 2, 2.0, -6.0);
  rightWall.name = 'enc_wall_right';
  enclosureGroup.add(rightWall);

  // Front wall z=-3 (interior of bay — the "entrance" side, faces +Z into bay).
  // Split around a 2.0 m DOORWAY centred at x=14 so the enclosure unmistakably reads as a room
  // you enter, not a sealed box — this is what made the walls-ON vs walls-OFF pair legible.
  const DOOR_W = 2.0, DOOR_H = 2.6;
  const frontZ = -3.0 + T / 2;
  // Left jamb: x [9,13] → width 4, centre 11
  const fwLeft = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, T), mats.wallCladding);
  fwLeft.position.set(11.0, 2.0, frontZ);
  fwLeft.name = 'enc_wall_front_l';
  enclosureGroup.add(fwLeft);
  // Right jamb: x [15,19] → width 4, centre 17
  const fwRight = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, T), mats.wallCladding);
  fwRight.position.set(17.0, 2.0, frontZ);
  fwRight.name = 'enc_wall_front_r';
  enclosureGroup.add(fwRight);
  // Lintel over the doorway: x [13,15], y [DOOR_H, 4]
  const fwLintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, 4.0 - DOOR_H, T), mats.wallCladding);
  fwLintel.position.set(14.0, DOOR_H + (4.0 - DOOR_H) / 2, frontZ);
  fwLintel.name = 'enc_wall_front_lintel';
  enclosureGroup.add(fwLintel);
  // Door reveal frame — a proud jamb+head border so the opening reads as a real doorway
  const jambGeo = new THREE.BoxGeometry(0.08, DOOR_H, T + 0.06);
  for (const jx of [13.0, 15.0]) {
    const jamb = new THREE.Mesh(jambGeo, mats.structuralSteel);
    jamb.position.set(jx, DOOR_H / 2, frontZ);
    enclosureGroup.add(jamb);
  }
  const headGeo = new THREE.BoxGeometry(DOOR_W + 0.16, 0.08, T + 0.06);
  const head = new THREE.Mesh(headGeo, mats.structuralSteel);
  head.position.set(14.0, DOOR_H, frontZ);
  enclosureGroup.add(head);

  // Back wall z=-9 (near bay -Z perimeter wall)
  const backWallGeo = new THREE.BoxGeometry(10.0, 4.0, T);
  const backWall = new THREE.Mesh(backWallGeo, mats.wallCladding);
  backWall.position.set(14.0, 2.0, -9.0 - T / 2);
  backWall.name = 'enc_wall_back';
  enclosureGroup.add(backWall);

  // Ceiling y=4
  const ceilGeo = new THREE.BoxGeometry(10.0 + T * 2, T, 6.0 + T * 2);
  const ceil = new THREE.Mesh(ceilGeo, mats.wallCladding);
  ceil.position.set(14.0, 4.0 + T / 2, -6.0);
  ceil.name = 'enc_ceiling';
  enclosureGroup.add(ceil);

  // ---- Motorised damper blades (two exhaust louvers, 6 blades each) --------
  // Spec: animation = "blade angle 0..90 deg, angle = 90 × exhaust_fraction"
  //       blade_pivot_axis: z
  //       shut_angle_deg: 0  → blades flat (BlockGeometry face in yz-plane → blocks x-flow)
  //       open_angle_deg: 90 → blades edge-on (visible gap → aperture clear)
  //
  // Blade geometry: BoxGeometry(BLADE_T, BLADE_H, LOUVER_W)
  //   x = thin dimension — 0.02 m thick when shut
  //   y = blade height   — 0.195 m (1.2 m / 6, minus 5 mm inter-blade gap)
  //   z = blade length   — 1.2 m spanning the full louver width
  //
  // Pivot: placed 13 mm outside the wall exterior face (x=19.15) to avoid z-fighting.
  // rotation.z = (PI/2) × exhaustFraction drives shut→open continuously.
  //
  // Belongs to enclosureGroup → toggled by the 'enclosure' layer.

  const BLADE_COUNT  = 6;
  const LOUVER_H     = 1.2;   // m — full louver aperture height
  const LOUVER_W     = 1.2;   // m — full louver aperture width (z span)
  const BLADE_H      = LOUVER_H / BLADE_COUNT; // 0.2 m per blade
  const BLADE_T      = 0.02;  // m — blade thickness (thin dimension when shut)
  const BLADE_GAP    = 0.005; // m — small gap between adjacent blades
  const LOUVER_Y_BOT = 2.4;   // m — bottom of aperture
  // Place pivot 13 mm beyond wall exterior face (x = 19.0 + T = 19.15) for clearance
  const BLADE_PIVOT_X = 19.0 + T + 0.013;

  // Shared blade geometry (all 12 blades are identical)
  const bladeGeo = new THREE.BoxGeometry(BLADE_T, BLADE_H - BLADE_GAP, LOUVER_W);

  // Thin frame border around each louver opening — visual context only
  const LOUVER_ZS = [-6.6, -5.4]; // world z-centres of the two louver openings
  const frmT  = 0.03;  // frame bar thickness
  const frmGeo_hz = new THREE.BoxGeometry(frmT, frmT, LOUVER_W + frmT * 2);
  const frmGeo_vt = new THREE.BoxGeometry(frmT, LOUVER_H, frmT);

  const bladePivots = []; // exported so main.js can drive rotation.z

  for (let li = 0; li < 2; li++) {
    const lz = LOUVER_ZS[li];

    // Frame: top and bottom horizontal bars
    for (const dy of [LOUVER_Y_BOT - frmT / 2, LOUVER_Y_BOT + LOUVER_H + frmT / 2]) {
      const bar = new THREE.Mesh(frmGeo_hz, mats.louverGray);
      bar.position.set(BLADE_PIVOT_X, dy, lz);
      enclosureGroup.add(bar);
    }
    // Frame: left and right vertical bars
    for (const dz of [lz - LOUVER_W / 2 - frmT / 2, lz + LOUVER_W / 2 + frmT / 2]) {
      const bar = new THREE.Mesh(frmGeo_vt, mats.louverGray);
      bar.position.set(BLADE_PIVOT_X, LOUVER_Y_BOT + LOUVER_H / 2, dz);
      enclosureGroup.add(bar);
    }

    // Six blade pivot groups — each rotates about its OWN local z-axis (= world z)
    for (let bi = 0; bi < BLADE_COUNT; bi++) {
      const blade_y = LOUVER_Y_BOT + BLADE_H * (bi + 0.5); // vertical centre of this blade

      const pivot = new THREE.Group();
      pivot.name = `damper_blade_${li}_${bi}`;
      pivot.position.set(BLADE_PIVOT_X, blade_y, lz);

      const bladeMesh = new THREE.Mesh(bladeGeo, mats.louverGray);
      // No child offset — mesh is centred on the pivot so rotation.z spins it in place
      pivot.add(bladeMesh);

      enclosureGroup.add(pivot);
      bladePivots.push(pivot);
    }
  }

  group.add(enclosureGroup);

  // ==========================================================================
  // EXHAUST FANS  (two fans, spin_x animation)
  // Each fan lives in its OWN Group at its world centre so spinning rotation.x
  // rotates the disc around its own axis, not around a shared group origin.
  // Fan centres: z = -6.6 (louver 0) and z = -5.4 (louver 1).
  // ==========================================================================
  const exhaustFanGroup = new THREE.Group(); // container — no position
  exhaustFanGroup.name = 'exhaust_fans';

  const fanR = 0.315; // 0.63 m diameter
  const fanGeo = new THREE.CylinderGeometry(fanR, fanR, 0.08, 24);
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.10, 12);
  const fanZPositions = [-6.6, -5.4]; // world z centre of each fan
  const exhaustFanPivots = []; // exported for spin_x animation

  for (let i = 0; i < 2; i++) {
    // Pivot group AT the fan centre — spinning rotation.x here spins in place
    const fanPivot = new THREE.Group();
    fanPivot.name = `exhaust_fan_${i}`;
    fanPivot.position.set(19.05, 3.0, fanZPositions[i]);

    const fanDisc = new THREE.Mesh(fanGeo, mats.structuralSteel);
    fanDisc.rotation.z = Math.PI / 2; // disc faces the x-axis (spin_x)
    fanPivot.add(fanDisc);

    const hub = new THREE.Mesh(hubGeo, mats.machineEnamel);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.06, 0, 0);
    fanPivot.add(hub);

    exhaustFanGroup.add(fanPivot);
    exhaustFanPivots.push(fanPivot);
  }
  group.add(exhaustFanGroup);

  // ==========================================================================
  // EQUIPMENT  (compressors, receiver, dryer)
  // ==========================================================================
  const equipmentGroup = new THREE.Group();
  equipmentGroup.name = 'compressor_equipment';

  // --- Lead compressor  pivot [11, 0, -7.5], cabinet 2.0 × 1.2 × 1.7 (x, z, y) ---
  // Camera-facing face is +Z (z=0.600 local). All proud features start ≥10 mm off that face.
  const leadGroup = new THREE.Group();
  leadGroup.name = 'compressor_lead';
  leadGroup.position.set(11, 0, -7.5);

  // Main cabinet body (dimensions unchanged from spec)
  const leadCabGeo = new THREE.BoxGeometry(2.0, 1.7, 1.2);
  const leadCab = new THREE.Mesh(leadCabGeo, mats.machineEnamel);
  leadCab.position.set(0, 0.85, 0);
  leadGroup.add(leadCab);

  // Canopy surface break: roof lid, 20 mm proud on each side → reads as a machine, not a crate
  const leadCapGeo = new THREE.BoxGeometry(2.04, 0.06, 1.24);
  const leadCap = new THREE.Mesh(leadCapGeo, mats.structuralSteel);
  leadCap.position.set(0, 1.73, 0);
  leadGroup.add(leadCap);

  // Belt line: horizontal divider at mid-height (motor section / compressor section)
  const leadBeltGeo = new THREE.BoxGeometry(2.02, 0.04, 1.22);
  const leadBelt = new THREE.Mesh(leadBeltGeo, mats.structuralSteel);
  leadBelt.position.set(0, 0.85, 0);
  leadGroup.add(leadBelt);

  // Cooling-fan grille on +Z face — dark background panel (back face at z=0.610, 10 mm proud)
  const leadGrillPanGeo = new THREE.BoxGeometry(1.10, 0.58, 0.03);
  const leadGrillPan = new THREE.Mesh(leadGrillPanGeo, mats.structuralSteel);
  leadGrillPan.position.set(0, 1.30, 0.625);
  leadGroup.add(leadGrillPan);

  // Fan disc — circular silhouette inside the grille panel; galvanizedDuct = bright silver
  const leadFanDiscGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24);
  const leadFanDisc = new THREE.Mesh(leadFanDiscGeo, mats.galvanizedDuct);
  leadFanDisc.rotation.x = Math.PI / 2;
  leadFanDisc.position.set(0, 1.34, 0.652);
  leadGroup.add(leadFanDisc);

  // Fan hub (contrasting centre boss)
  const leadFanHubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.07, 12);
  const leadFanHub = new THREE.Mesh(leadFanHubGeo, mats.machineEnamel);
  leadFanHub.rotation.x = Math.PI / 2;
  leadFanHub.position.set(0, 1.34, 0.662);
  leadGroup.add(leadFanHub);

  // Control panel plate — lower-right of +Z face (back face at z=0.610, 10 mm proud)
  const leadCtrlGeo = new THREE.BoxGeometry(0.42, 0.30, 0.022);
  const leadCtrl = new THREE.Mesh(leadCtrlGeo, mats.structuralSteel);
  leadCtrl.position.set(0.35, 0.44, 0.621);
  leadGroup.add(leadCtrl);

  // Control-panel display — a small bright inset so the plate reads as an HMI, not a blank tab
  const leadHmiGeo = new THREE.BoxGeometry(0.20, 0.14, 0.01);
  const leadHmi = new THREE.Mesh(leadHmiGeo, mats.galvanizedDuct);
  leadHmi.position.set(0.35, 0.48, 0.633);
  leadGroup.add(leadHmi);

  // Grille cross-bars over the fan disc → reads as a guarded cooling-fan grille, not a plain disc
  for (const gy of [1.42, 1.30, 1.18]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 0.02), mats.structuralSteel);
    bar.position.set(0, gy, 0.665);
    leadGroup.add(bar);
  }

  addCanopyDetails(leadGroup, 2.0, 1.2, mats);
  equipmentGroup.add(leadGroup);

  // Lead cooling fan — world-space pivot for animation (top-mount axial fan, spin_y)
  const leadFanGroup = new THREE.Group();
  leadFanGroup.name = 'compressor_lead_cooling_fan';
  leadFanGroup.position.set(11, 1.5, -7.5);

  const lfGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 20);
  const lfMesh = new THREE.Mesh(lfGeo, mats.galvanizedDuct);
  leadFanGroup.add(lfMesh);
  group.add(leadFanGroup);

  // --- Lag compressor  pivot [11, 0, -4.5], cabinet 1.9 × 1.2 × 1.7 (x, z, y) ---
  const lagGroup = new THREE.Group();
  lagGroup.name = 'compressor_lag';
  lagGroup.position.set(11, 0, -4.5);

  // Main cabinet body
  const lagCabGeo = new THREE.BoxGeometry(1.9, 1.7, 1.2);
  const lagCab = new THREE.Mesh(lagCabGeo, mats.machineEnamel);
  lagCab.position.set(0, 0.85, 0);
  lagGroup.add(lagCab);

  // Canopy surface break
  const lagCapGeo = new THREE.BoxGeometry(1.94, 0.06, 1.24);
  const lagCap = new THREE.Mesh(lagCapGeo, mats.structuralSteel);
  lagCap.position.set(0, 1.73, 0);
  lagGroup.add(lagCap);

  // Belt line
  const lagBeltGeo = new THREE.BoxGeometry(1.92, 0.04, 1.22);
  const lagBelt = new THREE.Mesh(lagBeltGeo, mats.structuralSteel);
  lagBelt.position.set(0, 0.85, 0);
  lagGroup.add(lagBelt);

  // Cooling-fan grille on +Z face
  const lagGrillPanGeo = new THREE.BoxGeometry(1.0, 0.58, 0.03);
  const lagGrillPan = new THREE.Mesh(lagGrillPanGeo, mats.structuralSteel);
  lagGrillPan.position.set(0, 1.30, 0.625);
  lagGroup.add(lagGrillPan);

  // Fan disc
  const lagFanDiscGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24);
  const lagFanDisc = new THREE.Mesh(lagFanDiscGeo, mats.galvanizedDuct);
  lagFanDisc.rotation.x = Math.PI / 2;
  lagFanDisc.position.set(0, 1.34, 0.652);
  lagGroup.add(lagFanDisc);

  // Fan hub
  const lagFanHubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.07, 12);
  const lagFanHub = new THREE.Mesh(lagFanHubGeo, mats.machineEnamel);
  lagFanHub.rotation.x = Math.PI / 2;
  lagFanHub.position.set(0, 1.34, 0.662);
  lagGroup.add(lagFanHub);

  // Control panel plate
  const lagCtrlGeo = new THREE.BoxGeometry(0.40, 0.30, 0.022);
  const lagCtrl = new THREE.Mesh(lagCtrlGeo, mats.structuralSteel);
  lagCtrl.position.set(0.30, 0.44, 0.621);
  lagGroup.add(lagCtrl);

  // Control-panel display
  const lagHmiGeo = new THREE.BoxGeometry(0.18, 0.13, 0.01);
  const lagHmi = new THREE.Mesh(lagHmiGeo, mats.galvanizedDuct);
  lagHmi.position.set(0.30, 0.48, 0.633);
  lagGroup.add(lagHmi);

  // Grille cross-bars over the fan disc
  for (const gy of [1.42, 1.30, 1.18]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.02), mats.structuralSteel);
    bar.position.set(0, gy, 0.665);
    lagGroup.add(bar);
  }

  addCanopyDetails(lagGroup, 1.9, 1.2, mats);
  equipmentGroup.add(lagGroup);

  // Lag cooling fan — world-space pivot for animation
  const lagFanGroup = new THREE.Group();
  lagFanGroup.name = 'compressor_lag_cooling_fan';
  lagFanGroup.position.set(11, 1.4, -4.5);

  const lagFGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.05, 20);
  const lagFMesh = new THREE.Mesh(lagFGeo, mats.galvanizedDuct);
  lagFanGroup.add(lagFMesh);
  group.add(lagFanGroup);

  // --- Receiver tank  pivot [15.5, 0, -7.5], 0.91 m dia × 2.36 m tall ---
  // CylinderGeometry runs along y — vertical, correct for a pressure vessel.
  const receiverGroup = new THREE.Group();
  receiverGroup.name = 'receiver_tank';

  const recGeo = new THREE.CylinderGeometry(0.455, 0.455, 2.36, 20);
  const recMesh = new THREE.Mesh(recGeo, mats.receiverBlue);
  recMesh.position.set(15.5, 1.18, -7.5); // centre at half-height
  receiverGroup.add(recMesh);

  // Domed end caps (approximate): small hemispheres at top and bottom
  const capGeo = new THREE.SphereGeometry(0.455, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const capTop = new THREE.Mesh(capGeo, mats.receiverBlue);
  capTop.position.set(15.5, 1.18 + 1.18, -7.5); // top
  receiverGroup.add(capTop);
  const capBot = new THREE.Mesh(capGeo, mats.receiverBlue);
  capBot.rotation.x = Math.PI;
  capBot.position.set(15.5, 1.18 - 1.18, -7.5); // bottom
  receiverGroup.add(capBot);

  equipmentGroup.add(receiverGroup);

  // --- Refrigerated dryer  pivot [15.5, 0, -5.0], 0.8 × 0.6 × 1.4 (l=x, w=z, h=y) ---
  const dryerGroup = new THREE.Group();
  dryerGroup.name = 'refrigerated_dryer';

  const dryGeo = new THREE.BoxGeometry(0.8, 1.4, 0.6);
  const dryMesh = new THREE.Mesh(dryGeo, mats.machineEnamel);
  dryMesh.position.set(15.5, 0.7, -5.0); // base at y=0, centre at 0.7
  dryerGroup.add(dryMesh);

  // Identity: a refrigerated dryer reads as a finned/louvered condenser face + an HMI + the two
  // process connections on top (wet air in / dry air out), so it is not an anonymous box.
  // Louvered condenser face on the +Z face (camera-facing)
  const dryVentGeo = new THREE.BoxGeometry(0.62, 0.045, 0.02);
  for (let i = 0; i < 7; i++) {
    const v = new THREE.Mesh(dryVentGeo, mats.louverGray);
    v.position.set(15.5, 0.42 + i * 0.11, -5.0 + 0.31);
    v.rotation.x = 0.38;
    dryerGroup.add(v);
  }
  // HMI plate near the top of the +Z face
  const dryHmi = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.012), mats.galvanizedDuct);
  dryHmi.position.set(15.5, 1.24, -5.0 + 0.305);
  dryerGroup.add(dryHmi);
  // Two process connections rising from the top (wet-in / dry-out)
  for (const dz of [-0.16, 0.16]) {
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), mats.stainlessPipe);
    stub.position.set(15.5, 1.5, -5.0 + dz);
    dryerGroup.add(stub);
  }

  equipmentGroup.add(dryerGroup);

  group.add(equipmentGroup);

  // ==========================================================================
  // PIPING  (header + distribution main)
  // ==========================================================================
  const pipingGroup = new THREE.Group();
  pipingGroup.name = 'air_header_piping';

  const PIPE_R = 0.06; // header pipe radius — thicker so it reads as process piping, not rod

  // Elbow/joint boss so pipe runs meet at a fitting instead of a floating rod end
  const elbowGeo = new THREE.SphereGeometry(PIPE_R * 1.35, 12, 8);
  const addElbow = (p) => {
    const e = new THREE.Mesh(elbowGeo, mats.stainlessPipe);
    e.position.copy(p);
    pipingGroup.add(e);
  };

  // Air header: from lead discharge [11, 1.7, -7.5] to receiver top [15.5, 2.36, -7.5]
  const hdrA = new THREE.Vector3(11, 1.7, -7.5);
  const hdrB = new THREE.Vector3(15.5, 2.36, -7.5);
  const headerPipe = pipeBetween(hdrA, hdrB, PIPE_R, mats.stainlessPipe);
  if (headerPipe) { headerPipe.name = 'header_pipe'; pipingGroup.add(headerPipe); }

  // Distribution main: from receiver outlet [15.5, 2.36, -7.5] to bay far end [-14, 5.5, -7.5]
  // Long run — split into two segments for clarity:
  //   vertical riser: [15.5, 2.36, -7.5] → [15.5, 5.5, -7.5]
  //   horizontal main: [15.5, 5.5, -7.5] → [-14.0, 5.5, -7.5]
  const riserA = new THREE.Vector3(15.5, 2.36, -7.5);
  const riserB = new THREE.Vector3(15.5, 5.5, -7.5);
  const distRiser = pipeBetween(riserA, riserB, PIPE_R, mats.stainlessPipe);
  if (distRiser) { distRiser.name = 'dist_riser'; pipingGroup.add(distRiser); }

  const mainA = new THREE.Vector3(15.5, 5.5, -7.5);
  const mainB = new THREE.Vector3(-14.0, 5.5, -7.5);
  const distMain = pipeBetween(mainA, mainB, PIPE_R, mats.stainlessPipe);
  if (distMain) { distMain.name = 'dist_main'; pipingGroup.add(distMain); }

  // Cross-connects: lag compressor outlet to receiver header
  const lagOutA = new THREE.Vector3(11, 1.7, -4.5);
  const lagOutB = new THREE.Vector3(11, 1.7, -7.5); // connect to lead header z
  const lagCross = pipeBetween(lagOutA, lagOutB, PIPE_R * 0.8, mats.stainlessPipe);
  if (lagCross) { lagCross.name = 'lag_cross'; pipingGroup.add(lagCross); }

  // Dryer tie-in: header → dryer top connections, so the dryer is plumbed into the run
  const dryTieA = new THREE.Vector3(15.5, 2.36, -7.5);   // receiver-top header level
  const dryTieB = new THREE.Vector3(15.5, 1.72, -5.16);  // dryer wet-in stub top
  const dryTie = pipeBetween(dryTieA, dryTieB, PIPE_R * 0.75, mats.stainlessPipe);
  if (dryTie) { dryTie.name = 'dryer_tie'; pipingGroup.add(dryTie); }

  // Elbow bosses at the run's bends and tie points
  addElbow(hdrB);                                  // header meets receiver top
  addElbow(new THREE.Vector3(15.5, 5.5, -7.5));    // riser turns into the horizontal main
  addElbow(riserA);                                // receiver top meets riser
  addElbow(new THREE.Vector3(11, 1.7, -7.5));      // lead/lag header junction

  group.add(pipingGroup);

  return {
    group,
    enclosureGroup,
    equipmentGroup,
    pipingGroup,
    exhaustFanGroup,
    exhaustFanPivots,   // [fan0Group, fan1Group] — spin .rotation.x on each
    bladePivots,        // 12 damper-blade Groups — set .rotation.z = (PI/2)*exhaustFraction
    leadFanGroup,
    lagFanGroup,
  };
}
