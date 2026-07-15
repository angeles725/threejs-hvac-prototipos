# Apply report — P6 lineage 2, attempt 1 (correction round)

Writer role only: this report describes what was built; the blind judge decides whether it reads.
Scope: the six P6 non-blocking corrections (P1–P6d), three user UX items (7–9), and the user
feature item 10 (14 packaged rooftop units, spec amendment 2026-07-14).

**Suite: 234 pass / 0 fail** (`node --test tests/*.test.mjs`, from the design dir; 211 before this
round, +23 new in `tests/p6-l2-corrections.test.mjs`). `node --check` clean on every touched file.

**RED evidence.** The corrections arrived as an implementation order, so REDness is proven two
ways: (a) the whole new test file was run against the pre-correction sources (`git stash`
round-trip) — it fails to load at HEAD (`does not provide an export named 'PUBLIC_ROOF_PLATE'`,
i.e., every new authority is genuinely new), and (b) each test below names the pre-fix behaviour
it would have rejected. Two existing assertions were **adapted** (declared below), zero deleted.

**Adapted assertions (legitimate contract changes, both P5):**
- `tests/lighting-camera.test.mjs` "correction 4: light_state=off darkens…" and "light_state is a
  deterministic query state…": the loop `resolveEmissiveIntensity(def,'off') === 0` now allows a
  DECLARED off floor, requires it to be the aisle-step-led channel only, and pins ON/OFF ≥ 3:1.
- `tests/shell.test.mjs` preset literal tables for `kitchen` and `technical`: this round now owns
  those framings (corrections 1b and P6d order the reframe); literals updated with a CONTRACT
  CHANGE comment.
- One derived-budget follow-on (see 1b risks): `LIGHTING_ENGINEERING_SHELL.maxStackedLayers`
  12 → 14 (src/scene/lighting.js:947) because the reframed kitchen evidence ray measurably crosses
  14 shell boxes. Per-layer engineering opacity drops 0.064 → 0.055 (strictly less ghosting — the
  direction surface correction S4 asked for). `resolveEngineeringOpacity` also gained a shell-own
  short-circuit (lighting.js:~1000) to kill a 1-ULP float mismatch the registry test caught.

---

## P1 — ticket checkpoint preset

**What changed.**
- `src/controllers/camera.js:72` — `checkpoint: preset([0.6, 3.6, 4.6], [-0.1, 0.75, 12.2], 64)`.
  Derivation: the north approach is geometrically blind (the concession service back wall blocks
  every ray from the lobby side — verified by ray-AABB against the emitted boxes), so the camera
  stands in the corridor mouth looking north, under the 4.5 m roof plane.
- `src/scene/surfaces.js:206` — `'checkpoint'` added to `SURFACE_ROOF_CLIP_CAMERAS` (same
  mechanism as lobby/concessions/kitchen).
- `src/scene/architecture.js:~4110` — `'checkpoint'` added to the overview-label suppression list
  (the "giant floating zone labels" were half the defect).
- `design-spec.yaml` `camera.presets.ticket_checkpoint` synced.

**RED tests:** `P1: the checkpoint preset stands under the roof plane…`, `P1: gates, accessible
lane and band wall are in unobstructed line of sight` (ray-AABB LOS harness on the real emitted
instances, capture-config occluders), `P1: the giant overview zone labels are suppressed…`.
Pre-fix: preset y=7 above the 4.5 m plane; roof not clipped; labels visible.

**Risks.** The west gate is partially interpenetrated by the (gated) kitchen workline proxy — a
pre-existing blockout overlap this round may not touch; the LOS test samples the gate's clear
span. Composition (fov 64 from 7.6 m) puts the east gate's outermost corner at the frame edge.

## 1b — kitchen preset

**What changed.** `src/controllers/camera.js:62` — `kitchen: preset([-17.5, 3.1, 17.8],
[-9.6, 2.3, 12.4], 62)`; spec `camera.presets.kitchen` synced. Same west vantage family the
surface pass gated, but raised/pulled back and aimed at the hood line so worktop + hood + hood→duct
contact + service door share the frame. LOS to hood front / outlet / duct-at-soffit / door
verified; TC300-05 keeps its pinned kitchen label placement (existing surface-endpoints test
still green).

**RED test:** `1b: the kitchen preset keeps hood, hood outlet, duct contact and service door in
sight`. Pre-fix: LOS existed but the old aim (target y 1.7) cropped hood and duct out of frame —
the test also pins the compositional facts (camera y ≥ 3, target y ≥ 2).

**Risks.** The shell-budget follow-on above (maxStackedLayers 14). Whether the hood→duct contact
READS at 62° fov is render-judged: the judge should look at the kitchen-arch capture for the
stainless hood over the workline with its duct rising into the soffit.

## P2 — external chain + diagram board in architecture state

**What changed.**
- `src/scene/architecture.js:3438` — `externalProxyMeshes` (the six `endpoint-*` buckets, exact
  filter) + `src/scene/architecture.js:~4030` — visibility bound to
  `labelPolicy.visualMode === 'engineering'` inside `setEvidenceCamera`, which re-runs on every
  mode change (`setLabelPolicy` path), so URL boot, UI toggles and captures all agree.
- `src/scene/network-schematic.js:810` — the board (`schematic`) at `complete-network` now
  requires engineering mode. `network-schematic-detail` intentionally keeps the board (that preset
  exists for nothing else; its gate captures run engineering anyway).

**RED tests:** `P2: the diagram board is hidden in the architecture state at complete-network`
(pre-fix returned `schematic: true` for architectural mode) and `P2: external endpoint proxies
hide in architecture and return in engineering` — also asserts the BUILDING devices
(tc/uc/gateway buckets) stay visible (`visual_states.architecture` devices: subtle) and that a
mode round-trip restores the hidden state.

**Risks.** None expected on eng captures (they run `state=engineering`, where nothing changed);
the judge should confirm neutral-arch and net-arch now show only the building.

## P3 — roof articulation (2/4/2 read)

**What changed.**
- `src/scene/architecture.js:1174-1183` — the eight family plates remap from `shellCharcoal` to
  the gated `exteriorConcrete` palette entry (the judge's sanctioned "lighten" option; zero new
  palette entries). The existing charcoal per-plate seams now actually contrast.
- `src/scene/architecture.js:~1600-1635` — per-plate charcoal edge FASCIA (kind `roof-fascia`,
  4 edges × 8 plates = 32 boxes, existing `surface-dark` bucket → zero added draws). Fascia tops
  are FLUSH with each plate top: nothing rises, the 60×45 / 7–9 m envelope is untouched.

**RED test:** `P3: family roof plates are light concrete with dark fascia outlining every plate`
— pins plate material identity to `materialRegistry.materials.exteriorConcrete`, luminance ratio
> 2.5× over charcoal, 8 plates, 3 distinct family heights, 32 fascias flush with their plate tops,
and an envelope ceiling guard. Pre-fix: plates were charcoal and `roof-fascia` didn't exist.
**Render-judged:** whether the 2/4/2 stepping now reads from the exterior finals (neutral,
facade, grazing) — the judge should look for eight outlined plates at three heights.

**Risks.** This deliberately changes the exterior roofscape the previous judges saw (the defect
WAS the look). Interior lighting is untouched: every auditorium has its own interior ceiling
plane, so no lights-on/off measurement touches the plate material.

## P4 — display_frame body delta

**What changed.** `src/scene/surfaces.js:735` — new deterministic draw-model
`createMenuDisplayArtwork(frame, style)`; `drawDisplay` (surfaces.js:788) now consumes it. Frame 0
reproduces the gated drawing operation-for-operation; frame 1 changes header colour
(`#d71920`→`#0e7490`), body background, row count (3→4), row rhythm/widths/colours, and adds a
price column frame 0 never had.

**RED tests:** `P4: menu display frames 0 and 1 differ structurally in the body` (row lines and
colours must be disjoint sets — pre-fix both frames shared the identical 3-bar body, so this
fails hard at HEAD) and `P4: frame 0 reproduces the gated concessions drawing exactly`.

**Risks.** Frame-0 pixel identity is preserved by construction (same op order, coords, colours);
the two-state pair at the concessions preset is render-judged — the judge should compare
`display_frame=0` vs `1` and see the whole menu body change, not a header region.

## P5 — lights-off emission floor for sala aisle/step LEDs

**What changed.** `src/scene/lighting.js:824-832` — channels may declare `offIntensityScale`
(default 0); `resolveEmissiveIntensity` honours it (lighting.js:917); only
`'aisle-step-led'` declares 0.72 (ON stays 2.4 → ON:OFF = 3.3:1). ON values of every channel and
the whole lights-on ladder are byte-identical.

**RED tests:** `P5: only the aisle/step LED channel keeps a declared lights-off floor` (pins the
gated ON value, requires OFF > 0 — pre-fix OFF was 0 — and ≥3:1; requires every OTHER channel to
stay fully dark) and `P5: setLightState(off) leaves the built aisle LED strips emitting at the
floor` (asserts the real built strip materials, including zone variants, land on the floor).
**Render-judged:** whether sala3-lightsoff seating silhouettes now read while the pair still
obviously differs.

**Risks.** The PointLight half of `light_state` still goes fully dark (per the correction: only
the emissive floor rises). If the judge finds silhouettes still illegible, the floor value (0.72)
is the single tunable.

## P6d — technical preset through the section cut

**What changed.**
- `src/scene/surfaces.js:214` — `SURFACE_REAR_ROOF_CLIP_CAMERAS = ['technical']`;
  `src/scene/architecture.js:69` — `resolveRearRoofVisibility`; applied to the `rear-roof` bucket
  in `setEvidenceCamera` (architecture.js:4029) — the exact mirror of P1's public-roof clip.
- `src/controllers/camera.js:83` — `technical: preset([0, 30, -23], [-9, 0, -20.3], 55)`; spec
  `camera.presets.technical_room` synced. Geometry forces steepness: the corridor floor is only
  visible over the 4.5 m separating wall above ~70° elevation (measured); the difference from the
  old view is that the rear roof no longer exists in it — the frame is the open-top rooms.

**RED tests:** `P6d: the technical preset clips the rear roof and sees corridor, wall, doors and
UC100-B` (LOS to corridor floor at two points, wall, door head, UC100-B cabinet, both room
floors — pre-fix `SURFACE_REAR_ROOF_CLIP_CAMERAS`/`resolveRearRoofVisibility` did not exist) and
`P6d: the built rear roof panel actually hides at the technical camera and returns elsewhere`.

**Risks.** The framing is still aerial (geometry allows nothing else for the corridor); what
changed is the CONTENT. Render-judged: the judge should see the blue corridor strip, the wall
band with door heads, and the UC100-B cabinet inside the opened left-control room, plus the
UC-B/UC-C labels this camera already pins.

## Item 7 — "two roofs" with Techo off

**What changed.** `src/scene/lighting.js:766` — `resolveInteriorCeilingVisibility(visualMode,
{ roofVisible })`; `src/scene/architecture.js` — asset-level `roofLayerVisible` +
`setRoofLayerVisible()` (exported on the asset); `main.js:90` (boot) and `main.js:172` (Techo
change) drive it. Engineering behaviour is UNCHANGED (never shows interior ceilings — the gated
eng captures keep seeing the containment).

**RED tests:** `item 7: interior ceilings follow the roof toggle…` (pre-fix the options object
was ignored → architectural+roofOff returned true) and `item 7: setRoofLayerVisible(false) hides
the built ceilings and restores them` (also proves engineering stays hidden regardless).

**Risks.** None on gate evidence: arch+roof=off was never a capture; eng captures already run
roof=off where ceilings were already hidden.

## Item 8 — smooth zoom (wheel dolly)

**What changed.** `src/controllers/camera.js` — `SMOOTH_DOLLY` policy, pure
`resolveDollyTarget()` (camera.js:128, OrbitControls' own 0.95/notch scale and min/max clamp) and
`stepDollyDistance()` (camera.js:138, exponential approach, 1 cm snap-to-rest); the controller
disables `orbitControls.enableZoom`, owns a `wheel` listener (preventDefault, orbit-mode only),
glides in `update(deltaSeconds)` BEFORE `orbitControls.update()` (position is the controls'
radius source of truth), cancels on `applyPreset` and on first-person, and removes the listener
on dispose. Root cause verified in three r160: `enableDamping` applies to rotate/pan only —
`handleMouseWheel` applies the dolly scale instantly.

**RED tests:** `item 8: the dolly target derives from the wheel and clamps…`, `…exponential step
converges monotonically and snaps…`, `…controller owns the zoom — wheel accumulates, update
glides, presets cancel` (also: wheel alone never jumps the camera; first-person ignores the
wheel; dispose removes the listener). Pre-fix: `enableZoom` stayed true and no dolly state
existed — the integration test fails at HEAD on its first assertion.

**Risks.** Presets/captures are unaffected (applyPreset writes exact coordinates and cancels the
dolly). Trackpad pixel-mode deltas simply scale continuously (deltaY/100 notches) — smoother, not
different.

## Item 9 — first-use freeze (shader compile) warm-up

**What changed.**
- `src/controllers/warmup.js` (new) — `runShaderWarmup()`: compile pass in the exact boot
  configuration (three r160 `WebGLRenderer.compile` gathers materials with `scene.traverse`, so
  the hidden selection/alarm/offline/highlight pool materials compile too), a second pass with
  the cutaway clipping state FLIPPED (clipping defines are the only interactive program change),
  then a byte-identical restore. Engineering/light-state flips are uniforms and pipeline state —
  no programs, no warm-up needed.
- `main.js:374` — called after the app object exists and BEFORE `data-app-ready` (captures wait
  on that flag; warming later would race them).
- `main.js:~180` — the cutaway toggle's `runtime.bakeShadows()` was REMOVED: `clipShadows` is
  never enabled anywhere, so clipping planes cannot touch the shadow depth pass; that re-bake was
  pure per-toggle cost (verified: `rg clipShadows` — zero hits outside this note).

**Compile-time classes warmed (derived, no browser profiling here):** (1) cutaway clipping
variants of every registered material — the multi-hundred-ms "Sección" hitch, the user's named
case; (2) the interaction overlay/highlight/halo materials — the first-selection hitch; (3) the
zone-variant onBeforeCompile patches — previously compiled on first render anyway, now strictly
earlier. Subsequent toggles were already cache hits, which matches "only the first time".

**RED tests:** `item 9: the warm-up compiles both cutaway variants and restores the exact boot
state` (order, flip/restore call args, both boot polarities, throws without a renderer — pre-fix
the module did not exist) and `item 9: main.js warms up before readiness and stops re-baking
shadows on cutaway` (source-order proof + the cutaway handler contains no `bakeShadows`).

**Risks.** `renderer.compile` is synchronous: boot gets slower by the same milliseconds the first
toggle used to cost (paid behind the loading state, before readiness). If a driver defers actual
compilation to first draw, the warm-up degrades to a no-op, never to a regression.

## Item 10 — 14 packaged rooftop units (spec `packaged_hvac_units`)

**What changed.**
- Plan: `src/scene/architecture.js:131` `RTU_PACKAGE` (spec `dimensions_real` 2.5×1.5×1.2 m +
  0.25 m curb), `:145` `PUBLIC_ROOF_PLATE` (pinned by test to the emitted `front-public-roof`
  box), `:159` `createPackagedUnitPlan()` — fully derived placement: x from the owning TC300
  clamped into zone∩plate, z from the zone centre clamped into the plate (the roofless central
  corridor resolves to the nearest public-plate point), one unit per TC300 zone. Realizes the
  spec's `supply_drop` template (unit-local [0,−0.60,0]→[0,−1.10,0], overlap 0.22 ≥ 0.20).
  Wired at `structural.roofService.packagedUnits` (architecture.js:907).
- Build: architecture.js:~1636-1680 — per unit: curb (seated ON the plate top face), cabinet,
  overhanging dark cap, hooded outdoor-air intake + dark throat, two access-panel seams, supply
  drop through the curb into the plate. Silhouette vocabulary follows the user-approved Trane RTU
  family (cabinet / fan circle on top / intake hood / curb), re-expressed at spec scale.
  Condenser fan = flat 24-segment cylinder + torus guard ring, two 14-instance pools
  (architecture.js:3230). **5 draws total for the whole fleet** (rtu-dark, rtu-cabinet,
  roof:surface-metal, fan pool, guard pool — test-capped at 6).
- Materials: `'rtu-cabinet' → ug67WhitePcAluminum`, `'rtu-dark' → ug67DarkMountingShell`
  (architecture.js:~1290) — the gated painted-metal device pair, ZERO new palette entries and
  zero material-pool growth (measured 67 → 67 against HEAD). Because they SHARE the gateway's
  canonicals, `rtu-` keys are excluded from the cutaway/engineering registration
  (architecture.js:~1390) and from `isEngineeringShellMaterial` (lighting.js:~965) — otherwise
  the opaque gated UG67 body would have been dragged into translucency.
- Layer: everything on `roof` → hides with Techo off (consistent with item 7) and with the
  `roof=off` every engineering capture pins.

**RED tests:** `item 10: one derived packaged unit per TC300 zone, seated inside its own roof
plate` (14 units; the 14 zones exactly once; curb footprint inside its plate; pairwise
non-collision; non-collision with the existing rooftop plant AABBs; supply-drop overlap;
PUBLIC_ROOF_PLATE pinned to the emitted panel) and `item 10: the builder emits every RTU part, in
the roof layer, in contact with its plate` (10 part kinds × 14; curb bases exactly on plate tops;
≤6 draws; fan pool entities). Pre-fix: `packagedUnits` did not exist.
**Render-judged:** whether the units READ as packaged units at the exterior/neutral views —
the judge should look for the fan circle + intake hood silhouette on every roof zone.

**Risks.** The two public-band units above checkpoint/corridor sit 4.3 m apart in the same x-lane
(derived, non-colliding, but visually the densest spot of the roofscape). Units are opaque in the
(interactive-only) engineering+roof=on view since they skip the translucency registration —
invisible in all gated eng captures, which pin roof=off.

---

## The ONE riskiest thing for the blind judge to scrutinize

**P3 + item 10 together re-author the exterior roofscape that three earlier gates accepted.**
Concretely: the neutral/facade/grazing captures now show eight LIGHT concrete plates with dark
fascia outlines AND fourteen rooftop units with fan circles. That is the intended fix for the
"two dark slabs" defect and the user's ordered feature — but it is the largest visual delta of
the round, it changes the silhouette the `multiplex-plan-grammar` and `auditorium-family-massing`
features were scored on, and if the RTU fleet reads as clutter (or the light plates wash out the
family height steps instead of revealing them), those two critical features are where it will
fail. Pre-look exactly: the neutral capture — count eight outlined plates at three heights with
one recognizable unit per zone, and confirm the marquee/facade still dominates the front band.

## Not verified in pixels

This environment cannot render WebGL headlessly. Every claim above is proven by derived unit
tests (including ray-AABB line-of-sight against the emitted geometry in the exact capture
configurations) — never by a screenshot. The orchestrator runs the evidence chain.
