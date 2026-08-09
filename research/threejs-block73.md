# Block 73 — The walkie stacker: straddle legs are a dimensional PAIR, and two datasheets can swap the same symbol

> Research of **G74 — walkie-stacker (`apilador`) dimensional envelope** (RUN 11), the gap [Block 72]
> §72.5 opened by REFUSING to author the stacker from distributor pages and a VNA truck of the wrong
> class. This block closes it with a preserved manufacturer type sheet.
>
> Sources (preserved BEFORE citing, `fetch-doc.sh` → `sources/datasheets/`, extracted with
> `extract-pdf.sh`):
> `en-br_msc12-15-sl-a5l1-spec-sheet.pdf` (Yale MSC12-15 SL, pedestrian STRADDLE-LEG stacker,
> 1,200-1,500 kg, sha256 `c8c14f0d…`) · `mpl-series-spec-sheet-rev04-en.pdf` (Yale MP20DL, sha256
> `1debb7c7…` — preserved, then REJECTED for this gap, see §73.4).
> Markers: `[CERT-doc]` preserved datasheet · `[INFER]` deduction.
>
> Block type: **EVIDENCE**. Connects [Block 72] (the gap's origin), [Block 58] (the EUR pallet the
> straddle legs must clear).

---

## 73.1 — The certified envelope `[CERT-doc]`

All values from `sources/datasheets/en-br_msc12-15-sl-a5l1-spec-sheet.pdf` (rows quoted with the
sheet's own numbering):

| Row | Property | Symbol | Value |
|---|---|---|---|
| 1-5 | Load capacity | Q | **1,200 / 1,500 kg** |
| 1-8 | Wheelbase | y | **1,218 mm** |
| 4-1 | Lowered mast height | h1 | **1,520 / 1,770 / 2,020 / 2,170 / 2,270 mm** |
| 4-2 | Lift height | h3 | **2,000 / 2,500 / 3,000 / 3,300 / 3,500 mm** |
| 4-4 | Height of tiller, driving position min./max. | h13 | **910 / 1,290 mm** |
| 4-5 | Height, lowered | h14 | **80 mm** |
| 4-6 | Overall length | l1 | **1,698 mm** (with the standard 1,070 mm fork) |
| 4-8 | Overall width across chassis | b1 | **820 mm** |
| 4-9 | Outer width, straddle | b2 | **1,135 / 1,275 / 1,415 mm** |
| 4-10 | Inner width, straddle | b14 | **985 / 1,125 / 1,265 mm** |
| 4-11 | Fork dimensions | s/e/l | **40 × 100 × 1,070 mm** (1,150 / 1,220 available) |
| 4-13 | Ground clearance, wheelbase centre | m2 | **40 mm** |

## 73.2 — The straddle legs are a PAIR, and the pair is the machine `[CERT-doc]`/`[INFER]`

The sheet publishes outer and inner straddle width as matched options: 1,135/985, 1,275/1,125,
1,415/1,265 `[CERT-doc]`. Every pair differs by exactly **150 mm**, i.e. **75 mm of leg section per
side**, constant across the range. `[INFER]`

That constant is the modelling rule: the legs are ~75 mm wide members, and what the options change is
the CLEAR SPAN between them. The middle option's inner width of 1,125 mm is what lets an 800 × 1,200
EUR pallet ([Block 58]) sit BETWEEN the legs while the forks lift it — the geometric reason a straddle
stacker exists and needs no counterweight. A stacker modelled with legs at a fixed token width, or
with the pallet resting on top of them, misses the machine's entire principle. `[INFER]`

## 73.3 — Mast lowered and lift height are INDEPENDENT option columns `[CERT-doc]`

h1 (1,520-2,270) and h3 (2,000-3,500) are two separate five-value option lists. They are not a single
telescoping ratio: a 3,000 mm lift is available on more than one lowered height depending on mast
build. So a model may pick a pair (this asset uses h1 = 2,020 with h3 = 3,000) but must not compute
one from the other. `[INFER]` from the table's shape.

Contrast with the counterbalance forklift of [Block 72] §72.2, whose sheet gives ONE h1 and ONE h4 per
model — there the pair is fixed, here it is a menu.

## 73.4 — A preserved source REJECTED, and the symbol trap `[CERT-doc]`

Two findings worth more than the numbers:

**Rejected source.** `mpl-series-spec-sheet-rev04-en.pdf` (Yale MP20DL) was fetched and preserved for
this gap, then rejected: row 1-4 reads "Pedestrian", row 4-4 gives **Lift h3 = 560 mm** and there is no
mast-height row at all `[CERT-doc]`. It is a double-decker pallet truck, not a stacker. Kept on disk
for auditability, cited by no dimensional claim — the same discipline [Block 58] applied to the Dexion
brochure.

**The symbol trap.** This sheet labels the TILLER height `h13` (row 4-4) and the LOWERED height `h14`
(row 4-5). The Toyota hand-pallet-truck sheet in [Block 72] §72.3 labels them the other way round:
`h13` = height lowered (85 mm), `h14` = tiller height (1,220 mm). Same two quantities, same two
symbols, swapped between two manufacturers' type sheets. Anyone copying "h13" across datasheets
without reading the row LABEL will put the tiller on the floor or the forks at head height. Trust the
label, not the symbol. `[CERT-doc]`

## 73.5 — What this block does NOT resolve

- **Reach truck.** `catalog.yaml:93` names the asset "walkie stacker / reach truck". These are
  different machines — a reach truck has a pantograph or moving mast and a seated/stand-in operator.
  Only the walkie stacker is covered here; a reach truck would need its own source.
- **Leg height and load-wheel size.** Not published on this sheet; `[INFER]` in the asset.
- **Mast stage count** for a given h1/h3 pair — same limitation as [Block 72] §72.6.

## Connections

- **[Block 72]** — §72.5 opened this gap by refusing to invent the stacker. This block is the payoff
  of that refusal: the real sheet contradicts nothing, but it adds the straddle-pair rule (§73.2) that
  no aggregator page carried.
- **[Block 58]** — the EUR pallet whose 800 mm width the 1,125 mm inner straddle is sized around.
