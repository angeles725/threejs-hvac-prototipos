# Block 25 — The optimization pipeline: glTF-Transform and gltfpack between export and consumption

> Research of **the missing middle** (G25, run 4): [Block 19] documented GLTFExporter producing
> `.glb` files and GLTFLoader's compression legs (Draco/KTX2/meshopt), but nothing yet shrinks the
> exported file before a loader sees it. This block covers the two community CLI tools that fill
> that gap — glTF-Transform (donmccurdy) and gltfpack (zeux/meshoptimizer) — their commands,
> license terms, runtime pairing back to [Block 19] §19.1, and recipes for this corpus. Does not
> cover Blender-side export settings (queued as G28) or DCC-side baking.
>
> Sources: context7 `/donmccurdy/gltf-transform` (README + cli.md, queried 2026-07-04) ·
> local capability check — `npx --yes @gltf-transform/cli@4.4.1 --help` /
> `help <command>` for optimize/draco/meshopt/etc1s/uastc/resize/dedup/prune/weld/simplify, run in
> a scratch dir, 2026-07-04 · `npx --yes gltfpack` (v1.2, no network fetch — bundled binary) ·
> official gltfpack README preserved verbatim at
> `sources/web-snapshots/raw.githubusercontent.com_zeux_meshoptimizer_master_gltf_README.md.md`
> (`https://raw.githubusercontent.com/zeux/meshoptimizer/master/gltf/README.md`, 2026-07-04).
> Markers: `[CERT]` local CLI output (command in citation) · `[CERT-web]` official web/preserved
> doc · `[CERT-a]` secondary · `[INFER]` deduction. No transform was ever run against a project
> file — capability check only exercised `--version`/`--help` (read-only, no writes).
>
> Layer 4 (run 4). Connects [Block 19] (the export/import contract this pipeline sits between),
> [Block 17] §17.4 (KTX2 the runtime leg), [Block 16] (MapLibre site-map .glb consumer).

---

## 25.1 — Capability check: both tools run on this machine `[CERT]`

Read-only verification, no project file was touched:

| Tool | Command | Result |
|---|---|---|
| glTF-Transform CLI | `npx --yes @gltf-transform/cli --version` | **4.4.1** installed via npx cache in a scratch dir `[CERT]` |
| gltfpack | `npx --yes gltfpack -h` (no `--version` flag; banner line) | **gltfpack 1.2** — prints its own usage banner, confirming the bundled native binary runs `[CERT]` |

Both are usable from this environment via `npx --yes <pkg>` with no local install step. No
append-log entry was added to `$KIT/toolbelt/INSTALLED-TOOLS.md` — that file's convention is for
tools installed *into* a target subject (e.g. decompilers dropped next to a binary under
investigation); this is a transient `npx` capability probe, not an installation, so it is reported
here instead `[INFER]` (convention read, not met).

## 25.2 — glTF-Transform: the à-la-carte SDK + CLI `[CERT-web]`

`@gltf-transform/cli` (npm, MIT license — confirmed in the CLI's own `--help` banner text: "keep
glTF Transform maintained, independent, and open source under MIT License" `[CERT]`) wraps the
`@gltf-transform/core` + `@gltf-transform/functions` JS/TS SDK. Two usage modes:

- **One-shot `optimize`** — applies most relevant transforms in one call:
  ```
  gltf-transform optimize input.glb output.glb --compress draco --texture-compress webp
  ```
  Confirmed defaults via `help optimize` `[CERT]`: `--compress meshopt` (not draco — meshopt is
  the CLI default), `--texture-compress auto` (recompresses in original format unless overridden),
  `--texture-size 2048`, `--simplify true` (`--simplify-error 0.0001`, `--simplify-ratio 0` i.e.
  unconstrained by ratio, bounded by error), `--weld true`, `--flatten/--join/--instance/--prune`
  all `true` by default (scene-graph consolidation runs unless disabled), `--palette true`
  (merges materials into an atlas once ≥5 distinct values exist).
- **À-la-carte commands** — for hand-picked pipelines, confirmed via `help <command>` `[CERT]`:

| Command | Purpose | Key options |
|---|---|---|
| `draco` | Geometry-only compression (Draco/`KHR_draco_mesh_compression`); does not touch animation/textures | `--method edgebreaker\|sequential` (default edgebreaker), `--decode-speed`/`--encode-speed` 0-10, `--quantize-color` bits |
| `meshopt` | Geometry **+ morph targets + animation** compression (`EXT_meshopt_compression`); decodes faster than Draco, meant to be paired with gzip/brotli downstream | `--level medium\|high` (default high), `--quantize-color`/`--quantize-generic` |
| `etc1s` | KTX2 + Basis Universal **ETC1S** — smaller, lower quality; docs recommend it for base color/AO, UASTC for normal maps | `--compression` 0-5 |
| `uastc` | KTX2 + Basis Universal **UASTC** — larger, higher quality | `--filter`, `--filter-scale`, `--level`, `--rdo`/`--rdo-lambda`, `--zstd` |
| `resize` | Lanczos3/2 resize, PNG/JPEG only; `--width`/`--height` are **maximums**, never upscales | `--pattern` glob to target specific texture slots |
| `dedup` | Merges duplicate accessors/materials/meshes/skins/textures — recommended **early** in a pipeline so later compression/instancing works on fewer unique resources | per-type booleans, all default `true` |
| `prune` | Removes properties unreferenced by any Scene (leftover from faulty exporters/complex workflows); conservative — never removes something still in use | `--keep-attributes`/`--keep-indices`/`--keep-leaves`/`--keep-solid-textures` |
| `weld` | Merges bitwise-identical vertices — required before `simplify` | (none beyond global flags) |
| `simplify` | Meshoptimizer-based triangle/vertex reduction, lossy but quality-aiming | `--ratio` target (0-1), `--error` tolerance (fraction of mesh radius), `--lock-border` |

- **JS/TS API** `[CERT-web]` (context7 `/donmccurdy/gltf-transform`): the same transforms compose
  as a pipeline against a `Document`:
  ```ts
  import { NodeIO } from '@gltf-transform/core';
  import { weld, quantize, dedup, draco, prune, resample } from '@gltf-transform/functions';
  const io = new NodeIO();
  const document = await io.read('input.glb');
  await document.transform(resample(), prune(), dedup(), weld(), quantize(), draco());
  await io.write('output.glb', document);
  ```
  Custom transforms are plain functions `(document) => { ... }` passed alongside built-ins — the
  same escape hatch used for one-off scene edits (e.g. toggling `material.setDoubleSided`).
  Texture re-encoding via `textureCompress()` requires Node's `sharp` package as an external
  encoder dependency; Draco encode/decode requires registering `draco3dgltf` module instances with
  `NodeIO`. CLI users get all of this pre-wired; API users opt in per-dependency.

## 25.3 — gltfpack: the meshopt-first single binary `[CERT-web]`

Confirmed from the official README (preserved verbatim, see header) `[CERT-web]`:

- gltfpack is bundled with the meshoptimizer project (zeux), distributed as a **native binary**
  (Releases page) or npm package; native is recommended over npm for larger files, speed, and
  texture-compression support.
- Usage: `gltfpack -i scene.gltf -o scene.glb`. By default (no flags) it already: optimizes
  vertex fetch/transform-cache ordering, **quantizes geometry**, merges meshes to cut draw calls,
  quantizes/resamples animation, and prunes/collapses redundant nodes — i.e. quantization and mesh
  merging happen unconditionally, unlike glTF-Transform where each is an explicit opt-in command
  (or an `optimize` default). Requires `KHR_mesh_quantization` support in the consuming loader.
- `-c` / `-cc` / `-cz`: opt into meshopt-codec compression (`EXT_meshopt_compression` /
  `KHR_meshopt_compression` at higher levels) for further download-size reduction on top of the
  always-on quantization; `-cc` is the standard recommendation, `-cz` maximizes compression.
- `-tc` (KTX2/Basis Universal) and `-tw` (WebP) texture compression flags — parallel to
  glTF-Transform's `etc1s`/`uastc`/`webp` commands but invoked as flags on the single pass instead
  of separate commands.
- `-si R`: mesh/point-cloud simplification to a target ratio R (parallel to glTF-Transform's
  `simplify --ratio`).
- `-mi`: GPU instancing (`EXT_mesh_gpu_instancing`) when the same mesh recurs across nodes —
  directly relevant to a repeated-equipment scene (e.g. many identical pipe fittings).
- **When to prefer gltfpack over glTF-Transform** `[INFER]` (assembled from the two tools' stated
  designs): gltfpack is the single-binary, opinionated, meshopt-first path — fewer knobs, faster
  to run, good default when the target is "make this file small and load fast" without per-step
  control. glTF-Transform is preferable when Draco is specifically wanted (gltfpack has no Draco
  geometry codec — only meshopt quantization/compression), when the pipeline needs KTX2 UASTC vs
  ETC1S per-slot control, when scripting a repeatable multi-project pipeline via the JS API, or
  when `dedup`/`prune` need to run as isolated, inspectable steps.

## 25.4 — Runtime pairing back to [Block 19] §19.1 `[CERT-web]`

Each optimizer output requires a matching loader leg — already documented in [Block 19] §19.1,
not re-derived here, plus version floors confirmed by the gltfpack README:

| Output extension | Required GLTFLoader leg | Version floor `[CERT-web]` |
|---|---|---|
| `KHR_draco_mesh_compression` (glTF-Transform `draco`) | `new DRACOLoader().setDecoderPath(...)` → `loader.setDRACOLoader(...)` | [Block 19] §19.1 contract |
| `EXT_meshopt_compression` / `KHR_meshopt_compression` (glTF-Transform `meshopt`, gltfpack `-c`/`-cc`/`-cz`) | `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` with the WASM decoder module (`examples/jsm/libs/meshopt_decoder.module.js` in the three.js repo) | three.js **r122+** per gltfpack README `[CERT-web]` |
| `KHR_texture_basisu` (glTF-Transform `etc1s`/`uastc`, gltfpack `-tc`) | KTX2Loader transcoder path + `detectSupport()` — [Block 17] §17.4 contract | (KTX2Loader era, see [Block 17] §17.4 / [Block 10] BasisTextureLoader→KTX2Loader r150 migration) |
| `EXT_texture_webp` (glTF-Transform `webp`, gltfpack `-tw`) | native browser WebP decode, no three.js-side loader leg | n/a |
| `KHR_mesh_quantization` (gltfpack default, glTF-Transform `quantize`) | plain GLTFLoader, no extra module | three.js **r111+** per gltfpack README `[CERT-web]` |
| `EXT_mesh_gpu_instancing` (gltfpack `-mi`, glTF-Transform `instance` in `optimize`) | plain GLTFLoader | (Khronos vendor ext; no version floor stated in the preserved README) |

Runtime cost/benefit is unmeasured on this corpus — no prototype currently exports a `.glb`
(confirmed: no `GLTFExporter`/`.glb` reference exists in any of the 25 HTML prototypes as of this
block `[CERT]`, grep over root + `voxel/`). This block documents the *available* pipeline for when
[Block 19]'s export step is actually exercised.

## 25.5 — Recipes for this corpus `[INFER]` (assembled from cited command contracts, no numbers invented)

Three target profiles, using confirmed flags/defaults from §25.2/§25.3 only — no size/memory
figures are stated because neither official source quantifies them for arbitrary content; both
tools' own docs only make qualitative claims ("reduce download size", "less GPU memory
consumption than uncompressed PNG/JPEG" `[CERT-web]`, §25.2 KTX2 rationale).

**(a) Web-viewer `.glb`** (equipment-catalog viewer, [Block 19] §19.1's auto-framing recipe) —
meshopt geometry (fast to decode, matches the on-demand/lazy-load viewer use case) + KTX2 ETC1S
textures sized down for typical viewport use:
```
gltf-transform dedup in.glb tmp1.glb
gltf-transform prune tmp1.glb tmp2.glb
gltf-transform weld tmp2.glb tmp3.glb
gltf-transform resize tmp3.glb tmp4.glb --width 1024 --height 1024
gltf-transform etc1s tmp4.glb out.glb --compression 3
gltf-transform meshopt out.glb out.glb --level high
```
Requires `GLTFLoader.setMeshoptDecoder` (r122+) and KTX2Loader with `detectSupport()`
([Block 17] §17.4) at load time.

**(b) Maximum-fidelity marketing `.glb`** (path-traced/marketing stills, [Block 14] §14.1-class
viewer) — Draco geometry (higher compression ratio than meshopt per the tools' stated roles in
§25.2, no lossy simplification, textures kept at native size/format):
```
gltf-transform dedup in.glb tmp1.glb
gltf-transform prune tmp1.glb tmp2.glb
gltf-transform draco tmp2.glb out.glb --method edgebreaker --encode-speed 0
```
Deliberately skips `simplify`/`resize`/KTX2 — fidelity is the constraint, not transfer size.
Requires `DRACOLoader` at load time ([Block 19] §19.1).

**(c) MapLibre site-map `.glb`** ([Block 16] georeferenced equipment) — the map-layer use case
tolerates aggressive simplification (small on-screen footprint at typical zoom) and benefits most
from gltfpack's single-pass merge+quantize+instance defaults, since site maps commonly repeat the
same equipment mesh across many georeferenced positions ([Block 16]'s use case):
```
gltfpack -i in.glb -o out.glb -cc -si 0.5 -tc -mi
```
`-mi` (GPU instancing) is the operative flag here — same rationale as [Block 2]'s InstancedMesh
for voxel equipment, but applied to a glTF mesh reused across a MapLibre custom layer's scene
graph. Requires meshopt decoder (r122+) and KTX2Loader (`-tc`) at load time.

## 25.6 — Connections

- **[Block 19]** — the export/import contract this pipeline sits between; §19.1's loader legs are
  the runtime side of every output format in §25.4; §19.2's `GLTFExporter` is the producer whose
  output this block's tools consume.
- **[Block 17]** §17.4 — the KTX2Loader/detectSupport contract that both `etc1s`/`uastc` (glTF-
  Transform) and `-tc` (gltfpack) outputs require at runtime.
- **[Block 16]** — the MapLibre georeferenced-equipment use case behind recipe (c); repeated-mesh
  instancing is the same idea as [Block 2]'s InstancedMesh, moved into the glTF/GPU-instancing
  extension layer.
- **[Block 14]** §14.1 — the marketing/path-traced viewer class behind recipe (b).
- **G28 (queued)** — Blender-side export settings are the step upstream of this pipeline; not
  covered here.
