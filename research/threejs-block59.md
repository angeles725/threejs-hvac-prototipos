# Block 59 — Sectional and roll-up industrial doors: the leaf is a chain of standard sections, and the box above the opening is a computed dimension

> Research of **G69 — the remaining `puertas` subjects** for the `disenos/catalog/` build (RUN 10,
> sibling of [Block 57] and [Block 58]). Scope: the **sectional overhead door** (panel depth, section
> heights, torsion-spring gear, track applications) and the **roll-up shutter** (lath, guide profiles,
> drum box, install margins). It closes G69 for TWO of its three subjects; the industrial security
> door is RE-SCOPED, not covered — see §59.6.
>
> Subject version: Hörmann industrial sectional doors technical manual, depth 42 mm (issue as
> published at the fetch URL, 2026-08-08) · Angel Mir roller-shutter-doors catalogue (undated).
> Identity anchored by `sha256` in `sources/SOURCES.md`.
>
> Sources (preserved BEFORE citing → `sources/B59-door-dims/`, text-layer extracted →
> `sources/extracted/`): `hoermann-sectional-42mm.pdf` (sha256 `e5bca5fa…`, pp. 1-14 extracted) ·
> `angelmir-roller-shutter.pdf` (sha256 `9996249e…`). Two sources REJECTED, recorded in §59.7.
> Method: manufacturer-manual transcription + one arithmetic reading of an install diagram.
> Markers: `[CERT-doc]` preserved manual (`sources/...pdf :p.N`) · `[CERT]` local primary
> (`file:line`) · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 57] (the hinged-door sibling) and [Block 58].

---

## 59.1 — Why these two doors are not "a door with a different skin" `[INFER]`

[Block 57] established the hinged cold-room door: one rigid leaf on a hinge line. The two subjects
here break that model in the same way — **the leaf is not rigid**. A sectional door is a *chain of
standard-height panels* that articulates around a track; a roll-up shutter is a *curtain of laths*
that coils onto a drum. In both, the geometry that a modeller gets wrong is not the leaf but what
happens ABOVE the opening: the track curve and the drum box. Both manufacturers publish that
region as an install dimension, so it is measurable rather than guessable `[INFER]`.

## 59.2 — Sectional door: the panel is a standard part `[CERT-doc]`

From `sources/B59-door-dims/hoermann-sectional-42mm.pdf` (SPU F42 / APU F42 series):

| Property | Value | Citation |
|---|---|---|
| Panel depth | **42 mm** — double-skinned, PU-foamed, hot-galvanized | `:p.10` "Depth 42 mm", also `:p.13` |
| Section heights | **375 · 500 · 625 · 750 mm** | `:p.10` (625/750) and `:p.13` (375/500) |
| Bottom section | **750 mm standard**, or **1500 mm** | `:p.19-22` APU F42 |
| Material line | "Steel, double-skinned, 42 mm" | `:p.14` |
| Finger trap protection | on ALL door sections | `:p.10`, `:p.13` |
| Glazing infill | clear synthetic double panes, **26 mm (S2)** | `:p.19` |
| Counterbalance | **torsion springs with carrying cables on the side**; ≥ 25,000 closing cycles (tracks N/ND/NS/NK/NA/NH/GD/GS/L/LD), ≥ 50,000 for the rest | `:p.12` |

The load-bearing consequence: **the leaf height is not free**. It is a whole number of standard
sections — e.g. 4 × 500 + 750 bottom, or 5 × 625 — so a modelled sectional door whose panels are an
arbitrary height is wrong in a way a viewer feels without naming `[INFER]`. Panels are **42 mm**
thin, an order thinner than the cold-room leaf's 100 mm `[CERT-doc]`; the horizontal joint line
every 375-750 mm is the identity of the object.

## 59.3 — Track application is the real geometry decision `[CERT-doc]`

Hörmann does not sell "a door"; it sells a door plus a **track application**, and the manual
enumerates them: N (normal), ND (with inclination), NS (double radius 2 × 45°), NK, NA (high-mounted
torsion spring shaft), NH (minimum high-lift), GD, GS, **L / LD (low headroom)**, **H / HA / HU
(high-lift)**, **V / VS / VU / WS / WG (vertical)**, RD / RS / RK `[CERT-doc]` `:p.8-9`, `:p.52-63`.

Two constraints come with them `[CERT-doc]`: most applications are limited to **door height
RM ≤ 5000 mm**, and the vertical family requires **RM ≥ 2200 mm**.

For modelling this collapses to: the track is **horizontal rails at ceiling level + a curved
transition + vertical rails at the jambs**, and the *radius* of that transition is the variable the
application names. The spring shaft sits above the opening (or high-mounted, in NA/HA)
`[CERT-doc]`. A sectional door modelled without the horizontal ceiling rails and the spring shaft
is missing the half of the object that distinguishes it from a flat panel `[INFER]`.

## 59.4 — Roll-up shutter: lath, guide, drum `[CERT-doc]`

From `sources/B59-door-dims/angelmir-roller-shutter.pdf`:

| Property | Value | Citation |
|---|---|---|
| Lath profiles | **80 mm** and **100 mm** — double aluminium, or single micro-perforated | `:p.13` |
| Guide profiles | **G105** and **G135** (the number is the profile width in mm) | `:p.16-17` |
| Guide G105 | G = **55**, J = **110** | `:p.17` guides table |
| Guide G135 | G = **85**, J = **135** | `:p.17` |
| Drum box B | **300** (PS) · **365/435** (small) · **415/485** (medium) · **465/535 mm** (large) | `:p.16` flags table |
| Coil radius R | **320 · 340 · 450 · 500 mm** | `:p.16` |
| Box cover T1/T2 | 390/100 · 470/120 · 575/140 mm | `:p.16` |
| Assembly margins | C1 = 50/70/100 · C2 = 80/150/200 · C3 = 30/50/120 mm | `:p.16` |
| Max size | **5,000 × 5,000 mm**, up to **6,000 × 6,000** on the intensive model | `:p.11`, `:p.12` |
| Manual operation | crank below H = 3000 mm, **chain** at H ≥ 3000 mm | `:p.17` |

## 59.5 — The one equation worth stealing `[CERT-doc]`

The install diagram states it directly: **"Minimum total height = H + B + C1"** `[CERT-doc]`
`:p.16` — the opening height plus the drum-box height plus the top assembly margin. With the small
flag (B = 365, C1 = 70) a 3,000 mm opening needs **3,435 mm** of wall. That is the number a scene
gets wrong when it drops a shutter box onto a wall that has no room for it `[INFER]`.

A second consequence is stated as a rule, not a preference: **doors under 2,500 mm in height must
have the drum cover** ("compulsory for doors lower than 2500 mm in height") `[CERT-doc]` `:p.12`,
and separately "all doors of light height (H) < 2,5 m are supplied compulsory with drum cover"
`:p.16`. So a small shutter is modelled WITH a boxed drum; only a tall one may show the bare coil
`[INFER]`.

## 59.6 — The security door is RE-SCOPED, not covered `[INFER]`

`catalog.yaml:34` asks for an *"industrial security door, steel leaf + frame + push-bar"* `[CERT]`.
A targeted sweep for a manufacturer datasheet carrying leaf gauge, leaf envelope and push-bar
geometry returned panic-hardware catalogues (HEWI EN 1125) and retailer product pages — no
technical sheet with dimensions. Per the kit's SOURCE-BEFORE-AGENT rule a gap with no reachable
certifiable source is not investigable, so this subject does NOT close here: it is registered as
**G71**, blocked-on-thin-source until a real datasheet is preserved.

`tried:` EN 1125 panic-bar catalogues (hardware only, no door envelope) · Strongdor / Security
Direct / Doors4Security product pages (marketing copy, no gauge or leaf table) · the search terms
that worked for [Block 57] (`datasheet` + explicit mm dimensions) returned no manufacturer PDF for
this class. What those sources DO answer is the hardware standard — **EN 1125** is the panic-exit
device norm — which is worth carrying into G71 rather than discarding `[INFER]`.

## 59.7 — Two more sources REJECTED, recorded `[CERT-doc]`

Same discipline as [Block 58] §58.7 — a rejection is only auditable if it is written down:

- `sources/B59-door-dims/hartdoors-roller-shutter.pdf` (2 p., sha256 `6d6e873e…`) — text layer
  extracts cleanly but contains **zero** occurrences of "mm": a photographic leaflet `[CERT-doc]`.
- `sources/B59-door-dims/bifoldrolfe-bfr75.pdf` (sha256 `cb962c98…`) — same, **zero** "mm" hits,
  despite the "75" in the filename suggesting a lath dimension `[CERT-doc]`.

Both are kept on disk, registered in `SOURCES.md`, and cited by no dimensional claim. The pattern
across B58 and B59 is now consistent enough to state: **a door/rack "brochure" is usually not a
dimensional source; the manufacturer's *technical manual* or *install guide* is** `[INFER]`.

## 59.8 — Translation to design-specs `[INFER]`

`puertas/puerta-fabrica-seccional`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `panel_depth_m` | 0.042 | high | `[CERT-doc]` |
| `section_h_m` | 0.500 (bottom 0.750) | high | `[CERT-doc]` standard heights |
| `opening_w_m` / `opening_h_m` | 4.00 / 4.25 | med | `[INFER]` — 7 × 0.500 + 0.750 = 4.25 exactly |
| `max_door_h_m` | 5.00 | high | `[CERT-doc]` RM ≤ 5000 for most track applications |
| `track` | N (normal) | high | `[CERT-doc]` named application |
| `spring_shaft` | above the opening | high | `[CERT-doc]` torsion springs + side carrying cables |
| `glazing_m` | 0.026 double pane | high | `[CERT-doc]` S2 |

`puertas/puerta-enrollable`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `lath_pitch_m` | 0.100 | high | `[CERT-doc]` 80/100 mm range |
| `guide_w_m` | 0.135 | high | `[CERT-doc]` G135 |
| `guide_depth_m` | 0.085 | high | `[CERT-doc]` G135 "G" value |
| `box_b_m` | 0.435 | high | `[CERT-doc]` small flag |
| `coil_r_m` | 0.340 | high | `[CERT-doc]` small flag R |
| `margin_c1_m` | 0.070 | high | `[CERT-doc]` |
| wall height needed | H + B + C1 | high | `[CERT-doc]` the §59.5 equation |

## 59.9 — Connections

- **[Block 57]** — hinged cold-room door; this block is its non-rigid-leaf counterpart.
- **[Block 58]** — the storage sibling; both share the "brochure is not a datasheet" lesson.
- **[Block 56]** — the render-on-demand shell; a sectional door's panel chain and a shutter's coil
  are both animated, so each must hold `needsRender` while moving and release it when settled.
- **G71 (NEW)** — industrial security door, blocked-on-thin-source (§59.6).
