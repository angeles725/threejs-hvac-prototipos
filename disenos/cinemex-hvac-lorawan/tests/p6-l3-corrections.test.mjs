import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RTU_PACKAGE,
  ROOF_ANTI_COPLANAR,
  createArchitecturePlan,
  createArchitectureStructure,
} from '../src/scene/architecture.js';

// ---------------------------------------------------------------------------
// Minimal Three.js + document stubs (the shape every builder test in this suite uses).
// ---------------------------------------------------------------------------

function createContext() {
  return new Proxy({
    measureText: (value) => ({ width: String(value).length * 12 }),
    canvas: { width: 0, height: 0 },
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function createDocumentStub() {
  return {
    createElement: (tag) => (tag === 'canvas'
      ? { width: 0, height: 0, getContext: () => createContext() }
      : null),
  };
}

class StubVector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(other) { return this.set(other.x, other.y, other.z); }
  normalize() { return this; }
  addScaledVector() { return this; }
  project() { return this; }
}

class StubObject3D {
  constructor() {
    this.position = new StubVector3();
    this.rotation = { set: () => undefined };
    this.scale = { set: () => undefined, setScalar: () => undefined };
    this.quaternion = { setFromUnitVectors: () => undefined };
    this.matrix = {};
  }

  updateMatrix() {}
}

class StubGroup {
  constructor() {
    this.children = [];
    this.visible = true;
    this.userData = {};
    this.position = new StubVector3();
    this.rotation = { x: 0, y: 0, z: 0, set: () => undefined };
    this.scale = { set: () => undefined, setScalar: () => undefined };
  }

  add(child) { this.children.push(child); child.parent = this; }
  remove(child) { this.children = this.children.filter((entry) => entry !== child); }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse?.(callback); }
}

class StubMesh extends StubGroup {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.renderOrder = 0;
  }
}

class StubInstancedMesh extends StubMesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
    this.instanceMatrix = { needsUpdate: false };
  }

  setMatrixAt() {}
  computeBoundingSphere() {}
}

function createThreeStub() {
  class Geometry {
    constructor(...args) { this.args = args; }
    rotateX() { return this; }
    setAttribute() { return this; }
    setFromPoints() { return this; }
    computeVertexNormals() { return this; }
    dispose() {}
  }
  class MaterialStub {
    constructor(parameters = {}) { Object.assign(this, parameters); }
    clone() { return new MaterialStub({ ...this }); }
    dispose() {}
  }
  return {
    BoxGeometry: Geometry,
    ConeGeometry: Geometry,
    PlaneGeometry: Geometry,
    TorusGeometry: Geometry,
    BufferGeometry: Geometry,
    CylinderGeometry: Geometry,
    Float32BufferAttribute: class { constructor(values) { this.values = values; } },
    InstancedMesh: StubInstancedMesh,
    Mesh: StubMesh,
    Line: StubMesh,
    Sprite: StubMesh,
    Group: StubGroup,
    Object3D: StubObject3D,
    Vector3: StubVector3,
    MeshStandardMaterial: MaterialStub,
    MeshPhysicalMaterial: MaterialStub,
    MeshBasicMaterial: MaterialStub,
    LineBasicMaterial: MaterialStub,
    SpriteMaterial: MaterialStub,
    CanvasTexture: class { constructor(canvas) { this.image = canvas; } dispose() {} },
    DoubleSide: 'double',
    SRGBColorSpace: 'srgb',
    ClampToEdgeWrapping: 'clamp',
    LinearMipmapLinearFilter: 'mipmap',
    LinearFilter: 'linear',
  };
}

const LAYER_NAMES = ['architecture', 'roof', 'walls', 'hvac', 'rs485', 'lorawan', 'internet', 'labels'];

function buildArchitecture() {
  const previousDocument = globalThis.document;
  globalThis.document = createDocumentStub();
  try {
    const groups = Object.fromEntries(LAYER_NAMES.map((name) => [name, new StubGroup()]));
    const asset = createArchitectureStructure({ THREE: createThreeStub(), groups });
    return { asset, groups };
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

function instancesOf(asset, predicate) {
  return asset.meshes.flatMap((mesh) => (mesh.userData.instances ?? []).map((instance) => ({
    ...instance,
    meshName: mesh.name,
    meshLayer: mesh.userData.layer,
  }))).filter(predicate);
}

const aabbOf = ({ position, size }) => ({
  min: position.map((value, axis) => value - size[axis] / 2),
  max: position.map((value, axis) => value + size[axis] / 2),
});

const aabbsIntersect = (a, b) => [0, 1, 2].every((axis) => (
  a.min[axis] < b.max[axis] - 1e-9 && a.max[axis] > b.min[axis] + 1e-9
));

// ---------------------------------------------------------------------------
// Item 11 — anti-coplanar sweep over the WHOLE roof assembly, derived, no hand-list.
//
// Z-fighting under camera rotation needs two RENDERABLE faces on (nearly) the same plane:
//   * SAME-side faces (top-top / bottom-bottom per axis) of two boxes that overlap in the
//     other two axes — both faces have the same orientation, both rasterize, they flicker.
//   * OPPOSITE-side faces with a sub-epsilon AIR GAP — both exposed, near-coplanar.
// OPPOSITE-side faces in contact or interpenetrating are NOT a fight: with front-side
// materials the buried/back face never rasterizes toward the camera. That is why the fix
// is embedding (contact by interpenetration) and protrusion, never shared planes.
// ---------------------------------------------------------------------------

/** Every box of the roof assembly: the roof layer plus the rooftop plant, fans included. */
function collectRoofAssembly(asset) {
  const boxes = [];
  for (const mesh of asset.meshes) {
    for (const instance of mesh.userData.instances ?? []) {
      const kind = String(instance.metadata?.kind ?? '');
      const isRoofLayer = mesh.userData.layer === 'roof';
      const isPlant = kind.startsWith('roof-service');
      if (!isRoofLayer && !isPlant) continue;
      let { size } = instance;
      // The condenser fan pools are cylinders/tori: use their real bounding boxes.
      if (kind === 'rtu-condenser-fan') {
        size = [RTU_PACKAGE.fan.radius * 2, RTU_PACKAGE.fan.height, RTU_PACKAGE.fan.radius * 2];
      } else if (kind === 'rtu-fan-guard') {
        const reach = (RTU_PACKAGE.fan.guardRadius + RTU_PACKAGE.fan.guardTube) * 2;
        size = [reach, RTU_PACKAGE.fan.guardTube * 2, reach];
      }
      boxes.push({
        id: `${instance.metadata?.entityId}#${instance.metadata?.component ?? kind}`,
        ...aabbOf({ position: instance.position, size }),
      });
    }
  }
  return boxes;
}

function overlap1d(a, b, axis) {
  return Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);
}

function coplanarViolations(boxes, epsilon) {
  const violations = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      for (let axis = 0; axis < 3; axis += 1) {
        const other = [0, 1, 2].filter((value) => value !== axis);
        if (other.some((o) => overlap1d(a, b, o) <= 1e-6)) continue;
        // Same-side faces: same orientation, both rasterize -> must be separated.
        for (const side of ['min', 'max']) {
          const delta = Math.abs(a[side][axis] - b[side][axis]);
          if (delta < epsilon) {
            violations.push(`${a.id} vs ${b.id}: ${side}[${axis}] planes ${delta.toFixed(4)} apart`);
          }
        }
        // Opposite-side faces: a sub-epsilon AIR GAP leaves both faces exposed and coplanar.
        for (const [near, far] of [[a, b], [b, a]]) {
          const gap = far.min[axis] - near.max[axis];
          if (gap > 1e-9 && gap < epsilon) {
            violations.push(`${near.id} vs ${far.id}: ${gap.toFixed(4)} air gap on axis ${axis}`);
          }
        }
      }
    }
  }
  return violations;
}

test('item 11: no two roof-assembly boxes carry renderable near-coplanar faces', () => {
  const { asset } = buildArchitecture();
  const boxes = collectRoofAssembly(asset);
  assert.ok(boxes.length > 100, `the sweep must cover the whole assembly (saw ${boxes.length} boxes)`);
  const violations = coplanarViolations(boxes, ROOF_ANTI_COPLANAR.minPlaneSeparation);
  assert.deepEqual(
    violations.slice(0, 20),
    [],
    `${violations.length} near-coplanar face pairs (z-fighting under rotation):\n${violations.slice(0, 20).join('\n')}`,
  );
});

test('item 11: stacked roof elements embed, decals protrude — the constructive epsilons exist', () => {
  assert.ok(ROOF_ANTI_COPLANAR.minPlaneSeparation >= 0.005);
  assert.ok(ROOF_ANTI_COPLANAR.contactEmbed >= 0.01, 'stacked contact must interpenetrate, never share a plane');
  assert.ok(ROOF_ANTI_COPLANAR.decalEmbed >= 0.01 && ROOF_ANTI_COPLANAR.decalProtrusion >= 0.02);

  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const units = new Map(plan.structural.roofService.packagedUnits.map((unit) => [unit.id, unit]));

  // Every curb interpenetrates its plate: contact by embedding, not by a shared plane.
  const curbs = instancesOf(asset, ({ metadata }) => metadata.kind === 'rtu-curb');
  assert.equal(curbs.length, 14);
  for (const curb of curbs) {
    const unit = units.get(curb.metadata.rtuId);
    const base = curb.position[1] - curb.size[1] / 2;
    assert.ok(
      Math.abs((unit.plateTop - base) - ROOF_ANTI_COPLANAR.contactEmbed) < 1e-9,
      `${unit.id} curb must embed exactly ${ROOF_ANTI_COPLANAR.contactEmbed} m into its plate (got ${(unit.plateTop - base).toFixed(4)})`,
    );
    assert.ok(curb.position[1] + curb.size[1] / 2 > unit.plateTop, 'the curb must remain visibly above the plate');
  }

  // Every fascia PROTRUDES above its plate top instead of sharing its plane.
  const fascias = instancesOf(asset, ({ metadata }) => metadata.kind === 'roof-fascia');
  assert.ok(fascias.length > 0);
  for (const band of fascias) {
    const top = band.position[1] + band.size[1] / 2;
    assert.ok(
      Math.abs((top - band.metadata.plateTop) - ROOF_ANTI_COPLANAR.fasciaProtrusion) < 1e-9,
      `${band.metadata.entityId} must protrude ${ROOF_ANTI_COPLANAR.fasciaProtrusion} above its plate`,
    );
  }

  // Equal-height neighbours no longer emit twin coplanar fascias on the shared border.
  const byRoom = new Map();
  for (const band of fascias) {
    byRoom.set(band.metadata.auditoriumId, (byRoom.get(band.metadata.auditoriumId) ?? 0) + 1);
  }
  for (const room of plan.auditoriums) {
    const neighbours = plan.auditoriums.filter((other) => (
      other !== room
      && other.bounds.x[0] === room.bounds.x[0]
      && (other.bounds.z[0] === room.bounds.z[1] || other.bounds.z[1] === room.bounds.z[0])
      && Math.abs(other.height - room.height) < 1e-6
    ));
    assert.equal(
      byRoom.get(room.id),
      4 - neighbours.length,
      `${room.id} must skip the fascia on every equal-height shared border`,
    );
  }
});

// ---------------------------------------------------------------------------
// Item 12 — the RTU master follows the V10 reference read (two-section cabinet).
// RED before the fix: one full-length cap, fan at x+0.55 on the cap, no platform/divider/
// grille/handles — the master read as a single lump. (How well it READS is render-judged.)
// ---------------------------------------------------------------------------

test('item 12: the RTU master is a two-section cabinet — hood end, divider, fan platform, grille', () => {
  const { asset } = buildArchitecture();
  const parts = instancesOf(asset, ({ metadata }) => String(metadata.kind).startsWith('rtu-'));
  const byUnit = new Map();
  for (const part of parts) {
    if (!byUnit.has(part.metadata.rtuId)) byUnit.set(part.metadata.rtuId, []);
    byUnit.get(part.metadata.rtuId).push(part);
  }
  const fans = instancesOf(asset, ({ metadata }) => metadata.kind === 'rtu-condenser-fan');
  assert.equal(fans.length, 14);

  for (const unit of asset.plan.structural.roofService.packagedUnits) {
    const own = new Map(byUnit.get(unit.id)
      .filter(({ metadata }) => !String(metadata.kind).includes('seam')
        && !String(metadata.kind).includes('handle')
        && !String(metadata.kind).includes('guard-bar'))
      .map((part) => [part.metadata.kind, part]));
    const [x] = unit.position;
    const hood = own.get('rtu-intake-hood');
    const divider = own.get('rtu-section-divider');
    const platform = own.get('rtu-condenser-platform');
    const grille = own.get('rtu-condenser-grille');
    const cap = own.get('rtu-cap');
    const fan = fans.find(({ metadata }) => metadata.rtuId === unit.id);

    // Section ordering along the long axis: hood -> divider -> fan platform -> end grille.
    assert.ok(hood.position[0] < divider.position[0], `${unit.id}: the intake hood must sit on the AH side`);
    assert.ok(divider.position[0] < fan.position[0], `${unit.id}: the fan must sit on the condenser side`);
    assert.ok(fan.position[0] < grille.position[0], `${unit.id}: the grille closes the condenser end`);
    // The fan sits ON the condenser platform, inside its footprint.
    const platformBox = aabbOf(platform);
    assert.ok(
      fan.position[0] > platformBox.min[0] && fan.position[0] < platformBox.max[0],
      `${unit.id}: the fan must stand on the condenser platform`,
    );
    // The dark cap covers only the AH section; cap and platform never overlap in x.
    const capBox = aabbOf(cap);
    assert.ok(capBox.max[0] < platformBox.min[0], `${unit.id}: cap (AH roof trim) and condenser platform must split the top`);
    // The proportions stay the spec's 2.5 x 1.5 x 1.2 (the V10 read is adapted, not copied).
    assert.deepEqual(own.get('rtu-cabinet').size, [...RTU_PACKAGE.size]);
    // The condensate drain leaves the AH end (item 14 doubles as V10 recognition realism).
    const drain = asset.plan.structural.roofService.condensateDrains.find(({ rtuId }) => rtuId === unit.id);
    assert.ok(drain.socket[0] < x, `${unit.id}: the condensate outlet belongs on the AH end`);
  }
});

// ---------------------------------------------------------------------------
// Item 13 — service lanes: rows per plate, aligned columns, ownership untouched.
// RED before the fix: public-band units scattered on six different z values.
// ---------------------------------------------------------------------------

test('item 13: units on one plate share that plate service lane; sala columns align', () => {
  const plan = createArchitecturePlan();
  const units = plan.structural.roofService.packagedUnits;
  assert.equal(units.length, 14, 'the lane arrangement must not change unit count');
  assert.equal(new Set(units.map(({ zoneId }) => zoneId)).size, 14, 'one unit per zone stays the contract');

  const byPlate = new Map();
  for (const unit of units) {
    if (!byPlate.has(unit.plateOwner)) byPlate.set(unit.plateOwner, []);
    byPlate.get(unit.plateOwner).push(unit);
  }
  for (const [plateOwner, sharing] of byPlate) {
    const lanes = new Set(sharing.map(({ position }) => position[2]));
    assert.equal(lanes.size, 1, `${plateOwner} must carry ONE service lane, not a scatter`);
    // The lane derives from the plate bounds, never from a magic number.
    const laneZ = [...lanes][0];
    assert.ok(
      Math.abs(laneZ - (sharing[0].plateBounds.z[0] + sharing[0].plateBounds.z[1]) / 2) < 1e-9,
      `${plateOwner} lane must be the plate centre-line`,
    );
  }
  // The public plate now carries a six-unit row.
  assert.equal(byPlate.get('front-public-roof').length, 6);

  // The sala units form one aligned column per side.
  const salaUnits = units.filter(({ zoneId }) => zoneId.startsWith('sala-'));
  const westColumn = new Set(salaUnits.filter(({ position }) => position[0] < 0).map(({ position }) => position[0]));
  const eastColumn = new Set(salaUnits.filter(({ position }) => position[0] > 0).map(({ position }) => position[0]));
  assert.equal(westColumn.size, 1, 'west sala units must align in one column');
  assert.equal(eastColumn.size, 1, 'east sala units must align in one column');

  // Lane packing stays collision-free.
  const boxes = units.map((unit) => aabbOf({
    position: [unit.position[0], unit.position[1] + 0.7, unit.position[2]],
    size: [unit.size[0], 1.45, unit.size[2]],
  }));
  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      assert.ok(!aabbsIntersect(boxes[a], boxes[b]), `${units[a].id} collides with ${units[b].id} in the lane`);
    }
  }
});

// ---------------------------------------------------------------------------
// Item 14 — duct branches and condensate drains (spec `duct_branches` / `condensate_drains`).
// RED before the fix: neither plan section nor any emitted branch/drain geometry existed.
// ---------------------------------------------------------------------------

function pointInBox(point, box) {
  return [0, 1, 2].every((axis) => (
    point[axis] >= box.min[axis] - 1e-9 && point[axis] <= box.max[axis] + 1e-9
  ));
}

test('item 14: eight branches cover the eight auditoriums; every joint overlaps the supply main', () => {
  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const branches = plan.structural.roofService.ductBranches;
  assert.equal(branches.length, 8);
  assert.deepEqual(
    new Set(branches.map(({ auditoriumId }) => auditoriumId)),
    new Set(plan.auditoriums.map(({ id }) => id)),
    'one branch per auditorium, exactly once',
  );

  const emitted = instancesOf(asset, ({ metadata }) => metadata.kind === 'roof-service-branch');
  const supply = plan.structural.roofService.routes.find(({ medium }) => medium === 'supply');
  const supplyBoxes = [aabbOf(supply.main), aabbOf(supply.plenum)];
  const returnMain = aabbOf(plan.structural.roofService.routes.find(({ medium }) => medium === 'return').main);

  for (const branch of branches) {
    const own = emitted.filter(({ metadata }) => metadata.entityId === branch.id);
    const components = new Set(own.map(({ metadata }) => metadata.component));
    assert.ok(components.has('room-run'), `${branch.id} must reach its room`);
    assert.ok(components.has('joint-strap'), `${branch.id} must be strapped at the joint (catalog vocabulary)`);
    if (branch.hasSpineRun) {
      assert.ok(components.has('elbow-fitting'), `${branch.id} must turn through a flanged elbow, not a bare corner`);
    }
    // The joint socket lies inside a branch box, and that box overlaps the SUPPLY system.
    const socketCarrier = own.find((part) => pointInBox(branch.socket, aabbOf(part)));
    assert.ok(socketCarrier, `${branch.id} must start at its own joint socket`);
    assert.ok(
      own.some((part) => supplyBoxes.some((box) => aabbsIntersect(aabbOf(part), box))),
      `${branch.id} never overlaps the supply main it claims to leave`,
    );
    // The run ends 0.25 m inside the owning room's plate x-range (overlap contact, spec 0.20).
    const room = plan.auditoriums.find(({ id }) => id === branch.auditoriumId);
    assert.ok(
      branch.endX > room.bounds.x[0] && branch.endX < room.bounds.x[1],
      `${branch.id} must end inside its room plate edge`,
    );
    for (const part of own) {
      assert.ok(!aabbsIntersect(aabbOf(part), returnMain), `${branch.id} fouls the RETURN main`);
    }
  }

  // No branch piece touches any packaged unit.
  const rtuBoxes = instancesOf(asset, ({ metadata }) => ['rtu-cabinet', 'rtu-curb'].includes(metadata.kind))
    .map((part) => aabbOf(part));
  for (const part of emitted) {
    const box = aabbOf(part);
    assert.ok(rtuBoxes.every((rtu) => !aabbsIntersect(box, rtu)), `${part.metadata.entityId}#${part.metadata.component} fouls an RTU`);
  }
});

test('item 14: fourteen condensate drains — socket-attached, elbowed down, run to the drain lane', () => {
  const { asset } = buildArchitecture();
  const plan = asset.plan;
  const drains = plan.structural.roofService.condensateDrains;
  assert.equal(drains.length, 14);
  assert.deepEqual(
    new Set(drains.map(({ rtuId }) => rtuId)),
    new Set(plan.structural.roofService.packagedUnits.map(({ id }) => id)),
    'one drain per packaged unit, exactly once',
  );

  const emitted = instancesOf(asset, ({ metadata }) => metadata.kind === 'rtu-condensate-drain');
  const units = new Map(plan.structural.roofService.packagedUnits.map((unit) => [unit.id, unit]));
  const plant = plan.structural.roofService.routes.flatMap((route) => [
    aabbOf(route.plenum), aabbOf(route.main), aabbOf(route.sleeve),
  ]);

  for (const drain of drains) {
    const unit = units.get(drain.rtuId);
    const own = emitted.filter(({ metadata }) => metadata.entityId === drain.id);
    const byComponent = new Map(own.map((part) => [part.metadata.component, part]));
    const riser = byComponent.get('outlet-riser');
    const run = byComponent.get('plate-run');
    const trap = byComponent.get('drain-trap');
    assert.ok(riser && run && trap, `${drain.id} must be outlet stub -> elbow -> run -> trap (catalog vocabulary)`);

    // The riser starts AT the unit_condensate_outlet socket.
    assert.ok(pointInBox(drain.socket, aabbOf(riser)), `${drain.id} riser must carry its socket`);
    assert.ok(
      Math.abs((riser.position[1] + riser.size[1] / 2) - drain.socket[1]) < 1e-9,
      `${drain.id} riser top must coincide with the socket height`,
    );
    // The run lies embedded on the plate (attached, item 11 epsilon) and reaches the drain lane.
    assert.ok(run.position[1] - run.size[1] / 2 < unit.plateTop, `${drain.id} run must touch its plate`);
    assert.ok(run.position[1] + run.size[1] / 2 > unit.plateTop, `${drain.id} run must stay visible above the plate`);
    const runBox = aabbOf(run);
    assert.ok(runBox.min[2] <= drain.laneZ + 1e-9, `${drain.id} run must reach the plate drain lane`);
    assert.ok(
      Math.abs(drain.laneZ - (unit.plateBounds.z[0] + 0.3)) < 1e-9,
      `${drain.id} lane must derive from the plate bounds`,
    );
    // The trap drops through the plate: overlap >= the spec template's 0.15.
    const trapBottom = trap.position[1] - trap.size[1] / 2;
    assert.ok(unit.plateTop - trapBottom >= 0.15, `${drain.id} trap must enter the plate by >= 0.15`);

    // The pipe fouls nothing: no OTHER unit, no plant. Its own cabinet holds only the riser.
    for (const part of own) {
      const box = aabbOf(part);
      assert.ok(plant.every((plantBox) => !aabbsIntersect(box, plantBox)), `${drain.id} fouls the rooftop plant`);
      for (const [otherId, other] of units) {
        const cabinet = aabbOf({
          position: [other.position[0], other.cabinetCentreY, other.position[2]],
          size: other.size,
        });
        if (otherId === drain.rtuId) {
          if (part.metadata.component !== 'outlet-riser') {
            assert.ok(!aabbsIntersect(box, cabinet), `${drain.id} ${part.metadata.component} fouls its own cabinet`);
          }
          continue;
        }
        assert.ok(!aabbsIntersect(box, cabinet), `${drain.id} fouls ${otherId}`);
      }
    }
  }
});
