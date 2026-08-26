// catalog/test-dimensions.mjs — deterministic dimension assertions against the
// published standards. Companion to test-ports.mjs.
//
// WHY THESE ARE TESTS AND NOT GATE FEATURES
// A blind reviewer cannot pixel-measure 4.500" vs 4.000" of outside diameter, nor
// a 1.5D centreline radius, from a render — the panel ruled both UNRESOLVABLE five
// times out of six across two rounds. GATES.md Rule 7: if a human cannot judge it
// by looking at one image, TEST it. The VISUAL halves stay render criticals (a
// proportional ladder with correct labels; a smooth long-radius arc, not a mitre).
//
// Run:  node catalog/test-dimensions.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const THREE_PATH = path.join(REPO, 'disenos/datacenter-hotspot-sinCDN/vendor/three/three.module.js');
const LIB_PATH   = path.resolve(HERE, '../lib/hvac-catalog.js');

const tmp = path.join(os.tmpdir(), `three-dim-${process.pid}.mjs`);
fs.copyFileSync(THREE_PATH, tmp);
let THREE;
try { THREE = await import(pathToFileURL(tmp).href); } finally { fs.rmSync(tmp, { force: true }); }
globalThis.THREE = THREE;
new Function(fs.readFileSync(LIB_PATH, 'utf8')).call(globalThis);
const K = globalThis.HVACCatalog;
if (!K) throw new Error('hvac-catalog.js did not attach HVACCatalog');

const IN = 0.0254;

// ── ASME B36.10M, transcribed HERE and not read from the lib ────────────────
// An assertion that reads the same table it validates proves nothing. This is an
// independent copy: if the lib's table drifts, these disagree and the test fails.
const B36_10M_OD_IN = {
  '1/2': 0.840, '3/4': 1.050, '1': 1.315, '1-1/4': 1.660, '1-1/2': 1.900,
  '2': 2.375, '2-1/2': 2.875, '3': 3.500, '4': 4.500, '5': 5.563,
  '6': 6.625, '8': 8.625, '10': 10.750, '12': 12.750,
};
// NPS label -> nominal size in inches. ASME B16.9 long-radius elbows are
// centre-to-end = 1.5 x NOMINAL (NPS 4 -> 6.000"), NOT 1.5 x outside diameter.
const nominalIn = nps => String(nps).split('-')
  .reduce((s, part) => s + (part.includes('/')
    ? Number(part.split('/')[0]) / Number(part.split('/')[1])
    : Number(part)), 0);

const results = [];
const check = (suite, name, ok, detail = '') => results.push({ suite, name, ok: !!ok, detail: ok ? '' : detail });
const NEAR = (a, b, tol) => Math.abs(a - b) <= tol;

// ── suite 1: outside diameter matches B36.10M ───────────────────────────────
for (const [nps, odIn] of Object.entries(B36_10M_OD_IN)) {
  const libIn = K.NPS[nps] ? K.NPS[nps].od : null;
  check('od', `NPS ${nps}: lib table OD = B36.10M`, libIn !== null && NEAR(libIn, odIn, 1e-9),
        `lib ${libIn}" vs standard ${odIn}"`);
  const m = K.npsOD ? K.npsOD(nps) : null;
  check('od', `NPS ${nps}: npsOD() returns metres of the standard OD`,
        m !== null && NEAR(m, odIn * IN, 1e-9), `got ${m} m, expected ${(odIn * IN).toFixed(6)} m`);
}
// npsOD must THROW on an unknown size. A silent fallback draws a plausible pipe
// at the wrong diameter, which is the failure mode this whole suite exists for.
let threw = false;
try { K.npsOD('7'); } catch { threw = true; }
check('od', 'npsOD() throws on a size absent from the table', threw, 'it returned a value instead');

// Every ROUND port a pipe generator emits must carry the standard OD, not the
// nominal. This is the pipeRound defect class: NPS 4 drawn at 4.000" not 4.500".
const PIPE_GENS = ['pipeStraight', 'pipeElbow', 'pipeTee', 'pipeCoupling', 'pipeFlange', 'pipeValve'];
for (const g of PIPE_GENS) {
  if (typeof K.components[g] !== 'function') continue;
  for (const nps of ['1', '4', '8', '12']) {
    let c; try { c = K.components[g]({ nps }); } catch (e) { check('od', `${g}(${nps}) constructs`, false, e.message); continue; }
    const want = B36_10M_OD_IN[nps] * IN;
    const inPort = (c.ports || []).find(p => p.id === 'in');
    check('od', `${g} NPS ${nps}: in-port d = standard OD`,
          inPort && inPort.shape === 'round' && NEAR(inPort.d, want, 1e-9),
          `got d=${inPort && inPort.d}, expected ${want.toFixed(6)} (nominal would be ${(Number(nps) * IN).toFixed(6)})`);
  }
}

// ── suite 2: elbow centreline radius is long-radius (1.5 x NOMINAL) ─────────
// R is MEASURED back out of the emitted ports, not read from the source, so the
// assertion tests the geometry rather than restating the code:
//   out.pos.x = R*sin(theta) + cos(theta)*legOut  =>  R = (out.x - cos(theta)*legOut)/sin(theta)
if (typeof K.components.pipeElbow === 'function') {
  for (const nps of ['1', '2', '4', '8', '12']) {
    for (const angle of [90, 45]) {
      const legOut = 0.12;
      const c = K.components.pipeElbow({ nps, angle, legOut });
      const out = c.ports.find(p => p.id === 'out');
      const th = angle * Math.PI / 180;
      const R = (out.pos ? out.pos[0] : out.p[0]) - Math.cos(th) * legOut;
      const measured = R / Math.sin(th);
      const want = 1.5 * nominalIn(nps) * IN;
      check('elbow', `pipeElbow NPS ${nps} @${angle}deg: CLR = 1.5 x nominal`,
            NEAR(measured, want, 1e-6),
            `measured ${(measured / IN).toFixed(3)}" vs B16.9 ${(want / IN).toFixed(3)}" ` +
            `(1.5 x OD would be ${(1.5 * B36_10M_OD_IN[nps]).toFixed(3)}")`);
    }
  }
}

const bySuite = {};
for (const r of results) {
  bySuite[r.suite] ??= { pass: 0, fail: 0 };
  bySuite[r.suite][r.ok ? 'pass' : 'fail']++;
}
for (const r of results) if (!r.ok) console.error(`  FAIL  [${r.suite}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log(JSON.stringify({
  command: 'node catalog/test-dimensions.mjs',
  standards: ['ASME B36.10M (outside diameter)', 'ASME B16.9 (long-radius elbow)'],
  suites: bySuite, pass, fail,
}, null, 1));
process.exit(fail > 0 ? 1 : 0);
