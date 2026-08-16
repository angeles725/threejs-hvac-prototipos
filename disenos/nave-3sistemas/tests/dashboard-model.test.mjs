// Dashboard view-model invariants.
//
// The point of these is ANTI-CONTRADICTION: prove that no two surfaces can show different
// numbers for the same fact, and that nothing formats or thresholds outside the one derivation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPlantState, derivePlant, stepPlant } from '../src/sim/plant.mjs';
import { deriveDashboardModel, mergeContributors, FORMAT } from '../src/dashboard/model.mjs';
import { CONTRIBUTOR_ORDER, SYSTEM_COLOR, CONTRIBUTOR_STYLE } from '../src/dashboard/tokens.mjs';
import { UNIT_STATE } from '../src/sim/compressed-air.mjs';

const model = (inputs = {}, state = createPlantState()) =>
  deriveDashboardModel(derivePlant(state, inputs), state.history);

test('the stacked bar sums to the total the KPI tile shows', () => {
  const r = derivePlant(createPlantState(), {});
  const m = deriveDashboardModel(r, []);
  const sum = m.stack.segments.reduce((s, x) => s + x.kw, 0);
  assert.ok(Math.abs(sum - r.thermal.coolingLoadKw) < 1e-9, 'segments must sum to the total');

  const tile = m.tiles.find((t) => t.id === 'cooling-kw');
  assert.equal(tile.value, m.stack.totalLabel, 'tile and bar print the SAME string');
});

test('merging envelope and infiltration loses no energy', () => {
  const r = derivePlant(createPlantState(), { tout: 40 });
  const before = r.thermal.contributors.reduce((s, c) => s + c.kw, 0);
  const after = mergeContributors(r.thermal.contributors).reduce((s, c) => s + c.kw, 0);
  assert.ok(Math.abs(before - after) < 1e-9, 'the merge is a regrouping, never a loss');

  const exterior = mergeContributors(r.thermal.contributors).find((c) => c.id === 'exterior');
  const env = r.thermal.contributors.find((c) => c.id === 'envelope').kw;
  const inf = r.thermal.contributors.find((c) => c.id === 'infiltration').kw;
  assert.ok(Math.abs(exterior.kw - (env + inf)) < 1e-9, 'exterior = envelope + infiltration');
});

test('every stacked segment carries a colour AND a label — never colour alone', () => {
  const m = model();
  for (const seg of m.stack.segments) {
    assert.ok(seg.color, `${seg.id} needs a colour`);
    assert.ok(seg.label && seg.label.length > 0, `${seg.id} needs a label`);
  }
  assert.deepEqual(
    m.stack.segments.map((s) => s.id),
    [...CONTRIBUTOR_ORDER],
    'segment order is fixed by entity, never by rank',
  );
});

test('a system colour means the same thing in the tile, the panel and the 3D', () => {
  const m = model();
  const panel = m.panels.find((p) => p.id === 'air');
  const segment = m.stack.segments.find((s) => s.id === 'compressors');
  assert.equal(panel.color, SYSTEM_COLOR.air.dark, 'panel uses the system hue');
  assert.equal(segment.color, CONTRIBUTOR_STYLE.compressors.dark, 'segment uses the same hue');
  assert.equal(segment.color, SYSTEM_COLOR.air.dark, 'and they are the SAME hue');
});

test('the flow strip tells the same story the tiles do', () => {
  const r = derivePlant(createPlantState(), {});
  const m = deriveDashboardModel(r, []);
  const out = m.flow.find((c) => c.id === 'out');
  const tile = m.tiles.find((t) => t.id === 'hvac-kw');
  assert.equal(out.value, tile.value, 'the strip endpoint equals the HVAC tile');

  const heat = m.flow.find((c) => c.id === 'heat');
  assert.equal(heat.value, m.stack.totalLabel, 'the strip middle equals the stacked total');
});

test('alarms pass through untouched — the dashboard never re-thresholds', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
  const r = derivePlant(st, { demand: 800, exhaust: 0 });
  const m = deriveDashboardModel(r, []);

  assert.equal(m.alarms.length, r.alarms.length, 'same count');
  assert.deepEqual(
    m.alarms.map((a) => a.id),
    r.alarms.map((a) => a.id),
    'same ids, same order',
  );
  for (const a of m.alarms) assert.ok(a.shape, 'each alarm carries a shape, not colour alone');
  assert.equal(m.status.id, 'alarm');
});

test('the status chip agrees with the alarm list it sits above', () => {
  const cases = [{}, { exhaust: 0, demand: 800 }, { dim: 90 }];
  for (const inputs of cases) {
    const st = createPlantState();
    st.air.units.forEach((u) => (u.state = UNIT_STATE.LOADED));
    const r = derivePlant(st, inputs);
    const m = deriveDashboardModel(r, []);
    const worst = m.alarms.some((a) => a.severity === 'alarm')
      ? 'alarm'
      : m.alarms.some((a) => a.severity === 'warning')
        ? 'warning'
        : 'normal';
    assert.equal(m.status.id, worst, `chip must match the list for ${JSON.stringify(inputs)}`);
  }
});

test('the 3D binding reads the same fields the panels print', () => {
  const r = derivePlant(createPlantState(), { dim: 40, exhaust: 30 });
  const m = deriveDashboardModel(r, []);
  assert.equal(m.scene.dimFraction, 0.4);
  assert.equal(m.scene.exhaustFraction, 0.3);
  assert.equal(m.scene.luminaireIntensity, r.lighting.outputFraction);
  assert.equal(m.scene.compressorStates.length, r.air.units.length);
  for (const cs of m.scene.compressorStates) {
    const unit = r.air.units.find((u) => u.id === cs.id);
    assert.equal(cs.state, unit.state, 'the mesh state is the simulation state');
    assert.equal(cs.kw, unit.kw, 'and so is its power');
  }
});

test('no display string is ever NaN or Infinity', () => {
  const st = createPlantState();
  st.air.units.forEach((u) => (u.state = UNIT_STATE.STOP));
  const m = deriveDashboardModel(derivePlant(st, { demand: 0, dim: 100, people: 0 }), []);
  const walk = (v) => {
    if (typeof v === 'string') assert.ok(!/NaN|Infinity/.test(v), `bad string: ${v}`);
    else if (typeof v === 'number') assert.ok(Number.isFinite(v), `bad number: ${v}`);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(m);
  assert.equal(m.panels.find((p) => p.id === 'air').rows.find((x) => x.label === 'Potencia específica').value, '—');
});

test('every panel row declares where its number comes from', () => {
  const m = model();
  for (const p of m.panels) {
    for (const row of p.rows) {
      assert.ok(['input', 'derived', 'aggregate', 'constant'].includes(row.kind),
        `${p.id}/${row.label} must declare its kind`);
    }
  }
});

test('the lighting panel states the heat coupling as its own row', () => {
  const m = model();
  const rows = m.panels.find((p) => p.id === 'lighting').rows;
  const power = rows.find((r) => r.label === 'Potencia instalada');
  const heat = rows.find((r) => r.label === 'Calor aportado');
  assert.ok(heat, 'the heat contribution must be visible, not implied');
  assert.equal(heat.value, power.value, 'Q_light = P_lighting — shown, not hidden');
});

test('trend series carry one point per recorded tick', () => {
  let st = createPlantState();
  for (let i = 0; i < 5; i++) st = stepPlant(st, {}, 1);
  const m = deriveDashboardModel(derivePlant(st, {}), st.history);
  assert.equal(m.series.hvacKw.length, 5);
  assert.equal(m.series.pressurePsi.length, 5);
  assert.ok(m.series.hvacKw.every((p) => Number.isFinite(p.t) && Number.isFinite(p.v)));
});

test('formatting is a property of the quantity, not of the call site', () => {
  assert.equal(FORMAT.kw(12.345), '12.3');
  assert.equal(FORMAT.psi(117.28), '117.3');
  assert.equal(FORMAT.cfm(466.7), '467');
  assert.equal(FORMAT.pct(0.4123), '41');
  assert.equal(FORMAT.kw(NaN), '—', 'a non-finite value degrades to a dash, never to "NaN"');
});
