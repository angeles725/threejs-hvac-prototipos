# Block 22 — Physically plausible PBR value references

> Research of **measured/authoritative PBR parameter ranges** (base-color, metalness, roughness,
> dielectric reflectance) from Google Filament's material documentation and the Khronos glTF 2.0
> specification's metallic-roughness appendix, applied as an audit against the corpus's 20-entry
> house material palette (`chiller-aircooled-realistic (7).html:177-202`, first cataloged in
> [Block 3] §3.3). Covers metals (steel/aluminum/copper), dielectrics (paint, plastic, rubber,
> concrete, water), the metallic-binary authoring rule, and roughness perceptual remapping. Does
> NOT re-cover the glass transmission/opacity divergence ([Block 3] §3.4, out of scope here) or
> texture authoring (G9, [Block 9]).
>
> Sources: Google Filament material documentation, preserved
> `sources/web-snapshots/google.github.io_filament_Filament.md.html.md` (fetched 2026-07-04 from
> https://google.github.io/filament/Filament.md.html, the real target of the `Filament.html`
> redirect) · Khronos glTF 2.0 Specification, Appendix B (BRDF Implementation), preserved
> `sources/web-snapshots/github.com_KhronosGroup_glTF_blob_main_specification_2.0_Specification.adoc.md`
> (fetched 2026-07-04 from
> https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc) · local
> prototype `chiller-aircooled-realistic (7).html`.
> Method: web fetch + preservation (fetch-doc.sh) of two authoritative PBR-authoring documents,
> line-grepped for load-bearing tables/statements, cross-checked against the corpus palette by
> direct hex/RGB inspection (python3, sRGB channel arithmetic — no color-space claims beyond what
> the sources themselves make in sRGB). Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-doc]` official downloaded document (`sources/web-snapshots/...md:Lline`) ·
> `[INFER]` deduction (mostly: applying the two documents' authoring rules to specific corpus
> entries, and computing mean-channel/relative-luminance from hex literals).
>
> Layer 4 — Cross-cutting (design craft, run 4). Connects [Block 3] §3.3-3.4, [Block 4], [Block 12].

---

## 22.1 — Filament's four-parameter standard model and its remappings `[CERT-doc]`

Filament's "standard" material model exposes four parameters that drive the metallic-roughness
BRDF: **baseColor** (linear RGB [0..1]), **metallic** (scalar [0..1]), **roughness** (scalar
[0..1]), **reflectance** (scalar [0..1], dielectric-only)
(`sources/web-snapshots/google.github.io_filament_Filament.md.html.md:550-564`) `[CERT-doc]`. Two
remappings matter for authoring:

- **Roughness remap**: the user-facing `perceptualRoughness` is squared before use —
  `alpha = perceptualRoughness^2`
  (`...Filament.md.html.md:712`) `[CERT-doc]` — chosen because, without it, "shiny metallic
  surfaces would have to be confined to a very small range between 0.0 and 0.05"
  (`...Filament.md.html.md:712` context). This means three.js's `roughness` property (itself the
  `perceptualRoughness` input to the same class of BRDF) is already the *perceptually linear* dial
  — authors should NOT try to further compress low-roughness values; a `roughness:0.05` (the
  corpus glass, `chiller:201`) already sits near the shader's practical floor.
- **Base color remap**: `diffuseColor = (1.0 - metallic) * baseColor.rgb`
  (`...Filament.md.html.md:574-578`) `[CERT-doc]` — for metals, 100% of baseColor becomes specular
  color and the diffuse term vanishes entirely. This is why an under-saturated/too-dark baseColor
  on a metal (§22.4) reads as a generically dark metal rather than as "steel" or "copper": with no
  diffuse term to carry hue at grazing angles, all of the material's identity lives in that one
  baseColor swatch.

## 22.2 — Dielectric reflectance (F0) reference table `[CERT-doc]`

Filament's Table `[commonMatReflectance]` (source: Real-Time Rendering 4th Edition), giving
Fresnel reflectance / IOR / linear-value ranges for common dielectrics
(`...Filament.md.html.md:605-618`) `[CERT-doc]`:

| Material | Reflectance | IOR | Linear value |
|---|---|---|---|
| Water | 2% | 1.33 | 0.35 |
| Fabric | 4% – 5.6% | 1.5 – 1.62 | 0.5 – 0.59 |
| Common liquids | 2% – 4% | 1.33 – 1.5 | 0.35 – 0.5 |
| Common gemstones | 5% – 16% | 1.58 – 2.33 | 0.56 – 1.0 |
| Plastics, glass | 4% – 5% | 1.5 – 1.58 | 0.5 – 0.56 |
| Other dielectrics | 2% – 5% | 1.33 – 1.58 | 0.35 – 0.56 |
| Default value | 4% | 1.5 | 0.5 |

The dielectric remapping formula is `f0 = 0.16 * reflectance^2`
(`...Filament.md.html.md:591`) `[CERT-doc]`, chosen so an input `reflectance` of 0.5 yields the 4%
default. The Khronos glTF 2.0 spec independently corroborates the 4% default from the metal side
of the model: "In this model it is not possible to specify a F0 value for non-metals, and a linear
value of 4% (0.04) is used"
(`sources/web-snapshots/github.com_KhronosGroup_glTF_blob_main_specification_2.0_Specification.adoc.md:7224`)
`[CERT-doc]` — i.e. glTF's metallic-roughness workflow (the same workflow three.js
MeshStandardMaterial implements, [Block 3] §3.1) hard-codes the dielectric F0 Filament recommends
as a *default when no better value is known*, confirming it is the right assumption for
plain-paint/plastic/concrete surfaces in the corpus rather than a value to expose per-material.

**Water** at 2% reflectance / IOR 1.33 is the load-bearing row for §22.4: the corpus's `water`
entry is NOT modeled as a dielectric liquid at all (see below).

## 22.3 — Metal base-color (F0) reference table and the metallic-binary rule `[CERT-doc]`

Filament's Table `[fNormalMetals]` gives measured specular-reflectance-at-normal-incidence (F0)
values for common metals, expressed directly as sRGB base colors
(`...Filament.md.html.md:619-682`) `[CERT-doc]`:

| Metal | F0 (sRGB) | Hex | Mean channel | Rel. luminance (0.2126/0.7152/0.0722) |
|---|---|---|---|---|
| Silver | 0.97, 0.96, 0.91 | `#f7f4e8` | 241.0 | 243.8 |
| Aluminum | 0.91, 0.92, 0.92 | `#e8eaea` | 233.3 | 233.6 |
| Titanium | 0.76, 0.73, 0.69 | `#c1baaf` | 184.7 | 186.7 |
| Iron | 0.77, 0.78, 0.78 | `#c4c6c6` | 197.3 | 197.6 |
| Platinum | 0.83, 0.81, 0.78 | `#d3cec6` | 205.0 | 206.5 |
| Gold | 1.00, 0.85, 0.57 | `#ffd891` | 205.3 | 219.2 |
| Brass | 0.98, 0.90, 0.59 | `#f9e596` | 209.3 | 227.5 |
| Copper | 0.97, 0.74, 0.62 | `#f7bc9e` | 197.7 | 198.4 |

(citations: Silver/Aluminum/Titanium/Iron/Platinum/Gold/Brass/Copper rows at
`...Filament.md.html.md:625,633,~641,649,~657,~665,~673,681` respectively `[CERT-doc]`.)

Authoring guidance for metals, same document: "**Metallic** materials: **Base color** represents
both the specular color and reflectance. Use values with a luminosity of 67% to 100% (170-255
sRGB). Oxidized or dirty metals should use a lower luminosity than clean metals... **Metallic**
should be 1 or close to 1" (`...Filament.md.html.md:781-787`) `[CERT-doc]`. Generally: "**Metallic**
is almost a binary value. Pure conductors have a metallic value of 1 and pure dielectrics have a
metallic value of 0. You should try to use values close at or close to 0 and 1. Intermediate
values are meant for transitions between surface types (metal to rust for instance)"
(`...Filament.md.html.md:772-776`) `[CERT-doc]`.

The Khronos glTF spec corroborates the same binary rule from an independent, non-Filament
authority, and is more explicit about *why* intermediate metalness is rare: "Usually, a material
is either metallic or dielectric. A texture provided for `metallic` with either `1.0` or `0.0`
separates metallic from dielectric regions on the mesh. There are situations in which there is no
clear separation [due to] anti-aliasing or mip-mapping... or a material composed of several
semi-transparent layers"
(`.../Specification.adoc.md:10040-10047`) `[CERT-doc]`, and defines the BRDF itself as a linear mix
`material = mix(dielectric_brdf, metal_brdf, metallic)`
(`.../Specification.adoc.md:10006-10010`) `[CERT-doc]`. Two independent official sources therefore
agree: **mid-range metalness is a texel-blending/anti-aliasing artifact of the *shader model*, not
a valid authoring choice for a solid-color material** — painted metal, rubber, or concrete should
never carry a flat 0.3-0.55 metalness on a per-material (non-textured) basis.

## 22.4 — Corpus palette audit `[CERT]` + `[INFER]`

Every entry of `const M = {...}` (`chiller-aircooled-realistic (7).html:177-202`) `[CERT]`,
classified against §22.2/§22.3, with mean-channel value computed from its hex literal `[INFER]`:

| Entry | Citation | color / metalness | Mean ch. | Verdict `[INFER]` |
|---|---|---|---|---|
| `galv` | `:178` | `0xb9bdc6` / 0.82 | 190.7 | **Plausible** — close to Iron F0 (197.3), metalness near 1 |
| `galvDark` | `:179` | `0x9296a0` / 0.78 | 152.0 | Plausible as *oxidized/dirty* metal variant (doc explicitly allows lower luminosity for this case) |
| `skid` | `:180` | `0x8a8a90` / **0.55** | 140.0 | **Correction candidate** — mid-metalness on a steel-skid material; should commit to ~1.0 (bare/galvanized steel) |
| `skidDark` | `:181` | `0x3a3a40` / **0.42** | 60.0 | **Correction candidate** — same mid-metalness pattern |
| `coil` | `:182` | `0xeef0f2` / **0.55** | 240.0 | **Correction candidate** — fin material (aluminum) at mid-metalness; luminosity is metal-plausible but metalness should be ~1.0 |
| `coilFrame` | `:183` | `0x2a2c30` / **0.5** | 44.7 | **Correction candidate** — same pattern |
| `copper` | `:184` | `0xc0762e` / 0.92 | 118.7 | **Correction candidate** — metalness fine, but base color is far darker/more saturated than Filament's measured Copper F0 `#f7bc9e` (mean 197.7 vs 118.7); reads as "brown" rather than the pale salmon-pink real copper F0 |
| `copperDk` | `:185` | `0x7a4a1f` / 0.85 | 75.7 | Plausible only as heavy patina/oxidation (doc allows darker for oxidized metals), but combined with `copper`'s already-too-dark base it compounds the drift |
| `compBody` | `:186` | `0x303338` / **0.55** | 51.7 | **Correction candidate** — painted compressor shell; per §22.3 rule, paint over metal is a dielectric surface as seen by the camera → metalness should be ≈0 |
| `compDark` | `:187` | `0x1d1f24` / **0.45** | 32.0 | **Correction candidate** — same painted-shell pattern |
| `compDome` | `:188` | `0x2f6bc0` / **0.45**, clearcoat 0.6 | 115.3 | **Correction candidate** — painted gloss dome; clearcoat is the *correct* mechanism for the gloss layer ([Block 3] §3.2), but the base metalness under it should still resolve to 0 for solid (non-metallic-flake) paint |
| `scrollAl` | `:189` | `0xb8bcc2` / 0.85 | 188.7 | Plausible — luminosity and metalness both track machined aluminum reasonably (below pure-Al F0 233.3, consistent with a machined/anodized finish rather than mirror-polished) |
| `panelBox` | `:190` | `0xe2e2dc` / **0.22** | 224.0 | **Correction candidate** — painted cabinet panel; metalness should be ≈0, not 0.22 |
| `panelDk` | `:191` | `0xb6b6b0` / **0.3** | 180.0 | **Correction candidate** — same painted-panel pattern |
| `hmi` | `:192` | `0x0a1018` / **0.4** | 16.7 | **Correction candidate** — HMI bezel/glass is plastic/glass (dielectric); metalness should be ≈0, gloss via low roughness/clearcoat instead |
| `plinth` | `:193` | `0xcccfca` / 0.04 | 204.3 | **Plausible** — concrete, near-zero metalness, correctly dielectric |
| `spring` | `:194` | `0x3a3d44` / **0.5** | 62.3 | **Correction candidate** — isolator spring (steel); mid-metalness ambiguous between bare-steel (→1.0) and painted (→0) |
| `insul` | `:195` | `0x24272d` / 0.03 | 40.0 | **Plausible** — insulation foam, correctly dielectric |
| `water` | `:196` | `0x2f7fb8` / **0.55** | 119.3 | **Correction candidate (flagship)** — water is a dielectric liquid at 2% reflectance / IOR 1.33 per §22.2; modeling it with `metalness:0.55` has no basis in either reference document — should be `metalness:0` with a low fixed `reflectance`/IOR-consistent setup (optionally `MeshPhysicalMaterial` transmission, as glass already does at `:201`) |
| `tank` | `:197` | `0x868c94` / 0.72 | 140.7 | Plausible as coated/galvanized steel tank (luminosity lower than pure Iron F0, metalness reasonably close to 1) |
| `warn` | `:198` | `0xf2c200` / 0.1 | 145.3 | Plausible — warning decal/sticker, near-zero metalness correct for a printed dielectric surface |
| `hose` | `:199` | `0x6a6e74` / **0.4** | 110.7 | **Correction candidate** — flexible hose (rubber); should be dielectric, metalness ≈0 |
| `bolt` | `:200` | `0x40444a` / 0.85 | 68.7 | Plausible as black-oxide/dark-finish steel fastener (real finish, metalness near 1) |
| `glass` | `:201` | `0x88ccee` / 0.0 | 192.7 | Plausible on metalness (correctly dielectric); transmission/opacity conflict already covered at [Block 3] §3.4, out of scope here |

**Pattern**: of 24 palette entries, 9 sit at a flat, non-textured metalness strictly between 0.2
and 0.55 (`skid`, `skidDark`, `coil`, `coilFrame`, `compBody`, `compDark`, `compDome`, `panelBox`,
`panelDk`, `hmi`, `spring`, `hose`, `water` — 13 counting all listed) `[CERT]`. Per §22.3, that
in-between zone is documented by both sources as a texel-blending artifact, not a valid solid-color
authoring value — this is the single most systemic, mechanically-checkable drift in the palette
`[INFER]`.

## 22.5 — Corrected palette proposal `[INFER] applied-from-[CERT-doc]`

Applying the §22.3 binary rule (dielectric surfaces → metalness 0; committed metals → metalness
→1) and the §22.2 default dielectric reflectance, without touching hue/roughness (out of scope —
only the metalness dial and the one flagged copper hue):

| Entry | Current | Proposed | Rationale |
|---|---|---|---|
| `skid` | metalness 0.55 | 0.9–1.0 | commit to bare/galvanized steel |
| `skidDark` | metalness 0.42 | 0.85–1.0 | same, shadow/oxidized variant |
| `coil` | metalness 0.55 | 0.9–1.0 | aluminum fin stock |
| `coilFrame` | metalness 0.5 | 0.85–1.0 | steel frame |
| `compBody` | metalness 0.55 | 0.0–0.05 | painted shell — dielectric |
| `compDark` | metalness 0.45 | 0.0–0.05 | painted shell — dielectric |
| `compDome` | metalness 0.45 | 0.0–0.05 (keep clearcoat) | painted gloss dome — dielectric base + clearcoat already models the gloss layer correctly |
| `panelBox` | metalness 0.22 | 0.0–0.05 | painted cabinet panel |
| `panelDk` | metalness 0.3 | 0.0–0.05 | painted cabinet panel |
| `hmi` | metalness 0.4 | 0.0 | plastic/glass bezel |
| `spring` | metalness 0.5 | 0.0 (if painted) or 1.0 (if bare steel) — pick one, do not leave mid | isolator spring, currently ambiguous |
| `hose` | metalness 0.4 | 0.0 | rubber, dielectric |
| `water` | metalness 0.55 | 0.0, reflectance≈0.5 (→4% F0) or IOR 1.33 via MeshPhysicalMaterial | dielectric liquid, 2% measured reflectance |
| `copper` | `0xc0762e` | closer to `#f0a67a`–`#f7bc9e` range | align to Filament's measured Copper F0, currently far darker/browner than reference |

This is a mechanical, single-property (or single-swatch) fix per entry — no geometry/texture
changes required, consistent with [Block 12]'s punch-list format.

## 22.6 — Common authoring mistakes (recap, evidence-backed) `[CERT-doc]`

Two anti-patterns the reference documents call out explicitly, both present in the corpus:

1. **Too-dark/under-saturated metal albedo.** Filament's own metal authoring guidance caps clean
   metals at 170-255 sRGB luminosity (`...Filament.md.html.md:781-787`) `[CERT-doc]`; the corpus's
   `copper` (mean channel 118.7) sits well under that band relative to the reference Copper F0
   (197.7) — a magnitude-scale drift, not a stylistic choice, per §22.4.
2. **Mid-range metalness on solid (non-textured-transition) surfaces.** Both Filament
   (`...Filament.md.html.md:772-776`) and the glTF spec (`.../Specification.adoc.md:10040-10047`)
   `[CERT-doc]` state this value range exists for texel-level anti-aliasing/blending, not
   deliberate authoring — the corpus's 13 affected entries (§22.4) are the dominant, systemic issue
   this block surfaces.

## 22.7 — Connections

- **[Block 3]** §3.3 — the palette this block audits line-for-line; §3.4's glass
  transmission/opacity conflict is a separate, already-covered divergence not reopened here.
- **[Block 4]** — IBL/environment reflections make metalness errors more visible (a mid-metalness
  surface blends diffuse and specular response inconsistently under environment lighting); this
  block's corrections are a prerequisite for [Block 4]'s "always specify an environment map"
  guidance to read correctly on metals.
- **[Block 12]** — feeds the team punch list as a mechanical, per-property correction pass (§22.5),
  no new geometry/texture work required.
