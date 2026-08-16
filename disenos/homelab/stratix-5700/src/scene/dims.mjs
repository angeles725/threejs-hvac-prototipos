// dims.mjs — SINGLE SOURCE OF TRUTH for geometry dimensions.
// Transcribed 1:1 from design-spec.yaml §dimensions_real. Units: METERS (spec: 1 unit = 1 m).
// Variant: 1783-BMS10CGP (10-port). Do NOT mix in figures from the 6- or 20-port bodies.
//
// `confidence` mirrors the spec. `low` values are PRE-AUTHORIZED for amendment at P4 via
// refine-spec — but they must be amended in the SPEC first, then here.

export const DIMS = {
  // --- envelope (all high confidence, [CERT-web] product page) ---------------
  height: { value: 0.1295, confidence: 'high', note: 'enclosure incl. DIN clip' },
  width:  { value: 0.0914, confidence: 'high' },
  depth:  { value: 0.1358, confidence: 'high', note: 'depth off the mounting plane' },
  mass:   { value: 1.38,   confidence: 'high', note: 'kg' },

  // --- port block: DERIVED ---------------------------------------------------
  // "8 RJ45 on the left, 2 combo on the right" is impossible as ONE row: 8 x 15.9 mm =
  // 127.2 mm inside a 91.4 mm body. Industrial switches use 2-HIGH GANGED RJ45 modules,
  // so the layout is 5 columns x 2 rows. Cross-check: the 20-port body is 127.0 mm wide
  // with 16 RJ45, and 8 ganged modules = 127.2 mm — the same hypothesis predicts the
  // other variant to 0.2 mm.
  portCols:     { value: 5,      confidence: 'low' },
  portRows:     { value: 2,      confidence: 'low' },
  portColPitch: { value: 0.0160, confidence: 'low' },
  portRowPitch: { value: 0.0150, confidence: 'low' },
  jackW:        { value: 0.0159, confidence: 'med', note: 'standard RJ45 outline, not Rockwell-specific' },
  jackH:        { value: 0.0135, confidence: 'med' },

  // --- front-face zones: vertical order is INFERRED --------------------------
  portZoneH:   { value: 0.0400, confidence: 'low' },
  midZoneH:    { value: 0.0420, confidence: 'low' },
  liveryZoneH: { value: 0.0475, confidence: 'low' },
  ledPitch:    { value: 0.0060, confidence: 'low', note: '6 system LEDs down the left edge' },
  dinClipH:    { value: 0.0350, confidence: 'med', note: 'EN 50022 top-hat rail is 35 mm across' },
};

/** Bare numeric view — `D.width` instead of `DIMS.width.value`. */
export const D = Object.fromEntries(Object.entries(DIMS).map(([k, v]) => [k, v.value]));

// --- derived anchors (computed once, never hand-copied) ----------------------
// The body is centred on the origin: x ±width/2, y ±height/2, z ±depth/2.
export const HALF_W = D.width / 2;    // 0.0457
export const HALF_H = D.height / 2;   // 0.06475
export const HALF_D = D.depth / 2;    // 0.0679

export const FRONT_Z = HALF_D;
export const REAR_Z = -HALF_D;
export const TOP_Y = HALF_H;

// Front-face bands, stacked from the bottom.
export const PORT_ZONE = { y0: -HALF_H, y1: -HALF_H + D.portZoneH };
export const MID_ZONE = { y0: PORT_ZONE.y1, y1: PORT_ZONE.y1 + D.midZoneH };
export const LIVERY_ZONE = { y0: MID_ZONE.y1, y1: MID_ZONE.y1 + D.liveryZoneH };

/**
 * Sanity guard. A derived dimension that goes non-positive still renders a plausible
 * object at exit 0, so assert a VISIBLE margin rather than merely a sign.
 * console.error, NOT console.assert — assert is invisible to the QA gate.
 */
export function verifyDims() {
  const problems = [];
  const MIN = 0.001;   // 1 mm — below this a feature cannot read at gate resolution

  // The three bands must tile the face height without overflowing it.
  const bands = D.portZoneH + D.midZoneH + D.liveryZoneH;
  if (Math.abs(bands - D.height) > 0.0015) {
    problems.push(`front bands sum to ${bands.toFixed(4)} but the face is ${D.height}`);
  }
  if (LIVERY_ZONE.y1 > HALF_H + 1e-6) {
    problems.push(`livery band tops out at ${LIVERY_ZONE.y1.toFixed(4)} above the face top ${HALF_H}`);
  }

  // The port block must FIT the body — this is the check that would have caught the
  // "8 jacks in one row" reading of the source (8 x 0.0159 = 0.1272 in a 0.0914 body).
  const blockW = D.portCols * D.portColPitch;
  if (blockW > D.width - 2 * MIN) {
    problems.push(`port block spans ${blockW.toFixed(4)} in a ${D.width} body — layout does not fit`);
  }
  if (D.jackW > D.portColPitch) {
    problems.push(`jack ${D.jackW} wider than its column pitch ${D.portColPitch} — jacks would overlap`);
  }
  if (D.jackH > D.portRowPitch) {
    problems.push(`jack ${D.jackH} taller than its row pitch ${D.portRowPitch} — rows would overlap`);
  }
  const blockH = D.portRows * D.portRowPitch;
  if (blockH > D.portZoneH - MIN) {
    problems.push(`port block ${blockH.toFixed(4)} tall does not fit its ${D.portZoneH} band`);
  }
  if (D.portCols * D.portRows !== 10) {
    problems.push(`layout yields ${D.portCols * D.portRows} ports, expected 10`);
  }

  // Six system LEDs must fit the mid band.
  if (6 * D.ledPitch > D.midZoneH - MIN) {
    problems.push(`6 system LEDs at ${D.ledPitch} pitch do not fit the ${D.midZoneH} mid band`);
  }

  if (problems.length) {
    console.error('[dims] INVALID:', problems.join(' · '));
    return false;
  }
  return true;
}
