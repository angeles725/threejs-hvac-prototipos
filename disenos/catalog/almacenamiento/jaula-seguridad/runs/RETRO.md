<!-- review-status: pending -->
# Retro — design3d · jaula-seguridad · threejs · 2026-08-09

> Run reviewed: standard run in flat-catalog shape, single declared pass (`gate_passes: [materials]`),
> 1 gate attempt. Method: read the CURRENT kit first (`references/PIPELINE.md`, `GATES.md`,
> `TRACK-THREEJS.md`, `DESIGNSPEC.md` + `LEARNINGS.md` §Active) and DEDUPE, then propose.
> PROPOSE, NEVER APPLY (SELF-IMPROVEMENT.md §Hard boundary): this retro applies nothing. The
> LEARNINGS entries below are **STAGED** — not loaded at P0, not binding until the user promotes them.

## Run summary

Built `almacenamiento/jaula-seguridad`, a heavy-duty woven-diamond-mesh security cage, as the first
asset of the `disenos/catalog/` family to be gated through the design3d pipeline rather than the
catalog's own ONBOARD flow. Evidence is a preserved federal guide specification (UFGS 10 22 13),
distilled into `research/threejs-block68.md`. The materials gate passed on the first attempt at
global 0.78 with all five critical features above threshold and `dE00 = 0` against a measured colour
anchor. Two real defects were caught by the orchestrator PRE-LOOK before the review was written —
both invisible at frame scale and visible only in a native-resolution crop.

## Per-pass results

| Pass | Attempts | Final global | Failed features (attempt→fix) | Notes |
|---|---|---|---|---|
| materials | 1 | 0.78 | none failed at review; two defects fixed pre-review (padlock black silhouette; padlock geometry unreadable) | 27 draws / 14,666 tris vs budget 40 / 200,000; console clean on both evidence views; dE00 0 |

## Proposed kit deltas

| # | Proposed change | Target (file · §) | Evidence (this run) | Type | Priority |
|---|---|---|---|---|---|
| 1 | Add a FRAMING check to the gate's mechanical step: project the subject's world bbox corners to NDC and require them inside the frame, with the top clear of the HUD band. | `GATES.md` §Gate steps 1 (Mechanical checks) | Two independent framings in this session were green on every existing check while visibly broken — one cropped the base plates at ndcY −0.981, one ran the top bracing through the HUD text. Neither `probe.mjs`, `preflight.mjs` nor the console sidecar scores where the subject lands in the picture. | new | HIGH |
| 2 | State that a `colorTarget.crop` must be anchored by PROJECTED GEOMETRY, never by scanning the render for a hue/appearance. | `DESIGNSPEC.md` §Schema (`colorTarget`) | A hue search for "safety yellow" on a sibling asset returned a standard-deviation-0.0 sample of the WOODEN PALLET (rendered [162,126,77] vs wood `#a8814f`, identical B/R). Low deviation reads as confirmation that the crop is clean; it says nothing about identity. Same root as the existing "identify an InstancedMesh by geometry, never by count" rule. | new | HIGH |
| 3 | Note in the track file that a LINKED GIT WORKTREE has no `node_modules`, so the whole `research/tools/` harness fails with `ERR_MODULE_NOT_FOUND` on `puppeteer-core`; symlink the main checkout's `node_modules` and exclude it locally, because `.gitignore` lists `node_modules/` with a trailing slash and does not match a symlink. | `TRACK-THREEJS.md` §QA commands | `preflight.mjs` exit 1 with `Cannot find package 'puppeteer-core'` on first invocation in this worktree; fixed by symlink + `.git/info/exclude`. Any parallel-worktree catalog session hits this at its first gate. | new | MED |
| 4 | Give the flat-catalog shape an explicit note that a `neutral` evidence view MAY be identical to the default camera, and that the distinctness check therefore only proves view-vs-view difference. | `GATES.md` §Gate steps 0 | The contract check demands each shot be "not the default"; for a hero-framed catalog asset the neutral view IS the default by design. Recorded as a deviation in the review rather than silently satisfied. | refinement | LOW |

One line of rationale per delta (why · cost · impact):

- **#1** — The gate already refuses to trust counts about geometry; it should equally refuse to trust
  them about composition. Cost is a few lines of arithmetic with no browser. Impact: kills a whole
  defect class that currently reaches the blind judge (or worse, does not, because the judge scores a
  cropped subject as if that were the design).
- **#2** — The kit already forbids identifying a mesh by an unstable property; a colour crop is the
  same mistake in a different medium, and it is more dangerous because homogeneity looks like proof.
- **#3** — Pure environment friction, but it stops the harness dead on first use in exactly the
  parallel-worktree setup this catalog runs in.
- **#4** — Small honesty fix so a correct catalog run does not have to record a deviation for
  something the shape makes inevitable.

## Already covered (dedupe — proof the retro read the kit first)

- Fine detail needs a NATIVE-RESOLUTION CROP or the judge scores a defect the downscale invented —
  already in `GATES.md` §Blind-review protocol. This run confirms it from the opposite direction: the
  crop revealed a defect the downscale HID (a black padlock, then an unreadable one).
- Bare metal on a vertical face reads black under the dark house rig, and the fix is light/IBL, never
  lowering metalness — already in `TRACK-THREEJS.md` §Generic defaults and `LEARNINGS` §Active
  (2026-08-07, equipos-library).
- `OrbitControls.autoRotate = false` for gate captures — already in `TRACK-THREEJS.md`; this asset
  ships it off by default and the capture settled cleanly.
- `<link rel="icon" href="data:,">` to keep the console sidecar clean — already in the track file and
  in the catalog shell template; both sidecars came back `console_clean: true` with empty issues.
- Never let a gating command sit behind a pipe in an `&&` chain — already in `PIPELINE.md`; the
  preflight here ran standalone with full output to a log file and its exit code tested separately.
- Flat-catalog assets close on a declared `gate_passes:` subset — already in `PIPELINE.md` §Triage and
  `GATES.md` §Verdict; used as written, and `gate-state.mjs` derived clean on the first try.

## Library extraction — PROPOSED, not applied

The diamond-mesh panel generator built here is a genuinely reusable mechanism: it fills an arbitrary
rectangle with two wire families at ±45°, clipping each wire to the panel by solving the line/rect
intersection, and emits world matrices for a single `InstancedMesh` (1,062 wires in ONE draw call).
It is the part of this asset most likely to be rebuilt from scratch by the next design that needs a
fence, a guard, a screen or a grille.

Per SELF-IMPROVEMENT.md §Hard boundary this run does NOT write it into `library/`. It is proposed
here for the user to extract, with its evidence pointer:
`disenos/catalog/almacenamiento/jaula-seguridad/jaula-seguridad.html` §"diamond mesh"
(`meshPanel()` + `frameRect()` + `panelM()`), gated at materials 0.78.

## LEARNINGS entries STAGED (awaiting your promotion — not binding)

Staged into `LEARNINGS.md` §Staged in the same session; reproduced here for the review queue.

| date | project | design | track | pass | origin | how | learning | evidence | status |
|---|---|---|---|---|---|---|---|---|---|
| 2026-08-09 | threejs-hvac-prototipos | jaula-seguridad | threejs | materials | pre-review orchestrator look | pre-review-catch | Project the subject's world bbox to NDC and check the framing BEFORE capturing: require the corners inside ±0.93 and the top below +0.75 so the HUD band stays clear. No mechanical check scores where the subject lands in the frame. | [measured] two framings green on probe + sidecar while visibly broken: rack-drive-in ran the top bracing through the 4-line HUD, jaula-seguridad put the base plates on the bottom edge at ndcY −0.981 | staged |
| 2026-08-09 | threejs-hvac-prototipos | jaula-seguridad | threejs | materials | colorTarget authoring | wasted-retry | Anchor a `colorTarget` crop by projecting the part's world position to pixels, then confirm two independent instances agree — never by scanning the render for a hue. A low standard deviation proves the crop does not straddle an edge; it proves nothing about identity. | [measured] a hue scan for "safety yellow" returned 328 windows at deviation 0.0 that were all WOODEN PALLET ([162,126,77] vs wood #a8814f, same B/R); the real guard measured [199,162,41] | staged |
| 2026-08-09 | threejs-hvac-prototipos | jaula-seguridad | threejs | (tooling) | first gate in a linked worktree | mechanical-failure | A linked git worktree has no `node_modules`, so the entire `research/tools/` harness dies with `ERR_MODULE_NOT_FOUND` on `puppeteer-core`. Symlink the main checkout's `node_modules` AND exclude it via `.git/info/exclude` — `.gitignore` lists `node_modules/` with a trailing slash, which does not match a symlink. | [measured] `preflight.mjs` exit 1 "Cannot find package 'puppeteer-core'"; after symlink, preflight PASS 26 draws / 14322 tris; `git status` showed `?? node_modules` until the exclude was added | staged |
| 2026-08-09 | threejs-hvac-prototipos | jaula-seguridad | threejs | materials | padlock, native crop | pre-review-catch | The native-resolution crop cuts BOTH ways: the kit prescribes it so the judge does not score a defect the downscale invented, but it also reveals defects the downscale HIDES. A small bare-metal part read as a plausible pale mark at frame scale and as a flat black silhouette at 1:1. | [measured] `/tmp/lock-native.png` (black) → practical placed on the solved reflection direction R = 2(N·V)N − V → `/tmp/lock-native3.png` (body, shackle arc, keyway legible); metalness held at 0.95 throughout | staged |
| 2026-08-09 | threejs-hvac-prototipos | jaula-seguridad | threejs | materials | inline reviewer | user-correction | When the session cannot spawn a fresh-context reviewer, do NOT present the resulting verdict as contract-passed: record the self-review explicitly in `mechanical.note` and flag it to the user. GATES.md permits an inline role hat only in quick mode. | [session-observed] `materials-attempt1.review.json` mechanical.note records the inline reviewer as deviation (1) of three | staged |
