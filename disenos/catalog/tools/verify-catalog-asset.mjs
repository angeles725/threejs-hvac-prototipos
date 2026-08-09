// verify-catalog-asset.mjs — headless QA probe for disenos/catalog assets.
// Adapted from research/sources/probes/B56-visor-perf/measure.mjs (same CDP driver, same
// SwiftShader caveat: COUNTS are rasteriser-independent, frame-time is not).
// Usage: node verify-catalog-asset.mjs <family>/<slug> [...]   (server must serve repo root at :8899)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
// A FIXED debug port is unsafe with parallel catalog sessions: if it is already taken, this driver
// attaches to SOMEONE ELSE'S browser and measures the wrong page (or hangs). Take a free one.
const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
const PORT = Number(process.env.CDP_PORT || await freePort());
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:8899';
console.error(`[verify-catalog-asset] BASE=${BASE}`);   // announce the tree we will measure (8899 often serves ANOTHER worktree)
const TARGETS = process.argv.slice(2);
const SHOT_DIR = process.env.SHOT_DIR || '.';

const PROBE = `(()=>{
  const key = Object.keys(globalThis).find(k=>/^__.*App$/.test(k) && globalThis[k] && globalThis[k].runtime && globalThis[k].runtime.renderer);
  if(!key) return {error:'no-renderer', keys:Object.keys(globalThis).filter(k=>/^__/.test(k))};
  const r = globalThis[key].runtime.renderer, i = r.info;
  const root = globalThis[key].runtime.root;
  let meshes = 0; if(root) root.traverse(o=>{ if(o.isMesh) meshes++; });
  return {app:key, calls:i.render.calls, triangles:i.render.triangles,
    geometries:i.memory.geometries, textures:i.memory.textures,
    programs:(i.programs?i.programs.length:null), pixelRatio:r.getPixelRatio(),
    shadowAuto:r.shadowMap.autoUpdate, rootMeshes:meshes,
    hasQaHook: typeof globalThis.__qaRenderInfo === 'function'};
})()`;

const sleep = ms => new Promise(r=>setTimeout(r,ms));

// PREFLIGHT — a dead server yields `ready:false, errors:[]`, which is INDISTINGUISHABLE from a
// genuinely broken asset. That ambiguity would fail a good asset at the merge gate, so refuse to
// run at all rather than emit a verdict the run cannot support.
if(!TARGETS.length){ console.error('usage: verify-catalog-asset.mjs <family>/<slug> [...]'); process.exit(2); }
// It is NOT enough that *a* server answers: another checkout (or another session's worktree) may
// be serving :8899, in which case every target 404s and the run would report a fake failure.
// So fetch each target URL itself and require 200 before measuring anything.
for(const t of TARGETS){
  const slug = t.split('/').pop();
  const url = `${BASE}/disenos/catalog/${t}/${slug}.html`;
  let status;
  try{ status = (await fetch(url, {signal: AbortSignal.timeout(4000)})).status; }
  catch(e){
    console.error(`PREFLIGHT FAILED: no server at ${BASE} (${e.message}).`);
    console.error('Start one from THIS repo root:  python3 -m http.server 8899 --bind 127.0.0.1 &');
    console.error('NOT a verdict on the assets — nothing was measured.');
    process.exit(2);
  }
  if(status !== 200){
    console.error(`PREFLIGHT FAILED: ${url} → HTTP ${status}.`);
    console.error('A server IS answering, but it is not serving this checkout (another worktree on');
    console.error('the same port?). Point BASE_URL at the right one, or restart the server from');
    console.error('THIS repo root. NOT a verdict on the assets — nothing was measured.');
    process.exit(2);
  }
}

const args = ['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--window-size=1280,800',`--remote-debugging-port=${PORT}`,'about:blank'];
const proc = spawn(BIN, args, {stdio:'ignore'});

async function getWsUrl(){
  for(let i=0;i<40;i++){
    try{ const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); const j = await r.json();
      if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{}
    await sleep(250);
  }
  throw new Error('no ws url');
}
const ws = new WebSocket(await getWsUrl());
if(ws.setMaxListeners) ws.setMaxListeners(0);   // >10 targets: evita MaxListenersExceededWarning que corrompe el JSON de stdout
await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=rej; });
let msgId = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data);
  if(m.id && pending.has(m.id)){ const {res,rej}=pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
function send(method, params={}, sessionId){ const id = ++msgId;
  return new Promise((res,rej)=>{ pending.set(id,{res,rej}); ws.send(JSON.stringify({id, method, params, sessionId})); }); }

async function check(target){
  const slug = target.split('/').pop();
  const url = `${BASE}/disenos/catalog/${target}/${slug}.html`;
  const {targetId} = await send('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await send('Target.attachToTarget',{targetId, flatten:true});
  await send('Page.enable',{},sessionId);
  await send('Runtime.enable',{},sessionId);
  const errors = [];
  ws.addEventListener('message', ev=>{ const m = JSON.parse(ev.data);
    if(m.method==='Runtime.exceptionThrown' && m.sessionId===sessionId)
      errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
  await send('Page.navigate',{url},sessionId);
  let ready=false;
  for(let i=0;i<100;i++){
    await sleep(200);
    try{ const r = await send('Runtime.evaluate',
      {expression:"document.documentElement.getAttribute('data-app-ready')==='true'", returnByValue:true}, sessionId);
      if(r.result && r.result.value===true){ ready=true; break; } }catch{}
  }
  await sleep(900);
  const r = await send('Runtime.evaluate',{expression:PROBE, returnByValue:true, awaitPromise:true}, sessionId);
  const shot = await send('Page.captureScreenshot',{format:'png'},sessionId);
  writeFileSync(`${SHOT_DIR}/${slug}.png`, Buffer.from(shot.data,'base64'));
  await send('Target.closeTarget',{targetId});
  return {target, ready, errors, ...(r.result?r.result.value:{error:'eval-failed'})};
}

// A page whose ES module never executed reports `ready:false, error:'no-renderer', keys:[]` — no
// global was ever defined. That is indistinguishable from a broken asset, but its usual cause is the
// unpkg CDN being slow past the readiness wait: seen for real on almacenamiento/lockers, which
// failed once and passed on an immediate retry with 73 draw calls. Retry ONCE before failing, and
// say so in the row, so a network hiccup cannot reject good work at the merge gate.
const moduleNeverRan = r => r && r.ready === false && r.error === 'no-renderer'
                          && Array.isArray(r.keys) && r.keys.length === 0;
const out = [];
for(const t of TARGETS){
  try{
    let r = await check(t);
    if(moduleNeverRan(r)){
      const again = await check(t);
      r = moduleNeverRan(again) ? {...again, note:'module never ran on 2 attempts — likely a real failure'}
                                : {...again, note:'passed on retry — first attempt did not execute the module (CDN?)'};
    }
    out.push(r);
  }catch(e){ out.push({target:t, error:String(e)}); }
}
console.log(JSON.stringify(out,null,2));
ws.close(); proc.kill('SIGKILL');
process.exit(out.some(o=>!o.ready || o.error || (o.calls||0)===0 || (o.errors||[]).length) ? 1 : 0);
