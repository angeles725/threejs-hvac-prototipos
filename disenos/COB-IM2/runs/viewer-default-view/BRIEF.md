# Default-view composition — evidence for independent review

Subject: `disenos/COB-IM2/cob-im2-L4-system-3d.html` (canonical L4 viewer).
Question: **which should be the viewer's default view — A or B?** Score legibility of the ductwork.

No rationale is included here on purpose. The images and the mechanical numbers are the evidence.

| | file | what the URL was | framing gate |
|---|---|---|---|
| **A** | `A-whole-network.png` | no query — whole network | `ok:true` · fullyVisible · !cropped · centered · wellFramed · !overlapsHUD · occupancy 0.287 |
| **B** | `B-bay-08.png`, `B-bay-03.png` | `?bay=8`, `?bay=3` | not measured — `__qaFraming`'s SUBJECT is the whole duct mesh, so a bay view crops it by construction |

Subject extent: 153.13 × 42 m footprint, ~2.11 m vertical span — an aspect ratio of roughly 78:1.

Console sidecars are included. The only issue in either is a `/favicon.ico` 404 from the dev
server; the page itself is self-contained.

Note for whoever scores this: B currently cannot pass the framing gate as configured. That is a
fact about the gate's SUBJECT definition, not about B's composition. If B wins on legibility, the
SUBJECT should become the presented bay rather than the whole mesh.
