# Block 5 — Shadows: algorithms, shadow-camera tuning, and the corpus's perf evolution

> Research of **Three.js shadow mapping** as the prototypes use it: the algorithm menu, the
> DirectionalLight ortho shadow camera, artifact/cost dials (bias, normalBias, mapSize,
> castShadow opt-outs), and a measurable evolution toward baked shadows in the newest prototype.
> Does NOT cover light setup ([Block 4]) or general perf budgets (G12).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/WebGLRenderer shadowMap, examples
> webgl_gpgpu_water / webgpu_geometry_loft / webgpu_custom_fog / webgpu_lights_spotlight —
> queried 2026-07-04) · local prototypes.
> Method: context7 doc queries + driver grep verification of local citations (incl. absence
> greps for normalBias/autoUpdate/radius across all 23 files). Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (shared by both families). Connects [Block 1] §1.3, [Block 4] §4.2.

---

## 5.1 — The algorithm menu `[CERT-web]`

Official contract (docs/pages/WebGLRenderer, 2026-07-04): `renderer.shadowMap.enabled` defaults
`false`; `type` defaults **PCFShadowMap**, with the documented ladder "BasicShadowMap (fastest,
aliased), PCFShadowMap (smoother, default), and VSMShadowMap (smoothest, higher performance
cost)". `shadowMap.autoUpdate` (default `true`) can be disabled — "set to `false` if dynamic
lighting/shadows are not required to improve performance" — pairing with `needsUpdate = true` to
render once. Official examples add `shadow.radius` blur on the VSM path (webgl_gpgpu_water:
VSM + `radius 2, bias -0.0005`) and `normalBias` on static-sun setups (webgpu_custom_fog:
`bias -0.0004, normalBias 0.15, autoUpdate false` — comment: "the scene is static — re-render the
shadow map only when the sun moves").

## 5.2 — The house shadow-camera recipe vs official examples `[CERT]` / `[CERT-web]`

| Setup | type | mapSize | Frustum | bias / normalBias | Citation |
|---|---|---|---|---|---|
| House standard (most files) | `PCFSoftShadowMap` | 2048² | `±120-150, near 1, far 300-400` per scene scale | `-0.0003` / — | `trane-rtu-realistic-v10.html:69-70` (enabled+type), `:93-96` (mapSize, frustum, bias); `voxel/trane-rtu-voxel__6_ (3).html:89-93` |
| Perf-dialed voxel | `PCFSoftShadowMap` | **1024²** | per scene | — | `voxel/chiller-enfriado-aire-voxel (7).html:239-240` |
| Secondary spotlight | — | **512²** | — | — | `voxel/extractor-cocina-voxel (2).html:322-323` |
| Official loft example | — | 4096² | ±60, far 110 | `-0.0005` | webgpu_geometry_loft `[CERT-web]` |
| Official static-sun example | — | 4096² | ±420, near 200, far 1800 | `-0.0004` / `0.15` + `autoUpdate false` | webgpu_custom_fog `[CERT-web]` |

The house recipe sits between the official examples: same negative-bias magnitude order, smaller
maps (2048 vs 4096), per-scene frustum fitting — the frustum is always hand-fit to scene extent,
never left at defaults `[CERT]` (three different `±` values across the cited files).

## 5.3 — Artifact and cost dials in the corpus `[CERT]`

- **bias**: house constant `-0.0003` (`trane-rtu-realistic-v10.html:96`).
- **normalBias**: used in exactly ONE non-bundled file — `dirLight.shadow.normalBias = 0.02`
  (`carcamo-agua-3d (1).html:305`); grep over all 23 files finds no other app-code use `[CERT]`
  (absence grep 2026-07-04; remaining hits are bundled-library internals).
- **mapSize ladder**: 2048² standard → 1024² when the voxel scene got heavy → 512² for a
  secondary SpotLight (§5.2 citations) — resolution traded per light importance `[INFER]`
  (pattern read from the three tiers).
- **Selective casting**: thin panels opt out with an explanatory comment — "thin panels don't
  cast strong shadows" (`trane-rtu-realistic-v10.html:237`); split-system formalizes it as a
  `panel()` helper whose only difference from `box()` is `castShadow=false`
  (`split-system-realistic (2).html:148`).

## 5.4 — The newest prototype's shadow evolution `[CERT]`

`cuarto-3d.html` (newest realistic file, 2026-06-23 [Block 1] §1.1) breaks from the house
standard deliberately (`cuarto-3d.html:31538-31541`):

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;   // perf: cheaper than soft shadows
renderer.shadowMap.autoUpdate = false;          // perf: sun is static -> bake shadows once
renderer.shadowMap.needsUpdate = true;          // render them on the first frame
```

This is exactly the official static-scene optimization (§5.1 webgpu_custom_fog + the documented
`autoUpdate` semantics) `[CERT-web]` — adopted in the newest file but NOT backported to the other
22 prototypes, whose suns are equally static `[CERT]` (autoUpdate absence grep: only
cuarto-3d.html:31540 sets it in app code). Cheapest available house-wide win: every static-sun
prototype can bake shadows once `[INFER]` (direct application of the documented perf guidance).

## 5.5 — Connections

- **[Block 4]** §4.2 — the sun whose shadow this block tunes.
- **[Block 1]** §1.3 — house scaffolding row this deep-dives.
- **G12 performance** — mapSize/type/autoUpdate are the shadow rows of the perf budget.
- **G14 synthesis** — §5.4 is workflow evidence: the newest file IS the evolving template.
