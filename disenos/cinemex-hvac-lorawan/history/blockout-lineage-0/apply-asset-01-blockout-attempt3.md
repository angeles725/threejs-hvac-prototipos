# SDD Apply — Asset 01 BLOCKOUT Final Correction Evidence

**Change:** `cinemex-hvac-lorawan`  
**Task:** 3.1, asset `shell-circulation-facade`, BLOCKOUT attempt 3  
**Retry:** Final correction after attempt 2 scored 0.77 against a 0.78 gate  
**Mode:** Strict TDD / design3d HEAVY  
**Gate state:** Mechanical evidence complete; fresh blind visual review pending. No later pass was started.

## Bounded correction

The attempt 2 reviewer passed multiplex grammar, front-of-house sequence, network endpoints and the architecture/engineering state pair. This retry leaves those concepts intact and changes only auditorium-family categorization and evidence legibility.

| Required correction | Attempt 3 implementation |
|---|---|
| Make 2 large / 4 medium / 2 small proxies categorical rather than gradual. | Added repeated family profiles: large `24 m / 8.4 m / 7 tiers / 5.2 × 7.2 m screen`, medium `20 m / 6 m / 5 tiers / 3.9 × 5 m screen`, and small `16 m / 3.8 m / 3 tiers / 2.7 × 3.2 m screen`. Family roof/zone proxy extents use the same categorical dimensions. |
| Expose a continuous aisle and empty wheelchair notch in every auditorium. | Every bank is split continuously around a 1.2 m center aisle. The first two positive-side tier positions are omitted to create a truly empty 3.6 × 2.4 m bay, surrounded by a visible emissive U-outline with no center fill. |
| Widen Sala 3 and move the green route out of the screen field. | The final Sala 3 camera is centered on the room at high/wide blockout framing, showing the screen, both seating banks, continuous aisle and near wheelchair notch. UC100-B/C trunks were moved to the corridor edge at 0.22 m AFF with rear cabinet tails; drops descend to the low route rather than crossing the screen. |
| Add low-grazing evidence and improve technical framing. | Added the DesignSpec grazing preset/capture. Engineering-section focuses on the building/endpoints; complete-network preserves the entire external router/cloud/server/client chain while filling more of the frame than the failed trial. |

All geometry remains temporary BLOCKOUT proxy geometry using shared `BoxGeometry` and per-layer/color `InstancedMesh` buckets. No structural, material, surface, interaction, animation or simulation pass work was added.

## Strict TDD evidence

| Work unit | RED | GREEN / TRIANGULATE |
|---|---|---|
| Categorical family contract | New pure-plan tests failed because `proxyWidth`, `volumeHeight`, categorical screen sizes and the exact repeated 7/5/3 tier profiles did not exist. | Exact profile assertions pass for all 2/4/2 family members; family rendering consumes those same values. |
| Aisle and wheelchair negative space | New tests failed on missing `aisleGap.continuous` and `wheelchairBay.clear` contracts. | All eight proxies now declare a continuous aisle and clear bay; renderer skips two tier cells and draws only a U-outline. |
| Sala 3 route safety | New test failed because trunk B remained at `x=-15.3`, `y=2.8`. | Trunk B/C now follow `x=±4.85`, `y=0.22`; rear cabinet tails preserve UC100 connectivity. |
| Evidence cameras | New grazing/Sala 3/network framing tests and grazing query-state test failed against attempt 2 presets. | Added grazing vocabulary and explicit final framing/FOV. Two screenshot-driven triangulation cycles widened Sala 3 to 100° and restored a high complete-network angle that retains every external client. |

## Mechanical verification

| Evidence | Exact result |
|---|---|
| Focused architecture | `node tests/architecture.test.mjs`: 11/11 pass. |
| Focused shell/controller | `node tests/shell.test.mjs`: 11/11 pass. |
| Full scoped suite | `npm run test:cinemex`: exit 0; **48 tests, 48 pass, 0 fail**. |
| Syntax | `node --check` over every application `*.js` and `*.mjs`: exit 0. |
| Browser runtime | Browser smoke: PASS over local HTTP; all six runtime checks pass; `issues: []`. |
| Probe | WebGL2/SwiftShader: **55 draws, 6,348 triangles, 130 sampled frames, 7 MB heap**; budgets 550 / 750,000 respected. FPS 15 is informational under software rendering. |
| Canonical evidence | Ten required view/state captures, all console-clean with zero issues. |
| Supplemental evidence | One low-grazing architecture capture, console-clean with zero issues. |

## Evidence namespace

`runs/assets/01-shell-circulation-facade/`

- `blockout-attempt3.probe.json`
- `blockout-attempt3.mechanical.json`
- `blockout-attempt3.png` plus nine named canonical view/state images
- `blockout-attempt3-grazing-architecture.png`
- eleven matching `*.console.json` sidecars

Attempt 1 and 2 evidence and reviews remain preserved. No attempt 3 review JSON or visual verdict was authored by the modeler.

## Rollback and locked boundary

Rollback the final correction through the attempt-3 family-profile, negative-space, RS-485 route and camera/query changes in `src/scene/architecture.js`, `src/controllers/{camera,query-state}.js`, their tests, and attempt-3 evidence only. Do not remove the prior shell, attempt-1 or attempt-2 evidence.

This is the final BLOCKOUT correction retry. The only valid next action is a fresh blind review of the saved attempt 3 pixels. Task completion and every later design3d pass remain locked unless that independent review returns PASS.
