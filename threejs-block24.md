# Block 24 — Cheap visual wins: the maximum-visual-return-per-cost catalog

> Research of **techniques that buy disproportionate visual quality for near-zero runtime cost**:
> `MeshMatcapMaterial` (fake studio lighting, no lights), baked AO/`lightMap` (free contact
> shading), `ShadowMaterial`-based blob/contact shadows (incl. the official blurred-depth
> technique), `vertexColors` (texture-free per-vertex tinting), gradient/environment
> backgrounds, and the antialiasing cost ladder. Does NOT re-derive AA mechanics already covered
> by [Block 18] §18.5 (composer/AA interaction) — only consolidates the ladder. Does NOT cover
> full post-processing AO passes (SSAO/GTAO — those are [Block 18] §18.4's *dynamic* alternative
> to this block's *baked* AO).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/MeshMatcapMaterial, MeshStandardMaterial,
> MeshBasicMaterial, MeshLambertMaterial, MeshToonMaterial, ShadowMaterial, Material, InstancedMesh,
> Scene, FXAAPass, SMAAPass; examples webgl_materials_matcap, webgl_shadow_contact,
> webgpu_shadow_contact, webgl_volume_cloud, webgl_materials_envmaps_fasthdr,
> webgl_postprocessing_ssaa, material-browser.html — queried 2026-07-04) · local prototypes (grep
> sweep across all 23 files, 2026-07-04).
> Method: context7 doc/example queries (6) → grep-confirmed the corpus does NOT yet use any of
> these techniques in application code (only inside the bundled library source of
> `cuarto-3d.html`/`cuarto-frio-voxel (18).html`, which is not app usage) → cross-mapped onto
> [Block 5] §5.4, [Block 9], [Block 18] §18.5, [Block 22], [Block 23]. Markers: `[CERT]` local
> primary source (`file:line`) · `[CERT-web]` official web/context7 (URL + date) · `[CERT-a]`
> secondary · `[INFER]` deduction.
>
> Layer 4 — Cross-cutting (design craft + optimization, run 4). Connects [Block 5] §5.4,
> [Block 9], [Block 18] §18.5, [Block 22], [Block 23].

---

## 24.0 — Baseline: none of this is in the corpus yet `[CERT]`

Grep sweep across every local prototype (realistic + voxel families) for `MeshMatcapMaterial`,
`aoMap:`/`aoMapIntensity:` (as material-construction properties, not the bundled library's
uniform definitions), `vertexColors: true` (as a material-construction property),
`ShadowMaterial`, and `lightMap:` in application code found **zero real usages** `[CERT]`. The
only hits for `aoMap`, `lightMap`, `matcap`, and `ShadowMaterial` are inside the ~30,000-line
bundled three.js library source that `cuarto-3d.html` and `voxel/cuarto-frio-voxel (18).html`
inline (library internals — shader chunks, uniform definitions, JSON (de)serialization — not
scene-construction calls). The house does use `vertexColors: true`, but only on debug/helper
`LineBasicMaterial`s from the bundled `CameraHelper`/gizmo code (`cuarto-3d.html:29880-30523`),
never on an app mesh `[CERT]`. Every technique below is therefore a genuine, unclaimed upgrade
path for the corpus, not a documentation exercise over something already in use.

## 24.1 — MeshMatcapMaterial: fake studio lighting for free `[CERT-web]`

A **matcap** ("material capture") texture bakes a full lit sphere's appearance — its lighting,
its shading gradient, its highlight — into one 2D image, sampled by view-space normal instead of
UV `[CERT-web]`. The payoff: **`MeshMatcapMaterial` does not respond to lights because the
matcap image file encodes baked lighting** (docs/pages/MeshMatcapMaterial) `[CERT-web]` — the
official material-browser demo instantiating it explicitly turns off all three scene lights
with the comment "no need for lights" (`material-browser.html`) `[CERT-web]`.

Contract:

| Aspect | Detail | Citation |
|---|---|---|
| Constructor | `new THREE.MeshMatcapMaterial({ matcap, color, normalMap, ... })` | `[CERT-web]` |
| `.matcap` | the capture texture; represents **luminance data** — must set `texture.colorSpace`: LDR (png/jpg/webp) → `SRGBColorSpace`, HDR (exr) → `LinearSRGBColorSpace` | docs/pages/MeshMatcapMaterial `[CERT-web]` |
| Lighting cost | **zero** — no light loop, no shadow-map pass feeds this material | `[INFER]` (from "does not respond to lights") |
| Shadows | *casts* shadows fine (and shadow clipping works), but does **not self-shadow or receive shadows** | docs/pages/MeshMatcapMaterial `[CERT-web]` |
| Normal/alpha maps | still supported (`normalMap`, `alphaMap`) — official demo layers a `normalMap` for surface detail on top of the matcap's baked lighting | `webgl_materials_matcap.html` `[CERT-web]` |

**When it breaks**: the illusion is a *single frozen viewpoint's lighting* baked per-normal — it
holds up for orbit/rotation (the whole point of view-space sampling) but breaks the moment the
object needs to *interact* with the scene's actual lights: it cannot receive a cast shadow from
a neighboring mesh, cannot pick up colored bounce/fill from the house rig ([Block 4] §4.2,
[Block 23] §23.5), and any material-side metalness/roughness variation ([Block 22]) is
impossible — the whole surface reads as one uniform "studio finish" unless multiple matcap
textures are swapped per sub-material.

**Corpus fit** `[INFER]`: strongest for the **voxel pass** — it is the cheapest possible route to
a polished, dimensional look on `InstancedMesh` voxel blocks ([Block 2]) that today rely on flat
`MeshStandardMaterial` + the house light rig. Because matcap ignores lights entirely, it also
sidesteps the voxel family's simpler lighting setup with no quality loss specific to that stage.
Weak fit for the realistic pass, where shadow-receiving and metal/dielectric BRDF differentiation
([Block 22]) are load-bearing requirements this material cannot satisfy.

## 24.2 — Baked AO (`aoMap`) and `lightMap`: free contact shading `[CERT-web]`

**`aoMap`** ("ambient occlusion map"): "The red channel of this texture is used as the ambient
occlusion map. Requires a second set of UVs" — stated identically across `MeshBasicMaterial`,
`MeshLambertMaterial`, `MeshToonMaterial`, and (by extension) `MeshStandardMaterial`/
`MeshPhysicalMaterial` docs `[CERT-web]`. The **second UV set requirement is a live, current
constraint at r160** (context7 snippets queried 2026-07-04 show it unchanged across all listed
material doc pages) — not a pre-r151 relic; it means every mesh wanting baked AO needs a
`uv2` attribute (commonly just a copy of `uv`) in addition to its normal UVs, which is a
non-trivial ask for the corpus's procedurally-built geometry ([Block 8]) that has never
authored a second UV channel `[INFER]`.

| Property | Contract | Citation |
|---|---|---|
| `.aoMap` | red-channel-only texture; **non-color data** → must keep `texture.colorSpace = NoColorSpace` (the default — do NOT set SRGB, unlike the house's existing color-map mistake in [Block 9] §9.3) | `[CERT-web]` |
| `.aoMapIntensity` | `[0,1]`, default `1`; `0` disables, `1` = full occlusion where the map's red channel is also `1` | docs/pages/MeshStandardMaterial `[CERT-web]` |
| Requires | second UV set (`uv2`) | all material docs above `[CERT-web]` |

**`lightMap`** is `aoMap`'s sibling — same second-UV-set mechanism, but instead of *multiplying
away* ambient light it *adds* pre-baked indirect illumination (irradiance) into the shading
result; both are "bake it once, sample it every frame" techniques that trade an offline bake
(Blender/Substance/manual gradient painting) for a runtime cost of one extra texture sample
per fragment, versus real-time GI or a full SSAO/GTAO pass ([Block 18] §18.4) that recomputes
occlusion every frame from scratch `[INFER]`.

**Why baked AO ≈ free contact shading** `[INFER]`: unlike SSAO/GTAO (screen-space, recomputed
every frame, has a cost visible on the [Block 18] §18.5 budget), a baked `aoMap` is a **static
texture lookup** — the same order of cost as any other material map the house already samples
(`.map`, `.roughnessMap`, etc., [Block 3] §3.3), yet it directly fixes exactly the flat-crevice
problem [Block 18] §18.4 identifies in "dense equipment interiors (compressor bays, coil
stacks)". The tradeoff is authoring cost (a bake step, requiring either a DCC tool or a
procedural approximation) versus SSAO/GTAO's runtime cost with zero authoring — for static
geometry (the corpus's equipment does not deform, [Block 5] §5.4's shadow-baking rationale
applies identically here) the bake is a one-time cost amortized over every frame rendered after,
making it strictly cheaper for anything that doesn't move `[INFER]`.

## 24.3 — Blob and contact shadows: `ShadowMaterial` and the blurred-depth technique `[CERT-web]`

**`ShadowMaterial`**: "completely transparent... but can receive shadows... Useful for creating
shadow-only planes" (docs/pages/ShadowMaterial) `[CERT-web]`:

```js
const material = new THREE.ShadowMaterial();
material.opacity = 0.2;          // default color (0,0,0), transparent:true by default
const plane = new THREE.Mesh(groundGeometry, material);
plane.receiveShadow = true;
```

`[CERT-web]` (docs/pages/ShadowMaterial + official ground-plane pattern,
`webgpu_skinning_instancing_individual.html`, which additionally sets `color:` for a tinted
shadow rather than pure black). This is the **cheapest possible "grounding" trick**: it rides the
existing shadow-map pass the house already pays for ([Block 5]) and needs no new render target —
it just needs a plane that isn't otherwise visible (fully transparent except where shadow-mapped).

**The official contact-shadows technique** (`webgl_shadow_contact.html` /
`webgpu_shadow_contact.html`) is a materially different, more expensive approach for *soft*
blob shadows independent of the main directional-light shadow map `[CERT-web]`:

1. Render the scene from a camera looking **up from below the object** with an override material
   that outputs `1 - depth` (closer = brighter) into an offscreen render target — "remove the
   background... force the depthMaterial to everything... render to the render target to get the
   depths" `[CERT-web]`.
2. **Gaussian-blur that depth render target twice** (horizontal pass then vertical pass,
   ping-ponging between two render targets) to soften it into a blob `[CERT-web]`.
3. Composite the blurred result as an alpha-mapped plane under the object, with tunable `blur`,
   `darkness`, `opacity` uniforms `[CERT-web]`.

This is **three extra render passes per frame** (depth pass + 2 blur passes) versus
`ShadowMaterial`'s zero extra passes — a genuinely different cost tier, justified only when the
main shadow map's hard-edged, single-direction shadow isn't the desired look (e.g. a soft
"floating product" contact shadow independent of the sun's shadow-camera framing, [Block 5]
§5.2's frustum-fitting concerns) `[INFER]`.

**Cheap gradient-sprite blob alternative** `[INFER]` (applying [Block 9]'s established
technique): a single radial-gradient `CanvasTexture` (dark center fading to transparent edge,
the same draw-don't-download pattern as [Block 9] §9.1) alpha-blended on a flat plane under each
object gives a "fake blob shadow" at **zero render-target cost** — one draw call, one static
texture, no depth pass, no blur. It cannot respond to the object's actual silhouette or the
light's direction, but for small/distant instanced items (voxel-scale objects, [Block 2]) where
the shadow's exact shape is imperceptible, this is strictly cheaper than both `ShadowMaterial`
and the official depth-blur technique.

**Cost ladder for grounding an object** (cheapest → most capable) `[INFER]`: gradient-sprite
blob (1 draw call, 0 extra passes, direction/shape-blind) → `ShadowMaterial` plane (0 extra
passes, rides the existing shadow map, correct direction/shape, hard-edged per [Block 5]'s
map-type ladder) → official blurred-depth contact shadow (3 extra passes/frame, soft, direction-
and shape-correct, decoupled from the main shadow camera).

## 24.4 — Vertex colors: per-vertex tinting instead of textures `[CERT-web]`

`.vertexColors` (on `Material`, inherited by every material type): "If set to `true`, vertex
colors should be used. The engine supports RGB and RGBA vertex colors depending on whether a
three (RGB) or four (RGBA) component color buffer attribute is used" (docs/pages/Material)
`[CERT-web]`. Two distinct feed mechanisms, both zero-texture:

- **BufferGeometry per-vertex**: attach a `color` `BufferAttribute` to the geometry (3 or 4
  components per vertex) and set `material.vertexColors = true` — the official STL-loader
  pattern is the canonical example: `new THREE.MeshPhongMaterial({ vertexColors: true })` after
  checking `geometry.hasColors` `[CERT-web]`.
- **Per-instance via `InstancedMesh.setColorAt`**: "Sets the given color to the defined instance.
  Make sure you set the `needsUpdate` flag of `InstancedMesh#instanceColor` to `true` after
  updating all the colors" (docs/pages/InstancedMesh) `[CERT-web]` — official examples populate
  hundreds of instances this way in a single loop (`webgpu_postprocessing_anamorphic.html`,
  `webxr_xr_ballshooter.html`) `[CERT-web]`.

**Cost**: one small vertex/instance attribute buffer versus a full 2D texture (memory + a texture
sample per fragment) — cheaper than even a `CanvasTexture` ([Block 9]) when the visual need is
just *tinting*, not spatial pattern (stripes, labels, gradients across a surface at sub-vertex
resolution) `[INFER]`. Corpus fit: this is exactly the mechanism [Block 2]'s `InstancedMesh`
voxel blocks already have the API surface for (`setColorAt` is documented there, [Block 2] §2.1)
but the corpus currently assigns color via per-instance **material swaps** or geometry
duplication rather than a single shared material + per-instance color buffer — `setColorAt` is
strictly cheaper for palette-driven voxel art (one draw call, one material, N colors) than N
material variants `[INFER]` (draw-call economics already established in [Block 11] §11.1).

## 24.5 — Backgrounds: flat color vs gradient vs environment `[CERT-web]` / `[CERT]`

The corpus's current baseline: 22 of 24 background-setting local prototypes set a **flat**
`scene.background` to the same dark navy `0x06080d` via the numeric-literal form (grep-confirmed
2026-07-04); the remaining 2 (`voxel/vav-box-voxel.html`, `voxel/vav-box-voxel (2).html`) set the
identical color via a single-quoted hex string `'#06080d'` instead — same value, different
literal style `[CERT]`. Most realistic + several voxel files pair it with `scene.fog` at the
several voxel files pair it with `scene.fog` at the same color
(`liebert-split-realistic (3).html:60-61`, `split-system-realistic (2).html:73-74`, and several
more; 22 files carry the matching fog+background pair, grep-confirmed) `[CERT]` — this is
[Block 1] §1.4's fog-matches-background convention, already covered.

Two zero-to-low-cost upgrades beyond flat color, both cheaper than the [Block 4] IBL environment
map's full PMREM pipeline:

1. **Gradient sky via `CanvasTexture` on an inverted sphere**: draw a linear gradient on a tiny
   canvas (official example uses a **1×32px** canvas — deliberately tiny, since a gradient has no
   high-frequency detail to lose), wrap it as a `CanvasTexture`, and map it onto a large
   `SphereGeometry` with `MeshBasicMaterial({ map, side: THREE.BackSide })`
   (`webgl_volume_cloud.html`) `[CERT-web]`. Cost: one 1×32 texture + one extra (unlit, unshaded)
   mesh in the draw-call count — negligible, and reuses the corpus's existing
   draw-don't-download CanvasTexture pattern ([Block 9] §9.1) rather than introducing a new
   asset-loading dependency.
2. **`scene.backgroundBlurriness`** (+ `backgroundIntensity`): when `scene.background` is set to
   an environment texture (not a flat `Color`), `backgroundBlurriness` "controls the blurriness
   of the scene's background... accepts a float value between 0 and 1, with 0 being the default"
   (docs/pages/Scene) `[CERT-web]` — official demos drive it live via GUI alongside `exposure`
   and `fov` (`webgl_materials_envmaps_fasthdr.html`) `[CERT-web]`, and set it directly in code
   (`scene.backgroundBlurriness = 0.5`, `webgpu_compute_rasterizer_ibl.html`) `[CERT-web]`. This
   only applies when `scene.background` **is** the environment map (or a separate
   `scene.backgroundTexture` in newer APIs) — it does not blur a flat `Color` background and is
   therefore a **variation on [Block 4]'s existing IBL pipeline**, not a new asset cost: the house
   already computes `scene.environment` via `RoomEnvironment`+`PMREMGenerator` ([Block 4] §4.1);
   reusing that same texture as `scene.background` with blurriness turned up gets a
   "soft-focus studio backdrop" look for the cost of one assignment, no new bake `[INFER]`.

**Fog pairing** (already established, [Block 1] §1.4): whichever background approach is used,
the corpus's convention of matching `fog` color to `background` color remains the right move for
gradient/env backgrounds too — a mismatched fog color would create a visible seam at the
horizon where geometry fades into fog but the sky texture doesn't match `[INFER]`.

## 24.6 — AA cost ladder (consolidated, not re-derived) `[CERT-web]` / `[INFER]`

[Block 18] §18.5 already established that the house's `antialias:true` renderer flag (confirmed
house-wide, grep 2026-07-04 across all 23 files) is MSAA and does **not** survive an
`EffectComposer` chain — official examples compensate with an FXAA `ShaderPass` or a
`samples: N` render target `[CERT]` + `[CERT-web]`. This block only adds the missing cost-ladder
context7 confirms:

| Technique | Mechanism | Relative cost | Quality | Composer-safe? |
|---|---|---|---|---|
| `antialias:true` (house default) | native MSAA, renderer-level | low (fixed HW cost, no extra pass) | good edge AA, no post-process artifacts fixed | **No** — doesn't survive EffectComposer (Block 18 §18.5) |
| `FXAAShader`/`FXAAPass` | single-pass screen-space edge-detection blur | low (one extra fullscreen pass) | softer/blurrier than MSAA, can smear detail | Yes — designed for composer chains |
| `SMAAPass` | multi-pass edge-detection + blending weights (subpixel morphological AA) | medium (more passes than FXAA) | sharper than FXAA, closer to MSAA quality | Yes |
| `SSAARenderPass` | supersampling — renders the **whole scene N times** at sub-pixel jitter offsets (official demo exposes 1/2/4/8/16/32-sample levels) | **highest** — scales linearly with sample count, official demo forces `composer.setPixelRatio(1)` "for performance reasons" as a mitigation | best (ground-truth-grade) | Yes, but expensive |

`[CERT-web]` (docs/pages/FXAAPass, module-FXAAShader, SMAAPass; `webgl_postprocessing_ssaa.html`).

**For the voxel pass** `[INFER]`: MSAA (`antialias:true`, current default) is already the right
choice — flat-shaded low-poly voxel blocks have few, mostly axis-aligned edges where MSAA excels
and the composer chain is not in use, so there is no reason to add a post-process AA pass at all.

**For the realistic pass** `[INFER]`: once [Block 18]'s post-processing chain (bloom/outline/AO)
is adopted, MSAA stops applying (per §18.5) and a choice is forced — FXAA is the cheapest
composer-safe option and is the right *default* upgrade (cheap, "good enough" on the corpus's
moderate-poly-count equipment models); SMAA is the step up if FXAA's softening is visible on the
nameplate/label text ([Block 9] §9.1's `fillText` textures, which have fine edges FXAA can blur);
SSAA is reserved for stills/marketing renders, not real-time use, given its linear cost scaling.

## 24.7 — Ranked cost→beauty tables

**Voxel pass** (cheapest wins first) `[INFER]`:

| Rank | Technique | Cost | Beauty payoff | Caveat |
|---|---|---|---|---|
| 1 | Vertex colors via `InstancedMesh.setColorAt` (§24.4) | near-zero (one attribute buffer, no new draw calls) | replaces per-color material swaps with one material, N tinted instances | needs the material's `vertexColors=true` flag; loses per-instance metalness/roughness variation unless combined with instancing attributes |
| 2 | Gradient-sprite blob shadow (§24.3) | near-zero (1 draw call, static texture) | grounds floating voxel pieces cheaply | direction/shape-blind — wrong for a moving light |
| 3 | `MeshMatcapMaterial` (§24.1) | zero lighting cost | strong fake-studio finish, no light rig needed | frozen-viewpoint illusion; no shadow-receiving |
| 4 | MSAA `antialias:true` (§24.6, already house default) | low, fixed | clean edges on flat-shaded low-poly | already in place — no action needed |
| 5 | Gradient sky via CanvasTexture (§24.5) | negligible (1×32 texture) | replaces flat void with a horizon | corpus already uses flat+fog convention; optional upgrade |

**Realistic pass** (cheapest wins first) `[INFER]`:

| Rank | Technique | Cost | Beauty payoff | Caveat |
|---|---|---|---|---|
| 1 | Bake shadows once (`autoUpdate=false`, [Block 5] §5.4, already adopted in `cuarto-3d.html`) | removes a per-frame cost | full shadow quality, zero ongoing cost | only valid for static suns (true of the whole corpus) |
| 2 | `ShadowMaterial` contact plane (§24.3) | zero extra passes | correct-direction hard contact shadow | needs a receiving plane under the unit |
| 3 | Baked `aoMap`/`lightMap` (§24.2) | one texture sample (like any other map) | fixes flat crevices in compressor bays/coil stacks ([Block 18] §18.4's stated gap) | requires authoring a `uv2` set + an offline bake |
| 4 | `scene.backgroundBlurriness` on the existing IBL env ([Block 4] §4.1) (§24.5) | one assignment, no new bake | soft-focus studio backdrop | only works when background *is* the environment texture, not flat `Color` |
| 5 | FXAA pass once post-processing ([Block 18]) is adopted (§24.6) | one fullscreen pass | composer-safe AA replacement for lost MSAA | softens fine detail (nameplate text, [Block 9]) — SMAA if that matters |
| 6 | RectAreaLight studio rig ([Block 23] §23.6) | ongoing per-light LTC cost, no shadows | graduated metal highlights | most expensive item on this list; already covered in depth by Block 23 |
| — (not recommended for real-time) | Official blurred-depth contact shadow (§24.3) / SSAA (§24.6) | 3 extra passes / linear-in-samples | best-in-class soft shadow / AA | reserve for stills, not the live prototype viewer |

## 24.8 — Connections

- **[Block 5]** §5.4 — the shadow-baking precedent (`autoUpdate=false`) this block's cost-ladder
  reasoning (§24.2, §24.7) generalizes from static-shadow to static-AO/static-background bakes.
- **[Block 9]** — the draw-don't-download `CanvasTexture` pattern this block reuses twice
  (§24.3's gradient-blob alternative, §24.5's gradient-sky technique) instead of introducing new
  asset-loading dependencies.
- **[Block 18]** §18.5 — the AA-vs-composer incompatibility this block's §24.6 consolidates into
  a ranked ladder; §18.4's SSAO/GTAO is the *dynamic* counterpart to this block's *baked* AO
  (§24.2).
- **[Block 22]** — the metallic-binary BRDF model that explains why `MeshMatcapMaterial` (§24.1)
  is a weak fit for the realistic pass's metal-heavy palette (no real specular/metalness
  differentiation under a baked matcap).
- **[Block 23]** — the RectAreaLight studio rig sits at the expensive end of the realistic-pass
  ranked table (§24.7); this block's cheap techniques are what to reach for *before* that
  investment.
