# Block 11 — Performance: budgets, levers, and BatchedMesh

> Research of **the performance axis**: the corpus's current perf inventory, the documented
> levers (draw calls, shadow baking, pixel ratio), and BatchedMesh — availability at r160 proven
> locally, API contract, and fit for the realistic part zoo. §11.3 also provides the coverage
> that closes G15 by remittance. Does NOT cover postprocessing cost (G11, open).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/BatchedMesh, InstancedMesh,
> examples webgl_instancing_performance [Block 2] — queried 2026-07-04) · local prototypes
> (incl. the r160 esbuild bundle as a primary source for library availability).
> Method: context7 doc queries + driver grep verification. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 4 (cross-cutting). Connects [Block 2] §2.1/§2.3, [Block 5] §5.4, [Block 8] §8.4.

---

## 11.1 — The corpus's perf inventory today `[CERT]`

| Lever | Corpus state | Evidence |
|---|---|---|
| Pixel ratio | capped: `setPixelRatio(Math.min(devicePixelRatio, 2))` in 20 files | corpus grep 2026-07-04 |
| Draw calls (voxel) | 1 per color group (InstancedMesh per color) | [Block 2] §2.3 |
| Draw calls (realistic) | 1 per part — 50+ cylinders alone in one file | [Block 8] §8.1/§8.4 |
| Shadow refresh | re-rendered every frame in 22 files; baked once only in `cuarto-3d.html` | [Block 5] §5.4 |
| Continuous rendering | `autoRotate` widespread → rAF renders every frame | [Block 7] §7.3 |
| Monitoring | no `renderer.info` use in app code (absence grep 2026-07-04); the r160 library itself annotates buffers "Exposed for resource monitoring & error feedback via renderer.info" (`cuarto-3d.html:13305`) | `[CERT]` |
| Load weight | 2 esbuild bundles at ~1.3-1.4 MB each; rest lean HTML + CDN | [Block 1] §1.2 |

## 11.2 — The documented levers `[CERT-web]`

- **Draw-call reduction** is the official many-objects lever; both instancing and merging reach
  1 GPU draw call, with the merged path paying GPU memory ([Block 2] §2.1, official
  `webgl_instancing_performance` comparison).
- **Shadow baking**: `shadowMap.autoUpdate = false` + `needsUpdate = true` for static lighting
  ([Block 5] §5.1) — official static-sun guidance, already proven in-house by cuarto-3d
  ([Block 5] §5.4).
- **Pixel-ratio cap**: fragment work scales with rendered pixels; capping DPR at 2 bounds it on
  high-DPI displays `[INFER]` (fill-rate arithmetic; the corpus already applies the cap).

## 11.3 — BatchedMesh: multi-geometry batching (G15 coverage) `[CERT]` / `[CERT-web]`

**Availability at r160 — locally proven**: the corpus's own r160 esbuild bundle exports it
(`cuarto-3d.html:103`: `BatchedMesh: () => BatchedMesh`, 20 references per bundle) `[CERT]` —
no upgrade needed to use it.

**API contract** (docs/pages/BatchedMesh, 2026-07-04) `[CERT-web]`:

```js
const batched = new BatchedMesh(maxInstanceCount, maxVertexCount, maxIndexCount /* default 2×vertex */, material);
const boxId    = batched.addGeometry(box);      // → geometryId; optional reservedVertex/IndexCount for later geometry swaps
const inst1    = batched.addInstance(boxId);    // → instanceId
batched.setMatrixAt(inst1, matrix);             // per-instance transform
```

The official example batches a Box AND a Sphere in ONE BatchedMesh — the exact capability
InstancedMesh lacks (one geometry per mesh, [Block 2] §2.2) `[CERT-web]`.

**Fit for this corpus**: the realistic stage's part zoo (54 cylinders, 24 tori, ... —
[Block 8] §8.1) wearing a shared palette ([Block 3] §3.3) could batch per palette entry — one
BatchedMesh per material, capacity-reserved at build time — collapsing dozens of per-part draw
calls into a handful `[INFER]` (API contract applied to the census; a BatchedMesh takes ONE
material (or array), so batching granularity = the palette, which the house already centralizes).

## 11.4 — Prioritized playbook (assembled from verified findings) `[INFER]`

1. **Backport baked shadows** (`autoUpdate=false`) to the 22 static-sun files — proven in-house,
   one-line-per-file ([Block 5] §5.4).
2. **Collapse voxel color groups** via `setColorAt`/`instanceColor` — one InstancedMesh per
   material type instead of per color ([Block 2] §2.3).
3. **Batch realistic assemblies** per palette entry with BatchedMesh (§11.3) — biggest
   architectural win, needs the most rework.
4. **Measure before/after** with `renderer.info` counters (§11.1's unused hook).
(Ordering = effort-to-win ratio from the cited evidence; no profiling was RUN — this loop is
read-only, so all quantitative gains remain to be measured `[INFER]` declared honestly.)

## 11.5 — Connections

- **[Block 2]** §2.1-§2.3 — instancing economics this block extends; **G15 closes by remittance
  to §11.3** (availability + API + fit covered; no new substance remains for a standalone block).
- **[Block 5]** §5.4 — the shadow-baking lever, already house-proven.
- **[Block 8]** §8.4 — the part-count pressure §11.3 addresses.
- **G11 (open)** — postprocessing would add its own frame cost atop this budget.
