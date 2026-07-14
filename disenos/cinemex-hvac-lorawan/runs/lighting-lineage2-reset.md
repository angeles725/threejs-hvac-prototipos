# LIGHTING-CAMERA Reset 1 — lineage boundary

**Asset:** 01-shell-circulation-facade
**Pass:** lighting-camera
**Active lineage:** 2, attempt 1
**Reset:** lighting-reset-1
**Authorized by:** the user, after the three-attempt stop rule fired on lineage 1.

## Why a new lineage exists

Lineage 1 exhausted its three bounded attempts at global `0.71`, `0.72` and `0.77` against a
`global_min` of 0.78 — the last one short by a single hundredth. This is not attempt 4; it inherits
no score and no verdict. The exhausted lineage is preserved under `history/lighting-lineage-1/`
(all review JSONs, mechanical artifacts, apply reports, a SHA-256 inventory of every capture, and
the two decisive attempt-3 stills).

## What lineage 1 actually established — do not re-derive it

Two real defects were found and are already FIXED in the code the new lineage starts from:

1. **The r160 π bug.** Attempt 2's derived tests composed the pixel as `albedo * irradiance` with no
   `RECIPROCAL_PI`. three.js r160 runs `useLegacyLights = false`, so every reflected term passes
   through `BRDF_Lambert = RECIPROCAL_PI * diffuseColor`. The renderer was **3.14× darker than the
   test model — for lit surfaces only.** Emissives carry no π, which is exactly why the strips,
   screens and exit signs looked correct while every surface around them rendered black.
2. **`corridorHalfWidth` was 3.6** while the corridor's own walls, portal headers and door leaves
   stand at `x = ±3.72`. Every surface the corridor camera looks at was being lit six stops down, as
   auditorium.

Attempt 3 also produced a working result on four of five criticals: `multiplex-plan-grammar` 0.80,
`front-of-house-sequence` 0.84, `canonical-network-endpoints` 0.84, `architecture-engineering-state-pair`
0.80. **Those must not regress.** Only `auditorium-family-massing` (0.69 / 0.76) fails, and
`cinema-lighting-hierarchy` sits at 0.62.

## The one defect this lineage exists to fix

The auditorium's **ceiling and wall-fixture wash pools render brighter than the corridor's brightest
surface**, which INVERTS the four-tier ladder — the auditorium must be the darkest tier and is
instead competing with the corridor.

And the reason three green test suites never caught it: **the auditorium ceiling is the one surface
the luminance sidecar never sampled.** This is the same class of error that killed attempt 2 (which
sampled a wall patch directly under a fixture and declared a ladder the eye could not see), one
level up. A derived metric is only as good as its sampling.

## Reset scope

Lighting and camera only. The accepted topology, device positions and scale, RS-485 route paths,
materials palette identity and the gated surface detail plan are all untouched.

1. Cut the auditorium ceiling/wall-fixture intensity so **no auditorium surface exceeds the
   corridor's brightest surface** — the ceiling below the corridor ceiling (0.083) and below the
   auditorium wall (0.213).
2. Re-drive the auditorium so it is carved by aisle LEDs, exit signs and screen bounce ONLY; remove
   the broad ceiling/wall wash pools. The step-nosing and aisle-strip spill already works — keep it.
3. Raise the in-room exit-sign emissive / enlarge the plates in `sala-3` until they read as green EXIT
   signs in the ARCHITECTURE lights-on capture, as they already do in `eng-sala-3`.
4. Reframe the `facade` preset (thin band, ~45% empty sky, ~35% empty plaza, marquee clipped at both
   edges) and add forecourt spill — the plaza gray is currently pixel-identical in lights-on and
   lights-off.
5. Break up the smooth-plastic response the `grazing` pass exposes (vary roughness across shell panels
   and plaza).
6. Gate the lobby FLOOR on the house-light channel — the tile holds its lit value in lights-off while
   the ceiling correctly goes black.
7. Raise the engineering neutral fill per `lighting_notes.engineering`.

## Binding rule for this lineage's tests

Every zone-luminance assertion must sample the **ceiling, floor, far wall, door and — in the
auditorium — the seat block and step nosing**, explicitly including surfaces NOT under a fixture, and
must assert BOTH the tier ordering (no auditorium surface above any corridor surface) AND a minimum
value floor. An unsampled surface is an unguarded surface. Three consecutive green suites proved it.

LIGHTING-CAMERA remains locked while implementation and mechanical evidence are produced. A fresh
independent blind review is required before any pass verdict.
