# Run note — jaula-seguridad · materials attempt 1

## Evidence binding (read before running capture-gc here)

`materials-attempt1-grazing.png` + `.console.json` are **EVIDENCE, not a superseded frame.**
They are bound by this documented glob: `materials-attempt1-grazing.*`.

GATES.md §Capture requires a LOOK-DEV set for a materials pass (`neutral` + `grazing`), and the
spec declares both in `camera.evidence_views`. `capture-gc.mjs` cannot see that binding — it reads
the suffix and offers to prune the file as a working frame. A dry run on 2026-08-09 proposed exactly
that (`prune materials-attempt1-grazing.png (5340 KB)`). **Do not apply it.** Deleting that shot
deletes the evidence for the requirement the pass was gated on, and the grazing view is the only
capture in which the padlock is legible at native resolution.

## Census (capture-gc equivalent, applied by hand for the reason above)

- promoted: `materials-attempt1.review.json` → `jaula-seguridad.review.json`
- pruned: `materials-attempt1.png` + `materials-attempt1.console.json` — byte twins of the canonical
  pair (md5 `440b6c1d1076192629d9bd52363b199d`), redundant since `gate-state.mjs` accepts the
  canonical `<slug>.{png,review.json}` as a pass witness. 4.7 MB freed.
- kept: `jaula-seguridad.png` (canonical witness) · `jaula-seguridad.console.json` ·
  `materials-attempt1-grazing.*` (look-dev evidence, above) · every review JSON.
- `progress.yaml` `screenshot:` re-pointed to the canonical PNG after the twin was pruned, and
  `gate-state.mjs` re-run: `clean: derivation coherent, cache matches` (exit 0).

## Deviations recorded, not hidden

Three, all written into `materials-attempt1.review.json` `mechanical.note`:

1. **The reviewer is the orchestrator inline, not a fresh-context blind agent.** This session cannot
   spawn subagents; GATES.md allows an inline role hat only in quick mode. **This verdict is a
   self-review and is NOT the independent acceptance authority the contract requires.** It should be
   re-reviewed blind before the asset is treated as contract-passed.
2. The `neutral` evidence view is deliberately the default camera (it is the hero framing), so the
   distinctness check proves neutral ≠ grazing, not neutral ≠ default.
3. No `reference-match` view: this design has no reference photographs, only a textual federal
   specification (`p6_comparison: spec-only`).
