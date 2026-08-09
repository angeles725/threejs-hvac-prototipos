# Block 125 — Numerical methods & core math for r160 (design3d)

> Research of **Three.js r160 core math, numerical methods, and projection/framing utilities**
> for the `design3d` kit improvement pass. Documents verified gotchas (near-plane sign flip,
> `scene.environmentIntensity` inert, normal-matrix breakage under non-uniform scale,
> `VectorKeyframeTrack` quaternion shrink) and correct idioms for each.
>
> **Block number:** B125. Range B125–B134 assigned to "core three.js library: numerical methods
> & core math" by **session-A (orchestrator on master) 2026-08-09**. This block consumes B125;
> next free in this range is B126.
>
> Sources (official docs, r160 source; NO local PDFs):
> `threejs.org/docs/` (queried 2026-08-09) ·
> `github.com/mrdoob/three.js` r160 tag (`src/math/*.js`, `src/renderers/`) ·
> `github.com/gkjohnson/three-mesh-bvh` README (MIT) ·
> `github.com/nicktindall/cyclon-p2p-common` / Wang 2008 (rotation-minimizing frames, cited
> from secondary) ·
> Markers: `[CERT-web]` official web/docs (threejs.org or github r160 src) ·
> `[CERT-a]` secondary/forum source · `[INFER]` deduction.
>
> Layer assignment: core Three.js library — numerical methods & core math (design3d kit).
> Connects [Block 8] (geometry toolkit), [Block 6] (color management), [Block 38] (visual QA),
> [Block 51] (curves, arc length, Frenet frames), [Block 49] (mesh simplification).

---

## 125.A — Framing / projection

### `Vector3.project` and the near-plane sign trap

`Vector3.project(camera)` is defined as two successive `applyMatrix4` calls:
first `applyMatrix4(camera.matrixWorldInverse)` (world → camera space), then
`applyMatrix4(camera.projectionMatrix)` (camera → clip space with perspective divide)
`[CERT-web]` (threejs.org/docs/#api/en/math/Vector3.project; github r160
`src/math/Vector3.js` — `project` calls `applyMatrix4` which divides by the homogeneous
`w` component after multiplying by the 4×4 matrix).

`applyMatrix4` performs the full perspective divide (`divideScalar(w)`) with **no guard
on the sign of `w`** `[CERT-web]` (r160 `src/math/Vector3.js`, `applyMatrix4` body).
A point behind the near plane has `w ≤ 0`; dividing by it flips the sign of the
resulting NDC vector, so the point appears at an NDC coordinate with the **opposite sign**
from where it actually projects. A bounding-box corner behind the near plane therefore
produces a false NDC value that can land anywhere in `[−1, 1]`, causing a robust framing
check to incorrectly report the subject as "well framed" `[INFER]`.

### Robust framing without the sign trap

Build `pvMatrix = projectionMatrix × matrixWorldInverse` once per frame. For each bbox
corner, compute clip-space coordinates `(xc, yc, zc, wc)` by multiplying the matrix rows
directly WITHOUT dividing — keep `wc` separate. If any corner has `wc ≤ 0` the bbox
straddles or is entirely behind the near plane; do NOT fabricate an NDC value for it
`[INFER]`.

Pre-filter with `Frustum.setFromProjectionMatrix(pvMatrix).intersectsBox(box3)` as an
O(1) visibility check before processing individual corners `[CERT-web]`
(threejs.org/docs/#api/en/math/Frustum.setFromProjectionMatrix,
threejs.org/docs/#api/en/math/Frustum.intersectsBox).

Occupancy metric: clamp each valid NDC corner to `[−1, 1]` in both axes, then compute
the fraction of the viewport area covered by the projected AABB (range `[0, 1]`).
Well-framed heuristic: `occupancy ∈ [0.25, 0.85]` AND `|center_ndc| < 0.3` AND
`fullyVisible` (all corners have `wc > 0` AND all `|ndc| ≤ 1`). A subject partially
clipped by the near plane fails `fullyVisible` and must not pass the framing gate
`[INFER]`.

---

## 125.B — Bounding-volume integrity

### Box3 semantics

`Box3.containsBox` uses `≤` for all axis comparisons (concentric detection passes for
coincident faces) `[CERT-web]` (threejs.org/docs/#api/en/math/Box3.containsBox).
`Box3.intersectsBox` uses strict `<` — boxes that merely touch are counted as
intersecting `[CERT-web]` (threejs.org/docs/#api/en/math/Box3.intersectsBox).
`Box3.setFromObject(obj, true)` with `precise=true` traverses the full geometry for a
tight AABB instead of the node-hierarchy approximation `[CERT-web]`
(threejs.org/docs/#api/en/math/Box3.setFromObject).

AABB intersection-over-union (IoU) = `inter / (volA + volB − inter)` is a usable
first-pass redundancy filter for duplicate sub-assemblies. L-shaped and hollow parts
produce false positives because two L-shapes can have high volumetric IoU while not
occupying the same voxels `[INFER]`. Use `three-mesh-bvh` (MIT,
`github.com/gkjohnson/three-mesh-bvh`) for triangle-level overlap as an opt-in second
pass where first-pass IoU is inconclusive `[CERT-web]` (three-mesh-bvh README).

### Edge-manifold test

For each undirected edge `{i, j}` in the index buffer, count occurrences across all
triangles. Valence 2 on every edge → closed (two-manifold). Valence 1 → open boundary.
Valence ≥ 3 → non-manifold (two or more faces share a single directed edge). Runs in
O(F) over the face list `[CERT-web]` (threejs.org/docs/#api/en/core/BufferGeometry —
`index` attribute, half-edge convention).

Unwelded duplicate vertices register as open edges even for geometrically closed meshes.
Weld first with `BufferGeometryUtils.mergeVertices(geometry, tolerance)` before running
the manifold test `[CERT-web]` (threejs.org/docs/#api/en/utils/BufferGeometryUtils.mergeVertices).

### Signed-volume winding check

Signed volume via the divergence theorem: `V = Σ v1·(v2×v3) / 6` summed over all
triangles `(v1, v2, v3)` in CCW winding order as seen from outside the mesh `[CERT-web]`
(standard computational geometry; applied in three.js community QA tooling — see
threejs.org forum thread on watertight volume checking). A closed mesh with `V < 0` is
inside-out (CCW/CW winding is inverted); `V ≈ 0` on a nominally closed mesh indicates
open geometry or degenerate faces.

---

## 125.C — Cost and tessellation

### Adaptive circular tessellation

The number of segments to approximate a full circle of radius `r` at a target edge
length `L` is:

```
N = round(2·π·r / L)
```

clamped to a minimum of 3 `[INFER]` (sagitta chord-error analysis: each chord deviates
from the arc by `sagitta = r·(1 − cos(π/N))`; solve for the target sagitta to derive
`N`). A common draft formula `π·r / L` understates the required count by approximately
2× because it computes for a semicircle (arc `π·r`) rather than the full circumference
(arc `2·π·r`). Sphere height bands subtend a half-circle arc `π·r` — use the corrected
formula for a great-circle pass and halve `N` for a latitude band, not the other way
around `[INFER]`. Tube along-length segment count: `round(arcLength / L)`.

### Mesh reduction

Greedy voxel meshing (sweep-plane across a flat voxel face) achieves 85–97% triangle
reduction on flat surfaces compared to a naive per-cube mesh `[CERT-a]` (Mikola Lysenko,
"0fps.net — Meshing in a Minecraft Game", 2012,
`https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/`).

For imported GLB assets, `meshoptimizer`'s QEM-based simplifier (MIT,
`github.com/zeux/meshoptimizer`) is the correct build-time tool — it preserves UV/normal
seams via attribute quadrics `[CERT-web]` (meshoptimizer README, SIGGRAPH references in
`simplifier.cpp`). Three.js `SimplifyModifier` at r160 runs the Stan Melax 1998
curvature heuristic, not QEM, and smears texture seams; prefer meshoptimizer via
`gltf-transform` at build time `[CERT-web]` (see [Block 49]).

`BatchedMesh` is present in the r160 main build (`THREE.BatchedMesh`) with a
serial-draw fallback when `WEBGL_multi_draw` is absent, confirmed working under
SwiftShader headless `[CERT-web]` (threejs.org/docs/#api/en/objects/BatchedMesh; see
[Block 11]).

---

## 125.D — Core Three.js math

### Normal matrix

`Matrix4.compose(position, quaternion, scale)` and its inverse `.decompose` are the
standard Three.js path for building and reading TRS matrices `[CERT-web]`
(threejs.org/docs/#api/en/math/Matrix4.compose).

The **normal matrix** for transforming surface normals is the
`transpose(inverse(upper-left 3×3 of the model matrix))`, computed as
`Matrix3.getNormalMatrix(matrix4)` `[CERT-web]`
(threejs.org/docs/#api/en/math/Matrix3.getNormalMatrix). Using the full model matrix for
normals produces correct results only under uniform scale; under non-uniform scale normals
tilt toward the stretch axis and specular highlights are visibly wrong `[CERT-web]`
(confirmed in three.js shader source — `normalMatrix` is computed and passed as a
separate uniform, not reused from modelMatrix).

`Matrix4.makePerspective` sets element `te[11] = −1`, so for a forward point (`z < 0`
in camera space) clip-w = `−z > 0` `[CERT-web]` (threejs.org/docs/#api/en/math/Matrix4.makePerspective
— the perspective frustum convention).

### Quaternion edge cases

`Quaternion.setFromUnitVectors(from, to)` handles the antiparallel case (dot product
`≈ −1`, cross product `≈ 0`) by choosing an orthogonal axis: if `|from.x| > |from.z|`,
pick `(−from.y, from.x, 0)`; else `(0, −from.z, from.y)` `[CERT-web]` (r160
`src/math/Quaternion.js`, `setFromUnitVectors` body — antiparallel branch).

`Quaternion.slerp` negates the target quaternion `qb` when `cos < 0` (dot product
negative) to take the short arc `[CERT-web]` (r160 `src/math/Quaternion.js`, `slerp`
body — `if (cosHalfTheta < 0) { this.w = -qb.w … }`).

Using `VectorKeyframeTrack` for quaternion animation interpolates the four components
linearly, producing non-unit quaternions mid-interpolation that cause visible geometry
shrink. Use `QuaternionKeyframeTrack` which calls `Quaternion.slerpFlat` (normalized
slerp) `[CERT-web]` (threejs.org/docs/#api/en/animation/tracks/QuaternionKeyframeTrack).

### Euler

Six rotation orders are supported (`XYZ`, `YXZ`, `ZXY`, `ZYX`, `YZX`, `XZY`).
Gimbal lock occurs when `|m13| ≥ 0.9999999` (the middle rotation saturates to ±90°)
`[CERT-web]` (r160 `src/math/Euler.js`, `setFromRotationMatrix` body — gimbal lock
threshold). Changing `euler.order` after construction **re-interprets** the same stored
float values in the new axis order; it does NOT re-solve the rotation to preserve the
original orientation `[CERT-web]` (threejs.org/docs/#api/en/math/Euler.order — the note
states "does not affect the current rotation").

### Curve arc length and Frenet frames

`Curve.getUtoTmapping(u)` binary-searches the cumulative chord table returned by
`Curve.getLengths()` to convert a uniform arc-length fraction `u` to the corresponding
parameter `t` `[CERT-web]` (threejs.org/docs/#api/en/extras/core/Curve.getUtoTmapping,
threejs.org/docs/#api/en/extras/core/Curve.getLengths). Direct use of uniform `t` gives
non-uniform arc-length spacing; use `getPointAt(u)` / `getSpacedPoints(n)` when uniform
spacing is required `[CERT-web]` (threejs.org/docs/#api/en/extras/core/Curve.getPointAt).

`computeFrenetFrames` propagates normal vectors by rotating through inter-tangent angles
(parallel transport), distributing residual twist on closed curves. It is NOT a true
mathematical Frenet frame — it avoids the inflection-point flip at zero curvature by
design `[CERT-web]` (r160 `src/extras/curves/CatmullRomCurve3.js`, see also [Block 51]).
For tube assets requiring absolutely twist-free sweeps, implement the Wang 2008 double-
reflection rotation-minimizing frame (~20 lines of linear algebra) as a drop-in
replacement `[CERT-a]` (Wang et al. "Computation of Rotation Minimizing Frames",
ACM Transactions on Graphics 27(1) 2008).

### Spherical / OrbitControls phi clamp

`Spherical` (used internally by `OrbitControls`) clamps `phi` to `[EPS, π − EPS]` where
`EPS = 1e-6` to prevent gimbal lock at the poles `[CERT-web]` (r160
`src/math/Spherical.js`, `makeSafe` method).

---

## 125.E — Color / IBL / lighting (r160) — the "reads black" failures

### `scene.environmentIntensity` is INERT in r160

`scene.environmentIntensity` does **not exist** in `three@0.160.0`. Searching the r160
build (`build/three.module.js`) and source (`src/`) for `environmentIntensity` returns
zero hits `[CERT-web]` (verified 3 independent ways: grep of the minified build, grep
of the source tree, and absence from the r160 migration notes — the property was
introduced at scene level only in r164+). Any template or spec that writes
`scene.environmentIntensity = x` is setting a non-existent property; it runs silently
inert and the scene behaves as if the value is `1.0` regardless. The correct live
control for r160 is `material.envMapIntensity` (per-material, defaults `1`)
`[CERT-web]` (threejs.org/docs/#api/en/materials/MeshStandardMaterial.envMapIntensity).

### IBL setup path

`RoomEnvironment` + `PMREMGenerator.fromScene(env, roughness)` + `scene.environment`
is the standard IBL path for r160 `[CERT-web]`
(threejs.org/docs/#api/en/extras/PMREMGenerator; r160 `examples/jsm/environments/RoomEnvironment.js`).
Env-map textures must use `LinearSRGBColorSpace` `[CERT-web]`
(threejs.org/docs/#api/en/textures/Texture.colorSpace).

### Color management

`ColorManagement.enabled` defaults `true` in r152+ `[CERT-web]`
(threejs.org/docs/#api/en/math/ColorManagement). `renderer.outputColorSpace` defaults
`SRGBColorSpace` `[CERT-web]` (threejs.org/docs/#api/en/renderers/WebGLRenderer.outputColorSpace).
`texture.encoding` and `renderer.outputEncoding` are deprecated at r152; use
`texture.colorSpace = THREE.SRGBColorSpace` and `renderer.outputColorSpace` `[CERT-web]`
(three.js r152 migration guide). The sRGB piecewise transfer uses threshold `0.04045`
and exponent `2.4` `[CERT-web]` (IEC 61966-2-1 standard, referenced in three.js color
management docs). RAL 7035 authored as a raw float hex without `Color.set('#hex')` is
approximately 2× too dark in the linear pipeline because sRGB gamma is not applied;
always construct via `new THREE.Color().setStyle('#hex')` or `new THREE.Color(hex)` with
a hex integer `[CERT-a]` (three.js forum, color management thread 2022+).

### Tone mapping

`AgXToneMapping` (enum value `6`) is present in r160 and preserves sub-0.1 luminance
detail, making it the correct choice for low-key dark metal renders (avoids the black
compression in `ACESFilmicToneMapping`) `[CERT-web]`
(threejs.org/docs/#api/en/constants/Renderer — tone mapping constants; r160
`src/constants.js`). Pair with `renderer.toneMappingExposure ≈ 0.9` as a starting point
`[CERT-web]` (threejs.org/docs/#api/en/renderers/WebGLRenderer.toneMappingExposure).

### RectAreaLight under SwiftShader

`RectAreaLight` requires the `ltc_1`/`ltc_2` LTC texture uniforms to be loaded via
`RectAreaLightUniformsLib.init()` before use `[CERT-web]`
(threejs.org/docs/#api/en/lights/RectAreaLight — the "Notes" section warns that
`RectAreaLightUniformsLib` must be explicitly imported and initialized). If the init call
is absent, the shader errors and silently skips rendering that pass. Drop `RectAreaLight`
from the SwiftShader headless QA path to avoid this failure mode `[INFER — consistent
with observed blank renders during catalog QA]`.

### Physical light units

Three.js default physical light units have been active since r155 `[CERT-web]` (r155
migration notes — `renderer.useLegacyLights` removed). A `decay: 1` template inherited
from pre-r155 code is over-bright because it approximates the old non-physical falloff;
use `decay: 2` (inverse-square) with a calibrated `intensity` in candela/lumens `[CERT-web]`
(threejs.org/docs/#api/en/lights/PointLight.decay; see [Block 4]).

---

## 125.F — Equation families (adopt candidates)

### Superquadrics for rounded housings

Superquadric implicit form: `|x/a|^r + |y/b|^r + |z/c|^r = 1`. Parametric via the
signed-power function `sp(v, e) = sign(v) · |v|^e` (`e = 2/r`) — one roundness
parameter controls the blend from a rectangular box (`r → ∞`) through an ellipsoid
(`r = 2`) to a hypocuboid (`r < 2`). Useful for chamfered equipment housings, pressure
tanks, and conduit elbows `[CERT-a]` (Barr 1981, "Superquadrics and Angle-Preserving
Transformations"; three.js community implementations).

### Catmull-Rom for hose/pipe runs

`CatmullRomCurve3` with `curveType = 'centripetal'` (alpha 0.5) is the correct default
for industrial pipe/hose routing — the centripetal parametrization is mathematically
guaranteed to produce no cusps or self-intersections between control points `[CERT-web]`
(threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3 — `curveType` docs; Yuksel 2011
no-cusp proof, see [Block 51]).

### SDF smooth-min for fillets

SDF primitives combined via polynomial smooth-min (`smin(a, b, k) = mix(b, a, …)` with
smoothing radius `k`) produce C1-continuous fillets suitable for rounded flanges and
cable runs `[CERT-web]` (Inigo Quilez, "Smooth min", iquilezles.org — referenced in
three.js forum threads on procedural SDFs). `MarchingCubes` (three.js
`examples/jsm/objects/MarchingCubes.js`) can isosurface these fields `[CERT-web]`
(threejs.org/docs/#examples/en/objects/MarchingCubes; see [Block 50]).

### Mass / volume / centroid

Use the divergence-theorem signed-volume sum (§125.B) for volume. Centroid: `C = (1 /
(6V)) · Σ (v1 + v2 + v3) · (v1 · (v2 × v3))` summed over all triangles `[INFER]`
(standard computational geometry identity, consistent with the volume formula).

### OBB for long thin subjects

An oriented bounding box (OBB) via PCA (covariance matrix of vertex positions →
eigenvectors as OBB axes) gives a tight framing box for long thin subjects (pipes,
conveyors, door panels) where the axis-aligned AABB wastes 40–70% of the viewport
`[INFER]`. Three.js ships `Box3` (AABB only); OBB must be built on top or sourced from
the `three-mesh-bvh` extended support classes `[CERT-web]`
(three-mesh-bvh README — OBBHelper).

---

## 125.G — What landed (traceability)

The following utilities shipped in the `design3d` kit improvement pass (PR #1,
`angeles725/design3d-kit`, 2026-08-09) as direct products of the findings documented
in this block:

- **`geom-verify.mjs`** — framing gate with clip-w guard (§125.A), signed-volume winding
  check (§125.B), edge-manifold valence check (§125.B), NDC occupancy metric (§125.A).
- **`adaptive-segments.mjs`** — corrected `round(2·π·r / L)` formula (§125.C);
  replaces the `π·r / L` draft that understated N by ~2×.
- **Pipe-run wiring** — `CatmullRomCurve3` centripetal + `TubeGeometry` with
  `getSpacedPoints` for uniform fitting spacing (§125.D, §125.F).

---

## 125.H — Pending / gaps

Documented findings not yet adopted in the kit or catalog at time of writing:

- **RMF helper (§125.D)**: Wang 2008 double-reflection rotation-minimizing frame not
  yet implemented; `computeFrenetFrames` is still the fallback for all tube sweeps.
- **`getNormalMatrix` guidance (§125.D)**: no kit utility enforces the correct normal
  matrix path; assets with non-uniform scale currently pass QA with visually wrong
  normals if the author forgets `Matrix3.getNormalMatrix`.
- **Superquadrics helper (§125.F)**: no kit geometry primitive for rounded housings;
  requires external implementation.
- **AgX + `envMapIntensity` recipe (§125.E)**: the shell template still uses
  `ACESFilmicToneMapping`; the `scene.environmentIntensity` → `material.envMapIntensity`
  migration is pending for the template scaffolding.
- **65 catalog specs declaring `scene.environmentIntensity` (§125.E)**: `[CERT-web]`
  verified inert in r160; each spec file declares a dead property. A uniform superseding
  note has been inserted (per the "supersede, do not rewrite" protocol — see memory
  observation), but the machine-readable `envMapIntensity` values in each spec still
  need individual numeric correction.
- **OBB framing (§125.F)**: NDC framing gate (§125.A) uses AABB projection; OBB via
  PCA would improve framing accuracy for long thin subjects without changing the
  gate contract.
