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
