# Three.js library (HVAC voxel→realistic pipeline) — Research State

> Operational state consumed by the loop (Research-SDD). Mirrored in engram
> (`research/three.js/gaps`, `research/three.js/progress`). Visible and versionable source.
>
> **Angle**: Three.js as the library powering the team's HVAC prototyping pipeline —
> voxel-art first pass, realistic PBR second pass. Research covers the subsystems the
> pipeline uses (instancing, PBR materials, lighting/IBL, shadows, color management,
> cameras/controls, procedural geometry/textures, versioning) — not the whole library.

## Coverage

- **Covered blocks**: 0
- **Coverage metric**: 0 / 14 closed
- **Last iteration**: — (bootstrap 2026-07-04)

## Gap-backlog (prioritized)

| Priority | Gap | Artifact type / source | Status |
|---|---|---|---|
| high | G1 — Baseline: how the prototype corpus uses three.js (versions, load styles, shared scaffolding) | local HTML prototypes + context7 | pending |
| high | G2 — InstancedMesh & voxel-scale rendering: API contract, limits, vs merged geometry | context7 + web + prototypes | pending |
| high | G3 — PBR material system: MeshStandardMaterial vs MeshPhysicalMaterial, param semantics | context7 + prototypes | pending |
| high | G4 — Lighting & environment: light types, IBL via PMREMGenerator+RoomEnvironment vs HDR files | context7 + prototypes | pending |
| high | G5 — Shadows: map types, shadow-camera tuning, cost model, artifacts (acne/bias) | context7 + prototypes | pending |
| medium | G6 — Color management & tone mapping: SRGBColorSpace, ACESFilmic, r152 migration | context7 + web | pending |
| medium | G7 — Cameras & controls: fake-isometric low-FOV vs true OrthographicCamera; OrbitControls | context7 + prototypes | pending |
| medium | G8 — Geometry toolkit for realistic modeling: Cylinder/Torus/Extrude/Lathe, BufferGeometry | context7 + prototypes | pending |
| medium | G9 — Procedural texturing: CanvasTexture technique, texture settings, vs image textures | context7 + prototypes | pending |
| medium | G10 — Migration & versioning: r128→r160 breaking changes, CDN strategies, legacy upgrade path | web (migration guide) + prototypes | pending |
| low | G11 — Post-processing upgrade path: EffectComposer, bloom, SSAO (absent today) | context7 | pending |
| low | G12 — Performance: draw calls, renderer.info, instancing benchmarks, pixel-ratio caps | context7 + web | pending |
| low | G13 — Asset pipeline beyond procedural: GLTF import/export, DCC handoff | context7 + web | pending |
| high (terminal) | G14 — SYNTHESIS: team workflow doc — voxel-first → realistic-second pipeline | corpus blocks + prototypes | pending (write LAST, after research) |

## Iteration history

| # | Date | Gap closed | Block | Delegated? · model tier | New gaps uncovered |
|---|---|---|---|---|---|

## Blocked gaps (each tagged with what it needs)

- (none — all gaps are docs/web/local-file investigable)

## Stop control (primary = read-only-investigable exhaustion, METHODOLOGY §8)

- **Open gaps — read-only investigable**: 14
- **Open gaps — requires-execution**: 0
- **Open gaps — blocked**: 0
- Consecutive iterations with empty backlog (secondary): 0/2
- Budget cap (safety net): max-blocks 12 this run (G14 synthesis included)

## Pre-flight source existence (BOOTSTRAP e2)

- Local prototypes: 8 realistic HTML at root + 15 voxel HTML in `voxel/` — confirmed present (ls 2026-07-04). `[CERT]`
- context7 `/mrdoob/three.js` — resolved 2026-07-04, 21,432 snippets, High reputation. `[CERT-web]`
- threejs.org docs/manual + migration guide (GitHub wiki) — web access permitted by user this run.
- All 14 gaps have confirmed reachable sources → investigable.
