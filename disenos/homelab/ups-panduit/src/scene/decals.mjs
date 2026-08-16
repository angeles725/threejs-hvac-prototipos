// decals.mjs — procedural CanvasTexture artwork (P5a SURFACE).
//
// OFFLINE BY CONSTRUCTION: every pixel is drawn with the 2D canvas API. No image files, no
// fonts to fetch, no network. The build stays double-clickable from file://.
//
// TEXT DISCIPLINE for the display, which is the whole difficulty of this pass.
//
// A UPS screen shows live measurements. Any figure drawn here would be a FABRICATED
// READING presented at the same fidelity as the sourced geometry around it, so there are
// no numbers and no units anywhere on it — the same rule the sibling asset's controller
// display follows.
//
// What IS drawn, and why each is defensible:
//   - PANDUIT: the manufacturer, sourced (P1-DATASHEETS §2).
//   - INPUT / OUTPUT / BATTERY as row labels: these name the quantities a UPS monitors,
//     which is definitional rather than a claim about this model's menu. A UPS that did
//     not track input, output and battery would not be a UPS. Marked [INFER] all the same,
//     because the specific on-screen wording is not published.
//   - Bar graphs with no scale, no numbers, no units: they carry "this is a monitoring
//     display" without asserting any value.
// NOT drawn: kVA, voltage, current, runtime, load percentage, or any figure at all.
//
// HEADLESS SAFETY: `document` does not exist under the node-based checks. The factory
// returns { texture, layout }; texture is null with no DOM, layout is always computed, so
// the checks can verify the strings and the absence of numerals without a browser.

import * as THREE from 'three';

const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;

const _cache = new Map();
const _calls = { screen: 0 };
function cached(key, kind, make) {
  let v = _cache.get(key);
  if (!v) { _calls[kind] += 1; v = make(); _cache.set(key, v); }
  return v;
}
export function artworkStats() { return { calls: { ..._calls }, cached: _cache.size }; }

/** Every string the screen shows. Kept exported so a check can assert on it directly. */
export const SCREEN = {
  header: 'PANDUIT',
  rows: ['INPUT', 'OUTPUT', 'BATTERY'],
  numeric: false,
};

function buildScreen() {
  // 3.5-inch touch screen on the U05N11V (P1-DATASHEETS §2), landscape.
  const W = 512;
  const H = 306;
  const layout = { w: W, h: H, ...SCREEN };
  const canvas = hasDOM() ? document.createElement('canvas') : null;
  if (!canvas) return { texture: null, layout };
  canvas.width = W;
  canvas.height = H;

  const g = canvas.getContext('2d');
  // EMISSIVE map: black means unlit. The border must stay black or the whole pane glows
  // as a slab instead of reading as a screen inside a bezel.
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H);

  const PAD = 16;
  g.fillStyle = '#0a2333';                       // dim backlit field
  g.fillRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);

  g.textBaseline = 'middle';
  g.fillStyle = '#8fdcff';
  g.font = 'bold 34px "IBM Plex Mono", "Courier New", monospace';
  g.fillText(SCREEN.header, PAD + 14, PAD + 28);

  g.strokeStyle = '#2f7fa8';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(PAD + 12, PAD + 54);
  g.lineTo(W - PAD - 12, PAD + 54);
  g.stroke();

  // Three rows: a label and a bar. Bar lengths differ so the screen does not read as a
  // test pattern; they are illustrative geometry, NOT data, and carry no scale.
  const fills = [0.68, 0.61, 0.84];
  SCREEN.rows.forEach((label, i) => {
    const y = PAD + 96 + i * 58;
    g.fillStyle = '#8fdcff';
    g.font = 'bold 24px "IBM Plex Mono", "Courier New", monospace';
    g.fillText(label, PAD + 14, y);

    const x0 = PAD + 150;
    const bw = W - PAD - 20 - x0;
    g.fillStyle = '#0e3d54';
    g.fillRect(x0, y - 13, bw, 26);
    g.fillStyle = i === 2 ? '#4fe3a0' : '#57c8f5';
    g.fillRect(x0, y - 13, bw * fills[i], 26);
  });

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return { texture: t, layout };
}

/** Memoised — the artwork depends on nothing, so building it twice is pure waste. */
export function makeScreen() { return cached('screen', 'screen', buildScreen); }
