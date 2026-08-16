// Dashboard view-model — PURE. The single derivation every surface renders from.
//
// deriveDashboardModel(readings) is the ONLY place a displayed string is produced. The DOM
// renderer, the 3D bindings and any future table view all consume this object; none of them
// formats or thresholds anything itself. That is what makes two surfaces unable to contradict.
//
// The rule this enforces, from the kit's own scar tissue: a page once ended its boot by writing
// a hard-coded "no alarms" status literal, clobbering the derived copy — five fault states all
// booted announcing no alarms, one of them with 14 active. Nothing here writes a literal that a
// derivation also owns.

import { SYSTEM_COLOR, CONTRIBUTOR_STYLE, CONTRIBUTOR_ORDER, STATUS } from './tokens.mjs';

// --- formatting -------------------------------------------------------------------------------
// Every number reaches the DOM through one of these, so precision is a property of the QUANTITY
// and not of the call site.
const fmt = (v, dp) =>
  Number.isFinite(v) ? v.toFixed(dp) : '—';

export const FORMAT = Object.freeze({
  kw: (v) => fmt(v, 1),
  kwCoarse: (v) => fmt(v, 0),
  psi: (v) => fmt(v, 1),
  cfm: (v) => fmt(v, 0),
  lux: (v) => fmt(v, 0),
  pct: (v) => fmt(v * 100, 0),
  ratio: (v) => fmt(v, 2),
});

/**
 * Merge the simulation's five contributors into the four the stacked bar shows.
 * Envelope and infiltration are one physical family (transfer with the outside, same driver),
 * so they merge — see tokens.mjs for why this is physics and not palette convenience.
 */
export function mergeContributors(contributors) {
  const by = Object.fromEntries(contributors.map((c) => [c.id, c.kw]));
  const merged = {
    compressors: by.compressors ?? 0,
    exterior: (by.envelope ?? 0) + (by.infiltration ?? 0),
    lighting: by.lighting ?? 0,
    people: by.people ?? 0,
  };
  const positive = CONTRIBUTOR_ORDER.reduce((s, k) => s + Math.max(0, merged[k]), 0) || 1;
  return CONTRIBUTOR_ORDER.map((id) => ({
    id,
    label: CONTRIBUTOR_STYLE[id].label,
    system: CONTRIBUTOR_STYLE[id].system,
    color: CONTRIBUTOR_STYLE[id].dark,
    kw: merged[id],
    share: Math.max(0, merged[id]) / positive,
    // Direct-labelled whenever the segment is wide enough to hold text; the legend carries the
    // rest. Identity is never colour-alone.
    directLabel: Math.max(0, merged[id]) / positive >= 0.08,
  }));
}

/** Tier-1 KPI band: the "is the plant OK" answer in six numbers. */
function tier1(r) {
  return [
    { id: 'plant-kw', label: 'Potencia total', value: FORMAT.kw(r.plant.totalKw), unit: 'kW', kind: 'aggregate' },
    { id: 'cooling-kw', label: 'Carga térmica', value: FORMAT.kw(r.thermal.coolingLoadKw), unit: 'kW', kind: 'derived' },
    { id: 'hvac-kw', label: 'Consumo HVAC', value: FORMAT.kw(r.hvac.drawKw), unit: 'kW', kind: 'derived', system: 'hvac' },
    { id: 'ahu-util', label: 'Uso de la UMA', value: FORMAT.pct(r.hvac.utilisation), unit: '%', kind: 'derived', system: 'hvac',
      severity: r.hvac.saturated ? 'alarm' : r.hvac.utilisation > 0.85 ? 'warning' : 'normal' },
    { id: 'pressure', label: 'Presión de red', value: FORMAT.psi(r.air.pressurePsi), unit: 'psi', kind: 'derived', system: 'air',
      severity: r.air.inBand ? 'normal' : 'warning' },
    { id: 'lux', label: 'Iluminancia', value: FORMAT.lux(r.lighting.lux), unit: 'lux', kind: 'derived', system: 'lighting',
      severity: r.lighting.belowTarget ? 'warning' : 'normal' },
  ];
}

/** Tier-2 per-system panels. Each row states whether it is an input, derived, or an aggregate. */
function tier2(r) {
  return [
    {
      id: 'hvac',
      label: SYSTEM_COLOR.hvac.label,
      color: SYSTEM_COLOR.hvac.dark,
      rows: [
        { label: 'Consumo eléctrico', value: FORMAT.kw(r.hvac.drawKw), unit: 'kW', kind: 'derived' },
        { label: 'Carga a vencer', value: FORMAT.kw(r.thermal.coolingLoadKw), unit: 'kW', kind: 'derived' },
        // Condenser heat rejection = cooling load + compressor work (what the condenser EXISTS to move).
        // Derived from what the model already knows — no new physics.
        { label: 'Calor disipado', value: FORMAT.kw(r.thermal.coolingLoadKw + r.hvac.drawKw), unit: 'kW', kind: 'derived' },
        { label: 'COP', value: FORMAT.ratio(r.hvac.cop), unit: '', kind: 'constant' },
        { label: 'Capacidad instalada', value: FORMAT.kw(r.hvac.capacityKw), unit: 'kW', kind: 'constant' },
        { label: 'Caudal requerido', value: FORMAT.kwCoarse(r.hvac.requiredAirflowM3h), unit: 'm³/h', kind: 'derived' },
      ],
    },
    {
      id: 'lighting',
      label: SYSTEM_COLOR.lighting.label,
      color: SYSTEM_COLOR.lighting.dark,
      rows: [
        { label: 'Potencia instalada', value: FORMAT.kw(r.lighting.powerKw), unit: 'kW', kind: 'derived' },
        // Stated as its own row rather than folded away: Q_light = P_lighting is the coupling,
        // and hiding it behind a footnote is what makes a dashboard look like three dashboards.
        { label: 'Calor aportado', value: FORMAT.kw(r.lighting.heatKw), unit: 'kW', kind: 'derived' },
        { label: 'Iluminancia', value: FORMAT.lux(r.lighting.lux), unit: 'lux', kind: 'derived' },
        { label: 'Objetivo', value: FORMAT.lux(r.lighting.luxTarget), unit: 'lux', kind: 'constant' },
        { label: 'Luminarias', value: String(r.lighting.fixtureCount), unit: '', kind: 'constant' },
      ],
    },
    {
      id: 'air',
      label: SYSTEM_COLOR.air.label,
      color: SYSTEM_COLOR.air.dark,
      rows: [
        { label: 'Presión', value: FORMAT.psi(r.air.pressurePsi), unit: 'psi', kind: 'derived' },
        { label: 'Caudal entregado', value: FORMAT.cfm(r.air.supplyCfm), unit: 'cfm', kind: 'derived' },
        { label: 'Demanda', value: FORMAT.cfm(r.air.demandCfm), unit: 'cfm', kind: 'input' },
        { label: 'Consumo', value: FORMAT.kw(r.air.totalKw), unit: 'kW', kind: 'derived' },
        {
          label: 'Potencia específica',
          value: r.air.specificPower === null ? '—' : FORMAT.kw(r.air.specificPower),
          unit: 'kW/100cfm',
          kind: 'derived',
        },
      ],
    },
  ];
}

/**
 * The flow strip: kW in -> heat -> kW of cooling. Four cells that spell out the equation the
 * whole design is about, using the same numbers the tiles show.
 */
function flowStrip(r) {
  return [
    { id: 'in', label: 'Entra', value: FORMAT.kw(r.lighting.powerKw + r.air.totalKw), unit: 'kW eléctricos' },
    { id: 'heat', label: 'Se vuelve calor en la nave', value: FORMAT.kw(r.thermal.coolingLoadKw), unit: 'kW térmicos' },
    { id: 'cop', label: 'Se extrae con COP', value: FORMAT.ratio(r.hvac.cop), unit: '' },
    { id: 'out', label: 'Cuesta', value: FORMAT.kw(r.hvac.drawKw), unit: 'kW eléctricos' },
  ];
}

/** Trend series for the charts, read straight from the plant history. */
function series(history) {
  const pick = (key) => history.map((h) => ({ t: h.t, v: h[key] }));
  return {
    coolingKw: pick('coolingKw'),
    hvacKw: pick('hvacKw'),
    lightingKw: pick('lightingKw'),
    airKw: pick('airKw'),
    pressurePsi: pick('pressurePsi'),
    plantKw: pick('plantKw'),
  };
}

/**
 * @param {object} readings output of derivePlant()
 * @param {Array} history   plant state history (may be empty on the very first frame)
 */
export function deriveDashboardModel(readings, history = []) {
  const status = STATUS[readings.status];

  return {
    status: { id: readings.status, ...status },
    tiles: tier1(readings),
    panels: tier2(readings),
    stack: {
      totalKw: readings.thermal.coolingLoadKw,
      totalLabel: FORMAT.kw(readings.thermal.coolingLoadKw),
      segments: mergeContributors(readings.thermal.contributors),
    },
    flow: flowStrip(readings),
    // Alarms come through untouched from the ONE derivation in plant.mjs. The dashboard does not
    // re-evaluate a single threshold of its own; it only decides where to draw them.
    alarms: readings.alarms.map((a) => ({ ...a, ...STATUS[a.severity] })),
    series: series(history),
    // What the 3D binds to. Same object, same numbers: a highlighted mesh and its KPI tile
    // cannot disagree because they are reading the same field.
    scene: {
      dimFraction: readings.inputs.dim / 100,
      luminaireIntensity: readings.lighting.outputFraction,
      exhaustFraction: readings.thermal.exhaustFraction,
      compressorStates: readings.air.units.map((u) => ({ id: u.id, state: u.state, kw: u.kw })),
      alarmSystems: [...new Set(readings.alarms.map((a) => a.system))],
      bayOpen: readings.inputs.bayopen === 1,
      // Condenser fan speed: follows HVAC utilisation (0–∞; clamped to 0–1 in main.js)
      hvacUtilisation: readings.hvac.utilisation,
    },
  };
}
