# Block 23 — Product-lighting design for industrial equipment shots + RectAreaLight

> Research of **studio/product lighting theory** (key/fill/rim roles, fill ratios, why large soft
> sources suit reflective metal, background separation) and its **three.js contract**:
> `RectAreaLight`, the library's "softbox" analog — constructor, the mandatory
> `RectAreaLightUniformsLib`/`RectAreaLightTexturesLib` init step, its PBR-material-only /
> no-shadow limitations, and `RectAreaLightHelper`. Closes with how the corpus's existing house
> 3-light rig ([Block 4] §4.2) already maps onto key/fill/rim theory, and what a
> RectAreaLight-based "studio" variant would add for the realistic pass. Does NOT cover shadow-map
> tuning ([Block 5]) or tone mapping/exposure calibration ([Block 6]).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/RectAreaLight, RectAreaLightUniformsLib,
> RectAreaLightTexturesLib, RectAreaLightNode; manual/en/lights — queried 2026-07-04) ·
> preserved web: Sareesh Sudhakaran (wolfcrow.com), "What is three point lighting and Why do we
> use it?" (`sources/web-snapshots/wolfcrow.com_what-is-three-point-lighting-and-why-do-we-use-it_.md`,
> fetched 2026-07-04) · Jay P Morgan (The Slanted Lens), "Lighting Techniques for Product
> Photography With Shiny Metal"
> (`sources/web-snapshots/theslantedlens.com_lighting-techniques-for-product-photography-with-shiny-metal_.md`,
> fetched 2026-07-04) · local prototypes (`trane-rtu-realistic-v10.html`).
> Method: WebSearch for reputable photography/lighting authorities → fetch-doc.sh preservation
> (two sources succeeded; StudioBinder and B&H eXplora both returned HTTP 403 to automated fetch
> and were dropped in favor of the two that preserved cleanly) → line-grepped for load-bearing
> statements → cross-mapped onto the existing house rig ([Block 4]) and Filament's metal-authoring
> guidance ([Block 22]). Markers: `[CERT]` local primary source (`file:line`) · `[CERT-web]`
> official web (URL + date) · `[CERT-a]` secondary source (URL) · `[INFER]` deduction.
>
> Layer 4 — Cross-cutting (design craft, run 4). Connects [Block 4], [Block 12], [Block 22].

---

## 23.1 — Three-point lighting theory: key, fill, rim/back `[CERT-a]`

Three roles, per Sareesh Sudhakaran (wolfcrow.com, a cinematography-education source), each with a
distinct job `[CERT-a]`:

| Role | Job | Citation |
|---|---|---|
| **Key** | "your main source of light, and is the brightest light in your scene... gives you your scene and subject its overall exposure" | `wolfcrow.com...:137-140` |
| **Fill** | "much dimmer than the key light, and is used to fill in any shadows created by the key light... to retain some detail in the shadow areas and to reduce the overall contrast" | `wolfcrow.com...:175-181` |
| **Back/rim** | "used to create separation between the subject and the background so that they don't disappear into it... creating a 'highlight' around the outline of the subject" | `wolfcrow.com...:203-213` |

The **fill ratio** is the key:fill brightness ratio — "a 2:1 fill means that the key light is twice
as bright as the fill" (`wolfcrow.com...:334-335`) `[CERT-a]`; a near-1:1 ratio ("almost the same
brightness... cancels out almost all shadows") reads as flat/high-key, a wide ratio reads as
moody/low-key (`wolfcrow.com...:158-166`) `[CERT-a]`. The canonical placement is "the key and the
fill light set up at about 45 degrees to either side of the subject with the camera in between
them," with the backlight "opposite the key light just outside the frame" (`wolfcrow.com...:250-256`)
`[CERT-a]`.

The source's stated justification for the pattern itself: "we use three point lighting because it
comes from the real world — our sun" — one dominant source (key) plus ambient bounce (fill) plus,
whenever a subject's back is to the key, a rim highlight (backlight) (`wolfcrow.com...:410-413`)
`[CERT-a]`. This is presented explicitly as a **guide, not a formula** — the theory names *why* each
light exists (motivation), not fixed angles/ratios to copy mechanically `[CERT-a]`.

## 23.2 — Why industrial/reflective metal wants large, soft, controlled sources `[CERT-a]`

The Slanted Lens's shiny-metal product shoot (still-life silver bowl + steel utensils) demonstrates
the practical consequence of light-source **size** for specular metal, evidenced step-by-step by
pulling individual modifiers in/out of an otherwise-fixed rig `[CERT-a]`:

- **The single overhead soft box is the dominant light**: "There's our overhead soft box. You see
  the beautiful light on the pears and things" (`theslantedlens.com...:137-139`) `[CERT-a]` — one
  large diffuse source does most of the shaping work; a point/spot source on bare metal would
  instead produce a small, hard specular pinpoint rather than a shape-revealing gradient.
- **Reflectors/cards, not more lights, control the metal's gradient**: "we're using our overhead
  soft box to light our pears in a top backlight. But then we're going to put in reflectors to
  reflect into the metal surfaces... add black to give gradation into those surfaces"
  (`theslantedlens.com...:579-588`) `[CERT-a]`. Because a mirror-like metal surface reflects
  whatever is in front of it rather than scattering light diffusely, its apparent shading comes
  from the **arrangement of bright/dark surfaces around it**, not from additional emitters.
- **Explicit anti-goal**: "Some type of gradation so that the metal doesn't look plastic or flat.
  You don't want to just shine off and just show just black because it has no dimension... you
  want some black in it so it just gives you some gradation and it feels like metal. Because metal
  reflects and you want to give a sense that it is reflecting" (`theslantedlens.com...:554-559,576-577`)
  `[CERT-a]`. A single uniform highlight (typical of a hard/small source) reads as *plastic*; a
  graduated highlight (only achievable with a source large enough to itself have a visible
  light-to-dark falloff across its own area, or with negative fill/black cards cutting part of it)
  reads as *metal*.
- **Background separation via a narrow, targeted light, kept apart from soft key fill**: "we're
  now going to add a background light to be able to separate those pears" (`...:148-149`) and,
  later, a background source with "a 10 degree grid on it. So it's very, very narrow. That narrow
  spot just gives me a little bit of highlight. A little bit of glow behind my still life"
  (`...:509-511`) `[CERT-a]`. The background is also physically pulled back from the tabletop
  specifically "to control the light... If we get that background too close to our tabletop we
  can't control the light the way we need to" (`...:106,113-114`) `[CERT-a]` — background
  separation is deliberately a **second, narrower** light distinct from the broad key, confirming
  it is functionally the "rim/back" role of §23.1 rather than a diffuse fill duty.

**Synthesis** `[INFER]` (combining §23.1's role model with §23.2's metal-specific evidence): for
industrial/HVAC hardware — galvanized sheet metal, painted steel panels, aluminum fins ([Block 22]
§22.3-22.4) — the "large soft key" requirement is stronger than for matte subjects because a small
source on a specular/near-specular metallic BRDF produces a tiny hard highlight that reveals
almost nothing about form, while a large source produces a broad, graduated highlight that reads
as the object's actual curvature — exactly Filament's F0/metallic-binary model ([Block 22] §22.1,
§22.3): under a metallic-binary material, 100% of the visible response *is* the specular
reflection of the environment, so the "environment" (the light source's apparent size/shape) is
the entire visual signal, not merely an accent.

## 23.3 — RectAreaLight: the softbox analog in three.js `[CERT-web]`

`RectAreaLight` is the library's rectangular, area-based light — the direct analog of a physical
softbox/panel `[CERT-web]`:

```js
new THREE.RectAreaLight( color, intensity, width, height )
```

| Parameter | Default | Notes |
|---|---|---|
| `color` | `0xffffff` | number \| Color \| string |
| `intensity` | `1` | the light's strength |
| `width` | `10` | of the rectangular emitter |
| `height` | `10` | of the rectangular emitter |

(docs/pages/RectAreaLight `[CERT-web]`.) Usage (WebGLRenderer path):

```js
RectAreaLightUniformsLib.init(); // only relevant for WebGLRenderer
const rectLight = new THREE.RectAreaLight( 0xffffff, intensity, width, height );
rectLight.position.set( 5, 5, 0 );
rectLight.lookAt( 0, 0, 0 );
scene.add( rectLight );
```

`[CERT-web]`. Orientation is set with `lookAt`/`rotation`, not a `target` object like
`DirectionalLight`/`SpotLight` `[CERT-web]`.

**Mandatory init step**: `RectAreaLightUniformsLib.init()` "enhance[s] the renderer's internal
uniform library, which is required before using RectAreaLight with WebGLRenderer" — it must be
called once before any RectAreaLight is rendered, or the light "may not render correctly"
(docs/pages/RectAreaLightUniformsLib; manual/en/lights) `[CERT-web]`. The WebGPURenderer path uses
a parallel, separate mechanism: `THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() )`
`[CERT-web]` — the two renderer backends do not share the same init call, so a renderer-agnostic
scene must guard which one it calls (or call both) `[INFER]`.

Both libraries store **Linearly Transformed Cosines (LTC)** BRDF approximation data in textures —
`RectAreaLightTexturesLib` is described as storing "LTC BRDF data within data textures for
rendering purposes" (docs/pages/RectAreaLightTexturesLib) `[CERT-web]` — LTC is the standard
real-time technique for area-light shading (closed-form analytic integration of the light's
footprint against a fitted BRDF lobe), which is *why* an extra initialization/texture-upload step
exists at all: unlike point/directional lights, area lights need this precomputed approximation
data resident before they can be evaluated per-pixel `[INFER]`.

## 23.4 — RectAreaLight limitations `[CERT-web]`

Two hard constraints, both explicit in the official docs (docs/pages/RectAreaLight, "Important
Notes") `[CERT-web]`:

1. **No shadow support.** RectAreaLight "does not support shadows" at all — `castShadow` has no
   effect. For the realistic family (which already casts shadows from the sun — [Block 5]), a
   RectAreaLight key would have to be a *non-shadow-casting* fill/key contribution layered
   alongside a shadow-casting `DirectionalLight`/`SpotLight`, not a drop-in replacement for the
   rig's sun `[INFER]`.
2. **PBR-materials-only.** "only works with MeshStandardMaterial and MeshPhysicalMaterial" — the
   manual reiterates this and gives a worked example of upgrading a plane from a non-PBR material
   specifically so a RectAreaLight will illuminate it correctly (manual/en/lights) `[CERT-web]`.
   Every entry of the house material palette ([Block 3] §3.3, [Block 22] §22.4) is already
   `MeshStandardMaterial`/`MeshPhysicalMaterial`, so this constraint is satisfied by the existing
   corpus with no material changes required `[INFER]`.

**`RectAreaLightHelper`**: a visualization helper — the manual's setup pattern parents the helper
directly onto the light (`light.add(helper)`) so it inherits the light's transform automatically
(manual/en/lights) `[CERT-web]`:

```js
const light = new THREE.RectAreaLight(color, intensity, width, height);
light.position.set(0, 10, 0);
light.rotation.x = THREE.MathUtils.degToRad(-90);
scene.add(light);

const helper = new RectAreaLightHelper(light);
light.add(helper);
```

**Performance note** `[INFER]` (applying §23.3's LTC mechanism): because LTC evaluation is a
closed-form per-fragment computation against precomputed textures rather than a shadow-map render
pass, a RectAreaLight is cheaper than an equivalent shadow-casting DirectionalLight/SpotLight
*precisely because* it forfeits shadows (§23.4.1) — it trades the shadow pass's cost for the
missing occlusion information entirely, rather than offering a cheaper shadow technique.

## 23.5 — Mapping the house rig to key/fill/rim theory `[CERT]` + `[INFER]`

The existing rig ([Block 4] §4.2) already implements the §23.1 role model without ever having been
described that way in the corpus:

| §23.1 role | House rig element | Fill-ratio math `[INFER]` |
|---|---|---|
| **Key** | `DirectionalLight(0xffffff, 1.5)`, shadow-casting sun | — |
| **Fill** | `DirectionalLight(0x88aaff, 0.4)` cool blue, `translateOnAxis`-positioned | 1.5 : 0.4 ≈ **3.75:1** key:fill — a moody/dimensional ratio per §23.1's scale (well above the 2:1-4:1 range that source frames as the working band), consistent with an industrial/technical mood rather than a flat product-catalog look |
| **Rim/back** | `DirectionalLight(0x00d4aa, 0.2)` teal | dimmest of the three — a genuine accent/edge light, not a second fill |
| *(no direct equivalent)* | `AmbientLight(0xffffff, 0.22-0.25)` + `scene.environment` IBL (RoomEnvironment/PMREM, [Block 4] §4.1) | this is the *ambient/bounce* term §23.1's wolfcrow source attributes to "the sun bouncing through or refracting through different materials" (`wolfcrow.com...:424-426`) `[CERT-a]` — in the three.js rig this role is split between the flat AmbientLight and the IBL environment map, rather than a fourth directional fixture |

`scene.environment` is therefore **already acting as a distributed, omnidirectional fill** — every
surface receives specular+diffuse contribution from the whole baked room environment, on top of
the three explicit DirectionalLights `[INFER]`. This is why [Block 4] §4.2 could observe that the
realistic family differs from voxel "only" by adding the environment map: in lighting-role terms,
that addition is not decorative, it is the corpus's fill-light mechanism operating at the
reflectance level instead of the geometry level.

## 23.6 — A RectAreaLight-based studio variant: what it would add

A studio-style upgrade path, reasoning from §23.2's evidence + §23.3-23.4's constraints
`[INFER] applied-from-[CERT-web]+[CERT-a]`:

- Replace (or augment) the flat directional fill (`0x88aaff, 0.4`) with a `RectAreaLight` sized to
  cover the equipment's key faces at a shallow grazing angle — this is the mechanism §23.2 shows
  produces *graduated* highlights on galvanized/aluminum surfaces instead of the flat directional
  fill's single soft gradient-free wash.
- Keep the shadow-casting sun as `DirectionalLight` (§23.4.1: RectAreaLight cannot cast shadows) —
  the studio variant is additive to the rig's shadow contact point, not a replacement for it.
- The rim light role could migrate to a second, narrower/higher-intensity `RectAreaLight` (or stay
  a `DirectionalLight`) depending on whether a soft or hard edge-highlight is wanted — §23.2's
  background-separation light was explicitly narrow/gridded (10°), i.e. the *opposite* of a large
  soft source, showing that "rim" specifically benefits from a smaller/harder source even when
  key/fill benefit from large soft ones `[CERT-a]` (`theslantedlens.com...:509-511`).
- `scene.environment` (§23.5) continues to supply the ambient/bounce term underneath both — a
  RectAreaLight rig does not remove the need for an environment map; Filament/glTF's authoring
  guidance ([Block 22] §22.1-22.3) already assumes some environment reflection is always present
  for metals.

### Studio recipe — starting point for an HVAC unit shot `[INFER] assembled-from-cited-theory`

| Light | Type | Color | Intensity | Size / angle | Position (relative to unit) | Role (§23.1) |
|---|---|---|---|---|---|---|
| Key | `RectAreaLight` | `0xffffff` (neutral) | ~5-8 | width/height ≈ 1-1.5× the unit's largest face dimension | ~45° camera-left, elevated, aimed down at ~30-45° | Key — large soft source per §23.2 for graduated metal highlights |
| Fill | `RectAreaLight` (smaller) or existing `DirectionalLight(0x88aaff, 0.4)` | cool blue `0x88aaff` | ~1/3 to 1/4 of key intensity (≈2.5:1-4:1 ratio, §23.1) | smaller panel or unbounded directional | ~45° camera-right, lower | Fill — retains house-rig's cool-color identity ([Block 4] §4.2) while following §23.1's ratio guidance |
| Rim/back | `DirectionalLight(0x00d4aa, 0.2-0.3)` or narrow `RectAreaLight` | teal `0x00d4aa` | dimmest of the three | narrow/hard if edge-crispness wanted (§23.2's 10° grid precedent) | opposite the key, behind the unit | Rim — edge separation from background, per §23.1 |
| Ambient/bounce | `AmbientLight` + `scene.environment` (RoomEnvironment/PMREM) | `0xffffff` | ambient ~0.2-0.25 (unchanged from house rig) | n/a | n/a | Bounce/global fill — [Block 4] §4.1, already present |
| Background separation | small spot/narrow `RectAreaLight` or `SpotLight` with tight cone | neutral or accent | low, just enough for a visible edge | narrow (~10-15°) | behind/above the unit, aimed at backdrop only | Background separation, distinct from subject fill (§23.2) |

Prerequisite: `RectAreaLightUniformsLib.init()` must run once at scene setup before any of the
above `RectAreaLight`s render (§23.3) `[CERT-web]`; no shadow-casting duty may be assigned to a
`RectAreaLight` (§23.4) `[CERT-web]`.

## 23.7 — Connections

- **[Block 4]** §4.2 — the house 3-light rig this block reinterprets through key/fill/rim theory
  (§23.5) and extends with a RectAreaLight-based studio option (§23.6); §4.1's `scene.environment`
  IBL is the rig's existing ambient/bounce term.
- **[Block 22]** §22.1, §22.3 — the metallic-binary BRDF model explains *why* metal is especially
  sensitive to light-source size (§23.2's synthesis): with no diffuse term, the visible response
  is pure environment/source reflection.
- **[Block 12]** — the studio recipe (§23.6) is a candidate addition to the team's realistic-pass
  punch list, additive rather than a rig replacement (keeps the shadow-casting sun).
