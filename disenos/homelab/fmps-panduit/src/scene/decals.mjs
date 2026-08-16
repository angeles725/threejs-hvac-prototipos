// decals.mjs — procedural CanvasTexture artwork (P5a SURFACE).
//
// OFFLINE BY CONSTRUCTION: every pixel is drawn with the 2D canvas API. No image files, no
// fonts to fetch, no network. The build stays double-clickable from file://.
//
// ── TEXT DISCIPLINE ──────────────────────────────────────────────────────────────
//
// DRAWN:
//   PANDUIT   — the manufacturer, established for this catalogue number [CERT-web].
//   PXTC1ARA  — the catalogue number itself. UNLIKE THE SIBLING AXIS, where the model was
//               unknowable from an OUI and printing one would have fabricated an identity,
//               here P1 names the variant explicitly. A part number that IS evidenced is
//               exactly the kind of thing a rack chassis carries on its face.
//
// NOT DRAWN — and one of these needs the argument spelled out:
//   Electrical ratings. P1 does record "4.8-6 kW per chassis" for the FMPS system, so the
//   figure EXISTS in the research. That is not the same as it being SILKSCREENED HERE.
//   Printing a rating is a claim about what the LABEL says, not about what the product does,
//   and nothing in the evidence describes this unit's label at all. `panduit-livery-no-ratings`
//   is a critical precisely so that distinction cannot quietly erode: a plausible wrong
//   rating rendered at 12 px is worse than a missing line.
//
//   Bay numbering. Nine slots invite a 1-9 silkscreen, but nothing establishes the SCHEME —
//   whether Panduit numbers them 1-9 or 0-8, left-to-right or right-to-left. The sibling
//   Stratix set this precedent for its ports and it holds here for the same reason: the
//   existence of a convention is not knowledge of which convention.
//
//   Serial numbers, QR codes, agency marks, port labels. None are evidenced.
//
// HEADLESS SAFETY: `document` does not exist under the node checks. The factory returns
// { texture, layout }; texture is null with no DOM, layout is always computed, so a check
// can verify the strings and the absence of ratings without a browser.

import * as THREE from 'three';

const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;

const _cache = new Map();
const _calls = { livery: 0 };
function cached(key, kind, make) {
  let v = _cache.get(key);
  if (!v) { _calls[kind] += 1; v = make(); _cache.set(key, v); }
  return v;
}
export function artworkStats() { return { calls: { ..._calls }, cached: _cache.size }; }

/** Every string the asset shows. Exported so a check can assert on it directly. */
export const LIVERY = {
  brand: 'PANDUIT',
  catalogue: 'PXTC1ARA',
  ratings: null,        // deliberately absent — see TEXT DISCIPLINE
  numeric: false,
};

function buildLivery() {
  // SIZED BY MEASUREMENT, both directions. The plate renders 428 x 45 px at dpr3 hero and
  // 574 x 60 px at dpr4 — the worst case being the wide hero. 1024 on the long axis covers
  // 574 px at 1.78x; the next size down, 512, would sit at 0.89x and interpolate a 44 mm
  // strip of lettering UPWARDS, on the one printed element the asset has.
  // The aspect follows the plate: 44 x 3.5 mm is 12.57:1, and 1024 x 82 is 12.49:1.
  const W = 1024;
  const H = 82;
  const layout = { w: W, h: H, ...LIVERY, rendersAt: { dpr3_hero: [428, 45], dpr4_hero: [571, 60] } };
  const canvas = hasDOM() ? document.createElement('canvas') : null;
  if (!canvas) return { texture: null, layout };
  canvas.width = W;
  canvas.height = H;

  const g = canvas.getContext('2d');
  // The plate's own colour, so the print sits on the panel rather than on a patch.
  g.fillStyle = '#41454b';
  g.fillRect(0, 0, W, H);

  g.textBaseline = 'middle';
  const cy = H / 2;

  g.fillStyle = '#e8e8e4';
  g.font = 'bold 52px "IBM Plex Sans", Arial, Helvetica, sans-serif';
  g.letterSpacing = '6px';
  g.fillText(LIVERY.brand, 18, cy);

  // The catalogue number, set smaller and in mono — the way a part number is printed beside
  // a brand rather than competing with it.
  g.font = '34px "IBM Plex Mono", "Courier New", monospace';
  g.letterSpacing = '2px';
  g.fillStyle = '#b9bcc2';
  g.fillText(LIVERY.catalogue, 360, cy + 2);

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return { texture: t, layout };
}

/** Memoised — the artwork depends on nothing, so building it twice is pure waste. */
export function makeLivery() { return cached('livery', 'livery', buildLivery); }

/**
 * Six-material array for a BoxGeometry, with the map on ONE face only.
 *
 * NOT A STYLE CHOICE. BoxGeometry has six material groups, and a single mapped material
 * assigned to it paints the artwork on ALL SIX FACES — which is how a red thread appeared
 * down the side of a sibling asset's hero, the logo wrapping around the edges of its plate.
 * Faces: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z. The front of a rack chassis is +z, so index 4.
 */
export function facedMaterials(mapMat, edgeMat, faceIndex = 4) {
  const six = [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, edgeMat];
  six[faceIndex] = mapMat;
  return six;
}
