# Block 34 — Motion design 3D with intent: easing, animation machinery, cinematic camera, state micro-animations

> Research of **deliberate motion design** for the HVAC equipment-viewer prototypes: easing/timing
> foundations from UX motion-design literature, the three.js animation machinery actually
> available (`AnimationMixer`/`AnimationClip`/`KeyframeTrack`, `MathUtils.damp`/`smoothstep`, and
> their interaction with on-demand rendering), cinematic camera transitions (preset-to-preset,
> orbit tours, focus-on-part), and a synthesis for animating the HVAC-viewer state changes already
> queued elsewhere in this corpus (exploded views, door/panel opens, damper/louver moves). Does
> NOT cover render-loop mechanics themselves beyond their animation interaction ([Block 13]) or
> re-derive the exploded-view/X-ray FEATURE checklist itself ([Block 29] §29.6, which this block
> gives timing/technique to).
>
> Sources: nngroup.com/articles/animation-duration (preserved, `sources/web-snapshots/`) ·
> context7 `/mrdoob/three.js` (docs/pages/MathUtils, docs/pages/AnimationMixer +
> docs/pages/AnimationAction, manual/animation-system, examples/misc_animation_keys +
> examples/webgl_loader_gltf, docs/pages/Spherical + docs/pages/Quaternion +
> examples/jsm/controls/OrbitControls.js — queried 2026-07-04) · local prototypes (corpus-wide
> greps for tween/easing/`AnimationMixer`/`damp`/`smoothstep`/`setView` usage, 2026-07-04).
> Method: `fetch-doc.sh web` preservation + context7 doc queries + corpus grep/read verification.
> Markers (canonical list: METHODOLOGY §3):
> `[CERT]` local primary source (`file:line`) · `[CERT-doc]` official downloaded document
> (`sources/...pdf §N`) · `[CERT-web]` official web (URL + date) · `[CERT-a]` secondary
> source/forum (URL, preserved) · `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 5, cross-cutting into rendering machinery). Connects [Block 29] §29.6
> (exploded views/toggles this block gives timing to), [Block 13] §13.2 (on-demand rendering
> interaction), [Block 7] §7.3 (OrbitControls contract camera tours build on), [Block 15] §15.2
> (VAT/TSL day already lerping/tweening), [Block 5] §5.4 (shadow re-bake rule that damper/louver
> animation must respect), [Block 19] §19.1 (Box3 auto-framing recipe for focus-on-part).

---

## 34.1 — Easing/timing foundations `[CERT-a]`

Nielsen Norman Group's UX-animation execution guide (preserved,
`sources/web-snapshots/www.nngroup.com_articles_animation-duration_.md`, published 2020-02-09,
fetched 2026-07-04) is the one solid preserved source for this section:

| Concern | Guidance | Citation |
|---|---|---|
| Typical UI-scale duration | "duration of most animations should be in the range of 100–500 ms" | snapshot line ~307 |
| Micro-feedback (button press, small state flip) | "roughly 100 ms (0.10 seconds) in total duration... creates the illusion of physically manipulating the object" | snapshot line ~314-317 |
| Larger on-screen move (panel/window entering view) | "200–300 ms can be appropriate" | snapshot line ~323 |
| Upper bound / big movement | "At 500ms, animations start to feel like a real drag... a range of 100–400 ms is appropriate, with 400ms being a very slow animation, to be used only for **big movements across large screens**" | snapshot line ~328-331 |
| Easing families | "ease-in (starts moving slowly, then speeds up), ease-out (slows down at the end), or... ease-in-out (fastest in the middle)" | snapshot line ~353-357 |
| Which family for which direction | "ease-out on entrance... allow[s] the eye to predict where it will stop"; ease-in reserved for **exiting**/leaving elements; mismatching the two reads as "confusing and contradictory" | snapshot line ~359-376 |

`[INFER]` **applying this to scene-scale (3D camera/object) moves, not just 2D UI widgets**: NNG's
own upper tier — "big movements across large screens", 400-500ms — is the closest documented
anchor for 3D-scene-scale motion (a camera crossing an entire equipment model, a whole assembly
exploding), which is categorically a bigger move than a button or panel; extending the same family
logic further out (600-1200ms) for scene-scale is a reasoned extrapolation, not a value NNG states
directly — flagged honestly, not asserted as NNG's own number (see §34.5).

`[INFER]` **the 12-principles subset that transfers to technical viz** (Johnston & Thomas'
classical animation principles, widely summarized; no dedicated primary source fetched for this
specific claim — general animation-theory synthesis, not attributed to the NNG source above):

- **Slow-in/slow-out** — literally the ease-in-out family above; the corpus already needs this for
  any camera/exploded/panel transition so it doesn't feel mechanical.
- **Anticipation** — a tiny counter-motion or pause before the main move (e.g., a damper louver
  easing back 2-3° before swinging open) signals "this is about to move" before it does; useful for
  hotspot-triggered state changes where the user needs a beat to register cause→effect.
- **Staging** — only one thing should visibly change at a time / the important motion should read
  clearly against a calm background; directly supports the exploded-view "one uniform driving all
  parts" convention already found in [Block 29] §29.1 rather than independent per-part timings
  that compete for attention.

## 34.2 — three.js animation machinery: clips vs. per-frame tweens `[CERT-web]`

**The clip-based system** (docs/pages/AnimationMixer, docs/pages/AnimationClip,
docs/pages/AnimationAction, manual/animation-system, examples/misc_animation_keys, 2026-07-04):

| Piece | Contract |
|---|---|
| `KeyframeTrack` (Vector/Quaternion/Number/Color/Boolean/String) | a named, timed property track — e.g. `new THREE.VectorKeyframeTrack('.position', times[], values[])`; rotation MUST use `QuaternionKeyframeTrack` on `.quaternion` ("Interpolating Euler angles... is currently not supported") |
| `AnimationClip` | `new THREE.AnimationClip(name, duration, tracks[])` — a bundle of tracks; `duration < 0` auto-computes from track times |
| `AnimationMixer` | `new THREE.AnimationMixer(rootObject)` — one per animated root; `mixer.update(deltaSeconds)` must run every frame the animation should advance |
| `AnimationAction` | `mixer.clipAction(clip)` returns a playable handle (`.play()`); supports looping/chaining/cross-fade |

**When tween-style per-frame interpolation beats clips** `[INFER]` (contract comparison): clips
are built for **authored, multi-track, possibly-looping animation with blending** — their natural
source is an imported GLTF's `mesh.animations` array (`AnimationClip.findByName`,
manual/animation-system) or hand-authored `KeyframeTrack`s. The corpus's actual shape is neither:
zero GLTF import today ([Block 1] §1.4, [Block 19] §19.1 covers glTF import as a FUTURE pipeline
leg) and every state transition is a single scalar or vector going from A to B once (camera move,
explosion value, door angle) — exactly the shape `THREE.MathUtils.damp`/`lerp`/`smoothstep` solve
per-frame without the mixer/clip/track machinery's authoring overhead. Corpus-wide grep confirms
this split is not hypothetical: **zero app-code calls** to `new THREE.AnimationMixer`,
`mixer.clipAction`, or `THREE.MathUtils.damp(` exist anywhere in the 30+ prototypes (2026-07-04
sweep) — every `AnimationMixer`/`KeyframeTrack`/`damp`/`smoothstep` hit in the corpus is a
**library-internal definition** inside the bundled three.js source (e.g.
`voxel/cuarto-frio-voxel (18).html:757-761` defines `damp()` as part of the bundled `MathUtils`
export, never called by app code; same for `smoothstep`/`smootherstep` at `cuarto-3d.html:775,
897-898`, which only appear inside bundled GLSL chunk strings — fog, iridescence, spot-light
falloff — not from any app-level easing call) `[CERT]`. The corpus already has the tool sitting in
every bundled build; nobody has called it yet — the same "documented capability, zero adoption"
shape as [Block 5] §5.4's `shadowMap.autoUpdate` and [Block 13] §13.2's on-demand rendering.

**`MathUtils.damp`/`smoothstep`/`smootherstep` contracts** (docs/pages/MathUtils, 2026-07-04):

| Function | Signature | Behavior |
|---|---|---|
| `.damp(x, y, lambda, dt)` | number → number | "smoothly interpolate a number from x to y in a spring-like manner... frame rate independent movement" (citing Rory Driscoll's damping-using-lerp method); higher `lambda` = more sudden |
| `.smoothstep(x, min, max)` | number → [0,1] | Hermite-smoothed percentage of `x` between `min`/`max`, eased at both ends |
| `.smootherstep(x, min, max)` | number → [0,1] | same shape, zero 1st/2nd-order derivatives at the ends — smoother start/stop than `smoothstep` |

`smoothstep`/`smootherstep` are the built-in ease-in-out curve the corpus needs for exploded-view
scalars and door/damper angles (§34.4) with **no external tween library and no new dependency** —
just a call the corpus already ships but has never invoked from app code `[INFER]` (contract +
absence-grep combination).

**The on-demand-rendering interaction** `[CERT via Block 13]`: [Block 13] §13.2 already
establishes that on-demand rendering (render only on `controls.addEventListener('change', ...)` +
resize) is absent from the corpus today, blocked in part by animated parts. Any per-frame tween
(clip- or damp-based) is, structurally, exactly the same forcing function §13.2 names for
`autoRotate`/damping: **while a tween's `t` is still `< 1`, the render loop must keep scheduling
frames even if on-demand rendering is otherwise active; once `t >= 1` the tween must stop
scheduling itself and hand control back to the idle/event-driven state** — the same hybrid rule
§13.2 proposes for damping/autoRotate/fan animation extends verbatim to exploded-view, camera-tour,
and door/damper tweens. This is not hypothetical wiring: the corpus already contains ONE
self-terminating tween loop that does exactly this shape today (`if (t < 1) requestAnimationFrame(step);`
— see §34.3), it is just currently layered underneath an always-on rAF loop rather than an
on-demand one, since the corpus has no on-demand rendering yet `[CERT]` (grep + read, 2026-07-04).

## 34.3 — Cinematic camera: presets, tours, and focus-on-part

**Corpus evidence — both ends of the spectrum already exist, in different files** `[CERT]`:

| File | Behavior | Citation |
|---|---|---|
| `cuarto-frio-plano-realistic (6).html` | **Hard cut**: `setView(v){ camera.position.copy(v.pos); controls.target.copy(v.tgt); controls.update(); }` — instant snap between `VIEW_3Q` and `VIEW_TOP` presets, no interpolation at all | `cuarto-frio-plano-realistic (6).html:385-386,397` |
| `voxel/data_center_voxel_isometrico_3d.html` | **Eased tween**: 700ms duration, hand-rolled cubic ease-in-out (`t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2` — the textbook `easeInOutQuad` formula), `camera.position.lerpVectors(sp, ep, e)` + `controls.target.lerpVectors(st, et, e)` driven by a self-terminating `requestAnimationFrame` step function | `voxel/data_center_voxel_isometrico_3d.html:351-364,369-371` |

Corpus-wide grep confirms the eased version is a **one-off**: the `2*t*t` / `Math.pow(-2*t...`
easing formula appears in exactly one of the 30+ files — it has not propagated house-wide, the
same non-backported-innovation shape [Block 5] §5.4 already documented for the shadow-bake win
`[CERT]` (absence grep, 2026-07-04).

**Why linear `lerpVectors` on camera position can cut through geometry, and the fix** `[INFER]`
built on `[CERT-web]` primitives: `Vector3.lerpVectors`/`.lerp` interpolates along the **straight
Cartesian line** between two positions. For two orbit presets that differ mainly in polar angle
(e.g. a 3-quarter iso view → a top-down plan view, exactly the `VIEW_3Q`→`VIEW_TOP` pair above),
that straight line can pass close to or through the model's bounding volume, producing near-clip
or "inside the mesh" frames mid-transition on tighter framings than this corpus's current wide
establishing shots. The documented alternative `[CERT-web]`: `OrbitControls` itself never
interpolates the raw offset vector — internally, on every `update()`, it converts the
camera-to-target offset into a `Spherical` (`this._spherical.setFromVector3(_v)` — radius, `phi`,
`theta` — `examples/jsm/controls/OrbitControls.js`, 2026-07-04) and drives orbiting through those
angular components. A camera tour built the same way — interpolate `theta` (azimuth), `phi`
(polar), and `radius` independently, then reconstruct the Cartesian position via
`Vector3.setFromSphericalCoords(radius, phi, theta)` (docs/pages/Vector3, 2026-07-04) — keeps the
camera moving on (or near) a sphere around the target instead of punching a straight line across
the scene; this is the correct primitive for an **orbit tour** (theta sweeping continuously while
`phi`/`radius` hold or drift slowly) and for **any preset-to-preset move whose two views differ
mainly in angle rather than distance**. For presets that differ mainly in **distance** (a wide
establishing shot → a close-up), plain radius interpolation along the existing view direction is
sufficient and linear `lerpVectors` is fine — the geometry-clipping risk is specifically an
angle-change problem, not a universal one.

**Focus-on-part** `[CERT-web]` (already the recipe [Block 19] §19.1 names for the generic
"drop-any-model" viewer, applied here to a scene sub-object rather than a whole loaded model):
`new THREE.Box3().setFromObject(part)` → `.getSize()`/`.getCenter()` → derive a camera distance
from the box's size and the camera FOV, set `controls.target` to the box center. The only addition
this block makes `[INFER]`: run that derived position/target pair through the same eased-tween
step function already proven in `data_center_voxel_isometrico_3d.html` (§ above) instead of the
instant `.copy()` used by the other file — turning "frame this component" from a hard cut into a
readable camera move, at the §34.5 duration band.

## 34.4 — State micro-animations for the HVAC viewer

**Exploded view** `[INFER]` (assembling [Block 29] §29.1's convention + this block's timing):
[Block 29] §29.1 already establishes the industry convention — a single normalized "explosion
value" 0.0→1.0 driving every part's pre-computed offset vector at once, not per-part sliders. This
block adds the missing timing/easing half: drive that 0→1 scalar through `MathUtils.smootherstep`
(or the corpus's own proven `2*t*t`/quad-ease shape from §34.3) over the §34.5 duration, applying
`partGroup.position.lerpVectors(restPos, explodedPos, easedT)` per part — the same
`lerpVectors`-on-a-`Group` pattern already working in `data_center_voxel_isometrico_3d.html`,
just retargeted from the camera to each part `Group` ([Block 2] §2.3's existing per-part-`Group`
segmentation is, per [Block 29] §29.1, already the right granularity — no re-authoring needed).

**Door/panel opens** `[INFER]`: model as a hinge — a pivot `Object3D`/`Group` positioned at the
hinge line with the door mesh as its child offset from that pivot, then animate
`pivot.rotation.y` (or the relevant axis) from `0` to the open angle with the same eased-scalar
tween. Corpus-wide grep found no existing hinge/door-pivot `Group` in any prototype (2026-07-04
sweep) — this is a net-new pattern, not a formalization of something already there, unlike the
exploded-view case above.

**Damper/louver moves, and the re-bake-rule gotcha** `[INFER]` combining [Block 5] §5.4 with this
block: a louver/damper blade is the same rotating-pivot pattern as a door, at UI-scale angle and
duration rather than a whole panel. The **load-bearing interaction to flag**: [Block 5] §5.4
documents the corpus's real (if only partially adopted) perf win — `renderer.shadowMap.autoUpdate
= false` + one-time `needsUpdate = true` for static-sun scenes, already live in `cuarto-3d.html`.
If any prototype adopts that baked-shadow optimization AND animates a shadow-casting damper/louver
(or door, or exploded part) without also handling shadows, **the baked shadow map will not track
the moving geometry** — the shadow silently stays frozen in the pre-animation pose while the mesh
visibly rotates/translates, a correctness bug that only manifests once both optimizations are
combined. The fix is mechanical and already implied by the documented `autoUpdate` contract
([Block 5] §5.1, `[CERT-web]`): set `renderer.shadowMap.needsUpdate = true` for the duration of
the animation (every frame, or at minimum the final settled frame), then it is safe to leave
`autoUpdate` at `false` again once the part is at rest. This is a toggle rule, not a new
subsystem — but it is easy to miss precisely because [Block 5] and [Block 29]/this block's
animated toggles were researched as separate gaps and nothing else in this corpus states the
interaction explicitly.

## 34.5 — Recipe table `[INFER]` (assembled from §34.1-§34.4's cited guidance, not itself sourced)

| Motion | Suggested duration | Easing | Basis |
|---|---|---|---|
| Hover/highlight feedback (`OutlinePass` select, [Block 18] §18.3) | ~100-150ms | ease-out | NNG micro-feedback tier (§34.1, ~100ms) |
| Click-triggered state flip (status color, [Block 29] §29.3) | ~150-250ms | ease-in-out | NNG small-UI-element tier (§34.1, 100-400ms) |
| Camera preset-to-preset / focus-on-part | ~700-1200ms | ease-in-out (cubic; corpus's own `2*t*t` shape, §34.3) | corpus's own working 700ms data point (§34.3) sits inside, and NNG's "big movement" ceiling (§34.1, 400-500ms) extrapolated upward for scene-scale (labeled extrapolation, not an NNG number) |
| Orbit tour (continuous, not a single transition) | N/A (continuous `theta` sweep) | linear angular velocity, no easing needed mid-tour | §34.3 Spherical-based tour; easing applies only at tour start/stop |
| Exploded view 0→1 | ~500-800ms, optional ~40-80ms per-part stagger | `smootherstep` or corpus's cubic ease | [Block 29] §29.1 single-uniform convention + §34.2 `smootherstep` contract; per-part stagger is a staging-principle suggestion (§34.1), not a sourced number |
| Door/panel open | ~400-600ms | ease-in-out, optional small anticipation (§34.1) | UI "large on-screen element" tier (§34.1, 200-300ms) extended for a heavier physical read |
| Damper/louver move | ~200-350ms | ease-in-out | UI small-element tier (§34.1); MUST pair with the §34.4 shadow re-bake toggle if the scene bakes shadows |

## 34.x — Connections

- **[Block 29]** §29.1/§29.6 — the exploded-view convention this block gives timing/easing to;
  §34.4's damper/louver row is this block's own addition to that checklist.
- **[Block 13]** §13.2 — the on-demand-rendering hybrid rule that any tween (clip- or
  damp-based) must participate in identically to `autoRotate`/damping.
- **[Block 7]** §7.3 — the `OrbitControls` contract (`update()`, damping, `autoRotate`) that
  camera tours share a render-loop with; §34.3's `Spherical`-based tour reuses the exact
  conversion `OrbitControls.update()` already performs internally.
- **[Block 15]** §15.2 — the dasprinzip TSL/WebGPU days already doing uniform-driven bounce/vertex
  displacement (d38, d39): a GPU-side sibling of this block's CPU-side per-frame tweening, for a
  future WebGPU track ([Block 13] §13.4).
- **[Block 5]** §5.4 — the shadow-bake (`autoUpdate=false`) optimization whose interaction with
  ANY animated shadow-casting part (door/damper/exploded component) is §34.4's load-bearing
  gotcha.
- **[Block 19]** §19.1 — the `Box3` auto-framing recipe this block's "focus-on-part" move wraps
  in an eased tween instead of an instant camera cut.
- **[Block 2]** §2.3 — the per-part `Group` segmentation that both exploded-view offsets and
  door/damper pivots attach to.
