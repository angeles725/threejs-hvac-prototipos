// Usage: node research/tools/probe.mjs [--url-suffix "<query>"] <file1.html> [file2.html ...]
//
// --url-suffix drives the page to a REPRESENTATIVE framing. Without it the probe measures whatever
// the DEFAULT camera happens to show — and if that camera is a tight hero framing, the frustum culls
// most of the scene and the probe under-reads by an order of magnitude. In the cinemex run it
// reported 59 draws / 708 tris for a scene whose real cost is ~300 draws / ~40k tris. A performance
// pass that optimizes against that number is optimizing against a fiction, and the budget it clears
// is a budget it never measured.
//
// Gate rule: probe the WORST representative case for the pass, not the prettiest one.
import puppeteer from 'puppeteer-core';
const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';

const rawArgs = process.argv.slice(2);
let URL_SUFFIX = '';
const FILES = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--url-suffix') URL_SUFFIX = rawArgs[++i] ?? '';
  else if (rawArgs[i].startsWith('--url-suffix=')) URL_SUFFIX = rawArgs[i].slice('--url-suffix='.length);
  else FILES.push(rawArgs[i]);
}
if (URL_SUFFIX && !URL_SUFFIX.startsWith('?')) URL_SUFFIX = '?' + URL_SUFFIX;
const INIT = () => {
  const P = { frames: 0, drawsPerFrame: [], trisPerFrame: [], t0: 0, tLast: 0 };
  window.__probe = P;
  let fD = 0, fT = 0;
  const wrap = (proto) => {
    if (!proto) return;
    for (const [name, cIdx, inst] of [['drawElements',1,0],['drawArrays',2,0],['drawElementsInstanced',1,1],['drawArraysInstanced',2,1]]) {
      const orig = proto[name]; if (!orig) continue;
      proto[name] = function(...a){ fD++; const c = a[cIdx]||0; const n = inst ? (a[a.length-1]||1) : 1; fT += (c/3)*n; return orig.apply(this,a); };
    }
  };
  wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  wrap(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  const loop = (t) => { if(!P.t0) P.t0 = t; P.tLast = t; P.frames++; P.drawsPerFrame.push(fD); P.trisPerFrame.push(fT); if(P.drawsPerFrame.length>600){P.drawsPerFrame.shift();P.trisPerFrame.shift();} fD=0; fT=0; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--window-size=1280,900'] });
const results = [];
for (const f of FILES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(INIT);
  const url = 'http://localhost:8123/' + encodeURIComponent(f).replace(/%2F/g,'/') + URL_SUFFIX;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 9000));
    const m = await page.evaluate(() => {
      const P = window.__probe || {};
      const dp = (P.drawsPerFrame||[]).slice(-240).filter(v=>v>0);
      const tp = (P.trisPerFrame||[]).slice(-240).filter(v=>v>0);
      const med = a => { if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
      const fps = P.frames && P.tLast>P.t0 ? Math.round(P.frames/((P.tLast-P.t0)/1000)) : 0;
      let gpu=null, ctxType=null; const c=document.querySelector('canvas');
      if(c){ for(const t of ['webgl2','webgl']){ const gl=c.getContext(t); if(gl){ ctxType=t; const e=gl.getExtension('WEBGL_debug_renderer_info'); gpu=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); break; } } }
      return { fps, draws: med(dp), tris: Math.round(med(tp)), sampled: dp.length,
        canvas: c?{w:c.width,h:c.height}:null, ctxType, dpr: devicePixelRatio,
        heapMB: performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null, gpu };
    });
    // Record the URL: a perf number with no provenance cannot be trusted or reproduced, and cannot
    // betray a probe that measured the wrong framing.
    // GROUND TRUTH first. three.js's own `renderer.info.render` counts draw calls and triangles
    // exactly, instances included. The WebGL-wrapping fallback below cannot: it counts each
    // InstancedMesh as ONE instance, which reported 59 draws / 708 tris (≈12 tris per draw — one
    // box) for an entire multiplex, identically for two different cameras. If the page exposes
    // `window.__qaRenderInfo`, that IS the measurement; the wrapper is a legacy estimate and is
    // labelled as such.
    const truth = await page.evaluate(() => (window.__qaRenderInfo ? window.__qaRenderInfo() : null));
    results.push(truth
      ? { file: f, url, query: URL_SUFFIX || null, source: 'renderer.info',
        draws: truth.calls, tris: truth.triangles, ...truth, estimate_legacy: { draws: m.draws, tris: m.tris },
        fps: m.fps, canvas: m.canvas, dpr: m.dpr, gpu: m.gpu }
      : { file: f, url, query: URL_SUFFIX || null, source: 'webgl-wrap-estimate', ...m });
  } catch (e) { results.push({ file: f, url, error: String(e).slice(0,120) }); }
  await page.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
