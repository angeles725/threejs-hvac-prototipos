# Block 35 — 3D interaction UX: picking, selection states, touch, loading, camera navigation

> Research of **the interaction layer around the corpus's static viewers**: the Raycaster picking
> contract, selection/hover visual states (outline, emissive, dimming), touch/mobile input
> mapping, first-paint/loading UX for a CDN-loaded standalone HTML file, and camera navigation
> conveniences (presets, history, double-click-to-focus, reset). Does NOT cover the
> post-processing machinery itself ([Block 18]) or motion/easing curves ([Block 34]) — this
> block wires those into user-facing interaction, it doesn't re-derive them. Closes G35.
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/Raycaster, docs/pages/OrbitControls,
> docs/pages/MapControls, docs/pages/LoadingManager, manual/en/textures, manual/en/game,
> examples/webgl_postprocessing_unreal_bloom_selective, examples/webgpu_postprocessing_bloom_selective,
> examples/webgpu_compute_particles, src/constants.js — queried 2026-07-04) · corpus-wide greps
> (24 standalone HTML files + `voxel/`) · `sources/web-snapshots/developer.mozilla.org_en-US_docs_Web_CSS__media_pointer.md`
> (MDN `@media pointer`, preserved 2026-07-04).
> Method: context7 doc queries + corpus grep sweeps (Raycaster/pointer/touch/loading/reset/
> cursor/opacity-fade usage) + one MDN preservation for the hover-less-design claim. Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-doc]` official downloaded document (`sources/...pdf §N`) ·
> `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) ·
> `[INFER]` deduction.
>
> Layer 7 (design-craft completion, run 6). Connects [Block 2] §2.2 (instanceId picking),
> [Block 7] (OrbitControls contract), [Block 13] §13.2 (on-demand rendering), [Block 18] §18.3
> (OutlinePass), [Block 29] (viewer feature checklist), [Block 30] (CSS2D hotspots), [Block 34]
> (motion/easing, when covered).

---

## 35.1 — Picking pipeline `[CERT-web]` / `[CERT]`

Official Raycaster contract (context7, docs/pages/Raycaster, 2026-07-04):

| Member | Contract |
|---|---|
| `setFromCamera(coords, camera)` | `coords` MUST be normalized device coordinates: `x`/`y` each in `[-1, 1]`, computed from pointer/client coordinates against the canvas' bounding rect, Y-flipped (`-((y-top)/height)*2+1`) |
| `intersectObjects(objects, recursive=true, intersects=[])` | Default is recursive (descendants included); results **sorted by distance, closest first** — `intersects[0]` is always the nearest hit, no manual sort needed |
| `.camera` | auto-set by `setFromCamera`; required manually only for view-dependent objects (billboarded sprites) |
| `instanceId` on the hit (InstancedMesh) | per-instance identity for picking inside a single draw call — the mechanism [Block 2] §2.2 already seals for the voxel stage's instanced groups |

The corpus's OWN app-level implementation of this exact contract is the "coordinate capture"
authoring tool ([Block 1] §1.5 outlier) `[CERT]`:

```js
const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function doCapture(ev){
  const r=renderer.domElement.getBoundingClientRect();
  ndc.x=((ev.clientX-r.left)/r.width)*2-1; ndc.y=-((ev.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(ndc,camera);
  const hits=raycaster.intersectObjects(scene.children,true).filter(h=> h.object.isMesh && ...);
  ...
}
```
(`cuarto-3d.html:32220-32236`)

**Pointer vs click — the drag-threshold pattern already in the corpus** `[CERT]`: the same file
solves the orbit-drag-vs-click conflict with a distance check between `pointerdown` and
`pointerup`, not a `click` listener:

```js
let downX=0,downY=0;
renderer.domElement.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
renderer.domElement.addEventListener('pointerup',e=>{ if(!capture)return;
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return; doCapture(e); });
```
(`cuarto-3d.html:32236-32237`)

This is the correct general-purpose fix `[INFER]` (mechanism generalizes beyond this one tool):
a raw `click` listener on the canvas fires after ANY orbit-drag release (OrbitControls doesn't
call `preventDefault`/`stopPropagation` on drags), so every camera orbit would also register as
a spurious pick; a `pointerdown`→`pointerup` distance threshold (here 6px) is what the official
selective-bloom examples skip entirely — both `webgl_postprocessing_unreal_bloom_selective` and
`webgpu_postprocessing_bloom_selective` (context7, 2026-07-04) wire picking straight off
`pointerdown` with **no drag-threshold guard**, which only works there because their demo scenes
don't use OrbitControls dragging over the pickable objects in the same gesture space the corpus's
equipment viewers do `[INFER]`. The corpus's own 6px-threshold code is the more production-correct
pattern of the two and should be the one carried forward, not the official examples' bare
`pointerdown`.

**Hover throttling cost** `[INFER]` (cost model from the Raycaster contract + [Block 13] §13.2):
running `setFromCamera` + `intersectObjects` on every `pointermove` (continuous hover-highlight)
means a full BVH-less ray/triangle sweep per mouse-move event — cheap for a handful of large
equipment meshes, but it also breaks the on-demand rendering hybrid ([Block 13] §13.2) if a
hover-driven visual change (§35.2) triggers `render()` on every move: hover UX needs its OWN
render trigger (`render()` only when the intersected object actually CHANGES between moves, not
on every move that lands on the same object), otherwise hover reintroduces the continuous-render
cost the on-demand pattern exists to remove.

## 35.2 — Selection/hover visual states `[CERT-web]` / `[INFER]`

Three techniques, ranked by how directly they reuse machinery this corpus already has:

1. **`OutlinePass`** ([Block 18] §18.3, unchanged here) — the most product-shaped option;
   `selectedObjects` array driven by the raycast hit from §35.1.
2. **Emissive tint** `[INFER]` from the corpus's existing `emissive`/`emissiveIntensity` fields
   ([Block 3] §3.3, reused as the state→emissive rule in [Block 30] §30.2): a hover/select state
   is just `material.emissiveIntensity = value` on the hit object's material — zero new material
   system, same lever already used for status colors.
3. **Focus+context dimming via `Layers` + material swap** `[CERT-web]` — the official selective-
   bloom pattern, reusable verbatim for "dim everything except the selection" even without bloom:

   ```js
   function darkenNonBloomed( obj ) {
     if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
       materials[ obj.uuid ] = obj.material;
       obj.material = darkMaterial;
     }
   }
   ```
   (`examples/webgl_postprocessing_unreal_bloom_selective.html`, context7, 2026-07-04) — swap in
   a low-opacity/gray placeholder material for non-selected meshes instead of `darkMaterial`,
   restore the original material afterward from the `materials[uuid]` map. `object.layers.toggle(
   BLOOM_SCENE)` on raycast hit (same example) is the selection-state toggle mechanism, reusable
   without the bloom composer attached at all.

**Cursor changes — a real gap** `[CERT]`: corpus-wide grep of `cursor:pointer` finds it used
EXCLUSIVELY on DOM buttons/panels (e.g. `trane-rtu-realistic-v10.html:19` `#panel button { ...
cursor:pointer; }`) — zero instances of `renderer.domElement.style.cursor` being toggled based on
raycast hover state anywhere in the 24-file corpus. Today hovering a pickable 3D part gives no
cursor feedback at all; the fix is one line (`canvas.style.cursor = hit ? 'pointer' : 'default'`)
gated by the same hover-changed check from §35.1's throttling note — no new dependency, purely an
absence to close.

## 35.3 — Touch/mobile `[CERT-web]` / `[CERT-a]` / `[CERT]`

Official OrbitControls touch mapping (context7, docs/pages/OrbitControls + src/constants.js,
2026-07-04):

```js
// OrbitControls default
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
// TOUCH enum: { ROTATE:0, PAN:1, DOLLY_PAN:2, DOLLY_ROTATE:3 }
```

i.e. **one-finger = rotate/orbit, two-finger = simultaneous dolly (pinch) + pan** is the default
out of the box — the corpus needs no touch-specific code to get this, since every prototype
already instantiates plain `OrbitControls` ([Block 7] §7.3) `[CERT]` and never overrides
`.touches` (corpus-wide grep: zero hits for `.touches =` or `mouseButtons` across all 24 files).
`MapControls` inverts the assignment (`ONE: PAN, TWO: DOLLY_ROTATE`) for plan-navigation scenes
([Block 7] §7.4) — relevant if the cold-room floor-plan file ever migrates off OrbitControls.

**Touch target sizing**: no citable three.js-specific guidance exists for this (it's a general
UI-accessibility concern, not a rendering API contract) — flagged honestly as outside this
block's citable scope rather than asserting an unsourced pixel number.

**Hover-less design via pointer/hover media queries** `[CERT-a]` (MDN `@media pointer` /
`@media hover`, preserved `sources/web-snapshots/developer.mozilla.org_en-US_docs_Web_CSS__media_pointer.md`):
`@media (pointer: coarse)` / `@media (pointer: fine)` and the sibling `@media (hover: hover)` /
`(hover: none)` detect whether the primary input can hover at all (touch = `coarse` + `none`).
Applied to §35.2's hover states `[INFER]`: hover-only affordances (tooltip-on-hover, hover-tint)
should be gated behind `@media (hover: hover) and (pointer: fine)` in CSS/JS feature-detection so
touch users get **tap = select** directly (§35.1's picking pipeline fires identically on
`pointerup` regardless of input device — no separate touch code path needed for the pick itself),
without a phantom "stuck hover" state that touch devices are notorious for (a `:hover` CSS rule
with no matching `pointerleave` equivalent stays visually "hovered" after a tap on touch UAs).

## 35.4 — Loading/first-paint UX `[CERT]` / `[CERT-web]` / `[INFER]`

**Corpus reality today** `[CERT]`: all inspected prototypes load `three` + `three/addons/` from
`unpkg.com` via an `importmap` (e.g. `trane-rtu-realistic-v10.html:45-49`,
`"three": "https://unpkg.com/three@0.160.0/build/three.module.js"`) — a network dependency on
every load, no bundling/caching beyond the browser's own HTTP cache. Corpus-wide grep for
`loading`/`splash`/`spinner`/`preload` DOM elements and for any opacity-fade-in on first render
returns **zero genuine hits** across all 24 standalone files (the only matches are the bundled
library's internal `LoadingManager` source and unrelated CSS like ".backsplash") — **there is no
loading screen, skeleton, or first-paint transition anywhere in the corpus**; the page is blank
until the module graph resolves and the first frame renders.

Official building block for the missing piece `[CERT-web]` (context7, docs/pages/LoadingManager
+ manual/en/textures + manual/en/game, 2026-07-04):

```js
loadManager.onProgress = (urlOfLastItemLoaded, itemsLoaded, itemsTotal) => {
  progressBarElem.style.transform = `scaleX(${itemsLoaded/itemsTotal})`;
};
loadManager.onLoad = () => { loadingElem.style.display = 'none'; /* build+add scene content */ };
```

`LoadingManager` tracks asset loads (textures, models) it was passed to; it does **not** track
the `importmap`/CDN module fetch itself (that resolves before any three.js code runs) `[INFER]`
(scope of `LoadingManager` is documented as covering loaders it's injected into, not the
`<script type="importmap">` resolution step, which is a browser-level module-graph fetch outside
three.js's API surface entirely).

**Recipe for the corpus's actual case** `[INFER assembled]` (procedural scenes, no textures/glTF
to track — the corpus's own absence-of-asset-loading noted in [Block 1] §1.4):
1. A CSS-only splash/skeleton `<div>` (blurred silhouette or brand mark, covers the canvas),
   shown by default in the HTML so it paints before any JS runs — covers the `importmap`
   resolution gap `LoadingManager` can't see.
2. Since the corpus builds scenes procedurally (no `GLTFLoader`/`TextureLoader` calls to hook a
   `LoadingManager` onto in most files), the practical completion signal is simply "first
   `renderer.render()` call has returned" — remove the splash `<div>` (`display:none` or a CSS
   opacity transition) right after the first frame, not on a fake timer.
3. **Progressive reveal**: fade the canvas in (`canvas.style.opacity` `0→1` over ~200-400ms,
   CSS `transition`) on that same first-frame signal, rather than a hard cut — avoids the "pop"
   of a fully-lit PBR scene appearing instantly, and composes with [Block 34]'s motion/easing
   vocabulary once that block lands (queued, not yet covered here).

## 35.5 — Camera UX `[CERT]` / `[CERT-web]` / `[INFER]`

**Corpus reality today** `[CERT]`: corpus-wide grep for `dblclick`, camera "preset" buttons, a
view-history stack, or any `reset`/`Reset`/`RESET` string returns **zero hits** across all 24
standalone files — no camera presets, no back/forward history, no reset-view button exist
anywhere in the corpus today. The only camera-adjacent UI is the `autoRotate` toggle button
already inventoried in [Block 7] §7.3.

Building blocks, all already present in the researched corpus/docs, none new:

- **Preset buttons**: a preset is just a `{position, target}` pair; a button click sets
  `camera.position.copy(preset.position)` and `controls.target.copy(preset.target)` then calls
  `controls.update()` (required per [Block 7] §7.3's contract after any manual camera transform)
  `[INFER]`.
- **Camera history (back/forward)** `[INFER]`: push the current `{position, target}` onto a
  stack before applying a new preset/double-click-focus jump; "back" pops and re-applies the
  previous entry — same primitive as the preset mechanism, just stored rather than authored.
- **Double-click-to-focus**: raycast the click point exactly as in §35.1, then animate
  `controls.target` toward the hit point (and optionally dolly `camera.position` inward along
  the view vector) over a short tween `[INFER]` — this is the one row in this block that leans
  directly on [Block 34]'s easing/timing vocabulary for HOW the tween should feel (queued, not
  yet covered); the WHAT (target = raycast hit point, `controls.update()` per frame during the
  tween) is fully specified by [Block 7] §7.3's `update()` contract already.
- **Reset view**: cache the initial `{position, target}` once at scene setup, restore it on
  button click through the same `copy()` + `update()` path as presets — the simplest of the four
  rows, and the cheapest to add given the corpus already has zero of this category.

None of these require a new library or subsystem `[INFER]`: every row is `camera.position`/
`controls.target` mutation plus the `update()` call the corpus's shared rAF loop already makes
every frame ([Block 7] §7.3) — the gap is entirely in application-level UI wiring, not missing
three.js capability.

## 35.6 — Recipe: the interaction layer for the HVAC viewer `[INFER assembled]`

Assembling §35.1-§35.5 plus the on-demand rendering discipline from [Block 13] §13.2 into one
event-wiring shape for a standalone-HTML equipment viewer:

```js
let hovered = null, selected = null;
const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();

function pick(ev){ // shared by hover and click paths
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX-r.left)/r.width)*2-1; ndc.y = -((ev.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickableObjects, true); // recursive, sorted nearest-first
  return hits.length ? hits[0] : null;
}

// hover (desktop only — gated by @media (hover:hover) and (pointer:fine), §35.3)
renderer.domElement.addEventListener('pointermove', ev => {
  const hit = pick(ev);
  const next = hit ? hit.object : null;
  if (next === hovered) return;           // §35.1: only act, and only render(), on CHANGE
  hovered = next;
  renderer.domElement.style.cursor = hovered ? 'pointer' : 'default'; // §35.2 cursor fix
  updateOutline(hovered ? [hovered] : []);                            // [Block 18] §18.3
  render();                                                            // on-demand trigger
});

// click vs drag (§35.1's own corpus pattern, kept verbatim)
let downX=0, downY=0;
renderer.domElement.addEventListener('pointerdown', e => { downX=e.clientX; downY=e.clientY; });
renderer.domElement.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX-downX, e.clientY-downY) > 6) return; // drag, not a click — ignore
  const hit = pick(e);
  selected = hit ? hit.object : null;
  updateOutline(selected ? [selected] : []);
  render();
});

// double-click-to-focus (§35.5, tween timing deferred to [Block 34])
renderer.domElement.addEventListener('dblclick', e => {
  const hit = pick(e);
  if (hit) tweenCameraTarget(controls.target, hit.point); // drives render() itself while animating
});

// controls + resize + (future) telemetry already request renders in [Block 13] §13.2 / [Block 30] §30.2 —
// every interaction handler above ends in the SAME render() call, not a parallel render path.
```

The load-bearing constraint this recipe enforces `[INFER]`: **every** interaction entry point
(hover-change, click, dblclick-tween, plus the resize/controls-change/telemetry triggers already
catalogued in [Block 13] §13.2 and [Block 30] §30.2) funnels into the one shared `render()`
function the on-demand pattern requires — adding interaction must not silently reintroduce a
second, competing render trigger.

## 35.7 — Connections

- **[Block 2]** §2.2 — `instanceId` picking; the raycast contract in §35.1 is the same API this
  block's InstancedMesh/BatchedMesh hits ride on.
- **[Block 7]** §7.3 — `update()`-after-manual-transform contract that every camera-UX row in
  §35.5 depends on; §7.4 MapControls as the touch-mapping alternative in §35.3.
- **[Block 13]** §13.2 — on-demand rendering; §35.1 and §35.6 both treat "don't add a second
  render trigger" as the binding constraint.
- **[Block 18]** §18.3 — OutlinePass, the primary selection-highlight mechanism reused in §35.2
  and §35.6's recipe.
- **[Block 29]** — checklist rows 3-4 (hotspots, click-to-highlight); this block supplies the
  input-handling half those rows assumed but didn't detail.
- **[Block 30]** — CSS2D hotspot anchoring and the state→emissive data-binding rule §35.2 reuses
  for hover/select tint.
- **[Block 34]** (queued, run 6) — motion/easing vocabulary this block defers to for HOW the
  double-click-to-focus and progressive-reveal tweens should feel; §35.5/§35.6 specify WHAT
  moves, not the easing curve.
- **New-gap candidate**: touch-target sizing / mobile UI ergonomics for in-canvas 3D controls has
  no three.js-specific citable source (flagged in §35.3) — a design-standards gap (WCAG/mobile
  HIG), not a rendering-technique gap, so likely out of scope for further three.js-focused runs.
