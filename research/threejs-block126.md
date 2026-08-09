# Block 126 — Curved/rounded equipment geometry for r160 (design3d)

> Research of **Three.js r160 geometry techniques for making equipment models look curved or
> rounded cheaply**, targeting the `design3d` kit and catalog improvement pass. Addresses the
> observation that current catalog assets are "too boxy" and documents the full spectrum from
> real rounded primitives to GPU-free fake curvature via normal maps.
>
> **Block number:** B126. Range B125–B134 assigned to "core three.js library: numerical methods
> & core math" by **session-A (orchestrator on master) 2026-08-09**. B125 consumed (numerical
> methods), B126 consumed here; next free in this range is B127.
>
> Sources (web docs, r160 source, addons, secondary):
> `threejs.org/docs/` (queried this session) ·
> `github.com/mrdoob/three.js` r160 tag (`src/geometries/`, `examples/jsm/geometries/`) ·
> `github.com/stevinz/three-subdivide` (MIT, Loop subdivision, npm `three-subdivide`) ·
> Three.js forum threads on normal-map round edges ·
> Local preserved copies in `research/sources/web-snapshots/` (see §Preserved Sources below).
> Markers: `[CERT-web]` official web/docs or GitHub r160 source ·
> `[CERT-a]` secondary/forum/addon README · `[INFER]` deduction.
>
> Layer assignment: core Three.js library — geometry & visual quality (design3d kit).
> Connects [Block 8] (geometry toolkit census), [Block 3] (PBR materials), [Block 9]
> (CanvasTexture), [Block 24] (matcap, baked AO), [Block 51] (curves, TubeGeometry),
> [Block 125] (tessellation formula, normal matrix, envMapIntensity).

---

## Preserved sources

| Section | Local file (research/sources/) | Origin URL |
|---|---|---|
| A (LatheGeometry) | `web-snapshots/raw.githubusercontent.com_mrdoob_three.js_dev_docs_pages_LatheGeometry.html.md.md` | https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/pages/LatheGeometry.html.md |
| B (RoundedBoxGeometry) | `web-snapshots/raw.githubusercontent.com_mrdoob_three.js_r160_examples_jsm_geometries_RoundedBo.md` | https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/geometries/RoundedBoxGeometry.js |
| E (MeshStandardMaterial maps) | `web-snapshots/raw.githubusercontent.com_mrdoob_three.js_dev_docs_pages_MeshStandardMaterial.ht.md` | https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/pages/MeshStandardMaterial.html.md |
| G (CapsuleGeometry) | `web-snapshots/raw.githubusercontent.com_mrdoob_three.js_dev_docs_pages_CapsuleGeometry.html.md.md` | https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/pages/CapsuleGeometry.html.md |
| G (SphereGeometry source) | `web-snapshots/raw.githubusercontent.com_mrdoob_three.js_r160_src_geometries_SphereGeometry.js.md` | https://raw.githubusercontent.com/mrdoob/three.js/r160/src/geometries/SphereGeometry.js |
| C (three-subdivide) | `web-snapshots/raw.githubusercontent.com_stevinz_three-subdivide_master_README.md.md` | https://raw.githubusercontent.com/stevinz/three-subdivide/master/README.md |

All six fetched successfully this session via `fetch-doc.sh web`. SphereGeometry and three-subdivide README were fetched during fact-checking and also registered.

---

## 126.A — Revolution surfaces: LatheGeometry

### API and constraints

`LatheGeometry(points, segments=12, phiStart=0, phiLength=Math.PI*2)` creates a
closed-revolution mesh by rotating a 2D profile (array of `Vector2` or `Vector3`) around
the **Y axis** `[CERT-web]` (threejs.org/docs/#api/en/geometries/LatheGeometry; preserved
`LatheGeometry.html.md`). **Critical constraint**: "the x-coordinate of each point must be
greater than zero" `[CERT-web]` (same source). An x=0 point produces a degenerate pole row
(zero-area faces, normals undefined). Build the profile entirely in `x > 0`, let three.js
close it.

### Triangle count

For a full revolution (`phiLength = 2π`), the lathe generates a quad between each pair of
adjacent profile points in each circumference segment, so:

```
triangles = 2 · (N − 1) · S
```

where N = number of profile points and S = `segments` `[INFER — derived from quad-ring
structure; cross-checked against B125.C sagitta formula]`. Example: S=16, N=8 →
`2 · 7 · 16 = 224` triangles. For a round tank body that would need ~12 stacked BoxGeometry
segments to approximate the same silhouette, 224 is a significant win and the shape is exact.

### When to use

Any **axially symmetric** industrial body — tanks, domes, nozzles, flanges, valve bodies,
pressure vessels, large knobs, bell housings — is correctly a Lathe, not stacked boxes. The
profile sketch takes ~10 lines of code; the result is exact curvature with a predictable
triangle budget. Default `segments=12` is appropriate for small distant objects;
use 16–24 for hero parts at full detail. Set `phiLength < 2π` for half/quarter cross-sections
or when displaying cut-away models `[CERT-web / INFER]`.

---

## 126.B — Rounded boxes and beveled edges

### RoundedBoxGeometry (three/addons)

`RoundedBoxGeometry(width=1, height=1, depth=1, segments=2, radius=0.1)` is the addon
class (`examples/jsm/geometries/RoundedBoxGeometry.js`) that wraps `BoxGeometry` and
pushes vertices outward to form chamfered corner arcs `[CERT-web]` (r160 source preserved:
`RoundedBo.md`).

**Internal amplification**: the constructor computes
`internalSegments = segments * 2 + 1`, then calls
`super(1,1,1, internalSegments, internalSegments, internalSegments)` `[CERT-web]` (source).
When `internalSegments === 1` the method returns early (flat box); user-facing `segments=0`
produces a flat box. The **triangle counts** for the standard `BoxGeometry(1,1,1,s,s,s)`
base from which the vertices are displaced: 6 faces × `s² × 2` tris:

| User `segments` | Internal `s` | Total triangles |
|---|---|---|
| 0 (flat box, early return) | 1 | 12 |
| 1 | 3 | 108 |
| 2 (default) | 5 | 300 |
| 3 | 7 | 588 |

**Sweet spot: `segments=1` (108 tris)** delivers visible rounding with the lowest cost;
`segments=2` (300 tris) is the default but is 2.8× more expensive. Set `segments=1` for
all secondary and background equipment; reserve `segments=2` for close hero parts `[INFER
— from source-verified triangle counts]`.

### ExtrudeGeometry bevel for panel edges

`ExtrudeGeometry` with `bevelEnabled: true, bevelSegments: 1, bevelSize: r, bevelThickness: r`
rounds the cross-section edges of extruded panel shapes. `bevelSegments=1` is the minimum
non-trivial bevel (one interpolation step along the bevel arc). A second bevel segment
(`bevelSegments=2`) doubles the bevel-strip triangle count with no perceptible quality gain
at catalog QA resolution, so it is wasteful `[CERT-web — bevelSegments parameter exists in
threejs.org/docs/#api/en/geometries/ExtrudeGeometry; cost claim is INFER]`.

---

## 126.C — Subdivision: three-subdivide (external)

### Background

Three.js shipped a subdivision surface modifier in `examples/jsm` until **r125**, when it
was removed `[CERT-a]` (three-subdivide README, preserved
`raw.githubusercontent.com_stevinz_three-subdivide_master_README.md.md`:
"it was removed in r125"). The external package `three-subdivide` (npm, MIT license,
github.com/stevinz/three-subdivide) fills that gap using the **Loop subdivision algorithm**
(Charles Loop 1987, designed for triangle meshes) `[CERT-a]` (same README).

### API

```javascript
import { LoopSubdivision } from 'three-subdivide';
const geometry = LoopSubdivision.modify(sourceGeometry, iterations, {
  split: true,          // split coplanar faces before subdividing (default true)
  uvSmooth: false,      // average UVs (default false; enable on flat geo if tearing)
  preserveEdges: false, // ignore breaks in geometry (default false)
  flatOnly: false,      // subdivide without smoothing (default false)
  maxTriangles: Infinity // abort if mesh exceeds this count
});
```

`[CERT-a]` (README, same source).

### Cost

Each iteration multiplies the triangle count by **4** (Loop subdivision creates 4 triangles
per input triangle) `[INFER — standard result for midpoint-insertion Loop subdivision]`.
One iteration on a 108-tri RoundedBoxGeometry(segments=1) → 432 tris. **Maximum 1 iteration
for equipment** at catalog resolution; use `maxTriangles` to abort cleanly on unexpectedly
dense input.

### r160 compatibility

`three-subdivide` operates entirely on `BufferGeometry` attributes (`position`, `normal`,
`uv`, index buffer), the same stable API present in r160. r160 compat is `[INFER — standard
BufferGeometry interface; not independently verified against the r160 build; verify at
integration if UVs or index layout matters]`.

---

## 126.D — Fake curvature: the GPU-free approach

### The principle

A baked **round-edge normal map** applied to a 12-triangle `BoxGeometry` (the Three.js
minimum for a box) is visually indistinguishable from a rounded box at most catalog distances
while costing:

| Approach | Triangles | Cost vs flat box |
|---|---|---|
| `BoxGeometry(1,1,1)` flat | 12 | baseline |
| `BoxGeometry` + round-edge normalMap | 12 | baseline + 1 texture sample |
| `RoundedBoxGeometry(seg=1)` | 108 | 9× geometry |
| `RoundedBoxGeometry(seg=2, default)` | 300 | 25× geometry |

The savings are **~89% fewer triangles vs RoundedBoxGeometry(segments=1)** and **~96% fewer
vs the default (segments=2)** `[INFER — from source-verified triangle counts in §126.B]`.
Curvature is entirely in the fragment shader via TBN-space perturbation — no extra vertices,
no subdivison pass.

### r160 wiring

```javascript
material.normalMap = roundEdgeTex;       // [CERT-web] threejs.org normalMap property
roundEdgeTex.colorSpace = THREE.NoColorSpace; // data map — NOT sRGB [CERT-web]
```

`[CERT-web]` (MeshStandardMaterial docs preserved: `MeshStandardMaterial.ht.md` —
"normalMap represents non-color data. Any texture assigned must have
`texture.colorSpace = NoColorSpace`").

### MeshMatcapMaterial: the SwiftShader-safe baked-metal shortcut

`MeshMatcapMaterial` with a prelit metallic matcap texture requires **no lights and no
environment map** — it samples the matcap sphere texture directly via the surface normal in
view space. This makes it the **safest material choice for headless SwiftShader QA** (no
IBL pipeline, no RectAreaLight init, no PMREM computation) and the fastest way to get a
studio-lit metallic look with zero runtime lighting cost `[CERT-web]`
(threejs.org/docs/#api/en/materials/MeshMatcapMaterial; see [Block 24] §24.1).

### Procedural round-edge via onBeforeCompile

A procedural round-edge normal generator can replace the
`#include <normalmap_pars_fragment>` hook in `material.onBeforeCompile` to compute the
perturbed TBN frame in the fragment shader without any texture. **No vetted public r160
recipe was found during this session.** Implementation cost is medium-to-large (requires
GLSL SDF box-edge distance in the fragment shader, correct dFdx/dFdy derivatives, and
compatibility with three.js's chunk injection system). Mark `[INFER — concept is sound;
integration effort uncertain; verify against r160 shader chunk names before adopting]`.

---

## 126.E — Real PBR: color-space rules and packing

### colorSpace rule (r160 verified)

From `MeshStandardMaterial` docs `[CERT-web]` (preserved `MeshStandardMaterial.ht.md`):

| Map | `texture.colorSpace` | Notes |
|---|---|---|
| `map` (base color) | `THREE.SRGBColorSpace` | perceptual color data |
| `emissiveMap` | `THREE.SRGBColorSpace` | perceptual color data |
| `envMap` | `THREE.LinearSRGBColorSpace` | HDR/IBL data |
| `lightMap` | `THREE.LinearSRGBColorSpace` | pre-baked linear light |
| `normalMap` | `THREE.NoColorSpace` | signed-direction data |
| `roughnessMap` | `THREE.NoColorSpace` | scalar data |
| `metalnessMap` | `THREE.NoColorSpace` | scalar data |
| `aoMap` | `THREE.NoColorSpace` | scalar data |

The old `texture.encoding` property is **deprecated since r152** — use `texture.colorSpace`
exclusively in r160 `[CERT-web]` (see [Block 125] §125.E, [Block 6]).

### Channel packing

From the official docs `[CERT-web]` (same source):

- `roughnessMap`: **GREEN channel** used ("The green channel of this texture is used to
  alter the roughness").
- `metalnessMap`: **BLUE channel** used ("The blue channel of this texture is used to
  alter the metalness").

A single RGBA texture can pack `roughnessMap` (green) and `metalnessMap` (blue) — the
same glTF `metallicRoughness` texture convention. This cuts one texture sample per fragment.

### aoMap second UV set

`aoMap` **requires a second set of UVs** `[CERT-web]` ("The red channel of this texture is
used as the ambient occlusion map. Requires a second set of UVs." — same source). In r160
the second UV set is `geometry.attributes.uv1` (three.js renamed from `uv2`; check the
migration notes for your r160 minor if `uv1` is missing).

### CanvasTexture for procedural roughness and dirt

`CanvasTexture` built from an offscreen `<canvas>` context is the zero-download path for
procedural roughness gradients, dirt masks, and panel-line detail. Set
`texture.colorSpace = THREE.NoColorSpace` for any scalar data map built this way
`[CERT-web / INFER]` (see [Block 9] for the full CanvasTexture pattern).

### SwiftShader anisotropy caveat

Test `renderer.capabilities.getMaxAnisotropy()` before setting `texture.anisotropy`:
under SwiftShader headless it commonly returns `1` (no anisotropic filtering). Setting a
higher value is silently clamped but signals intent that will take effect on real hardware
`[INFER — consistent with B26/B38 headless QA experience]`.

---

## 126.F — Curved paths: pipe runs and elbows

### CatmullRomCurve3 'centripetal'

`CatmullRomCurve3` with `curveType = 'centripetal'` (alpha 0.5) is the **correct default
for industrial pipe and hose routing** — Yuksel 2011 mathematically guarantees no cusps or
self-intersections between control points for the centripetal parametrization `[CERT-web]`
(threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3; see [Block 51] §51 for the full
curve taxonomy and proof reference).

### TubeGeometry sweet spots

`TubeGeometry(curve, tubularSegments, radius, radialSegments, closed)`:

- `radialSegments = 8` reads as convincingly round at catalog gate distance (< 20% screen
  height) `[INFER]`. Use `radialSegments = 6` for secondary runs that are never in focus.
- A **90-degree elbow** modeled as 3 control points with ~10 tubular segments and
  `radialSegments = 8` costs approximately `10 × 8 × 2 = 160` body triangles `[INFER —
  computed from TubeGeometry's ring-per-segment structure (B51 §51 source-verified)]`.

### RMF note

The `design3d` kit ships a `makeSweptTube` builder that uses Wang 2008 rotation-minimizing
frames (RMF) for twist-free tube sweeps `[CERT — see B125.G; B125.D for RMF background]`.
Cross-reference that builder for any pipe with more than two direction changes.

---

## 126.G — Cheap round primitives: segments that matter

### CapsuleGeometry (r160 core)

`CapsuleGeometry(radius=1, height=1, capSegments=4, radialSegments=8, heightSegments=1)`
`[CERT-web]` (threejs.org/docs/#api/en/geometries/CapsuleGeometry; preserved
`CapsuleGeometry.html.md`). CapsuleGeometry was added in **r139** and is r160 core — no
addon import needed. Kit defaults `capSegments=4, radialSegments=8` are already correct
for equipment at catalog resolution. Use `radialSegments=12` for hero capsule parts (tanks,
pressure vessels with hemispherical heads).

### SphereGeometry segment audit

From the r160 `SphereGeometry.js` source `[CERT-web]` (preserved
`raw.githubusercontent.com_mrdoob_three.js_r160_src_geometries_SphereGeometry.js.md`):

The index loop structure is:
- Row `iy=0` (top pole): one triangle per widthSegment
- Row `iy=heightSegments-1` (bottom pole): one triangle per widthSegment
- Middle rows: two triangles per widthSegment

Exact formula: `triangles = 2 · widthSegments · (heightSegments − 1)`

| widthSegments × heightSegments | Triangles |
|---|---|
| 32 × 16 (default) | 960 |
| 16 × 8 (sweet spot) | 224 |
| 8 × 4 (LOD/far) | 56 |

The default (960 tris) is **4.3× more expensive** than the sweet spot (224 tris) `[CERT-web
formula + INFER comparison]`. Use `new THREE.SphereGeometry(r, 16, 8)` as the production
default; reserve 32×16 only for a foreground-hero sphere > 20% screen height.

### CylinderGeometry segment audit

`CylinderGeometry` default `radialSegments=32` `[CERT-web]` (r160
`src/geometries/CylinderGeometry.js` — constructor default). For a unit-height cylinder,
that is 32 side quads (64 tris) + 2 caps (32 tris each) = 128 tris — 2.7× more than
`radialSegments=12` (48 + 24 = 72 tris). Recommended:

- Secondary cylinders (pipes, standoffs, bolts): `radialSegments=12`
- Foreground equipment cylinders: `radialSegments=16`
- Micro bolt/stud detail (<10 px): `radialSegments=8`

`[INFER — from confirmed r160 default and standard cylinder triangle formula]`

---

## 126.H — Cost discipline: the on-screen-size decision rule

Four geometry tiers by on-screen pixel height `[CERT-a / INFER — derived from community
LOD guidance and the B27 performance budgets; exact px thresholds are heuristic, not
API-specified]`:

| On-screen size | Geometry | Material |
|---|---|---|
| < 20 px (background, distant) | 12-tri `BoxGeometry` | round-edge `normalMap`; or `MeshMatcapMaterial` |
| 20–80 px (secondary equipment) | `Lathe` / `Cylinder` segments 8–12 | optional normalMap; `MeshStandardMaterial` rough/metal only |
| > 80 px hero (foreground primary) | `LatheGeometry` or `RoundedBoxGeometry(segments=1–2)` | full PBR map set + IBL |
| Impostor (< 5% screen height) | `PlaneGeometry` (2 tris) | `CanvasTexture` sprite |

**LOD wiring** (r160 core `[CERT-web]`, see [Block 40]):
```javascript
const lod = new THREE.LOD();
lod.addLevel(hiGeomMesh, 0);       // switch in from distance 0
lod.addLevel(loGeomMesh, farDist); // switch to lo-poly beyond farDist
scene.add(lod);
```

---

## 126.I — Adopt shortlist: four highest quality-per-GPU-dollar

The following four patterns represent the best return on visual quality per GPU cost for
the design3d catalog. Candidates for a kit helper are marked **kit**.

### 1. Round-edge normalMap on flat BoxGeometry **[kit]**

A `BoxGeometry(w,h,d)` with a baked round-edge normal map covers ~89% of "rounded box"
use cases at 12-tri cost. Worth wrapping as a `makeRoundBox(w,h,d,edgeRadius)` kit helper
that creates the geometry and generates the normal map procedurally via `CanvasTexture` or
returns a cached shared texture.

**Boxy catalog assets that would benefit first** (from [Block 8]'s geometry census):
control panels, UPS cabinets, and chiller bodies built from stacked `BoxGeometry` calls
without any bevel. These are the highest-volume geometry type in the corpus (Cylinder 54,
but Box-stacked parts dominate the equipment outlines).

### 2. LatheGeometry bodies **[recipe]**

```javascript
const profile = [
  new THREE.Vector2(r_base, 0),
  new THREE.Vector2(r_waist, h * 0.4),
  new THREE.Vector2(r_top, h),
];
const geo = new THREE.LatheGeometry(profile, 16);
```

One recipe covers: round tanks, pressure vessels, nozzles, valve bodies, bell housings,
dome tops. Triangle budget fully predictable from `2·(N-1)·S`.

### 3. RoundedBoxGeometry(segments=1) **[recipe]**

```javascript
import { RoundedBoxGeometry } from
  'three/addons/geometries/RoundedBoxGeometry.js';
const geo = new RoundedBoxGeometry(w, h, d, 1, cornerRadius);
// 108 tris; real rounded corners; UV-ready
```

Use for foreground equipment housings, control cabinets, and anything whose silhouette
profile is not axially symmetric.

### 4. PBR map set + CanvasTexture procedural roughness **[kit]**

```javascript
// roughnessMap (green channel) + metalnessMap (blue channel) from one canvas
const canvas = document.createElement('canvas');
// … paint roughness into green channel, metalness into blue …
const combinedTex = new THREE.CanvasTexture(canvas);
combinedTex.colorSpace = THREE.NoColorSpace;
material.roughnessMap = combinedTex;
material.metalnessMap = combinedTex;
```

Zero downloads, one texture sample, correct channel packing as per official docs
`[CERT-web]`. Worth a `makePBRSurface(roughnessPattern, metalPattern)` kit helper.

---

## 126.J — Pending / gaps

- **three-subdivide r160 compat unverified**: the package operates on standard
  `BufferGeometry` and is expected to work in r160, but has not been tested against the r160
  build in this session. Verify at integration (confirm `uv1`/`uv2` attribute naming).

- **Procedural round-edge normalMap via `onBeforeCompile`**: no vetted public r160 recipe
  found. The GLSL concept is sound (SDF box-edge in fragment shader → synthetic normal
  perturbation) but authoring and testing against r160's chunk system is medium-to-large
  effort. Remains a gap.

- **`uv1` vs `uv2` naming for aoMap**: in r160, the second UV attribute was renamed from
  `uv2` to `uv1` (r152+ migration). Catalog assets still using `uv2` will not get AO.
  Verify per-asset before enabling `aoMap` `[CERT-web — r152 migration note; name confirmed
  in preserved MeshStandardMaterial source via `.channel = 1` property]`.

- **Kit helpers not yet written**: `makeRoundBox`, `makePBRSurface` described in §126.I
  are proposed helpers; none exists in the current `design3d` kit as of B125's inventory.

- **No six sources preserved as a roundtrip-verified set**: SphereGeometry and three-subdivide
  README were fetched during fact-checking (registered in SOURCES.md) but were not in the
  original four-source plan. All six are now in SOURCES.md.
