# Block 120 — Personnel interlock portal: the interlock is the product, and it must be ENFORCED

> Research of **G75 — esclusa personal (mantrap / security interlock portal)** for the
> `disenos/catalog/` build (RUN 12). Closes the `puertas` family except `puerta-seguridad`, which is
> blocked awaiting the user.
>
> **Block number:** B120 — the first of the extension range **B120–B124** assigned by session-A after
> B57–B69 was exhausted, and recorded in `research/BLOCK-REGISTRY.md` BEFORE this block was written.
> B121 is reserved for `puerta-seguridad`. Do not write B70+; that range belongs to transporte.
>
> Sources (preserved BEFORE citing → `sources/B120-airlock-dims/`):
> `cometa-co135-security-portal` (CoMETA S.p.A. Co135 classic security portal, sha256 `696bf13b…`,
> fetched 2026-08-09) — RECTANGULAR booth, dimension table ·
> `boonedam-circlelock-nbs` (Boon Edam Circlelock Solo, NBS Source product specification,
> sha256 `3f6c9f2c…`) — CYLINDRICAL portal, manufacturer-verified BIM specification.
> Method: tag-stripped transcription with invisible characters normalised (block67 §67.4); strings
> token-checked, counts in brackets. Markers: `[CERT-web]` vendor/BIM specification · `[INFER]`.

---

## 120.1 — Two body plans, and the numbers say the same thing `[CERT-web]`

| Property | Rectangular (CoMETA Co135) | Cylindrical (Boon Edam Circlelock Solo) |
|---|---|---|
| Envelope | `W 1050 * D 1050 * H 2400 mm` [1] | `1000 mm diameter` [1]; width options `1000 mm` / `1500 mm` [1] |
| Height | 2400 mm; lowered variant `H 2340 mm` [1] | `2100 mm` minimum … `2600 mm` maximum [1] |
| Passage | `L 600 * H 2000 mm` [1] | — |
| Canopy | — | `200 mm` / `300 mm` / `400 mm` / `500 mm` [1] |
| Glazing | — | `8.76 mm laminated glass (vandal-resistant to BS EN 356, P2A)` [1] · `10.28 mm … P5A` [1] |
| Manifestation | — | `Circular glazing manifestations at 900 mm and 1500 mm` [1] |
| Materials | — | Aluminium · stainless steel · glass [1] |

Both converge on a footprint of about **one square metre** and a height of **2.1–2.4 m**. That is not
a styling choice: the booth is sized so that exactly ONE person fits and a second cannot hide. The
CoMETA passage of **600 mm** is the same logic from the other side — a doorway narrow enough that two
people cannot pass abreast.

The **glazing manifestations at 900 mm and 1500 mm** are the detail no modeller invents. They are the
two horizontal bands on the glass that stop a person walking into a pane they cannot see, and they
are the visual signature of this product in every photograph of one.

## 120.2 — The interlock is a RULE, not a pair of doors `[CERT-web]`

The sources describe the behaviour, not just the shape: `interlock` appears [10] times in the CoMETA
page alone, and the Boon Edam specification names what it defends against — `tailgating` [2],
`piggybacking` [3], with `bullet`-resistant options [5] and `biometric` readers [3].

The defining rule is that **the two doors are never open at the same time**. One door remains locked
while the other is open; the space between them is the trap.

**This has a direct consequence for the model, and it is the whole point of the asset.** Two
independent door toggles do NOT depict an interlock — they depict a booth with two doors, which is a
vestibule, a different and much cheaper product. The interaction has to ENFORCE the rule: opening one
door must close the other. If a state exists in which both are open, the model is wrong no matter how
good the geometry is, and no count and no render can see it — only driving the two toggles can.

This is the same class of claim as the drive-in end stop ([Block 67] §67.5-2) and the cantilever
gate's ground clearance ([Block 69] §69.1): a single feature that separates the product from its
cheaper neighbour, and that a green gate is blind to.

## 120.3 — Deriving this asset `[INFER]`

- **Cylindrical** body plan, 1000 mm diameter — the Boon Edam variant, because the curved sliding
  doors are what make the interlock legible in a still (a rectangular booth with two flat doors reads
  as a vestibule).
- Height **2100 mm** (the specification's minimum, i.e. the standard headroom) plus a **300 mm**
  canopy from the published ladder → 2400 mm overall, which also matches the CoMETA envelope.
- Passage arc derived from the CoMETA passage width: a **600 mm** chord across a 1000 mm circle is
  `2·asin(300/500) = 73.7°`. So each doorway spans ~74° of the cylinder and each fixed glass segment
  spans ~106°. The two openings sit diametrically opposite.
- Glazing modelled as laminated glass at transmission ~0.72, not ~0.96: at 0.96 glass disappears from
  the render entirely (ONBOARD). The interior must be LIT or the booth reads as a black cylinder —
  the same failure as an unlit vitrine.
- Manifestation bands at **900 mm** and **1500 mm**, from the specification.

## 120.4 — Consequences for the model

1. **Enforce the interlock in the handler**: opening door A closes door B and vice versa. There must
   be no reachable state with both open.
2. **A human figure belongs in this asset**, not as decoration: the product is defined by fitting
   exactly one person, and at 1 m diameter the ONBOARD's 1.8 m figure rule applies squarely.
3. **Light the interior.** Glass plus an unlit interior is a black cylinder; the person inside is the
   subject of the whole machine.
4. **The manifestation bands must be modelled**, at the two published heights.
5. The doors slide AROUND the cylinder into the pocket behind the fixed segments — they do not swing.
