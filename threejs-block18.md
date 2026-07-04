# Block 18 — Post-processing: the EffectComposer chain (bloom, outline, AO)

> Research of **the post-processing layer the corpus has never used** ([Block 1] §1.4 absence):
> the composer chain contract, real bloom (vs the corpus's faked glow), outline highlighting,
> and ambient-occlusion passes. Closes G11.
>
> Sources: context7 `/mrdoob/three.js` (examples webgl_postprocessing_unreal_bloom /
> _unreal_bloom_selective / _outline, docs/pages/UnrealBloomPass, OutlinePass, GTAOPass,
> manual/post-processing, example webgpu_postprocessing_ao — queried 2026-07-04) · corpus
> cross-refs · [Block 14] field evidence. Markers: `[CERT]` local · `[CERT-web]` official web
> (URL + date) · `[CERT-a]` secondary (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 2). Connects [Block 6] §6.6, [Block 13] §13.2-13.3, [Block 4] §4.2.

---

## 18.1 — The chain contract `[CERT-web]`

```js
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));   // base scene
composer.addPass(<effect passes>);                  // bloom / outline / AO ...
composer.addPass(new OutputPass());                 // FINAL: "color space conversion to sRGB and optional tone mapping"
// loop: composer.render()  (replaces renderer.render)
```

(manual/post-processing + unreal_bloom example, 2026-07-04). Consequences for the corpus:
`composer.render()` replaces the bare `renderer.render()` of the house loop ([Block 1] §1.3),
and the sRGB/tone-mapping step MOVES to `OutputPass` at the end of the chain — the [Block 6]
§6.6 anticipation, now sealed `[CERT-web]`. Each pass renders through offscreen render targets
([Block 13] §13.3 machinery).

## 18.2 — Real bloom vs the corpus's faked glow `[CERT-web]` / `[CERT]`

- `UnrealBloomPass(resolution, strength=1.5, radius=0.4, threshold=0.85)` — threshold "limits
  which bright areas contribute"; the docs note "tone mapping must be enabled in the renderer
  settings" (docs/pages/UnrealBloomPass).
- **Selective bloom** (official example): two composers — a bloom composer
  (`renderToScreen=false`) rendering only objects on a bloom `Layers` bit (non-bloom materials
  temporarily swapped to black), then a mix `ShaderPass` + `OutputPass` in the final composer;
  raycast click toggles `object.layers.toggle(BLOOM_SCENE)`.
- Two details make this example the corpus's mirror `[CERT-web]`: it uses the SAME IBL recipe
  (`pmremGenerator.fromScene(new RoomEnvironment(), 0.04)`) and renders **on demand**
  (`controls.addEventListener('change', render)`) — proof the composer chain composes with the
  [Block 13] §13.2 pattern.

Corpus relevance: glow today is faked with `PointLight`s + `emissive` ([Block 1] §1.4,
`trane-rtu-realistic-v10.html:811` `[CERT]`). Selective bloom on the HMI screens/LEDs (already
emissive, [Block 3] §3.3) is the truthful version of that effect `[INFER]` (mechanism applied
to the existing emissive surfaces).

## 18.3 — OutlinePass: selection highlighting `[CERT-web]`

`new OutlinePass(resolution, scene, camera, selectedObjects)` outlines the given objects; the
official chain is RenderPass → OutlinePass → OutputPass → FXAA `ShaderPass` (webgl_postprocessing_outline).
HVAC fit `[INFER]`: click-to-highlight components in cutaways — pairs directly with the
raycasting machinery the corpus already half-uses (coordinate capture, [Block 1] §1.5) and the
per-instance `instanceId` picking sealed in [Block 2] §2.2. This is the most product-shaped
pass of the three (component identification in equipment demos).

## 18.4 — Ambient occlusion passes `[CERT-web]` / `[CERT-a]`

- `GTAOPass`: "superior visual quality compared to SSAOPass but... more computationally
  expensive" (docs/pages/GTAOPass).
- Shared dials (webgpu_postprocessing_ao example): `samples`, `radius`, `resolutionScale`;
  SSAO adds `intensity/bias/blur*`; GTAO adds `scale/thickness/useTemporalFiltering`.
- Field evidence: little-landscapes ships a GTAO on/off toggle in production ([Block 14] §14.1
  site 3) `[CERT-a]` — AO as a quality TOGGLE, not an always-on cost, is the pattern to copy.

Corpus fit `[INFER]`: contact shading in dense equipment interiors (compressor bays, coil
stacks) where the single sun + IBL leaves crevices flat — the realistic pass's next visual
step after materials/IBL/shadows are already house-solved.

## 18.5 — Costs and composition rules `[CERT-web]` / `[INFER]`

- Each pass = extra fullscreen render-target work; budget stacks onto [Block 11] §11.1.
- Antialiasing changes: the default MSAA path doesn't survive the composer — official examples
  compensate with an FXAA `ShaderPass` (outline example) or a `samples: 4` render target
  (selective bloom's `finalRenderTarget`) `[CERT-web]`; the corpus's `antialias:true` renderer
  flag alone would no longer suffice `[INFER]`.
- On-demand friendly (§18.2) — a composer does NOT force continuous rendering.
- Resize: composer needs `setSize` alongside the renderer's (manual/post-processing) — one more
  line in the house resize handler ([Block 1] §1.3).

## 18.6 — Connections

- **[Block 6]** §6.6 — tone-mapping placement, now resolved (OutputPass).
- **[Block 13]** §13.2-13.3 — render-target machinery + on-demand compatibility.
- **[Block 2]** §2.2 / **[Block 14]** §14.3 — instanceId picking + configurator UI that
  OutlinePass turns into component identification.
- **[Block 11]** — frame budget the chain spends against.
- **G13 (last open gap)** — asset pipeline; after it, run-2 investigable hits 0.
