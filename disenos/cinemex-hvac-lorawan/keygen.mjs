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
 * ADDITIVE: existing entries in gate-keys.json are preserved. Only project ids NOT already present
 * get a fresh key + salt + hash, so adding a project never invalidates the passcodes already handed
 * to existing clients. To deliberately ROTATE one key, delete its entry from gate-keys.json first,
 * then re-run. After running, rebuild + redeploy so the new hashes ship.
 *
 * FRICTION, NOT SECURITY — see gate.mjs's header for what this does and does not buy.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// The three gated projects. `title` is shown on the gate overlay; `id` is the URL segment under /p/
// and the localStorage namespace, so it must match each build-publish's OUT project name exactly.
const PROJECTS = [
  { id: 'cinemex', title: 'Cinemex · HVAC LoRaWAN' },
  { id: 'dhl', title: 'DHL · Datacenter Operations' },
  { id: 'hotspot', title: 'Datacenter · Hotspot Prediction' },
  { id: 'gobernador', title: 'KALTE · Gobernador de Aire' },
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

const KEYS_PATH = join(ROOT, 'gate-keys.json');
const SECRET_PATH = join(ROOT, 'gate-secret.txt');

// Preserve existing entries — only NEW ids get a fresh key. See the header: adding a project must
// never rotate the passcodes already in clients' hands.
const existing = existsSync(KEYS_PATH)
  ? (JSON.parse(readFileSync(KEYS_PATH, 'utf8')).projects || {})
  : {};

const projects = { ...existing };
const generated = [];
for (const { id, title } of PROJECTS) {
  if (projects[id]) continue;                          // keep the existing key/salt/hash untouched
  const key = makeKey(id);
  const salt = randomBytes(16).toString('hex');
  projects[id] = { salt, hash: sha256hex(key + salt), title };
  generated.push({ id, key });
}

if (!generated.length) {
  console.log('gate-keys.json already covers every project — nothing new to issue.');
  process.exit(0);
}

const stampedLines = [
  `# Añadido: ${new Date().toISOString()}`,
  ...generated.map(({ id, key }) => `${id.padEnd(9)} ${key}`),
  '',
];

// Append to gate-secret.txt — existing cleartext (unrecoverable from hashes) is never clobbered.
const secret = existsSync(SECRET_PATH)
  ? readFileSync(SECRET_PATH, 'utf8').replace(/\n*$/, '\n') + '\n' + stampedLines.join('\n')
  : [
      '# Claves de acceso del visor — CONFIDENCIAL. No commitear. Compartir solo con cada cliente.',
      '',
      ...stampedLines,
    ].join('\n');

writeFileSync(KEYS_PATH, JSON.stringify({ projects }, null, 2) + '\n');
writeFileSync(SECRET_PATH, secret);

console.log('gate-keys.json updated (existing keys preserved) · gate-secret.txt appended (cleartext, gitignored)');
console.log('\nClaves NUEVAS — compartí cada una con su cliente, rebuild + redeploy para activarlas:\n');
for (const { id, key } of generated) console.log(`  ${id.padEnd(9)} ${key}`);
console.log('');
