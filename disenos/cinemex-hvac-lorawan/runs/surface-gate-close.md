# SURFACE — gate close

**Asset:** 01-shell-circulation-facade
**Lineage:** 2 (surface-reset-2) · **Attempts:** 3 · **Verdict:** PASS at global **0.81** (min 0.78)
**Derivation:** `gate-state.mjs` → `surface passed (attempts 3, score 0.81)` — clean, cache matches.

## Score history of this lineage

| attempt | global | canonical-network-endpoints (thr 0.80) | verdict |
|---|---|---|---|
| 1 | 0.70 | 0.62 | fail — 4 of 5 criticals below threshold |
| 2 | 0.78 | 0.78 | fail — only canonical-network-endpoints short, by 0.02 |
| 3 | **0.81** | **0.82** | **PASS** — all five criticals clear |

Final critical scores: multiplex-plan-grammar 0.84/0.78 · auditorium-family-massing 0.78/0.76 ·
front-of-house-sequence 0.80/0.75 · canonical-network-endpoints 0.82/0.80 ·
architecture-engineering-state-pair 0.80/0.75. important_average 0.77 (floor 0.65).

## Why `canonical-network-endpoints` failed eight straight attempts across three lineages

Three lineages chased this feature by tuning annotations — arrowhead size, marker separation, label
counts. The blind judge of attempt 2 finally localized it to the model rather than the diagram, and
attempt 3 found the actual geometry bugs:

1. **The TC300 endpoints were buried by their own annotation.** Each RS-485 drop terminated in a
   `containment-orange` junction cube of 0.12 × 0.12 × 0.08 m placed at the device centre — physically
   larger than the 100 mm device it was annotating. Every judge reported "bare junction stubs" because
   that cube was all there was to see. The first node of the canonical chain had no pixels.
2. **The RS-485 green was never wrong — it was never visible.** The tray (0.24 m) and the conductor
   (0.11 m) shared a centre line, so the conductor sat *inside* the tray box. In engineering mode the
   tray is a cutaway material at 0.18 opacity, so the correctly specified `#29d67d` only ever bled
   through it and read as pale mint.

Both were fixed geometrically: the conductor is clipped to the device face with a gland cap, and the
tray is carried half a cross-section off the route so the faces touch and the green is exposed at any
media scale.

**The lesson for the ledger:** eight attempts were spent polishing a symptom because the evidence kept
being read as a styling problem. When the same critical feature fails repeatedly at a near-threshold
score, the defect is usually not in the thing being scored — it is in what that thing is annotating.

## Two build defects caught pre-review (attempt 1)

Neither was visible to the unit tests, because those tests copied the constants instead of deriving them:

- The diagram board rendered **mirrored** in every capture: `rotationY = -π/2` put the PlaneGeometry's
  +Z normal on −X while both network cameras sit at +X. Fixed to `+π/2`.
- The detail camera framed 23.8 m of the 34 m board — the UI side panel leaves a portrait canvas
  (672 × 816), so horizontal FOV binds. Camera moved to x = 90.6.

Replacement tests derive both properties (`dot(normal, board→camera) > 0`; visible width ≥ board width
× 1.08 at the real aspect). A test that copies the value it guards cannot catch a wrong value.

## Evidence retained

- `surface-attempt3.png` (canonical) + the 23-capture attempt-3 set + console sidecars.
- All review JSONs for attempts 1–3 (`surface-attempt{1,2,3}.review.json`).
- Mechanical artifacts + apply reports for all three attempts.

## Cleanup

Superseded attempt-1 and attempt-2 PNGs and console sidecars deleted (109 → 63 PNGs in the asset
directory). Every review JSON kept. Per GATES.md §Artifacts.

## Mechanical (attempt 3)

Probe median **203 draws / 39 610 tris** vs budget 550 / 750 000 (37% / 5%). Console sidecars 23/23
clean. Unit tests **125 pass / 0 fail**.

## Next

LIGHTING-CAMERA unlocks. Attempt 3's review left six non-blocking corrections (RS-485 saturation vs
emissive bloom, LoRaWAN packet-pool colour, board arrowheads on the LoRaWAN/client edges, engineering
shell ghosting, TC300 ring emissive, label distance-cull at concessions) — several are lighting-owned
and should be folded into that pass rather than reopened here.
