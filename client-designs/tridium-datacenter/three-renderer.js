/**
 * C3NTRO Telecom | Data Center Explorer
 * three-renderer.js — Interactive 3D floor plan renderer using Three.js
 *
 * Provides 3D view for LARGE data center (60 racks).
 * Assumes THREE (r128) is loaded globally.
 */
window.C3 = window.C3 || {};
window.C3.Utils = window.C3.Utils || {};

window.C3.Utils.ThreeRenderer = (function() {
  'use strict';

  // Capture THREE into this module's closure. This module is the ONLY user of
  // THREE, so the published build can delete the window.THREE global without
  // breaking rendering (see js/hide-three.js, injected by build.sh).
  var THREE = window.THREE;

  // ===== State =====
  var renderer = null;
  var scene = null;
  var cam = null;
  var animId = null;
  var container = null;
  var canvas = null;
  var leds = [];
  var rackMeshes = [];
  var hvacMeshes = [];
  var floorMeshes = [];
  var frameCount = 0;
  var currentSize = null;
  var currentHvacCount = 14;

  // Orbit state
  var drag = false;
  var prev = { x: 0, y: 0 };
  var sph = { t: 0, p: 0, r: 0 };
  var tgt = null;
  var lastTouchDist = 0;

  // Auto-rotate state
  var autoRotate = true;
  var lastInteraction = 0;
  var AUTO_ROTATE_DELAY = 4000; // ms before auto-rotate starts
  var AUTO_ROTATE_SPEED = 0.0008; // radians per frame

  // Camera animation state
  var camAnim = null;

  // Callbacks
  var hoverCallback = null;
  var clickCallback = null;
  var hvacHoverCallback = null;
  var hvacClickCallback = null;
  var roomClickCallback = null;

  // Raycasting
  var raycaster = null;
  var mouse = null;

  // Event handler references for cleanup
  var boundHandlers = {};

  // ===== Shared textures and materials =====
  var perfTex = null;
  var tileTex = null;
  var grillTex = null;
  var M = null;

  // Shared geometries
  var gRack = null;
  var gLed = null;

  // ===== Constants =====
  var RW = 0.6;
  var RD = 0.85;
  var RH = 2.0;
  var RG = 0.02;
  var FLOOR_H = 0.35;
  var MH = 3.0;

  // ===== Texture creation =====
  function mkPerfTex() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#0d0d18';
    for (var y = 4; y < 256; y += 6) {
      for (var x = 4; x < 128; x += 6) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function mkTileTex() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#d4d8e0';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#c0c4cc';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 62, 62);
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 40);
    g.addColorStop(0, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.03)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function mkGrillTex() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#aa2020';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#881818';
    for (var y = 0; y < 64; y += 5) {
      ctx.fillRect(0, y, 64, 2);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // ===== Material initialization =====
  function initMaterials() {
    perfTex = mkPerfTex();
    tileTex = mkTileTex();
    grillTex = mkGrillTex();

    M = {
      subFloor: new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.9 }),
      pedestal: new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.3 }),
      tile: new THREE.MeshPhysicalMaterial({
        map: tileTex,
        color: 0xd8dce8,
        roughness: 0.15,
        metalness: 0.25,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        reflectivity: 0.6
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xaabbcc, roughness: 0.05, transparent: true,
        opacity: 0.08, side: THREE.DoubleSide, depthWrite: false
      }),
      edge: new THREE.LineBasicMaterial({ color: 0x8899aa }),
      rack: new THREE.MeshStandardMaterial({ color: 0x2d2d3a, roughness: 0.3, metalness: 0.7 }),
      rDoor: new THREE.MeshStandardMaterial({ map: perfTex, color: 0x222233, roughness: 0.35, metalness: 0.6 }),
      rDoorFrame: new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.2, metalness: 0.8 }),
      ledG: new THREE.MeshBasicMaterial({ color: 0x4caf50 }),
      ledW: new THREE.MeshBasicMaterial({ color: 0xff9800 }),
      ledR: new THREE.MeshBasicMaterial({ color: 0xf44336 }),
      ledCyan: new THREE.MeshBasicMaterial({ color: 0x00bcd4 }),
      ledAmber: new THREE.MeshBasicMaterial({ color: 0xff8f00 }),
      ac: new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4, metalness: 0.2 }),
      acGrill: new THREE.MeshStandardMaterial({ map: grillTex, color: 0xcc2828, roughness: 0.5, metalness: 0.2 }),
      acVent: new THREE.MeshStandardMaterial({ color: 0xbb2020, roughness: 0.3, metalness: 0.4 }),
      plant: new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.3, metalness: 0.4 }),
      batt: new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.4, metalness: 0.5 }),
      aisle: new THREE.MeshStandardMaterial({ color: 0x4caf50, transparent: true, opacity: 0.08 }),
      tray: new THREE.MeshStandardMaterial({ color: 0x607080, roughness: 0.4, metalness: 0.6 }),
      duct: new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5, metalness: 0.4 }),
      cable: new THREE.MeshBasicMaterial({ color: 0x222244 }),
      cableBlue: new THREE.MeshBasicMaterial({ color: 0x1565c0 }),
      cableGreen: new THREE.MeshBasicMaterial({ color: 0x2e7d32 }),
      sensor: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.2 }),
      sensorScreen: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
      labelBg: new THREE.MeshBasicMaterial({ color: 0x1a73e8, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      ups: new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.5 })
    };

    gRack = new THREE.BoxGeometry(RW, RH, RD);
    gLed = new THREE.BoxGeometry(0.025, 0.018, 0.008);
  }

  // ===== Helper: get LED material based on rack status =====
  function getStatusLedMat(estado, rng) {
    if (estado === 'available') {
      return rng() > 0.3 ? M.ledCyan : M.ledG;
    }
    if (estado === 'maintenance') {
      return rng() > 0.3 ? M.ledAmber : M.ledW;
    }
    // operative
    var roll = rng();
    if (roll > 0.95) return M.ledR;
    if (roll > 0.82) return M.ledW;
    return M.ledG;
  }

  // Simple seeded PRNG for deterministic LED colors
  function seededRng(seed) {
    var s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  }

  // ===== Helper: create a single rack =====
  function mkRack(x, z, face, rackId) {
    var g = new THREE.Group();

    // Main body
    var b = new THREE.Mesh(gRack, M.rack);
    b.position.y = RH / 2 + FLOOR_H;
    b.castShadow = true;
    b.receiveShadow = true;
    b.userData.rackId = rackId;
    g.add(b);
    rackMeshes.push(b);

    // Perforated door with frame
    var dz = face === 1 ? RD / 2 + 0.018 : -RD / 2 - 0.018;

    var frame = new THREE.Mesh(new THREE.BoxGeometry(RW + 0.02, RH + 0.02, 0.015), M.rDoorFrame);
    frame.position.set(0, RH / 2 + FLOOR_H, dz);
    g.add(frame);

    var door = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.04, RH - 0.08, 0.012), M.rDoor);
    door.position.set(0, RH / 2 + FLOOR_H, dz + (face === 1 ? 0.008 : -0.008));
    g.add(door);

    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.03), M.rDoorFrame);
    handle.position.set(RW / 2 - 0.06, RH / 2 + FLOOR_H + 0.1, dz + (face === 1 ? 0.02 : -0.02));
    g.add(handle);

    // Determine LED colors by rack status
    var estado = 'operative';
    if (window.C3 && window.C3.Utils && window.C3.Utils.DataSimulator) {
      var data = window.C3.Utils.DataSimulator.getRackData(rackId);
      if (data && data.estado) {
        estado = data.estado;
      }
    }
    var rng = seededRng(parseInt(rackId, 10) + 9000);

    // LEDs (6 per rack)
    for (var i = 0; i < 6; i++) {
      var lMat = getStatusLedMat(estado, rng);
      var l = new THREE.Mesh(gLed, lMat);
      l.position.set(-RW / 2 + 0.06, 0.25 + i * 0.3 + FLOOR_H, dz + (face === 1 ? 0.02 : -0.02));
      g.add(l);
      leds.push(l);

      var l2Mat = getStatusLedMat(estado, rng);
      var l2 = new THREE.Mesh(gLed, l2Mat);
      l2.position.set(-RW / 2 + 0.1, 0.25 + i * 0.3 + FLOOR_H, dz + (face === 1 ? 0.02 : -0.02));
      g.add(l2);
      leds.push(l2);
    }

    // Rack feet/legs
    var legGeo = new THREE.BoxGeometry(0.04, FLOOR_H, 0.04);
    var legPositions = [
      [-RW / 2 + 0.05, -RD / 2 + 0.05],
      [-RW / 2 + 0.05, RD / 2 - 0.05],
      [RW / 2 - 0.05, -RD / 2 + 0.05],
      [RW / 2 - 0.05, RD / 2 - 0.05]
    ];
    for (var li = 0; li < legPositions.length; li++) {
      var leg = new THREE.Mesh(legGeo, M.pedestal);
      leg.position.set(legPositions[li][0], FLOOR_H / 2, legPositions[li][1]);
      g.add(leg);
    }

    g.position.set(x, 0, z);
    return g;
  }

  // ===== Helper: AC unit =====
  function mkAC(x, z, ry, hvacId) {
    var g = new THREE.Group();

    var body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.4), M.ac);
    body.position.y = 1.7 + FLOOR_H;
    body.castShadow = true;
    if (hvacId) {
      body.userData.hvacId = hvacId;
      hvacMeshes.push(body);
    }
    g.add(body);

    var grill = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.03), M.acGrill);
    grill.position.set(0, 1.7 + FLOOR_H, 0.2);
    g.add(grill);

    var vent = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.3), M.acVent);
    vent.position.set(0, 1.7 + 0.43 + FLOOR_H, 0);
    g.add(vent);

    var sled = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), M.ledG);
    sled.position.set(0.28, 1.7 + 0.35 + FLOOR_H, 0.21);
    g.add(sled);

    var pipe1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), M.duct);
    pipe1.position.set(-0.2, 1.7 + 0.55 + FLOOR_H, 0);
    g.add(pipe1);
    var pipe2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), M.duct);
    pipe2.position.set(0.2, 1.7 + 0.55 + FLOOR_H, 0);
    g.add(pipe2);

    g.position.set(x, 0, z);
    g.rotation.y = ry;
    return g;
  }

  // ===== Helper: edge line =====
  function mkEdge(pts) {
    var points = [];
    for (var i = 0; i < pts.length; i++) {
      points.push(new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), M.edge);
  }

  // ===== Helper: glass wall =====
  function mkGlass(dc, w, h, px, py, pz, ry) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass);
    m.position.set(px, py, pz);
    m.rotation.y = ry;
    dc.add(m);
  }

  // ===== Helper: text label material =====
  function mkTextLabel(text, col, fs, cw) {
    var c = document.createElement('canvas');
    c.width = cw; c.height = 48;
    var x = c.getContext('2d');
    x.fillStyle = col;
    x.font = 'bold ' + fs + 'px sans-serif';
    x.fillText(text, 8, 34);
    return new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  // ===== Helper: row label (floating tag) =====
  function mkRowLabel(text, x, z) {
    var g = new THREE.Group();

    var bg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.02), M.labelBg);
    bg.position.y = RH + FLOOR_H + 0.5;
    g.add(bg);

    var c = document.createElement('canvas');
    c.width = 180; c.height = 48;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(text, 10, 34);
    var mat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      side: THREE.DoubleSide
    });
    var txt = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.22), mat);
    txt.position.y = RH + FLOOR_H + 0.5;
    txt.position.z = 0.011;
    g.add(txt);

    var pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.4, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x4488cc })
    );
    pole.position.y = RH + FLOOR_H + 0.2;
    g.add(pole);

    g.position.set(x, 0, z);
    return g;
  }

  // ===== Helper: temperature sensor =====
  function mkSensor(x, z) {
    var g = new THREE.Group();

    var pole = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.2, 0.025), M.sensor);
    pole.position.y = 0.6 + FLOOR_H;
    g.add(pole);

    var box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), M.sensor);
    box.position.y = 1.25 + FLOOR_H;
    g.add(box);

    var scr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.005), M.sensorScreen);
    scr.position.set(0, 1.25 + FLOOR_H, 0.023);
    g.add(scr);

    var led = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.005), M.ledG);
    led.position.set(0.025, 1.28 + FLOOR_H, 0.023);
    g.add(led);

    g.position.set(x, 0, z);
    return g;
  }

  // ===== Helper: cable bundle =====
  function mkCable(x, z, trayY, mat) {
    var pts = [];
    var startY = RH + FLOOR_H + 0.05;
    var endY = trayY - 0.05;
    var steps = 6;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var y = startY + (endY - startY) * t;
      var wobble = Math.sin(t * Math.PI) * 0.08;
      pts.push(new THREE.Vector3(x + wobble, y, z));
    }
    var curve = new THREE.CatmullRomCurve3(pts);
    var geo = new THREE.TubeGeometry(curve, 8, 0.015, 4, false);
    return new THREE.Mesh(geo, mat);
  }

  // ===== Helper: raised floor (sub-floor + pedestals + tiles) =====
  function buildRaisedFloor(dc, MW, MD, zo) {
    var zE = zo + MD;

    // Sub-floor concrete
    var subFloor = new THREE.Mesh(
      new THREE.BoxGeometry(MW + 0.5, 0.08, MD + 0.5),
      M.subFloor
    );
    subFloor.position.set(0, -0.04, zo + MD / 2);
    subFloor.receiveShadow = true;
    dc.add(subFloor);

    // Pedestals
    var hw = MW / 2;
    var pedGeo = new THREE.BoxGeometry(0.06, FLOOR_H - 0.04, 0.06);
    var pedTopGeo = new THREE.BoxGeometry(0.14, 0.02, 0.14);
    var pedSpacing = 0.6;
    for (var px = -hw + pedSpacing / 2; px < hw; px += pedSpacing) {
      for (var pz = zo + pedSpacing / 2; pz < zE; pz += pedSpacing) {
        var ped = new THREE.Mesh(pedGeo, M.pedestal);
        ped.position.set(px, (FLOOR_H - 0.04) / 2, pz);
        dc.add(ped);
        var top = new THREE.Mesh(pedTopGeo, M.pedestal);
        top.position.set(px, FLOOR_H - 0.02, pz);
        dc.add(top);
      }
    }

    // Reflective floor tiles
    var tileSize = 0.6;
    var tileGeo = new THREE.BoxGeometry(tileSize - 0.008, 0.03, tileSize - 0.008);
    for (var tx = -hw + tileSize / 2; tx < hw; tx += tileSize) {
      for (var tz = zo + tileSize / 2; tz < zE; tz += tileSize) {
        var tile = new THREE.Mesh(tileGeo, M.tile);
        tile.position.set(tx, FLOOR_H - 0.005, tz);
        tile.receiveShadow = true;
        dc.add(tile);
      }
    }

    // Invisible floor plane for room click detection
    var floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(MW, MD),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, FLOOR_H + 0.04, zo + MD / 2);
    floorPlane.userData.isFloor = true;
    floorMeshes.push(floorPlane);
    dc.add(floorPlane);
  }

  // ===== Helper: transparent walls + edges + ceiling =====
  function buildWalls(dc, MW, MD, zo) {
    var hw = MW / 2;
    var zS = zo;
    var zE = zo + MD;
    var ym = MH / 2;

    // Glass walls (front, left, right)
    mkGlass(dc, MW, MH, 0, ym, zS, 0);
    mkGlass(dc, MD, MH, -hw, ym, zo + MD / 2, Math.PI / 2);
    mkGlass(dc, MD, MH, hw, ym, zo + MD / 2, -Math.PI / 2);

    // Back wall
    mkGlass(dc, MW, MH, 0, ym, zE, 0);

    // Edges
    dc.add(mkEdge([[-hw, 0, zS], [hw, 0, zS], [hw, MH, zS], [-hw, MH, zS], [-hw, 0, zS]]));
    dc.add(mkEdge([[-hw, 0, zE], [hw, 0, zE], [hw, MH, zE], [-hw, MH, zE], [-hw, 0, zE]]));
    dc.add(mkEdge([[-hw, 0, zS], [-hw, 0, zE]]));
    dc.add(mkEdge([[-hw, MH, zS], [-hw, MH, zE]]));
    dc.add(mkEdge([[hw, 0, zS], [hw, 0, zE]]));
    dc.add(mkEdge([[hw, MH, zS], [hw, MH, zE]]));
    dc.add(mkEdge([[-hw, MH, zS], [hw, MH, zS], [hw, MH, zE], [-hw, MH, zE], [-hw, MH, zS]]));

    // Vertical corners
    var corners = [[-hw, zS], [hw, zS], [hw, zE], [-hw, zE]];
    for (var ci = 0; ci < corners.length; ci++) {
      dc.add(mkEdge([[corners[ci][0], 0, corners[ci][1]], [corners[ci][0], MH, corners[ci][1]]]));
    }

    // Transparent ceiling
    var cl = new THREE.Mesh(new THREE.BoxGeometry(MW, 0.02, MD), M.glass);
    cl.position.set(0, MH, zo + MD / 2);
    dc.add(cl);
  }

  // ===== Helper: cable trays =====
  function buildCableTrays(dc, MW, MD, zo, trayY) {
    var zE = zo + MD;
    var cableMats = [M.cable, M.cableBlue, M.cableGreen];
    var trayGeo = new THREE.BoxGeometry(MW - 0.6, 0.035, 0.25);
    var traySideGeo = new THREE.BoxGeometry(MW - 0.6, 0.06, 0.02);

    for (var tz = zo + 1.5; tz < zE - 0.5; tz += 2.2) {
      var tr = new THREE.Mesh(trayGeo, M.tray);
      tr.position.set(0, trayY, tz);
      dc.add(tr);

      var s1 = new THREE.Mesh(traySideGeo, M.tray);
      s1.position.set(0, trayY + 0.03, tz - 0.115);
      dc.add(s1);
      var s2 = new THREE.Mesh(traySideGeo, M.tray);
      s2.position.set(0, trayY + 0.03, tz + 0.115);
      dc.add(s2);

      // Horizontal cable bundles
      for (var ci = 0; ci < 3; ci++) {
        var cGeo = new THREE.BoxGeometry(MW - 1.5, 0.025, 0.04);
        var cb = new THREE.Mesh(cGeo, cableMats[ci]);
        cb.position.set(0, trayY + 0.04 + ci * 0.03, tz + (ci - 1) * 0.06);
        dc.add(cb);
      }
    }
  }

  // ===== Helper: UPS zone =====
  function buildUPS(dc, x, z, w, d, label) {
    var h = 1.3;
    var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.ups);
    body.position.set(x, h / 2 + FLOOR_H, z);
    body.castShadow = true;
    dc.add(body);

    // Status LED
    var sled = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), M.ledG);
    sled.position.set(x + w / 2 - 0.1, h / 2 + FLOOR_H + 0.4, z + d / 2 + 0.01);
    dc.add(sled);

    // Label
    var lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.8, 0.25),
      mkTextLabel(label, '#ffffff', 20, 256)
    );
    lbl.position.set(x, h + FLOOR_H + 0.2, z + d / 2 + 0.01);
    dc.add(lbl);
  }

  // ================================================================
  //  LARGE DATA CENTER (60 racks, 6 horizontal rows of 10)
  //  Adapted from reference: datacenter-3d (2).html
  // ================================================================
  function buildLarge() {
    var dc = new THREE.Group();
    var MW_l = 9.427;
    var MD_l;
    var NR_l = 12;
    var rowW = NR_l * (RW + RG);

    // Row layout (from reference)
    var margin = 0.6;
    var z = margin;
    var r1 = z + RD / 2; z += RD;
    var a1z = z + 1.17 / 2; z += 1.17;
    var r2 = z + RD / 2; z += RD;
    var a2z = z + 1.17 / 2; z += 1.17;
    var r3 = z + RD / 2; z += RD;
    var a3z = z + 1.16 / 2; z += 1.16;
    z += 0.3; var centerZ = z + 0.5; z += 1.0; z += 0.3;
    var a4z = z + 1.12 / 2; z += 1.12;
    var r4 = z + RD / 2; z += RD;
    var a5z = z + 1.12 / 2; z += 1.12;
    var r5 = z + RD / 2; z += RD + margin;
    MD_l = z;

    var hw = MW_l / 2;
    var zo = -MD_l / 2;
    var zS = zo;
    var zE = zo + MD_l;
    var trayY = MH - 0.22;

    // Raised floor + walls
    buildRaisedFloor(dc, MW_l, MD_l, zo);
    buildWalls(dc, MW_l, MD_l, zo);

    // 5 rows of 10 racks in main room (rows 1-5 = racks 01-50)
    // Row 6 (racks 51-60) in bottom room
    var NR_main = 10;
    var mainRowW = NR_main * (RW + RG);
    var sx = -mainRowW / 2 + RW / 2;
    var rowZs = [r1, r2, r3, r4, r5];
    var rowNames = ['Fila 1', 'Fila 2', 'Fila 3', 'Fila 4', 'Fila 5'];
    var startIds = [1, 11, 21, 31, 41];
    var cableMats = [M.cable, M.cableBlue, M.cableGreen];

    for (var ri = 0; ri < rowZs.length; ri++) {
      for (var i = 0; i < NR_main; i++) {
        var rackNum = startIds[ri] + i;
        var rackId = rackNum < 10 ? '0' + rackNum : '' + rackNum;
        dc.add(mkRack(sx + i * (RW + RG), zo + rowZs[ri], 1, rackId));

        if (i % 3 === 0) {
          dc.add(mkCable(sx + i * (RW + RG), zo + rowZs[ri], trayY, cableMats[i % 3]));
        }
      }
      dc.add(mkRowLabel(rowNames[ri], -mainRowW / 2 - 0.7, zo + rowZs[ri]));
    }

    // Aisle markers + sensors
    var aisles = [
      { z: a1z, w: 1.17 }, { z: a2z, w: 1.17 }, { z: a3z, w: 1.16 },
      { z: a4z, w: 1.12 }, { z: a5z, w: 1.12 }
    ];
    for (var ai = 0; ai < aisles.length; ai++) {
      var a = aisles[ai];
      var am = new THREE.Mesh(new THREE.BoxGeometry(mainRowW, 0.005, a.w), M.aisle);
      am.position.set(0, FLOOR_H + 0.005, zo + a.z);
      dc.add(am);

      dc.add(mkSensor(-mainRowW / 2 + 0.5, zo + a.z));
      dc.add(mkSensor(mainRowW / 2 - 0.5, zo + a.z));
    }

    // Center zone: plants + batteries
    var cz = zo + centerZ;
    var pg = new THREE.BoxGeometry(1.1, 1.5, 0.85);
    for (var pi = 0; pi < 2; pi++) {
      var p = new THREE.Mesh(pg, M.plant);
      p.position.set(-MW_l / 4 + pi * 1.3, 0.75 + FLOOR_H, cz);
      p.castShadow = true;
      dc.add(p);
    }
    var bg = new THREE.BoxGeometry(0.65, 1.3, 0.75);
    for (var bi = 0; bi < 5; bi++) {
      var b = new THREE.Mesh(bg, M.batt);
      b.position.set(-MW_l / 4 + 3.0 + bi * 0.75, 0.65 + FLOOR_H, cz);
      b.castShadow = true;
      dc.add(b);
    }
    // Labels
    var plbl = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.3),
      mkTextLabel('PLANTAS', '#1565c0', 24, 256)
    );
    plbl.position.set(-MW_l / 4 + 0.6, 1.65 + FLOOR_H, cz + 0.44);
    dc.add(plbl);
    var blbl = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.3),
      mkTextLabel('BANCO DE BATERIAS', '#444', 22, 440)
    );
    blbl.position.set(-MW_l / 4 + 4.5, 1.45 + FLOOR_H, cz + 0.44);
    dc.add(blbl);

    // AC units — distributed evenly per side based on currentHvacCount
    var perSide = Math.ceil(currentHvacCount / 2);
    var lrgHvacNum = 1;
    for (var aci = 0; aci < perSide; aci++) {
      var az = zo + 1.2 + aci * (MD_l - 2.4) / Math.max(perSide - 1, 1);
      // Left side
      if (lrgHvacNum <= currentHvacCount) {
        var lrgHvacIdL = lrgHvacNum < 10 ? '0' + lrgHvacNum : '' + lrgHvacNum;
        dc.add(mkAC(-hw + 0.22, az, Math.PI / 2, lrgHvacIdL));
        lrgHvacNum++;
      }
      // Right side
      if (lrgHvacNum <= currentHvacCount) {
        var lrgHvacIdR = lrgHvacNum < 10 ? '0' + lrgHvacNum : '' + lrgHvacNum;
        dc.add(mkAC(hw - 0.22, az, -Math.PI / 2, lrgHvacIdR));
        lrgHvacNum++;
      }
    }

    // Cable trays
    buildCableTrays(dc, MW_l, MD_l, zo, trayY);

    // Ductwork
    var dH = MH - RH - FLOOR_H - 0.2;
    var dv = new THREE.Mesh(new THREE.BoxGeometry(0.28, dH, 0.28), M.duct);
    dv.position.set(hw - 0.7, RH + FLOOR_H + dH / 2, cz - 0.5);
    dc.add(dv);
    var dh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.8), M.duct);
    dh.position.set(hw - 0.7, MH - 0.25, cz - 1.5);
    dc.add(dh);

    // Fire suppression
    var fire = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xcc3333 })
    );
    fire.position.set(hw - 0.12, 1.5 + FLOOR_H, cz + 0.5);
    dc.add(fire);

    // Dividing wall
    var divZ = zE;
    mkGlass(dc, MW_l, MH, 0, MH / 2, divZ, 0);
    dc.add(mkEdge([[-hw, 0, divZ], [hw, 0, divZ]]));
    dc.add(mkEdge([[-hw, MH, divZ], [hw, MH, divZ]]));

    // Bottom room (10 racks = row 6, racks 51-60)
    var BW = 7.0;
    var BD = 3.2;
    var BH = 2.2;
    var bx = hw - BW / 2 - 0.3;
    var bz = divZ + 0.075 + BD / 2;

    // Sub-floor for bottom room
    var bsf = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.08, BD), M.subFloor);
    bsf.position.set(bx, -0.04, bz);
    dc.add(bsf);

    // Tiles
    var tileSize = 0.6;
    var tileGeo = new THREE.BoxGeometry(tileSize - 0.008, 0.03, tileSize - 0.008);
    for (var tx = -BW / 2 + tileSize / 2; tx < BW / 2; tx += tileSize) {
      for (var tz = -BD / 2 + tileSize / 2; tz < BD / 2; tz += tileSize) {
        var tile = new THREE.Mesh(tileGeo, M.tile);
        tile.position.set(bx + tx, FLOOR_H - 0.005, bz + tz);
        tile.receiveShadow = true;
        dc.add(tile);
      }
    }

    // Walls
    mkGlass(dc, BW, BH, bx, BH / 2, bz + BD / 2, Math.PI);
    mkGlass(dc, BD, BH, bx + BW / 2, BH / 2, bz, -Math.PI / 2);
    mkGlass(dc, BD, BH, bx - BW / 2, BH / 2, bz, Math.PI / 2);

    var bx1 = bx - BW / 2;
    var bx2 = bx + BW / 2;
    var bz1 = bz - BD / 2;
    var bz2 = bz + BD / 2;
    dc.add(mkEdge([[bx1, 0, bz1], [bx2, 0, bz1], [bx2, 0, bz2], [bx1, 0, bz2], [bx1, 0, bz1]]));
    dc.add(mkEdge([[bx1, BH, bz1], [bx2, BH, bz1], [bx2, BH, bz2], [bx1, BH, bz2], [bx1, BH, bz1]]));
    var bCorners = [[bx1, bz1], [bx2, bz1], [bx2, bz2], [bx1, bz2]];
    for (var bci = 0; bci < bCorners.length; bci++) {
      dc.add(mkEdge([[bCorners[bci][0], 0, bCorners[bci][1]], [bCorners[bci][0], BH, bCorners[bci][1]]]));
    }

    var bc = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.02, BD), M.glass);
    bc.position.set(bx, BH, bz);
    dc.add(bc);

    // 10 racks in bottom room (row 6: IDs 51-60)
    var bNR = 10;
    var bsx = bx - (bNR * (RW + RG)) / 2 + RW / 2;
    for (var bri = 0; bri < bNR; bri++) {
      var bRackNum = 51 + bri;
      var bRackId = '' + bRackNum;
      dc.add(mkRack(bsx + bri * (RW + RG), bz, 1, bRackId));
    }
    dc.add(mkRowLabel('Fila 6', bsx - 0.8, bz));

    return dc;
  }

  // ===== Lighting setup =====
  function setupLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    scene.add(new THREE.HemisphereLight(0xe8f0ff, 0xd0d0d0, 0.5));

    var sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    var fill = new THREE.DirectionalLight(0xddeeff, 0.3);
    fill.position.set(-8, 12, -6);
    scene.add(fill);

    var bounce = new THREE.PointLight(0x88aacc, 0.2, 20);
    bounce.position.set(0, 0.5, 0);
    scene.add(bounce);

    var grid = new THREE.GridHelper(40, 40, 0xc8c8c8, 0xdddfe3);
    grid.position.y = -0.08;
    scene.add(grid);
  }

  // ===== Orbit controls =====
  function updateCamera() {
    var p = Math.max(0.08, Math.min(Math.PI - 0.08, sph.p));
    cam.position.set(
      tgt.x + sph.r * Math.sin(p) * Math.sin(sph.t),
      tgt.y + sph.r * Math.cos(p),
      tgt.z + sph.r * Math.sin(p) * Math.cos(sph.t)
    );
    cam.lookAt(tgt);
  }

  function animateCamera(tt, tp, tr, newTgt, dur) {
    var st = sph.t;
    var sp = sph.p;
    var sr = sph.r;
    var st2 = tgt.clone();
    var startTime = performance.now();

    camAnim = {
      active: true,
      update: function(now) {
        var t = Math.min(1, (now - startTime) / dur);
        // Smoothstep
        t = t * t * (3 - 2 * t);
        sph.t = st + (tt - st) * t;
        sph.p = sp + (tp - sp) * t;
        sph.r = sr + (tr - sr) * t;
        tgt.lerpVectors(st2, newTgt, t);
        updateCamera();
        if (t >= 1) {
          camAnim.active = false;
        }
      }
    };
  }

  // ===== Default camera parameters =====
  function getDefaultCam() {
    return { t: Math.PI / 4.5, p: Math.PI / 3.2, r: 26, tgt: new THREE.Vector3(0, 1.5, 1) };
  }

  // ===== Event handlers =====
  function onMouseDown(e) {
    if (e.button === 0) drag = true;
    prev = { x: e.clientX, y: e.clientY };
    lastInteraction = performance.now();
    autoRotate = false;
  }

  function onMouseMove(e) {
    var dx = e.clientX - prev.x;
    var dy = e.clientY - prev.y;

    if (drag) {
      sph.t -= dx * 0.005;
      sph.p = Math.max(0.12, Math.min(Math.PI - 0.12, sph.p + dy * 0.005));
      updateCamera();
    }
    prev = { x: e.clientX, y: e.clientY };

    // Raycasting for hover
    doRaycast(e, false);
  }

  function onMouseUp() {
    drag = false;
    lastInteraction = performance.now();
  }

  function onMouseLeave() {
    drag = false;
    if (hoverCallback) {
      hoverCallback(null);
    }
    if (hvacHoverCallback) {
      hvacHoverCallback(null);
    }
  }

  function onWheel(e) {
    sph.r = Math.max(3, Math.min(50, sph.r + e.deltaY * 0.012));
    updateCamera();
    lastInteraction = performance.now();
    autoRotate = false;
    e.preventDefault();
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function onClick(e) {
    doRaycast(e, true);
  }

  function onTouchStart(e) {
    lastInteraction = performance.now();
    autoRotate = false;
    if (e.touches.length === 1) {
      drag = true;
      prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      drag = false;
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && drag) {
      var dx = e.touches[0].clientX - prev.x;
      var dy = e.touches[0].clientY - prev.y;
      sph.t -= dx * 0.004;
      sph.p = Math.max(0.12, Math.min(Math.PI - 0.12, sph.p + dy * 0.004));
      updateCamera();
      prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      var tdx = e.touches[0].clientX - e.touches[1].clientX;
      var tdy = e.touches[0].clientY - e.touches[1].clientY;
      var d = Math.sqrt(tdx * tdx + tdy * tdy);
      sph.r = Math.max(3, Math.min(50, sph.r + (lastTouchDist - d) * 0.05));
      lastTouchDist = d;
      updateCamera();
    }
  }

  function onTouchEnd() {
    drag = false;
    lastInteraction = performance.now();
  }

  function onResize() {
    if (!renderer || !cam || !container) return;
    var w = container.clientWidth;
    var h = container.clientHeight;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ===== Raycasting =====
  function doRaycast(e, isClick) {
    if (!raycaster || !cam || !renderer) return;
    if (!rackMeshes.length && !hvacMeshes.length && !floorMeshes.length) return;

    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, cam);

    // Check HVAC meshes FIRST (higher priority)
    if (hvacMeshes.length) {
      var hvacHits = raycaster.intersectObjects(hvacMeshes, false);
      if (hvacHits.length > 0) {
        var hvacHit = hvacHits[0].object;
        var hvacId = hvacHit.userData.hvacId;
        if (hvacId) {
          renderer.domElement.style.cursor = 'pointer';
          if (isClick && hvacClickCallback) {
            hvacClickCallback(hvacId);
          } else if (!isClick && hvacHoverCallback) {
            // Clear rack hover when hovering HVAC
            if (hoverCallback) { hoverCallback(null); }
            hvacHoverCallback(hvacId, e.clientX, e.clientY);
          }
          return;
        }
      }
    }

    // Check rack meshes (hover only, no click navigation)
    if (rackMeshes.length) {
      var rackHits = raycaster.intersectObjects(rackMeshes, false);
      if (rackHits.length > 0) {
        var rackHit = rackHits[0].object;
        var rackId = rackHit.userData.rackId;
        if (rackId) {
          renderer.domElement.style.cursor = 'default';
          if (!isClick && hoverCallback) {
            // Clear HVAC hover when hovering rack
            if (hvacHoverCallback) { hvacHoverCallback(null); }
            hoverCallback(rackId, e.clientX, e.clientY);
          }
          return;
        }
      }
    }

    // Check floor (click only -- navigates to room view)
    if (isClick && floorMeshes.length) {
      var floorHits = raycaster.intersectObjects(floorMeshes, false);
      if (floorHits.length > 0) {
        renderer.domElement.style.cursor = 'default';
        if (roomClickCallback) {
          roomClickCallback();
        }
        return;
      }
    }

    // No hit at all
    if (renderer.domElement) {
      renderer.domElement.style.cursor = 'default';
    }
    if (!isClick && hoverCallback) {
      hoverCallback(null);
    }
    if (!isClick && hvacHoverCallback) {
      hvacHoverCallback(null);
    }
  }

  // ===== Animation loop =====
  function animate() {
    animId = requestAnimationFrame(animate);

    // Camera animation
    if (camAnim && camAnim.active) {
      camAnim.update(performance.now());
    }

    // Auto-rotate when idle
    if (!drag && !autoRotate && performance.now() - lastInteraction > AUTO_ROTATE_DELAY) {
      autoRotate = true;
    }
    if (autoRotate && !drag) {
      sph.t += AUTO_ROTATE_SPEED;
      updateCamera();
    }

    // LED blink
    frameCount++;
    if (frameCount % 15 === 0 && leds.length) {
      for (var n = 0; n < 3; n++) {
        var idx = Math.floor(Math.random() * leds.length);
        leds[idx].visible = !leds[idx].visible;
      }
    }

    renderer.render(scene, cam);
  }

  // ===== Attach event listeners =====
  function attachEvents() {
    var c = renderer.domElement;

    boundHandlers.mousedown = onMouseDown;
    boundHandlers.mousemove = onMouseMove;
    boundHandlers.mouseup = onMouseUp;
    boundHandlers.mouseleave = onMouseLeave;
    boundHandlers.wheel = onWheel;
    boundHandlers.contextmenu = onContextMenu;
    boundHandlers.click = onClick;
    boundHandlers.touchstart = onTouchStart;
    boundHandlers.touchmove = onTouchMove;
    boundHandlers.touchend = onTouchEnd;
    boundHandlers.resize = onResize;

    c.addEventListener('mousedown', boundHandlers.mousedown);
    c.addEventListener('mousemove', boundHandlers.mousemove);
    c.addEventListener('mouseup', boundHandlers.mouseup);
    c.addEventListener('mouseleave', boundHandlers.mouseleave);
    c.addEventListener('wheel', boundHandlers.wheel, { passive: false });
    c.addEventListener('contextmenu', boundHandlers.contextmenu);
    c.addEventListener('click', boundHandlers.click);
    c.addEventListener('touchstart', boundHandlers.touchstart, { passive: false });
    c.addEventListener('touchmove', boundHandlers.touchmove, { passive: false });
    c.addEventListener('touchend', boundHandlers.touchend);
    window.addEventListener('resize', boundHandlers.resize);
  }

  // ===== Detach event listeners =====
  function detachEvents() {
    if (!renderer) return;
    var c = renderer.domElement;

    c.removeEventListener('mousedown', boundHandlers.mousedown);
    c.removeEventListener('mousemove', boundHandlers.mousemove);
    c.removeEventListener('mouseup', boundHandlers.mouseup);
    c.removeEventListener('mouseleave', boundHandlers.mouseleave);
    c.removeEventListener('wheel', boundHandlers.wheel);
    c.removeEventListener('contextmenu', boundHandlers.contextmenu);
    c.removeEventListener('click', boundHandlers.click);
    c.removeEventListener('touchstart', boundHandlers.touchstart);
    c.removeEventListener('touchmove', boundHandlers.touchmove);
    c.removeEventListener('touchend', boundHandlers.touchend);
    window.removeEventListener('resize', boundHandlers.resize);

    boundHandlers = {};
  }

  // ===== Dispose helper =====
  function disposeNode(node) {
    if (node.geometry) {
      node.geometry.dispose();
    }
    if (node.material) {
      if (Array.isArray(node.material)) {
        for (var i = 0; i < node.material.length; i++) {
          disposeMaterial(node.material[i]);
        }
      } else {
        disposeMaterial(node.material);
      }
    }
  }

  function disposeMaterial(mat) {
    if (mat.map) mat.map.dispose();
    if (mat.lightMap) mat.lightMap.dispose();
    if (mat.bumpMap) mat.bumpMap.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.specularMap) mat.specularMap.dispose();
    if (mat.envMap) mat.envMap.dispose();
    mat.dispose();
  }

  // ================================================================
  //  PUBLIC API
  // ================================================================

  /**
   * init(containerId, size, hvacCount)
   * Creates the Three.js scene inside the given DOM element.
   * @param {string} containerId - DOM element ID to contain the renderer
   * @param {string} size - 'large'
   * @param {number} [hvacCount] - Number of HVAC units for this location (default 14)
   */
  // Invisible geometric watermark: encodes an owner id into vertex positions at
  // a far, zero-opacity locus. frustumCulled=false forces it to be submitted to
  // the GPU every frame, so it travels inside any runtime-extracted mesh and
  // lets us prove a stolen copy is ours. NOTE: a determined attacker can detect
  // and strip it — this is evidence, not prevention.
  function addSignature(scn) {
    var payload = 'PANDUIT-C3NTRO-DTCR-2026';
    var pos = [];
    for (var i = 0; i < payload.length; i++) {
      pos.push(i * 0.0001, payload.charCodeAt(i) * 0.0001, -9999);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    var mat = new THREE.PointsMaterial({
      size: 0.0001, transparent: true, opacity: 0,
      depthTest: false, depthWrite: false
    });
    var sig = new THREE.Points(geo, mat);
    sig.frustumCulled = false;
    sig.renderOrder = -1;
    scn.add(sig);
  }

  function init(containerId, size, hvacCount) {
    // Clean up any previous scene
    if (renderer) {
      destroy();
    }

    container = document.getElementById(containerId);
    if (!container) {
      console.error('ThreeRenderer: container "' + containerId + '" not found');
      return;
    }

    currentSize = 'large';
    currentHvacCount = (typeof hvacCount === 'number' && hvacCount > 0) ? hvacCount : 14;

    // Reset state
    leds = [];
    rackMeshes = [];
    hvacMeshes = [];
    floorMeshes = [];
    frameCount = 0;
    drag = false;
    camAnim = null;
    lastInteraction = performance.now();

    // Create canvas
    canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Renderer
    var w = container.clientWidth;
    var h = container.clientHeight;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xeef1f5, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef1f5);

    // Camera
    cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 250);

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Materials + shared geometry
    initMaterials();

    // Build the datacenter
    var dcGroup = buildLarge();
    scene.add(dcGroup);

    // Ownership signature embedded into the rendered geometry buffers.
    addSignature(scene);

    // Lighting
    setupLighting();

    // Default camera position
    var defaults = getDefaultCam();
    sph.t = defaults.t;
    sph.p = defaults.p;
    sph.r = defaults.r;
    tgt = defaults.tgt.clone();
    updateCamera();

    // Attach events
    attachEvents();

    // Start animation loop
    animate();
  }

  /**
   * destroy()
   * Cleans up scene, renderer, event listeners, and stops animation.
   */
  function destroy() {
    // Stop animation
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    // Detach events
    detachEvents();

    // Dispose scene
    if (scene) {
      scene.traverse(function(node) {
        disposeNode(node);
      });
      scene = null;
    }

    // Dispose shared materials
    if (M) {
      var keys = Object.keys(M);
      for (var i = 0; i < keys.length; i++) {
        if (M[keys[i]] && M[keys[i]].dispose) {
          disposeMaterial(M[keys[i]]);
        }
      }
      M = null;
    }

    // Dispose shared geometries
    if (gRack) { gRack.dispose(); gRack = null; }
    if (gLed) { gLed.dispose(); gLed = null; }

    // Dispose textures
    if (perfTex) { perfTex.dispose(); perfTex = null; }
    if (tileTex) { tileTex.dispose(); tileTex = null; }
    if (grillTex) { grillTex.dispose(); grillTex = null; }

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer = null;
    }

    // Remove canvas from DOM
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;

    // Clear references
    cam = null;
    container = null;
    leds = [];
    rackMeshes = [];
    hvacMeshes = [];
    floorMeshes = [];
    raycaster = null;
    mouse = null;
    hoverCallback = null;
    clickCallback = null;
    hvacHoverCallback = null;
    hvacClickCallback = null;
    roomClickCallback = null;
    camAnim = null;
    currentSize = null;
    tgt = null;
    autoRotate = true;
    lastInteraction = 0;
    boundHandlers = {};
  }

  /**
   * setView(viewName)
   * Animate camera to a predefined view.
   * @param {string} viewName - 'persp', 'top', 'front', or 'side'
   */
  function setView(viewName) {
    var defaults = getDefaultCam();
    var c = defaults.tgt.clone();
    var dur = 700;

    switch (viewName) {
      case 'persp':
        animateCamera(defaults.t, defaults.p, defaults.r, c, dur);
        break;
      case 'top':
        animateCamera(0, 0.05, defaults.r + 2, new THREE.Vector3(0, 0, 1), dur);
        break;
      case 'front':
        animateCamera(0, Math.PI / 2, defaults.r - 4, c, dur);
        break;
      case 'side':
        animateCamera(Math.PI / 2, Math.PI / 2.5, defaults.r - 4, c, dur);
        break;
      default:
        break;
    }
  }

  /**
   * onRackHover(callback)
   * Register hover callback: callback(rackId, mouseX, mouseY) or callback(null).
   * @param {function} callback
   */
  function onRackHover(callback) {
    hoverCallback = callback;
  }

  /**
   * onRackClick(callback)
   * Register click callback: callback(rackId).
   * @param {function} callback
   */
  function onRackClick(callback) {
    clickCallback = callback;
  }

  /**
   * onHvacHover(callback)
   * Register HVAC hover callback: callback(hvacId, mouseX, mouseY) or callback(null).
   * @param {function} callback
   */
  function onHvacHover(callback) {
    hvacHoverCallback = callback;
  }

  /**
   * onHvacClick(callback)
   * Register HVAC click callback: callback(hvacId).
   * @param {function} callback
   */
  function onHvacClick(callback) {
    hvacClickCallback = callback;
  }

  /**
   * onRoomClick(callback)
   * Register room/floor click callback: callback().
   * @param {function} callback
   */
  function onRoomClick(callback) {
    roomClickCallback = callback;
  }

  // ===== Return public API =====
  return {
    init: init,
    destroy: destroy,
    setView: setView,
    onRackHover: onRackHover,
    onRackClick: onRackClick,
    onHvacHover: onHvacHover,
    onHvacClick: onHvacClick,
    onRoomClick: onRoomClick
  };

})();
