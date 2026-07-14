# SURFACE — lineage 2, attempt 2 (apply report)

**Asset:** 01-shell-circulation-facade
**Pass:** surface
**Input:** `runs/assets/01-shell-circulation-facade/surface-attempt1.review.json` (FAIL, global 0.70 / min 0.78)
**Scope rule honored:** physical topology, device placement, RS-485 routes and device scale were NOT changed.
The diagram board stays evidence-only and is still derived from `APP_CONFIG` + `createArchitecturePlan`.
Only the 13 review corrections were applied — no opportunistic rework.

## Corrections

| # | Correction | What changed | RED test that proves it |
|---|---|---|---|
| 1 | Arrowed INTERNET → NIAGARA edge; ETHERNET row gaps wider than an arrowhead | `network-schematic.js`: the board now owns a derived `layout.edges` list (14 edges: 4 RS-485, 4 LoRaWAN, 6 Ethernet incl. `ethernet-internet-niagara`). `BOARD_ARROWHEAD` is the single glyph authority; the ETHERNET row was re-laid (router 1345‑1545, internet 1590‑1740, niagara 1790‑2000) so every gap ≥ 45 px vs a 21 px arrowhead. `validateNetworkSchematicLayout` rejects any edge whose terminal segment is shorter than its own arrowhead. | `board correction 1/3: every schematic edge carries an arrowhead longer edges than the glyph` — derives edge lengths and row gaps from the layout, never a literal. |
| 2 | Captions fit inside their boxes | `estimateCaptionWidth` / `fitCaptionFontSize` (conservative bold-sans advance) + a `caption()` painter that measures with `measureText` and shrinks. `layout.captions` binds each caption to its box; the validator refuses a box that cannot hold its caption at `BOARD_CAPTION.minSize`. Box widths widened accordingly (ROUTER / FIREWALL 200 px, NIAGARA SUPERVISOR 210 px, SMARTPHONE 140 px). | `board correction 2: every caption fits inside its own box at the minimum legible size` — computes the fitted size and width per caption/box pair. |
| 3 | Arrowheads on the 4 LoRaWAN and 3 Niagara → client edges | Root cause was draw order: the arrowheads existed but the UG67 node body was painted **over** them. All arrowheads are now drawn last, from `layout.edges`, so no node can bury the direction of its own edge. Client edges route down out of the Niagara box into three client boxes below it. | same test as #1 (asserts `arrowhead === true` on all 14 edges, including all `lorawan` and `ethernet-niagara-*`). |
| 4 | Model-link pill off the node; RF1..RF4 | `bridge-badge` is now a first-class layout box **below** the node (y 560, node ends at 516) and participates in the overlap check. `layout.ug67Ports` derives 4 labelled ports `RF1..RF4` from the 4 LoRaWAN lanes; the 3D leader endpoint is derived from the badge centre via the new `canvasPointToBoardWorld` (the hardcoded `bridge.socket` was deleted — one source of truth). | `board correction 4: the bridge pill sits clear of the UG67 node and four RF ports are labelled` — asserts pill/node separation, 4 unique ports, port↔edge binding, and that RF1..RF4 are actually painted. |
| 5 | In-model media legible at `complete-network` | `resolveNetworkEvidenceVisibility('complete-network')` now returns `densePhysicalNetwork: true, technicalLabels: true` (it was hiding both). New `SURFACE_NETWORK_MEDIA` policy owns every media cross-section; `setNetworkMediaWidthScale` widens **only** the cross-section (×5) at that camera — positions, lengths and terminal contacts are untouched. | `correction 5: network media stay above the legibility floor at the complete-network camera` — projects each media width through the actual preset (position/target/fov) and asserts ≥ 3 px scaled and < 3 px unscaled. |
| 6 | External blocks wired and captioned | The Ethernet run already existed but was invisible (see #5); captions were `ROUTER/…/PHONE` generic. External labels are now `ROUTER / FIREWALL, INTERNET, NIAGARA, PC, TABLET, SMARTPHONE` and the `complete-network` label scales were raised (external 0.9 → 1.5, ug67 1.6 → 2.2, uc100 0.9 → 1.5, rollups 0.82 → 1.4). | `correction 6: the external Ethernet run connects UG67 to router, internet, Niagara and clients` — asserts route/chain/branch continuity against the endpoint positions and derives each caption's projected width (≥ 40 px) at the preset. |
| 7 | lobby / concessions / kitchen see their fit-out | Cameras moved **inside** the front public band and under the 4.5 m roof: lobby `[21.5, 2.6, 21.2]`, concessions `[7.5, 2.5, 21.4]`, kitchen `[-17, 2.4, 17.4]` (was `[-18, 4.8, 12]`, i.e. above the roof). `resolvePublicRoofVisibility` + `SURFACE_ROOF_CLIP_CAMERAS` hide the public roof panel and its seams (own bucket `roof-seam-charcoal`) for those three presets. | `correction 7: lobby, concessions and kitchen sit inside the public band with the roof clipped` — derives the band bounds/height from the plan; plus a derived block in the existing `fixed evidence cameras` test. |
| 8 | No technical labels in `state=architecture` | `resolveTechnicalLabelVisibility({visualMode, labels, labelsExplicit})` + `setLabelPolicy` on the asset; `parseQueryState` now reports `labelsExplicit` (true only when the URL carries a `labels` token). Technical kinds (tc300, uc100, ug67, external, bus-group, bus-rollup) are suppressed in architectural mode unless labels were explicitly requested. | `correction 8: technical labels are engineering-only unless labels are explicitly requested` — truth table + query parsing. Verified end-to-end: kitchen/architecture renders 0 sprites, kitchen/engineering still renders TC05, UC-D, BUS D. |
| 9 | Facade poster bank with real, frame-changing artwork | New `plan.facade.posterBank`: 4 panels (1.5 × 2.0 m) on the east pier at the spec pivot (x ≈ 15, z 22.63) with a dark backing. The atlas poster cells are split into 4 × 128 px quadrants per frame → 8 tiles; `createPosterArtwork(frame, variant)` returns a deterministic, purely abstract composition per (frame, variant). Corridor portal posters now cycle the same four variants. | `correction 9: the facade poster bank owns four generated panels that change between frames` — asserts 4 distinct panels on the outer facade face, tile existence, and that all 8 artworks are pairwise distinct **and** every variant changes between frame 0 and 1. |
| 10 | Menu boards anchored to the counter | New `plan.frontOfHouseSurfaces`: a service back wall (bulkhead) above the service line at z = 15, and three 1.7 × 1.3 m boards mounted on its front face (z 15.13), 0.8 m above the counter top. `PLACEMENT_LIMITS['menu-display']` tightened 6.5 × 2.2 → 1.8 × 1.8, so an oversized board now throws at build time. | `correction 10: menu boards are counter-scaled and mounted on the service back wall` — every constraint is derived from the counter proxy (top, back/front face) and the facade glass z. |
| 11 | POS / snack / wayfinding cues | POS screen faces added on the counter; three generated product bands per snack machine; new corridor wayfinding: 5 floor evacuation arrows (chevron + shaft, pointing out to the public band) and 8 EXIT plates on the corridor walls. New surface category `wayfinding-marking`. | `correction 11: POS, snack machine and corridor wayfinding cues are generated geometry` — asserts categories and derives arrow direction/containment from the corridor bounds. |
| 12 | Auditorium side walls darkened | New `plan.auditoriumAcousticLinings`: 24 charcoal acoustic linings (both side walls + end wall per room, material `auditorium-acoustic-wall` → `auditoriumAcousticFabric` 0x202029) inside the room, in front of the white shell and behind the existing panel rhythm. Exterior massing/materials untouched. | `correction 12: auditorium side walls receive a charcoal acoustic lining` — derives containment from each room's bounds and asserts the lining luminance is < 35 % of the shell white. |
| 13 | Engineering bleed-through | New `SURFACE_ENGINEERING_CONTRAST` (surfaces.js) is the single authority: shell stays 0.18, seats drop to 0.07, carpet to 0.10, zone volumes 0.12/0.09/… → 0.04, and RS-485 green / network blue emissive 0.7 → 1.35. `materials.js` applies per-material engineering opacity instead of one global 0.18. | `correction 13: engineering contrast lowers seat and zone bleed and lifts media emission` — asserts the policy relations (seat ≤ shell/2, zone ≤ 0.05, emissive ≥ 1.25) and the registry behaviour through a stub THREE. |

## Test discipline

- Every correction landed as a RED test first (`tests/surface-corrections.test.mjs` failed to import before the code existed).
- Tests **derive** properties (projected pixels from the real camera preset, edge lengths from layout points, caption fit from measured advance, roof/band containment from the plan) instead of copying constants — the failure mode that let attempt 1's mirrored board through.
- Five existing tests copied constants I had to change (kitchen preset, `complete-network` visibility, menu placement size, label-scale policy, query-state shape). Each was updated **and** given a derived assertion beside the literal.

## Test counts

`node --test tests/*.test.mjs` → **114 pass / 0 fail** (102 pre-existing + 12 new correction tests).

Additionally the real `createArchitectureStructure` was exercised against a stub THREE: 81 meshes (was 76; +5 buckets, still far under the 550-draw budget), 79 surface placements all valid, roof clipping and label suppression verified per camera.

## Files changed

- `src/scene/network-schematic.js` (board edges, arrowheads, captions, ports, pill, world mapping)
- `src/scene/architecture.js` (plan: poster bank, menu boards + back wall, wayfinding, acoustic linings; builder: media width policy, roof clipping, label policy, new cues)
- `src/scene/surfaces.js` (poster artwork + atlas quadrants, media/contrast/roof policies, projection helper, menu limit)
- `src/scene/materials.js` (per-material engineering opacity, media emissive)
- `src/controllers/camera.js` (lobby, concessions, kitchen presets)
- `src/controllers/query-state.js` (`labelsExplicit`)
- `main.js` (label-policy wiring)
- `tests/surface-corrections.test.mjs` (new), `tests/{surfaces,network-schematic,shell}.test.mjs` (updated literals + derived assertions)

## Status

Code and tests complete. No captures, no review, no verdict claimed here.
