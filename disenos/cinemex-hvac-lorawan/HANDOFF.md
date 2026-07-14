# HANDOFF — cinemex-hvac-lorawan

**Written:** 2026-07-14 · **For:** the next orchestrator (a fresh session, possibly a different model).

## Read this first, in this order

1. **Derive the state — never trust memory, including engram.**
   ```bash
   cd /home/cristian/prototipos/three.js
   node ~/.claude/skills/design3d/assets/gate-state.mjs disenos/cinemex-hvac-lorawan
   ```
   That output is the truth. `runs/progress.yaml` is a CACHE of it. If they disagree, the derivation
   wins and the cache is corrupt.
2. `~/.claude/skills/design3d/` — the kit (`SKILL.md`, `references/*`, `LEARNINGS.md` **§Active only**).
3. `runs/DEFERRED-CORRECTIONS.md` — the live debt. Nothing here may reach P6 unresolved.
4. `runs/2026-07-13-retro.md` — 13 proposed kit deltas + ~12 STAGED learnings. **Staged = not binding
   until the USER promotes them.** Do not treat them as house rules.

**A warning about engram.** Memories saved on 2026-07-13/14 are persisted (readable by `mem_get_observation`)
but **do NOT come back from `mem_search`** — the index did not pick them up. If you search engram you will
find the Codex session from 2026-07-12 and believe THAT is the state. **It is not.** The files above are
the authority. This is exactly why the kit says *"Engram is NEVER authority for learnings — files win."*

## Where the run is

| pass | status | score |
|---|---|---|
| blockout | passed | 0.79 |
| structural | passed | 0.82 |
| materials | passed | 0.81 |
| surface | passed (lineage 2) | 0.81 |
| lighting-camera | passed (lineage 2) | 0.80 |
| **interaction-ui** | **evidence captured, awaiting blind review** | — |
| optimization | locked | — |
| P6 / P7 / P8 | locked | — |

Five passes are GATED. **They must not regress.** Any change that touches topology, device positions or
scale, RS-485 route paths, the materials palette, the surface detail plan, or the lighting rig re-opens
a closed gate.

## Traps specific to THIS design — each one cost real attempts

1. **An unknown VALUE on a known query key resets the ENTIRE app state to defaults** (`parseQueryState`
   is atomic). A capture set driven with spec-literal URLs becomes N pictures of the default camera under
   N lying filenames, with a clean console and a green exit. **Always run
   `preflight.mjs --contract <shots.json>` before spending an attempt.** It drives every shot and proves
   each renders a distinct, non-default view.
2. **The spec's `deterministic_query_states.view` vocabulary is implemented as `camera=`.** `view=` is a
   LAYER FILTER (`all|architecture|hvac`), not a camera selector. Using the spec's literal `?view=facade`
   triggers trap 1.
3. **The blind judge reads DOWNSCALED renders (~2000 px long edge).** It reported arrowheads as ABSENT
   that are plainly visible at 1:1 in the very capture it scored. For any fine-detail feature, include a
   NATIVE-RESOLUTION CROP in the evidence, or the pass burns attempts on a defect the downscale invented.
   Capture gate evidence at `--dpr 3`, not 4: DPR 4 pays to rasterize pixels the judge discards.
4. **A blind-review CORRECTION is a hypothesis, not a fact.** The judge reports the DEFECT reliably and
   the CAUSE unreliably. One correction here ("nudge GATEWAY up, it overlaps RF2") named the wrong pair —
   obeying it literally would have made the real crowding worse. Run the `diagnostician` role first.
5. **`interaction-ui` delivers in the DOM** (alarm list, selection panel, HUD). Capture it with
   `capture.mjs --page`, not canvas-only — a canvas shot is blind to the entire deliverable.
6. **The capture URL is a distinct CODE PATH.** All five fault states once booted announcing "Sin alarmas"
   (one with 14 alarms active); clicking the fault button repaired it, so a human tester never saw it. It
   was present only on cold URL load — the only path a judge drives. Test the LOAD.
7. **The old `probe.mjs` did not measure the scene.** It counted each InstancedMesh as ONE instance and
   reported 59 draws / 708 tris (≈12 tris per draw — one box) for the whole multiplex, identically for two
   different cameras. It now reads three.js's own `renderer.info` via the `window.__qaRenderInfo` hook in
   `main.js`. **Real cost: 214 draws / 28,726 tris** (worst case with a fault active: 195 / 25,964) against
   a 550 / 750,000 budget. The optimization pass MUST use `renderer.info`, or it optimizes against a fiction.

## Rules this run learned the hard way (now in the kit)

- **Three kinds of error, three responses** (`PIPELINE.md`): instrument → fix NOW · design → follow the
  pass protocol, never hand-patch a gate · lesson → STAGE it, never self-promote.
- **NEVER capture while code is in flight.** Order: `code closed → preflight → capture → judge`. This
  binds instrument fixes too — a QA hook in the app is still a code change. (The orchestrator wrote this
  rule and broke it within the hour.)
- **When the instrument accuses, interrogate the instrument first.** Three times a check reported a defect
  that was IN the check. A wrong tool costs more than a missing one: it sends you to fix code that is not
  broken, with total confidence.
- **Test-vs-render jurisdiction** (`GATES.md`): if a human can judge it by looking at one image, RENDER it;
  if a human cannot count it at a glance, TEST it. **Never simulate the renderer inside a test to predict a
  pixel** — that cost two failed lighting attempts.
- **A test that COPIES the constant it guards cannot catch a wrong constant.** Derive the property.
- **A derived test is only as good as its SAMPLING.** An unsampled surface is an unguarded surface.
- **When a critical feature fails repeatedly at a NEAR-THRESHOLD score, the defect is not in what is being
  scored — it is in what that thing ANNOTATES.** `canonical-network-endpoints` failed EIGHT straight
  attempts at 0.77–0.79 while every attempt tuned arrowheads; the RS-485 drop terminated in a junction cube
  LARGER than the 100 mm TC300 it annotated, so the chain's first node had no pixels at all.

## Immediate next steps

**`interaction-ui` CODE IS DONE AND FROZEN (211/211 tests green). Only its evidence is missing** — the
capture run was stopped at session close and the partial set deleted (an incomplete evidence set must
never sit in `runs/`). Re-run it; the command below is already validated end-to-end.

```bash
cd /home/cristian/prototipos/three.js
setsid python3 -m http.server 8123 --bind 127.0.0.1 >/dev/null 2>&1 < /dev/null & disown

# The 27-shot manifest: 3 required views (engineering-section, ug67, complete-network)
# x 7 required states + 2 extra states per view for the owned animation channels.
# Rebuild it from `evidence_contract.interaction-ui` in design-spec.yaml, using camera= (NOT view=).

# 1. PROVE the evidence chain first — this is not optional (GATES.md §Gate steps 0):
node research/tools/preflight.mjs "disenos/cinemex-hvac-lorawan/index.html" --contract <shots.json>

# 2. Only if it PASSES, capture. --page is REQUIRED: this pass delivers in the DOM.
node research/tools/capture.mjs --shots <shots.json> --jobs 2 --dpr 3 --page \
  "disenos/cinemex-hvac-lorawan/runs/assets/01-shell-circulation-facade" \
  "disenos/cinemex-hvac-lorawan/index.html"

# 3. Probe the WORST case, with renderer.info (never the default camera):
node research/tools/probe.mjs --url-suffix "camera=complete-network&state=fault-internet&links=all" \
  "disenos/cinemex-hvac-lorawan/index.html"
```

Both `preflight --contract` and the capture command were run successfully against this exact code, so a
failure now means something regressed — not that the command is wrong.

1. Blind-review the `interaction-ui` evidence set (27 captures, `--page`, dpr 3). Look at the decisive
   captures YOURSELF before spending the review — 30 seconds vs a 45-minute cycle.
2. Close the gate, then apply the two QUEUED debts (they were held back because captures were in flight):
   - **X1** — the surface evidence test projects through `SURFACE_EVIDENCE_VIEWPORT` at **0.8 portrait
     aspect** while `capture.mjs` renders **4:3**. Two different truths about one image. It forced the
     facade 4.5 m off-axis. **This is a `refine-spec`, not a `refine-code`.**
   - **X4** — the design has **ZERO reference images** (P1 evidence is textual). `GATES.md` §P6 demands
     reference|render pairs, and the app carries a `reference-match` preset that matches nothing. The kit
     now handles this: set `p6_comparison: spec-only` in the spec, DROP `reference-match` from the evidence
     contract, and gate P6 on the spec's textual promises + the blockout-vs-final strip.
3. Then: `optimization` → P6 → P7 (delivery kit) → P8 (retro).
4. **S6** is still open: TC300-02 has no chip in the concessions engineering capture. Unverified in pixels.

## Commit state

`a7a2c5d fix(tools): make the capture harness fail loud instead of lying quietly` — the hardened harness
is committed. **The cinemex design directory is still UNTRACKED**, and the kit edits under
`~/.claude/skills/design3d/` are outside this repo. Commit the design when its gate closes; the user has
authorized commits but **never push or PR without asking**.
