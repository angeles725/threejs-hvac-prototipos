// catalog/test-winding.mjs — triangle winding must be outward for every generator.
//
// Back-face culling uses WINDING, not normals. A generator can push correct
// per-vertex normals (so lighting looks right) while winding its triangles
// backwards, and the part then reads HOLLOW under any single-sided material —
// with no camera angle at which it is correct. DoubleSide hides this, which is
// why it needs a test rather than an eye.
//
// Measure: signed volume of the closed mesh. Outward winding => POSITIVE.
// Run: node catalog/test-winding.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const tmp = path.join(os.tmpdir(), `three-wind-${process.pid}.mjs`);
fs.copyFileSync(path.join(REPO, 'disenos/datacenter-hotspot-sinCDN/vendor/three/three.module.js'), tmp);
try { globalThis.THREE = await import(pathToFileURL(tmp).href); } finally { fs.rmSync(tmp, { force: true }); }
new Function(fs.readFileSync(path.resolve(HERE, '../lib/hvac-catalog.js'), 'utf8')).call(globalThis);
const K = globalThis.HVACCatalog;

function signedVolume(geo) {
  const p = geo.getAttribute('position'), idx = geo.index;
  const n = idx ? idx.count : p.count;
  const g = i => { const k = idx ? idx.getX(i) : i; return [p.getX(k), p.getY(k), p.getZ(k)]; };
  let v = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const a = g(i), b = g(i + 1), c = g(i + 2);
    v += (a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return v;
}

const rows = [];
for (const name of K.list) {
  const f = K.components[name];
  if (typeof f !== 'function') continue;
  let c; try { c = f({}); } catch { continue; }
  if (!c?.geometry?.getAttribute) continue;
  rows.push({ name, vol: signedVolume(c.geometry) });
}
rows.sort((a, b) => a.vol - b.vol);
const bad = rows.filter(r => r.vol < -1e-9);
const flat = rows.filter(r => Math.abs(r.vol) <= 1e-9);
for (const r of bad)  console.error(`  FAIL  ${r.name}: signed volume ${r.vol.toExponential(3)} — winding is INVERTED`);
for (const r of flat) console.error(`  FAIL  ${r.name}: signed volume ~0 — mesh is not closed, winding inconclusive`);
const fail = bad.length + flat.length;
console.log(JSON.stringify({
  command: 'node catalog/test-winding.mjs',
  generators: rows.length, pass: rows.length - fail, fail,
}, null, 1));
process.exit(fail > 0 ? 1 : 0);
