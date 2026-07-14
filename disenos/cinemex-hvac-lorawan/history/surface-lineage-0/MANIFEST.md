# SURFACE Lineage 0 Archive Manifest

**Asset:** `shell-circulation-facade`  
**Status:** Failed and exhausted  
**Archived:** 2026-07-13  
**Successor:** `Surface Reset 1` / lineage 1 / attempt 1

## Why this lineage was closed

Lineage 0 used the initial SURFACE attempt plus both permitted bounded corrections. All three blind reviews returned `FAIL`; continuing as attempt 4 would violate the design3d retry boundary. The original evidence is retained outside `runs/` for audit, while normal gate filenames are reused only by the new reset lineage.

| Attempt | Global score | Verdict | Primary reason |
|---|---:|---|---|
| 1 | 0.68 | FAIL | Front-of-house, auditorium and state-pair surface evidence remained below threshold; the review also reported large state-pair occluders. |
| 2 | 0.65 | FAIL | The review again reported state-pair occluders and found terminal arrows visually merged with packet/link dashes. Later SHA/live-scene diagnostics proved the occluders were image-viewer artifacts rather than scene or PNG defects. |
| 3 | 0.79 | FAIL / RESET | Four of five critical features passed; only `canonical-network-endpoints` missed at 0.77/0.80 because the amber clusters read as crosses/T/L shapes and endpoint cues were too small in complete-network. |

## Surface Reset 1 rationale

The reset preserves the accepted surface implementation and changes only the remaining evidence-critical communication grammar:

- each direction marker becomes one unmistakable tangent-aligned arrowhead, without secondary arms or a hub;
- projected marker size is prioritized for the complete-network view without changing device geometry scale;
- TC300, UC100 and UG67 identifiers outrank competing zone labels in the network overview;
- the corridor evidence camera is lowered/repositioned so room numbers, exits, posters and carpet lead the composition instead of roof members.

## Inventory

- `assets/surface-attempt1*` — original attempt 1 captures, sidecars, manifests, probe, mechanical evidence and review.
- `assets/surface-attempt2*` — original attempt 2 captures, sidecars, tests/syntax, manifests, probe, mechanical evidence and review.
- `assets/surface-attempt3*` — original attempt 3 captures, sidecars, tests/syntax, SHA/pixel evidence, probe, mechanical evidence and review.
- `logs/surface-attempt1*`, `logs/surface-attempt2*`, `logs/surface-attempt3*` — strict-TDD, capture and gate-state logs.
- `apply-asset-01-surface*.md` — implementation reports for attempts 1–3.
- `INVENTORY.sha256` — immutable content checksum inventory for the archived payload.

Current-lineage evidence reuses `surface-attempt1*` only under `runs/assets/01-shell-circulation-facade/`. Lineage identity is determined by this archive boundary and `runs/progress.yaml`.
