#!/usr/bin/env node
/**
 * build-publish.mjs — bundled + obfuscated PUBLISH build for the datacenter Hotspot viewer.
 * Ported from disenos/datacenter-dhl/build-publish.mjs (same profile, same asserts), adapted to
 * this design's shape: TWO standalone pages, both with static three imports and an inline module,
 * no src/** tree, no external styles.css (CSS is inline), no equipment detail-view fan-out.
 *
 *   node disenos/datacenter-hotspot/build-publish.mjs  ->  ../cinemex-hvac-lorawan/publish/p/hotspot/
 *
 * The dev SOURCE (dc-dashboard-v1.html, rack-detail.html) stays readable. Only publish/ ships hardened.
 *
 *   dc-dashboard-v1.html  inline module  ->  p/hotspot/main.<hash>.js         (bundled, obfuscated)
 *   dc-dashboard-v1.html                 ->  p/hotspot/index.html             (module -> <script src>)
 *   rack-detail.html      inline module  ->  p/hotspot/rack-detail.<hash>.js  (bundled, obfuscated)
 *   rack-detail.html                     ->  p/hotspot/rack-detail.html       (module -> <script src>)
 *   ../cinemex-hvac-lorawan/protection.js -> p/hotspot/protection.<hash>.js (SOURCE reused,
 *       obfuscated FRESH for this project — never a copy of cinemex's obfuscated bytes; the guard
 *       filename is content-hashed so it cache-busts like the bundles)
 *
 * DEVIATION vs cinemex (same as DHL, justified): both pages import three STATICALLY
 * (`import * as THREE from 'three'`). esbuild cannot keep a static import external inside an IIFE
 * bundle (it emits a __require shim that throws in the browser), so the build rewrites the three
 * imports to `await import(...)` first, bundles as ESM (which leaves NO import/export statements
 * behind), and then wraps the bundle in ONE async IIFE. The wrapper is what makes obfuscation
 * effective: with `renameGlobals: false` the obfuscator treats top-level declarations as globals,
 * so only function-local declarations get renamed — inside the IIFE, everything is a local.
 *
 * The dynamic `<script>…importmap via String.fromCharCode…</script>` bootstrap that resolves three
 * (it dodges Cloudflare's mangling of `three@0.160.0`) is a CLASSIC script that precedes the module
 * on each page; it is copied through VERBATIM and must never be removed or rewritten.
 *
 * ROUTES (output-only): the emitted rack-detail's back-links point at `dc-dashboard-v1.html`, which
 * ships as `index.html`, so those hrefs are rewritten `dc-dashboard-v1.html` -> `index.html` in the
 * built copy ONLY (exactly 2 of them, asserted). The dashboard's `rack-detail.html?rack=` target
 * keeps its filename (rack-detail.html ships under the same name). The source tree is never touched.
 *
 * SCOPE: this script owns publish/p/hotspot/ ONLY. The portal (publish/index.html), publish/_headers
 * and the sibling p/cinemex + p/dhl trees belong to their own builders. The hotspot cache rules live
 * in the cinemex build's HEADERS generator (it owns publish/_headers).
 *
 * RULE: never edit publish/ by hand. It is generated. Edit the source, rebuild.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, hashedName, rewriteRefs } from './publish-hash.mjs';
import { injectGate, loadGateConfig } from './gate.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DESIGNS = dirname(ROOT);                                   // disenos/
const CINEMEX = join(DESIGNS, 'cinemex-hvac-lorawan');
const OUT = join(CINEMEX, 'publish', 'p', 'hotspot');

// Per-project shared-key access gate (see gate.mjs). gate-keys.json is owned by the cinemex dir
// (read cross-root, exactly like protection.js above); keygen.mjs generates/rotates it. Injected
// into both pages so a direct link opens the passcode overlay before the viewer boots.
const GATE = loadGateConfig(join(CINEMEX, 'gate-keys.json'), 'hotspot');

const OWNER = 'Cristian Angeles';
const YEAR = '2026';
const BANNER = `/* (c) ${YEAR} ${OWNER}. All rights reserved. Proprietary build — do not redistribute. */`;

/** three stays external + CDN-resolved via the page importmap, exactly as in cinemex/dhl. */
const THREE_EXTERNALS = ['three', 'three/*'];

/**
 * Obfuscation profile — identical to cinemex/dhl (string-array + base64, hex identifiers;
 * controlFlowFlattening / deadCodeInjection / debugProtection / selfDefending OFF for the stated
 * performance constraint). See the cinemex build header for the full rationale.
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
  // Keep the three.js import specifiers literal so the importmap contract stays provable by
  // inspection (same deviation, same justification as the cinemex/dhl builds).
  reservedStrings: ['^three(/|$)'],
  // PERFORMANCE — deliberately OFF. Do not enable without a new client OK.
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
};

function esbuild(code, args, label) {
  try {
    return execFileSync('npx', ['--yes', 'esbuild', ...args], {
      input: code, cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`${label}: esbuild failed\n${error.stderr || error.message}`);
  }
}

/**
 * Bundle module code (stdin, resolved against ROOT) into ESM, then wrap in one async IIFE. See the
 * header for why ESM-then-wrap instead of a direct IIFE: the wrap is only legal because the ESM
 * output carries no import/export statements once the three imports are dynamic — asserted below.
 */
function bundleAsAsyncIife(code, label) {
  const bundled = esbuild(code, [
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--loader=js',
    '--drop:console',
    '--drop:debugger',
    '--minify-syntax',
    ...THREE_EXTERNALS.map((specifier) => `--external:${specifier}`),
  ], label);
  if (/^\s*(import\s|import["'{*]|export[\s{])/m.test(bundled)) {
    throw new Error(`${label}: static import/export survived into the ESM bundle — the async IIFE wrap would break it`);
  }
  return `(async () => {\n${bundled}\n})();\n`;
}

function obfuscate(code, label) {
  const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS).getObfuscatedCode();
  if (!obfuscated.trim()) throw new Error(`${label}: obfuscator returned empty output`);
  return `${BANNER}\n${obfuscated}\n`;
}

/** Fail loudly if an artifact is not actually hardened. A readable bundle is worse than a broken build. */
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

/** Replace an exact substring, asserting it occurs exactly once — a silent 0 or 2 is a build lie. */
function replaceOnce(code, from, to, label) {
  const first = code.indexOf(from);
  if (first === -1) throw new Error(`${label}: expected exactly one occurrence of ${JSON.stringify(from)}, found none`);
  if (code.indexOf(from, first + from.length) !== -1) throw new Error(`${label}: ${JSON.stringify(from)} occurs more than once`);
  return code.slice(0, first) + to + code.slice(first + from.length);
}

/** Replace EVERY occurrence of an exact substring, asserting the count is exactly `expected`. */
function replaceAllCounted(code, from, to, expected, label) {
  const parts = code.split(from);
  const found = parts.length - 1;
  if (found !== expected) {
    throw new Error(`${label}: expected exactly ${expected} occurrence(s) of ${JSON.stringify(from)}, found ${found}`);
  }
  return parts.join(to);
}

const PROTECTION_TAG = '<script src="./protection.js"></script>';
// The content-hashed protection.js filename, computed once in the build section BEFORE any page is
// built so buildPage's rewriteRefs can repoint each injected guard tag at its hashed twin.
let PROTECTION_HASHED;
function injectProtection(html) {
  if (html.includes('./protection.js')) return html;
  return html.replace('</body>', `  ${PROTECTION_TAG}\n</body>`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * Rewrite the three static imports to dynamic `await import(...)`. Shared by both pages: they carry
 * byte-identical import lines. Returns the module code with dynamic three imports (the ESM-then-wrap
 * contract; see header).
 */
function dynamizeThreeImports(moduleCode, label) {
  let out = replaceOnce(moduleCode,
    "import * as THREE from 'three';",
    "const THREE = await import('three');", label);
  out = replaceOnce(out,
    "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    "const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');", label);
  out = replaceOnce(out,
    "import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';",
    "const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');", label);
  return out;
}

/**
 * Build one page: extract its inline module, harden it into `<base>.<hash>.js`, and emit the HTML
 * with the module swapped for a `<script src>` (repointed at the hashed twin), protection injected,
 * and any output-only route rewrites applied. Returns the hashed bundle name for the report.
 */
function buildPage({ source, htmlOut, base, forbidden, rewriteHtml }) {
  const sourceHtml = readFileSync(join(ROOT, source), 'utf8');
  const inline = extractInlineModule(sourceHtml, source);

  const bundle = obfuscate(bundleAsAsyncIife(dynamizeThreeImports(inline.code, base), base), base);
  assertHardened(bundle, base, forbidden);
  assertThreeIsExternal(bundle, base);

  const hashMap = {};
  hashMap[`${base}.js`] = hashedName(base, 'js', contentHash(bundle));
  writeFileSync(join(OUT, hashMap[`${base}.js`]), bundle);
  // Repoint the injected `./protection.js` guard tag at its content-hashed twin. PROTECTION_HASHED
  // is computed before any page is built (see the build section), so it is always known here.
  hashMap['protection.js'] = PROTECTION_HASHED;

  let html = sourceHtml.slice(0, inline.openIdx) +
    `<script type="module" src="./${base}.js"></script>` +
    sourceHtml.slice(inline.endIdx);
  if (rewriteHtml) html = rewriteHtml(html);
  html = injectGate(rewriteRefs(injectProtection(html), hashMap), GATE, htmlOut);
  writeFileSync(join(OUT, htmlOut), html);

  return { hashed: hashMap[`${base}.js`], inlineBytes: Buffer.byteLength(inline.code) };
}

// ---- build ----------------------------------------------------------------------------------
// Idempotent by construction: p/hotspot is rebuilt from scratch every run. Scoped so the sibling
// p/cinemex, p/dhl, the portal shell and publish/assets/ are never at risk.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. protection.js — REUSED from the cinemex SOURCE and hardened fresh for this project: same
//    watermark/friction contract, independent obfuscation pass (never cinemex's obfuscated bytes).
//    Generated FIRST so its content-hashed filename is known when the pages below are rewritten:
//    rewriteRefs then repoints each injected `./protection.js` at `./protection.<hash>.js`. This is
//    immune to the angeles-group.org zone's Browser Cache TTL, which rewrites the origin no-cache
//    header on the custom domain and would otherwise pin a fixed-name guard in the browser cache.
//    The immutable rule for /p/hotspot/protection.*.js lives in the cinemex build's HEADERS generator.
const protectionOut = obfuscate(
  esbuild(readFileSync(join(CINEMEX, 'protection.js'), 'utf8'), [
    '--bundle', '--format=iife', '--platform=browser', '--loader=js',
    '--drop:debugger', '--minify-syntax',
  ], 'protection.js'),
  'protection.js',
);
PROTECTION_HASHED = hashedName('protection', 'js', contentHash(protectionOut));
writeFileSync(join(OUT, PROTECTION_HASHED), protectionOut);

// 2. index.html — the room dashboard. Its `rack-detail.html?rack=` target keeps its filename, so no
//    route rewrite is needed here. `rack-detail.html` in the forbidden list also proves strings are
//    string-array-encoded (only the three specifiers are reserved).
const dashboard = buildPage({
  source: 'dc-dashboard-v1.html',
  htmlOut: 'index.html',
  base: 'main',
  forbidden: [
    'makeLabel', 'rackCanvasTex', 'serverFrontTex', 'buildRack', 'buildBackRack', 'buildRacks',
    'buildRoom', 'flowTexture', 'makeRibbon', 'buildFlows', 'heatColor', 'drawHeat', 'pickRack',
    'drawSchem', 'updatePanels', 'drawCharts', 'rack-detail.html',
  ],
});

// 3. rack-detail.html — per-rack detail view. Its two back-links point at the dashboard, which ships
//    as index.html, so rewrite `href="dc-dashboard-v1.html"` -> `href="index.html"` in the OUTPUT
//    only (exactly 2, asserted). The source keeps its dc-dashboard-v1.html routes.
const rackDetail = buildPage({
  source: 'rack-detail.html',
  htmlOut: 'rack-detail.html',
  base: 'rack-detail',
  forbidden: [
    'canvasTex', 'switchFrontTex', 'serverFrontTex', 'makeFan', 'addLed', 'drawTrends', 'drawSchem',
    'simTick', 'rackGroup', 'doorGroup', 'srvLeds', 'fanGroups',
  ],
  rewriteHtml: (html) => replaceAllCounted(
    html, 'href="dc-dashboard-v1.html"', 'href="index.html"', 2, 'rack-detail.html routes'),
});

// 4. Final gate: no readable module tree must ship (there is none in source, but assert anyway).
if (existsSync(join(OUT, 'src'))) throw new Error('publish/p/hotspot/src/ exists — the readable module tree must not ship');

console.log(`built ${OUT}`);
console.log(`  ${dashboard.hashed}  ${kb(dashboard.inlineBytes)} inline -> ${kb(statSync(join(OUT, dashboard.hashed)).size)} bundled+obfuscated`);
console.log(`  ${rackDetail.hashed}  ${kb(rackDetail.inlineBytes)} inline -> ${kb(statSync(join(OUT, rackDetail.hashed)).size)} bundled+obfuscated`);
console.log(`  index.html, rack-detail.html, ${PROTECTION_HASHED} emitted; three stays external; back-links -> index.html`);
