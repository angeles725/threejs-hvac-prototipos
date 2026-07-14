# SDD Apply — Asset 01 SURFACE Reset 1

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, attempt 1  
**Mode:** Strict TDD  
**Boundary:** targeted endpoint-direction, network-label, and corridor-evidence reset only. No lighting-camera pass, later asset, self-review, phase advance, commit, or PR.

## Implementation

- Replaced every amber cross/T/L cluster with exactly one triangular cone arrowhead. The nine markers are tangent-aligned, terminal-adjacent (`t = 0.82`), offset from routes and equipment, opaque, emissive, and rendered as topology-neutral engineering overlays.
- Preserved all canonical RS-485, LoRaWAN, and Ethernet links. The reset changes zero endpoints and zero topology edges.
- Added a complete-network label policy that keeps the 14 TC300, four UC100, one UG67, four bus-group, and six external IDs visible while culling room-family, FOH, and rear-strip labels from that camera only. True device geometry remains unchanged.
- Reframed the corridor camera to `[0, 3.2, 9.5]`, targeting `[0, 1.35, -8]` at FOV 65. The final view uses the carpet spine, illuminated room numbers, exits, and posters as its focal hierarchy without a roof member crossing the sightline.

## Strict TDD and mechanical verification

| Evidence | Result |
|---|---|
| RED contracts | Marker cardinality/tangent/size, label priority/culling, and corridor obstruction failed before implementation |
| Focused GREEN | 29/29 across the reset and final corridor reframe |
| Full regression | 91/91 — `runs/assets/01-shell-circulation-facade/surface-attempt1.tests.txt` |
| Syntax | PASS for all six touched source/test/harness files |
| Browser smoke | PASS, nine checks, zero console/page/request issues |
| Live scene integrity | PASS across concessions frames, corridor labels, and Sala 3 frames; 75 non-generated and 49 generated objects per pair |
| Probe | WebGL2; 212 draws; 35,000 triangles; 7 MB heap; within 550 / 750,000 budgets |
| Captures | 14 current-lineage PNGs at 2752×2544; 14/14 clean sidecars |

SwiftShader reported 1 FPS from four sparse samples. Per the gate contract, that value is informational; draw and triangle counts are the deterministic office-computer budget evidence.

## Fresh evidence

- Capture manifest: `runs/assets/01-shell-circulation-facade/surface-attempt1.capture-manifest.json`
- SHA-256 manifest: `runs/assets/01-shell-circulation-facade/surface-attempt1.sha256.json`
- Live/pixel stability: `runs/assets/01-shell-circulation-facade/surface-attempt1.pixel-stability.json`
- Mechanical summary: `runs/assets/01-shell-circulation-facade/surface-attempt1.mechanical.json`
- Browser smoke: `runs/assets/01-shell-circulation-facade/surface-attempt1.browser-smoke.json`
- Performance probe: `runs/assets/01-shell-circulation-facade/surface-attempt1.probe.json`
- Reset boundary: `runs/surface-lineage1-reset.md`

Nine unchanged architectural captures are byte-identical to lineage-0 attempt 3. The three corridor views changed only because of the required camera reframe; the UG67 and complete-network views changed because of the arrowhead and label-policy correction.

## Blind-review handoff

Inspect each PNG individually at original resolution; do not batch multiple originals into one viewer request. The image-viewer path has previously shown transient phantom slabs that are absent from both the PNG bytes and live scene. Use the SHA manifest and masked-pixel/runtime evidence when checking state consistency.

SURFACE Reset 1 is mechanically ready for a fresh blind review. No visual score or self-verdict is asserted. SURFACE and all later passes remain locked until that review returns a valid pass.

---

## Correction attempt 2 handoff

Attempt 1 failed only `canonical-network-endpoints` (0.78/0.80). Correction attempt 2 replaces fixed world-space sizing with route-base contact, full 3D tangent alignment, a 16–24 CSS-pixel screen-space cap, one non-overlapping marker per route component, and LoRa samples that lie on rendered dash intervals. All 94 tests and 10 browser checks pass; 14/14 canonical sidecars are clean; only the two engineering PNGs changed from attempt 1.

Detailed evidence: `runs/apply-asset-01-surface-attempt2.md`. SURFACE remains failed pending fresh blind review; no score or self-verdict is asserted.

---

## Final correction attempt 3 handoff

Attempt 3 narrows the actual cone silhouette, enables route-aware depth testing, spreads LoRa markers across distinct pre-convergence dash cells, replaces 14 complete-network TC labels with four bus rollups, adds a dedicated all-TC `rs485-master` capture, and reframes the complete network inside tested viewport margins. Full details: `runs/apply-asset-01-surface-attempt3.md`.

All 95 tests, 11 browser checks, 15 sidecars, hashes and performance budgets pass mechanically. SURFACE remains blocked pending independent blind review; this final retry does not assert a visual verdict.
