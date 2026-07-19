# 2026-07-19 — Permanent cache-busting for the publish pipeline

## Goal

Every emitted **mutable** asset carries a content hash in its **filename**, every HTML reference is
rewritten to match, and a Cloudflare Pages `_headers` file pins the cache policy. Net effect: a
browser can never serve a stale bundle after a deploy (HTML is `no-cache`, and a byte change flips
the hashed filename), while hashed assets cache immutably for a year.

This replaces the fragile manual `?v=20260719a` query-string patch that had been hand-applied
directly to the `publish/` output (the dev source was always clean). Query strings are a weak cache
key some intermediaries ignore; a filename change is unambiguous.

## Design

### Pure module — `publish-hash.mjs` (shared-by-copy, one per project)

Factored the cache-busting logic into a small pure module next to each `build-publish.mjs`, mirroring
how the two sibling builders already copy each other. No fs, no globals — unit-tested in isolation.

- `contentHash(buf)` — sha256 of the bytes, first 8 hex chars.
- `hashedName(base, ext, hash)` — `main` + `js` + `a1b2c3d4` -> `main.a1b2c3d4.js` (hash between
  name and extension, so extension-based tooling and the `_headers` splat still work).
- `rewriteRefs(html, map)` — rewrites `src=`, `href=` and `import('...')` references whose **basename**
  is a key of `map` (`{ 'main.js': 'main.<hash>.js', ... }`). A single regex covers the three ref
  forms. For a mapped ref it drops any `?query` (strips the stale `?v=` remnants) and preserves the
  `./` prefix. Absolute URLs (the `three` importmap, Google Fonts) and unmapped local assets
  (`./assets/*`, `dashboard.html`, `/`, `#viewer`) pass through verbatim.

The `three` importmap CDN entries are left untouched because they are absolute `https://` URLs and
carry no `src=`/`href=`/`import(` context that the rewriter keys on — proven by unit test.

### Builder wiring

Both builders accumulate a `hashMap` as they emit each mutable asset, write the file under its hashed
name (never the plain name), then run the emitted HTML through `rewriteRefs`. `rmSync(OUT)` at the top
already wipes the project dir every run, so no stale unhashed bundle can linger — only hashed names
are ever written.

Hashed (content-mutable) assets:

- **cinemex**: `main.js`, `dashboard.js`, `styles.css`.
- **dhl**: `main.js`, `styles.css`.

Deliberately **not** hashed:

- `protection.js` — the watermark/friction guard is written under a fixed name into the viewer dirs
  **and** the hand-staged portal shells (`publish/protection.js`, `portal/protection.js`) which the
  hand-maintained hub references as `./protection.js`. A fixed name keeps those in sync; it gets a
  short `must-revalidate` window instead of an immutable one.
- `assets/*` — logos and favicons; static images, short `must-revalidate`.
- DHL `equipos/<kind>/*.html` detail + realistic-model fragments — mutable but `.html`, so they fall
  under the `no-cache` HTML rule (no hashing needed).

### `_headers` (emitted by the CINEMEX builder into `publish/` root)

The cinemex builder owns the `publish/` root (alongside the hand-staged hub `index.html` and
`protection.js`), so it writes `_headers` there deterministically every run. It also governs the
sibling `p/dhl/` tree, which is built separately.

Two Cloudflare `_headers` rules verified against
developers.cloudflare.com/pages/configuration/headers and load-bearing here:

1. **At most one `*` splat per pattern**, and the splat matches greedily **including `/`**. This
   forbids a `/p/*/main.*.js` shape (two splats) — hence the immutable block is enumerated per
   project + asset family, with the single splat standing in for the hash (`/p/cinemex/main.*.js`).
2. **Multiple matching rules COMBINE (comma-joined), they do not override.** So every pattern is kept
   **disjoint** — a hashed bundle matches exactly one rule, never `immutable` + `no-cache` at once.

Policy:

| Pattern | Cache-Control | Why |
| --- | --- | --- |
| `/`, `/*.html`, `/p/*/` | `no-cache` | HTML always revalidated — a deploy is picked up at once |
| `/p/cinemex/main.*.js`, `.../dashboard.*.js`, `.../styles.*.css` | `public, max-age=31536000, immutable` | hashed = filename is the cache key |
| `/p/dhl/main.*.js`, `/p/dhl/styles.*.css` | `public, max-age=31536000, immutable` | same, DHL tree |
| `/assets/*`, `/p/cinemex/assets/*` | `public, max-age=3600, must-revalidate` | unhashed logos/favicons |
| `/protection.js`, `/p/cinemex/protection.js`, `/p/dhl/protection.js` | `public, max-age=3600, must-revalidate` | shared fixed-name guard |

Disjointness check: `.html` vs `.js`/`.css` never collide; `/p/*/` only matches trailing-slash
directory requests (the greedy splat needs the trailing `/`, which a file path lacks); `/assets/*`
and `/p/cinemex/assets/*` are rooted at different prefixes; `protection.js` paths are exact.

### Hub `publish/index.html`

Hand-maintained, not built here. Its only mutable local reference is `./protection.js` (fixed name,
covered by the `/protection.js` rule); its thumbnails are static `assets/*.png` (covered by
`/assets/*`); its favicon is an inline `data:` URI. Nothing to hash — left as-is, covered by policy.

## Verification

- **Cinemex builder run**: emitted `main.d4b73ef3.js`, `dashboard.824120c3.js`, `styles.fd075315.css`
  (hashes vary per build by design). No unhashed `main.js` / `dashboard.js` / `styles.css` linger.
  `publish/_headers` present at the publish root.
- **HTML references match exactly**: `index.html` -> `import('./main.d4b73ef3.js')`,
  `href="./styles.fd075315.css"`; `dashboard.html` -> `src="./dashboard.824120c3.js"`. No `?v=`
  remnant anywhere. `three` importmap + `./assets/*` + `./protection.js` untouched.
- **Test census**:
  - cinemex full suite `node --test tests/*.test.mjs` -> **316 pass / 0 fail** (305 baseline + 11
    new in `tests/publish-hash.test.mjs`).
  - dhl new file `node --test tests/publish-hash.test.mjs` -> **10 pass / 0 fail**.
- **Published-page smoke** (headless Chrome, swiftshader, served over the local static server):
  boots to `Sistema listo · Telemetría en vivo`, canvas present, `data-app-error` unset, fatal panel
  hidden. Network: hashed `main.d4b73ef3.js` `200`, `styles.fd075315.css` `200`, `protection.js`
  `200`, all three `three@0.160.0` modules `200` from jsdelivr. Zero application console errors (the
  single `warn` is Chrome's headless "software WebGL fallback" deprecation notice — an environment
  artifact, not from the page).

## DHL patch note (edited, NOT run)

`disenos/datacenter-dhl/build-publish.mjs` was patched to the same scheme (hash `main.js` +
`styles.css`, `rewriteRefs` on the emitted `index.html`) and a byte-identical `publish-hash.mjs` +
new `tests/publish-hash.test.mjs` were added. As instructed, the DHL **builder was not executed** and
no other DHL file was touched — another writer owns that tree and will run the builder itself, picking
up this patch. Validated with `node --check build-publish.mjs` (syntax OK) and the new pure-function
test (10/10). The DHL builder emits no `_headers` of its own — the cinemex `_headers` already covers
`/p/dhl/main.*.js`, `/p/dhl/styles.*.css` and `/p/dhl/protection.js`.
