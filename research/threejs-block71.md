# Block 71 — Conveyor dimensional reference: the three conveyors are three different measuring systems, and the belt is sized by its rollers

> Research of **G71 — CONVEYOR dimensional reference** for the `disenos/catalog/transporte` build (RUN 11,
> same axis as [Block 57]/[Block 58]: measure the SUBJECT, not the renderer). Scope: the three conveyor
> assets — `banda-rodillos` (roller conveyor), `banda-cinta` (belt conveyor), `transportador-cadena`
> (chain/slat conveyor). NOT in scope: the vehicles and the overhead crane of the same family (G72).
>
> Sources (all preserved BEFORE citing, `fetch-doc.sh` → `sources/datasheets/`; text-layer extracted with
> `extract-pdf.sh` / `pdftotext` — no OCR needed, every PDF carries a text layer):
> `E24.pdf` (Hytrol 24 V motor-driven-roller family, 2 p., sha256 `f863b551…`) ·
> `BULK_HANDLING_CATALOGUE_GB_01_2019_10_ed.pdf` (Rulmeca bulk handling, 10th ed. 2019, 318 p.,
> sha256 `25ada83f…`) · `sedis-conveyor-chains-catalogue.pdf` (Sedis conveyor chains, sha256 `3827cdbe…`) ·
> `idl_001-11_idler_catalog_web.pdf` (PPI idler catalogue, 64 p., sha256 `070bfde9…` — CEMA B/C/D/E series,
> preserved for the imperial cross-reference, cited by no dimensional claim here).
> Markers: `[CERT-doc]` preserved catalogue (`sources/...pdf :p.N`) · `[CERT]` local primary (`file:line`) ·
> `[CERT-a]` secondary/aggregator · `[INFER]` deduction.
>
> Block type: **EVIDENCE**. Connects [Block 58] (the EUR pallet that sizes anything carrying pallets),
> [Block 70] (how the surface these dimensions describe is animated), [Block 57] (the datasheet discipline).

---

## 71.1 — The finding that reorganises the family: three conveyors, three measuring systems `[CERT-doc]`/`[INFER]`

`catalog.yaml:87-89` groups the three conveyors as one sub-family `[CERT]`. Their catalogues do not. Each
is dimensioned by a different primary quantity, and using the wrong one produces a model that is
plausible everywhere and correct nowhere:

| Asset | Sized by | Standard series lives in |
|---|---|---|
| `banda-rodillos` | the ROLLER (diameter + centre-to-centre pitch); the frame follows | unit-handling catalogues, imperial-rooted (1.9″ roller, 3″ centres) |
| `banda-cinta` | the BELT WIDTH; roller diameter and station pitch are then *selected from it* | bulk-handling catalogues, metric (500/650/800/1000 mm) |
| `transportador-cadena` | the CHAIN PITCH; slats attach to it every N pitches | conveyor-chain catalogues, ISO 1977 metric preferred numbers |

A modeller who picks "a nice roller size" for a belt conveyor, or a smooth belt for a chain conveyor, has
not made a small error — they have modelled the wrong machine. `[INFER]`

## 71.2 — Roller conveyor: the roller is 1.9″ and the pitch is 3″ `[CERT-doc]`

From `sources/datasheets/E24.pdf :p.1` (Hytrol 190-E24, a 24 V motor-driven-roller live conveyor):

| Property | Value | Metric |
|---|---|---|
| Tread roller | **1.9″ diameter × 16 ga.** | 48.3 mm Ø |
| Roller centres (pitch) | **3″** | 76.2 mm |
| Max load | **37 lbs per foot**, 75 lbs per E24 motor | 55 kg/m |
| Tapered curve rollers | 2.5″ tapering to 1 11/16″ × 16 ga. | 63.5 → 42.9 mm |

and from `:p.2`:

| Property | Value | Metric |
|---|---|---|
| Accumulation zone lengths | **18″, 24″, 30″ or 36″** | 457 / 610 / 762 / 914 mm |
| Conveying speed | **25–174 FPM** | 0.13–0.88 m/s |
| Curve zoning | 30° and 45° curves = 1 zone; 60° and 90° curves = **2 zones** | — |
| Alternative centres (199-CRE24EZ) | **4″ or 6″** | 101.6 / 152.4 mm |

Three consequences for the model. (a) The pitch-to-diameter ratio is ~1.58 — the rollers are visibly
SEPARATED, not touching; a model with rollers packed edge to edge reads as a table, not a conveyor.
(b) A powered zone is 0.46–0.91 m long, so a credible section is a small number of zones, and the drive
rollers are a MINORITY of the rollers — most are idle tread rollers. (c) A curve is zoned, so a 90°
curve is two driven segments, not one. `[INFER]` from the values above.

## 71.3 — Belt conveyor: belt width first, everything else selected from it `[CERT-doc]`

The bulk-handling catalogue inverts the order — the belt width is the input, the roller is an output.

**Roller diameter series** (`sources/datasheets/BULK_HANDLING_CATALOGUE_GB_01_2019_10_ed.pdf :p.50`,
Tab. 15): **50, 63, 76, 89, 102, 108, 133, 159, 194 mm**, each with a maximum rpm (573, 606, 628, 644,
655, 707, 718, 720, 689 respectively). `[CERT-doc]`

**Belt width → advised roller diameter** (same page, Tab. 16, "Roller diameter advised"): belt widths
**500, 650, 800, 1000 mm** … each mapped to a Ø for three speed bands (≤ 2 m/s, 2–4 m/s, ≥ 4 m/s) —
500 mm → 89 mm; 650 mm → 89, then 108 in the faster band; 800 mm → 89 / 108 / 133. `[CERT-doc]`
The rule the table encodes: **wider and faster ⇒ fatter roller**.

**Station pitch** (`:p.35`, Tab. 6): *"The trough set pitch a₀ most commonly used for the upper strand of
a belt conveyor is 1 metre, whilst for the return strand the sets are pitched normally at 3 metres (aᵤ)"*
`[CERT-doc]`. Two constraints ride with it: belt deflection between consecutive carrying sets must not
exceed **2 % of the pitch**, and at loading points the pitch is **halved or less**. `[CERT-doc]`

**Trough angle** (`:p.30-31`): the loaded-volume tables are built on trough angle **λ = 20° and 30°**,
crossed with a surcharge angle **β = 5°, 10°, 20°** `[CERT-doc]`. (The 35°/45° angles common in
North-American CEMA practice are a different series; the preserved PPI CEMA catalogue is on disk for that
cross-reference but is not the metric authority this family uses.) `[INFER]`

The modelling consequence is a 3:1 asymmetry that is instantly readable and almost always modelled wrong:
**the return strand has one third the idler stations of the carrying strand.** A belt conveyor with
matching top and bottom roller counts is wrong on its most visible repetition.

## 71.4 — Chain conveyor: ISO 1977, not ISO 606 — and the pitch is a preferred-number series `[CERT-doc]`

A conveyor chain is not a scaled-up transmission roller chain. `sources/datasheets/sedis-conveyor-chains-catalogue.pdf :p.12-15`
states the range *"conform to ISO 1977 standard … based on the minimum tensile strength, the pitch"*
`[CERT-doc]` — ISO 1977 is the conveyor-chain standard; ISO 606 covers transmission roller chain, whose
pitches (6–76.2 mm) are an order of magnitude below what a slat conveyor uses.

**Pitch series** (`:p.15` and the per-series pages): **40, 53, 63, 80, 100, 125, 160, 200, 250, 315, 400,
500 mm**, each chain series offering a contiguous window of it (e.g. `40*/53/63/80/100/125/160`, then
`63*/80/100/125/160/200/250`, then `80/100/125/160/200/250/315`, up to `100*/125/160/200/250/315/400/500`).
`[CERT-doc]` This is a Renard-style preferred-number series, so a modelled pitch of, say, 90 mm is not a
value any catalogue offers. The catalogue also notes *"their pitch, which is generally considerable, is
not unique but can be chosen from a wide range"* (`:p.12`) `[CERT-doc]`, and gives sprocket wheels with
flanges at, e.g., a 200 mm pitch `[CERT-doc]`.

Modelling consequence: at a 100–200 mm chain pitch, individual links are **large enough to read at
inspection distance**, so a chain conveyor cannot be faked with the same scrolling-texture trick a belt
can ([Block 70] §70.7 flagged this). The honest options are a slat surface whose slats sit every N
pitches, or an accepted simplification stated in the design-spec.

## 71.5 — What this block does NOT resolve

- **Working height.** No preserved source in this set fixes the top-of-roller height. Manufacturer leg
  ranges (~750–1035 mm) and ergonomic practice (850–900 mm) circulate widely but were only found on
  aggregator pages `[CERT-a]`; treated as `[INFER]`/med, never `high`, in any design-spec until a
  datasheet fixes it.
- **Frame profile section.** Hytrol's 6.5″/8.5″ RSH/RSL channel depths were reported by the discovery
  sweep from a PDF that was NOT preserved, so they are not cited here. The frame section is `[INFER]`.
- **Between-frame width series for unit handling.** The metric widths above are BELT widths from the bulk
  catalogue; the unit-handling BF series (300…1250 mm) came from an unpreserved manufacturer page and is
  deliberately not asserted.
- **Belt thickness / carcass.** Not in the preserved set.

## 71.6 — Correction of a discovery-sweep claim `[CERT-doc]`

The web sweep that seeded this block reported chain pitches as an **ISO 606** series (04B–48B,
6–76.2 mm). The preserved primary source contradicts it for this application: conveyor chains are
**ISO 1977**, with pitches an order of magnitude larger (40–500 mm). The sweep's numbers are not wrong
about ISO 606 — they are about the wrong standard for a slat conveyor. Recorded here per the kit's
verify-before-acting rule; no block ever asserted the ISO 606 version.

## Connections

- **[Block 58]** — the EUR pallet (800 × 1,200 mm). A pallet-grade roller conveyor must be wider than
  800 mm between frames and its rollers rated per pallet, which is why pallet lines use 60–89 mm rollers
  and 100–200 mm pitches rather than the 48.3 mm / 76.2 mm carton geometry of §71.2.
- **[Block 70]** — the animation technique. §71.4's chain-pitch finding is what bounds it: a texture
  scroll is honest for a belt, and a simplification for a chain.
- **[Block 57]** — same evidence discipline: a `dimensions_real` entry claims `confidence: high` only
  where a preserved catalogue fixes the number.
