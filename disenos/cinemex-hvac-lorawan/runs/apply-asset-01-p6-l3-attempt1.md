# Apply report — P6 lineage 3, attempt 1 (user-reported correction round)

Writer role only; re-gates as `p6-final-l3` on fresh captures. Scope: item 11 (z-fighting on
roofs/RTUs under rotation), item 12 (RTU master vs the Trane V10 reference), item 13 (row/column
service lanes), item 14 (duct branches + condensate drains, spec amendment PASSED P3 revalidation).

**Suite: 240 pass / 0 fail** (`node --test tests/*.test.mjs`; 234 after L2, +6 new in
`tests/p6-l3-corrections.test.mjs`). `node --check` clean on every touched file. Zero draws added
across the whole round (mesh count 121, byte-identical to L2; every new part joins an existing
instanced bucket). Smoke invariants unchanged (billboards 46, materialCount 67, roofRoutes 2).

**RED evidence.** The L3 test file fails to load against the L2 sources (`ROOF_ANTI_COPLANAR` is a
new export), and — the strong half — the item-11 scanner, run against the UNTOUCHED L2 geometry,
enumerated **299 near-coplanar face pairs**; after the constructive fixes it enumerates **0**. The
progression (299 → 104 → 64 → 16 → 0) is in this session's transcript; every class is listed below.

**Adapted assertions (L2 tests this round owns, declared):** in `tests/p6-l2-corrections.test.mjs`
— fascia count 32→28 + flush→protrude (item 11's own order); curb "exactly on plate top" →
"embedded 0.03, visibly above" (shared planes were the defect); RTU part list extended with the
item-12 sections. Zero deletions.

---

## Item 11 — z-fighting on roofs and packaged units ("los techos tiemblan")

**The property, not a hand-list** (`tests/p6-l3-corrections.test.mjs` "item 11: no two
roof-assembly boxes carry renderable near-coplanar faces"): over EVERY emitted box of the roof
assembly (all `roof`-layer instances + all `roof-service*` plant + the fan pools with their real
cylinder/torus AABBs), for every pair overlapping in the other two axes: same-side face planes
must differ by ≥ `ROOF_ANTI_COPLANAR.minPlaneSeparation` (0.005), and opposite-side faces must
never leave a sub-epsilon AIR GAP. Opposite-side contact/interpenetration is allowed — with
front-side materials a buried face never rasterizes, which is why the constructive rule is
"embed or protrude, never share" (`ROOF_ANTI_COPLANAR`, src/scene/architecture.js:138).

**What the scanner caught on L2 and how each class was fixed (by construction, no polygonOffset):**
- (b) **Fascia tops coplanar with plate tops** — the biggest offender (the L2 "flush" rule was the
  bug) → fascias protrude 0.02 (architecture.js:1734); **twin identical fascias** on equal-height
  shared borders (M|M) → skipped, there is no step to articulate (:1742-1749, count 32→28); fascia
  **corner overlaps** → x-bands stop short of the z-bands that own the corners.
- (a) **RTU stack**: curb now embeds 0.03 into the plate, cabinet 0.02 into the curb, cap/platform
  0.02 into the cabinet, fan disc into the platform, guard ring into the disc — contact by
  interpenetration at every stage (unit table around architecture.js:1780-1815).
- (c) **Seams/markings/service bands** (were 2.5 mm off their surface planes — below capture-
  distance depth precision) → all re-profiled as crossing decals: 0.02 embedded / 0.04 proud.
- **Sleeve-collar top == plenum top** (both 8.27, pre-existing) → sleeve 0.26 tall (:1051 area);
  **main's long sides flush with the plenum's** → main 0.86 wide (:1051); **kitchen sleeve curbs
  flush with the public plate top (4.72)** → curb ring [y, y+0.22]; **curb/flashing ring corner
  overlaps** → shortened ring pieces; flashing inset nudged off the exact epsilon.
- (e) **Interior ceilings flush under plates**: examined and left alone — ceiling top (up-facing)
  vs plate bottom (down-facing) is an opposite-orientation contact; only one of the two ever
  rasterizes toward a camera, so it cannot flicker, and the ceilings are gated lighting surfaces.
- (d) **Equal-height adjacent plates**: they abut exactly (zero XZ overlap), which rasterizes
  watertight; not a coplanar-overlap pair. No change.

**Risk.** The rule is enforced for the roof assembly scope the round owns; the rest of the
building was not swept (out of scope, gated). Render-judged: rotate the exterior — roofs and
units must hold still.

## Item 12 — RTU master to the V10 reference read

Read the reference render (`research/sources/web-snapshots/baked-shadows-trane-rtu-realistic-v10.png`):
long, low, two-section beige cabinet on a dark base — AH section with paneled sides and dark roof
trim; condenser section with its own top platform carrying dark fan rings with visible blades;
dark end grille. Adapted at the spec's 2.5×1.5×1.2 (≈2:1:1) with the gated palette:
- dark cap now covers the **AH section only**; the condenser end carries its own light **platform**
  (architecture.js:1793) with THE one dominant fan: dark disc + light **guard ring** + two
  **guard bars** (:1812 — parallel, z-separated: a crossing pair would share planes, item 11);
- **section divider band** (:1795), **condenser end grille** (:1800), hood + throat on the AH end,
  two panel **seams** moved onto the AH section, two **handles** (:1807);
- the condensate drain (item 14) leaves the AH-end underside — the recognition cue real units have.
Parts are boxes/pools in the existing `rtu-dark` / `rtu-cabinet` / fan buckets: **0 extra draws**
(budget allowed 2). Deterministic test: "item 12: …two-section cabinet" pins the section ordering
(hood < divider < fan < grille), fan-on-platform, cap/platform split, spec size. The resemblance
itself is render-judged: the judge should see the V10 silhouette at unit scale on every roof zone.

## Item 13 — service-lane rows and columns

`createPackagedUnitPlan` (architecture.js:~200): unit z = its plate's centre-line (derived from
plate bounds — one shared lane per plate), x unchanged (owning-TC300 lane, clamped zone∩plate).
Result: the public plate carries one six-unit ROW (was a six-value scatter); the sala units keep
their two aligned COLUMNS (x ±16) with one row per plate. Zone ownership untouched: still exactly
one unit per TC300 zone (test re-asserts 14/14). RED test "item 13: units on one plate share that
plate service lane" — fails on L2 (public units had 5 distinct z values) — also pins the
lane-from-plate-bounds derivation, the 6-unit public row, single-x columns per side, and
collision-freedom inside the lane.

## Item 14 — duct branches + condensate drains (spec `duct_branches` / `condensate_drains`)

Part vocabulary taken from the user-approved catalogs (`disenos/ducteria/…realistic-v1.html`:
TDC-flanged straights, boxy elbow fittings, strapped joints; `disenos/tuberia-hidraulica/…`:
size-stepped fittings at elbows/drops), adapted to instanced boxes at the gated palette.

- **8 branches** (`createDuctBranchPlan`, architecture.js:244; emission :1862-1940): rectangular
  galvanized runs (0.5×0.35) in the mains' own bucket (`architecture:structural-steel` → mains'
  visibility behavior in every state, 0 draws). Each: strapped **joint** on the SUPPLY main
  (out-of-span rooms get spread joint slots, 0.6 m apart per side, so no two joints stack on one
  plane), per-family **spine run** along the service band (L rooms tap the main directly; M/S
  rooms run lower and rise through a **main-riser**), **TDC seam collars** every ~4 m, a flanged
  **elbow fitting** at the turn, and a **room run** ending 0.25 m INSIDE the owning room's plate
  edge (overlap ≥ spec 0.20). Same-lane separation is per-family run heights (h−0.55) — derived,
  which is also what satisfies item 11.
- **14 drains** (`createCondensateDrainPlan`, :307; emission :1826-1860): 0.06 outlet **riser**
  whose top coincides with the `unit_condensate_outlet` socket, 0.04 **plate run** embedded 0.01
  into the plate (attached, never floating, never coplanar), 0.06 **trap** dropping ≥0.15 through
  the plate at the plate's drain lane (bounds.z[0]+0.3, derived). `rtu-dark` bucket, roof layer
  (hides with Techo/eng roof=off like the units). 0 draws.
- RED tests: "item 14: eight branches…" (8/8 auditoriums exactly once; socket carried by a branch
  box; every branch overlaps the supply system and never the return main; no branch fouls an RTU)
  and "item 14: fourteen condensate drains…" (14/14 units exactly once; riser-top == socket; run
  embedded on and reaching the lane; trap overlap ≥0.15; no fouling of plant or any cabinet except
  the own-cabinet outlet attachment). The item-11 scanner covers both systems' coplanarity.

**Risks.** The branches are visible in the architecture state exactly like the mains (spec text:
"only if the mains already hide there" — they don't). They add roofscape density along the spine;
the L2 LOS preset tests re-ran green with branches and drains as occluders, so no gated view lost
its subject.

---

## The ONE riskiest thing for the blind judge to scrutinize

**Item 13 + 14 together re-arrange the public-band roofscape into one dense service row.** Six
units now stand on one lane (z = 16.5) with six parallel condensate runs crossing the plate toward
the z = 10.8 drain lane, over a plate that also carries the kitchen sleeve and five seam lines.
Nearest units sit 4.3 m apart — derived and collision-checked — but if the judge reads that row
as crowding (or the drain lines as clutter), it lands on `multiplex-plan-grammar` at the
neutral/facade views. Pre-look exactly: the neutral capture's public band — six aligned units,
one thin drain line each, marquee still dominant.

## Not verified in pixels

No WebGL here. The z-fighting fix is proven by an exhaustive derived property over the emitted
geometry (the exact flicker mechanism: renderable near-coplanar face pairs), not by a rotating
capture — the judge should orbit the exterior and the RTU close-ups to confirm stillness.
