# Three.js library (HVAC voxel→realistic pipeline) — Research State

> Operational state consumed by the loop (Research-SDD). Mirrored in engram
> (`research/three.js/gaps`, `research/three.js/progress`). Visible and versionable source.
>
> **Angle**: Three.js as the library powering the team's HVAC prototyping pipeline —
> voxel-art first pass, realistic PBR second pass. Research covers the subsystems the
> pipeline uses (instancing, PBR materials, lighting/IBL, shadows, color management,
> cameras/controls, procedural geometry/textures, versioning) — not the whole library.
<!-- research-state.v1 -->
schema: research-state.v1
covered_blocks: 61
gaps_closed: 53
known_gaps: 55
investigable_open: 1
requires_execution_open: 1
blocked_open: 0
deferred_open: 0
undocumented_findings: 0
<!-- /research-state.v1 -->


## Coverage

- **RUN 10 (REOPEN §8, 2026-08-08, user-driven — NEW AXIS: real-world DIMENSIONAL references for the
  `disenos/catalog/` asset build)**: the catalog families are being modelled from `catalog.yaml` prose
  notes ("cold-room door: insulated leaf, hinge, gasket, latch handle"), which is not a measurable spec.
  Every prior run studied the RENDERER; none studied the SUBJECT being rendered. This axis closes that:
  manufacturer-datasheet dimensional envelopes so `dimensions_real` in each design-spec carries
  `[CERT-doc]` evidence instead of invented numbers — the same discipline `mesa-trabajo` got from its CAD
  block. Seeded gaps: G67 (doors — **B57**), G68 (storage/racking — **B58**); both CLOSED, each spawning a siblings gap (G69 doors, G70 storage). G69 then closed by **B59** for 2 of its 3 subjects, re-scoping the security door to G71 (blocked-on-thin-source).
- **RUN 9 (REOPEN §8, 2026-08-07, user scope-expansion — NEW AXIS)**: procedural/algorithmic
  generation + numerical methods & mathematics for building BETTER Three.js **design tools** (not
  rendering — B1-B44 covered that). Motivated by the `nave-panccadia` build tool, whose `collapseWalls`
  union-find collapses only collinear-overlapping wall runs and leaves corner/T/X junctions
  interpenetrating (B45 §45.1). AUDIT-FIRST backlog seeded: G59 (robust polygon offsetting + straight
  skeleton — **B45**), G60 (three-bvh-csg robust CSG — **B46**), G61 (CDT vs earcut
  for holed polygons — **B47**), G62 (QEM mesh simplification), G63 (marching cubes /
  dual contouring), G64 (Bézier/Catmull-Rom/NURBS curves & surfaces), G65 (robust geometric predicates +
  epsilon/snapping — **B48** — the cross-cutting foundation B45/B46/B47 all pointed at),
  G66 (poisson-disk / WFC / L-systems procedural placement — **B52**). **G66 (procedural placement —
  poisson-disk/blue-noise Bridson 2007 + WFC constraint-solving + L-systems) — B52, this iteration (LAST
  gap).** **0 read-only-investigable gaps remain → RUN 9 read-only set EXHAUSTED = STOP.** Remaining work is
  requires-execution only (G41 equipment-LOD, §19 build phase).
- **RUN 8 (REOPEN §8, 2026-07-06, AUTO — build-phase §19, user-driven client-satisfaction loop)**: voxel→realistic parity map + living-environment build on `hotel-realista-ensamblado.html` (G42, [Block 41]). Replaces the flat "infinite plane" ground + static sea with procedural terrain relief + per-vertex biomes (1 draw call), a GPU wave-displaced sea (0 CPU cost), and a gradient sky background. Spawns G43 (vegetation/paths/furniture), G44 (voxel-parity interactions + duct audit), G45 (per-floor temperature) as in-loop requires-execution gaps. Visual QA deferred: WSL headless has no WebGL context — syntax-checked only (`node --check` PASS).
- **RUN 7 (REOPEN §8, 2026-07-06, supervised — user present)**: applied+measured LOD on the assembled hotel (G40). Cap +1 (B40). Prompted by live implementation of a building LOD in `hotel-realista-ensamblado.html`; documents the before/after with a `[CERT-hw]` browser probe. Emergent G41 (equipment LOD) is **requires-execution**, not read-only → does not reopen the static count.
- **RUN 6 (REOPEN §8, 2026-07-04, AUTO/orchestrated — queued behind the WORKFLOW.md fix writers)**: design-craft completion from the graphic-designer + 3D-designer lens (G33-G39). Cap +7 (B33-B39). Order per driver recommendation: template-system first (multiplier), then motion/UX, then 2D tokens/accessibility, then art direction/deliverables/dataviz.
- **Covered blocks**: 61 (B1-B61). **B53/B54/B55/B56 = DOCUMENT-mode captures (§20)**, not discovery gaps, all on the "design tools/toolchain" axis (siblings of B52); none change the RUN 9 read-only=0 STOP.
  - **B53** = the design3d material-read gate is measured reviewer-variance-dominated + the CIEDE2000 ΔE00 objective anchor adopted from the img2threejs upstream (validated ΔE00 0.13 vs 11.7).
  - **B54** = GPU-budget rendering for the client visor (real GPU; SwiftShader QA path unaffected): top-5 levers (render-on-demand + damping-tail caveat issue #23090, KTX2/Basis+Draco+meshopt VRAM compression, InstancedMesh/BatchedMesh, frozen static-rig shadows `autoUpdate=false`+`needsUpdate`, DPR cap) + baked lightmaps for static shells + honest "does NOT apply" (LOD/low-repeat instancing). All API claims verified against three.js `dev` docs `[CERT-web]`; 8 new doc sources + issue #23090 preserved before citing.
  - **B55** = Turf.js is geospatial, not planar-CAD: `@turf/buffer` (reproject→JSTS→reproject) + `@turf/area` (geodesic) are wrong-by-design on CAD metres (issue #1750: [0,0]→[100,0] = 99.88°); right Cartesian libs for DXF→mesh = js-angusj-clipper (offset), polygon-clipping/martinez (boolean), jsts (one-lib). Two verified CORRECTIONS: current Turf booleans delegate to `polyclip-ts` (not `polygon-clipping` directly); `jsts` = `(EDL-1.0 OR EPL-1.0)`, NOT MIT. 12 new sources preserved before citing.
  - **B56** = measured GPU budget of the 18 nave-Panccadia equipment inspectors (headless CDP read of
    `renderer.info`, `sources/probes/B56-visor-perf/`): the scenes are far under the [Block 54] gates, so the
    heavy playbook is premature — the ONE data-justified lever is damping-safe render-on-demand, written from
    primary sources. Closes the [Block 54] "measure before applying" next-step.
- **Coverage metric**: 53 / 55 closed (RUN 10: G67→B57, G68→B58, G69→B59 [2 of 3], G72→B60, G70→B61 [2 of 4]; G73 open, G71 blocked-on-thin-source) — **RUN 9 STOPPED (read-only-investigable=0). B45+B46+B47+B48+B49+B50+B51+B52 written.** (Runs 7-8 history below; G41 remains as requires-execution §19 build phase.)
- **RUN 5 STOPPED (2026-07-04): read-only-investigable = 0 — ALL RUNS COMPLETE (32/32 gaps, 5 runs)**
- **RUN 5 (2026-07-04, AUTO/orchestrated)**: HVAC-domain design (G29-G32) — G29 (HVAC/industrial equipment visualization domain, B29), G30 (dashboards & telemetry, B30), G31 (terrain/relief, B31), and G32 (buildings/BIM, B32) covered — **RUN 5 COMPLETE, all 4 gaps closed**. User authorized auto-chaining incl. emergent gaps; RUN 5 ran to exhaustion of the backlog with no new gaps left. Hard-stops: failed self-report, cap, exhaustion, destructive step.
- **RUN 4 (REOPEN §8, 2026-07-04, AUTO/orchestrated)**: 3D-design craft + optimization (G22-G28) — **RUN 4 COMPLETE**, all 7 gaps covered (B22-B28).
- **RUN 3 (REOPEN §8, 2026-07-04)**: user supplied a 3rd batch — 11 showcase URLs + 6 forum threads (discourse/reddit) for problems & solutions. Runs 1-2 history preserved above.
- **Last iteration**: 2026-07-04 — **RUN 2 (REOPEN, §8)**: user expanded scope — rendering deep-dive, optimization methods, external case studies (20 URLs), MapLibre. G11/G13 back in scope.

## Gap-backlog (prioritized)

| Priority | Gap | Artifact type / source | Status |
|---|---|---|---|
| high | G1 — Baseline: how the prototype corpus uses three.js (versions, load styles, shared scaffolding) | local HTML prototypes + context7 | **covered → [Block 1]** |
| high | G2 — InstancedMesh & voxel-scale rendering: API contract, limits, vs merged geometry | context7 + web + prototypes | **covered → [Block 2]** |
| high | G3 — PBR material system: MeshStandardMaterial vs MeshPhysicalMaterial, param semantics | context7 + prototypes | **covered → [Block 3]** |
| high | G4 — Lighting & environment: light types, IBL via PMREMGenerator+RoomEnvironment vs HDR files | context7 + prototypes | **covered → [Block 4]** |
| high | G5 — Shadows: map types, shadow-camera tuning, cost model, artifacts (acne/bias) | context7 + prototypes | **covered → [Block 5]** |
| medium | G6 — Color management & tone mapping: SRGBColorSpace, ACESFilmic, r152 migration | context7 + web | **covered → [Block 6]** |
| medium | G7 — Cameras & controls: fake-isometric low-FOV vs true OrthographicCamera; OrbitControls | context7 + prototypes | **covered → [Block 7]** |
| medium | G8 — Geometry toolkit for realistic modeling: Cylinder/Torus/Extrude/Lathe, BufferGeometry | context7 + prototypes | **covered → [Block 8]** |
| medium | G9 — Procedural texturing: CanvasTexture technique, texture settings, vs image textures | context7 + prototypes | **covered → [Block 9]** |
| medium | G10 — Migration & versioning: r128→r160 breaking changes, CDN strategies, legacy upgrade path | web (migration guide) + prototypes | **covered → [Block 10]** |
| low | G11 — Post-processing upgrade path: EffectComposer, bloom, SSAO (absent today) | context7 | **covered → [Block 18]** |
| low | G12 — Performance: draw calls, renderer.info, instancing benchmarks, pixel-ratio caps | context7 + web | **covered → [Block 11]** |
| low | G13 — Asset pipeline beyond procedural: GLTF import/export, DCC handoff | context7 + web | **covered → [Block 19]** |
| high | G20 — Case studies III: 11 showcase URLs (NEW, run 3) | web sweep (preserved) | **covered → [Block 21]** (3 honest negatives + 1 slug-reuse flag included) |
| high | G21 — Forum intelligence: discourse.threejs.org + 6 threads (mobile perf, GPU text, underwater, volumetric WebGPU, texture painter, Houdini VAT) — problems & solutions (NEW, run 3) | web sweep (preserved) | **covered → [Block 20]** |
| high | G22 — Physically plausible PBR value references: measured albedo/metalness/roughness charts for real materials (galvanized, copper, insulation, painted steel) (run 4) | context7 + web (official charts) | **covered → [Block 22]** |
| high | G23 — Product-lighting design: 3-point/studio theory for industrial product shots + RectAreaLight (softbox) contract & caveats (run 4) | context7 + web | **covered → [Block 23]** |
| high | G24 — Cheap visual wins catalog: matcap materials, baked AO, blob/contact shadows, vertex colors, gradient backgrounds, AA tradeoffs (run 4) | context7 | **covered → [Block 24]** |
| high | G25 — Asset optimization pipeline: gltf-transform / gltfpack CLI (Draco+meshopt+KTX2+dedup), install & recipes (run 4) | web + tool docs | **covered → [Block 25]** |
| high | G26 — DYNAMIC PHASE (§12): live profiling of representative prototypes — draw-call/triangle counts via GL hooks; [CERT-hw] baseline (run 4) | local prototypes + Puppeteer/browser | **covered → [Block 26]** (driver-supervised; FPS deferred to real hardware in G27) |
| high | G27 — Performance budgets per device class, derived from G26 measurements + web guidance (run 4) | G26 data + web | **covered → [Block 27]** |
| medium | G28 — Blender ↔ three.js round-trip: modeling/UV/baking → glTF export settings (run 4) | official Blender/three docs | **covered → [Block 28]** |
| high | G29 — HVAC/industrial equipment visualization domain: digital-twin viewer patterns, exploded views, status overlays (run 5) | web + case refs | **covered → [Block 29]** |
| high | G30 — Dashboards: three.js + telemetry/data binding, HTML/CSS2D overlays, charts integration (run 5) | context7 + web | **covered → [Block 30]** |
| medium | G31 — Terrain/relief: heightmap displacement, DEM data sources, MapLibre terrain tie-in (run 5) | context7 + web + B16 | **covered → [Block 31]** |
| medium | G32 — Buildings/BIM: IFC pipeline (web-ifc), floor-plan-to-3D, building shells for site context (run 5) | web + tool docs | **covered → [Block 32]** |
| high | G33 — The template as a system: shared module (palette/rig/scaffolding) + parametric reusable equipment components (compressor, fan, coil) — architecture proposal (run 6) | corpus + web | **covered → [Block 33]** |
| high | G34 — Motion design 3D: easing/timing with intent, cinematic camera (tours, preset transitions), animated exploded views, state micro-animations (run 6) | context7 + web | queued (run 6) |
| high | G35 — 3D interaction UX: hover/select visual states, focus+context dimming, touch gestures, loading states, camera history (run 6) | context7 + web | queued (run 6) |
| high | G36 — 2D design tokens + accessibility: typography scale, UI color system (vs PBR palette), iconography, WCAG contrast, colorblind-safe alarm states (run 6) | web + standards | queued (run 6) |
| medium | G37 — Composition & art direction: focal lengths per shot type, staging, turntables, consistent catalog thumbnails (run 6) | web + corpus | queued (run 6) |
| medium | G38 — High-quality deliverables + visual QA: 4K offscreen captures, transparent backgrounds, golden-screenshot regression via tools/probe.mjs (run 6) | context7 + local | queued (run 6) |
| medium | G39 — Data-viz craft for the dashboards: visual hierarchy, pre-attentive attributes, alarm console UX beyond the Monash standard (run 6) | web + B30 | queued (run 6) |
| high | G16 — Rendering methods deep-dive: render loop styles, on-demand rendering, render targets, WebGPURenderer/TSL status, alt renderers, path tracing (NEW, run 2) | context7 + web | **covered → [Block 13]** (path tracing deferred to G18 case block) |
| high | G17 — Optimization compendium beyond B11: LOD, BVH, culling, KTX2, disposal/memory (NEW, run 2) | context7 + web | **covered → [Block 17]** |
| high | G18 — External case studies: 18 showcase pages — techniques + applicability (NEW, run 2) | web sweeps (preserved) | **covered → [Block 14] + [Block 15]** |
| medium | G19 — MapLibre GL JS: what it is, three.js custom-layer interop, site-map use cases (NEW, run 2) | web (official docs/repo) | **covered → [Block 16]** |
| low | G15 — BatchedMesh: availability in r160, API, fit for multi-geometry realistic scenes (NEW, from B2) | context7 + web | **closed by remittance → [Block 11] §11.3** (availability r160 proven at cuarto-3d.html:103, API + fit covered; no new substance) |
| high (terminal) | G14 — SYNTHESIS: team workflow doc — voxel-first → realistic-second pipeline | corpus blocks + prototypes | **covered → [Block 12] + WORKFLOW.md** |
| high | G40 — LOD applied & measured: `THREE.LOD` on the assembled hotel building (near full tower / far shell), before/after draws+tris via browser probe (run 7) | local prototype + Puppeteer probe + context7 | **covered → [Block 40]** (`[CERT-hw]`; finding: building is not the tri bottleneck — equipment dominates) |
| high | G41 — Equipment LOD (the high-return target from B40 §40.4): dual hi/lo `InstancedMesh` for chillers/pumps (65% of equipment tris) or geometry decimation | prototype build | **requires-execution → §19** (not read-only; needs building + re-measure) |
| high | G59 — Robust polygon offsetting (Minkowski/disk, join types, miter limit) + straight skeleton (wavefront, edge/split events, roof lift): maths + mature JS libs (clipper2-wasm/js-angusj-clipper/StrandedKitty) + numerical caveats + build-tool recommendation (run 9) | local build tool + web (angusj/wikipedia/npm) | **covered → [Block 45]** |
| high | G60 — Robust boolean CSG on 3D solids: three-bvh-csg (Garrett Johnson) union/subtract/intersect for HVAC part assembly + wall-void cuts — algorithm (BVH-accelerated), robustness vs classic BSP-CSG, API, license, cost model (run 9) | context7 + web + corpus | **covered → [Block 46]** |
| high | G61 — Triangulation: earcut (three.js ShapeUtils default) vs Constrained Delaunay Triangulation for polygons WITH HOLES — the cap/floor step of an extruded footprint; quality, robustness, JS libs (cdt2d, poly2tri) (run 9) | context7 + web | **covered → [Block 47]** |
| high | G65 — Numerical robustness of geometric predicates: orientation/incircle exact predicates, epsilon/snapping, degeneracy handling — the cross-cutting foundation under G59-G61 (robust-predicates, why float clippers loop) (run 9) | web + corpus | **covered → [Block 48]** |
| medium | G62 — Mesh simplification via Quadric Error Metrics (Garland-Heckbert): LOD/decimation maths + JS (meshoptimizer/simplifyModifier), fit for the equipment-LOD gap G41 (run 9) | context7 + web | **covered → [Block 49]** (QEM verified in paper; premise CORRECTED — three.js SimplifyModifier is Melax 1998 then a meshopt wrapper, NOT hand-rolled QEM; decimate equipment build-time w/ meshoptimizer) |
| medium | G63 — Isosurfaces: marching cubes vs dual contouring — three.js MarchingCubes addon, metaballs/scalar-field surfacing for ducts/blobs (run 9) | context7 + web | **covered → [Block 50]** (MC linear-interp `mu=(iso−v0)/(v1−v0)` verified in three.js source; DC=QEF-over-Hermite-normals preserves sharp features; HONEST: no maintained JS dual-contouring lib — surfaceNets is dual but not feature-preserving; isosurface of a temperature/CFD field = real unbuilt HVAC app) |
| medium | G64 — Curves & surfaces: Bézier / Catmull-Rom / B-spline / NURBS — three.js Curve API, CatmullRomCurve3, NURBSCurve/NURBSSurface addons, pipe/duct centreline sweeping (run 9) | context7 + web | **covered → [Block 51]** (Bernstein/Cox-de Boor/rational-weight maths verified in three.js source; centripetal α=0.5 default proven cusp-free by Yuksel 2011; getPointAt arc-length reparam; computeFrenetFrames = rotation-minimising frame w/ closed-curve twist fix; NURBS is examples/jsm addon, NURBSSurface a bare evaluator) |
| medium | G66 — Procedural placement: poisson-disk / blue-noise sampling + Wave Function Collapse / L-systems for scattering & layout generation (run 9) | web + corpus | **covered → [Block 52]** (Bridson 2007 O(N) blue-noise verified in the SIGGRAPH sketch PDF: grid cell r/√n, active list, k=30 candidates in the r..2r annulus, 2N−1 iters; WFC honestly = constraint solving NOT quantum [mxgmn README], lowest-Shannon-entropy cell + AC-4 propagation + contradiction/restart; L-system = rewriting grammar G=(V,ω,P) + turtle [ ] branching; corpus scatters bushes/grass by UNIFORM-RANDOM-in-rectangle [CERT] = the clustering Bridson names; three.js ships only MeshSurfaceSampler [area-uniform, NOT blue-noise], Poisson/WFC/L-sys are external MIT libs feeding InstancedMesh; decision rule per job) |
| high | G67 — Industrial DOOR dimensional + construction reference for the catalog build: cold-room hinged door (leaf thickness, max leaf envelope, frame gauge, hinge/handle/gasket hardware), and the sectional/roll-up/security siblings — the measured envelope a design-spec needs instead of invented numbers (run 10) | manufacturer datasheets (web, preserved) | **covered → [Block 57]** (cold-room door envelope CERTIFIED: 100 mm PIR leaf, max 1400 × 2500 mm per leaf, 1,5 mm AISI 304 insulated frame, 1 mm skin, Fermod 920/921 latch, kick plate = door-width × 300/800 mm; freeze variant adds heating cables + a cast-in aluminium bottom rail = a GEOMETRIC delta; HONEST NEGATIVE: datasheets publish a MAXIMUM and no nominal size, so a chosen 1.20 × 2.20 m leaf is [INFER]/med, never high. Sectional/roll-up/security siblings NOT covered → G69)
| high | G72 — Vehicle + pedestrian ACCESS-CONTROL dimensional reference: tripod turnstile and boom barrier (NEW, from B59 family sweep) | manufacturer datasheets (web, preserved) | **covered → [Block 60]** (turnstile FULLY published: housing 450 x 420 x 980 mm, channel 500-550, arm 510, 25 kg, 304 stainless. Barrier only PARTLY: boom 2.50-8.30 m, 1.5-6 s, 24 V/240 W and a 610 mm keep-clear envelope are certified, but NO vendor publishes a cabinet envelope, so the housing stays [INFER]/low. Asymmetry recorded rather than levelled) |
| low | G73 — Sliding gate (porton-corredizo) and personnel airlock (esclusa-personal) dimensional reference (NEW, from B60) | manufacturer datasheets (web) | pending |
| medium | G71 — Industrial SECURITY door envelope: steel leaf gauge, leaf/frame sizes, push-bar geometry (RE-SCOPED out of G69 by B57 §59.6, NEW from B59) | manufacturer datasheet (web) — none found | **blocked-on-thin-source** — tried: EN 1125 panic-hardware catalogues (hardware only, no door envelope), Strongdor / Security Direct / Doors4Security product pages (marketing copy, no gauge or leaf table), and the datasheet+mm search pattern that worked for B57. Carries forward one certified fact: EN 1125 is the panic-exit device standard. Needs a real manufacturer technical manual before it is investigable |
| medium | G70 — The other three `almacenamiento` assets: boltless shelving (level pitch, upright angle/gauge, chipboard deck), structural mezzanine (column grid, joist depth, deck build-up, handrail heights), stackable metal tote — same axis as G68, different subjects, needs its own preserved sources (NEW, from B58) | manufacturer catalogues (web) | **covered (2 of 4) → [Block 61]** (Euro container 600x400x220 VDA 4500 KLT — premise REFUTED, it is NOT EN 13199; 4 containers per EUR pallet layer exactly, closing the B58 chain. Boltless shelving: 14-gauge angle posts, 350 lbs standard / 1,500 lbs heavy per shelf, riveted keyhole joint. Mezzanine + security cage NOT covered; §61.5 declares this gap's easy evidence exhausted) |
| medium | G69 — The other three `puertas` assets: sectional overhead door (panel height, track geometry), roll-up shutter (curtain profile pitch, drum box, side guides), industrial security door (leaf gauge, push-bar) — same axis as G67, different subjects, needs its own preserved sources (NEW, from B57) | manufacturer datasheets (web) | **covered (2 of 3) → [Block 59]** (sectional: 42 mm panel, standard section heights 375/500/625/750 + 750/1500 bottom, torsion-spring shaft, named track applications, RM <= 5000 mm; roll-up: 80/100 mm lath, G105/G135 guides, drum box B 300-535 with coil R 320-500, and the install equation minimum total height = H + B + C1. Security door has NO certifiable source -> RE-SCOPED to G71) |
| high | G68 — Warehouse STORAGE dimensional reference for the catalog build: selective pallet racking (rack depth vs pallet, beam lengths, beam/upright profile sizes, hole pattern, compartment heights, RAL colours) anchored on the EUR pallet, plus the shelving/mezzanine/tote siblings (run 10) | manufacturer catalogues (web, preserved) | **covered → [Block 58]** (EUR pallet EN 13698-1 800 × 1,200 × 144 mm is the sizing anchor; CORE FINDING: rack depth 1,050 mm under a 1,200 mm pallet — the pallet overhangs 75 mm each side, so a frame deeper than the pallet reads as shelving; beam lengths 1,800-3,900 mm, profile number = section height 80-140 mm, hole pattern 50:50, beams RAL 5010 blue on galvanized/RAL 7037 uprights; DGUV 108-007 forbids the single bay — row ≥ 3 bays, ≥ 2 levels, compartment ≤ 2,500 mm; Dexion brochure REJECTED as non-dimensional and recorded. Shelving/mezzanine/tote siblings NOT covered → G70)

## Iteration history

| # | Date | Gap closed | Block | Delegated? · model tier | New gaps uncovered |
|---|---|---|---|---|---|
| 1 | 2026-07-04 | G1 baseline corpus usage | B1 | yes · sonnet (Explore sweep) + inline write | 0 |
| 2 | 2026-07-04 | G2 InstancedMesh/voxel rendering | B2 | no · inline (context7 queries) | 1 (G15 BatchedMesh) |
| 3 | 2026-07-04 | G3 PBR material system | B3 | no · inline (context7 queries) | 0 |
| 4 | 2026-07-04 | G4 lighting & environment | B4 | no · inline (context7 queries) | 0 |
| 5 | 2026-07-04 | G5 shadows | B5 | no · inline (context7 queries) | 0 |
| 6 | 2026-07-04 | G6 color management & tone mapping | B6 | no · inline (context7 queries) | 0 |
| 7 | 2026-07-04 | G7 cameras & controls | B7 | no · inline (context7 queries) | 0 |
| 8 | 2026-07-04 | G8 geometry toolkit | B8 | no · inline (context7 queries) | 0 |
| 9 | 2026-07-04 | G9 procedural texturing | B9 | no · inline (context7 queries) | 0 |
| 10 | 2026-07-04 | G10 migration & versioning | B10 | no · inline (context7 queries) | 0 |
| 11 | 2026-07-04 | G12 performance (+G15 by remittance) | B11 | no · inline (context7 queries) | 0 |
| 12 | 2026-07-04 | G14 SYNTHESIS (terminal) | B12 + WORKFLOW.md | no · inline (cross-block consolidation) | 0 |
| 13 | 2026-07-04 | G16 rendering methods (run 2) | B13 | no · inline (context7); G18 sweeps delegated in parallel (2× sonnet) | 0 |
| 14 | 2026-07-04 | G18 part I (8 standalone demos) | B14 | yes · sonnet (web sweep + preservation) | 0 |
| 15 | 2026-07-04 | G18 part II (dasprinzip series) | B15 | yes · sonnet (web sweep + preservation) | 0 |
| 16 | 2026-07-04 | G19 MapLibre interop | B16 | yes · sonnet (web sweep + preservation) | 0 |
| 17 | 2026-07-04 | G17 optimization compendium II | B17 | no · inline (context7 queries) | 0 |
| 18 | 2026-07-04 | G11 post-processing | B18 | no · inline (context7 queries) | 0 |
| 19 | 2026-07-04 | G13 asset pipeline (run-2 final) | B19 | no · inline (context7 queries) | 0 |
| 20 | 2026-07-04 | G21 forum intelligence (run 3) | B20 | yes · sonnet (forum sweep + preservation) | 0 |
| 21 | 2026-07-04 | G20 case studies III (run-3 final) | B21 | yes · sonnet (showcase sweep + preservation) | 0 |
| 22 | 2026-07-04 | G22 PBR value references (run 4) | B22 | yes · sonnet (full iteration) | 0 |
| 23 | 2026-07-04 | G23 product lighting + RectAreaLight (run 4) | B23 | yes · sonnet (full iteration) | 0 |
| 24 | 2026-07-04 | G24 cheap visual wins (run 4) | B24 | yes · sonnet (full iteration) | 0 |
| 25 | 2026-07-04 | G25 gltf-transform pipeline (run 4) | B25 | yes · sonnet (full iteration) | 0 |
| 26 | 2026-07-04 | G26 DYNAMIC baseline (run 4) | B26 | no · driver-supervised (§12) + Puppeteer probes | 0 |
| 27 | 2026-07-04 | G27 performance budgets (run 4) | B27 | yes · sonnet (full iteration) | 0 |
| 28 | 2026-07-04 | G28 Blender round-trip (run-4 final) | B28 | yes · sonnet (full iteration) | 0 |
| 29 | 2026-07-04 | G29 HVAC viz domain (run 5) | B29 | yes · sonnet (full iteration) | 0 |
| 30 | 2026-07-04 | G30 dashboards & telemetry (run 5) | B30 | yes · sonnet (full iteration) | 0 |
| 31 | 2026-07-04 | G31 terrain/relief (run 5) | B31 | yes · sonnet (full iteration) | 0 |
| 32 | 2026-07-04 | G32 buildings/BIM (run-5 final) | B32 | yes · sonnet (full iteration) | 0 |
| 33 | 2026-07-04 | G33 template as a system (run 6) | B33 | yes · sonnet (full iteration) | 0 |
| 34 | 2026-07-04 | G34 motion design (run 6, parallel) | B34 | yes · sonnet (parallel block-writer, central archive) | 0 |
| 35 | 2026-07-04 | G35 interaction UX (run 6, parallel) | B35 | yes · sonnet (parallel block-writer, central archive) | 0 |
| 36 | 2026-07-04 | G36 tokens + accessibility (run 6, parallel) | B36 | yes · sonnet (parallel block-writer, central archive) | 0 |
| 37 | 2026-07-04 | G37 art direction (run 6, parallel) | B37 | yes · sonnet (parallel block-writer, central archive) | 0 |
| 38 | 2026-07-04 | G38 deliverables + visual QA (run 6, parallel) | B38 + tools/capture.mjs | yes · sonnet (parallel block-writer, central archive) | 0 |
| 39 | 2026-07-04 | G39 dataviz craft (run 6, parallel) | B39 | yes · sonnet (parallel block-writer, central archive) | 0 |
| 40 | 2026-07-06 | G40 LOD applied & measured (run 7, reopen) | B40 | no · inline (§12 dynamic probe — narrow live probe, not delegated) | 1 (G41 equipment LOD, requires-execution) |
| 45 | 2026-08-07 | G59 robust polygon offsetting + straight skeleton (run 9, reopen — NEW AXIS) | B45 | inline (constraint: single-block reopen executor; web-primary DESIGN block, sources preserved before citing) · scout: CERTIFIABLE-NOW | 7 (G60-G66 procedural/numerical backlog seeded) |
| 46 | 2026-08-07 | G60 robust boolean CSG on 3D meshes: three-bvh-csg (run 9) | B46 | inline (constraint: single-block reopen executor; web-primary DESIGN block, 5 sources preserved+hashed before citing) · scout: CERTIFIABLE-NOW | 0 (forward gaps G61/G63/G65 already queued) |
| 47 | 2026-08-07 | G61 earcut vs Constrained Delaunay for holed polygons (run 9) | B47 | inline (constraint: single-block reopen executor; web-primary DESIGN block, 9 sources preserved+hashed before citing — incl. three.js ShapeUtils.js/Earcut.js source proving the earcut path) · scout: CERTIFIABLE-NOW | 0 (forward gaps G62/G65 already queued) |
| 48 | 2026-08-07 | G65 robust geometric predicates + epsilon/snapping (run 9 — cross-cutting synthesis of B45/B46/B47) | B48 | inline (constraint: single-block reopen executor; web-primary DESIGN/synthesis block, 5 NEW sources preserved+hashed before citing — Shewchuk robust.html, three.js BufferGeometryUtils.js, robust-orientation/robust-in-sphere READMEs; reused Clipper2/CGAL/robust-predicates snapshots) · scout: CERTIFIABLE-NOW | 0 (forward gaps G62/G63/G64/G66 already queued) |
| 49 | 2026-08-07 | G62 QEM mesh simplification (run 9); premise CORRECTED — SimplifyModifier is Melax 1998 then a meshopt wrapper, not hand-rolled QEM | B49 | inline (constraint: single-block reopen executor; web-primary DESIGN/APPLIED block, 5 NEW sources preserved+hashed before citing — Garland-Heckbert 1997 paper PDF, three.js SimplifyModifier dev+r160, meshoptimizer README+simplifier.cpp) · scout: CERTIFIABLE-NOW | 0 (forward gaps G63/G64/G66 already queued; documentation half of G41 supplied) |
| 50 | 2026-08-07 | G63 isosurfaces: marching cubes vs dual contouring (run 9) | B50 | inline (constraint: single-block reopen executor; web-primary DESIGN/APPLIED block, 6 NEW sources preserved+hashed before citing — three.js MarchingCubes.js, Bourke polygonise, Wikipedia MC, Ju-et-al 2002 DC paper PDF, boris-the-brave DC tutorial, isosurface npm README) · scout: CERTIFIABLE-NOW | 0 (forward gaps G64/G66 already queued) |
| 51 | 2026-08-07 | G64 curves & surfaces: Bézier/Catmull-Rom/NURBS (run 9) | B51 | inline (constraint: single-block reopen executor; source+web-primary DESIGN/APPLIED block, 13 sources preserved+hashed before citing — 9 three.js source files [Curve/Interpolations/CatmullRomCurve3/{Cubic,Quadratic}BezierCurve3/TubeGeometry/NURBS{Curve,Surface,Utils}], Wikipedia Bézier/centripetal-CatmullRom/NURBS, Yuksel-2011 centripetal PDF) · scout: CERTIFIABLE-NOW | 0 (forward gap G66 already queued) |
| 55 | 2026-08-08 | G71 ROBOTICS dimensional + joint-hierarchy reference (run 10, catalog-robotica worktree) | B62 | inline (constraint: parallel catalog worktrees — no sub-agents; doc+web-primary EVIDENCE/DESIGN block, 6 NEW sources preserved+hashed before citing — ABB IRB 6700 product spec 3HAC080365, ABB IRB 660 PR10284EN, UR10e technical spec, MiR250 spec 2.99, SICK C4000 C40S-1301AA030, robot-safety.net ISO 13857 fence + Robotiq 2F-85 manual §6) · block number 62 taken because B59 was consumed twice in parallel worktrees; evidence folder namespaced by family | 0 (siblings SCARA/delta/AGV-tugger queued as G72 if a future family needs them) |
| 54 | 2026-08-08 | G68 warehouse STORAGE dimensional reference — selective pallet racking (run 10) | B58 | inline (constraint: session directive — no sub-agents; doc-primary EVIDENCE block, 5 NEW sources preserved+hashed before citing — SSI SCHÄFER chapter extracts PR 350 + PR 600, Dexion P90 brochure [REJECTED, recorded], mecalux euro-pallet, Wikipedia EUR-pallet) · scout: CERTIFIABLE-NOW ×2, INSUFFICIENT ×1 (Dexion) | 1 (G70 — shelving/mezzanine/tote siblings) |
| 53 | 2026-08-08 | G67 industrial DOOR dimensional + construction reference (run 10 — NEW AXIS) | B57 | inline (constraint: session directive — no sub-agents; web+doc-primary EVIDENCE block, 3 NEW manufacturer datasheets preserved+hashed+text-extracted before citing — DAN-doors MH1001K/MH1001F/MH0601K; 2 web checks dan-doors.dk MH1002K + fermod.com) · scout: CERTIFIABLE-NOW | 1 (G69 — sectional/roll-up/security door siblings) |
| 57 | 2026-08-08 | G70 storage: boltless shelving + Euro container KLT (run 10) | B61 | inline (constraint: session directive; 3 sources preserved+hashed, 1 fetch returned 0 bytes and was DELETED rather than registered as a phantom) · scout: CERTIFIABLE-NOW x2, FAILED x1 | 0 (§61.5: this gap's easy evidence is exhausted) |
| 56 | 2026-08-08 | G72 access control: tripod turnstile (full) + boom barrier (partial) (run 10) | B60 | inline (constraint: session directive — no sub-agents; 2 NEW sources preserved+hashed + 1 official web page) · scout: CERTIFIABLE-NOW x1, PARTIAL x1 | 1 (G73 — sliding gate + airlock) |
| 55 | 2026-08-08 | G69 sectional + roll-up door dimensional reference (run 10); security door RE-SCOPED to G71 | B59 | inline (constraint: session directive — no sub-agents; doc-primary EVIDENCE block, 4 NEW sources preserved+hashed before citing — Hörmann sectional 42 mm technical manual, Angel Mir roller-shutter catalogue, plus Hart Doors + Bifold Rolfe brochures REJECTED as non-dimensional and recorded) · scout: CERTIFIABLE-NOW ×2, INSUFFICIENT ×2 | 1 (G71 — security door, blocked-on-thin-source) |
| — | — | ARCHIVE AUDIT: iterations for B53-B56 (DOCUMENT-mode §20 captures) were never appended to this table; they are recorded in the Coverage section instead. Noted, not back-filled. | B53-B56 | — | — |
| 52 | 2026-08-07 | G66 procedural placement: poisson-disk/blue-noise (Bridson 2007) + WFC + L-systems (run 9 — LAST read-only gap) | B52 | inline (constraint: single-block reopen executor; web+source-primary DESIGN/APPLIED block, 8 NEW sources preserved+hashed before citing — Bridson SIGGRAPH07 PDF, kchapelier poisson-disk-sampling + fast-2d READMEs, mxgmn WaveFunctionCollapse + kchapelier JS-port READMEs, three.js MeshSurfaceSampler.js, nylki lindenmayer README, Wikipedia L-system; corpus scatter grounded [CERT] hotel-realista-ensamblado.html) · scout: CERTIFIABLE-NOW | 0 (RUN 9 read-only set EXHAUSTED = STOP; G41 requires-execution remains) |

**RUN 4 gaps complete** (G22-G28, all covered). **RUN 5 COMPLETE** (G29-G32 — HVAC domain,
dashboards, terrain, buildings/BIM) — G29 (B29), G30 (B30), G31 (B31), and G32 (B32) all covered,
32/32 across 5 runs. **RUN 6 REOPENED** (G33-G39, design-craft completion) — G33 (B33, this
iteration) covered, template-as-a-system architecture proposal. 6 gaps remain queued (G34-G39).

## Blocked gaps (each tagged with what it needs)

- (none — all gaps are docs/web/local-file investigable)

## Stop control (primary = read-only-investigable exhaustion, METHODOLOGY §8)

- **Open gaps — read-only investigable**: **0** — **RUN 9 STOPPED** (reopen §8, new axis; B45+B46+B47+B48+B49+B50+B51+B52; read-only set EXHAUSTED, METHODOLOGY §8 primary criterion). NEXT-ACTION = §19 build phase (apply B45 robust 2D union + B48 snapping to the nave `build-viewer.py`; build G41 equipment-LOD with the B49 meshoptimizer recipe).
- **Open gaps — requires-execution**: 1 (G41 equipment LOD — needs a build + re-measure, §19; **documentation half now supplied by [Block 49]** — algorithm + meshoptimizer build-time recipe)
- **Open gaps — blocked**: 0
- Consecutive iterations with empty backlog (secondary): 0/2
- Budget cap (safety net): run 1 = 12 blocks (fired). Run 2 (reopen): +7 (B13-B19). Run 7 (reopen): +1 (B40, fired). **Run 9 (reopen): +8 gaps seeded (G59-G66), ALL 8 closed (B45, B46, B47, B48, B49, B50, B51, B52) — RUN 9 read-only set EXHAUSTED = STOP.**

## Pre-flight source existence (BOOTSTRAP e2)

- Local prototypes: **25 HTML — 7 realistic at root + 18 voxel in `voxel/`** (recount 2026-07-04, §14 correction of the bootstrap's 8+15 miscount). `[CERT]`
- Post-research addition (2026-07-04, after run-5 STOP): +2 new voxel files (`voxel/campus-hvac-voxel.html`, `-v2`) — house template (r0.160.0, InstancedMesh, animated fan groups). Corpus counts in blocks reflect the 25 known at research close; fixes pipeline covers 27.
- context7 `/mrdoob/three.js` — resolved 2026-07-04, 21,432 snippets, High reputation. `[CERT-web]`
- threejs.org docs/manual + migration guide (GitHub wiki) — web access permitted by user this run.
- All 14 gaps have confirmed reachable sources → investigable.
