// dims.mjs — SINGLE SOURCE OF TRUTH for geometry dimensions.
// Transcribed 1:1 from design-spec.yaml §dimensions_real. Units: METERS (spec: 1 unit = 1 m).
//
// `confidence` mirrors the spec. `low` values are PRE-AUTHORIZED for amendment at P4 via
// refine-spec (update value + evidence) WITHOUT a full P3 re-gate — but they must be amended
// in the SPEC first, then here. Never let this file drift ahead of the spec.

/** @typedef {{ value: number, confidence: 'high'|'med'|'low', note?: string }} Dim */

export const DIMS = {
  // --- envelope -------------------------------------------------------------
  length:  { value: 1.778, confidence: 'high', note: '70 in overall strip length (vertical axis)' },
  width:   { value: 0.054, confidence: 'low',  note: 'CONFLICT 50.8 mm (CDW "2 in") vs 58 mm (P1-DATASHEETS §1); midpoint' },
  depth:   { value: 0.076, confidence: 'med',  note: '3 in body depth off the mounting plane' },

  // --- outlet field ---------------------------------------------------------
  outletCount: { value: 42,     confidence: 'high', note: '(21) C13/C15 + (21) 4-in-1 C13/C15/C19/C21' },
  outletField: { value: 1.45,   confidence: 'low',  note: 'DERIVED: length - head - inlet entry (1.778 - 0.22 - 0.11)' },
  outletPitch: { value: 0.0345, confidence: 'low',  note: 'DERIVED: outletField / outletCount' },

  // --- head module ----------------------------------------------------------
  headModule: { value: 0.22,  confidence: 'low', note: 'controller head length; hosts LCD + RJ45 pair + USB + QR' },
  lcdW:       { value: 0.040, confidence: 'low', note: 'display diagonal UNDOCUMENTED (P1-DATASHEETS §6 gap); sized to fit the strip width' },
  lcdH:       { value: 0.032, confidence: 'low', note: 'ditto' },

  // --- mounting -------------------------------------------------------------
  mountButtonPitch: { value: 0.40, confidence: 'low', note: 'tool-less keyhole buttons up the rear face' },
};

/** Bare numeric view — `D.length` instead of `DIMS.length.value`. */
export const D = Object.fromEntries(
  Object.entries(DIMS).map(([k, v]) => [k, v.value]),
);

// --- derived anchors (computed once, never hand-copied) ----------------------
// The strip is centered on the origin: it spans y = -length/2 .. +length/2.
export const HALF_LENGTH = D.length / 2;                 // 0.889
export const HEAD_CENTER_Y = HALF_LENGTH - D.headModule / 2;  // 0.779 — matches spec hierarchy pivot
export const TAIL_Y = -HALF_LENGTH;                      // -0.889 — inlet cord root

/**
 * Sanity guard — a derived dimension that goes non-positive still renders a plausible
 * object at exit 0 (see memory: derived-dimension-needs-positivity-guard). Assert a
 * VISIBLE margin, not merely a sign.
 * Uses console.error, NOT console.assert — assert is invisible to the QA gate.
 */
export function verifyDims() {
  const problems = [];
  const MIN_MARGIN = 0.005; // 5 mm — below this a feature cannot read at gate resolution

  if (D.outletField <= MIN_MARGIN) {
    problems.push(`outletField ${D.outletField} <= ${MIN_MARGIN}`);
  }
  if (D.outletField + D.headModule > D.length) {
    problems.push(`outletField + headModule (${(D.outletField + D.headModule).toFixed(3)}) exceeds length ${D.length}`);
  }
  if (D.outletPitch <= MIN_MARGIN) {
    problems.push(`outletPitch ${D.outletPitch} <= ${MIN_MARGIN}`);
  }
  // The outlet column must physically fit inside the field it was derived from.
  const spanned = D.outletCount * D.outletPitch;
  if (spanned > D.outletField + 1e-6) {
    problems.push(`outlet column spans ${spanned.toFixed(4)} > outletField ${D.outletField}`);
  }
  // An outlet aperture must fit across the strip width with bezel left over.
  if (D.lcdW >= D.width) {
    problems.push(`lcdW ${D.lcdW} >= strip width ${D.width} — display cannot fit the bezel`);
  }

  if (problems.length) {
    console.error('[dims] INVALID:', problems.join(' · '));
    return false;
  }
  return true;
}
