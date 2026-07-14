# SDD Apply — Asset 01 Blockout Attempt 2 Evidence

**Change:** `cinemex-hvac-lorawan`  
**Task:** 3.1, asset `shell-circulation-facade`, BLOCKOUT correction only  
**Mode:** Strict TDD / design3d HEAVY  
**Delivery:** `exception-ok`, accepted `size:exception`; no commit or PR created  
**Gate state:** Mechanical evidence complete; fresh blind visual review pending. Structural, materials and surface remain locked.

## Attempt 1 review corrections implemented

| Reviewer correction | Attempt 2 implementation |
|---|---|
| Reset the silhouette into eight countable masses around the spine and rear strip. | Auditorium roof slabs were inset to preserve eight visible seams while retaining the exact 4+4 plan, continuous seven-metre spine and separated rear technical circulation. |
| Expose the three auditorium families and reframe Sala 3. | Eight temporary auditorium proxies now encode 2 large / 4 medium / 2 small families, screen slabs, 3/4/5 stepped tier masses split by a central aisle, and wheelchair-bay gaps. The Sala 3 camera targets these proxies. |
| Color-separate front-of-house operational zones. | Lobby, ticketing, waiting, concession counter, connected kitchen workline and checkpoint lane use six distinct flat blockout materials. |
| Make the canonical topology countable. | Added exactly 14 TC markers, four UC cabinets, one elevated UG67 with two antennas, six differentiated external nodes, four green trunks, 14 green drops, four blue dashed nonphysical LoRa links and a blue solid conceptual IP chain. |
| Tighten evidence cameras. | Neutral, façade, engineering-section, complete-network and Sala 3 presets now use explicit target-oriented positions and per-preset fields of view. |
| Improve engineering contrast. | Engineering zone opacity was reduced and cutaway clipping is registered only on architectural materials, so device/media/external proxies remain visible. |

All additions are temporary BLOCKOUT proxies built from the shared `BoxGeometry` and per-layer/color `InstancedMesh` buckets. No structural refinement, production device modeling, finish materials, textures, labels, animation, selection logic or simulation behavior was advanced.

## Strict TDD cycle evidence

| Work unit | Safety net | RED | GREEN / TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Auditorium and front-of-house proxy contract | Existing scoped suite: 40/40 pass. | New `architecture.test.mjs` assertions failed because `blockoutProxies` and the required exact families/FOH sequence did not exist. | Added the minimal pure-plan structures and renderer adapter; exact 8-room, 2/4/2 family, screen/tier/aisle/wheelchair and six-zone FOH assertions passed. | Reused the frozen plan and existing instanced box bucket pipeline rather than adding separate asset factories. |
| Endpoint and media proxy contract | Existing architecture tests remained green. | Exact topology count assertions failed for missing 14 TC, four UC, two gateway antennas, six external kinds, four trunks, 14 drops and four nonphysical LoRa links. | Added the exact plan records and semantic-layer instances; focused architecture result became 8/8. External-node material differentiation was triangulated as six unique keys. | Preserved TC300 → RS-485 → UC100 → LoRaWAN → UG67 → IP ordering in a data-driven plan. |
| Evidence framing | Existing shell/controller tests remained green. | A new preset framing/FOV test failed because evidence presets retained broad default framing and did not update the camera projection. | Added explicit attempt-two positions, targets and FOV values; all five presets update the projection and focused shell result became 9/9. | Kept the ten user-facing camera buttons and hidden DesignSpec aliases unchanged. |
| Engineering cutaway safety | Existing layer-mode assertions remained green. | A cutaway scoping test failed because `renderer.clippingPlanes` globally clipped topology and external proxies. | Registered cutaway planes only on architectural materials and verified the renderer global plane list stays empty; engineering endpoints remain visible. | Centralized cutaway mutation in the material registry and removed duplicated global renderer clipping. |

## Mechanical evidence

| Evidence | Exact result |
|---|---|
| Focused architecture test | `node disenos/cinemex-hvac-lorawan/tests/architecture.test.mjs`: exit 0; 8 tests, 8 pass, 0 fail. |
| Focused shell/controller test | `node disenos/cinemex-hvac-lorawan/tests/shell.test.mjs`: exit 0; 9 tests, 9 pass, 0 fail. |
| Full scoped suite | `npm run test:cinemex`: exit 0; 43 tests, 43 pass, 0 fail. |
| Syntax | `node --check` over every application `*.js` and `*.mjs`: exit 0. |
| Browser runtime | `node disenos/cinemex-hvac-lorawan/qa/browser-smoke.mjs`: exit 0; PASS over local HTTP; live semantic groups and exact blockout proxy counts passed; `issues: []`. |
| Probe | `research/tools/probe.mjs`: 55 draws, 5,772 triangles, 141 sampled frames, 7 MB heap; target ceilings 550 / 750,000 respected. FPS 16 is informational under SwiftShader. |
| Capture set | Canonical `capture.mjs --url-suffix` produced 10 images for the five required views in architecture and engineering states. All 10 sidecars report `console_clean: true` and zero issues. |

## Evidence namespace and rollback

`runs/assets/01-shell-circulation-facade/`

- `blockout-attempt2.probe.json`
- `blockout-attempt2.mechanical.json`
- `blockout-attempt2.png` plus nine named view/state captures
- ten corresponding `*.console.json` sidecars

Attempt 1 images, mechanical evidence and failed blind review remain preserved for reviewer comparison. No attempt 2 review JSON or verdict was authored by the modeler.

Rollback only the attempt 2 correction by reverting the proxy-plan/instance additions in `src/scene/architecture.js`, architecture-only clipping changes in `src/scene/{materials.js,layers.js}`, evidence framing in `src/controllers/camera.js`, attempt-two assertions in `tests/{architecture,shell}.test.mjs` and `qa/browser-smoke.mjs`, plus attempt-two evidence files. Do not remove the task-2.1 shell or attempt 1 evidence.

## Locked boundary

Mechanical checks are complete, but BLOCKOUT is **not approved**. The only valid next action is a fresh blind visual review of the ten saved attempt 2 captures against the DesignSpec. Structural, materials and surface work remain locked until that reviewer returns PASS.
