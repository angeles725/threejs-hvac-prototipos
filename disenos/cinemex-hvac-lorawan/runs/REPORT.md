# cinemex-hvac-lorawan — run report (design3d HEAVY, threejs track)

**Completed:** 2026-07-14 · **Result:** all 8 ladder passes GATED · `gate-state.mjs` derivation clean.
Scene: eight-screen Cinemex multiplex (60×45 m) with the full HVAC monitoring chain
TC300 ×14 → RS-485 (4 buses) → UC100 ×4 → LoRaWAN → UG67 → Ethernet/Internet → Niagara + clients,
deterministic fault/hot simulation, and an es-MX operations HUD.

## Per-pass gate table

| Pass | Score | Attempts | Evidence (screenshot · review) |
|---|---|---|---|
| blockout | 0.79 | 1 | [png](assets/01-shell-circulation-facade/blockout-attempt1.png) · [review](assets/01-shell-circulation-facade/blockout-attempt1.review.json) |
| structural | 0.82 | 3 | [png](assets/01-shell-circulation-facade/structural-attempt3.png) · [review](assets/01-shell-circulation-facade/structural-attempt3.review.json) |
| materials | 0.81 | 3 | [png](assets/01-shell-circulation-facade/materials-attempt3.png) · [review](assets/01-shell-circulation-facade/materials-attempt3.review.json) |
| surface | 0.81 | 3 (lineage 2) | [png](assets/01-shell-circulation-facade/surface-attempt3.png) · [review](assets/01-shell-circulation-facade/surface-attempt3.review.json) |
| lighting-camera | 0.80 | 1 (lineage 2; lineage 1 exhausted 0.71/0.72/0.77) | [png](assets/01-shell-circulation-facade/lighting-camera-l2-attempt1.png) · [review](assets/01-shell-circulation-facade/lighting-camera-l2-attempt1.review.json) |
| interaction-ui | 0.81 | 1 | [png](assets/01-shell-circulation-facade/interaction-ui-attempt1.png) · [review](assets/01-shell-circulation-facade/interaction-ui-attempt1.review.json) |
| optimization | 0.82 | 1 | [png](assets/01-shell-circulation-facade/optimization-attempt1.png) · [review](assets/01-shell-circulation-facade/optimization-attempt1.review.json) |
| p6-final | 0.79 | 1 | [png](assets/01-shell-circulation-facade/p6-final-attempt1.png) · [review](assets/01-shell-circulation-facade/p6-final-attempt1.review.json) |

P6 comparison mode: **spec-only** (zero photographic references of the target — X4); gated on the
spec's textual promises + the [blockout-vs-final strip](assets/01-shell-circulation-facade/p6-final-attempt1-blockout-vs-final-strip.png).

## Mechanical summary

- Tests: **211/211** (`node --test tests/*.test.mjs`), strict TDD throughout.
- Perf (renderer.info, worst measured): **225/550 draws (41%) · 30,708/750,000 tris (4.1%)**;
  worst fault state 195/25,964. Full grid: [optimization mechanical](assets/01-shell-circulation-facade/optimization-attempt1.mechanical.json).
- Console: every gate's full capture set shipped with clean sidecars (errors/warnings/pageerrors/network).
- Evidence chain: every multi-shot set preflighted with `preflight.mjs --contract` before capture
  (27-shot interaction set, 12-shot optimization set, 31-shot P6 set — twice, after the pass-label fix).

## Open items (user decisions — none blocking)

See [DEFERRED-CORRECTIONS.md](DEFERRED-CORRECTIONS.md): P6 polish rows P1–P6d (checkpoint preset
framing, external-schematic visibility in architecture state, per-family roof articulation,
display-frame delta, sala lights-off floor, technical preset reframe) plus the P6 judge's headroom
recommendations. Historic interaction/optimization polish rows (I1–I5, O1/O3) remain open at lower
priority.

## Key artifacts

- App: [index.html](../index.html) (importmap + `src/` ES modules — serve over http, never file://)
- Spec: [design-spec.yaml](../design-spec.yaml) (P3 re-validated 2026-07-14 after X1/X4)
- Delivery kit: hero/thumb PNGs + `.glb` in the design folder, README table row
- Live retro: [2026-07-13-retro.md](2026-07-13-retro.md) (deltas #1–#15, review-status: pending)
