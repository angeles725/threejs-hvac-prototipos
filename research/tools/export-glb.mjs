#!/usr/bin/env node
// Export a live three.js scene to .glb via GLTFExporter, driven headless over the same
// http://localhost:8123 server the QA harness uses (never file:// — importmap pages break).
//
// The damper-motorizado P7 produced its .glb this way but the harness was never preserved, so
// cinemex had to rebuild it. This file is the reusable version. It reaches the scene through the
// page's own QA hook (globalThis.__cinemexApp-style: pass the hook name as --hook) and imports
// GLTFExporter through the page's importmap ('three/addons/'), so exporter and scene share one
// three.js instance — a second copy would fail instanceof checks inside the exporter.
//
// usage: node research/tools/export-glb.mjs [--hook __cinemexApp] [--url-suffix "camera=neutral&state=architecture"] <file.html> <out.glb>

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const args = process.argv.slice(2);
let HOOK = '__cinemexApp';
let SUFFIX = '';
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--hook') HOOK = args[++i];
  else if (args[i] === '--url-suffix') SUFFIX = args[++i];
  else rest.push(args[i]);
}
const [htmlPath, outPath] = rest;
if (!htmlPath || !outPath) {
  console.error('usage: node research/tools/export-glb.mjs [--hook <name>] [--url-suffix "<query>"] <file.html> <out.glb>');
  process.exit(2);
}

const url = `http://localhost:${process.env.PORT ?? 8123}/${htmlPath}${SUFFIX ? `?${SUFFIX}` : ''}`;
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--window-size=960,720'],
});
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.error('pageerror:', e.message); process.exitCode = 1; });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 180000 });

  const b64 = await page.evaluate(async (hookName) => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const app = globalThis[hookName];
    if (!app?.runtime?.scene) throw new Error(`QA hook ${hookName}.runtime.scene not found`);
    const scene = app.runtime.scene;
    // GLTFExporter rasterizes every reachable texture through canvas drawImage, which throws on
    // non-drawable images (DataTexture pixels, PMREM render targets). Strip those slots first —
    // the page is throwaway, so mutating live materials costs nothing.
    const drawable = (img) => (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement)
      || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)
      || (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement)
      || (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas);
    let stripped = 0;
    scene.environment = null;
    scene.background = null;
    scene.traverse((node) => {
      const materials = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
      for (const material of materials) {
        for (const key of Object.keys(material)) {
          const value = material[key];
          if (value?.isTexture && !drawable(value.image)) { material[key] = null; stripped++; }
        }
      }
    });
    console.log(`stripped ${stripped} non-drawable texture slots`);
    const buffer = await new GLTFExporter().parseAsync(scene, { binary: true });
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }, HOOK);

  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`glb: ${outPath} (${kb} KB)`);
} finally {
  await browser.close();
}
