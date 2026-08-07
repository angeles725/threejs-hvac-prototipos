# Block 50 — Isosurface extraction: Marching Cubes (Lorensen-Cline 1987) vs Dual Contouring (Ju et al. 2002) — the maths, what `three.js/MarchingCubes.js` ACTUALLY runs, the honest JS-ecosystem maturity, and where isosurfaces fit the HVAC prototypes

> RUN 9, sixth block (axis: algorithmic/numerical methods for better design tools). Answers G63. Documents
> (a) the **Marching Cubes** algorithm from primary/canonical sources — the scalar field on a uniform grid,
> the isovalue, the 8-bit `cubeindex` → 256 configurations → **15 base cases by symmetry**, the edge/tri
> lookup tables, and the **linear interpolation** of the edge crossing (`t = (iso−v0)/(v1−v0)`), plus the
> face/interior **ambiguities** and how they are resolved (Nielson-Hamann **asymptotic decider**,
> Chernyaev's 33-case topological variant); (b) **Dual Contouring of Hermite Data** — one vertex **per cube**
> placed by minimising a **QEF** (quadratic error function) over the edge-crossing points and their Hermite
> **normals**, which preserves **sharp features** that MC rounds, at the cost of needing gradient/normal data;
> (c) what three.js `examples/jsm/objects/MarchingCubes.js` really is (a fixed-uniform-grid real-time metaball
> surfacer, `mu = (isol−valp1)/(valp2−valp1)` linear interp verified in source, no sharp-feature handling);
> (d) an HONEST JS-ecosystem maturity check (three.js ships MC only; `isosurface` npm ships MC + marching
> tetrahedra + **surface nets** — a *dual* method but NOT feature-preserving DC; dual contouring proper has
> **no maintained npm library**, only demo repos); (e) the actionable decision rule for the HVAC/nave tools.
>
> Subject version: three.js `dev` branch `examples/jsm/objects/MarchingCubes.js` (retrieved 2026-08-07) ·
> Lorensen & Cline, "Marching Cubes: A High Resolution 3D Surface Construction Algorithm", *Computer
> Graphics* 21(4):163-169, SIGGRAPH 1987 (via Paul Bourke's canonical reference implementation + Wikipedia) ·
> Ju, Losasso, Schaefer & Warren, "Dual Contouring of Hermite Data", *ACM TOG* 21(3):339-346, SIGGRAPH 2002
> (preserved PDF).
>
> Sources: `sources/web-snapshots/raw.githubusercontent.com_mrdoob_three.js_dev_examples_jsm_objects_MarchingCubes.md`
> (three.js source) · `sources/web-snapshots/paulbourke.net_geometry_polygonise_.md` (Bourke, canonical MC
> reference impl + edge/tri tables + `VertexInterp`) · `sources/web-snapshots/en.wikipedia.org_wiki_Marching_cubes.md`
> (15 cases, ambiguities, asymptotic decider, Chernyaev, patent) · `sources/manuals/dualcontour-ju-2002.pdf`
> → `sources/extracted/dualcontour-ju-2002.md` (the DC paper) · `sources/web-snapshots/www.boristhebrave.com_2018_04_15_dual-contouring-tutorial_.md`
> (authoritative DC explainer — QEF form + the colinear-normal instability) ·
> `sources/web-snapshots/raw.githubusercontent.com_mikolalysenko_isosurface_master_README.md.md` (`isosurface` npm).
> Method: WebFetch/curl of each source, PRESERVED to `sources/` (sha256-registered) BEFORE citing; the MC
> tables + `mu` formula verified against the three.js source and Bourke's reference impl; the DC definitions
> verified against the primary paper text (its equation IMAGES did not OCR — see §50.3 honesty note). Markers
> (METHODOLOGY §3): `[CERT]` local `file:line` of a preserved snapshot (extern, token-verified by reading) ·
> `[CERT-doc]` the DC paper PDF · `[CERT-web]` official web source (Bourke/Wikipedia/GitHub README) · `[CERT-a]`
> secondary explainer (boris the brave) · `[INFER]` deduction (determinant/plane algebra, ecosystem judgment).
> Block type: **DESIGN/APPLIED** (algorithm exposition + library evaluation + a build-tool rule) — a high
> `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an exhaustion signal.

---

## 50.1 — Marching Cubes: scalar field → per-cube config index → linear-interpolated crossings `[CERT-web]`

Marching Cubes (MC) polygonises the **isosurface** (a level set) of a 3D **scalar field** sampled on a regular
grid. Bourke's canonical statement of the problem:

> "The fundamental problem is to form a facet approximation to an isosurface through a scalar field sampled on
> a rectangular 3D grid. Given one grid cell defined by its vertices and scalar values at each vertex, it is
> necessary to create planar facets that best represent the isosurface through that grid cell." `[CERT-web]`
> `paulbourke.net_geometry_polygonise_ §Solution`.

**The per-cube configuration index.** Each of a cube's 8 corners is classified inside/outside the isovalue,
giving an **8-bit index** into two lookup tables (`edgeTable` → which of the 12 edges are cut; `triTable` →
which cut-edges form which triangles):

```
cubeindex = 0;
if (grid.val[0] < isolevel) cubeindex |= 1;   ...   if (grid.val[7] < isolevel) cubeindex |= 128;
```
`[CERT-web]` `paulbourke.net_geometry_polygonise_ §source` (the 8-bit build + the 256-row `edgeTable`/`triTable`).
`cubeindex = 0` (all outside) or `0xff` (all inside) return no facets; each non-trivial case yields **1-5
triangles** `[CERT-web]` `paulbourke.net_geometry_polygonise_ §Solution` ("There at most 5 triangular facets
necessary").

**256 raw configurations → 15 base cases by symmetry.** The overview on the same page:

> "there are 256 possible configurations of corner classifications … If you account for symmetries, there are
> really only 14 unique configurations in the remaining 254 possibilities." `[CERT-web]`
> `paulbourke.net_geometry_polygonise_ §Algorithm Details` (Ward's overview; the classic count is **15** base
> cases incl. the empty case).

Wikipedia states the same reduction and attributes it to Lorensen & Cline:

> "the original Marching Cubes algorithm … used the reflective symmetry and also sign changes to build the
> table with **15 unique cases**." `[CERT-web]` `en.wikipedia.org_wiki_Marching_cubes §… table with 15 unique
> cases` (the SIGGRAPH 1987 paper by Lorensen & Cline; MC was **patented** — US Patent, since expired
> `[CERT-web]` same page `§cite_note-US_Patent`).

**Linear interpolation of the crossing (the load-bearing per-vertex formula).** Where the surface cuts an
edge between corner `P1`(value `V1`) and `P2`(value `V2`), the crossing is placed by **linear interpolation**
in the field value:

> `P = P1 + (isovalue − V1)·(P2 − P1) / (V2 − V1)` `[CERT-web]`
> `paulbourke.net_geometry_polygonise_ §… intersection point P is given by`, implemented as
> `mu = (isolevel − valp1)/(valp2 − valp1)` in `VertexInterp` `[CERT-web]` same file `§VertexInterp`.

i.e. the interpolation parameter is `t = (iso − v0)/(v1 − v0)` — exactly the formula in the task brief, verified
in the reference implementation. (Defaulting the crossing to the edge midpoint instead of interpolating is the
cheap-but-blocky variant; interpolation "will obviously give you better shading … and smoother surfaces"
`[CERT-web]` `§Algorithm Details`.) Vertex **normals** for smooth shading come from **central differences** of
the field at cube corners, interpolated along the edge `[CERT-web]` `§Example 2` ("computed using Central
Differences of the volumetric data").

## 50.2 — MC's Achilles heel: face/interior ambiguity, and how it is resolved `[CERT-web]`

The plain 1987 table is **not topologically watertight** — adjacent cubes can disagree at a shared face,
leaving holes. Wikipedia states the two ambiguity classes and the fix lineage:

> "due to the existence of ambiguities in the standard Marching Cubes algorithm … a **face ambiguity** occurs
> [when] the signs of the face's four corners alternate; … an **interior ambiguity** occurs when the signs of
> the cube [corners alternate] … Nielson and Hamann (1991) … proposed the **Asymptotic Decider** to correctly
> track the behavior of the [trilinear] interpolant." `[CERT-web]`
> `en.wikipedia.org_wiki_Marching_cubes §… face ambiguity … Asymptotic Decider`.

The asymptotic decider evaluates the trilinear interpolant's **hyperbolic saddle** on the ambiguous face to
decide whether the two same-sign corners are joined or separated — a disambiguation test based on the
interpolant's critical points `[CERT-web]` same page. **Chernyaev (1995)** extended the table to **33 cases**
to preserve the topology of the trilinear interpolant, using the asymptotic decider for interior ambiguities
`[CERT-web]` `en.wikipedia.org_wiki_Marching_cubes §… Chernyaev extends to 33`. Bourke notes the
**marching-tetrahedra** variant (split each cube into 6 tetrahedra, 8 cases) sidesteps the cube ambiguities
entirely at the cost of ~more triangles `[CERT-web]` `paulbourke.net_geometry_polygonise_ §Polygonising … Using
Tetrahedrons` ("This technique does not suffer from the ambiguities in the traditional marching cubes
algorithms").

**Takeaway for tooling `[INFER]`:** a *rendering-only* isosurface (metaballs, a smooth blob) tolerates the naive
1987 table — a rare crack is invisible. A *simulation/watertight* isosurface (a mesh you will boolean, print, or
run FEM on) needs an ambiguity-resolving variant (asymptotic decider / marching tetrahedra) or a post-weld —
the same "harmless for rendering, breaks FEM/navmesh" distinction [Block 47] §47 drew for earcut slivers.

## 50.3 — Dual Contouring of Hermite Data (Ju et al. 2002): one vertex per cube via a QEF → sharp features `[CERT-doc]` / `[CERT-a]`

MC and its variants are **cube-based** (primal): they put polygon vertices *on the grid edges*, which **rounds
off** sharp features and gives thin/sliver triangles. **Dual** methods put **one vertex per cube** instead. The
primary paper defines the family:

> "*Dual* methods such as the *SurfaceNets* algorithm … generate **one vertex lying on or near the contour for
> each cube** that intersects the contour. For each edge in the grid that exhibits a sign change, the vertices
> associated with the four cubes that contain the edge are joined to form a **quad**. … the polygonal mesh
> produced by the SurfaceNets method is **dual to the mesh produced by MC** … vertices of the SurfaceNets mesh
> correspond to faces of the MC mesh and vice versa. Dual methods typically deliver polygonal meshes with
> **better aspect ratios** since the vertices … are free to move inside the cube." `[CERT-doc]`
> `dualcontour-ju-2002.md §2.1` (p.2).

**What makes Dual Contouring (DC) preserve sharp edges: Hermite data + a QEF.** DC tags each sign-change edge
not just with the intersection *point* but with the surface *normal* there (**Hermite data**), and places the
one cube-vertex by minimising a quadratic error over those point+normal constraints:

> "At the leaves of the octree, we tag those edges with sign changes by **exact intersection points and their
> normals** from the contour. … we use these normals to define a **quadratic error function (QEF)** for each
> leaf … Adding normals allows this method to **exactly reproduce … sharp edges** on the contour." `[CERT-doc]`
> `dualcontour-ju-2002.md §1` (p.2, the contributions list).

**The QEF, explicitly.** The paper's own equation is a rasterised figure that did NOT survive PDF text
extraction (the math on pp.3-6 OCR'd as garbled image-text — HONESTY note, this equation is therefore cited
from the canonical secondary explainer, not the paper's literal glyph). The QEF is the **sum over the
sign-change edges of the squared distance from the candidate vertex `x` to each edge's tangent plane**:

> QEF: `E(x) = Σ_i ( n_i · (x − p_i) )²`, where `p_i` is edge-crossing point `i` and `n_i` its Hermite normal;
> "for each normal, we assign a penalty to locations further away from ideal … the sum of all those squared
> terms is a quadratic function … called the **QEF** … Finding the minimal point … [via] numpy's **lstsq**
> [least-squares]." `[CERT-a]` `www.boristhebrave.com_2018_04_15_dual-contouring-tutorial_ §Choosing a vertex
> location`. The term `n_i · (x − p_i)` is the signed point-to-plane distance of `x` from the plane through
> `p_i` with unit normal `n_i` `[INFER]` (standard plane algebra — same `[a b c d]` plane form as [Block 49]
> §49.1's quadric). Minimising a sum of squared plane distances is a linear least-squares solve (normal
> equations / pseudo-inverse / SVD) `[INFER]`.

**The numerical catch DC is famous for (and the paper's actual contribution).** When the sampled normals are
**colinear** (a large flat region), the QEF is under-constrained and its minimiser can land **outside the
cube**:

> "solving the QEF as described in the original Dual Contouring paper doesn't actually work very well … there's
> **no actual guarantee that the resulting point is inside the cell** … quite common … if you have large flat
> surfaces." Fix = **constrained solving** (clamp into the cell) + **biasing the QEF** toward the cell centroid
> / mass-point. `[CERT-a]` `www.boristhebrave.com_2018_04_15_dual-contouring-tutorial_ §Colinear normals`. The
> paper itself advertises "a new, **numerically stable representation** for quadratic error functions"
> `[CERT-doc]` `dualcontour-ju-2002.md §1` (p.2) — this instability is exactly what it stabilises (a truncated
> SVD that drops near-zero singular values and falls back to the mass-point). This is the **same degeneracy
> family** [Block 48] documented: a determinant/least-squares system going singular near a flat/colinear
> configuration.

**Ambiguity in DC = non-manifold vertex.** DC's analogue of MC's face/interior ambiguity: for certain sign
configurations the up-to-twelve polygons meeting at the cube vertex do **not** form a manifold:

> "for most common sign configurations … these polygons define a manifold at this vertex. However, there exist
> sign configurations for which the dual contour is **non-manifold**. (These configurations correspond to the
> 'ambiguous' sign configurations in standard cube-based methods.)" `[CERT-doc]` `dualcontour-ju-2002.md §4.1`
> (p.7). The paper adds **octree adaptivity** with topology-preserving simplification (sign-based manifold
> tests, a pre-computed 2⁸ table) so leaves can be collapsed without tearing the contour `[CERT-doc]`
> `dualcontour-ju-2002.md §4.1` (p.7, the three-check safety test).

**MC vs DC — the one-line rule `[INFER]`:** MC/SurfaceNets place vertices from **sign changes alone** and so
**round** sharp edges; DC additionally consumes the **Hermite normals** and solves a **QEF**, so it **keeps**
sharp edges and corners — but it *requires* gradient/normal data at the crossings and inherits a
colinear-normal numerical instability that needs a stabilised (SVD-clamped, centroid-biased) solve.

## 50.4 — What three.js actually ships: `MarchingCubes.js`, a fixed-grid real-time metaball surfacer `[CERT]`

three.js core ships **no** isosurface extractor; the addon `examples/jsm/objects/MarchingCubes.js` is an MC
metaball object (an `Object3D` subclass), not a general CFD/volume mesher:

- **Constructor** `new MarchingCubes(resolution, material, enableUvs=false, enableColors=false, maxPolyCount=10000)`
  `[CERT]` `raw.githubusercontent.com_mrdoob_three.js_dev_examples_jsm_objects_MarchingCubes:12-13`.
- **Fixed uniform grid, CPU-bound.** The field is a dense `Float32Array(size³)` at `resolution³` cells; the
  source comment is blunt about the ceiling: `this.isolation = 80.0; // size of field, 32 is pushing it in
  Javascript :)` `[CERT]` same file `:26-31`. So practical resolution ≈ 28-64³ on the CPU; there is **no
  octree/adaptive** grid and **no sharp-feature handling** — it is the primal MC of §50.1. `[INFER]`.
- **Linear interpolation, verified in source.** `VIntX/VIntY/VIntZ` compute the crossing with
  `const mu = (isol − valp1)/(valp2 − valp1)` then `lerp(a,b,t)=a+(b−a)*t` on position, cached normal, and
  palette colour `[CERT]` same file `:50-52` (`function lerp`), `:51-61` (`VIntX`). This is exactly §50.1's
  `t = (iso−v0)/(v1−v0)`; the `cubeindex |= 1|2|4|8|…` build is the 8-bit config of §50.1 `[CERT]` `:100-103`.
- **Metaballs are reciprocal (Blinn-style) blobs.** `addBall` accumulates a `1/r²` field:
  `val = strength / (0.000001 + fx*fx + fy2 + fz2) − subtract`, with influence radius
  `radius = size·sqrt(strength/subtract)` `[CERT]` same file `:190-206`; `addPlaneX/Y/Z` add half-space walls
  `[CERT]` `:216-221`. The canonical demo `webgl_marchingcubes.html` drives it as animated metaballs via
  `object.reset(); object.addBall(x,y,z,strength,subtract[,color]); … object.update()` `[CERT-web]` context7
  `/mrdoob/three.js` `webgl_marchingcubes.html §updateCubes` (corroborates the source API).
- **Optional per-vertex UVs/colours**, capped by `maxPolyCount` geometry buffers `[CERT]`
  `:12,44,158-163`.

So three.js gives you **exactly** the smooth-blob use case (metaballs / fluids / organic soft shapes) and
nothing else: fixed grid, no ambiguity resolution beyond the standard table, no sharp features, CPU-limited
resolution.

## 50.5 — Honest JS-ecosystem maturity: MC yes, surface nets yes, **dual contouring: no maintained lib** `[CERT-web]` / `[INFER]`

| Need | JS option | Maturity (honest) |
|---|---|---|
| Real-time metaballs / smooth blobs | three.js `MarchingCubes.js` | **Mature**, in-tree, maintained `[CERT]` `MarchingCubes:12` |
| Generic isosurface from a `f(x,y,z)` or voxel field | **`isosurface`** npm (Lysenko) — `surfaceNets`, `marchingCubes`, `marchingTetrahedra` | Usable but **old** (© 2012-2014, MIT); returns `{positions, cells}` you wrap for three.js `[CERT-web]` `raw.githubusercontent.com_mikolalysenko_isosurface_master_README §API` |
| **Feature-preserving** dual contouring (sharp edges) | — | **No maintained npm/three.js library.** Only demo repos + tutorials `[INFER]` |

Two honesty points:

1. **`surfaceNets` is a *dual* method but NOT dual contouring.** The `isosurface` npm ships `surfaceNets`
   `[CERT-web]` `…isosurface_master_README §isosurface.surfaceNets`, which is the Gibson 1998 dual method the DC
   paper cites — one vertex per cube, but placed at the **centroid of edge crossings, with no QEF and no
   normals**, so it **does not preserve sharp features** (it is the "give up on the gradient … at least has
   simplicity" fallback boris names) `[CERT-a]` `…dual-contouring-tutorial_ §Colinear normals`. It is the
   cheapest smooth dual mesher, not DC.
2. **Dual contouring proper is demo-grade in JS.** Public JS implementations exist (e.g. Domenicobrz's
   `Dual-Contouring-javascript-implementation`, and boris's Python `mc-dc` reference) but there is **no
   maintained, packaged npm/three.js DC library** — you would port or vendor one, and own the QEF-stability
   work (SVD clamp + centroid bias, §50.3) yourself `[INFER]` (WebSearch ecosystem sweep 2026-08-07: npm
   `isosurface`/`threejs-isosurface`/`three-isosurface` all wrap MC/surface-nets, none DC).

## 50.6 — Decision rule for the HVAC / nave design tools `[INFER]`

Isosurfaces are **not** used by the current prototype corpus (0 `MarchingCubes` sites — the nave and hotel
builds are `ExtrudeGeometry`/`InstancedMesh`, [Block 47]/[Block 49]) `[INFER]`. Where they *would* earn a place:

1. **Organic/soft blobs, fluids, smoke, insulation lagging → three.js `MarchingCubes.js` as-is.** Metaballs are
   the right tool for gooey, merging, smooth shapes with no hard edges. Keep resolution ≤ ~48³ (CPU ceiling,
   §50.4); drive with `addBall`/`addPlane`; feed the smooth output through `mergeVertices` + build-time
   meshopt decimation ([Block 49]) if it becomes an LOD asset. `[INFER]`.
2. **Volumetric HVAC data → isosurface of a scalar field is the REAL, currently-unbuilt application.** A CFD /
   thermal simulation produces a 3D scalar field (temperature, velocity magnitude, contaminant concentration);
   the **isosurface "T = 25 °C"** or "v = threshold" is a standard way to visualise it — directly relevant to
   the **datacenter hotspot** and **gobernador-aire** work (a hot-air plume as an isosurface, a comfort-zone
   shell). Honest status: this is a genuine fit but **nothing in the corpus does it yet**; the build path is
   `isosurface` npm `surfaceNets`/`marchingCubes` over the field grid → `BufferGeometry` → a semi-transparent
   PBR/`ShaderMaterial` layer over the scene ([Block 30] telemetry binding). `[INFER]`.
3. **Sharp-edged voxel geometry (terrain cliffs, CSG-voxelised ducts, blocky machine rooms) → dual contouring,
   but budget the port.** DC is the only isosurface method that keeps hard corners (§50.3). Since there is **no
   maintained JS DC lib** (§50.5), reach for it only when sharp features are essential AND you accept
   vendoring/porting a demo implementation plus owning the QEF-stability (SVD clamp + centroid bias). For most
   prismatic HVAC geometry, the **2D-footprint + `ExtrudeGeometry`/Clipper** path ([Block 46]/[Block 47]) or
   3D CSG ([Block 46]) is cheaper and more robust than voxelising-then-contouring. `[INFER]`.
4. **Watertight output? Pick the ambiguity-aware variant.** If the isosurface must be boolean'd, printed, or
   simulated, prefer marching tetrahedra or an asymptotic-decider MC (§50.2), or post-weld + check manifoldness
   — the plain three.js table is rendering-grade, not simulation-grade. `[INFER]`.

## 50.7 — Connections

- **[Block 49]** (G62 QEM) — DC's QEF (§50.3) and QEM's error quadric ([Block 49] §49.1) are the **same
  algebraic object**: a sum of squared plane distances, solved by inverting/least-squares a 4×4-ish system,
  with an endpoint/centroid fallback when singular. DC *builds* meshes; QEM *simplifies* them — an MC/DC
  isosurface is a prime **input** to build-time meshopt decimation ([Block 49] §49.5).
- **[Block 48]** (G65 robust predicates) — DC's colinear-normal instability (§50.3, minimiser escapes the cell)
  is the same near-degenerate least-squares failure [Block 48] warns about; the stabilised SVD/centroid-bias
  solve is the DC-specific instance of "snap/clamp near degeneracy".
- **[Block 47]** (G61 triangulation) — the "harmless for rendering, breaks FEM/navmesh" split (§50.2) is
  identical to earcut slivers vs CDT; both say *choose the algorithm by whether the mesh is rendered or
  simulated*.
- **[Block 8]** (geometry toolkit) / **[Block 25]** (gltf-transform) — `MarchingCubes` output is a
  `BufferGeometry` like any other; the merge/decimate pipeline applies unchanged.
- **[Block 30]** (dashboards/telemetry) / datacenter-hotspot + gobernador-aire — the honest real HVAC
  application (§50.6 rule 2): a temperature/CFD **isosurface** as a data-bound volumetric layer.
- **RUN 9 forward gaps** — G64 (curves & surfaces — Bézier/Catmull-Rom/NURBS), G66 (procedural placement —
  poisson-disk/WFC/L-systems). G63 closed by this block.
