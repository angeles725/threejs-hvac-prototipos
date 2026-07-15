import { resolveHaloPulse } from './interaction.js';

/**
 * L4 items 15/16 — live temperature chips over the packaged rooftop units (Safran pattern).
 *
 * Adapted INLINE from the design3d library row `markers-ui/sims-floating-banner.mjs`
 * (source: cuarto-frio-safran · cuarto-3d.html:32109-32189, client-validated look): rounded
 * canvas badge + inverted pointer arrow on a camera-facing Sprite, additive pulsing halo Sprite
 * behind it, vertical bob + subtle sway. This page is a single-importmap app, so the factory is
 * re-expressed here with the house conventions instead of importing the library module:
 *   - THREE is injected (never module-imported) and the 2D context is used stub-safely
 *     (flat fills, no gradients), so the node test harness drives the real draw path.
 *   - ALL animation derives from the deterministic TICK clock (resolveChipPose /
 *     resolveHaloPulse) — capture frames t0/t30 are reproducible; no Date.now, no own rAF.
 *   - `toneMapped:false` on both sprite materials (mandatory under the house ACES rig) and the
 *     library's renderOrder pair 998/999 with depthWrite:false.
 *   - The badge canvas is drawn once per READING CHANGE (temperature at 0.1 °C resolution or
 *     alarm state), never per frame — the library's own perf lesson (cuarto-3d.html:32033).
 *
 * The data is the ONE existing source of truth: the interaction model's telemetry/deviceStatus —
 * the same derivation the alarm list reads — so a hot state recolors its chip automatically.
 */
export const TEMPERATURE_CHIP = Object.freeze({
  width: 3.4,
  aspect: 0.5, // badge height / width (512x256 canvas)
  canvas: Object.freeze({ width: 512, height: 256 }),
  haloCanvas: Object.freeze({ width: 128, height: 64 }),
  // The chip floats above its unit's cabinet top; the pointer aims back down at it.
  anchorLift: 1.2,
  // The live telemetry wobbles ~0.1 °C per tick; sampling the readings on this deterministic
  // cadence keeps the canvases from repainting every tick (a thermostat display reports slowly)
  // while t0/t30 captures stay exact (both are sample-aligned).
  readingIntervalTicks: 10,
  bob: Object.freeze({ amplitude: 0.12, periodTicks: 40 }),
  sway: Object.freeze({ amplitude: 0.05, periodTicks: 66 }),
  renderOrder: Object.freeze({ halo: 998, badge: 999 }),
  colors: Object.freeze({
    normal: Object.freeze({
      card: '#f8fafc',
      border: '#38bdf8',
      pointer: '#2563eb',
      brand: '#1e3a5f',
      main: '#0b1620',
      halo: 'rgba(96, 182, 255, 0.9)',
    }),
    alarm: Object.freeze({
      card: '#dc2626',
      border: '#fecaca',
      pointer: '#991b1b',
      brand: '#fee2e2',
      main: '#ffffff',
      halo: 'rgba(255, 77, 77, 0.9)',
    }),
  }),
});

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
} = {}) {
  if (!THREE?.Sprite || !THREE.SpriteMaterial || !THREE.CanvasTexture || !documentObject?.createElement) {
    throw new TypeError('Temperature chips need Sprite, SpriteMaterial, CanvasTexture and a document.');
  }

  const group = new THREE.Group();
  group.name = 'temperature-chips';
  group.visible = false; // hidden until a camera position proves the exterior
  parent?.add?.(group);

  // One shared halo texture for every chip (the tint rides the material color, not the canvas).
  const haloCanvas = documentObject.createElement('canvas');
  haloCanvas.width = TEMPERATURE_CHIP.haloCanvas.width;
  haloCanvas.height = TEMPERATURE_CHIP.haloCanvas.height;
  const haloContext = haloCanvas.getContext('2d');
  haloContext.fillStyle = 'rgba(255, 255, 255, 1)';
  haloContext.shadowColor = 'rgba(255, 255, 255, 1)';
  haloContext.shadowBlur = 24;
  traceRoundedRect(haloContext, 24, 14, haloCanvas.width - 48, haloCanvas.height - 28, 14);
  haloContext.fill();
  haloContext.fill();
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  if ('SRGBColorSpace' in THREE) haloTexture.colorSpace = THREE.SRGBColorSpace;

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

    const haloMaterial = new THREE.SpriteMaterial({
      map: haloTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      opacity: 0.55,
      toneMapped: false,
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.renderOrder = TEMPERATURE_CHIP.renderOrder.halo;
    halo.visible = false; // ONLY an alarm chip pulses a halo

    const width = TEMPERATURE_CHIP.width;
    const height = width * TEMPERATURE_CHIP.aspect;
    badge.scale.set(width, height, 1);
    halo.scale.set(width * 1.3, height * 1.6, 1);

    const anchor = [
      unit.position[0],
      unit.cabinetCentreY + unit.size[1] / 2 + TEMPERATURE_CHIP.anchorLift,
      unit.position[2],
    ];
    badge.position.set(anchor[0], anchor[1], anchor[2]);
    halo.position.set(anchor[0], anchor[1], anchor[2]);
    const chipMetadata = {
      assetId: 'shell-circulation-facade',
      pass: 'p6-l4',
      entityId: `temperature-chip-${unit.tc300Id}`,
      kind: 'temperature-chip',
      rtuId: unit.id,
      tc300Id: unit.tc300Id,
      zoneId: unit.zoneId,
    };
    badge.userData = { ...chipMetadata, component: 'badge', anchor };
    halo.userData = { ...chipMetadata, component: 'halo', anchor };
    group.add(halo);
    group.add(badge);

    const zoneLabel = zoneLabels.get(unit.zoneId) ?? unit.zoneId;

    // Materials are referenced directly (never via `sprite.material`): the node test stub's
    // Sprite constructor does not mirror three's (material) signature, and the real behavior
    // needs nothing from the sprite-side accessor either.
    const state = {
      index, unit, badge, halo, badgeMaterial, haloMaterial,
      texture, context, canvas, zoneLabel, key: null, reading: null,
    };

    state.draw = (reading) => {
      const palette = reading.alarm ? TEMPERATURE_CHIP.colors.alarm : TEMPERATURE_CHIP.colors.normal;
      const { width: W, height: H } = canvas;
      context.clearRect(0, 0, W, H);
      // Rounded card (flat fill — stub-safe, and the house look is flat anyway).
      const cardHeight = H * 0.62;
      context.fillStyle = palette.card;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 22);
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = palette.border;
      traceRoundedRect(context, 10, 8, W - 20, cardHeight, 22);
      context.stroke();
      // Inverted pointer arrow, aimed at the owning unit below.
      context.fillStyle = palette.pointer;
      context.beginPath();
      context.moveTo(W / 2 - 34, 8 + cardHeight - 2);
      context.lineTo(W / 2 + 34, 8 + cardHeight - 2);
      context.lineTo(W / 2, H - 10);
      context.closePath();
      context.fill();
      // Brand line: the owning zone, in the UI's own es-MX vocabulary.
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = palette.brand;
      context.font = `700 ${Math.round(H * 0.14)}px system-ui, sans-serif`;
      context.fillText(zoneLabel.toUpperCase(), W / 2, 8 + cardHeight * 0.28);
      // Main line: the live reading.
      context.fillStyle = palette.main;
      context.font = `800 ${Math.round(H * 0.26)}px system-ui, sans-serif`;
      context.fillText(formatChipTemperature(reading.temperature), W / 2, 8 + cardHeight * 0.68);
      texture.needsUpdate = true;
      redraws += 1;
    };

    return state;
  });

  const chipsById = new Map(chips.map((chip) => [chip.unit.tc300Id, chip]));

  /**
   * Push the model-derived readings. A chip redraws its canvas ONLY when its 0.1 °C reading or
   * its alarm state changed — never per frame.
   */
  function setReadings(readings = {}) {
    for (const chip of chips) {
      const reading = readings[chip.unit.tc300Id];
      if (!reading || !Number.isFinite(reading.temperature)) continue;
      const alarm = reading.alarm === true;
      const key = `${formatChipTemperature(reading.temperature)}|${alarm}`;
      if (key === chip.key) continue;
      chip.key = key;
      chip.reading = { temperature: reading.temperature, alarm };
      chip.draw(chip.reading);
      chip.halo.visible = alarm;
    }
  }

  /** Deterministic tick pose: bob + sway + alarm-halo pulse. Zero canvas work. */
  function setTick(tick = 0) {
    const pulse = resolveHaloPulse(tick);
    for (const chip of chips) {
      const pose = resolveChipPose(tick, chip.index);
      const y = chip.badge.userData.anchor[1] + pose.bob;
      chip.badge.position.set(chip.badge.userData.anchor[0], y, chip.badge.userData.anchor[2]);
      chip.halo.position.set(chip.badge.userData.anchor[0], y, chip.badge.userData.anchor[2]);
      chip.badgeMaterial.rotation = pose.sway;
      chip.haloMaterial.rotation = pose.sway;
      if (chip.halo.visible) chip.haloMaterial.opacity = pulse.opacity;
    }
  }

  /** Item 16: the whole chip field exists only for a camera OUTSIDE the envelope. */
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
      chip.haloMaterial.dispose?.();
    }
    haloTexture.dispose?.();
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
