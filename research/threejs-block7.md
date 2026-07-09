# Block 7 — Cameras and controls: the fake-isometric look and OrbitControls

> Research of **camera + controls** across the corpus: the low-FOV PerspectiveCamera
> "fake isometric" house choice, the true-orthographic alternative, and the OrbitControls
> operating contract. Does NOT cover raycasting/picking (only the two bundled files use it,
> [Block 1] §1.5) or resize plumbing beyond the camera bits ([Block 1] §1.3).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/OrbitControls, manual
> cameras-orthographic example, examples/misc_controls_map — queried 2026-07-04) · local
> prototypes (corpus-wide greps 2026-07-04).
> Method: context7 doc queries + driver grep sweeps and line verification. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 2 (voxel look) + shared controls. Connects [Block 1] §1.3, [Block 2] §2.3.

---

## 7.1 — The fake-isometric house choice `[CERT]`

Corpus-wide FOV histogram (grep over all `new THREE.PerspectiveCamera(` calls, 2026-07-04):

| FOV | Files |
|---|---|
| 40° | 14 (dominant — e.g. `voxel/liebert-split-voxel.html:62`) |
| 38° | 6 |
| 42° | 3 |
| 36° / 32° | 1 each |

Despite filenames like `data_center_voxel_isometrico_3d.html`, **no app code ever instantiates
OrthographicCamera** ([Block 1] §1.4 absence sweep) `[CERT]`. The house look is a
PerspectiveCamera narrowed to 32-42° — flattening perspective convergence toward an isometric
feel while retaining natural depth cues and the standard `camera.aspect` resize path `[INFER]`
(optical consequence of narrow FOV + the §7.3 resize contract).

## 7.2 — The true-orthographic alternative `[CERT-web]`

Official recipe (manual cameras-orthographic example, 2026-07-04):
`new THREE.OrthographicCamera(-size, size, size, -size, near, far)` + `camera.zoom` (the example
uses `zoom 0.2` and pairs it with OrbitControls). Trade-offs vs §7.1 for a voxel-art stage:
parallel projection (no foreshortening — the "real" isometric), zoom replaces dolly, and the
house one-line resize handler (`camera.aspect = ...` — [Block 1] §1.3) would no longer apply:
an ortho camera has no `aspect`; its left/right/top/bottom must be recomputed on resize `[INFER]`
(API shape: the constructor takes explicit frustum planes). If the team ever wants pixel-true
voxel-art, this is the documented switch; the current fake-isometric keeps one camera codepath
across both families `[INFER]`.

## 7.3 — The OrbitControls operating contract `[CERT-web]` / `[CERT]`

Official contract (docs/pages/OrbitControls, 2026-07-04):

- `update(deltaTime?)` "must be called in the animation loop if `enableDamping` or `autoRotate`
  are set to `true`", and "after any manual changes to the camera's transform".
- `autoRotate` orbits the target; `autoRotateSpeed` default = "one orbit every 30 seconds at
  60 fps"; passing `deltaTime` makes it frame-rate independent.
- Limits: `minDistance`/`maxDistance`, `minPolarAngle`/`maxPolarAngle`, `enablePan`.

Corpus compliance and settings (greps 2026-07-04):

| Setting | Corpus value | Citation |
|---|---|---|
| `enableDamping` + `dampingFactor` | `0.08` ×18 files, `0.07` ×3 | `voxel/trane-rtu-voxel__6_ (3).html:78-79` |
| per-scene orbit target | e.g. `controls.target.set(42, 22, 12)` | `voxel/liebert-split-voxel.html:81` |
| `autoRotate` | widespread (25 files contain it, incl. presentations toggling it) | sweep |
| dolly limits | `minDistance=35` / `maxDistance=180` in 2 files only | sweep |
| `update()` per frame | universal rAF loop calls `controls.update()` | [Block 1] §1.3 |

The damping/autoRotate → `update()`-per-frame requirement is satisfied corpus-wide by the shared
animation loop `[CERT]`; none pass `deltaTime`, so autoRotate speed is frame-rate coupled
`[INFER]` (doc contract applied — visible only on non-60Hz displays).

## 7.4 — MapControls: the plan-navigation option `[CERT-web]`

`MapControls` (three/addons) is the pan-first sibling: official example configures
`screenSpacePanning = false`, `maxPolarAngle = Math.PI / 2` (camera never dips below ground),
damping `0.05`, dolly limits — over an InstancedMesh city (examples/misc_controls_map,
2026-07-04). For plan-style scenes like the cold-room floor plan
(`cuarto-frio-plano-realistic (6).html`), this is the documented control scheme upgrade; the
corpus currently uses OrbitControls everywhere `[CERT]` ([Block 1] §1.3).

## 7.5 — Connections

- **[Block 1]** §1.3-§1.4 — scaffolding rows (controls, resize) this block deep-dives.
- **[Block 2]** §2.3 — the voxel scenes whose "isometric" look §7.1 defines.
- **G12 performance** — autoRotate forces continuous rendering; a static-frame optimization
  interacts with it.
- **G14 synthesis** — the single-camera-codepath choice (§7.2) is a workflow simplicity decision.
