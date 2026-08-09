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
