#!/usr/bin/env node
/**
 * build-publish.mjs — bundled + obfuscated PUBLISH build for the KALTE air-governor dashboard.
 * Single-page port of disenos/datacenter-hotspot/build-publish.mjs (same profile, same asserts,
 * same three-externalisation deviation), trimmed to ONE standalone page.
 *
 *   node disenos/gobernador-aire/build-publish.mjs  ->  ../cinemex-hvac-lorawan/publish/p/kalte/gobernador/
 *
 * The dev SOURCE (gobernador-dashboard.html) stays readable. Only publish/ ships hardened.
 *
 *   gobernador-dashboard.html  classic sim <script>    ->  p/kalte/gobernador/sim.<hash>.js   (obfuscated)
 *   gobernador-dashboard.html  inline module          ->  p/kalte/gobernador/main.<hash>.js  (bundled, obfuscated)
 *   gobernador-dashboard.html                          ->  p/kalte/gobernador/index.html      (both -> <script src>)
 *   ../cinemex-hvac-lorawan/protection.js              ->  p/kalte/gobernador/protection.<hash>.js (SOURCE reused,
 *       obfuscated FRESH for this project — never a copy of cinemex's obfuscated bytes)
 *
 * DEVIATION vs cinemex (same as hotspot/DHL, justified): the page imports three STATICALLY. esbuild
 * cannot keep a static import external inside an IIFE bundle, so the build rewrites the three imports
 * to `await import(...)` first, bundles as ESM (no import/export left behind), then wraps in ONE async
 * IIFE. With `renameGlobals: false` the obfuscator renames only function-local declarations — inside
 * the IIFE everything is local, so obfuscation is effective.
 *
 * The dynamic `<script>…importmap via String.fromCharCode…</script>` bootstrap that resolves three is
 * a CLASSIC script preceding the module; it is copied through VERBATIM and must never be rewritten.
 *
 * SCOPE: this script owns publish/p/kalte/gobernador/ ONLY. The portal (publish/index.html), publish/_headers
 * and the sibling p/* trees belong to their own builders. The gobernador cache rules live in the
 * cinemex build's HEADERS generator (it owns publish/_headers).
 *
 * RULE: never edit publish/ by hand. It is generated. Edit the source, rebuild.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, hashedName, rewriteRefs } from './publish-hash.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DESIGNS = dirname(ROOT);                                   // disenos/
const CINEMEX = join(DESIGNS, 'cinemex-hvac-lorawan');
const OUT = join(CINEMEX, 'publish', 'p', 'kalte', 'gobernador');

// Access is enforced SERVER-SIDE by cinemex-hvac-lorawan/functions/_middleware.js (a Cloudflare
// Pages Function): without a signed cookie the login page is served instead of this project,
// for the HTML and every asset. Nothing gate-related is baked into the build anymore.
//
// This dashboard is KALTE's, so it ships INSIDE that client's folder rather than as a project of
// its own. The middleware matches the FIRST segment under /p/, which means KEY_KALTE guards this
// too — one key opens the client's whole folder, and there is no KEY_GOBERNADOR any more.
// dashboards/build-publish.mjs cards it on the KALTE folder page and preserves this directory when
// it rebuilds the folder, so the two scripts can run in either order.

const OWNER = 'Cristian Angeles';
const YEAR = '2026';
const BANNER = `/* (c) ${YEAR} ${OWNER}. All rights reserved. Proprietary build — do not redistribute. */`;

/** three stays external + CDN-resolved via the page importmap, exactly as in cinemex/dhl/hotspot. */
const THREE_EXTERNALS = ['three', 'three/*'];

/** Obfuscation profile — identical to cinemex/dhl/hotspot. See the cinemex build header for rationale. */
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

/** Bundle module code into ESM, then wrap in one async IIFE (see header for why ESM-then-wrap). */
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

/**
 * Extract the classic simulation `<script>` — the dashboard logic (control loop, sequencing, ROI
 * formulas, compressor catalogue). Anchored on its section-marker comment so it is never confused
 * with the earlier importmap-bootstrap `<script>` or the later `<script type="module">` viewer.
 */
function extractSimScript(html, label) {
  const MARK = 'SIMULACIÓN + TABLERO';
  const markIdx = html.indexOf(MARK);
  if (markIdx === -1) throw new Error(`${label}: sim section marker (${MARK}) not found`);
  const OPEN = '<script>';                       // attribute-less tag: never matches <script type="module">
  const openIdx = html.indexOf(OPEN, markIdx);
  if (openIdx === -1) throw new Error(`${label}: classic sim <script> not found after marker`);
  const bodyStart = openIdx + OPEN.length;
  const closeIdx = html.indexOf('</script>', bodyStart);
  if (closeIdx === -1) throw new Error(`${label}: sim </script> not found`);
  return { code: html.slice(bodyStart, closeIdx), openIdx, endIdx: closeIdx + '</script>'.length };
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

const PROTECTION_TAG = '<script src="./protection.js"></script>';
// The content-hashed protection.js filename, computed before the page is built so rewriteRefs can
// repoint the injected guard tag at its hashed twin.
let PROTECTION_HASHED;
function injectProtection(html) {
  if (html.includes('./protection.js')) return html;
  return html.replace('</body>', `  ${PROTECTION_TAG}\n</body>`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

/** Rewrite the three static imports to dynamic `await import(...)` (the ESM-then-wrap contract). */
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
 * Brand files the page references. The SOURCE of truth is the client's folder under dashboards/ —
 * copying them into this project would fork the logo and let the two drift apart. The page points
 * at them with a repo-relative path so it also renders correctly when opened straight from disk;
 * this build stages them next to the page and repoints the URLs.
 *
 * Each rewrite asserts its hit count: a silent miss ships a dashboard with a broken logo, which is
 * exactly the kind of thing nobody notices until a client opens it.
 */
const BRAND_SRC = join(dirname(DESIGNS), 'dashboards', 'brands', 'kalte');
const BRAND_FILES = [
  { from: 'logo-inverse.png', to: 'brand-logo-inverse.png' },
  { from: 'mark.png', to: 'brand-mark.png' },
];

function stageBrand(html) {
  let out = html;
  for (const { from, to } of BRAND_FILES) {
    const src = join(BRAND_SRC, from);
    if (!existsSync(src)) throw new Error(`brand file missing: ${src}`);
    copyFileSync(src, join(OUT, to));

    const ref = `../../dashboards/brands/kalte/${from}`;
    const hits = out.split(ref).length - 1;
    if (hits !== 1) throw new Error(`brand rewrite: expected 1x ${JSON.stringify(ref)}, found ${hits}`);
    out = out.split(ref).join(to);
  }
  return out;
}

/**
 * Build one page: harden BOTH inline scripts — the classic simulation `<script>` into
 * `sim.<hash>.js` and the 3D viewer module into `<base>.<hash>.js` — swap each for a hashed
 * `<script src>`, inject protection, wrap the gate outermost. The sim stays a CLASSIC external
 * script so it still executes (and sets `window.GOB`) before the deferred viewer module. Returns
 * the hashed names + source sizes for the report.
 */
function buildPage({ source, htmlOut, base, forbidden, simForbidden }) {
  const sourceHtml = readFileSync(join(ROOT, source), 'utf8');
  const sim = extractSimScript(sourceHtml, source);
  const inline = extractInlineModule(sourceHtml, source);
  if (sim.openIdx > inline.openIdx) throw new Error(`${source}: the sim <script> must precede the module <script>`);

  // 1. classic simulation script — no imports, so harden it like protection.js (esbuild iife + obfuscate).
  const simBundle = obfuscate(
    esbuild(sim.code, ['--bundle', '--format=iife', '--platform=browser', '--loader=js',
      '--drop:debugger', '--minify-syntax'], `${base}-sim`),
    `${base}-sim`);
  assertHardened(simBundle, `${base}-sim`, simForbidden);

  // 2. 3D viewer module — three stays external (ESM-then-wrap, see header).
  const bundle = obfuscate(bundleAsAsyncIife(dynamizeThreeImports(inline.code, base), base), base);
  assertHardened(bundle, base, forbidden);
  assertThreeIsExternal(bundle, base);

  const hashMap = {};
  hashMap['sim.js'] = hashedName('sim', 'js', contentHash(simBundle));
  hashMap[`${base}.js`] = hashedName(base, 'js', contentHash(bundle));
  hashMap['protection.js'] = PROTECTION_HASHED;
  writeFileSync(join(OUT, hashMap['sim.js']), simBundle);
  writeFileSync(join(OUT, hashMap[`${base}.js`]), bundle);

  // Splice BOTH inline scripts out (sim precedes module). Unhashed `./sim.js` / `./main.js` refs are
  // repointed at their hashed twins by rewriteRefs below.
  let html = sourceHtml.slice(0, sim.openIdx) +
    '<script src="./sim.js"></script>' +
    sourceHtml.slice(sim.endIdx, inline.openIdx) +
    `<script type="module" src="./${base}.js"></script>` +
    sourceHtml.slice(inline.endIdx);
  html = stageBrand(rewriteRefs(injectProtection(html), hashMap));
  writeFileSync(join(OUT, htmlOut), html);

  return { hashed: hashMap[`${base}.js`], sim: hashMap['sim.js'],
           inlineBytes: Buffer.byteLength(inline.code), simBytes: Buffer.byteLength(sim.code) };
}

// ---- build ----------------------------------------------------------------------------------
// Idempotent by construction: p/kalte/gobernador is rebuilt from scratch every run. Scoped so the sibling
// p/* trees, the portal shell and publish/assets/ are never at risk.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. protection.js — REUSED from the cinemex SOURCE and hardened fresh for this project. Generated
//    FIRST so its content-hashed filename is known when the page below is rewritten.
const protectionOut = obfuscate(
  esbuild(readFileSync(join(CINEMEX, 'protection.js'), 'utf8'), [
    '--bundle', '--format=iife', '--platform=browser', '--loader=js',
    '--drop:debugger', '--minify-syntax',
  ], 'protection.js'),
  'protection.js',
);
PROTECTION_HASHED = hashedName('protection', 'js', contentHash(protectionOut));
writeFileSync(join(OUT, PROTECTION_HASHED), protectionOut);

// 2. index.html — the KALTE air-governor dashboard (single page). forbidden identifiers are
//    distinctive source function names — their survival would prove the module was not obfuscated.
const dashboard = buildPage({
  source: 'gobernador-dashboard.html',
  htmlOut: 'index.html',
  base: 'main',
  // Distinctive LOCAL-only function names — their survival would prove the module was not obfuscated.
  // (stateKey is deliberately excluded: it is also exposed as a window.GOB property, which the
  // obfuscator does not rename, so it would be a false positive.)
  forbidden: [
    'compKw', 'fixedSupply', 'stageUp', 'stageDown', 'maybeFault', 'drainStep',
    'bandCheck', 'drawKpiSpark', 'drawSparkW', 'renderDrawer', 'buildUnitTemplate', 'instanceRow',
    'updateTags', 'applyState',
  ],
  // Distinctive LOCAL-only names in the CLASSIC sim script. Excludes anything exposed on window.GOB
  // (stateKey, openDrawer) — the obfuscator keeps property keys, so those would false-positive.
  simForbidden: [
    'stageUp', 'stageDown', 'maybeFault', 'drainStep', 'bandCheck', 'pushHistSample', 'warmUp',
    'fixedSupply', 'buildUnitTemplate', 'instanceRow', 'drawKpiSpark', 'renderDrawer',
  ],
});

// 3. Final gate: no readable module tree must ship (there is none in source, but assert anyway).
if (existsSync(join(OUT, 'src'))) throw new Error('publish/p/kalte/gobernador/src/ exists — the readable module tree must not ship');

console.log(`built ${OUT}`);
console.log(`  ${dashboard.sim}  ${kb(dashboard.simBytes)} inline -> ${kb(statSync(join(OUT, dashboard.sim)).size)} obfuscated (dashboard sim)`);
console.log(`  ${dashboard.hashed}  ${kb(dashboard.inlineBytes)} inline -> ${kb(statSync(join(OUT, dashboard.hashed)).size)} bundled+obfuscated (3D viewer)`);
console.log(`  index.html, ${PROTECTION_HASHED} emitted; three stays external`);
