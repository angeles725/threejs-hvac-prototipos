import { useEffect, useRef } from "react";
import * as THREE from "three";

// Coord convention: +X east, +Y up, +Z south (street-facing). 1 unit = 1 m.
// Origin at ground-level centroid of main building footprint.

// Daylight palette — observation-driven from Hollywood Casino Valle Alto photos.
const C = {
  sky:          "#b8d3e0",
  ground:       "#a8a49a",
  asphalt:      "#3a3a3d",
  apron:        "#4a4a4d",
  grass:        "#5c7a3a",
  hedge:        "#3e5a28",
  mainWall:     "#e9e0d0",    // cream main body
  parapet:      "#ede4d2",    // cream tall pedestal
  darkPanel:    "#1c1f26",    // dark charcoal entrance wall
  darkPanelTrim:"#2a2e38",
  column:       "#1a1a1d",    // pergola columns (steel)
  wood:         "#c89868",    // pergola slats — warm caramel
  woodDark:     "#8a5c34",    // slat underside
  glass:        "#5a7a8a",
  glassDoor:    "#3a5a70",
  glassFrame:   "#d8d4c8",
  roofSlab:     "#8a8880",
  acHousing:    "#d8d8d4",
  acVent:       "#6a6a68",
  brandGold:    "#d4a26a",
  brandCream:   "#f5ecd8",
  led1:         "#b83dcf",
  led2:         "#3de1ff",
  led3:         "#f5b52a",
  cisterna:     "#c8c4b8",
  equipRed:     "#8a3a2a",
  equipGreen:   "#2a6a3a",
};

// Articulated dimensions — main rectangle + taller cream pedestal + wide cantilevered pergola east-of-center.
const D = {
  ground: { w: 600, d: 600 },
  main:   { w: 60, d: 30, h: 10, cx: 0, cz: 0 },
  // Pedestal: thin parapet volume sitting forward of main south face so it reads as a raised front tower, not an embedded box.
  pedestal:{ w: 22, d: 4, h: 14, cx: 10, cz: 14 },
  // Dark wall: restricted to the west half of the facade so it does not fight the pedestal footprint in X.
  darkWall:{ w: 32, h: 9, thick: 0.5, cx: -12, cz: 15.25 },
  ledScreen:{ w: 14, h: 6, cx: -13, cy: 5.5, cz: 15.62 },
  lightbox:{ w: 18, h: 2.6, cx: 10, cy: 12.5, cz: 16.2 }, // pedestal front at z=16, lightbox 0.2m clear
  subLightbox:{ w: 14, h: 0.9, cx: 10, cy: 10.8, cz: 16.15 }, // slight y-drop from lightbox, 0.05m behind it
  doors:  { w: 12, h: 4, cx: 6, cz: 15.65 }, // clear of dark wall front at z=15.5
  pergola:{
    cx: 6, cz: 23, cy: 5.8,
    slabW: 28, slabD: 8.5, slatThick: 0.12, slatGap: 0.28,
    slatCount: 32,
    columnCount: 4, columnH: 5.8, columnR: 0.16,
  },
  drive:  { w: 34, d: 11, cx: 6, cz: 22.5 }, // asphalt driveway under pergola
};

// Equipment metadata — shape MUST mirror niagara-casino App.jsx EQUIPMENT_LIST so the
// component is drop-in compatible (resolveEquipment / EQUIPMENT_ALIASES rely on these IDs).
const META = {
  pu1: { id: "pu1", name: "Unidad Paquete 1", type: "pkg",       cap: "25 TON",              desc: "Nivel suelo — Exterior" },
  pu2: { id: "pu2", name: "Unidad Paquete 2", type: "pkg",       cap: "25 TON",              desc: "Nivel suelo — Exterior" },
  cis: { id: "cis", name: "Cisterna",         type: "cistern",   cap: "Almacenamiento agua", desc: "Nivel suelo — Exterior" },
  ex1: { id: "ex1", name: "Extractor Humo 1", type: "extractor", cap: "Extracción cocina",   desc: "Montaje en pared — Cocina" },
  ex2: { id: "ex2", name: "Extractor Humo 2", type: "extractor", cap: "Extracción cocina",   desc: "Montaje en pared — Cocina" },
};

// ───────────────────────── Texture helpers ─────────────────────────

function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  return canvas;
}

// Lightbox-style "HOLLYWOOD" branding (cream face, gold deep letters)
function makeHollywoodTexture() {
  const canvas = makeCanvas(2048, 320);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.brandCream;
  ctx.fillRect(0, 0, 2048, 320);
  // subtle top/bottom bevel
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, "rgba(255,255,255,0.25)");
  grad.addColorStop(0.5, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 320);
  // text
  ctx.fillStyle = C.brandGold;
  ctx.font = "900 220px 'Impact','Arial Black',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HOLLYWOOD", 1024, 170);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// Thinner "ENTERTAINMENT CASINO" subtitle strip
function makeSubtitleTexture() {
  const canvas = makeCanvas(2048, 128);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, 2048, 128);
  ctx.fillStyle = C.brandCream;
  ctx.font = "700 64px 'Arial',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "8px";
  ctx.fillText("E N T E R T A I N M E N T   C A S I N O", 1024, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// Animated LED screen texture — scrolling VEGAS / colour bands
function makeLEDTexture() {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  function draw(t) {
    // vertical gradient that animates
    const g = ctx.createLinearGradient(0, 0, 1024, 512);
    const hue1 = (t * 30) % 360;
    const hue2 = (hue1 + 140) % 360;
    g.addColorStop(0, `hsl(${hue1},85%,55%)`);
    g.addColorStop(1, `hsl(${hue2},90%,45%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);

    // scanlines for LED feel
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 512; y += 4) ctx.fillRect(0, y, 1024, 2);

    // scrolling "VEGAS"
    ctx.save();
    ctx.font = "900 280px 'Impact','Arial Black',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const offset = ((t * 60) % 1400) - 200;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffd84a";
    ctx.shadowBlur = 30;
    ctx.fillText("VEGAS", 512 + Math.sin(t * 0.8) * 40, 260);
    ctx.restore();

    // bottom marquee blocks
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 16; i++) {
      const bx = ((i * 90) + (t * 80)) % 1024;
      ctx.fillRect(bx, 440, 60, 40);
    }
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

// ───────────────────────── Builders ─────────────────────────

function buildGroundPlane(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(D.ground.w, D.ground.d),
    new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Asphalt driveway strip under pergola (south of building)
  const drive = new THREE.Mesh(
    new THREE.PlaneGeometry(D.drive.w, D.drive.d),
    new THREE.MeshStandardMaterial({ color: C.asphalt, roughness: 0.95 })
  );
  drive.rotation.x = -Math.PI / 2;
  drive.position.set(D.drive.cx, 0.02, D.drive.cz);
  drive.receiveShadow = true;
  scene.add(drive);

  // Sidewalk strip south of driveway
  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 4),
    new THREE.MeshStandardMaterial({ color: "#b8b3a4", roughness: 0.95 })
  );
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.03, D.drive.cz + D.drive.d / 2 + 2.2);
  walk.receiveShadow = true;
  scene.add(walk);

  // Landscaping median strip (green) between drive and sidewalk — hosts forecourt palms
  const median = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 2.2),
    new THREE.MeshStandardMaterial({ color: C.grass, roughness: 1 })
  );
  median.rotation.x = -Math.PI / 2;
  median.position.set(-4, 0.04, D.drive.cz + D.drive.d / 2 + 0.3);
  median.receiveShadow = true;
  scene.add(median);
}

function buildMainBuilding(scene) {
  // Main rectangular cream body
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(D.main.w, D.main.h, D.main.d),
    new THREE.MeshStandardMaterial({ color: C.mainWall, roughness: 0.85 })
  );
  main.position.set(D.main.cx, D.main.h / 2, D.main.cz);
  main.castShadow = true;
  main.receiveShadow = true;
  scene.add(main);

  // Roof slab (darker cap)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(D.main.w + 0.6, 0.4, D.main.d + 0.6),
    new THREE.MeshStandardMaterial({ color: C.roofSlab, roughness: 0.9 })
  );
  roof.position.set(D.main.cx, D.main.h + 0.2, D.main.cz);
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);

  // Taller cream pedestal (supports the lightbox)
  const ped = new THREE.Mesh(
    new THREE.BoxGeometry(D.pedestal.w, D.pedestal.h, D.pedestal.d),
    new THREE.MeshStandardMaterial({ color: C.parapet, roughness: 0.8 })
  );
  ped.position.set(D.pedestal.cx, D.pedestal.h / 2, D.pedestal.cz);
  ped.castShadow = true;
  ped.receiveShadow = true;
  scene.add(ped);

  // Pedestal top cornice
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(D.pedestal.w + 0.6, 0.3, D.pedestal.d + 0.6),
    new THREE.MeshStandardMaterial({ color: "#d8cfbc", roughness: 0.85 })
  );
  cornice.position.set(D.pedestal.cx, D.pedestal.h + 0.15, D.pedestal.cz);
  scene.add(cornice);
}

function buildFacade(scene, ledCtl) {
  // Dark charcoal front wall — panels with slight vertical grooves
  const wallGeom = new THREE.BoxGeometry(D.darkWall.w, D.darkWall.h, D.darkWall.thick);
  const wallMat = new THREE.MeshStandardMaterial({
    color: C.darkPanel, roughness: 0.55, metalness: 0.15,
  });
  const wall = new THREE.Mesh(wallGeom, wallMat);
  wall.position.set(D.darkWall.cx, D.darkWall.h / 2 + 0.5, D.darkWall.cz);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  // Vertical groove strips (decorative panel joins)
  for (let i = 1; i < 8; i++) {
    const x = D.darkWall.cx - D.darkWall.w / 2 + (D.darkWall.w / 8) * i;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, D.darkWall.h - 0.3, 0.02),
      new THREE.MeshStandardMaterial({ color: C.darkPanelTrim, roughness: 0.6 })
    );
    strip.position.set(x, D.darkWall.h / 2 + 0.5, D.darkWall.cz + D.darkWall.thick / 2 + 0.01);
    scene.add(strip);
  }

  // LED screen (emissive, animated)
  const ledMat = new THREE.MeshStandardMaterial({
    map: ledCtl.tex, emissive: "#ffffff", emissiveMap: ledCtl.tex,
    emissiveIntensity: 1.0, roughness: 0.4,
  });
  const led = new THREE.Mesh(
    new THREE.PlaneGeometry(D.ledScreen.w, D.ledScreen.h),
    ledMat
  );
  led.position.set(D.ledScreen.cx, D.ledScreen.cy, D.ledScreen.cz);
  scene.add(led);

  // LED bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(D.ledScreen.w + 0.4, D.ledScreen.h + 0.4, 0.1),
    new THREE.MeshStandardMaterial({ color: "#0a0a0c", roughness: 0.5 })
  );
  bezel.position.set(D.ledScreen.cx, D.ledScreen.cy, D.ledScreen.cz - 0.1);
  scene.add(bezel);

  // HOLLYWOOD lightbox on pedestal face
  const hwTex = makeHollywoodTexture();
  const lbMat = new THREE.MeshStandardMaterial({
    map: hwTex, emissive: "#ffe0a8", emissiveMap: hwTex,
    emissiveIntensity: 0.35, roughness: 0.55,
  });
  const lightbox = new THREE.Mesh(
    new THREE.PlaneGeometry(D.lightbox.w, D.lightbox.h),
    lbMat
  );
  lightbox.position.set(D.lightbox.cx, D.lightbox.cy, D.lightbox.cz);
  scene.add(lightbox);

  // Lightbox frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(D.lightbox.w + 0.3, D.lightbox.h + 0.3, 0.15),
    new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6 })
  );
  frame.position.set(D.lightbox.cx, D.lightbox.cy, D.lightbox.cz - 0.12);
  scene.add(frame);

  // Subtitle "ENTERTAINMENT CASINO"
  const subTex = makeSubtitleTexture();
  const subMat = new THREE.MeshStandardMaterial({ map: subTex, roughness: 0.75 });
  const sub = new THREE.Mesh(
    new THREE.PlaneGeometry(D.subLightbox.w, D.subLightbox.h),
    subMat
  );
  sub.position.set(D.subLightbox.cx, D.subLightbox.cy, D.subLightbox.cz);
  scene.add(sub);

  // Glass door block — centred, single entrance (not bifurcated)
  const doorMat = new THREE.MeshStandardMaterial({
    color: C.glassDoor, roughness: 0.15, metalness: 0.2,
    transparent: true, opacity: 0.72,
  });
  const doors = new THREE.Mesh(
    new THREE.BoxGeometry(D.doors.w, D.doors.h, 0.12),
    doorMat
  );
  doors.position.set(D.doors.cx, D.doors.h / 2 + 0.5, D.doors.cz + 0.15);
  scene.add(doors);

  // Door vertical mullions (frame divisions)
  for (let i = 0; i <= 4; i++) {
    const x = D.doors.cx - D.doors.w / 2 + (D.doors.w / 4) * i;
    const mul = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, D.doors.h, 0.2),
      new THREE.MeshStandardMaterial({ color: C.glassFrame, roughness: 0.4, metalness: 0.5 })
    );
    mul.position.set(x, D.doors.h / 2 + 0.5, D.doors.cz + 0.22);
    scene.add(mul);
  }

  // Door horizontal head + sill
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(D.doors.w + 0.3, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: C.glassFrame, roughness: 0.4, metalness: 0.5 })
  );
  head.position.set(D.doors.cx, D.doors.h + 0.5, D.doors.cz + 0.22);
  scene.add(head);

  // Plinth step under doors
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(D.doors.w + 2, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: "#a8a29a", roughness: 0.95 })
  );
  step.position.set(D.doors.cx, 0.25, D.doors.cz + 0.8);
  scene.add(step);
}

// Cantilevered wood pergola over drop-off drive
function buildPergola(scene) {
  const g = new THREE.Group();

  // Top slab (dark thin structural slab above the slats)
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(D.pergola.slabW, 0.25, D.pergola.slabD),
    new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.7 })
  );
  slab.position.set(D.pergola.cx, D.pergola.cy + 0.3, D.pergola.cz);
  slab.castShadow = true;
  g.add(slab);

  // Wood slats — horizontal, running east-west (long axis)
  const slatMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.75 });
  const slatUnderMat = new THREE.MeshStandardMaterial({ color: C.woodDark, roughness: 0.85 });
  const totalZ = D.pergola.slabD;
  const pitch = totalZ / D.pergola.slatCount;
  for (let i = 0; i < D.pergola.slatCount; i++) {
    const z = D.pergola.cz - totalZ / 2 + pitch * (i + 0.5);
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(D.pergola.slabW - 0.4, D.pergola.slatThick, pitch - D.pergola.slatGap),
      slatMat
    );
    slat.position.set(D.pergola.cx, D.pergola.cy + 0.1, z);
    slat.castShadow = true;
    slat.receiveShadow = true;
    g.add(slat);
    // underside faint facing
    const under = new THREE.Mesh(
      new THREE.BoxGeometry(D.pergola.slabW - 0.6, 0.02, pitch - D.pergola.slatGap - 0.02),
      slatUnderMat
    );
    under.position.set(D.pergola.cx, D.pergola.cy + 0.04, z);
    g.add(under);
  }

  // Front fascia (thin band south edge)
  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(D.pergola.slabW, 0.55, 0.25),
    new THREE.MeshStandardMaterial({ color: "#1f1f1f", roughness: 0.6 })
  );
  fascia.position.set(D.pergola.cx, D.pergola.cy + 0.15, D.pergola.cz + D.pergola.slabD / 2);
  fascia.castShadow = true;
  g.add(fascia);

  // Rear fixing band against the dark wall
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(D.pergola.slabW, 0.55, 0.18),
    new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.7 })
  );
  back.position.set(D.pergola.cx, D.pergola.cy + 0.15, D.pergola.cz - D.pergola.slabD / 2);
  g.add(back);

  // Columns (dark steel, south edge under front fascia) — 4 evenly spaced along east-west
  const colMat = new THREE.MeshStandardMaterial({
    color: C.column, roughness: 0.4, metalness: 0.65,
  });
  for (let i = 0; i < D.pergola.columnCount; i++) {
    const t = i / (D.pergola.columnCount - 1);
    const x = D.pergola.cx - D.pergola.slabW / 2 + 1.2 + t * (D.pergola.slabW - 2.4);
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(D.pergola.columnR, D.pergola.columnR, D.pergola.columnH, 16),
      colMat
    );
    col.position.set(x, D.pergola.columnH / 2, D.pergola.cz + D.pergola.slabD / 2 - 0.2);
    col.castShadow = true;
    g.add(col);
    // base plate
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: "#0a0a0a", roughness: 0.8 })
    );
    base.position.set(x, 0.075, D.pergola.cz + D.pergola.slabD / 2 - 0.2);
    g.add(base);
  }

  scene.add(g);
}

// Washingtonia palm — segmented trunk + droopy frond fan
function buildHedge(scene) {
  // Low hedge strip along median (south of drive) — palms removed per user request.
  for (let i = 0; i < 14; i++) {
    const x = -20 + i * 3.2;
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 + Math.random() * 0.15, 8, 6),
      new THREE.MeshStandardMaterial({ color: C.hedge, roughness: 0.95 })
    );
    bush.scale.y = 0.55;
    bush.position.set(x, 0.3, D.drive.cz + D.drive.d / 2 + 0.3);
    bush.castShadow = true;
    scene.add(bush);
  }
}

// Rooftop AC grid — decorative only (NOT click targets).
// Production EQUIPMENT_LIST doesn't include roof units; keeping them clickable would route
// to a selectedEquipment the sidebar/panel can't resolve.
function buildRoofAC(scene) {
  const roofY = D.main.h + 0.45;
  const cols = 5;
  const rows = 2;
  const spanW = D.main.w - 16;
  const spanD = D.main.d - 10;
  const x0 = D.main.cx - spanW / 2;
  const z0 = D.main.cz - spanD / 2 + 2;
  const pitchX = spanW / (cols - 1);
  const pitchZ = spanD / (rows - 1) * 0.45;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * pitchX;
      const z = z0 + r * pitchZ;
      const g = new THREE.Group();
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.1, 2.2),
        new THREE.MeshStandardMaterial({ color: C.acHousing, roughness: 0.6 })
      );
      housing.position.y = 0.55;
      housing.castShadow = true;
      housing.receiveShadow = true;
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.15, 1.4),
        new THREE.MeshStandardMaterial({ color: C.acVent, roughness: 0.5 })
      );
      vent.position.y = 1.15;
      g.add(housing);
      g.add(vent);
      g.position.set(x, roofY, z);
      scene.add(g);
    }
  }
}

// Back equipment — LOCKED spec by user
function buildBackEquipment(scene, equipRegistry) {
  const backZ = D.main.cz - D.main.d / 2 - 4; // 4m north of back wall

  // Unidad Paquete 1 (west)
  const paq1 = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.2, 2.5),
    new THREE.MeshStandardMaterial({ color: "#c8c4ba", roughness: 0.55, metalness: 0.3 })
  );
  paq1.position.set(-12, 1.1, backZ);
  paq1.castShadow = true;
  paq1.receiveShadow = true;
  paq1.userData = { ...META.pu1 };
  equipRegistry.push(paq1);
  scene.add(paq1);
  addPaqueteVents(scene, paq1.position);

  // Unidad Paquete 2 (east)
  const paq2 = paq1.clone();
  paq2.position.set(0, 1.1, backZ);
  paq2.userData = { ...META.pu2 };
  equipRegistry.push(paq2);
  scene.add(paq2);
  addPaqueteVents(scene, paq2.position);

  // Cisterna (ground-level cylindrical tank)
  const cist = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 2.6, 24),
    new THREE.MeshStandardMaterial({ color: C.cisterna, roughness: 0.7 })
  );
  cist.position.set(14, 1.3, backZ);
  cist.castShadow = true;
  cist.receiveShadow = true;
  cist.userData = { ...META.cis };
  equipRegistry.push(cist);
  scene.add(cist);
  // Tank top collar
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.15, 24),
    new THREE.MeshStandardMaterial({ color: "#8a8680", roughness: 0.7 })
  );
  collar.position.set(14, 2.68, backZ);
  scene.add(collar);

  // Extractor 1 (wall-mounted, west side of back wall) — z offset keeps housing fully outside main body
  const ext1 = makeExtractor();
  ext1.position.set(-22, 6, D.main.cz - D.main.d / 2 - 0.47);
  ext1.rotation.y = Math.PI; // face north (outward)
  ext1.userData = { ...META.ex1 };
  equipRegistry.push(ext1);
  scene.add(ext1);

  // Extractor 2 (east side)
  const ext2 = makeExtractor();
  ext2.position.set(22, 6, D.main.cz - D.main.d / 2 - 0.47);
  ext2.rotation.y = Math.PI;
  ext2.userData = { ...META.ex2 };
  equipRegistry.push(ext2);
  scene.add(ext2);

  // Small concrete pad under paquetes + cisterna
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.2, 5.5),
    new THREE.MeshStandardMaterial({ color: "#9a9690", roughness: 0.95 })
  );
  pad.position.set(0, 0.1, backZ);
  pad.receiveShadow = true;
  scene.add(pad);
}

function addPaqueteVents(scene, pos) {
  const vent = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.12, 1.8),
    new THREE.MeshStandardMaterial({ color: C.acVent, roughness: 0.5 })
  );
  vent.position.set(pos.x, pos.y + 1.18, pos.z);
  scene.add(vent);
  // side fan grille
  const grille = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 20),
    new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.8 })
  );
  grille.position.set(pos.x + 2.02, pos.y + 0.1, pos.z);
  grille.rotation.y = Math.PI / 2;
  scene.add(grille);
}

function makeExtractor() {
  const g = new THREE.Group();
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 0.9),
    new THREE.MeshStandardMaterial({ color: "#8a8680", roughness: 0.7, metalness: 0.2 })
  );
  housing.castShadow = true;
  g.add(housing);
  const fan = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 20),
    new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.5 })
  );
  fan.position.z = 0.46;
  g.add(fan);
  // fan blades as 3 rotated rectangles
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.18),
      new THREE.MeshStandardMaterial({ color: "#a8a4a0", roughness: 0.5, side: THREE.DoubleSide })
    );
    blade.position.z = 0.47;
    blade.rotation.z = (i * Math.PI * 2) / 3;
    g.add(blade);
  }
  return g;
}

// Adaptive camera params. Narrow/portrait viewports need a wider FOV AND a larger radius
// so the building fits the frame without clipping, WITH headroom for sky above and ground
// below. Desktop landscape keeps the previously-approved framing (~radius 46, vFov 48°).
function computeResponsive(aspect) {
  // vFov grows as aspect shrinks.
  const vFov = aspect >= 1.4 ? 48 : aspect >= 1.0 ? 52 : aspect >= 0.7 ? 58 : 68;
  // fillRatio tuned against user-approved references:
  //   desktop landscape aspect 1.78 → 0.78 (matches approved screenshot 162256)
  //   tablet / phone-with-sidebar aspect ~0.85 → 0.82 (matches approved screenshot 170402)
  //   very narrow phone portrait → 0.80 (enough sky + ground visible, building still readable)
  const fillRatio =
    aspect >= 1.4 ? 0.78 :
    aspect >= 1.0 ? 0.76 :
    aspect >= 0.7 ? 0.82 :
                    0.80;
  const vFovRad = (vFov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
  const targetWidth = 58; // building facade + pergola span
  const distance = targetWidth / fillRatio / 2 / Math.tan(hFov / 2);
  const radius = Math.max(36, Math.min(260, distance));
  return { vFov, radius };
}

function isLowPowerDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && window.innerWidth < 768)
  );
}

// ───────────────────────── Component ─────────────────────────

export default function CasinoHVAC3D({ onEquipmentClick, casinoName }) {
  const containerRef = useRef(null);
  void casinoName; // prop reserved for future signage — not rendered this iteration

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.sky);
    scene.fog = new THREE.Fog(C.sky, 140, 260);

    const initAspect = width / height;
    const initResp = computeResponsive(initAspect);
    const camera = new THREE.PerspectiveCamera(initResp.vFov, initAspect, 0.5, 800);
    // Orbit state — radius + fov come from aspect so the view is sane at every device size.
    // Target biased slightly east (x=3) so pergola (cx=6) and LED/lightbox pair read balanced.
    const orbit = { radius: initResp.radius, theta: Math.PI * 0.5, phi: Math.PI * 0.46, target: new THREE.Vector3(3, 6, 12) };
    function applyCamera() {
      const { radius, theta, phi, target } = orbit;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
    }
    applyCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight("#fff8ea", "#58584a", 0.55);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight("#ffffff", 0.25);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight("#fff3d0", 1.2);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    // Low-power devices get a smaller shadow map to reduce GPU load.
    const shadowRes = isLowPowerDevice() ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    // Build scene
    const equipRegistry = [];
    const ledCtl = makeLEDTexture();
    buildGroundPlane(scene);
    buildMainBuilding(scene);
    buildFacade(scene, ledCtl);
    buildPergola(scene);
    buildHedge(scene);
    buildRoofAC(scene);
    buildBackEquipment(scene, equipRegistry);

    // Interaction: drag (1 pointer) → orbit, pinch (2 pointers) → zoom, wheel → zoom.
    const dom = renderer.domElement;
    const pointers = new Map();
    let dragging = false;
    let lastX = 0, lastY = 0;
    let pressX = 0, pressY = 0;
    let pinchStartDist = 0;
    let pinchStartRadius = 0;

    const RADIUS_MIN = 28;
    const RADIUS_MAX = 260;

    function onDown(e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { dom.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      if (pointers.size === 1) {
        dragging = true;
        lastX = pressX = e.clientX;
        lastY = pressY = e.clientY;
      } else if (pointers.size === 2) {
        // Two fingers down → switch to pinch-zoom mode, suspend drag.
        dragging = false;
        const vals = Array.from(pointers.values());
        pinchStartDist = Math.hypot(vals[1].x - vals[0].x, vals[1].y - vals[0].y);
        pinchStartRadius = orbit.radius;
      }
    }
    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2 && pinchStartDist > 0) {
        const vals = Array.from(pointers.values());
        const dist = Math.hypot(vals[1].x - vals[0].x, vals[1].y - vals[0].y);
        if (dist > 1) {
          const ratio = pinchStartDist / dist;
          orbit.radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, pinchStartRadius * ratio));
          applyCamera();
        }
        return;
      }

      if (pointers.size === 1 && dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        orbit.theta -= dx * 0.005;
        orbit.phi = Math.max(0.12, Math.min(Math.PI * 0.48, orbit.phi - dy * 0.004));
        applyCamera();
      }
    }
    function onUp(e) {
      const wasSingle = pointers.size === 1;
      const moved = Math.hypot(e.clientX - pressX, e.clientY - pressY);
      pointers.delete(e.pointerId);
      try { dom.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      if (pointers.size < 2) pinchStartDist = 0;
      if (pointers.size === 0) {
        if (wasSingle && moved < 5) handleClick(e);
        dragging = false;
      }
    }
    function onCancel(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (pointers.size === 0) dragging = false;
    }
    function onWheel(e) {
      e.preventDefault();
      orbit.radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, orbit.radius + e.deltaY * 0.08));
      applyCamera();
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function handleClick(e) {
      if (typeof onEquipmentClick !== "function") return;
      const rect = dom.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      // Recursive intersect — children of extractor Groups need hits too; then walk up to the
      // registered parent carrying userData.id (matches niagara-casino App.jsx contract).
      const hits = raycaster.intersectObjects(equipRegistry, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.id) obj = obj.parent;
        if (obj && obj.userData && obj.userData.id) onEquipmentClick({ ...obj.userData });
      }
    }

    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // Resize — update aspect, re-derive FOV (orientation may have flipped portrait/landscape).
    // Radius is preserved so the user's manual zoom survives a resize.
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      const asp = w / h;
      camera.aspect = asp;
      const resp = computeResponsive(asp);
      camera.fov = resp.vFov;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    // Render loop
    let rafId = 0;
    const start = performance.now();
    function tick() {
      const t = (performance.now() - start) / 1000;
      ledCtl.draw(t);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    };
  }, [onEquipmentClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
    />
  );
}
