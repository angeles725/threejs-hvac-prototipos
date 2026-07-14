# apply — asset 01-shell-circulation-facade — LIGHTING-CAMERA — LINEAGE 2 (reset 1), attempt 1

Code + tests + report only. No captures, no commit, no verdict.

- Tests: **180 pass / 0 fail** (`node --test tests/*.test.mjs`) — 165 pre-existing + **15 new**.
- RED log (before implementation): `runs/lighting-l2-attempt1-red.log` — 13 new tests failing.
- GREEN log: `runs/lighting-l2-attempt1-green.log`.
- Light count: **27** (was 32). 4 rig + 5 lobby + 4 corridor + **8 aisle LED** + 6 forecourt.
  The auditorium lost a whole PointLight family; it did not gain one.
- Draws: 116 instanced buckets + 6 surface meshes = **122** (budget 550). ~**17.5k tris** (budget 750k).

---

## THE ROOT CAUSE — a zone-classification bug, not a brightness bug

The auditorium ceiling was never too bright. **It was never an auditorium surface.**

Each room's ceiling was the underside of its `<family>-roof` panel. That panel is on layer `roof`, and
`LIGHTING_UNDIMMED_LAYERS` lists `roof` — for a good reason: rooftop plant sits inside the footprint
in x/z, and `resolveLightingZone` ignores y, so without that entry an air handler on the roof would be
lit as though it were indoors. The consequence nobody traced: **`resolveLightingZone` handed every roof
box the `exterior` zone and a dim of 1.0.** The darkest room in the building had a ceiling that
reflected the sun at full strength.

And then it got much worse, because of how the fixtures are built:

```js
resolveFixtureIntensity(f) = (targetIrradiance / resolveZoneDim(zone)) * referenceDistance ** 2
```

The auditorium dim is `2^-7.2 = 0.0068`, so an auditorium lamp is handed to `THREE.PointLight` **pre-
compensated by 1/dim = 147×**. Every surface carrying the auditorium's shader patch divides that back
out and sees the modest pool it was tuned for. The roof panel above it does not. Measured:

| auditorium lamp | raw intensity given to `THREE.PointLight` | cutoff | ceiling at 7.9 m |
|---|---|---|---|
| `auditoriumScreen` (y = 2.9) | **2573.1** | 12 m | **inside its range** |
| `auditoriumAisle` (y = 1.2) | **873.0** | 9 m | **inside its range** |

Both lamps stood underneath an undimmed ceiling, well inside their own cutoffs. That is the
"large soft blue-white glow pools that clip toward white", it is why they were **blue**-white (the lamp
colours are `0xd8e4ff` and `0x8fc4ff`), and it is why they read as "soft round sprite halos floating on
the wall with no luminaire body under them": a decay-2 point source carrying a 147× pre-compensation is
a bomb at 4 m and a whisper at 12.

### Why three green suites could not see it

`resolveSurfaceRadiance` filtered the house fixtures by the **surface's** zone:

```js
for (const fixture of Object.values(LIGHTING_HOUSE_FIXTURES)) {
  if (fixture.zone !== zone) continue;   // <- the whole bug
```

`WebGLRenderer` does no such thing. It matches a light against the **camera's** layers and never
against the lit object's; every PointLight the runtime adds to the scene lights **every** mesh inside
its cutoff, and the only thing that refuses it is the surface's own material dim. **The model had made
the defect physically impossible.** Asked for the ceiling, it returned `0.000` — a perfectly
confident answer about a surface the renderer was painting near-white. The sidecar then never sampled
that surface at all, so nothing contradicted it.

This is the same class of error as attempt 2's (a wall patch under a fixture standing in for a room),
one level up: **not a wrong sample, a model in which the wrong sample could not exist.**

---

## The eight corrections

| # | correction | what changed | RED test |
|---|---|---|---|
| 1 | auditorium ceiling below every corridor surface | **The ceiling is now a real auditorium surface.** 8 new `interior-ceiling` soffits (`<room>-ceiling`), one per room, on layer `architecture`, positioned by the plan bands → classified `auditorium` → dimmed + zone-filled. They sit flush under the roof panel and occlude it from every interior camera. Architectural-state only, like the other two soffits — which is exactly why `eng-sala-3` always read correctly while the architecture state did not. | `L2 CORRECTION 1 — the auditorium ceiling is the DARKEST ceiling in the building` |
| 2 | re-drive the room; remove the wash pools | **`auditoriumScreen` deleted outright** (−8 lights). Its job — the screen bounce — moves to the fill's `bounceX` normal basis, which carves risers and linings with no pool, no halo and no ceiling. The aisle LED survives, with its **cutoff cut 9 m → 3.4 m**: over a lamp at y = 1.2 it cannot reach anything above 4.6 m, so the ceiling and the upper walls are beyond it *as a matter of geometry rather than of tuning*. | `L2 CORRECTION 2 — the auditorium is CARVED by its aisle LEDs, exit signs and screen bounce`; `L2 — house lights are GLOBAL` |
| 3 | in-room exit signs must read | They were never under-driven — **they were edge-on.** The plate was 0.62 m along **x** × 0.26 y × 0.05 z, and both cameras that must prove it (`sala-3`, `reference-match`) look due **west, down the x axis**. The face they presented was the 0.05 × 0.26 m edge: a 1 px × 7 px dash, exactly as reported. Now blade-mounted: **0.05 x × 0.34 y × 0.9 z**, a 0.34 × 0.9 m face square to both cameras (~10 × 26 px at 14 m). Emissive scale 1.4 → 2.4. | `L2 CORRECTION 3 — the in-room exit signs present a READABLE face to the sala cameras` |
| 4 | reframe the facade | **`[4.5, 7.4, 42] fov61` → `[37, 12.5, 44] → [12, 1, 18] fov42`** — a three-quarter hero. See "the impossibility" below. Band **23% → 62%**, sky **44% → 20%**, plaza **33% → 18%**, and the marquee is **inside both frame edges** for the first time. | `L2 CORRECTION 4 — the facade FILLS the frame and the marquee is not clipped` |
| 5 | forecourt spill | The pools were real and were simply **behind the ground the frame shows**: the 3 floods sit at z = 28, and the facade camera's lower third looks at the plaza from z ≈ 34 out. A **second rank of 3** now stands out on the plaza (z = 35), where the frame is actually looking. | `L2 CORRECTION 5 — the forecourt is a POOL that dies with the house lights` |
| 6 | break the smooth-plastic response | Panel roughness swing widened (150–255 → **74–255**, a 0.71 span), plaza given a real cast-slab response with joints (was a ±18/255 wobble), and — the half that was missing — **`clearcoatRoughnessMap` on the shell**: `clearcoat: 0.32` is a *uniform* coat whose Fresnel goes to 1 at exactly the angle the `grazing` camera stands at, so it returns one flat gradient no matter what the roughness map beneath it does. | `L2 CORRECTION 6 — the shell and the plaza break their specular up across the elevation` |
| 7 | gate the lobby floor | New **`cinemexIndirectGain` uniform** scales `indirectDiffuse`/`indirectSpecular` by `light_state`. Those terms carry the AmbientLight **and `scene.environment`** — the RoomEnvironment probe — and the probe had never once been asked whether the house lights were on. `lobbyGlossTile` runs `envMapIntensity: 2` over `roughness: 0.06` and `clearcoat: 1`: the most env-reflective material in the building, and the one the review caught holding its lit value. Floor now drops 59% against the ceiling's 75%. | `L2 CORRECTION 7 — the lobby FLOOR is gated on the house-light channel` |
| 8 | raise the engineering fill | `fillGain` 1.9 → **2.6**, and it now scales the indirect/environment term too. `ambientBoost` **stays at 0.16** — see the honest caveats. | `L2 CORRECTION 8 — the engineering neutral fill lifts the shell off the background` |

---

## THE FULL MULTI-SURFACE LUMINANCE TABLE

Displayed sRGB luminance through the renderer's real chain: dimmed rig + **all** fixtures (global, with
true distance/cosine falloff) + zone fill + gated environment, every reflected term × `RECIPROCAL_PI`,
then ACES (`exposure 1.08`, **including three.js's `/0.6`**) then sRGB. Every row is a real box the
builder emits in that zone, locked by `L2 — every sampled surface is a real box the builder emits`.

| zone | class | surface | under a fixture? | **ON** | OFF | ENG |
|---|---|---|---|---|---|---|
| **EXTERIOR** | wall | facade wall | yes | **0.822** | 0.692 | 0.834 |
| | floor | plaza (under a flood) | yes | **0.568** | 0.390 | 0.585 |
| | floor | plaza far | no | **0.482** | 0.390 | 0.505 |
| **LOBBY** | ceiling | ceiling soffit | no | **0.324** | 0.082 | 0.580 |
| | floor | gloss tile | yes | **0.570** | 0.234 | 0.712 |
| | floor | gloss tile off-axis | no | **0.430** | 0.234 | 0.643 |
| | wall | lining wall | no | **0.505** | 0.189 | 0.741 |
| | door | checkpoint gate | no | **0.234** | 0.073 | 0.416 |
| **CORRIDOR** | ceiling | ceiling soffit | no | **0.084** | 0.008 | 0.204 |
| | ceiling | ceiling between strips | no | **0.083** | 0.008 | 0.203 |
| | floor | carpet mid | no | **0.096** | 0.011 | 0.224 |
| | floor | carpet far | no | **0.096** | 0.011 | 0.224 |
| | wall | wall UNDER a strip | yes | **0.364** | 0.080 | 0.556 |
| | wall | wall BETWEEN strips | no | **0.332** | 0.080 | 0.539 |
| | wall | far wall / corridor end | no | **0.270** | 0.100 | 0.425 |
| | door | acoustic door leaf | yes | **0.069** | 0.006 | 0.178 |
| | door | acoustic door leaf far | no | **0.069** | 0.006 | 0.178 |
| **AUDITORIUM** | **ceiling** | **ceiling** | no | **0.055** | 0.004 | 0.153 |
| | **ceiling** | **ceiling OVER the aisle LED** | yes | **0.055** | 0.004 | 0.153 |
| | **ceiling** | **ceiling OVER the screen** | yes | **0.055** | 0.004 | 0.153 |
| | floor | carpet, no fixture | no | **0.083** | 0.008 | 0.207 |
| | floor | cross-aisle (LED pool) | yes | **0.138** | 0.008 | 0.249 |
| | wall | divider side wall | no | **0.160** | 0.034 | 0.341 |
| | wall | **wall BESIDE the old screen lamp** | yes | **0.160** | 0.034 | 0.341 |
| | door | acoustic lining | no | **0.047** | 0.003 | 0.137 |
| | door | acoustic lining, high | no | **0.047** | 0.003 | 0.137 |
| | seat | seat block (facing away) | no | **0.057** | 0.005 | 0.156 |
| | seat | seat riser to screen | no | **0.057** | 0.004 | 0.155 |
| | seat | seat riser back row | no | **0.057** | 0.004 | 0.155 |
| | nosing | step nosing | no | **0.094** | 0.011 | 0.227 |
| | nosing | step nosing back | no | **0.094** | 0.011 | 0.227 |

### The two rows that are the whole lineage

**The auditorium ceiling reads 0.055 over the aisle LED, 0.055 over the screen, and 0.055 with nothing
above it at all.** The pools are not dimmed — they do not exist. The lamp cannot reach the ceiling.
Likewise the wall *beside* the deleted screen lamp (0.160) is identical to the wall 9 m away from it
(0.160): the wash pool is gone, not attenuated.

### Tier ordering — no inversion, and a floor under every zone

| tier | field min (no fixture) | field max | **absolute max** (pools included) |
|---|---|---|---|
| exterior | 0.482 | 0.482 | 0.822 |
| lobby | **0.234** | 0.505 | 0.570 |
| corridor | **0.069** | 0.332 | 0.364 |
| auditorium | **0.047** | 0.160 | **0.160** |

- **No auditorium surface (0.160 max) exceeds the corridor's brightest (0.364).** ✓ correction 1.
- **Per class, on one albedo at a time**, auditorium < corridor < lobby — ceiling (0.055 / 0.084 / 0.324),
  floor (0.083 / 0.096 / 0.430), wall (0.160 / 0.332 / 0.505), door (0.047 / 0.069 / 0.234). ✓
- **Auditorium ceiling 0.055 < corridor ceiling 0.084 < lobby ceiling 0.324**, and below its own side
  wall (0.160). ✓ the review's explicit target.
- **Minimum floor holds**: nothing anywhere is under 0.047. The ACES toe zeroes anything below ~0.002
  linear, and the darkest surface in the building (the acoustic lining, albedo `0x202029`, Y = 0.014)
  clears it. Dim is not black.

### Silhouette separation — the room still reads

| adjacent pair | Δ |
|---|---|
| step nosing (0.094) vs its riser (0.057) — the rake | **0.037** |
| carpet (0.083) vs the seat block standing on it (0.057) | **0.026** |
| divider wall (0.160) vs the seat mass in front of it (0.094) | **0.066** |
| cross-aisle under the LEDs (0.138) vs unlit carpet (0.083) | **1.66×** — the LEDs still spill |
| corridor wall under a strip (0.364) vs between strips (0.332) | **0.032** — the wash falloff survives |

---

## The facade: why a frontal camera was never going to work

The review asked for two things that a **frontal elevation cannot both deliver**, and the proof is one
line: containing the 34 m marquee across a 4:3 frame forces a frame **≥ 34 / 1.333 = 25.5 m tall**. The
facade band is **5.65 m** from apron to wordmark. **5.65 / 25.5 = 22%** — which is, to the point, the
"middle ~20% between two voids" the judge measured. Every previous attempt was tuning a number that
geometry had already decided; attempt 3 bought its 37% by cropping the marquee, which is the defect.

Projecting lineage 1's own preset reproduces the judge's three numbers exactly — **44% sky / 23% band /
33% plaza** vs his "~45% / ~20% / ~35%" — once the silhouette is taken as what the eye can actually
*see*, which from a frontal stand is the facade band alone (the 8.4 m auditorium masses sit directly
behind it, occluded). That agreement is what validated the framing model before I used it.

A three-quarter stand breaks the deadlock: the marquee foreshortens (34 m projects like 24), the near
east end comes forward, and the auditorium mass stops hiding behind the facade and starts filling the
upper frame — it is building, not sky. **Band 62% / sky 20% / plaza 18%, marquee inside both edges, and
the gated poster-bank containment still holds** (the surface pass pins it through a 0.8-portrait
viewport; standing east of the axis puts the bank on the near side, large and comfortably inside).

---

## What was RE-DERIVED, and why (full disclosure)

Five lineage-1 tests failed against the corrected rig. **None was weakened to make a number pass**; each
either asserted the defect itself or measured it with a probe this lineage proved unfit. Every one is
listed:

1. **`correction 3` — required `auditoriumScreen` to exist.** That fixture *is* the floating wall halo
   the review rejected. The test now asserts it is **gone**, that the aisle LED cannot reach the
   ceiling of even the smallest room, and that the screen bounce still exists as a fill basis.
2. **`correction 2` — auditorium stop band `[5.2, 6.6]` → `[3.4, 4.6]`.** This is the one number that
   got *shallower while the room got darker*, and both are true. `resolveZoneIrradiance` measures one
   canonical vertical wall and takes the rig with no distance and no cosine. In lineage 1 the
   auditorium's vertical surfaces got almost nothing from the fill (`side` = 0.048) and took their
   value **from the wash PointLight standing next to them** — from the defect. Moving that value into
   the fill (`side` → 0.39) makes the coarse probe read brighter while **the divider wall the camera
   actually looks at reads darker: 0.160 against the review's own sidecar figure of 0.213.**
3. **`correction 2` — the 75% auditorium loss.** Threshold **unchanged**; the *measurement* moved onto
   the real wall, where the auditorium loses **80.5%** (the coarse probe said 72.8% and was
   understating the room's darkness). Strictly stronger.
4. **`correction 8` + `attempt 3 correction 5+6` — the frontal facade composition.** Re-derived onto
   the three-quarter silhouette, with tighter bounds than before (band ≥ 55%, sky ≤ 24%, plaza ≤ 26%,
   **and a new assertion that the marquee is not clipped** — which lineage 1 never made).
5. **`materials.test.mjs` — "the pool holds no orphan texture" (9 ≠ 8).** The gated invariant is
   untouched; its helper enumerated two map slots and the lighting pass added a third
   (`clearcoatRoughnessMap`, which *is* consumed). It now enumerates all three, so the no-orphan
   invariant is asserted over more surface area, not less.

## Not fully applied / brutally honest caveats

1. **"No auditorium surface may exceed ANY corridor surface" is arithmetically impossible, and I did
   not implement it.** Taken literally it means `max(auditorium) ≤ min(corridor)` = **0.069**, the
   corridor's acoustic door leaf. The auditorium contains a shell-gray divider wall (albedo `0xf0ede7`,
   Y = 0.83) and an acoustic lining (`0x202029`, Y = 0.014) — a **59:1 albedo range**, compressed by
   `LIGHTING_FILL_FLATTEN` to **3.9:1**. Fitting a 3.9:1 range inside the window `[0.047, 0.069]`
   (1.5:1 in display space) is not possible; forcing it drives the lining under the ACES toe, which is
   attempt 2's grave. A dark door leaf in a bright room is darker than a white wall in a dark room —
   that is a statement about **albedo**, not about light. I implemented the two forms that *are* about
   light and that the review itself states: **`max(auditorium) < max(corridor)`** (correction 1's own
   words), and **per-class ordering on one albedo at a time**, over the ambient field of each zone. The
   luminaire pools are compared separately, because the review's correction 2 says in terms to KEEP the
   aisle-strip spill — and a 0.2 m LED pool out-reading another room's unlit carpet is what an accent
   is for.
2. **The environment constant is calibrated, not derived.** `scene.environment` is real and it is the
   mechanism the review pointed at for the gloss tile, but its magnitude is a stand-in. I calibrated it
   against the one hard anchor available: `canonical-network-endpoints` (0.84, passing) needs RS-485 to
   hold `minimumScreenSaturation` = 0.55, and the probe adds a **white** pedestal to everything,
   emissive media included. The media sits at 0.65 with no probe at all, so the probe has **0.10 of
   saturation to spend**; my first guess (`radiance: 0.75`) spent 0.21 of it and desaturated a green
   trunk to 0.44. At the magnitude the evidence permits (0.10/0.05, leaving the media at 0.62/0.58),
   **the probe is not the largest ungated indirect term in the model — the AmbientLight is.** Both sit
   in `indirectDiffuse`/`indirectSpecular` and the new gate catches both, so correction 7 is fixed
   either way; but I am **over-claiming if I say the env probe alone explains the lit floor**, and I am
   saying so. What the probe *is* needed for is why the gate must cover `indirectSpecular` and not just
   `indirectDiffuse`: a mirror-finish floor reflects a probe, it does not diffusely bounce it.
3. **`ambientBoost` stays at 0.16, not raised.** Correction 8 asks to raise the engineering fill, and I
   raised it — but through `fillGain` (2.6), not the ambient. The ambient is a term of the **exterior**
   rig: every interior surface rejects it by its own zone dim (×0.047 in the corridor), so raising it
   does nothing for eng-neutral, while landing at **full strength** on the undimmed technical layers,
   where white light on a saturated green trunk is exactly how RS-485 blooms. Raising it to 0.24 broke
   the gated media saturation; that is a measured fact, not a guess.
4. **The mechanical sidecar is not mine to write, and it is where this defect hid.** I did the one thing
   I could: the sampling table is no longer test data or sidecar folklore — it is
   **`LIGHTING_EVIDENCE_SURFACES`, exported from the pass authority**, imported by the unit suite, and
   guarded by `L2 — the four-surface contract`, which **fails the build** if any zone lacks a ceiling,
   floor, wall or door row. The next sidecar should import the same list rather than hand-type one. The
   full table above is ready to be copied into it.
5. **No render was performed.** WebGL is unavailable here; `node --check` plus the derived-pixel suite
   is the gate. The model is now a literal twin of the emitted GLSL — the same constants generate both,
   and the fixtures are global in the model because they are global in the renderer — but the only
   thing that settles it is the re-capture, which is yours. **The single most valuable frame is
   `sala-3`, lights-on, architecture: the ceiling must now be the darkest ceiling in the set.**
6. **`sala wall` lights-off (0.034) is the brightest lights-off interior surface**, because the `side`
   fill's 22% residual lands on it. It is well under every lights-on floor, so the pair stays
   unambiguous, but it is the loosest margin in the off-state table.

## Files changed

- `src/scene/lighting.js` — global-light model; environment term + `resolveIndirectGain`;
  `LIGHTING_LIGHT_STATE_INDIRECT` + `cinemexIndirectGain` uniform in the shader patch;
  `auditoriumScreen` deleted; aisle-LED reach bounded; auditorium fill basis re-solved; forecourt
  second rank; auditorium/exit emissives; engineering lift; shell + plaza breakup;
  **`LIGHTING_EVIDENCE_SURFACES` / `LIGHTING_EVIDENCE_CLASSES` / `LIGHTING_INTERIOR_CEILING_COLOR`**.
- `src/scene/architecture.js` — **8 auditorium interior-ceiling soffits**; exit signs re-oriented and
  enlarged; ceiling colour sourced from the authority.
- `src/scene/materials.js` — panel/plaza roughness response widened; `clearcoatRoughnessMap` on the shell.
- `src/controllers/camera.js` — `facade` reframed to a three-quarter hero.
- `tests/lighting-camera.test.mjs` — 15 new L2 tests; 5 lineage-1 tests re-derived (each justified above).
- `tests/materials.test.mjs` — no-orphan-texture invariant extended to the third response slot.
