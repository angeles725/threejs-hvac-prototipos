# apply — asset 01-shell-circulation-facade — LIGHTING-CAMERA — attempt 3

Final allowed retry. Code + tests + report only. No captures, no verdict, no commit.

- Tests: **165 pass / 0 fail** (`node --test tests/*.test.mjs`) — 154 pre-existing + 11 new.
- RED log (before implementation): `runs/lighting-attempt3-red.log` — 11 new tests failing, 29 passing.
- Light count: **32 total** = 4 rig (key/fill/rim/ambient) + 28 house fixtures (25 interior + 3 new
  forecourt). Attempt 2 ran 25 fixtures; this adds 3, for correction 4/6.
- Draw budget: 115 instanced architecture buckets + 6 surface meshes + 46 sprites. Budget 550/750k.

---

## THE ROOT CAUSE — why attempt 2's green tests lied

This is the whole report. Everything else follows from it.

`tests/lighting-camera.test.mjs::screenColour` composed the pixel as `albedo * irradiance`.
**It never divided by π.**

three.js r160 runs `WebGLRenderer.useLegacyLights = false`. Every reflected term in the standard
shader goes through `BRDF_Lambert = RECIPROCAL_PI * diffuseColor`, and with legacy lights off
*nothing multiplies the π back in*. The renderer is therefore **3.1416× darker** than that model
claimed, for every lit surface — and only for lit surfaces. Emissives are radiance already and carry
no π, which is exactly why the emissive strips, screens and exit signs looked correct in the
captures while every surface around them was crushed to black.

Reproduced, with attempt 2's own rig:

| model | exterior | lobby | corridor | auditorium |
|---|---|---|---|---|
| no-π (attempt 2's test model) | 0.894 | 0.601 | 0.330 | 0.131 |
| **with-π (three r160 reality)** | 0.676 | 0.291 | **0.125** | **0.032** |

The top row is *verbatim* what attempt 2's report claimed. The bottom row is a near-black corridor
and a black auditorium — which is verbatim what the blind judge described. The measurement was not
merely sampling the wrong pixel; it was 3× wrong everywhere, and it happened to stay above the
visible threshold in the two tiers that passed.

Compounding it: **ACES has a subtractive toe** (`x*(x+0.0245786) - 0.000090537`). Anything below
roughly 0.002 linear does not render dark — it renders as **zero**. The cinema palette is near-black
by design (carpet `0x3a2436`, Y=0.022; acoustic fabric and door leaves `0x202029`, Y=0.014), so once
the sun was rejected and only a handful of PointLights remained, every surface no luminaire stood
over fell straight through the toe. That is the black hole, and no number of extra PointLights fixes
it — a PointLight pools, it does not fill.

### And a real bug

`LIGHTING_ZONE_BOUNDS.corridorHalfWidth` was `3.6`. The corridor's own segmented walls, portal
headers and acoustic door leaves stand at **x = ±3.72**. Every surface the corridor camera looks at
was classified `auditorium` and lit **six stops down**. "The side walls, doors and room-number plates
all sit at effectively zero luminance" was literally true, and it was a plan-band off-by-0.12 m.

---

## What changed

### Authority (`src/scene/lighting.js`)

| addition | why |
|---|---|
| `LIGHTING_RECIPROCAL_PI` | the π. Every reflected term in the model and the shader now carries it. |
| `LIGHTING_ZONE_FILL` | a per-zone room bounce on a **separable normal basis** — `sky` (+y), `ground` (−y), `side` (horizontal), `bounceX` (\|n.x\|, the screen/marquee axis). This is what puts a floor under the whole room instead of under four dots. |
| `LIGHTING_FILL_FLATTEN` | the fill sees `mix(albedo, 0.27, 0.5)`. A purely albedo-proportional fill bright enough to lift a 0.022-albedo carpet out of the toe renders the 0.83-albedo wall beside it at 0.88 — as bright as the sunlit facade. Flattening compresses that 38:1 range to 3.8:1, which the tone curve can hold. The **direct** terms still carry full albedo, so the gated palette identity is never re-authored. |
| `resolveSurfaceRadiance()` | the pixel: position + normal + material → linear radiance, assembled exactly as `createZoneShaderPatch()` assembles it. Tests measure through this. |
| `LIGHTING_EXTERIOR_FIXTURES` | 3 forecourt floods (correction 4/6). |
| `LIGHTING_ENGINEERING_LIFT.fillGain` | correction 9. |
| `LIGHTING_CAPTURE_VIEWPORT` | 960×720. Composition is now asserted against the frame that is *actually captured*. |

The dim is now **only a sun rejector**. Attempt 2 also made it the interior's exposure control — that
is what put the interiors under the toe.

### GLSL (`createZoneShaderPatch`)

```glsl
#include <aomap_fragment>
  reflectedLight.directDiffuse   *= 0.047366;   // sun rejection (corridor)
  reflectedLight.directSpecular  *= 0.047366;
  reflectedLight.indirectDiffuse *= 0.047366;
  reflectedLight.indirectSpecular*= 0.047366;
  vec3 cinemexWorldNormal = inverseTransformDirection( normal, viewMatrix );
  float cinemexUp = max( cinemexWorldNormal.y, 0.0 );
  ...
  vec3 cinemexFillAlbedo = mix( material.diffuseColor, vec3( 0.27 ), 0.5 );
  reflectedLight.indirectDiffuse += cinemexFillAlbedo * cinemexFill * cinemexZoneFillGain * RECIPROCAL_PI;
```

`cinemexZoneFillGain` is a **live uniform**: `light_state` (1.0 → 0.22) and the engineering lift
(×1.9) both move the room bounce without rebuilding a program.

---

## The ten corrections

| # | correction | what changed | RED test that proves it |
|---|---|---|---|
| 1 | corridor to a real tier | `corridorHalfWidth` 3.6 → **4.05** (the ±3.72 walls were on the auditorium rung); corridor `LIGHTING_ZONE_FILL` (sky .56 / ground .50 / side .25 / bounceX .175); corridor fixture 0.045 → 0.42 irradiance, range 10→12 m | `attempt 3 correction 1: the corridor is a REAL tier — no structural surface is black` — floors ≥ 0.06 on **five surfaces no fixture stands over**, corridor < 0.8×lobby, corridor > 1.3×auditorium, and wall-wash falloff ≥ 0.02 between "under a strip" and "between strips". Plus `attempt 3: the corridor side walls are lit as CORRIDOR, not as auditorium` (regression lock on the ±3.72 bug). |
| 2 | auditorium seat blocks carved out | auditorium fill with a **neutral** sky (`0xdcdfe6`, not blue — a blue fill reflects nothing off burgundy seats) carrying the rake, a small `side` (0.048) so the shell-gray dividers stay dark, and a `bounceX` (0.30) = screen bounce on the risers/linings. Aisle fixture 0.009 → 0.95 irradiance, lowered to y=1.2 so it **spills on the nosings**; screen fixture 0.012 → 0.70, moved 3.5 m inboard. | `attempt 3 correction 2: the auditorium seat blocks are CARVED OUT, not erased` — min floor ≥ 0.04 on **every** sampled surface; nosing−riser ≥ 0.015; carpet−seatBack ≥ 0.02 (the block silhouettes against the floor it stands on); sideWall−nosing ≥ 0.05; cross-aisle > 1.4× unlit carpet (the LEDs spill, not float); aisle fixture height asserted in the step band. |
| 3 | in-room exit signs | **16 new** `surface-exit-green` boxes, two per room, on both side walls a third of the room in from the screen (clear of the screen slab and the seat rake). `surface-exit-green` intensityScale 1.0 → 1.4 so it stays the brightest thing in the corridor too. | `attempt 3 correction 3` — exactly 16, all in the `auditorium` zone, ≥1 sala-3 sign inside **both** the `sala-3` and `reference-match` frames, and the aisle/exit/screen triad each out-reads the sala wall. |
| 4 | marquee as a real channel | new **`marquee-canopy`** emission channel (unlit `0x59090f`, emissive `0xf51d25`) replaces plain `brand-red` on the canopy; `facade-sign-emissive` unlit face darkened `0xf0ede7` → `0x2b2723`. *A near-white sign under a 1.5 sun already tone-maps to the top of the curve — adding emission to it changes nothing a viewer sees. A sign is only a channel if it is dark when off.* Plus 3 forecourt floods that die with `light_state`. | `attempt 3 correction 4` — the assertion is on the **pixel**, not on `emissiveIntensity`: each channel must move **≥ 0.20 displayed luminance** between on and off; forecourt pool must move ≥ 0.05. |
| 5 | reframe the facade | `[0,9.5,48] fov70` → **`[4.5,7.4,42] fov61`**. Measured through the *real* 960×720 frame, attempt 2 put the building across **24%** of the image height (the judge's "middle 20%") with the horizon at ndc −0.11. It is now **37%**, horizon at −0.34. | `attempt 3 correction 5 + 6` — band ≥ 0.34 of frame height, roofline not cropped, forecourt not swallowing the frame, and poster bank / entrance bank / wordmark all still inside. |
| 6 | fix the grazing read | the 3 forecourt floods stand **off** the elevation (z=28, not 24.2 — at 1.9 m they blew the white panels to 0.95, and a clipped wall is not a graded key). Facade now washes 0.799 at the entrance → 0.693 at the far pier. `marquee-canopy` is `physical` with clearcoat, so the three lights return varied specular across its 34 m instead of one edge strip. | same test — `centre − end ≥ 0.03` across the elevation (actual **0.109**) and an entrance light pool `apronUnder − apronOut ≥ 0.06` (actual **0.097**). |
| 7 | lobby ceiling is a lit surface | `interior-ceiling` `0x1b1e25` → **`0x39404b`**, and the lobby fill's `ground` term (1.95 — the lit gloss tile throwing light back up) lands on it. | `attempt 3 correction 7 + 8` — ceiling ≥ 0.18 (actual **0.323**), and the emissive panels still out-read their own ceiling by 1.6×. |
| 8 | corridor end wall | `resolveLightingZone` now classifies the **rear envelope wall** (`insideX && z ≤ −22.05`) as `corridor`. It was `exterior`, taking the full sun while the corridor around it took none — that is the flat mid-gray rectangle. | same test — `rear-exterior-wall.zone === 'corridor'`, far wall < 1.15× the corridor side wall, and still ≥ 0.06 (not a new black hole). |
| 9 | engineering neutral fill | `LIGHTING_ENGINEERING_LIFT.fillGain = 1.9`, applied to the **zone fill**. Attempt 2 raised only the `AmbientLight`, which is a term of the exterior rig — so every interior surface rejected the boost by its own zone dim and eng-neutral stayed murky. | `attempt 3 correction 9` — each zone's darkest surface rises ≥ 1.25×; engineering corridor floor ≥ 0.14 (was 0.011 with lights the judge called murky near-black); **and RS-485 must still out-read the shell and hold ≥ 0.55 saturation** (guard on the passing 0.82 feature). |
| 10 | re-capture | not mine. | — |

---

## Multi-surface luminance table

Displayed sRGB luminance through the renderer's real chain (dimmed rig + fixtures with true
distance/cosine falloff + zone fill, all ×`RECIPROCAL_PI`, then ACES @ exposure 1.08, then sRGB).
Every row is a **real box the builder emits in that zone** — locked by
`attempt 3 — every sampled surface is a real box the builder emits in that zone`.

| zone | surface | under a fixture? | **lights ON** | lights OFF | engineering |
|---|---|---|---|---|---|
| **EXTERIOR** | facade wall (+z, sunlit) | yes | **0.799** | 0.672 | 0.814 |
| | forecourt apron (+y) | no | **0.524** | 0.379 | 0.544 |
| **LOBBY** | lining wall (−x) | no | **0.498** | 0.186 | 0.664 |
| | gloss tile floor (+y) | yes | **0.557** | 0.229 | 0.650 |
| | ceiling soffit (−y) | no | **0.323** | 0.081 | 0.489 |
| **CORRIDOR** | side wall UNDER strip (−x) | yes | **0.361** | 0.079 | 0.483 |
| | side wall BETWEEN strips (−x) | no | **0.329** | 0.079 | 0.461 |
| | side wall far + low (−x) | no | **0.323** | 0.079 | 0.456 |
| | carpet floor mid (+y) | no | **0.095** | 0.011 | 0.172 |
| | carpet floor far (+y) | no | **0.096** | 0.011 | 0.173 |
| | acoustic door leaf (−x) | yes | **0.068** | 0.006 | 0.132 |
| | acoustic door leaf far (−x) | no | **0.068** | 0.006 | 0.132 |
| | **far wall / corridor end** (+z) | no | **0.267** | 0.098 | 0.361 |
| | ceiling soffit (−y) | no | **0.083** | 0.008 | 0.154 |
| **AUDITORIUM** | divider side wall (+z) | no | **0.213** | 0.004 | 0.228 |
| | acoustic lining (−x) | no | **0.047** | 0.003 | 0.101 |
| | seat riser to screen (−x) | no | **0.068** | 0.004 | 0.125 |
| | seat riser back row (−x) | no | **0.063** | 0.004 | 0.121 |
| | seat block back (+x) | no | **0.057** | 0.005 | 0.116 |
| | **step nosing / tier top** (+y) | no | **0.088** | 0.010 | 0.165 |
| | step nosing back (+y) | no | **0.088** | 0.010 | 0.165 |
| | cross-aisle floor (+y) | yes | **0.183** | 0.007 | 0.240 |
| | carpet, NO fixture (+y) | no | **0.109** | 0.007 | 0.176 |

### Tier separation and the minimum floor

| tier | representative wall | **darkest structural surface** | stops below exterior |
|---|---|---|---|
| exterior | 0.799 | **0.524** | 0.00 |
| lobby | 0.498 | **0.323** | 1.66 |
| corridor | 0.329 | **0.068** | 3.33 |
| auditorium | 0.213 | **0.047** | 5.99 |

The ladder is monotone on the wall **and** on the floor. Nothing in any tier is black.
For comparison, attempt 2's darkest corridor and auditorium surfaces, through the same correct
chain, were **0.004** and **0.000** — under the ACES toe, i.e. exactly zero.

### Silhouette separation (what "carved out" means in pixels)

| adjacent pair | Δ |
|---|---|
| step nosing (0.088) vs its riser (0.068) — the rake | **0.020** |
| carpet (0.109) vs the seat block standing on it (0.057) | **0.052** |
| divider side wall (0.213) vs the seat mass in front of it (0.088) | **0.125** |
| cross-aisle under the LEDs (0.183) vs unlit carpet (0.109) | **1.7×** (the LEDs spill) |
| corridor wall under a strip (0.361) vs between strips (0.329) — wall wash | **0.032** |
| corridor wall (0.329) vs its door leaves (0.068) | **0.261** |

---

## Not fully applied / honest caveats

1. **The facade preset is offset 4.5 m east of the axis.** This is forced, not chosen. The gated
   surface test `correction 8: the facade preset frames the entire poster bank` projects the bank
   (out to x=12.85) through `SURFACE_EVIDENCE_VIEWPORT` — a **0.8 portrait aspect**, which is *not*
   the 4:3 landscape frame `capture.mjs` actually renders. Held on axis, containing the bank through
   that narrower portrait field forces a ≥34 m tall frame and the thin band comes straight back. The
   surface pass's evidence-viewport constant is wrong about the capture tool, but it is gated and its
   test also drives the label-culling policy that `canonical-network-endpoints` (0.82, passing)
   depends on, so I did not touch it. Offsetting toward the bank satisfies both. **Band: 24% → 37%.**
   Fully on-axis and fully framed is unreachable until that constant is corrected in its owning pass.

2. **Fog lifted only to `0x080b13`, not to a true dusk navy.** The same colour sits *behind* the
   translucent engineering shell, and `canonical-network-endpoints` needs the RS-485/LoRaWAN/Ethernet
   media to beat that composite 3:1. `0x090c16` drops it to exactly 3.0:1 and `0x10141d` to 2.9:1.
   I stopped at the largest lift that keeps margin on a passing feature. The reframe does the real
   work on the "black void"; the fog only stops the sky being literally zero.

3. **Light count 25 → 28.** Three forecourt floods were unavoidable for corrections 4 and 6 (the
   marquee spill on the ground and the graded key across the elevation cannot come from ambient or
   emissive — an emissive quad lights nothing in three.js). Everything else was bought with
   ambient/fill, not lights. Locked at ≤30 by `attempt 3: the light count stays inside budget`.

4. **The auditorium acoustic lining sits at 0.047** — the lowest value in the building. Its albedo is
   `0x202029` (Y=0.014, gated). It is above the toe and it reads, but it is the tightest margin in
   the table.

5. **No render was performed.** WebGL is unavailable in this environment; `node --check` plus the
   derived-pixel suite is the gate. The model is now a literal twin of the emitted GLSL — the same
   constants generate both — but the only thing that finally settles it is the re-capture, which is
   yours.

## Files changed

- `src/scene/lighting.js` — π, zone fill, flatten, surface-radiance model, shader patch + fill
  uniform, retuned fixtures, forecourt family, zone-bounds fixes, fog, marquee/sign channels.
- `src/scene/architecture.js` — zone-lit material variants + fill-gain plumbing on `setLightState` /
  `setLabelPolicy`, `marquee-canopy` on the canopy, lit `interior-ceiling`, 16 in-room exit signs.
- `src/scene/runtime.js` — builds `LIGHTING_HOUSE_FIXTURES` (interior + forecourt); both switch.
- `src/controllers/camera.js` — facade preset reframed.
- `tests/lighting-camera.test.mjs` — **π added to `screenColour`** (the bug that produced the false
  green), 11 new multi-surface perceived-outcome tests, three attempt-2 thresholds re-derived.
