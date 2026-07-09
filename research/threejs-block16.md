# Block 16 — MapLibre GL JS and the three.js custom-layer interop

> Research of **MapLibre GL JS** (user-supplied subject): what it is, the documented mechanism
> for rendering three.js content inside a MapLibre map, and honest use cases for the HVAC team.
> MapLibre is NOT part of three.js — it is an independent WebGL vector-tile map renderer; the
> research value is the interop. Closes G19.
>
> Sources: official MapLibre example "Add a 3D model using three.js" — PRESERVED at
> `sources/web-snapshots/maplibre.org_maplibre-gl-js_docs_examples_add-a-3d-model-using-threejs_.md`
> (fetched 2026-07-04) `[CERT-doc]` (official page, locally preserved) · MapLibre GitHub README +
> LICENSE.txt (read 2026-07-04) `[CERT-web]`.
> Method: delegated sweep (general-purpose · sonnet) + driver consolidation. Markers:
> `[CERT-doc]` official document preserved in sources/ · `[CERT-web]` official web ·
> `[CERT-a]` secondary · `[INFER]` deduction.
>
> Layer 4 (run 2). Connects [Block 13] §13.3, [Block 14] §14.3, G13.

---

## 16.1 — What MapLibre GL JS is `[CERT-web]`

Open-source, **BSD-3-Clause** licensed (LICENSE.txt read directly; GitHub's license classifier
mislabels it "other") GPU-accelerated vector-tile map renderer for the browser. Forked from
`mapbox-gl-js` after Mapbox's December 2020 license change; early 1.x aimed for drop-in
compatibility, has since diverged (README, 2026-07-04). It owns its own WebGL context and
render loop — it is a sibling renderer to three.js, not a plugin.

## 16.2 — The documented interop: CustomLayerInterface `[CERT-doc]`

From the preserved official example (lines ~965-1047 of the snapshot):

- A custom layer object `{ type: 'custom', renderingMode: '3d' }` with two hooks:
- **`onAdd(map, gl)`** — build the three.js side INSIDE MapLibre's GL context:
  `new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })` with
  `renderer.autoClear = false` (so the base map isn't cleared), plus a `THREE.Scene`, camera,
  lights, and a `GLTFLoader` model load.
- **`render(gl, args)`** — per frame: georeference via
  `maplibregl.MercatorCoordinate.fromLngLat(lngLat, altitude)` → gives `translateX/Y/Z` and
  `meterInMercatorCoordinateUnits()` (scale); compose
  `camera.projectionMatrix = mainMatrix × (translate·scale·rotate)`; then
  `renderer.resetState()`, `renderer.render(scene, camera)`, `map.triggerRepaint()`.
- A projection-agnostic alternative exists: `args.getMatrixForModel(...)` (works on globe
  projection too, per the example's note referencing the globe-3d-model example).
- This is a maintained pattern family, not a one-off: official examples also cover 3D tiles,
  globe, shadows, and terrain draping with three.js, plus a Babylon.js equivalent `[CERT-web]`.

Key architectural fact `[CERT-doc]`: three.js renders into a SHARED GL context and cedes loop
ownership to the map (`triggerRepaint`) — the inverse of the corpus's standalone pattern where
three.js owns canvas and loop ([Block 1] §1.3).

## 16.3 — Use cases for the HVAC team `[INFER]` (labeled suggestions; MapLibre documents the mechanism, not these uses)

1. **Equipment on the real site map**: place georeferenced RTU/chiller/condenser models at
   their actual rooftop/campus coordinates on a vector-tile map — a direct extension of the
   official example, swapping the sample glTF for the team's equipment models (which implies
   the glTF export path, G13).
2. **Duct/piping runs over terrain**: the terrain-draping example pattern for site surveys
   where elevation matters (roof slope, ground-mount pads).
3. **Status overlays on mapped equipment**: combining the map layer with the corpus's
   emissive/procedural techniques for live state (alarm glow, frost) — speculative; no official
   example covers this combination.

Trade-off `[INFER]`: adopting MapLibre means leaving the self-contained single-HTML constraint
(map styles/tiles are network services) — same class of platform decision as the WebGPU track
([Block 14] §14.3).

## 16.4 — Connections

- **[Block 1]** §1.3 — the loop-ownership inversion (§16.2) vs the house pattern.
- **[Block 14]** §14.3 — joins the "deliberate platform decisions" list (WebGPU, path tracing).
- **G13** — site-map placement presumes glTF equipment exports; strengthens the case for
  closing G13 next run.
