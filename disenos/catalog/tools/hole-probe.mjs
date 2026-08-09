// hole-probe.mjs — READ-ONLY. Answers one question: is that dark area a dark PANEL, or a HOLE?
//
// Method (background sentinel). A pixel-diff of "hide the object and see what changes" cannot tell
// a black panel from empty space, because both are dark. So instead of touching the object, this
// repaints the SCENE BACKGROUND (and the fog) magenta and forces one render. Background is the only
// thing that can be magenta, so every magenta pixel is a place where the camera looks straight
// through the model into nothing. No geometry, material or visibility is modified.
//
// Usage: BASE=... SHOT_DIR=... node hole-probe.mjs <family>/<slug> [btnId,btnId,...]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const freePort = () => new Promise((res, rej) => {
  const s = createServer(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
const PORT = Number(process.env.CDP_PORT || await freePort());
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const SHOT_DIR = process.env.SHOT_DIR || '.';
const [target, btnList = ''] = process.argv.slice(2);
const slug = target.split('/').pop();
const BUTTONS = btnList.split(',').filter(Boolean);

const sleep = ms => new Promise(r=>setTimeout(r,ms));
const proc = spawn(BIN, ['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--window-size=1280,800',`--remote-debugging-port=${PORT}`,'about:blank'], {stdio:'ignore'});
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
let msgId = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data);
  if(m.id && pending.has(m.id)){ const {res,rej}=pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (method, params={}, sessionId)=>{ const id = ++msgId;
  return new Promise((res,rej)=>{ pending.set(id,{res,rej}); ws.send(JSON.stringify({id, method, params, sessionId})); }); };

const {targetId} = await send('Target.createTarget',{url:'about:blank'});
const {sessionId} = await send('Target.attachToTarget',{targetId, flatten:true});
await send('Page.enable',{},sessionId); await send('Runtime.enable',{},sessionId);
await send('Page.navigate',{url:`${BASE}/disenos/catalog/${target}/${slug}.html`},sessionId);
for(let i=0;i<100;i++){
  await sleep(200);
  try{ const r = await send('Runtime.evaluate',
    {expression:"document.documentElement.getAttribute('data-app-ready')==='true'", returnByValue:true}, sessionId);
    if(r.result && r.result.value===true) break; }catch{}
}
await sleep(900);
for(const b of BUTTONS){
  await send('Runtime.evaluate',{expression:`document.getElementById(${JSON.stringify(b)}).click()`}, sessionId);
  await sleep(1500);
}
// Repaint background + fog, then drive one render directly through the app's own renderer.
const PAINT = `(()=>{
  const k = Object.keys(globalThis).find(x=>/^__.*App$/.test(x) && globalThis[x] && globalThis[x].runtime && globalThis[x].runtime.renderer);
  const rt = globalThis[k].runtime;
  if(rt.scene.background && rt.scene.background.setHex) rt.scene.background.setHex(0xff00ff);
  if(rt.scene.fog && rt.scene.fog.color) rt.scene.fog.color.setHex(0xff00ff);
  rt.renderer.render(rt.scene, rt.camera);
  return {ok:true};
})()`;
const r = await send('Runtime.evaluate',{expression:PAINT, returnByValue:true}, sessionId);
if(!r.result.value || !r.result.value.ok){ console.error('paint failed', JSON.stringify(r.result)); process.exit(2); }
await sleep(300);
const shot = await send('Page.captureScreenshot',{format:'png'},sessionId);
const name = `${SHOT_DIR}/${slug}-sentinel${BUTTONS.length ? '-' + BUTTONS.join('-') : ''}.png`;
writeFileSync(name, Buffer.from(shot.data,'base64'));
console.log(name);
await send('Target.closeTarget',{targetId});
ws.close(); proc.kill('SIGKILL');
process.exit(0);
