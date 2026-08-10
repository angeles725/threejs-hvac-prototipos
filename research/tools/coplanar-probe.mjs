// Sweep a built viewer for Z-FIGHTING leads: pairs of visible surfaces that sit at the same depth,
// so the depth buffer cannot decide which is in front and the winner changes per pixel and per frame.
//
// READ THE OUTPUT AS LEADS, NOT AS DEFECTS. The detector compares world BOUNDING BOXES, so it cannot
// tell "these two surfaces overlap" from "their boxes overlap": two disjoint L-shaped rooms at one
// floor level are reported and are not fighting. Confirm a pair against the actual geometry before
// calling it a defect — the one real find in this repo was confirmed by hashing the two regions' run
// lists and getting the same digest.
//
// What it IS good for: it reads the BUILT scene, so it covers what the CAD-side auditor never sees,
// and a z-fight is invisible to console, count, framing and still-capture checks — it only shows in
// motion.
//
// The page publishes RAW GEOMETRY (window.__qaBoxes) and the numerics run HERE, out of the page, in
// the design3d kit's unit-tested coplanarPairs(). Same rule as the framing probe: a page that grades
// itself certifies its own bugs. The two implementations were proved pair-for-pair identical on
// nave-panccadia v22 (413 meshes, 73 pairs, same worst-12) before the in-page copy was deleted.
//
// Usage: node coplanar-probe.mjs <url> [tolerance_m]
import puppeteer from 'puppeteer-core';
import { coplanarPairs } from '/home/cristian/.claude/skills/design3d/library/harness/geom-verify.mjs';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';

const url = process.argv[2];
const eps = process.argv[3] ? Number(process.argv[3]) : undefined;

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
await page.waitForFunction('typeof window.__qaBoxes === "function"', { timeout: 120000 });
const boxes = await page.evaluate(() => window.__qaBoxes());
await browser.close();

const r = coplanarPairs(boxes, { eps, limit: 12 });
console.log(JSON.stringify({
  url,
  console_errors: errors.length,
  meshes: r.boxes,
  pairs: r.count,
  worst: r.pairs,
}, null, 1));
