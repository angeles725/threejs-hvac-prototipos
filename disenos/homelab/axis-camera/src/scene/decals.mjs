// decals.mjs — procedural CanvasTexture artwork (P5a SURFACE).
//
// OFFLINE BY CONSTRUCTION: every pixel is drawn with the 2D canvas API. No image files, no
// fonts to fetch, no network. The build stays double-clickable from file://.
//
// ── TEXT DISCIPLINE, which on this asset is the whole of the pass ────────────────
//
// Printed text is a factual claim rendered at hundreds of pixels, so it gets the same
// evidence rule as geometry. Here the evidence is unusually thin and unusually clear:
//
//   DRAWN:     "AXIS" — the manufacturer. OUI AC:CC:8E is registered to Axis Communications
//              AB [CERT-a]. This is the ONE thing about the device that is actually known.
//
//   NOT DRAWN: the model number. A single OUI spans every Axis line, so nothing in the
//              evidence identifies this unit as an M3085-V or as anything else. The
//              dimensions are a declared placeholder; silkscreening a catalogue number on
//              top of them would turn a labelled approximation into a fabricated identity.
//
//   NOT DRAWN: resolution, IP/IK rating, PoE class, serial, QR, or any figure at all. P1
//              records none of them for this device. The same rule kept electrical ratings
//              off the Stratix nameplate and numerals off the UPS display.
//
// If a site photograph ever turns up, the model becomes knowable and this file is where the
// change would land. Until then the asset says exactly what can be defended.
//
// HEADLESS SAFETY: `document` does not exist under the node checks. The factory returns
// { texture, layout }; texture is null with no DOM, layout is always computed, so a check
// can verify the strings and the absence of numerals without a browser.

import * as THREE from 'three';

const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;

const _cache = new Map();
const _calls = { wordmark: 0 };
function cached(key, kind, make) {
  let v = _cache.get(key);
  if (!v) { _calls[kind] += 1; v = make(); _cache.set(key, v); }
  return v;
}
export function artworkStats() { return { calls: { ..._calls }, cached: _cache.size }; }

/** Every string the asset shows. Kept exported so a check can assert on it directly. */
export const WORDMARK = {
  text: 'AXIS',
  model: null,        // deliberately absent — see TEXT DISCIPLINE
  numeric: false,
};

/**
 * Canvas rotation applied to the lettering, in radians.
 *
 * PARAMETERISED BECAUSE IT IS MEASURABLE, not because it is a preference. Which value reads
 * upright depends on the UV layout of the mapped face, the plate's own orientation and the
 * camera pose — three things that compose in a way nobody should be reasoning about by
 * intuition. src/../surf-orient check projects the face's U and V axes to screen space and
 * computes the resulting advance and up directions of the text, so this value is SOLVED.
 */
export const TEXT_ROT = 0;

function buildWordmark() {
  // SIZED BY MEASUREMENT, both directions.
  //   The plate renders 254 x 116 px at dpr3 hero and 310 x 330 px at dpr4 under — the
  //   worst case being the near-axial view, which is exactly the state that exists to look
  //   the camera in the face. 512 on the long axis covers 330 px at 1.55x; the next size
  //   down, 256, would sit at 0.78x and interpolate the lettering UPWARDS in that state.
  //   The plate is a 3.6:1 tangential strip and its long axis is LOCAL X, which maps to U on
  //   the -y face — so the canvas is LANDSCAPE and the text needs no rotation at all.
  const W = 512;
  const H = 144;
  const layout = {
    w: W, h: H, ...WORDMARK,
    rendersAt: { dpr3_hero: [254, 116], dpr4_under: [310, 330] },
  };
  const canvas = hasDOM() ? document.createElement('canvas') : null;
  if (!canvas) return { texture: null, layout };
  canvas.width = W;
  canvas.height = H;

  const g = canvas.getContext('2d');
  // The plate's own colour, so the printed mark sits on the housing rather than on a patch.
  g.fillStyle = '#eceded';
  g.fillRect(0, 0, W, H);

  g.save();
  g.translate(W / 2, H / 2);
  if (TEXT_ROT) g.rotate(TEXT_ROT);   // solved, not guessed — see TEXT_ROT
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#1a1c1f';
  g.font = 'bold 88px "IBM Plex Sans", Arial, Helvetica, sans-serif';
  g.letterSpacing = '10px';        // ignored where unsupported; the mark still reads
  g.fillText(WORDMARK.text, 0, 0);
  g.restore();

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return { texture: t, layout };
}

/** Memoised — the artwork depends on nothing, so building it twice is pure waste. */
export function makeWordmark() { return cached('wordmark', 'wordmark', buildWordmark); }

/**
 * Six-material array for a BoxGeometry, with the map on ONE face only.
 *
 * THIS IS NOT A STYLE CHOICE. BoxGeometry has six material groups, and a single mapped
 * material assigned to it paints the artwork on ALL SIX FACES. That is exactly how a red
 * thread appeared down the side of the sibling asset's hero — the livery logo wrapping
 * around the edges of the plate it was printed on. Faces: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z.
 */
export function facedMaterials(mapMat, edgeMat, faceIndex = 3) {
  const six = [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, edgeMat];
  six[faceIndex] = mapMat;
  return six;
}
