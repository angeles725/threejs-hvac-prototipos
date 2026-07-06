#!/usr/bin/env node
/**
 * build-publish.mjs — obfuscated PUBLISH build for the hotel energy demo.
 *
 *   node build-publish.mjs   ->  publish/ (obfuscated, copyright banner,
 *                                anti-copy guard on the 3D scene)
 *
 * The SOURCE HTML stays readable; only publish/ ships the hardened build.
 *
 *   dashboard-energetico-v1.html   ->  publish/index.html            (dashboard)
 *   hotel-realista-ensamblado.html ->  publish/hotel-realista-ensamblado.html (3D)
 *
 * Both files carry their JS inline in a single <script type="module">. The
 * obfuscator MUST NOT touch the ES module `import ...` statements, so we split
 * the leading import lines out (kept VERBATIM) and obfuscate only the body,
 * then reassemble inside the same <script type="module">.
 *
 * RULE: never edit publish/ by hand. It is generated. Edit sources, rebuild.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = dirname(new URL(import.meta.url).pathname);
const OUTDIR = join(ROOT, 'publish');

// ---- copyright identity -----------------------------------------------------
const OWNER = 'Cristian Angeles';
const YEAR = '2026';

// Obfuscation profile tuned for a Three.js render loop: maximum string/identity
// hiding, ZERO runtime-heavy transforms (no control-flow flattening, no dead
// code injection) so the frame rate stays fluid.
const OBFUSCATOR_OPTIONS = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // body references imported bindings (THREE, ...) as globals
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 3,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  splitStrings: true,
  splitStringsChunkLength: 8,
  selfDefending: true,
  debugProtection: true,
  debugProtectionInterval: 2000,
  numbersToExpressions: true,
  simplify: true,
  transformObjectKeys: true,
  // PERFORMANCE — keep OFF so the three.js render loop stays smooth
  controlFlowFlattening: false,
  deadCodeInjection: false,
  unicodeEscapeSequence: false,
};

const MODULE_OPEN = '<script type="module">';

/**
 * Extract the <script type="module"> block, split off the leading ES `import`
 * lines (kept verbatim), obfuscate the remaining module body, and reassemble.
 */
function obfuscateModule(html, label) {
  const openIdx = html.indexOf(MODULE_OPEN);
  if (openIdx === -1) throw new Error(`${label}: <script type="module"> not found`);
  const bodyStart = openIdx + MODULE_OPEN.length;
  const closeIdx = html.indexOf('</script>', bodyStart);
  if (closeIdx === -1) throw new Error(`${label}: module </script> not found`);

  const inner = html.slice(bodyStart, closeIdx);

  // Split the leading ES import statements (top-level, single line) from the
  // body. They must stay VERBATIM — the obfuscator would break ESM imports.
  const lines = inner.split('\n');
  const importLines = [];
  const bodyLines = [];
  let stillPreamble = true;
  for (const line of lines) {
    if (stillPreamble && /^\s*import\s.+from\s.+;?\s*$/.test(line)) {
      importLines.push(line.trim());
    } else {
      // Once we hit the first non-import statement, everything else is body.
      // (Blank/comment lines before the first real statement stay in the body;
      //  the obfuscator strips them under compact.)
      if (stillPreamble && line.trim() !== '' && !/^\s*import\s/.test(line)) {
        stillPreamble = false;
      }
      bodyLines.push(line);
    }
  }
  // Wrap the body in an IIFE so its top-level declarations become function
  // LOCALS — with renameGlobals:false the obfuscator only renames locals, so
  // without this wrap identifiers like DATA / buildChiller would stay readable.
  // Imported bindings (THREE, ...) resolve via closure to the module scope, so
  // they must NOT be passed as params (that would shadow / require rewiring).
  const body = '(function(){\n' + bodyLines.join('\n') + '\n})();';
  const obf = JavaScriptObfuscator.obfuscate(body, OBFUSCATOR_OPTIONS).getObfuscatedCode();

  const rebuilt =
    MODULE_OPEN + '\n' +
    (importLines.length ? importLines.join('\n') + '\n' : '') +
    '/* proprietary design — obfuscated build, all rights reserved */\n' +
    obf + '\n' +
    '</script>';

  return html.slice(0, openIdx) + rebuilt + html.slice(closeIdx + '</script>'.length);
}

function copyrightBanner() {
  return [
    '<!--',
    `  (c) ${YEAR} ${OWNER}. All rights reserved. / Todos los derechos reservados.`,
    '  Proprietary 3D design and dashboard for the hotel energy demo.',
    '  Unauthorized copying, reproduction, reverse-engineering or redistribution',
    '  is strictly prohibited.',
    '-->',
    `<meta name="copyright" content="(c) ${YEAR} ${OWNER}. All rights reserved.">`,
  ].join('\n');
}

// Anti-copy guard: block context menu / selection / drag / copy and the common
// devtools & view-source / save shortcuts. 3D SCENE ONLY — never on the
// dashboard, where it would stop the client selecting their own data.
function antiCopyGuard() {
  return [
    '<script>',
    '(function(){',
    '  var b=function(e){e.preventDefault();return false;};',
    "  document.addEventListener('contextmenu',b);",
    "  document.addEventListener('selectstart',b);",
    "  document.addEventListener('dragstart',b);",
    "  document.addEventListener('copy',b);",
    "  document.addEventListener('keydown',function(e){",
    '    var k=(e.key||"");',
    '    if(e.keyCode===123){return b(e);}',                                        // F12
    '    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&/[IJC]/i.test(k)){return b(e);}',   // devtools
    '    if((e.ctrlKey||e.metaKey)&&/[US]/i.test(k)){return b(e);}',                // view-source / save
    '  });',
    '})();',
    '</script>',
  ].join('\n');
}

// Console silencer — 3D SCENE ONLY (three.js emits internal warnings). Never on
// the dashboard, where swallowing errors would hide real problems.
function consoleSilencer() {
  return [
    '<script>',
    '(function(){try{var n=function(){};',
    "  ['log','warn','error','info','debug','trace','table','dir','group','groupEnd','count','assert']",
    '    .forEach(function(m){try{console[m]=n;}catch(e){}});',
    '}catch(e){}})();',
    '</script>',
  ].join('\n');
}

function injectHead(html, extra) {
  return html.replace(/<head([^>]*)>/i, (m) => `${m}\n${extra}`);
}

// ---- build ------------------------------------------------------------------
rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

// 1) Dashboard -> index.html  (copyright banner only; NO guard / silencer)
{
  let html = readFileSync(join(ROOT, 'dashboard-energetico-v1.html'), 'utf8');
  html = obfuscateModule(html, 'dashboard');
  html = injectHead(html, copyrightBanner());
  writeFileSync(join(OUTDIR, 'index.html'), html);
  console.log('  dashboard-energetico-v1.html  ->  publish/index.html');
}

// 2) 3D scene -> hotel-realista-ensamblado.html  (full hardening)
{
  let html = readFileSync(join(ROOT, 'hotel-realista-ensamblado.html'), 'utf8');
  html = obfuscateModule(html, 'hotel');
  html = injectHead(html, `${copyrightBanner()}\n${consoleSilencer()}\n${antiCopyGuard()}`);
  writeFileSync(join(OUTDIR, 'hotel-realista-ensamblado.html'), html);
  console.log('  hotel-realista-ensamblado.html  ->  publish/hotel-realista-ensamblado.html');
}

// 3) Cloudflare cache headers: index always fresh, the rest cached long.
writeFileSync(join(OUTDIR, '_headers'), [
  '/index.html', '  Cache-Control: no-cache',
  '/hotel-realista-ensamblado.html', '  Cache-Control: public, max-age=31536000, immutable',
  '/*', '  X-Content-Type-Options: nosniff',
  '',
].join('\n'));

console.log('build OK [PUBLISH obfuscated] -> publish/');
