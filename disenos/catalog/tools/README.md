# catalog/tools

| Tool | Path | WHY |
|---|---|---|
| `verify-catalog-asset.mjs` | `disenos/catalog/tools/` | ADAPTED from `research/sources/probes/B56-visor-perf/measure.mjs` (the CDP driver B56 used to measure the 18 equipment inspectors). Same launch path and probe shape; changed: catalog URL layout, console-error capture, `rootMeshes` count, a PNG screenshot per asset, and a non-zero exit when an asset fails. One verification criterion shared by every catalog session. |

## Usage

```sh
# serve the repo root
python3 -m http.server 8899 --bind 127.0.0.1 &

# check one or more assets — <family>/<slug>
SHOT_DIR=/tmp/shots node disenos/catalog/tools/verify-catalog-asset.mjs \
  puertas/puerta-cuarto-frio almacenamiento/rack-pallet
```

Exit code is `0` only when every asset reached `data-app-ready`, rendered (`calls > 0`) and threw
no console exception. A PNG lands in `$SHOT_DIR` per asset, which is also what the `colorTarget`
crop in each `design-spec.yaml` is measured from.

## What it does and does NOT prove

- **Rasteriser-independent, therefore real** `[CERT]`: draw calls, triangles, geometries, textures,
  programs, `pixelRatio`, `shadowMap.autoUpdate`. These are what the scene *submits* per frame.
- **NOT proven**: frame time. The driver runs `chrome-headless-shell` with
  `--use-angle=swiftshader`, a CPU software rasteriser — wall-clock ms/frame here does not predict a
  client GPU. See [Block 56] for the full validity boundary.

## Hook naming

The probe matches any `/^__.*App$/` global carrying `.runtime.renderer`. A slug with a hyphen is not
a valid JS identifier, so the asset exposes camelCase (`puerta-cuarto-frio` → `__puertaCuartoFrioApp`)
and, for the assets in this family, additionally a slug-exact alias via `globalThis['__<slug>App']`.

## `qa-lock.sh` — serialise probes across parallel sessions (opt-in)

The QA "flakiness" is **contention, not random crashes**. Measured 2026-08-08: ~70 headless chrome
processes on 16 cores (load 54.9) with 7 sessions each firing their own probe. Chrome's startup then
exceeds the probe's WebSocket wait and node dies on an unsettled top-level await — the `exit 13`
signature. **Retrying under that load makes it worse**: every retry queues one more chrome.

`qa-lock.sh` takes an exclusive `flock` so runs QUEUE instead of competing. It is a wrapper and
changes none of the probes:

```bash
disenos/catalog/tools/qa-lock.sh node disenos/catalog/tools/verify-catalog-asset.mjs hvac/caldera

SHOT_DIR=/tmp/shots disenos/catalog/tools/qa-lock.sh \
  node disenos/catalog/tools/probe-state.mjs puertas/torniquete btnOpen
```

Contract, chosen so the wrapper cannot corrupt a gate decision:

- **stdout passes through untouched** — the probes print JSON there and callers pipe it, so every
  message the wrapper emits goes to stderr.
- **the wrapped exit code is returned verbatim** (`0` pass, `1` real asset failure).
- **lock timeout exits `2` = INCONCLUSIVE, never `1`** — nothing was measured, so it must not read as
  a broken asset. Same rule the probes' own preflight follows.

| Env | Default | Meaning |
|---|---|---|
| `QA_LOCK_FILE` | `/tmp/catalog-qa.lock` | shared lock path — all sessions must agree on it |
| `QA_LOCK_TIMEOUT` | `900` | seconds to wait; `0` waits forever |
| `QA_LOCK_QUIET` | unset | `1` silences the "waiting" notice on stderr |

Wrap **one probe invocation**, not a whole sweep: holding the lock across a 90-asset run starves
every peer. If `flock` is missing the command still runs, unserialised, with a notice on stderr —
losing serialisation is a performance problem, refusing to run would break the caller's gate.
