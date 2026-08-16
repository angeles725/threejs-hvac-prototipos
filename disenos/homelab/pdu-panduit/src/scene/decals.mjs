// decals.mjs — procedural CanvasTexture artwork (P5a SURFACE).
//
// OFFLINE BY CONSTRUCTION: every pixel here is drawn with the 2D canvas API. No image
// files, no fonts to fetch, no network. The build stays double-clickable from file://.
//
// TEXT DISCIPLINE. Everything printed on this asset is a factual claim rendered at
// hundreds of pixels, so it gets the same evidence rule as geometry:
//   - Model, current, apparent power, outlet count and inlet type come from
//     P1-DATASHEETS.md §1 (E42G20L, [CERT-a] CDW/DigiKey listings).
//   - VOLTAGE IS DELIBERATELY ABSENT. An IEC 60309 3P+E 9h inlet is *typically*
//     200-415 V, but no source in P1 states the EL2P's rating, and "typical for the
//     connector" is not evidence. A plausible wrong number silkscreened on a nameplate
//     is worse than a missing line.
//   - Bank legends L1/L2/L3 are [INFER], carrying exactly the same inference as the
//     three-bank colour grouping (three named colours, three phases on a 60 A 3-ph
//     unit). They add no new claim beyond what the materials pass already recorded.
//
// HEADLESS SAFETY: `document` does not exist under the node-based scene checks. Each
// factory returns { texture, layout }; texture is null with no DOM, layout is always
// computed. That lets the checks verify placement, sizing and the exact strings while
// the pixels are judged from the orchestrator's capture.

import * as THREE from 'three';

const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;

// ── Artwork cache (P5a OPTIMIZATION) ─────────────────────────────────────────
// Each factory was called once PER STRIP, so the A and B strips each carried their own
// identical copy of the same canvas: ~0.9 MB of duplicated texture for artwork that is
// pixel-for-pixel the same. The artwork depends only on its arguments, so memoising is
// exact rather than an approximation. Call counts are exposed so the optimization check
// can prove the cache is actually hit instead of assuming it.
const _artCache = new Map();
const _artCalls = { nameplate: 0, legend: 0, lcd: 0 };
function cachedArt(key, kind, make) {
  let v = _artCache.get(key);
  if (!v) { _artCalls[kind] += 1; v = make(); _artCache.set(key, v); }
  return v;
}
/** {built, ...} — how many times artwork was actually RASTERISED, not requested. */
export function artworkStats() { return { calls: { ..._artCalls }, cached: _artCache.size }; }

function makeCanvas(w, h) {
  if (!hasDOM()) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finishTexture(canvas) {
  if (!canvas) return null;
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// ── Head nameplate ───────────────────────────────────────────────────────────
/** Rating/brand plate for the head module. Facts only — see TEXT DISCIPLINE above. */
// FOUR lines, not six. The first draft packed six and the model line projected to
// 4.6 px even in the close view — text nobody can read is not evidence of a nameplate.
// Fewer, larger lines put the brand and model above the legibility floor; the rating
// print stays small, which is faithful (a real rating label is unreadable at 0.5 m).
export const NAMEPLATE_LINES = {
  brand: 'PANDUIT',
  model: 'E42G20L',
  rating: '60 A  3-PH  ·  17.3 kVA',
  outlets: '42 OUT  ·  IEC 60309 3P+E',
};

function buildNameplate() {
  const W = 512;
  const H = 200;
  const layout = { w: W, h: H, lines: { ...NAMEPLATE_LINES } };
  const canvas = makeCanvas(W, H);
  if (!canvas) return { texture: null, layout };

  const g = canvas.getContext('2d');
  g.fillStyle = '#efefe9';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';

  // brand bar — the largest element, so it survives the most foreshortening
  g.fillStyle = '#1b1b20';
  g.fillRect(0, 0, W, 66);
  g.fillStyle = '#efefe9';
  g.font = 'bold 46px "IBM Plex Mono", "Courier New", monospace';
  g.fillText(NAMEPLATE_LINES.brand, 18, 35);

  g.fillStyle = '#1b1b20';
  g.font = 'bold 40px "IBM Plex Mono", "Courier New", monospace';
  g.fillText(NAMEPLATE_LINES.model, 18, 103);

  g.font = '26px "IBM Plex Mono", "Courier New", monospace';
  g.fillStyle = '#3a3a42';
  g.fillText(NAMEPLATE_LINES.rating, 18, 145);
  g.fillText(NAMEPLATE_LINES.outlets, 18, 176);

  g.strokeStyle = '#9a9a96';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);

  return { texture: finishTexture(canvas), layout };
}

// ── Head LCD screen ──────────────────────────────────────────────────────────
/**
 * Backlit controller screen, used as an EMISSIVE MAP so the glow has structure instead of
 * being one flat lit rectangle.
 *
 * NO NUMBERS. A monitored PDU screen shows live current and power, and any figure drawn
 * here would be a fabricated measurement presented at the same fidelity as the sourced
 * nameplate beside it. Bar graphs carry the "this is a monitoring display" read without
 * asserting a reading. The L1/L2/L3 legend reuses the existing circuit-bank inference and
 * introduces nothing new.
 */
function buildLcdScreen() {
  const W = 256;
  const H = 200;
  const layout = { w: W, h: H, header: 'PANDUIT', rows: ['L1', 'L2', 'L3'], numeric: false };
  const canvas = makeCanvas(W, H);
  if (!canvas) return { texture: null, layout };

  const g = canvas.getContext('2d');
  // Emissive map: black = unlit. The bezel around the active area must stay black or the
  // whole plate glows as a slab.
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H);

  const PAD = 14;
  g.fillStyle = '#0d2a3a';                 // dim backlit field
  g.fillRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);

  g.fillStyle = '#7fd4ff';
  g.font = 'bold 26px "IBM Plex Mono", "Courier New", monospace';
  g.textBaseline = 'middle';
  g.fillText(layout.header, PAD + 10, PAD + 22);

  g.strokeStyle = '#2f7fa8';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(PAD + 8, PAD + 42);
  g.lineTo(W - PAD - 8, PAD + 42);
  g.stroke();

  // Three bank rows, each a label plus a bar. Bar lengths differ so the screen does not
  // read as a test pattern; they are illustrative geometry, not data.
  const fills = [0.72, 0.55, 0.64];
  layout.rows.forEach((label, i) => {
    const y = PAD + 68 + i * 34;
    g.fillStyle = '#7fd4ff';
    g.font = 'bold 20px "IBM Plex Mono", "Courier New", monospace';
    g.fillText(label, PAD + 10, y);

    const x0 = PAD + 48;
    const bw = W - PAD - 12 - x0;
    g.fillStyle = '#123c50';
    g.fillRect(x0, y - 9, bw, 18);
    g.fillStyle = '#4fe3a0';
    g.fillRect(x0, y - 9, bw * fills[i], 18);
  });

  return { texture: finishTexture(canvas), layout };
}

// ── Outlet legend strip ──────────────────────────────────────────────────────
/**
 * Silkscreen legend running up the left bezel rail: one number per outlet, plus a bank
 * legend where each circuit bank starts. Transparent background — only glyphs print,
 * so the rail's powder-coat shows through and the strip works for any body colour.
 *
 * An MSPO unit is switched PER OUTLET, so outlet identification is not decoration: you
 * cannot address outlet 17 without a 17 printed next to it. That is the functional
 * argument for numbering, recorded as [INFER] since no source shows the legend artwork.
 *
 * @param {number} count outlets
 * @param {number} bankCount circuit banks
 */
function buildOutletLegend(count, bankCount) {
  const W = 64;
  const CELL = 48;
  const H = count * CELL;
  const perBank = count / bankCount;
  const bankLabels = Array.from({ length: bankCount }, (_, b) => `L${b + 1}`);
  const layout = {
    w: W, h: H, cell: CELL, count, bankCount, perBank,
    bankLabels,
    // Outlet 1 is at the BOTTOM of the strip (nearest the inlet), counting up toward the
    // head — the same direction the geometry indexes them.
    firstNumber: 1,
    lastNumber: count,
  };
  const canvas = makeCanvas(W, H);
  if (!canvas) return { texture: null, layout };

  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  for (let i = 0; i < count; i++) {
    // canvas y grows downward; outlet 0 sits at the bottom of the strip
    const cy = H - (i + 0.5) * CELL;
    const isBankStart = i % perBank === 0;

    g.fillStyle = 'rgba(238,238,232,0.92)';
    g.font = 'bold 26px "IBM Plex Mono", "Courier New", monospace';
    g.fillText(String(i + 1), W / 2, cy);

    if (isBankStart) {
      g.fillStyle = 'rgba(238,238,232,0.75)';
      g.font = 'bold 17px "IBM Plex Mono", "Courier New", monospace';
      g.fillText(bankLabels[i / perBank], W / 2, cy - CELL * 0.34);
      g.strokeStyle = 'rgba(238,238,232,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(6, cy + CELL * 0.5);
      g.lineTo(W - 6, cy + CELL * 0.5);
      g.stroke();
    }
  }

  return { texture: finishTexture(canvas), layout };
}

/** Memoised — see the artwork cache above. */
export function makeNameplate() {
  return cachedArt('nameplate', 'nameplate', buildNameplate);
}

/** Memoised — see the artwork cache above. */
export function makeLcdScreen() {
  return cachedArt('lcd', 'lcd', buildLcdScreen);
}

/** Memoised — see the artwork cache above. */
export function makeOutletLegend(count, bankCount) {
  return cachedArt(`legend:${count}:${bankCount}`, 'legend', () => buildOutletLegend(count, bankCount));
}
