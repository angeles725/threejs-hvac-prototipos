// Plant model — the ONE reducer. PURE.
//
// This is the single derivation the whole page hangs off (ARCHITECTURE.md §2):
//
//   inputs -> stepPlant(state, inputs, dt) -> state -> derivePlant(state, inputs) -> readings
//                                                        |
//                                    +-------------------+-------------------+
//                                    v                                       v
//                            every DOM surface                        every 3D binding
//
// No DOM node and no mesh may compute its own number. If two surfaces disagree, it is because
// somebody computed instead of reading — that is the defect this shape exists to prevent.

import { DEFAULT_INPUTS, HVAC, LIGHTING, RECOVERY_FRACTION, AIR } from './constants.mjs';
import { lightingState } from './lighting.mjs';
import { createAirState, stepAir, airSummary } from './compressed-air.mjs';
import {
  coolingLoad,
  hvacDrawKw,
  ahuUtilisation,
  requiredAirflowM3h,
  recoveredKw,
} from './thermal.mjs';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function createPlantState() {
  return {
    tickS: 0,
    air: createAirState(),
    history: [],
  };
}

export function normaliseInputs(raw = {}) {
  const i = { ...DEFAULT_INPUTS, ...raw };
  return {
    dim: clamp(Number(i.dim) || 0, 0, 100),
    exhaust: clamp(Number(i.exhaust ?? DEFAULT_INPUTS.exhaust), 0, 95),
    demand: clamp(Number(i.demand ?? DEFAULT_INPUTS.demand), 0, 800),
    tout: clamp(Number(i.tout ?? DEFAULT_INPUTS.tout), 20, 42),
    people: clamp(Number(i.people ?? DEFAULT_INPUTS.people), 0, 60),
    leadmode: i.leadmode === 'vsd' ? 'vsd' : 'fixed',
    recovery: i.recovery === 'on' ? 'on' : 'off',
    bayopen: i.bayopen === 1 || i.bayopen === '1' || i.bayopen === true ? 1 : 0,
  };
}

const HISTORY_MAX = 240; // 4 minutes at 1 Hz — the trend window the dashboard plots

/** Advance the plant. Returns a NEW state; never mutates. */
export function stepPlant(state, rawInputs, dtS) {
  const inputs = normaliseInputs(rawInputs);
  const air = stepAir(state.air, dtS, inputs.demand, { leadMode: inputs.leadmode });
  const next = { tickS: state.tickS + dtS, air, history: state.history };

  const readings = derivePlant(next, inputs);
  const history = state.history.concat([
    {
      t: next.tickS,
      coolingKw: readings.thermal.coolingLoadKw,
      hvacKw: readings.hvac.drawKw,
      lightingKw: readings.lighting.powerKw,
      airKw: readings.air.totalKw,
      pressurePsi: readings.air.pressurePsi,
      plantKw: readings.plant.totalKw,
    },
  ]);

  return { ...next, history: history.slice(-HISTORY_MAX) };
}

/**
 * Derive every displayed number from state + inputs. Deterministic and side-effect free:
 * the same state and inputs always produce the same readings, which is what makes a captured
 * frame reproducible evidence.
 */
export function derivePlant(state, rawInputs) {
  const inputs = normaliseInputs(rawInputs);

  const lighting = lightingState(inputs.dim);
  const air = airSummary(state.air, inputs.demand, { leadMode: inputs.leadmode });

  const exhaustFraction = inputs.exhaust / 100;
  const recoveryFraction = inputs.recovery === 'on' ? RECOVERY_FRACTION : 0;
  // An open bay door triples the base infiltration rate — a coarse but defensible model of a
  // 4 x 4 m opening on a 6400 m3 volume, and it is a control the user can SEE act in the 3D.
  const openingFactor = inputs.bayopen ? 3 : 1;

  // The dryer stands INSIDE the compressor room, so its heat follows the same exhaust path as
  // the compressor packages — pass the room total, not just the compressors.
  const load = coolingLoad({
    lightingHeatKw: lighting.heatKw,
    compressorKwTotal: air.totalKw,
    exhaustFraction,
    recoveryFraction,
    toutC: inputs.tout,
    people: inputs.people,
    openingFactor,
  });

  const drawKw = hvacDrawKw(load.totalKw);
  const util = ahuUtilisation(load.totalKw);
  const recovered = recoveredKw(air.compressorKw, exhaustFraction, recoveryFraction);

  const plantTotalKw = drawKw + lighting.powerKw + air.totalKw;

  const alarms = deriveAlarms({ air, lighting, util, load });

  return {
    inputs,
    tickS: state.tickS,
    lighting: {
      powerKw: lighting.powerKw,
      heatKw: lighting.heatKw,
      lux: lighting.lux,
      luxTarget: lighting.luxTarget,
      belowTarget: lighting.belowTarget,
      outputFraction: lighting.outputFraction,
      fixtureCount: lighting.fixtureCount,
    },
    air,
    thermal: {
      coolingLoadKw: load.totalKw,
      contributors: load.contributors,
      recoveredKw: recovered,
      exhaustFraction,
      recoveryFraction,
      openingFactor,
    },
    hvac: {
      drawKw,
      cop: HVAC.cop,
      capacityKw: util.capacityKw,
      utilisation: util.ratio,
      saturated: util.saturated,
      requiredAirflowM3h: requiredAirflowM3h(load.totalKw),
      installedAirflowM3h: HVAC.airflowM3h,
    },
    plant: {
      totalKw: plantTotalKw,
      shares: [
        { id: 'hvac', label: 'HVAC', kw: drawKw },
        { id: 'air', label: 'Aire comprimido', kw: air.totalKw },
        { id: 'lighting', label: 'Iluminación', kw: lighting.powerKw },
      ],
      specificEnergyKwPerKwCooling: load.totalKw > 0 ? drawKw / load.totalKw : null,
    },
    alarms,
    status: alarms.some((a) => a.severity === 'alarm')
      ? 'alarm'
      : alarms.some((a) => a.severity === 'warning')
        ? 'warning'
        : 'normal',
  };
}

/**
 * The ONE alarm derivation. Both the dashboard and the 3D read this array; neither re-evaluates
 * a threshold of its own. Every entry carries a `shape` so state is never encoded by colour alone.
 */
export function deriveAlarms({ air, lighting, util, load }) {
  const out = [];

  if (util.saturated) {
    out.push({
      id: 'ahu-saturated',
      severity: 'alarm',
      shape: 'circle-filled',
      system: 'hvac',
      title: 'Capacidad de la UMA excedida',
      detail: `Demanda ${load.totalKw.toFixed(1)} kW sobre ${util.capacityKw.toFixed(1)} kW instalados (${(util.ratio * 100).toFixed(0)} %)`,
    });
  } else if (util.ratio > 0.85) {
    out.push({
      id: 'ahu-high',
      severity: 'warning',
      shape: 'triangle',
      system: 'hvac',
      title: 'UMA cerca de su capacidad',
      detail: `${(util.ratio * 100).toFixed(0)} % de la capacidad instalada`,
    });
  }

  if (air.deficitCfm > 0) {
    out.push({
      id: 'air-deficit',
      severity: 'alarm',
      shape: 'circle-filled',
      system: 'air',
      title: 'Demanda de aire no cubierta',
      detail: `Faltan ${air.deficitCfm.toFixed(0)} cfm`,
    });
  }

  if (air.pressurePsi < AIR.bandLowPsi - AIR.lagStartHysteresisPsi) {
    out.push({
      id: 'pressure-low',
      severity: 'warning',
      shape: 'triangle',
      system: 'air',
      title: 'Presión bajo la banda',
      detail: `${air.pressurePsi.toFixed(1)} psi frente a ${AIR.bandLowPsi} psi`,
    });
  }

  if (air.unloadedKw > 0) {
    out.push({
      id: 'unloaded-waste',
      severity: 'warning',
      shape: 'triangle',
      system: 'air',
      title: 'Compresor en descarga',
      detail: `${air.unloadedKw.toFixed(1)} kW consumidos sin entregar caudal`,
    });
  }

  if (lighting.belowTarget) {
    out.push({
      id: 'lux-below-target',
      severity: 'warning',
      shape: 'triangle',
      system: 'lighting',
      title: 'Iluminancia bajo objetivo',
      detail: `${lighting.lux.toFixed(0)} lux frente a ${lighting.luxTarget} lux`,
    });
  }

  return out;
}
