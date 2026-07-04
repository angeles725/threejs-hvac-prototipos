# Block 1 — Corpus baseline: how the HVAC prototypes use Three.js

> Research of **the prototype corpus itself**: which Three.js versions, load styles, and shared
> scene scaffolding the 23 HVAC prototypes use today. Establishes the ground truth every later
> block builds on. Does NOT yet deep-dive any subsystem (instancing → [Block 2], PBR → [Block 3]).
>
> Sources: `/home/cristian/prototipos/three.js/*.html` (8 realistic) + `voxel/*.html` (15 voxel)
> · context7 `/mrdoob/three.js` (official docs, queried 2026-07-04).
> Method: delegated Explore sweep over all 23 files (sonnet tier) + driver grep re-verification of
> every load-bearing citation (14 tokens checked). Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) ·
> `[INFER]` deduction.
>
> Layer 1 (corpus baseline). Connects [Block 2..5] (subsystem deep-dives seeded here).

---

## 1.1 — Corpus inventory `[CERT]`

23 standalone HTML prototypes of HVAC equipment, in two families (ls 2026-07-04):

| Family | Location | Count | Examples |
|---|---|---|---|
| Realistic | repo root | 8 | `trane-rtu-realistic-v10.html`, `chiller-aircooled-realistic (7).html`, `carcamo-agua-3d (1).html`, `cuarto-3d.html` |
| Voxel | `voxel/` | 15 | `voxel/liebert-split-voxel.html`, `voxel/trane-rtu-voxel__6_ (3).html`, `voxel/cooling-tower-voxel (1).html` |

Several equipment types exist in BOTH families (trane-rtu, liebert-split, split-system,
chiller-aircooled, cuarto-frio) — e.g. `trane-rtu-realistic-v10.html` vs
`voxel/trane-rtu-voxel__6_ (3).html`, sharing the same UI overlay IDs (`#info`, `#legend`) at the
same line positions (both files lines 28-37) `[CERT]`. This pairing is direct evidence of the
team's two-stage workflow (voxel first, realistic second) — consolidated in the terminal
synthesis block (G14).

## 1.2 — Versions and load styles `[CERT]` / `[CERT-web]`

| Style | Version | Files | Citation |
|---|---|---|---|
| ES-module importmap → unpkg CDN | r0.160.0 | ~20 of 23 (the standard) | `trane-rtu-realistic-v10.html:47-48` |
| Dynamic importmap injected via JS | r0.160.0 | 2 (Cloudflare email-protection workaround) | `split-system-realistic (2).html:53-57` |
| esbuild pre-bundled, library inlined | r160 (`var REVISION = "160"`) | 2 giants: `cuarto-3d.html`, `voxel/cuarto-frio-voxel (18).html` | `voxel/cuarto-frio-voxel (18).html:487` |
| Legacy UMD `<script>` tags | r128 (`three.min.js` + `examples/js` OrbitControls) | 1: `voxel/data_center_voxel_isometrico_3d.html` | `voxel/data_center_voxel_isometrico_3d.html:59-60` |

- The standard pattern maps `"three"` → `https://unpkg.com/three@0.160.0/build/three.module.js`
  and `"three/addons/"` → `.../examples/jsm/` `[CERT]` (`trane-rtu-realistic-v10.html:47-48`).
- This is exactly the officially documented installation pattern (import map + CDN, with
  `three/addons/` pointing at `examples/jsm/`) `[CERT-web]` (context7 `/mrdoob/three.js`,
  manual/installation.html + manual/fundamentals.html, 2026-07-04 — official examples use
  jsdelivr; the corpus uses unpkg, an equivalent CDN).
- Official docs currently exemplify `three@0.185.0` `[CERT-web]` (context7, docs/llms.txt,
  2026-07-04) → the corpus standard r0.160.0 is ~25 releases behind current `[INFER]`
  (release-delta arithmetic; upgrade-relevant changes → G10, [Block on migration]).
- The dynamic-importmap variant builds the same map via `document.createElement` splitting the
  `@` character, with an in-code comment naming Cloudflare email-protection middleware as the
  reason `[CERT]` (`split-system-realistic (2).html:53-57`, `voxel/split-system-voxel.html:50-59`).
- The two esbuild bundles vendor the whole library + OrbitControls inline
  (`cuarto-3d.html:30711` — `// node_modules/three/examples/jsm/controls/OrbitControls.js`) —
  self-contained at runtime, no CDN dependency `[CERT]`.

## 1.3 — Shared scene scaffolding (both families) `[CERT]`

Near-verbatim across ≥18 of 23 files (representative citations, each grep-verified):

| Concern | Setting | Citation |
|---|---|---|
| Renderer | `new THREE.WebGLRenderer({ antialias:true })`, `setPixelRatio(min(devicePixelRatio,2))` | `trane-rtu-realistic-v10.html:66` |
| Tone mapping | `ACESFilmicToneMapping`, exposure 1.05-1.1 | `trane-rtu-realistic-v10.html:71-72` |
| Color output | `renderer.outputColorSpace = THREE.SRGBColorSpace` | `trane-rtu-realistic-v10.html:73` |
| Shadows | `PCFSoftShadowMap`, mapSize 2048×2048, tuned ortho frustum, `bias = -0.0003` | `voxel/trane-rtu-voxel__6_ (3).html:89-92` |
| Light rig | 3-directional: white key "sun" (~1.5, castShadow) + cool blue fill `0x88aaff` (~0.4) + teal rim `0x00d4aa` (~0.2) + `AmbientLight` (~0.25) | `voxel/trane-rtu-voxel__6_ (3).html:85-95` |
| Controls | `OrbitControls` from `three/addons/`, `enableDamping`, `dampingFactor 0.08`, often `autoRotate` | `voxel/trane-rtu-voxel__6_ (3).html:78-79` |
| Loop | recursive `requestAnimationFrame` calling `controls.update()` + `renderer.render()` | `cuarto-3d.html:32276-32277` |
| Resize | one-liner: update `camera.aspect` + `updateProjectionMatrix()` + `renderer.setSize()` | `cuarto-frio-plano-realistic (6).html:397` |
| Camera | `PerspectiveCamera` FOV 36-42° in voxel files (fake isometric — NO `OrthographicCamera` anywhere in app code) | `voxel/liebert-split-voxel.html:62` |
| UI | absolutely-positioned DOM overlays (`#info`, `#legend`, `#panel`), no `CSS2DRenderer` (zero hits) | `trane-rtu-realistic-v10.html:28-37` |

The teal/blue rig colors are a house style (same hex values `0x88aaff` / `0x00d4aa` repeated
near-verbatim in `voxel/liebert-split-voxel.html:86-96`, `voxel/cooling-tower-voxel (1).html:162-172`)
`[CERT]`.

## 1.4 — Technique split: voxel vs realistic `[CERT]`

| Dimension | Voxel family | Realistic family |
|---|---|---|
| Geometry | one shared `BoxGeometry(1,1,1)` + `InstancedMesh` per color group (`voxel/liebert-split-voxel.html:331,345-351`); animated parts as separate Groups (`:358` comment "PARTES ANIMADAS (Groups fuera del InstancedMesh)") | `CylinderGeometry`/`TorusGeometry`/`ExtrudeGeometry`/`LatheGeometry`/`ConeGeometry` sub-assemblies in nested Groups (`chiller-aircooled-realistic (7).html:374,396,421`) |
| Materials | `MeshStandardMaterial` (17/18 files), `MeshPhysicalMaterial` for gloss | `MeshStandardMaterial` w/ explicit roughness/metalness (e.g. galv `0.45/0.82` at `chiller-aircooled-realistic (7).html:178`), `MeshPhysicalMaterial` w/ clearcoat/transmission (`:188,201`) |
| Environment | light rig only | light rig + IBL: `PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)` (`trane-rtu-realistic-v10.html:76-77`, `chiller-aircooled-realistic (7).html:77-78`) — NO external HDR files (zero `RGBELoader`/`.hdr` hits) |
| Depth cue | none | `THREE.Fog` scaled per scene: 22-40 units small tank (`carcamo-agua-3d (1).html:272`) vs 420-1100 large plan (`cuarto-frio-plano-realistic (6).html:85`) |
| Textures | flat vertex-less colors | procedural `CanvasTexture` only (fins, nameplates — `chiller-aircooled-realistic (7).html:150-174`); no image loading |

Absent in BOTH families `[CERT]` (zero grep hits across all 23 files): custom shaders
(`ShaderMaterial`/`RawShaderMaterial`), post-processing (`EffectComposer`/bloom passes),
`OrthographicCamera` (app code), `CSS2DRenderer`, image textures, geometry merging
(`BufferGeometryUtils`). Glow is faked with `PointLight`s + `emissive` materials
(`trane-rtu-realistic-v10.html:811`).

## 1.5 — Outliers `[CERT]`

- **Legacy file**: `voxel/data_center_voxel_isometrico_3d.html` is the only r128/UMD file AND the
  only voxel file building per-cube `Mesh`es in nested loops (`:141-149`) with
  `MeshLambertMaterial` (`:98`) — pre-dating the InstancedMesh + PBR house template. It is the
  natural upgrade-path case study (→ G10).
- **Bundled giants**: `cuarto-3d.html` (~1.4 MB) and `voxel/cuarto-frio-voxel (18).html` (~1.3 MB)
  are esbuild output with the library inlined; also the only two files with raycasting — a
  click-to-capture-coordinates authoring tool (`cuarto-3d.html:32220,32235-32236`), not
  object-picking UX.

## 1.6 — Connections

- **[Block 2]** (planned, G2) — InstancedMesh voxel technique found in 17/18 voxel files (§1.4).
- **[Block 3]** (planned, G3) — PBR material parameters catalogued in §1.4.
- **[Block 4]** (planned, G4) — the RoomEnvironment/PMREM IBL pattern (§1.4) and 3-light rig (§1.3).
- **[Block 5]** (planned, G5) — shadow settings baseline (§1.3).
- **G10 migration** — r128 outlier + r0.160.0-vs-r0.185.0 delta (§1.2, §1.5).
- **G14 synthesis** — the voxel↔realistic file pairing (§1.1) is the workflow's physical evidence.
