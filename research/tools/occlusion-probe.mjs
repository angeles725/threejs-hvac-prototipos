#!/usr/bin/env node
// occlusion-probe.mjs — is anything STANDING IN FRONT of the gate's subject?
//
// The framing probe answers "does the subject project inside the frame". That is
// a different question from "can the camera see it", and the gap between them is
// expensive: a nave-panccadia cold-room view measured ok:true / occupancy 0.42 /
// fullyVisible and rendered a flat grey field, because fitting a 12 m subject put
// the eye above a roof that the fit had no opinion about. Console clean, probe
// green, filename lying.
//
// This reads the page's `window.__qaOcclusion()` hook, which raycasts from the
// live camera to each of the subject's own mesh centres and reports, RAW:
//   { samples, hidden, blockers: [{name, n}] }
// The page returns counts, never a verdict — a page that grades its own occlusion
// hides its own bug, the same rule __qaFraming follows.
//
// Usage: node research/tools/occlusion-probe.mjs [--url-suffix "<query>"]
//                                                [--max <fraction>] <file.html> ...
// Exit 0 = every page under the threshold (default 0.20 of samples hidden).
// Exit 1 = at least one page over it. A page with NO hook is a SKIP, never a pass.
import puppeteer from 'puppeteer-core';

const PORT = process.env.PORT || 8123;   // never hardcode: a fixed port measures another worktree
const args = process.argv.slice(2);
let URL_SUFFIX = '';
let MAX = 0.20;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url-suffix') URL_SUFFIX = args[++i] ?? '';
  else if (args[i].startsWith('--url-suffix=')) URL_SUFFIX = args[i].slice(13);
  else if (args[i] === '--max') MAX = Number(args[++i]);
  else if (args[i].startsWith('--max=')) MAX = Number(args[i].slice(6));
  else files.push(args[i]);
}
if (!files.length) {
  console.error('usage: node research/tools/occlusion-probe.mjs [--url-suffix "<query>"] [--max <fraction>] <file.html> ...');
  process.exit(2);
}

// the same binary probe.mjs and framing-probe.mjs use — one renderer across the
// harness, so a verdict here means the same thing as a verdict there
const CHROME = process.env.CHROME_PATH
  || '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
         '--disable-dev-shm-usage'],
});

const out = [];
let failed = 0, skipped = 0;
for (const f of files) {
  const url = `http://localhost:${PORT}/` + encodeURIComponent(f).replace(/%2F/g, '/') + URL_SUFFIX;
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const rec = { file: f, url };
  try {
    // 'load', not 'networkidle2': the page keeps a rAF loop running forever, so
    // the network never goes idle by this tool's definition and goto times out on
    // a page that booted fine. Same choice framing-probe.mjs makes.
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    // settle: let the module boot, apply the ?view= preset and install the hook
    await new Promise(r => setTimeout(r, 5000));
    const r = await page.evaluate(() =>
      (typeof window.__qaOcclusion === 'function' ? window.__qaOcclusion() : undefined));
    if (r === undefined) {
      rec.status = 'no-hook'; skipped++;
    } else if (r === null) {
      rec.status = 'no-subject'; skipped++;
    } else {
      rec.status = 'gated';
      rec.samples = r.samples;
      rec.hidden = r.hidden;
      rec.fraction = r.samples ? r.hidden / r.samples : 0;
      rec.blockers = r.blockers;
      // An empty sample set is NOT a pass: an instrument that iterates "every X"
      // must fail loud when it finds zero X.
      rec.ok = r.samples > 0 && rec.fraction <= MAX;
      if (!rec.ok) failed++;
    }
  } catch (e) {
    rec.status = 'error'; rec.error = String(e.message || e); failed++;
  }
  await page.close();
  out.push(rec);
}
await browser.close();

console.log(JSON.stringify(out, null, 1));
const gated = out.filter(r => r.status === 'gated');
console.log(`[occlusion] ${gated.filter(r => r.ok).length}/${gated.length} clear ` +
            `(${skipped} skipped) — threshold ${(MAX * 100).toFixed(0)}% of samples hidden`);
for (const r of out.filter(r => r.status === 'gated' && !r.ok)) {
  const by = (r.blockers || []).map(b => `${b.name}x${b.n}`).join(', ') || 'nothing named';
  console.log(`[occlusion] FAIL ${r.file}${URL_SUFFIX}: ${r.hidden}/${r.samples} ` +
              `hidden (${(r.fraction * 100).toFixed(0)}%) behind ${by}`);
}
process.exit(failed ? 1 : 0);
