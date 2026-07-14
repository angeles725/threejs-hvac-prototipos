# SURFACE — lineage 2, attempt 1 (apply report)

**Asset:** 01-shell-circulation-facade
**Pass:** surface
**Reset:** surface-reset-2 (see `runs/surface-lineage2-reset.md`)
**Scope rule honored:** physical topology, device placement, routes, materials and accepted architecture views were NOT modified.

## What this attempt delivers

The derived, evidence-only `architecture_system_diagram_board` from the reset scope, plus the two
gate defects found and fixed on the SAVED captures before review.

## Defects found on the saved captures (fixed pre-review, strict TDD)

| # | Defect (pixel terms) | Root cause | Fix | RED test |
|---|---|---|---|---|
| 1 | Every label on the diagram board rendered MIRRORED (reversed text) in both network captures. | `NETWORK_SCHEMATIC_BOARD.rotationY = -Math.PI/2` points the PlaneGeometry's default +Z normal toward −X, but both network cameras sit at +X of the board (board x=34.6; cameras x=82 and x=68). Every capture filmed the back face. | `rotationY = +Math.PI/2`. | `board front face points toward every camera that captures the diagram` — derives the normal and asserts `dot(normal, board→camera) > 0` for both presets. |
| 2 | Board cropped: the title read "INEMEX" and the Niagara → PC/tablet/smartphone chain ran off the right edge. | The UI side panel leaves a PORTRAIT canvas (672×816, aspect ≈0.82), so horizontal FOV binds. The detail camera framed only 23.8 m of the 34 m board. | `network-schematic-detail` camera moved from x=68 to x=90.6. | `detail camera frames the whole board on the portrait viewport the capture harness uses` — asserts visible width ≥ board width × 1.08 at aspect 0.8. |

Two hardcoded preset tuples (`tests/shell.test.mjs`, `tests/surfaces.test.mjs`) had frozen the old
camera value and were updated to match. Note the failure mode they represent: a test that COPIES a
constant cannot catch a wrong constant. Both new tests DERIVE the property from geometry instead.

## Mechanical evidence

- Probe (median): **216 draws / 35 008 tris** vs budget 550 / 750 000 → pass (39% / 5% utilization).
  `fps` informational only under SwiftShader.
- Console sidecars: **23/23 clean** (zero errors, warnings, pageerrors, failed/≥400 requests).
- Unit tests: **102 pass / 0 fail** (`node --test tests/*.test.mjs`).
- Artifact: `runs/assets/01-shell-circulation-facade/surface-attempt1.mechanical.json`

## Capture set (23)

3 states × 7 required views + 2 network-evidence views:

- `mode=architectural&camera=<v>&poster_frame=0&display_frame=0`
- `mode=architectural&camera=<v>&poster_frame=1&display_frame=1` (deterministic two-frame proof: posters/menus/screens are generated, not protected art)
- `mode=engineering&camera=<v>&labels=on&links=all`
- views: facade, lobby, concessions, kitchen, corridor, sala-3, ug67
- network evidence: `complete-network`, `network-schematic-detail`

Note: the spec's `deterministic_query_states.view` vocabulary is implemented as `camera=`; `view=` is a
layer filter. Capture URLs use the implemented vocabulary.

## Status

Evidence complete and mechanically green. Blind independent review pending — no verdict is claimed here.
