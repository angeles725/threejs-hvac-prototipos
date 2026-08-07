# Block 45 — Robust polygon offsetting + straight skeleton: the maths behind wall-union and corner/roof closure

> Research of **2D polygon offsetting (Minkowski-with-disk) and the straight skeleton**, the two
> numerical-geometry methods that a Three.js *build tool* needs to turn wall centrelines/footprints
> into clean single solids — closing corners, T- and X-junctions, and pitched roofs — instead of
> letting boxes interpenetrate. RUN 9 opener (new axis: algorithmic/procedural generation + numerical
> methods for better 3D design tools). Covers the equations, the mature JS libraries with their
> licence/robustness status, the numerical caveats, and an actionable recommendation for the
> `nave-panccadia` build tool. It does NOT cover CSG on 3D solids (three-bvh-csg → G60), triangulation
> of polygons-with-holes (earcut/CDT → G61), or isosurfaces (→ G63).
>
> Subject version: nave-panccadia-3d-v18.html @ commit 55240ca (2026) · Clipper2 (angusj.com, docs
> retrieved 2026-08-07) · js-angusj-clipper (Clipper1 port) · clipper2-wasm v0.4.0 · StrandedKitty/
> straight-skeleton (CGAL WASM) · polygon-clipping (Martinez) — all queried 2026-08-07.
>
> Sources: `disenos/nave-panccadia/nave-panccadia-3d-v18.html` (local build tool, `file:line`) ·
> `sources/web-snapshots/angusj.com_clipper2_Overview_2026-08-07.md` ·
> `sources/web-snapshots/angusj.com_clipper2_InflatePaths_2026-08-07.md` ·
> `sources/web-snapshots/en.wikipedia.org_Straight_skeleton_2026-08-07.md` ·
> `sources/web-snapshots/github_strandedkitty_straight-skeleton_2026-08-07.md` ·
> `sources/web-snapshots/npm_clipper2-wasm_polygon-clipping_js-clippers_2026-08-07.md`.
> Method: local reading of the build tool + WebSearch/WebFetch over official docs (angusj.com,
> Wikipedia, GitHub, npm), preserved to `sources/` before citing. Markers (METHODOLOGY §3):
> `[CERT]` local `file:line` · `[CERT-web]` official web (URL+date, snapshot) · `[CERT-a]` forum/
> secondary · `[INFER]` deduction.

---

## 45.1 — The gap in the current build tool: union-find over parallel runs is NOT a polygon union `[CERT]`

The `nave-panccadia` tool already fights the exact problem this block is about: overlapping wall
runs "shimmer for the whole length of the overlap" because coincident solids have no depth ordering,
and boxes interpenetrate "at every corner, T and X junction — the interpenetration the operator asked
to be rid of" `[CERT]` `nave-panccadia-3d-v18.html:388-391,506-508`.

Its current fix is a **hand-rolled pairwise collapse**, not a general polygon boolean:

| Step | What it does | Citation |
|---|---|---|
| `wallOverlapPairs(walls)` | O(n²) scan; two runs pair only if **parallel within 5°** (`|ux1·uy2 − uy1·ux2| > 0.087` rejects), **lateral gap < mean thickness**, and **> 5 cm shared projected overlap** | `nave-panccadia-3d-v18.html:400-424` |
| `collapseWalls(walls)` | **union-find** groups the pairs (not pairwise merge, so triple-drawn runs fold correctly), then rebuilds one centreline per cluster from a length-weighted mean bearing + the lateral spread as thickness | `:428-487` |
| explicit non-goal | "A corner touch and a crossing junction are ordinary fabric and are **NOT** collapsed" | `:398-399` |

So the tool solves **collinear duplicate/face-twin runs** (15 pairs downstairs, 38 up `[CERT]`
`:392-394`) but by construction leaves every genuine **corner/T/X junction** as interpenetrating
boxes. That residue is precisely what a true 2D polygon **union** (§45.3) removes, and a pitched
roof over the footprint is what a **straight skeleton** (§45.4) produces. The tool even notes it uses
"the mergeGeometries pattern from the three.js floor-plan examples" to draw one merged wall mesh
`[CERT]` `:526-528` — merging geometry hides the *inter-mesh seam*, but it does NOT resolve the
*solid interpenetration* at a corner; only a boolean union of the footprint does. `[INFER]`

## 45.2 — Polygon offsetting: the Minkowski-sum-with-a-disk and its join types `[CERT-web]` / `[INFER]`

Offsetting (a.k.a. infla­ting/buffering) a polygon by δ is the **Minkowski sum of the polygon with a
disk of radius δ** (δ<0 shrinks). Concretely each edge translates outward by δ along its outward
normal; the open question is how to fill the wedge at each convex vertex where two translated edges
no longer meet. That choice is the **join type** `[INFER]` (standard computational-geometry result;
the concrete API below is `[CERT-web]`):

| JoinType (Clipper2) | Fill at a convex vertex | Value |
|---|---|---|
| `Round` | circular arc of radius δ (the exact Minkowski boundary) | 2 |
| `Miter` | extend both edges to their intersection (sharp corner) | 3 |
| `Square` | 45° chamfer at edge distance | 0 |
| `Bevel` | straight chamfer joining the two offset endpoints | 1 |

`[CERT-web]` `sources/web-snapshots/angusj.com_clipper2_InflatePaths_2026-08-07.md` (enum values from
the Clipper2 offsetting docs / `clipper.export.h`).

**Miter limit — the acute-angle blow-up.** A pure miter at a near-0° reflex angle shoots the
intersection point to infinity (a spike). Clipper2's `InflatePaths(paths, delta, join_type, end_type,
miter_limit = 2.0, arc_tolerance = 0.0)` caps this: "The miter_limit parameter (default 2.0) controls
how far miter joins extend before becoming beveled. If `cos(angle) <= temp_lim_ - 1`, the miter is
too acute and `DoSquare()` is used instead of `DoMiter()`." `[CERT-web]`
`angusj.com_clipper2_InflatePaths_2026-08-07.md`. The 26.2% oblique geometry in the nave plan
`[CERT]` `nave-panccadia-3d-v18.html:491` is exactly where an uncapped miter would misbehave, so this
default matters for this corpus. `[INFER]`

`EndType` (Polygon / Joined / Butt / Square / Round) decides whether the path is treated as a closed
area or an open polyline to be stroked — a **wall centreline with a thickness is an open path offset
by half-thickness with `EndType.Butt`/`Square`**, which is the direct replacement for the tool's
manual "centreline a→b + thickness → box" step. `[INFER]` (API surface `[CERT-web]`,
`angusj.com_clipper2_InflatePaths_2026-08-07.md`).

## 45.3 — Boolean union + the integer-coordinate robustness trick `[CERT-web]`

To merge the offset wall solids into one clean footprint you need a polygon **boolean union**.
Clipper2 "performs line and polygon clipping, offsetting and triangulating" and "is based on but
significantly extends Bala Vatti's polygon clipping algorithm" (CACM Vol 35, 1992) `[CERT-web]`
`angusj.com_clipper2_Overview_2026-08-07.md`. Vatti is a **sweep-line** algorithm handling
self-intersecting and holed polygons — the general case the union-find collapse cannot express.

The load-bearing numerical lesson: **Clipper does the boolean maths on integers.**
> "both these classes still perform clipping operations using integer coordinates internally. This is
> to ensure numerical robustness. Because of this, ClipperD performs double / integer conversions
> before and after clipping (by scaling and de-scaling coordinates using the specified decimal
> precision)." `[CERT-web]` `angusj.com_clipper2_Overview_2026-08-07.md`

This is the single most important caveat for a build tool: exact predicates on scaled integers avoid
the sweep-line round-off failures that plague naïve floating-point clippers. The pure-JS Martinez
library (`polygon-clipping`) is the counter-example — it runs in floating point and its own docs ship
loop-caps (`POLYGON_CLIPPING_MAX_QUEUE_SIZE`, `POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS`, default
1,000,000) that "aim to prevent infinite loops usually caused by floating-point math round-off
errors" `[CERT-web]` `npm_clipper2-wasm_polygon-clipping_js-clippers_2026-08-07.md`. A cap is a guard,
not a fix: coincident/near-coincident edges (exactly the nave's face-twins, 2-9 cm apart `[CERT]`
`nave-panccadia-3d-v18.html:392-394`) are where FP clippers break. **Snapping/quantising the input to
an integer grid before the boolean is therefore not optional cosmetics — it is the robustness
mechanism.** `[INFER]`

## 45.4 — Straight skeleton: the wavefront, its two events, and the roof lift `[CERT-web]`

For **corners and roofs**, the straight skeleton is the right primitive. Definition (wavefront /
grassfire, self-parallel motion):
> "The edges of the polygon are moved inwards parallel to themselves at a constant speed. As the
> edges move in this way, the vertices where pairs of edges meet also move, at speeds that depend on
> the angle of the vertex." `[CERT-web]` `en.wikipedia.org_Straight_skeleton_2026-08-07.md`

Because each moving vertex stays on the **angular bisector** of its two edges, the traced segments are
straight — this is what makes the skeleton "straight" (all segments, no arcs), unlike the medial axis
whose reflex-vertex traces are parabolic. `[INFER]` (bisector/parabola contrast is standard;
first defined "for simple polygons by Aichholzer et al. (1995)" `[CERT-web]`, same snapshot).

**Two events drive the simulation** (the discrete-event core any implementation must handle):
- **Edge event** — a wavefront edge shrinks to zero length and vanishes; the polygon loses an edge.
- **Split event** — a reflex vertex reaches a non-incident edge and splits the wavefront in two:
  "if one of these moving vertices collides with a nonadjacent edge, the polygon is split in two by
  the collision, and the process continues in each part." `[CERT-web]`
  `en.wikipedia.org_Straight_skeleton_2026-08-07.md` (the split mechanism is quoted verbatim; the
  labels "edge/split event" are the standard Aichholzer/Felkel terminology — snapshot notes this).

**The roof application is a free 3-D lift** — this is the direct answer to the nave's flat-roof
placeholder:
> "Each point within the input polygon can be lifted into three-dimensional space by using the time
> at which the shrinking process reaches that point as the z-coordinate. The resulting
> three-dimensional surface has constant height on the edges of the polygon, and rises at constant
> slope from them." `[CERT-web]` `en.wikipedia.org_Straight_skeleton_2026-08-07.md`

So `roof_height(point) = slope · time_reached(point)`, and each skeleton face is a planar roof
facet of constant pitch — a hip/gable roof over an arbitrary footprint, holes included, with no
per-building modelling. `[INFER]` The same wavefront, sampled at fixed times instead of run to
completion, yields **mitred inset/offset polygons** (concentric footprints) — which is why the
straight-skeleton and polygon-offset problems are two readings of one construction. `[INFER]`

## 45.5 — Mature JavaScript libraries: status, licence, fit `[CERT-web]` / `[CERT-a]`

| Library | Does | Coords / engine | Licence | Maintained? | Fit for the build tool |
|---|---|---|---|---|---|
| **clipper2-wasm** (ErikSom) | Clipper2 union/clip/**offset** | integer-internal, WASM | Boost SW 1.0 | v0.4.0, ~2 mo before 2026-08-07 — **yes** | **Recommended**: current Clipper2, robust, offset+union in one dep `[CERT-web]` |
| **js-angusj-clipper** (xaviergonz) | Clipper**1** union/clip/offset | **integer required**, WASM + asm.js fallback | MIT (repo LICENSE) | mature, older | Solid, but Clipper1 API; you must scale to ints yourself `[CERT-web]` |
| **clipper2-ts** (J. Tribby) | Clipper2 clip/offset/triangulate | pure TS (no WASM) | (Clipper2-derived) | port exists | No WASM/build step; useful if avoiding `.wasm` fetch `[CERT-web]` |
| **polygon-clipping** (mfogel) | Martinez union/∩/∖/xor, holes | **floating point** | MIT | popular | Pure JS, easy — but FP round-off risk on coincident edges (§45.3) `[CERT-web]` |
| **polygon-offset** (npm) | offset via Martinez, ~14 kb | floating point | — | leaflet-oriented | Light offset only; inherits Martinez FP caveat `[CERT-a]` |
| **StrandedKitty/straight-skeleton** | **straight skeleton** + offset, holes | CGAL via WASM | MIT | small (~23 commits) | Only maintained JS **skeleton/roof** option; GeoJSON in, outer-ring-first `[CERT-web]` |

`[CERT-web]` rows: `npm_clipper2-wasm_polygon-clipping_js-clippers_2026-08-07.md` +
`github_strandedkitty_straight-skeleton_2026-08-07.md`. Licences: Clipper2 = Boost Software License
1.0 (corroborated across the Clipper2 repo/rust-binding). `[CERT-web]`

Honest negatives: there is **no** widely-adopted, actively-maintained *pure-JS* straight-skeleton
that handles holes robustly — the only real option wraps CGAL in WASM (a `.wasm` payload + CGAL's
GPL/commercial licensing applies to CGAL itself, though this wrapper is MIT-labelled; verify CGAL
component licences before shipping). `[INFER]` The pure-JS boolean libraries (Martinez family) are
mature but trade the integer-robustness guarantee for convenience. `[INFER]`

## 45.6 — Actionable recommendation for the `nave-panccadia` build tool `[INFER]`

1. **Replace `collapseWalls` union-find with a real 2D union.** Offset each wall centreline to a
   closed band (`InflatePaths`, `EndType.Butt`, δ = t/2, `Miter` + default `miter_limit 2.0`), then
   **union all bands** (Clipper2). This dissolves corners, T- and X-junctions in one pass — the
   residue §45.1 leaves — instead of only collinear duplicates. Keep the raw runs for the downstream
   measurers (leaf clip, H0 dedup) exactly as the tool already does `[CERT]` `:494-499`. `[INFER]`
2. **Snap to an integer grid first** (e.g. ×1000 → mm) so the boolean runs on the robust integer
   path; this also folds the 2-9 cm face-twins deterministically. `[INFER]` (grounded in §45.3
   `[CERT-web]`).
3. **Dependency:** `clipper2-wasm` (Boost SW 1.0, current, offset+union in one) is the lowest-risk
   choice; `polygon-clipping` only if a no-WASM pure-JS dep is mandatory and inputs are pre-snapped.
   `[INFER]`
4. **Roof:** feed the unioned footprint to `StrandedKitty/straight-skeleton`; lift each skeleton face
   by `slope · time` for a real hip roof over the chamfered outline, replacing the flat roof level.
   `[INFER]` (mechanism `[CERT-web]` §45.4).
5. Extrude the unioned 2D footprint to wall height with the corpus's own `ExtrudeGeometry`
   `shapeFrom()` path `[CERT]` `:356-381` — the union changes the *shape*, not the rendering.

## 45.7 — Connections

- **[Block 8]** — the realistic-stage geometry toolkit (`Shape`/`ExtrudeGeometry`, `bevelEnabled`
  footgun): §45.6 feeds a *cleaner* Shape into that same extrude path.
- **[Block 32]** — buildings/BIM: the corpus's existing floor-plan-to-3D technique (per-room `Shape`
  + box-stacked walls with door cuts) is the axis-aligned predecessor to a offset+union footprint;
  this block gives the robust general-polygon method it lacked.
- **[Block 2] / [Block 11]** — `mergeGeometries`/BatchedMesh: the nave draws one merged wall mesh via
  that pattern `[CERT]` `:526-528`; §45.1 clarifies merging hides seams but does not resolve solid
  interpenetration — the union does.
- **RUN 9 forward gaps** — G60 (three-bvh-csg boolean CSG on 3D solids), G61 (CDT vs earcut for
  triangulating polygons-with-holes, the cap step here), G63 (marching cubes / dual contouring).
