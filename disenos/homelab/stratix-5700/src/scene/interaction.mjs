// interaction.mjs — raycast hotspots (P5a INTERACTION-UI).
//
// The DOM buttons already drove every spec ui_control, but a button is a control panel,
// not an interaction with the OBJECT. This pass makes the switch itself clickable: click
// the port block to zoom into it, the LED column to energise the board, the terminal
// blocks to show the rail it mounts on.
//
// WHY THIS PUBLISHES A PROBE API. A capture harness that clicks at guessed pixels is the
// known way to manufacture fake defects — it toggles off what defaulted on and then
// reports "nothing visible". So this module exposes:
//   __qaHotspots()    screen rect, a CLICKABLE point, and a real occlusion test per
//                     hotspot — a ray from the camera must actually land on it.
//   __qaInteract(id)  performs a named interaction and returns the resulting state, so
//                     the probe never does pixel arithmetic at all.
// Both return raw data; neither returns a verdict. The consumer decides pass or fail.

import * as THREE from 'three';

/**
 * World points guaranteed to lie ON an object: each descendant mesh's bbox centre, and for
 * an InstancedMesh the translation of every instance.
 *
 * A group's own bbox centre is NOT such a point. On the sibling asset the mount studs were
 * four discs with the centroid in the gap between them, so a probe told to click the
 * centroid sailed past and hit the body — and the hotspot reported itself unreachable from
 * a view where it was plainly visible.
 */
function candidatePoints(root, limit = 64) {
  const pts = [];
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (!o.isMesh || pts.length >= limit) return;
    if (o.isInstancedMesh) {
      const step = Math.max(1, Math.floor(o.count / 12));
      for (let i = 0; i < o.count && pts.length < limit; i += step) {
        o.getMatrixAt(i, m);
        pts.push(v.setFromMatrixPosition(m).clone().applyMatrix4(o.matrixWorld));
      }
    } else {
      const b = new THREE.Box3().setFromObject(o, true);
      if (!b.isEmpty()) pts.push(b.getCenter(new THREE.Vector3()));
    }
  });
  return pts;
}

/**
 * @param {{renderer, camera, scene, sw, state, apply, onAction?}} opts
 */
export function createInteraction({ renderer, camera, scene, sw, state, apply, onAction }) {
  const dom = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Declared against NODE NAMES so a rebuilt scene keeps working and the ids stay stable
  // for a probe to address.
  const HOTSPOTS = [
    {
      id: 'ports', label: 'Bloque de puertos', node: 'port_block',
      hint: 'Acercar a los jacks',
      act: () => { state.view = state.view === 'port-detail' ? 'front' : 'port-detail'; apply.view(); return `vista ${state.view}`; },
    },
    {
      id: 'leds', label: 'Columna de diagnóstico', node: 'system_led_bank',
      hint: 'Energizar o apagar los LED',
      act: () => { state.leds = !state.leds; apply.leds(); return `leds ${state.leds ? 'ON' : 'OFF'}`; },
    },
    {
      id: 'terminals', label: 'Borneras superiores', node: 'top_terminals',
      hint: 'Mostrar u ocultar el riel DIN',
      act: () => { state.rail = !state.rail; apply.rail(); return `riel ${state.rail ? 'ON' : 'OFF'}`; },
    },
    {
      id: 'latch', label: 'Pestillo DIN', node: 'din_clip',
      hint: 'Ver la trasera',
      act: () => { state.view = state.view === 'rear' ? 'front' : 'rear'; apply.view(); return `vista ${state.view}`; },
    },
  ];

  const resolve = (h) => sw.root.getObjectByName(h.node) ?? null;

  /** Walk up from a hit object to the registered hotspot that owns it. */
  function hotspotFor(object) {
    for (const h of HOTSPOTS) {
      const root = resolve(h);
      if (!root) continue;
      for (let o = object; o; o = o.parent) if (o === root) return h;
    }
    return null;
  }

  function pick(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObject(sw.root, true)) {
      // Skip anything hidden: an invisible mesh still sits in the raycast set and would
      // let a click "land" on a part the viewer cannot see.
      let vis = true;
      for (let o = hit.object; o; o = o.parent) if (!o.visible) { vis = false; break; }
      if (!vis) continue;

      // STOP AT THE FIRST VISIBLE SURFACE, whatever it is. The obvious loop — keep going
      // until a hotspot turns up — silently defeats occlusion whenever the occluder is
      // not itself a hotspot: the DIN latch sits behind the enclosure, the ray hit the
      // housing first, the housing belongs to no hotspot, and the search sailed on
      // through it and reported the latch as clickable from the FRONT.
      //
      // A real click cannot pass through a solid body, so neither may this. If the nearest
      // surface is not a hotspot, the click lands on nothing.
      // Always report WHAT was hit, even when it belongs to no hotspot — a probe told
      // only "not clickable" cannot tell an occluded hotspot from a missing one.
      const h = hotspotFor(hit.object);
      return { hotspot: h, object: hit.object, point: hit.point, distance: hit.distance };
    }
    return null;
  }

  // ── pointer wiring ─────────────────────────────────────────────────────────
  let hovered = null;
  const tooltip = document.getElementById('tooltip');

  function setHover(h, x, y) {
    hovered = h;
    dom.style.cursor = h ? 'pointer' : 'default';
    if (!tooltip) return;
    if (h) {
      tooltip.textContent = `${h.label} — ${h.hint}`;
      tooltip.style.left = `${x + 14}px`;
      tooltip.style.top = `${y + 14}px`;
      tooltip.hidden = false;
    } else {
      tooltip.hidden = true;
    }
  }

  dom.addEventListener('pointermove', (e) => setHover(pick(e.clientX, e.clientY)?.hotspot ?? null, e.clientX, e.clientY));
  dom.addEventListener('pointerleave', () => setHover(null, 0, 0));
  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = pick(e.clientX, e.clientY);
    if (!r?.hotspot) return;
    onAction?.(`${r.hotspot.label}: ${r.hotspot.act()}`);
  });

  // ── probe API ──────────────────────────────────────────────────────────────
  function qaHotspots() {
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const W = dom.clientWidth || window.innerWidth;
    const H = dom.clientHeight || window.innerHeight;
    const rect = dom.getBoundingClientRect();

    const project = (v) => {
      const p = v.clone().project(camera);
      return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H];
    };
    const tryAt = (sx, sy) => pick(sx + rect.left, sy + rect.top);

    return HOTSPOTS.map((h) => {
      const root = resolve(h);
      const out = { id: h.id, label: h.label, hint: h.hint, present: !!root };
      if (!root) return out;

      let visible = true;
      for (let o = root; o; o = o.parent) if (!o.visible) { visible = false; break; }
      out.visible = visible;

      const box = new THREE.Box3().setFromObject(root, true);
      if (box.isEmpty()) { out.empty = true; return out; }
      const mn = box.min;
      const mx = box.max;
      const pts = [
        [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
        [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
      ].map((c) => project(new THREE.Vector3(...c)));
      out.rect = {
        left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])),
        top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])),
      };

      // `centre` is defined as A POINT THAT ACTUALLY HITS, not the geometric centroid.
      // When `clickable` is true this point is guaranteed to land on this hotspot.
      out.bboxCentre = project(box.getCenter(new THREE.Vector3()));
      out.centre = out.bboxCentre;
      out.centreSource = 'bbox';
      let hit = tryAt(...out.bboxCentre);
      if (hit?.hotspot?.id !== h.id) {
        for (const p of candidatePoints(root)) {
          const [sx, sy] = project(p);
          const probe = tryAt(sx, sy);
          if (probe?.hotspot?.id === h.id) {
            hit = probe;
            out.centre = [sx, sy];
            out.centreSource = 'sampled';
            break;
          }
        }
      }
      out.clickable = hit?.hotspot?.id === h.id;
      out.blockedBy = out.clickable ? null : (hit?.hotspot?.id ?? hit?.object?.name ?? 'nothing hit');
      return out;
    });
  }

  function qaInteract(id) {
    const h = HOTSPOTS.find((x) => x.id === id);
    if (!h) return { ok: false, error: `unknown hotspot: ${id}` };
    const result = h.act();
    onAction?.(`${h.label}: ${result}`);
    return { ok: true, id, result };
  }

  return { HOTSPOTS, qaHotspots, qaInteract, pick, get hovered() { return hovered; } };
}
