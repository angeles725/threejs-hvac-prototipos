# Three.js library (HVAC voxel→realistic pipeline) — Research State

> Operational state consumed by the loop (Research-SDD). Mirrored in engram
> (`research/three.js/gaps`, `research/three.js/progress`). Visible and versionable source.
>
> **Angle**: Three.js as the library powering the team's HVAC prototyping pipeline —
> voxel-art first pass, realistic PBR second pass. Research covers the subsystems the
> pipeline uses (instancing, PBR materials, lighting/IBL, shadows, color management,
> cameras/controls, procedural geometry/textures, versioning) — not the whole library.

## Coverage

- **RUN 6 (REOPEN §8, 2026-07-04, AUTO/orchestrated — queued behind the WORKFLOW.md fix writers)**: design-craft completion from the graphic-designer + 3D-designer lens (G33-G39). Cap +7 (B33-B39). Order per driver recommendation: template-system first (multiplier), then motion/UX, then 2D tokens/accessibility, then art direction/deliverables/dataviz.
- **Covered blocks**: 32 (B1-B32)
- **Coverage metric**: 32 / 32 closed — **ALL GAPS COVERED across 5 runs**
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
| high | G33 — The template as a system: shared module (palette/rig/scaffolding) + parametric reusable equipment components (compressor, fan, coil) — architecture proposal (run 6) | corpus + web | queued (run 6) |
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

**RUN 4 gaps complete** (G22-G28, all covered). **RUN 5 COMPLETE** (G29-G32 — HVAC domain,
dashboards, terrain, buildings/BIM) — G29 (B29), G30 (B30), G31 (B31), and G32 (B32, this
iteration) all covered. Backlog exhausted: 0 open gaps of any status. **This closes the
research-SDD run set: 32/32 gaps across 5 runs, no further iterations pending.**

## Blocked gaps (each tagged with what it needs)

- (none — all gaps are docs/web/local-file investigable)

## Stop control (primary = read-only-investigable exhaustion, METHODOLOGY §8)

- **Open gaps — read-only investigable**: 0 (G32 closed this iteration; backlog exhausted). Budget cap runs 4-5: +14 blocks (B22-B35), used 11 (B22-B32), cap not exceeded. Execution: ORCHESTRATED-AUTO (one fresh sub-agent per iteration; driver gatekeeps via §11 self-reports). **RUN 5 STOP: investigable=0.**
- **Open gaps — requires-execution**: 0
- **Open gaps — blocked**: 0
- Consecutive iterations with empty backlog (secondary): 0/2
- Budget cap (safety net): run 1 = 12 blocks (fired). **Run 2 (reopen): +7 blocks (B13-B19).**

## Pre-flight source existence (BOOTSTRAP e2)

- Local prototypes: **25 HTML — 7 realistic at root + 18 voxel in `voxel/`** (recount 2026-07-04, §14 correction of the bootstrap's 8+15 miscount). `[CERT]`
- Post-research addition (2026-07-04, after run-5 STOP): +2 new voxel files (`voxel/campus-hvac-voxel.html`, `-v2`) — house template (r0.160.0, InstancedMesh, animated fan groups). Corpus counts in blocks reflect the 25 known at research close; fixes pipeline covers 27.
- context7 `/mrdoob/three.js` — resolved 2026-07-04, 21,432 snippets, High reputation. `[CERT-web]`
- threejs.org docs/manual + migration guide (GitHub wiki) — web access permitted by user this run.
- All 14 gaps have confirmed reachable sources → investigable.
