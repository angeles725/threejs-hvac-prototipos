// Dashboard charts — hand-rolled SVG, no chart libraries.
// Pixel-layout math lives here; business logic (thresholds, formatting) lives in model.mjs.
//
// PSI_BAND constants are physical system constants (not derived from data) — hardcoding
// them here is correct. They are the reference, not a threshold computation.

const PSI_BAND_LO = 115;
const PSI_BAND_HI = 120;

/** Downsample an array to at most `n` points, keeping the last point. */
function downsample(pts, n = 300) {
  if (!pts || pts.length <= n) return pts ?? [];
  const every = Math.ceil(pts.length / n);
  const result = pts.filter((_, i) => i % every === 0);
  // Always include the last point
  if (result[result.length - 1] !== pts[pts.length - 1]) result.push(pts[pts.length - 1]);
  return result;
}

/**
 * Compute SVG path geometry from a series of {t, v} points.
 * Returns { path, area, X, Y, mn, mx, iw, ih } or null if < 2 points.
 */
function buildPaths(pts, W, H, { L = 34, R = 6, T = 8, B = 22 } = {}) {
  if (!pts || pts.length < 2) return null;
  const iw = W - L - R;
  const ih = H - T - B;
  const vals = pts.map((p) => p.v);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const range = (mx - mn) || 1;
  const X = (i) => L + iw * (i / (pts.length - 1));
  const Y = (v) => T + ih * (1 - (v - mn) / range);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(pts.length - 1).toFixed(1)},${(T + ih).toFixed(1)} L${L},${(T + ih).toFixed(1)} Z`;
  return { path: d, area, X, Y, mn, mx, iw, ih, L, R, T, B };
}

// ── Stacked cooling-load composition bar ────────────────────────────────────
/**
 * @param {object} stack  model.stack — { totalLabel, segments[] }
 * @param {HTMLElement} container
 */
export function renderStackedBar(stack, container) {
  const W = Math.max(container.clientWidth || 560, 200);
  const barH = 24;
  const lblH = 38; // space below bar for labels
  const H = barH + lblH;

  let x = 0;
  let rects = '';
  let texts = '';

  for (const seg of stack.segments) {
    const w = seg.share * W;
    if (w < 0.5) { x += w; continue; }
    // 2 px gap between segments per spec
    const drawW = Math.max(1, w - 2);
    rects += `<rect x="${x.toFixed(1)}" y="0" width="${drawW.toFixed(1)}" height="${barH}"
      fill="${seg.color}" opacity="0.9" rx="2"
      role="img" aria-label="${seg.label}: ${seg.kw.toFixed(1)} kW"/>`;

    if (seg.directLabel && drawW > 48) {
      const cx = (x + w / 2).toFixed(1);
      texts += `<text x="${cx}" y="${barH + 13}" text-anchor="middle"
        font-size="8" font-family="var(--ui)" fill="${seg.color}">${seg.label}</text>`;
      texts += `<text x="${cx}" y="${barH + 24}" text-anchor="middle"
        font-size="9" font-family="var(--mono)" font-variant-numeric="tabular-nums"
        fill="var(--ink)">${seg.kw.toFixed(1)}</text>`;
    }
    x += w;
  }

  // Total annotation
  const totalText = `<text x="${(W / 2).toFixed(1)}" y="${barH + 36}" text-anchor="middle"
    font-size="8.5" font-family="var(--mono)" fill="var(--dim)">
    Total ${stack.totalLabel} kW</text>`;

  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
      ${rects}${texts}${totalText}
    </svg>`;
}

// ── Flow strip (physics narrative) ─────────────────────────────────────────
/**
 * @param {Array} flow  model.flow — [{id,label,value,unit}]
 * @param {HTMLElement} container
 */
export function renderFlowStrip(flow, container) {
  const VW = 580;
  const VH = 72;
  const boxW = 120;
  const boxH = 52;
  const y0 = 10;
  const mid = y0 + boxH / 2;

  // Positions for 4 boxes (in, heat, cop, out)
  const xs = [4, 154, 296, 446];

  function cell(i) {
    const c = flow[i];
    if (!c) return '';
    const x = xs[i];
    const isOut = c.id === 'out';
    const stroke = isOut ? 'var(--sys-hvac)' : 'var(--rule)';
    const strokeW = isOut ? 1.5 : 1;
    const valSz = (c.id === 'cop') ? 15 : 17;
    return `<rect x="${x}" y="${y0}" width="${boxW}" height="${boxH}"
        rx="4" fill="var(--card2)" stroke="${stroke}" stroke-width="${strokeW}"/>
      <text x="${x + boxW / 2}" y="${y0 + 16}" text-anchor="middle"
        font-size="7.5" font-family="var(--ui)" fill="var(--dim)">${c.label}</text>
      <text x="${x + boxW / 2}" y="${y0 + 34}" text-anchor="middle"
        font-size="${valSz}" font-family="var(--mono)" font-variant-numeric="tabular-nums"
        fill="${isOut ? 'var(--sys-hvac)' : 'var(--ink)'}">${c.value}</text>
      ${c.unit ? `<text x="${x + boxW / 2}" y="${y0 + 48}" text-anchor="middle"
        font-size="7" font-family="var(--mono)" fill="var(--dim)">${c.unit}</text>` : ''}`;
  }

  function arrow(fromBox) {
    const x1 = xs[fromBox] + boxW + 2;
    const x2 = xs[fromBox + 1] - 7;
    if (x2 <= x1) return '';
    return `<line x1="${x1}" y1="${mid}" x2="${x2}" y2="${mid}"
      stroke="var(--dim)" stroke-width="1.2" marker-end="url(#fs-arr)"/>`;
  }

  container.innerHTML =
    `<svg viewBox="0 0 ${VW} ${VH}" height="${VH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
      <defs>
        <marker id="fs-arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--dim)"/>
        </marker>
      </defs>
      ${cell(0)}${arrow(0)}${cell(1)}${arrow(1)}${cell(2)}${arrow(2)}${cell(3)}
    </svg>`;
}

// ── HVAC kW rolling trend ───────────────────────────────────────────────────
/**
 * @param {Array}  series  [{t,v}] from model.series.hvacKw
 * @param {HTMLElement} container
 * @param {{ color?: string }} opts
 */
export function renderTrendChart(series, container, opts = {}) {
  const { color = 'var(--sys-hvac)' } = opts;
  const W = 560;
  const H = 80;
  const pad = { L: 32, R: 4, T: 6, B: 20 };

  const pts = downsample(series);
  const geo = buildPaths(pts, W, H, pad);

  if (!geo) {
    container.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" height="${H}" style="width:100%;display:block">
        <text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle"
          font-size="10" font-family="var(--ui)" fill="var(--dim)">Sin historial aún</text>
      </svg>`;
    return;
  }

  const { path, area, X, Y, mn, mx, iw, ih, L, T, B } = geo;

  // 3 Y-axis gridlines
  let grid = '';
  for (let i = 0; i <= 3; i++) {
    const frac = i / 3;
    const v = mn + (mx - mn) * (1 - frac);
    const y = T + ih * frac;
    grid += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${L + iw}" y2="${y.toFixed(1)}"
      stroke="var(--grid-line)" stroke-width="0.5"/>`;
    grid += `<text x="${L - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end"
      font-size="7" font-family="var(--mono)" fill="var(--dim)">${v.toFixed(0)}</text>`;
  }

  // X labels at start, mid, end
  const now = pts[pts.length - 1]?.t ?? 0;
  let xlbls = '';
  [[0, '-'], [Math.floor(pts.length / 2), '½'], [pts.length - 1, 'ahora']].forEach(([idx, lbl]) => {
    const xv = X(idx).toFixed(1);
    const ago = now - (pts[idx]?.t ?? 0);
    const txt = lbl === 'ahora' ? 'ahora' : `-${Math.round(ago)}s`;
    xlbls += `<text x="${xv}" y="${T + ih + 14}" text-anchor="middle"
      font-size="7" font-family="var(--mono)" fill="var(--dim)">${txt}</text>`;
  });

  const gid = 'hg_tc';
  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>
      ${xlbls}
    </svg>`;
}

// ── Pressure trend with 115–120 psi band ─────────────────────────────────────
/**
 * @param {Array} series [{t,v}] from model.series.pressurePsi
 * @param {HTMLElement} container
 */
export function renderPressureChart(series, container) {
  const color = 'var(--sys-air)';
  const W = 560;
  const H = 60;
  const pad = { L: 32, R: 4, T: 4, B: 16 };

  const pts = downsample(series);

  // Force Y range to include the band so it's always visible
  const vals = (pts.length ? pts.map((p) => p.v) : []).concat([PSI_BAND_LO - 2, PSI_BAND_HI + 2]);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const range = (mx - mn) || 1;
  const { L, R, T, B } = pad;
  const iw = W - L - R;
  const ih = H - T - B;
  const X = (i) => L + iw * (i / Math.max(pts.length - 1, 1));
  const Y = (v) => T + ih * (1 - (v - mn) / range);

  const bandTop = Y(PSI_BAND_HI);
  const bandBot = Y(PSI_BAND_LO);

  let pathD = '';
  let areaD = '';
  if (pts.length >= 2) {
    pathD = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    areaD = `${pathD} L${X(pts.length - 1).toFixed(1)},${(T + ih).toFixed(1)} L${L},${(T + ih).toFixed(1)} Z`;
  }

  // Y axis: just the two band values
  const bandLabels =
    `<text x="${L - 3}" y="${(bandTop + 3).toFixed(1)}" text-anchor="end"
      font-size="7" font-family="var(--mono)" fill="var(--dim)">120</text>
     <text x="${L - 3}" y="${(bandBot + 3).toFixed(1)}" text-anchor="end"
      font-size="7" font-family="var(--mono)" fill="var(--dim)">115</text>`;

  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- band drawn FIRST — it is the reference, the stroke sits on top -->
      <rect x="${L}" y="${bandTop.toFixed(1)}" width="${iw}"
        height="${(bandBot - bandTop).toFixed(1)}" fill="${color}" opacity="0.08"/>
      <line x1="${L}" y1="${bandTop.toFixed(1)}" x2="${L + iw}" y2="${bandTop.toFixed(1)}"
        stroke="${color}" opacity="0.3" stroke-dasharray="3 3"/>
      <line x1="${L}" y1="${bandBot.toFixed(1)}" x2="${L + iw}" y2="${bandBot.toFixed(1)}"
        stroke="${color}" opacity="0.3" stroke-dasharray="3 3"/>
      ${bandLabels}
      ${areaD ? `<path d="${areaD}" fill="url(#pg)"/>` : ''}
      ${pathD ? `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5"/>` : ''}
    </svg>`;
}

// ── Sparkline (sidebar panel footer) ────────────────────────────────────────
/**
 * @param {Array}  series  [{t,v}]
 * @param {string} color   CSS color string
 * @param {HTMLElement} container
 * @param {{ bandLo?: number, bandHi?: number }} opts
 */
export function renderSparkline(series, color, container, opts = {}) {
  const W = container.clientWidth || 330;
  const H = 48;

  const pts = downsample(series, 100);
  if (!pts || pts.length < 2) {
    container.innerHTML = '';
    return;
  }

  const { bandLo, bandHi } = opts;
  // Extend Y range to include band if provided
  const vals = pts.map((p) => p.v);
  if (bandLo != null) vals.push(bandLo - 1);
  if (bandHi != null) vals.push(bandHi + 1);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const range = (mx - mn) || 1;
  const L = 0, R = 0, T = 4, B = 4;
  const iw = W - L - R;
  const ih = H - T - B;
  const X = (i) => L + iw * (i / (pts.length - 1));
  const Y = (v) => T + ih * (1 - (v - mn) / range);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(pts.length - 1).toFixed(1)},${(T + ih).toFixed(1)} L${L},${(T + ih).toFixed(1)} Z`;

  let bandLines = '';
  if (bandLo != null) {
    const yLo = Y(bandLo);
    bandLines += `<line x1="${L}" y1="${yLo.toFixed(1)}" x2="${W}" y2="${yLo.toFixed(1)}"
      stroke="${color}" opacity="0.25" stroke-dasharray="3 3"/>`;
  }
  if (bandHi != null) {
    const yHi = Y(bandHi);
    bandLines += `<line x1="${L}" y1="${yHi.toFixed(1)}" x2="${W}" y2="${yHi.toFixed(1)}"
      stroke="${color}" opacity="0.25" stroke-dasharray="3 3"/>`;
  }

  const gid = `sg_${color.replace(/[^a-z0-9]/gi, '_').slice(0, 8)}`;
  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${bandLines}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.2"/>
    </svg>`;
}
