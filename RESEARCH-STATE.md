# Three.js library (HVAC voxel→realistic pipeline) — Research State

> Operational state consumed by the loop (Research-SDD). Mirrored in engram
> (`research/three.js/gaps`, `research/three.js/progress`). Visible and versionable source.
>
> **Angle**: Three.js as the library powering the team's HVAC prototyping pipeline —
> voxel-art first pass, realistic PBR second pass. Research covers the subsystems the
> pipeline uses (instancing, PBR materials, lighting/IBL, shadows, color management,
> cameras/controls, procedural geometry/textures, versioning) — not the whole library.

## Coverage

- **Covered blocks**: 7 (B1-B7)
- **Coverage metric**: 7 / 15 closed
- **Last iteration**: 2026-07-04 — G7 cameras & controls closed (B7)

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
| medium | G8 — Geometry toolkit for realistic modeling: Cylinder/Torus/Extrude/Lathe, BufferGeometry | context7 + prototypes | pending |
| medium | G9 — Procedural texturing: CanvasTexture technique, texture settings, vs image textures | context7 + prototypes | pending |
| medium | G10 — Migration & versioning: r128→r160 breaking changes, CDN strategies, legacy upgrade path | web (migration guide) + prototypes | pending |
| low | G11 — Post-processing upgrade path: EffectComposer, bloom, SSAO (absent today) | context7 | pending |
| low | G12 — Performance: draw calls, renderer.info, instancing benchmarks, pixel-ratio caps | context7 + web | pending |
| low | G13 — Asset pipeline beyond procedural: GLTF import/export, DCC handoff | context7 + web | pending |
| low | G15 — BatchedMesh: availability in r160, API, fit for multi-geometry realistic scenes (NEW, from B2) | context7 + web | pending |
| high (terminal) | G14 — SYNTHESIS: team workflow doc — voxel-first → realistic-second pipeline | corpus blocks + prototypes | pending (write LAST, after research) |

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

## Blocked gaps (each tagged with what it needs)

- (none — all gaps are docs/web/local-file investigable)

## Stop control (primary = read-only-investigable exhaustion, METHODOLOGY §8)

- **Open gaps — read-only investigable**: 8
- **Open gaps — requires-execution**: 0
- **Open gaps — blocked**: 0
- Consecutive iterations with empty backlog (secondary): 0/2
- Budget cap (safety net): max-blocks 12 this run (G14 synthesis included)

## Pre-flight source existence (BOOTSTRAP e2)

- Local prototypes: 8 realistic HTML at root + 15 voxel HTML in `voxel/` — confirmed present (ls 2026-07-04). `[CERT]`
- context7 `/mrdoob/three.js` — resolved 2026-07-04, 21,432 snippets, High reputation. `[CERT-web]`
- threejs.org docs/manual + migration guide (GitHub wiki) — web access permitted by user this run.
- All 14 gaps have confirmed reachable sources → investigable.
