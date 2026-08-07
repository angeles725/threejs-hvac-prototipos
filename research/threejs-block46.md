# Block 46 — Robust boolean CSG on 3D meshes: three-bvh-csg, its BVH speedup, and the honest robustness ceiling vs BSP and CGAL

> Research of **three-bvh-csg** (Garrett "gkjohnson" Johnson) — the de-facto Constructive Solid
> Geometry library for Three.js meshes — for a 3D *build tool* like `nave-panccadia` that assembles
> solids (union of walls) and cuts voids (doors/windows, HVAC penetrations). Covers the API
> (`Brush`/`Evaluator`, the operation constants), how it uses a BVH (`three-mesh-bvh`) to beat the
> classic BSP-tree CSG, its licence/version/maintenance status, and — the load-bearing part — an
> HONEST account of its numerical robustness: what two-manifold guarantee it needs on INPUT, what it
> does NOT guarantee on OUTPUT, and how that ceiling compares to the legacy CSG.js/ThreeCSG BSP
> approach and to CGAL's exact-arithmetic corefinement. Ends with the actionable decision rule for the
> nave: **3D mesh CSG vs 2D-union (Clipper, B45) + vertical extrude**. RUN 9, second block (new axis:
> algorithmic/numerical methods for better design tools). It does NOT re-cover 2D polygon
> offset/union/straight-skeleton (that is [Block 45] / G59), triangulation of holed polygons
> (earcut/CDT → G61), or exact geometric predicates in general (→ G65).
>
> Subject version: three-bvh-csg **v0.0.18** (package.json @ main, retrieved 2026-08-07) ·
> three-mesh-bvh **v0.9.14** · peer-deps `three >=0.179.0`, `three-mesh-bvh >=0.9.7` · CSG.js
> (evanw, 2011) · CGAL 4.12.1 PMP corefinement · local build tool
> `nave-panccadia-3d-v18.html` @ commit 55240ca.
>
> Sources: `sources/web-snapshots/github_gkjohnson_three-bvh-csg_README_2026-08-07` ·
> `sources/web-snapshots/github_gkjohnson_three-bvh-csg_packagejson_2026-08-07` ·
> `sources/web-snapshots/github_gkjohnson_three-mesh-bvh_packagejson_2026-08-07` ·
> `sources/web-snapshots/github_evanw_csgjs_README_2026-08-07` ·
> `sources/web-snapshots/doc.cgal.org_4.12.1_PolygonMeshProcessing_corefinement_2026-08-07.md` ·
> `disenos/nave-panccadia/nave-panccadia-3d-v18.html` (local build tool, `file:line`).
> Method: WebSearch/WebFetch over the official repos + CGAL manual, preserved to `sources/` before
> citing; local reading of the build tool. Markers (METHODOLOGY §3): `[CERT]` local `file:line` ·
> `[CERT-web]` official web (URL+date, snapshot) · `[CERT-a]` forum/secondary · `[INFER]` deduction.
> Block type: **DESIGN/APPLIED** (a library evaluation + a build-tool recommendation) — a high
> `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an exhaustion signal.

---

## 46.1 — What three-bvh-csg is: the `Brush` / `Evaluator` API and the five boolean operations `[CERT-web]`

Three.js core ships **no** boolean CSG; it is an external addon. three-bvh-csg is the current standard,
self-described as "An _experimental, in progress_, flexible, memory compact, fast and dynamic
Constructive Solid Geometry implementation on top of three-mesh-bvh." `[CERT-web]`
`github_gkjohnson_three-bvh-csg_README_2026-08-07:11`.

The API is two classes:

| Class | Role | Contract |
|---|---|---|
| `Brush` | a solid operand | "An object with the same interface as `THREE.Mesh` but used to evaluate CSG operations. Once a brush is created the geometry should not be modified." `[CERT-web]` `README:88` |
| `Evaluator` | the computation engine | `evaluate(brushA, brushB, operation, target = null)` returns a `Brush`; arrays of operations/targets produce several results "at once with minimal additional overhead" `[CERT-web]` `README:103,186` |

The five solid operations plus two non-solid "hollow" variants (verbatim from the README) `[CERT-web]`
`README:71-81`:

| Constant | Set meaning |
|---|---|
| `ADDITION` | A ∪ B (union) |
| `SUBTRACTION` | A − B |
| `REVERSE_SUBTRACTION` | B − A |
| `DIFFERENCE` | A ⊕ B (symmetric difference) |
| `INTERSECTION` | A ∩ B |
| `HOLLOW_SUBTRACTION` | A − B, non-solid — "simply removing the geometry" `[CERT-web]` `README:77,80` |
| `HOLLOW_INTERSECTION` | A ∩ B, non-solid |

Minimal usage is `evaluator.evaluate( brush1, brush2, SUBTRACTION )` `[CERT-web]` `README:57`. Key
`Evaluator` flags: `useGroups = true` (keeps per-material groups / material arrays), `consolidateGroups
= true`, `removeUnusedMaterials = true`, and the **experimental** `useCDTClipping = false` (see §46.3).
`[CERT-web]` `README` (Evaluator properties section).

## 46.2 — Why it is fast: a BVH replaces the BSP tree `[CERT-web]` / `[INFER]`

The whole point of the library is the acceleration structure. It is built "on top of
[three-mesh-bvh]" — a separate gkjohnson library whose own package.json describes it as "A BVH
implementation to speed up raycasting against three.js meshes" `[CERT-web]`
`github_gkjohnson_three-mesh-bvh_packagejson_2026-08-07` (`version 0.9.14`, MIT). A **Bounding Volume
Hierarchy** lets each triangle of brush A find only the few triangles of brush B it could possibly
intersect, instead of testing every pair. `[INFER]`

The headline claim is explicit and comparative: three-bvh-csg is "More than 100 times faster than
other BSP-based three.js CSG libraries in complex cases." `[CERT-web]`
`github_gkjohnson_three-bvh-csg_README_2026-08-07:11`. This is a claim about the **classic approach it
replaces**: legacy CSG.js/ThreeCSG builds a **Binary Space Partitioning tree** per solid — "This
library implements CSG operations on meshes ... using BSP trees" `[CERT-web]`
`github_evanw_csgjs_README_2026-08-07`. A BSP tree is O(n) to rebuild for every operation and its cost
compounds; the BVH is a spatial index reused across the whole mesh, which is where the >100× on
complex inputs comes from. `[INFER]`

## 46.3 — Robustness, told honestly: a strict INPUT requirement and a NON-guarantee on OUTPUT `[CERT-web]`

This is the section that governs the decision in §46.6. three-bvh-csg is fast, but it is a
**floating-point** boolean with real, documented failure modes — its own README leads with the
warnings:

**INPUT must be two-manifold.** "All brush geometry must be two-manifold - or water tight with no
triangle interpenetration." `[CERT-web]` `README:14,356`. A subtraction additionally requires that even
the tool brush be "a water-tight, two-manifold mesh." `[CERT-web]` `README:79`. Feeding it an open
shell, a self-intersecting solid, or two coincident faces violates the precondition — and a raw
Three.js `BoxGeometry`/`ExtrudeGeometry` is manifold, but a **union of interpenetrating boxes is not**
(that is exactly the nave's corner/T/X residue, [Block 45] §45.1).

**OUTPUT is NOT guaranteed manifold.** "Due to numerical precision and corner cases resulting geometry
may not be correctly completely two-manifold." `[CERT-web]` `README:17`. This is the ceiling: results
can carry missing/duplicated triangles at coplanar or grazing contacts. The public issue tracker
confirms these are live, "help wanted" problems — incorrect/missing faces when clipping triangles, and
a dedicated coplanar-faces determination issue (#164) `[CERT-a]`
(github.com/gkjohnson/three-bvh-csg/issues/68, /164; accessed 2026-08-07). Coplanar detection has been
hardened over time (moved off a raycast heuristic) but is explicitly not proven-complete. `[CERT-a]`

**Mitigations the library itself ships:**
- `useCDTClipping = true` — an "experimental triangle clipping implementation using Constrained
  Delaunay Triangulation" giving "more robust, simple triangulation at the cost of performance"
  `[CERT-web]` `README` (the package even devDepends on `cdt2d`) — links this block forward to G61.
- `HOLLOW_SUBTRACTION` / `HOLLOW_INTERSECTION` — allow a **non-manifold** result on the first brush,
  the escape hatch when a true solid boolean is not needed. `[CERT-web]` `README:77-81`.

**Export gotcha (bites a build/asset pipeline).** "CSG results use `Geometry.drawRange` to help
maintain performance which can cause three.js exporters to fail to export the geometry correctly. It
is necessary to convert the geometry to remove the use of draw range before exporting." `[CERT-web]`
`README:357`. A tool that bakes a GLB (corpus [Block 25]/[Block 28] pipeline) must strip drawRange
first. Also: "Geometry on a Brush should be unique and not be modified after being set." `[CERT-web]`
`README:88,355`.

## 46.4 — The robustness ladder: BSP (CSG.js) → BVH float (three-bvh-csg) → exact arithmetic (CGAL) `[CERT-web]`

Placing three-bvh-csg honestly among the alternatives — all three do mesh booleans, but they buy
robustness at different prices:

| Library | Algorithm | Arithmetic | Robustness posture | Licence |
|---|---|---|---|---|
| **CSG.js / ThreeCSG** (evanw, 2011) | BSP tree | floating point | "All edge cases involving overlapping coplanar polygons ... are correctly handled" per its README, but its docs carry **no** epsilon/precision discussion; historically fragile & slow `[CERT-web]` `github_evanw_csgjs_README_2026-08-07` | MIT |
| **three-bvh-csg** (gkjohnson) | BVH-accelerated triangle clipping | floating point | fast; needs manifold input; output "may not be correctly completely two-manifold" `[CERT-web]` `README:17` | MIT |
| **CGAL** PMP corefinement | exact corefinement | **exact predicates (+ optionally exact constructions)** | with only exact predicates + *inexact* constructions, "edges will be split at each intersection ... but the position of the intersection point might create self-intersections due to the limited precision of floating point numbers"; the fix is `Exact_predicates_exact_constructions_kernel` `[CERT-web]` `doc.cgal.org_4.12.1_PolygonMeshProcessing_corefinement_2026-08-07.md` | GPL/commercial |

The key lesson from the CGAL manual, applied to three-bvh-csg: three-bvh-csg lives at the **exact-
predicates-absent, floating-constructions** rung — *below* even CGAL's inexact-construction mode. CGAL
documents that the ROOT cause of self-intersection in a float boolean is that "the default
hardware-supported arithmetic does not really fulfill the requirements of the algorithm, since it does
not implement arithmetic on the real numbers" `[CERT-web]` (same CGAL snapshot). three-bvh-csg makes
the speed/robustness trade in the opposite direction to CGAL: it chooses GPU-era speed and MIT
licensing over exact-arithmetic guarantees. For a *design tool* that must never emit a broken solid,
that trade is the whole decision. `[INFER]`

Note the contrast with 2D Clipper2 ([Block 45] §45.3): Clipper2 buys robustness by doing the boolean
"using integer coordinates internally ... to ensure numerical robustness" `[CERT-web]` (B45 source).
No mainstream Three.js **3D** mesh CSG does the integer-snapping trick — three-bvh-csg is pure float.
That asymmetry (robust 2D integer booleans exist; robust 3D float booleans do not, short of CGAL) is
the technical reason the §46.6 rule prefers 2D-union+extrude for prismatic geometry. `[INFER]`

## 46.5 — Cost & performance model: build-time vs runtime, memory, reuse `[CERT-web]` / `[INFER]`

- **BVH build cost.** Each `Brush` carries (or builds) a `three-mesh-bvh` over its triangles; the
  index is what makes the boolean sub-quadratic. Because the README forbids mutating brush geometry
  after creation `[CERT-web]` `README:88`, the BVH is built once per brush and amortised across every
  operation that uses it — cheap for a static assembly, wasteful if you rebuild brushes every frame.
  `[INFER]`
- **Evaluator reuse.** One `Evaluator` instance handles many operations, and batching operations/
  targets runs them "with minimal additional overhead" `[CERT-web]` `README:186` — so an N-part
  assembly is one Evaluator, not N. `[INFER]`
- **"memory compact" + ">100× vs BSP"** `[CERT-web]` `README:11` place it firmly in the **viable at
  interactive runtime for moderate meshes** class (its live examples run in-browser), unlike CGAL
  (native, heavyweight, not a browser dependency). `[INFER]`
- **When runtime vs build-time.** For a parametric editor where the operator drags a void and sees the
  cut live, three-bvh-csg at runtime is the right tool. For a fixed footprint that is authored once and
  shipped as a GLB, do the CSG at **build-time** (offline, once), strip drawRange (§46.3), and ship a
  plain baked mesh — the runtime then pays zero CSG cost. `[INFER]`

## 46.6 — Decision rule for the nave-type build tool: 3D mesh CSG vs 2D-union + extrude `[CERT]` / `[INFER]`

The current `nave-panccadia-3d-v18.html` uses **no 3D CSG at all**: a grep for
`three-bvh-csg | new Brush | Evaluator` returns **0** `[CERT]`
`nave-panccadia-3d-v18.html` (grep, 2026-08-07). Every solid is built by extruding a 2D `Shape`:
`shapeFrom(poly)` (`:356`) fed to `new THREE.ExtrudeGeometry(...)` at eight call sites
(`:368,866,1005,1032,1355,1404,1511`) `[CERT]`. Even doors are not boolean-cut voids — "this drawing
draws no doors, so a gap is the only trace an opening leaves" `[CERT]`
`nave-panccadia-3d-v18.html:264` (the door leaves are recovered as separate loose geometry, not
subtracted holes). So the task premise of "door voids cut by CSG" does **not** describe v18 — a useful
correction: the tool is already living the recommendation below without having chosen it deliberately.

**The rule (concrete):**

1. **Prismatic vertical geometry (walls, slabs, footprints, most of a building) → 2D union + extrude.
   NOT 3D CSG.** Merge the wall bands with a robust 2D boolean (Clipper2 integer union, [Block 45]
   §45.6), then `ExtrudeGeometry` straight up. This is more robust (2D integer booleans avoid the
   float self-intersection ceiling of §46.3–46.4) AND cheaper (no BVH, no per-operation mesh clip),
   and it produces a clean manifold by construction. `[INFER]` (grounded in §46.4 `[CERT-web]` + the
   corpus's existing extrude path `[CERT]` `:356-368`).

2. **Rectangular openings in a vertical wall (doors, windows) → `Shape.holes` in the 2D profile
   BEFORE extrusion, not a 3D subtraction.** A door in a straight wall is a 2D hole extruded through
   the wall thickness — one `Path` added to the wall `Shape.holes`, no boolean, no manifold risk.
   Reserve 3D `SUBTRACTION` only for an opening whose axis is NOT parallel to the extrude direction.
   `[INFER]`

3. **Genuinely 3D booleans → three-bvh-csg is the right (and only mainstream) choice.** Use `SUBTRACTION`
   when the operation cannot be expressed as a 2D profile: an **oblique roof plane clipping the wall
   tops** (a pitched/hip roof cut, the [Block 45] §45.4 straight-skeleton lift meeting the walls), a
   **round duct or pipe penetrating a slab at an angle**, a chamfer, or a sphere/boolean of two curved
   solids. Here there is no 2D shortcut and three-bvh-csg's speed pays off. `[INFER]`

4. **Guardrails when you DO use three-bvh-csg** (all from §46.3): feed only manifold, watertight
   brushes; build brushes once and reuse the `Evaluator`; prefer build-time baking for fixed geometry;
   strip `drawRange` before any GLB export; try `useCDTClipping = true` if you see missing/!`manifold`
   coplanar artifacts; and fall back to `HOLLOW_SUBTRACTION` when a non-solid cut is acceptable.
   `[CERT-web]`.

**One-line heuristic:** *if the operation is expressible as a 2D polygon operation swept along one
axis, do it in 2D (robust integer Clipper + extrude); reach for 3D mesh CSG only for truly
non-extrudable, oblique, or curved geometry — and then accept a float-robustness ceiling and guard
against it.* `[INFER]`

## 46.7 — Connections

- **[Block 45]** (G59) — the 2D counterpart: robust polygon offset + integer Clipper2 union + straight
  skeleton. §46.6 rule 1 hands prismatic geometry to that block's method; §46.4 contrasts Clipper2's
  integer-robust 2D boolean with three-bvh-csg's float 3D boolean. The straight-skeleton roof lift
  (B45 §45.4) is precisely the oblique cut that §46.6 rule 3 sends to three-bvh-csg where it meets the
  walls.
- **[Block 8]** — the realistic-stage geometry toolkit (`Shape`/`ExtrudeGeometry`, `Shape.holes`): the
  door/window rule (§46.6 rule 2) is a direct application of that block's holed-`Shape` extrude path.
- **[Block 17]** — optimization compendium (BVH culling): three-mesh-bvh appears there as a raycast/
  culling accelerator; here the SAME BVH library is repurposed as the CSG acceleration structure
  (§46.2).
- **[Block 25] / [Block 28]** — the gltf-transform / Blender GLB pipeline: the `drawRange` export
  gotcha (§46.3) is a concrete hazard for baking CSG results into that pipeline.
- **RUN 9 forward gaps** — G61 (earcut vs Constrained Delaunay Triangulation — three-bvh-csg's own
  `useCDTClipping` is the 3D face of that gap), G65 (exact geometric predicates — the root cause the
  CGAL comparison in §46.4 names), G63 (marching cubes / dual contouring — the isosurface alternative
  when neither extrude nor mesh-CSG fits).
