/**
 * L4 items 15/16 — live temperature chips over the packaged rooftop units (Safran pattern).
 *
 * Adapted INLINE from the design3d library row `markers-ui/sims-floating-banner.mjs`
 * (source: cuarto-frio-safran · cuarto-3d.html:32109-32189, client-validated look): rounded
 * canvas badge + inverted pointer arrow on a camera-facing Sprite, vertical bob + subtle sway.
 * This page is a single-importmap app, so the factory is re-expressed here with the house
 * conventions instead of importing the library module:
 *   - THREE is injected (never module-imported) and the 2D context is used stub-safely
 *     (flat fills, no gradients), so the node test harness drives the real draw path.
 *   - ALL animation derives from the deterministic TICK clock (resolveChipPose) — capture
 *     frames t0/t30 are reproducible; no Date.now, no own rAF.
 *   - `toneMapped:false` on the sprite material (mandatory under the house ACES rig) and the
 *     library's renderOrder 999 with depthWrite:false.
 *   - The badge canvas is drawn once per READING CHANGE (temperature at 0.1 °C resolution),
 *     never per frame — the library's own perf lesson (cuarto-3d.html:32033).
 *
 * LABEL REVISION (user-requested, supersedes correction item A): the chip is ONE merged card
 * per unit again. The live temperature is the PRIMARY read — the dominant type size, on top —
 * and the zone location is a secondary but clearly legible line INSIDE THE SAME CARD. The
 * pointer arrow attaches to this single card, which carries the raycast deep-link userData.
 *
 * LABEL REVISION v3: the card shrank to a compact chip (~63% of the v2 world height) and BOTH
 * text lines now fit the card's inner width by real measurement — shrink-to-fit first, ellipsis
 * at the readable floor (see fitChipLine).
 *
 * FIXED-SIZE MANDATE (user, 2026-07-15 — the client's word is law, supersedes deferred S2):
 * the value cards keep ONE FIXED world size, derived from the plan so chips of neighboring
 * units can NEVER overlap (resolveFixedChipWidth: worldWidth ≤ minNeighborDistance × 0.9,
 * capped at the base width so it never grows). The former distance-scale legibility floor
 * (CHIP_LEGIBILITY / resolveChipScale) is RETIRED: camera distance never resizes a chip, and
 * setCameraPosition keeps only its exterior-visibility duty. Equal-height neighbors de-align
 * with a small deterministic per-unit lift (resolveChipLiftOffset) on top of the existing
 * per-unit bob/sway phases.
 *
 * The data is the ONE existing source of truth: the interaction model's telemetry — the same
 * deterministic healthy simulation the dashboard reads.
 */
export const TEMPERATURE_CHIP = Object.freeze({
  // User size bumps (2026-07-15): 2.15 → 2.7 → 3.3 → "más grandes" again. This CAP is now
  // deliberately ABOVE the plan's no-overlap bound, so the EFFECTIVE size is exactly that
  // bound: resolveFixedChipWidth clamps to minNeighbor × clearance (4.30 × 0.9 = 3.87 m) —
  // the largest fixed card that cannot touch its tightest neighbor. Any further growth
  // requires either raising `neighborClearance` past 0.9 or accepting overlap: a USER call.
  width: 4.0,
  aspect: 0.625, // merged card height / width (512x320 canvas)
  // Fixed-size mandate: the card may fill at most this fraction of the tightest XZ gap
  // between neighboring unit anchors — the rest is guaranteed daylight between chips.
  neighborClearance: 0.9,
  // Fixed-size mandate: equal-height neighbors take a small deterministic ± lift so their
  // chips never sit on one exact horizontal line at grazing views. Index-alternating, no RNG.
  liftStagger: 0.15,
  canvas: Object.freeze({ width: 512, height: 320 }),
  // The merged card's internal layout: one rounded card, the temperature line dominant on top,
  // the location line secondary underneath, the pointer arrow below the card. Ratios are of the
  // canvas height (fonts) or of the card height (line centres), so one resize keeps the layout.
  // `textInsetX` is the canvas-px inset from the card's OUTER edge to the text box on each side
  // (card inset 10 + border 5 + breathing room): no fitted glyph may cross it.
  layout: Object.freeze({
    cardHeightRatio: 0.76,
    valueFontRatio: 0.36,
    valueMinFontRatio: 0.26,
    valueCentreRatio: 0.35,
    nameFontRatio: 0.31,
    nameMinFontRatio: 0.18,
    nameCentreRatio: 0.8,
    textInsetX: 34,
  }),
  // The chip floats above its unit's cabinet top; the pointer aims back down at it.
  anchorLift: 1.2,
  // The live telemetry wobbles ~0.1 °C per tick; sampling the readings on this deterministic
  // cadence keeps the canvases from repainting every tick (a thermostat display reports slowly)
  // while t0/t30 captures stay exact (both are sample-aligned).
  readingIntervalTicks: 10,
  bob: Object.freeze({ amplitude: 0.12, periodTicks: 40 }),
  sway: Object.freeze({ amplitude: 0.05, periodTicks: 66 }),
  renderOrder: Object.freeze({ badge: 999 }),
  // Client light restyle (2026-07-15): the chip's accents (border stroke, pointer, location
  // line) retinted from the sky-blue/navy pair to the ONE blue accent family of the light SaaS
  // reference (#3B6FF5 class). Card ground and main ink stay.
  colors: Object.freeze({
    normal: Object.freeze({
      card: '#f8fafc',
      border: '#3b6ff5',
      pointer: '#2e5fe0',
      brand: '#2a55c9',
      main: '#0b1620',
    }),
  }),
});

// The deferred-S2 distance-scale floor (CHIP_LEGIBILITY / resolveChipScale /
// resolveNameTypeWorldHeight) was RETIRED here by the user mandate of 2026-07-15:
// the value cards keep one FIXED size and camera distance never resizes a chip.

/**
 * Fixed-size mandate (2026-07-15) — the ONE card size, derived FROM THE PLAN, never by eye.
 * Pure: the minimum pairwise XZ distance between the packaged units' chip anchors bounds the
 * card width at `neighborClearance` (0.9) of that gap, capped at the base `width` so the card
 * never grows past the client-validated compact chip. Fewer than two units: the base width.
 */
export function resolveFixedChipWidth(units = [], { width, neighborClearance } = TEMPERATURE_CHIP) {
  let minNeighborDistance = Infinity;
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const distance = Math.hypot(
        units[i].position[0] - units[j].position[0],
        units[i].position[2] - units[j].position[2],
      );
      if (distance < minNeighborDistance) minNeighborDistance = distance;
    }
  }
  if (!Number.isFinite(minNeighborDistance)) return width;
  return Math.min(width, minNeighborDistance * neighborClearance);
}

/**
 * Fixed-size mandate (2026-07-15) — deterministic per-unit lift so equal-height neighbors
 * never sit on one exact horizontal line at grazing views. Alternates ±`liftStagger` by unit
 * index (adjacent indices always differ); pure, no randomness, no collision system.
 */
export function resolveChipLiftOffset(index = 0, stagger = TEMPERATURE_CHIP.liftStagger) {
  return (index % 2 === 0 ? 1 : -1) * stagger;
}

/** es-MX reading, one decimal, exactly like the HUD's own telemetry line. One format authority. */
export function formatChipTemperature(value) {
  if (!Number.isFinite(value)) throw new RangeError('A temperature chip needs a finite reading.');
  return `${value.toFixed(1)} °C`;
}

/**
 * Item 16 — the exterior envelope the chips test the camera against: the building footprint AABB
 * with a 2 m margin, or anywhere above the tallest roof plate + 1 m (the aerial exception).
 */
export function createChipEnvelope({ building, maxPlateTop } = {}) {
  if (!building?.width || !building?.depth || !Number.isFinite(maxPlateTop)) {
    throw new TypeError('A chip envelope needs the building footprint and the tallest plate top.');
  }
  return Object.freeze({
    x: Object.freeze([-building.width / 2, building.width / 2]),
    z: Object.freeze([-building.depth / 2, building.depth / 2]),
    margin: 2,
    minOverheadY: maxPlateTop + 1,
  });
}

/** Pure exterior test: outside the margined footprint in plan, OR above the roofscape. */
export function isCameraOutside(envelope, position) {
  const point = Array.isArray(position)
    ? { x: position[0], y: position[1], z: position[2] }
    : position;
  if (!envelope || !Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) {
    throw new TypeError('The exterior test needs an envelope and a camera position.');
  }
  if (point.y > envelope.minOverheadY) return true;
  return point.x < envelope.x[0] - envelope.margin
    || point.x > envelope.x[1] + envelope.margin
    || point.z < envelope.z[0] - envelope.margin
    || point.z > envelope.z[1] + envelope.margin;
}

/** Deterministic bob/sway for one chip at one tick (per-chip phase keeps the field alive). */
export function resolveChipPose(tick = 0, index = 0) {
  const phase = index / 14;
  const bob = Math.sin(((tick / TEMPERATURE_CHIP.bob.periodTicks) + phase) * Math.PI * 2)
    * TEMPERATURE_CHIP.bob.amplitude;
  const sway = Math.sin(((tick / TEMPERATURE_CHIP.sway.periodTicks) + phase) * Math.PI * 2)
    * TEMPERATURE_CHIP.sway.amplitude;
  return Object.freeze({ bob, sway });
}

/**
 * Label revision v3 — shrink-to-fit for ONE painted card line, measured against the live 2D
 * context (`ctx.measureText`), never a per-glyph guess. The type first shrinks proportionally
 * (re-measured after every step, so non-linear metrics converge) down to `minPx`; if the
 * floored type still overflows, the TEXT ellipsizes until it fits. Painting the returned
 * pair therefore can never leave `maxWidth` — the card edge wins over the label, always.
 */
export function fitChipLine(context, { text, weight = 700, basePx, minPx = basePx, maxWidth } = {}) {
  if (!context?.measureText || !Number.isFinite(basePx) || !Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new TypeError('Fitting a chip line needs a 2D context, a base size and a positive max width.');
  }
  let fontPx = Math.max(1, Math.round(basePx));
  const floorPx = Math.max(1, Math.min(Math.round(minPx), fontPx));
  let value = String(text);
  const measure = () => {
    context.font = `${weight} ${fontPx}px system-ui, sans-serif`;
    return context.measureText(value).width;
  };
  let width = measure();
  for (let step = 0; width > maxWidth && fontPx > floorPx && step < 8; step += 1) {
    fontPx = Math.max(floorPx, Math.floor(fontPx * (maxWidth / width)));
    width = measure();
  }
  while (width > maxWidth && value.length > 2) {
    value = `${value.replace(/…$/, '').slice(0, -1).trimEnd()}…`;
    width = measure();
  }
  return Object.freeze({ text: value, fontPx, width });
}

function traceRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function createTemperatureChips({
  THREE,
  documentObject = globalThis.document,
  units = [],
  zoneLabels = new Map(),
  parent = null,
  // prefers-reduced-motion gate: when the OS asks for reduced motion the bob/sway freezes at
  // the rest pose. Detected once at build time; headless (no matchMedia) keeps motion on.
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
} = {}) {
  if (!THREE?.Sprite || !THREE.SpriteMaterial || !THREE.CanvasTexture || !documentObject?.createElement) {
    throw new TypeError('Temperature chips need Sprite, SpriteMaterial, CanvasTexture and a document.');
  }

  const group = new THREE.Group();
  group.name = 'temperature-chips';
  group.visible = false; // hidden until a camera position proves the exterior
  parent?.add?.(group);

  // Fixed-size mandate (2026-07-15): ONE card size for every unit, derived from the plan so
  // neighboring chips can never overlap. This is THE size — nothing rescales it afterwards.
  const valueWidth = resolveFixedChipWidth(units);
  const valueHeight = valueWidth * TEMPERATURE_CHIP.aspect;

  let redraws = 0;
  const chips = units.map((unit, index) => {
    const canvas = documentObject.createElement('canvas');
    canvas.width = TEMPERATURE_CHIP.canvas.width;
    canvas.height = TEMPERATURE_CHIP.canvas.height;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    if ('SRGBColorSpace' in THREE) texture.colorSpace = THREE.SRGBColorSpace;

    const badgeMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });
    const badge = new THREE.Sprite(badgeMaterial);
    badge.renderOrder = TEMPERATURE_CHIP.renderOrder.badge;

    badge.scale.set(valueWidth, valueHeight, 1);

    // The per-unit lift stagger de-aligns equal-height neighbors (fixed-size mandate).
    const anchor = [
      unit.position[0],
      unit.cabinetCentreY + unit.size[1] / 2 + TEMPERATURE_CHIP.anchorLift + resolveChipLiftOffset(index),
      unit.position[2],
    ];
    badge.position.set(anchor[0], anchor[1], anchor[2]);
    const chipMetadata = {
      assetId: 'shell-circulation-facade',
      pass: 'p6-l4',
      entityId: `temperature-chip-${unit.tc300Id}`,
      kind: 'temperature-chip',
      rtuId: unit.id,
      tc300Id: unit.tc300Id,
      zoneId: unit.zoneId,
    };
    // The single merged card carries the deep-link metadata: clicking it opens the unit's
    // cartelera page (main.js reads `userData.tc300Id` off the raycast hit).
    badge.userData = { ...chipMetadata, component: 'merged-card', anchor };
    group.add(badge);

    const zoneLabel = zoneLabels.get(unit.zoneId) ?? unit.zoneId;

    // Materials are referenced directly (never via `sprite.material`): the node test stub's
    // Sprite constructor does not mirror three's (material) signature, and the real behavior
    // needs nothing from the sprite-side accessor either.
    const state = {
      index, unit, badge, badgeMaterial,
      texture, context, canvas,
      zoneLabel, key: null, reading: null,
    };

    /**
     * The ONE merged card (label revision): rounded card, pointer arrow to the unit, the live
     * reading DOMINANT on top and the zone location as a secondary — but S2-legible — line
     * inside the same card. Long location labels shrink-to-fit, floored.
     */
    state.draw = (reading) => {
      const palette = TEMPERATURE_CHIP.colors.normal;
      const { layout } = TEMPERATURE_CHIP;
      const { width: W, height: H } = canvas;
      context.clearRect(0, 0, W, H);
      // Rounded card (flat fill — stub-safe, and the house look is flat anyway).
      const cardHeight = H * layout.cardHeightRatio;
      context.fillStyle = palette.card;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 24);
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = palette.border;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 24);
      context.stroke();
      // Inverted pointer arrow, aimed at the owning unit below.
      context.fillStyle = palette.pointer;
      context.beginPath();
      context.moveTo(W / 2 - 34, 8 + cardHeight - 2);
      context.lineTo(W / 2 + 34, 8 + cardHeight - 2);
      context.lineTo(W / 2, H - 10);
      context.closePath();
      context.fill();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      // v3: BOTH lines fit the card's inner text width by real measurement (fitChipLine):
      // shrink first, ellipsize at the readable floor — no glyph may cross the card edge.
      const innerWidth = W - 2 * layout.textInsetX;
      // Line 1 — the live reading, the PRIMARY read: dominant type, top position.
      const valueLine = fitChipLine(context, {
        text: formatChipTemperature(reading.temperature),
        weight: 800,
        basePx: Math.round(H * layout.valueFontRatio),
        minPx: Math.round(H * layout.valueMinFontRatio),
        maxWidth: innerWidth,
      });
      context.fillStyle = palette.main;
      context.font = `800 ${valueLine.fontPx}px system-ui, sans-serif`;
      context.fillText(valueLine.text, W / 2, 8 + cardHeight * layout.valueCentreRatio);
      // Line 2 — the zone LOCATION, secondary but clearly legible inside the same card. The
      // type hierarchy holds by construction: the name base can never reach the fitted value.
      const nameLine = fitChipLine(context, {
        text: zoneLabel.toUpperCase(),
        weight: 700,
        basePx: Math.min(Math.round(H * layout.nameFontRatio), valueLine.fontPx - 4),
        minPx: Math.round(H * layout.nameMinFontRatio),
        maxWidth: innerWidth,
      });
      context.fillStyle = palette.brand;
      context.font = `700 ${nameLine.fontPx}px system-ui, sans-serif`;
      context.fillText(nameLine.text, W / 2, 8 + cardHeight * layout.nameCentreRatio);
      texture.needsUpdate = true;
      redraws += 1;
    };

    return state;
  });

  const chipsById = new Map(chips.map((chip) => [chip.unit.tc300Id, chip]));

  /**
   * Push the model-derived readings. The merged canvas redraws ONLY when its 0.1 °C reading
   * changed — never per frame. The location line rides the same repaint.
   */
  function setReadings(readings = {}) {
    for (const chip of chips) {
      const reading = readings[chip.unit.tc300Id];
      if (!reading || !Number.isFinite(reading.temperature)) continue;
      const key = formatChipTemperature(reading.temperature);
      if (key === chip.key) continue;
      chip.key = key;
      chip.reading = { temperature: reading.temperature };
      chip.draw(chip.reading);
    }
  }

  /** Deterministic tick pose: bob + sway. Zero canvas work. Reduced motion pins the rest pose
   *  (tick 0-equivalent stillness); readings keep repainting through setReadings unaffected. */
  const REST_POSE = Object.freeze({ bob: 0, sway: 0 });
  function setTick(tick = 0) {
    for (const chip of chips) {
      const pose = reducedMotion ? REST_POSE : resolveChipPose(tick, chip.index);
      const anchor = chip.badge.userData.anchor;
      chip.badge.position.set(anchor[0], anchor[1] + pose.bob, anchor[2]);
      chip.badgeMaterial.rotation = pose.sway;
    }
  }

  /**
   * Item 16: the whole chip field exists only for a camera OUTSIDE the envelope. Exterior
   * visibility is this function's ONLY duty — the fixed-size mandate (2026-07-15) retired the
   * per-distance S2 scaling that used to ride here; camera range never resizes a chip.
   */
  function setCameraPosition(envelope, position) {
    if (!position) return group.visible;
    group.visible = isCameraOutside(envelope, position);
    return group.visible;
  }

  function getStats() {
    return Object.freeze({ chips: chips.length, redraws });
  }

  function dispose() {
    group.parent?.remove(group);
    for (const chip of chips) {
      chip.texture.dispose?.();
      chip.badgeMaterial.dispose?.();
    }
  }

  return Object.freeze({
    group,
    chips,
    chipsById,
    setReadings,
    setTick,
    setCameraPosition,
    getStats,
    dispose,
  });
}
