# Limpieza fase 2 — authorized dead-code removal (2026-07-18)

Single-writer cleanup on `disenos/cinemex-hvac-lorawan/` only. The maintainer explicitly
authorized retiring four feature groups TOGETHER WITH their test contracts (golden rule: a
feature and its asserts leave in the same change). Backup: `cinemex-hvac-lorawan-BACKUP-2026-07-18`.
No commit was made.

Product context: ONE fixed camera view (`network` preset), visual mode fixed `architectural`,
no cutaway/fullscreen UI, network layers (`rs485`/`lorawan`/`internet`) default-off with their
geometry machinery preserved. The earlier boot optimization (lazy work, batched boot calls,
per-mesh width-scale stale tracking via `syncNetworkMediaWidths`) and Rondas A/B (depth restyle +
responsive) are untouched.

## Per-feature removal table

| # | Feature retired | Code removed | Contracts retired / updated | Rationale |
|---|---|---|---|---|
| 1 | Cutaway + warmup pass 2 | `runtime.js` clippingPlane plumbing; `layers.js` cutaway state + `setCutaway`; `materials.js` `setCutaway`; `warmup.js` second `renderer.compile` pass (flip/restore); `query-state.js` `cutaway` param (parse + DEFAULT + serialization); `main.js` `bootCutaway`/clippingPlane wiring | p6-l2 warmup tests rewritten to single-pass (`compiles === 1`); shell canonical-serialization, parse and layer-controller asserts updated; `?cutaway=…` is an unknown token (ignored) | No UI or URL path could enable clipping in the shipped product; the second compile pass pre-paid shader variants nothing could ever request |
| 2 | Engineering visual mode | `materials.js` `setEngineeringMode`/`registerCutawayMaterials`/`engineeringOpacity` + baselines; `layers.js` `setVisualMode` + `materials`/`renderer` params; `architecture.js` `zones` group (plan-band + per-auditorium volumes), `zone-*` materials, `setVisualMode`, engineering branches (external proxies pinned hidden, spine rule collapsed to roof toggle); `runtime.js` `setVisualMode` + `zones` semantic group; `query-state.js` `mode` param; `main.js` visual-mode threading + `applyInteraction` state branch | materials/lighting-camera registry-engineering tests retired; interaction-ui zones-stability test retired; P2/M3/item-7 tests updated to the architectural-only reality; `?mode=engineering` is an unknown token | Mode is fixed `architectural`; every engineering branch was unreachable. `resolveSpineAssemblyVisibility` KEPT (roof toggle still drives it in the live view) — only its engineering branch left |
| 3 | First-person navigation | `camera.js` `setNavigationMode`/`setMovementIntent`/`DEFAULT_BOUNDS`/`MOVE_SPEED_MPS`/key listeners/bounds clamp; `query-state.js` `nav` param + `navigation` field; `main.js` boot call | shell first-person movement/bounds asserts retired; controller test rewritten orbit-only; `?nav=first-person` is an unknown token | No UI or code path ever left orbit; the WASD/eye-height machinery was pure dead weight per frame |
| 4 | Unreachable presets, roof clips, schematic board, look-dev, QA harness | `CAMERA_PRESETS` pruned to `network` (+ `ISOMETRIC_PRESET` and embed framing, both live); `QA_CAMERA_PRESETS` removed; `surfaces.js` `SURFACE_ROOF_CLIP_CAMERAS`/`SURFACE_REAR_ROOF_CLIP_CAMERAS`; `architecture.js` `resolvePublicRoofVisibility`/`resolveRearRoofVisibility` + roof-mesh clip lists + `densePhysicalNetwork` gating; **`src/scene/network-schematic.js` deleted** with its lazy build + `asset.networkSchematic` accessor; `runtime.js` `setLookdevCamera` (grazing exposure/key swing); **`qa/browser-smoke.mjs` deleted**; **`tests/network-schematic.test.mjs` deleted** | All framing/board/roof-clip/look-dev evidence contracts retired (maintainer accepted losing evidence-QA capacity); lighting-composition contracts PRESERVED via test-owned viewpoint fixtures | See reachability decisions below |

## Reachability decisions

- **Network-schematic board: REMOVED.** After feature 2 (mode pinned `architectural`) and the
  QA-preset prune, `schematic`/`ug67RfDetail` could never resolve true (`schematic` required the
  engineering mode at `complete-network`, or the `network-schematic-detail` camera; the RF detail
  required engineering at `ug67` — all retired). The only remaining trigger was the QA/test-only
  `asset.networkSchematic` accessor. Nothing in production could ever build it, so the whole
  composition module, its lazy machinery and its tests left the tree.
- **`densePhysicalNetwork` collapsed to `true`.** It only went false at the retired
  `network-schematic-detail` camera. Media/packet visibility is still gated by the layer groups
  (rs485/lorawan/internet default-off) — that machinery is untouched.
- **Roof clips removed safely.** The roof LAYER toggle (`?roof=0`, Techo) runs through
  `groups.roof.visible` (layers controller) + `setRoofLayerVisible` (interior ceilings, spine) —
  neither used the per-camera clip lists. `network` triggered no clip, so per-mesh visibility
  writes were dead.
- **External IP-chain proxies: geometry KEPT, pinned hidden.** They were engineering-only
  evidence, already hidden in every shipped frame; the internet-chain geometry machinery stays
  per the do-not-remove list.
- **`resolveSpineAssemblyVisibility` KEPT** (signature now `({ roofVisible })`): the Techo toggle
  is a live product axis; only the engineering always-on branch was removed.
- **`interaction.js` scene states KEPT** (`architecture`/`engineering` as deterministic
  interaction-state tokens; `?state=` stays in the URL contract). The model's `visualMode`
  metadata no longer drives any scene machinery — documented in `main.js`.
- **Lighting authority untouched.** `lighting.js` keeps its engineering-lift / shell-opacity /
  grazing pure functions and data (heavy pure-contract test surface not released by the
  maintainer). They are data + pure functions with zero runtime cost; flagged as a candidate for
  a future lighting-scoped cleanup.
- **`SURFACE_NETWORK_MEDIA.camera` still names `complete-network`** (data only):
  `resolveNetworkMediaWidthScale` returns 1 for every live camera. Kept because the media-width
  machinery is part of the preserved boot-cut 3a stale-tracking path.
- **Lighting-composition tests preserved via fixtures.** `tests/lighting-camera.test.mjs` now
  owns a `VIEWPOINT_FIXTURES` table (the old framings) so its ~50 lighting/scene contracts keep
  measuring the SHIPPED lighting design; only the two registry-engineering tests retired.
- **`qa/browser-smoke.mjs` deleted.** It drove DOM controls removed weeks ago (camera buttons,
  Vista deck) and exercised only retired evidence capacity — it was already unrunnable. The
  `surfaces.test.mjs` pattern asserts on it left with it.

## Retired test contracts (pre-cleanup locations)

| File:line (before) | What it asserted |
|---|---|
| tests/p6-l2-corrections.test.mjs:684-713 | Warmup compiles BOTH cutaway variants (`compiles === 2`), flip + byte-identical restore — **updated** to single-pass |
| tests/p6-l2-corrections.test.mjs:715-728 | `bootCutaway: queryState.cutaway` coupling in main.js — **updated** to `doesNotMatch /cutaway/i` |
| tests/shell.test.mjs:77,84-131,141 | `cutaway`/`mode`/`nav` in canonical serialization + parse — **updated** (tokens now unknown/ignored) |
| tests/shell.test.mjs:409-451 | Layer controller clipping + `setVisualMode`/`setCutaway` — **updated** to view/layer-only controller |
| tests/materials.test.mjs:146-174 | Engineering mode makes registered shell materials translucent and restores defaults — **retired** |
| tests/lighting-camera.test.mjs:1235-1245 | Registry applies derived shell opacity in engineering mode — **retired** |
| tests/surface-corrections.test.mjs:360-386 | Registry seat/carpet engineering opacities — **updated** to authority-level relation |
| tests/interaction-ui.test.mjs:392-405 | No `zones` mesh disappears across interaction states — **retired** (zones layer removed) |
| tests/p6-l4-corrections.test.mjs:227-243 | `resolveSpineAssemblyVisibility('engineering', …) === true` — **updated** to roof-toggle-only rule |
| tests/shell.test.mjs:150-182 | First-person movement, bounds, eye height — **retired** (controller orbit-only) |
| tests/shell.test.mjs:155 | 11-preset catalogue count — **retired** with the prune (catalogue = `network`) |
| tests/shell.test.mjs:184-267 | Fixed evidence framings + grazing/Sala-3/engineering-section/complete-network + derived schematic-detail camera — **retired** |
| tests/shell.test.mjs:299-318,338-407 | Look-dev camera contracts (`setLookdevCamera`, grazing, material-floor, structural evidence framings) — **retired/merged** into inert-token + no-lookdev guards |
| tests/surfaces.test.mjs:207-241 | `QA_CAMERA_PRESETS['complete-network']` literals, board-derived detail camera, corridor framing — **retired** (viewport evidence policy kept) |
| tests/surface-endpoints.test.mjs:309-384,521-597,598-643,679-705 | Board occlusion at complete-network, RF ticks engineering-only, board captions, facade poster-bank framing, lobby framing — **retired** |
| tests/surface-corrections.test.mjs:73-160,162-193,213-231 | Board layout/captions/texture, complete-network media legibility, fit-out roof clips — **retired** |
| tests/p6-l2-corrections.test.mjs:201-382,639-660 | LOS harness + P1/1b/P6d preset-framing + roof-clip lists + board visibility + spec/preset sync — **retired** |
| tests/p6-l4-corrections.test.mjs:409-495 | Preset classification of the chip envelope + `top` preset spec sync — **updated** to fixture standpoints + inert-token guard |
| tests/network-schematic.test.mjs (all 11) | The whole board module (topology, layout, texture, arrowheads, captions, camera evidence policy) — **retired with the module** |

## Test census

- Before: **331 pass / 0 fail** (session start, working tree).
- After: **292 pass / 0 fail** — 39 net retired (11 with the deleted `network-schematic.test.mjs`,
  28 across shell/p6-l2/p6-l4/surfaces/surface-corrections/surface-endpoints/materials/
  lighting-camera/interaction-ui, minus merged replacements), ~25 tests updated in place.
- `node --check` clean on every touched source file.
- Zero live references remain for any removed symbol (`rg` sweep over `src/`, `main.js`,
  `tests/`, HTML) — only tombstone comments and `doesNotMatch` guards.

## Boot timings (3 runs, median; headless Chrome + SwiftShader, cold cache)

| Point | ready (ms) | first frame after ready (ms) |
|---|---|---|
| Baseline (before cleanup) | 16450 · 16441 · 18386 → **16450** | **16531** |
| After cleanup (loaded machine, first attempt) | 20512 · 18773 · 19435 → 19435 | 19564 |
| After cleanup (settled machine) | 15175 · 16417 · 15830 → **15830** | **15914** |

Net ~620 ms (~4%) median improvement, mainly the warmup's dropped second `renderer.compile`
pass plus the removed zones geometry and boot-time visibility passes. (The mid-run figure was
measured while the esbuild publish + capture harness were still loading the machine; the settled
run is the representative one. SwiftShader variance is ±1 s.)

## Eye-check

`limpieza-f2-eyecheck.mjs` (scratchpad): `?cutaway=1&mode=engineering&nav=first-person` boots
clean to the fixed `network` view — all retired tokens ignored, layer state at defaults, zero
console errors. Captures (vs the ronda-b set — identical layout/framing/styling, only live
telemetry values differ):

- runs/assets/limpieza-f2-1440x900-{tablero,hvac,energia}.png
- runs/assets/limpieza-f2-390x844-{tablero,hvac,energia}.png

## Publish

`node build-publish.mjs` rebuilt clean: main bundle 37.2 kB source → 623.9 kB
bundled+obfuscated; dashboard 5.0 kB → 59.5 kB; three stays external.
