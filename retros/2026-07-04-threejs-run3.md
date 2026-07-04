<!-- review-status: applied 2026-07-04 · kit f19a1c6 -->
# Retro — three.js · voxel→realistic HVAC pipeline (RUN 3, §8 second reopen) · 2026-07-04 · Research-SDD self-retrospective

> Run reviewed: RUN 3 only — reopen commit `98c9f2e` through STOP commit `9339e42` + `d233f2b`
> (WORKFLOW.md update). Trigger: corpus-level STOP, read-only-investigable = 0 (genuine
> exhaustion; cap slot B22 intentionally unused — investigable hit 0 one block early). Prior
> retros `2026-07-04-threejs.md` (RUN 1, B1-B12) and `2026-07-04-threejs-run2.md` (RUN 2,
> B13-B19) already reviewed and NOT re-litigated here except where RUN 3 produced new, directly
> relevant evidence.
> Method: a FRESH-CONTEXT agent read the current kit (`PROMPT-LOOP.md` + `METHODOLOGY.md`)
> FIRST, then BOTH prior retros, then RUN 3's commits/blocks/RESEARCH-STATE.md/SOURCES.md/
> WORKFLOW.md, and proposes kit deltas. READ-ONLY on the kit — this report only PROPOSES; kit
> changes are human-reviewed and human-committed (METHODOLOGY §18).

## Proposed kit deltas

| # | Proposed change | Target (file · §/section) | Evidence (block / commit / § / transcript ref) | Type | Priority |
|---|---|---|---|---|---|
| 1 | Codify a **web-fetch fallback ladder** for bot-blocked/anti-scraping pages, as a named sub-rule next to the "Beautified-temp citation" rule or a new row in `toolbelt/tool-registry.md`: (a) Reddit — `www.reddit.com` bot-blocks and returns only an SVG shell; `old.reddit.com` succeeds for the same thread. (b) CodePen — `/full/<slug>` 403s; `/pen/<slug>` with a browser `User-Agent` succeeds AND yields the pen's full unminified source via its init-data JSON (better evidence than a minified bundle would have given). (c) Discourse (forum software used by discourse.threejs.org) serves crawler-readable HTML directly, no bot-block, plus a lighter `/raw/<topic-id>` endpoint. | `toolbelt/tool-registry.md` (new row/column for "Web page / forum / link") or a new `toolbelt/FETCH-FALLBACKS.md` referenced from `fetch-doc.sh` | `sources/SOURCES.md` line 65 ("fallback: www.reddit.com blocked by bot-protection, got only SVG shell; old.reddit.com succeeded"), line 66 (codepen entry); `threejs-block20.md` header ("old.reddit.com fallback for the bot-blocked www.reddit.com... Discourse serves crawler HTML") and §20.3 ("Discourse serves server-rendered crawler HTML (and `/raw/<topic-id>`) — no bot-block, unlike Reddit"); `threejs-block21.md` header ("CodePen required a browser-UA fallback after 403s") and §21.1 Sacred Pearl row ("full unminified source via pen init-data"). | new | HIGH |
| 2 | Extend METHODOLOGY §8's closure taxonomy (new / proven-absence / remittance) to name the case a case-study/showcase sweep over **user-supplied external URLs** actually produces: a target that turns out **confirmed NOT the subject library** (a genuine negative, different from "a feature is absent from an in-scope target"), a target that is **inconclusive-but-leaning-not** (investigated honestly, evidence insufficient either way — explicitly NOT forced into proven-absence), and a URL that serves **unrelated content** (apparent slug reuse — an input-quality flag on the target list itself, not a finding about the library). None of RUN 3's three fit the existing "proven ABSENCE closes a gap" wording, which is about a feature/API missing from a confirmed in-scope subject, not about the subject's IDENTITY being in question. | `METHODOLOGY.md §8` (closure taxonomy paragraph) or a new sub-rule under §16 (multi-focus/external-batch pattern) | `threejs-block21.md` §21.2 "Honest negatives and data-quality flags": madebyevan.com/webgl-water and matsuoka-601/Splash flagged "not three.js either" with cited evidence (no `three` dependency, different renderer stack); fractalworlds.io flagged "inconclusive-but-leaning-not-three.js... Honest verdict, not a proven negative"; lazykitty.itch.io/ex-nihilo flagged as serving a different game, "likely slug reuse" — a target-list data-quality finding, not a library finding. `RESEARCH-STATE.md` gap row for G20 already improvises the label "3 honest negatives + 1 slug-reuse flag" with no kit vocabulary backing it. | refinement | MEDIUM |
| 3 | Extend §10's self-provisioning/tool-registry contract to cover **MCP-server-based capabilities**, not just CLI tools. A `chrome-devtools` MCP server was added mid-run (visible only in the global `~/.claude.json` `mcpServers` block) specifically to solve a limitation this run hit — a no-JS crawl can't reach a dynamically-imported chunk (fractalworlds.io's renderer, per §21.2) — but it has **zero record** in `toolbelt/INSTALLED-TOOLS.md` or `toolbelt/tool-registry.md` (`grep -i "chrome\|devtools\|mcp"` on both returns nothing). §10's contract ("everything is logged to `toolbelt/INSTALLED-TOOLS.md`") was written for `install-tool.sh` recipes (target-local binaries) and has no equivalent for a capability that lives in global session config, is not versioned with any corpus, and could easily be silently unavailable (or silently re-added) in a future session with no trace. | `METHODOLOGY.md §10` (self-provisioning) + `toolbelt/tool-registry.md` (new capability class/row) | `~/.claude.json` `mcpServers.chrome-devtools` (stdio, `chrome-devtools-mcp@latest`) confirmed present; `toolbelt/INSTALLED-TOOLS.md` and `toolbelt/tool-registry.md` both grep-empty for "chrome"/"devtools"/"mcp"; `threejs-block21.md` §21.2 names it explicitly as the tool that "can settle it in a future session" for the fractalworlds verdict. | new | MEDIUM-HIGH |

For each delta above, one line of rationale (WHY it matters, what it costs, expected impact):

- **#1** — This is a per-site improvisation that will recur verbatim on the NEXT web/forum-heavy target (RUN 2 and RUN 3 both fetched Reddit/Discourse/CodePen-adjacent sources) — without a kit record, the next sweep re-discovers the same three 403s/bot-blocks from scratch instead of trying the known-working fallback first. Cost: one short table/paragraph. Impact: turns three ad hoc discoveries into a reusable playbook for any docs/web target.
- **#2** — Cheap (a clause + two named sub-cases), but without it a future reviewer skimming a coverage ratio or gap-closure log can't tell "closed because we proved the API is absent" from "closed because the URL wasn't even the right library" from "closed but genuinely unresolved" — three epistemically different outcomes RUN 3 already reported honestly in prose but the kit has no shared vocabulary for. This is exactly the kind of ambiguity §18 exists to catch before it recurs unnamed a fourth time.
- **#3** — MCP capabilities are becoming a real part of the toolbelt (context7 already is, per RUN 1's still-pending delta #2; chrome-devtools now too) but neither has a durable registry entry the way a CLI decompiler does. Cost: one new row/section. Impact: prevents "did we already have a tool for this" from being re-litigated per session, and gives §10's "Tools Report" something honest to say about MCP-based capabilities instead of silently omitting them.

## Already covered (dedupe — proof the retro read the kit first and against RUN 1/RUN 2's retros)

- **Bundle-evidence-quality protocol (RUN 2's still-pending delta #1) — reinforced, applied consistently this time.** `threejs-block21.md` header states "Version evidence graded per the bundle-evidence rule (explicit pins vs REVISION-literal recovery vs weak tokens)" and every row in §21.1 carries an explicit confidence label (constructor-call vs weak/lib-internal string), including correctly downgrading `mesh-test`'s `WebGPURenderer` hits as "lib-internal strings (correctly downgraded to weak)". Unlike RUN 2 (where the same protocol appeared in B15 but not sibling B14), RUN 3 applies it uniformly across all 11 targets in one block — this is corroborating evidence FOR RUN 2's pending delta #1, not a new delta; not re-proposed.
- **Reopening a STOPPED loop, a second time (RUN 2's still-pending deltas #2/#3) — pattern recurred, not newly discovered.** Commit `98c9f2e` reopens RUN 2's STOP for a third batch (+G20, +G21, independently declared cap "+3, B20-B22") — the same "independently-declared fresh cap, unstated whether inherited or new" ambiguity RUN 2's retro already flagged. Noted here only to confirm it recurred a third time and remains open; not re-proposed as a separate delta.
- **Primary stopping criterion overriding the budget cap** — `RESEARCH-STATE.md` explicitly records "cap slot B22 unused" because investigable hit 0 at B21, one block before the declared +3 cap — correctly applying METHODOLOGY §8 point 1 (read-only-investigable exhaustion is PRIMARY, budget cap is only the safety net) → already covered, correctly followed.
- **Preserve-first for all new external sources** — B20 (7 forum/discourse snapshots) and B21 (11 showcase + 3 GitHub README snapshots) all landed in `sources/web-snapshots/` and were registered in `SOURCES.md` BEFORE the blocks cite them → already covered by METHODOLOGY §5 golden rule and RUN 2's adoption of it; RUN 3 continues the practice without regression.
- **`TARGETS.md` registration for three.js (RUN 1 retro delta #1)** — confirmed still absent (`grep -n "three.js\|threejs" TARGETS.md` returns nothing); consistent with delta #1 still being `pending` human review. No new delta; noted only to confirm dedupe.
- **Coverage metric as a ratio (21/21), not a free-floating percentage** → already covered by METHODOLOGY §8/§9.6 and both prior retros.
- **Delegated sweeps with declared model tier** — both B20 and B21 recorded `yes · sonnet` (forum sweep / showcase sweep) in the Iteration history table → already covered by PROMPT-LOOP step 3/RETURN CONTRACT.
- **Corpus language English default, no override** → already covered by METHODOLOGY §9/PROMPT-LOOP HARD RULES.

## Anti-patterns observed

- An MCP-based capability (`chrome-devtools`) was added to solve a specific research limitation but left completely unrecorded in the toolbelt's own bookkeeping (`INSTALLED-TOOLS.md`, `tool-registry.md`) → delta #3 would close this.
- Three per-site fetch workarounds (Reddit, CodePen, implicitly Discourse) were discovered and used correctly within the run, but exist only as prose inside `SOURCES.md` notes and a block header — not as a reusable kit rule → delta #1 would make them a standing reference instead of tribal knowledge that has to be rediscovered by reading old blocks.

## Metrics

- **Blocks reviewed**: 2 (B20, B21) + reopen commit `98c9f2e` + WORKFLOW.md diff (`d233f2b`) + `RESEARCH-STATE.md` + `SOURCES.md` + both prior retros (for dedupe)
- **§14 cross-block corrections in this run**: 0 (none needed or logged)
- **Rules skipped in practice**: 0 hard READ-ONLY/marker/citation violations found; 1 recurring soft ambiguity (reopen cap independence, third occurrence — already flagged, not re-proposed)
- **Deltas proposed (new)**: 2 (#1, #3)  ·  **Deltas proposed (refinement)**: 1 (#2)
- **Already-covered lessons**: 7 (including two items that reinforce/confirm still-pending deltas from RUN 2 without duplicating them)

## Honest verdict

This run did NOT break any hard rule (READ-ONLY, citation, marker discipline, preserve-first, primary-vs-cap
stopping criterion all held — several of these are direct, correctly-applied continuations of lessons RUN 1
and RUN 2 already surfaced). What IS genuinely new, verified against the kit and both prior retros: three
site-specific fetch fallbacks (Reddit bot-block → old.reddit.com; CodePen 403 → browser-UA `/pen/` fetch
yielding full source; Discourse serving crawler HTML natively) that were discovered ad hoc and have no kit
record for the next web-heavy target to reuse (#1); a real naming gap in §8's closure taxonomy exposed by
this run's first-ever "is this URL even the right library" findings — three qualitatively different honest
outcomes (proven-not, inconclusive-leaning-not, off-target-content) that the current two-category
positive/proven-absence framing doesn't distinguish (#2); and an MCP-based capability
(`chrome-devtools`) added mid-run to address a limitation this run explicitly hit, with no trace in the
toolbelt's own tool bookkeeping (#3). One thing worth flagging rather than re-proposing: RUN 2's pending
delta #1 (bundle-evidence-quality rule) is now visibly REINFORCED — applied uniformly across all of B21 this
time, unlike its inconsistent RUN 2 debut — which strengthens the case for formalizing it, but does not
warrant a duplicate delta here.
