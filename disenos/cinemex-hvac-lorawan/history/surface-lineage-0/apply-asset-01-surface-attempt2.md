# SDD Apply — Asset 01 SURFACE correction attempt 2

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, correction attempt 2  
**Mode:** Strict TDD  
**Boundary:** correction of shell-owned procedural graphics and proxy surface evidence only. Accepted geometry, materials and canonical network topology remain unchanged. No LIGHTING-CAMERA work, later asset, self-review, commit or PR.

## Correction implemented

- Added a fail-fast placement contract for all atlas planes: finite world-root transforms, target-bounded dimensions, valid architecture/labels parents and visibility-only frame/layer switching.
- Removed the order-dependent occlusion path by keeping atlas batches opaque with depth writing enabled. Frame 0/1 and labels on/off now retain identical scene coverage.
- Expanded the single shared 1024² atlas with three distinct menu cues per frame and dedicated abstract auditorium screen tiles, while retaining generic/protected-content-safe graphics.
- Added restrained facade panel/concrete variation, coherent joints, glass safety markers, pulls, locks, thresholds and clearer portal seals.
- Added proxy-level auditorium acoustic rhythm, aisle edges, sparse non-tiling carpet breakup, portal/service/exit marks, and removed the obsolete WC VOID card.
- Added varied lobby/concession POS and snack cues plus kitchen stainless workline, extraction, cabinet/service marks. Reframed kitchen and Sala 3 evidence without entering the lighting pass.
- Added roof flashing/service bands and restrained arrowheads on existing RS-485, LoRaWAN and Ethernet media. Canonical links and endpoint topology were not changed.
- Made kitchen TC05/UC-D/BUS-D evidence labels camera-relative and bounded; unrelated diagnostic labels remain suppressed.

## Strict TDD and verification

| Evidence | Result |
|---|---|
| Initial attempt-2 RED | Placement validator, WC VOID removal and Sala 3 camera contract failed as expected |
| Kitchen evidence REDs | Two camera contracts failed before each evidence reframe |
| Focused regression | 56/56 |
| Full regression | 87/87 — `runs/assets/01-shell-circulation-facade/surface-attempt2.tests.txt` |
| Syntax | PASS — `runs/assets/01-shell-circulation-facade/surface-attempt2.syntax.txt` |
| Browser smoke | PASS, seven checks, zero issues |
| Runtime invariants | 63 bounded placements; stable placement fingerprint; label/frame toggles visibility-only |
| Probe | WebGL2; 212 draws; 35,000 triangles; 7 MB heap; within 550 / 750,000 budgets |
| Captures | 14 captures, 14/14 clean console/network sidecars |

SwiftShader reports 1 FPS from four sparse samples; FPS is informational under the gate contract. Draw calls and geometry remain well inside the office-computer budgets, with one reusable atlas and deterministic disposal.

## Evidence set

`runs/assets/01-shell-circulation-facade/surface-attempt2.capture-manifest.json` records:

- identical-camera frame 0/1 pairs for concessions, corridor and Sala 3;
- corridor labels-on/off coverage evidence;
- facade, lobby, kitchen, grazing and roof-service details;
- UG67 and complete-network engineering states;
- clean console/network sidecars for every capture.

Mechanical evidence is in `runs/assets/01-shell-circulation-facade/surface-attempt2.mechanical.json`.

## Handoff

SURFACE correction attempt 2 is mechanically ready for a fresh blind pixel-only review. No visual score or self-verdict is asserted. SURFACE remains locked until that review passes; LIGHTING-CAMERA and every later pass remain locked.
