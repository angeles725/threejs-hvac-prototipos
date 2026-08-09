# Block 56 — Measured GPU-budget of the nave-Panccadia equipment visor, and the damping-safe render-on-demand implementation that follows from the data

> DOCUMENT-mode capture (METHODOLOGY §20) on the same "better Three.js **design tools / toolchain**" axis
> as [Block 53]/[Block 54]/[Block 55]. It CLOSES the [Block 54] next-step — *"measure the real cost before
> applying the GPU playbook; decide from data, not speculation"* — by actually running the measurement
> against the 18 shipped equipment inspectors and reading the numbers back against the [Block 54] §5 gates.
> The finding is a **negative result with one positive lever**: the scenes are already so light that the
> heavy playbook (instancing / KTX2 / LOD / geometry-merge) is premature optimisation here; the ONE
> data-justified change is render-on-demand (§2.1 of [Block 54]), and this block writes its correct,
> damping-safe form from primary sources.
>
> **Measurement validity boundary (load-bearing):** the runtime numbers were taken in HEADLESS Chromium
> (`chrome-headless-shell` + `--use-angle=swiftshader`) — a CPU software rasteriser ([Block 26],
> [WebGL headless memory]). **Draw-call / triangle / geometry / texture / program COUNTS are
> rasteriser-independent** (they are what the scene *submits* per frame, identical on any GL backend) so
> they are `[CERT]` real. **Frame-time is NOT** — SwiftShader is CPU-fill-bound, not GPU-bound, so wall-clock
> ms/frame here does not predict a real client GPU; gate (e) of [Block 54] §5 stays UNMEASURED and needs a
> physical GPU + `stats-gl`. `[INFER]`
>
> Sources: local measurement preserved this session — `sources/probes/B56-visor-perf/measure-18.json` +
> `.csv` (the 18-row readout) and `measure.mjs` (the reproducible CDP driver), all `[CERT]`. Doc sources
> (preserved `sources/web-snapshots/`, fetched 2026-08-07, cross-ref [Block 54]):
> `threejs.org_manual_en_rendering-on-demand.html.md` and
> `raw.githubusercontent.com_mrdoob_three.js_dev_docs_pages_OrbitControls.html.md.md` (`[CERT-web]`),
> `github.com_mrdoob_three.js_issues_23090.md` (`[CERT-a]`). Local subject files under `../disenos/`.
> Method: direct runtime read of `renderer.info` per prototype + static confirmation of the shell config;
> primary-source transcription of the render-on-demand idiom. Markers: `[CERT]` local primary
> (measurement / prototype source) · `[CERT-web]` official three.js doc/manual (URL+date 2026-08-07) ·
> `[CERT-a]` GitHub issue thread · `[INFER]` deduction.

---

## 1. The mandate and what "the visor" is here `[CERT]`/`[INFER]`

[Block 54] documented the GPU-cost levers but explicitly did **not** benchmark — it left a next-step:
measure first, then decide. The user picked the target: the **18 standalone equipment inspectors** of the
nave-Panccadia library (`../disenos/nave-panccadia/equipos/<slug>/<slug>.html`), each a single machine the
client rotates and inspects up close — the exact scene shape [Block 54] §1 describes. This is NOT the
aggregate plant-floor visor (a different, heavier scene shape reserved for [Block 40]-style LOD); it is the
per-unit inspector, so the [Block 54] "close-inspected single equipment" scoping applies verbatim. `[INFER]`

Every prototype exposes its renderer for QA on a per-equipo global `globalThis.__<name>App.runtime.renderer`
plus a `__qaRenderInfo` hook — 100% consistent across all 18 `[CERT]`
(`../disenos/nave-panccadia/equipos/mesa-trabajo/mesa-trabajo.html:164`), which is what made a uniform
runtime read possible without editing a single file.

## 2. Method — headless CDP read, and why the counts survive SwiftShader `[CERT]`/`[INFER]`

The chrome-devtools MCP in this session was bound to an UNRELATED browser (a Windows Electron app), so it
could not drive the local pages. The working path was dependency-free: launch the Playwright-cached
`chrome-headless-shell` (build 1234) with `--use-angle=swiftshader --enable-unsafe-swiftshader`, serve the
repo over `http.server`, and drive it over the **CDP WebSocket with Node 22's built-in `WebSocket`** —
`Target.createTarget` → `attachToTarget{flatten}` → `Page.navigate` → poll `data-app-ready="true"` → let a
few frames render → `Runtime.evaluate` the `renderer.info` probe. The full driver is preserved at
`sources/probes/B56-visor-perf/measure.mjs` `[CERT]` (reproducible: `node measure.mjs <slug…>`).

Why the numbers are trustworthy despite SwiftShader: `renderer.info.render.calls` /`.triangles` and
`renderer.info.memory.geometries`/`.textures` are counters three.js increments as it **submits** the scene;
they are identical whatever GL backend consumes them `[INFER]`. What SwiftShader would distort — pixel
fill-rate, real ms/frame — was deliberately NOT read as a client-GPU proxy (see the header boundary).
Note `renderer.info.render.calls` is reset per `render()` call, so the value read is the **steady per-frame**
draw count `[CERT-web]` ([Block 54] cross-ref); and because shadows are frozen (§4), that per-frame count is
the main colour pass only — the one-time shadow-map raster is not re-counted each frame `[INFER]`.

## 3. The measured readout (18/18, all `data-app-ready`) `[CERT]`

Full data: `sources/probes/B56-visor-perf/measure-18.csv` `[CERT]`. Sorted by draw calls (worst first):

| Equipo | draw calls | triangles | geometries | textures | programs |
|---|---:|---:|---:|---:|---:|
| camara-fermentacion | **87** | 1544 | 88 | 3 | 7 |
| estanteria | 61 | 1442 | 62 | 2 | 5 |
| estufa-rango | 54 | 3986 | 55 | 3 | 7 |
| fermentadora | 50 | 924 | 51 | 3 | 7 |
| horno-rotativo | 47 | 1088 | 48 | 3 | 7 |
| horno-domino | 43 | 1190 | 44 | 3 | 7 |
| freidora / horno-conveccion / laminadora | 40 | 872 / 1268 / 1808 | 41 | 3 | 6–7 |
| silla-lavabo | 36 | 1302 | 37 | 2 | 5 |
| rebanadora | 34 | 586 | 35 | 3 | 6 |
| cuentalitros | 25 | 1500 | 26 | 3 | 6 |
| batidora-planetaria | 24 | **6246** | 25 | 3 | 6 |
| ultracongelador | 22 | 532 | 23 | 3 | 7 |
| lavavajillas | 21 | 682 | 22 | 3 | 6 |
| amasadora-espiral | 19 | 2908 | 20 | 3 | 6 |
| mesa-trabajo | 17 | 546 | 18 | 3 | 6 |
| bascula-piso | 15 | 436 | 16 | 3 | 6 |

**Aggregates** `[CERT]` (`sources/probes/B56-visor-perf/measure-18.json`): draw calls **15–87, avg 37.5**;
triangles max **6246** (avg ~1603); textures **2–3** (all runtime `CanvasTexture`, no image files); programs
5–7; `pixelRatio` 1 (headless DPR is 1); `shadowMap.autoUpdate` = `false` on all 18.

**One structural read**: `geometries ≈ draw calls + 1` on every row (camara 88 geo / 87 calls). That is the
signature of **one mesh = one geometry = one draw** — no geometry sharing, no instancing, no merge `[INFER]`.
It is also why draw-call count IS geometry count: nothing collapses them.

## 4. Gate readout vs [Block 54] §5 `[CERT]`/`[INFER]`

| [Block 54] §5 gate | Result | Evidence |
|---|---|---|
| (a) `render.calls` < ~100 idle | ✓ **PASS all 18** (max 87) | measure-18.csv `[CERT]` |
| (b) `getPixelRatio()` ≤ 2 | ✓ PASS | shell caps `min(devicePixelRatio,2)` (`../disenos/nave-panccadia/equipos/mesa-trabajo/mesa-trabajo.html:58`) `[CERT]`; headless read = 1 |
| (c) KTX2 for all maps (no raw PNG/JPG) | **N/A** | 0 GLB, 0 image textures — all `CanvasTexture` procedural `[CERT]` |
| (d) shadows frozen + mapSize ≤ 1024 | ✓ frozen / ✗ size | `shadowMap.autoUpdate=false` measured on all 18 `[CERT]`, BUT `shadow.mapSize.set(2048,2048)` uniform (`…/mesa-trabajo.html:85`) exceeds the ≤1024 key recommendation `[CERT]` |
| (e) frame-time via stats-gl on real GPU | **UNMEASURED** | SwiftShader invalid for ms/frame (header boundary) `[INFER]` |

## 5. Verdict — the heavy playbook is premature optimisation here `[INFER]`

The data says the per-unit visor is **already well inside the GPU budget**: <100 draw calls, <6.5k triangles,
2–3 tiny procedural textures, 5–7 programs, shadows already frozen, DPR already capped. The compounding
levers [Block 54] ranks highest all assume repetition or heavy assets this scene shape does not have:

- **Instancing / BatchedMesh (§2.3)** — nothing repeats within a single-unit scene; the [Block 54] §4
  "low-repetition instancing = complexity for no draw-call win" caveat fires directly `[INFER]`.
- **KTX2 / Draco / meshopt (§2.2)** — there are no shipped textures or GLBs to compress; the whole VRAM
  lever is inapplicable `[CERT]`/`[INFER]`.
- **LOD (§4)** — already SKIP by [Block 54]; a close-inspected single unit never recedes `[CERT-web]`.
- **Geometry merge (§2.5)** — would collapse `geometries ≈ calls` but the draw count is already <100, so
  the merge buys complexity for no gate movement `[INFER]`.

Only two changes are data-justified, both uniform across the 18, neither urgent: **render-on-demand** (§6)
and **mapSize 2048→1024** (§7).

## 6. The one real lever — render-on-demand, done damping-safe `[CERT-web]`/`[CERT-a]`

All 18 run a **continuous** loop — `function animate(){ requestAnimationFrame(animate); controls.update();
renderer.render(scene,camera); }` `[CERT]` (`../disenos/nave-panccadia/equipos/mesa-trabajo/mesa-trabajo.html:167`) —
so they redraw 60×/s forever over a scene that, with `autoRotate` OFF by default, is static. The three.js
manual states the fix and the cost of not doing it: for "something that does not animate … rendering
continuously is a waste of the device's power" — instead "render once at the start and then render only when
something changes", wiring `controls.addEventListener('change', render)` and
`window.addEventListener('resize', render)` `[CERT-web]`
(`sources/web-snapshots/threejs.org_manual_en_rendering-on-demand.html.md`). **Zero quality loss** — same
pixels, not re-drawn when nothing moves.

**The damping trap (why a naïve wiring hangs).** These controls set `enableDamping = true`
(`…/mesa-trabajo.html:74`), and the OrbitControls doc is explicit that `update()` "must be called after any
manual changes … required if `controls.enableDamping` or `controls.autoRotate` are set to `true`"
(dampingFactor default 0.05) `[CERT-web]`
(`sources/web-snapshots/raw.githubusercontent.com_mrdoob_three.js_dev_docs_pages_OrbitControls.html.md.md`).
The manual spells out the hazard: with damping on you must call `update()` inside `render`, but "if we listen
for the `change` event and call `render`, `render` will call `controls.update`. `controls.update` will send
another `change` event" — an infinite re-entrant loop `[CERT-web]`. This is exactly open issue **#23090**
("OrbitControls: Rendering on Demand when `controls.enableDamping = true`" — "Animation loop is unnecessary
when `OrbitControls.enableDamping = true`") `[CERT-a]`
(`sources/web-snapshots/github.com_mrdoob_three.js_issues_23090.md`); its proposed `controls.setScene()/
setRenderer()` API was never merged (refs PR #23088), so the **documented working solution is the manual's
flag idiom**, NOT a core API `[CERT-a]`/`[INFER]`.

**The manual's damping-safe idiom (verbatim shape)** `[CERT-web]`: a re-entrancy guard flag + `rAF`, so the
`change` storm coalesces to one queued frame:

```js
let renderRequested = false;
function render() {
  renderRequested = false;
  controls.update();                 // integrates the damping tail
  renderer.render(scene, camera);
}
render();                            // one initial frame
function requestRenderIfNotRequested() {
  if (!renderRequested) { renderRequested = true; requestAnimationFrame(render); }
}
controls.addEventListener('change', requestRenderIfNotRequested);
window.addEventListener('resize',  requestRenderIfNotRequested);
```

**The equipo-specific wiring that a blind port would miss** `[CERT]`/`[INFER]`: render-on-demand only draws
on subscribed events, so EVERY state change these shells make outside OrbitControls must also call
`requestRenderIfNotRequested()`, or the change never paints:
- the **AUTO-ROTATE** toggle button (`…/mesa-trabajo.html:157`) — while ON it must keep pumping frames
  (`autoRotate` needs `update()` every frame per the doc `[CERT-web]`), so its handler starts/stops the loop,
  it cannot rely on `change`;
- **part-visibility toggles** (e.g. UNDERSHELF `shelf.visible`, `…/mesa-trabajo.html:159`) — must request a
  frame after mutating the scene;
- the existing **resize** handler (`…/mesa-trabajo.html:161`) already resizes but does not draw — it must
  request a frame too.

Because the button set differs per equipo, this is a per-file edit, not a blind find-replace `[INFER]`.
Payoff: eliminates ~60 wasted GPU/CPU frames per second per idle inspector — a battery/thermal win, not a
"the visor is slow" fix (§4 shows it is not slow). It is the single lever the data endorses.

## 7. The trivial cleanup — mapSize 2048 → 1024 `[CERT]`/`[CERT-web]`

All 18 set `sun.shadow.mapSize.set(2048,2048)` (`…/mesa-trabajo.html:85`) `[CERT]`; [Block 54] §2.4 records
the `LightShadow.mapSize` default as (512,512) and recommends key ≤1024 / secondary 512 `[CERT-web]`. Each
scene has only 1–2 shadow-casting lights and the shadow is already frozen (`autoUpdate=false`), so a 2048→1024
drop is a small one-time VRAM/raster saving with negligible quality change on a room-scale unit — low effort,
low payoff, do it opportunistically, not as a priority `[INFER]`.

## 8. What this is (kit boundary) `[INFER]`

A read-only MEASUREMENT + the primary-source implementation it justifies — no prototype was edited producing
this block. The render-on-demand + mapSize deltas are **staged proposals** for the client visor shell
template; a research run never edits the shipped prototypes or the kit (SELF-IMPROVEMENT hard boundary,
cross-ref [Block 53] §6 / [Block 54] §6) — the user promotes shell-template changes. Nothing here touches the
[Block 53] material/ΔE00 gate or the headless QA path; the runtime-cost budget stays ORTHOGONAL to the
material gate. Gate (e) (real-GPU frame-time) remains the one open, execution-required measurement — it needs
a physical GPU + `stats-gl`, out of reach of this headless environment. Cross-ref [Block 54] (the levers),
[Block 26]/[WebGL headless memory] (SwiftShader boundary), [Block 40] (where LOD *does* pay).
