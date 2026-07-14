#!/usr/bin/env node
// preflight.mjs — prove the EVIDENCE CHAIN works before spending a gate attempt on it.
//
// Why this exists: every expensive failure in the cinemex run was an evidence failure that looked
// like success. capture.mjs exited 0 with 10 of 24 shots dead. The app's query parser silently
// resets the ENTIRE state to defaults on one unknown value — so a capture set can be 24 pictures of
// the default view while every filename claims otherwise, with a clean console and a green exit.
// A blind reviewer then returns a confident verdict on evidence that never showed what it claims.
//
// This is the smoke test for the instrument, not the subject. Run it at P0 and before any capture
// set whose URL vocabulary changed.
//
// Usage:
//   node research/tools/preflight.mjs <file.html> --distinct "camera=facade" "camera=sala-3"
//   node research/tools/preflight.mjs <file.html> --contract <shots.json>   <-- the important one
//
// Checks, in order (each FAILS LOUD):
//   1. http server reachable at the harness port (never file://)
//   2. page loads, a <canvas> exists, console + network are clean
//   3. probe returns non-zero draws — a scene that renders nothing is not a scene
//   4. DISTINCTNESS: two query states must produce DIFFERENT pixels. If they match, the params are
//      not taking effect and EVERY capture in the set would be a lie.
//   5. CONTRACT (--contract <shots.json>): drive EVERY shot in the evidence contract and prove each
//      one is (a) not a duplicate of the default view, and (b) not a duplicate of another shot.
//      This is the check that validates the SPEC against the IMPLEMENTATION. In this project the
//      spec's `deterministic_query_states.view` vocabulary is implemented as `camera=` — `view=` is
//      a LAYER FILTER — and the app's parser resets the ENTIRE state to defaults on one unknown
//      value of a known key. So capturing with the spec's literal URLs yields N pictures of the
//      default camera, under N different filenames, with a clean console and a green exit.
//      P3 validates the spec against itself. NOTHING validated it against the app. This does.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

// Keep this in lockstep with capture.mjs/probe.mjs — the preflight must run the SAME browser the
// gate will, or it proves nothing about the gate.
const CHROME = process.env.CHROME_PATH
  || '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const PORT = process.env.PORT || 8123;

const args = process.argv.slice(2);
const distinctAt = args.indexOf('--distinct');
const contractAt = args.indexOf('--contract');
const FILE = args[0];
const DISTINCT = distinctAt >= 0 ? args.slice(distinctAt + 1, distinctAt + 3) : [];
const CONTRACT = contractAt >= 0 ? JSON.parse(fs.readFileSync(args[contractAt + 1], 'utf8')) : null;
if (!FILE) {
  console.error('usage: node research/tools/preflight.mjs <file.html> [--distinct "<qA>" "<qB>"] [--contract <shots.json>]');
  process.exit(2);
}

const problems = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { problems.push(m); console.log(`  FAIL ${m}`); };

const base = `http://localhost:${PORT}/`;
const url = (q) => base + encodeURIComponent(FILE).replace(/%2F/g, '/') + (q ? (q.startsWith('?') ? q : '?' + q) : '');

console.log(`preflight: ${FILE}`);

// 1. server
try {
  const res = await fetch(url(''));
  res.ok ? ok(`server ${res.status} at :${PORT}`) : bad(`server returned ${res.status}`);
} catch (e) {
  bad(`server unreachable at :${PORT} — start it at the REPO ROOT (never file://): ${e.message}`);
  console.log('\npreflight: FAIL (evidence chain is not usable)');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

async function shoot(query) {
  const page = await browser.newPage();
  // Must match capture.mjs's CSS viewport (960x720). A SMALLER viewport reflows the app's side panel
  // out of frame, so a state whose only visible effect is a DOM overlay reads as pixel-identical to
  // its baseline — the preflight would then report a WORKING state as broken. Measure through the
  // same window the gate will.
  await page.setViewport({ width: 960, height: 720, deviceScaleFactor: 1 });
  const issues = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') issues.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => issues.push(String(e).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) issues.push(`${r.status()} ${r.url()}`); });
  await page.goto(url(query), { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 9000));
  const canvas = await page.$('canvas');
  if (!canvas) { await page.close(); return { issues, png: null }; }
  // Screenshot the whole VIEWPORT, not just the canvas. A state whose only visible effect is a DOM
  // overlay (alarm banner, selection panel, HUD) is pixel-identical to its baseline in a canvas-only
  // shot — so a canvas-only distinctness check would report a WORKING state as broken, and a
  // canvas-only evidence set would hide the entire deliverable of an interaction/UI pass.
  const png = await page.screenshot();
  await page.close();
  return { issues, png };
}

// 2. loads clean
const boot = await shoot('');
if (!boot.png) bad('no <canvas> — the scene did not build');
else ok('page loads, <canvas> present');
if (boot.issues.length) bad(`console/network not clean: ${boot.issues.slice(0, 3).join(' | ')}`);
else ok('console + network clean');

// 3. probe renders something
const probe = spawnSync('node', [path.join(path.dirname(new URL(import.meta.url).pathname), 'probe.mjs'), FILE],
  { encoding: 'utf8' });
try {
  const [p] = JSON.parse(probe.stdout);
  if (!p || p.error) bad(`probe error: ${p?.error ?? 'no output'}`);
  else if (!p.draws) bad(`probe reports 0 draws — nothing is rendering (retry once: SwiftShader shader-compile can stall)`);
  else ok(`probe renders: ${p.draws} draws / ${p.tris} tris`);
} catch { bad('probe produced unparseable output'); }

// 4. DISTINCTNESS — the check that would have caught the silent-reset class of defect
if (DISTINCT.length === 2) {
  const [a, b] = await Promise.all([shoot(DISTINCT[0]), shoot(DISTINCT[1])]);
  const hash = (p) => (p ? crypto.createHash('sha256').update(p).digest('hex').slice(0, 12) : 'none');
  const ha = hash(a.png), hb = hash(b.png);
  if (ha === 'none' || hb === 'none') bad('distinctness: a probe shot produced no canvas');
  else if (ha === hb) {
    bad(`distinctness: "${DISTINCT[0]}" and "${DISTINCT[1]}" render IDENTICAL pixels (${ha}).`);
    console.log('       The query params are NOT taking effect. Every capture in the set would be the');
    console.log('       same default view under a different filename. Check the app\'s param vocabulary:');
    console.log('       one unknown value on a known key can silently reset the WHOLE state to defaults.');
  } else ok(`distinctness: the two query states render different pixels (${ha} != ${hb})`);
} else if (!CONTRACT) {
  console.log('  skip distinctness (pass --distinct "<queryA>" "<queryB>" — the check most worth running)');
}

// 5. CONTRACT — drive every shot in the evidence set and prove each one is real and unique.
if (CONTRACT) {
  if (!Array.isArray(CONTRACT) || CONTRACT.some((s) => !s?.label)) {
    bad('--contract must be a JSON array of {label, query} (the same shots.json capture.mjs takes)');
  } else {
    console.log(`  .. driving ${CONTRACT.length} contract shots (this is slow; it is cheaper than a wasted gate attempt)`);
    const hash = (p) => (p ? crypto.createHash('sha256').update(p).digest('hex').slice(0, 12) : null);
    const defaultH = hash(boot.png);
    const seen = new Map();
    const collapsed = [];
    const dupes = [];
    for (const shot of CONTRACT) {
      const s = await shoot(shot.query ?? '');
      const h = hash(s.png);
      if (!h) { bad(`contract shot "${shot.label}" produced no canvas`); continue; }
      // (a) collapsed to the default view => the query did not take effect (silent state reset,
      //     unimplemented param, wrong vocabulary). The capture would carry a lying filename.
      if (h === defaultH) collapsed.push(shot.label);
      // (b) identical to another shot => two "different" views are the same picture.
      if (seen.has(h)) dupes.push(`${shot.label} == ${seen.get(h)}`);
      else seen.set(h, shot.label);
    }
    if (collapsed.length) {
      bad(`${collapsed.length} contract shot(s) render the DEFAULT view — their query never took effect:`);
      for (const l of collapsed) console.log(`         ${l}`);
      console.log('       These captures would be pictures of the default camera under a lying filename.');
    }
    if (dupes.length) {
      bad(`${dupes.length} contract shot(s) are pixel-identical to another shot:`);
      for (const d of dupes) console.log(`         ${d}`);
    }
    if (!collapsed.length && !dupes.length) {
      ok(`contract: all ${CONTRACT.length} shots render distinct, non-default views`);
    }
  }
}

await browser.close();

console.log(problems.length
  ? `\npreflight: FAIL — ${problems.length} problem(s). Do NOT spend a gate attempt on this evidence chain.`
  : '\npreflight: PASS — the evidence chain is trustworthy.');
process.exit(problems.length ? 1 : 0);
