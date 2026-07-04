# Block 19 — The asset pipeline: glTF in, glTF out

> Research of **the asset pipeline beyond procedural code** (G13, last open gap of run 2):
> the glTF loader contract with its compression legs, and — the corpus-shaped discovery —
> GLTFExporter as the bridge that turns the existing procedural prototypes into portable assets
> for every run-2 destination (map layers, viewers, DCC). Closes G13 → run-2 investigable = 0.
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/GLTFLoader + GLTFExporter,
> manual/loading-3d-models, manual/examples/load-gltf, examples misc_exporter_gltf /
> webgl_loader_gltf_avif / webgl_random_uv — queried 2026-07-04) · corpus cross-refs.
> Markers: `[CERT]` local · `[CERT-web]` official web (URL + date) · `[CERT-a]` secondary
> (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 2, final). Connects [Block 16] §16.3, [Block 14] §14.2, [Block 17] §17.4.

---

## 19.1 — Import: the GLTFLoader contract `[CERT-web]`

- Basic: `loader.load('model.glb', gltf => scene.add(gltf.scene), undefined, onError)` or
  `await loader.loadAsync(url)` (manual/loading-3d-models + docs/pages/GLTFLoader, 2026-07-04).
- **Draco leg** (compressed geometry): `new DRACOLoader().setDecoderPath(...)` →
  `loader.setDRACOLoader(dracoLoader)`; current examples use the `DRACO_GLTF_CONFIG` constant
  as decoder path (webgl_loader_gltf_avif).
- **Compressed-texture leg**: KTX2 textures ride inside glTF; the KTX2Loader machinery is the
  [Block 17] §17.4 contract (transcoder path + detectSupport).
- **Auto-framing pattern** (manual/examples/load-gltf): after load, `Box3().setFromObject(root)`
  → size/center → position camera + `controls.maxDistance = boxSize*10`,
  `controls.target.copy(boxCenter)` — the generic "drop any model in and see it" viewer recipe,
  directly reusable for an equipment-catalog viewer `[CERT-web]` + `[INFER]` (application).
- Field reference: journey.prateekm runs GLTFLoader ×27 + RGBELoader HDR IBL in production
  ([Block 14] §14.2) `[CERT-a]`.

## 19.2 — Export: GLTFExporter, the corpus's hidden superpower `[CERT-web]`

`new GLTFExporter().parse(input, onDone, onError, options)` (or `parseAsync`) serializes a
scene/object to `.gltf` (JSON) or, with `binary: true`, a single-file `.glb` ArrayBuffer
(docs/pages/GLTFExporter + misc_exporter_gltf, 2026-07-04). Options that matter:

| Option | Default | Note |
|---|---|---|
| `binary` | false | `.glb` single file — the distribution format |
| `trs` | false | position/rotation/scale per node instead of matrices |
| `onlyVisible` | **true** | exports only visible objects — silently drops hidden LOD levels ([Block 17] §17.2) or toggled-off variants `[INFER]` (option semantics applied) |
| `maxTextureSize` | Infinity | caps baked texture dimensions (the CanvasTextures export as images) |
| `animations` | [] | clips must be passed explicitly |

**Why this matters here** `[INFER]` (assembly of verified parts): the corpus's equipment exists
only as procedural code inside HTML files ([Block 8], [Block 12]). One exporter call per
prototype turns each into a portable `.glb`, which is the missing input for every run-2
destination at once: georeferenced equipment on MapLibre site maps ([Block 16] §16.3 explicitly
presumes glTF models), the path-traced/marketing-render viewers ([Block 14] §14.1 site 2 IS a
glTF viewer), DCC round-trips (Blender opens glTF), and the auto-framing catalog viewer (§19.1).
Export is the cheap direction — no re-modeling, the code already builds the geometry.

## 19.3 — The pipeline picture after run 2

```
                   (today)                       (one exporter call)
  procedural code in HTML  ──build──▶  Scene  ──GLTFExporter──▶  equipment.glb
                                        ▲                            │
   DCC (Blender) ──glTF──▶ GLTFLoader ──┘         ┌──────────────────┼──────────────┐
   (+Draco geometry, +KTX2 textures                ▼                  ▼              ▼
    [Block 17] §17.4 when assets grow)     MapLibre site map   catalog viewer   path-traced
                                           ([Block 16])        (§19.1 framing)  stills ([B14])
```

Everything above the fold is already house capability; everything below is documented contract
`[INFER]` (diagram = consolidation of cited pieces).

## 19.4 — Connections

- **[Block 16]** §16.3 — the map use case that demanded glTF export.
- **[Block 14]** §14.2/§14.3 — production import reference + viewer destinations.
- **[Block 17]** §17.4 / §17.2 — compression legs; the `onlyVisible` LOD gotcha.
- **[Block 12]** — the workflow this pipeline extends with a third, optional stage: publish.
- **Run-2 STOP**: with G13 closed, read-only-investigable = 0 — genuine exhaustion this time.
