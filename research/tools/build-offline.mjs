#!/usr/bin/env node
/**
 * build-offline.mjs — turn a modular three.js design into ONE self-contained HTML file.
 *
 *   node research/tools/build-offline.mjs <design-dir> [--entry index.html] [--out dist]
 *
 * WHY THIS EXISTS
 * ---------------
 * A design authored the design3d way — modular `src/**` + a LOCAL importmap pointing at
 * `vendor/three/` — is clean to develop but CANNOT be opened by double-click: the browser blocks
 * every `import` of an external module file over `file://` (opaque-origin CORS). So the modular
 * source always needs a local http server, which is exactly what the client receiving the design
 * does not want to run.
 *
 * This build removes that dependency. esbuild follows the entry's relative `./src/**` imports and
 * the `three`/`three/addons/**`/`lil-gui` bare specifiers (resolved to the design's own vendored
 * files via its importmap) into ONE import-free ESM blob, which is re-inlined into the HTML. The
 * external stylesheet is inlined too. The output is a single HTML document that:
 *
 *   - makes ZERO network requests — no CDN, no external module, no external stylesheet;
 *   - renders on a machine with no internet at all;
 *   - opens by double-click over file:// — an INLINE `<script type="module">` with no imports left
 *     is not subject to the cross-origin rules that block file:// module imports;
 *   - is equally valid served over HTTP (any static host).
 *
 * The self-contained page is a DELIVERABLE MIRROR of the gated modular source, not a second source
 * of truth. Gate the served modular version; regenerate dist/ at P7. RULE: never edit dist/ by
 * hand — edit the modular source and rebuild.
 *
 * Generalized from disenos/datacenter-hotspot-sinCDN/build-offline.mjs (which handled only a
 * single inline-module page); this one also handles an external `<script type="module" src>` entry
 * that imports a `src/**` tree, and derives its three/addons/lil-gui aliases from the page importmap.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ---- args -------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : argv[i + 1];
};
const DESIGN_DIR = positional[0] && resolve(positional[0]);
if (!DESIGN_DIR || !existsSync(DESIGN_DIR)) {
  throw new Error('usage: build-offline.mjs <design-dir> [--entry index.html] [--out dist]');
}
const ENTRY_HTML = flag('entry', 'index.html');
const OUT = resolve(DESIGN_DIR, flag('out', 'dist'));

/**
 * Strings that legitimately appear inside three.js as data, never as a fetch: the XHTML namespace
 * URI (required by the SVG/DOM specs) and the URL quoted in its r155 lighting-change console notice.
 * Anything else matching http(s) in the output is a real remote dependency and fails the build.
 */
const ALLOWED_URL_STRINGS = [
  'http://www.w3.org/1999/xhtml',              // three: XHTML namespace (createElementNS), spec data
  'http://www.w3.org/2000/svg',                // three/lil-gui: SVG namespace (createElementNS), spec data
  'https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733', // three: r155 console notice
  'https://lil-gui.georgealways.com',          // lil-gui: homepage credit string in its banner, never fetched
];

// ---- small assert helpers (a silent 0-or-2 match is a build lie) ------------------------------
/** Replace an exact substring, asserting it occurs exactly once. */
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first === -1) throw new Error(`${label}: expected exactly one occurrence of ${JSON.stringify(from)}, found none`);
  if (text.indexOf(from, first + from.length) !== -1) throw new Error(`${label}: ${JSON.stringify(from)} occurs more than once`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// ---- importmap -> esbuild alias set -----------------------------------------------------------
/**
 * Parse the page importmap and the source's actual `three/addons/**` imports into a concrete alias
 * map. esbuild's --alias does EXACT module-path matching (no prefix aliasing), so the trailing-slash
 * `three/addons/` importmap entry is expanded per real import found in the source tree.
 */
function deriveAliases(sourceHtml, label) {
  const m = sourceHtml.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${label}: no importmap in ${ENTRY_HTML} — is this a modular offline design?`);
  const map = JSON.parse(m[1]).imports || {};
  const aliases = {};
  let addonsBase = null;
  for (const [spec, target] of Object.entries(map)) {
    if (spec.endsWith('/')) { if (spec === 'three/addons/') addonsBase = target; continue; }
    aliases[spec] = target; // e.g. three, lil-gui
  }
  // Expand three/addons/<rest> for every real import in the source tree.
  const srcText = execFileSync('node', ['-e',
    "const{execSync}=require('child_process');process.stdout.write(execSync('cat '+process.argv[1]+'/main.js 2>/dev/null; find '+process.argv[1]+'/src -name \"*.mjs\" -o -name \"*.js\" 2>/dev/null | xargs cat 2>/dev/null',{maxBuffer:1<<26}))",
    DESIGN_DIR], { encoding: 'utf8' });
  if (addonsBase) {
    for (const mm of srcText.matchAll(/['"]three\/addons\/([^'"]+)['"]/g)) {
      aliases[`three/addons/${mm[1]}`] = addonsBase + mm[1];
    }
  }
  return aliases;
}

function bundleEntry(entryFile, aliases, label) {
  try {
    return execFileSync('npx', ['--no-install', 'esbuild', entryFile,
      '--bundle', '--format=esm', '--platform=browser', '--loader:.js=js', '--minify',
      ...Object.entries(aliases).map(([from, to]) => `--alias:${from}=${to}`),
    ], { cwd: DESIGN_DIR, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${label}: esbuild failed\n${error.stderr || error.message}`);
  }
}

// ---- HTML rewrites ----------------------------------------------------------------------------
function inlineStylesheets(html, label) {
  return html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g, (whole, href) => {
    if (/^https?:/.test(href)) throw new Error(`${label}: refusing to inline a remote stylesheet: ${href}`);
    const css = readFileSync(join(DESIGN_DIR, href), 'utf8');
    return `<style>\n${css}\n</style>`;
  });
}

function stripImportmap(html, label) {
  const OPEN = '<script type="importmap">';
  const openIdx = html.indexOf(OPEN);
  if (openIdx === -1) throw new Error(`${label}: importmap block not found`);
  const closeIdx = html.indexOf('</script>', openIdx);
  if (closeIdx === -1) throw new Error(`${label}: importmap </script> not found`);
  return html.slice(0, openIdx) + html.slice(closeIdx + '</script>'.length);
}

/**
 * The whole point of this build, enforced rather than hoped for: assert the emitted page cannot
 * reach the network — no CDN marker, no remote src/href, and no bare module specifier survived.
 */
function assertNoNetwork(html, label) {
  const live = html.replace(/<!--[\s\S]*?-->/g, ''); // comments issue no request; they may NAME a CDN
  for (const marker of ['unpkg.com', 'jsdelivr', 'cdnjs', 'esm.sh', 'skypack']) {
    if (live.includes(marker)) throw new Error(`${label}: CDN reference "${marker}" survived into the output`);
  }
  for (const attr of ['src="http', "src='http", 'href="http', "href='http"]) {
    if (live.includes(attr)) throw new Error(`${label}: output still loads a remote resource (${attr}…)`);
  }
  let residue = live;
  for (const allowed of ALLOWED_URL_STRINGS) residue = residue.split(allowed).join('');
  const leftover = residue.match(/https?:\/\/[^\s"'`)<>]+/g);
  if (leftover) throw new Error(`${label}: unexpected URL(s) in output: ${[...new Set(leftover)].slice(0, 5).join(', ')}`);
  if (/\bfrom\s*["'][^./"']/.test(live) || /\bimport\s*\(\s*["'][^./"']/.test(live)) {
    throw new Error(`${label}: a bare module specifier survived — three did not get inlined`);
  }
}

// ---- build ------------------------------------------------------------------------------------
const label = `${DESIGN_DIR.split('/').pop()}/${ENTRY_HTML}`;
const sourceHtml = readFileSync(join(DESIGN_DIR, ENTRY_HTML), 'utf8');
const aliases = deriveAliases(sourceHtml, label);

// Locate the page's module script: external entry (src=) or inline.
const extMatch = sourceHtml.match(/<script type="module" src="([^"]+)"><\/script>/);
let bundle, inlineBytes;
if (extMatch) {
  const entryFile = join(DESIGN_DIR, extMatch[1]);
  inlineBytes = statSync(entryFile).size;
  bundle = bundleEntry(entryFile, aliases, label);
} else {
  const inlineMatch = sourceHtml.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!inlineMatch) throw new Error(`${label}: no <script type="module"> (external or inline) found`);
  inlineBytes = Buffer.byteLength(inlineMatch[1]);
  // Bundle an inline module by writing it to a temp entry inside the design dir so ./src resolves.
  const tmp = join(DESIGN_DIR, '.build-offline.entry.mjs');
  writeFileSync(tmp, inlineMatch[1]);
  try { bundle = bundleEntry(tmp, aliases, label); } finally { rmSync(tmp, { force: true }); }
}

// A module bundle can contain "</script>" inside a string literal, which would close the tag early.
// Splitting the sequence is inert to the JS parser and invisible to the HTML parser.
const safeBundle = bundle.split('</script>').join('<\\/script>');

let html = sourceHtml;
if (extMatch) {
  html = replaceOnce(html, extMatch[0], `<script type="module">\n${safeBundle}\n</script>`, label);
} else {
  html = html.replace(/<script type="module">[\s\S]*?<\/script>/, `<script type="module">\n${safeBundle}\n</script>`);
}
html = inlineStylesheets(html, label);
html = stripImportmap(html, label);
assertNoNetwork(html, label);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

const kb = (b) => `${(b / 1024).toFixed(1)} kB`;
console.log(`built ${OUT}/index.html`);
console.log(`  entry ${kb(inlineBytes)} -> ${kb(Buffer.byteLength(bundle))} bundled (three + src/** included)` +
  `  ·  page total ${kb(statSync(join(OUT, 'index.html')).size)}`);
console.log(`  aliases: ${Object.keys(aliases).join(', ')}`);
console.log('  zero network requests asserted: no CDN, no remote src/href, no bare specifiers');
