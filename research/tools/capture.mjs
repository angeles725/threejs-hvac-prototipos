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

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const PORT = process.env.PORT || 8123;
const rawArgs = process.argv.slice(2);
let URL_SUFFIX = '';
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--url-suffix') {
    URL_SUFFIX = rawArgs[++i] ?? '';
  } else if (rawArgs[i].startsWith('--url-suffix=')) {
    URL_SUFFIX = rawArgs[i].slice('--url-suffix='.length);
  } else {
    positional.push(rawArgs[i]);
  }
}
if (URL_SUFFIX && !URL_SUFFIX.startsWith('?')) URL_SUFFIX = '?' + URL_SUFFIX;
const [OUT_DIR, ...FILES] = positional;
if (!OUT_DIR || FILES.length === 0) {
  console.error('usage: node tools/capture.mjs [--url-suffix "<query>"] <out-dir> <file1.html> [file2.html ...]');
  process.exit(2);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// Standardized shot spec ([Block 37] thumbnail spec, planned): 4K-equivalent framebuffer via
// setSize + setPixelRatio, CSS viewport kept modest so layout/camera aspect stay stable.
const CSS_W = 960, CSS_H = 720, DPR = 4; // -> 3840x2880 framebuffer (supersampled capture)

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', `--window-size=${CSS_W},${CSS_H}`],
});

const results = [];
for (const f of FILES) {
  const page = await browser.newPage();
  await page.setViewport({ width: CSS_W, height: CSS_H, deviceScaleFactor: DPR });
  const base = path.basename(f).replace(/\.html?$/i, '');
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
  const url = `http://localhost:${PORT}/` + encodeURIComponent(f).replace(/%2F/g, '/') + URL_SUFFIX;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    // Let the scene settle (materials/shadows/first frames) before capture — same 9s soak
    // window probe.mjs uses before sampling frames.
    await new Promise((r) => setTimeout(r, 9000));
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) throw new Error('no <canvas> found');
    const outPath = path.join(OUT_DIR, `${base}.png`);
    // page.screenshot()/elementHandle.screenshot() read the composited canvas the same way
    // canvas.toBlob() does; no extra renderer flags needed for this path since Puppeteer
    // captures via the browser's own frame, not toDataURL() — see [Block 38] §38.1 note on
    // why preserveDrawingBuffer only matters for in-page toDataURL()/toBlob() calls.
    await canvasHandle.screenshot({ path: outPath });
    results.push({ file: f, out: outPath, w: CSS_W * DPR, h: CSS_H * DPR });
  } catch (e) {
    results.push({ file: f, error: String(e).slice(0, 200) });
  }
  const consolePath = path.join(OUT_DIR, `${base}.console.json`);
  fs.writeFileSync(consolePath, JSON.stringify(
    { file: f, console_clean: consoleIssues.length === 0, issues: consoleIssues }, null, 1));
  console.error(`[console] ${base}: ${consoleIssues.length === 0 ? 'clean' : consoleIssues.length + ' issue(s)'} -> ${consolePath}`);
  await page.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
