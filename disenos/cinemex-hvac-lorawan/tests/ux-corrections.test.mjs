/**
 * User-requested correction round (post-ship), items A–H:
 *   A  (REVISED by the label-revision round) ONE merged card per packaged unit: the live
 *      temperature is the dominant top line and the zone location is a secondary — but still
 *      S2-legible — line INSIDE THE SAME CARD. The earlier two-sprite split is retired.
 *   B  the information panel dies; alarms + selection survive as canvas overlays,
 *   C  unmistakable 3D ↔ cartelera affordances,
 *   D  deterministic chart hover (crosshair + time/value tooltip),
 *   E  the unit view embeds the real viewer via an `embed=1` mode,
 *   F  the delivery-chain panel leaves the render surface (model derivation stays),
 *   G  ducts/drains read as metal, not near-black threads (deferred S1),
 *   H  fleet slots declare state and deviation vs consigna.
 * RED-first for every new pure behavior; source-level guards where the surface is DOM wiring.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { EMBED_UNIT_VIEW, resolveUnitClosePreset } from '../src/controllers/camera.js';
import { DEFAULT_QUERY_STATE, parseQueryState, serializeQueryState } from '../src/controllers/query-state.js';
import { DRAIN_PIPE_COLOR, createArchitecturePlan } from '../src/scene/architecture.js';
import { MATERIAL_SPECS } from '../src/scene/materials.js';
import { APP_CONFIG } from '../src/config.mjs';
import {
  TEMPERATURE_CHIP,
  createChipEnvelope,
  createTemperatureChips,
  fitChipLine,
  resolveChipLiftOffset,
  resolveFixedChipWidth,
} from '../src/scene/temperature-chips.js';
import {
  buildEmbedUrl,
  buildViewerUrl,
  createDashboardModel,
} from '../src/dashboard/model.mjs';
import { createUnitSeries } from '../src/dashboard/series.mjs';
import {
  chartHoverModel,
  nearestSampleIndex,
  sampleTimeLabel,
} from '../src/dashboard/hover.mjs';
import {
  CHART_SCALE,
  deviationTagFor,
  slotHtml,
  unitViewHtml,
} from '../src/dashboard/render.mjs';

// ---------------------------------------------------------------------------
// Rich sprite stubs: position AND scale record their values, so the stacking
// geometry of the split chip is assertable (the p6-l4 stub ignored scale).
// ---------------------------------------------------------------------------

class RecordingVector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }

  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

class RecordingGroup {
  constructor() {
    this.children = [];
    this.visible = true;
    this.userData = {};
    this.name = '';
  }

  add(child) { this.children.push(child); child.parent = this; }

  remove(child) { this.children = this.children.filter((entry) => entry !== child); }
}

class RecordingSprite {
  constructor(material) {
    this.material = material;
    this.position = new RecordingVector3();
    this.scale = new RecordingVector3(1, 1, 1);
    this.renderOrder = 0;
    this.visible = true;
    this.userData = {};
  }
}

class RecordingSpriteMaterial {
  constructor(parameters = {}) { Object.assign(this, parameters); this.rotation = 0; }

  dispose() {}
}

class RecordingCanvasTexture {
  constructor(canvas) { this.canvas = canvas; this.needsUpdate = false; }

  dispose() {}
}

function createRecordingContext() {
  // Every fillText records the FONT SIZE it was painted with, so the merged card's type
  // hierarchy (temperature dominant, location secondary) is assertable from the draw calls.
  const record = { fonts: [], texts: [] };
  let currentPx = 0;
  return {
    record,
    set font(value) {
      this.currentFont = value;
      const size = /(\d+(?:\.\d+)?)px/.exec(String(value));
      currentPx = size ? Number(size[1]) : 0;
      if (size) record.fonts.push(currentPx);
    },
    get font() { return this.currentFont; },
    measureText: (text) => ({ width: String(text).length * 12 }),
    fillText(text) { record.texts.push({ text: String(text), fontPx: currentPx }); },
    clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    arcTo() {}, closePath() {}, fill() {}, stroke() {},
  };
}

function createChipHarness({ zoneLabels } = {}) {
  const contexts = [];
  const documentObject = {
    createElement: (tag) => {
      if (tag !== 'canvas') return null;
      const context = createRecordingContext();
      contexts.push(context);
      return { width: 0, height: 0, getContext: () => context };
    },
  };
  const THREE = {
    Group: RecordingGroup,
    Sprite: RecordingSprite,
    SpriteMaterial: RecordingSpriteMaterial,
    CanvasTexture: RecordingCanvasTexture,
    AdditiveBlending: 'additive',
    SRGBColorSpace: 'srgb',
  };
  const units = [
    { id: 'rtu-TC300-01', tc300Id: 'TC300-01', zoneId: 'sala-1', position: [0, 0, 0], cabinetCentreY: 9.5, size: [3.04, 1.5, 1.6] },
    { id: 'rtu-TC300-05', tc300Id: 'TC300-05', zoneId: 'kitchen', position: [8, 0, -4], cabinetCentreY: 9.5, size: [3.04, 1.5, 1.6] },
  ];
  const chips = createTemperatureChips({
    THREE,
    documentObject,
    units,
    zoneLabels: zoneLabels ?? new Map([['sala-1', 'Sala 1'], ['kitchen', 'Cocina']]),
  });
  return { chips, contexts, units };
}

// ---------------------------------------------------------------------------
// A (label revision) — ONE merged card per unit: dominant temperature + legible location.
// ---------------------------------------------------------------------------

test('A: one merged card per unit paints BOTH reads, temperature dominant, still deep-linkable', () => {
  const { chips, units } = createChipHarness();
  chips.setReadings({
    'TC300-01': { temperature: 22.4 },
    'TC300-05': { temperature: 23.1 },
  });
  // Client simplification (2026-07-15): the alarm halo sprite is gone — ONE merged card per unit.
  assert.equal(chips.group.children.length, units.length, 'ONE merged card per unit, no halo');

  const chip = chips.chips[0];
  assert.ok(chip.badge, 'the merged card sprite exists');
  assert.equal(chip.nameSprite, undefined, 'the split-era name sprite is retired');
  assert.equal(chip.halo, undefined, 'the alarm halo is retired with the fault machinery');

  // Raycast deep-link contract: the single card carries the unit id.
  assert.equal(chip.badge.userData.tc300Id, 'TC300-01');

  // ONE canvas, two lines: the reading AND the location live inside the same card.
  const painted = chip.context.record.texts;
  const valueLine = painted.find(({ text }) => text === '22.4 °C');
  const nameLine = painted.find(({ text }) => text === 'SALA 1');
  assert.ok(valueLine, 'the merged card paints the live reading');
  assert.ok(nameLine, 'the merged card paints the zone location INSIDE the same card');
  assert.ok(
    valueLine.fontPx > nameLine.fontPx,
    `temperature must be the dominant line (${valueLine?.fontPx}px vs ${nameLine?.fontPx}px)`,
  );
});

// ---------------------------------------------------------------------------
// A (user mandate 2026-07-15, supersedes deferred-correction S2): the unit value
// cards keep ONE FIXED world size, chosen from the plan so neighboring chips can
// never overlap. The distance-scale legibility floor is RETIRED.
// ---------------------------------------------------------------------------

test('A (mandate 2026-07-15): the fixed chip width derives from the plan and clears every neighbor', () => {
  const plan = createArchitecturePlan();
  const units = plan.structural.roofService.packagedUnits;
  // Independent derivation of the plan truth: minimum pairwise XZ distance between chip anchors.
  let minNeighborDistance = Infinity;
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const distance = Math.hypot(
        units[i].position[0] - units[j].position[0],
        units[i].position[2] - units[j].position[2],
      );
      minNeighborDistance = Math.min(minNeighborDistance, distance);
    }
  }
  assert.ok(Number.isFinite(minNeighborDistance) && minNeighborDistance > 0);

  const width = resolveFixedChipWidth(units);
  assert.ok(Number.isFinite(width) && width > 0, 'the resolver yields a usable world width');
  assert.ok(
    width <= minNeighborDistance * 0.9 + 1e-9,
    `${width.toFixed(3)} m must leave clearance at the tightest pair (${minNeighborDistance.toFixed(3)} m)`,
  );
  assert.ok(width <= TEMPERATURE_CHIP.width + 1e-9, 'the fixed size never GROWS past the base card');

  // A clustered plan clamps the card below the tightest gap; a sparse one keeps the base size.
  const clustered = [
    { position: [0, 0, 0] },
    { position: [1, 0, 0] },
    { position: [9, 0, 0] },
  ];
  assert.ok(Math.abs(resolveFixedChipWidth(clustered) - 0.9) < 1e-9, '1 m gap → 0.9 m card');
  assert.equal(resolveFixedChipWidth([]), TEMPERATURE_CHIP.width, 'no pairs: the base width stands');
  assert.equal(resolveFixedChipWidth([units[0]]), TEMPERATURE_CHIP.width);

  // The factory sizes every card (and its halo footprint base) from the resolver, height by aspect.
  const { chips, units: harnessUnits } = createChipHarness();
  const expected = resolveFixedChipWidth(harnessUnits);
  for (const chip of chips.chips) {
    assert.equal(chip.badge.scale.x, expected);
    assert.equal(chip.badge.scale.y, expected * TEMPERATURE_CHIP.aspect);
  }
});

test('A (mandate 2026-07-15): chips carry NO distance scaling — camera range never resizes a card', async () => {
  const { chips, units } = createChipHarness();
  chips.setReadings({
    'TC300-01': { temperature: 22.4 },
    'TC300-05': { temperature: 23.1 },
  });
  const envelope = createChipEnvelope({ building: { width: 60, depth: 45 }, maxPlateTop: 9.02 });
  const scaleOf = (chip) => [chip.badge.scale.x, chip.badge.scale.y];

  // Two exterior cameras at wildly different ranges: the sprite scales are IDENTICAL.
  assert.equal(chips.setCameraPosition(envelope, [0, 40, 0]), true, 'near overhead camera is exterior');
  const nearScales = chips.chips.map(scaleOf);
  assert.equal(chips.setCameraPosition(envelope, [0, 4000, 0]), true, 'far overhead camera is exterior');
  const farScales = chips.chips.map(scaleOf);
  assert.deepEqual(farScales, nearScales, 'distance must never inflate a chip (S2 floor retired)');
  assert.equal(nearScales[0][0], resolveFixedChipWidth(units), 'and the one scale IS the fixed width');

  // setCameraPosition keeps ONLY its exterior-visibility duty.
  assert.equal(chips.setCameraPosition(envelope, [0, 4, 0]), false, 'an interior camera hides the field');
  assert.equal(chips.group.visible, false);

  // The retired S2 machinery is gone from the module surface, not merely unused.
  const surface = await import('../src/scene/temperature-chips.js');
  assert.equal(surface.resolveChipScale, undefined, 'resolveChipScale is retired by the user mandate');
  assert.equal(surface.CHIP_LEGIBILITY, undefined, 'CHIP_LEGIBILITY is retired by the user mandate');
  assert.equal(surface.resolveNameTypeWorldHeight, undefined, 'the S2 sizing authority went with it');
});

test('A (mandate 2026-07-15): equal-height neighbors de-align via a deterministic per-unit lift', () => {
  // Pure and deterministic: bounded stagger, adjacent indices never share a lift.
  for (let index = 0; index < 14; index += 1) {
    assert.equal(resolveChipLiftOffset(index), resolveChipLiftOffset(index), 'no randomness');
    assert.ok(Math.abs(resolveChipLiftOffset(index)) <= 0.15 + 1e-9, 'a subtle offset, not a jump');
    assert.notEqual(
      resolveChipLiftOffset(index),
      resolveChipLiftOffset(index + 1),
      `chips ${index} and ${index + 1} must not sit on one exact line`,
    );
  }
  // The factory bakes the lift into the anchor: same cabinet height, distinct chip heights.
  const { chips } = createChipHarness();
  const [first, second] = chips.chips;
  assert.equal(first.unit.cabinetCentreY, second.unit.cabinetCentreY, 'harness precondition');
  assert.notEqual(first.badge.userData.anchor[1], second.badge.userData.anchor[1]);
});

// ---------------------------------------------------------------------------
// A (label revision v3) — the merged card is a compact chip, and BOTH lines
// fit the card by real measurement (shrink first, ellipsize at the floor).
// ---------------------------------------------------------------------------

test('A v3+: the EFFECTIVE card size is the plan\'s no-overlap bound, never past it', () => {
  // Size history (all 2026-07-15, user-driven): v2 poster 3.4 → v3 chip 2.15 → bumps 2.7 →
  // 3.3 → "más grandes": the cap now sits ABOVE the plan bound on purpose, so the effective
  // size IS the bound — the largest fixed card that cannot touch its tightest neighbor.
  // The only remaining ceiling is the no-overlap bound resolveFixedChipWidth enforces.
  const plan = createArchitecturePlan();
  const units = plan.structural.roofService.packagedUnits;
  const effective = resolveFixedChipWidth(units);
  let minNeighbor = Infinity;
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const dx = units[i].position[0] - units[j].position[0];
      const dz = units[i].position[2] - units[j].position[2];
      minNeighbor = Math.min(minNeighbor, Math.hypot(dx, dz));
    }
  }
  assert.ok(
    effective <= minNeighbor * TEMPERATURE_CHIP.neighborClearance + 1e-9,
    `effective ${effective.toFixed(3)} must not exceed the no-overlap bound`,
  );
  assert.ok(
    TEMPERATURE_CHIP.width > effective,
    'the cap sits above the bound, so the bound (not the cap) is what ships',
  );

  // The builder applies the RESOLVED width (its two harness units sit far apart, so the
  // cap is what their resolver returns) — and height follows the aspect.
  const { chips, units: harnessUnits } = createChipHarness();
  chips.setReadings({ 'TC300-01': { temperature: 22.4, alarm: false } });
  const chip = chips.chips[0];
  const harnessWidth = resolveFixedChipWidth(harnessUnits);
  assert.equal(chip.badge.scale.x, harnessWidth);
  assert.equal(chip.badge.scale.y, harnessWidth * TEMPERATURE_CHIP.aspect);
});

test('A v3: fitChipLine measures with the live context and never returns an overflowing pair', () => {
  // A linear-metric context models the real canvas: width ∝ fontPx × glyph count.
  const linearContext = {
    font: '',
    measureText(text) {
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 0);
      return { width: String(text).length * px * 0.6 };
    },
  };
  // A fitting line keeps its base type untouched.
  const short = fitChipLine(linearContext, { text: '22.4 °C', weight: 800, basePx: 100, minPx: 80, maxWidth: 444 });
  assert.equal(short.fontPx, 100);
  assert.equal(short.text, '22.4 °C');
  // A moderately long line shrinks — above the floor, without losing a glyph.
  const shrunk = fitChipLine(linearContext, { text: 'PASILLO 12', weight: 700, basePx: 99, minPx: 58, maxWidth: 444 });
  assert.equal(shrunk.text, 'PASILLO 12', 'shrink suffices — no ellipsis above the floor');
  assert.ok(shrunk.fontPx >= 58 && shrunk.fontPx < 99, 'the type shrank below its base size');
  assert.ok(shrunk.width <= 444, 'the returned pair fits by construction');
  // A very long line hits the readable floor, then ellipsizes instead of overflowing.
  const floored = fitChipLine(linearContext, { text: 'OFICINA ADMINISTRATIVA', weight: 700, basePx: 99, minPx: 58, maxWidth: 444 });
  assert.equal(floored.fontPx, 58, 'the floor is a floor, never smaller');
  assert.ok(floored.text.endsWith('…'), 'past the floor the text gives way, not the card');
  assert.ok(floored.width <= 444);
  // The constant-metric stub (the node harness shape) forces the same ellipsis path.
  const stubContext = { font: '', measureText: (text) => ({ width: String(text).length * 12 }) };
  const forced = fitChipLine(stubContext, { text: 'X'.repeat(60), basePx: 99, minPx: 58, maxWidth: 444 });
  assert.equal(forced.fontPx, 58);
  assert.ok(forced.text.endsWith('…'));
  assert.ok(forced.text.length * 12 <= 444, 'the stub metric honors the same invariant');
});

test('A v3: every painted line fits the inner card width — the longest zone label included', () => {
  // The harness stub measures length×12 regardless of font, so a proportional shrink alone
  // can never satisfy it: any label longer than innerWidth/12 glyphs MUST take the ellipsis
  // path. The assertions are the paint INVARIANT (painted width ≤ inner width under the
  // stub's own metric, and the font hierarchy) — never pixel literals.
  const innerWidth = TEMPERATURE_CHIP.canvas.width - 2 * TEMPERATURE_CHIP.layout.textInsetX;
  const stubWidth = (text) => String(text).length * 12;
  assert.ok(Number.isFinite(innerWidth) && innerWidth > 0, 'the layout declares its inner text width');

  // The longest REAL zone label, derived from the one es-MX vocabulary.
  const longestZone = APP_CONFIG.zones
    .map((zone) => zone.label)
    .sort((a, b) => b.length - a.length)[0];
  const overlong = 'Corredor de acceso a salas y dulcería nivel dos'; // longer than innerWidth/12 glyphs
  assert.ok(stubWidth(overlong.toUpperCase()) > innerWidth, 'the synthetic label must overflow the stub metric');

  const { chips } = createChipHarness({
    zoneLabels: new Map([['sala-1', overlong], ['kitchen', longestZone]]),
  });
  chips.setReadings({
    'TC300-01': { temperature: 22.4, alarm: false },
    'TC300-05': { temperature: 23.1, alarm: false },
  });

  // The overlong label ellipsizes at the floor instead of spilling past the card edge.
  const painted = chips.chips[0].context.record.texts;
  const nameLine = painted.find(({ text }) => text.endsWith('…'));
  assert.ok(nameLine, 'an overlong location must ellipsize once the type floor is reached');
  assert.ok(nameLine.text.startsWith('CORREDOR'), 'the head of the name survives');
  assert.ok(stubWidth(nameLine.text) <= innerWidth, 'no glyph may paint outside the rounded card');
  const valueLine = painted.find(({ text }) => text === '22.4 °C');
  assert.ok(valueLine, 'the reading still paints');
  assert.ok(valueLine.fontPx > nameLine.fontPx, 'temperature stays the dominant line after fitting');
  const nameFloorPx = Math.round(TEMPERATURE_CHIP.canvas.height * TEMPERATURE_CHIP.layout.nameMinFontRatio);
  assert.ok(nameLine.fontPx >= nameFloorPx, 'the location line never shrinks below its readable floor');

  // EVERY line of EVERY card honors the invariant — the longest real label included.
  for (const chip of chips.chips) {
    for (const { text, fontPx } of chip.context.record.texts) {
      assert.ok(stubWidth(text) <= innerWidth, `"${text}" (${fontPx}px) fits the inner card width`);
    }
  }
});

test('A: redraw-only-on-reading-change and position-only ticks survive the merge', () => {
  const { chips } = createChipHarness();
  const readings = {
    'TC300-01': { temperature: 22.4 },
    'TC300-05': { temperature: 23.1 },
  };
  chips.setReadings(readings);
  const painted = chips.getStats().redraws;

  // Same reading: zero canvas work.
  chips.setReadings(readings);
  assert.equal(chips.getStats().redraws, painted);

  // A tick is position-only: the card moves, nothing repaints.
  const chip = chips.chips[0];
  const yBefore = chip.badge.position.y;
  chips.setTick(17);
  assert.equal(chips.getStats().redraws, painted, 'a tick must never repaint a canvas');
  assert.notEqual(chip.badge.position.y, yBefore, 'a tick moves the card (bob)');

  // A 0.1 °C change repaints exactly ONE merged canvas — and both lines ride the repaint.
  const paintedTexts = chip.context.record.texts.length;
  chips.setReadings({ 'TC300-01': { temperature: 22.5 } });
  assert.equal(chips.getStats().redraws, painted + 1, 'one merged-card repaint');
  const repaint = chip.context.record.texts.slice(paintedTexts);
  assert.ok(repaint.some(({ text }) => text === '22.5 °C'), 'the repaint carries the new reading');
  assert.ok(repaint.some(({ text }) => text === 'SALA 1'), 'the location line survives every repaint');
});

// ---------------------------------------------------------------------------
// B — the information panel is gone; the essentials float over the canvas.
// ---------------------------------------------------------------------------

test('B: index.html drops the aside and keeps only the selection card overlay', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /information-panel/);
  assert.doesNotMatch(html, /Arquitectura del sistema/, 'the static flow list dies with no replacement');
  assert.doesNotMatch(html, /class="data-flow"/);
  // Client simplification (2026-07-15): the alarm strip died with the fault machinery.
  assert.doesNotMatch(html, /alarm-strip/);
  assert.match(html, /id="selection-card"/);
  assert.match(html, /id="selection-detail"/);
  assert.match(html, /id="selection-path"/);
  assert.match(html, /id="selection-cartelera"[^>]*>Ver en cartelera →</);
});

test('B: styles reclaim the third column for the canvas and style the overlay', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /information-panel/);
  assert.doesNotMatch(css, /\.data-flow/);
  assert.doesNotMatch(css, /minmax\(15rem, 18rem\)/, 'the app shell must not reserve the dead column');
  assert.doesNotMatch(css, /alarm-strip/, 'the alarm strip CSS died with the fault machinery');
  assert.match(css, /\.selection-card/);
});

test('B: main.js renders the essentials into the selection overlay, no alarm machinery', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /#alarm-list/);
  assert.doesNotMatch(main, /alarm-strip|alarmStrip/, 'the alarm strip wiring died with the fault machinery');
  assert.doesNotMatch(main, /deriveHudModel/, 'the alarm-driven HUD derivation died with it');
  assert.match(main, /#selection-card/);
  assert.match(main, /#selection-cartelera/);
  assert.match(main, /dashboardUnitHref/, 'one deep-link builder for chips AND the selection card');
});

// ---------------------------------------------------------------------------
// C — 3D ↔ cartelera connectivity affordance.
// ---------------------------------------------------------------------------

test('C: the cartelera back control is a button-style "← Visor 3D", id preserved', async () => {
  const dash = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(dash, /id="miga-visor"/, 'the context-carrying id must survive');
  assert.match(dash, /volver-visor[^>]*id="miga-visor"|id="miga-visor"[^>]*volver-visor/);
  assert.match(dash, />← Visor 3D</);
  assert.match(dash, /\.volver-visor\{[^}]*background:var\(--accent-strong\)/s,
    'blue action button on the light marquee (client light-SaaS restyle), flat');
  assert.doesNotMatch(dash, /\.volver-visor\{[^}]*gradient/s);
});

test('C: the superseded navy/gradient/glass direction must not resurrect in the dashboard skin', async () => {
  // Client restyle (2026-07-15): the navy ground + radial wash + glassmorphism waiver skin was
  // superseded by a light SaaS reference (see runs/dashboard/WAIVER-navy-gradient.md). The two
  // signature properties of that dead direction are banned outright, so it cannot creep back
  // silently through a copy-paste of the old block.
  const dash = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.doesNotMatch(dash, /backdrop-filter/, 'glassmorphism left with the superseded navy skin');
  assert.doesNotMatch(dash, /radial-gradient/, 'the gradient wash left with the superseded navy skin');
});

test('C: the unit view carries a visible "Ver en el visor 3D" action with the unit context', () => {
  const model = createDashboardModel({ tick: 0 });
  const unit = model.unitsById.get('RTU-08');
  const href = buildViewerUrl({ unitId: unit.unitId });
  const view = unitViewHtml(unit, { viewerHref: href, embedSrc: buildEmbedUrl({ unitId: unit.unitId }) });
  assert.match(view, /Ver en el visor 3D/);
  assert.ok(view.includes(`href="${href.replaceAll('&', '&amp;')}"`), 'the action carries the same href as the breadcrumb');
});

// ---------------------------------------------------------------------------
// D — chart hover: deterministic crosshair + time/value tooltip.
// ---------------------------------------------------------------------------

test('D: the crosshair snaps to the nearest sample and clamps at the chart edges', () => {
  assert.equal(nearestSampleIndex(0, 900, 48), 0);
  assert.equal(nearestSampleIndex(900, 900, 48), 47);
  assert.equal(nearestSampleIndex(-40, 900, 48), 0, 'left overshoot clamps');
  assert.equal(nearestSampleIndex(940, 900, 48), 47, 'right overshoot clamps');
  const step = 900 / 47;
  assert.equal(nearestSampleIndex(10 * step + step * 0.3, 900, 48), 10);
  assert.equal(nearestSampleIndex(10 * step + step * 0.6, 900, 48), 11);
});

test('D: point times derive from the sim reading time, stepping 30 min back, honest about "ayer"', () => {
  assert.equal(sampleTimeLabel(47, '21:47:12'), 'hoy 21:47', 'the last point IS the live reading');
  assert.equal(sampleTimeLabel(46, '21:47:12'), 'hoy 21:17');
  assert.equal(sampleTimeLabel(0, '21:47:12'), 'ayer 22:17', '47 samples = 23.5 h back, crossing midnight');
  assert.equal(sampleTimeLabel(0, '23:30:00'), 'hoy 00:00', 'a 23:30 reading reaches back exactly to midnight');
  assert.equal(sampleTimeLabel(47, 'N/D'), 'N/D', 'no sim clock, no fake calendar');
});

test('D: the tooltip model pins the sample on the shared scale and never clips at the edges', () => {
  const model = createDashboardModel({ tick: 0 });
  const unit = model.unitsById.get('RTU-08');
  const points = createUnitSeries(unit.seriesIndex, {
    setpoint: unit.setpoint,
    temperature: unit.temperature,
  });

  const last = chartHoverModel({ points, index: 47, readingTime: unit.readingTime });
  assert.equal(last.value, unit.temperature, 'the last sample is the live reading');
  assert.equal(last.x, 900);
  assert.equal(last.align, 'left', 'at the right edge the tooltip flips left');
  assert.match(last.label, /^hoy \d\d:\d\d · \d+\.\d °C$/);
  const expectedY = 220 - ((points[47] - CHART_SCALE.min) / (CHART_SCALE.max - CHART_SCALE.min)) * 220;
  assert.ok(Math.abs(last.y - expectedY) < 1e-9, 'the marker rides the chart\'s own 17–33 scale');

  const first = chartHoverModel({ points, index: 0, readingTime: unit.readingTime });
  assert.equal(first.x, 0);
  assert.equal(first.align, 'right', 'at the left edge the tooltip flips right');

  assert.deepEqual(
    chartHoverModel({ points, index: 12, readingTime: unit.readingTime }),
    chartHoverModel({ points, index: 12, readingTime: unit.readingTime }),
    'same inputs, same tooltip — deterministic',
  );
});

test('D: dashboard.html wires pointer events on the unit chart; the fleet sparklines stay static', async () => {
  const dash = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(dash, /hover\.mjs/);
  assert.match(dash, /pointermove/);
  assert.match(dash, /pointerleave/, 'the tooltip must disappear on leave');
  assert.match(dash, /\.grafica/, 'the chart wrapper hosts the tooltip overlay');
  assert.doesNotMatch(dash, /chispa[^{]*pointermove/, 'sparklines take no hover wiring');
});

// ---------------------------------------------------------------------------
// E — the unit view embeds the real viewer (one source of truth, EMBED mode).
// ---------------------------------------------------------------------------

test('E: buildEmbedUrl mirrors the viewer deep-link plus embed=1, and the viewer accepts it', () => {
  assert.equal(buildEmbedUrl({}), 'index.html?embed=1');
  // Single-view correction (2026-07-18): the deep link stopped carrying `camera` — the viewer
  // ships ONE fixed view and the embed frames the unit from `selection` alone (the embed-mode
  // close framing is selection-driven, never a named view).
  assert.equal(
    buildEmbedUrl({ unitId: 'RTU-08' }),
    'index.html?selection=TC300-08&embed=1',
  );
  const search = buildEmbedUrl({ unitId: 'RTU-08' }).split('?')[1];
  const parsed = parseQueryState(`?${search}`);
  assert.equal(parsed.embed, true);
  assert.equal(parsed.selection, 'TC300-08');
  assert.equal(parsed.camera, 'network', 'the pinned single view — no URL token moves it');

  assert.equal(DEFAULT_QUERY_STATE.embed, false);
  assert.match(serializeQueryState(parsed), /embed=1$/, 'the flag round-trips');
  assert.doesNotMatch(serializeQueryState(parseQueryState('')), /embed/, 'the bare viewer URL never carries it');
  assert.deepEqual(parseQueryState('?embed=wat', () => {}), DEFAULT_QUERY_STATE, 'malformed flag resets atomically');
});

test('E: the unit view carries the iframe panel with lazy loading and an accessible fallback', () => {
  const model = createDashboardModel({ tick: 0 });
  const unit = model.unitsById.get('RTU-08');
  const embedSrc = buildEmbedUrl({ unitId: unit.unitId });
  const view = unitViewHtml(unit, {
    viewerHref: buildViewerUrl({ unitId: unit.unitId }),
    embedSrc,
  });
  assert.match(view, /Unidad en el gemelo 3D/);
  assert.ok(view.includes(`src="${embedSrc.replaceAll('&', '&amp;')}"`), 'the iframe embeds the context-carrying URL');
  assert.match(view, /<iframe[^>]*loading="lazy"/);
  assert.match(view, /<iframe[^>]*title="[^"]*RTU-08[^"]*"/);
  assert.match(view, /Abrir en el visor 3D/);

  // The render stays total without options: defaults derive from the unit itself.
  const bare = unitViewHtml(unit);
  assert.match(bare, /embed=1/);
  assert.match(bare, /selection=TC300-08/);
});

test('E: the embed framing derives from the unit at a 3/4 close view inside orbit limits', () => {
  const plan = createArchitecturePlan();
  const unit = plan.structural.roofService.packagedUnits.find(({ tc300Id }) => tc300Id === 'TC300-08');
  const framing = resolveUnitClosePreset(unit);
  assert.deepEqual([...framing.target], [unit.position[0], unit.cabinetCentreY, unit.position[2]]);
  for (const axis of [0, 1, 2]) {
    assert.equal(framing.position[axis], framing.target[axis] + EMBED_UNIT_VIEW.offset[axis]);
  }
  assert.ok(
    EMBED_UNIT_VIEW.offset[0] !== 0 && EMBED_UNIT_VIEW.offset[2] !== 0 && EMBED_UNIT_VIEW.offset[1] > 0,
    'a 3/4 view stands off BOTH plan axes and above — never the generic top camera',
  );
  const distance = Math.hypot(...EMBED_UNIT_VIEW.offset);
  assert.ok(distance >= 8 && distance <= 20, 'close, and inside the orbit min/max distance band');
  assert.throws(() => resolveUnitClosePreset(null), TypeError);
});

test('E: main.js strips the chrome in embed mode and frames the selected unit', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /queryState\.embed/);
  assert.match(main, /classList\.add\('embed'\)/);
  assert.match(main, /resolveUnitClosePreset/);
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /body\.embed/);
  assert.match(css, /body\.embed [^{]*\{[^}]*display: none/s, 'header, panels and overlays vanish in embed');
});

// ---------------------------------------------------------------------------
// F — the delivery-chain panel leaves the unit view; the model keeps its truth.
// ---------------------------------------------------------------------------

test('F: the unit view renders no chain and no verdict; the derivations died with the faults', async () => {
  const model = createDashboardModel({ tick: 0 });
  const unit = model.unitsById.get('RTU-08');
  const view = unitViewHtml(unit);
  assert.doesNotMatch(view, /Cadena de entrega/);
  assert.doesNotMatch(view, /class="cadena"/);
  assert.doesNotMatch(view, /veredicto/);

  // Client simplification (2026-07-15): the model-level chain/verdict derivations, whose only
  // non-trivial states were fault-driven, were deleted outright.
  assert.equal('chain' in unit, false);
  assert.equal('verdict' in unit, false);

  // Dead CSS is gone with the panel.
  const dash = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.doesNotMatch(dash, /\.cadena\{|\.nodo\{|\.veredicto\{/);
});

// ---------------------------------------------------------------------------
// G — ducts and drains readable (deferred S1 activated).
// ---------------------------------------------------------------------------

test('G: galvanized ducts take the judge\'s 0.4–0.6 metalness band; drains lighten one step', async () => {
  const duct = MATERIAL_SPECS.galvanizedDuct;
  assert.ok(duct.metalness >= 0.4 && duct.metalness <= 0.6, `metalness ${duct.metalness} misses the prescription`);
  assert.ok(duct.roughness >= 0.4 && duct.roughness <= 0.6);
  assert.equal(duct.color, 0xaeb4b8, 'the galvanized albedo is untouched — only the response changes');

  const luminance = (color) => (
    ((color >> 16) & 0xff) * 0.2126 + ((color >> 8) & 0xff) * 0.7152 + (color & 0xff) * 0.0722
  );
  assert.ok(
    luminance(DRAIN_PIPE_COLOR) > luminance(0x202832) * 1.8,
    'the condensate drains must leave the invisible near-black family',
  );
  assert.ok(luminance(DRAIN_PIPE_COLOR) < luminance(duct.color), 'still darker than the ducts');

  // The drains ride their own bucket now (definition + the three emitted parts).
  const source = await readFile(new URL('../src/scene/architecture.js', import.meta.url), 'utf8');
  assert.ok((source.match(/'drain-pipe'/g) ?? []).length >= 4, 'riser, run and trap must move to the drain bucket');
});

// ---------------------------------------------------------------------------
// H — fleet slots declare unit STATE and temperature deviation at a glance.
// ---------------------------------------------------------------------------

test('H: every slot carries the live pill and a deviation read vs consigna', () => {
  const model = createDashboardModel({ tick: 0 });

  // The one remaining state: OK pill for every unit; the deviation tag carries the real signal.
  const healthy = model.unitsById.get('RTU-01');
  const healthyTag = deviationTagFor(healthy);
  const healthyDelta = healthy.temperature - healthy.setpoint;
  assert.equal(healthyTag.text, `${healthyDelta >= 0 ? '+' : ''}${healthyDelta.toFixed(1)}°`);
  const healthySlot = slotHtml(healthy);
  assert.match(healthySlot, />OK</);
  assert.match(healthySlot, /<svg class="chispa"/, 'the sparkline stays');

  // KEPT after the simplification: the deviation tag flags `fuera` whenever the healthy series
  // legitimately leaves the ±1.5 °C band — the model still produces this without any fault.
  for (const unit of model.units) {
    const tag = deviationTagFor(unit);
    const fuera = unit.temperature < unit.band[0] || unit.temperature > unit.band[1];
    assert.equal(tag.className, fuera ? 'desvio fuera' : 'desvio');
  }
  const anyFuera = model.units.some((unit) => (
    unit.temperature < unit.band[0] || unit.temperature > unit.band[1]
  ));
  assert.equal(anyFuera, true, 'the healthy series can and does leave the band — the tag stays earning its keep');

  // The alarm/coms vocabulary is gone from every slot.
  for (const unit of model.units) {
    const slot = slotHtml(unit);
    assert.doesNotMatch(slot, /ALARMA|SIN COMS|en-alarma/);
  }
});
