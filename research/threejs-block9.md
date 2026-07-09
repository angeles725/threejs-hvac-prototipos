# Block 9 — Procedural texturing with CanvasTexture

> Research of **the corpus's texture strategy**: 2D-canvas-drawn textures as the only texture
> source, their settings (wrap/repeat/anisotropy), the official color-space contract they must
> obey, and one divergence (missing `colorSpace` on color maps). Does NOT cover image/GLTF
> pipelines (G13) or material params ([Block 3]).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/Texture, MeshStandardMaterial /
> MeshToonMaterial map property, example webgl_materials_physical_clearcoat — queried
> 2026-07-04) · local prototypes.
> Method: context7 doc queries + driver grep verification (usage sites confirmed). Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (realistic stage, also voxel accents). Connects [Block 3] §3.3, [Block 6] §6.1.

---

## 9.1 — The technique: draw it, don't download it `[CERT]`

The corpus loads **zero image files** ([Block 1] §1.4); every texture is a runtime
`THREE.CanvasTexture` over a 2D-canvas drawing. CanvasTexture appears in **10 of 23 files**,
BOTH families (grep 2026-07-04). The two canonical implementations
(`chiller-aircooled-realistic (7).html`):

| Function | Canvas | Drawing | Texture settings | Used as |
|---|---|---|---|---|
| `finTexture()` (`:150-162`) | 96×64 | vertical fin lines every 2px, darker every 8px | `wrapS/T = RepeatWrapping`, `repeat.set(4,2)`, `anisotropy = 8` | `map:` of the coil material (`:182`) |
| `nameplateTexture()` (`:163-174`) | 256×128 | filled header bar + `fillText('AIR-COOLED CHILLER')` + spec bars + border | none (defaults) | `map:` of a nameplate plane (`:600`) |

Pattern strengths: self-contained (no asset requests — consistent with the CDN-only constraint,
[Block 4] §4.1), resolution-cheap, and label text is code-editable `[INFER]` (properties of the
observed construction).

## 9.2 — The official texture contract `[CERT-web]`

From official docs (2026-07-04):

- `Texture.colorSpace` default is **NoColorSpace**; "textures containing color data should be
  annotated with `SRGBColorSpace` or `LinearSRGBColorSpace`" (docs/pages/Texture).
- `.map` "represents color data... Most `map` textures set `texture.colorSpace =
  SRGBColorSpace`" (material map docs).
- Non-color maps (`aoMap`, `bumpMap`, `alphaMap`, `anisotropyMap`, ...) must KEEP
  `NoColorSpace` (each doc page states "represents non-color data").
- Official precedent for canvas-sourced textures: the clearcoat example wraps `FlakesTexture`
  in a `CanvasTexture` used as a normalMap with `RepeatWrapping`, `repeat 10×6`,
  `anisotropy 16`; its image-based diffuse sets `colorSpace = SRGBColorSpace`
  (example webgl_materials_physical_clearcoat).

## 9.3 — Divergence: color canvas textures without `colorSpace` `[CERT]` vs `[CERT-web]`

Both house CanvasTextures feed `.map` (color data — `chiller:182`, `:600`) but **neither sets
`colorSpace`**, so they run as the default `NoColorSpace` `[CERT]` (no `colorSpace` occurrences
in either function, `:150-174`). Under r160 color management ([Block 6] §6.1) the canvas's
sRGB-authored pixel values are then treated as linear — rendering slightly brighter/washed
relative to the same hex painted as a material `color` (which IS converted) `[INFER]`
(pipeline semantics applied). One-line fix per texture: `t.colorSpace = THREE.SRGBColorSpace;`
`[CERT-web]` (the documented annotation for color data). Sister finding to the glass
transmission/opacity mix ([Block 3] §3.4) — both are "the corpus predates or skips a
color-correctness contract" class.

## 9.4 — Settings that matter for this technique `[CERT-web]` / `[CERT]`

- **Tiling**: `RepeatWrapping` + `repeat.set(u,v)` — house fin texture tiles 4×2 (`:159`);
  official carbon-fiber diffuse tiles 10×10.
- **Oblique sharpness**: `anisotropy` — house 8 (`:160`), official example 16; higher values
  cost sampling bandwidth `[INFER]` (anisotropic filtering semantics).
- **Voxel-art option**: `magFilter = NearestFilter` produces hard pixel edges (used by the
  official transmission example's stripe alpha canvas and the manual's checker plane) — an
  unexplored fit for the voxel family's aesthetic `[CERT-web]` + `[INFER]`.

## 9.5 — Connections

- **[Block 3]** §3.3 — these textures ride the palette's PBR materials; §3.4 sister divergence.
- **[Block 6]** §6.1 — the color-management pipeline that makes §9.3 matter.
- **[Block 8]** §8.3 — geometry + canvas texture = the full no-DCC modeling stack.
- **G13 asset pipeline** — image/GLTF textures are the upgrade path beyond canvas drawing.
