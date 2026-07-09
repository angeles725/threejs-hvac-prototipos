# Block 32 — Buildings/BIM: building shells and floor plans as context for HVAC equipment

> Research of **building-scale context** for the HVAC corpus: how to give equipment a shell to
> sit inside — real IFC/BIM import via the ThatOpen (formerly IFC.js) web-ifc ecosystem,
> floor-plan-to-3D wall extrusion (a technique the corpus already practices by hand), and cheap
> footprint+height massing (OSM buildings / MapLibre fill-extrusion) for city-scale site context.
> Closes G32 — **the final gap of the 32-gap backlog (run 5, run-set complete)**.
>
> Sources: `web-ifc` and `@thatopen/components` official READMEs/docs — PRESERVED at
> `sources/web-snapshots/raw.githubusercontent.com_ThatOpen_engine_web-ifc_main_README.md.md`,
> `..._package.json.md`, `raw.githubusercontent.com_ThatOpen_web-ifc-three_main_README.md.md`,
> `raw.githubusercontent.com_ThatOpen_engine_components_main_README.md.md`,
> `..._packages_core_package..md`, `docs.thatopen.com_Tutorials_Components_Core_IfcLoader.md`
> `[CERT-web]` · MapLibre "Display buildings in 3D" official example — PRESERVED at
> `sources/web-snapshots/maplibre.org_maplibre-gl-js_docs_examples_display-buildings-in-3d_.md`
> `[CERT-doc]` · OpenStreetMap wiki "Simple 3D buildings" — PRESERVED at
> `sources/web-snapshots/wiki.openstreetmap.org_wiki_Simple_3D_buildings.md` `[CERT-web]` ·
> local corpus file `cuarto-frio-plano-realistic (6).html` `[CERT]` · blueprint3d/OpenPlan3D
> ecosystem + three.js forum threads `[CERT-a]`.
> Method: preserve-first web fetches (fetch-doc.sh; GitHub blob pages return a JS shell, so raw
> `raw.githubusercontent.com` URLs were fetched instead — noted as a mechanical gotcha), WebSearch
> for ecosystem/maturity signals, corpus grep for existing plan-to-3D usage (found — this gap
> connects to prior work rather than starting cold). Markers: `[CERT]` local · `[CERT-doc]`
> official document preserved in sources/ · `[CERT-web]` official web · `[CERT-a]` secondary ·
> `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 5, final block). Connects [Block 8] §8.1 (ExtrudeGeometry/Shape
> census), [Block 12] (two-pass workflow), [Block 16] (MapLibre interop), [Block 29] (equipment
> viewer domain), [Block 31] (terrain/site context).

---

## 32.1 — IFC on the web: the ThatOpen ecosystem (formerly IFC.js) `[CERT-web]`

**What IFC is, for a non-BIM team** `[INFER]`: Industry Foundation Classes is the neutral file
format architects/MEP engineers export from Revit/ArchiCAD/Tekla — a real building's walls,
floors, spaces, storeys, and (for an HVAC team specifically) existing mechanical systems, encoded
with semantic metadata, not just geometry. Getting an IFC into three.js means parsing that format
and generating renderable geometry from it — building it from scratch is a large undertaking;
`web-ifc` is the WASM library that already did it.

**Naming history** `[CERT-web]`: the project was originally **IFC.js** (`ifcjs.github.io`,
`github.com/IFCjs`) — three packages: `web-ifc` (WASM parser core), `web-ifc-three` (the Three.js
loader), `web-ifc-viewer` (BIM-tool extension: dimensions, clipping planes, 2D plan navigation).
It has since rebranded as **That Open Company** (`thatopen.com`), and the GitHub org moved to
`github.com/ThatOpen`. The preserved `web-ifc-three` README states plainly, as its first line
after the header banner: **"THIS LIBRARY IS DEPRECATED. USE COMPONENTS INSTEAD"** `[CERT-web]`
(`sources/web-snapshots/raw.githubusercontent.com_ThatOpen_web-ifc-three_main_README.md.md`) —
the old three-package split (web-ifc / web-ifc-three / web-ifc-viewer) is superseded by a single
current package family.

**Current architecture** `[CERT-web]`:

| Package | Role | License | Version (fetched) | Citation |
|---|---|---|---|---|
| `web-ifc` (npm) | WASM IFC parser core — reads/writes IFC "at native speeds"; exposes `WebIFC.IfcAPI` (`Init()`, `OpenModel()`, `CloseModel()`) | **MPL-2.0** | 0.0.78 | `sources/web-snapshots/raw.githubusercontent.com_ThatOpen_engine_web-ifc_main_package.json.md` |
| `@thatopen/components` (npm `OBC` namespace) | Current three.js integration layer — "a collection of BIM tools based on Three.js"; includes `Worlds`/`SimpleScene`/`SimpleCamera`/`SimpleRenderer` scaffolding plus `IfcLoader` | **MIT** | 3.4.6 | `sources/web-snapshots/raw.githubusercontent.com_ThatOpen_engine_components_main_packages_core_package..md` |
| `@thatopen/components-front` | Browser-only extras (postproduction, floorplan navigation, DXF export) layered on the core | MIT (same repo/org) | — | `sources/web-snapshots/raw.githubusercontent.com_ThatOpen_engine_components_main_README.md.md` |
| `web-ifc-three` (npm, legacy) | Old direct Three.js `IFCLoader` | — | — | superseded, do not adopt new |

**The maturity-relevant workflow detail** `[CERT-web]`: `@thatopen/components`'s `IfcLoader`
tutorial states explicitly — *"Loading IFC models at runtime is too slow for production — the
engine must parse and convert it to Fragments before anything can render. The recommended
workflow is to do that conversion once, save the resulting `.frag` file, and load that on every
subsequent session."* (`docs.thatopen.com_Tutorials_Components_Core_IfcLoader.md`). This is the
same "convert once, ship the converted asset" pattern the corpus already applies for glTF via
`GLTFExporter` ([Block 19] §19.2) — an IFC-to-Fragments conversion is architecturally the BIM
equivalent of that export step, not a runtime-load-and-go path.

**What IFC gives an HVAC team that the corpus doesn't have today** `[INFER]`: real walls/floors
with as-built dimensions from the actual architectural model, `IfcSpace`/`IfcBuildingStorey`
metadata (room boundaries and floor grouping straight from the source, no manual polygon
transcription), and — if the architect/MEP handoff includes it — existing HVAC/plumbing/electrical
systems as IFC entities, giving collision context for new equipment placement that a hand-modeled
shell can never have (since it was never surveyed).

## 32.2 — Floor-plan-to-3D: the technique the corpus already uses `[CERT]`

Before reaching for IFC, the corpus already has a working answer for the far more common case —
*no BIM model exists, only a 2D plan* — and it's local, not hypothetical. `cuarto-frio-plano-realistic
(6).html` builds an entire multi-room cold-storage building from a hardcoded plan-coordinate table:

```js
const SCALE = 6, MINZ = -5, HGT = 42, TW = 0.8;                    // plan-units -> scene-units + wall thickness
const VX = x => x * SCALE, VZ = z => (z - MINZ) * SCALE;           // plan (x,z) -> world (x,z)
const PLAN = [
  { id:'ref', type:'refrig', disp:'REFRIGERACIÓN', poly:[[0,0],[12,0],[12,15],[0,15]], evap:4 },
  { id:'con', type:'congel', disp:'CONGELACIÓN',   poly:[[0,15],[0,20],[18,20],[18,0],[12,0],[12,15]], evap:4 },
  // ...4 more rooms, one non-rectangular (L-shaped 'cv1')
];
```
(`cuarto-frio-plano-realistic (6).html:100-116`) `[CERT]`. Each room is a literal polygon in plan
units (comment: "ESCALA PLANO -> REAL" — scale plan→real), mapped to world coordinates by `VX`/
`VZ` (`:106,121`). This is **manual digitization**, not runtime image tracing: someone read
coordinates off a reference drawing and typed them in as data, once, offline. The technique has
two parts:

1. **Floor and ceiling — `Shape` + `ShapeGeometry`, arbitrary polygon**: `roomShape(vp)` builds a
   `THREE.Shape` by `moveTo`/`lineTo`-ing through each room's vertex list, then
   `new THREE.ShapeGeometry(roomShape(r.vpoly))` renders it flat, rotated onto the horizontal
   plane, once for a translucent per-room color tint (floor level) and once for the ceiling
   (`cuarto-frio-plano-realistic (6).html:221-225`) `[CERT]`. `ShapeGeometry` handles the
   non-rectilinear 'cv1' room (a 6-vertex L-shape, `:115`) exactly as easily as the rectangular
   ones — this is the general-purpose part of the technique, and it's the same `Shape` primitive
   [Block 8] §8.1 already catalogs for flat cutouts.
2. **Walls — axis-aligned `BoxGeometry` segments, not `ExtrudeGeometry`**: `buildWallV`/
   `buildWallH` walk each room polygon edge and place a `box()` panel per straight run, split at
   door locations by `splitSegs()` (`:234-247`), with corner posts (`box(1.6,HGT,1.6,...)`) closing
   the gaps left by a `WIN` (0.9-unit) inward setback at every vertex (`:248-254`) `[CERT]`. This
   only works because every edge here is axis-aligned — the code tests `a[0]===b[0]` (vertical
   run) vs. else (horizontal run) at `:250-252` to pick which wall-builder to call. **This is the
   corpus's actual shortcut**: for a rectilinear plan, stacking oriented boxes along each wall run
   is cheaper to write and reason about than extruding a wall cross-section along an arbitrary
   path.

**The general form (for a plan that isn't rectilinear)** `[INFER]`: when wall segments aren't
axis-aligned, the box-stacking shortcut breaks — the corpus's own `if(a[0]===b[0])` branch has no
`else`-case handler for a diagonal edge. The general technique (task-specified, not found locally)
is a **wall cross-section `Shape` extruded along the polygon edge as a path** — either repeated
`ExtrudeGeometry` calls per edge (short straight segment, oriented and positioned like the box
segments already are here) or a single `ExtrudeGeometry(crossSectionShape, {extrudePath: <plan
outline as a Curve>})`, using the same `ExtrudeGeometry` primitive [Block 8] already documents for
beveled fan-blade profiles — just walked along a floor-plan polygon instead of a mechanical
profile.

**Image-underlay tracing** (not present in this corpus) `[INFER]`: the runtime-interactive
variant of the same idea — load a scanned/exported plan PNG as a ground-plane texture (or a
CanvasTexture-drawn overlay, the same technique [Block 9] documents for procedural textures), then
let a user click points on top of it to build the `Shape` polygon live, instead of typing plan
coordinates once as the corpus does. **Notable open tools** `[CERT-a]`: `furnishup/blueprint3d`
("Build interior spaces in 3D" — data model for a 2D floorplan + 3D viewer, three.js-based) is the
long-standing reference implementation of this pattern; it's unmaintained and pinned to deprecated
three.js APIs, but **`blueprint3d-modern`** is an active TypeScript rewrite targeting three.js
r181, announced on the official three.js forum (`discourse.threejs.org/t/blueprint3d-modern...`) —
the same forum already mined for corroborating evidence in [Block 20]/[Block 21]. `OpenPlan3D` is
a newer free/open alternative with the same 2D-plan → 3D-walkthrough shape. None of these were
fetched/preserved this iteration (flagged `[CERT-a]`, not `[CERT-web]`) since they're secondary to
the corpus's own already-working technique, not a required substitution for it.

## 32.3 — Simple building shells: massing from footprint + height `[CERT-web]`

The cheapest building-shell technique skips walls/floors/rooms entirely: extrude a **footprint
polygon** straight up by a single height value — a box, not a building. Two sources feed this:

- **OpenStreetMap buildings**: OSM tags footprints with `building=*` and (per the official wiki
  "Simple 3D buildings" spec, preserved) a `height` tag, with `building:part=*` sub-areas each
  carrying their own height for stepped/complex massing, extruded "from the ground up unless a
  `min_height` tag is specified" (`wiki.openstreetmap.org_wiki_Simple_3D_buildings.md`)
  `[CERT-web]`. This is free, worldwide, no-account data — the same "public tile data" character
  as the AWS Terrain Tiles already used for terrain in [Block 31] §31.2. A three.js pipeline
  consuming it would fetch the building footprint (an Overpass API query or a vector tile), then
  run exactly the polygon-to-`Shape`-to-`ExtrudeGeometry` path described in §32.2's general form —
  a footprint is just a floor-plan polygon with one height instead of walls-plus-rooms.
- **MapLibre `fill-extrusion`**: the map-side alternative already implied by [Block 16]. The
  official "Display buildings in 3D" example builds extruded buildings as a declarative style
  layer — `type: 'fill-extrusion'` with `fill-extrusion-height` / `fill-extrusion-base` / `-color`
  paint properties driven straight from vector-tile building-height data, no three.js geometry
  involved at all (`maplibre.org_maplibre-gl-js_docs_examples_display-buildings-in-3d_.md`)
  `[CERT-doc]`. This is the same "let the map do it natively" pattern [Block 31] §31.3 already
  established for terrain (`raster-dem` + `TerrainControl`) — buildings get the identical
  treatment (`fill-extrusion` is a first-class style-spec layer type, decoded and rendered inside
  MapLibre's own GL context, same as terrain).

## 32.4 — SYNTHESIS: when each building-context technique wins `[INFER]`

| Technique | Input required | Fidelity | Effort | Best fit |
|---|---|---|---|---|
| **IFC import** (§32.1, ThatOpen `@thatopen/components` `IfcLoader` → Fragments) | A real BIM handoff exists (architect/MEP exported an `.ifc`) | Highest — as-built walls/floors/spaces/systems, real dimensions | Highest — new dependency (MPL-2.0 core + MIT wrapper), IFC→Fragments conversion step, learning the `OBC` API | Retrofit/renovation jobs where a real building model already exists and equipment must be checked against real walls/ducts/clearances |
| **Plan-extrusion** (§32.2, `Shape`+`ShapeGeometry`/`ExtrudeGeometry` from digitized coordinates) | Only a PDF/PNG/paper plan exists — **this corpus's `cuarto-frio` case** | Medium — accurate footprint/room layout, no real wall thickness/material fidelity beyond what's authored | Low — pure three.js, zero new dependencies, technique already proven working in the corpus | The corpus's actual recurring situation: a customer sends a floor plan (not a BIM file) and the room shell exists only as context for the mechanical equipment inside it |
| **OSM footprint massing** (§32.3) | Only an address/site exists — no plan at all, city-scale context needed | Low — box massing, no interior, approximate real-world height | Low — free public data, same `Shape`/`ExtrudeGeometry` pipeline as plan-extrusion | Site-context renders where the building is a backdrop, not the deliverable (neighboring structures, campus overview) |
| **MapLibre `fill-extrusion`** (§32.3) | Map-first deliverable (the map itself is being shown in 3D) | Low-medium — same box massing as OSM, but native to the map runtime | Lowest for the building half (declarative style layer); ties into [Block 16]'s existing custom-layer work for equipment | Site-survey/GIS-adjacent deliverables, same territory [Block 31] §31.3 already carves out for terrain |

**Fit with the two-pass workflow** ([Block 12]) `[INFER]`: in every row above, the building shell
is a **context layer**, never the hero — it should be built cheap (plan-extrusion or massing,
untextured or lightly tinted, no shadows-from-equipment-onto-building fidelity beyond what
[Block 5]'s existing shadow rig already gives for free) so the render budget stays with the
HVAC equipment itself. IFC import is the one path that inverts this: once real geometry exists at
`.frag`-cached load speed, treating the building shell as "free" context becomes reasonable even
at higher fidelity, since the expensive parse happened once, offline — mirroring exactly how
[Block 19]/[Block 25]'s glTF-optimize-once pipeline treats equipment assets today. **Decision
rule**: default to plan-extrusion (it's already proven in this corpus and needs no new
dependency); reach for OSM/MapLibre massing only when the deliverable is inherently site-scale;
adopt the ThatOpen IFC stack only when a real `.ifc` handoff actually exists — never speculatively,
given its added dependency weight relative to the zero-dependency plan-extrusion path already
working today.

## 32.x — Connections

- **[Block 8]** §8.1 — `Shape`/`ShapeGeometry`/`ExtrudeGeometry` are the exact primitives §32.2
  and §32.3 reuse for floor/ceiling polygons and footprint massing; this block adds the
  floor-plan/footprint use case, not new geometry APIs.
- **[Block 12]** — the two-pass (voxel-first, realistic-second) synthesis's "context vs hero
  layer" framing is what §32.4's decision rule and effort ranking are built on.
- **[Block 16]** §16.2-16.3 — MapLibre's `CustomLayerInterface` equipment-overlay pattern is what
  the "map-first" row in §32.4 drapes building massing under; §32.3's `fill-extrusion` mirrors
  [Block 31] §31.3's "let the map do it natively" argument for terrain, applied to buildings.
- **[Block 19]** §19.2 — `GLTFExporter`'s "convert once, ship the converted asset" pattern is the
  direct architectural precedent for the IFC-to-Fragments conversion step §32.1 documents as
  mandatory for production use.
- **[Block 29]** — the equipment-viewer conventions (exploded views, hotspots, status color) this
  domain layer targets; a building shell from any technique in this block is the stage those
  conventions perform on, never the subject itself.
- **[Block 31]** — terrain/site-context sibling gap from the same run; §32.3's OSM/MapLibre
  massing techniques are the building-scale analogue of that block's DEM/heightmap techniques,
  and both converge on the same "let MapLibre do it natively vs. hand-build in three.js" decision
  shape.
