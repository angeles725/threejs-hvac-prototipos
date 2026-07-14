# SDD Apply — Asset 01 SURFACE correction attempt 3

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, correction attempt 3  
**Mode:** Strict TDD  
**Boundary:** diagnostic integrity evidence and terminal-direction marker correction only. Accepted atlas, shell, geometry, materials and canonical network topology remain unchanged. No LIGHTING-CAMERA work, later asset, self-review, commit or PR.

## Diagnostic conclusion

The giant black, gray and white planes reported against attempt 2 are not present in the live Three.js scene or the source PNGs. They were produced by the image inspection path. Attempt 3 therefore does **not** mutate the atlas or shell to compensate for a phantom defect.

The evidence now proves this at two independent levels:

- a live scene snapshot hashes every one of 75 non-generated objects across concessions frame 0/1, corridor labels on/off and Sala 3 frame 0/1, including world matrices, geometry bounds/counts, material identity/properties and effective visibility;
- a full-canvas pixel hash is repeated after generated surface and label meshes are temporarily masked, proving no non-generated scene-coverage drift.

Only the intended poster/display atlas meshes or label group change in each pair. Exact pair hashes and whitelisted generated changes are recorded in `surface-attempt3.pixel-stability.json`.

The capture SHA-256 manifest supplies a third independent check. Twelve architecture captures are byte-identical to attempt 2, including every frame/label pair that was previously reported as occluded. Only the UG67 and complete-network engineering captures changed, because they contain the legitimate terminal-arrow correction.

## Legitimate correction implemented

- Replaced the visually weak terminal-direction marks with compact, terminal-adjacent amber chevrons.
- Each arrow uses two offset thick arms and a diamond hub, with an opaque, emissive, high-contrast material distinct from the blue route and packet dashes.
- Preserved every canonical RS-485, LoRaWAN and Ethernet link and endpoint. The correction changes zero links and has no topology impact.
- The existing nine direction arrows comprise 27 instanced components and remain positioned at terminal `t = 0.9`.

## Strict TDD and verification

| Evidence | Result |
|---|---|
| RED 1 | Shared direction-marker contract absent before implementation |
| RED 2 | Previous marker size/material failed the stronger opacity and contrast contract |
| RED 3 | Previous arm placement failed the distinct offset-chevron shape contract |
| Focused regression | 5/5 — `runs/surface-attempt3-focused-green.log` |
| Full regression | 88/88 — `runs/assets/01-shell-circulation-facade/surface-attempt3.tests.txt` |
| Syntax | PASS — `runs/assets/01-shell-circulation-facade/surface-attempt3.syntax.txt` |
| Browser smoke | PASS, eight checks, zero issues |
| Live scene integrity | PASS, three pairs, 75 non-generated objects per pair |
| Masked pixel stability | PASS, exact full-canvas SHA-256 match for all three pairs |
| Probe | WebGL2; 212 draws; 35,000 triangles; 8 MB heap; within 550 / 750,000 budgets |
| Captures | 14 captures, 14/14 clean console sidecars |

SwiftShader reports 1 FPS from five sparse samples; under the gate contract this value is informational. Draw calls and geometry remain well inside the office-computer budgets.

## Evidence set

- Capture manifest: `runs/assets/01-shell-circulation-facade/surface-attempt3.capture-manifest.json`
- SHA-256 manifest: `runs/assets/01-shell-circulation-facade/surface-attempt3.sha256.json`
- Live/pixel pair evidence: `runs/assets/01-shell-circulation-facade/surface-attempt3.pixel-stability.json`
- Mechanical evidence: `runs/assets/01-shell-circulation-facade/surface-attempt3.mechanical.json`
- Browser evidence: `runs/assets/01-shell-circulation-facade/surface-attempt3.browser-smoke.json`
- Probe evidence: `runs/assets/01-shell-circulation-facade/surface-attempt3.probe.json`

## Blind-review handling

**Inspect each attempt-3 PNG individually. Never submit multiple original-resolution PNGs to a single image-viewer request.** The multi-image inspection path is the diagnosed source of the phantom slabs. Use the SHA-256 manifest plus live-scene and masked-pixel evidence when judging state consistency.

SURFACE attempt 3 is mechanically ready for a fresh blind review. No visual score or self-verdict is asserted. SURFACE remains locked until that review passes; LIGHTING-CAMERA and every later pass remain locked.

The gate-state validator currently derives `surface failed(2)` from the two existing review JSONs and therefore reports the deliberate cache drift `locked` versus `failed(2)`. This is expected while attempt 3 has no blind-review artifact; `runs/surface-attempt3-gate-state.txt` records that pending state. No review result was fabricated to suppress it.
