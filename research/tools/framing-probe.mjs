// tools/framing-probe.mjs — headless framing GATE for design3d threejs assets.
// Extends the tools/probe.mjs pattern (same puppeteer-core + SwiftShader recipe): instead of hooking
// GL draw calls, this loads each page, reads the design's `window.__qaFraming` hook, and runs the
// framing math to prove the SUBJECT is on-screen, well composed, and not hidden behind the HUD.
//
// THE CONTRACT — `window.__qaFraming`:
//   A design installs, at boot (after camera + the equipment root exist), a ZERO-ARG closure that
//   returns PLAIN SERIALIZABLE data (page.evaluate can only hand back JSON — no THREE objects):
//     () => ({ mvpElements:[16 numbers], corners:[[x,y,z] x8], W, H, hud:{left,right,top,bottom}|null })
//   `mvpElements` is (projection * matrixWorldInverse) as a column-major length-16 array; `corners`
//   are the 8 world-space AABB corners of the SUBJECT the gate should frame (the design designates
//   which Object3D that is). The hook computes NOTHING about composition — it exports RAW geometry;
//   the verdict is computed HERE. That split is the point: the design cannot mark its own homework.
//
// WHY THIS READS geom-verify's PURE CORE (single source of truth): the actual near-plane guard and
// composition metrics live in `library/harness/geom-verify.mjs` — `projectCornersNDC` (with the
// load-bearing w<=0 guard: three's Vector3.project divides clip x/y by w with NO sign guard, so a
// corner behind the near plane flips the NDC sign and an off-frame subject reads false-green
// "well framed") and `framingMetrics`. Its pure-math core imports nothing, so importing it in plain
// Node is safe — the three.js dynamic import only fires inside the async wrappers, which we NEVER
// call. This probe therefore runs the EXACT same numerics the in-page `checkFraming` wrapper would,
// with zero drift, and no duplicated math to rot.
//
// NO-HOOK = SKIP, NOT PASS: a design without `__qaFraming` is not gated by this tool (it may predate
// the hook, or not be an equipment asset). It is reported `status:'no-hook'` and does NOT fail the
// run — but it is NEVER silently counted as ok/green. Only a design that installs the hook AND passes
// the numerics is ok.
//
// EXIT CODE: 0 iff every file is ok-or-no-hook; 1 if ANY file returned a real framing verdict of
// ok===false (offscreen, straddles-near-plane, cropped, mis-composed, HUD overlap); 2 if any file
// could not be MEASURED at all (geom-verify import failure, dead server, page boot crash). Exit 2 is
// INFRA/inconclusive, never a subject verdict — conflating a dead server with a framing failure makes
// a merge gate reject good work. A gate records a framing FAIL (exit 1) as `mechanical.framing`.
//
// Usage: node research/tools/framing-probe.mjs [--url-suffix "<query>"] <file1.html> [file2.html ...]
import puppeteer from 'puppeteer-core';

// Single source of truth for the framing numerics. Resolve via a constant path; if it cannot be
// imported, FAIL LOUD with exit 2 — never fabricate a pass from a missing verifier.
const GEOM_VERIFY = '/home/cristian/.claude/skills/design3d/library/harness/geom-verify.mjs';
let projectCornersNDC, framingMetrics;
try {
  ({ projectCornersNDC, framingMetrics } = await import(GEOM_VERIFY));
  if (typeof projectCornersNDC !== 'function' || typeof framingMetrics !== 'function') {
    throw new Error('geom-verify did not export projectCornersNDC/framingMetrics');
  }
} catch (e) {
  console.error(`[framing] FATAL: cannot import geom-verify pure core from ${GEOM_VERIFY}: ${e}`);
  process.exit(2);
}

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const PORT = process.env.PORT || 8123;   // never hardcode — a fixed port measures another worktree's tree with exit 0
const rawArgs = process.argv.slice(2);
let URL_SUFFIX = '';
const FILES = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--url-suffix') URL_SUFFIX = rawArgs[++i] ?? '';
  else if (rawArgs[i].startsWith('--url-suffix=')) URL_SUFFIX = rawArgs[i].slice('--url-suffix='.length);
  else FILES.push(rawArgs[i]);
}
if (URL_SUFFIX && !URL_SUFFIX.startsWith('?')) URL_SUFFIX = '?' + URL_SUFFIX;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--window-size=1280,900'] });

const results = [];
for (const f of FILES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const url = `http://localhost:${PORT}/` + encodeURIComponent(f).replace(/%2F/g,'/') + URL_SUFFIX;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));   // settle: let the module boot, place the camera, install the hook
    const data = await page.evaluate(() => (window.__qaFraming ? window.__qaFraming() : null));
    if (!data) {
      // No hook: SKIP, not a fail. This design is simply not framing-gated by this tool.
      results.push({ file: f, url, status: 'no-hook' });
    } else {
      // corners arrive as [[x,y,z], ...]; projectCornersNDC wants [{x,y,z}, ...].
      const corners = data.corners.map(([x, y, z]) => ({ x, y, z }));
      const p = projectCornersNDC(data.mvpElements, corners);
      if (p.anyBehind) {
        // A corner is at/behind the near plane: NDC is untrustworthy (sign-flip). Refuse a verdict.
        results.push({ file: f, url, status: 'gated',
          ok: false, reason: 'straddles-near-plane', partiallyBehind: true });
      } else {
        const m = framingMetrics(p.ndcMin, p.ndcMax);
        // NDC -> CSS px: x=(ndc+1)/2*W, y=(1-ndc)/2*H (y flips). ndcMax.y (top) -> smaller css y.
        let overlapsHUD = false;
        if (data.hud) {
          const W = data.W, H = data.H;
          const cssLeft = (p.ndcMin.x + 1) * 0.5 * W;
          const cssRight = (p.ndcMax.x + 1) * 0.5 * W;
          const cssTop = (1 - p.ndcMax.y) * 0.5 * H;
          const cssBottom = (1 - p.ndcMin.y) * 0.5 * H;
          overlapsHUD = cssLeft < data.hud.right && cssRight > data.hud.left
            && cssTop < data.hud.bottom && cssBottom > data.hud.top;
        }
        // ok REQUIRES fullyVisible: a subject cropped at a frame edge (any |ndc| > 1) is a named
        // recurrent failure — it must FAIL here, not merely be reported.
        const ok = m.fullyVisible && m.wellFramed && !overlapsHUD;
        results.push({ file: f, url, status: 'gated',
          ok,
          occupancy: m.occupancy,
          centered: m.centered,
          fullyVisible: m.fullyVisible,
          cropped: !m.fullyVisible,
          wellFramed: m.wellFramed,
          overlapsHUD,
          ndcMin: p.ndcMin,
          ndcMax: p.ndcMax,
        });
      }
    }
  } catch (e) {
    // A load/eval error is INFRA (dead server, boot crash) — NOT a framing verdict. It exits 2
    // (inconclusive), never 1: nothing was measured, so it must not read as a broken subject.
    results.push({ file: f, url, status: 'error', error: String(e).slice(0, 160) });
  }
  await page.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();

// Separate the three outcomes. A file CLEARS iff it has no hook (skip) or was gated ok===true.
// A framing FAIL (gated ok===false) exits 1. An UNMEASURABLE file (load/eval error) exits 2 — infra,
// not a subject verdict: a dead server or boot crash must never read as a broken framing.
const skipped = results.filter(r => r.status === 'no-hook');
const errored = results.filter(r => r.status === 'error');
const framingFails = results.filter(r => r.status === 'gated' && r.ok === false);
const cleared = results.filter(r => r.status === 'no-hook' || (r.status === 'gated' && r.ok === true));
console.error(`[framing] ${cleared.length}/${results.length} cleared`
  + ` (${skipped.length} no-hook skip${errored.length ? `, ${errored.length} UNMEASURABLE` : ''})`
  + (framingFails.length ? ` — ${framingFails.length} FAILED framing` : ''));
for (const r of framingFails) console.error(`[framing] FAIL ${r.file}: ${r.reason || 'mis-composed'}`);
for (const r of errored) console.error(`[framing] UNMEASURABLE ${r.file}: ${r.error} (infra — nothing measured)`);
if (framingFails.length) process.exit(1);
if (errored.length) process.exit(2);
