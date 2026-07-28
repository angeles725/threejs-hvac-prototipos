# Nave Panccadia — ground floor + upper storey

Two-storey 3D model of an industrial bakery plant on Av. Del Curtidor (client: Rotzinger León),
reconstructed from the client's AutoCAD 2007 DWG.

**Not a design3d run.** Unlike the equipment designs in this folder, this one was NOT authored from a
DesignSpec — it was RECONSTRUCTED from a real CAD drawing under the Research-SDD loop. There is no
`design-spec.yaml` and no gated pass ladder; the evidence lives in a citation corpus instead.

| | |
|---|---|
| Viewer | [`nave-panccadia-3d-v2.html`](nave-panccadia-3d-v2.html) — self-contained, opens from the filesystem |
| Geometry | [`ground-floor.json`](ground-floor.json) · [`upper-floor.json`](upper-floor.json) |
| Research corpus | `~/investigacion/nave-panccadia` (Research-SDD target #18, 12 cited blocks) |
| Source DWG | preserved in that corpus at `raw/`, `sha256 053750e0…948ee7f3` |

## Storey control

The viewer opens with both storeys. Buttons in the HUD:

| Button | Effect |
|---|---|
| **Upper storey** | shows/hides the whole second floor — deck, walls and columns |
| **Upper walls** | hides just the partitions, leaving the deck readable |
| **Ground floor only** | one click to strip the upper storey away and read the hall |
| **Mezzanine** | drives the upper deck |
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

## What it does NOT contain — read before reusing

- **No door openings**, on either storey. All 47 `puerta 1.20` block inserts in the DWG lie OUTSIDE
  the plan (scattered from X=6.56 to X=608), and the `PUERTAS` layer holds no swing arcs inside it.
  The doors were never placed as objects, so they are not reconstructable from this drawing.
- **Wall heights are an ASSUMPTION** (ground 3.15 m, upper partitions 3.00 m, low walls 1.10 m). The
  drawing states floor LEVELS, never wall heights. The viewer's HUD labels these as assumptions.
- **No roof form.** The +9.20 m level is known; its geometry lives only in the sections.
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

## Regenerating it

The model is derived, not hand-authored. Rebuild from the corpus:

```bash
cd ~/investigacion/nave-panccadia
V=.venv/bin/python
$V tools/extract-gf.py     raw/nave-panccadia.dxf build/ground-floor.json
$V tools/extract-pa.py     raw/nave-panccadia.dxf build/upper-floor.json
$V tools/validate-model.py build/ground-floor.json build/upper-floor.json   # 35/35 must pass
$V tools/prove-guards.py   build/ground-floor.json build/upper-floor.json   # 5/5 must be CAUGHT
$V tools/build-viewer.py   build/ground-floor.json build/nave-panccadia-3d.html build/upper-floor.json
$V tools/topview-check.py  build/ground-floor.json build/render/topview-two-storeys.png \
                           --mapping flip --upper build/upper-floor.json
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

A fifth, about method rather than geometry: **a check that cannot SEE a defect still returns a
confident answer.** The parapet drawn around the raised slab agreed with the projected outline on
37 of 39 segments — but a parapet only exists where floor meets open air, so it could never have
detected enclosed floor. The test that worked was semantic: a labelled room cannot float.

Detail: blocks 7–12 of the corpus, and `retros/2026-07-28-run1-retro.md`.

## Status

Ground floor operator-confirmed correct against the CAD, 2026-07-28.
Upper storey added 2026-07-28 — validation gate **35/35**, all 5 third-path guards proven failing,
registration and placement confirmed against the top-view render. **Awaiting operator confirmation
against the CAD.**
