# Nave Panccadia — ground floor

Ground-floor 3D model of an industrial bakery plant on Av. Del Curtidor (client: Rotzinger León),
reconstructed from the client's AutoCAD 2007 DWG.

**Not a design3d run.** Unlike the equipment designs in this folder, this one was NOT authored from a
DesignSpec — it was RECONSTRUCTED from a real CAD drawing under the Research-SDD loop. There is no
`design-spec.yaml` and no gated pass ladder; the evidence lives in a citation corpus instead.

| | |
|---|---|
| Viewer | [`nave-panccadia-planta-baja-v1.html`](nave-panccadia-planta-baja-v1.html) — self-contained, opens from the filesystem |
| Geometry | [`ground-floor.json`](ground-floor.json) — the model's structured source |
| Research corpus | `~/investigacion/nave-panccadia` (Research-SDD target #18, 9 cited blocks) |
| Source DWG | preserved in that corpus at `raw/`, `sha256 053750e0…948ee7f3` |

## What the model contains

| Element | Value | Confidence |
|---|---|---|
| Floor area (outline) | **1,101 m²** | measured — convex hull of wall geometry |
| Bounding box | 34.67 × 53.34 m | measured |
| Wall runs | 156 (344 m of centreline) | 79 with measured thickness, 77 assumed 0.15 m |
| Concrete columns | 21, varied sections | measured |
| Steel columns | 28 hollow **HSS 8×8×1/4** (203 mm, 6.3 mm wall) | measured; grade inferred from section |
| Mezzanine | **284 m²** at +3.15 m | drawn on the `PROYECCIÓN` layer |
| Levels | slab 0.00 · mezzanine +3.15 · roof +9.20 | measured from 1:1 sections |
| Plan geometry | **26.2 % oblique** — never snap this to a grid | measured |

## What it does NOT contain — read before reusing

- **No door openings.** All 47 `puerta 1.20` block inserts in the DWG lie OUTSIDE the plan (scattered
  from X=6.56 to X=608), and the `PUERTAS` layer holds no swing arcs inside it. The doors were never
  placed as objects, so they are not reconstructable from this drawing. Openings would have to be
  inferred from gaps between wall runs.
- **Wall heights are an ASSUMPTION** (3.15 m; low walls 1.10 m). The drawing states floor LEVELS,
  never wall heights. The viewer's HUD labels these as assumptions.
- **No upper storey.** The DWG contains a second plan (`PLANTA ALTA`) that is not modelled here.
- **No roof form.** The +9.20 m level is known; its geometry lives only in the sections.

## Reference images (`refs/`)

| File | What it shows |
|---|---|
| `planta-baja-cad.png` | the DWG rendered as AutoCAD draws it (real ACI layer colours) |
| `planta-baja-muros.png` | only the layers the extractor consumes |
| `modelo-vs-dxf.png` | model overlaid on the drawing — grey with no red on it was dropped |
| `orientacion-mapeos.png` | the two CAD→three.js coordinate mappings, side by side |

## Regenerating it

The model is derived, not hand-authored. Rebuild from the corpus:

```bash
cd ~/investigacion/nave-panccadia
V=.venv/bin/python
$V tools/extract-gf.py     raw/nave-panccadia.dxf build/ground-floor.json
$V tools/validate-model.py build/ground-floor.json          # 25/25 must pass
$V tools/build-viewer.py   build/ground-floor.json build/nave-panccadia-3d.html
```

Then copy `build/ground-floor.json` and the viewer back here. Full tool documentation:
`~/investigacion/nave-panccadia/tools/README.md`.

## Three lessons this build paid for

Worth reading before reconstructing any other drawing — all three shipped past a green validation
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
   the WALL transform path and never the slab's own `Shape → Extrude → rotateX` chain.

Detail: blocks 7, 8 and 9 of the corpus, and `retros/2026-07-28-run1-retro.md`.

## Status

Operator-confirmed correct against the CAD, 2026-07-28. Validation gate: 25/25.
