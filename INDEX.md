# Three.js library (HVAC voxel→realistic pipeline) — Mental Model · Master Index

**Updated**: 2026-07-04
**Analyzed system**: Three.js JavaScript 3D library (r160 primary, r128 legacy) as used by the
HVAC equipment prototype corpus in this directory (8 realistic + 15 voxel standalone HTML files).
**Method**: Empirical READ-ONLY research (Research-SDD). Tools: direct reading of prototypes,
context7 MCP (`/mrdoob/three.js`), WebSearch/WebFetch over threejs.org + official wiki,
fetch-doc.sh for preservation. Block style and markers: see `research-sdd/METHODOLOGY.md`.

This index guides through the **0 blocks** of this research. Each block is an independent
`.md`, linked to the rest with `[Block K]`. The auto-generated flat catalog lives in
[CATALOG.md](CATALOG.md) (regenerate with `python3 tools/gen-catalog.py`).

## Marker legend

`[CERT]` local primary · `[CERT-doc]` official document (sources/) · `[CERT-web]` official web ·
`[CERT-a]` forum/secondary · `[INFER]` deduction. (Detail in `research-sdd/METHODOLOGY.md §3`.)

---

## Layer summary

| Layer | Topic area | Blocks | Status | One-line summary |
|---|---|---|---|---|
| 1 | Corpus baseline & library fundamentals | 1 | active | How the prototypes use three.js today |
| 2 | Voxel stage (instancing, isometric look) | 2, 7 | active | The voxel-art first-pass techniques |
| 3 | Realistic stage (PBR, IBL, shadows, color) | 3-6, 8-9 | active | The realistic second-pass techniques |
| 4 | Cross-cutting (perf, migration, upgrade paths) | 10-11, 13 | active | Versioning, performance, postprocessing |
| 5 | Synthesis: team workflow | 12 | done | Voxel-first → realistic-second pipeline doc (B12 + WORKFLOW.md) |

---

## Full map

### Layer 1 — Corpus baseline & library fundamentals

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 1 | Corpus baseline: how the HVAC prototypes use Three.js | [block1](threejs-block1.md) | versions (r160/r128), importmap/CDN, shared scaffolding, voxel-vs-realistic split, outliers |

### Layer 2 — Voxel stage

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 2 | InstancedMesh and voxel-scale rendering | [block2](threejs-block2.md) | InstancedMesh API contract, needsUpdate/bounding caveats, setColorAt, vs mergeGeometries, legacy anti-pattern, BatchedMesh (new gap) |
| 7 | Cameras and controls | [block7](threejs-block7.md) | fake-isometric low-FOV histogram, OrthographicCamera alternative, OrbitControls update() contract, MapControls option |

### Layer 3 — Realistic stage

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 3 | The PBR material system | [block3](threejs-block3.md) | metallic-roughness workflow, MeshPhysicalMaterial extensions, house material palette, glass transmission-vs-opacity divergence, r163 envMapIntensity change |
| 4 | Lighting and environment | [block4](threejs-block4.md) | RoomEnvironment+PMREM IBL pipeline, house 3-light rig, physically-correct lighting era (r147/r151/r155), candela/decay semantics |
| 5 | Shadows | [block5](threejs-block5.md) | shadow map types, ortho frustum fitting, bias/normalBias, mapSize ladder, castShadow opt-outs, cuarto-3d baked-shadows evolution |
| 6 | Color management and tone mapping | [block6](threejs-block6.md) | r152 color management, working space, rename map, tone-mapping menu (AgX in r160), ACESFilmic exposure calibration, legacy color hole |
| 8 | The geometry toolkit of the realistic stage | [block8](threejs-block8.md) | geometry census (Cylinder 54), constructor contracts, bevelEnabled footgun, curved Shape extrude, procedural Lathe, direct vertex editing |
| 9 | Procedural texturing with CanvasTexture | [block9](threejs-block9.md) | draw-don't-download strategy, fin/nameplate implementations, texture colorSpace contract, missing-SRGBColorSpace divergence, NearestFilter voxel option |

### Layer 4 — Cross-cutting

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 10 | Migration and versioning | [block10](threejs-block10.md) | migration ledger r147-r163, r148 examples/js removal, r161 UMD removal (r160 = last UMD release), legacy upgrade recipe, CDN strategies |
| 11 | Performance: budgets, levers, and BatchedMesh | [block11](threejs-block11.md) | perf inventory, draw-call levers, shadow baking backport, BatchedMesh r160-proven + API + per-palette batching (closes G15) |
| 13 | Rendering methods | [block13](threejs-block13.md) | rAF vs setAnimationLoop vs on-demand rendering, render targets, WebGPURenderer + TSL track, setNodesHandler migration bridge |
| 14 | Case studies I: eight standalone demos | [block14](threejs-block14.md) | silhouette-POM/TSL, WebGPU path tracer, landscape generator, parametric creature configurator, GRAVEBOUND, WebGPU wave, borrow-list for HVAC |
| 15 | Case studies II: dasprinzip tinker series | [block15](threejs-block15.md) | WebGL r169 vs TSL/WebGPU r171-185 split, data-driven instanced grids, GPU particle flow, texture-swap UI, Tweakpane, fullscreen-quad TSL shading |
| 16 | MapLibre GL JS interop | [block16](threejs-block16.md) | BSD-3 map renderer, CustomLayerInterface onAdd/render, shared GL context + MercatorCoordinate, georeferenced equipment use cases |

### Layer 5 — Synthesis

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 12 | SYNTHESIS: voxel-first → realistic-second workflow | [block12](threejs-block12.md) | two-pass pipeline evidence, stage roles, shared template economics, punch list; companion WORKFLOW.md |

---

## Pending (gap-backlog)

> Readable mirror of `RESEARCH-STATE.md`. Consumed by the loop to pick the next gap.

- [x] G1 — Baseline: how the prototype corpus uses three.js → [Block 1]
- [x] G2 — InstancedMesh & voxel-scale rendering → [Block 2]
- [x] G3 — PBR material system → [Block 3]
- [x] G4 — Lighting & environment (IBL) → [Block 4]
- [x] G5 — Shadows → [Block 5]
- [x] G6 — Color management & tone mapping → [Block 6]
- [x] G7 — Cameras & controls → [Block 7]
- [x] G8 — Geometry toolkit for realistic modeling → [Block 8]
- [x] G9 — Procedural texturing → [Block 9]
- [x] G10 — Migration & versioning → [Block 10]
- [ ] (low) G11 — Post-processing upgrade path
- [x] G12 — Performance → [Block 11]
- [ ] (low) G13 — Asset pipeline beyond procedural (run 2)
- [x] G16 — Rendering methods deep-dive → [Block 13]
- [ ] (high) G17 — Optimization compendium (run 2)
- [x] G18 — External case studies → [Block 14] + [Block 15]
- [x] G19 — MapLibre GL JS interop → [Block 16]
- [x] G15 — BatchedMesh evaluation → closed by remittance, [Block 11] §11.3
- [x] G14 — SYNTHESIS → [Block 12] + WORKFLOW.md

## Non-investigable gaps (without lab / hardware / NDA)

- (none)

## Estimated coverage

16/19 — RUN 2: B13-B16 done. Remaining: G17 optimization, G11 post-processing, G13 assets — fit exactly in B17-B19.
