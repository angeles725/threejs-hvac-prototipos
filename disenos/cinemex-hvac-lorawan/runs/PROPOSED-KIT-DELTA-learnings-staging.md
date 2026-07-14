<!-- review-status: applied 2026-07-13 · design3d kit (uncommitted worktree) -->

# Proposed kit delta — stage LEARNINGS instead of auto-appending them, + test-vs-render jurisdiction

**Target:** `~/.claude/skills/design3d/` → `SKILL.md`, `references/SELF-IMPROVEMENT.md`,
`references/PIPELINE.md`, `references/GATES.md`, `references/ROLES.md`, `LEARNINGS.md`,
`assets/retro.template.md`
**Origin:** cinemex-hvac-lorawan run, 2026-07-13 (surface L2 + lighting L1/L2)
**Requested and AUTHORIZED by:** the user, explicitly, mid-run ("dale a esto 1 … 2 …").
**Model:** the `research-sdd` staging discipline (METHODOLOGY §18) — propose, never apply.

## Application record (research-sdd discipline)

| step | status |
|---|---|
| Proposed with run evidence | ✅ (this file) |
| User authorization | ✅ explicit, 2026-07-13 |
| Applied to kit | ✅ 7 files |
| **Independent verification (applier must NOT self-approve)** | ✅ fresh-context reviewer scored every change FAITHFUL / DRIFT / HALLUCINATION / MISSING / DUPLICATE |
| Drift found and fixed | ✅ **1 MISSING (P0) + 1 DRIFT + 5 dangling refs** — see below |
| Re-verified after fixes | ⬜ pending |

**What the independent reviewer caught — and why this gate is not ceremony.** The first application
landed the rule in the three files that DESCRIBE it and missed the two files a run actually EXECUTES:
`SKILL.md:36` still read *"only LEARNINGS.md appends are automatic"* and `SKILL.md:26` still told P0
to read the whole ledger. SKILL.md outranks `references/`. **The self-promotion path the delta exists
to close was still wide open, and the applier (me) had already declared it done.** Also fixed:
`PIPELINE.md` P0/P8/quick-mode rows, `ROLES.md` binding-LEARNINGS pointer, and a 10-column schema
declared over a 7-column §Active table.

Delta B was additionally found ORPHANED — `GATES.md` legislated about "the test suite" while no gate
step ever ran one. Now wired into §Gate steps 1 (a red suite BLOCKS the gate).

## What landed

**Delta A — propose-never-apply.** `LEARNINGS.md` splits into §Staged (a run writes here; NOT loaded
at P0, never binding) and §Active (the only rulebook; only the USER promotes into it). Row schema
gains provenance: `project`, `origin` (run+lineage+attempt), `how` (blind-review-defect ·
wasted-retry · mechanical-failure · user-correction · pre-review-catch). `SELF-IMPROVEMENT.md` gains
the Hard boundary, mandatory dedupe-first, the honesty clause ("a retro that always finds something
is noise, not signal"), the `pending → applied|dismissed` marker lifecycle, bidirectional
traceability, and the no-self-approval rule. `SKILL.md` Hard Rules 1 and 6 rewritten; a new Hard
Rule 7 carries the jurisdiction rule.

**Delta B — test-vs-render jurisdiction** (`GATES.md`, binding section): the blind judge finds NEW
defects, the test suite prevents OLD ones from returning; neither substitutes for the other.
*If a human can judge it by looking at one image, RENDER it. If a human cannot count it at a glance,
TEST it.* Plus a PROHIBITION on perceptual test theater and the two corollaries (derive-don't-copy;
an unsampled surface is an unguarded surface).

## The gap

`SELF-IMPROVEMENT.md` currently runs two channels at different risk levels:

| channel | today | user's requirement |
|---|---|---|
| Kit structural deltas (SKILL.md, `references/`) | Proposal-only. Written to the retro with `review-status: pending`; a human applies them. | ✅ Already correct — no change needed. |
| `LEARNINGS.md` appends | **Automatic at P8.** And P0's load rule makes any entry at `confirmed×N` / `PROMOTE` a **BINDING house rule** for every later run. | ❌ Self-integrating. A ledger row becomes mandatory law for future runs without any human decision. |

So the ledger is the hole: it is described as "low risk: append-only", but its *load rule* is what
makes it high risk. An append today silently constrains every run tomorrow.

Provenance is also thin. A LEARNINGS row records `date · design · track · pass · learning · evidence · status`.
It does not record which PROJECT and repo the run belonged to, which run/lineage/attempt produced it,
or HOW the lesson surfaced (blind-review defect? wasted retry? mechanical failure? user correction?).
A rule you cannot trace is a rule you cannot revoke.

## Proposed change

### 1. `LEARNINGS.md` — split the file into two sections

- `## Staged (pending user decision)` — where P8 writes. **Not loaded at P0. Not binding. Ever.**
- `## Active ledger` — the existing table. Only the user promotes a row from Staged → Active.
  Only Active rows are loaded at P0 and only Active rows can reach `confirmed×N` / `PROMOTE`.

The status lifecycle gains one state at the front:
`staged` → (user promotes) → `new` → `confirmed×N` → `PROMOTE` → `promoted` · `rejected`

### 2. Enrich the row schema with provenance

| field | why |
|---|---|
| `date` | (exists) |
| `project` | which repo/project the run lived in — a lesson from an HVAC Three.js scene is not automatically law for a Blender character run |
| `design` | (exists) |
| `track` | (exists) |
| `pass` | (exists) |
| `origin` | run + lineage + attempt (e.g. `surface L2 a3`) — makes the claim auditable |
| `how` | how it surfaced: `blind-review-defect` · `wasted-retry` · `mechanical-failure` · `user-correction` · `pre-review-catch` |
| `learning` | (exists) one imperative sentence |
| `evidence` | (exists) file/review/screenshot pointer |
| `status` | now starts at `staged` |

### 3. `SELF-IMPROVEMENT.md` §Run-end protocol

Rewrite step 2 from "**Append LEARNINGS entries**" to "**Stage LEARNINGS entries**": P8 writes rows
into the Staged section with `status: staged`, and the retro's Metrics line reports
`LEARNINGS staged: N (awaiting user decision)`. Step 3 (bump confirmations) may only touch Active rows.

Update the header's two-channel table: BOTH channels are now proposal-only. The distinction becomes
*what* is proposed (a ledger rule vs a kit edit), not *whether* a human decides.

### 4. `retro.template.md`

- Replace "LEARNINGS entries below were already appended automatically" with
  "LEARNINGS entries below are STAGED and await your decision — nothing is binding until you promote it."
- Add the provenance columns to the emitted-entries table.

## Evidence from this run that the change is warranted

This single run produced four rule-shaped lessons, each of which would have auto-appended and become
binding law under today's mechanism, with no human ever reviewing them:

1. A unit test that COPIES the constant it guards cannot catch a wrong constant — derive the property instead. *(Origin: surface L2 a1, pre-review-catch. The diagram board rendered mirrored through a fully green suite.)*
2. A derived, green test can still measure what the eye never sees: an unsampled surface is an unguarded surface. *(Origin: lighting L1 a2, blind-review-defect. Sampled a wall patch under a fixture, declared a luminance ladder the judge saw as black.)*
3. When a critical feature fails repeatedly at a near-threshold score, the defect is usually not in what is being scored — it is in what that thing ANNOTATES. *(Origin: surface, 8 failed attempts across 3 lineages. The RS-485 drop's junction cube was larger than the TC300 it annotated.)*
4. three.js r160 has no per-object light layers, and omitting `RECIPROCAL_PI` makes the renderer 3.14× darker than a naive `albedo × irradiance` model — for LIT surfaces only, which is why emissives look correct while everything around them goes black. *(Origin: lighting L1 a3, wasted-retry.)*

Lesson 4 is exactly the kind of entry that should NOT silently become a binding house rule: it is
r160-specific and track-specific. Under the current mechanism it would be law for a Blender run.

## Cost

Small. Three file edits, no behavior change to the P0–P7 pipeline. The only runtime effect is that
P0 loads fewer (only user-approved) binding rules — which is the point.
