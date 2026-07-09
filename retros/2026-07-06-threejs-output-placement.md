<!-- RECONSTRUCTED 2026-07-07: original file was accidentally deleted (untracked, unrecoverable). Rebuilt from PR #7 + pruebas-dashboards kit-audit references + corpus evidence. Deltas marked [SHIPPED]/[TRACKED]/[INFERRED] by provenance confidence. -->
<!-- review-status: applied 2026-07-07 · reconstructed · see per-delta status -->
# Retro — three.js · output-placement (flat corpus vs. corpus subdir) · 2026-07-06 · Research-SDD self-retrospective

> **RECONSTRUCTION NOTICE.** This file is a good-faith reconstruction. The original §18 retro was written
> on 2026-07-06, left `pending`, and then accidentally deleted while untracked (unrecoverable from git). It
> is rebuilt from surviving evidence only: (1) kit PR #7 / commit `ae9ba8f` — the SHIPPED form of the main
> delta; (2) the sibling retro `pruebas-dashboards/retros/2026-07-06-kit-audit.md`, which cites this retro by
> name and confirms its delta #3; (3) the three.js corpus on disk as it stands on 2026-07-07; (4) this
> target's own prior retro `2026-07-04-threejs.md` (RUN 1), whose delta #3 is the direct antecedent of this
> run's theme. The FACT/INFERENCE boundary is called out per delta — do not read an `[INFERRED]` delta as the
> original author's wording; it is a best-effort rebuild of the *concern*, not the *text*.

> Run reviewed: the 2026-07-06 three.js reopens (RUN 7 / RUN 8, blocks ~B40-B44 — assembled-hotel realistic
> scene, LOD, dashboard/detail-overlay). Trigger (reconstructed): the "output-placement" observation — the flat
> research corpus polluting the root of a working project — surfaced during a focus-completion §18 pass.
> Method: a FRESH-CONTEXT agent read the current kit (`PROMPT-LOOP.md` + `METHODOLOGY.md`) FIRST, then the
> run's blocks/commits/state, and proposed kit deltas. READ-ONLY on the kit — this report only PROPOSES; kit
> changes are human-reviewed and human-committed (METHODOLOGY §18).

## What this run did (context for the theme)

The 2026-07-06 reopens continued three.js's single continuous axis (voxel→realistic HVAC pipeline) into an
assembled-hotel realistic scene plus a dashboard/detail-overlay build. But the retro's THEME was not the run's
subject matter — it was where the run's OUTPUT lands. This target's corpus is an **in-project corpus**: the
research artifacts (`threejs-block*.md` ×44, `INDEX.md`, `RESEARCH-STATE.md`, `CATALOG.md`, `HANDBOOK.md`,
`sources/`, `tools/`) sit FLAT in the project root, interleaved with the project's OWN subject material — ~23
realistic/voxel `.html` prototypes, `voxel/`, `client-designs/`, `publish/`, `node_modules/`, `package.json`.
A plain `ls` of the target root mixes 44 research blocks with two dozen subject files and build config. The
corpus does not drown a dedicated research directory; it drowns a live working project's root. That physical
coupling is the root cause behind every delta below.

## Proposed kit deltas

> Reconstructed count: **5** (matches the retro-sweep hook's recorded "~5 deltas, pending"). Provenance:
> **1 SHIPPED**, **1 TRACKED**, **3 INFERRED**. Only #1 and #3 are evidence-anchored to their original intent;
> #2, #4, #5 are reconstructed concerns (see the honesty note under each). The hook's "~5" is itself the only
> surviving evidence of the exact count — treat it as approximate.

| # | Proposed change | Target (file · §/section) | Evidence | Type | Priority | Provenance |
|---|---|---|---|---|---|---|
| 1 | Define a **corpus root `$CORPUS`** so an in-project corpus stops polluting the working-project root. Default `$CORPUS = $TARGET`; when the target dir also holds its OWN subject material, `$CORPUS = $TARGET/corpus/`. The whole flat corpus (prefixed blocks, INDEX/CATALOG/RESEARCH-STATE/HANDBOOK, `sources/`, `tools/`, `codegen/`) lives under `$CORPUS`; `retros/` stay at `$TARGET` root; `.claude/` + git root stay at `$TARGET`. RESUME resolves `$CORPUS` deterministically (`corpus/INDEX.md` → else root → else BOOTSTRAP) so a nested corpus is never re-bootstrapped as a duplicate. | `METHODOLOGY.md §15` (+ §16 focus paths), `PROMPT-LOOP.md` RESUME/BOOTSTRAP + steps 4/6/7 | This target IS the proof: 44 blocks + INDEX/STATE/CATALOG/HANDBOOK flat in the root of a live three.js project, alongside ~23 subject `.html` files, `voxel/`, `node_modules/`, `package.json`. The kit had no name for "corpus root", so a linter/loop assumed `$TARGET` == corpus. | new | **HIGH** | **[SHIPPED — PR #7 / ae9ba8f]** |
| 2 | Make the subject/corpus co-habitation safe **structurally**, not by operator discipline: an in-project target's own subject material (`*.html`, `voxel/`, prototypes) shares the dir with the corpus and is one `git add -A` away from being committed into the research history. The corpus-root move (#1) is most of the fix; pair it with explicit gitignore/scope guidance so subject IP never gets swept into the corpus's git history. | `METHODOLOGY.md §15` (corpus versioning / "don't sweep the subject") | `.gitignore` excludes only `.atl/ .claude/ *Zone.Identifier __pycache__/ node_modules/ publish/ .cf-token` — NOT the subject `*.html`/`voxel/`; safety is 100% "never run `git add -A`", i.e. tribal, not structural. Directly escalates RUN 1's delta #3 (2026-07-04, MEDIUM). | new / refinement | MEDIUM | **[INFERRED]** |
| 3 | Decouple the **toolbelt linters from the flat layout**: `verify-sources.sh` (and siblings) must resolve/receive the corpus root instead of assuming `$TARGET` or root globs — else a nested corpus FALSE-PASSes the source-integrity gate. Copy the `find -maxdepth 3` pattern `verify-state.sh` already uses. | `toolbelt/verify-sources.sh` (+ how the loop hands linters the path) | Confirmed by the kit-audit's finding #1 (still pending): `verify-sources.sh <root>` returns `exit 0` (false PASS) while the real blocks live in a subdir. The kit-audit states this "**Also confirms delta #3 of the three.js `2026-07-06-threejs-output-placement.md` retro** (toolbelt globs coupled to flat layout) — these two retros should be applied together." | bug | **HIGH** | **[TRACKED — kit-audit finding #1]** |
| 4 | When the corpus moves under `corpus/`, the moving parts that assume the flat root must move WITH it — **without breaking the sweep contract**: the SessionStart hook's block/INDEX/CATALOG paths must be prefixed with `corpus/`, `gen-catalog.py` + `fetch-doc.sh` must target `$CORPUS`, but `retros/` must STAY at `$TARGET` root because `sweep-retros.sh` scans `$target/retros` (moving them would blind the sweeper). | `PROMPT-LOOP.md` BOOTSTRAP (hook/catalog/fetch paths), `METHODOLOGY.md §18` (sweep-retros contract) | Reconstructed from PR #7's diff, which explicitly carves out each of these (hook path prefixing, `$CORPUS` for catalog/fetch, `retros/` exception for the sweep). This target's hook (`.claude/hooks/research-protocol.sh`) hardcodes `threejs-block*.md`/`INDEX.md`/`CATALOG.md` at the root — it would silently miss a migrated corpus. | new | MEDIUM | **[INFERRED]** |
| 5 | Restore a **readable `ls`** at the corpus level: with the corpus nested under `$CORPUS`, keep the §16 focus-aware block prefix so a corpus listing is scannable, and keep the block files directly in `$CORPUS` (no extra `blocks/` subdir). The flat-root layout made the project root unreadable (44 blocks interleaved with subject files + config). | `METHODOLOGY.md §15/§16` (block naming under `$CORPUS`) | On-disk: the root mixes `threejs-block1.md … block44.md` with `*-realistic-v1.html`, `voxel/`, `client-designs/`, `package.json`, `node_modules/` — no clean way to `ls` just the corpus. PR #7 notes blocks keep "the focus-aware prefix of §16 for a readable `ls`". | refinement | LOW | **[INFERRED]** |

For each delta, one line of rationale (WHY it matters · cost · impact):

- **#1** — The flagship fix: names the missing abstraction (a corpus root) so an in-project research corpus no longer colonizes a live project's root. Cost: prose + a deterministic RESUME resolution; NO existing corpus migrated. Impact: every future in-project target bootstraps into `corpus/` instead of the root. **SHIPPED as PR #7.**
- **#2** — Cheap (a gitignore stanza + one §15 clause) but high blast-radius if it fires (subject IP / bulky prototypes landing in the research git history via one `git add -A`). Converts tribal discipline into a structural guard. Escalation of RUN 1 delta #3.
- **#3** — A corpus-level integrity gate that green-lights a nested corpus while checking nothing is worse than no gate (false confidence). The fix is a copy of an existing pattern. Should ship together with #1. **Tracked live as kit-audit finding #1.**
- **#4** — The migration is only safe if the hook/catalog/fetch paths follow the corpus AND the retros/sweep contract is preserved; missing either re-introduces a silent gap (a blind hook or a blinded sweeper).
- **#5** — Small, but the whole motivation for #1 is legibility; keeping the §16 prefix under `$CORPUS` is what makes a nested corpus actually browsable.

## Already covered (dedupe — proof the retro read the kit first)

> Reconstructed from the kit as it stood before PR #7 + this target's prior retros. Best-effort; the original
> retro's exact dedupe list is lost.

- **Don't sweep orchestrator-local caches (`.atl/`, `.claude/`) into the corpus git history** → already handled by `.gitignore` + METHODOLOGY §15's original caches-only guidance. Delta #2 EXTENDS this to subject-owned material, it does not re-propose the caches rule.
- **Target must be registered in `TARGETS.md` so the sweeper can find its `retros/`** → already covered (RUN 1 delta #1, since applied); this run's blocks were visible to the sweeper.
- **§16 multi-focus split** → NOT applicable; three.js is a single continuous axis (see RUN 4-5 retro delta #5). Delta #5 borrows only §16's block-prefix convention, not its per-focus RESEARCH-STATE split.

## Anti-patterns observed

- **Corpus physically fused with a live project's root** — 44 research blocks + state files interleaved with 23 subject `.html` prototypes and build config → the pollution delta #1 prevents.
- **Safety-by-discipline instead of by structure** — subject files kept out of the corpus history only by never running `git add -A` → delta #2.
- **Linters and templates that assume the flat root** — the source-integrity gate and the SessionStart hook both hardcode root paths → deltas #3 (linters) and #4 (hook/catalog).

## Metrics

- **Deltas proposed**: 5 (reconstructed) — provenance: 1 SHIPPED (#1), 1 TRACKED (#3), 3 INFERRED (#2, #4, #5).
- **Genuine losses (original wording gone)**: 3 — #2, #4, #5. Their *concern* is evidence-anchored; their *text* is not recoverable.
- **Priority spread (reconstructed)**: HIGH 2 (#1, #3) · MEDIUM 2 (#2, #4) · LOW 1 (#5).
- **Delta status at reconstruction (2026-07-07)**: #1 SHIPPED (PR #7 / `ae9ba8f`) · #3 TRACKED-pending (kit-audit finding #1) · #2/#4/#5 not independently tracked — likely folded into PR #7's scope or still open.

## Honest verdict

This retro's central finding was real and has already paid off: the kit had **no name for a corpus root**, so
an in-project corpus colonized a live project's root — and three.js is the textbook case (44 blocks flat among
23 subject `.html` files). That main delta (#1) SHIPPED as PR #7 (`ae9ba8f`), which even bakes this target's
evidence into METHODOLOGY §15 ("three.js's corpus sat alongside 23 subject `.html` files kept out only by
hand"). Delta #3 (linters coupled to the flat layout) is independently corroborated and still-pending as the
kit-audit's finding #1, to be shipped alongside PR #7's convention. The remaining three deltas (#2 gitignore
safety, #4 hook/catalog/retros migration, #5 readable `ls`) are reconstructed from the shipped PR's scope and
the corpus on disk — they are almost certainly among the original ~5, but their exact wording and boundaries
are a genuine loss and are marked `[INFERRED]` accordingly. **What is FACT: the main delta and its shipment,
and delta #3's identity. What is INFERENCE: the precise phrasing, count, and separation of the other three.**
The value of this reconstruction is that boundary — do not launder the inferences into certainty.
