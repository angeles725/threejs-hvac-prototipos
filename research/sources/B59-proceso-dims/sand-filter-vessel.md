# Industrial sand / multimedia filter vessel — preserved source extracts

Fetched: 2026-08-08
Sources: unifyaqua.com industrial water filters, starkefiltermedia.com filter-sand guide,
h2ktech.com multi-media sand filters, ergil.com sand filter vessel.
Marker: [CERT-web].

| quantity | value |
|---|---|
| vessel diameter range | 200 - 3000 mm |
| vessel height range | 1000 - 2000 mm (shell) |
| sand bed depth | 600 - 1200 mm depending on application |
| media | graded silica sand, 0.5 - 1.2 mm effective size |
| support bed | gravel, 3 - 4 layers of graded pebbles |
| working pressure | 2.5 - 6.0 kg/cm2 |
| filtration velocity | 10 - 30 m3/hr/m2 |
| backwash velocity | 30 - 40 m3/hr/m2 |
| backwash duration | 10 - 15 min, until clear water |
| multiport valve | optional, top- or side-mounted |

## The modelling consequence nobody draws: FREEBOARD

Backwash runs at 30-40 m3/hr/m2 against a filtration rate of 10-30 — i.e. the bed is deliberately
FLUIDISED and expands. That is why the vessel is roughly twice the height of its media: the empty
space above the bed is not wasted volume, it is the expansion room the backwash cycle needs, and a
vessel modelled full of sand to the top head could not be backwashed at all.

The graded support gravel underneath is likewise not decoration — it stops the sand escaping into
the underdrain and spreads the backwash flow.

## Not evidenced

Exact vessel for a given duty, head geometry, underdrain/lateral design, valve model, leg count.
[INFER] in the design spec. Head geometry reuses the DIN 28011 Klopper solver already validated on
utilities/tanque-pulmon.
