// Compressed-air model — PURE. Lead/lag sequencing on a pressure band, and the kW curves.
//
// PRESSURE MODEL — derived from the ideal gas law at constant temperature and constant vessel
// volume, NOT from P1 §5d's simplified coefficient, which is wrong by a factor of ~67:
//
//   free air added over dt = net_cfm x 28.317 L/ft3 x (dt / 60)
//   dP = (free air litres / system volume litres) x p_atm
//
// Sanity cross-check (independent of the algebra): raising a 53.5 ft3 receiver by 5 psi needs
// 53.5 x 5 / 14.696 = 18.2 ft3 of free air; at 466 cfm that is 2.34 s. The formula below gives
// 2.3 s for the receiver alone. P1's coefficient gave 157 s.
//
// System volume includes the distribution piping (603 L), which the receiver-only figure ignores
// and which materially damps the cycling rate.

import { AIR, COMPRESSORS, SYSTEM_VOLUME_L, P_ATM_PSI, FT3_TO_LITRE } from './constants.mjs';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const UNIT_STATE = Object.freeze({
  STOP: 'stop',
  LOADED: 'loaded',
  UNLOADED: 'unloaded',
});

/** Pressure change in psi for a net flow imbalance held for dt seconds. */
export function pressureDeltaPsi(netCfm, dtS, volumeL = SYSTEM_VOLUME_L) {
  const freeAirLitres = netCfm * FT3_TO_LITRE * (dtS / 60);
  return (freeAirLitres / volumeL) * P_ATM_PSI;
}

/** Electrical draw of one unit, kW. */
export function unitKw(unit, state, { mode = 'fixed', cfmOut = null } = {}) {
  if (state === UNIT_STATE.STOP) return 0;
  if (mode === 'vsd') {
    if (state !== UNIT_STATE.LOADED) return 0; // a VSD unit modulates instead of unloading
    const frac = clamp((cfmOut ?? unit.fadCfm) / unit.fadCfm, 0, 1);
    return unit.ratedKw * (AIR.vsdBaseFraction + AIR.vsdSlopeFraction * frac);
  }
  if (state === UNIT_STATE.LOADED) return unit.ratedKw * AIR.loadedKwFraction;
  return unit.ratedKw * AIR.unloadedKwFraction; // unloaded: burning kW for zero cfm
}

/** Delivered flow of one unit, cfm. */
export function unitCfm(unit, state, { mode = 'fixed', requestedCfm = null } = {}) {
  if (state !== UNIT_STATE.LOADED) return 0;
  if (mode === 'vsd') return clamp(requestedCfm ?? unit.fadCfm, 0, unit.fadCfm);
  return unit.fadCfm;
}

export function createAirState(startPressurePsi = 117.5) {
  return {
    pressurePsi: startPressurePsi,
    // The state holds the MINIMUM that cannot be recomputed: pressure, each unit's mode and its
    // timer. Flow and power are NOT stored — they are derived by resolveFlows() below.
    // Storing them let a unit report state 'unloaded' and 357 cfm in the same object, which is
    // precisely the two-surfaces-contradicting defect this architecture exists to prevent.
    units: COMPRESSORS.map((u) => ({
      id: u.id,
      state: u.id === 'lead' ? UNIT_STATE.LOADED : UNIT_STATE.STOP,
      timerS: 0,
    })),
  };
}

/**
 * Resolve flow and power for every unit from their states alone. ONE function, used by both the
 * integrator and the summary, so a reading can never disagree with the state that produced it.
 */
export function resolveFlows(units, demandCfm, leadMode = 'fixed') {
  const spec = Object.fromEntries(COMPRESSORS.map((u) => [u.id, u]));
  let remaining = Math.max(0, demandCfm);
  return units.map((u) => {
    const mode = u.id === 'lead' ? leadMode : 'fixed';
    const cfm = unitCfm(spec[u.id], u.state, { mode, requestedCfm: remaining });
    const kw = unitKw(spec[u.id], u.state, { mode, cfmOut: cfm });
    remaining = Math.max(0, remaining - cfm);
    return { ...u, cfm, kw };
  });
}

/**
 * Advance the compressed-air system by dt seconds.
 *
 * Order matters and is deliberate: flow is computed from the CURRENT states, the pressure is
 * integrated, and only then does the sequencer react to the new pressure. Reacting first would
 * let a unit respond to a pressure that never existed.
 *
 * @returns a NEW state object (never mutates the input)
 */
export function stepAir(state, dtS, demandCfm, { leadMode = 'fixed' } = {}) {
  // --- 1. supply from the states as they stand at the START of the interval ----------------
  const resolved = resolveFlows(state.units, demandCfm, leadMode);
  const units = state.units.map((u) => ({ ...u }));
  const supplyCfm = resolved.reduce((s, u) => s + u.cfm, 0);
  const netCfm = supplyCfm - Math.max(0, demandCfm);

  // --- 2. integrate pressure --------------------------------------------------------------
  let pressurePsi = state.pressurePsi + pressureDeltaPsi(netCfm, dtS);
  pressurePsi = clamp(pressurePsi, 0, 200);

  // --- 3. unload timers --------------------------------------------------------------------
  for (const u of units) {
    if (u.state === UNIT_STATE.UNLOADED) {
      u.timerS += dtS;
      // The LAG unit stops after the unload timer; the LEAD stays unloaded and ready to reload,
      // which is standard practice and is what makes unloaded-kW waste visible on the dashboard.
      if (u.id === 'lag' && u.timerS >= AIR.unloadTimerS) {
        u.state = UNIT_STATE.STOP;
        u.timerS = 0;
      }
    } else {
      u.timerS = 0;
    }
  }

  // --- 4. sequence on the band -------------------------------------------------------------
  const lead = units.find((u) => u.id === 'lead');
  const lag = units.find((u) => u.id === 'lag');

  if (pressurePsi < AIR.bandLowPsi) {
    if (lead.state !== UNIT_STATE.LOADED) {
      lead.state = UNIT_STATE.LOADED;
      lead.timerS = 0;
    } else if (
      pressurePsi < AIR.bandLowPsi - AIR.lagStartHysteresisPsi &&
      lag.state !== UNIT_STATE.LOADED
    ) {
      lag.state = UNIT_STATE.LOADED;
      lag.timerS = 0;
    }
  } else if (pressurePsi > AIR.bandHighPsi) {
    // Unload the LAG first — never shed the lead while a lag unit is still loaded.
    if (lag.state === UNIT_STATE.LOADED) {
      lag.state = UNIT_STATE.UNLOADED;
      lag.timerS = 0;
    } else if (lead.state === UNIT_STATE.LOADED && leadMode !== 'vsd') {
      lead.state = UNIT_STATE.UNLOADED;
      lead.timerS = 0;
    }
  }

  return { pressurePsi, units };
}

/** Aggregate readings derived from an air state — the single source for every air number shown. */
export function airSummary(state, demandCfm, { leadMode = 'fixed' } = {}) {
  // Derived from the states, never read from a stored field: a summary of a hand-built state is
  // just as correct as a summary of a stepped one.
  const units = resolveFlows(state.units, demandCfm, leadMode);
  const compressorKw = units.reduce((s, u) => s + u.kw, 0);
  const totalKw = compressorKw + AIR.dryerKw;
  const supplyCfm = units.reduce((s, u) => s + u.cfm, 0);
  const unloadedKw = units
    .filter((u) => u.state === UNIT_STATE.UNLOADED)
    .reduce((s, u) => s + u.kw, 0);

  // kW per 100 cfm — the honest efficiency benchmark. Undefined at zero flow, and reported as
  // null rather than Infinity so no dashboard surface ever prints a divide-by-zero artefact.
  const specificPower = supplyCfm > 0 ? (compressorKw / supplyCfm) * 100 : null;

  return {
    pressurePsi: state.pressurePsi,
    inBand: state.pressurePsi >= AIR.bandLowPsi && state.pressurePsi <= AIR.bandHighPsi,
    supplyCfm,
    demandCfm: Math.max(0, demandCfm),
    deficitCfm: Math.max(0, Math.max(0, demandCfm) - supplyCfm),
    compressorKw,
    dryerKw: AIR.dryerKw,
    totalKw,
    unloadedKw,
    specificPower,
    leadMode,
    units,
  };
}
