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
| 2 | Voxel stage (instancing, isometric look) | 2 | active | The voxel-art first-pass techniques |
| 3 | Realistic stage (PBR, IBL, shadows, color) | — | planned | The realistic second-pass techniques |
| 4 | Cross-cutting (perf, migration, upgrade paths) | — | planned | Versioning, performance, postprocessing |
| 5 | Synthesis: team workflow | — | planned | Voxel-first → realistic-second pipeline doc (G14, terminal) |

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

---

## Pending (gap-backlog)

> Readable mirror of `RESEARCH-STATE.md`. Consumed by the loop to pick the next gap.

- [x] G1 — Baseline: how the prototype corpus uses three.js → [Block 1]
- [x] G2 — InstancedMesh & voxel-scale rendering → [Block 2]
- [ ] (high) G3 — PBR material system
- [ ] (high) G4 — Lighting & environment (IBL)
- [ ] (high) G5 — Shadows
- [ ] (medium) G6 — Color management & tone mapping
- [ ] (medium) G7 — Cameras & controls
- [ ] (medium) G8 — Geometry toolkit for realistic modeling
- [ ] (medium) G9 — Procedural texturing
- [ ] (medium) G10 — Migration & versioning
- [ ] (low) G11 — Post-processing upgrade path
- [ ] (low) G12 — Performance
- [ ] (low) G13 — Asset pipeline beyond procedural
- [ ] (low) G15 — BatchedMesh evaluation (NEW, from B2)
- [ ] (high, TERMINAL) G14 — SYNTHESIS: team workflow doc (voxel → realistic)

## Non-investigable gaps (without lab / hardware / NDA)

- (none)

## Estimated coverage

2/15 gaps closed — baseline (B1) + voxel instancing (B2); PBR materials next.
