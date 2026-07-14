# apply — asset 01-shell-circulation-facade — LIGHTING-CAMERA — attempt 1

Sole writer. Code + tests only: no captures, no commit, no verdict.

Inputs: `design-spec.yaml` (`lighting: house-rig`, `lighting_notes`, `evidence_contract.lighting-camera`,
`quality_contract`, `critical_features[].pass_expectations.lighting-camera`, `important_features`),
`runs/assets/01-shell-circulation-facade/surface-attempt3.review.json` (PASS 0.81, six non-blocking
corrections), `research/HANDBOOK.md` §3.3 (house rig) + §4.1 (base scene), TRACK-THREEJS §Pass ladder,
GATES §LOOK-DEV EVIDENCE.

## Test counts

```
node --test tests/*.test.mjs
# tests 139
# pass  139
# fail  0
```

125 pre-existing + 14 new (`tests/lighting-camera.test.mjs`). Seven pre-existing assertions were
rewritten, not deleted — each one **pinned a constant this pass is required to move** (the look-dev
rig, the exposure literal, the media emissive multiplier, the single-layer shell opacity, the
serialized query string). Every rewrite replaces the copied number with the property it was standing
in for. Details in "Gated assertions that had to move".

## New authority: `src/scene/lighting.js`

One module owns everything this pass decides, so no builder re-types a value: the rig, tone mapping,
fog, the hero composition band, the cinema emission ladder, the `light_state` channel set, the media
screen-colour budget, the shell de-ghosting model, the device status budget and the preset→zone
ownership map.

## What changed, and the RED test that proves it

### 1. The house light rig replaces the look-dev rig — `src/scene/runtime.js`

`HemisphereLight(0xe9f2ff, 0x242936, 1.85)` + `DirectionalLight(0xffffff, 2.35)` + a 0.45 facade fill
were scaffolding raised during structural/materials to get neutral value before a lighting pass
existed. They are now the spec/HANDBOOK house rig:

| Role | Before | Now |
|---|---|---|
| Key | `0xffffff` @ 2.35 | `0xffffff` @ **1.5**, shadow 2048², bias −0.0003 |
| Fill | `0xb9d8ff` @ 0.45 | `0x88aaff` @ **0.4** |
| Rim | — | `0x00d4aa` @ **0.2** |
| Ambient | HemisphereLight @ 1.85 | `AmbientLight(0xffffff)` @ **0.24** + RoomEnvironment PMREM 0.04 |
| Exposure | 1.05 | **1.08** |
| Fog | none | `Fog(#06080d, 70, 170)`, background matched |
| Shadow | per-frame | `shadowMap.autoUpdate = false` + `bakeShadows()` |

RED: `the runtime rig is the house key/fill/rim/ambient rig, in the spec ratios` — derives key:fill
= 3.75:1 and rim < fill < key from `LIGHTING_RIG` and asserts the source has **no** `HemisphereLight`.
RED: `the key light shadow frustum encloses the whole building and is baked` — projects all eight
building corners (from `BUILDING`, not a literal) onto the key light's own view basis and asserts
each lands inside the shadow frustum's width/height/depth.
RED: `tone mapping and fog come from the lighting authority and keep the hero framing readable` —
derives, from the neutral preset and the building corners, that the nearest corner sits in front of
`fog.near` (foreground unhazed), the farthest sits behind it (depth cue) and inside `fog.far`
(nothing dissolves).

### 2. Composition on the house band — `src/controllers/camera.js`

`ISOMETRIC_PRESET` was `[66, 52, 68] → [0,0,0]`: azimuth 44.1° (in band) but elevation **28.8°**,
above the 20–28° house band, which reads as a plan rather than a hero. Now `[66, 46, 68]` → 25.9°.
The spec's `neutral` evidence view was already on the band (42.5° / 28.0°) and is untouched.

RED: `every hero framing sits inside the house azimuth/elevation band` — `resolveCameraComposition`
computes azimuth/elevation **camera→target** (not camera→origin) for every preset in
`LIGHTING_HERO_FRAMINGS` and asserts the TRACK band.

### 3. `cinema-lighting-hierarchy` (important feature) — `src/scene/lighting.js` + `architecture.js`

The emissive materials carried ten independent hand-set intensities with no ordering. They now come
from a four-rung ladder, brightest first:

| Tier | Channels |
|---|---|
| `facade-and-menus` | `facade-sign-emissive` (new), `surface-pos-screen`, `surface-popcorn` |
| `commercial-accents` | `surface-cooler-glass`, `surface-snack-graphic`, `surface-pos` |
| `corridor-wayfinding` | `surface-marking`, `accessible-yellow` |
| `auditorium-egress` | `surface-exit-green`, `wheelchair-blue` |

The CINEMEX word sign was `identity-white` (`shellWarmWhite`, no emission) — it could not glow
without lighting the whole shell. It now has its own `facade-sign-emissive` channel. Geometry,
position and size are unchanged; only the material key on that one box moved.

RED: `the cinema emission ladder falls strictly from facade to auditorium and never goes dark` —
computes each tier's brightest channel through the **renderer's own transfer chain** (sRGB decode →
emissive + rig irradiance in linear light → three.js r160 ACES filmic at the configured exposure →
sRGB encode → relative luminance) and asserts the ladder is strictly decreasing, with the auditorium
rung still ≥3× the fog-colour floor so aisle/exit lights stay readable.

### 4. `light_state` — `src/controllers/query-state.js`, `architecture.js`, `main.js`, `index.html`

`evidence_contract.lighting-camera` requires `light_state=on|off`; **it did not exist**. It is now a
first-class deterministic query state (parsed, validated, serialized in contract order) plus a UI
segmented control. `architectureAsset.setLightState()` drives `emissiveIntensity` for exactly the
channels in `LIGHTING_EMISSION_CHANNELS`.

RED: `light_state is a deterministic query state and only touches the emission channels` — asserts
the round-trip, and that `rs485-green`, `lorawan-blue`, `ethernet-blue`, `tc-blue` and
`direction-amber` are **absent** from the channel set: an engineering capture with the house lights
off must still show a live network and a live thermostat.

### 5. Surface correction 1 + 2 — media colour (RS-485 mint/white, LoRaWAN white cubes)

Root cause, measured: `mediaEmissiveIntensity = 1.35` clips two of three channels through ACES, and
the hue dies with the saturation. RS-485 tone-mapped to saturation **0.32** — that is white glow, not
green. Set to **0.45** (RS-485 → sat 0.56, hue 6.7° off the legend swatch).

For LoRaWAN, colour was only half the defect. At `complete-network` the shared 5× evidence widening
turned a 0.46 m dash into a 0.45 m cross-section: a **cube**. The dash period is now 2.2 m (was 1.1)
and RF gets its own 4× widening while RS-485/Ethernet keep 5× — dash 0.92 m long × 0.36 m thick
(aspect 2.57) and still 3.4 px wide, above the surface pass's own minimum.

RED: `correction: RS-485 renders as saturated spec green rather than a blown-out mint halo` —
tone-maps the material and asserts hue within 12° of `#29d67d` and saturation ≥ the budget floor.
RED: `correction: LoRaWAN stays in the blue family and reads as a dash, never as a white bead` —
same colour derivation, plus a derived dash-aspect and a derived projected-width check at the
`complete-network` preset, plus proof the two blue media do not collapse into one hue.
RED: `correction: the emissive media still out-luminates the translucent engineering shell` —
composites the de-ghosted shell over the fog colour and asserts every medium beats it ≥3:1.

### 6. Surface correction 3 — engineering shell ghosting

`visual_states.engineering.shell.opacity: 0.18` is a **single-layer** figure. I measured the actual
stack by ray-casting the evidence framings against the built scene: ug67 **7**, kitchen **11**,
concessions **11**, complete-network **9**. Eleven layers at 0.18 composite to **0.89 alpha** — that
is precisely the milky ghosting the reviewer saw. Per-layer opacity is now derived from the composite
the stack is allowed to reach (ceiling 0.55): **0.0644**, giving **0.52** composite at eleven layers.
The same factor is applied to the seat and carpet opacities so the relation the surface pass gated
(seats bleed less than the shell) survives instead of inverting.

RED: `correction: stacked translucent shell layers cannot accumulate into milky ghosting` — counts
the layers on the real rays (`isEngineeringShellMaterial` + a slab test against emitted instances),
asserts the budget covers the worst measured stack, and asserts the composite alpha clears the
ceiling while the shell stays visible as a ghost.

### 7. Surface correction 4 — TC300 status ring

Ring emissive **0.72 → 1.6**. The ring is a 12 mm border on a 100 mm device: at the lobby/corridor
framings it is far below a pixel, so what the reviewer sees is the ring **blended** with the dark
glass behind it. That blended pixel is what the test scores.

RED: `correction: the TC300 status ring reads as a lit device without inflating the housing` —
derives ring coverage (40.1%) from the **emitted geometry**, blends ring and dark-glass screen
luminance at that coverage, asserts it clears the readability floor, asserts the ring stays blue
(does not burn to white), and asserts the housing keeps its datasheet size with every ring segment
inside the device footprint.

### 8. Surface correction 5 — the endpoint that owns the preset zone

TC300-02 had no chip at `concessions` — but relaxing the cull could not fix it, because **TC300-02
was behind the concessions camera**. The preset looked west from `[7.5, 2.5, 21.4]`; the device sits
at `x = 13.15`, on the east end wall. Composition is this pass's job, so the preset is **mirrored** to
`[-7.5, 2.5, 21.4] → [2, 2.1, 16]` (same fov, same subject distance). TC300-02 now lands at NDC
x = 0.69 with a 47 px chip. `resolveTc300LabelPlacement` also gained a `zoneOwned` path
(`LIGHTING_PRESET_ZONE_OWNER`) so the zone's own endpoint is never culled by distance alone.

RED: `correction: the endpoint owning the active preset zone is labelled at that preset` — for every
preset→zone pair, resolves the owning thermostat's chip and asserts it is visible.
RED: `correction: the reframed concessions preset holds both its service line and TC300-02` — asserts
TC300-02 is in front of the camera and inside the frame margin, **and** that the counter and menu-wall
probe points the surface gate accepted are still framed, so the correction does not trade away the
surface read.

## Gated assertions that had to move

| Test | Was | Now |
|---|---|---|
| `structural attempt 2 raises neutral scene value…` | regex on `HemisphereLight(…1.85)` / `DirectionalLight(…2.35)` | derives the interior neutral floor (ambient+fill+rim) and that the key dominates it |
| `materials realism reset…` | regex on `DirectionalLight(0xb9d8ff, 0.45)` | derives fill < key/3 (a fill, not a second key) |
| `final materials attempt scopes exposure…` | regex on `? 0.82 : 1.05` and the literal key positions | derives grazing exposure < base and the grazing key is lower than the base key |
| `engineering mode makes every registered shell material translucent` | `opacity === 0.18` | `opacity === resolveShellLayerOpacity()`, bounded by the spec single-layer figure |
| `correction 13: engineering contrast…` (×2) | `mediaEmissiveIntensity >= 1.25`; `seatOpacity === 0.07` | media-emission-to-shell-alpha ratio ≥ 5; seats still bleed ≤ half the shell **after** de-ghosting |
| `query state has a stable canonical default` / `…complete engineering inspection state` | serialized string / state object without `light_state` | `light_state` in contract order |

The `>= 1.25` floor is the one that matters: it is the assertion that *froze the defect in place*.
The surface review's own correction 1 ("lower emissive multiplier") supersedes it, so it is now a
relation against the shell it competes with, not a magnitude.

## Not applied — stated plainly

1. **"Tighter bloom" cannot be done: there is no bloom.** The app has no `EffectComposer` /
   `UnrealBloomPass`. The halo the reviewer read as bloom is ACES clipping from a hot emissive under
   an over-bright look-dev rig. I fixed the cause (emissive 1.35 → 0.45, rig 2.35 → 1.5). If the
   gate captures still show a halo, the next lever is exposure, not a bloom radius.
2. **Diagram-board arrowheads** (surface correction 3 in the review: LoRaWAN and Niagara→client edges
   carry no arrowheads) — **not done**. That is board-texture work in `network-schematic.js`, not
   lighting. It remains open against this asset.
3. **TC300 ring "minimum on-screen size floor"** — implemented as emissive strength only, **not** as a
   geometric floor. Growing the ring is device inflation, which `critical_features` forbids
   ("readable at presets, not by inflating device geometry") and which an accepted surface test
   guards. If the ring is still unreadable at lobby framing, the honest fix is the chip, not the ring.
4. **Concessions reframing trades the west end of the service line for the east end.** The old preset
   lost the east end (and its own thermostat); the new one loses the west end. The line is symmetric
   and repeated, and the test pins the menu/counter probes that must survive — but it *is* a
   different picture from the one the surface gate saw.
5. **Interior exposure is unverified.** Dropping the hemisphere (1.85) and the over-driven sun (2.35)
   for the house rig is a large reduction in interior value, absorbed by the RoomEnvironment IBL and
   the emissive channels. WebGL cannot render headless in this environment, so I could not look at
   it. **This is the single biggest risk in this pass** and the `lobby` / `corridor` / `kitchen`
   captures are where it will show.
6. **`tick` is not an implemented query param.** It parses as an unknown token and is ignored (it does
   not invalidate the state). The lighting-camera evidence states carry `tick=0`, which is inert here;
   nothing in this asset animates at this pass.
7. `animation_evidence_ownership.lighting-camera` lists `screen_emission` and `aisle_step_leds` —
   both belong to the auditorium fit-out (asset units 3–5) and do not exist in asset 01.
   `exterior_lights` is covered: the facade word sign is this asset's exterior emission channel and
   `light_state` switches it.

## Files changed

- `src/scene/lighting.js` (new — pass authority)
- `src/scene/runtime.js` (house rig, fog, exposure, baked shadows, `bakeShadows()`)
- `src/scene/materials.js` (media emissive, ring emissive, derived engineering opacity)
- `src/scene/surfaces.js` (media emissive source, dash period, per-medium evidence widening, `zoneOwned` label path)
- `src/scene/architecture.js` (emission channels, `setLightState`, per-medium widening, zone-owner chip, facade sign material)
- `src/controllers/camera.js` (isometric onto the hero band, concessions reframed)
- `src/controllers/query-state.js` (`light_state`)
- `main.js` (`light_state` wiring, shadow bake on caster-visibility changes)
- `index.html` (lights control)
- `tests/lighting-camera.test.mjs` (new — 14 tests)
- `tests/shell.test.mjs`, `tests/materials.test.mjs`, `tests/surface-corrections.test.mjs` (pinned constants → derived properties)

## Capture set the gate needs

`evidence_contract.lighting-camera`, translated to the **implemented** query vocabulary
(`camera=` selects the framing; `view=` is a layer filter and is NOT the preset selector).

Views (spec name → implemented `camera=` token): `neutral`, `grazing`, `reference-match`, `facade`,
`lobby`, `auditorium-corridor` → **`corridor`**, `sala-3`, `complete-network`. All eight already
exist in `CAMERA_PRESETS` / `QA_CAMERA_PRESETS`; none were added.

Three states × eight views = 24 captures:

```
?state=architecture&camera=<view>&light_state=on&tick=0
?state=architecture&camera=<view>&light_state=off&tick=0
?state=engineering&camera=<view>&light_state=on&links=all&tick=0
```

with `<view>` ∈ `neutral | grazing | reference-match | facade | lobby | corridor | sala-3 | complete-network`.

`tick=0` is carried for spec fidelity and is inert (see "Not applied" #6).
