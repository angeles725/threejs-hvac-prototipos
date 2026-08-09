# Block 101 — CIP skid: two published formats, and the one the envelope can actually hold

> Research of **CIP skid (Clean-In-Place station)** for the `disenos/catalog/proceso/` build.
> Opens the `proceso` block range. Sibling assets already built in this family: mezcladora-industrial,
> tanque-agitador, tolva-dosificador.
>
> **Block number:** B101. Range B100–B119 is assigned to the proceso/fluidos/utilities line and is
> shared by three concurrent sessions, so the number came from **session-A's assignment, not from
> what looked free on disk** — B100 was already consumed by empacadora-flowwrap while nothing of it
> existed in this worktree. Registry updated to "next free B102" in the same commit as this block.
>
> Sources (preserved BEFORE citing, in `sources/B101-cip-dims/`):
> `suncombe.pdf` (Suncombe CIP+Plus Datasheet v4.0, sha256 `97f1e2ab…`) ·
> `alfalaval-din-fittings-tubes.pdf` (`8ea61ff1…`) · `lkh.pdf` (Alfa Laval LKH leaflet ESE00263,
> `7ac4e64b…`) · `lkhman.pdf` (`1946d989…`) · `lkb.pdf` (`de4f687e…`) · `m6.pdf` (`8b707d9e…`) ·
> `promag.pdf` (Endress+Hauser TI01223D, `9220dc08…`) · `sartorius-cip-essential.pdf` (`283826b5…`) ·
> `marlo-cip-skid.pdf` (`8dfa1968…`) · `suncombe-cip-skid-photo.png` (`2e7e3112…`, extracted with
> `pdfimages` from suncombe.pdf and sampled with ImageMagick).
> Markers: `[CERT-doc]` preserved manufacturer document · `[CERT-web]` vendor page/listing ·
> `[CERT-a]` arithmetic on a `[CERT-doc]` number · `[MEAS]` measured from a preserved image ·
> `[INFER]` deduction.

---

## 101.1 — There is no single "CIP skid shape": there are two, and they do not interpolate `[CERT-doc]`

The published envelopes split cleanly into two families, and a model that averages them is wrong in
both directions.

| format | source | L × W × H (m) | H/L |
|---|---|---|---|
| LINEAR, 600 L | Suncombe CIP+Plus | 3.200 × 1.000 × 1.800 | 0.56 |
| LINEAR, 1000 L | Suncombe CIP+Plus | 4.000 × 1.000 × 1.800 | 0.45 |
| LINEAR, 2000 L | Suncombe CIP+Plus | 4.500 × 1.250 × 2.100 | 0.47 |
| LINEAR, 3000 L | Suncombe CIP+Plus | 5.000 × 1.500 × 2.350 | 0.47 |
| LINEAR, 3-tank used unit | Ullmer's #3542 `[CERT-web]` | 3.861 × 0.991 × 2.197 | 0.57 |
| TOWER, 1000 L | Sartorius CIP Essential | 1.250 × 1.250 × 2.217 | ~1.0 |
| TOWER, 2000 L | Sartorius CIP Essential | 1.500 × 1.400 × 2.755 | ~1.0 |
| TOWER, CIP-250 | Marlo `[CERT-doc]` | 2.286 × 1.067 × 2.235 | 0.98 |

The Suncombe table caption states explicitly *"Dimensions with 2 tanks, one chemical and one rinse"*,
which is what makes it usable as a modelling contract rather than a marketing figure.

**Correction to the common assumption:** width is NARROWER than intuition suggests — 1.00–1.25 m up
to the 2000 L class, not 1.5–2 m. A 1.00 m frame is what forces the vessel diameter, and therefore
everything else.

## 101.2 — The 1000 L row does not close, and arithmetic is the only thing that catches it `[CERT-a]`

A linear skid is two-storey: vessels on an upper deck, pumps in a bay underneath. So the height
budget is `deck height + vessel height ≤ published H`. Vessel height is barrel + head + cone.

At 600 L with the largest bore that clears a 1.000 m frame (D = 0.850):

```
barrel      = 0.600 / (π/4 × 0.850²)      = 1.057 m
Klopper head= 0.1935 × 0.850              = 0.164 m   (DIN 28011, carried from tanque-agitador)
15° cone    = (0.850/2) × tan 15°         = 0.114 m
vessel                                     = 1.335 m
deck        = 1.800 − 1.335                = 0.450 m   -> a real pump bay. CLOSES.
```

At 1000 L, the same table publishes the SAME 1.800 m height:

```
barrel at D 0.930 = 1.000 / (π/4 × 0.930²) = 1.472 m
vessel ≈ 1.472 + 0.180 + 0.125             ≈ 1.777 m
deck   = 1.800 − 1.777                     = 0.023 m   -> no bay exists. DOES NOT CLOSE.
```

So the 1000 L row cannot be a two-tank vertical arrangement over a pump bay at 1.800 m; either its
tanks are shorter and fatter than the observed H/D band, or its pumps sit outside the footprint.
**Either way it is not modellable from the published numbers alone, and the 600 L row is.**

This is the house gotcha *"DISPOSICIÓN físicamente imposible pasa sin que nada la detecte"* in its
purest form: a model of the 1000 L row would have rendered cleanly, counted green, screenshotted
fine, and been physically impossible. No gate in this repo can see it. One line of division does.

## 101.3 — EN 10357-A / DIN 11850 Reihe 2 hygienic tube `[CERT-doc]`

From the Alfa Laval hygienic fittings & tubes catalogue (product 5108), which states it supplies
*"EN10357-A which has the same dimensions as former DIN 11850 Reihe 2, and DIN 11866-A"*.

| DN | OD (mm) | ID (mm) | wall (mm) |
|---|---|---|---|
| 25 | 29.00 | 26.00 | 1.50 |
| 32 | 35.00 | 32.00 | 1.50 |
| 40 | 41.00 | 38.00 | 1.50 |
| 50 | 53.00 | 50.00 | 1.50 |
| 65 | 70.00 | 66.00 | 2.00 |
| 80 | 85.00 | 81.00 | 2.00 |
| 100 | 104.00 | 100.00 | 2.00 |
| 125 | 129.00 | 125.00 | 2.00 |
| 150 | 154.00 | 150.00 | 2.00 |

**The catalogue's own warning is the load-bearing part:** *"Nominal size is not always equal to inner
diameter (see DN15, DN25, DN40, DN65 and DN 80)"*. DN65 bores 66 mm; DN80 bores 81 mm. Modelling
DN80 as an 80 mm bore is the easy error. Grades: 1.4301 (304), 1.4307 (304L), 1.4404 (316L).

Independently corroborated: the LKB butterfly-valve leaflet prints the identical OD/ID/wall triples
against its own DN column — two documents from the same maker but different product lines closing
on the same table.

## 101.4 — Velocity is the bridge that sizes the pipe `[CERT-a]`

CIP design targets a minimum **1.5 m/s** (Re ≥ 10 000) to get mechanical scouring, not just
chemical contact — ASME BPE guidance, repeated across industry sources `[CERT-web]`. Applying it to
the bores above:

| DN | flow at 1.5 m/s |
|---|---|
| 50 | 10.6 m³/h = 177 L/min |
| 65 | 18.5 m³/h = 308 L/min |
| 80 | 27.8 m³/h = 464 L/min |

Back-solving Suncombe's PUBLISHED flows against that table closes two independent documents on each
other: 250 L/min (1000 L class) in DN65 = 1.22 m/s; 500 L/min (2000 L class) in DN80 = 1.62 m/s. So
the 1000 L class runs a DN65 main and the 2000 L class a DN80. Scaling to the 600 L class at
~175 L/min gives 1.49 m/s in DN50 — **DN50 is the smallest bore still meeting the velocity floor at
that duty**, so it is the sized main for the modelled unit.

## 101.5 — Surface finish is what justifies roughness 0.30, and it is counter-intuitive `[CERT-doc]`

Sartorius publishes an actual Ra specification: inner surface Ra < 0.8 µm, welded seam area
Ra < 1.6 µm, **outer surface Ra < 1.0 µm**. The outer figure is the one a camera sees. Ullmer's used
unit specifies *"12 Gauge 316 construction, #4 finish inside and out"* `[CERT-web]`.

The trap: **2B mill finish is numerically SMOOTHER than No.4 brushed, yet looks DULLER**, because
No.4 is directionally polished and 2B is not. Ra alone does not predict the render. A CIP skid is
No.4, so it reads satin with a broad soft gradient — not a mirror, and not flat matte grey.

Measured from the preserved product photograph `[MEAS]`, and the spread is the finding:

| region | sRGB | note |
|---|---|---|
| lit tank flank (18×18 crop) | `#C0BCAE` | warm, key-lit |
| whole left-tank block (300×180) | `#D1D0CB`, **sd 45.7**, min 38 max 255 | stainless is a GRADIENT, not a colour |
| cool reflection band | `#9898AB` | bluer than base — environment, not key |
| horizon-side dark band | `#7F7C82` | matches the repo's vertical-subject finding |
| painted pump motor | `#3B4D6A` | two motors sampled within 1 LSB (`#3B4D6A`/`#3C4D6B`) |
| HMI screen face | `#BCD3D8` | |

The sd of 45.7 across a single vessel is the number to design against: a flat-grey tank is not a
lighting near-miss, it is off by the whole spread.

## 101.6 — Component dimensions worth reusing `[CERT-doc]`

- **Pump, Alfa Laval LKH-20** (leaflet states verbatim *"Designed for Cleaning-in-Place (CIP)"*):
  head A 180, B 88, C 27, D 253, E 63 mm; ports J1 suction 63.5, J2 discharge 51 mm; wetted parts
  1.4404 (316L); elastomers EPDM; four adjustable stainless legs. Motor IEC 90: F(max) 262, G 157,
  H 288, I 434 mm. Weight LKH-20 + 4 kW = 77 kg.
- **Butterfly valve, LKB DN50**: A 61.0, C 63.0, E 46.6, F 105.7, H1 52.0, H2 92.0, J 88.0,
  K(handle span) 120.0 mm. DN65: K 162.0 mm. The handle span sets the visual footprint.
- **Flowmeter, Promag H 300 DN50** (3-A + EHEDG): bore 47.5, face-to-face 140, overall stack 309 mm;
  transmitter head 200 × 141 × 59 mm. It is a HEAD on the pipe, not a bulge in it.
- **Plate heat exchanger, Alfa Laval M6**: frame H 0.920, W 0.320, foot 0.140 m; plate-pack length
  0.515–1.430 m; ports EN 1092-1 DN50/DN65 PN16.
- **Heating is not one thing**: plate/frame HX, OR electric immersion 2 × 12 kW (1000 L) / 2 × 18 kW
  (1500–2000 L) per Sartorius, OR steam/hot-water/oil/gas per Suncombe. Marlo lists immersion as an
  option only.
- **Pump count**: Suncombe names a *Variable Duty Delivery Pump* (316L, VSD + PID) plus *Vessel
  Mixing Pumps* — plural, one per tank. The preserved photograph shows FOUR pumps. A "supply pump +
  return pump" model understates a real skid.

## 101.7 — Gaps: what is NOT sourced, recorded so nobody re-derives it as fact

- **G-1 — LKH dimension-letter legend.** The leaflet prints letters A–I against a line drawing with
  no legend, and the drawing is vector art that cannot be read as text. The VALUES are certain to the
  millimetre; WHICH feature each letter measures is `[INFER]`. Only F is anchored: its footnote says
  F *"can be reduced by min. 59 mm"*, and on a pump with adjustable legs the only reducible dimension
  is the shaft centreline height. Anything derived from H or I stays LOW confidence.
- **G-2 — Frame member section.** "Square pipes structure" is published; the section size and wall
  are not. 40×40×3 or 50×50×3 SHS is general knowledge, LOW.
- **G-3 — Return/scavenge pump.** Every source treats it as optional, remote, or replaced by gravity
  drain. No dimension, flow or count published.
- **G-4 — Conductivity/temperature sensor sizes.** Suncombe names "Endress+Hauser / Mettler Toledo
  or equivalent" with no model. Insertion length, boss and head size unsourced.
- **G-5 — Pressure-gauge dial diameter.** Three gauges visible in the photo; no dimension anywhere
  reached. 63 mm or 100 mm is general knowledge.
- **G-6 — Tubular CIP heater.** Plate type (M6) and electric immersion are sourced; no tubular
  heater datasheet was reached.
- **G-7 — Control panel on a CIP skid specifically.** The Rittal figures (760 × 760 × 300, IP66,
  brushed stainless) are a general enclosure catalogue, not "the panel a CIP builder fits". The photo
  suggests ~0.9 × 1.0 m by perspective, but that is an uncalibrated guess on an image with no scale
  reference and is deliberately NOT recorded as a dimension.
- **G-8 — Spray ball / CIP return head.** Named in every description, dimensioned in none reached.
- **G-9 — The photograph is undimensioned and depicts a DIFFERENT unit.** Its proportions
  (H/L ≈ 0.90) contradict the dimension table printed in the same PDF (H/L 0.45 at 1000 L). Excellent
  for part census, arrangement and colour; unusable for dimensions. Treating it as dimensional
  evidence would import a tower silhouette onto a linear envelope.
- **G-10 — Head profile on a CIP tank specifically.** DIN 28011 Klöpper is carried over from
  tanque-pulmon/tanque-agitador, where it was validated on a DIFFERENT vessel. Declared as reuse, held
  at med — not presented as new evidence for this one.

**Evidence verdict:** this asset does NOT fall under the all-low policy. The skid envelope, the DIN
tube table, the LKH pump table, the LKB valve table, the M6 frame, the Promag sensor and the painted
motor colour are genuine manufacturer-document or measured evidence. The weak flank is the
auxiliaries — return pump, instruments, panel, frame section — and those are built LOW with the
attempted sources listed, the same discipline [Block 60] used for the barrier cabinet.
