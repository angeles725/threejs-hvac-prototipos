# SDD Apply — Asset 01 SURFACE Reset 1, correction attempt 2

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, attempt 2  
**Mode:** Strict TDD  
**Boundary:** the three arrowhead-only corrections admitted by the attempt-1 blind review. No route, endpoint, device, label, architectural, material, lighting-camera, later-pass, commit, or PR change.

## Root cause and correction

Attempt 1 rendered one arrow per route, but the fixed world-space cone size made the amber annotations visually dominant and apparently detached in the canonical UG67 and complete-network views. Attempt 2 makes the marker a camera-aware annotation while preserving the network model:

- The cone **base** is the sampled route point; camera scaling moves the cone centre along its full 3D tangent so base contact remains exactly `0 m`.
- Each of the nine route components owns exactly one marker and the cone axis follows the local 3D curve tangent.
- Marker length is normalized to a 20 CSS-pixel target, bounded to 16–24 CSS pixels in both canonical engineering cameras.
- Projected geometry is checked from actual cone vertices; duplicate routes and overlapping visible markers fail the browser contract.
- LoRa samples `[0.48, 0.62, 0.79, 0.90]` land inside the rendered 55% portion of each seven-cell dash pattern. This prevents a mathematically attached base from landing in a visual gap.

## Strict TDD evidence

| Cycle | RED | GREEN |
|---|---|---|
| Camera-aware marker contract | `runs/surface-attempt2-red.log`, `runs/surface-attempt2-integration-red.log` | `runs/surface-attempt2-pure-green.log`, `runs/surface-attempt2-focused-green.log` |
| Rendered-dash contact | `runs/surface-attempt2-dash-contact.red.log` | `runs/surface-attempt2-dash-contact.green.log` |
| Canonical non-overlap stagger | `runs/surface-attempt2-dash-overlap.red.log`, `runs/surface-attempt2-dash-stagger.red.log` | `runs/surface-attempt2-dash-stagger.green.log` and final browser smoke |
| Full regression | — | 94/94 in `runs/assets/01-shell-circulation-facade/surface-attempt2.tests.txt` |
| Syntax | — | PASS for the five touched source/test/harness files |

Final browser smoke passes 10 checks with zero issues. Runtime canonical metrics:

- UG67: 9 markers / 9 routes, contact PASS, 3D tangent PASS, 19.05–21.51 CSS px, 0 visible overlaps.
- Complete network: 9 markers / 9 routes, contact PASS, 3D tangent PASS, 19.42–20.35 CSS px, 0 visible overlaps.
- Scene integrity: 75 non-generated and 49 generated objects per diagnostic pair, with only intended surface/label objects changing.

## Canonical evidence

- 14 PNGs at 2752×2544 with 14/14 clean console sidecars.
- Twelve architectural PNGs are byte-identical to attempt 1; only `ug67-engineering` and `engineering-network` changed.
- Manifest: `runs/assets/01-shell-circulation-facade/surface-attempt2.capture-manifest.json`
- SHA-256: `runs/assets/01-shell-circulation-facade/surface-attempt2.sha256.json`
- Mechanical summary: `runs/assets/01-shell-circulation-facade/surface-attempt2.mechanical.json`
- Browser smoke: `runs/assets/01-shell-circulation-facade/surface-attempt2.browser-smoke.json`
- Pixel/live stability: `runs/assets/01-shell-circulation-facade/surface-attempt2.pixel-stability.json`
- Probe: `runs/assets/01-shell-circulation-facade/surface-attempt2.probe.json`

The WebGL2 probe reports 212 draws and 35,000 triangles, below the 550 / 750,000 budgets. SwiftShader's sparse 1 FPS sample remains informational under the gate contract.

## Work-unit and rollback evidence

Touched implementation boundary:

- `src/scene/surfaces.js`
- `src/scene/architecture.js`
- `main.js`
- `qa/browser-smoke.mjs`
- `tests/surfaces.test.mjs`

Rollback is atomic: restore those five paths to the attempt-1 state and remove only `surface-attempt2-*` plus this report. Attempt-1 review and all lineage history remain preserved. The route and endpoint topology is unchanged.

## Blind-review handoff

Inspect each current PNG individually at original resolution. Attempt 2 is mechanically ready for a fresh blind SURFACE review. It does not assert a visual score or self-verdict; SURFACE remains `failed(1)` and all later passes remain locked until independent review.
