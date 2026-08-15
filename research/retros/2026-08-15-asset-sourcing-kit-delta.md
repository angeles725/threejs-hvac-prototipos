<!-- review-status: pending -->
# research-sdd kit delta — asset-sourcing step (propose-never-apply)

**Origin:** operator directive 2026-08-15 (threejs-hvac-prototipos), NOT a run-surfaced defect. This
file only PROPOSES; the research-sdd kit (`sdd-investigacion`) is edited by a human. Full spec of the
capability lives in `disenos/catalog/EXTERNAL-ASSETS.md`.

This is a cross-cutting workflow delta, not tied to a single research target, so it is filed here in
the corpus `research/retros/` rather than under a `<target>/retros/`. No kit file was touched.

## Context

The operator authorized reusing/downloading external 3D meshes (CC0/CC-BY) and made offline-first the
default for new designs. research-sdd already carries the provenance discipline (`fetch-doc.sh` →
`sources/` + `SOURCES.md`, `[CERT]` markers) that makes this safe — it just has no explicit step for
sourcing REUSABLE GEOMETRY as opposed to documents.

## Proposed deltas

| # | change | target file/§ | evidence | type | priority |
|---|---|---|---|---|---|
| 1 | Add an **asset-sourcing step** to the discovery loop: before modeling a subject, (a) search OUR catalog (`disenos/catalog/catalog.yaml`, 107 assets) to avoid duplication, then (b) search CC0-first sources. For a MEASURED subject, download the SPEC/datasheet (existing `fetch-doc.sh` path); for a DECORATIVE/context asset, download a CANDIDATE MESH and preserve it with provenance. | METHODOLOGY (discovery phase) + PROMPT-LOOP NORMAL CYCLE | `EXTERNAL-ASSETS.md §0, §D`; operator directive 2026-08-15 | addition | medium |
| 2 | Add a **license gate** to any mesh download: only CC0 (preferred) or CC-BY (attribution recorded); reject NC, Sketchfab-standard, non-redistributable, unlicensed. Mirror the SECRETS DISCIPLINE pattern (a hard rule stated once, enforced everywhere). | PROMPT-LOOP HARD RULES | `EXTERNAL-ASSETS.md §B.1`; CC0/CC-BY feasibility verified via web 2026-08-15 | addition | high |
| 3 | Add a **provenance schema for meshes** (url, author, license, sha256, original scale, transforms applied, real-world size, fidelity) parallel to the doc-provenance already in `SOURCES.md` — so a downloaded mesh is as traceable as a downloaded datasheet. | templates/ + SOURCES.md convention | `EXTERNAL-ASSETS.md §B.4` | addition | medium |
| 4 | State the boundary explicitly: an external mesh NEVER enters a `[CERT]` claim; the math/kinematics logic stays authoritative for measured subjects. | METHODOLOGY (provenance/markers §) | `EXTERNAL-ASSETS.md §0, §D`; existing `[CERT]`/`[INFER]` marker rules | clarification | high |

## Honesty note

None of these come from a research run's measured failure — they are an operator feature directive.
They are filed as proposals precisely so the human evaluates them against the kit's existing rules
before any of it becomes kit behavior. A retro that invents run-evidence it does not have would be
exactly the drift the propose-never-apply boundary exists to prevent.
