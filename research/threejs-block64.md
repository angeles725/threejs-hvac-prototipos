# Block 64 — Cantilever racking, and the token-check that almost rejected a good source

> Research of **G70 (continued) — cantilever racking** for the `disenos/catalog/` build (RUN 10).
> Closes the cantilever subject; drive-in racking, mezzanine, security cage and lockers remain open.
>
> **Block number note:** B62/B63 were taken by other families inside the B57-B69 range assigned to
> this session, so this block takes **B64** — the next number actually free on disk at write time.
> Availability is decided by ASSIGNMENT, not by what a branch happens to contain (see §64.4).
>
> Sources (preserved BEFORE citing → `sources/B64-cantilever-dims/`):
> `ntl-cantilever-specs` (NTL Storage cantilever specification page, sha256 `a6d52fbe…`, fetched
> 2026-08-08) · `cogan-cantilever-spec.pdf` (sha256 `575a894a…`) — **REJECTED**, see §64.3.
> Method: page transcription with all eight load-bearing strings token-checked against the preserved
> copy. Markers: `[CERT-web]` vendor specification page (URL + date) · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 58] (the pallet-racking sibling).

---

## 64.1 — The cantilever envelope `[CERT-web]`

All strings below were grep-confirmed present in `sources/B64-cantilever-dims/ntl-cantilever-specs`
(count in brackets):

| Property | Value | Token check |
|---|---|---|
| Arm lengths | **600 · 750 · 900 · 1,000 · 1,200 · 1,500 · 1,800 mm** | `600 mm, 750 mm, 900 mm` [2], `1,200 mm, 1,500 mm` [2] |
| Column profile | **100 × 100 mm to 150 × 150 mm** tube or rolled H-section | `100 x 100 mm` [1], `150 x 150 mm` [1] |
| Base, single-sided | 600-900 mm forward on the load side, back leg 200-400 mm | verified in page text |
| Arm pitch | "Minimum pitch is usually 300 mm" (400 mm more practical) | [1] |
| Deflection limit | L/200 — "should not sag more than 6 mm" on a 1,200 mm arm | [1] |
| Load per arm | **250 · 500 · 750 · 1,000 · 1,500 · 2,000 kg** | `250 kg, 500 kg, 750 kg` [1] |
| Column capacity | "3 tonnes to 12 tonnes" for standard SME spec | [1] |

Three consequences for geometry `[INFER]`:

- **The base is asymmetric.** A single-sided column has a long foot forward under the load
  (600-900 mm) and a short back leg (200-400 mm). Modelling a symmetric cross base is the obvious
  error: the rack would tip under the very loads it exists to carry `[CERT-web]`/`[INFER]`.
- **Arms pitch on a 300 mm ladder**, so arm heights are not free — same discipline as the sectional
  door's standard sections in [Block 59].
- **The column is a 100-150 mm section**, i.e. visibly slimmer than its own arms are long; the
  silhouette is a spine with long horizontal fingers, the opposite proportion to [Block 58]'s
  beam-and-upright rectangle `[INFER]`.

The deflection rule is the one worth showing: an arm is rated *by how much it may sag*, not only by
kilograms. L/200 on a 1,200 mm arm = 6 mm at the tip `[CERT-web]`.

## 64.2 — Why this is not pallet racking with the beams removed `[INFER]`

[Block 58] established selective racking: uprights framing a rectangle, beams spanning between
them, load resting on two beams. Cantilever inverts the load path — the arm is a lever anchored on
one side only, which is why the spec talks about deflection and base leverage rather than beam pairs
and bay widths. A model that reuses the pallet-rack frame and just removes the front upright would
carry the wrong load story `[INFER]`.

## 64.3 — Source REJECTED: a PDF with no readable text `[CERT-web]`

`sources/B64-cantilever-dims/cogan-cantilever-spec.pdf` was preserved as a candidate (a
"Cantilever Rack Specifications" document, which sounded ideal) and then rejected: text-layer
extraction yields **1,369 bytes total** and zero dimension tokens — the content is not in a
readable text layer. It stays on disk, registered, and is cited by no claim. Third rejection in this
axis, after [Block 58] §58.7 and [Block 59] §59.7.

## 64.4 — The methodological finding: a token-check can fail on FORMAT `[INFER]`

This is the part worth carrying forward. The first token sweep of the NTL page searched
`305mm`, `1200mm`, `900mm`, `roll-formed` — **all returned zero**, and the source looked like
another brochure with no substance. It was nearly discarded.

The numbers were there. The page writes them as **`1,200 mm`** — thousands comma, space before the
unit — while the search-result summary that suggested the tokens had written them as `1200mm`. The
grep was correct and the conclusion would have been wrong.

So: **a literal token-check protects against fabricated citations, but it can produce a FALSE
NEGATIVE on formatting alone.** Before concluding "this source does not contain X", vary the format
— thousands separators, spaces before units, hyphenation — or search a distinctive neighbouring
word (`deflection`, `arm`) to prove the section exists at all. A zero hit-count is evidence about
the STRING, not about the FACT.

The related trap, seen the other way round in this same block: the search-result summary quoted
`305mm` column width and `7,470 kg` per bay, and neither string exists in the preserved page in ANY
format. Those two came from other pages the summariser had read. Citing them would have fabricated
evidence — which is exactly what the token-check is for.

## 64.5 — Translation to a design-spec `[INFER]`

`almacenamiento/rack-cantilever`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `arm_len_m` | 1.20 | high | `[CERT-web]` a published length |
| `arm_pitch_m` | 0.40 | high | `[CERT-web]` "400 mm more practical" |
| `column_m` | 0.12 × 0.12 | high | `[CERT-web]` inside 100-150 mm |
| `base_front_m` | 0.80 | high | `[CERT-web]` inside 600-900 mm |
| `base_back_m` | 0.30 | high | `[CERT-web]` inside 200-400 mm |
| `arm_capacity_kg` | 1000 | high | `[CERT-web]` a published rating |
| `deflection_max_m` | 0.006 | high | `[CERT-web]` L/200 at 1.20 m |
| `columns` | 3 | med | `[INFER]` a row needs at least 3, by analogy with DGUV in [Block 58] |
| `column_h_m` | 3.60 | low | `[INFER]` heights not enumerated on the page |

## 64.6 — Self-verify note: one certifiable source, and the ratio says so `[INFER]`

`verify-block.sh` gives `[INFER]/[CERT*] = 9/11 = 0.82`. Block **TYPE: EVIDENCE**, so that is high
and it is honest: after the Cogan rejection this block rests on a SINGLE certifiable source. Every
number in §64.1 is token-checked against that one page, and the [INFER] entries are the geometric
consequences drawn from it, not additional evidence.

Read it as: the cantilever subject is adequately sourced for modelling, but it is NOT corroborated —
a second independent vendor spec would be needed before treating these bands as industry-wide. The
same caveat [Block 61] §61.5 raised for this gap still applies to what remains of it.

## 64.7 — Connections

- **[Block 58]** — the pallet-racking sibling; §64.2 states the load-path difference explicitly.
- **[Block 59]/[Block 61]** — the other rejections; the pattern now has four cases.
- **G70 remainder** — drive-in racking, mezzanine, security cage and lockers are still open.
