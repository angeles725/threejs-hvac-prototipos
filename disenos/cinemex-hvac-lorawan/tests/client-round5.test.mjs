/**
 * Client round 5 (2026-07-18) — the five remaining section mockups over the deterministic sims.
 * Written FIRST (strict TDD). Contracts:
 *  - New lighting sim (`src/sim/lighting.mjs`): seeded per-area luminaire counts, the daily
 *    scene program with sim-clock statuses, and lighting consumption/savings tied to the
 *    ENERGY_POLICY lighting baseline.
 *  - Weather sim grows documented derived fields: UV, feels-like (+trend series), rain
 *    probability, HVAC-demand relation, dew point, visibility, pressure.
 *  - Schedules sim grows `deriveScheduleStatus`: active period, next-change countdown,
 *    today's transitions and the weekly summary — all off the sim clock.
 *  - Sections: Ventiladores/Cuarto adopt the round-4 toolbar+table anatomy with pure row
 *    derivations + CSV serializers; Iluminación gains selectable (light-only, section-state)
 *    scenes; Clima gains the hero + derived cards + 5-day carousel; Horarios gains the
 *    countdown banner, weekly summary and truthful lineamientos.
 * Every visible number derives from the sims — mockup values are illustrative only.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TC300_DEVICES, UC100_DEVICES, ZONES } from '../src/config.mjs';
import { ENERGY_POLICY } from '../src/sim/energy.mjs';
import {
  createLightingModel,
  LIGHT_SCENE_PROGRAM,
  LIGHTING_AREAS,
} from '../src/sim/lighting.mjs';
import { createWeatherModel, WEATHER_CONDITIONS } from '../src/sim/weather.mjs';
import { deriveScheduleStatus, SETPOINT_CALENDAR, WEEKLY_SCHEDULE } from '../src/sim/schedules.mjs';
import {
  deriveBusUnits,
  deriveFleetRows,
  deriveVentRows,
  deriveZoneGroups,
  fleetRowsToCsv,
  renderSectionHtml,
  ventRowsToCsv,
} from '../src/dock/sections.mjs';

// ---------------------------------------------------------------------------
// Lighting sim: luminaires, scene program, consumption
// ---------------------------------------------------------------------------

test('lighting model: seeded per-area luminaire counts are deterministic and consistent', () => {
  const model = createLightingModel({ tick: 0 });
  assert.deepEqual(model, createLightingModel({ tick: 0 }), 'same tick, same model');
  assert.equal(model.areas.length, LIGHTING_AREAS.length);
  let total = 0;
  let operative = 0;
  for (const area of model.areas) {
    assert.ok(area.total > 0, `${area.id} must own luminaires`);
    assert.ok(area.operative >= 0 && area.operative <= area.total, `${area.id} operative in bounds`);
    assert.equal(area.pct, Number(((area.operative / area.total) * 100).toFixed(1)),
      `${area.id} pct audits against its own counts`);
    total += area.total;
    operative += area.operative;
  }
  assert.equal(model.fleet.total, total, 'fleet total audits against the areas');
  assert.equal(model.fleet.operative, operative, 'fleet operative audits against the areas');
  assert.equal(model.fleet.pct, Number(((operative / total) * 100).toFixed(1)));
});

test('lighting scene program derives statuses from the sim clock', () => {
  assert.deepEqual(
    LIGHT_SCENE_PROGRAM.map(({ sceneId }) => sceneId),
    ['apertura', 'funcion', 'exteriores', 'cierre'],
  );
  // Tick 0 = sim noon: Apertura (10:00) done, Función (12:00) active, the rest scheduled.
  const noon = createLightingModel({ tick: 0 });
  assert.deepEqual(
    noon.program.map(({ status }) => status),
    ['completada', 'activa', 'programada', 'programada'],
  );
  assert.equal(noon.activeSceneId, 'funcion');
  assert.equal(noon.manual, false);
  assert.equal(noon.activeSince, '12:00');
  // 19:30 sim (7.5 h later = 5400 ticks): Exteriores is the active scene.
  const evening = createLightingModel({ tick: 5400 });
  assert.equal(evening.activeSceneId, 'exteriores');
  assert.deepEqual(
    evening.program.map(({ status }) => status),
    ['completada', 'completada', 'activa', 'programada'],
  );
  // A manual selection overrides the schedule-active scene and says so.
  const manual = createLightingModel({ tick: 0, sceneId: 'cierre' });
  assert.equal(manual.activeSceneId, 'cierre');
  assert.equal(manual.manual, true);
  // An unknown selection falls back to the schedule.
  assert.equal(createLightingModel({ tick: 0, sceneId: 'nope' }).activeSceneId, 'funcion');
});

test('lighting consumption and savings tie to the ENERGY_POLICY lighting baseline', () => {
  const model = createLightingModel({ tick: 0 });
  // Sim noon = 12 h of the always-on lighting baseline so far today.
  assert.equal(model.consumption.todayKwh, Math.round(ENERGY_POLICY.lightingKw * 12));
  assert.ok(model.consumption.yesterdayKwh > 0);
  assert.equal(
    model.consumption.vsYesterdayPct,
    Number((((model.consumption.todayKwh - model.consumption.yesterdayKwh)
      / model.consumption.yesterdayKwh) * 100).toFixed(1)),
    'the day comparison audits against its own kWh pair',
  );
  assert.equal(model.savings.monthKwh, Math.round(ENERGY_POLICY.lightingKw * 24 * ENERGY_POLICY.daysPerMonth));
  assert.ok(model.savings.previousMonthKwh > model.savings.monthKwh, 'the seeded saving is a saving');
  assert.equal(model.savings.equivalentKwh, model.savings.previousMonthKwh - model.savings.monthKwh);
  assert.equal(
    model.savings.pct,
    Number((((model.savings.previousMonthKwh - model.savings.monthKwh)
      / model.savings.previousMonthKwh) * 100).toFixed(1)),
    'the savings percentage audits against its own kWh pair',
  );
});

// ---------------------------------------------------------------------------
// Weather sim: derived fields
// ---------------------------------------------------------------------------

test('weather derived fields are deterministic and stay in their documented bounds', () => {
  const model = createWeatherModel({ tick: 0 });
  assert.deepEqual(model.derived, createWeatherModel({ tick: 0 }).derived);
  const { uv, feelsLike, rain, hvacRelation, dewPointC, visibilityKm, pressureHpa } = model.derived;
  assert.ok(Number.isInteger(uv.index) && uv.index >= 0 && uv.index <= 11);
  assert.ok(['Bajo', 'Moderado', 'Alto', 'Muy alto', 'Extremo'].includes(uv.level));
  assert.ok(Math.abs(feelsLike.c - model.current.temperature) <= 4, 'feels-like stays near the reading');
  assert.equal(feelsLike.series.length, 8, 'the trend strip carries 8 half-hour samples');
  assert.equal(feelsLike.series.at(-1), feelsLike.c, 'the trend ends on the live value');
  assert.ok(/^Tendencia /.test(feelsLike.trendLabel));
  assert.deepEqual(rain.map(({ label }) => label), ['Ahora', '+6 h', '+12 h', '+18 h', '+24 h']);
  for (const slot of rain) {
    assert.ok(Number.isInteger(slot.pct) && slot.pct >= 0 && slot.pct <= 100);
  }
  assert.ok(hvacRelation.pct >= 0 && hvacRelation.pct <= 100);
  const expectedLevel = hvacRelation.pct >= 65 ? 'Alta' : hvacRelation.pct >= 40 ? 'Media' : 'Baja';
  assert.equal(hvacRelation.level, expectedLevel, 'the level audits against its own percentage');
  assert.ok(dewPointC < model.current.temperature, 'dew point sits under the dry-bulb reading');
  assert.ok(dewPointC > -10 && dewPointC < 25);
  assert.ok(visibilityKm >= 2 && visibilityKm <= 20);
  assert.ok(pressureHpa >= 995 && pressureHpa <= 1035);
  assert.ok(['Seco', 'Moderado', 'Alto'].includes(model.derived.dewLabel));
  assert.ok(['Buena', 'Regular', 'Baja'].includes(model.derived.visibilityLabel));
  assert.ok(['Estable', 'En ascenso', 'En descenso'].includes(model.derived.pressureLabel));
});

test('weather dew point audits against the Magnus formula and UV dies at night', () => {
  const model = createWeatherModel({ tick: 0 });
  const T = model.current.temperature;
  const RH = model.current.humidityPct;
  const gamma = Math.log(RH / 100) + (17.62 * T) / (243.12 + T);
  const magnus = (243.12 * gamma) / (17.62 - gamma);
  assert.ok(Math.abs(model.derived.dewPointC - magnus) < 0.11, 'dew point is the Magnus derivation');
  // 12 h after sim noon = sim midnight: no UV.
  const night = createWeatherModel({ tick: 8640 });
  assert.equal(night.derived.uv.index, 0);
  assert.equal(night.derived.uv.level, 'Bajo');
});

// ---------------------------------------------------------------------------
// Schedules sim: active period, countdown, weekly summary
// ---------------------------------------------------------------------------

test('schedule status derives the active period and the next-change countdown', () => {
  const status = deriveScheduleStatus({ tick: 0 });
  assert.deepEqual(status, deriveScheduleStatus({ tick: 0 }), 'same tick, same status');
  // Sim noon: Matiné just began; the next boundary is Función estelar at 17:00.
  assert.equal(status.activePeriod.period, 'Matiné');
  assert.equal(status.nextChange.period, 'Función estelar');
  assert.equal(status.nextChange.time, '17:00');
  assert.equal(status.nextChange.minutesUntil, 300);
  assert.equal(status.nextChange.countdownLabel, 'En 5 h 0 min');
  assert.deepEqual(
    status.periods.map(({ status: periodStatus }) => periodStatus),
    ['completada', 'activa', 'programada', 'programada'],
  );
  assert.deepEqual(
    status.transitionsToday.map(({ period }) => period),
    ['Apertura', 'Matiné'],
  );
  // 16:20 sim (5200 ticks × 5 s = 4:20 h): countdown reads minutes-only under the hour.
  const later = deriveScheduleStatus({ tick: 3120 });
  assert.equal(later.nextChange.countdownLabel, 'En 40 min');
});

test('schedule weekly summary audits against the declared week', () => {
  const { weekly, dayLabel } = deriveScheduleStatus({ tick: 0 });
  assert.equal(weekly.openings, WEEKLY_SCHEDULE.length);
  assert.equal(weekly.closings, WEEKLY_SCHEDULE.length);
  // (4×13 h + 14 + 14.5 + 13) / 7 — closings past midnight counted across it.
  assert.equal(weekly.avgDailyHours, 13.4);
  const meanSalas = SETPOINT_CALENDAR.reduce((sum, { salasC }) => sum + salasC, 0) / SETPOINT_CALENDAR.length;
  assert.equal(weekly.avgSalasC, Number(meanSalas.toFixed(1)));
  assert.equal(dayLabel, 'Jueves', 'the sim epoch 2026-01-01 is a Thursday');
});

// ---------------------------------------------------------------------------
// Ventiladores: zone groups, bus distribution, rows + CSV
// ---------------------------------------------------------------------------

test('zone groups map the 14 real zones into the four documented groups', () => {
  const groups = deriveZoneGroups();
  assert.deepEqual(
    groups.map(({ label }) => label),
    ['Áreas públicas', 'Salas', 'Operaciones', 'Servicios'],
  );
  assert.deepEqual(groups.map(({ count }) => count), [4, 8, 1, 1]);
  assert.equal(groups.reduce((sum, { count }) => sum + count, 0), TC300_DEVICES.length);
  // The mapping is derived from the zone registry, never hand-tallied.
  const publicos = groups[0];
  const expected = ZONES.filter(({ kind }) => kind === 'public' || kind === 'circulation').map(({ id }) => id);
  assert.deepEqual([...publicos.zoneIds], expected);
});

test('bus distribution audits against the real UC100 topology', () => {
  const buses = deriveBusUnits();
  assert.deepEqual(buses.map(({ bus }) => bus), ['A', 'B', 'C', 'D']);
  for (const entry of buses) {
    const device = UC100_DEVICES.find(({ id }) => id === entry.uc100Id);
    assert.equal(entry.count, device.memberIds.length, `${entry.uc100Id} count is its real drop count`);
  }
  assert.equal(buses.reduce((sum, { count }) => sum + count, 0), TC300_DEVICES.length);
});

test('ventiladores rows derive, search, sort and page deterministically', () => {
  const base = deriveVentRows({ tick: 0 });
  assert.equal(base.rows.length, TC300_DEVICES.length);
  assert.equal(base.total, TC300_DEVICES.length);
  assert.ok(base.rows.every(({ fan }) => fan === 'Automático'), 'the truthful constant state');
  assert.deepEqual(
    base.rows.map(({ unitId }) => unitId),
    [...base.rows.map(({ unitId }) => unitId)].sort(),
    'default sort is unidad ascending',
  );
  const searched = deriveVentRows({ tick: 0, view: { ventQuery: 'sala' } });
  assert.equal(searched.rows.length, 8, 'the eight salas match');
  const busA = deriveVentRows({ tick: 0, view: { ventBus: 'A' } });
  assert.equal(busA.rows.length, 5, 'bus A carries five drops');
  const zoneSorted = deriveVentRows({ tick: 0, view: { ventSort: 'zona', ventDir: 'desc' } });
  const zones = zoneSorted.rows.map(({ zoneLabel }) => zoneLabel);
  assert.deepEqual(zones, [...zones].sort((a, b) => b.localeCompare(a)));
  const paged = deriveVentRows({ tick: 0, view: { ventPageSize: 10, ventPage: 2 } });
  assert.equal(paged.rows.length, 4, 'page 2 of 10-per-page holds the tail');
  assert.equal(paged.from, 11);
  assert.equal(paged.to, 14);
  const csv = ventRowsToCsv(base.rows);
  assert.match(csv, /^Unidad,Termostato,Zona,Ventilador,Fuente\n/);
  assert.equal(csv.split('\n').length, 15, 'header + 14 rows');
  assert.match(csv, /TC300 · bus A/);
});

// ---------------------------------------------------------------------------
// Cuarto: fleet rows + CSV
// ---------------------------------------------------------------------------

test('fleet rows trace cabinet + drop facts and serialize to CSV', () => {
  const base = deriveFleetRows({ tick: 0 });
  assert.equal(base.rows.length, TC300_DEVICES.length);
  const first = base.rows.find(({ unitId }) => unitId === 'RTU-01');
  assert.equal(first.cabinetLabel, 'Rack telecom (frente)');
  assert.equal(first.uc100Id, 'UC100-A');
  assert.ok(first.fanHours > first.compressorHours, 'the supply fan always outruns the compressor');
  assert.ok(base.rows.every(({ setpoint }) => setpoint >= 18 && setpoint <= 26));
  const searched = deriveFleetRows({ tick: 0, view: { cuartoQuery: 'cocina' } });
  assert.equal(searched.rows.length, 1);
  assert.equal(searched.rows[0].uc100Id, 'UC100-D');
  const busB = deriveFleetRows({ tick: 0, view: { cuartoBus: 'B' } });
  assert.equal(busB.rows.length, 4);
  const csv = fleetRowsToCsv(base.rows);
  assert.match(csv, /^Unidad,Termostato,Zona,Horas compresor,Horas ventilador,Consigna \(°C\),Gabinete,Caída\n/);
  assert.equal(csv.split('\n').length, 15);
});

// ---------------------------------------------------------------------------
// Section contracts — Ventiladores
// ---------------------------------------------------------------------------

test('ventiladores renders the mockup anatomy: KPI strip, toolbar table, aside', () => {
  const html = renderSectionHtml('ventiladores', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the read-only note + flat
  // table became icon-tile KPI cards, the round-4 toolbar table and the estado aside. The
  // honest copy survives; every control below is functional.
  assert.match(html, /Estado del inventario/);
  assert.match(html, /solo lectura/i, 'the honest read-only copy survives the redesign');
  assert.match(html, /Total ventiladores/i);
  assert.match(html, /Conectividad/i);
  assert.match(html, /14 <small>\/ 14<\/small>|14 \/ 14/, 'connectivity audits 14 / 14');
  assert.match(html, /100(\.0)?% del total/, 'the automatic share derives live');
  assert.match(html, /data-vent-search/, 'live search');
  assert.match(html, /data-vent-sort="unidad"/, 'sortable unidad header');
  assert.match(html, /data-vent-sort="zona"/, 'sortable zona header');
  assert.match(html, /data-export-csv/, 'functional CSV export');
  assert.match(html, /Mostrando 1 a 14 de 14 ventiladores/);
  assert.match(html, /data-vent-page-size/, 'functional rows-per-page select');
  assert.match(html, /Operación normal/, 'the green banner states the truthful all-automatic state');
  assert.match(html, /Fuentes de conexión/i);
  assert.match(html, /Bus A · 5 unidades/, 'the donut legend audits the real topology');
  assert.match(html, /Distribución por zona/i);
  assert.match(html, /Áreas públicas/);
  assert.match(html, /TC300 · bus A/);
  assert.match(html, /class="donut"/, 'the bus donut reuses the round-4 donut');
  assert.doesNotMatch(html, /Red completa|[Pp]lanta térmica|Fachada/, 'no view labels');
  // The kebab exists because it has real actions; opening one shows them.
  const open = renderSectionHtml('ventiladores', { tick: 0, view: { ventMenu: 'RTU-01' } });
  assert.match(open, /Ver unidad/);
  assert.match(open, /data-copy-detail/);
});

// ---------------------------------------------------------------------------
// Section contracts — Cuarto de máquinas
// ---------------------------------------------------------------------------

test('cuarto renders the mockup anatomy: intro cards, KPIs, flota table, rack aside', () => {
  const html = renderSectionHtml('cuarto', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the rtu-card grid became
  // the FLOTA RTU toolbar table; the intro gained the isometric illustration and the "Ver en
  // la sala" card returns as REAL navigation (no camera view named).
  assert.doesNotMatch(html, /class="rtu-card"/, 'the card grid died with the mockup');
  assert.match(html, /<table/, 'the flota table is back, per the mockup');
  assert.match(html, /Ver en la sala/);
  assert.match(html, /data-go-section="tablero"/, 'the promo button truly navigates');
  assert.match(html, /RTU activas/i);
  assert.match(html, /14 <small>\/ 14<\/small>/, 'the fleet KPI audits 14 / 14');
  assert.match(html, /Prom\. horas compresor/i);
  assert.match(html, /Nodos UC100/i);
  assert.match(html, /Alertas/i);
  assert.match(html, /data-cuarto-search/, 'live search over the fleet');
  assert.match(html, /Horas compresor/);
  assert.match(html, /Horas ventilador/);
  assert.match(html, /Rack telecom \(frente\) · RS-485 · UC100-A/, 'the traced cabinet · drop cell');
  // Mockup number format: "22.0°" (the spec's format mandate wins over unit suffixes).
  assert.match(html, /2[0-9]\.\d°/, 'the consigna column renders live');
  assert.match(html, /Estado del sistema/);
  // The rack aside's health is the COMMUNICATION domain (its own scope). At tick 0 the sim has
  // zero Comunicación alerts, so the truthful state is Óptimo — asserted via the sim itself.
  assert.match(html, /Óptimo/, 'the truthful comm-domain health state at tick 0');
  assert.match(html, /UC100-A/);
  assert.match(html, /UC100-D/);
  assert.match(html, /RS-485 activos/);
  assert.match(html, /Controles conectados/);
  assert.match(html, /Última sincronización/);
  assert.match(html, /aria-hidden="true"/, 'the isometric illustration is decorative');
  assert.match(html, /Filas por página/);
  assert.doesNotMatch(html, /data-room-view|Red completa|[Pp]lanta térmica/, 'no view labels');
});

// ---------------------------------------------------------------------------
// Section contracts — Iluminación
// ---------------------------------------------------------------------------

test('iluminación scenes are selectable section state — honest, light-only, no camera', () => {
  const html = renderSectionHtml('iluminacion', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the read-only scene list
  // became SELECTABLE cards. The truthful runtime lighting hook died with the single-view
  // round (scenes only ever moved the camera), so selection drives the SECTION's active-scene
  // state only — and the copy says so instead of promising 3D changes.
  assert.equal((html.match(/data-light-scene="/g) ?? []).length, 4, 'four selectable scenes');
  assert.match(html, /data-light-scene="funcion"[^>]*aria-pressed="true"/,
    'the schedule-active scene is selected by default at sim noon');
  assert.match(html, /permanece[^<]*encendido/i, 'the always-on truth survives');
  assert.doesNotMatch(html, /cambia la (vista|cámara)|mueve la cámara/i);
  assert.match(html, /Escena activa/i);
  assert.match(html, /Luminarias operativas/i);
  assert.match(html, /\d+ <small>\/ \d+<\/small>/, 'the operative KPI is the N / M pair');
  assert.match(html, /Consumo de iluminación/i);
  assert.match(html, /Ahorro estimado/i);
  assert.match(html, /Equivale a \d/, 'the savings chip audits its own kWh');
  assert.match(html, /Programación del día/i);
  assert.match(html, /Completada/);
  assert.match(html, /Programada/);
  assert.match(html, /data-go-section="horarios"/, 'the timeline footer truly navigates');
  assert.match(html, /Estado por área/i);
  assert.match(html, /Vestíbulo/);
  assert.match(html, /Exteriores y fachada/);
  assert.match(html, /Óptimo \(≥ 95%\)/, 'the legend states its own thresholds');
  assert.match(html, /Automatización y escenas/i);
  assert.doesNotMatch(html, /Configurar escenas/, 'no CTA promises config UI we do not have');
  assert.match(html, /red LoRaWAN/, 'the footer keeps the data-source line');
  // Selecting a scene re-renders with that card pressed and the manual chip.
  const manual = renderSectionHtml('iluminacion', { tick: 0, view: { lightScene: 'cierre' } });
  assert.match(manual, /data-light-scene="cierre"[^>]*aria-pressed="true"/);
  assert.match(manual, /Selección manual/);
});

// ---------------------------------------------------------------------------
// Section contracts — Clima
// ---------------------------------------------------------------------------

test('clima renders the hero, derived cards, 5-day carousel and honest source', () => {
  const html = renderSectionHtml('clima', { tick: 0 });
  // CONTRACT CHANGE (client round 5, 2026-07-18, approved mockup): the 7-chip strip became a
  // 5-per-page carousel with functional dots; the section gains the derived weather cards.
  assert.match(html, /Ahora · Ciudad de México/i);
  assert.match(html, /class="clima-temp num"/, 'the huge temperature survives');
  assert.match(html, /Humedad/);
  assert.match(html, /Viento/);
  assert.match(html, /Próximos 5 días/i);
  assert.equal((html.match(/class="dia"/g) ?? []).length, 5, 'five day cards per page');
  assert.equal((html.match(/data-clima-page="/g) ?? []).length, 2, 'two functional carousel dots');
  const page2 = renderSectionHtml('clima', { tick: 0, view: { climaPage: 1 } });
  assert.equal((page2.match(/class="dia"/g) ?? []).length, 2, 'the second page holds the tail days');
  assert.match(html, /Índice UV/i);
  assert.match(html, /Sensación térmica/i);
  assert.match(html, /Probabilidad de lluvia/i);
  assert.match(html, /Relación con demanda HVAC/i);
  assert.match(html, /Resumen de condiciones/i);
  assert.match(html, /Punto de rocío/i);
  assert.match(html, /Visibilidad/i);
  assert.match(html, /Presión atmosférica/i);
  assert.match(html, /hPa/);
  assert.match(html, /Serie simulada/, 'the source card says simulation, not a weather service');
  assert.doesNotMatch(html, /[Ss]ervicio meteorológico [Cc]onectado/, 'no fake service chip');
  assert.match(html, /misma marca de tiempo/, 'the honest timebase copy survives');
  assert.doesNotMatch(html, /Red completa|[Pp]lanta térmica|Fachada del complejo/, 'no view labels');
});

// ---------------------------------------------------------------------------
// Section contracts — Horarios
// ---------------------------------------------------------------------------

test('horarios renders the week, the countdown, the summary and truthful lineamientos', () => {
  const html = renderSectionHtml('horarios', { tick: 0 });
  assert.match(html, /Semana operativa/i);
  assert.equal((html.match(/class="week-day"/g) ?? []).length, 7, 'seven day cards survive');
  assert.match(html, /Calendario de consignas/i);
  assert.match(html, /Próximo cambio/);
  assert.match(html, /Función estelar/);
  assert.match(html, /En 5 h 0 min/, 'the countdown derives from the sim clock at tick 0');
  assert.match(html, /Resumen semanal|Total de aperturas/i);
  assert.match(html, /13\.4/, 'average daily hours audit against the declared week');
  assert.match(html, /22\.8/, 'average salas setpoint audits against the calendar');
  assert.match(html, /Nota/);
  assert.match(html, /18–26 °C/, 'the TC300 limits fact survives');
  assert.match(html, /cocina/i, 'the kitchen service-setpoint fact survives');
  assert.match(html, /Lineamientos/);
  assert.equal((html.match(/class="lineamiento"/g) ?? []).length, 3, 'three truthful checklist rows');
  assert.doesNotMatch(html, /ajustarse manualmente|se restablecen al siguiente periodo/,
    'no claims about manual overrides the product does not have');
  assert.match(html, /data-horarios-history/, 'the history toggle is real');
  assert.match(html, /UTC-06:00/, 'the timezone footer');
  // The history toggle renders today's real transitions from the sim clock.
  const withHistory = renderSectionHtml('horarios', { tick: 0, view: { horariosHistory: true } });
  assert.match(withHistory, /Apertura[\s\S]*10:00/);
  assert.match(withHistory, /Matiné[\s\S]*12:00/);
});

// ---------------------------------------------------------------------------
// Shell wiring
// ---------------------------------------------------------------------------

test('main.js wires the round-5 delegated view-state controls', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /data-vent-sort|ventSort/, 'ventiladores sort rides the view-state pattern');
  assert.match(main, /ventQuery/, 'ventiladores search rides the delegated input listener');
  assert.match(main, /cuartoQuery/, 'flota search rides the delegated input listener');
  assert.match(main, /data-light-scene/, 'scene selection is a delegated view-state control');
  assert.match(main, /lightScene/, 'the scene lands in the section view state');
  assert.match(main, /climaPage/, 'the forecast carousel rides the view state');
  assert.match(main, /horariosHistory/, 'the history toggle rides the view state');
  // The CSV export serves the section the operator is looking at.
  assert.match(main, /ventRowsToCsv/, 'ventiladores export uses its own serializer');
  assert.match(main, /fleetRowsToCsv/, 'flota export uses its own serializer');
  // The single-view rule stays binding: no control names or moves a camera.
  assert.doesNotMatch(main, /data-room-view|roomView|camera-select|cameraSelect/);
});
