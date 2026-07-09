# Block 26 — DYNAMIC PHASE: measured baseline of the prototypes (live browser probes)

> **First dynamic-phase block of this corpus (METHODOLOGY §12)**: real measurements of 5
> representative prototypes running in a real Chrome, with GL-call hooks injected BEFORE page
> scripts. Read-only probes (rung 1 of the invasiveness ladder); driver-supervised, not
> loop-blind. Numbers below are `[CERT-hw]` — measured against the live system, with the
> environment caveats stated honestly in §26.2.
>
> Sources: live probe runs 2026-07-04 (Chrome for Testing 150, Puppeteer, SwiftShader software
> GL — script preserved at `tools/probe.mjs`) over `http://localhost:8123/` serving this repo.
> Method: `evaluateOnNewDocument` wraps `drawElements/drawArrays(+Instanced)` on both WebGL
> context prototypes counting per-rAF-frame draws and triangles (instanced draws multiply by
> instance count); median over the last valid frames; heap via `performance.memory`.
> Markers: `[CERT-hw]` live measurement · `[CERT]` local file:line · `[CERT-web]` official ·
> `[INFER]` deduction.
>
> Layer 6 (run 4). Connects [Block 8] §8.4, [Block 11], [Block 5] §5.4, [Block 17].

---

## 26.1 — The measurements `[CERT-hw]`

Viewport 1280×900, DPR 1, WebGL2 in all cases (probe runs 2026-07-04):

| Prototype | Draw calls / frame (median) | Triangles / frame (median) | JS heap |
|---|---|---|---|
| `trane-rtu-realistic-v10.html` | **1,539** | 126,043 | 16 MB |
| `voxel/trane-rtu-voxel__6_ (3).html` | 737 | **506,281** | 9 MB |
| `cuarto-frio-plano-realistic (6).html` | **2,747** | 311,447 | 25 MB |
| `cuarto-3d.html` (baked shadows, PCF) | 1,013 | 80,435 | 13 MB |
| `voxel/cuarto-frio-voxel (18).html` | 379 | **530,493** | 12 MB |

Sampling note: 5 of 25 files — the paired trane-rtu (both passes), the largest realistic plan,
and both esbuild giants; chosen to span both families and both shadow strategies (declared
sample, not the full corpus).

## 26.2 — Environment caveats (read before using the numbers) `[CERT-hw]` / `[INFER]`

1. **GPU is software** (SwiftShader/Vulkan under WSL; the GL string is in every probe result).
   → **FPS is NOT representative** (≈1 fps here) and is deliberately excluded from §26.1.
   **Draw-call and triangle counts ARE exact** — they are API-call counts, GPU-independent
   `[INFER]` (counter semantics). Real-hardware FPS must be measured on target devices (G27).
2. **Counts include the shadow pass**: with `shadowMap.autoUpdate` default-on, every
   shadow-casting mesh is drawn twice per frame (depth pass + main). `cuarto-3d.html` bakes
   shadows once ([Block 5] §5.4), which is part of why it draws fewer calls than the older
   realistic files despite being the biggest scene `[INFER]` (mechanism + measured contrast).
3. WebGL context creation FAILED in this Chrome under default flags (Mesa/llvmpipe ANGLE,
   `BindToCurrentSequence failed`) — probes required `--use-angle=swiftshader
   --enable-unsafe-swiftshader`. Recorded as an environment gotcha for future dynamic phases;
   also `file://` cannot run the prototypes at all (ES-module CORS) — a local HTTP server is
   mandatory `[CERT-hw]` (both failures observed live before the fix).

## 26.3 — What the numbers prove (predictions → evidence) `[CERT-hw]` vs prior `[INFER]`

| Prior claim | Verdict |
|---|---|
| Realistic pass is draw-call-bound, part count = pressure ([Block 8] §8.4, inferred) | **CONFIRMED**: 1,539-2,747 draws/frame — an order of magnitude above the voxel pass; 2,747 in a single static scene is the corpus's hottest number |
| Voxel instancing collapses draws ([Block 2]) | **CONFIRMED**: 379-737 draws for scenes with tens of thousands of voxels |
| but voxel pass is triangle-heavy | **NEW finding**: >500k tris/frame — every unit cube's 12 triangles × instances × shadow pass; LOD/simplify ([Block 17] §17.2) and shadow-pass exclusions are the levers |
| Baked shadows are a real win ([Block 5] §5.4) | **SUPPORTED**: cuarto-3d posts the lowest realistic draw count (1,013) with the biggest scene — shadow-pass elimination shows up directly in the counter |

Priority update for the [Block 11] §11.4 playbook `[INFER]` (from the measured deltas): the
per-palette BatchedMesh/merge consolidation for the REALISTIC pass jumps from item 3 to item 1
— 2,747 draws is the corpus's dominant measured cost; baked-shadow backport remains the
cheapest fix and now has a measured mechanism behind it.

## 26.4 — Reproducibility

`tools/probe.mjs` (committed) + `python3 -m http.server 8123` in the repo root +
`node tools/probe.mjs "<file>" ...`. On real hardware (user's Windows Chrome via the browser
MCP's `--browserUrl` mode, or any desktop/mobile device pointed at the served URL), the same
script yields hardware-true FPS to complete G27's budgets.

## 26.5 — Connections

- **[Block 5]** §5.4 / **[Block 11]** §11.4 — playbook items now backed by measurements.
- **[Block 8]** §8.4 — the part-count prediction this block confirms.
- **[Block 17]** §17.2 — voxel triangle load makes voxel-as-far-LOD concrete.
- **G27 (next)** — turns this baseline + device classes into budgets.
