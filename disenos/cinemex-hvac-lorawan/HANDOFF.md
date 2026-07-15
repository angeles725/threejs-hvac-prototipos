# HANDOFF — cinemex-hvac-lorawan

**Written:** 2026-07-15 (mid-L4) · **For:** post-compaction context or a fresh session.

## Derive state first — never trust memory (including engram)

```bash
cd /home/cristian/prototipos/three.js
node ~/.claude/skills/design3d/assets/gate-state.mjs disenos/cinemex-hvac-lorawan
```

Kit: `~/.claude/skills/design3d/` v1.5 (LEARNINGS §Active only; library/ has the reusable blocks).

## Where the run is (2026-07-15)

- **8/8 passes gated**; p6-final at LINEAGE 4 IN FLIGHT (L1 0.79 → L2 0.78 → L3 0.82 all passed;
  each lineage a user-authorized improvement round, artifacts in place, lineage naming `-lN-`).
- **L4 content** (writer report `runs/apply-asset-01-p6-l4-attempt1.md`, suite 250/250): M1-M5
  polish (galvanized ducts, checkpoint dressing, spine-duct support, roof-off fill, west units
  spacing) + user feature: 14 Safran-style temperature chips (billboard badges, live sim temps,
  halo only on alarm, tick-driven pulse), exterior-only visibility (isCameraOutside), `top`
  camera preset (thermal roof plan) + "Planta térmica" button.
- **Evidence in flight:** SwiftShader recapture of 37 shots into
  `runs/assets/01-shell-circulation-facade/p6-final-l4-attempt1-*` (manifest
  `runs/p6-final-l4-attempt1.shots.json`), log at the session scratchpad `capture-l4-sw.log`.
  THREE shots have dirty sidecars (capture-timeout class: facade-arch, facade-poster1,
  concessions-display1) — REPAIR PLAN: when 37/37 lands, build a 3-shot repair manifest, reshoot,
  verify sidecars clean, THEN pre-look → blind judge (p6-final-l4, spec-only comparison, embed
  mechanical facts incl. 250/250 tests; judge briefs must embed EXACT schema field names).
- **GPU incident (2026-07-15):** `capture.mjs --gpu` (D3D12) is 4.5x faster but produced BROKEN
  evidence (canvas-texture sprites + inactive DOM buttons render as crossed-out failed-texture
  placeholders in full-page DPR-3). Flag demoted to EXPERIMENTAL NOT GATE-SAFE (comment in
  capture.mjs). SwiftShader is canonical. Never adopt a renderer without piloting the FULL content
  matrix.

## After the L4 gate closes

1. progress.yaml: lineage 4 block (mirror the L3/L2 pattern: active_lineage 4, lineage3
   passed-superseded), canonical PNG copy `p6-final-l4-attempt1.png`, gate-state must derive clean.
2. Ledger `runs/DEFERRED-CORRECTIONS.md`: adjudicate M1-M5 (owned-by:L4) + any new judge rows.
3. Extract cinemex library blocks (post-L4 code freeze): warmup, smooth-dolly + the pending
   `pending-extraction (post-L3/L4)` rows in `~/.claude/skills/design3d/library/INDEX.md`.
4. Delivery kit refresh (hero/thumb/GLB via research/tools/export-glb.mjs + README/REPORT rows).
5. Commit (conventional, no AI attribution) + push (user authorized).
6. Retro: `runs/2026-07-13-retro.md` accumulates live (review-status: applied for the old rounds;
   L4/L5 lessons get staged sections).

## Then: L5 DASHBOARD (task #15, user feature — queued)

Per-RTU dashboard like the hotel: click temperature chip → per-unit view with KPIs, live values,
charts. DECISIONS ALREADY MADE: hotel's in-page drill mechanism (raycast → overlay, NO router) +
real deep-links (?unit= synced); hand-rolled SVG charts; declarative KPI tiles with gauges; zone
status rollup; per-unit mini WebGL scene; B11 Industrial vibra (paper/navy/rust + IBM Plex).
Recon inventory + file:line for all 5 mechanisms: library/INDEX.md §dashboard mechanisms
(source hotel-realista-ensamblado.html). Controls UX relocation agreed with user: mode switch
stays top; cameras → horizontal bar at canvas bottom edge; layers → collapsible popover; faults →
separate "Escenarios" drawer with danger styling; legend → floating canvas chip; breadcrumb for
3D↔dashboard navigation. Build under the anti-ai-ui skill FULL pipeline (brief → vibra → 3
divergence studies → tokens → build → lint → browser verify) + dataviz skill for charts.

## Standing agreements with the user

- Loop autonomously until EVERYTHING is done; never ask, decide with retro/evidence.
- Mid-run kit improvements: user granted standing authorization for beneficial, gate-semantics-free
  changes (apply + document in changelog). LEARNINGS promotions were user-delegated once (v1.4);
  new staged rows still await explicit promotion.
- Push allowed without asking. Commits: conventional, in English, never AI attribution.
- Shells: long gate tools ALWAYS background + full log to file + explicit exit + watchdog Monitor
  (never pipe a gating command; never truncate its output).
- The user's other sessions (claude sdd-investigacion, codex pruebas-dashboards) share this
  machine's CPU — capture pace varies with their load.
