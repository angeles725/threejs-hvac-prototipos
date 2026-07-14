# BLOCKOUT Lineage 0 Archive Manifest

**Asset:** `shell-circulation-facade`  
**Status:** Failed and exhausted  
**Archived:** 2026-07-13  
**Successor:** `Silhouette Reset 1` / lineage 1 / attempt 1

## Why this lineage was closed

Lineage 0 used the allowed initial attempt plus two bounded corrections. All three independent blind reviews returned `FAIL`, so another correction in the same lineage would violate the design3d retry boundary. The evidence is retained unchanged for traceability; lineage 1 is a substantial silhouette reset rather than an attempt 4.

| Attempt | Global score | Verdict | Primary reason |
|---|---:|---|---|
| 1 | 0.54 | FAIL | Eight-room grammar, auditorium proxies, FOH sequence and technical topology were not countable in saved pixels. |
| 2 | 0.77 | FAIL | Only auditorium-family massing missed its threshold: the 2/4/2 families read as a gradient and Sala 3 did not prove a clear wheelchair void. |
| 3 | 0.75 | FAIL / STOP | The final correction still lacked one-view 4+4 labels, self-evident families, separated FOH silhouettes and countable technical endpoints; the review ordered a reset. |

## Reset rationale

`Silhouette Reset 1` replaces inference-heavy evidence with explicit blockout-scale visual proof:

- One overview must expose rooms `1–8` as four per side, mirrored `L/M/M/S` tags and a separate rear strip.
- Billboard/halo labels make 14 TC300, four UC100, UG67, groups A–D and the external chain countable without falsifying device geometry scale.
- FOH masses receive distinct positions, silhouettes and overhead labels with an open checkpoint lane.
- Sala 3 gets a bounded wheelchair void, full bank, screen and center aisle in one view.
- Network media are spread to reduce the gateway knot while preserving exact RS-485, LoRaWAN and Ethernet semantics.

## Inventory

- `assets/blockout-attempt1*` — 23 files: ten canonical images, ten console sidecars, probe, mechanical evidence and blind review.
- `assets/blockout-attempt2*` — 23 files: ten canonical images, ten console sidecars, probe, mechanical evidence and blind review.
- `assets/blockout-attempt3*` — 25 files: ten canonical images, one supplemental grazing image, eleven sidecars, probe, mechanical evidence and blind review.
- `apply-asset-01-blockout.md` — attempt 1 implementation evidence.
- `apply-asset-01-blockout-attempt2.md` — attempt 2 implementation evidence.
- `apply-asset-01-blockout-attempt3.md` — attempt 3 implementation evidence.

Current-lineage evidence reuses `blockout-attempt1*` only under `runs/assets/01-shell-circulation-facade/`; lineage identity is determined by this archive boundary and `runs/progress.yaml`.

## Post-reset gate cleanup

After Silhouette Reset 1 passed the fresh blind BLOCKOUT gate at **0.79**, the standing gate-close cleanup removed the superseded lineage-0 pixel payload: **31 PNG captures and 31 matching console sidecars**. Audit artifacts remain intact:

- all three `*.review.json` verdicts;
- all three `*.probe.json` mechanical probes;
- all three `*.mechanical.json` manifests;
- this manifest and the three apply reports.

The deleted images and sidecars were superseded evidence, not the passing reset evidence under `runs/assets/01-shell-circulation-facade/blockout-attempt1*`.
