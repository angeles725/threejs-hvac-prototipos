# Nave Panccadia — ground floor + upper storey + roof + plant + doors + furniture + named spaces + principal facade + structural grid

Two-storey 3D model, now roofed, of an industrial bakery plant on Av. Del Curtidor (client: Rotzinger León),
reconstructed from the client's AutoCAD 2007 DWG.

**Not a design3d run.** Unlike the equipment designs in this folder, this one was NOT authored from a
DesignSpec — it was RECONSTRUCTED from a real CAD drawing under the Research-SDD loop. There is no
`design-spec.yaml` and no gated pass ladder; the evidence lives in a citation corpus instead.

| | |
|---|---|
| Viewer | **[`nave-panccadia-3d-v4.html`](nave-panccadia-3d-v4.html)** — self-contained, opens from the filesystem by double-click. Supersedes `v3` |
| Geometry (new in v4) | [`doors.json`](doors.json) · [`facade-3d.json`](facade-3d.json) · [`grid-full.json`](grid-full.json) · [`sections.json`](sections.json) |
| Geometry | [`ground-floor.json`](ground-floor.json) · [`upper-floor.json`](upper-floor.json) · [`roof.json`](roof.json) · [`equipment.json`](equipment.json) · [`recovered-blocks.json`](recovered-blocks.json) · [`furniture.json`](furniture.json) · [`rooms.json`](rooms.json) · [`rooms-pa.json`](rooms-pa.json) |
| Research corpus | `~/investigacion/nave-panccadia` (Research-SDD target #18, **35 cited blocks**, coverage 37/39) |
| Source DWG | preserved in that corpus at `raw/`, `sha256 053750e0…948ee7f3` (the converted DXF is `f1f688e8…635d18b2`) |

## What changed in v4

`v3` shipped before Blocks 28–35. Four things it did not have:

| | |
|---|---|
| **The roof never drew.** | The viewer read `s.eave` from stations that carry `eave_w`/`eave_e` — 52 stations of NaN. It had been silently absent since the roof was built, and no arithmetic check could see it: the defect was in the consumer, not the data. Found by opening the page in a browser, which the gate had claimed was impossible. |
| **Seven of the eight doors were missing.** | The openings gap had been closed on an INSERT census, and six of the eight doors here are drawn as loose geometry, which no census of block references can see. The leaf sits on `PUERTAS` and the swing arc on `PROYECCIÓN`, so a one-layer search finds half the symbol. |
| **No facade.** | `FACHADA PRINCIPAL` is a 1:1 elevation — 4 of 5 annotated levels exact to 10 mm — registered to the plan grid to 0.9 mm. Its 24 measured elements now stand on the south-east street front. |
| **No grid.** | 21 vertical and 19 horizontal axes, found by bubble rather than by a search band. Overlay only, off by default. |

Verified in a real browser, not just arithmetically: **99/99** model checks and a page that loads with
**zero console errors or warnings** across 18 controls.

## Storey control

The viewer opens with both storeys. Buttons in the HUD:

| Button | Effect |
|---|---|
| **Upper storey** | shows/hides the whole second floor — deck, walls and columns |
| **Upper walls** | hides just the partitions, leaving the deck readable |
| **Ground floor only** | one click to strip the upper storey away and read the hall |
| **Mezzanine** | drives the upper deck |
| **Roof** | shows/hides the roof |
| **Roof off — read the plan** | one click to strip the roof and look down into the building |
| **Equipment** | shows/hides the 35 machines |
| **Equipment labels** | shows/hides their name tags |
| **Doors** | the 9 leaves on 8 positions, with the 4 drawn swing arcs on the slab |
| **Facade** | the 24 measured elements of `FACHADA PRINCIPAL`, on the south-east face |
| **Grid** | the structural grid as a slab overlay — **off by default**, a legend rather than geometry |
| **Doors** | shows/hides the two recovered leaves |
| **Furniture** | shows/hides the 60 triaged pieces |
| **Spaces** · **Space names** | shows/hides the ground floor's 9 mapped regions and their labels |
| **Spaces (upper)** · **Upper space names** | shows/hides the upper storey's 7 mapped rooms and their labels |
| **Columns** · **Top view** | as before |

## What the model contains

### Ground floor

| Element | Value | Confidence |
|---|---|---|
| Floor area (outline) | **1,101 m²** | measured — convex hull of wall geometry |
| Bounding box | 34.67 × 53.34 m | measured |
| Wall runs | 156 (344 m of centreline) | 79 with measured thickness, 77 assumed 0.15 m |
| Concrete columns | 21, varied sections | measured |
| Steel columns | 28 hollow **HSS 8×8×1/4** (203 mm, 6.3 mm wall) | measured; grade inferred from section |
| Levels | slab 0.00 · mezzanine +3.15 · roof +9.20 | measured from 1:1 sections |
| Plan geometry | **26.2 % oblique** — never snap this to a grid | measured |

### Upper storey (`PLANTA ALTA`, +3.15 m)

| Element | Value | Confidence |
|---|---|---|
| Slab | **297.3 m²** = 284.0 drawn `PROYECCIÓN` + 13.3 laboratory annex | measured |
| Wall runs | 183 (322 m) | 98 with measured thickness, 85 assumed 0.15 m |
| Columns | 22 concrete + 6 steel | measured |
| Floor level | **+3.15 m** | 14 `NPT±3.15` annotations on the plan, plus the sections |
| Registration | pure translation of (48.9886, 0.2253) from the drawn plan | 34/36 columns matched |
| Programme | 18 named spaces — offices, meeting room, HR, server room, canteen, lockers, washrooms, laboratory, disinfection, roof terrace | drawing text |

**The upper storey is a strip, not a second full floor.** The hall below is double-height; the
occupiable second floor runs along the eastern side, and the rest of the upper plan is labelled
`AZOTEA` (roof terrace). Anything that extrudes the full plan outline as an upper slab roofs over the
hall.

### Roof (`+7.4 … +9.5 m`)

| Element | Value | Confidence |
|---|---|---|
| Form | symmetric **gable on steel trusses** | measured — three transversal sections |
| Pitch | **10 %** (1 in 10, ≈5.7°) both slopes | measured — six independent fits, spread **0.16 pp** |
| Ridge | **oblique in plan**, travelling 9.68 m across the length | measured at 3 stations, straight-line fit (residual 0.79 m) |
| Apex | 8.54 – 9.48 m | derived; agrees with the three measured apexes to **±0.26 m** |
| Eaves | 6.87 – 8.67 m | derived from the pitch; the drawing measures 7.44 – 8.03 m |
| Extent | plan Y 219.66 – 260.94 | measured — the run the longitudinal section draws straight |

**The ridge is oblique because the nave narrows.** Every section ends on the same straight east wall
while the west wall is oblique, so the building goes from 34.81 m wide at section C-C' to 23.66 m at
A-A'. The ridge follows.

**The gable stops short of the south end on purpose.** South of plan Y 219.66 the upper plan is
labelled `AZOTEA` — a flat roof terrace, not this gable. That area is deliberately left unroofed
rather than roofed on a guess.

### Industrial plant (`PDF2_*` layers)

**Authored geometry, not a traced PDF underlay** — the footprints are rectangles at round dimensions
that repeat to the millimetre across instances. **35 machines placed**, 26 of them named:

| Equipment | Footprint (m) | Count |
|---|---|---|
| cámara de fermentación · `ISOPAN 4C2P` | 2.33 × 2.24 | 1 |
| horno rotativo · `SVP-3` | 2.07 × 2.05 | 2 |
| `LAMINADORA` | 3.32 × 1.06 | 1 |
| mesa 3x1 | 3.01 × 1.01 | 3 |
| horno dominó · `2T6040` / `4T6040` | 1.63 × 1.63 | 2 |
| fermentadora · `ISOPAN 2C1P` | 2.20 × 1.20 | 1 |
| ultracongelador | 2.18 × 1.02 | 1 |
| Amasadora / Batidora | 1.02 × 1.12 | 4 |
| Horno convección · `ECOFRAN` | 1.16 × 1.29 | 2 |
| estufa · freidora · Báscula · Cuentalitros | — | 4 |

**A free unit check fell out of this.** The label `mesa 3x1` sits on a rectangle measuring
3.009 × 1.009 m. A table called "3 by 1" is 3 m by 1 m — a fourth witness that 1 drawing unit is
1 metre, and the first SEMANTIC one (the other three were geometric).

### The two doors that were not in the DXF

The DXF has no doors. It turned out `dwg2dxf` **dropped 32 anonymous block definitions** on the way
out of the DWG — it wrote the generic `BLOCK_HEADER` name (`*U`) instead of the unique name that
lives on the `BLOCK` entity one level in (`*U116`, `*U183`, …), so 36 inserts collapsed onto a single
identifier that was never written. Reading the DWG by a second route (`dwgread -O JSON`) recovered
all 48 of them.

| Leaf | Length | Placement |
|---|---|---|
| `*U116` | **2.715 m** | sits **4 mm** from a wall line, filling a **2.778 m opening** |
| `*U183` | **1.393 m** | drawn **OPEN**, perpendicular to the walls it spans |

`*U116` is the **first and only certified opening** in this reconstruction. Inferring the rest from
the gaps between wall runs was tested and refuted — see below.

### Furniture (`MOBILIARIO`)

The layer has **4,946 entities** and that number is misleading: **4,408 lie outside both plans** —
they are the furniture drawn in ELEVATION inside the section island. Four filters, each of which
rejects, leave **60 real footprints** (37 ground, 23 upper). They repeat like catalogue items: nine
at 0.500 × 0.400 m, six at 2.540 × 1.100, four at 1.201 × 1.001.

Round tables were given a fair test — circles are converted to polygons rather than skipped — and
then rejected on their own merits: every in-plan circle has a radius under 13 cm, so they are
symbols.

### Named spaces — and where the missing doors are

There is no polygon in the drawing to look a room label up in: the walls are open segments. So each
of the 21 ground-floor labels is **flood-filled** from its own position — and that choice answered a
question the geometry could not.

**Every label reaches the same 1,029.96 m².** The interior is ONE connected space, because every room
has a doorway and one doorway merges two spaces. That is the trace the missing doors leave.

Sealing every collinear gap up to a door width and re-flooding closes real rooms, and the sweep has a
**plateau**:

| seal ≤ | gaps closed | rooms enclosed |
|---|---|---|
| 1.2 m | 55 | 5 |
| **1.8 m** | **67** | **10** |
| 2.4 m | 76 | **10** |
| 3.0 m | 84 | 11 |

Nine more gaps sealed between 1.8 and 2.4 m close no additional room. **The doorways are 1.8 m or
narrower**; wider gaps are open passages.

**The cold rooms close**: `CÁMARA DE REFRIGERACIÓN` **40.4 m²**, `CÁMARA DE CONGELACIÓN` **30.3 m²**.
Their doorways are those gaps. Also mapped: cuarto de repostería/laminado 96.0 m² (one region, two
labels), bicicletas y motos 56.2, refrigeración ×2, vigilancia, bodega, cuarto hidráulico.

Eleven spaces still leak and most of them should — `PASILLO DE SERVICIO`, `ÁREA DE TRABAJO`,
`ESTACIONAMIENTO`, `CARGA Y DESCARGA` are circulation. Four that arguably should close
(`BAÑO`, `CUARTO DE MÁQUINAS`, `DESINFECCIÓN`, `VERTEDERO`) were left leaking rather than forcing
them shut by widening the seal until they complied.

Rooms are painted as their **exact covered cells**, never as bounding boxes.

Ten labels close, but they are **9 distinct regions, 259.3 m²**: `CUARTO DE REPOSTERÍA` and
`CUARTO DE LAMINADO` reach the same 96.02 m² fill, so they are one space under two names.

### Named spaces upstairs — and the plateau that was left alone

The same flood runs over the upper storey's own wall fabric. Three things about it are worth knowing.

**The "20 upper labels" were never 20 spaces.** They are **17 rooms + `AZOTEA` + 2 sheet
annotations** — `PLANTA ALTA` and `ESC 1:100` sit *below* the plan, at negative Y: they are the
drawing's title and scale. The 18 real spaces match, exactly, the independent census made when the
storey was first mapped.

**`LABORATORIO` lands in the annex.** That is the strip added to the slab because the `PROYECCIÓN`
outline stops short of it — and here it is confirmed again, by a completely different measurement
(does the label fall inside the polygon?) than the one that established it.

**The seal sweep upstairs has TWO plateaus, and only one was used:**

| seal ≤ | gaps closed | labels | **distinct regions** | area |
|---|---|---|---|---|
| 1.2 m | 85 | 6 | 6 | 76.87 m² |
| **1.5–2.1 m** | 93–117 | 7 | **7** | **81.30 m²** |
| 2.4 m | 123 | 8 | 8 | 87.75 m² |
| 2.7–3.5 m | 130–161 | 11 | 9 | 153.29 m² |
| 4.0–5.0 m | 169–183 | 11 | 9 | 145.6 → 142.1 m² |

The **1.5–2.1 m** plateau is adopted: it overlaps the ground floor's band, which is what one
building's door catalogue should do. The **2.7–3.5 m** plateau is real — it is flat over three widths
and it lands on the 2.778 m doorway recovered from the DWG — but it was **not** adopted, because the
two extra rooms it buys come with a 65.54 m² region that `COMEDOR`, `ÁREA DE LOCKERS` and `SITE` all
reach at once. A server room open to a canteen is not a plausible plan, and widening the seal until
more rooms appear would be fitting the threshold to the answer. It is recorded as an open question
instead.

The seven that close, all **100 % on the slab**:

| Space | Area |
|---|---|
| BAÑO HOMBRES | 30.01 m² |
| BAÑO MUJERES | 19.24 m² |
| PRIVADO | 16.66 m² |
| OFICINA | 6.46 m² |
| ARCHIVO | 4.43 m² |
| BAÑO | 2.41 m² |
| BAÑO M | 2.09 m² |

**`AZOTEA` never closes**, and that is what makes the rest mean anything: a method that can turn a
roof terrace into a room is not measuring, it is just filling. It stayed open at every width tested.

81.30 m² is **27 % of the 297.3 m² slab**. The rest is open-plan office and circulation this method
cannot bound — not floor shown to be empty.

## What it does NOT contain — read before reusing

- **No door openings**, on either storey. All 47 `puerta 1.20` block inserts in the DWG lie OUTSIDE
  the plan (scattered from X=6.56 to X=608), and the `PUERTAS` layer holds no swing arcs inside it.
  The doors were never placed as objects, so they are not reconstructable from this drawing.
- **Equipment HEIGHTS are an assumption, and a large one.** The plans give footprints; the section
  island carries no `PDF2_*` geometry at all, so not one machine height is measurable anywhere in
  this drawing. The build uses a stated convention for bakery plant (rotary oven 2.20 m, mixers
  1.40 m, tables 0.90 m…). The equipment is drawn in its own colour so it cannot be mistaken for
  measured fabric.
- **8 drawn shapes are unnamed**, and 3 labels — `Báscula`, `Rebanadora`, `mesa 2x1` — name equipment
  with no drawn footprint at all.
- **Door leaf height (2.10 m) is stated**, not drawn — the drawing gives no door height anywhere.
- **Only 2 openings of the whole building are known.** The other 37 `puerta 1.20` blocks sit outside
  the plan, and the gap-inference route is refuted.
- **The 34 recovered `MOBILIARIO` symbols are carried but not placed** — they are in
  `recovered-blocks.json`, waiting for the furniture pass.
- **Furniture heights are worse than assumed — they are unkeyable.** The equipment at least has
  labels, so a height can be keyed off a name. `MOBILIARIO` carries no text inside either plan at
  all. Every piece takes one stated 0.90 m.
- **The doorways are not located individually.** The seal test is evidence about the POPULATION of
  gaps, not about any single one. Only the two recovered leaves mark specific openings.
- **Wall heights are an ASSUMPTION** (ground 3.15 m, upper partitions 3.00 m, low walls 1.10 m). The
  drawing states floor LEVELS, never wall heights. The viewer's HUD labels these as assumptions.
- **The roof's EXTENT is an extrapolation.** The pitch and the ridge are certified at three drawn
  cuts only (plan Y 228.7 – 244.1); the rest of the 41 m run applies them beyond their evidence.
- **What the longitudinal section's high line depicts is still OPEN.** It is dead straight (0.000 m
  fit residual over 41.3 m) at −3.71 %, and the obvious reading — that it is the ridge — was
  REFUTED: it would rise where the building is wider, and it does the opposite. The two survivors
  (the roof on the cut plane, and the east eave seen beyond it) are each wrong in a different way.
  The build adopts NEITHER; it only takes the extent from that line.
- **The laboratory annex outline is a measured rectangle**, bounded by that room's own wall
  centrelines — not a reconstructed polygon. The drawn `PROYECCIÓN` layer omits it entirely.

## Reference images (`refs/`)

| File | What it shows |
|---|---|
| `planta-baja-cad.png` | the ground-floor plan rendered as AutoCAD draws it |
| `planta-alta-cad.png` | the upper plan, same treatment — note how little of the site is built on |
| `planta-alta-laboratorio.png` | the laboratory, the stair and the annex the projection omits |
| `dos-plantas-topview.png` | both storeys as three.js draws them, from above |
| `planta-baja-muros.png` | only the layers the extractor consumes |
| `modelo-vs-dxf.png` | model overlaid on the drawing — grey with no red on it was dropped |
| `orientacion-mapeos.png` | the two CAD→three.js coordinate mappings, side by side |
| `corte-cc-armadura.png` | section C-C' as AutoCAD draws it — the truss the roof is read from |
| `techo-topview.png` | the roof that shipped: ridge (blue) straight and oblique, eaves on the outline |
| `techo-topview-v-rechazado.png` | the ridge model that was **rejected** — folded into a V, and passed every arithmetic check |
| `equipo-topview.png` | the 35 machines in plan (teal = ground floor, purple = upper) |
| `puertas-recuperadas.png` | the two recovered leaves against the walls — one fills its opening, one is open |

## Regenerating it

The model is derived, not hand-authored. Rebuild from the corpus:

```bash
cd ~/investigacion/nave-panccadia
V=.venv/bin/python
$V tools/extract-gf.py     raw/nave-panccadia.dxf build/ground-floor.json
$V tools/extract-pa.py     raw/nave-panccadia.dxf build/upper-floor.json
$V tools/roof-profile.py   raw/nave-panccadia.dxf > corpus/sources/probes/roof-profile.txt
$V tools/extract-roof.py   build/ground-floor.json build/roof.json
$V tools/equipment.py      raw/nave-panccadia.dxf build/equipment.json
$V tools/validate-model.py build/ground-floor.json build/upper-floor.json build/roof.json build/equipment.json  # 53/53
$V tools/prove-guards.py   build/ground-floor.json build/upper-floor.json build/roof.json build/equipment.json  # 14/14 CAUGHT
$V tools/build-viewer.py   build/ground-floor.json build/nave-panccadia-3d.html build/upper-floor.json build/roof.json build/equipment.json
$V tools/topview-check.py  build/ground-floor.json build/render/topview-roof.png \
                           --mapping flip --upper build/upper-floor.json --roof build/roof.json
```

**Do not skip the last two steps.** `prove-guards.py` re-proves that each guard still fails on its
own defect; `topview-check.py` is the visual oracle, and it has now caught two defects the arithmetic
gate passed.

## Lessons this reconstruction paid for

Worth reading before reconstructing any other drawing — all four shipped past a green validation
gate and were caught by eye:

1. **Arithmetic validation cannot catch a wrong SHAPE.** It passed 16/16 while the slab was a
   bounding box inventing 748 m² (40 %) of floor. A gate authored alongside the thing it validates
   inherits that thing's blind spots.
2. **A coordinate handoff is a verification boundary.** CAD's `+Y` is up the sheet; three.js's `+Z`
   points at the viewer, so `z = y` MIRRORS the plan — and a reflection preserves every length, area,
   count and angle magnitude, so 21/21 passed on a mirrored building. Test handoffs with an
   ASYMMETRIC signature (signed area, known-handed landmark).
3. **Prove every guard by breaking the thing on purpose.** Three chirality guards were added and
   never exercised; all three passed while the slab sat detached at negative Z, because they followed
   the WALL transform path and never the slab's own `Shape → Extrude → rotateX` chain. This is now a
   tool: `prove-guards.py` injects each guard's own defect and reports CAUGHT or MISSED.
4. **A guard on a two-axis object must test BOTH axes.** The upper storey passed **34/34 with the
   laboratory annex 79.65 m off the site**: four checks constrained its area, its vertex count, its Y
   position and the walls' offset, and none constrained its X. The top-view render showed it in one
   glance. Arithmetic could not catch a wrong PLACE either.

5. **A derived shape extrapolated past its evidence invents geometry no check can see.** The roof's
   first ridge model put the ridge on the outline's mid-width — right inside the three measured cuts,
   and beyond them the mid-width of a chamfered plan turns a corner. The ridge folded into a **V** and
   the roof degenerated to a 2.16 m sliver, while the apexes still matched all three sections to
   0.26 m and the pitch was still exactly 10 %. Fit the thing you measured; do not re-derive it from
   something that merely agrees with it locally.

6. **Proving a guard tests the INJECTOR too.** The V guard first reported MISSED — because the
   injector pushed the ridge further along the direction it already ran, so nothing folded. Trusting
   that verdict would have meant "fixing" a guard that worked.

7. **Proving guards finds VACUOUS checks, not only wrong ones.** The equipment gate carried a check
   named "equipment cloud is not mirrored across the plan". Injecting a real mirror tripped the
   outline and slab checks and left that one green: it asserted a *precondition* for detection, not
   the detection, and could not fail on its own defect under any input. Deleted, not renamed — a
   check that cannot fail reports coverage the gate does not have, under a name that invites the
   trust it has not earned.

8. **A check is only as good as the SPECIMEN it measures.** The door gate's strongest check was
   `*U116` lying 4 mm from a wall line, named "certifies the transform chain" on the reasoning that
   no wrong composition lands a leaf 4 mm from a line by luck. The reasoning was sound and the
   premise was false: `*U116`'s insert is rotation 0, scale [1, 1] — an identity transform that no
   composition error can move. The chain was exercised only by the other leaf.

9. **A layer's headline count is not its scope.** `MOBILIARIO` was scoped as "4,946 entities, the
   single largest layer" and treated as a probable discard. 4,408 of them are elevation drawings and
   outliers; the gap was a tenth of the size it was given, and its answer was yes.

10. **When a per-item test refuses to discriminate, ask the structural question.** Whether a given
    gap is a doorway cannot be decided by its width — that was tested and refuted. Whether the gaps
    TOGETHER turn the plan into a coherent set of rooms can be, and the sweep's plateau at 1.8–2.4 m
    is the signature of a real door population. The per-item refutation still stands; the structural
    result is about the population, not any single gap.

An eleventh, about method rather than geometry: **a check that cannot SEE a defect still returns a
confident answer.** The parapet drawn around the raised slab agreed with the projected outline on
37 of 39 segments — but a parapet only exists where floor meets open air, so it could never have
detected enclosed floor. The test that worked was semantic: a labelled room cannot float.

Detail: blocks 7–12 of the corpus, and `retros/2026-07-28-run1-retro.md`.

## Status

Ground floor operator-confirmed correct against the CAD, 2026-07-28.
Upper storey added 2026-07-28 — validation gate 35/35, all 5 third-path guards proven failing.
Roof added 2026-07-28 — 13 roof checks, ridge and extent confirmed against the top-view render.
Industrial plant added 2026-07-28 — 35 machines from the `PDF2_*` layers.
Doors recovered from the DWG 2026-07-28 — the DXF never had them.
Furniture triaged 2026-07-28 — 60 pieces of 4,946 entities.
Named spaces mapped 2026-07-28 — 10 rooms of 21 ground-floor labels.
Current gate: **71/71** checks, **22/22** guards proven failing.

**Both the upper storey and the roof are awaiting operator confirmation against the CAD.** That
confirmation is the only oracle this project has that the arithmetic gate cannot provide — it has
caught three defects that shipped past a green gate, and the roof's V-fold would have been a
fourth.
