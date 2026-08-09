# Block 70 — Scrolling a conveyor surface under a render-on-demand gate: why `texture.offset` is the only technique that keeps the frozen shadow valid

> Research of **G73 — per-frame SURFACE MOTION under the render-on-demand gate** (RUN 11, `transporte`
> family). The `transporte` catalog family is the first one whose subjects MOVE: `banda-cinta` and
> `transportador-cadena` are defined by a surface that runs. Every prior catalog asset was static, so the
> shell template's two performance invariants — render gated behind `needsRender` [Block 56] and
> `shadowMap.autoUpdate = false` [Block 54 §5-d] — had never been tested against a continuously animating
> subject. This block establishes which animation technique survives both, and proves the shadow half
> from the renderer source rather than assuming it.
>
> Subject version: three.js **r160** — the exact revision the catalog assets pin in their importmap
> (`disenos/catalog/shell-template.html:53`), not `dev`. A claim read from `dev` would not be evidence
> about the code these assets actually run.
>
> Sources (all preserved BEFORE citing, `fetch-doc.sh` → `sources/manuals/` + `sources/web-snapshots/`):
> `Texture.js` (r160 tag, sha256 `e1d36aef…`) · `WebGLShadowMap.js` (r160 tag, sha256 `c5d0d62f…`) ·
> `webgl_materials_blending_custom.html` (r160 tag, sha256 `646a1608…`) ·
> `threejs.org_manual_en_textures.html.md` (official manual snapshot, fetched 2026-08-08).
> Markers: `[CERT-doc]` preserved primary source (`file:line` inside `sources/`) · `[CERT]` local primary
> (`file:line` in this repo) · `[CERT-web]` official web · `[INFER]` deduction.
>
> Block type: **EVIDENCE + APPLIED**. Connects [Block 9] (CanvasTexture technique — the texture this block
> scrolls), [Block 56] (the render-on-demand idiom being defended), [Block 54] (the frozen-shadow budget
> rule), and [Block 34 §34.1] (motion vocabulary).

---

## 70.1 — The conflict this block resolves `[CERT]`/`[INFER]`

`disenos/catalog/catalog.yaml:88` specifies `banda-cinta` as *"belt conveyor, scrolling belt surface
animation"* `[CERT]`. The shell every catalog asset starts from gates drawing:

```js
if(needsRender){ renderer.render(scene,camera); needsRender = false; }
```
`disenos/catalog/shell-template.html:140` `[CERT]`

and freezes the shadow map once at build time (`shadowMap.autoUpdate = false`,
`shell-template.html:75`; baked with `renderer.shadowMap.needsUpdate = true` at `:120`) `[CERT]`.

A moving subject appears to break both at once: it must draw every frame (defeating the gate), and if it
moves geometry, the frozen shadow goes stale under it. The resolution is that these two costs are
**separable**, and the choice of animation technique decides whether you pay one or both. `[INFER]`

## 70.2 — The technique: `RepeatWrapping` + a per-frame `offset` `[CERT-doc]`

The belt surface does not move; its texture coordinates do. Two properties on the texture, set once:

| Property | r160 source | Note |
|---|---|---|
| `wrapS` / `wrapT` | `sources/manuals/Texture.js:44` | default is `ClampToEdgeWrapping` (`:26`) — MUST be changed to `RepeatWrapping`, or the scroll smears the edge texel instead of tiling `[CERT-doc]` |
| `offset` | `sources/manuals/Texture.js:56` | `new Vector2(0,0)` — the animated one |
| `repeat` | `sources/manuals/Texture.js:57` | `new Vector2(1,1)` — tiles per surface span |
| `matrixAutoUpdate` | `sources/manuals/Texture.js:61` | `true` by default; leave it — it is what turns `offset` into the UV matrix |

`offset` reaches the shader only through the UV transform matrix, rebuilt by:

```js
updateMatrix() {
    this.matrix.setUvTransform( this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y );
}
```
`sources/manuals/Texture.js:103-105` `[CERT-doc]`

The official r160 example animates exactly this, and its shape is worth copying verbatim:

```js
const ox = ( time * - 0.01 * mapBg.repeat.x ) % 1;
const oy = ( time * - 0.01 * mapBg.repeat.y ) % 1;
mapBg.offset.set( ox, oy );
```
`sources/manuals/webgl_materials_blending_custom.html:243-246`, with
`mapBg.wrapS = mapBg.wrapT = THREE.RepeatWrapping` at `:68` `[CERT-doc]`

The `% 1` is not cosmetic: `offset` is consumed modulo the wrap, so wrapping it into `[0,1)` every frame
keeps the animated value small. An offset accumulated unbounded across a long session drifts into the
range where a 32-bit float's spacing exceeds one texel, and the scroll visibly quantises. `[INFER]`

## 70.3 — `offset` does NOT need `needsUpdate`; `wrapS` does `[CERT-web]`

> "When modifying texture wrapping properties such as `wrapS` or `wrapT`, it is necessary to set the
> texture's `needsUpdate` property to true for the changes to take effect. In contrast, other properties
> like `repeat`, `offset`, `center`, and `rotation` are updated automatically by the renderer."
> — `sources/web-snapshots/threejs.org_manual_en_textures.html.md` (official manual, fetched 2026-08-08)
> `[CERT-web]`

This is the asymmetry a modeller gets backwards in both directions. Setting `needsUpdate = true` every
frame to scroll a belt is not merely redundant — `Texture.js:307-312` routes it to
`this.source.needsUpdate = true` `[CERT-doc]`, i.e. a per-frame **re-upload of the image to the GPU** for
an animation that changes no pixel. Conversely, flipping `wrapS` after first render without
`needsUpdate` silently does nothing.

## 70.4 — The load-bearing finding: a scrolling `map` does NOT invalidate the frozen shadow `[CERT-doc]`

The shadow pass does not render the object's material; it substitutes a depth material, and r160 decides
whether that depth material needs any texture at all in exactly one place:

```js
if ( ( material.isMeshDistanceMaterial ) ||
     ( material.displacementMap && material.displacementScale !== 0 ) ||
     ( material.alphaMap && material.alphaTest > 0 ) ||
     ( material.map && material.alphaTest > 0 ) ) {
```
`sources/manuals/WebGLShadowMap.js:257-260` `[CERT-doc]` — the customised branch, which then copies
`alphaMap`, `alphaTest`, `map` and `displacementMap` onto the depth material (`:305-313`) `[CERT-doc]`.

Read the condition: `material.map` participates in the shadow pass **only when `alphaTest > 0`**.
`alphaTest` defaults to `0`, so for an opaque belt material carrying a colour `map`, the depth pass never
samples that map — and therefore **cannot see the offset change**. `[CERT-doc]`

The consequence for the catalog contract: a belt whose surface scrolls by `texture.offset` casts a shadow
that is, frame for frame, identical to the one baked at build time. `shadowMap.autoUpdate = false` stays
correct and `renderer.shadowMap.needsUpdate` must NOT be re-fired per frame. The asset animates and keeps
the full [Block 54 §5-d] frozen-shadow saving. `[INFER]` from the source above.

The same reasoning covers the roller conveyor and the chain sprockets, by a different route: a cylinder
spinning about its own axis of revolution sweeps an unchanged silhouette, so its shadow is invariant under
that rotation. Motion that a frozen shadow does NOT survive is motion that changes an object's silhouette
or position — a hoist trolley traversing a crane girder, a mast lifting, a fork rising. Those assets must
either re-fire `renderer.shadowMap.needsUpdate = true` on the frames they move, or accept a visibly stale
shadow. `[INFER]`

## 70.5 — How an animating asset gates itself without defeating [Block 56] `[CERT]`/`[INFER]`

Render-on-demand and a running belt cannot both be free: while the belt runs, every frame is a new image,
so every frame must draw. What the gate still buys is that this cost is **opt-in and bounded**. The house
rule this block fixes for the `transporte` family:

1. The asset **loads stopped**. A catalog asset's default state is its inspection state, and a QA capture
   of a moving subject is otherwise non-reproducible. `[INFER]`
2. `RUN` is a toggle; the animation branch inside `animate()` runs only while it is on, and sets
   `needsRender = true` itself — the shell already reserves that exact seam
   (`shell-template.html:138`) `[CERT]`.
3. Every toggle handler calls `requestRender()` so the STOP transition paints its final frame; without it
   the belt freezes one frame before the state the button claims. `[INFER]`
4. The shadow is baked ONCE after build (`shell-template.html:120`) and never re-fired by the belt, per
   §70.4.

Net effect: idle inspection of an animated asset costs the same as a static one, and the moving state
costs one full render per frame with no shadow re-bake.

## 70.6 — Techniques rejected, and why `[INFER]`

| Alternative | Why not |
|---|---|
| Rewriting the UV attribute per frame | Same visual result, but re-uploads a vertex buffer every frame instead of mutating three floats in a uniform matrix. `offset` is the same operation done on the GPU. |
| Translating the belt mesh itself | Changes the silhouette → the frozen shadow goes stale (§70.4), and the belt must then loop back, which is visible. |
| A vertex/fragment shader `onBeforeCompile` scroll | Correct, but adds a custom shader to a family that has none; the built-in UV transform already does it with zero custom GLSL. Reserve it for motion `offset` cannot express. |
| Animating `repeat` instead of `offset` | Scales the tiling rather than translating it — the belt pattern stretches, it does not run. |

## 70.7 — What this block does NOT resolve

- **Belt speed as a physical quantity.** Nothing here fixes m/s, and `offset` units are texture repeats,
  not metres. A credible speed requires the belt-pitch dimension from G71 — until then, an asset's scroll
  rate is a visual choice, not a certified one, and its design-spec must say so.
- **Chain articulation.** A slat/chain conveyor whose individual slats must visibly hinge around the
  sprockets is not a texture scroll; that is per-link geometry on a path. Deferred — no catalog asset in
  this family currently claims it at that fidelity.
- **Whether the QA probe can capture a moving asset deterministically.** The gate reads
  `renderer.info.render` after `data-app-ready`; with the asset loading stopped (§70.5) this is not
  exercised. If a future asset autoplays, the capture becomes frame-dependent.

## Connections

- **[Block 56]** — the render-on-demand idiom this block extends from "static scene, draw on interaction"
  to "optionally animating scene, draw while animating". §70.5 is its `transporte` amendment.
- **[Block 54 §5-d]** — the frozen-shadow rule; §70.4 proves the rule survives a scrolling map instead of
  assuming it, and names the motion classes that break it.
- **[Block 9]** — `CanvasTexture` + `RepeatWrapping` + `repeat.set()` is already the house technique for
  procedural surfaces (`finTexture()`, `:150-162`); this block adds the per-frame `offset` on top of it,
  so the belt texture is drawn the same way the coil fins already are.
- **[Block 34 §34.1]** — motion vocabulary. A conveyor is a *continuous linear sweep*, the same class as
  the orbital tour: constant rate, no easing, no start/stop curve.
