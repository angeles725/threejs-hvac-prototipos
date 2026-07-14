import { LIGHTING_DEVICE_STATUS, LIGHTING_SHELL_BREAKUP, resolveEngineeringOpacity } from './lighting.js';
import { SURFACE_ENGINEERING_CONTRAST } from './surfaces.js';

const freezeSpecs = (specs) => Object.freeze(Object.fromEntries(
  Object.entries(specs).map(([key, value]) => [key, Object.freeze({ ...value })]),
));

// DesignSpec PBR authority. Metalness stays near-binary: coated/dielectric <= .02, bare metal >= .95.
export const MATERIAL_SPECS = freezeSpecs({
  cinemaRedPainted: {
    type: 'physical', color: 0xd71920, metalness: 0.02, roughness: 0.32,
    clearcoat: 0.52, clearcoatRoughness: 0.24, specularIntensity: 0.48,
    envMapIntensity: 1.15,
  },
  shellWarmWhite: {
    type: 'physical', color: 0xf0ede7, metalness: 0.02, roughness: 0.38,
    clearcoat: 0.32, clearcoatRoughness: 0.2, envMapIntensity: 1.1,
  },
  shellCharcoal: {
    type: 'physical', color: 0x252932, metalness: 0.02, roughness: 0.44,
    clearcoat: 0.16, clearcoatRoughness: 0.42,
  },
  exteriorConcrete: {
    type: 'standard', color: 0x85898e, metalness: 0, roughness: 0.94,
    envMapIntensity: 0.55,
  },
  facadeGlass: {
    type: 'physical', color: 0xc7d9df, metalness: 0, roughness: 0.07,
    transmission: 0.84, opacity: 1, ior: 1.45, thickness: 0.035,
    clearcoat: 0.65, clearcoatRoughness: 0.12, specularIntensity: 1,
    envMapIntensity: 1.6,
  },
  lobbyGlossTile: {
    type: 'physical', color: 0xd7d2c9, metalness: 0, roughness: 0.06,
    clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 2,
  },
  auditoriumAcousticFabric: { type: 'standard', color: 0x202029, metalness: 0, roughness: 0.93 },
  auditoriumCarpet: {
    type: 'standard', color: 0x3a2436, metalness: 0, roughness: 0.98,
    envMapIntensity: 0.12,
  },
  seatBurgundyFabric: { type: 'standard', color: 0x8f1726, metalness: 0, roughness: 0.86 },
  kitchenStainless: { type: 'standard', color: 0xc4c7c8, metalness: 0.95, roughness: 0.32 },
  galvanizedDuct: { type: 'standard', color: 0xaeb4b8, metalness: 0.95, roughness: 0.46 },
  tc300BlackGlass: {
    type: 'physical', color: 0x0b0d11, metalness: 0, roughness: 0.16,
    clearcoat: 0.7, clearcoatRoughness: 0.12,
  },
  // The ring, and only the ring, carries the "device is alive" read at the lobby/corridor
  // framings, where it resolves to a sub-pixel blend with the dark glass behind it.
  tc300BlueRing: {
    type: 'standard', color: 0x148dff, metalness: 0, roughness: 0.28,
    emissive: 0x0879ff, emissiveIntensity: LIGHTING_DEVICE_STATUS.ringEmissiveIntensity,
  },
  uc100WhitePcabs: { type: 'standard', color: 0xf1f2f0, metalness: 0, roughness: 0.54 },
  ug67WhitePcAluminum: { type: 'standard', color: 0xe8e9e7, metalness: 0.02, roughness: 0.48 },
  ug67DarkMountingShell: { type: 'standard', color: 0x202832, metalness: 0.02, roughness: 0.5 },
  rs485Green: {
    type: 'standard', color: 0x29d67d, metalness: 0, roughness: 0.42,
    emissive: 0x0dbf64, emissiveIntensity: SURFACE_ENGINEERING_CONTRAST.mediaEmissiveIntensity,
  },
  networkBlue: {
    type: 'standard', color: 0x2d9cff, metalness: 0, roughness: 0.38,
    emissive: 0x167ce8, emissiveIntensity: SURFACE_ENGINEERING_CONTRAST.mediaEmissiveIntensity,
  },
  // Two separate blue media classes, taken from the spec palette. One shared "network blue" made
  // the dashed RF path and the continuous Ethernet run indistinguishable at preset distance.
  lorawanBlue: {
    type: 'standard', color: 0x38bdf8, metalness: 0, roughness: 0.34,
    emissive: 0x0ea5e9, emissiveIntensity: SURFACE_ENGINEERING_CONTRAST.mediaEmissiveIntensity,
  },
  ethernetBlue: {
    type: 'standard', color: 0x2563eb, metalness: 0, roughness: 0.42,
    emissive: 0x1d4ed8, emissiveIntensity: SURFACE_ENGINEERING_CONTRAST.mediaEmissiveIntensity,
  },
  alarmRed: {
    type: 'standard', color: 0xff334d, metalness: 0, roughness: 0.35,
    emissive: 0xe81631, emissiveIntensity: 0.65,
  },
  offlineGray: { type: 'standard', color: 0x69717a, metalness: 0, roughness: 0.72 },
});

function responsePixels(kind, size = 16) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 17 + y * 31 + x * y * 7) % 19) - 9;
      if (kind.includes('normal')) {
        const strength = kind.startsWith('concrete') ? 8
          : kind.startsWith('panel') ? 7
            : kind.startsWith('carpet') ? 5 : 2;
        data.set([128 + (noise % strength), 128 + ((noise * 3) % strength), 255, 255], offset);
      } else if (kind.startsWith('panel') || kind.startsWith('coat')) {
        /**
         * The shell panels roll their highlight off across the elevation instead of returning one
         * flat linear gradient: a per-plate variation plus a seam every fourth texel.
         *
         * The swing was 150..255 — a 0.41 span on a roughness the material sets at 0.38, so the
         * elevation still resolved as "one flat gradient with no specular variation, no breakup and
         * no grazing sheen". It is now 74..255, a 0.71 span, which is what
         * `LIGHTING_SHELL_BREAKUP.minimumRoughnessVariation` is asserted against. `coat` is the same
         * response driving `clearcoatRoughnessMap`: the uniform coat over the panels is the other
         * half of the smooth-plastic read, and its Fresnel peaks at exactly the angle the grazing
         * look-dev camera stands at.
         */
        const seam = x % 4 === 0 || y % 4 === 0 ? 44 : 0;
        const plate = ((Math.trunc(x / 4) * 7 + Math.trunc(y / 4) * 13) % 11) - 5;
        const value = Math.max(74, Math.min(255, 168 + plate * 13 + seam + noise * 2));
        data.set([value, value, value, 255], offset);
      } else if (kind.startsWith('concrete')) {
        // The plaza carried a +-18/255 wobble on an already-rough material: at a grazing angle it
        // returned no breakup at all. Cast slabs, a joint every fifth texel, and a real swing.
        const joint = x % 5 === 0 || y % 5 === 0 ? -38 : 0;
        const slab = ((Math.trunc(x / 5) * 11 + Math.trunc(y / 5) * 5) % 9) - 4;
        const value = Math.max(96, Math.min(255, 214 + slab * 10 + joint + noise * 2));
        data.set([value, value, value, 255], offset);
      } else {
        const base = kind.startsWith('tile') ? 236 : 248;
        const variation = kind.startsWith('tile') ? noise : Math.trunc(noise / 2);
        const value = Math.max(196, Math.min(255, base + variation));
        data.set([value, value, value, 255], offset);
      }
    }
  }
  return data;
}

function createResponseTexture(THREE, kind, repeat) {
  const texture = new THREE.DataTexture(
    responsePixels(kind), 16, 16, THREE.RGBAFormat, THREE.UnsignedByteType,
  );
  texture.name = `cinemex-response-${kind}`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.repeat.set(repeat, repeat);
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Engineering translucency is per-material: the seats and the carpet bled through the shell and
 * washed the thin RS-485 / LoRaWAN media, so they contribute far less than the shell itself.
 *
 * Every value is the surface-pass figure passed through the lighting pass's de-ghosting factor:
 * the spec's single-layer opacities composited across the eleven shell layers the evidence rays
 * actually cross, which is what turned the engineering state milky.
 */
const ENGINEERING_OPACITY = Object.freeze({
  seatBurgundyFabric: resolveEngineeringOpacity(SURFACE_ENGINEERING_CONTRAST.seatOpacity),
  auditoriumCarpet: resolveEngineeringOpacity(SURFACE_ENGINEERING_CONTRAST.carpetOpacity),
});

function engineeringOpacity(material) {
  // Zone variants are named `cinemex-<spec>@<zone>`: the zone changes how much of the exterior rig
  // the surface reflects, never how translucent it goes in the engineering state.
  const key = String(material.name ?? '').replace(/^cinemex-/, '').replace(/@.*$/, '');
  return ENGINEERING_OPACITY[key]
    ?? resolveEngineeringOpacity(SURFACE_ENGINEERING_CONTRAST.shellOpacity);
}

function normalizedBaseline(material) {
  return {
    transparent: material.transparent ?? false,
    opacity: material.opacity ?? 1,
    depthWrite: material.depthWrite ?? true,
  };
}

export function createMaterialRegistry(THREE) {
  if (!THREE?.MeshStandardMaterial || !THREE?.MeshPhysicalMaterial) {
    throw new TypeError('A complete Three.js material namespace is required.');
  }

  const materialPool = new Map();
  const cutawayMaterials = new Set();
  const responseTextures = new Set();
  const baselines = new WeakMap();
  let engineeringEnabled = false;
  let disposed = false;

  function instantiate(spec) {
    const { type = 'standard', ...parameters } = spec;
    const MaterialClass = type === 'physical' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    return new MaterialClass(parameters);
  }

  function getMaterial(key, spec = MATERIAL_SPECS[key]) {
    if (materialPool.has(key)) return materialPool.get(key);
    if (!spec) throw new Error(`Unknown material key: ${key}`);
    const material = instantiate(spec);
    material.name = `cinemex-${key}`;
    materialPool.set(key, material);
    return material;
  }

  const canonical = Object.fromEntries(
    Object.keys(MATERIAL_SPECS).map((key) => [key, getMaterial(key)]),
  );
  if (THREE.DataTexture && THREE.Vector2) {
    const concreteRoughness = createResponseTexture(THREE, 'concrete-roughness', LIGHTING_SHELL_BREAKUP.plazaRoughnessRepeat);
    const concreteNormal = createResponseTexture(THREE, 'concrete-normal', 7);
    const tileRoughness = createResponseTexture(THREE, 'tile-roughness', 12);
    const tileNormal = createResponseTexture(THREE, 'tile-normal', 10);
    const carpetRoughness = createResponseTexture(THREE, 'carpet-roughness', 24);
    const carpetNormal = createResponseTexture(THREE, 'carpet-normal', 24);
    const panelRoughness = createResponseTexture(THREE, 'panel-roughness', LIGHTING_SHELL_BREAKUP.roughnessRepeat);
    const panelNormal = createResponseTexture(THREE, 'panel-normal', LIGHTING_SHELL_BREAKUP.normalRepeat);
    // The clearcoat gets its own breakup. A uniform coat is a mirror at the grazing angle no matter
    // what the roughness map underneath it is doing — that is the smooth-plastic response.
    const coatRoughness = createResponseTexture(THREE, 'coat-roughness', LIGHTING_SHELL_BREAKUP.clearcoatRoughnessRepeat);
    responseTextures.add(panelRoughness);
    responseTextures.add(panelNormal);
    responseTextures.add(coatRoughness);
    canonical.shellWarmWhite.roughnessMap = panelRoughness;
    canonical.shellWarmWhite.normalMap = panelNormal;
    canonical.shellWarmWhite.clearcoatRoughnessMap = coatRoughness;
    canonical.shellWarmWhite.normalScale = new THREE.Vector2(
      LIGHTING_SHELL_BREAKUP.normalScale,
      LIGHTING_SHELL_BREAKUP.normalScale,
    );
    responseTextures.add(concreteRoughness);
    responseTextures.add(concreteNormal);
    responseTextures.add(tileRoughness);
    responseTextures.add(tileNormal);
    responseTextures.add(carpetRoughness);
    responseTextures.add(carpetNormal);
    canonical.exteriorConcrete.roughnessMap = concreteRoughness;
    canonical.exteriorConcrete.normalMap = concreteNormal;
    canonical.exteriorConcrete.normalScale = new THREE.Vector2(0.11, 0.11);
    canonical.lobbyGlossTile.roughnessMap = tileRoughness;
    canonical.lobbyGlossTile.normalMap = tileNormal;
    canonical.lobbyGlossTile.normalScale = new THREE.Vector2(0.035, 0.035);
    canonical.auditoriumCarpet.roughnessMap = carpetRoughness;
    canonical.auditoriumCarpet.normalMap = carpetNormal;
    canonical.auditoriumCarpet.normalScale = new THREE.Vector2(0.1, 0.1);
  }
  const materials = Object.freeze({
    ...canonical,
    architecturalShell: canonical.shellWarmWhite,
    brandRed: canonical.cinemaRedPainted,
    technicalBlue: canonical.networkBlue,
    glass: canonical.facadeGlass,
  });

  function applyEngineeringState(material) {
    if (!baselines.has(material)) baselines.set(material, normalizedBaseline(material));
    Object.assign(material, engineeringEnabled
      ? { transparent: true, opacity: engineeringOpacity(material), depthWrite: false }
      : baselines.get(material));
    material.needsUpdate = true;
  }

  function registerCutawayMaterials(nextMaterials = []) {
    for (const material of nextMaterials) {
      if (!material) continue;
      if (!baselines.has(material)) baselines.set(material, normalizedBaseline(material));
      cutawayMaterials.add(material);
      applyEngineeringState(material);
    }
  }

  function setEngineeringMode(enabled) {
    engineeringEnabled = Boolean(enabled);
    for (const material of cutawayMaterials) applyEngineeringState(material);
  }

  function setCutaway(enabled, plane) {
    for (const material of cutawayMaterials) {
      material.clippingPlanes = enabled && plane ? [plane] : [];
      material.needsUpdate = true;
    }
  }

  function getStats() {
    return Object.freeze({
      materialCount: materialPool.size,
      responseTextureCount: responseTextures.size,
      cutawayCount: cutawayMaterials.size,
      engineeringEnabled,
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const material of new Set(materialPool.values())) material.dispose();
    for (const texture of responseTextures) texture.dispose();
  }

  registerCutawayMaterials([canonical.shellWarmWhite]);

  return Object.freeze({
    materials,
    getMaterial,
    getStats,
    setEngineeringMode,
    registerCutawayMaterials,
    setCutaway,
    dispose,
  });
}
