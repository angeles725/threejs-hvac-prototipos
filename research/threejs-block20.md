# Block 20 — Forum intelligence: problems, solutions, and techniques from the community

> Research of **community threads as a problems/solutions source** (G21): one Reddit perf
> thread + five discourse.threejs.org threads + the forum itself as an ongoing resource.
> Everything below is SECONDARY-source material (`[CERT-a]`) — valuable for gotchas and
> field-tested techniques, to be escalated against primary sources before load-bearing use
> (METHODOLOGY §3 rule).
>
> Sources: preserved snapshots in `sources/web-snapshots/` (old.reddit.com fallback for the
> bot-blocked www.reddit.com — noted in SOURCES.md; all 6 discourse fetches direct, Discourse
> serves crawler HTML). Fetched 2026-07-04.
> Method: delegated sweep (general-purpose · sonnet) with preserve-first protocol; driver
> consolidation. Markers: `[CERT]` local · `[CERT-web]` official web · `[CERT-a]` secondary
> (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 3). Connects [Block 9] §9.4, [Block 11], [Block 15] §15.2, [Block 18].

---

## 20.1 — Mobile gotchas (the corpus's blind spot) `[CERT-a]`

**iOS float-texture filtering — the load-bearing one** (discourse 91641, "Sacred Pearl" by
prisoner849): geometry driven by float `DataTexture`s failed to render on iPhone (Safari AND
Chrome). Root cause: **unreliable iOS support for `LinearFilter` on `FloatType` DataTextures**.
Two verified fixes from the thread: switch those textures to `NearestFilter`, or better,
**use `HalfFloatType` (`Uint16Array`) instead of `FloatType`** — which restored LinearFilter
and worked on iPhone, PC, and Android. Rule of thumb for the corpus `[INFER]`: any future
GPGPU/LUT/noise DataTexture that needs linear sampling and targets iOS should default to
HalfFloatType.

**ProMotion 120 Hz frame budgets** (reddit 1ujp6bb, `web-snapshots/old.reddit.com_r_threejs_comments_1ujp6bb_threejs_animation_laggy_on_iphone_17_p.md` — weak signal, single-reply thread):
animation laggy on iPhone 17 Pro yet smooth on iPhone 12 mini. Diagnosis: React state updates
inside the render loop (`setState` in R3F's `useFrame`) — tolerable at 60 Hz, jank at 120 Hz
where render-triggered work doubles per second; fix: write animated values directly to objects,
never through per-frame state. The corpus is vanilla JS (not React), so the specific
anti-pattern doesn't apply `[INFER]` — but the general lesson does: **per-frame work that
barely fits a 60 Hz budget silently blows up on 120 Hz ProMotion devices**; mobile profiling
should target 120 Hz, not 60.

## 20.2 — Field-tested techniques from Resources/Showcase `[CERT-a]`

| Thread | Technique | Corpus fit |
|---|---|---|
| VAT 3.0 for WGSL (92245) + `manthrax/three-vat` WebGL2 port | Houdini-baked per-instance animation sampled from textures in the vertex shader (rigid/soft/particles; interpolation + shadows fixed in-thread; gotcha: 8-bit color + 32-bit float data mix risks gamma corruption on export) | **Moderate-high**: same GPU-instancing family as the voxel pass ([Block 2]) — per-instance motion (fans, vibration, many units with variation) without CPU mixers `[INFER]` |
| SlugText GPU text renderer (90599) | Lengyel's Slug algorithm ported to three.js: glyph curves in a texture, one quad per glyph, ShaderMaterial + MeshStandardMaterial variants, fully preloadable (vs troika async races); known limits: no batching per string, hand-tuned AA window | Low-moderate: crisp in-scene equipment labels/callouts across zoom — the upgrade over DOM overlays ([Block 1] §1.3) and canvas nameplates ([Block 9]) if labels enter the 3D scene |
| Volumetric lighting in WebGPU (87959) | Froxel **3D-LUT** (Hillaire/Wronski papers): pre-integrate scattering into a frustum-aligned 3D texture — "sub-1ms even on 10-year-old hardware", 1 lookup at shade time. Author's critique of the official post-process raymarch example (PR #30530): more per-pixel cost, silhouette aliasing, extra compositing bandwidth — "build a 3D lookup table separately, then just sample it" | Low today; the architectural lesson (LUT-over-postprocess) is the transferable part if steam/vapor visualization ever lands — and it fits the corpus's no-composer architecture better than a volumetric pass `[INFER]` |
| Mixos texture painter (92552) | UV-space raycast painting into PBR layer stacks; WebGPU compositing; GLB/USD round-trip (thin, promotional — 3 posts) | Low: proves in-browser damage/material annotation on equipment is a workable pattern |

## 20.3 — discourse.threejs.org as an ongoing source `[CERT-a]`

Four categories drive the forum: **Showcase** (demos, dominant volume), **Questions**
(StackOverflow-style problem/solution — where API gotchas like §20.1's iOS bug surface),
**Resources** (libraries/ported algorithms — VAT, Slug), **Jobs**. Cross-cutting tags
(`webgpu`, `shaders`, `textures`, `voxel`, `fonts-text`) at `/tag/<name>`. Core maintainers
(Mugen87, sunag) respond in-thread (seen in 87959), which makes Questions threads reliable for
version-specific behavior. Search routes: `site:discourse.threejs.org <topic>`, the native
`/search?q=`, or tag pages. Practical fetch note for future sweeps `[CERT-a]`: Discourse
serves server-rendered crawler HTML (and `/raw/<topic-id>`) — no bot-block, unlike Reddit
(www blocked; `old.reddit.com` worked).

## 20.4 — Connections

- **[Block 9]** §9.4 / **[Block 3]** — texture-type and filtering contracts §20.1 extends to iOS.
- **[Block 2]** / **[Block 15]** §15.2 — the instancing family VAT belongs to.
- **[Block 18]** — the composer §20.2's volumetric-LUT lesson argues around.
- **[Block 11]** §11.1 — mobile/120 Hz belongs in the perf budget conversation.
- **G20 (pending)** — showcase batch III lands in the next block.
