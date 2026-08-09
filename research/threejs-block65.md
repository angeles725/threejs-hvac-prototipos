# Block 65 — Platform guard-rails per EN ISO 14122-3, and the token-check that lied in the other direction

> Research of **G70 (continued) — structural mezzanine** for the `disenos/catalog/` build (RUN 10).
> Scope: the guard-rail geometry a raised platform must satisfy. This is the first subject in the
> axis anchored on a **safety STANDARD** rather than a vendor catalogue, which is exactly the
> "different source class" [Block 61] §61.5 said the remaining subjects needed.
>
> It also completes a pair with [Block 64]. That block found a token-check can FALSE-NEGATIVE on
> format; this one found it can **FALSE-POSITIVE on context** (§65.3). Together they define how to
> use the check safely.
>
> Sources (preserved BEFORE citing → `sources/B65-mezzanine-dims/`):
> `gt-eng-guardrails` (GT Engineering, EN ISO 14122-3 CAP 7-8 Guard-rails, last edit 2023-07-26,
> sha256 `33471e1f…`) · `safeway360-14122-3` (sha256 `98e7b2f9…`). Method: HTML tag-stripped before
> reading, then the normative paragraph transcribed. Markers: `[CERT-web]` standards-summary page
> (URL + date 2026-08-08) · `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 58] (DGUV rack geometry — the other standards-derived block).

---

## 65.1 — The guard-rail rules `[CERT-web]`

Verbatim from `sources/B65-mezzanine-dims/gt-eng-guardrails`, EN ISO 14122-3 CAP 7-8:

| Rule | Value |
|---|---|
| Guard-rail REQUIRED when | fall risk from height **higher than 500 mm**, or gap to a neighbouring structure **greater than 180 mm** |
| Guard-rail minimum height | **1100 mm** |
| Toe-plate REQUIRED when | gap between platform and neighbouring structure **greater than 20 mm** |
| Knee rail | maximum distance **500 mm** |
| Vertical uprights (alternative to knee rail) | maximum distance **180 mm** |
| Interrupted guard-rail | clear space between stanchions **between 50 and 120 mm** (50-80 mm at rounded ends) |
| Stair handrail height | **between 900 and 1000 mm** from the nose of the step |
| Handrail diameter | **between 25 and 50 mm**, clear of obstacles within **75 mm** |

Every one of these is a hard geometric constraint, not a preference. The modelling consequences
`[INFER]`:

- A mezzanine deck at any useful height is above 500 mm, so the guard-rail is **not optional**: a
  platform modelled without one is modelling an illegal structure.
- **1100 mm** is the rail height, and the knee rail exists to keep any opening under 500 mm — so
  the correct rail is top rail + knee rail + toe plate, three horizontal elements, not one.
- The **toe plate** triggers at a 20 mm gap, i.e. effectively always on a real deck edge.
- The stair handrail is **900-1000 mm**, LOWER than the platform guard-rail's 1100 mm. Using one
  height for both is the natural error and it is wrong in the standard's own terms.

## 65.2 — What these sources do NOT say `[INFER]`

The search summary that led here asserted two figures that appear in **neither** preserved source in
any format: an intermediate-rail gap of **470 mm** (the standard's own rule is the 500 mm knee-rail
maximum) and a platform load of **2.4 kN/m²** (`2,4 kN` and `2.4 kN` both return zero in both files;
`kN/m` appears once, in unrelated text).

So the deck's structural load rating stays **uncited**. The mezzanine spec will carry guard-rail
geometry at high confidence and say nothing certified about kN/m² — a gap that a real structural
document (not a standards-summary page) would close.

## 65.3 — The token-check can FALSE-POSITIVE on context `[CERT-web]`/`[INFER]`

[Block 64] showed a zero hit-count can be wrong. This block shows a NON-zero one can be worse.

Grepping the raw HTML of these two pages returned what looked like confirmation:

| Token | raw-HTML hits | what they actually were |
|---|---|---|
| `1 100` | 3 (gt) | CSS `linear-gradient` colour stops and SVG path coordinates |
| `0.47` | 9 (gt), 2 (sw) | SVG path coordinates |
| `2.4` | 47 (gt), 5 (sw) | SVG path coordinates |
| `2,4` | 19 (gt), 1 (sw) | idem |

Not one of those hits was the sentence being looked for. A modern page carries thousands of numbers
in `<style>` and `<path d="…">`, so **a bare number will always "appear" in an HTML page** — the
count is meaningless as evidence.

The fix that produced §65.1: strip `<script>`/`<style>`, remove tags, unescape entities, collapse
whitespace, and only then search — and read the surrounding sentence rather than trusting the count.
The single token that survived on raw HTML, `1100 mm` (1 hit), did so because it carried its UNIT;
that is the general defence.

**Combined rule from [Block 64] + this block:** a token-check is only evidence when the token is
distinctive (number **plus unit**, or an exact phrase) AND the haystack is the TEXT, not the markup.
A bare number on raw HTML gives false positives; a unit-bearing number in the wrong format gives
false negatives. Both failures look like a clean result.

## 65.4 — Translation to a design-spec `[INFER]`

`almacenamiento/mezzanine-estructural`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `guardrail_h_m` | 1.10 | high | `[CERT-web]` minimum height |
| `kneerail_max_gap_m` | 0.50 | high | `[CERT-web]` |
| `toeplate_h_m` | 0.10 | med | `[INFER]` — the trigger (20 mm gap) is cited, a height is not |
| `guardrail_required_above_m` | 0.50 | high | `[CERT-web]` |
| `stair_handrail_h_m` | 0.95 | high | `[CERT-web]` inside the 900-1000 band |
| `handrail_dia_m` | 0.040 | high | `[CERT-web]` inside 25-50 mm |
| `deck_udl_kn_m2` | — | **uncited** | §65.2: not in any preserved source |
| `deck_h_m` | 3.00 | low | `[INFER]` clearance under the deck, not from these sources |

## 65.5 — Connections

- **[Block 58]** — the other standards-derived block (DGUV 108-007). Both show that safety
  standards, not vendor catalogues, are what fix the geometry a scene can violate silently.
- **[Block 64]** — the paired methodological finding; §65.3 completes it.
- **G70 remainder** — drive-in racking, security cage and lockers still open; the deck load rating
  needs a structural source.
