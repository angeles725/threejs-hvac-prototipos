# Block 69 — Cantilever sliding gate: the half of the gate that is NOT the gate

> Research of **G74 — portón corredizo (cantilever sliding gate)** for the `disenos/catalog/` build
> (RUN 12). Continues the `puertas` line: [Block 57] cold-room door, [Block 59] sectional + roll-up,
> [Block 60] access control. Remaining open in this family after this block: `esclusa-personal`, and
> `puerta-seguridad` (blocked on a thin source, awaiting the user).
>
> **Block number:** B69 — the LAST number of the range B57–B69 assigned to this session. An extension
> was requested from session-A BEFORE writing, not after, because availability is decided by
> assignment in `research/BLOCK-REGISTRY.md` and not by what happens to look free on disk.
>
> Sources (preserved BEFORE citing → `sources/B69-gate-dims/`):
> `hoover-cantilever-gate-installation.pdf` (Hoover Fence chain-link cantilever gate installation
> manual, sha256 `1c4971ef…`, fetched 2026-08-09) — IMPERIAL, US · `quiko-cantilever-guide` (Quiko,
> cantilever sliding gate installation & design guide, sha256 `4df67dd4…`) — METRIC, European.
> Method: `pdftotext -layout` + tag-stripped transcription with invisible characters normalised
> (block67 §67.4); load-bearing strings token-checked, counts in brackets.
> Markers: `[CERT-doc]` preserved document · `[CERT-web]` vendor guide · `[INFER]` deduction.
>
> **Why two sources and not one.** The imperial manual is the one that explains the MECHANISM and
> gives the sizing ladder; the metric guide is the one whose numbers transfer to a EUR-scale asset.
> Using only the US manual would repeat the mistake block67 §67.1 caught with the drive-in racking —
> a North-American page in feet does not size a European gate. Using only the metric guide would
> lose the rule that actually shapes the model (§69.2).

---

## 69.1 — A cantilever gate does not touch the ground, and that is the whole product `[CERT-doc]`

The manual defines the competing product in one sentence, and it is the definition a modeller
usually builds by accident:

> "These type gates have a track in the gate opening and/or a leading edge wheel attached to the
> latch side of the gate which rides on the ground." [1]

That is a ROLLING gate. A cantilever gate has neither: no track across the opening, no ground wheel.
Its weight is carried entirely by carriages set to one side, which is why the opening can be crossed
by a vehicle without a rail in the road, and why the gate keeps working when the opening floods,
ices or fills with gravel. Model a wheel under the leading edge and the asset silently becomes a
different product with different economics.

The metric guide states the modern arrangement `[CERT-web]`: the panel's weight is distributed
"across precision-engineered carriages anchored to reinforced concrete" foundations; the rail is
"weld[ed] to gate frame's lower structural member" [1] and the carriage rollers run inside it.
(The imperial manual describes the OLDER variant — "a track which is mounted near the top of the
gate between roller posts" [1] with "guide rollers mounted to the bottom of the roller posts" [1].
Both are cantilever gates; this asset models the bottom-rail-on-carriages arrangement, which is what
a European yard installs today. Recording the distinction so the two sources are not silently mixed.)

## 69.2 — The counterbalance is half the opening, and it is NOT filled in `[CERT-doc]`

| Property | Value | Token check |
|---|---|---|
| Counterbalance length | "The gate counter balance should be **1/2 the length of the gate opening**." | [1] |
| Minimum counterbalance | "Minimum counter balance should be **4' long**." | [1] |
| Counterbalance ratio (metric guide) | "a counterbalance section equal to **40-50% of the opening width**" | [1] |
| Vertical bracing pitch | "The vertical bracing should be spaced **4 to 6' apart**"; with 2-1/2" sch. 40 pipe, "**5' spacing** is adequate" | [1] |
| Roller-post sizing ladder | "**3" O.D.** … for widths up to **10'** opening size" · "**4" O.D.** posts up to **20'**" · "**6 5/8" O.D.** posts up to **32'**" — "These specifications are for **6' high** gates and shorter" | [1 each] |
| Footings | "**18" diameter x 42" deep** … for 3-4" O.D. posts, **24" diameter x 42"** for 6 5/8" O.D." | [1] |
| Foundation (metric) | "**400-500mm deep and 350-400mm wide**, running the entire gate travel path **including counterbalance** section" | [1] |
| Frame section (metric) | "For gates up to **5 meters** wide, **60x40x3mm RHS**" for the main frame perimeter | [1] |
| Drive rack pitch | "Attach drive rack to gate frame at **500-600mm intervals**" | [1] |
| Carriage alignment | "Adjust each carriage until top roller surfaces align precisely (tolerance: **1-2mm**)" | [1] |
| Panel mass / span | "panel weights from **400 kg to over 2000 kg**, with opening widths extending beyond **12 meters**" | [1] |

And then the sentence that decides how the asset LOOKS, which nothing else in either document
prepares you for:

> "The counterbalance is **not stretched with chain link** as it is typically behind the rest of the
> fence." [1] · "The counterbalance usually slides behind a fence line and is designed for
> **structural integrity only**." [1]

**The tail is an open frame.** Half the gate — the half nobody photographs — carries no infill at
all, because it lives behind the fence and exists only to hold the cantilever moment down. A model
that fills the whole leaf with mesh is not slightly wrong: it doubles the visual mass of the gate,
hides the bracing that is the tail's only reason to exist, and makes the counterbalance read as more
gate rather than as ballast.

## 69.3 — Deriving this asset `[INFER]`

- Clear opening **5.00 m** — chosen because it is exactly the ceiling of the certified metric frame
  rule ("up to 5 meters wide, 60x40x3mm RHS"), so the section size is evidence and not a guess.
- Counterbalance **2.50 m** = 50% of the opening, the imperial manual's rule and the top of the
  metric guide's 40–50% band. Both sources agree; the value is `high`.
- Total leaf **7.50 m**, of which only the leading 5.00 m carries mesh infill (§69.2).
- Vertical bracing at **1.50 m** pitch — the manual's "5' spacing" converted (1.524 m), rounded so
  the 5.00 m infill divides evenly into 3 bays plus the tail's own bracing.
- Foundation beam **0.45 m deep × 0.38 m wide** (mid-band of 400–500 × 350–400 mm) running the FULL
  travel path — opening plus counterbalance — which is why the beam is 7.5 m long, not 5 m. A
  foundation that stops at the opening is the second-most-likely error after filling in the tail.
- Height **2.00 m**, inside the manual's "6' high gates and shorter" envelope so the roller-post
  ladder applies unmodified.

## 69.4 — Consequences for the model

1. **No ground track and no leading-edge wheel.** There must be visible daylight under the leading
   half of the gate; that gap IS the product.
2. **The tail is an open braced frame**, the leading 5.00 m is infilled. The change of texture at the
   post line is the silhouette that says "cantilever".
3. **Two carriages** on a foundation beam that runs the whole travel path, with the rail welded along
   the frame's lower member and the rollers inside it.
4. **A receiving/catch post** at the far side of the opening: the leading edge is caught, not landed.
5. **Guide rollers** at the top of the carriage posts hold the panel upright — without them a
   bottom-supported panel would simply fall over, and their absence is invisible in a still.
6. The OPEN state must show the tail travelling past the carriages, since that is the only state
   where the 40–50% rule becomes legible.
