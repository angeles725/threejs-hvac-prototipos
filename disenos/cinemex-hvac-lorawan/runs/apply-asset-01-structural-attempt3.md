# SDD Apply — Asset 01 STRUCTURAL correction attempt 3

**Asset:** shell-circulation-facade  
**Pass:** STRUCTURAL, lineage 1, attempt 3  
**Prior reviews:** attempt 1 FAIL 0.69; attempt 2 FAIL 0.76  
**Mode:** Strict TDD  
**Boundary:** Final reviewer-scoped structural retry only. No materials, surface, later asset, visual verdict, commit or PR.

## Preserved history

All attempt 1 and attempt 2 pixels, sidecars, mechanical evidence and blind reviews remain in `runs/assets/01-shell-circulation-facade/`. Nothing is deleted before the STRUCTURAL gate closes.

## Final scoped corrections

- Reframed UG67 from the wall-facing circulation side. Architecture mode uses `view=all` with every link disabled so the true-scale gateway, both seated antenna roots/collars and its Ethernet port remain visible.
- Added comparable cinema-specific geometry to every large, medium and small family master: 7/5/3 tiers, two side aisles, cross aisle, wheelchair void, framed screen wall, projection niche, corridor entry and emergency opening.
- Backed all four RS-485 trunks and fourteen drops with continuous visible trays, UC/TC terminal contacts, junction contacts and wall sleeves. The isolated master capture disables cutaway so no route floats over a removed half-building.
- Added owned supply and return roof-service assemblies with sleeve, plenum socket, overlapping main and coupling collar.
- Added an overhead rear-service pair that shows the 1.5 m strip, separation, room compartments and corridor-facing openings together.
- Retained the already-passing multiplex, front-of-house, human-scale, lighting and containment work from attempt 2.

## Strict TDD and runtime verification

| Evidence | Result |
|---|---|
| Initial focused RED | 45 tests: 39 pass, 6 fail |
| Focused GREEN | 45/45 |
| Full regression | 71/71 — `structural-attempt3.tests.txt` |
| Syntax | PASS — `structural-attempt3.syntax.txt` |
| Browser smoke | PASS, six checks, zero issues — `structural-attempt3.browser-smoke.json` |
| Probe | WebGL2; 107 draws; 14,836 triangles; 6 MB heap; within 550 / 750,000 budgets |
| Captures | 14 canonical + 6 supplemental; 20/20 console sidecars clean |

The browser run also reproduced the low-FPS resize race as RED. The runtime now samples the final CSS dimensions at 70 and 120 ms in addition to immediate, ResizeObserver and RAF measurements; the final smoke passed.

## Evidence and handoff

Attempt 3 includes canonical architecture/engineering pairs for neutral, engineering section, kitchen, Sala 3, technical, UG67 and complete network, plus facade, family-master, isolated RS-485 and roof-service supplemental evidence. `structural-attempt3.mechanical.json` is the machine-readable manifest.

`runs/progress.yaml` retains the derived `failed(2)` authority from existing reviews and records attempt 3 as mechanical-complete / visual-pending. The next action is a fresh blind pixel review. No score or completion verdict is asserted here.
