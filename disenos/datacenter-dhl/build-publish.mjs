#!/usr/bin/env node
/**
 * build-publish.mjs — bundled + obfuscated PUBLISH build for the DHL datacenter viewer.
 * Ported from disenos/cinemex-hvac-lorawan/build-publish.mjs (same profile, same asserts,
 * adapted to this page's shape: static three imports, an inline-module index and the six
 * equipment detail views that live OUTSIDE this design dir).
 *
 *   node disenos/datacenter-dhl/build-publish.mjs   ->  ../cinemex-hvac-lorawan/publish/p/dhl/
 *
 * The dev SOURCE (index.html, src/**) stays readable and is the only thing the test suite
 * (`node --test tests/*.test.mjs`) ever sees. Only publish/ ships hardened.
 *
 *   index.html inline module + src/**  ->  p/dhl/main.js     (one bundle, obfuscated)
 *   index.html                         ->  p/dhl/index.html  (module extracted to <script src>)
 *   styles.css                         ->  p/dhl/styles.css  (verbatim)
 *   ../cinemex-hvac-lorawan/protection.js -> p/dhl/protection.<hash>.js (SOURCE reused, bundled +
 *       obfuscated FRESH for this project — never a copy of cinemex's obfuscated bytes; the guard
 *       filename is content-hashed so it cache-busts like the bundle)
 *   ../<kind>/<detail>.html + its nested realistic model -> p/dhl/equipos/<kind>/…
 *       (minified, NOT obfuscated — see the DETAIL VIEWS note below)
 *
 * DEVIATION vs cinemex (justified): this page imports three STATICALLY
 * (`import * as THREE from 'three'`). esbuild cannot keep a static import external inside an
 * IIFE bundle (it emits a __require shim that throws in the browser — verified), so the build
 * rewrites the three imports to `await import(...)` first, bundles as ESM (which inlines the
 * whole ./src/** graph and leaves NO import/export statements behind), and then wraps the
 * bundle in ONE async IIFE. The wrapper is what makes obfuscation effective: the obfuscator
 * runs with `renameGlobals: false` and treats top-level declarations as globals, so only
 * function-local declarations get renamed — inside the IIFE, everything is a local.
 *
 * DETAIL VIEWS: the room's click-through routes point at ../<kind>/<kind>-detail-v1.html,
 * siblings of this design dir, each nesting exactly one <iframe> to a realistic model in the
 * same dir (dependency tree mapped by reading the iframes, and re-read at build time — the
 * model filename is discovered, not assumed). They ship under p/dhl/equipos/<kind>/ with the
 * routes rewritten ONLY in the emitted bundle; the source tree keeps its ../ routes. They are
 * MINIFIED (whitespace + syntax), NOT obfuscated: they are self-contained display fragments
 * with demo data — the IP worth hiding (sim model, scene composition, workbench) lives in
 * main.js. Identifier renaming is also deliberately OFF for them: they mix classic and module
 * scripts in one page and renaming buys nothing on a fragment while risking the cross-script
 * contract. protection.js is NOT injected into them: they only render inside the already
 * protected top page's overlay iframe.
 *
 * SCOPE: this script owns publish/p/dhl/ ONLY. The portal (publish/index.html), its assets
 * and the portal shells' protection.js copies belong to the portal/cinemex build.
 *
 * RULE: never edit publish/ by hand. It is generated. Edit the source, rebuild.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, hashedName, rewriteRefs } from './publish-hash.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DESIGNS = dirname(ROOT);                                   // disenos/
const CINEMEX = join(DESIGNS, 'cinemex-hvac-lorawan');
const OUT = join(CINEMEX, 'publish', 'p', 'dhl');

// Access is enforced SERVER-SIDE by cinemex-hvac-lorawan/functions/_middleware.js (a Cloudflare
// Pages Function): without a signed cookie the login page is served instead of this project,
// for the HTML and every asset. Nothing gate-related is baked into the build anymore.

const OWNER = 'Cristian Angeles';
const YEAR = '2026';
const BANNER = `/* (c) ${YEAR} ${OWNER}. All rights reserved. Proprietary build — do not redistribute. */`;

/** three stays external + CDN-resolved via the page importmap, exactly as in cinemex. */
const THREE_EXTERNALS = ['three', 'three/*'];

/**
 * Obfuscation profile — identical to cinemex's (string-array + base64, hex identifiers;
 * controlFlowFlattening / deadCodeInjection / debugProtection / selfDefending OFF for the
 * stated performance constraint). See the cinemex build header for the full rationale.
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
  // inspection (same deviation, same justification as the cinemex build).
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
 * Bundle module code (stdin, resolved against ROOT — esbuild resolves a stdin input's relative
 * imports against the process CWD) into ESM, then wrap in one async IIFE. See the header for
 * why ESM-then-wrap instead of cinemex's direct IIFE: the wrap is only legal because the ESM
 * output carries no import/export statements once the three imports are dynamic — asserted.
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

const PROTECTION_TAG = '<script src="./protection.js"></script>';
function injectProtection(html) {
  if (html.includes('./protection.js')) return html;
  return html.replace('</body>', `  ${PROTECTION_TAG}\n</body>`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

// ---- detail-view route table --------------------------------------------------------------
// Mirrors the R table inside index.html's inline module. `detail` is the file the room opens;
// the nested realistic model each detail iframes is DISCOVERED from the detail's markup below.
const DETAIL_VIEWS = [
  { kind: 'server-rack', detail: 'rack-42u-detail-v1.html' },
  { kind: 'crac', detail: 'crac-detail-v1.html' },
  { kind: 'in-row', detail: 'inrow-detail-v1.html' },
  { kind: 'pdu', detail: 'pdu-detail-v1.html' },
  { kind: 'dry-cooler', detail: 'dry-cooler-detail-v1.html' },
  { kind: 'ups', detail: 'ups-detail-v1.html' },
];

/**
 * Minify every inline script of an HTML fragment page: whitespace + syntax only, identifiers
 * untouched (see the DETAIL VIEWS note in the header). `type="importmap"` blocks are JSON and
 * external `src=` tags carry no body — both pass through verbatim.
 */
function minifyInlineScripts(html, label) {
  let minified = 0;
  const out = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (match, attrs, body) => {
    if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']importmap["']/.test(attrs) || !body.trim()) return match;
    const code = esbuild(body, ['--loader=js', '--minify-whitespace', '--minify-syntax'], `${label} inline script`);
    minified += 1;
    return `<script${attrs}>${code.trimEnd()}</script>`;
  });
  if (minified === 0) throw new Error(`${label}: no inline script found to minify — wrong file?`);
  return out;
}

// ---- build ----------------------------------------------------------------------------------
// Idempotent by construction: p/dhl is rebuilt from scratch every run. Scoped so the sibling
// p/cinemex, the portal shell and publish/assets/ are never at risk.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// hashMap accumulates { '<source name>': '<hashed name>' } for the mutable emitted assets (main.js,
// styles.css) so the emitted index.html can be repointed at their content-hashed twins. Permanent
// cache busting: a byte change flips the hash -> the filename -> the URL, so no stale bundle is
// served after a deploy. The immutable/no-cache policy lives in publish/_headers, emitted by the
// sibling cinemex build (which owns the publish/ root and already covers /p/dhl/ paths).
const hashMap = {};

// 1. styles.css — verbatim bytes; CSS carries no logic to hide, but it IS mutable, so it is
//    content-hashed like the bundle.
const stylesBytes = readFileSync(join(ROOT, 'styles.css'));
hashMap['styles.css'] = hashedName('styles', 'css', contentHash(stylesBytes));
writeFileSync(join(OUT, hashMap['styles.css']), stylesBytes);

// 2. main.js — the inline module + ./src/** collapsed into one obfuscated bundle.
const sourceHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const inline = extractInlineModule(sourceHtml, 'index.html');
let moduleCode = inline.code;

// 2a. Static three imports -> dynamic (the ESM-then-wrap contract; see header).
moduleCode = replaceOnce(moduleCode,
  "import * as THREE from 'three';",
  "const THREE = await import('three');", 'main.js');
moduleCode = replaceOnce(moduleCode,
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  "const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');", 'main.js');
moduleCode = replaceOnce(moduleCode,
  "import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';",
  "const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');", 'main.js');

// 2b. Detail routes: ../<kind>/<file> -> ./equipos/<kind>/<file>, ONLY in the emitted bundle.
//     The source keeps its sibling-dir routes (that is how the dev page and tests run).
for (const view of DETAIL_VIEWS) {
  moduleCode = replaceOnce(moduleCode,
    `'../${view.kind}/${view.detail}'`,
    `'./equipos/${view.kind}/${view.detail}'`, 'main.js routes');
}

const mainOut = obfuscate(bundleAsAsyncIife(moduleCode, 'main.js'), 'main.js');
assertHardened(mainOut, 'main.js', [
  'createEquipmentModel', 'EQUIPMENT_INSTANCES', 'chipReadingsOf', 'createSiteAlerts',
  'createEquipmentChips', 'createDhlBanner', 'renderSectionHtml', 'LIGHTING_SCENES',
  'makeDryCooler', 'makeHeroRack', './src/', '../server-rack/', '../crac/',
]);
assertThreeIsExternal(mainOut, 'main.js');
hashMap['main.js'] = hashedName('main', 'js', contentHash(mainOut));
writeFileSync(join(OUT, hashMap['main.js']), mainOut);

// 3. protection.js — REUSED from the cinemex SOURCE and hardened fresh for this project:
//    same watermark/friction contract, independent obfuscation pass (never cinemex's bytes).
//    The portal shells' copies are owned by the cinemex build and are NOT touched here.
const protectionOut = obfuscate(
  esbuild(readFileSync(join(CINEMEX, 'protection.js'), 'utf8'), [
    '--bundle', '--format=iife', '--platform=browser', '--loader=js',
    '--drop:debugger', '--minify-syntax',
  ], 'protection.js'),
  'protection.js',
);
// Content-hash the per-project guard so it cache-busts like main.js. Set BEFORE index.html is
// written so rewriteRefs repoints the injected `./protection.js` tag at its hashed twin — immune to
// the angeles-group.org zone's Browser Cache TTL, which rewrites the origin no-cache header on the
// custom domain and would otherwise pin a fixed-name guard in the browser cache. The immutable rule
// for /p/dhl/protection.*.js lives in the cinemex build's HEADERS generator.
hashMap['protection.js'] = hashedName('protection', 'js', contentHash(protectionOut));
writeFileSync(join(OUT, hashMap['protection.js']), protectionOut);

// 4. index.html — the inline module becomes <script type="module" src="./main.js">; the
//    dynamic-importmap bootstrap and all markup stay verbatim; protection.js is injected.
//    rewriteRefs then repoints `./main.js` and `./styles.css` at their hashed twins (stripping any
//    stale `?v=` query); the dynamically-built importmap and detail routes stay untouched.
writeFileSync(
  join(OUT, 'index.html'),
  rewriteRefs(
    injectProtection(
      sourceHtml.slice(0, inline.openIdx) +
        '<script type="module" src="./main.js"></script>' +
        sourceHtml.slice(inline.endIdx),
    ),
    hashMap,
  ),
);

// 5. Detail views + their nested realistic models -> equipos/<kind>/ (minified, see header).
const detailReport = [];
for (const view of DETAIL_VIEWS) {
  const sourceDir = join(DESIGNS, view.kind);
  const outDir = join(OUT, 'equipos', view.kind);
  mkdirSync(outDir, { recursive: true });

  const detailHtml = readFileSync(join(sourceDir, view.detail), 'utf8');
  // Discover the nested model from the detail's own iframe — the honest dependency map.
  const frameMatch = detailHtml.match(/<iframe\s+src="([^"/]+\.html)"/);
  if (!frameMatch) throw new Error(`${view.detail}: nested realistic-model iframe not found`);
  const model = frameMatch[1];
  const modelHtml = readFileSync(join(sourceDir, model), 'utf8');

  writeFileSync(join(outDir, view.detail), minifyInlineScripts(detailHtml, view.detail));
  writeFileSync(join(outDir, model), minifyInlineScripts(modelHtml, model));
  detailReport.push(`  equipos/${view.kind}/  ${view.detail} + ${model}`);
}

// 6. Final gate: the readable module tree must not exist in the built output.
if (existsSync(join(OUT, 'src'))) throw new Error('publish/p/dhl/src/ exists — the readable module tree must not ship');

console.log(`built ${OUT}`);
console.log(`  ${hashMap['main.js']}  ${kb(Buffer.byteLength(inline.code))} inline (+ src/**) -> ${kb(statSync(join(OUT, hashMap['main.js'])).size)} bundled+obfuscated`);
console.log(`  index.html, ${hashMap['styles.css']}, ${hashMap['protection.js']} emitted; src/ not published; three stays external`);
for (const line of detailReport) console.log(line);
