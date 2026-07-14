# SDD Apply — Asset 01 MATERIALS attempt 2

**Asset:** shell-circulation-facade  
**Pass:** MATERIALS, lineage 1, attempt 2  
**Correction source:** blind attempt-1 FAIL 0.67 (`refine-code`)  
**Mode:** Strict TDD  
**Boundary:** material-realism reset only. No surface graphics, final lighting-camera pass, later asset implementation, visual verdict, commit or PR.

## Correction implemented

- Recalibrated the shell palette under a neutral response rig: broad rough concrete, moderately matte warm-white coated walls, distinct charcoal roofs, and near-binary metalness throughout.
- Changed Cinemex red to dielectric painted metal with controlled physical clearcoat/specular response rather than matte-plastic shading.
- Changed facade glass to a visible blue-gray physical transmission response and mapped entrance mullions, portals and sign supports to opaque charcoal; marquee supports now share the red painted-metal system.
- Added five tiny pooled procedural `DataTexture` response maps for concrete, tile and carpet roughness/normal variation. They contain no graphics, branding or decorative surface content.
- Increased glossy public-tile response and lifted the burgundy-black carpet/acoustic range so corridor and auditorium floors do not collapse to black.
- Added only a neutral RoomEnvironment PMREM and restrained facade fill for PBR calibration. Authored/final lighting remains locked.
- Preserved low-opacity HVAC zone baselines instead of forcing them to shell cutaway opacity; moved all billboards to the semantic labels layer and scoped material look-dev labels to the relevant UC100/UG67/bus anchors.
- Kept later-owned concession, kitchen, waiting, ticket and checkpoint blockout proxies on neutral pooled placeholders. Their final materials remain deferred.
- Reframed grazing evidence to include facade glass, red marquee, charcoal frames, coated wall and slab. Added a deterministic top-oblique finish-comparison camera for public tile versus corridor/auditorium carpet.

## Verification

| Evidence | Result |
|---|---|
| Material reset RED | 54 focused tests: 46 pass, 8 fail |
| Material reset GREEN | 54/54 |
| Finish-camera RED → GREEN | 0/1 → 1/1 |
| Full regression | 81/81 — `runs/materials-attempt2.tests.txt` |
| Syntax | PASS — `runs/materials-attempt2.syntax.txt` |
| Browser smoke | PASS, six checks, zero issues |
| Probe | WebGL2; 164 draws; 22,344 triangles; 8 MB heap; within 550 / 750,000 budgets |
| Look-dev captures | Nine clean captures across neutral, grazing, reference-match, facade and finish comparison |
| Console | 9/9 canonical capture sidecars clean |

SwiftShader reports 1 FPS after PMREM plus physical transmission; FPS is informational under the gate contract. Draws, triangles and heap remain comfortably inside the deterministic office-computer budgets.

## Evidence preservation and handoff

All six attempt-1 PNGs, sidecars, mechanical report and blind review remain preserved. Attempt-2 evidence is recorded in `materials-attempt2.mechanical.json` and `materials-attempt2.capture-manifest.json`.

The next action is a fresh blind pixel-only MATERIALS review. No score or self-verdict is asserted, and SURFACE plus every later pass remain locked.
