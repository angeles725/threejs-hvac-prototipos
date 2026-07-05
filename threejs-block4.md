# Block 4 — Lighting and environment: the 3-light rig + RoomEnvironment IBL

> Research of **Three.js lighting** as both prototype families use it: the IBL pipeline
> (PMREMGenerator + RoomEnvironment), the house 3-light rig, and the physically-correct lighting
> era the corpus's r160 runs under. Does NOT cover shadows in depth ([Block 5], planned) or
> tone mapping ([Block on G6], planned).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/PMREMGenerator, RoomEnvironment, PointLight,
> DirectionalLight, AmbientLight; Migration-Guide wiki 146→147, 150→151, 154→155 — queried
> 2026-07-04) · local prototypes.
> Method: context7 doc queries + driver grep verification of local citations. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (realistic stage) + shared rig. Connects [Block 1] §1.3, [Block 3] §3.1.

---

## 4.1 — The IBL pipeline: RoomEnvironment → PMREMGenerator → scene.environment `[CERT-web]` / `[CERT]`

Official recipe (docs/pages/RoomEnvironment, 2026-07-04):

```js
const envMap = pmremGenerator.fromScene( new RoomEnvironment() ).texture;
scene.environment = envMap;
```

RoomEnvironment is "a scene with a basic room setup, designed for use as input for
PMREMGenerator#fromScene... used for Image Based Lighting by assigning it to Scene#environment"
`[CERT-web]`. `fromScene(scene, sigma, near, far, {size})`: sigma is "a blur radius in radians"
(default 0), output PMREM defaults to 256px, and fromScene "can be faster than using an image if
networking bandwidth is low" `[CERT-web]` (docs/pages/PMREMGenerator).

The realistic family implements exactly this, adding a slight blur:
`scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture`
(`trane-rtu-realistic-v10.html:76-77`, `chiller-aircooled-realistic (7).html:77-78`, and 4 more —
[Block 1] §1.4) `[CERT]`. Zero HDR/EXR files are loaded anywhere in the corpus ([Block 1] §1.4);
the "faster than an image" property makes the prototypes fully self-contained-over-CDN, no asset
downloads `[INFER]` (doc property applied to the corpus's standalone-HTML constraint). The
image-based alternative — `fromEquirectangular(hdrTexture)` with
`mapping = EquirectangularReflectionMapping`, ideal input 1024×512 — is the documented upgrade
path when real-world reflections are wanted `[CERT-web]` (example webgl_pmrem_equirectangular,
which also `dispose()`s the generator after baking).

## 4.2 — The house 3-light rig (shared by both families) `[CERT]`

Verified rig, near-verbatim across ≥3 voxel files and present in realistic files
([Block 1] §1.3):

| Role | Config | Citation |
|---|---|---|
| Ambient base | `AmbientLight(0xffffff, 0.22-0.25)` | `voxel/liebert-split-voxel.html:89` (0.22), `voxel/trane-rtu-voxel__6_ (3).html:85` (0.25) |
| Key "sun" | `DirectionalLight(0xffffff, 1.5)`, `castShadow`, mapSize 2048², ortho frustum ±120-150, `bias -0.0003` | `voxel/trane-rtu-voxel__6_ (3).html:86-93` |
| Cool fill | `DirectionalLight(0x88aaff, 0.4)` positioned via `translateOnAxis` | `voxel/trane-rtu-voxel__6_ (3).html:94` |
| Teal rim | `DirectionalLight(0x00d4aa, 0.2)` | `voxel/trane-rtu-voxel__6_ (3).html:95` |
| LED/glow accents | `PointLight(color, 1.0, distance 12-18)` — no explicit `decay` | `voxel/liebert-split-voxel.html:402`, `trane-rtu-realistic-v10.html:811` |

~~The two families differ in environment~~ **CORRECTED §14 2026-07-04**: BOTH families run rig + `scene.environment` IBL (21/21 voxel files verified — [Block 1] §1.4 correction); the realistic family's remaining differentiator on this axis is fog + material sophistication, not IBL. The rig remains the house "key light + colored fill/rim" signature.

## 4.3 — The physically-correct lighting era `[CERT-web]`

The corpus's r160 sits AFTER three key migrations (Migration-Guide wiki, 2026-07-04):

| Release | Change |
|---|---|
| r147 | `PointLight`/`SpotLight` `decay` default became the physically correct `2` (was 1); "to restore the previous behavior, set the property back to 1" |
| r151 | the three.js editor defaulted to physically correct lighting (`useLegacyLights: false`) |
| r155 | `WebGLRenderer.useLegacyLights` **deprecated and defaults to `false`** |

Consequences, per official docs (docs/pages/PointLight):

- PointLight `intensity` is "measured in candela (cd)"; `power` is lumens; `decay: 2` "should
  not be changed" in physically-correct rendering; with `distance: 0` attenuation follows the
  inverse-square law to infinity, and a non-zero `distance` cutoff is "inherently... not
  physically correct" `[CERT-web]`.
- The corpus PointLights (`1.0, 12` / `1.0, 18` — §4.2) therefore run inverse-square decay with a
  smooth cutoff at 12-18 units `[INFER]` (defaults applied: decay 2, physical mode on r160).
- Curiosity: the esbuild-bundled library carries BOTH shader paths — the
  `getDistanceAttenuation` GLSL in `voxel/cuarto-frio-voxel (18).html:8819` branches on
  `LEGACY_LIGHTS` vs the physical `1/pow(distance, decay)` falloff `[CERT]` — the compile-time
  fossil of the migration above.

DirectionalLight/AmbientLight docs specify only "strength/intensity" without a photometric unit
on their pages `[CERT-web]` — the rig's 1.5/0.25 values are artistic, not photometric `[INFER]`.

## 4.4 — Connections

- **[Block 1]** §1.3-§1.4 — rig + environment split first catalogued there.
- **[Block 3]** §3.1 — "an environment map should always be specified" for PBR: §4.1 is HOW the
  realistic family satisfies it; the voxel family's lights-only look is the open quality knob.
- **[Block 3]** §3.5 — on r160 `envMapIntensity` is the only IBL attenuation dial (pre-r163).
- **[Block 5]** (planned, G5) — the sun's shadow config (mapSize/frustum/bias) deep-dive.
- **G6 color** — ACESFilmic tone mapping interacts with light intensities; covered there.
