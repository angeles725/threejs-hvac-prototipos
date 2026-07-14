import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { QA_CAMERA_PRESETS } from '../src/controllers/camera.js';
import { createArchitecturePlan } from '../src/scene/architecture.js';
import {
  BOARD_ARROWHEAD,
  BOARD_CAPTION,
  NETWORK_SCHEMATIC_BOARD,
  createNetworkSchematicLayout,
  createNetworkSchematicModel,
  createNetworkSchematicTexture,
  resolveBoardNormal,
  resolveNetworkEvidenceVisibility,
  validateNetworkSchematicLayout,
  validateNetworkSchematicModel,
} from '../src/scene/network-schematic.js';

/** The arrowhead tip of an edge, derived from the one glyph authority the board draws with. */
function derivedArrowTip(edge) {
  const from = edge.points.at(-2);
  const to = edge.points.at(-1);
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return {
    x: to.x - ((to.x - from.x) / length) * BOARD_ARROWHEAD.tipInset,
    y: to.y - ((to.y - from.y) / length) * BOARD_ARROWHEAD.tipInset,
  };
}

/** Replays the recorded canvas path calls and keeps every closed triangle: an arrowhead glyph. */
function recordedTriangles(operations) {
  const triangles = [];
  let path = [];
  for (const [operation, ...args] of operations) {
    if (operation === 'beginPath') path = [];
    else if (operation === 'moveTo' || operation === 'lineTo') path.push({ x: args[0], y: args[1] });
    else if (operation === 'closePath' && path.length === 3) triangles.push(path);
  }
  return triangles;
}

/** Signed separation between two boxes: negative when they overlap. */
function boxGap(left, right) {
  return Math.max(
    Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width)),
    Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height)),
  );
}

function canvasHarness() {
  const operations = [];
  const context = new Proxy({
    operations,
    measureText: (text) => ({ width: String(text).length * 18 }),
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => operations.push([property, ...args]);
    },
    set(target, property, value) {
      target[property] = value;
      operations.push(['set', property, value]);
      return true;
    },
  });
  const canvas = { width: 0, height: 0, getContext: () => context };
  return {
    canvas,
    context,
    documentObject: { createElement: (tag) => tag === 'canvas' ? canvas : null },
  };
}

test('network schematic derives the exact canonical topology without becoming physical truth', () => {
  const model = createNetworkSchematicModel({
    appConfig: APP_CONFIG,
    architecturePlan: createArchitecturePlan(),
  });

  assert.equal(validateNetworkSchematicModel(model), true);
  assert.equal(model.evidenceOnly, true);
  assert.equal(model.topologyImpact, false);
  assert.equal(model.thermostatCount, 14);
  assert.equal(model.buses.length, 4);
  assert.equal(model.gateway.id, 'UG67-01');
  assert.deepEqual(model.buses.map(({ id, text, uc100Id, memberIds }) => ({ id, text, uc100Id, memberIds })), [
    { id: 'A', text: 'BUS A · TC01/02/03/04/14', uc100Id: 'UC100-A', memberIds: ['TC300-01', 'TC300-02', 'TC300-03', 'TC300-04', 'TC300-14'] },
    { id: 'B', text: 'BUS B · TC06–09', uc100Id: 'UC100-B', memberIds: ['TC300-06', 'TC300-07', 'TC300-08', 'TC300-09'] },
    { id: 'C', text: 'BUS C · TC10–13', uc100Id: 'UC100-C', memberIds: ['TC300-10', 'TC300-11', 'TC300-12', 'TC300-13'] },
    { id: 'D', text: 'BUS D · TC05', uc100Id: 'UC100-D', memberIds: ['TC300-05'] },
  ]);
  assert.deepEqual(model.canonicalOrder, [
    'TC300', 'RS-485 / Modbus RTU', 'UC100', 'LoRaWAN RF', 'UG67-01',
    'Ethernet / Internet', 'Niagara Supervisor', 'PC / Tablet / Smartphone',
  ]);
  assert.equal(model.edges.filter(({ medium }) => medium === 'rs485').length, 14);
  assert.equal(model.edges.filter(({ medium }) => medium === 'lorawan').length, 4);
  assert.equal(model.edges.some(({ from, to }) => from.startsWith('TC300-') && to === 'UG67-01'), false);
  assert.deepEqual(model.bridge.origin, APP_CONFIG.devices.gateways[0].position);
  assert.equal(model.bridge.label, 'UG67-01 · UBICACIÓN REAL');
});

test('network schematic rejects membership, media, shortcut and architecture-plan drift', () => {
  const canonical = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  assert.throws(() => validateNetworkSchematicModel({
    ...canonical,
    edges: [...canonical.edges, { from: 'TC300-01', to: 'UG67-01', medium: 'lorawan' }],
  }), /shortcut/i);
  assert.throws(() => validateNetworkSchematicModel({
    ...canonical,
    buses: canonical.buses.map((bus, index) => index ? bus : { ...bus, memberIds: bus.memberIds.slice(1) }),
  }), /14 thermostats|membership/i);
  assert.throws(() => createNetworkSchematicModel({
    appConfig: APP_CONFIG,
    architecturePlan: { ...createArchitecturePlan(), topologyProxies: { ...createArchitecturePlan().topologyProxies, lorawanLinks: [] } },
  }), /architecture plan/i);
});

test('board front face points toward every camera that captures the diagram', () => {
  // PlaneGeometry faces +Z; rotationY rotates that normal into world space.
  const { position } = NETWORK_SCHEMATIC_BOARD;
  const normal = resolveBoardNormal();

  for (const key of ['complete-network', 'network-schematic-detail']) {
    const [camX, camY, camZ] = QA_CAMERA_PRESETS[key].position;
    const toCamera = [camX - position[0], camY - position[1], camZ - position[2]];
    const facing = normal[0] * toCamera[0] + normal[1] * toCamera[1] + normal[2] * toCamera[2];
    assert.ok(facing > 0, `${key} must see the board front face, not its mirrored back (facing=${facing})`);
  }
});

test('detail camera frames the whole board on the portrait viewport the capture harness uses', () => {
  // The UI side panel leaves a portrait canvas (~672x816 => aspect ~0.82). Horizontal FOV is the
  // binding constraint there, so the board must fit with margin at that aspect, not at 16:9.
  // The board no longer faces +X, so the framing distance is measured along its real normal.
  const ASPECT = 0.8;
  const MARGIN = 1.08;
  const { position, worldSize } = NETWORK_SCHEMATIC_BOARD;
  const { position: camera, fov } = QA_CAMERA_PRESETS['network-schematic-detail'];

  const offset = camera.map((value, axis) => value - position[axis]);
  const distance = Math.hypot(...offset);
  const alignment = resolveBoardNormal()
    .reduce((sum, value, axis) => sum + value * offset[axis], 0) / distance;
  const visibleWidth = 2 * distance * Math.tan((fov * Math.PI) / 360) * ASPECT;

  assert.ok(alignment > 0.98, 'the detail camera must look straight down the board normal');
  assert.ok(
    visibleWidth >= worldSize[0] * MARGIN,
    `board (${worldSize[0]} m) must fit in frame with margin; visible width is ${visibleWidth.toFixed(1)} m`,
  );
});

test('board layout keeps four LoRaWAN lanes separated, ordered and inside safe bounds', () => {
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);

  assert.equal(validateNetworkSchematicLayout(layout), true);
  assert.deepEqual(NETWORK_SCHEMATIC_BOARD.canvas, [2048, 840]);
  assert.deepEqual(NETWORK_SCHEMATIC_BOARD.worldSize, [34, 14]);
  assert.equal(NETWORK_SCHEMATIC_BOARD.safeMargin, 34);
  // Derived: the board stands behind the shell and above every roof, so it can occlude nothing.
  const plan = createArchitecturePlan();
  const roofTop = Math.max(...plan.auditoriums.map(({ height }) => height));
  assert.ok(
    NETWORK_SCHEMATIC_BOARD.position[2] < plan.footprint.z[0],
    'the board must stand clear of the building footprint',
  );
  assert.ok(
    NETWORK_SCHEMATIC_BOARD.position[1] - NETWORK_SCHEMATIC_BOARD.worldSize[1] / 2 > 0
      && NETWORK_SCHEMATIC_BOARD.position[1] > roofTop,
    'the board centre must sit above the tallest roof',
  );
  assert.equal(layout.busRows.length, 4);
  assert.deepEqual(layout.busRows.map(({ text }) => text), [
    'BUS A · TC01/02/03/04/14', 'BUS B · TC06–09', 'BUS C · TC10–13', 'BUS D · TC05',
  ]);
  assert.equal(layout.lorawanLanes.length, 4);
  assert.equal(new Set(layout.lorawanLanes.map(({ portY }) => portY)).size, 4);
  assert.ok(layout.lorawanLanes.every((lane, index, lanes) => index === 0 || lane.portY > lanes[index - 1].portY));
  assert.equal(layout.overlaps.length, 0);
  assert.equal(layout.intersections.length, 0);
  assert.deepEqual(layout.legend.map(({ label }) => label), [
    'RS-485 / Modbus RTU', 'LoRaWAN RF', 'Ethernet e Internet', 'Alarma', 'Sin comunicación',
  ]);
});

test('board texture uses one 2048 × 840 sRGB CanvasTexture and renders canonical labels', () => {
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);
  const harness = canvasHarness();
  class CanvasTexture {
    constructor(canvas) { this.image = canvas; }
  }
  const THREE = {
    CanvasTexture,
    SRGBColorSpace: 'srgb',
    LinearMipmapLinearFilter: 'mipmap-linear',
    LinearFilter: 'linear',
  };

  const texture = createNetworkSchematicTexture({ THREE, documentObject: harness.documentObject, model, layout });
  assert.equal(texture.image, harness.canvas);
  assert.deepEqual([harness.canvas.width, harness.canvas.height], [2048, 840]);
  assert.equal(texture.colorSpace, 'srgb');
  assert.equal(texture.minFilter, 'mipmap-linear');
  assert.equal(texture.magFilter, 'linear');
  assert.equal(texture.generateMipmaps, true);
  const renderedText = harness.context.operations.filter(([operation]) => operation === 'fillText').map(([, text]) => text);
  for (const required of [
    'CINEMEX · ARQUITECTURA DEL SISTEMA', 'RS-485 / MODBUS RTU', 'LORAWAN RF',
    'UG67-01', 'ROUTER / FIREWALL', 'INTERNET', 'NIAGARA SUPERVISOR',
    'PC', 'TABLET', 'SMARTPHONE', 'VÍNCULO AL MODELO', 'UG67-01 · UBICACIÓN REAL',
  ]) assert.ok(renderedText.includes(required), `missing rendered text: ${required}`);
});

test('every edge of the canonical chain is drawn with its own arrowhead glyph', () => {
  // Derived, not enumerated: the edge list comes from the layout and the glyph geometry from
  // BOARD_ARROWHEAD, so a new hop on the board cannot ship without stating its direction.
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);
  const harness = canvasHarness();
  const THREE = { CanvasTexture: class { constructor(canvas) { this.image = canvas; } } };

  createNetworkSchematicTexture({ THREE, documentObject: harness.documentObject, model, layout });
  const triangles = recordedTriangles(harness.context.operations);

  assert.equal(
    triangles.length,
    layout.edges.length,
    `the board must draw one arrowhead per edge (${layout.edges.length} edges, ${triangles.length} arrowheads)`,
  );
  for (const edge of layout.edges) {
    const tip = derivedArrowTip(edge);
    const glyph = triangles.find(([apex]) => (
      Math.abs(apex.x - tip.x) < 1e-6 && Math.abs(apex.y - tip.y) < 1e-6
    ));
    assert.ok(glyph, `${edge.id} (${edge.medium}) carries no arrowhead pointing at ${edge.to}`);
  }
});

test('every board edge leaves a visible stem, so its arrowhead reads as an arrow and not as a blob', () => {
  // The LoRaWAN lanes and the Niagara fan-out drew their arrowheads flush against the target: the
  // glyph merged with the RF port dot and with the fan-out bend. An arrow needs a shaft to read as
  // one, so the terminal segment must clear the glyph by at least the glyph's own base width.
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);
  const glyphSpan = BOARD_ARROWHEAD.tipInset + BOARD_ARROWHEAD.length;
  const minimumStem = BOARD_ARROWHEAD.halfWidth * 2;

  for (const edge of layout.edges) {
    const [from, to] = [edge.points.at(-2), edge.points.at(-1)];
    const stem = Math.hypot(to.x - from.x, to.y - from.y) - glyphSpan;
    assert.ok(
      stem >= minimumStem,
      `${edge.id} leaves only ${stem.toFixed(1)} px of stem before its arrowhead (needs ${minimumStem})`,
    );
  }
});

test('layout validation rejects a stemless arrowhead and a crowded node caption', () => {
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);

  // Pull a target node back onto its own arrowhead: the edge keeps its direction flag but loses the
  // stem that makes the glyph readable, and the board must refuse to ship it.
  const stemless = layout.edges.map((edge) => {
    if (edge.medium !== 'lorawan') return edge;
    const to = edge.points.at(-1);
    const from = edge.points.at(-2);
    return { ...edge, points: [...edge.points.slice(0, -1), { x: from.x + BOARD_ARROWHEAD.length, y: to.y }] };
  });
  assert.throws(() => validateNetworkSchematicLayout({ ...layout, edges: stemless }), /stem/i);

  const crowded = {
    ...layout,
    ug67Subtitle: {
      ...layout.ug67Subtitle,
      box: { ...layout.ug67Subtitle.box, y: layout.ug67PortCaptions[1].box.y - layout.ug67Subtitle.box.height },
    },
  };
  assert.throws(() => validateNetworkSchematicLayout(crowded), /crowds/i);
});

test('the UG67 node captions keep clearance from every RF port caption', () => {
  // Not "GATEWAY sits at y=N": the node captions and the RF port captions are measured boxes, and
  // no pair may crowd another by less than the breathing room a caption already reserves for itself.
  const model = createNetworkSchematicModel({ appConfig: APP_CONFIG, architecturePlan: createArchitecturePlan() });
  const layout = createNetworkSchematicLayout(model);
  const minimumClearance = BOARD_CAPTION.padding / 2;

  for (const nodeCaption of [layout.ug67Title, layout.ug67Subtitle]) {
    for (const portCaption of layout.ug67PortCaptions) {
      const gap = boxGap(nodeCaption.box, portCaption.box);
      assert.ok(
        gap >= minimumClearance,
        `${nodeCaption.text} crowds the ${portCaption.label} caption (${gap.toFixed(1)} px, needs ${minimumClearance})`,
      );
    }
  }
});

test('camera evidence policy shows one truth and restores physical detail outside the schematic view', () => {
  // complete-network must expose the physical chain: the board summarizes it, it never replaces it.
  assert.deepEqual(resolveNetworkEvidenceVisibility('complete-network'), {
    schematic: true, densePhysicalNetwork: true, technicalLabels: true, ug67RfDetail: false,
  });
  const cameras = ['complete-network', 'network-schematic-detail', 'ug67', 'rs485-master', 'facade'];
  for (const camera of cameras) {
    const visibility = resolveNetworkEvidenceVisibility(camera);
    assert.equal(
      visibility.densePhysicalNetwork || visibility.schematic,
      true,
      `${camera} must show the chain either physically or on the board`,
    );
    assert.equal(
      visibility.technicalLabels,
      visibility.densePhysicalNetwork,
      `${camera} must caption exactly the physical media it renders`,
    );
  }
  assert.deepEqual(resolveNetworkEvidenceVisibility('network-schematic-detail'), {
    schematic: true, densePhysicalNetwork: false, technicalLabels: false, ug67RfDetail: false,
  });
  assert.deepEqual(resolveNetworkEvidenceVisibility('ug67'), {
    schematic: false, densePhysicalNetwork: true, technicalLabels: true, ug67RfDetail: true,
  });
  assert.deepEqual(resolveNetworkEvidenceVisibility('rs485-master'), {
    schematic: false, densePhysicalNetwork: true, technicalLabels: true, ug67RfDetail: false,
  });
  assert.deepEqual(resolveNetworkEvidenceVisibility('facade'), {
    schematic: false, densePhysicalNetwork: true, technicalLabels: true, ug67RfDetail: false,
  });
});
