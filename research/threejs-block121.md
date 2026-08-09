# Block 121 — Security door: the evidence, and an honest account of what is NOT available

> Research of **G71 — puertas/puerta-seguridad** for the `disenos/catalog/` build (RUN 12).
>
> **THE ASSET REMAINS BLOCKED.** This block is deliberately evidence-only. It does NOT authorise the
> model, and no `design-spec.yaml` or geometry accompanies it. The blocker is a POLICY decision that
> belongs to the user in this session's own channel: whether to model a datasheet-less asset with all
> confidences at `low` plus a HUD caveat (the precedent `barrera-vehicular` set), or to wait for a
> real manufacturer datasheet. session-A relayed an authorisation for that decision, delegated to it
> by the user; a relayed authorisation is not the user's word in this channel, so the decision is
> still open and the asset is still pending. What follows is the work that does NOT depend on it —
> and which is required either way, since the `G71 blocked-on-thin-source` state exists precisely to
> carry a documented `tried:` list.
>
> **Block number:** B121, the number session-A reserved for this asset in `research/BLOCK-REGISTRY.md`.
>
> Source preserved (`sources/B121-security-door-dims/`):
> `ekin-en1125-vs-en179` (panic-hardware vendor knowledge page, sha256 `94c0311e…`, fetched 2026-08-09).
> Markers: `[CERT-a]` secondary/vendor source · `[INFER]` · **`[UNRESOLVED]`** where two secondary
> sources disagree and no primary text was obtainable.

---

## 121.1 — What IS available, and it is all secondary `[CERT-a]`

The panic hardware is the only part of this door with a public standard behind it: **EN 1125**
(panic exit devices operated by a horizontal bar, for escape routes) and its sibling **EN 179**
(emergency exit devices, lever or pad, for non-public doors where users know the building).
The preserved page names both [23 and 17 occurrences] and the distinction is load-bearing for the
model: EN 1125 is for spaces where users may be UNFAMILIAR, which is what makes the horizontal bar
mandatory rather than a lever.

Token-checked in the preserved copy:

| Property | Value | Token check |
|---|---|---|
| Mounting height of the bar | "900–1100 mm AFF per EN 1125 guidance and manufacturer templates" | [3 occurrences of the range] |
| Device families | Type A push bar · Type B touch bar; classification by a "10-digit" code | `10-digit` [2] · `touch bar` [4] · `push bar` [2] |
| Marking | CE / UKCA under the Construction Products Regulation | verified in page text |

## 121.2 — The one dimensional rule, and it is `[UNRESOLVED]`

The bar length rule is the single geometric requirement that would actually shape this model. **Two
secondary sources give two different numbers, and the primary text was not obtainable:**

- The PRESERVED source says the actuating portion "must extend at least **one-half** of the door leaf
  width—this is why modern touch bars are long" [1].
- A second source (HOPPE, a hardware manufacturer's standards page) appeared in search results
  stating **60%** of the door leaf width. **It could not be preserved: the fetch returned HTTP 403.**
  The zero-byte file was deleted rather than left on disk pretending to be evidence.

So the honest state is: the rule exists and is a percentage of leaf width; the percentage is
**between 50% and 60% depending on which secondary source you believe**, and this block cannot
settle it. EN 1125:2008 itself is a paid standard (BSI / iTeh / ANSI webstore) and was not purchased.

**This is exactly why the asset is blocked, made concrete.** The disagreement is small in
consequence — a bar spanning 50% vs 60% of a 0.9 m leaf differs by 90 mm — but a spec that writes
either number at `high` confidence would be inventing certainty that does not exist in anything on
disk. Under the datasheet-less policy this becomes a `low`/`med` figure with both readings recorded;
without that policy, it is a reason to wait.

## 121.3 — Sources TRIED (the `tried:` list the G71 state requires)

| Source | Outcome |
|---|---|
| EN 1125:2008 full text (BSI / iTeh / ANSI webstore) | **Paywalled.** Not purchased; no primary text obtained. |
| HOPPE BS EN 1125 standards page | **HTTP 403.** Could not be preserved; its 60% figure is therefore uncitable here. |
| Ekin panic-hardware knowledge page | **Preserved.** Mounting height, device families, the one-half rule. |
| Intertek EN 1125 standard summary | Listed in results; scope/testing only, no leaf or gauge dimensions. |
| Vendor product pages (rim panic devices) | Pricing and grades, no leaf dimensions or steel gauges. |

What NO source provides, and what the asset would need: **leaf width and height, sheet gauge, frame
profile, and hinge specification for an industrial security door.** Every search returns panic-hardware
catalogues and retailer listings, never a leaf/gauge table. This is the same shape as the drive-in
lane in [Block 67]: the industry publishes RULES about the hardware and leaves the DOOR configurable.

## 121.4 — If and when the policy is confirmed

The model would be: a steel leaf ~0.9–1.0 m x 2.0–2.1 m in a welded frame `[INFER]`, all such
dimensions at `low` confidence with this `tried:` table quoted in the spec and a "SIN FICHA" line in
the HUD — **except** the panic bar, which can carry `med` confidence citing EN 1125 for its mounting
height of 900–1100 mm AFF, with its LENGTH recorded as `[UNRESOLVED] 50–60% of leaf width` and the
conflict shown on screen rather than silently resolved. That last point is the difference between an
honest datasheet-less asset and a confident-looking guess.
