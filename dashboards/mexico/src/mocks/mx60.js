/**
 * Mock data para los endpoints REST del módulo MX60 (chihuahua-ux).
 * Valores 100% simulados — la demo no toca estación Niagara real.
 *
 * Contratos respetados (extraídos del código del UX):
 *   - PlantaLabels.js: 6 plantas, id NUMÉRICO (1..6), 6 = "Oficinas"
 *   - HomeMap.js: lee `cfg.plantas` y `cfg.zones` (polígonos sobre MAQUILA_COMPLETA.jpeg)
 *   - EquipmentData/HomeMap: cada equipo necesita `state` numérico (0=ok, 1=warn, 2=alarm)
 *     como fallback cuando StatusResolver no tiene latch.
 *   - colors: deben coincidir con la paleta industrial del módulo (#00d4aa accent).
 */

function jitter(base, amplitude, seed) {
  var sec = Math.floor(Date.now() / 1000);
  var h = Math.sin((sec + (seed || 0)) * 9301 + base * 7) * 10000;
  var n = h - Math.floor(h);
  return base + (n * 2 - 1) * amplitude;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function statusToState(status) {
  if (status === 'alarm') return 2;
  if (status === 'offline' || status === 'standby') return 1;
  return 0;
}

/* ── PLANTAS (id numérico, 6 = Oficinas) ────────────────────────── */
var PLANTAS = [
  { id: 1, label: 'Planta 1' },
  { id: 2, label: 'Planta 2' },
  { id: 3, label: 'Planta 3' },
  { id: 4, label: 'Planta 4' },
  { id: 5, label: 'Planta 5' },
  { id: 6, label: 'Oficinas' },
];

/* ── ZONES — polígonos sobre MAQUILA_COMPLETA.jpeg (viewBox 0..100) ─
   Coords GROUND-TRUTH provistos por el cliente el 2026-05-19. NO son
   aproximaciones — son los polígonos reales del dashboard en producción.
   Ref engram: sdd/literal-module-replica-mx60-mx0a/input-zones-mx60
   Cada entrada incluye id (number), name (string), color (hex), points. */
var ZONES = {
  '1': {
    id: 1,
    name: 'Planta 1',
    color: '#00d4aa',
    points: [
      [65.1, 49.7], [95.1, 49.0], [87.9, 21.9], [62.9, 21.9],
    ],
  },
  '2': {
    id: 2,
    name: 'Planta 2',
    color: '#3aa6ff',
    points: [
      [31.0, 20.9], [55.3, 21.0], [55.3, 27.6], [29.4, 27.6],
    ],
  },
  '3': {
    id: 3,
    name: 'Planta 3',
    color: '#ffc107',
    points: [
      [63.7, 34.2], [64.9, 49.6], [0.8, 50.7], [7.5, 34.9],
    ],
  },
  '4': {
    id: 4,
    name: 'Planta 4',
    color: '#ff7043',
    points: [
      [51.2, 61.7], [51.2, 63.0], [57.8, 62.7], [57.9, 63.1], [59.2, 63.1],
      [59.4, 65.3], [69.8, 64.9], [70.4, 69.6], [72.9, 69.7], [72.5, 66.1],
      [74.8, 66.0], [76.4, 77.7], [74.2, 78.0], [73.8, 75.5], [71.2, 75.7],
      [72.5, 87.8], [64.2, 88.0], [64.0, 83.6], [50.8, 84.1],
    ],
  },
  '5': {
    id: 5,
    name: 'Planta 5',
    color: '#ab47bc',
    points: [
      [27.5, 62.3], [51.3, 61.9], [50.8, 83.6], [39.1, 84.4], [39.2, 83.3],
      [32.4, 83.7], [32.4, 83.4], [28.9, 83.6], [28.9, 84.4], [15.6, 84.7],
      [15.8, 83.6], [15.0, 83.6], [15.3, 82.2], [16.3, 81.7], [16.5, 80.3],
      [17.4, 80.9], [17.3, 78.4], [18.5, 72.3], [25.6, 72.5],
    ],
  },
  '6': {
    id: 6,
    name: 'Oficinas',
    color: '#26a69a',
    points: [
      [94.2, 45.6], [99.5, 45.7], [90.8, 21.8], [87.8, 22.0],
    ],
  },
};

export function mx60Zones() {
  return Object.keys(ZONES).map(function (k) {
    var z = ZONES[k];
    return { id: z.id, name: z.name, color: z.color, points: z.points };
  });
}

export function mx60Config() {
  return {
    siteName: 'MX60 Chihuahua',
    pollMs: { home: 5000, alarmCounts: 15000, equipment: 5000, restFallbackMs: 5000 },
    bajaDebounceMs: 200,
    alarms: { maxStored: 200, dedupWindowMs: 30000 },
    /* Colors que matchean la paleta industrial del UX (ChartTheme, main.css) */
    colors: {
      accent: '#00d4aa',
      accentAlt: '#3aa6ff',
      warning: '#ffc107',
      danger: '#ff4757',
    },
    navigation: [
      { id: 'home', label: 'HOME' },
      { id: 'alarms', label: 'ALARMS' },
      { id: 'equipment', label: 'EQUIPMENT' },
      { id: 'configuracion', label: 'CONFIGURACIÓN' },
      { id: 'schedules', label: 'SCHEDULES' },
    ],
    api: {
      config: '/mx60/api/config',
      equipment: '/mx60/api/equipment',
      alarms: '/mx60/api/alarms',
      alarmCounts: '/mx60/api/alarms/counts',
      historyList: '/mx60/api/history/list',
      historyData: '/mx60/api/history/data',
      schedules: '/mx60/api/schedules',
      zones: '/mx60/api/zones',
    },
    monitorOrds: {},
    plantas: PLANTAS,
    zones: ZONES,
  };
}

export function mx60Version() {
  return { buildId: 'demo-mock', timestamp: Date.now() };
}

/* ── Equipment builders ─────────────────────────────────────────── */

function up(id, plantaNum, label, status, baseTemp) {
  var seed = id.charCodeAt(id.length - 1);
  var t = jitter(baseTemp, 1.5, seed);
  var abasto = jitter(baseTemp - 5, 1.2, seed + 1);
  var retorno = jitter(baseTemp + 3, 1.0, seed + 2);
  var exterior = jitter(baseTemp + 6, 2.0, seed + 3);
  var sp = 22;
  return {
    id: id,
    label: label,
    type: 'up',
    status: status,
    state: statusToState(status),
    planta: plantaNum,
    summary: {
      /* READINGS (UpDetail.js lines 91-102) — all 12 KPI fields */
      tempZona:        round1(t),
      tempAbasto:      round1(abasto),
      tempRetorno:     round1(retorno),
      tempExterior:    round1(exterior),
      humedadZona:     Math.round(jitter(52, 6, seed + 4)),
      tempSuccion1:    round1(jitter(8, 1.5, seed + 5)),
      tempSuccion2:    round1(jitter(9, 1.5, seed + 6)),
      ampCompresor1:   round1(jitter(14, 3, seed + 7)),
      ampCompresor2:   round1(jitter(13, 3, seed + 8)),
      ampAbanicos1:    round1(jitter(4.5, 1, seed + 9)),
      ampAbanicos2:    round1(jitter(4.2, 1, seed + 10)),
      ampFan:          round1(jitter(3.8, 0.8, seed + 11)),
      /* State/control fields (_cockpitHtml + deriveStateFromEquip) */
      fanOn:           status === 'cooling' || status === 'heating',
      compressor1On:   status === 'cooling',
      compressor2On:   status === 'cooling' && (seed % 2 === 0),
      setpoint:        sp,
      effectiveSetpoint: sp,
      modoOperacion:   status === 'cooling' ? 'SETPOINT' : status === 'heating' ? 'SETPOINT' : status === 'standby' ? 'SCHEDULE' : 'MANUAL',
      /* Protection/switch fields (_cockpitHtml) */
      protectorFase:   status !== 'alarm',
      switchAlta1:     status === 'alarm',
      switchAlta2:     false,
      switchBaja1:     false,
      switchBaja2:     false,
      online:          status !== 'offline',
    },
    alarms: status === 'alarm' ? 1 : 0,
    ord: '/Services/ChihuahuaMX60/' + id,
  };
}

function carcamo(id, label, plantaNum, status, baseNivel) {
  var pct = round1(jitter((baseNivel / 100) * 100, 5));
  return {
    id: id,
    label: label,
    type: 'carcamo',
    status: status,
    state: statusToState(status === 'normal' ? 'cooling' : status),
    planta: plantaNum,
    summary: {
      nivelCm: round1(jitter(baseNivel, 5)),
      nivelPct: pct,
      umbralAdvertencia: 45.0,
      umbralCritico: 69.0,
      bombaOn: id.length % 2 === 0,
      flujoLpm: round1(jitter(120, 25)),
      online: status !== 'offline',
    },
    alarms: status === 'alarm' ? 1 : 0,
    ord: '/Services/ChihuahuaMX60/Carcamos/' + id,
  };
}

function datalogger(id, plantaNum, label, status, basePressure) {
  var psi = round1(jitter(basePressure, 3));
  return {
    id: id,
    label: label,
    type: 'datalogger',
    status: status,
    state: statusToState(status === 'normal' ? 'cooling' : status),
    planta: plantaNum,
    summary: {
      pressurePsi: psi,
      pressureBar: round1(psi * 0.0689476),
      temperatureC: round1(jitter(24, 1.5)),
      battery: Math.floor(jitter(85, 8)),
      lastSeenMs: Date.now() - 30000,
      online: status !== 'offline',
    },
    alarms: status === 'alarm' ? 1 : 0,
    ord: '/Services/ChihuahuaMX60/Dataloggers/' + id,
  };
}

/* ── Inventario canónico copiado del módulo Niagara real ──────────────
   Fuente: BChiUpMonitor.UP_DATA, BChiCarcamoMonitor.CARCAMO_DATA,
           BChiDataloggerMonitor.DT_DATA
   Conteo: 77 UPs + 6 cárcamos + 5 dataloggers = 88 equipos. */

var UP_SEEDS = [
  /* Planta 1 — UP01..UP20 + CARRIER 1..5 (25) */
  { id: 'up01-p1', label: 'UP01', planta: 1 },
  { id: 'up02-p1', label: 'UP02', planta: 1 },
  { id: 'up03-p1', label: 'UP03', planta: 1 },
  { id: 'up04-p1', label: 'UP04', planta: 1 },
  { id: 'up05-p1', label: 'UP05', planta: 1 },
  { id: 'up06-p1', label: 'UP06', planta: 1 },
  { id: 'up07-p1', label: 'UP07', planta: 1 },
  { id: 'up08-p1', label: 'UP08', planta: 1 },
  { id: 'up09-p1', label: 'UP09', planta: 1 },
  { id: 'up10-p1', label: 'UP10', planta: 1 },
  { id: 'up11-p1', label: 'UP11', planta: 1 },
  { id: 'up12-p1', label: 'UP12', planta: 1 },
  { id: 'up13-p1', label: 'UP13', planta: 1 },
  { id: 'up14-p1', label: 'UP14', planta: 1 },
  { id: 'up15-p1', label: 'UP15', planta: 1 },
  { id: 'up16-p1', label: 'UP16', planta: 1 },
  { id: 'up17-p1', label: 'UP17', planta: 1 },
  { id: 'up18-p1', label: 'UP18', planta: 1 },
  { id: 'up19-p1', label: 'UP19', planta: 1 },
  { id: 'up20-p1', label: 'UP20', planta: 1 },
  { id: 'carrier-1', label: 'CARRIER 1', planta: 1 },
  { id: 'carrier-2', label: 'CARRIER 2', planta: 1 },
  { id: 'carrier-3', label: 'CARRIER 3', planta: 1 },
  { id: 'carrier-4', label: 'CARRIER 4', planta: 1 },
  { id: 'carrier-5', label: 'CARRIER 5', planta: 1 },
  /* Planta 2 — UP21, UP01, LABORATORIO, UP30 (4) */
  { id: 'up21-p2', label: 'UP21', planta: 2 },
  { id: 'up01-p2', label: 'UP01', planta: 2 },
  { id: 'laboratorio', label: 'LABORATORIO', planta: 2 },
  { id: 'up30-p2', label: 'UP30', planta: 2 },
  /* Planta 3 — UP11..UP25 (15, sin UP26) + UP27, UP28, UP29 (3) = 18 */
  { id: 'up11-p3', label: 'UP11', planta: 3 },
  { id: 'up12-p3', label: 'UP12', planta: 3 },
  { id: 'up13-p3', label: 'UP13', planta: 3 },
  { id: 'up14-p3', label: 'UP14', planta: 3 },
  { id: 'up15-p3', label: 'UP15', planta: 3 },
  { id: 'up16-p3', label: 'UP16', planta: 3 },
  { id: 'up17-p3', label: 'UP17', planta: 3 },
  { id: 'up18-p3', label: 'UP18', planta: 3 },
  { id: 'up19-p3', label: 'UP19', planta: 3 },
  { id: 'up20-p3', label: 'UP20', planta: 3 },
  { id: 'up21-p3', label: 'UP21', planta: 3 },
  { id: 'up22-p3', label: 'UP22', planta: 3 },
  { id: 'up23-p3', label: 'UP23', planta: 3 },
  { id: 'up24-p3', label: 'UP24', planta: 3 },
  { id: 'up25-p3', label: 'UP25', planta: 3 },
  { id: 'up27-p3', label: 'UP27', planta: 3 },
  { id: 'up28-p3', label: 'UP28', planta: 3 },
  { id: 'up29-p3', label: 'UP29', planta: 3 },
  /* Planta 4 — MAQUINARIA + UP22-UP24 (4) */
  { id: 'maquinaria', label: 'MAQUINARIA', planta: 4 },
  { id: 'up22-p4', label: 'UP22', planta: 4 },
  { id: 'up23-p4', label: 'UP23', planta: 4 },
  { id: 'up24-p4', label: 'UP24', planta: 4 },
  /* Planta 5 — UP01..UP08 + UP25 (9) */
  { id: 'up01-p5', label: 'UP01', planta: 5 },
  { id: 'up02-p5', label: 'UP02', planta: 5 },
  { id: 'up03-p5', label: 'UP03', planta: 5 },
  { id: 'up04-p5', label: 'UP04', planta: 5 },
  { id: 'up05-p5', label: 'UP05', planta: 5 },
  { id: 'up06-p5', label: 'UP06', planta: 5 },
  { id: 'up07-p5', label: 'UP07', planta: 5 },
  { id: 'up08-p5', label: 'UP08', planta: 5 },
  { id: 'up25-p5', label: 'UP25', planta: 5 },
  /* Planta 6 — Oficinas: UD01..UD15 + HIREF + LIEBERT (17) */
  { id: 'ud01-p6', label: 'UD01', planta: 6 },
  { id: 'ud02-p6', label: 'UD02', planta: 6 },
  { id: 'ud03-p6', label: 'UD03', planta: 6 },
  { id: 'ud04-p6', label: 'UD04', planta: 6 },
  { id: 'ud05-p6', label: 'UD05', planta: 6 },
  { id: 'ud06-p6', label: 'UD06', planta: 6 },
  { id: 'ud07-p6', label: 'UD07', planta: 6 },
  { id: 'ud08-p6', label: 'UD08', planta: 6 },
  { id: 'ud09-p6', label: 'UD09', planta: 6 },
  { id: 'ud10-p6', label: 'UD10', planta: 6 },
  { id: 'ud11-p6', label: 'UD11', planta: 6 },
  { id: 'ud12-p6', label: 'UD12', planta: 6 },
  { id: 'ud13-p6', label: 'UD13', planta: 6 },
  { id: 'ud14-p6', label: 'UD14', planta: 6 },
  { id: 'ud15-p6', label: 'UD15', planta: 6 },
  { id: 'hiref-p6', label: 'HIREF', planta: 6 },
  { id: 'liebert-p6', label: 'LIEBERT', planta: 6 },
];

var CARCAMO_SEEDS = [
  /* BChiCarcamoMonitor.CARCAMO_DATA */
  { id: 'c5-p2',  label: 'C5-P2',  planta: 2, baseNivel: 38 },
  { id: 'c6-p2',  label: 'C6-P2',  planta: 2, baseNivel: 42 },
  { id: 'c7-p5',  label: 'C7-P5',  planta: 5, baseNivel: 55 },
  { id: 'c8-p5',  label: 'C8-P5',  planta: 5, baseNivel: 60 },
  { id: 'c9-p4',  label: 'C9-P4',  planta: 4, baseNivel: 48 },
  { id: 'c10-p4', label: 'C10-P4', planta: 4, baseNivel: 72 },
];

var DATALOGGER_SEEDS = [
  /* BChiDataloggerMonitor.DT_DATA */
  { id: 'dt-p1',    label: 'DT-P1',    planta: 1, basePressure: 45 },
  { id: 'dt-p1-hp', label: 'DT-P1-HP', planta: 1, basePressure: 220 },
  { id: 'dt-p2',    label: 'DT-P2',    planta: 2, basePressure: 47 },
  { id: 'dt-p3',    label: 'DT-P3',    planta: 3, basePressure: 44 },
  { id: 'dt-p5',    label: 'DT-P5',    planta: 5, basePressure: 49 },
];

/* Distribución determinística de estados para que la demo se vea variada:
   - ~3-4% alarm, ~3% offline, ~9% standby, ~1 heating, resto cooling. */
function statusForUpIdx(idx, label) {
  if (label === 'LIEBERT' || idx === 23) return 'alarm';
  if (idx === 47) return 'alarm';
  if (idx % 31 === 7) return 'offline';
  if (idx % 11 === 4) return 'standby';
  if (idx === 5) return 'heating';
  return 'cooling';
}

function baseTempForUpIdx(idx, status) {
  if (status === 'offline') return 0;
  if (status === 'alarm') return 27.5;
  if (status === 'heating') return 19.5;
  if (status === 'standby') return 22.0;
  return 22 + ((idx % 7) - 3) * 0.25;
}

export function mx60Equipment() {
  var list = [];
  for (var i = 0; i < UP_SEEDS.length; i++) {
    var s = UP_SEEDS[i];
    var st = statusForUpIdx(i, s.label);
    list.push(up(s.id, s.planta, s.label, st, baseTempForUpIdx(i, st)));
  }
  for (var j = 0; j < CARCAMO_SEEDS.length; j++) {
    var c = CARCAMO_SEEDS[j];
    var cst = c.baseNivel > 68 ? 'alarm' : 'normal';
    list.push(carcamo(c.id, c.label, c.planta, cst, c.baseNivel));
  }
  for (var k = 0; k < DATALOGGER_SEEDS.length; k++) {
    var d = DATALOGGER_SEEDS[k];
    var dst = d.basePressure > 150 ? 'normal' : (k === 2 ? 'alarm' : 'normal');
    list.push(datalogger(d.id, d.planta, d.label, dst, d.basePressure));
  }
  return list;
}

export function mx60AlarmCounts() {
  return { active: 5, unacked: 4, acknowledged: 1, total: 5 };
}

export function mx60Alarms() {
  var now = Date.now();
  return [
    {
      id: 'alm-001',
      ord: '/Services/ChihuahuaMX60/UpMonitor/CARRIER_4/highTemp',
      equipmentId: 'carrier-4',
      equipmentLabel: 'CARRIER 4',
      planta: 1,
      severity: 'critical',
      message: 'Temperatura de zona sobre rango (27.5 °C)',
      timestamp: now - 1000 * 60 * 12,
      acknowledged: false,
    },
    {
      id: 'alm-002',
      ord: '/Services/ChihuahuaMX60/UpMonitor/MAQUINARIA/highTemp',
      equipmentId: 'maquinaria',
      equipmentLabel: 'MAQUINARIA',
      planta: 4,
      severity: 'critical',
      message: 'Temperatura de zona sobre rango (27.5 °C)',
      timestamp: now - 1000 * 60 * 28,
      acknowledged: false,
    },
    {
      id: 'alm-003',
      ord: '/Services/ChihuahuaMX60/UpMonitor/LIEBERT_P6/compressorFault',
      equipmentId: 'liebert-p6',
      equipmentLabel: 'LIEBERT',
      planta: 6,
      severity: 'critical',
      message: 'Falla en compresor 1 — protector de fase activo',
      timestamp: now - 1000 * 60 * 45,
      acknowledged: false,
    },
    {
      id: 'alm-004',
      ord: '/Services/ChihuahuaMX60/CarcamoMonitor/C10_P4/highLevel',
      equipmentId: 'c10-p4',
      equipmentLabel: 'C10-P4',
      planta: 4,
      severity: 'critical',
      message: 'Nivel sobre umbral crítico (72 cm)',
      timestamp: now - 1000 * 60 * 75,
      acknowledged: false,
    },
    {
      id: 'alm-005',
      ord: '/Services/ChihuahuaMX60/DataloggerMonitor/DT_P2/pressureLow',
      equipmentId: 'dt-p2',
      equipmentLabel: 'DT-P2',
      planta: 2,
      severity: 'warning',
      message: 'Presión bajo umbral de advertencia (44 psi)',
      timestamp: now - 1000 * 60 * 220,
      acknowledged: true,
    },
  ];
}

export function mx60Schedules() {
  /* Schedules con shape Niagara — cada unidad paquete (UP) tiene su propio
     schedule, ligado por `equipLabel` (campo que ScheduleView.js lee).
     Plus schedules maestros por planta + modos globales. */
  var PLANTA_LABELS = { 1: 'Planta 1', 2: 'Planta 2', 3: 'Planta 3', 4: 'Planta 4', 5: 'Planta 5', 6: 'Oficinas' };

  function setpointFor(planta) {
    if (planta === 4) return 20.0;
    return 22.0;
  }

  /* outValue rota según estado del UP para que la demo se vea variada */
  function outValueFor(idx, planta) {
    if (planta === 4) return 'OCCUPIED'; /* 24/7 */
    if (idx % 13 === 5) return 'UNOCCUPIED';
    if (idx % 17 === 8) return 'STANDBY';
    return 'OCCUPIED';
  }

  var list = [];

  /* 77 schedules — uno por unidad paquete individual.
     equipLabel = label de la UP (UP01, CARRIER 1, LABORATORIO, etc.)
     ScheduleView.js los muestra con _formatEquipName(equipLabel) + planta. */
  for (var i = 0; i < UP_SEEDS.length; i++) {
    var s = UP_SEEDS[i];
    list.push({
      displayName:    s.label + ' Schedule',
      name:           'sch-' + s.id,
      equipLabel:     s.label,
      planta:         s.planta,
      type:           'baja:BWeeklySchedule',
      outValue:       outValueFor(i, s.planta),
      outStatus:      'ok',
      navOrd:         '/Services/ChihuahuaMX60/UpMonitor/' + s.id,
      parent:         { displayName: PLANTA_LABELS[s.planta] },
    });
  }

  /* 6 schedules — setpoint por planta (numéricos) */
  for (var p = 1; p <= 6; p++) {
    list.push({
      displayName:    'Setpoint ' + PLANTA_LABELS[p],
      name:           'sp-planta-' + p,
      equipLabel:     'Setpoint ' + PLANTA_LABELS[p],
      planta:         p,
      type:           'baja:BNumericSchedule',
      outValue:       setpointFor(p).toFixed(1) + ' °C',
      outStatus:      'ok',
      navOrd:         '/Services/ChihuahuaMX60/Setpoints/p' + p,
      parent:         { displayName: PLANTA_LABELS[p] },
    });
  }

  /* 3 modos globales */
  list.push({ displayName: 'Modo Mantenimiento',       name: 'modo-mantenimiento', equipLabel: 'Mantenimiento Global',  planta: 0, type: 'baja:BBooleanSchedule', outValue: 'false', outStatus: 'ok', navOrd: '', parent: { displayName: 'Global' } });
  list.push({ displayName: 'Calendario Festivos',      name: 'modo-festivos',      equipLabel: 'Festivos México',       planta: 0, type: 'baja:BCalendarSchedule', outValue: 'false', outStatus: 'ok', navOrd: '', parent: { displayName: 'Global' } });
  list.push({ displayName: 'Modo Emergencia (E-Stop)', name: 'modo-emergencia',    equipLabel: 'Paro de Emergencia',    planta: 0, type: 'baja:BTriggerSchedule', outValue: 'inactive', outStatus: 'ok', navOrd: '', parent: { displayName: 'Global' } });

  return list;
}
