# SDD Apply — Asset 01 MATERIALS attempt 1

**Asset:** shell-circulation-facade  
**Pass:** MATERIALS, lineage 1, attempt 1  
**Prerequisite:** STRUCTURAL attempt 3 PASS 0.82  
**Mode:** Strict TDD  
**Boundary:** PBR material assignment only. No surface graphics/textures, authored lighting-camera pass, later asset implementation, visual verdict, commit or PR.

## Gate transition

The STRUCTURAL gate was closed before material work. `runs/structural-gate-close.md` records deletion of only superseded attempt-1/2 PNGs and console sidecars; all passing attempt-3 evidence and audit artifacts remain.

## Material implementation

- Added the DesignSpec material table as a frozen shared registry with near-binary metalness: coated/dielectric values are 0–0.02 and bare metals are 0.95.
- Applied warm-white and charcoal shell paint, concrete slab/roof, Cinemex-inspired red paint, physical transmission glass, glossy lobby tile, acoustic fabric, dark carpet, burgundy seating, stainless kitchen equipment and galvanized containment/frames.
- Added only thin material-owned lobby, corridor and auditorium finish plates. Accepted structural massing and openings are unchanged.
- Reused one material per canonical/dynamic key across instanced buckets; aliases reference the same object and each unique material is disposed once.
- Engineering mode applies reversible `opacity=0.18` and `depthWrite=false` to registered shell materials while network media remain distinct and emissive.
- Added deterministic `material_state=neutral` query support plus DesignSpec neutral, grazing and reference-match cameras. Family-master and rear-technical presets received camera-only reframing.
- No external or downloaded textures were introduced; signage and procedural surface graphics remain deferred to SURFACE.

## Verification

| Evidence | Result |
|---|---|
| Focused RED | 18 tests: 9 pass, 9 fail |
| Focused GREEN | 21/21 |
| Full regression | 77/77 — `materials-attempt1.tests.txt` |
| Syntax | PASS — `materials-attempt1.syntax.txt` |
| Browser smoke | PASS, six checks, zero issues |
| Probe | WebGL2; 152 draws; 22,600 triangles; 9 MB heap; within 550 / 750,000 budgets |
| Look-dev captures | Neutral, grazing and reference-match in architecture + engineering |
| Console | 6/6 capture sidecars clean |

SwiftShader reports 2 FPS after physical transmission and engineering transparency; FPS is informational under the gate contract. Deterministic draw, triangle and heap evidence remains comfortably within budget.

## Handoff

`materials-attempt1.mechanical.json` is the machine-readable evidence manifest. The next action is a fresh blind pixel-only MATERIALS review. No score or visual verdict is asserted, and SURFACE plus all later passes remain locked.
