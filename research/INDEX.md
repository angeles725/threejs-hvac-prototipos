# Three.js library (HVAC voxel→realistic pipeline) — Mental Model · Master Index

**Updated**: 2026-07-04
**Analyzed system**: Three.js JavaScript 3D library (r160 primary, r128 legacy) as used by the
HVAC equipment prototype corpus in this directory (25 standalone HTML files: 7 realistic + 18 voxel — corrected per B24/§14; earlier blocks citing 23 inherit the correction).
**Method**: Empirical READ-ONLY research (Research-SDD). Tools: direct reading of prototypes,
context7 MCP (`/mrdoob/three.js`), WebSearch/WebFetch over threejs.org + official wiki,
fetch-doc.sh for preservation. Block style and markers: see `research-sdd/METHODOLOGY.md`.

This index guides through the **40 blocks** of this research. Each block is an independent
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
| 4 | Cross-cutting (perf, migration, upgrade paths) | 10-11, 13, 22-25, 28 | active | Versioning, performance, postprocessing, PBR value references, product lighting, cheap visual wins, asset optimization pipeline, Blender round-trip |
| 5 | Synthesis: team workflow | 12 | done | Voxel-first → realistic-second pipeline doc (B12 + WORKFLOW.md) |
| 6 | Dynamic phase & performance budgets (run 4) | 26-27 | active | Live-measured baseline (draws/triangles) + device-class budget tables derived from it |
| 7 | HVAC domain (run 5) | 29-32 | done | Digital-twin/equipment-viewer conventions applied to this corpus; dashboard/telemetry data-binding layer; terrain/relief and buildings/BIM for site context |
| 8 | Design system (run 6) | 33 | active | Template-as-a-system architecture proposal: shared `lib/` module + parametric equipment components + export contract to client integration projects |

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
| 17 | Optimization compendium II | [block17](threejs-block17.md) | LOD + hysteresis (voxel-as-far-LOD idea), frustumCulled semantics, KTX2/Basis compressed textures, disposal contract + ResourceTracker |
| 18 | Post-processing | [block18](threejs-block18.md) | EffectComposer chain + OutputPass, selective bloom (real glow for HMI/LEDs), OutlinePass component highlighting, SSAO/GTAO toggle, AA caveats, on-demand compatible |
| 19 | The asset pipeline: glTF in, glTF out | [block19](threejs-block19.md) | GLTFLoader + Draco/KTX2 legs, auto-framing viewer recipe, GLTFExporter (.glb) as the bridge to map/viewer/DCC, onlyVisible LOD gotcha |
| 20 | Forum intelligence | [block20](threejs-block20.md) | iOS FloatType+LinearFilter gotcha (HalfFloatType fix), 120Hz ProMotion budgets, VAT+instancing, SlugText GPU labels, volumetric 3D-LUT lesson, discourse as ongoing source |
| 21 | Case studies III | [block21](threejs-block21.md) | 7 three.js sites (r128-r185), MeshSurfaceSampler scattering + fat lines (full-source evidence), atlas3d AI-labeled exploded views, 3 honest negatives, cross-batch corroboration |
| 22 | Physically plausible PBR value references | [block22](threejs-block22.md) | Filament metal F0 table + dielectric reflectance table, glTF metallic-binary rule corroboration, corpus palette audit (13/24 entries mid-metalness anti-pattern), corrected palette proposal |
| 23 | Product-lighting design + RectAreaLight | [block23](threejs-block23.md) | key/fill/rim theory + fill ratios, why reflective metal wants large soft sources, RectAreaLight constructor/init/limitations (no shadows, PBR-only), RectAreaLightHelper, house-rig-to-theory mapping, HVAC studio recipe table |
| 24 | Cheap visual wins catalog | [block24](threejs-block24.md) | MeshMatcapMaterial (no-lights fake studio finish), baked aoMap/lightMap (uv2 contract), ShadowMaterial + official blurred-depth contact-shadow technique, vertex colors via setColorAt, gradient/env backgrounds + backgroundBlurriness, FXAA/SMAA/SSAA cost ladder, ranked cost→beauty tables (voxel + realistic) |
| 25 | Asset optimization pipeline: glTF-Transform + gltfpack | [block25](threejs-block25.md) | glTF-Transform CLI `optimize` + à-la-carte commands (draco/meshopt/etc1s/uastc/resize/dedup/prune/weld/simplify), JS API, MIT license, gltfpack meshopt-first single binary, runtime pairing to [Block 19] loader legs (r111+/r122+ floors), recipes for web-viewer/marketing/MapLibre .glb profiles, local capability check (both CLIs confirmed runnable) |
| 28 | Blender ↔ three.js round-trip for organic/baked HVAC parts | [block28](threejs-block28.md) | official glTF 2.0 add-on export contract (+Y up, Apply Modifiers, Draco, GPU-instancing), Principled BSDF → glTF PBR channel mapping (base color/metallic-roughness packing/baked-AO node group/normal/emissive), Cycles bake workflow (AO/Normal bake types, Selected-to-Active, Margin) as the authoring answer to [Block 24]'s uv2 requirement, round-trip recipe (procedural → export → Blender touch-ups/bake → optimize → load), when to author from Blender vs procedural code |

### Layer 5 — Synthesis

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 12 | SYNTHESIS: voxel-first → realistic-second workflow | [block12](threejs-block12.md) | two-pass pipeline evidence, stage roles, shared template economics, punch list; companion WORKFLOW.md |

### Layer 6 — Dynamic phase & performance budgets (run 4)

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 26 | DYNAMIC PHASE: measured baseline of the prototypes | [block26](threejs-block26.md) | live Puppeteer/SwiftShader probes, draw-call/triangle counts per prototype, shadow-pass double-draw mechanism, environment caveats (software GPU → FPS excluded) |
| 27 | Performance budgets per device class | [block27](threejs-block27.md) | frame-time math (16.6/8.3 ms), MDN/Unity/community draw-call guidance, adaptive-quality ladder (DPR/quality-toggle/shadow-size), device-class budget tables gap-checked against B26's measured numbers, real-hardware measurement protocol |
| 40 | LOD applied & measured: hotel building far-shell (run 7) | [block40](threejs-block40.md) | `THREE.LOD` auto-update contract (r106+, no manual loop call), singleton-vs-dispersed-InstancedMesh applicability rule, far-shell technique (omit `roomsGroup` interior + swap `transmission` glass for opaque), `[CERT-hw]` before/after (HI 692/921,744 → LO 656/854,424 = −5.2%/−7.3%), honest finding: equipment (chillers+pumps = 65% of equipment tris) dominates the budget, not the building; transmission fillrate cost unmeasured under SwiftShader → G41 equipment-LOD (requires-execution) |

### Layer 7 — HVAC domain (run 5)

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 29 | HVAC/industrial equipment visualization domain | [block29](threejs-block29.md) | exploded-view technique (forum consensus + CAD-viewer explosion-value convention), X-ray/ghost mode (depthWrite/renderOrder/fresnel), ISA-101 status-color convention (neutral-default, color-on-abnormal), Blender-empty hotspot pattern (CSS2DObject), Viewer3D vanilla-three.js warehouse-SCADA precedent (InstancedMesh pools + baked vertex colors + render-on-demand), ranked HVAC-viewer feature checklist |
| 30 | Dashboards: 3D scene + telemetry/data binding + charts | [block30](threejs-block30.md) | CSS2DRenderer/CSS2DObject as a second renderer (contract, pointerEvents, cost model) vs DOM overlays vs SlugText, data-binding recipe (emissiveIntensity/setColorAt mutation + on-demand render, 1Hz throttle, WebSocket transport), DOM chart libraries (uPlot/Chart.js/ECharts) around the canvas vs rare in-scene CanvasTexture sparklines, Monash BAS Graphics Standard layout (header/nav/main panes, alarm-console/priority convention, floor-selector ordering), camera-preset deep-links, standalone-HTML-vs-build-step verdict |
| 31 | Terrain and relief for site context | [block31](threejs-block31.md) | CPU heightmap displacement (position attribute + computeVertexNormals) vs material displacementMap (with its "pair with a matching normal map" caveat), Mapbox Terrain-RGB decode formula, AWS Terrain Tiles/Terrarium free public-S3 decode formula, MapLibre native `terrain`+`raster-dem`+`TerrainControl` as an alternative to hand-built relief, cheap terrain texturing (vertex color by altitude/slope, CanvasTexture gradients, satellite draping), three ranked site-context recipes (stylized pad / real-relief patch / full MapLibre terrain) |
| 32 | Buildings/BIM: building shells and floor plans for HVAC context | [block32](threejs-block32.md) | ThatOpen `web-ifc` (WASM IFC parser, MPL-2.0) + `@thatopen/components` (MIT, current `OBC` API, IFC→Fragments convert-once workflow) superseding deprecated `web-ifc-three`, corpus's own floor-plan-to-3D technique in `cuarto-frio-plano-realistic (6).html` (`Shape`/`ShapeGeometry` per-room polygons + axis-aligned box-stacked walls with door cuts), general `ExtrudeGeometry`-along-path form for non-rectilinear plans, image-underlay tracing tools (blueprint3d/blueprint3d-modern/OpenPlan3D), OSM `building`/`height` tags + MapLibre `fill-extrusion` for footprint massing, decision table (IFC vs plan-extrusion vs OSM massing vs MapLibre) tied to the two-pass workflow's context-vs-hero framing — closes G32, the final gap (32/32) |

### Layer 8 — Design system (run 6)

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 33 | The template as a system: a design-library architecture proposal | [block33](threejs-block33.md) | copy-paste quantification across 27 prototypes + 4 independent client-integration reinventions (Tridium, Honeywell UpDetail/CarcamoDetail, bms-casino React), `lib/` proposal (scene-kit/palette/rig/equipment/viewer), composite-scene shell kits (room/datacenter/plant), export contract (.glb vs versioned module) with the React-hosted contrast case, migration path ranked by leverage |
| 34 | Motion design with intent | [block34](threejs-block34.md) | easing/duration bands, tween-vs-mixer (corpus uses zero mixers), camera transition patterns, shadow re-bake gotcha, motion vocabulary |
| 35 | 3D interaction UX | [block35](threejs-block35.md) | picking pipeline + drag threshold, hover/focus states, touch mapping, zero-loading-screens finding, camera UX recipes |
| 36 | 2D design tokens + accessibility | [block36](threejs-block36.md) | overlay census (26/27 hardcoded), lib/theme.css proposal, WCAG contrast violation found, ISA-101 status tokens, reduced-motion |
| 37 | Composition & art direction | [block37](threejs-block37.md) | FOV↔focal mapping, diagonal grammar measured (19/21 at 38-48° azimuth), plan-scale FOV gap, preset vocabulary, catalog thumbnail spec |
| 38 | Deliverables + visual QA | [block38](threejs-block38.md) | 4K capture contract (tested live), transparent captures, tools/capture.mjs, pixelmatch golden regression, delivery kit table |
| 39 | Dataviz craft | [block39](threejs-block39.md) | Cleveland-McGill ranking, chart discipline (no gauges), Monash red/green ramp flagged colorblind-risky, per-widget style contract |

### Layer 9 — Procedural generation & numerical methods for design tools (run 9)

| # | Block | File | Key topics |
|---|--------|---------|------------|
| 45 | Robust polygon offsetting + straight skeleton | [block45](threejs-block45.md) | the nave build tool's `collapseWalls` union-find collapses only collinear runs, leaving corner/T/X junctions interpenetrating (`[CERT]` file:line); polygon offset = Minkowski-with-disk + join types (Round/Miter/Square/Bevel) + miter_limit acute-angle fallback; boolean union via Vatti + the integer-coordinate robustness trick (Clipper does the maths on scaled ints; pure-JS Martinez uses floats + loop-caps); straight skeleton wavefront + edge/split events + the roof lift (z = slope·time_reached); mature JS libs table (clipper2-wasm Boost/maintained, js-angusj-clipper Clipper1/int-only, StrandedKitty CGAL-WASM skeleton MIT, polygon-clipping Martinez FP); actionable build-tool recommendation (offset→union→straight-skeleton roof, snap to int grid first) |

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
- [x] G11 — Post-processing upgrade path → [Block 18]
- [x] G12 — Performance → [Block 11]
- [x] G13 — Asset pipeline → [Block 19]
- [x] G20 — Case studies III → [Block 21]
- [x] G22 — PBR value references → [Block 22]
- [x] G23 — Product-lighting design + RectAreaLight → [Block 23]
- [x] G24 — Cheap visual wins (matcap, baked AO, blob shadows) → [Block 24]
- [x] G25 — gltf-transform optimization pipeline → [Block 25]
- [x] G26 — DYNAMIC baseline → [Block 26]
- [x] G27 — Performance budgets per device class → [Block 27]
- [x] G28 — Blender round-trip (medium, run 4) → [Block 28]
- [x] G29 — HVAC equipment visualization domain → [Block 29]
- [x] G30 — Dashboards & telemetry → [Block 30]
- [x] G31 — Terrain/relief → [Block 31]
- [x] G32 — Buildings/BIM → [Block 32]
- [x] G33 — The template as a system (design library architecture) → [Block 33]
- [x] G21 — Forum intelligence → [Block 20]
- [x] G16 — Rendering methods deep-dive → [Block 13]
- [x] G17 — Optimization compendium → [Block 17]
- [x] G18 — External case studies → [Block 14] + [Block 15]
- [x] G19 — MapLibre GL JS interop → [Block 16]
- [x] G15 — BatchedMesh evaluation → closed by remittance, [Block 11] §11.3
- [x] G14 — SYNTHESIS → [Block 12] + WORKFLOW.md
- [x] G40 — LOD applied & measured (run 7, reopen) → [Block 40]
- [ ] G41 — Equipment LOD (dual hi/lo InstancedMesh for chillers/pumps) → **requires-execution (§19)**, not read-only
- [x] G42 — Voxel→realistic parity map + living environment It.1 (relief, animated sea, biomes, sky) → [Block 41] (run 8, build-phase §19)
- [x] G43 — Living environment It.2 (vegetation, paths/boardwalk, beach & pool furniture) → [Block 41 §41.6] (run 8, +12 draws, deployed)
- [x] G44 — Voxel-parity It.4 (scene labels + pipe connectivity fixes [CHW riser to roof AHU, pool loop, condenser 2-pipe] + rooftop AHU->shaft duct) → [Block 41 §41.6] (run 8, deployed). DEFERRED (optional next batch): zone isolation (AISLAR), per-unit detail panel (needs hitboxes on merged geo), pipe flow particles (voxel had them stripped — realistic already at parity).
- [x] G45 — Per-floor average temperature It.3 (simulated °C, HUD panel + 8 floating color-coded labels, 1 Hz) → [Block 41 §41.6] (run 8, +8 draws, deployed)
- [x] G46 — Biome polish + floating-equipment fix + pool machine-room (voxel palette, smooth blends, multi-rect BUILT, pool hut) → [Block 41 §41.7] (run 8, deployed)
- [x] G47 — Room selection + predictive-maintenance panel (88 aligned hitboxes, EdgesGeometry outline by health, temp/setpoint/humidity/amperage + DIAGNOSTICO PREDICTIVO) → [Block 41 §41.7] (run 8, deployed)
- [x] G49 — Sea rework (4 decorrelated directional waves, no global beat) + no-cache header so redeploys are visible → [Block 41 §41.7] (run 8, deployed)
- [x] G48 — Dashboard predictive section (dashboard-energetico-v1.html: 'Mantenimiento predictivo', 7 subsystem health cards, PREDICTIVO ANTES QUE CORRECTIVO banner) → [Block 41 §41.7] (run 8, deployed)
- [x] G50 — Room panel visibility fix: removed #roomPanel from the .clean hide list so it shows on select inside the dashboard iframe (?clean=1) → (run 8, deployed)
- [x] G51 — Selection extended to all 18 equipment units (unified selectUnit, per-type metrics + predictive), panel moved LEFT-center, camera flyTo focus on select + 'VISTA ENFOCADA' badge/vignette with Salir → general → (run 8, deployed)
- [x] G52 — Equipment outlines from real per-type AABB (fix swapped/mis-sized boxes) + persistent warning/alarm highlights (always-on outline, alarm pulses) + badge moved off the views bar → (run 8, deployed)
- [x] G53 — Status bar + warning/danger drill-down ported from Honeywell-MX60 (`ALSER/Proyectos/Pagina/Honeywell-MX60` [CERT], AlarmIndicatorView/HomeMap/StatusResolver): now VERTICAL right-center with per-state click filter (alarm/warning/ok) → popover → row click = selectUnit + focus → (run 8, deployed)
- [x] G54 — Dashboard PDF report: print-to-PDF (@media print, dependency-free) + jsPDF direct download (CDN, offline fallback) of the collected data (health summary, KPIs, predictive subsystems) → (run 8, deployed)
- [x] G55 — UI de-overlap + full responsive pass (distinct panel zones; #temps off left-center; #sys/#ctl/#ctl2 stacked; tablet/phone breakpoints, #roomPanel/#statusPop bottom-sheets <=600, hide secondary <=520) + SEA reverted to STATIC (wave animation looked bad; client asked for static) → (run 8, deployed)

## Non-investigable gaps (without lab / hardware / NDA)

- (none)

## Estimated coverage

40/40 read-only gaps closed across 7 runs — RUN 7 COMPLETE (reopen §8, B40 applied+measured LOD).
1 requires-execution gap queued (G41 equipment LOD, §19 build phase). Terminal: Spanish designer handbook.
- [x] G56 — Per-unit DETAIL VIEW pattern analysis (MX60-web + chihuahua/Niagara): dedicated page = header+KPI cockpit+focused single-unit 3D+Chart.js trends; portable (Niagara only binds the data source) → [Block 42], port plan pending user go-ahead
- [x] G57 — Casino BMS reference (niagara-casino React/Vite) analysis + consolidated hotel detail-OVERLAY build plan (overlay over persistent scene; focused per-unit mini-3D via existing builders; Chart.js trends+comfort bands+ayer baseline; insights engine) → [Block 43]
- [x] G58 — Hotel detail OVERLAY It.A (focused mini-3D via existing builders + KPI cockpit) + cross-iframe chrome-hide + full 3D-UI restyle to B11 Industrial (paper/navy/rust, IBM Plex, flat) + scene labels removed + navy blueprint viewer bg → [Block 43], deployed

### RUN 9 — procedural generation & numerical methods for design tools (new axis, 2026-08-07)

- [x] G59 — Robust polygon offsetting + straight skeleton (wall-union, corner/roof closure) → [Block 45]
- [ ] G60 — Robust boolean CSG on 3D solids (three-bvh-csg) → **pending**
- [ ] G61 — Triangulation: earcut vs Constrained Delaunay for holed polygons (the cap step) → **pending**
- [ ] G62 — Mesh simplification via Quadric Error Metrics (LOD/decimation) → **pending**
- [ ] G63 — Isosurfaces: marching cubes vs dual contouring (three.js MarchingCubes) → **pending**
- [ ] G64 — Curves & surfaces: Bézier/Catmull-Rom/NURBS (three.js Curve API, NURBS addons) → **pending**
- [ ] G65 — Numerical robustness of geometric predicates (orientation/incircle, epsilon/snapping) → **pending**
- [ ] G66 — Procedural placement: poisson-disk/blue-noise + WFC / L-systems → **pending**
