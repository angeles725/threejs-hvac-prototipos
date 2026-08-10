# Research block-number registry — SINGLE SOURCE OF TRUTH

**Authority: session-A (orchestrator on master).** A block number is AVAILABLE only if it is not
listed here — availability is decided by ASSIGNMENT, not by what exists on disk or on any branch.
Announcing a number between peers is NOT enough (the message gets lost); it must be recorded here.

## Rule
Before writing a research block: pick the next free number **inside your family's assigned range** below,
and (ideally) ask session-A to record it here first. If you already wrote a block outside your range,
RENUMBER it to your range before requesting integration. session-A reconciles at merge.

## Consumed numbers (number → family → topic)
| N | Family | Topic |
|---|---|---|
| B1–B56 | (core corpus) | Three.js library research (voxel/realistic HVAC prototypes) |
| B57 | puertas (session-B) | cold-room door dimensions |
| B58 | almacenamiento (session-B) | selective pallet racking dimensions |
| B59 | puertas (session-B) | sectional + roll-up door dimensions |
| B60 | puertas (session-B) | access control (turnstile + barrier) |
| B61 | almacenamiento (session-B) | boltless shelving + euro container |
| B62 | robotica | robot dimensional + joint-hierarchy reference |
| B63 | automotriz | automotive dimensional + construction reference |
| B64 | almacenamiento (session-B) | cantilever racking |
| B65 | almacenamiento (session-B) | mezzanine guard-rail geometry (EN ISO 14122-3) |
| B66 | almacenamiento (session-B) | steel lockers (BS 4680:1996) |
| B67 | almacenamiento (session-B) | drive-in racking — lane derived, not published |
| B68 | almacenamiento (session-B) | wire-mesh security cage (UFGS 10 22 13) |
| B69 | puertas (session-B) | cantilever sliding gate — counterbalance is half the opening and unfilled |
| B120 | puertas (session-B) | personnel interlock portal (mantrap) — the interlock must be enforced |
| B121 | puertas (session-B) | security door EVIDENCE ONLY — EN 1125 + sources-tried; the asset stays BLOCKED |
| B70 | transporte | conveyor texture-offset scroll |
| B71 | transporte | conveyor dimensional reference |
| B72 | transporte | material-handling vehicle + overhead-crane reference |
| B73 | transporte | (transporte-4) |
| B100 | proceso (catalog-proceso-2) | HFFS flow-wrapper packaging dimensions |
| B101 | proceso (catalog-proceso-4) | CIP skid dimensions (linear 600 L, arithmetically closed) |
| B102 | proceso (catalog-proceso-2) | belt cooling tunnel — hood is a lift-off lid, not a box |
| B125 | core three.js library: numerical methods & core math (session-A 2026-08-09) | framing/projection near-plane trap, bounding-volume integrity, tessellation, core math gotchas, r160 color/IBL/lighting, equation families |
| B126 | core three.js library: curved/rounded equipment geometry (session-A 2026-08-09) | LatheGeometry (revolution surfaces), RoundedBoxGeometry(segments=1 sweet spot), three-subdivide Loop subdivision (external, removed r125), round-edge normalMap (~89% tri savings), PBR colorSpace map table (green roughness/blue metalness/uv1 AO), CatmullRomCurve3 centripetal + TubeGeometry elbow budget, CapsuleGeometry r160-core, SphereGeometry correct triangle formula (2·W·(H−1)), CylinderGeometry default=32 waste, on-screen-size decision rule, 4-item adopt shortlist |
| B127 | core three.js library: junction closure, end-caps & de-gloss propagation (session-A 2026-08-09) | de-gloss is the D1 "chrome mirror" fix (roughnessBase 0.50 + envMapIntensity 1.0, MULTIPLIER rule; anisotropy evaluated+DEFERRED); checkGap3D 3-axis AABB separation replacing Y-only verticalGap (gap≤0.01 m target; caught filtrado 0.11 m lateral float); makeEndCap annular/disk cap closing openEnded LatheGeometry/CylinderGeometry shells (tanques jacket + caldera skirt); makeFlange collar/bead penetration boss (un-buried caldera recirc pipe 0.53<0.65 shell); regression watch (added caps grow bbox → re-run checkFraming + checkMeshIntegrity; showcase camera dolly 0.193→0.370 occupancy); rejected-with-reason (three-subdivide npm-dep, onBeforeCompile SDF shader stall, corner-AO uv1 plumbing, AgX/envMapIntensity already landed); design3d-kit PR #12 (checkGap3D/makeEndCap/makeFlange) |
| B128 | core three.js library: community-validated techniques — three.js forum survey (session-A 2026-08-09) | forum/community survey (discourse.threejs.org + docs/GitHub) validating+extending design3d; swept-tube capEnds fan-from-shared-ring VALIDATED = prisoner849's method (end-caps 9655; beats placed CircleGeometry seam gap; Mugen87: closed only loops path, no native cap; donmccurdy: winding culls, normals shade-only → cap winding load-bearing); DoubleSide VERDICT unnecessary-with-caps (shadow artifacts #8692, ~2× fragment #28535, Adreno bugs; legit only camera-inside-pipe); de-gloss corroborated (native anisotropy r153 brushed-steel needs SwiftShader smoke-test; matcaps render IDENTICALLY headless UV-lookup; metalness=1 no-env=black→RoomEnvironment+PMREM+envMapIntensity NOT r163 environmentIntensity; roughness 0.35–0.6 brackets our 0.50; AgXToneMapping added r160, AgXPunchy r161 NOT r160, zero GPU); geometry (ExtrudeGeometry absarc round box; vertex-shader zero-tri rounded box onBeforeCompile t/8066 instancing-friendly; ProfiledContourGeometry hofk MIT fills rect-duct gap TubeGeometry can't; stencil cutaway 2-pass t/74018 stencil default true r160 false r163+ medium SwiftShader risk; CatmullRomCurve3 tension 0.02–0.05 elbows; BatchedMesh r153 heterogeneous-shared-material beats InstancedMesh+mergeGeometries; mergeGeometries is r160 name, mergeBufferGeometries removed); ADOPT shortlist 6 (anisotropy/AgX/BatchedMesh/stencil-cutaway/vertex-rounded-box/ProfiledContour); design3d ORIGINAL gaps (auto elbow-radius, procedural flanges makeFlange, zero-dep nozzle CSG, per-part cutaway color, industrial normal maps, superquadric — no forum precedent) |

> Note: `research/sources/B59-proceso-dims/` is a NAMESPACED source folder (proceso), not block B59.
> Source folders are namespaced by family (`B63-automotriz-dims`) so a number clash never merges two corpora.

## Assigned ranges (next free inside each)
| Family | Range | Next free |
|---|---|---|
| puertas + almacenamiento (session-B) | B57–B69 + B120–B124 (extension, session-A 2026-08-09) | B122 (B120 esclusa-personal; B121 consumed by the puerta-seguridad EVIDENCE block, asset still blocked) |
| transporte | B70–B79 | B74 |
| robotica | B80–B89 | B80 (B62 is its historical entry; new blocks go B80+) |
| automotriz | B90–B99 | B90 (B63 historical; new blocks B90+) |
| proceso / fluidos / utilities | B100–B119 | B103 (B100 empacadora-flowwrap, B101 skid-cip, B102 tunel-enfriamiento) |
| core three.js library: numerical methods & core math (session-A 2026-08-09) | B125–B134 | B129 (B125 consumed: numerical-methods-core-math; B126 consumed: curved/rounded-geometry; B127 consumed: junction-closure/end-caps/de-gloss; B128 consumed: forum-survey/community-validated-techniques) |
| any new family | ask session-A | — |

## Enforcement — prevent at WRITE, not detect at read
- **WRITE RULE (mandatory, automatable, zero false positives):** before writing block N, check THIS table —
  N must be inside your family's range and not already consumed. This prevents the wrong-topic citation at
  origin. It is a table lookup, no content-reading. This is the enforceable rule.
- **Citation↔title cross = HUMAN review only, NOT a tool.** Crossing each `[Block N]` cite against block N's
  title catches wrong-topic cites but automating it is NOISY: cross-family citations are usually LEGITIMATE
  (palletizer cites racking; vehicles cite the EUR pallet). Measured: range-check = 54% noise, content-cross =
  worse. So the reviewer does this by eye at integration; do NOT build the noisy verifier believing this
  registry asks for it. (Idea/measurements: catalog-transporte + catalog-hvac.)
