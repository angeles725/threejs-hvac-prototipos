# Block 61 — Boltless shelving and the Euro small-load carrier: a refuted premise and a modular chain that ends at the pallet

> Research of **G70 — the remaining `almacenamiento` subjects** for the `disenos/catalog/` build
> (RUN 10, fifth of the dimensional axis). Scope: **boltless / rivet shelving** and the **stackable
> Euro container**. It closes G70 for two of its four subjects; the structural mezzanine and the
> security cage are NOT covered.
>
> This block carries a **refuted premise** (§61.1) — the gap was seeded assuming the container
> standard was EN 13199, and the sources say otherwise. Per the kit's GAP PREMISES ARE HYPOTHESES
> rule, the refutation is written down rather than quietly corrected.
>
> Sources (preserved BEFORE citing → `sources/B61-storage-dims/`):
> `shelving-rivet-specs` (shelving.com boltless guide, sha256 `3e11c91d…`) ·
> `utz-euro-container` (George Utz 600×400×220 product page, sha256 `7adf2760…`) ·
> `wikipedia-euro-container` (sha256 `c274c206…`). Method: source transcription with every
> load-bearing number token-checked against the preserved copy. Markers: `[CERT-web]` official/vendor
> web (URL + date 2026-08-08) · `[CERT-a]` secondary reference · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 58] (the pallet chain closes here) and [Block 60].

---

## 61.1 — REFUTED PREMISE: the standard is VDA 4500, not EN 13199 `[CERT-a]`

The gap was seeded on the assumption that the stackable Euro container is specified by **EN 13199**.
It is not, at least not under that name in any preserved source: the token `EN 13199` appears
**zero** times in `sources/B61-storage-dims/wikipedia-euro-container`, while **`VDA 4500`** appears
and the object is named a **`Kleinladungsträger` (KLT)** — "small load carrier" — with the
photographed example labelled **"R-KLT Euro 600 × 400 mm stackable container"** `[CERT-a]`.

So the correct anchor for this asset is the automotive-industry **VDA 4500 / KLT** family, not a CEN
packaging standard. Naming it EN 13199 in a spec would have been a fabricated citation that no
reviewer could catch without re-reading the source — which is precisely why the premise gets
re-derived instead of inherited.

## 61.2 — The Euro container closes the pallet chain `[CERT-web]`/`[INFER]`

`sources/B61-storage-dims/utz-euro-container` gives the envelope: **600 × 400 × 220 mm**, solid
sidewalls, solid base, two shell handles, stacking `[CERT-web]` (token `600x400x220` appears 9×,
`solid sidewalls` 10×, `stacking` 17× in the preserved copy).

The load-bearing observation is arithmetic and it links three blocks `[INFER]`:

```
EUR pallet [Block 58]        1200 × 800 mm
Euro container                600 × 400 mm
1200 / 600 = 2 · 800 / 400 = 2  →  exactly 4 containers per layer, zero waste
```

That is not a coincidence — it is why the format exists. The catalog's `contenedor-metalico` is
therefore not a free-form bin: it is a **module of the pallet already modelled in `rack-pallet`**,
and the two assets are dimensionally locked together. A tote modelled at an arbitrary size breaks a
relationship the whole storage family depends on `[INFER]`.

Height is the variable, not the footprint: the same 600 × 400 plan exists at 220 mm and, per the
Wikipedia caption, a **tall 280 mm version** `[CERT-a]`. So a stack reads as equal-plan boxes of
possibly different heights `[INFER]`.

## 61.3 — Boltless shelving: a kit of angle posts and rivet beams `[CERT-web]`

From `sources/B61-storage-dims/shelving-rivet-specs` — all tokens verified in the preserved copy:

| Property | Value | Token count in source |
|---|---|---|
| Upright, standard duty | **14-gauge angle posts** | 3 |
| Upright, heavy duty | **1-7/8"** angle posts | 1 |
| Shelf capacity, standard duty | **up to 350 lbs** per shelf | 2 |
| Shelf capacity, heavy duty | **up to 1,500 lbs** per shelf | 4 |
| Beam type | Double Rivet Channel beams (lateral capacity) | 1 |
| Decking | wire decking (among metal / wood / solid steel) | 1 |

The construction rule that matters for geometry: the system is **boltless** — riveted beams lock
into keyholes in the angle posts, so the visible joint is a rivet head entering a slot, not a bolt
head with a nut `[CERT-web]`. The corners are **angle** section (an L, two flanges at 90°), not tube
and not box `[CERT-web]`; that L profile is the silhouette cue separating light shelving from the
pallet racking of [Block 58], whose uprights are 75-120 mm perforated columns `[INFER]`.

A caveat recorded honestly: the guide describes beam FAMILIES and load bands but does not publish a
standard unit's height/width/depth table, nor the shelf adjustment increment. A distributor listing
seen in search gave 1800 × 900 × 400 mm at 100 kg/level and 1½" adjustment, but that page could not
be preserved (the fetch returned 0 bytes and the empty file was deleted rather than left registered
as a phantom source). Those numbers are therefore **not** cited here; the modelled unit sizes are
`[INFER]` inside the certified duty bands.

## 61.4 — Translation to design-specs `[INFER]`

`almacenamiento/contenedor-metalico`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `plan_m` | 0.600 × 0.400 | high | `[CERT-web]` |
| `height_m` | 0.220 (tall variant 0.280) | high | `[CERT-web]` / `[CERT-a]` |
| `standard` | VDA 4500 KLT | high | `[CERT-a]` — NOT EN 13199, see §61.1 |
| `per_pallet_layer` | 4 | high | `[INFER]` arithmetic on two certified footprints |

`almacenamiento/estanteria-industrial`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `post_profile` | angle (L), 14-gauge | high | `[CERT-web]` |
| `levels` | 5 | med | `[INFER]` typical, not published |
| `unit_m` | 1.80 h × 0.90 w × 0.40 d | **low** | `[INFER]` — the page that carried these could not be preserved |
| `capacity_kg` | ~160 (350 lbs) per level | high | `[CERT-web]` standard-duty band |
| `joint` | riveted into keyholes, boltless | high | `[CERT-web]` |

## 61.5 — Self-verify note: this gap's evidence IS nearly exhausted `[INFER]`

`verify-block.sh` computes `[INFER]/[CERT*] = 10/15 = 0.67`. Block **TYPE: EVIDENCE** (source
transcription), so per METHODOLOGY §11 a ratio above ~0.5 is a real signal and not the expected
shape of a design block: **the readily reachable evidence for this gap is close to exhausted.**

That is an accurate reading of what happened. Two of the three sources are vendor/reference pages
rather than technical manuals, the one distributor page that carried a full dimension table could
not be preserved, and no manufacturer publishes a boltless-shelving envelope table in the way
Hörmann publishes sections ([Block 59]) or Shancharm publishes a turnstile envelope ([Block 60]).

Consequence for the backlog: G70's remaining subjects should NOT be attacked with more of the same
web sweeping. They need a different source class — a manufacturer technical manual or a standards
document — and if none is reachable, they fall under the same low-confidence policy the barrier
established in [Block 60].

## 61.6 — Connections

- **[Block 58]** — the pallet. §61.2 closes the chain: container → pallet layer → rack bay, all
  from certified footprints.
- **[Block 60]** — the sibling that recorded an evidence asymmetry; this block records a refuted
  premise and a failed preservation, the same discipline applied to different failure modes.
- **G70 remainder** — structural mezzanine and security cage remain uncovered; the mezzanine in
  particular needs a source with joist depth and handrail heights, which none of the sweeps above
  touched.
