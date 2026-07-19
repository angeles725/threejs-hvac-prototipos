/**
 * P2-3 — site-level deterministic sims for the dock sections: exterior weather (CDMX),
 * energy rollups, derived alerts, maintenance windows and 24 h trend series.
 *
 * Design rule (work order): ONE ambient source. The dry cooler's waterOut already derives
 * from SIM_POLICY.ambientC, so the weather model REPORTS that same number as the current
 * exterior temperature instead of inventing a second climate truth. Every other figure here
 * is either a straight read of the equipment model or an auditable sum of its rows.
 */
import {
  EQUIPMENT_INSTANCES,
  SIM_POLICY,
  STATUS_THRESHOLDS,
  createEquipmentModel,
} from './equipment.mjs';
import { deterministicUnit, round } from './seed.mjs';
import { simDayIndex, simHourOfDay, simTimestamp } from './clock.mjs';

const lerp = (t, [lo, hi]) => lo + (hi - lo) * t;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/**
 * Largest-remainder rounding to one decimal so a set of shares sums to EXACTLY 100.0 (the
 * cinemex donut trick, re-authored): floor each to 1 dp, then hand the leftover tenths to the
 * biggest fractional parts. Auditable: the printed shares always total 100.0.
 */
function sharesToPct(values) {
  const total = values.reduce((acc, v) => acc + v, 0) || 1;
  const raw = values.map((v) => (v / total) * 1000);
  const floored = raw.map((v) => Math.floor(v));
  let remainder = 1000 - floored.reduce((acc, v) => acc + v, 0);
  const order = raw
    .map((v, index) => ({ index, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floored.slice();
  for (let i = 0; i < order.length && remainder > 0; i += 1, remainder -= 1) {
    out[order[i].index] += 1;
  }
  return out.map((v) => v / 10);
}

// ---------------------------------------------------------------------------
// Weather — exterior CDMX, anchored on the sim ambient (the dry cooler's sink).
// ---------------------------------------------------------------------------

// Client round 3: the Clima page grew a 7-day strip, so the forecast extends to seven
// seeded day offsets — same deterministic draws, two more day keys, no new weather truth.
const FORECAST_DAYS = Object.freeze(['Hoy', 'Mañana', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7']);
const CONDITIONS = Object.freeze(['Despejado', 'Parcialmente nublado', 'Nublado', 'Lluvia vespertina']);

/** Rain-probability base per condition (%); jittered per day/offset, never a live service. */
const RAIN_BASE = Object.freeze({
  Despejado: 5, 'Parcialmente nublado': 22, Nublado: 48, 'Lluvia vespertina': 80,
});
/** Condition ceiling on the clear-sky UV index (clouds cut the peak). */
const UV_CEILING = Object.freeze({
  Despejado: 1, 'Parcialmente nublado': 0.78, Nublado: 0.5, 'Lluvia vespertina': 0.35,
});
/** WHO UV bands → level + advice line. */
const UV_BANDS = Object.freeze([
  Object.freeze({ max: 2, level: 'Bajo', advice: 'Sin riesgo para la mayoría.' }),
  Object.freeze({ max: 5, level: 'Moderado', advice: 'Busque sombra al mediodía.' }),
  Object.freeze({ max: 7, level: 'Alto', advice: 'Protección solar recomendada.' }),
  Object.freeze({ max: 10, level: 'Muy alto', advice: 'Evite la exposición prolongada.' }),
  Object.freeze({ max: 99, level: 'Extremo', advice: 'Precaución máxima al exterior.' }),
]);

/** Solar window factor: 1 at 13:00, tapering to 0 near 06:00 and 20:00; 0 at night. */
function solarFactor(hour) {
  const f = Math.cos(((hour - 13) / 7) * (Math.PI / 2));
  return f > 0 ? f : 0;
}

/** Magnus dew point (a = 17.62, b = 243.12 °C). */
function dewPointC(tempC, rhPct) {
  const gamma = Math.log(clamp(rhPct, 1, 100) / 100) + (17.62 * tempC) / (243.12 + tempC);
  return round((243.12 * gamma) / (17.62 - gamma));
}

/**
 * Derived weather block (mirror of the cinemex `createWeatherModel().derived`, re-authored for
 * DHL's single fixed ambient). Every figure is a documented function of the ONE exterior source
 * (SIM_POLICY.ambientC), the seeded humidity/wind and the sim clock — no second climate truth.
 *
 * Honesty note: DHL's exterior ambient does NOT vary intra-day (one fixed source that the dry
 * cooler rejects against), so "sensación térmica" is a single derived number with no meaningful
 * half-hour trend — the trend sparkline the cinemex sibling ships is an honest CUT here.
 */
function deriveWeather({ seed, tick, tempC, humidityPct, windKmh, condition, forecast }) {
  const hour = simHourOfDay(tick);
  const uvIndex = Math.round(11 * (UV_CEILING[condition] ?? 0.5) * solarFactor(hour));
  const uvBand = UV_BANDS.find((band) => uvIndex <= band.max);
  const feelsLikeC = round(tempC + 0.04 * (humidityPct - 50) - 0.06 * windKmh);
  const feelsDelta = round(feelsLikeC - tempC);
  const rainNow = Math.round(clamp((RAIN_BASE[condition] ?? 20)
    + lerp(deterministicUnit(seed, 'wx:rain:now'), [-6, 6]), 0, 100));
  const rainDays = forecast.slice(0, 5).map((day, index) => ({
    label: day.dayLabel,
    pct: Math.round(clamp((RAIN_BASE[day.condition] ?? 20)
      + lerp(deterministicUnit(seed, `wx:rain:${index}`), [-8, 8]), 0, 100)),
  }));
  // HVAC-demand relation: hotter/more-humid exterior → the dry cooler works harder. Linear map
  // of the exterior temperature over the cooling band [18 °C = 0 %, 35 °C = 100 %], nudged by RH.
  const relPct = Math.round(clamp(((tempC - 18) / (35 - 18)) * 100 + (humidityPct - 35) * 0.2, 0, 100));
  const relLevel = relPct >= 70 ? 'Alta' : relPct >= 40 ? 'Media' : 'Baja';
  const dewC = dewPointC(tempC, humidityPct);
  const visibilityKm = round(clamp(14 - (humidityPct - 30) * 0.12 - (rainNow / 100) * 4, 4, 16));
  const pressureHpa = Math.round(1018 - (tempC - 20) * 0.4 - (humidityPct - 30) * 0.1);
  return Object.freeze({
    uv: Object.freeze({ index: uvIndex, level: uvBand.level, advice: uvBand.advice }),
    feelsLike: Object.freeze({
      c: feelsLikeC,
      deltaLabel: feelsDelta === 0 ? 'Igual a la real'
        : `${feelsDelta > 0 ? '+' : ''}${feelsDelta.toFixed(1)} °C vs. real`,
    }),
    rain: Object.freeze({ nowPct: rainNow, days: Object.freeze(rainDays.map(Object.freeze)) }),
    hvacRelation: Object.freeze({
      pct: relPct,
      level: relLevel,
      note: 'Derivada de la temperatura y humedad exteriores frente a la banda de enfriamiento simulada.',
    }),
    dew: Object.freeze({ c: dewC, label: dewC >= 16 ? 'Ambiente húmedo' : 'Ambiente seco' }),
    visibility: Object.freeze({ km: visibilityKm, label: visibilityKm >= 10 ? 'Buena' : 'Reducida' }),
    pressure: Object.freeze({ hpa: pressureHpa, label: pressureHpa >= 1013 ? 'Estable' : 'En descenso' }),
  });
}

/** Exterior weather. `current.temperatureC` IS SIM_POLICY.ambientC — the one source. */
export function createSiteWeather({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const humidityPct = Math.round(lerp(deterministicUnit(seed, 'wx:humidity'), [24, 42]));
  const windKmh = Math.round(lerp(deterministicUnit(seed, 'wx:wind'), [6, 16]));
  const condition = CONDITIONS[Math.floor(deterministicUnit(seed, 'wx:cond') * 2)];
  const forecast = FORECAST_DAYS.map((dayLabel, index) => {
    const maxC = round(lerp(deterministicUnit(seed, `wx:max:${index}`), [28.5, 32.5]));
    const minC = round(lerp(deterministicUnit(seed, `wx:min:${index}`), [12.5, 15.5]));
    const conditionIndex = Math.floor(deterministicUnit(seed, `wx:cond:${index}`) * CONDITIONS.length);
    // Client round 5 mirror: each forecast day gains its own seeded humidity/wind (same family).
    const dayHumidity = Math.round(lerp(deterministicUnit(seed, `wx:hum:${index}`), [20, 55]));
    const dayWind = Math.round(lerp(deterministicUnit(seed, `wx:wnd:${index}`), [5, 22]));
    return Object.freeze({
      dayLabel, minC, maxC, condition: CONDITIONS[conditionIndex],
      humidityPct: dayHumidity, windKmh: dayWind,
    });
  });
  return Object.freeze({
    city: 'Ciudad de México',
    tick,
    timestamp: simTimestamp(tick),
    current: Object.freeze({ temperatureC: SIM_POLICY.ambientC, humidityPct, windKmh, condition }),
    forecast: Object.freeze(forecast),
    derived: deriveWeather({
      seed, tick, tempC: SIM_POLICY.ambientC, humidityPct, windKmh, condition, forecast,
    }),
  });
}

// ---------------------------------------------------------------------------
// Energy rollups — sums of the model's own rows, plus straight PDU/UPS reads.
// ---------------------------------------------------------------------------

const sumKw = (rows) => round(rows.reduce((acc, row) => acc + row.kw, 0));

/** PDU/UPS meters + IT and cooling aggregates that equal their own table sums. */
export function createEnergyRollup({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const model = createEquipmentModel({ seed, tick });
  const rowOf = (unit, kw) => Object.freeze({ id: unit.id, label: unit.label, kw, status: unit.status });
  const racks = model.units.filter(({ kind }) => kind === 'rack')
    .map((unit) => rowOf(unit, unit.values.itLoadKw));
  const inrows = model.units.filter(({ kind }) => kind === 'inrow')
    .map((unit) => rowOf(unit, unit.values.loadKw));
  const pdu = model.byId.get('pdu-01');
  const ups = model.byId.get('ups-01');
  const itLoadKw = sumKw(racks);
  const coolingKw = sumKw(inrows);
  // Facility distribution (mirror of the cinemex Energía donut, re-derived): the PDU delivery
  // splits into the instrumented IT rack sum, the in-row sensible cooling sum, and the honest
  // remainder (losses + auxiliaries). Every segment kW is a real sub-read; the shares are
  // largest-remainder corrected so they total exactly 100.0. No per-phase truth is invented.
  const otherKw = round(Math.max(0, pdu.values.loadKw - itLoadKw - coolingKw));
  const segInputs = [
    { key: 'ti', label: 'Carga TI', kw: itLoadKw },
    { key: 'enfriamiento', label: 'Enfriamiento in-row', kw: coolingKw },
    { key: 'otros', label: 'Pérdidas y auxiliares', kw: otherKw },
  ];
  const pcts = sharesToPct(segInputs.map((s) => s.kw));
  const distribution = Object.freeze({
    totalKw: pdu.values.loadKw,
    segments: Object.freeze(segInputs.map((s, index) => Object.freeze({ ...s, pct: pcts[index] }))),
  });
  // Truthful "now", plus seeded day/month comparisons anchored to the modeled instant (the sim
  // owns ONE modeled day/month). Each rendered percentage audits against its own kWh pair.
  const nowKw = pdu.values.loadKw;
  const hoursToday = round(simHourOfDay(tick)) || 12;
  const todayKwh = round(nowKw * hoursToday);
  const dayFactor = lerp(deterministicUnit(seed, 'energy:vsday'), [-0.06, 0.06]);
  const previousDayKwh = round(todayKwh / (1 + dayFactor));
  const vsPreviousDayPct = round(((todayKwh - previousDayKwh) / previousDayKwh) * 100);
  const monthKwh = round(nowKw * 24 * 30);
  const monthFactor = lerp(deterministicUnit(seed, 'energy:vsmonth'), [-0.05, 0.05]);
  const previousMonthKwh = round(monthKwh / (1 + monthFactor));
  const vsPreviousMonthPct = round(((monthKwh - previousMonthKwh) / previousMonthKwh) * 100);
  return Object.freeze({
    tick,
    timestamp: simTimestamp(tick),
    itLoadKw,
    coolingKw,
    nowKw,
    todayKwh,
    previousDayKwh,
    vsPreviousDayPct,
    monthKwh,
    previousMonthKwh,
    vsPreviousMonthPct,
    distribution,
    racks: Object.freeze(racks),
    inrows: Object.freeze(inrows),
    pdu: Object.freeze({
      id: pdu.id,
      label: pdu.label,
      kw: pdu.values.loadKw,
      loadPct: pdu.values.loadPct,
      ratedKva: pdu.values.ratedKva,
      powerFactor: pdu.values.powerFactor,
      status: pdu.status,
    }),
    ups: Object.freeze({
      id: ups.id,
      label: ups.label,
      kw: ups.values.loadKw,
      loadPct: ups.values.loadPct,
      batteryPct: ups.values.batteryPct,
      runtimeMin: ups.values.runtimeMin,
      capacityKw: ups.values.capacityKw,
      status: ups.status,
    }),
  });
}

// ---------------------------------------------------------------------------
// Alerts — a straight derivation of the model statuses (exactly one warn by sim
// construction), each message quoting the gauge reading and its threshold.
// ---------------------------------------------------------------------------

const GAUGE_COPY = Object.freeze({
  rack: Object.freeze({ label: 'Aire de entrada', unit: '°C' }),
  crac: Object.freeze({ label: 'Ventiladores EC', unit: '%' }),
  inrow: Object.freeze({ label: 'Delta T de aire', unit: '°C' }),
  pdu: Object.freeze({ label: 'Carga eléctrica', unit: '%' }),
  ups: Object.freeze({ label: 'Carga eléctrica', unit: '%' }),
  dry: Object.freeze({ label: 'Approach de agua', unit: 'K' }),
});

/**
 * Closed category vocabulary for the Alertas filter chips (client round 3). The category is
 * DERIVED from the gauge family the alert fires on — thermal gauges (inlet air, delta T,
 * water approach) → Térmica, EC fan speed → Ventilación, electrical load → Energía. It is a
 * property of the gauge, never asserted per alert by hand.
 */
export const ALERT_CATEGORIES = Object.freeze(['Térmica', 'Ventilación', 'Energía']);

const GAUGE_CATEGORY = Object.freeze({
  rack: 'Térmica',
  inrow: 'Térmica',
  dry: 'Térmica',
  crac: 'Ventilación',
  pdu: 'Energía',
  ups: 'Energía',
});

/**
 * Resolved-episode day-walk (mirror of the cinemex `deriveResolvedEpisodes`): step the sim day
 * on the equipment model's own tick grid and count units whose status LEFT the alert band and
 * came back to normal — a truthful "resolved today" history, never asserted by hand.
 *
 * Honesty note for DHL: every non-warn unit sits safely below its threshold by margin
 * construction and the one warn unit stays in warn all day, so the walk finds NO band re-entries.
 * The count is an honest 0 — the machinery is real, the data simply has no resolved history.
 */
export function deriveResolvedEpisodes({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const upto = Math.max(0, Math.min(tick, SIM_POLICY.wavePeriodTicks));
  const lastStatus = new Map();
  const episodes = [];
  for (let t = 0; t <= upto; t += 1) {
    for (const unit of createEquipmentModel({ seed, tick: t }).units) {
      const prev = lastStatus.get(unit.id);
      // A resolved episode = a unit that was in an alert band and returned to normal.
      if ((prev === 'warn' || prev === 'alarm') && unit.status === 'normal') {
        episodes.push(Object.freeze({ id: unit.id, label: unit.label, kind: unit.kind, tick: t }));
      }
      lastStatus.set(unit.id, unit.status);
    }
  }
  return Object.freeze(episodes);
}

/** Active alerts derived from unit statuses; severities map warn→advertencia, alarm→alarma. */
export function createSiteAlerts({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const model = createEquipmentModel({ seed, tick });
  const alerts = model.units
    .filter(({ status }) => status !== 'normal')
    .map((unit) => {
      const { gauge, warn } = STATUS_THRESHOLDS[unit.kind];
      const copy = GAUGE_COPY[unit.kind];
      const reading = unit.values[gauge];
      return Object.freeze({
        id: unit.id,
        label: unit.label,
        kind: unit.kind,
        category: GAUGE_CATEGORY[unit.kind],
        severity: unit.status === 'alarm' ? 'alarma' : 'advertencia',
        gauge,
        reading,
        threshold: warn,
        timestamp: simTimestamp(tick),
        message: `${copy.label} en ${reading} ${copy.unit}, sobre el umbral de ${warn} ${copy.unit}`,
      });
    });
  const resolved = deriveResolvedEpisodes({ seed, tick });
  return Object.freeze({
    tick,
    timestamp: simTimestamp(tick),
    total: alerts.length,
    alerts: Object.freeze(alerts),
    resolved,
    resolvedToday: resolved.length,
  });
}

// ---------------------------------------------------------------------------
// Maintenance windows — one deterministic off-hours slot per registered instance.
// ---------------------------------------------------------------------------

export const WEEK_DAYS = Object.freeze(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
const MAINTENANCE_TASK = Object.freeze({
  rack: 'Inspección térmica y de conectores',
  crac: 'Cambio de filtros y revisión de charola',
  inrow: 'Limpieza de serpentín y purga de aire',
  pdu: 'Termografía de interruptores',
  ups: 'Prueba de banco de baterías',
  dry: 'Lavado de serpentín exterior',
});

const twoDigits = (value) => String(value).padStart(2, '0');

/** Per-equipment maintenance windows (Horarios): off-hours 2 h slots, seeded per id. */
export function createMaintenanceModel({ seed = SIM_POLICY.seed } = {}) {
  const windows = EQUIPMENT_INSTANCES.map((instance) => {
    const day = WEEK_DAYS[Math.floor(deterministicUnit(seed, `mnt:day:${instance.id}`) * WEEK_DAYS.length)];
    const startHour = 1 + Math.floor(deterministicUnit(seed, `mnt:hour:${instance.id}`) * 5);
    return Object.freeze({
      id: instance.id,
      label: instance.label,
      kind: instance.kind,
      day,
      window: `${twoDigits(startHour)}:00 a ${twoDigits(startHour + 2)}:00`,
      task: MAINTENANCE_TASK[instance.kind],
    });
  });
  return Object.freeze({ windows: Object.freeze(windows) });
}

/** Epoch weekday: 2026-07-18 is a Saturday → index 5 in WEEK_DAYS (Lunes = 0). */
const EPOCH_WEEKDAY_INDEX = 5;
const twoDigitsClock = (value) => String(value).padStart(2, '0');

/**
 * Maintenance status (mirror of the cinemex `deriveScheduleStatus`, re-authored for DHL's
 * per-equipment windows): the current sim day/time, the NEXT upcoming window with a countdown,
 * and a weekly summary — all read off the declared windows and the sim clock, nothing invented.
 */
export function deriveMaintenanceStatus({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const { windows } = createMaintenanceModel({ seed });
  const hour = simHourOfDay(tick);
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  const dayIndex = (EPOCH_WEEKDAY_INDEX + simDayIndex(tick)) % 7;
  const nowMinuteOfWeek = dayIndex * 1440 + hh * 60 + mm;

  // Each window → its start minute-of-week; the next window is the smallest offset ahead (wrap).
  const withOffset = windows.map((w) => {
    const wDay = WEEK_DAYS.indexOf(w.day);
    const startHour = Number(w.window.slice(0, 2));
    const startMinute = wDay * 1440 + startHour * 60;
    let ahead = startMinute - nowMinuteOfWeek;
    if (ahead <= 0) ahead += 7 * 1440;
    return { window: w, ahead };
  }).sort((a, b) => a.ahead - b.ahead);

  const next = withOffset[0].window;
  const ahead = withOffset[0].ahead;
  const aheadH = Math.floor(ahead / 60);
  const aheadMin = ahead % 60;
  const countdownLabel = aheadH >= 1 ? `En ${aheadH} h ${aheadMin} min` : `En ${aheadMin} min`;

  const byDay = new Map(WEEK_DAYS.map((day) => [day, 0]));
  for (const w of windows) byDay.set(w.day, byDay.get(w.day) + 1);
  const todayLabel = WEEK_DAYS[dayIndex];

  return Object.freeze({
    now: Object.freeze({ dayLabel: todayLabel, time: `${twoDigitsClock(hh)}:${twoDigitsClock(mm)}` }),
    next: Object.freeze({
      label: next.label, kind: next.kind, day: next.day, window: next.window, task: next.task,
    }),
    countdownLabel,
    todayWindows: Object.freeze(windows.filter((w) => w.day === todayLabel)),
    weeklySummary: Object.freeze({
      totalWindows: windows.length,
      windowsToday: windows.filter((w) => w.day === todayLabel).length,
      byDay: Object.freeze(Object.fromEntries(byDay)),
    }),
  });
}

// ---------------------------------------------------------------------------
// Trends — 24 hourly points per unit, resampled from the SAME equipment model.
// One hour = 4 ticks, so the day covers exactly one wavePeriodTicks breath.
// ---------------------------------------------------------------------------

export const TICKS_PER_HOUR = 4;

const TREND_FIELDS = Object.freeze({
  rack: Object.freeze([
    Object.freeze({ field: 'inletTempC', label: 'Temp', unit: '°C' }),
    Object.freeze({ field: 'itLoadKw', label: 'kW', unit: 'kW' }),
  ]),
  crac: Object.freeze([
    Object.freeze({ field: 'supplyTempC', label: 'Impulsión', unit: '°C' }),
    Object.freeze({ field: 'fanPct', label: 'Vent', unit: '%' }),
  ]),
  inrow: Object.freeze([
    Object.freeze({ field: 'deltaTC', label: 'Delta T', unit: '°C' }),
    Object.freeze({ field: 'fanPct', label: 'Vent', unit: '%' }),
  ]),
  pdu: Object.freeze([
    Object.freeze({ field: 'loadKw', label: 'kW', unit: 'kW' }),
    Object.freeze({ field: 'loadPct', label: 'Carga', unit: '%' }),
  ]),
  ups: Object.freeze([
    Object.freeze({ field: 'loadPct', label: 'Carga', unit: '%' }),
    Object.freeze({ field: 'loadKw', label: 'kW', unit: 'kW' }),
  ]),
  dry: Object.freeze([
    Object.freeze({ field: 'waterOutC', label: 'Agua', unit: '°C' }),
    Object.freeze({ field: 'fanPct', label: 'Vent', unit: '%' }),
  ]),
});

/** 24 h of hourly readings for every unit: two headline series per kind. */
export function createTrendSeries({ seed = SIM_POLICY.seed, hours = 24 } = {}) {
  const models = Array.from({ length: hours }, (_, hour) => (
    createEquipmentModel({ seed, tick: hour * TICKS_PER_HOUR })
  ));
  const entries = EQUIPMENT_INSTANCES.map((instance) => {
    const series = TREND_FIELDS[instance.kind].map(({ field, label, unit }) => {
      const points = models.map((model) => model.byId.get(instance.id).values[field]);
      return Object.freeze({ field, label, unit, points: Object.freeze(points), last: points.at(-1) });
    });
    return Object.freeze({
      id: instance.id,
      label: instance.label,
      kind: instance.kind,
      series: Object.freeze(series),
    });
  });
  return Object.freeze({ hours, entries: Object.freeze(entries) });
}
