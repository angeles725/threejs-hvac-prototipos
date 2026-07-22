#!/usr/bin/env node
/**
 * keygen.mjs — generate / rotate the per-project access keys for the visor gate.
 *
 *   node disenos/cinemex-hvac-lorawan/keygen.mjs
 *
 * Writes TWO files next to it:
 *   gate-keys.json   — { projects: { <id>: { salt, hash, title } } }. PUBLISHABLE (salt + hash ship
 *                      to the browser anyway). Read at build time by every project's build-publish.
 *   gate-secret.txt  — the CLEARTEXT keys, one per project, for the owner to share. GITIGNORED.
 *
 * Running it again ROTATES every key at once (new key + new salt + new hash for all projects) — the
 * "cambio una y se cambian todas" requirement. After running, rebuild + redeploy so the new hashes
 * ship: old keys stop working the moment the new build is live, and a visitor's stored unlock
 * self-expires because the localStorage token no longer equals the new hash.
 *
 * FRICTION, NOT SECURITY — see gate.mjs's header for what this does and does not buy.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// The three gated projects. `title` is shown on the gate overlay; `id` is the URL segment under /p/
// and the localStorage namespace, so it must match each build-publish's OUT project name exactly.
const PROJECTS = [
  { id: 'cinemex', title: 'Cinemex · HVAC LoRaWAN' },
  { id: 'dhl', title: 'DHL · Datacenter Operations' },
  { id: 'hotspot', title: 'Datacenter · Hotspot Prediction' },
];

// Unambiguous alphabet: no 0/O/1/I/L, so a key read aloud or copied by hand is never ambiguous.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function group(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
/** e.g. CINEMEX-4F7K-9QX2 — the prefix ties the key to its project; two 4-char groups ≈ 40 bits. */
function makeKey(id) {
  return `${id.toUpperCase()}-${group(4)}-${group(4)}`;
}
const sha256hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const projects = {};
const generated = [];
for (const { id, title } of PROJECTS) {
  const key = makeKey(id);
  const salt = randomBytes(16).toString('hex');
  projects[id] = { salt, hash: sha256hex(key + salt), title };
  generated.push({ id, key });
}

const secret = [
  '# Claves de acceso del visor — CONFIDENCIAL. No commitear. Compartir solo con cada cliente.',
  `# Generado: ${new Date().toISOString()}`,
  '',
  ...generated.map(({ id, key }) => `${id.padEnd(9)} ${key}`),
  '',
].join('\n');

writeFileSync(join(ROOT, 'gate-keys.json'), JSON.stringify({ projects }, null, 2) + '\n');
writeFileSync(join(ROOT, 'gate-secret.txt'), secret);

console.log('gate-keys.json written (publishable: salt + hash) · gate-secret.txt written (cleartext, gitignored)');
console.log('\nClaves generadas — compartí cada una con su cliente, rebuild + redeploy para activarlas:\n');
for (const { id, key } of generated) console.log(`  ${id.padEnd(9)} ${key}`);
console.log('');
