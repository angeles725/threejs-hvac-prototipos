// dims.mjs — the corridor's dimensions, derived ONCE (P4 BLOCKOUT).
//
// PROVENANCE MATTERS MORE HERE THAN ANYWHERE ELSE IN THE RUN, because this asset was authored
// TWICE: first from a written description while the photographs were off disk, then again
// against the images. Six values changed. Each constant below says which state it is in.
//
//   REFERENCE-DERIVED — measured off site-01/05/08 by comparison against a KNOWN dimension in
//     the same frame (the 600 mm cabinet width, the 2 m cabinet height).
//   DECLARED INFERENCE — nothing in any frame fixes it; recorded as a choice.
//   PUBLISHED STANDARD — EIA-310, not up for interpretation.

// ── Reference-derived ────────────────────────────────────────────────────────────
export const AISLE_WIDTH   = 2.00;   // site-05: face-to-face gap reads ~3 cabinet widths
export const CEILING_H     = 2.70;   // site-05: deck sits ~0.7 m above a 2 m cabinet
export const RACKS_PER_SIDE = 3;     // site-01, site-05
export const RACK_SIDES     = 2;     // BOTH sides. The first authoring said one row; it was wrong.
export const RACK_PITCH    = 0.62;   // cabinets touching: 600 mm body plus frame

// ── Declared inference ───────────────────────────────────────────────────────────
// No frame measures the run to the glass door against anything known. This is the weakest
// number in the asset and it stays labelled as such.
export const AISLE_LENGTH  = 9.00;
export const HUMAN_H       = 1.72;

// ── Published standard (EIA-310) ─────────────────────────────────────────────────
export const U             = 0.04445;
export const RAIL_SPAN     = 0.4826;
export const USABLE_RAIL   = 1.867;   // 42U

// ── Measured from the built rack asset, not from its spec ────────────────────────
// Its spec says 600 x 2000 x 1000; the BUILT envelope is 620 x 2076 x 1146 because doors,
// plinth and casters reach past the body. The scene must place the thing that exists.
export const RACK_W = 0.620;
export const RACK_H = 2.076;
export const RACK_D = 1.146;

// Rack-unit assignments for the populated cabinet. The HEIGHTS follow from measured device
// heights against the 44.45 mm unit; the POSITIONS are chosen.
export const UPS_U_POS = 8,  UPS_U_H = 3;    // 131.0 mm = 2.95U -> 3U
export const FMPS_U_POS = 12, FMPS_U_H = 1;  // 43.0 mm = 0.97U -> 1U

/** World Y of the bottom of rack-unit `n`, counting from U1 at the bottom of the rail. */
export function uToY(n) { return RAIL_BOTTOM + (n - 1) * U; }
export const RAIL_BOTTOM = 0.10;   // rail starts above the plinth

export function verifyDerivations() {
  let bad = 0;
  const fail = (m) => { console.error(`[scene-dims] ${m}`); bad += 1; };
  if (CEILING_H <= RACK_H) fail(`ceiling ${CEILING_H} m does not clear a ${RACK_H} m cabinet`);
  if (AISLE_WIDTH < 0.9) fail(`a ${AISLE_WIDTH} m aisle is below any walkable clearance`);
  if (AISLE_LENGTH <= RACKS_PER_SIDE * RACK_PITCH) fail('the aisle is shorter than its own row of cabinets');
  if (HUMAN_H >= CEILING_H) fail('the scale figure does not fit under the ceiling');
  // The two rack-mounted devices must not overlap, and must sit inside the 42U rail.
  const a = [UPS_U_POS, UPS_U_POS + UPS_U_H], b = [FMPS_U_POS, FMPS_U_POS + FMPS_U_H];
  if (!(a[1] <= b[0] || b[1] <= a[0])) fail(`UPS U${a[0]}-U${a[1]} overlaps FMPS U${b[0]}-U${b[1]}`);
  if (Math.max(a[1], b[1]) > 42) fail('a device sits above the 42U rail');
  if (uToY(Math.max(a[1], b[1])) > RAIL_BOTTOM + USABLE_RAIL) fail('a device sits above the usable rail height');
  return bad;
}
