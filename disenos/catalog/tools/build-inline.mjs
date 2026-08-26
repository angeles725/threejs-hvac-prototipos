#!/usr/bin/env node
// build-inline.mjs — regenerate a catalog artifact's inlined <script> blocks FROM SOURCE.
//
// WHY THIS EXISTS: an offline single-file artifact inlines its dependencies, and a
// hand-maintained inline copy silently forks from the library it credits. 121 shipped a
// viewer carrying 13 generators while its UI named a 21-generator lib; this repo's own
// tuberia-nps.html shipped with the ΔW-derived transition length MISSING while the commit
// message described it. That is the worst failure shape available: the fix appears to
// ship, the artifact says it shipped, and it did not.
//
// The inlined copy is a BUILD OUTPUT. Never edit it in place.
//
// Usage:
//   node disenos/catalog/tools/build-inline.mjs <artifact.html> --lib <source.js> [--check]
//
// --check exits 1 if the artifact is out of date instead of rewriting it (for CI / gates).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const libIdx = args.indexOf('--lib');
const lib = libIdx >= 0 ? args[libIdx + 1] : null;
const check = args.includes('--check');
if (!file || !lib) {
  console.error('usage: build-inline.mjs <artifact.html> --lib <source.js> [--check]');
  process.exit(2);
}

const MARK_OPEN = '<!-- BEGIN INLINE: ';
const MARK_CLOSE = '<!-- END INLINE -->';

const src = readFileSync(lib, 'utf8');
const sha = createHash('sha256').update(src).digest('hex').slice(0, 12);
const html = readFileSync(file, 'utf8');

const block =
  `${MARK_OPEN}${lib} sha256:${sha} — GENERATED, do not edit here; edit ${lib} and re-run ` +
  `disenos/catalog/tools/build-inline.mjs -->\n<script>\n${src}\n</script>\n${MARK_CLOSE}`;

const open = html.indexOf(MARK_OPEN);
let out;
if (open >= 0) {
  const close = html.indexOf(MARK_CLOSE, open);
  if (close < 0) { console.error(`${file}: BEGIN INLINE without END INLINE`); process.exit(2); }
  out = html.slice(0, open) + block + html.slice(close + MARK_CLOSE.length);
} else {
  // First run: replace the hand-inlined copy, located by the library's own banner line.
  const banner = src.split('\n').find(l => l.includes('.js —')) || '';
  const key = banner.trim().slice(0, 40);
  const at = key ? html.indexOf(key) : -1;
  if (at < 0) { console.error(`${file}: cannot locate the existing inline copy; add the markers by hand once`); process.exit(2); }
  const sOpen = html.lastIndexOf('<script>', at);
  const sClose = html.indexOf('</script>', at);
  if (sOpen < 0 || sClose < 0) { console.error(`${file}: inline copy is not inside a <script> block`); process.exit(2); }
  out = html.slice(0, sOpen) + block + html.slice(sClose + '</script>'.length);
}

if (out === html) { console.log(`${file}: up to date (${lib} sha256:${sha})`); process.exit(0); }
if (check) {
  console.error(`${file}: STALE — inlined copy differs from ${lib} (sha256:${sha}). Run without --check to regenerate.`);
  process.exit(1);
}
writeFileSync(file, out);
console.log(`${file}: regenerated from ${lib} (sha256:${sha})`);
