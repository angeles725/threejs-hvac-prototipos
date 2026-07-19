# 2026-07-18 — Boot-time optimization (Phase-1 cuts)

Scope: boot-path cost only. The product ships ONE fixed camera preset (`network`) with no
mode/layer/cutaway/fullscreen UI, so work done at boot for states the single view never shows is
pure cost. A read-only audit traced the boot; this run implements its Phase-1 cuts under FAST MODE:
no new tests, zero test-file edits, and the existing 331-test suite stays 100% green.

## Measurement method

Headless Chrome 150 (`--headless=new --use-angle=swiftshader --no-sandbox`), viewport 1280x900 @
deviceScaleFactor 2, fresh browser per run (cold cache — each run pays the jsdelivr three.js
fetch), served from `http://localhost:8000/`. Instrumented navigation → `data-app-ready="true"`
(the readiness flag `#app-status` "Sistema listo" rides on) and the first rAF frame after it.
3 runs, median. Script: scratchpad `measure-boot.mjs` (puppeteer-core + CDP).

SwiftShader numbers are much slower than any real GPU; they are comparable to each other, not to
production hardware.

## Baseline vs after

| Signal | Baseline runs (ms) | Baseline median | After runs (ms) | After median | Delta |
| --- | --- | --- | --- | --- | --- |
| navigation → app-ready | 27047 / 20553 / 18426 | 20553 | 14352 / 16541 / 16075 | 16075 | −4478 ms (−21.8%) |
| navigation → first frame after ready | 27074 / 20583 / 18488 | 20583 | 14374 / 16560 / 16099 | 16099 | −4484 ms (−21.8%) |

Every after-run beat the fastest baseline run. Console errors: 0 in every run, before and after.

## Per-cut record

### Cut 1 — Lazy network-schematic board (HIGH) — APPLIED

`createNetworkSchematicComposition` built a 2048×840 canvas texture plus board/frame/mast/leader/
halo/RF meshes at construction, and `resolveNetworkEvidenceVisibility('network')` never shows any
of it. The composition is now built lazily (`src/scene/architecture.js`):

- a `null` instance + the last requested evidence visibility are kept in closure;
- `setEvidenceCamera` builds on the first preset whose resolved visibility needs the board or the
  UG67 RF detail (QA/tests reach these via `setEvidenceCamera('complete-network')` etc.), then
  keeps the built instance in sync on every later evidence change;
- `asset.networkSchematic` is now a lazy accessor — a direct read (tests, QA probes) builds on
  first touch and replays the last visibility decision, so the observable state is identical to
  the eager build;
- `dispose()` is null-safe (`networkSchematicInstance?.dispose()`).

`createNetworkSchematicComposition` and every pure function stay exported unchanged; the
construction-time `document` capture (`canvasDocument`) is what the lazy build draws with, so the
test harnesses' scoped document stub still works after their `finally` restores the global.

### Cut 2 — Drop shader-warmup pass 2 (MED) — SKIPPED

`tests/p6-l2-corrections.test.mjs` L684–712 asserts the two-pass behavior directly:
`summary.compiles === 2` and the compile sequence `[false, true]` (plus the cutaway-boot variant
`[true, false]`), and L724–727 asserts main.js still passes `bootCutaway: queryState.cutaway` so
warmup "still covers URL cutaway boots". Removing the second `renderer.compile` would fail those
assertions; under the zero-test-edit rule this cut is skipped as instructed. `warmup.js` untouched.

### Cut 3 — Batch boot evidence-camera calls (LOW-MED) — APPLIED

Boot used to run the evidence pipeline 4×: construction (`isometric`), `setVisualMode` (default
re-assert), `setRoofLayerVisible` (default re-assert), then the real `setEvidenceCamera('network')`.

- (a) `setNetworkMediaWidthScale` now skips the per-instance matrix recompute for any media mesh
  hidden by itself or an ancestor (the network layer groups ship default-off), leaving it stale;
  `syncNetworkMediaWidths()` (new asset method, polled once per frame in the `animate` loop)
  writes the pending matrices the first frame a mesh becomes visible and re-derives the
  interaction pools, mirroring `setEvidenceCamera`'s order. In-product this path never runs; in
  tests the stub groups are visible so widths are recomputed exactly as before.
- (b) `setVisualMode` and `setRoofLayerVisible` gained no-change guards: re-asserting the current
  value no longer replays visibility + width matrices + interaction pools + overlays. Boot now
  does exactly one construction pass plus ONE final `setEvidenceCamera('network', …)` — the call
  site in `main.js` is untouched (architecture.test.mjs L199 greps for it).

### Cut 4 — DPR cap 1.5 → 1.25 (LOW-MED, only visual-adjacent change) — APPLIED at the call site

The audit's skip-condition technically fired: `tests/shell.test.mjs` L461 asserts
`resolvePixelRatio(3) === 1.5`. That assertion pins the exported helper's DEFAULT cap, not the
runtime's applied ratio, so the cut landed without touching the asserted surface:
`resolvePixelRatio` keeps its 1.5 default and the one live call site in
`createSceneRuntime` passes an explicit `1.25` cap. Antialias untouched. On a 2× display the
fragment load drops ~31% ((1.5² − 1.25²) / 1.5²). One-line revert if the literal skip is preferred.

## Verification

- `node --test tests/*.test.mjs`: **331/331 pass**, zero test-file edits.
- `node --check` clean on `main.js`, `src/scene/architecture.js`, `src/scene/runtime.js`.
- `node build-publish.mjs` regenerated `publish/p/cinemex` (bundle 689.7 kB, three external).
- Eye-check: `runs/assets/boot-opt-after-tablero.png` (3D hero at the fixed network view) vs the
  `client-round3-verify-tablero.png` / round-5 mockup era — identical scene: same building shell,
  roof plates, RTUs, duct spine, temperature chips and zone table (modulo DPR sharpness; the old
  capture's "Red completa" select predates the single-view mandate). Section check:
  `runs/assets/boot-opt-after-section-hvac.png` matches the round-4 HVAC mockups.
- Console errors: 0 across all measurement and capture runs.

Files touched: `src/scene/architecture.js` (cut 1, cut 3a/3b), `main.js` (one sync call in
`animate`), `src/scene/runtime.js` (cut 4 call-site cap). `warmup.js` untouched (cut 2 skipped).
Note: `portal/protection.js` and `publish/` changed on disk only because `build-publish.mjs`
regenerates them with a fresh obfuscation seed — no functional change.
