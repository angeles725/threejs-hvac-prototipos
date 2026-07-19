/**
 * Section content — pure HTML string builders for the DHL workbench.
 *
 * Layout direction (client, this round): Tablero is the ONLY section rendered in the dock
 * beside the 3D room; every other section renders as a FULL PAGE in the content area. The
 * builders stay pure strings either way — the shell decides where the HTML lands.
 *
 * Structure re-authored from the cinemex workbench (disenos/cinemex-hvac-lorawan/src/dock/
 * sections.mjs) for datacenter topology: same discipline, different data. Everything the
 * operator reads is es-MX, identifiers stay technical, all figures are DERIVED from the
 * deterministic sims (one tick in, one section out), and the builders never touch the DOM
 * or the scene. Honesty rules: simulated feeds say so, and empty states explain themselves.
 */
import { createEquipmentModel } from '../sim/equipment.mjs';
import {
  ALERT_CATEGORIES,
  WEEK_DAYS,
  createEnergyRollup,
  createMaintenanceModel,
  createSiteAlerts,
  createSiteWeather,
  createTrendSeries,
  deriveMaintenanceStatus,
} from '../sim/site.mjs';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

/** es-MX number grouping (shared by every "N unidades" / kWh readout). */
const esMx = (value) => Number(value).toLocaleString('es-MX');

/** NFD diacritic-insensitive lowercase fold — the search grammar for every toolbar table. */
const foldText = (value) => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MONTH_ABBR_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** ISO timestamp → "D MMM YYYY HH:MM" es-MX (the "Actualizado …" footer format). */
export function formatSimDateTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'N/D';
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTH_ABBR_ES[date.getUTCMonth()]} ${date.getUTCFullYear()} ${hh}:${mm}`;
}

/** RFC 4180 CSV field escaping — used by every `*RowsToCsv` serializer. */
const csvField = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

// ---------------------------------------------------------------------------
// Handcrafted inline SVG glyphs (visual fidelity pass, 2026-07-18): one 24px grid, one 2px
// stroke, currentColor everywhere — the B43 tokens drive every color. No icon fonts, no
// libraries; each path is authored here for the DHL room's own equipment vocabulary.
// ---------------------------------------------------------------------------
const glyph = (paths, size = 24) => (
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"`
  + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + `${paths}</svg>`
);

const GLYPHS = Object.freeze({
  /** UPS: battery outline + terminal + charge bars. */
  ups: '<rect x="2.5" y="8" width="16" height="8" rx="1.5"/><path d="M18.5 10.5h3v3h-3"/>'
    + '<path d="M6 10.5v3M9.5 10.5v3M13 10.5v3"/>',
  /** PDU: outlet face — plate + two prongs + ground slot. */
  pdu: '<rect x="4" y="4" width="16" height="16" rx="2"/>'
    + '<path d="M9.5 9.5v2.5M14.5 9.5v2.5M10 16h4"/>',
  /** Dry cooler: casing + axial fan + coil fins. */
  dry: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="8.5" cy="12" r="3.2"/>'
    + '<path d="M14.5 8.5v7M17.5 8.5v7"/>',
  /** Ventilación: four-blade EC fan around a hub. */
  fan: '<circle cx="12" cy="12" r="2.1"/>'
    + '<path d="M12 9.8c0-3 1.4-5.3 3.6-5.3 2 0 2.6 2.9.8 4.1-1.3.9-2.9 1.2-4.4 1.2'
    + 'M14.2 12c3 0 5.3 1.4 5.3 3.6 0 2-2.9 2.6-4.1.8-.9-1.3-1.2-2.9-1.2-4.4'
    + 'M12 14.2c0 3-1.4 5.3-3.6 5.3-2 0-2.6-2.9-.8-4.1 1.3-.9 2.9-1.2 4.4-1.2'
    + 'M9.8 12c-3 0-5.3-1.4-5.3-3.6 0-2 2.9-2.6 4.1-.8.9 1.3 1.2 2.9 1.2 4.4"/>',
  /** Térmica: bulb thermometer. */
  thermo: '<path d="M10.5 13.9V5a1.5 1.5 0 0 1 3 0v8.9a3.6 3.6 0 1 1-3 0z"/><path d="M12 10.5v5.5"/>',
  /** Energía: bolt. */
  bolt: '<path d="M13 3 6 13.5h4.5L11 21l7-10.5h-4.5z"/>',
  /** Weather: clear. */
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5'
    + 'M5.2 5.2 7 7M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/>',
  /** Weather: partly cloudy (small sun behind a cloud). */
  cloudSun: '<circle cx="8" cy="7.5" r="2.6"/><path d="M8 2.5v1.7M2.5 7.5h1.7M4.1 3.6l1.2 1.2"/>'
    + '<path d="M10.5 19.5a4 4 0 1 1 .6-7.9 4.8 4.8 0 0 1 9.3 1.3 3.3 3.3 0 0 1-.9 6.6z"/>',
  /** Weather: overcast. */
  cloud: '<path d="M7.5 18.5a4.5 4.5 0 1 1 .7-8.9 5.2 5.2 0 0 1 10.1 1.4 3.6 3.6 0 0 1-1 7.5z"/>',
  /** Weather: evening rain (cloud + three drops). */
  rain: '<path d="M7.5 15.5a4.2 4.2 0 1 1 .7-8.3 5 5 0 0 1 9.7 1.3 3.4 3.4 0 0 1-.9 6.9z"/>'
    + '<path d="M8.5 18.5l-1 2.7M12.5 18.5l-1 2.7M16.5 18.5l-1 2.7"/>',
  // --- Round-4/5 UI glyphs (search / filter / export / actions / KPI tiles) -----------------
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l4.5 4.5"/>',
  funnel: '<path d="M3 4.5h18l-7 8.5v6l-4 2v-8z"/>',
  download: '<path d="M12 3v11M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronDown: '<path d="M5 9l7 7 7-7"/>',
  chevronUp: '<path d="M5 15l7-7 7 7"/>',
  kebab: '<circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.01"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  check: '<path d="M4.5 12.5l4.5 4.5 10-10.5"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6l-2.4 2M12 6l2.4 2M12 18l-2.4-2M12 18l2.4-2"/>',
  gauge: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M12 15l4-4"/><circle cx="12" cy="15" r="1"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9A9 9 0 0 0 12 3z"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  wifi: '<path d="M2.5 9a13 13 0 0 1 19 0M6 12.5a8 8 0 0 1 12 0M9.5 16a3 3 0 0 1 5 0"/><path d="M12 19.5v.01"/>',
  hand: '<path d="M8 11V5.5a1.4 1.4 0 0 1 2.8 0V10m0-.5V4.6a1.4 1.4 0 0 1 2.8 0V10m0-.3V5.6a1.4 1.4 0 0 1 2.8 0V13c0 3.6-2 6.5-5.4 6.5-2 0-3.2-.8-4.4-2.4L6 14.4a1.4 1.4 0 0 1 2-2z"/>',
  shieldCheck: '<path d="M12 3l7 2.5V11c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V5.5z"/><path d="M9 11.5l2 2 4-4.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12h2.5M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  wave: '<path d="M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="0.6"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9.5h16M8 3v4M16 3v4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  droplet: '<path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5z"/>',
  wind: '<path d="M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12h16a2.5 2.5 0 1 1-2.5 2.5M3 15.5h9a2.5 2.5 0 1 1-2.5 2.5"/>',
  sortBoth: '<path d="M8 9.5 12 5.5l4 4M8 14.5l4 4 4-4" opacity="0.55"/>',
  sortAsc: '<path d="M8 10.5 12 6.5l4 4"/>',
  sortDesc: '<path d="M8 13.5 12 17.5l4-4"/>',
});

/** Condition → glyph for the Clima hero and day chips (closed sim vocabulary in site.mjs). */
const CONDITION_GLYPH = Object.freeze({
  Despejado: 'sun',
  'Parcialmente nublado': 'cloudSun',
  Nublado: 'cloud',
  'Lluvia vespertina': 'rain',
});

/** Alert category → row glyph (closed ALERT_CATEGORIES vocabulary in site.mjs). */
const ALERT_CATEGORY_GLYPH = Object.freeze({
  'Térmica': 'thermo',
  'Ventilación': 'fan',
  'Energía': 'bolt',
});

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

/** Grouped taxonomy — the workbench menu inherited from the cinemex direction receipt. */
export const MENU_GROUPS = Object.freeze([
  Object.freeze({
    id: 'operacion',
    label: 'Operación',
    sections: Object.freeze(['tablero', 'hvac', 'ventiladores', 'cuarto', 'iluminacion']),
  }),
  Object.freeze({
    id: 'analisis',
    label: 'Análisis',
    sections: Object.freeze(['energia', 'tendencias', 'alertas', 'clima', 'horarios']),
  }),
]);

export const SECTION_IDS = Object.freeze(MENU_GROUPS.flatMap(({ sections }) => [...sections]));

/**
 * Section registry: label + subtitle.
 *
 * Full-page direction (client): only Tablero renders beside the 3D room; every other
 * section takes over the whole content area as a full page.
 *
 * Single-view correction (client round 3): the 3D room has exactly ONE fixed view — the
 * whole-room framing the scene boots with. Sections carry NO `camera` field and NO
 * `forceChips` override anymore: nothing on the product surface selects, forces or even
 * names a view, and the value chips keep their global default (ON) everywhere. The HVAC
 * and Cuarto pages keep an explicit "Ver en la sala" jump, reduced to plain navigation
 * back to the Tablero (see roomViewCard).
 */
export const SECTIONS = Object.freeze({
  tablero: Object.freeze({ label: 'Tablero', sub: 'Resumen de la sala' }),
  hvac: Object.freeze({ label: 'HVAC', sub: 'Térmica CRAC e in-row' }),
  ventiladores: Object.freeze({ label: 'Ventiladores', sub: 'EC de CRAC, in-row y dry cooler' }),
  cuarto: Object.freeze({ label: 'Cuarto de máquinas', sub: 'UPS, PDU y dry cooler' }),
  iluminacion: Object.freeze({ label: 'Iluminación', sub: 'Escenas de la sala' }),
  energia: Object.freeze({ label: 'Energía', sub: 'PDU y UPS · rollup eléctrico' }),
  tendencias: Object.freeze({ label: 'Tendencias', sub: 'Últimas 24 h por equipo' }),
  alertas: Object.freeze({ label: 'Alertas', sub: 'Derivadas de la simulación' }),
  clima: Object.freeze({ label: 'Clima', sub: 'Exterior CDMX · simulado' }),
  horarios: Object.freeze({ label: 'Horarios', sub: 'Ventanas de mantenimiento' }),
});

/**
 * Named lighting scenes (P2-4): unlike cinemex (where a scene only moved the camera), the
 * DHL room really varies the studio rig — deterministic intensity sets over the existing
 * ambient/key/fill/rim lights. The consumer MUST rebake the static shadow map on change.
 */
export const LIGHTING_SCENES = Object.freeze({
  dia: Object.freeze({
    label: 'Día',
    description: 'Rig de estudio nominal',
    rig: Object.freeze({ ambient: 0.55, key: 1.7, fill: 0.7, rim: 0.5 }),
  }),
  mantenimiento: Object.freeze({
    label: 'Mantenimiento',
    description: 'Luz plana y alta para trabajar',
    rig: Object.freeze({ ambient: 0.85, key: 2.2, fill: 1.1, rim: 0.35 }),
  }),
  noche: Object.freeze({
    label: 'Noche',
    description: 'Guardia nocturna atenuada',
    rig: Object.freeze({ ambient: 0.3, key: 0.85, fill: 0.4, rim: 0.6 }),
  }),
});

// ---------------------------------------------------------------------------
// Shared vocabulary (cards, tables, pills, sparklines)
// ---------------------------------------------------------------------------

const KIND_LABEL = Object.freeze({
  rack: 'Rack 42U', crac: 'CRAC', inrow: 'In-row', pdu: 'PDU', ups: 'UPS', dry: 'Dry cooler',
});

const STATUS_PILL = Object.freeze({
  normal: Object.freeze({ className: 'pill pill-ok', text: 'Normal' }),
  warn: Object.freeze({ className: 'pill pill-warn', text: 'Advertencia' }),
  alarm: Object.freeze({ className: 'pill pill-critical', text: 'Alarma' }),
});

const statusPill = (status) => {
  const pill = STATUS_PILL[status] ?? STATUS_PILL.normal;
  return `<span class="${pill.className}">${pill.text}</span>`;
};

const card = (title, body, extraClass = '') => (
  `<div class="card${extraClass ? ` ${extraClass}` : ''}"><h3>${title}</h3>${body}</div>`
);

const kpiCard = (title, value, unit, sub, extraClass = '') => card(
  title,
  `<div class="kpi num">${value}${unit ? ` <small>${unit}</small>` : ''}</div>`
  + (sub ? `<div class="kpi-sub">${sub}</div>` : ''),
  extraClass,
);

function tableHtml(headers, rows) {
  const head = headers.map(({ label, num }) => `<th${num ? ' class="num"' : ''}>${label}</th>`).join('');
  const body = rows.map((cells) => `<tr>${cells.join('')}</tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const td = (value, num = false) => `<td${num ? ' class="num"' : ''}>${value}</td>`;

/**
 * Per-row detail toggle (Ronda B mirror): a chevron action cell that reveals the
 * tablet-hidden `cell-sec` columns as a labeled row. The open flag lives in
 * `view.rowDetail[key]` (key = `section:id`) and survives the pure re-render.
 */
function rowExpandCell(key, open) {
  const g = open ? GLYPHS.chevronUp : GLYPHS.chevronDown;
  return '<td class="row-detail-toggle">'
    + `<button type="button" class="row-expand" data-row-detail="${key}" aria-expanded="${open}" `
    + `aria-label="${open ? 'Ocultar' : 'Ver'} detalle de la fila">${glyph(g, 15)}</button></td>`;
}

/** The revealed detail row: a labeled restatement of the tablet-hidden (cell-sec) columns. */
function rowDetailRow(open, colspan, pairs) {
  if (!open) return '';
  const items = pairs.map(([label, value]) =>
    `<span class="detail-pair"><span>${escapeHtml(label)}</span><b>${value}</b></span>`).join('');
  return `<tr class="row-detail-row"><td colspan="${colspan}"><div class="row-detail">${items}</div></td></tr>`;
}

/** Read the open flag for a `section:id` row-detail key out of the view state. */
const isRowOpen = (view, key) => Boolean(view && view.rowDetail && view.rowDetail[key]);

/**
 * 24 h sparkline as an inline SVG polyline — re-authored from the cinemex dashboard pattern
 * (src/dashboard/render.mjs sparklineSvg / energySparkSvg), sized by CSS via .chispa.
 *
 * Hover contract (F2b): the hourly points and their unit travel on data attributes so the
 * workbench's ONE delegated pointer handler can serve every sparkline on the Tendencias
 * full page (compact tooltip: hora + valor). The builder stays DOM-free.
 */
export function sparklineSvg(points, {
  width = 120, height = 26, stroke = 'var(--accent-ink)', unit = '', label = '',
} = {}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = (max - min) || 1;
  const pad = span * 0.15;
  const lo = min - pad;
  const hi = max + pad;
  const coords = points
    .map((value, index) => `${((index * width) / (points.length - 1)).toFixed(1)},`
      + `${(height - ((value - lo) / (hi - lo)) * height).toFixed(1)}`)
    .join(' ');
  const hoverData = ` data-points="${points.map((value) => Number(value.toFixed(2))).join(',')}"`
    + ` data-unit="${escapeHtml(unit)}" data-label="${escapeHtml(label)}"`;
  return `<svg class="chispa" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"${hoverData} aria-hidden="true">`
    + `<polyline points="${coords}" fill="none" stroke="${stroke}" stroke-width="1.2"`
    + ' vector-effect="non-scaling-stroke"/></svg>';
}

// ---------------------------------------------------------------------------
// Round-4/5 shared vocabulary: KPI tile cards, sortable headers, toolbars, donut, pager.
// Re-authored from the cinemex sibling's approved generation; same grammar, DHL data.
// ---------------------------------------------------------------------------

/** The canonical KPI tile card: icon tile + label + (i) derivation tooltip + big value + sub. */
function kpiTileCard({ tile, tileClass = '', label, info, value, unit = '', sub = '', extraClass = '' }) {
  const infoBtn = info
    ? `<span class="kpi-info" role="img" title="${escapeHtml(info)}" aria-label="${escapeHtml(info)}">${glyph(GLYPHS.info, 15)}</span>`
    : '';
  return `<div class="card kpi-card${extraClass ? ` ${extraClass}` : ''}">`
    + `<div class="kpi-head"><span class="icon-tile${tileClass ? ` ${tileClass}` : ''}">${glyph(GLYPHS[tile], 20)}</span>`
    + `<h3>${label}</h3>${infoBtn}</div>`
    + `<div class="kpi num">${value}${unit ? ` <small>${unit}</small>` : ''}</div>`
    + (sub ? `<div class="kpi-sub">${sub}</div>` : '')
    + '</div>';
}

const SORT_GLYPH = Object.freeze({ asc: 'sortAsc', desc: 'sortDesc', none: 'sortBoth' });

/** Sortable header cell: arrow glyph + aria-sort; `attr` is the data-attribute the shell reads. */
function sortableTh({ label, col, attr, active, dir, num = false }) {
  const state = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const g = active ? SORT_GLYPH[dir] : SORT_GLYPH.none;
  return `<th${num ? ' class="num"' : ''} aria-sort="${state}">`
    + `<button type="button" class="th-sort" ${attr}="${col}">${label}${glyph(GLYPHS[g], 12)}</button></th>`;
}

/** The round-4 toolbar: diacritic-insensitive search + Filtros popover trigger + Exportar CSV. */
function tableToolbar({
  searchAttr, query = '', filtersAttr, filtersOpen = false, chipsHtml = '',
  searchLabel = 'Buscar…', csv = true,
}) {
  const exportBtn = csv
    ? `<button type="button" class="toolbar-button" data-export-csv>${glyph(GLYPHS.download, 15)} Exportar CSV</button>`
    : '';
  return '<div class="toolbar">'
    + `<label class="search-box">${glyph(GLYPHS.search, 15)}`
    + `<input type="search" ${searchAttr} value="${escapeHtml(query)}" placeholder="${escapeHtml(searchLabel)}" aria-label="${escapeHtml(searchLabel)}"></label>`
    + `<button type="button" class="toolbar-button" ${filtersAttr} aria-expanded="${filtersOpen}">${glyph(GLYPHS.funnel, 15)} Filtros</button>`
    + exportBtn
    + '</div>'
    + (filtersOpen ? `<div class="cat-row filter-pop">${chipsHtml}</div>` : '');
}

/** Filter chip (pressed = active); zero-count chips look disabled but stay functional/honest. */
function filterChip({ attr, value, label, count, active }) {
  const empty = count === 0 ? ' cat-chip-empty' : '';
  return `<button type="button" class="cat-chip${empty}" ${attr}="${value}" aria-pressed="${active}">`
    + `${label} <b class="num">${count}</b></button>`;
}

/** Signed deviation span on the shared dev inks (positive warm, negative cool, zero muted). */
function deviationInk(deviation, unit = '°C') {
  const cls = deviation > 0 ? 'dev-pos' : deviation < 0 ? 'dev-neg' : 'dev-zero';
  const sign = deviation > 0 ? '+' : '';
  return `<span class="${cls} num">${sign}${deviation.toFixed(1)} ${unit}</span>`;
}

/** Parameterized SVG donut (circumference-100 dash trick), reused by Energía and Ventiladores. */
function donutSvg(segments, { classFor, ariaLabel }) {
  const total = segments.reduce((acc, s) => acc + s.pct, 0) || 1;
  let offset = 25; // start at 12 o'clock
  const rings = segments.map((seg) => {
    const len = (seg.pct / total) * 100;
    const dash = `<circle class="${classFor(seg)}" cx="21" cy="21" r="15.915" fill="none"`
      + ` stroke="currentColor" stroke-width="6" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}"`
      + ` stroke-dashoffset="${offset.toFixed(2)}"></circle>`;
    offset = (offset - len + 100) % 100;
    return dash;
  }).join('');
  return `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${escapeHtml(ariaLabel)}">`
    + '<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--line)" stroke-width="6"></circle>'
    + `${rings}</svg>`;
}

/** Windowed page-number list (1 … current-1 current current+1 … last) for numbered pagers. */
function pageWindow(page, pageCount) {
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/** Numbered pager buttons (‹ 1 … n › ) sharing one data-attribute; active page marked. */
function numberedPager(attr, page, pageCount) {
  const btn = (target, label, opts = {}) => {
    const disabled = opts.disabled ? ' disabled' : '';
    const active = opts.active ? ' active' : '';
    const current = opts.active ? ' aria-current="page"' : '';
    const aria = opts.aria ? ` aria-label="${opts.aria}"` : '';
    return `<button type="button" class="pager-button${active} num" ${attr}="${target}"${disabled}${current}${aria}>${label}</button>`;
  };
  const parts = [btn('prev', '‹', { disabled: page <= 1, aria: 'Página anterior' })];
  for (const p of pageWindow(page, pageCount)) {
    parts.push(p === 'gap' ? '<span class="pager-gap">…</span>' : btn(String(p), String(p), { active: p === page }));
  }
  parts.push(btn('next', '›', { disabled: page >= pageCount, aria: 'Página siguiente' }));
  return `<span class="pager-buttons">${parts.join('')}</span>`;
}

/** "Filas por página" select (10 / 25). */
function pageSizeSelect(attr, pageSize) {
  const option = (value) => `<option value="${value}"${value === pageSize ? ' selected' : ''}>${value}</option>`;
  return `<label class="rows-per-page">Filas por página <select ${attr}>${option(10)}${option(25)}</select></label>`;
}

// ---------------------------------------------------------------------------
// Per-section builders
// ---------------------------------------------------------------------------

function tableroHtml(tick) {
  const model = createEquipmentModel({ tick });
  const rollup = createEnergyRollup({ tick });
  const weather = createSiteWeather({ tick });
  const alerts = createSiteAlerts({ tick });

  const kpis = `<div class="kpi-row">${[
    kpiCard('Carga TI', rollup.itLoadKw.toFixed(1), 'kW', 'Suma de los 3 racks instrumentados'),
    kpiCard('Clima · CDMX', weather.current.temperatureC.toFixed(1), '°C',
      `${escapeHtml(weather.current.condition)} · simulado`),
    kpiCard('Alertas activas', String(alerts.total), '',
      alerts.total === 0 ? 'Sin desvíos derivados' : escapeHtml(alerts.alerts[0].label)),
  ].join('')}</div>`;

  const rows = model.units.map((unit) => [
    td(escapeHtml(unit.label)),
    td(KIND_LABEL[unit.kind]),
    td(`<span class="num">${escapeHtml(unit.chip.primary)}</span>`, true),
    td(`<span class="num">${escapeHtml(unit.chip.secondary)}</span>`, true),
    td(statusPill(unit.status)),
  ]);
  const estado = card('Equipos de la sala', tableHtml([
    { label: 'Equipo' }, { label: 'Tipo' }, { label: 'Lectura', num: true },
    { label: 'Detalle', num: true }, { label: 'Estado' },
  ], rows));

  // The room's old floating #legend folds into the dock as a read-only card.
  const legend = card('Leyenda de la sala', '<ul class="legend-list">'
    + '<li><i style="background:#2f6fb0"></i>Agua helada · suministro</li>'
    + '<li><i style="background:#9c3b2e"></i>Agua helada · retorno</li>'
    + '<li><i style="background:#aecbe8"></i>Cristal · contención y sala</li>'
    + '<li><i style="background:#1f6fd0"></i>Ventiladores EC (CRAC)</li>'
    + '<li><i style="background:#1b1d23"></i>Gabinetes y racks</li>'
    + '</ul>');

  return kpis + estado + legend;
}

/** Thermal-unit key temperature per kind: impulsión (CRAC/in-row) or entrada de aire (rack). */
const HVAC_KEY = Object.freeze({
  crac: { label: 'Impulsión', field: 'supplyTempC' },
  inrow: { label: 'Impulsión', field: 'supplyTempC' },
  rack: { label: 'Entrada', field: 'inletTempC' },
});

/** Truthful status vocabulary for the HVAC filter chips (alarm never fires by construction). */
const HVAC_STATUS_LABEL = Object.freeze({ normal: 'Normal', warn: 'Advertencia', alarm: 'Alarma' });
const HVAC_SORTERS = Object.freeze({
  unidad: (a, b) => a.id.localeCompare(b.id),
  temp: (a, b) => a.temp - b.temp,
});

/**
 * Pure HVAC-table derivation (mirror of the cinemex `deriveHvacRows`): search + status filter +
 * sort over the thermal units, plus the KPI figures. `view` is the shell's re-render state; the
 * static default (no query, all statuses, Unidad asc) is exactly what renders without JS.
 */
export function deriveHvacRows({ tick = 0, view = {} } = {}) {
  const model = createEquipmentModel({ tick });
  const thermal = model.units.filter(({ kind }) => kind in HVAC_KEY);
  const rows = thermal.map((unit) => {
    const key = HVAC_KEY[unit.kind];
    const temp = unit.values[key.field];
    const detail = unit.kind === 'rack'
      ? `${unit.values.itLoadKw.toFixed(1)} kW`
      : `Retorno ${unit.values.returnTempC.toFixed(1)} °C`;
    const fan = unit.kind === 'rack' ? null : unit.values.fanPct;
    return {
      id: unit.id, label: unit.label, kind: unit.kind, kindLabel: KIND_LABEL[unit.kind],
      tempLabel: key.label, temp, detail, fan, status: unit.status,
    };
  });

  const statusCounts = { normal: 0, warn: 0, alarm: 0 };
  for (const row of rows) statusCounts[row.status] += 1;

  const query = typeof view.hvacQuery === 'string' ? view.hvacQuery : '';
  const mode = ['normal', 'warn', 'alarm'].includes(view.hvacMode) ? view.hvacMode : 'all';
  const sort = view.hvacSort in HVAC_SORTERS ? view.hvacSort : 'unidad';
  const dir = view.hvacDir === 'desc' ? 'desc' : 'asc';

  let filtered = rows;
  if (query.trim()) {
    const needle = foldText(query);
    filtered = filtered.filter((row) => foldText(`${row.id} ${row.label} ${row.kindLabel}`).includes(needle));
  }
  if (mode !== 'all') filtered = filtered.filter((row) => row.status === mode);
  filtered = filtered.slice().sort(HVAC_SORTERS[sort]);
  if (dir === 'desc') filtered.reverse();

  const cooling = thermal.filter(({ kind }) => kind === 'crac' || kind === 'inrow');
  const avgSupply = cooling.length
    ? cooling.reduce((acc, u) => acc + u.values.supplyTempC, 0) / cooling.length : 0;
  return {
    rows: filtered,
    statusCounts,
    thermalTotal: thermal.length,
    outOfBand: statusCounts.warn + statusCounts.alarm,
    coolingCount: cooling.length,
    avgSupply,
    query, mode, sort, dir,
  };
}

/** CSV serializer for the HVAC export (the CURRENT filtered/sorted rows). */
export function hvacRowsToCsv(rows) {
  const header = ['Unidad', 'Tipo', 'Temperatura clave', 'Lectura (°C)', 'Detalle', 'Estado'];
  const body = rows.map((row) => [
    row.id, row.kindLabel, row.tempLabel, row.temp.toFixed(1), row.detail, HVAC_STATUS_LABEL[row.status],
  ].map(csvField).join(','));
  return [header.map(csvField).join(','), ...body].join('\n');
}

/**
 * HVAC (round-4 mirror): a promo + three derived KPI tiles over a technical toolbar TABLE
 * (search, Filtros popover with truthful status chips, Exportar CSV, sortable Unidad/Temp,
 * status pills, footer legend + count + pager). Every figure is derived from the thermal sim.
 */
function hvacHtml(tick, view = {}) {
  const data = deriveHvacRows({ tick, view });

  const promo = '<div class="card promo-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.cube, 20)}</span><h3>Ver en la sala</h3></div>`
    + '<p class="note">La sala 3D vive en el Tablero, con los chips de valores sobre cada equipo. '
    + 'Ahí se hace la lectura térmica directa sobre el modelo.</p>'
    + '<button type="button" class="btn-accent" data-room-jump>Ver en la sala</button></div>';

  const coolPct = data.thermalTotal ? Math.round((data.coolingCount / data.thermalTotal) * 100) : 0;
  const kpis = '<div class="kpi-row kpi-row-4">' + promo
    + kpiTileCard({
      tile: 'thermo', label: 'Temp. promedio impulsión',
      info: 'Promedio de la temperatura de impulsión de las unidades CRAC e in-row en vivo.',
      value: data.avgSupply.toFixed(1), unit: '°C', sub: 'Unidades de enfriamiento',
    })
    + kpiTileCard({
      tile: 'gauge', tileClass: data.outOfBand > 0 ? 'tile-warn' : '',
      label: 'Unidades fuera de banda',
      info: 'Unidades térmicas cuya lectura clave supera su umbral de advertencia.',
      value: `${data.outOfBand} / ${data.thermalTotal}`, sub: 'Requieren atención',
    })
    + kpiTileCard({
      tile: 'snow', label: 'Equipos enfriando',
      info: 'Unidades que mueven aire de forma activa (CRAC e in-row); los racks no enfrían.',
      value: `${data.coolingCount} / ${data.thermalTotal}`, sub: `${coolPct}% del total`,
    })
    + '</div>';

  const chips = [
    filterChip({ attr: 'data-hvac-mode', value: 'all', label: 'Todos', count: data.thermalTotal, active: data.mode === 'all' }),
    filterChip({ attr: 'data-hvac-mode', value: 'normal', label: 'Normal', count: data.statusCounts.normal, active: data.mode === 'normal' }),
    filterChip({ attr: 'data-hvac-mode', value: 'warn', label: 'Advertencia', count: data.statusCounts.warn, active: data.mode === 'warn' }),
    filterChip({ attr: 'data-hvac-mode', value: 'alarm', label: 'Alarma', count: data.statusCounts.alarm, active: data.mode === 'alarm' }),
  ].join('');
  const toolbar = tableToolbar({
    searchAttr: 'data-hvac-search', query: data.query,
    filtersAttr: 'data-hvac-filters', filtersOpen: Boolean(view.hvacFilters),
    chipsHtml: chips, searchLabel: 'Buscar unidad o tipo…',
  });

  const head = sortableTh({ label: 'Unidad', col: 'unidad', attr: 'data-hvac-sort', active: data.sort === 'unidad', dir: data.dir })
    + '<th>Tipo</th>'
    + sortableTh({ label: 'Temp', col: 'temp', attr: 'data-hvac-sort', active: data.sort === 'temp', dir: data.dir, num: true })
    + '<th class="cell-sec">Detalle</th><th>Estado</th><th class="row-detail-toggle" aria-label="Detalle"></th>';
  const body = data.rows.length === 0
    ? ''
    : data.rows.map((row) => {
      const key = `hvac:${row.id}`;
      const open = isRowOpen(view, key);
      return '<tr>'
        + `<td data-th="Unidad"><span class="unit-pair num"><b>${escapeHtml(row.id)}</b></span></td>`
        + `<td data-th="Tipo">${row.kindLabel}</td>`
        + `<td class="num" data-th="Temp">${row.temp.toFixed(1)} °C <small class="cell-sec">${row.tempLabel}</small></td>`
        + `<td class="cell-sec" data-th="Detalle">${escapeHtml(row.detail)}</td>`
        + `<td data-th="Estado">${statusPill(row.status)}</td>`
        + rowExpandCell(key, open)
        + '</tr>'
        + rowDetailRow(open, 6, [['Detalle', escapeHtml(row.detail)], ['Banda', escapeHtml(row.tempLabel)]]);
    }).join('');
  const table = data.rows.length === 0
    ? '<p class="note">Sin unidades que coincidan con la búsqueda o el filtro.</p>'
    : `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;

  const shown = data.rows.length;
  const legend = shown === 0
    ? '<span class="legend">Sin unidades</span>'
    : `<span class="legend"><span class="legend-item"><i class="dot dot-ok"></i>${data.statusCounts.normal} Normal</span>`
      + `<span class="legend-item"><i class="dot dot-accent"></i>${data.statusCounts.warn} Advertencia</span></span>`;
  const foot = '<div class="table-foot">' + legend
    + '<span class="table-foot-right">'
    + `<span class="pager-count num">${shown === 0 ? 'Sin unidades' : `Mostrando 1 a ${shown} de ${shown} unidades`}</span>`
    + numberedPager('data-hvac-page', 1, 1)
    + '</span></div>';

  return kpis + card('Unidades térmicas', toolbar + table + foot, 'page-span');
}

/** Fan-bearing kinds and their real EC arrangement (racks carry no fans in this model). */
const FAN_FLEET = Object.freeze({ crac: 'EC doble en tope', inrow: 'Banco EC frontal', dry: '10 axiales en V' });
const FAN_SORTERS = Object.freeze({
  unidad: (a, b) => a.id.localeCompare(b.id),
  vent: (a, b) => a.fanPct - b.fanPct,
});

/** Pure Ventiladores-table derivation: search + kind filter + sort + page over the EC fleet. */
export function deriveFanRows({ tick = 0, view = {} } = {}) {
  const model = createEquipmentModel({ tick });
  const rows = model.units
    .filter(({ kind }) => kind in FAN_FLEET)
    .map((unit) => ({
      id: unit.id, label: unit.label, kind: unit.kind, kindLabel: KIND_LABEL[unit.kind],
      arrangement: FAN_FLEET[unit.kind], fanPct: unit.values.fanPct, status: unit.status,
    }));
  const kindCounts = {};
  for (const key of Object.keys(FAN_FLEET)) kindCounts[key] = rows.filter((r) => r.kind === key).length;

  const query = typeof view.ventQuery === 'string' ? view.ventQuery : '';
  const kindFilter = view.ventKind in FAN_FLEET ? view.ventKind : 'all';
  const sort = view.ventSort in FAN_SORTERS ? view.ventSort : 'unidad';
  const dir = view.ventDir === 'desc' ? 'desc' : 'asc';
  let filtered = rows;
  if (query.trim()) {
    const needle = foldText(query);
    filtered = filtered.filter((r) => foldText(`${r.id} ${r.label} ${r.kindLabel} ${r.arrangement}`).includes(needle));
  }
  if (kindFilter !== 'all') filtered = filtered.filter((r) => r.kind === kindFilter);
  filtered = filtered.slice().sort(FAN_SORTERS[sort]);
  if (dir === 'desc') filtered.reverse();

  const pageSize = view.ventPageSize === 10 ? 10 : 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number.isInteger(view.ventPage) ? view.ventPage : 1), pageCount);
  const start = (page - 1) * pageSize;
  return {
    rows, filtered, pageRows: filtered.slice(start, start + pageSize),
    total: rows.length, kindCounts, autoCount: rows.length, query, kindFilter, sort, dir,
    page, pageCount, pageSize, start,
  };
}

/** CSV serializer for the Ventiladores export. */
export function fanRowsToCsv(rows) {
  const header = ['Unidad', 'Tipo', 'Arreglo', 'Ventilador (%)', 'Estado'];
  const body = rows.map((r) => [r.id, r.kindLabel, r.arrangement, r.fanPct,
    r.status === 'warn' ? 'Advertencia' : r.status === 'alarm' ? 'Alarma' : 'Normal',
  ].map(csvField).join(','));
  return [header.map(csvField).join(','), ...body].join('\n');
}

const FAN_SEG_CLASS = Object.freeze({ crac: 'seg-clim', inrow: 'seg-vent', dry: 'seg-luz' });

/**
 * Ventiladores (round-5 mirror): a KPI strip (inventory + derived counts), a toolbar table
 * (search, kind Filtros, CSV, sortable, kebab) and an estado aside (shield banner + fleet donut
 * + arrangement rows). Every EC unit reports an automatic commanded speed — DHL has no manual
 * fans, so "Automáticos" is truthfully the whole fleet.
 */
function ventiladoresHtml(tick, view = {}) {
  const data = deriveFanRows({ tick, view });
  const total = data.total;

  const estado = '<div class="card estado-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.fan, 20)}</span><h3>Estado del inventario</h3>`
    + `<span class="kpi-info" role="img" title="Velocidad EC comandada que reporta cada equipo; vista de solo lectura." aria-label="Velocidad EC comandada, solo lectura">${glyph(GLYPHS.info, 15)}</span></div>`
    + '<p class="note">Cada ventilador corre en modo <span class="pill pill-ok">Automático</span> por su '
    + 'controladora EC; esta consola es de <b>solo lectura</b>. Los racks no llevan ventiladores propios.</p></div>';
  const kpis = '<div class="kpi-row kpi-row-5">' + estado
    + kpiTileCard({ tile: 'fan', label: 'Total ventiladores', value: `${total} unidades`, sub: '100% del inventario' })
    + kpiTileCard({ tile: 'check', tileClass: 'tile-ok', label: 'Automáticos', value: `${data.autoCount}`, sub: `${total ? Math.round((data.autoCount / total) * 100) : 0}% del total` })
    + kpiTileCard({ tile: 'hand', label: 'Manual', value: '0', sub: '0% del total' })
    + kpiTileCard({ tile: 'wifi', label: 'Conectividad', value: '100% operativos', sub: `${total} / ${total} conectados` })
    + '</div>';

  const chips = [
    filterChip({ attr: 'data-vent-kind', value: 'all', label: 'Todos', count: total, active: data.kindFilter === 'all' }),
    ...Object.keys(FAN_FLEET).map((kind) => filterChip({
      attr: 'data-vent-kind', value: kind, label: KIND_LABEL[kind], count: data.kindCounts[kind], active: data.kindFilter === kind,
    })),
  ].join('');
  const toolbar = tableToolbar({
    searchAttr: 'data-vent-search', query: data.query,
    filtersAttr: 'data-vent-filters', filtersOpen: Boolean(view.ventFilters),
    chipsHtml: chips, searchLabel: 'Buscar unidad o tipo…',
  });

  const head = sortableTh({ label: 'Unidad', col: 'unidad', attr: 'data-vent-sort', active: data.sort === 'unidad', dir: data.dir })
    + '<th>Tipo</th><th>Arreglo</th>'
    + sortableTh({ label: 'Vent', col: 'vent', attr: 'data-vent-sort', active: data.sort === 'vent', dir: data.dir, num: true })
    + '<th>Estado</th><th class="row-action" aria-label="Acciones"></th>';
  const openMenu = view.ventMenu;
  const body = data.pageRows.map((r) => {
    const rowKey = r.id;
    const detailText = `${r.id} · ${r.kindLabel} · ${r.arrangement} · ${r.fanPct}%`;
    const base = '<tr>'
      + `<td data-th="Unidad"><span class="unit-pair num"><b>${escapeHtml(r.id)}</b></span></td>`
      + `<td data-th="Tipo">${r.kindLabel}</td><td class="cell-sec" data-th="Arreglo">${escapeHtml(r.arrangement)}</td>`
      + `<td class="num" data-th="Vent">${r.fanPct} %</td>`
      + `<td data-th="Estado"><span class="pill pill-ok">Automático</span></td>`
      + `<td class="row-action"><button type="button" class="kebab" data-vent-menu="${rowKey}" aria-expanded="${openMenu === rowKey}">${glyph(GLYPHS.kebab, 16)}</button></td></tr>`;
    const menu = openMenu === rowKey
      ? '<tr class="action-row"><td colspan="6"><div class="action-menu">'
        + `<span class="detail-pair"><span>Arreglo</span><b>${escapeHtml(r.arrangement)}</b></span>`
        + '<button type="button" class="action-item" data-room-jump>Ver en la sala</button>'
        + `<button type="button" class="action-item" data-copy-detail data-detail="${escapeHtml(detailText)}">Copiar detalle</button>`
        + '</div></td></tr>'
      : '';
    return base + menu;
  }).join('');
  const table = data.pageRows.length === 0
    ? '<p class="note">Sin ventiladores que coincidan con la búsqueda o el filtro.</p>'
    : `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;

  const from = data.filtered.length === 0 ? 0 : data.start + 1;
  const to = data.start + data.pageRows.length;
  const foot = '<div class="table-foot">'
    + `<span class="pager-count num">${data.filtered.length === 0 ? 'Sin ventiladores' : `Mostrando ${from} a ${to} de ${data.filtered.length} ventiladores`}</span>`
    + '<span class="table-foot-right">'
    + pageSizeSelect('data-vent-page-size', data.pageSize)
    + numberedPager('data-vent-page', data.page, data.pageCount)
    + '</span></div>';

  const donutSegs = Object.keys(FAN_FLEET).map((kind) => ({ key: kind, label: KIND_LABEL[kind], pct: data.kindCounts[kind] }));
  const aside = '<aside class="card vent-aside" aria-label="Resumen de estado de los ventiladores">'
    + '<h3>Resumen de estado</h3>'
    + '<div class="ok-banner">'
    + `<span class="icon-tile tile-ok">${glyph(GLYPHS.shieldCheck, 20)}</span>`
    + '<div><b>Operación normal</b><p>Todos los ventiladores se encuentran en modo automático.</p></div></div>'
    + '<h4 class="aside-sub">Fuentes por arreglo</h4>'
    + '<div class="donut-wrap">'
    + donutSvg(donutSegs, { classFor: (seg) => FAN_SEG_CLASS[seg.key], ariaLabel: 'Distribución de ventiladores por arreglo' })
    + '<ul class="donut-legend">'
    + donutSegs.map((seg) => `<li class="${FAN_SEG_CLASS[seg.key]}"><i class="dot"></i><span>${seg.label}</span><b class="num">${seg.pct}</b></li>`).join('')
    + '</ul></div>'
    + `<p class="info-banner">${glyph(GLYPHS.info, 14)} Velocidad EC en tiempo real. Última actualización: ${formatSimDateTime(createSiteWeather({ tick }).timestamp)}.</p></aside>`;

  return kpis + `<div class="alerts-layout page-span">${card('Ventiladores de suministro', toolbar + table + foot, 'vent-table-card')}${aside}</div>`;
}

/** Plant kinds (Cuarto de máquinas): UPS, PDU and the exterior dry cooler. */
const PLANT_KINDS = Object.freeze({ ups: 'UPS', pdu: 'PDU', dry: 'Dry cooler' });

/** Pure Cuarto fleet-table derivation: search + kind filter + page over the plant units. */
export function deriveFleetRows({ tick = 0, view = {} } = {}) {
  const model = createEquipmentModel({ tick });
  const readOf = (unit) => {
    const v = unit.values;
    if (unit.kind === 'ups') return { key: `${v.loadPct} %`, keyLabel: 'Carga', detail: `Autonomía ${v.runtimeMin} min · Bat ${v.batteryPct}%` };
    if (unit.kind === 'pdu') return { key: `${v.loadKw.toFixed(1)} kW`, keyLabel: 'Salida', detail: `${v.loadPct}% de ${v.ratedKva} kVA · FP ${v.powerFactor.toFixed(2)}` };
    return { key: `${v.waterOutC.toFixed(1)} °C`, keyLabel: 'Agua salida', detail: `Approach ${v.approachK.toFixed(1)} K · Vent ${v.fanPct}%` };
  };
  const rows = model.units
    .filter(({ kind }) => kind in PLANT_KINDS)
    .map((unit) => ({ id: unit.id, label: unit.label, kind: unit.kind, kindLabel: KIND_LABEL[unit.kind], status: unit.status, ...readOf(unit) }));
  const kindCounts = {};
  for (const key of Object.keys(PLANT_KINDS)) kindCounts[key] = rows.filter((r) => r.kind === key).length;

  const query = typeof view.cuartoQuery === 'string' ? view.cuartoQuery : '';
  const kindFilter = view.cuartoKind in PLANT_KINDS ? view.cuartoKind : 'all';
  let filtered = rows;
  if (query.trim()) {
    const needle = foldText(query);
    filtered = filtered.filter((r) => foldText(`${r.id} ${r.label} ${r.kindLabel}`).includes(needle));
  }
  if (kindFilter !== 'all') filtered = filtered.filter((r) => r.kind === kindFilter);
  const pageSize = view.cuartoPageSize === 10 ? 10 : 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number.isInteger(view.cuartoPage) ? view.cuartoPage : 1), pageCount);
  const start = (page - 1) * pageSize;
  return {
    rows, filtered, pageRows: filtered.slice(start, start + pageSize),
    total: rows.length, kindCounts, query, kindFilter, page, pageCount, pageSize, start,
  };
}

/** CSV serializer for the Cuarto fleet export. */
export function fleetRowsToCsv(rows) {
  const header = ['Unidad', 'Tipo', 'Lectura clave', 'Valor', 'Detalle', 'Estado'];
  const body = rows.map((r) => [r.id, r.kindLabel, r.keyLabel, r.key, r.detail,
    r.status === 'warn' ? 'Advertencia' : r.status === 'alarm' ? 'Alarma' : 'Normal',
  ].map(csvField).join(','));
  return [header.map(csvField).join(','), ...body].join('\n');
}

/**
 * Cuarto de máquinas (round-5 mirror): intro + "Ver en la sala" promo + four KPIs over a Flota
 * table (search / kind Filtros / CSV), plus the chilled-water loop summary as the read-only
 * aside (DHL's truthful analog of the cinemex RS-485 rack aside — no fake controls).
 */
function cuartoHtml(tick, view = {}) {
  const data = deriveFleetRows({ tick, view });
  const model = createEquipmentModel({ tick });
  const ups = model.byId.get('ups-01').values;
  const pdu = model.byId.get('pdu-01').values;
  const dry = model.byId.get('dry-01').values;
  const alerts = createSiteAlerts({ tick });

  const intro = '<div class="card info-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.gear, 20)}</span><h3>Cuarto de máquinas</h3></div>`
    + '<p class="note">Planta eléctrica y de rechazo: UPS y PDU al frente, el dry cooler en el patio '
    + 'exterior con su tendido de agua helada. Todos los valores derivan de la simulación determinista.</p></div>';
  const promo = '<div class="card info-card promo-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.eye, 20)}</span><h3>Ver en la sala</h3></div>`
    + '<p class="note">La planta se monitorea en vivo desde el Tablero, con los chips de valores sobre cada equipo.</p>'
    + '<button type="button" class="btn-accent" data-room-jump>Ver en la sala</button></div>';
  const kpis = '<div class="cuarto-strip page-span">' + intro + promo
    + kpiTileCard({ tile: 'ups', tileClass: 'tile-ok', label: 'Equipos activos', value: `${data.total} / ${data.total}`, sub: '<span class="sub-ok">100% operativos</span>' })
    + kpiTileCard({ tile: 'wave', label: 'Autonomía UPS', value: `${ups.runtimeMin}`, unit: 'min', sub: `Batería ${ups.batteryPct}%`, info: 'Autonomía = 60 · banco kWh · batería% / carga kW.' })
    + kpiTileCard({ tile: 'bolt', label: 'Carga PDU', value: `${pdu.loadPct}%`, sub: `${pdu.loadKw.toFixed(1)} kW de ${pdu.ratedKva} kVA` })
    + kpiTileCard({ tile: 'bell', tileClass: alerts.total > 0 ? 'tile-warn' : 'tile-ok', label: 'Alertas', value: `${alerts.total}`, sub: alerts.total > 0 ? '<span class="sub-alarm">Requieren atención</span>' : 'Sin pendientes' })
    + '</div>';

  const chips = [
    filterChip({ attr: 'data-cuarto-kind', value: 'all', label: 'Todos', count: data.total, active: data.kindFilter === 'all' }),
    ...Object.keys(PLANT_KINDS).map((kind) => filterChip({
      attr: 'data-cuarto-kind', value: kind, label: KIND_LABEL[kind], count: data.kindCounts[kind], active: data.kindFilter === kind,
    })),
  ].join('');
  const toolbar = tableToolbar({
    searchAttr: 'data-cuarto-search', query: data.query,
    filtersAttr: 'data-cuarto-filters', filtersOpen: Boolean(view.cuartoFilters),
    chipsHtml: chips, searchLabel: 'Buscar unidad o tipo…',
  });
  const head = '<th>Unidad</th><th>Tipo</th><th>Lectura</th><th class="cell-sec">Detalle</th><th>Estado</th>'
    + '<th class="row-detail-toggle" aria-label="Detalle"></th>';
  const body = data.pageRows.map((r) => {
    const key = `cuarto:${r.id}`;
    const open = isRowOpen(view, key);
    return '<tr>'
      + `<td data-th="Unidad"><span class="unit-cell"><span class="tag-chip num">${escapeHtml(r.id)}</span><i class="dot dot-ok" title="Entrega normal"></i></span></td>`
      + `<td data-th="Tipo">${r.kindLabel}</td>`
      + `<td class="num" data-th="Lectura">${r.key} <small class="cell-sec">${r.keyLabel}</small></td>`
      + `<td class="cell-sec" data-th="Detalle">${escapeHtml(r.detail)}</td>`
      + `<td data-th="Estado">${statusPill(r.status)}</td>`
      + rowExpandCell(key, open)
      + '</tr>'
      + rowDetailRow(open, 6, [[r.keyLabel, escapeHtml(r.key)], ['Detalle', escapeHtml(r.detail)]]);
  }).join('');
  const table = data.pageRows.length === 0
    ? '<p class="note">Sin unidades que coincidan con la búsqueda o el filtro.</p>'
    : `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  const from = data.filtered.length === 0 ? 0 : data.start + 1;
  const to = data.start + data.pageRows.length;
  const foot = '<div class="table-foot">'
    + `<span class="pager-count num">${data.filtered.length === 0 ? 'Sin unidades' : `Mostrando ${from} a ${to} de ${data.filtered.length} unidades`}</span>`
    + '<span class="table-foot-right">'
    + pageSizeSelect('data-cuarto-page-size', data.pageSize)
    + numberedPager('data-cuarto-page', data.page, data.pageCount)
    + '</span></div>';

  const aside = '<aside class="card vent-aside" aria-label="Lazo de agua helada y rechazo">'
    + '<h3>Lazo de agua helada · rechazo</h3>'
    + '<p class="note">Resumen de solo lectura del lazo del dry cooler: la salida de agua se deriva '
    + 'del ambiente exterior más el approach (una sola fuente de ambiente, la misma que reporta Clima). '
    + 'No hay consignas que operar desde aquí.</p>'
    + '<div class="mini-stats">'
    + `<div class="mini-stat"><span>Ambiente exterior</span><b class="num">${dry.ambientC.toFixed(1)} °C</b></div>`
    + `<div class="mini-stat"><span>Agua al lazo (salida)</span><b class="num">${dry.waterOutC.toFixed(1)} °C</b></div>`
    + `<div class="mini-stat"><span>Retorno del lazo</span><b class="num">${dry.waterInC.toFixed(1)} °C</b></div>`
    + `<div class="mini-stat"><span>Approach sobre ambiente</span><b class="num">${dry.approachK.toFixed(1)} K</b></div>`
    + '</div></aside>';

  return kpis + `<div class="alerts-layout page-span">${card('Flota de planta', toolbar + table + foot, 'fleet-card')}${aside}</div>`;
}

function iluminacionHtml() {
  const buttons = Object.entries(LIGHTING_SCENES).map(([key, scene]) => (
    `<button type="button" class="scene-button" data-light-scene="${key}" aria-pressed="${key === 'dia'}">`
    + `<b>${scene.label}</b><span>${escapeHtml(scene.description)}</span></button>`
  )).join('');
  const note = card('Escenas del rig', '<p class="note">Cada escena fija intensidades deterministas '
    + 'del rig de estudio (ambiente, principal, relleno y contorno) y rehornea el mapa de sombras '
    + 'estático. El cambio se aplica a la sala 3D del Tablero y queda visible al volver; no hay '
    + 'luminarias simuladas dentro del modelo.</p>');
  return note + card('Escenas', `<div class="scene-grid">${buttons}</div>`);
}

/** kW field per instrumented kind — the meter reading each unit contributes to the rollup. */
const ENERGY_KW_FIELD = Object.freeze({ rack: 'itLoadKw', inrow: 'loadKw', pdu: 'loadKw', ups: 'loadKw' });

/** 24 hourly kW points for one unit, resampled from the SAME deterministic model (1 h = 4 ticks). */
function energyPoints(id, field, hours = 24) {
  return Array.from({ length: hours }, (_, hour) => (
    createEquipmentModel({ tick: hour * 4 }).byId.get(id).values[field]
  ));
}

const ENERGY_SORTERS = Object.freeze({
  kw: (a, b) => a.kw - b.kw,
  unidad: (a, b) => a.id.localeCompare(b.id),
});

/**
 * Pure Energía-table derivation (mirror of the cinemex `deriveEnergyRows`): the instrumented
 * meter rows (racks, in-row, PDU, UPS) with their live kW, a 24 h kW sparkline and paging.
 * Default sort kW desc. Per-phase tension/frequency are NOT in the sim, so those columns are an
 * honest CUT here (documented in the section note).
 */
export function deriveEnergyRows({ tick = 0, view = {} } = {}) {
  const model = createEquipmentModel({ tick });
  const rows = model.units
    .filter(({ kind }) => kind in ENERGY_KW_FIELD)
    .map((unit) => {
      const field = ENERGY_KW_FIELD[unit.kind];
      return {
        id: unit.id, label: unit.label, kind: unit.kind, kindLabel: KIND_LABEL[unit.kind],
        kw: unit.values[field], status: unit.status,
        points: energyPoints(unit.id, field),
      };
    });
  const sort = view.energySort in ENERGY_SORTERS ? view.energySort : 'kw';
  const dir = view.energyDir === 'asc' ? 'asc' : 'desc';
  const sorted = rows.slice().sort(ENERGY_SORTERS[sort]);
  if (dir === 'desc') sorted.reverse();
  const pageSize = view.energyPageSize === 10 ? 10 : 25;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, Number.isInteger(view.energyPage) ? view.energyPage : 1), pageCount);
  const start = (page - 1) * pageSize;
  return {
    rows: sorted, pageRows: sorted.slice(start, start + pageSize),
    total: sorted.length, sort, dir, page, pageCount, pageSize, start,
  };
}

/** CSV serializer for the Energía export. */
export function energyRowsToCsv(rows) {
  const header = ['Unidad', 'Tipo', 'kW', 'Estado'];
  const body = rows.map((row) => [row.id, row.kindLabel, row.kw.toFixed(1),
    row.status === 'warn' ? 'Advertencia' : row.status === 'alarm' ? 'Alarma' : 'Normal',
  ].map(csvField).join(','));
  return [header.map(csvField).join(','), ...body].join('\n');
}

/** Donut segment → CSS class (parameterized donut consumer). */
const ENERGY_SEG_CLASS = Object.freeze({ ti: 'seg-clim', enfriamiento: 'seg-vent', otros: 'seg-otros' });

/**
 * Energía (round-4 mirror): four cards — Ahora (fleet kW + vs. día anterior + fleet sparkline),
 * Día anterior (kWh), Mes (kWh) and a distribution DONUT — over a per-unit sparkline table with
 * a functional page-size select and pager. Every figure derives from the deterministic rollup.
 */
function energiaHtml(tick, view = {}) {
  const rollup = createEnergyRollup({ tick });
  const data = deriveEnergyRows({ tick, view });

  const signedPct = (pct) => {
    const cls = pct > 0 ? 'dev-pos' : pct < 0 ? 'dev-neg' : 'dev-zero';
    return `<span class="${cls} num">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
  };
  // Fleet 24 h series = pointwise sum of every instrumented unit's kW series (hover contract on).
  const fleetPoints = data.rows.reduce((acc, row) => {
    row.points.forEach((v, i) => { acc[i] = (acc[i] ?? 0) + v; });
    return acc;
  }, []);

  const heroSpark = (points, hover) => '<div class="kpi-spark">'
    + sparklineSvg(points, hover
      ? { unit: 'kW', label: 'Flota', width: 240, height: 32 }
      : { width: 240, height: 32 })
    + '</div>';
  const periodCard = ({ tile, label, value, unit, sub, points, hover }) => '<div class="card kpi-hero">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS[tile], 20)}</span><h3>${label}</h3></div>`
    + `<div class="kpi num">${value} <small>${unit}</small></div>`
    + `<div class="kpi-sub">${sub}</div>${heroSpark(points, hover)}</div>`;

  const distSegs = rollup.distribution.segments;
  const donutCard = '<div class="card kpi-hero donut-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.pie, 20)}</span><h3>Distribución actual</h3></div>`
    + '<div class="donut-wrap">'
    + donutSvg(distSegs, { classFor: (seg) => ENERGY_SEG_CLASS[seg.key], ariaLabel: 'Distribución de la carga eléctrica' })
    + '<ul class="donut-legend">'
    + distSegs.map((seg) => `<li class="${ENERGY_SEG_CLASS[seg.key]}"><i class="dot"></i>`
      + `<span>${seg.label}</span><b class="num">${seg.pct.toFixed(1)}%</b></li>`).join('')
    + '</ul></div>'
    + `<p class="donut-foot num">Actualizado: ${formatSimDateTime(rollup.timestamp)} · hora simulada</p></div>`;

  const kpis = '<div class="kpi-row kpi-row-4">'
    + periodCard({
      tile: 'bolt', label: 'Ahora', value: rollup.nowKw.toFixed(1), unit: 'kW',
      sub: `vs. día anterior ${signedPct(rollup.vsPreviousDayPct)}`, points: fleetPoints, hover: true,
    })
    + periodCard({
      tile: 'calendar', label: 'Día anterior', value: esMx(rollup.previousDayKwh), unit: 'kWh',
      sub: `vs. mismo día ant. ${signedPct(-rollup.vsPreviousDayPct)}`, points: fleetPoints, hover: false,
    })
    + periodCard({
      tile: 'calendar', label: 'Mes', value: esMx(rollup.monthKwh), unit: 'kWh',
      sub: `vs. mes anterior ${signedPct(rollup.vsPreviousMonthPct)}`, points: fleetPoints, hover: false,
    })
    + donutCard + '</div>';

  const head = '<th>Unidad</th><th>Tipo</th><th class="cell-sec">Tendencia 24 h</th>'
    + sortableTh({ label: 'kW', col: 'kw', attr: 'data-energy-sort', active: data.sort === 'kw', dir: data.dir, num: true })
    + '<th>Estado</th><th class="row-detail-toggle" aria-label="Detalle"></th>';
  const body = data.pageRows.map((row) => {
    const key = `energia:${row.id}`;
    const open = isRowOpen(view, key);
    const spark = sparklineSvg(row.points, { unit: 'kW', label: row.label, width: 150, height: 24 });
    return '<tr>'
      + `<td data-th="Unidad"><span class="unit-cell"><span class="tag-chip num">${escapeHtml(row.id)}</span><i class="dot dot-ok" title="Entrega normal"></i></span></td>`
      + `<td data-th="Tipo">${row.kindLabel}</td>`
      + `<td class="cell-sec" data-th="Tendencia 24 h">${spark}</td>`
      + `<td class="num" data-th="kW">${row.kw.toFixed(1)}</td>`
      + `<td data-th="Estado">${statusPill(row.status)}</td>`
      + rowExpandCell(key, open)
      + '</tr>'
      + rowDetailRow(open, 6, [['Tendencia 24 h', spark]]);
  }).join('');
  const table = `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;

  const from = data.total === 0 ? 0 : data.start + 1;
  const to = data.start + data.pageRows.length;
  const foot = '<div class="table-foot">'
    + `<span class="pager-count num">${data.total === 0 ? 'Sin unidades'
      : data.pageCount === 1 ? `Mostrando ${data.total} de ${data.total} unidades`
      : `Mostrando ${from} a ${to} de ${data.total} unidades`}</span>`
    + '<span class="table-foot-right">'
    + pageSizeSelect('data-energy-page-size', data.pageSize)
    + '<span class="pager-buttons">'
    + `<button type="button" class="pager-button" data-energy-page="prev"${data.page <= 1 ? ' disabled' : ''} aria-label="Página anterior">‹</button>`
    + `<span class="pager-page num">${data.page} / ${data.pageCount}</span>`
    + `<button type="button" class="pager-button" data-energy-page="next"${data.page >= data.pageCount ? ' disabled' : ''} aria-label="Página siguiente">›</button>`
    + '</span></span></div>';
  const note = '<p class="table-note">El medidor simulado expone demanda (kW) por equipo '
    + 'instrumentado; no mide tensión por fase ni frecuencia, así que esas columnas no existen.</p>';

  return kpis + card('Medición por unidad', table + foot + note, 'page-span');
}

/** Trend groups (client round 3, Trend-Logs style): gauge families, not new data. */
const TREND_GROUPS = Object.freeze([
  Object.freeze({ label: 'Térmicas', kinds: Object.freeze(['crac', 'inrow', 'rack', 'dry']) }),
  Object.freeze({ label: 'Energía', kinds: Object.freeze(['pdu', 'ups']) }),
]);

function tendenciasHtml() {
  const trends = createTrendSeries();
  const cardOf = (entry) => {
    const rows = entry.series.map((series, index) => (
      '<div class="trend-row">'
      + `<span class="trend-label">${series.label}</span>`
      + sparklineSvg(series.points, {
        stroke: index === 0 ? 'var(--accent-ink)' : 'var(--muted)',
        unit: series.unit,
        label: series.label,
      })
      + `<span class="num trend-value">${series.last.toFixed(1)} ${series.unit}</span>`
      + '</div>'
    )).join('');
    // Fidelity pass: every tile carries a timeframe subtitle under its bold title, so the
    // grid reads as instrument tiles (title + "Últimas 24 h · …" + strips).
    return card(
      `${escapeHtml(entry.label)} · ${KIND_LABEL[entry.kind]}`,
      '<p class="trend-sub">Últimas 24 h · 1 punto / hora</p>'
      + `<div class="trend-pair">${rows}</div>`,
      'trend-card',
    );
  };
  // The same 22 sparklines, regrouped under category headers: every entry lands in exactly
  // one gauge family (its kind), so no unit is dropped and no third truth appears.
  const groups = TREND_GROUPS.map(({ label, kinds }) => {
    const cards = trends.entries
      .filter(({ kind }) => kinds.includes(kind))
      .map(cardOf)
      .join('');
    return `<section class="trend-group"><h3 class="trend-group-head">${label}</h3>`
      + `<div class="trend-grid">${cards}</div></section>`;
  }).join('');
  const note = card('Lectura', '<p class="note">24 puntos por serie, uno por hora, remuestreados '
    + 'del mismo modelo determinista que alimenta los chips de la sala. El último punto es la '
    + 'lectura al cierre del día simulado.</p>');
  return note + groups;
}

/** Page size of the Alertas table (round-4 mirror): default 10, with a functional 10/25 select. */
export const ALERTS_PAGE_SIZE = 10;

/** Severity → summary-card + row vocabulary. */
const SEVERITY = Object.freeze({
  alarma: { key: 'alarma', sevClass: 'sev-critical', label: 'Crítica' },
  advertencia: { key: 'advertencia', sevClass: 'sev-warn', label: 'Advertencia' },
  resuelta: { key: 'resuelta', sevClass: 'sev-ok', label: 'Resuelta' },
});

/**
 * Pure Alertas-table derivation (mirror of the cinemex `deriveAlertRows`): the day UNIVERSE
 * (active alerts + resolved episodes) with category and severity filters, a sim-clock sort and
 * paging. Counts reconcile with the table. `view` is the shell's re-render state.
 */
export function deriveAlertRows({ tick = 0, view = {} } = {}) {
  const model = createSiteAlerts({ tick });
  const active = model.alerts.map((alert) => ({
    id: alert.id, device: alert.label, kind: alert.kind, category: alert.category,
    severity: alert.severity, message: alert.message, timestamp: alert.timestamp, state: 'Activa',
  }));
  const resolved = model.resolved.map((ep) => ({
    id: ep.id, device: ep.label, kind: ep.kind, category: GAUGE_CATEGORY_UI[ep.kind] ?? 'Térmica',
    severity: 'resuelta', message: 'Lectura restablecida dentro de banda.',
    timestamp: model.timestamp, state: 'Resuelta',
  }));
  const universe = [...active, ...resolved];

  const cat = ALERT_CATEGORIES.includes(view.alertCat) ? view.alertCat : 'all';
  const sev = ['alarma', 'advertencia', 'resuelta'].includes(view.alertSev) ? view.alertSev : 'all';
  let filtered = universe;
  if (cat !== 'all') filtered = filtered.filter((row) => row.category === cat);
  if (sev !== 'all') filtered = filtered.filter((row) => row.severity === sev);
  const dir = view.alertDir === 'asc' ? 'asc' : 'desc';
  filtered = filtered.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (dir === 'desc') filtered.reverse();

  const pageSize = view.alertPageSize === 25 ? 25 : ALERTS_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number.isInteger(view.alertPage) ? view.alertPage : 1), pageCount);
  const start = (page - 1) * pageSize;
  return {
    universe, filtered, pageRows: filtered.slice(start, start + pageSize),
    counts: {
      byCategory: Object.fromEntries(ALERT_CATEGORIES.map((c) => [c, universe.filter((r) => r.category === c).length])),
      criticas: universe.filter((r) => r.severity === 'alarma').length,
      advertencia: universe.filter((r) => r.severity === 'advertencia').length,
      resueltas: model.resolvedToday,
      total: universe.length,
    },
    cat, sev, dir, page, pageCount, pageSize, start,
  };
}

/** Alert kind → UI category (mirror of the sim's GAUGE_CATEGORY, for resolved rows). */
const GAUGE_CATEGORY_UI = Object.freeze({
  rack: 'Térmica', inrow: 'Térmica', dry: 'Térmica', crac: 'Ventilación', pdu: 'Energía', ups: 'Energía',
});

/** Decorative sensor/gateway illustration for the Derivación aside (aria-hidden, token fills). */
function derivArtSvg() {
  return '<svg class="deriv-art" viewBox="0 0 240 90" role="img" aria-hidden="true" fill="none">'
    + '<rect x="14" y="46" width="52" height="30" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>'
    + '<rect x="24" y="54" width="32" height="5" rx="2" fill="var(--accent)"/>'
    + '<rect x="24" y="63" width="20" height="5" rx="2" fill="var(--accent)" opacity="0.5"/>'
    + '<path d="M120 20v40M104 30a22 22 0 0 1 32 0M112 38a11 11 0 0 1 16 0" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/>'
    + '<circle cx="120" cy="60" r="4" fill="var(--accent)"/>'
    + '<rect x="176" y="44" width="50" height="34" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>'
    + '<circle cx="188" cy="54" r="2.4" fill="var(--ok)"/><circle cx="188" cy="62" r="2.4" fill="var(--ok)"/>'
    + '<path d="M66 62h44M136 56h40" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="3 3"/>'
    + '</svg>';
}

/**
 * Alertas (round-4 mirror): category chips (universe counts), three severity SUMMARY cards
 * (Críticas / Advertencia / Resueltas hoy — each a chevron filter), a dense table with sim-clock
 * timestamps + kebab actions, a numbered pager + page-size, and a Derivación aside.
 */
function alertasHtml(tick, view = {}) {
  const data = deriveAlertRows({ tick, view });

  const chips = [
    filterChip({ attr: 'data-alert-cat', value: 'all', label: 'Todas', count: data.counts.total, active: data.cat === 'all' }),
    ...ALERT_CATEGORIES.map((category) => filterChip({
      attr: 'data-alert-cat', value: category, label: category,
      count: data.counts.byCategory[category], active: data.cat === category,
    })),
  ].join('');

  const summaryCard = ({ tile, tileClass, label, sev, count, sub }) => '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile ${tileClass}">${glyph(GLYPHS[tile], 20)}</span><h3>${label}</h3>`
    + `<button type="button" class="sum-chevron" data-alert-sev="${sev}" aria-pressed="${data.sev === sev}" aria-label="Filtrar la tabla: ${label}">${glyph(GLYPHS.chevronRight, 18)}</button></div>`
    + `<div class="kpi num">${count}</div><div class="kpi-sub">${sub}</div></div>`;
  const summary = '<div class="alert-summary">'
    + summaryCard({ tile: 'bell', tileClass: 'tile-alarm', label: 'Críticas', sev: 'alarma', count: data.counts.criticas, sub: 'Requieren atención inmediata' })
    + summaryCard({ tile: 'thermo', tileClass: 'tile-warn', label: 'Advertencia', sev: 'advertencia', count: data.counts.advertencia, sub: 'Revisión recomendada' })
    + summaryCard({ tile: 'check', tileClass: 'tile-ok', label: 'Resueltas (hoy)', sev: 'resuelta', count: data.counts.resueltas, sub: 'Alertas normalizadas' })
    + '</div>';

  let tableInner;
  if (data.pageRows.length === 0) {
    tableInner = `<p class="note">Sin alertas ${data.cat === 'all' ? '' : `de la categoría ${data.cat} `}`
      + 'en este filtro · todas las lecturas dentro de banda.</p>';
  } else {
    const head = '<th>Equipo</th><th class="cell-sec">Categoría</th><th>Severidad</th><th>Detalle</th>'
      + sortableTh({ label: 'Fecha / hora', col: 'fecha', attr: 'data-alert-sort', active: true, dir: data.dir })
      + '<th>Estado</th><th class="row-action" aria-label="Acciones"></th>';
    const openMenu = view.alertMenu;
    const rows = data.pageRows.map((row, index) => {
      const rowKey = `${row.id}-${index}`;
      const sevSpec = SEVERITY[row.severity];
      const stateClass = row.state === 'Resuelta' ? 'pill pill-ok' : 'pill pill-accent';
      const detailText = `${row.device} · ${row.category} · ${sevSpec.label} · ${row.message}`;
      const base = '<tr>'
        + `<td data-th="Equipo"><b class="cell-device num">${escapeHtml(row.device)}</b></td>`
        + `<td class="cell-sec" data-th="Categoría"><span class="cat-cell">${glyph(GLYPHS[ALERT_CATEGORY_GLYPH[row.category]] ?? GLYPHS.thermo, 15)}${row.category}</span></td>`
        + `<td data-th="Severidad"><span class="sev ${sevSpec.sevClass}">${sevSpec.label}</span></td>`
        + `<td data-th="Detalle">${escapeHtml(row.message)}</td>`
        + `<td class="num" data-th="Fecha / hora">${formatSimDateTime(row.timestamp)}</td>`
        + `<td data-th="Estado"><span class="${stateClass}">${row.state}</span></td>`
        + `<td class="row-action"><button type="button" class="kebab" data-alert-menu="${rowKey}" aria-expanded="${openMenu === rowKey}">${glyph(GLYPHS.kebab, 16)}</button></td></tr>`;
      const menu = openMenu === rowKey
        ? '<tr class="action-row"><td colspan="7"><div class="action-menu">'
          + `<span class="detail-pair"><span>Categoría</span><b>${row.category}</b></span>`
          + '<button type="button" class="action-item" data-room-jump>Ver en la sala</button>'
          + `<button type="button" class="action-item" data-copy-detail data-detail="${escapeHtml(detailText)}">Copiar detalle</button>`
          + '</div></td></tr>'
        : '';
      return base + menu;
    }).join('');
    tableInner = `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const from = data.filtered.length === 0 ? 0 : data.start + 1;
  const to = data.start + data.pageRows.length;
  const foot = '<div class="table-foot">'
    + `<span class="pager-count num">${data.filtered.length === 0 ? 'Sin alertas' : `Mostrando ${from} a ${to} de ${data.filtered.length} alertas`}</span>`
    + '<span class="table-foot-right">'
    + pageSizeSelect('data-alert-page-size', data.pageSize)
    + numberedPager('data-alert-page', data.page, data.pageCount)
    + '</span></div>';

  const aside = '<aside class="card deriv-card" aria-label="Cómo se derivan las alertas">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.info, 20)}</span><h3>Derivación</h3></div>`
    + '<p class="note">Cada alerta se deriva de los umbrales exportados por la simulación '
    + '(deriveStatus): el estado nunca se asevera a mano y la alerta se restablece sola cuando la '
    + 'lectura vuelve a banda. Las episodios resueltos se cuentan recorriendo el día simulado en su '
    + 'propia malla de ticks. La categoría es la familia del indicador que la disparó.</p>'
    + derivArtSvg() + '</aside>';

  return `<div class="cat-row">${chips}</div>` + summary
    + `<div class="alerts-layout page-span">${card('Alertas del día', tableInner + foot, 'alerts-card')}${aside}</div>`;
}

/** UV index → tile class (hot bands read warm/alarm). */
const uvTileClass = (index) => (index >= 8 ? 'tile-alarm' : index >= 6 ? 'tile-warn' : '');
const CLIMA_PAGE_SIZE = 5;

/**
 * Clima (round-5 mirror): hero (current conditions) + a 5-per-page forecast CAROUSEL (7 seeded
 * days → 2 functional dots), a Fuente aside, a derived-cards row (UV / sensación / lluvia /
 * relación HVAC) and a condition-summary strip (dew / visibility / pressure). Every figure comes
 * from `createSiteWeather().derived`; the intra-day sensación trend is an honest cut (DHL's
 * exterior ambient is a single fixed source with no half-hour variation).
 */
function climaHtml(tick, view = {}) {
  const weather = createSiteWeather({ tick });
  const { derived } = weather;
  const conditionGlyph = (condition, size) => glyph(GLYPHS[CONDITION_GLYPH[condition] ?? 'cloud'], size);

  const hero = '<div class="card clima-hero-card">'
    + `<div class="kpi-head"><h3>Ahora · ${escapeHtml(weather.city)}</h3>`
    + `<span class="kpi-info" role="img" title="Condiciones simuladas deterministas; misma marca de tiempo que la telemetría." aria-label="Condiciones simuladas deterministas">${glyph(GLYPHS.info, 15)}</span></div>`
    + '<div class="clima-hero">'
    + '<div class="clima-now">'
    + `<span class="clima-glyph">${conditionGlyph(weather.current.condition, 44)}</span>`
    + `<span class="clima-main"><span class="clima-temp num">${weather.current.temperatureC.toFixed(1)}<small>°C</small></span>`
    + `<span class="clima-cond">${escapeHtml(weather.current.condition)}</span></span></div>`
    + '<div class="clima-reads">'
    + `<div class="clima-read"><span>Humedad</span><b class="num">${weather.current.humidityPct}%</b></div>`
    + `<div class="clima-read"><span>Viento</span><b class="num">${weather.current.windKmh} km/h</b></div>`
    + '</div></div>'
    + `<p class="donut-foot num">Actualizado ${formatSimDateTime(weather.timestamp)}</p></div>`;

  const pageCount = Math.ceil(weather.forecast.length / CLIMA_PAGE_SIZE);
  const page = Math.min(Math.max(0, Number.isInteger(view.climaPage) ? view.climaPage : 0), pageCount - 1);
  const shown = weather.forecast.slice(page * CLIMA_PAGE_SIZE, page * CLIMA_PAGE_SIZE + CLIMA_PAGE_SIZE);
  const chips = shown.map((day) => (
    '<div class="dia">'
    + `<b>${day.dayLabel}</b>`
    + `<span class="dia-temps num"><b class="dia-hi">${day.maxC.toFixed(1)}°</b><span class="dia-lo">${day.minC.toFixed(1)}°</span></span>`
    + `<span class="dia-glyph">${conditionGlyph(day.condition, 18)}</span>`
    + `<span>${escapeHtml(day.condition)}</span>`
    + `<span class="dia-meta num">${day.humidityPct}% · ${day.windKmh} km/h</span>`
    + '</div>'
  )).join('');
  const dots = Array.from({ length: pageCount }, (_, index) => {
    const from = index * CLIMA_PAGE_SIZE + 1;
    const to = Math.min(weather.forecast.length, from + CLIMA_PAGE_SIZE - 1);
    return `<button type="button" class="dot-btn" data-clima-page="${index}" aria-pressed="${index === page}" aria-label="Días ${from} a ${to}"></button>`;
  }).join('');
  const forecast = '<div class="card clima-forecast-card">'
    + `<div class="kpi-head"><h3>Próximos ${CLIMA_PAGE_SIZE} días</h3></div>`
    + `<div class="dia-strip dia-strip-5">${chips}</div>`
    + `<div class="carousel-dots">${dots}</div></div>`;

  const fuente = '<aside class="card clima-fuente" aria-label="Fuente de los datos meteorológicos">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.info, 20)}</span><h3>Fuente</h3></div>`
    + '<p class="note">Simulación determinista: esta temperatura exterior es exactamente el ambiente '
    + 'contra el que rechaza el dry cooler (su agua de salida se deriva de ambiente + approach). '
    + 'Ningún dato sale del complejo.</p>'
    + '<span class="cat-chip chip-static">Serie simulada · misma marca de tiempo que la telemetría</span>'
    + `<p class="donut-foot num">Última actualización ${formatSimDateTime(weather.timestamp)}</p></aside>`;

  // Derived cards row.
  const uvScale = '<div class="uv-scale"><i style="width:' + `${Math.round((derived.uv.index / 11) * 100)}%"></i></div>`;
  const uvCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile ${uvTileClass(derived.uv.index)}">${glyph(GLYPHS.sun, 20)}</span><h3>Índice UV</h3></div>`
    + `<div class="kpi num">${derived.uv.index} <small>${derived.uv.level}</small></div>${uvScale}`
    + `<div class="kpi-sub">${derived.uv.advice}</div></div>`;
  const feelsCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.thermo, 20)}</span><h3>Sensación térmica</h3></div>`
    + `<div class="kpi num">${derived.feelsLike.c.toFixed(1)} <small>°C</small></div>`
    + `<div class="kpi-sub">${derived.feelsLike.deltaLabel}</div>`
    + '<p class="table-note">Ambiente exterior fijo (una sola fuente); sin variación intradía.</p></div>';
  const maxRain = Math.max(1, ...derived.rain.days.map((d) => d.pct));
  const rainBars = derived.rain.days.map((d) => (
    `<div class="rain-bar"><span class="num">${d.pct}%</span>`
    + `<i style="height:${Math.round((d.pct / maxRain) * 100)}%"></i><b>${escapeHtml(d.label)}</b></div>`
  )).join('');
  const rainCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.rain, 20)}</span><h3>Probabilidad de lluvia</h3></div>`
    + `<div class="kpi num">${derived.rain.nowPct} <small>%</small></div>`
    + `<div class="rain-bars">${rainBars}</div></div>`;
  const relCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.dry, 20)}</span><h3>Relación con demanda HVAC</h3></div>`
    + `<div class="kpi num">${derived.hvacRelation.pct}% <small>${derived.hvacRelation.level}</small></div>`
    + `<div class="progress"><i style="width:${derived.hvacRelation.pct}%"></i></div>`
    + `<div class="kpi-sub">${derived.hvacRelation.note}</div></div>`;
  const derivedRow = `<div class="kpi-row kpi-row-4">${uvCard}${feelsCard}${rainCard}${relCard}</div>`;

  const miniStat = (label, value, sub) => `<div class="mini-stat"><span>${label}</span>`
    + `<b class="num">${value}</b><small>${sub}</small></div>`;
  const resumen = card('Resumen de condiciones',
    '<div class="cond-strip">'
    + `<div class="cond-summary"><span class="icon-tile">${glyph(GLYPHS.thermo, 20)}</span>`
    + `<p class="note">Ambiente exterior de ${weather.current.temperatureC.toFixed(1)} °C con `
    + `${weather.current.humidityPct}% de humedad; el dry cooler rechaza contra este mismo número.</p></div>`
    + '<div class="cond-stats">'
    + miniStat('Punto de rocío', `${derived.dew.c.toFixed(1)} °C`, derived.dew.label)
    + miniStat('Visibilidad', `${derived.visibility.km.toFixed(1)} km`, derived.visibility.label)
    + miniStat('Presión atmosférica', `${derived.pressure.hpa} hPa`, derived.pressure.label)
    + '</div></div>', 'page-span');

  return `<div class="clima-top page-span">${hero}${forecast}${fuente}</div>` + derivedRow + resumen;
}

/**
 * Horarios (round-5 mirror): the deterministic maintenance windows as a real weekly grid, plus a
 * next-change countdown banner, weekly-summary KPIs, a truthful "Lineamientos" aside and a
 * history toggle showing today's windows — all from `deriveMaintenanceStatus`, nothing invented.
 */
function horariosHtml(tick, view = {}) {
  const model = createMaintenanceModel();
  const status = deriveMaintenanceStatus({ tick });
  const byDay = new Map(WEEK_DAYS.map((day) => [day, []]));
  for (const window of model.windows) byDay.get(window.day).push(window);
  const columns = WEEK_DAYS.map((day) => {
    const isToday = day === status.now.dayLabel;
    const slots = byDay.get(day)
      .slice()
      .sort((a, b) => a.window.localeCompare(b.window))
      .map((slot) => {
        const isNext = slot.label === status.next.label && slot.day === status.next.day;
        return `<div class="week-slot${isNext ? ' week-slot-next' : ''}">`
          + `<b class="num">${slot.window}</b>`
          + `<span class="week-equip">${escapeHtml(slot.label)} · ${KIND_LABEL[slot.kind]}</span>`
          + `<span class="week-task">${escapeHtml(slot.task)}</span>`
          + '</div>';
      })
      .join('');
    return `<div class="week-day${isToday ? ' week-today' : ''}"><p class="week-day-head">${day}${isToday ? ' · hoy' : ''}</p>`
      + (slots || '<p class="week-empty">Sin ventana</p>') + '</div>';
  }).join('');

  const banner = '<div class="next-change">'
    + '<span class="next-label">Próximo cambio</span>'
    + `<b>${escapeHtml(status.next.label)} · ${escapeHtml(status.next.day)} <span class="num">${status.next.window}</span></b>`
    + `<span class="cat-chip chip-static num countdown">${status.countdownLabel}</span></div>`;
  const weekCard = card('Ventanas de mantenimiento',
    `<div class="week-scroll"><div class="week-grid">${columns}</div></div>${banner}`, 'page-span');

  const daysWithWindow = Object.values(status.weeklySummary.byDay).filter((n) => n > 0).length;
  const summary = '<section class="resumen-semanal page-span">'
    + '<h3 class="trend-group-head">Resumen semanal</h3>'
    + '<div class="kpi-row kpi-row-4">'
    + kpiTileCard({ tile: 'calendar', label: 'Total de ventanas', value: `${status.weeklySummary.totalWindows}`, sub: 'Una por equipo' })
    + kpiTileCard({ tile: 'wave', label: 'Ventanas hoy', value: `${status.weeklySummary.windowsToday}`, sub: status.now.dayLabel })
    + kpiTileCard({ tile: 'target', label: 'Días con ventana', value: `${daysWithWindow} / 7`, sub: 'Cobertura semanal' })
    + kpiTileCard({ tile: 'gauge', label: 'Duración por ventana', value: '2', unit: 'h', sub: 'Horario valle 01:00 a 08:00' })
    + '</div></section>';

  const history = view.horariosHistory
    ? '<div class="history-list">'
      + (status.todayWindows.length === 0
        ? '<p class="note">Sin ventanas programadas para hoy.</p>'
        : status.todayWindows.map((w) => `<div class="detail-row"><b class="num">${w.window}</b>`
          + `<span>${escapeHtml(w.label)} · ${KIND_LABEL[w.kind]}</span></div>`).join(''))
      + '</div>'
    : '';
  const aside = '<aside class="card nota-card" aria-label="Nota sobre las ventanas de mantenimiento">'
    + `<div class="kpi-head"><span class="icon-tile tile-warn">${glyph(GLYPHS.calendar, 20)}</span><h3>Nota</h3></div>`
    + '<p class="note">Ventanas de 2 horas en horario valle (01:00 a 08:00), asignadas de forma '
    + 'determinista por equipo. La sala no se detiene: cada ventana cubre un solo equipo con su '
    + 'redundancia activa.</p>'
    + '<h4 class="aside-sub">Lineamientos</h4>'
    + `<div class="lineamiento"><span class="check-ink">${glyph(GLYPHS.check, 15)}</span>Una sola ventana activa por equipo, nunca simultáneas.</div>`
    + `<div class="lineamiento"><span class="check-ink">${glyph(GLYPHS.check, 15)}</span>Todas las ventanas caen en horario valle (01:00 a 08:00).</div>`
    + `<div class="lineamiento"><span class="check-ink">${glyph(GLYPHS.check, 15)}</span>La redundancia N+1 se mantiene durante cada intervención.</div>`
    + `<button type="button" class="link-btn" data-horarios-history aria-expanded="${Boolean(view.horariosHistory)}">Ver ventanas de hoy ${view.horariosHistory ? '▴' : '▾'}</button>`
    + history + '</aside>';

  const foot = `<p class="page-foot num page-span">Última actualización: ${formatSimDateTime(createSiteWeather({ tick }).timestamp)} · Zona horaria: UTC-06:00 (CDMX)</p>`;
  return `<div class="alerts-layout page-span">${weekCard}${aside}</div>` + summary + foot;
}

const BUILDERS = Object.freeze({
  tablero: tableroHtml,
  hvac: hvacHtml,
  ventiladores: ventiladoresHtml,
  cuarto: cuartoHtml,
  iluminacion: iluminacionHtml,
  energia: energiaHtml,
  tendencias: tendenciasHtml,
  alertas: alertasHtml,
  clima: climaHtml,
  horarios: horariosHtml,
});

/**
 * One section, one tick, one HTML string. Throws on unknown ids so typos fail loudly.
 * `view` (client round 3) is the shell's per-page re-render state — HVAC's selected unit,
 * Alertas' category filter and page. Builders that ignore it stay pure of it.
 */
export function renderSectionHtml(sectionId, { tick = 0, view = {} } = {}) {
  const builder = BUILDERS[sectionId];
  if (!builder) throw new RangeError(`Unknown dock section ${sectionId}.`);
  return builder(tick, view);
}
