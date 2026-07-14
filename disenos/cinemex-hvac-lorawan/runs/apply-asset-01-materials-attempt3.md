# SDD Apply — Asset 01 MATERIALS attempt 3

**Asset:** shell-circulation-facade  
**Pass:** MATERIALS, lineage 1, final attempt 3  
**Correction source:** blind attempt-2 FAIL 0.77 (`refine-code`), all criticals already passing  
**Mode:** Strict TDD  
**Boundary:** material response and diagnostic look-dev evidence only. No geometry, graphics, SURFACE, final lighting-camera work, self-verdict, commit or PR.

## Final response correction

- Added a subtle pooled concrete micro-normal response and broadened its deterministic roughness breakup while keeping the concrete dielectric and matte.
- Tightened the warm-white coated-wall highlight through lower base roughness and a moderate smooth clearcoat, separating it from concrete without changing geometry or base identity.
- Reduced the red painted-metal clearcoat/specular intensity and broadened its lobe. The material remains dielectric, near-zero metalness and has no emissive channel.
- Increased blue-gray facade-glass transmission and environment contrast while preserving opaque charcoal mullions and all accepted facade geometry.
- Increased public-tile clearcoat/environment response and reduced its roughness; carpet moved to near-fully matte response with minimal environment intensity.
- Replaced the procedural response maps with pooled 16×16 material-only data and added one concrete normal map. No decorative or semantic graphic content was introduced.
- Added a reversible look-dev calibration hook: only the `grazing` evidence camera receives lower exposure and a raking key angle; every other camera restores the prior neutral values. This is diagnostic evidence, not final lighting.
- Reframed the supplemental floor evidence at a lower angle to compare the bright public finish and matte carpet boundary without modifying geometry.

## Verification

| Evidence | Result |
|---|---|
| Response RED | 25 focused tests: 21 pass, 4 fail |
| Response GREEN | 25/25 |
| Full regression | 82/82 — `runs/materials-attempt3.tests.txt` |
| Syntax | PASS — `runs/materials-attempt3.syntax.txt` |
| Browser smoke | PASS, six checks, zero issues |
| Probe | WebGL2; 164 draws; 22,344 triangles; 8 MB heap; within 550 / 750,000 budgets |
| Look-dev captures | Nine captures: neutral, grazing, reference, floor, facade and architecture/engineering state evidence |
| Console | 9/9 canonical capture sidecars clean |

SwiftShader reports 1 FPS; FPS remains informational under the gate contract. Draw, triangle and heap evidence is unchanged and safely inside budget.

## Preservation and handoff

Attempt-1 and attempt-2 PNGs, sidecars, reviews, mechanical manifests and reports remain preserved. Attempt-3 evidence is recorded in `materials-attempt3.mechanical.json` and `materials-attempt3.capture-manifest.json`.

The next action is the final fresh blind pixel-only MATERIALS review. No self-verdict is asserted, and SURFACE plus every later pass remain locked.
