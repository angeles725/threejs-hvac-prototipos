/**
 * Deterministic CDMX weather for the menu's Clima section. Menu data only.
 *
 * Same clock as the simulation: the base date is the sim's own epoch (2026-01-01 12:00 UTC) and
 * `tick` advances it in animation.stepSeconds steps — never Date.now(), so a pinned tick renders
 * a byte-stable card. Values are seeded plausibilities, not a forecast feed, and the section
 * labels them as simulated.
 */
import { APP_CONFIG } from '../config.mjs';
import { deterministicUnit, round } from './seed.mjs';

export const WEATHER_CONDITIONS = Object.freeze([
  'Despejado',
  'Parcialmente nublado',
  'Nublado',
  'Lluvia ligera',
]);

/** Simulation epoch (mirrors simulation.mjs BASE_TIMESTAMP_MS): 2026-01-01 is a Thursday. */
const BASE_DAY_INDEX = 4;
const DAY_LABELS = Object.freeze(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
const SECONDS_PER_DAY = 86_400;

function conditionFor(seed, key) {
  return WEATHER_CONDITIONS[Math.floor(deterministicUnit(seed, key) * WEATHER_CONDITIONS.length)];
}

// ---------------------------------------------------------------------------
// Client round 5 (2026-07-18) — derived weather fields. Every formula is documented and every
// input is the same seeded sim above, so the derivations stay deterministic per tick.
// ---------------------------------------------------------------------------

/** Per-condition ceilings for the derived fields (closed condition vocabulary). */
const UV_MAX_BY_CONDITION = Object.freeze({
  Despejado: 11, 'Parcialmente nublado': 8, Nublado: 5, 'Lluvia ligera': 3,
});
const RAIN_BASE_BY_CONDITION = Object.freeze({
  Despejado: 5, 'Parcialmente nublado': 20, Nublado: 45, 'Lluvia ligera': 75,
});
const VISIBILITY_BASE_BY_CONDITION = Object.freeze({
  Despejado: 16, 'Parcialmente nublado': 12, Nublado: 9, 'Lluvia ligera': 6,
});

/** The closed-form readings at an arbitrary tick (shared by the live card and the trend). */
const temperatureAt = (tick) => round(19.5 + 5.5 * Math.sin(tick * 0.01 + 1.3));
const humidityAt = (seed, tick, days) => Math.round(
  52 + 16 * Math.sin(deterministicUnit(seed, `hum:${days}`) * Math.PI * 2 + tick * 0.005),
);
const windAt = (seed, days) => Math.round(6 + deterministicUnit(seed, `wind:${days}`) * 12);

/** Feels-like: dry-bulb nudged by humidity above/below 50% and cooled by wind (documented). */
function feelsLikeAt(seed, tick) {
  const days = Math.floor((tick * APP_CONFIG.animation.stepSeconds) / SECONDS_PER_DAY);
  return round(temperatureAt(tick) + (humidityAt(seed, tick, days) - 50) * 0.04 - windAt(seed, days) * 0.06);
}

/** UV level per the WHO index bands. */
function uvLevel(index) {
  if (index >= 11) return 'Extremo';
  if (index >= 8) return 'Muy alto';
  if (index >= 6) return 'Alto';
  if (index >= 3) return 'Moderado';
  return 'Bajo';
}

function deriveWeatherFields({ seed, tick, elapsedDays, current }) {
  // --- UV: condition ceiling × a solar-day window peaking at 13:00 (zero outside ~06:30–19:30).
  const hourOfDay = (12 + (tick * APP_CONFIG.animation.stepSeconds) / 3600) % 24;
  const solar = Math.max(0, Math.cos(((hourOfDay - 13) / 6.5) * (Math.PI / 2)));
  const uvIndex = Math.round(UV_MAX_BY_CONDITION[current.condition] * solar);
  const uv = Object.freeze({ index: uvIndex, level: uvLevel(uvIndex) });

  // --- Feels-like + an 8-point half-hour trend ending on the live value (pre-epoch samples
  // follow the same presentation-history convention the 24 h series already use).
  const series = Object.freeze(Array.from({ length: 8 }, (_, index) => (
    feelsLikeAt(seed, tick - (7 - index) * 360)
  )));
  const feels = series.at(-1);
  const drift = feels - series[0];
  const feelsLike = Object.freeze({
    c: feels,
    deltaLabel: feels > current.temperature + 0.2
      ? 'Lig. mayor que la temperatura'
      : feels < current.temperature - 0.2
        ? 'Lig. menor que la temperatura'
        : 'Similar a la temperatura',
    series,
    trendLabel: Math.abs(drift) < 0.6
      ? 'Tendencia estable'
      : drift > 0 ? 'Tendencia al alza' : 'Tendencia a la baja',
  });

  // --- Rain probability now / +6 h / +12 h / +18 h / +24 h: condition base + seeded jitter.
  const rain = Object.freeze([0, 6, 12, 18, 24].map((hours) => {
    const day = Math.floor((tick * APP_CONFIG.animation.stepSeconds + hours * 3600) / SECONDS_PER_DAY);
    const condition = conditionFor(seed, `weather:day:${day}`);
    const jitter = Math.round((deterministicUnit(seed, `rain:${day}:${hours}`) - 0.5) * 16);
    return Object.freeze({
      label: hours === 0 ? 'Ahora' : `+${hours} h`,
      pct: Math.min(95, Math.max(2, RAIN_BASE_BY_CONDITION[condition] + jitter)),
    });
  }));

  // --- HVAC-demand relation: outdoor temperature and humidity pushed against the cooling
  // band the HVAC sim operates in (documented linear map, clamped to 0–100).
  const relationPct = Math.min(98, Math.max(5, Math.round(
    ((current.temperature - 14) / 14) * 80 + (current.humidityPct - 40) * 0.25,
  )));
  const hvacRelation = Object.freeze({
    pct: relationPct,
    level: relationPct >= 65 ? 'Alta' : relationPct >= 40 ? 'Media' : 'Baja',
  });

  // --- Dew point (Magnus, a=17.62 b=243.12 °C), visibility and sea-level pressure.
  const gamma = Math.log(current.humidityPct / 100)
    + (17.62 * current.temperature) / (243.12 + current.temperature);
  const dewPointC = round((243.12 * gamma) / (17.62 - gamma));
  const visibilityKm = VISIBILITY_BASE_BY_CONDITION[current.condition]
    + Math.round((deterministicUnit(seed, `vis:${elapsedDays}`) - 0.5) * 4);
  const pressureHpa = 1013 + Math.round((deterministicUnit(seed, `press:${elapsedDays}`) - 0.5) * 24);

  return Object.freeze({
    uv,
    feelsLike,
    rain,
    hvacRelation,
    dewPointC,
    dewLabel: dewPointC < 10 ? 'Seco' : dewPointC <= 15 ? 'Moderado' : 'Alto',
    visibilityKm,
    visibilityLabel: visibilityKm >= 10 ? 'Buena' : visibilityKm >= 5 ? 'Regular' : 'Baja',
    pressureHpa,
    pressureLabel: Math.abs(pressureHpa - 1013) <= 6
      ? 'Estable'
      : pressureHpa > 1013 ? 'En ascenso' : 'En descenso',
  });
}

export function createWeatherModel({ tick = 0 } = {}) {
  const seed = APP_CONFIG.animation.seed;
  const elapsedDays = Math.floor((tick * APP_CONFIG.animation.stepSeconds) / SECONDS_PER_DAY);
  const todayIndex = (BASE_DAY_INDEX + elapsedDays) % 7;

  const current = Object.freeze({
    temperature: temperatureAt(tick),
    condition: conditionFor(seed, `weather:day:${elapsedDays}`),
    humidityPct: humidityAt(seed, tick, elapsedDays),
    windKmh: windAt(seed, elapsedDays),
  });

  // Client round 3 (2026-07-18, BMS reference): the strip grew 5 → 7 days. Same seeded per-day
  // derivation, two more day offsets — no new data source. Round 5: each day also carries its
  // seeded humidity/wind (the same per-day seeded family the live card reads, tick-less).
  const forecast = Object.freeze(Array.from({ length: 7 }, (_, offset) => {
    const day = elapsedDays + offset + 1;
    const spread = deterministicUnit(seed, `spread:${day}`);
    const minC = Math.round(11 + deterministicUnit(seed, `min:${day}`) * 4);
    const maxC = Math.round(22 + spread * 5);
    return Object.freeze({
      dayLabel: DAY_LABELS[(BASE_DAY_INDEX + day) % 7],
      minC,
      maxC,
      condition: conditionFor(seed, `weather:day:${day}`),
      humidityPct: Math.round(52 + 16 * Math.sin(deterministicUnit(seed, `hum:${day}`) * Math.PI * 2)),
      windKmh: windAt(seed, day),
    });
  }));

  return Object.freeze({
    city: 'Ciudad de México',
    tick,
    current,
    forecast,
    // Client round 5: documented derived fields for the Clima cards (see deriveWeatherFields).
    derived: deriveWeatherFields({ seed, tick, elapsedDays, current }),
  });
}
