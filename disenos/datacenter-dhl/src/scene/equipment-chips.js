/**
 * P1-3 / P1-4 — per-equipment value chips + the DHL brand banner for the datacenter room.
 *
 * Ported from: disenos/cinemex-hvac-lorawan/src/scene/temperature-chips.js (Safran chip
 * pattern, client-validated look), adapted for this room:
 *   - THREE is injected (never module-imported) and the 2D context is used stub-safely
 *     (flat fills, measureText-driven fitting), so the node test harness drives the real
 *     draw path with the cinemex Proxy-context stub;
 *   - the chip is a TWO-LINE card per equipment unit: the primary value dominant on top and
 *     a secondary line underneath, with a kind-colored accent inside the B43 status hues
 *     (normal = per-kind accent; warn/alarm override with the B43 warn/alarm pair);
 *   - the badge canvas redraws only when its reading key changes, never per frame;
 *   - all motion derives from the injected tick (setTick) and freezes at the rest pose under
 *     prefers-reduced-motion — no Date.now, no own rAF;
 *   - this room is an interior scene: the cinemex exterior-envelope gate does not apply.
 *     Visibility is owned by the page's chips toggle (#bPills).
 *
 * The cinemex fixed-size lesson carries over: ONE fixed world size for every chip, plus a
 * deterministic per-index lift cascade so the 0.6 m-pitch hero racks never stack their chips
 * on one line. Camera distance never resizes a chip.
 */

export const EQUIPMENT_CHIP = Object.freeze({
  width: 1.35, // world metres — under the v1 pill width, sized for the 0.6 m rack pitch
  aspect: 0.5, // card height / width (512x256 canvas)
  canvas: Object.freeze({ width: 512, height: 256 }),
  layout: Object.freeze({
    cardHeightRatio: 0.78,
    primaryFontRatio: 0.34,
    primaryMinFontRatio: 0.24,
    primaryCentreRatio: 0.34,
    secondaryFontRatio: 0.21,
    secondaryMinFontRatio: 0.14,
    secondaryCentreRatio: 0.74,
    textInsetX: 34,
  }),
  anchorLift: 0.35,
  // Deterministic three-step lift cascade: adjacent same-row units (hero racks are 0.6 m
  // apart) land on different lines by construction. Index-driven, no RNG, no collisions.
  liftStepWorld: 0.55,
  liftSteps: 3,
  bob: Object.freeze({ amplitude: 0.05, periodTicks: 48 }),
  sway: Object.freeze({ amplitude: 0.03, periodTicks: 72 }),
  renderOrder: Object.freeze({ badge: 999 }),
});

/**
 * B43 hues (cinemex styles.css tokens). Normal chips carry a per-kind accent from the token
 * families; warn/alarm always override with the status pair so the room reads instantly.
 */
export const CHIP_COLORS = Object.freeze({
  card: '#f8fafc',
  main: '#0b1620',
  kinds: Object.freeze({
    rack: Object.freeze({ border: '#3b6ff5', pointer: '#2e5fe0', secondary: '#2a55c9' }),
    crac: Object.freeze({ border: '#2e5fe0', pointer: '#2a55c9', secondary: '#2a55c9' }),
    inrow: Object.freeze({ border: '#2a55c9', pointer: '#2a55c9', secondary: '#2a55c9' }),
    pdu: Object.freeze({ border: '#166a4a', pointer: '#166a4a', secondary: '#166a4a' }),
    ups: Object.freeze({ border: '#34c08b', pointer: '#166a4a', secondary: '#166a4a' }),
    dry: Object.freeze({ border: '#5c6b84', pointer: '#5c6b84', secondary: '#5c6b84' }),
  }),
  status: Object.freeze({
    warn: Object.freeze({ border: '#f5a623', pointer: '#8a5a00', secondary: '#8a5a00' }),
    alarm: Object.freeze({ border: '#e5484d', pointer: '#b3261e', secondary: '#b3261e' }),
  }),
});

/** Accent triple for one chip: status hues win, otherwise the kind's B43 accent. */
export function resolveChipAccent(kind, status = 'normal') {
  if (status === 'warn' || status === 'alarm') return CHIP_COLORS.status[status];
  return CHIP_COLORS.kinds[kind] ?? CHIP_COLORS.kinds.rack;
}

/** Deterministic lift cascade: 0, 1, 2, 0, 1, 2 … chip lines, in world metres. */
export function resolveChipLift(index = 0, {
  liftStepWorld,
  liftSteps,
} = EQUIPMENT_CHIP) {
  return (index % liftSteps) * liftStepWorld;
}

/** Deterministic bob/sway for one chip at one tick (per-chip phase keeps the field alive). */
export function resolveChipPose(tick = 0, index = 0, spec = EQUIPMENT_CHIP) {
  const phase = index / 14;
  const bob = Math.sin(((tick / spec.bob.periodTicks) + phase) * Math.PI * 2)
    * spec.bob.amplitude;
  const sway = Math.sin(((tick / spec.sway.periodTicks) + phase) * Math.PI * 2)
    * spec.sway.amplitude;
  return Object.freeze({ bob, sway });
}

/**
 * Shrink-to-fit for one painted line, measured against the live 2D context — the cinemex v3
 * lesson verbatim: proportional shrink to the floor, then ellipsis; the card edge always wins.
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

export function createEquipmentChips({
  THREE,
  documentObject = globalThis.document,
  units = [],
  parent = null,
  // prefers-reduced-motion gate: the bob/sway freezes at the rest pose. Detected once at
  // build time; headless (no matchMedia) keeps motion on.
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
} = {}) {
  if (!THREE?.Sprite || !THREE.SpriteMaterial || !THREE.CanvasTexture || !documentObject?.createElement) {
    throw new TypeError('Equipment chips need Sprite, SpriteMaterial, CanvasTexture and a document.');
  }

  const group = new THREE.Group();
  group.name = 'equipment-chips';
  parent?.add?.(group);

  const chipWidth = EQUIPMENT_CHIP.width;
  const chipHeight = chipWidth * EQUIPMENT_CHIP.aspect;

  let redraws = 0;
  const chips = units.map((unit, index) => {
    const canvas = documentObject.createElement('canvas');
    canvas.width = EQUIPMENT_CHIP.canvas.width;
    canvas.height = EQUIPMENT_CHIP.canvas.height;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    if ('SRGBColorSpace' in THREE) texture.colorSpace = THREE.SRGBColorSpace;

    // toneMapped:false is mandatory under the ACES rig; materials are referenced directly
    // (never via sprite.material) so the node Sprite stub needs no accessor mirroring.
    const badgeMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });
    const badge = new THREE.Sprite(badgeMaterial);
    badge.renderOrder = EQUIPMENT_CHIP.renderOrder.badge;
    badge.scale.set(chipWidth, chipHeight, 1);

    const anchor = [
      unit.anchor[0],
      unit.anchor[1] + EQUIPMENT_CHIP.anchorLift + chipHeight / 2 + resolveChipLift(index),
      unit.anchor[2],
    ];
    badge.position.set(anchor[0], anchor[1], anchor[2]);
    badge.userData = {
      kind: 'equipment-chip',
      equipmentId: unit.id,
      equipmentKind: unit.kind,
      anchor,
    };
    group.add(badge);

    const state = {
      index, unit, badge, badgeMaterial, texture, context, canvas, key: null,
    };

    /** The two-line card: primary value dominant, secondary line under it, pointer below. */
    state.draw = (reading) => {
      const accent = resolveChipAccent(unit.kind, reading.status);
      const { layout } = EQUIPMENT_CHIP;
      const { width: W, height: H } = canvas;
      context.clearRect(0, 0, W, H);
      const cardHeight = H * layout.cardHeightRatio;
      context.fillStyle = CHIP_COLORS.card;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 22);
      context.fill();
      context.lineWidth = 6;
      context.strokeStyle = accent.border;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 22);
      context.stroke();
      // Inverted pointer arrow, aimed at the owning equipment below.
      context.fillStyle = accent.pointer;
      context.beginPath();
      context.moveTo(W / 2 - 30, 8 + cardHeight - 2);
      context.lineTo(W / 2 + 30, 8 + cardHeight - 2);
      context.lineTo(W / 2, H - 8);
      context.closePath();
      context.fill();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const innerWidth = W - 2 * layout.textInsetX;
      const primaryLine = fitChipLine(context, {
        text: reading.primary,
        weight: 800,
        basePx: Math.round(H * layout.primaryFontRatio),
        minPx: Math.round(H * layout.primaryMinFontRatio),
        maxWidth: innerWidth,
      });
      context.fillStyle = CHIP_COLORS.main;
      context.font = `800 ${primaryLine.fontPx}px system-ui, sans-serif`;
      context.fillText(primaryLine.text, W / 2, 8 + cardHeight * layout.primaryCentreRatio);
      const secondaryLine = fitChipLine(context, {
        text: String(reading.secondary).toUpperCase(),
        weight: 700,
        basePx: Math.min(Math.round(H * layout.secondaryFontRatio), primaryLine.fontPx - 4),
        minPx: Math.round(H * layout.secondaryMinFontRatio),
        maxWidth: innerWidth,
      });
      context.fillStyle = accent.secondary;
      context.font = `700 ${secondaryLine.fontPx}px system-ui, sans-serif`;
      context.fillText(secondaryLine.text, W / 2, 8 + cardHeight * layout.secondaryCentreRatio);
      texture.needsUpdate = true;
      redraws += 1;
    };

    return state;
  });

  const chipsById = new Map(chips.map((chip) => [chip.unit.id, chip]));

  /** Push sim readings ({ id → { primary, secondary, status } }); repaint on change only. */
  function setReadings(readings = {}) {
    for (const chip of chips) {
      const reading = readings[chip.unit.id];
      if (!reading || !reading.primary) continue;
      const key = `${reading.primary}|${reading.secondary}|${reading.status}`;
      if (key === chip.key) continue;
      chip.key = key;
      chip.draw(reading);
    }
  }

  /** Deterministic tick pose: bob + sway; reduced motion pins the rest pose. */
  const REST_POSE = Object.freeze({ bob: 0, sway: 0 });
  function setTick(tick = 0) {
    for (const chip of chips) {
      const pose = reducedMotion ? REST_POSE : resolveChipPose(tick, chip.index);
      const anchor = chip.badge.userData.anchor;
      chip.badge.position.set(anchor[0], anchor[1] + pose.bob, anchor[2]);
      chip.badgeMaterial.rotation = pose.sway;
    }
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

  return Object.freeze({ group, chips, chipsById, setReadings, setTick, getStats, dispose });
}

// ---------------------------------------------------------------------------------------------
// P1-4 — DHL floating banner: brand chrome over the room. B43 governs the page UI; the banner
// carries the client's colors by explicit user instruction. Canvas-drawn bold italic
// letterforms only — deliberately NOT the trademark logo path; the brand read comes from the
// yellow ground + red weight. Always visible (project banner, not telemetry).
// ---------------------------------------------------------------------------------------------

export const DHL_BANNER = Object.freeze({
  width: 4.6, // world metres
  aspect: 0.375, // 1024x384 canvas
  canvas: Object.freeze({ width: 1024, height: 384 }),
  colors: Object.freeze({
    ground: '#FFCC00', // DHL yellow (user-supplied reference)
    edge: '#e0b000',
    mark: '#d40511', // DHL red
  }),
  wordmark: 'DHL',
  subtitle: 'Centro de datos',
  bob: Object.freeze({ amplitude: 0.07, periodTicks: 120 }),
  renderOrder: 998,
});

export function createDhlBanner({
  THREE,
  documentObject = globalThis.document,
  parent = null,
  position = [0, 5, 0],
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
} = {}) {
  if (!THREE?.Sprite || !THREE.SpriteMaterial || !THREE.CanvasTexture || !documentObject?.createElement) {
    throw new TypeError('The DHL banner needs Sprite, SpriteMaterial, CanvasTexture and a document.');
  }

  const canvas = documentObject.createElement('canvas');
  canvas.width = DHL_BANNER.canvas.width;
  canvas.height = DHL_BANNER.canvas.height;
  const context = canvas.getContext('2d');
  const { width: W, height: H } = canvas;

  // Rounded yellow card with a slightly darker edge (flat fills, stub-safe).
  context.clearRect(0, 0, W, H);
  context.fillStyle = DHL_BANNER.colors.ground;
  traceRoundedRect(context, 8, 8, W - 16, H - 16, 40);
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = DHL_BANNER.colors.edge;
  traceRoundedRect(context, 8, 8, W - 16, H - 16, 40);
  context.stroke();
  // Bold italic wordmark: the weight + slant carry the brand read, not a logo reproduction.
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = DHL_BANNER.colors.mark;
  context.font = 'italic 900 190px system-ui, sans-serif';
  context.fillText(DHL_BANNER.wordmark, W / 2, H * 0.38);
  context.font = '700 58px system-ui, sans-serif';
  context.fillText(DHL_BANNER.subtitle, W / 2, H * 0.78);

  const texture = new THREE.CanvasTexture(canvas);
  if ('SRGBColorSpace' in THREE) texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = DHL_BANNER.renderOrder;
  sprite.scale.set(DHL_BANNER.width, DHL_BANNER.width * DHL_BANNER.aspect, 1);
  sprite.position.set(position[0], position[1], position[2]);
  sprite.userData = { kind: 'dhl-banner', anchor: [...position] };
  parent?.add?.(sprite);

  /** Deterministic gentle bob; reduced motion pins the anchor height. */
  function setTick(tick = 0) {
    const bob = reducedMotion
      ? 0
      : Math.sin((tick / DHL_BANNER.bob.periodTicks) * Math.PI * 2) * DHL_BANNER.bob.amplitude;
    sprite.position.set(position[0], position[1] + bob, position[2]);
  }

  function dispose() {
    sprite.parent?.remove(sprite);
    texture.dispose?.();
    material.dispose?.();
  }

  return Object.freeze({ sprite, setTick, dispose });
}
