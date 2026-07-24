import { useEffect, useRef, useState } from 'react';

// Smooth pseudo-random for pleasant visuals
function noise(t, seed) {
  return (Math.sin(t * 0.017 + seed) + Math.sin(t * 0.043 + seed * 1.7) + Math.sin(t * 0.091 + seed * 2.3)) / 3;
}

// Base zone catalog — mixed-use commercial building.
// nominal = potencia de placa, ratedV/ratedI, installed date
const ZONES = [
  { id: 'CHILL', name: 'Planta de Enfriamiento', base: 180, peak: 340, variance: 0.55, tier: 'HVAC',       spikeChance: 0.18, spikeMag: 0.40, cycle: 42,  nominal: 400, ratedV: 220, ratedI: 1050, installed: '2022-03-14', circuit: 'TAB-MT / CCM-01' },
  { id: 'AHU',   name: 'Manejadoras de Aire',    base: 95,  peak: 180, variance: 0.45, tier: 'HVAC',       spikeChance: 0.20, spikeMag: 0.35, cycle: 28,  nominal: 220, ratedV: 220, ratedI: 580,  installed: '2022-03-14', circuit: 'TAB-MT / CCM-01' },
  { id: 'LIGHT', name: 'Iluminación',            base: 70,  peak: 150, variance: 0.28, tier: 'Eléctrico',  spikeChance: 0.10, spikeMag: 0.22, cycle: 90,  nominal: 180, ratedV: 220, ratedI: 470,  installed: '2021-11-02', circuit: 'TAB-A / SUB-ILU' },
  { id: 'KITCH', name: 'Cocina Industrial',      base: 55,  peak: 240, variance: 0.80, tier: 'Cargas',     spikeChance: 0.35, spikeMag: 0.60, cycle: 18,  nominal: 300, ratedV: 220, ratedI: 780,  installed: '2023-05-20', circuit: 'TAB-B / SUB-COC' },
  { id: 'DATA',  name: 'Data Center',            base: 110, peak: 145, variance: 0.10, tier: 'Crítica',    spikeChance: 0.05, spikeMag: 0.10, cycle: 180, nominal: 180, ratedV: 220, ratedI: 470,  installed: '2020-09-07', circuit: 'TAB-CR / UPS-01' },
  { id: 'OFFICE',name: 'Oficinas',               base: 45,  peak: 110, variance: 0.42, tier: 'Cargas',     spikeChance: 0.15, spikeMag: 0.30, cycle: 60,  nominal: 140, ratedV: 220, ratedI: 360,  installed: '2021-08-11', circuit: 'TAB-A / SUB-OFI' },
  { id: 'PARK',  name: 'Estacionamiento',        base: 25,  peak: 70,  variance: 0.32, tier: 'Eléctrico', spikeChance: 0.10, spikeMag: 0.18, cycle: 120, nominal: 85,  ratedV: 220, ratedI: 220,  installed: '2021-11-02', circuit: 'TAB-A / SUB-ILU' },
  { id: 'EV',    name: 'Carga Vehículos EV',     base: 30,  peak: 220, variance: 0.90, tier: 'Cargas',     spikeChance: 0.45, spikeMag: 0.75, cycle: 22,  nominal: 250, ratedV: 220, ratedI: 650,  installed: '2024-02-18', circuit: 'TAB-B / SUB-EV'  },
];

// Hour-of-day demand curve (0-23) — commercial building pattern
const HOUR_CURVE = [
  0.35, 0.30, 0.28, 0.27, 0.28, 0.32,
  0.45, 0.62, 0.78, 0.88, 0.94, 0.98,
  1.00, 0.97, 0.95, 0.92, 0.88, 0.82,
  0.70, 0.58, 0.48, 0.42, 0.38, 0.36,
];

export function curveAt(hourFloat) {
  const h = ((hourFloat % 24) + 24) % 24;
  const i0 = Math.floor(h);
  const i1 = (i0 + 1) % 24;
  const frac = h - i0;
  return HOUR_CURVE[i0] * (1 - frac) + HOUR_CURVE[i1] * frac;
}

export function sharedNoise(t, seed) { return noise(t, seed); }

// Tariff bands (MXN/kWh) per hour — CFE GDMTH simplified
export function tariffAt(hourFloat) {
  const h = ((hourFloat % 24) + 24) % 24;
  if (h >= 18 && h < 22) return { rate: 3.85, band: 'Punta', color: '#ef4444' };
  if ((h >= 6 && h < 18) || (h >= 22 && h < 24)) return { rate: 2.10, band: 'Intermedia', color: '#eab308' };
  return { rate: 1.12, band: 'Base', color: '#10B981' };
}

const CO2_FACTOR = 0.427; // kg CO2 per kWh (Mexico grid)

function buildAlert(id, severity, zone, message) {
  return { id, severity, zone, message, time: new Date() };
}

// ── Análisis de armónicos / analizador tipo Schneider ION ──
// Firma armónica (orden -> % del fundamental) a carga nominal. Impares dominan,
// el 5° y 7° son los típicos de cargas no lineales (VFDs, UPS, iluminación LED).
const V_HARMONIC_SIG = { 2: 0.3, 3: 1.6, 5: 2.9, 7: 1.5, 9: 0.6, 11: 1.1, 13: 0.7, 15: 0.25, 17: 0.55, 19: 0.38, 21: 0.18, 23: 0.32, 25: 0.22, 29: 0.18, 31: 0.14 };
const I_HARMONIC_SIG = { 2: 0.6, 3: 5.4, 5: 8.6, 7: 4.2, 9: 2.1, 11: 3.1, 13: 1.8, 15: 0.9, 17: 1.35, 19: 0.85, 21: 0.5, 23: 0.72, 25: 0.5, 27: 0.3, 29: 0.42, 31: 0.3, 35: 0.2, 37: 0.18 };
const MAX_HARMONIC = 50;

// Corriente nominal del sistema (suma de TC de las acometidas) — base para TDD.
const I_RATED = 2600; // A
// Factor de potencia de desplazamiento típico por zona (firma del tipo de carga).
const ZONE_PF = { CHILL: 0.86, AHU: 0.88, LIGHT: 0.97, KITCH: 0.91, DATA: 0.95, OFFICE: 0.96, PARK: 0.95, EV: 0.985 };
// Patrón de demanda por día de semana (Lun..Dom) para un edificio comercial.
const WEEK_CURVE = [1.0, 1.0, 0.99, 1.02, 0.96, 0.58, 0.44];
const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Construye el espectro de un canal (V o I de una fase): orden 2..MAX en % del fundamental.
function buildSpectrum(sig, loadFactor, seed, t) {
  const bars = [];
  for (let n = 2; n <= MAX_HARMONIC; n++) {
    let base = sig[n];
    if (base == null) base = (n % 2 === 1) ? 0.9 / n : 0.12 / n; // cola decreciente
    const wob = 1 + 0.20 * noise(t * 0.5 + n, seed + n * 1.3);
    bars.push({ order: n, mag: Math.max(0, base * loadFactor * wob) });
  }
  return bars;
}

// THD a partir del espectro (las magnitudes ya están en % del fundamental).
function thdFromSpectrum(bars) {
  return Math.sqrt(bars.reduce((s, b) => s + b.mag * b.mag, 0));
}

// K-factor (derrateo térmico de transformadores): K = Σ(I_h² · h²) / Σ(I_h²).
function kFactor(bars) {
  let num = 1, den = 1; // fundamental: I_1(pu)=1, h=1
  bars.forEach(b => {
    const ipu = b.mag / 100;
    num += ipu * ipu * b.order * b.order;
    den += ipu * ipu;
  });
  return num / den;
}

// Factor de cresta: senoide pura = 1.414; sube con la distorsión (corriente "picuda").
function crestFactor(thdPct) {
  return 1.414 * (1 + Math.min(0.6, (thdPct / 100) * 1.4));
}

export function useEnergySimulation(tickMs = 15000) {
  const startRef = useRef(Date.now());

  // Per-zone state: current spike decay, phase offsets.
  const zoneStateRef = useRef(
    ZONES.map((z, i) => ({
      spike: 0,            // current transient (0..1), decays each tick
      spikeDir: 1,         // +1 up / -1 down
      phase: i * 0.37,     // phase offset for sine cycle
      lastKw: z.base,      // last computed kW for smoothing
    }))
  );

  // Live demand history (rolling window, one point per tick) — prefilled con valores plausibles
  const HISTORY_LEN = 30;
  const historyRef = useRef(
    Array.from({ length: HISTORY_LEN }, (_, i) => {
      const tAgo = (HISTORY_LEN - i) * 15_000;
      const when = new Date(Date.now() - tAgo);
      const h = when.getHours() + when.getMinutes() / 60;
      const demand = curveAt(h) * 900 + noise(i * 3.1, 5) * 60;
      return { t: when.getTime(), demand };
    })
  );

  // Rolling power factor history (30 points)
  const pfHistoryRef = useRef(
    Array.from({ length: 30 }, (_, i) => 0.94 + noise(i * 1.7, 41) * 0.025)
  );

  // Rolling 3-phase V / I history (60 points = 15 min at 15s)
  const phaseHistoryRef = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      vL1: 220 + noise(i * 0.3, 11) * 2.2,
      vL2: 220 + noise(i * 0.3, 17) * 2.4,
      vL3: 220 + noise(i * 0.3, 23) * 2.6,
      iL1: 380 + noise(i * 0.4, 31) * 40,
      iL2: 375 + noise(i * 0.4, 37) * 42,
      iL3: 372 + noise(i * 0.4, 43) * 45,
    }))
  );

  // Quality events (rolling buffer of last 12 synthetic events)
  const qualityEventsRef = useRef(
    Array.from({ length: 8 }, (_, i) => {
      const kinds = ['SAG', 'SWELL', 'INTERRUPTION', 'THD_HIGH', 'UNBALANCE'];
      const kind = kinds[Math.abs(Math.floor(noise(i, 7) * 5))] || 'SAG';
      return {
        id: 'qe' + i,
        kind,
        phase: ['L1', 'L2', 'L3'][i % 3],
        magnitude: (0.88 + noise(i, 3) * 0.22),
        duration: Math.round(20 + Math.abs(noise(i, 5)) * 180),
        at: new Date(Date.now() - (i + 1) * 11 * 60_000 - Math.floor(Math.random() * 60000)),
      };
    }).sort((a, b) => b.at - a.at)
  );

  // Per-zone runtime (horas desde "00:00 del día")
  const zoneRuntimeRef = useRef(ZONES.map(() => 0));
  // Per-zone state ('run' | 'standby' | 'fault')
  const zoneStateByIdRef = useRef(ZONES.reduce((acc, z) => {
    acc[z.id] = { state: 'run', since: new Date(Date.now() - 1000 * 60 * 60 * (2 + Math.random() * 10)) };
    return acc;
  }, {}));

  // 24-hour daily buffer — past hours pre-filled, current hour accumulates
  const dailyRef = useRef(
    Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      kwh: 0,
      cost: 0,
    }))
  );

  // 30-day month — past days pre-filled with plausible values
  const monthRef = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      kwh: 14500 + noise(i, 7) * 2200 + (i % 7 < 5 ? 1500 : -1200),
    }))
  );

  const lastTickRef = useRef(Date.now());
  const [now, setNow] = useState(new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setNow(new Date());
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const nowDate = now;
  const currentHour = nowDate.getHours();
  const hour = currentHour + nowDate.getMinutes() / 60 + nowDate.getSeconds() / 3600;
  const curve = curveAt(hour);
  const tElapsed = (Date.now() - startRef.current) / 1000;

  // ── Advance zone states ──
  const zones = ZONES.map((z, i) => {
    const st = zoneStateRef.current[i];

    // Slow cycle (equipment cycling on/off)
    const cycle = Math.sin((tElapsed / z.cycle) * Math.PI * 2 + st.phase);

    // Fast wobble (instantaneous fluctuation)
    const fast = noise(tElapsed * 0.8, i * 3.1) * 0.6 + noise(tElapsed * 2.3, i * 1.7) * 0.4;

    // Transient spike — randomly triggered
    if (st.spike <= 0 && Math.random() < z.spikeChance) {
      st.spike = z.spikeMag;
      st.spikeDir = Math.random() > 0.3 ? 1 : -1; // mostly up (load on)
    }
    // Decay the spike — fade en ~2 ticks a 15s
    const spikeContribution = st.spike * st.spikeDir;
    st.spike *= 0.45;
    if (st.spike < 0.01) st.spike = 0;

    // Combine influences
    const breath = (cycle * 0.55 + fast * 0.45) * z.variance;
    const factor = curve * (1 + breath) + spikeContribution;

    // Target kW
    const target = Math.max(z.base * 0.25, Math.min(z.peak * 1.15, z.base + (z.peak - z.base) * factor));

    // Smooth toward target — a 15s por tick, 0.55 hace cambios visibles pero no bruscos
    const smooth = st.lastKw + (target - st.lastKw) * 0.55;
    st.lastKw = smooth;

    const ratio = (smooth - z.base * 0.25) / (z.peak * 1.15 - z.base * 0.25);
    return {
      ...z,
      kw: smooth,
      ratio: Math.max(0, Math.min(1, ratio)),
      spiking: st.spike > 0.08,
    };
  });

  const totalKW = zones.reduce((s, z) => s + z.kw, 0);

  // ── Regenerate daily buckets each tick (visible wobble across the bars) ──
  const minFrac = (nowDate.getMinutes() + nowDate.getSeconds() / 60) / 60;
  dailyRef.current = Array.from({ length: 24 }, (_, h) => {
    const baseH = curveAt(h + 0.5) * 820;
    const rate = tariffAt(h + 0.5).rate;
    if (h < currentHour) {
      // Past hours: plausible value + tick-based wobble (±6%) para que el sparkline se mueva
      const wobble = 1 + noise(h * 7 + tElapsed * 0.35, 17) * 0.06;
      const kwh = baseH * wobble;
      return { hour: h, kwh, cost: kwh * rate };
    }
    if (h === currentHour) {
      // Partial hour: grows with clock + live demand variability
      const liveWobble = 1 + noise(tElapsed * 0.4, 29) * 0.10;
      const kwh = baseH * Math.max(0.02, minFrac) * liveWobble;
      return { hour: h, kwh, cost: kwh * rate };
    }
    return { hour: h, kwh: 0, cost: 0 };
  });
  lastTickRef.current = Date.now();

  const totalKWH_today = dailyRef.current.reduce((s, d) => s + d.kwh, 0);
  const costToday = dailyRef.current.reduce((s, d) => s + d.cost, 0);
  const tariff = tariffAt(hour);
  const co2Today = totalKWH_today * CO2_FACTOR;

  // ── Power quality (kinda realistic) ──
  // Bigger swings so user sees them move
  const powerFactor = 0.92 + noise(tElapsed * 0.9, 13) * 0.045 + (zones.find(z => z.spiking) ? -0.015 : 0);
  const voltage = 220 + noise(tElapsed * 0.6, 17) * 4.2;
  const frequency = 60 + noise(tElapsed * 1.2, 19) * 0.12;

  // ── Rolling histories — one point per tick ──
  historyRef.current = [
    ...historyRef.current.slice(1),
    { t: Date.now(), demand: totalKW },
  ];
  pfHistoryRef.current = [...pfHistoryRef.current.slice(1), powerFactor];

  // 3-phase voltages / currents (a partir del total y noise por fase)
  const iTotal = totalKW * 1000 / (voltage * Math.sqrt(3) * powerFactor); // A
  const phaseBalance = 1 + noise(tElapsed * 0.4, 47) * 0.02;
  const phase = {
    vL1: voltage + noise(tElapsed * 0.6, 11) * 1.5,
    vL2: voltage + noise(tElapsed * 0.6, 17) * 1.8 - 0.4,
    vL3: voltage + noise(tElapsed * 0.6, 23) * 1.7 + 0.3,
    iL1: iTotal * phaseBalance + noise(tElapsed * 0.7, 31) * 8,
    iL2: iTotal * (2 - phaseBalance) * 0.99 + noise(tElapsed * 0.7, 37) * 10,
    iL3: iTotal * 1.0 + noise(tElapsed * 0.7, 43) * 9,
  };
  phaseHistoryRef.current = [...phaseHistoryRef.current.slice(1), phase];

  // Voltage unbalance %
  const vAvg = (phase.vL1 + phase.vL2 + phase.vL3) / 3;
  const vMaxDev = Math.max(Math.abs(phase.vL1 - vAvg), Math.abs(phase.vL2 - vAvg), Math.abs(phase.vL3 - vAvg));
  const unbalance = (vMaxDev / vAvg) * 100;

  // THD (distorsión harmónica total) — sintético con componente por carga
  const loadBias = Math.min(0.08, zones.reduce((s, z) => s + z.kw, 0) / 30_000);
  const thdV = 2.2 + loadBias * 100 + noise(tElapsed * 0.4, 51) * 0.8;
  const thdI = 4.5 + loadBias * 140 + noise(tElapsed * 0.5, 53) * 1.4;

  // Nuevos eventos de calidad aleatorios (baja prob por tick)
  if (Math.random() < 0.08) {
    const kinds = [
      { kind: 'SAG', mag: 0.82 + Math.random() * 0.08 },
      { kind: 'SWELL', mag: 1.08 + Math.random() * 0.10 },
      { kind: 'THD_HIGH', mag: 5.5 + Math.random() * 2 },
      { kind: 'UNBALANCE', mag: 1.8 + Math.random() * 1.5 },
    ];
    const pick = kinds[Math.floor(Math.random() * kinds.length)];
    qualityEventsRef.current = [
      { id: 'qe-' + Date.now(), kind: pick.kind, phase: ['L1','L2','L3'][Math.floor(Math.random()*3)], magnitude: pick.mag, duration: Math.round(20 + Math.random() * 200), at: new Date() },
      ...qualityEventsRef.current.slice(0, 19),
    ];
  }

  // Runtime accum (horas del día) — cada zona suma (15s/3600) si está 'run'
  zones.forEach((z, i) => {
    const st = zoneStateByIdRef.current[z.id];
    if (z.spiking && Math.random() < 0.02) {
      // raro: entrar en fault breve
      if (st.state === 'run') { st.state = 'fault'; st.since = new Date(); }
    } else if (st.state === 'fault' && Math.random() < 0.25) {
      st.state = 'run'; st.since = new Date();
    }
    if (z.kw < z.base * 0.35 && Math.random() < 0.01) {
      st.state = 'standby'; st.since = new Date();
    } else if (st.state === 'standby' && z.kw > z.base * 0.5) {
      st.state = 'run'; st.since = new Date();
    }
    if (st.state === 'run') zoneRuntimeRef.current[i] += 15 / 3600;
  });

  // Ranking
  const topConsumers = [...zones].sort((a, b) => b.kw - a.kw);

  // ── Alerts ──
  const alerts = [];
  zones.forEach((z, i) => {
    if (z.ratio > 0.88) alerts.push(buildAlert('z' + i, 'high', z.name, 'Demanda por encima del 88% del pico (' + z.kw.toFixed(0) + ' kW)'));
    if (z.spiking && z.ratio > 0.7) alerts.push(buildAlert('sp' + i, 'warn', z.name, 'Transitorio detectado · arranque de carga'));
  });
  if (tariff.band === 'Punta') alerts.push(buildAlert('tarifa', 'warn', 'Facturación', 'Tarifa en horario PUNTA — optimizar cargas no críticas'));
  if (powerFactor < 0.93) alerts.push(buildAlert('pf', 'warn', 'Calidad de energía', 'Factor de potencia bajo: ' + powerFactor.toFixed(3)));
  if (voltage > 223 || voltage < 217) alerts.push(buildAlert('vd', 'info', 'Red eléctrica', 'Tensión fuera de banda nominal: ' + voltage.toFixed(1) + ' V'));
  alerts.push(buildAlert('co2', 'info', 'Sostenibilidad', 'Emisiones hoy: ' + co2Today.toFixed(0) + ' kg CO₂e'));

  // Budget
  const monthlyBudget = 420000; // MXN
  const monthSoFar = monthRef.current.reduce((s, d) => s + d.kwh, 0) * 2.35 + costToday;
  const dayTarget = monthlyBudget / 30;
  const dayProgress = costToday / dayTarget;

  const baselineToday = totalKWH_today * 1.18;
  const savedKwh = baselineToday - totalKWH_today;
  const savedPct = baselineToday > 0 ? (savedKwh / baselineToday) * 100 : 0;

  // Solar (sinusoidal sun + cloud wobble)
  const solarHour = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const cloud = 0.8 + noise(tElapsed * 0.3, 23) * 0.25;
  const solarKW = solarHour * 240 * cloud;
  const solarKWHToday = 240 * 8 * 0.62 * Math.min(1, Math.max(0, (hour - 6) / 12));

  // Solar por hora del día — se mueve con nubes cambiantes por tick
  const solarDaily = Array.from({ length: 24 }, (_, h) => {
    const sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    if (sun === 0) return 0;
    const hCloud = 0.75 + noise(h * 5 + tElapsed * 0.25, 53 + h) * 0.30;
    return sun * 240 * hCloud;
  });

  const waterFlow = 42 + noise(tElapsed * 0.4, 29) * 12;
  const gasFlow = 18 + noise(tElapsed * 0.5, 31) * 6;

  // ── Analizador ION: espectro armónico por fase (V e I) + parámetros derivados ──
  const loadFactorI = 0.55 + 0.6 * Math.min(1, totalKW / 1200);
  const loadFactorV = 0.60 + 0.35 * Math.min(1, totalKW / 1200);
  const PHASE_SEED = { L1: 11, L2: 17, L3: 23 };
  const PHASE_FACTOR = { L1: 1.0, L2: 0.94, L3: 1.08 };
  const PHASE_LABELS = ['L1', 'L2', 'L3'];

  const harmonics = { V: {}, I: {} };
  const perPhase = {};
  PHASE_LABELS.forEach(p => {
    const vBars = buildSpectrum(V_HARMONIC_SIG, loadFactorV * PHASE_FACTOR[p], PHASE_SEED[p], tElapsed);
    const iBars = buildSpectrum(I_HARMONIC_SIG, loadFactorI * PHASE_FACTOR[p], PHASE_SEED[p] + 5, tElapsed);
    harmonics.V[p] = vBars;
    harmonics.I[p] = iBars;
    const thdVp = thdFromSpectrum(vBars);
    const thdIp = thdFromSpectrum(iBars);
    const iPhase = p === 'L1' ? phase.iL1 : p === 'L2' ? phase.iL2 : phase.iL3;
    perPhase[p] = {
      thdV: thdVp,
      thdI: thdIp,
      tdd: thdIp * Math.min(1, iPhase / I_RATED),
      kFactor: kFactor(iBars),
      crestI: crestFactor(thdIp),
      crestV: crestFactor(thdVp),
      current: iPhase,
    };
  });

  // FP de desplazamiento (cos φ del fundamental) vs FP verdadero (incluye distorsión).
  const dpf = 0.94 + noise(tElapsed * 0.7, 61) * 0.04;
  const thdIavg = (perPhase.L1.thdI + perPhase.L2.thdI + perPhase.L3.thdI) / 3;
  const thdVavg = (perPhase.L1.thdV + perPhase.L2.thdV + perPhase.L3.thdV) / 3;
  const truePF = dpf / Math.sqrt(1 + (thdIavg / 100) ** 2);
  const phi = (Math.acos(Math.min(1, dpf)) * 180) / Math.PI; // grados

  // Fasores: V balanceado a 120°, I desplazada por φ (con leve desbalance por fase).
  const phasors = PHASE_LABELS.map((p, i) => {
    const vAngle = -120 * i + noise(tElapsed * 0.4, 70 + i) * 1.5;
    const iAngle = vAngle - (phi + noise(tElapsed * 0.5, 80 + i) * 2.5);
    const vMag = p === 'L1' ? phase.vL1 : p === 'L2' ? phase.vL2 : phase.vL3;
    return { phase: p, vAngle, iAngle, vMag, iMag: perPhase[p].current };
  });

  const analyzer = {
    harmonics,
    perPhase,
    dpf,
    truePF,
    thdVavg,
    thdIavg,
    kFactorAvg: (perPhase.L1.kFactor + perPhase.L2.kFactor + perPhase.L3.kFactor) / 3,
    tddAvg: (perPhase.L1.tdd + perPhase.L2.tdd + perPhase.L3.tdd) / 3,
    crestIavg: (perPhase.L1.crestI + perPhase.L2.crestI + perPhase.L3.crestI) / 3,
    phasors,
    phi,
    iRated: I_RATED,
  };

  // ── Tendencias por carga monitoreada (día / semana / mes) ──
  const loadTrends = {};
  ZONES.forEach((z, i) => {
    const liveZone = zones[i];
    const midKw = (z.base + z.peak) / 2;
    const seed = i * 9.7;
    const critical = z.tier === 'Crítica';

    const daily = Array.from({ length: 24 }, (_, h) => {
      const shape = curveAt(h + 0.5);
      const flat = critical ? 0.65 : 0; // cargas críticas operan casi planas
      const prof = shape * (1 - flat) + flat;
      const rate = tariffAt(h + 0.5).rate;
      let kwh = midKw * prof * (1 + noise(h * 3 + tElapsed * 0.3, seed) * 0.08);
      if (h > currentHour) kwh = 0;
      else if (h === currentHour) kwh = liveZone.kw * Math.max(0.04, minFrac);
      return { label: String(h).padStart(2, '0'), kwh, cost: kwh * rate };
    });

    const weekly = WEEK_CURVE.map((wc, d) => {
      const f = critical ? 0.95 : wc;
      const kwh = midKw * 14 * f * (1 + noise(d * 5, seed + 2) * 0.06);
      return { label: WEEK_LABELS[d], kwh, cost: kwh * 2.35 };
    });

    const monthly = Array.from({ length: 30 }, (_, d) => {
      const f = critical ? 0.95 : WEEK_CURVE[d % 7];
      const kwh = midKw * 14 * f * (1 + noise(d * 2.3, seed + 4) * 0.10);
      return { label: 'D' + (d + 1), kwh, cost: kwh * 2.35 };
    });

    loadTrends[z.id] = {
      daily,
      weekly,
      monthly,
      pf: (ZONE_PF[z.id] || 0.95) + noise(tElapsed * 0.6, seed) * 0.015,
      tariffNow: tariff.rate,
    };
  });

  return {
    now: nowDate,
    tick,
    zones,
    totalKW,
    totalKWHToday: totalKWH_today,
    costToday,
    monthSoFar,
    monthlyBudget,
    dayProgress,
    co2Today,
    tariff,
    powerFactor,
    voltage,
    frequency,
    history: historyRef.current,
    pfHistory: pfHistoryRef.current,
    phaseHistory: phaseHistoryRef.current,
    phase,
    unbalance,
    thdV,
    thdI,
    qualityEvents: qualityEventsRef.current,
    zoneStates: zoneStateByIdRef.current,
    zoneRuntime: zoneRuntimeRef.current,
    solarDaily,
    daily: dailyRef.current,
    month: monthRef.current,
    topConsumers,
    alerts,
    savedKwh,
    savedPct,
    solarKW,
    solarKWHToday,
    waterFlow,
    gasFlow,
    analyzer,
    loadTrends,
  };
}

export function buildTariffBands() {
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, ...tariffAt(h + 0.5) }));
}
