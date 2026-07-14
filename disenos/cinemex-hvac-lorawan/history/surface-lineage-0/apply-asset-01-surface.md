# SDD Apply — Asset 01 SURFACE attempt 1

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, attempt 1  
**Mode:** Strict TDD  
**Boundary:** shell-owned procedural graphics and meso surface detail only. No final lighting-camera work, later asset, self-review, commit or PR.

## Implementation

- Added one deterministic 1024² CanvasTexture atlas with banner-aware packing, sRGB color space, mipmaps, bounded 4× anisotropy and idempotent disposal.
- Reused that atlas through six merged geometry batches for the readable dimensional `Cinemex` sign, room/exit/service/RS-485 plates, two abstract poster frames and two menu-display frames.
- Added restrained instanced shell details: facade panel joints, glass safety bands, pull hardware, acoustic portal seals, tile expansion joints, corridor carpet chevrons, roof seams, sleeve curbs and containment markings.
- Added canonical `poster_frame=0|1` and `display_frame=0|1` query state. Both serialize in fixed order and drive reversible surface batch visibility.
- Preserved label-layer suppression. Surface-facing facade/lobby/concession/corridor views suppress legacy diagnostic billboards so the atlas details remain readable; engineering and device-specific presets retain useful technical labels.
- Added repeated auditorium acoustic-panel rhythm and paired abstract screen content driven by the same deterministic display frame state.
- All poster/menu/screen imagery is generated from abstract shapes and generic text; no external texture or protected film content is used.

## Strict TDD and verification

| Evidence | Result |
|---|---|
| Initial SURFACE RED | Missing surface module, frame state and pass integration failed as expected |
| Wordmark visual RED → GREEN | Banner allocation now preserves a readable atlas aspect |
| Label-visibility RED → GREEN | Surface evidence cameras no longer receive unrelated diagnostic billboard clutter |
| Focused regression | 55/55 |
| Full regression | 86/86 — `runs/surface-attempt1.tests.txt` |
| Syntax | PASS — `runs/surface-attempt1.syntax.txt` |
| Browser smoke | PASS, six checks, zero issues |
| Probe | WebGL2; 191 draws; 29,396 triangles; 8 MB heap; within 550 / 750,000 budgets |
| Captures | 14 captures, 14/14 clean console/network sidecars |

SwiftShader reports 1 FPS; FPS remains informational under the gate contract. The atlas and five additional visible merged graphic batches keep draw and triangle utilization safely inside the office-computer budget.

## Evidence set

`runs/assets/01-shell-circulation-facade/surface-attempt1.capture-manifest.json` records the required facade, lobby, concessions, kitchen, corridor, Sala 3 and UG67 views plus:

- poster/menu frame 0 and frame 1 pairs;
- labels on/off corridor evidence;
- architectural and engineering network states;
- grazing facade detail;
- roof seam/curb detail.

Mechanical evidence is in `runs/assets/01-shell-circulation-facade/surface-attempt1.mechanical.json`.

## Handoff

SURFACE attempt 1 is mechanically ready for a fresh blind pixel-only review. No visual score or self-verdict is asserted. LIGHTING-CAMERA and every later pass remain locked.
