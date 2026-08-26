/**
 * hvac-catalog.js — parametric HVAC / piping component generators for three.js.
 *
 * Self-contained: needs nothing but a THREE namespace. No modules, no CDN.
 *
 * Every generator returns:
 *   { geometry, ports, meta }
 *
 * A PORT is the contract that lets a graph node connect two components without
 * guessing, the same role IfcDuctFitting ports play in a Revit model:
 *   { id, p:[x,y,z], dir:[x,y,z], shape:'rect'|'round', w,h  (rect) | d (round) }
 *   `dir` always points OUT of the component, so two components mate when
 *   portA.dir = -portB.dir and their sections agree.
 *
 * Canonical local frame for every component:
 *   +X  primary flow direction
 *   +Y  up (duct height is measured along Y)
 *   +Z  lateral
 *   origin at the inlet port face
 *
 * Units are metres. Duct sizes are given in metres; use IN(n) for inches.
 */
(function (global) {
  'use strict';
  const T = global.THREE;
  if (!T) throw new Error('hvac-catalog.js needs THREE loaded first');

  const IN = n => n * 0.0254;
  const V = (x, y, z) => new T.Vector3(x, y, z);

  // ── section rings ────────────────────────────────────────────────────────
  // A ring is an array of Vector3 in the section plane (local YZ at u=0),
  // ordered so the swept surface faces outwards.

  function ringRect(w, h, n) {
    // corners, optionally resampled to n points so a rect can loft into a round
    const hw = w / 2, hh = h / 2;
    const corners = [V(0, -hh, -hw), V(0, -hh, hw), V(0, hh, hw), V(0, hh, -hw)];
    if (!n || n === 4) return corners;
    const out = [];
    const per = n / 4;
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      for (let k = 0; k < per; k++) out.push(a.clone().lerp(b, k / per));
    }
    return out;
  }

  function ringRound(d, n) {
    const r = d / 2, out = [];
    // start at -Z and run the same way round as ringRect, so lofts do not twist
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (2 * Math.PI * i) / n;
      out.push(V(0, -r * Math.sin(a), r * Math.cos(a)));
    }
    return out;
  }

  // ── sweep ────────────────────────────────────────────────────────────────
  /**
   * Sweep rings along a path of frames.
   * frames: [{ o:Vector3 origin, x:Vector3 tangent, y:Vector3 up }]
   * rings:  array (one per frame) of section rings, all the same length
   */
  function sweep(frames, rings, capStart, capEnd) {
    const pos = [], nor = [];
    const world = frames.map((f, i) => {
      const z = new T.Vector3().crossVectors(f.x, f.y).normalize();
      return rings[i].map(p =>
        f.o.clone()
          .addScaledVector(f.y, p.y)
          .addScaledVector(z, p.z)
          .addScaledVector(f.x, p.x));
    });
    const N = rings[0].length;
    const tri = (a, b, c) => {
      const e1 = b.clone().sub(a), e2 = c.clone().sub(a);
      const n = new T.Vector3().crossVectors(e1, e2).normalize();
      for (const v of [a, b, c]) { pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); }
    };
    for (let i = 0; i < world.length - 1; i++) {
      for (let k = 0; k < N; k++) {
        const j = (k + 1) % N;
        tri(world[i][k], world[i][j], world[i + 1][j]);
        tri(world[i][k], world[i + 1][j], world[i + 1][k]);
      }
    }
    const cap = (ring, flip) => {
      const c = ring.reduce((a, p) => a.add(p.clone()), new T.Vector3()).divideScalar(ring.length);
      for (let k = 0; k < ring.length; k++) {
        const j = (k + 1) % ring.length;
        if (flip) tri(c, ring[j], ring[k]); else tri(c, ring[k], ring[j]);
      }
    };
    if (capStart) cap(world[0], true);
    if (capEnd) cap(world[world.length - 1], false);

    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    return g;
  }

  const frame = (ox, oy, oz, tx, ty, tz) => ({
    o: V(ox, oy, oz), x: V(tx, ty, tz).normalize(), y: V(0, 1, 0)
  });

  function merge(geos) {
    const pos = [], nor = [];
    for (const g of geos) {
      const p = g.getAttribute('position').array, n = g.getAttribute('normal').array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    return g;
  }

  function transform(g, m) {
    const out = g.clone();
    out.applyMatrix4(m);
    return out;
  }

  const P = (id, p, dir, sec) => Object.assign({ id, p, dir }, sec);
  const RECT = (w, h) => ({ shape: 'rect', w, h });
  const ROUND = d => ({ shape: 'round', d });

  // ── components ───────────────────────────────────────────────────────────
  const C = {};

  /** Straight rectangular duct. */
  C.straightRect = ({ w = IN(12), h = IN(8), length = 1.0 }) => ({
    geometry: sweep(
      [frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
      [ringRect(w, h), ringRect(w, h)], true, true),
    ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w, h)),
            P('out', [length, 0, 0], [1, 0, 0], RECT(w, h))],
    meta: { kind: 'straight-rect', label: `Ducto recto ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)}"`, length }
  });

  /** Straight round duct. */
  C.straightRound = ({ d = IN(8), length = 1.0, segments = 20 }) => ({
    geometry: sweep(
      [frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
      [ringRound(d, segments), ringRound(d, segments)], true, true),
    ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(d)),
            P('out', [length, 0, 0], [1, 0, 0], ROUND(d))],
    meta: { kind: 'straight-round', label: `Ducto redondo Ø${(d / 0.0254).toFixed(0)}"`, length }
  });

  /**
   * Rectangular elbow of any angle, built the way it is fabricated and the way
   * the CAD draws it: a mitred chain of short segments. `segments:1` gives the
   * square corner block, which is exact for a 90° turn and never blows up the
   * way a miter join does on a sharp angle.
   */
  C.elbowRect = ({ w = IN(12), h = IN(8), angle = 90, radius = null, segments = 4, legIn = 0.25, legOut = 0.25 }) => {
    const a = angle * Math.PI / 180;
    const R = radius === null ? w * 1.0 : radius;   // centreline bend radius
    const frames = [], rings = [];
    frames.push(frame(-legIn, 0, 0, 1, 0, 0)); rings.push(ringRect(w, h));
    // arc from the tangent point, turning about +Y (in the XZ plane)
    const cz = R;                                    // arc centre at (0, 0, R)
    for (let i = 0; i <= segments; i++) {
      const t = (a * i) / segments;
      const o = V(R * Math.sin(t), 0, cz - R * Math.cos(t));
      const tan = V(Math.cos(t), 0, Math.sin(t));
      frames.push({ o, x: tan, y: V(0, 1, 0) });
      rings.push(ringRect(w, h));
    }
    const end = frames[frames.length - 1];
    frames.push({ o: end.o.clone().addScaledVector(end.x, legOut), x: end.x.clone(), y: V(0, 1, 0) });
    rings.push(ringRect(w, h));
    const last = frames[frames.length - 1];
    return {
      geometry: sweep(frames, rings, true, true),
      ports: [P('in', [-legIn, 0, 0], [-1, 0, 0], RECT(w, h)),
              P('out', last.o.toArray(), last.x.toArray(), RECT(w, h))],
      meta: { kind: 'elbow-rect', label: `Codo rect ${angle}° ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)}" (${segments} gajos)`, angle, segments }
    };
  };

  /** Round elbow — a real torus segment, smooth. */
  C.elbowRound = ({ d = IN(8), angle = 90, radius = null, arcSegments = 12, segments = 20, legIn = 0.2, legOut = 0.2 }) => {
    const a = angle * Math.PI / 180;
    const R = radius === null ? d * 1.5 : radius;
    const frames = [], rings = [];
    frames.push(frame(-legIn, 0, 0, 1, 0, 0)); rings.push(ringRound(d, segments));
    for (let i = 0; i <= arcSegments; i++) {
      const t = (a * i) / arcSegments;
      frames.push({ o: V(R * Math.sin(t), 0, R - R * Math.cos(t)), x: V(Math.cos(t), 0, Math.sin(t)), y: V(0, 1, 0) });
      rings.push(ringRound(d, segments));
    }
    const end = frames[frames.length - 1];
    frames.push({ o: end.o.clone().addScaledVector(end.x, legOut), x: end.x.clone(), y: V(0, 1, 0) });
    rings.push(ringRound(d, segments));
    const last = frames[frames.length - 1];
    return {
      geometry: sweep(frames, rings, true, true),
      ports: [P('in', [-legIn, 0, 0], [-1, 0, 0], ROUND(d)),
              P('out', last.o.toArray(), last.x.toArray(), ROUND(d))],
      meta: { kind: 'elbow-round', label: `Codo redondo ${angle}° Ø${(d / 0.0254).toFixed(0)}"`, angle }
    };
  };

  /** Tee: trunk runs straight through, branch leaves with a short neck. */
  C.teeRect = ({ w = IN(20), h = IN(12), bw = IN(10), bh = IN(8), length = 0.9, angle = 90, neck = 0.22 }) => {
    const trunk = sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                        [ringRect(w, h), ringRect(w, h)], true, true);
    const a = angle * Math.PI / 180;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const root = V(length / 2, 0, 0).addScaledVector(dir, w / 2 - 0.01);
    const tip = root.clone().addScaledVector(dir, neck);
    const branch = sweep([{ o: root, x: dir, y: V(0, 1, 0) }, { o: tip, x: dir, y: V(0, 1, 0) }],
                         [ringRect(bw, bh), ringRect(bw, bh)], false, true);
    return {
      geometry: merge([trunk, branch]),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w, h)),
              P('out', [length, 0, 0], [1, 0, 0], RECT(w, h)),
              P('branch', tip.toArray(), dir.toArray(), RECT(bw, bh))],
      meta: { kind: 'tee-rect', label: `Tee ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)} → ramal ${(bw / 0.0254).toFixed(0)}"×${(bh / 0.0254).toFixed(0)}"` }
    };
  };

  /** Rectangular transition / reducer — a loft between two sections. */
  /**
   * Rectangular transition / reducer. LENGTH is a real parameter of the family,
   * not a drawing convenience: COB part numbers specify 0.10 m and 0.30 m, so
   * the family is (w0,h0) x (w1,h1) x length, and an evidence set that shows one
   * length has shown half the family.
   *
   * THE TWO LEGEND LENGTHS ARE NAMES, NOT MEASUREMENTS — do not build to them.
   * COB's M-HVAC-DUCT LEGEND does carry REDUCCIÓN RECTANGULAR part numbers
   * (3093643 / 3093738 labelled 10 cm, 3090626 labelled 30 cm), and I cited them
   * here until 121 measured the blocks themselves: the names contradict the
   * geometry. The "10 cm" blocks measure 76.2 mm and 305.3 mm; the "30 cm" blocks
   * 508 / 709 / 754 mm; and two blocks sharing part number 3093738 disagree with
   * each other. No bbox axis matches its stated length on any of the six. 76.2 mm
   * is exactly 3" and 406.4 mm exactly 16" — the blocks are drawn imperial with
   * metric names pasted on.
   *
   * So LENGTH IS A FREE PARAMETER driven by the width change, not a lookup:
   * `length >= 1.5 * dW`, from SMACNA's 1:3 minimum transition slope. The part
   * numbers are good for NAMING a part and nothing else. The constant below is
   * kept only so callers can still reproduce the legend's nominal labels; it is
   * not a dimension source.
   */
  C.TRANSITION_LENGTHS_NOMINAL_M = [0.10, 0.30];   // legend NAMES — see above, not measurements
  /** SMACNA 1:3 minimum slope: the shortest defensible transition for a width change. */
  C.transitionMinLength = (w0, w1) => 1.5 * Math.abs(w0 - w1);
  C.transitionRect = ({ w0 = IN(20), h0 = IN(12), w1 = IN(12), h1 = IN(8), length = null }) => {
    // Derived by default, overridable when a caller has a real measured length.
    const L = length != null ? length : Math.max(0.15, C.transitionMinLength(w0, w1));
    return {
      geometry: sweep([frame(0, 0, 0, 1, 0, 0), frame(L, 0, 0, 1, 0, 0)],
                      [ringRect(w0, h0), ringRect(w1, h1)], true, true),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w0, h0)),
              P('out', [L, 0, 0], [1, 0, 0], RECT(w1, h1))],
      meta: { kind: 'transition-rect', length_m: +L.toFixed(4),
              length_src: length != null ? 'caller' : 'derived: SMACNA 1:3 min slope, 1.5 x dW',
              label: `Transición ${(w0 / 0.0254).toFixed(0)}"×${(h0 / 0.0254).toFixed(0)} → ${(w1 / 0.0254).toFixed(0)}"×${(h1 / 0.0254).toFixed(0)}"` }
    };
  };

  /** Rect → round transition. Both rings are resampled to the same count. */
  C.transitionRectRound = ({ w = IN(14), h = IN(10), d = IN(10), length = 0.45, segments = 24 }) => {
    const n = segments - (segments % 4);
    return {
      geometry: sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                      [ringRect(w, h, n), ringRound(d, n)], true, true),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w, h)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(d))],
      meta: { kind: 'transition-rect-round', label: `Transición ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)} → Ø${(d / 0.0254).toFixed(0)}"` }
    };
  };

  /** Blind cap / end of run. */
  C.capRect = ({ w = IN(12), h = IN(8), depth = 0.05 }) => ({
    geometry: sweep([frame(0, 0, 0, 1, 0, 0), frame(depth, 0, 0, 1, 0, 0)],
                    [ringRect(w, h), ringRect(w * 0.96, h * 0.96)], true, true),
    ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w, h))],
    meta: { kind: 'cap-rect', label: `Tapa ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)}"` }
  });

  /** VAV terminal box: round inlet, box body, rectangular discharge. */
  C.vavBox = ({ inletD = IN(10), w = IN(16), h = IN(12), length = 0.95, outW = IN(14), outH = IN(10), tag = 'VAV' }) => {
    const inletLen = 0.28;
    const inlet = sweep([frame(-inletLen, 0, 0, 1, 0, 0), frame(0, 0, 0, 1, 0, 0)],
                        [ringRound(inletD, 18), ringRound(inletD, 18)], true, false);
    const body = sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                       [ringRect(w, h), ringRect(w, h)], true, true);
    const out = sweep([frame(length, 0, 0, 1, 0, 0), frame(length + 0.18, 0, 0, 1, 0, 0)],
                      [ringRect(outW, outH), ringRect(outW, outH)], false, true);
    return {
      geometry: merge([inlet, body, out]),
      ports: [P('in', [-inletLen, 0, 0], [-1, 0, 0], ROUND(inletD)),
              P('out', [length + 0.18, 0, 0], [1, 0, 0], RECT(outW, outH))],
      meta: { kind: 'vav-box', label: `Caja ${tag} Ø${(inletD / 0.0254).toFixed(0)}" → ${(outW / 0.0254).toFixed(0)}"×${(outH / 0.0254).toFixed(0)}"`, tag }
    };
  };

  /**
   * Diffusers and grilles, by the types that appear on the COB-IM2 sheets.
   *  SD-1  square ceiling diffuser, stepped cone face
   *  LD-1  linear slot diffuser
   *  CD-1  round ceiling diffuser
   *  RR-4  return grille, flat louvred face
   */
  C.diffuser = ({ type = 'SD-1', size = IN(24), length = IN(48), neckD = IN(8), h = 0.12 }) => {
    const geos = [];
    let ports = [], label = '';
    if (type === 'SD-1') {
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        const s0 = size * (1 - i * 0.18), s1 = size * (1 - (i + 1) * 0.18);
        const y0 = -i * (h / steps), y1 = -(i + 1) * (h / steps);
        geos.push(sweep([{ o: V(0, y0, 0), x: V(0, -1, 0), y: V(1, 0, 0) },
                         { o: V(0, y1, 0), x: V(0, -1, 0), y: V(1, 0, 0) }],
                        [ringRect(s0, s0), ringRect(s1, s1)], i === 0, i === steps - 1));
      }
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
                       { o: V(0, 0.22, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
                      [ringRound(neckD, 18), ringRound(neckD, 18)], false, false));
      ports = [P('neck', [0, 0.22, 0], [0, 1, 0], ROUND(neckD))];
      label = `Difusor SD-1 ${(size / 0.0254).toFixed(0)}"□ · cuello Ø${(neckD / 0.0254).toFixed(0)}"`;
    } else if (type === 'LD-1') {
      const slotW = IN(4);
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, -1, 0), y: V(1, 0, 0) },
                       { o: V(0, -0.05, 0), x: V(0, -1, 0), y: V(1, 0, 0) }],
                      [ringRect(length, slotW), ringRect(length, slotW * 0.7)], true, true));
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
                       { o: V(0, 0.18, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
                      [ringRect(length * 0.9, slotW * 1.6), ringRect(length * 0.9, slotW * 1.6)], false, false));
      ports = [P('neck', [0, 0.18, 0], [0, 1, 0], RECT(length * 0.9, slotW * 1.6))];
      label = `Difusor lineal LD-1 ${(length / 0.0254).toFixed(0)}"`;
    } else if (type === 'CD-1') {
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, -1, 0), y: V(1, 0, 0) },
                       { o: V(0, -h, 0), x: V(0, -1, 0), y: V(1, 0, 0) }],
                      [ringRound(size, 28), ringRound(size * 0.55, 28)], true, true));
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
                       { o: V(0, 0.22, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
                      [ringRound(neckD, 18), ringRound(neckD, 18)], false, false));
      ports = [P('neck', [0, 0.22, 0], [0, 1, 0], ROUND(neckD))];
      label = `Difusor circular CD-1 Ø${(size / 0.0254).toFixed(0)}"`;
    } else { // RR-4
      const bladeN = 7;
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, -1, 0), y: V(1, 0, 0) },
                       { o: V(0, -0.03, 0), x: V(0, -1, 0), y: V(1, 0, 0) }],
                      [ringRect(size, size), ringRect(size, size)], true, false));
      for (let i = 0; i < bladeN; i++) {
        const z = -size / 2 + (size * (i + 0.5)) / bladeN;
        geos.push(sweep([{ o: V(0, -0.035, z), x: V(1, 0, 0), y: V(0, 1, 0) },
                         { o: V(0, -0.035, z), x: V(1, 0, 0), y: V(0, 1, 0) }].map((f, k) =>
                          ({ o: V((k ? 1 : -1) * size / 2, -0.035, z), x: V(1, 0, 0), y: V(0, 1, 0) })),
                        [ringRect(size / bladeN * 0.55, 0.012), ringRect(size / bladeN * 0.55, 0.012)], true, true));
      }
      geos.push(sweep([{ o: V(0, 0, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
                       { o: V(0, 0.2, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
                      [ringRect(size * 0.9, size * 0.9), ringRect(size * 0.9, size * 0.9)], false, false));
      ports = [P('neck', [0, 0.2, 0], [0, 1, 0], RECT(size * 0.9, size * 0.9))];
      label = `Rejilla de retorno RR-4 ${(size / 0.0254).toFixed(0)}"□`;
    }
    return { geometry: merge(geos), ports, meta: { kind: 'diffuser', type, label } };
  };

  /** Flexible connector — the corrugated run between a branch and a neck. */
  C.flexConnector = ({ d = IN(8), length = 0.9, coils = 14, amp = 0.16, segments = 16 }) => {
    const frames = [], rings = [], n = Math.max(24, coils * 2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      frames.push(frame(length * t, 0, 0, 1, 0, 0));
      const bulge = 1 + amp * Math.sin(t * coils * Math.PI * 2);
      rings.push(ringRound(d * bulge, segments));
    }
    return {
      geometry: sweep(frames, rings, true, true),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(d)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(d))],
      meta: { kind: 'flex', label: `Flexible Ø${(d / 0.0254).toFixed(0)}" · ${length.toFixed(2)} m` }
    };
  };

  /** Volume damper, drawn as the CAD does: a body with a blade shaft. */
  C.damperRect = ({ w = IN(14), h = IN(10), length = 0.16 }) => {
    const body = sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                       [ringRect(w * 1.04, h * 1.04), ringRect(w * 1.04, h * 1.04)], true, true);
    const blade = sweep([{ o: V(length / 2, 0, -w / 2), x: V(0, 0, 1), y: V(0, 1, 0) },
                         { o: V(length / 2, 0, w / 2), x: V(0, 0, 1), y: V(0, 1, 0) }],
                        [ringRect(0.012, h * 0.9), ringRect(0.012, h * 0.9)], true, true);
    return {
      geometry: merge([body, blade]),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], RECT(w, h)),
              P('out', [length, 0, 0], [1, 0, 0], RECT(w, h))],
      meta: { kind: 'damper-rect', label: `Compuerta ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)}"` }
    };
  };

  /** DEPRECATED — kept so existing callers do not break. `d` here is drawn as
   *  the OUTSIDE diameter, so `pipeRound({d: IN(4)})` is 4.000" OD where NPS 4
   *  pipe is 4.500". Use `C.pipeStraight({nps: '4'})`, which reads the OD from
   *  the B36.10M table. */
  C.pipeRound = ({ d = IN(4), length = 1.2, segments = 20, flange = true }) => {
    const geos = [sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                        [ringRound(d, segments), ringRound(d, segments)], true, true)];
    if (flange) for (const x of [0.02, length - 0.02]) {
      geos.push(sweep([frame(x - 0.012, 0, 0, 1, 0, 0), frame(x + 0.012, 0, 0, 1, 0, 0)],
                      [ringRound(d * 1.8, segments), ringRound(d * 1.8, segments)], true, true));
    }
    return {
      geometry: merge(geos),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(d)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(d))],
      meta: { kind: 'pipe-round', label: `Tubería Ø${(d / 0.0254).toFixed(0)}" · ${length.toFixed(2)} m` }
    };
  };

  /**
   * Rectangular CROSS — four ports on one plane. Not a tee: `forNode` used to
   * route 'cross' to teeRect, so all 68 crosses in the certified L4 data
   * rendered as three-way fittings. A cross has two opposed branches; drawing
   * one of them is a fitting that does not exist in the drawing.
   */
  C.crossRect = ({ w = IN(20), h = IN(12), bw = IN(10), bh = IN(8), length = 0.9, neck = 0.22 }) => {
    const main = sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                       [ringRect(w, h), ringRect(w, h)], true, true);
    const cx = length / 2;
    const arm = sgn => sweep(
      [{ o: V(cx, 0, sgn * h * 0), x: V(0, 0, sgn), y: V(0, 1, 0) },
       { o: V(cx, 0, sgn * (w / 2 + neck)), x: V(0, 0, sgn), y: V(0, 1, 0) }],
      [ringRect(bw, bh), ringRect(bw, bh)], false, true);
    return {
      geometry: merge([main, arm(1), arm(-1)]),
      ports: [P('in',  [0, 0, 0], [-1, 0, 0], RECT(w, h)),
              P('out', [length, 0, 0], [1, 0, 0], RECT(w, h)),
              P('b1', [cx, 0,  (w / 2 + neck)], [0, 0,  1], RECT(bw, bh)),
              P('b2', [cx, 0, -(w / 2 + neck)], [0, 0, -1], RECT(bw, bh))],
      meta: { kind: 'cross-rect',
              label: `Cruz ${(w / 0.0254).toFixed(0)}"×${(h / 0.0254).toFixed(0)}" · ramales ${(bw / 0.0254).toFixed(0)}"×${(bh / 0.0254).toFixed(0)}"` }
    };
  };

  // ── NPS ladder (hydronic side) ───────────────────────────────────────────
  /**
   * ASME B36.10M nominal pipe size → outside diameter and SCHEDULE 40 wall
   * (carbon steel), both in INCHES.
   *
   * Schedule matters and the label is not optional. Sch 40 (B36.10M, carbon)
   * and Sch 40S (B36.19M, stainless) are IDENTICAL up to NPS 10 and DIVERGE at
   * NPS 12: Sch 40 is 0.406", Sch 40S / STD is 0.375". This table is Sch 40
   * carbon throughout. Anything quoting a stainless wall must come from
   * B36.19M and say so -- a wall silently taken from the wrong standard is a
   * wrong ID, a wrong weight and a wrong spec, all from a plausible number.
   *
   * NPS is a LABEL, not a measurement: NPS 4 pipe has an
   * outside diameter of 4.500", not 4.000". The old `pipeRound({d: IN(4)})`
   * drew the nominal as if it were the OD — 12.5% under real size at NPS 4,
   * and worse below NPS 2 where the label diverges further from the metal.
   * Round DUCT is the opposite convention (nominal IS the diameter), which is
   * why duct and pipe cannot share one size helper.
   */
  const NPS = {
    '1/2': { od: 0.840, wall: 0.109 }, '3/4': { od: 1.050, wall: 0.113 },
    '1':   { od: 1.315, wall: 0.133 }, '1-1/4': { od: 1.660, wall: 0.140 },
    '1-1/2': { od: 1.900, wall: 0.145 }, '2': { od: 2.375, wall: 0.154 },
    '2-1/2': { od: 2.875, wall: 0.203 }, '3': { od: 3.500, wall: 0.216 },
    '4':   { od: 4.500, wall: 0.237 }, '5': { od: 5.563, wall: 0.258 },
    '6':   { od: 6.625, wall: 0.280 }, '8': { od: 8.625, wall: 0.322 },
    '10':  { od: 10.750, wall: 0.365 },
    // 0.406 is Sch 40. 0.375 would be Sch 40S / STD -- see the divergence note above.
    '12':  { od: 12.750, wall: 0.406 },
  };
  /** Outside diameter in METRES for an NPS label. Throws on an unknown size —
   *  a silent fallback would draw a plausible pipe at the wrong diameter. */
  const npsOD = nps => {
    const e = NPS[String(nps)];
    if (!e) throw new Error(`hvac-catalog: NPS ${nps} not in the B36.10M table`);
    return IN(e.od);
  };

  /** Raised-face flange pair sized off the OD. Geometry only — bolt circle is
   *  not modelled, so this is a flange READ, not a flange spec. */
  const flangeRing = (od, x) => sweep(
    [frame(x - 0.012, 0, 0, 1, 0, 0), frame(x + 0.012, 0, 0, 1, 0, 0)],
    [ringRound(od * 1.8, 24), ringRound(od * 1.8, 24)], true, true);

  C.pipeStraight = ({ nps = '4', length = 1.2, segments = 24, flanged = true }) => {
    const od = npsOD(nps);
    const geos = [sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                        [ringRound(od, segments), ringRound(od, segments)], true, true)];
    if (flanged) for (const x of [0.02, length - 0.02]) geos.push(flangeRing(od, x));
    return {
      geometry: merge(geos),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(od))],
      meta: { kind: 'pipe-straight', nps, od_in: NPS[String(nps)].od,
              label: `Tubo NPS ${nps}" (OD ${NPS[String(nps)].od}") · ${length.toFixed(2)} m` }
    };
  };

  C.pipeElbow = ({ nps = '4', angle = 90, arcSegments = 14, segments = 24, legIn = 0.12, legOut = 0.12 }) => {
    const od = npsOD(nps);
    // Long-radius elbow: centreline radius = 1.5 x nominal, the LR convention.
    const R = 1.5 * od;
    const frames = [], rings = [];
    frames.push(frame(-legIn, 0, 0, 1, 0, 0)); rings.push(ringRound(od, segments));
    frames.push(frame(0, 0, 0, 1, 0, 0));      rings.push(ringRound(od, segments));
    const rad = angle * Math.PI / 180;
    for (let i = 1; i <= arcSegments; i++) {
      const a = rad * i / arcSegments;
      frames.push(frame(R * Math.sin(a), 0, R * (1 - Math.cos(a)),
                        Math.cos(a), 0, Math.sin(a)));
      rings.push(ringRound(od, segments));
    }
    const e = frames[frames.length - 1];
    const tx = Math.cos(rad), tz = Math.sin(rad);
    frames.push(frame(e.o.x + tx * legOut, 0, e.o.z + tz * legOut, tx, 0, tz));
    rings.push(ringRound(od, segments));
    const last = frames[frames.length - 1];
    return {
      geometry: sweep(frames, rings, true, true),
      ports: [P('in', [-legIn, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [last.o.x, 0, last.o.z], [tx, 0, tz], ROUND(od))],
      meta: { kind: 'pipe-elbow', nps, angle, radius_convention: 'long-radius 1.5D',
              label: `Codo ${angle}° NPS ${nps}" · radio largo` }
    };
  };

  C.pipeTee = ({ nps = '4', branch = null, length = 0.6, neck = 0.10, segments = 24 }) => {
    const od = npsOD(nps), bod = npsOD(branch || nps);
    const run = sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                      [ringRound(od, segments), ringRound(od, segments)], true, true);
    const cx = length / 2;
    const arm = sweep([{ o: V(cx, 0, 0), x: V(0, 0, 1), y: V(0, 1, 0) },
                       { o: V(cx, 0, od / 2 + neck), x: V(0, 0, 1), y: V(0, 1, 0) }],
                      [ringRound(bod, segments), ringRound(bod, segments)], false, true);
    return {
      geometry: merge([run, arm]),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(od)),
              P('branch', [cx, 0, od / 2 + neck], [0, 0, 1], ROUND(bod))],
      meta: { kind: 'pipe-tee', nps, branch: branch || nps,
              label: `Tee NPS ${nps}"${branch && branch !== nps ? ` × ${branch}"` : ''}` }
    };
  };

  /** Concentric or eccentric reducer. Eccentric keeps ONE side flat — that is
   *  the whole point of the fitting (air pocket control on a pump suction),
   *  so the two variants are not interchangeable decoration. */
  C.pipeReducer = ({ nps = '4', to = '3', length = 0.20, segments = 24, eccentric = false }) => {
    const a = npsOD(nps), b = npsOD(to);
    const drop = eccentric ? (a - b) / 2 : 0;
    return {
      geometry: sweep(
        [frame(0, 0, 0, 1, 0, 0), frame(length, -drop, 0, 1, 0, 0)],
        [ringRound(a, segments), ringRound(b, segments)], true, true),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(a)),
              P('out', [length, -drop, 0], [1, 0, 0], ROUND(b))],
      meta: { kind: 'pipe-reducer', nps, to, eccentric,
              label: `Reducción ${eccentric ? 'excéntrica' : 'concéntrica'} NPS ${nps}"→${to}"` }
    };
  };

  C.pipeCoupling = ({ nps = '4', length = 0.09, segments = 24 }) => {
    const od = npsOD(nps);
    return {
      geometry: sweep([frame(0, 0, 0, 1, 0, 0), frame(length, 0, 0, 1, 0, 0)],
                      [ringRound(od * 1.18, segments), ringRound(od * 1.18, segments)], true, true),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [length, 0, 0], [1, 0, 0], ROUND(od))],
      meta: { kind: 'pipe-coupling', nps, label: `Cople NPS ${nps}"` }
    };
  };

  C.pipeFlange = ({ nps = '4', segments = 24 }) => {
    const od = npsOD(nps), t = 0.024;
    return {
      geometry: flangeRing(od, t / 2),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [t, 0, 0], [1, 0, 0], ROUND(od))],
      meta: { kind: 'pipe-flange', nps, label: `Brida NPS ${nps}"` }
    };
  };

  /** Gate or ball valve: flanged body + bonnet + handwheel/lever stub. The
   *  STEM is a named node so a viewer can pose open/closed. */
  C.pipeValve = ({ nps = '4', kind = 'gate', segments = 24 }) => {
    const od = npsOD(nps), body = od * 1.35, len = od * 2.2;
    const geos = [
      sweep([frame(0, 0, 0, 1, 0, 0), frame(len, 0, 0, 1, 0, 0)],
            [ringRound(body, segments), ringRound(body, segments)], true, true),
      flangeRing(od, 0.014), flangeRing(od, len - 0.014),
      // bonnet + stem, up +Y from the body centre
      sweep([{ o: V(len / 2, body / 2, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
             { o: V(len / 2, body / 2 + od * 0.9, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
            [ringRound(od * 0.34, 16), ringRound(od * 0.34, 16)], true, false),
    ];
    // handwheel (gate) reads as a torus-less flat ring; lever (ball) as a bar
    const topY = body / 2 + od * 0.9;
    geos.push(kind === 'ball'
      ? sweep([{ o: V(len / 2, topY, -od * 0.9), x: V(0, 0, 1), y: V(0, 1, 0) },
               { o: V(len / 2, topY, od * 0.9), x: V(0, 0, 1), y: V(0, 1, 0) }],
              [ringRect(od * 0.10, od * 0.22), ringRect(od * 0.10, od * 0.22)], true, true)
      : sweep([{ o: V(len / 2, topY, 0), x: V(0, 1, 0), y: V(1, 0, 0) },
               { o: V(len / 2, topY + 0.018, 0), x: V(0, 1, 0), y: V(1, 0, 0) }],
              [ringRound(od * 1.25, 24), ringRound(od * 1.25, 24)], true, true));
    return {
      geometry: merge(geos),
      ports: [P('in', [0, 0, 0], [-1, 0, 0], ROUND(od)),
              P('out', [len, 0, 0], [1, 0, 0], ROUND(od))],
      meta: { kind: `pipe-valve-${kind}`, nps, stem_pivot: [len / 2, body / 2, 0],
              label: `Válvula de ${kind === 'ball' ? 'bola' : 'compuerta'} NPS ${nps}"` }
    };
  };

  // ── graph helper: place a component so one of its ports mates a target ────
  /**
   * Returns the Matrix4 that puts `port` of a component at world point `p`
   * with its outward direction opposing `dir` (i.e. mated).
   */
  function mateMatrix(port, p, dir) {
    const from = new T.Vector3().fromArray(port.dir).normalize();
    const to = new T.Vector3().fromArray(dir).normalize().negate();
    const q = new T.Quaternion().setFromUnitVectors(from, to);
    const off = new T.Vector3().fromArray(port.p).applyQuaternion(q);
    return new T.Matrix4().compose(
      new T.Vector3().fromArray(p).sub(off), q, new T.Vector3(1, 1, 1));
  }

  /** Do two ports mate? Same shape and section within tolerance. */
  function portsCompatible(a, b, tol = 0.02) {
    if (a.shape !== b.shape) return false;
    return a.shape === 'round'
      ? Math.abs(a.d - b.d) <= tol
      : Math.abs(a.w - b.w) <= tol && Math.abs(a.h - b.h) <= tol;
  }

  /** Map a graph node degree/kind onto the right generator. */
  function forNode(kind, params) {
    switch (kind) {
      case 'elbow':      return C.elbowRect(params);
      case 'tee':        return C.teeRect(params);
      case 'cross':      return C.crossRect(params);
      case 'transition': return C.transitionRect(params);
      case 'terminal':   return C.capRect(params);
      case 'coupling':
      default:           return C.straightRect(params);
    }
  }

  /**
   * JSON manifest for one generated component: what it is, the exact params it
   * was generated from, and where its numbers come from. Emitted per component
   * so a viewer can instance it and a reviewer can audit it without reading the
   * generator.
   */
  function manifest(comp, params, provenance) {
    const g = comp.geometry;
    const pos = g.getAttribute && g.getAttribute('position');
    return {
      family: comp.meta.kind,
      label: comp.meta.label,
      params: params || {},
      ports: comp.ports.map(p => ({ id: p.id, p: p.p, dir: p.dir,
                                    shape: p.shape, w: p.w, h: p.h, d: p.d })),
      units: 'm',
      scale: '1 unit = 1 m',
      triangles: pos ? pos.count / 3 : null,
      provenance: provenance || null,
      meta: comp.meta
    };
  }

  global.HVACCatalog = {
    IN, NPS, npsOD, ringRect, ringRound, sweep, merge, transform,
    mateMatrix, portsCompatible, forNode, manifest,
    components: C,
    list: Object.keys(C)
  };
})(typeof window !== 'undefined' ? window : globalThis);
