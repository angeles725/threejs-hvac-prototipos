/**
 * MX60.CarcamoDetail
 *
 * Detail renderer for type='carcamo' — adapted from the standalone
 * carcamo-agua-3d demo: 3D cutaway pit + glass tank + animated water surface
 * + sensor LED + level bar. Reading: summary.nivelCm (treated as 0-100 %).
 *
 * Color thresholds (from user spec):
 *   lectura > 69 → rojo (límite crítico, riesgo de desbordamiento)
 *   lectura > 45 → naranja (rango crítico)
 *   else        → verde
 *
 * Hardcoded — these are protection limits, not operator-configurable umbrales.
 *
 * Registered against MX60.EquipmentDetail.registerRenderer('carcamo', mount).
 */
import * as THREE          from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { getEnvTexture }   from './SharedEnv.js';

// CP3: module-level theme state — primed at first mount, updated by ThemeStore
// subscription so _buildCarcamoChart always reads the correct palette without
// calling getTheme() inside the RAF loop (GATE-1b).
// INVARIANT: this is module-scoped (not per-mount) because the Router enforces a
// single-view model — only one Carcamo detail can be mounted at a time, so the
// shared state is unambiguous. The per-mount _carcThemeUnsub token still scopes
// the subscription correctly. If the Router ever allows concurrent Carcamo
// mounts, this must move into mount() scope alongside the unsub token.
// NOTE: must use `window.MX60` here, NOT bare `MX60` — the module-scoped
// `const MX60` is declared at the BOTTOM of this file, so a bare reference at
// module-top-level hits the Temporal Dead Zone (ReferenceError, module aborts,
// MX60.CarcamoDetail never registers → EquipmentDetail placeholder).
let _carcCurrentTheme = (window.MX60 && window.MX60.ThemeStore && typeof window.MX60.ThemeStore.getTheme === 'function')
  ? window.MX60.ThemeStore.getTheme() : 'dark';

// ---- Helpers ---------------------------------------------------------------
function escHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s == null ? '' : String(s)));
  return d.innerHTML;
}
function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Resolve the color tone for this cárcamo via the threshold store. Falls back
 * to module defaults when the store is missing (defensive).
 */
function carcamoColor(equipId, lectura) {
  if (window.MX60 && MX60.CarcamoThresholdStore) {
    return MX60.CarcamoThresholdStore.colorForReading(equipId, lectura);
  }
  if (lectura === null || lectura === undefined || isNaN(lectura)) return 'verde';
  if (lectura > 69) return 'rojo';
  if (lectura > 45) return 'naranja';
  return 'verde';
}
function colorHex(c) {
  return c === 'rojo' ? '#ff4757' : (c === 'naranja' ? '#f5a742' : '#00d4aa');
}
function colorLabel(c) {
  return c === 'rojo' ? 'CRÍTICO' : (c === 'naranja' ? 'ADVERTENCIA' : 'OPERATIVO');
}
function colorTone(c) {
  return c === 'rojo' ? 'alarm' : (c === 'naranja' ? 'warn' : 'ok');
}

/**
 * Per-viewport camera defaults. Capture them with the "Copiar vista" button
 * (logs JSON to console + clipboard) and paste here. Mobile breakpoint is
 * <768px, matching the rest of the app.
 */
const CAMERA_DEFAULTS = {
  // Captured by user (desktop @ 1536×730, mobile @ 430×932) via "Copiar vista".
  desktop: { position: { x: 0.09, y: 2.95, z: 13.21 }, target: { x: 0, y: 0, z: 0 } },
  mobile:  { position: { x: 1.00, y: 2.98, z: 17.72 }, target: { x: 0, y: 0, z: 0 } }
};

// ---- Procedural concrete texture (matches the demo) -----------------------
function makeConcreteTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bdb6a6';
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 38;
    data[i]     = Math.max(0, Math.min(255, data[i]     + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 15 + Math.random() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(50,40,30,0.55)');
    g.addColorStop(1, 'rgba(50,40,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 8 + Math.random() * 25;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(230,225,210,0.40)');
    g.addColorStop(1, 'rgba(230,225,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    ctx.fillStyle = 'rgba(' + (30 + Math.random()*40|0) + ',' + (25 + Math.random()*30|0) + ',' + (20 + Math.random()*30|0) + ',0.55)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1.5, 1.5);
  return tex;
}

// ---- Polar grid for the animated water surface -----------------------------
function makePolarGrid(radius, rings, segments) {
  const positions = [0, 0, 0];
  const indices = [];
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * radius;
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    }
  }
  for (let s = 0; s < segments; s++) {
    const next = (s + 1) % segments;
    indices.push(0, 1 + s, 1 + next);
  }
  for (let r = 1; r < rings; r++) {
    const ringStart = 1 + (r - 1) * segments;
    const nextRingStart = 1 + r * segments;
    for (let s = 0; s < segments; s++) {
      const next = (s + 1) % segments;
      const a = ringStart + s, b = ringStart + next;
      const c = nextRingStart + s, d = nextRingStart + next;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---- Shell HTML ------------------------------------------------------------
function _shellHtml(equip) {
  const label = equip.label || equip.id;
  const planta = (equip.planta != null) ? ('Planta ' + equip.planta) : '';
  return '' +
    '<div class="carc-detail-shell">' +
      '<div class="detail-header">' +
        '<button type="button" class="detail-back" data-action="back" aria-label="Volver">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="15 18 9 12 15 6"></polyline>' +
          '</svg>' +
        '</button>' +
        '<div class="detail-title-wrap">' +
          '<span class="detail-type-tag detail-type-carcamo">Cárcamo</span>' +
          (planta ? '<span class="detail-planta-tag">' + escHtml(planta) + '</span>' : '') +
          '<h2 class="detail-title">' + escHtml(label) + '</h2>' +
          '<span class="detail-meta-id">' + escHtml(equip.id) + '</span>' +
          '<span class="carc-status-pill" data-carc-status-pill>—</span>' +
        '</div>' +
      '</div>' +

      '<div class="carc-grid">' +
        '<div class="carc-level-bar">' +
          '<div class="carc-level-bar-inner">' +
            '<div class="carc-level-fill" data-carc-level-fill></div>' +
            '<div class="carc-level-marks" data-carc-level-marks></div>' +
          '</div>' +
          '<div class="carc-level-bar-label">NIVEL</div>' +
        '</div>' +

        '<div class="carc-scene-frame">' +
          '<div class="carc-scene-host" data-carc-scene-host></div>' +
          '<div class="carc-scene-hint">CLICK Y ARRASTRA · SCROLL = ZOOM</div>' +
        '</div>' +

        '<aside class="carc-side">' +
          '<div class="carc-panel carc-reading-panel">' +
            '<div class="carc-panel-title">Lectura</div>' +
            '<div class="carc-readout-row">' +
              '<div class="carc-readout-card">' +
                '<div class="carc-readout-label">VALOR REAL</div>' +
                '<div class="carc-readout-value" data-carc-raw>—</div>' +
                '<div class="carc-readout-suffix">%</div>' +
              '</div>' +
              '<div class="carc-readout-card">' +
                '<div class="carc-readout-label">ESTADO</div>' +
                '<div class="carc-readout-value carc-readout-value--state" data-carc-state>—</div>' +
                '<div class="carc-readout-suffix">%</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="carc-panel carc-thresholds-panel">' +
            '<div class="carc-panel-title">Umbrales</div>' +
            '<p class="carc-thresholds-help">Lectura &gt; umbral activa el estado degradado. Vacío = valor por defecto (45 / 69 %).</p>' +
            '<label class="carc-threshold-field">' +
              '<span class="carc-th-dot tone-warn"></span>' +
              '<span class="carc-threshold-label">Rango Crítico</span>' +
              '<span class="carc-threshold-input-wrap">' +
                '<span class="carc-threshold-cmp">&gt;</span>' +
                '<input type="text" inputmode="decimal" autocomplete="off" placeholder="45" data-carc-umbral="advertencia" class="carc-threshold-input" />' +
                '<span class="carc-threshold-unit">%</span>' +
              '</span>' +
            '</label>' +
            '<label class="carc-threshold-field">' +
              '<span class="carc-th-dot tone-alarm"></span>' +
              '<span class="carc-threshold-label">Límite Crítico</span>' +
              '<span class="carc-threshold-input-wrap">' +
                '<span class="carc-threshold-cmp">&gt;</span>' +
                '<input type="text" inputmode="decimal" autocomplete="off" placeholder="69" data-carc-umbral="critico" class="carc-threshold-input" />' +
                '<span class="carc-threshold-unit">%</span>' +
              '</span>' +
            '</label>' +
            '<div class="carc-threshold-validation" data-carc-validation></div>' +
          '</div>' +
        '</aside>' +
      '</div>' +

      // C4 D3: trends section — Chart.js nivelCm history (REQ-G9-2)
      // SDD mx60-detail-charts-parity WU3: tabs ahora derivan de
      // MX60.HistoryVocabulary.RANGES (8 entries) en vez de 4 hardcoded.
      // WU4: añade botón "Ayer" baseline overlay (replica UpDetail).
      '<div class="carc-trends-section" data-carc-trends>' +
        '<div class="carc-trends-header">' +
          '<span class="carc-trends-title">Tendencia: Nivel</span>' +
          '<div class="carc-trends-controls">' +
            _carcBaselineBtnHtml() +
            _carcRangeTabsHtml() +
          '</div>' +
        '</div>' +
        '<div class="carc-trends-canvas-wrap">' +
          '<canvas class="carc-trends-canvas" data-carc-trends-canvas></canvas>' +
        '</div>' +
      '</div>' +

    '</div>';
}

// ---- C5: Carcamo history loader (UP-pattern replica) ----------------------
//
// Replicates UpDetail.js _loadRealHistory + overlay pattern, scoped to a single
// slot (`nivelCm`). Steps:
//
//   1. MX60.HistoryIndex.load — cached /api/equipment-histories per session
//   2. Lookup histMap[equip.id].nivelCm (the resolved BHistoryId from BLink)
//   3. If present  → fetch /api/historyData?id={resolvedId}&range={range}
//      If absent   → use MX60.LiveHistoryBuffer.getSeries(equip.id, 'nivelCm')
//      If both empty AND buffer < 5 samples → show "Recolectando datos en vivo…" overlay
//
// Returns Promise<{ data: [{timestamp, value}], hasBackend: bool, bufferCount: number }>.
// The data shape matches what _buildCarcamoChart already consumes.
// ---------------------------------------------------------------------------

// SDD mx60-detail-charts-parity WU4: "Ayer" baseline button — toggles a
// dashed overlay curve showing yesterday's nivelCm values at the same
// time-of-day slots. Visual replica of UpDetail _baselineBtnHtml.
function _carcBaselineBtnHtml() {
  return '' +
    '<button type="button" class="carc-baseline-btn" data-carc-baseline title="Mostrar baseline: ayer">' +
      '<svg width="14" height="6" viewBox="0 0 14 6" fill="none" aria-hidden="true">' +
        '<line x1="1" y1="3" x2="13" y2="3" stroke="rgba(255,255,255,0.4)" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"></line>' +
      '</svg>' +
      'Ayer' +
    '</button>';
}

// SDD mx60-detail-charts-parity WU4: baseline parallel — for each current
// point, return the nivelCm value from the same time-of-day slot 24h earlier
// (binary search in yesterdayHistory). Returns null when the baseline window
// falls outside the in-memory history. Duplicated from UpDetail.baselineParallel
// (~20 LOC) intentionally — keeps the two modules decoupled.
function _carcBaselineParallel(currentPoints, yesterdayHistory) {
  var dayMs = 24 * 60 * 60 * 1000;
  var result = new Array(currentPoints.length);
  if (!yesterdayHistory || !yesterdayHistory.length) {
    for (var i = 0; i < result.length; i++) result[i] = null;
    return result;
  }
  for (var j = 0; j < currentPoints.length; j++) {
    var target = currentPoints[j].timestamp - dayMs;
    var lo = 0;
    var hi = yesterdayHistory.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (yesterdayHistory[mid].timestamp < target) lo = mid + 1;
      else hi = mid;
    }
    var candidate = yesterdayHistory[lo];
    if (candidate && Math.abs(candidate.timestamp - target) < 90 * 1000) {
      result[j] = candidate.value;
    } else {
      result[j] = null;
    }
  }
  return result;
}

// SDD mx60-detail-charts-parity WU3: render the 8 range tabs from
// MX60.HistoryVocabulary.RANGES instead of the previous 4 hardcoded buttons.
// Default active tab is '1h'. Shape-agnostic: adding/removing a range only
// requires editing HistoryVocabulary.js (and bumping its cache buster).
function _carcRangeTabsHtml() {
  var RANGES = (window.MX60 && MX60.HistoryVocabulary)
    ? MX60.HistoryVocabulary.RANGES : null;
  // Fallback to the legacy 4-tab list if HistoryVocabulary hasn't loaded yet
  // (defensive — should never happen post-WU9 cache-buster bump, but keeps
  // the trends section visible even under transient boot states).
  if (!RANGES || !RANGES.length) {
    return '<div class="carc-trends-tabs">' +
      '<button type="button" class="carc-trends-tab carc-trends-tab--active" data-carc-range="1h">1h</button>' +
      '<button type="button" class="carc-trends-tab" data-carc-range="8h">8h</button>' +
      '<button type="button" class="carc-trends-tab" data-carc-range="24h">24h</button>' +
      '<button type="button" class="carc-trends-tab" data-carc-range="7d">7d</button>' +
      '</div>';
  }
  var html = '<div class="carc-trends-tabs">';
  for (var i = 0; i < RANGES.length; i++) {
    var r = RANGES[i];
    var active = (r.id === '1h') ? ' carc-trends-tab--active' : '';
    html += '<button type="button" class="carc-trends-tab' + active + '" data-carc-range="' + r.id + '">' + r.label + '</button>';
  }
  html += '</div>';
  return html;
}

// SDD mx60-detail-charts-parity WU3: support the 8 ranges (4 static + 3
// dynamic + '30d' static). Static ranges return `hours * 3600000`.
// Dynamic ranges (`today`, `yesterday`, `mtd`) compute the window as the
// distance from `now` back to the clock-anchored cutoff (same approach as
// UpDetail._computeRangeCutoff). This keeps the existing
// `buf.filterByRange(raw, MS)` caller contract intact (lower-bound only).
function _carcRangeToMs(rangeId) {
  var RANGES = (window.MX60 && MX60.HistoryVocabulary)
    ? MX60.HistoryVocabulary.RANGES : null;
  if (!RANGES) {
    // Pre-vocabulary fallback (defensive — same 4 cases as before).
    switch (rangeId) {
      case '1h':  return 1  * 3600000;
      case '8h':  return 8  * 3600000;
      case '24h': return 24 * 3600000;
      case '7d':  return 7  * 24 * 3600000;
      default:    return 24 * 3600000;
    }
  }
  var r = null;
  for (var i = 0; i < RANGES.length; i++) {
    if (RANGES[i].id === rangeId) { r = RANGES[i]; break; }
  }
  if (!r) return 24 * 3600000;  // unknown — defensive 24h fallback
  if (r.dynamic !== true) return r.hours * 3600000;
  var now = Date.now();
  var d = new Date(now);
  if (r.id === 'today') {
    d.setHours(0, 0, 0, 0);
    return now - d.getTime();
  }
  if (r.id === 'yesterday') {
    d.setHours(0, 0, 0, 0);
    return now - (d.getTime() - 24 * 3600000);
  }
  if (r.id === 'mtd') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return now - d.getTime();
  }
  return 24 * 3600000;
}

function _carcFetchHistoryData(histId, range) {
  return new Promise(function(resolve) {
    const cfg = (window.MX60 && MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function')
      ? MX60.ConfigManager.getConfig() : null;
    const base = (cfg && cfg.api && cfg.api.historyData)
      ? cfg.api.historyData : '/mx60/api/historyData';
    // Translate the frontend range id ('1h'..'7d') to the canonical backend
    // key via the shared vocabulary (REQ-1 + spec scenario S-5). A missing
    // entry warns + falls back to 'lastHour' so vocabulary drift is loud.
    const map = (window.MX60 && MX60.HistoryVocabulary)
      ? MX60.HistoryVocabulary.RANGE_TO_BACKEND : null;
    let backendKey = map ? map[range] : null;
    if (!backendKey) {
      console.warn('[CarcamoDetail] unknown range id: ' + range);
      backendKey = 'lastHour';
    }
    const url = base + '?id=' + encodeURIComponent(histId) + '&range=' + encodeURIComponent(backendKey);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
      try {
        const parsed = JSON.parse(xhr.responseText);
        const raw = parsed.data || [];
        // Backend returns either {data: [[t, value], ...]} (tuple form) or
        // {data: [{t, value}]}. _buildCarcamoChart expects {timestamp, value}.
        // Normalize both forms here.
        const normalized = raw.map(function(pt) {
          if (Array.isArray(pt) && pt.length >= 2) {
            return { timestamp: pt[0], value: (pt[1] !== null && pt[1] !== undefined) ? pt[1] : null };
          }
          if (pt && pt.t !== undefined) {
            return { timestamp: pt.t, value: (pt.value !== null && pt.value !== undefined) ? pt.value : null };
          }
          if (pt && pt.timestamp !== undefined) {
            return { timestamp: pt.timestamp, value: (pt.value !== null && pt.value !== undefined) ? pt.value : null };
          }
          return null;
        }).filter(function(pt) { return pt && pt.timestamp !== undefined; });
        resolve(normalized);
      } catch (e) { resolve([]); }
    };
    xhr.onerror   = function() { resolve([]); };
    xhr.ontimeout = function() { resolve([]); };
    xhr.timeout = 15000;
    xhr.send();
  });
}

function _carcLoadSlotHistory(equip, slotName, range) {
  return new Promise(function(resolve) {
    const buf = window.MX60 && MX60.LiveHistoryBuffer;
    const bufCount = buf ? buf.getCount(equip.id) : 0;

    function _useBuffer() {
      const raw    = buf ? buf.getSeries(equip.id, slotName) : [];
      const series = buf ? buf.filterByRange(raw, _carcRangeToMs(range)) : [];
      const data   = series.map(function(p) { return { timestamp: p.t, value: p.value }; });
      resolve({ data: data, hasBackend: false, bufferCount: bufCount });
    }

    if (!window.MX60 || !MX60.HistoryIndex || typeof MX60.HistoryIndex.load !== 'function') {
      _useBuffer();
      return;
    }

    MX60.HistoryIndex.load(function() {
      const histMap = MX60.HistoryIndex.get(equip.id) || {};
      const histId  = histMap[slotName];
      if (!histId) { _useBuffer(); return; }
      _carcFetchHistoryData(histId, range).then(function(data) {
        if (data && data.length > 0) {
          resolve({ data: data, hasBackend: true, bufferCount: bufCount });
        } else {
          // Backend resolved a histId but returned no rows for this window —
          // fall back to buffer so the chart isn't empty if buffer has data.
          const raw    = buf ? buf.getSeries(equip.id, slotName) : [];
          const series = buf ? buf.filterByRange(raw, _carcRangeToMs(range)) : [];
          const fallbackData = series.map(function(p) { return { timestamp: p.t, value: p.value }; });
          resolve({ data: fallbackData, hasBackend: true, bufferCount: bufCount });
        }
      });
    });
  });
}

// ---- _buildCarcamoChart — Chart.js init for nivelCm trend -----------------
// C4 D3: build or rebuild chart with given history data.
// SDD mx60-detail-charts-parity WU4: accepts optional `baselineData` (array
// of nivelCm values aligned 1:1 with historyData indices). When present,
// render as a second dashed overlay dataset.
function _buildCarcamoChart(canvasEl, historyData, rangeLabel, baselineData) {
  if (!canvasEl || !window.Chart) return null;
  // Destroy previous chart if any
  if (canvasEl._mx60Chart) {
    try { canvasEl._mx60Chart.destroy(); } catch (e) {}
    canvasEl._mx60Chart = null;
  }
  var labels = [];
  var values = [];
  if (Array.isArray(historyData)) {
    for (var i = 0; i < historyData.length; i++) {
      var pt = historyData[i];
      labels.push(pt.timestamp ? new Date(pt.timestamp) : '');
      values.push(pt.value != null ? pt.value : null);
    }
  }
  var datasets = [{
    label: 'nivelCm (%)',
    data: values,
    borderColor: '#00d4aa',
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
    borderWidth: 1.5,
    pointRadius: values.length > 120 ? 0 : 2,
    tension: 0.3,
    fill: true
  }];
  if (Array.isArray(baselineData) && baselineData.length === values.length) {
    datasets.push({
      label: 'Ayer',
      data: baselineData,
      borderColor: 'rgba(255, 255, 255, 0.55)',
      backgroundColor: 'transparent',
      borderWidth: 1.2,
      borderDash: [4, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false
    });
  }
  var chart = new window.Chart(canvasEl, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    // SDD mx60-detail-charts-parity WU5: hint Chart.js to expose
    // chart.scales.x.getValueForPixel for the cursor parity plugin (it
    // already works with type:'time' axis below; this comment is here to
    // mark the interaction expectation).
    // SDD mx60-detail-charts-parity post-smoke fix: copiar el styling de
    // UpDetail.chartOptionsFor (que el operator confirmó que se ve bien)
    // para Cárcamo. Diferencias clave de antes:
    //   - tooltip con bgcolor/borderColor/fonts (antes: default browser styling)
    //   - interaction index/intersect:false (sync hover values + crosshair)
    //   - ticks color #64748b + JetBrains Mono (antes: '#6b7280' + default font)
    //   - grid rgba 0.04 + border rgba 0.08 (más sutil que .05/none)
    // CP3: chrome now from ChartTheme — themed palette.
    options: (function() {
      const _ch = (window.MX60 && MX60.ChartTheme) ? MX60.ChartTheme.chrome(_carcCurrentTheme) : null;
      const _tp = _ch ? _ch.tooltip : {};
      const _sc = _ch ? _ch.scales  : {};
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: _tp.backgroundColor || 'rgba(12,16,33,0.92)',
            titleColor:      _tp.titleColor      || '#e2e8f0',
            bodyColor:       _tp.bodyColor       || '#94a3b8',
            borderColor:     _tp.borderColor     || 'rgba(0,240,255,0.2)',
            borderWidth: 1,
            titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
            bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
            padding: 10,
            callbacks: {
              label: function(ctx) {
                if (ctx.parsed == null || ctx.parsed.y == null) return ctx.dataset.label + ': sin dato';
                return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + ' %';
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              tooltipFormat: 'yyyy-MM-dd HH:mm',
              displayFormats: {
                millisecond: 'HH:mm:ss',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
            ticks: {
              color: (_sc.x && _sc.x.ticks) ? _sc.x.ticks.color : '#64748b',
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              maxTicksLimit: 10,
              maxRotation: 0
            },
            grid:   { color: (_sc.x && _sc.x.grid)   ? _sc.x.grid.color   : 'rgba(255,255,255,0.04)' },
            border: { color: (_sc.x && _sc.x.border) ? _sc.x.border.color : 'rgba(255,255,255,0.08)' }
          },
          y: {
            min: 0, max: 100,
            ticks: {
              color: (_sc.y && _sc.y.ticks) ? _sc.y.ticks.color : '#64748b',
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              callback: function(v) { return v + ' %'; }
            },
            grid:   { color: (_sc.y && _sc.y.grid)   ? _sc.y.grid.color   : 'rgba(255,255,255,0.04)' },
            border: { color: (_sc.y && _sc.y.border) ? _sc.y.border.color : 'rgba(255,255,255,0.08)' }
          }
        }
      };
    }())
  });
  canvasEl._mx60Chart = chart;
  return chart;
}

// SDD mx60-detail-charts-parity WU5: helper to subscribe a Carcamo chart
// to the CursorParity bus. viewId is 'carc-' + equipId so the (single)
// nivelCm chart of THIS Cárcamo will sync its cursor with itself; the
// plugin's D4 activation criteria (all charts of same view share range)
// is trivially satisfied with a single chart. The subscription still
// matters when future SDDs add more charts to the Cárcamo detail.
function _carcAttachCursorParity(chart, equipId, getRangeFn) {
  if (!chart || !window.MX60 || !MX60.CursorParity || typeof MX60.CursorParity.attachToChart !== 'function') {
    return null;
  }
  try {
    return MX60.CursorParity.attachToChart(chart, 'carc-' + (equipId || 'unknown'), getRangeFn);
  } catch (e) {
    return null;
  }
}

// ---- mount(container, equip) → { destroy } ---------------------------------
function mount(container, equip) {
  if (!container || !equip) return null;

  container.innerHTML = _shellHtml(equip);

  const sceneHost   = container.querySelector('[data-carc-scene-host]');
  const levelFillEl = container.querySelector('[data-carc-level-fill]');
  const levelMarksEl= container.querySelector('[data-carc-level-marks]');
  const rawEl       = container.querySelector('[data-carc-raw]');
  const stateEl     = container.querySelector('[data-carc-state]');
  const statusPill  = container.querySelector('[data-carc-status-pill]');
  const advInput    = container.querySelector('[data-carc-umbral="advertencia"]');
  const critInput   = container.querySelector('[data-carc-umbral="critico"]');
  const validationEl= container.querySelector('[data-carc-validation]');
  const inputFocused= { advertencia: false, critico: false };

  // Tick marks on level bar
  if (levelMarksEl) {
    for (let p = 10; p < 100; p += 10) {
      const m = document.createElement('div');
      m.className = 'carc-level-mark';
      m.style.bottom = p + '%';
      levelMarksEl.appendChild(m);
    }
  }

  // ----- Scene setup ----------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sceneHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080d);
  scene.fog = new THREE.Fog(0x06080d, 22, 40);

  // Shared module-level PMREM — generated once on a persistent off-screen
  // renderer (see SharedEnv.js). After the first detail mount the cost is 0.
  scene.environment = getEnvTexture();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  // Initial camera per viewport — overrides via "Copiar vista" button.
  const _initView = (window.innerWidth < 768) ? CAMERA_DEFAULTS.mobile : CAMERA_DEFAULTS.desktop;
  camera.position.set(_initView.position.x, _initView.position.y, _initView.position.z);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(_initView.target.x, _initView.target.y, _initView.target.z);
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.minAzimuthAngle = -Math.PI * 0.6;
  controls.maxAzimuthAngle = Math.PI * 0.6;

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(8, 14, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 35;
  dirLight.shadow.bias = -0.0003;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  // CP3: capture refs so the theme callback can mutate colour/intensity.
  const fillLight = new THREE.DirectionalLight(0x9ab8d8, 0.35);
  fillLight.translateX(-6).translateY(6).translateZ(-4);
  scene.add(fillLight);
  const ambientLight = new THREE.AmbientLight(0x4a5a6e, 0.3);
  scene.add(ambientLight);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.4;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dimensions
  const PIT_W = 6, PIT_D = 6, PIT_H = 5, WALL = 0.4, TOP_T = 0.4;
  const HOLE_W = 1.0, HOLE_D = 1.0;
  const TANK_R = 1.45, TANK_H = 4.0;
  const TANK_BASE_Y = -PIT_H / 2 + 0.08;
  const TANK_TOP_Y = TANK_BASE_Y + TANK_H;

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    map: makeConcreteTexture(), color: 0xc8c0b0, roughness: 0.92, metalness: 0.04
  });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf2c33d, roughness: 0.45, metalness: 0.2 });
  const metalMat  = new THREE.MeshStandardMaterial({ color: 0xa0a8b0, roughness: 0.32, metalness: 0.88 });
  const tankWallMat = new THREE.MeshPhysicalMaterial({
    color: 0xb8c8d4, roughness: 0.04, metalness: 0.0,
    transmission: 0.92, thickness: 0.15, ior: 1.45,
    side: THREE.DoubleSide, envMapIntensity: 1.4,
    attenuationDistance: 5, attenuationColor: 0xeaf2f8
  });
  const tankCapMat = new THREE.MeshStandardMaterial({ color: 0x8a8e92, roughness: 0.55, metalness: 0.55 });
  const sensorBodyMat   = new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.55, metalness: 0.35 });
  const sensorScreenMat = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.2, metalness: 0.1, emissive: 0x003322, emissiveIntensity: 0.4 });
  const sensorLEDMat    = new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.4, metalness: 0.1, emissive: 0xff1122, emissiveIntensity: 0.8 });

  // Pit
  const pitGroup = new THREE.Group();
  scene.add(pitGroup);
  const meshC = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, concreteMat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  pitGroup.add(meshC(new THREE.BoxGeometry(PIT_W + WALL*2, WALL, PIT_D + WALL*2), 0, -PIT_H/2 - WALL/2, 0));
  pitGroup.add(meshC(new THREE.BoxGeometry(PIT_W + WALL*2, PIT_H, WALL), 0, 0, -PIT_D/2 - WALL/2));
  pitGroup.add(meshC(new THREE.BoxGeometry(WALL, PIT_H, PIT_D + WALL*2), -PIT_W/2 - WALL/2, 0, 0));
  pitGroup.add(meshC(new THREE.BoxGeometry(WALL, PIT_H, PIT_D + WALL*2),  PIT_W/2 + WALL/2, 0, 0));

  // Top frame with chimney hole
  const TOP_OUT_W = PIT_W + WALL * 2;
  const TOP_OUT_D = PIT_D + WALL * 2;
  const topY = PIT_H / 2 + TOP_T / 2;
  pitGroup.add(meshC(new THREE.BoxGeometry(TOP_OUT_W, TOP_T, (TOP_OUT_D - HOLE_D)/2), 0, topY, -(HOLE_D/2 + (TOP_OUT_D - HOLE_D)/4)));
  pitGroup.add(meshC(new THREE.BoxGeometry(TOP_OUT_W, TOP_T, (TOP_OUT_D - HOLE_D)/2), 0, topY,  (HOLE_D/2 + (TOP_OUT_D - HOLE_D)/4)));
  pitGroup.add(meshC(new THREE.BoxGeometry((TOP_OUT_W - HOLE_W)/2, TOP_T, HOLE_D), -(HOLE_W/2 + (TOP_OUT_W - HOLE_W)/4), topY, 0));
  pitGroup.add(meshC(new THREE.BoxGeometry((TOP_OUT_W - HOLE_W)/2, TOP_T, HOLE_D),  (HOLE_W/2 + (TOP_OUT_W - HOLE_W)/4), topY, 0));

  // Yellow safety bands
  const bandH = 0.06, bandT = 0.16, innerT = 0.08;
  const bandY = topY + TOP_T / 2 + bandH / 2;
  const addY = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, yellowMat); m.position.set(x, y, z); m.castShadow = true; pitGroup.add(m); return m;
  };
  addY(new THREE.BoxGeometry(TOP_OUT_W, bandH, bandT), 0, bandY,  TOP_OUT_D/2 - bandT/2);
  addY(new THREE.BoxGeometry(TOP_OUT_W, bandH, bandT), 0, bandY, -TOP_OUT_D/2 + bandT/2);
  addY(new THREE.BoxGeometry(bandT, bandH, TOP_OUT_D - bandT*2), -TOP_OUT_W/2 + bandT/2, bandY, 0);
  addY(new THREE.BoxGeometry(bandT, bandH, TOP_OUT_D - bandT*2),  TOP_OUT_W/2 - bandT/2, bandY, 0);
  addY(new THREE.BoxGeometry(HOLE_W + innerT*2, bandH, innerT), 0, bandY,  HOLE_D/2 + innerT/2);
  addY(new THREE.BoxGeometry(HOLE_W + innerT*2, bandH, innerT), 0, bandY, -HOLE_D/2 - innerT/2);
  addY(new THREE.BoxGeometry(innerT, bandH, HOLE_D), -HOLE_W/2 - innerT/2, bandY, 0);
  addY(new THREE.BoxGeometry(innerT, bandH, HOLE_D),  HOLE_W/2 + innerT/2, bandY, 0);

  // Tank
  const tankGroup = new THREE.Group();
  scene.add(tankGroup);
  const tankWall = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 64, 1, true), tankWallMat);
  tankWall.position.y = TANK_BASE_Y + TANK_H / 2;
  tankGroup.add(tankWall);
  const tankBase = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R + 0.05, TANK_R + 0.05, 0.08, 48), tankCapMat);
  tankBase.position.y = TANK_BASE_Y - 0.04; tankBase.castShadow = true; tankBase.receiveShadow = true;
  tankGroup.add(tankBase);
  const capDisc = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R + 0.18, TANK_R + 0.18, 0.1, 48), tankCapMat);
  capDisc.position.y = TANK_TOP_Y + 0.05; capDisc.castShadow = true;
  tankGroup.add(capDisc);
  const capCone = new THREE.Mesh(new THREE.ConeGeometry(TANK_R * 0.85, 0.45, 48), tankCapMat);
  capCone.position.y = TANK_TOP_Y + 0.1 + 0.225; capCone.castShadow = true;
  tankGroup.add(capCone);

  // Sensor
  const sensorGroup = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.18), sensorBodyMat);
  sBody.castShadow = true; sensorGroup.add(sBody);
  const sScreen = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.005), sensorScreenMat);
  sScreen.position.set(0, 0.05, 0.092); sensorGroup.add(sScreen);
  const sLED = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), sensorLEDMat);
  sLED.position.set(0.15, -0.13, 0.092); sensorGroup.add(sLED);
  const sLEDLight = new THREE.PointLight(0xff3344, 0.5, 1.2);
  sLEDLight.position.copy(sLED.position).add(new THREE.Vector3(0, 0, 0.05));
  sensorGroup.add(sLEDLight);
  const sBracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.08), metalMat);
  sBracket.position.set(0, 0, -0.13); sensorGroup.add(sBracket);
  const sensorAngle = Math.PI * 0.18;
  sensorGroup.position.set(
    Math.sin(sensorAngle) * (TANK_R + 0.12),
    TANK_TOP_Y - 0.6,
    Math.cos(sensorAngle) * (TANK_R + 0.12)
  );
  sensorGroup.rotation.y = sensorAngle;
  scene.add(sensorGroup);

  // Chimney
  const CHIM_BASE_Y = TANK_TOP_Y + 0.55;
  const CHIM_TOP_Y  = topY + TOP_T / 2 + 1.6;
  const CHIM_LEN = CHIM_TOP_Y - CHIM_BASE_Y;
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, CHIM_LEN, 24), metalMat);
  chim.position.y = CHIM_BASE_Y + CHIM_LEN / 2; chim.castShadow = true; scene.add(chim);
  const chimHat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24), metalMat);
  chimHat.position.y = CHIM_TOP_Y + 0.05; chimHat.castShadow = true; scene.add(chimHat);
  const chimFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), metalMat);
  chimFlange.position.y = CHIM_BASE_Y + 0.025; scene.add(chimFlange);

  // Water
  const WATER_R = TANK_R - 0.025;
  const WATER_MAX_H = TANK_H * 0.95;
  const waterBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a5a8c, roughness: 0.06, metalness: 0.0,
    transmission: 0.4, thickness: 1.2, ior: 1.33,
    transparent: true, opacity: 0.92,
    side: THREE.DoubleSide, envMapIntensity: 1.3
  });
  const waterColumn = new THREE.Mesh(new THREE.CylinderGeometry(WATER_R, WATER_R, 1, 48, 1, true), waterBodyMat);
  waterColumn.position.y = TANK_BASE_Y + 0.5;
  scene.add(waterColumn);
  const waterBottom = new THREE.Mesh(new THREE.CircleGeometry(WATER_R, 48), waterBodyMat);
  waterBottom.rotation.x = Math.PI / 2;
  waterBottom.position.y = TANK_BASE_Y + 0.005;
  scene.add(waterBottom);

  const surfaceGeo = makePolarGrid(WATER_R, 10, 40);
  const origPositions = new Float32Array(surfaceGeo.attributes.position.array);
  const surfaceMat = new THREE.MeshPhysicalMaterial({
    color: 0x2c8fc4, roughness: 0.04, metalness: 0.0,
    transmission: 0.25, thickness: 0.6, ior: 1.33,
    transparent: true, opacity: 0.95, side: THREE.DoubleSide,
    envMapIntensity: 1.6, clearcoat: 0.9, clearcoatRoughness: 0.06
  });
  const waterSurface = new THREE.Mesh(surfaceGeo, surfaceMat);
  scene.add(waterSurface);

  // ----- State + UI binding ---------------------------------------------
  let rawValue = 0;       // raw reading (treated as 0-100 %)
  let stateValue = 0;     // step-snapped to nearest 10 (matches demo computeState)
  let currentLevel = 0;
  let targetLevel = 0;

  function computeState(raw) {
    if (raw <= 0) return 0;
    return Math.min(100, Math.ceil(raw / 10) * 10);
  }

  function applyReading(raw) {
    rawValue = (raw === null || raw === undefined || isNaN(raw)) ? 0 : Math.max(0, Math.min(100, Number(raw)));
    stateValue = computeState(rawValue);
    targetLevel = stateValue / 100;

    const color = carcamoColor(equip.id, rawValue);
    const hex = colorHex(color);

    if (rawEl)   rawEl.textContent   = rawValue.toFixed(rawValue % 1 === 0 ? 0 : 1);
    if (stateEl) {
      stateEl.textContent = stateValue;
      stateEl.style.color = hex;
    }
    if (levelFillEl) {
      levelFillEl.style.height = stateValue + '%';
      levelFillEl.style.background = 'linear-gradient(180deg, ' + hex + ', ' + hex + '55)';
    }
    if (statusPill) {
      statusPill.className = 'carc-status-pill tone-' + colorTone(color);
      statusPill.textContent = colorLabel(color);
    }

    // Sensor LED matches the threshold color
    if (color === 'rojo') {
      sensorLEDMat.color.setHex(0xff3344);
      sensorLEDMat.emissive.setHex(0xff1122);
      sLEDLight.color.setHex(0xff3344);
    } else if (color === 'naranja') {
      sensorLEDMat.color.setHex(0xf5a742);
      sensorLEDMat.emissive.setHex(0xe09020);
      sLEDLight.color.setHex(0xf5a742);
    } else {
      sensorLEDMat.color.setHex(0x44ff77);
      sensorLEDMat.emissive.setHex(0x22dd55);
      sLEDLight.color.setHex(0x44ff77);
    }
  }

  function _currentReading() {
    let eq = equip;
    if (window.MX60 && MX60.EquipmentData && typeof MX60.EquipmentData.getById === 'function') {
      eq = MX60.EquipmentData.getById(equip.id) || equip;
    }
    return (eq && eq.summary && eq.summary.nivelCm != null) ? Number(eq.summary.nivelCm) : 0;
  }

  // ----- Threshold inputs (editable) -----------------------------------
  // Empty input = use default; typed value = override stored in
  // CarcamoThresholdStore. Cross-field rule: critico > advertencia.
  function _renderThresholdInputs() {
    const store = window.MX60 && MX60.CarcamoThresholdStore;
    if (!store) return;
    if (advInput && !inputFocused.advertencia) {
      const v = store.get(equip.id, 'umbralAdvertencia');
      advInput.value = (v === null || v === undefined) ? '' : String(v);
    }
    if (critInput && !inputFocused.critico) {
      const v = store.get(equip.id, 'umbralCritico');
      critInput.value = (v === null || v === undefined) ? '' : String(v);
    }
    _setCarcValidation('');
  }
  function _setCarcValidation(msg) {
    if (!validationEl) return;
    if (msg) {
      validationEl.textContent = msg;
      validationEl.classList.add('is-visible');
    } else {
      validationEl.textContent = '';
      validationEl.classList.remove('is-visible');
    }
  }
  function _commitCarcThreshold(thresholdKey, inputEl) {
    const store = window.MX60 && MX60.CarcamoThresholdStore;
    if (!store || !inputEl) return;
    const raw = (inputEl.value || '').trim();
    const newVal = (raw === '') ? null : parseFloat(raw);
    if (newVal !== null && isNaN(newVal)) {
      const cur = store.get(equip.id, thresholdKey);
      inputEl.value = (cur === null || cur === undefined) ? '' : String(cur);
      return;
    }
    // Cross-field: effective critico must be greater than effective adv.
    const effAdv  = (thresholdKey === 'umbralAdvertencia')
      ? (newVal !== null ? newVal : store.DEFAULTS.umbralAdvertencia)
      : store.getEffective(equip.id, 'umbralAdvertencia');
    const effCrit = (thresholdKey === 'umbralCritico')
      ? (newVal !== null ? newVal : store.DEFAULTS.umbralCritico)
      : store.getEffective(equip.id, 'umbralCritico');
    if (!(effCrit > effAdv)) {
      _setCarcValidation('Límite Crítico debe ser mayor que Rango Crítico.');
      const cur = store.get(equip.id, thresholdKey);
      inputEl.value = (cur === null || cur === undefined) ? '' : String(cur);
      return;
    }
    _setCarcValidation('');

    const prior = store.get(equip.id, thresholdKey);
    if (newVal === prior) return; // no-op

    const label = thresholdKey === 'umbralAdvertencia' ? 'Rango Crítico' : 'Límite Crítico';
    const message = (newVal === null)
      ? '¿Restaurar ' + label + ' al valor por defecto?'
      : '¿Confirmar ' + label + ' = ' + newVal + ' %?';

    function _apply() {
      // D1: Optimistic update — store first, then write. Rollback on failure (REQ-008).
      if (newVal === null) store.remove(equip.id, thresholdKey);
      else store.set(equip.id, thresholdKey, newVal);
      if (equip.ord) {
        MX60.writePoint(equip.ord + '/' + thresholdKey, newVal)
          .catch(function() {
            // Rollback: revert store to prior value and reset input.
            if (prior === null || prior === undefined) store.remove(equip.id, thresholdKey);
            else store.set(equip.id, thresholdKey, prior);
            inputEl.value = (prior === null || prior === undefined) ? '' : String(prior);
            // Toast already shown by writePoint helper (CONTRACT in WritePoint.js).
          });
      }
    }
    function _revert() {
      inputEl.value = (prior === null || prior === undefined) ? '' : String(prior);
    }

    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:    'Cambiar umbral',
        message:  message,
        tone:     newVal === null ? 'danger' : 'neutral',
        onConfirm: _apply,
        onCancel:  _revert
      });
    } else {
      _apply();
    }
  }
  function _onCarcType(e) {
    const v = e.target.value;
    if (!/^\d*\.?\d*$/.test(v)) {
      e.target.value = v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    }
  }
  const advFocus = function () { inputFocused.advertencia = true; };
  const advBlur  = function () { inputFocused.advertencia = false; _commitCarcThreshold('umbralAdvertencia', advInput); };
  const advKey   = function (e) { if (e.key === 'Enter') { e.preventDefault(); advInput.blur(); } };
  const critFocus= function () { inputFocused.critico = true; };
  const critBlur = function () { inputFocused.critico = false; _commitCarcThreshold('umbralCritico', critInput); };
  const critKey  = function (e) { if (e.key === 'Enter') { e.preventDefault(); critInput.blur(); } };

  if (advInput) {
    advInput.addEventListener('input',   _onCarcType, false);
    advInput.addEventListener('focus',   advFocus,    false);
    advInput.addEventListener('blur',    advBlur,     false);
    advInput.addEventListener('keydown', advKey,      false);
  }
  if (critInput) {
    critInput.addEventListener('input',   _onCarcType, false);
    critInput.addEventListener('focus',   critFocus,   false);
    critInput.addEventListener('blur',    critBlur,    false);
    critInput.addEventListener('keydown', critKey,     false);
  }

  let unsubscribeCarcThresholds = function () {};
  if (window.MX60 && MX60.CarcamoThresholdStore) {
    unsubscribeCarcThresholds = MX60.CarcamoThresholdStore.subscribe(function (evt) {
      if (!evt || evt.equipId !== equip.id) return;
      _renderThresholdInputs();
      applyReading(_currentReading());
    });
  }

  // Initial paint
  _renderThresholdInputs();
  applyReading(_currentReading());

  // ----- Resize ---------------------------------------------------------
  function resize() {
    const w = sceneHost.clientWidth || 600;
    const h = sceneHost.clientHeight || 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  let resizeObs = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(resize);
    resizeObs.observe(sceneHost);
  }
  window.addEventListener('resize', resize, false);

  // ----- Animation loop -------------------------------------------------
  let disposed = false;
  let rafId = 0;
  const clock = new THREE.Clock();
  const surfPosAttr = waterSurface.geometry.attributes.position;

  function tick() {
    if (disposed) return;
    // RAF guard: encolar el siguiente frame ANTES del work, no después.
    // Si destroy() corre entre el render y el siguiente requestAnimationFrame,
    // el frame ya estaba encolado y se ejecutaba con scene null, materials
    // disposed, etc. Encolar primero + check disposed al inicio del próximo
    // tick aborta cleanly. (SDD chihuahua-perf-staging — leak A.)
    rafId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    currentLevel += (targetLevel - currentLevel) * 0.07;
    if (Math.abs(targetLevel - currentLevel) < 0.0005) currentLevel = targetLevel;

    const waterH = currentLevel * WATER_MAX_H;
    const showWater = waterH > 0.01;
    waterColumn.visible = showWater;
    waterSurface.visible = showWater;
    waterBottom.visible = showWater;
    if (showWater) {
      waterColumn.scale.y = waterH;
      waterColumn.position.y = TANK_BASE_Y + waterH / 2;
      waterSurface.position.y = TANK_BASE_Y + waterH;
      for (let i = 0; i < surfPosAttr.count; i++) {
        const ox = origPositions[i * 3];
        const oz = origPositions[i * 3 + 2];
        const wave =
          Math.sin(t * 1.8 + ox * 4.0) * 0.030 +
          Math.cos(t * 1.4 + oz * 5.0) * 0.025 +
          Math.sin(t * 2.6 + (ox + oz) * 3.5) * 0.018;
        surfPosAttr.setY(i, wave);
      }
      surfPosAttr.needsUpdate = true;
      waterSurface.geometry.computeVertexNormals();
    }

    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  // ----- C5: Trends section — UP-pattern (pre-resolve + buffer fallback) ----
  // Replicates UpDetail.js charts: HistoryIndex pre-resolve → /api/historyData
  // with canonical histId → LiveHistoryBuffer fallback when no BHistoryExt is
  // configured → "Recolectando datos en vivo…" overlay when both are empty.
  const trendsSection   = container.querySelector('[data-carc-trends]');
  const trendsCanvasWrap= container.querySelector('.carc-trends-canvas-wrap');
  const trendsCanvas    = container.querySelector('[data-carc-trends-canvas]');
  const baselineBtnEl   = container.querySelector('[data-carc-baseline]');
  let   _trendRange     = '1h';
  let   _trendTimer     = null;
  // SDD mx60-detail-charts-parity WU4: baseline overlay state
  let   _baselineActive = false;

  function _carcUpdateOverlay(hasBackend, bufferCount) {
    if (!trendsCanvasWrap) return;
    const noBackend    = !hasBackend;
    const bufferSparse = bufferCount < 5;
    const showOverlay  = noBackend && bufferSparse;

    let overlayEl = trendsCanvasWrap.querySelector('.carc-no-history-overlay');
    if (showOverlay) {
      if (!overlayEl) {
        overlayEl = document.createElement('div');
        overlayEl.className = 'carc-no-history-overlay';
        overlayEl.style.cssText = [
          'position:absolute', 'top:0', 'left:0', 'right:0', 'bottom:0',
          'display:flex', 'align-items:center', 'justify-content:center',
          'background:rgba(15,23,42,0.82)', 'border-radius:8px',
          'pointer-events:none', 'z-index:10'
        ].join(';');
        trendsCanvasWrap.style.position = 'relative';
        trendsCanvasWrap.appendChild(overlayEl);
      }
      overlayEl.innerHTML = '<span style="color:#94a3b8;font-size:13px;text-align:center;padding:16px">' +
        'Recolectando datos en vivo…</span>';
    } else {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    }
  }

  function _fetchAndBuildChart(range) {
    if (!trendsCanvas) return;
    _carcLoadSlotHistory(equip, 'nivelCm', range).then(function(result) {
      var currentData = result.data || [];
      if (_baselineActive && currentData.length) {
        // Fetch yesterday's window in parallel and overlay as dashed dataset.
        _carcLoadSlotHistory(equip, 'nivelCm', 'yesterday').then(function(yres) {
          var baselineValues = _carcBaselineParallel(currentData, yres.data || []);
          var chart = _buildCarcamoChart(trendsCanvas, currentData, range, baselineValues);
          _carcUpdateOverlay(!!result.hasBackend, result.bufferCount || 0);
          _attachCursorParityToTrend(chart);
        });
      } else {
        var chart = _buildCarcamoChart(trendsCanvas, currentData, range);
        _carcUpdateOverlay(!!result.hasBackend, result.bufferCount || 0);
        _attachCursorParityToTrend(chart);
      }
    });
  }

  // SDD mx60-detail-charts-parity WU5: cursor parity subscription per chart
  // rebuild. _buildCarcamoChart destroys the previous chart on each call, so
  // we must re-attach after every rebuild. The previous unsubscribe (if any)
  // was already removed by destroy() chain — _carcAttachCursorParity always
  // returns a fresh unsub.
  function _attachCursorParityToTrend(chart) {
    if (!chart) return;
    // Cleanup previous unsub before replacing (defensive — chart was destroyed
    // so its overlay is gone, but the subscribers[] entry may linger if the
    // closure leaked).
    if (typeof chart._cursorUnsub === 'function') {
      try { chart._cursorUnsub(); } catch (e) {}
    }
    chart._cursorUnsub = _carcAttachCursorParity(chart, equip && equip.id, function() {
      return _trendRange || 'unknown';
    });
  }

  function _onBaselineToggle() {
    _baselineActive = !_baselineActive;
    if (baselineBtnEl) {
      baselineBtnEl.classList.toggle('carc-baseline-btn--active', _baselineActive);
    }
    _fetchAndBuildChart(_trendRange);
  }

  if (baselineBtnEl) {
    baselineBtnEl.addEventListener('click', _onBaselineToggle, false);
  }

  if (trendsSection) {
    trendsSection.addEventListener('click', function(e) {
      const btn = e.target.closest && e.target.closest('[data-carc-range]');
      if (!btn) return;
      const range = btn.getAttribute('data-carc-range');
      if (!range || range === _trendRange) return;
      _trendRange = range;
      // Update tab active state
      const tabs = trendsSection.querySelectorAll('[data-carc-range]');
      tabs.forEach(function(t) {
        if (t.getAttribute('data-carc-range') === range) {
          t.classList.add('carc-trends-tab--active');
        } else {
          t.classList.remove('carc-trends-tab--active');
        }
      });
      _fetchAndBuildChart(range);
    }, false);

    // Initial fetch + 60s in-place rebuild (REQ-G9-2)
    _fetchAndBuildChart(_trendRange);
    _trendTimer = setInterval(function() {
      _fetchAndBuildChart(_trendRange);
    }, 60000);
  }

  // ----- Subscriptions --------------------------------------------------
  function onDataChange() {
    applyReading(_currentReading());
  }
  if (window.MX60 && MX60.EquipmentData && typeof MX60.EquipmentData.addListener === 'function') {
    MX60.EquipmentData.addListener(onDataChange);
  }

  // CP3: apply the theme to the 3D scene — bg/fog/lights. Extracted so it can
  // prime the initial state AND run from the ThemeStore callback. Without the
  // initial prime, a fresh light-theme mount shows the dark scene — the
  // subscribe callback only fires on toggle, not on mount.
  function _applyCarcSceneTheme(theme) {
    if (theme === 'light') {
      scene.background.set(0xf0f2f4);
      scene.fog.color.set(0xf0f2f4);
      dirLight.intensity      = 1.1;
      dirLight.color.set(0xffffff);
      fillLight.color.set(0xc8d8ee);
      fillLight.intensity     = 0.28;
      ambientLight.color.set(0x8899aa);
      ambientLight.intensity  = 0.5;
      // Ground plane — match bg-ish near-white. Tunable: pick a slightly
      // different hue (e.g. 0xe4e7ea) if the floor should read distinct from
      // the bg, or 0xffffff for pure white (harsher on highlights).
      ground.material.color.set(0xf0f2f4);
    } else {
      scene.background.set(0x06080d);
      scene.fog.color.set(0x06080d);
      dirLight.intensity      = 1.4;
      dirLight.color.set(0xffffff);
      fillLight.color.set(0x9ab8d8);
      fillLight.intensity     = 0.35;
      ambientLight.color.set(0x4a5a6e);
      ambientLight.intensity  = 0.3;
      ground.material.color.set(0x0a0e14);
    }
  }

  // CP3: ThemeStore subscription — update scene bg/fog/lights and rebuild chart
  // (GATE-1a: unsubscribed in destroy; GATE-1b: no getTheme in RAF; GATE-1c:
  // _fetchAndBuildChart is idempotent destroy-then-rebuild).
  // Prime the 3D scene NOW from the DOM data-theme attribute (set by the FOUC
  // inline script before any module loads) — robust regardless of when
  // ThemeStore.init() ran. The subscribe callback only fires on toggle.
  _applyCarcSceneTheme(
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  );
  let _carcThemeUnsub = null;
  if (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.subscribe === 'function') {
    _carcThemeUnsub = MX60.ThemeStore.subscribe(function(theme) {
      _carcCurrentTheme = theme;
      _applyCarcSceneTheme(theme);
      _fetchAndBuildChart(_trendRange);
    });
  }

  // ----- Destroy --------------------------------------------------------
  function destroy() {
    disposed = true;
    // C4 D3: cleanup trends chart + interval
    if (_trendTimer) { clearInterval(_trendTimer); _trendTimer = null; }
    // SDD mx60-detail-charts-parity WU4: cleanup baseline button listener
    if (baselineBtnEl) {
      try { baselineBtnEl.removeEventListener('click', _onBaselineToggle, false); } catch (e) {}
    }
    if (trendsCanvas && trendsCanvas._mx60Chart) {
      // SDD mx60-detail-charts-parity WU5: unsubscribe CursorParity before
      // destroy so the overlay canvas + listeners are removed cleanly.
      if (typeof trendsCanvas._mx60Chart._cursorUnsub === 'function') {
        try { trendsCanvas._mx60Chart._cursorUnsub(); } catch (e) {}
        trendsCanvas._mx60Chart._cursorUnsub = null;
      }
      try { trendsCanvas._mx60Chart.destroy(); } catch (e) {}
      trendsCanvas._mx60Chart = null;
    }
    // C5: remove overlay if present (defensive — DOM is wiped by parent on unmount)
    if (trendsCanvasWrap) {
      const ov = trendsCanvasWrap.querySelector('.carc-no-history-overlay');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize, false);
    if (resizeObs) { try { resizeObs.disconnect(); } catch (e) {} }
    if (window.MX60 && MX60.EquipmentData && typeof MX60.EquipmentData.removeListener === 'function') {
      MX60.EquipmentData.removeListener(onDataChange);
    }
    if (typeof unsubscribeCarcThresholds === 'function') unsubscribeCarcThresholds();
    // CP3: unsubscribe ThemeStore (GATE-1a).
    if (_carcThemeUnsub && window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.unsubscribe === 'function') {
      try { MX60.ThemeStore.unsubscribe(_carcThemeUnsub); } catch (e) {}
      _carcThemeUnsub = null;
    }
    if (advInput) {
      advInput.removeEventListener('input',   _onCarcType, false);
      advInput.removeEventListener('focus',   advFocus,    false);
      advInput.removeEventListener('blur',    advBlur,     false);
      advInput.removeEventListener('keydown', advKey,      false);
    }
    if (critInput) {
      critInput.removeEventListener('input',   _onCarcType, false);
      critInput.removeEventListener('focus',   critFocus,   false);
      critInput.removeEventListener('blur',    critBlur,    false);
      critInput.removeEventListener('keydown', critKey,     false);
    }
    if (controls && controls.dispose) controls.dispose();
    // PMREM is shared (SharedEnv) — DO NOT dispose; other mounts need it.
    scene.traverse((obj) => {
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      if (obj.material) {
        const arr = Array.isArray(obj.material) ? obj.material : [obj.material];
        arr.forEach((m) => m && m.dispose && m.dispose());
      }
    });
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  }

  return { destroy };
}

// ---- Register --------------------------------------------------------------
const MX60 = window.MX60 = window.MX60 || {};
MX60.CarcamoDetail = { mount };
if (MX60.EquipmentDetail && typeof MX60.EquipmentDetail.registerRenderer === 'function') {
  MX60.EquipmentDetail.registerRenderer('carcamo', mount);
  // Match UpDetail's hack — modules are deferred so the initial Router
  // dispatch may have rendered the placeholder. Force a re-dispatch.
  if (location.hash && location.hash.indexOf('#detail/') === 0 &&
      MX60.Router && typeof MX60.Router.navigate === 'function') {
    MX60.Router.navigate(location.hash);
  }
}
