# Reconciliation — DASHBOARD-UX.md vs design-spec.yaml

Date: 2026-08-13 · Decided by: orchestrator · Status: binding

`DASHBOARD-UX.md` was commissioned BEFORE `P1-AMENDMENT.md` existed, so its author could not know
about the compressor-room exhaust decision. Where the two documents disagree, **the spec wins** —
it is the gated contract. This file records what was adopted, what was overridden, and why, so a
later reader does not "fix" the spec to match the UX doc.

## 1. Controls — the spec's set stands

| UX doc | spec | resolution |
|---|---|---|
| `dim` 0–100 % | `dim` 0–100 % | ADOPTED, identical |
| `occ` 0–100 people | `people` 0–60 | spec name and range; 60 is the P1 occupancy band, 100 was invented |
| `t_out` 15–45 °C | `tout` 20–42 | spec range; it is the band the envelope evidence covers |
| `recovery` 0–100 % | `recovery` off/on | spec: a two-state control, because the recovery FRACTION is a plant property (0.55), not a dial the operator turns |
| `comp` auto\|0–5 | `demand` + `leadmode` | **OVERRIDDEN.** Manually selecting how many compressors run bypasses the pressure band, which is the actual physics. The user sets DEMAND; the sequencer decides what runs. Watching it decide is the lesson |
| `bay_open` 0\|1 | `bayopen` 0\|1 | ADOPTED — it drives infiltration, a real and visible coupling |
| — | **`exhaust` 0–95 %** | **MISSING FROM THE UX DOC ENTIRELY.** This is the single most instructive control on the page: it moves the cooling load 40 → 155 kW and drives the AHU into saturation. It must occupy a prominent position in the what-if row, not a corner |
| — | `layers`, `tick`, `view` | spec-only: capture/QA controls the UX doc had no reason to know about |

## 2. Coupling mechanisms — adopted as recommended

The UX doc's shortlist is good and is adopted in its priority order:

1. **Stacked cooling-load bar** — which source dominates. Adopted, with one change: four segments,
   not five (envelope + infiltration merge into "Exterior"). See `src/dashboard/tokens.mjs` for the
   reasoning — it is physics, and it is also what let the palette clear the colourblind floor.
2. **Delta badges** on KPI tiles — makes propagation perceptible.
3. **Linked 3D highlighting** — hovering a load contributor highlights the objects producing it.
4. **Flow strip** `[Q_total] → [÷COP] → [HVAC kW]` — the equation, spelled out.
5. **What-if control row** — causality made interactive. `exhaust` leads this row.

Its REJECTION of a full Sankey is accepted and for the right reason: it carries the same two facts
as bar + strip at three times the SVG cost.

## 3. Layout — adopted, with the canvas share re-checked

The 1522 × 758 canvas / 360 px sidebar split is adopted. Note for the lighting-camera pass: the
spec's FOV 55 deviation was justified against exactly this non-full-screen canvas, so if the split
changes, the FOV justification has to be re-argued rather than silently inherited.

## 4. Alarm model — superseded by the simulation

The UX doc proposes threshold logic per surface. The implementation does NOT do this: every alarm
comes from `deriveAlarms()` in `src/sim/plant.mjs`, and both the DOM and the 3D read that one
array. No surface owns a threshold. The UX doc's own anti-contradiction rule is satisfied more
strictly than it asked for, and `tests/dashboard-model.test.mjs` asserts it.

## 5. Charts — adopted, hand-rolled SVG, no libraries

Its five-chart inventory stands. Chart 3 (pressure trend with the 115–120 psi band drawn as a
shaded rect BEHIND the line) is the one to get right: the band is the reference the reading is
judged against, so it is drawn first and the stroke sits on top.
