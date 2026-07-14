# SDD Apply — Asset 01 STRUCTURAL pass

**Asset:** shell-circulation-facade  
**Pass:** STRUCTURAL, lineage 1, attempt 1  
**Mode:** Strict TDD  
**Boundary:** Mechanical implementation and canonical evidence only. No visual self-review, approval, materials, surface detail, later asset, commit or PR.

## Entry gate and lineage hygiene

- BLOCKOUT Silhouette Reset 1 passed the independent blind review at 0.79.
- runs/progress.yaml records BLOCKOUT lineage 1 as passed and the gate-state validator returned clean before structural work began.
- Superseded lineage-0 PNG and console files were removed after the gate closed. Its manifest, reviews, probes, mechanical evidence and reports remain under history/blockout-lineage-0/.

## Structural implementation

- Built a 0.25 m foundation slab, 0.22 m roof panels, 0.40 m exterior walls and 0.25 m interior partitions in metre-equivalent units.
- Preserved the eight-room 4+4 auditorium layout and constructed each shell to its configured small/medium/large family height.
- Replaced symbolic entrances with true framed openings: eight acoustic double-leaf auditorium portals, eight exterior emergency doors, five glazed facade entries and four rear service doors.
- Made the centre glazed entry 1.40 m wide for the accessible route.
- Added rear technical-room partitions, the separating wall and a distinct service corridor with maintenance access.
- Added coherent marquee and sign supports plus RS-485 cabinet roots, UG67 antenna sockets and reserved kitchen/supply/return sleeves.
- Kept TC300, UC100 and UG67 device bodies at documented real scale; billboards carry legibility without inflating equipment.
- Preserved required blockout circulation, seating, FOH and network proxies. No physical UC100-to-UG67 cable was introduced.
- Corrected facade, Sala 3, kitchen, technical, UG67 and complete-network evidence framing and isolated closeup labels by camera.

## Strict TDD evidence

1. **RED:** the focused structural suite ran after the final expectations were added: 34 tests, 32 passed and 2 failed. Failures proved the old technical camera and old gateway-label anchor.
2. **GREEN:** after the scoped correction, the same focused suite passed 34/34.
3. **Regression:** npm run test:cinemex passed 60/60.
4. **Syntax:** node --check passed for every application .js and .mjs file.
5. **Browser:** the real local-HTTP Chromium/SwiftShader smoke passed all six checks with issues: [].

## Runtime and evidence

| Evidence | Result |
|---|---|
| Full tests | 60 passed, 0 failed — structural-attempt1.tests.txt |
| Browser smoke | PASS, six checks, zero issues — structural-attempt1.browser-smoke.json |
| Probe | WebGL2; 96 draws; 9,904 triangles; 7 MB heap; within 550-draw / 750k-triangle budgets — structural-attempt1.probe.json |
| Canonical captures | Seven required views in architecture plus the same seven in engineering |
| Supplemental capture | Facade architecture closeup |
| Console evidence | 15/15 sidecars clean; zero issues |
| Mechanical manifest | structural-attempt1.mechanical.json |

The probe's 9 FPS is informational because it ran under software SwiftShader. Draw and triangle counts are the deterministic budget gates for this pass.

## Handoff

runs/progress.yaml keeps the STRUCTURAL gate locked and records evidence_status: mechanical-complete-visual-pending. A fresh blind STRUCTURAL pixel review is required next. This report deliberately records no visual verdict, score or pass decision, and no later pass is unlocked.
