# SURFACE — lineage 2, attempt 3 (apply report)

**Asset:** 01-shell-circulation-facade
**Pass:** surface
**Input:** `runs/assets/01-shell-circulation-facade/surface-attempt2.review.json` (FAIL, global 0.78 / min 0.78; only `canonical-network-endpoints` failed, 0.78 / 0.80)
**Scope rule honored:** physical topology, device POSITIONS, RS-485 route paths and device SCALE were NOT changed. The 14 TC300 bodies keep their true `[0.1, 0.1136, 0.026]` structural size; readability is carried by the glass face, the status ring and the label chip. The diagram board stays evidence-only and derived from `APP_CONFIG` + `createArchitecturePlan`.
Only the 9 review corrections were applied — no opportunistic rework.

## Root cause found (why eight attempts failed on the same feature)

Two rendering defects, invisible in the plan data, were burying the evidence:

1. **The TC300 was buried by its own terminal cube.** The drop terminated with a
   `containment-orange` box of `[0.12, 0.12, 0.08]` placed **at the device centre** — larger than the
   100 mm device it was supposed to connect to. The 0.08 m green conductor also ran *through* the
   body. The thermostat was rendered; it was simply invisible under an olive cube. That is exactly
   the "bare junction stub" the judge saw.
2. **The RS-485 green was buried by its own tray.** `rs485Tray` (0.24) and `rs485Trunk` (0.11) were
   drawn on the *same centre line*, so the conductor sat entirely inside the tray box. In engineering
   mode the tray is a cutaway material at 0.18 opacity, so the saturated `#29d67d` only bled back
   through it — as pale mint. The spec colour was never wrong; it was never visible.

## Corrections

| # | Correction | What changed | RED test that proves it |
|---|---|---|---|
| 1 | 14 TC300 endpoints as real surface devices (glass face, blue ring, `TC300-01..14` chip at 5 presets) | `architecture.js`: each device now emits a **dark-glass face** inset inside its own body and a **4-segment emissive blue status ring** flush with the true device footprint (`tc-blue`). Chip text is now the canonical `device.id`. New `SURFACE_TC300_LABEL_POLICY` + `resolveTc300LabelPlacement` (surfaces.js) own chip visibility; `setEvidenceCamera` applies it before every other camera branch. `tc300` was removed from `SURFACE_NETWORK_LABEL_POLICY.culledKinds`. | `correction 1: every TC300 is a surface device with a dark-glass face and a blue status ring` — derives face/ring AABBs from the **structural device size** and fails if any ring segment escapes the true footprint (device-inflation guard). `correction 1: TC300 ID chips are readable and distance-culled at the five evidence presets` — projects every chip through the real preset; the cull is the projected-pixel floor + the frustum, never a hand-picked list. |
| 2 | Terminal cue: the drop must land ON the device face | The oversized centre cube is gone. The drop conductor is **clipped at render time** to the device's top face (`y + size[1]/2`) — the accepted route path is untouched — and a small `[0.05, 0.03, 0.05]` cable **gland** (rs485 layer) caps it on the face. | `correction 2: every RS-485 drop terminates on the TC300 face behind a terminal gland` — derives `faceTop` from the device body, asserts the arriving conductor's AABB min-Y **equals** it, that the gland is smaller than the device, and that **no** orange box contains a device body any more. |
| 3 | Move the board out of the UG67 → router sightline | `NETWORK_SCHEMATIC_BOARD` moved to `[-4, 10.5, -40]`, `rotationY 0.7387` — **behind** the shell (past `footprint.z[0]`) and **above** every roof, turned to face the complete-network camera. `canvasPointToBoardWorld`, the frame members and the leader are now orientation-generic; two masts carry the raised board. `network-schematic-detail` is **derived from the board** (`boardDetailPreset()` in camera.js), so board and camera can never drift apart. | `correction 3: the diagram board occludes neither the shell nor the Ethernet run at complete-network` — projects the board quad and every band/auditorium/Ethernet/external point through the real preset and fails if **any** scene point falls inside the board quad. Also re-proves the two guarded facts (front face toward **both** cameras; detail camera frames the whole board) using the board's **real normal** instead of the old `abs(camera.x - board.x)` shortcut, plus a sightline-clearance sweep over the roof line. |
| 4 | Differentiate LoRaWAN from Ethernet | New `SURFACE_LORAWAN_DASH` (period 1.1 m, duty 0.42 → gap longer than mark); dash count is **derived per lane from its own length** (`resolveDashCount`). LoRa width 0.14 → 0.09. `networkBlue` split into **`lorawanBlue` `#38bdf8`** and **`ethernetBlue` `#2563eb`** (materials.js), taken from the spec palette; Ethernet stays a continuous tube. Arrowhead samples are snapped onto a rendered dash (`snapSampleToDashCentre`) instead of relying on a hardcoded 7-cell grid. | `correction 4: LoRaWAN reads dashed and cyan while Ethernet stays a continuous, deeper blue tube` — asserts the longest dash is shorter than the shortest continuous Ethernet segment, that no Ethernet instance carries a `dashIndex`, that both colours **equal the spec palette** and separate in RGB *and* luminance, and that every LoRa arrowhead still touches a dash under the new policy. |
| 5 | Restore the specified RS-485 green | New `addTrayPolyline` carries the tray **one half-cross-section off** the conductor (`resolveTrayOffset`), so their faces touch and the green is exposed. `setNetworkMediaWidthScale` scales the stand-off with the cross-section, so the tray can never close over the conductor at the complete-network media scale either. | `correction 5: the RS-485 conductor is exposed beside its tray, at any evidence media scale` — asserts the tray declares a non-zero offset and that **no conductor is contained by its own tray at scale 1 or at the evidence scale**; the offset is re-derived from the two cross-sections. |
| 6 | Suppress UG67 RF ticks in `state=architecture` | `resolveNetworkEvidenceVisibility(camera, { visualMode })` now gates `ug67RfDetail` on engineering; `setEvidenceCamera` passes the live label policy. | `correction 6: the UG67 RF tick marks belong to engineering only` — checks the resolver in both modes **and** drives the built asset through `setLabelPolicy` + `setEvidenceCamera` to assert `rfDetailRoot.visible`. |
| 7 | Nudge `GATEWAY` off the RF2 caption | The UG67 title/subtitle are now **layout boxes** (`ug67Title`, `ug67Subtitle`, `ug67PortCaptions`) sitting in the clear band between the RF1 and RF2 captions; `validateNetworkSchematicLayout` rejects any overlap. | `correction 7: the UG67 node captions and the RF port captions never overlap` — measures every caption box and asserts pairwise non-overlap, plus containment inside the node body; then paints the board and asserts the glyphs are still drawn. |
| 8 | Whole poster bank inside the facade frame | Poster bank moved inboard (backing `x 5.85..12.85`, panels `6.95..11.75`), clear of the entrance bank; `facade` preset pulled back to `[0, 6.5, 62]` so the bank fits at the portrait capture aspect. | `correction 8: the facade preset frames the entire poster bank in both poster frames` — projects the bank's corners through the real preset and asserts they land inside the frame, and that the bank overlaps no entrance. |
| 9 | Concession snack/popcorn/refrigeration cues + lobby recentred | New `popcornUnits` (2 warmers, amber-emissive glass) and `refrigerationUnits` (2 glass-door coolers with product shelves) standing **on the counter deck**, derived from the accepted counter proxy. `lobby` preset recentred on the ticketing/kiosk cluster: `[-5.5, 2.5, 21.4] → [-21, 1.75, 19.2]`. | `correction 9: the concession counter carries popcorn and refrigeration displays` — derives the counter top/extent from the proxy and asserts every cue stands on it. `correction 9: the lobby preset centres the ticketing and kiosk cluster` — projects the ticket counter and asserts it sits within 0.35 ndc of frame centre, uncropped, while the public-band contract from attempt 2 still holds. |

## Collateral change (forced by correction 1)

`kitchen` preset target `[-9, 1.6, 13.2] → [-10, 1.7, 12.6]`. Correction 1 requires the TC300 chip
to be visible at the kitchen preset, and **TC300-05 — the kitchen's own thermostat — projected to
ndc x = -1.04, i.e. just outside the frame** at the accepted target. This is a 1.2 m pan; the camera
position, the fov and the public-band contract are unchanged, and the workline stays framed.

## Test discipline

- Every correction landed as a RED test first: `tests/surface-endpoints.test.mjs` failed to import
  before the code existed, then failed on real assertions (buried conductor, off-frame kitchen chip,
  concentric tray) before each fix.
- Tests **derive**: projected pixels and ndc through the real camera presets, AABB containment from
  the structural device sizes, tray/conductor tangency from the two cross-sections, dash period from
  each lane's own length, colour values from the spec palette (`APP_CONFIG.colors`). A new stub
  Three.js + document harness asserts what the **builder actually emits**, not what the plan promises.
- Six existing tests copied constants this work had to change (board pose, facade/kitchen/detail
  presets, label-policy culled kinds, the LoRa dash source match). Each was updated **and** given a
  derived assertion in place of the literal (e.g. the detail preset is now asserted to be *on the
  board normal*, not to equal a hardcoded triple).

## Test counts

`node --test tests/*.test.mjs` → **125 pass / 0 fail** (114 pre-existing, all still green + 11 new).

Builder exercised against a stub THREE: **83 InstancedMesh draws / 1451 box instances (~17.4 k tris)**
vs the 550 / 750 000 budget. End-to-end camera sweep in `state=engineering&labels=on`:
corridor `TC300-04`; kitchen `TC300-03, TC300-05`; lobby `TC300-01, TC300-14`; sala-3
`TC300-07, TC300-08`; complete-network all 14. In `state=architecture`: **0** TC chips and **no** RF
ticks at every preset.

## Files changed

- `src/scene/architecture.js` — TC300 glass face + status ring + terminal gland; drop conductor
  clipped to the device face; `addTrayPolyline` (exposed conductor); per-lane LoRa dash policy;
  split LoRa/Ethernet materials; TC300 chip text + placement policy; poster bank inboard; concession
  popcorn/refrigeration displays; offset-aware media scaling; RF-detail state gate.
- `src/scene/surfaces.js` — `SURFACE_EVIDENCE_VIEWPORT`, camera basis / ndc projection / quad
  containment helpers, `resolveTrayOffset`, `SURFACE_LORAWAN_DASH` + `resolveDashCount` +
  `snapSampleToDashCentre`, `SURFACE_TC300_LABEL_POLICY` + `resolveTc300LabelPlacement`, LoRa width,
  new detail categories.
- `src/scene/network-schematic.js` — board pose + normal/width-axis/corner helpers, generic
  canvas→world mapping, UG67 caption layout + validation, oriented frame + masts + leader,
  `visualMode` on the evidence resolver.
- `src/scene/materials.js` — `lorawanBlue` / `ethernetBlue` spec entries.
- `src/controllers/camera.js` — facade, lobby, kitchen presets; `network-schematic-detail` derived
  from the board.
- `tests/surface-endpoints.test.mjs` (new, 11 tests); `tests/{surfaces,shell,network-schematic}.test.mjs`
  (copied constants replaced with derived assertions).
- `qa/browser-smoke.mjs` — the board's vertical-occupancy floor encoded the old, occluding board;
  lowered to match the relocated board (see caveat below).

## Caveats — stated plainly

- **No visual QA was possible.** WebGL is unavailable headless in this environment, so every
  screen-space claim above is *derived* (pinhole projection through the real presets), not observed.
- `qa/browser-smoke.mjs` is **not wired to any script** (`package.json` has no `scripts`) and could
  not be executed here. Its board-occupancy floor was the only assertion the board move invalidated;
  I lowered it and left the rest untouched. It passes `node --check`.
- The diagram board still labels the buses `TC01/02/03/04/14` while the model chips now read
  `TC300-01`. The board's bus text is guarded by existing tests and was explicitly praised by the
  judge, so I did not touch it. The two are consistent in meaning, not in abbreviation.
- At `complete-network` all 14 chips are shown, as the correction requires. They are ~45 px wide at
  that distance and a few close pairs may crowd; the correction's wording left no room to thin them.
- At `sala-3` the neighbouring `TC300-07` is also visible through the translucent engineering shell,
  as UC100/BUS chips already were.

## Status

Code and tests complete. No captures, no review, no commit, no verdict claimed here.
