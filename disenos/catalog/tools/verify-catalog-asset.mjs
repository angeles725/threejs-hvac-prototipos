// verify-catalog-asset.mjs — headless QA probe for disenos/catalog assets.
// Adapted from research/sources/probes/B56-visor-perf/measure.mjs (same CDP driver, same
// SwiftShader caveat: COUNTS are rasteriser-independent, frame-time is not).
// Usage: node verify-catalog-asset.mjs <family>/<slug> [...]   (server must serve repo root at :8899)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9334;
// PARALLEL SESSIONS: each worktree serves ITS OWN copy of the repo, so two sessions sharing one
// port would silently measure the wrong tree (asset 404s -> ready:false -> a good asset fails the
// gate). QA_BASE lets a session bind its own port; the default keeps the documented 8899 flow.
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8899';
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
try{
  const ping = await fetch(`${BASE}/disenos/catalog/`, {signal: AbortSignal.timeout(4000)});
  if(!ping.ok) throw new Error(`HTTP ${ping.status}`);
}catch(e){
  console.error(`PREFLIGHT FAILED: no server at ${BASE} (${e.message}).`);
  console.error('Start one from the repo root:  python3 -m http.server 8899 --bind 127.0.0.1 &');
  console.error('NOT a verdict on the assets — nothing was measured.');
  process.exit(2);
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

const out = [];
for(const t of TARGETS){
  try{ out.push(await check(t)); }catch(e){ out.push({target:t, error:String(e)}); }
}
console.log(JSON.stringify(out,null,2));
ws.close(); proc.kill('SIGKILL');
process.exit(out.some(o=>!o.ready || o.error || (o.calls||0)===0 || (o.errors||[]).length) ? 1 : 0);
