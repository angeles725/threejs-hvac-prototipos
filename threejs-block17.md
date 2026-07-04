# Block 17 — Optimization compendium II: LOD, culling, compressed textures, disposal

> Research of **the optimization levers B11 did not cover**: distance-based LOD, frustum
> culling semantics, KTX2/Basis compressed textures, and GPU-memory disposal — completing the
> optimization map together with [Block 11] (draw calls, shadow baking, pixel ratio) and
> [Block 13] (on-demand rendering). Closes G17.
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/LOD + src/objects/LOD.js, Object3D
> frustumCulled, BufferGeometry dispose, manual/cleanup + manual/examples/cleanup-simple,
> docs/pages/KTX2Loader + examples/webgl_loader_texture_ktx2 — queried 2026-07-04) · corpus
> cross-references. Markers: `[CERT]` local (`file:line`) · `[CERT-web]` official web (URL +
> date) · `[CERT-a]` secondary (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 2). Connects [Block 11], [Block 13] §13.2, [Block 2] §2.2, [Block 14] §14.3.

---

## 17.1 — The complete lever map (consolidation)

| Lever | Where documented | Corpus status |
|---|---|---|
| Draw-call reduction (instancing/merge/Batched) | [Block 11] §11.2-11.3 | partially applied |
| Shadow baking (`autoUpdate=false`) | [Block 5] §5.4 | 1 of 23 files |
| Pixel-ratio cap | [Block 11] §11.1 | applied (20 files) |
| On-demand rendering | [Block 13] §13.2 | unapplied |
| **LOD** (§17.2) | this block | unapplied |
| **Frustum culling** (§17.3) | this block | default-on |
| **Compressed textures** (§17.4) | this block | N/A today (canvas textures) |
| **Disposal** (§17.5) | this block | never needed yet |

## 17.2 — Distance LOD `[CERT-web]`

`THREE.LOD` holds N alternates of one object; `addLevel(object, distance, hysteresis)` — "adds
a mesh that will display at a certain distance and greater"; `hysteresis` is a "threshold used
to avoid flickering at LOD boundaries, as a fraction of distance" (docs/pages/LOD, 2026-07-04).
The engine's `update(camera)` compares camera distance `/ camera.zoom` against each level and
flips `visible` flags (src/objects/LOD.js). Official scale proof: the webgl_lod example runs
**1000 LOD objects × 5 icosahedron levels** with per-level `matrixAutoUpdate = false`.

**The corpus-shaped idea** `[INFER]` (assembly of verified parts): the two-pass workflow already
PRODUCES two detail levels of every equipment — the voxel model and the realistic model
([Block 12] §12.1). `lod.addLevel(realisticGroup, 0); lod.addLevel(voxelGroup, farDistance)`
would let facility-scale scenes (cuarto-frio plan) render distant equipment as their voxel
versions — reusing existing assets as LOD levels instead of authoring new ones.

## 17.3 — Frustum culling `[CERT-web]` / cross-ref

`Object3D.frustumCulled` defaults `true` — the object "will only be rendered if it's within the
camera's view" (docs/pages/Object3D, 2026-07-04). Free for regular meshes. The corpus-relevant
caveat is the InstancedMesh one already sealed in [Block 2] §2.2: instanced bounding volumes go
stale after `setMatrixAt` — culling correctness depends on recomputing them (the corpus
sidesteps it with static instances). Disabling (`frustumCulled = false`) is the escape hatch
for shader-displaced geometry whose true bounds the CPU can't know `[INFER]` (semantics of the
flag applied — relevant if TSL displacement from [Block 15] §15.2 d39 is ever adopted).

## 17.4 — Compressed GPU textures: KTX2/Basis `[CERT-web]`

Official contract (docs/pages/KTX2Loader + ktx2 example, 2026-07-04):

- KTX 2.0 is a container; Basis Universal textures "can be quickly transcoded to a wide variety
  of GPU texture compression formats" (WASM transcoder from `examples/jsm/libs/basis`).
- Usage: `loader.setTranscoderPath(...); loader.detectSupport(renderer); loader.loadAsync('x.ktx2')`.
- Why: compressed formats (ASTC/BCn/ETC) "load as THREE.CompressedTexture objects, reducing
  memory cost. Requires native support on the device GPU: no single compressed format is
  supported on every device" — hence the "universal" transcode-at-runtime tier.
- History note: `BasisTextureLoader` was removed in r150 in favor of KTX2Loader ([Block 10] §10.2 era).

Corpus fit `[INFER]`: irrelevant while textures are tiny runtime canvases ([Block 9]); becomes
the FIRST texture decision the day the G13 asset pipeline (glTF + image textures, [Block 14]
§14.2 site 7) lands.

## 17.5 — Disposal: GPU memory is manual `[CERT-web]`

- `dispose()` "frees the GPU-related resources allocated by this instance. Call this method
  whenever this instance is no longer used in your app" (docs/pages/BufferGeometry).
- The cleanup manual: textures, geometries and materials each need an explicit `dispose()`;
  the official `ResourceTracker` pattern (track everything created, `dispose()` the set) and
  the traverse-and-dispose sweep (`scene.traverse(o => { o.geometry.dispose(); ... })`) are the
  two documented shapes (manual/cleanup + cleanup-simple example, webgl_loader_svg).
- The official memory-test example disposes geometry+map+material every frame before rebuilding
  (webgpu_test_memory) — the create/dispose cycle in its purest form.

Corpus fit: today each prototype is one static scene per page — nothing is ever replaced, so
never disposing is CORRECT `[INFER]` (lifetime = page lifetime). It becomes load-bearing the
moment the [Block 14] §14.3 configurator pattern arrives: sliders that REGENERATE parametric
geometry per change ([Block 8] §8.3 style) leak GPU memory on every drag unless the old
geometry is disposed — the arachne/tinker patterns and the disposal contract are two halves of
one feature `[INFER]`.

## 17.6 — Connections

- **[Block 11]** / **[Block 13]** §13.2 — the other half of the optimization map (§17.1).
- **[Block 2]** §2.2 — instanced culling caveat behind §17.3.
- **[Block 12]** §12.1 — the two-pass assets that §17.2 turns into free LOD levels.
- **[Block 14]** §14.3 / **[Block 8]** §8.3 — the configurator pattern that makes §17.5 load-bearing.
- **G13 (next)** — KTX2 (§17.4) is its texture leg.
