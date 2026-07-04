# Block 27 — Performance budgets per device class

> Research of **performance budgets**: turning [Block 26]'s measured draw-call/triangle baseline
> into target ceilings per device class (desktop-integrated, desktop-dGPU, mobile mid-range,
> mobile ProMotion), anchored to published WebGL/mobile guidance. This is a DESIGN/APPLIED
> block — most content is `[INFER-assembled]` synthesis over cited primary numbers, not new
> primary discovery; that ratio is expected and declared honestly in the self-verify tally.
> Does NOT re-measure FPS (still deferred to real hardware, [Block 26] §26.4) — this block
> converts what IS measured (draws, triangles) plus documented industry ceilings into budgets.
>
> Sources: MDN `WebGL_best_practices` (preserved `sources/web-snapshots/developer.mozilla.org_en-US_docs_Web_API_WebGL_API_WebGL_best_practices.md`) ·
> Unity `docs.unity3d.com/Manual/webgl-performance.html` (preserved `sources/web-snapshots/docs.unity3d.com_Manual_webgl-performance.html.md`) ·
> threejsroadmap.com "Draw Calls: The Silent Killer" (preserved `sources/web-snapshots/threejsroadmap.com_blog_draw-calls-the-silent-killer.md`) ·
> [Block 26] (local `[CERT-hw]` measurements) · [Block 11] §11.4 (playbook) · [Block 20] §20.1
> (120Hz) · [Block 5] (shadow-map ladder) · [Block 14] §14.1 (quality-toggle pattern).
> Method: WebSearch + WebFetch with preserve-first protocol (fetch-doc.sh web) for citable pages;
> synthesis table built by applying those ceilings to B26's numbers. Markers: `[CERT]` local
> file:line · `[CERT-hw]` live measurement (from B26) · `[CERT-web]` official web (URL+date) ·
> `[CERT-a]` secondary/blog · `[INFER]` deduction · `[INFER-assembled]` design synthesis over
> multiple cited inputs.
>
> Layer 6 (run 4). Connects [Block 26], [Block 11] §11.4, [Block 5], [Block 17], [Block 20] §20.1.

---

## 27.1 — Frame-time math: why draw calls and triangles cost differently `[CERT-web]` / `[INFER]`

| Budget | ms/frame | Notes |
|---|---|---|
| 60 Hz | 16.6 ms | standard desktop/most-mobile refresh; the corpus's implicit target until now (no FPS measured, [Block 26] §26.2) |
| 120 Hz | 8.3 ms | half the headroom; ProMotion iPhones/iPads and some Android flagships |

Two costs live in that budget, and they do not trade off 1:1:

- **Draw calls → CPU-bound.** Unity's WebGL performance guide states plainly: "the CPU side
  dispatch of WebGL operations is slower than in native OpenGL. As a result, for best
  performance, the recommended best practice is to avoid large numbers of draw calls per
  frame" (`docs.unity3d.com/Manual/webgl-performance.html`, fetched 2026-07-04) `[CERT-web]`.
  Each `drawElements`/`drawArrays` call forces the driver to validate state, bind buffers, and
  cross the JS→WASM/native boundary — overhead paid **per call**, independent of how many
  triangles that call draws `[INFER]` (mechanism, consistent with the corpus's own probe
  methodology in [Block 26], which counts calls not vertices for this exact reason).
- **Triangles → GPU-bound**, and modern GPUs (even mobile ones) chew through far more of them
  per call than the draw-call ceiling would suggest: threejsroadmap.com's synthesis of this same
  tradeoff notes a 1000-cube scene (12,000 triangles, 1000 draws) runs *slower* than a
  100,000-triangle single mesh (1 draw) — "you'll hit the *draw call* limit long before you hit
  the GPU's triangle rendering limit" (`threejsroadmap.com/blog/draw-calls-the-silent-killer`,
  fetched 2026-07-04) `[CERT-a]` (blog synthesis, not an engine vendor — flagged honestly per
  METHODOLOGY §3).

Practical read for this corpus `[INFER]`: [Block 26]'s voxel files (379-737 draws, >500k
triangles) sit in the "GPU-heavy, CPU-cheap" quadrant; the realistic files (1,539-2,747 draws,
80k-311k triangles) sit in the "CPU-heavy" quadrant — exactly inverted profiles, which is why
[Block 11] §11.4's playbook leads with draw-call consolidation (BatchedMesh/merge) for the
realistic pass and would lead with triangle/LOD reduction for the voxel pass if it needed to run
on constrained GPUs.

## 27.2 — Published draw-call/triangle guidance `[CERT-web]` / `[CERT-a]`

| Source | Guidance | Status |
|---|---|---|
| MDN `WebGL_best_practices` §"Batch draw calls" | "Batching draw calls into fewer, larger draw calls will generally improve performance" — no numeric ceiling given, but names instancing, texture atlasing, and degenerate-triangle strip merging as the mechanisms (fetched 2026-07-04) | `[CERT-web]` official, qualitative only |
| Unity WebGL manual | "Avoid large numbers of draw calls per frame... make sure that both instancing and batching techniques are used" — again qualitative, no fixed number, because Unity's own number depends on target hardware (fetched 2026-07-04) | `[CERT-web]` official engine vendor, qualitative |
| threejsroadmap.com | Concrete numeric rule of thumb: "**under 100 draw calls per frame for smooth performance on most hardware**. If you're seeing 500+, it's time to optimize" | `[CERT-a]` blog, NOT an engine vendor — the only source in this sweep with a hard number, treat as a rough community heuristic not a spec |
| General mobile-WebGL round-ups (pixelfreestudio.com, gamedevjs.com) | "Fewer than 500 draw calls" cited as a practical OpenGL ES mobile guideline; mobile GPUs are "less powerful" and "less capable of... multiple heavy operations simultaneously" | `[CERT-a]` secondary blogs, consistent with each other but none is an engine/spec vendor |

Honest synthesis `[INFER]`: no Khronos or WebGL spec document publishes a fixed draw-call number
(the spec doesn't know your hardware) — every numeric ceiling found is a **community or
single-vendor heuristic**, not a portable law. The convergent range across sources is roughly
**~100 draws/frame as a "comfortable" desktop/mobile-safe target, ~500 as a "worth investigating"
warning line, and >1000 as clearly CPU-bound on most devices** — this range is what §27.4's
budget table is built from, and it is explicitly `[INFER-assembled]` from secondary sources, not
a `[CERT-web]` spec ceiling.

## 27.3 — Adaptive-quality patterns already in the corpus's playbook `[CERT]` / `[INFER]`

Rather than a single fixed budget, the documented pattern is a **quality ladder** that degrades
gracefully when the device can't hit the frame budget:

1. **Pixel-ratio scaling** — `setPixelRatio(Math.min(devicePixelRatio, 2))`, already the corpus
   standard in 20 files ([Block 11] §11.1) `[CERT]`. Fragment/fill-rate cost scales with
   rendered-pixel count, so this is the cheapest lever and the first rung of any adaptive-quality
   ladder — could be dropped further (e.g. cap 1 or 1.5) on the mobile tiers below `[INFER]`.
2. **Effect/quality toggles** — little-landscapes exposes GTAO/2-tone/godrays as UI toggles
   ([Block 14] §14.1) `[CERT-a]`, i.e. a per-effect on/off ladder rather than a single global
   quality slider; directly reusable pattern for an HVAC viewer with a "low/medium/high" preset
   that flips shadow type, AO, and AA together `[INFER]`.
3. **Shadow map size ladder** — the corpus already runs three rungs: 2048² house standard →
   1024² "perf-dialed voxel" → 512² secondary spotlight ([Block 5] §5.4/§11.1) `[CERT]`; this is
   the most concrete existing precedent for a device-tiered quality system and maps directly
   onto §27.4's tiers below (e.g. mobile tiers default to the 1024²/512² rungs, desktop-dGPU to
   2048²+) `[INFER]`.
4. **Dynamic resolution** (documented pattern, not yet in the corpus): render at a lower
   internal resolution than `CSS size × devicePixelRatio` and let the browser upscale — the same
   fill-rate lever as (1) but adjustable at runtime based on measured frame time, rather than a
   static cap chosen once. Not currently implemented anywhere in the corpus `[INFER]`
   (absence — no dynamic/adaptive-resolution code found in the corpus grep during earlier
   blocks); flagged here as the natural next rung above the static DPR cap for a real
   quality-tier system.

## 27.4 — Budget tables by device class `[INFER-assembled]`

Built by applying §27.2's convergent ranges and [Block 20] §20.1's 120Hz-budget note to
[Block 26]'s measured numbers. **These are targets synthesized for this corpus, not a spec or
vendor-published table** — declared as `[INFER-assembled]` design work, the expected and
appropriate marker for a budgets/applied block.

| Device class | Frame budget | Draw-call ceiling (target) | Triangle ceiling (target) | Texture-memory note |
|---|---|---|---|---|
| Desktop, integrated GPU (e.g. Intel/AMD APU) | 16.6 ms | ~500-800 | ~1-2M | shared system RAM; KTX2/compressed textures ([Block 17] §17.x) still help bandwidth, less critical for capacity |
| Desktop, discrete GPU | 16.6 ms | ~1000-1500 | ~3-5M+ | dGPU VRAM headroom; the corpus's current realistic-pass draws (1,539-2,747) sit AT or ABOVE this ceiling already |
| Mobile, mid-range (typical Android/older iPhone, 60 Hz) | 16.6 ms | ~300-500 | ~300-500k | mobile GPUs are tile-based deferred renderers — very sensitive to overdraw and shadow-pass duplication ([Block 26] §26.2 point 2), which doubles draw count for every shadow caster |
| Mobile, ProMotion/120 Hz (iPhone 13 Pro+, some Android) | 8.3 ms | ~150-250 | ~150-250k | half the desktop-mobile-mid budget per [Block 20] §20.1's per-frame-work-doubles-at-120Hz lesson; the tier most exposed to jank if per-frame JS work (not just GPU work) isn't trimmed too |

**Gap check against [Block 26]'s measured numbers** `[INFER-assembled]`:

| Prototype | Measured draws (B26) | Measured tris (B26) | Verdict vs mobile-mid ceiling (~400 draws / ~400k tris) | Lever that closes the gap |
|---|---|---|---|---|
| `cuarto-frio-plano-realistic (6).html` | **2,747** | 311,447 | **draws ~7× over** ceiling; triangles within budget | BatchedMesh/merge per palette ([Block 11] §11.3) — the corpus's dominant measured cost |
| `trane-rtu-realistic-v10.html` | 1,539 | 126,043 | draws ~4× over; triangles fine | Same lever + shadow-baking backport ([Block 5] §5.4) |
| `cuarto-3d.html` (baked shadows) | 1,013 | 80,435 | draws ~2.5× over, closest of the realistic set to the ceiling | Confirms baked shadows are the cheapest partial win ([Block 26] §26.3) — still needs BatchedMesh to clear the ceiling fully |
| `voxel/trane-rtu-voxel__6_ (3).html` | 737 | **506,281** | draws within budget; **triangles ~25% over** on mobile-mid, ~3× over on ProMotion | LOD/simplify ([Block 17] §17.2) or `instanceColor` consolidation ([Block 2] §2.3, [Block 11] §11.4 item 2) to cut per-instance triangle count, not draw count |
| `voxel/cuarto-frio-voxel (18).html` | 379 | **530,493** | draws within budget; triangles ~30% over mobile-mid, worst-case for ProMotion | Same LOD lever; also the shadow-pass doubling ([Block 26] §26.2 point 2) is a bigger relative cost here since draws are already low |

Reading the table `[INFER]`: the realistic pass's bottleneck is **draw calls** (BatchedMesh is
the single highest-leverage fix, matching [Block 11] §11.4's reordered priority-1 item); the
voxel pass's bottleneck is **triangles** (LOD/simplify and instanceColor collapse are the
matching levers) — neither pass is bottlenecked on both axes at once, which is why a single
"reduce everything" instruction would be wrong advice for this corpus; the fix has to be
picked per pass.

## 27.5 — Measurement protocol for real hardware `[CERT]` / `[INFER]`

`tools/probe.mjs` (committed, used to produce [Block 26]) is the reusable instrument:
`node tools/probe.mjs "<file>" ...` against a served URL (`python3 -m http.server 8123` in the
repo root — `file://` fails ES-module CORS, [Block 26] §26.2 point 3) `[CERT]`. On real hardware
it also reports true `fps` (the field is already computed and returned, just excluded from
[Block 26]'s table because that run's GPU was software) `[CERT]`.

Two additions for a hardware run, both changes to method not to the probe script itself:

1. **Cross-check against `renderer.info`** rather than trusting only the injected GL-call
   counter: `renderer.info.render.calls` / `.triangles` are the engine's own bookkeeping
   ([Block 11] §11.1 notes this hook is unused in app code today) `[CERT]` — running both in
   parallel on one real-hardware pass validates the probe's draw/triangle math against the
   library's own count before trusting the budget table above on a new device.
2. **Target 120 Hz explicitly on ProMotion devices**, per [Block 20] §20.1 — a real-hardware
   probe run on an iPhone Pro/iPad Pro should report against the 8.3 ms budget, not assume 60 Hz
   just because the desktop dev machine is 60 Hz `[INFER]` (the forum lesson generalizes: profile
   at the device's native refresh, not a default assumption).

## 27.6 — Connections

- **[Block 26]** — the measured baseline this block turns into targets; §27.4's gap table cites
  its numbers directly.
- **[Block 11]** §11.4 — the playbook whose priority order this block's gap analysis confirms
  (BatchedMesh for realistic, LOD/instanceColor for voxel).
- **[Block 5]** — shadow-map size ladder, reused as the concrete precedent for a device-tiered
  quality system in §27.3.
- **[Block 17]** §17.2 — LOD/simplify, the lever for the voxel pass's triangle-budget overage.
- **[Block 20]** §20.1 — the 120Hz-budget lesson this block's mobile-ProMotion tier and §27.5's
  measurement note both build on.
- **G28 (next, run 4)** — Blender round-trip; independent of this block's budgets.
