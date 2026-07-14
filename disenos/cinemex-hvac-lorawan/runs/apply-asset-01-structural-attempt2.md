# SDD Apply — Asset 01 STRUCTURAL correction attempt 2

**Asset:** shell-circulation-facade  
**Pass:** STRUCTURAL, lineage 1, attempt 2  
**Prior review:** attempt 1 FAIL at 0.69  
**Mode:** Strict TDD  
**Boundary:** Reviewer-scoped structural corrections only. No materials, surface, later asset, visual verdict, commit or PR.

## Preserved history

Attempt 1 pixels, sidecars, mechanical evidence and blind review remain in runs/assets/01-shell-circulation-facade/. Nothing from the failed attempt was removed because the STRUCTURAL gate has not closed.

## Reviewer-scoped corrections

- Added a visible kitchen hood body, overlapping outlet socket and uninterrupted vertical extract duct into the reserved roof sleeve. Legacy detached kitchen route rendering is no longer used.
- Deepened all eight acoustic corridor portal frames and eight emergency frames; added true wall voids, jambs, lintels, thresholds and depth-readable leaves. Four rear service openings receive the same contact-readable treatment.
- Added a continuous 1.5 m rear service floor strip and an oblique technical preset that retains the full rear separation, technical rooms and service-door row.
- Aligned a 1.4 m yellow accessible route and threshold directly with the wider centre facade entrance while leaving all five glazed frames unobstructed.
- Terminated marquee brackets into both facade and canopy and sign brackets into canopy and wordmark.
- Replaced floating structural RS-485 proxies with four UC-terminal-origin contained routes, fourteen TC-terminal-ending drops, visible tray junctions and ten wall sleeves.
- Added two visible seated UG67 antenna collars plus a visible Ethernet port and port-origin contained cable. LoRaWAN remains dashed and non-physical.
- Added geometry-only family frames at 24/8.4/7, 20/7.2/5 and 16/6/3 metres-height-tier profiles, preserving the canonical 2 large / 4 medium / 2 small distribution.
- Added five 1.68–1.75 m low-poly people and raised only neutral structural light values for legibility.
- Isolated evidence labels for kitchen, technical and UG67 closeups.

## Strict TDD

1. **RED:** initial attempt-2 contracts produced 39 focused tests: 33 pass and 6 fail.
2. **GREEN:** architecture and shell focused tests reached 40/40.
3. **Evidence refinements:** each technical camera change was preceded by a failing camera-contract test.
4. **Browser RED:** the first full run found a stale canvas backing height under low-FPS SwiftShader.
5. **Browser GREEN:** immediate plus timer-assisted resize settling passed the six-check real-browser smoke with zero issues.
6. **Regression:** final full suite passed 66/66 and all application JavaScript passed node --check.

## Runtime evidence

| Evidence | Result |
|---|---|
| Tests | 66 passed, 0 failed — structural-attempt2.tests.txt |
| Browser smoke | PASS, six checks, zero issues — structural-attempt2.browser-smoke.json |
| Probe | WebGL2; 106 draws; 12,700 triangles; 7 MB heap; within 550 / 750,000 budgets |
| Canonical captures | Seven required architecture views plus the same seven engineering views |
| Supplemental | Facade architecture closeup |
| Console | 15/15 attempt-2 capture sidecars clean |
| Attempt 1 | Preserved: 15 PNGs, sidecars, mechanical evidence and review |

The measured 7 FPS is informational because the probe uses software SwiftShader. The deterministic draw and triangle gates pass with wide margin.

## Handoff

runs/progress.yaml retains the derived failed(1) result from attempt 1 and records attempt 2 as mechanical-complete-visual-pending. The next action is a fresh blind pixel review of attempt 2. No score or visual verdict is asserted here, and no later pass is unlocked.
