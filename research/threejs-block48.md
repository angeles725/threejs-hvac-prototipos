# Block 48 — Robust geometric predicates: why float `orient2d`/`incircle` flip sign near degeneracy, the three fixes (exact adaptive, integer snapping, epsilon), and the snapping rule for a CAD build tool

> The cross-cutting SYNTHESIS of the RUN-9 robustness thread. [Block 45] hit it in 2D
> (Clipper2 does its boolean on **integers** "to ensure numerical robustness"), [Block 46] hit it in 3D
> (three-bvh-csg is a **float** boolean whose output "may not be correctly completely two-manifold"), and
> [Block 47] hit it in triangulation (poly2tri is float+fragile; cdt2d ships **exact** Shewchuk predicates).
> All three name the SAME root cause but none investigates it directly — this block does. It documents (a)
> WHY floating-point geometric predicates (`orient2d`/`orient3d`, `incircle`/`insphere`) return the WRONG
> **sign** near degeneracy — a LOGICAL flip that breaks combinatorial geometry code, not a magnitude error —
> from the authoritative source (Shewchuk 1997; CGAL's exact-predicates kernel); (b) the three honest fixes
> compared — exact adaptive predicates, integer-grid snapping, and epsilon tolerances — with the mature JS
> libraries, their status and licences; (c) what epsilon Three.js actually uses (verified in source:
> `mergeVertices`'s absolute quantised grid); and (d) the actionable rule for the `nave-panccadia` build
> tool: **snap CAD coordinates to an integer grid BEFORE any boolean, use exact predicates for any
> hand-rolled orientation/incircle test, and never trust an absolute epsilon on large world coordinates.**
> RUN 9, fourth block (axis: algorithmic/numerical methods for better design tools). It does NOT re-cover 2D
> offset/union ([Block 45]/G59), 3D mesh CSG ([Block 46]/G60), or the earcut-vs-CDT triangulation choice
> ([Block 47]/G61) — it is the shared foundation those three point at.
>
> Subject version: three.js `dev` branch — `examples/jsm/utils/BufferGeometryUtils.js` (retrieved
> 2026-08-07) · Shewchuk "Adaptive Precision Floating-Point Arithmetic and Fast Robust Geometric
> Predicates", *Discrete & Computational Geometry* 18:305-363, 1997 (CMU-CS-96-140) · CGAL 4.12.1 PMP
> corefinement doc · **robust-predicates** (mourner, port of Shewchuk) · **robust-orientation** /
> **robust-in-sphere** (Mikola Lysenko, cdt2d's deps) · Clipper2 (angusj.com) · local build tool
> `disenos/nave-panccadia/nave-panccadia-3d-v18.html` @ commit 55240ca (DATA block, `origin_shift`).
>
> Sources: `sources/web-snapshots/www.cs.cmu.edu__quake_robust.html.md` ·
> `sources/web-snapshots/github_mourner_robust-predicates_README_2026-08-07` ·
> `sources/web-snapshots/github_mikolalysenko_robust-orientation_README_2026-08-07` ·
> `sources/web-snapshots/github_mikolalysenko_robust-in-sphere_README_2026-08-07` ·
> `sources/web-snapshots/github_mrdoob_threejs_BufferGeometryUtils_2026-08-07` ·
> `sources/web-snapshots/doc.cgal.org_4.12.1_PolygonMeshProcessing_corefinement_2026-08-07.md` ·
> `sources/web-snapshots/angusj.com_clipper2_Overview_2026-08-07.md` ·
> `disenos/nave-panccadia/nave-panccadia-3d-v18.html` (local, `file:line`).
> Method: WebFetch over the authoritative sources (Shewchuk's own page, CGAL manual, GitHub raw READMEs,
> the Three.js source), preserved to `sources/` (sha256-registered) BEFORE citing; local reading of the
> build tool DATA block. Markers (METHODOLOGY §3): `[CERT]` local `file:line` · `[CERT-web]` authoritative
> web (URL+date, snapshot) · `[CERT-a]` secondary · `[INFER]` deduction (textbook determinant algebra
> stated without a per-line citation). Block type: **DESIGN/APPLIED synthesis** (a theory unification + a
> library evaluation + a build-tool rule) — a high `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an
> exhaustion signal.

---

## 48.1 — The problem: a geometric predicate is the SIGN of a determinant, and floating point flips that sign near degeneracy `[CERT-web]` / `[INFER]`

Combinatorial geometry code (triangulation, polygon boolean, convex hull, point location) never asks "how
big is this determinant" — it asks a **discrete** question with three answers, decided by one **sign**.
Shewchuk states the two canonical tests and the failure exactly:

> "Many computational geometry applications use numerical tests known as the *orientation* and *incircle*
> tests. The orientation test determines whether a point lies to the left of, to the right of, or on a line
> or plane defined by other points. The incircle test determines whether a point lies inside, outside, or on
> a circle defined by other points. Each of these tests is performed by evaluating the sign of a
> determinant… If these coordinates are expressed as single or double precision floating-point numbers,
> **roundoff error may lead to an incorrect result when the true determinant is near zero. In turn, this
> misinformation can lead an application to fail or produce incorrect results.**" `[CERT-web]`
> `www.cs.cmu.edu__quake_robust.html.md:22-34`.

**The determinants (textbook algebra — the SIGN framing above is `[CERT-web]`, the explicit matrices are
`[INFER]`).** With points given by coordinates:

| Predicate | Answer decided by | Determinant (sign is the predicate) |
|---|---|---|
| `orient2d(a,b,c)` | is `c` left/right/on line `ab` | `sign` of the **2×2** `det [[ax−cx, ay−cy], [bx−cx, by−cy]]` = `(ax−cx)(by−cy) − (ay−cy)(bx−cx)` (twice the signed area of △`abc`) |
| `orient3d(a,b,c,d)` | is `d` above/below/on plane `abc` | `sign` of the **3×3** determinant of the rows `(a−d), (b−d), (c−d)` |
| `incircle(a,b,c,d)` | is `d` inside/outside/on circle `abc` | `sign` of the **4×4** determinant with rows `[px−dx, py−dy, (px−dx)²+(py−dy)²]` for `p ∈ {a,b,c}` (the paraboloid lift) |
| `insphere(a,b,c,d,e)` | is `e` inside/outside/on sphere `abcd` | `sign` of the analogous **5×5** determinant |

`[INFER]` (standard computational geometry; the "twice the signed area" reading of `orient2d` is
corroborated `[CERT-web]` `github_mourner_robust-predicates_README_2026-08-07:19-26`, which also states the
`incircle` sign convention: "returns a *negative* value if `d` lies *inside* the circle passing through
`a,b,c`" `:27-33`).

**Why float breaks it — catastrophic cancellation, and why a sign flip is FATAL, not approximate `[INFER]`.**
Take `orient2d = (ax−cx)(by−cy) − (ay−cy)(bx−cx)`. When `a,b,c` are nearly collinear the two products are
two nearly-equal large numbers; subtracting them annihilates every significant bit and leaves a result
dominated by rounding noise — *catastrophic cancellation*. The magnitude that survives is meaningless, and
crucially **its sign can be the opposite of the true sign**. `[INFER]` (textbook FP analysis, grounded in
Shewchuk's `[CERT-web]` "roundoff error may lead to an incorrect result when the true determinant is near
zero"). This is not a small numeric error a downstream `≈` can absorb: the calling algorithm branches on the
sign to decide *which side*, *is this an ear*, *flip this edge or not*. A flipped sign feeds the combinatorial
machine a **logically contradictory** fact — point simultaneously left-of and inside — which is exactly how a
sweep-line or ear-clipper "loop[s], crash[es], or emit[s] a non-triangulation on degenerate data" (the concrete
symptom [Block 47] §47.3 attributes to non-robust predicates). robust-predicates illustrates the flip
visually: non-robust vs robust `orient2d` disagreeing "for points within a tiny range (2⁻⁴²)" `[CERT-web]`
`github_mourner_robust-predicates_README_2026-08-07:3-7`. The lesson: **the predicate's job is the sign, and
the sign is precisely what float loses first.**

CGAL draws the same predicate/precision line at kernel level: a boolean run "with exact predicates" but
"inexact constructions" still yields output whose embedding "might have self-intersections due to the
limited precision of floating point numbers" — the fix being a kernel with exact predicates AND exact
constructions `[CERT-web]`
`doc.cgal.org_4.12.1_PolygonMeshProcessing_corefinement_2026-08-07.md:1704-1716`. This is why CGAL's default
`Exact_predicates_inexact_constructions_kernel` (EPICK) makes the *predicate sign* robust even when
constructed points stay in float `[CERT-web]` (same snapshot, `:347,406-408` names the kernel).

## 48.2 — Fix (a): exact adaptive predicates (Shewchuk) — exact when it matters, fast in the common case `[CERT-web]`

The definitive fix computes the sign **exactly** while staying fast. Shewchuk's method is *adaptive*:

> "the algorithms are *adaptive* in the sense that they do only as much work as necessary to guarantee a
> correct result. **The sign of a small determinant can typically be determined quickly unless the
> determinant is close to zero.**" `[CERT-web]` `www.cs.cmu.edu__quake_robust.html.md:57-60`.

So the ordinary (non-degenerate) case runs at roughly hardware-float speed with a floating-point filter; only
when the filter cannot certify the sign does it escalate to extended precision — avoiding the "one or two
orders of magnitude" slowdown of a naïve arbitrary-precision library `[CERT-web]` `:38-41,52-60`. The original
C code (`predicates.c`, public domain, "2D and 3D orientation and incircle tests") is "an industry standard
since 1996" `[CERT-web]` `www.cs.cmu.edu__quake_robust.html.md:87-92` /
`github_mourner_robust-predicates_README_2026-08-07:3`. Its scope is honestly bounded — it solves robustness
"for those algorithms that only require orientation and incircle tests" `[CERT-web]`
`www.cs.cmu.edu__quake_robust.html.md:47-50` (it does not make *constructed* intersection points exact — that
is §48.3's separate axis).

**The JS libraries (all exact-predicate ports of Shewchuk):**

| Library | Computes | Robustness basis | Licence | Note |
|---|---|---|---|---|
| **robust-predicates** (mourner) | `orient2d`, `orient3d`, `incircle`, `insphere` | "a modern port of Jonathan R Shewchuk's C code… an industry standard since 1996" — "not susceptible to floating point errors (without sacrificing performance)" `[CERT-web]` `github_mourner_robust-predicates_README_2026-08-07:1-3` | Unlicense (public-domain-equivalent, matching Shewchuk's public-domain C) `[CERT-web]` (README/repo) | y-axis assumed **downwards**, so signs differ from Shewchuk's original `[CERT-web]` `:15-17` |
| **robust-orientation** (Mikola Lysenko) | n-dimensional orientation | "Exactly computes the orientation of a collection of (n+1) points in n-dimensions"; "robust in the sense that the answers returned are exact… Based on the work of Jonathan Shewchuk" `[CERT-web]` `github_mikolalysenko_robust-orientation_README_2026-08-07` | MIT `[CERT-web]` (same README) | a **cdt2d dependency** ([Block 47] §47.4) |
| **robust-in-sphere** (Mikola Lysenko) | n+2 points cospherical | "Exact arithmetic test to check if (n+2) points are cospherical"; "(Very) loosely inspired by Jonathan Shewchuk's work" — "Currently not as fast" `[CERT-web]` `github_mikolalysenko_robust-in-sphere_README_2026-08-07` | MIT `[CERT-web]` (same README) | the other **cdt2d dependency**; the `incircle`/`insphere` half |

**The tie to the corpus.** This is why [Block 47] could call cdt2d "the only non-robust-free" CDT: cdt2d
depends on `robust-orientation` + `robust-in-sphere`, i.e. it evaluates its `orient2d`/`incircle` flips with
exact Shewchuk predicates, whereas poly2tri uses raw float and is documented-fragile ([Block 47] §47.4). So a
CAD tool that adopts cdt2d inherits exact predicates for free; a tool that hand-rolls a point-in-triangle or a
convex-hull turn test should call `robust-predicates` rather than write `(bx-ax)*(cy-ay)-(by-ay)*(cx-ax) > 0`.
`[INFER]` (grounded in §48.1–48.2 `[CERT-web]` + [Block 47] §47.4).

## 48.3 — Fix (b): snap to an integer grid (Clipper's approach) — exact integer arithmetic, at the cost of quantisation `[CERT-web]` / `[INFER]`

The second fix changes the NUMBERS instead of the arithmetic: quantise every coordinate onto an integer grid
and do the geometry in **exact integer arithmetic**, where a determinant sign is never ambiguous (integers
have no roundoff). This is Clipper2's design, the load-bearing lesson of [Block 45] §45.3:

> "both these classes still perform clipping operations using integer coordinates internally. This is to
> ensure numerical robustness. Because of this, ClipperD performs double / integer conversions before and
> after clipping (by scaling and de-scaling coordinates using the specified decimal precision)." `[CERT-web]`
> `angusj.com_clipper2_Overview_2026-08-07.md`.

Shewchuk's page even nods at this alternative family — the Avnaim/Boissonnat/Devillers determinant technique
"is meant for points whose coordinates are integers" `[CERT-web]`
`www.cs.cmu.edu__quake_robust.html.md:125-129`. Integer snapping and exact predicates are the two exact roads;
epsilon (§48.4) is the inexact patch.

**The tradeoffs, honestly `[INFER]`:**

- **Scale-factor choice is the whole game.** You pick a multiplier `S` (e.g. ×1000 → millimetres become
  integer micrometres). Too small and distinct points collapse (lost detail); too large and `S · coordinate`
  overflows the safe integer range. Clipper operates in 64-bit integers, so the product of the largest scaled
  coordinate with itself (areas/cross-products are second-degree) must stay within ~2⁶³ — a real ceiling for
  huge CAD extents (§48.5). `[INFER]`.
- **Quantisation is lossy but DETERMINISTIC.** Two points closer than one grid cell become the *same* integer
  point — which is usually a feature: it is exactly how snapping folds the nave's 2–9 cm "face-twin" wall
  runs ([Block 45] §45.1) into coincident vertices instead of near-misses that make a float boolean loop.
  `[INFER]`.
- **Snap-rounding (Hobby) is the principled version.** Naïvely rounding each vertex to the grid can make an
  edge cross a grid cell it should have passed, changing topology. *Snap-rounding* (Greene/Hobby) rounds
  vertices AND reroutes each edge through the "hot" pixels it passes, guaranteeing the snapped arrangement
  stays topologically consistent — the theory behind why Clipper's integer snap does not silently corrupt the
  polygon. `[INFER]` (named for provenance; not separately preserved — asserted as the standard technique, not
  cited to a primary here).

The catch versus exact predicates: snapping is a **global input transform** (you commit to a resolution up
front), while Shewchuk predicates keep the original floats and pay for exactness only at the degenerate call.
For a boolean/offset pipeline (Clipper) snapping is natural; for an incremental triangulation exact predicates
are natural — which is why the corpus uses *both* (Clipper integer union in B45, cdt2d exact predicates in
B47). `[INFER]`.

## 48.4 — Fix (c): epsilon tolerances — the fragile patch, and exactly what Three.js uses `[CERT-web]` / `[CERT]`

The third "fix" is the one most code reaches for and the one that fails silently: compare with a tolerance,
`|value| < ε ⇒ treat as zero/equal`. It is a patch, not a solution, for three reasons `[INFER]`:

1. **An absolute ε is scale-dependent.** `ε = 1e-4` means "0.1 mm" if your unit is the metre, but "0.1 µm" if
   your unit is the millimetre and "100 m" if your unit is the kilometre. The *same code* behaves differently
   purely because of the model's units — and CAD data arrives in whatever units the DWG chose (the nave's own
   `$INSUNITS` is documented WRONG, [Block 45] header / DATA `meta.units` "metres (Block 1: $INSUNITS is
   wrong)" `[CERT]` `nave-panccadia-3d-v18.html:247`).
2. **A relative ε (`|value| < ε·max(|a|,|b|)`) fixes the units problem but not the degeneracy problem** — near
   catastrophic cancellation the quantity you are scaling *is itself* noise, so a relative test still cannot
   recover the true sign. It narrows the failure window; it does not close it. `[INFER]`.
3. **ε picks a single threshold for a whole model**, but the right tolerance at a 34 m building extent is not
   the right tolerance for a 2 cm bolt in the same scene. `[INFER]`.

**What Three.js actually uses (verified in source).** Three.js core `Vector3`/`Vector2` equality is **exact**
— `Vector3.equals` compares components with `===`, no epsilon (`[INFER]`, standard core behaviour). The place
an epsilon lives is the vertex-welding utility `BufferGeometryUtils.mergeVertices`, and it is an **absolute
quantised grid**, not a pairwise distance test:

```
function mergeVertices( geometry, tolerance = 1e-4 ) {          // :643
    …
    const halfTolerance = tolerance * 0.5;                       // :694
    const exponent = Math.log10( 1 / tolerance );               // :695
    const hashMultiplier = Math.pow( 10, exponent );            // :696
    const hashAdditive = halfTolerance * hashMultiplier;        // :697
    …
    hash += `${ ~ ~ ( attribute[…]( index ) * hashMultiplier + hashAdditive ) },`;   // :713
}
```
`[CERT-web]` `github_mrdoob_threejs_BufferGeometryUtils_2026-08-07:643,694-697,713`. Each coordinate is scaled
by `hashMultiplier = 10^log10(1/ε)` and truncated (`~~`) into a bucket; vertices landing in the same bucket
merge. This is Three.js's *own* small-scale integer-snapping (§48.3) — but with a **default absolute ε of
1e-4, applied uniformly regardless of coordinate magnitude** `[CERT-web]` (same lines; magnitude-agnostic
confirmed by the code — no division by extent). The consequence for a CAD tool is direct: on un-recentred
world coordinates the default `1e-4` grid is meaningless at large magnitudes, and worse, `~~` is a 32-bit
integer truncation, so `coordinate · hashMultiplier` above ~2³¹ **wraps** — welding becomes nonsense on
un-normalised large coordinates. `[INFER]` (grounded in the `~~` semantics `[CERT-web]` `:713`).

## 48.5 — Decision for the `nave-panccadia` build tool (and CAD-fed design tools generally) `[CERT]` / `[INFER]`

**The load-bearing corpus finding: CAD coordinates carry a world offset that must be removed FIRST.** The nave
DATA block is already recentred — it ships an explicit `origin_shift`:

> `"clip":{"x":[245.51,280.18],"y":[208.1,261.44]},"origin_shift":[-245.51,-208.1]` `[CERT]`
> `nave-panccadia-3d-v18.html:247`.

So the raw DWG lived at a few-hundred-metre offset from the origin, and the tool subtracts
`(245.51, 208.1)` to bring geometry into a `0…53 m` local frame before any modelling `[CERT]` `:247`.
(Honesty note: an earlier framing of this gap cited a *six-figure* insert coordinate; a grep of the nave
corpus for that magnitude found **no** such value — the real offset here is hundreds of metres, not hundreds
of thousands. The PRINCIPLE is unchanged and is the point: CAD/DWG data is georeferenced and routinely sits
far from the origin — UTM eastings/northings are six-to-seven-digit metres — so a design tool must *never*
assume small, origin-centred coordinates. The nave simply demonstrates the recenter step that makes the rest
safe.) `[CERT]` finding + `[INFER]` generalisation.

**The rule (concrete, ordered):**

1. **Recenter first.** Subtract a world offset (the `origin_shift` the nave already applies `[CERT]` `:247`)
   so all geometry sits near the origin at a modest magnitude. Every downstream tolerance, snap grid, and
   float predicate assumes this. Skipping it makes both integer snapping (overflow, §48.3) and absolute
   epsilon (`mergeVertices` `~~` wrap, §48.4) fail. `[INFER]`.
2. **Snap to an integer grid BEFORE any boolean/offset.** For the Clipper2 union/offset that [Block 45] §45.6
   recommends, scale the recentred millimetre coordinates by ×1000 (→ integer micrometres) and run the boolean
   on integers — this is Clipper's own robustness mechanism `[CERT-web]`
   `angusj.com_clipper2_Overview_2026-08-07.md`, and it deterministically folds the 2–9 cm face-twins
   ([Block 45] §45.1). Choose the scale so the largest recentred extent squared stays inside 64-bit range
   (§48.3). `[INFER]`.
3. **Use EXACT predicates for any hand-rolled orientation/incircle test.** If the tool implements its own
   turn test, ear test, point-in-triangle, or CDT, call `robust-predicates` (Unlicense) — do NOT write a raw
   float cross-product sign. Adopting cdt2d ([Block 47] tier 3) brings `robust-orientation`/`robust-in-sphere`
   for free (§48.2). `[INFER]`.
4. **Do NOT trust an absolute epsilon on large world coordinates.** `mergeVertices(geo)` at its default
   `1e-4` is fine ONLY on recentred, modest-magnitude geometry; on raw CAD world coordinates it is meaningless
   and can integer-wrap (§48.4). If you must weld, weld after recentring, and pass a tolerance chosen for the
   local extent, not the default. `[CERT-web]`/`[INFER]`.

**One-line heuristic:** *recenter the CAD data to the origin, snap to an integer grid before every boolean,
compute every orientation/incircle sign with exact Shewchuk predicates, and treat absolute epsilon as a
last-resort weld on already-normalised coordinates — never as the robustness mechanism.* `[INFER]`

## 48.6 — Connections

- **[Block 45]** (G59) — robust 2D offset/union. Its §45.3 "Clipper does the boolean on integers… to ensure
  numerical robustness" IS §48.3's fix (b); §48.5 rule 2 is B45 §45.6 rule 2 with the *why* supplied. The
  face-twin folding B45 describes is the quantisation benefit §48.3 names.
- **[Block 46]** (G60) — 3D mesh CSG. §46.4's robustness ladder (float-constructions three-bvh-csg *below*
  CGAL's exact-predicates rung) is this block's fix taxonomy applied to meshes; the CGAL "hardware arithmetic
  does not implement arithmetic on the real numbers" quote is shared evidence (§48.1). B46's observation that
  no mainstream **3D** mesh CSG does the integer trick is why §48.5 keeps prismatic geometry in 2D.
- **[Block 47]** (G61) — earcut vs CDT. §47.3's "robustness pivot" and §47.4's poly2tri(float)-vs-cdt2d(exact)
  split are the triangulation instance of §48.1–48.2; this block supplies the predicate theory and identifies
  cdt2d's exact deps (`robust-orientation`/`robust-in-sphere`) by name.
- **[Block 8]** — the `Shape`/`ExtrudeGeometry` toolkit whose caps ([Block 47] §47.1) triangulate through
  earcut; `mergeVertices` (§48.4) is the welding step that cleans those extruded/merged buffers.
- **[Block 31] / [Block 41]** — terrain relief + per-vertex biomes: the displaced/finely-lit meshes where
  triangulation quality (hence exact predicates) starts to matter, per [Block 47] §47.5 tier 3.
- **RUN 9 forward gaps** — G62 (QEM simplification — collapses also decide validity by a determinant/quadric
  sign, a downstream consumer of predicate robustness), G63 (marching cubes / dual contouring — isosurface
  vertex placement has its own float-degeneracy story), G64 (curves & surfaces), G66 (procedural placement).
  G65 is closed by this block.
