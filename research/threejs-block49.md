# Block 49 — Mesh simplification by Quadric Error Metrics (Garland-Heckbert 1997): the maths, what three.js `SimplifyModifier` ACTUALLY runs (Melax 1998, then a meshoptimizer wrapper — NOT hand-rolled QEM), and the build-time-decimate rule for equipment LOD

> RUN 9, fifth block (axis: algorithmic/numerical methods for better design tools). Answers G62 and
> feeds the queued equipment-LOD gap G41 ([Block 40] §40.4 found equipment triangles dominate the
> assembled hotel, not the building shell). Documents (a) the **QEM** algorithm of Garland & Heckbert
> from the primary paper — the per-vertex **error quadric** `Q`, the plane-sum `Kp = ppᵀ`, the
> quadratic-form error `vᵀQv`, the additive collapse rule `Q̄ = Q1+Q2`, and the 4×4 linear solve for the
> optimal collapse position; (b) a CORRECTION of this gap's own premise — three.js `SimplifyModifier` is
> **not** a QEM implementation: the classic addon (r160 and earlier) is **Stan Melax's 1998** curvature
> heuristic, and the current `dev` addon is a thin **wrapper over meshoptimizer**; (c) meshoptimizer's
> `meshopt_simplify` — the robust, attribute-aware, QEM-based decimator (its source cites Garland-Heckbert
> AND Hoppe's appearance-attribute quadrics), MIT-licensed, integrated build-time via gltf-transform/
> gltfpack ([Block 25]) and now at runtime through `SimplifyModifier`; (d) the actionable rule: decimate
> HVAC/furniture equipment at **build time with meshoptimizer** (target-error LODs, preserved UV/normal
> seams) and reserve the runtime `SimplifyModifier` for simple no-critical-UV geometry.
>
> Subject version: three.js `dev` branch `examples/jsm/modifiers/SimplifyModifier.js` (retrieved
> 2026-08-07) vs the same file at tag `r160` (the corpus baseline) · meshoptimizer `master`
> (`README.md` + `src/simplifier.cpp`, retrieved 2026-08-07) · Garland & Heckbert, "Surface
> Simplification Using Quadric Error Metrics", *SIGGRAPH '97 Proc.*, pp. 209-216 (CMU).
>
> Sources: `sources/web-snapshots/garland-heckbert-1997-quadrics` (the paper PDF) ·
> `sources/web-snapshots/github_mrdoob_threejs_SimplifyModifier_2026-08-07` (dev) ·
> `sources/web-snapshots/github_mrdoob_threejs_SimplifyModifier_r160` (classic) ·
> `sources/web-snapshots/github_zeux_meshoptimizer_README_2026-08-07` ·
> `sources/web-snapshots/github_zeux_meshoptimizer_simplifier_cpp_2026-08-07`.
> Method: WebFetch of the primary paper (preserved PDF, cited by §/Eq. anchor), the two Three.js addon
> versions, and meshoptimizer's README + `simplifier.cpp` — all preserved to `sources/` (sha256-registered)
> BEFORE citing; equations verified against the paper text, not recalled. Markers (METHODOLOGY §3):
> `[CERT]` local `file:line` of a preserved source · `[CERT-doc]` the paper PDF (§/Eq.) · `[CERT-web]`
> official web doc/source · `[CERT-a]` secondary · `[INFER]` deduction (textbook FP / determinant algebra).
> Block type: **DESIGN/APPLIED** (algorithm exposition + library evaluation + a build-tool rule) — a high
> `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an exhaustion signal.

---

## 49.1 — QEM: the error is a quadratic form `vᵀQv`; the quadric is a sum of squared plane distances `[CERT-doc]`

Garland & Heckbert attach to every vertex a **symmetric 4×4 matrix `Q`** and define the error of a point
`v = [vx vy vz 1]ᵀ` (homogeneous) as the **quadratic form**:

> "we associate a symmetric 4×4 matrix `Q` with each vertex, and we define the error at vertex
> `v = [vx vy vz 1]ᵀ` to be the quadratic form `Δ(v) = vᵀQv`." `[CERT-doc]`
> `garland-heckbert-1997-quadrics §4` (paper p.4, lines "we associate a symmetric 4×4 matrix Q…").

Where does `Q` come from? Each vertex originally lies on the intersection of the planes of its incident
triangles, so its error is the **sum of squared distances to that set of planes** (paper Eq. 2):

> "`Δ(v) = Δ([vx vy vz 1]ᵀ) = Σ_{p∈planes(v)} (pᵀv)²`  … where `p = [a b c d]ᵀ` represents the plane
> defined by the equation `ax + by + cz + d = 0` where `a² + b² + c² = 1`." `[CERT-doc]`
> `garland-heckbert-1997-quadrics §5, Eq. 2`.

So `a,b,c` is the **unit normal** `n` and `d = −n·v₀` for any point `v₀` on the plane (`ax+by+cz+d=0`
⇒ `d = −(a x₀ + b y₀ + c z₀)`) `[INFER]` (algebra of the cited plane equation). Each squared plane
distance `(pᵀv)²` expands into a rank-1 matrix, and the sum collapses into one matrix (paper §5):

> "`Δ(v) = Σ vᵀ(ppᵀ)v = vᵀ (Σ Kp) v` … where `Kp` is the matrix `Kp = ppᵀ`:
> `[[a², ab, ac, ad], [ab, b², bc, bd], [ac, bc, c², cd], [ad, bd, cd, d²]]`." `[CERT-doc]`
> `garland-heckbert-1997-quadrics §5` (the `Kp = ppᵀ` display matrix).

`Kp` is the **fundamental error quadric** of one plane; the vertex's `Q` is the sum `Q = Σ_p Kp`
`[CERT-doc]` `§5` ("The error quadric `Q` for this vertex is the sum of the fundamental quadrics"). Because
`Q` is symmetric 4×4 it needs only **10 floats** per vertex `[CERT-doc]` `§4` ("requiring only 10 floating
point numbers per vertex"). This is the whole trick: an unbounded set of planes is tracked implicitly by a
fixed 10-number matrix, and a plane-set **union** becomes a matrix **add** (§49.2).

## 49.2 — The collapse: add the quadrics, solve a 4×4 system for the optimal position, cost = `v̄ᵀQ̄v̄` `[CERT-doc]` / `[INFER]`

The algorithm iteratively contracts vertex pairs `(v1,v2) → v̄`. Two rules define a contraction:

**Quadric of the merged vertex — just add:** `[CERT-doc]` `§4`
> "We have chosen to use the simple additive rule `Q̄ = Q1 + Q2`."

This is exact when the two plane sets are disjoint and an over-count of at most 3× otherwise (each plane is
distributed to at most its 3 triangle vertices) `[CERT-doc]` `§5` ("any single plane can be counted at most 3
times"). It is the same "union = add" move [Block 48] §48.1 identified as the quadric's defining convenience.

**Optimal position — minimise the quadratic form.** Since `Δ` is quadratic, `∂Δ/∂x = ∂Δ/∂y = ∂Δ/∂z = 0`
is **linear**. The paper writes the solve (Eq. 1) as inverting the quadric with its bottom row replaced by
`(0,0,0,1)` (the homogeneous constraint `w=1`):

> "we find `v̄` by solving … `[[q11 q12 q13 q14],[q12 q22 q23 q24],[q13 q23 q33 q34],[0 0 0 1]] v̄ =
> [0,0,0,1]ᵀ`. … Assuming that this matrix is invertible, `v̄ = (that matrix)⁻¹ [0,0,0,1]ᵀ`." `[CERT-doc]`
> `garland-heckbert-1997-quadrics §4, Eq. 1`.

The top-left 3×3 is the quadric's `[q11..q33]` block and the right column `[q14,q24,q34]` its linear part;
solving places `v̄` at the **centre of the error ellipsoid** `[CERT-doc]` `§5.1` ("`v̄` will be at the center
of the ellipsoid"). **Singular fallback:** if the matrix is not invertible (degenerate level surface — e.g.
a flat or linear-crease region) the paper falls back to "the optimal vertex **along the segment `v1v2`**"
and, failing that, "choosing `v̄` from amongst the endpoints and the midpoint" `[CERT-doc]` `§4, Eq. 1`
surrounding text. This is exactly the "solve the 4×4, else best of the extremes" contract.

**Contraction cost = residual error at the chosen `v̄`:** `[CERT-doc]` `§4.1`
> "The error `v̄ᵀ(Q1 + Q2)v̄` of this target vertex becomes the cost of contracting that pair."

Pairs go in a **min-heap keyed on cost**; the algorithm repeatedly pops the cheapest, contracts, and updates
neighbours' costs `[CERT-doc]` `§4.1` (the 5-step summary). Two robustness add-ons the paper documents:
**boundary preservation** (a perpendicular "constraint plane" through each boundary edge, converted to a
quadric weighted by a large penalty) `[CERT-doc]` `§6` ("Preserving Boundaries"), and **mesh-inversion
prevention** (reject/penalise a collapse if a neighbour face normal flips) `[CERT-doc]` `§6` ("Preventing
Mesh Inversion"). Optimal placement vs. picking an endpoint reduces error "by as much as 50%" `[CERT-doc]`
`§7` (Fig. 6 discussion). All four boxed equations in the task brief are thus verified in the primary source.

## 49.3 — CORRECTION of this gap's premise: three.js `SimplifyModifier` is NOT hand-rolled QEM `[CERT]`

The G62 backlog premise (and the task brief) assumed `examples/jsm/utils/SimplifyModifier.js` "is a QEM
implementation." **Read against source, that is false in both eras of the file** — a `[INFER]`-premise
refuted by `[CERT]` reading (PROMPT-LOOP "GAP PREMISES ARE HYPOTHESES"):

**(a) Classic `SimplifyModifier` (tag `r160`, the corpus baseline) = Stan Melax 1998, a curvature heuristic —
not QEM.** Its own header says so, and the cost function contains no quadric at all:

> "Simplification Geometry Modifier — based on code and technique by **Stan Melax in 1998** — Progressive
> Mesh type Polygon Reduction Algorithm — http://www.melax.com/polychop/" `[CERT]`
> `github_mrdoob_threejs_SimplifyModifier_r160:10-16`.

The edge-collapse cost is `edgelength × curvature + borders`, where `curvature` comes from **dot products of
neighbouring face normals**, not from any accumulated quadric matrix:

```
const edgelength = v.position.distanceTo( u.position );      // :240
const dotProd = face.normal.dot( sideFace.normal );          // :269
minCurvature = Math.min( minCurvature, ( 1.001 - dotProd ) / 2 );  // :270
const amt = edgelength * curvature + borders;  return amt;   // :290-292
```
`[CERT]` `github_mrdoob_threejs_SimplifyModifier_r160:240,269-270,290-292`. This is the classic Melax metric
(local curvature × edge length), fundamentally different from Garland-Heckbert's sum-of-squared-plane-distances
`Q` (§49.1) `[INFER]` (comparison of the two cited formulas).

**Its known limitations, from the source itself:**
- **Borders are barely handled.** The border term is hard-coded to zero and the author flags it broken:
  "crude approach in attempt to preserve borders **though it seems not to be totally correct**" — `borders = 0`
  and the increment is commented out `[CERT]` `github_mrdoob_threejs_SimplifyModifier_r160:278-288`.
- **UVs are carried, not preserved.** On collapse the moved vertex simply copies the survivor's UV
  (`u.uv.copy( v.uv )`) `[CERT]` `:403-405`; UVs are **not** part of the cost metric, so texture seams
  distort — the well-known "SimplifyModifier wrecks UVs" complaint has this concrete cause `[INFER]`.
- Operates on **welded, indexed** geometry: it calls `BufferGeometryUtils.mergeVertices` first `[CERT]`
  `:39` (so an unindexed/duplicated mesh is welded — the same `mergeVertices` epsilon-grid of [Block 48]
  §48.4 applies). It only keeps `position/uv/normal/tangent/color` attributes `[CERT]` `:35`.

**(b) Current `dev` `SimplifyModifier` = a thin wrapper over meshoptimizer.** The addon was rewritten and now
delegates entirely to the WASM simplifier:

> "The implementation is based on **[meshoptimizer]**. If you only need a simplified index buffer, use
> `MeshoptSimplifier` directly." `[CERT]` `github_mrdoob_threejs_SimplifyModifier_2026-08-07:12-13`, importing
> `MeshoptSimplifier` from `../libs/meshopt_simplifier.module.js` `[CERT]` `:5`.

It welds (`mergeVertices` if non-indexed) `[CERT]` `:39`, packs positions, then calls
`MeshoptSimplifier.simplifyWithAttributes(index, positions, 3, vertexAttributes, stride, weights, null,
targetIndexCount, 1)` — passing **normal (weight 0.25 each) and uv (weight 0.5 each)** as error attributes
`[CERT]` `:73-74,95`, or plain `MeshoptSimplifier.simplify(...)` when no normal/uv exists `[CERT]` `:99`.
So on the current addon the runtime path **already is meshoptimizer's QEM** — attribute-aware, seam-preserving
(§49.4). The premise that "SimplifyModifier is a separate QEM" is doubly wrong: classic = Melax, modern = meshopt.

## 49.4 — meshoptimizer `meshopt_simplify`: the real QEM decimator (Garland-Heckbert + Hoppe attribute quadrics), MIT `[CERT-web]`

meshoptimizer's simplifier **is** a QEM implementation — the source header cites the exact lineage:

> "Michael Garland and Paul S. Heckbert. Surface simplification using quadric error metrics. 1997 …
> Michael Garland. Quadric-based polygonal surface simplification. 1999 … Hugues Hoppe. New Quadric
> Metric for Simplifying Meshes with Appearance Attributes. 1999 … Hoppe, Marschner. Efficient
> Minimization of New Quadric Metric … 2000" `[CERT-web]`
> `github_zeux_meshoptimizer_simplifier_cpp_2026-08-07:24-30`.

The code carries `struct Quadric` / `struct QuadricGrad`, `quadricAdd` (the `Q̄=Q1+Q2` rule §49.2),
`quadricFromPlane(Q, a,b,c,d, w)` and `quadricFromTriangle(... normal, −distance, sqrt(area)·weight)` — i.e.
the `Kp=ppᵀ` construction of §49.1 with **area weighting** — and `quadricFromAttributes` implementing Hoppe's
appearance-attribute quadrics `[CERT-web]` `:667,676,716,801-844,870-884`. That last piece is precisely the
UV/normal-in-the-error-metric extension the classic Melax modifier lacked (§49.3).

**Behaviour and guarantees (from the README):**

| Property | What meshoptimizer states | Cite |
|---|---|---|
| Function | `meshopt_simplify(dst, indices, index_count, &vertices.x, vertex_count, stride, target_index_count, target_error, options, &result_error)` | `github_zeux_meshoptimizer_README_2026-08-07:548,557` `[CERT-web]` |
| Target error | normalized to `[0..1]` of mesh extents — `1e-2` ≈ "error below 1% of the mesh extents" | `:561` `[CERT-web]` |
| Not guaranteed | "not guaranteed to reach the target index count and can stop earlier" (topology + error limit) | `:561` `[CERT-web]` |
| Seam/border aware | "follows the topology of the original mesh in an attempt to **preserve attribute seams, borders and overall appearance**" — but needs welded input, and faceted meshes can get "stuck" | `:565` `[CERT-web]` |
| Attribute-aware | `meshopt_simplifyWithAttributes(...)` takes attribute values + weights so **normals** improve shading, **UVs** limit texture deformation, colors preserved; UV weight "around 10-100" | `:582,595,597` `[CERT-web]` |
| LOD selection | returns normalized deviation; multiply by `meshopt_simplifyScale` for object-space error → screen-space LOD threshold | `:569` `[CERT-web]` |
| Sloppy variant | `meshopt_simplifySloppy` ignores topology (no seam/border preservation, worse quality) but collapses spatially-close disjoint features | `:567` `[CERT-web]` |
| Permissive | `meshopt_SimplifyPermissive` + `vertex_lock`/`meshopt_SimplifyVertex_Protect` collapses across seams while protecting chosen UV seams/creases | `:603,624` `[CERT-web]` |
| License | **MIT** | `:1` `[CERT-web]` |

**Reference numbers.** The paper's own Fig. 5/6: a **70,000-face model → 100 faces in ~15 s** on a 1997
SGI, `Q` costs only 10 floats/vertex, and optimal placement cut error "as much as 50%" `[CERT-doc]`
`garland-heckbert-1997-quadrics §4,§7`. meshoptimizer gives no fixed ratio — the honest control is
**target_error as a fraction of mesh extent** (`1e-2` = 1%) plus a returned deviation for LOD switching
`[CERT-web]` `:561,569`, i.e. you drive it by allowed error, not a blind decimation percentage.

## 49.5 — meshoptimizer vs `SimplifyModifier`: the rule `[CERT-web]` / `[INFER]`

| | **meshoptimizer** (`meshopt_simplify`) | **classic `SimplifyModifier`** (Melax, r160) |
|---|---|---|
| Algorithm | QEM (Garland-Heckbert) + Hoppe attribute quadrics `[CERT-web]` `simplifier_cpp:24-30` | curvature × edgelength heuristic `[CERT]` `r160:290` |
| Attribute/UV error | yes — weighted normals/UVs/colors `[CERT-web]` `README:582` | no — UV just copied, not in cost `[CERT]` `r160:403-405` |
| Border/seam preservation | topology-following, protectable seams `[CERT-web]` `README:565,624` | "crude … not totally correct", term zeroed `[CERT]` `r160:278-288` |
| Error control | normalized target error, returned deviation for LOD `[CERT-web]` `README:561,569` | none — vertex-count `count` only `[CERT]` `r160` API |
| Where it runs | build time (gltfpack/gltf-transform, [Block 25]) AND runtime (WASM; also modern `SimplifyModifier`) | runtime JS only |
| License | MIT `[CERT-web]` `README:1` | three.js MIT addon |

**The rule for the nave / HVAC prototypes (equipment LOD, G41) `[INFER]`, grounded in the table:**

1. **Decimate equipment at BUILD TIME with meshoptimizer.** For chillers/pumps/furniture that carry UVs and
   baked-shading normals, run `gltf-transform simplify` or `gltfpack` ([Block 25] §25 — meshopt-backed) to
   emit 2-3 LOD `.glb`s at chosen `target_error` (start ~`1e-2`, i.e. 1% of extent), UV/normal seams
   preserved. Serve them via `THREE.LOD` (the building-LOD pattern [Block 40] already applies). This is the
   high-return target [Block 40] §40.4 named: equipment triangles dominate, and QEM+attributes keeps the
   texture/shading intact where a runtime Melax collapse would smear UVs. `[INFER]`.
2. **Use the runtime `SimplifyModifier` only where it is safe.** On the current three.js it wraps
   meshoptimizer (§49.3b) so it is fine for one-off runtime decimation of **procedural, non-critical-UV**
   geometry (untextured shells, greyboxes). On any build pinned to **r160 or earlier** the addon is Melax and
   will damage UV seams — decimate offline instead. `[INFER]` (from §49.3).
3. **Drive by error, not by blind percentage.** Prefer `target_error` (fraction of extent) + the returned
   deviation for `THREE.LOD` distance thresholds over a fixed "50% of triangles" cut — the same LOD-switch
   discipline as [Block 40]/[Block 17] §17. `[INFER]` (`README:561,569` `[CERT-web]`).
4. **Weld first.** Both paths weld (`mergeVertices`) and meshopt is explicit that unwelded duplicates make the
   simplifier "stuck" `[CERT-web]` `README:565` — so recenter+weld (the [Block 48] §48.5 hygiene) BEFORE
   decimating CAD-fed meshes. `[INFER]`.

**G41 status:** this block closes G62 and supplies the **documentation** half of G41 (equipment LOD) — the
algorithm, the tool, and the recipe. G41 stays a **requires-execution** gap (§19): it still needs the actual
build (generate the LOD `.glb`s, wire `THREE.LOD`, re-measure draws/tris on the assembled scene). Documented,
not executed. `[INFER]`.

## 49.6 — Connections

- **[Block 48]** (G65) — robust predicates. §48.6 foresaw QEM as "a downstream consumer of predicate
  robustness": the 4×4 solve (§49.2) inverts a quadric whose singularity IS the degeneracy [Block 48] warns
  about — hence the paper's endpoint fallback. `mergeVertices` welding (§49.3/49.4) is [Block 48] §48.4's
  epsilon grid, so recenter-then-weld ([Block 48] §48.5) is a precondition here.
- **[Block 25]** (G25) — the gltf-transform / gltfpack build pipeline. Its `simplify` transform IS
  `meshopt_simplify` (§49.4); this block supplies the algorithm behind that CLI step and the target-error
  numbers to drive it.
- **[Block 40]** (G40) / **G41** — LOD applied & measured. §40.4 found equipment tris dominate; §49.5 gives
  the build-time decimation recipe that G41's execution phase needs.
- **[Block 17]** (G17) — optimization compendium (LOD/BVH/KTX2). QEM decimation is the geometry-reduction
  leg of that compendium; `THREE.LOD` distance switching is shared.
- **[Block 8]** — geometry toolkit. The `Extrude`/`Lathe`/merged buffers it builds are exactly the meshes
  fed to `mergeVertices` + simplification here.
- **RUN 9 forward gaps** — G63 (marching cubes / dual contouring — isosurface meshes are a prime QEM
  simplification input), G64 (curves & surfaces), G66 (procedural placement). G62 closed by this block.
