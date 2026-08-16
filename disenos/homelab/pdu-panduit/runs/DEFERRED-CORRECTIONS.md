# pdu-panduit — deferred corrections

## LATENT: pick() occlusion test is pass-through (do NOT reopen standalone; MUST fix at scene/library integration)

**Discovered:** 2026-08-15, during the stratix-5700 interaction-ui pass (same original interaction logic).

**The bug (in the shared original pick() logic):** the hotspot raycast walked the
intersection list and SKIPPED every hit that did not belong to a hotspot, continuing
until it found one. A ray therefore passes THROUGH solid common geometry (the housing)
and lands on a hotspot behind it — reporting a hotspot as clickable from a camera where
a solid body fully hides it.

**Why the PDU's judged result is NOT invalidated (and why we do not reopen it):**
on the PDU every occluder happens to itself be a hotspot (one strip covering another),
so `blockedBy` resolved correctly, clicks landed on the right target, and the
interaction-ui pass was judged legitimately for the behavior it actually exhibited.
The user-facing behavior is correct. What is flawed is only the ROBUSTNESS of the
probe/pick API — it would give wrong answers if a NON-hotspot body were the occluder,
which does not occur in the standalone PDU. Reopening a P6-complete asset for a
non-manifesting latent defect is disproportionate.

**Where it WILL manifest, and where the fix is therefore MANDATORY:**
1. **Scene assembly.** Once the PDU sits in the aisle beside the rack, UPS, Stratix,
   etc., neighbouring equipment becomes a NON-hotspot occluder of the PDU's hotspots —
   the exact case that makes the ray pass through. Clicking through the rack to reach a
   PDU hotspot behind it would land falsely.
2. **Library extraction.** If this interaction block is promoted to the design3d library,
   it must not carry the latent hole forward.

**The fix (already implemented and verified on stratix-5700 — port it verbatim):**
`pick()` stops at the FIRST visible surface, whatever it is (a real click cannot pass
through a solid body; if the nearest surface is not a hotspot, the click lands on
nothing). `blockedBy` now NAMES the occluder, so a probe can distinguish an OCCLUDED
hotspot from a NON-EXISTENT one. Verified camera-dependent on the Stratix: from the
front, ports/leds/terminals clickable and the rear latch blockedBy=housing_body; from
the rear, the latch/terminals clickable while ports/leds report blockedBy=housing_body.

**Decision (orchestrator):** NOTED here, PDU NOT reopened. Apply the corrected pick()
when the PDU is integrated into the scene assembly or extracted to the library, and
re-verify occlusion discrimination against the neighbouring geometry at that point.
