# Block 15 — Case studies II: the dasprinzip "tinker" series (10 daily experiments)

> Research of **dasprinzip.com/tinker days 23-39** (10 pages): one author's daily Three.js
> experiments, valuable precisely because they span BOTH pipelines — classic WebGL (r169-170,
> webpack) and modern TSL/WebGPU (r171-185, importmap-only) — with per-day technique evidence.
> Completes G18 together with [Block 14]. All pages PRESERVED in `sources/web-snapshots/`.
>
> Sources: preserved snapshots (sources/web-snapshots/dasprinzip.com_tinker_day*.md, fetched
> 2026-07-04) + bundle greps (constructor-call evidence preferred; bare class-name hits inside
> full-library webpack bundles were treated as WEAK and discarded — the whole library ships in
> each bundle). Secondary source → `[CERT-a]` citing the snapshot.
> Method: delegated sweep (general-purpose · sonnet) + driver consolidation. Markers:
> `[CERT]` local · `[CERT-web]` official web · `[CERT-a]` secondary (preserved snapshot) ·
> `[INFER]` deduction.
>
> Layer 4 (run 2, case studies). Connects [Block 14], [Block 13] §13.4, [Block 9], [Block 10].

---

## 15.1 — The two stacks inside one series `[CERT-a]`

| Group | Days | Stack | Version evidence |
|---|---|---|---|
| A — modern | 39, 38, 37, 36, 30 | importmap + CDN, `three.webgpu.js` + `three.tsl.js`, **no bundler**, Tweakpane GUI | explicit importmap pins: 0.185.0 (d39), 0.184.0 (d38), 0.175.0 (d36), 0.171.0 (d37, d30) |
| B — classic | 33, 27, 26, 25, 23 | webpack single-file bundles (full three.js inside) | `REVISION` strings: 169 (d33, d27, d23), 170-webgpu (d26, d25) |

The series is a live record of one developer crossing the WebGL→WebGPU/TSL boundary — the same
migration the official docs describe ([Block 13] §13.4) and the corpus would face past r160
([Block 10] §10.5) `[INFER]` (reading of the version timeline).

## 15.2 — Day-by-day techniques `[CERT-a]` (evidence = constructor calls / TSL tokens in cited snapshots)

| Day | Experiment (author title) | Technique evidence | HVAC applicability (suggestion) |
|---|---|---|---|
| 39 | "Unstable solid." | matcap + TSL vertex displacement (`positionLocal`, `normalLocal`, `Fn()`, compute) | vibration/"breathing" cues on unit casings |
| 38 | "Boing-boing Box." | TSL uniforms driving bounce + sound | low — toy |
| 37 | "Spectrum Field." | **InstancedMesh grid reacting to audio spectrum** (WebGPU) | **strongest hit**: block grid driven by a data stream = fan-array/coil-grid visualization from live sensor data |
| 36 | "It follows." | `RoomEnvironment` + `RGBELoader` IBL on node materials | env-lit node materials — realistic-tier upgrade path |
| 30 | "Pustule." | fullscreen-quad procedural shader: `OrthographicCamera`+`PlaneGeometry`, `MeshBasicNodeMaterial.colorNode` = domain-warped noise `Fn()` chain, Tweakpane presets | **procedural surfaces** (corrosion/frost/condensation) — TSL sibling of the corpus's CanvasTexture thread ([Block 9]) |
| 33 | "Particles." | r169: `new WebGLRenderer` + `new Points()` + GLTFLoader + EffectComposer + RGBELoader | point-cloud refrigerant/airflow particles + composer pipeline |
| 27 | "Suspicious vial." | r169: GLTF + particle overlay + Tweakpane | interactively tunable equipment demos |
| 26 | "And the river runs." | r170-webgpu: `new WebGPURenderer` + `new Points()` flow field | **GPU particle flow through ductwork** |
| 25 | "Scenic Backdrop." | r170-webgpu: procedural particle backdrop | generated room/skyline staging behind equipment |
| 23 | "Rubber Studs Ball." | r169: GLTF + `<select>` texture-swap UI + EffectComposer | **material-variant switching** (insulation/paint finishes) — trivially portable |

## 15.3 — What this series adds beyond [Block 14] `[INFER]` (from cited rows)

1. **Data-driven instanced grids** (d37) — the corpus already masters InstancedMesh
   ([Block 2]); binding instance attributes to a LIVE data stream (sensors, spectrum) is the
   missing move, and it is the most HVAC-shaped idea in all 18 case studies (fan arrays, coil
   temperature grids).
2. **Particles for flow** (d26, d33): `Points`/GPU particle fields for refrigerant or airflow —
   a visualization category the corpus has zero coverage of (only decorative sprite particles,
   [Block 1] §1.4).
3. **Texture/material variant switching** (d23) — a plain `<select>` swapping textures on a
   GLTF; the corpus's named palette ([Block 3] §3.3) makes the same feature nearly free.
4. **Tweakpane** as the series' standard GUI — a lighter path to the parametric-configurator
   pattern flagged in [Block 14] §14.3 (arachne) without hand-rolled DOM panels.
5. **Fullscreen-quad procedural shading** (d30) — the TSL upgrade of the corpus's
   draw-don't-download texturing ([Block 9]): same philosophy, GPU-side.

## 15.4 — Connections

- **[Block 14]** — Part I; together they close G18.
- **[Block 2]** / **[Block 9]** — the corpus threads days 37 and 30 extend.
- **[Block 10]** §10.5 / **[Block 13]** §13.4 — the WebGL→WebGPU migration this series walks
  through in real time.
- **G17 (next)** — instancing-at-scale and particle budgets belong to the optimization block.
