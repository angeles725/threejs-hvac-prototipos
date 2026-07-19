/**
 * Content dock sections — pure HTML string builders for the lateral-menu workbench.
 *
 * Layout direction (client, full-page round 2026-07-16): Tablero is the ONLY section rendered
 * in the dock beside the 3D model; every other section renders as a FULL PAGE in the content
 * area. The builders stay pure strings either way — the shell decides where the HTML lands.
 *
 * Same discipline as dashboard/render.mjs: everything the operator reads is es-MX, identifiers
 * stay technical, all data is DERIVED from the deterministic sims (one tick in, one section out),
 * and the builders never touch the DOM or the scene. Honesty rules: constant states render as
 * read-only facts, simulated feeds say they are simulated, and empty states explain themselves.
 */
import { TC300_DEVICES, UC100_DEVICES, ZONES } from '../config.mjs';
import { createDashboardModel } from '../dashboard/model.mjs';
import { deviationTagFor, sparklineSvg } from '../dashboard/render.mjs';
import { createInteractionModel } from '../scene/interaction.js';
import { ALERT_CATEGORIES, createAlertsModel } from '../sim/alerts.mjs';
import {
  createEnergyDistribution,
  createEnergyModel,
  createFleetEnergySeries,
  createMonthDailySeries,
  createPreviousDaySeries,
  createUnitEnergySeries,
  ENERGY_POLICY,
} from '../sim/energy.mjs';
import { createLightingModel, LIGHT_SCENE_PROGRAM } from '../sim/lighting.mjs';
import { createPlantModel, PLANT_POLICY } from '../sim/plant.mjs';
import { createScheduleModel, deriveScheduleStatus } from '../sim/schedules.mjs';
import { createWeatherModel } from '../sim/weather.mjs';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const esMx = (value) => value.toLocaleString('es-MX');

// ---------------------------------------------------------------------------
// Handcrafted inline SVG glyphs (visual fidelity pass, 2026-07-18): one 24px grid, one 2px
// stroke, currentColor everywhere — the B43 tokens drive every color. No icon fonts, no
// libraries; each path is authored here for THIS project's vocabulary.
// ---------------------------------------------------------------------------
const glyph = (paths, size = 24) => (
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"`
  + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + `${paths}</svg>`
);

const GLYPHS = Object.freeze({
  /** Rooftop package unit: cabinet + fan + condenser vents. */
  rtu: '<rect x="3" y="6.5" width="18" height="11" rx="1.5"/><circle cx="9" cy="12" r="3"/>'
    + '<path d="M15.5 9.5h2.5M15.5 12h2.5M15.5 14.5h2.5"/>',
  /** Setpoint target: ring + center + axis ticks. */
  target: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6"/>'
    + '<path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7"/>',
  /** Occupancy: head + shoulders. */
  person: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20.5c1.1-4.2 3.8-6.3 6.5-6.3s5.4 2.1 6.5 6.3"/>',
  /** Temperature: bulb thermometer. */
  thermo: '<path d="M10.5 13.9V5a1.5 1.5 0 0 1 3 0v8.9a3.6 3.6 0 1 1-3 0z"/><path d="M12 10.5v5.5"/>',
  /** LoRaWAN link: mast + radiating arcs. */
  antenna: '<path d="M12 20.5v-8.7"/><circle cx="12" cy="9.5" r="2.3"/>'
    + '<path d="M7.2 4.7a7.4 7.4 0 0 0 0 9.6M16.8 4.7a7.4 7.4 0 0 1 0 9.6"/>',
  /** HVAC: four-blade fan around a hub. */
  fan: '<circle cx="12" cy="12" r="2.1"/>'
    + '<path d="M12 9.8c0-3 1.4-5.3 3.6-5.3 2 0 2.6 2.9.8 4.1-1.3.9-2.9 1.2-4.4 1.2'
    + 'M14.2 12c3 0 5.3 1.4 5.3 3.6 0 2-2.9 2.6-4.1.8-.9-1.3-1.2-2.9-1.2-4.4'
    + 'M12 14.2c0 3-1.4 5.3-3.6 5.3-2 0-2.6-2.9-.8-4.1 1.3-.9 2.9-1.2 4.4-1.2'
    + 'M9.8 12c-3 0-5.3-1.4-5.3-3.6 0-2 2.9-2.6 4.1-.8.9 1.3 1.2 2.9 1.2 4.4"/>',
  /** System: chip package + pins. */
  chipset: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>'
    + '<path d="M9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5"/>',
  /** Weather: clear. */
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5'
    + 'M5.2 5.2 7 7M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/>',
  /** Weather: partly cloudy (small sun behind a cloud). */
  cloudSun: '<circle cx="8" cy="7.5" r="2.6"/><path d="M8 2.5v1.7M2.5 7.5h1.7M4.1 3.6l1.2 1.2"/>'
    + '<path d="M10.5 19.5a4 4 0 1 1 .6-7.9 4.8 4.8 0 0 1 9.3 1.3 3.3 3.3 0 0 1-.9 6.6z"/>',
  /** Weather: overcast. */
  cloud: '<path d="M7.5 18.5a4.5 4.5 0 1 1 .7-8.9 5.2 5.2 0 0 1 10.1 1.4 3.6 3.6 0 0 1-1 7.5z"/>',
  /** Weather: light rain (cloud + three drops). */
  rain: '<path d="M7.5 15.5a4.2 4.2 0 1 1 .7-8.3 5 5 0 0 1 9.7 1.3 3.4 3.4 0 0 1-.9 6.9z"/>'
    + '<path d="M8.5 18.5l-1 2.7M12.5 18.5l-1 2.7M16.5 18.5l-1 2.7"/>',
  // Client round 4 (2026-07-18) — mockup vocabulary, same 24-grid / 2px-stroke discipline.
  /** Warning triangle. */
  warn: '<path d="M12 3.5 21.5 19.5H2.5z"/><path d="M12 9.5v4.2M12 16.6v.5"/>',
  /** Snowflake: three crossed axes + branch ticks. */
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>'
    + '<path d="M9.8 4.2 12 6.4l2.2-2.2M9.8 19.8 12 17.6l2.2 2.2"/>',
  /** Info: ring + i. */
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v4.8M12 8v.4"/>',
  /** Energy bolt. */
  bolt: '<path d="M13 2.5 5 13.5h5.5L10 21.5l8-11h-5.5z"/>',
  /** Calendar page. */
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/>'
    + '<path d="M3.5 9.5h17M8 2.8v3.8M16 2.8v3.8"/>',
  /** Search lens. */
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  /** Filter funnel. */
  funnel: '<path d="M3.5 4.5h17l-6.5 8v6l-4 2v-8z"/>',
  /** Download tray. */
  download: '<path d="M12 3.5v11M7.5 10.5l4.5 4 4.5-4M4 20h16"/>',
  /** Row chevron. */
  chevronRight: '<path d="M9 5.5l7 6.5-7 6.5"/>',
  /** Alert bell. */
  bell: '<path d="M6 16v-5.5a6 6 0 0 1 12 0V16l1.8 2.5H4.2z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>',
  /** Check mark. */
  check: '<path d="M4.5 12.5 10 18 19.5 6.5"/>',
  /** Kebab (round linecap dots). */
  kebab: '<path d="M12 5.2v.1M12 12v.1M12 18.8v.1"/>',
  /** 3D cube (the promo card tile). */
  cube: '<path d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9z"/><path d="M12 12l8.5-4.5M12 12 3.5 7.5M12 12v9.2"/>',
  /** Copy sheet pair. */
  copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="1.5"/>'
    + '<path d="M15 5.5v-.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h.5"/>',
  /** Pie / distribution. */
  pie: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 6"/>',
  /** Sort arrows: both, ascending, descending. */
  sortBoth: '<path d="M8.5 9.5 12 6l3.5 3.5M8.5 14.5 12 18l3.5-3.5"/>',
  sortAsc: '<path d="M7 14.5 12 9.5l5 5"/>',
  sortDesc: '<path d="M7 9.5l5 5 5-5"/>',
  // Client round 5 (2026-07-18) — the five remaining mockups, same 24-grid / 2px discipline.
  /** Raised hand (manual mode). */
  hand: '<path d="M8 11V5.5a1.25 1.25 0 0 1 2.5 0V10M10.5 10V4.5a1.25 1.25 0 0 1 2.5 0V10M13 10V5.5a1.25 1.25 0 0 1 2.5 0V12"/>'
    + '<path d="M8 11 6.4 9.4a1.35 1.35 0 0 0-1.9 1.9l3.8 4.9a5.2 5.2 0 0 0 4.1 2h.6a4.5 4.5 0 0 0 4.5-4.5V12"/>',
  /** Connectivity: wifi arcs + dot. */
  wifi: '<path d="M2.5 9a13.4 13.4 0 0 1 19 0M5.5 12.2a9.2 9.2 0 0 1 13 0M8.6 15.4a4.8 4.8 0 0 1 6.8 0"/>'
    + '<path d="M12 18.8v.1"/>',
  /** Shield + check (all-normal banner). */
  shieldCheck: '<path d="M12 2.8 20 6v5.5c0 5-3.4 8.4-8 9.7-4.6-1.3-8-4.7-8-9.7V6z"/>'
    + '<path d="M8.5 12l2.4 2.4 4.6-4.8"/>',
  /** Machine-room gear. */
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4'
    + 'M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
  /** Live-view eye. */
  eye: '<path d="M2.5 12c2.5-4.4 5.7-6.6 9.5-6.6s7 2.2 9.5 6.6c-2.5 4.4-5.7 6.6-9.5 6.6S5 16.4 2.5 12z"/>'
    + '<circle cx="12" cy="12" r="2.6"/>',
  /** Hour-average wave. */
  wave: '<path d="M2.5 13.5c2.4 0 2.4-5 4.8-5s2.4 7 4.7 7 2.4-9 4.8-9 2.4 7 4.7 7"/>',
  /** Closing-scene moon. */
  moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
  /** Función clapperboard. */
  clapper: '<rect x="3.5" y="10" width="17" height="9.5" rx="1.5"/>'
    + '<path d="M3.5 10 20.1 5.6l-.9-3.2L3.5 6.8z"/><path d="M8 8.8 6.5 5.6M12.5 7.6 11 4.4M17 6.4l-1.5-3.2"/>',
  /** Exterior street lamp. */
  lamp: '<path d="M9 21.5h6M12 21.5V12"/>'
    + '<path d="M6.5 9h11l-1.6-4.2a2 2 0 0 0-1.9-1.3H10a2 2 0 0 0-1.9 1.3z"/><path d="M8.5 12a3.5 3.5 0 0 0 7 0"/>',
  /** Humidity droplet. */
  droplet: '<path d="M12 3.2c3.2 3.9 5.6 7 5.6 10a5.6 5.6 0 1 1-11.2 0c0-3 2.4-6.1 5.6-10z"/>',
  /** Wind streams. */
  wind: '<path d="M3 8.5h9.5a2.6 2.6 0 1 0-2.6-2.6M3 12.5h14.5a2.7 2.7 0 1 1-2.7 2.7M3 16.5h7.5a2.4 2.4 0 1 1-2.4 2.4"/>',
  /** Pressure gauge. */
  gauge: '<path d="M4.5 18.5a8.5 8.5 0 1 1 15 0"/><path d="M12 13.5l3.8-4.5"/><circle cx="12" cy="14" r="1.4"/>',
});

/**
 * Sim-clock dates in the mockup format ("20 May 2024 11:24" grammar): "D MMM YYYY HH:MM" with
 * es abbreviations, read straight off the ISO string so the render never touches host time.
 */
const MONTH_ABBR_ES = Object.freeze(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
export function formatSimDateTime(timestamp) {
  if (typeof timestamp !== 'string' || timestamp.length < 16) return 'N/D';
  const year = timestamp.slice(0, 4);
  const month = MONTH_ABBR_ES[Number(timestamp.slice(5, 7)) - 1] ?? '?';
  const day = Number(timestamp.slice(8, 10));
  return `${day} ${month} ${year} ${timestamp.slice(11, 16)}`;
}

/** Condition → glyph for the Clima hero and day chips (closed sim vocabulary). */
const CONDITION_GLYPH = Object.freeze({
  Despejado: 'sun',
  'Parcialmente nublado': 'cloudSun',
  Nublado: 'cloud',
  'Lluvia ligera': 'rain',
});

/** Alert category → row glyph (closed ALERT_CATEGORIES vocabulary). */
const ALERT_CATEGORY_GLYPH = Object.freeze({
  HVAC: 'fan',
  Temperatura: 'thermo',
  Comunicación: 'antenna',
  Sistema: 'chipset',
});

/** Grouped taxonomy — the B-graft bound in the direction receipt. */
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
 * Full-page direction (client): only Tablero renders beside the 3D model; every other section
 * takes over the whole content area as a full page. Single-view correction (2026-07-18): the
 * scene ships exactly ONE fixed view, so the registry stopped naming cameras — the old
 * `camera` key (and the "Ver en la sala" jump it powered) is gone. The old `long` flag died
 * with the dock jump bar: full pages carry a breadcrumb header instead.
 */
export const SECTIONS = Object.freeze({
  tablero: Object.freeze({ label: 'Tablero', sub: 'Resumen del complejo' }),
  hvac: Object.freeze({ label: 'HVAC', sub: 'Zonas y consignas' }),
  ventiladores: Object.freeze({ label: 'Ventiladores', sub: 'Inventario RTU · solo lectura' }),
  cuarto: Object.freeze({ label: 'Cuarto de máquinas', sub: 'Flota RTU y gabinetes' }),
  iluminacion: Object.freeze({ label: 'Iluminación', sub: 'Escenas del complejo' }),
  energia: Object.freeze({ label: 'Energía', sub: 'Medición eléctrica simulada' }),
  tendencias: Object.freeze({ label: 'Tendencias', sub: 'Últimas 24 h por unidad' }),
  alertas: Object.freeze({ label: 'Alertas', sub: 'Derivadas de la telemetría' }),
  clima: Object.freeze({ label: 'Clima', sub: 'Ciudad de México · simulado' }),
  horarios: Object.freeze({ label: 'Horarios', sub: 'Semana operativa y consignas' }),
});

/**
 * Named lighting scenes. The house lighting itself is ALWAYS ON in this representation (the
 * lights-off state was removed 2026-07-15). Single-view correction (2026-07-18): a scene used
 * to move the 3D view toward the area it describes — with one fixed view that affordance would
 * be a lie, so the scenes are read-only facts of the operating program now (no `camera` key).
 */
export const LIGHTING_SCENES = Object.freeze({
  apertura: Object.freeze({ label: 'Apertura', description: 'Vestíbulo y recepción listos' }),
  funcion: Object.freeze({ label: 'Función', description: 'Salas en proyección' }),
  cierre: Object.freeze({ label: 'Cierre', description: 'Circulaciones y salida' }),
  exteriores: Object.freeze({ label: 'Exteriores', description: 'Fachada y marquesina' }),
});

const MODE_LABEL = Object.freeze({ cooling: 'Enfriando', standby: 'En espera' });
const modePill = (mode) => `<span class="pill ${mode === 'cooling' ? 'pill-accent' : 'pill-ok'}">${MODE_LABEL[mode] ?? escapeHtml(mode)}</span>`;

const card = (title, body, extraClass = '') => (
  `<div class="card${extraClass ? ` ${extraClass}` : ''}"><h3>${title}</h3>${body}</div>`
);

const kpiCard = (title, value, unit, sub, extraClass = '') => card(
  title,
  `<div class="kpi num">${value}${unit ? ` <small>${unit}</small>` : ''}</div>`
  + (sub ? `<div class="kpi-sub">${sub}</div>` : ''),
  extraClass,
);

function tableHtml(headers, rows, rowAttrs = []) {
  const head = headers.map(({ label, num }) => `<th${num ? ' class="num"' : ''}>${label}</th>`).join('');
  const body = rows.map((cells, index) => (
    `<tr${rowAttrs[index] ? ` ${rowAttrs[index]}` : ''}>${cells.join('')}</tr>`
  )).join('');
  return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/**
 * Ronda B (responsive, 2026-07-18): `th` stamps the column label onto the cell as `data-th`
 * so the phone tier can rebuild each row as a labeled card (CSS `attr(data-th)`) from the SAME
 * builder output. `sec` marks secondary columns the tablet tier hides (their data stays
 * reachable through the per-row detail reveal, the phone cards and the CSV export).
 */
const td = (value, num = false, { th = '', sec = false } = {}) => {
  const classes = [num ? 'num' : '', sec ? 'cell-sec' : ''].filter(Boolean).join(' ');
  return `<td${classes ? ` class="${classes}"` : ''}${th ? ` data-th="${escapeHtml(th)}"` : ''}>${value}</td>`;
};

/** Deviation cell shared by Tablero/HVAC — reuses the shipped deviation vocabulary. */
function deviationCell(unit) {
  const tag = deviationTagFor(unit);
  return td(`<span class="${tag.className}">${tag.text}</span>`, true, { th: 'Desvío' });
}

/**
 * Tablet-only per-row detail reveal (Ronda B): the chevron toggles a detail row carrying the
 * columns the tablet tier hides. Same delegated view-state pattern as the kebab menus —
 * `view.rowDetail` holds at most one open `table:key` and the builders stay pure.
 */
const rowExpandButton = (key, label, open) => (
  `<button type="button" class="row-expand" data-row-detail="${escapeHtml(key)}"`
  + ` aria-expanded="${open}" aria-label="Detalles de ${escapeHtml(label)}">${glyph(GLYPHS.sortDesc, 13)}</button>`
);

const detailPair = (label, value) => (
  `<span class="detail-pair"><span>${escapeHtml(label)}</span><b class="num">${value}</b></span>`
);

const rowDetailHtml = (colspan, pairs) => (
  `<tr class="action-row row-detail-row"><td colspan="${colspan}"><div class="action-menu">`
  + pairs.map(([label, value]) => detailPair(label, value)).join('')
  + '</div></td></tr>'
);

// ---------------------------------------------------------------------------
// Per-section builders
// ---------------------------------------------------------------------------

function tableroHtml(tick) {
  const dashboard = createDashboardModel({ tick });
  const interaction = createInteractionModel({ state: 'architecture', tick, selection: 'none' });
  const energy = createEnergyModel({ tick });
  const weather = createWeatherModel({ tick });
  const alerts = createAlertsModel({ tick });

  const kpis = `<div class="kpi-row">${[
    kpiCard('Energía ahora', energy.nowKw.toFixed(1), 'kW',
      `vs. día anterior <span class="num">${energy.vsPreviousDayPct >= 0 ? '+' : ''}${energy.vsPreviousDayPct.toFixed(1)}%</span>`),
    kpiCard('Clima · CDMX', weather.current.temperature.toFixed(0), '°C',
      `${escapeHtml(weather.current.condition)} · simulado`),
    kpiCard('Alertas activas', String(alerts.total), '',
      alerts.total === 0 ? 'Sin desvíos derivados' : `${alerts.countsByCategory.Temperatura} temperatura · ${alerts.countsByCategory.Comunicación} comunicación · ${alerts.countsByCategory.HVAC} HVAC`),
  ].join('')}</div>`;

  const rows = dashboard.boardUnits.map((unit) => {
    const reading = interaction.telemetry[unit.tc300Id];
    return [
      td(escapeHtml(unit.zoneLabel)),
      td(`${unit.temperature.toFixed(1)}°`, true, { th: 'Temp' }),
      td(`${unit.setpoint.toFixed(1)}°`, true, { th: 'Consigna' }),
      deviationCell(unit),
      td(modePill(reading.mode), false, { th: 'Modo' }),
      td(reading.occupancy === null ? 'N/D' : esMx(reading.occupancy), true, { th: 'Aforo' }),
    ];
  });
  const zones = card('Zonas', tableHtml([
    { label: 'Zona' }, { label: 'Temp', num: true }, { label: 'Consigna', num: true },
    { label: 'Desvío', num: true }, { label: 'Modo' }, { label: 'Aforo', num: true },
  ], rows));

  return kpis + zones;
}

// ---------------------------------------------------------------------------
// HVAC (client round 4, 2026-07-18, approved mockup): 4-card top strip (promo + three derived
// KPI cards) and ONE sortable/filterable/searchable table with CSV export. Everything below is
// derived per render from the same deterministic sims; the view state only reorders/filters.
// ---------------------------------------------------------------------------

/** Case- and diacritic-insensitive text for the live search. */
const foldText = (value) => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const HVAC_SORTERS = Object.freeze({
  unidad: (a, b) => a.unitId.localeCompare(b.unitId),
  temp: (a, b) => a.temperature - b.temperature || a.unitId.localeCompare(b.unitId),
});

/**
 * Pure row derivation for the Unidades table (exported: main.js reuses it for the CSV export
 * and the tests audit sort/filter/search against it). Same tick + view → same rows.
 */
export function deriveHvacRows({ tick = 0, view = {} } = {}) {
  const dashboard = createDashboardModel({ tick });
  const interaction = createInteractionModel({ state: 'architecture', tick, selection: 'none' });
  const all = dashboard.units.map((unit) => ({
    unitId: unit.unitId,
    tc300Id: unit.tc300Id,
    zoneLabel: unit.zoneLabel,
    temperature: unit.temperature,
    setpoint: unit.setpoint,
    deviation: Number((unit.temperature - unit.setpoint).toFixed(1)),
    outside: unit.temperature < unit.band[0] || unit.temperature > unit.band[1],
    mode: interaction.telemetry[unit.tc300Id].mode,
  }));
  const query = typeof view.hvacQuery === 'string' ? view.hvacQuery : '';
  const folded = foldText(query.trim());
  const mode = view.hvacMode === 'cooling' || view.hvacMode === 'standby' ? view.hvacMode : null;
  const rows = all.filter((row) => (
    (!folded || foldText(`${row.unitId} ${row.tc300Id} ${row.zoneLabel}`).includes(folded))
    && (!mode || row.mode === mode)
  ));
  const sort = HVAC_SORTERS[view.hvacSort] ? view.hvacSort : 'unidad';
  const dir = view.hvacDir === 'desc' ? 'desc' : 'asc';
  rows.sort((a, b) => (dir === 'asc' ? 1 : -1) * HVAC_SORTERS[sort](a, b));
  const modeCounts = {
    standby: rows.filter((row) => row.mode === 'standby').length,
    cooling: rows.filter((row) => row.mode === 'cooling').length,
  };
  return { rows, modeCounts, total: all.length, sort, dir, query, mode };
}

/** CSV field escaping per RFC 4180: quote when the field carries a comma, quote or newline. */
const csvField = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Pure serializer for the export control — the rows in, the file bytes out. */
export function hvacRowsToCsv(rows) {
  const header = 'Unidad,Termostato,Zona,Temperatura (°C),Consigna (°C),Desvío (°C),Modo';
  const lines = rows.map((row) => [
    row.unitId,
    row.tc300Id,
    row.zoneLabel,
    row.temperature.toFixed(1),
    row.setpoint.toFixed(1),
    `${row.deviation >= 0 ? '+' : ''}${row.deviation.toFixed(1)}`,
    MODE_LABEL[row.mode] ?? row.mode,
  ].map(csvField).join(','));
  return [header, ...lines].join('\n');
}

/** Mockup KPI card: icon tile + small-caps label + info tooltip, BIG value, muted subtitle. */
function kpiTileCard({ tile, tileClass = '', label, info, value, sub }) {
  return '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile${tileClass ? ` ${tileClass}` : ''}">${tile}</span>`
    + `<h3>${label}</h3>`
    + `<span class="kpi-info" role="img" title="${escapeHtml(info)}" aria-label="${escapeHtml(info)}">${glyph(GLYPHS.info, 15)}</span>`
    + '</div>'
    + `<div class="kpi num">${value}</div>`
    + `<div class="kpi-sub">${sub}</div>`
    + '</div>';
}

/** Sortable header cell: arrow glyphs + aria-sort, wired to the delegated sort pattern. */
function sortableTh({ label, col, attr, active, dir, num = false }) {
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const arrow = active ? (dir === 'asc' ? GLYPHS.sortAsc : GLYPHS.sortDesc) : GLYPHS.sortBoth;
  return `<th${num ? ' class="num"' : ''} aria-sort="${ariaSort}"> <button type="button" class="th-sort" ${attr}="${col}">${label} ${glyph(arrow, 12)}</button></th>`;
}

/** Signed deviation cell: warm ink above consigna, cool ink below, muted at 0.0. */
function deviationInk(deviation) {
  const cls = deviation > 0 ? 'dev-pos' : deviation < 0 ? 'dev-neg' : 'dev-zero';
  return `<span class="${cls} num">${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)} °C</span>`;
}

function hvacHtml(tick, view = {}) {
  const dashboard = createDashboardModel({ tick });
  const { rows, modeCounts, total, sort, dir, query, mode } = deriveHvacRows({ tick, view });

  // --- Top strip: promo card + three KPI cards, all derived live. ---
  const meanTemp = dashboard.units.reduce((sum, { temperature }) => sum + temperature, 0) / dashboard.units.length;
  const outsideCount = dashboard.units
    .filter(({ temperature, band }) => temperature < band[0] || temperature > band[1]).length;
  const allModes = deriveHvacRows({ tick }).modeCounts;
  const coolingPct = Math.round((allModes.cooling / total) * 100);

  const promo = '<div class="card promo-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.cube)}</span><h3>Ver en la sala</h3></div>`
    + '<p class="note">El modelo 3D del complejo muestra en vivo la temperatura, la consigna y el '
    + 'estado de cada zona sobre su propia sala.</p>'
    + '<button type="button" class="btn-accent" data-go-section="tablero">Ver en la sala</button>'
    + '</div>';
  const strip = `<div class="kpi-row kpi-row-4">${promo}${[
    kpiTileCard({
      tile: glyph(GLYPHS.thermo),
      label: 'Temp. promedio',
      info: 'Promedio de las 14 temperaturas de zona en vivo.',
      value: `${meanTemp.toFixed(1)} <small>°C</small>`,
      sub: 'Todas las zonas',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.warn),
      tileClass: outsideCount > 0 ? 'tile-warn' : '',
      label: 'Zonas fuera de banda',
      info: 'Zonas cuya lectura sale de ±1.5 °C respecto a su consigna.',
      value: `${outsideCount} <small>/ ${total}</small>`,
      sub: 'Requieren atención',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.snow),
      label: 'Equipos enfriando',
      info: 'Unidades cuyo TC300 reporta modo Enfriando en este instante.',
      value: `${allModes.cooling} <small>/ ${total}</small>`,
      sub: `${coolingPct}% del total`,
    }),
  ].join('')}</div>`;

  // --- Toolbar: live search + mode filter popover + CSV export (all functional). ---
  const filtersOpen = view.hvacFilters === true;
  const modeChip = (value, label, count) => (
    `<button type="button" class="cat-chip" data-hvac-mode="${value}"`
    + ` aria-pressed="${value === (mode ?? 'all')}">${label} <b class="num">${count}</b></button>`
  );
  const toolbar = '<div class="toolbar">'
    + `<label class="search-box">${glyph(GLYPHS.search, 15)}`
    + `<input type="search" data-hvac-search value="${escapeHtml(query)}"`
    + ' placeholder="Buscar unidad o zona…" aria-label="Buscar unidad o zona"></label>'
    + `<button type="button" class="toolbar-button" data-hvac-filters aria-expanded="${filtersOpen}">`
    + `${glyph(GLYPHS.funnel, 15)} Filtros</button>`
    + `<button type="button" class="toolbar-button" data-export-csv>${glyph(GLYPHS.download, 15)} Exportar CSV</button>`
    + '</div>'
    + (filtersOpen
      ? `<div class="cat-row hvac-modes">${[
        modeChip('all', 'Todos', total),
        modeChip('standby', MODE_LABEL.standby, allModes.standby),
        modeChip('cooling', MODE_LABEL.cooling, allModes.cooling),
      ].join('')}</div>`
      : '');

  // --- The table itself. ---
  const head = '<thead><tr>'
    + sortableTh({ label: 'Unidad', col: 'unidad', attr: 'data-hvac-sort', active: sort === 'unidad', dir })
    + '<th>Zona</th>'
    + sortableTh({ label: 'Temp', col: 'temp', attr: 'data-hvac-sort', active: sort === 'temp', dir, num: true })
    + '<th class="num cell-sec">Consigna</th><th class="num">Desvío</th><th>Modo</th>'
    + '<th class="row-action" aria-label="Abrir unidad"></th>'
    + '</tr></thead>';
  const body = rows.length === 0
    ? '<tr><td colspan="7"><p class="note">Sin unidades que coincidan con la búsqueda o el filtro.</p></td></tr>'
    : rows.map((row) => {
      const detailKey = `hvac:${row.unitId}`;
      const detailOpen = view.rowDetail === detailKey;
      return '<tr>'
      + td(`<span class="unit-pair num"><b>${row.unitId}</b> · ${row.tc300Id}</span>`)
      + td(escapeHtml(row.zoneLabel), false, { th: 'Zona' })
      + td(`${row.temperature.toFixed(1)} °C`, true, { th: 'Temp' })
      + td(`${row.setpoint.toFixed(1)} °C`, true, { th: 'Consigna', sec: true })
      + td(deviationInk(row.deviation), true, { th: 'Desvío' })
      + td(modePill(row.mode), false, { th: 'Modo' })
      + `<td class="row-action">${rowExpandButton(detailKey, row.unitId, detailOpen)}`
      + `<a class="row-link" href="dashboard.html?unit=${row.unitId}"`
      + ` aria-label="Ver unidad ${row.unitId} en la cartelera">${glyph(GLYPHS.chevronRight, 15)}</a></td>`
      + '</tr>'
      + (detailOpen
        ? rowDetailHtml(7, [['Consigna', `${row.setpoint.toFixed(1)} °C`], ['Termostato', row.tc300Id]])
        : '');
    }).join('');
  const table = `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;

  // --- Footer: live legend + honest count + pager (14 rows fit one page, ends disabled). ---
  const legendParts = [];
  if (modeCounts.standby > 0) legendParts.push(`<span class="legend-item num"><i class="dot dot-ok"></i>${modeCounts.standby} ${MODE_LABEL.standby}</span>`);
  if (modeCounts.cooling > 0) legendParts.push(`<span class="legend-item num"><i class="dot dot-accent"></i>${modeCounts.cooling} ${MODE_LABEL.cooling}</span>`);
  const shown = rows.length;
  const footer = '<div class="table-foot">'
    + `<span class="legend">${legendParts.join(' · ') || 'Sin unidades'}</span>`
    + '<span class="table-foot-right">'
    + `<span class="pager-count num">${shown === 0 ? 'Sin unidades' : `Mostrando 1 a ${shown} de ${shown} unidades`}</span>`
    + '<span class="pager-buttons">'
    + '<button type="button" class="pager-button" data-hvac-page="prev" disabled aria-label="Página anterior">‹</button>'
    + '<button type="button" class="pager-button" data-hvac-page="next" disabled aria-label="Página siguiente">›</button>'
    + '</span></span></div>';

  return strip + card('Unidades por zona', toolbar + table + footer, 'page-span');
}

// ---------------------------------------------------------------------------
// Ventiladores (client round 5, 2026-07-18, approved mockup): KPI strip + toolbar table +
// estado aside. The honest read-only truth survives (the 14 supply fans report constant
// Automático from their TC300); every visible control below is functional.
// ---------------------------------------------------------------------------

/** Shared toolbar (round-4 anatomy): live search + Filtros popover + CSV export. */
function tableToolbar({ searchAttr, query, filtersAttr, filtersOpen, chipsHtml, searchLabel }) {
  return '<div class="toolbar">'
    + `<label class="search-box">${glyph(GLYPHS.search, 15)}`
    + `<input type="search" ${searchAttr} value="${escapeHtml(query)}"`
    + ` placeholder="${escapeHtml(searchLabel)}" aria-label="${escapeHtml(searchLabel)}"></label>`
    + `<button type="button" class="toolbar-button" ${filtersAttr} aria-expanded="${filtersOpen}">`
    + `${glyph(GLYPHS.funnel, 15)} Filtros</button>`
    + `<button type="button" class="toolbar-button" data-export-csv>${glyph(GLYPHS.download, 15)} Exportar CSV</button>`
    + '</div>'
    + (filtersOpen ? `<div class="cat-row">${chipsHtml}</div>` : '');
}

/** RS-485 bus chips shared by the Ventiladores and Flota filters. */
function busChips({ attr, active, total, counts }) {
  const chip = (value, label, count) => (
    `<button type="button" class="cat-chip" ${attr}="${value}"`
    + ` aria-pressed="${value === (active ?? 'all')}">${label} <b class="num">${count}</b></button>`
  );
  return [
    chip('all', 'Todos', total),
    ...deriveBusUnits().map((entry) => chip(entry.bus, `Bus ${entry.bus}`, counts?.[entry.bus] ?? entry.count)),
  ].join('');
}

/**
 * ZONE GROUP MAPPING (documented, derived from the config zone registry — never hand-tallied):
 *  - kind `public` or `circulation` → Áreas públicas (vestíbulo, dulcería, revisión, pasillo)
 *  - kind `auditorium`              → Salas (1–8)
 *  - kind `service`, administración → Operaciones (the admin office runs the complex)
 *  - kind `service`, cocina         → Servicios (back-of-house food service)
 */
export function deriveZoneGroups() {
  const groupOf = (zone) => {
    if (zone.kind === 'public' || zone.kind === 'circulation') return 'publicas';
    if (zone.kind === 'auditorium') return 'salas';
    return zone.id === 'administration' ? 'operaciones' : 'servicios';
  };
  const groups = [
    { id: 'publicas', label: 'Áreas públicas' },
    { id: 'salas', label: 'Salas' },
    { id: 'operaciones', label: 'Operaciones' },
    { id: 'servicios', label: 'Servicios' },
  ];
  return groups.map((group) => {
    const zoneIds = ZONES.filter((zone) => groupOf(zone) === group.id).map(({ id }) => id);
    return Object.freeze({ ...group, zoneIds: Object.freeze(zoneIds), count: zoneIds.length });
  });
}

/** Per-bus unit counts, traced from the UC100 registry (the REAL topology, not the mockup). */
export function deriveBusUnits() {
  return UC100_DEVICES.map((device) => Object.freeze({
    bus: device.id.at(-1),
    uc100Id: device.id,
    count: device.memberIds.length,
  }));
}

const VENT_SORTERS = Object.freeze({
  unidad: (a, b) => a.unitId.localeCompare(b.unitId),
  zona: (a, b) => a.zoneLabel.localeCompare(b.zoneLabel) || a.unitId.localeCompare(b.unitId),
});

/** Pure row derivation for the Ventiladores table (search/filter/sort/page; CSV + tests). */
export function deriveVentRows({ tick = 0, view = {} } = {}) {
  const dashboard = createDashboardModel({ tick });
  const interaction = createInteractionModel({ state: 'architecture', tick, selection: 'none' });
  const all = dashboard.units.map((unit) => ({
    unitId: unit.unitId,
    tc300Id: unit.tc300Id,
    zoneLabel: unit.zoneLabel,
    bus: unit.bus,
    fan: interaction.telemetry[unit.tc300Id].fan === 'automatic' ? 'Automático' : 'Manual',
    connected: interaction.telemetry[unit.tc300Id].communication === 'normal',
  }));
  const query = typeof view.ventQuery === 'string' ? view.ventQuery : '';
  const folded = foldText(query.trim());
  const bus = ['A', 'B', 'C', 'D'].includes(view.ventBus) ? view.ventBus : null;
  const filteredRows = all.filter((row) => (
    (!folded || foldText(`${row.unitId} ${row.tc300Id} ${row.zoneLabel}`).includes(folded))
    && (!bus || row.bus === bus)
  ));
  const sort = VENT_SORTERS[view.ventSort] ? view.ventSort : 'unidad';
  const dir = view.ventDir === 'desc' ? 'desc' : 'asc';
  filteredRows.sort((a, b) => (dir === 'asc' ? 1 : -1) * VENT_SORTERS[sort](a, b));
  const pageSize = view.ventPageSize === 10 ? 10 : 25;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const rawPage = Number.isInteger(view.ventPage) ? view.ventPage : 1;
  const page = Math.min(Math.max(1, rawPage), pageCount);
  const start = (page - 1) * pageSize;
  const rows = filteredRows.slice(start, start + pageSize);
  return {
    rows,
    filteredRows,
    total: all.length,
    all,
    sort,
    dir,
    query,
    bus,
    page,
    pageCount,
    pageSize,
    from: filteredRows.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}

/** Pure CSV serializer for the Ventiladores export. */
export function ventRowsToCsv(rows) {
  const header = 'Unidad,Termostato,Zona,Ventilador,Fuente';
  const lines = rows.map((row) => [
    row.unitId, row.tc300Id, row.zoneLabel, row.fan, `TC300 · bus ${row.bus}`,
  ].map(csvField).join(','));
  return [header, ...lines].join('\n');
}

function ventiladoresHtml(tick, view = {}) {
  const derived = deriveVentRows({ tick, view });
  const { rows, filteredRows, all, total, sort, dir, query, bus } = derived;
  const stamp = createDashboardModel({ tick }).units[0].timestamp;
  const autoCount = all.filter(({ fan }) => fan === 'Automático').length;
  const manualCount = total - autoCount;
  const connectedCount = all.filter(({ connected }) => connected).length;
  const allAuto = manualCount === 0;

  // --- Top strip: estado card + four derived KPI cards. ---
  const estado = '<div class="card estado-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.fan)}</span><h3>Estado del inventario</h3>`
    + `<span class="kpi-info" role="img" title="Estado reportado por el TC300 de cada unidad; vista de solo lectura."`
    + ` aria-label="Estado reportado por el TC300 de cada unidad; vista de solo lectura.">${glyph(GLYPHS.info, 15)}</span></div>`
    + '<p class="note">Los catorce ventiladores de suministro reportan estado constante '
    + '<span class="pill pill-ok">Automático</span> desde su TC300. Vista de <b>solo lectura</b>: '
    + 'el mando local no se expone aquí.</p>'
    + '</div>';
  const strip = `<div class="kpi-row kpi-row-5">${estado}${[
    kpiTileCard({
      tile: glyph(GLYPHS.fan),
      label: 'Total ventiladores',
      info: 'Unidades de suministro registradas en el inventario.',
      value: `${total} <small>unidades</small>`,
      sub: '100% del inventario',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.check),
      tileClass: 'tile-ok',
      label: 'Automáticos',
      info: 'Unidades cuyo TC300 reporta ventilador en modo automático.',
      value: String(autoCount),
      sub: `${Math.round((autoCount / total) * 100)}% del total`,
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.hand),
      label: 'Manual',
      info: 'Unidades en mando manual local (ninguna en esta representación).',
      value: String(manualCount),
      sub: `${Math.round((manualCount / total) * 100)}% del total`,
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.wifi),
      label: 'Conectividad',
      info: 'Unidades con comunicación normal hacia su UC100.',
      value: `${Math.round((connectedCount / total) * 100)}% <small>operativos</small>`,
      sub: `${connectedCount} / ${total} conectados`,
    }),
  ].join('')}</div>`;

  // --- Table: toolbar + sortable columns + kebab with real actions + footer. ---
  const toolbar = tableToolbar({
    searchAttr: 'data-vent-search',
    query,
    searchLabel: 'Buscar unidad o zona…',
    filtersAttr: 'data-vent-filters',
    filtersOpen: view.ventFilters === true,
    chipsHtml: busChips({ attr: 'data-vent-bus', active: bus, total }),
  });
  const head = '<thead><tr>'
    + sortableTh({ label: 'Unidad', col: 'unidad', attr: 'data-vent-sort', active: sort === 'unidad', dir })
    + sortableTh({ label: 'Zona', col: 'zona', attr: 'data-vent-sort', active: sort === 'zona', dir })
    + '<th>Ventilador</th><th class="cell-sec">Fuente</th>'
    + '<th class="row-action" aria-label="Acciones"></th>'
    + '</tr></thead>';
  const body = rows.length === 0
    ? '<tr><td colspan="5"><p class="note">Sin ventiladores que coincidan con la búsqueda o el filtro.</p></td></tr>'
    : rows.map((row) => {
      const menuOpen = view.ventMenu === row.unitId;
      const mainRow = '<tr>'
        + td(`<span class="unit-pair num"><b>${row.unitId}</b> · ${row.tc300Id}</span>`)
        + td(escapeHtml(row.zoneLabel), false, { th: 'Zona' })
        + td(`<span class="pill ${row.fan === 'Automático' ? 'pill-ok' : 'pill-warn'}">${row.fan}</span>`, false, { th: 'Ventilador' })
        + td(`TC300 · bus ${row.bus}`, false, { th: 'Fuente', sec: true })
        + `<td class="row-action"><button type="button" class="kebab" data-vent-menu="${row.unitId}"`
        + ` aria-expanded="${menuOpen}" aria-label="Acciones para ${row.unitId}">${glyph(GLYPHS.kebab, 16)}</button></td>`
        + '</tr>';
      // The kebab exists BECAUSE it has real actions: open the unit page / copy the detail.
      // Ronda B: while the tablet tier hides the Fuente column, the open menu restates it.
      const actions = menuOpen
        ? '<tr class="action-row"><td colspan="5"><div class="action-menu">'
          + detailPair('Fuente', `TC300 · bus ${row.bus}`)
          + `<a class="action-item" href="dashboard.html?unit=${row.unitId}">${glyph(GLYPHS.chevronRight, 13)} Ver unidad</a>`
          + `<button type="button" class="action-item" data-copy-detail="${escapeHtml(`${row.unitId} · ${row.tc300Id} · ${row.zoneLabel} · ${row.fan}`)}">`
          + `${glyph(GLYPHS.copy, 13)} Copiar detalle</button>`
          + '</div></td></tr>'
        : '';
      return mainRow + actions;
    }).join('');
  const table = `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;
  const footer = '<div class="table-foot">'
    + `<span class="pager-count num">${filteredRows.length === 0
      ? 'Sin ventiladores'
      : `Mostrando ${derived.from} a ${derived.to} de ${filteredRows.length} ventiladores`}</span>`
    + '<span class="table-foot-right">'
    + '<label class="rows-per-page"><select data-vent-page-size aria-label="Ventiladores por página">'
    + `<option value="10"${derived.pageSize === 10 ? ' selected' : ''}>10</option>`
    + `<option value="25"${derived.pageSize === 25 ? ' selected' : ''}>25</option>`
    + '</select> por página</label>'
    + '<span class="pager-buttons">'
    + `<button type="button" class="pager-button" data-vent-page="prev"${derived.page <= 1 ? ' disabled' : ''} aria-label="Página anterior">‹</button>`
    + `<button type="button" class="pager-button" data-vent-page="next"${derived.page >= derived.pageCount ? ' disabled' : ''} aria-label="Página siguiente">›</button>`
    + '</span></span></div>';

  // --- Aside: truthful banner + bus donut + zone groups + live-data banner. ---
  const banner = allAuto
    ? '<div class="ok-banner">'
      + `<span class="icon-tile tile-ok">${glyph(GLYPHS.shieldCheck)}</span>`
      + '<span><b>Operación normal</b><p>Todos los ventiladores se encuentran en modo automático.</p></span>'
      + '</div>'
    : '<div class="ok-banner banner-warn">'
      + `<span class="icon-tile tile-warn">${glyph(GLYPHS.warn)}</span>`
      + `<span><b>Atención</b><p>${manualCount} ventilador(es) fuera de modo automático.</p></span>`
      + '</div>';
  const busEntries = deriveBusUnits();
  const busSegments = busEntries.map((entry) => ({
    id: entry.bus,
    sharePct: Number(((entry.count / total) * 100).toFixed(1)),
  }));
  const busLegend = busEntries.map((entry) => (
    `<li class="seg-bus-${entry.bus.toLowerCase()}"><i class="dot"></i>`
    + `<span>Bus ${entry.bus} · ${entry.count} ${entry.count === 1 ? 'unidad' : 'unidades'}</span>`
    + `<b class="num">${entry.uc100Id}</b></li>`
  )).join('');
  const zoneRows = deriveZoneGroups().map((group) => (
    `<div class="detail-row"><span>${group.label}</span><b class="count-badge num">${group.count}</b></div>`
  )).join('');
  const aside = '<aside class="card vent-aside" aria-label="Resumen de estado de los ventiladores">'
    + '<h3>Resumen de estado</h3>'
    + banner
    + '<h4 class="aside-sub">Fuentes de conexión</h4>'
    + `<div class="donut-wrap">${donutSvg(busSegments, {
      classFor: (segment) => `seg-bus-${segment.id.toLowerCase()}`,
      ariaLabel: 'Unidades por bus RS-485',
    })}<ul class="donut-legend">${busLegend}</ul></div>`
    + '<h4 class="aside-sub">Distribución por zona</h4>'
    + zoneRows
    + `<p class="info-banner">${glyph(GLYPHS.info, 15)}<span>Datos en tiempo real desde TC300. `
    + `Última actualización: <span class="num">${formatSimDateTime(stamp)}</span>.</span></p>`
    + '</aside>';

  return strip
    + '<div class="split-layout page-span">'
    + card('Ventiladores de suministro', toolbar + table + footer, 'split-main')
    + aside
    + '</div>';
}

// ---------------------------------------------------------------------------
// Cuarto de máquinas (client round 5, 2026-07-18, approved mockup): intro card with an
// isometric equipment illustration, "Ver en la sala" navigation card, four derived KPIs,
// the FLOTA RTU toolbar table and the rack/RS-485 aside. The round-3 rtu-card grid died
// with the mockup; every value still derives from the same plant model.
// ---------------------------------------------------------------------------

const CABINET_LABEL = Object.freeze({
  'telecom-front': 'Rack telecom (frente)',
  'left-control': 'Control izquierdo',
  'right-control': 'Control derecho',
  'kitchen-control': 'Control cocina',
});

/** Pure row derivation for the Flota RTU table (search/bus filter/page; CSV + tests). */
export function deriveFleetRows({ tick = 0, view = {} } = {}) {
  const plant = createPlantModel({ tick });
  const interaction = createInteractionModel({ state: 'architecture', tick, selection: 'none' });
  const all = plant.units.map((unit) => ({
    unitId: unit.unitId,
    tc300Id: unit.tc300Id,
    zoneLabel: unit.zoneLabel,
    bus: unit.bus,
    uc100Id: unit.uc100Id,
    cabinetLabel: CABINET_LABEL[unit.cabinet] ?? unit.cabinet,
    compressorHours: unit.compressorHours,
    fanHours: unit.fanHours,
    setpoint: unit.setpoint,
    mode: interaction.telemetry[unit.tc300Id].mode,
  }));
  const query = typeof view.cuartoQuery === 'string' ? view.cuartoQuery : '';
  const folded = foldText(query.trim());
  const bus = ['A', 'B', 'C', 'D'].includes(view.cuartoBus) ? view.cuartoBus : null;
  const filteredRows = all.filter((row) => (
    (!folded || foldText(`${row.unitId} ${row.tc300Id} ${row.zoneLabel} ${row.cabinetLabel}`).includes(folded))
    && (!bus || row.bus === bus)
  ));
  const pageSize = view.cuartoPageSize === 10 ? 10 : 25;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const rawPage = Number.isInteger(view.cuartoPage) ? view.cuartoPage : 1;
  const page = Math.min(Math.max(1, rawPage), pageCount);
  const start = (page - 1) * pageSize;
  const rows = filteredRows.slice(start, start + pageSize);
  return {
    rows,
    filteredRows,
    total: all.length,
    all,
    query,
    bus,
    page,
    pageCount,
    pageSize,
    from: filteredRows.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}

/** Pure CSV serializer for the Flota RTU export. */
export function fleetRowsToCsv(rows) {
  const header = 'Unidad,Termostato,Zona,Horas compresor,Horas ventilador,Consigna (°C),Gabinete,Caída';
  const lines = rows.map((row) => [
    row.unitId, row.tc300Id, row.zoneLabel, row.compressorHours, row.fanHours,
    row.setpoint.toFixed(1), row.cabinetLabel, `RS-485 · ${row.uc100Id}`,
  ].map(csvField).join(','));
  return [header, ...lines].join('\n');
}

/** DECORATIVE isometric equipment racks (handcrafted, accent-soft fills, aria-hidden). */
function cuartoIsoSvg() {
  // One isometric cabinet: top rhombus + two visible faces + louver lines on the front.
  const cabinet = (x, y, h) => (
    `<g transform="translate(${x}, ${y})">`
    + `<path d="M0 ${h} 0 10 22 0l22 10v${h}l-22 10z" fill="none"/>`
    + `<path d="M0 10 22 0l22 10-22 10z" fill="var(--accent-soft)" stroke="var(--accent-ink)" stroke-width="1.5"/>`
    + `<path d="M0 10v${h}l22 10V20z" fill="var(--surface)" stroke="var(--accent-ink)" stroke-width="1.5"/>`
    + `<path d="M44 10v${h}l-22 10V20z" fill="var(--accent-soft)" stroke="var(--accent-ink)" stroke-width="1.5"/>`
    + `<path d="M5 ${18 + 4}l12 5.5M5 ${18 + 11}l12 5.5M5 ${18 + 18}l12 5.5" stroke="var(--accent-ink)" stroke-width="1.5" stroke-linecap="round"/>`
    + '</g>'
  );
  return '<svg class="cuarto-iso" viewBox="0 0 190 96" aria-hidden="true">'
    + '<rect x="8" y="84" width="174" height="3" rx="1.5" fill="var(--accent-soft)"/>'
    + cabinet(18, 14, 52)
    + cabinet(74, 8, 58)
    + cabinet(130, 14, 52)
    + '</svg>';
}

/** DECORATIVE rack ↔ UC100 nodes diagram for the aside (handcrafted, aria-hidden). */
function rackDiagramSvg(nodes) {
  const chips = nodes.map((node, index) => {
    const y = 14 + index * 26;
    return `<line x1="70" y1="52" x2="122" y2="${y + 9}" stroke="var(--accent-ink)" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.6"/>`
      + `<g transform="translate(122, ${y})">`
      + '<rect width="76" height="19" rx="4" fill="var(--surface)" stroke="var(--line)"/>'
      + `<circle cx="11" cy="9.5" r="3.4" fill="var(--ok)"/>`
      + `<text x="20" y="13" font-size="9" font-weight="600" fill="var(--ink)">${node}</text>`
      + '</g>';
  }).join('');
  return '<svg class="rack-svg" viewBox="0 0 210 122" aria-hidden="true">'
    // The rack cabinet with unit slots.
    + '<rect x="18" y="10" width="52" height="96" rx="4" fill="var(--accent-soft)" stroke="var(--accent-ink)" stroke-width="1.5"/>'
    + '<path d="M24 26h40M24 44h40M24 62h40M24 80h40" stroke="var(--accent-ink)" stroke-width="1.5" stroke-linecap="round"/>'
    + '<circle cx="60" cy="18" r="1.8" fill="var(--accent-ink)"/>'
    + chips
    + '<text x="18" y="119" font-size="8.5" fill="var(--muted)">RS-485 · buses de campo</text>'
    + '</svg>';
}

function cuartoHtml(tick, view = {}) {
  const derived = deriveFleetRows({ tick, view });
  const { rows, filteredRows, all, total, query, bus } = derived;
  const alerts = createAlertsModel({ tick });
  // Documented derivation: the fleet's monthly compressor runtime is its fixed duty cycle
  // (PLANT_POLICY.compressorDuty) over a 30-day month — the same policy the hour meters ride.
  const monthlyCompressorHours = Math.round(PLANT_POLICY.compressorDuty * 24 * 30);
  // The aside describes the FIELD NETWORK (rack, RS-485, UC100), so its truthful health is the
  // communication domain: no active Comunicación alerts → Óptimo. Thermal deviations belong to
  // the Alertas KPI above, not to the rack's status line.
  const healthy = alerts.countsByCategory['Comunicación'] === 0;

  // --- Top strip: two info cards + four KPI cards. ---
  const intro = '<div class="card info-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.gear)}</span><h3>Cuarto de máquinas</h3></div>`
    + '<p class="note">Cada unidad paquete descansa sobre su curb en azotea; la caída RS-485 baja '
    + 'al gabinete UC100 de su bus. Las horas de marcha se derivan del reloj determinista de la '
    + 'simulación.</p>'
    + cuartoIsoSvg()
    + '</div>';
  const promo = '<div class="card info-card promo-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.eye)}</span><h3>Ver en la sala</h3></div>`
    + '<p class="note">El Tablero muestra en vivo la temperatura, la consigna y el estado de cada '
    + 'unidad sobre el modelo 3D del complejo.</p>'
    + '<button type="button" class="btn-accent" data-go-section="tablero">Ver en la sala →</button>'
    + '</div>';
  const strip = `<div class="cuarto-strip">${intro}${promo}${[
    kpiTileCard({
      tile: glyph(GLYPHS.rtu),
      tileClass: 'tile-ok',
      label: 'RTU activas',
      info: 'Unidades paquete entregando en este instante.',
      value: `${total} <small>/ ${total}</small>`,
      sub: '<span class="sub-ok">100% operativas</span>',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.wave),
      label: 'Prom. horas compresor',
      info: 'Ciclo de trabajo fijo del compresor (60%) sobre un mes de 30 días.',
      value: `${esMx(monthlyCompressorHours)} <small>h</small>`,
      sub: 'Promedio mensual',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.chipset),
      label: 'Nodos UC100',
      info: 'Concentradores UC100 leyendo la flota por RS-485.',
      value: String(UC100_DEVICES.length),
      sub: 'En línea',
    }),
    kpiTileCard({
      tile: glyph(GLYPHS.bell),
      tileClass: alerts.total > 0 ? 'tile-alarm' : 'tile-ok',
      label: 'Alertas',
      info: 'Alertas activas derivadas de la telemetría en este instante.',
      value: String(alerts.total),
      sub: alerts.total > 0 ? '<span class="sub-alarm">Requieren atención</span>' : 'Sin pendientes',
    }),
  ].join('')}</div>`;

  // --- Flota RTU table. ---
  const busCounts = Object.fromEntries(deriveBusUnits().map((entry) => [entry.bus, entry.count]));
  const toolbar = tableToolbar({
    searchAttr: 'data-cuarto-search',
    query,
    searchLabel: 'Buscar unidad, zona o gabinete…',
    filtersAttr: 'data-cuarto-filters',
    filtersOpen: view.cuartoFilters === true,
    chipsHtml: busChips({ attr: 'data-cuarto-bus', active: bus, total: all.length, counts: busCounts }),
  });
  const infoTh = (label, info, sec = false) => (
    `<th class="num${sec ? ' cell-sec' : ''}">${label} <span class="kpi-info" role="img" title="${escapeHtml(info)}"`
    + ` aria-label="${escapeHtml(info)}">${glyph(GLYPHS.info, 13)}</span></th>`
  );
  const head = '<thead><tr>'
    + '<th>Unidad</th><th>Zona</th>'
    + infoTh('Horas compresor', 'Base sembrada por unidad más el reloj simulado al 60% de ciclo.')
    + infoTh('Horas ventilador', 'El ventilador de suministro corre siempre que la unidad ventila (85% de ciclo).', true)
    + '<th class="num">Consigna</th><th class="cell-sec">Gabinete · caída</th>'
    + '</tr></thead>';
  const body = rows.length === 0
    ? '<tr><td colspan="6"><p class="note">Sin unidades que coincidan con la búsqueda o el filtro.</p></td></tr>'
    : rows.map((row) => {
      const detailKey = `cuarto:${row.unitId}`;
      const detailOpen = view.rowDetail === detailKey;
      return '<tr>'
      + td(`<span class="unit-cell"><span class="tag-chip num">${row.unitId}</span>`
        + '<i class="dot dot-ok" role="img" title="Entrega normal" aria-label="Entrega normal"></i>'
        + `${rowExpandButton(detailKey, row.unitId, detailOpen)}</span>`)
      + td(escapeHtml(row.zoneLabel), false, { th: 'Zona' })
      + td(`${esMx(row.compressorHours)} h`, true, { th: 'Horas compresor' })
      + td(`${esMx(row.fanHours)} h`, true, { th: 'Horas ventilador', sec: true })
      + td(`${row.setpoint.toFixed(1)}°`, true, { th: 'Consigna' })
      + td(`${escapeHtml(row.cabinetLabel)} · RS-485 · ${row.uc100Id}`, false, { th: 'Gabinete · caída', sec: true })
      + '</tr>'
      + (detailOpen
        ? rowDetailHtml(6, [
          ['Horas ventilador', `${esMx(row.fanHours)} h`],
          ['Gabinete · caída', `${escapeHtml(row.cabinetLabel)} · RS-485 · ${row.uc100Id}`],
        ])
        : '');
    }).join('');
  const table = `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;
  const footer = '<div class="table-foot">'
    + `<span class="pager-count num">${filteredRows.length === 0
      ? 'Sin unidades'
      : `Mostrando ${derived.from} a ${derived.to} de ${filteredRows.length} unidades`}</span>`
    + '<span class="table-foot-right">'
    + '<label class="rows-per-page">Filas por página '
    + '<select data-cuarto-page-size aria-label="Filas por página">'
    + `<option value="10"${derived.pageSize === 10 ? ' selected' : ''}>10</option>`
    + `<option value="25"${derived.pageSize === 25 ? ' selected' : ''}>25</option>`
    + '</select></label>'
    + '<span class="pager-buttons">'
    + `<button type="button" class="pager-button" data-cuarto-page="prev"${derived.page <= 1 ? ' disabled' : ''} aria-label="Página anterior">‹</button>`
    + `<button type="button" class="pager-button" data-cuarto-page="next"${derived.page >= derived.pageCount ? ' disabled' : ''} aria-label="Página siguiente">›</button>`
    + '</span></span></div>';

  // --- Aside: truthful health line + rack diagram + 2×2 mini-stats. ---
  const syncSeconds = (tick * 5) % 60;
  const aside = '<aside class="card vent-aside" aria-label="Gabinetes RS-485 y concentradores UC100">'
    + '<h3>Rack telecom · RS-485 · UC100</h3>'
    + `<p class="health-line">Estado del sistema: <b class="${healthy ? 'sub-ok' : 'sub-alarm'}">`
    + `${healthy ? 'Óptimo' : 'Con alertas'}</b></p>`
    + rackDiagramSvg(UC100_DEVICES.map(({ id }) => id))
    + '<div class="mini-stats">'
    + `<div class="mini-stat"><span>RS-485 activos</span><b class="num">${UC100_DEVICES.length}</b></div>`
    + `<div class="mini-stat"><span>Controles conectados</span><b class="num">${TC300_DEVICES.length}</b></div>`
    + `<div class="mini-stat"><span>Nodos en línea</span><b class="num">${TC300_DEVICES.length} / ${TC300_DEVICES.length}</b></div>`
    + `<div class="mini-stat"><span>Última sincronización</span><b class="num">Hace ${syncSeconds} s</b></div>`
    + '</div>'
    + '</aside>';

  return strip
    + '<div class="split-layout page-span">'
    + card('Flota RTU', toolbar + table + footer, 'split-main')
    + aside
    + '</div>';
}

// ---------------------------------------------------------------------------
// Iluminación (client round 5, 2026-07-18, approved mockup — copy REWRITTEN honestly): the
// four scenes become SELECTABLE cards. HONESTY DECISION (documented): the runtime never had a
// lighting-scene hook — the retired data-light-scene handler only moved the CAMERA (killed by
// the single-view correction), and the house rig is a gated static lighting pass. Selection
// therefore drives the SECTION's active-scene state only, and the copy says exactly that
// instead of promising 3D changes. The KPIs/timeline below derive from the lighting sim.
// ---------------------------------------------------------------------------

/** Scene id → glyph (closed LIGHTING_SCENES vocabulary). */
const SCENE_GLYPH = Object.freeze({
  apertura: 'sun', funcion: 'clapper', cierre: 'moon', exteriores: 'lamp',
});

/** Area status ink for the zone map + legend (documented thresholds). */
function areaStatusClass(pct) {
  if (pct >= 95) return 'map-ok';
  if (pct >= 90) return 'map-warn';
  return 'map-alarm';
}

/** Handcrafted zone map: a simplified block plan echoing the REAL layout (west salas, east
 *  salas, central corridor, front public band, service corner, exterior band). Carries live
 *  per-area state, so it is labeled — not aria-hidden. */
function zoneMapSvg(areas) {
  const byId = new Map(areas.map((area) => [area.id, area]));
  // Block plan in map units (240×176): front (z+) at the bottom, like the real plan.
  const BLOCKS = [
    { id: 'salas-oeste', x: 10, y: 10, w: 86, h: 74 },
    { id: 'salas-este', x: 144, y: 10, w: 86, h: 74 },
    { id: 'central-corridor', x: 100, y: 10, w: 40, h: 88 },
    { id: 'ticket-checkpoint', x: 100, y: 102, w: 40, h: 22 },
    { id: 'kitchen', x: 10, y: 88, w: 41, h: 36 },
    { id: 'administration', x: 55, y: 88, w: 41, h: 36 },
    { id: 'concessions', x: 144, y: 88, w: 86, h: 36 },
    { id: 'lobby', x: 10, y: 128, w: 220, h: 24 },
    { id: 'exterior', x: 10, y: 156, w: 220, h: 12 },
  ];
  const blocks = BLOCKS.map((block) => {
    const area = byId.get(block.id);
    if (!area) return '';
    const dotClass = area.total === 0 ? 'map-nodata' : areaStatusClass(area.pct);
    const narrow = block.w < 70;
    // Width-aware fit: wide bands keep name + right-aligned %, narrow blocks stack the %
    // under a truncated name so nothing collides.
    const fits = Math.floor((block.w - (narrow ? 16 : 34)) / 4.6);
    const short = area.label.length > fits ? `${area.label.slice(0, Math.max(4, fits - 1))}…` : area.label;
    const pctText = narrow
      ? `<text x="${block.x + 14}" y="${block.y + Math.min(block.h - 3, 22)}" font-size="7.5" font-weight="700"`
        + ` fill="var(--muted)">${area.pct.toFixed(0)}%</text>`
      : `<text x="${block.x + block.w - 5}" y="${block.y + 12}" font-size="7.5" font-weight="700"`
        + ` text-anchor="end" fill="var(--muted)">${area.pct.toFixed(0)}%</text>`;
    return `<g><rect x="${block.x}" y="${block.y}" width="${block.w}" height="${block.h}" rx="4"`
      + ' fill="var(--accent-soft)" stroke="var(--line)"/>'
      + `<circle class="${dotClass}" cx="${block.x + 8}" cy="${block.y + 9}" r="3.2" fill="currentColor"/>`
      + `<text x="${block.x + 14}" y="${block.y + 12}" font-size="7.5" fill="var(--ink)">${escapeHtml(short)}</text>`
      + pctText
      + '</g>';
  }).join('');
  return `<svg class="zone-map" viewBox="0 0 240 176" role="img"`
    + ' aria-label="Estado de las luminarias por área del complejo">'
    + blocks
    + '</svg>';
}

function iluminacionHtml(tick, view = {}) {
  const model = createLightingModel({ tick, sceneId: view.lightScene ?? null });
  const stamp = createDashboardModel({ tick }).units[0].timestamp;
  const activeScene = LIGHTING_SCENES[model.activeSceneId];

  // --- Row 1: honest intro + selectable scene cards. ---
  const intro = '<div class="card info-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.sun)}</span><h3>Alumbrado del complejo</h3></div>`
    + '<p class="note">En esta representación el alumbrado permanece encendido de forma '
    + '<b>continua</b>. Las escenas describen el ambiente lumínico de cada momento operativo del día; '
    + 'seleccionar una la marca como <b>escena activa de esta consola</b> — el programa y los '
    + 'indicadores de abajo siguen el reloj simulado.</p>'
    + '</div>';
  const sceneCards = Object.entries(LIGHTING_SCENES).map(([sceneId, scene]) => (
    `<button type="button" class="scene-item scene-select" data-light-scene="${sceneId}"`
    + ` aria-pressed="${sceneId === model.activeSceneId}">`
    + `<span class="icon-tile">${glyph(GLYPHS[SCENE_GLYPH[sceneId]])}</span>`
    + `<b>${scene.label}</b><span>${escapeHtml(scene.description)}</span>`
    + '</button>'
  )).join('');
  const scenes = '<div class="card scenes-card">'
    + `<div class="kpi-head"><h3>Escenas</h3>`
    + '<span class="kpi-info" role="img" title="La selección marca la escena activa de esta consola; el alumbrado del complejo no se conmuta."'
    + ' aria-label="La selección marca la escena activa de esta consola; el alumbrado del complejo no se conmuta.">'
    + `${glyph(GLYPHS.info, 15)}</span></div>`
    + `<div class="scene-grid">${sceneCards}</div>`
    + '</div>';
  const row1 = `<div class="ilum-top page-span">${intro}${scenes}</div>`;

  // --- Row 2: derived KPI cards. ---
  const activeChip = model.manual
    ? '<span class="cat-chip chip-static">Selección manual</span>'
    : `<span class="cat-chip chip-static num">Desde ${model.activeSince} · hora simulada</span>`;
  const activeCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS[SCENE_GLYPH[model.activeSceneId]])}</span>`
    + '<h3>Escena activa</h3></div>'
    + `<div class="kpi">${activeScene.label}</div>`
    + `<div class="kpi-sub">${escapeHtml(activeScene.description)}</div>`
    + `<div class="kpi-chip">${activeChip}</div>`
    + '</div>';
  const lum = model.fleet;
  const lumCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile tile-ok">${glyph(GLYPHS.check)}</span>`
    + '<h3>Luminarias operativas</h3>'
    + '<span class="kpi-info" role="img" title="Inventario sembrado por área; conteos deterministas de la simulación."'
    + ` aria-label="Inventario sembrado por área; conteos deterministas de la simulación.">${glyph(GLYPHS.info, 15)}</span></div>`
    + `<div class="kpi num">${lum.operative} <small>/ ${lum.total}</small></div>`
    + `<div class="kpi-sub">${lum.pct.toFixed(1)}% operativas</div>`
    + `<div class="progress"><i style="width:${lum.pct.toFixed(1)}%"></i></div>`
    + '</div>';
  const consumo = model.consumption;
  const consumoCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.bolt)}</span>`
    + '<h3>Consumo de iluminación</h3></div>'
    + `<div class="kpi num">${esMx(consumo.todayKwh)} <small>kWh</small></div>`
    + `<div class="kpi-sub">Hoy · vs. ayer ${signedPctSpan(consumo.vsYesterdayPct)}</div>`
    + '</div>';
  const ahorroCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile tile-ok">${glyph(GLYPHS.pie)}</span>`
    + '<h3>Ahorro estimado (mes)</h3></div>'
    + `<div class="kpi num">${model.savings.pct.toFixed(1)} <small>%</small></div>`
    + '<div class="kpi-sub">vs. mismo mes anterior</div>'
    + `<div class="kpi-chip"><span class="cat-chip chip-static num">Equivale a ${esMx(model.savings.equivalentKwh)} kWh</span></div>`
    + '</div>';
  const row2 = `<div class="kpi-row kpi-row-4">${activeCard}${lumCard}${consumoCard}${ahorroCard}</div>`;

  // --- Row 3: schedule timeline + zone map + informational automation rows. ---
  const STATUS_LABEL = Object.freeze({ completada: 'Completada', activa: 'Activa', programada: 'Programada' });
  const timeline = model.program.map((entry) => {
    const scene = LIGHTING_SCENES[entry.sceneId];
    const statusChip = entry.status === 'completada'
      ? '<span class="pill pill-ok">Completada</span>'
      : entry.status === 'activa'
        ? '<span class="pill pill-accent">Activa</span>'
        : '<span class="cat-chip chip-static">Programada</span>';
    return `<div class="tl-item${entry.status === 'activa' ? ' tl-active' : ''}">`
      + `<span class="tl-time num">${entry.time}</span>`
      + `<span class="tl-dot ${entry.status}"></span>`
      + `<span class="tl-body"><b>${scene.label}</b><span>${escapeHtml(scene.description)}</span></span>`
      + statusChip
      + '</div>';
  }).join('');
  const timelineCard = card('Programación del día',
    `<div class="tl">${timeline}</div>`
    + '<button type="button" class="link-btn" data-go-section="horarios">Ver horarios completos →</button>');
  const legend = '<div class="map-legend">'
    + '<span class="legend-item"><i class="dot map-ok"></i>Óptimo (≥ 95%)</span>'
    + '<span class="legend-item"><i class="dot map-warn"></i>Atención (90–94%)</span>'
    + '<span class="legend-item"><i class="dot map-alarm"></i>Crítico (&lt; 90%)</span>'
    + '<span class="legend-item"><i class="dot map-nodata"></i>Sin datos</span>'
    + '</div>';
  const mapCard = card('Estado por área', zoneMapSvg(model.areas) + legend);
  // The mockup's "Configurar escenas y reglas" CTA promises config UI this product does not
  // have — OMITTED (honesty rule): these rows are informational only.
  const autoRows = [
    { g: 'chipset', t: 'Modos inteligentes', d: 'El programa sigue el reloj operativo del complejo.' },
    { g: 'calendar', t: 'Escenas programables', d: 'Cuatro momentos del día con su ambiente lumínico.' },
    { g: 'bolt', t: 'Ahorro optimizado', d: 'La línea base de iluminación se audita contra Energía.' },
  ].map(({ g, t, d }) => (
    `<div class="auto-row"><span class="icon-tile">${glyph(GLYPHS[g])}</span>`
    + `<span class="tl-body"><b>${t}</b><span>${d}</span></span></div>`
  )).join('');
  const autoCard = card('Automatización y escenas', autoRows);
  const row3 = `<div class="ilum-grid page-span">${timelineCard}${mapCard}${autoCard}</div>`;

  const foot = `<p class="page-foot num page-span">Actualizado ${formatSimDateTime(stamp)} · `
    + 'Datos en tiempo real desde la red LoRaWAN</p>';

  return row1 + row2 + row3 + foot;
}

/** Shared sparkline body: normalized polyline over its own scale. */
function sparkPolyline(series, width, height) {
  const min = Math.min(...series) - 0.5;
  const max = Math.max(...series) + 0.5;
  return series
    .map((value, index) => `${((index * width) / (series.length - 1)).toFixed(1)},`
      + `${(height - ((value - min) / (max - min)) * height).toFixed(1)}`)
    .join(' ');
}

/**
 * Generic series strip. `hover` attaches the delegated data-points contract ONLY when the
 * series truly is the last-24h half-hour grid the tooltip's "hace N h" math assumes; the
 * period series (yesterday, month days) render without it rather than lie about their axis.
 */
function seriesSparkSvg(series, { className = 'chispa', unit = 'kW', hover = false, width = 120, height = 26 } = {}) {
  const hoverData = hover
    ? ` data-points="${series.map((value) => Number(value.toFixed(2))).join(',')}" data-unit="${unit}"`
    : '';
  return `<svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"${hoverData} aria-hidden="true">`
    + `<polyline points="${sparkPolyline(series, width, height)}" fill="none" stroke="var(--accent-ink)" stroke-width="1.2"`
    + ' vector-effect="non-scaling-stroke"/></svg>';
}

/** Per-unit energy strip (Tendencias + the meter table): its own kW scale, hover contract on. */
function energySparkSvg(unitIndex) {
  return seriesSparkSvg(createUnitEnergySeries(unitIndex), { className: 'chispa chispa-energia', hover: true });
}

/** Signed percentage span on the existing inks: increases warm, decreases cool, 0 muted. */
function signedPctSpan(pct) {
  const cls = pct > 0 ? 'dev-pos' : pct < 0 ? 'dev-neg' : 'dev-zero';
  return `<span class="${cls} num">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
}

/** Donut segment colors — existing tokens only, one per category. */
const DONUT_SEGMENT_CLASS = Object.freeze({
  climatizacion: 'seg-clim',
  ventilacion: 'seg-vent',
  iluminacion: 'seg-luz',
  otros: 'seg-otros',
});

/** SVG donut over the one-decimal shares (circumference-100 circle trick — shares map 1:1).
 *  Round 5: parameterized so the Ventiladores bus donut reuses the same builder. */
function donutSvg(segments, {
  classFor = (segment) => DONUT_SEGMENT_CLASS[segment.id],
  ariaLabel = 'Distribución actual del consumo',
} = {}) {
  const radius = 15.915; // 2πr = 100 → dash lengths ARE percentages.
  let offset = 25; // Start at 12 o'clock.
  const circles = segments.map((segment) => {
    const circle = `<circle class="donut-seg ${classFor(segment)}" cx="21" cy="21" r="${radius}"`
      + ` fill="none" stroke="currentColor" stroke-width="6"`
      + ` stroke-dasharray="${segment.sharePct} ${(100 - segment.sharePct).toFixed(1)}"`
      + ` stroke-dashoffset="${offset.toFixed(1)}"/>`;
    offset -= segment.sharePct;
    return circle;
  }).join('');
  return `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${escapeHtml(ariaLabel)}">${circles}</svg>`;
}

/**
 * Energía (client round 4, 2026-07-18, approved mockup): four top cards — three period KPIs
 * with sparklines and derived comparisons, plus the seeded distribution donut — and the meter
 * table with per-row 24 h strips, kW sort (desc default) and a functional rows-per-page pager.
 * The truthful column family stays: kW, one supply voltage, FP — no fabricated phases/Hz.
 */
function energiaHtml(tick, view = {}) {
  const energy = createEnergyModel({ tick });
  const dist = createEnergyDistribution({ tick });
  const stamp = createDashboardModel({ tick }).units[0].timestamp;

  const periodCard = ({ tile, title, value, unit, sub, series, hover = false }) => (
    '<div class="card kpi-hero">'
    + `<div class="kpi-head"><span class="icon-tile">${tile}</span><h3>${title}</h3></div>`
    + `<div class="kpi num">${value} <small>${unit}</small></div>`
    + `<div class="kpi-sub">${sub}</div>`
    + `<div class="kpi-spark">${seriesSparkSvg(series, { className: 'chispa chispa-kpi', hover })}</div>`
    + '</div>'
  );
  const legend = dist.segments.map((segment) => (
    `<li class="${DONUT_SEGMENT_CLASS[segment.id]}"><i class="dot"></i>`
    + `<span>${segment.label}</span><b class="num">${segment.sharePct.toFixed(1)}%</b></li>`
  )).join('');
  const kpis = `<div class="kpi-row kpi-row-4">${[
    periodCard({
      tile: glyph(GLYPHS.bolt),
      title: 'Ahora',
      value: energy.nowKw.toFixed(1),
      unit: 'kW',
      sub: `vs. día anterior ${signedPctSpan(energy.vsPreviousDayPct)}`,
      series: createFleetEnergySeries(),
      hover: true,
    }),
    periodCard({
      tile: glyph(GLYPHS.calendar),
      title: 'Día anterior',
      value: esMx(energy.previousDayKwh),
      unit: 'kWh',
      sub: `vs. mismo día ant. ${signedPctSpan(energy.vsSameDayPct)}`,
      series: createPreviousDaySeries(),
    }),
    periodCard({
      tile: glyph(GLYPHS.calendar),
      title: 'Mes',
      value: esMx(energy.monthKwh),
      unit: 'kWh',
      sub: `vs. mes anterior ${signedPctSpan(energy.vsPreviousMonthPct)}`,
      series: createMonthDailySeries(),
    }),
    '<div class="card kpi-hero donut-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.pie)}</span><h3>Distribución actual</h3></div>`
    + `<div class="donut-wrap">${donutSvg(dist.segments)}<ul class="donut-legend">${legend}</ul></div>`
    + `<p class="donut-foot num">Actualizado: ${formatSimDateTime(stamp)} · hora simulada</p>`
    + '</div>',
  ].join('')}</div>`;

  // --- Meter table: kW sort + page size view state. ---
  const dir = view.energyDir === 'asc' ? 'asc' : 'desc';
  const pageSize = view.energyPageSize === 10 ? 10 : 25;
  const meters = energy.perUnit.map((meter, index) => ({ ...meter, seriesIndex: index }));
  meters.sort((a, b) => (dir === 'asc' ? 1 : -1) * (a.kw - b.kw || a.unitId.localeCompare(b.unitId)));
  const pageCount = Math.max(1, Math.ceil(meters.length / pageSize));
  const rawPage = Number.isInteger(view.energyPage) ? view.energyPage : 1;
  const page = Math.min(Math.max(1, rawPage), pageCount);
  const start = (page - 1) * pageSize;
  const pageMeters = meters.slice(start, start + pageSize);

  const head = '<thead><tr>'
    + '<th>Unidad</th><th>Zona</th><th>Tendencia 24 h</th>'
    + sortableTh({ label: 'kW', col: 'kw', attr: 'data-energy-sort', active: true, dir, num: true })
    + '<th class="num cell-sec">V</th><th class="num cell-sec">FP</th>'
    + '<th class="row-action" aria-label="Abrir unidad"></th>'
    + '</tr></thead>';
  // The status dot mirrors the one truthful delivery state (the healthy sim always delivers).
  const body = pageMeters.map((meter) => {
    const detailKey = `energia:${meter.unitId}`;
    const detailOpen = view.rowDetail === detailKey;
    return '<tr>'
      + td(`<span class="unit-cell"><span class="tag-chip num">${meter.unitId}</span>`
        + '<i class="dot dot-ok" role="img" title="Entrega normal" aria-label="Entrega normal"></i></span>')
      + td(escapeHtml(meter.zoneLabel), false, { th: 'Zona' })
      + td(energySparkSvg(meter.seriesIndex), false, { th: 'Tendencia 24 h' })
      + td(meter.kw.toFixed(1), true, { th: 'kW' })
      + td(String(meter.voltage), true, { th: 'V', sec: true })
      + td(meter.powerFactor.toFixed(2), true, { th: 'FP', sec: true })
      + `<td class="row-action">${rowExpandButton(detailKey, meter.unitId, detailOpen)}`
      + `<a class="row-link" href="dashboard.html?unit=${meter.unitId}"`
      + ` aria-label="Ver unidad ${meter.unitId} en la cartelera">${glyph(GLYPHS.chevronRight, 15)}</a></td>`
      + '</tr>'
      + (detailOpen
        ? rowDetailHtml(7, [['Tensión', `${meter.voltage} V`], ['Factor de potencia', meter.powerFactor.toFixed(2)]])
        : '');
  }).join('');
  const table = `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;

  const from = start + 1;
  const to = start + pageMeters.length;
  const countText = pageCount === 1
    ? `Mostrando ${meters.length} de ${meters.length} unidades`
    : `Mostrando ${from} a ${to} de ${meters.length} unidades`;
  const footer = '<div class="table-foot">'
    + `<span class="pager-count num">${countText}</span>`
    + '<span class="table-foot-right">'
    + '<label class="rows-per-page">Filas por página '
    + '<select data-energy-page-size aria-label="Filas por página">'
    + `<option value="10"${pageSize === 10 ? ' selected' : ''}>10</option>`
    + `<option value="25"${pageSize === 25 ? ' selected' : ''}>25</option>`
    + '</select></label>'
    + '<span class="pager-buttons">'
    + `<button type="button" class="pager-button" data-energy-page="prev"${page <= 1 ? ' disabled' : ''} aria-label="Página anterior">‹</button>`
    + `<span class="pager-page num">${page} / ${pageCount}</span>`
    + `<button type="button" class="pager-button" data-energy-page="next"${page >= pageCount ? ' disabled' : ''} aria-label="Página siguiente">›</button>`
    + '</span></span></div>';
  const note = '<p class="table-note">El medidor simulado expone demanda (kW), tensión de '
    + 'suministro (V) y factor de potencia (FP); no mide por fase ni frecuencia.</p>';

  return kpis + card('Medición por unidad', table + footer + note, 'page-span');
}

/**
 * Tendencias (client round 3, 2026-07-18, BMS reference): the strips regroup into a CHART GRID
 * with one category header per group — Temperaturas, then Energía — Trend-Logs style. The same
 * sparkline builders and the same delegated hover contract (data-points/data-unit) serve both.
 */
function tendenciasHtml(tick) {
  const dashboard = createDashboardModel({ tick });
  // Fidelity pass: every tile carries a timeframe subtitle under its bold title, so the grid
  // reads as instrument tiles (title + "Últimas 24 h · …" + strip).
  const trendSub = '<p class="trend-sub">Últimas 24 h · 1 punto / 30 min</p>';
  const tempCards = dashboard.units.map((unit) => card(
    `<span class="num">${unit.unitId}</span> · ${escapeHtml(unit.zoneLabel)}`,
    trendSub
    + `<div class="trend-row">${sparklineSvg(unit, { hoverData: true })}`
    + `<span class="num trend-value">${unit.temperature.toFixed(1)} °C</span></div>`,
    'trend-card',
  )).join('');
  const energyCards = dashboard.units.map((unit) => card(
    `<span class="num">${unit.unitId}</span> · ${escapeHtml(unit.zoneLabel)}`,
    trendSub
    + `<div class="trend-row">${energySparkSvg(unit.seriesIndex)}</div>`,
    'trend-card',
  )).join('');
  const group = (title, cards) => (
    `<section class="trend-group"><h3 class="trend-group-head">${title}</h3>`
    + `<div class="trend-grid">${cards}</div></section>`
  );
  const note = card('Lectura', '<p class="note">48 puntos · uno cada 30 min · la banda gris es la '
    + 'consigna ±1.5 °C. El último punto de temperatura es la lectura en vivo. Al pasar el puntero '
    + 'sobre una serie se lee el punto exacto (hora relativa y valor).</p>');
  return note + group('Temperaturas', tempCards) + group('Energía', energyCards);
}

/** Default page size of the Alertas table (client round 4: 8 → 10, select offers 10/25). */
export const ALERTS_PAGE_SIZE = 10;

/** Decorative aside illustration: antenna/gateway motif + icon bubbles. Handcrafted, aria-hidden. */
function derivArtSvg() {
  const bubble = (cx, cy, paths) => (
    `<circle cx="${cx}" cy="${cy}" r="14" fill="var(--accent-soft)"/>`
    + `<g transform="translate(${cx - 8}, ${cy - 8}) scale(0.67)" stroke="var(--accent-ink)"`
    + ' stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    + `${paths}</g>`
  );
  return '<svg class="deriv-art" viewBox="0 0 220 132" aria-hidden="true">'
    + '<rect x="12" y="104" width="196" height="3" rx="1.5" fill="var(--accent-soft)"/>'
    // Gateway mast + radiating arcs, center stage.
    + '<g stroke="var(--muted)" stroke-width="2.5" fill="none" stroke-linecap="round">'
    + '<path d="M110 104V56"/><circle cx="110" cy="47" r="7"/>'
    + '<path d="M92 34a26 26 0 0 0 0 27M128 34a26 26 0 0 1 0 27"/>'
    + '<path d="M83 25a38 38 0 0 0 0 45M137 25a38 38 0 0 1 0 45"/>'
    + '</g>'
    // Cabinet at the mast foot.
    + '<rect x="96" y="84" width="28" height="20" rx="3" fill="var(--accent-soft)"/>'
    + '<path d="M101 90h18M101 95h12" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round"/>'
    // Telemetry bubbles: thermometer, radio waves, demand bolt.
    + bubble(38, 44, GLYPHS.thermo)
    + bubble(182, 44, GLYPHS.antenna)
    + bubble(182, 96, GLYPHS.bolt)
    // Dashed derivation links into the mast.
    + '<g stroke="var(--accent-ink)" stroke-width="1.5" stroke-dasharray="3 4" fill="none" opacity="0.6">'
    + '<path d="M52 48c18 4 34 6 44 6M168 48c-18 4-34 6-44 6M168 92c-16-6-32-14-46-26"/>'
    + '</g>'
    + '</svg>';
}

/** Windowed page-number list: every page when few, 1 … around-current … last when many. */
function pageWindow(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const list = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const windowed = [];
  for (const [index, value] of list.entries()) {
    if (index > 0 && value - list[index - 1] > 1) windowed.push('gap');
    windowed.push(value);
  }
  return windowed;
}

/**
 * Alertas (client round 4, 2026-07-18, approved mockup): counted category chips, three summary
 * cards (críticas / advertencia / resueltas hoy — the last one from the sim-day walk), and the
 * table over the WHOLE day universe (active + resolved) with sim-clock dates, estado pills, a
 * kebab menu with real actions only, numbered pagination and the derivación aside.
 * View state: alertCat, alertSev, alertPage, alertPageSize, alertDateDir, alertMenu.
 */
function alertasHtml(tick, view = {}) {
  const model = createAlertsModel({ tick });

  // --- The day universe: active alerts (dated now) + resolved episodes (dated at resolution).
  const activeRows = model.alerts.map((alert) => ({
    ...alert,
    estado: 'Activa',
    displaySeverity: alert.severity,
    at: model.timestamp,
    sortTick: model.tick,
  }));
  const resolvedRows = model.resolved.map((episode) => ({
    ...episode,
    estado: 'Resuelta',
    displaySeverity: 'resuelta',
    at: episode.resolvedAt,
    sortTick: episode.resolvedTick,
  }));
  const universe = [...activeRows, ...resolvedRows];

  // --- Filters (category + severity), date sort, pagination. ---
  const activeCat = ALERT_CATEGORIES.includes(view.alertCat) ? view.alertCat : 'all';
  const activeSev = ['crítica', 'advertencia', 'resuelta'].includes(view.alertSev) ? view.alertSev : null;
  const dateDir = view.alertDateDir === 'asc' ? 'asc' : 'desc';
  const filtered = universe.filter((row) => (
    (activeCat === 'all' || row.category === activeCat)
    && (!activeSev || row.displaySeverity === activeSev)
  ));
  filtered.sort((a, b) => (dateDir === 'asc' ? 1 : -1) * (a.sortTick - b.sortTick));
  const pageSize = view.alertPageSize === 25 ? 25 : ALERTS_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rawPage = Number.isInteger(view.alertPage) ? view.alertPage : 1;
  const page = Math.min(Math.max(1, rawPage), pageCount);
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  // --- Category chips: counts over the day universe so every number reconciles with the table.
  const countFor = (category) => universe.filter((row) => row.category === category).length;
  const chip = (value, label, count) => (
    `<button type="button" class="cat-chip${count === 0 ? ' cat-chip-empty' : ''}" data-alert-cat="${value}"`
    + ` aria-pressed="${value === activeCat}">${label} <b class="num">${count}</b></button>`
  );
  const chips = [
    chip('all', 'Todas', universe.length),
    ...ALERT_CATEGORIES.map((category) => chip(category, category, countFor(category))),
  ].join('');

  // --- Summary cards: live counts + functional severity chevrons. ---
  const criticalCount = model.alerts.filter(({ severity }) => severity === 'crítica').length;
  const warningCount = model.alerts.filter(({ severity }) => severity === 'advertencia').length;
  const summaryCard = ({ tile, tileClass, label, sev, count, sub }) => (
    '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile ${tileClass}">${tile}</span><h3>${label}</h3>`
    + `<button type="button" class="sum-chevron" data-alert-sev="${sev}"`
    + ` aria-pressed="${activeSev === sev}" aria-label="Filtrar la tabla: ${label}">${glyph(GLYPHS.chevronRight, 15)}</button>`
    + '</div>'
    + `<div class="kpi num">${count}</div>`
    + `<div class="kpi-sub">${sub}</div>`
    + '</div>'
  );
  const summary = `<div class="alert-summary">${[
    summaryCard({
      tile: glyph(GLYPHS.bell), tileClass: 'tile-alarm', label: 'Críticas', sev: 'crítica',
      count: criticalCount, sub: 'Requieren atención inmediata',
    }),
    summaryCard({
      tile: glyph(GLYPHS.warn), tileClass: 'tile-warn', label: 'Advertencia', sev: 'advertencia',
      count: warningCount, sub: 'Revisión recomendada',
    }),
    summaryCard({
      tile: glyph(GLYPHS.check), tileClass: 'tile-ok', label: 'Resueltas (hoy)', sev: 'resuelta',
      count: model.resolvedToday, sub: 'Alertas normalizadas',
    }),
  ].join('')}</div>`;

  // --- Table over the filtered universe. ---
  const sevClass = Object.freeze({ 'crítica': 'sev-critical', advertencia: 'sev-warn', resuelta: 'sev-ok' });
  const head = '<thead><tr>'
    + '<th>Dispositivo</th><th class="cell-sec">Categoría</th><th>Severidad</th><th>Detalle</th>'
    + sortableTh({ label: 'Fecha / hora', col: 'fecha', attr: 'data-alert-sort', active: true, dir: dateDir })
    + '<th>Estado</th>'
    + '<th class="row-action" aria-label="Acciones"></th>'
    + '</tr></thead>';
  let body;
  if (pageRows.length === 0) {
    body = `<tr><td colspan="7"><p class="note">Sin alertas ${activeCat === 'all' ? '' : `de la categoría ${activeCat} `}`
      + 'en este filtro · todas las lecturas dentro de banda.</p></td></tr>';
  } else {
    body = pageRows.map((row) => {
      const menuOpen = view.alertMenu === row.id;
      const unitMatch = /^(?:TC300|RTU)-(\d{2})$/.exec(row.deviceId);
      const mainRow = '<tr data-alert-row>'
        + td(`<b class="cell-device num">${row.deviceId}</b>`)
        + td(`<span class="cat-cell">${glyph(GLYPHS[ALERT_CATEGORY_GLYPH[row.category]] ?? GLYPHS.chipset, 16)}${row.category}</span>`, false, { th: 'Categoría', sec: true })
        + td(`<span class="sev ${sevClass[row.displaySeverity]}">${row.displaySeverity}</span>`, false, { th: 'Severidad' })
        + td(escapeHtml(row.message), false, { th: 'Detalle' })
        + td(`<span class="num">${formatSimDateTime(row.at)}</span>`, false, { th: 'Fecha / hora' })
        + td(`<span class="pill ${row.estado === 'Activa' ? 'pill-accent' : 'pill-ok'}">${row.estado}</span>`, false, { th: 'Estado' })
        + `<td class="row-action"><button type="button" class="kebab" data-alert-menu="${escapeHtml(row.id)}"`
        + ` aria-expanded="${menuOpen}" aria-label="Acciones para ${row.deviceId}">${glyph(GLYPHS.kebab, 16)}</button></td>`
        + '</tr>';
      // The kebab exists BECAUSE it has real actions: open the unit page / copy the detail.
      // Ronda B: while the tablet tier hides the Categoría column, the open menu restates it.
      const actions = menuOpen
        ? '<tr class="action-row"><td colspan="7"><div class="action-menu">'
          + detailPair('Categoría', escapeHtml(row.category))
          + (unitMatch
            ? `<a class="action-item" href="dashboard.html?unit=RTU-${unitMatch[1]}">${glyph(GLYPHS.chevronRight, 13)} Ver unidad</a>`
            : '')
          + `<button type="button" class="action-item" data-copy-detail="${escapeHtml(`${row.deviceId} · ${row.message}`)}">`
          + `${glyph(GLYPHS.copy, 13)} Copiar detalle</button>`
          + '</div></td></tr>'
        : '';
      return mainRow + actions;
    }).join('');
  }
  const table = `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;

  // --- Footer: honest count, rows-per-page select, numbered pager. ---
  const from = filtered.length === 0 ? 0 : start + 1;
  const to = start + pageRows.length;
  const numbers = pageWindow(page, pageCount).map((value) => (
    value === 'gap'
      ? '<span class="pager-gap">…</span>'
      : `<button type="button" class="pager-button num${value === page ? ' active' : ''}"`
        + ` data-alert-page="${value}"${value === page ? ' aria-current="page"' : ''}>${value}</button>`
  )).join('');
  const footer = '<div class="table-foot">'
    + `<span class="pager-count num">${filtered.length === 0 ? 'Sin alertas' : `Mostrando ${from} a ${to} de ${filtered.length} alertas`}</span>`
    + '<span class="table-foot-right">'
    + '<label class="rows-per-page">Filas por página '
    + '<select data-alert-page-size aria-label="Filas por página">'
    + `<option value="10"${pageSize === 10 ? ' selected' : ''}>10</option>`
    + `<option value="25"${pageSize === 25 ? ' selected' : ''}>25</option>`
    + '</select></label>'
    + '<span class="pager-buttons">'
    + `<button type="button" class="pager-button" data-alert-page="prev"${page <= 1 ? ' disabled' : ''} aria-label="Página anterior">‹</button>`
    + numbers
    + `<button type="button" class="pager-button" data-alert-page="next"${page >= pageCount ? ' disabled' : ''} aria-label="Página siguiente">›</button>`
    + '</span></span></div>';

  // --- Derivación aside: honest copy + decorative illustration. ---
  const aside = '<aside class="card deriv-card" aria-label="Cómo se derivan las alertas">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.info)}</span><h3>Derivación</h3></div>`
    + '<p class="note">Cada alerta se deriva de la telemetría simulada (desvío de banda, señal '
    + 'LoRaWAN, demanda eléctrica) y se <b>restablece sola</b> al volver la lectura a su umbral. '
    + 'No se simula reconocimiento manual: la columna Estado refleja el recorrido del propio día '
    + 'simulado, contado sobre la misma malla de 30 minutos de las series.</p>'
    + derivArtSvg()
    + '</aside>';

  return `<div class="cat-row">${chips}</div>`
    + summary
    + '<div class="alerts-layout page-span">'
    + card('Alertas activas', table + footer, 'alerts-card')
    + aside
    + '</div>';
}

/**
 * Clima (client round 5, 2026-07-18, approved mockup): condition HERO with a decorative
 * illustration, the 5-per-page forecast carousel (the sim owns 7 days → 2 functional dots),
 * the honest FUENTE aside, four derived weather cards (UV / sensación / lluvia / relación
 * HVAC) and the conditions summary strip. Every number rides createWeatherModel().derived.
 */
const DAY_FULL_NAME = Object.freeze({
  Dom: 'Domingo', Lun: 'Lunes', Mar: 'Martes', Mié: 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', Sáb: 'Sábado',
});

/** Five-band UV scale (1–2 / 3–5 / 6–7 / 8–10 / 11+) with a marker at the live index. */
function uvScaleSvg(index) {
  const bands = ['uv-b1', 'uv-b2', 'uv-b3', 'uv-b4', 'uv-b5'];
  const segments = bands.map((cls, i) => (
    `<rect class="${cls}" x="${i * 20.4}" y="4" width="18.4" height="6" rx="3" fill="currentColor"/>`
  )).join('');
  const x = Math.min(11, index) / 11 * 98 + 1;
  return `<svg class="uv-scale" viewBox="0 0 100 14" aria-hidden="true">${segments}`
    + `<path d="M${x.toFixed(1)} 0.8l3 4.2h-6z" fill="var(--ink)"/></svg>`;
}

function climaHtml(tick, view = {}) {
  const weather = createWeatherModel({ tick });
  const derived = weather.derived;
  const stamp = createDashboardModel({ tick }).units[0].timestamp;
  const conditionGlyph = (condition, size) => glyph(GLYPHS[CONDITION_GLYPH[condition] ?? 'cloud'], size);

  // --- Row 1: hero + 5-day carousel + honest source aside. ---
  const hero = '<div class="card clima-hero-card">'
    + `<div class="kpi-head"><h3>Ahora · ${escapeHtml(weather.city)}</h3>`
    + '<span class="kpi-info" role="img" title="Condiciones simuladas deterministas; misma marca de tiempo que la telemetría."'
    + ` aria-label="Condiciones simuladas deterministas; misma marca de tiempo que la telemetría.">${glyph(GLYPHS.info, 15)}</span></div>`
    + '<div class="clima-hero">'
    + '<div class="clima-now">'
    + `<span class="clima-illus" aria-hidden="true">${conditionGlyph(weather.current.condition, 64)}</span>`
    + '<span class="clima-main">'
    + `<span class="clima-temp num">${weather.current.temperature.toFixed(1)}<small>°C</small></span>`
    + `<span class="clima-cond">${escapeHtml(weather.current.condition)}</span></span>`
    + '</div>'
    + '<div class="clima-reads">'
    + `<div class="clima-read"><span>${glyph(GLYPHS.droplet, 13)} Humedad</span><b class="num">${weather.current.humidityPct}%</b></div>`
    + `<div class="clima-read"><span>${glyph(GLYPHS.wind, 13)} Viento</span><b class="num">${weather.current.windKmh} km/h</b></div>`
    + '</div></div>'
    + `<p class="donut-foot num">Actualizado ${formatSimDateTime(stamp)}</p>`
    + '</div>';

  const pageCount = Math.ceil(weather.forecast.length / 5);
  const page = Number.isInteger(view.climaPage) ? Math.min(Math.max(0, view.climaPage), pageCount - 1) : 0;
  const days = weather.forecast.slice(page * 5, page * 5 + 5);
  const strip = days.map((day) => (
    `<div class="dia"><b>${DAY_FULL_NAME[day.dayLabel] ?? day.dayLabel}</b>`
    + `<span class="dia-temps num"><b class="dia-hi">${day.maxC}°</b><span class="dia-lo">/ ${day.minC}°</span></span>`
    + `<span class="dia-glyph">${conditionGlyph(day.condition, 18)}</span>`
    + `<span>${escapeHtml(day.condition)}</span>`
    + `<span class="dia-meta num">${glyph(GLYPHS.droplet, 11)} ${day.humidityPct}% · ${glyph(GLYPHS.wind, 11)} ${day.windKmh} km/h</span>`
    + '</div>'
  )).join('');
  const dots = Array.from({ length: pageCount }, (_, index) => (
    `<button type="button" class="dot-btn" data-clima-page="${index}"`
    + ` aria-pressed="${index === page}" aria-label="Días ${index * 5 + 1} a ${Math.min((index + 1) * 5, weather.forecast.length)}"></button>`
  )).join('');
  const forecastCard = '<div class="card clima-forecast-card">'
    + '<div class="kpi-head"><h3>Próximos 5 días</h3></div>'
    + `<div class="dia-strip dia-strip-5">${strip}</div>`
    + `<div class="carousel-dots">${dots}</div>`
    + '</div>';

  const fuente = '<aside class="card clima-fuente" aria-label="Fuente de los datos meteorológicos">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.antenna)}</span><h3>Fuente</h3></div>`
    + '<p class="note">La serie meteorológica es una <b>simulación determinista</b>: no hay '
    + 'conexión a un servicio externo y ningún dato sale del complejo.</p>'
    + '<span class="cat-chip chip-static">Serie simulada · misma marca de tiempo que la telemetría</span>'
    + `<p class="donut-foot num">Última actualización ${formatSimDateTime(stamp)}</p>`
    + '</aside>';
  const row1 = `<div class="clima-top page-span">${hero}${forecastCard}${fuente}</div>`;

  // --- Row 2: derived cards (documented formulas in src/sim/weather.mjs). ---
  const UV_ADVICE = Object.freeze({
    Bajo: 'Sin protección especial necesaria.',
    Moderado: 'Usa protección en exteriores prolongados.',
    Alto: 'Evita el sol directo del mediodía.',
    'Muy alto': 'Protección obligatoria en exteriores.',
    Extremo: 'Exposición exterior peligrosa.',
  });
  const uvCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile ${derived.uv.index >= 8 ? 'tile-alarm' : derived.uv.index >= 6 ? 'tile-warn' : ''}">${glyph(GLYPHS.sun)}</span><h3>Índice UV</h3></div>`
    + `<div class="kpi num">${derived.uv.index} <small>${derived.uv.level}</small></div>`
    + uvScaleSvg(derived.uv.index)
    + `<div class="kpi-sub">${UV_ADVICE[derived.uv.level]}</div>`
    + '</div>';
  const feelsCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.thermo)}</span><h3>Sensación térmica</h3></div>`
    + `<div class="kpi num">${derived.feelsLike.c.toFixed(1)} <small>°C</small></div>`
    + `<div class="kpi-sub">${derived.feelsLike.deltaLabel}</div>`
    + `<div class="kpi-spark">${seriesSparkSvg(derived.feelsLike.series, { className: 'chispa chispa-kpi', unit: '°C', hover: true })}</div>`
    + `<div class="kpi-sub">${derived.feelsLike.trendLabel}</div>`
    + '</div>';
  const rainBars = derived.rain.map((slot) => (
    `<div class="rain-bar"><span class="num">${slot.pct}%</span>`
    + `<i style="height:${Math.max(6, slot.pct)}%"></i><b>${slot.label}</b></div>`
  )).join('');
  const rainCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.rain)}</span><h3>Probabilidad de lluvia</h3></div>`
    + `<div class="kpi num">${derived.rain[0].pct} <small>%</small></div>`
    + `<div class="rain-bars">${rainBars}</div>`
    + '</div>';
  const relation = derived.hvacRelation;
  const ring = '<svg class="hvac-ring" viewBox="0 0 42 42" role="img"'
    + ` aria-label="Relación del clima con la demanda HVAC: ${relation.pct}% (${relation.level})">`
    + '<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--accent-soft)" stroke-width="5"/>'
    + `<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--accent)" stroke-width="5"`
    + ` stroke-linecap="round" stroke-dasharray="${relation.pct} ${100 - relation.pct}" stroke-dashoffset="25"/>`
    + `<text x="21" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink)">${relation.pct}%</text>`
    + `<text x="21" y="29" text-anchor="middle" font-size="6" fill="var(--muted)">${relation.level}</text>`
    + '</svg>';
  const relationCard = '<div class="card kpi-card">'
    + `<div class="kpi-head"><span class="icon-tile">${glyph(GLYPHS.rtu)}</span><h3>Relación con demanda HVAC</h3></div>`
    + `<div class="ring-wrap">${ring}</div>`
    + '<div class="kpi-sub">Derivada de la temperatura y humedad exteriores frente a la banda '
    + 'de enfriamiento simulada.</div>'
    + '</div>';
  const row2 = `<div class="kpi-row kpi-row-4">${uvCard}${feelsCard}${rainCard}${relationCard}</div>`;

  // --- Bottom strip: deterministic summary + derived station readings. ---
  const summary = `${escapeHtml(weather.current.condition)} con ${weather.current.temperature.toFixed(1)} °C `
    + `y humedad del ${weather.current.humidityPct}%. Probabilidad de lluvia del ${derived.rain[0].pct}% `
    + `ahora; demanda HVAC ${relation.level.toLowerCase()} para la climatización del complejo.`;
  const stat = (label, value, sub) => (
    `<div class="mini-stat"><span>${label}</span><b class="num">${value}</b><small>${sub}</small></div>`
  );
  const stripCard = card('Resumen de condiciones',
    '<div class="cond-strip">'
    + `<div class="cond-summary"><span class="icon-tile">${glyph(GLYPHS.thermo)}</span>`
    + `<p class="note">${summary}</p></div>`
    + '<div class="cond-stats">'
    + stat('Punto de rocío', `${derived.dewPointC.toFixed(1)} °C`, derived.dewLabel)
    + stat('Visibilidad', `${derived.visibilityKm} km`, derived.visibilityLabel)
    + stat('Presión atmosférica', `${derived.pressureHpa} hPa`, derived.pressureLabel)
    + '</div></div>',
    'page-span');

  return row1 + row2 + stripCard;
}

/**
 * Horarios (client round 5, 2026-07-18, approved mockup): the weekly grid survives; the
 * calendar gains per-period status dots and the next-change countdown banner; the weekly
 * summary and the amber NOTA aside (with a TRUTHFUL lineamientos checklist and a real
 * today's-transitions history toggle) complete the mockup. All sim-clock derived.
 */
function horariosHtml(tick, view = {}) {
  const model = createScheduleModel();
  const status = deriveScheduleStatus({ tick });
  const stamp = createDashboardModel({ tick }).units[0].timestamp;

  // --- Semana operativa: 7 day cards with boxed apertura/cierre values. ---
  const columns = model.week.map((entry) => (
    `<div class="week-day"><p class="week-day-head">${entry.day}</p>`
    + `<div class="week-slot"><span class="week-equip">Apertura</span><b class="num">${entry.opening}</b></div>`
    + `<div class="week-slot"><span class="week-equip">Cierre</span><b class="num">${entry.closing}</b></div>`
    + '</div>'
  )).join('');
  const weekCard = card('Semana operativa',
    `<div class="week-scroll"><div class="week-grid">${columns}</div></div>`, 'page-span');

  // --- Calendario de consignas: status dot per period + the countdown banner. ---
  const DOT_BY_STATUS = Object.freeze({ activa: 'dot-accent', completada: 'dot-ok', programada: 'dot-muted' });
  const calendarRows = status.periods.map((period) => [
    td(`<span class="legend-item"><i class="dot ${DOT_BY_STATUS[period.status]}"></i>${period.period}</span>`),
    td(period.window, true, { th: 'Horario' }),
    td(`${period.salasC.toFixed(1)}°`, true, { th: 'Salas' }),
    td(`${period.comunesC.toFixed(1)}°`, true, { th: 'Zonas comunes' }),
  ]);
  const banner = '<div class="next-change">'
    + `<span class="next-label">Próximo cambio</span>`
    + `<b>${status.nextChange.period} · <span class="num">${status.nextChange.time}</span></b>`
    + `<span class="cat-chip chip-static num countdown">${status.nextChange.countdownLabel}</span>`
    + '</div>';
  const calendarCard = card('Calendario de consignas', tableHtml([
    { label: 'Periodo' }, { label: 'Horario', num: true },
    { label: 'Salas', num: true }, { label: 'Zonas comunes', num: true },
  ], calendarRows) + banner);

  // --- Resumen semanal: four KPI cards computed from the declared week. ---
  const resumen = '<section class="resumen-semanal"><h3 class="trend-group-head">Resumen semanal</h3>'
    + `<div class="kpi-row kpi-row-4">${[
      kpiTileCard({
        tile: glyph(GLYPHS.calendar), label: 'Total de aperturas',
        info: 'Una apertura por día de la semana operativa declarada.',
        value: String(status.weekly.openings), sub: 'Esta semana',
      }),
      kpiTileCard({
        tile: glyph(GLYPHS.moon), label: 'Total de cierres',
        info: 'Un cierre por día; viernes y sábado cierran pasada la medianoche.',
        value: String(status.weekly.closings), sub: 'Esta semana',
      }),
      kpiTileCard({
        tile: glyph(GLYPHS.wave), label: 'Horas de operación',
        info: 'Promedio de horas abiertas por día sobre la semana declarada.',
        value: `${status.weekly.avgDailyHours} <small>h</small>`, sub: 'Promedio por día',
      }),
      kpiTileCard({
        tile: glyph(GLYPHS.target), label: 'Consigna promedio salas',
        info: 'Media de las consignas de sala de los cuatro periodos del calendario.',
        value: `${status.weekly.avgSalasC} <small>°C</small>`, sub: `Periodo actual: ${status.activePeriod.period}`,
      }),
    ].join('')}</div></section>`;

  // --- NOTA aside: truthful facts + truthful checklist + real history toggle. ---
  const lineamientos = [
    'Los horarios se aplican automáticamente según el día de la semana.',
    'Todas las consignas del calendario permanecen dentro de los límites del TC300 (18–26 °C).',
    'La cocina conserva su consigna de servicio durante todo el día.',
  ].map((text) => (
    `<div class="lineamiento"><span class="check-ink">${glyph(GLYPHS.check, 14)}</span><span>${text}</span></div>`
  )).join('');
  const historyOpen = view.horariosHistory === true;
  const historyRows = status.transitionsToday.length === 0
    ? '<p class="note">Sin cambios de periodo en el día simulado todavía.</p>'
    : status.transitionsToday.map((entry) => (
      `<div class="detail-row"><span><b class="num">${entry.time}</b> · ${entry.period}</span>`
      + `<b class="num">${entry.salasC.toFixed(1)}° salas</b></div>`
    )).join('');
  const aside = '<aside class="card nota-card" aria-label="Nota sobre el calendario de consignas">'
    + `<div class="kpi-head"><span class="icon-tile tile-warn">${glyph(GLYPHS.calendar)}</span><h3>Nota</h3></div>`
    + '<p class="note">Calendario dentro de los límites de consigna del TC300 (18–26 °C); '
    + 'la cocina conserva su consigna de servicio todo el día.</p>'
    + '<h4 class="aside-sub">Lineamientos</h4>'
    + lineamientos
    + `<button type="button" class="link-btn" data-horarios-history aria-expanded="${historyOpen}">`
    + `Ver historial de cambios ${historyOpen ? '▴' : '▾'}</button>`
    + (historyOpen ? `<div class="history-list">${historyRows}</div>` : '')
    + '</aside>';

  const foot = `<p class="page-foot num page-span">Última actualización: ${formatSimDateTime(stamp)} · `
    + 'Zona horaria: UTC-06:00 (CDMX)</p>';

  return weekCard
    + '<div class="split-layout page-span">'
    + `<div class="split-main">${calendarCard}${resumen}</div>`
    + aside
    + '</div>'
    + foot;
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
 *
 * `view` (client round 3): PRESENTATION state for the sections that carry local interactivity —
 * `{ zone }` for the HVAC detail panel, `{ alertCat, alertPage }` for the Alertas filter and
 * pagination. The shell's delegated click handlers re-render through this same entry point, so
 * every view stays deterministic and the default view is the meaningful no-JS static state.
 */
export function renderSectionHtml(sectionId, { tick = 0, view = {} } = {}) {
  const builder = BUILDERS[sectionId];
  if (!builder) throw new RangeError(`Unknown dock section ${sectionId}.`);
  return builder(tick, view);
}

/** Sanity export used by tests: registries must agree. */
export const SECTION_DEVICE_COUNT = Object.freeze({
  tc300: TC300_DEVICES.length,
  uc100: UC100_DEVICES.length,
});
