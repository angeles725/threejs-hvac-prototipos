# Block 37 — Composition & art direction for equipment/facility shots

> Research of **the corpus's implicit shot-design language**: what focal-length/FOV choice
> communicates, how photography/3D composition rules (thirds, leading lines, headroom, staging)
> apply to technical equipment visualization, what camera height/angle convention the corpus
> already half-standardized on, how backgrounds/grounding are handled, and what a turntable/
> thumbnail spec would need for CATALOG consistency. Does NOT re-derive the FOV histogram itself
> ([Block 7] §7.1, only extended here) or the lighting rig ([Block 23], only referenced). Does NOT
> cover motion/easing for camera transitions between the presets this block proposes — that is
> [Block 34]'s scope (queued, run 6).
>
> Sources: local prototypes (`camera.position.set(...)` corpus-wide grep, 21 files sampled,
> 2026-07-04) · context7 `/mrdoob/three.js` (docs/pages/PerspectiveCamera, manual/en/cameras.html
> — queried 2026-07-04) · preserved web: propertyrender.com, "Ultimate Guide to Camera Angles in
> 3D Rendering" (`sources/web-snapshots/propertyrender.com_ultimate-guide-to-camera-angles-in-3d-rendering_.md`,
> fetched 2026-07-04) · Tamron, "What is the compression effect?"
> (`sources/web-snapshots/www.tamron.com_global_consumer_sp_impression_detail_article-compression-effect-t.md`,
> fetched 2026-07-04).
> Method: corpus-wide grep of every `camera.position.set` call + trigonometric derivation of
> azimuth/elevation from the cited coordinates → WebSearch for reputable focal-length/3D-composition
> authorities → fetch-doc.sh preservation (two sources preserved cleanly; both load-bearing quotes
> verified by line-grep after preservation) → cross-mapped onto [Block 1], [Block 7], [Block 23],
> [Block 24]. Markers: `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web
> (URL + date) · `[CERT-a]` secondary source (URL) · `[INFER]` deduction. This is a **design/applied
> block** (art-direction craft, not a decompilation gap) — a high `[INFER]`/`[INFER-assembled]`
> content share is expected and declared honestly in the self-verify tally (METHODOLOGY §11).
>
> Layer 7 — Cross-cutting (design craft, run 6). Connects [Block 7], [Block 12], [Block 23],
> [Block 24], [Block 29], [Block 34].

---

## 37.1 — Focal-length language: what the corpus's 32-42° FOV actually says `[CERT-web]` + `[CERT-a]` + `[INFER]`

Three.js's `PerspectiveCamera(fov, ...)` parameter is explicitly the **vertical** field of view,
"from bottom to top... in degrees" (context7 `/mrdoob/three.js`, docs/pages/PerspectiveCamera +
manual/en/cameras.html, 2026-07-04) `[CERT-web]` — this is the value [Block 7] §7.1's histogram
tallies (40°×14, 38°×6, 42°×3, 36°/32°×1 each).

Photography's focal-length language, per Tamron's compression-effect guide (a lens manufacturer's
own educational content) `[CERT-a]`:

| Range | What it does | Citation |
|---|---|---|
| Wide (e.g. 35mm full-frame) | "the distance between the person and the background is clearly felt, and the scenery behind it appears to be far away" — exaggerated depth, more context per frame | `tamron.com...:295-296` |
| Normal/short-tele (50-135mm) | balance between "a natural impression... and a compression effect" | `tamron.com...:590` (85-135mm portrait range) |
| Telephoto (150mm+) | "the elements in the background appear to be pulled closer, and the sense of distance... is compressed" — flattens subject against background, narrows the captured background range | `tamron.com...:295-298,316-318` |

The underlying mechanism: "the ratio of the distance between the subject and the background
becomes smaller" at longer focal lengths even when the physical distance is unchanged
(`tamron.com...:298-300`) `[CERT-a]` — compression is a consequence of shooting-distance-to-subject
scaling with focal length, not a lens-glass property per se.

**Mapping the corpus's FOV onto full-frame-equivalent focal length** `[INFER]` (pinhole geometry
applied to the cited vertical-FOV definition, standard 24mm-tall full-frame sensor,
`f = 12 / tan(FOV/2)`):

| Corpus FOV | Full-frame-equivalent focal length | Language |
|---|---|---|
| 42° | ≈31mm | short-normal |
| 40° (dominant, 14 files) | ≈33mm | short-normal |
| 38° | ≈35mm | normal |
| 36° | ≈37mm | normal |
| 32° | ≈42mm | normal |

**Reading**: the corpus's entire 32-42° range lands in the **31-42mm normal/short-normal band** —
nowhere near wide-angle (typically ≤28mm, propertyrender's own interior-shot recommendation,
§37.3 below) and nowhere near telephoto compression territory (85mm+). This communicates a
"natural, human-eye-like" perspective with no exaggerated depth and no flattening — consistent
with [Block 7] §7.1's characterization of the choice as "fake isometric" (a narrow-enough
PerspectiveCamera to *suppress* wide-angle depth exaggeration, without paying OrthographicCamera's
resize-contract cost, [Block 7] §7.2).

**When a facility plan wants wider** `[CERT]` + `[INFER]`: the corpus does NOT currently vary FOV
by shot scale — `cuarto-frio-plano-realistic (6).html:86` (a full facility floor plan, fog range
420-1100 units, [Block 1] §1.4) uses FOV 42°, and `voxel/campus-hvac-voxel.html:77` /
`voxel/campus-hvac-voxel-v2.html:79` (multi-building campus scenes, fog ranges 320-1100 and
380-1500 units respectively) use FOV 40° — **the same normal-lens band as a single equipment
hero shot** `[CERT]`. Propertyrender's master-plan/aerial convention is explicit that plan-scale
shots want a genuinely wider lens: "35-60mm lenses and vertical angles of 30-45 degrees" for
aerial views, and a dedicated "Master Plans" row at "24mm... 90°" FOV
(`propertyrender.com...:449-457,524`) `[CERT-a]` — i.e. roughly double the corpus's current
vertical FOV for anything at plan/campus scale. This is a genuine, previously undocumented gap:
**FOV should scale up with shot scope** (single unit → normal 32-42°; multi-building/plan →
wide 70-90°) rather than staying fixed corpus-wide `[INFER]`; [Block 7] §7.4's MapControls
option is the natural companion control scheme for that wider, plan-style FOV.

## 37.2 — Composition rules applied to technical viz `[CERT-a]` + `[CERT]` + `[INFER]`

Propertyrender's guide states the general principle explicitly: "Composition rules from
photography apply equally here, including the rule of thirds, negative space, and leading lines
— these are visual communication principles that apply to any image" (search-summarized from the
preserved guide's framing, §37.1 source) `[CERT-a]`. Applied to HVAC equipment/facility shots:

- **Rule of thirds / off-center subject placement**: the equipment's silhouette (or, for a plan,
  the building footprint) should sit on a third-line rather than dead-center, leaving asymmetric
  negative space on one side for a label/UI panel to occupy without overlapping the model —
  directly compatible with the corpus's existing DOM-overlay habit (`#info`/`#legend`/`#panel`
  absolutely positioned over the canvas, [Block 1] §1.3) which already claims screen-edge
  real estate; thirds-based subject placement is the missing convention that would make that
  overlay placement compositionally deliberate rather than incidental `[INFER]`.
- **Leading lines**: HVAC equipment is rich in linear elements built into the parametric geometry
  itself — duct runs, coil fin rows, pipe manifolds ([Block 8] §8.1's Cylinder/Extrude census) —
  which, when the camera azimuth is chosen so those lines recede diagonally toward the subject
  rather than running parallel to the frame edge, do the "leading line" job for free, with zero
  new geometry `[INFER]`; this is a byproduct of the diagonal camera azimuth already in near-universal
  use (§37.3 below), not a new technique to add.
- **Headroom/lookroom**: the vertical margin above a subject and the horizontal margin in the
  direction it "faces" — for a static equipment hero shot (no literal gaze direction) the
  practical translation is margin in the direction of the equipment's leading lines/duct runs,
  so ductwork does not visually exit the frame at a corner `[INFER]`.
- **Isometric-style composition / the corpus's diagonal grammar** `[CERT]`: this is not a
  proposal — it is the corpus's own dominant, unstated convention. A trig pass over 21 sampled
  `camera.position.set(...)` calls (azimuth = angle between camera position and the X-axis in
  the XZ plane; elevation = angle above the horizontal plane) shows:

  | Metric | Range across 19/21 sampled files | Outliers |
  |---|---|---|
  | Azimuth (XZ-plane angle from an axis) | 38.1°-48.4° — tight cluster around 45° | `trane-rtu-realistic-v10.html:64` (80.5° — near-side view) |
  | Elevation (angle above horizontal) | 19.6°-28.2° | `trane-rtu-realistic-v10.html:64` (37.5°, steeper); `cuarto-3d.html:31557` (16.4°, the raycast-authoring outlier already flagged, [Block 1] §1.5) |

  Representative citations: `voxel/liebert-split-voxel.html:63` → `(150,100,135)` → az 42.0°/
  elev 26.4°; `chiller-aircooled-realistic (7).html:65` → `(112,64,104)` → az 42.9°/elev 22.7°;
  `split-system-realistic (2).html:77` → `(160,118,158)` → az 44.6°/elev 27.7°;
  `carcamo-agua-3d (1).html:282` → `(8,4.5,9)` → az 48.4°/elev 20.5° `[CERT]` (raw coordinates) +
  `[INFER]` (derived angles, plain trigonometry over the cited values). **~90% of sampled files
  (19/21) converge on a corner-view azimuth near 45° and a moderate 20-28° elevation** — this
  *is* the corpus's isometric-style composition grammar, applied consistently whether the file
  is voxel or realistic, small equipment or campus-scale, without ever having been named as a
  rule anywhere in the corpus.
- **Staging: hero vs context separation** `[CERT]` + `[INFER]`: the corpus has no depth-of-field
  (zero post-processing anywhere, [Block 1] §1.4 absence sweep; [Block 18]'s bloom/DOF entries
  are all upgrade paths, not present code) — so hero/context separation is carried entirely by
  **fog** and **value/color contrast** instead of optical blur. `THREE.Fog` scaled per-scene
  ([Block 1] §1.4: 22-40 units for a small tank, 420-1100 for a large plan) desaturates/darkens
  distant geometry toward the dark-navy `0x06080d` background+fog match ([Block 24] §24.5) —
  functionally a fog-based depth cue standing in for DOF's subject-sharp/background-soft
  separation. Because the corpus's palette is otherwise near-neutral grays/galvanized ([Block 22]
  §22.4), the *only* other separation lever available is the deliberate emissive/color accents
  ([Block 3] §3.3) — i.e. staging in this corpus is "neutral hero silhouette against fog-darkened
  neutral context, with color reserved for what should pop," which is the same value-contrast
  logic ISA-101's alarm-color convention already establishes for a different reason ([Block 29]
  §29.3) `[INFER]`.

## 37.3 — Camera height & angle: a preset vocabulary `[CERT]` + `[CERT-a]` + `[INFER]`

The corpus already contains one **fully worked example** of a named camera-preset system, not
just a candidate design — `cuarto-frio-plano-realistic (6).html` §"CÁMARA / VISTAS" (its own
in-code section header):

```js
const VIEW_3Q  = { pos: new THREE.Vector3(CX+(BX1-BX0)*0.6, HGT*2.4, BZ1+(BZ1-BZ0)*0.85),
                    tgt: new THREE.Vector3(CX, HGT*0.22, CZ) };
const VIEW_TOP = { pos: new THREE.Vector3(CX, Math.max(BX1-BX0,BZ1-BZ0)*1.5, CZ+0.1),
                    tgt: new THREE.Vector3(CX, 0, CZ) };
function setView(v){ camera.position.copy(v.pos); controls.target.copy(v.tgt); controls.update(); }
setView(VIEW_3Q);
// ...
gl('btn-plan', v => { planView = v; setView(v ? VIEW_TOP : VIEW_3Q); }, false);
```

`[CERT]` (`cuarto-frio-plano-realistic (6).html:383-386,397`). A UI toggle (`#btn-plan`) swaps
between a **three-quarter hero view** (`VIEW_3Q` — a scaled offset from the building's bounding
box, matching §37.2's ~45°-azimuth/moderate-elevation convention) and a **near-top-down plan view**
(`VIEW_TOP` — camera almost directly overhead, `tgt` at ground level) — this is exactly the
"preset vocabulary" this section would otherwise have to propose from scratch, already built and
shipped in one file out of 25. It is the corpus's own precedent for generalizing.

A three-tier vocabulary, built from that precedent + propertyrender's ground-level convention +
§37.1-37.2's findings `[INFER-assembled]`:

| Preset | Camera angle | Corpus precedent / external anchor | FOV | Purpose |
|---|---|---|---|---|
| **Hero** (equipment default) | azimuth ~40-45°, elevation ~20-28° | §37.2's 19/21-file convergence; `VIEW_3Q` above | 32-42° (current corpus default) | "corner view" showing depth+dimension on one silhouette — the corpus's de facto standard shot |
| **Plan/top-down** | elevation ~80-90° (near-overhead), target at ground level | `VIEW_TOP` (`cuarto-frio-plano-realistic (6).html:384`) — currently the ONLY file with this preset wired up | wider (70-90°, §37.1) | facility/floor-plan legibility; the natural pairing for MapControls ([Block 7] §7.4) |
| **Walkthrough/eye-level** | elevation ~0-10°, camera height matching human eye-line | propertyrender's interior convention: "cameras should be positioned at 4'6"-5'0"... reflect a human perspective" (`propertyrender.com...:468-469`) `[CERT-a]` | 24-28mm-equivalent (wider than the corpus's current hero band) | walkthrough/immersive feel for corridor/plant-room scenes, not yet present anywhere in the corpus |

**Reading**: rows 1-2 are a **generalization of an existing, working pattern** (low new-work cost
— copy `cuarto-frio-plano-realistic`'s `VIEW_3Q`/`VIEW_TOP`/`setView` shape into the shared
template, [Block 12] §12.4's "swap the content layer, keep the pipeline layer" logic applies
directly); row 3 is a genuinely new preset with no corpus precedent, best understood as the
static-camera anchor that [Block 34]'s queued camera-transition/tour work (motion between
presets) and [Block 30] §30.4's named `controls.target`/`camera.position` deep-link idea would
animate between, rather than a static shot in its own right `[INFER]`.

## 37.4 — Backgrounds & grounding `[CERT]` + `[CERT-web]` + `[INFER]`

Already-established corpus conventions, consolidated here rather than re-derived:

- **Flat background + matched fog**: 22/24 files set `scene.background` to the identical dark navy
  `0x06080d`, paired with `scene.fog` at the same color in 22 files ([Block 24] §24.5, [Block 1]
  §1.4) `[CERT]` — the corpus's existing, working horizon-discipline: a mismatched fog/background
  color would create a visible seam where geometry fades into fog but the backdrop doesn't match
  ([Block 24] §24.5's own stated rationale).
- **Gradient/vignette upgrade path** `[CERT-web]`: [Block 24] §24.5's 1×32px `CanvasTexture`
  gradient-sphere technique (`webgl_volume_cloud.html`) is the zero-to-low-cost upgrade beyond
  flat color — a soft vignette/horizon gradient instead of a hard flat void, reusing the corpus's
  existing draw-don't-download `CanvasTexture` habit ([Block 9] §9.1) rather than a new asset.
- **Ground-plane / shadow-catcher**: the corpus has no dedicated ground-plane shadow-catcher mesh
  today ([Block 24] §24.0's baseline sweep found zero `ShadowMaterial` usage in app code) —
  [Block 24] §24.3's `ShadowMaterial` plane (fully transparent except where shadow-mapped,
  `material.opacity = 0.2`) is the documented, near-zero-cost grounding technique that would give
  equipment a visible contact point without a visible ground mesh `[INFER]` (applying §24.3's
  cited contract to this block's staging concern).
- **Horizon discipline given the §37.3 hero elevation**: because the dominant hero preset sits at
  a 20-28° elevation (§37.2/§37.3), the horizon line (where fog fully occludes geometry) sits in
  the **lower third of the frame**, not centered — this is compositionally consistent with
  thirds-based subject placement (§37.2) by construction, since a shallow camera elevation
  naturally pushes the vanishing horizon low and leaves the upper two-thirds for the
  equipment silhouette + headroom `[INFER]`; the plan/top-down preset (§37.3) has no horizon at
  all (camera looks straight down through fog-free near range), so this discipline is
  hero-shot-specific, not universal.

## 37.5 — Turntable & thumbnail standards: a CATALOG product-photo spec `[INFER]`

Marked `[INFER]` throughout, by design (per METHODOLOGY §11: assembling already-established
corpus conventions into one canonical spec, not new external sourcing) — the value here is
declaring a **fixed parameter set** so every equipment CATALOG entry ([Block 33]'s template-system
proposal) renders a comparable thumbnail/turntable frame, the way a real product-photography studio
locks its rig once and reuses it per SKU:

| Parameter | Value | Source |
|---|---|---|
| Camera preset | Hero (§37.3): azimuth 40-45°, elevation 20-28° | §37.2's 19/21-file corpus convergence — codify the *measured* default, don't invent a new one |
| FOV | 40° (the corpus's modal value, [Block 7] §7.1: 14/24 files) | [Block 7] §7.1 |
| Light rig | house 3-light rig unchanged: key 1.5 / fill `0x88aaff` 0.4 / rim `0x00d4aa` 0.2 / ambient 0.22-0.25 | [Block 4] §4.2, [Block 23] §23.5 |
| Environment | `RoomEnvironment` + `PMREMGenerator(0.04)` `scene.environment` | [Block 4] §4.1 |
| Background/fog | flat `0x06080d` + matched fog, scaled to the *unit's own* bounding box (not the corpus's largest-scene fog range) | [Block 1] §1.4, [Block 24] §24.5 |
| Exposure/tone mapping | ACESFilmic, exposure 1.05-1.1 | [Block 1] §1.3 |
| Turntable motion | `autoRotate` at the corpus's default speed (one orbit/30s @60fps, undamped by `deltaTime`, [Block 7] §7.3), OR a fixed set of N discrete azimuth stops (0°, 90°, 180°, 270° around the existing 45°-diagonal hero azimuth) if a static multi-angle thumbnail set is wanted instead of a live spin | [Block 7] §7.3 (autoRotate contract) `[INFER]` (discrete-stop variant, not corpus-attested) |
| Capture resolution/format | out of this block's scope — [Block 38] (queued, run 6: "high-quality deliverables + visual QA, 4K offscreen captures") owns this |

**Why this is the right spec to fix** `[INFER]`: every input row already exists as a corpus-wide
convention (light rig, environment, tone mapping, FOV mode, hero azimuth/elevation band) — the
only genuinely new decision is picking ONE value out of each already-observed range (e.g. 40° not
32-42°, 20-28° not "somewhere in that band") and applying it uniformly for CATALOG renders
specifically, while individual prototype files remain free to keep their own per-scene tuning.
This mirrors real studio practice: a fixed rig for catalog consistency, with bespoke lighting/
angles reserved for hero marketing shots outside the catalog — the corpus does not need a new
subsystem to get this, only a documented default.

## 37.x — Connections

- **[Block 7]** §7.1, §7.3, §7.4 — the FOV histogram this block's §37.1 converts into
  photographic focal-length language; `autoRotate`/OrbitControls contract underlying §37.5's
  turntable row; MapControls as the plan-preset's natural control scheme (§37.1, §37.3).
- **[Block 12]** §12.4 — "swap the content layer, keep the pipeline layer" is why generalizing
  `cuarto-frio-plano-realistic`'s `VIEW_3Q`/`VIEW_TOP` pattern (§37.3) is cheap: camera presets are
  exactly the kind of content-layer parameter the shared template already isolates.
- **[Block 23]** §23.5, §23.6 — the house 3-light rig this block's §37.5 spec fixes unchanged, and
  whose key/fill/rim role model already implies the value-contrast staging logic in §37.2.
- **[Block 24]** §24.3, §24.5 — `ShadowMaterial` grounding and gradient-background techniques
  this block's §37.4 applies to the staging/horizon concern.
- **[Block 29]** §29.3, §29.6 — the ISA-101 neutral-by-default/color-on-alarm convention this
  block's §37.2 staging analysis parallels (value contrast reserved for what should pop); §29.6's
  checklist framing (features built from parts the corpus already has) is the same move §37.5
  makes for the catalog photo spec.
- **[Block 34]** (queued, run 6, motion design 3D) — owns the animation/easing BETWEEN this
  block's static presets (§37.3's Hero/Plan/Walkthrough vocabulary) and any cinematic tour
  built from them; this block only defines the endpoints, not the transitions.
- **New-gap candidates surfaced, not chased here**: (1) a shared `presets.js`-style module
  generalizing `cuarto-frio-plano-realistic`'s `VIEW_3Q`/`VIEW_TOP`/`setView` across all 25 files —
  a [Block 33] template-system candidate, not a new research gap; (2) FOV-scales-with-shot-scope
  (§37.1) is a corrective finding for the fixes/optimization pipeline ([Block 12] §12.5), not a
  new investigable gap — it is already fully evidenced here.
