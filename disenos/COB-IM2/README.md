# COB-IM2

Source CAD and early 3D builds for the COB-IM2 plant, recovered on 2026-08-25 from
`C:\Users\equipo\Downloads` (Windows filesystem) after the WSL2 environment was wiped.

The WSL2 environment was wiped, and the old single-file build `cob-im2-3d.html` did not survive.
The `~/investigacion/COB-IM2/` research corpus, however, was **recovered** and is versioned on
GitHub as `angeles725/research-cob-im2` (extractor pipeline, raw DXFs, output JSONs) — it is not
lost. How its data crosses into the viewers here is documented in `DATA-HANDOFF.md`, with a
per-viewer provenance manifest in `data-provenance.json`. The files below, recovered from the
Windows disk on 2026-08-25, are committed here so the deliverable is versioned and backed up.

## Source DWG (AutoCAD, 2026-08-18)

| File | Level |
|---|---|
| `COB-IM2.12A level 2.dwg`, `.12B`, `.12C` | Level 2 |
| `COB-IM2.13A level 3.dwg`, `.13B`, `.13C` | Level 3 |
| `COB-IM2.14A level 4.dwg`, `.14B`, `.14C` | Level 4 |

## 3D builds (2026-08-21) and inventory (2026-08-22)

| File | What it is |
|---|---|
| `COB-IM2_14A_ductos_3D.html` | Level-4A ductwork 3D build (Three.js, self-contained) |
| `COB_Level4_Full_ThreeJS.html` | Full level-4 Three.js build |
| `inventario_COB_nivel4.xlsx` | Level-4 equipment inventory |

## Related knowledge

The design3d skill retains the retro learnings from the lost COB-IM2 runs (CAD→3D two-phase
architecture, R3F phase-2 gotchas, CAD→3D intake ranking) as text in its changelog and
`references/PIPELINE.md` / `references/TRACK-THREEJS.md`, even though the original
`disenos/COB-IM2/runs/2026-08-21-*-retro.md` files no longer exist.
