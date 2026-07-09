# Block 14 — Case studies I: eight standalone Three.js demos in the wild

> Research of **8 external showcase sites** (user-supplied): what each does with Three.js, with
> what stack, and what is worth borrowing for the HVAC voxel→realistic pipeline. Part I of G18;
> the dasprinzip tinker series is Part II ([Block 15], sweep in flight). All pages PRESERVED in
> `sources/web-snapshots/` and registered in SOURCES.md before analysis.
>
> Sources: preserved snapshots (sources/web-snapshots/*.md, fetched 2026-07-04) + live-bundle
> token greps performed during the sweep. These are SECONDARY sources (personal sites/demos) →
> `[CERT-a]` with the preserved file as citation. Version caveat: only explicit importmap URLs
> or bundle path fragments count as version evidence; `r1xx` substrings inside minified bundles
> are flagged unconfirmed.
> Method: delegated sweep (general-purpose · sonnet) — fetch + preserve + grep bundles for API
> tokens; driver consolidation. Markers: `[CERT]` local · `[CERT-web]` official web ·
> `[CERT-a]` secondary source (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 2, case studies). Connects [Block 13] §13.4, [Block 11] §11.3, [Block 4] §4.1.

---

## 14.1 — The eight sites `[CERT-a]` (each row cites its snapshot in sources/web-snapshots/)

| # | Site | What it is (author text where available) | Stack / version evidence | Key techniques (token evidence) |
|---|---|---|---|---|
| 1 | skyeshark silhouette-POM | "Silhouette parallax occlusion mapping... TSL, silhouettes clipped through alpha test. Every surface is flat geometry" | importmap jsdelivr `three@0.185.1` **webgpu+tsl builds** (explicit) | WebGPURenderer, TSL BloomNode, custom `parallaxOcclusionUV`, alpha-test silhouettes |
| 2 | xr-need path tracer | "Online 3D model viewer with a custom WebGPU path tracer and OpenPBR materials" | Vite bundle 1.3 MB; version UNCONFIRMED (r184/r185 substrings) | WebGPURenderer ×39, GLTFLoader ×25, MeshBVH ×7 (BVH-accelerated tracing), Batched/InstancedMesh ×10 each |
| 3 | little-landscapes | "Landscape Generator v2.0" — tile-based procedural landscapes; GTAO, 2-tone shading, godrays toggles (UI text) | importmap unpkg `three@0.185.0` (explicit); **unminified 70 KB app module** | InstancedMesh ×15 (tile/prop instancing); no EffectComposer → effects are custom-shader `[INFER]` |
| 4 | arachne / MECHANICA | "Procedural Creature Editor" — sliders (leg count, segment length, armor, gait) drive procedural geometry + IK | **UMD r128** cdnjs (explicit — same era as the corpus legacy file) | IK tokens ×4, custom camera, inline script |
| 5 | GRAVEBOUND | "browser co-op gothic-fantasy survival ARPG" (full game) | Vite bundle 970 KB; version UNCONFIRMED | GLTFLoader ×26, ShaderMaterial ×18, InstancedMesh ×16, BatchedMesh ×9, EffectComposer + UnrealBloomPass |
| 6 | collectivetrajectories | canvas-only SPA shell; subject inferred from slug only `[INFER]` | Vite 2.7 MB; `three@0.184.0` bundle path fragment | **WebGPURenderer ×69** (heaviest), InstancedMesh ×15, BatchedMesh ×14, GLTFLoader ×1 → procedural `[INFER]` |
| 7 | journey.prateekm | "A playable Middle-earth portfolio" | Vite 887 KB + PWA; reads `THREE.REVISION` programmatically | **GLTFLoader ×27 + RGBELoader ×5** (glTF assets + HDR IBL), ShaderMaterial ×16, InstancedMesh ×15 |
| 8 | su-z2 | ambient/audio piece (CC music credit is the only UI text) `[INFER]` | Vite 1.57 MB; version UNCONFIRMED | WebGPURenderer ×42, InstancedMesh ×22, BatchedMesh ×17, GLTFLoader ×24 |

## 14.2 — Cross-cutting patterns `[CERT-a]` / `[INFER]`

1. **The WebGPU/TSL wave is real**: 4 of 8 sites run WebGPURenderer (1, 2, 6, 8), on three
   0.184-0.185 — corroborating the official track documented in [Block 13] §13.4 from the
   consumer side `[CERT-a]`. None of them are "standalone HTML that runs anywhere" like the
   corpus; all four are built apps `[INFER]`.
2. **Two packaging worlds**: explicit importmap+CDN with readable source (sites 1, 3, 4) vs
   Vite-bundled minified SPAs (2, 5, 6, 7, 8). The corpus's own pattern (importmap + inline
   source) matches the first world — and site 3 proves it scales to a sophisticated generator
   in one readable 70 KB module `[CERT-a]`.
3. **Batched+Instanced together** appears in every heavy scene (2, 5, 6, 8) — the exact
   combination proposed for the realistic part zoo in [Block 11] §11.3/§11.4 `[CERT-a]`.
4. **The realistic-pass reference pipeline** is site 7: many glTF assets + `RGBELoader` HDR
   environments — the documented upgrade path from [Block 4] §4.1 (fromEquirectangular) and the
   G13 asset-pipeline subject, running in production `[CERT-a]`.

## 14.3 — What is worth borrowing for the HVAC pipeline `[INFER]` (suggestions, evidence-ranked)

| Priority | Borrow | From | Why it fits |
|---|---|---|---|
| **High** | Parametric-slider configurator: UI sliders → procedural geometry rebuild (coil rows, fin spacing, cabinet size) | arachne (4) | the corpus already builds parametrically ([Block 8] §8.3); adding sliders = a product-configurator jump; no new deps |
| **High** | Tile/prop instancing with quality toggles (AO on/off, 2-tone vs full shading) | little-landscapes (3) | same importmap+readable-module world as the corpus; quality toggles map to voxel↔realistic stage previews |
| Medium | glTF + HDR-environment viewer for the realistic pass | journey (7) | closes the G13 direction with a production example |
| Medium | Batched+Instanced at scale | 2/5/6/8 | field confirmation of [Block 11] §11.4 item 3 |
| Low (future) | WebGPU/TSL pass: POM fin/grille detail on flat panels, path-traced stills for marketing renders | 1, 2 | requires leaving the r160/WebGL/standalone constraint — a deliberate platform decision, not a drop-in |

## 14.4 — Connections

- **[Block 13]** §13.4 — the WebGPU/TSL track these sites corroborate in the field.
- **[Block 11]** §11.3 — Batched+Instanced pattern confirmed in production bundles.
- **[Block 8]** §8.3 — the parametric-geometry muscle the arachne configurator pattern extends.
- **[Block 15]** (pending) — Part II: dasprinzip series; **G19/MapLibre** block pending sweep.
- **G13** — site 7 is its production reference.
