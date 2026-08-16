// Interaction for the AISLE SCENE.
//
// Two rules arrive here as mandatory carry-overs from closed assets, and this is the first
// place where BOTH are load-bearing at once.
//
// 1. THE PICK STOPS AT THE FIRST OPAQUE SURFACE, hotspot or not. The obvious loop — keep
//    walking the hit list until a hotspot turns up — silently defeats occlusion whenever the
//    occluder is not itself a hotspot. On the standalone PDU that case never manifested,
//    because every occluder there WAS a hotspot; in an aisle the rack frame, the doors and the
//    neighbouring cabinets are all non-hotspot occluders, so the defect that could not appear
//    in isolation is the normal case here. A real click cannot pass through a solid body.
//
// 2. A CLICK PASSES THROUGH TRANSPARENT SURFACES. Someone looking at the UPS through a glass
//    cabinet door, or at the lounge through the partition, would be right to call a blocked
//    click broken. The glass stays pickable at LOWER PRIORITY: it answers only when nothing
//    opaque and interactive lies behind the ray.
//
// Together they say: REACHABILITY BY CLICK MUST AGREE WITH REACHABILITY BY EYE. That is not a
// slogan here — verifyCriticalsAreVisible already skips transparent occluders when it decides
// whether the judge can SEE a critical, so a pick that treated glass as solid would contradict
// the visibility guard about the same pane. verifyClickAgreesWithSight below asserts the two
// agree, comparing one part of the model against another rather than against a constant.
//
// WHY THIS PUBLISHES A PROBE API. A harness that clicks at guessed pixels manufactures fake
// defects — it turns off what defaulted on and then reports that nothing is visible. So the
// module exposes __qaHotspots() and __qaInteract(id), which return raw data and never a
// verdict; the consumer decides pass or fail.
import * as THREE from 'three';

const isVisible = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
const isTransparent = (o) => {
  const m = o.material;
  return Array.isArray(m) ? m.every((x) => x.transparent) : !!m?.transparent;
};

/** World points guaranteed to lie ON an object: each visible descendant mesh's bbox centre. */
function samplePoints(node, limit = 24) {
  const pts = [];
  node.traverseVisible((m) => {
    if (!m.isMesh || pts.length >= limit) return;
    const b = new THREE.Box3().setFromObject(m, true);
    if (!b.isEmpty()) pts.push(b.getCenter(new THREE.Vector3()));
  });
  if (!pts.length) {
    const b = new THREE.Box3().setFromObject(node, true);
    if (!b.isEmpty()) pts.push(b.getCenter(new THREE.Vector3()));
  }
  return pts;
}

export function createInteraction({ dom, camera, scene, aisle, apply, state }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const HOTSPOTS = [
    { id: 'ups', label: 'UPS', node: 'mounted_ups', hint: 'Ver el UPS en el rack' },
    { id: 'fmps', label: 'FMPS', node: 'mounted_fmps', hint: 'Ver el FMPS' },
    { id: 'stratix', label: 'Stratix 5700', node: 'mounted_stratix', hint: 'Ver el switch' },
    { id: 'pdu', label: 'PDU doble', node: 'mounted_pdu_pair', hint: 'Ver las PDU' },
    { id: 'camera', label: 'Cámara Axis', node: 'ceiling_camera', hint: 'Ver la cámara de techo' },
    {
      // LOWEST PRIORITY, and transparent. It answers only where nothing opaque and
      // interactive sits behind the ray: click the glass over empty aisle and the view
      // changes; click the glass over the UPS and you get the UPS.
      id: 'partition', label: 'Mampara', node: 'glass_partition', veil: true,
      hint: 'Cambiar a la vista de pasillo',
    },
  ];

  const root = aisle.root;
  const nodeFor = (h) => root.getObjectByName(h.node) ?? null;
  const owners = new Map();
  for (const h of HOTSPOTS) {
    const n = nodeFor(h);
    if (!n) { console.error(`[interaction] hotspot "${h.id}" resolves to no node "${h.node}"`); continue; }
    n.traverse((o) => owners.set(o, h));
  }
  const hotspotFor = (o) => { for (let n = o; n; n = n.parent) if (owners.has(n)) return owners.get(n); return null; };

  function pick(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return pickRay(raycaster);
  }

  // Split out so the QA hooks and the guards exercise THE SAME code path the pointer does.
  // A probe with its own private copy of the rule proves nothing about the shipped one.
  function pickRay(ray) {
    let veiled = null;
    for (const hit of ray.intersectObject(root, true)) {
      if (!isVisible(hit.object)) continue;      // hidden geometry is not clickable

      if (isTransparent(hit.object)) {
        // Remember it and keep going: a veil does not stop the eye, so it must not stop the
        // click — but it remains the answer if nothing opaque follows.
        veiled ??= { hotspot: hotspotFor(hit.object), object: hit.object, point: hit.point, distance: hit.distance };
        continue;
      }
      // Always report WHAT was hit, even when it belongs to no hotspot: a probe told only
      // "not clickable" cannot tell an occluded hotspot from a missing one.
      return {
        hotspot: hotspotFor(hit.object), object: hit.object,
        point: hit.point, distance: hit.distance, through: veiled?.hotspot?.id ?? null,
      };
    }
    return veiled ?? null;
  }

  let hovered = null;
  const tooltip = typeof document !== 'undefined' ? document.getElementById('tooltip') : null;
  function setHover(h, x, y) {
    hovered = h;
    dom.style.cursor = h ? 'pointer' : 'default';
    if (!tooltip) return;
    if (h) {
      tooltip.textContent = `${h.label} — ${h.hint}`;
      tooltip.style.left = `${x + 14}px`;
      tooltip.style.top = `${y + 14}px`;
      tooltip.hidden = false;
    } else { tooltip.hidden = true; }
  }

  const act = (h) => {
    if (!h) return null;
    if (h.id === 'partition') { apply.view('aisle'); return 'vista aisle'; }
    apply.view('hero-rack');
    apply.focus?.(h.id);
    return `foco ${h.id}`;
  };

  dom.addEventListener('pointermove', (e) => {
    const r = pick(e.clientX, e.clientY);
    setHover(r?.hotspot ?? null, e.clientX, e.clientY);
  });
  dom.addEventListener('pointerdown', (e) => {
    const r = pick(e.clientX, e.clientY);
    if (r?.hotspot) act(r.hotspot);
  });

  // ── probe API — raw data, never a verdict ────────────────────────────────────
  function project(p) {
    const v = p.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * dom.clientWidth, y: (-v.y * 0.5 + 0.5) * dom.clientHeight, ndc: [v.x, v.y] };
  }

  function hotspotReport() {
    scene.updateMatrixWorld(true);
    return HOTSPOTS.map((h) => {
      const n = nodeFor(h);
      if (!n) return { id: h.id, present: false };
      // A CLICKABLE POINT, not the centre of the screen rect: the centre of a hotspot's
      // bounding box can easily lie outside the hotspot itself, and probing there reports a
      // perfectly reachable part as unreachable.
      let clickable = null;
      let blocker = null;
      let offscreen = 0;
      for (const p of samplePoints(n)) {
        const dir = p.clone().sub(camera.position).normalize();
        const ray = new THREE.Raycaster(camera.position.clone(), dir);
        const r = pickRay(ray);
        if (r?.hotspot?.id === h.id) {
          const scr = project(p);
          // REACHED BY RAY IS NOT THE SAME AS CLICKABLE. The ceiling camera reported a
          // "clickable" point at (3383, -5553) in a 1600x900 viewport: nothing opaque stood in
          // front of it, so the ray arrived, but no user can put a cursor there. A point
          // outside the frame is not a place anyone can click, and a probe that returns one
          // hands the consumer a coordinate that will silently miss.
          if (Math.abs(scr.ndc[0]) > 1 || Math.abs(scr.ndc[1]) > 1) { offscreen += 1; continue; }
          clickable = scr;
          break;
        }
        if (r && !blocker) blocker = r.object?.name ?? null;
      }
      return { id: h.id, present: true, veil: !!h.veil, clickable, blocker, offscreen };
    });
  }

  if (typeof window !== 'undefined') {
    window.__qaHotspots = hotspotReport;
    window.__qaInteract = (id) => {
      const h = HOTSPOTS.find((x) => x.id === id);
      if (!h) return { ok: false, reason: `no hotspot "${id}"` };
      const result = act(h);
      return { ok: true, id, result, view: state.view };
    };
  }

  return { pick, pickRay, hotspotReport, HOTSPOTS, hotspotFor, get hovered() { return hovered; } };
}

// ── guards ──────────────────────────────────────────────────────────────────────
// RELATIONAL, not against a typed constant: it compares what the PICK does with what the
// VISIBILITY check does, so neither can drift into disagreeing with the other about the same
// pane of glass. If the transparency rule is ever removed from one of them, this fires.
export function verifyClickAgreesWithSight(interaction, camera, root) {
  let failed = 0;
  const glass = [];
  root.traverse((o) => { if (o.isMesh && isTransparent(o) && isVisible(o)) glass.push(o); });
  if (!glass.length) {
    console.error('[interaction] no visible transparent surface in the scene — the transparency '
      + 'rule is untested here, and a rule nothing exercises is not known to work');
    return 1;
  }
  for (const g of glass) {
    // Fire a ray from the camera straight at the glass. Whatever comes back must NOT be the
    // glass itself unless there is genuinely nothing opaque behind it.
    const p = new THREE.Box3().setFromObject(g, true).getCenter(new THREE.Vector3());
    const dir = p.clone().sub(camera.position).normalize();
    const hit = interaction.pickRay(new THREE.Raycaster(camera.position.clone(), dir));
    if (!hit) continue;
    if (hit.object === g) {
      // Allowed only if nothing opaque lies beyond: check by continuing past it.
      const beyond = new THREE.Raycaster(p.clone().addScaledVector(dir, 0.01), dir)
        .intersectObject(root, true).filter((x) => isVisible(x.object) && !isTransparent(x.object));
      if (beyond.length) {
        console.error(`[interaction] a click on "${g.name}" stops AT the glass while `
          + `"${beyond[0].object.name}" sits behind it — the pick treats a pane the visibility `
          + 'check sees through as solid');
        failed += 1;
      }
    }
  }
  return failed;
}

// The carried-over PDU defect, asserted directly: a ray must never report a hotspot that sits
// behind an opaque non-hotspot occluder. Stated as a property of the RESULT rather than of the
// loop, so it stays true however the pick is rewritten.
export function verifyPickCannotReachThroughSolids(interaction, camera, root) {
  let failed = 0;
  for (const h of interaction.HOTSPOTS) {
    const n = root.getObjectByName(h.node);
    if (!n) continue;
    for (const p of samplePoints(n, 8)) {
      const dir = p.clone().sub(camera.position).normalize();
      const ray = new THREE.Raycaster(camera.position.clone(), dir);
      const result = interaction.pickRay(ray);
      if (result?.hotspot?.id !== h.id) continue;
      // It claims this hotspot is clickable — so nothing opaque may sit in front of the point.
      const blockers = ray.intersectObject(root, true).filter((x) => isVisible(x.object)
        && !isTransparent(x.object)
        && x.distance < result.distance - 1e-4
        && interaction.hotspotFor(x.object)?.id !== h.id);
      if (blockers.length) {
        console.error(`[interaction] "${h.id}" reports as clickable although `
          + `"${blockers[0].object.name}" is opaque and in front of it — the ray walked `
          + 'through solid geometry');
        failed += 1;
        break;
      }
    }
  }
  return failed;
}
