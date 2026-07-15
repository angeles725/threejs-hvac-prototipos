import { APP_CONFIG } from '../config.mjs';

/**
 * The board stands behind the building, raised above every roof, and turns its front face toward
 * the complete-network camera. Planted between the shell and the external schematic it used to cut
 * straight through the UG67 -> ROUTER/FIREWALL Ethernet run and hide the east third of the shell;
 * from here it can occlude nothing, because nothing sits behind it along any evidence sightline.
 */
export const NETWORK_SCHEMATIC_BOARD = Object.freeze({
  canvas: Object.freeze([2048, 840]),
  worldSize: Object.freeze([34, 14]),
  position: Object.freeze([-4, 10.5, -40]),
  rotationY: 0.7387,
  safeMargin: 34,
});

/** PlaneGeometry faces +Z; rotationY turns that normal into world space. */
export function resolveBoardNormal(board = NETWORK_SCHEMATIC_BOARD) {
  return [Math.sin(board.rotationY), 0, Math.cos(board.rotationY)];
}

/** The board's local +X axis in world space: canvas +u runs along its negative direction. */
export function resolveBoardWidthAxis(board = NETWORK_SCHEMATIC_BOARD) {
  return [Math.cos(board.rotationY), 0, -Math.sin(board.rotationY)];
}

/** The four world corners of the panel, in convex order, for occlusion evidence. */
export function resolveBoardWorldCorners(board = NETWORK_SCHEMATIC_BOARD) {
  const axis = resolveBoardWidthAxis(board);
  const halfWidth = board.worldSize[0] / 2;
  const halfHeight = board.worldSize[1] / 2;
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => [
    board.position[0] + axis[0] * halfWidth * u,
    board.position[1] + halfHeight * v,
    board.position[2] + axis[2] * halfWidth * u,
  ]);
}

/** Every edge glyph is drawn from this one definition, so no edge can be shorter than its arrowhead. */
export const BOARD_ARROWHEAD = Object.freeze({
  length: 21,
  halfWidth: 9,
  tipInset: 4,
});

/** Captions are measured against this budget instead of being assumed to fit. */
export const BOARD_CAPTION = Object.freeze({
  minSize: 14,
  maxSize: 22,
  padding: 16,
  glyphRatio: 0.66,
});

const NODE_CAPTIONS = Object.freeze({
  router: 'ROUTER / FIREWALL',
  internet: 'INTERNET',
  niagara: 'NIAGARA SUPERVISOR',
  pc: 'PC',
  tablet: 'TABLET',
  smartphone: 'SMARTPHONE',
});

/** Conservative upper bound of an uppercase bold sans advance width. */
export function estimateCaptionWidth(value, fontSize) {
  return String(value).length * fontSize * BOARD_CAPTION.glyphRatio;
}

export function fitCaptionFontSize(value, boxWidth, { maxSize = BOARD_CAPTION.maxSize } = {}) {
  const inner = boxWidth - BOARD_CAPTION.padding * 2;
  for (let size = Math.round(maxSize); size > BOARD_CAPTION.minSize; size -= 1) {
    if (estimateCaptionWidth(value, size) <= inner) return size;
  }
  return BOARD_CAPTION.minSize;
}

const BUS_TEXT = Object.freeze({
  A: 'BUS A · TC01/02/03/04/14',
  B: 'BUS B · TC06–09',
  C: 'BUS C · TC10–13',
  D: 'BUS D · TC05',
});

const CANONICAL_ORDER = Object.freeze([
  'TC300', 'RS-485 / Modbus RTU', 'UC100', 'LoRaWAN RF', 'UG67-01',
  'Ethernet / Internet', 'Niagara Supervisor', 'PC / Tablet / Smartphone',
]);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid network schematic: ${message}`);
}

function unique(values) {
  return new Set(values).size === values.length;
}

/**
 * Derives an evidence model from the canonical application topology and the accepted
 * physical architecture plan. It intentionally stores no independent device placement.
 */
export function createNetworkSchematicModel({
  appConfig = APP_CONFIG,
  architecturePlan,
} = {}) {
  assert(appConfig?.devices?.tc300 && appConfig?.devices?.uc100, 'APP_CONFIG device inventory is required.');
  assert(architecturePlan?.structural?.containment?.rs485Routes, 'architecture plan RS-485 routes are required.');
  assert(architecturePlan?.topologyProxies?.lorawanLinks, 'architecture plan LoRaWAN links are required.');

  const routeOwners = architecturePlan.structural.containment.rs485Routes.map(({ terminalOwner }) => terminalOwner);
  const physicalLorawan = architecturePlan.topologyProxies.lorawanLinks;
  const uc100 = appConfig.devices.uc100;
  assert(routeOwners.length === uc100.length && uc100.every(({ id }) => routeOwners.includes(id)), 'architecture plan RS-485 ownership drift.');
  assert(physicalLorawan.length === uc100.length && uc100.every(({ id }) => (
    physicalLorawan.some(({ from, to, physical }) => from === id && to === 'UG67-01' && physical === false)
  )), 'architecture plan LoRaWAN ownership drift.');

  const buses = uc100.map((device) => {
    const id = device.id.at(-1);
    return {
      id,
      text: BUS_TEXT[id],
      uc100Id: device.id,
      memberIds: [...device.memberIds],
      routeId: architecturePlan.structural.containment.rs485Routes
        .find(({ terminalOwner }) => terminalOwner === device.id)?.id,
      lorawanLinkId: physicalLorawan.find(({ from }) => from === device.id)?.id,
    };
  });

  const gateway = appConfig.devices.gateways[0];
  const model = {
    id: 'architecture_system_diagram_board',
    evidenceOnly: true,
    topologyImpact: false,
    derivedFrom: ['APP_CONFIG', 'createArchitecturePlan'],
    thermostatCount: appConfig.devices.tc300.length,
    buses,
    gateway: { id: gateway.id },
    edges: appConfig.network.edges.map((edge) => ({ ...edge })),
    ethernetChain: ['UG67-01', 'router-firewall', 'internet', 'niagara-supervisor'],
    clients: ['client-pc', 'client-tablet', 'client-smartphone'],
    canonicalOrder: [...CANONICAL_ORDER],
    bridge: {
      origin: [...gateway.position],
      label: 'UG67-01 · UBICACIÓN REAL',
      badge: 'VÍNCULO AL MODELO',
    },
  };
  validateNetworkSchematicModel(model);
  return freeze(model);
}

export function validateNetworkSchematicModel(model) {
  assert(model?.evidenceOnly === true && model?.topologyImpact === false, 'the board must remain evidence-only.');
  assert(model.thermostatCount === 14, 'exactly 14 thermostats are required.');
  assert(model.buses?.length === 4, 'exactly four buses are required.');
  assert(model.gateway?.id === 'UG67-01', 'UG67-01 is the only gateway.');
  assert(model.buses.map(({ id }) => id).join('') === 'ABCD', 'bus order must be A, B, C, D.');
  assert(model.buses.every(({ id, text }) => BUS_TEXT[id] === text), 'bus text drift.');
  const members = model.buses.flatMap(({ memberIds }) => memberIds);
  assert(members.length === 14 && unique(members), 'membership must cover all 14 thermostats exactly once.');
  assert(model.buses.every(({ uc100Id, routeId, lorawanLinkId }) => (
    routeId === `${uc100Id}-contained-route` && lorawanLinkId === `lorawan-${uc100Id}-UG67-01`
  )), 'architecture-plan route identity drift.');
  assert(!model.edges.some(({ from, to }) => from.startsWith('TC300-') && to === 'UG67-01'), 'TC300-to-UG67 shortcut is forbidden.');
  assert(model.edges.filter(({ medium }) => medium === 'rs485').length === 14, '14 RS-485 edges are required.');
  assert(model.edges.filter(({ medium }) => medium === 'lorawan').length === 4, 'four LoRaWAN edges are required.');
  assert(JSON.stringify(model.canonicalOrder) === JSON.stringify(CANONICAL_ORDER), 'canonical order drift.');
  assert(model.bridge?.origin?.length === 3 && model.bridge.origin.every(Number.isFinite), 'bridge origin is invalid.');
  return true;
}

/**
 * Maps a board canvas point to world space for any board orientation: canvas +u runs along the
 * panel's local +X axis and canvas +v runs down, while `offset` lifts the point off the front face.
 */
export function canvasPointToBoardWorld([u, v], offset = 0.06, board = NETWORK_SCHEMATIC_BOARD) {
  const [canvasWidth, canvasHeight] = board.canvas;
  const [worldWidth, worldHeight] = board.worldSize;
  const axis = resolveBoardWidthAxis(board);
  const normal = resolveBoardNormal(board);
  const localX = (u / canvasWidth - 0.5) * worldWidth;
  const localY = (0.5 - v / canvasHeight) * worldHeight;
  return [
    board.position[0] + axis[0] * localX + normal[0] * offset,
    board.position[1] + localY,
    board.position[2] + axis[2] * localX + normal[2] * offset,
  ];
}

function rect(x, y, width, height, id) {
  return freeze({ x, y, width, height, id });
}

function overlaps(left, right) {
  return left.x < right.x + right.width && left.x + left.width > right.x
    && left.y < right.y + right.height && left.y + left.height > right.y;
}

/** Separation between two boxes along their nearest axis; negative while they overlap. */
function boxGap(left, right) {
  return Math.max(
    Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width)),
    Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height)),
  );
}

function orientation(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function segmentsIntersect(a, b, c, d) {
  return orientation(a, b, c) !== orientation(a, b, d)
    && orientation(c, d, a) !== orientation(c, d, b);
}

function laneIntersections(lanes) {
  const intersections = [];
  for (let left = 0; left < lanes.length; left += 1) {
    for (let right = left + 1; right < lanes.length; right += 1) {
      const a = lanes[left].points;
      const b = lanes[right].points;
      for (let ai = 0; ai < a.length - 1; ai += 1) {
        for (let bi = 0; bi < b.length - 1; bi += 1) {
          if (segmentsIntersect(a[ai], a[ai + 1], b[bi], b[bi + 1])) {
            intersections.push([lanes[left].id, lanes[right].id]);
          }
        }
      }
    }
  }
  return intersections;
}

export function createNetworkSchematicLayout(model) {
  validateNetworkSchematicModel(model);
  const rowY = [190, 290, 390, 490];
  const portY = [195, 290, 385, 480];
  const busRows = model.buses.map((bus, index) => ({
    ...bus,
    y: rowY[index],
    thermostatBox: rect(42, rowY[index] - 34, 360, 68, `tc-${bus.id}`),
    rs485Start: { x: 418, y: rowY[index] },
    rs485End: { x: 750, y: rowY[index] },
    uc100Box: rect(766, rowY[index] - 34, 190, 68, `uc-${bus.id}`),
  }));
  // The elbow lands well short of the gateway so the straight run into the RF port is long enough
  // to show a dashed stem AND the arrowhead: flush against the port the glyph merged with its dot.
  const lorawanLanes = model.buses.map((bus, index) => ({
    id: `lorawan-${bus.id}`,
    uc100Id: bus.uc100Id,
    portY: portY[index],
    points: [
      { x: 970, y: rowY[index] },
      { x: 1014, y: rowY[index] },
      { x: 1060, y: portY[index] },
      { x: 1128, y: portY[index] },
    ],
  }));
  const ug67Box = rect(1128, 151, 176, 365, 'ug67');
  const routerBox = rect(1345, 581, 200, 78, 'router');
  const internetBox = rect(1590, 581, 150, 78, 'internet');
  const niagaraBox = rect(1790, 571, 210, 98, 'niagara');
  // The client row sits low enough that each drop off the fan-out bus carries a visible stem before
  // its arrowhead; at the previous height the glyph started at the bend and read as a corner blob.
  const clientBoxes = [
    rect(1560, 752, 140, 48, 'pc'),
    rect(1715, 752, 140, 48, 'tablet'),
    rect(1870, 752, 140, 48, 'smartphone'),
  ];
  // The model-link pill leaves the node body: it sits under the gateway so no RF port is occluded.
  const bridgeBadge = rect(1128, 560, 176, 40, 'bridge-badge');
  const boxes = [
    ...busRows.flatMap(({ thermostatBox, uc100Box }) => [thermostatBox, uc100Box]),
    ug67Box,
    bridgeBadge,
    routerBox,
    internetBox,
    niagaraBox,
    ...clientBoxes,
  ];
  const overlapPairs = [];
  for (let left = 0; left < boxes.length; left += 1) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      if (overlaps(boxes[left], boxes[right])) overlapPairs.push([boxes[left].id, boxes[right].id]);
    }
  }
  const ug67Ports = lorawanLanes.map((lane, index) => ({
    id: `ug67-port-${index + 1}`,
    label: `RF${index + 1}`,
    uc100Id: lane.uc100Id,
    x: ug67Box.x + 16,
    y: lane.portY,
  }));
  // Node captions are layout, not loose paint calls: their boxes are checked against the RF ports.
  const captionBox = (value, x, y, size, align = 'center') => {
    const width = estimateCaptionWidth(value, size);
    return rect(align === 'center' ? x - width / 2 : x, y - size / 2, width, size, `${value}-caption`);
  };
  // Both captions live in the clear band between the RF1 and RF2 port captions, and the block is
  // centred in it: hard against RF1 the title read as one crowded mass with the port label.
  const ug67Title = { text: 'UG67-01', x: 1216, y: 231, size: 32 };
  const ug67Subtitle = { text: 'GATEWAY', x: 1216, y: 262, size: 17 };
  ug67Title.box = captionBox(ug67Title.text, ug67Title.x, ug67Title.y, ug67Title.size);
  ug67Subtitle.box = captionBox(ug67Subtitle.text, ug67Subtitle.x, ug67Subtitle.y, ug67Subtitle.size);
  const ug67PortCaptions = ug67Ports.map((port) => ({
    label: port.label,
    portId: port.id,
    x: port.x + 22,
    y: port.y,
    size: 16,
    box: captionBox(port.label, port.x + 22, port.y, 16, 'left'),
  }));
  const niagaraExit = { x: niagaraBox.x + niagaraBox.width / 2, y: niagaraBox.y + niagaraBox.height };
  const ethernetTrunkY = routerBox.y + routerBox.height / 2;
  const edges = [
    ...busRows.map((row) => ({
      id: `rs485-${row.id}`,
      medium: 'rs485',
      from: `tc-${row.id}`,
      to: `uc-${row.id}`,
      dashed: false,
      arrowhead: true,
      points: [row.rs485Start, row.rs485End],
    })),
    ...lorawanLanes.map((lane, index) => ({
      id: lane.id,
      medium: 'lorawan',
      from: `uc-${lane.id.at(-1)}`,
      to: 'ug67',
      portId: ug67Ports[index].label,
      dashed: true,
      arrowhead: true,
      points: lane.points.map((point) => ({ ...point })),
    })),
    {
      id: 'ethernet-ug67-router',
      medium: 'ethernet',
      from: 'ug67',
      to: 'router',
      dashed: false,
      arrowhead: true,
      points: [
        { x: ug67Box.x + ug67Box.width, y: 470 },
        { x: routerBox.x + routerBox.width / 2, y: 470 },
        { x: routerBox.x + routerBox.width / 2, y: routerBox.y },
      ],
    },
    {
      id: 'ethernet-router-internet',
      medium: 'ethernet',
      from: 'router',
      to: 'internet',
      dashed: false,
      arrowhead: true,
      points: [
        { x: routerBox.x + routerBox.width, y: ethernetTrunkY },
        { x: internetBox.x, y: ethernetTrunkY },
      ],
    },
    {
      id: 'ethernet-internet-niagara',
      medium: 'ethernet',
      from: 'internet',
      to: 'niagara',
      dashed: false,
      arrowhead: true,
      points: [
        { x: internetBox.x + internetBox.width, y: ethernetTrunkY },
        { x: niagaraBox.x, y: ethernetTrunkY },
      ],
    },
    ...clientBoxes.map((box) => ({
      id: `ethernet-niagara-${box.id}`,
      medium: 'ethernet',
      from: 'niagara',
      to: box.id,
      dashed: false,
      arrowhead: true,
      points: [
        { ...niagaraExit },
        { x: niagaraExit.x, y: niagaraExit.y + 31 },
        { x: box.x + box.width / 2, y: niagaraExit.y + 31 },
        { x: box.x + box.width / 2, y: box.y },
      ],
    })),
  ];
  const layout = {
    canvas: [...NETWORK_SCHEMATIC_BOARD.canvas],
    busRows,
    lorawanLanes,
    ug67Box,
    ug67Ports,
    ug67Title,
    ug67Subtitle,
    ug67PortCaptions,
    bridgeBadge,
    edges,
    captions: { ...NODE_CAPTIONS },
    boxes,
    overlaps: overlapPairs,
    intersections: laneIntersections(lorawanLanes),
    legend: [
      { label: 'RS-485 / Modbus RTU', color: '#22c55e', dashed: false },
      { label: 'LoRaWAN RF', color: '#38bdf8', dashed: true },
      { label: 'Ethernet e Internet', color: '#2563eb', dashed: false },
      { label: 'Alarma', color: '#ef4444', dashed: false },
      { label: 'Sin comunicación', color: '#94a3b8', dashed: false },
    ],
  };
  validateNetworkSchematicLayout(layout);
  return freeze(layout);
}

export function validateNetworkSchematicLayout(layout) {
  const [width, height] = NETWORK_SCHEMATIC_BOARD.canvas;
  const margin = NETWORK_SCHEMATIC_BOARD.safeMargin;
  assert(layout?.busRows?.length === 4 && layout?.lorawanLanes?.length === 4, 'four rows and LoRaWAN lanes are required.');
  assert(layout.overlaps?.length === 0, 'layout boxes overlap.');
  assert(layout.intersections?.length === 0, 'LoRaWAN lanes intersect.');
  assert(unique(layout.lorawanLanes.map(({ portY }) => portY)), 'LoRaWAN lanes require four distinct UG67 ports.');
  assert(layout.lorawanLanes.every((lane, index, lanes) => index === 0 || lane.portY > lanes[index - 1].portY), 'LoRaWAN ports must preserve bus order.');
  for (const box of layout.boxes) {
    assert(box.x >= margin && box.y >= 112 && box.x + box.width <= width - margin && box.y + box.height <= height - margin, `${box.id} exceeds safe bounds.`);
  }

  assert(layout.ug67Ports?.length === 4, 'four LoRaWAN links require four labelled RF ports.');
  assert(unique(layout.ug67Ports.map(({ label }) => label)), 'RF port labels must be unique.');
  assert(layout.ug67Ports.every(({ y }) => (
    y < layout.bridgeBadge.y || y > layout.bridgeBadge.y + layout.bridgeBadge.height
  )), 'the model-link pill must not occlude an RF port.');

  assert(layout.ug67PortCaptions?.length === 4 && layout.ug67Title?.box && layout.ug67Subtitle?.box, 'the UG67 node captions must be measured boxes.');
  for (const nodeCaption of [layout.ug67Title, layout.ug67Subtitle]) {
    assert(
      nodeCaption.box.y >= layout.ug67Box.y
        && nodeCaption.box.y + nodeCaption.box.height <= layout.ug67Box.y + layout.ug67Box.height,
      `${nodeCaption.text} must stay inside the UG67 node body.`,
    );
    for (const portCaption of layout.ug67PortCaptions) {
      // Not merely disjoint: a caption already reserves `padding` inside its own box, so two
      // independent captions must keep at least half of that between them or they read as one mass.
      assert(
        boxGap(nodeCaption.box, portCaption.box) >= BOARD_CAPTION.padding / 2,
        `${nodeCaption.text} crowds the ${portCaption.label} caption.`,
      );
    }
  }
  assert(!overlaps(layout.ug67Title.box, layout.ug67Subtitle.box), 'the UG67 title and subtitle overlap.');

  assert(layout.edges?.length >= 14, 'every canonical hop must be an explicit edge.');
  assert(unique(layout.edges.map(({ id }) => id)), 'edge identity drift.');
  // An arrowhead only reads as an arrow when a stem carries it: flush against the target node the
  // glyph merges with whatever it lands on (an RF port dot, a fan-out bend). The terminal segment
  // must therefore clear the whole glyph plus at least the glyph's own base width of bare line.
  const arrowheadGlyphSpan = BOARD_ARROWHEAD.tipInset + BOARD_ARROWHEAD.length;
  const minimumStem = BOARD_ARROWHEAD.halfWidth * 2;
  for (const edge of layout.edges) {
    assert(edge.arrowhead === true, `${edge.id} must state its direction.`);
    assert(edge.points.length >= 2, `${edge.id} needs a drawable polyline.`);
    const [from, to] = [edge.points.at(-2), edge.points.at(-1)];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    assert(
      length - arrowheadGlyphSpan >= minimumStem,
      `${edge.id} leaves no stem before its own arrowhead.`,
    );
  }
  assert(
    layout.edges.filter(({ medium }) => medium === 'ethernet')
      .some(({ from, to }) => from === 'internet' && to === 'niagara'),
    'the Internet to Niagara hop must be a drawn edge.',
  );

  for (const [boxId, caption] of Object.entries(layout.captions ?? {})) {
    const box = layout.boxes.find(({ id }) => id === boxId);
    assert(box, `caption ${caption} has no box.`);
    assert(
      estimateCaptionWidth(caption, BOARD_CAPTION.minSize) <= box.width - BOARD_CAPTION.padding * 2,
      `caption ${caption} cannot fit inside ${boxId}.`,
    );
  }
  return true;
}

function roundedBox(context, box, fill, stroke, radius = 18) {
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, radius);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 3;
  context.stroke();
}

function line(context, points, color, width, dashed = false) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.setLineDash(dashed ? [16, 12] : []);
  context.stroke();
  context.setLineDash([]);
}

/** Draws the arrowhead of one edge on its own terminal segment, pointing at the target node. */
function arrow(context, edge, color) {
  const from = edge.points.at(-2);
  const to = edge.points.at(-1);
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const unit = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const tip = {
    x: to.x - unit.x * BOARD_ARROWHEAD.tipInset,
    y: to.y - unit.y * BOARD_ARROWHEAD.tipInset,
  };
  const base = {
    x: tip.x - unit.x * BOARD_ARROWHEAD.length,
    y: tip.y - unit.y * BOARD_ARROWHEAD.length,
  };
  const normal = { x: -unit.y, y: unit.x };
  context.beginPath();
  context.moveTo(tip.x, tip.y);
  context.lineTo(base.x + normal.x * BOARD_ARROWHEAD.halfWidth, base.y + normal.y * BOARD_ARROWHEAD.halfWidth);
  context.lineTo(base.x - normal.x * BOARD_ARROWHEAD.halfWidth, base.y - normal.y * BOARD_ARROWHEAD.halfWidth);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function text(context, value, x, y, size = 26, color = '#f8fafc', align = 'center', weight = 700) {
  context.fillStyle = color;
  context.font = `${weight} ${size}px system-ui, sans-serif`;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(value, x, y);
}

/** Measures the caption and shrinks it until it is inside its own box. */
function caption(context, value, box, color = '#ffffff', weight = 850) {
  let size = fitCaptionFontSize(value, box.width);
  const inner = box.width - BOARD_CAPTION.padding * 2;
  context.font = `${weight} ${size}px system-ui, sans-serif`;
  while (size > BOARD_CAPTION.minSize && context.measureText(value).width > inner) {
    size -= 1;
    context.font = `${weight} ${size}px system-ui, sans-serif`;
  }
  text(context, value, box.x + box.width / 2, box.y + box.height / 2, size, color, 'center', weight);
  return size;
}

const MEDIA_COLORS = Object.freeze({
  rs485: '#22c55e',
  lorawan: '#38bdf8',
  ethernet: '#2563eb',
});

export function createNetworkSchematicTexture({ THREE, documentObject, model, layout } = {}) {
  assert(THREE?.CanvasTexture && documentObject?.createElement, 'CanvasTexture and document are required.');
  validateNetworkSchematicModel(model);
  validateNetworkSchematicLayout(layout);
  const canvas = documentObject.createElement('canvas');
  [canvas.width, canvas.height] = NETWORK_SCHEMATIC_BOARD.canvas;
  const context = canvas.getContext('2d');

  context.fillStyle = '#07111f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111827';
  context.fillRect(0, 0, canvas.width, 112);
  context.fillStyle = '#c8102e';
  context.fillRect(0, 0, 18, canvas.height);
  text(context, 'CINEMEX · ARQUITECTURA DEL SISTEMA', 42, 48, 34, '#ffffff', 'left', 900);
  text(context, 'TC300 → RS-485 → UC100 → LoRaWAN → UG67 → Ethernet / Internet → Niagara', 42, 84, 21, '#94a3b8', 'left', 650);

  for (const row of layout.busRows) {
    roundedBox(context, row.thermostatBox, '#172033', '#475569');
    text(context, row.text, row.thermostatBox.x + 18, row.y - 10, 25, '#ffffff', 'left', 800);
    text(context, `${row.memberIds.length} TERMOSTATO${row.memberIds.length === 1 ? '' : 'S'} TC300`, row.thermostatBox.x + 18, row.y + 19, 17, '#94a3b8', 'left', 650);
    text(context, 'RS-485 / MODBUS RTU', 584, row.y - 18, 18, '#86efac');
    roundedBox(context, row.uc100Box, '#f8fafc', '#22c55e');
    text(context, row.uc100Id, row.uc100Box.x + row.uc100Box.width / 2, row.y - 7, 27, '#0f172a', 'center', 900);
    text(context, 'MILESIGHT', row.uc100Box.x + row.uc100Box.width / 2, row.y + 20, 15, '#475569');
  }

  // Media first, node bodies second, arrowheads last: no node can bury the direction of its own edge.
  for (const edge of layout.edges) {
    line(context, edge.points, MEDIA_COLORS[edge.medium], edge.medium === 'lorawan' ? 5 : 7, edge.dashed);
  }
  text(context, 'LORAWAN RF', 1034, 132, 20, '#7dd3fc');
  text(context, 'ETHERNET E INTERNET', 1665, 545, 19, '#93c5fd');

  roundedBox(context, layout.ug67Box, '#111827', '#38bdf8', 24);
  const { ug67Title, ug67Subtitle } = layout;
  text(context, ug67Title.text, ug67Title.x, ug67Title.y, ug67Title.size, '#ffffff', 'center', 900);
  text(context, ug67Subtitle.text, ug67Subtitle.x, ug67Subtitle.y, ug67Subtitle.size, '#7dd3fc');
  for (const port of layout.ug67Ports) {
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.arc(port.x, port.y, 7, 0, Math.PI * 2);
    context.fill();
  }
  for (const portCaption of layout.ug67PortCaptions) {
    text(context, portCaption.label, portCaption.x, portCaption.y, portCaption.size, '#bae6fd', 'left', 750);
  }
  text(context, 'UG67-01 · UBICACIÓN REAL', 1216, 540, 16, '#67e8f9');
  roundedBox(context, layout.bridgeBadge, '#083344', '#22d3ee', 12);
  text(context, 'VÍNCULO AL MODELO', 1216, layout.bridgeBadge.y + layout.bridgeBadge.height / 2, 15, '#a5f3fc', 'center', 850);

  for (const [id, label] of Object.entries(layout.captions)) {
    const box = layout.boxes.find((candidate) => candidate.id === id);
    const client = ['pc', 'tablet', 'smartphone'].includes(id);
    roundedBox(context, box, id === 'niagara' ? '#172554' : '#111827', '#2563eb', client ? 12 : 18);
    caption(context, label, box, client ? '#dbeafe' : '#ffffff');
  }

  for (const edge of layout.edges) arrow(context, edge, MEDIA_COLORS[edge.medium]);

  layout.legend.forEach((item, index) => {
    const column = index < 3 ? 0 : 1;
    const row = index < 3 ? index : index - 3;
    const x = 1350 + column * 345;
    const y = 155 + row * 42;
    line(context, [{ x, y }, { x: x + 52, y }], item.color, 5, item.dashed);
    text(context, item.label, x + 68, y, 16, '#cbd5e1', 'left', 650);
  });

  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.name = 'architecture-system-diagram-board-texture';
  return texture;
}

function dashedWorldLine({ THREE, points, material, dashCount = 8 }) {
  const root = new THREE.Group();
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const start = points[segment];
    const end = points[segment + 1];
    for (let dash = 0; dash < dashCount; dash += 1) {
      const t0 = dash / dashCount;
      const t1 = Math.min(1, t0 + 0.52 / dashCount);
      const lerp = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...lerp(start, end, t0)),
        new THREE.Vector3(...lerp(start, end, t1)),
      ]);
      root.add(new THREE.Line(geometry, material));
    }
  }
  return root;
}

export function createNetworkSchematicComposition({
  THREE,
  groups,
  documentObject = globalThis.document,
  appConfig = APP_CONFIG,
  architecturePlan,
} = {}) {
  assert(THREE?.Group && THREE?.PlaneGeometry && groups?.architecture, 'Three.js and architecture group are required.');
  const model = createNetworkSchematicModel({ appConfig, architecturePlan });
  const layout = createNetworkSchematicLayout(model);
  const texture = createNetworkSchematicTexture({ THREE, documentObject, model, layout });
  const root = new THREE.Group();
  root.name = 'architecture-system-diagram-board';
  root.visible = false;
  root.userData = {
    entityId: model.id,
    pass: 'surface',
    kind: 'derived-network-schematic',
    evidenceOnly: true,
    topologyImpact: false,
    derivedFrom: [...model.derivedFrom],
  };

  const panelGeometry = new THREE.PlaneGeometry(...NETWORK_SCHEMATIC_BOARD.worldSize);
  const panelMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.name = 'architecture-system-diagram-board-panel';
  panel.position.set(...NETWORK_SCHEMATIC_BOARD.position);
  panel.rotation.y = NETWORK_SCHEMATIC_BOARD.rotationY;
  panel.renderOrder = 1160;
  root.add(panel);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.7 });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.42, metalness: 0.25 });
  const frameGeometry = new THREE.BoxGeometry(1, 1, 1);
  const [boardWidth, boardHeight] = NETWORK_SCHEMATIC_BOARD.worldSize;
  const [boardX, boardY, boardZ] = NETWORK_SCHEMATIC_BOARD.position;
  const widthAxis = resolveBoardWidthAxis();
  const frameThickness = 0.34;
  // Frame members follow the panel's own axes, so the board can be turned to face its camera.
  for (const [name, alongWidth, verticalOffset, length, height, material] of [
    ['top', 0, boardHeight / 2 + 0.18, boardWidth + 0.65, frameThickness, redMaterial],
    ['bottom', 0, -(boardHeight / 2 + 0.18), boardWidth + 0.65, frameThickness, frameMaterial],
    ['left', -(boardWidth / 2 + 0.18), 0, frameThickness, boardHeight + 1, frameMaterial],
    ['right', boardWidth / 2 + 0.18, 0, frameThickness, boardHeight + 1, frameMaterial],
  ]) {
    const frame = new THREE.Mesh(frameGeometry, material);
    frame.name = `architecture-system-diagram-frame-${name}`;
    frame.position.set(
      boardX + widthAxis[0] * alongWidth,
      boardY + verticalOffset,
      boardZ + widthAxis[2] * alongWidth,
    );
    frame.rotation.y = NETWORK_SCHEMATIC_BOARD.rotationY;
    frame.scale.set(length, height, 0.22);
    root.add(frame);
  }
  // Two masts carry the raised board instead of letting it float over the rear ground.
  for (const [name, alongWidth] of [['west', -(boardWidth / 2 - 3)], ['east', boardWidth / 2 - 3]]) {
    const mastHeight = boardY - boardHeight / 2;
    const mast = new THREE.Mesh(frameGeometry, frameMaterial);
    mast.name = `architecture-system-diagram-mast-${name}`;
    mast.position.set(
      boardX + widthAxis[0] * alongWidth,
      mastHeight / 2,
      boardZ + widthAxis[2] * alongWidth,
    );
    mast.scale.set(0.45, mastHeight, 0.45);
    root.add(mast);
  }

  const cyanMaterial = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.94 });
  // The leader lands on the relocated model-link pill, derived from the same layout that draws it.
  const bridgeSocket = canvasPointToBoardWorld([
    layout.bridgeBadge.x + layout.bridgeBadge.width / 2,
    layout.bridgeBadge.y + layout.bridgeBadge.height / 2,
  ]);
  // The leader arcs over the shell, matching the sightline the board itself now respects.
  const leaderApex = model.bridge.origin.map((value, axis) => (
    value + (bridgeSocket[axis] - value) / 2
  ));
  leaderApex[1] = Math.max(model.bridge.origin[1], bridgeSocket[1]) + 3;
  const leaderGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...model.bridge.origin),
    new THREE.Vector3(...leaderApex),
    new THREE.Vector3(...bridgeSocket),
  ]);
  const leader = new THREE.Line(leaderGeometry, cyanMaterial);
  leader.name = 'ug67-real-location-to-schematic-leader';
  leader.userData = { evidenceOnly: true, topologyImpact: false, originDeviceId: 'UG67-01' };
  root.add(leader);

  const haloGeometry = new THREE.TorusGeometry(0.58, 0.055, 8, 32);
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.88, toneMapped: false });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.name = 'ug67-real-location-halo';
  halo.position.set(...model.bridge.origin);
  halo.rotation.y = Math.PI / 2;
  root.add(halo);

  const rfDetailRoot = new THREE.Group();
  rfDetailRoot.name = 'ug67-four-lorawan-lane-detail';
  rfDetailRoot.visible = false;
  const rfMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });
  const rfEndpoints = [
    [4.62, 4.22, 1.35], [4.75, 3.84, 1.75], [4.75, 3.44, 2.18], [4.62, 3.06, 2.58],
  ];
  rfEndpoints.forEach((end, index) => {
    const start = [model.bridge.origin[0] + 0.2, model.bridge.origin[1] + 0.3 - index * 0.2, model.bridge.origin[2]];
    const lineRoot = dashedWorldLine({ THREE, points: [start, end], material: rfMaterial, dashCount: 6 });
    lineRoot.name = `ug67-rf-lane-${model.buses[index].id}`;
    lineRoot.userData = { uc100Id: model.buses[index].uc100Id, medium: 'lorawan', physical: false };
    rfDetailRoot.add(lineRoot);
  });
  groups.architecture.add(root);
  groups.architecture.add(rfDetailRoot);

  const objects = [root, panel, leader, halo, rfDetailRoot];
  root.traverse((object) => { if (!objects.includes(object)) objects.push(object); });
  rfDetailRoot.traverse((object) => { if (!objects.includes(object)) objects.push(object); });

  function setVisibility({ schematic = false, ug67RfDetail = false } = {}) {
    root.visible = schematic;
    rfDetailRoot.visible = ug67RfDetail;
  }

  function dispose() {
    root.parent?.remove(root);
    rfDetailRoot.parent?.remove(rfDetailRoot);
    for (const object of objects) object.geometry?.dispose?.();
    for (const material of new Set([panelMaterial, frameMaterial, redMaterial, cyanMaterial, haloMaterial, rfMaterial])) material.dispose?.();
    texture.dispose?.();
  }

  return Object.freeze({ model, layout, texture, root, rfDetailRoot, objects, setVisibility, dispose });
}

export function resolveNetworkEvidenceVisibility(cameraName, { visualMode = 'engineering' } = {}) {
  // complete-network is the preset whose job is to expose the whole chain: the physical media and
  // the endpoint captions must be present there, with the board beside them as the derived summary.
  // P6 correction P2: `visual_states.architecture` declares the network hidden, so the board is an
  // ENGINEERING exhibit — in the architecture state it rendered as a floating red-framed slab.
  if (cameraName === 'complete-network') {
    return freeze({
      schematic: visualMode === 'engineering',
      densePhysicalNetwork: true,
      technicalLabels: true,
      ug67RfDetail: false,
    });
  }
  if (cameraName === 'network-schematic-detail') {
    return freeze({
      schematic: true,
      densePhysicalNetwork: false,
      technicalLabels: false,
      ug67RfDetail: false,
    });
  }
  return freeze({
    schematic: false,
    densePhysicalNetwork: true,
    technicalLabels: true,
    // `visual_states.architecture` declares the network hidden: the RF ticks are engineering-only.
    ug67RfDetail: cameraName === 'ug67' && visualMode === 'engineering',
  });
}
