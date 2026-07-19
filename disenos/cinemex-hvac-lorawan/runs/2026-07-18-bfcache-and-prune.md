# 2026-07-18 — Instant back from Cartelera (bfcache) + interior prune

Single-writer FAST-MODE run on `disenos/cinemex-hvac-lorawan/` only. Two tasks: (1) make
browser Back from `dashboard.html` restore the 3D instantly via the back/forward cache;
(2) maintainer-ordered removal of interior geometry/lighting that can never be seen in the
shipped product (fixed exterior `network` view + free hand-orbit + embed roof-top framing).
Backup: `cinemex-hvac-lorawan-BACKUP-2026-07-18`. No commit.

## Task 1 — bfcache restore

### Diagnosis (headless Chrome 150 CDP, index → dashboard via the real header link → history back)

- **The page was already bfcache-ELIGIBLE.** `Page.backForwardCacheNotUsed` fired zero times;
  the restored document's `pageshow` event carried `persisted: true`; the back navigation took
  ~120 ms. No `unload`/`beforeunload` listeners exist anywhere in the product source, and
  `protection.js` (the publish-only friction layer) is clean too — `rg` over `main.js`,
  `src/**`, `portal/`, `publish/` finds no unload-family listeners, no WebSocket/EventSource/
  BroadcastChannel, no pending-fetch holders.
- **The real blocker was self-inflicted teardown.** `main.js` registered
  `window.addEventListener('pagehide', dispose, { once: true })` — and `pagehide` fires with
  `persisted: true` when the document is going INTO the bfcache, not only on real unloads. The
  browser restored the document instantly, but `dispose()` had already cancelled the rAF loop,
  disposed the renderer/asset, removed the canvas from the DOM and deleted the QA handle.
  Baseline probe on restore: `hasApp: false`, `canvas: false`, `isRendering: null` — a frozen
  dead shell behind a "Sistema listo" status line.

### Fix (`main.js`)

The single `pagehide` teardown became a persisted-aware lifecycle pair:

- `pagehide`: always pause the rAF loop (`setRenderLoop(false)`); run `dispose()` ONLY when
  `event.persisted === false` (a genuine unload).
- `pageshow` with `event.persisted === true`: `runtime.resize()` (the viewport may have changed
  while away), `workbench.resyncClock()` (a new workbench method — re-renders the active
  section's clock-driven readings at the preserved tick and refreshes the alerts badge, without
  resetting section view state), `renderInteractionPanels()`, then resume the loop only where it
  was running (Tablero or embed; a covered full page stays paused exactly as before leaving).

### Proof (CDP, after fix)

- Back navigation: **154 ms**, `pageshow persisted: true`, zero `backForwardCacheNotUsed`.
- Restored document: `hasApp: true`, canvas present, `isRendering: true`, the deterministic
  tick advancing (3 → 4 over the probe window; SwiftShader frame rate), zero console errors.
- The 3D is live and interactive immediately on restore — well under the 500 ms gate (the
  154 ms includes the whole back navigation; the scene needs no rebuild at all).
- `runs/assets/bfcache-before-leave.png` vs `runs/assets/bfcache-after-back.png`: identical
  live workbench (telemetry values differ by the elapsed ticks, as they must).
- Dashboard embed flow re-verified: `dashboard.html?unit=RTU-03` boots its
  `index.html?selection=TC300-03&embed=1` iframe, `body.embed` set, canvas rendering
  (`runs/assets/bfcache-embed-unit-RTU-03.png`). Zero console errors.

## Task 2 — interior prune

### Method (measured visibility, not guessed)

The reachable view envelope of the shipped product is the fixed `network` preset plus free
hand-orbit around its target `[9,0,0]` (OrbitControls: distance 8–150, polar ≤ 0.49π) plus the
embed rooftop framing. A headless probe harness (`prune-vis-worker.mjs` / `prune-controls.mjs`,
scratchpad) drove the LIVE scene through the QA hooks: for each candidate group it zero-scaled
the group's instances in their InstancedMesh buckets (and/or toggled its PointLights), re-baked
the static sun shadow, captured **17 views** — the fixed view, 8 orbit azimuths at the preset
distance (elev 27°), 4 top-downs (elev 60°), front/rear grazing (elev 3°), a close front stand
at distance 26 looking through the entrance glazing, and the embed unit framing — and
byte/pixel-diffed every capture against an untouched baseline (tick frozen via `?tick=120`;
double-capture determinism verified byte-identical at a 4-frame settle; restore verified
byte-identical). A group is prunable only when every view shows zero structured difference.
Control runs separated shadow-bake effects from geometry (bake-only control: byte-identical)
and split mixed groups (linings vs panel rhythm; frame posts vs room fit-out).

### The finding that redrew the naive cut list

The building's roof plates sit at three heights, and the vertical HEIGHT-STEP bands between
plates are open: what reads as the dark band between roofs **is the auditoriums' full-height
acoustic LININGS seen from outside**. Hiding them opens sight lines straight into the rooms
(screens, seat tiers, exit signs become visible through the steps — captured in
`vis2/ctrlC1-linings-fixed.png`). The same applies to the corridor-slot read: the family-frame
POSTS (0.28 m) cross the 0.25 m corridor-wall plane and their slivers are shipped pixels; the
corridor SOFFIT's top face is the floor of the slot; the kitchen extract stack occludes the
menu boards seen through the entrance glazing. All of those STAY.

### Prune inventory

| Item | Instances / lights removed | Visibility proof | Verdict |
|---|---|---|---|
| Auditorium blockout proxies: seat tier masses (64), screen slabs (8), aisle gaps (8), wheelchair outlines (24) | 104 instances, kills `seating-burgundy`, `screen-emissive`, `wheelchair-blue` buckets + the aud `aisle-dark` share | hide+diff ≤5 px (shadow-texel specks) on stable views; sealed by roof/walls + linings | **CUT** |
| Auditorium shell fit-out: side/cross aisles (24), aisle step LEDs (32), screen-wall jambs/heads (24), projection niches (32) | 112 instances, kills `aisle-step-led` bucket | shell-rest control ≤11 px; sealed | **CUT** |
| In-room exit signs (16) | kills the aud `surface-exit-green` bucket | 0 px on stable views (visible ONLY when linings are also hidden) | **CUT** |
| In-room acoustic panel RHYTHM (80: surface-dark 48 + surface-seal 32) | 80 instances | rhythm-only control ≤15 px | **CUT** |
| Aud carpet finish plates (8) + in-room carpet breakup (48) + aisle-edge markings (16) | 72 instances, kills aud `auditorium-carpet`/`surface-carpet` buckets | ≤3 px; sealed | **CUT** |
| Corridor carpet plate (1) + corridor chevrons (24) + evacuation floor arrows (15) | 40 instances, kills corridor `surface-carpet` + `surface-exit-green` buckets | 1 stray px at one view | **CUT** |
| Auditorium acoustic LININGS (24) | — | up to 10% of frame changes: THE dark surface in every roof height-step band | **KEEP** |
| Family-frame posts (64, `visible-family-frame`) | — | embed view 0.83% + slivers in most views (posts cross the corridor-wall plane) | **KEEP** |
| Auditorium interior ceilings (8) | — | 38–97 px structured diffs through the step bands | **KEEP** |
| Corridor soffit + warm strips (3) | — | visible in 15/17 views (soffit top = the slot floor) | **KEEP** |
| Public-band soffit + lobby luminaire panels (6) | — | 3–26 px structured in top-downs | **KEEP** |
| FOH props (lobby/ticketing/concession/kitchen/checkpoint, menus, POS, snack machines, coolers, humans' furniture, floor joints — 86 inst + 2 atlas display meshes) | — | close-front 26k px: the concession line is the view through the glazing | **KEEP** |
| Kitchen extract hood/duct/outlet (3) + containment sleeves (3) | — | 347 px at close-front: the stack occludes the menu boards through the doors | **KEEP** |
| Corridor portal assemblies + signs + seals + room-number digits (117) | — | 22 px at close-front (portal sliver through the center door), 3 px lo-90 | **KEEP** |

| Interior human references: lobby, corridor, kitchen, technical, checkpoint staff (20 boxes) | 20 instances | zero diffs in all 17 views (the poster bank + checkpoint band occlude even the glazing sightline) | **CUT** |
| Forecourt human (4 boxes) | — | 8–127 px across 7 views (stands on the shipped plaza) | **KEEP** |
| Technical service doors + rear separating wall segments (29) | — | 6–52 px structured across top-downs (rear height-step band opens onto the rear band) | **KEEP** |
| Surface atlas meshes (labels/posters/displays incl. in-room screen-content quads) | — | labels mesh visible in 3 views (exterior exit/service signs); merged single-draw meshes, negligible cost | **KEEP** (documented) |

### Lighting changes (runtime instantiation only — `LIGHTING_*` data untouched)

PointLights ignore occluders, so prunability was measured per light, not assumed from geometry:

| Fixture family | Lights | Measured | Verdict |
|---|---|---|---|
| lobby (5) | distance 17 | visible in ALL 17 views (pools through the glazing, slot walls, roofline) | **KEEP** |
| corridor (4) | distance 12 | visible in ALL 17 views (warm pools on the corridor-slot walls) | **KEEP** |
| forecourt (6) | exterior | not probed for removal (exterior by definition) | **KEEP** |
| auditoriumAisle 1 (sala 1) | distance 3.4 | 4 px ≥3 at lo-45 through the front height-step band | **KEEP** |
| auditoriumAisle 2–8 | distance 3.4 | per-light AND joint hide: **byte-identical** (0 px ≥1) on every sensitive view | **CUT (7 lights)** |

Live PointLights: 21 → 14 (interior 15 → 8). `NUM_POINT_LIGHTS` in every lit shader drops
accordingly; the cut is a guarded skip in `createSceneRuntime`
(`PRUNED_FIXTURE_POSITIONS`), the lighting authority tables and every pure-ladder contract are
untouched.

### Boot timings (3 runs, median; headless Chrome 150 + SwiftShader, cold cache, fresh browser per run)

| Point | ready (ms) | first frame after ready (ms) |
|---|---|---|
| BEFORE (backup `cinemex-hvac-lorawan-BACKUP-2026-07-18`) | 15203 · 16685 · 18810 → **16685** | **16712** |
| AFTER (pruned tree) | 14170 · 15918 · 15229 → **15229** | **15323** |

Net ~1456 ms (~8.7%) median improvement; every AFTER run beat all but the fastest BEFORE run.
Zero console errors in every run on both sides. (SwiftShader medians are comparable to each
other, not to real GPUs; the shader-compile share shrinks further on hardware where the 7 fewer
point lights cut every lit program's cost.)

### Geometry accounting

~352 instances removed (104 seating proxies + 112 shell fit-out + 16 exit signs + 80 acoustic
rhythm panels + 72 aud carpet/markings shared rows above + 40 corridor floor + 20 interior
humans, net of the rows kept), retiring whole instanced buckets (one draw call + one shader
program each where the bucket was the material's only user): `seating-burgundy`,
`screen-emissive`, `wheelchair-blue`, `aisle-step-led`, aud `aisle-dark`, aud
`surface-exit-green`, aud+corridor `auditorium-carpet`/`surface-carpet` zone buckets, aud
`floor-charcoal` (niche recess), corridor `surface-exit-green` (evacuation arrows), plus the
interior-human buckets.

### Test census (FAST MODE conscious edits, every changed assert logged)

Suite: **292 pass / 0 fail** before and after (all edits in place, no tests added/removed).

| File / test | Old assert | New assert |
|---|---|---|
| lighting-camera `correction 3` | built `aisle-step-led` instances `=== 32`, `screen-emissive` `=== 8`, zone check | both `=== 0` (pruned; pure channel/ fixture contracts of the same test untouched) |
| lighting-camera `correction 4` | 5 emission channels each `instancesOf(...).length > 0` | channel-definition loop unchanged for all 5; built-emission split: `> 0` for lobby/corridor/marquee, `=== 0` for screen/aisle-LED |
| lighting-camera `attempt 3 real box` | every PERCEIVED sample emitted `> 0` | new documented `PRUNED_BUILD_SURFACES` set (`seating-burgundy:auditorium`, `aisle-dark:auditorium`, `auditorium-carpet:auditorium`, `auditorium-carpet:corridor`) pinned to `=== 0`; all others `> 0` unchanged |
| lighting-camera `L2 real box` | every `LIGHTING_EVIDENCE_SURFACES` sample emitted `> 0` | same exemption set, pinned `=== 0` |
| lighting-camera `attempt 3 correction 3` | 16 in-room exit signs built + NDC-framed in sala fixtures | `=== 0` pinned; framing evidence retired; pure emission triad kept |
| lighting-camera `L2 CORRECTION 3` | 16 signs with readable-face sizes + framing | renamed to a stay-out guard, `=== 0` pinned |
| p6-l2 `P5 built strips` | `aisle-step-led` meshes `> 0` + built emissive read | `=== 0` pinned; gated channel VALUE still asserted from the pure authority; `setLightState` guard kept |
| p6-l4 `M2` | checkpoint staff torso built `=== 1` | plan-level staff asserts kept; torso `=== 0` pinned (interior humans pruned) |

### Eye-check (the critical gate)

`final-eyecheck.mjs` (scratchpad) captured **21 views** — the fixed `network` view, 8 low-orbit
azimuths (elev 27°), 8 top-down azimuths (elev 60°), front/rear grazing (elev 3°), close-front
through the glazing, and the embed unit framing — from a FRESH BOOT of each side at a pinned
1280×800 canvas and frozen tick: BEFORE = the backup, AFTER = the pruned tree. Captures:
`runs/assets/prune-interiors-{before,after}-<view>.png`.

- **Cross-boot noise floor: exactly 0 differing pixels** (the same backup build booted twice and
  diffed across all 21 views — `runs/assets/noisefloor-*.png`), so every before/after delta is
  attributable to the change.
- **Zero pixels differ (≥1/255) in:** both grazing views, close-front (the through-the-glazing
  view), the embed framing, lo-135 and lo-225. No view anywhere is missing an object; no light
  pool moved.
- **Residual:** 1531 px (≥8/255) across the remaining views out of 21.5 M compared pixels
  (0.007%), all of one class — a ONE-PIXEL-WIDE shadow-penumbra seam along the corridor-slot
  wall lips (overlay evidence: scratchpad `hi135-overlay.png`), strongest in the steep top-downs
  (hi-135: 340 px ≥8, 6 px ≥64; fixed view: 78 px ≥8, max delta 35/255). Cause: the baked sun
  shadow's depth texture no longer contains the sealed interior casters, so the shadow boundary
  on the slot walls shifts by one texel. This is not a missing object and not a restorable item
  (restoring it would mean keeping the pruned interior mass as shadow casters, i.e. keeping the
  cost); side-by-side the frames are indistinguishable — only numeric diffing finds the seam.
  Reported as the one honest residual.
- Layout caveat: the backup predates today's Ronda-B chrome by a few CSS pixels, so the
  comparison pins `#viewer` to an exact 1280×800 via injected style on both sides (the shipped
  page chrome itself is untouched by this run).

### bfcache re-verification on the final tree

index → dashboard → Back on the pruned tree: `persisted: true`, zero
`backForwardCacheNotUsed`, scene live (canvas present, rAF running, tick advancing), zero
console errors. (154 ms back-navigation on an unloaded machine; the re-run under capture load
measured 2.2 s of NAVIGATION time — the scene itself needs no rebuild either way.)

### Publish

`node build-publish.mjs` rebuilt clean: main 38.5 kB source → **607.6 kB** bundled+obfuscated
(was 623.9 kB), dashboard 5.0 kB → 59.3 kB, three external. Zero console errors on the dev
pages in every measurement/capture run.
