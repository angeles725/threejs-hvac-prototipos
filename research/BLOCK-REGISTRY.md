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
| B70 | transporte | conveyor texture-offset scroll |
| B71 | transporte | conveyor dimensional reference |
| B72 | transporte | material-handling vehicle + overhead-crane reference |
| B73 | transporte | (transporte-4) |
| B100 | proceso (catalog-proceso-2) | HFFS flow-wrapper packaging dimensions |
| B101 | proceso (catalog-proceso-4) | CIP skid dimensions (linear 600 L, arithmetically closed) |
| B102 | proceso (catalog-proceso-2) | belt cooling tunnel — hood is a lift-off lid, not a box |

> Note: `research/sources/B59-proceso-dims/` is a NAMESPACED source folder (proceso), not block B59.
> Source folders are namespaced by family (`B63-automotriz-dims`) so a number clash never merges two corpora.

## Assigned ranges (next free inside each)
| Family | Range | Next free |
|---|---|---|
| puertas + almacenamiento (session-B) | B57–B69 + B120–B124 (extension, session-A 2026-08-09) | B121 (B57–B69 exhausted; B120 consumed by esclusa-personal; B121 reserved for puerta-seguridad; B122+ free) |
| transporte | B70–B79 | B74 |
| robotica | B80–B89 | B80 (B62 is its historical entry; new blocks go B80+) |
| automotriz | B90–B99 | B90 (B63 historical; new blocks B90+) |
| proceso / fluidos / utilities | B100–B119 | B103 (B100 empacadora-flowwrap, B101 skid-cip, B102 tunel-enfriamiento) |
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
