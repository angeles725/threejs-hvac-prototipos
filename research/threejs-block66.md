# Block 66 — Steel lockers per BS 4680:1996: a size ladder and three derived-dimension rules

> Research of **G70 (continued) — lockers** for the `disenos/catalog/` build (RUN 10). Closes the
> locker subject. Best-sourced storage subject so far: a manufacturer handbook that reproduces the
> BRITISH STANDARD it conforms to, so the size ladder is normative rather than commercial.
>
> Sources (preserved BEFORE citing → `sources/B66-locker-dims/`):
> `link51-locker-handbook.pdf` (Link 51 Standard Steel Locker Product Handbook, issue 1.18,
> sha256 `8a6fab11…`, 65 "mm" tokens, text-layer extracted). Method: PDF → page-anchored Markdown,
> every load-bearing string token-checked against the extract. Markers: `[CERT-doc]` preserved
> manufacturer handbook · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 65] (the other standards-derived block in this family).

---

## 66.1 — The normative size ladder `[CERT-doc]`

The handbook states its lockers "have been tested and conform to the requirements of the British
Standard for Clothes Lockers **BS 4680:1996** 'Standard Duty'" [2 hits] and reproduces the standard's
dimensional clause:

| Rule (BS 4680:1996) | Value | Token check |
|---|---|---|
| Widths | **225 / 300 / 380 / 450 mm** | `225/300/380/450` [1] |
| Depths | **300 / 380 / 450 mm** | `300/380/450` [1] |
| Height, excluding legs | **"in the region of 1700mm to 1850mm"** | [1] |
| Minimum internal clear height of any compartment | **200 mm** | full sentence [1] |

So a locker's plan is not a free choice: it comes off a four-by-three ladder. Modelling a
250 × 400 mm locker invents a size the standard does not list `[INFER]`.

## 66.2 — The three derived-dimension rules — the part worth stealing `[CERT-doc]`

The handbook publishes the relationship between outside and inside, which is exactly what a modeller
needs and almost never has:

| Derived dimension | Rule | Token check |
|---|---|---|
| Internal width | **overall width − 3 mm** | `overall width -3mm` [3] |
| Clear opening | **overall width − 50 mm** | `overall width -50mm` [3] |
| Internal depth | **overall depth − 21 mm** | `overall depth -21mm` [4] |

The 50 mm is the load-bearing one `[INFER]`: the door aperture is **47 mm narrower than the
interior**, because the frame returns around the opening. A locker modelled as a plain box with a
full-width door front is wrong in a way that reads immediately — real lockers have a visible frame
margin down each side of the door.

Nesting is a first-class concept, not a repeat: the handbook lists **Initial / Nest 2 / Nest 3 /
Nest 4 / Nest 5** as availability columns, with example weights for a 300 × 450 body of
**6 / 13 / 19 / 26 / 32 kg** [1]. The increments (7, 6, 7, 6 kg) are smaller than the initial unit
because a nest **shares side panels** between adjacent bays `[INFER]` — which is why a nest of 3 is
not three separate lockers pushed together, and why its overall width is less than 3 × the single
width.

## 66.3 — Compartment figures are per-CONFIGURATION, not universal `[CERT-doc]`

The handbook gives compartment heights per product variant, e.g. a 1800 × 450 × 450 divided locker
whose hanging compartment clear height is 1405 mm, top compartment 329 mm (268 mm clear), right
base compartment 569 mm (549 mm clear); another variant lists compartment height 507 mm with 420 mm
clear, and another a 827 mm compartment opening `[CERT-doc]`.

These are NOT a single set to copy: they belong to specific configurations. The generalisable facts
are §66.1's ladder, §66.2's three rules, and the 200 mm minimum clear height. A spec that quoted
"compartment = 827 mm" as if universal would be over-reading the source `[INFER]`.

## 66.4 — Method note: this time the miss was WORDING, not format `[INFER]`

Completing the pair from [Block 64] (format) and [Block 65] (context), the first token sweep here
searched `minus 3mm`, `minus 50mm`, `minus 21mm` — all zero. The handbook writes them as
`overall width -3mm`: not a different number format but a different **wording** of the same fact.

So the failure mode generalises past formatting: **a token-check tests a phrasing hypothesis.** Zero
hits mean "not phrased that way", never "not there". The reliable probe is the most distinctive
SHORT fragment — here `-3mm` or `-21mm`, which are unusual enough to be near-unique and short enough
to survive rewording.

## 66.5 — Translation to a design-spec `[INFER]`

`almacenamiento/lockers`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `height_m` | 1.80 | high | `[CERT-doc]` inside the 1700-1850 band |
| `width_m` | 0.300 | high | `[CERT-doc]` a ladder width |
| `depth_m` | 0.450 | high | `[CERT-doc]` a ladder depth |
| `internal_w_m` | width − 0.003 | high | `[CERT-doc]` |
| `clear_opening_m` | width − 0.050 | high | `[CERT-doc]` |
| `internal_d_m` | depth − 0.021 | high | `[CERT-doc]` |
| `nest` | 3 | high | `[CERT-doc]` a listed availability |
| `min_compartment_clear_h_m` | 0.200 | high | `[CERT-doc]` BS 4680 |
| `standard` | BS 4680:1996 Standard Duty | high | `[CERT-doc]` |
| `tiers` | 2 | med | `[INFER]` a common configuration, not a universal |

## 66.6 — Connections

- **[Block 65]** — the other standards-derived block; both show a standard fixes geometry a
  catalogue only illustrates.
- **[Block 64]/[Block 65]** — the token-check pair; §66.4 adds the third failure mode (wording).
- **G70 remainder** — drive-in racking and the security cage remain open.
