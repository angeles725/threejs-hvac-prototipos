// probe-state.mjs — companion to verify-catalog-asset.mjs.
// The catalog gate screenshots the DEFAULT state only, so any geometry that exists solely behind a
// toggle (a door swing, a cutaway, a fault colour) is never actually looked at. This drives the
// buttons and captures the resulting state, which is where hinge-axis and interior bugs show up.
// Usage: node probe-state.mjs <family>/<slug> <btnId,btnId,...> [outSuffix]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = Number(process.env.CDP_PORT || 9336);   // override para evitar colisión entre probes concurrentes
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:8899';
console.error(`[probe-state] BASE=${BASE}`);   // announce the tree we will measure (8899 often serves ANOTHER worktree)
const SHOT_DIR = process.env.SHOT_DIR || '.';
const [target, btnList, suffix = 'state'] = process.argv.slice(2);
const BUTTONS = (btnList || '').split(',').filter(Boolean);
const slug = target.split('/').pop();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(BIN, ['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--window-size=1280,800',`--remote-debugging-port=${PORT}`,'about:blank'],
  {stdio:'ignore'});

async function wsUrl(){
  for(let i=0;i<40;i++){
    try{ const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{}
    await sleep(250);
  }
  throw new Error('no ws url');
}
const ws = new WebSocket(await wsUrl());
await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=rej; });
let id = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data);
  if(m.id && pending.has(m.id)){ const {res,rej} = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (method, params={}, sessionId) => new Promise((res,rej)=>{
  const i = ++id; pending.set(i,{res,rej}); ws.send(JSON.stringify({id:i, method, params, sessionId})); });

const {targetId} = await send('Target.createTarget',{url:'about:blank'});
const {sessionId} = await send('Target.attachToTarget',{targetId, flatten:true});
await send('Page.enable',{},sessionId);
await send('Runtime.enable',{},sessionId);
const errors = [];
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
  if(m.method === 'Runtime.exceptionThrown' && m.sessionId === sessionId)
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });

await send('Page.navigate',{url:`${BASE}/disenos/catalog/${target}/${slug}.html`},sessionId);
for(let i=0;i<100;i++){
  await sleep(200);
  const r = await send('Runtime.evaluate',
    {expression:"document.documentElement.getAttribute('data-app-ready')==='true'", returnByValue:true}, sessionId);
  if(r.result?.value === true) break;
}
await sleep(600);
const clicked = await send('Runtime.evaluate', {returnByValue:true, sessionId, expression:
  `(()=>{ const ids=${JSON.stringify(BUTTONS)}; const hit=[];
     for(const b of ids){ const el=document.getElementById(b); if(el){ el.click(); hit.push(b); } }
     return {clicked:hit, missing:ids.filter(b=>!document.getElementById(b))}; })()`}, sessionId);
await sleep(2500);                       // let any eased animation settle before the capture
// Render-on-demand assets stop repainting once the eased animation ends, so with
// preserveDrawingBuffer:false the swapchain holds a DISCARDED (black) buffer at capture time.
// Force ONE render through the QA contract so captureScreenshot reads a live frame. A black PNG
// is otherwise a probe artifact (INCONCLUSIVE), never a verdict that the asset is broken.
await send('Runtime.evaluate', {returnByValue:true, sessionId, expression:
  `(()=>{ const k=Object.keys(globalThis).find(x=>/^__.*App$/.test(x)&&globalThis[x]&&globalThis[x].runtime);
     if(!k) return false; const r=globalThis[k].runtime; r.renderer.render(r.scene,r.camera); return true; })()`}, sessionId);
const shot = await send('Page.captureScreenshot',{format:'png'},sessionId);
writeFileSync(`${SHOT_DIR}/${slug}-${suffix}.png`, Buffer.from(shot.data,'base64'));
console.log(JSON.stringify({target, buttons:clicked.result?.value, errors}, null, 2));
ws.close(); proc.kill('SIGKILL');
process.exit(errors.length ? 1 : 0);
