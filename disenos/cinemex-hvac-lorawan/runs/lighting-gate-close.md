# LIGHTING-CAMERA — gate close

**Asset:** 01-shell-circulation-facade
**Lineage:** 2 (`lighting-reset-1`, user-authorized) · **Attempts:** 1 · **Verdict:** PASS at **0.80** (min 0.78)
**Derivation:** `gate-state.mjs` → `lighting-camera passed (attempts 1, score 0.8)` — clean, cache matches.

## Score history

| lineage | attempt | global | verdict |
|---|---|---|---|
| 1 | 1 | 0.71 | fail — the house rig's exterior directionals washed every interior; no ladder at all |
| 1 | 2 | 0.72 | fail — OVERCORRECTED: corridor and auditorium went to black |
| 1 | 3 | 0.77 | fail — short by 0.01; **three-attempt stop rule fired, escalated to the user** |
| **2** | **1** | **0.80** | **PASS** — all five criticals clear on the first attempt of the reset |

Final criticals: multiplex-plan-grammar 0.80/0.78 · auditorium-family-massing 0.78/0.76 ·
front-of-house-sequence 0.79/0.75 · canonical-network-endpoints 0.83/0.80 ·
architecture-engineering-state-pair 0.80/0.75. important_average 0.763 (floor 0.65).

## The four-tier ladder, measured (lights-on band means)

| tier | surfaces |
|---|---|
| lobby | floor **168** |
| corridor | ceiling **117** · wall **86** · floor **36** |
| auditorium | wall **34** · **ceiling 14** |

**The auditorium ceiling is now the darkest surface in frame.** That single inversion — the auditorium
out-shining the corridor — is what failed lineage 1.

## Why lineage 1 took three attempts to find a one-line bug

The auditorium ceiling was the underside of its `<family>-roof` panel. Layer `roof` ⇒ zone `exterior`
⇒ `dim = 1.0`, undimmed. Meanwhile `resolveFixtureIntensity` pre-compensated auditorium lamps by
`1/dim` = **147×**, handing `THREE.PointLight` a raw intensity of **2573** for the screen lamp — sitting
underneath a ceiling the system believed was outdoors.

Three consecutive GREEN test suites could not see it, and here is the deepest lesson of this pass:
`resolveSurfaceRadiance` filtered fixtures **by the surface's own zone**, so the model had made the
defect *physically impossible to represent*. Asked for the auditorium ceiling it confidently returned
`0.000`. The test was not measuring wrong — **it could not express the bug**.

Two more test-model failures were found and fixed along the way:
- attempt 2's tests composed the pixel as `albedo × irradiance` with **no `RECIPROCAL_PI`**. three.js
  r160 (`useLegacyLights=false`) routes every reflected term through `BRDF_Lambert`, so the renderer is
  **3.14× darker than that model — for LIT surfaces only.** Emissives carry no π, which is exactly why
  strips and screens looked correct while everything around them rendered black.
- `corridorHalfWidth` was 3.6 while the corridor's own walls and door leaves stand at `x = ±3.72` —
  every surface the corridor camera looks at was being lit six stops down, as auditorium.

## Evidence

First set in this run captured by the **hardened harness**: waits for the canvas element (it never did
— a blind 9 s sleep hid that for the whole project), settles on a cheap compositor clip, flags uniform
/ half-built frames, records the URL that produced each artifact, and **exits non-zero on a partial
set**. The previous harness exited 0 with 10 of 24 shots dead.

- 24 captures, DPR 3 (2064×1908). DPR 4 was paying to rasterize pixels the blind reviewer discards in
  its own downscale — and that downscale has already cost this run attempts.
- **24/24 console sidecars clean · 0 uniform frames · 0 half-built frames.**
- Unit tests 184/0. Probe within budget (but see deferred defect X3 — it under-reads at the default
  camera and the optimization pass must re-measure honestly).

## Deferred corrections carried forward

Six non-blocking corrections from the passing review are logged in `runs/DEFERRED-CORRECTIONS.md`.
Four of the SURFACE-deferred items (S1, S2, S4, S5) are now RESOLVED by this pass — the judge scored
`canonical-network-endpoints` 0.83 and `technical-containment` 0.75, confirming the RS-485 green, the
media distinction and the device labels all survived the relight.

## Next

INTERACTION-UI unlocks. **Warning for that pass:** the spec's `deterministic_query_states` declares
`state` values (`fault-tc300`, `fault-uc100-b`, `fault-internet`, `hot-sala-3`, `hot-kitchen`),
`selection` and `tick` that **are not implemented** in `query-state.js` — and an unknown value on a
known key silently resets the ENTIRE state to defaults. That is new functionality, not tuning, and it
is the pass most likely to behave like SURFACE did.
