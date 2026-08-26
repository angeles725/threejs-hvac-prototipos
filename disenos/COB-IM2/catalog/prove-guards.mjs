// catalog/prove-guards.mjs — break the catalog on purpose and check the suites notice.
//
// Adapted from ~/investigacion/nave-panccadia/tools/prove-guards.py, whose rule
// this project already paid for: A GUARD IS NOT TRUSTED UNTIL IT HAS BEEN SEEN
// TO FAIL. Three chirality guards there passed while the slab was detached the
// whole time, because they followed a transform path the defect never took.
//
// Worse than a wrong check is a VACUOUS one — an assertion that cannot fail
// under any input, reporting coverage the suite does not have, under a name that
// invites the trust it has not earned. Green totals cannot distinguish the two.
// This does: for each defect class the suites claim to catch, inject exactly
// that defect into a COPY of the page, run the real suite against it, and report
// CAUGHT or MISSED.
//
// The corrupted copies live in the OS temp dir and never touch the deliverable.
//
// Run: node catalog/prove-guards.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(HERE, '..', 'cob-im2-catalogo-3d.html');
const SRC = fs.readFileSync(PAGE, 'utf8');

// Each injection: the defect, and the suite that exists to catch it.
// `find` must be present in the page — if it is not, the injector is broken and
// that is reported separately, because proving a guard tests the INJECTOR too:
// a MISSED verdict from an injection that changed nothing would condemn a
// working guard.
const INJECTIONS = [
  { suite: 'test-winding.mjs', name: 'ringRect winding inverted',
    find: 'const corners = [V(0, -hh, -hw), V(0, hh, -hw), V(0, hh, hw), V(0, -hh, hw)];',
    repl: 'const corners = [V(0, -hh, -hw), V(0, -hh, hw), V(0, hh, hw), V(0, hh, -hw)];' },

  { suite: 'test-dimensions.mjs', name: 'an NPS outside diameter drifts 0.025"',
    find: "'6':   { od: 6.625,", repl: "'6':   { od: 6.600," },

  { suite: 'test-dimensions.mjs', name: 'elbow CLR reverts to 1.5 x OD',
    find: 'const R = IN(1.5 * npsNominal(nps));', repl: 'const R = 1.5 * od;' },

  { suite: 'test-dimensions.mjs', name: 'npsOD falls back silently instead of throwing',
    find: "if (!e) throw new Error(`hvac-catalog: NPS ${nps} not in the B36.10M table`);",
    repl: 'if (!e) return IN(Number(String(nps).split("-")[0]) || 4);' },

  { suite: 'test-ports.mjs', name: 'round ports lose their diameter',
    find: "const ROUND = d => ({ shape: 'round', d });",
    repl: "const ROUND = d => ({ shape: 'round' });" },

  { suite: 'test-ports.mjs', name: 'a port direction is de-normalised',
    find: "P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),\n              P('out', [length, 0, 0], [1, 0, 0], ROUND(od))]",
    repl: "P('in', [0, 0, 0], [-2, 0, 0], ROUND(od)),\n              P('out', [length, 0, 0], [1, 0, 0], ROUND(od))]" },

  { suite: 'test-ports.mjs', name: 'rect ports carry a diameter they should not',
    find: "const RECT = (w, h) => ({ shape: 'rect', w, h });",
    repl: "const RECT = (w, h) => ({ shape: 'rect', w, h, d: w });" },
];

function runSuite(suite, htmlPath) {
  try {
    execFileSync('node', [path.join(HERE, suite)],
      { env: { ...process.env, CATALOG_HTML: htmlPath }, stdio: 'pipe' });
    return { failed: false };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    return { failed: true, out };
  }
}

// Baseline: every suite must be GREEN on the untouched page, or a CAUGHT verdict
// below would mean nothing.
console.log('baseline (untouched page):');
let baselineOk = true;
for (const suite of ['test-ports.mjs', 'test-winding.mjs', 'test-dimensions.mjs']) {
  const r = runSuite(suite, PAGE);
  console.log(`  ${r.failed ? 'FAIL' : ' ok '}  ${suite}`);
  if (r.failed) baselineOk = false;
}
if (!baselineOk) {
  console.error('\nThe suites are not green on the real page — fix that before proving guards.');
  process.exit(2);
}

console.log('\ninjections:');
let missed = 0, broken = 0;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prove-guards-'));
for (const inj of INJECTIONS) {
  if (!SRC.includes(inj.find)) {
    console.error(`  BROKEN INJECTOR  ${inj.name} — its anchor is not in the page`);
    broken++;
    continue;
  }
  const corrupted = path.join(dir, `${inj.name.replace(/\W+/g, '-')}.html`);
  fs.writeFileSync(corrupted, SRC.replace(inj.find, inj.repl));
  const r = runSuite(inj.suite, corrupted);
  console.log(`  ${r.failed ? 'CAUGHT' : 'MISSED'}  ${inj.suite.padEnd(20)} ${inj.name}`);
  if (!r.failed) missed++;
}
fs.rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({
  command: 'node catalog/prove-guards.mjs',
  injections: INJECTIONS.length, caught: INJECTIONS.length - missed - broken,
  missed, broken_injectors: broken,
}, null, 1));
if (missed) console.error(`\n${missed} guard(s) stayed green on their own defect — those assertions are worthless.`);
if (broken) console.error(`${broken} injector(s) could not apply — a MISSED from those would be the test's fault.`);
process.exit(missed || broken ? 1 : 0);
