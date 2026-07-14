# BLOCKOUT Lineage 1 — Silhouette Reset 1

**Change:** `cinemex-hvac-lorawan`  
**Asset:** `shell-circulation-facade`  
**Pass:** BLOCKOUT, lineage 1 attempt 1  
**Mode:** Strict TDD / design3d HEAVY  
**Gate state:** Mechanical evidence complete; fresh blind visual review pending. No later pass was started.

## Lineage boundary

The original BLOCKOUT lineage is closed after three failed reviews at 0.54, 0.77 and 0.75. Its 71 evidence/review files and three apply reports were moved intact outside the active run namespace:

- `history/blockout-lineage-0/MANIFEST.md`
- `history/blockout-lineage-0/assets/`
- `history/blockout-lineage-0/apply-asset-01-blockout*.md`

This work is **Silhouette Reset 1, lineage 1 attempt 1**. It is not an implicit fourth retry.

## Substantial BLOCKOUT reset

| Reset requirement | Lineage 1 implementation |
|---|---|
| One-view 4+4 multiplex grammar and categorical 2/4/2 families | Added overview billboards for rooms 1–8 in stable 4+4 order with repeated mirrored `L/M/M/S` tags and a separate cyan `REAR SERVICE` strip. Existing large/medium/small proxy families remain flat blockout masses. |
| Countable technical inventory without oversized devices | Kept the 14 TC300, four UC100 and UG67 geometries at true scale; added camera-facing halo labels for every device, UG67, all six external endpoints and RS-485 groups A–D. |
| Spatially legible front-of-house sequence | Reshaped lobby/tickets, concessions, kitchen and checkpoint as separated silhouettes with overhead labels. The checkpoint proxy is split around a true 2.4 m open access gap. |
| Unmistakable Sala 3 evidence | The dedicated camera exposes the full screen plane, both complete seating banks, continuous center aisle and bounded empty wheelchair bay. Overview room labels are hidden only in this camera; the `WC VOID` marker and technical labels remain camera-readable. |
| Exact media semantics with less central overlap | RS-485 stays continuous green bus routing with group IDs; LoRaWAN remains dashed blue and physically wireless through separated route lanes; Ethernet/Internet remains continuous blue. No TC300-to-UG67 shortcut was introduced. |
| Useful facade/circulation evidence | Added a low three-quarter grazing camera with roof hidden for the supplemental architecture capture. The complete-network camera was triangulated to retain the building and every external client node/label in frame. |

All scene additions remain temporary BOX/line/sprite BLOCKOUT proxies. No structural, materials, surface, lighting, interaction, animation or simulation pass work was started.

## Strict TDD evidence

| Work unit | RED | GREEN / TRIANGULATE |
|---|---|---|
| Reset silhouette contracts | New architecture tests failed because overview billboards, FOH gap metadata and distributed media/external positions did not exist. | Pure-plan and scene tests now assert 14 architecture labels, 29 technical labels, open checkpoint access and exact media inventories. |
| Camera-specific evidence visibility | New tests failed because the application did not forward the selected evidence camera and labels had no visibility scope. | `setEvidenceCamera` now hides overview labels for Sala 3, exposes only the WC marker there, and preserves technical labels. |
| Reset cameras | New shell tests failed against the old grazing and complete-network presets. | Grazing now provides a low facade/circulation three-quarter; complete-network uses a 50° framing and shifted target so every external client fits. |
| Browser resize reliability | Browser smoke repeatedly failed the DPR/canvas height assertion because resize measurement ran before the CSS grid settled. | The window resize handler now coalesces measurement after two animation frames while retaining `ResizeObserver`, and cancels the pending frame on disposal. |

## Mechanical verification

| Evidence | Exact result |
|---|---|
| Full scoped suite | `npm run test:cinemex`: exit 0; **53 tests, 53 pass, 0 fail**. |
| Syntax | `node --check` over the changed application and smoke modules: exit 0. |
| Browser runtime | Browser smoke: **PASS** over local HTTP; all six runtime checks pass; `issues: []`. |
| Probe | WebGL2/SwiftShader: **88 draws, 6,448 triangles, 98 sampled frames, 6 MB heap**; budgets 550 / 750,000 respected. FPS 11 is informational under software rendering. |
| Canonical evidence | Ten required view/state captures; all ten matching console sidecars are clean. |
| Supplemental evidence | One grazing architecture capture; its console sidecar is clean. |

## Evidence namespace

`runs/assets/01-shell-circulation-facade/`

- `blockout-attempt1.probe.json`
- `blockout-attempt1.mechanical.json`
- `blockout-attempt1.png` plus nine named canonical view/state captures
- `blockout-attempt1-grazing-architecture.png`
- eleven matching `*.console.json` sidecars

No lineage 1 review JSON or visual verdict was authored by the modeler.

## Rollback and locked boundary

Rollback this reset through the lineage-1 billboard/FOH/media changes in `src/scene/architecture.js`, camera changes in `src/controllers/camera.js`, runtime resize handling in `src/scene/runtime.js`, application visibility wiring in `main.js`, their tests, and lineage-1 evidence only. Do not remove or rewrite `history/blockout-lineage-0/`.

The only valid next action is a fresh blind review of the saved lineage 1 attempt 1 pixels. Task completion and every later design3d pass remain locked until that independent review returns PASS.
