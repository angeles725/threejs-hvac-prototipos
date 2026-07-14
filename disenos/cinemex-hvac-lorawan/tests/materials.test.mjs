import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveShellLayerOpacity } from '../src/scene/lighting.js';
import {
  MATERIAL_SPECS,
  createMaterialRegistry,
} from '../src/scene/materials.js';
import { SURFACE_ENGINEERING_CONTRAST } from '../src/scene/surfaces.js';

class FakeMaterial {
  constructor(parameters = {}) {
    Object.assign(this, parameters);
    this.disposeCalls = 0;
    this.needsUpdate = false;
  }

  dispose() {
    this.disposeCalls += 1;
  }
}

class FakeTexture {
  constructor(data, width, height) {
    this.image = { data, width, height };
    this.repeat = { set: (x, y) => { this.repeatValue = [x, y]; } };
    this.disposeCalls = 0;
  }

  dispose() {
    this.disposeCalls += 1;
  }
}

const THREE = {
  MeshStandardMaterial: FakeMaterial,
  MeshPhysicalMaterial: FakeMaterial,
  DataTexture: FakeTexture,
  Vector2: class Vector2 { constructor(x, y) { this.x = x; this.y = y; } },
  RGBAFormat: 'rgba',
  UnsignedByteType: 'ubyte',
  RepeatWrapping: 'repeat',
  LinearMipmapLinearFilter: 'mipmap',
};

test('final material response calibration publishes a physically separated shell palette', () => {
  assert.deepEqual(MATERIAL_SPECS.cinemaRedPainted, {
    type: 'physical', color: 0xd71920, metalness: 0.02, roughness: 0.32,
    clearcoat: 0.52, clearcoatRoughness: 0.24, specularIntensity: 0.48,
    envMapIntensity: 1.15,
  });
  assert.deepEqual(MATERIAL_SPECS.shellWarmWhite, {
    type: 'physical', color: 0xf0ede7, metalness: 0.02, roughness: 0.38,
    clearcoat: 0.32, clearcoatRoughness: 0.2, envMapIntensity: 1.1,
  });
  assert.deepEqual(MATERIAL_SPECS.shellCharcoal, {
    type: 'physical', color: 0x252932, metalness: 0.02, roughness: 0.44,
    clearcoat: 0.16, clearcoatRoughness: 0.42,
  });
  assert.deepEqual(MATERIAL_SPECS.exteriorConcrete, {
    type: 'standard', color: 0x85898e, metalness: 0, roughness: 0.94,
    envMapIntensity: 0.55,
  });
  assert.deepEqual(MATERIAL_SPECS.facadeGlass, {
    type: 'physical', color: 0xc7d9df, metalness: 0, roughness: 0.07,
    transmission: 0.84, opacity: 1, ior: 1.45, thickness: 0.035,
    clearcoat: 0.65, clearcoatRoughness: 0.12, specularIntensity: 1,
    envMapIntensity: 1.6,
  });
  assert.deepEqual(MATERIAL_SPECS.lobbyGlossTile, {
    type: 'physical', color: 0xd7d2c9, metalness: 0, roughness: 0.06,
    clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 2,
  });
  assert.equal(MATERIAL_SPECS.auditoriumCarpet.color, 0x3a2436);
  assert.equal(MATERIAL_SPECS.auditoriumCarpet.roughness, 0.98);
  assert.equal(MATERIAL_SPECS.auditoriumCarpet.envMapIntensity, 0.12);

  for (const spec of Object.values(MATERIAL_SPECS)) {
    assert.ok(
      spec.metalness <= 0.02 || spec.metalness >= 0.95,
      `metalness must stay near-binary: ${JSON.stringify(spec)}`,
    );
  }
});

test('registry creates shared procedural response maps instead of graphic textures', () => {
  const registry = createMaterialRegistry(THREE);
  const { materials } = registry;

  // Derived: every response texture in the pool is actually consumed by a material, and every
  // material that declares a response carries BOTH of its maps. Counting the pool against a
  // hand-copied number only pinned the map set of the day the test was written.
  //
  // The lighting pass added a THIRD response slot — `clearcoatRoughnessMap` on the shell. The
  // invariant is unchanged and is now asserted over every slot a responder can carry: `clearcoat` is
  // a uniform coat whose Fresnel goes to 1 at exactly the angle the `grazing` look-dev camera stands
  // at, so a coat with no breakup returns one flat gradient no matter what the roughness map beneath
  // it does — which is the smooth-plastic response the grazing review rejected.
  const responders = ['exteriorConcrete', 'lobbyGlossTile', 'auditoriumCarpet', 'shellWarmWhite'];
  const RESPONSE_SLOTS = ['roughnessMap', 'normalMap', 'clearcoatRoughnessMap'];
  const consumed = new Set(responders.flatMap(
    (key) => RESPONSE_SLOTS.map((slot) => materials[key][slot]).filter(Boolean),
  ));
  assert.ok(consumed.size >= responders.length * 2, 'each responder owns its own roughness/normal pair');
  assert.equal(registry.getStats().responseTextureCount, consumed.size, 'the pool holds no orphan texture');
  for (const key of responders) {
    assert.ok(materials[key].roughnessMap instanceof FakeTexture, `${key} needs a roughness response`);
    assert.ok(materials[key].normalMap instanceof FakeTexture, `${key} needs a normal response`);
  }
  assert.deepEqual(
    [materials.lobbyGlossTile.normalScale.x, materials.lobbyGlossTile.normalScale.y],
    [0.035, 0.035],
  );
  assert.deepEqual(
    [materials.exteriorConcrete.normalScale.x, materials.exteriorConcrete.normalScale.y],
    [0.11, 0.11],
  );
  assert.equal(materials.exteriorConcrete.roughnessMap.image.width, 16);
});

test('registry shares canonical and dynamic materials without per-instance churn', () => {
  const registry = createMaterialRegistry(THREE);
  assert.equal(registry.getMaterial('cinemaRedPainted'), registry.materials.cinemaRedPainted);
  assert.equal(registry.materials.architecturalShell, registry.materials.shellWarmWhite);
  assert.equal(registry.materials.brandRed, registry.materials.cinemaRedPainted);
  assert.equal(registry.materials.glass, registry.materials.facadeGlass);

  const before = registry.getStats().materialCount;
  const first = registry.getMaterial('proxyShared', {
    type: 'standard', color: 0x334155, metalness: 0, roughness: 0.8,
  });
  const second = registry.getMaterial('proxyShared', {
    type: 'standard', color: 0xffffff, metalness: 0.95, roughness: 0.1,
  });
  assert.equal(first, second);
  assert.equal(registry.getStats().materialCount, before + 1);
});

test('engineering mode makes every registered shell material translucent and restores defaults', () => {
  const registry = createMaterialRegistry(THREE);
  const extra = registry.getMaterial('registeredFrame', {
    type: 'standard', color: 0xaeb4b8, metalness: 0.95, roughness: 0.46,
  });
  registry.registerCutawayMaterials([registry.materials.facadeGlass, extra]);

  registry.setEngineeringMode(true);
  for (const material of [registry.materials.architecturalShell, registry.materials.facadeGlass, extra]) {
    assert.equal(material.transparent, true);
    // The per-layer opacity is derived from the composite the shell stack is allowed to reach, so
    // this asserts the relationship, not the number: the DesignSpec's 0.18 is a SINGLE-layer
    // figure and the evidence rays cross eleven layers of shell.
    assert.equal(material.opacity, resolveShellLayerOpacity());
    assert.ok(material.opacity > 0 && material.opacity <= SURFACE_ENGINEERING_CONTRAST.shellOpacity);
    assert.equal(material.depthWrite, false);
    assert.equal(material.needsUpdate, true);
  }

  registry.setEngineeringMode(false);
  assert.deepEqual(
    [registry.materials.architecturalShell.transparent, registry.materials.architecturalShell.opacity, registry.materials.architecturalShell.depthWrite],
    [false, 1, true],
  );
  assert.deepEqual(
    [registry.materials.facadeGlass.transparent, registry.materials.facadeGlass.opacity, registry.materials.facadeGlass.depthWrite],
    [false, 1, true],
  );
});

test('registry disposes each shared material exactly once even through aliases', () => {
  const registry = createMaterialRegistry(THREE);
  const unique = new Set(Object.values(registry.materials));
  const responseTextures = new Set([
    registry.materials.exteriorConcrete.roughnessMap,
    registry.materials.exteriorConcrete.normalMap,
    registry.materials.lobbyGlossTile.roughnessMap,
    registry.materials.lobbyGlossTile.normalMap,
    registry.materials.auditoriumCarpet.roughnessMap,
    registry.materials.auditoriumCarpet.normalMap,
  ]);
  registry.dispose();
  assert.ok([...unique].every((material) => material.disposeCalls === 1));
  assert.ok([...responseTextures].every((texture) => texture.disposeCalls === 1));
});
