// Invariant suite for the coupled plant model.
//
// DISCIPLINE (GATES.md §Test-vs-render jurisdiction): these tests assert deterministic
// invariants — arithmetic, state machines, monotonic couplings. They never predict a pixel.
// And every expected value is DERIVED here from first principles, not imported from the module
// under test: a test that copies the constant it guards cannot catch a wrong constant.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPlantState, stepPlant, derivePlant, normaliseInputs } from '../src/sim/plant.mjs';
import {
  pressureDeltaPsi,
  UNIT_STATE,
  stepAir,
  createAirState,
  airSummary,
} from '../src/sim/compressed-air.mjs';
import { lightingState, luminairePositions } from '../src/sim/lighting.mjs';

// --- independent arithmetic (a second implementation, written from the physics) --------------
const BAY_ENVELOPE = 1760, U = 0.30, VOL = 6400, ACH = 0.5, TIN = 26;
const RHO = 1.2, CP = 1005, COP = 3.0, AHU_CAP = 80.4;
const N_FIX = 18, P_FIX = 200, DRYER = 6;
const LEAD_KW = 75, LAG_KW = 55, LOADED = 0.98;

const envKw = (tout) => (BAY_ENVELOPE * U * (tout - TIN)) / 1000;
const infKw = (tout, f = 1) => ((ACH * f * VOL) / 3600) * RHO * CP * (tout - TIN) / 1000;
const pplKw = (n) => (n * 80) / 1000;
const litKw = (dim) => (N_FIX * P_FIX * (1 - dim / 100)) / 1000;
const fixedKw = (tout, people, dim, openF = 1) =>
  litKw(dim) + envKw(tout) + pplKw(people) + infKw(tout, openF);

const approx = (got, want, tol, label) =>
  assert.ok(
    Math.abs(got - want) <= tol,
    `${label}: got ${got.toFixed(4)}, want ${want.toFixed(4)} +/- ${tol}`,
  );

// ---------------------------------------------------------------------------------------------
test('boot state: a cold load shows the invariant the spec declares', () => {
  const st = createPlantState();
  const r = derivePlant(st, {}); // default inputs

  // Only the lead runs at 380 cfm demand: its 466 cfm FAD covers it alone.
  const running = r.air.units.filter((u) => u.state === UNIT_STATE.LOADED).length;
  assert.equal(running, 1, 'exactly one compressor loaded at boot');

  const roomKw = LEAD_KW * LOADED + DRYER;
  const expectedLoad = fixedKw(35, 40, 0) + roomKw * 0.15;
  approx(r.thermal.coolingLoadKw, expectedLoad, 0.3, 'boot cooling load');
  approx(r.hvac.drawKw, expectedLoad / COP, 0.1, 'boot HVAC draw');
  approx(r.lighting.powerKw, 3.6, 0.001, 'boot lighting kW');
  assert.equal(r.status, 'normal', 'boot state is not in alarm');
});

test('full production: both units loaded matches the amendment arithmetic', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
  const r = derivePlant(st, { demand: 800 });

  const roomKw = (LEAD_KW + LAG_KW) * LOADED + DRYER;
  approx(r.thermal.coolingLoadKw, fixedKw(35, 40, 0) + roomKw * 0.15, 0.3, 'full-load cooling');
  approx(r.hvac.drawKw, (fixedKw(35, 40, 0) + roomKw * 0.15) / COP, 0.1, 'full-load HVAC');
});

test('worst case: exhaust off puts the whole compressor-room heat into the bay', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
  const r = derivePlant(st, { demand: 800, exhaust: 0 });

  const roomKw = (LEAD_KW + LAG_KW) * LOADED + DRYER;
  approx(r.thermal.coolingLoadKw, fixedKw(35, 40, 0) + roomKw, 0.5, 'worst-case cooling');
  assert.ok(r.hvac.saturated, 'the AHU must read as saturated with exhaust off');
});

test('the AHU saturation threshold sits where the algebra says it does', () => {
  const roomKw = (LEAD_KW + LAG_KW) * LOADED + DRYER;
  const fixed = fixedKw(35, 40, 0);
  const fSat = 1 - (AHU_CAP - fixed) / roomKw; // solved, not observed

  const at = (exhaustPercent) => {
    const st = createPlantState();
    st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
    return derivePlant(st, { demand: 800, exhaust: exhaustPercent }).hvac.saturated;
  };

  assert.equal(at(Math.floor(fSat * 100) - 1), true, 'saturated just below the threshold');
  assert.equal(at(Math.ceil(fSat * 100) + 1), false, 'not saturated just above it');
});

// ---------------------------------------------------------------------------------------------
test('COUPLING: dimming the lights lowers the cooling load and the HVAC draw', () => {
  const st = createPlantState();
  const bright = derivePlant(st, { dim: 0 });
  const dark = derivePlant(st, { dim: 100 });

  assert.ok(dark.thermal.coolingLoadKw < bright.thermal.coolingLoadKw, 'load must fall');
  assert.ok(dark.hvac.drawKw < bright.hvac.drawKw, 'HVAC draw must fall');
  // The drop must equal the lighting power exactly — the coupling is 1:1, not approximate.
  approx(
    bright.thermal.coolingLoadKw - dark.thermal.coolingLoadKw,
    litKw(0),
    0.001,
    'load drop equals lighting power',
  );
});

test('COUPLING: closing the exhaust raises the load monotonically', () => {
  const st = createPlantState();
  let prev = -Infinity;
  for (const e of [0, 20, 40, 60, 80, 95]) {
    const r = derivePlant(st, { exhaust: 95 - e });
    assert.ok(r.thermal.coolingLoadKw > prev, `load must rise as exhaust closes (at ${95 - e} %)`);
    prev = r.thermal.coolingLoadKw;
  }
});

test('COUPLING: opening the bay door raises infiltration only', () => {
  const st = createPlantState();
  const shut = derivePlant(st, { bayopen: 0 });
  const open = derivePlant(st, { bayopen: 1 });
  const find = (r, id) => r.thermal.contributors.find((c) => c.id === id).kw;

  approx(find(open, 'infiltration'), find(shut, 'infiltration') * 3, 0.001, 'infiltration triples');
  approx(find(open, 'lighting'), find(shut, 'lighting'), 0.001, 'lighting unchanged');
  approx(find(open, 'compressors'), find(shut, 'compressors'), 0.001, 'compressor heat unchanged');
});

test('NON-COUPLING: HVAC state never feeds back into the lighting model', () => {
  const st = createPlantState();
  const hot = derivePlant(st, { tout: 42 });
  const cold = derivePlant(st, { tout: 20 });
  approx(hot.lighting.powerKw, cold.lighting.powerKw, 0.001, 'lighting is independent of outdoor temp');
  approx(hot.lighting.lux, cold.lighting.lux, 0.001, 'lux is independent of outdoor temp');
});

// ---------------------------------------------------------------------------------------------
test('pressure model matches an independent gas-law calculation', () => {
  // 466 cfm of free air for 1 s into 2117 L, at 14.696 psi:
  //   litres = 466 * 28.317 / 60 = 219.9 L ; dP = 219.9 / 2117 * 14.696
  const expected = ((466 * 28.317) / 60 / 2117) * 14.696;
  approx(pressureDeltaPsi(466, 1), expected, 1e-9, 'pressure delta');
  assert.ok(pressureDeltaPsi(-466, 1) < 0, 'a deficit must lower pressure');
  approx(pressureDeltaPsi(0, 10), 0, 1e-12, 'no imbalance, no change');
});

test('sequencing: pressure below the band reloads the lead, then starts the lag', () => {
  let air = createAirState(110); // well under the 115 psi band
  air.units.forEach((u) => (u.state = UNIT_STATE.STOP));

  air = stepAir(air, 1, 800, {});
  assert.equal(air.units.find((u) => u.id === 'lead').state, UNIT_STATE.LOADED, 'lead reloads first');

  // Still short of 800 cfm on the lead alone, and below band-low minus hysteresis.
  air = stepAir(air, 1, 800, {});
  assert.equal(air.units.find((u) => u.id === 'lag').state, UNIT_STATE.LOADED, 'lag joins');
});

test('sequencing: above the band the LAG unloads before the lead', () => {
  let air = createAirState(125); // over band-high
  air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));

  air = stepAir(air, 1, 0, {});
  assert.equal(air.units.find((u) => u.id === 'lag').state, UNIT_STATE.UNLOADED, 'lag sheds first');
  assert.equal(air.units.find((u) => u.id === 'lead').state, UNIT_STATE.LOADED, 'lead still loaded');
});

test('an UNLOADED unit burns kW while delivering zero cfm', () => {
  let air = createAirState(125);
  air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
  air = stepAir(air, 1, 0, {});
  assert.equal(air.units.find((u) => u.id === 'lag').state, UNIT_STATE.UNLOADED);

  // Flow and power are DERIVED, never stored — so they are read through the summary, which is
  // the same path every display surface uses. State and reading cannot drift apart.
  const s = airSummary(air, 0, {});
  const lag = s.units.find((u) => u.id === 'lag');
  assert.equal(lag.cfm, 0, 'no flow when unloaded');
  assert.ok(lag.kw > 0, 'but it still draws power — this is the waste the dashboard must show');
  approx(s.unloadedKw, lag.kw, 1e-9, 'the summary attributes the waste to the unloaded unit');
});

test('no stored flow or power can drift from the unit state', () => {
  const air = createAirState(118);
  for (const u of air.units) {
    assert.ok(!('cfm' in u), 'cfm must not be stored on the state');
    assert.ok(!('kw' in u), 'kw must not be stored on the state');
  }
});

test('a VSD lead modulates instead of unloading', () => {
  const st = createPlantState();
  const fixed = derivePlant(st, { demand: 120, leadmode: 'fixed' });
  const vsd = derivePlant(st, { demand: 120, leadmode: 'vsd' });
  assert.ok(vsd.air.compressorKw < fixed.air.compressorKw, 'VSD draws less at part load');
});

// ---------------------------------------------------------------------------------------------
test('purity: stepPlant never mutates the state it is given', () => {
  const st = createPlantState();
  const before = JSON.stringify(st);
  stepPlant(st, {}, 1);
  assert.equal(JSON.stringify(st), before, 'input state unchanged');
});

test('determinism: same state and inputs always derive the same readings', () => {
  const st = createPlantState();
  const a = derivePlant(st, { dim: 40, exhaust: 50 });
  const b = derivePlant(st, { dim: 40, exhaust: 50 });
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'derivation is deterministic');
});

test('no divide-by-zero artefact reaches a display surface', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.STOP));
  const r = derivePlant(st, { demand: 0 });
  assert.equal(r.air.specificPower, null, 'specific power is null at zero flow, never Infinity');
  const walk = (v) => {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `non-finite number: ${v}`);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(r);
});

test('input clamping refuses out-of-range values instead of propagating them', () => {
  const i = normaliseInputs({ dim: 500, exhaust: -20, demand: 99999, tout: 3, people: -5 });
  assert.equal(i.dim, 100);
  assert.equal(i.exhaust, 0);
  assert.equal(i.demand, 800);
  assert.equal(i.tout, 20);
  assert.equal(i.people, 0);
});

// ---------------------------------------------------------------------------------------------
test('lighting: the grid is regular and matches the declared count', () => {
  const pos = luminairePositions();
  assert.equal(pos.length, 18, '18 fixtures');
  // Distinct axis values, deduplicated by proximity rather than by a rounded key — rounding to
  // build the key is what made this assertion measure float noise instead of the grid.
  const distinct = (vals) =>
    [...vals].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6);
  const xs = distinct(pos.map((p) => p.x));
  const zs = distinct(pos.map((p) => p.z));
  assert.equal(xs.length, 6, '6 columns');
  assert.equal(zs.length, 3, '3 rows');
  const dx = xs.slice(1).map((v, i) => v - xs[i]);
  const spread = Math.max(...dx) - Math.min(...dx);
  assert.ok(spread < 1e-9, `column spacing is uniform (spread ${spread})`);
  approx(dx[0], 40 / 6, 1e-9, 'column pitch is bay length over column count');
  assert.ok(pos.every((p) => p.y === 7.0), 'all at 7 m mount height');
});

test('lighting: maintained illuminance clears the 300 lux target at full output', () => {
  const l = lightingState(0);
  // 18 x 29000 x 0.7 x 0.8 / 800 — derived here, not read from the module
  approx(l.lux, (18 * 29000 * 0.7 * 0.8) / 800, 0.01, 'maintained lux');
  assert.ok(l.lux >= 300, 'design target met');
  assert.equal(l.belowTarget, false);
  assert.ok(lightingState(60).belowTarget, 'heavy dimming drops below target and must flag');
});

test('alarms: every alarm carries a shape, so state is never colour-only', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
  const r = derivePlant(st, { demand: 800, exhaust: 0 });
  assert.ok(r.alarms.length > 0, 'this state must raise alarms');
  for (const a of r.alarms) {
    assert.ok(a.shape, `alarm ${a.id} needs a shape`);
    assert.ok(['normal', 'warning', 'alarm'].includes(a.severity));
    assert.ok(a.system && a.title && a.detail);
  }
});
