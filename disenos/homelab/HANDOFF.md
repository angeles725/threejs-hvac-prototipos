# homelab run — SESSION HANDOFF (2026-08-15)

Read this first to resume the homelab design3d heavy run in a fresh session.
Also read: `P1-INTAKE.md`, `P1-DATASHEETS.md`, and each asset's `runs/progress.yaml`.

## Where the run stands (2 of 7 assets COMPLETE)

| Asset | Dir | State |
|---|---|---|
| rack-cabinet | `disenos/homelab/rack-cabinet/` | ✅ COMPLETE — 7 build passes + P6 (0.86) |
| pdu-panduit  | `disenos/homelab/pdu-panduit/`  | ✅ COMPLETE — 7 build passes + P6 (0.86) |
| **ups-panduit** | `disenos/homelab/ups-panduit/` | 🔄 P2 spec + skeleton + BLOCKOUT geometry ALL on disk (variant U05N11V, 3U SmartZone, 440×666.5×131 mm, 4 criticals, cam az35/el20/fov40 r0.80, states ?power=on\|off, __qaFraming/__qaState wired). **P3 NOT yet gated.** Next session: P3-gate the spec → CAPTURE the blockout (already coded — NO re-launch needed to build it) → judge → continue the ladder. |
| **stratix-5700** | `disenos/homelab/stratix-5700/` | 🔄 spec P3 PASSED · BLOCKOUT BUILT by @ayudante, on disk, **awaiting capture + inline judge** (FIRST Stratix action for the next session). draws 38/150, tris 1604. States: default · ?leds=on · ?rail=on · ?cam=rear · ?cam=port-detail (this detail view uses its OWN ndc margin 0.72 — do NOT fail it on the standard framing rule). @ayudante is idle waiting for the verdict; reconnect and gate it. |
| axis-camera | — | ⬜ NOT STARTED (generic dome placeholder; datasheet indeterminate) |
| fmps | — | ⬜ NOT STARTED (Panduit Fault Managed Power System, 1U chassis) |
| scene (assembly) | — | ⬜ NOT STARTED — THIS is "the complete homelab": all equipment in the aisle + office context + external decorative props (user Option B) |

## Agents (CRITICAL for resume)
- **@ayudante** = a PEER Claude session (Opus 5), on the STRATIX 5700. It PERSISTS across my session close — reconnect via `ListAgents` → `SendMessage to: "ayudante"`. It is the sole writer of its own `progress.yaml`.
- **a0337e** (UPS modeler) = an in-process SUBAGENT of the OLD session — dead now. But it FINISHED P2 + skeleton + blockout geometry before close, all on disk under `ups-panduit/`. So do NOT re-launch from scratch: inspect what is there, P3-gate the spec, capture the blockout. Re-launch a fresh modeler only for the LATER passes (structural onward) once blockout passes.

## Established conventions (KEEP THESE)
- **Orchestrator is the INLINE judge** (user directive): judge each gate yourself from spec+pixels; reserve a fresh blind sub-judge only for marginal/contested calls. Write the verdict to `runs/<pass>-attempt<N>.review.json` (schema: `~/.claude/skills/design3d/assets/review.schema.json`).
- **Pacing: full-auto** — report to the user only at big milestones (asset complete) or escalation.
- **Per-asset dir** `disenos/homelab/<asset>/` with its own `design-spec.yaml` + `runs/` + modular `src/` + `vendor/` (offline). Ladder: P2 spec → P3 gate (inline) → blockout → structural → materials → surface → lighting-camera → interaction-ui → optimization → P6.
- **Modelers NEVER run a server or captures.** The orchestrator owns the QA server on `:8123` (serve repo root) and runs `probe.mjs` / `capture.mjs --dpr 3` / `framing-probe.mjs`. interaction-ui + P6 capture `--page` (DOM UI is the deliverable); other passes canvas-only.
- **progress.yaml: ONE writer per file.** Dual writers cause silent duplicate-key loss (YAML keeps the last dup, parses clean, lies). Dedup check: `rg -o "^  [a-z][\w-]*:" runs/progress.yaml | sort | uniq -d` (per-KEY, not `rg -c` which counts lines).
- **capture-GC at pass close** (kit v1.14): `node ~/.claude/skills/design3d/assets/capture-gc.mjs <design-dir> --apply` — keeps reps + distinct-view coverage + all reviews, prunes failed attempts + byte-twins.
- **Integrity bar set by @ayudante** (match it): no unsourced geometry (removed fake per-outlet LEDs; kept mount-button diameter evidence-gated), no fabricated text/numbers (nameplate has no invented voltage; LCD shows bars not numbers), fix defects by DESIGN not by lowering thresholds, measure before declaring.

## Pending USER items (surface these)
1. **7 site photos are NOT on disk** → every P6 is `p6_comparison: spec-only`. Save them to `disenos/homelab/references/` for a reference-backed P6 re-gate.
2. **Kit commits NOT pushed** — v1.12 (retro), v1.13 (modular src/ default + build-offline), v1.14 (capture-GC). Repo `~/.claude/skills/design3d` on master. Awaiting push OK.
3. **Repo-wide capture-GC sweep** (~83 files / 19 MB across other designs) — only the homelab was cleaned; the rest awaits OK.
4. **sweep-captures hook** not wired into SessionStart (would auto-surface capture garbage) — settings.json change, awaiting OK.

## Remaining work to "complete homelab"
UPS + Stratix (in-flight) → then Axis camera + FMPS (full ladders) → then the SCENE ASSEMBLY (asset #7): integrate all 6 equipment types into one aisle scene + office context + external decorative props (build `research/tools/fetch-external-asset.mjs` + `verify-external-asset.mjs` per `disenos/catalog/EXTERNAL-ASSETS.md` — user Option B) → gate the assembled scene → P7 delivery (hero/thumbnail/GLB per asset + extract reusable blocks to the design3d LIBRARY, which has NO rack/PDU/UPS blocks yet).
