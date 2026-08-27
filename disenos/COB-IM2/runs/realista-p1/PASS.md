# WU-L4-REALISTA Phase 1 — PASS (structural fittings)

Real gored duct fittings replace the box-stub junctions where the topology confidently supports them.

## Result (verified)
- Census (console, tree-asserted): **63 reales de 71 construibles** — 43 elbowRect + 8 teeRect + 12 transitionRect; 8 transitionRectRound deferred (rect↔round ring correspondence, Phase 1b).
- Form: CERT elbow (node 1134) captured — a real GORED rectangular elbow, mouth coincides with the duct by construction (native generator, no catalog import, no rotation-mismatch open joint). R=W SMACNA standard radius, justified in code (the project already ate a radius defect: pipeElbow 1.5×OD).
- Marking: sixth per-vertex `mark` attribute, two-level: position (54 CERT / 17 INFER) and FORM (INFER on all 63 — the drawing never dimensions an elbow radius). Legend: "accesorio real: posición medida · forma inferida (radio de catálogo)". `?markdebug=1` tints position-CERT green / INFER orange — proves the marking travels in geometry, not just the legend.
- `dev` synthesized per fitting vertex (= bod − BOD_MED) so fittings do not detach at the default ×4 exaggeration.

## Two live defects the pass surfaced (both caught by measurement)
1. **Degeneration guard** — 496 runs (24%) have p0==p1 (zero plan extent). `emitTee` passed the zero direction to the ring builder, collapsing 58 tees/crosses to zero-area shells. An explicit guard in `emitRealFitting` now rejects any node touching a degenerate run. Buildable: 269 (contaminated) → 71 (honest).
2. **The 496 are NOT vertical ducts.** Initial (Revisor) hypothesis: vertical risers the plan-model collapses. REFUTED by measurement (@3D): 0/168 checkable cases match the elevation-difference a vertical drop needs; 105/168 have the neighbour at the SAME elevation. The data signature (88/168 with L == neighbour duct WIDTH) points to the extractor emitting a duct's CLOSING/section LINE as a run. So the declared 2540.2 m total is **over-stated ~8.3% (210 m)**, NOT under-drawn. Drawing them as vertical would have FABRICATED 210 m of ductwork — the exact failure this WU exists to avoid. Documented, not drawn (RECONCILE-fittings-L4.md); the 328 without a neighbour stay unresolved (extractor question).

## Honest coverage
63 real fittings of 1157 declared (~5%). The source (2D line-work, 24% degenerate, 82% connected) limits realism-as-survey. The remaining junctions stay as box stubs, declared unsupported. NEXT: Phase 2 = galvanized PBR material + toggle (100% coverage, the larger visual win) + declare the 8.3% length over-statement in the HUD. The extractor is the real leverage for more real coverage + honest totals (user deferred it).

VERDICT: PASS — the built fittings are correct and honestly marked; the pass's real value was surfacing the two data defects before shipping.
