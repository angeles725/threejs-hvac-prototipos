// dims.mjs — every dimension the build uses, derived ONCE from the spec (P4 BLOCKOUT).
//
// WHY THIS IS A MODULE AND NOT A HANDFUL OF CONSTANTS IN THE BUILDER.
// A derived dimension is a small subtraction that nobody re-reads, and this project has
// already shipped one that went NEGATIVE and still rendered a plausible object. Putting the
// derivation in one place, next to the assertion that guards it, is the only arrangement
// where the guard cannot drift away from the value it guards.
//
// PROVENANCE, restated because it governs how these numbers may be used:
// every published figure here is the AXIS M3085-V's, and the installed unit is NOT known to
// be an M3085-V — only that its OUI belongs to Axis. The figures are [CERT-doc]; their
// APPLICABILITY to this object is [INFER]. See design-spec.yaml.

// ── Published (M3085-V datasheet, used as declared placeholder sizing) ───────────
export const MOUNT_BASE_DIA = 0.1010;   // trim-ring / ceiling cutout diameter
export const BUBBLE_DIA     = 0.0790;   // clear bubble diameter at the base plane
export const TOTAL_H        = 0.0560;   // ceiling plane to bubble apex
export const MASS_KG        = 0.150;

// ── Derived ─────────────────────────────────────────────────────────────────────
// The datasheet publishes the TOTAL height and the bubble diameter. It does NOT publish how
// the 56 mm splits between the base ring and the bubble. Treating the bubble as a TRUE
// HEMISPHERE is the one assumption that makes the junction tangential — the bubble wall
// meets the base plane at 90 degrees, which is how a moulded dome seats into its ring.
export const BUBBLE_H = BUBBLE_DIA / 2;          // 39.5 mm
export const BASE_H   = TOTAL_H - BUBBLE_H;      // 16.5 mm

// The base splits again, and this part is a MODELLING CHOICE, not a measurement: a trim ring
// covers a ceiling cutout, so by definition it overhangs the body it collars. Making the
// collar a separate, slightly wider disc is what turns `mount-trim-ring` into something a
// judge can actually see rather than an edge you have to be told about.
export const RING_H    = 0.0040;
export const BODY_H    = BASE_H - RING_H;        // 12.5 mm
export const BODY_DIA  = 0.0970;                 // 2 mm narrower per side than the ring

// ── Interior (functionally forced; dimensionally NOT sourced) ────────────────────
export const SHROUD_MOUTH_DIA = 0.0620;
// 40 -> 44 mm. Worked out before building rather than after: at a 22 deg tilt the module's
// far edge reaches 17.3 mm off-axis where the shroud mouth ends, against a 20 mm opening —
// 2.7 mm of clearance, which is the kind of margin that disappears the first time the tilt
// range is widened. The cone opens instead.
export const SHROUD_TIP_DIA   = 0.0440;
export const SHROUD_H         = 0.0165;
export const LENS_MODULE_DIA  = 0.0300;
export const LENS_MODULE_LEN  = 0.0220;
export const LENS_GLASS_DIA   = 0.0140;
export const LENS_TILT_DEG    = 22;              // default pose — off-axis ON PURPOSE
// 0 -> 35 degrees, matching the hero azimuth. An indoor dome points down the aisle it
// watches; the hero stands in that aisle. Spec confidence for this value is `low`, which
// pre-authorises the refinement.
export const LENS_PAN_DEG     = 35;
export const LED_DIA          = 0.0035;

// ── Structural pass: the parts that HOLD things ─────────────────────────────────
// A tiltable module has to hang from something. At blockout the lens assembly was parented
// straight to the root and sat in the middle of the shroud touching nothing at all — the
// cradle was a transform, not a bracket. A yoke is what a real fixed dome uses: two arms
// dropping from the base plate to a pair of trunnions that ARE the tilt axis.
export const YOKE_ARM_X   = 0.0160;   // arm centreline, just outside the barrel's 15 mm
export const YOKE_ARM_W   = 0.0040;
export const YOKE_ARM_T   = 0.0025;
export const YOKE_DROP    = 0.0085;   // base plate down to the tilt axis, incl. 0.5 mm embed
export const TRUNNION_R   = 0.0020;
export const TRUNNION_LEN = 0.0022;

// The bubble's rim has to MEET the base, not merely end where the base ends. A gasket is the
// part that does it on a real dome, and it turns a coplanar abutment into a seated joint.
export const GASKET_H     = 0.0022;
export const GASKET_T     = 0.0016;

// ── Frame of reference ──────────────────────────────────────────────────────────
// ORIGIN IS THE CEILING PLANE. +y is up, into the ceiling. Everything hangs at NEGATIVE y.
// This is not a stylistic choice: an indoor mini-dome is ceiling-mounted, and a model built
// bubble-up is a well-made picture of the wrong object.
export const CEILING_Y   = 0.0;
export const BASE_BOTTOM = -BASE_H;              // where the bubble's equator sits
export const APEX_Y      = -TOTAL_H;             // lowest point of the whole asset
export const BUBBLE_R    = BUBBLE_DIA / 2;

/** Bubble radius at a given world y — the hemisphere's own profile. */
export function bubbleRadiusAt(y) {
  const dy = Math.abs(y - BASE_BOTTOM);
  const rr = BUBBLE_R * BUBBLE_R - dy * dy;
  return rr <= 0 ? 0 : Math.sqrt(rr);
}

/**
 * Assert the derivations BEFORE anything is built. Returns the number of failures and
 * reports with console.error — never console.assert, which the QA gate cannot see and which
 * has already let a build guard pass silently over floating geometry in this project.
 */
export function verifyDerivations() {
  let bad = 0;
  const fail = (msg) => { console.error(`[dims] ${msg}`); bad += 1; };

  if (Math.abs((BASE_H + BUBBLE_H) - TOTAL_H) > 1e-9) {
    fail(`height split does not close: ${BASE_H} + ${BUBBLE_H} != ${TOTAL_H}`);
  }
  // A VISIBLE MARGIN, not merely a positive sign. A subtraction that lands at +0.2 mm still
  // renders a plausible dome while describing a ceiling ring thinner than its own flange.
  // "It didn't go negative" is not the property worth asserting.
  if (BASE_H <= 0.008) {
    fail(`base_h ${(BASE_H * 1000).toFixed(1)} mm has no visible margin (floor 8 mm)`);
  }
  if (BODY_H <= 0.004) {
    fail(`body_h ${(BODY_H * 1000).toFixed(1)} mm collapsed under the trim ring`);
  }
  if (MOUNT_BASE_DIA <= BUBBLE_DIA) {
    fail('trim ring is not wider than the bubble — nothing would read as a collar');
  }
  if (BODY_DIA >= MOUNT_BASE_DIA) {
    fail('body is not narrower than the ring — the collar would not be visible');
  }
  // Interior parts must fit the hemisphere AT THEIR OWN DEPTH. Fitting inside the overall
  // envelope is a much weaker claim and is exactly the check that missed a part hanging
  // outside the chassis on the sibling asset.
  const at = (label, y, dia) => {
    const r = bubbleRadiusAt(y);
    if (dia / 2 >= r) {
      fail(`${label} (r ${(dia / 2 * 1000).toFixed(1)} mm) does not fit the bubble ` +
           `(r ${(r * 1000).toFixed(1)} mm) at y ${(y * 1000).toFixed(1)} mm`);
    }
  };
  at('shroud mouth', BASE_BOTTOM, SHROUD_MOUTH_DIA);
  at('shroud tip', BASE_BOTTOM - SHROUD_H, SHROUD_TIP_DIA);
  at('lens module', BASE_BOTTOM - SHROUD_H - LENS_MODULE_DIA / 2, LENS_MODULE_DIA);

  // Orientation is a dimension too, and it is the one a bubble-up model gets wrong.
  if (APEX_Y >= CEILING_Y) fail('the apex is not below the ceiling plane — the dome is inverted');

  return bad;
}

// ── Tessellation, DERIVED FROM THE CAPTURE RESOLUTION ────────────────────────────
//
// This subject spends its triangle budget on CURVATURE, not on part count, so the question
// an optimization pass must answer is not "what is duplicated?" but "at the resolution we
// are judged at, can you SEE the polygons?" — which is computable.
//
// A circle of radius R approximated by N segments deviates from the true arc by
// R(1 - cos(pi/N)) at each chord's midpoint. Times the on-screen pixels-per-metre, that is
// the faceting error in PIXELS.
//
// Measured on the tightest capture state (dpr4, `under`): the subject spans 19891 px/m. At
// 64 segments the trim ring showed 1.21 px of faceting and the body 1.16 px — VISIBLE
// polygonal silhouette on the two largest circles in the asset, while the whole build sat at
// 1.9% of its triangle budget. So the correct optimization here RAISES tessellation. The
// spec anticipated this and said so: segments are the thing to protect, and the pass must
// not reclaim them by decimating the bubble.
export const CAPTURE_PX_PER_M = 19891;

/** Segments needed to keep faceting under `maxPx` at the capture resolution. */
export function arcSegments(R, maxPx = 0.5) {
  if (R <= 0) return 1;
  const need = maxPx / (R * CAPTURE_PX_PER_M);      // required 1 - cos(pi/N)
  if (need >= 1) return 16;
  const n = Math.PI / Math.acos(1 - need);
  // Round up to a multiple of 8 for clean UV seams, and clamp: 16 is the floor below which
  // even a tiny part reads as a polygon, 160 the ceiling past which nothing is gained.
  return Math.min(160, Math.max(16, Math.ceil(n / 8) * 8));
}
