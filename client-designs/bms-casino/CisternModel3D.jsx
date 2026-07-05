import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ─── Scene constants (ported from CarcamoDetail.js) ────────────────────────
const PIT_W = 6, PIT_D = 6, PIT_H = 5, WALL = 0.4, TOP_T = 0.4;
const HOLE_W = 1.0, HOLE_D = 1.0;
const TANK_R = 1.45, TANK_H = 4.0;
const TANK_BASE_Y = -PIT_H / 2 + 0.08;
const TANK_TOP_Y = TANK_BASE_Y + TANK_H;
const WATER_MAX_H = TANK_H * 0.95; // 3.8

// ─── Procedural concrete texture ───────────────────────────────────────────
function makeConcreteTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bdb6a6';
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 38;
    data[i]     = Math.max(0, Math.min(255, data[i]     + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);
  // Radial dark spots
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 15 + Math.random() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(50,40,30,0.55)');
    g.addColorStop(1, 'rgba(50,40,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Radial light spots
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 8 + Math.random() * 25;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(230,225,210,0.40)');
    g.addColorStop(1, 'rgba(230,225,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Small pebble dots
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    ctx.fillStyle = 'rgba(' + ((30 + Math.random() * 40) | 0) + ',' + ((25 + Math.random() * 30) | 0) + ',' + ((20 + Math.random() * 30) | 0) + ',0.55)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1.5, 1.5);
  return tex;
}

// ─── Polar grid BufferGeometry for the animated water surface ──────────────
function makePolarGrid(radius, rings, segments) {
  const positions = [0, 0, 0];
  const indices = [];
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * radius;
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    }
  }
  // Inner cap triangles
  for (let s = 0; s < segments; s++) {
    const next = (s + 1) % segments;
    indices.push(0, 1 + s, 1 + next);
  }
  // Ring quads
  for (let r = 1; r < rings; r++) {
    const ringStart = 1 + (r - 1) * segments;
    const nextRingStart = 1 + r * segments;
    for (let s = 0; s < segments; s++) {
      const next = (s + 1) % segments;
      const a = ringStart + s, b = ringStart + next;
      const cIdx = nextRingStart + s, d = nextRingStart + next;
      indices.push(a, cIdx, b);
      indices.push(b, cIdx, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * CisternModel3D — 3D cárcamo (cutaway pit + glass cylinder tank + animated water).
 *
 * Props:
 *   level: number (0–100, fill percent) | null
 *          null/absent → empty tank (targetLevel=0), no crash.
 *
 * Pattern: mirrors RtuModel3D exactly (useEffect mount + ctxRef + full dispose).
 * Three.js r0.183 — API-compatible with r160 APIs used in the reference.
 */
export default function CisternModel3D({ level }) {
  const containerRef = useRef(null);
  const ctxRef = useRef(null);

  // ── Mount: build scene once ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initW = Math.max(container.clientWidth, 400);
    const initH = Math.max(container.clientHeight, 300);
    const isMobile = initW < 760;

    // ── Renderer ──
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

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.Fog(0x06080d, 22, 40);

    // ── PMREM (per-mount, per design D4) ──
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 100);
    camera.position.set(0.09, 2.95, 13.21);

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minAzimuthAngle = -Math.PI * 0.6;
    controls.maxAzimuthAngle = Math.PI * 0.6;

    // ── Lights ──
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(8, 14, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 35;
    dirLight.shadow.bias = -0.0003;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x9ab8d8, 0.35);
    fillLight.position.set(-6, 6, -4);
    scene.add(fillLight);

    scene.add(new THREE.AmbientLight(0x4a5a6e, 0.3));

    // ── Ground ──
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -PIT_H / 2 - WALL - 0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Materials ──
    const concreteTex = makeConcreteTexture();
    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex, color: 0xc8c0b0, roughness: 0.92, metalness: 0.04,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xf2c33d, roughness: 0.45, metalness: 0.2,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xa0a8b0, roughness: 0.32, metalness: 0.88,
    });
    const tankWallMat = new THREE.MeshPhysicalMaterial({
      color: 0xb8c8d4, roughness: 0.04, metalness: 0.0,
      transmission: 0.92, thickness: 0.15, ior: 1.45,
      side: THREE.DoubleSide, envMapIntensity: 1.4,
      attenuationDistance: 5,
    });
    const tankCapMat = new THREE.MeshStandardMaterial({
      color: 0x8a8e92, roughness: 0.55, metalness: 0.55,
    });

    // ── Helpers ──
    function meshC(geo, x, y, z) {
      const m = new THREE.Mesh(geo, concreteMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    // ── Pit (3 walls + floor — front open for cutaway) ──
    const pitGroup = new THREE.Group();
    scene.add(pitGroup);
    // Floor
    pitGroup.add(meshC(new THREE.BoxGeometry(PIT_W + WALL * 2, WALL, PIT_D + WALL * 2), 0, -PIT_H / 2 - WALL / 2, 0));
    // Back wall
    pitGroup.add(meshC(new THREE.BoxGeometry(PIT_W + WALL * 2, PIT_H, WALL), 0, 0, -PIT_D / 2 - WALL / 2));
    // Left wall
    pitGroup.add(meshC(new THREE.BoxGeometry(WALL, PIT_H, PIT_D + WALL * 2), -PIT_W / 2 - WALL / 2, 0, 0));
    // Right wall
    pitGroup.add(meshC(new THREE.BoxGeometry(WALL, PIT_H, PIT_D + WALL * 2),  PIT_W / 2 + WALL / 2, 0, 0));

    // ── Top frame with chimney hole ──
    const TOP_OUT_W = PIT_W + WALL * 2;
    const TOP_OUT_D = PIT_D + WALL * 2;
    const topY = PIT_H / 2 + TOP_T / 2;
    // Back strip
    pitGroup.add(meshC(new THREE.BoxGeometry(TOP_OUT_W, TOP_T, (TOP_OUT_D - HOLE_D) / 2), 0, topY, -(HOLE_D / 2 + (TOP_OUT_D - HOLE_D) / 4)));
    // Front strip
    pitGroup.add(meshC(new THREE.BoxGeometry(TOP_OUT_W, TOP_T, (TOP_OUT_D - HOLE_D) / 2), 0, topY,  (HOLE_D / 2 + (TOP_OUT_D - HOLE_D) / 4)));
    // Left strip
    pitGroup.add(meshC(new THREE.BoxGeometry((TOP_OUT_W - HOLE_W) / 2, TOP_T, HOLE_D), -(HOLE_W / 2 + (TOP_OUT_W - HOLE_W) / 4), topY, 0));
    // Right strip
    pitGroup.add(meshC(new THREE.BoxGeometry((TOP_OUT_W - HOLE_W) / 2, TOP_T, HOLE_D),  (HOLE_W / 2 + (TOP_OUT_W - HOLE_W) / 4), topY, 0));

    // ── Yellow safety bands ──
    const bandH = 0.06, bandT = 0.16, innerT = 0.08;
    const bandY = topY + TOP_T / 2 + bandH / 2;
    function addYellow(geo, x, y, z) {
      const m = new THREE.Mesh(geo, yellowMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      pitGroup.add(m);
    }
    addYellow(new THREE.BoxGeometry(TOP_OUT_W, bandH, bandT), 0, bandY,  TOP_OUT_D / 2 - bandT / 2);
    addYellow(new THREE.BoxGeometry(TOP_OUT_W, bandH, bandT), 0, bandY, -TOP_OUT_D / 2 + bandT / 2);
    addYellow(new THREE.BoxGeometry(bandT, bandH, TOP_OUT_D - bandT * 2), -TOP_OUT_W / 2 + bandT / 2, bandY, 0);
    addYellow(new THREE.BoxGeometry(bandT, bandH, TOP_OUT_D - bandT * 2),  TOP_OUT_W / 2 - bandT / 2, bandY, 0);
    addYellow(new THREE.BoxGeometry(HOLE_W + innerT * 2, bandH, innerT), 0, bandY,  HOLE_D / 2 + innerT / 2);
    addYellow(new THREE.BoxGeometry(HOLE_W + innerT * 2, bandH, innerT), 0, bandY, -HOLE_D / 2 - innerT / 2);
    addYellow(new THREE.BoxGeometry(innerT, bandH, HOLE_D), -HOLE_W / 2 - innerT / 2, bandY, 0);
    addYellow(new THREE.BoxGeometry(innerT, bandH, HOLE_D),  HOLE_W / 2 + innerT / 2, bandY, 0);

    // ── Tank (glass cylinder, open-ended) ──
    const tankGroup = new THREE.Group();
    scene.add(tankGroup);

    const tankWall = new THREE.Mesh(
      new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 64, 1, true),
      tankWallMat
    );
    tankWall.position.y = TANK_BASE_Y + TANK_H / 2;
    tankGroup.add(tankWall);

    // Solid base cap
    const tankBase = new THREE.Mesh(
      new THREE.CylinderGeometry(TANK_R + 0.05, TANK_R + 0.05, 0.08, 48),
      tankCapMat
    );
    tankBase.position.y = TANK_BASE_Y - 0.04;
    tankBase.castShadow = true; tankBase.receiveShadow = true;
    tankGroup.add(tankBase);

    // Top rim disc
    const capDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(TANK_R + 0.18, TANK_R + 0.18, 0.1, 48),
      tankCapMat
    );
    capDisc.position.y = TANK_TOP_Y + 0.05;
    capDisc.castShadow = true;
    tankGroup.add(capDisc);

    // Conical cap
    const capCone = new THREE.Mesh(
      new THREE.ConeGeometry(TANK_R * 0.85, 0.45, 48),
      tankCapMat
    );
    capCone.position.y = TANK_TOP_Y + 0.1 + 0.225;
    capCone.castShadow = true;
    tankGroup.add(capCone);

    // ── Chimney pipe ──
    const CHIM_BASE_Y = TANK_TOP_Y + 0.55;
    const CHIM_TOP_Y  = topY + TOP_T / 2 + 1.6;
    const CHIM_LEN = CHIM_TOP_Y - CHIM_BASE_Y;
    const chim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, CHIM_LEN, 24),
      metalMat
    );
    chim.position.y = CHIM_BASE_Y + CHIM_LEN / 2;
    chim.castShadow = true;
    scene.add(chim);

    const chimHat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24),
      metalMat
    );
    chimHat.position.y = CHIM_TOP_Y + 0.05;
    chimHat.castShadow = true;
    scene.add(chimHat);

    // ── Water column ──
    const WATER_R = TANK_R - 0.025;
    const waterBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a5a8c, roughness: 0.06, metalness: 0.0,
      transmission: 0.4, thickness: 1.2, ior: 1.33,
      transparent: true, opacity: 0.92,
      side: THREE.DoubleSide, envMapIntensity: 1.3,
    });
    const waterColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(WATER_R, WATER_R, 1, 48, 1, true),
      waterBodyMat
    );
    waterColumn.position.y = TANK_BASE_Y + 0.5;
    scene.add(waterColumn);

    const waterBottom = new THREE.Mesh(
      new THREE.CircleGeometry(WATER_R, 48),
      waterBodyMat
    );
    waterBottom.rotation.x = Math.PI / 2;
    waterBottom.position.y = TANK_BASE_Y + 0.005;
    scene.add(waterBottom);

    // ── Animated water surface (polar grid, CPU vertex displacement) ──
    const surfaceGeo = makePolarGrid(WATER_R, 10, 40);
    const origPositions = new Float32Array(surfaceGeo.attributes.position.array);
    const surfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x2c8fc4, roughness: 0.04, metalness: 0.0,
      transmission: 0.25, thickness: 0.6, ior: 1.33,
      transparent: true, opacity: 0.95, side: THREE.DoubleSide,
      envMapIntensity: 1.6, clearcoat: 0.9, clearcoatRoughness: 0.06,
    });
    const waterSurface = new THREE.Mesh(surfaceGeo, surfaceMat);
    scene.add(waterSurface);
    const surfPosAttr = waterSurface.geometry.attributes.position;

    // ── Sensor LED ──
    const sensorLEDMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, roughness: 0.4, metalness: 0.1,
      emissive: 0xaaaaaa, emissiveIntensity: 0.8,
    });
    const sensorLED = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      sensorLEDMat
    );
    sensorLED.position.set(TANK_R + 0.3, TANK_TOP_Y - 0.4, 0);
    scene.add(sensorLED);

    const sLEDLight = new THREE.PointLight(0xaaaaaa, 0.5, 2.5);
    sLEDLight.position.copy(sensorLED.position);
    scene.add(sLEDLight);

    // ── Resize ──
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // ── RAF gating (IntersectionObserver + visibilitychange) ──
    let rafId;
    let lastTime = performance.now();
    const startTime = lastTime;
    let isInView = true;
    let isDocVisible = !document.hidden;
    const onVisibility = () => { isDocVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver(
      ([entry]) => { isInView = entry.isIntersecting; },
      { threshold: 0.01 }
    );
    io.observe(container);

    // ── Animate ──
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!isInView || !isDocVisible) return;
      const t = (now - startTime) / 1000;

      // Level lerp — dt-based so speed is frame-rate independent
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.currentLevel += (ctx.targetLevel - ctx.currentLevel) * Math.min(dt * 4.2, 1);
        if (Math.abs(ctx.targetLevel - ctx.currentLevel) < 0.0005) {
          ctx.currentLevel = ctx.targetLevel;
        }
      }

      const currentLevel = ctx ? ctx.currentLevel : 0;
      const waterH = currentLevel * WATER_MAX_H;
      const showWater = waterH > 0.01;

      waterColumn.visible = showWater;
      waterSurface.visible = showWater;
      waterBottom.visible = showWater;

      if (showWater) {
        waterColumn.scale.y = Math.max(waterH, 1e-4);
        waterColumn.position.y = TANK_BASE_Y + waterH / 2;
        waterSurface.position.y = TANK_BASE_Y + waterH;

        // CPU vertex displacement — no GLSL (per design D5)
        for (let i = 0; i < surfPosAttr.count; i++) {
          const ox = origPositions[i * 3];
          const oz = origPositions[i * 3 + 2];
          const wave =
            Math.sin(t * 1.8 + ox * 4.0) * 0.030 +
            Math.cos(t * 1.4 + oz * 5.0) * 0.025 +
            Math.sin(t * 2.6 + (ox + oz) * 3.5) * 0.018;
          surfPosAttr.setY(i, wave);
        }
        surfPosAttr.needsUpdate = true;
        waterSurface.geometry.computeVertexNormals();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    // ── Seed initial level from prop BEFORE animate() reads ctxRef ──
    // Without this, the level-update effect sees ctx=null on first render
    // and the tank stays empty until the next prop change (30-60 s later).
    const initialLevel = (level == null) ? 0 : Math.max(0, Math.min(1, level / 100));
    ctxRef.current = {
      targetLevel: initialLevel,
      currentLevel: initialLevel,
      sensorLEDMat,
      sLEDLight,
    };

    animate();

    // ── Dispose (full cleanup on unmount) ──
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
      // Dispose concrete texture separately (not attached to a mesh material traversed above in all cases)
      if (concreteTex) concreteTex.dispose();
      // Dispose the PMREM render target first, then the generator
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      ctxRef.current = null;
    };
  }, []);

  // ── Level prop update (no re-mount) ─────────────────────────────────────
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Threshold-based LED color
    let ledColor;
    if (level == null) {
      ledColor = 0xaaaaaa; // grey — no data
    } else if (level < 15) {
      ledColor = 0xff3344; // red — low
    } else if (level < 30) {
      ledColor = 0xf5a742; // amber — warning
    } else {
      ledColor = 0x44ff77; // green — ok
    }

    ctx.sensorLEDMat.color.setHex(ledColor);
    ctx.sensorLEDMat.emissive.setHex(ledColor);
    ctx.sLEDLight.color.setHex(ledColor);

    // Update target level (clamped 0..1)
    ctx.targetLevel = (level == null) ? 0 : Math.max(0, Math.min(1, level / 100));
  }, [level]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    />
  );
}
