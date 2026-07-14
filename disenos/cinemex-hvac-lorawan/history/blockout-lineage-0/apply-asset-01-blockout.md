# SDD Apply — Asset 01 Blockout Evidence

**Change:** `cinemex-hvac-lorawan`  
**Task:** 3.1, asset `shell-circulation-facade`, BLOCKOUT only  
**Mode:** Strict TDD / design3d HEAVY  
**Delivery:** `exception-ok`, accepted `size:exception`; no commit or PR created  
**Gate state:** Mechanical evidence complete; blind visual review pending. Structural, materials and surface remain locked.

## Implemented boundary

- Exact 60 × 45 m foundation and 12 m public / 29 m auditorium-spine / 4 m rear bands.
- Seven-metre central corridor with four true 2.2 m auditorium portals per side, stable Sala 1–8 semantic metadata and block digits.
- Disjoint 1.5 m rear service corridor, 0.2 m separating wall and four technical-room proxies.
- Public-height shell plus auditorium perimeter segments at configured 7.2/8.0/8.8 m family heights.
- Red marquee, identity block, five-entry glass bank and accessible centre entrance proxy.
- Flat blockout palette only; one shared `BoxGeometry` and one `InstancedMesh` per semantic-layer/color pair.
- Deterministic DesignSpec query vocabulary for the five blockout views and architecture/engineering states.
- No front-of-house fit-out, auditorium interiors, HVAC devices, network media, structural refinement, textures or finish materials were added.

## TDD cycle evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 shell plan/builder | `tests/architecture.test.mjs` | Pure unit + static composition | Before edits, `npm run test:cinemex`: 33/33 pass. | Test was written first and exited 1 with `ERR_MODULE_NOT_FOUND` for `src/scene/architecture.js`. | After the minimum plan, builder and composition wiring, focused execution passed 5/5. | Added independent footprint/band, 4+4 portal, rear-circulation, façade/accessibility and composition paths. Canonical capture inspection then exposed public-height auditorium side walls; a sixth test failed because `auditoriumOuterWalls` was absent, then passed after family-height perimeter segments were added. Final focused result: 6/6. | Extracted a pure frozen plan, semantic metadata helper, shared-geometry/color buckets and deterministic disposal; 6/6 remained green. |
| 3.1 DesignSpec QA state | `tests/shell.test.mjs` | Pure unit | Existing shell focused result: 7/7 pass. | DesignSpec camera/state test and hidden engineering-section assertion were written first; focused run exited 1 with 2 failures. | Added `architecture|engineering`, `on|off`, `links=all`, and hidden QA camera vocabulary; focused result: 8/8. | Architecture and engineering states exercise different roof/cutaway/link paths; invalid-state regression still restores canonical defaults once. | Kept the ten user-facing camera buttons unchanged and isolated four evidence aliases from the UI preset inventory; 8/8 remained green. |

## Work unit evidence

| Evidence | Exact result |
|---|---|
| Focused architecture test | `node disenos/cinemex-hvac-lorawan/tests/architecture.test.mjs`: exit 0; 6 tests, 6 pass, 0 fail. |
| Focused QA-state regression | `node disenos/cinemex-hvac-lorawan/tests/shell.test.mjs`: exit 0; 8 tests, 8 pass, 0 fail. |
| Full scoped suite | `npm run test:cinemex`: exit 0; 40 tests, 40 pass, 0 fail. |
| Syntax | `node --check` over every application `*.js` and `*.mjs`: exit 0. |
| Browser runtime | `node disenos/cinemex-hvac-lorawan/qa/browser-smoke.mjs`: exit 0, PASS over local HTTP; live blockout groups, DPR cap, navigation, query synchronization, layer control and disposal passed; `issues: []`. |
| Probe | `research/tools/probe.mjs`: 27 draws, 2,892 triangles, 115 frames; target ceilings 550 / 750,000 respected. FPS 13 is informational under SwiftShader. |
| Capture set | Canonical `capture.mjs --url-suffix` produced 10 4K images for all five required views in both required states. All 10 sidecars report `console_clean: true`, `issues: []`. |
| Rollback boundary | Remove `src/scene/architecture.js`, `tests/architecture.test.mjs`, the architecture import/create/dispose wiring in `main.js`, the DesignSpec alias additions in `controllers/{camera,query-state}.js`, the changed blockout assertions in `qa/browser-smoke.mjs`, this report and `runs/assets/01-shell-circulation-facade/`. Foundation/domain and task-2.1 shell behavior remain intact. |

## Mechanical evidence namespace

`runs/assets/01-shell-circulation-facade/`

- `blockout-attempt1.probe.json`
- `blockout-attempt1.mechanical.json`
- `blockout-attempt1.png` plus nine named required-view/state captures
- ten corresponding `*.console.json` sidecars

No blind-review JSON or visual verdict was authored by the modeler. The next pass remains locked until a fresh reviewer evaluates the saved captures against the DesignSpec.
