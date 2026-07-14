# SDD Apply — Asset 01 SURFACE Reset 1, correction attempt 3

**Asset:** shell-circulation-facade  
**Pass:** SURFACE, lineage 1, attempt 3 (final retry)  
**Mode:** Strict TDD  
**Boundary:** canonical direction-marker legibility, complete-network hierarchy/framing, and dedicated RS-485 evidence only. Network topology, endpoints, device geometry, accepted architecture/material/surface work, and later passes remain unchanged.

## Correction

Attempt 2 normalized only the arrow's axial screen length. The cone's lateral silhouette, overlay material and convergent LoRa placement still produced dominant amber wedges in the saved engineering views. Attempt 3 corrects the actual pixel failure:

- Nine markers remain mapped one-to-one to four RS-485 buses, four LoRaWAN links and one Ethernet route.
- Every cone base remains on the route centreline with zero world-space gap; its axis follows the full 3D tangent.
- Axial length is perspective-corrected to a 16.5 CSS-pixel target inside a 16–18 px band.
- Runtime vertex projection caps lateral width at 8 px and requires at least 8 px between visible glyph bounds.
- Cone radius is `0.075 m`. The proposed `0.12 m` radius produced 11.92 px lateral width in the real UG67 camera, so the runtime RED contract required the narrower radius.
- Emissive intensity is 0.65, depth testing is enabled, depth writing remains disabled, and render order 1180 stays below canonical endpoint labels.
- LoRa samples `[0.15, 0.29, 0.43, 0.575]` occupy distinct visible dash cells before the routes converge.

## Network evidence hierarchy

The complete-network view now shows 15 endpoint-level labels instead of 29 individual labels:

- Four UC100 IDs, one UG67 ID and six external endpoint IDs.
- Four rollups: `BUS A · TC01/02/03/04/14`, `BUS B · TC06–09`, `BUS C · TC10–13`, and `BUS D · TC05`.
- Fourteen individual TC300 sprites and the four short bus labels are suppressed only in complete-network.

The dedicated `rs485-master` capture retains all 14 TC300, four UC100 and four bus labels. The complete-network preset `[64,60,58] → [20,1.5,0]`, FOV 50, keeps all visible label bounds inside the 2–98% viewport margins with 85.3% horizontal and 46.9% vertical occupancy.

## Strict TDD and work-unit evidence

| Evidence | Exact result |
|---|---|
| Safety net | `node --test tests/surfaces.test.mjs` — 11/11 PASS before production edits |
| RED | Geometry/pixel band, width/separation, dash phase, hierarchy/counts, TC evidence, viewport margins, perspective correction and runtime capture contracts failed before their implementations |
| Focused GREEN | `node --test tests/surfaces.test.mjs` — 12/12 PASS |
| Full regression | `node --test tests/*.test.mjs` — 95/95 PASS |
| Syntax | `node --check` — seven touched source/test/harness files PASS |
| Runtime | `node qa/browser-smoke.mjs` — 11 checks, zero issues |
| Captures | canonical `capture.mjs --url-suffix` over HTTP — 15 PNGs, 15/15 clean sidecars, 2752×2544 |
| Probe | WebGL2, 216 draws, 35,008 triangles; within 550 / 750,000 budgets |

Canonical runtime marker metrics:

| Camera | Axial px | Maximum width px | Minimum separation px | Contact / tangent / overlap |
|---|---:|---:|---:|---|
| UG67 | 16.48–16.52 | 7.46 | 508.87 | PASS / PASS / 0 |
| Complete network | 16.49–16.50 | 3.90 | 18.13 | PASS / PASS / 0 |

SwiftShader's sparse 1 FPS probe sample is informational under the DesignSpec gate contract.

## Evidence

- `runs/assets/01-shell-circulation-facade/surface-attempt3.capture-manifest.json`
- `runs/assets/01-shell-circulation-facade/surface-attempt3.sha256.json`
- `runs/assets/01-shell-circulation-facade/surface-attempt3.mechanical.json`
- `runs/assets/01-shell-circulation-facade/surface-attempt3.browser-smoke.json`
- `runs/assets/01-shell-circulation-facade/surface-attempt3.pixel-stability.json`
- `runs/assets/01-shell-circulation-facade/surface-attempt3.probe.json`

Twelve unrelated architectural captures are byte-identical to attempt 2. Only UG67 and complete-network changed, plus the new `rs485-master` evidence capture.

## Rollback boundary

Restore these paths to attempt 2 and remove only attempt-3 evidence/report files:

- `src/scene/surfaces.js`
- `src/scene/architecture.js`
- `src/controllers/camera.js`
- `qa/browser-smoke.mjs`
- `tests/surfaces.test.mjs`
- `tests/shell.test.mjs`

No commit or PR was created. Attempt-1 and attempt-2 review JSONs remain preserved.

## Handoff

Attempt 3 is mechanically ready for an independent blind SURFACE review. No visual score or self-verdict is asserted. SURFACE remains `failed(2)` and later passes remain locked. Because this is the final retry, a failed blind review must stop the lineage rather than start another correction.
