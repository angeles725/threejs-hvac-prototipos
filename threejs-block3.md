# Block 3 — The PBR material system (MeshStandardMaterial / MeshPhysicalMaterial)

> Research of **Three.js PBR materials** as used by both prototype families: the
> metallic-roughness workflow, what MeshPhysicalMaterial adds, the corpus's material palette, and
> one corpus-vs-docs divergence (glass transmission). Does NOT cover lighting/IBL ([Block 4],
> planned) or textures (G9).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/MeshStandardMaterial, MeshPhysicalMaterial,
> manual/materials, Migration-Guide wiki 162→163, examples webgl_materials_physical_transmission /
> _clearcoat — queried 2026-07-04) · local prototypes.
> Method: context7 doc queries + driver grep verification of local citations. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (realistic stage — also used by voxel). Connects [Block 1] §1.4, [Block 2] §2.3.

---

## 3.1 — The metallic-roughness workflow `[CERT-web]`

Official positioning (docs/pages/MeshStandardMaterial, 2026-07-04): MeshStandardMaterial is "a
standard physically based material, using Metallic-Roughness workflow", physically correct rather
than approximated, reacting "'correctly' under all lighting scenarios" — superseding
MeshLambertMaterial/MeshPhongMaterial at a "somewhat more computationally expensive",
per-fragment-shaded cost. Two scalar dials:

| Property | Semantics (official) |
|---|---|
| `metalness` 0→1 | 0 = non-metal, 1 = metal — "metals behave differently in terms of light interaction" (manual/materials) |
| `roughness` 0→1 | microsurface scatter: 0 = mirror-sharp reflections, 1 = fully diffuse |
| `emissive` / `emissiveIntensity` | "solid color unaffected by other lighting", intensity modulates it |
| `envMap` / `envMapIntensity` | environment reflections; "for best results, an environment map should always be specified when using this material" |

That last sentence is load-bearing for the corpus: the realistic family satisfies it via
`scene.environment` IBL ([Block 1] §1.4), while the voxel family ~~runs with no environment~~ — **CORRECTED §14 2026-07-04: voxel files DO set scene.environment (21/21, see [Block 1] §1.4 correction)**; the doc guidance is satisfied corpus-wide. ~~The voxel look is driven purely by the rig; environment is the unused knob~~ (superseded by the same correction).

## 3.2 — What MeshPhysicalMaterial adds `[CERT-web]`

MeshPhysicalMaterial "extends MeshStandardMaterial and offers advanced physically-based rendering
properties such as anisotropy, clearcoat, iridescence, physically-based transparency, advanced
reflectivity, and sheen" (docs/pages/MeshPhysicalMaterial, 2026-07-04):

| Extension | Properties | Official usage cue |
|---|---|---|
| Clear gloss layer | `clearcoat` 0-1, `clearcoatRoughness` 0-1, `clearcoatNormalMap/Scale` | car paint recipe: `clearcoat:1.0, clearcoatRoughness:0.1, metalness:0.9, roughness:0.5` (example webgl_materials_physical_clearcoat) |
| Physical transparency | `transmission` 0-1, `ior` 1-2.333, `thickness`, `specularIntensity`, `specularColor`, renderer `transmissionResolutionScale` | "thin, transparent... plastic or glass materials remain largely reflective even if they are fully transmissive"; **"When transmission is non-zero, `opacity` should be set to `1`"** (docs/pages/MeshPhysicalMaterial) |
| Fabric / others | `sheen`, `sheenRoughness`, `sheenColor`, `iridescence`, `iridescenceIOR`, `reflectivity` | material-browser GUI ranges (docs/scenes/material-browser) |

## 3.3 — The corpus material palette `[CERT]`

The realistic chiller declares a 20-entry named palette `const M = {...}`
(`chiller-aircooled-realistic (7).html:177-202`) — a de-facto house material library:

| Surface family | Recipe | Citation |
|---|---|---|
| Galvanized steel | Standard `roughness:0.45, metalness:0.82` (dark variant `0.52/0.78`) | `:178-179` |
| Painted panels | Standard `roughness:0.55, metalness:0.22` | `:190` |
| Machined aluminum (scroll) | Standard `roughness:0.34, metalness:0.85, DoubleSide` | `:189` |
| Concrete plinth / insulation | Standard `roughness:0.9, metalness:0.03-0.04` | `:193,195` |
| Bolts / fasteners | Standard `roughness:0.4, metalness:0.85` | `:200` |
| Compressor dome (painted gloss) | **Physical** `clearcoat:0.6, clearcoatRoughness:0.3` + emissive reserved at 0 | `:188` |
| Glass | **Physical** `roughness:0.05, metalness:0, transmission:0.9, transparent:true, opacity:0.5` | `:201` |
| Lit HMI screen | Standard `emissive:0x06222a, emissiveIntensity:0.6` | `:192` |

A cutaway trick rides on materials: the sectioned dome is set `DoubleSide` with the in-code
comment "el domo seccionado del cutaway debe mostrar su interior" (`:203`) `[CERT]`.
The metalness/roughness pairs track physical intuition (metal high-metalness/mid-roughness,
concrete near-zero metalness/high roughness) — consistent with the metallic-roughness semantics
in §3.1 `[INFER]`.

## 3.4 — Corpus-vs-docs divergence: the glass recipe `[CERT]` vs `[CERT-web]`

The corpus glass combines BOTH transparency models: `transmission:0.9` (physical) AND
`transparent:true, opacity:0.5` (legacy alpha blending) (`chiller-aircooled-realistic (7).html:201`)
`[CERT]`. Official docs state the opposite contract: "When transmission is non-zero, `opacity`
should be set to `1`" `[CERT-web]` (docs/pages/MeshPhysicalMaterial, 2026-07-04); the official
transmission example ships `transmission:1, opacity:1` together (example
webgl_materials_physical_transmission). Mixing both stacks two attenuation mechanisms on the same
surface — the render double-dims what transmission alone should model `[INFER]`. Correction path
for the realistic stage: `opacity:1` and let `transmission`/`ior`/`thickness` carry the glass
(optionally `renderer.transmissionResolutionScale` for cost control `[CERT-web]`).

## 3.5 — Version note for r160 `[CERT-web]`

Migration Guide 162→163: "To attenuate `Scene.environment`, use the new
`Scene.environmentIntensity` property. The `envMapIntensity` property... now exclusively
attenuates the material's `envMap`." The corpus (r160) predates this split — on r160,
per-material `envMapIntensity` is the only IBL attenuation dial; after any upgrade past r163 the
scene-level control exists and the semantics change → feeds G10 (migration).

## 3.6 — Connections

- **[Block 1]** §1.4 — the family split this block explains (Standard everywhere; Physical for gloss/glass; voxel = lights-only).
- **[Block 2]** §2.3 — these are the materials attached to the voxel InstancedMesh color groups.
- **[Block 4]** (planned, G4) — `scene.environment`/PMREM: the "environment map should always be specified" guidance lands there.
- **G9 textures** — palette is flat-color; CanvasTexture layer on top.
- **G10 migration** — §3.5 envMapIntensity semantics change; §3.4 fix is version-independent.
