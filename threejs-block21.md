# Block 21 — Case studies III: eleven more sites, with honest negatives

> Research of **the third showcase batch** (G20): 11 user-supplied targets — including three
> that turned out NOT to be three.js and one URL serving unrelated content, all flagged rather
> than assumed. Version evidence graded per the bundle-evidence rule (explicit pins vs
> REVISION-literal recovery vs weak tokens). All preserved in `sources/web-snapshots/`
> (+ 3 GitHub READMEs; CodePen required a browser-UA fallback after 403s).
>
> Sources: preserved snapshots, fetched 2026-07-04 → `[CERT-a]` (secondary sites/demos).
> Method: delegated sweep (general-purpose · sonnet), preserve-first + constructor-call
> evidence protocol. Markers: `[CERT]` local · `[CERT-web]` official web · `[CERT-a]`
> secondary (preserved snapshot) · `[INFER]` deduction.
>
> Layer 4 (run 3). Connects [Block 14], [Block 15], [Block 20], [Block 2], [Block 18].

---

## 21.1 — The three.js sites `[CERT-a]` (each row cites its snapshot)

| Site | What / version (confidence) | Techniques (evidence class) | HVAC borrow (suggestion) |
|---|---|---|---|
| knowtheuniverse.com | 3D map of 43,497 real galaxies (2MASS survey); **r169** (REVISION literal in vendored module) | `Points` + `LineSegments` + `ShaderMaterial` + `Data3DTexture` + full bloom composer stack (constructor calls) | many-small-objects as Points + bloom — "ghost cloud" previews of equipment before realistic build |
| feed-panda | rigged GLTF panda feeder; **r167** (explicit importmap) | `GLTFLoader`, `InstancedMesh`+`InstancedBufferAttribute`, `PMREMGenerator` equirect IBL, `Raycaster` picking, `BokehPass` DOF, Tweakpane | GLB inspection viewer: raycast part-picking + HDR reflections |
| heartbeat-solana | Solana tx visualizer; **r185** (`REVISION:"185"` survived mangling) | R3F + `@react-three/postprocessing` (package strings, strong); instancing tokens weak (bundled lib) | live "system heartbeat" overlay pattern for telemetry on a 3D scene |
| atlas3d.space (model/9, /12) | "upload any 3D model, make it interactive with AI" — auto part labels, X-ray/exploded views; **r183** (REVISION recovery) | `GLTFLoader`, `OrbitControls` (moderate), R3F package string, `xray`/`explode` app literals | **closest product analog in all 3 batches**: AI-labeled exploded/X-ray inspection of uploaded GLBs ≈ the realistic-pass equipment UI |
| shader-studio | in-browser GLSL editor exporting `ShaderMaterial` boilerplate; **r128** (README badge + package.json, double-confirmed) | `new THREE.ShaderMaterial` ×2 (constructor), `u_time/u_resolution` uniform injection | authoring sandbox if custom surface shaders (frost/condensation) ever land |
| mesh-test (laubsauger) | "Mesh VJ Layer": WebGPU-only crowd + webcam pose (ONNX RTMW3D); **r0.185** (author-stated) | TSL solid: `Fn(` ×8, `compute(` ×15, `MeshStandardNodeMaterial`; `WebGPURenderer` hits were lib-internal strings (correctly downgraded to weak) | most advanced TSL/compute reference of the set — GPU compute instancing/airflow sims |
| prisoner849 "Sacred Pearl" pen | **best evidence of the sweep** — full unminified source via pen init-data; **r184** (explicit importmap) | `LineSegments2`/`LineMaterial` fat lines, **`MeshSurfaceSampler` → `InstancedMesh` scattering**, `CatmullRomCurve3`+`TubeGeometry`, `Data3DTexture`, simplex/fbm GLSL, composer + `FXAAPass` (all constructor-level) | **two direct borrows**: MeshSurfaceSampler scattering for repeated components (rivets, bolts, vents) over a base mesh; fat lines for crisp duct/pipe outlines (plain LineBasicMaterial can't) |

## 21.2 — Honest negatives and data-quality flags `[CERT-a]`

- **madebyevan.com/webgl-water**: the classic 2011 Wallace demo — **not three.js** (lightgl.js,
  own WebGL wrapper). **matsuoka-601/Splash** (MIT): WebGPU MLS-MPM fluid sim — **not three.js**
  either (`@webgpu/types` + `wgpu-matrix`, no `three` dependency). Both remain technique
  references (screen-space fluid rendering, raymarched shadows) that would need reimplementation
  on `WebGPURenderer`/TSL `[INFER]`.
- **fractalworlds.io**: no three.js evidence in any statically-reachable chunk (no REVISION, no
  WebGLRenderer, no three.module) — initially **inconclusive-but-leaning-not-three.js**.
  **Corrected to CONFIRMED NEGATIVE (same day, live browser-MCP runtime probe)** `[CERT-hw]`
  (empirical check against the live site): the main canvas holds a **raw WebGPU context**,
  `window.THREE` is undefined, and the runtime loads exactly the three statically-seen chunks
  (index / lil-gui / mobileFirstPerson) plus analytics — no dynamic three.js chunk exists.
  It is a hand-rolled WebGPU raymarcher; `lil-gui` is a standalone GUI lib. Evidence:
  `sources/web-snapshots/fractalworlds.io_runtime_screenshot.png` + probe output (2026-07-04).
- **lazykitty.itch.io/ex-nihilo**: the URL serves a game titled "Might is Right" (turn-based
  tactics). Initially read as slug reuse / wrong content. **Corrected (live browser-MCP probe of
  the author's profile)** `[CERT-hw]`: LazyKitty publishes only two games ("Lonely",
  "Might is Right"), and "Might is Right" LIVES at the `/ex-nihilo` slug — the project was
  RENAMED, not swapped; the URL was correct all along. The bundle finding stands: it embeds a
  genuine pre-r125-era three.js (verbatim deprecation-warning strings). Scope-clarification per
  METHODOLOGY §14, not a refute of the sweep's content analysis.

## 21.3 — Cross-batch corroboration (batches I-III) `[CERT-a]` / `[INFER]`

1. **The composer stack is ubiquitous**: EffectComposer/RenderPass/OutputPass appears across
   independent sites in every batch (knowtheuniverse, feed-panda, Sacred Pearl, GRAVEBOUND,
   dasprinzip d33/d23) — reinforcing [Block 18] as the highest-value upgrade the corpus hasn't
   adopted.
2. **Instanced scattering matures into a named pattern**: `MeshSurfaceSampler` + `InstancedMesh`
   (Sacred Pearl, at constructor-level evidence) is the general form of what the corpus does by
   hand with positional loops ([Block 2] §2.3).
3. **Version spread in the wild**: r128 → r185 across 19 confirmed-three.js sites; the modern
   cluster (r183-185) is R3F and/or WebGPU/TSL heavy — consistent with [Block 13] §13.4 and
   [Block 15] §15.1.

## 21.4 — Connections

- **[Block 14]** / **[Block 15]** — batches I-II; together the three case-study blocks cover all
  29 external showcase/forum targets the user supplied.
- **[Block 20]** — Sacred Pearl's iOS DataTexture gotcha lives there (§20.1); its full source
  evidence lives here (§21.1).
- **[Block 2]** §2.3 / **[Block 18]** — the two corpus threads §21.3 corroborates.
- **Run-3 STOP**: G20 closed → read-only-investigable = 0 again (genuine exhaustion).
