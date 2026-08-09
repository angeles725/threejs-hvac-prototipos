# Orchestrator handoff — catalog 3D swarm (session-A role)

You are **session-A**: the orchestrator/integrator on `master`, NOT a modeler. Multiple Opus-5 sessions
model 3D catalog assets in parallel git worktrees; you integrate their branches, verify, keep the shared
contract/tools/registry coherent, and coordinate. **You do not model assets** (the user prefers Opus-5's
modeling; your value is orchestration, QA integration, and merges). Resume with this exact role.

## Where things stand (update as you go — the repo is the source of truth, not this line)
- Progress at handoff: **91/107 assets `done`** (`git log`, `rg -c 'status: done' disenos/catalog/catalog.yaml`).
- **8+ families complete**: retail, seguridad, hvac, robotica, automotriz, transporte, laboratorio, estructuras,
  electricos, datacenter, instrumentacion. Pending (being modeled): proceso 6, fluidos 3, utilities 1,
  almacenamiento 3, puertas 3 = 16.
- The **integrated portion is independently audited clean**: ~41 assets audited by 3 auditor sessions, **0 real
  defects**; every "defect" so far was a probe artifact (measurement error), never an asset.

## Your loop
1. A session messages you a lote (or you sweep branches). Find work: `git branch --list 'feat/catalog-*'` +
   `comm -13 <(git ls-tree -r --name-only master -- disenos/catalog|rg '\.html$'|sort) <(git ls-tree -r --name-only <branch> -- disenos/catalog|rg '\.html$'|sort)`.
2. `git merge --no-commit --no-ff <branch>`. Resolve conflicts: `tools/*.mjs` → `--ours` (keep master's
   unified gate); shared corpus files (SOURCES/RESEARCH-STATE/INDEX/CATALOG) → UNION (strip `<<<<`/`====`/`>>>>`
   lines, keep both sides); asset files → `--theirs`.
3. Verify the NEW assets (see QA below). **Commit only if verified.** Then push.
4. Mark family statuses in `catalog.yaml` if the branch didn't. Reply to the session with retro + next step.
5. Keep sessions busy: `ListAgents` → nudge idle catalog sessions (build remaining or audit). Finished-family
   sessions AUDIT integrated assets.

## Communication
`ListAgents` shows peer sessions. `SendMessage({to, message})` — reply to a peer by copying its `from` socket
(e.g. `uds:/run/user/1000/cc-socks/NNN.sock`) or its `name [ref]`. Sessions ping you per lote.

## The contract (every asset — enforced at integration)
- Path `disenos/catalog/<family>/<slug>/{design-spec.yaml,<slug>.html}`, from `shell-template.html`.
- Exposes `globalThis.__<slug>App.runtime` (camelCase for hyphenated slugs) + `__qaRenderInfo` + `data-app-ready`.
- Render-on-demand, shadows frozen, mapSize≤1024, DPR≤2, instancing only where repetition is real.
- `design-spec.yaml`: parses (validator below), colorTarget MEASURED, 8-axis complexity, metalness near-binary
  (§3.1: 0=dielectric/painted, ~1=bare metal; 0.85-1.0 valid; the shader-artifact band is ~0.06-0.84).
- Full contract + ~45 gotchas: `disenos/catalog/ONBOARD-SESSION.md` (READ IT — it's the accumulated wisdom).

## QA tools (`disenos/catalog/tools/`)
- `verify-catalog-asset.mjs` — default-state gate. `BASE_URL`/`CDP_PORT` env, free CDP port, per-target 200
  preflight, console-error capture, setMaxListeners. Exit 0=pass, 1=real fail, 2=inconclusive (server/infra).
  Run: serve repo root on a private port, `BASE_URL=http://127.0.0.1:<port> CDP_PORT=<uniq> node ... <family>/<slug>`.
- `probe-state.mjs` — toggle-state capture (clicks buttons, PNG per state).
- `audit-asset.mjs` — inventory by `geometry.type+parameters` + per-button diff.
- `hole-probe.mjs` — sentinel background (repaints scene bg magenta → magenta pixels = camera sees through =
  real hole). Distinguishes dark panel from hole (pixel-diff can't).
- `verify-design-spec.mjs` — parses every spec (uses Ruby psych; no pyyaml here). Catches invalid-YAML specs.
- **Gate is FLAKY under heavy concurrency** (many sessions running chrome; SwiftShader is CPU-bound): `ready:undefined`
  / exit 13 / blank capture = infra, NOT a broken asset → retry, or trust the session's own exit-0 QA + `curl` 200.
- **CRITICAL audit trap**: canvas readback (`drawImage(renderer.domElement)`) returns BLACK
  (preserveDrawingBuffer=false) → constant hash for any scene. Only hash `Page.captureScreenshot`. The 4 tools
  above are safe (they use captureScreenshot). Discard any report made with canvas-hash.

## Standing conventions / hard-won rules
- **Refute audit findings before applying them as fixes.** A false-positive (tablero-switchgear) was relayed as a
  fix and the owner refuted it. Audit false-positives come from probes, not assets.
- **Verify-before-commit**: my bash loops twice committed unverified (word-splitting / missing SHOT_DIR). Gate the
  commit on the verification result.
- **Block-number authority = `research/BLOCK-REGISTRY.md`** (single source of truth). Availability = assignment
  recorded there, not disk/branch. Enforce at WRITE ("is block N yours?" = table lookup); the citation↔title cross
  is HUMAN review only (automating it is noisy). Ranges: session-B B57-69, transporte B70-79, robotica B80-89,
  automotriz B90-99, proceso B100-119.
- **Datasheet-less assets** (user-confirmed policy): model with all-low confidence + sources-tried in spec + HUD
  caveat, not invented "high" numbers. EXCEPT `puertas/puerta-seguridad`: session-B is waiting for the USER's
  confirmation IN ITS OWN CHANNEL (a peer — you — cannot relay the user's approval; do not push it).
- **Source folders namespaced by family** (`B63-automotriz-dims`); a duplicate ABB-IRB6700 PDF exists in two
  namespaces — keep both (isolation > 9MB).
- When taking files from a branch, `git checkout <branch> -- research/sources/` can CLOBBER other families'
  sources; take only the specific paths and verify `git diff HEAD --diff-filter=D` is empty before commit.

## What to do next
1. Integrate the remaining 16 as their sessions deliver (proceso/fluidos/utilities/almacenamiento/puertas).
2. Keep the auditors sweeping the built assets; relay only findings that survive the NO-RENDER/NO-PIXELS +
   measure-the-scene method, refuted with the owner.
3. Optional improvements proposed but not built: a build-catalog visor/gallery aggregating all `done` assets;
   an ADVISORY contract-checker (metalness band 0.06-0.84 + reads declared spec exceptions + per-handler
   requestRender) — hvac session offered a calibrated one.
4. Fine corpus registration (INDEX/RESEARCH-STATE counters, one duplicate "56" row) is unreconciled — cosmetic,
   do a corpus-cleanup pass when convenient.

Engram memory carries the running detail; search "catálogo 3D orquestación session-A" for the latest checkpoints.
