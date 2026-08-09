# Wafer butterfly valve DN100 PN16 — preserved source extracts

Fetched: 2026-08-08
Marker: [CERT-web] for the quoted vendor fields; everything else is flagged in the design spec.

## Tameson BFLW-100-16-ABA
URL: https://tameson.com/products/bflw-100-16-aba-dn100-pn16-wafer-butterfly-valve-gg25-stainless-steel-epdm

- "nominal diameter is 100 mm (4 inch)"
- "rated for 16 bar non-hazardous fluids"
- "Cast iron (GG25) housing, stainless steel disc and EPDM seal"
- "temperature range of -10°C - 110°C"
- "ISO 5211 flange (size F05 to F12)" (range for the series, not the DN100 code)
- "wafer type flange"

## END Armaturen TA532010
URL: https://shop.end.de/en/ta532010

- "Butterfly valve DN100, PN16, length EN558-20, Cast iron GG / NBR / stainless steel"
- "Weight [kg] 5.757000"

## What is NOT in these sources

Neither vendor page exposes a dimension table in HTML — the numbers live in a downloadable PDF
datasheet and a CAD zip. The following are therefore STANDARD values used in the model and marked
[CERT-a] with medium confidence in the design spec, NOT measured evidence:

| quantity | value | standard |
|---|---|---|
| face-to-face, DN100 | 52 mm | EN 558 series 20 |
| flange OD, DN100 PN16 | 220 mm | EN 1092-2 |
| bolt circle / count | 180 mm, 8 x M16 | EN 1092-2 |
| pipe OD, DN100 | 114.3 mm | steel pipe |
| ISO 5211 code at DN100 | F07 | ISO 5211 (usual, not confirmed for this model) |

Re-verify these before using the asset for clash or fit checking rather than as a scale cue.
The obvious next step is the vendor's "Data sheet TA" / "Manual BFL" PDF, which was not reachable
without following a download link.
