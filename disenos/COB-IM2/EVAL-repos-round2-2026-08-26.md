# Repo evaluation round 2 — the new candidate list (2026-08-26)

Companion to `EVAL-repos-2026-08-25.md`. Same discipline: **every licence read from the
upstream `LICENSE` file** (via `gh api .../contents/LICENSE` or raw fetch), never a README
badge or `package.json`. `NOASSERTION` from the GitHub API means *read the file* — it is not
"no licence".

Split into three tracks matching where each repo could land:
- **CAD/geometry track** — could it feed the provenance extractor?
- **`/design3d` skill track** — is the skill worth porting into our pipeline?
- **Phase-2 dashboard track** — React + R3F product UI.

---

## Track 1 — CAD / geometry routes (the extractor's track)

| Repo | Licence (upstream) | Route | Verdict |
|---|---|---|---|
| earthtojake/text-to-cad | **MIT** | Route 2 [INFER] — text/image → parametric `build123d`, invented defaults, no DWG reader | **SKIP** (weak steal-idea) |
| facebookresearch/meshflow | **FAIR Noncommercial Research License v1** | Route 2 [INFER] — diffusion mesh gen, GPU + checkpoints | **BLOCKED** (non-commercial) |
| sengchor/kokraf | **BUSL-1.1** (commercial barred until 2029-05-11, then Apache-2.0) | manual modeling app, no CAD ingest | **BLOCKED** (non-commercial today) |

**Net: nothing vendorable.** text-to-cad is MIT-clean but generates geometry from a prompt
with invented defaults (wall thickness "2.0–3.0 mm", "M3 clearance 3.4 mm") — the exact
provenance violation the CAD track forbids. meshflow and kokraf are licence-blocked for a
client deliverable.

**Ideas worth keeping (not code):**
- text-to-cad's `scripts/inspect` model — measure / geometry-facts / diff read off *real*
  geometry with stable selector IDs (`#o1.2.f1`). A good pattern for surfacing
  measured-coordinate provenance in the viewer.
- kokraf's separation of a source **VEF adjacency mesh** from the rendered `BufferGeometry`.
  Architectural idea only; the code is BUSL-blocked.

---

## Track 2 — `/design3d` skill ports (all five MIT, verified at the LICENSE file)

| Repo | Licence | Verdict |
|---|---|---|
| mintdotgg/mint-threejs-skills | **MIT** | **STEAL-TECHNIQUE** — `spatial-contracts` + `verification-policy` docs |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills | **MIT** | **PORT-SKILL (selective)** — `procedural-geometry` + `visual-validation` |
| Sahir619/fable-method | **MIT** | **SKIP** — agent-discipline method, redundant with our gate/blind-review |
| achrefelouafi/BasicProceduralBuilding | **MIT** | **STEAL-TECHNIQUE** — depsgraph parity verify + instanced-GLB kit |
| achrefelouafi/BuildingGeneratorThreeJS | **MIT** | **STEAL-TECHNIQUE** — instanced-GLB **+ manifest** kit + truth-diff harness |

**Highest-value ports (both from scottstts, MIT JS kit directly reusable):**
1. **`threejs-procedural-geometry`** + its `geometry-quality-kit/` (`mesh-topology-audit.js`,
   `geometry-audit.js`): topology audit (loose/duplicate/degenerate verts, non-manifold
   edges, signed volume), **solid-clash/interpenetration audit**, and **swept-envelope /
   clearance** checks. This is exactly what HVAC ductwork needs — manifold correctness and
   clash detection — and it drops into our **structural pass + a new topology/clash gate**.
2. **`threejs-visual-validation`** — "evaluate the mechanism, not a hero screenshot": frozen
   deterministic inputs, a **no-post baseline that still reads**, fixed camera+seed manifest,
   near/design/far envelope, explicit failure "post-processing cannot be disabled per pass."
   Our anti-cinematic constraint written as a protocol; reinforces the capture/gate/review.

**Steal patterns (don't port the skill):** Mint's `spatial-contracts` (declare
units/handedness/up-forward, one authoritative transform owner, normalize orientation at one
boundary) feeds blockout/structural; the achref pair's **ground-truth parity verification**
(port must match an authoritative source instance-for-instance) adapts to "verify our
placement against the source CAD," plus their instanced-GLB+manifest kit and headless
`snap-*.mjs` capture matrix (skip `snap-cine.mjs`).

**Reject:** fable-method (not a graphics skill), Mint's Mint-MCP-bound `app-director`, and
scottstts's ~20 cinematic skills (bloom, atmosphere, exposure-grading, volumetric-clouds,
ocean, SSAO-as-beauty, precipitation, raymarched space, procedural planets/vegetation) — all
destroy technical legibility.

---

## Track 3 — Phase-2 React + R3F dashboard UI

Licence column verified at each upstream `LICENSE`/`LICENSE.md`.

| Library | Licence (upstream) | What it is | Fit | Verdict |
|---|---|---|---|---|
| shadcn-ui/ui | **MIT** | headless Radix+Tailwind primitives you own the code of | **STRONG** | **ADOPT-CANDIDATE** |
| tremorlabs/tremor | **Apache-2.0** | charts + KPI tiles + dashboard blocks | **STRONG** | **ADOPT-CANDIDATE** |
| TailAdmin/free-react-tailwind-admin-dashboard | **MIT** | full admin template (sidebar/tree/tables) | OK/STRONG | **REFERENCE** (mine layout) |
| creativetimofficial/material-tailwind | **MIT** | Material Tailwind components | OK (heavier aesthetic) | **REFERENCE** |
| horizon-ui/horizon-tailwind-react(-ts) | **MIT** | Chakra admin template | OK (Chakra clashes w/ Tailwind) | **REFERENCE** |
| magicuidesign/magicui | **MIT** | animated marketing components | WEAK (flash) | **REFERENCE** |
| ibelick/motion-primitives | **MIT** | Framer-Motion primitives | WEAK | **REFERENCE** |
| nolly-studio/cult-ui | **MIT** | animated shadcn-style | WEAK/OK | **REFERENCE** |
| DavidHDev/react-bits | **MIT + Commons Clause** | animated components/backgrounds | WEAK | **SKIP** (no-resell clause + flash) |
| origin-space/originui (canonical) | **AGPL-3.0** | shadcn-style Tailwind collection | — | **SKIP** (network copyleft) |
| shadcn/originui (stale mirror) | MIT (old mirror) | same, outdated | — | **REFERENCE** (canonical is AGPL) |
| cruip/tailwind-dashboard-template | **GPL-3.0** + no-resell | full dashboard template | — | **SKIP** (copyleft) |

**Strongest picks for a data-dense engineering dashboard:**
1. **shadcn-ui/ui (MIT)** — the foundation. Headless primitives copied into the repo, fully
   owned: tables, tree navigation, dialogs, tabs, forms for section-plane / measurement /
   quantity panels. Neutral and legible.
2. **tremor (Apache-2.0)** — drop-in charts + KPI tiles for quantities / clearances readouts,
   pairs cleanly with a Tailwind/shadcn stack.
3. **TailAdmin (MIT)** — mine for shell/layout patterns, don't adopt wholesale.

**Licence risks to avoid shipping:** react-bits (Commons Clause), cruip (GPL-3.0), canonical
origin-space/originui (AGPL-3.0). The animation-first libs (magicui, motion-primitives,
cult-ui) are reference-only — flash hurts data legibility.

---

## Bottom line

- **CAD track: no new pulls.** The provenance rule and licence gate eliminate all three.
- **Skill track: two real ports** — scottstts's `procedural-geometry` (+ the MIT
  `geometry-quality-kit` for topology/clash/swept-envelope gates) and `visual-validation`.
  These are the most valuable finds on the whole list because a clash/topology gate is a
  genuine capability gap for MEP.
- **Dashboard track: shadcn-ui + tremor** are the two MIT/Apache adopt-candidates; everything
  else is reference or licence-blocked.

Nothing here changes the extractor conclusion in `CRITIQUE-b16-roadmap.md`: the deliverable is
still gated by extractor fidelity (§6 polyline-identity), which is being run as a separate
experiment.
