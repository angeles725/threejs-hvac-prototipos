# COB-IM2 data handoff — research pipeline → deliverable viewers

This project spans **two git repositories** with deliberately distinct roles. This document records
that split, why it stays split, and how data crosses from one to the other with provenance intact.

## The two repositories

| Repo | Path | GitHub remote | Role |
|---|---|---|---|
| **research-cob-im2** (A) | `~/investigacion/COB-IM2` | `angeles725/research-cob-im2` | Internal pipeline + corpus: the DWG→graph extractor, raw DXFs, output JSONs, findings/retros. |
| **threejs-hvac-prototipos** (B) | `~/prototipos/three.js/threejs-hvac-prototipos` (`disenos/COB-IM2/`) | `angeles725/threejs-hvac-prototipos` | Client deliverable: the 3D viewers, the HVAC catalog, research/eval docs. |

Data flows **A → B**: the extractor in A produces `tools/out/L4-full.json`; its certified geometry
and stats are promoted into the viewers in B.

## Decision — keep the split, do not consolidate (2026-08-26)

Consolidating A into B was considered and **rejected**, on measured grounds:

1. **The loss-risk that motivated consolidation is already gone.** Repo A has a GitHub remote
   (`angeles725/research-cob-im2`), tracks `origin/main`, and had **zero unpushed commits** at
   decision time. It is backed up and versioned. (The older `README.md` claim that the
   investigacion corpus "was lost and is not recoverable" was stale — corrected there.)
2. **Consolidation would pollute the deliverable.** Repo A is 339 MB, **259 MB of it raw DXF**,
   plus ~16 probe/reconstruction scripts and the research corpus. None of that belongs in a
   client-facing deliverable repo.
3. **The real defect was never "two repos" — it was an undocumented handoff.** Fixing the handoff
   directly (this document + `data-provenance.json`) is reversible and lands the fix where the
   problem actually is. If consolidation is ever wanted, a documented handoff makes it trivial;
   consolidating now would be hard to undo.

## Promotion discipline (the rule going forward)

A viewer in B is only as trustworthy as the artifact in A it was built from. Every promotion MUST:

1. Build from a **committed** artifact in A — never a dirty working-tree file. Record the artifact
   path, its **sha256**, and A's **commit hash**.
2. Record that triple in `data-provenance.json` (this directory), keyed by the viewer filename.
3. Preserve per-run provenance fields (`w_src` / `h_src` / `bod_src` = measured vs assumed) through
   to the rendered model. A viewer that strips them renders geometry that *asserts nothing* about
   whether its dimensions were measured or guessed — see the provenance-blind rows in the manifest.

## Source-of-truth artifacts (pinned at 2026-08-26)

Repo A `HEAD = a29d14d`. Output artifacts under `~/investigacion/COB-IM2/tools/out/` (sha256 shown
as first 16 hex, except the canonical artifact whose full digest is given below):

| Artifact | sha256 (first 16) | Last commit | What it is |
|---|---|---|---|
| `L4-full.json` | `7533dccba521779c` | `a29d14d` | **Canonical L4 network** — 2033 runs, 2540.2 m. Carries per-run provenance. |
| `L4-systems.json` | `d12af3c0733b86c6` | `ef9d3d3` | L4 runs tagged by system (colouring source). |
| `L4-complete-ducts.json` | `ce4b353645f2ab68` | `6fbfbb3` | L4 complete-ducts variant. |
| `14A-ducts.json` | `1635e4c56f7a0aaa` | `28c8ef3` | Level-4 area A ducts. |
| `L2-ducts.json` | `edcd66df45774b88` | `5266950` | Level-2 ducts. |
| `L3-ducts.json` | `d08e9c78e5039ea2` | `c5b9e66` | Level-3 ducts. |
| `L4-grid.json` | `45f2f818c45398f3` | `a29d14d` | Structural grid (co-registration reference). |
| `L4-conflicts.json` | `4f53cda18c2baa0c` | `a29d14d` | Clash/conflict output. |
| `L4-arch.json` | `215257daebb52c63` | `a29d14d` | Architectural context. |

`L4-full.json` full sha256:
`7533dccba521779c74b2821effa66a7ea71748828cb9b5461e320a8f6849521d`

## Viewer provenance (measured 2026-08-26)

Of the ten deliverable viewers, **two carry per-run provenance** (`w_src`/`h_src`/`bod_src`) and
eight are **provenance-blind**. Full per-viewer detail — source artifact, sha, and the certainty of
each viewer→artifact link — is in `data-provenance.json`. Summary:

| Viewer | Carries provenance? |
|---|---|
| `cob-im2-L4-system-3d.html` | **Yes** — `w_src`, `h_src`, `bod_src` |
| `cob-im2-L4-full-3d.html` | **Yes** — `w_src`, `h_src`, `bod_src` |
| `cob-im2-L4-complete-3d.html` | No |
| `cob-im2-catalogo-3d.html` | No (catalog viewer, not a run dataset) |
| `cob-im2-14A-3d.html` | No |
| `cob-im2-L2-3d.html` | No |
| `cob-im2-L3-3d.html` | No |
| `cob-im2-integrated-3d.html` | No |
| `COB_Level4_Full_ThreeJS.html` | No (older 2026-08-21 build) |
| `COB-IM2_14A_ductos_3D.html` | No (older 2026-08-21 build) |

## Known open items (owned by Track A / Track B, not closed here)

- **Provenance-blind viewers.** Eight of ten render geometry that asserts nothing about
  measured-vs-assumed dimensions. Whether each *should* carry provenance is a Track-B decision;
  this manifest only records the current state.
- **Height coverage.** Per the corpus, duct height is unknown for a large fraction of network
  length (the binding clash-readiness constraint). That is an extractor concern in repo A, not a
  handoff concern — tracked there.
- **Viewer→source mapping certainty.** Viewers bake their data with no internal source-filename
  reference, so most viewer→artifact links are established by best available evidence
  (name correspondence + provenance-field match), not by an embedded pointer. New promotions must
  record the link explicitly (rule above) so this uncertainty does not recur.
