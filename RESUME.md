# RESUME — catalog-proceso-4 · skid-cip

Session socket `uds:/run/user/1000/cc-socks/4099445.sock` · branch `feat/catalog-proceso-4`
Assigned by session-A: **skid-cip only** (family `proceso`). Block number assigned: **B101**.

## Status at handoff

| item | state |
|---|---|
| `research/sources/B101-cip-dims/` | **DONE** — 10 files, 20 MB, promoted BEFORE any citation |
| `research/sources/SOURCES.md` | **DONE** — 10 rows with sha256, tagged B101 |
| `research/threejs-block101.md` | **DONE** — written, uncommitted |
| `research/BLOCK-REGISTRY.md` | **DONE** — proceso next-free bumped to B102 |
| `disenos/catalog/proceso/skid-cip/design-spec.yaml` | **DONE except `colorTarget`** — see below |
| `disenos/catalog/proceso/skid-cip/skid-cip.html` | **IN PROGRESS** — delegated modeler was building at handoff |
| gate / ΔE00 / commit | **NOT DONE** |
| `catalog.yaml` status | still `pending` — correct, do not mark done until the gate passes |

Nothing is committed yet. Everything above is untracked or modified in the working tree.

## FIRST THING TO DO ON RESUME: merge master

`master` now carries the QA-tool fix this worktree does NOT have yet (`d469a40` + `ada38f9`): all
four catalog tools accept `BASE_URL || BASE`, they ANNOUNCE the resolved BASE before measuring, and
`probe.mjs` finally honours `PORT`. This worktree was deliberately NOT merged while a capture was in
flight — swapping the instrument mid-measurement produces evidence born dead, half of it from each
version. Merge first (`git -C <worktree> merge master`, NOT `--ff-only`), then re-run the gate so the
verdict you report comes from the fixed instrument.

## What remains, in order

1. **Check whether `skid-cip.html` exists and is complete.** A delegated modeler was mid-build. If
   the file is absent or half-written, rebuild it from `disenos/catalog/shell-template.html` against
   the spec — the spec is closed and evidence-backed, do NOT re-derive dimensions from scratch.
2. **Run the gate**, always inside the lock:
   ```
   cd /home/cristian/prototipos/three.js-worktrees/catalog-proceso-4
   setsid python3 -m http.server 8127 --bind 127.0.0.1 >/dev/null 2>&1 & disown
   SHOT_DIR=/tmp/shots BASE_URL=http://127.0.0.1:8127 disenos/catalog/tools/qa-lock.sh \
     node disenos/catalog/tools/verify-catalog-asset.mjs proceso/skid-cip
   ```
   **`BASE_URL`, not `BASE` — the sibling tools disagree on the variable name and the ONBOARD's
   example is for the other one.** Measured in the source:
   `verify-catalog-asset.mjs:18` reads `process.env.BASE_URL`; `probe-state.mjs:11` and
   `hole-probe.mjs:20` read `process.env.BASE`. All three default to `http://127.0.0.1:8899`, the
   contaminated port that serves a DIFFERENT repo root. So the wrong variable name does not error —
   it silently inherits the poisoned default. ONBOARD line 55 documents `BASE=` and is correct for
   `probe-state`; generalising it to the gate is the trap.
   Exit 2 / exit 13 / a black PNG are **INCONCLUSIVE**, never a verdict. Retry, do not "fix" the asset.
3. **OPEN the PNG and look at it.** Green counts do not see broken geometry.
4. **State QA** (`probe-state.mjs`) for the four toggles — the default-view gate never sees anything
   behind a button. Read `class="on"` FIRST: a probe that clicks blindly turns OFF what defaults on
   and manufactures fake "nothing visible" defects.
5. **Measure `colorTarget`** from the capture (lit tank flank crop), append
   `{srgb, deltaE00Max, crop}` to the spec, then `node disenos/catalog/tools/verify-design-spec.mjs
   proceso/skid-cip` must go green.
6. **Commit by explicit paths** (never `git add -A`), mark `skid-cip` done in `catalog.yaml`, report
   to session-A. No push.

## Decisions already made — do NOT redo this reasoning

- **LINEAR 600 L format, 3.200 × 1.000 × 1.800 m** (Suncombe published row). The sources publish TWO
  skid formats (linear and tower) and they do not interpolate. The 600 L row is the only one that
  CLOSES arithmetically with two vertical vessels over a pump bay: vessel 1.335 + deck 0.450 = 1.785
  ≤ 1.800. **The 1000 L row of the same table does NOT close** — it leaves 23 mm for the pump bay,
  i.e. no bay exists. Full derivation in `research/threejs-block101.md` §101.2.
- **DN50 main**, because 175 L/min in DN50 = 1.49 m/s, the smallest bore still meeting the ASME BPE
  1.5 m/s floor at this duty. DIN 11850: DN50 = 53.0 OD / 50.0 ID / 1.5 wall.
- **Lighting**: the library brushed-stainless recipe (env 2.15 + HemisphereLight + frontal fill),
  which is a BINDING active kit rule. The house ONBOARD points curved bare metal at the §3.3 STUDIO
  rig instead, but the RectAreaLight that needs is reported to stall the SwiftShader compile — that
  report is STAGED, not binding. Plan of record: measure, do not pick a side. If the tank-flank
  gradient fails its critical feature, try the studio variant and record which one this subject
  actually needed.
- **`colorTarget` deliberately absent until measured.** The validator FAILS the spec for it today,
  and that failure is the honest state. It must come from a render crop — the rendered value differs
  from albedo `#c6cbcd` after ACES tonemapping. Authoring a guessed sRGB hands the ΔE00 gate a
  fabricated anchor that passes against nothing.

## Environment traps measured this session (cost other sessions real time)

- **Occupied ports: 8123, 8777, 8899, 8901, 8902, 8906, 8931.** 8127 was free and is what this
  worktree uses. A 200 response does NOT prove you are serving your own tree.
- **Verify the port in TWO directions**: `research/threejs-block101.md` must return **200** (exists
  only here) and `disenos/catalog/proceso/etiquetadora/etiquetadora.html` must return **404** (exists
  only in catalog-proceso-3). One direction alone cannot tell "correct tree" from "someone else's".
- **`research/tools/probe.mjs` and `capture.mjs` HARDCODE port 8123, which is occupied.** Without
  `PORT` they measure another session's tree with a green gate. `verify-catalog-asset.mjs` honours
  `BASE` — use that.
- Always pass `--max-time` to curl. Without it a dead port and a saturated one look identical, and
  one check here hung 120 s.
- Do not curl the port while the QA probe is running — it competes with the gate's own chrome.

## Peers (do not touch their work)

`catalog-proceso` fluidos · `catalog-proceso-2` (4088638) empacadora-flowwrap + tunel-enfriamiento +
molino, block B100 · `catalog-proceso-3` (4179894) etiquetadora **done** (c24fe6b) + llenadora not
started, consumed no block · `catalog-session-b` puertas + almacenamiento.
Orchestrator is session-A (three-js-8c, `uds:/run/user/1000/cc-socks/506411.sock`).
