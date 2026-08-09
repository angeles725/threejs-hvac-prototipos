# Block 63 — The automotive family: the four numbers a modeller cannot invent (body envelope, frame section, robot reach, guard height)

> Research of **G75 — AUTOMOTIVE dimensional + construction reference** for the `disenos/catalog/automotriz`
> asset build (RUN 10, continuing the `needs-research` axis opened by [Block 57] for `puertas` and
> [Block 58] for `almacenamiento`). Scope: the four assets `catalog.yaml:122-127` names as prose —
> `carroceria` (body-in-white), `chasis` (rolling ladder frame), `celda-soldadura` (robotic spot-weld
> cell) and `estacion-linea-ensamble` (assembly line station). For each, the block fixes the dimensions a
> preserved primary document actually publishes, and marks explicitly where it does NOT.
> NOT in scope: robot kinematics/IK (that is the `robotica` family's own iteration), paint-shop process,
> or BIW joining metallurgy beyond the geometry that reads on screen.
>
> Sources (all preserved BEFORE citing, `fetch-doc.sh` → `sources/B63-automotriz-dims/` and
> `sources/web-snapshots/`, PDF text layers extracted with `pdftotext -layout` → `sources/extracted/`):
> `abb-irb6700-omnicore-ps.pdf` (ABB *Product specification — IRB 6700*, 3HAC080365-001 Rev. D,
> sha256 `a31dc28b…`) ·
> `volvo-bodybuilder-s7-frame.pdf` (Volvo Trucks North America *Body Builder Instructions, Section 7 —
> Frame*, sha256 `cdd84a5c…`) ·
> `en.wikipedia.org_wiki_Body_in_white.md` · `en.wikipedia.org_wiki_Volkswagen_Golf_Mk8.md` ·
> `en.wikipedia.org_wiki_Vehicle_frame.md` · `en.wikipedia.org_wiki_Spot_welding.md` ·
> `www.axelent.com_en_safety-solutions_protect_machinery-and-robots_machine-guardin.md` · `robot-safety.net_..._safety-fences_.md` ·
> `www.ccohs.ca_oshanswers_ergonomics_conveyor_ergonomics.html.md` ·
> `centralconveyor.com_automotive_skillet-conveyor_.md`.
> One source REJECTED, recorded in §63.8.
> Markers: `[CERT-doc]` preserved manufacturer/OEM document (`sources/...pdf :p.N`) · `[CERT-web]`
> preserved web snapshot · `[CERT]` local primary (`file:line`) · `[CERT-a]` secondary/forum ·
> `[INFER]` deduction.
>
> Domain-reference layer. Same method and same authority ladder as [Block 57]: the catalog families have
> no CAD, so the substitute is the manufacturer datasheet.

---

## 63.1 — What the manifest fixes, and what it leaves to imagination `[CERT]`

`disenos/catalog/catalog.yaml:122-127` specifies the whole family as four prose lines `[CERT]`:

| slug | manifest note | numbers it fixes |
|---|---|---|
| `estacion-linea-ensamble` | "assembly line station: conveyor + jig + tooling" | none |
| `carroceria` | "car body-in-white shell" | none |
| `chasis` | "vehicle chassis / rolling frame" | none |
| `celda-soldadura` | "robotic spot-weld cell" | none |

Four parts lists, zero dimensions. [Block 57 §57.1] already established the consequence: with no number
fixed, a modeller supplies every one from imagination and no gate catches a wrong one. This block supplies
the numbers, and — as importantly — names the ones that stay `[INFER]` so the design-specs cannot claim
`confidence: high` for them.

## 63.2 — `carroceria`: the body envelope is certifiable, the sheet-metal topology is not `[CERT-web]`

**What "body in white" means, verbatim** (`web-snapshots/en.wikipedia.org_wiki_Body_in_white.md:585-590`):
BIW is the stage *"before painting and before the motor, chassis sub-assemblies, or trim (glass, door
locks/handles, seats, upholstery, electronics, etc.)"* have been fitted `[CERT-web]`.

Two modelling consequences, and they are the ones most often got wrong:

- **No glass, no trim, no lamps, no seats.** A BIW with a windscreen in it is not a BIW. The apertures are
  *holes*, and the interior is visible through them.
- **Bare, unpainted sheet steel**, which is why the asset must NOT use the painted-car material read. It is
  a dielectric-free zinc-coated steel surface: mid-grey, moderately rough, low-but-nonzero metalness.

**The envelope.** No manufacturer publishes a BIW drawing, but the finished-car exterior envelope is
published and the BIW sits inside it minus the closures' skin thickness. `Volkswagen Golf Mk8` (C-segment
hatchback, MQB Evo) `[CERT-web]` (`en.wikipedia.org_wiki_Volkswagen_Golf_Mk8.md:416`, infobox):

| Property | Value |
|---|---|
| Length (hatchback) | **4284 mm** |
| Width | **1789 mm** |
| Height (hatchback) | **1456 mm** |
| Wheelbase | **2636 mm** |

`[INFER]` the derived numbers the design-spec must carry as `med`/`low`: front overhang ≈ 0.87 m and rear
overhang ≈ 0.78 m (the 4284 − 2636 = 1648 mm of overhang split ~53/47 for a transverse-front-engine FWD
layout); sill (rocker) height above the floor pan ≈ 0.20 m; roof-rail-to-roof-rail width ≈ 1.25 m (the
greenhouse is markedly narrower than the 1789 mm shoulder line — a BIW modelled as a constant-width box is
the single most recognisable error).

**Certainty discipline for this asset**: `length/width/height/wheelbase` = `high` `[CERT-web]`.
Pillar sections, floor-pan beading, wheel-arch radii, rail cross-sections = `low` `[INFER]`. Nothing in the
corpus fixes them, and the design-spec must say so.

## 63.3 — `chasis`: the one asset with a fully certified cross-section `[CERT-doc]`

This is the strongest evidence in the block. Volvo Trucks North America publishes the frame rail geometry
as a table, verbatim from `sources/B63-automotriz-dims/volvo-bodybuilder-s7-frame.pdf`
(`extracted/volvo-bodybuilder-s7-frame.txt:79-83`):

| Dim | Description | Values published |
|---|---|---|
| A | Frame rail **thickness** | 7 mm (0.28 in) · 8 mm (0.31 in) · 9.5 mm (0.37 in) · 11.1 mm (0.44 in) |
| B | Frame rail **flange** | **90 mm** (3.54 in); 105 mm (4.13 in) on the heaviest section |
| C | **Overall frame width** | **850 mm** (33.46 in) @7 mm · **852 mm** @8 mm · 855 mm @9.5 mm · 848.2 mm @11.1 mm |
| — | Rail **web height** | **266 mm** (VN) · **300 mm** (VN and VHD) (`txt:143-145`) |

So a real ladder frame is: two **C-channel** rails of 300 × 90 mm section in 8 mm plate, held at **852 mm
overall outside-to-outside**, connected by crossmembers — and `en.wikipedia.org_wiki_Vehicle_frame.md:893-898`
confirms the archetype in words: *"Named for its resemblance to a ladder, the ladder frame is one of the
… channels, running the length of the vehicle, connected by several"* crossmembers `[CERT-web]`, with the
rail *"an open-ended cross-section, either C-shaped or hat-shaped (U-shaped)"* (`:684`).

`[CERT-doc]` also: *"Longer wheelbase vehicles may have one or two additional intermediate crossmembers
installed"* (`txt:1517`) — so crossmember COUNT is a function of wheelbase, not a fixed number.

**The trap this closes.** 852 mm is much narrower than the intuition a car silhouette gives. The rails are
*inboard* of the wheels by a wide margin; the axles overhang the frame on both sides. A chassis modelled
with the rails near the tyre plane reads instantly wrong. Frame width : track width ≈ 852 : ~2000 mm.

`[INFER]` for the design-spec at `med`/`low`: wheelbase 4.50 m (a mid VN value, not published as a
nominal); frame top height above ground 0.95 m; tyre outside diameter 1.05 m (315/80R22.5 class); track
2.03 m. All amendable.

## 63.4 — `celda-soldadura`: robot envelope `[CERT-doc]` + guard height `[CERT-web]`

**The robot.** ABB IRB 6700 is the standard large body-shop arm. From
`sources/B63-automotriz-dims/abb-irb6700-omnicore-ps.pdf` (`extracted/...txt:384-402, 428-446, 566-594`):

| Variant | Handling capacity | Reach | Robot weight |
|---|---|---|---|
| **IRB 6700-235/2.65** | **235 kg** | **2.65 m** | **1250 kg** |
| IRB 6700-200/2.60 | 200 kg | 2.60 m | 1205 kg |
| IRB 6700-300/2.70 | 300 kg | 2.70 m | — |
| IRB 6700-150/3.20 | 150 kg | 3.20 m | — |

Axis-1 slewing envelope, same document (`:566-575`) — the numbers that fix how much floor the robot sweeps
even before the arm extends: **radius ax1 front = 532 mm**, **radius ax1 back = 633 mm** (for the
235/2.65, 200/2.60 and most standard variants) `[CERT-doc]`. Base is **floor mounted, no tilt around X or
Y allowed** (`:757-758`) `[CERT-doc]`. The optional **base plate** (`:976-1056`) carries **12 × M24**
fixings inside an ≈800 × 540 mm bolt field `[CERT-doc]`.

**The weld gun.** `web-snapshots/en.wikipedia.org_wiki_Spot_welding.md:600-611` `[CERT-web]` gives the one
distinction that decides the silhouette: the **C-type** gun has **collinear** electrodes (the moving tip
travels along the same axis as the fixed tip) and is used *"due to the high applying forces (e.g. welding
of thick materials)"*; the **X-type** electrodes move on **non-collinear, scissor-like** paths, which is
why *"a dome-shaped electrode tip should be"* used. Both are copper-alloy, water-cooled through *"coolant
holes in the center of the electrodes"* (`:595`), so the gun carries visible hoses and a transformer body —
not a bare fork.

**The guard.** From `web-snapshots/robot-safety.net_..._safety-fences_.md:64-74` `[CERT-web]`, citing
ISO 13857: the minimum height against climbing over is **1400 mm**; in practice robot safety fences are
*"usually 2000 mm high or higher"*; **at 2700 mm the over-reach term disappears entirely**; and the gap at
the **bottom edge of the fence panel shall not exceed 180 mm**. The commercial panel confirms the practical
height: Axelent X-Guard mesh panels are supplied at **2200 mm** height
(`www.axelent.com_en_safety-solutions_protect_machinery-and-robots_machine-guardin.md:328,423`, part numbers `W322-2200xx`) with mesh **Premium 50×20 mm** or
**Classic 50×30 mm**, and *"the Classic 50x30 mesh requires a minimum distance of 200 mm"* (`:220-222`)
`[CERT-web]`.

**Cell sizing `[INFER]`**: two 2.65 m-reach arms facing one fixture need ≈ 2 × 2.65 + fixture width of
clear span; with the 180 mm floor gap and a 2200 mm panel the fence line lands ≈ 1.0 m outside the swept
circle. A 7.2 × 6.0 m fenced footprint with one interlocked access door is the derived cell, and it is
`[INFER]` — no source publishes a cell plan.

**Certainty discipline**: robot reach/payload/mass/ax1 radii and the fence height/gap/mesh = `high`.
Cell footprint, gun body dimensions, fixture geometry = `low`.

## 63.5 — `estacion-linea-ensamble`: the height is an ergonomics number, not a machine number `[CERT-web]`

No conveyor maker publishes a canonical assembly-station height, because the correct height is set by the
task. CCOHS publishes it as a task function
(`web-snapshots/www.ccohs.ca_oshanswers_ergonomics_conveyor_ergonomics.html.md:130-168`) `[CERT-web]`:

| Task | Conveyor height |
|---|---|
| Usable range for most of the workforce | **65–120 cm** |
| Precision work (microelectronics) | 95–120 cm, ideally 5 cm above elbow height |
| **Light work** | **107 cm** (42 in), 5–10 cm below elbow height |
| **Heavy work** (large downward/sideward force) | **91 cm** (36 in), 20–40 cm below elbow |
| Large upward forces (clearing jams) | 81 cm (32 in) |

Also `[CERT-web]` (`:192`): the reaching distance for repetitive movements should stay within **45 cm**
(18 in) — which fixes how close the parts bins sit to the operator, a detail that reads immediately in a
render.

**The carrier.** `web-snapshots/centralconveyor.com_automotive_skillet-conveyor_.md:621-633` `[CERT-web]`:
the **skillet** system is used *"in General Assembly operations"*, the skillets are **platforms that carry
the product AND the operator travels with it**, and an **adjustable-height skillet allows the skillet to be
raised or lowered**. The page names the three General Assembly carrier families: **skillet, skid and
pallet**. That is the vocabulary the asset must read as — a general-assembly station is a *platform*, not a
belt.

**Certainty discipline**: working heights = `high` `[CERT-web]`. Station pitch, skillet plan size, jig and
tooling-post geometry = `low` `[INFER]`; the only anchor is that the platform must clear the 2.6 m
wheelbase / 4.3 m body it carries (§63.2).

## 63.6 — The material read: three surfaces this family needs that the corpus did not yet have `[INFER]`

Derived from HANDBOOK §3.1 by the same reasoning [Block 57 §57.7] used for the gasket:

- **Bare BIW steel** (zinc-coated, unpainted, un-primed): metalness ~0.75, roughness ~0.55. NOT the 0.9/0.30
  brushed-304 read — a BIW is duller and greyer than a stainless worktop, and using the stainless material
  makes it read as a chrome show car.
- **Frame black** (E-coat / chassis paint on the ladder frame): a coated surface → metalness 0.0,
  roughness ~0.60, near-black. Same rule as the painted panel: coated ⇒ dielectric.
- **Guard-fence RAL** (Axelent standard panel colour is **black RAL 9011**, `mesh-panel.md`) → painted
  tube/mesh, metalness 0.0, roughness ~0.65.

## 63.7 — The vertical-subject lighting trap applies to this family too `[CERT]`

[Block 57]'s documented deviation (recorded in `puertas/puerta-cuarto-frio/design-spec.yaml:172-177`
`[CERT]`) said a vertical bare-metal plane reflects the dark horizon and reads flat grey, and the fix is a
fill toward the panel normal plus higher `environmentIntensity` — **never** raised metalness. Three of the
four assets here are dominated by vertical metal: the BIW's flanks, the fence's mesh plane, and the frame
rails' webs. The deviation is expected to recur and must be documented per asset, not silently applied.

## 63.8 — Rejected source, recorded `[CERT-a]`

`https://www.britannica.com/technology/truck-vehicle/Frames` — the search layer surfaced it as the origin of
the "standardized 86 cm (34 in) frame width" claim. **Fetch returned HTTP 403**; the page could not be
preserved. Per the research rule (cite the preserved local file, never the URL), the 86 cm figure is
therefore **NOT used**. §63.3 uses the Volvo body-builder manual's published 850–855 mm instead, which is
both preserved and manufacturer-authoritative — and which happens to corroborate the rejected figure to
within 1%. Recorded so a later reader does not re-fetch it expecting evidence.

## 63.9 — Forward gap

- **G76** — the `automotriz` siblings this block did not need: paint-shop equipment, EV battery-pack tray
  and its assembly fixture, and the tyre/wheel marriage station. Same gap shape, deferred to its own
  iteration.
