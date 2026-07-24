/**
 * UpDetail.js — MX60 namespace (ES module — uses the importmap declared in index.html)
 *
 * Detail renderer for type='up' (Unidad Paquete). Three.js cut-away view of
 * the rooftop unit, ported from trane-rtu-realistic-v10.html. State is
 * derived from equipment.summary.{fanOn, compressor1On, compressor2On} and
 * auto-updated via EquipmentData polling listener.
 *
 * Public API (registered with EquipmentDetail):
 *   MX60.UpDetail.mount(container, equip) → { destroy }
 */
import * as THREE          from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { getEnvTexture }   from './SharedEnv.js';

const MX60 = window.MX60 = window.MX60 || {};

// =============================================================================
// Helpers
// =============================================================================

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
function statusLabel(equip) {
  const s = (window.MX60 && MX60.StatusResolver)
    ? MX60.StatusResolver.effectiveStatus(equip)
    : (equip && equip.status) || '';
  if (s === 'alarm')   return 'Alarma';
  if (s === 'cooling') return 'Prendido';
  if (s === 'standby') return 'En espera';
  if (s === 'offline') return 'Offline';
  return 'En línea';
}
function deriveStateFromEquip(equip) {
  const s = (equip && equip.summary) || {};
  const status = equip ? equip.status : '';
  if (status === 'offline') return { fan: 'standby', c1: 'standby', c2: 'standby' };

  // Base state from on/off readings
  let state;
  if (status === 'alarm') {
    state = {
      fan: s.fanOn         ? 'alarm' : 'standby',
      c1:  s.compressor1On ? 'alarm' : 'standby',
      c2:  s.compressor2On ? 'alarm' : 'standby'
    };
  } else {
    state = {
      fan: s.fanOn         ? 'on' : 'standby',
      c1:  s.compressor1On ? 'on' : 'standby',
      c2:  s.compressor2On ? 'on' : 'standby'
    };
  }

  // Alarm latches override the base state (matches the safety-interlock model
  // — when an alarm is sticky, the affected component shows red regardless of
  // the live on/off reading). Sobrecarga FAN cascades to ALL three.
  const aStore = (typeof window !== 'undefined') && window.MX60 && window.MX60.AlarmLatchStore;
  if (aStore && equip && equip.id) {
    if (aStore.isLatched(equip.id, 'sobrecargaFan')) {
      return { fan: 'alarm', c1: 'alarm', c2: 'alarm' };
    }
    const s1Keys = ['sobrecargaCompresor1', 'sobrecargaAbanicos1', 'antifrezzeSistema1'];
    const s2Keys = ['sobrecargaCompresor2', 'sobrecargaAbanicos2', 'antifrezzeSistema2'];
    if (s1Keys.some(function (k) { return aStore.isLatched(equip.id, k); })) state.c1 = 'alarm';
    if (s2Keys.some(function (k) { return aStore.isLatched(equip.id, k); })) state.c2 = 'alarm';
  }
  return state;
}

// =============================================================================
// Side panel — config + helpers
// =============================================================================

// Two-tier KPI layout: `primary` row at top (ambient + supply/return/outside
// + humidity = 5 cards, the readings that matter at a glance for any operator)
// and `secondary` row below (suction temps + per-stage amperages = 6 cards,
// the diagnostic readings a technician drills into). Color families: cyan for
// compressors, violet for fans, teal for suction. Within each family, S1 is
// the brighter shade and S2 the deeper one — so a glance separates "tipo"
// (compresor vs abanico vs succión) from "stage" (S1 vs S2).
const READINGS = [
  { tier: 'primary',   key: 'tempZona',      label: 'Temp. Zona',       mobileLabel: 'Zona',     unit: '°C',  digits: 1, color: '#22d3ee' },
  { tier: 'primary',   key: 'tempAbasto',    label: 'Temp. Abasto',     mobileLabel: 'Abasto',   unit: '°C',  digits: 1, color: '#3b82f6' },
  { tier: 'primary',   key: 'tempRetorno',   label: 'Temp. Retorno',    mobileLabel: 'Retorno',  unit: '°C',  digits: 1, color: '#ef4444' },
  { tier: 'primary',   key: 'tempExterior',  label: 'Temp. Exterior',   mobileLabel: 'Exterior', unit: '°C',  digits: 1, color: '#f59e0b' },
  { tier: 'primary',   key: 'humedadZona',   label: 'Humedad Zona',     mobileLabel: 'Humedad',  unit: '%RH', digits: 0, color: '#a78bfa' },
  { tier: 'secondary', key: 'tempSuccion1',  label: 'Temp Succión S1',  mobileLabel: 'Succ S1',  unit: '°C',  digits: 1, color: '#14b8a6' },
  { tier: 'secondary', key: 'tempSuccion2',  label: 'Temp Succión S2',  mobileLabel: 'Succ S2',  unit: '°C',  digits: 1, color: '#5eead4' },
  { tier: 'secondary', key: 'ampCompresor1', label: 'Amp Compresor S1', mobileLabel: 'Comp S1',  unit: 'A',   digits: 1, color: '#00f0ff' },
  { tier: 'secondary', key: 'ampCompresor2', label: 'Amp Compresor S2', mobileLabel: 'Comp S2',  unit: 'A',   digits: 1, color: '#06b6d4' },
  { tier: 'secondary', key: 'ampAbanicos1',  label: 'Amp Abanico S1',   mobileLabel: 'Aban S1',  unit: 'A',   digits: 1, color: '#c084fc' },
  { tier: 'secondary', key: 'ampAbanicos2',  label: 'Amp Abanico S2',   mobileLabel: 'Aban S2',  unit: 'A',   digits: 1, color: '#a855f7' },
  { tier: 'secondary', key: 'ampFan',        label: 'Amp FAN',          mobileLabel: 'FAN',      unit: 'A',   digits: 1, color: '#fb923c' }
];
function _readKpi(r, s) { return s[r.key]; }

// Protection thresholds — drive the UMBRALES collapsible section in
// Control de Sistemas. Direction: 'over' means lectura > umbral triggers
// degradation (sobrecarga). 'under' means lectura < umbral (antifrezze).
const UP_THRESHOLDS = [
  { key: 'sobrecargaFan',         label: 'Sobrecarga FAN',          readingKey: 'ampFan',         unit: 'A',  digits: 1, direction: 'over'  },
  { key: 'sobrecargaCompresor1',  label: 'Sobrecarga Compresor S1', readingKey: 'ampCompresor1', unit: 'A',  digits: 1, direction: 'over'  },
  { key: 'sobrecargaAbanicos1',   label: 'Sobrecarga Abanicos S1',  readingKey: 'ampAbanicos1',  unit: 'A',  digits: 1, direction: 'over'  },
  { key: 'sobrecargaCompresor2',  label: 'Sobrecarga Compresor S2', readingKey: 'ampCompresor2', unit: 'A',  digits: 1, direction: 'over'  },
  { key: 'sobrecargaAbanicos2',   label: 'Sobrecarga Abanicos S2',  readingKey: 'ampAbanicos2',  unit: 'A',  digits: 1, direction: 'over'  },
  { key: 'antifrezzeSistema1',    label: 'Antifrezze Sistema 1',    readingKey: 'tempSuccion1',  unit: '°C', digits: 1, direction: 'under' },
  { key: 'antifrezzeSistema2',    label: 'Antifrezze Sistema 2',    readingKey: 'tempSuccion2',  unit: '°C', digits: 1, direction: 'under' }
];

// ⚠️ MOCK INTERLOCK — When latched, the affected devices are forced OFF and
// the MANUAL toggle refuses to enable them until reset. In production the
// Niagara station enforces this via BAlarmExt + BPriorityArray; the frontend
// only reads/displays the resulting state.
const ALARM_LOCKDOWN = {
  sobrecargaCompresor1: ['c1'],
  sobrecargaCompresor2: ['c2'],
  sobrecargaAbanicos1:  ['c1'],
  sobrecargaAbanicos2:  ['c2'],
  antifrezzeSistema1:   ['c1'],
  antifrezzeSistema2:   ['c2'],
  sobrecargaFan:        ['fan', 'c1', 'c2']  // FAN trip = total shutdown
};

const SETPOINT_MIN = 16;
const SETPOINT_MAX = 30;
// Integer °C only — no decimal point, sign, or letters allowed by input mask.
const SETPOINT_RE  = /^\d*$/;

function fmtNum(v, digits) {
  if (v == null || v === '' || isNaN(v)) return '—';
  return Number(v).toFixed(digits);
}
function fmtSetpoint(v) {
  if (v == null || v === '' || isNaN(v)) return '';
  return String(Math.round(Number(v)));
}
function clampSetpoint(v) {
  if (v < SETPOINT_MIN) return SETPOINT_MIN;
  if (v > SETPOINT_MAX) return SETPOINT_MAX;
  return Math.round(v);
}

// =============================================================================
// Analytics — 3 temperature cards (gauge + bigvalue + status) + trend cards
// con range selector (1h/8h/24h/7d), patrón visual del casino.
// =============================================================================

// Comfort thresholds (casino COMFORT object adapted to our slots)
const COMFORT = {
  tempAbasto:  { min: 14, max: 22 },
  tempRetorno: { min: 20, max: 28 },
  tempZona:    { min: 20, max: 24 }
};

// Min/max ranges for the SVG arc gauges
const TEMP_GAUGES = [
  { key: 'tempAbasto',  label: 'Abasto',            min: 10, max: 30, narrative: 'comfortRange' },
  { key: 'tempRetorno', label: 'Retorno',           min: 15, max: 35, narrative: 'deltaAbasto' },
  { key: 'tempZona',    label: 'Temperatura Zona',  min: 15, max: 32, narrative: 'setpointDiff' }
];

// History range vocabulary lives in the shared module so UpDetail, CarcamoDetail
// and DataloggerDetail all consume the same single source of truth (design
// Decision 1, scope expanded post-WU1 audit). The shared script must load
// BEFORE this module — index.html guarantees the order.
const RANGES           = MX60.HistoryVocabulary.RANGES;
const RANGE_TO_BACKEND = MX60.HistoryVocabulary.RANGE_TO_BACKEND;

const DEFAULT_RANGE = '1h';

function tempColor(c) {
  if (c == null || isNaN(c)) return '#94a3b8';
  if (c < 16)  return '#3b82f6';
  if (c < 20)  return '#22d3ee';
  if (c <= 24) return '#22c55e';
  if (c <= 28) return '#f59e0b';
  return '#ef4444';
}

function _arcGaugeSvg(value, min, max, unit, color, size) {
  size = size || 80;
  const v = (value == null || isNaN(value)) ? min : Math.max(min, Math.min(max, value));
  const pct = ((v - min) / (max - min)) * 100;
  const r  = (size - 12) / 2;
  const cx = size / 2, cy = size / 2;
  const arcLen = Math.PI * r * 1.5;
  const dashVal = (pct / 100) * arcLen;
  const total = 2 * Math.PI * r;
  const valStr = (value == null || isNaN(value)) ? '—' : value.toFixed(unit === '%' ? 0 : 1);
  return '' +
    '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6" ' +
        'stroke-dasharray="' + arcLen + ' ' + (total - arcLen) + '" stroke-dashoffset="' + (-arcLen * 0.165) + '" stroke-linecap="round" ' +
        'transform="rotate(135 ' + cx + ' ' + cy + ')"></circle>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" ' +
        'stroke-dasharray="' + dashVal + ' ' + (total - dashVal) + '" stroke-dashoffset="' + (-arcLen * 0.165) + '" stroke-linecap="round" ' +
        'transform="rotate(135 ' + cx + ' ' + cy + ')" style="transition: stroke-dasharray 0.6s ease, stroke 0.6s ease;"></circle>' +
    '</svg>' +
    '<div class="up-gauge-text">' +
      '<span style="color:var(--text-primary)">' + escHtml(valStr) + '</span>' +
      '<small>' + escHtml(unit) + '</small>' +
    '</div>';
}

// Trend slope of the last ~6 minutes of a numeric series. Returns °C/min-ish:
// average of the 3 newest samples minus average of the 3 prior. Threshold of
// 0.2 °C separates "estable" from "subiendo/bajando" (casino convention).
function _computeTrend(history, key) {
  if (!history || history.length < 6) return 0;
  const tail = history.slice(history.length - 6);
  const vals = [];
  for (let i = 0; i < tail.length; i++) {
    const v = tail[i][key];
    if (v == null || isNaN(v)) return 0;
    vals.push(v);
  }
  const newer = (vals[3] + vals[4] + vals[5]) / 3;
  const older = (vals[0] + vals[1] + vals[2]) / 3;
  return newer - older;
}
function _trendLabel(slope) {
  if (Math.abs(slope) < 0.2) return 'estable';
  return slope > 0 ? 'subiendo' : 'bajando';
}
function _trendArrow(slope) {
  if (Math.abs(slope) < 0.2) return '→'; // →
  return slope > 0 ? '↑' : '↓';     // ↑ ↓
}
function _trendArrowColor(slope) {
  if (Math.abs(slope) < 0.2) return '#64748b';
  return slope > 0 ? '#ef4444' : '#3b82f6';
}

function _statusForGauge(g, equip, trend) {
  const s = (equip && equip.summary) || {};
  const v = s[g.key];
  if (v == null || isNaN(v)) return { tone: 'muted', text: 'Sin lectura' };
  if (g.narrative === 'comfortRange') {
    const c = COMFORT[g.key];
    if (v < c.min) return { tone: 'low',  text: 'Bajo del rango' };
    if (v > c.max) return { tone: 'high', text: 'Sobre el rango' };
    return                  { tone: 'ok',   text: 'Dentro del rango' };
  }
  if (g.narrative === 'deltaAbasto') {
    const ab = s.tempAbasto;
    if (ab == null || isNaN(ab)) return { tone: 'muted', text: '—' };
    const d = v - ab;
    if (d < 1) return { tone: 'low',  text: 'ΔT ' + d.toFixed(1) + '° (bajo)' };
    if (d > 6) return { tone: 'high', text: 'ΔT ' + d.toFixed(1) + '° (alto)' };
    return            { tone: 'ok',   text: 'ΔT ' + d.toFixed(1) + '° sobre abasto' };
  }
  if (g.narrative === 'setpointDiff') {
    const sp = (s.effectiveSetpoint != null && !isNaN(s.effectiveSetpoint)) ? s.effectiveSetpoint : s.setpoint;
    if (sp == null || isNaN(sp)) return { tone: 'muted', text: '—' };
    const diff = v - sp;
    const trendSuffix = (trend != null) ? ' · ' + _trendLabel(trend) : '';
    if (Math.abs(diff) < 0.4) return { tone: 'ok',   text: 'En objetivo' + trendSuffix };
    if (diff > 0)            return { tone: 'high', text: diff.toFixed(1) + '° sobre objetivo' + trendSuffix };
    return                          { tone: 'low',  text: Math.abs(diff).toFixed(1) + '° bajo objetivo' + trendSuffix };
  }
  return { tone: 'muted', text: '' };
}

function _temperatureCardHtml(g, equip, trend) {
  const s = (equip && equip.summary) || {};
  const v = s[g.key];
  const color = tempColor(v);
  const st = _statusForGauge(g, equip, trend);
  // Casino-style trend arrow: only on setpointDiff (Zona). Inline so the
  // arrow can be re-rendered by updateTempCard without a full innerHTML swap.
  const showArrow = (g.narrative === 'setpointDiff' && trend != null);
  const arrowHtml = showArrow
    ? '<span data-trend-arrow style="font-size:18px;font-weight:700;color:' +
        _trendArrowColor(trend) + ';margin-left:6px;transition:color 0.5s;">' +
        _trendArrow(trend) +
      '</span>'
    : '';
  return '' +
    '<div class="up-temp-card" data-temp-card="' + escAttr(g.key) + '">' +
      '<div class="up-temp-label">' + escHtml(g.label) + '</div>' +
      '<div class="up-temp-content">' +
        '<div class="up-temp-gauge" data-temp-gauge>' + _arcGaugeSvg(v, g.min, g.max, '°C', color, 80) + '</div>' +
        '<div class="up-temp-info">' +
          '<div class="up-temp-bigvalue">' +
            '<span data-prop-big="' + escAttr(g.key) + '" style="color:' + color + '">' +
              ((v == null || isNaN(v)) ? '—' : Number(v).toFixed(1)) +
            '</span>' +
            '<small>°C</small>' +
            arrowHtml +
          '</div>' +
          '<div class="up-temp-status tone-' + st.tone + '" data-temp-status>' +
            '<span class="up-temp-status-dot"></span>' +
            '<span data-temp-status-text>' + escHtml(st.text) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function _temperaturesSectionHtml(equip, trendByKey) {
  trendByKey = trendByKey || {};
  let cards = '';
  for (let i = 0; i < TEMP_GAUGES.length; i++) {
    const g = TEMP_GAUGES[i];
    cards += _temperatureCardHtml(g, equip, trendByKey[g.key]);
  }
  return '' +
    '<section class="up-temperatures-section">' +
      '<div class="up-section-header">Temperaturas</div>' +
      '<div class="up-temperatures-row">' + cards + '</div>' +
    '</section>';
}

function _rangeTabsHtml(prefix) {
  // Renders one button per entry of MX60.HistoryVocabulary.RANGES. Post-WU1
  // RANGES has 8 entries (the 4 originals 1h/8h/24h/7d plus today/yesterday/
  // 30d/mtd from the shared module). The loop is shape-agnostic — adding or
  // removing a range only requires editing HistoryVocabulary.js. CSS
  // .up-range-tabs uses flex-wrap so 8 buttons fit gracefully on narrow
  // viewports; if the visual fit becomes a problem (WU7.M9 checklist), the
  // escalation path is a dropdown — explicitly deferred to a future SDD per
  // design Decision 5.
  let html = '<div class="up-range-tabs" data-trend="' + escAttr(prefix) + '">';
  for (let i = 0; i < RANGES.length; i++) {
    const r = RANGES[i];
    const active = r.id === DEFAULT_RANGE ? ' is-active' : '';
    html += '<button type="button" class="up-range-tab' + active + '" data-range="' + escAttr(r.id) + '">' + escHtml(r.label) + '</button>';
  }
  html += '</div>';
  return html;
}

function _baselineBtnHtml(id) {
  return '' +
    '<button type="button" class="up-baseline-btn" data-baseline="' + escAttr(id) + '" title="Mostrar baseline: ayer">' +
      '<svg width="14" height="6" viewBox="0 0 14 6" fill="none" aria-hidden="true">' +
        '<line x1="1" y1="3" x2="13" y2="3" stroke="rgba(255,255,255,0.4)" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"></line>' +
      '</svg>' +
      'Ayer' +
    '</button>';
}

function _trendCardHtml(id, title) {
  return '' +
    '<div class="up-trend-card" data-trend-card="' + escAttr(id) + '">' +
      '<div class="up-trend-header">' +
        '<span class="up-trend-title">' + escHtml(title) + '</span>' +
        '<div class="up-trend-controls">' +
          _baselineBtnHtml(id) +
          _rangeTabsHtml(id) +
        '</div>' +
      '</div>' +
      '<div class="up-trend-legend" data-legend-host="' + escAttr(id) + '"></div>' +
      '<div class="up-trend-canvas-wrap"><canvas data-trend-canvas="' + escAttr(id) + '"></canvas></div>' +
    '</div>';
}

function _trendsSectionHtml() {
  return '' +
    '<section class="up-trends-section">' +
      '<div class="up-section-header">Tendencias de Temperatura</div>' +
      '<div class="up-trends-grid">' +
        _trendCardHtml('abastoRetorno', 'Abasto / Retorno') +
        _trendCardHtml('zona',          'Zona') +
      '</div>' +
    '</section>' +
    '<section class="up-trends-section">' +
      '<div class="up-section-header">Tendencias de Succión</div>' +
      '<div class="up-trends-grid">' +
        _trendCardHtml('tempSuccion', 'Temperatura Succión') +
        _trendCardHtml('delta',           'Retorno − Abasto') +
      '</div>' +
    '</section>' +
    '<section class="up-trends-section">' +
      '<div class="up-section-header">Tendencias Eléctricas</div>' +
      '<div class="up-trends-grid">' +
        _trendCardHtml('amperajeComp', 'Amperaje Compresores') +
        _trendCardHtml('amperajeFans', 'Amperaje Abanicos') +
        _trendCardHtml('amperajeFan',  'Amperaje FAN') +
      '</div>' +
    '</section>';
}

function _analyticsHtml(equip, trendByKey) {
  return _temperaturesSectionHtml(equip, trendByKey) + _trendsSectionHtml();
}

// Maximum in-memory history entries — fallback used when the active range
// cannot be resolved. P5 history note: the historical 24h × 60 = 1440 cap
// was a fixed compromise (1pt/min for 24 hours). After WU2 the active range
// is observable via _currentHistoryRange, so _maxHistoryEntries() below
// derives the cap dynamically. The constant survives as the safe fallback
// when RANGES.find() returns undefined (transient boot states, etc).
//
// P5 fix doc: cap reduced from 7d (10080 entries × ~80 bytes = ~854 KB/UP)
// to 24h (1440 entries = ~115 KB/UP). The 7d range tab fetches fresh data
// from the history backend on demand instead of accumulating in client
// memory. Under REST fallback (5s poll), an 8-hour shift accumulates 5760
// entries — over the cap, so the splice(0, 100) trim amortizes the O(N)
// cost (see L3592).
const HISTORY_MINUTES_FALLBACK = 24 * 60;

/**
 * _maxHistoryEntries(currentRange) → number
 *
 * Returns the cap on fullHistory for the given active range. The cap is
 * Max(HISTORY_MINUTES_FALLBACK, floor(activeRange.points * 1.5)) — the
 * fallback dominates for small targetPoints (1h..30d all clamp at 1440)
 * and only takes effect if a future RANGES entry declares > ~960 points.
 * Defensive: if currentRange is undefined or the lookup misses, returns
 * the fallback.
 *
 * The currentRange argument is supplied by the caller (the mount-closure
 * variable `_currentHistoryRange`) because this helper lives at module
 * scope while the state lives inside the mount closure — passing the value
 * keeps the function pure and avoids a closure-scope reach.
 *
 * Cost: O(8) array find + constant math, called once per live-sample
 * append (~2× per second under RAF 500ms). Negligible vs DOM and Chart.js
 * work in the same callback.
 */
function _maxHistoryEntries(currentRange) {
  const r = RANGES.find(function(x) { return x.id === currentRange; });
  if (!r) return HISTORY_MINUTES_FALLBACK;
  return Math.max(HISTORY_MINUTES_FALLBACK, Math.floor(r.points * 1.5));
}

// =============================================================================
// MX60.HistoryIndex — cached /api/equipment-histories per session
//
// Fetches the map {equipId: {slotName: historyId, ...}} ONCE per session and
// drains a waiter queue. Subsequent calls to load(cb) are synchronous.
//
// API:
//   MX60.HistoryIndex.load(cb)    — cb({equipId: {slot: histId, ...}})
//   MX60.HistoryIndex.get(equipId) — returns cached map or {} if unknown
// =============================================================================
MX60.HistoryIndex = (function() {
  let _cache   = null;
  let _loading = false;
  let _waiters = [];

  function load(cb) {
    if (_cache !== null) { if (typeof cb === 'function') cb(_cache); return; }
    if (typeof cb === 'function') _waiters.push(cb);
    if (_loading) return;
    _loading = true;

    const cfg = window.MX60 && MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function'
      ? MX60.ConfigManager.getConfig()
      : null;
    const url = (cfg && cfg.api && cfg.api.equipmentHistories)
      ? cfg.api.equipmentHistories
      : '/mx60/api/equipment-histories';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
      _loading = false;
      try {
        _cache = (xhr.status === 200) ? JSON.parse(xhr.responseText) : {};
      } catch (e) {
        _cache = {};
      }
      const ws = _waiters.slice();
      _waiters = [];
      for (let i = 0; i < ws.length; i++) {
        try { ws[i](_cache); } catch (e) {}
      }
    };
    xhr.onerror = function() {
      _loading = false;
      _cache = {};
      const ws = _waiters.slice();
      _waiters = [];
      for (let i = 0; i < ws.length; i++) { try { ws[i]({}); } catch (e) {} }
    };
    xhr.send();
  }

  function get(equipId) {
    return (_cache && _cache[equipId]) ? _cache[equipId] : {};
  }

  return { load: load, get: get };
})();

// =============================================================================
// MX60.HistoryListCache — fallback fetch of ALL station histories
//
// SanLuis-style discovery: when ChiHistoryHelper.detectEquipmentHistories
// fails to bind a slot to a historyId via BLink-resolution + name-matching,
// the frontend falls back to /api/historyList (which enumerates EVERY
// BHistoryExt registered in the station database) and matches by name
// containing the slot name. This means: "drop a NumericIntervalHistoryExt
// anywhere in the station, link it to a slot, it shows up — no need to
// modify UP_HISTORY_PROPERTIES or any backend list."
//
// Cached for the session (same lifetime as HistoryIndex above).
// =============================================================================
MX60.HistoryListCache = (function() {
  let _cache = null;
  let _loading = false;
  let _waiters = [];

  function load(cb) {
    if (_cache !== null) { if (typeof cb === 'function') cb(_cache); return; }
    if (typeof cb === 'function') _waiters.push(cb);
    if (_loading) return;
    _loading = true;

    const cfg = window.MX60 && MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function'
      ? MX60.ConfigManager.getConfig()
      : null;
    const url = (cfg && cfg.api && cfg.api.historyList)
      ? cfg.api.historyList
      : '/mx60/api/historyList';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function() {
      _loading = false;
      try {
        const parsed = (xhr.status === 200) ? JSON.parse(xhr.responseText) : { histories: [] };
        _cache = Array.isArray(parsed.histories) ? parsed.histories : [];
      } catch (e) {
        _cache = [];
      }
      const ws = _waiters.slice();
      _waiters = [];
      for (let i = 0; i < ws.length; i++) {
        try { ws[i](_cache); } catch (e) {}
      }
    };
    xhr.onerror = function() {
      _loading = false;
      _cache = [];
      const ws = _waiters.slice();
      _waiters = [];
      for (let i = 0; i < ws.length; i++) { try { ws[i]([]); } catch (e) {} }
    };
    xhr.send();
  }

  function findByNameContaining(needle) {
    if (!_cache || !needle) return null;
    const ndl = String(needle).toLowerCase();
    for (let i = 0; i < _cache.length; i++) {
      const h = _cache[i];
      if (!h) continue;
      const name = (h.name || '').toLowerCase();
      const id   = (h.id   || '').toLowerCase();
      if (name.indexOf(ndl) !== -1 || id.indexOf(ndl) !== -1) {
        return h.id;
      }
    }
    return null;
  }

  return { load: load, findByNameContaining: findByNameContaining };
})();

// =============================================================================
// Real history loading — B5.6
// =============================================================================

/**
 * _fetchSlotHistory(histId, range) → Promise<Array<{t, value}>>
 * Fetches /api/historyData for a single history ID and range string.
 * Returns parsed.data (array of {t, value} rows) or [] on failure.
 */
function _fetchSlotHistory(histId, range) {
  return new Promise(function(resolve) {
    const cfg = MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function'
      ? MX60.ConfigManager.getConfig()
      : null;
    const base = (cfg && cfg.api && cfg.api.historyData)
      ? cfg.api.historyData
      : '/mx60/api/historyData';
    // Translate the frontend range id ('1h', 'today', '30d', ...) to the
    // canonical backend key ChiHistoryHelper.computeRange recognizes. A
    // missing entry falls back to 'lastHour' with a console.warn so future
    // vocabulary drift is loud, not silent (REQ-1 + spec scenario S-5).
    let backendKey = RANGE_TO_BACKEND[range];
    if (!backendKey) {
      console.warn('[UpDetail] unknown range id: ' + range);
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
        // CRITICAL FIX: ChiHistoryHelper backend returns each point as a
        // [timestamp, value] tuple (matching SanLuis convention). Frontend
        // _mergeSeriesByTimestamp expects {t, value} objects. Without this
        // transform, every chart renders empty because series[i].t is
        // undefined for tuple arrays — the bug was silent (no error, no log).
        // E-001: null-safety fix — pt[1] === null means sensor gap, not zero.
        // Chart.js renders a gap when value is undefined; null renders as 0
        // which distorts charts by connecting gap points to the baseline.
        const normalized = raw.map(function(pt) {
          if (Array.isArray(pt) && pt.length >= 2) {
            var val = (pt[1] !== null && pt[1] !== undefined) ? pt[1] : undefined;
            return { t: pt[0], value: val };
          }
          // Already {t, value} — normalize value field for null as well.
          if (pt && pt.t !== undefined) {
            return { t: pt.t, value: (pt.value !== null && pt.value !== undefined) ? pt.value : undefined };
          }
          return pt;
        }).filter(function(pt) { return pt && pt.t !== undefined; });
        resolve(normalized);
      } catch (e) { resolve([]); }
    };
    xhr.onerror  = function() { resolve([]); };
    xhr.ontimeout = function() { resolve([]); };
    xhr.timeout = 15000;
    xhr.send();
  });
}

/**
 * _mergeSeriesByTimestamp(results) → Array<row>
 *
 * results: [{slot: 'tempZona', series: [{t, value}, ...]}, ...]
 *
 * Produces a merged array where each row is:
 *   { t: <ms>, tempZona: value, tempAbasto: value, ... }
 *
 * Strategy: union all timestamps, sort ascending, for each timestamp find the
 * closest-in-time value per slot (within 5 minutes tolerance). This matches the
 * REST /api/historyData response format from ChiHistoryHelper.
 */
function _mergeSeriesByTimestamp(results) {
  if (!results || results.length === 0) return [];

  // Build union of all timestamps
  const tsSet = {};
  for (let r = 0; r < results.length; r++) {
    const series = results[r].series;
    for (let i = 0; i < series.length; i++) {
      if (series[i] && series[i].t != null) tsSet[series[i].t] = true;
    }
  }

  const timestamps = Object.keys(tsSet).map(Number).sort(function(a, b) { return a - b; });
  if (timestamps.length === 0) return [];

  // For each slot build a sorted index by timestamp for O(log N) lookup
  const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

  function _closestValue(series, ts) {
    if (!series || series.length === 0) return null;
    let lo = 0, hi = series.length - 1, best = null, bestDist = Infinity;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const pt = series[mid];
      const dist = Math.abs(pt.t - ts);
      if (dist < bestDist) { bestDist = dist; best = pt; }
      if (pt.t < ts) lo = mid + 1;
      else if (pt.t > ts) hi = mid - 1;
      else break;
    }
    return (bestDist <= TOLERANCE_MS && best) ? best.value : null;
  }

  const merged = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const row = { t: ts };
    for (let r = 0; r < results.length; r++) {
      row[results[r].slot] = _closestValue(results[r].series, ts);
    }
    merged.push(row);
  }
  return merged;
}

/**
 * _rangeToMs(rangeId) → number
 *
 * Converts a range string (1h/8h/24h/7d) to milliseconds. Used by buffer-mode
 * filtering when historyId is absent and data comes from LiveHistoryBuffer.
 */
function _rangeToMs(rangeId) {
  switch (rangeId) {
    case '1h':  return 1  * 3600000;
    case '8h':  return 8  * 3600000;
    case '24h': return 24 * 3600000;
    case '7d':  return 7  * 24 * 3600000;
    default:    return 24 * 3600000;
  }
}

/**
 * _loadRealHistory(equip, range) → Promise<{rows, missing, histMap, bufferOnly, bufferCount}>
 *
 * Hybrid mode (post-LiveHistoryBuffer patch):
 *
 * 1. Loads HistoryIndex (cached after first call).
 * 2. Gets histMap for equip.id — {slotName: historyId, ...}.
 * 3. Builds slot union: (slots with historyId) ∪ (slots in LiveHistoryBuffer).
 * 4. For each slot:
 *    a. historyId present → fetch /api/historyData (real persisted history)
 *    b. no historyId but buffer has data → filter buffer series by range
 *    c. neither → empty series
 * 5. Merges by timestamp and resolves.
 *
 * Extra fields on resolved object:
 *   bufferOnly  — true when ALL data comes from buffer (no backend historyIds found)
 *   bufferCount — sample count in buffer for this equip (used by placeholder logic)
 */
// Slots de UpDetail que se grafican — usados por el fallback frontend para
// intentar discovery contra /api/historyList cuando el backend no encontró
// el binding por BLink + name-match. Replica la flexibilidad de SanLuis.
const UP_CHART_SLOTS = [
  'tempZona', 'tempAbasto', 'tempRetorno', 'tempExterior',
  'tempSuccion1', 'tempSuccion2',
  'ampCompresor1', 'ampCompresor2', 'ampAbanicos1', 'ampAbanicos2', 'ampFan',
  'setpoint', 'humedadZona', 'deltaAbastoRetorno'
];

function _loadRealHistory(equip, range) {
  return new Promise(function(resolve) {
    MX60.HistoryIndex.load(function() {
      const histMap    = Object.assign({}, MX60.HistoryIndex.get(equip.id));
      const buf        = window.MX60 && window.MX60.LiveHistoryBuffer;
      const bufferCount = buf ? buf.getCount(equip.id) : 0;

      // Frontend fallback discovery: para cada slot del UP que no apareció
      // en histMap (binding backend falló o el slot no estaba en
      // UP_HISTORY_PROPERTIES hardcoded), buscar en la lista global de
      // histories del station. Si encuentra coincidencia por nombre, lo
      // agrega al histMap. Esto replica el approach de SanLuis donde
      // simplemente "tener" el HistoryExt en el station es suficiente.
      function _continueWithFallback() {
        const backendSlots = Object.keys(histMap);
        const bufferSlots  = buf ? buf.getSlots(equip.id) : [];

        // Union of slots from both sources (de-duplicated)
        const allSlotsSet = {};
        for (let i = 0; i < backendSlots.length; i++) allSlotsSet[backendSlots[i]] = true;
        for (let j = 0; j < bufferSlots.length;  j++) allSlotsSet[bufferSlots[j]]  = true;
        const allSlots = Object.keys(allSlotsSet);

        if (allSlots.length === 0) {
          // No backend config AND empty buffer — truly nothing to show
          resolve({ rows: [], missing: true, histMap: {}, bufferOnly: false, bufferCount: 0 });
          return;
        }
        _resolveSlots(allSlots, backendSlots);
      }

      // Determine which chart slots are still missing a histId
      const missingSlots = [];
      for (let i = 0; i < UP_CHART_SLOTS.length; i++) {
        if (!histMap[UP_CHART_SLOTS[i]]) missingSlots.push(UP_CHART_SLOTS[i]);
      }

      if (missingSlots.length === 0 || !MX60.HistoryListCache) {
        _continueWithFallback();
        return;
      }

      // Fetch global history list once per session, then match missing slots
      // against history names containing the slot name.
      MX60.HistoryListCache.load(function() {
        for (let i = 0; i < missingSlots.length; i++) {
          const slot = missingSlots[i];
          const hid = MX60.HistoryListCache.findByNameContaining(slot);
          if (hid) {
            histMap[slot] = hid;
            console.info('[UpDetail] history fallback resuelto:', slot, '→', hid);
          }
        }
        _continueWithFallback();
      });

      function _resolveSlots(allSlots, backendSlots) {
        const rangeMs  = _rangeToMs(range);
        const promises = allSlots.map(function(slotName) {
          if (histMap[slotName]) {
            // Backend path — real persisted history
            return _fetchSlotHistory(histMap[slotName], range).then(function(series) {
              return { slot: slotName, series: series };
            });
          }
          // Buffer path — in-memory live samples filtered by range
          const raw    = buf ? buf.getSeries(equip.id, slotName) : [];
          const series = buf ? buf.filterByRange(raw, rangeMs) : [];
          // Convert buffer format [{t, value}] → same shape _mergeSeriesByTimestamp expects
          return Promise.resolve({ slot: slotName, series: series });
        });

        Promise.all(promises).then(function(results) {
          const merged     = _mergeSeriesByTimestamp(results);
          // Fix: deltaAbastoRetorno es valor derivado, NO slot real con BHistoryExt.
          // Calculado post-merge para cada row con tempAbasto + tempRetorno.
          // Sin esto, el chart 'delta' queda vacio cuando se carga history persistido.
          for (let i = 0; i < merged.length; i++) {
            const r = merged[i];
            if (r.tempAbasto != null && r.tempRetorno != null) {
              r.deltaAbastoRetorno = Math.round((r.tempRetorno - r.tempAbasto) * 10) / 10;
            }
          }
          const bufferOnly = backendSlots.length === 0;
          resolve({
            rows:        merged,
            missing:     false,
            histMap:     histMap,
            bufferOnly:  bufferOnly,
            bufferCount: bufferCount
          });
        });
      }
    });
  });
}

// Format a timestamp as the casino does — short string per range
// (`HH:mm` for ≤24h, `dd/MM HH:mm` for 7d). Used as the chart label so
// Chart.js treats x as a category axis (no time scale needed).
function formatTimestamp(t, rangeId) {
  const d = (t instanceof Date) ? t : new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (rangeId === '7d') {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + mon + ' ' + hh + ':' + mm;
  }
  return hh + ':' + mm;
}

// Comfort band plugin — paints a translucent rectangle on the chart for the
// given y range. Same shape as casino's comfortBandPlugin.
const comfortBandPlugin = {
  id: 'comfortBand',
  beforeDatasetsDraw: function(chart, _args, opts) {
    if (!opts || !opts.bands) return;
    const ctx = chart.ctx;
    const area = chart.chartArea;
    const yScale = chart.scales.y;
    if (!yScale) return;
    opts.bands.forEach(function(band) {
      const yTop = yScale.getPixelForValue(band.max);
      const yBot = yScale.getPixelForValue(band.min);
      ctx.save();
      ctx.fillStyle = band.color;
      ctx.fillRect(area.left, yTop, area.right - area.left, yBot - yTop);
      if (band.label) {
        ctx.fillStyle = band.textColor || 'rgba(34,197,94,0.6)';
        ctx.font = "700 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(band.label, area.left + 8, yTop + 13);
      }
      ctx.restore();
    });
  }
};

// HTML legend plugin — renders the legend as DOM nodes inside a sibling
// `<div data-legend-host="<chart-id>">` instead of letting Chart.js wrap
// labels inline (which produces the orphan-on-second-line issue when 4
// items don't fit a narrow card). With CSS grid we force 2 columns and
// 2 rows when there are >2 items: live datasets up top, "ayer" baselines
// directly below their counterpart.
const htmlLegendPlugin = {
  id: 'htmlLegend',
  afterUpdate: function(chart, _args, opts) {
    if (!opts || !opts.containerId) return;
    const host = document.querySelector('[data-legend-host="' + opts.containerId + '"]');
    if (!host) return;
    const items = (chart.options.plugins.legend.labels.generateLabels || function() { return []; })(chart);
    // SDD perf v4 — diagnóstico DevTools: este afterUpdate consumía 6,376ms /
    // 41% del CPU porque rebuilda el DOM completo en cada chart.update() —
    // 7 charts × N polls = explosión de removeChild + generateLabels (que
    // internamente llama getComputedStyle, los 134 calls del monkey-patch).
    // Signature cache: solo rebuild cuando los labels REALMENTE cambiaron
    // (toggle hide/show o set rename). En steady state (data update normal),
    // los labels no cambian → 0 DOM mutations.
    const sig = items.map(function(i) {
      return (i.text || '') + ':' + (i.hidden ? '1' : '0') + ':' + (i.datasetIndex || 0);
    }).join('|');
    if (host.__legendSig === sig) return;
    host.__legendSig = sig;
    // Clear previous DOM
    while (host.firstChild) host.removeChild(host.firstChild);
    // Layout: 1 row when ≤2 items, 2 cols (rows derived from item count) otherwise.
    if (items.length > 2) {
      host.classList.add('is-grid');
      host.classList.remove('is-row');
    } else {
      host.classList.remove('is-grid');
      host.classList.add('is-row');
    }
    items.forEach(function(item) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'up-legend-item' + (item.hidden ? ' is-hidden' : '');
      el.setAttribute('data-dataset-index', String(item.datasetIndex));
      const dot = document.createElement('span');
      const isDashed = !!(item.lineDash && item.lineDash.length);
      dot.className = 'up-legend-dot' + (isDashed ? ' is-dashed' : '');
      const color = item.strokeStyle || item.fillStyle || '#94a3b8';
      if (isDashed) {
        dot.style.borderColor = color;
      } else {
        dot.style.backgroundColor = color;
        dot.style.boxShadow = '0 0 6px ' + color;
      }
      const label = document.createElement('span');
      label.className = 'up-legend-text';
      label.textContent = item.text;
      el.appendChild(dot);
      el.appendChild(label);
      el.addEventListener('click', function() {
        const i = item.datasetIndex;
        chart.setDatasetVisibility(i, !chart.isDatasetVisible(i));
        chart.update();
      }, false);
      host.appendChild(el);
    });
  }
};

/**
 * _computeRangeCutoff(r, now) → epoch ms cutoff
 *
 * For static ranges (RANGES with `hours`) the cutoff is the naive
 * `now - hours * 3600000`. For dynamic ranges (`dynamic: true` — today,
 * yesterday, mtd) the cutoff is computed from the clock so the window
 * tracks calendar boundaries instead of a sliding tail (design Decision 5).
 *
 *   today      → cutoff = inicio del día local de hoy
 *   yesterday  → cutoff = inicio del día local de ayer
 *                (the ceiling — end of yesterday — is handled by the upper
 *                 bound of the chart x-axis; defensive filter here uses
 *                 the cutoff only, like the other ranges)
 *   mtd        → cutoff = primer día del mes local a las 00:00
 *
 * Falls back to 24h tail if r is undefined (defensive — should never
 * happen because filterHistoryByRange already substitutes RANGES[2]).
 */
function _computeRangeCutoff(r, now) {
  if (!r) return now - 24 * 60 * 60 * 1000;
  if (r.dynamic !== true) return now - r.hours * 60 * 60 * 1000;
  const d = new Date(now);
  if (r.id === 'today') {
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (r.id === 'yesterday') {
    d.setHours(0, 0, 0, 0);
    return d.getTime() - 24 * 60 * 60 * 1000;
  }
  if (r.id === 'mtd') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  // Unknown dynamic id — defensive fall through to 24h.
  return now - 24 * 60 * 60 * 1000;
}

function filterHistoryByRange(history, rangeId) {
  const r = RANGES.find(function(x) { return x.id === rangeId; }) || RANGES[2];
  const cutoff = _computeRangeCutoff(r, Date.now());
  const out = [];
  // Downsample by stride based on target points
  const filtered = history.filter(function(p) { return p.t >= cutoff; });
  const stride = Math.max(1, Math.floor(filtered.length / r.points));
  for (let i = 0; i < filtered.length; i += stride) out.push(filtered[i]);
  // Always include the last point so the line ends at "now".
  if (filtered.length && out[out.length - 1] !== filtered[filtered.length - 1]) {
    out.push(filtered[filtered.length - 1]);
  }
  return out;
}

// For each point in `currentPoints`, return the value of `key` from the same
// time slot 24h earlier (binary-searched in fullHistory). Returns null when
// the baseline window falls outside the in-memory history.
function baselineParallel(currentPoints, history, key) {
  const dayMs = 24 * 60 * 60 * 1000;
  const result = new Array(currentPoints.length);
  if (!history || !history.length) {
    for (let i = 0; i < result.length; i++) result[i] = null;
    return result;
  }
  for (let i = 0; i < currentPoints.length; i++) {
    const target = currentPoints[i].t - dayMs;
    let lo = 0, hi = history.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (history[mid].t < target) lo = mid + 1;
      else hi = mid;
    }
    const candidate = history[lo];
    if (candidate && Math.abs(candidate.t - target) < 90 * 1000) {
      result[i] = candidate[key];
    } else {
      result[i] = null;
    }
  }
  return result;
}

function _cockpitHtml(equip) {
  const s = (equip && equip.summary) || {};
  const status = (equip && equip.status) || 'standby';
  const spEff = (s.effectiveSetpoint != null && !isNaN(s.effectiveSetpoint)) ? s.effectiveSetpoint : s.setpoint;
  const sp = fmtSetpoint(spEff);
  const spDisplay = (spEff != null && !isNaN(spEff)) ? Number(spEff).toFixed(1) : '—';
  // W3: input shows ONLY the real setpoint slot value. When 0/null, leave empty
  // so placeholder "Ingresá un valor" shows.
  // Backend no longer emits manualSetpoint; effectiveSetpoint = 0/null renders as em-dash.
  const inputVal = (s.setpoint != null && !isNaN(s.setpoint) && s.setpoint > 0)
    ? fmtSetpoint(Math.round(Number(s.setpoint))) : '';

  function _renderKpi(r) {
    const mobileLabelAttr = r.mobileLabel
      ? ' data-mobile-label="' + escAttr(r.mobileLabel) + '"'
      : '';
    return '' +
      '<div class="up-kpi" data-reading="' + escAttr(r.key) + '" style="--kpi-color:' + r.color + '">' +
        '<div class="up-kpi-label"' + mobileLabelAttr + '>' + escHtml(r.label) + '</div>' +
        '<div class="up-kpi-value">' +
          '<span data-prop="' + escAttr(r.key) + '">' + escHtml(fmtNum(_readKpi(r, s), r.digits)) + '</span>' +
          '<small>' + escHtml(r.unit) + '</small>' +
        '</div>' +
      '</div>';
  }
  // Two-row layout for desktop (5 primary + 6 secondary). Mobile uses
  // auto-fit so both rows reflow into a single uniform grid.
  let primaryHtml = '', secondaryHtml = '';
  for (let i = 0; i < READINGS.length; i++) {
    const r = READINGS[i];
    if (r.tier === 'secondary') secondaryHtml += _renderKpi(r);
    else                        primaryHtml   += _renderKpi(r);
  }
  const kpisHtml =
    '<div class="up-kpi-row up-kpi-row--primary">'   + primaryHtml   + '</div>' +
    '<div class="up-kpi-row up-kpi-row--secondary">' + secondaryHtml + '</div>';

  const ledFan = s.fanOn         ? 'on' : 'off';
  const ledC1  = s.compressor1On ? 'on' : 'off';
  const ledC2  = s.compressor2On ? 'on' : 'off';
  // Protections — protectorFase: green when OK (true), red when fault (false).
  // Switches: gris off (no fault), red on (fault triggered).
  const ledFase  = s.protectorFase === false ? 'alarm' : 'ok';
  const ledHi1   = s.switchAlta1 ? 'alarm' : 'off';
  const ledHi2   = s.switchAlta2 ? 'alarm' : 'off';
  const ledLo1   = s.switchBaja1 ? 'alarm' : 'off';
  const ledLo2   = s.switchBaja2 ? 'alarm' : 'off';


  // Casino-style cockpit: dense panels, single Control de Sistemas card on
  // the right, identity + setpoint + aire + protections on the left.
  const equipLabel = equip.label || equip.id;
  const plantaLabel = (equip.planta != null) ? ('Planta ' + equip.planta) : '';

  return '' +
    '<div class="up-cockpit">' +
      '<div class="up-cockpit__metrics">' + kpisHtml + '</div>' +
      '<aside class="up-cockpit__left">' +
        '<div class="up-panel up-identity-panel" data-prop="status-block">' +
          '<div class="up-identity-name">' + escHtml(equipLabel) + '</div>' +
          '<div class="up-identity-sub">' + escHtml(plantaLabel) + '</div>' +
          '<div class="up-identity-status status-' + escAttr(status) + '">' +
            '<span class="up-side-status-dot"></span>' +
            '<span data-prop="status-label">' + escHtml(statusLabel(equip)) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="up-panel up-setpoint-panel">' +
          '<div class="up-panel-title-mini">SETPOINT</div>' +
          '<div class="up-setpoint-display">' +
            '<span data-prop="setpoint-display">' + escHtml(spDisplay) + '</span>' +
            '<small>°C</small>' +
          '</div>' +
        '</div>' +
        '<div class="up-panel up-aire-panel">' +
          '<div class="up-panel-title-mini">AIRE</div>' +
          '<div class="up-aire-legend">' +
            '<div class="up-aire-row"><span class="up-aire-swatch up-aire-return"></span>Retorno</div>' +
            '<div class="up-aire-row"><span class="up-aire-swatch up-aire-supply"></span>Suministro</div>' +
          '</div>' +
        '</div>' +
        '<div class="up-panel up-protections-panel">' +
          '<div class="up-panel-title-mini">PROTECCIONES</div>' +
          '<div class="up-leds-protections">' +
            '<div class="up-led-row" data-led="fase">' +
              '<span class="up-led status-' + ledFase + '"></span>' +
              '<span class="up-led-label">PROT. FASE</span>' +
            '</div>' +
            '<div class="up-led-row" data-led="hi1">' +
              '<span class="up-led status-' + ledHi1 + '"></span>' +
              '<span class="up-led-label">ALTA 1</span>' +
            '</div>' +
            '<div class="up-led-row" data-led="hi2">' +
              '<span class="up-led status-' + ledHi2 + '"></span>' +
              '<span class="up-led-label">ALTA 2</span>' +
            '</div>' +
            '<div class="up-led-row" data-led="lo1">' +
              '<span class="up-led status-' + ledLo1 + '"></span>' +
              '<span class="up-led-label">BAJA 1</span>' +
            '</div>' +
            '<div class="up-led-row" data-led="lo2">' +
              '<span class="up-led status-' + ledLo2 + '"></span>' +
              '<span class="up-led-label">BAJA 2</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</aside>' +
      '<div class="up-cockpit__center">' +
        '<div class="up-viewer" id="upViewer"></div>' +
        '<div class="up-hint-overlay">ARRASTRAR · ROTAR &nbsp;|&nbsp; RUEDA · ZOOM &nbsp;|&nbsp; CLICK DER. · PAN</div>' +
        '<button type="button" class="up-rotate-toggle is-on" data-action="toggle-rotate" title="Encender/apagar rotación automática">↻ Rotar: ON</button>' +
      '</div>' +
      '<aside class="up-cockpit__right">' +
        '<div class="up-panel up-control-panel">' +
          '<div class="up-control-header">' +
            '<span class="up-control-title">CONTROL DE SISTEMAS</span>' +
            '<span class="up-control-pulse status-' + escAttr(status) + '"></span>' +
          '</div>' +
          '<div class="up-modo-buttons" data-modo-buttons>' +
            '<button type="button" class="up-modo-btn" data-modo="MANUAL">MANUAL</button>' +
            '<button type="button" class="up-modo-btn" data-modo="SETPOINT">SETPOINT</button>' +
            '<button type="button" class="up-modo-btn" data-modo="SCHEDULE">SCHEDULE</button>' +
          '</div>' +
          '<div class="up-control-section" data-up-setpoint-section>' +
            '<div class="up-control-section-title">SETPOINT</div>' +
            '<div class="up-stepper up-stepper--input-only">' +
              '<input id="upSpInput" class="up-step-input" type="text" inputmode="numeric" autocomplete="off" maxlength="2" data-action="sp-input" placeholder="—" value="' + escAttr(inputVal) + '" />' +
              '<span class="up-step-unit">°C</span>' +
            '</div>' +
            '<div class="up-control-section-hint">Ingresá un valor entre ' + SETPOINT_MIN + ' y ' + SETPOINT_MAX + ' °C</div>' +
          '</div>' +
          (equip.scheduleOrd ?
            '<div class="up-control-section is-hidden" data-up-schedule-section>' +
              '<div class="up-control-section-title">SETPOINT SCHEDULE</div>' +
              '<button type="button" class="up-edit-schedule-btn" data-action="edit-schedule" title="Editar horario semanal">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
                  '<line x1="16" y1="2" x2="16" y2="6"/>' +
                  '<line x1="8" y1="2" x2="8" y2="6"/>' +
                  '<line x1="3" y1="10" x2="21" y2="10"/>' +
                '</svg>' +
                '<span>Editar Horario</span>' +
              '</button>' +
            '</div>'
          : '') +
          '<div class="up-control-section">' +
            '<div class="up-control-section-title">ESTADOS</div>' +
            '<div class="up-devices is-locked" data-up-devices>' +
              '<div class="up-device-row" data-led="fan">' +
                '<span class="up-led status-' + ledFan + '"></span>' +
                '<span class="up-device-label">FAN</span>' +
                '<span class="up-device-badge-wrap" data-device-badge="fan">' +
                  '<button type="button" class="up-device-badge ' + (s.fanOn ? 'is-on' : 'is-off') + '" data-device-toggle="fan" disabled>' + (s.fanOn ? 'ON' : 'OFF') + '</button>' +
                '</span>' +
              '</div>' +
              '<div class="up-device-row" data-led="c1">' +
                '<span class="up-led status-' + ledC1 + '"></span>' +
                '<span class="up-device-label">COMPRESOR 1</span>' +
                '<span class="up-device-badge-wrap" data-device-badge="c1">' +
                  '<button type="button" class="up-device-badge ' + (s.compressor1On ? 'is-on' : 'is-off') + '" data-device-toggle="c1" disabled>' + (s.compressor1On ? 'ON' : 'OFF') + '</button>' +
                '</span>' +
              '</div>' +
              '<div class="up-device-row" data-led="c2">' +
                '<span class="up-led status-' + ledC2 + '"></span>' +
                '<span class="up-device-label">COMPRESOR 2</span>' +
                '<span class="up-device-badge-wrap" data-device-badge="c2">' +
                  '<button type="button" class="up-device-badge ' + (s.compressor2On ? 'is-on' : 'is-off') + '" data-device-toggle="c2" disabled>' + (s.compressor2On ? 'ON' : 'OFF') + '</button>' +
                '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          _thresholdsSectionHtml() +
        '</div>' +
      '</aside>' +
    '</div>';
}

// Renders the collapsible "Umbrales de Protección" section. Body is empty
// markup at render time — populated/refreshed by `mount()` after wiring,
// because the values come from MX60.UpThresholdStore (lazy-resolved).
function _thresholdsSectionHtml() {
  let rows = '';
  for (let i = 0; i < UP_THRESHOLDS.length; i++) {
    const t = UP_THRESHOLDS[i];
    rows +=
      '<div class="up-threshold-row" data-up-threshold="' + escAttr(t.key) + '" data-latched="false">' +
        '<div class="up-threshold-main">' +
          '<span class="up-threshold-dot" data-up-threshold-dot></span>' +
          '<span class="up-threshold-label">' + escHtml(t.label) + '</span>' +
          '<div class="up-threshold-controls">' +
            '<span class="up-threshold-input-wrap">' +
              '<input type="text" inputmode="decimal" autocomplete="off" placeholder="—" ' +
                'class="up-threshold-input" data-up-threshold-input="' + escAttr(t.key) + '" />' +
              '<span class="up-threshold-unit">' + escHtml(t.unit) + '</span>' +
            '</span>' +
            '<button type="button" class="up-alarm-btn" data-up-alarm-btn="' + escAttr(t.key) + '" title="Alarmar manualmente">⚠ Alarmar</button>' +
          '</div>' +
        '</div>' +
        '<div class="up-threshold-latch" data-up-latch-row hidden>' +
          '<div class="up-latch-meta" data-up-latch-meta></div>' +
          '<textarea class="up-latch-note" data-up-latch-note rows="2" placeholder="Razón / observación del técnico (persiste con la alarma)..."></textarea>' +
        '</div>' +
      '</div>';
  }
  return '' +
    '<div class="up-control-section up-control-section--collapsible" data-up-thresholds-section>' +
      '<div class="up-control-section-header">' +
        '<button type="button" class="up-control-section-toggle" data-action="toggle-thresholds" aria-expanded="false">' +
          '<span class="up-control-section-title">UMBRALES DE PROTECCIÓN</span>' +
          '<svg class="up-control-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="6 9 12 15 18 9"></polyline>' +
          '</svg>' +
        '</button>' +
        '<button type="button" class="up-alarm-reset-all" data-up-alarm-reset-all title="Resetear todas las alarmas activas" hidden>🔓 Reset todas <span data-up-alarm-count>0</span></button>' +
      '</div>' +
      '<div class="up-thresholds-body" data-up-thresholds-body hidden>' +
        rows +
      '</div>' +
    '</div>';
}

// =============================================================================
// Mount — builds scene, geometry, animation; returns { destroy }
// =============================================================================

function mount(container, equip) {
  // fullHistory is populated by _loadRealHistory on mount and on range change.
  // onDataChange appends live readings so the latest values are always present.
  const fullHistory = []; // populated by _loadRealHistory + live append
  const trendByKey = { tempZona: null }; // recomputed after history loads

  // T2.0.6: pausar header particle animation mientras estamos en UpDetail.
  // El header particle consume ~25% CPU (ParticleAnimation._step) — competencia
  // directa con el viewer 3D + 7 charts + cascada de updates de este detail view.
  // Se reanuda en destroy(). El visibilitychange (tab hidden) sigue manejandose
  // dentro de ParticleAnimation — independiente de este hook.
  if (MX60.ParticleAnimation && typeof MX60.ParticleAnimation.pause === 'function') {
    MX60.ParticleAnimation.pause();
  }

  // ----- Shell HTML --------------------------------------------------------
  container.innerHTML =
    '<div class="up-detail-shell">' +
      '<div class="detail-header">' +
        '<button type="button" class="detail-back" data-action="back" aria-label="Volver">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="15 18 9 12 15 6"></polyline>' +
          '</svg>' +
        '</button>' +
        '<div class="detail-title-wrap">' +
          '<span class="detail-type-tag detail-type-up">Unidad Paquete</span>' +
          '<span class="detail-planta-tag">Planta ' + escHtml(equip.planta != null ? String(equip.planta) : '—') + '</span>' +
          '<h2 class="detail-title">' + escHtml(equip.label || equip.id) + '</h2>' +
          '<span class="detail-meta-id">' + escHtml(equip.id) + '</span>' +
          (function(){
            // AP5 fix: align CSS class with statusLabel (which uses
            // StatusResolver). The first paint was producing inconsistent
            // pairs like text="Alarma" + class="status-standby" because the
            // class read raw equip.status while the text went through the
            // resolver. setStatusBlock corrects this on the first notify,
            // but a fresh latched equipment momentarily flashes wrong colors.
            var st = (window.MX60 && MX60.StatusResolver)
              ? (MX60.StatusResolver.effectiveStatus(equip) || equip.status || 'standby')
              : (equip.status || 'standby');
            return '<span class="detail-status status-' + escAttr(st) + '" data-prop="header-status">' +
                     escHtml(statusLabel(equip)) +
                   '</span>';
          })() +
        '</div>' +
      '</div>' +
      _cockpitHtml(equip) +
      _analyticsHtml(equip, trendByKey) +
    '</div>';

  const viewerHost = container.querySelector('#upViewer');

  // SDD chihuahua-perf-staging: show "Cargando vista 3D…" inmediatamente y
  // diferir el setup pesado a stages async. Three.js construye 350+ meshes
  // + compila shaders + asigna GPU context — eso bloqueaba el main thread
  // ~1.2s ([Violation] hashchange handler took 1201ms). Con yields entre
  // stages el browser puede pintar el header/KPIs/side panel mientras el
  // viewer 3D se construye en chunks.
  if (viewerHost) {
    viewerHost.innerHTML =
      '<div class="up-3d-loading">' +
        '<div class="up-3d-loading-spinner" aria-hidden="true"></div>' +
        '<div class="up-3d-loading-label">Cargando vista 3D…</div>' +
      '</div>';
  }

  // Outer-scope flags so the wrapper destroy() can abort pending stages
  // and forward to the real destroy once it has been defined.
  let _pageDisposed = false;
  let _destroyImpl = null;

  // Defer all 3D setup + side panel wireup + history loader to async stages.
  // 3 yields = 3 frame breaths = ~50ms cada uno de breathing room.
  (async function _stagedSetup() {
    try {
      // Yield 1: paint shell + cockpit + analytics HTML
      await new Promise(function(r) { requestAnimationFrame(r); });
      if (_pageDisposed) return;

      // Clear loading placeholder so renderer.domElement can be appended.
      if (viewerHost) viewerHost.innerHTML = '';

  // ----- Scene / camera / renderer / lights / environment ------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080d);
  scene.fog = new THREE.Fog(0x06080d, 140, 340);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 800);
  // Casino-pattern mobile detection: drop antialias, cap pixelRatio, halve
  // shadow map resolution. Saves ~3-4x GPU cost on phones with no visible
  // quality loss at small viewports.
  // SDD perf v2: forzar perfil "mobile" (low-cost) para todos los devices
  // — afecta SOLO renderer settings (antialias OFF, pixelRatio cap, shadow type).
  // Razón: aun en desktop, el primer animate frame con 350+ meshes + shadows
  // PCFSoft + pixelRatio=2 estaba tomando ~30-50ms y produciendo
  // [Violation] 'requestAnimationFrame' handler took N ms. PCFShadowMap
  // (no soft) + pixelRatio=1.5 + antialias OFF = 3-4x más rápido el GPU.
  const _isMobileViewer = true;

  // Iter 19: separar el concepto "renderer perf profile" (hardcoded above) del
  // concepto "camera coords device-aware". Threshold <600 distingue smartphones
  // reales (320-414) de laptops con DevTools al lado (~750+) — los laptops
  // mantienen el branch ELSE laptop sin importar cuanto ancho roba DevTools.
  const _isMobileViewport = window.innerWidth < 600;

  // Per-viewport default camera. Coords capturadas via boton "Copiar vista".
  if (_isMobileViewport) {
    // Iter 19: coords celular reales (smartphone <600px viewport).
    // Metadata: distance 269.62, azimuth 179.6deg, polar 67.1deg — vista
    // alejada porque la pantalla vertical necesita mas distancia para encuadrar
    // el unit completo sin recortarlo.
    camera.position.set(39.3, 108.61, -224.08);
  } else {
    // Iter 18: coords laptop/monitor (>=600px viewport).
    // Metadata: distance 124.91, azimuth -179.7deg, polar 67.1deg.
    camera.position.set(36.9, 52.26, -90.8);
  }
  const renderer = new THREE.WebGLRenderer({ antialias: !_isMobileViewer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, _isMobileViewer ? 1.25 : 2));
  // T2.0.5: shadows OFF — ahorra render pass extra (POV de la luz al shadow map)
  // + sample del shadow map en cada fragment shader. Target hardware modesto.
  // Los castShadow=true en lights y meshes quedan inertes mientras enabled=false.
  // Tradeoff: el viewer pierde profundidad visual; gana ~10% CPU del WebGLRenderer.
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = _isMobileViewer ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewerHost.appendChild(renderer.domElement);

  // SDD perf v4 fix #4: cache de clientWidth/clientHeight del canvas para
  // que OrbitControls.handleMouseMoveRotate (líneas 685, 687) NO fuerce
  // reflow en cada mousemove. Diagnóstico: Element.clientHeight contó 838
  // calls durante una sesión de rotación = 838 forced reflows = lag al
  // rotar el modelo 3D. El cache se refresca solo en window resize y dentro
  // del resize() del viewer — eventos infrecuentes, no per mousemove.
  let _cachedDomW = renderer.domElement.clientWidth  || 600;
  let _cachedDomH = renderer.domElement.clientHeight || 400;
  function _refreshDomCache() {
    // Acceder via Object.getOwnPropertyDescriptor para bypass nuestro getter
    // y leer el valor REAL del DOM. El override está abajo, así que llamar
    // .clientWidth ahora devolvería el cache (loop). Usamos getBoundingClientRect
    // como source of truth — UNA llamada cada resize, no per mousemove.
    try {
      const r = renderer.domElement.getBoundingClientRect();
      if (r.width  > 0) _cachedDomW = Math.round(r.width);
      if (r.height > 0) _cachedDomH = Math.round(r.height);
    } catch (e) { /* keep last cache */ }
  }
  Object.defineProperty(renderer.domElement, 'clientWidth', {
    configurable: true,
    get: function() { return _cachedDomW; }
  });
  Object.defineProperty(renderer.domElement, 'clientHeight', {
    configurable: true,
    get: function() { return _cachedDomH; }
  });

  // Shared module-level PMREM — see SharedEnv.js. First detail mount of the
  // session pays the cost; subsequent mounts get it for free.
  scene.environment = getEnvTexture();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // controls.target unificado iter 19: ambas coords (celular + laptop) usaron
  // el mismo target durante captura. Si en futuro divergen, hacer condicional
  // con _isMobileViewport igual que camera.position arriba.
  controls.target.set(37.51, 3.62, 24.25);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  // (iter 20) Debug tools del viewer removidos para producción limpia:
  // window.__getViewerCoords(), console.info initial, y boton "Copiar vista".
  // Coords del viewer device-aware ya finalizadas en iter 19 (ver if/else arriba).
  // Si en futuro Sprint hace falta re-ajustar coords, reintroducir el bloque
  // mirando git log (iter 13-15 commits) o pedirme que lo agregue de nuevo.

  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(60, 120, 60);
  sun.castShadow = true;
  // SDD perf v3: shadow map 1024 (was 1024 mobile / 2048 desktop). 1024 es
  // visualmente suficiente para este viewer y mata 4x el shadow cost del GPU.
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  // SDD perf v3: frustum reducido de 240×240×300 (17.3M unidades³) a 100×100×220
  // (2.2M unidades³) — el unit cabe en ~70×30 unidades, no necesita un frustum
  // 4x más grande. 8x menos work GPU por shadow pass = first animate frame más
  // rápido.
  sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50;
  sc.near = 1; sc.far = 220; sun.shadow.bias = -0.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-60, 40, -60); scene.add(fill);
  const rim  = new THREE.DirectionalLight(0x00d4aa, 0.18);
  rim.position.set(0, 20, -80);    scene.add(rim);

  // CP3: apply the theme to the 3D scene — bg/fog/lights. Extracted so it can
  // prime the initial state AND run from the ThemeStore callback. Without the
  // initial prime, a fresh light-theme mount shows the dark scene — the
  // subscribe callback only fires on toggle, not on mount.
  function _applyUpSceneTheme(theme) {
    if (theme === 'light') {
      scene.background.set(0xf4f5f7);
      scene.fog.color.set(0xf4f5f7);
      ambient.intensity = 0.55;
      sun.intensity     = 1.2;
      fill.color.set(0xc8d8ee);
      fill.intensity    = 0.28;
      rim.color.set(0x9ab8cc);
      rim.intensity     = 0.14;
      // Ground plane — match bg-ish near-white. Tunable: pick a slightly
      // different hue (e.g. 0xe8eaed) if the floor should read distinct from
      // the bg, or 0xffffff for pure white (harsher on highlights).
      ground.material.color.set(0xf4f5f7);
    } else {
      scene.background.set(0x06080d);
      scene.fog.color.set(0x06080d);
      ambient.intensity = 0.22;
      sun.intensity     = 1.6;
      fill.color.set(0x88aaff);
      fill.intensity    = 0.35;
      rim.color.set(0x00d4aa);
      rim.intensity     = 0.18;
      ground.material.color.set(0x0a0e16);
    }
  }

  // CP3: subscribe to ThemeStore — flip scene bg/fog/lights + update all live
  // charts. Token stored in let so the inner destroy() can unsubscribe (GATE-1a).
  // _upCurrentTheme primed once so chartOptionsFor() uses the correct palette
  // even on the initial chart build (GATE-1b: no getTheme in RAF loop).
  let _upCurrentTheme = (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.getTheme === 'function')
    ? MX60.ThemeStore.getTheme() : 'dark';
  // Prime call is DEFERRED to after ground is created (a few lines below) so
  // _applyUpSceneTheme can mutate ground.material.color too. The subscribe
  // below registers safely now — it can only fire on toggle (async), long
  // after this synchronous mount block finishes (ground exists by then).
  let _themeUnsub = null;
  if (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.subscribe === 'function') {
    // NOTE: this callback closes over `trendState`, declared ~1700 lines below in
    // this same _stagedSetup async closure. Not a TDZ hazard: the callback only
    // fires on a user theme toggle, which cannot happen until the async setup has
    // fully run and yielded — `trendState` is always initialized by then.
    _themeUnsub = MX60.ThemeStore.subscribe(function(theme) {
      _upCurrentTheme = theme;
      _applyUpSceneTheme(theme);
      // Update every live trend chart with the new chrome palette (GATE-1c:
      // ChartTheme.updateChart is idempotent — safe to call with same theme twice).
      if (window.MX60 && MX60.ChartTheme && typeof MX60.ChartTheme.updateChart === 'function') {
        Object.keys(trendState).forEach(function(id) {
          if (trendState[id] && trendState[id].chart) {
            try { MX60.ChartTheme.updateChart(trendState[id].chart, theme); } catch (e) {}
          }
        });
      }
    });
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.92, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // CP3 (deferred from theme block above): now that ground exists, prime the
  // full scene — bg / fog / lights / ground — to the active theme.
  _applyUpSceneTheme(_upCurrentTheme);
  const grid = new THREE.GridHelper(600, 100, 0x00d4aa, 0x142028);
  grid.material.opacity = 0.12; grid.material.transparent = true;
  grid.position.y = 0.01; scene.add(grid);

  // ----- Dimensions (world units) ------------------------------------------
  const HOOD_LEN = 22, CAB_LEN = 48, COMP_LEN = 28, W = 28, H = 28;
  const cabX0 = HOOD_LEN, cabX1 = cabX0 + CAB_LEN;
  const compX0 = cabX1, compX1 = compX0 + COMP_LEN;
  const TOTAL = compX1;

  // ----- Materials (PBR palette) -------------------------------------------
  const M = {
    shell: new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.62, metalness: 0.25,
      transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    shellSolid: new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.58, metalness: 0.28 }),
    shellTrim:  new THREE.MeshStandardMaterial({ color: 0xa8a290, roughness: 0.55, metalness: 0.35 }),
    shellEdge:  new THREE.MeshStandardMaterial({ color: 0x7a7466, roughness: 0.6, metalness: 0.4 }),
    skid:     new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.7, metalness: 0.5 }),
    skidDark: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.75, metalness: 0.4 }),
    galv:     new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.5, metalness: 0.7 }),
    galvDark: new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.55, metalness: 0.65 }),
    ductBody: new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.55, metalness: 0.65,
      transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    black:      new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.38, metalness: 0.85 }),
    blackMatte: new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.75, metalness: 0.3 }),
    grille:     new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.85, metalness: 0.2 }),
    copper:     new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.32, metalness: 0.92 }),
    copperDark: new THREE.MeshStandardMaterial({ color: 0x7a4a1f, roughness: 0.45, metalness: 0.85 }),
    aluminum:       new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }),
    aluminumBright: new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.25, metalness: 0.95 }),
    coilFace:   new THREE.MeshStandardMaterial({ color: 0x4a6878, roughness: 0.68, metalness: 0.55 }),
    rubber:     new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.9, metalness: 0.05 }),
    filter:     new THREE.MeshStandardMaterial({ color: 0xd0c090, roughness: 0.95, metalness: 0.02 }),
    insulation: new THREE.MeshStandardMaterial({ color: 0x30363e, roughness: 0.95, metalness: 0.0 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.6 }),
    bolt:  new THREE.MeshStandardMaterial({ color: 0x40444a, roughness: 0.4, metalness: 0.85 })
  };

  // ----- Geometry helpers --------------------------------------------------
  function box(w,h,d, mat, x,y,z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function panel(w,h,d, mat, x,y,z) { const m = box(w,h,d, mat, x,y,z); m.castShadow = false; return m; }
  function tube(p0, p1, r, mat, radialSegs=10) {
    const dir = new THREE.Vector3().subVectors(p1,p0);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r, r, len, radialSegs);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(p0).add(dir.multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    m.castShadow = true; m.receiveShadow = true; return m;
  }

  const root = new THREE.Group();
  const unit = new THREE.Group();
  unit.add(root);
  scene.add(unit);

      // SDD perf-staging yield 2: scene + lights + materials + groups creados.
      // Browser puede pintar header con sky background antes de los 350+ meshes.
      await new Promise(function(r) { requestAnimationFrame(r); });
      if (_pageDisposed) return;

  // ----- SKID / BASE -------------------------------------------------------
  (function buildSkid() {
    root.add(box(TOTAL+2, 1.2, W+2, M.skid, TOTAL/2, 0.6, W/2));
    const edge = (x,z,w,d) => root.add(box(w, 2.2, d, M.skidDark, x, 1.6, z));
    edge(TOTAL/2, -0.2,    TOTAL+2, 0.8);
    edge(TOTAL/2, W+0.2,   TOTAL+2, 0.8);
    edge(-0.4,    W/2,     0.8,     W+2);
    edge(TOTAL+0.4, W/2,   0.8,     W+2);
    for (let i=1; i<6; i++) {
      const x = (TOTAL/6)*i;
      root.add(box(0.6, 0.9, W+2, M.skidDark, x, 0.3, W/2));
    }
    root.add(box(10, 0.4, 1.5, M.grille, 20, 0.4, 4));
    root.add(box(10, 0.4, 1.5, M.grille, 20, 0.4, W-4));
    root.add(box(10, 0.4, 1.5, M.grille, 78, 0.4, 4));
    root.add(box(10, 0.4, 1.5, M.grille, 78, 0.4, W-4));
  })();

  // ----- Cabinet shell duct openings (declare here, used by ducts later) ---
  const SD_X_CENTER = 61, SD_W_HOLE = 14, SD_H_HOLE = 14, SD_Y_CENTER = H/2 + 1;
  const SD_X0 = SD_X_CENTER - SD_W_HOLE/2, SD_X1 = SD_X_CENTER + SD_W_HOLE/2;
  const SD_Y0 = SD_Y_CENTER - SD_H_HOLE/2, SD_Y1 = SD_Y_CENTER + SD_H_HOLE/2;
  const RD_X_CENTER = 11, RD_W = 14, RD_H = 14, RD_Y_CENTER = 15;
  const RD_X0 = RD_X_CENTER - RD_W/2, RD_X1 = RD_X_CENTER + RD_W/2;
  const RD_Y0 = RD_Y_CENTER - RD_H/2, RD_Y1 = RD_Y_CENTER + RD_H/2;

  // ----- CABINET SHELL -----------------------------------------------------
  (function buildCabinetShell() {
    root.add(panel(CAB_LEN + 0.2, 0.5, W, M.shell, cabX0 + CAB_LEN/2, H + 0.25, W/2));
    root.add(panel(COMP_LEN + 0.2, 0.5, W, M.shell, compX0 + COMP_LEN/2, H + 0.25, W/2));
    root.add(panel(TOTAL - HOOD_LEN, 0.3, W + 1, M.shellTrim, (HOOD_LEN + TOTAL)/2, H + 0.6, W/2));

    root.add(panel(SD_X0 - cabX0, H - 2, 0.5, M.shell, (cabX0 + SD_X0)/2, H/2 + 1, W - 0.25));
    root.add(panel((cabX0 + CAB_LEN) - SD_X1, H - 2, 0.5, M.shell, (SD_X1 + cabX0 + CAB_LEN)/2, H/2 + 1, W - 0.25));
    root.add(panel(SD_W_HOLE, (H - 1) - SD_Y1, 0.5, M.shell, SD_X_CENTER, (SD_Y1 + H - 1)/2, W - 0.25));
    root.add(panel(SD_W_HOLE, SD_Y0 - 1, 0.5, M.shell, SD_X_CENTER, (1 + SD_Y0)/2, W - 0.25));
    root.add(panel(COMP_LEN, H - 2, 0.5, M.shell, compX0 + COMP_LEN/2, H/2 + 1, W - 0.25));

    root.add(panel(0.5, H - 2, W, M.shellSolid, compX1 + 0.25, H/2 + 1, W/2));
    for (let iz=0; iz<=1; iz++) {
      root.add(box(0.7, H - 2, 0.5, M.shellEdge, compX1 + 0.35, H/2 + 1, iz===0 ? 1 : W-1));
    }

    root.add(panel(COMP_LEN - 1, H*0.42, 0.4, M.shellSolid, compX0 + COMP_LEN/2, H - H*0.21, 0.2));
    root.add(box(0.15, H*0.42, 0.45, M.shellEdge, compX0 + COMP_LEN/2, H - H*0.21, 0.05));
    const handle = (x,y) => {
      root.add(box(1.8, 0.35, 0.25, M.skid, x, y, -0.15));
      root.add(box(0.25, 0.55, 0.35, M.bolt, x - 0.7, y, -0.18));
      root.add(box(0.25, 0.55, 0.35, M.bolt, x + 0.7, y, -0.18));
    };
    handle(compX0 + 6,  H*0.72);
    handle(compX0 + 22, H*0.72);

    const grW = COMP_LEN - 4, grH = H*0.48;
    root.add(panel(grW, grH, 0.3, M.grille, compX0 + COMP_LEN/2, grH/2 + 2, W - 0.15));
    for (let i=0; i<8; i++) {
      const y = 3 + i*1.5;
      root.add(box(grW - 0.5, 0.3, 0.25, M.shellEdge, compX0 + COMP_LEN/2, y, W - 0.05));
    }
    const doorScrew = (x,y) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), M.bolt);
      s.rotation.x = Math.PI/2; s.position.set(x, y, -0.05); root.add(s);
    };
    for (let x = compX0 + 2; x < compX1; x += 3) {
      doorScrew(x, H - 1); doorScrew(x, H*0.58 + 1);
    }

    root.add(panel(0.2, 3, 7, M.plate, compX1 + 0.55, H - 5, W/2));
    root.add(panel(0.22, 0.6, 5.5, new THREE.MeshStandardMaterial({
      color: 0xcc2222, roughness: 0.4, metalness: 0.5, emissive: 0xcc2222, emissiveIntensity: 0.15
    }), compX1 + 0.58, H - 5.6, W/2));
  })();

  // ----- END SECTION (return air opening) ----------------------------------
  (function buildEndSection() {
    root.add(panel(HOOD_LEN + 0.2, 0.5, W, M.shell, HOOD_LEN/2, H + 0.25, W/2));
    root.add(panel(HOOD_LEN, 0.3, W + 1, M.shellTrim, HOOD_LEN/2, H + 0.6, W/2));

    if (RD_X0 > 0)         root.add(panel(RD_X0, H - 2, 0.5, M.shell, RD_X0/2, H/2 + 1, W - 0.25));
    if (RD_X1 < HOOD_LEN)  root.add(panel(HOOD_LEN - RD_X1, H - 2, 0.5, M.shell, (RD_X1 + HOOD_LEN)/2, H/2 + 1, W - 0.25));
    root.add(panel(RD_W, H - 1 - RD_Y1, 0.5, M.shell, RD_X_CENTER, (RD_Y1 + H - 1)/2, W - 0.25));
    root.add(panel(RD_W, RD_Y0 - 1, 0.5, M.shell, RD_X_CENTER, (1 + RD_Y0)/2, W - 0.25));

    root.add(panel(0.5, H - 2, W, M.shellSolid, -0.25, H/2 + 1, W/2));
    for (let iz=0; iz<=1; iz++) {
      root.add(box(0.7, H - 2, 0.5, M.shellEdge, -0.35, H/2 + 1, iz===0 ? 1 : W-1));
    }
    const endScrew = (y, z) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), M.bolt);
      s.rotation.z = Math.PI/2; s.position.set(-0.2, y, z); root.add(s);
    };
    for (const y of [3.5, 9, 14.5, 20, 25.5]) { endScrew(y, 2.2); endScrew(y, W - 2.2); }

    root.add(panel(0.2, 3, 7, M.plate, -0.55, H - 5, W/2));
    root.add(panel(0.22, 0.6, 5.5, new THREE.MeshStandardMaterial({
      color: 0xcc2222, roughness: 0.4, metalness: 0.5, emissive: 0xcc2222, emissiveIntensity: 0.15
    }), -0.58, H - 5.6, W/2));

    root.add(box(0.4, H - 2.5, W + 0.5, M.shellTrim, HOOD_LEN + 0.05, H/2 + 1.25, W/2));
  })();

  // ----- FILTER RACK -------------------------------------------------------
  (function buildFilterRack() {
    const x0 = HOOD_LEN + 1;
    root.add(box(2, H - 6, W - 6, M.filter, x0 + 1, H/2 + 1, W/2));
    root.add(box(0.3, H - 6, 0.3, M.galvDark, x0,     H/2 + 1, 3));
    root.add(box(0.3, H - 6, 0.3, M.galvDark, x0,     H/2 + 1, W - 3));
    root.add(box(0.3, H - 6, 0.3, M.galvDark, x0 + 2, H/2 + 1, 3));
    root.add(box(0.3, H - 6, 0.3, M.galvDark, x0 + 2, H/2 + 1, W - 3));
    root.add(box(2, 0.3, W - 5.7, M.galvDark, x0 + 1, 4, W/2));
    root.add(box(2, 0.3, W - 5.7, M.galvDark, x0 + 1, H - 2, W/2));
    for (let i=1; i<10; i++) {
      const z = 3.5 + i*2;
      root.add(box(2.05, H - 6.3, 0.05, M.aluminum, x0 + 1, H/2 + 1, z));
    }
  })();

  // ----- COOLING COIL ------------------------------------------------------
  const COIL_X = cabX0 + 6;
  (function buildCoolingCoil() {
    const fw = 4, fh = H - 6, fd = W - 5;
    root.add(box(0.3, fh, 0.3, M.galvDark, COIL_X,       H/2 + 1, 2.7));
    root.add(box(0.3, fh, 0.3, M.galvDark, COIL_X,       H/2 + 1, W - 2.7));
    root.add(box(0.3, fh, 0.3, M.galvDark, COIL_X + fw,  H/2 + 1, 2.7));
    root.add(box(0.3, fh, 0.3, M.galvDark, COIL_X + fw,  H/2 + 1, W - 2.7));
    root.add(box(fw, 0.3, fd + 0.3, M.galvDark, COIL_X + fw/2, 4, W/2));
    root.add(box(fw, 0.3, fd + 0.3, M.galvDark, COIL_X + fw/2, H - 2, W/2));

    const FIN_COUNT = 44;
    const finGap = fd / FIN_COUNT;
    for (let i=0; i<FIN_COUNT; i++) {
      const z = 3 + i * finGap + finGap/2;
      const fin = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.2, fh - 0.4), M.aluminum);
      fin.position.set(COIL_X + fw/2, H/2 + 1, z);
      fin.rotation.y = Math.PI/2; fin.receiveShadow = true; root.add(fin);
    }
    root.add(panel(0.15, fh - 0.5, fd - 0.1, M.coilFace, COIL_X + fw + 0.08, H/2 + 1, W/2));
    root.add(panel(0.15, fh - 0.5, fd - 0.1, M.coilFace, COIL_X - 0.08, H/2 + 1, W/2));

    const rowCount = 6;
    for (let r=0; r<rowCount; r++) {
      const y = 5 + r * ((fh - 2) / rowCount);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, fd + 0.8, 12), M.copper);
      t.rotation.x = Math.PI/2; t.position.set(COIL_X - 0.5, y, W/2); t.castShadow = true;
      root.add(t);
      if (r < rowCount - 1) {
        const nextY = 5 + (r+1) * ((fh - 2) / rowCount);
        const midY = (y + nextY) / 2;
        const ubend = new THREE.Mesh(new THREE.TorusGeometry((nextY - y)/2, 0.28, 8, 16, Math.PI), M.copper);
        ubend.position.set(COIL_X - 0.5, midY, 2);
        ubend.rotation.y = Math.PI/2; ubend.rotation.z = -Math.PI/2; root.add(ubend);
      }
    }

    root.add(box(fw + 2, 0.4, fd + 1, M.galv, COIL_X + fw/2, 3.2, W/2));
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 10), M.blackMatte);
    drain.position.set(COIL_X + 1, 2, W + 1.5); drain.rotation.x = Math.PI/2; root.add(drain);
  })();

  // ----- INTERNAL PARTITION ------------------------------------------------
  (function buildPartition() {
    root.add(panel(0.4, H - 2.5, W - 0.5, M.shellTrim, compX0 + 0.2, H/2 + 1.25, W/2));
    root.add(panel(0.3, H - 4, W - 6, M.galv, cabX0 + 34, H/2 + 1, W/2));
  })();

  // ----- BLOWER ASSEMBLY ---------------------------------------------------
  const bcx = cabX0 + 22, bcy = H/2 + 1, bcz = W/2;
  const blowerGroup = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x3aa6ff, roughness: 0.38, metalness: 0.7,
    emissive: 0x3aa6ff, emissiveIntensity: 0.35
  });

  (function buildBlower() {
    const scrollR = 8, scrollDepth = 10;
    const scroll = new THREE.Mesh(new THREE.TorusGeometry(scrollR, 1.2, 12, 32, Math.PI), M.galvDark);
    scroll.position.set(bcx, bcy, bcz + 5);
    scroll.rotation.x = Math.PI/2; scroll.rotation.y = 0; scroll.rotation.z = Math.PI/2;
    scroll.castShadow = true; root.add(scroll);

    const backDisk = new THREE.Mesh(new THREE.CylinderGeometry(scrollR, scrollR, 0.3, 32), M.galv);
    backDisk.position.set(bcx, bcy, bcz + scrollDepth);
    backDisk.rotation.x = Math.PI/2; root.add(backDisk);

    const frontRing = new THREE.Mesh(new THREE.RingGeometry(scrollR - 0.8, scrollR, 32), M.galvDark);
    frontRing.position.set(bcx, bcy, bcz); root.add(frontRing);

    const SD_DUCT_W = 14, SD_DUCT_H = 14, SD_DUCT_X = 61, SD_DUCT_Y = bcy;
    const SD_LATERAL_X0 = bcx + scrollR;
    const SD_LATERAL_X1 = SD_DUCT_X - SD_DUCT_W/2;
    const SD_LATERAL_LEN = SD_LATERAL_X1 - SD_LATERAL_X0;
    root.add(box(SD_LATERAL_LEN + 0.5, SD_DUCT_H, scrollDepth - 1, M.ductBody,
      (SD_LATERAL_X0 + SD_LATERAL_X1)/2, SD_DUCT_Y, bcz + scrollDepth/2 - 0.5));
    const SD_INT_Z0 = bcz, SD_INT_Z1 = W - 0.5;
    const SD_INT_LEN = SD_INT_Z1 - SD_INT_Z0;
    root.add(box(SD_DUCT_W, SD_DUCT_H, SD_INT_LEN, M.ductBody,
      SD_DUCT_X, SD_DUCT_Y, SD_INT_Z0 + SD_INT_LEN/2));

    const inletCone = new THREE.Mesh(new THREE.CylinderGeometry(scrollR - 2, scrollR - 4, 1.2, 24, 1, true), M.galv);
    inletCone.position.set(bcx, bcy, bcz - 0.6);
    inletCone.rotation.x = Math.PI/2; root.add(inletCone);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, scrollDepth - 1, 16),
      new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.4, metalness: 0.85 }));
    hub.rotation.x = Math.PI/2; hub.position.set(0, 0, 4.3); blowerGroup.add(hub);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, scrollDepth + 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a7a80, roughness: 0.35, metalness: 0.9 }));
    shaft.rotation.x = Math.PI/2; shaft.position.set(0, 0, 4.3); blowerGroup.add(shaft);

    const BLADES = 28, bladeR = scrollR - 2.3, bladeW = 0.8, bladeThick = 0.25;
    const bladeGeo = new THREE.BoxGeometry(bladeW, bladeThick, scrollDepth - 1.2);
    for (let i=0; i<BLADES; i++) {
      const a = (i / BLADES) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, wheelMat);
      blade.position.set(Math.cos(a) * bladeR, Math.sin(a) * bladeR, 4.3);
      blade.rotation.z = a + Math.PI/2 + 0.25; blade.castShadow = true;
      blowerGroup.add(blade);
    }
    for (const z of [-0.5, scrollDepth - 2]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(bladeR + 0.2, 0.18, 6, 36),
        new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.4, metalness: 0.9 }));
      rim.position.set(0, 0, z + 4.3); blowerGroup.add(rim);
    }

    blowerGroup.position.set(bcx, bcy, bcz - 4);
    unit.add(blowerGroup);

    const motorX = bcx + scrollR + 3.5, motorY = bcy - 3, motorZ = bcz + 2;
    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 5, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.7 }));
    motorBody.rotation.z = Math.PI/2; motorBody.position.set(motorX, motorY, motorZ);
    motorBody.castShadow = true; root.add(motorBody);
    for (let i=0; i<10; i++) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 5, 20),
        new THREE.MeshStandardMaterial({ color: 0x45454a, roughness: 0.4, metalness: 0.8 }));
      fin.rotation.y = Math.PI/2; fin.position.set(motorX - 2.3 + i * 0.5, motorY, motorZ); root.add(fin);
    }
    root.add(box(1.4, 1.4, 1.2, M.black, motorX, motorY + 2.3, motorZ - 0.3));
    root.add(box(5, 0.6, 2.4, M.galvDark, motorX, motorY - 2.4, motorZ));
    const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.4, metalness: 0.8 });
    const motorPulley = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), pulleyMat);
    motorPulley.rotation.z = Math.PI/2; motorPulley.position.set(motorX - 3, motorY, motorZ - 3.5); root.add(motorPulley);
    const wheelPulley = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.8, 20), pulleyMat);
    wheelPulley.rotation.z = Math.PI/2;
    wheelPulley.position.set(bcx + scrollDepth/2 + 0.4, bcy, bcz - 3.5); root.add(wheelPulley);
    const beltGeo = new THREE.TorusGeometry(1.8, 0.18, 6, 24, Math.PI * 1.6);
    const belt = new THREE.Mesh(beltGeo, M.rubber);
    belt.position.set((motorX - 3 + bcx + scrollDepth/2 + 0.4)/2, motorY + 1, motorZ - 3.5);
    belt.rotation.y = Math.PI/2; root.add(belt);
    root.add(box(5.5, 4, 0.3, M.galv, (motorX - 3 + bcx + scrollDepth/2 + 0.4)/2, bcy - 1.5, bcz - 4.5));
  })();

  // ----- COMPRESSORS -------------------------------------------------------
  const compTops = [];
  const compressorStates = [];
  function buildCompressor(cx, cz, idx) {
    const baseY = 2.2;
    root.add(box(10, 0.8, 10, M.blackMatte, cx, baseY + 0.4, cz));
    for (const ox of [-3.5, 3.5]) for (const oz of [-3.5, 3.5]) {
      const iso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.9, 10), M.rubber);
      iso.position.set(cx + ox, baseY + 0.9, cz + oz); root.add(iso);
    }
    const bodyR = 3.5, bodyH = 11;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 28), M.black);
    body.position.set(cx, baseY + 1.3 + bodyH/2, cz); body.castShadow = true; root.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(bodyR, 24, 12, 0, Math.PI * 2, 0, Math.PI/2), M.black);
    dome.position.set(cx, baseY + 1.3 + bodyH, cz); dome.castShadow = true; root.add(dome);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(bodyR + 0.6, bodyR + 0.6, 0.6, 28),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.8 }));
    flange.position.set(cx, baseY + 1.3, cz); root.add(flange);
    root.add(box(2, 2.5, 1.2, M.galv, cx, baseY + 1.3 + bodyH * 0.55, cz - bodyR - 0.6));

    const labelMat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, emissive: 0x3aa6ff, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.4
    });
    const label = new THREE.Mesh(new THREE.CylinderGeometry(bodyR + 0.02, bodyR + 0.02, 1.8, 28, 1, true), labelMat);
    label.position.set(cx, baseY + 1.3 + bodyH * 0.35, cz); root.add(label);

    const glowRingMat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, emissive: 0x3aa6ff, emissiveIntensity: 1.4, roughness: 0.35, metalness: 0.3
    });
    const glowRing = new THREE.Mesh(new THREE.CylinderGeometry(bodyR + 0.04, bodyR + 0.04, 0.5, 28, 1, true), glowRingMat);
    glowRing.position.set(cx, baseY + 1.3 + bodyH * 0.78, cz); root.add(glowRing);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, emissive: 0x3aa6ff, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.2
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, bodyH - 2.5, 0.15), stripeMat);
    stripe.position.set(cx, baseY + 1.3 + bodyH/2, cz - bodyR - 0.08); root.add(stripe);

    const baseGlowMat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, emissive: 0x3aa6ff, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.3
    });
    const baseGlow = new THREE.Mesh(new THREE.TorusGeometry(bodyR + 0.5, 0.18, 8, 32), baseGlowMat);
    baseGlow.rotation.x = Math.PI/2; baseGlow.position.set(cx, baseY + 1.55, cz); root.add(baseGlow);

    const compLight = new THREE.PointLight(0x3aa6ff, 1.0, 18);
    compLight.position.set(cx, baseY + 1.3 + bodyH * 0.6, cz); unit.add(compLight);

    compressorStates.push({ labelMat, glowRingMat, stripeMat, baseGlowMat, compLight });

    const topGroup = new THREE.Group();
    topGroup.position.set(cx, baseY + 1.3 + bodyH + 0.05, cz);
    for (let i=0; i<8; i++) {
      const a = (i/8) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 6), M.bolt);
      bolt.position.set(Math.cos(a)*(bodyR - 0.4), 0, Math.sin(a)*(bodyR - 0.4)); topGroup.add(bolt);
    }
    unit.add(topGroup);
    compTops.push({ group: topGroup, baseY: baseY + 1.3 + bodyH + 0.05 });
  }
  buildCompressor(compX0 + 8,  W/2, 0);
  buildCompressor(compX0 + 20, W/2, 1);

  // ----- REFRIGERANT CIRCUITS ----------------------------------------------
  function pipeRun(waypoints, r, mat, jointScale) {
    const group = new THREE.Group();
    const jR = r * (jointScale || 1.18);
    const pts = waypoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    pts.forEach(p => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(jR, 12, 8), mat);
      s.position.copy(p); s.castShadow = true; group.add(s);
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i+1];
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      if (len < 0.01) continue;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      cyl.position.copy(a).add(dir.clone().multiplyScalar(0.5));
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
      cyl.castShadow = true; group.add(cyl);
    }
    root.add(group); return group;
  }

  (function buildRefrigerantCircuits() {
    const c1X = compX0 + 8, c2X = compX0 + 20, cZ  = W/2, portY = 18;
    const dOff = 1.3, sOff = -1.3, rearZ = W - 1.5;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff, transmission: 0.75, roughness: 0.05, metalness: 0.15, thickness: 0.5, ior: 1.45
    });

    pipeRun([[c1X+dOff,portY,cZ],[c1X+dOff,portY+3.5,cZ],[c1X+dOff,portY+4.5,cZ+4],
             [c1X+dOff,portY+4.5,rearZ-0.5],[c1X+dOff,portY+2.0,rearZ]], 0.3, M.copper);
    pipeRun([[c1X-dOff,19,rearZ],[c1X-dOff,19,22],[c1X-dOff,5.5,22],[c1X-dOff,5.5,cZ],
             [compX0-0.6,5.5,cZ-0.5],[64,5,12],[54,5,11.5],[44,5,11],[36,5,11],[33.5,6.5,11],[33,7,11]], 0.22, M.copper);
    const drier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 3.2, 16), M.copperDark);
    drier1.rotation.z = Math.PI/2; drier1.position.set(59, 5, 11.75); drier1.castShadow = true; root.add(drier1);
    for (const dx of [-1.6, 1.6]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12), M.bolt);
      cap.rotation.z = Math.PI/2; cap.position.set(59 + dx, 5, 11.75); root.add(cap);
    }
    const sg1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), glassMat);
    sg1.position.set(50, 5, 11.4); root.add(sg1);
    root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10), M.copper)
      .translateX(50).translateY(5).translateZ(11.4).rotateZ(Math.PI/2));

    pipeRun([[32.5,24,12],[32.5,26,11],[37,26.5,6.5],[50,26.5,6],[62,26.5,6.5],
             [compX0-0.5,26,7],[c1X,25,9],[c1X,22,12],[c1X+sOff+0.1,19.8,cZ]], 0.55, M.insulation);
    root.add(tube(new THREE.Vector3(c1X+sOff,19.8,cZ), new THREE.Vector3(c1X+sOff,18,cZ), 0.32, M.copper, 12));

    pipeRun([[c2X+dOff,portY,cZ],[c2X+dOff,portY+3.5,cZ],[c2X+dOff,portY+5.0,cZ+5],
             [c2X+dOff,portY+5.0,rearZ-0.5],[c2X+dOff,portY+2.5,rearZ]], 0.3, M.copper);
    pipeRun([[c2X-dOff,19,rearZ],[c2X-dOff,19,20],[c2X-dOff,7.5,20],[c2X-dOff,7.5,cZ+2],
             [compX0-0.6,7,cZ+3],[64,7,16],[54,7,16.5],[44,7,17],[36,7.5,17],[33.5,8,17],[33,8.5,17]], 0.22, M.copper);
    const drier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 3.2, 16), M.copperDark);
    drier2.rotation.z = Math.PI/2; drier2.position.set(59, 7, 16.75); drier2.castShadow = true; root.add(drier2);
    for (const dx of [-1.6, 1.6]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12), M.bolt);
      cap.rotation.z = Math.PI/2; cap.position.set(59 + dx, 7, 16.75); root.add(cap);
    }
    const sg2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), glassMat);
    sg2.position.set(50, 7, 16.4); root.add(sg2);

    root.add(box(1.1, 1.5, 1.1, M.copper, 33, 8, 17));
    root.add(box(0.35, 0.35, 1.4, M.copper, 33, 24.5, 12));
    root.add(box(0.35, 0.35, 1.4, M.copper, 33, 24.5, 16));

    pipeRun([[32.5,24,16],[32.5,26,17],[38,26.5,22],[50,26.5,22.5],[62,26.5,22],
             [compX0-0.5,26,21],[c2X,25,19],[c2X,22,16],[c2X+sOff+0.1,19.8,cZ]], 0.55, M.insulation);
    root.add(tube(new THREE.Vector3(c2X+sOff,19.8,cZ), new THREE.Vector3(c2X+sOff,18,cZ), 0.32, M.copper, 12));

    function serviceValve(x, y, z) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.42, 0.8, 10), M.bolt);
      v.position.set(x, y, z); v.castShadow = true; root.add(v);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 6), M.copper);
      handle.rotation.z = Math.PI/2; handle.position.set(x + 0.5, y, z); root.add(handle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.28, 8), M.bolt);
      cap.position.set(x, y + 0.55, z); root.add(cap);
    }
    serviceValve(c1X + dOff, 19.2, cZ); serviceValve(c1X + sOff, 19.3, cZ);
    serviceValve(c2X + dOff, 19.2, cZ); serviceValve(c2X + sOff, 19.3, cZ);

    function pipeClamp(x, y, z) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 1.0), M.galvDark);
      c.position.set(x, y, z); root.add(c);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), M.bolt);
      rod.position.set(x, y + 0.9, z); root.add(rod);
    }
    pipeClamp(65, 5.7, 11.9); pipeClamp(48, 5.7, 11.2);
    pipeClamp(65, 7.7, 16.3); pipeClamp(48, 7.7, 16.9);
  })();

  // ----- EXTERNAL DUCTS ----------------------------------------------------
  (function buildExternalDucts() {
    const PROTRUDE = 14, FLANGE_T = 0.6;
    const ductBolt = (x, y, z) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8), M.bolt);
      b.rotation.x = Math.PI/2; b.position.set(x, y, z); root.add(b);
    };
    const labelMatRed = new THREE.MeshStandardMaterial({
      color: 0xcc3322, roughness: 0.5, metalness: 0.4, emissive: 0xcc3322, emissiveIntensity: 0.45
    });
    const labelMatBlue = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, roughness: 0.5, metalness: 0.4, emissive: 0x3aa6ff, emissiveIntensity: 0.55
    });

    root.add(box(RD_W, RD_H, PROTRUDE, M.ductBody, RD_X_CENTER, RD_Y_CENTER, W + PROTRUDE/2));
    for (const dx of [-RD_W/2, RD_W/2]) for (const dy of [-RD_H/2, RD_H/2]) {
      root.add(box(0.4, 0.4, PROTRUDE + 0.2, M.shellEdge, RD_X_CENTER + dx, RD_Y_CENTER + dy, W + PROTRUDE/2));
    }
    for (const z of [W + 4, W + 9]) {
      root.add(box(RD_W + 0.4, 0.35, 0.35, M.shellTrim, RD_X_CENTER, RD_Y_CENTER + RD_H/2, z));
      root.add(box(RD_W + 0.4, 0.35, 0.35, M.shellTrim, RD_X_CENTER, RD_Y_CENTER - RD_H/2, z));
      root.add(box(0.35, RD_H, 0.35, M.shellTrim, RD_X_CENTER - RD_W/2, RD_Y_CENTER, z));
      root.add(box(0.35, RD_H, 0.35, M.shellTrim, RD_X_CENTER + RD_W/2, RD_Y_CENTER, z));
    }
    root.add(panel(RD_W + 2.2, RD_H + 2.2, FLANGE_T, M.galv, RD_X_CENTER, RD_Y_CENTER, W + FLANGE_T/2));
    for (const dx of [-RD_W/2 - 0.85, -RD_W/4, RD_W/4, RD_W/2 + 0.85]) {
      ductBolt(RD_X_CENTER + dx, RD_Y_CENTER - RD_H/2 - 0.85, W + 0.4);
      ductBolt(RD_X_CENTER + dx, RD_Y_CENTER + RD_H/2 + 0.85, W + 0.4);
    }
    for (const dy of [-RD_H/4, RD_H/4]) {
      ductBolt(RD_X_CENTER - RD_W/2 - 0.85, RD_Y_CENTER + dy, W + 0.4);
      ductBolt(RD_X_CENTER + RD_W/2 + 0.85, RD_Y_CENTER + dy, W + 0.4);
    }
    root.add(panel(RD_W - 4, 0.5, 0.05, labelMatRed, RD_X_CENTER, RD_Y_CENTER + RD_H/2 + 1.3, W + PROTRUDE/2));

    const SD_X = 61, SD_W = 14, SD_H = 14, SD_Y = bcy;
    root.add(box(SD_W, SD_H, PROTRUDE, M.ductBody, SD_X, SD_Y, W + PROTRUDE/2));
    for (const dx of [-SD_W/2, SD_W/2]) for (const dy of [-SD_H/2, SD_H/2]) {
      root.add(box(0.4, 0.4, PROTRUDE + 0.2, M.shellEdge, SD_X + dx, SD_Y + dy, W + PROTRUDE/2));
    }
    for (const z of [W + 4, W + 9]) {
      root.add(box(SD_W + 0.4, 0.35, 0.35, M.shellTrim, SD_X, SD_Y + SD_H/2, z));
      root.add(box(SD_W + 0.4, 0.35, 0.35, M.shellTrim, SD_X, SD_Y - SD_H/2, z));
      root.add(box(0.35, SD_H, 0.35, M.shellTrim, SD_X - SD_W/2, SD_Y, z));
      root.add(box(0.35, SD_H, 0.35, M.shellTrim, SD_X + SD_W/2, SD_Y, z));
    }
    root.add(panel(SD_W + 2.2, SD_H + 2.2, FLANGE_T, M.galv, SD_X, SD_Y, W + FLANGE_T/2));
    for (const dx of [-SD_W/2 - 0.85, -SD_W/4, SD_W/4, SD_W/2 + 0.85]) {
      ductBolt(SD_X + dx, SD_Y - SD_H/2 - 0.85, W + 0.4);
      ductBolt(SD_X + dx, SD_Y + SD_H/2 + 0.85, W + 0.4);
    }
    for (const dy of [-SD_H/4, SD_H/4]) {
      ductBolt(SD_X - SD_W/2 - 0.85, SD_Y + dy, W + 0.4);
      ductBolt(SD_X + SD_W/2 + 0.85, SD_Y + dy, W + 0.4);
    }
    root.add(panel(SD_W - 4, 0.5, 0.05, labelMatBlue, SD_X, SD_Y + SD_H/2 + 1.3, W + PROTRUDE/2));
  })();

  // ----- CONDENSER SECTION (deck + coil) -----------------------------------
  (function buildCondenser() {
    root.add(box(COMP_LEN - 1.5, 0.5, W - 2, M.galvDark, compX0 + COMP_LEN/2, H + 1.3, W/2));
    for (const dx of [compX0 + 3, compX0 + COMP_LEN - 3]) {
      root.add(box(0.6, 2, W - 3, M.galvDark, dx, H + 0.5, W/2));
    }
    const coilH = 8;
    const makeCondCoil = (x, z, lx, lz) => {
      const coil = box(lx, coilH, lz, M.coilFace, x, H - coilH/2 - 1, z);
      root.add(coil);
      for (let i=0; i<14; i++) {
        const y = H - 1 - i * (coilH/14) - 0.3;
        root.add(box(lx + 0.05, 0.1, lz + 0.05, M.aluminumBright, x, y, z));
      }
    };
    makeCondCoil(compX0 + COMP_LEN/2, W - 0.8, COMP_LEN - 2, 0.25);
    makeCondCoil(compX1 - 0.8, W/2, 0.25, W - 3);
  })();

  // ----- CONDENSER FANS ----------------------------------------------------
  const fanGroups = [], fanMats = [];
  function makeAeroBlade() {
    const shape = new THREE.Shape();
    shape.moveTo(0.5, -0.30);
    shape.quadraticCurveTo(1.6, -0.75, 3.1, -0.55);
    shape.quadraticCurveTo(3.9, -0.35, 4.15, 0.05);
    shape.quadraticCurveTo(4.25, 0.38, 3.85, 0.58);
    shape.quadraticCurveTo(2.8, 0.88, 1.4, 0.55);
    shape.quadraticCurveTo(0.8, 0.35, 0.5, 0.20);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.04, bevelThickness: 0.04, steps: 1
    });
    geo.translate(0, 0, -0.1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const tParam = Math.max(0, Math.min(1, (x - 0.5) / 3.7));
      const twist = 0.70 - tParam * 0.48;
      const cy = y * Math.cos(twist) - z * Math.sin(twist);
      const cz = y * Math.sin(twist) + z * Math.cos(twist);
      pos.setXYZ(i, x, cy, cz);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
    return geo;
  }
  const aeroBladeGeo = makeAeroBlade();
  function makeCondenserFan(cx, cz) {
    const fanY = H + 1.8;
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1.8, 28, 1, true), M.galv);
    shroud.position.set(cx, fanY, cz); shroud.castShadow = true; root.add(shroud);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 32), M.galvDark);
    lip.position.set(cx, fanY + 0.95, cz); lip.rotation.x = Math.PI/2; root.add(lip);
    for (const r of [1.5, 3, 4.5]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 4, 24), M.bolt);
      ring.position.set(cx, fanY + 1.25, cz); ring.rotation.x = Math.PI/2; root.add(ring);
    }
    for (let i=0; i<8; i++) {
      const a = (i/8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), M.bolt);
      spoke.rotation.y = a; spoke.position.set(cx, fanY + 1.25, cz); root.add(spoke);
    }
    const g = new THREE.Group();
    g.position.set(cx, fanY - 0.1, cz);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, roughness: 0.4, metalness: 0.65,
      emissive: 0x3aa6ff, emissiveIntensity: 0.35, side: THREE.DoubleSide
    });
    const fhub = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x45454a, roughness: 0.4, metalness: 0.85 }));
    g.add(fhub);
    const BLADES = 5;
    for (let i=0; i<BLADES; i++) {
      const a = (i/BLADES) * Math.PI * 2;
      const blade = new THREE.Mesh(aeroBladeGeo, bladeMat);
      blade.rotation.y = a; blade.castShadow = true; g.add(blade);
    }
    unit.add(g);
    fanGroups.push(g); fanMats.push(bladeMat);
  }
  [[compX0+7,7],[compX0+7,W-7],[compX0+20,7],[compX0+20,W-7]].forEach(([cx,cz]) => makeCondenserFan(cx, cz));

  // ----- LED INDICATORS + CONTROL PANEL ------------------------------------
  const ledMats = [];
  function makeLed(cx, cz) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3aa6ff, emissive: 0x3aa6ff, emissiveIntensity: 1.3, roughness: 0.3, metalness: 0.3
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), mat);
    led.position.set(cx, 20.5, cz - 4); unit.add(led);
    const pl = new THREE.PointLight(0x3aa6ff, 1.0, 8);
    pl.position.copy(led.position); unit.add(pl);
    ledMats.push({ mat, light: pl });
  }
  makeLed(compX0 + 8,  W/2);
  makeLed(compX0 + 20, W/2);

  (function buildControlPanel() {
    const cx = compX1 - 3, cz = 5, cy = 20;
    root.add(box(4, 6, 3, M.galv, cx, cy, cz));
    root.add(box(0.15, 1.4, 0.3, M.bolt, cx, cy, cz - 1.55));
    const greenL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 1.2 }));
    greenL.position.set(cx - 1, cy + 1.5, cz - 1.55); unit.add(greenL);
    const redL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 0.3 }));
    redL.position.set(cx + 1, cy + 1.5, cz - 1.55); unit.add(redL);
  })();

  // ----- STATE MACHINE -----------------------------------------------------
  const COLOR_STANDBY = new THREE.Color(0x3aa6ff);
  const COLOR_ON      = new THREE.Color(0x00ff66);
  const COLOR_ALARM   = new THREE.Color(0xff2233);
  const colorFor = s => s==='on' ? COLOR_ON : s==='alarm' ? COLOR_ALARM : COLOR_STANDBY;
  const intensityFor = s => s==='on' ? 0.55 : s==='alarm' ? 0.7 : 0.4;

  let state = deriveStateFromEquip(equip);

  function applyState() {
    wheelMat.color.copy(colorFor(state.fan));
    wheelMat.emissive.copy(colorFor(state.fan));
    wheelMat.emissiveIntensity = intensityFor(state.fan);

    const fanStates = [state.c1, state.c1, state.c2, state.c2];
    fanMats.forEach((m, i) => {
      m.color.copy(colorFor(fanStates[i]));
      m.emissive.copy(colorFor(fanStates[i]));
      m.emissiveIntensity = intensityFor(fanStates[i]);
    });

    [state.c1, state.c2].forEach((s, i) => {
      ledMats[i].mat.color.copy(colorFor(s));
      ledMats[i].mat.emissive.copy(colorFor(s));
      ledMats[i].mat.emissiveIntensity = s==='standby' ? 1.2 : 1.7;
      ledMats[i].light.color.copy(colorFor(s));
      ledMats[i].light.intensity = s==='standby' ? 1.0 : 1.5;
    });

    [state.c1, state.c2].forEach((s, i) => {
      const c = colorFor(s);
      const cs = compressorStates[i];
      cs.labelMat.color.copy(c); cs.labelMat.emissive.copy(c);
      cs.labelMat.emissiveIntensity = s === 'standby' ? 0.8 : 1.1;
      cs.glowRingMat.color.copy(c); cs.glowRingMat.emissive.copy(c);
      cs.glowRingMat.emissiveIntensity = s === 'on' ? 1.7 : s === 'alarm' ? 1.5 : 1.3;
      cs.stripeMat.color.copy(c); cs.stripeMat.emissive.copy(c);
      cs.stripeMat.emissiveIntensity = s === 'on' ? 1.9 : 1.4;
      cs.baseGlowMat.color.copy(c); cs.baseGlowMat.emissive.copy(c);
      cs.baseGlowMat.emissiveIntensity = s === 'on' ? 1.5 : 1.1;
      cs.compLight.color.copy(c);
      cs.compLight.intensity = s === 'on' ? 2.4 : s === 'alarm' ? 2.0 : 1.0;
    });
  }

  unit.scale.x = -1;
  unit.position.x = TOTAL;

  applyState();

  // ----- PARTICLES (airflow) -----------------------------------------------
  // SDD perf v2: lazy-build de las 120 particles (60 return + 60 supply) en
  // un setTimeout post-mount. animate() itera estos arrays — si están vacíos
  // los forEach son no-op, no hay error visual. Las particles aparecen ~150ms
  // después del primer paint del 3D viewer, imperceptible para el operator.
  const N = 60;
  const returnP = [], supplyP = [];
  const pGeo = new THREE.SphereGeometry(0.3, 6, 4);
  const redMat  = new THREE.MeshBasicMaterial({ color:0xff5533, transparent:true, opacity:0.85 });
  const blueMat = new THREE.MeshBasicMaterial({ color:0x44bbff, transparent:true, opacity:0.85 });
  setTimeout(function() {
    if (_pageDisposed) return;
    for (let i=0; i<N; i++) {
      const r = new THREE.Mesh(pGeo, redMat.clone());
      r.userData = { t: Math.random(), seed: Math.random()*10 };
      unit.add(r); returnP.push(r);
      const s = new THREE.Mesh(pGeo, blueMat.clone());
      s.userData = { t: Math.random(), seed: Math.random()*10 };
      unit.add(s); supplyP.push(s);
    }
  }, 150);

      // SDD perf-staging yield 3: todos los meshes ya creados (skid + cabinet
      // + cooling coil + blower + compressors + refrigerant + ducts + condenser
      // + fans + leds + particles). Browser puede pintar el viewer ANTES del
      // primer animate() frame que va a costar 30-50ms con shadow maps.
      await new Promise(function(r) { requestAnimationFrame(r); });
      if (_pageDisposed) return;

  // ----- Resize ------------------------------------------------------------
  function resize() {
    const w = viewerHost.clientWidth  || 600;
    const h = viewerHost.clientHeight || 400;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    // SDD perf v4 fix #4: refrescar cache de canvas dims aquí, NO en
    // OrbitControls.handleMouseMoveRotate (que se ejecuta per mousemove).
    _refreshDomCache();
  }
  resize();
  window.addEventListener('resize', resize, false);

  // ----- Animate -----------------------------------------------------------
  let rafId = 0, disposed = false;
  const clock = new THREE.Clock();

  // SDD perf v5 T1.3: IntersectionObserver para pausar el animate loop cuando
  // el viewer 3D queda fuera de viewport (user scrollea hacia los charts /
  // configuración / footer). Sin esto, el animate sigue corriendo a 60fps
  // gastando GPU+CPU+battery sin que nadie vea el resultado. En tablets de
  // campo con batería limitada, ahorra autonomía. En desktop libera CPU para
  // los charts u otros UPs visibles. Cuando el viewer vuelve a entrar al
  // viewport, animate se reanuda automáticamente.
  let _viewerVisible = true;
  let _viewerIO = null;
  try {
    if (typeof IntersectionObserver !== 'undefined') {
      _viewerIO = new IntersectionObserver(function(entries) {
        if (!entries || !entries[0]) return;
        _viewerVisible = entries[0].isIntersecting;
      }, { threshold: 0 });
      _viewerIO.observe(viewerHost);
    }
  } catch (e) { _viewerIO = null; /* fallback: animate always on */ }

  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    // T1.3: skip todo el work cuando el viewer no está visible. Mantenemos
    // el loop encolado (cheap RAF) para reanudar instantáneamente al volver.
    if (!_viewerVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.elapsedTime;

    if (state.fan === 'on') blowerGroup.rotation.z += dt * 7;

    const fanOn = [state.c1==='on', state.c1==='on', state.c2==='on', state.c2==='on'];
    fanGroups.forEach((g, i) => { if (fanOn[i]) g.rotation.y += dt * (9 + i*0.4); });

    const compOn = [state.c1==='on', state.c2==='on'];
    compTops.forEach((ct, i) => {
      if (compOn[i]) {
        ct.group.rotation.y += dt * 8;
        ct.group.position.y = ct.baseY + Math.sin(t*30 + i)*0.08;
      } else {
        ct.group.position.y = ct.baseY;
      }
    });

    const cStates = [state.c1, state.c2];
    compressorStates.forEach((cs, i) => {
      const s = cStates[i];
      if (s === 'alarm') {
        const pulse = 0.5 + Math.sin(t * 5 + i)*0.5;
        cs.stripeMat.emissiveIntensity = 0.9 + pulse * 1.0;
        cs.glowRingMat.emissiveIntensity = 0.8 + pulse * 0.9;
        cs.compLight.intensity = 1.2 + pulse * 1.2;
      } else if (s === 'on') {
        const shimmer = 0.95 + Math.sin(t * 12 + i*2)*0.08;
        cs.compLight.intensity = 2.4 * shimmer;
        cs.stripeMat.emissiveIntensity = 1.9 * shimmer;
      }
    });

    returnP.forEach((p, i) => {
      if (state.fan!=='on') { p.material.opacity = 0; return; }
      p.userData.t += dt * 0.14;
      if (p.userData.t > 1) p.userData.t = 0;
      const tt = p.userData.t, seed = p.userData.seed;
      const xJit = ((i % 5) - 2) * 1.8;
      const yJit = ((Math.floor(i/5) % 4) - 1.5) * 1.8;
      if (tt < 0.30) {
        const u = tt / 0.30;
        p.position.x = RD_X_CENTER + xJit * 0.6 + Math.sin(u*4 + seed)*0.4;
        p.position.y = RD_Y_CENTER + yJit * 0.6 + Math.sin(u*5 + seed)*0.4;
        p.position.z = W + 18 - u * 18;
      } else {
        const u = (tt - 0.30) / 0.70;
        p.position.x = RD_X_CENTER + xJit * 0.4 + u * 24;
        p.position.y = RD_Y_CENTER - 1 + yJit * 0.5 + Math.sin(u*4 + seed)*0.6;
        p.position.z = W/2 + Math.cos(u*4 + seed)*1.4;
      }
      p.material.opacity = Math.sin(tt*Math.PI) * 0.85;
    });
    supplyP.forEach((p, i) => {
      if (state.fan!=='on') { p.material.opacity = 0; return; }
      p.userData.t += dt * 0.18;
      if (p.userData.t > 1) p.userData.t = 0;
      const tt = p.userData.t, seed = p.userData.seed;
      const xJit = ((i % 5) - 2) * 1.6;
      const yJit = ((Math.floor(i/5) % 4) - 1.5) * 1.6;
      if (tt < 0.40) {
        const u = tt / 0.40;
        p.position.x = 52 + u * 9;
        p.position.y = 15 + yJit * 0.5 + Math.sin(u*4 + seed)*0.6;
        p.position.z = bcz + xJit * 0.3;
      } else {
        const u = (tt - 0.40) / 0.60;
        p.position.x = 61 + xJit * 0.4 + Math.sin(u*3 + seed)*0.4;
        p.position.y = 15 + yJit * 0.5 + Math.sin(u*4 + seed)*0.4;
        p.position.z = bcz + u * (W + 18 - bcz);
      }
      p.material.opacity = Math.sin(tt*Math.PI) * 0.85;
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // ----- Cockpit panels — refs, listeners, granular update ----------------
  const sidePanel = container; // querySelectors against the whole shell now
  const statusBlock   = sidePanel.querySelector('[data-prop="status-block"]');
  const statusLabelEl = sidePanel.querySelector('[data-prop="status-label"]');
  // C2 fix: capture the header status pill so setStatusBlock can update it
  // along with the cockpit panel — was frozen at mount time before.
  const headerStatusEl = sidePanel.querySelector('[data-prop="header-status"]');
  const setpointDispEl = sidePanel.querySelector('[data-prop="setpoint-display"]');
  const readingValueEls = {};
  const readingCardEls = {};
  for (let i = 0; i < READINGS.length; i++) {
    const k = READINGS[i].key;
    readingValueEls[k] = sidePanel.querySelector('[data-prop="' + k + '"]');
    readingCardEls[k]  = sidePanel.querySelector('[data-reading="' + k + '"]');
  }
  const ledEls = {
    fan:  sidePanel.querySelector('[data-led="fan"] .up-led'),
    c1:   sidePanel.querySelector('[data-led="c1"] .up-led'),
    c2:   sidePanel.querySelector('[data-led="c2"] .up-led'),
    fase: sidePanel.querySelector('[data-led="fase"] .up-led'),
    hi1:  sidePanel.querySelector('[data-led="hi1"] .up-led'),
    hi2:  sidePanel.querySelector('[data-led="hi2"] .up-led'),
    lo1:  sidePanel.querySelector('[data-led="lo1"] .up-led'),
    lo2:  sidePanel.querySelector('[data-led="lo2"] .up-led')
  };
  const spInput  = sidePanel.querySelector('#upSpInput');
  var setpointSectionEl = sidePanel.querySelector('[data-up-setpoint-section]');
  var scheduleSectionEl = sidePanel.querySelector('[data-up-schedule-section]');
  var setpointDisplayPanelEl = sidePanel.querySelector('.up-setpoint-panel');

  // W3: lastValidSetpoint is internal state (revert target on write fail).
  // Use setpoint slot when it has a real value; otherwise default to MIN as
  // a sentinel — does NOT get rendered (input stays empty per UX decision).
  var lastValidSetpoint = (equip.summary && equip.summary.setpoint != null && !isNaN(equip.summary.setpoint) && equip.summary.setpoint > 0)
    ? Math.round(Number(equip.summary.setpoint))
    : SETPOINT_MIN;
  var optimisticSetpoint = lastValidSetpoint;
  var inputFocused = false;

  function setLedClass(el, on, status) {
    if (!el) return;
    el.className = 'up-led status-' + (on ? (status === 'alarm' ? 'alarm' : 'on') : 'off');
  }
  function setStatusBlock(equipFresh) {
    // Effective status — alarm latches override the raw equip.status.
    const st = (window.MX60 && MX60.StatusResolver)
      ? (MX60.StatusResolver.effectiveStatus(equipFresh) || 'standby')
      : ((equipFresh && equipFresh.status) || 'standby');
    statusBlock.className = 'up-panel up-status-panel status-' + st;
    statusLabelEl.textContent = statusLabel(equipFresh);
    // C2 fix: also update the header pill — was frozen at mount before.
    if (headerStatusEl) {
      headerStatusEl.className = 'detail-status status-' + st;
      headerStatusEl.textContent = statusLabel(equipFresh);
    }
    // Note: KPI colors are per-metric (assigned in READINGS), not status-driven.
    // Only dim the KPIs when the unit is offline.
    const offline = st === 'offline';
    for (const k in readingCardEls) {
      if (readingCardEls.hasOwnProperty(k) && readingCardEls[k]) {
        if (offline) readingCardEls[k].classList.add('is-offline');
        else readingCardEls[k].classList.remove('is-offline');
      }
    }
  }
  function updateSidePanel(equipFresh) {
    if (!equipFresh) return;
    const s = equipFresh.summary || {};
    setStatusBlock(equipFresh);
    for (let i = 0; i < READINGS.length; i++) {
      const r = READINGS[i];
      const el = readingValueEls[r.key];
      if (el) el.textContent = fmtNum(_readKpi(r, s), r.digits);
    }
    setLedClass(ledEls.fan, !!s.fanOn,         equipFresh.status);
    setLedClass(ledEls.c1,  !!s.compressor1On, equipFresh.status);
    setLedClass(ledEls.c2,  !!s.compressor2On, equipFresh.status);
    // Device ON/OFF badges in Control de Sistemas card — override-aware.
    renderAllDeviceBadges(equipFresh);
    // Protection threshold dots — recompute violation state vs live readings.
    if (typeof renderThresholdDots === 'function') renderThresholdDots(equipFresh);
    // Protections — direct class swap (no shared helper because semantics differ)
    if (ledEls.fase) ledEls.fase.className = 'up-led status-' + (s.protectorFase === false ? 'alarm' : 'ok');
    if (ledEls.hi1)  ledEls.hi1.className  = 'up-led status-' + (s.switchAlta1 ? 'alarm' : 'off');
    if (ledEls.hi2)  ledEls.hi2.className  = 'up-led status-' + (s.switchAlta2 ? 'alarm' : 'off');
    if (ledEls.lo1)  ledEls.lo1.className  = 'up-led status-' + (s.switchBaja1 ? 'alarm' : 'off');
    if (ledEls.lo2)  ledEls.lo2.className  = 'up-led status-' + (s.switchBaja2 ? 'alarm' : 'off');

    // D5: Display effectiveSetpoint (read-only KPI) if available, else fall back to setpoint.
    // effectiveSetpoint is the single source of truth computed by BChiUp.recomputeEffectiveSetpoint().
    var effSp = (s.effectiveSetpoint != null && !isNaN(s.effectiveSetpoint))
      ? s.effectiveSetpoint
      : s.setpoint;
    if (setpointDispEl) {
      setpointDispEl.textContent = (effSp != null && !isNaN(effSp))
        ? String(Math.round(Number(effSp))) : '—';
    }
    // W3: input writes to /setpoint slot in SETPOINT mode. Show ONLY the real
    // setpoint value — when slot is 0/null, leave input empty so the placeholder
    // "Ingresá un valor" shows (user-confirmed UX decision).
    // effectiveSetpoint is the single source of truth; em-dash when 0/null (no programmatic target).
    if (!inputFocused) {
      if (s.setpoint != null && !isNaN(s.setpoint) && s.setpoint > 0) {
        var backendVal = Math.round(Number(s.setpoint));
        if (backendVal !== optimisticSetpoint) {
          optimisticSetpoint = backendVal;
          lastValidSetpoint = backendVal;
          spInput.value = fmtSetpoint(backendVal);
        }
      } else if (spInput.value !== '') {
        // setpoint is 0/null and input has a value — clear it so placeholder shows.
        spInput.value = '';
      }
    }
  }

  function _applySetpoint(n) {
    // REQ-CS3/D3: Snapshot activeModo at commit time (not click time).
    // Fail-closed: only SETPOINT mode writes setpoint slot.
    // Section is hidden in other modes (REQ-CS2), but this guard is defence-in-depth.
    var capturedModo = activeModo;
    if (capturedModo !== 'SETPOINT') return;
    // Capture previous value BEFORE optimistic update so we can revert on
    // write failure. Without this revert path, a failed setpoint write
    // permanently desyncs the UI: optimistic value sticks at n, but the
    // next subscription push from Niagara (with the unchanged real value)
    // is suppressed at line 1943 in the no-op branch — operator sees a
    // setpoint that was never actually applied to the station.
    var previousSetpoint = lastValidSetpoint;
    lastValidSetpoint = n;
    optimisticSetpoint = n;
    spInput.value = fmtSetpoint(n);
    if (setpointDispEl) setpointDispEl.textContent = String(n);
    if (equip.ord) {
      // REQ-CS3: Write to setpoint slot in SETPOINT mode.
      // BChiUp.changed() (W4) now intercepts this write and calls recomputeEffectiveSetpoint().
      MX60.writePoint(equip.ord + '/setpoint', n)
        .catch(function() {
          // Revert UI to previous value so next subscription push reconciles
          // correctly. Toast is already shown by writePoint helper.
          lastValidSetpoint = previousSetpoint;
          optimisticSetpoint = previousSetpoint;
          spInput.value = fmtSetpoint(previousSetpoint);
          if (setpointDispEl) setpointDispEl.textContent = String(previousSetpoint);
        });
    }
  }
  function commitSetpoint(rawValue) {
    let n = parseInt(rawValue, 10);
    if (isNaN(n)) {
      spInput.value = fmtSetpoint(lastValidSetpoint);
      return;
    }
    n = clampSetpoint(n);
    if (n === lastValidSetpoint) {
      // No-op when value didn't actually change after clamp.
      spInput.value = fmtSetpoint(n);
      return;
    }
    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:   'Cambiar setpoint',
        message: '¿Confirmar setpoint a ' + n + ' °C?',
        onConfirm: function () { _applySetpoint(n); },
        onCancel:  function () { spInput.value = fmtSetpoint(lastValidSetpoint); }
      });
    } else {
      _applySetpoint(n);
    }
  }

  function onSpInput(e) {
    // Hard mask: integers only — strip everything that's not 0-9 on input.
    const v = e.target.value;
    if (!SETPOINT_RE.test(v)) {
      e.target.value = v.replace(/[^\d]/g, '');
    }
  }
  function onSpKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSetpoint(e.target.value);
      e.target.blur();
      return;
    }
    // Block decimal point, sign characters, and 'e' before they reach the value.
    if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  }
  function onSpFocus() { inputFocused = true; }
  function onSpBlur(e) {
    inputFocused = false;
    commitSetpoint(e.target.value);
  }

  spInput.addEventListener('input',   onSpInput,   false);
  spInput.addEventListener('keydown', onSpKeyDown, false);
  spInput.addEventListener('focus',   onSpFocus,   false);
  spInput.addEventListener('blur',    onSpBlur,    false);

  // ----- Device toggles (FAN / COMP1 / COMP2) — only active in MANUAL ------
  // Mapping table — DOM key (used in [data-device-toggle] / [data-device-badge])
  // → store key (OutputOverrideStore) → writePoint slot → equipment.summary
  // boolean → human label.
  const DEVICE_KEYS = ['fan', 'c1', 'c2'];
  const DEVICE_TO_STORE   = { fan: 'fan',     c1: 'comp1',         c2: 'comp2'         };
  const DEVICE_TO_SLOT    = { fan: 'fanCmd',  c1: 'comp1Cmd',      c2: 'comp2Cmd'      };
  const DEVICE_TO_SUMMARY = { fan: 'fanOn',   c1: 'compressor1On', c2: 'compressor2On' };
  const DEVICE_LABEL      = { fan: 'FAN',     c1: 'COMPRESOR 1',   c2: 'COMPRESOR 2'   };

  function _displayedDeviceState(deviceKey, equipFresh) {
    // Safety interlock simulation: any latched alarm whose lockdown list
    // includes this device forces the displayed state to OFF, regardless of
    // mode or override. In production this lives in the Niagara station.
    if (typeof _isDeviceLocked === 'function' && _isDeviceLocked(deviceKey)) return false;
    const sum = (equipFresh && equipFresh.summary) || {};
    if (activeModo === 'MANUAL' && window.MX60 && MX60.OutputOverrideStore) {
      const ov = MX60.OutputOverrideStore.get(equip.id, DEVICE_TO_STORE[deviceKey]);
      if (ov !== null && ov !== undefined) return !!ov;
    }
    return !!sum[DEVICE_TO_SUMMARY[deviceKey]];
  }
  function _renderDeviceBadge(deviceKey, equipFresh) {
    const wrap = container.querySelector('[data-device-badge="' + deviceKey + '"]');
    if (!wrap) return;
    const isOn = _displayedDeviceState(deviceKey, equipFresh);
    const isManual = activeModo === 'MANUAL';
    const isLocked = (typeof _isDeviceLocked === 'function') && _isDeviceLocked(deviceKey);
    const disabled = !isManual || isLocked;
    let cls = 'up-device-badge ' + (isOn ? 'is-on' : 'is-off');
    if (isLocked) cls += ' is-locked';
    const titleAttr = isLocked ? ' title="Latched — reset requerido"' : '';
    wrap.innerHTML =
      '<button type="button" class="' + cls + '" ' +
      'data-device-toggle="' + deviceKey + '"' + (disabled ? ' disabled' : '') + titleAttr + '>' +
      (isOn ? 'ON' : 'OFF') +
      '</button>';
  }
  function renderAllDeviceBadges(equipFresh) {
    for (let i = 0; i < DEVICE_KEYS.length; i++) {
      _renderDeviceBadge(DEVICE_KEYS[i], equipFresh);
    }
  }

  function _currentEquip() {
    if (window.MX60 && MX60.EquipmentData && typeof MX60.EquipmentData.getById === 'function') {
      return MX60.EquipmentData.getById(equip.id) || equip;
    }
    return equip;
  }

  function toggleDevice(deviceKey) {
    if (activeModo !== 'MANUAL') return;
    // Safety interlock — refuse to toggle a device covered by an active latch.
    if (typeof _isDeviceLocked === 'function' && _isDeviceLocked(deviceKey)) return;
    if (!window.MX60 || !MX60.OutputOverrideStore) return;
    const storeKey = DEVICE_TO_STORE[deviceKey];
    const equipFresh = _currentEquip();
    const prevDisplayed = _displayedDeviceState(deviceKey, equipFresh);
    const next = !prevDisplayed;
    const label = DEVICE_LABEL[deviceKey];
    const verb  = next ? 'encender' : 'apagar';

    function _apply() {
      MX60.OutputOverrideStore.set(equip.id, storeKey, next);
      if (equip.ord) {
        MX60.writePoint(equip.ord + '/' + DEVICE_TO_SLOT[deviceKey], next)
          .catch(function() { /* toast already shown by helper */ });
      }
    }

    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:        'Operación manual',
        message:      '¿Confirmar ' + verb + ' ' + label + '?',
        confirmLabel: next ? 'Encender' : 'Apagar',
        tone:         next ? 'neutral' : 'danger',
        onConfirm:    _apply
      });
    } else {
      _apply();
    }
  }

  const devicesContainerEl = container.querySelector('[data-up-devices]');
  function onDeviceToggleClick(e) {
    const btn = e.target && e.target.closest && e.target.closest('[data-device-toggle]');
    if (!btn || btn.disabled) return;
    toggleDevice(btn.getAttribute('data-device-toggle'));
  }
  if (devicesContainerEl) {
    devicesContainerEl.addEventListener('click', onDeviceToggleClick, false);
  }

  // Re-render badges whenever the override store changes for this equip
  // (covers undo, external clears, and same-tab cross-state coherence).
  const unsubscribeOutputOverride = (window.MX60 && MX60.OutputOverrideStore)
    ? MX60.OutputOverrideStore.subscribe(function (evt) {
        if (!evt || evt.equipId !== equip.id) return;
        renderAllDeviceBadges(_currentEquip());
      })
    : function () {};

  // ----- Umbrales de Protección — collapsible panel with 7 inputs -------
  // Each row has a status dot (gray/green/red) driven by the live reading
  // vs the configured threshold + an editable numeric input. Persists in
  // MX60.UpThresholdStore. Toast undo on commit. Comparison direction lives
  // in UP_THRESHOLDS (over | under).
  const thresholdsSection = container.querySelector('[data-up-thresholds-section]');
  const thresholdsToggle  = container.querySelector('[data-action="toggle-thresholds"]');
  const thresholdsBody    = container.querySelector('[data-up-thresholds-body]');
  const thresholdInputs   = {};
  const thresholdDots     = {};
  const thresholdFocused  = {};
  const alarmBtnEls       = {};
  const alarmLatchRowEls  = {};
  const alarmLatchMetaEls = {};
  const alarmLatchNoteEls = {};
  const alarmNoteFocused  = {};
  for (let i = 0; i < UP_THRESHOLDS.length; i++) {
    const k = UP_THRESHOLDS[i].key;
    const rowEl = container.querySelector('[data-up-threshold="' + k + '"]');
    thresholdInputs[k] = container.querySelector('[data-up-threshold-input="' + k + '"]');
    thresholdDots[k]   = rowEl ? rowEl.querySelector('[data-up-threshold-dot]') : null;
    thresholdFocused[k] = false;
    alarmBtnEls[k]       = container.querySelector('[data-up-alarm-btn="' + k + '"]');
    alarmLatchRowEls[k]  = rowEl ? rowEl.querySelector('[data-up-latch-row]') : null;
    alarmLatchMetaEls[k] = rowEl ? rowEl.querySelector('[data-up-latch-meta]') : null;
    alarmLatchNoteEls[k] = rowEl ? rowEl.querySelector('[data-up-latch-note]') : null;
    alarmNoteFocused[k] = false;
  }
  const resetAllBtn     = container.querySelector('[data-up-alarm-reset-all]');
  const resetAllCountEl = container.querySelector('[data-up-alarm-count]');

  function _thresholdViolated(reading, umbral, direction) {
    // C5: REQ-701 defense — 0.0, null, undefined all mean "not configured".
    // Never trigger a violation for an unconfigured threshold.
    if (umbral === null || umbral === undefined || umbral === 0.0 || umbral === 0) return false;
    if (reading === null || reading === undefined || isNaN(reading)) return null;
    return direction === 'over' ? (reading > umbral) : (reading < umbral);
  }

  // Locked = at least one currently-latched alarm covers this device.
  // (See ALARM_LOCKDOWN map at module level.)
  function _isDeviceLocked(deviceKey) {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    if (!aStore) return false;
    const keys = aStore.latchedKeys(equip.id);
    for (let i = 0; i < keys.length; i++) {
      const devices = ALARM_LOCKDOWN[keys[i]] || [];
      if (devices.indexOf(deviceKey) >= 0) return true;
    }
    return false;
  }

  // Track previous violated state per threshold for rising-edge detection.
  // Without this, a reset while the condition still violates would auto-relatch
  // immediately (the read says "violated" every cycle, not just on the change).
  // Behavior matches BAlarmExt: a new alarm record fires only when the source
  // transitions from normal → offnormal, not on every poll while offnormal.
  const _prevViolated = {};
  function renderThresholdDots(equipFresh) {
    const sum = (equipFresh && equipFresh.summary) || {};
    const tStore = window.MX60 && MX60.UpThresholdStore;
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    for (let i = 0; i < UP_THRESHOLDS.length; i++) {
      const t = UP_THRESHOLDS[i];
      const dot = thresholdDots[t.key];
      if (!dot) continue;
      const umbral = tStore ? tStore.get(equip.id, t.key) : null;
      const reading = Number(sum[t.readingKey]);
      const violated = _thresholdViolated(reading, umbral, t.direction);
      const isLatched = aStore ? aStore.isLatched(equip.id, t.key) : false;
      const wasViolated = _prevViolated[t.key];
      // Auto-latch ONLY on rising edge (was-not-violated → now-violated) and
      // only when not already latched. After a reset, the user must see the
      // condition clear and re-trip before another auto-latch fires.
      if (violated === true && wasViolated !== true && !isLatched && aStore) {
        aStore.latch(equip.id, t.key, { reason: 'auto' });
      }
      _prevViolated[t.key] = violated;
      let cls = 'up-threshold-dot';
      if (isLatched || violated === true) cls += ' is-alarm';
      else if (violated === false) cls += ' is-ok';
      else cls += ' is-muted';
      dot.className = cls;
    }
  }
  function renderThresholdInputs() {
    const store = window.MX60 && MX60.UpThresholdStore;
    if (!store) return;
    for (let i = 0; i < UP_THRESHOLDS.length; i++) {
      const t = UP_THRESHOLDS[i];
      const inp = thresholdInputs[t.key];
      if (!inp || thresholdFocused[t.key]) continue;
      const v = store.get(equip.id, t.key);
      inp.value = (v === null || v === undefined) ? '' : String(v);
    }
  }

  // ----- Alarm latch UI -------------------------------------------------
  // Drives:
  //   • Per-row alarm button text + visibility of the note sub-row
  //   • Per-row note + meta line ("14:32 · auto"|"manual")
  //   • Global "Reset todas (N)" button visibility + count
  function renderLatchUI() {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    for (let i = 0; i < UP_THRESHOLDS.length; i++) {
      const t = UP_THRESHOLDS[i];
      const btn   = alarmBtnEls[t.key];
      const row   = alarmLatchRowEls[t.key];
      const meta  = alarmLatchMetaEls[t.key];
      const note  = alarmLatchNoteEls[t.key];
      const rowEl = container.querySelector('[data-up-threshold="' + t.key + '"]');
      const entry = aStore ? aStore.get(equip.id, t.key) : null;
      const latched = !!(entry && entry.latched);
      if (rowEl) rowEl.setAttribute('data-latched', latched ? 'true' : 'false');
      if (btn) {
        btn.textContent = latched ? '🔓 Reset' : '⚠ Alarmar';
        btn.title       = latched ? 'Resetear esta alarma' : 'Alarmar manualmente';
        if (latched) btn.classList.add('is-latched');
        else         btn.classList.remove('is-latched');
      }
      if (row) {
        if (latched) row.removeAttribute('hidden');
        else         row.setAttribute('hidden', '');
      }
      if (meta) {
        if (latched && entry) {
          const d = new Date(entry.latchedAt);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          meta.textContent = hh + ':' + mm + ' · ' + (entry.latchedBy === 'manual' ? 'manual' : 'auto');
        } else {
          meta.textContent = '';
        }
      }
      if (note && !alarmNoteFocused[t.key]) {
        note.value = (entry && entry.note) || '';
      }
    }
    // Global reset all
    if (resetAllBtn && aStore) {
      const keys = aStore.latchedKeys(equip.id);
      if (keys.length > 0) {
        resetAllBtn.removeAttribute('hidden');
        if (resetAllCountEl) resetAllCountEl.textContent = '(' + keys.length + ')';
      } else {
        resetAllBtn.setAttribute('hidden', '');
      }
    }
  }

  function _confirmManualLatch(thresholdKey) {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    if (!aStore || aStore.isLatched(equip.id, thresholdKey)) return;
    const def = UP_THRESHOLDS.filter(function (x) { return x.key === thresholdKey; })[0];
    const label = def ? def.label : thresholdKey;
    const devices = (ALARM_LOCKDOWN[thresholdKey] || []).map(function (d) { return DEVICE_LABEL[d] || d; });
    const devText = devices.length ? ' Se apagará: ' + devices.join(', ') + '.' : '';
    const apply = function () {
      aStore.latch(equip.id, thresholdKey, { reason: 'manual' });
      // Focus the note textarea so the technician can write the reason.
      requestAnimationFrame(function () {
        const note = alarmLatchNoteEls[thresholdKey];
        if (note) note.focus();
      });
    };
    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:        'Alarmar manualmente',
        message:      '¿Alarmar "' + label + '"?' + devText,
        confirmLabel: 'Alarmar',
        tone:         'danger',
        onConfirm:    apply
      });
    } else {
      apply();
    }
  }
  function _confirmReset(thresholdKey) {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    if (!aStore || !aStore.isLatched(equip.id, thresholdKey)) return;
    const def = UP_THRESHOLDS.filter(function (x) { return x.key === thresholdKey; })[0];
    const label = def ? def.label : thresholdKey;
    const apply = function () { aStore.reset(equip.id, thresholdKey); };
    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:        'Resetear alarma',
        message:      '¿Resetear "' + label + '"? Si la lectura sigue violando el umbral, volverá a alarmarse en el siguiente ciclo. La nota se perderá.',
        confirmLabel: 'Resetear',
        onConfirm:    apply
      });
    } else {
      apply();
    }
  }
  function _confirmResetAll() {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    if (!aStore) return;
    const keys = aStore.latchedKeys(equip.id);
    if (keys.length === 0) return;
    const apply = function () { aStore.resetAll(equip.id); };
    if (window.MX60 && MX60.Confirm) {
      MX60.Confirm.show({
        title:        'Reset de alarmas',
        message:      '¿Resetear ' + keys.length + ' alarma(s) latched? Cualquier umbral aún violado volverá a alarmarse. Las notas se perderán.',
        confirmLabel: 'Resetear todas',
        tone:         'danger',
        onConfirm:    apply
      });
    } else {
      apply();
    }
  }
  function _commitAlarmNote(thresholdKey) {
    const aStore = window.MX60 && MX60.AlarmLatchStore;
    if (!aStore || !aStore.isLatched(equip.id, thresholdKey)) return;
    const noteEl = alarmLatchNoteEls[thresholdKey];
    if (!noteEl) return;
    aStore.setNote(equip.id, thresholdKey, noteEl.value);
  }

  function commitThreshold(thresholdKey) {
    const store = window.MX60 && MX60.UpThresholdStore;
    if (!store) return;
    const inp = thresholdInputs[thresholdKey];
    if (!inp) return;
    const raw = (inp.value || '').trim();
    const newVal = (raw === '') ? null : parseFloat(raw);
    if (newVal !== null && isNaN(newVal)) {
      const cur = store.get(equip.id, thresholdKey);
      inp.value = (cur === null || cur === undefined) ? '' : String(cur);
      return;
    }
    const prior = store.get(equip.id, thresholdKey);
    // No-op when value didn't change vs prior.
    if (newVal === prior) return;

    const def = UP_THRESHOLDS.filter(function (x) { return x.key === thresholdKey; })[0];
    const label = def ? def.label : thresholdKey;
    const unit  = def ? def.unit  : '';
    const message = (newVal === null)
      ? '¿Borrar ' + label + '? Quedará sin protección configurada.'
      : '¿Confirmar ' + label + ' = ' + newVal + ' ' + unit + '?';

    function _apply() {
      // D3: Optimistic update — store first, then write. Rollback on failure (REQ-008).
      if (newVal === null) store.remove(equip.id, thresholdKey);
      else store.set(equip.id, thresholdKey, newVal);
      if (equip.ord) {
        MX60.writePoint(equip.ord + '/' + thresholdKey, newVal)
          .catch(function() {
            // Rollback: revert store to prior value and reset input.
            if (prior === null || prior === undefined) store.remove(equip.id, thresholdKey);
            else store.set(equip.id, thresholdKey, prior);
            inp.value = (prior === null || prior === undefined) ? '' : String(prior);
            // Toast already shown by writePoint helper.
          });
      }
    }
    function _revert() {
      inp.value = (prior === null || prior === undefined) ? '' : String(prior);
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

  function onThresholdInputType(e) {
    const v = e.target.value;
    // Allow digits, optional decimal, optional leading minus (antifrezze can be negative).
    if (!/^-?\d*\.?\d*$/.test(v)) {
      e.target.value = v.replace(/[^\d.\-]/g, '').replace(/(\..*)\./g, '$1');
    }
  }
  const thresholdHandlers = {};
  for (let i = 0; i < UP_THRESHOLDS.length; i++) {
    const k = UP_THRESHOLDS[i].key;
    const inp = thresholdInputs[k];
    if (!inp) continue;
    const focusFn = (function (key) { return function () { thresholdFocused[key] = true; }; })(k);
    const blurFn  = (function (key) { return function () {
      thresholdFocused[key] = false;
      commitThreshold(key);
    }; })(k);
    const keyFn   = (function (input) { return function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    }; })(inp);
    inp.addEventListener('input',   onThresholdInputType, false);
    inp.addEventListener('focus',   focusFn,              false);
    inp.addEventListener('blur',    blurFn,               false);
    inp.addEventListener('keydown', keyFn,                false);
    thresholdHandlers[k] = { focus: focusFn, blur: blurFn, key: keyFn };
  }

  function onThresholdsToggle() {
    if (!thresholdsBody || !thresholdsToggle) return;
    const isOpen = !thresholdsBody.hasAttribute('hidden');
    if (isOpen) {
      thresholdsBody.setAttribute('hidden', '');
      thresholdsToggle.setAttribute('aria-expanded', 'false');
      if (thresholdsSection) thresholdsSection.classList.remove('is-open');
    } else {
      thresholdsBody.removeAttribute('hidden');
      thresholdsToggle.setAttribute('aria-expanded', 'true');
      if (thresholdsSection) thresholdsSection.classList.add('is-open');
    }
  }
  if (thresholdsToggle) {
    thresholdsToggle.addEventListener('click', onThresholdsToggle, false);
  }

  const unsubscribeUpThresholds = (window.MX60 && MX60.UpThresholdStore)
    ? MX60.UpThresholdStore.subscribe(function (evt) {
        if (!evt || evt.equipId !== equip.id) return;
        renderThresholdInputs();
        renderThresholdDots(_currentEquip());
      })
    : function () {};

  // ----- Alarm button + reset-all + note wiring -----------------------
  const alarmBtnHandlers = {};
  const alarmNoteHandlers = {};
  for (let i = 0; i < UP_THRESHOLDS.length; i++) {
    const k = UP_THRESHOLDS[i].key;
    const btn = alarmBtnEls[k];
    if (btn) {
      const h = (function (key) {
        return function () {
          const aStore = window.MX60 && MX60.AlarmLatchStore;
          if (aStore && aStore.isLatched(equip.id, key)) _confirmReset(key);
          else _confirmManualLatch(key);
        };
      })(k);
      btn.addEventListener('click', h, false);
      alarmBtnHandlers[k] = h;
    }
    const noteEl = alarmLatchNoteEls[k];
    if (noteEl) {
      const focusFn = (function (key) { return function () { alarmNoteFocused[key] = true; }; })(k);
      const blurFn  = (function (key) { return function () {
        alarmNoteFocused[key] = false;
        _commitAlarmNote(key);
      }; })(k);
      const keyFn = (function (key, el) { return function (e) {
        // Cmd/Ctrl+Enter commits; plain Enter inserts newline (typical textarea UX).
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          el.blur();
        }
      }; })(k, noteEl);
      noteEl.addEventListener('focus',   focusFn, false);
      noteEl.addEventListener('blur',    blurFn,  false);
      noteEl.addEventListener('keydown', keyFn,   false);
      alarmNoteHandlers[k] = { focus: focusFn, blur: blurFn, key: keyFn };
    }
  }
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', _confirmResetAll, false);
  }

  const unsubscribeAlarmLatch = (window.MX60 && MX60.AlarmLatchStore)
    ? MX60.AlarmLatchStore.subscribe(function (evt) {
        if (!evt) return;
        // Per-equipId events (latch/reset): only re-render when this UP is the target.
        // Store-wide events (seed): equipId is absent — re-render unconditionally so
        // periodic seedFromEquipment reconciles the threshold rows here too.
        if (evt.equipId && evt.equipId !== equip.id) return;
        renderLatchUI();
        renderThresholdDots(_currentEquip());
        renderAllDeviceBadges(_currentEquip());
        // Re-derive the 3D scene state — alarm latches override base on/off
        // and recolor the corresponding compressor + condenser fans red.
        state = deriveStateFromEquip(_currentEquip());
        applyState();
        // Header status pill (Alarma / Prendido / En espera / ...) reads the
        // effective status — re-paint when latches change.
        setStatusBlock(_currentEquip());
      })
    : function () {};

  // Initial paint
  renderThresholdInputs();
  renderThresholdDots(_currentEquip());
  renderLatchUI();

  // ----- Modo de Operación — casino-style click buttons + toast undo ------
  // No drag-drop; the three big mode buttons in Control de Sistemas are
  // pure clicks. Same setMode SSoT, same Toast persistence path.
  const modoBtnEls = container.querySelectorAll('[data-modo]');
  const VALID_MODOS = ['MANUAL', 'SETPOINT', 'SCHEDULE'];
  function _initialMode() {
    if (window.MX60 && MX60.ModoOverrideStore) {
      const ov = MX60.ModoOverrideStore.get(equip.id);
      if (ov && VALID_MODOS.indexOf(ov) >= 0) return ov;
    }
    const m = (equip.summary && equip.summary.modoOperacion) || '';
    return VALID_MODOS.indexOf(m) >= 0 ? m : 'SCHEDULE';
  }
  let activeModo = _initialMode();
  function applyActiveModo(modo) {
    activeModo = modo;
    for (let i = 0; i < modoBtnEls.length; i++) {
      const b = modoBtnEls[i];
      if (b.getAttribute('data-modo') === modo) b.classList.add('is-active');
      else b.classList.remove('is-active');
    }
    // Device badges enable/disable depend on activeModo — re-render and
    // sync the .up-devices container affordance.
    if (devicesContainerEl) {
      if (modo === 'MANUAL') devicesContainerEl.classList.remove('is-locked');
      else devicesContainerEl.classList.add('is-locked');
    }
    // REQ-CS2: Show setpoint section only in SETPOINT mode (fail-closed per ADR-4).
    if (setpointSectionEl) {
      if (modo === 'SETPOINT') setpointSectionEl.classList.remove('is-hidden');
      else setpointSectionEl.classList.add('is-hidden');
    }
    // Show schedule section (Editar Horario CTA) only in SCHEDULE mode.
    if (scheduleSectionEl) {
      if (modo === 'SCHEDULE') scheduleSectionEl.classList.remove('is-hidden');
      else scheduleSectionEl.classList.add('is-hidden');
    }
    // Hide left setpoint-display panel entirely in MANUAL mode (no setpoint
    // applies). Visible in SETPOINT and SCHEDULE (operator needs to see the
    // current effective setpoint). Per user UX decision in SDD proposal §D1.
    if (setpointDisplayPanelEl) {
      if (modo === 'MANUAL') setpointDisplayPanelEl.classList.add('is-hidden');
      else setpointDisplayPanelEl.classList.remove('is-hidden');
    }
    renderAllDeviceBadges(_currentEquip());
  }
  applyActiveModo(activeModo);

  function setMode(newModo) {
    if (!newModo || VALID_MODOS.indexOf(newModo) < 0) return;
    if (newModo === activeModo) return;
    const previousModo = activeModo;
    applyActiveModo(newModo);
    if (window.MX60 && MX60.Toast) {
      MX60.Toast.show({
        message: 'Modo cambiado a ' + newModo,
        undoLabel: 'Deshacer',
        durationMs: 5000,
        onUndo: function() { applyActiveModo(previousModo); },
        onCommit: function() {
          if (MX60.ModoOverrideStore) MX60.ModoOverrideStore.set(equip.id, newModo);
          if (equip.ord) {
            MX60.writePoint(equip.ord + '/modoOperacion', newModo)
              .catch(function() { /* toast already shown by helper */ });
          }
          // Leaving MANUAL → discard manual device overrides so backend
          // (fanCmd / comp1Cmd / comp2Cmd) takes over again.
          if (newModo !== 'MANUAL' && MX60.OutputOverrideStore) {
            MX60.OutputOverrideStore.clear(equip.id);
          }
        }
      });
    } else {
      if (MX60.ModoOverrideStore) MX60.ModoOverrideStore.set(equip.id, newModo);
      if (newModo !== 'MANUAL' && MX60.OutputOverrideStore) {
        MX60.OutputOverrideStore.clear(equip.id);
      }
    }
  }

  // One handler per button — closure captures the modo value.
  const modoClickHandlers = [];
  for (let i = 0; i < modoBtnEls.length; i++) {
    const handler = (function(btn) {
      return function() { setMode(btn.getAttribute('data-modo')); };
    })(modoBtnEls[i]);
    modoClickHandlers.push(handler);
    modoBtnEls[i].addEventListener('click', handler, false);
  }

  // ----- Analytics — temp cards (gauge + bigvalue) + 2 trend charts -------
  const tempCardEls = {};
  for (let i = 0; i < TEMP_GAUGES.length; i++) {
    const g = TEMP_GAUGES[i];
    tempCardEls[g.key] = container.querySelector('[data-temp-card="' + g.key + '"]');
  }
  function updateTempCard(g, equipFresh) {
    const card = tempCardEls[g.key];
    if (!card || !equipFresh) return;
    const v = (equipFresh.summary || {})[g.key];
    const color = tempColor(v);
    const gaugeWrap = card.querySelector('[data-temp-gauge]');
    if (gaugeWrap) gaugeWrap.innerHTML = _arcGaugeSvg(v, g.min, g.max, '°C', color, 80);
    const bigVal = card.querySelector('[data-prop-big="' + g.key + '"]');
    if (bigVal) {
      bigVal.textContent = (v == null || isNaN(v)) ? '—' : Number(v).toFixed(1);
      bigVal.style.color = color;
    }
    // Zona-only: re-render trend arrow + thread trend into status narrative.
    const trend = (g.narrative === 'setpointDiff') ? trendByKey[g.key] : null;
    const arrowEl = card.querySelector('[data-trend-arrow]');
    if (arrowEl && trend != null) {
      arrowEl.textContent = _trendArrow(trend);
      arrowEl.style.color = _trendArrowColor(trend);
    }
    const stEl = card.querySelector('[data-temp-status]');
    const stTextEl = card.querySelector('[data-temp-status-text]');
    if (stEl && stTextEl) {
      const st = _statusForGauge(g, equipFresh, trend);
      stEl.className = 'up-temp-status tone-' + st.tone;
      stTextEl.textContent = st.text;
    }
  }
  function updateAllTempCards(equipFresh) {
    if (!equipFresh) return;
    for (let i = 0; i < TEMP_GAUGES.length; i++) updateTempCard(TEMP_GAUGES[i], equipFresh);
  }

  // Trend charts — fullHistory was generated at the top of mount() so the
  // temp cards (Zona arrow) and the trend charts share the same data source.
  const trendState = {
    abastoRetorno: { range: DEFAULT_RANGE, baseline: false, chart: null },
    zona:          { range: DEFAULT_RANGE, baseline: false, chart: null },
    tempSuccion: { range: DEFAULT_RANGE, baseline: false, chart: null },
    delta:         { range: DEFAULT_RANGE, baseline: false, chart: null },
    amperajeComp:  { range: DEFAULT_RANGE, baseline: false, chart: null },
    amperajeFans:  { range: DEFAULT_RANGE, baseline: false, chart: null },
    amperajeFan:   { range: DEFAULT_RANGE, baseline: false, chart: null }
  };

  function _mainDataset(label, color, values) {
    // Strict casino TempTrendChart parity (PkgUnitLayout.jsx:386-400):
    // hide points when n>60 (not 100), tension 0.35, and rely on Chart.js
    // defaults for point fill/border so points show as plain solid circles
    // instead of MX60's previous "bubble with dark ring" look.
    const n = values.length;
    return {
      label: label,
      data: values,
      borderColor: color,
      backgroundColor: color + '12',
      borderWidth: 2,
      pointRadius: n > 60 ? 0 : 2,
      pointHoverRadius: 4,
      tension: 0.35,
      fill: true,
      spanGaps: true,
      order: 1
    };
  }
  function _baselineDataset(label, color, values) {
    return {
      label: label + ' (ayer)',
      data: values,
      borderColor: color + 'aa',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.35,
      fill: false,
      spanGaps: true,
      order: 2
    };
  }
  function buildAbastoRetorno(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _mainDataset('Abasto',  '#3b82f6', data.map(function(p) { return p.tempAbasto;  })),
      _mainDataset('Retorno', '#ef4444', data.map(function(p) { return p.tempRetorno; }))
    ];
    if (withBaseline) {
      datasets.push(
        _baselineDataset('Abasto',  '#3b82f6', baselineParallel(data, fullHistory, 'tempAbasto')),
        _baselineDataset('Retorno', '#ef4444', baselineParallel(data, fullHistory, 'tempRetorno'))
      );
    }
    return { labels: labels, datasets: datasets };
  }
  function buildZona(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    // Casino uses #f59e0b (amber) for the tempAmb line — contrasts cleanly
    // with the green comfort band underneath.
    const datasets = [
      _mainDataset('Zona', '#f59e0b', data.map(function(p) { return p.tempZona; }))
    ];
    if (withBaseline) {
      datasets.push(_baselineDataset('Zona', '#f59e0b', baselineParallel(data, fullHistory, 'tempZona')));
    }
    return { labels: labels, datasets: datasets };
  }
  function buildTempSuccion(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _mainDataset('Succión S1', '#14b8a6', data.map(function(p) { return p.tempSuccion1; })),
      _mainDataset('Succión S2', '#5eead4', data.map(function(p) { return p.tempSuccion2; }))
    ];
    if (withBaseline) {
      datasets.push(
        _baselineDataset('Succión S1', '#14b8a6', baselineParallel(data, fullHistory, 'tempSuccion1')),
        _baselineDataset('Succión S2', '#5eead4', baselineParallel(data, fullHistory, 'tempSuccion2'))
      );
    }
    return { labels: labels, datasets: datasets };
  }
  function buildDelta(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _mainDataset('ΔT (retorno − suministro)', '#22c55e', data.map(function(p) { return p.deltaAbastoRetorno; }))
    ];
    if (withBaseline) {
      datasets.push(_baselineDataset('ΔT', '#22c55e', baselineParallel(data, fullHistory, 'deltaAbastoRetorno')));
    }
    return { labels: labels, datasets: datasets };
  }
  // E-004: Amp dataset helper — identical to _mainDataset but adds yAxisID:'y1'
  // so the ampere series is plotted against the right axis (see chartOptionsFor y1 scale).
  function _ampDataset(label, color, values) {
    var ds = _mainDataset(label, color, values);
    ds.yAxisID = 'y1';
    return ds;
  }

  function buildAmpComp(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _ampDataset('Compresor S1', '#00f0ff', data.map(function(p) { return p.ampCompresor1; })),
      _ampDataset('Compresor S2', '#06b6d4', data.map(function(p) { return p.ampCompresor2; }))
    ];
    if (withBaseline) {
      datasets.push(_baselineDataset('Compresor S1', '#00f0ff', baselineParallel(data, fullHistory, 'ampCompresor1')));
      datasets.push(_baselineDataset('Compresor S2', '#06b6d4', baselineParallel(data, fullHistory, 'ampCompresor2')));
    }
    return { labels: labels, datasets: datasets };
  }
  function buildAmpFans(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _ampDataset('Abanico S1', '#c084fc', data.map(function(p) { return p.ampAbanicos1; })),
      _ampDataset('Abanico S2', '#a855f7', data.map(function(p) { return p.ampAbanicos2; }))
    ];
    if (withBaseline) {
      datasets.push(
        _baselineDataset('Abanico S1', '#c084fc', baselineParallel(data, fullHistory, 'ampAbanicos1')),
        _baselineDataset('Abanico S2', '#a855f7', baselineParallel(data, fullHistory, 'ampAbanicos2'))
      );
    }
    return { labels: labels, datasets: datasets };
  }
  function buildAmpFan(rangeId, withBaseline) {
    const data = filterHistoryByRange(fullHistory, rangeId);
    const labels = data.map(function(p) { return formatTimestamp(p.t, rangeId); });
    const datasets = [
      _ampDataset('FAN', '#fb923c', data.map(function(p) { return p.ampFan; }))
    ];
    if (withBaseline) {
      datasets.push(
        _baselineDataset('FAN', '#fb923c', baselineParallel(data, fullHistory, 'ampFan'))
      );
    }
    return { labels: labels, datasets: datasets };
  }
  function buildForTrend(trendId) {
    const st = trendState[trendId];
    if (trendId === 'abastoRetorno') return buildAbastoRetorno(st.range, st.baseline);
    if (trendId === 'zona')          return buildZona(st.range, st.baseline);
    if (trendId === 'tempSuccion') return buildTempSuccion(st.range, st.baseline);
    if (trendId === 'delta')         return buildDelta(st.range, st.baseline);
    if (trendId === 'amperajeComp')  return buildAmpComp(st.range, st.baseline);
    if (trendId === 'amperajeFans')  return buildAmpFans(st.range, st.baseline);
    if (trendId === 'amperajeFan')   return buildAmpFan(st.range, st.baseline);
    return { labels: [], datasets: [] };
  }

  function chartOptionsFor(trendId) {
    const st = trendState[trendId];
    let bands = [];
    if (trendId === 'abastoRetorno') {
      bands = [{ min: COMFORT.tempAbasto.min, max: COMFORT.tempAbasto.max,
        color: 'rgba(34,197,94,0.14)', label: 'Zona de confort 14-22°C', textColor: 'rgba(34,197,94,0.75)' }];
    } else if (trendId === 'zona') {
      bands = [{ min: COMFORT.tempZona.min, max: COMFORT.tempZona.max,
        color: 'rgba(34,197,94,0.16)', label: 'Confort 20-24°C', textColor: 'rgba(34,197,94,0.8)' }];
    }
    const unit  = (trendId === 'amperajeComp' || trendId === 'amperajeFans' || trendId === 'amperajeFan') ? 'A' : '°C';
    const yMin  = (trendId === 'amperajeComp') ? 0
                : (trendId === 'amperajeFans') ? 0
                : (trendId === 'amperajeFan')  ? 0
                : (trendId === 'delta')        ? 0
                : (trendId === 'zona')         ? 18
                : 12;
    const yMax  = (trendId === 'amperajeComp') ? 18
                : (trendId === 'amperajeFans') ? 6
                : (trendId === 'amperajeFan')  ? 6
                : (trendId === 'delta')        ? 14
                : (trendId === 'zona')         ? 28
                : 32;
    const unitFmt = unit === 'A' ? function(v) { return v.toFixed(1) + ' A'; } : function(v) { return v.toFixed(0) + '°'; };
    // CP3: pull chrome (tooltip + scale colours) from ChartTheme — centralised
    // palette shared with CarcamoDetail and DataloggerDetail.
    const _ch = (window.MX60 && MX60.ChartTheme) ? MX60.ChartTheme.chrome(_upCurrentTheme) : null;
    const _tp = _ch ? _ch.tooltip : {};
    const _sc = _ch ? _ch.scales  : {};
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        comfortBand: { bands: bands },
        htmlLegend: { containerId: trendId },
        legend: {
          // Hidden — we render our own HTML legend via htmlLegendPlugin so
          // we can force a 2-column grid when 4 datasets (live + baseline)
          // don't fit a single line in narrow cards.
          display: false,
          labels: {
            color: '#64748b',
            font: { family: 'Inter, system-ui, sans-serif', size: 11 },
            boxWidth: 12,
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
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
              return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + (unit === 'A' ? ' A' : '°C');
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: (_sc.x && _sc.x.ticks) ? _sc.x.ticks.color : '#64748b',
            font: { family: 'JetBrains Mono, monospace', size: 10 },
            maxTicksLimit: st.range === '7d' ? 7 : 10,
            maxRotation: 0
          },
          grid:   { color: (_sc.x && _sc.x.grid)   ? _sc.x.grid.color   : 'rgba(255,255,255,0.04)' },
          border: { color: (_sc.x && _sc.x.border) ? _sc.x.border.color : 'rgba(255,255,255,0.08)' }
        },
        y: {
          // Force the visible range to always include the comfort band so the
          // green strip + label are guaranteed to be drawn inside the chart.
          suggestedMin: yMin,
          suggestedMax: yMax,
          ticks: {
            color: (_sc.y && _sc.y.ticks) ? _sc.y.ticks.color : '#64748b',
            font: { family: 'JetBrains Mono, monospace', size: 10 },
            callback: unitFmt
          },
          grid:   { color: (_sc.y && _sc.y.grid)   ? _sc.y.grid.color   : 'rgba(255,255,255,0.04)' },
          border: { color: (_sc.y && _sc.y.border) ? _sc.y.border.color : 'rgba(255,255,255,0.08)' }
        },
        // E-003: Right axis for ampere datasets — only visible when ampere
        // datasets with yAxisID:'y1' are present (display:'auto').
        // comfortBandPlugin uses chart.scales.y (left axis) — must NOT rename y.
        y1: {
          type:        'linear',
          position:    'right',
          display:     'auto',
          beginAtZero: true,
          ticks: {
            color: (_sc.y1 && _sc.y1.ticks) ? _sc.y1.ticks.color : '#64748b',
            font: { family: 'JetBrains Mono, monospace', size: 10 },
            callback: function(v) { return v.toFixed(1) + ' A'; }
          },
          grid:   { drawOnChartArea: false },
          border: { color: (_sc.y1 && _sc.y1.border) ? _sc.y1.border.color : 'rgba(255,255,255,0.08)' }
        }
      }
    };
  }

  function createChart(canvas, trendId) {
    if (!canvas || !window.Chart) return null;
    // SDD perf v4 — pre-cache canvas dimensions ANTES de Chart.js init.
    // Chart.js init normalmente llama getMaximumSize → getComputedStyle ×3 +
    // getBoundingClientRect ×3 + clientWidth ×1 = 7 forced reflows POR chart.
    // Por 7 charts inicializando = 49 reflows (los 5 violations
    // "Forced reflow took 300-500ms" del profile DevTools).
    // Setear dims explícitas evita el _resize/getMaximumSize interno.
    try {
      const parent = canvas.parentElement;
      const w = (parent && parent.clientWidth)  || 400;
      const h = (parent && parent.clientHeight) || 200;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    } catch (e) { /* fallback Chart.js default sizing */ }
    const chart = new window.Chart(canvas, {
      type: 'line',
      plugins: [comfortBandPlugin, htmlLegendPlugin],
      data: buildForTrend(trendId),
      options: chartOptionsFor(trendId)
    });
    // SDD mx60-detail-charts-parity WU2: subscribe this chart to the
    // CursorParity bus. viewId is shared across all 7 trend charts of THIS
    // UpDetail instance (one equipment), so hovering one chart syncs the
    // vertical cursor line on the others — gated by D4 (only when all 7
    // trend charts share the same range; the plugin clears the overlay
    // when ranges diverge).
    if (window.MX60 && MX60.CursorParity && MX60.CursorParity.attachToChart) {
      try {
        chart._cursorUnsub = MX60.CursorParity.attachToChart(
          chart,
          'up-' + (equip && equip.id ? equip.id : 'unknown'),
          function () {
            const st = trendState[trendId];
            return (st && st.range) ? st.range : 'unknown';
          }
        );
      } catch (e) { /* plugin optional — never block chart creation */ }
    }
    return chart;
  }
  function rebuildChart(trendId) {
    const st = trendState[trendId];
    if (!st || !st.chart) return;
    const dataObj = buildForTrend(trendId);
    // maxTicksLimit depends on range — refresh it without rebuilding the chart.
    if (st.chart.options && st.chart.options.scales && st.chart.options.scales.x) {
      st.chart.options.scales.x.ticks.maxTicksLimit = st.range === '7d' ? 7 : 10;
    }
    // E-002: In-place dataset update when count matches — avoids Chart.js
    // internal animation state reset and prevents the "flicker" caused by
    // replacing the datasets array reference entirely.
    // Fallback to full replace when baseline toggle adds/removes lines (count change).
    const existingDatasets = st.chart.data.datasets;
    const newDatasets = dataObj.datasets;
    st.chart.data.labels = dataObj.labels;
    if (existingDatasets && newDatasets && existingDatasets.length === newDatasets.length) {
      for (var _i = 0; _i < newDatasets.length; _i++) {
        existingDatasets[_i].data = newDatasets[_i].data;
      }
    } else {
      st.chart.data.datasets = newDatasets;
    }
    st.chart.update('none');
  }

  // OP1 — Incremental live append (replaces forEach(rebuildChart) in onDataChange).
  // Pushes ONLY the latest fullHistory entry into each chart's existing datasets,
  // trims to MAX_CHART_POINTS, and calls chart.update('none') (no animation).
  // O(1) per chart per notify instead of O(N) full rebuild.
  //
  // SAFETY NETS:
  //   1. baseline ON → fallback to rebuildChart (baseline math depends on full history)
  //   2. fullHistory empty → no-op
  //   3. trim labels + ALL datasets atomically (prevents desync)
  //   4. try/catch wraps everything → on ANY error, falls back to rebuildChart
  //
  // rebuildChart is STILL used for: range tab change, baseline toggle, history load.
  // This function only runs in the live-update path of onDataChange.
  const TREND_SLOT_KEYS = {
    'abastoRetorno': ['tempAbasto', 'tempRetorno'],
    'zona':          ['tempZona'],
    'tempSuccion':   ['tempSuccion1', 'tempSuccion2'],
    'delta':         ['deltaAbastoRetorno'],
    'amperajeComp':  ['ampCompresor1', 'ampCompresor2'],
    'amperajeFans':  ['ampAbanicos1', 'ampAbanicos2'],
    'amperajeFan':   ['ampFan']
  };
  const MAX_CHART_POINTS = 200;

  function _appendLiveSample(trendId) {
    try {
      const st = trendState[trendId];
      if (!st || !st.chart) return;
      // SAFETY NET 1: baseline ON requires full rebuild.
      if (st.baseline) { rebuildChart(trendId); return; }
      // SAFETY NET 2: empty history.
      if (!fullHistory || fullHistory.length === 0) return;

      const lastEntry = fullHistory[fullHistory.length - 1];
      const slotKeys = TREND_SLOT_KEYS[trendId];
      if (!slotKeys || !lastEntry) return;
      // Defensive: chart datasets must exist (initial mount complete).
      if (!st.chart.data || !st.chart.data.labels || !st.chart.data.datasets) return;
      // If chart was never populated (initial empty), fallback to rebuild
      // so the dataset structure is created by buildForTrend properly.
      if (st.chart.data.datasets.length === 0) {
        rebuildChart(trendId);
        return;
      }

      // Push label + values for each slot (only main datasets, not baseline).
      const newLabel = formatTimestamp(lastEntry.t, st.range);
      st.chart.data.labels.push(newLabel);
      for (let i = 0; i < slotKeys.length; i++) {
        const ds = st.chart.data.datasets[i];
        if (!ds || !ds.data) continue;
        const v = lastEntry[slotKeys[i]];
        ds.data.push(v != null && !isNaN(v) ? Number(v) : null);
      }

      // SAFETY NET 3: trim labels + ALL datasets atomically.
      while (st.chart.data.labels.length > MAX_CHART_POINTS) {
        st.chart.data.labels.shift();
        for (let j = 0; j < st.chart.data.datasets.length; j++) {
          if (st.chart.data.datasets[j] && st.chart.data.datasets[j].data) {
            st.chart.data.datasets[j].data.shift();
          }
        }
      }

      // SAFETY NET 4: chart.update('none') — no animation, fast path.
      st.chart.update('none');
    } catch (e) {
      // ANY error → fallback to known-good rebuild path.
      console.warn('[UpDetail] _appendLiveSample fallback to rebuild for ' + trendId + ':', e.message);
      rebuildChart(trendId);
    }
  }

  function setRange(trendId, rangeId) {
    const st = trendState[trendId];
    if (!st || st.range === rangeId) return;
    st.range = rangeId;
    rebuildChart(trendId);
  }
  function toggleBaseline(trendId) {
    const st = trendState[trendId];
    if (!st) return;
    st.baseline = !st.baseline;
    rebuildChart(trendId);
  }

  ['abastoRetorno', 'zona', 'tempSuccion', 'delta', 'amperajeComp', 'amperajeFans', 'amperajeFan'].forEach(function(id) {
    const canvasEl = container.querySelector('[data-trend-canvas="' + id + '"]');
    if (canvasEl) trendState[id].chart = createChart(canvasEl, id);
  });

  // Range tab listeners (delegated per .up-range-tabs container)
  const rangeContainerEls = container.querySelectorAll('.up-range-tabs');
  function onRangeTabClick(e) {
    const btn = e.target;
    if (!btn || !btn.getAttribute) return;
    const range = btn.getAttribute('data-range');
    if (!range) return;
    const wrap = btn.parentNode;
    const trendId = wrap.getAttribute('data-trend');
    if (!trendId) return;
    const tabs = wrap.querySelectorAll('.up-range-tab');
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-range') === range) tabs[i].classList.add('is-active');
      else tabs[i].classList.remove('is-active');
    }
    // Update trendState range (for filterHistoryByRange inside rebuildChart)
    setRange(trendId, range);
    // If range changed, re-fetch /api/historyData for the new window.
    // Does NOT re-fetch /api/equipment-histories (already cached in HistoryIndex).
    // Does NOT remount.
    if (range !== _currentHistoryRange) {
      _currentHistoryRange = range;
      // Also update all other trendState entries to the same range
      ALL_TREND_IDS.forEach(function(id) {
        if (trendState[id] && id !== trendId) trendState[id].range = range;
      });
      _loadRealHistory(equip, range)
        .then(_applyHistoryResult)
        .catch(function(err) {
          console.error('[UpDetail] history fetch falló para range=' + range + ':', err);
          if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
            MX60.Toast.warn('No se pudo cargar el histórico — mostrando datos en vivo');
          }
        });
    }
  }
  for (let i = 0; i < rangeContainerEls.length; i++) {
    rangeContainerEls[i].addEventListener('click', onRangeTabClick, false);
  }

  // Baseline ("Ayer") toggle listeners
  const baselineBtnEls = container.querySelectorAll('[data-baseline]');
  function onBaselineClick(e) {
    const btn = e.currentTarget;
    const trendId = btn.getAttribute('data-baseline');
    if (!trendId) return;
    toggleBaseline(trendId);
    if (trendState[trendId].baseline) btn.classList.add('is-active');
    else btn.classList.remove('is-active');
  }
  for (let i = 0; i < baselineBtnEls.length; i++) {
    baselineBtnEls[i].addEventListener('click', onBaselineClick, false);
  }

  // ----- Auto-rotate toggle button -----------------------------------------
  const rotateBtn = container.querySelector('[data-action="toggle-rotate"]');
  function onToggleRotate() {
    controls.autoRotate = !controls.autoRotate;
    if (controls.autoRotate) {
      rotateBtn.classList.add('is-on');
      rotateBtn.classList.remove('is-off');
      rotateBtn.textContent = '↻ Rotar: ON';
    } else {
      rotateBtn.classList.add('is-off');
      rotateBtn.classList.remove('is-on');
      rotateBtn.textContent = '↻ Rotar: OFF';
    }
  }
  if (rotateBtn) rotateBtn.addEventListener('click', onToggleRotate, false);

  // ----- Edit Schedule button (per-UP) -------------------------------------
  // Reuse ScheduleView modal pattern (SAN LUIS style) — opens the WebScheduler
  // inside an iframe modal within the dashboard, NOT a new tab. Falls back to
  // _blank only if ScheduleView module is not yet loaded (defensive).
  const editScheduleBtn = container.querySelector('[data-action="edit-schedule"]');
  if (editScheduleBtn) {
    editScheduleBtn.addEventListener('click', function() {
      if (!equip.scheduleOrd) return;
      const sv = window.MX60 && window.MX60.ScheduleView;
      const title = 'Horario · ' + (equip.label || equip.name || equip.id);
      if (sv && typeof sv.openEditorByOrd === 'function') {
        sv.openEditorByOrd(equip.scheduleOrd, 'view:schedule:WebScheduler', title);
      } else {
        const url = '/ord/' + encodeURI(equip.scheduleOrd + '|view:schedule:WebScheduler') + '?fullScreen=true';
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }, false);
  }

  // ----- EquipmentData listener (auto-update state on poll) ----------------
  // T2.6 (Sprint 2): el handler principal es onFlush, que recibe payload throttled
  // del EquipmentSnapshotStore (RAF + 500ms cap). Estructurado en 2 fases explicitas
  // (READS / WRITES) para evitar el anti-pattern #6 de Perplexity — mezclar DOM reads,
  // DOM writes, scene mutations 3D y chart updates en el mismo macrotask por cada poll.
  function onFlush(payload) {
    const fresh = payload && payload.latest;
    if (!fresh) return;

    // ===== FASE 1 — READS y derivaciones (cero DOM, cero scene mutation) =====
    const newState = deriveStateFromEquip(fresh);
    const stateChanged = newState.fan !== state.fan
                      || newState.c1  !== state.c1
                      || newState.c2  !== state.c2;
    // Recompute the trend arrow (↑/→/↓) for live data BEFORE rendering temp
    // cards. Without this, trendByKey.tempZona is only refreshed on history
    // loads / range changes, so the arrow shows the historical slope rather
    // than the slope of the last few live samples — visibly stale.
    trendByKey.tempZona = _computeTrend(fullHistory, 'tempZona');
    const sm = fresh.summary || {};
    const tNow = Date.now();
    const ab = sm.tempAbasto  != null ? Number(sm.tempAbasto)  : null;
    const re = sm.tempRetorno != null ? Number(sm.tempRetorno) : null;
    const newSample = {
      t: tNow,
      tempZona:    sm.tempZona    != null ? Number(sm.tempZona)    : null,
      tempAbasto:  ab,
      tempRetorno: re,
      tempSuccion1: sm.tempSuccion1 != null ? Number(sm.tempSuccion1) : null,
      tempSuccion2: sm.tempSuccion2 != null ? Number(sm.tempSuccion2) : null,
      ampCompresor1: sm.ampCompresor1 != null ? Number(sm.ampCompresor1) : null,
      ampCompresor2: sm.ampCompresor2 != null ? Number(sm.ampCompresor2) : null,
      ampAbanicos1:  sm.ampAbanicos1  != null ? Number(sm.ampAbanicos1)  : null,
      ampAbanicos2:  sm.ampAbanicos2  != null ? Number(sm.ampAbanicos2)  : null,
      ampFan:        sm.ampFan        != null ? Number(sm.ampFan)        : null,
      deltaAbastoRetorno: (ab != null && re != null) ? Math.round((re - ab) * 10) / 10 : null
    };

    // ===== FASE 2 — WRITES batched (DOM + 3D scene + memoria + charts) =====
    if (stateChanged) {
      state = newState;
      applyState();                              // 3D scene mutation
    }
    updateSidePanel(fresh);                       // DOM writes
    updateAllTempCards(fresh);                    // DOM writes (top consumer pre-T2.6: 2167ms self-time)
    fullHistory.push(newSample);                  // memoria
    // P5 perf: instead of shift() (O(N) re-alloc on every push when at cap),
    // batch-trim with splice(0, 100). Amortizes the O(N) cost — only re-allocs
    // every 100 pushes once the cap is reached.
    if (fullHistory.length > _maxHistoryEntries(_currentHistoryRange) + 600) {
      fullHistory.splice(0, 100);
    }
    // OP1 perf: incremental append per chart instead of full rebuild.
    // _appendLiveSample is O(1) per chart (push + trim) vs O(N) of rebuildChart.
    // Range tab change + baseline toggle + history load STILL use rebuildChart.
    ['abastoRetorno', 'zona', 'tempSuccion', 'delta', 'amperajeComp', 'amperajeFans', 'amperajeFan'].forEach(_appendLiveSample);
  }

  // Legacy listener — solo se engancha cuando EquipmentSnapshotStore NO esta disponible
  // (deploy fallback). Adapta el dataState completo de EquipmentData al payload de onFlush.
  function onDataChange(dataState) {
    const fresh = dataState.byId[equip.id];
    if (!fresh) return;
    onFlush({ latest: fresh, ringBuffer: [], deltaMs: null });
  }

  // T2.6 wiring: subscribe via EquipmentSnapshotStore (throttled). Fallback al pattern
  // viejo (addListener directo) si el store no esta cargado, para que el modulo no se
  // rompa si index.html no incluyo EquipmentSnapshotStore.js.
  const unsubscribeSnapshotStore = (window.MX60 && MX60.EquipmentSnapshotStore && typeof MX60.EquipmentSnapshotStore.subscribe === 'function')
    ? MX60.EquipmentSnapshotStore.subscribe(equip.id, onFlush)
    : null;
  if (unsubscribeSnapshotStore) {
    // Primer paint sin esperar 500ms: si el store ya tiene snapshot, despacha sync.
    if (typeof MX60.EquipmentSnapshotStore.flushNow === 'function') {
      MX60.EquipmentSnapshotStore.flushNow(equip.id);
    }
  } else if (MX60.EquipmentData && MX60.EquipmentData.addListener) {
    console.warn('[UpDetail] EquipmentSnapshotStore no disponible — fallback a addListener directo (sin throttle).');
    MX60.EquipmentData.addListener(onDataChange);
  }

  // ----- Destroy -----------------------------------------------------------
  function destroy() {
    disposed = true;
    cancelAnimationFrame(rafId);
    // CP3: unsubscribe from ThemeStore (GATE-1a).
    if (_themeUnsub && window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.unsubscribe === 'function') {
      try { MX60.ThemeStore.unsubscribe(_themeUnsub); } catch (e) {}
      _themeUnsub = null;
    }
    // T1.3 cleanup: dejar de observar viewport.
    if (_viewerIO) { try { _viewerIO.disconnect(); } catch (e) {} _viewerIO = null; }
    // T2.0.6: reanudar header particle al salir del UpDetail. Temprano en destroy()
    // para que si algun cleanup posterior falla, el header no quede pausado.
    if (MX60.ParticleAnimation && typeof MX60.ParticleAnimation.resume === 'function') {
      MX60.ParticleAnimation.resume();
    }
    window.removeEventListener('resize', resize, false);
    // T2.6: unsubscribe del store si estaba activo. removeListener queda como
    // no-op si nunca se hizo addListener directo (el path comun, store activo).
    if (typeof unsubscribeSnapshotStore === 'function') {
      unsubscribeSnapshotStore();
    }
    if (MX60.EquipmentData && MX60.EquipmentData.removeListener) {
      MX60.EquipmentData.removeListener(onDataChange);
    }
    if (spInput) {
      spInput.removeEventListener('input',   onSpInput,   false);
      spInput.removeEventListener('keydown', onSpKeyDown, false);
      spInput.removeEventListener('focus',   onSpFocus,   false);
      spInput.removeEventListener('blur',    onSpBlur,    false);
    }

    // Modo buttons cleanup
    for (let i = 0; i < modoBtnEls.length; i++) {
      if (modoClickHandlers[i]) {
        modoBtnEls[i].removeEventListener('click', modoClickHandlers[i], false);
      }
    }

    // Device toggles cleanup
    if (devicesContainerEl) {
      devicesContainerEl.removeEventListener('click', onDeviceToggleClick, false);
    }
    if (typeof unsubscribeOutputOverride === 'function') unsubscribeOutputOverride();

    // Umbrales section cleanup
    if (thresholdsToggle) {
      thresholdsToggle.removeEventListener('click', onThresholdsToggle, false);
    }
    for (const tk in thresholdHandlers) {
      if (Object.prototype.hasOwnProperty.call(thresholdHandlers, tk)) {
        const inp = thresholdInputs[tk];
        const h = thresholdHandlers[tk];
        if (inp && h) {
          inp.removeEventListener('input',   onThresholdInputType, false);
          inp.removeEventListener('focus',   h.focus,              false);
          inp.removeEventListener('blur',    h.blur,               false);
          inp.removeEventListener('keydown', h.key,                false);
        }
      }
    }
    if (typeof unsubscribeUpThresholds === 'function') unsubscribeUpThresholds();

    // Alarm latch UI cleanup
    for (const ak in alarmBtnHandlers) {
      if (Object.prototype.hasOwnProperty.call(alarmBtnHandlers, ak)) {
        const btn = alarmBtnEls[ak];
        if (btn) btn.removeEventListener('click', alarmBtnHandlers[ak], false);
      }
    }
    for (const nk in alarmNoteHandlers) {
      if (Object.prototype.hasOwnProperty.call(alarmNoteHandlers, nk)) {
        const noteEl = alarmLatchNoteEls[nk];
        const h = alarmNoteHandlers[nk];
        if (noteEl && h) {
          noteEl.removeEventListener('focus',   h.focus, false);
          noteEl.removeEventListener('blur',    h.blur,  false);
          noteEl.removeEventListener('keydown', h.key,   false);
        }
      }
    }
    if (resetAllBtn) resetAllBtn.removeEventListener('click', _confirmResetAll, false);
    if (typeof unsubscribeAlarmLatch === 'function') unsubscribeAlarmLatch();

    if (rotateBtn) rotateBtn.removeEventListener('click', onToggleRotate, false);
    for (let i = 0; i < rangeContainerEls.length; i++) {
      rangeContainerEls[i].removeEventListener('click', onRangeTabClick, false);
    }
    for (let i = 0; i < baselineBtnEls.length; i++) {
      baselineBtnEls[i].removeEventListener('click', onBaselineClick, false);
    }
    Object.keys(trendState).forEach(function(id) {
      if (trendState[id].chart) {
        // SDD mx60-detail-charts-parity WU2: unsubscribe from CursorParity
        // BEFORE chart.destroy() so the overlay <canvas> and event listeners
        // are removed cleanly without dangling refs.
        if (typeof trendState[id].chart._cursorUnsub === 'function') {
          try { trendState[id].chart._cursorUnsub(); } catch (e) {}
          trendState[id].chart._cursorUnsub = null;
        }
        try { trendState[id].chart.destroy(); } catch (e) {}
        trendState[id].chart = null;
      }
    });
    if (controls && controls.dispose) controls.dispose();
    // PMREM is shared (SharedEnv) — DO NOT dispose; other mounts need it.
    scene.traverse(obj => {
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      if (obj.material) {
        const arr = Array.isArray(obj.material) ? obj.material : [obj.material];
        arr.forEach(m => m && m.dispose && m.dispose());
      }
    });
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
    if (_historyIdleHandle && typeof cancelIdleCallback === 'function') {
      try { cancelIdleCallback(_historyIdleHandle); } catch (e) {}
    } else if (_historyIdleHandle) {
      // Fallback path used setTimeout; clear it.
      try { clearTimeout(_historyIdleHandle); } catch (e) {}
    }
  }

  // ----- Real history load -------------------------------------------------
  // Fetches /api/equipment-histories (cached) then /api/historyData in parallel
  // per slot. Populates fullHistory and rebuilds all 6 trend charts.
  // On range-tab click, refetches historyData for the new range (no remount).
  var _historyIdleHandle = null;
  var _currentHistoryRange = DEFAULT_RANGE;

  var ALL_TREND_IDS = ['abastoRetorno', 'zona', 'tempSuccion', 'delta', 'amperajeComp', 'amperajeFans', 'amperajeFan'];

  function _repaintAllCharts(histMap) {
    if (disposed) return;
    trendByKey.tempZona = _computeTrend(fullHistory, 'tempZona');
    // SDD perf v3: rebuilds escalonados con requestAnimationFrame en lugar de
    // forEach síncrono. Cada Chart.js init lee canvas dims (forced reflow);
    // 7 rebuilds en serie producían 5+ violations de "Forced reflow took
    // 300-500ms" = ~2s de layout thrashing. Con stagger uno por frame, el
    // browser paint entre cada chart, los reflows se distribuyen y se
    // amortizan en background sin bloquear la UI percibida.
    (function _staggeredRebuild(i) {
      if (disposed || i >= ALL_TREND_IDS.length) return;
      try { rebuildChart(ALL_TREND_IDS[i]); } catch (e) {
        console.warn('[UpDetail] rebuildChart ' + ALL_TREND_IDS[i] + ' error:', e);
      }
      // requestAnimationFrame escalona ~16ms entre rebuilds — 7 charts × 16ms = ~112ms
      // total, todo en background mientras user puede interactuar.
      requestAnimationFrame(function() { _staggeredRebuild(i + 1); });
    })(0);
    // Refresh temp cards so the Zona trend arrow appears.
    const equipFresh = (MX60.EquipmentData && typeof MX60.EquipmentData.getById === 'function')
      ? MX60.EquipmentData.getById(equip.id) || equip
      : equip;
    updateAllTempCards(equipFresh);

    // Hybrid-mode overlay logic (post-LiveHistoryBuffer patch):
    //
    //   Show overlay ONLY when BOTH of these are true:
    //     1. No backend historyIds found for this equip (histMap empty / bufferOnly)
    //     2. Buffer has < 5 samples (too sparse to render a meaningful line)
    //
    //   Overlay text:
    //     < 5 buffer samples → "Recolectando datos en vivo..."  (collecting)
    //     (legacy fallback, should not occur now) → original Spanish message
    //
    //   Individual missing slots (partial histMap) are handled gracefully by
    //   _mergeSeriesByTimestamp returning null for those columns — Chart.js
    //   renders them as gaps in the line.
    const buf         = window.MX60 && window.MX60.LiveHistoryBuffer;
    const bufCount    = buf ? buf.getCount(equip.id) : 0;
    const noBackend   = !histMap || Object.keys(histMap).length === 0;
    const bufferSparse = bufCount < 5;
    const showOverlay  = noBackend && bufferSparse;

    let noHistEl = container.querySelector('.up-no-history-overlay');
    if (showOverlay) {
      if (!noHistEl) {
        noHistEl = document.createElement('div');
        noHistEl.className = 'up-no-history-overlay';
        noHistEl.style.cssText = [
          'position:absolute', 'top:0', 'left:0', 'right:0', 'bottom:0',
          'display:flex', 'align-items:center', 'justify-content:center',
          'background:rgba(15,23,42,0.82)', 'border-radius:8px',
          'pointer-events:none', 'z-index:10'
        ].join(';');
        // Attach to the first trends section so it overlays the charts
        const trendsSection = container.querySelector('.up-trends-section');
        if (trendsSection) {
          trendsSection.style.position = 'relative';
          trendsSection.appendChild(noHistEl);
        }
      }
      // Update message to reflect buffer state (may change as samples accumulate)
      noHistEl.innerHTML = '<span style="color:#94a3b8;font-size:13px;text-align:center;padding:16px">' +
        'Recolectando datos en vivo…</span>';
    } else {
      if (noHistEl && noHistEl.parentNode) noHistEl.parentNode.removeChild(noHistEl);
    }
  }

  function _applyHistoryResult(result) {
    if (disposed) return;
    // Solo limpiar fullHistory si hay datos reales de reemplazo.
    // Un backend lento, slot sin BHistoryExt, ventana sin puntos persistidos,
    // o un error silencioso de _loadRealHistory NO debe borrar la data
    // acumulada por live notify ticks. Antes este código hacía
    // fullHistory.length = 0 incondicionalmente, lo que dejaba los 7 charts
    // en blanco simultáneamente al cambiar de rango si el backend no
    // respondía con rows. Los datos solo "regresaban" lentamente con cada
    // subscription tick.
    if (result && result.rows && result.rows.length > 0) {
      fullHistory.length = 0;
      Array.prototype.push.apply(fullHistory, result.rows);
    } else {
      console.warn('[UpDetail] _applyHistoryResult: backend devolvió rows vacíos — se mantiene data en vivo acumulada');
    }
    _repaintAllCharts(result ? result.histMap : null);
  }

  if (!disposed) {
    // Defer initial history load so the 3D scene and shell paint first.
    function _safeInitialHistoryLoad() {
      _loadRealHistory(equip, _currentHistoryRange)
        .then(_applyHistoryResult)
        .catch(function(err) {
          console.error('[UpDetail] initial history load falló:', err);
          if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
            MX60.Toast.warn('No se pudo cargar el histórico — mostrando datos en vivo');
          }
        });
    }
    _historyIdleHandle = (function() {
      if (typeof requestIdleCallback === 'function') {
        return requestIdleCallback(function() {
          _historyIdleHandle = null;
          if (disposed) return;
          _safeInitialHistoryLoad();
        }, { timeout: 300 });
      }
      return setTimeout(function() {
        _historyIdleHandle = null;
        if (disposed) return;
        _safeInitialHistoryLoad();
      }, 0);
    })();
  }

      // Staged setup completed — hook the inner destroy into the outer wrapper
      // so the EquipmentDetail dispatcher can tear us down at any time.
      _destroyImpl = destroy;
    } catch (e) {
      console.error('[UpDetail] staged setup error:', e);
    }
  })(); // _stagedSetup IIFE

  return {
    destroy: function() {
      _pageDisposed = true;
      if (_destroyImpl) {
        try { _destroyImpl(); } catch (e) { console.error('[UpDetail] destroy error:', e); }
      }
    }
  };
}

// =============================================================================
// Register with EquipmentDetail
// =============================================================================

MX60.UpDetail = { mount: mount };
if (MX60.EquipmentDetail && typeof MX60.EquipmentDetail.registerRenderer === 'function') {
  MX60.EquipmentDetail.registerRenderer('up', mount);
  // ES module loads after the IIFEs + initial Router dispatch. If we landed
  // directly on a detail page, the placeholder rendered first because this
  // renderer wasn't registered yet — force a re-dispatch so the real viewer
  // takes over now.
  if (location.hash && location.hash.indexOf('#detail/') === 0 &&
      MX60.Router && typeof MX60.Router.navigate === 'function') {
    MX60.Router.navigate(location.hash);
  }
}
