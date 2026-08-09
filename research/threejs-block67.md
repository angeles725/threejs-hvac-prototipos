# Block 67 — Drive-in racking: the lane is a derived dimension, not a published one

> Research of **G72 — drive-in / drive-through pallet racking** for the `disenos/catalog/` build (RUN 12).
> Continues the `almacenamiento` line opened by [Block 58] (selective pallet racking) and [Block 64]
> (cantilever). Remaining open in this family after this block: security cage.
>
> **Block number:** B67. Range B57–B69 is assigned to this session; B62/B63 were consumed by other
> families and B64/B65/B66 by this one, so B67 is the next number free BY ASSIGNMENT. The registry
> table in `research/BLOCK-REGISTRY.md` was stale (it still said "next free B65" while B65 and B66
> were already written on this branch) — corrected in the same commit as this block.
>
> Sources (preserved BEFORE citing):
> `sources/B67-drive-in-dims/mecalux-drive-in-racking` (Mecalux drive-in/drive-through product page,
> sha256 `aa78e193…`, fetched 2026-08-08) · `sources/B57-catalog-dims/ssi-schaefer-pallet-racking-2018.pdf`
> :pD26–D27 (already on disk from [Block 58]; its drive-in section had never been read).
> Method: tag-stripped transcription, every load-bearing string token-checked against the preserved copy
> (counts in brackets). Markers: `[CERT-doc]` preserved document · `[CERT-web]` vendor page · `[INFER]` deduction.

---

## 67.1 — What the manufacturer publishes `[CERT-web]`

All five strings below were confirmed present in the preserved Mecalux copy, count in brackets, after
stripping markup **and soft hyphens** (see §67.4 — the raw byte stream reads `50­ mm`):

| Property | Value | Token check |
|---|---|---|
| Upright slot pitch | uprights are "slotted every 50 mm" | `slotted every 50` [1] |
| Level height, GP rail | "the height of the storage level is equal to the height of the pallet **plus 150 mm**" | `plus 150 mm` [1] |
| Level height, C rail | same relation, "**plus 200 mm**" | `plus 200 mm` [1] |
| Lane depth | "the sum of the depth of all the pallets … plus a clearance per unit load of **at least 25 mm**" | `at least 25 mm` [1] |
| Forklift clearance | "a minimum clearance of **75 mm** between each side of the forklift and the vertical elements" | `75 mm` [1] |

Note what is NOT there: no lane width, no upright profile size, no frame pitch, no system height. The
page states dimensions are "configurable" and "adapted to the needs of each customer". Searching
further returns North-American vendor pages in inches (`hedaracking`: "2-10 pallet positions deep",
"8 to 12 feet" bay width) which do not transfer to a EUR-pallet system. **So the lane is not a
published dimension — it is derived.** That is the finding of this block, and §67.3 does the deriving.

## 67.2 — The component vocabulary, from the manufacturer's own diagram `[CERT-doc]`

`ssi-schaefer-pallet-racking-2018.pdf` :pD26–D27 carries a labelled drive-in assembly. Its labels are
the parts list the model must satisfy, and three of them are parts a modeller would not invent:

- **Attachment bracket** — the rail does not touch the upright; it hangs off a bracket bolted to it.
- **Drive-in channel** / **Drive-through channel** — the same structure, differing only in whether the
  far end is closed.
- **End stop** — the back of a drive-in channel is STOPPED. This is what makes it drive-IN and not
  drive-THROUGH, and it is the one part that carries the LIFO semantics geometrically.
- **Horizontal brace** and **horizontal cross brace** — bracing lives overhead and at the back, never
  across a channel mouth: the channel must stay clear for the truck.
- **Buffer**, **guard and floor rails** — the page is explicit about why: channels "should be equipped
  with floor rails to protect the rack supports and provide forklift drivers with better guidance"
  (`floor rails` [1], `better guidance` [1]).

Prose from the same spread, token-checked: the racks "are loaded and unloaded from one side" and "the
channels can only be accessed in one direction" (`only be accessed in one direction` [1]); drive-through
"can be accessed from both sides" (`accessed from both` [1]). `LIFO` [1] / `FIFO` [1] both appear on the
Mecalux page for the same distinction.

## 67.3 — Deriving the lane, since nobody publishes it `[INFER]`

Two certified rules bound the lane, and they bound it from opposite sides:

- **Depth** is fully determined: `lane_depth = n x 1.200 + n x 0.025` for a EUR pallet entered on its
  800 mm face, from the "at least 25 mm per unit load" rule. For **n = 4**: `4.900 m`. The frame pitch
  along the lane is therefore `1.225 m`, not 1.200 — the clearance is per pallet, so it accumulates.
- **Width** is NOT determined by the pallet. The 75 mm rule measures the FORKLIFT against the vertical
  elements, not the load, and the truck is wider than the 800 mm pallet it carries. So the pallet does
  not size the lane; the truck does. With a counterbalance truck of ~1.15 m overall width `[INFER]`,
  clear width `>= 1.15 + 2 x 0.075 = 1.30 m`. Modelled at **1.30 m clear**, confidence LOW, and the
  derivation is recorded rather than the number, because the number changes with the truck.
- **Level pitch** follows the GP-rail rule: `unit_load_height + 0.150`. With a 1.000 m load on a
  0.144 m pallet, pitch = **1.294 m** — a derived figure, not a chosen one.

The trap this avoids: sizing the lane from the pallet (800 + 2 x 25 = 850 mm) gives a channel the
truck cannot enter, and every count in the gate stays green while the asset depicts an unusable rack.

## 67.4 — The token-check failed a FOURTH way: the soft hyphen

[Block 64] §64.4 recorded three ways a token-check misses — format, markup context, wording. This
block found a fourth. The preserved Mecalux HTML contains `50­ mm`: a **soft hyphen (U+00AD)**
inserted by the CMS as a line-break hint. It is invisible when rendered and invisible in a terminal,
so `rg '50 mm'` returns **0 hits on a page that plainly says 50 mm** — a false REJECTION of a good
source, the same class of error as the Cogan rejection in §64.3 but arriving from the opposite side.

The fix is one line and belongs in every token-check from now on: normalise the invisible characters
(`U+00AD` soft hyphen, `U+00A0` non-breaking space, `U+2011` non-breaking hyphen) **before** matching,
not just the tags. Stripping tags alone is not enough, which is precisely what the earlier three
failure modes did not predict.

## 67.5 — Consequences for the model

1. **Frame every asset of this family INTO the channel.** A drive-in photographed from the side is a
   grid of posts; the entire point — the truck-sized tunnel through the block — is visible only from
   the mouth. Same rule as the sectional door in [Block 59] (§59.2, "model the face that has the
   mechanism"), reached independently here.
2. **The end stop must be modelled and must be at the FAR end**, otherwise the asset depicts a
   drive-through, which is a different product with different logistics.
3. **Rails hang on brackets**, so there is a visible offset between upright face and rail — modelling
   the rail flush against the post is the cheap error.
4. **Bracing overhead and at the back only.** A diagonal across a channel mouth would be structurally
   plausible and functionally absurd; the gate cannot see it and neither can a count.
5. **The bottom row sits on the floor** between the guide rails. There is no rail level at zero: the
   floor is the storage surface, and the guide rails are guidance, not support.
