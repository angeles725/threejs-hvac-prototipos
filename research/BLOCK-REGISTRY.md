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
| B70 | transporte | conveyor texture-offset scroll |
| B71 | transporte | conveyor dimensional reference |
| B72 | transporte | material-handling vehicle + overhead-crane reference |
| B73 | transporte | (transporte-4) |

> Note: `research/sources/B59-proceso-dims/` is a NAMESPACED source folder (proceso), not block B59.
> Source folders are namespaced by family (`B63-automotriz-dims`) so a number clash never merges two corpora.

## Assigned ranges (next free inside each)
| Family | Range | Next free |
|---|---|---|
| puertas + almacenamiento (session-B) | B57–B69 | B65 |
| transporte | B70–B79 | B74 |
| robotica | B80–B89 | B80 (B62 is its historical entry; new blocks go B80+) |
| automotriz | B90–B99 | B90 (B63 historical; new blocks B90+) |
| proceso / fluidos / utilities | B100–B119 | B100 |
| any new family | ask session-A | — |

## Detection (for the integration gate — TODO)
The only check that catches a wrong-topic citation is crossing each `[Block N]` cite against the
**title** of block N (content), not against its number or mere existence. Counting cites or checking the
file resolves detects nothing. session-B/transporte proposed it; to be added to `tools/`.
