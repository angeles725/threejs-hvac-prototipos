// tools/capture.mjs — batch high-res screenshot harness for the prototype corpus.
// Extends the tools/probe.mjs pattern (same Puppeteer + SwiftShader recipe, [Block 26]):
// instead of hooking GL calls, this drives the live canvas to a supersampled resolution,
// waits for the scene to settle, then dumps a PNG per file via page.screenshot() (which
// reads the canvas exactly like toDataURL/toBlob would — see [Block 38] §38.1).
//
// Usage: node tools/capture.mjs [--url-suffix "<query>"] <out-dir> <file1.html> [file2.html ...]
// --url-suffix appends a query string to every page URL (e.g. "demo=hotspot", "state=90",
// "view=grazing") so demo/kinematic/look-dev states need no throwaway redirect shim — the
// PAGE must implement reading those params. Positional CLI is unchanged (backward compatible).
// Requires: python3 -m http.server 8123 (or pass PORT env var) running at the repo root,
// and the same --use-angle=swiftshader --enable-unsafe-swiftshader flags as probe.mjs
// (WebGL context creation fails under default flags in this environment, [Block 26] §26.2).
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const PORT = process.env.PORT || 8123;
const rawArgs = process.argv.slice(2);
let URL_SUFFIX = '';
let SHOTS_FILE = '';
let DPR_ARG = null;
// --page captures the whole VIEWPORT (canvas + DOM), not just the <canvas> element.
// The default canvas-only shot is right for geometry/material/lighting passes, and BLIND to
// everything a DOM overlay shows: alarm banners, selection panels, HUD readouts, the control
// panel itself. The interaction-ui pass's entire deliverable lives there — capturing only the
// canvas made its work literally invisible to the reviewer, and made two genuinely different
// states render pixel-identical (found by `preflight --contract`, not by a judge).
let PAGE_MODE = false;
// Default 2, not 4: under SwiftShader the win comes from NOT relaunching Chrome per shot, not from
// concurrency — the rasterizer is CPU-bound, so >2 pages just thrash and time out the CDP channel.
let JOBS = 2;
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--url-suffix') {
    URL_SUFFIX = rawArgs[++i] ?? '';
  } else if (rawArgs[i].startsWith('--url-suffix=')) {
    URL_SUFFIX = rawArgs[i].slice('--url-suffix='.length);
  } else if (rawArgs[i] === '--shots') {
    SHOTS_FILE = rawArgs[++i] ?? '';
  } else if (rawArgs[i].startsWith('--shots=')) {
    SHOTS_FILE = rawArgs[i].slice('--shots='.length);
  } else if (rawArgs[i] === '--jobs') {
    JOBS = Number(rawArgs[++i]);
  } else if (rawArgs[i].startsWith('--jobs=')) {
    JOBS = Number(rawArgs[i].slice('--jobs='.length));
  } else if (rawArgs[i] === '--dpr') {
    DPR_ARG = Number(rawArgs[++i]);
  } else if (rawArgs[i].startsWith('--dpr=')) {
    DPR_ARG = Number(rawArgs[i].slice('--dpr='.length));
  } else if (rawArgs[i] === '--page') {
    PAGE_MODE = true;
  } else {
    positional.push(rawArgs[i]);
  }
}
if (URL_SUFFIX && !URL_SUFFIX.startsWith('?')) URL_SUFFIX = '?' + URL_SUFFIX;
if (!Number.isInteger(JOBS) || JOBS < 1) {
  console.error('--jobs must be a positive integer');
  process.exit(2);
}
const [OUT_DIR, ...FILES] = positional;
if (!OUT_DIR || FILES.length === 0) {
  console.error('usage: node tools/capture.mjs [--url-suffix "<query>"] [--shots <shots.json>] [--jobs N] <out-dir> <file1.html> [file2.html ...]');
  console.error('  --shots <file>: JSON array of {"label": "<out-basename>", "query": "<url query>"} — one page per');
  console.error('    entry against the FIRST html, captured to <label>.png/<label>.console.json. Reuses one browser');
  console.error('    and runs --jobs pages concurrently (default 4). A gate evidence set is one invocation, not N.');
  process.exit(2);
}

// A gate evidence set is 20+ views. Capturing them as N separate processes pays the browser
// launch + 9s scene soak N times, serially. --shots pipelines them through one browser.
let SHOTS = null;
if (SHOTS_FILE) {
  SHOTS = JSON.parse(fs.readFileSync(SHOTS_FILE, 'utf8'));
  if (!Array.isArray(SHOTS) || SHOTS.some((s) => !s?.label)) {
    console.error('--shots must be a JSON array of {label, query}');
    process.exit(2);
  }
  // Duplicate labels silently overwrite each other: the file count still looks right, so a set of
  // 24 shots can contain 23 distinct views and nobody notices. Fail instead.
  const dupes = SHOTS.map((s) => s.label).filter((l, i, a) => a.indexOf(l) !== i);
  if (dupes.length) {
    console.error(`--shots has duplicate labels (they would silently overwrite): ${[...new Set(dupes)].join(', ')}`);
    process.exit(2);
  }
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// Standardized shot spec ([Block 37] thumbnail spec, planned): 4K-equivalent framebuffer via
// setSize + setPixelRatio, CSS viewport kept modest so layout/camera aspect stay stable.
//
// DPR is the single biggest cost in this harness: SwiftShader rasterizes on the CPU, so cost scales
// with PIXELS. DPR 4 = 7.0 MP/shot. But a blind vision reviewer consumes the image DOWNSCALED to
// ~2000 px on its long edge — so at DPR 4 nearly half the pixels we pay for are thrown away before
// anyone looks at them, and the downscale itself has already cost this project attempts (it made
// present-but-small arrowheads read as ABSENT).
//   --dpr 3  -> ~2064 px long edge: everything the judge can actually consume, ~56% of the raster cost.
//   --dpr 4  -> the P7 hero / catalog thumbnail, and native-resolution crops of fine detail.
// Default stays 4 (house spec); gate evidence sets should pass --dpr 3.
const CSS_W = 960, CSS_H = 720;
const DPR = DPR_ARG ?? 4;
if (!Number.isFinite(DPR) || DPR < 1 || DPR > 4) {
  console.error('--dpr must be between 1 and 4');
  process.exit(2);
}
console.error(`[capture] DPR ${DPR} -> ${CSS_W * DPR}x${CSS_H * DPR} (${(CSS_W * DPR * CSS_H * DPR / 1e6).toFixed(1)} MP/shot)`);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  // SwiftShader is CPU-rasterized: a 3840x2880 screenshot is slow, and concurrent pages contend for
  // the same cores. The default 180s CDP protocolTimeout fires under that load and kills the shot.
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', `--window-size=${CSS_W},${CSS_H}`],
});

async function capture(f, suffix, base) {
  const page = await browser.newPage();
  await page.setViewport({ width: CSS_W, height: CSS_H, deviceScaleFactor: DPR });
  // Console evidence sidecar: collect error/warning console messages and uncaught page
  // exceptions so gate reviews can verify "console clean" from a real artifact instead of
  // inferring it from a successful capture.
  const consoleIssues = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') consoleIssues.push({ type: t, text: m.text().slice(0, 300) });
  });
  page.on('pageerror', (e) => consoleIssues.push({ type: 'pageerror', text: String(e).slice(0, 300) }));
  // Network blindness fix: console+pageerror alone miss failed/4xx-5xx resource loads (e.g. a
  // 404'd CDN asset), which can leave console_clean:true even though the scene is broken.
  // favicon.ico is a browser-automatic request the page never asked for; a 404 there is not a
  // scene defect and must not poison console_clean.
  const isFavicon = (u) => {
    try { return new URL(u).pathname === '/favicon.ico'; } catch { return false; }
  };
  page.on('requestfailed', (req) => {
    if (isFavicon(req.url())) return;
    consoleIssues.push({
      type: 'network', text: `${req.failure()?.errorText || 'failed'} ${req.url()}`.slice(0, 300),
    });
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !isFavicon(res.url())) {
      consoleIssues.push({ type: 'network', text: `${res.status()} ${res.url()}`.slice(0, 300) });
    }
  });
  const url = `http://localhost:${PORT}/` + encodeURIComponent(f).replace(/%2F/g, '/') + suffix;
  const result = {};
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    // `load` fires BEFORE the app's module has created the renderer and appended its canvas. The old
    // blind 9s soak papered over this by accident — it slept long enough for the element to appear.
    // Wait for the element explicitly; never assume it is there because the document loaded.
    await page.waitForSelector('canvas', { timeout: 30000 });
    // DO NOT sample the canvas from inside the page. A WebGL drawing buffer is CLEARED after
    // compositing unless `preserveDrawingBuffer: true` (which the app does not set, and should not —
    // it costs perf). An in-page `drawImage(canvas)` therefore reads a BLANK buffer: it reports every
    // frame as uniform, and a hash of that blank read is constant, so a "wait until the frame stops
    // changing" loop built on it declares the scene settled IMMEDIATELY. I built exactly that and it
    // flagged 11 of 24 real scenes as blank. A readiness check that reads the wrong buffer is worse
    // than no check: it is a confident lie.
    //
    // Puppeteer's screenshot goes through the browser's COMPOSITOR, which sees the real frame. So the
    // only trustworthy sample is a screenshot. Settle on cheap ones, then take the real capture.
    await new Promise((r) => setTimeout(r, 4000)); // floor: let the module boot and compile shaders
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) throw new Error('no <canvas> found');
    // Settle on a small CLIP, not the full frame. The clip goes through the same compositor (so it
    // sees the real pixels, unlike an in-page canvas read) but rasterizes ~2000x fewer of them.
    // Sampling the FULL 6.2 MP frame up to 8x per shot to decide when to take one more 6.2 MP frame
    // cost 31 min for a 24-shot set — 3x slower than the naive sleep it replaced. A readiness check
    // must be cheap or it becomes the cost it was meant to save.
    const box = await canvasHandle.boundingBox();
    const clip = box
      ? { x: box.x + box.width / 4, y: box.y + box.height / 4, width: 96, height: 96 }
      : null;
    let settled = false;
    let prev = null;
    for (let t = 0; t < 8 && !settled; t++) {
      const buf = clip
        ? await page.screenshot({ clip, encoding: 'binary' })
        : await canvasHandle.screenshot({ encoding: 'binary' });
      const h = crypto.createHash('sha1').update(buf).digest('hex');
      if (prev === h) settled = true;
      prev = h;
      if (!settled) await new Promise((r) => setTimeout(r, 1200));
    }
    if (!settled) {
      consoleIssues.push({ type: 'capture', text: 'frame never stopped changing — the capture may be half-built' });
    }
    const outPath = path.join(OUT_DIR, `${base}.png`);
    // page.screenshot()/elementHandle.screenshot() read the composited canvas the same way
    // canvas.toBlob() does; no extra renderer flags needed for this path since Puppeteer
    // captures via the browser's own frame, not toDataURL() — see [Block 38] §38.1 note on
    // why preserveDrawingBuffer only matters for in-page toDataURL()/toBlob() calls.
    if (PAGE_MODE) await page.screenshot({ path: outPath });
    else await canvasHandle.screenshot({ path: outPath });
    // Uniformity check on the SAVED artifact — free, because the file already exists. A PNG of a
    // blank/black frame compresses to almost nothing; a real scene here is 300-500 KB.
    const bytes = fs.statSync(outPath).size;
    if (bytes < 12000) {
      consoleIssues.push({ type: 'capture', text: `frame is UNIFORM (${bytes} B PNG) — a blank/black render, not a scene` });
    }
    Object.assign(result, { file: f, out: outPath, bytes, w: CSS_W * DPR, h: CSS_H * DPR });
  } catch (e) {
    Object.assign(result, { file: f, error: String(e).slice(0, 200) });
    // A failed capture (goto timeout, missing canvas) must never yield a clean-looking
    // sidecar: record the harness failure itself so console_clean goes false.
    consoleIssues.push({ type: 'capture', text: String(e).slice(0, 300) });
  }
  const consolePath = path.join(OUT_DIR, `${base}.console.json`);
  // Record the URL that produced this artifact. Without it a sidecar cannot betray a broken shots
  // manifest: every file claims `index.html` and nothing says WHICH view it actually is, so a set
  // of 24 pictures of the default camera looks exactly like a correct set.
  fs.writeFileSync(consolePath, JSON.stringify({
    file: f,
    url,
    query: suffix || null,
    console_clean: consoleIssues.length === 0,
    issues: consoleIssues,
  }, null, 1));
  console.error(`[console] ${base}: ${consoleIssues.length === 0 ? 'clean' : consoleIssues.length + ' issue(s)'} -> ${consolePath}`);
  await page.close();
  return result;
}

// Bounded-concurrency pool: SwiftShader is CPU-bound, so more pages than cores just thrashes.
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  }));
  return out;
}

const jobs = SHOTS
  ? SHOTS.map((s) => {
    let q = s.query ?? '';
    if (q && !q.startsWith('?')) q = '?' + q;
    return { f: FILES[0], suffix: q, base: s.label };
  })
  : FILES.map((f) => ({ f, suffix: URL_SUFFIX, base: path.basename(f).replace(/\.html?$/i, '') }));

const results = await pool(jobs, JOBS, (j) => capture(j.f, j.suffix, j.base));
console.log(JSON.stringify(results, null, 1));
await browser.close();

// FAIL LOUD. A partial evidence set that exits 0 is the worst failure mode this harness has: the
// caller ships 14 of 24 shots to a blind reviewer and gets a confident verdict on broken evidence.
// Exit non-zero if ANY shot failed, and say how many.
const failed = results.filter((r) => r.error);
console.error(`[capture] ${results.length - failed.length}/${results.length} captured`
  + (failed.length ? ` — ${failed.length} FAILED` : ''));
if (failed.length) {
  for (const f of failed) console.error(`[capture] FAILED ${f.file}: ${f.error}`);
  console.error('[capture] EVIDENCE SET IS INCOMPLETE — do not gate on it.');
  process.exit(1);
}
