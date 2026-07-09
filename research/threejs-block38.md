# Block 38 — High-quality deliverables and visual QA

> Research of **turning a running prototype into a shippable image/asset kit and keeping it from
> regressing**: the WebGL capture contract (`preserveDrawingBuffer`, `toDataURL`/`toBlob`),
> supersampled and transparent-background capture, a batch capture harness built on the existing
> probe infrastructure, and a pixel-diff regression strategy for future changes. Does NOT cover
> video/turntable encoding pipelines (ffmpeg etc., out of scope) or the thumbnail framing spec
> itself ([Block 37], written in parallel — referenced, not duplicated).
>
> Sources: context7 `/mrdoob/three.js` (manual/en/tips.html + manual/examples/tips-preservedrawingbuffer.html,
> manual/en/backgrounds.html + manual/examples/tips-transparent-canvas.html, docs/pages/WebGLRenderer.html
> (constructor options + `readRenderTargetPixels`/`readRenderTargetPixelsAsync`),
> examples/picking-gpu (render-target readback pattern), wiki/Migration-Guide 154→155 —
> queried 2026-07-04) · `sources/web-snapshots/raw.githubusercontent.com_mapbox_pixelmatch_main_README.md.md`
> (mapbox/pixelmatch README, preserved 2026-07-04) · local: `tools/probe.mjs` (read),
> `tools/capture.mjs` (new, this block, tested live) · `sources/web-snapshots/baked-shadows-*.png`
> (fix-writers' screenshot precedent).
> Method: context7 doc queries + one live capture run (Puppeteer/SwiftShader, same recipe as
> [Block 26]) to validate the new harness — read-only over prototype files, PNG output written
> only to a scratch dir, nothing committed to the repo besides `tools/capture.mjs` itself.
> Markers: `[CERT-web]` official web (URL + date) · `[CERT]` local file:line ·
> `[CERT-hw]` verified against the live system · `[CERT-a]` secondary source ·
> `[INFER]` deduction.
>
> Layer 6 (delivery/QA, run 4). Connects [Block 26], [Block 13] §13.3, [Block 37] (planned),
> [Block 19], [Block 25].

---

## 38.1 — The capture contract: why a naive screenshot comes out black `[CERT-web]`

`canvas.toDataURL()`/`canvas.toBlob()` read whatever is currently in the canvas's drawing
buffer. By default (`preserveDrawingBuffer: false`, the constructor default — docs/pages/WebGLRenderer,
2026-07-04) the browser is free to clear/swap that buffer right after compositing the frame, so a
capture call made from any handler other than "immediately after a render" typically returns a
black image (manual/en/tips.html, "Taking A Screenshot of the Canvas", 2026-07-04). Two fixes,
same doc:

| Fix | How | Trade-off |
|---|---|---|
| **Render-then-capture** | Call `render()` synchronously right before `canvas.toBlob(...)` in the same event handler | No renderer flag needed; only works if you control the call site (e.g. a "Screenshot" button handler) `[CERT-web]` |
| **`preserveDrawingBuffer: true`** | Pass at construction: `new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, alpha: true })` | Lets you capture at ANY time (e.g. after an async wait), at a performance cost — the docs note it as an explicit opt-in (default `false`) because retaining the buffer defeats swap-chain optimizations the browser would otherwise apply `[CERT-web]` (constructor option semantics) + `[INFER]` (perf rationale for the false default) |

Both prototype families in this corpus render every frame via `requestAnimationFrame`
([Block 1] §1.3), so the render-then-capture path is available for free — a batch harness
(§38.3) doesn't need `preserveDrawingBuffer` at all if it captures through the browser's own
compositor (e.g. Puppeteer's `page.screenshot()`) rather than an in-page `toDataURL()` call
`[INFER]` (mechanism: Puppeteer reads the compositor's frame, not the WebGL drawing buffer
directly, so the same-buffer-clearing caveat above doesn't apply to it).

## 38.2 — Supersampled capture: two ways to get more pixels than the display shows `[CERT-web]`

**A. Temporarily inflate the canvas.** Before capture: read back current `renderer.getSize()`/
`getPixelRatio()`, call `renderer.setSize(3840, 2160)` and/or `renderer.setPixelRatio(4)`, render
one frame, capture, then restore the saved size/ratio (`setPixelRatio` mutates internal state
and re-triggers `setSize` — docs/`src/renderers/WebGLRenderer.js`, 2026-07-04 — so both calls
must be paired with a restore or the live view stays at 4K). This is a straightforward
application of the resize contract already documented for responsive canvases ([Block 1]);
no new API surface, just driving `setSize`/`setPixelRatio` off-schedule for one still frame
`[INFER]` (composition of documented calls).

**B. Render-target readback (`readRenderTargetPixels`).** Render into an offscreen
`WebGLRenderTarget` sized independently of the visible canvas, then call
`renderer.readRenderTargetPixels(renderTarget, x, y, width, height, buffer, activeCubeFaceIndex,
textureIndex)` to pull raw pixels into a typed array (docs/pages/WebGLRenderer.html, 2026-07-04).
An async, non-blocking twin exists — `readRenderTargetPixelsAsync(...)`, which the docs
explicitly recommend using "whenever possible" over the synchronous version — and the pattern is
already demonstrated in the official GPU-picking example (`examples/picking-gpu`, 2026-07-04),
which renders to a 1×1 `WebGLRenderTarget` and reads it back for object-ID picking. The same
render→setRenderTarget(null)→readback sequence generalizes directly to full-frame offscreen
captures (bigger target, no canvas attachment needed at all) `[CERT-web]` (documented API) +
`[INFER]` (generalization from the 1×1 picking case to a full-frame capture case). This is the
[Block 13] §13.3 render-target machinery applied to delivery instead of IBL/mirrors.

**Tone-mapping caveat for readback**, from the official migration guide: since r155, "inline tone
mapping ... now only applies when rendering directly to the screen. For post-processing
workflows, `OutputPass` should be used to apply tone mapping and color space conversion" (wiki/
Migration-Guide 154→155, 2026-07-04). A render-target readback IS a non-screen target, so a raw
`readRenderTargetPixels` capture on a scene relying on `renderer.toneMapping` (none of this
corpus's prototypes currently set one — [Block 13] doesn't record a non-default value) will come
back tone-map-free unless an explicit `OutputPass`/output node is inserted in the chain
`[CERT-web]` + `[INFER]` (applying the documented screen-only scope to this corpus's capture use
case).

## 38.3 — Transparent-background captures `[CERT-web]`

For compositing hero shots into slides/proposals over a non-white background: construct with
`alpha: true` (default clear alpha becomes `0` instead of `1` — docs/pages/WebGLRenderer.html,
2026-07-04) and set `scene.background = null` (or never assign one) so nothing opaque is drawn
behind the geometry. The official transparent-canvas example additionally sets
`premultipliedAlpha: false` when compositing onto CSS content behind the canvas
(manual/examples/tips-transparent-canvas.html, 2026-07-04) — relevant if a capture is later
composited in a browser/CSS pipeline rather than a raster tool, since premultiplied vs.
straight alpha changes how edge pixels blend `[CERT-web]`.

**Caveat, tying back to §38.2**: tone mapping only applies "when rendering directly to the
screen" (wiki/Migration-Guide 154→155). A transparent capture taken via the render-then-capture
path (§38.1, canvas IS the screen target) keeps tone mapping active; the SAME transparent
composite produced via an offscreen render-target readback (§38.2-B) would not, unless an
`OutputPass`/output node is added — the two capture paths are not interchangeable once a
prototype adopts tone mapping `[INFER]` (combining the two documented scope rules).

## 38.4 — Batch capture harness: extending `tools/probe.mjs` `[CERT-hw]`

`tools/probe.mjs` ([Block 26]) already solves the hard environment problems for automating this
corpus: Chrome for Testing 150 via `puppeteer-core`, the `--use-angle=swiftshader
--enable-unsafe-swiftshader` flags required because default-flag WebGL context creation fails
under WSL (`BindToCurrentSequence failed` — [Block 26] §26.2), and serving prototypes over
`python3 -m http.server` because `file://` breaks ES-module CORS ([Block 26] §26.2, §26.4). This
block reuses that exact recipe in a new script, `tools/capture.mjs`, that swaps the GL-call-hook
instrumentation for a standardized screenshot per file:

- `page.setViewport({ width, height, deviceScaleFactor })` at 960×720 CSS / DPR 4 → a 3840×2880
  framebuffer, i.e. the §38.2-A supersampling technique applied through Puppeteer's viewport API
  rather than driving `renderer.setSize`/`setPixelRatio` directly — Puppeteer's device-scale-factor
  knob achieves the same oversized-framebuffer effect from outside the page `[INFER]` (Puppeteer
  API composition, verified live below).
- 9-second settle wait (same soak window `probe.mjs` uses before sampling frames) before capture,
  so shadow maps and any settle-in animation have run.
- `elementHandle.screenshot({ path })` on the `<canvas>` element — this is the render-then-capture
  path (§38.1): it reads Chrome's own compositor output for that element, so it needs no
  `preserveDrawingBuffer` flag and works unmodified against every existing prototype file.
- Per-prototype standardized shot: fixed CSS viewport/DPR pair is the harness's contribution;
  camera angle and framing per shot are [Block 37]'s thumbnail spec (written in parallel) — this
  harness is the delivery mechanism, B37 is the composition spec it will apply.

**Live test** `[CERT-hw]`: ran against `cuarto-3d.html` (server on port 8199 serving the repo
root, same SwiftShader flags) → produced a valid `3840×2880` 8-bit RGB PNG (850,796 bytes),
written only to the session scratch dir, confirming the harness works end-to-end without
touching any prototype file. One environment gotcha found beyond [Block 26]'s list: Node's ESM
resolver does NOT honor `NODE_PATH` for bare-specifier imports (`import puppeteer from
'puppeteer-core'` fails with `ERR_MODULE_NOT_FOUND` even with `NODE_PATH` set) — `puppeteer-core`
must be resolvable via a real `node_modules` ancestor directory (this session used the existing
npx package cache; a permanent setup would need a `package.json` + `npm install` in `tools/` or
the repo root) `[CERT-hw]` (observed failure + working alternative, both live).

## 38.5 — Golden-screenshot regression `[INFER assembled]`

No regression-testing tool is installed in this repo today ([Block 25] catalogued the optimize/
compress CLIs only; no visual-diff dependency was found). The recipe below assembles verified
parts, not an installed pipeline:

1. **Baseline set**: run `tools/capture.mjs` (§38.4) once per prototype at a fixed viewport/DPR,
   commit the PNGs (or store alongside, e.g. `sources/web-snapshots/baked-shadows-*.png` is
   already this corpus's precedent for committing prototype screenshots as evidence — three
   files exist today for the fix-writers' baked-shadow work).
2. **After a future change**: re-run the same harness against the same file(s) at the same
   viewport/DPR/settle-time (all three must match or the diff is meaningless — camera/DPR drift
   produces false positives `[INFER]`).
3. **Pixel-diff**: `pixelmatch(img1, img2, diff, width, height, { threshold })` — "the smallest,
   simplest and fastest JavaScript pixel-level image comparison library... features accurate
   anti-aliased pixels detection", ships a Node.js API (`PNG.sync.read` + `pixelmatch(...)` →
   mismatched-pixel count) and a CLI (`pixelmatch image1.png image2.png output.png 0.1`)
   (mapbox/pixelmatch README, preserved verbatim, 2026-07-04) `[CERT-a]`. `includeAA: false`
   (the default) already ignores anti-aliasing edge noise — relevant here since SwiftShader vs.
   real-hardware AA could differ slightly even for an unchanged scene `[INFER]` (cross-reference
   to [Block 26] §26.2's software-GPU caveat).
4. **Human review**: pixelmatch returns a mismatch count + optional diff image, not a pass/fail
   verdict — a threshold (e.g. "> N% pixels differ") should gate an automated check, but any flag
   still needs a human to confirm intentional-change vs. regression before re-baselining
   `[INFER]` (tool contract: it counts differences, it doesn't judge intent).
5. **Re-baseline** when the diff is confirmed intentional (geometry/material/lighting change,
   camera reframe from a [Block 37] spec update) — never silently on CI, since that would let a
   real regression become the new "expected" image `[INFER]` (standard golden-file discipline
   applied to this corpus).

This is not yet wired to any CI in this repo — the corpus has no test runner or CI config
found in prior blocks — so this section is a documented recipe (assembled `[INFER]`), not a
verified pipeline.

## 38.6 — The delivery kit per equipment `[INFER]`

Assembling this block's captures with the asset-pipeline blocks into what a studio would hand
over per prototype:

| Deliverable | Source | Spec/format |
|---|---|---|
| Hero PNG (4K) | `tools/capture.mjs` (§38.4), supersampled per §38.2-A/B | Transparent or composited background per §38.3; camera angle per [Block 37] |
| Turntable frames / GIF | Not built — would reuse `tools/capture.mjs`'s single-shot path over a rotation loop (N calls at incremented `camera`/`controls` azimuth), then external encoding (ffmpeg or similar) — out of scope here, noted as a gap | N × PNG frames → GIF/video, no dependency installed |
| `.glb` model | `GLTFExporter` ([Block 19] §19.2), optionally optimized ([Block 25] glTF-Transform/gltfpack) | Single-file binary glTF |
| Thumbnail | `tools/capture.mjs` at the [Block 37] standardized framing | Smaller fixed size than the hero shot, catalog-grid consistent |

Every row already has a verified mechanism from an existing block except the turntable
frames/GIF, which is a straightforward extension of §38.4's single-shot loop but was not built or
tested in this pass `[INFER]` (extrapolation, explicitly not exercised).

## 38.7 — Connections

- **[Block 26]** — the probe infrastructure (`tools/probe.mjs`, SwiftShader flags, HTTP-server
  requirement) this block's `tools/capture.mjs` directly extends; §38.4's live test reuses its
  exact environment recipe.
- **[Block 13]** §13.3 — render targets as an offscreen-thumbnail use case that §38.2-B and §38.3
  make concrete with the actual readback API and its tone-mapping scope caveat.
- **[Block 37]** (planned, parallel) — the camera-angle/framing spec that §38.4's harness and
  §38.6's thumbnail/hero rows are built to consume; this block is the delivery mechanism, B37 is
  the composition spec.
- **[Block 19]** / **[Block 25]** — the `.glb` leg of the delivery kit (§38.6), export then
  optional compression, alongside the PNG legs this block adds.
