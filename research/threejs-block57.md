# Block 57 — The industrial cold-room door: measured dimensional envelope, hardware vocabulary, and the one number the datasheets refuse to fix

> Research of **G67 — industrial DOOR dimensional + construction reference** for the `disenos/catalog/`
> asset build (RUN 10, new axis). Every prior run in this corpus studied the RENDERER; this one studies
> the SUBJECT being rendered. Scope: the hinged cold-room / freezer door — leaf thickness, maximum leaf
> envelope, frame gauge, hinge / handle / gasket / kick-plate hardware, and the geometric delta between a
> chill door and a freeze door. NOT in scope: the sectional, roll-up and security siblings of the
> `puertas` family (same gap, deferred to their own iteration — see §57.8).
>
> Subject version: DAN-doors A/S product datasheets as published 2026-08-08 (undated documents; identity
> anchored by `sha256`, see `sources/SOURCES.md`).
>
> Sources (all preserved BEFORE citing, `fetch-doc.sh` → `sources/B57-catalog-dims/`, text-layer extracted
> with `extract-pdf.sh` → `sources/extracted/`):
> `dan-doors-MH1001K.pdf` (hinged 100 mm 1-leaf COLD ROOM door, 3 p., sha256 `87cbd42e…`) ·
> `dan-doors-MH1001F.pdf` (hinged 100 mm 1-leaf FREEZE door, 3 p., sha256 `8a1a3f9c…`) ·
> `dan-doors-MH0601K.pdf` (hinged 60 mm 1-leaf CHILL door, 3 p., sha256 `c4f1749e…`) ·
> `https://dan-doors.dk/en/produkt/mh1002k/` (2-leaf 100 mm variant, fetched 2026-08-08) ·
> `https://www.fermod.com/handles-cat8-lp.php` (latch catalogue, fetched 2026-08-08).
> Method: manufacturer-datasheet transcription + one negative web check (§57.6). Markers:
> `[CERT-doc]` preserved manufacturer datasheet (`sources/...pdf :p.N`) · `[CERT-web]` official web
> (URL + date) · `[CERT]` local primary source (`file:line`) · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 29] (HVAC/industrial equipment visualization domain) and
> the `mesa-trabajo` design-spec precedent of CAD-anchored `dimensions_real`.

---

## 57.1 — Why a dimensional block exists at all `[CERT]`/`[INFER]`

`disenos/catalog/catalog.yaml:32` specifies the asset as prose: *"cold-room door: insulated leaf, hinge,
gasket, latch handle"* `[CERT]`. That is a parts list, not a spec — it fixes no number, so a modeller
supplies every dimension from imagination and no gate can catch a wrong one. The corpus already has the
counter-example: `mesa-trabajo/design-spec.yaml:48-49` carries `length_m: 3.00 [CERT] CAD 3.009` because a
CAD block existed to measure `[CERT]`. The catalog families have no CAD; the substitute with comparable
authority is the **manufacturer datasheet**, and this block establishes it. `[INFER]`

The design-spec consequence is concrete: a `dimensions_real` entry may claim `confidence: high` only when a
preserved datasheet fixes that number. Everything else is `med`/`low` and stays amendable.

## 57.2 — The chill-door envelope (MH1001K) `[CERT-doc]`

All values verbatim from `sources/B57-catalog-dims/dan-doors-MH1001K.pdf :p.2`:

| Property | Value | Note |
|---|---|---|
| Leaf insulation thickness | **100 mm** | "100 mm insulation with highly insulating and fire retardant polyisocyanurate foam" (PIR) |
| Maximum leaf width | **1400 mm** | "Maximum width: 1400 mm" — 1-leaf |
| Maximum leaf height | **2500 mm** | "Maximum height: 2500 mm" |
| Frame gauge / material | **1,5 mm stainless steel AISI 304** | "The frame is always insulated" (mineral wool, p.2) |
| Leaf skin gauge | **1 mm** | AISI 304 stainless, or 1 mm galvanized steel, or 1 mm white PVC |
| Hinges | stainless steel, "height and side adjustable … with frictionless bushings" | count not stated |
| Sealing | TPE-rubber or silicone, food-approved | "mounted directly in the frame", tool-free replacement |
| Handles | Fermod **920** (no lock) / **921** (locking); D-handle; DD-grip 1/2/3-point; bow handle | — |

Two of these are load-bearing for modelling and easy to get wrong:

- **The leaf is 100 mm thick and its skin is 1 mm.** A cold-room door is a *slab*, not a panel — the
  silhouette reads as thickness. Modelling it at joinery thickness (~40 mm) destroys the identity `[INFER]`.
- **The frame is stainless and insulated**, so it is visibly thicker than the leaf's own edge and wraps
  the opening; it is not a thin architrave `[CERT-doc]`.

Optional equipment fixes three more geometric features (`:p.3`) `[CERT-doc]`: **window** standard sizes
`150 x 300 mm`, `400 x 600 mm`, `500 x 600 mm` (min. 2-layer thermo glass, anodised-aluminium or stainless
frame); **kick plates** in AISI 304 at "Door width x 300 mm (standard)" and "Door width x 800 mm
(standard)"; and a stainless **doorstep**. The kick-plate rule is the useful one — its width is *derived*
from the door width, so it scales with any leaf size chosen `[CERT-doc]`.

## 57.3 — Freeze vs chill: the geometry actually changes `[CERT-doc]`

`dan-doors-MH1001F.pdf :p.2` is the same 100 mm 1-leaf door rated for freezing, and the delta is not
cosmetic:

| Delta | Freeze door (MH1001F) | Chill door (MH1001K) |
|---|---|---|
| Heating | "Heating cables in both frame and door leaf" | absent |
| Bottom rail | "made of salt water resistant anodised aluminium, which is cast into the floor" | absent (optional doorstep only) |
| Frame options | 1,5 mm AISI 304 **or 2 mm anodised aluminium** | 1,5 mm AISI 304 only |
| Heating spec | 230 V / 50 Hz, "approx. 30 W" per metre of cable | — |

The modelling consequence: a freezer door has a **visible floor rail across the opening**, cast into the
slab; a chill door meets the floor with a gap or an optional step `[INFER]` from the two datasheets. The
MH1001F also notes the rail may be omitted in favour of extra leaf heating cable — so the rail is a
*variant*, correctly modelled as a toggle rather than a fixed feature `[CERT-doc]`.

## 57.4 — Thickness is the product tier, not a free parameter `[CERT-doc]`/`[CERT-web]`

Across the family the envelope stays constant while the insulation steps:

| Model | Leaf | Application | Max W × H |
|---|---|---|---|
| MH0601K | 60 mm | chill | 1400 × 2500 mm `[CERT-doc]` `dan-doors-MH0601K.pdf :p.2` |
| MH1001K | 100 mm | cold room | 1400 × 2500 mm `[CERT-doc]` |
| MH1001F | 100 mm | freeze | 1400 × 2500 mm `[CERT-doc]` |
| MH1002K | 100 mm | cold room, **2-leaf** | 2800 × 2500 mm `[CERT-web]` (dan-doors.dk/en/produkt/mh1002k/, 2026-08-08) |

Note the 2-leaf maximum is exactly **2 × 1400 mm** — the leaf limit is per leaf, and a wide opening is
served by doubling leaves, not by widening one `[INFER]`. Height never moves: **2500 mm is the family
ceiling** across all four models `[CERT-doc]`. That is a real constraint a scene can violate silently.

## 57.5 — Hardware vocabulary `[CERT-doc]`/`[CERT-web]`

The datasheet names the handle by manufacturer part number — **Fermod 920 / 921** `[CERT-doc]` — which is
the industry's default cold-room latch vocabulary. Fermod's own catalogue confirms the product class
("Automatic latches for small overlapping doors", models 790/795, 791/796, 880 series) but publishes **no
dimensions** on the category page `[CERT-web]` (fermod.com/handles-cat8-lp.php, 2026-08-08). The
load-bearing word there is **overlapping**: the latch class is built for a leaf that *overlaps* the frame
face rather than sitting flush inside the reveal `[CERT-web]`. Combined with §57.2's "sealing strips
mounted directly in the frame", the correct construction is: leaf laps over the frame, gasket compressed
between leaf back-face and frame front-face `[INFER]`.

The hinge is described functionally, not dimensionally: "height and side adjustable … frictionless
bushings" `[CERT-doc]`. Hinge COUNT is unstated in all three datasheets — a 2500 mm leaf conventionally
carries 3 `[INFER]`, and that is an inference, not a measurement.

## 57.6 — What the datasheets do NOT fix: the nominal size `[CERT-doc]`/`[INFER]`

Every DAN-doors sheet publishes a **maximum**, never a standard size, and explicitly invites custom
dimensions: "Solutions exceeding the specified maximum dimensions can be custom made" `[CERT-doc]`
(`:p.2`, all three). A targeted web sweep for a published nominal range (Fermod, cold-room suppliers)
returned handle/hinge catalogues and retailer listings, none of them a manufacturer-fixed standard size.

Therefore the honest spec position is:

- `leaf_thickness_m: 0.100` → **confidence high** `[CERT-doc]`
- `max_width_m: 1.40`, `max_height_m: 2.50` → **confidence high** `[CERT-doc]`
- a CHOSEN nominal leaf, e.g. `1.20 × 2.20 m` → **confidence med, `[INFER]`** — inside the certified
  envelope, sized for pallet-truck passage, but not itself a measured value.

This distinction is the whole point of the block. A spec that wrote `width_m: 1.20 confidence: high` would
be claiming evidence that does not exist; the envelope is certified, the nominal is a design decision.

## 57.7 — Translation to a design-spec `[INFER]`

Derived, for `disenos/catalog/puertas/puerta-cuarto-frio/design-spec.yaml`:

| Spec field | Value | Confidence | Evidence |
|---|---|---|---|
| `leaf_thickness_m` | 0.100 | high | `[CERT-doc]` MH1001K :p.2 |
| `leaf_width_m` / `leaf_height_m` | 1.20 / 2.20 | med | `[INFER]` inside the 1.40 × 2.50 max |
| `frame_face_m` | ~0.09 | low | `[INFER]` — insulated stainless frame, gauge certified, face width not published |
| `skin_gauge_m` | 0.001 | high | `[CERT-doc]` "1 mm stainless steel AISI 304" |
| `kick_plate_h_m` | 0.30 (0.80 alt) | high | `[CERT-doc]` MH1001K :p.3 |
| `window_m` | 0.40 × 0.60 | high | `[CERT-doc]` MH1001K :p.3 standard size |
| `hinge_count` | 3 | low | `[INFER]` — unstated in all datasheets |

Materials follow HANDBOOK §3.1's near-binary metalness rule: the AISI 304 skin and frame are bare metal
(metalness 0.9–1.0), while the TPE/silicone gasket is a dielectric (metalness 0.0, high roughness) — the
gasket must NOT inherit the steel material, or the seal line disappears `[INFER]`.

## 57.8 — Connections

- **[Block 29]** — HVAC/industrial equipment visualization domain: this block extends that domain
  vocabulary from machines to building envelope elements.
- **[Block 22]/HANDBOOK §3.1** — near-binary metalness: applied here to separate the stainless skin from
  the rubber gasket.
- **[Block 56]** — the render-on-demand shell every catalog asset is built from; this block supplies the
  numbers that shell renders.
- **G67 remainder** — the sectional, roll-up and security doors of the `puertas` family are the same gap
  at a different subject and need their own preserved sources; they are NOT covered here.
