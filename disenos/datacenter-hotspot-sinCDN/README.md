# datacenter-hotspot-sinCDN

Offline-capable build of the Datacenter hotspot dashboard. Same dashboard as
`disenos/datacenter-hotspot/`, with every remote dependency removed.

## Why this exists

The visor build resolves three.js from `unpkg.com` through a page importmap. That is one request to
the public internet at load time, and it is where a corporate network breaks the dashboard: the page
opens, the CDN is blocked, and the 3D scene silently never renders. It also means the dashboard
cannot be shown at all without connectivity.

Measured on 2026-08-04: 4 of the 6 visor projects (cinemex, dhl, hotspot, kalte) load three.js from
unpkg. The two client dashboards that pass the same restricted network (`dashboard-energetico`,
`niagara-casino`) are Vite builds with no external CDN at all — that difference, not the hosting
provider, is what this project removes.

## What the build produces

`node build-offline.mjs` writes `dist/`:

| File | Size | Notes |
|---|---|---|
| `index.html` | ~585 kB | room dashboard, three r160 inlined |
| `rack-detail.html` | ~516 kB | per-rack view, reached as `rack-detail.html?rack=<id>` |

Each file is one self-contained HTML document. It:

- makes **zero** network requests — no CDN, no fonts, no analytics, no update poller;
- renders on a machine with no internet;
- opens by **double-click** over `file://` (an inline `<script type="module">` is not subject to the
  cross-origin rules that block external module imports from `file://`);
- works equally well served over HTTP from any static host.

Keep both files in the same folder — they link to each other by plain filename.

## Deliberate differences from the visor build

- **Not obfuscated, no `protection.js`.** Obfuscating a bundle with three.js inlined is slow and
  buys nothing for an artifact meant to be handed to a client to open directly. The gated,
  obfuscated copy under the visor is untouched and remains the hardened distribution channel.
- **Auto-update poller removed.** The source HEAD-polls its own URL every 20s to detect a redeployed
  origin. Its comment claims that without an ETag (`p.ej. file://`) it "queda inerte y no molesta";
  over `file://` the fetch actually rejects and logs a console error on every tick. Meaningless for
  a file on a USB stick, so `build-offline.mjs` strips it and asserts it found exactly one.
- **No access gate.** The visor's server-side passcode gate is a Cloudflare Pages Function and does
  not apply here. Treat `dist/` as sensitive: anyone holding the file can open it.

## Verification

```
node build-offline.mjs      # asserts no CDN reference, no remote src/href, no bare specifiers
node verify-offline.mjs     # loads dist/ over file:// with the network OFF
```

`verify-offline.mjs` asserts zero non-`file://` requests attempted, zero page errors, a live WebGL
context, and an advancing render loop. It writes screenshots to `dist-verify/` for **manual** pixel
inspection — that step is deliberately not automated; see the header of that file for why the
obvious `gl.readPixels` check reports black on a perfectly healthy render.

Pass `--playwright <path>` if Playwright is not at the default path hardcoded in the script.

### Known, pre-existing (NOT introduced here)

Clicking a rack in the 3D scene did not navigate in headless tests — 0/6 sampled points registered
`cursor: pointer`, and no click reached `rack-detail.html`. The **original** visor build served over
HTTP behaves identically under the same test, so this is either a limitation of headless/SwiftShader
picking or a pre-existing issue in the dashboard. It was not investigated further. The in-page links
to `rack-detail.html` and the two back-links to `index.html` do work over `file://`.

## Updating three.js

`vendor/three/` holds three r160 (`three.module.js`, `OrbitControls.js`, `RoomEnvironment.js`), the
only three files the two pages import. Both addons import `'three'` and nothing else, so replacing
these three files is the whole upgrade. The importmap in the source HTML points at `./vendor/three/`
so the sources still run unbundled from a local server; `dist/` inlines them and drops the map.
