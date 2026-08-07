#!/usr/bin/env node
// tools/material-color-probe.mjs — objective material-read anchor for the design3d materials gate.
//
// WHY: the blind-reviewer "does bare metal read satin" judgement is reviewer-variance-dominated —
// two reviewers scored the SAME stainless render (mean gray 91.4 vs 91.6) 0.80 PASS vs 0.57 FAIL
// (research/threejs-block53.md). This probe replaces the guess on the COLOUR/VALUE axis with a
// deterministic number: it measures the mean sRGB of a declared crop off the capture.mjs PNG and
// computes the CIEDE2000 (dE00) distance to a target colour (spec-declared, or a golden render's crop).
// The model still judges IDENTITY (is it the right shape/part); the SCRIPT judges the value.
//
// The sRGB→CIELAB + CIEDE2000 math below is ADAPTED from img2threejs (Apache-2.0, © 2026 hoainho),
// file forge/_shared/color_metrics.py — preserved at research/sources/upstream/. Modified: ported to
// JS and driven against a spec-declared target instead of a reference photo. No other upstream code.
//
// Usage:
//   node tools/material-color-probe.mjs <png> --crop WxH+X+Y --target R,G,B [--max 6.0]
//   node tools/material-color-probe.mjs <png> --crop WxH+X+Y --target-png <ref.png> --target-crop WxH+X+Y [--max 6.0]
//   node tools/material-color-probe.mjs --de R,G,B R,G,B          # just dE00 between two sRGB triples
// Prints one JSON object; exit 0 = pass (dE00 <= max), exit 1 = fail, exit 2 = usage/measure error.
// Measurement backend: ImageMagick `convert` (mean of the crop). Requires `convert` on PATH.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// ---- CIEDE2000 (adapted from img2threejs color_metrics.py, Apache-2.0 © 2026 hoainho) ----
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const XN = 95.047, YN = 100.0, ZN = 108.883;
function srgbToLab([r, g, b]) {
  r = lin(r); g = lin(g); b = lin(b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100.0;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100.0;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16.0 / 116.0);
  const fx = f(x / XN), fy = f(y / YN), fz = f(z / ZN);
  return [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)];
}
function ciede2000([l1, a1, b1], [l2, a2, b2]) {
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cbar = (c1 + c2) / 2.0;
  const g = cbar > 0 ? 0.5 * (1.0 - Math.sqrt(cbar ** 7 / (cbar ** 7 + 25.0 ** 7))) : 0.0;
  const a1p = (1.0 + g) * a1, a2p = (1.0 + g) * a2;
  const c1p = Math.hypot(a1p, b1), c2p = Math.hypot(a2p, b2);
  const hp = (ap, bp) => { if (ap === 0 && bp === 0) return 0; const d = Math.atan2(bp, ap) * 180 / Math.PI; return d < 0 ? d + 360 : d; };
  const h1p = hp(a1p, b1), h2p = hp(a2p, b2);
  const dLp = l2 - l1, dCp = c2p - c1p;
  let dhp;
  if (c1p * c2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2.0 * Math.sqrt(c1p * c2p) * Math.sin((dhp * Math.PI / 180) / 2.0);
  const Lpbar = (l1 + l2) / 2.0, Cpbar = (c1p + c2p) / 2.0;
  let hpbar;
  if (c1p * c2p === 0) hpbar = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hpbar = (h1p + h2p) / 2.0;
  else if (h1p + h2p < 360) hpbar = (h1p + h2p + 360) / 2.0;
  else hpbar = (h1p + h2p - 360) / 2.0;
  const t = 1.0
    - 0.17 * Math.cos((hpbar - 30.0) * Math.PI / 180)
    + 0.24 * Math.cos((2.0 * hpbar) * Math.PI / 180)
    + 0.32 * Math.cos((3.0 * hpbar + 6.0) * Math.PI / 180)
    - 0.20 * Math.cos((4.0 * hpbar - 63.0) * Math.PI / 180);
  const dTheta = 30.0 * Math.exp(-(((hpbar - 275.0) / 25.0) ** 2));
  const rc = Cpbar > 0 ? 2.0 * Math.sqrt(Cpbar ** 7 / (Cpbar ** 7 + 25.0 ** 7)) : 0.0;
  const sl = 1.0 + (0.015 * (Lpbar - 50.0) ** 2) / Math.sqrt(20.0 + (Lpbar - 50.0) ** 2);
  const sc = 1.0 + 0.045 * Cpbar;
  const sh = 1.0 + 0.015 * Cpbar * t;
  const rt = -Math.sin((2.0 * dTheta) * Math.PI / 180) * rc;
  return Math.sqrt((dLp / sl) ** 2 + (dCp / sc) ** 2 + (dHp / sh) ** 2 + rt * (dCp / sc) * (dHp / sh));
}
const deltaE = (a, b) => ciede2000(srgbToLab(a), srgbToLab(b));

// ---- crop mean sRGB via ImageMagick ----
function meanSRGB(png, crop) {
  // crop is ImageMagick geometry "WxH+X+Y"; returns [r,g,b] in 0..255
  const out = execFileSync('convert', [png, '-crop', crop, '+repage',
    '-format', '%[fx:mean.r*255],%[fx:mean.g*255],%[fx:mean.b*255]', 'info:'], { encoding: 'utf8' });
  const parts = out.trim().split(',').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`bad convert output: ${out}`);
  return parts;
}

// ---- spec colorTarget parse (loose YAML, same shape gate-state.mjs reads) ----
// colorTarget:
//   srgb: [86, 92, 97]
//   deltaE00Max: 6.0
//   crop: "500x140+1300+780"
function parseSpecColorTarget(specText) {
  // Loose-YAML reads tolerate a trailing `# comment` (matches gate-state.mjs).
  const srgbM = specText.match(/^\s*srgb:\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\](?:\s*#.*)?$/m);
  const maxM = specText.match(/^\s*deltaE00Max:\s*([\d.]+)(?:\s*#.*)?$/m);
  const cropM = specText.match(/^\s*crop:\s*["']?([\dx+]+)["']?(?:\s*#.*)?$/m);
  return {
    srgb: srgbM ? [Number(srgbM[1]), Number(srgbM[2]), Number(srgbM[3])] : null,
    deltaE00Max: maxM ? Number(maxM[1]) : null,
    crop: cropM ? cropM[1] : null,
  };
}

// ---- inject mechanical.color_delta_e00 into a review JSON (auto-record, no manual edit) ----
function writeReview(reviewPath, de) {
  const j = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  j.mechanical = j.mechanical || {};
  j.mechanical.color_delta_e00 = de;
  fs.writeFileSync(reviewPath, JSON.stringify(j, null, 2) + '\n');
}

// ---- CLI ----
function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
const args = process.argv.slice(2);

try {
  // direct dE00 mode
  if (args[0] === '--de') {
    const a = args[1].split(',').map(Number), b = args[2].split(',').map(Number);
    const de = deltaE(a, b);
    console.log(JSON.stringify({ mode: 'de', a, b, deltaE00: +de.toFixed(4) }));
    process.exit(0);
  }
  const png = args[0];
  // --spec <design-spec.yaml>: auto-read colorTarget (crop/srgb/deltaE00Max) so no manual typing.
  const specPath = argVal(args, '--spec');
  const spec = specPath ? parseSpecColorTarget(fs.readFileSync(specPath, 'utf8')) : {};
  const crop = argVal(args, '--crop') ?? spec.crop;
  if (!png || !crop) { console.error('usage: material-color-probe.mjs <png> (--spec <spec.yaml> | --crop WxH+X+Y) [--target R,G,B | --target-png <ref> --target-crop WxH+X+Y] [--max N] [--write-review <review.json>]'); process.exit(2); }
  const measured = meanSRGB(png, crop).map((v) => +v.toFixed(2));

  let target, targetSrc;
  const tStr = argVal(args, '--target');
  const tpng = argVal(args, '--target-png');
  if (tStr) { target = tStr.split(',').map(Number); targetSrc = 'flag'; }
  else if (tpng) {
    const tcrop = argVal(args, '--target-crop');
    if (!tcrop) { console.error('--target-png needs --target-crop WxH+X+Y'); process.exit(2); }
    target = meanSRGB(tpng, tcrop).map((v) => +v.toFixed(2)); targetSrc = `golden-render:${tpng}`;
  } else if (spec.srgb) { target = spec.srgb; targetSrc = `spec:${specPath}`; }
  else { console.error('need a target: --target R,G,B | --target-png <ref> --target-crop <geom> | --spec <spec with colorTarget.srgb>'); process.exit(2); }

  const max = Number(argVal(args, '--max') ?? spec.deltaE00Max ?? 6.0);
  const de = +deltaE(measured, target).toFixed(4);
  const pass = de <= max;
  const reviewPath = argVal(args, '--write-review');
  if (reviewPath) writeReview(reviewPath, de);
  console.log(JSON.stringify({ mode: 'crop', png, crop, measured, target, targetSrc, deltaE00: de, max, pass, wroteReview: reviewPath || null }, null, 2));
  process.exit(pass ? 0 : 1);
} catch (e) {
  console.error(JSON.stringify({ error: String(e.message || e) }));
  process.exit(2);
}
