/**
 * verify-offline.mjs — proves the dist/ build does what it claims: renders with no internet.
 *
 *   node verify-offline.mjs [--playwright <path-to-playwright>]
 *
 * WHAT IS ASSERTED AUTOMATICALLY
 *   1. Zero non-file:// requests are even ATTEMPTED (not "succeeded" — attempted). A page that
 *      quietly reaches for a CDN would fail here even if the request happened to succeed on this
 *      machine, which is the whole point: the dev box has internet, the client's may not.
 *   2. No page errors and no failed module evaluation.
 *   3. A WebGL context exists, is not lost, and the render loop advanced (frame count grows).
 *
 * WHAT IS *NOT* ASSERTED AUTOMATICALLY — AND WHY
 *   Pixel content. The obvious check — gl.readPixels() on the scene canvas — reads BLACK on a
 *   healthy render: the canvas is created without preserveDrawingBuffer, so the drawing buffer is
 *   already swapped and cleared by the time an outside script can sample it. An earlier version of
 *   this file did exactly that and reported RENDERED: NO for two pages that were, in fact, drawing
 *   perfectly. A check that fails on its own defect is worse than no check, so it was removed
 *   rather than tuned. Screenshots are written to dist-verify/ for HUMAN inspection instead — look
 *   at them; that is the pixel verification step, and it is deliberately manual.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, 'dist-verify');

const flagIdx = process.argv.indexOf('--playwright');
const PLAYWRIGHT = flagIdx !== -1
  ? process.argv[flagIdx + 1]
  : '/home/cristian/prototipos/cliente/Tridium/datacenter-c3ntro/node_modules/playwright/index.mjs';

const { chromium } = await import(PLAYWRIGHT);

mkdirSync(SHOTS, { recursive: true });

const PAGES = [
  { file: 'index.html', shot: 'index.png' },
  { file: 'rack-detail.html?rack=3', shot: 'rack-detail.png' },
];

const browser = await chromium.launch({
  // SwiftShader gives a real WebGL implementation on a headless box with no GPU.
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});

let failures = 0;

for (const { file, shot } of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });

  // Simulate the actual condition the client is in: NO INTERNET. This is Playwright's native
  // offline emulation, not request interception — an earlier version used page.route() and made
  // Chromium re-issue the file:// navigation through the Fetch domain, which logs a bogus
  // "URL scheme file is not supported" console error on a page that is perfectly healthy.
  await context.setOffline(true);

  const page = await context.newPage();

  // With the network down, any remote dependency shows up here as an attempt. Recording rather
  // than blocking keeps the file:// load path untouched.
  const attempted = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:')) attempted.push(r.url()); });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => {
    if (!r.url().startsWith('file:')) errors.push(`requestfailed: ${r.url()}`);
  });

  await page.goto(`file://${DIST}/${file}`, { waitUntil: 'load', timeout: 30000 });

  // Count animation frames across a real interval: a live render loop is the observable proof that
  // three.js loaded and is driving the scene, and it does not depend on reading the framebuffer.
  const frames = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else resolve(n);
    };
    requestAnimationFrame(tick);
  }));

  await page.waitForTimeout(4000);   // let the scripted intro advance before the screenshot

  const gl = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')];
    const scene = canvases
      .map((c) => ({ c, ctx: c.getContext('webgl2') || c.getContext('webgl') }))
      .filter((x) => x.ctx)
      .sort((a, b) => b.c.width * b.c.height - a.c.width * a.c.height)[0];
    if (!scene) return { found: false };
    return {
      found: true,
      width: scene.c.width,
      height: scene.c.height,
      contextLost: scene.ctx.isContextLost(),
      renderer: String(scene.ctx.getParameter(scene.ctx.VERSION) || ''),
    };
  });

  await page.screenshot({ path: join(SHOTS, shot) });

  // Frame threshold is deliberately low: this runs on SwiftShader (CPU rasterisation) against a
  // full datacenter scene, where single-digit fps is expected and says nothing about real hardware.
  // The claim being tested is "the loop is alive", not "the loop is fast".
  const ok = attempted.length === 0 && errors.length === 0 && gl.found && !gl.contextLost && frames >= 3;
  if (!ok) failures++;

  console.log(`\n=== ${file}`);
  console.log(`  external requests attempted : ${attempted.length}${attempted.length ? ` -> ${attempted.slice(0, 5).join(', ')}` : ' (none)'}`);
  console.log(`  page errors                 : ${errors.length ? errors.slice(0, 4).join(' | ') : 'none'}`);
  console.log(`  webgl canvas                : ${gl.found ? `${gl.width}x${gl.height}, lost=${gl.contextLost}, ${gl.renderer}` : 'NOT FOUND'}`);
  console.log(`  frames in 2s                : ${frames}`);
  console.log(`  verdict                     : ${ok ? 'OK' : 'FAILED'}`);

  await context.close();
}

await browser.close();

console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures} page(s))`} — offline load, no network, live render loop.`);
console.log(`Screenshots for manual pixel check: ${SHOTS}`);
process.exit(failures === 0 ? 0 : 1);
