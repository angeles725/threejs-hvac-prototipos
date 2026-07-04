# Preserved external sources — Three.js library research

> Registry of every document/page downloaded during the research. Research-SDD rule:
> URLs die; evidence does not. Blocks cite the **local file**,
> not the URL. This registry is maintained by `research-sdd/toolbelt/fetch-doc.sh` (automatic append).

| File | Type | Origin (URL) | Date (UTC) | sha256 | Blocks that cite it |
|---|---|---|---|---|---|

## Structure

```
sources/
  datasheets/      ← (unused for this target)
  manuals/         ← official Three.js docs/manual pages preserved
  web-snapshots/   ← pages and forums converted to markdown (pandoc)
  extracted/       ← extracted text (pdftotext) / OCR (tesseract)
```

## Note on context7

Documentation retrieved via the context7 MCP (`/mrdoob/three.js`) is treated as
**official web** (`[CERT-web]`, cite: "context7 /mrdoob/three.js + query + date").
Load-bearing claims sourced from context7 are cross-checked against, and when
possible preserved from, threejs.org (fetch-doc.sh → web-snapshots/).
| web-snapshots/skyeshark.github.io_threejs-silhouette-pom_.md | web-snapshot | https://skyeshark.github.io/threejs-silhouette-pom/ | 2026-07-04T20:38:53Z | 04adf2b071e479b2… | |
| web-snapshots/xr-need.com_web-features_threejs_pathtracer_1_dist_.md | web-snapshot | https://xr-need.com/web-features/threejs/pathtracer/1/dist/ | 2026-07-04T20:38:56Z | e744c3e4738f6e33… | |
| web-snapshots/little-landscapes.vercel.app_.md | web-snapshot | https://little-landscapes.vercel.app/ | 2026-07-04T20:38:58Z | 6ab3e0db93d66a99… | |
| web-snapshots/re-presentation.jp_tool_arachne.html.md | web-snapshot | https://re-presentation.jp/tool/arachne.html | 2026-07-04T20:39:03Z | 88d45b1a00c09828… | |
| web-snapshots/dasprinzip.com_tinker_day39_.md | web-snapshot | https://dasprinzip.com/tinker/day39/ | 2026-07-04T20:39:04Z | a7b39d3621fb3a7c… | |
| web-snapshots/dasprinzip.com_tinker_day38_.md | web-snapshot | https://dasprinzip.com/tinker/day38/ | 2026-07-04T20:39:04Z | 5b43f1e5a97cca41… | |
| web-snapshots/dasprinzip.com_tinker_day37_.md | web-snapshot | https://dasprinzip.com/tinker/day37/ | 2026-07-04T20:39:05Z | dc8570a551b3657c… | |
| web-snapshots/dasprinzip.com_tinker_day36_.md | web-snapshot | https://dasprinzip.com/tinker/day36/ | 2026-07-04T20:39:06Z | e12edaba9ec8d97b… | |
| web-snapshots/dasprinzip.com_tinker_day33_.md | web-snapshot | https://dasprinzip.com/tinker/day33/ | 2026-07-04T20:39:06Z | 6b1c9b809c0e5cd7… | |
| web-snapshots/dasprinzip.com_tinker_day30_.md | web-snapshot | https://dasprinzip.com/tinker/day30/ | 2026-07-04T20:39:06Z | 3c776c0dd8ed7f33… | |
| web-snapshots/dasprinzip.com_tinker_day27_.md | web-snapshot | https://dasprinzip.com/tinker/day27/ | 2026-07-04T20:39:07Z | 55e4f68374288cb2… | |
| web-snapshots/dasprinzip.com_tinker_day26_.md | web-snapshot | https://dasprinzip.com/tinker/day26/ | 2026-07-04T20:39:07Z | 8e6525133dd1b321… | |
| web-snapshots/dasprinzip.com_tinker_day25_.md | web-snapshot | https://dasprinzip.com/tinker/day25/ | 2026-07-04T20:39:08Z | e525c3193d2cc49b… | |
| web-snapshots/dasprinzip.com_tinker_day23_.md | web-snapshot | https://dasprinzip.com/tinker/day23/ | 2026-07-04T20:39:08Z | 23d2407ecdecb7ce… | |
| web-snapshots/gb.manzarpour.com__g__Ibg_WXgA.md | web-snapshot | https://gb.manzarpour.com/?g=_Ibg_WXgA | 2026-07-04T20:39:09Z | 70ec4efead372e5e… | |
| web-snapshots/jeonghopark.de_collectivetrajectories_.md | web-snapshot | https://jeonghopark.de/collectivetrajectories/ | 2026-07-04T20:39:17Z | 01ba4719c80b6fe9… | |
| web-snapshots/journey.prateekm.dev_.md | web-snapshot | https://journey.prateekm.dev/ | 2026-07-04T20:39:19Z | 0e5dce9e79a15946… | |
| web-snapshots/su-z2.vercel.app_.md | web-snapshot | https://su-z2.vercel.app/ | 2026-07-04T20:39:21Z | b31b1c375f00e5cb… | |
