# Block 31 — Terrain and relief for site context

> Research of **ground/terrain representation** for the HVAC corpus: how to give equipment a
> non-flat, site-accurate (or stylized) ground plane — heightmap displacement mechanics in
> three.js, where real elevation data comes from, and how MapLibre's own terrain compares to
> hand-built three.js relief. Closes G31.
>
> Sources: context7 `/mrdoob/three.js` (official docs pages + example snippets) `[CERT-web]` ·
> Mapbox Terrain-RGB reference — PRESERVED at
> `sources/web-snapshots/docs.mapbox.com_data_tilesets_reference_mapbox-terrain-rgb-v1_.md`
> `[CERT-web]` · MapLibre "Add 3D terrain" official example — PRESERVED at
> `sources/web-snapshots/maplibre.org_maplibre-gl-js_docs_examples_3d-terrain_.md` `[CERT-doc]` ·
> Tilezen/Joerd terrain-tile format spec (Terrarium/normal/geotiff/skadi) — PRESERVED at
> `sources/web-snapshots/github.com_tilezen_joerd_blob_master_docs_formats.md.md` `[CERT-web]` ·
> AWS Registry of Open Data "Terrain Tiles" — PRESERVED at
> `sources/web-snapshots/registry.opendata.aws_terrain-tiles_.md` `[CERT-web]`.
> Method: context7 queries + preserve-first web fetches (fetch-doc.sh), corpus grep for existing
> usage (none found). Markers: `[CERT]` local · `[CERT-doc]` official document preserved in
> sources/ · `[CERT-web]` official web · `[CERT-a]` secondary · `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 5). Connects [Block 16] §16.2-16.3, [Block 14] §14.1 (site 3),
> [Block 8] §8.5, [Block 24] §24.4-24.5, [Block 3] §3.3.

---

## 31.1 — Heightmap displacement in three.js: two mechanisms, one caveat `[CERT-web]`

Two distinct ways to turn a flat ground mesh into relief, both starting from
`PlaneGeometry(width, height, widthSegments, heightSegments)` — the constructor takes explicit
segment counts along X and Y, defaulting to `1` each (docs/pages/PlaneGeometry.html.md)
`[CERT-web]`. A flat 1-segment plane has no vertices to displace; segment density is the
resolution budget for either mechanism below.

**A — CPU displacement (edit the position attribute directly)**. Read a heightmap image into a
`<canvas>`, sample per-vertex height from the pixel data, and write it into the geometry's
`position` BufferAttribute component that represents "up" (Y for a plane rotated flat, Z for one
left facing the camera) — the same direct-attribute-editing pattern already covered for
procedural geometry in [Block 8] §8.5 (`geometry.attributes.position.array`, then
`.needsUpdate = true`). After displacing, call **`geometry.computeVertexNormals()`** — the
official pattern for exactly this sequence (build/mutate custom position data → recompute
normals) appears in the WebGPU point-lights example: `newGeometry.computeVertexNormals();` is
the last call after populating a custom `BufferGeometry` with position/time/seed/displacement
attributes (`examples/webgpu_lights_pointlights.html`) `[CERT-web]`. The GPU-side analogue — a
GLSL vertex shader that reads `texture2D(heightmap, uv).x` and writes it straight into
`transformed.z` before the position transform — is the documented technique behind the GPGPU
water example (`examples/webgl_gpgpu_water.html`) `[CERT-web]`; the same texture-lookup-to-height
idea applies whether the lookup happens once on the CPU (baked into a static mesh) or every
frame on the GPU (live/animated surfaces, not needed for a static ground pad).

**B — Material `displacementMap` (GPU-side, per material)**. `MeshStandardMaterial` (and
`MeshLambertMaterial`, `MeshNormalMaterial`) expose `.displacementMap`: "The displacement map
affects the position of the mesh's vertices... the displaced vertices can cast shadows, block
other objects, and otherwise act as real geometry... white being the highest" — driven by
`displacementScale` and `displacementBias` (seen set alongside it in
`examples/webgl_materials_channels.html`: `displacementMap, displacementScale, displacementBias,
normalMap, normalScale`) (docs/pages/MeshStandardMaterial.html) `[CERT-web]`. The caveat, worded
identically across all three material docs pages: **"For best results, pair a displacement map
with a matching normal map, since the renderer can not recompute surface normals from the
displaced vertices."** `[CERT-web]` — this is the exact line [Block 3] already retrieved in its
material-extension sweep, now confirmed load-bearing for terrain: unlike mechanism A,
`displacementMap` alone leaves the mesh's *normals* flat even though its *silhouette* bends,
producing visibly wrong lighting on slopes unless a baked normal map is supplied alongside it.
`displacementMap` textures must carry `texture.colorSpace = NoColorSpace` (non-color data, same
convention as [Block 9] §9.2's normal-map colorSpace rule) `[CERT-web]`.

**Cost model** `[INFER]`: mechanism A pays once (CPU loop + one `computeVertexNormals()` at
build time, then it's static geometry — same draw-call cost as any other mesh, per [Block 11]'s
per-mesh accounting) versus mechanism B's live per-vertex-shader evaluation every frame (cheaper
to author, costs more per frame, and needs the paired normal map to look right). Segment count
is quadratic in vertex count (`widthSegments × heightSegments`) for both — a coarse 64×64 pad
(4,096 vertices) is enough for a rolling site pad; a 512×512 DEM-accurate patch (262k vertices)
is real terrain-engine territory and should be weighed against [Block 27]'s device-class
triangle budgets before adopting it wholesale `[INFER]`.

## 31.2 — Real elevation data sources: where DEMs come from `[CERT-web]`

Two families: **raw elevation rasters** (one float/int per pixel — GeoTIFF, HGT/Skadi) and
**RGB-encoded elevation tiles** (a PNG whose R/G/B channels *are* the encoded height, streamable
through any ordinary tile pipeline). The tile-friendly encodings matter most for a three.js
CPU-displacement workflow because they can be decoded straight from a loaded `<img>`/canvas —
no GeoTIFF parser needed.

| Source | Encoding | Formula | Range/precision | Access |
|---|---|---|---|---|
| **Mapbox Terrain-RGB / Terrain-DEM** | base-256 across R,G,B | `height = -10000 + ((R*256*256 + G*256 + B) * 0.1)` (docs.mapbox.com, preserved snapshot line 461) `[CERT-web]` | 0.1 m increments, 16,777,216 unique values, data resolved to zoom 15 (256px tiles) | **Keyed** — Mapbox account/token required |
| **AWS Terrain Tiles — Terrarium format** | `red*256 + green + blue/256` then offset | `(r * 256 + g + b / 256) - 32768` (tilezen/joerd `docs/formats.md`, preserved) `[CERT-web]` | meters, range **-11000 to 8900 m**, 256×256 (also 512/260/516 variants) | **Free, no account**: public S3, `aws s3 ls --no-sign-request s3://elevation-tiles-prod/` (registry.opendata.aws/terrain-tiles, preserved) `[CERT-web]` |
| **AWS Terrain Tiles — source data** | n/a (upstream of the above) | — | worldwide coverage | "Mapzen Terrain Tiles provide worldwide basemap coverage sourced from **SRTM** and other open data projects" (tilezen/joerd, preserved) `[CERT-web]` |
| Copernicus DEM (ESA/Copernicus programme) | raw GeoTIFF, no RGB tile encoding by default | — | global, ~30 m/10 m products | Free, registration-gated distribution `[INFER]` (general knowledge, not fetched this iteration — flag for a future gap if load-bearing) |

Practical read for a three.js pipeline `[INFER]`: pull PNG tiles for the site's bounding box at
the target zoom, decode each pixel with the matching formula above into a Float32Array height
grid the size of the tile raster, then feed that grid into mechanism A (§31.1) as the heightmap
source — sampling resolution should match (or undersample, never oversample) the plane's
`widthSegments`/`heightSegments`, since extra plane resolution beyond the DEM's native precision
just adds triangles with no new information.

## 31.3 — MapLibre's own terrain: when to skip hand-built relief entirely `[CERT-doc]`

MapLibre GL JS (the map renderer already documented for equipment placement in [Block 16]) does
**not** require three.js for terrain — the official "Add 3D terrain to a map" example builds
relief natively through the style spec, preserved in full:

```js
sources: {
  osm: { type: 'raster', tiles: [...] },
  terrainSource: { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' },
  hillshadeSource: { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' }
},
layers: [ { id: 'hills', type: 'hillshade', source: 'hillshadeSource', ... } ],
terrain: { source: 'terrainSource', exaggeration: 1 },
sky: {}
```
— plus `map.addControl(new maplibregl.TerrainControl({ source: 'terrainSource', exaggeration: 1
}))` for a UI toggle (maplibre.org 3d-terrain example, preserved) `[CERT-doc]`. The `raster-dem`
source type and `terrain.exaggeration` are first-class style-spec concepts; MapLibre decodes the
DEM tiles and deforms its own map mesh, entirely inside its own GL context.

**Decision rule** `[INFER]`: if the deliverable is *the map itself in 3D* (site survey, campus
overview, roof/ground slope visualization) — use MapLibre's native `terrain` + `raster-dem`
source and drop the three.js custom layer ([Block 16] §16.2) on top purely for the *equipment*
georeferenced meshes, exactly as [Block 16] §16.3 already suggested for "duct/piping runs over
terrain." If the deliverable is a **standalone HTML three.js scene** (the corpus's dominant
pattern, [Block 1] §1.3) with no map chrome, tiles, or attribution requirement, hand-built relief
via §31.1 is the only option — MapLibre's terrain is not extractable as a bare three.js mesh
without leaving the map runtime.

## 31.4 — Cheap terrain texturing `[CERT-web]` / `[INFER]`

Once the mesh has relief, coloring it doesn't need a satellite photo:

1. **Vertex color by altitude/slope**: the corpus's existing `InstancedMesh.setColorAt` /
   per-vertex-color technique ([Block 24] §24.4) generalizes directly — instead of tinting
   voxel instances by equipment state, tint each terrain vertex by its own height (grass-green
   low, rock-grey high, snow-white peaks) or by slope (steeper = more exposed rock tone),
   computed once at mesh-build time from the same heightmap data already read in §31.1, no extra
   texture or draw call `[INFER]`.
2. **CanvasTexture gradients**: the same 1×32px gradient-canvas technique documented for sky
   backgrounds ([Block 24] §24.5, sourced from `webgl_volume_cloud.html` `[CERT-web]`) applies
   to a low-frequency ground tint too — a tiny vertical gradient sampled by UV-mapped altitude
   is a cheaper alternative to per-vertex colors when the geometry can't easily carry a vertex
   color attribute (e.g. an imported, non-procedural mesh) `[INFER]`.
3. **Satellite/aerial imagery draping**: covered structurally, not technically, by [Block 16]
   §16.2 — the official MapLibre example family explicitly lists "terrain draping" alongside the
   3D-model custom-layer example `[CERT-web]`; for a hand-built three.js patch, the equivalent is
   fetching the matching raster/orthophoto tile for the same bounding box used for the DEM
   (§31.2) and applying it as the plane's `.map`, UV-aligned to the same grid the heights were
   sampled from — highest visual fidelity, highest asset weight (network-fetched imagery breaks
   the standalone-HTML constraint, same tradeoff flagged in [Block 16] §16.3) `[INFER]`.

## 31.5 — SYNTHESIS: three site-context recipes for this corpus `[INFER]`

| Recipe | What it is | Cost | Fidelity | Effort |
|---|---|---|---|---|
| **(a) Stylized flat pad (today's baseline)** | Concrete plinth material on a flat `PlaneGeometry`/box — the corpus's current answer: `roughness:0.9, metalness:0.03-0.04` concrete-plinth recipe (`chiller-aircooled-realistic (7).html:193,195`, [Block 3] §3.3) `[CERT]` | Zero — already in every realistic prototype | Low (no relief, no site accuracy) | None — already shipped |
| **(b) Real-relief patch from terrain-RGB tiles** | Fetch Terrain-RGB/Terrarium tiles for the known site bbox (§31.2) → decode height grid → CPU-displace a subdivided `PlaneGeometry` (§31.1-A) → `computeVertexNormals()` → tint by altitude/slope or drape satellite imagery (§31.4) | Medium — one-time tile fetch + decode script, moderate vertex count, still a single static mesh at runtime | High for the immediate site footprint; DEM precision-limited (0.1 m Mapbox / whole-meter Terrarium) | Medium — needs a tile-fetch+decode step outside the browser or a one-time build script; breaks strict standalone-HTML unless tiles are pre-baked into the file |
| **(c) Full MapLibre terrain + three.js equipment overlay** | Native MapLibre `terrain`+`raster-dem` (§31.3) for the ground, three.js `CustomLayerInterface` ([Block 16] §16.2) for georeferenced equipment meshes on top | Highest — adopts a second map runtime, live tile network dependency, own GL context | Highest — real-world basemap, live imagery, built-in hillshade/sky, camera controls for free | Low-Medium for the terrain half (it's declarative style-spec config); Medium for the equipment half (existing [Block 16] interop work) |

**Recommendation** `[INFER]`: keep (a) as the default for generic/marketing renders (no real
site to model); reach for (b) only when a specific customer site's actual grade matters (roof
slope, ground-mount pad drainage) and the deliverable must stay a single HTML file; go straight
to (c) when the deliverable is inherently a *site map* (multi-building campus, GIS-adjacent
tooling) rather than an equipment close-up — in which case MapLibre's terrain is strictly better
than reinventing DEM decoding inside three.js.

## 31.6 — Connections

- **[Block 16]** §16.2-16.3 — MapLibre's own terrain (§31.3) is the "just use the map" escape
  hatch from hand-building relief; the equipment custom-layer pattern is what recipe (c) drapes
  on top.
- **[Block 14]** §14.1 site 3 (little-landscapes) — a working proof that tile-based procedural
  terrain scales to a full generator on the same importmap+readable-source stack this corpus
  uses, corroborating that recipe (b) is buildable without leaving the corpus's toolchain.
- **[Block 8]** §8.5 — direct BufferGeometry/position-attribute editing is the exact mechanism
  §31.1-A reuses for height displacement instead of arbitrary procedural shape.
- **[Block 24]** §24.4-24.5 — vertex-color-by-attribute and CanvasTexture-gradient techniques
  are the terrain-texturing answers in §31.4, not new techniques.
- **[Block 3]** §3.3 — the concrete-plinth material is recipe (a), the corpus's current (only)
  site-context answer.
- **[Block 11]** / **[Block 27]** — segment-count/vertex-count cost tradeoffs in §31.1 should be
  checked against the device-class triangle budgets before adopting recipe (b) at scale.
