# ups-panduit — deferred corrections

## LATENT: rear_fan_ring shows visible faceting at hero-view distance (do NOT reopen standalone)

**Discovered:** 2026-08-16, during the scene-aisle optimization pass, by measuring sagitta
in pixels across every curved piece of geometry in the assembled scene.

**The finding:** `rear_fan_ring` is built with `radialSegments = 8` at `r = 36 mm`. Sagitta —
the flat-spot depth of a polygonal approximation to a circle — is `R · (1 − cos(π/N))`, which
at 8 segments is 2.7 mm. Projected at dpr 3 from the scene's hero-rack camera at 2.28 m, that
is **2.11 px** of visible flat spot: the ring reads as an octagon rather than a circle. From
the aisle camera at 4.42 m it falls to 1.79 px, which is borderline. Every other curved piece
of environment geometry in the scene measures under 1 px and is genuinely invisible.

**Why the UPS's judged result is NOT invalidated (and why we do not reopen it):**

- The UPS was judged as a standalone asset, where its own framing places the camera further
  from the rear panel than the scene's hero view does, and where the rear ring is not the
  subject. The pass was judged legitimately for the geometry it actually exhibited.
- The part is on the REAR panel. In the assembled scene it is inside a cabinet, behind a
  glass door, and never the focus of either published view.
- Reopening a P6-complete asset for a sub-3-pixel cosmetic finding is disproportionate.

**Budget context — this is a cheap fix whenever the UPS is next opened for another reason:**
the assembled scene runs at 523 draws of 1200 (44%) and 32156 triangles of 200000 (16.1%).
Raising the ring from 8 to 20 segments costs on the order of 24 extra triangles and would put
the sagitta under 0.35 px. There is no budget argument for leaving it at 8; there is only a
proportionality argument for not reopening a closed asset today.

**If fixed:** `radialSegments: 8 → 20` on `rear_fan_ring`, then re-verify that the UPS's own
guards and framing are unchanged.

---

## Note on scope

Recorded from the scene, not fixed in the scene. The scene may SELECT from an asset's
declared options (it does this for `FRAME_VARIANTS`, `LED_COLORS` and the door variants) but
it does not alter an asset's geometry — a scene that edits its devices stops being evidence
that those devices work.
