import puppeteer from 'puppeteer-core';
const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const FILES = process.argv.slice(2);
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
  const url = 'http://localhost:8123/' + encodeURIComponent(f).replace(/%2F/g,'/');
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
    results.push({ file: f, ...m });
  } catch (e) { results.push({ file: f, error: String(e).slice(0,120) }); }
  await page.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
