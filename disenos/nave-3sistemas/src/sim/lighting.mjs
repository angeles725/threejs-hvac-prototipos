// Lighting model — PURE. Zero imports beyond constants; Node-testable.
// Physics: a luminaire is an electrical load whose entire input power lands in the space as
// sensible heat (no return plenum here). Dimming scales BOTH the light and the heat, which is
// exactly the coupling the dashboard must make visible.

import { LIGHTING, BAY } from './constants.mjs';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * @param {number} dimPercent 0 = full output, 100 = fully dimmed off
 * @returns {{outputFraction:number, powerKw:number, heatKw:number, lux:number,
 *            belowTarget:boolean, luxTarget:number, fixtureCount:number}}
 */
export function lightingState(dimPercent, cfg = LIGHTING, bay = BAY) {
  const outputFraction = 1 - clamp(dimPercent, 0, 100) / 100;
  const powerKw = (cfg.fixtureCount * cfg.powerW * outputFraction) / 1000;
  const heatKw = powerKw * cfg.heatFraction;
  const lux =
    (cfg.fixtureCount *
      cfg.lumensPerFixture *
      cfg.coefficientOfUtilisation *
      cfg.lightLossFactor *
      outputFraction) /
    bay.floorAreaM2;

  return {
    outputFraction,
    powerKw,
    heatKw,
    lux,
    luxTarget: cfg.targetLux,
    belowTarget: lux < cfg.targetLux,
    fixtureCount: cfg.fixtureCount,
  };
}

/** Installed lighting power density, W/m2 — a benchmark figure for the dashboard. */
export function lightingPowerDensity(cfg = LIGHTING, bay = BAY) {
  return (cfg.fixtureCount * cfg.powerW) / bay.floorAreaM2;
}

/**
 * World positions of the luminaire grid, centred on the bay origin.
 * The SCENE consumes this so the 3D grid and the simulation can never disagree about
 * how many fixtures exist or where they are.
 */
export function luminairePositions(cfg = LIGHTING, bay = BAY) {
  const out = [];
  const stepX = bay.lengthM / cfg.gridCols;
  const stepZ = bay.widthM / cfg.gridRows;
  for (let r = 0; r < cfg.gridRows; r++) {
    for (let c = 0; c < cfg.gridCols; c++) {
      out.push({
        index: r * cfg.gridCols + c,
        x: -bay.lengthM / 2 + stepX * (c + 0.5),
        y: cfg.mountHeightM,
        z: -bay.widthM / 2 + stepZ * (r + 0.5),
      });
    }
  }
  return out;
}
