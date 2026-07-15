# Deferred corrections — live ledger

**Why this file exists.** A pass can PASS with non-blocking corrections still open. **P6 re-scores
everything.** Without a live list, every deferred correction arrives at the final gate at once, as a
surprise, with the whole build stacked on top of it.

Rule: when a pass closes, EVERY correction in its passing review that was not applied lands here.
It leaves only when it is (a) applied and re-gated, (b) explicitly absorbed by a later pass that owns
it, or (c) explicitly accepted by the user as a known limitation.

**Status vocabulary:** `open` · `owned-by:<pass>` (a later pass legitimately owns it) · `applied`
· `accepted` (user waived it) · `void` (a later pass made it moot — say why).

---

## From SURFACE (passed 0.81, lineage 2 attempt 3)

Source: `runs/assets/01-shell-circulation-facade/surface-attempt3.review.json`

| # | Correction | Status | Note |
|---|---|---|---|
| S1 | Raise RS-485 saturation toward `#29d67d`: trunks read as pale mint / white glow, not saturated green, at the ug67/kitchen/corridor/complete-network presets. Match the board legend swatch. | `owned-by:lighting-camera` | Emissive-vs-tone-map problem. Lighting L1 a3 traced the real cause (conductor sat INSIDE the 0.18-opacity tray; and `mediaEmissiveIntensity` clipped through ACES to saturation 0.32). **Verify in the lighting gate captures — do not assume.** |
| S2 | Recolour + shrink the LoRaWAN packet/wave pool to the `network_blue #2d9cff` family; it reads as chains of white cubes at complete-network. | `owned-by:lighting-camera` | Same class as S1. Lighting L2 claims it is fixed; **must be confirmed by the blind judge, not by the writer.** |
| S3 | Add arrowheads to the four dashed LoRaWAN edges and the three Niagara→client edges **on the diagram board**. | **`applied`** | See **Closed → S3**. The glyphs already existed; they were illegible (17 px / 5 px of stem). Fixed as a stem invariant derived from `BOARD_ARROWHEAD`. The `GATEWAY` caption nudge from the same review is closed there too — the review named the wrong caption pair. |
| S4 | Reduce engineering shell ghosting (single-layer translucency / depth-sorted / back-face-culled walls). | `owned-by:lighting-camera` | Lighting L1 a2 derived per-layer opacity from a composite ceiling (11 stacked shell boxes → 0.89 alpha). Confirm in the gate. |
| S5 | Strengthen the TC300 status-ring emissive (RING only — the spec forbids inflating device geometry). | `owned-by:lighting-camera` | |
| S6 | Relax the label distance-cull for the endpoint owning the active preset zone (TC300-02 has no chip in the concessions engineering capture). | **`open`** | Lighting L1 a3 says it moved the concessions preset so the chip lands at NDC 0.69 / 47 px. **Unverified in pixels.** Re-check at P6. |

## From INTERACTION-UI (passed 0.81, attempt 1)

Source: `runs/assets/01-shell-circulation-facade/interaction-ui-attempt1.review.json`

| # | Correction | Status | Note |
|---|---|---|---|
| I1 | Add a continuous emissive over-stroke along every edge of the selected path (drop → bus B → UC100-B → LoRaWAN B → UG67 → ethernet → router → internet → Niagara), keeping the base media hue visible. | `open` | Judge scored canonical-network-endpoints 0.83 WITH this defect; node rings alone carry the path. Applying it touches interaction code → re-gate interaction-ui. Decide before P6. |
| I2 | Cap the wave-ring pool max radius (or fade opacity with radius) so tick-30 rings never occlude the UG67 body/labels at the ug67 preset. | `open` | ug67 preset exists to prove the gateway; at t30 a ring nearly fills the frame. |
| I3 | Clamp fault/hot zone halo volumes to their room bounds; reduce through-wall bleed so hot-sala-3 tints only sala 3 from engineering-section. | `open` | Single-zone attribution currently locks in only via the red-ringed device. |
| I4 | Sync Techo/Paredes checkbox states with actual engineering-mode visibility. | `open` | State-reflection gap, no alarm contradiction. Cheap DOM fix; still re-opens the gate if applied. |
| I5 | Center the red fault emissive on the internet-cloud geometry under its INTERNET label in fault-internet. | `open` | Label-object offset makes red-vs-gray momentarily ambiguous at complete-network. |

## From OPTIMIZATION (passed 0.82, attempt 1)

Source: `runs/assets/01-shell-circulation-facade/optimization-attempt1.review.json`

| # | Correction | Status | Note |
|---|---|---|---|
| O1 | Increase label sprite texture resolution / render scale so device IDs resolve crisply at 2064-wide captures (UC-B/UC-D soft at 4x). | `open` | Pre-existing (same softness in interaction-ui and earlier evidence — judged and passed 3 times). Re-check at P6; P6's higher-res hero captures may make it moot or worse. |
| O2 | Architecture state renders the external chain as unlabeled floating cubes with no links (neutral/net arch-t0). Hide the proxies in architecture state or keep labels/links attached. | `open` | Pre-existing since blockout (`state=architecture` hides network layer but not the external proxies). The P6 architecture capture includes these frames. |
| O3 | Clamp the selected-device pulse to a minimum marker scale so TC300-08 never reads as vanishing at close range (sala3 t30). | `open` | Interaction polish; touching it re-opens interaction-ui. Only worth it if the P6 judge flags it. |

## From P6-FINAL LINEAGE 4 (passed 0.80, attempt 1 — SHIP VERDICT, 2026-07-15)

Source: `runs/assets/01-shell-circulation-facade/p6-final-l4-attempt1.review.json`. The judge's
own recommendation: "Accept and ship... not worth another full gated round unless the client calls
out the roof ducts." M1-M5 adjudicated (M2/M3/M5 verified landed; M1 landed on the charcoal pole
on shaded faces; M4 insufficient). These five are USER decisions for a hypothetical future round:

| # | Correction | Status | Note |
|---|---|---|---|
| S1 | Galvanized shaded-face response (metalness 0.4-0.6 or env fill) so vertical duct faces sample ≥RGB(120,125,130). | `open` | The judge's only "client might call this out" item. |
| S2 | Distance-scaled minimum chip size at the top preset (zone-name ≥11px cap height). | `open` | Chips countable 14/14; names blurred at nadir range. |
| S3 | More roof-off floor fill (or lighter tier material) until step edges read. | `open` | M4's second miss; probative shot only. |
| S4 | Bigger checkpoint scanner screen + emissive bloom. | `open` | |
| S5 | Tie chip visibility to the roof layer (or re-anchor to zone centroids) so badges never float over hidden units in roof-off exteriors. | `open` | Contract nuance the spec didn't anticipate: chips are exterior-visible but their anchors are roof-layer. |

## From P6-FINAL LINEAGE 3 (passed 0.82, attempt 1 — superseded by lineage 4)

Source: `runs/assets/01-shell-circulation-facade/p6-final-l3-attempt1.review.json`. L3 applied and
re-gated: z-fighting by construction (299→0 coplanar pairs), RTU master at the V10 two-section
read, service-lane alignment (judge: "ordered service lane, not clutter"), 8 duct branches + 14
condensate drains. Judge's headroom verdict: ONE polish round of upside remains (~0.03-0.05),
then further attempts are spend without score movement. These five fold into the L4 feature round
(temperature chips + top view) as that single polish round:

| # | Correction | Status | Note |
|---|---|---|---|
| M1 | Galvanized read on duct mains + 8 branches (light-metal albedo/metallic response) — they render near-black. | `owned-by:L4` | The spec's declared read is absent; straps/elbows carry all separation. |
| M2 | Dress the checkpoint podiums: counter cap, scanner/POS block, one staff proxy in the lane. | `owned-by:L4` | Successor of L1/P1 — preset frames the right place; fit-out still bare. |
| M3 | Spine duct group hovers unsupported in the roof-off probative view — parent to roof toggle in architecture, or add support stubs. | `owned-by:L4` | Cousin of user item 7. |
| M4 | Small fill lift in the roof-off state so seating tiers read. | `owned-by:L4` | Probative shot only; gated lighting untouched. |
| M5 | Nudge the two westmost public-band units apart (or stagger drains) — they merge at the facade glancing angle. | `owned-by:L4` | |

## From P6-FINAL LINEAGE 2 (passed 0.78, attempt 1 — superseded by lineage 3)

Source: `runs/assets/01-shell-circulation-facade/p6-final-l2-attempt1.review.json`. The L2 round
APPLIED and re-gated: P1 (checkpoint preset — passed, but see L1 below), P2 (external blocks
hidden in architecture — judge-verified), P3 roofs (2/4/2 reads, fascias carry articulation), P4
(display frame body — pair differs), P5 (sala lights-off floor — borderline, see L2 below), P6d
(technical preset — reframed, but see L3), 1b kitchen (hood→duct contact crop-verified), user items
7/8/9 (double roof / smooth zoom / boot warm-up — roof-off probative shot judge-verified) and the
14-RTU amendment (curb contact crop-verified). New polish rows for a future round:

| # | Correction | Status | Note |
|---|---|---|---|
| L1 | Checkpoint gate hardware (pedestals with wings/arms, queue rail, desk face) — masses read as featureless grey blocks. | `open` | Successor of P1: the preset now frames the right place; the fit-out itself is the remaining read. |
| L2 | Raise sala3 lights-off seat-region fill (~3.3/255 vs walls 6/255) so silhouettes clear the readability floor. | `open` | Successor of P5: pair differs clearly; silhouettes borderline. |
| L3 | Re-aim/lower technical_room camera + always-on cabinet light so UC100-B reads through the cut. | `open` | Successor of P6d. |
| L4 | Break near-pure-black exterior upper walls/fascias with panel seams or lighter charcoal. | `open` | New: large exterior regions read as voids at first glance. |
| L5 | Make all 14 RTUs countable in one probative view (nudge the occluded unit or widen neutral framing). | `open` | 13/14 visible at neutral; fleet corroborated across views. |
| L6 | Expose a visible stub of each RTU supply drop at the curb edge (or a cutaway detail view). | `open` | The drop-into-zone contract is implied by curb contact, not shown. |

## From P6-FINAL (passed 0.79, attempt 1 — superseded by lineage 2)

Source: `runs/assets/01-shell-circulation-facade/p6-final-attempt1.review.json`. The run is closed:
every row below is a USER decision for a future iteration, none blocks delivery. The judge also
left headroom recommendations (roof articulation, material variation, checkpoint/kitchen detail) —
see `headroom_recommendation` in the review.

| # | Correction | Status | Note |
|---|---|---|---|
| P1 | Lower/pull back the ticket_checkpoint preset (or auto-hide the public roof there) so the checkpoint fit-out is framed instead of the roof plane. | `open` | Its own required view never shows it; front-of-house still passed 0.76. |
| P2 | Bind the external schematic blocks + system diagram board to engineering/internet visibility so architecture state shows only the building. | `open` | Same defect as O2, now confirmed by the P6 judge (state-pair note). |
| P3 | Re-articulate per-family roof steps (or lighten roof material) so 2/4/2 massing reads from exterior final views. | `open` | Articulation drift vs blockout; footprint/bands unchanged. Judge suggests spending tri headroom (4.1% used). |
| P4 | Make display frame 1 change the menu body, not only the header (564 px delta today). | `open` | Weakest animation pair in the set. |
| P5 | Raise the lights-off emission floor for sala aisle/step LEDs so seating silhouettes stay readable. | `open` | sala3-lightsoff near-black outside screen/exits. |
| P6d | Reframe the technical preset through the section cut (service corridor, wall, doors, open UC100-B cabinet). | `open` | technical-arch shows mostly roof planes. |

### Adjudicated by the P6 judge (previously open)

| # | Was | Now |
|---|---|---|
| S6 | TC300-02 chip missing at concessions engineering capture — unverified in pixels. | **`applied`** — chip visible in p6-final-attempt1-concessions-eng.png (orchestrator pre-look) and the judge raised no label-cull defect at concessions. |
| X1-delta | TC300-03 chip newly visible at lobby (viewport correction). | **accepted by gate** — visible in p6-final-attempt1-lobby-eng.png; judge verified TC300-03's drop contact in a native crop and flagged nothing. |
| O1 | Label sprite softness at 4x. | subsumed → P6 defect #8 note (TC300 ring cue unresolvable; labels carry recognition). Remains `open` as polish. |
| O2 | Orphan external cubes in architecture state. | superseded by **P2** above (same defect, judge-confirmed). |
| O3 | Selection pulse min scale. | `open`, unflagged by P6 — lowest priority. |
| I1–I5 | interaction-ui polish corrections. | `open`, none re-flagged by the P6 judge except the TC300 ring visibility (I5-adjacent, see P6 defect #8). |

## From LIGHTING-CAMERA lineage 1 (exhausted — see `history/lighting-lineage-1/`)

Not deferred: lineage 1 produced no PASS, so its corrections are the lineage-2 work order, not debt.

## Known spec/tooling defects (these are NOT pass corrections — they are bugs in the contract)

| # | Defect | Status | Note |
|---|---|---|---|
| X1 | The gated surface test projects the poster bank through `SURFACE_EVIDENCE_VIEWPORT` at **0.8 portrait aspect**, while `capture.mjs` renders **4:3**. Two different truths about the same image. | **`applied`** (2026-07-14) | MEASURED truth on the gated PNGs: canvas-only evidence is **1.0818** (688×636 CSS; surface 2752×2544@DPR4, lighting 2064×1908@DPR3) — neither 0.8 nor 4:3. `SURFACE_EVIDENCE_VIEWPORT` corrected to 688×636; the four legibility floors re-expressed ×(636/900) so their PHYSICAL meaning in the PNG is unchanged (unit conversion, not recalibration). 211/211 green. Runtime delta measured exhaustively (84 chip×preset combos): exactly ONE — TC300-03 becomes visible at the lobby preset, because the real canvas frames it and the 0.8 model wrongly cropped it (same defect class as S6). Strictly additive; adjudicated by the P6 judge on fresh captures. The 4.5 m facade offset stays: judged and passed by three blind reviews; reverting would reopen gates for zero evidence gain. |
| X2 | `gate-state.mjs` cannot model a lineage reset: it reads the exhausted lineage's FAIL reviews and reports `drift` against a legitimately reset cache. | **`applied`** | FIXED in the kit. It now parses `<pass>[-l<lineage>]-attempt<N>`, derives from the **active (highest) lineage only**, and skips `history/`. Verified: `lighting-camera passed (attempts 1, score 0.8)` — 1 attempt, not 3, because lineage 1's three failures are archived history, not live debt. **Note on how I had been "fixing" it: by copying artifacts under fake names to satisfy the checker. That patch is worse than the bug — it is a lie a later reader takes for truth. Removed.** |
| X5 | **Alarm messages are ENGLISH strings in a Spanish (es-MX) UI.** `src/alarms.mjs` emits e.g. `TC300-05 · High temperature in Cocina y preparación (31.2 °C)` — half-English, half-Spanish, in the `#alarm-list` a blind reviewer reads at every fault/hot capture. | **`applied`** (2026-07-13/14) | All four alarm kinds translated to neutral es-MX in `src/alarms.mjs` (verified in code: `Temperatura alta en …`, `… sin comunicación; sus datos no llegan a Niagara`); identifiers stay English. Confirmed in pixels by the interaction-ui gate: the judge read the alarm list in every fault/hot capture and reported full HUD/list coherence (state-pair 0.84), no language defect. Message table in `runs/apply-asset-01-interaction-ui-attempt1.md` §X5. |
| X4 | **The design has ZERO reference images.** `spec.references[]` is entirely textual (Honeywell datasheets, engram observations, P1 notes). The only PNGs in the repo are our own renders. But `GATES.md` §P6 demands a comparison sheet of *reference\|render same-viewpoint pairs*, and the app carries a `reference-match` camera preset that matches **nothing**. | **`applied`** (2026-07-14) | `design-spec.yaml` → `evidence_contract.p6.comparison: spec-only`, `reference-match` dropped from `p6.required_views`, `comparison_sheet` rewritten to blockout-vs-final strip + textual promises. The app's `reference-match` camera preset stays as a lookdev angle (code untouched, gates intact). Lighting's historical contract rows left as judged. P3 revalidation of the touched fields delegated. |
| X3 | The probe loads the DEFAULT camera, which was reframed onto the hero band — so it under-reads (59 draws / 708 tris) and is not a representative load. The 27 PointLights' cost is fragment-side and invisible to a draw/tris probe entirely. | `owned-by:optimization` | Tooling half FIXED: `probe.mjs` now reads three.js `renderer.info` (`window.__qaRenderInfo`) and takes `--url-suffix`, so it measures real state/camera loads — interaction-ui gate measured worst-case 195 draws / 25,964 tris at `?camera=complete-network&state=fault-internet&links=all` (the old wrapper reported 59/708 for the SAME scene). Remaining half is the optimization pass's duty: measure the required states honestly, including noting that PointLight fragment cost stays invisible to draws/tris. |

---

## Closed

### S3 — arrowheads on the LoRaWAN and Niagara→client board edges (`applied`)

**What the review claimed:** the four dashed LoRaWAN edges and the three Niagara→client edges carry
no arrowheads, so direction is explicit only on RS-485 and Ethernet.

**What was actually true.** The glyphs already existed. `createNetworkSchematicLayout` marks every
edge `arrowhead: true`, `validateNetworkSchematicLayout` asserts it, and the texture draws
`arrow(...)` over `layout.edges` — all 14 of them. Zooming
`runs/assets/01-shell-circulation-facade/surface-attempt3-eng-network-schematic-detail.png` to native
resolution shows the LoRaWAN arrowheads plainly, and shows the client-drop arrowheads collapsed into
the fan-out bend. **The reviewer read a downscaled render, not the code.** The complaint is still
real, but the defect is legibility, not absence.

**Root cause (geometric, measured).** The arrowhead glyph spans `tipInset + length` = 25 px. The
bare stem left on each terminal segment before the glyph starts was:

| edge family | stem before | stem after |
|---|---|---|
| rs485-A..D | 307 px | 307 px |
| **lorawan-A..D** | **17 px** | **43 px** |
| ethernet-ug67-router / router-internet / internet-niagara | 86 / 20 / 25 px | unchanged |
| **ethernet-niagara-pc/tablet/smartphone** | **5 px** | **27 px** |

Exactly the two families the review named were the two starved of stem. With 17 px the LoRaWAN
arrowhead is crammed between the last dash and the RF port dot and merges with it; with 5 px the
client arrowhead starts at the bend and renders as a corner blob.

**What changed** (all in `src/scene/network-schematic.js`, reusing the existing `BOARD_ARROWHEAD`
authority — no second arrowhead path was invented):
- New invariant in `validateNetworkSchematicLayout`: every edge's terminal segment must clear the
  whole glyph plus at least the glyph's own base width (`halfWidth * 2`) of bare line. This replaces
  the weaker "not shorter than its own arrowhead" assert.
- LoRaWAN lane elbow pulled back (`x` 1086 → 1060, with the preceding bend 1032 → 1014) so the run
  into the RF port carries a dashed stem and then the arrowhead.
- Client boxes dropped (`y` 730 → 752) so each fan-out drop has a stem before its arrowhead. Still
  inside the safe bounds; `layout.overlaps` and `layout.intersections` remain 0.

**RED tests that prove it** (`tests/network-schematic.test.mjs`):
- `every board edge leaves a visible stem, so its arrowhead reads as an arrow and not as a blob` —
  derives the edge list from `layout.edges` and the threshold from `BOARD_ARROWHEAD`; no literals.
  RED: `lorawan-A leaves only 17.0 px of stem before its arrowhead (needs 18)`.
- `layout validation rejects a stemless arrowhead and a crowded node caption` — mutation test; proves
  the invariant is *enforced*, not merely satisfied.
- `every edge of the canonical chain is drawn with its own arrowhead glyph` — replays the recorded
  canvas path calls, counts closed triangles, and matches each against a tip derived from the edge
  and `BOARD_ARROWHEAD`. **Honest note: this one was GREEN on the untouched code.** It is the
  regression guard the review asked for, and it documents that the glyphs were never missing.

The board gained no edge: the edge list is still derived from the topology model. Evidence-only.

### GATEWAY subtitle vs RF2 caption (`applied`, with a correction to the correction)

The review asked to nudge `GATEWAY` **up** so it stops overlapping the RF2 caption. Measured against
the layout boxes, **there was no overlap, and `GATEWAY` was not the crowded caption**:

| pair | gap before | gap after |
|---|---|---|
| `UG67-01` vs RF1 | **6.0 px** | 12.0 px |
| `GATEWAY` vs RF2 | 17.5 px | 11.5 px |

The tight pair was the *title* against RF1, with 17.5 px of unused slack sitting below the subtitle.
Nudging `GATEWAY` up, as literally instructed, would have pushed the title further into RF1 and made
the real crowding worse. Instead the whole node-caption block was **centred in the clear band**
between the RF1 and RF2 captions (`ug67Title.y` 225 → 231, `ug67Subtitle.y` 256 → 262), which is what
the correction was reaching for.

**RED test:** `the UG67 node captions keep clearance from every RF port caption` — computes the
boxes pairwise and requires `BOARD_CAPTION.padding / 2` of clearance (a caption already reserves
`padding` inside its own box; two independent captions keep half of it between them). No literal `y`
is asserted. RED: `UG67-01 crowds the RF1 caption (6.0 px, needs 8)`.

### Test counts

`node --test tests/*.test.mjs` → **184 pass / 0 fail** (180 before; +4 new tests). Files touched:
`src/scene/network-schematic.js` and `tests/network-schematic.test.mjs` only.

**Not verified in pixels.** This env cannot render WebGL headlessly, so the fix is proven by derived
unit tests and by canvas-op replay, not by a new capture. The next capture should confirm the arrows
read at render scale.

---

## P6 entry checklist

Before P6 opens, every row above must be `applied`, `accepted`, or `void` — or P6 starts with known
debt and the final score is not a surprise, it is arithmetic.

Currently **open and unowned: S6, X1, X2, X3.** (S3 closed — see **Closed** above.)
