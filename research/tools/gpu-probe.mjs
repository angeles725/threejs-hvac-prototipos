#!/usr/bin/env node
// GPU experiment: can Chrome headless in this WSL2 use hardware GL (mesa d3d12 -> /dev/dxg)?
// Measures: reported WebGL renderer + wall time to load the cinemex scene and take one
// 2880x2160 screenshot. Compares flag/env variants against the SwiftShader baseline.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const URL = 'http://localhost:8123/disenos/cinemex-hvac-lorawan/index.html?camera=neutral&state=architecture&tick=0';

const VARIANTS = [
  { name: 'baseline-swiftshader', env: {}, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  { name: 'angle-default-hw', env: { GALLIUM_DRIVER: 'd3d12', MESA_LOADER_DRIVER_OVERRIDE: 'd3d12', LIBGL_ALWAYS_SOFTWARE: '0' }, args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan,VaapiVideoDecoder'] },
  { name: 'angle-gl-egl-hw', env: { GALLIUM_DRIVER: 'd3d12', MESA_LOADER_DRIVER_OVERRIDE: 'd3d12', LIBGL_ALWAYS_SOFTWARE: '0' }, args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] },
];

for (const v of VARIANTS) {
  const t0 = Date.now();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
      env: { ...process.env, ...v.env },
      args: [...v.args, '--no-sandbox', '--window-size=960,720'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 720, deviceScaleFactor: 3 });
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.waitForSelector('html[data-app-ready="true"]', { timeout: 180000 });
    const renderer = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'NO-WEBGL';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    const tLoad = Date.now();
    await page.screenshot({ path: `/tmp/claude-1000/-home-cristian-prototipos-three-js/8565f7df-01da-43cb-b0ab-30a085acf9ee/scratchpad/gpu-${v.name}.png` });
    const tShot = Date.now();
    console.log(JSON.stringify({ variant: v.name, renderer, load_s: ((tLoad - t0) / 1000).toFixed(1), shot_s: ((tShot - tLoad) / 1000).toFixed(1), total_s: ((tShot - t0) / 1000).toFixed(1) }));
  } catch (e) {
    console.log(JSON.stringify({ variant: v.name, error: String(e).slice(0, 160) }));
  } finally {
    if (browser) await browser.close();
  }
}
