# SDD Apply — Runtime Shell (Task 2.1)

**Change:** `cinemex-hvac-lorawan`  
**Mode:** Strict TDD  
**Delivery:** `exception-ok`, accepted `size:exception`; no commit or PR created  
**Scope:** Runtime shell, query/camera/layer controllers and browser harness only. Cinemex architecture, furnishings, devices and network geometry remain intentionally absent; semantic scene groups are empty.

## Task state

- [x] 2.1 is complete. The unrestricted execution environment restored localhost socket binding and bundled Chromium/SwiftShader startup, and the mandatory real-browser runtime gate passed over a local HTTP server.

## TDD cycle evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `tests/shell.test.mjs` | Unit + static shell contract | `npm run test:cinemex` before shell edits: exit 0; 4 test files passed. | Test was written first; `node disenos/cinemex-hvac-lorawan/tests/shell.test.mjs` exited 1 with `ERR_MODULE_NOT_FOUND` for `src/controllers/query-state.js`. | Focused command exited 0: 7 tests, 7 pass, 0 fail. | Default/complete/malformed query states; valid/unknown camera preset plus bounded first-person path; architecture/HVAC views; clipping/layer toggles; DPR 1.25/3/NaN; exact empty semantic groups; semantic HTML controls. | Extracted fixed query serialization, immutable presets, shared semantic group names and a scoped ESM package boundary; focused tests remained 7/7 green. |

## Work unit evidence

| Evidence | Exact result |
|---|---|
| Focused test | `node disenos/cinemex-hvac-lorawan/tests/shell.test.mjs`: exit 0; 7 tests, 7 pass, 0 fail. |
| Full scoped suite | `npm run test:cinemex`: exit 0; 5 test files, 5 pass, 0 fail. Direct execution of all files exposes 33 behavioral tests: 33 pass, 0 fail. |
| Syntax | `node --check` over every `*.js` and `*.mjs` below the application directory: exit 0. |
| Browser runtime harness | `node disenos/cinemex-hvac-lorawan/qa/browser-smoke.mjs`: exit 0, `PASS`, local HTTP URL `http://127.0.0.1:42171/`, transport `local-http-server`; six checks passed: ready marker/WebGL/DPR/empty groups, bounded first-person, camera/query synchronization, semantic layer view, resize/DPR cap and disposal. `issues: []` proves no console warnings/errors, page errors, failed requests or HTTP responses ≥400. |
| Rollback boundary | Remove `index.html`, `styles.css`, `main.js`, scoped `package.json`, `src/scene/{runtime,materials}.js`, `src/controllers/{camera,layers,query-state}.js`, `tests/shell.test.mjs`, `qa/browser-smoke.mjs`, and this report. Foundation/domain modules and unrelated dirty files remain unchanged. |

## Accepted runtime contracts

- Accessible Spanish application shell with semantic buttons, visible focus, live status, fatal alert and retry control.
- Dynamic CDN imports are caught so Three.js/CDN/WebGL startup failures reach the accessible fatal panel instead of becoming unhandled application errors.
- Perspective runtime with OrbitControls, ten inspection presets, isometric reset and bounded lightweight first-person movement.
- DPR capped at 1.5, ResizeObserver/window resize handling and deterministic disposal.
- Architectural/engineering mode, architecture/HVAC view filters, roof/walls/cutaway and communication/label layers.
- Canonical query fallback with a single warning and stable serialization for reproducible QA states.
- Renderer, camera, scene, lights, material registry and nine semantic **empty** groups only; no early asset geometry.

## Deviations and risks

- No spec or design deviation in source behavior.
- Runtime acceptance is based on a real bundled-Chromium/SwiftShader session over local HTTP, not inferred from static/unit checks. No task-2.1 source correction was required after the environment restriction was removed.
- `disenos/cinemex-hvac-lorawan/package.json` declares `type: module` because the repository root is CommonJS while the browser architecture and Node contract tests require native ESM `.js` modules.

## Blocker-resolution evidence

The same commands that were previously blocked were rerun unchanged in the unrestricted environment:

```bash
node -e '<bind ephemeral HTTP server to 127.0.0.1>'
# PASS: 127.0.0.1:41683

node disenos/cinemex-hvac-lorawan/qa/browser-smoke.mjs
# PASS: http://127.0.0.1:42171/, local-http-server, issues=[]
```

No fallback interception transport was used, and the page was never opened through `file://`.
