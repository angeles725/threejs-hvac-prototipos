// nave-3sistemas — simulation constants.
// Every value traces to disenos/nave-3sistemas/design-spec.yaml (simulation_constants /
// dimensions_real), which in turn cites P1-RESEARCH.md and P1-AMENDMENT.md.
// PURE data module: zero imports, Node-testable.

// ---------------------------------------------------------------------------
// Physical constants
// ---------------------------------------------------------------------------
export const AIR_DENSITY_KG_M3 = 1.2;      // standard air
export const AIR_CP_J_KGK = 1005;          // standard air
export const P_ATM_PSI = 14.696;           // standard atmosphere
export const FT3_TO_LITRE = 28.317;

// ---------------------------------------------------------------------------
// Bay envelope — P1 §1
// ---------------------------------------------------------------------------
export const BAY = Object.freeze({
  lengthM: 40,
  widthM: 20,
  heightM: 8,
  floorAreaM2: 800,
  volumeM3: 6400,
  envelopeAreaM2: 1760,
  uValueWm2K: 0.30,        // ASHRAE metal building, R-19
  infiltrationAch: 0.5,
  indoorSetpointC: 26,
});

// ---------------------------------------------------------------------------
// Lighting — P1 §3, amended to 18 fixtures on a 6x3 grid (P1-AMENDMENT §C)
// ---------------------------------------------------------------------------
export const LIGHTING = Object.freeze({
  fixtureCount: 18,
  gridCols: 6,
  gridRows: 3,
  spacingM: 6.67,
  mountHeightM: 7.0,
  powerW: 200,
  lumensPerFixture: 29000,
  coefficientOfUtilisation: 0.7,
  lightLossFactor: 0.8,
  targetLux: 300,
  // Fraction of electrical input that lands in the space as sensible heat.
  // 1.0 for surface/pendant mounting with no return plenum (P1 §3d).
  heatFraction: 1.0,
});

// ---------------------------------------------------------------------------
// HVAC — P1 §2, AHU sized on the repo-gated 20,000 m3/h unit
// ---------------------------------------------------------------------------
export const HVAC = Object.freeze({
  cop: 3.0,
  supplyAirC: 14,
  returnAirC: 26,
  deltaTK: 12,
  airflowM3h: 20000,
  // 20000/3600 m3/s x 1.2 kg/m3 x 1005 J/kgK x 12 K = 80.4 kW
  capacityKw: 80.4,
});

// ---------------------------------------------------------------------------
// Occupancy
// ---------------------------------------------------------------------------
export const PERSON_SENSIBLE_W = 80;   // ASHRAE Fundamentals, light industrial standing work

// ---------------------------------------------------------------------------
// Compressed air — P1 §4
// ---------------------------------------------------------------------------
export const COMPRESSORS = Object.freeze([
  Object.freeze({
    id: 'lead',
    label: 'Compresor 1 (lead)',
    ratedKw: 75,
    fadCfm: 466,
    cabinetM: Object.freeze({ l: 2.0, w: 1.2, h: 1.7 }),
  }),
  Object.freeze({
    id: 'lag',
    label: 'Compresor 2 (lag)',
    ratedKw: 55,
    fadCfm: 357,
    cabinetM: Object.freeze({ l: 1.8, w: 1.1, h: 1.6 }),
  }),
]);

export const AIR = Object.freeze({
  loadedKwFraction: 0.98,
  unloadedKwFraction: 0.30,
  vsdBaseFraction: 0.22,
  vsdSlopeFraction: 0.78,
  bandLowPsi: 115,
  bandHighPsi: 120,
  lagStartHysteresisPsi: 2,
  unloadTimerS: 5,
  dryerKw: 6,
  receiverVolumeL: 1514,      // 400 US gal
  // Distribution piping adds real storage the receiver-only figure ignores:
  // pi x (0.04 m)^2 x 120 m = 0.603 m3 = 603 L.
  pipingVolumeL: 603,
  // Fraction of compressor shaft power that becomes heat. Air-cooled screw: ~1.0.
  heatFraction: 1.0,
});

export const SYSTEM_VOLUME_L = AIR.receiverVolumeL + AIR.pipingVolumeL;  // 2117 L

// ---------------------------------------------------------------------------
// Compressor-room exhaust — P1-AMENDMENT §B
// ---------------------------------------------------------------------------
export const EXHAUST_DEFAULT = 0.85;      // fraction of package heat ducted outdoors
export const RECOVERY_FRACTION = 0.55;    // when heat recovery is switched ON

// ---------------------------------------------------------------------------
// Control defaults — mirror design-spec.yaml ui_controls defaults exactly.
// ---------------------------------------------------------------------------
export const DEFAULT_INPUTS = Object.freeze({
  dim: 0,             // % dimming (0 = full light)
  exhaust: 85,        // % of compressor heat ducted out
  demand: 380,        // cfm process demand
  tout: 35,           // degC outdoor
  people: 40,         // occupants
  leadmode: 'fixed',  // 'fixed' | 'vsd'
  recovery: 'off',    // 'off' | 'on'
});
