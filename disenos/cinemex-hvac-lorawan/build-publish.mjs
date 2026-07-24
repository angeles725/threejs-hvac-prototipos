#!/usr/bin/env node
/**
 * build-publish.mjs — bundled + obfuscated PUBLISH build for the Cinemex HVAC LoRaWAN viewer.
 *
 *   node disenos/cinemex-hvac-lorawan/build-publish.mjs   ->  publish/p/cinemex/
 *
 * The dev SOURCE (index.html, dashboard.html, main.js, src/**) stays readable and is the only
 * thing the test suite (`node --test tests/*.test.mjs`) ever sees. Only publish/ ships hardened.
 *
 *   index.html      ->  publish/p/cinemex/index.html      (+ the "← Proyectos" portal link)
 *   dashboard.html  ->  publish/p/cinemex/dashboard.html  (inline module extracted to dashboard.js)
 *   main.js + src/** ->  publish/p/cinemex/main.js         (one bundle, obfuscated)
 *   dashboard src/** ->  publish/p/cinemex/dashboard.js    (one bundle, obfuscated)
 *   styles.css      ->  publish/p/cinemex/styles.css       (verbatim)
 *
 * The readable `src/` module tree is NOT published — that is the whole point of this script.
 *
 * SCOPE: this script owns publish/p/cinemex/ ONLY. publish/index.html (the hand-written public
 * portal) and publish/assets/ are sources in their own right and are never touched here.
 *
 * RULE: never edit publish/ by hand. It is generated. Edit the source, rebuild.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, hashedName, rewriteRefs } from './publish-hash.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLISH = join(ROOT, 'publish');
const OUT = join(PUBLISH, 'p', 'cinemex');

// Access is enforced SERVER-SIDE by functions/_middleware.js (a Cloudflare Pages Function): without
// a signed cookie the login page is served instead of the project, for the HTML and every asset.
// Nothing gate-related is baked into the build anymore — see VISOR.md.

const OWNER = 'Cristian Angeles';
const YEAR = '2026';
const BANNER = `/* (c) ${YEAR} ${OWNER}. All rights reserved. Proprietary build — do not redistribute. */`;

/**
 * three.js is NEVER bundled and NEVER obfuscated: index.html's importmap maps the bare `three` and
 * `three/addons/*` specifiers to the CDN, and the browser resolves them at runtime. esbuild must
 * therefore treat every `three...` specifier as external so it survives into the bundle untouched.
 */
const THREE_EXTERNALS = ['three', 'three/*'];

/**
 * Obfuscation profile tuned for a three.js render loop.
 *
 * PERFORMANCE is a stated client constraint ("no queremos algo que vuelva lento el 3D"), so the
 * four expensive/fragile transforms stay OFF:
 *   - controlFlowFlattening + deadCodeInjection: ~1.5x runtime slowdown each per the tool's docs.
 *   - debugProtection: injects a debugger-trap interval that burns cycles every frame.
 *   - selfDefending: rewrites the code into a tamper-checking form that is known to break under
 *     module loading, and would be defeated by a prettifier anyway.
 * What remains is pure identity/string hiding, which costs (nearly) nothing at runtime.
 */
const OBFUSCATOR_OPTIONS = {
  compact: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  splitStrings: true,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  simplify: true,
  renameGlobals: false,
  sourceMap: false,

  /**
   * DEVIATION (justified): keep the three.js import specifiers as literal strings.
   *
   * main.js loads three lazily — `await import('three')`, `import('three/addons/...')`. With the
   * default string handling, stringArray/splitStrings rewrite those specifiers into runtime
   * expressions (`import(_0x25a2b0(0x7ad))`). The browser would still resolve them through the
   * importmap, but the guarantee becomes unverifiable by inspection and hostage to the string-array
   * decoder. Reserving them keeps `import('three')` literal and greppable: the importmap contract
   * is then provable, not hopeful. Only the CDN specifiers match this pattern — no UI copy does.
   */
  reservedStrings: ['^three(/|$)'],

  // PERFORMANCE — deliberately OFF. See the note above; do not enable without a new client OK.
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
};

/**
 * Bundle a chunk of module code into a single self-contained IIFE.
 *
 * `format: iife` is load-bearing, not cosmetic. The obfuscator runs with `renameGlobals: false`
 * (renaming true globals would break the DOM/`window` contract), and it treats a bundle's top-level
 * declarations as globals — so an `esm` bundle would ship `createArchitectureStructure` &co. in
 * plain sight. esbuild's IIFE wrapper turns every top-level declaration into a function LOCAL,
 * which the obfuscator renames. External `import()` calls survive inside an IIFE untouched.
 *
 * Code is fed over stdin so that no temp entry file is ever written into the source tree (the
 * dashboard's entry only exists inline in its HTML). LOAD-BEARING: esbuild resolves a stdin input's
 * relative imports against the process CWD — there is no CLI --resolve-dir — so `cwd: ROOT` below
 * is what makes `./src/**` resolve exactly as it does in the browser. Do not drop it.
 *
 * console calls and debugger statements are dropped HERE (esbuild --drop) rather than via the
 * obfuscator's `disableConsoleOutput`: esbuild deletes them outright at AST level for zero cost,
 * while `disableConsoleOutput` injects a console-hijacking shim that runs forever inside the frame
 * loop. Dropping before obfuscation also means the dead strings never reach the string array.
 */
function bundle(code, label) {
  const args = [
    '--yes', 'esbuild',
    '--bundle',
    '--format=iife',
    '--platform=browser',
    '--loader=js',
    '--drop:console',
    '--drop:debugger',
    // Strip the development QA hooks from the shipped bundle. main.js gates them on
    // `globalThis.__CINEMEX_QA__ !== false`; defining it false folds the guard to `if (false)` and
    // --minify-syntax deletes the block. Without this, `__cinemexApp.runtime.scene` hands an
    // authenticated visitor the entire scene graph (measured: 185 meshes / 51,923 vertices) and a
    // GLTFExporter one-liner walks off with the design — obfuscation or not.
    '--define:globalThis.__CINEMEX_QA__=false',
    '--minify-syntax',
    ...THREE_EXTERNALS.map((specifier) => `--external:${specifier}`),
  ];
  try {
    return execFileSync('npx', args, { input: code, cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${label}: esbuild bundle failed\n${error.stderr || error.message}`);
  }
}

function obfuscate(code, label) {
  const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS).getObfuscatedCode();
  if (!obfuscated.trim()) throw new Error(`${label}: obfuscator returned empty output`);
  return `${BANNER}\n${obfuscated}\n`;
}

/**
 * Fail the build — loudly — if an artifact is not actually hardened. A silently readable bundle is
 * worse than a broken build: it ships.
 */
function assertHardened(code, label, forbiddenIdentifiers) {
  const leaked = forbiddenIdentifiers.filter((identifier) => code.includes(identifier));
  if (leaked.length) throw new Error(`${label}: source identifiers survived obfuscation: ${leaked.join(', ')}`);
  if (/\/\/# sourceMappingURL/.test(code)) throw new Error(`${label}: a source map leaked into the bundle`);
}

/** three must stay external: prove the bare specifiers are still in the emitted bundle. */
function assertThreeIsExternal(code, label) {
  for (const specifier of ['three', 'three/addons/controls/OrbitControls.js', 'three/addons/environments/RoomEnvironment.js']) {
    if (!code.includes(`import('${specifier}')`) && !code.includes(`import("${specifier}")`)) {
      throw new Error(`${label}: bare '${specifier}' import is gone — the importmap can no longer resolve three`);
    }
  }
  if (/three\.module\.js|THREE\.WebGLRenderer\s*=/.test(code)) {
    throw new Error(`${label}: three.js looks bundled into the artifact — it must stay external`);
  }
}

/** Extract the single `<script type="module">…</script>` block from an HTML page. */
function extractInlineModule(html, label) {
  const OPEN = '<script type="module">';
  const openIdx = html.indexOf(OPEN);
  if (openIdx === -1) throw new Error(`${label}: <script type="module"> not found`);
  const bodyStart = openIdx + OPEN.length;
  const closeIdx = html.indexOf('</script>', bodyStart);
  if (closeIdx === -1) throw new Error(`${label}: module </script> not found`);
  return { code: html.slice(bodyStart, closeIdx), openIdx, endIdx: closeIdx + '</script>'.length };
}

/**
 * The published viewer carries a "← Proyectos" link back to the portal at "/". It lives only in the
 * built copy (the dev page is opened standalone, where a link to "/" goes nowhere), so the build
 * re-injects it. Idempotent: a source that already has the link is left alone.
 */
function injectPortalLink(html) {
  if (html.includes('id="volver-portal"')) return html;
  const anchor = '          <a id="cartelera-link"';
  if (!html.includes(anchor)) throw new Error('index.html: cartelera-link anchor not found — cannot place the portal link');
  return html.replace(anchor, `          <a class="portal-link" id="volver-portal" href="/">← Proyectos</a>\n${anchor}`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * Cloudflare Pages `_headers` — permanent cache policy for the whole publish/ tree.
 *
 * Syntax (verified against developers.cloudflare.com/pages/configuration/headers):
 *   - a bare path line, then indented `Name: value` header lines;
 *   - at most ONE `*` splat per URL pattern; the splat matches greedily, INCLUDING `/`;
 *   - when several rules match one request their headers COMBINE (values comma-joined), they do
 *     NOT override — so every pattern below is disjoint to avoid contradictory Cache-Control.
 *
 * Policy:
 *   - HTML (root, any .html, project directory roots) -> no-cache: always revalidated, never stale.
 *   - content-hashed bundles/styles (one splat = the hash) -> immutable for a year.
 *   - unhashed assets (logos, favicons) -> short revalidate.
 *   - the per-project protection.js -> content-hashed + immutable, exactly like the bundles: the
 *     filename carries the hash, so a changed guard ships under a new URL that no cache can pin.
 *   - the fixed-name portal-root protection.js (portal shell) -> no-cache: revalidated every load,
 *     so a changed guard ships on the next navigation without a hard refresh.
 *
 * The immutable block is enumerated per project + asset family because the single-splat rule forbids
 * a two-splat "project + hash" shape in one pattern. Add a line here when a new hashed asset or
 * project ships.
 */
const HEADERS = `# Generated by build-publish.mjs — do not edit by hand. Cloudflare Pages cache policy.

# NOTE on /assets/ (portal thumbnails): they are NOT content-hashed, and Pages serves them with its
# own max-age=14400. Cache-Control rules for them here do NOT take effect on the custom domain —
# both /assets/* and /assets/*.png were tried and the origin kept answering 14400, while the
# hashed-bundle rules below DO apply. So: when a thumbnail's CONTENT changes, RENAME the file (e.g.
# rescom-thumb.png -> rescom-folder.png) and update the portal, or the old tile is served for hours.

# HTML: always revalidate so a deploy is picked up immediately.
/
  Cache-Control: no-cache
/*.html
  Cache-Control: no-cache
/p/*/
  Cache-Control: no-cache

# Content-hashed bundles & styles: the filename IS the cache key, so cache forever.
/p/cinemex/main.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/cinemex/dashboard.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/cinemex/styles.*.css
  Cache-Control: public, max-age=31536000, immutable
/p/dhl/main.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/dhl/styles.*.css
  Cache-Control: public, max-age=31536000, immutable
/p/hotspot/main.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/hotspot/rack-detail.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/gobernador/main.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/gobernador/sim.*.js
  Cache-Control: public, max-age=31536000, immutable
# Client folders: Vite emits content-hashed bundles under assets/ (see dashboards/build-publish.mjs).
/p/rescom/*/assets/*
  Cache-Control: public, max-age=31536000, immutable
/p/rotzinger/*/assets/*
  Cache-Control: public, max-age=31536000, immutable
/p/cinemex/protection.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/dhl/protection.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/hotspot/protection.*.js
  Cache-Control: public, max-age=31536000, immutable
/p/gobernador/protection.*.js
  Cache-Control: public, max-age=31536000, immutable

# Unhashed assets (logos, favicons): short revalidate — they rarely change.
/assets/*
  Cache-Control: public, max-age=3600, must-revalidate
/p/cinemex/assets/*
  Cache-Control: public, max-age=3600, must-revalidate

# Portal-root shell protection.js (no filename hash): no-cache so every deploy is revalidated and
# picked up on the next load. The per-project guards are now content-hashed + immutable (in the
# block above); only this fixed-name portal shell stays no-cache.
/protection.js
  Cache-Control: no-cache
`;

// ---- build ------------------------------------------------------------------
// Idempotent by construction: the project dir is rebuilt from scratch every run. Scoped to
// p/cinemex so the sibling portal (publish/index.html) and publish/assets/ are never at risk.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// hashMap accumulates { '<source name>': '<hashed name>' } for every mutable emitted asset so the
// HTML rewrite (below) can repoint each reference to its content-hashed twin. Permanent cache
// busting: a byte change flips the hash -> the filename -> the URL, so no stale bundle can be
// served after a deploy, while the hashed files cache immutably (publish/_headers).
const hashMap = {};

// 1. styles.css — verbatim bytes; CSS carries no logic worth hiding, but it IS mutable, so it is
//    content-hashed like the bundles.
const stylesBytes = readFileSync(join(ROOT, 'styles.css'));
hashMap['styles.css'] = hashedName('styles', 'css', contentHash(stylesBytes));
writeFileSync(join(OUT, hashMap['styles.css']), stylesBytes);

// 1b. assets/ — brand logo + favicons, copied verbatim. index.html and dashboard.html reference
//     ./assets/* (the real Cinemex logo chip and the favicon set); static files carry no logic to
//     obfuscate, but they MUST ship or the pages 404 their branding.
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });

// 2. main.js — the whole ./src/** graph collapsed into one obfuscated bundle.
const mainSource = readFileSync(join(ROOT, 'main.js'), 'utf8');
const mainBundle = bundle(mainSource, 'main.js');
const mainOut = obfuscate(mainBundle, 'main.js');
assertHardened(mainOut, 'main.js', [
  'createArchitectureStructure', 'createMaterialRegistry', 'createSceneRuntime',
  'TEMPERATURE_CHIP', 'resolveFixedChipWidth', 'startApplication', './src/',
]);
assertThreeIsExternal(mainOut, 'main.js');
hashMap['main.js'] = hashedName('main', 'js', contentHash(mainOut));
writeFileSync(join(OUT, hashMap['main.js']), mainOut);

// 2b. protection.js — watermark + client-requested friction. Bundled/obfuscated like the rest and
//     injected into every shipped page. See protection.js's own header for what it does and does
//     NOT buy: only the watermark is a real deterrent; the rest is friction shipped by request.
const protectionOut = obfuscate(
  bundle(readFileSync(join(ROOT, 'protection.js'), 'utf8'), 'protection.js'),
  'protection.js',
);
// Content-hash the per-project guard so it cache-busts like the bundles. Set BEFORE the pages are
// written so rewriteRefs repoints each injected `./protection.js` tag at its hashed twin. This
// makes it immune to the angeles-group.org zone's Browser Cache TTL, which rewrites the origin's
// no-cache header on the custom domain and would otherwise pin a fixed-name guard in browser cache.
// The hand-staged portal shells below keep the FIXED name (their HTML is not rewritten by this build).
hashMap['protection.js'] = hashedName('protection', 'js', contentHash(protectionOut));
writeFileSync(join(OUT, hashMap['protection.js']), protectionOut);
// The portal shell pages (publish/index.html, portal/index.html) load their own copy of the
// guard. They are hand-staged, not built here — but their protection.js MUST be this build's
// bytes, or a guard fix ships to the viewer and leaves the portal carrying the old bug.
for (const shellDir of ['publish', 'portal']) {
  const shellCopy = join(ROOT, shellDir, 'protection.js');
  if (existsSync(shellCopy)) writeFileSync(shellCopy, protectionOut);
}
const PROTECTION_TAG = '<script src="./protection.js"></script>';

/** Inject the protection tag right before </body>; idempotent. */
function injectProtection(html) {
  if (html.includes('./protection.js')) return html;
  return html.replace('</body>', `  ${PROTECTION_TAG}\n</body>`);
}

// 3. index.html — importmap + fatal-error bootstrap kept verbatim; only the portal link is added.
//    The bootstrap's `import('./main.js').catch(...)` is what wires the fatal panel, so main.js is
//    deliberately NOT converted to a <script src> tag: that would silently drop the error handler.
//    rewriteRefs repoints `import('./main.js')` and `href="./styles.css"` at their hashed twins
//    (and strips any stale `?v=` query); the three importmap and ./assets/* refs stay untouched.
writeFileSync(
  join(OUT, 'index.html'),
  rewriteRefs(injectProtection(injectPortalLink(readFileSync(join(ROOT, 'index.html'), 'utf8'))), hashMap),
);

// 4. dashboard.html — the inline module moves out to an obfuscated dashboard.js. The code is
//    identical, only its address changes; every DOM id it touches still resolves the same way.
const dashboardHtml = readFileSync(join(ROOT, 'dashboard.html'), 'utf8');
const inline = extractInlineModule(dashboardHtml, 'dashboard.html');
const dashboardBundle = bundle(inline.code, 'dashboard.js');
const dashboardOut = obfuscate(dashboardBundle, 'dashboard.js');
assertHardened(dashboardOut, 'dashboard.js', [
  'createDashboardModel', 'createUnitSeries', 'parseDashboardQuery', 'boardHtml', 'unitViewHtml',
  'chartHoverModel', './src/dashboard/',
]);
hashMap['dashboard.js'] = hashedName('dashboard', 'js', contentHash(dashboardOut));
writeFileSync(join(OUT, hashMap['dashboard.js']), dashboardOut);
writeFileSync(
  join(OUT, 'dashboard.html'),
  rewriteRefs(
    injectProtection(
      dashboardHtml.slice(0, inline.openIdx) +
        '<script type="module" src="./dashboard.js"></script>' +
        dashboardHtml.slice(inline.endIdx),
    ),
    hashMap,
  ),
);

// 4b. publish/_headers — Cloudflare Pages cache policy pinned at the publish ROOT (which this build
//     owns alongside the hand-staged hub index.html + protection.js). Regenerated deterministically
//     every run so it survives rebuilds. It also governs the sibling p/dhl/ tree (built separately).
//
//     Cloudflare _headers rules: at most ONE `*` splat per pattern (it matches greedily across `/`),
//     and when multiple rules match one path their headers COMBINE (comma-joined) rather than
//     override — so the patterns below are deliberately DISJOINT. HTML is never cached stale;
//     content-hashed bundles/styles/per-project protection.js cache immutably for a year; unhashed
//     logos/favicons get a short must-revalidate window and the fixed-name portal-shell
//     protection.js stays no-cache. New hashed assets or projects must be added to the immutable
//     block by hand.
writeFileSync(join(PUBLISH, '_headers'), HEADERS);

// 4b. Pages Functions: the server-side access gate. functions/ is the SOURCE (tracked); publish/ is
//     generated, so stage it on every build or the deploy would ship the projects unprotected.
cpSync(join(ROOT, 'functions'), join(PUBLISH, 'functions'), { recursive: true });

// 5. Final gate: the readable module tree must not exist in the built output.
if (existsSync(join(OUT, 'src'))) throw new Error('publish/p/cinemex/src/ exists — the readable module tree must not ship');

console.log(`built ${OUT}`);
console.log(`  ${hashMap['main.js']}       ${kb(statSync(join(ROOT, 'main.js')).size)} source (+ src/**) -> ${kb(statSync(join(OUT, hashMap['main.js'])).size)} bundled+obfuscated`);
console.log(`  ${hashMap['dashboard.js']}  ${kb(Buffer.byteLength(inline.code))} inline (+ src/dashboard/**) -> ${kb(statSync(join(OUT, hashMap['dashboard.js'])).size)} bundled+obfuscated`);
console.log(`  ${hashMap['styles.css']}, index.html, dashboard.html, assets/ emitted; src/ not published; three stays external`);
console.log(`  publish/_headers written; hashed assets cache immutably, HTML stays no-cache`);
