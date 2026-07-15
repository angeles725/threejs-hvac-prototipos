# Apply report — P6 lineage 4, attempt 1 (final polish round + headline feature)

Writer role only; re-gates as `p6-final-l4` on fresh captures (new `--gpu` flag: nothing in this
round depends on renderer-specific behavior — standard sprites, canvas textures, uniform/material
changes only). Scope: L3 judge corrections M1–M5, and the green-lit user feature items 15–17
(temperature chips, exterior-only rule, `top` thermal roof plan; scoped P3 on the amendment: PASS).

**Suite: 250 pass / 0 fail** (240 after L3, +10 new in `tests/p6-l4-corrections.test.mjs`).
`node --check` clean on every touched file. Boot invariants held: billboards 46, materialCount
unchanged, mesh buckets 121→123 (M1 regrouping nets +2 draws); the chip field adds 14 badge
sprites (+ halo sprites only while a zone is in alarm) that draw only on exterior cameras —
comfortably inside the 550-draw budget the L3 gate measured at 209.

**RED evidence.** The L4 test file fails to load against the L3 sources (`resolveSpineAssemblyVisibility`,
`LIGHTING_ROOF_OPEN_FILL_LIFT` and the whole `temperature-chips` module are new exports), and each
test names the pre-fix behavior it rejects. One adapted assertion (declared):
`tests/shell.test.mjs` preset-count literal 10→11 (item 17 adds `top` — CONTRACT CHANGE comment).

---

## M1 — galvanized read for the duct network

Root cause found, not painted over: `resolveLightingZone` classifies by x/z bands and ignores Y,
so the rooftop plant standing in full sun over the corridor band took the CORRIDOR dim — that is
why the "galvanized" mains rendered near-black. `addBox` gained a `zoneOverride` last parameter
(src/scene/architecture.js:~1350) used ONLY by the spine plant and branches, which now carry the
explicit `exterior` zone and the pooled canonical `galvanizedDuct` / `kitchenStainless` — the
palette's own light metals, no new entries. The branches moved to a dedicated `'duct-galv'` bucket
key (same canonical material) which is also what makes M3 possible.
**Test:** `M1: the spine plant and branches are exterior-lit galvanized metal` (zone, material
identity, metalness ≥ 0.9, 3× luminance over charcoal, no stray branch left in shared steel).
**Render-judged:** roofservice/technical captures should now show light metallic ducts.

## M2 — checkpoint dressing

`src/scene/architecture.js` checkpoint block: a dark counter cap on each podium (crossing the
podium-top plane — the item-11 discipline), a POS/scanner body with a `surface-pos-screen` face
(the gated emissive POS channel, so it dies with `light_state=off` like every POS screen), and a
`human-checkpoint-staff` proxy (plan `humanReferences`) standing inside the accessible lane at
[0.55, 0, 12.55] — behind the gate line, so the gated checkpoint LOS samples stay clear (the L2/L3
LOS tests re-ran green with the new occluders).
**Test:** `M2: counter caps, POS block and a staff proxy dress the checkpoint`.

## M3 — the spine assembly follows the Techo toggle

`resolveSpineAssemblyVisibility(visualMode, {roofVisible})` (architecture.js:~75): architecture
follows the roof toggle (the plates leave, the plant leaves with them), engineering keeps the
mains always (the spec's `custom:engineering_visibility`). Enforced mesh-level over
`spineAssemblyMeshes` — derivable because M1 gave the assembly dedicated buckets whose every
entity kind starts with `roof-service` (no per-instance surgery, no hand-list).
**Test:** `M3: roof-off architecture hides the spine assembly; engineering keeps it` (rule matrix
+ built-asset round-trip).

## M4 — roof-off fill lift

`LIGHTING_ROOF_OPEN_FILL_LIFT = 1.5` and `resolveZoneFillGain` gained a `roofVisible` input
(src/scene/lighting.js): the lift applies ONLY in the architectural roof-off state; roof-on
architecture, both light states and engineering (which owns its own gated lift) are numerically
byte-identical — the default argument keeps every existing gated call resolving as roof-on.
Plumbed through `houseState.roofVisible` in `setRoofLayerVisible`.
**Test:** `M4: the fill lift exists ONLY in the roof-off architecture state`.
**Render-judged:** seating tiers legible in neutral-arch-rooffoff.

## M5 — westmost public units

Derived rule in `createPackagedUnitPlan`: on any lane shared by 2+ units, the two OUTERMOST units
snap to their own outer clamp limits (zone ∩ plate, ± clearance). Effect: the admin unit moves to
x = −27.65 (its zone's own western limit), opening the westmost pair from 7.0 m to 10.65 m; the
eastmost was already at its limit; single-unit sala lanes untouched; ownership stays 14/14 zones;
anti-coplanar scanner and collision tests re-ran green over the moved unit and its drain.
**Test:** `M5: multi-unit lanes push their end units to the outer clamp limits`.

## Item 15 — temperature chips (Safran pattern)

New `src/scene/temperature-chips.js`, adapted INLINE from the design3d library row
`markers-ui/sims-floating-banner.mjs` (cuarto-frio-safran, client-validated look; cited in the
module header) because this page is a single-importmap app: THREE injected, stub-safe flat-fill
canvas (the node harness drives the real draw path), `toneMapped:false` on both sprite materials,
renderOrder pair 998/999, depthWrite:false.
- 14 chips, one per packaged unit: rounded badge + inverted pointer aimed at the owning unit,
  brand line = the zone's own es-MX label, main line = the LIVE reading (`formatChipTemperature` =
  one decimal + ` °C`, exactly the HUD's own format).
- ONE source of truth: `applyChipReadings` reads the interaction model's `telemetry`/`deviceStatus`
  — the same derivation the alarm list reads — inside the existing `applyInteraction` pass, so
  `hot-sala-3` / `hot-kitchen` recolor their chip (red palette + additive pulsing halo) with zero
  extra wiring; normal chips are clean, halos hidden.
- Determinism + perf: bob/sway (`resolveChipPose`) and the alarm-halo pulse (the interaction
  system's own `resolveHaloPulse`) derive from the TICK clock (t0/t30 exact); canvases repaint
  only on a reading change, sampled on a deterministic 10-tick cadence
  (`TEMPERATURE_CHIP.readingIntervalTicks`) — the live telemetry legitimately wobbles 0.1 °C per
  tick, and per-tick canvas uploads are the library row's documented perf trap. State changes
  repaint immediately.
**Tests:** `item 15: fourteen chips read the one simulation…` and `…redraws on the sample cadence
and on state changes, never per tick` (bounded redraw counting on the real built asset).

## Item 16 — exterior-only visibility

Pure `isCameraOutside(envelope, position)` + `createChipEnvelope` (footprint from
`APP_CONFIG.building` ±2 m margin; overhead exception above the tallest plate + 1 m = 10.02). The
chip group follows it from BOTH feeds: `setEvidenceCamera` (preset positions, isometric included)
and a per-frame `setChipCameraPosition(runtime.camera.position)` in the animate loop, so free
orbit crossing the envelope behaves like the presets.
**Tests:** preset classification matrix — hidden: lobby, concessions, kitchen, checkpoint,
corridor, **ug67** (inside, correct per contract) and the validator's boundary case
**reference-match [-7.5,4.2,-8.9]**; visible: facade, neutral, grazing, complete-network,
engineering-section, network, auditorium (a crane position outside the wall), `top`, and
**technical** (y=30 clears the overhead rule — exterior by contract). Plus the asset-level
group-visibility round-trip and the live-position path.

## Item 17 — `top` thermal roof plan

`CAMERA_PRESETS.top = {position:[0,95,6], target:[0,0,-2], fov:55}` (src/controllers/camera.js),
mirrored in `design-spec.yaml camera.presets.top`; `'top'` added to the query-state camera enum
(the atomic-reset trap — `camera=top&state=engineering` parses without resetting); the giant
overview zone banners are suppressed at `top` via the existing per-preset mechanism (they would
bury the thermal plan); a `Planta térmica` button joins the UI camera bar (es-MX). At fov 55 from
y 95 the frame holds ~99×107 m — the whole 60×45 roofscape with margin.
**Test:** `item 17: top preset exists, is driveable, suppresses the zone banners, matches the
spec` (also asserts the chip field is visible there: the thermal plan IS the chips).

---

## The ONE riskiest thing for the blind judge to scrutinize

**M1's zone override re-lights the entire spine duct network in every gated architecture view.**
The plant appears (light galvanized, sun-lit, shadow-casting) in neutral, technical, roofservice
and engineering captures that three passes scored with it near-black — it is the intended
correction, but it is a material-level change to pixels many earlier notes described. If the
galvanized read comes out HOT (specular metal under the 1.5 sun + env map can bloom toward white),
it lands on `materialSurface`/`technical-containment`. Pre-look exactly: roofservice-arch and
technical-arch — mains, plenums and all 8 branches should read as light warm-gray metal with
visible strap/elbow accents, distinctly NOT white-clipped and NOT charcoal.

## Not verified in pixels

No WebGL here. Chip look (badge legibility at the neutral/facade/top distances, halo pulse
against the sky, the 3.4 m badge scale) is render-judged; the deterministic halves — data source,
redraw discipline, exterior rule, preset math, zone/material identities — are all unit-proven on
the emitted scene graph. The orchestrator runs the capture chain (first `--gpu` round).
