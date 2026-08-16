// interaction.mjs — raycast hotspots (P5a INTERACTION-UI).
//
// The DOM buttons already drove every spec ui_control, but a button is a control panel,
// not an interaction with the OBJECT. This pass makes the model itself clickable: click
// the head to wake its display, click a strip to solo that feed, click the rear studs to
// hide them again.
//
// WHY THIS EXPOSES A PROBE API. A capture harness that clicks at guessed pixel positions
// is the known way to manufacture fake defects — it toggles off what defaulted on and
// reports "nothing visible". So this module publishes two hooks:
//   __qaHotspots()      screen-space rect + centroid of every hotspot, plus a REAL
//                       occlusion test (a ray from the camera through the centroid must
//                       actually land on that hotspot), so a probe clicks where something
//                       is rather than where something ought to be.
//   __qaInteract(id)    performs a named interaction deterministically and returns the
//                       resulting state — no pixel arithmetic in the probe at all.
// Both return raw data. Neither returns a verdict; the consumer decides pass or fail.

import * as THREE from 'three';

/**
 * @param {{renderer, camera, scene, pdu, state, apply: Record<string, Function>,
 *          onAction?: (msg: string) => void}} opts
 */
export function createInteraction({ renderer, camera, scene, pdu, state, apply, onAction }) {
  const dom = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Hotspots are declared against NODE NAMES, not object references, so a rebuilt scene
  // keeps working and the ids stay stable for a probe to address.
  const HOTSPOTS = [
    {
      id: 'head_a', label: 'Head A', node: 'head_module', strip: 'feed_a_strip',
      hint: 'Encender / apagar el display',
      act: () => { state.head = !state.head; apply.head(); return `display ${state.head ? 'ON' : 'OFF'}`; },
    },
    {
      id: 'head_b', label: 'Head B', node: 'head_module', strip: 'feed_b_strip',
      hint: 'Encender / apagar el display',
      act: () => { state.head = !state.head; apply.head(); return `display ${state.head ? 'ON' : 'OFF'}`; },
    },
    {
      id: 'strip_a', label: 'Tira A (roja)', node: 'strip_body', strip: 'feed_a_strip',
      hint: 'Aislar el feed A',
      act: () => { state.feed = state.feed === 'a' ? 'ab' : 'a'; apply.feed(); return `feed ${state.feed}`; },
    },
    {
      id: 'strip_b', label: 'Tira B (azul)', node: 'strip_body', strip: 'feed_b_strip',
      hint: 'Aislar el feed B',
      act: () => { state.feed = state.feed === 'b' ? 'ab' : 'b'; apply.feed(); return `feed ${state.feed}`; },
    },
    {
      id: 'mounts_a', label: 'Botones montaje', node: 'mount_buttons', strip: 'feed_a_strip',
      hint: 'Ocultar los botones de montaje',
      act: () => { state.mounts = !state.mounts; apply.mounts(); return `mounts ${state.mounts ? 'ON' : 'OFF'}`; },
    },
  ];

  const resolve = (h) => {
    const strip = h.strip === 'feed_a_strip' ? pdu.feedA : pdu.feedB;
    return strip.getObjectByName(h.node) ?? null;
  };

/**
 * World-space points guaranteed to lie on an object: each descendant mesh's bbox centre,
 * and for an InstancedMesh the translation of every instance. Used to find a click point
 * for sparse groups, where the group's own bbox centre falls in empty space.
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

  /** Walk up from a hit object to the deepest registered hotspot that owns it. */
  function hotspotFor(object) {
    for (const h of HOTSPOTS) {
      const root = resolve(h);
      if (!root) continue;
      let o = object;
      while (o) { if (o === root) return h; o = o.parent; }
    }
    return null;
  }

  function pick(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(pdu.root, true);
    for (const hit of hits) {
      // Skip anything hidden: an invisible mesh still sits in the BVH and would let a
      // click "land" on a part the viewer cannot see.
      let vis = true;
      for (let o = hit.object; o; o = o.parent) if (!o.visible) { vis = false; break; }
      if (!vis) continue;
      const h = hotspotFor(hit.object);
      if (h) return { hotspot: h, point: hit.point, distance: hit.distance };
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

  dom.addEventListener('pointermove', (e) => {
    const r = pick(e.clientX, e.clientY);
    setHover(r?.hotspot ?? null, e.clientX, e.clientY);
  });
  dom.addEventListener('pointerleave', () => setHover(null, 0, 0));

  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = pick(e.clientX, e.clientY);
    if (!r) return;
    const msg = r.hotspot.act();
    onAction?.(`${r.hotspot.label}: ${msg}`);
  });

  // ── probe API ──────────────────────────────────────────────────────────────
  /** Screen-space geometry + a genuine occlusion test for every hotspot. */
  function qaHotspots() {
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const W = dom.clientWidth || window.innerWidth;
    const H = dom.clientHeight || window.innerHeight;

    return HOTSPOTS.map((h) => {
      const root = resolve(h);
      const out = { id: h.id, label: h.label, hint: h.hint, present: !!root };
      if (!root) return out;

      let visible = true;
      for (let o = root; o; o = o.parent) if (!o.visible) { visible = false; break; }
      out.visible = visible;

      const box = new THREE.Box3().setFromObject(root, true);
      if (box.isEmpty()) { out.empty = true; return out; }
      const centre = box.getCenter(new THREE.Vector3());
      out.worldCentre = centre.toArray();

      const project = (v) => {
        const p = v.clone().project(camera);
        return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H];
      };
      const mn = box.min, mx = box.max;
      const pts = [
        [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
        [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
      ].map((c) => project(new THREE.Vector3(...c)));
      out.rect = {
        left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])),
        top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])),
      };
      out.bboxCentre = project(centre);

      // OCCLUSION, actually tested: fire the same ray a click would and see whether this
      // hotspot is what answers. A centre that projects on screen proves nothing — the
      // other strip, or the strip's own body, may be in front of it.
      //
      // And the bbox centroid is NOT necessarily ON the hotspot. mount_buttons is four
      // studs at y = ±0.2 and ±0.6; its centroid is y = 0, i.e. the gap between them. A
      // probe told to click there would sail past the studs and hit the strip body. So
      // `centre` is defined as A POINT THAT ACTUALLY HITS: the centroid when that works,
      // otherwise the first sample over the projected rect that does. When `clickable`
      // is true, `centre` is guaranteed to land on this hotspot.
      const box2 = dom.getBoundingClientRect();
      const tryAt = (sx, sy) => pick(sx + box2.left, sy + box2.top);

      let hit = tryAt(...out.bboxCentre);
      out.centre = out.bboxCentre;
      out.centreSource = 'bbox';

      if (hit?.hotspot?.id !== h.id) {
        // Sample points that are ON THE GEOMETRY, not a grid over the rect. A blind grid
        // fails exactly where it is needed: the mount studs are 4 discs ~5 px across in a
        // 500 px column, so a coarse grid lands in the gaps every time and reports a
        // reachable hotspot as unreachable.
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
      out.blockedBy = hit && hit.hotspot.id !== h.id ? hit.hotspot.id : null;
      return out;
    });
  }

  /** Perform a named interaction. Deterministic — no pixel arithmetic in the probe. */
  function qaInteract(id) {
    const h = HOTSPOTS.find((x) => x.id === id);
    if (!h) return { ok: false, error: `unknown hotspot: ${id}` };
    const msg = h.act();
    onAction?.(`${h.label}: ${msg}`);
    return { ok: true, id, result: msg };
  }

  return { HOTSPOTS, qaHotspots, qaInteract, pick, get hovered() { return hovered; } };
}
