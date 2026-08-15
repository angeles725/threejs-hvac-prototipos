// Dashboard renderer — pure DOM updates from the model object.
//
// THE ONE RULE: this file never calls toFixed(), never compares a value against a threshold,
// never formats a number. Every string it puts in the DOM comes from model.mjs. The model
// is the contract; this file is only the paintbrush.

import { renderSparkline } from './charts.mjs';

// ── Shape glyphs (shape is always rendered alongside colour) ─────────────────
const GLYPH = { dot: '●', triangle: '▲', 'circle-filled': '⬤' };
function glyph(shape) { return GLYPH[shape] ?? '●'; }

function sevClass(sev) {
  if (sev === 'alarm') return 'sev-alarm';
  if (sev === 'warning') return 'sev-warning';
  if (sev === 'normal') return 'sev-normal';
  return '';
}

// ── Delta badge tracking ─────────────────────────────────────────────────────
// Stores the previous rendered value per tile id so we can show a badge when it changes.
const _prev = {};

// ── KPI band ─────────────────────────────────────────────────────────────────
/**
 * @param {Array}  tiles   model.tiles[]
 * @param {object} status  model.status — { id, color, shape, label }
 */
export function renderKpiBand(tiles, status) {
  const band = document.getElementById('kpi-band');
  if (!band) return;

  // Bootstrap tile elements once
  const needed = tiles.length + 1; // +1 for status chip
  if (band.children.length !== needed) {
    band.innerHTML = '';
    for (let i = 0; i < tiles.length; i++) {
      const d = document.createElement('div');
      d.className = 'kpi-tile';
      band.appendChild(d);
    }
    const st = document.createElement('div');
    st.className = 'kpi-tile';
    st.id = 'kpi-status-tile';
    band.appendChild(st);
  }

  // Render each metric tile
  tiles.forEach((t, i) => {
    const el = band.children[i];
    if (!el) return;
    el.className = 'kpi-tile ' + sevClass(t.severity);

    // Delta badge — compare to previous rendered value
    let badge = '';
    const prev = _prev[t.id];
    if (prev !== undefined && prev !== t.value) {
      const pn = parseFloat(prev);
      const cn = parseFloat(t.value);
      if (Number.isFinite(pn) && Number.isFinite(cn)) {
        const diff = cn - pn;
        if (Math.abs(diff) >= 0.1) {
          const cls = diff > 0 ? 'pos' : 'neg';
          const sign = diff > 0 ? '+' : '';
          badge = `<span class="kpi-badge ${cls}" role="status" aria-live="polite">${sign}${diff.toFixed(1)}</span>`;
        }
      }
    }
    _prev[t.id] = t.value;

    el.innerHTML =
      `<span class="kpi-label">${t.label}</span>
       <div class="kpi-value-row">
         <span class="kpi-value">${t.value}</span>
         <span class="kpi-unit">${t.unit}</span>
         ${badge}
       </div>`;
  });

  // Render status chip (7th tile)
  const stEl = document.getElementById('kpi-status-tile');
  if (stEl && status) {
    stEl.className = 'kpi-tile ' + sevClass(status.id);
    stEl.innerHTML =
      `<span class="kpi-label">Estado planta</span>
       <div class="status-chip">
         <span class="status-shape" style="color:${status.color}">${glyph(status.shape)}</span>
         <span class="status-label" style="color:${status.color}">${status.label}</span>
       </div>`;
  }
}

// ── Sidebar system panels ─────────────────────────────────────────────────────
/**
 * @param {Array}  panels  model.panels[]
 * @param {object} series  model.series
 * @param {Array}  alarms  model.alarms[]
 */
export function renderPanels(panels, series, alarms) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Bootstrap panel elements once
  if (sidebar.children.length !== panels.length) {
    sidebar.innerHTML = '';
    for (const p of panels) {
      const div = document.createElement('div');
      div.className = 'sys-panel';
      div.id = `panel-${p.id}`;
      sidebar.appendChild(div);
    }
  }

  panels.forEach((p) => {
    const panelEl = document.getElementById(`panel-${p.id}`);
    if (!panelEl) return;

    // Derive system status from alarms (data lookup, no threshold math)
    const sysAlarms = alarms.filter((a) => a.system === p.id);
    const worst = sysAlarms.some((a) => a.severity === 'alarm') ? 'alarm'
      : sysAlarms.some((a) => a.severity === 'warning') ? 'warning' : 'normal';
    const statusLabel = worst === 'alarm' ? 'Alarma' : worst === 'warning' ? 'Aviso' : 'OK';
    const statusColor = worst === 'alarm' ? 'var(--alarm)' : worst === 'warning' ? 'var(--warn)' : 'var(--ok)';
    const statusGlyph = worst === 'alarm' ? '⬤' : worst === 'warning' ? '▲' : '●';

    const rowsHtml = p.rows.map((r) => `
      <div class="sys-row">
        <span class="sys-row-label">
          <span class="kind-dot ${r.kind}" title="${r.kind}"></span>
          <span class="sys-row-label-text">${r.label}</span>
        </span>
        <span class="sys-row-value">${r.value}<span class="sys-row-unit">${r.unit}</span></span>
      </div>`).join('');

    panelEl.innerHTML =
      `<div class="sys-panel-hdr">
         <span class="sys-panel-name" style="color:${p.color}">${p.label}</span>
         <span class="sys-panel-status" style="color:${statusColor}">${statusGlyph} ${statusLabel}</span>
       </div>
       <div class="sys-panel-rows">${rowsHtml}</div>
       <div class="sys-sparkline" id="spark-${p.id}"></div>`;

    // Linked 3D highlight — fire system-hover so main.js can illuminate matching meshes.
    panelEl.addEventListener('mouseenter', () => {
      document.dispatchEvent(new CustomEvent('system-hover', { detail: { system: p.id, on: true } }));
    });
    panelEl.addEventListener('mouseleave', () => {
      document.dispatchEvent(new CustomEvent('system-hover', { detail: { system: p.id, on: false } }));
    });

    // Sparkline — pressure panel gets band hairlines
    const sparkEl = document.getElementById(`spark-${p.id}`);
    if (sparkEl && series) {
      const sparkData =
        p.id === 'hvac' ? series.hvacKw :
        p.id === 'lighting' ? series.lightingKw :
        series.pressurePsi;
      const sparkOpts = p.id === 'air' ? { bandLo: 115, bandHi: 120 } : {};
      if (sparkData && sparkData.length > 1) {
        renderSparkline(sparkData, p.color, sparkEl, sparkOpts);
      }
    }
  });
}

// ── Alarm list ────────────────────────────────────────────────────────────────
/** @param {Array} alarms model.alarms[] */
export function renderAlarms(alarms) {
  const el = document.getElementById('alarms-wrap');
  if (!el) return;
  if (!alarms.length) {
    el.innerHTML = '<div class="no-alarms">Sin alarmas activas ●</div>';
    return;
  }
  el.innerHTML = alarms.map((a) => `
    <div class="alarm-row">
      <span class="alarm-shape" style="color:${a.color}">${glyph(a.shape)}</span>
      <div>
        <div class="alarm-title">${a.id}</div>
        <div class="alarm-detail">${a.severity}${a.system ? ` · ${a.system}` : ''}</div>
      </div>
    </div>`).join('');
}

// ── Main render call ──────────────────────────────────────────────────────────
/**
 * Full dashboard render from one model snapshot.
 * Call after every sim tick and on every control change.
 * @param {object} model  output of deriveDashboardModel()
 */
export function renderDashboard(model) {
  renderKpiBand(model.tiles, model.status);
  renderPanels(model.panels, model.series, model.alarms);
  renderAlarms(model.alarms);
}
