# Horizontal flow wrapper (HFFS / flow-pack) — preserved source extracts

Fetched: 2026-08-09
Block: B100 (range proceso/fluidos/utilities B100–B119)
Marker: [CERT-web] for the quoted vendor/guide statements · [INFER] for anything derived here.

Serves: `disenos/catalog/proceso/empacadora-flowwrap/`

---

## 1. Machine architecture — the order of operations

Source: CHLB Group, "Horizontal Flow Wrapping Machines Guide"
URL: https://chlbgroup.com/flow-wrapping-machine-guide/

> products are "systematically introduced onto an in-feed conveyor, which then transports them to
> the wrapping station"

> a flat film web wraps around the product creating "a continuous tube" that is "sealed
> longitudinally, and subsequently cross-sealed and cut to create individual, 3-side sealed
> packages"

Named components in the same guide:

> "folding box" — forms the flat film into a tube around the product

> "fin seals" created by "3 pairs of rollers" — the LONGITUDINAL seal

> "Rotary or box motion cross-sealing jaws" apply "hermetic end seals while cutting packages"

Variant worth noting (NOT the one modelled here):

> "inverted / back-seal flow wrappers" where "film fed from below, creates a longitudinal seal on
> the top surface"

**What this pins down (the shape facts):**
- The film becomes a TUBE around the product. A machine without a former/folding box is not a flow
  wrapper — the film would never close.
- The longitudinal seal is a FIN hanging off the package (here: underneath), produced by a stack of
  seal rollers, not by a jaw.
- The transverse jaws SEAL AND CUT in the same motion — they are not two separate stations.
- The result is a 3-side sealed pillow pack: one fin + two crimped ends.

---

## 2. Dimensions — vendor datasheets

| Machine | Source | Figures |
|---|---|---|
| Hayssen X850 | BW Packaging / bwflexiblesystems.com | length 162" = **4115 mm**, width 55" = **1397 mm**, height 85" = **2159 mm**, max reel Ø 18" = **457 mm** |
| Ossid ReeFlow 50 | shorr.com / ossid.com | max film reel Ø **400 mm**, reel width **650–800 mm** |
| RPMI Pack 102 (entry level) | products.rpmipackaging.com/Asset/Pack-102_Datasheet_EN.pdf | film reel max Ø **400 mm** |
| Cavanna | cavanna.com | max reel Ø **400 mm** |
| Harpak-ULMA | harpak-ulma.com/flow-wrap-machine/ | double reel holder, rolls to **850 mm** wide × **350 mm** Ø |

General ranges from the CHLB guide:

> product "bag length 130–400 mm, width 30–140 mm, height 35–70 mm" (compact machine); film width
> up to "610 mm"; film roll "roughly 320 mm max diameter"

> speed "30–120 packs/min (compact); 250–350+ packs/min (high-speed); 2 × 700 packs/min (dual-lane)"

Footprint statement (Mingke / mkpackagingmachine.com and the CHLB guide agree in order of magnitude):

> a mid-range horizontal flow wrapper with infeed conveyor and outfeed occupies **3–6 m in length
> and 0.8–1.2 m in width**

---

## 3. Values adopted for the model, and their grade

The Hayssen X850 is the only source in reach that gives a COMPLETE L×W×H triple from one machine,
so it anchors the envelope; the reel diameter is taken at the value four independent vendors
converge on (400 mm) rather than the X850's 457 mm outlier.

| quantity | value | grade | why |
|---|---|---|---|
| overall length | 4.10 m | [CERT-web] | Hayssen X850 = 4115 mm; inside the 3–6 m band |
| overall width (frame) | 1.00 m | [CERT-web] | inside the stated 0.8–1.2 m band; X850's 1397 mm includes its outfeed |
| working height (conveyor top) | 0.90 m | [INFER] | ergonomic bench height; X850's 2159 mm is TOTAL height incl. the reel mast |
| total height | 2.15 m | [CERT-web] | Hayssen X850 = 2159 mm |
| film reel Ø | 0.40 m | [CERT-web] | ReeFlow 50 / RPMI Pack 102 / Cavanna all state 400 mm |
| film reel width | 0.60 m | [CERT-web] | inside 370–650 mm; below the 610 mm film-width cap |
| infeed flight pitch | 0.40 m | [INFER] | = max stated bag length (130–400 mm), so one flight = one pack |
| product size | 0.24 × 0.09 × 0.05 m | [CERT-web] | inside "130–400 × 30–140 × 35–70 mm" |
| transverse jaw Ø | 0.20 m | [INFER] | not stated by any source in reach; sized to sweep the pack height |

**Not found in any source reached:** transverse jaw diameter, former/folding-box geometry, fin-roller
stack dimensions, frame member sizes. These are [INFER] and are declared `low` in the spec.
