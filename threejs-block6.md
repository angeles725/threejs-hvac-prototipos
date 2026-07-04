# Block 6 — Color management and tone mapping

> Research of **Three.js color pipeline** as the corpus uses it: the color-managed working space
> (since r152), the tone-mapping menu, the house ACESFilmic calibration, and the legacy r128
> file's color hole. Does NOT cover lighting intensities ([Block 4]) or textures (G9).
>
> Sources: context7 `/mrdoob/three.js` (manual/color-management, docs/pages/WebGLRenderer,
> src/renderers/WebGLRenderer.js + WebGLOutput.js, examples/webgl_tonemapping, Migration-Guide
> wiki 151→152 — queried 2026-07-04) · local prototypes.
> Method: context7 doc queries + driver grep verification (incl. corpus-wide tone-mapping tally
> and absence grep on the r128 file). Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (shared pipeline). Connects [Block 1] §1.3, [Block 3] §3.3, [Block 4] §4.3.

---

## 6.1 — The color-managed pipeline (r152+) `[CERT-web]`

Since r152, `THREE.ColorManagement.enabled` is `true` by default (Migration-Guide 151→152,
2026-07-04). Under it (manual/color-management):

- `THREE.Color` inputs from hex/CSS are **automatically converted sRGB → Linear-sRGB** (the
  working space); getters convert back (`setHex(0x808080)` → `.r === 0.214041140`).
- `WebGLRenderer.outputColorSpace` defaults to `SRGBColorSpace` — the renderer sets the WebGL
  `drawingBufferColorSpace` accordingly (src/renderers/WebGLRenderer.js), and the output pass
  applies the sRGB transfer + the selected tone-mapping curve as shader defines
  (src/renderers/webgl/WebGLOutput.js).

Consequence for the corpus: every hex in the house material palette ([Block 3] §3.3) and light
colors ([Block 4] §4.2) is authored in sRGB and linearized automatically on r160 `[INFER]`
(pipeline semantics applied to the corpus's hex literals). The corpus's explicit
`outputColorSpace = SRGBColorSpace` (`trane-rtu-realistic-v10.html:73`) restates the r152+
default — harmless, self-documenting `[CERT]`+`[CERT-web]`.

## 6.2 — The r152 rename map `[CERT-web]`

Migration-Guide 151→152, verbatim mapping (relevant to any pre-r152 snippet the team encounters):

| Before | After (r152+) |
|---|---|
| `WebGLRenderer.outputEncoding` | `WebGLRenderer.outputColorSpace` (default `SRGBColorSpace`) |
| `Texture.encoding` | `Texture.colorSpace` (default `NoColorSpace`) |
| `THREE.sRGBEncoding` | `THREE.SRGBColorSpace` |
| `THREE.LinearEncoding` | `THREE.LinearSRGBColorSpace` |
| `ColorManagement.enabled` opt-in | **true by default** |

## 6.3 — The tone-mapping menu `[CERT-web]` / `[CERT]`

`WebGLRenderer.toneMapping` default is **NoToneMapping**; documented options: `NoToneMapping`,
`LinearToneMapping`, `ReinhardToneMapping`, `CineonToneMapping`, `ACESFilmicToneMapping`,
`CustomToneMapping`, `AgXToneMapping`, `NeutralToneMapping` (docs/pages/WebGLRenderer; the
official webgl_tonemapping example exposes the same list). The r160 bundled library in the
corpus already ships the AgX GLSL implementation (`AgXToneMapping` + inset/outset matrices in
`tonemapping_pars_fragment`, e.g. `cuarto-3d.html` bundled shader chunk) `[CERT]` — AgX is
available to the corpus today without upgrading; `NeutralToneMapping` (modelviewer-derived) is
documented in current docs, availability in r160 not verified here `[CERT-web]` (marked as such).

## 6.4 — House usage: universal ACESFilmic, per-scene exposure calibration `[CERT]`

Corpus-wide grep (2026-07-04): **22 of 23 files** set
`renderer.toneMapping = THREE.ACESFilmicToneMapping` — every file except the r128 legacy (§6.5).
Exposure is calibrated per scene, not copy-pasted: `1.05` ×7 files, `1.1` ×8, `1.12` ×1,
`1.15` ×2 — with explicit tuning evidence: `renderer.toneMappingExposure = 1.05; // fixed from
1.1` (`voxel/cooling-tower-voxel (1).html:143`). Combined with §6.1, the house pipeline is:
sRGB-authored colors → linear working space → physically-correct lights ([Block 4] §4.3) →
ACESFilmic curve at ~1.05-1.15 exposure → sRGB output `[INFER]` (assembly of the verified parts).

## 6.5 — The legacy color hole `[CERT]`

`voxel/data_center_voxel_isometrico_3d.html` (r128) contains **zero** occurrences of
`toneMapping`, `outputEncoding`, `sRGB`, `gammaFactor`, or `ColorSpace` (absence grep
2026-07-04). It therefore renders with r128 defaults — no tone mapping and legacy (linear)
output encoding — so its colors pass through none of the §6.4 pipeline; visually it cannot match
the house look regardless of its materials `[INFER]` (defaults + absence applied). Third
independent axis on which this file lags (geometry [Block 2] §2.4, materials [Block 1] §1.5,
now color) — the upgrade case study for G10.

## 6.6 — Connections

- **[Block 3]** §3.3 — the palette's hex values live in this pipeline's working space.
- **[Block 4]** §4.3 — physically-correct light intensities feed the ACES curve.
- **[Block 5]** §5.4 — cuarto-3d evolves shadows but keeps the ACES color pipeline.
- **G10 migration** — §6.2 rename map + §6.5 legacy hole are direct upgrade inputs.
- **G11 postprocessing** — tone mapping placement changes if an EffectComposer enters the chain.
