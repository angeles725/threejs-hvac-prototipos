// audit-asset.mjs — READ-ONLY audit probe for catalog assets. Writes nothing to the repo.
// Same CDP driver as disenos/catalog/tools/verify-catalog-asset.mjs.
//
// It answers three questions the gate cannot:
//   1. WHAT is in the scene — every mesh identified by geometry TYPE + parameters (never by index
//      or by instance count, which are not stable identities).
//   2. WHICH buttons exist, and what each one changes: after every click it re-reads the same
//      inventory and diffs it, so "this button hides that instanced batch" is a measured fact.
//   3. A PNG per state, so geometry can actually be looked at.
//
// Usage: BASE=http://127.0.0.1:8901 SHOT_DIR=/tmp/audit node audit-asset.mjs <family>/<slug>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const freePort = () => new Promise((res, rej) => {
  const s = createServer(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
const PORT = Number(process.env.CDP_PORT || await freePort());
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:8899';
console.error(`[audit-asset] BASE=${BASE}`);   // announce the tree we will measure (8899 often serves ANOTHER worktree)
const SHOT_DIR = process.env.SHOT_DIR || '.';
const target = process.argv[2];
const slug = target.split('/').pop();

// ---- inventory: identity comes from geometry.type + geometry.parameters, per the audit anchor ----
const INVENTORY = `(()=>{
  const key = Object.keys(globalThis).find(k=>/^__.*App$/.test(k) && globalThis[k] && globalThis[k].runtime && globalThis[k].runtime.renderer);
  if(!key) return {error:'no-app'};
  const rt = globalThis[key].runtime, scene = rt.scene, root = rt.root;
  const round = n => (typeof n === 'number' ? Math.round(n*1e4)/1e4 : n);
  const gid = g => {
    const p = g.parameters || {};
    const bits = Object.keys(p).sort().filter(k=>typeof p[k] !== 'object')
      .map(k=>k+'='+round(p[k])).join(',');
    return g.type + '(' + bits + ')';
  };
  const mid = m => {
    if(!m) return 'none';
    const o = [m.type, 'c#'+(m.color?m.color.getHexString():'-')];
    if(m.metalness !== undefined) o.push('met='+round(m.metalness));
    if(m.roughness !== undefined) o.push('rgh='+round(m.roughness));
    if(m.transmission) o.push('trans='+round(m.transmission));
    if(m.opacity !== undefined && m.transparent) o.push('op='+round(m.opacity));
    // ONLY when the emissive colour is actually non-black: every MeshStandardMaterial ships
    // emissiveIntensity 1 with a black emissive, so keying on the intensity flags everything.
    if(m.emissive && m.emissive.getHex() !== 0) o.push('emi='+round(m.emissiveIntensity)+'/#'+m.emissive.getHexString());
    if(m.side !== 0) o.push('side='+m.side);
    if(m.polygonOffset) o.push('poff='+m.polygonOffsetFactor);
    return o.join(' ');
  };
  // EVERY Object3D, not just meshes: an animated asset usually rotates/translates a GROUP, and a
  // mesh-only inventory reports "this button changes nothing" for a perfectly working animation.
  // Pairing across states uses traversal order (stable inside one page load, nothing is added or
  // removed); REPORTING uses the geometry signature, never the index.
  const items = [];
  const sigOf = o => {
    if(o.isMesh) return gid(o.geometry) + ' :: ' + mid(o.material);
    let first = null;
    o.traverse(n => { if(!first && n.isMesh) first = n; });
    const kids = o.children.length;
    return o.type + '[' + kids + ' children' + (first ? ', first mesh ' + gid(first.geometry) : '') + ']';
  };
  const walk = (o, path) => {
    o.children.forEach(c => {
      const p = path + '/' + (c.name || c.type);
      items.push({
        idx: items.length,
        kind: c.isInstancedMesh ? 'InstancedMesh' : (c.isMesh ? 'Mesh' : c.type),
        id: sigOf(c),
        instanced: !!c.isInstancedMesh,
        count: c.isInstancedMesh ? c.count : 1,
        visible: c.visible && (function(){ let n=c, v=true; while(n){ v = v && n.visible; n = n.parent; } return v; })(),
        pos: [round(c.position.x), round(c.position.y), round(c.position.z)],
        rot: [round(c.rotation.x), round(c.rotation.y), round(c.rotation.z)],
        scl: [round(c.scale.x), round(c.scale.y), round(c.scale.z)],
        path: p
      });
      walk(c, p);
    });
  };
  walk(root, 'root');
  const lights = [];
  scene.traverse(o=>{ if(o.isLight) lights.push({t:o.type, i:round(o.intensity),
    d:(o.distance!==undefined?round(o.distance):null), p:[round(o.position.x),round(o.position.y),round(o.position.z)]}); });
  root.traverse(o=>{ if(o.isLight) lights.push({t:o.type+'@root', i:round(o.intensity),
    d:(o.distance!==undefined?round(o.distance):null), p:[round(o.position.x),round(o.position.y),round(o.position.z)]}); });
  const btns = Array.from(document.querySelectorAll('#panel button')).map(b=>({id:b.id, label:b.textContent.trim(), on:b.classList.contains('on')}));
  const r = rt.renderer.info;
  return { app:key, items, lights, btns,
           render:{calls:r.render.calls, tris:r.render.triangles},
           exposure: round(rt.renderer.toneMappingExposure),
           envInt: round(scene.environmentIntensity === undefined ? 1 : scene.environmentIntensity) };
})()`;

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
const errors = [];
ws.addEventListener('message', ev=>{ const m = JSON.parse(ev.data);
  if(m.method==='Runtime.exceptionThrown' && m.sessionId===sessionId)
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
await send('Page.navigate',{url:`${BASE}/disenos/catalog/${target}/${slug}.html`},sessionId);
for(let i=0;i<100;i++){
  await sleep(200);
  try{ const r = await send('Runtime.evaluate',
    {expression:"document.documentElement.getAttribute('data-app-ready')==='true'", returnByValue:true}, sessionId);
    if(r.result && r.result.value===true) break; }catch{}
}
await sleep(900);

const evalInv = async ()=> (await send('Runtime.evaluate',{expression:INVENTORY, returnByValue:true}, sessionId)).result.value;
const shot = async name => {
  const s = await send('Page.captureScreenshot',{format:'png'},sessionId);
  writeFileSync(`${SHOT_DIR}/${slug}-${name}.png`, Buffer.from(s.data,'base64'));
};

const base = await evalInv();
// FAIL CLOSED. If the inventory did not come back, every downstream field is empty and the JSON
// reads `{"errors":[],"states":[]}` — indistinguishable from "audited, nothing wrong". That is the
// same trap the gate's preflight exists to close: a probe that could not measure must never emit a
// verdict. Seen for real on datacenter/crac-crah, which produced screenshots and an empty report.
if(!base || !base.app || !Array.isArray(base.items)){
  console.error(`INVENTORY FAILED for ${target}: the app hook was not readable.`);
  console.error(base && base.error ? `probe said: ${base.error}` : 'probe returned nothing.');
  console.error('NOT a verdict on the asset — nothing was measured. Re-run.');
  await send('Target.closeTarget',{targetId});
  ws.close(); proc.kill('SIGKILL');
  process.exit(2);
}
await shot('default');
const states = [];
for(const b of (base.btns || [])){
  if(b.id === 'btnRot') continue;                        // auto-rotate says nothing about geometry
  await send('Runtime.evaluate',{expression:`document.getElementById(${JSON.stringify(b.id)}).click()`}, sessionId);
  await sleep(1200);                                     // let damped animations settle
  const after = await evalInv();
  await shot(b.id);
  // Pair by traversal order (stable within one page load); DESCRIBE by geometry signature.
  const changes = [];
  const n = Math.min(base.items.length, after.items.length);
  if(base.items.length !== after.items.length)
    changes.push(`GRAPH  object count ${base.items.length} -> ${after.items.length} (pairing by order is unsafe here)`);
  for(let i=0;i<n;i++){
    const a = base.items[i], b2 = after.items[i];
    const who = `${b2.kind} ${b2.id}${b2.instanced ? ` (n=${b2.count})` : ''} @${b2.path}`;
    if(a.id !== b2.id){ changes.push(`SWAP   idx ${i}: ${a.id} -> ${b2.id}`); continue; }
    if(a.visible !== b2.visible) changes.push(`${b2.visible?'SHOWN ':'HIDDEN'} ${who}`);
    if(JSON.stringify(a.rot) !== JSON.stringify(b2.rot)) changes.push(`ROT    ${who} ${JSON.stringify(a.rot)} -> ${JSON.stringify(b2.rot)}`);
    if(JSON.stringify(a.pos) !== JSON.stringify(b2.pos)) changes.push(`MOVED  ${who} ${JSON.stringify(a.pos)} -> ${JSON.stringify(b2.pos)}`);
    if(JSON.stringify(a.scl) !== JSON.stringify(b2.scl)) changes.push(`SCALE  ${who} ${JSON.stringify(a.scl)} -> ${JSON.stringify(b2.scl)}`);
  }
  states.push({ button: b.id, label: b.label, changes,
                render: after.render, sameRender: JSON.stringify(after.render) === JSON.stringify(base.render) });
  // restore for the next button so states stay independent
  await send('Runtime.evaluate',{expression:`document.getElementById(${JSON.stringify(b.id)}).click()`}, sessionId);
  await sleep(900);
}
await send('Target.closeTarget',{targetId});
console.log(JSON.stringify({ target, app: base.app, errors,
  render: base.render, exposure: base.exposure, envInt: base.envInt,
  lights: base.lights, meshes: base.items, states }, null, 1));
ws.close(); proc.kill('SIGKILL');
process.exit(0);
