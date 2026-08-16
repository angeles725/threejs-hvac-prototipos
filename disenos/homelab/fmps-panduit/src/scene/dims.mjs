// dims.mjs — every dimension the build uses, derived ONCE from the spec (P4 BLOCKOUT).
//
// PROVENANCE, restated because it is the weakest in this run: the published figures are
// [CERT-a] from a distributor listing, not [CERT-doc] — Panduit's own installation PDF
// returned as binary and was never readable. Accepted at the P3 gate on the grounds that a
// 1U 19-inch chassis has its width and height FORCED by EIA-310; only the depth carries real
// uncertainty.

// ── Published (distributor listing for PXTC1ARA) ────────────────────────────────
export const BODY_W  = 0.4450;   // 17.5 in — the chassis, WITHOUT ears
export const HEIGHT  = 0.0430;   // 1.7 in
export const DEPTH   = 0.5590;   // 22 in
export const MASS_KG = 5.78;

// ── Derived from a published STANDARD, not invented ─────────────────────────────
// EIA-310 fixes a 19-inch rack's flange span at 482.6 mm. The ears are not styling: without
// them the unit cannot mount, and they are the widest thing on the asset — so the framing
// solve and the containment guard both have to know about them.
export const EAR_SPAN = 0.4826;
export const EAR_T    = 0.0025;
export const EAR_H    = HEIGHT;
export const EAR_W    = (EAR_SPAN - BODY_W) / 2;   // 18.8 mm of flange per side

// ── Front-face layout: INFERRED. The elements are sourced, the arrangement is not ──
// SOURCED: nine module slots, three PSUs, one RJ45, one alarm connector, per-slot and
// per-PSU LEDs. NOT SOURCED: how any of it sits across 445 mm.
//
// Accepted at the gate as a declared inference at confidence: low, on a distinction worth
// restating — you cannot omit elements the evidence confirms. This is the OPPOSITE case to
// the sibling UPS's rear receptacles, where the COUNT and TYPE were unsourced and so nothing
// was built at all. Here the counts are published; only the layout is a choice.
export const SLOT_N   = 9;
export const SLOT_W   = 0.0300;
export const SLOT_H   = 0.0330;
export const PSU_N    = 3;
export const PSU_W    = 0.0450;
export const PSU_H    = 0.0330;
export const NMC_W    = 0.0300;      // ~1/9 of the front width, P1's own modelling note
export const RJ45_W   = 0.0159;
export const RJ45_H   = 0.0135;
export const LED_DIA  = 0.0030;
export const ALARM_W  = 0.0220;

// 4.0 -> 2.5 mm, and the reason is a lesson rather than a preference.
// At 4 mm the inferred layout consumed the body width EXACTLY: 445 - 8 - 437 = 0, and in
// binary that lands a hair NEGATIVE, so the fit guard fired reporting an overflow "by 0.0 mm".
// A layout that closes to the millimetre is not elegant, it is a layout with no tolerance —
// and "it did not overflow" was never the property worth asserting. There is now 3 mm of
// real slack and the guard demands 2.
export const EDGE_MARGIN = 0.0025;   // body edge to the first element
export const ZONE_GAP    = 0.0010;   // between the three zones
export const RECESS      = 0.0025;   // how deep a bay sits behind the face plane

// Left to right across the front: NMC zone, then the nine module bays, then three PSU bays.
// The ORDER is part of the inference; nothing in the evidence fixes which side the PSUs sit.
export const FRONT_Z = DEPTH / 2;
export const X0 = -BODY_W / 2;

export const NMC_X0   = X0 + EDGE_MARGIN;
export const SLOTS_X0 = NMC_X0 + NMC_W + ZONE_GAP;
export const PSUS_X0  = SLOTS_X0 + SLOT_N * SLOT_W + ZONE_GAP;
export const FRONT_USED = NMC_W + ZONE_GAP + SLOT_N * SLOT_W + ZONE_GAP + PSU_N * PSU_W;

/**
 * Assert the derivations BEFORE anything is built. Reports with console.error — never
 * console.assert, which the QA gate cannot see and which has already let a build guard pass
 * silently over floating geometry in this project.
 */
export function verifyDerivations() {
  let bad = 0;
  const fail = (m) => { console.error(`[dims] ${m}`); bad += 1; };

  if (HEIGHT > 0.04445) fail(`height ${(HEIGHT * 1000).toFixed(1)} mm exceeds the 1U envelope`);
  if (EAR_SPAN <= BODY_W) fail('the ear span is not wider than the body — it could not mount');
  // A VISIBLE flange, not merely a positive one. A subtraction landing at +0.2 mm still
  // renders a plausible chassis while describing an ear too thin to take a screw.
  if (EAR_W < 0.008) fail(`flange ${(EAR_W * 1000).toFixed(1)} mm per side has no visible margin`);

  // The layout must FIT, with margin left over — this is the one arithmetic check the
  // inferred split has to pass, and it is a consistency test, NOT a confirmation. Several
  // other splits also close.
  // A VISIBLE margin, not merely a non-negative one.
  const remaining = BODY_W - 2 * EDGE_MARGIN - FRONT_USED;
  if (remaining < 0.002) {
    fail(`front furniture leaves only ${(remaining * 1000).toFixed(2)} mm of slack in the body (floor 2 mm)`);
  }

  if (Math.max(SLOT_H, PSU_H) >= HEIGHT) fail('a bay is taller than the chassis it sits in');
  if (RJ45_W >= NMC_W) fail('the RJ45 does not fit inside its zone');
  if (RECESS >= 0.010) fail('the bay recess is deeper than the chassis can hold');
  if (DEPTH <= 10 * HEIGHT) fail('the depth-to-height ratio no longer supports the silhouette claim');

  return bad;
}

// ── Structural pass: the parts that make it a SERVICEABLE chassis ───────────────
// Every one of these is FUNCTIONALLY FORCED, which is the only reason to add geometry the
// evidence does not itemise:
//   - A hot-swap module has to come OUT. Without a grip there is no way to withdraw it, so
//     an extraction handle is not decoration, it is what makes the bay a bay.
//   - A rack ear has to take a SCREW. A flange with no hole cannot mount, and mounting is
//     the whole claim of the `rack-1u-chassis-ears` critical.
//   - Bays are separated by the chassis's own DIVIDERS. Without them the nine "slots" are
//     nine rectangles drawn on one continuous plate.
// None of this invents a COUNT or a TYPE the evidence is silent about — contrast the UPS
// rear receptacles, where both were unknown and nothing was built.
export const HANDLE_W  = 0.0180;
export const HANDLE_H  = 0.0050;
export const HANDLE_D  = 0.0035;   // how far it stands proud of the module face
export const PSU_HANDLE_W = 0.0260;

export const EAR_HOLE_D  = 0.0063;   // EIA-310 rack screw clearance
export const EAR_HOLE_N  = 2;        // a 1U ear takes two
export const EAR_HOLE_DY = 0.0159;   // 0.625 in — the EIA-310 vertical hole pitch

export const DIVIDER_W = 0.0012;     // the wall between two bays
export const DIVIDER_D = 0.0140;
