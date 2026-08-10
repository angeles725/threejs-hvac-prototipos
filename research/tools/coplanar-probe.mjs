// Run the viewer's __qaCoplanar hook headless and print the worst pairs.
//
// READ THE OUTPUT AS LEADS, NOT AS DEFECTS. The hook compares world BOUNDING
// BOXES, so it cannot tell "these two surfaces overlap" from "their boxes
// overlap": two disjoint L-shaped rooms at the same floor level are reported and
// are not fighting. Every pair it returns has to be confirmed against the actual
// geometry before it is called a defect — the one real find in this repo was
// confirmed by hashing the two regions' run lists and getting the same digest.
//
// What it IS good for: it looks at the built scene, so it covers parts that the
// CAD-side auditor never sees, and a z-fight is invisible to console, count and
// still-capture checks — it only shows up in motion.
import puppeteer from 'puppeteer-core';
const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';

const url = process.argv[2];
const tol = process.argv[3] ? Number(process.argv[3]) : undefined;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--use-gl=angle', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('canvas', { timeout: 120000 });
await page.waitForFunction('typeof window.__qaCoplanar === "function"',
  { timeout: 120000 });
const res = await page.evaluate((t) => window.__qaCoplanar(t), tol);

console.log(JSON.stringify({ url, console_errors: errors.length, ...res }, null, 1));
await browser.close();
