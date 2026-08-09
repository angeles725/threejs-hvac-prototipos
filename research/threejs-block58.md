# Block 58 — Selective pallet racking: the rack is SHORTER than the pallet, and a single bay is not a legal rack

> Research of **G68 — warehouse STORAGE dimensional reference** for the `disenos/catalog/` asset build
> (RUN 10, sibling of [Block 57]). Scope: selective / adjustable longitudinal-beam pallet racking — rack
> depth against pallet size, beam lengths, beam and upright profile sizes, the system hole pattern,
> compartment-height limits, and the German DGUV safety geometry that constrains what a *valid* rack looks
> like. Anchored on the EUR pallet, because a rack has no dimensions of its own: it is sized by what it
> carries. NOT in scope: the shelving / mezzanine / tote siblings of the `almacenamiento` family (§58.8).
>
> Subject version: SSI SCHÄFER general-catalogue extracts — chapter D (2018/2019, system **PR 350**) and
> chapter C (2022, system **PR 600**). Two DIFFERENT rack systems: figures are attributed per system
> below, never merged.
>
> Sources (preserved BEFORE citing → `sources/B57-catalog-dims/`, text-layer extracted →
> `sources/extracted/`): `ssi-schaefer-pallet-racking-2018.pdf` (24 p., sha256 `04576a0b…`) ·
> `ssi-schaefer-pallet-racking-2022.pdf` (19 p., sha256 `a51d8557…`) · `wikipedia-eur-pallet` (sha256
> `def67cba…`) · `https://www.mecalux.com/warehouse-manual/pallet/euro-pallet` (fetched 2026-08-08,
> preserved as `mecalux-euro-pallet`). Method: manufacturer-catalogue transcription + one arithmetic
> derivation (§58.4) + one REJECTED source (§58.7). Markers: `[CERT-doc]` preserved catalogue
> (`sources/...pdf :p.N`) · `[CERT-web]` official web (URL + date) · `[CERT-a]` secondary source ·
> `[CERT]` local primary (`file:line`) · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 57] (its door sibling, same axis) and [Block 29].

---

## 58.1 — A rack has no dimensions of its own `[CERT-web]`/`[CERT-a]`

`disenos/catalog/catalog.yaml:40` asks for a *"selective pallet racking bay: uprights + beams + wire
decks"* `[CERT]`. Racking is not designed to a round number — it is designed to a **pallet**, so the pallet
is the first certified dimension:

| Property | Value | Evidence |
|---|---|---|
| Standard | **UNE-EN 13698-1** | `[CERT-web]` mecalux.com/warehouse-manual/pallet/euro-pallet, 2026-08-08 |
| Plan size | **800 × 1,200 mm** | `[CERT-web]` idem |
| Height | **144 mm** | `[CERT-a]` `sources/B57-catalog-dims/wikipedia-eur-pallet` ("800 mm × 1200 mm × 144 mm") |
| Own weight | ≈ **25 kg** | `[CERT-web]` mecalux |
| Load | **1.5 t dynamic · 4 t static** | `[CERT-web]` mecalux |

The 144 mm is the one modellers drop. A pallet is a *thick* object — nine blocks and three board layers —
and at 144 mm it is visible under every load in the bay `[CERT-a]`/`[INFER]`.

## 58.2 — The counter-intuitive number: rack depth < pallet depth `[CERT-doc]`

From `sources/B57-catalog-dims/ssi-schaefer-pallet-racking-2018.pdf :p.5` (PR 350), verbatim table:

| Storage direction | Pallet dimensions | Insertion depth | **Rack depth** |
|---|---|---|---|
| in depth | 800 × 1,200 mm | 1,200 mm | **1,050 mm** |
| in depth | 1,000 × 1,200 mm | 1,200 mm | **1,050 mm** |
| in depth | 1,200 × 1,200 mm | 1,200 mm | **1,050 mm** |
| transverse | 800 × 1,200 mm | 800 mm | **850 mm** |
| transverse | 1,000 × 1,200 mm | 1,000 mm | **1,050 mm** |

Read the first row carefully: a 1,200 mm-deep pallet sits on a **1,050 mm-deep** frame. The pallet
**overhangs the rack by 75 mm front and back** `[INFER]` — deliberately, because the load rests on two
beams near the frame faces, not on a shelf. A model built with the frame deeper than the pallet (the
intuitive choice) reads as shelving, not as pallet racking `[INFER]`.

Note the transverse row inverts the intuition again: an 800 mm-deep insertion needs an **850 mm** frame —
here the rack IS deeper than the pallet `[CERT-doc]`. Depth is not a property of the rack; it is a
property of the pallet-orientation pair.

## 58.3 — Beams, uprights, hole pattern `[CERT-doc]`

**Beam lengths** (PR 350, `ssi-schaefer-pallet-racking-2018.pdf :p.5`): **1,800 · 2,200 · 2,700 · 2,900 ·
3,300 · 3,600 · 3,900 mm** `[CERT-doc]` — the order tables list every one of these as a `TRN1-<length>`
part number.

**Beam profile height is the load variable**, and the catalogue prices it explicitly (load per PAIR, at
2,700 mm length) `[CERT-doc]` `:p.5`:

| Profile | Load/pair at 2,700 mm |
|---|---|
| INP 80 | 2,100 kg |
| INP 100 | 3,500 kg |
| INP 120 | 4,500 kg |
| CE 80 | 1,700 kg |
| CE 110 | 3,000 kg |
| CE 140 | 4,300 kg |

The profile number IS the section height in mm `[INFER]` — so a beam is a visible **80–140 mm deep**
horizontal member, not a thin bar. The same INP 100 beam drops from 4,500 kg at 1,800 mm to 2,000 kg at
3,900 mm `[CERT-doc]`, which is why bay width and beam depth are chosen together.

**Uprights** (PR 600, `ssi-schaefer-pallet-racking-2022.pdf :p.4`) `[CERT-doc]`: profile widths **75, 90,
100, 120 mm**; the system offers "4 stand profiles each with 3 frame depths, 10 frame heights, 2 beam
types, 7 bay width"; frame load capacity up to **30,000 kg**, beam load up to **4,500 kg per pair**.

**Hole pattern: 50 : 50 mm** — stated in both systems `[CERT-doc]` (`2018 :p.5` "System hole pattern
50 : 50 mm steps"; `2022 :p.4` "50 : 50 mm"). Beam levels are therefore adjustable on a **50 mm grid**,
which is exactly the pitch a modelled upright perforation should show. Beams connect bolt-free, "with
welded 5-hook rear lips" into the upright `[CERT-doc]` `2018 :p.5`.

**Colour is specified, not free** `[CERT-doc]`: PR 350 support profiles **RAL 7037 dust gray**, beams
**RAL 5010 gentian blue** (`2018 :p.5`); PR 600 frame surface **galvanized**, beam surface **painted
RAL 5010, Gentian Blue** (`2022 :p.4`). Blue beams on grey/galvanized frames is the industry read — a
uniform grey rack is wrong `[INFER]`.

## 58.4 — Why 2,700 mm is the canonical bay `[INFER]`

Three EUR pallets stored in depth occupy 3 × 800 = 2,400 mm of beam. A 2,700 mm beam leaves 300 mm of
clearance distributed across 4 gaps (two ends + two between pallets) = **75 mm each** `[INFER]`. That is
the arithmetic behind "3 europallets per level", and it is consistent with the catalogue's own safety
clause treating a load-carrier gap **below 100 mm** as the case needing back stops `[CERT-doc]`
(`2022 :p.5` §1.3). The derivation is `[INFER]` — the catalogue never prints "3 pallets per bay" — but it
falls out of two certified numbers and gives the model its default: **2,700 mm beam, 3 pallets, 1,050 mm
frame depth**.

## 58.5 — A single bay is not a valid rack `[CERT-doc]`

`ssi-schaefer-pallet-racking-2022.pdf :p.5` reproduces the German **DGUV 108-007** requirements. Several
are pure geometry and directly constrain the asset:

| Rule | Requirement |
|---|---|
| §2.1 Rack rows | "A rack row must consist of **at least 3 rack bays**" |
| §2.2 Beam levels | "There must be **at least 2 beam levels** per rack bay" |
| §2.3 Compartment heights | "must not differ by more than **200 mm**. The maximum compartment height is **2,500 mm**" |
| §1.1 Row end frame | height increase "by at least **500 mm** above the top rack height" |
| §1.2 Passage overhead | "Clear passage height must be at least minimum **2,000 mm**" |
| §1.3 Load-carrier gap | back stops needed inside double-sided racks when the gap is under **100 mm** |
| §1.4 End frames | "Corner protectors must be installed at all free-standing end frames" |
| §2.4 Floor | concrete C20/25 per EN 1992, thickness **200 mm** |

This is the block's sharpest finding for the catalog. `catalog.yaml:40` names the asset a *"bay"*
(singular) `[CERT]`, but a one-bay rack is not a configuration that exists on a real floor `[CERT-doc]`.
The honest resolutions are: model **2–3 bays** so the row reads legally, or keep one bay and label it a
*section cut* of a row. Silently modelling an isolated bay teaches the wrong object `[INFER]`.

Also load-bearing: **≥ 2 beam levels** and **corner protectors at free-standing end frames** — the yellow
corner guard at the foot of an aisle-end upright is not decoration, it is required `[CERT-doc]`.

`catalog.yaml:40`'s "wire decks" are grounded too: §1.6 requires "front-to-back supports, chipboards, mesh
grates or similar" whenever load-carrier skids run parallel to the beams rather than resting on them
`[CERT-doc]` — i.e. the mesh deck is the fix for a specific support geometry, not a default `[INFER]`.

## 58.6 — Translation to a design-spec `[INFER]`

For `disenos/catalog/almacenamiento/rack-pallet/design-spec.yaml`:

| Spec field | Value | Confidence | Evidence |
|---|---|---|---|
| `bay_width_m` (beam length) | 2.70 | high | `[CERT-doc]` catalogue beam length |
| `frame_depth_m` | 1.05 | high | `[CERT-doc]` rack depth for 800×1200 in depth |
| `upright_width_m` | 0.090 | high | `[CERT-doc]` PR 600 profile widths |
| `beam_height_m` | 0.110 | high | `[CERT-doc]` CE 110 profile |
| `hole_pitch_m` | 0.050 | high | `[CERT-doc]` 50 : 50 system pattern |
| `level_clear_h_m` | 1.60 | med | `[INFER]` — under the 2,500 mm compartment maximum |
| `bays` | 3 | high | `[CERT-doc]` DGUV §2.1 minimum row |
| `levels` | 3 | high | `[CERT-doc]` DGUV §2.2 minimum 2 |
| `pallet_m` | 1.20 × 0.80 × 0.144 | high | `[CERT-web]`/`[CERT-a]` EN 13698-1 |
| `frame_height_m` | 6.00 | low | `[INFER]` — "10 frame heights" exist, none enumerated in the extract |

Colours: beams `RAL 5010` gentian blue, uprights galvanized/`RAL 7037` dust grey `[CERT-doc]`. Per
HANDBOOK §3.1 both are bare/coated STEEL — galvanized uprights are metalness 0.9–1.0, while the painted
blue beam is a coated dielectric (metalness ≈ 0.0) `[INFER]`. Painting the beams as metal-blue is the
predictable material error here.

## 58.7 — One source REJECTED, and why it is recorded `[CERT-doc]`

`sources/B57-catalog-dims/dexion-p90-silverline.pdf` (8 p., sha256 `e8fe6987…`) was preserved as a
candidate and then **rejected**: its text layer contains exactly **one** occurrence of the token "mm"
across all 8 pages — it is a photographic brochure, not a dimensional catalogue `[CERT-doc]`. It is kept
on disk and registered so the rejection is auditable, and it is cited by no dimensional claim in this
block. `tried:` DirectIndustry mirror and the Constructor-group product catalogue surfaced the same
brochure family; the SSI SCHÄFER chapter extracts were the ones carrying order tables.

## 58.8 — Connections

- **[Block 57]** — the door half of RUN 10; same axis, same discipline (certified envelope, honest
  `[INFER]` for anything the datasheet leaves open).
- **[Block 29]** — industrial equipment visualization domain.
- **[Block 56]** — the render-on-demand shell the asset is built on; a 3-bay × 3-level rack is the first
  catalog asset with real repetition, so it is also the first genuine `InstancedMesh` candidate under the
  [Block 54] low-repetition caveat `[INFER]`.
- **G68 remainder** — boltless shelving, structural mezzanine and the stackable tote are the same gap at
  different subjects and need their own preserved sources; NOT covered here.
