// interaction.mjs — raycast hotspots (P5a INTERACTION-UI).
//
// The DOM buttons already drove every spec ui_control, but a button is a control panel, not
// an interaction with the OBJECT. This pass makes the camera itself clickable: click the
// bubble to lift it, the lens module to swing its tilt, the collar to show the ceiling.
//
// ── THE RULE THIS ASSET BREAKS, AND WHY ──────────────────────────────────────────
//
// The inherited pick() stops at the FIRST VISIBLE SURFACE, whatever it is. That rule exists
// because a click cannot pass through a solid body, and dropping it let a sibling asset
// report a hotspot behind an enclosure as clickable from the front.
//
// It is still right for solids and WRONG for a veil. The whole point of this subject is that
// you can SEE THROUGH the bubble — the optics are legible behind it, the framing check
// proves 43/43 of the front element is reachable through it. A user looking straight at the
// lens through clear polycarbonate and finding the click blocked by glass they can see
// through would be right to call that broken.
//
// So the rule becomes: a click passes through TRANSPARENT surfaces and stops at the first
// OPAQUE one. Exactly the criterion the framing check already uses for visibility, which is
// the point — reachability by eye and reachability by click should agree.
//
// The bubble is still a hotspot, at LOWER PRIORITY: it answers only when nothing opaque and
// interactive sits behind the ray. Click the glass over empty space and the dome lifts;
// click the glass over the lens and you get the lens. That is what the geometry says should
// happen.
//
// WHY THIS PUBLISHES A PROBE API. A harness that clicks at guessed pixels is the known way
// to manufacture fake defects — it toggles off what defaulted on and then reports "nothing
// visible". So this module exposes:
//   __qaHotspots()    screen rect, a CLICKABLE point, and a real occlusion test per hotspot
//   __qaInteract(id)  performs a named interaction and returns the resulting state
// Both return raw data; neither returns a verdict. The consumer decides pass or fail.

import * as THREE from 'three';

/**
 * World points guaranteed to lie ON an object: each descendant mesh's bbox centre, and for
 * an InstancedMesh the translation of every instance.
 *
 * A group's own bbox centre is NOT such a point, and this asset proves it twice over: the
 * pan yoke is TWO ARMS with a gap between them, so its centroid sits in mid-air between the
 * arms — right where the lens barrel happens to be. A probe told to click the centroid would
 * hit the barrel and report the yoke unreachable from a view where both arms are plainly
 * visible.
 */
function candidatePoints(root, limit = 64) {
  const pts = [];
  const v = new THREE.Vector3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (!o.isMesh || pts.length >= limit) return;
    const b = new THREE.Box3().setFromObject(o, true);
    if (!b.isEmpty()) pts.push(b.getCenter(new THREE.Vector3()));
    // Also sample the surface: a hollow tube's bbox centre is inside its own void.
    const pos = o.geometry?.attributes?.position;
    if (!pos) return;
    const stride = Math.max(1, Math.floor(pos.count / 8));
    for (let i = 0; i < pos.count && pts.length < limit; i += stride) {
      pts.push(v.fromBufferAttribute(pos, i).clone().applyMatrix4(o.matrixWorld));
    }
  });
  return pts;
}

/**
 * @param {{renderer, camera, scene, cam3d, state, apply, onAction?}} opts
 */
export function createInteraction({ renderer, camera, cam3d, state, apply, onAction }) {
  const dom = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const root = cam3d.root;

  const TILTS = [0, 22, 45];

  // Declared against NODE NAMES so a rebuilt scene keeps working and the ids stay stable
  // for a probe to address.
  const HOTSPOTS = [
    {
      id: 'lens', label: 'Módulo óptico', node: 'lens_module',
      hint: 'Inclinar la lente',
      act: () => {
        const next = TILTS[(TILTS.indexOf(state.tilt) + 1) % TILTS.length];
        apply.tilt(next);
        return `inclinación ${next}°`;
      },
    },
    {
      id: 'collar', label: 'Anillo de montaje', node: 'mount_base',
      hint: 'Mostrar u ocultar el techo',
      act: () => { apply.ceiling(!state.ceiling); return `techo ${state.ceiling ? 'ON' : 'OFF'}`; },
    },
    {
      id: 'yoke', label: 'Horquilla de soporte', node: 'yoke_arms',
      hint: 'Cambiar entre hero e inferior',
      act: () => { apply.view(state.view === 'hero' ? 'under' : 'hero'); return `vista ${state.view}`; },
    },
    {
      // LOWEST PRIORITY, and transparent — see the header. It answers only where nothing
      // opaque and interactive is behind the ray.
      id: 'dome', label: 'Cúpula', node: 'dome_bubble',
      hint: 'Quitar o poner la cúpula',
      veil: true,
      act: () => { apply.dome(!state.dome); return `cúpula ${state.dome ? 'ON' : 'OFF'}`; },
    },
  ];

  const resolve = (h) => root.getObjectByName(h.node) ?? null;

  /** Walk up from a hit object to the registered hotspot that owns it. */
  function hotspotFor(object) {
    for (const h of HOTSPOTS) {
      const r = resolve(h);
      if (!r) continue;
      for (let o = object; o; o = o.parent) if (o === r) return h;
    }
    return null;
  }

  const isVisible = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  const isTransparent = (o) => {
    const m = o.material;
    return Array.isArray(m) ? m.every((x) => x.transparent) : !!m?.transparent;
  };

  function pick(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    let veiled = null;   // a transparent hotspot the ray passed through
    for (const hit of raycaster.intersectObject(root, true)) {
      if (!isVisible(hit.object)) continue;      // hidden geometry is not clickable

      if (isTransparent(hit.object)) {
        // Remember it, keep going. A veil does not stop the eye, so it must not stop the
        // click — but it stays available as the answer if nothing opaque follows.
        veiled ??= { hotspot: hotspotFor(hit.object), object: hit.object, point: hit.point, distance: hit.distance };
        continue;
      }

      // FIRST OPAQUE SURFACE ENDS THE RAY, hotspot or not. The obvious loop — keep going
      // until a hotspot turns up — silently defeats occlusion whenever the occluder is not
      // itself a hotspot: the ray would sail through the housing and report parts behind it
      // as clickable. Always report WHAT was hit, so a probe can tell an occluded hotspot
      // from a missing one.
      const h = hotspotFor(hit.object);
      if (h) return { hotspot: h, object: hit.object, point: hit.point, distance: hit.distance, through: veiled?.hotspot?.id ?? null };
      return { hotspot: null, object: hit.object, point: hit.point, distance: hit.distance, through: veiled?.hotspot?.id ?? null };
    }
    return veiled ?? null;
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
    root.updateMatrixWorld(true);
    const W = dom.clientWidth || window.innerWidth;
    const H = dom.clientHeight || window.innerHeight;
    const rect = dom.getBoundingClientRect();

    const project = (v) => {
      const p = v.clone().project(camera);
      return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H];
    };
    const tryAt = (sx, sy) => pick(sx + rect.left, sy + rect.top);

    return HOTSPOTS.map((h) => {
      const node = resolve(h);
      const out = { id: h.id, label: h.label, hint: h.hint, present: !!node, veil: !!h.veil };
      if (!node) return out;
      out.visible = isVisible(node);

      const box = new THREE.Box3().setFromObject(node, true);
      if (box.isEmpty()) { out.empty = true; return out; }
      const mn = box.min; const mx = box.max;
      const pts = [
        [mn.x, mn.y, mn.z], [mx.x, mn.y, mn.z], [mn.x, mx.y, mn.z], [mx.x, mx.y, mn.z],
        [mn.x, mn.y, mx.z], [mx.x, mn.y, mx.z], [mn.x, mx.y, mx.z], [mx.x, mx.y, mx.z],
      ].map((c) => project(new THREE.Vector3(...c)));
      out.rect = {
        left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])),
        top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])),
      };

      // `centre` is defined as A POINT THAT ACTUALLY HITS, not the geometric centroid.
      out.bboxCentre = project(box.getCenter(new THREE.Vector3()));
      out.centre = out.bboxCentre;
      out.centreSource = 'bbox';
      let hit = tryAt(...out.bboxCentre);
      if (hit?.hotspot?.id !== h.id) {
        for (const p of candidatePoints(node)) {
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
