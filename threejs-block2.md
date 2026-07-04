# Block 2 — InstancedMesh and voxel-scale rendering

> Research of **Three.js instancing** as the voxel stage's core technique: the InstancedMesh API
> contract, its caveats (bounding volumes, per-instance color, raycasting), the merged-geometry
> alternative, and how the voxel prototypes apply it. Does NOT cover materials ([Block 3]) or
> general performance budgets (G12).
>
> Sources: context7 `/mrdoob/three.js` (official docs/pages/InstancedMesh, src/objects/InstancedMesh.js,
> manual/how-to-update-things, manual/optimize-lots-of-objects, examples webgl_instancing_performance /
> webgl_instancing_raycast / webgl_batch_lod_bvh — queried 2026-07-04) · local voxel prototypes.
> Method: context7 doc queries + driver grep verification of local citations. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 2 (voxel stage). Connects [Block 1] (§1.4 technique split).

---

## 2.1 — Why instancing: the draw-call economy `[CERT-web]`

The official optimization manual (`manual/optimize-lots-of-objects`) presents draw-call reduction
as THE lever for many-object scenes: instead of one draw per object, combine objects so the GPU
draws them in one call `[CERT-web]` (context7, 2026-07-04). Three.js offers two first-party paths,
both reaching **1 GPU draw call** (official comparison example `webgl_instancing_performance`):

| Path | Mechanism | Memory profile |
|---|---|---|
| `InstancedMesh` | one geometry + N transform matrices (16 floats/instance) | O(1 geometry + N·16 floats) |
| `BufferGeometryUtils.mergeGeometries(geometries, useGroups?)` | clone geometry per object, `applyMatrix4` the transform, merge into one `BufferGeometry` | O(N · full geometry) — the example itself reports "GPU memory" as the merged tradeoff `[CERT-web]` |

`mergeGeometries` requires all inputs to have compatible attributes and returns `null` on failure
`[CERT-web]` (docs/pages/module-BufferGeometryUtils). Instancing keeps per-object transforms
editable at runtime; merging bakes them permanently `[INFER]` (direct consequence of
`applyMatrix4`-then-merge).

## 2.2 — InstancedMesh API contract `[CERT-web]`

All from official docs/source (context7, 2026-07-04):

| Member | Contract |
|---|---|
| `new InstancedMesh(geometry, material \| Material[], count)` | count fixed at construction; backing buffer sized `count·16` floats |
| `instanceMatrix` | `InstancedBufferAttribute(Float32Array(count*16), 16)` holding ALL local transforms (src/objects/InstancedMesh.js) |
| `setMatrixAt(index, matrix)` | writes `matrix.toArray(this.instanceMatrix.array, index*16)`; **you MUST set `instanceMatrix.needsUpdate = true` after updating matrices** |
| `setColorAt(index, color)` / `instanceColor` | per-instance color without extra materials; same `instanceColor.needsUpdate = true` rule |
| `boundingBox` / `boundingSphere` | InstancedMesh has its OWN bounding volumes that **override the geometry's**; must call `computeBoundingBox()/computeBoundingSphere()` after transforming instances via `setMatrixAt`, or frustum culling and raycasting act on stale volumes (manual/how-to-update-things) |
| Raycasting | `raycaster.intersectObject(instancedMesh)` returns hits carrying `intersection[0].instanceId`, enabling per-voxel picking (example webgl_instancing_raycast) |

## 2.3 — How the voxel prototypes apply it `[CERT]`

The house pattern (17 of 18 voxel files, [Block 1] §1.4):

- One shared unit cube: `const cubeGeo = new THREE.BoxGeometry(1,1,1)`
  (`voxel/liebert-split-voxel.html:331`).
- **One InstancedMesh per color/material group**: `new THREE.InstancedMesh(cubeGeo, mat,
  positions.length)`, filled with `setMatrixAt` in a `forEach`, offsetting each voxel to cell
  centers `+0.5` (`voxel/liebert-split-voxel.html:345-351`).
- The needsUpdate rule IS honored: `mesh.instanceMatrix.needsUpdate = true` after the fill loop
  (`voxel/liebert-split-voxel.html:353`).
- Instances are static after build (no per-frame `setMatrixAt`); **animated parts are deliberately
  kept OUT as regular `Group`s** — in-code comment "PARTES ANIMADAS (Groups fuera del
  InstancedMesh)" (`voxel/liebert-split-voxel.html:358`). This sidesteps the
  recompute-bounding-volumes caveat (§2.2) entirely `[INFER]` (static instances ⇒ volumes stay valid).
- Per-instance shadows: `castShadow`/`receiveShadow` set on the whole InstancedMesh
  (`voxel/liebert-split-voxel.html:346-347`).

**Grouping by color instead of `setColorAt`**: the prototypes create one InstancedMesh per color
group rather than one InstancedMesh with `instanceColor` `[CERT]` (same construction site). Cost:
draw calls scale with the number of distinct colors (typically 5-15 per prototype) instead of 1
`[INFER]`. The `setColorAt` path (§2.2) would collapse them to a single draw call per material
type — a documented, low-risk optimization opportunity `[CERT-web]` (webgl_instancing_raycast
example does exactly this).

## 2.4 — The legacy anti-pattern `[CERT]`

`voxel/data_center_voxel_isometrico_3d.html` (r128, [Block 1] §1.5) predates the house template:
nested loops create an individual `BoxGeometry` + `Mesh` per voxel
(`voxel/data_center_voxel_isometrico_3d.html:141-149`) with `MeshLambertMaterial` (`:98`).
Every voxel is its own draw call — exactly the pattern the official optimization manual exists to
eliminate (§2.1) `[INFER]` (cost model applied to the observed construction).

## 2.5 — BatchedMesh: the newer sibling (NEW gap) `[CERT-web]`

Official examples now showcase `BatchedMesh` (`webgl_batch_lod_bvh`: `intersectObject(batchedMesh)`
→ `intersection[0].batchId`, `setColorAt(batchId, color)` — context7, 2026-07-04). Unlike
InstancedMesh (one geometry), BatchedMesh batches **different geometries** under one material/draw
path — relevant to the realistic stage, where equipment is built from many distinct
Cylinder/Torus/Extrude parts ([Block 1] §1.4) `[INFER]`. Availability in r160 vs current API shape
not yet verified → registered as new gap **G15**.

## 2.6 — Connections

- **[Block 1]** §1.4-§1.5 — corpus evidence this block explains (house pattern + legacy outlier).
- **[Block 3]** (planned, G3) — the materials attached to these instances.
- **G12 performance** — draw-call counting (`renderer.info`) will quantify §2.3's per-color-group cost.
- **G15 (new)** — BatchedMesh evaluation for the realistic stage.
