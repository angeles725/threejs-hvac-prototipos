// Thermal model — PURE. The load summation and the HVAC draw.
// This module is where the three systems actually meet: lighting heat and compressor heat are
// arguments, not internal assumptions, so the coupling is explicit and testable.

import { BAY, HVAC, PERSON_SENSIBLE_W, AIR_DENSITY_KG_M3, AIR_CP_J_KGK } from './constants.mjs';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Conduction through the envelope, kW. Negative when outdoors is cooler than the setpoint. */
export function envelopeKw(toutC, tinC = BAY.indoorSetpointC, bay = BAY) {
  return (bay.envelopeAreaM2 * bay.uValueWm2K * (toutC - tinC)) / 1000;
}

/**
 * Infiltration, kW. `openingFactor` multiplies the base air-change rate — an open bay door is
 * modelled as extra air changes, which is why opening it is a visible coupling in the dashboard.
 */
export function infiltrationKw(toutC, tinC = BAY.indoorSetpointC, openingFactor = 1, bay = BAY) {
  const m3s = (bay.infiltrationAch * openingFactor * bay.volumeM3) / 3600;
  return (m3s * AIR_DENSITY_KG_M3 * AIR_CP_J_KGK * (toutC - tinC)) / 1000;
}

/** Occupant sensible gain, kW. */
export function peopleKw(count) {
  return (Math.max(0, count) * PERSON_SENSIBLE_W) / 1000;
}

/**
 * The amendment's core equation: how much compressor heat actually reaches the BAY.
 *
 *   Q_comp_bay = P_shaft x (1 - f_exhaust) x (1 - f_recover)
 *
 * f_exhaust is the dedicated compressor-room ventilation ducting heat outdoors; f_recover is
 * heat recovery to process. Both are user controls. See P1-AMENDMENT.md §B.
 */
export function compressorHeatToBayKw(compressorKwTotal, exhaustFraction, recoveryFraction = 0) {
  const fe = clamp(exhaustFraction, 0, 1);
  const fr = clamp(recoveryFraction, 0, 1);
  return Math.max(0, compressorKwTotal) * (1 - fe) * (1 - fr);
}

/** Heat recovered to process, kW — reported so the saving is visible, not implied. */
export function recoveredKw(compressorKwTotal, exhaustFraction, recoveryFraction = 0) {
  const fe = clamp(exhaustFraction, 0, 1);
  const fr = clamp(recoveryFraction, 0, 1);
  return Math.max(0, compressorKwTotal) * (1 - fe) * fr;
}

/**
 * Total sensible cooling load and its breakdown.
 * The breakdown is returned as ordered contributors so the stacked bar in the dashboard renders
 * from the SAME object the total is computed from — one derivation, two surfaces.
 */
export function coolingLoad({
  lightingHeatKw,
  compressorKwTotal,
  exhaustFraction,
  recoveryFraction = 0,
  toutC,
  people,
  openingFactor = 1,
}) {
  const compressors = compressorHeatToBayKw(compressorKwTotal, exhaustFraction, recoveryFraction);
  const envelope = envelopeKw(toutC);
  const infiltration = infiltrationKw(toutC, BAY.indoorSetpointC, openingFactor);
  const occupants = peopleKw(people);
  const lighting = Math.max(0, lightingHeatKw);

  const contributors = [
    { id: 'compressors', label: 'Compresores', kw: compressors },
    { id: 'infiltration', label: 'Infiltración', kw: infiltration },
    { id: 'envelope', label: 'Envolvente', kw: envelope },
    { id: 'lighting', label: 'Iluminación', kw: lighting },
    { id: 'people', label: 'Ocupación', kw: occupants },
  ];

  const totalKw = contributors.reduce((s, c) => s + c.kw, 0);
  // Shares are computed against the POSITIVE total only; a negative contributor (cool outdoor air)
  // must not produce a share above 100 % for its siblings.
  const positive = contributors.reduce((s, c) => s + Math.max(0, c.kw), 0) || 1;
  for (const c of contributors) c.share = Math.max(0, c.kw) / positive;

  return { totalKw, contributors };
}

/** HVAC electrical draw, kW. Cooling only; no load means no draw. */
export function hvacDrawKw(coolingLoadKw, cop = HVAC.cop) {
  return Math.max(0, coolingLoadKw) / cop;
}

/**
 * AHU capacity check. Returns the utilisation ratio and a saturation flag.
 * Saturation is a legitimate, reachable state here: the amendment shows that switching the
 * compressor-room exhaust off drives the load to ~185 % of the installed 80.4 kW.
 */
export function ahuUtilisation(coolingLoadKw, capacityKw = HVAC.capacityKw) {
  const ratio = Math.max(0, coolingLoadKw) / capacityKw;
  return { ratio, saturated: ratio > 1, capacityKw };
}

/** Supply airflow needed to carry the load at the design delta-T, m3/h. */
export function requiredAirflowM3h(coolingLoadKw, deltaTK = HVAC.deltaTK) {
  const m3s = (Math.max(0, coolingLoadKw) * 1000) / (AIR_DENSITY_KG_M3 * AIR_CP_J_KGK * deltaTK);
  return m3s * 3600;
}
