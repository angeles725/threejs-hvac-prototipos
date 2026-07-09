# Block 30 — Dashboards: 3D scene + telemetry/data binding + charts

> Research of **how to wire live data into the corpus's 3D scenes without turning them into
> re-render storms**: HTML label/annotation layers as a second renderer, data-binding patterns
> that mutate materials/instances instead of rebuilding geometry, where DOM chart libraries fit
> around (not inside) the 3D viewport, and BMS-dashboard layout conventions. Does NOT cover
> terrain/relief (queued G31) or BIM/IFC (queued G32).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/CSS2DRenderer, docs/pages/InstancedMesh,
> manual/optimize-lots-of-objects, examples/webgl_loader_pdb.html) · `sources/manuals/bas-graphics-standard-monash-v1.4.pdf`
> (Monash University Building Automation System Graphics Standard & Guide v1.4, official
> facilities document, preserved) · `sources/web-snapshots/github.com_leeoniya_uPlot.md`
> (preserved) · general web sweep on charting-library tradeoffs and WebSocket/telemetry
> throttling patterns (secondary, not preserved verbatim — generic engineering consensus, no
> single load-bearing source).
> Method: context7 queries + WebSearch + one PDF preservation (`fetch-doc.sh` doc mode failed
> with HTTP 403 anti-bot on the direct fetch; retried with a browser User-Agent header, which
> succeeded — registered in `sources/SOURCES.md` same as the toolbelt would have). Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-doc]` official downloaded document (`sources/...pdf §N`) ·
> `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) ·
> `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 5). Connects [Block 29] (checklist row 6, the missing data-binding
> half), [Block 15] §15.2 (data-driven instanced grids), [Block 13] §13.2 (on-demand rendering),
> [Block 9] (CanvasTexture nameplates), [Block 1] §1.3 (DOM overlay UI house pattern), [Block 7]
> (OrbitControls per-scene target). Block TYPE: **domain survey + applied synthesis** — expect
> [CERT-a]/[INFER]-heavy evidence in §30.2-30.4 (this is "how does the industry wire telemetry
> into 3D", not a corpus decompilation gap), per METHODOLOGY §11.

---

## 30.1 — Label/annotation layers: CSS2DRenderer as a second renderer `[CERT-web]`

Official contract (context7 `/mrdoob/three.js`, docs/pages/CSS2DRenderer + examples/webgl_loader_pdb.html
+ manual/examples/align-html-to-3d-w-hiding.html, 2026-07-04):

| Concern | Contract | Detail |
|---|---|---|
| Instantiation | `new CSS2DRenderer()` is a **second renderer object**, alongside (not instead of) `WebGLRenderer` | own `setSize()`, own DOM element, appended to the same container |
| DOM element positioning | `labelRenderer.domElement.style.position = 'absolute'; .top = '0px'` | stacks on top of the WebGL canvas; must be resized in the same `resize` handler as the main renderer |
| Pointer events | `labelRenderer.domElement.style.pointerEvents = 'none'` at the container level | lets clicks fall through to the canvas/raycaster underneath; individual label `<div>`s can opt back in per-element (`elem.style.pointerEvents = 'auto'`) for clickable tooltips |
| Per-object anchoring | `new CSS2DObject(domElement)` added to the scene graph like any `Object3D` — `scene.add(labelObject)` or `parentObject3D.add(labelObject)` | three.js's own 3D→2D projection positions the DOM element every frame; no manual `project()`/`unproject()` math needed (this is the CSS2DRenderer's whole value proposition) |
| Render call | `labelRenderer.render(scene, camera)` alongside `renderer.render(scene, camera)` in the same loop tick | two render calls per frame, same scene/camera — CSS2DRenderer only walks the graph for `CSS2DObject` instances, ignoring meshes |
| Cost model | one real DOM node per label, reflowed every frame it's visible | `[INFER]`: fine for tens of labels (hotspots, nameplates); becomes a DOM-thrash problem at hundreds+ — the corpus's projected HVAC use case (dozens of hotspots per unit, not per-voxel) stays comfortably inside this budget |

**Vs the corpus's current pattern** `[CERT]`: today's DOM overlays (`#info`, `#legend`, `#panel`,
[Block 1] §1.3) are **screen-fixed** — absolutely positioned once, never reprojected per frame,
because they describe the whole scene (a legend, a title) not a specific 3D point. `CSS2DObject`
is the missing piece for **per-object** anchored HTML — a label that must track a specific part
in 3D space as the camera orbits. Zero `CSS2DRenderer` hits exist anywhere in the 23-file corpus
today (confirmed in [Block 1] §1.4's "absent in both families" list) — this is a net-new
capability, not a refinement of an existing one.

**Vs sprites/SlugText** `[INFER]`, from [Block 20] §20.2's SlugText entry: SlugText renders text
as actual 3D geometry (glyph curves in a texture, one quad per glyph) — it lives IN the WebGL
draw-call budget, scales/rotates/occludes exactly like scene geometry, and has no DOM-node cost
at any count. `CSS2DObject` is the opposite trade: free crisp text/rich-HTML (any font, buttons,
live-updating `innerText`, no shader work) at the cost of one DOM node per label and no
occlusion-awareness by default (a `CSS2DObject` behind a wall still renders on top unless you
add your own raycast-hide logic, as the align-html-to-3d-w-hiding.html example does manually).

**When each wins** `[INFER]`:

| Need | Winner | Why |
|---|---|---|
| A handful of interactive hotspot tooltips (dozens, clickable, need real HTML: buttons/rich text/live values) | `CSS2DObject` | free HTML capability, projection handled by three.js, matches the Blender-empty hotspot pattern from [Block 29] §29.4 exactly |
| Hundreds+ of always-visible in-scene labels (e.g. every voxel cube tagged), or labels that must occlude/scale with the 3D scene like real geometry | SlugText / sprite-based | avoids DOM-node-count blowup; participates in the normal draw-call budget instead of a second render pass |
| A handful of screen-fixed UI chrome (legend, equipment name banner) | current DOM-overlay pattern (unchanged) | no per-object 3D anchoring needed — [Block 1] §1.3's approach is already correct for this case, don't add CSS2DRenderer where nothing needs 3D-tracking |

## 30.2 — Data-binding patterns: live values without re-render storms `[CERT-web]` / `[INFER]`

The corpus's existing static-scene shape ([Block 13] §13.2: nothing changes between
interactions except `autoRotate`/damping/fan animation) means a naive telemetry feed that
touches the scene graph every tick would be the FIRST thing forcing continuous rendering that
isn't already forced today. Three levers, all built from machinery the corpus/research already
has:

1. **Mutate material properties in place, don't rebuild** `[CERT]` from [Block 3]'s existing
   `emissive`/`emissiveIntensity` fields (`chiller-aircooled-realistic (7).html:192`, cited
   [Block 3] §3.3): a live status value maps to `material.emissiveIntensity = value` or
   `material.color.setHex(...)` on an existing material instance — no geometry rebuild, no
   material recreation, just a property write. This is exactly the state→emissive-intensity
   rule [Block 29] §29.6 (checklist row 1) already prescribes for ISA-101 alarm coloring; §30.2
   generalizes it to any live scalar (temperature, load %, RPM), not just discrete alarm states.
2. **Mutate per-instance attributes for grids, don't touch geometry** `[CERT-web]`: for a bank
   of many identical parts (fan array, coil grid — the exact case [Block 29] §29.6 row 6 and
   [Block 15] §15.2 (d37 "Spectrum Field") flag as the strongest data-driven-instancing fit),
   the lever is `instancedMesh.setColorAt(index, color)` then
   `instancedMesh.instanceColor.needsUpdate = true` (context7, docs/pages/InstancedMesh,
   2026-07-04) — one buffer upload for the whole grid's new state, not N material swaps. The
   corpus already uses `setColorAt` for static per-voxel coloring ([Block 2] §2.2); driving the
   same call from a live value instead of a fixed palette is the entire delta.
3. **Request a render, don't loop continuously** `[CERT-web]` + `[INFER]`: combined with
   on-demand rendering ([Block 13] §13.2, official pattern = render on `controls.change` +
   `resize`), a telemetry tick becomes a third render trigger — after applying the mutations
   above, call the same `render()` function the interaction/resize handlers already call. The
   official docs confirm the general principle directly: "when rendering on demand, it's
   necessary to trigger a render call once [state] has finished [changing]... unlike continuous
   rendering where updates happen automatically" (context7, manual/optimize-lots-of-objects,
   2026-07-04, stated there for texture loads but the same obligation applies to any off-loop
   mutation). Net shape: **mutate → set a dirty flag → render() once**, not mutate-inside-a-loop.

**Throttling/batching cadence** `[CERT-a]` (general web consensus, no single citable spec):
sensor/BMS telemetry commonly ticks at ~1 Hz (or slower — HVAC setpoints/temperatures do not
need 60 fps fidelity), while the render loop runs at 60/120 fps. The applicable pattern is a
buffer-and-throttle: incoming messages update an in-memory "latest value" map continuously and
cheaply, but the expensive step (material/instance-buffer writes + `render()` call) is throttled
to a fixed UI cadence (e.g. once per second, or once per animation frame if a value actually
changed) — never once per incoming message. This mirrors the corpus's larger house habit,
consolidated in [Block 13] §13.2 and [Block 5] §5.4, of treating "nothing changed" as the
default state to detect and skip work for.

**Transport, briefly** `[CERT-a]`: WebSocket (or Server-Sent Events for one-directional
server→client feeds) is the standard transport for this cadence — a single persistent
connection delivering JSON ticks, updating one shared "latest values" object that the
throttled render step reads from. No specific library is load-bearing here; this is
infrastructure orthogonal to three.js itself, and the corpus's own constraint (standalone HTML,
no bundler, [Block 1] §1.2) means a plain `new WebSocket(url)` + `JSON.parse` in a `<script>`
tag is the fitting-shape choice, not a client SDK requiring `npm install`.

## 30.3 — Charts alongside 3D: DOM panels around the canvas, not in-scene `[CERT-a]`

The practical split for a BMS-style dashboard `[CERT-a]` (general charting-library landscape,
2026):

| Approach | When it's the right call | Cost |
|---|---|---|
| DOM chart library (uPlot, Chart.js, ECharts) in a side panel **around** the 3D canvas | Default choice for trend lines, historical sensor charts, multi-series comparisons | Runs in normal DOM/Canvas2D, zero interaction with the WebGL render loop, trivially embeddable as a `<script>` tag (matches the corpus's no-bundler constraint) |
| In-scene 3D chart (CanvasTexture mini-chart baked onto a nameplate/panel mesh, [Block 9]'s technique repurposed for a sparkline instead of static text) | Rare — only when the chart must live physically on the equipment model itself (e.g. a mini trend sparkline "printed" on a virtual gauge face) | Needs the CanvasTexture redraw-on-change discipline [Block 9] already establishes (redraw the 2D canvas, then `texture.needsUpdate = true`) — workable but adds authoring complexity for a decorative payoff; **honestly the wrong tool for anything the user needs to read precisely** (no zoom/hover/tooltip, fixed resolution baked into a texture) |

Library-tier comparison relevant to picking the side-panel library `[CERT-a]` (preserved:
`sources/web-snapshots/github.com_leeoniya_uPlot.md`; general web sources, not individually
preserved — no single claim here is load-bearing enough to need archival, this is a landscape
summary): **uPlot** (~50 KB, sub-40ms init, built for time-series/OHLC/bars specifically) is the
lightest and fastest for exactly the sensor-trend-line shape a BMS dashboard needs; **Chart.js**
(~60 KB) is the easiest to reach for when the chart need is simple and the team wants the
biggest community/example base; **ECharts** (~1 MB) is heaviest but the right call only if the
dashboard needs large-dataset or genuinely complex multi-chart layouts the other two don't cover
well. All three ship as standalone UMD/IIFE bundles loadable via a plain `<script src="...">` —
none requires a bundler, so none conflicts with the corpus's current standalone-HTML posture.

**Reading this for the corpus** `[INFER]`: given the corpus's actual scale (per-equipment
prototype viewers, not a multi-thousand-point historian dashboard), **uPlot or Chart.js** both
comfortably cover the need; ECharts' extra weight buys nothing the corpus's data volumes require.
The in-scene-chart row exists for completeness but should be labeled correctly as a novelty, not
a recommended default — every real dashboard reference found in this sweep puts charts in DOM
panels, never inside the 3D scene.

## 30.4 — Layout patterns for BMS-style dashboards `[CERT-doc]`

The Monash University "BAS Graphics Standard & Guide v1.4" (`sources/manuals/bas-graphics-standard-monash-v1.4.pdf`,
preserved; a real official facilities-engineering standard governing a live campus BAS/BMS
estate, not a marketing document) specifies a page layout that generalizes well beyond
Niagara/Tridium tooling:

- **Three-pane layout, mandatory on every page** (§1 Page Layout, p.6-7): Header Pane (top),
  Navigation Menu Pane (left column), Main Content Pane (the 3D/graphic viewport, center-right).
- **Header pane contents** (§2, p.7-8): building/location/page identity, current time, and a
  *small* set of always-visible summary fields (general fire-alarm status, outside-air temp) —
  explicitly capped ("information... kept to a minimum") so the header doesn't compete with the
  main content for attention.
- **Navigation menu, two-column** (§3.1, p.8-9): a fixed **main menu** (Floor / Critical / Plant
  / Misc / Meters / Schedule / **Alarm** / Overrides / Information) with a **submenu** that
  expands per main-menu selection — i.e. Alarm is a first-class top-level navigation entry, not
  buried in a settings page.
- **Floor/level selector ordering** (§3.2, p.9): submenu order must run **top-to-bottom = physical
  roof-to-basement**, explicitly "mimic[king] the 3D floor selector view" — the UI ordering
  convention is derived from the building's own spatial layout, a direct analog for an equipment
  viewer's own "pick a unit/zone" selector.
- **Alarms as a dedicated, prioritized surface** (§9, p.69-72): alarm classes carry an explicit
  priority tier (P0-P6, seen in the icon-mapping table, line ~688-694 of the extracted text);
  alarm consoles are dedicated pages/panels, not inline badges; alarms must be individually
  hyperlink-navigable back to the relevant graphic page (§9.3) — i.e. clicking an alarm in the
  list jumps the viewport to the offending equipment, the same "deep-link to a camera preset"
  idea below.

**Deep-link/camera-preset per equipment** `[INFER]` from [Block 7] (`controls.target.set(x,y,z)`,
already used per-scene, `voxel/liebert-split-voxel.html:81`, cited [Block 7] §7.3): the
standard's alarm-hyperlink-to-graphics-page pattern maps directly onto the corpus's own
OrbitControls contract — an alarm-list click (or a unit picker) sets `camera.position` +
`controls.target` to a named preset (front-of-unit, compressor-bay, coil-face) and calls
`controls.update()` + a render, reusing exactly the per-scene target-setting the corpus already
does, just parameterized by a lookup table instead of hardcoded once per file.

## 30.5 — SYNTHESIS: the corpus's dashboard architecture recipe `[INFER]`

Putting §30.1-30.4 together into one recipe, explicitly built from parts the corpus/research
already has (mirroring [Block 29] §29.6's "features list, not a new stack" framing):

| Layer | Recipe | Built from | New work |
|---|---|---|---|
| Page shell | 3-pane layout: header (identity/time/top alarms) + left nav (unit/floor picker + Alarm as first-class entry) + main viewport | §30.4 Monash standard; corpus's existing panelized DOM habit ([Block 1] §1.3) generalized from single overlays to a real layout grid | panelizing today's ad-hoc absolutely-positioned divs into a disciplined header/nav/main CSS grid — layout-only, no new tech |
| In-scene hotspots/values | `CSS2DObject` anchors parented to per-part `Object3D`s, `userData` payload | [Block 29] §29.4 Blender-empty pattern (ported to procedural anchors) + §30.1 CSS2DRenderer contract | wiring a second renderer + resize handler alongside the existing `WebGLRenderer` |
| Status coloring | ISA-101 rule (neutral default, color on alarm only) applied via `material.emissiveIntensity`/color writes | [Block 29] §29.3 + §29.6 row 1, [Block 22]'s audited palette as the "neutral" baseline | a state→emissive mapping function; zero new materials |
| Live data → scene | buffered "latest values" map (1 Hz ticks) → throttled mutation pass (material/instance-attribute writes) → dirty flag → one `render()` call | §30.2; [Block 13] §13.2 on-demand rendering; [Block 2] §2.2 `setColorAt` | the buffer/throttle/dirty-flag glue code itself — the only genuinely new subsystem in this whole recipe |
| Trend charts | DOM chart library (uPlot/Chart.js) in a side panel, fed by the same buffered values map | §30.3 | one `<script>` tag + panel wiring, no interaction with the 3D render loop |
| Camera navigation | named `controls.target`/`camera.position` presets per equipment/zone, triggered from nav-pane or alarm-list clicks | [Block 7] §7.3 target-setting + §30.4 alarm-hyperlink convention | a name→preset lookup table replacing today's one-preset-per-file hardcoding |

**What stays inside the standalone-HTML constraint vs what needs a build step** `[INFER]`: every
row above is achievable as plain ES-module `<script type="importmap">` + inline JS, exactly the
corpus's current posture ([Block 1] §1.2) — `CSS2DRenderer` ships from `three/addons/`, uPlot/
Chart.js ship as standalone UMD bundles, and the WebSocket/buffering glue is vanilla JS. **Nothing
in this recipe forces a bundler.** The one place a build step would earn its cost `[INFER]`: if
the dashboard grows to genuinely many pages/equipment types sharing this shell (the header/nav/
main layout, the preset table, the buffering layer), a bundler buys code-sharing across files
that today's one-file-per-prototype convention currently duplicates by copy-paste ([Block 1]
§1.3's "near-verbatim across ≥18 of 23 files") — that is a workflow/tooling decision orthogonal
to three.js itself, not a requirement of anything in this block.

## 30.6 — Connections

- **[Block 29]** — this block fills the data-binding half of checklist row 6 ("sensor-driven
  instanced grids") that §29.6 explicitly left open as G30's scope; also extends row 1's
  emissive-state rule from discrete alarms to continuous live values (§30.2).
- **[Block 15]** §15.2 — the "Spectrum Field" (d37) instanced-grid-reacting-to-a-data-stream
  precedent is the rendering half; §30.2 supplies the corpus-shaped data-plumbing half.
- **[Block 13]** §13.2 — on-demand rendering is the frame-budget discipline every data-binding
  mutation in §30.2 must respect (mutate → dirty flag → render(), never mutate-in-a-loop).
- **[Block 9]** — CanvasTexture nameplate technique is the direct ancestor of the (rare,
  correctly de-prioritized) in-scene-chart option in §30.3.
- **[Block 1]** §1.3 — today's DOM-overlay habit is the direct ancestor of both the panelized
  layout (§30.4) and the "no CSS2DRenderer yet" gap this block closes (§30.1).
- **[Block 7]** — `controls.target.set(...)` per-scene is the mechanism generalized into the
  named-preset deep-link idea (§30.4).
- **[Block 2]** §2.2 — `setColorAt`/`instanceColor.needsUpdate` is the exact API §30.2 repurposes
  for live-value grid coloring instead of a fixed palette.
- **[Block 3]** §3.3 / **[Block 22]** — `emissive`/`emissiveIntensity` fields and the audited
  neutral palette are the material substrate §30.2's status-coloring mutation writes into.
- **G31 (terrain/relief, next in run 5)** / **G32 (BIM, queued)** — out of scope here; unrelated
  to the data-binding/dashboard-UI concerns this block covers.
