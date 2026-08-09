# Wrap-around pressure-sensitive labeler — preserved source extracts

Fetched: 2026-08-09
For: `disenos/catalog/proceso/etiquetadora`
Marker: [CERT-web] for the quoted manufacturer datasheet and engineering-guide statements.

Namespaced source folder (proceso family), NOT a research block — no BLOCK-REGISTRY number consumed.
See `research/BLOCK-REGISTRY.md` note on namespaced source folders.

## 1. Machine envelope and format ranges — CVC-300 wrap-around labeler

URL: https://www.cvcusa.com/products/labeling/round-bottle-labeling/9-cvc-300.html
Manufacturer datasheet (CVC Technologies). This is the ONE source in reach that fixes absolute
dimensions, so it governs the model's envelope.

| Quantity | Quoted value | SI |
|---|---|---|
| Conveyor length (standard) | `79"` (optional 94" sanitary) | 2007 mm |
| Conveyor width (standard) | `4"` (also 6") | 102 mm |
| Conveyor bed height | `36" (+/- 2")` | 914 mm ± 51 |
| Machine weight | `174 kg (383 LBS)` | 174 kg |
| Label width/height range | `5/8" to 8-5/8" (15mm - 220mm)` | 15–220 mm |
| Label length range | `5/8" to 10" (15mm - 254mm)` | 15–254 mm |
| Label roll | `Max 13-3/4" (350mm) outside diameter with 3" (76mm) core` | OD ≤350 mm, core 76 mm |
| Bottle height range | `2" to 12-5/8" (50mm - 320mm)` | 50–320 mm |
| Bottle diameter range | `1" to 4" (25mm - 102mm)` | 25–102 mm |
| Speed | `Rates in Excess of 100 BPM (Format Dependent)` | >100 bottles/min |
| Label accuracy | `± 1/32"` | ±0.8 mm |

Also stated: stainless steel construction, touchscreen interface, **variable speed separator wheel**.

Corroboration from a second search pass (secondary, [CERT-a]): automatic labeler conveyor heights
"typically between 830 mm and 875 mm"; another model quotes a label roll of "inner diameter 75 mm and
outer diameter 300 mm" and "linear speed of up to 30 m/min". The CVC figures sit inside these bands,
so the 914 mm bed height is at the tall end of normal, not an outlier.

## 2. Label web path — component sequence

URL: https://www.sigmaequipment.com/guide/wraparound-pressure-sensitive-labeler/

The web path is an ORDERED chain; the order is the fact, and getting it wrong makes the machine
decorative rather than functional:

1. **Unwind reel** — "label roll unwinds over a tension control roller"
2. **Tension control roller** — "Consistent tension control is critical to achieving consistent
   label application"
3. **Guide rollers** — "series of guide rollers that carry the labels with its web backing through
   the labeler"
4. **Peel plate / knife edge** — "The peeler plate, sometimes called a knife edge, **reverses the web
   direction**, causing the label to separate from the web. The label will then continue forward and
   onto the container."
5. **Nip-and-pressure roll** — "pulls the web through the labeler"
6. **Rewind reel** — "the empty web is collected on the rewind reel"

### Why the peel plate is the identity of the machine

> "The web with the peel-off labels attached moves along a flow path over a peeling edge and abruptly
> changes direction at an **acute angle**, which causes the peeling force on the peel-off label to
> exceed the peeling threshold of the weak adhesive-to-release agent bond."
> (US 11958653, peel-off label dispenser)

Consequence for the model, and the reason this is a critical feature rather than a detail: the liner
must LEAVE the peel plate folded back at an acute angle toward the rewind reel, while the label
continues straight onto the bottle. A web drawn as a smooth curve past the plate depicts a machine
that cannot dispense — it would render perfectly and be wrong.

## 3. Container handling and the wrap station

Same sigmaequipment guide:

> "spacing wheels or worm screws" ensure "containers are properly spaced as they are conveyed into
> the labeler"

> the core operation conveys "a cylindrical container or bottle **between a rotating belt and a
> pressure plate**"

So a wrap-around station is a THREE-body contact: driven wrap belt on one side, backing
plate/pressure pad on the other, bottle rolling between them. The bottle spins about its own vertical
axis while translating — that is what wraps the label around it.

## 4. What these sources do NOT fix

Not in reach, therefore [INFER] in the spec and confidence `low`:
frame footprint and column heights, reel spool and idler-roller diameters, label-head plate size,
control-cabinet and HMI dimensions, separator-wheel diameter, guard geometry. The conveyor bed height
(914 mm), conveyor width (102 mm), roll OD (350 mm) / core (76 mm), and the label format band
(15–220 mm tall) ARE fixed by §1 and are used as the model's anchors.
