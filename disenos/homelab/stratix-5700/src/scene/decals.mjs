// decals.mjs — procedural CanvasTexture artwork (P5a SURFACE).
//
// OFFLINE BY CONSTRUCTION: every pixel is drawn with the 2D canvas API. No image files, no
// fonts to fetch, no network. The build stays double-clickable from file://.
//
// TEXT DISCIPLINE. Printed text is a factual claim rendered at hundreds of pixels, so it
// gets the same evidence rule as geometry:
//   - Manufacturer, product name, catalogue number and the six system-LED labels all come
//     from P1-DATASHEETS.md §3. The LED names in particular are the manual's own state
//     table [CERT-a], not names invented to fill a column.
//   - NO ELECTRICAL RATINGS. P1 carries no voltage, current or power figure for this
//     device — only dimensions, port mix and mounting. A plausible wrong rating
//     silkscreened at 12 px is worse than a missing line, and the sibling asset's
//     nameplate omits voltage for exactly this reason.
//   - NO PORT NUMBERING. Unlike the PDU, nothing in P1 establishes how Rockwell numbers
//     these ports, and there is no functional argument forcing it either.
//
// HEADLESS SAFETY: `document` does not exist under the node-based checks. Each factory
// returns { texture, layout }; texture is null with no DOM, layout is always computed, so
// the checks can verify placement, sizing and the exact strings while the pixels are
// judged from a capture.

import * as THREE from 'three';

const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;

// Artwork depends only on its arguments, so memoising is exact. Call counts are exposed
// so a check can prove the cache is hit rather than assume it.
const _cache = new Map();
const _calls = { livery: 0, ledLabels: 0 };
function cached(key, kind, make) {
  let v = _cache.get(key);
  if (!v) { _calls[kind] += 1; v = make(); _cache.set(key, v); }
  return v;
}
export function artworkStats() { return { calls: { ..._calls }, cached: _cache.size }; }

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

// ── Front livery ─────────────────────────────────────────────────────────────
/** Every string here is sourced — see TEXT DISCIPLINE above. */
export const LIVERY = {
  brand: 'Allen-Bradley',
  product: 'Stratix 5700',
  catalogue: '1783-BMS10CGP',
};

function buildLivery() {
  const W = 512;
  const H = 168;
  const layout = { w: W, h: H, strings: { ...LIVERY }, hasRatings: false };
  const canvas = makeCanvas(W, H);
  if (!canvas) return { texture: null, layout };

  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'middle';

  // Allen-Bradley red block with the brand reversed out of it — the manufacturer cue
  // that identifies the unit at a glance.
  g.fillStyle = '#c8102e';
  g.fillRect(0, 0, 232, 64);
  g.fillStyle = '#ffffff';
  g.font = 'bold 30px "IBM Plex Sans", Arial, sans-serif';
  g.fillText(LIVERY.brand, 14, 33);

  g.fillStyle = '#e8e8e4';
  g.font = 'bold 44px "IBM Plex Sans", Arial, sans-serif';
  g.fillText(LIVERY.product, 8, 104);

  g.font = '24px "IBM Plex Mono", "Courier New", monospace';
  g.fillStyle = '#b9bcc2';
  g.fillText(LIVERY.catalogue, 10, 146);

  return { texture: finishTexture(canvas), layout };
}
export function makeLivery() { return cached('livery', 'livery', buildLivery); }

// ── System-LED label column ──────────────────────────────────────────────────
/**
 * The six diagnostic labels, printed as one strip beside the lens column so a single
 * texture serves all six rows and stays aligned with them by construction.
 * Names are the manual's own [CERT-a] — not invented to fill the column.
 */
function buildLedLabels(names) {
  // 256 -> 512 wide. THE OPTIMIZATION PASS MOVED THIS NUMBER UP, because right-sizing is
  // a measurement in both directions and the measurement said it was under-resourced.
  // This strip appears in BOTH the hero and ?cam=port-detail, and at dpr3 the detail shot
  // renders it 516 px wide against a 256 px canvas — a 2.0x upscale on the very text that
  // shot exists to make legible. Doubling the linear size costs 4x the area (336 KB ->
  // 1344 KB), which is the honest price of legible text in the capture that needs it.
  //
  // The livery plate was measured the same way and deliberately LEFT ALONE: it appears
  // only in the hero, where dpr3 renders it 630 px against 512 — a 1.23x upscale, within
  // resampling tolerance. Doubling it too would cost another megabyte for a difference
  // nobody could see.
  const W = 512;
  const CELL = 112;
  const H = names.length * CELL;
  const layout = { w: W, h: H, cell: CELL, names: [...names] };
  const canvas = makeCanvas(W, H);
  if (!canvas) return { texture: null, layout };

  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = 'rgba(232,232,228,0.94)';

  names.forEach((name, i) => {
    // Row 0 is the TOP lens, matching the order the geometry places them in.
    const cy = (i + 0.5) * CELL;
    g.font = 'bold 60px "IBM Plex Mono", "Courier New", monospace';
    g.fillText(name.toUpperCase(), 20, cy);
  });

  return { texture: finishTexture(canvas), layout };
}
export function makeLedLabels(names) {
  return cached(`leds:${names.join(',')}`, 'ledLabels', () => buildLedLabels(names));
}
