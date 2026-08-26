// catalog/test-ports.mjs — deterministic port invariants for every generator.
//
// WHY THIS IS A TEST AND NOT A GATE FEATURE
// Ports are DATA: position, outward direction, section, and whether two parts
// mate. None of that is visible in a picture. Asking a blind reviewer to score
// `ports_mate` from a render produces an authoritative-looking number with
// nothing behind it. GATES.md Rule 7: if a human cannot judge it by looking at
// one image, TEST it.
//
// Run:  node catalog/test-ports.mjs
// Emits a mechanical.tests-shaped summary: {command, pass, fail}. fail>0 fails the gate.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const THREE_PATH = path.join(REPO, 'disenos/datacenter-hotspot-sinCDN/vendor/three/three.module.js');
const LIB_HTML  = path.resolve(HERE, '../cob-im2-catalogo-3d.html');
const LIB_FILE = path.resolve(HERE, '../lib/hvac-catalog.js');
// The generators live INSIDE the viewer HTML — that page is the deliverable and
// the source. Read them out of it, so these suites verify what actually ships.
// (lib/hvac-catalog.js survives only for tuberia-nps, which still inlines it.)
function loadCatalogSource() {
  const html = fs.readFileSync(LIB_HTML, 'utf8');
  const start = html.indexOf('(function (global) {');
  const endMark = "})(typeof window !== 'undefined' ? window : globalThis);";
  const end = html.indexOf(endMark, start);
  if (start < 0 || end < 0) {
    throw new Error('catalog generators not found in ' + LIB_HTML +
      ' — the block markers moved; fix this loader rather than falling back silently');
  }
  return html.slice(start, end + endMark.length);
}

// The vendored three is named .js, so node resolves it as CommonJS and chokes
// on `export`. Materialise an .mjs copy in the OS temp dir -- self-contained,
// no repo pollution, works from any checkout or worktree.
const tmp = path.join(os.tmpdir(), `three-${process.pid}.mjs`);
fs.copyFileSync(THREE_PATH, tmp);
let THREE;
try {
  THREE = await import(pathToFileURL(tmp).href);
} finally {
  fs.rmSync(tmp, { force: true });
}
globalThis.THREE = THREE;
// hvac-catalog.js is a classic IIFE that reads global.THREE and attaches
// global.HVACCatalog. Evaluate it in this realm rather than porting it.
new Function(loadCatalogSource()).call(globalThis);
const C = globalThis.HVACCatalog;
if (!C) throw new Error('hvac-catalog.js did not attach HVACCatalog');

const results = [];
const check = (name, cond, detail = '') =>
  results.push({ name, ok: !!cond, detail: cond ? '' : detail });

const NEAR = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const len = v => Math.hypot(v[0], v[1], v[2]);

// Every generator, called with its own defaults.
const SKIP = new Set(['transitionMinLength']);   // a helper, not a component
const names = C.list.filter(n => !SKIP.has(n) && typeof C.components[n] === 'function');

for (const n of names) {
  let comp;
  try {
    comp = C.components[n]({});
  } catch (e) {
    check(`${n}: constructs`, false, e.message);
    continue;
  }
  check(`${n}: constructs`, true);
  const ports = comp.ports;
  check(`${n}: has ports[]`, Array.isArray(ports) && ports.length > 0,
        `got ${JSON.stringify(ports)}`);
  if (!Array.isArray(ports)) continue;

  const ids = new Set();
  for (const p of ports) {
    const tag = `${n}.${p.id ?? '?'}`;
    check(`${tag}: id present`, typeof p.id === 'string' && p.id.length > 0);
    check(`${tag}: id unique`, !ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);

    const pos = p.p ?? p.pos;
    check(`${tag}: pos is a 3-vector`, Array.isArray(pos) && pos.length === 3 &&
          pos.every(Number.isFinite), `got ${JSON.stringify(pos)}`);

    check(`${tag}: dir is a 3-vector`, Array.isArray(p.dir) && p.dir.length === 3 &&
          p.dir.every(Number.isFinite), `got ${JSON.stringify(p.dir)}`);
    if (Array.isArray(p.dir) && p.dir.length === 3) {
      // |dir| = 1. NOT axis-aligned -- a 45 deg elbow emits [cos t, 0, sin t],
      // so asserting membership of the six axis vectors would reject every
      // non-90 deg fitting.
      check(`${tag}: |dir| = 1`, NEAR(len(p.dir), 1, 1e-6),
            `|dir| = ${len(p.dir).toFixed(6)}`);
    }

    check(`${tag}: shape is rect|round`, p.shape === 'rect' || p.shape === 'round',
          `got ${p.shape}`);
    if (p.shape === 'rect') {
      check(`${tag}: rect carries w,h > 0`,
            Number.isFinite(p.w) && Number.isFinite(p.h) && p.w > 0 && p.h > 0,
            `w=${p.w} h=${p.h}`);
      check(`${tag}: rect carries no d`, p.d === undefined, `d=${p.d}`);
    } else if (p.shape === 'round') {
      // The defect the manifest schema had: a round port with no diameter.
      check(`${tag}: round carries d > 0`,
            Number.isFinite(p.d) && p.d > 0, `d=${p.d}`);
      check(`${tag}: round carries no w/h`,
            p.w === undefined && p.h === undefined, `w=${p.w} h=${p.h}`);
    }
  }
}

// Mating: two same-size parts of the same family must mate.
if (typeof C.portsCompatible === 'function') {
  const pairs = [
    ['pipeStraight', 'pipeElbow',  { nps: '4' }],
    ['pipeStraight', 'pipeTee',    { nps: '4' }],
    ['pipeStraight', 'pipeFlange', { nps: '4' }],
    ['straightRect', 'elbowRect',  { w: C.IN(12), h: C.IN(8) }],
  ];
  for (const [a, b, args] of pairs) {
    if (!C.components[a] || !C.components[b]) continue;
    const A = C.components[a](args), B = C.components[b](args);
    const outs = A.ports.filter(p => p.id === 'out');
    const ins  = B.ports.filter(p => p.id === 'in');
    const mates = outs.some(o => ins.some(i => C.portsCompatible(o, i)));
    check(`mate: ${a}.out <-> ${b}.in`, mates,
          'sections disagree or portsCompatible rejected the pair');
  }
}

const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
for (const r of results) if (!r.ok) console.error(`  FAIL  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
console.log(JSON.stringify({
  command: 'node catalog/test-ports.mjs',
  generators: names.length, pass, fail
}, null, 1));
process.exit(fail > 0 ? 1 : 0);
