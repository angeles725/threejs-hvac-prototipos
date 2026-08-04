#!/usr/bin/env node
/**
 * build-offline.mjs — fully self-contained build of the Datacenter hotspot dashboard.
 *
 *   node disenos/datacenter-hotspot-sinCDN/build-offline.mjs   ->  dist/
 *
 * WHY THIS EXISTS
 * ---------------
 * The shipped visor build resolves three.js from unpkg.com through a page importmap. That is one
 * request to the public internet at load time, and it is the single point where a corporate network
 * can break the dashboard: the page opens, the CDN is blocked, and the 3D scene silently never
 * renders. It also means the dashboard cannot be shown at all without connectivity.
 *
 * This build removes that dependency completely. three r160 (core + OrbitControls + RoomEnvironment)
 * is bundled INTO each page, so every output file is a single HTML document that:
 *
 *   - makes ZERO network requests — no CDN, no fonts, no analytics, nothing;
 *   - renders on a machine with no internet at all;
 *   - opens by double-click over file:// — there is no external module to fetch, and an INLINE
 *     `<script type="module">` is not subject to the cross-origin rules that block file:// imports;
 *   - is equally valid served over HTTP (any static host).
 *
 * The two pages navigate to each other by plain filename (`rack-detail.html?rack=N`), which works
 * over file:// as an ordinary link. Keep them in the same folder and both routes stay alive.
 *
 * DELIBERATE DIFFERENCE FROM THE VISOR BUILD
 * ------------------------------------------
 * Output is minified but NOT obfuscated, and protection.js is not injected. Obfuscating a bundle
 * with three.js inlined is slow and buys nothing here: this artifact is meant to be handed to a
 * client to open directly, and the gated/obfuscated copy under the visor is untouched and remains
 * the hardened distribution channel. Do not "restore" obfuscation without deciding that trade again.
 *
 * RULE: never edit dist/ by hand. It is generated. Edit the source HTML, rebuild.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'dist');

/**
 * Bare specifier -> vendored file. three's addons import 'three' internally, so the first alias
 * covers them too and esbuild dedupes the core to a single copy per bundle.
 */
const ALIASES = {
  three: './vendor/three/three.module.js',
  'three/addons/controls/OrbitControls.js': './vendor/three/addons/controls/OrbitControls.js',
  'three/addons/environments/RoomEnvironment.js': './vendor/three/addons/environments/RoomEnvironment.js',
};

/**
 * Strings that legitimately appear inside three.js as data, never as a fetch: the XHTML namespace
 * URI (required by the SVG/DOM specs) and the URL quoted in its r155 lighting-change console notice.
 * Anything else matching http(s) in the output is a real remote dependency and fails the build.
 */
const ALLOWED_URL_STRINGS = [
  'http://www.w3.org/1999/xhtml',
  'https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733',
];

function esbuild(code, args, label) {
  try {
    return execFileSync('npx', ['--yes', 'esbuild', ...args], {
      input: code, cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`${label}: esbuild failed\n${error.stderr || error.message}`);
  }
}

/** Bundle the page module with three resolved from vendor/, into one import-free ESM blob. */
function bundleSelfContained(code, label) {
  return esbuild(code, [
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--loader=js',
    '--minify',
    ...Object.entries(ALIASES).map(([from, to]) => `--alias:${from}=${to}`),
  ], label);
}

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
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first === -1) throw new Error(`${label}: expected exactly one occurrence of ${JSON.stringify(from)}, found none`);
  if (text.indexOf(from, first + from.length) !== -1) throw new Error(`${label}: ${JSON.stringify(from)} occurs more than once`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

/** Replace EVERY occurrence of an exact substring, asserting the count is exactly `expected`. */
function replaceAllCounted(text, from, to, expected, label) {
  const parts = text.split(from);
  const found = parts.length - 1;
  if (found !== expected) {
    throw new Error(`${label}: expected exactly ${expected} occurrence(s) of ${JSON.stringify(from)}, found ${found}`);
  }
  return parts.join(to);
}

/**
 * Strip the auto-update poller from the page module.
 *
 * It HEAD-polls its own URL every 20s to detect a redeployed origin. That is useful for a page
 * served from a host you keep updating; it is meaningless for a file the client opens from a USB
 * stick, and it is not harmless: its source comment claims that with no ETag ("p.ej. file://") it
 * "queda inerte y no molesta", but over file:// the fetch REJECTS and Chromium logs a console
 * error on every tick. The `.catch(()=>{})` swallows the promise, not the network error.
 *
 * Removing it also makes the zero-network claim true in the strict sense: no timer in the page is
 * even trying to reach the network.
 */
function stripAutoUpdate(code, label) {
  const OPEN = '/* ===== auto-update:';
  const start = code.indexOf(OPEN);
  if (start === -1) throw new Error(`${label}: auto-update block not found — did the source change?`);
  if (code.indexOf(OPEN, start + OPEN.length) !== -1) throw new Error(`${label}: auto-update block occurs more than once`);

  const CLOSE = '})();';
  const end = code.indexOf(CLOSE, start);
  if (end === -1) throw new Error(`${label}: auto-update block has no closing IIFE`);

  const removed = code.slice(start, end + CLOSE.length);
  if (!removed.includes('fetch(') || !removed.includes('setInterval')) {
    throw new Error(`${label}: refusing to cut — the matched block is not the auto-update poller`);
  }
  return code.slice(0, start) + code.slice(end + CLOSE.length);
}

/**
 * Drop the local importmap: once three is inlined there are no bare specifiers left to resolve, and
 * a stale map pointing at ./vendor/ would be a lie about what the file needs.
 */
function stripImportmap(html, label) {
  const OPEN = '<script type="importmap">';
  const openIdx = html.indexOf(OPEN);
  if (openIdx === -1) throw new Error(`${label}: importmap block not found — did the source change?`);
  const closeIdx = html.indexOf('</script>', openIdx);
  if (closeIdx === -1) throw new Error(`${label}: importmap </script> not found`);
  return html.slice(0, openIdx) + html.slice(closeIdx + '</script>'.length);
}

/**
 * The whole point of this build, enforced rather than hoped for: assert the emitted page cannot
 * reach the network. Checks the two ways a remote dependency could survive — an unresolved module
 * specifier, or a URL in markup/code that is not one of three's known inert data strings.
 */
function assertNoNetwork(html, label) {
  // Strip HTML comments first. Comments never issue a request, and the importmap note deliberately
  // NAMES the CDNs it forbids — without this, the build would fail on its own warning text.
  const live = html.replace(/<!--[\s\S]*?-->/g, '');

  for (const marker of ['unpkg.com', 'jsdelivr', 'cdnjs', 'esm.sh', 'skypack']) {
    if (live.includes(marker)) throw new Error(`${label}: CDN reference "${marker}" survived into the output`);
  }
  for (const attr of ['src="http', "src='http", 'href="http', "href='http"]) {
    if (live.includes(attr)) throw new Error(`${label}: output still loads a remote resource (${attr}…)`);
  }
  let residue = live;
  for (const allowed of ALLOWED_URL_STRINGS) residue = residue.split(allowed).join('');
  const leftover = residue.match(/https?:\/\/[^\s"'`)<>]+/g);
  if (leftover) {
    throw new Error(`${label}: unexpected URL(s) in output: ${[...new Set(leftover)].slice(0, 5).join(', ')}`);
  }
  if (/\bimport\s*\(\s*["'][^."'/]/.test(live) || /\bfrom\s*["'][^./"']/.test(live)) {
    throw new Error(`${label}: a bare module specifier survived — three did not get inlined`);
  }
}

/** Build one page into a single self-contained HTML file. */
function buildPage({ source, htmlOut, label, rewriteHtml }) {
  const sourceHtml = readFileSync(join(ROOT, source), 'utf8');
  const inline = extractInlineModule(sourceHtml, label);
  const bundle = bundleSelfContained(stripAutoUpdate(inline.code, label), label);

  // A module bundle can contain "</script>" inside a string literal, which would close the tag
  // early. Splitting the sequence is inert to the JS parser and invisible to the HTML parser.
  const safeBundle = bundle.split('</script>').join('<\\/script>');

  let html = sourceHtml.slice(0, inline.openIdx) +
    `<script type="module">\n${safeBundle}\n</script>` +
    sourceHtml.slice(inline.endIdx);
  html = stripImportmap(html, label);
  if (rewriteHtml) html = rewriteHtml(html);
  assertNoNetwork(html, label);

  writeFileSync(join(OUT, htmlOut), html);
  return { inlineBytes: Buffer.byteLength(inline.code), bundleBytes: Buffer.byteLength(bundle) };
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

// ---- build ------------------------------------------------------------------------------------
// Idempotent by construction: dist/ is rebuilt from scratch every run.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. The room dashboard. Ships as index.html so a static host serves it at the folder root.
const dashboard = buildPage({
  source: 'dc-dashboard-v1.html',
  htmlOut: 'index.html',
  label: 'index.html',
});

// 2. Per-rack detail view. Its two back-links point at the dashboard, which ships as index.html,
//    so rewrite the route in the OUTPUT only — the source keeps its dc-dashboard-v1.html links.
const rackDetail = buildPage({
  source: 'rack-detail.html',
  htmlOut: 'rack-detail.html',
  label: 'rack-detail.html',
  rewriteHtml: (html) => replaceAllCounted(
    html, 'href="dc-dashboard-v1.html"', 'href="index.html"', 2, 'rack-detail.html routes'),
});

// 3. Client-facing instructions, in Spanish: dist/ is handed to the client as-is, so the note that
//    travels with it has to be readable by whoever double-clicks the file. Copied from source
//    because dist/ is wiped on every run.
copyFileSync(join(ROOT, 'LEEME.dist.txt'), join(OUT, 'LEEME.txt'));

console.log(`built ${OUT}`);
for (const [name, stats] of [['index.html', dashboard], ['rack-detail.html', rackDetail]]) {
  console.log(`  ${name}  ${kb(stats.inlineBytes)} inline module -> ${kb(stats.bundleBytes)} bundled (three included)` +
    `  ·  page total ${kb(statSync(join(OUT, name)).size)}`);
}
console.log('  zero network requests asserted: no CDN, no remote src/href, no bare specifiers');
