# Block 13 — Rendering methods: loop styles, on-demand rendering, render targets, WebGPU/TSL

> Research of **how a three.js frame gets driven and where it can go**: the three render-loop
> styles, the official on-demand pattern (the biggest untapped fit for this corpus), offscreen
> render targets, and the WebGPURenderer/TSL track. Path-tracing and showcase techniques land in
> the G18 case-study block (sweeps in flight). Does NOT cover post-processing chains (G11).
>
> Sources: context7 `/mrdoob/three.js` (manual/webxr-basics, manual/examples/render-on-demand,
> docs/pages/Renderer, docs/pages/WebGLRenderer setNodesHandler, docs/llms.txt +
> examples/webgpu_postprocessing_anamorphic — queried 2026-07-04) · local prototypes.
> Method: context7 doc queries + corpus cross-reference. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 4 (cross-cutting, run 2). Connects [Block 1] §1.3, [Block 7] §7.3, [Block 11] §11.1.

---

## 13.1 — The three loop styles `[CERT-web]` / `[CERT]`

| Style | Mechanism | When | Corpus |
|---|---|---|---|
| Recursive `requestAnimationFrame` | self-scheduling callback | classic continuous rendering | **house standard**, all 23 files ([Block 1] §1.3) |
| `renderer.setAnimationLoop(fn)` | renderer-managed loop | **required for WebXR** ("replace requestAnimationFrame with renderer.setAnimationLoop... required for WebXR", manual/webxr-basics); also the style modern official examples default to | absent `[CERT]` (corpus grep — rAF only) |
| **On-demand** | render ONLY on `controls.addEventListener('change', render)` + `resize` | static scenes — zero GPU work while nothing moves | absent; blocked by `autoRotate` (§13.2) |

The official on-demand example is exactly the corpus's shape — OrbitControls + static meshes —
rendering only on interaction (manual/examples/render-on-demand, 2026-07-04) `[CERT-web]`.

## 13.2 — On-demand rendering: the corpus's biggest untapped method `[INFER]` (from cited parts)

The prototypes are static equipment models ([Block 11] §11.1): between interactions NOTHING
changes except `autoRotate` and small part animations (fans). Applying the official pattern
would drop GPU work to zero at rest — but three house habits currently force continuous
rendering: `autoRotate` ([Block 7] §7.3, needs `update()` per frame), animated parts
([Block 2] §2.3 Groups), and damping (inertia continues after input). Practical hybrid
`[INFER]`: render-on-demand while idle + temporarily continuous during damping/autoRotate/fan
animation — the official example proves the wiring; the corpus's baked-shadows evolution
([Block 5] §5.4) shows the team already thinks in "static ⇒ don't recompute" terms. This is the
frame-level sibling of that shadow decision.

## 13.3 — Render targets: frames that don't go to the canvas `[CERT-web]`

`renderer.render(scene, camera)` targets "the default framebuffer (meaning the canvas) or
alternatively a render target when specified via `setRenderTarget()`" (docs/pages/Renderer,
2026-07-04). The corpus already consumes this machinery indirectly: `PMREMGenerator.fromScene`
returns a `WebGLRenderTarget` whose `.texture` becomes `scene.environment` ([Block 4] §4.1).
Direct uses relevant to the pipeline `[INFER]` (documented capability + corpus needs):
offscreen thumbnails of equipment for catalogs/UI, mirrors/screens showing camera feeds, and
any post-processing chain (G11) — EffectComposer is render-targets under the hood.

## 13.4 — The WebGPU/TSL track `[CERT-web]`

Current official state (docs/llms.txt + examples, 2026-07-04):

- Dedicated builds: `three.webgpu.js` + `three.tsl.js` (importmap entries `three` → webgpu
  build, `three/tsl`), `import * as THREE from 'three/webgpu'` in examples.
- `WebGPURenderer` needs `await renderer.init()` before first render (async device setup).
- **TSL** (Three Shading Language) replaces raw GLSL for custom materials: node materials
  (`MeshStandardNodeMaterial`) with composable nodes — `material.colorNode =
  color(0x00ff00).mul(sin(time)...)`, `positionNode` for vertex displacement — and TSL-based
  post-processing (`bloom` from `three/addons/tsl/display/BloomNode.js`).
- Migration bridge: `WebGLRenderer.setNodesHandler(...)` "enables using TSL node materials to
  prepare for migration to WebGPURenderer" — TSL can be adopted BEFORE switching renderers.

Corpus fit `[INFER]`: nothing in the two-pass workflow requires WebGPU today (stock materials,
no custom shaders — [Block 1] §1.4); the value arrives if the team wants custom surface effects
(TSL instead of the GLSL the corpus never wrote) or compute-heavy scenes. The r160 pin predates
the mature `three/webgpu` entry point — a WebGPU experiment implies the version bump analyzed
in [Block 10] §10.5.

## 13.5 — Connections

- **[Block 1]** §1.3 — the rAF loop this block generalizes.
- **[Block 5]** §5.4 / **[Block 11]** §11.4 — the "static ⇒ don't recompute" family §13.2 extends.
- **[Block 7]** §7.3 — autoRotate/damping constraints on on-demand rendering.
- **G11 (open)** — post-processing = render-target chains (§13.3).
- **G18 (sweeps in flight)** — path tracing and showcase render methods land there.
