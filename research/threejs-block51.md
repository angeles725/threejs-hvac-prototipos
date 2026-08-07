# Block 51 — Curves & surfaces: Bézier (Bernstein basis / De Casteljau), Catmull-Rom (why three.js defaults to **centripetal**), B-spline/NURBS (Cox-de Boor + the rational weight for exact conics) — what the three.js `Curve` API ACTUALLY computes, the arc-length reparametrisation, the Frenet-frame flip, and where curved pipes/ducts fit the HVAC tools

> RUN 9, seventh block (axis: algorithmic/numerical methods for better design tools). Answers G64. Documents
> (a) the **mathematics** of the three curve families, each equation VERIFIED against three.js source and cross-
> checked against a primary math reference: **Bézier** = a Bernstein-polynomial (binomial) blend of control
> points with the **De Casteljau** evaluation; **Catmull-Rom** = an *interpolating* cubic Hermite spline with
> tangent `T_i = (P_{i+1} − P_{i-1})/2`, and the **α-parametrisation** (uniform/centripetal/chordal) whose
> **centripetal α=0.5** provably avoids cusps/self-intersections — the reason three.js makes it the DEFAULT;
> **B-spline/NURBS** = knots + the recursive **Cox-de Boor** basis + **rational weights** (the *R*) that let a
> NURBS represent **conics exactly** (a true circle), which a polynomial Bézier/B-spline cannot;
> (b) the three.js `Curve` API — base class `Curve` (`getPoint(t)` vs `getPointAt(u)`, the **arc-length**
> reparametrisation via `getLengths`/`getUtoTmapping`, the `computeFrenetFrames` **rotation-minimising** frame
> and its closed-curve twist fix), `CubicBezierCurve3`/`QuadraticBezierCurve3`, `CatmullRomCurve3`
> (`curveType`, `tension`), and the **addon** `NURBSCurve`/`NURBSSurface`; (c) `TubeGeometry` sweeping a circle
> along a curve using those frames; (d) the actionable decision rule for curved pipes/ducts in the HVAC prototypes.
>
> Subject version: three.js `dev` branch (source files retrieved 2026-08-07): `src/extras/core/Curve.js`,
> `src/extras/core/Interpolations.js`, `src/extras/curves/CatmullRomCurve3.js`,
> `src/extras/curves/{Cubic,Quadratic}BezierCurve3.js`, `src/geometries/TubeGeometry.js`,
> `examples/jsm/curves/{NURBSCurve,NURBSSurface,NURBSUtils}.js`.
>
> Sources (all preserved to `sources/`, sha256-registered BEFORE citing — full literal basenames, §5):
> `sources/web-snapshots/github_mrdoob_threejs_Interpolations_2026-08-07.md` (Bézier/Catmull-Rom point fns) ·
> `sources/web-snapshots/github_mrdoob_threejs_CatmullRomCurve3_2026-08-07.md` (curveType/tension/α) ·
> `sources/web-snapshots/github_mrdoob_threejs_Curve_2026-08-07.md` (getPointAt/getLengths/getUtoTmapping/computeFrenetFrames) ·
> `sources/web-snapshots/github_mrdoob_threejs_CubicBezierCurve3_2026-08-07.md` ·
> `sources/web-snapshots/github_mrdoob_threejs_QuadraticBezierCurve3_2026-08-07.md` ·
> `sources/web-snapshots/github_mrdoob_threejs_TubeGeometry_2026-08-07.md` ·
> `sources/web-snapshots/github_mrdoob_threejs_NURBSCurve_2026-08-07.md` ·
> `sources/web-snapshots/github_mrdoob_threejs_NURBSSurface_2026-08-07.md` ·
> `sources/web-snapshots/github_mrdoob_threejs_NURBSUtils_2026-08-07.md` (Cox-de Boor A2.2 / A3.1 / surface A4.x, cites *The NURBS Book*) ·
> math refs: `sources/web-snapshots/en.wikipedia.org_wiki_B_C3_A9zier_curve.md` (Bernstein/De Casteljau) ·
> `sources/web-snapshots/en.wikipedia.org_wiki_Centripetal_Catmull_E2_80_93Rom_spline.md` (the α knot formula) ·
> `sources/web-snapshots/en.wikipedia.org_wiki_Non-uniform_rational_B-spline.md` (weights → exact conics) ·
> `sources/manuals/catmullrom-yuksel-2011.pdf` → `sources/extracted/catmullrom-yuksel-2011.txt`
> (Yuksel, Schaefer & Keyser 2011 — the centripetal cusp-free PROOF, cited IN the three.js source comment).
> Method: curl of each three.js source raw file + WebFetch/fetch-doc of each math ref, PRESERVED to `sources/`
> (sha256-registered) BEFORE citing; every formula token-verified by reading the preserved copy. Markers
> (METHODOLOGY §3): `[CERT]` local `file:line` of a preserved three.js source snapshot (extern; token-verified
> by reading) · `[CERT-web]` official web math reference (Wikipedia) · `[CERT-doc]` the Yuksel paper PDF ·
> `[INFER]` deduction (algebra, ecosystem/tooling judgment). Block type: **DESIGN/APPLIED** (algorithm
> exposition + API map + a build-tool rule) — a high `[INFER]/[CERT]` ratio is EXPECTED here, NOT exhaustion.

---

## 51.1 — Bézier: the Bernstein-polynomial blend + De Casteljau, verified in `Interpolations.js` `[CERT]` / `[CERT-web]`

A degree-`n` Bézier curve is a **weighted blend of `n+1` control points**, the weights being the **Bernstein
basis polynomials**. Wikipedia's explicit definition:

> `b_{i,n}(t) = {n \choose i} t^i (1 − t)^{n−i}, i = 0,…,n` and
> `B(t) = Σ_{i=0}^n {n \choose i}(1−t)^{n−i} t^i P_i, 0 ≤ t ≤ 1` `[CERT-web]`
> `en.wikipedia.org_wiki_B_C3_A9zier_curve §Explicit definition` (the `{n choose i}` are binomial coefficients).

This is exactly the `B_{i,n}(t) = C(n,i) t^i (1−t)^{n−i}` of the task brief, and it is what three.js literally
computes. The core header even says so: *"Bezier Curves formulas obtained from … wikipedia.org/wiki/Bézier_curve"*
`[CERT]` `github_mrdoob_threejs_Interpolations_2026-08-07:4`. The per-axis basis functions:

| Bernstein term (n=2, quadratic) | three.js code | `file:line` |
|---|---|---|
| `(1−t)² P₀` | `QuadraticBezierP0: k*k*p` (`k=1−t`) | `Interpolations:31-36` |
| `2(1−t)t P₁` | `QuadraticBezierP1: 2*(1−t)*t*p` | `:38-42` |
| `t² P₂` | `QuadraticBezierP2: t*t*p` | `:44-48` |

| Bernstein term (n=3, cubic) | three.js code | `file:line` |
|---|---|---|
| `(1−t)³ P₀` | `CubicBezierP0: k*k*k*p` | `Interpolations:68-73` |
| `3(1−t)²t P₁` | `CubicBezierP1: 3*k*k*t*p` | `:75-80` |
| `3(1−t)t² P₂` | `CubicBezierP2: 3*(1−t)*t*t*p` | `:82-86` |
| `t³ P₃` | `CubicBezierP3: t*t*t*p` | `:88-92` |

`QuadraticBezier`/`CubicBezier` sum these per axis `[CERT]` `Interpolations:59-64, 104-109`, and the public
`CubicBezierCurve3.getPoint(t)` calls `CubicBezier(t, v0.x,v1.x,v2.x,v3.x)` on each of x/y/z `[CERT]`
`github_mrdoob_threejs_CubicBezierCurve3_2026-08-07 §getPoint`. The `{3 choose 1}={3 choose 2}=3` coefficients
are the literal `3*` in the code `[INFER]` (binomial(3,1)=3).

**De Casteljau** is the numerically-stable *evaluation* algorithm (repeated linear interpolation between control
points), historically first and equivalent to the Bernstein form:

> "the Bézier curve … was … devised by Paul de Casteljau in 1959 using **de Casteljau's algorithm**, a
> numerically stable method to evaluate Bézier curves." `[CERT-web]`
> `en.wikipedia.org_wiki_B_C3_A9zier_curve §History`.

three.js uses the **direct Bernstein evaluation** (the polynomial form above), not the recursive De Casteljau
lerp pyramid — fine for the fixed low degrees (2 and 3) it ships `[INFER]` (only quadratic/cubic Bézier classes
exist; there is no arbitrary-degree Bézier in core).

## 51.2 — Catmull-Rom: an *interpolating* spline, tangent `T_i=(P_{i+1}−P_{i-1})/2`, and the α-parametrisation `[CERT]` / `[CERT-web]` / `[CERT-doc]`

Unlike Bézier (which only *approaches* its interior control points), a **Catmull-Rom** spline **passes through
every control point** — it is *interpolating*. It is a cubic **Hermite** spline whose tangent at each interior
point is estimated from its neighbours. The uniform tangent is `T_i = (P_{i+1} − P_{i-1})/2`, visible in the
core `CatmullRom(t,p0,p1,p2,p3)` helper:

```
const v0 = ( p2 - p0 ) * 0.5;   // tangent at p1 = (p2 − p0)/2
const v1 = ( p3 - p1 ) * 0.5;   // tangent at p2 = (p3 − p1)/2
return (2*p1 − 2*p2 + v0 + v1)*t³ + (−3*p1 + 3*p2 − 2*v0 − v1)*t² + v0*t + p1;
```
`[CERT]` `github_mrdoob_threejs_Interpolations_2026-08-07:19-27`. The cubic blend is the standard Hermite basis
`(2t³−3t²+1)p1 + (−2t³+3t²)p2 + (t³−2t²+t)v0 + (t³−t²)v1` rearranged `[INFER]` (expand and match the `t^k`
coefficients). That `(p2−p0)*0.5` is the `(P_{i+1} − P_{i-1})/2` of the task brief `[CERT]` same lines.

**The α-parametrisation (the important part).** A *uniform* Catmull-Rom (`α=0`, equal knot spacing) ignores the
Euclidean distance between points and produces **cusps and self-intersections** when the points are unevenly
spaced. The fix is to space the knots by a power `α` of the chord length. Wikipedia's knot recurrence:

> `t_{i+1} = [ √((x_{i+1}−x_i)² + (y_{i+1}−y_i)²) ]^α + t_i`, where **α ranges from 0 to 1** `[CERT-web]`
> `en.wikipedia.org_wiki_Centripetal_Catmull_E2_80_93Rom_spline §Definition`: **α=0 uniform**, **α=0.5
> centripetal**, **α=1 chordal**.

three.js implements this EXACTLY, using `distanceToSquared` (`=|Δp|²`) raised to `pow`, so `pow=α/2`:

```
const pow = this.curveType === 'chordal' ? 0.5 : 0.25;   // chordal α=1 → pow .5 ; centripetal α=.5 → pow .25
let dt0 = Math.pow( p0.distanceToSquared( p1 ), pow );   // (|Δp|²)^(α/2) = |Δp|^α
```
`[CERT]` `github_mrdoob_threejs_CatmullRomCurve3_2026-08-07:229-232`. Cross-check: centripetal `pow=0.25` gives
`(|Δp|²)^0.25 = |Δp|^0.5 = [√|Δp|²]^0.5` ⇒ `α=0.5`; chordal `pow=0.5` ⇒ `α=1` — the code and the Wikipedia
formula agree `[INFER]`. Non-uniform tangents are then rescaled for the `[0,1]` segment in
`initNonuniformCatmullRom` `[CERT]` `:52-64`; a `dt < 1e-4` **repeated-point** guard avoids divide-by-zero
`[CERT]` `:234-237`.

**Why centripetal is the DEFAULT.** The constructor signature is
`(points, closed=false, curveType='centripetal', tension=0.5)` `[CERT]` `CatmullRomCurve3:120`, and the source
comment cites the reason: *"Centripetal CatmullRom Curve — which is useful for avoiding cusps and
self-intersections in non-uniform catmull rom curves. http://www.cemyuksel.com/research/catmullrom_param/…"*
`[CERT]` `CatmullRomCurve3:6-13`. That paper PROVES it:

> "we prove that, for cubic Catmull-Rom curves, centripetal … guarantees that the curves do not form cusps or
> self-intersections within curve segments" `[CERT-doc]` `sources/extracted/catmullrom-yuksel-2011.txt`
> (Yuksel, Schaefer & Keyser, "Parameterization and Applications of Catmull-Rom Curves", CAD 2011) — chordal
> (α=1) over-shoots on sharp turns; uniform (α=0) cusps; **centripetal (α=0.5) is the sweet spot**.

`tension` only applies to the legacy `curveType==='catmullrom'` branch (`initCatmullRom` scales the tangent by
`tension*(x2−x0)`) `[CERT]` `CatmullRomCurve3:46-50, 243-247`; it is IGNORED for centripetal/chordal `[INFER]`
(those branches never read `this.tension`).

## 51.3 — B-spline / NURBS: Cox-de Boor basis + the **rational weight** for exact conics `[CERT]` / `[CERT-web]`

A **B-spline** generalises Bézier: instead of one Bernstein basis over the whole `[0,1]`, it uses a **knot
vector** `U` that stitches many low-degree polynomial pieces with `C^{p-1}` continuity; each control point
influences only a local span. The basis is the recursive **Cox-de Boor** functions. three.js's addon computes
them with the efficient non-recursive form and names its source:

> `calcBasisFunctions(span,u,p,U)` — *"Calculates basis functions. See **The NURBS Book, page 70, algorithm
> A2.2**."* `[CERT]` `github_mrdoob_threejs_NURBSUtils_2026-08-07:60-99`; `findSpan` (A2.1, binary search for
> the knot span containing `u`) `[CERT]` `:19-55`; `calcBSplinePoint` (*"…page 82, algorithm A3.1"*) `[CERT]`
> `:109-127`. (Piegl & Tiller, *The NURBS Book*, is the canonical reference.)

**The R in NURBS = Rational weights.** A NURBS control point is a **weighted** homogeneous 4-vector
`(x,y,z,w)`; the curve is the *weighted* B-spline divided by the summed weights — a **rational** function.
Wikipedia states why this matters:

> "*Rational* B-splines use [weights]… This allows for more control over the shape… In particular, it adds
> **conic sections like circles and ellipses** to the set of curves that can be represented **exactly**. The
> term *rational* in NURBS refers to these weights." `[CERT-web]`
> `en.wikipedia.org_wiki_Non-uniform_rational_B-spline §… rational` — the motivating case was Boeing needing "a
> generalized way to **exactly** [represent conics]" (a true circle) `[CERT-web]` same page §History.

A polynomial Bézier/B-spline **cannot** represent a circle exactly (a circle is not a polynomial) `[INFER]`
(algebra: `x²+y²=r²` has no finite-degree polynomial parametrisation) — the rational weight is what buys the
exact conic. three.js implements the projection literally: `calcBSplinePoint` accumulates `w_j·N_j·P_j` AND
`w_j·N_j` into a homogeneous `Vector4` `[CERT]` `NURBSUtils:116-124`, then `NURBSCurve.getPoint` divides by `w`:

```
if ( hpoint.w !== 1.0 ) hpoint.divideScalar( hpoint.w );   // (wx,wy,wz,w) -> (x,y,z,1)  : the rational divide
```
`[CERT]` `github_mrdoob_threejs_NURBSCurve_2026-08-07 §getPoint` (`t→u` is a linear map onto the active knot
range, `:90`). All weights `=1` ⇒ the denominator is 1 ⇒ it degenerates to a plain (non-rational) B-spline
`[CERT-web]` `…Non-uniform_rational_B-spline §… evaluates to one if all weights are one`; `[CERT]` same
`w!==1.0` guard.

## 51.4 — `Curve` base API: `getPoint(t)` vs `getPointAt(u)` — the arc-length reparametrisation `[CERT]`

Every three.js curve extends `Curve` and implements `getPoint(t)`, where **`t` is the raw curve parameter**, NOT
proportional to distance — the curve moves at **non-uniform speed** in `t` (fast where control points are far
apart). For *evenly spaced* points you need `getPointAt(u)`, where **`u ∈ [0,1]` is the fraction of arc length**:

```
getPointAt( u, optionalTarget ) { const t = this.getUtoTmapping( u ); return this.getPoint( t, optionalTarget ); }
```
`[CERT]` `github_mrdoob_threejs_Curve_2026-08-07:83-87`. The reparametrisation is built from a sampled
**cumulative chord-length table**:

- `getLengths(divisions=arcLengthDivisions)` samples `getPoint(p/divisions)` for `p=0…divisions` and accumulates
  `sum += current.distanceTo(last)`, caching the running totals (default **`arcLengthDivisions = 200`**) `[CERT]`
  `Curve:153-183`, `:38`. i.e. arc length `L(t) ≈ Σ |P(t_k) − P(t_{k-1})|` — a **polyline approximation** of
  `∫₀ᵗ |P'(τ)| dτ`, the true arc-length integral `[INFER]`.
- `getUtoTmapping(u)` binary-searches that table for the target distance `u·L_total`, then **linearly
  interpolates** within the bracketing segment to return `t` `[CERT]` `Curve:208-281`
  (`t=(i+segmentFraction)/(il−1)`).
- `getSpacedPoints(n)` = `getPointAt(d/n)` for `d=0…n` — the **equidistant** sampler; `getPoints(n)` =
  `getPoint(d/n)` — the **parameter-uniform** one `[CERT]` `Curve:121-127` vs `:99-103`.

**So `getPointAt(u) ≠ getPoint(u)`** in general: `getPoint(0.5)` is the midpoint *in parameter*; `getPointAt(0.5)`
is the midpoint *in length*. For evenly-spaced pipe segments, texture-per-metre, or constant-speed camera dolly,
use the `…At` / `getSpacedPoints` family `[INFER]`. The table is an **approximation** — increase
`arcLengthDivisions` for a wiggly curve where 200 chords under-sample the length `[INFER]`.

## 51.5 — `computeFrenetFrames`: it is a **rotation-minimising** frame (despite the name), and the twist/flip problem `[CERT]`

To sweep a cross-section along a curve you need an orthonormal frame `(T, N, B)` (tangent, normal, binormal) at
each step. A **true Frenet frame** derives `N` from the curve's *second* derivative (the principal normal), which
**flips 180°** at inflection points (where curvature → 0 and the principal normal is undefined) and spins wildly
on nearly-straight sections — exactly the "torsion/flip" hazard of the task brief `[INFER]`. three.js's
`computeFrenetFrames`, despite the name, does **NOT** do this — it builds a **rotation-minimising / parallel-
transport frame**:

1. `T_i = getTangentAt(u_i)` (arc-length-uniform tangents; the default `getTangent` is a **finite difference**
   `(P(t+δ) − P(t−δ)).normalize()`, not an analytic derivative) `[CERT]` `Curve:293-311, 351-358`.
2. Pick an **initial** `N₀` perpendicular to `T₀`, chosen along the axis of `T₀`'s **smallest** component (to
   avoid a near-degenerate cross product) `[CERT]` `Curve:361-394`.
3. Propagate: for each step, **rotate the previous normal by the angle `θ = acos(T_{i-1}·T_i)` about the axis
   `T_{i-1}×T_i`** — i.e. carry `N` forward with minimal rotation, only turning it as much as the tangent
   turned `[CERT]` `Curve:397-417` (`mat.makeRotationAxis(vec, theta)`).

This avoids the inflection-point flip. **The residual problem it must still fix is the CLOSED-curve seam:** a
parallel-transported frame does **not** return to its starting orientation after a full loop (a holonomy/twist
mismatch). three.js distributes the leftover angle evenly across all segments:

```
if ( closed === true ) {
  let theta = acos( clamp( normals[0].dot(normals[segments]), −1, 1 ) ) / segments;   // spread the mismatch
  … normals[i].applyMatrix4( makeRotationAxis( tangents[i], theta*i ) ) …             // "twist a little"
}
```
`[CERT]` `Curve:421-440`. **What can still go wrong `[INFER]`:** on an OPEN curve with a sharp ~180° reversal,
consecutive tangents nearly anti-parallel make `T_{i-1}×T_i` ill-defined and the frame can jerk; and the
*initial* normal choice is arbitrary, so a `TubeGeometry` can appear to "roll" along a straight run. Mitigations:
subdivide (more `tubularSegments`) so no single tangent turn is large, or (for full control) supply an explicit
up-vector frame instead of relying on the auto frame.

## 51.6 — Sweeping a profile: `TubeGeometry` (and `ExtrudeGeometry` `extrudePath`) `[CERT]`

`TubeGeometry` is the canonical "pipe along a curve" primitive: `new TubeGeometry(path, tubularSegments=64,
radius=1, radialSegments=8, closed=false)` `[CERT]` `github_mrdoob_threejs_TubeGeometry_2026-08-07:45`. It:

- computes the frame ONCE: `frames = path.computeFrenetFrames(tubularSegments, closed)` `[CERT]` `:66`;
- for each tubular step samples the centreline with **`getPointAt(i/tubularSegments)`** (arc-length-uniform, so
  the rings are evenly spaced along the pipe) `[CERT]` `:131`;
- extrudes a **circle** in the `(N,B)` plane: `vertex = P + radius·(cos·N + sin·B)` around `v=0…2π` `[CERT]`
  `:140-160`.

So the §51.5 frame flip is **directly visible** as a twist of the tube's cross-section (and its UVs/normals)
`[INFER]`. `ExtrudeGeometry` with an `extrudePath` option does the same sweep for an arbitrary 2D `Shape`
profile (rather than a circle), using the same Frenet frames `[INFER]` (documented option; `TubeGeometry` is the
circle-profile special case). For a *variable-radius* pipe you post-scale rings or build a custom sweep — the
built-in `radius` is constant `[CERT]` `:45` (a single scalar).

## 51.7 — The honest addon boundary: NURBS is NOT core, and `NURBSSurface` is a bare evaluator `[CERT]` / `[INFER]`

| Feature | Where | Status |
|---|---|---|
| `CubicBezierCurve3`, `QuadraticBezierCurve3`, `CatmullRomCurve3`, `SplineCurve` (2D), `LineCurve`, `Curve` base | `src/extras/curves`, `src/extras/core` | **Core**, maintained `[CERT]` (source files above) |
| `TubeGeometry`, `ExtrudeGeometry`, `LatheGeometry` | `src/geometries` | **Core** `[CERT]` `TubeGeometry:1-45` |
| `NURBSCurve`, `NURBSSurface`, `NURBSUtils`, `NURBSVolume` | `examples/jsm/curves` | **Addon** (`three/addons`), imports `from 'three'` — NOT bundled in core `[CERT]` `NURBSCurve:1-6` |

Two honesty points:

1. **`NURBSCurve` extends `Curve`; `NURBSSurface` does NOT.** `class NURBSCurve extends Curve` `[CERT]`
   `NURBSCurve:15` — so it inherits `getPointAt`/arc-length/`computeFrenetFrames`/`TubeGeometry` compatibility.
   But `class NURBSSurface {` has **no base class** `[CERT]` `github_mrdoob_threejs_NURBSSurface_2026-08-07 §class`
   — it exposes only `getPoint(u,v,target)` (tensor-product `calcSurfacePoint`, *The NURBS Book* A-series, with
   the same `Sw.divideScalar(Sw.w)` rational divide `[CERT]` `NURBSUtils:422-455`). It is a **point evaluator,
   not a geometry**: to render a NURBS surface you must **grid-sample `getPoint` over a `u×v` mesh and triangulate
   it yourself** (as `webgl_geometry_nurbs.html` does) `[INFER]` — there is no tessellator, no trimming, no
   adaptive refinement. For CAD-grade trimmed NURBS you would leave three.js entirely `[INFER]`.
2. **No arbitrary-degree Bézier and no B-spline-without-weights class in core.** Only quadratic/cubic Bézier
   exist; a general B-spline goes through the NURBS addon (with all weights = 1) `[INFER]`.

## 51.8 — Decision rule for curved pipes / ducts / trace splines in the HVAC tools `[INFER]`

The current prototype corpus is prismatic (`ExtrudeGeometry`/`InstancedMesh`, [Block 47]/[Block 49]) — **no
curve sweeping yet** `[INFER]`. Where curves earn their place:

1. **Curved pipe/duct centrelines → `CatmullRomCurve3` (centripetal, the default) + `TubeGeometry`.** Feed the
   route waypoints as `Vector3[]`; centripetal α=0.5 keeps the run cusp-free through tight elbows (§51.2). Use a
   generous `tubularSegments` (≥ waypoints × 8) so the §51.5 frame stays smooth, and pull ring positions with
   `getSpacedPoints`/`getPointAt` for **uniform-length** segments (constant weld spacing, per-metre insulation
   texture) — never `getPoints`, which bunches on straight runs (§51.4) `[INFER]`.
2. **Designed trace curves (a hand-drawn duct path, an animation dolly) → `CubicBezierCurve3`** when you want
   tangent *handles* (the curve approaches but need not pass through the interior handles). Chain segments and
   share endpoint tangents for `C¹` continuity `[INFER]`.
3. **Watch the frame flip on nearly-straight or reversing runs (§51.5).** A tube that "rolls" is the
   rotation-minimising frame's arbitrary initial normal or an anti-parallel tangent pair — subdivide, or supply
   an explicit frame; for a *closed* loop the built-in twist-distribution already seams it `[CERT]` `Curve:421-440`.
4. **NURBS only for exact circles/conics or CAD interop.** If a duct must be a *mathematically exact* circular
   arc, or you must round-trip a NURBS from a CAD tool, use the `NURBSCurve` addon (§51.3 rational weights). For
   everything else the polynomial curves are lighter and need no addon; and for a swept *surface* remember
   `NURBSSurface` gives you only sample points — you own the tessellation (§51.7) `[INFER]`. For most HVAC
   geometry a Catmull-Rom/Bézier centreline + `TubeGeometry` is the cheaper, more robust path.

## 51.9 — Connections

- **[Block 8]** (geometry toolkit — Extrude/Lathe/Tube) — this block is the *curve* half under `TubeGeometry`
  and `ExtrudeGeometry(extrudePath)`: B8 catalogued the geometries, §51.6 explains the sweep and its frame.
- **[Block 48]** (G65 robust predicates) / **[Block 50]** (DC QEF) — the §51.5 near-anti-parallel tangent
  (`T_{i-1}×T_i` ill-defined) and the §51.4 chord-length arc approximation are the same **near-degenerate /
  discretisation** family those blocks flag: a cross product going singular, a polyline standing in for an
  integral. The `dt<1e-4` repeated-point guard (§51.2) is the same epsilon-snapping discipline as [Block 48].
- **[Block 47]** (G61 triangulation) — a swept `TubeGeometry`/`ExtrudeGeometry` still triangulates its caps via
  earcut ([Block 47]); a NURBS surface (§51.7) must be grid-triangulated by hand — both are "curve/surface →
  triangle mesh" steps.
- **[Block 7]** (cameras & controls) — `Curve.getPointAt`/`getSpacedPoints` (§51.4) is the standard way to drive
  a **constant-speed camera dolly** along a spline (the arc-length reparam gives even motion), tying curves to
  the cinematic-camera work.
- **[Block 46]** (CSG) — a swept solid pipe (Tube) is a natural **input** to boolean assembly ([Block 46]) for
  cutting wall penetrations along the duct route.
- **RUN 9 forward gap** — G66 (procedural placement — poisson-disk/blue-noise, WFC/L-systems). G64 closed by
  this block; 1 read-only-investigable gap (G66) remains.
