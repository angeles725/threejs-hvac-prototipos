# Proposal — a topology/clash GATE for `/design3d` (MEP capability gap)

Date: 2026-08-26 · Author: Orquestador1 (research delegated to a scoped subagent) · Status:
**STAGED PROPOSAL — not applied.** Per design3d SKILL Hard Rule 6 (never edit the kit mid-run;
propose, the user promotes), this document proposes a kit delta; it does not modify
`~/.claude/skills/design3d/`. Applying it is the user's decision.

## Why

The round-2 repo eval (`EVAL-repos-round2-2026-08-26.md`) found that a **clash/topology gate is
a genuine capability gap for MEP** and that scottstts's `geometry-quality-kit` (MIT) is the one
directly-reusable port on the whole new candidate list. This is the scoped integration plan.

## Provenance (license read at upstream, per Hard Rule 8)

| Field | Value |
|---|---|
| URL | `github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills` |
| Author | Scott Sun |
| License | **MIT** — confirmed by reading the repo-root `LICENSE` file directly (not a badge) |
| Commit sha | `1ad2171695a3594d282558a0d813ce336f11678b` (main, 2026-08-26) |
| Kit path | `skills/threejs-procedural-geometry/assets/geometry-quality-kit/` |

## What to vendor (only two files)

1. **`geometry-audit.js`** — `clashPass` (solid interpenetration via AABB → depth filter →
   Möller–Trumbore triangle-crossing count) + `coplanarPass` (z-fight / coplanar overlap).
2. **`geometry-contract.js`** — `boundsGapAlongAxis` / `boundsContains` for clearance/headroom,
   and `runGeometryContract` for duct invariants (zero three.js dependency).

**Do NOT vendor** `mesh-topology-audit.js` (loose/duplicate verts, non-manifold, signed volume):
those operate on the kit's abstract `MeshData`, not our three.js `BoxGeometry`, and box primitives
are always topologically correct — **zero MEP signal** until custom fitting-sweep geometry exists.

## Applicability to our data (`L4-full.json` runs[])

Each run is an oriented rectangular swept box: axis `p0→p1` (plan, metres), `w`×`h` profile, bottom
face at `bod`. Direct mapping to a three.js `BoxGeometry`.

| Check | Verdict | Use |
|---|---|---|
| `clashPass` (triangle-crossing) | **Direct** | Two ducts physically occupying the same space → the primary HVAC value. |
| `boundsGapAlongAxis` / `boundsContains` | **Direct** | Headroom/clearance: `bod` vs a ceiling/clearance plane. |
| `runGeometryContract` | **Direct** | Duct invariants (min BOD, aspect ratio, CFM/area proxy) on raw JSON, no scene. |
| `coplanarPass` (z-fight) | **Adaptable, ADVISORY** | Connected runs intentionally share faces; log, never gate. |
| topology (verts/manifold/volume) | **N/A / deferred** | Box primitives are always correct; revisit when fittings get real geometry. |

## Integration into GATES

- **Slot:** a **mechanical check (Gate step 1) at the structural pass** — topology/counts are in
  the "Test it" column of GATES.md's test-vs-render jurisdiction (a blind reviewer cannot count
  triangle crossings from a screenshot).
- **Mechanism:** a headless Node script `duct-clash-gate.mjs` (three.js geometry math runs in Node,
  no WebGL) builds boxes from `runs[]`, derives a `clashAllow` list from `nodes[]` adjacency (so
  connected runs don't false-positive), calls `auditGeometry`, exits nonzero on any clash.
- **Pass/fail contract:** PASS = `clash.length === 0` AND `clearanceViolations.length === 0`;
  z-fight pairs on the allow-list are advisory, never blocking.
- **`review.schema.json`:** add `mechanical.tests` (boolean gate: `fail == 0` required) plus a
  `mechanical.topology_clash` structured sidecar (`clash_pairs`, `clearance_violations`,
  `zfight_advisory`, `ok`).
- **Adapter cost:** ~60 lines (box build + Y-up angle mapping + allow-list generation). `three` is
  already a project dependency; no new dep.

## The blocking dependency — and why it converges with the extractor debate

The clash/clearance gate is **only as trustworthy as the Z data**, and two gaps bound it:

1. **38.3% of network length has an ASSUMED height (Z)** (`CRITIQUE-b16-roadmap.md` §13). A clash
   or clearance computed against an assumed elevation is itself inferred, not measured — it must be
   surfaced as such, never rendered as fact (the §13 discipline).
2. **Fittings carry no `bod`** in `L4-full.json`, so fitting-to-fitting clash at a node cannot be
   caught until fittings are meshed. Run-to-run clash is phase 1; fitting geometry is phase 2.
3. **No clearance threshold (MECO) in the data** — it must come from a project source (structural
   ceiling / SMACNA spec / user input) before the clearance arm can be calibrated.

This is the same conclusion team A reached from the opposite direction: if the extractor's
fragmentation is by-design (H1 settled), **the real thing that gates a clash test is the assumed-Z
(38.3%)**. Independent confirmation from two tracks that **elevation fidelity, not run-length or
viewer polish, is the next real target.**

## Recommendation

- Port is **worth doing** and low-cost (2 MIT files + a ~60-line adapter).
- But **stage it behind the Z resolution**: a clash gate shipped on 38.3%-assumed elevation would
  render convincing clash verdicts that assert less than they appear to — the exact failure this
  corpus exists to prevent. Activate the clearance arm only once MECO + a measured/assumed-Z policy
  are decided; the run-to-run clash arm can land first as **advisory** (flag, don't block) so it
  never over-claims on inferred Z.
