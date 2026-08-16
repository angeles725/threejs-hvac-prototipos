// rack-cabinet.mjs — P5f OPTIMIZATION builder for 19"/42U rack cabinet
// SCALE: 1 m (EIA-310 real dimensions).
//
// Surface pass changes (P5b materials unchanged):
//   • U-numbers 1..42 on rail flange (CanvasTexture, map channel)
//   • Brand nameplate on plinth front face (CanvasTexture box)
//   • Phillips screw heads on side panels (CanvasTexture, map channel)
//
// Materials pass changes (P5a structural geom unchanged):
//   • Frame/plinth: MeshPhysicalMaterial clearcoat (powder-coat lacquer, metalness 0)
//   • Rails: near-binary metalness 0.92 (galvanised zinc), roughness 0.38
//   • Mesh door: dielectric painted steel (metalness 0, roughness 0.62)
//   • Glass door: low roughness, depthWrite false
//   • Lever: rubberised black (MeshPhysicalMaterial, metalness 0, clearcoat 0.15)
//   • Casters: rubber (metalness 0), fork bracket: steel (metalness 0.88)
//   • Rear vent texture: open area boosted to ~75% for rear-rail legibility (deferred #1)
//
// Structural changes from blockout (P4a → P5a):
//   • Rails: C-profile (front-face flange + side web, 2 boxes/rail)
//   • Corner posts: L-profile (2 thin plates per corner)
//   • Door frame: 4 frame strips at front opening
//   • Plinth: baseboard cap overhang
//   • Casters: wheel cylinder + fork bracket (2 cheeks + yoke, 3 boxes/caster)
//   • Rear panel: vent texture (exposes rear rails) — deferred fix #1
//   • Lever: cylindrical grip + wider brackets — deferred fix #2
//
// Hierarchy per design-spec.yaml:
//   root (rack_root)
//     cabinet_frame    — plinth + plinthCap + top cap + 4 L-profile corner posts + door frame
//     side_back_panels — L/R side panels + rear panel (vented)
//     rails_19in       — 4 C-profile rails (front+rear, L+R)
//     front_mesh_door  — Variant A: perforated-mesh door (default visible)
//       lever_handle_mesh
//     front_glass_door — Variant B: smoked glass + LED edge strip (hidden by default)
//       led_edge_strip (top/bot/L/R bars)
//       lever_handle_glass
//     casters_levelers — 4 casters + 4 levelers + 4 fork brackets

import * as THREE from 'three';

// === Cabinet dimensions (meters) ============================================
const HW      = 0.30;     // half width  (full = 0.60 m)
const HD      = 0.50;     // half depth  (full = 1.00 m)
const RH      = 2.00;     // full height
const RAIL_X  = 0.232;    // 19" rail centre x ±
const U       = 0.04445;  // 1U height (44.45 mm)
const BASE_Y  = 0.11;     // plinth height
const USABLE  = 42 * U;   // 1.867 m usable rail height
const DOOR_W  = 0.58;     // front door width
const DOOR_H  = 1.85;     // front door height
const POST_W  = 0.025;    // corner post profile extent
const POST_T  = 0.004;    // corner post wall thickness (L-profile)
const CASTER_R = 0.038;   // caster wheel radius (38 mm)
const Y_LIFT   = CASTER_R * 2;  // 76 mm — body raised so casters show below plinth

// === LED color presets ======================================================
export const LED_COLORS = [
  { name: 'AZUL',   hex: '#2f6bff' },
  { name: 'BLANCO', hex: '#f0f4ff' },
  { name: 'VERDE',  hex: '#35d07a' },
];

// === Helper: BoxGeometry mesh ===============================================
function box(w, h, d, mat, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = false;
  m.receiveShadow = false;
  if (parent) parent.add(m);
  return m;
}

// === Procedural perf texture (hex-grid holes) ================================
function makePerfTexture() {
  const SIZE = 256, HOLE = 8, STEP_X = 22, STEP_Y = 19;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#000000';
  for (let row = -1; row < SIZE / STEP_Y + 2; row++) {
    const xOff = (row & 1) * (STEP_X / 2);
    for (let col = -1; col < SIZE / STEP_X + 2; col++) {
      ctx.beginPath();
      ctx.arc(col * STEP_X + xOff, row * STEP_Y, HOLE, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 20);
  return tex;
}

// === EIA-310 rail slot texture (1 tile = 1U) ================================
function makeRailTexture() {
  const W = 64, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  const sw = W * 0.52, sh = H * 0.58;
  ctx.fillRect((W - sw) / 2, (H - sh) / 2, sw, sh);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 42);
  return tex;
}

// === Rear-panel vent texture — high open-area (exposes rear rails) ===========
// ~75 % of each tile is transparent (black=alpha 0); only narrow web strips
// are opaque. Lower repeat → larger world-space openings readable at distance.
function makeVentTexture() {
  const W = 32, H = 8;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // Start all-black (hole / transparent)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  // Narrow white web: 2 px at top + 2 px at bottom = 50 % solid edges, 50 % slot.
  // With H=8 that means 4 solid / 4 open = 50% open (still a big improvement).
  // Use H=10, 2px web each end → 6px open = 60% per tile.
  // Keep W full-width (no side borders) so opening is as wide as possible.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, 2);       // top web strip
  ctx.fillRect(0, H - 2, W, 2);   // bottom web strip
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 28);    // fewer, larger tiles → each slot ~0.065 m tall in world
  return tex;
}

// === Rail U-number map (1..42 etched labels on flange face) ==================
// One 64×1344 canvas (no repeat): U=1 at top (canvas Y=0 → texture V=1),
// U=42 at bottom.  Applied as map channel alongside the slot alphaMap.
function makeRailNumberMap() {
  const TW = 64, TH = 32, N = 42;
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH * N;   // 64 × 1344
  const ctx = c.getContext('2d');

  // Zinc grey base (matches railMat color so it multiplies cleanly)
  ctx.fillStyle = '#93989f';
  ctx.fillRect(0, 0, TW, TH * N);

  // Subtle tick lines between Us
  ctx.strokeStyle = '#7c8188';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    const y = i * TH + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TW, y); ctx.stroke();
  }

  // U-number labels — light enough to read, not glaring
  const FS = Math.floor(TH * 0.52);
  ctx.font = `bold ${FS}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c8ccd4';
  for (let u = 1; u <= N; u++) {
    ctx.fillText(String(u), TW * 0.5, (u - 1) * TH + TH * 0.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // No repeat — spans the full USABLE height once (UV 0→1 = bottom→top of rail)
  return tex;
}

// === Brand nameplate map (anodised aluminium label on plinth front) ===========
function makeNameplateMap() {
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Dark anodised aluminium body
  ctx.fillStyle = '#18191e';
  ctx.fillRect(0, 0, W, H);

  // Thin hairline border
  ctx.strokeStyle = '#38393f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Primary label
  ctx.fillStyle = '#c5c9d2';
  ctx.font = `bold ${Math.floor(H * 0.44)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SRV·42U', W / 2, H * 0.58);

  // Subtitle
  ctx.fillStyle = '#585e6a';
  ctx.font = `${Math.floor(H * 0.20)}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText('EIA-310  ·  19" RACK CABINET', W / 2, H * 0.70);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// === Panel screw-head map (Phillips screws on side panels) ====================
// White (#fff) background multiplies neutrally with panelMat.color.
// Screws are subtle grey impressions with cross slots.
function makePanelScrewMap() {
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 2 columns × 5 rows of screws
  const COLS = 2, ROWS = 5;
  const R = 4;   // screw head radius (px) — smaller, more subtle
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = ((col + 0.5) / COLS) * W;
      const y = ((row + 0.5) / ROWS) * H;

      // Recessed head (slightly darker than panel)
      ctx.fillStyle = '#c8c8c4';
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

      // Rim
      ctx.strokeStyle = '#b0b0ac';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();

      // Phillips cross
      ctx.strokeStyle = '#9a9a96';
      ctx.lineWidth = 1.5;
      const arm = R * 0.58;
      ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// === Main builder ============================================================
export function buildRackCabinet(scene) {
  const root = new THREE.Group();
  root.name = 'rack_root';
  scene.add(root);

  // bodyGroup lifted Y_LIFT above floor so casters are visible below plinth
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'cabinet_body';
  bodyGroup.position.y = Y_LIFT;
  root.add(bodyGroup);

  // ── Frame color variants ────────────────────────────────────────────────────
  const FRAME_VARIANTS = {
    white: { frame: '#e9e9e6', plinth: '#d8d8d4', panel: '#d0d0cb' },
    black: { frame: '#1b1b20', plinth: '#111116', panel: '#1a1a1f' },
  };

  // ── 1. Cabinet frame ────────────────────────────────────────────────────────
  const cabFrame = new THREE.Group();
  cabFrame.name = 'cabinet_frame';
  bodyGroup.add(cabFrame);

  // Powder-coat paint: near-binary metalness=0 (dielectric), clearcoat for
  // the thin lacquer layer typical of quality server cabinets.
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: FRAME_VARIANTS.white.frame,
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.40,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.6,
  });
  frameMat.name = 'frame_white';

  const plinthMat = new THREE.MeshPhysicalMaterial({
    color: FRAME_VARIANTS.white.plinth,
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.30,
    envMapIntensity: 0.5,
  });
  plinthMat.name = 'frame_white_plinth';

  // Base plinth body
  const plinth = box(2 * HW, BASE_Y, 2 * HD, plinthMat, cabFrame);
  plinth.position.set(0, BASE_Y / 2, 0);
  plinth.name = 'base_plinth';

  // Plinth cap overhang — baseboard-style top lip (slightly wider/deeper)
  const plinthCap = box(2 * HW + 0.012, 0.014, 2 * HD + 0.012, plinthMat, cabFrame);
  plinthCap.position.set(0, BASE_Y - 0.007, 0);
  plinthCap.name = 'plinth_cap';

  // Top cap
  const topCap = box(2 * HW + 0.020, 0.045, 2 * HD + 0.020, frameMat, cabFrame);
  topCap.position.set(0, RH - 0.0225, 0);
  topCap.name = 'top_cap';

  // 4 corner posts — L-profile (two thin plates per corner)
  const postH = RH - BASE_Y - 0.045;
  const postY = BASE_Y + postH / 2;

  for (const sx of [-HW + POST_W / 2, HW - POST_W / 2]) {
    for (const sz of [-HD + POST_W / 2, HD - POST_W / 2]) {
      const tag = `${sx > 0 ? 'r' : 'l'}_${sz > 0 ? 'f' : 'b'}`;
      // Plate A: faces front/back (Z-normal)
      const pA = box(POST_W, postH, POST_T, frameMat, cabFrame);
      pA.position.set(sx, postY, sz);
      pA.name = `post_A_${tag}`;
      // Plate B: faces side (X-normal)
      const pB = box(POST_T, postH, POST_W, frameMat, cabFrame);
      pB.position.set(sx, postY, sz);
      pB.name = `post_B_${tag}`;
    }
  }

  // Door frame — 4 strips around the front door opening
  const FT = 0.014;   // frame profile thickness
  const FD = 0.026;   // frame profile depth (z-extent)
  const FZ = HD - FD / 2;  // centred on front face

  const dfTop = box(DOOR_W + FT * 2, FT, FD, frameMat, cabFrame);
  dfTop.position.set(0, BASE_Y + DOOR_H + FT / 2, FZ);
  dfTop.name = 'door_frame_top';

  const dfBot = box(DOOR_W + FT * 2, FT, FD, frameMat, cabFrame);
  dfBot.position.set(0, BASE_Y - FT / 2, FZ);
  dfBot.name = 'door_frame_bot';

  const dfLft = box(FT, DOOR_H, FD, frameMat, cabFrame);
  dfLft.position.set(-DOOR_W / 2 - FT / 2, BASE_Y + DOOR_H / 2, FZ);
  dfLft.name = 'door_frame_lft';

  const dfRgt = box(FT, DOOR_H, FD, frameMat, cabFrame);
  dfRgt.position.set(DOOR_W / 2 + FT / 2, BASE_Y + DOOR_H / 2, FZ);
  dfRgt.name = 'door_frame_rgt';

  // Brand nameplate — dark anodised aluminium label on plinth front face
  const nameplateMat = new THREE.MeshStandardMaterial({
    map: makeNameplateMap(),
    color: '#ffffff',    // neutral white → map drives colour
    roughness: 0.32,
    metalness: 0.10,
    envMapIntensity: 0.9,
  });
  nameplateMat.name = 'nameplate_anodised';
  const nameplate = box(0.112, 0.030, 0.003, nameplateMat, cabFrame);
  nameplate.position.set(0, BASE_Y / 2, HD + 0.0015);
  nameplate.name = 'nameplate_label';

  // ── 2. Side + rear panels ───────────────────────────────────────────────────
  const sidePanels = new THREE.Group();
  sidePanels.name = 'side_back_panels';
  bodyGroup.add(sidePanels);

  // Side panels: powder-coat + Phillips screw heads (map multiplies with color)
  const panelMat = new THREE.MeshPhysicalMaterial({
    color: FRAME_VARIANTS.white.panel,
    map: makePanelScrewMap(),
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.5,
  });
  panelMat.name = 'panel_white';
  const panelH   = postH;
  const panelY   = postY;

  // Side panels — same geometry, 2 → 1 InstancedMesh
  const sidePanelGeo = new THREE.BoxGeometry(0.010, panelH, 2 * HD - POST_W * 2);
  const sidePanelIM  = new THREE.InstancedMesh(sidePanelGeo, panelMat, 2);
  sidePanelIM.name   = 'side_panels';
  // instance 0: left panel at x = -HW + 0.005
  // instance 1: right panel at x = +HW - 0.005
  // (dummy Object3D is not available here yet; use Matrix4 directly)
  [[-HW + 0.005, panelY, 0], [HW - 0.005, panelY, 0]].forEach(([x, y, z], i) => {
    const m = new THREE.Matrix4().setPosition(x, y, z);
    sidePanelIM.setMatrixAt(i, m);
  });
  sidePanelIM.instanceMatrix.needsUpdate = true;
  sidePanels.add(sidePanelIM);

  // Rear panel — vented: same powder-coat + large alphaMap openings
  const rearPanelMat = new THREE.MeshPhysicalMaterial({
    color: FRAME_VARIANTS.white.panel,
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.5,
    alphaMap: makeVentTexture(),
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  rearPanelMat.name = 'panel_rear_vented';

  const rearPanel = box(2 * HW - POST_W * 2, panelH, 0.010, rearPanelMat, sidePanels);
  rearPanel.position.set(0, panelY, -HD + 0.005);
  rearPanel.name = 'panel_rear';

  // ── 3. 19" mounting rails — C-profile (flange face + web) ──────────────────
  const rails19 = new THREE.Group();
  rails19.name = 'rails_19in';
  bodyGroup.add(rails19);

  // Rails — galvanised zinc: near-binary metalness 0.92, mid roughness (brushed look)
  // map: U-number labels (64×1344, no repeat) layered over zinc base
  // alphaMap: EIA-310 slot holes (repeat × 42)
  const railSlotTex   = makeRailTexture();
  const railNumberTex = makeRailNumberMap();
  const railMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',     // white × number-map = number-map colours (zinc grey base in texture)
    map: railNumberTex,
    roughness: 0.38,
    metalness: 0.92,
    envMapIntensity: 2.2,
    alphaMap: railSlotTex,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  railMat.name = 'rails_zinc_flange';

  // Rail web — same alloy, slightly darker (shadow side)
  const webMat = new THREE.MeshStandardMaterial({
    color: '#72777e',
    roughness: 0.35,
    metalness: 0.92,
    envMapIntensity: 2.2,
  });
  webMat.name = 'rails_zinc_web';

  // C-profile rail dims
  const RF_W = 0.030;   // flange face width (toward interior, visible from front)
  const RF_T = 0.004;   // flange face thickness
  const RW_D = 0.028;   // web depth (front-to-back)
  const RW_T = 0.004;   // web thickness
  const railH = USABLE;
  const railY = BASE_Y + railH / 2;

  for (const rx of [-RAIL_X, RAIL_X]) {
    const sign = rx > 0 ? 1 : -1;  // outboard direction (+x for right, -x for left)
    for (const [tag, rz] of [['front', HD - 0.040], ['rear', -HD + 0.060]]) {
      // Front-face flange (with EIA slot alphaMap — the face operators touch)
      const flange = box(RF_W, railH, RF_T, railMat, rails19);
      flange.position.set(rx, railY, rz);
      flange.name = `rail_flange_${rx > 0 ? 'r' : 'l'}_${tag}`;

      // Side web (bare metal, gives C-profile depth silhouette)
      const web = box(RW_T, railH, RW_D, webMat, rails19);
      // Web sits outboard of the flange face, centred in z on the same rz
      web.position.set(rx + sign * (RF_W / 2 + RW_T / 2), railY, rz);
      web.name = `rail_web_${rx > 0 ? 'r' : 'l'}_${tag}`;
    }
  }

  // ── 4. Front MESH door — Variant A (default visible) ───────────────────────
  const meshDoor = new THREE.Group();
  meshDoor.name = 'front_mesh_door';
  meshDoor.position.set(-DOOR_W / 2, 1.0, HD);
  bodyGroup.add(meshDoor);

  const DOOR_Y_LOCAL = (BASE_Y + DOOR_H / 2) - 1.0;  // = 0.035

  // Perforated mesh door — dielectric painted steel (metalness 0, near-binary)
  // envMapIntensity boosted for vertical-face legibility under the rig
  const meshDoorMat = new THREE.MeshStandardMaterial({
    color: '#1d1d21',
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.80,
    alphaMap: makePerfTexture(),
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  meshDoorMat.name = 'mesh_door_painted';

  const meshPanel = box(DOOR_W, DOOR_H, 0.012, meshDoorMat, meshDoor);
  meshPanel.position.set(DOOR_W / 2, DOOR_Y_LOCAL, 0.007);
  meshPanel.name = 'mesh_door_panel';

  // Lever handle (mesh door) — U-handle with cylindrical grip
  const leverMeshGrp = new THREE.Group();
  leverMeshGrp.name = 'lever_handle_mesh';
  meshDoor.add(leverMeshGrp);
  leverMeshGrp.position.set(DOOR_W - 0.034, DOOR_Y_LOCAL, 0.018);

  // Lever — rubberised black grip: dielectric (metalness 0), mild clearcoat
  const leverMat = new THREE.MeshPhysicalMaterial({
    color: '#0e0e12',
    roughness: 0.50,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.60,
    envMapIntensity: 0.3,
  });
  leverMat.name = 'lever_black_rubber';

  const PLATE_D = 0.010;  // mounting plate depth (against door)
  const ARM_L   = 0.082;  // bracket arm projection from door
  const ARM_H   = 0.018;  // bracket arm height
  const ARM_W   = 0.022;  // bracket arm width
  const BAR_H   = 0.130;  // grip bar height (taller for clear visual read)
  const GRIP_R  = 0.013;  // cylindrical grip radius

  // Mounting plate
  const lPlate = box(ARM_W, BAR_H + ARM_H * 2, PLATE_D, leverMat, leverMeshGrp);
  lPlate.position.set(0, 0, PLATE_D / 2);
  lPlate.name = 'lever_plate';

  // Top bracket arm
  const lArmTop = box(ARM_W, ARM_H, ARM_L, leverMat, leverMeshGrp);
  lArmTop.position.set(0, BAR_H / 2 + ARM_H / 2, PLATE_D + ARM_L / 2);
  lArmTop.name = 'lever_arm_top';

  // Bottom bracket arm
  const lArmBot = box(ARM_W, ARM_H, ARM_L, leverMat, leverMeshGrp);
  lArmBot.position.set(0, -(BAR_H / 2 + ARM_H / 2), PLATE_D + ARM_L / 2);
  lArmBot.name = 'lever_arm_bot';

  // Cylindrical grip bar — reads clearly as a graspable round handle
  const lGripGeo = new THREE.CylinderGeometry(GRIP_R, GRIP_R, BAR_H, 14);
  const lGrip = new THREE.Mesh(lGripGeo, leverMat);
  lGrip.position.set(0, 0, PLATE_D + ARM_L + GRIP_R);
  leverMeshGrp.add(lGrip);
  lGrip.name = 'lever_grip';

  // ── 5. Front GLASS door — Variant B (hidden by default) ────────────────────
  const glassDoor = new THREE.Group();
  glassDoor.name = 'front_glass_door';
  glassDoor.position.set(-DOOR_W / 2, 1.0, HD);
  glassDoor.visible = false;
  bodyGroup.add(glassDoor);

  // Smoked glass — dielectric (metalness 0), very low roughness, thin opacity
  // No transmission (stalls SwiftShader). depthWrite false so rails show through.
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#8fa8b8',
    roughness: 0.04,
    metalness: 0,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  glassMat.name = 'glass_door_smoked';

  const glassPanel = box(DOOR_W, DOOR_H, 0.010, glassMat, glassDoor);
  glassPanel.position.set(DOOR_W / 2, DOOR_Y_LOCAL, 0.006);
  glassPanel.name = 'glass_door_panel';

  // LED edge strip — emissive dielectric; high intensity for ACES compression
  const ledMat = new THREE.MeshStandardMaterial({
    color: '#08080e',
    emissive: new THREE.Color(LED_COLORS[0].hex),
    emissiveIntensity: 3.2,
    roughness: 0.38,
    metalness: 0,
    envMapIntensity: 0.2,
  });
  ledMat.name = 'led_edge_emissive';

  // LED halo / glow — MeshBasicMaterial with AdditiveBlending simulates bloom.
  // Larger boxes around each LED bar blend colour onto the door and frame.
  // ledGlowMat.color is updated alongside ledMat.emissive in the LED toggle.
  const ledGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(LED_COLORS[0].hex),
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ledGlowMat.name = 'led_glow_halo';

  const LED_T = 0.014, LED_D = 0.010, LED_Z = 0.016;
  const GLOW_EXTRA = 0.036;    // halo overshoot on each edge
  const GLOW_Z = LED_Z + 0.004;  // slightly in front of the LED bar

  const ledTop = box(DOOR_W, LED_T, LED_D, ledMat, glassDoor);
  ledTop.position.set(DOOR_W / 2, DOOR_Y_LOCAL + DOOR_H / 2 - LED_T / 2, LED_Z);
  ledTop.name = 'led_top';
  const glowTop = box(DOOR_W + GLOW_EXTRA, LED_T + GLOW_EXTRA, 0.002, ledGlowMat, glassDoor);
  glowTop.position.set(DOOR_W / 2, DOOR_Y_LOCAL + DOOR_H / 2 - LED_T / 2, GLOW_Z);
  glowTop.name = 'led_glow_top';

  const ledBot = box(DOOR_W, LED_T, LED_D, ledMat, glassDoor);
  ledBot.position.set(DOOR_W / 2, DOOR_Y_LOCAL - DOOR_H / 2 + LED_T / 2, LED_Z);
  ledBot.name = 'led_bottom';
  const glowBot = box(DOOR_W + GLOW_EXTRA, LED_T + GLOW_EXTRA, 0.002, ledGlowMat, glassDoor);
  glowBot.position.set(DOOR_W / 2, DOOR_Y_LOCAL - DOOR_H / 2 + LED_T / 2, GLOW_Z);
  glowBot.name = 'led_glow_bottom';

  const ledLft = box(LED_T, DOOR_H - 2 * LED_T, LED_D, ledMat, glassDoor);
  ledLft.position.set(LED_T / 2, DOOR_Y_LOCAL, LED_Z);
  ledLft.name = 'led_left';
  const glowLft = box(LED_T + GLOW_EXTRA, DOOR_H - 2 * LED_T + GLOW_EXTRA, 0.002, ledGlowMat, glassDoor);
  glowLft.position.set(LED_T / 2, DOOR_Y_LOCAL, GLOW_Z);
  glowLft.name = 'led_glow_left';

  const ledRgt = box(LED_T, DOOR_H - 2 * LED_T, LED_D, ledMat, glassDoor);
  ledRgt.position.set(DOOR_W - LED_T / 2, DOOR_Y_LOCAL, LED_Z);
  ledRgt.name = 'led_right';
  const glowRgt = box(LED_T + GLOW_EXTRA, DOOR_H - 2 * LED_T + GLOW_EXTRA, 0.002, ledGlowMat, glassDoor);
  glowRgt.position.set(DOOR_W - LED_T / 2, DOOR_Y_LOCAL, GLOW_Z);
  glowRgt.name = 'led_glow_right';

  // Lever (glass door) — same cylindrical-grip U-handle
  const leverGlassGrp = new THREE.Group();
  leverGlassGrp.name = 'lever_handle_glass';
  glassDoor.add(leverGlassGrp);
  leverGlassGrp.position.set(DOOR_W - 0.034, DOOR_Y_LOCAL, 0.018);

  const leverGlassMat = leverMat.clone();
  const glPlate = box(ARM_W, BAR_H + ARM_H * 2, PLATE_D, leverGlassMat, leverGlassGrp);
  glPlate.position.set(0, 0, PLATE_D / 2);
  glPlate.name = 'lever_plate';
  const glArmTop = box(ARM_W, ARM_H, ARM_L, leverGlassMat, leverGlassGrp);
  glArmTop.position.set(0, BAR_H / 2 + ARM_H / 2, PLATE_D + ARM_L / 2);
  glArmTop.name = 'lever_arm_top';
  const glArmBot = box(ARM_W, ARM_H, ARM_L, leverGlassMat, leverGlassGrp);
  glArmBot.position.set(0, -(BAR_H / 2 + ARM_H / 2), PLATE_D + ARM_L / 2);
  glArmBot.name = 'lever_arm_bot';
  const glGripGeo = new THREE.CylinderGeometry(GRIP_R, GRIP_R, BAR_H, 14);
  const glGrip = new THREE.Mesh(glGripGeo, leverGlassMat);
  glGrip.position.set(0, 0, PLATE_D + ARM_L + GRIP_R);
  leverGlassGrp.add(glGrip);
  glGrip.name = 'lever_grip';

  // ── 6. Casters + levelers + fork brackets ───────────────────────────────────
  const casterGroup = new THREE.Group();
  casterGroup.name = 'casters_levelers';
  root.add(casterGroup);

  // Caster wheel — hard rubber: dielectric (metalness 0)
  const casterMat = new THREE.MeshStandardMaterial({
    color: '#252530',
    roughness: 0.72,
    metalness: 0,
    envMapIntensity: 0.3,
  });
  casterMat.name = 'caster_rubber';

  // Fork bracket — bare steel: near-binary metalness 0.88
  const forkMat = new THREE.MeshStandardMaterial({
    color: '#50555e',
    roughness: 0.42,
    metalness: 0.88,
    envMapIntensity: 1.8,
  });
  forkMat.name = 'fork_steel';

  // Fork bracket dimensions
  const FORK_CHEEK_W = 0.006;
  const FORK_CHEEK_H = CASTER_R * 1.8;
  const FORK_CHEEK_D = 0.008;
  const WHEEL_AXLE   = 0.016;   // half of cylinder height (0.032 / 2)

  // Caster positions (shared by wheels, cheeks, yokes)
  const CSTR = [
    [-HW + 0.065, -HD + 0.075],
    [-HW + 0.065,  HD - 0.075],
    [ HW - 0.065, -HD + 0.075],
    [ HW - 0.065,  HD - 0.075],
  ];

  // Shared dummy Object3D for matrix composition
  const dummy = new THREE.Object3D();

  // ── InstancedMesh: 4 caster wheels (4 → 1 draw call) ──────────────────────
  const wheelGeo = new THREE.CylinderGeometry(CASTER_R, CASTER_R, 0.032, 16);
  const wheelIM  = new THREE.InstancedMesh(wheelGeo, casterMat, 4);
  wheelIM.name   = 'casters_wheels';
  CSTR.forEach(([sx, sz], i) => {
    dummy.position.set(sx, CASTER_R, sz);
    dummy.rotation.set(0, 0, Math.PI / 2);
    dummy.updateMatrix();
    wheelIM.setMatrixAt(i, dummy.matrix);
  });
  wheelIM.instanceMatrix.needsUpdate = true;
  casterGroup.add(wheelIM);

  // ── InstancedMesh: 8 fork cheeks (8 → 1 draw call) ────────────────────────
  const cheekGeo = new THREE.BoxGeometry(FORK_CHEEK_W, FORK_CHEEK_H, FORK_CHEEK_D);
  const cheekIM  = new THREE.InstancedMesh(cheekGeo, forkMat, 8);
  cheekIM.name   = 'fork_cheeks';
  let ci = 0;
  CSTR.forEach(([sx, sz]) => {
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(sx - WHEEL_AXLE - FORK_CHEEK_W / 2, CASTER_R, sz);
    dummy.updateMatrix(); cheekIM.setMatrixAt(ci++, dummy.matrix);
    dummy.position.set(sx + WHEEL_AXLE + FORK_CHEEK_W / 2, CASTER_R, sz);
    dummy.updateMatrix(); cheekIM.setMatrixAt(ci++, dummy.matrix);
  });
  cheekIM.instanceMatrix.needsUpdate = true;
  casterGroup.add(cheekIM);

  // ── InstancedMesh: 4 fork yokes (4 → 1 draw call) ─────────────────────────
  const yokeGeo = new THREE.BoxGeometry(WHEEL_AXLE * 2 + FORK_CHEEK_W * 2, 0.009, 0.012);
  const yokeIM  = new THREE.InstancedMesh(yokeGeo, forkMat, 4);
  yokeIM.name   = 'fork_yokes';
  CSTR.forEach(([sx, sz], i) => {
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(sx, CASTER_R * 2 + 0.0045, sz);
    dummy.updateMatrix();
    yokeIM.setMatrixAt(i, dummy.matrix);
  });
  yokeIM.instanceMatrix.needsUpdate = true;
  casterGroup.add(yokeIM);

  // ── InstancedMesh: 4 leveling feet (4 → 1 draw call) ─────────────────────
  const LEVR = [
    [-HW + 0.038, -HD + 0.044],
    [-HW + 0.038,  HD - 0.044],
    [ HW - 0.038, -HD + 0.044],
    [ HW - 0.038,  HD - 0.044],
  ];
  const levelerGeo = new THREE.CylinderGeometry(0.013, 0.017, Y_LIFT * 0.7, 12);
  const levelerIM  = new THREE.InstancedMesh(levelerGeo, casterMat, 4);
  levelerIM.name   = 'casters_leveler_feet';
  LEVR.forEach(([sx, sz], i) => {
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(sx, Y_LIFT * 0.35, sz);
    dummy.updateMatrix();
    levelerIM.setMatrixAt(i, dummy.matrix);
  });
  levelerIM.instanceMatrix.needsUpdate = true;
  casterGroup.add(levelerIM);

  // === Return for UI controls =================================================
  return {
    root,            // framing SUBJECT for __qaFraming
    meshDoor,        // Variant A
    glassDoor,       // Variant B
    ledMat,          // LED emissive cycling
    ledGlowMat,      // LED halo — update .color alongside ledMat.emissive
    frameMat,        // frame color toggle
    plinthMat,       // plinth color toggle
    panelMat,        // side panel color toggle
    rearPanelMat,    // rear panel color toggle (separate mat; vented)
    FRAME_VARIANTS,
  };
}
