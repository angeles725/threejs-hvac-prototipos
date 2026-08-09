// verify-design-spec.mjs — parse gate for disenos/catalog/**/design-spec.yaml.
//
// WHY THIS EXISTS: verify-catalog-asset.mjs only loads the HTML. Nothing in the pipeline ever parsed
// the design-spec, so a spec that no tool can read still passed every gate. A sweep on 2026-08-08
// found 29 of 68 specs were not valid YAML — across 10 families and every session — while all of
// their assets were gate-green. An unreadable spec is an unenforceable contract: the ΔE00 colorTarget,
// the perf budget and the confidence discipline all live in this file.
//
// Usage:  node disenos/catalog/tools/verify-design-spec.mjs [<family>/<slug> ...]
//         (no args = sweep every design-spec.yaml under disenos/catalog/)
// Exit 0 = every spec parsed and carries the required keys.
// Exit 1 = at least one spec is unreadable or incomplete.
// Exit 2 = INCONCLUSIVE (no YAML parser available) — never a verdict on the specs.
//
// This tool is READ-ONLY and additive: it does not change verify-catalog-asset.mjs.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'disenos/catalog';
const REQUIRED = ['design', 'family', 'scale', 'dimensions_real', 'materials', 'colorTarget'];

// --- locate a YAML parser. Prefer a real one; refuse to guess if none is present. -----------------
let parse = null;
try {
  const yaml = await import('yaml').catch(() => import('js-yaml'));
  parse = yaml.parse ? (s) => yaml.parse(s) : (s) => yaml.default.load(s);
} catch { /* fall through to ruby */ }
if (!parse) {
  try {
    execFileSync('ruby', ['-ryaml', '-e', 'nil'], { stdio: 'ignore' });
    parse = (s) => {
      // ruby reports the real syntax error; we only need pass/fail plus its message
      const r = execFileSync('ruby', ['-ryaml', '-rjson', '-e',
        'puts JSON.generate(YAML.load(STDIN.read))'], { input: s, encoding: 'utf8' });
      return JSON.parse(r);
    };
  } catch { /* none */ }
}
if (!parse) {
  console.error('INCONCLUSIVE: no YAML parser available (npm `yaml`/`js-yaml`, or ruby).');
  console.error('NOT a verdict on the specs — nothing was parsed.');
  process.exit(2);
}

// --- collect targets ------------------------------------------------------------------------------
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === 'design-spec.yaml') out.push(p);
  }
  return out;
}
const args = process.argv.slice(2);
const targets = args.length
  ? args.map((t) => join(ROOT, t, 'design-spec.yaml'))
  : walk(ROOT).sort();

// --- check ----------------------------------------------------------------------------------------
let bad = 0;
for (const p of targets) {
  const rel = relative(ROOT, p).replace(/\/design-spec\.yaml$/, '');
  let doc;
  try {
    doc = parse(readFileSync(p, 'utf8'));
  } catch (e) {
    const msg = String(e.stderr || e.message).split('\n').find((l) => /line \d+/.test(l)) ||
                String(e.message).split('\n')[0];
    console.log(`FAIL  ${rel}\n        unparseable: ${msg.trim()}`);
    bad++;
    continue;
  }
  const missing = REQUIRED.filter((k) => doc == null || doc[k] === undefined);
  const ct = doc?.colorTarget;
  const ctBad = ct && (!Array.isArray(ct.srgb) || ct.srgb.length !== 3 || !ct.crop);
  if (missing.length || ctBad) {
    console.log(`FAIL  ${rel}` +
      (missing.length ? `\n        faltan claves: ${missing.join(', ')}` : '') +
      (ctBad ? `\n        colorTarget necesita srgb:[r,g,b] y crop` : ''));
    bad++;
    continue;
  }
  console.log(`ok    ${rel}`);
}
console.log(`\n${targets.length - bad}/${targets.length} specs válidos`);
process.exit(bad ? 1 : 0);
