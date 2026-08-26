# COB-IM2 — Web CAD/MEP viewer: upgrade research

Date: 2026-08-25 · Scope: what to reuse, what to build, and in which order, for the
self-contained three.js duct viewers in `disenos/COB-IM2/`.

> Note on method: `/deep-research` is not an installed command in this environment. This
> report was produced with direct web research (search + page fetch) plus a read of the
> current viewer source. Every license claim below was checked against the upstream
> `LICENSE`/`package.json` or the project's own license page, not inferred from a summary.

> **CORRECTIONS 2026-08-25, after a 107-agent adversarial research pass. Three of my
> statements below were wrong; they are corrected in place and listed here.**
>
> 1. **N8AO is CC0-1.0, not ISC.** I read `package.json` (`"license": "ISC"`) and asserted
>    that secondary sources claiming CC0 were wrong. The `LICENSE` file is **CC0 1.0
>    Universal** and the GitHub API reports `CC0-1.0`. The repo contradicts itself; the
>    LICENSE file governs. My "correction" of others was the error. Both are permissive, so
>    nothing downstream changes — but the lesson does: `package.json` is metadata, the
>    LICENSE file is the grant.
> 2. **`ThatOpen/engine_web-ifc` is MPL-2.0, not MIT.** I took MIT from a search summary.
>    `LICENSE.md` is the Mozilla Public License 2.0 and the GitHub API confirms `MPL-2.0`.
>    This one has teeth: MPL file-scope copyleft attaches to the file you inline it into, and
>    we inline everything into **one** HTML file. See §1.1.
> 3. **"Vendorable into a single-file offline HTML: Yes" was wrong for the ESM-only
>    libraries.** None of them is drop-in. See §1.1.
>
> `ThatOpen/engine_components` = **MIT** is confirmed (GitHub API `spdx_id: MIT`), against a
> contested Apache-2.0 reading raised during the research pass.
>
> Also note what the research pass did **not** establish: its angles on 2024-25 renderer
> state of the art and on serious-MEP-viewer feature sets produced **no surviving claims**.
> §4 and the state-of-the-art commentary below are my own engineering judgement, not
> externally verified. Treat them accordingly.

### §1.1 The packaging constraint I missed — and it outranks licensing

The binding constraint on reuse is not the licence, it is the **module format**. Every
library recommended below ships **ESM-only with bare specifiers**:

- `@thatopen/components` and `@thatopen/components-front`: `"type": "module"`, exports map
  exposes ESM entry points only, no UMD/IIFE/CJS build published.
- `n8ao`: `dist/N8AO.js` opens with bare imports from `"three"`,
  `"three/examples/jsm/postprocessing/Pass.js"` and `"postprocessing"`; `three` and
  `postprocessing` are peerDependencies; no UMD target in its build scripts.
- `three-mesh-bvh`: same shape.

An `import` statement is illegal in a classic `<script>`, and `<script type="module">`
cannot resolve a bare specifier from a `file://` URL — that is a browser-spec constraint,
not a vendor choice. So **nothing here is drop-in**.

Where I disagree with the research pass, which framed this as disqualifying: it is not. A
**one-time offline bundle step** fixes it —

```bash
npx esbuild n8ao --bundle --format=iife --global-name=N8AO   --external:three --outfile=vendor/n8ao.iife.js
```

— then inline `vendor/n8ao.iife.js` into the HTML exactly as three.js r160 is inlined today,
shimming `three` to the already-global `window.THREE`. The shipped artefact stays a single
offline file; only the *build* gains a step, and this project already has a Python build
stage. Budget it as real work (half a day per library, plus the `postprocessing` transitive
dependency for N8AO), not as a copy-paste.

`engine_web-ifc` is the exception that stays out: Emscripten WASM (`web-ifc.wasm`,
`web-ifc-mt.wasm`, SharedArrayBuffer threading) **plus** MPL-2.0 file-scope copyleft landing
on the single delivered HTML file. Use it as an **offline export tool**, never inside the
viewer.


---

## 0. Baseline — what the current viewer already does

Read from `cob-im2-L4-full-3d.html` (2.4 MB, self-contained, three.js r160 inlined).
This matters because several "obvious" recommendations are already implemented and would
be wasted effort.

| Concern | Current implementation | Verdict |
|---|---|---|
| Draw calls | All 2132 runs + fittings baked into **one** hand-built `BufferGeometry` (`position`/`normal`/`color`/`runId`), one `MeshStandardMaterial` with `vertexColors` | Already optimal. Do **not** replace with per-run meshes or `TubeGeometry`. |
| Picking on a merged mesh | Custom `runId` float attribute read via `hit.face.a` | Correct pattern; same trick xeokit/Speckle use. Only the raycast cost is improvable. |
| Per-class visibility | Vertices of hidden runs collapsed to their centroid (degenerate triangles), buffer layout preserved | Clever and valid. `O(V)` per toggle, acceptable at this size. |
| Lighting | `PMREMGenerator` over a hand-built room scene + `ACESFilmicToneMapping` + `PCFSoftShadowMap` | Equivalent to `RoomEnvironment` (which is an addon, **not** in the inlined core). Done. |
| Section | Single horizontal `THREE.Plane`, `localClippingEnabled`, slider | Works, but cuts read as **hollow shells** — no caps. |
| Cameras | Perspective + orthographic toggle | Present. See defect note in §6. |
| Diffuser necks | `InstancedMesh`, 125 instances | Correct. |
| Arch underlay | `LineSegments` + `LineBasicMaterial` | 1px only; `linewidth` is ignored on all major platforms. |

Verified as **present** in the inlined r160 core: `BatchedMesh`, `LOD`, `ExtrudeGeometry`,
`Shape`, `PMREMGenerator`, `InstancedMesh`, `EdgesGeometry`.
Verified as **absent** (they are `examples/jsm` addons, would need inlining):
`Line2`/`LineMaterial`/`LineSegments2`, `EffectComposer`, `BufferGeometryUtils`,
`RoomEnvironment`.

---

## 1. Repo table — what to pull, and whether we legally/technically can

| Project | License (verified) | Reusable component | Compatible with self-contained/offline? |
|---|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | MIT | Already the base. Additionally: `examples/jsm/lines/` (Line2/LineMaterial), `EffectComposer`, `BufferGeometryUtils.mergeGeometries`, `GLTFExporter` | **Yes** — inline the addon files the same way the core is inlined. |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (gkjohnson) | MIT (`package.json`) | `MeshBVH` + `acceleratedRaycast`; `closestPointToPoint` for measurement snapping | **After bundling** (§1.1) — ESM, not the UMD drop-in I claimed. And **profile first**: adversarial verification refuted the premise that raycast is a bottleneck at 25k triangles (see P4). |
| [N8AO](https://github.com/N8python/n8ao) | **CC0-1.0** (`LICENSE` file + GitHub API; its `package.json` says ISC — the repo contradicts itself, the LICENSE governs) | `N8AOPass` — screen-space AO with built-in denoise, half-res mode | **After bundling** (§1.1). ESM-only, bare specifiers, pulls in `postprocessing`. Still the biggest perceptual win. |
| [ThatOpen / engine_web-ifc](https://github.com/ThatOpen/engine_web-ifc) | **MPL-2.0** (`LICENSE.md` + GitHub API — *not* MIT) | IFC read **and write** (`CreateIfcEntity` by schema type name, so `IfcDuctSegment`/`IfcDuctFitting` are constructible) | **No — keep it out of the viewer.** Emscripten WASM + MPL file-scope copyleft would attach to our single delivered HTML file. Use as an offline export tool only. |
| [ThatOpen / engine_components](https://github.com/ThatOpen/engine_components) | **MIT** (GitHub API `spdx_id: MIT`; an Apache-2.0 reading was raised and did not hold) | **Best source of readable reference code**: `Clipper` (section planes with caps), `LengthMeasurement`/dimensions, `Plans` (2D nav), `Culler`, `Highlighter`, DXF export | **Partially** — it is a modular ESM toolkit over three.js. Do not vendor wholesale; **port the algorithms** (clipper edges, dimension anchors) into our single-file viewer. MIT makes that clean. |
| [Speckle viewer](https://github.com/specklesystems/speckle-server) (`packages/viewer`) | Apache-2.0 | Reference for: batched/merged object rendering with per-object metadata, RTE (double-precision) camera handling, filtering & colour-by-property, section tool | **Reference only** — tightly coupled to Speckle's object model. Apache-2.0 permits copying code with attribution + NOTICE. |
| [xeokit-sdk](https://github.com/xeokit/xeokit-sdk) | **AGPL-3.0** (commercial license sold separately) | `SectionPlanesPlugin`, `DistanceMeasurementsPlugin` (vertex/edge **snapping**), `TreeViewPlugin` | **UX reference only.** AGPL is viral over a network; copying code into a deliverable we hand to a client would impose source-disclosure obligations. Read the docs, do not copy the source. |
| [dxf-viewer](https://github.com/vagran/dxf-viewer) | **MPL-2.0** (file-level copyleft) | Batching strategy: minimal render batches, **layer-aware batching**, block instances via instanced rendering, worker-offloaded parse | **Technique, not code.** MPL-2.0 only requires modified *files* stay MPL, so vendoring is possible, but our extraction is already done in Python. Steal the *layer-aware batching* idea for the arch underlay. |
| [dxf-parser](https://github.com/gdsestimating/dxf-parser) | MIT | Pure-JS DXF → JS object | Yes, but redundant: `ezdxf` (Python) already does more for us. Only useful for a browser-side "drop a DXF here". |
| [three-dxf](https://github.com/gdsestimating/three-dxf) | MIT | DXF entities → three.js meshes | Redundant for the same reason; entity reproduction ≠ our network extraction. |
| [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | LGPL-3.0 | `IfcConvert` (IFC→glTF/OBJ), Python API to *author* `IfcDuctSegment`/`IfcDuctFitting` | As an **external CLI/Python tool** — no linking, no license contamination. Relevant only for the interop track (§3). |
| [deck.gl](https://github.com/visgl/deck.gl) | MIT | — | **Not recommended.** It is a geospatial data-layer framework; it does not solve solid MEP geometry, section planes, or fitting topology. Nothing to pull here. |

**Licensing bottom line for a client deliverable:** stay on MIT/ISC/Apache-2.0
(three.js, three-mesh-bvh, N8AO, ThatOpen, Speckle). Treat xeokit as documentation only.

---

## 2. Duct-network rendering techniques

### 2.1 Do not switch to `TubeGeometry`

`TubeGeometry` calls `Curve.computeFrenetFrames()`. Frenet frames twist along the curve
and are **undefined at inflection points** (κ = 0), which is exactly what a straight,
axis-aligned duct run is. The literature's fix is a rotation-minimizing frame (RMF), but
for us even RMF is the wrong answer: installed ducts have a fixed world-up, so the correct
frame is simply `up = (0,1,0)`, `right = normalize(cross(dir, up))`. That is what the
current extruder already does implicitly. **Keep the hand-built sweep.**

### 2.2 Miter joints — the highest visual-fidelity/effort ratio

Today each run is an independent box, so a corner reads as two overlapping boxes
("sausage links") instead of one continuous duct. Real sheet-metal is mitered.

At a node where an incoming run has unit direction `d0` and the outgoing `d1`, the joint
plane bisects them: its normal is `n = normalize(d0 - d1)` and it passes through the node
point `P`. For any profile corner offset `o` (lateral + vertical, in world units), the end
vertex is `P + d0*t + o` where

```js
// miter end-cap: push each profile vertex along d0 until it meets the bisector plane
function miterT(d0, n, o){ return -(n.dot(o)) / (n.dot(d0)); }   // n·((P+d0*t+o)-P)=0

const n = new T.Vector3().subVectors(d0, d1).normalize();
for (const o of profileOffsets){                 // 4 corners of the rectangular profile
  const t = miterT(d0, n, o);
  vertex.copy(P).addScaledVector(d0, t).add(o);
}
```

Guard the degenerate case: if `|n·d0| < 0.15` (angle ≈ 180°, i.e. a near-straight
continuation) skip the miter and butt the faces. Cost: zero extra triangles.

### 2.3 Fittings we already count but do not model

The extraction reports `elbow: 611, transition: 219, tee: 276, cross: 70`. Cheap
parametric generators, in ascending effort:

- **Transition (219)** — loft between two rectangular profiles = 8 quads. Trivial, and it
  is the fitting that most visibly signals "the duct changes size here".
- **Elbow (611)** — after §2.2 the mitered (square-throat) elbow is free. A radius elbow
  is the profile swept along a quarter-arc with the fixed world-up frame, 4–7 steps
  (matching the fabricated 3-piece/5-piece elbow).
- **Tee / cross (346)** — no CSG needed. Render the branch as a full box overlapping the
  main run. Opaque same-material geometry hides the intersection. The *only* case where
  the interior leaks is under the section plane — which §4.1 fixes anyway.

### 2.4 Scale: what is and is not a problem at 2132 runs

Be honest about the numbers: 2132 runs × ~12 triangles ≈ 25 k triangles in one draw call.
That is not a rendering problem on any GPU, so **LOD, greedy meshing, and a
`BatchedMesh` rewrite are premature**. The measurable costs at this size are:

1. **Raycast per `pointermove`** against 25 k triangles — brute-force, single-threaded.
   This is the real hot path and grows with fittings. → `three-mesh-bvh` (§5, P1).
2. **`applyFilter` rewriting the whole position buffer** on every checkbox toggle.
   Acceptable now; if run count crosses ~20 k, switch to `BatchedMesh` (available in the
   inlined r160) and `setVisibleAt()`, which is O(1) and adds per-object frustum culling.
   Caveat to check at that time: per-instance colour support in `BatchedMesh` landed after
   r160, so a version bump would be part of that move.

---

## 3. Parsers, loaders, and whether to change the pipeline

**Verdict: keep `DWG → dwg2dxf → ezdxf → JSON → three.js`.** The DXF→three libraries
(`dxf-parser`, `three-dxf`, `dxf-viewer`) *reproduce drawn entities*. Our value is the
opposite: a semantic duct-network graph with widths, BOD elevations, classes, node
topology, and per-datum provenance. No JS DXF library gives that, and adopting one would
throw away the extraction.

Two optional side-tracks, both **out of the viewer's critical path**:

- **glTF export (low effort, real payoff).** Inline three.js `GLTFExporter` (MIT) and add
  a "Download .glb" button. Gives the client a file that opens in Blender, Windows 3D
  Viewer, Navisworks importers, and every AEC platform. ~30 KB of addon code.
- **DXF → IFC → glTF (high effort, only if handover demands it).** Author real
  `IfcDuctSegment` / `IfcDuctFitting` entities from the extracted graph with IfcOpenShell's
  Python API, then `IfcConvert` to glTF. Justified **only** if the deliverable must land in
  Revit/Navisworks as typed MEP objects. As a route to *pixels*, it is strictly worse than
  what we already have: it loses our provenance metadata and adds two lossy hops.

---

## 4. MEP viewer UX — what mature viewers do that we do not

### 4.1 Capped section planes (stencil)

Our clipped ducts currently look hollow — the single biggest "this is a prototype" tell.
The standard three.js solution is the `webgl_clipping_stencil` example: render back faces
into the stencil buffer with `StencilOp` increment/decrement, then draw a full-plane quad
masked by the stencil to paint the cut face. ThatOpen's `Clipper` and xeokit's
`SectionPlanesPlugin` both do a variant of this, plus a **section outline** (the cut
silhouette drawn as lines), which is what makes a section legible as a drawing.

```js
// per-object stencil pass, then one plane quad per clip plane (webgl_clipping_stencil)
const back = new T.MeshBasicMaterial({depthWrite:false, colorWrite:false,
  stencilWrite:true, stencilFunc:T.AlwaysStencilFunc,
  side:T.BackSide,  stencilFail:T.IncrementWrapStencilOp,
  stencilZFail:T.IncrementWrapStencilOp, stencilZPass:T.IncrementWrapStencilOp,
  clippingPlanes:[clipPlane]});
// front faces use DecrementWrapStencilOp; the cap quad renders with
// stencilFunc = NotEqualStencilFunc, stencilRef = 0
```

Also worth adding: **vertical section planes** (X and Z), not just the horizontal one. MEP
coordination is read in vertical section far more than in plan.

### 4.2 Measurement with snapping

xeokit's `DistanceMeasurementsPlugin` snaps the cursor to the nearest **vertex or edge**;
that snap is what turns a toy measurement into a usable one. With `three-mesh-bvh` already
in place we get this almost free: raycast to get the hit face, then
`bvh.closestPointToPoint()` / test the 3 face vertices and the 3 edge projections within a
screen-space radius, and snap to the winner. Show both the 3-D distance and its
ΔX/ΔY/ΔZ components — for HVAC, "how much headroom below this duct" is the ΔY.

### 4.3 Selection and colour-by

We already colour by data provenance (measured / assumed / fitting / unsized), which is
better than most commercial viewers. Missing:

- **Click-to-isolate a system** — follow the `n0`/`n1` node graph from the picked run to
  colour or isolate a whole connected branch. The topology is already in the JSON
  (`nodes: 2715`, `runs_connected: 1666`); nothing new needs extracting.
- **Persistent selection outline.** Currently the click only pins the tooltip. Add an
  emissive/second-pass highlight of the selected run's vertex range.

### 4.4 Edges

CAD readers expect crisp edges. Build one merged `EdgesGeometry` over the duct mesh (or
emit the 12 box edges directly during the sweep) and render it as `LineSegments`. If 1 px
is too thin, that is the case for inlining `Line2`/`LineMaterial`, which supports width in
world units — same fix applies to the architectural underlay, which is currently stuck at
1 px because `LineBasicMaterial.linewidth` is ignored on WebGL.

### 4.5 Ortho camera presets

The ortho toggle exists but there are no canned views. MEP is read from fixed
axonometrics: add Top / Front / Right / SW-iso buttons that set camera + target and force
ortho. Cheap, and it is the first thing an engineer reaches for.

---

## 5. Prioritized adaptations for *our* viewer

Effort is in hours of focused work; impact is on how the model reads to an HVAC engineer.

| # | Change | Impact | Effort | Why now |
|---|---|---|---|---|
| **P1** | **Stencil caps + section outline on the clip plane; add X/Z section planes** | High | M (4–6 h) | Fixes the most visible defect. Section is the primary MEP reading mode. |
| **P2** | **Miter joints at direction changes** (§2.2) | High | S (2–3 h) | Zero extra triangles; removes the "sausage links" look across 611 elbows. |
| **P3** | **N8AO ambient occlusion** (ISC) + `EffectComposer` inlined | High | S (2–3 h) | Dense duct networks are unreadable without contact shading. Half-res mode keeps it cheap. |
| **P4** | **`three-mesh-bvh` for picking** (MIT) | Medium | S–M (bundling, §1.1) | Prerequisite for P5. **Profile before building it.** Adversarial verification refuted 0-3 the claim that BVH addresses a real bottleneck here: one ray per pointermove against 25 k triangles in one merged geometry is not a measured problem. Get a click-to-highlight latency number first; if it is under ~5 ms, skip P4 and hand-roll the snap for P5. |
| **P5** | **Measurement tool with vertex/edge snap**, showing 3-D distance + ΔX/ΔY/ΔZ | High | M (5–8 h) | The #1 question asked of an HVAC model is a clearance. Needs P4. |
| **P6** | **Duct edges** (merged `EdgesGeometry`) + `Line2` for the arch underlay | Medium | S (2–4 h) | Restores CAD legibility; makes the underlay readable at any zoom. |
| **P7** | **Transition + radius-elbow geometry** (219 + 611 fittings) | Medium | M (4–6 h) | Turns counted fittings into visible ones; size changes become legible. |
| **P8** | **Ortho view presets** (Top/Front/Right/Iso) | Medium | S (1 h) | Trivial, immediately useful. Fix the ortho resize defect (§6) at the same time. |
| **P9** | **Click-to-isolate connected branch** via `n0`/`n1` graph | Medium | M (3–5 h) | Uses topology we already extracted; makes "trace this system" possible. |
| **P10** | **`GLTFExporter` "Download .glb"** | Medium | S (1–2 h) | Interoperability without touching the pipeline. |
| **P11** | **Tee/cross box stubs** | Low | S (2 h) | Only matters once P1 exposes interiors. |
| P12 | `BatchedMesh` migration | Low *(today)* | L | Deferred. Revisit only above ~20 k runs, and it implies a three.js version bump. |
| P13 | IFC authoring track | Situational | L | Only if the client requires typed MEP objects in Revit/Navisworks. |

Suggested first slice: **P2 + P3 + P8** (one day, all visual, no new dependencies beyond
N8AO), then **P1**, then **P4 → P5**.

---

## 6. Defects observed while reading the current viewer

1. **Ortho camera ignores resize.** The `resize` handler only updates
   `camera.aspect`/`updateProjectionMatrix()` on the perspective camera. When `ortho` is
   active, its frustum is never recomputed, so the model stretches on window resize.
2. **Ortho frustum is derived once** from the perspective distance at toggle time and never
   re-derived; zooming in ortho mode via `OrbitControls` changes `zoom`, which is fine, but
   the initial toggle after a resize inherits a stale aspect.
3. **Arch underlay is 1 px and cannot be thickened** — `LineBasicMaterial.linewidth` is a
   no-op on WebGL (Windows/ANGLE, macOS, most drivers). P6 covers it.

---

## Sources

- [xeokit-sdk license (AGPLv3)](https://github.com/xeokit/xeokit-sdk/wiki/License) · [xeokit-sdk](https://github.com/xeokit/xeokit-sdk) · [DistanceMeasurementsPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/DistanceMeasurementsPlugin/DistanceMeasurementsPlugin.js~DistanceMeasurementsPlugin.html) · [Accurate measurements with snapping](https://xeokit.io/blog/accurate-measurements-with-snapping/)
- [ThatOpen engine_components (MIT)](https://github.com/ThatOpen/engine_components) · [engine_web-ifc (MIT)](https://github.com/ThatOpen/engine_web-ifc) · [That Open Engine](https://thatopen.com/bim-software-open-source/engine/)
- [Speckle server / viewer (Apache-2.0)](https://github.com/specklesystems/speckle-server) · [LICENSE](https://github.com/specklesystems/speckle-server/blob/main/LICENSE) · [@speckle/viewer](https://www.npmjs.com/package/@speckle/viewer)
- [dxf-viewer (MPL-2.0)](https://github.com/vagran/dxf-viewer) · [README](https://github.com/vagran/dxf-viewer/blob/master/README.md)
- [dxf-parser (MIT)](https://github.com/gdsestimating/dxf-parser) · [three-dxf (MIT)](https://github.com/gdsestimating/three-dxf)
- [three-mesh-bvh (MIT)](https://github.com/gkjohnson/three-mesh-bvh) · [package.json](https://github.com/gkjohnson/three-mesh-bvh/blob/master/package.json)
- [N8AO (ISC)](https://github.com/N8python/n8ao) · [package.json](https://raw.githubusercontent.com/N8python/n8ao/master/package.json) · [HBAO vs N8AO discussion](https://discourse.threejs.org/t/new-ambient-occlusion-example-hbao-vs-n8ao/58847)
- [three.js webgl_clipping_stencil example](https://threejs.org/examples/webgl_clipping_stencil.html) · [Capping clipped planes using stencil](https://discourse.threejs.org/t/capping-clipped-planes-using-stencil-on-a-buffergeometry/18407)
- [three.js BatchedMesh docs](https://threejs.org/docs/pages/BatchedMesh.html) · [BatchedMesh proposal #22376](https://github.com/mrdoob/three.js/issues/22376) · [Line2 docs](https://threejs.org/docs/pages/Line2.html) · [LineMaterial docs](https://threejs.org/docs/pages/LineMaterial.html) · [webgl_lines_fat](https://github.com/mrdoob/three.js/blob/master/examples/webgl_lines_fat.html)
- [Computation of rotation minimizing frames (Wang et al., ACM TOG)](https://dl.acm.org/doi/10.1145/1330511.1330513) · [RMF theory, algorithms, applications (Farouki)](https://faculty.engineering.ucdavis.edu/farouki/wp-content/uploads/sites/51/2021/07/Rational-rotation-minimizing-frames.pdf)
- [IfcOpenShell (LGPL-3.0)](https://github.com/IfcOpenShell/IfcOpenShell) · [IfcDuctSegment (IFC4)](https://ifcopenshell.github.io/docs/rst_files/class_ifc4_1_1_ifc_duct_segment.html) · [MEP routing proposal #6521](https://github.com/IfcOpenShell/IfcOpenShell/issues/6521)
- [HVAC duct fittings fabrication guide (elbow/reducer/transition taxonomy)](https://sbkjduct.com/insights/hvac-duct-fittings-fabrication-guide.html) · [Bentley OpenBuildings duct fittings](https://docs.bentley.com/LiveContent/web/OpenBuildings%20Designer%20Help-v7/en/BMechToolGroupTransitions.html)


---

## Verification log — where a secondary source disagreed with the upstream file

Produced by a 107-agent adversarial research pass (5 angles, 25 sources fetched, 90 claims
extracted, 25 verified by 3-vote refutation panels: 14 confirmed, 11 refuted).

| Subject | Claimed by a secondary source | Upstream file says | Resolution |
|---|---|---|---|
| N8AO | ISC (`package.json`), and I asserted CC0 was wrong | `LICENSE` = CC0 1.0 Universal; GitHub API `CC0-1.0` | **CC0-1.0.** I was wrong. |
| `engine_web-ifc` | MIT (search summary, and my first table) | `LICENSE.md` = MPL-2.0; GitHub API `MPL-2.0` | **MPL-2.0.** I was wrong. |
| `engine_components` | Apache-2.0 (one verifier) | GitHub API `spdx_id: MIT`, `LICENSE.md` standard MIT | **MIT.** Original claim holds. |
| xeokit-sdk | — | AGPL-3.0, both sdk and bim-viewer | **AGPL-3.0.** Confirmed 3-0. |
| Speckle viewer | — | root `LICENSE` Apache-2.0; enterprise carve-out covers only `packages/server/modules/{workspaces,gatekeeper}`, not the viewer | **Apache-2.0.** Confirmed 3-0. |

**Claims refuted 0-3 that must not be cited** (their refutation means *unproven*, not
*proven false*): that xeokit supports offline standalone HTML from a local XKT; that
`engine_components` is built on three.js and ships DXF export; that N8AO requires r161+ and
is WebGL2-only; that three-mesh-bvh is a classic-script drop-in; that it addresses a real
bottleneck here; that MEP is out of scope for scan-to-BIM state of the art; that no public
MEP dataset or released code exists.

**Coverage gap, stated plainly:** the research angles on *2024-25 renderer state of the art*
(BatchedMesh vs merged geometry, WebGPU/TSL, GPU picking, fragments/tilesets, RTE cameras)
and on *serious-MEP-viewer feature sets* (capped stencil sections, snapping measurement,
clash, QTO, BCF) produced **zero surviving claims**. That is not evidence those areas are
fine — it is an absence of verification. §2, §4 and the state-of-the-art commentary above
are my own engineering judgement from reading the three.js source and examples.

**On scan-to-BIM (confirmed 3-0):** FloorPP-Net and its lineage consume **3D LiDAR point
clouds** — it builds on PointPillars (Lang et al., CVPR 2019), where depth is structurally
required. A PDF-vectorised source has no depth channel, so that whole family of methods
cannot ingest our data. No verified source in the corpus establishes that automated
vectorised-PDF-to-connected-MEP-system is solved.
[FloorPP-Net](https://arxiv.org/pdf/2106.10635) · [arXiv:2306.01642](https://arxiv.org/abs/2306.01642)
