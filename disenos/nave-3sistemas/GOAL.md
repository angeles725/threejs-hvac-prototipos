# GOAL — nave-3sistemas

## One-line goal

An interactive 3D digital twin of an industrial bay where **HVAC**, **LIGHTING** and **COMPRESSED
AIR** are one coupled system, driven by a live SCADA-style dashboard that is the primary
deliverable — the 3D view is the dashboard's evidence surface, not a decoration.

## Why the three systems must be coupled (the design thesis)

A dashboard that shows three independent gauges is three dashboards in one page. This one is a
single plant model: every reading is DERIVED from the others.

| Coupling | Direction | Physical law encoded |
|---|---|---|
| Lighting → HVAC | luminaire electrical power lands in the space as sensible heat | `Q_light = Σ P_fixture · (1 − dim%)` |
| Compressors → HVAC | ~100 % of compressor shaft power becomes heat; air-cooled units dump it into the bay unless ducted out | `Q_comp = P_shaft · (1 − heat_recovered)` |
| HVAC → electrical | cooling load drives chiller/AHU kW draw | `P_hvac = (Q_light + Q_comp + Q_envelope + Q_people) / COP` |
| Compressors → compressors | a pressure band sequences lead/lag units; unloaded running burns kW for zero cfm | band 115–120 psi, load/unload hysteresis |
| HVAC → lighting | nothing (deliberately) — an honest model states its non-couplings | — |

## Acceptance (what "done" means)

1. **Dashboard-first.** Every plant number on screen is derived from the simulation, never
   hard-coded. Two DOM surfaces describing the same state cannot contradict (single derivation).
2. **Visible causality.** Changing ONE input (dim the lights, start a compressor, open a bay door)
   visibly moves the other two systems in both the dashboard and the 3D scene within one tick.
3. **The 3D reads as the plant.** HVAC units, luminaires and the compressor room are identifiable
   equipment at a glance, not boxes — gated per the design3d pass ladder.
4. **Gate-backed.** Every pass carries its capture + blind-review JSON on disk under `runs/`.
   No verbal "looks good".
5. **Runs headless.** SwiftShader-safe (no RectAreaLight, no `transmission`), console clean,
   within the perf budget.

## Non-goals

- No BMS/Niagara integration, no backend, no real telemetry. The simulation is synthetic and
  self-contained in one page.
- No photoreal render target. The bar is "reads correctly" (0.75+) per the fidelity ladder.

## Execution

design3d heavy DAG (P0→P8), one asset gated at a time, driven by a `/loop` orchestrator.
Status is DERIVED from `runs/`, never asserted from memory.
