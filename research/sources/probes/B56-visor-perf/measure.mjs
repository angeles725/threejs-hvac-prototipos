import { spawn } from 'node:child_process';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9333;
const BASE = 'http://127.0.0.1:8899';

const EQUIPOS = process.argv.slice(2);

const PROBE = `(()=>{
  const key = Object.keys(globalThis).find(k=>/^__.*App$/.test(k) && globalThis[k] && globalThis[k].runtime && globalThis[k].runtime.renderer);
  if(!key) return {error:'no-renderer', keys:Object.keys(globalThis).filter(k=>/^__/.test(k))};
  const r = globalThis[key].runtime.renderer, i = r.info;
  return {app:key, calls:i.render.calls, triangles:i.render.triangles, lines:i.render.lines,
    geometries:i.memory.geometries, textures:i.memory.textures,
    programs:(i.programs?i.programs.length:null), pixelRatio:r.getPixelRatio(),
    shadowAuto:r.shadowMap.autoUpdate};
})()`;

const sleep = ms => new Promise(r=>setTimeout(r,ms));

// launch
const args = ['--headless=new','--no-sandbox','--disable-gpu=false',
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--window-size=1280,800',`--remote-debugging-port=${PORT}`,'about:blank'];
const proc = spawn(BIN, args, {stdio:'ignore'});

async function getWsUrl(){
  for(let i=0;i<40;i++){
    try{ const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); const j = await r.json();
      if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{}
    await sleep(250);
  }
  throw new Error('no ws url');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=rej; });

let msgId = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if(m.id && pending.has(m.id)){ const {res,rej}=pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
function send(method, params={}, sessionId){
  const id = ++msgId;
  return new Promise((res,rej)=>{ pending.set(id,{res,rej});
    ws.send(JSON.stringify({id, method, params, sessionId})); });
}

async function measure(url){
  const {targetId} = await send('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await send('Target.attachToTarget',{targetId, flatten:true});
  await send('Page.enable',{},sessionId);
  await send('Runtime.enable',{},sessionId);
  await send('Page.navigate',{url},sessionId);
  // wait for app-ready
  let ready=false;
  for(let i=0;i<80;i++){
    await sleep(200);
    try{
      const r = await send('Runtime.evaluate',
        {expression:"document.documentElement.getAttribute('data-app-ready')==='true'", returnByValue:true}, sessionId);
      if(r.result && r.result.value===true){ ready=true; break; }
    }catch{}
  }
  await sleep(600); // let a few frames render
  const r = await send('Runtime.evaluate',{expression:PROBE, returnByValue:true, awaitPromise:true}, sessionId);
  await send('Target.closeTarget',{targetId});
  return {ready, ...(r.result?r.result.value:{error:'eval-failed'})};
}

const out = [];
for(const eq of EQUIPOS){
  const url = `${BASE}/disenos/nave-panccadia/equipos/${eq}/${eq}.html`;
  try{ const m = await measure(url); out.push({eq, ...m}); }
  catch(e){ out.push({eq, error:String(e)}); }
}
console.log(JSON.stringify(out,null,2));
ws.close(); proc.kill('SIGKILL');
process.exit(0);
