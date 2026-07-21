// tools/extract-pbr.mjs — reference-PBR evidence extractor for the design3d pipeline.
//
// Ported from Object Sculptor's extract_reference_pbr.py (vendored verbatim at
// research/sources/design3d-skill/object-sculptor/scripts/extract_reference_pbr.py;
// mechanism summary in research/sources/design3d-skill/NOTES-object-sculptor.md §8).
// This is NOT photogrammetry: it extracts pixel evidence useful for procedural PBR —
// background mask from corner-median color, k-means albedo palette of the de-lit
// foreground, a roughness heuristic, a near-binary metalness hint per cluster, and a
// CONFIDENCE score hard-capped at 0.86 for a single image. Below 0.7 it exits 1 and
// refuses (matching the python's refusal behavior) unless --allow-low-confidence.
//
// Usage: node research/tools/extract-pbr.mjs <image.(png|jpg)> [--allow-low-confidence] [--clusters N]
// Output: JSON to stdout {source, confidence, warnings[], palette[{hex, share,
//   metalness_hint, roughness_est}], albedo_notes} — cite in design-spec.yaml
//   materials[] as source: extracted + confidence.
//
// Image decoding: zero-dep — the image is decoded into raw RGBA via a 2D canvas inside
// headless Chrome (puppeteer-core, same SwiftShader-safe launch recipe as capture.mjs),
// so no PNG/JPG library is needed. No local HTTP server required (data-URI page).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME ||
  '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const ANALYSIS_SIZE = 1024;   // resampled crop size, same default as the python (--size 1024)
const DECODE_MAX_DIM = 1600;  // decode-side downscale cap (keeps page->node transfer bounded)
const SAMPLE_LIMIT = 7000;    // representative_samples limit (python)
const KMEANS_ITERATIONS = 8;  // kmeans_palette iterations (python)
const SINGLE_IMAGE_CAP = 0.86;
const TARGET_THRESHOLD = 0.7;

// ---------- CLI ----------
const rawArgs = process.argv.slice(2);
let allowLow = false;
let clusters = 5;
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--allow-low-confidence') allowLow = true;
  else if (a === '--clusters') clusters = Number(rawArgs[++i]);
  else if (a.startsWith('--clusters=')) clusters = Number(a.slice('--clusters='.length));
  else positional.push(a);
}
const imagePath = positional[0];
if (!imagePath || !/\.(png|jpe?g)$/i.test(imagePath)) {
  console.error('usage: node research/tools/extract-pbr.mjs <image.(png|jpg)> [--allow-low-confidence] [--clusters N]');
  process.exit(2);
}
if (!fs.existsSync(imagePath)) {
  console.error(`error: ${imagePath} does not exist`);
  process.exit(2);
}
clusters = Math.max(2, Math.min(6, Number.isFinite(clusters) ? Math.round(clusters) : 5));

// ---------- small helpers (ports of the python helpers) ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => clamp(v, 0, 1);
const srgbLuma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const colorDistance = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const saturation = (r, g, b) => {
  const hi = Math.max(r, g, b);
  return hi <= 0 ? 0 : (hi - Math.min(r, g, b)) / hi;
};
const percentile = (values, fraction, fallback = 0) => {
  if (!values.length) return fallback;
  const ordered = [...values].sort((x, y) => x - y);
  return ordered[Math.round(clamp01(fraction) * (ordered.length - 1))];
};
const medianColor = (samples) => {
  if (!samples.length) return [255, 255, 255];
  return [0, 1, 2].map((c) => Math.round(percentile(samples.map((s) => s[c]), 0.5)));
};
const rgbToHex = (rgb) =>
  '#' + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0').toUpperCase()).join('');

// ---------- image decode via headless-Chrome canvas ----------
async function decodeImage(file) {
  const abs = path.resolve(file);
  const mime = /\.png$/i.test(abs) ? 'image/png' : 'image/jpeg';
  const dataUri = `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const out = await page.evaluate(async (uri, maxDim) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('browser could not decode the image'));
        img.src = uri;
      });
      const sw = img.naturalWidth, sh = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let bin = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < data.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, data.subarray(i, Math.min(i + CHUNK, data.length)));
      }
      return { sourceWidth: sw, sourceHeight: sh, width: w, height: h, b64: btoa(bin) };
    }, dataUri, DECODE_MAX_DIM);
    return { ...out, rgba: Buffer.from(out.b64, 'base64') };
  } finally {
    await browser.close();
  }
}

// ---------- 1. background mask from corner-median color ----------
function sampleCornerBackground(width, height, rgba) {
  const radius = Math.max(3, Math.floor(Math.min(width, height) / 40));
  const samples = [];
  const ranges = [
    [0, radius, 0, radius],
    [width - radius, width, 0, radius],
    [0, radius, height - radius, height],
    [width - radius, width, height - radius, height],
  ];
  for (const [x0, x1, y0, y1] of ranges) {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) {
        const i = (y * width + x) * 4;
        if (rgba[i + 3] > 16) samples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
      }
    }
  }
  const background = medianColor(samples);
  const noise = percentile(samples.map((s) => colorDistance(s, background)), 0.75, 0);
  return { background, noise };
}

function buildForegroundMask(width, height, rgba) {
  const warnings = [];
  const n = width * height;
  let transparent = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 245) transparent++;
  const transparentFraction = transparent / Math.max(1, n);
  const { background, noise } = sampleCornerBackground(width, height, rgba);
  const threshold = Math.max(24, noise * 2.4);
  let mask = new Uint8Array(n);
  if (transparentFraction > 0.03) {
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4 + 3] > 24 ? 1 : 0;
  } else {
    for (let i = 0; i < n; i++) {
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
      const distance = colorDistance([r, g, b], background);
      const sat = saturation(r, g, b);
      const luma = srgbLuma(r, g, b);
      mask[i] = a > 16 && (distance > threshold || (sat > 0.16 && luma < 0.94)) ? 1 : 0;
    }
  }
  let coverage = mask.reduce((s, v) => s + v, 0) / Math.max(1, n);
  if (coverage < 0.035) {
    warnings.push('foreground mask is tiny; material extraction is likely unreliable');
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4 + 3] > 16 ? 1 : 0;
    coverage = mask.reduce((s, v) => s + v, 0) / Math.max(1, n);
  }
  if (coverage > 0.9) {
    warnings.push('image is not clearly isolated from background; using most pixels as material evidence');
  }
  return { mask, background, coverage, warnings };
}

function maskBbox(width, height, mask) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return [0, 0, width, height];
  const padding = Math.max(2, Math.floor(Math.min(width, height) / 80));
  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const x1 = Math.min(width, maxX + padding + 1);
  const y1 = Math.min(height, maxY + padding + 1);
  return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
}

function resampleCrop(width, height, rgba, mask, bbox, size) {
  const [x0, y0, cw, ch] = bbox;
  const pixels = new Uint8ClampedArray(size * size * 3);
  const outMask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    const sy = clamp(Math.floor(y0 + (y + 0.5) * ch / size), 0, height - 1);
    for (let x = 0; x < size; x++) {
      const sx = clamp(Math.floor(x0 + (x + 0.5) * cw / size), 0, width - 1);
      const src = (sy * width + sx) * 4;
      const dst = y * size + x;
      pixels[dst * 3] = rgba[src];
      pixels[dst * 3 + 1] = rgba[src + 1];
      pixels[dst * 3 + 2] = rgba[src + 2];
      outMask[dst] = mask[sy * width + sx] && rgba[src + 3] > 16 ? 1 : 0;
    }
  }
  return { pixels, mask: outMask };
}

// ---------- separable box blur (port of blur_scalar) ----------
function blurScalar(values, size, radius) {
  if (radius <= 0) return Float64Array.from(values);
  const horizontal = new Float64Array(size * size);
  for (let y = 0; y < size; y++) {
    const off = y * size;
    let running = 0, count = 0;
    for (let x = -radius; x < size + radius; x++) {
      if (x >= 0 && x < size) { running += values[off + x]; count++; }
      const remove = x - radius * 2 - 1;
      if (remove >= 0 && remove < size) { running -= values[off + remove]; count--; }
      const writeX = x - radius;
      if (writeX >= 0 && writeX < size) horizontal[off + writeX] = running / Math.max(1, count);
    }
  }
  const vertical = new Float64Array(size * size);
  for (let x = 0; x < size; x++) {
    let running = 0, count = 0;
    for (let y = -radius; y < size + radius; y++) {
      if (y >= 0 && y < size) { running += horizontal[y * size + x]; count++; }
      const remove = y - radius * 2 - 1;
      if (remove >= 0 && remove < size) { running -= horizontal[remove * size + x]; count--; }
      const writeY = y - radius;
      if (writeY >= 0 && writeY < size) vertical[writeY * size + x] = running / Math.max(1, count);
    }
  }
  return vertical;
}

// ---------- 3+4. de-lit albedo, height field, roughness heuristic (port of make_maps) ----------
function analyzeSurface(pixels, mask, size) {
  const n = size * size;
  const maskedLumas = [];
  const lumas = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const l = srgbLuma(pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]);
    lumas[i] = l;
    if (mask[i]) maskedLumas.push(l);
  }
  const fallbackLuma = percentile(maskedLumas, 0.5, 0.55);
  for (let i = 0; i < n; i++) if (!mask[i]) lumas[i] = fallbackLuma;
  const blurRadius = Math.max(4, Math.min(28, Math.floor(size / 48)));
  const lowFrequency = blurScalar(lumas, size, blurRadius);
  const p05 = percentile(maskedLumas, 0.05, 0.2);
  const p95 = percentile(maskedLumas, 0.95, 0.8);
  const valueRange = Math.max(0.08, p95 - p05);
  const highPass = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    highPass[i] = clamp((lumas[i] - lowFrequency[i] + valueRange * 0.5) / valueRange, 0, 1);
  }
  const height = blurScalar(highPass, size, Math.max(1, Math.floor(size / 256)));
  const gradients = new Float64Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = height[y * size + Math.max(0, x - 1)];
      const right = height[y * size + Math.min(size - 1, x + 1)];
      const up = height[Math.max(0, y - 1) * size + x];
      const down = height[Math.min(size - 1, y + 1) * size + x];
      gradients[y * size + x] = Math.sqrt((right - left) ** 2 + (down - up) ** 2);
    }
  }
  const gradP90 = percentile(Array.from(gradients), 0.9, 0);
  // De-lit albedo (python: scale = clamp((fallbackLuma / shade) ** 0.42, 0.72, 1.35))
  const delit = new Uint8ClampedArray(n * 3);
  const roughness = new Float64Array(n);
  const roughSamples = [];
  for (let i = 0; i < n; i++) {
    const shade = clamp(lowFrequency[i], 0.08, 1);
    const scale = clamp((fallbackLuma / shade) ** 0.42, 0.72, 1.35);
    delit[i * 3] = pixels[i * 3] * scale;
    delit[i * 3 + 1] = pixels[i * 3 + 1] * scale;
    delit[i * 3 + 2] = pixels[i * 3 + 2] * scale;
    const brightHighlight = Math.max(0, lumas[i] - p95) / Math.max(0.02, 1 - p95);
    const rough = clamp01(
      0.68 + Math.min(0.22, gradients[i] * 2.6) + (0.5 - height[i]) * 0.12 - brightHighlight * 0.22);
    roughness[i] = rough;
    if (mask[i]) roughSamples.push(rough);
  }
  return {
    delit, roughness, lumas, valueRange,
    heightP90Gradient: gradP90,
    roughnessBase: percentile(roughSamples, 0.5, 0.72),
    fallbackLuma,
  };
}

// ---------- 2. k-means palette over de-lit foreground samples ----------
function representativeIndices(mask, n, limit = SAMPLE_LIMIT) {
  let candidates = [];
  for (let i = 0; i < n; i++) if (mask[i]) candidates.push(i);
  if (!candidates.length) candidates = Array.from({ length: n }, (_, i) => i);
  if (candidates.length <= limit) return candidates;
  const step = Math.max(1, Math.floor(candidates.length / limit));
  const picked = [];
  for (let i = 0; i < candidates.length && picked.length < limit; i += step) picked.push(candidates[i]);
  return picked;
}

function kmeansClusters(samples, k) {
  if (!samples.length) return { centers: [[138, 122, 95]], assignment: [] };
  const ordered = [...samples].sort((a, b) => {
    const la = srgbLuma(a[0], a[1], a[2]), lb = srgbLuma(b[0], b[1], b[2]);
    return la - lb || a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  });
  let centers = Array.from({ length: k }, (_, i) =>
    ordered[Math.floor((i + 0.5) * (ordered.length - 1) / k)].slice());
  const nearest = (s) => {
    let best = 0, bestD = Infinity;
    for (let c = 0; c < centers.length; c++) {
      const d = colorDistance(s, centers[c]);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };
  let assignment = new Array(samples.length).fill(0);
  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i++) {
      const c = nearest(samples[i]);
      assignment[i] = c;
      sums[c][0] += samples[i][0]; sums[c][1] += samples[i][1];
      sums[c][2] += samples[i][2]; sums[c][3]++;
    }
    centers = centers.map((center, c) => sums[c][3]
      ? [0, 1, 2].map((ch) => Math.round(sums[c][ch] / sums[c][3]))
      : center);
  }
  for (let i = 0; i < samples.length; i++) assignment[i] = nearest(samples[i]);
  return { centers, assignment };
}

// ---------- 4b. per-cluster metalness hint (near-binary suggestion) ----------
// Adaptation: the python extractor emits no metalness; the design3d spec needs a near-binary
// hint (DESIGNSPEC rule 2: 0.0-0.05 dielectrics, 0.85-1.0 bare metals). Heuristic: a cluster
// reads as bare metal when its de-lit color is desaturated (grey), sits in the mid-luma band,
// and shows real specular luma variation (glints); everything else is dielectric.
function metalnessHint(center, clusterLumas) {
  const sat = saturation(center[0], center[1], center[2]);
  const luma = srgbLuma(center[0], center[1], center[2]);
  if (!clusterLumas.length) return 0;
  const mean = clusterLumas.reduce((s, v) => s + v, 0) / clusterLumas.length;
  const std = Math.sqrt(clusterLumas.reduce((s, v) => s + (v - mean) ** 2, 0) / clusterLumas.length);
  return sat < 0.2 && luma >= 0.25 && luma <= 0.9 && std > 0.07 ? 0.9 : 0.0;
}

// ---------- 5. confidence (port of estimate_confidence; single-image cap 0.86) ----------
function estimateConfidence(sourceWidth, sourceHeight, coverage, stats, warnings) {
  const notes = [];
  const resolutionScore = clamp(Math.min(sourceWidth, sourceHeight) / 1024, 0.35, 1);
  let maskScore;
  if (coverage >= 0.08 && coverage <= 0.82) maskScore = 1;
  else if (coverage >= 0.035 && coverage < 0.08) { maskScore = 0.55; notes.push('foreground mask is very small'); }
  else if (coverage > 0.9) { maskScore = 0.68; notes.push('object/background separation is weak'); }
  else maskScore = 0.78;
  const dynamicScore = clamp(stats.valueRange / 0.48, 0.35, 1);
  const detailScore = clamp(stats.heightP90Gradient * 52, 0.35, 1);
  const warningPenalty = Math.min(0.16, warnings.length * 0.035);
  let confidence = 0.44 + resolutionScore * 0.14 + maskScore * 0.14 +
    dynamicScore * 0.12 + detailScore * 0.16 - warningPenalty;
  confidence = Math.min(SINGLE_IMAGE_CAP, clamp01(confidence));
  notes.push('single-image inverse rendering cannot prove true physical PBR; confidence is capped');
  if (dynamicScore < 0.5) notes.push('low value range weakens height/roughness inference');
  if (detailScore < 0.5) notes.push('low high-frequency detail weakens normal/roughness inference');
  return { confidence: Math.round(confidence * 1000) / 1000, notes };
}

// ---------- main ----------
const decoded = await decodeImage(imagePath);
const { sourceWidth, sourceHeight, width, height, rgba } = decoded;
const { mask, background, coverage, warnings } = buildForegroundMask(width, height, rgba);
const bbox = maskBbox(width, height, mask);
const crop = resampleCrop(width, height, rgba, mask, bbox, ANALYSIS_SIZE);
const stats = analyzeSurface(crop.pixels, crop.mask, ANALYSIS_SIZE);

const sampleIdx = representativeIndices(crop.mask, ANALYSIS_SIZE * ANALYSIS_SIZE);
const samples = sampleIdx.map((i) => [stats.delit[i * 3], stats.delit[i * 3 + 1], stats.delit[i * 3 + 2]]);
const { centers, assignment } = kmeansClusters(samples, clusters);

const clusterRough = centers.map(() => []);
const clusterLumas = centers.map(() => []);
const clusterCounts = new Array(centers.length).fill(0);
for (let s = 0; s < samples.length; s++) {
  const c = assignment[s], i = sampleIdx[s];
  clusterCounts[c]++;
  clusterRough[c].push(stats.roughness[i]);
  clusterLumas[c].push(stats.lumas[i]);
}
const palette = centers
  .map((center, c) => ({
    hex: rgbToHex(center),
    share: Math.round((clusterCounts[c] / Math.max(1, samples.length)) * 1000) / 1000,
    metalness_hint: metalnessHint(center, clusterLumas[c]),
    roughness_est: Math.round(percentile(clusterRough[c], 0.5, stats.roughnessBase) * 1000) / 1000,
  }))
  .filter((entry) => entry.share > 0)
  .sort((a, b) => b.share - a.share);

const { confidence, notes } = estimateConfidence(sourceWidth, sourceHeight, coverage, stats, warnings);
const allWarnings = [...warnings, ...notes];
const report = {
  source: path.resolve(imagePath),
  confidence,
  warnings: allWarnings,
  palette,
  albedo_notes:
    `De-lit estimate: pixels divided by blurred low-frequency luma^0.42 (scale clamped 0.72-1.35, ` +
    `median foreground luma ${stats.fallbackLuma.toFixed(3)}) to reduce baked shadows/highlights; ` +
    `palette clustered from ${samples.length} de-lit foreground samples ` +
    `(coverage ${coverage.toFixed(3)}, background ${rgbToHex(background)}, ` +
    `source ${sourceWidth}x${sourceHeight}, luma range ${stats.valueRange.toFixed(3)}). ` +
    `Single-image evidence, not inverse rendering: verify against neutral + grazing renders.`,
};
console.log(JSON.stringify(report, null, 2));
if (confidence < TARGET_THRESHOLD && !allowLow) {
  console.error(
    `low confidence (${confidence} < ${TARGET_THRESHOLD}) — provide better reference or pass --allow-low-confidence`);
  process.exit(1);
}
