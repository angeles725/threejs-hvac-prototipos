#!/usr/bin/env node
// Plain-page screenshot tool (no WebGL wait): for HTML dashboards/studies without a <canvas>.
// The 3D capture harness (capture.mjs) waits for a canvas selector and times out on plain pages —
// this is its sibling for DOM-only deliverables. Usage:
//   node research/tools/page-shot.mjs <out.png> <path.html[?query]> [--w 1440] [--h 900] [--dpr 2]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = Number(args[i + 1]); args.splice(i, 2); return v;
};
const W = flag('--w', 1440), H = flag('--h', 900), DPR = flag('--dpr', 2);
const [out, pagePath] = args;
if (!out || !pagePath) { console.error('usage: page-shot.mjs <out.png> <path.html[?query]> [--w] [--h] [--dpr]'); process.exit(2); }

const url = `http://localhost:${process.env.PORT ?? 8123}/${pagePath}`;
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', `--window-size=${W},${H}`],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: out, fullPage: false });
  console.log(`shot: ${out} (${W}x${H}@${DPR})`);
} finally {
  await browser.close();
}
