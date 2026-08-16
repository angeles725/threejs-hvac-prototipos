// pdu-strip.mjs — Panduit EL2P vertical rack PDU · P5a MATERIALS.
//
// SCALE: 1 voxel = 0.1 m  (blockout_scale; 1 unit = 1 m)
//
// Structural PASSED at 0.80. This pass authors the PBR palette (see materials.mjs) and
// makes two evidence-driven corrections that are material, not massing:
//   - outlet housings split into three COLOURED CIRCUIT BANKS (aqua/grey/white), which is
//     how Panduit actually differentiates EL2P outlets
//   - the per-outlet green status LEDs are GONE. They were invented at blockout with no
//     source. Targeted research came back INCONCLUSIVE — nothing states the EL2P has
//     them, nothing states it does not — and every indirect signal points away: the only
//     LED a distributor enumerates is a single "On/Off LED", and outlet identity is
//     carried by housing colour. Unevidenced geometry does not ship.
//
// Carried from the structural pass:
//   1. outlet cavity >= 4 mm (it was 0 mm: see the OUTLET block below)
//   2. head port band subdivided into three discrete recessed jack sockets
//
// The four critical features must keep reading, since each gates a pass alone:
//   1. slender-0u-vertical-strip — ~33:1 bar standing on its long axis
//   2. outlet-column-42          — 42 DISCRETE RECESSED sockets at a regular pitch
//   3. ab-feed-red-blue-pair     — red and blue strips side by side, simultaneously
//   4. monitored-head-module     — head end set apart: LCD + RJ-45 pair + USB + QR
//
// Why faces are built from BANDS, RAILS and RIMS instead of solid boxes: there is no CSG
// on this track, so a recess cannot be subtracted — it has to be built as walls around an
// empty middle. A solid plate with dark decals would satisfy a pixel count and fail the
// feature. The recess must be real geometry.
//
// NOT CHANGED, deliberately: the mount-button diameter. It is invented, not sourced, and
// enlarging it would raise a score rather than describe the subject (see progress.yaml
// open_items). It stays until a drawing or a scaled photo exists.

import * as THREE from 'three';
import { D, HALF_LENGTH, HEAD_CENTER_Y, TAIL_Y, verifyDims } from './dims.mjs';
import { createMaterials, createBodyMaterial, setLcdState, BODY_VARIANTS } from './materials.mjs';
import { makeNameplate, makeOutletLegend, makeLcdScreen } from './decals.mjs';

/** Lateral offset of each strip in the A/B pair (rear-post spacing). */
export const FEED_OFFSET_X = 0.075;

// ── Derived build constants (all from DIMS — never hand-tuned in two places) ──
const HALF_W = D.width / 2;      // 0.027
const HALF_D = D.depth / 2;      // 0.038
const RECESS = 0.010;            // pocket depth behind the bezel rail front
const RAIL_W = 0.008;            // bezel rail width, each side
const CHANNEL_W = D.width - 2 * RAIL_W;   // 0.038 — the open trough the outlets sit in

const SLAB_DEPTH = D.depth - RECESS;      // 0.066
const SLAB_Z = -RECESS / 2;               // slab spans z -0.038 .. +0.028
const POCKET_FLOOR_Z = SLAB_Z + SLAB_DEPTH / 2;  // 0.028
const RAIL_FRONT_Z = HALF_D;                     // 0.038
const RAIL_Z = POCKET_FLOOR_Z + RECESS / 2;      // 0.033

// Head sits at the top; inlet entry at the bottom; outlets fill what is left.
const INLET_ZONE = 0.110;
const FIELD_TOP = HALF_LENGTH - D.headModule;        //  0.669
const FIELD_BOTTOM = -HALF_LENGTH + INLET_ZONE;      // -0.779

const DIVIDER_H = 0.006;
const HEAD_PROUD = 0.006;                            // head module stands off the rails
const HEAD_FRONT_Z = RAIL_FRONT_Z + HEAD_PROUD;      // 0.044

// Every part that lands ON the slab front face is sunk SEAT into it instead of sitting
// exactly on the plane. Coincident faces are a trap twice over: they z-fight at grazing
// angles, and vertex positions are Float32Array, so two planes computed to the same
// float64 value can land microns apart once stored — which is enough for
// Box3.intersectsBox to declare a seated part "floating". Real overlap, not a kiss.
const SEAT = 0.0005;
const SEAT_Z = POCKET_FLOOR_Z - SEAT;                // 0.0275

// ── Outlet socket (P5a structural) ───────────────────────────────────────────
// At blockout an outlet was a flat faceplate with three dark boxes sitting PROUD of it.
// That is backwards: a receptacle is a TUB. There was no cavity at all, so the dark
// aperture the spec calls for was really three dark studs catching the key light.
//
// Rebuilt as a real socket: a dark floor, a light rim standing CAVITY_DEPTH proud of it,
// and the pin slots down inside. No CSG at this track, so the hole is made by building
// the four rim walls around an empty middle rather than by subtracting one.
const OUTLET = {
  outerH: 0.024,          // receptacle footprint height
  widthC13: 0.026,        // (21) C13/C15 tier
  widthCombo: 0.032,      // (21) 4-in-1 C13/C15/C19/C21 tier — wider body
  rimT: 0.004,            // rim wall thickness
  floorT: 0.0015,         // dark backing plate
  cavityDepth: 0.005,     // >= 0.004 required by the structural review
};
const OUTLET_FLOOR_TOP_Z = POCKET_FLOOR_Z + OUTLET.floorT;              // 0.0295
const OUTLET_RIM_FRONT_Z = OUTLET_FLOOR_TOP_Z + OUTLET.cavityDepth;     // 0.0345

// ── Circuit banks (P5a materials) ────────────────────────────────────────────
// Panduit differentiates EL2P outlets by COLOURED SOCKET HOUSING — aqua / grey / white
// circuit banks. Colours: [CERT-web] panduit.com EL2P page + the EL2P press release.
// Grouping: [INFER] — three contiguous banks, one per phase on a 3-phase 42-outlet unit
// (E42G20L is 60 A 3-ph). Three named colours and three phases agree, but the exact bank
// boundaries are not published, so this is inferred and marked as such in the spec.
const BANK_COUNT = 3;
const bankOf = (i) => Math.floor(i / (D.outletCount / BANK_COUNT));

// Pin slots live INSIDE the tub now, so their offsets must clear the inner walls.
const SLOT = { w: 0.004, h: 0.005, d: 0.002 };
const SLOT_OFFSETS = [
  [ 0.000,  0.004],   // earth, top-centre
  [-0.005, -0.003],   // line
  [ 0.005, -0.003],   // neutral
];

// ── Head port sockets (P5a structural) ───────────────────────────────────────
// The port band was one recessed plate with three tabs on it. Rebuilt as a bezel with
// three real apertures: solid columns between the ports, a top and bottom lintel per
// aperture, and a recessed metal jack inside each opening.
// Layout is PARAMETRIC across the strip width — margins and dividers are equal, and the
// aperture widths are the only per-port input.
const PORT_BAND = { y0: 0.730, y1: 0.800 };
const PORT_MARGIN = 0.003;
const PORT_DIVIDER = 0.003;
const PORTS = [
  { name: 'rj45_a', apW: 0.0155, apH: 0.013 },   // daisy-chain in
  { name: 'rj45_b', apW: 0.0155, apH: 0.013 },   // daisy-chain out
  { name: 'usb',    apW: 0.0110, apH: 0.008 },   // firmware update
];
const PORT_BACK_Z = RAIL_FRONT_Z;                // 0.038 — back wall of every aperture
const PORT_SHELL_FRONT_Z = 0.0415;               // jack face, 2.5 mm inside the bezel

/** Solve the port apertures across the head width. Pure maths — no geometry. */
function solvePortLayout() {
  const spans = PORTS.reduce((a, p) => a + p.apW, 0);
  const chrome = 2 * PORT_MARGIN + (PORTS.length - 1) * PORT_DIVIDER;
  const slack = D.width - spans - chrome;
  if (slack < 0) {
    console.error(`[pdu-strip] port layout overflows the head: needs ${(spans + chrome).toFixed(4)} m, have ${D.width}`);
  }
  // Spend the slack on the margins so the ports stay centred as a group.
  const margin = PORT_MARGIN + slack / 2;
  const out = [];
  let x = -D.width / 2 + margin;
  for (const p of PORTS) {
    out.push({ ...p, x0: x, x1: x + p.apW, xc: x + p.apW / 2 });
    x += p.apW + PORT_DIVIDER;
  }
  return { ports: out, margin, slack };
}


// ── Geometry cache (P5a OPTIMIZATION) ────────────────────────────────────────
// The A and B strips are the same object twice, so every shape was being built and
// uploaded twice: 70 meshes carried 70 unique geometries for ~35 distinct shapes.
// Geometries here are immutable — nothing mutates vertex data after construction — so
// sharing them between strips is free. Instance matrices live on the InstancedMesh, not
// the geometry, so instanced parts share safely too.
const _geoCache = new Map();
function cachedGeo(key, make) {
  let g = _geoCache.get(key);
  if (!g) { g = make(); _geoCache.set(key, g); }
  return g;
}
const boxGeo = (w, h, d) => cachedGeo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const planeGeo = (w, h) => cachedGeo(`plane:${w}:${h}`, () => new THREE.PlaneGeometry(w, h));
const cylGeo = (rt, rb, h, seg) => cachedGeo(`cyl:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

/** Exposed so the optimization check can assert the cache is actually being hit. */
export function geometryCacheSize() { return _geoCache.size; }

/**
 * Build the A/B PDU pair and add it to the scene.
 * @param {THREE.Scene} scene
 */
export function buildPduPair(scene) {
  const dimsOk = verifyDims();
  const materials = createMaterials();

  const root = new THREE.Group();
  root.name = 'pdu_root';

  const feedA = buildStrip('feed_a_strip', 'red', materials);
  feedA.position.x = -FEED_OFFSET_X;

  const feedB = buildStrip('feed_b_strip', 'blue', materials);
  feedB.position.x = FEED_OFFSET_X;

  root.add(feedA, feedB);
  scene.add(root);

  const mountButtons = [feedA, feedB].map((s) => s.getObjectByName('mount_buttons'));

  const attachOk = verifyAttachments([feedA, feedB]);
  if (dimsOk && attachOk) {
    console.log('[pdu-strip] built · guards passed');
  }

  return {
    root, feedA, feedB, materials, mountButtons,
    setLcd: (on) => setLcdState(materials, on),
    setMountButtons: (on) => { for (const g of mountButtons) g.visible = on; },
    // ?body=black — the black strips standing beside the red/blue pair in the site
    // photos. body_black was declared in the spec from the start but had nothing
    // rendering it; this makes the declared material reachable.
    setBodyBlack: (on) => {
      for (const strip of [feedA, feedB]) {
        const variant = on ? 'black' : strip.userData.bodyVariant;
        strip.userData.bodyMat.color.set(BODY_VARIANTS[variant].color);
        strip.userData.bodyMat.name = BODY_VARIANTS[variant].id;
      }
    },
    built: true,
  };
}

// ── One strip ────────────────────────────────────────────────────────────────
function buildStrip(name, bodyVariant, m) {
  const bodyMat = createBodyMaterial(bodyVariant);
  const strip = new THREE.Group();
  strip.name = name;

  strip.add(buildStripBody(bodyMat));
  strip.add(buildOutletColumn(bodyMat, m));
  strip.add(buildOutletLegend(m));
  strip.add(buildHeadModule(bodyMat, m));
  strip.add(buildInletCord(m, bodyMat));
  strip.add(buildMountButtons(bodyMat));

  // The strip owns its body material, so a colour state can drive it without rebuilding.
  strip.userData.bodyMat = bodyMat;
  strip.userData.bodyVariant = bodyVariant;
  return strip;
}

// ── strip_body — the extruded chassis + the two bezel rails ───────────────────
function buildStripBody(bodyMat) {
  const g = new THREE.Group();
  g.name = 'strip_body';

  // Rear slab: the full-length back of the extrusion. Its front face is the pocket floor.
  const slab = new THREE.Mesh(
    boxGeo(D.width, D.length, SLAB_DEPTH),
    bodyMat,
  );
  slab.name = 'strip_slab';
  slab.position.z = SLAB_Z;
  g.add(slab);

  // Two bezel rails run the full length, leaving the channel open between them.
  // This is what makes the outlet pockets genuinely recessed.
  for (const sign of [-1, 1]) {
    const rail = new THREE.Mesh(
      boxGeo(RAIL_W, D.length, RECESS),
      bodyMat,
    );
    rail.name = sign < 0 ? 'bezel_rail_left' : 'bezel_rail_right';
    rail.position.set(sign * (HALF_W - RAIL_W / 2), 0, RAIL_Z);
    g.add(rail);
  }

  return g;
}

// ── outlet_column — 42 discrete recessed pockets (InstancedMesh) ──────────────
function buildOutletColumn(bodyMat, m) {
  const g = new THREE.Group();
  g.name = 'outlet_column';

  const n = D.outletCount;
  const pitch = D.outletPitch;
  const outletY = (i) => FIELD_BOTTOM + (i + 0.5) * pitch;

  // --- dividers: n+1 ribs, flush with the rail front, separating the pockets ---
  // Without these the channel reads as one long slot instead of 42 outlets.
  const dividerD = RECESS + SEAT;   // seated: spans SEAT_Z .. RAIL_FRONT_Z
  const dividers = new THREE.InstancedMesh(
    boxGeo(CHANNEL_W, DIVIDER_H, dividerD),
    bodyMat,
    n + 1,
  );
  dividers.name = 'outlet_dividers';
  const mx = new THREE.Matrix4();
  for (let i = 0; i <= n; i++) {
    mx.makeTranslation(0, FIELD_BOTTOM + i * pitch, SEAT_Z + dividerD / 2);
    dividers.setMatrixAt(i, mx);
  }
  dividers.instanceMatrix.needsUpdate = true;
  g.add(dividers);

  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const outletW = (i) => (i % 2 === 1 ? OUTLET.widthCombo : OUTLET.widthC13); // 21 combo / 21 C13

  // --- cavity floor: the DARK back of each socket -----------------------------
  // This is what the eye reads as "a hole" at gate distance; the rim below gives it
  // genuine depth so it is a shadowed throat rather than a dark decal.
  const floors = new THREE.InstancedMesh(
    boxGeo(1, 1, 1),
    m.outletCavity,
    n,
  );
  floors.name = 'outlet_cavity_floors';
  const floorD = OUTLET.floorT + SEAT;   // seated; the floor TOP stays at OUTLET_FLOOR_TOP_Z
  for (let i = 0; i < n; i++) {
    scl.set(outletW(i), OUTLET.outerH, floorD);
    pos.set(0, outletY(i), SEAT_Z + floorD / 2);
    mx.compose(pos, q, scl);
    floors.setMatrixAt(i, mx);
  }
  floors.instanceMatrix.needsUpdate = true;
  g.add(floors);

  // --- rim: four light walls per socket, standing cavityDepth proud of the floor --
  // Four walls around an empty middle IS the recess. Building a solid plate and
  // darkening its face would measure the same in a count and read flat in a render.
  // One rim mesh PER CIRCUIT BANK: Panduit colours EL2P socket housings aqua / grey /
  // white to show which branch circuit an outlet belongs to. A single housing colour
  // would drop a real identity cue of this product.
  const bankMats = [m.outletBankAqua, m.outletBankGrey, m.outletBankWhite];
  const perBank = n / BANK_COUNT;
  const rims = bankMats.map((mat, b) => {
    const im = new THREE.InstancedMesh(boxGeo(1, 1, 1), mat, perBank * 4);
    im.name = `outlet_rims_bank${b}`;
    return im;
  });
  const bankCursor = new Array(BANK_COUNT).fill(0);
  const zRim = OUTLET_FLOOR_TOP_Z + OUTLET.cavityDepth / 2;
  for (let i = 0; i < n; i++) {
    const w = outletW(i);
    const y = outletY(i);
    const hw = w / 2;
    const hh = OUTLET.outerH / 2;
    const t = OUTLET.rimT;
    const walls = [
      // [sx, sy, dx, dy] — top and bottom span the full width; sides fill between them
      [w, t, 0, hh - t / 2],
      [w, t, 0, -(hh - t / 2)],
      [t, OUTLET.outerH - 2 * t, -(hw - t / 2), 0],
      [t, OUTLET.outerH - 2 * t, hw - t / 2, 0],
    ];
    const b = bankOf(i);
    for (const [sx, sy, dx, dy] of walls) {
      scl.set(sx, sy, OUTLET.cavityDepth);
      pos.set(dx, y + dy, zRim);
      mx.compose(pos, q, scl);
      rims[b].setMatrixAt(bankCursor[b]++, mx);
    }
  }
  for (const im of rims) { im.instanceMatrix.needsUpdate = true; g.add(im); }

  // --- pin slots: three apertures DOWN INSIDE the tub -------------------------
  // At blockout these sat proud of a flat plate, which is why the socket had no cavity.
  // They now rest on the cavity floor, well below the rim front.
  const slots = new THREE.InstancedMesh(
    boxGeo(SLOT.w, SLOT.h, SLOT.d),
    m.outletCavity,
    n * SLOT_OFFSETS.length,
  );
  slots.name = 'outlet_pin_slots';
  let k = 0;
  for (let i = 0; i < n; i++) {
    const y = outletY(i);
    for (const [dx, dy] of SLOT_OFFSETS) {
      mx.makeTranslation(dx, y + dy, OUTLET_FLOOR_TOP_Z + SLOT.d / 2);
      slots.setMatrixAt(k++, mx);
    }
  }
  slots.instanceMatrix.needsUpdate = true;
  g.add(slots);

  return g;
}

// ── head_module — the hot-swap controller, built as three bands ───────────────
// The MIDDLE band is deliberately dropped back to the rail plane so the RJ-45/USB
// jacks sit in a real pocket. Ports modeled flush on a solid face would read as
// stickers (spec attachment: contact_type embedded, embed_depth 0.008).
function buildHeadModule(bodyMat, m) {
  const g = new THREE.Group();
  g.name = 'head_module';

  const BANDS = {
    lower: { y0: FIELD_TOP + 0.000, y1: PORT_BAND.y0 },   // QR label
    port:  PORT_BAND,                                     // RJ-45 x2 + USB — apertured bezel
    upper: { y0: PORT_BAND.y1, y1: HALF_LENGTH },         // LCD
  };
  const bandH = (b) => b.y1 - b.y0;
  const bandY = (b) => (b.y0 + b.y1) / 2;

  // Proud bands (lower + upper) — front at HEAD_FRONT_Z
  for (const key of ['lower', 'upper']) {
    const b = BANDS[key];
    const bandD = RECESS + HEAD_PROUD + SEAT;   // seated; front stays at HEAD_FRONT_Z
    const mesh = new THREE.Mesh(
      boxGeo(D.width, bandH(b), bandD),
      bodyMat,
    );
    mesh.name = `head_band_${key}`;
    mesh.position.set(0, bandY(b), SEAT_Z + bandD / 2);
    g.add(mesh);
  }

  // Port band BACK WALL — front at RAIL_FRONT_Z. The apertured bezel that sits on top of
  // it (0.038 -> 0.044) is built by buildHeadPorts, which owns the three openings.
  const pb = BANDS.port;
  const portFloorD = RECESS + SEAT;   // seated; front stays at PORT_BACK_Z
  const portFloor = new THREE.Mesh(
    boxGeo(D.width, bandH(pb), portFloorD),
    bodyMat,
  );
  portFloor.name = 'head_band_port_floor';
  portFloor.position.set(0, bandY(pb), SEAT_Z + portFloorD / 2);
  g.add(portFloor);

  g.add(buildHeadLcd(m));
  g.add(buildHeadPorts(m, bodyMat));
  g.add(buildHeadQr(m));
  g.add(buildHeadNameplate(m));

  return g;
}

function buildHeadLcd(m) {
  const g = new THREE.Group();
  g.name = 'head_lcd';

  const T = 0.005;
  // The screen artwork rides on the SHARED lcd material so ?head=on still drives every
  // strip from one place; the map is black where the screen is unlit, so with
  // emissiveIntensity 0 the plate stays dark exactly as before.
  const { texture } = makeLcdScreen();
  if (texture && !m.lcd.emissiveMap) {
    m.lcd.emissiveMap = texture;
    m.lcd.needsUpdate = true;
  }
  const lcd = new THREE.Mesh(boxGeo(D.lcdW, D.lcdH, T), m.lcd);
  lcd.name = 'head_lcd_glass';
  // Glass face stands ~2 mm proud of the head face, per the spec attachment block.
  lcd.position.set(0, 0.840, HEAD_FRONT_Z - T / 2 + 0.002);
  g.add(lcd);

  return g;
}

function buildHeadPorts(m, bodyMat) {
  const g = new THREE.Group();
  g.name = 'head_net_ports';

  const { ports } = solvePortLayout();
  const Y = (PORT_BAND.y0 + PORT_BAND.y1) / 2;
  const faceT = HEAD_FRONT_Z - PORT_BACK_Z + SEAT; // bezel thickness, seated onto the back wall
  const faceZ = HEAD_FRONT_Z - faceT / 2;

  // --- bezel face: solid everywhere EXCEPT the three apertures ----------------
  // Built as columns and lintels around the openings. A jack sitting on an unbroken
  // face reads as a sticker no matter how it is shaded.
  const addFace = (name, w, h, x, y) => {
    if (w <= 0 || h <= 0) return;
    const mesh = new THREE.Mesh(boxGeo(w, h, faceT), bodyMat);
    mesh.name = name;
    mesh.position.set(x, y, faceZ);
    g.add(mesh);
  };

  // Solid columns: left margin, the gaps between ports, right margin.
  const edges = [-D.width / 2, ...ports.flatMap((p) => [p.x0, p.x1]), D.width / 2];
  for (let i = 0; i < edges.length; i += 2) {
    const x0 = edges[i];
    const x1 = edges[i + 1];
    addFace(`port_face_col${i / 2}`, x1 - x0, PORT_BAND.y1 - PORT_BAND.y0, (x0 + x1) / 2, Y);
  }

  // Lintels above and below each aperture.
  for (const p of ports) {
    const apTop = Y + p.apH / 2;
    const apBot = Y - p.apH / 2;
    addFace(`${p.name}_lintel_top`, p.apW, PORT_BAND.y1 - apTop, p.xc, (PORT_BAND.y1 + apTop) / 2);
    addFace(`${p.name}_lintel_bottom`, p.apW, apBot - PORT_BAND.y0, p.xc, (apBot + PORT_BAND.y0) / 2);
  }

  // --- per-port socket: dark throat + recessed metal jack ---------------------
  for (const p of ports) {
    const throat = new THREE.Mesh(
      boxGeo(p.apW, p.apH, 0.0015),
      m.outletCavity,
    );
    throat.name = `${p.name}_throat`;
    throat.position.set(p.xc, Y, PORT_BACK_Z + 0.00075);
    g.add(throat);

    // Jack body sits INSIDE the aperture, its face behind the bezel front.
    const shellD = PORT_SHELL_FRONT_Z - (PORT_BACK_Z + 0.0015);
    const shell = new THREE.Mesh(
      boxGeo(p.apW - 0.002, p.apH - 0.002, shellD),
      m.portMetal,
    );
    shell.name = `${p.name}_shell`;
    shell.position.set(p.xc, Y, PORT_BACK_Z + 0.0015 + shellD / 2);
    g.add(shell);
  }

  return g;
}

function buildHeadQr(m) {
  const g = new THREE.Group();
  g.name = 'head_qr_label';

  // QR sits in the upper half of the lower band; the nameplate takes the space below it.
  const S = 0.018;
  const label = new THREE.Mesh(boxGeo(S, S, 0.0004), m.labelPrint);
  label.name = 'head_qr_plate';
  label.position.set(0, 0.714, HEAD_FRONT_Z + 0.0002);
  g.add(label);

  return g;
}

// ── head_nameplate — brand + rating plate (P5a surface) ──────────────────────
function buildHeadNameplate(m) {
  const g = new THREE.Group();
  g.name = 'head_nameplate';

  const { texture, layout } = makeNameplate();
  // One material for BOTH strips: the plate is identical, so a per-strip clone was two
  // GPU materials pointing at the same artwork. Cached on the shared palette object so
  // the spec id (and therefore the traceability check) is unaffected.
  if (!m._nameplateMat) {
    const mat = m.labelPrint.clone();
    mat.name = m.labelPrint.name;    // keep the spec id — same material, different artwork
    if (texture) mat.map = texture;
    m._nameplateMat = mat;
  }
  const mat = m._nameplateMat;

  // Fit the plate into the lower band beside the QR, keeping the canvas aspect so text
  // is never stretched. Band spans y 0.669..0.730; QR occupies the upper right.
  // Use the band's full usable width: at 30 mm the type fell under the legibility floor.
  const W = 0.044;
  const H = W * (layout.h / layout.w);          // 0.0172 — canvas aspect preserved
  const plate = new THREE.Mesh(planeGeo(W, H), mat);
  plate.name = 'head_nameplate_plate';
  plate.position.set(0, 0.690, HEAD_FRONT_Z + 0.0003);   // below the QR, no overlap
  g.add(plate);

  g.userData.layout = layout;
  return g;
}

// ── outlet_legend — silkscreen numbering up the bezel rail (P5a surface) ─────
function buildOutletLegend(m) {
  const g = new THREE.Group();
  g.name = 'outlet_legend';

  const { texture, layout } = makeOutletLegend(D.outletCount, BANK_COUNT);
  if (!m._legendMat) {
    const mat = m.silkscreen.clone();
    mat.name = m.silkscreen.name;
    if (texture) mat.map = texture;
    m._legendMat = mat;
  }
  const mat = m._legendMat;

  // Printed on the LEFT bezel rail — the strip of real estate the removed per-outlet
  // LEDs used to occupy. Spans exactly the outlet field so number N lines up with
  // outlet N by construction rather than by eye.
  const W = RAIL_W - 0.002;
  const H = D.outletField;
  const plate = new THREE.Mesh(planeGeo(W, H), mat);
  plate.name = 'outlet_legend_strip';
  plate.position.set(
    -(HALF_W - RAIL_W / 2),
    (FIELD_BOTTOM + FIELD_TOP) / 2,
    RAIL_FRONT_Z + 0.0002,
  );
  g.add(plate);

  g.userData.layout = layout;
  return g;
}

// ── inlet_cord — appendage, built ROOT → TIP per the spec attachment contract ─
function buildInletCord(m, bodyMat) {
  const g = new THREE.Group();
  g.name = 'inlet_cord';

  // Swivel connector seats INTO the strip tail (contact_type socket, embed_depth 0.020).
  const swivel = new THREE.Mesh(
    cylGeo(0.013, 0.013, 0.030, 16),
    bodyMat,
  );
  swivel.name = 'inlet_swivel';
  swivel.position.set(0, TAIL_Y + 0.020 - 0.015, 0);   // straddles the tail plane
  g.add(swivel);

  // Cord: root starts 20 mm inside the tail, tip routes away toward the cable path.
  // Never centered on an arbitrary transform — the mesh spans start → end.
  const start = new THREE.Vector3(0, TAIL_Y + 0.020, 0);
  const tip   = new THREE.Vector3(0.06, -1.10, 0.14);
  const mid   = new THREE.Vector3(0.020, -0.985, 0.045);
  const curve = new THREE.CatmullRomCurve3([start, mid, tip]);

  const cord = new THREE.Mesh(
    cachedGeo('cord-tube', () => new THREE.TubeGeometry(curve, 32, 0.009, 10, false)),
    m.cordRubber,
  );
  cord.name = 'inlet_cord_tube';
  g.add(cord);

  return g;
}

// ── mount_buttons — tool-less keyhole buttons on the rear face ────────────────
function buildMountButtons(bodyMat) {
  const g = new THREE.Group();
  g.name = 'mount_buttons';
  g.visible = false;   // spec ui_control "SHOW MOUNT BUTTONS" — off by default

  const H = 0.007;
  const count = Math.floor(D.length / D.mountButtonPitch);   // 4
  const span = (count - 1) * D.mountButtonPitch;

  const buttons = new THREE.InstancedMesh(
    cylGeo(0.006, 0.006, H, 12),
    bodyMat,
    count,
  );
  buttons.name = 'mount_button_studs';

  const mx = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); // lay along z
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    // Overlap the body by ~3 mm so a button can never float off the rear face.
    pos.set(0, -span / 2 + i * D.mountButtonPitch, -HALF_D - H / 2 + 0.003);
    mx.compose(pos, q, scl);
    buttons.setMatrixAt(i, mx);
  }
  buttons.instanceMatrix.needsUpdate = true;
  g.add(buttons);

  return g;
}

// ── Build-time guards ────────────────────────────────────────────────────────
// console.error, NOT console.assert — assert is invisible to the QA gate and would
// let floating geometry through at exit 0.
function verifyAttachments(strips) {
  const problems = [];

  for (const strip of strips) {
    const body = strip.getObjectByName('strip_slab');
    if (!body) { problems.push(`${strip.name}: strip_slab missing`); continue; }

    const bodyBox = new THREE.Box3().setFromObject(body);

    // Every appendage group must OVERLAP the body box, not merely sit near it.
    for (const nodeName of ['inlet_cord', 'mount_buttons', 'head_module', 'outlet_column']) {
      const node = strip.getObjectByName(nodeName);
      if (!node) { problems.push(`${strip.name}/${nodeName}: node missing`); continue; }

      // A hidden node still has geometry; measure it regardless of visibility, or the
      // guard would go quiet exactly when a default-off part is broken.
      const box = new THREE.Box3().setFromObject(node, true);
      if (box.isEmpty()) { problems.push(`${strip.name}/${nodeName}: empty geometry`); continue; }

      // Require real overlap DEPTH, not mere intersection. Two coincident planes are a
      // knife edge: Box3.intersectsBox can answer either way depending on how Float32
      // rounded the vertices, so a "touching" part is not evidence of contact.
      const ov = [
        Math.min(bodyBox.max.x, box.max.x) - Math.max(bodyBox.min.x, box.min.x),
        Math.min(bodyBox.max.y, box.max.y) - Math.max(bodyBox.min.y, box.min.y),
        Math.min(bodyBox.max.z, box.max.z) - Math.max(bodyBox.min.z, box.min.z),
      ];
      const MIN_OVERLAP = 0.0001;   // 0.1 mm — well above Float32 noise at this scale
      if (Math.min(...ov) < MIN_OVERLAP) {
        problems.push(
          `${strip.name}/${nodeName}: NOT SEATED — overlap with strip_slab is only ` +
          `[${ov.map((v) => (v * 1000).toFixed(3)).join(', ')}] mm`,
        );
      }
    }

    // The outlet column must actually span the declared field, not collapse to a point.
    const col = new THREE.Box3().setFromObject(strip.getObjectByName('outlet_column'), true);
    const spanY = col.max.y - col.min.y;
    if (spanY < D.outletField * 0.9) {
      problems.push(`${strip.name}: outlet column spans ${spanY.toFixed(3)} m, expected ~${D.outletField}`);
    }
  }

  if (problems.length) {
    console.error('[pdu-strip] ATTACHMENT GUARD FAILED:', problems.join(' · '));
    return false;
  }
  return true;
}
