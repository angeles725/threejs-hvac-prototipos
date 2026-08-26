# COB duct + pipe catalog — CAD requirements

What the catalog must cover, derived from COB's own drawings. Machine-readable companion:
`cob-l4-duct-inventory.json`.

**Sources.** Geometry: `tools/out/L4-full.json` (certified, research repo commit `a29d14d`).
Labels: all `TEXT`/`MTEXT` on `PDF*_Text` across the three level-4 sheets, co-registered to
`L4-full.json meta.sheets`. Layer census: `dwglayers` over all nine COB-IM2 DWGs.

---

## 0. Read this before quoting any number

Size counts differ by a lot depending on **what is counted**, and two teams have already
scoped from different populations without noticing:

| population | what it counts | rect families | 8"x8" |
|---|---|---|---|
| **design intent** (labels) | the `W"xH"` text the engineer wrote | **46** | 87 |
| reconstructed (runs) | sizes on runs the extractor rebuilt | 35 | 74 |

Neither is wrong. They answer different questions. The reconstructed population is a
**subset**: only 420 of 1,591 rectangular runs carry a height, because the rest have none in
the source (the 38.3%-by-length gap). Counting runs therefore **understates** the family set.

> **Build against DESIGN INTENT (46 families).** A catalog is a set of parts the engineer
> can specify, so the right basis is what the drawing calls for — not what our extractor
> managed to reconstruct. Every count below states its denominator.

**The two sets nest, and that settles it.** The 35 run families are a **strict subset** of the
46 label families: every size the extractor reconstructed is label-confirmed, and **zero** run
families lack a label. So the label set is a strict superset with no cost to adopting it.

**11 families exist in the drawing but not in the 35-run ladder.** If judges validate against
the run ladder, a correctly-built part in any of these is failed as an invalid size:

| family | labels | | family | labels |
|---|---|---|---|---|
| **40"x20"** | **7** | | 30"x20" | 1 |
| 34"x24" | 3 | | 69"x26" | 1 |
| 36"x20" | 2 | | 26"x26" | 1 |
| 6"x8" | 2 | | **85"x31"** | 1 |
| 14"x24" | 1 | | **87"x33"** | 1 |
| | | | **88"x20"** | 1 |

Note what is in that list: the four largest ducts on the level (69"x26", 85"x31", 87"x33",
88"x20") and `40"x20"` with seven labels. These are main trunks — exactly the parts a catalog
most needs — and they are missing from the run ladder precisely *because* large trunks are
where heights go unrecorded.

---

## 1. Rectangular ducts — 46 families, 502 labels

Top of the distribution (full set in the JSON):

| family | n | | family | n |
|---|---|---|---|---|
| 8"x8" | 87 | | 12"x12" | 21 |
| 12"x8" | 55 | | 16"x14" | 13 |
| 10"x8" | 54 | | 14"x14" | 11 |
| 14"x12" | 39 | | 60"x20" | 11 |
| 10"x10" | 31 | | … | |
| 12"x10" | 26 | | 42 more | |

Width ladder actually present across **all 1,591** rect runs (width is known even when height
is not): 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 33, 34,
36, 38, 40, 42, 44, 48, 52, 54, 60, 66, 72, 78, 84, 88 inches.

Note the ladder contains **odd and non-standard rungs** (5", 7", 9", 11", 13", 25", 33"). These
are `geom+ladder` snapped values, not label-confirmed sizes — do not build parts for them.
Build from the 46 label-confirmed families.

## 2. Round ducts — effectively ONE size

| dia | labels |
|---|---|
| **6"** | **435** |
| 10" | 7 |
| 8" | 4 |
| 12" | 2 |
| 4" | 1 |

6" is 97% of round. Build 6"Ø as a first-class family; the other four together serve 14 labels
and do not justify a parametric round family.

## 3. Fittings — 1,157 instances, 4 kinds

| kind | n |
|---|---|
| elbow | 684 |
| tee | 217 |
| transition | 188 |
| cross | 68 |

*(Earlier circulated figures of elbow 611 / transition 219 / tee 276 / cross 70 came from the
superseded 2,132-run baseline and should be discarded.)*

## 4. Dampers — only two types occur

23 distinct size combinations across 57 labels: **BD** (balancing, 12 combos) and **FD** (fire,
11 combos). **SD and MD do not appear** as damper types anywhere in the level-4 sheets — `SD`
in this drawing means supply diffuser, not smoke damper. Do not build SD/MD damper parts.

## 5. Terminals — 4 families, 551 instances

**Use the label tags, not `terminals[]`.** Same nesting as the rect families, resolved the same way:

| type | labels (use) | `terminals[]` | meaning |
|---|---|---|---|
| SD | **256** | 249 | supply diffuser |
| LD | **164** | 152 | linear diffuser |
| RR | **86** | 86 | return register |
| CD | **45** | 42 | ceiling diffuser |
| **total** | **551** | 529 | |

`terminals[]` is a **strict subset**: it contains zero instances the labels lack, and drops 22
that they have (`LD-1` ×6, `LD-2` ×6, `SD-1` ×6, `CD-1` ×3, `SD-2` ×1). Plus 90 VAV boxes in
`equipment`.

*(A peer reads SD 257 against this parse's 256 — a one-count regex edge case, not material.
LD, CD and RR agree exactly.)*

## 6. COB's own fitting blocks — use these names

The `M-HVAC-DUCT` legend layer carries the designer's own named blocks, with what appear to be
manufacturer part numbers. This is COB's actual parts list and should drive catalog naming:

- `COMPUERTA RECTANGULAR - Standard-3095176-001 / -002` — rectangular damper
- `CONEXION A RAMAL REDONDA - Standard-3092967-001` — round branch takeoff
- `REDUCCION RECTANGULAR ... LONGITUD - 10 cm` (3093643, 3093738) — reducer, 10 cm body
- `REDUCCION RECTANGULAR ... LONGITUD - 30 cm` (3090626) — reducer, 30 cm body

Two reducer **lengths** (10 cm and 30 cm) are specified. Length is a real catalog parameter
here, not a free variable.

## 7. Pipes — NO COB SOURCE DATA

`dwglayers` over **all nine** COB-IM2 DWGs (levels 2, 3 and 4) returns only:

```
0 · HVAC - Ductos · M-HVAC-DUCT · PDF_Geometry · PDF2/3/4_Geometry ·
PDF*_Solid Fills · PDF*_Text · G-ANNO-TEXT · pie de plano · A-Muros ·
DETALLE FORD_dwg · DEFPOINT
```

**There is no plumbing, piping or tubería layer on any sheet.** The pipe family cannot be
grounded in COB data. It must be derived from a published standard — NPS per ASME B36.10M
(carbon steel) / B36.19M (stainless) — and every pipe component must be labelled
**standard-derived**, never `[CERT]` against this project. If plumbing or process sheets exist
elsewhere in the client set, they are not in the nine files we hold; flag them and we extract.

## 8. Scope consequence

The catalog is finite and small:

- 46 rectangular families + 1 round family (6"Ø)
- 4 fitting kinds
- 2 damper types
- 4 terminal families + VAV
- 2 reducer lengths (10 cm, 30 cm)
- 1 standard-derived NPS pipe family

That is the whole real set. Anything beyond it is invented, and should be justified against a
drawing before it is built.
