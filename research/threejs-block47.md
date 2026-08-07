# Block 47 — Triangulating a footprint's cap/floor: earcut (Three.js's built-in) vs Constrained Delaunay, the math, the JS libraries, and when each pays

> Research of the **triangulation step** that turns a 2D footprint (a wall band, a slab, an
> extruded `Shape`) into the flat cap/floor faces of a solid. Establishes, from the Three.js source,
> that `ShapeGeometry`/`ExtrudeGeometry` triangulate through **`ShapeUtils.triangulateShape` → a port
> of Mapbox `earcut`** (an ear-slicing algorithm, NOT Delaunay). Covers the MATH of both families —
> ear-clipping (two-ears theorem) vs Constrained Delaunay Triangulation (empty-circumcircle property,
> the `orient2d`/`incircle` predicates, edge-flip legalization, why CDT avoids sliver triangles) —
> then an HONEST comparison of the mature JS CDT libraries (**poly2tri**, **cdt2d**), and ends with the
> actionable rule: **when earcut is enough for a build tool, and when CDT (or earcut's own Delaunay
> `refine()`) earns its cost**. RUN 9, third block (axis: algorithmic/numerical methods for better
> design tools). It does NOT re-cover 2D polygon offset/union ([Block 45] / G59), 3D mesh CSG
> ([Block 46] / G60 — whose `useCDTClipping` is the 3D face of THIS gap), or exact geometric
> predicates in general (→ G65, which this block repeatedly points at as the shared root cause).
>
> Subject version: three.js `dev` branch — `src/extras/ShapeUtils.js` + `src/extras/Earcut.js`
> (retrieved 2026-08-07) · Mapbox **earcut** `main` (README + package.json, ISC) · **poly2tri**
> (jhasse C++ / r3mi JS port, BSD-3) · **cdt2d** v-`master` (Mikola Lysenko, MIT) ·
> **robust-predicates** (mourner, Unlicense) · local build tool
> `disenos/nave-panccadia/nave-panccadia-3d-v18.html` @ commit 55240ca.
>
> Sources: `sources/web-snapshots/github_mrdoob_threejs_ShapeUtils_2026-08-07` ·
> `sources/web-snapshots/github_mrdoob_threejs_Earcut_2026-08-07` ·
> `sources/web-snapshots/github_mapbox_earcut_README_2026-08-07` ·
> `sources/web-snapshots/github_mapbox_earcut_packagejson_2026-08-07` ·
> `sources/web-snapshots/github_jhasse_poly2tri_README_2026-08-07` ·
> `sources/web-snapshots/github_r3mi_poly2trijs_README_2026-08-07` ·
> `sources/web-snapshots/github_mikolalysenko_cdt2d_README_2026-08-07` ·
> `sources/web-snapshots/github_mikolalysenko_cdt2d_packagejson_2026-08-07` ·
> `sources/web-snapshots/github_mourner_robust-predicates_README_2026-08-07` ·
> `disenos/nave-panccadia/nave-panccadia-3d-v18.html` (local, `file:line`).
> Method: WebFetch over the official repos, preserved to `sources/` (sha256-registered) BEFORE citing;
> local reading of the build tool. Markers (METHODOLOGY §3): `[CERT]` local `file:line` · `[CERT-web]`
> official web (URL+date, snapshot) · `[CERT-a]` secondary · `[INFER]` deduction (textbook geometry
> stated without a per-line citation). Block type: **DESIGN/APPLIED** (an algorithm + library
> evaluation + a build-tool rule) — a high `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an
> exhaustion signal.

---

## 47.1 — What Three.js actually does today: `ShapeUtils.triangulateShape` → earcut (NOT Delaunay) `[CERT-web]`

The load-bearing structural claim, verified in the source. Every filled 2D `Shape` in Three.js —
`ShapeGeometry` (flat) and the caps of `ExtrudeGeometry` (footprint top/bottom) — is triangulated by
one function, `ShapeUtils.triangulateShape( contour, holes )`. Its body flattens the contour and holes
into earcut's expected layout and calls earcut directly:

```
const triangles = Earcut.triangulate( vertices, holeIndices );
```
`[CERT-web]` `github_mrdoob_threejs_ShapeUtils_2026-08-07:75` (the whole function is `:50-87`; it
builds a flat `[x0,y0,x1,y1,…]` vertex array `:52,103-112` and a `holeIndices` array `:53,61-71`,
exactly earcut's input format).

`Earcut` in the Three.js tree is a **thin wrapper over a vendored port of Mapbox earcut** — its own
docstring says so: "An implementation of the earcut polygon triangulation algorithm. The code is a
port of [mapbox/earcut]." `[CERT-web]` `github_mrdoob_threejs_Earcut_2026-08-07:3-6`; the wrapper's
`triangulate(data, holeIndices, dim = 2)` just returns `earcut(data, holeIndices, dim)` `:20-22`.
Mapbox confirms the relationship from its side: earcut "is now also used by Three.js and many other
projects." `[CERT-web]` `github_mapbox_earcut_README_2026-08-07:14`.

**Consequence for the corpus's build tool.** The nave `ExtrudeGeometry` path documented in [Block 46]
§46.6 (8 call sites) therefore triangulates its every wall/slab cap through earcut — verified locally:
`nave-panccadia-3d-v18.html` has 7 `new THREE.ExtrudeGeometry(shapeFrom(...))` sites
(`:368,866,1005,1032,1355,1404,1511`) and **zero** explicit `earcut`/`cdt2d`/`poly2tri`/`useCDTClipping`
references (grep = 0) `[CERT]` `nave-panccadia-3d-v18.html` (grep, 2026-08-07). The triangulator is
inherited from Three.js, not chosen — which is exactly why the §47.5 decision matters: switching it is a
deliberate act, not a default.

## 47.2 — The math of ear-clipping (what earcut is) `[CERT-web]` / `[INFER]`

**Two-ears theorem (Meisters, 1975).** An *ear* of a simple polygon is a vertex `v` whose two
neighbours `u,w` form a triangle `uvw` that lies entirely inside the polygon and contains no other
vertex. The theorem: every simple polygon with `n ≥ 4` vertices has at least two non-overlapping ears.
Ear-clipping exploits this — find an ear, emit triangle `uvw`, delete `v`, repeat — producing exactly
**`n − 2` triangles** for a simple `n`-gon. `[INFER]` (textbook computational geometry; the algorithm
family and its two canonical references are named by the source below).

earcut is a **"modified ear slicing algorithm"** `[CERT-web]`
`github_mapbox_earcut_README_2026-08-07:27`, based explicitly on Martin Held's **FIST** ("Fast
Industrial-Strength Triangulation of Polygons") and David Eberly's "Triangulation by Ear Clipping"
`:33-35`. It adds four engineering layers over the textbook O(n²) loop `[CERT-web]` `:27-31`:

| Layer | What it buys | Marker |
|---|---|---|
| **z-order (Morton) curve + spatial hashing** | the point-in-ear test only checks nearby vertices, not all → near-linear on real data `[CERT-web]` `:28` | z-order = `[CERT-web]`; near-linear = `[INFER]` |
| **hole handling by bridging** | each hole ring is joined to the outer ring by a two-way "bridge" edge, turning a holed polygon into one simple ring earcut can slice; this is why `triangulateShape` concatenates hole vertices and passes `holeIndices` (§47.1) `[CERT-web]` `:29,88-89` | mechanism = `[INFER]`; hole-index API = `[CERT-web]` |
| **degeneracy/self-intersection tolerance** | "handles holes, twisted polygons, degeneracies and self-intersections in a way that doesn't _guarantee_ correctness … but attempts to always produce acceptable results" `[CERT-web]` `:29-31` | `[CERT-web]` |
| optional **`refine()` Delaunay pass** | see §47.3 — legalizes interior edges with Delaunay flips `[CERT-web]` `:108-119` | `[CERT-web]` |

**The contract, stated by earcut itself, that drives the whole decision.** earcut "favor[s] raw speed
and simplicity over triangulation quality" `[CERT-web]` `:10-12`, and "does **not** guarantee a correct
triangulation on arbitrary input — it trades quality for speed" `:48-49`. Two failure modes matter for
a build tool:

1. **Quality:** it can emit long thin **sliver** triangles (it never optimizes angles) — the very thing
   Delaunay avoids (§47.3). `[INFER]` (grounded in "favoring raw speed … over quality" `[CERT-web]`).
2. **Non-conforming output (T-junctions):** "a vertex may land in the middle of another triangle's edge
   (a T-junction). This is harmless for rendering but can break navmesh or FEM use." `[CERT-web]`
   `:57-59`. For simulation/deformation this is a correctness bug, not a cosmetic one.

With malformed input (self-crossing rings, a hole outside the outer ring, duplicate/zero-length edges)
"the result can be noticeably wrong — overlapping triangles, gaps, or triangles outside the polygon."
`[CERT-web]` `:50-55`. earcut's answer is "clean your input first"; it is not a robust triangulator of
dirty data.

## 47.3 — The math of Constrained Delaunay Triangulation (what CDT is, and why it has no slivers) `[CERT-web]` / `[INFER]`

**Delaunay's defining property — the empty circumcircle.** A triangulation of a point set is *Delaunay*
iff for every triangle, the open disc through its three vertices (its circumcircle) contains **no other
vertex**. The test is one predicate — `incircle(a,b,c, d)`: it "returns a *negative* value if `d` lies
*inside* the circle passing through `a,b,c`", positive if outside, zero if cocircular (with `a,b,c` in
counter-clockwise order) `[CERT-web]` `github_mourner_robust-predicates_README_2026-08-07:27-33`.
Orientation itself is a second predicate — `orient2d(a,b,c)` > 0 for CCW, < 0 for CW, 0 for collinear,
and it also approximates twice the signed triangle area `[CERT-web]` `:19-26`.

**Why Delaunay ⇒ no slivers (the quality guarantee).** Among all triangulations of a fixed point set,
the Delaunay triangulation **maximizes the minimum angle** (Lawson) — it is the "roundest" triangulation
possible for those points, so it systematically avoids the thin slivers ear-clipping can leave. `[INFER]`
(textbook; the empty-circle ⇔ max-min-angle equivalence is the Lawson flip criterion). The mechanism is
**edge flipping / legalization**: for the shared edge of two adjacent triangles, if the opposite vertex
of one triangle falls inside the other's circumcircle (an `incircle` test fails), flip the diagonal;
iterate until no illegal edge remains. `[INFER]` — and this is precisely what earcut's optional pass
does: `refine()` "legaliz[es] interior edges with Delaunay flips while preserving the polygon boundary
and holes … usually removes many skinny triangles and reduces total triangle edge length." `[CERT-web]`
`github_mapbox_earcut_README_2026-08-07:108-119`.

**"Constrained" = Delaunay that must keep certain edges.** A plain Delaunay triangulation ignores the
polygon boundary; a **Constrained** Delaunay Triangulation forces a given set of edges (the polygon
contour and hole edges) to appear in the output, and makes every *other* triangle as Delaunay as
possible given that constraint. `[INFER]`. That is exactly why a footprint's outline and its holes
survive as edges — the constraint set is the polygon. cdt2d's API takes `points` plus `edges`
("edge constraints which must occur within the triangulation") and, with `delaunay: true`, "the
resulting triangulation is converted to a Delaunay triangulation by edge flipping" `[CERT-web]`
`github_mikolalysenko_cdt2d_README_2026-08-07:166-172`.

**The robustness pivot (the tie to G65).** Both predicates decide on the SIGN of a determinant, and in
naive floating point that sign can be WRONG for near-degenerate inputs — collinear or cocircular points
within a tiny range. robust-predicates exists precisely for this: it provides "reliable 2D and 3D point
orientation tests … that are not susceptible to floating point errors", a port of Shewchuk's
adaptive-precision predicates (the "industry standard since 1996"), and even illustrates non-robust vs
robust `orient2d` failing for points within `2⁻⁴²` `[CERT-web]`
`github_mourner_robust-predicates_README_2026-08-07:3-7`. A CDT built on *fast, non-robust* predicates
can loop, crash, or emit a non-triangulation on degenerate data — the reason a serious CDT library
either ships exact predicates or fails on dirty input (§47.4). This is the shared root cause of the
robustness ceilings in [Block 45] (float clippers) and [Block 46] (float mesh CSG); G65 investigates it
directly.

## 47.4 — The mature JS CDT libraries, compared honestly `[CERT-web]`

Two libraries are the realistic choices in JavaScript; a third is noted for honesty. All require
CLEANER input than earcut — that is the trade for quality.

| Library | Algorithm | Predicates / robustness | Input it demands | Licence |
|---|---|---|---|---|
| **poly2tri** (jhasse C++ / r3mi JS) | **sweep-line** CDT, from Domiter & Žalik's paper `[CERT-web]` `github_r3mi_poly2trijs_README_2026-08-07:7` | **float**, `[INFER]`; historically FRAGILE | strict: "no input validation"; "does **not** support repeated points within _epsilon_"; "only simple polygons"; "interior holes must not touch other holes, nor touch the polyline boundary" `[CERT-web]` `github_jhasse_poly2tri_README_2026-08-07:1-13` | BSD-3-clause `[CERT-web]` `github_r3mi_poly2trijs_README_2026-08-07:58-60` |
| **cdt2d** (Mikola Lysenko) | incremental CDT + Delaunay edge-flip `[CERT-web]` `github_mikolalysenko_cdt2d_README_2026-08-07:166-172` | **EXACT** — depends on `robust-in-sphere` + `robust-orientation` (Shewchuk predicates, the same family as robust-predicates) `[CERT-web]` `github_mikolalysenko_cdt2d_packagejson_2026-08-07` (dependencies block) | a valid **PSLG**: "No point … duplicated; no pair of edge constraints cross …; no point … in the relative interior of an edge (ie no T-junctions)" — else preprocess with `clean-pslg` `[CERT-web]` `github_mikolalysenko_cdt2d_README_2026-08-07:181-187` | MIT `[CERT-web]` `github_mikolalysenko_cdt2d_packagejson_2026-08-07` |
| **constrained-delaunay** (older npm module) | CDT | not evaluated this block — older/less-maintained; NOT preserved, so NO claim is made about it here | — | — `[INFER]` (flagged not-evaluated, per honesty rule — do not assert what was not measured) |

Honest reading of the two real options:

- **poly2tri is fast and small but brittle.** Its own docs open with warnings, not features: it will
  misbehave on duplicate/near-duplicate points, collinear runs, and holes that touch — and it does
  **no** input validation, so the caller must guarantee a clean simple polygon (the r3mi port even
  recommends running a clipping library like Clipper first) `[CERT-web]`
  `github_r3mi_poly2trijs_README_2026-08-07` (Before-using section). For a *procedural* build tool that
  generates coordinates (where two walls can land a vertex on another's edge, or a snap can duplicate a
  point), this fragility is a real hazard — exactly the degeneracies §47.3/G65 describe.
- **cdt2d is the robust one — at the cost of a clean-input contract.** It is built on exact Shewchuk
  predicates (verified in its dependency list, above), and the author's benchmark section flatly
  asserts "cdt2d is the only non-broken triangulation library in JavaScript" `[CERT-web]`
  `github_mikolalysenko_cdt2d_README_2026-08-07:191-193`. The catch is symmetrical to poly2tri's: it
  ALSO forbids duplicates, crossing constraints and T-junctions, but instead of failing quietly it
  tells you to run **`clean-pslg`** first `:88,181-187`. It is also self-labelled **"WORK IN PROGRESS"**
  `:7` with several `TODO` doc sections — mature enough to depend on (three-bvh-csg does, next point),
  but not polished. `[CERT-web]`.
- **The cross-link to [Block 46].** three-bvh-csg's experimental `useCDTClipping = true` path — "more
  robust … triangulation at the cost of performance" — is literally cdt2d (it devDepends on it), per
  [Block 46] §46.3. So the same 2D CDT library is the quality escape hatch in BOTH the flat-cap case
  (this block) and the 3D-mesh-CSG case (B46). `[CERT-web]` (B46 source).

## 47.5 — Decision rule: when earcut is enough, when CDT (or `refine()`) pays `[INFER]`

The rule is a THREE-TIER ladder, cheapest first — because earcut ships a Delaunay upgrade in-place,
you rarely jump straight to a CDT library.

1. **earcut as-is — the default, and correct for most prismatic caps.** Use plain earcut (i.e. the
   Three.js default: do nothing) when the triangulated face is a **flat, flat-shaded cap** that is
   never deformed, never finely textured, and never simulated: wall tops, prismatic slab caps, simple
   convex-ish footprints with few or no holes. Slivers are invisible on a flat, uniformly-lit polygon,
   and T-junctions "harmless for rendering" `[CERT-web]` `github_mapbox_earcut_README_2026-08-07:57-59`.
   This is the nave's situation today (§47.1) — wall/slab caps → earcut is the right call, no change
   needed. `[INFER]`.

2. **earcut + `refine()` — the cheap quality win, BEFORE reaching for a CDT lib.** When you see visible
   slivers (bad shading/normals on a lit cap, z-fighting on grazing triangles, ugly UVs), first add the
   one-line Delaunay refinement pass: `refine(triangles, vertices, dim)` legalizes interior edges with
   Delaunay flips, "usually removes many skinny triangles", keeps the same triangle count and boundary,
   and costs nothing on normal calls unless invoked `[CERT-web]` `:108-123`. It gives Delaunay-quality
   angles without changing library. **Caveat:** `refine()` does NOT make the mesh *conforming* — it
   "doesn't … make the mesh conforming" `:123`, so T-junctions remain. If the problem is slivers, this
   fixes it; if the problem is T-junctions (FEM/navmesh/deformation), it does not. `[CERT-web]`.

3. **A real CDT library (cdt2d) — only when you need a CONFORMING, high-quality mesh.** Switch to cdt2d
   when the face will be **displaced/deformed** (terrain relief, subdivided/animated surfaces, per-vertex
   biomes as in [Block 31]/[Block 41]), needs **good UV parametrization**, feeds **simulation/FEM**, or
   is a **floor slab pierced by many column/equipment holes** — where earcut's hole-bridging produces
   both dense slivers AND T-junctions between adjacent bridges, and where the vertex count is high enough
   that triangle quality drives shading and physics. Prefer **cdt2d** (exact predicates → robust on the
   degenerate coordinates a procedural tool generates) over poly2tri (float, brittle), and budget a
   **`clean-pslg` preprocess** to satisfy its no-duplicate / no-T-junction PSLG contract `[CERT-web]`
   `github_mikolalysenko_cdt2d_README_2026-08-07:181-187`. `[INFER]` (grounded in §47.3–47.4
   `[CERT-web]`).

**One-line heuristic:** *flat cap, lit uniformly, no deformation → earcut as-is; visible slivers →
earcut + `refine()`; conforming/deformable/simulated mesh or a slab riddled with holes → cdt2d over a
clean-pslg'd PSLG, never poly2tri on procedurally-generated (possibly-degenerate) input.* `[INFER]`

Applied to the nave (mirrors [Block 46] §46.6's "prefer 2D + extrude" conclusion): the walls and slabs
are prismatic, flat-capped, and flat-shaded → **tier 1, earcut is enough, no change**. The only place a
CDT would earn its cost is a **floor with many interior holes** (columns, equipment cutouts, drains) if
that floor is ever displaced or finely lit — then tier 3. `[INFER]`.

## 47.6 — Connections

- **[Block 46]** (G60) — 3D mesh CSG. Its experimental `useCDTClipping` (a "more robust triangulation
  at the cost of performance") IS cdt2d, the same library §47.4 recommends here; §47.5 and B46 §46.6
  reach the same "prefer 2D + extrude for prismatic geometry" conclusion from the two sides (triangulate
  vs boolean). The `drawRange` export gotcha in B46 §46.3 is downstream of the same `ExtrudeGeometry`
  path whose caps §47.1 traces to earcut.
- **[Block 45]** (G59) — robust 2D polygon offset/union via integer Clipper2. §47.4's robustness pivot
  (float predicates flip sign near-degenerate) is the SAME root cause B45 §45.3 names for why float
  clippers loop and why Clipper2 snaps to integers; earcut/cdt2d triangulate the polygon that Clipper2
  produces — B45 offsets/unions the footprint, this block caps it.
- **[Block 8]** — the geometry toolkit (`Shape`, `ExtrudeGeometry`, `Shape.holes`). This block supplies
  the missing internal: how those shapes become triangles (`ShapeUtils.triangulateShape` → earcut) and
  when to override it.
- **[Block 31] / [Block 41]** — terrain relief + per-vertex biomes / equipment LOD: the concrete cases
  where §47.5 tier 3 (deformed, finely-lit, or simulated meshes) applies and earcut's quality ceiling
  starts to bite.
- **RUN 9 forward gap G65** — exact geometric predicates (`orient2d`/`incircle`, epsilon/snapping,
  Shewchuk adaptive precision). §47.3's predicate math and §47.4's cdt2d-vs-poly2tri robustness split
  are that gap's triangulation instance; G65 is the cross-cutting foundation under G59–G61.
