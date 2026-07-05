import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export default function RtuModel3D({ fanOn, sys1On, sys2On, alarm }) {
  const containerRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initW = Math.max(container.clientWidth, 400);
    const initH = Math.max(container.clientHeight, 300);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.Fog(0x06080d, 100, 280);

    const camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 800);
    camera.position.set(95, 70, 90);

    const isMobile = initW < 760;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(29, 12, 14);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 40;
    controls.maxDistance = 220;

    // ── LIGHTS ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(60, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = -100; sc.right = 100; sc.top = 100; sc.bottom = -100;
    sc.near = 1; sc.far = 300;
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.38);
    fillLight.position.set(-50, 35, -55);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x00d4aa, 0.20);
    rimLight.position.set(0, 18, -70);
    scene.add(rimLight);

    // ── GROUND ──
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.92, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(600, 100, 0x00d4aa, 0x142028);
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    grid.position.y = 0.01;
    scene.add(grid);

    // ── DIMENSIONS (preserved exactly from voxel/Trane Foundation EAC180-300) ──
    const AH_LEN = 32;
    const COMP_LEN = 26;
    const W = 28;
    const H = 24;
    const compX0 = AH_LEN;
    const compX1 = AH_LEN + COMP_LEN;
    const TOTAL = compX1;

    // ── MATERIALS (PBR palette) ──
    const M = {
      shell: new THREE.MeshStandardMaterial({
        color: 0xc8c2a8, roughness: 0.62, metalness: 0.25,
        transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide,
      }),
      shellSolid: new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.58, metalness: 0.28 }),
      shellTrim: new THREE.MeshStandardMaterial({ color: 0xa8a290, roughness: 0.55, metalness: 0.35 }),
      shellEdge: new THREE.MeshStandardMaterial({ color: 0x7a7466, roughness: 0.6, metalness: 0.4 }),
      skid: new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.7, metalness: 0.5 }),
      skidDark: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.75, metalness: 0.4 }),
      galv: new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.5, metalness: 0.7 }),
      galvDark: new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.55, metalness: 0.65 }),
      black: new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.38, metalness: 0.85 }),
      blackMatte: new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.75, metalness: 0.3 }),
      grille: new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.85, metalness: 0.2 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.32, metalness: 0.92 }),
      copperDark: new THREE.MeshStandardMaterial({ color: 0x7a4a1f, roughness: 0.45, metalness: 0.85 }),
      aluminum: new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }),
      aluminumBright: new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.25, metalness: 0.95 }),
      coilFace: new THREE.MeshStandardMaterial({ color: 0x4a6878, roughness: 0.68, metalness: 0.55 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.9, metalness: 0.05 }),
      filter: new THREE.MeshStandardMaterial({ color: 0xb8a878, roughness: 0.95, metalness: 0.02 }),
      insulation: new THREE.MeshStandardMaterial({ color: 0x30363e, roughness: 0.95, metalness: 0.0 }),
      bolt: new THREE.MeshStandardMaterial({ color: 0x40444a, roughness: 0.4, metalness: 0.85 }),
      panelDark: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.6 }),
    };

    // ── HELPERS ──
    function box(w, h, d, mat, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    function panel(w, h, d, mat, x, y, z) {
      const m = box(w, h, d, mat, x, y, z);
      m.castShadow = false;
      return m;
    }
    function tube(p0, p1, r, mat, radialSegs = 10) {
      const dir = new THREE.Vector3().subVectors(p1, p0);
      const len = dir.length();
      const g = new THREE.CylinderGeometry(r, r, len, radialSegs);
      const m = new THREE.Mesh(g, mat);
      m.position.copy(p0).add(dir.multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    const root = new THREE.Group();
    scene.add(root);

    // ── SKID (channel-steel base) ──
    (function buildSkid() {
      root.add(box(TOTAL + 2, 1.4, W + 2, M.skid, TOTAL / 2, 0.7, W / 2));
      const edge = (x, z, w, d) => root.add(box(w, 2.2, d, M.skidDark, x, 1.6, z));
      edge(TOTAL / 2, -0.4, TOTAL + 2, 0.8);
      edge(TOTAL / 2, W + 0.4, TOTAL + 2, 0.8);
      edge(-0.4, W / 2, 0.8, W + 2);
      edge(TOTAL + 0.4, W / 2, 0.8, W + 2);
      for (let i = 1; i < 6; i++) {
        const x = (TOTAL / 6) * i;
        root.add(box(0.5, 0.9, W + 1.6, M.skidDark, x, 0.3, W / 2));
      }
      for (const z of [3, W - 3]) {
        root.add(box(8, 0.5, 1.2, M.grille, 16, 0.5, z));
        root.add(box(8, 0.5, 1.2, M.grille, 44, 0.5, z));
      }
    })();

    // ── AIR-HANDLER CABINET SHELL ──
    (function buildAirHandlerShell() {
      root.add(panel(AH_LEN + 0.3, 0.5, W, M.shell, AH_LEN / 2, H + 0.25, W / 2));
      root.add(panel(AH_LEN + 0.3, 0.3, W + 0.6, M.shellTrim, AH_LEN / 2, H + 0.6, W / 2));
      root.add(panel(AH_LEN, H - 2, 0.4, M.shell, AH_LEN / 2, H / 2 + 1, 0.2));
      root.add(panel(0.4, H - 2, W, M.shellSolid, 0.2, H / 2 + 1, W / 2));
      root.add(panel(0.5, H - 6, W - 8, M.shellEdge, 0.25, H / 2 + 1, W / 2));
      for (let i = 0; i < 7; i++) {
        const y = 6 + i * 2.2;
        root.add(box(0.7, 0.5, W - 9, M.galvDark, 0.0, y, W / 2));
      }
      root.add(box(0.6, H - 5, 0.6, M.shellEdge, 0.0, H / 2 + 1, 4.2));
      root.add(box(0.6, H - 5, 0.6, M.shellEdge, 0.0, H / 2 + 1, W - 4.2));
      root.add(panel(0.4, H - 2.5, W - 0.5, M.shellTrim, AH_LEN, H / 2 + 1.25, W / 2));
      root.add(box(AH_LEN, 0.5, 0.4, M.shellTrim, AH_LEN / 2, 2.25, W - 0.2));
      root.add(box(AH_LEN, 0.5, 0.4, M.shellTrim, AH_LEN / 2, H - 0.25, W - 0.2));
    })();

    // ── COMPRESSOR CABINET SHELL ──
    (function buildCompressorShell() {
      root.add(panel(COMP_LEN + 0.3, 0.5, W, M.shell, compX0 + COMP_LEN / 2, H + 0.25, W / 2));
      root.add(panel(COMP_LEN + 0.3, 0.3, W + 0.6, M.shellTrim, compX0 + COMP_LEN / 2, H + 0.6, W / 2));
      root.add(box(COMP_LEN, 1.0, 0.4, M.shellTrim, compX0 + COMP_LEN / 2, 2.5, 0.2));
      root.add(box(COMP_LEN, 1.5, 0.4, M.shellTrim, compX0 + COMP_LEN / 2, H - 0.75, 0.2));
      root.add(box(0.6, H - 4, 0.6, M.shellEdge, compX0 + 0.3, H / 2 + 1, 0.3));
      root.add(box(0.6, H - 4, 0.6, M.shellEdge, compX1 - 0.3, H / 2 + 1, 0.3));
      root.add(box(0.5, 2.0, W, M.shellTrim, compX1 + 0.25, 3.0, W / 2));
      root.add(box(0.5, 2.5, W, M.shellTrim, compX1 + 0.25, H - 1.25, W / 2));
      root.add(box(0.5, H - 4, 1.4, M.shellEdge, compX1 + 0.25, H / 2 + 1, 0.7));
      root.add(box(0.5, H - 4, 1.4, M.shellEdge, compX1 + 0.25, H / 2 + 1, W - 0.7));

      const panelTopY = H - 0.5;
      const panelBotY = Math.floor(H * 0.55);
      const panelH = panelTopY - panelBotY;
      const panelCenterY = (panelTopY + panelBotY) / 2;
      root.add(panel(COMP_LEN - 0.4, panelH, 0.35, M.shellSolid,
        compX0 + COMP_LEN / 2, panelCenterY, W - 0.18));
      root.add(box(COMP_LEN - 0.4, 0.25, 0.45, M.shellEdge,
        compX0 + COMP_LEN / 2, panelTopY - 0.05, W - 0.15));
      root.add(box(COMP_LEN - 0.4, 0.25, 0.45, M.shellEdge,
        compX0 + COMP_LEN / 2, panelBotY + 0.05, W - 0.15));
      const doorX = compX0 + COMP_LEN / 2;
      root.add(box(0.15, panelH - 0.5, 0.4, M.shellEdge, doorX, panelCenterY, W - 0.12));

      const handleY = panelBotY + panelH * 0.55;
      const handle = (x, y) => {
        root.add(box(1.6, 0.32, 0.22, M.skid, x, y, W - 0.05));
        root.add(box(0.22, 0.5, 0.32, M.bolt, x - 0.65, y, W - 0.08));
        root.add(box(0.22, 0.5, 0.32, M.bolt, x + 0.65, y, W - 0.08));
      };
      handle(doorX - 5, handleY);
      handle(doorX + 5, handleY);

      const screw = (x, y) => {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 8), M.bolt);
        s.rotation.x = Math.PI / 2;
        s.position.set(x, y, W - 0.03);
        root.add(s);
      };
      for (let x = compX0 + 1.5; x < compX1; x += 2.5) {
        screw(x, panelTopY - 0.4);
        screw(x, panelBotY + 0.4);
      }

      root.add(box(COMP_LEN, 0.5, 0.4, M.shellTrim,
        compX0 + COMP_LEN / 2, 2.25, W - 0.2));

      // Trane nameplate on right end
      root.add(panel(0.2, 2.2, 6, M.panelDark, compX1 + 0.55, H - 4, W / 2));
      root.add(panel(0.22, 0.5, 4.5, new THREE.MeshStandardMaterial({
        color: 0xcc2222, roughness: 0.4, metalness: 0.5,
        emissive: 0xcc2222, emissiveIntensity: 0.18,
      }), compX1 + 0.58, H - 4.6, W / 2));
    })();

    // ── CONDENSER COIL (back wall + right end of compressor section) ──
    (function buildCondenserCoil() {
      const bwX = compX0 + COMP_LEN / 2;
      const bwLen = COMP_LEN - 2;
      const bwY = H / 2 + 1;
      const bwH = H - 5;
      root.add(panel(bwLen, bwH, 0.3, M.coilFace, bwX, bwY, 0.85));
      for (let i = 0; i < 18; i++) {
        const y = (bwY - bwH / 2) + i * (bwH / 18) + 0.4;
        root.add(box(bwLen + 0.05, 0.08, 0.4, M.aluminumBright, bwX, y, 0.95));
      }
      for (const dx of [-bwLen / 2 + 0.6, bwLen / 2 - 0.6]) {
        const hdr = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, bwH, 14),
          M.copper
        );
        hdr.position.set(bwX + dx, bwY, 1.4);
        root.add(hdr);
      }
      for (let i = 0; i < 5; i++) {
        const y = (bwY - bwH / 2) + 1.5 + i * (bwH - 3) / 4;
        const ub = new THREE.Mesh(
          new THREE.TorusGeometry(0.45, 0.18, 8, 14, Math.PI),
          M.copper
        );
        ub.position.set(bwX - bwLen / 2 + 0.6, y, 1.7);
        ub.rotation.y = Math.PI / 2;
        ub.rotation.x = Math.PI;
        root.add(ub);
      }

      const reLen = W - 2.2;
      const reY = H / 2 + 1;
      const reH = H - 5;
      root.add(panel(0.3, reH, reLen, M.coilFace, compX1 - 0.15, reY, W / 2));
      for (let i = 0; i < 14; i++) {
        const z = (W / 2 - reLen / 2) + i * (reLen / 14) + 0.3;
        root.add(box(0.4, reH, 0.06, M.aluminumBright, compX1 - 0.05, reY, z));
      }
      const reHdr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, reH, 14),
        M.copper
      );
      reHdr.position.set(compX1 - 0.45, reY, W / 2);
      root.add(reHdr);
    })();

    // ── SLANTED FILTER + COOLING COIL ASSEMBLY ──
    (function buildSlantedAssembly() {
      const xBot = 6, yBot = 4, xTop = 12, yTop = 20;
      const cx = (xBot + xTop) / 2;
      const cy = (yBot + yTop) / 2;
      const slantLen = Math.hypot(xTop - xBot, yTop - yBot);
      const angle = -Math.atan2(xTop - xBot, yTop - yBot);

      const grp = new THREE.Group();
      grp.position.set(cx, cy, W / 2);
      grp.rotation.z = angle;
      root.add(grp);

      const slabDepth = W - 4;

      // FILTER (low-X face)
      const filterThick = 1.0;
      grp.add(box(filterThick, slantLen, slabDepth, M.filter, -1.0, 0, 0));
      for (let i = 0; i < 12; i++) {
        const z = -slabDepth / 2 + i * (slabDepth / 12) + 0.5;
        grp.add(box(filterThick + 0.05, slantLen - 0.4, 0.06, M.shellEdge, -1.0, 0, z));
      }
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, -1.5, 0, -slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, -1.5, 0, slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, -0.5, 0, -slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, -0.5, 0, slabDepth / 2));
      grp.add(box(filterThick + 0.4, 0.25, slabDepth + 0.3, M.galvDark, -1.0, -slantLen / 2, 0));
      grp.add(box(filterThick + 0.4, 0.25, slabDepth + 0.3, M.galvDark, -1.0, slantLen / 2, 0));

      // COOLING COIL (high-X face)
      const coilThick = 1.4;
      grp.add(panel(0.18, slantLen - 0.3, slabDepth - 0.2, M.coilFace, 0.35, 0, 0));
      grp.add(panel(0.18, slantLen - 0.3, slabDepth - 0.2, M.coilFace, 1.55, 0, 0));
      const FINS = 38;
      for (let i = 0; i < FINS; i++) {
        const z = -slabDepth / 2 + (i + 0.5) * (slabDepth / FINS);
        const fin = new THREE.Mesh(
          new THREE.PlaneGeometry(coilThick - 0.15, slantLen - 0.6),
          M.aluminum
        );
        fin.position.set(0.95, 0, z);
        fin.rotation.y = Math.PI / 2;
        fin.receiveShadow = true;
        grp.add(fin);
      }
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, 0.25, 0, -slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, 0.25, 0, slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, 1.7, 0, -slabDepth / 2));
      grp.add(box(0.25, slantLen, 0.25, M.galvDark, 1.7, 0, slabDepth / 2));

      const tubeRows = 6;
      for (let r = 0; r < tubeRows; r++) {
        const yLocal = -slantLen / 2 + 1.2 + r * ((slantLen - 2.4) / (tubeRows - 1));
        const tb = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, slabDepth + 0.6, 12),
          M.copper
        );
        tb.rotation.x = Math.PI / 2;
        tb.position.set(0.95, yLocal, 0);
        grp.add(tb);
        if (r < tubeRows - 1) {
          const yNext = -slantLen / 2 + 1.2 + (r + 1) * ((slantLen - 2.4) / (tubeRows - 1));
          const yMid = (yLocal + yNext) / 2;
          const ub = new THREE.Mesh(
            new THREE.TorusGeometry((yNext - yLocal) / 2, 0.28, 8, 14, Math.PI),
            M.copper
          );
          ub.position.set(0.95, yMid, slabDepth / 2 + 0.4);
          ub.rotation.y = Math.PI / 2;
          ub.rotation.z = -Math.PI / 2;
          grp.add(ub);
        }
      }

      // Drain pan (in world coords)
      root.add(box(xTop - xBot + 6, 0.4, slabDepth + 1, M.galv, cx, 2.4, W / 2));
      const drain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 5, 10),
        M.blackMatte
      );
      drain.position.set(cx + 1, 2.0, W + 1.2);
      drain.rotation.x = Math.PI / 2;
      root.add(drain);
    })();

    // ── BLOWER ASSEMBLY (scroll housing + squirrel-cage wheel + motor + belt) ──
    const bcx = 23;
    const bcy = H / 2;
    const bcz = W / 2;
    const blowerGroup = new THREE.Group();
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xff2233, roughness: 0.42, metalness: 0.65,
      emissive: 0xff2233, emissiveIntensity: 0.35,
    });

    (function buildBlower() {
      const scrollR = 7.0;
      const scrollDepth = 8.5;
      const housingThick = 1.0;

      const outerWall = new THREE.Mesh(
        new THREE.CylinderGeometry(scrollR, scrollR, scrollDepth, 32, 1, true),
        M.galvDark
      );
      outerWall.rotation.x = Math.PI / 2;
      outerWall.position.set(bcx, bcy, bcz - scrollDepth / 2);
      outerWall.material.side = THREE.DoubleSide;
      outerWall.castShadow = true;
      outerWall.receiveShadow = true;
      root.add(outerWall);

      const innerWall = new THREE.Mesh(
        new THREE.CylinderGeometry(scrollR - housingThick, scrollR - housingThick, scrollDepth, 32, 1, true),
        M.galv
      );
      innerWall.rotation.x = Math.PI / 2;
      innerWall.position.set(bcx, bcy, bcz - scrollDepth / 2);
      innerWall.material.side = THREE.DoubleSide;
      root.add(innerWall);

      const backDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(scrollR + 0.1, scrollR + 0.1, 0.3, 32),
        M.galv
      );
      backDisk.rotation.x = Math.PI / 2;
      backDisk.position.set(bcx, bcy, bcz - scrollDepth - 0.15);
      backDisk.receiveShadow = true;
      root.add(backDisk);

      const frontFlange = new THREE.Mesh(
        new THREE.RingGeometry(scrollR - housingThick - 0.05, scrollR + 0.1, 32),
        M.shellEdge
      );
      frontFlange.position.set(bcx, bcy, bcz + 0.01);
      frontFlange.material.side = THREE.DoubleSide;
      root.add(frontFlange);

      // Outlet duct on top
      root.add(box(6, 4.5, 9, M.galvDark, bcx, bcy + scrollR + 1.2, bcz - scrollDepth / 2 + 0.5));
      root.add(box(6.6, 0.3, 9.4, M.shellEdge, bcx, bcy + scrollR + 3.5, bcz - scrollDepth / 2 + 0.5));

      // Wheel hub + shaft
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, scrollDepth - 1.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.4, metalness: 0.85 })
      );
      hub.rotation.x = Math.PI / 2;
      blowerGroup.add(hub);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, scrollDepth + 5, 10),
        new THREE.MeshStandardMaterial({ color: 0x7a7a80, roughness: 0.35, metalness: 0.9 })
      );
      shaft.rotation.x = Math.PI / 2;
      blowerGroup.add(shaft);

      // Forward-curved blades
      const BLADES = 24;
      const bladeR = scrollR - 2.0;
      const bladeGeo = new THREE.BoxGeometry(0.7, 0.22, scrollDepth - 1.6);
      for (let i = 0; i < BLADES; i++) {
        const a = (i / BLADES) * Math.PI * 2;
        const blade = new THREE.Mesh(bladeGeo, wheelMat);
        blade.position.set(Math.cos(a) * bladeR, Math.sin(a) * bladeR, 0);
        blade.rotation.z = a + Math.PI / 2 + 0.22;
        blade.castShadow = true;
        blowerGroup.add(blade);
      }
      for (const z of [-(scrollDepth - 1.5) / 2, (scrollDepth - 1.5) / 2]) {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(bladeR + 0.15, 0.16, 6, 32),
          new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.4, metalness: 0.9 })
        );
        rim.position.z = z;
        blowerGroup.add(rim);
      }

      blowerGroup.position.set(bcx, bcy, bcz - 4.5);
      scene.add(blowerGroup);

      // Motor (belt-driven)
      const motorX = bcx + scrollR + 2.5;
      const motorY = bcy - 3;
      const motorZ = bcz - 2.5;
      const motorBody = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.0, 4.5, 18),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.7 })
      );
      motorBody.rotation.x = Math.PI / 2;
      motorBody.position.set(motorX, motorY, motorZ);
      motorBody.castShadow = true;
      root.add(motorBody);
      for (let i = 0; i < 8; i++) {
        const fin = new THREE.Mesh(
          new THREE.TorusGeometry(2.05, 0.10, 5, 18),
          new THREE.MeshStandardMaterial({ color: 0x45454a, roughness: 0.4, metalness: 0.8 })
        );
        fin.position.set(motorX, motorY, motorZ - 2.1 + i * 0.55);
        root.add(fin);
      }
      root.add(box(1.3, 1.3, 1.0, M.black, motorX, motorY + 2.2, motorZ));
      root.add(box(4.5, 0.5, 2.2, M.galvDark, motorX, motorY - 2.3, motorZ));

      const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.4, metalness: 0.8 });
      const motorPulley = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.7, 16),
        pulleyMat
      );
      motorPulley.rotation.x = Math.PI / 2;
      motorPulley.position.set(motorX, motorY, bcz + 2.5);
      root.add(motorPulley);

      const wheelPulley = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 0.7, 20),
        pulleyMat
      );
      wheelPulley.rotation.x = Math.PI / 2;
      wheelPulley.position.set(bcx, bcy, bcz + 2.5);
      root.add(wheelPulley);

      const beltMidX = (motorX + bcx) / 2;
      const beltMidY = (motorY + bcy) / 2;
      const beltGeo = new THREE.TorusGeometry(2.6, 0.18, 6, 24, Math.PI * 1.4);
      const belt = new THREE.Mesh(beltGeo, M.rubber);
      belt.position.set(beltMidX, beltMidY + 0.5, bcz + 2.5);
      root.add(belt);

      const guard = box(motorX - bcx + 2.5, 5.5, 0.3, M.galv,
        beltMidX, beltMidY, bcz + 3.2);
      root.add(guard);
    })();

    // ── COMPRESSORS (2 scroll-type, vertical) ──
    const compTops = [];
    const compressorStates = [];
    function buildCompressor(cx, cz) {
      const baseY = 2.5;
      const bodyR = 3.2;
      const bodyH = 9.5;

      root.add(box(8, 0.7, 8, M.blackMatte, cx, baseY + 0.35, cz));
      for (const ox of [-3, 3]) for (const oz of [-3, 3]) {
        const iso = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.65, 0.85, 10),
          M.rubber
        );
        iso.position.set(cx + ox, baseY + 0.85, cz + oz);
        root.add(iso);
      }

      const flange = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + 0.5, bodyR + 0.5, 0.55, 24),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.8 })
      );
      flange.position.set(cx, baseY + 1.1, cz);
      root.add(flange);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 24),
        M.black
      );
      body.position.set(cx, baseY + 1.3 + bodyH / 2, cz);
      body.castShadow = true;
      body.receiveShadow = true;
      root.add(body);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        M.black
      );
      dome.position.set(cx, baseY + 1.3 + bodyH, cz);
      dome.castShadow = true;
      root.add(dome);

      root.add(box(1.8, 2.2, 1.0, M.galv,
        cx, baseY + 1.3 + bodyH * 0.5, cz + bodyR + 0.5));

      const labelMat = new THREE.MeshStandardMaterial({
        color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 0.85,
        roughness: 0.35, metalness: 0.4,
      });
      const label = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + 0.02, bodyR + 0.02, 1.6, 24, 1, true),
        labelMat
      );
      label.position.set(cx, baseY + 1.3 + bodyH * 0.4, cz);
      root.add(label);

      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 1.4,
        roughness: 0.3, metalness: 0.2,
      });
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, bodyH - 2.5, 0.13),
        stripeMat
      );
      stripe.position.set(cx, baseY + 1.3 + bodyH / 2, cz - bodyR - 0.07);
      root.add(stripe);

      const compLight = new THREE.PointLight(0xff2233, 0.8, 14);
      compLight.position.set(cx, baseY + 1.3 + bodyH * 0.55, cz);
      scene.add(compLight);

      compressorStates.push({ labelMat, stripeMat, compLight });

      const topGroup = new THREE.Group();
      const topY = baseY + 1.3 + bodyH + 0.05;
      topGroup.position.set(cx, topY, cz);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.4, 6),
          M.bolt
        );
        bolt.position.set(Math.cos(a) * (bodyR - 0.4), 0, Math.sin(a) * (bodyR - 0.4));
        topGroup.add(bolt);
      }
      const topDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR - 0.8, bodyR - 0.8, 0.18, 16),
        new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.4, metalness: 0.85 })
      );
      topDisk.position.y = 0.25;
      topGroup.add(topDisk);
      scene.add(topGroup);
      compTops.push({ group: topGroup, baseY: topY });
    }
    buildCompressor(compX0 + 7, W / 2);
    buildCompressor(compX0 + 19, W / 2);

    // ── REFRIGERANT MANIFOLD ──
    (function buildRefrigerantManifold() {
      const cz_ = W / 2;
      const c1X = compX0 + 7;
      const c2X = compX0 + 19;
      const headerY = 19.5;
      const portTopY = 17;

      for (const cx of [c1X, c2X]) {
        root.add(tube(
          new THREE.Vector3(cx + 0.9, portTopY, cz_ + 1),
          new THREE.Vector3(cx + 0.9, headerY, cz_ + 1),
          0.28, M.copper, 12
        ));
        root.add(tube(
          new THREE.Vector3(cx - 0.9, portTopY, cz_ - 1),
          new THREE.Vector3(cx - 0.9, headerY, cz_ - 1),
          0.28, M.copper, 12
        ));
      }

      root.add(tube(
        new THREE.Vector3(c1X + 0.9, headerY, cz_ + 1),
        new THREE.Vector3(c2X + 0.9, headerY, cz_ + 1),
        0.30, M.copper, 12
      ));
      root.add(tube(
        new THREE.Vector3(c1X - 0.9, headerY, cz_ - 1),
        new THREE.Vector3(c2X - 0.9, headerY, cz_ - 1),
        0.30, M.copper, 12
      ));

      for (const cx of [c1X, c2X]) {
        root.add(tube(
          new THREE.Vector3(cx - 0.9, headerY, cz_ - 1),
          new THREE.Vector3(cx - 0.9, headerY + 1.5, cz_ - 1),
          0.28, M.copper, 12
        ));
        root.add(tube(
          new THREE.Vector3(cx - 0.9, headerY + 1.5, cz_ - 1),
          new THREE.Vector3(cx - 0.9, headerY + 1.5, 2.5),
          0.28, M.copper, 12
        ));
        root.add(tube(
          new THREE.Vector3(cx - 0.9, headerY + 1.5, 2.5),
          new THREE.Vector3(cx - 0.9, headerY - 2, 1.4),
          0.28, M.copper, 12
        ));
        root.add(tube(
          new THREE.Vector3(cx + 1.4, 19, 1.4),
          new THREE.Vector3(cx + 1.4, 8, 8),
          0.40, M.insulation, 10
        ));
      }

      function serviceValve(x, y, z) {
        const v = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.38, 0.7, 10),
          M.bolt
        );
        v.position.set(x, y, z);
        root.add(v);
        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.4, 6),
          M.copper
        );
        handle.rotation.z = Math.PI / 2;
        handle.position.set(x + 0.45, y, z);
        root.add(handle);
      }
      for (const cx of [c1X, c2X]) {
        serviceValve(cx + 0.9, 18.5, cz_ + 1);
        serviceValve(cx - 0.9, 18.5, cz_ - 1);
      }
    })();

    // ── CONDENSER FAN DECK + 2 axial fans ──
    const fanGroups = [];
    const fanMats = [];

    function makeAeroBlade() {
      const shape = new THREE.Shape();
      shape.moveTo(0.4, -0.28);
      shape.quadraticCurveTo(1.4, -0.7, 2.7, -0.50);
      shape.quadraticCurveTo(3.4, -0.32, 3.6, 0.05);
      shape.quadraticCurveTo(3.7, 0.35, 3.35, 0.55);
      shape.quadraticCurveTo(2.4, 0.82, 1.2, 0.50);
      shape.quadraticCurveTo(0.7, 0.32, 0.4, 0.18);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18, bevelEnabled: true, bevelSegments: 2,
        bevelSize: 0.04, bevelThickness: 0.04, steps: 1,
      });
      geo.translate(0, 0, -0.09);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const tParam = Math.max(0, Math.min(1, (x - 0.4) / 3.2));
        const twist = 0.65 - tParam * 0.45;
        const cy2 = y * Math.cos(twist) - z * Math.sin(twist);
        const cz2 = y * Math.sin(twist) + z * Math.cos(twist);
        pos.setXYZ(i, x, cy2, cz2);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }
    const aeroBladeGeo = makeAeroBlade();

    (function buildFanDeck() {
      root.add(box(COMP_LEN - 1.5, 0.5, W - 2, M.galvDark,
        compX0 + COMP_LEN / 2, H + 1.3, W / 2));
      for (const dx of [compX0 + 2.5, compX0 + COMP_LEN - 2.5]) {
        root.add(box(0.55, 1.8, W - 3, M.galvDark, dx, H + 0.5, W / 2));
      }
    })();

    function makeCondenserFan(cx, cz) {
      const fanY = H + 2.35;
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(4.6, 4.6, 1.6, 28, 1, true),
        M.galv
      );
      shroud.position.set(cx, fanY, cz);
      shroud.material.side = THREE.DoubleSide;
      shroud.castShadow = true;
      root.add(shroud);
      const lip = new THREE.Mesh(
        new THREE.TorusGeometry(4.6, 0.32, 8, 28),
        M.galvDark
      );
      lip.position.set(cx, fanY + 0.85, cz);
      lip.rotation.x = Math.PI / 2;
      root.add(lip);
      const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.6, 0.25, 6, 28),
        M.galvDark
      );
      baseRing.position.set(cx, fanY - 0.85, cz);
      baseRing.rotation.x = Math.PI / 2;
      root.add(baseRing);
      for (const r of [1.3, 2.7, 4.1]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.07, 4, 22),
          M.bolt
        );
        ring.position.set(cx, fanY + 1.15, cz);
        ring.rotation.x = Math.PI / 2;
        root.add(ring);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.10, 0.10, 4.4),
          M.bolt
        );
        spoke.rotation.y = a;
        spoke.position.set(cx, fanY + 1.15, cz);
        root.add(spoke);
      }

      const g = new THREE.Group();
      g.position.set(cx, fanY + 0.4, cz);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xff2233, roughness: 0.45, metalness: 0.7,
        emissive: 0xff2233, emissiveIntensity: 0.30,
        side: THREE.DoubleSide,
      });
      const fhub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.1, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: 0x45454a, roughness: 0.4, metalness: 0.85 })
      );
      g.add(fhub);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const blade = new THREE.Mesh(aeroBladeGeo, bladeMat);
        blade.rotation.y = a;
        blade.castShadow = true;
        g.add(blade);
      }
      scene.add(g);
      fanGroups.push(g);
      fanMats.push(bladeMat);
    }
    [
      [compX0 + 7, W / 2],
      [compX0 + 19, W / 2],
    ].forEach(([cx, cz]) => makeCondenserFan(cx, cz));

    // ── ELECTRICAL HINT ──
    (function buildElectricalHint() {
      const subZ = W - 1.0;
      const subY = H * 0.78;
      const subX = compX0 + COMP_LEN / 2;
      root.add(panel(COMP_LEN - 4, H * 0.32, 0.18, M.galv, subX, subY, subZ));
      for (let i = 0; i < 3; i++) {
        const x = compX0 + 4 + i * 3;
        root.add(box(1.2, 1.6, 0.7, M.black, x, subY - 0.5, subZ - 0.45));
      }
      root.add(box(2.5, 1.8, 0.7, M.galvDark, compX0 + 19, subY + 0.4, subZ - 0.45));
      const discHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.4, 0.4),
        new THREE.MeshStandardMaterial({
          color: 0xcc2222, roughness: 0.35, metalness: 0.3,
          emissive: 0xcc2222, emissiveIntensity: 0.25,
        })
      );
      discHandle.position.set(compX0 + 22, subY + 0.4, subZ - 0.7);
      root.add(discHandle);
      for (let i = 0; i < 8; i++) {
        const x = compX0 + 3 + i * 2.5;
        root.add(box(0.35, 0.35, 0.3, M.copper, x, subY - 1.8, subZ - 0.4));
      }
    })();

    // ── STATUS LEDs ──
    const ledMats = [];
    function makeLed(cx, frontZ) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 1.4,
        roughness: 0.3, metalness: 0.3,
      });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), mat);
      led.position.set(cx, H - 3, frontZ + 0.3);
      scene.add(led);
      const bezel = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.12, 6, 16),
        M.bolt
      );
      bezel.position.set(cx, H - 3, frontZ + 0.18);
      scene.add(bezel);
      const pl = new THREE.PointLight(0xff2233, 1.0, 7);
      pl.position.set(cx, H - 3, frontZ + 0.4);
      scene.add(pl);
      ledMats.push({ mat, light: pl });
    }
    makeLed(compX0 + 7, W);
    makeLed(compX0 + 19, W);

    // ── AIRFLOW PARTICLES ──
    const N = 60;
    const partGeo = new THREE.SphereGeometry(0.32, 6, 4);
    const partMatRet = new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0.85 });
    const partMatSup = new THREE.MeshBasicMaterial({ color: 0x44bbff, transparent: true, opacity: 0.85 });

    const returnParticles = [];
    const supplyParticles = [];
    for (let i = 0; i < N; i++) {
      const p = new THREE.Mesh(partGeo, partMatRet.clone());
      p.userData = { t: Math.random(), seed: Math.random() * 10 };
      scene.add(p);
      returnParticles.push(p);
    }
    for (let i = 0; i < N; i++) {
      const p = new THREE.Mesh(partGeo, partMatSup.clone());
      p.userData = { t: Math.random(), seed: Math.random() * 10 };
      scene.add(p);
      supplyParticles.push(p);
    }

    // ── STATE MACHINE (props mapped to 'on' | 'standby' | 'alarm') ──
    const state = { fan: 'standby', c1: 'standby', c2: 'standby' };
    const COLOR_ON = 0x00ff66;
    const COLOR_OFF = 0xff2233;

    function applyState() {
      // LEDs (per compressor)
      ledMats.forEach((l, i) => {
        const s = i === 0 ? state.c1 : state.c2;
        const on = s === 'on';
        l.mat.color.setHex(on ? COLOR_ON : COLOR_OFF);
        l.mat.emissive.setHex(on ? COLOR_ON : COLOR_OFF);
        l.mat.emissiveIntensity = on ? 1.7 : 1.3;
        l.light.color.setHex(on ? COLOR_ON : COLOR_OFF);
        l.light.intensity = on ? 1.5 : 1.0;
      });
      // Compressor body emissives
      [state.c1, state.c2].forEach((s, i) => {
        const on = s === 'on';
        const c = on ? COLOR_ON : COLOR_OFF;
        const cs = compressorStates[i];
        cs.labelMat.color.setHex(c);
        cs.labelMat.emissive.setHex(c);
        cs.labelMat.emissiveIntensity = on ? 1.0 : 0.75;
        cs.stripeMat.color.setHex(c);
        cs.stripeMat.emissive.setHex(c);
        cs.stripeMat.emissiveIntensity = on ? 1.7 : 1.2;
        cs.compLight.color.setHex(c);
        cs.compLight.intensity = on ? 2.0 : 0.7;
      });
      // Blower wheel
      const fanOnLocal = state.fan === 'on';
      const fc = fanOnLocal ? COLOR_ON : COLOR_OFF;
      wheelMat.color.setHex(fc);
      wheelMat.emissive.setHex(fc);
      wheelMat.emissiveIntensity = fanOnLocal ? 0.55 : 0.30;
      // Condenser fan blades (one per compressor)
      [state.c1, state.c2].forEach((s, i) => {
        const on = s === 'on';
        const c = on ? COLOR_ON : COLOR_OFF;
        fanMats[i].color.setHex(c);
        fanMats[i].emissive.setHex(c);
        fanMats[i].emissiveIntensity = on ? 0.55 : 0.30;
      });
    }
    applyState();

    // ── RESIZE (responds to container, not window) ──
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // ── ANIMATE ──
    let rafId;
    let lastTime = performance.now();
    const startTime = lastTime;
    let isInView = true;
    let isDocVisible = !document.hidden;
    const onVisibility = () => { isDocVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver(([entry]) => { isInView = entry.isIntersecting; }, { threshold: 0.01 });
    io.observe(container);

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!isInView || !isDocVisible) return;
      const t = (now - startTime) / 1000;

      // Blower wheel
      if (state.fan === 'on') blowerGroup.rotation.z -= dt * 7;

      // Condenser fans (each tied to its compressor)
      if (state.c1 === 'on') fanGroups[0].rotation.y -= dt * 9;
      if (state.c2 === 'on') fanGroups[1].rotation.y -= dt * 9.5;

      // Compressor tops — rotate + Y-axis vibration when ON
      if (state.c1 === 'on') {
        compTops[0].group.rotation.y += dt * 12;
        compTops[0].group.position.y = compTops[0].baseY + Math.sin(t * 30) * 0.12;
      } else {
        compTops[0].group.position.y = compTops[0].baseY;
      }
      if (state.c2 === 'on') {
        compTops[1].group.rotation.y += dt * 12.5;
        compTops[1].group.position.y = compTops[1].baseY + Math.cos(t * 30) * 0.12;
      } else {
        compTops[1].group.position.y = compTops[1].baseY;
      }

      // Compressor light shimmer / alarm pulse
      const cStates = [state.c1, state.c2];
      compressorStates.forEach((cs, i) => {
        const s = cStates[i];
        if (s === 'alarm') {
          const pulse = 0.5 + Math.sin(t * 5 + i) * 0.5;
          cs.compLight.color.setHex(COLOR_OFF);
          cs.compLight.intensity = 1.2 + pulse * 1.2;
          cs.stripeMat.color.setHex(COLOR_OFF);
          cs.stripeMat.emissive.setHex(COLOR_OFF);
          cs.stripeMat.emissiveIntensity = 0.9 + pulse * 1.0;
          cs.labelMat.emissiveIntensity = 0.6 + pulse * 0.8;
        } else if (s === 'on') {
          const shimmer = 0.95 + Math.sin(t * 12 + i * 2) * 0.08;
          cs.compLight.intensity = 2.0 * shimmer;
          cs.stripeMat.emissiveIntensity = 1.7 * shimmer;
        }
      });

      // Return air particles
      returnParticles.forEach((p, i) => {
        if (state.fan !== 'on') { p.material.opacity = 0; return; }
        p.userData.t += dt * 0.16;
        if (p.userData.t > 1) p.userData.t = 0;
        const tt = p.userData.t;
        const seed = p.userData.seed;
        const yOff = ((i % 5) - 2) * 1.4;
        const zOff = ((Math.floor(i / 5) % 5) - 2) * 1.6;
        p.position.x = -5 + tt * (bcx + 5);
        p.position.y = H / 2 + yOff + Math.sin(tt * 7 + seed) * 0.6;
        p.position.z = W / 2 + zOff + Math.cos(tt * 4 + seed) * 0.6;
        p.material.opacity = Math.sin(tt * Math.PI) * 0.85;
      });

      // Supply air particles
      supplyParticles.forEach((p, i) => {
        if (state.fan !== 'on') { p.material.opacity = 0; return; }
        p.userData.t += dt * 0.18;
        if (p.userData.t > 1) p.userData.t = 0;
        const tt = p.userData.t;
        const seed = p.userData.seed;
        const xOff = ((i % 4) - 1.5) * 1.2;
        const zOff = ((Math.floor(i / 4) % 5) - 2) * 1.4;
        p.position.x = bcx + xOff + Math.sin(tt * 5 + seed) * 0.4;
        p.position.y = (bcy + 8) + tt * 8;
        p.position.z = (bcz - 4) + zOff + Math.cos(tt * 4 + seed) * 0.4;
        p.material.opacity = Math.sin(tt * Math.PI) * 0.85;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    ctxRef.current = { state, applyState };

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      ctxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.state.fan = alarm ? 'alarm' : fanOn ? 'on' : 'standby';
    ctx.state.c1 = alarm ? 'alarm' : sys1On ? 'on' : 'standby';
    ctx.state.c2 = alarm ? 'alarm' : sys2On ? 'on' : 'standby';
    ctx.applyState();
  }, [fanOn, sys1On, sys2On, alarm]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    />
  );
}
