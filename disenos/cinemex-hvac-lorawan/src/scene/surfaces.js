import {
  LIGHTING_MEDIA,
  LIGHTING_OWNED_LABEL_RELAXATION,
} from './lighting.js';

const REQUIRED_DETAIL_CATEGORIES = Object.freeze([
  'facade-word-sign',
  'wall-joint',
  'glass-safety-band',
  'door-hardware',
  'portal-seal',
  'room-number',
  'floor-joint',
  'carpet-pattern',
  'roof-seam',
  'roof-curb',
  'service-sign',
  'exit-sign',
  'containment-marking',
  'poster-placeholder',
  'menu-display',
  'acoustic-panel-rhythm',
  'screen-content',
  'facade-breakup',
  'pos-cue',
  'snack-machine-cue',
  'popcorn-display-cue',
  'refrigeration-display-cue',
  'kitchen-service-cue',
  'media-arrowhead',
  'aisle-marking',
  'wayfinding-marking',
  'tc300-glass-face',
  'tc300-status-ring',
  'tc300-terminal-gland',
]);

/**
 * The canvas the capture harness actually shoots: a 960x720 CSS page minus the UI side panel
 * leaves a 688x636 CSS canvas (measured on the gated surface/lighting PNGs: 2752x2544 @ DPR 4 and
 * 2064x1908 @ DPR 3, both 1.0818). Every screen-space claim in this pass is derived through THIS
 * viewport — the previous 720x900/0.8 portrait model was a guess that contradicted the judged
 * pixels (deferred defect X1) and forced the facade 4.5 m off-axis to satisfy two truths.
 */
export const SURFACE_EVIDENCE_VIEWPORT = Object.freeze({
  widthPx: 688,
  heightPx: 636,
  aspect: 688 / 636,
});

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  if (length <= Number.EPSILON) throw new RangeError('Cannot normalize a degenerate vector.');
  return vector.map((value) => value / length);
}

/** Right-handed view basis of a camera preset, so tests can project instead of assume. */
export function createCameraBasis({ position, target } = {}) {
  if (!Array.isArray(position) || !Array.isArray(target)) {
    throw new TypeError('A camera basis requires a preset position and target.');
  }
  const forward = normalize(subtract(target, position));
  const right = normalize(cross(forward, [0, 1, 0]));
  return Object.freeze({
    position: Object.freeze([...position]),
    forward: Object.freeze(forward),
    right: Object.freeze(right),
    up: Object.freeze(cross(right, forward)),
  });
}

/** Pinhole projection into normalized device coordinates. Returns null behind the camera. */
export function projectPointToNdc(point, preset, aspect = SURFACE_EVIDENCE_VIEWPORT.aspect) {
  const basis = createCameraBasis(preset);
  const offset = subtract(point, basis.position);
  const depth = dot(offset, basis.forward);
  if (!(depth > 0)) return null;
  const tanY = Math.tan((preset.fov * Math.PI) / 360);
  const tanX = tanY * aspect;
  return Object.freeze({
    x: dot(offset, basis.right) / (depth * tanX),
    y: dot(offset, basis.up) / (depth * tanY),
    depth,
  });
}

/** Convex point-in-quad test on projected corners, used to prove one surface cannot cover another. */
export function isPointInsideProjectedQuad(point, quad) {
  if (!point || !Array.isArray(quad) || quad.length !== 4 || quad.some((corner) => !corner)) return false;
  let sign = 0;
  for (let index = 0; index < 4; index += 1) {
    const from = quad[index];
    const to = quad[(index + 1) % 4];
    const edge = (to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x);
    if (edge === 0) continue;
    const current = Math.sign(edge);
    if (sign === 0) sign = current;
    else if (current !== sign) return false;
  }
  return sign !== 0;
}

/**
 * Surface-pass authority for the engineering read. The shell stays translucent, but the seats and
 * the zone volumes must stop washing the thin network media, and the media must out-emit them.
 */
export const SURFACE_ENGINEERING_CONTRAST = Object.freeze({
  shellOpacity: 0.18,
  seatOpacity: 0.07,
  carpetOpacity: 0.1,
  zoneOpacity: 0.04,
  // Owned by the lighting pass: the surface review found that a hot multiplier clips the media to
  // white and kills the very hue the legend depends on. The emission is now set by the screen
  // colour it must produce, and the shell it must beat is de-ghosted in the same pass.
  mediaEmissiveIntensity: LIGHTING_MEDIA.emissiveIntensity,
});

/**
 * True media cross-sections are centimetric, so at the complete-network camera they fall below one
 * pixel and disappear. The evidence camera widens the cross-section only; positions never move.
 */
export const SURFACE_NETWORK_MEDIA = Object.freeze({
  camera: 'complete-network',
  widthScale: 5,
  // Legibility floor calibrated under the old 900px-height model; re-expressed for the measured
  // 636px viewport (X1). Same physical floor in the captured PNG, different model unit.
  minimumProjectedPx: 3 * (636 / 900),
  evidenceViewportHeightPx: SURFACE_EVIDENCE_VIEWPORT.heightPx,
  widths: Object.freeze({
    rs485Tray: 0.24,
    rs485Trunk: 0.11,
    rs485DropTray: 0.18,
    rs485Drop: 0.08,
    // RF is the thinnest, most broken-up medium; Ethernet stays the fattest continuous tube.
    lorawan: 0.09,
    ethernetRoute: 0.12,
    ethernetChain: 0.16,
  }),
});

/**
 * A tray drawn on the conductor's own centre line encloses it: the saturated green disappears and,
 * under engineering translucency, bleeds back as pale mint. The tray is therefore offset by exactly
 * half of both cross-sections, so the two faces touch and the conductor stays exposed at any scale.
 */
export function resolveTrayOffset(trayWidth, conductorWidth) {
  if (![trayWidth, conductorWidth].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('A tray offset requires two positive cross-sections.');
  }
  return (trayWidth + conductorWidth) / 2;
}

/**
 * LoRaWAN is radio: it must read as a broken line, not as a blue bar. The mark/gap period is
 * derived from the route length so long lanes do not grow metre-long dashes.
 *
 * The period is set so that a dash stays LONGER than it is thick at every evidence scale: at the
 * complete-network camera the old 1.1 m period produced a 0.46 m dash inside a 0.45 m cross-section
 * — a cube, which is exactly the "chain of white beads" the surface review rejected.
 */
export const SURFACE_LORAWAN_DASH = Object.freeze({
  periodMetres: 2.2,
  dutyCycle: 0.42,
  minimumDashes: 4,
  maximumDashes: 48,
});

export function resolveDashCount(lengthMetres, policy = SURFACE_LORAWAN_DASH) {
  if (!Number.isFinite(lengthMetres) || lengthMetres <= 0) {
    throw new RangeError('A dashed route needs a positive length.');
  }
  return Math.min(
    policy.maximumDashes,
    Math.max(policy.minimumDashes, Math.round(lengthMetres / policy.periodMetres)),
  );
}

/** Snaps a requested route sample onto the centre of the dash that owns it. */
export function snapSampleToDashCentre(routeT, { dashCount, dashCoverage } = {}) {
  if (!Number.isFinite(routeT) || routeT < 0 || routeT >= 1
    || !Number.isInteger(dashCount) || dashCount <= 0
    || !Number.isFinite(dashCoverage) || dashCoverage <= 0 || dashCoverage > 1) {
    throw new RangeError('Dash snapping requires a valid route fraction and dash policy.');
  }
  const cell = Math.min(dashCount - 1, Math.floor(routeT * dashCount));
  return (cell + dashCoverage / 2) / dashCount;
}

/** Public roof panels hide the whole fit-out from the interior front-of-house presets. */
export const SURFACE_ROOF_CLIP_CAMERAS = Object.freeze(['lobby', 'concessions', 'kitchen']);

/**
 * The evidence widening is per medium. RS-485 and Ethernet are continuous tubes, so a fat
 * cross-section only makes them traceable; a LoRaWAN dash has a finite length, so the same
 * widening turns it into a bead. RF is therefore widened less than the wired media.
 */
export function resolveNetworkMediaWidthScale(cameraName, materialKey = null) {
  if (cameraName !== SURFACE_NETWORK_MEDIA.camera) return 1;
  return materialKey === 'lorawan-blue'
    ? LIGHTING_MEDIA.lorawanEvidenceWidthScale
    : SURFACE_NETWORK_MEDIA.widthScale;
}

/** Vertical-FOV projection of a world size at a given view distance. */
export function projectedMetresToPixels(metres, { distance, fovDegrees, viewportHeightPx } = {}) {
  if (![metres, distance, fovDegrees, viewportHeightPx].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Projection requires positive, finite size, distance, field of view and viewport.');
  }
  const visibleHeight = 2 * distance * Math.tan((fovDegrees * Math.PI) / 360);
  return (metres / visibleHeight) * viewportHeightPx;
}

export const SURFACE_DIRECTION_MARKER = Object.freeze({
  materialKey: 'direction-amber',
  geometry: 'triangular-cone',
  radius: 0.075,
  length: 0.9,
  instancesPerMarker: 1,
  terminalT: 0.82,
  projectedMinPx: 16,
  projectedMaxPx: 18,
  projectedTargetPx: 16.5,
  projectedMaxWidthPx: 8,
  minimumGlyphSeparationPx: 8,
  viewPriority: 'network-terminal-overlay',
  emissive: true,
  engineeringOpaque: true,
  emissiveIntensity: 0.65,
  depthTest: true,
  depthWrite: false,
  renderOrder: 1180,
  topologyImpact: false,
});

export const SURFACE_DIRECTION_MARKER_VIEW_POLICY = Object.freeze({
  minPx: SURFACE_DIRECTION_MARKER.projectedMinPx,
  maxPx: SURFACE_DIRECTION_MARKER.projectedMaxPx,
  targetPx: SURFACE_DIRECTION_MARKER.projectedTargetPx,
  maxWidthPx: SURFACE_DIRECTION_MARKER.projectedMaxWidthPx,
  minimumSeparationPx: SURFACE_DIRECTION_MARKER.minimumGlyphSeparationPx,
  minimumScale: 0.05,
  maximumScale: 12,
});

export const SURFACE_NETWORK_LABEL_POLICY = Object.freeze({
  camera: 'complete-network',
  visibleKinds: Object.freeze(['uc100', 'ug67', 'external', 'bus-rollup']),
  culledKinds: Object.freeze(['bus-group', 'room-family', 'foh', 'rear-strip']),
  scaleByKind: Object.freeze({ uc100: 1.5, ug67: 2.2, external: 1.5, 'bus-rollup': 1.4 }),
  priorityByKind: Object.freeze({ uc100: 1230, ug67: 1260, external: 1210, 'bus-rollup': 1200 }),
});

/**
 * The first node of the canonical chain has to be legible in the model, not only on the board.
 * The chip carries that legibility, so the device body can keep its true 100 mm width. A chip is
 * shown only where it survives its own projection: the distance cull is derived, never a guess.
 */
export const SURFACE_TC300_LABEL_POLICY = Object.freeze({
  cameras: Object.freeze(['corridor', 'kitchen', 'lobby', 'sala-3', 'complete-network']),
  // Calibrated under the old 900px-height model; re-expressed for the measured 636px viewport (X1).
  minimumProjectedChipPx: 30 * (636 / 900),
  frameMargin: 0.95,
  renderOrder: 1220,
  scaleByCamera: Object.freeze({
    corridor: 0.55,
    kitchen: 0.5,
    lobby: 0.6,
    'sala-3': 0.5,
    'complete-network': 2.2,
  }),
});

/**
 * A chip earns its place: it must land inside the frame and still project wide enough to be read.
 * Both facts are derived from the preset, so the distance cull moves with the camera.
 */
export function resolveTc300LabelPlacement({
  cameraName,
  preset,
  chipPosition,
  chipWidthMetres,
  // The endpoint that OWNS the zone this preset frames is never culled by distance alone: a
  // capture of the concessions zone that cannot name its own thermostat proves nothing.
  zoneOwned = false,
  policy = SURFACE_TC300_LABEL_POLICY,
} = {}) {
  const scale = policy.scaleByCamera[cameraName]
    ?? (zoneOwned ? LIGHTING_OWNED_LABEL_RELAXATION.defaultScale : undefined);
  const minimumProjectedChipPx = zoneOwned
    ? LIGHTING_OWNED_LABEL_RELAXATION.minimumProjectedChipPx
    : policy.minimumProjectedChipPx;
  const culled = (reason, extra = {}) => Object.freeze({
    visible: false, reason, scale: scale ?? 1, distance: Infinity, projectedWidthPx: 0, ...extra,
  });
  if ((!policy.cameras.includes(cameraName) && !zoneOwned) || !Number.isFinite(scale)) {
    return culled('off-policy');
  }
  if (!Array.isArray(chipPosition) || !preset?.position || !Number.isFinite(preset.fov)
    || !Number.isFinite(chipWidthMetres)) {
    throw new TypeError('A TC300 chip placement needs the preset, the chip anchor and the chip width.');
  }

  const distance = Math.hypot(...subtract(chipPosition, preset.position));
  const projectedWidthPx = projectedMetresToPixels(chipWidthMetres * scale, {
    distance,
    fovDegrees: preset.fov,
    viewportHeightPx: SURFACE_EVIDENCE_VIEWPORT.heightPx,
  });
  const ndc = projectPointToNdc(chipPosition, preset);
  if (!ndc || Math.abs(ndc.x) > policy.frameMargin || Math.abs(ndc.y) > policy.frameMargin) {
    return culled('off-frame', { distance, projectedWidthPx });
  }
  if (projectedWidthPx < minimumProjectedChipPx) {
    return culled('too-small', { distance, projectedWidthPx });
  }
  return Object.freeze({ visible: true, reason: 'shown', scale, distance, projectedWidthPx });
}

export const SURFACE_NETWORK_ROLLUPS = Object.freeze([
  Object.freeze({ id: 'A', text: 'BUS A · TC01/02/03/04/14' }),
  Object.freeze({ id: 'B', text: 'BUS B · TC06–09' }),
  Object.freeze({ id: 'C', text: 'BUS C · TC10–13' }),
  Object.freeze({ id: 'D', text: 'BUS D · TC05' }),
]);

export const SURFACE_RS485_EVIDENCE_POLICY = Object.freeze({
  camera: 'rs485-master',
  visibleKinds: Object.freeze(['tc300', 'uc100', 'bus-group']),
  requiredCounts: Object.freeze({ tc300: 14, uc100: 4, 'bus-group': 4 }),
});

export const SURFACE_NETWORK_VIEW_POLICY = Object.freeze({
  minimumMarginRatio: 0.02,
  maximumMarginRatio: 0.98,
  minimumOccupancyWidthRatio: 0.55,
  minimumOccupancyHeightRatio: 0.25,
});

/**
 * Matches the rendered LoRa dash construction: N equal route cells with the first `dashCoverage`
 * of each cell visible. A marker anchored in the remaining gap is mathematically attached
 * to the route but reads as detached in the final pixels.
 */
export function isDirectionMarkerSampleVisibleOnDashedRoute(
  routeT,
  { dashCount = 7, dashCoverage = SURFACE_LORAWAN_DASH.dutyCycle } = {},
) {
  if (!Number.isFinite(routeT) || routeT < 0 || routeT > 1
    || !Number.isInteger(dashCount) || dashCount <= 0
    || !Number.isFinite(dashCoverage) || dashCoverage <= 0 || dashCoverage > 1) {
    throw new RangeError('Dashed-route marker sampling requires a valid route fraction and dash policy.');
  }
  if (routeT === 1) return false;
  const cellProgress = routeT * dashCount;
  return cellProgress - Math.floor(cellProgress) <= dashCoverage;
}

export function createDashedRouteSampleEvidence(
  samples,
  { dashCount = 7, dashCoverage = 0.55 } = {},
) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new TypeError('Dashed-route marker samples are required.');
  }
  const dashCells = [];
  const phases = [];
  const visibility = [];
  for (const sample of samples) {
    visibility.push(isDirectionMarkerSampleVisibleOnDashedRoute(sample, { dashCount, dashCoverage }));
    const cellProgress = sample * dashCount;
    dashCells.push(Math.floor(cellProgress));
    phases.push(cellProgress - Math.floor(cellProgress));
  }
  return Object.freeze({
    dashCells: Object.freeze(dashCells),
    phases: Object.freeze(phases),
    allVisible: visibility.every(Boolean),
    distinctDashCells: new Set(dashCells).size === dashCells.length,
  });
}

/**
 * Samples a route component for a generated direction annotation. The sample is the cone base,
 * so every camera-specific size change can preserve physical contact with the owning route.
 */
export function createDirectionMarkerPlacement(start, end, { terminalT = SURFACE_DIRECTION_MARKER.terminalT } = {}) {
  if (![start, end].every((point) => (
    Array.isArray(point) && point.length === 3 && point.every(Number.isFinite)
  ))) throw new TypeError('Direction marker endpoints must be finite 3D points.');
  if (!Number.isFinite(terminalT) || terminalT <= 0 || terminalT >= 1) {
    throw new RangeError('Direction marker terminal sample must be inside the route component.');
  }

  const delta = end.map((value, axis) => value - start[axis]);
  const routeLength = Math.hypot(...delta);
  if (routeLength <= Number.EPSILON) throw new RangeError('Direction marker requires a non-zero route tangent.');
  const tangent = delta.map((value) => value / routeLength);
  const routeAnchor = start.map((value, axis) => value + delta[axis] * terminalT);

  return Object.freeze({
    routeAnchor: Object.freeze(routeAnchor),
    tangent: Object.freeze(tangent),
    routeComponentT: terminalT,
    orientationErrorRadians: 0,
    baseContactDistance: 0,
    component: 'single-arrowhead',
    instances: SURFACE_DIRECTION_MARKER.instancesPerMarker,
    projectedMinPx: SURFACE_DIRECTION_MARKER.projectedMinPx,
    projectedMaxPx: SURFACE_DIRECTION_MARKER.projectedMaxPx,
  });
}

export function resolveDirectionMarkerScale(projectedUnscaledLengthPx) {
  if (!Number.isFinite(projectedUnscaledLengthPx) || projectedUnscaledLengthPx <= 0) {
    throw new RangeError('Projected direction-marker length must be positive and finite.');
  }
  const scale = SURFACE_DIRECTION_MARKER_VIEW_POLICY.targetPx / projectedUnscaledLengthPx;
  return Math.min(
    SURFACE_DIRECTION_MARKER_VIEW_POLICY.maximumScale,
    Math.max(SURFACE_DIRECTION_MARKER_VIEW_POLICY.minimumScale, scale),
  );
}

export function refineDirectionMarkerScale(scale, projectedRenderedLengthPx) {
  if (!Number.isFinite(scale) || scale <= 0
    || !Number.isFinite(projectedRenderedLengthPx) || projectedRenderedLengthPx <= 0) {
    throw new RangeError('Direction-marker scale and rendered projection must be positive and finite.');
  }
  const refined = scale * SURFACE_DIRECTION_MARKER_VIEW_POLICY.targetPx / projectedRenderedLengthPx;
  return Math.min(
    SURFACE_DIRECTION_MARKER_VIEW_POLICY.maximumScale,
    Math.max(SURFACE_DIRECTION_MARKER_VIEW_POLICY.minimumScale, refined),
  );
}

export function createDirectionMarkerViewTransform(placement, scale) {
  if (!placement?.routeAnchor || !placement?.tangent || !Number.isFinite(scale) || scale <= 0) {
    throw new TypeError('Direction marker placement and positive view scale are required.');
  }
  const renderedLength = SURFACE_DIRECTION_MARKER.length * scale;
  const position = placement.routeAnchor.map((value, axis) => (
    value + placement.tangent[axis] * renderedLength / 2
  ));
  return Object.freeze({
    position: Object.freeze(position),
    basePosition: Object.freeze([...placement.routeAnchor]),
    axis: Object.freeze([...placement.tangent]),
    scale,
    renderedLength,
    baseContactDistance: 0,
  });
}

export function validateProjectedDirectionMarkers(markers = []) {
  if (!Array.isArray(markers) || markers.length === 0) {
    throw new TypeError('Projected direction markers are required.');
  }
  const routeIds = new Set();
  for (const marker of markers) {
    if (!marker?.routeComponentId || routeIds.has(marker.routeComponentId)) {
      throw new RangeError('Every arrowhead must own one unique route component.');
    }
    routeIds.add(marker.routeComponentId);
    if (!Number.isFinite(marker.projectedLengthPx)
      || marker.projectedLengthPx < SURFACE_DIRECTION_MARKER_VIEW_POLICY.minPx
      || marker.projectedLengthPx > SURFACE_DIRECTION_MARKER_VIEW_POLICY.maxPx) {
      throw new RangeError('Direction marker must stay inside the screen-space band.');
    }
    if (!Number.isFinite(marker.projectedWidthPx) || marker.projectedWidthPx <= 0
      || marker.projectedWidthPx > SURFACE_DIRECTION_MARKER_VIEW_POLICY.maxWidthPx) {
      throw new RangeError('Direction marker lateral width exceeds its subordinate glyph budget.');
    }
    const bounds = marker.bounds;
    if (!bounds || !['minX', 'minY', 'maxX', 'maxY'].every((key) => Number.isFinite(bounds[key]))
      || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
      throw new RangeError('Direction marker requires finite projected bounds.');
    }
  }
  for (let left = 0; left < markers.length; left += 1) {
    for (let right = left + 1; right < markers.length; right += 1) {
      const a = markers[left].bounds;
      const b = markers[right].bounds;
      const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
      const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
      if (Math.hypot(dx, dy) < SURFACE_DIRECTION_MARKER_VIEW_POLICY.minimumSeparationPx) {
        throw new RangeError('Direction marker glyph separation is below the screen-space budget.');
      }
    }
  }
  return true;
}

export function validateNetworkViewportEvidence({ viewport, bounds } = {}) {
  if (!viewport || !bounds || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)
    || viewport.width <= 0 || viewport.height <= 0
    || !['minX', 'minY', 'maxX', 'maxY'].every((key) => Number.isFinite(bounds[key]))) {
    throw new TypeError('Network viewport evidence requires finite viewport bounds.');
  }
  const policy = SURFACE_NETWORK_VIEW_POLICY;
  if (bounds.minX < viewport.width * policy.minimumMarginRatio
    || bounds.maxX > viewport.width * policy.maximumMarginRatio
    || bounds.minY < viewport.height * policy.minimumMarginRatio
    || bounds.maxY > viewport.height * policy.maximumMarginRatio) {
    throw new RangeError('Network endpoint evidence must remain inside viewport margins.');
  }
  if ((bounds.maxX - bounds.minX) / viewport.width < policy.minimumOccupancyWidthRatio
    || (bounds.maxY - bounds.minY) / viewport.height < policy.minimumOccupancyHeightRatio) {
    throw new RangeError('Network endpoint evidence does not meet viewport occupancy.');
  }
  return true;
}

export const POSTER_VARIANTS = Object.freeze(['a', 'b', 'c', 'd']);

const posterTiles = Object.freeze([0, 1].flatMap((frame) => (
  POSTER_VARIANTS.map((variant) => `poster-${frame}${variant}`)
)));

export const SURFACE_ATLAS_TILES = Object.freeze([
  'cinemex', 'exit', 'service',
  ...Array.from({ length: 8 }, (_, index) => `room-${index + 1}`),
  ...posterTiles,
  'display-0', 'display-0b', 'display-0c',
  'display-1', 'display-1b', 'display-1c',
  'screen-0', 'screen-1', 'rs485',
]);

/** Each 256 px poster cell is split into four 128 px panels so one bank owns four artworks. */
const posterQuadrants = Object.fromEntries([0, 1].flatMap((frame) => {
  const [originX, originY] = frame === 0 ? [768, 128] : [0, 384];
  return POSTER_VARIANTS.map((variant, index) => [
    `poster-${frame}${variant}`,
    [originX + (index % 2) * 128, originY + Math.floor(index / 2) * 128, 128, 128],
  ]);
}));

export const SURFACE_ATLAS_LAYOUT = Object.freeze({
  cinemex: [0, 0, 1024, 128],
  exit: [0, 128, 256, 256],
  service: [256, 128, 256, 256],
  rs485: [512, 128, 256, 256],
  ...posterQuadrants,
  'display-0': [256, 384, 256, 85],
  'display-0b': [256, 469, 256, 85],
  'display-0c': [256, 554, 256, 86],
  'display-1': [512, 384, 256, 85],
  'display-1b': [512, 469, 256, 85],
  'display-1c': [512, 554, 256, 86],
  'screen-0': [768, 384, 256, 128],
  'screen-1': [768, 512, 256, 128],
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [
    `room-${index + 1}`,
    [(index % 4) * 256, 640 + Math.floor(index / 4) * 192, 256, 192],
  ])),
});

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

/** Stable surface authority. All graphics are generated and intentionally generic. */
export function createSurfaceDetailPlan() {
  return freezeDeep({
    assetId: 'shell-circulation-facade',
    pass: 'surface',
    atlas: { size: 1024, packing: 'banner-grid', shared: true },
    identity: { text: 'Cinemex', dimensionalBacking: true, tile: 'cinemex' },
    frames: { poster: [0, 1], display: [0, 1] },
    details: REQUIRED_DETAIL_CATEGORIES.map((category) => ({
      category,
      generated: true,
      protectedContentSafe: true,
    })),
  });
}

const PLACEMENT_LIMITS = Object.freeze({
  'facade-word-sign': [14, 1.5],
  'room-number': [1.2, 1.2],
  'service-sign': [2.2, 1],
  'exit-sign': [1.8, 1],
  'containment-marking': [1.4, 0.8],
  'poster-placeholder': [1.8, 2.2],
  'menu-display': [1.8, 1.8],
  'screen-content': [8, 6.5],
});

/** Fail fast before any atlas quad reaches the scene with a scaled-parent/world-size defect. */
export function validateSurfacePlacements(placements = []) {
  for (const placement of placements) {
    const finitePosition = Array.isArray(placement.position)
      && placement.position.length === 3
      && placement.position.every(Number.isFinite);
    const finiteSize = Array.isArray(placement.size)
      && placement.size.length === 2
      && placement.size.every((value) => Number.isFinite(value) && value > 0);
    const finiteRotation = Number.isFinite(placement.rotationY ?? 0);
    const parentValid = placement.parentLayer === 'architecture' || placement.parentLayer === 'labels';
    const localValid = placement.localSpace === 'world-root';
    const visibilityValid = placement.visibilityOnly === true;
    const limits = PLACEMENT_LIMITS[placement.kind] ?? [14, 7];
    const bounded = finiteSize && placement.size[0] <= limits[0] && placement.size[1] <= limits[1];
    const withinScene = finitePosition
      && placement.position[0] >= -31 && placement.position[0] <= 31
      && placement.position[1] >= 0 && placement.position[1] <= 10
      && placement.position[2] >= -23.5 && placement.position[2] <= 23.5;
    if (!finitePosition || !finiteSize || !finiteRotation || !parentValid || !localValid
      || !visibilityValid || !bounded || !withinScene) {
      throw new RangeError(`Invalid surface placement: ${placement.id ?? 'unknown'}`);
    }
  }
  return true;
}

function tileLabel(tile) {
  if (tile.startsWith('room-')) return tile.slice(5);
  if (tile === 'cinemex') return 'Cinemex';
  if (tile === 'exit') return 'EXIT';
  if (tile === 'service') return 'SERVICE';
  if (tile === 'rs485') return 'RS-485';
  return '';
}

const POSTER_PALETTES = Object.freeze({
  0: Object.freeze({
    a: ['#20142d', '#d71920', '#f4d35e', '#f7f2ea'],
    b: ['#0d1b2a', '#e05a2b', '#f2c14e', '#e8eef2'],
    c: ['#221018', '#8f1726', '#e7c8a0', '#f2e7dc'],
    d: ['#101a17', '#1f8a70', '#f0e2a1', '#eef4ef'],
  }),
  1: Object.freeze({
    a: ['#071a2b', '#138a9e', '#f7f7f2', '#9fe0ea'],
    b: ['#1c0f22', '#7b2cbf', '#ffd166', '#efe4ff'],
    c: ['#12140f', '#c8102e', '#e9e3d3', '#7f8c6a'],
    d: ['#0a0f1c', '#2d9cff', '#f8fafc', '#ffb703'],
  }),
});

/**
 * Deterministic abstract poster artwork. Every (frame, variant) pair owns its own palette and its
 * own composition, so the four-panel bank changes visibly between poster frames. Purely generated
 * geometry: no protected film imagery is referenced or reproduced.
 */
export function createPosterArtwork(frame, variant) {
  const selectedFrame = frame === 1 ? 1 : 0;
  const palette = POSTER_PALETTES[selectedFrame][variant];
  if (!palette) throw new RangeError(`Unknown poster variant: ${variant}`);
  const [background, primary, accent, highlight] = palette;
  const compositions = {
    a: [
      [primary, 0.1, 0.08, 0.8, 0.18],
      [accent, 0.16, 0.34, 0.3, 0.42],
      [highlight, 0.54, 0.34, 0.3, 0.42],
      [primary, 0.16, 0.86, 0.68, 0.05],
    ],
    b: [
      [accent, 0.08, 0.1, 0.36, 0.7],
      [primary, 0.5, 0.1, 0.42, 0.34],
      [highlight, 0.5, 0.5, 0.42, 0.3],
      [accent, 0.08, 0.86, 0.84, 0.05],
    ],
    c: [
      [primary, 0.12, 0.12, 0.76, 0.3],
      [highlight, 0.12, 0.48, 0.34, 0.34],
      [accent, 0.52, 0.48, 0.36, 0.34],
      [primary, 0.3, 0.88, 0.4, 0.04],
    ],
    d: [
      [highlight, 0.1, 0.1, 0.8, 0.12],
      [primary, 0.1, 0.28, 0.38, 0.5],
      [accent, 0.52, 0.28, 0.38, 0.24],
      [primary, 0.52, 0.56, 0.38, 0.22],
    ],
  };
  const shapes = (selectedFrame === 0 ? compositions[variant] : [...compositions[variant]].reverse())
    .map(([color, left, top, width, height]) => Object.freeze({ color, left, top, width, height }));
  return Object.freeze({
    frame: selectedFrame,
    variant,
    background,
    shapes: Object.freeze(shapes),
  });
}

function drawPoster(context, x, y, width, height, frame, variant) {
  const artwork = createPosterArtwork(frame, variant);
  context.fillStyle = artwork.background;
  context.fillRect(x, y, width, height);
  for (const shape of artwork.shapes) {
    context.fillStyle = shape.color;
    context.fillRect(
      x + width * shape.left,
      y + height * shape.top,
      width * shape.width,
      height * shape.height,
    );
  }
}

function drawDisplay(context, x, y, width, height, variant) {
  context.fillStyle = '#10141d';
  context.fillRect(x, y, width, height);
  context.fillStyle = '#d71920';
  context.fillRect(x + width * 0.06, y + height * 0.08, width * 0.88, height * 0.18);
  context.fillStyle = '#f8fafc';
  context.font = `800 ${Math.round(height * 0.11)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const titles = variant.frame === 0
    ? ['SNACKS', 'DRINKS', 'FRESH']
    : ['COMBOS', 'POPCORN', 'PICKUP'];
  context.fillText(titles[variant.style], x + width / 2, y + height * 0.17);
  const patterns = [
    [0.62, 0.44, 0.72],
    [0.38, 0.68, 0.52],
    [0.74, 0.55, 0.32],
  ];
  const bars = patterns[variant.style];
  bars.forEach((width, index) => {
    context.fillStyle = index % 2 ? '#f4d35e' : '#e5e7eb';
    context.fillRect(x + height * 0.12, y + height * (0.39 + index * 0.17), height * width, height * 0.045);
  });
}

function drawScreen(context, x, y, width, height, frame) {
  context.fillStyle = frame === 0 ? '#24152f' : '#071c27';
  context.fillRect(x, y, width, height);
  context.fillStyle = frame === 0 ? '#d71920' : '#1495a8';
  context.fillRect(x + width * 0.08, y + height * 0.14, width * 0.84, height * 0.16);
  context.fillRect(x + width * 0.14, y + height * 0.46, width * 0.32, height * 0.34);
  context.fillStyle = frame === 0 ? '#f4d35e' : '#f8fafc';
  context.fillRect(x + width * 0.54, y + height * 0.4, width * 0.3, height * 0.4);
  context.fillRect(x + width * 0.22, y + height * 0.88, width * 0.56, height * 0.035);
}

function drawTile(context, tile, x, y, width, height) {
  const inset = Math.max(5, Math.min(10, Math.round(Math.min(width, height) * 0.04)));
  const left = x + inset;
  const top = y + inset;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  if (tile.startsWith('poster-')) {
    drawPoster(context, left, top, innerWidth, innerHeight, Number(tile.at(-2)), tile.at(-1));
    return;
  }
  if (tile.startsWith('display-')) {
    drawDisplay(context, left, top, innerWidth, innerHeight, {
      frame: tile.startsWith('display-1') ? 1 : 0,
      style: tile.endsWith('b') ? 1 : tile.endsWith('c') ? 2 : 0,
    });
    return;
  }
  if (tile.startsWith('screen-')) {
    drawScreen(context, left, top, innerWidth, innerHeight, Number(tile.at(-1)));
    return;
  }

  const isBrand = tile === 'cinemex';
  const isExit = tile === 'exit';
  context.fillStyle = isBrand ? '#d71920' : isExit ? '#087f5b' : '#151922';
  context.fillRect(left, top, innerWidth, innerHeight);
  context.strokeStyle = isBrand ? '#ff646a' : '#d9dee8';
  context.lineWidth = Math.max(4, height * 0.025);
  context.strokeRect(left + 4, top + 4, innerWidth - 8, innerHeight - 8);
  context.fillStyle = '#ffffff';
  const label = tileLabel(tile);
  const fontScale = isBrand ? 0.43 : label.length > 4 ? 0.12 : 0.42;
  context.font = `900 ${Math.round(height * fontScale)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x + width / 2, y + height / 2 + height * 0.015);
  if (tile === 'rs485') {
    context.fillStyle = '#22c55e';
    context.fillRect(left + innerWidth * 0.18, top + innerHeight * 0.68, innerWidth * 0.64, innerHeight * 0.06);
  }
}

/** Build one 4 × 4 atlas. The caller reuses its texture across every surface quad. */
export function createSurfaceAtlas({ THREE, documentObject = globalThis.document, anisotropy = 1 } = {}) {
  if (!THREE?.CanvasTexture || !documentObject?.createElement) {
    throw new TypeError('Three.js CanvasTexture and a document are required for surface graphics.');
  }
  const plan = createSurfaceDetailPlan();
  const canvas = documentObject.createElement('canvas');
  canvas.width = plan.atlas.size;
  canvas.height = plan.atlas.size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required for surface graphics.');
  context.clearRect(0, 0, canvas.width, canvas.height);

  const tiles = {};
  SURFACE_ATLAS_TILES.forEach((tile, index) => {
    const [x, y, width, height] = SURFACE_ATLAS_LAYOUT[tile];
    drawTile(context, tile, x, y, width, height);
    tiles[tile] = Object.freeze({
      index,
      u0: x / plan.atlas.size,
      u1: (x + width) / plan.atlas.size,
      v0: 1 - (y + height) / plan.atlas.size,
      v1: 1 - y / plan.atlas.size,
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.max(1, Math.min(4, Number.isFinite(anisotropy) ? anisotropy : 1));
  texture.needsUpdate = true;

  let disposed = false;
  return Object.freeze({
    texture,
    tiles: Object.freeze(tiles),
    dispose() {
      if (disposed) return;
      disposed = true;
      texture.dispose();
    },
  });
}
