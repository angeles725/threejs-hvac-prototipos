# Block 29 — HVAC/industrial equipment visualization domain (run 5 opener)

> Research of **what the industrial digital-twin / equipment-configurator space does that this
> corpus should learn from**: exploded-view conventions, X-ray/ghost modes, status-color
> conventions for live equipment, hotspot/annotation patterns, and real precedent for 3D
> BMS/HVAC dashboards. Does NOT cover dashboards/telemetry data-binding itself (queued G30) or
> terrain/BIM (G31/G32).
>
> Sources: discourse.threejs.org threads (preserved) · one CAD-viewer vendor blog (preserved,
> thin) · one hotspot-technique blog (preserved) · ISA-101 HMI color-convention summaries (web,
> not the paid standard itself) · atlas3d.space (already sourced in [Block 21] §21.1).
> Method: WebSearch + WebFetch, load-bearing pages preserved via `fetch-doc.sh web` into
> `sources/web-snapshots/`. Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-doc]` official downloaded document (`sources/...pdf §N`) ·
> `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) ·
> `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 5). Connects [Block 12] (workflow this maps onto), [Block 18]
> (post-processing machinery reused), [Block 21] (atlas3d precedent), [Block 15] (instanced
> sensor grids), [Block 22] (emissive/status color material budget). Block TYPE: **domain
> survey + applied synthesis** — expect [CERT-a]-heavy evidence (this is a "what does the
> industry do" gap, not a decompilation gap) and a healthy [INFER] tail in §29.6 per
> METHODOLOGY §11.

---

## 29.1 — Exploded views: what the forum actually knows `[CERT-a]`

Two multi-reply discourse threads (both preserved) converge on the same shape, with no
consensus library:

| Technique | Detail | Thread |
|---|---|---|
| Vector-based offset from an explosion center | Per-part direction computed as `partCenter − explosionCenter`, translated outward along that vector; requires knowing each part's center **before** any merge | [Model Explosion Effect](https://discourse.threejs.org/t/model-explosion-effect/13446) |
| Face-normal offset | Moves vertices along their own face normals — works on already-segmented parts, not raw triangle soup | same thread |
| Axis-aligned explosion | Simplest variant: explode along one world axis, magnitude from bounding-box gaps | same thread |
| Animation | React-Spring (i.e. any tween/interpolation library) lerps between rest-state and exploded-state positions — no physics | same thread |

**Hard caveat repeated across replies** `[CERT-a]`: exploding a single merged mesh into
individual triangles looks wrong; the technique needs **pre-segmented parts** (a `Group`
hierarchy) to explode meaningfully. **This is exactly the corpus's existing shape** `[INFER]`:
the voxel stage already keeps moving/distinct parts as separate `Group`s outside the
`InstancedMesh` ("PARTES ANIMADAS...", [Block 2] §2.3; [Block 12] §12.2), and the realistic
stage is built as a parametric per-part census (Cylinder/Box/Torus/Extrude, [Block 8] §8.1) —
i.e. every prototype is ALREADY segmented at the right granularity for exploded views; nothing
needs re-authoring, only an explosion-center + per-part offset-vector pass and a tween.

The CAD-viewer vendor post (CAD Exchanger, preserved thin) confirms the **industry-standard
control surface** `[CERT-a]`: a single normalized "explosion value" 0.0→1.0 driving all parts
at once (`Exploder().SetValue(0.5)`), not per-part sliders — i.e. one uniform drives every
part's already-known offset vector. The post does not explain the underlying per-part vector
math (radial vs. per-assembly-axis), confirming this is a place where the corpus would need to
invent its own convention rather than copy one — flagged honestly as thin/marketing content,
not a technique source.

## 29.2 — X-ray / ghost mode: the fresnel-vs-opacity split `[CERT-a]`

Three discourse threads (two preserved, one summarized) on "x-ray"/"ghost" effects show a
**recurring failure mode** and a **converging fix**:

| Attempt | Result | Fix |
|---|---|---|
| `MeshStandardMaterial{transparent:true, opacity:0.5, side:DoubleSide}` naively on occluding parts | "half of the outline for rounded surfaces", uneven | abandoned by the OP |
| plain opacity + `depthWrite`/`depthTest` left default | selected/highlighted mesh "pops in and out" relative to occluded geometry (z-fighting-like artifact) | set `depthWrite:false` (sometimes `depthTest:false` too) **and** an explicit ascending `renderOrder` so occluding transparent shells always draw after opaque interior parts |
| edge/outline quality on curved surfaces at low opacity | poor | fresnel-rim shader (bright edge, dim center) recommended as the "proper" x-ray look over flat opacity |

[X-ray Effect for transparent meshes](https://discourse.threejs.org/t/x-ray-effect-for-transparent-meshes/24417),
[Xray function implementation](https://discourse.threejs.org/t/xray-function-implementation/65465)
(both preserved). SSRPass/SSR-based approaches were floated but flagged by responders as
overkill and NOT compatible with **stacked** transparent objects (multiple nested ghost shells)
— a real limitation for equipment with several enclosure layers (cabinet → chassis → component).

**HVAC fit** `[INFER]`: the corpus's PBR palette already includes `transmission`/`opacity`
materials (glass, [Block 3] §3.4) but no depthWrite/renderOrder discipline yet — a ghost-mode
toggle on an enclosure Mesh (opacity ~0.15-0.25, `depthWrite:false`, `renderOrder` set above the
opaque interior) is a **direct, cheap reuse** of material properties the corpus already touches,
not a new subsystem. Fresnel-rim quality is a stretch upgrade, not a blocker.

## 29.3 — Status-color conventions: NOT a naive traffic light `[CERT-a]`

Web sources on ISA-101 (the HMI design standard; summaries only, not the paid standard itself)
converge on a convention that **inverts the naive assumption**:

- **Gray/neutral is the NORMAL state** — process lines, equipment bodies, and labels stay
  muted gray/white when everything is fine.
- **Color is reserved for abnormal/actionable states only**: amber/yellow = advisory/approaching
  a limit, red = alarm requiring operator action.
- Explicit rationale: reserving red exclusively for faults "maximizes its attention-getting
  value" — a screen that is colorful all the time trains operators to ignore color.
- Accessibility clause: ISA-101 explicitly does not rely on color alone (≈8% of men have some
  color-vision deficiency) — shape/icon/text redundancy is expected alongside color.

This directly **corrects a plausible but wrong default** `[INFER]`: a naive HVAC viewer would
paint every component red/amber/green permanently by "health"; the ISA-101 convention says the
DEFAULT should be the corpus's existing neutral/PBR-lit look (already the case — [Block 22]'s
audited palette is all near-neutral galvanized/painted-steel grays), and color/emissive should
switch ON only for the alarm/advisory state itself — which maps cleanly onto the corpus's
existing emissive-accent budget ([Block 3] §3.3 "emissive accents") and the selective-bloom
pass already inventoried for HMI/LED glow ([Block 18] §18.2). No new material system needed —
just a rule for WHEN to apply the emissive/color layer that's already there.

Separately, HVAC-specific engineering-diagram convention (not HMI/SCADA) for **airflow/thermal**
overlays `[CERT-a]`: solid arrows for supply air, dashed arrows for exhaust/return, color-coded
by system/duct function; for temperature/heat-transfer visualizations, red = higher, blue =
lower magnitude (the same red-hot/blue-cold gradient convention used broadly in thermal
imaging). This is a distinct convention from the ISA-101 alarm palette above and should not be
conflated with it — airflow color encodes a continuous physical quantity, alarm color encodes a
discrete operational state.

## 29.4 — Hotspots/annotations: the Blender-empty pattern `[CERT-a]`

One concrete, fully-described workflow (tetranyde blog, preserved):

1. Author hotspot POSITIONS as Blender **Empty** objects (no geometry, so free at render time),
   named so the app can find them (e.g. containing `"hotspot"`), with custom properties
   (tooltip text) attached directly to the Empty.
2. Export to glTF **with custom properties included** — this is the step that must not be
   skipped, since glTF drops arbitrary Blender custom props unless the exporter is told to keep
   them.
3. At runtime, traverse the loaded scene, filter meshes/empties by name, read the tooltip via
   `object.userData.tooltipText` (glTF custom properties land in `userData`).
4. Anchor the HTML label with `CSS2DRenderer` + `CSS2DObject`, parented to the Empty's own
   transform (`empty.add(hotspotLabel)`) — position tracking through camera moves is then free
   (three.js's own 3D→2D projection), no manual `project()`/`unproject()` bookkeeping.

**Why this matters for the corpus** `[INFER]`: today's prototypes are 100% procedural (no
glTF authoring step, [Block 1] §1.4), so there is no Blender-empty stage to hang this on
directly — but the PATTERN (a named anchor object with a `userData` payload, `CSS2DObject`
parented to it) ports untouched onto procedurally-created `Object3D`s: a plain empty
`THREE.Object3D` positioned at a part's connection point, `userData.label` set in code, same
`CSS2DObject` parenting. This is the natural completion of the raycast/`instanceId` picking
already sealed in [Block 2] §2.2 and the DOM-overlay habit already used for UI chrome
([Block 1] §1.3) — hotspots are that same DOM-over-canvas idiom applied to 3D anchor points
instead of screen-fixed panels. `OutlinePass` component highlighting ([Block 18] §18.3) is the
natural pointer/hover companion to a hotspot click.

## 29.5 — Real-world precedent: how far has anyone actually gotten `[CERT-a]`

The single strongest data point in this sweep is a showcase thread, not a tutorial: **Viewer3D**
— a real-time 3D warehouse SCADA system in vanilla three.js r184 (preserved). Concrete,
load-bearing details `[CERT-a]`:

| Concern | Technique | Reported result |
|---|---|---|
| Status representation at scale | **baked vertex colors** on merged static geometry (no per-object material swap for state) | avoids per-object draw-call/material churn for ~30k items |
| Scale | `InstancedMesh` pools, one draw call per pool, **instances stay raycast-pickable** | ~90 fps, ~670 draw calls, ~2.6M triangles |
| Edge/outline rendering | outlines batched into one `LineSegments` per opacity group (not per-object) | further draw-call consolidation |
| Idle cost | render-on-demand: RAF loop skips rendering when nothing moved | GPU drops to ~0 when idle |
| Camera | smooth 2D⇄3D via "element-wise projection-matrix morph" instead of a discrete camera swap | continuous plan-view ↔ 3D transition |
| Editing | AutoCAD-style window/crossing selection + magnet-snap connections | CAD-grade editing UX, not just viewing |
| Stack | three.js r184, vanilla ES modules, no framework/bundler/TS; custom minimal ECS; ASP.NET Core static-file backend | matches this corpus's own "no bundler" posture ([Block 1] §1.2) |

This is the domain's proof that the corpus's OWN architectural choices (vanilla, no framework,
`InstancedMesh`-heavy, no bundler) scale to real industrial-SCADA complexity — it is not a
toy-only pattern. Contrast with the rest of the digital-twin/BMS literature found in this sweep
(ScienceDirect building-DT reviews, Microsoft's Foundry-Local HVAC-copilot blog, patent
filings): those sources are architecture-and-marketing level (BIM+IoT+AI layering, "AI copilot",
patent claims) with **no reusable rendering technique** in them — honestly flagged as
non-technique noise, not because the domain is unreal but because none of those sources publish
implementation detail. [Block 21] §21.1's atlas3d.space remains the closest **product** analog
(AI-labeled part inspection + exploded/X-ray toggle on uploaded GLBs) but is a black box from
outside — this block adds the technique layer atlas3d doesn't expose.

## 29.6 — SYNTHESIS: HVAC equipment-viewer feature checklist `[INFER]`

Ranked by value for client demos, each row mapped onto machinery already inventoried elsewhere
in this corpus — i.e. this is a features list built almost entirely from parts the team already
has, not a new stack:

| Rank | Feature | Built from (already-researched) | New work required |
|---|---|---|---|
| 1 | **Component status colors** (§29.3 ISA-101 rule: neutral by default, color on alarm/advisory only) | emissive accents [Block 3] §3.3 + selective bloom [Block 18] §18.2 + audited palette [Block 22] §22.4 | a state→emissive-intensity rule; no new material |
| 2 | **Exploded view** (§29.1) | existing per-part `Group`/parametric segmentation [Block 2] §2.3, [Block 8] §8.1 | one explosion-center convention + per-part offset vectors + a tween (0→1 slider per §29.1's CAD-viewer precedent) |
| 3 | **Hotspots/callouts** (§29.4) | raycast + `instanceId` picking [Block 2] §2.2, DOM-overlay idiom [Block 1] §1.3, `SlugText` GPU-label alternative [Block 20] §20.2 | anchor `Object3D`s + `CSS2DObject` wiring (no Blender stage needed — procedural anchors) |
| 4 | **Click-to-highlight component** | `OutlinePass` [Block 18] §18.3 (already flagged as "most product-shaped pass") | wire hotspot-click → `selectedObjects` array |
| 5 | **X-ray/ghost enclosure toggle** (§29.2) | existing transmission/opacity materials [Block 3] §3.4 | `depthWrite:false` + `renderOrder` discipline; fresnel rim is a stretch goal |
| 6 | **Sensor-driven instanced grids** (fan arrays, coil banks reacting to a live value) | `InstancedMesh` data-grid precedent (dasprinzip "Spectrum Field" d37, [Block 15] §15.2) + `setColorAt` [Block 2] §2.2 | a data-binding layer (queued G30) — this block only proves the rendering half exists |
| 7 | **Airflow/thermal overlay** (§29.3 second convention: solid/dashed arrows, red-hot/blue-cold gradient) | GPU particle-flow precedent (dasprinzip "the river runs" WebGPU flow field, [Block 15] §15.2) | a physically-driven or pre-baked flow field — most speculative row here, correctly the lowest-confidence item |

**Reading the ranking** `[INFER]`: rows 1-4 need **zero new subsystems** — they are convention
+ wiring on top of B2/B3/B18/B20/B22, which is why they rank highest for near-term client demos.
Rows 5-6 need a small new discipline (render-order rules; a data-binding layer, which is exactly
what G30 — queued next — investigates). Row 7 is the most speculative and lowest-value item in
this sweep: real airflow visualization needs either simulation data or a convincing fake, and
nothing in this sweep supplies a cheap version of that.

## 29.x — Connections

- **[Block 12]** — this checklist is the natural "stage 3" extension of the two-stage pipeline
  §12's synthesis describes; every row reuses stage-2 (realistic) geometry/materials.
- **[Block 18]** — `OutlinePass` (§18.3) and selective bloom (§18.2) are the direct machinery
  behind checklist rows 1 and 4.
- **[Block 21]** — atlas3d.space (§21.1) is the closest product analog; this block supplies the
  technique layer that black-box product doesn't expose.
- **[Block 15]** — the dasprinzip "Spectrum Field" instanced grid (§15.2 d37) and GPU flow-field
  day (§15.2 d26) are the rendering precedent for checklist rows 6 and 7.
- **[Block 2]**, **[Block 3]**, **[Block 22]** — `instanceId` picking, transmission/opacity
  materials, and the audited PBR palette are the raw material every checklist row reuses instead
  of inventing.
- **G30 (dashboards/telemetry, next in run 5)** — checklist row 6's missing half (the
  data-binding layer) is exactly that gap's scope.
