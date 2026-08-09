# Deferred corrections — jaula-seguridad

The materials pass PASSED with the defects below unfixed. They are recorded here so they arrive at
any later gate as known items rather than as surprises with a build stacked on top of them
(GATES.md §Self-correction loop). A row leaves this ledger only by being applied-and-re-gated,
absorbed by a pass that owns it, or explicitly accepted by the user.

| # | status | owned-by | defect | why deferred |
|---|---|---|---|---|
| 1 | open | evidence-contract | The roof panel is never FRAMED by any shot: at the hero elevation (13°) it is edge-on, so nothing in the capture set lets a reviewer confirm the cage is closed on top. It is measurably present (168 wire instances, `visible: true`). | The roof is not one of the five critical features, so the coverage requirement of GATES.md step 0 is satisfied as written. Closing it properly means a third evidence view (`?view=top`) plus a full re-capture of all three shots from one closed build — additive work, not a correction to the geometry. Cheap and worth doing if this asset is ever re-gated. |
| 2 | open | materials | The service shelf renders near-white ([180,181,181]) although its albedo is dark grey `#3a4046`: its top face is nearly horizontal and takes the key head-on, making it the brightest object in the frame. | Physically coherent — the grazing view shows the same shelf dark from below — and not clipped. Fixing it means either tilting the key (which would cost the interior its light) or darkening an albedo that the source does not specify. Not worth a correction retry on its own. |
| 3 | accepted | materials | The door leaf carries the same aperture and enamel as the wall panels, so at hero scale it separates from the partition only by its frame. | ACCEPTED, not open: this is what the source describes. UFGS door leaves are the same mesh in a heavier frame. Making the leaf visually distinct would be a fidelity loss dressed as a legibility win. |
