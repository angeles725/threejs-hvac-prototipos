// tools/capture.mjs — batch high-res screenshot harness for the prototype corpus.
// Extends the tools/probe.mjs pattern (same Puppeteer + SwiftShader recipe, [Block 26]):
// instead of hooking GL calls, this drives the live canvas to a supersampled resolution,
// waits for the scene to settle, then dumps a PNG per file via page.screenshot() (which
// reads the canvas exactly like toDataURL/toBlob would — see [Block 38] §38.1).
//
// Usage: node tools/capture.mjs <out-dir> <file1.html> [file2.html ...]
// Requires: python3 -m http.server 8123 (or pass PORT env var) running at the repo root,
// and the same --use-angle=swiftshader --enable-unsafe-swiftshader flags as probe.mjs
// (WebGL context creation fails under default flags in this environment, [Block 26] §26.2).
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const PORT = process.env.PORT || 8123;
const [OUT_DIR, ...FILES] = process.argv.slice(2);
if (!OUT_DIR || FILES.length === 0) {
  console.error('usage: node tools/capture.mjs <out-dir> <file1.html> [file2.html ...]');
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
  const url = `http://localhost:${PORT}/` + encodeURIComponent(f).replace(/%2F/g, '/');
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    // Let the scene settle (materials/shadows/first frames) before capture — same 9s soak
    // window probe.mjs uses before sampling frames.
    await new Promise((r) => setTimeout(r, 9000));
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) throw new Error('no <canvas> found');
    const base = path.basename(f).replace(/\.html?$/i, '');
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
  await page.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
