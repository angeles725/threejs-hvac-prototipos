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

The gate's two arms have DIFFERENT data readiness — a distinction investigador1's WU2 baseline
made precise, and it corrects an earlier over-broad "38.3% assumed Z" framing:

- **BOD (bottom-of-duct = the duct FLOOR / vertical position) is bound for 2015/2033 runs (~99%).**
- The **38.3%-by-length gap is vertical EXTENT (the duct TOP = height `h`), not position.** So the
  floor of every duct is known; the ceiling of 38.3%-by-length is not.

Consequences per arm:

1. **Clearance-BELOW a duct (the #1 HVAC question, "how much headroom under this run") uses BOD —
   data-ready NOW at 99%.** It is blocked only on an external **MECO / clearance datum** (structural
   ceiling / SMACNA spec / user input), not on our Z data.
2. **Run-to-run vertical CLASH needs both ducts' full extent (`bod`..`bod+h`); the TOP `h` is the
   missing piece** — so THIS arm is the one bounded by the height gap, and the gap **concentrates on
   the trunk** (the largest, most consequential ducts: trunk height coverage is the lowest, ~30%).
   Exact captured-height coverage is being reconciled by the team — the raw figure (~42% of runs by
   count, matching §13's 38.3% by length) is an UNDERCOUNT, because the viewer discards ~587m of
   *measured* height via a small-class collapse; the certified data carries more than the viewer
   shows. **So the gate must read the certified `L4-full.json`, never the viewer's collapsed
   geometry.** A vertical-clash verdict on an assumed top is inferred, not measured, and must be
   surfaced as such, never rendered as fact (§13 discipline). The current extractor is already
   §13-correct: unknown-height runs carry `h=None` (absent stays absent, never a fabricated default)
   — the gate must preserve that.
3. **Fittings carry no `bod`** in `L4-full.json`, so fitting-to-fitting clash at a node cannot be
   caught until fittings are meshed. Run-to-run is phase 1; fitting geometry is phase 2.

This is the same conclusion team A reached from the opposite direction: if the extractor's
fragmentation is by-design (H1 settled), **the real thing that gates a clash test is the assumed-Z
(38.3%)**. Independent confirmation from two tracks that **elevation fidelity, not run-length or
viewer polish, is the next real target.**

## Recommendation

- Port is **worth doing** and low-cost (2 MIT files + a ~60-line adapter).
- **Stage the two arms separately, by data readiness** (the BOD-vs-height split above):
  - **Clearance-below arm is data-ready NOW** (BOD ~99%). It ships as soon as a **MECO/clearance
    datum** is supplied — that is its only blocker, an external spec, not our Z data.
  - **Vertical run-to-run clash arm is height-bounded** and trunk-concentrated → land it as
    **advisory** (flag, don't block) on runs with a real measured `h`, and NEVER emit a clash verdict
    on an `h=None` run — skip it, don't assume a top. It graduates to blocking only when WU2's
    label→run height recovery closes the trunk gap with real labels.
- Read the certified `L4-full.json` (not the viewer's collapsed geometry, which discards ~587m of
  measured height).
