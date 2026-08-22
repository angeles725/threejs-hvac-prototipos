// COB-IM2 level-4 HVAC viewer — offline entry (data injected as window.FLOOR_DATA).
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);
scene.fog = new THREE.Fog(0x0e1116, 120, 320);

const data = window.FLOOR_DATA;
const F = data.floor;
const W = F.xmax - F.xmin, D = F.ymax - F.ymin;
const mapX = x => x - F.xmin;
const mapZ = y => F.ymax - y;            // B2/nave-panccadia: flip, do NOT mirror

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 2000);
// Grazing hero: low eye + target at the duct band so per-duct height/volume reads (a high eye flattens it).
camera.position.set(W*0.32, 17, D*1.5);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(W*0.5, 4.0, D*0.38);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2.02;

// design3d kit Rule 9 — deterministic capture hook: ?cam=x,y,z,tx,ty,tz scripts the viewpoint,
// window.__cam reads it back. Coordinates are world-space (already mapX/mapZ'd). QA over identical views.
const _camQ = new URLSearchParams(location.search).get('cam');
if (_camQ) { const c = _camQ.split(',').map(Number);
  if (c.length === 6 && c.every(Number.isFinite)) {
    camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); } }
window.__cam = () => { const p = camera.position, t = controls.target;
  return [p.x, p.y, p.z, t.x, t.y, t.z].map(v => +v.toFixed(2)); };

scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x2a2f38, 1.4));
const sun = new THREE.DirectionalLight(0xfff4e6, 1.4);
sun.position.set(W*0.3, 90, D*0.6); scene.add(sun);

// slab
const slab = new THREE.Mesh(new THREE.BoxGeometry(W+6, 0.3, D+6),
  new THREE.MeshStandardMaterial({ color:0x20262e, roughness:.95 }));
slab.position.set(W/2, -0.15, D/2); scene.add(slab);

// column grid
const gridGroup = new THREE.Group();
const CEIL = 4.2;
const colMat = new THREE.MeshStandardMaterial({ color:0x9aa7b4, roughness:.7 });
for (const gx of Object.values(F.gridX)) {
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.5,CEIL,0.5), colMat);
  col.position.set(mapX(gx), CEIL/2, D/2); gridGroup.add(col);
}
scene.add(gridGroup);

// ducts: solid extruded walls (merged mesh); height is per-duct from its W"xH" label (B8)
const H = 0.30;                          // fallback when a run carries no d.h
const pos = [], nor = [];
const pushQuad = (ax,az,bx,bz,z,h) => {
  const y0=z, y1=z+h;
  const A0=[ax,y0,az],B0=[bx,y0,bz],B1=[bx,y1,bz],A1=[ax,y1,az];
  let nx=-(bz-az), nz=(bx-ax); const L=Math.hypot(nx,nz)||1; nx/=L; nz/=L;
  for (const v of [A0,B0,B1, A0,B1,A1]) pos.push(v[0],v[1],v[2]);
  for (let i=0;i<6;i++) nor.push(nx,0,nz);
};
for (const d of data.ducts) { const z=d.z, h=d.h||H, p=d.p;
  for (let i=0;i<p.length-1;i++) pushQuad(mapX(p[i][0]),mapZ(p[i][1]), mapX(p[i+1][0]),mapZ(p[i+1][1]), z, h); }
const dg = new THREE.BufferGeometry();
dg.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
dg.setAttribute('normal', new THREE.Float32BufferAttribute(nor,3));
const ductMesh = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({
  color:0x3fb8c9, metalness:.45, roughness:.4, side:THREE.DoubleSide,
  emissive:0x0d3238, emissiveIntensity:.25 }));
scene.add(ductMesh);

// v5: closed footprints as SOLID boxes at true MRR width (B14) — length×h×width, rotated by MRR angle.
// rotation.y = box.ang works with the mapZ flip: the raw long-axis heading maps straight to the Y-rot.
const boxData = data.boxes || [];
const boxMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({ color:0x37a9ba, metalness:.5, roughness:.38,
    emissive:0x0d3238, emissiveIntensity:.2 }),
  boxData.length || 1);
{ const dummy = new THREE.Object3D();
  for (let i=0;i<boxData.length;i++) { const b=boxData[i], h=b.h||H;
    dummy.position.set(mapX(b.x), b.z + h/2, mapZ(b.y));
    dummy.rotation.set(0, b.ang, 0);
    dummy.scale.set(b.L, h, b.w);
    dummy.updateMatrix(); boxMesh.setMatrixAt(i, dummy.matrix); }
  boxMesh.instanceMatrix.needsUpdate = true; }
scene.add(boxMesh);

// round takeoffs
const roundGroup = new THREE.Group();
const rMat = new THREE.MeshStandardMaterial({ color:0xe6a13c, roughness:.5, metalness:.3 });
for (const r of data.rounds) {
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r.d/2, r.d/2, 0.5, 12), rMat);
  cyl.position.set(mapX(r.x), r.z-0.25, mapZ(r.y)); roundGroup.add(cyl);
}
scene.add(roundGroup);

// AHU massing (B9: 2 zones, [INFER])
const ahuGroup = new THREE.Group();
const ahuMat = new THREE.MeshStandardMaterial({ color:0xc23b3b, roughness:.6, metalness:.2, transparent:true, opacity:.35 });
for (const zone of [{x:95, w:8, d:7}, {x:164, w:7, d:6}]) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(zone.w, CEIL*0.8, zone.d), ahuMat);
  box.position.set(mapX(zone.x), CEIL*0.4, D/2); ahuGroup.add(box);
}
scene.add(ahuGroup);

// terminals
const supply = new Set(['SD','CD','SR','LD']), ret = new Set(['RR','ER']);
const termGroup = new THREE.Group();
const geoT = new THREE.BoxGeometry(0.6,0.12,0.6);
const matS = new THREE.MeshStandardMaterial({ color:0x4a86e8 });
const matR = new THREE.MeshStandardMaterial({ color:0xd9714a });
const matD = new THREE.MeshStandardMaterial({ color:0x8a929c });
for (const t of data.terminals) {
  const m = supply.has(t.t)?matS : ret.has(t.t)?matR : matD;
  const box = new THREE.Mesh(geoT, m);
  box.position.set(mapX(t.x), CEIL-0.15, mapZ(t.y)); termGroup.add(box);
}
scene.add(termGroup);

// ghosted context
const cv = [];
for (const c of data.context) { const p=c.p;
  for (let i=0;i<p.length-1;i++) cv.push(mapX(p[i][0]),0.03,mapZ(p[i][1]), mapX(p[i+1][0]),0.03,mapZ(p[i+1][1])); }
const cg = new THREE.BufferGeometry();
cg.setAttribute('position', new THREE.Float32BufferAttribute(cv,3));
const ctxLines = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color:0x6b7480, transparent:true, opacity:.5 }));
scene.add(ctxLines);

const bind = (id, obj) => { const el=document.getElementById(id); if(el) el.addEventListener('change', e => obj.visible = e.target.checked); };
bind('t_duct', ductMesh); bind('t_duct', boxMesh); bind('t_round', roundGroup); bind('t_term', termGroup);
bind('t_grid', gridGroup); bind('t_ctx', ctxLines); bind('t_ahu', ahuGroup);

const stats = document.getElementById('stats');
if (stats) stats.innerHTML =
  `${(data.ducts.length+boxData.length).toLocaleString()} tramos de ducto (${boxData.length.toLocaleString()} sólidos) · ${data.rounds.length} tomas · `+
  `${data.terminals.length} terminales · ${Object.keys(F.gridX).length} ejes<br>`+
  `Piso ${W.toFixed(0)}×${D.toFixed(0)} m · ducto @ BOD ${F.bod_median} m · unidad certificada 1 m`;

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
(function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene,camera); })();
