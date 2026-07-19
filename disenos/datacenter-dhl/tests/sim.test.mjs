/**
 * P1-2 sim tests (TDD-first) — deterministic per-equipment model for the DHL datacenter room.
 *
 * Contract under test (BRIEF items 2/3):
 *   - one registered instance per placement-block equipment (3 hero racks, 3 CRAC, 2 in-row,
 *     1 UPS, 1 PDU, 1 dry cooler = 11 units);
 *   - seeded stability: the same (seed, tick) always yields the same model;
 *   - physical coherence: in-row deltaT follows the sensible-heat identity against its own
 *     airflow, PDU kW stays inside its kVA rating, UPS runtime follows load and battery,
 *     dry-cooler water-out sits an approach above ambient;
 *   - exactly ONE warn instance and ZERO alarms at any tick (the room is neither fake-perfect
 *     nor fake-alarmed), with `status` honestly derived from the values via thresholds;
 *   - per-kind chip strings (primary + secondary) ready for the scene chips, es-MX copy,
 *     no em dashes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_INSTANCES,
  SIM_POLICY,
  chipReadingsOf,
  createEquipmentModel,
  deriveStatus,
} from '../src/sim/equipment.mjs';

const TICKS = [0, 7, 31, 100];

test('instance registry walks the placement block: 11 units with the placed kind counts', () => {
  assert.equal(EQUIPMENT_INSTANCES.length, 11);
  const counts = {};
  for (const { kind } of EQUIPMENT_INSTANCES) counts[kind] = (counts[kind] ?? 0) + 1;
  assert.deepEqual(counts, { crac: 3, inrow: 2, ups: 1, pdu: 1, dry: 1, rack: 3 });
  const ids = EQUIPMENT_INSTANCES.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, 'instance ids must be unique');
  assert.ok(EQUIPMENT_INSTANCES.every(({ label }) => label.length > 0));
});

test('seeded stability: the same (seed, tick) always rebuilds the identical model', () => {
  for (const tick of TICKS) {
    const a = createEquipmentModel({ tick });
    const b = createEquipmentModel({ tick });
    assert.deepEqual(JSON.parse(JSON.stringify(a.units)), JSON.parse(JSON.stringify(b.units)));
  }
});

test('the model breathes over ticks: a quarter wave period moves at least one value', () => {
  const t0 = createEquipmentModel({ tick: 0 });
  const t24 = createEquipmentModel({ tick: 24 });
  assert.notDeepEqual(
    JSON.parse(JSON.stringify(t0.units)),
    JSON.parse(JSON.stringify(t24.units)),
  );
});

test('exactly-one-warn invariant holds at every tick, and nothing alarms', () => {
  for (const tick of TICKS) {
    const model = createEquipmentModel({ tick });
    const statuses = model.units.map(({ status }) => status);
    assert.equal(statuses.filter((status) => status === 'warn').length, 1, `tick ${tick}`);
    assert.equal(statuses.filter((status) => status === 'alarm').length, 0, `tick ${tick}`);
    const warnUnit = model.units.find(({ status }) => status === 'warn');
    assert.equal(warnUnit.id, model.warnId, 'the model names its own warn unit');
  }
});

test('status is derived from the values via the exported thresholds, never asserted', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units) {
      assert.equal(deriveStatus(unit.kind, unit.values), unit.status, `${unit.id} tick ${tick}`);
    }
  }
});

test('rack values: inlet air and IT load stay in a plausible white-space band', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'rack')) {
      const { inletTempC, itLoadKw } = unit.values;
      assert.ok(inletTempC >= 21.5 && inletTempC <= 29.5, `${unit.id} inlet ${inletTempC}`);
      assert.ok(itLoadKw >= 3.5 && itLoadKw <= 9, `${unit.id} load ${itLoadKw}`);
    }
  }
});

test('crac values: return = supply + deltaT exactly, with a plausible coil deltaT and fan band', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'crac')) {
      const { supplyTempC, returnTempC, deltaTC, fanPct } = unit.values;
      assert.equal(returnTempC, Number((supplyTempC + deltaTC).toFixed(1)), unit.id);
      assert.ok(supplyTempC >= 14.5 && supplyTempC <= 17.5, `${unit.id} supply ${supplyTempC}`);
      assert.ok(deltaTC >= 6 && deltaTC <= 10, `${unit.id} deltaT ${deltaTC}`);
      assert.ok(fanPct >= 70 && fanPct < 100, `${unit.id} fan ${fanPct}`);
    }
  }
});

test('in-row physics: deltaT obeys the sensible-heat identity against its own airflow', () => {
  const k = SIM_POLICY.airKwPerM3hK;
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'inrow')) {
      const { supplyTempC, returnTempC, deltaTC, fanPct, airflowM3h, loadKw } = unit.values;
      assert.equal(airflowM3h, Math.round(SIM_POLICY.kinds.inrow.maxAirflowM3h * (fanPct / 100)), unit.id);
      // deltaT is recomputed from the ROUNDED load and airflow: the identity must close.
      assert.ok(Math.abs(deltaTC - loadKw / (k * airflowM3h)) <= 0.06, `${unit.id} identity`);
      assert.equal(returnTempC, Number((supplyTempC + deltaTC).toFixed(1)), unit.id);
      assert.ok(deltaTC >= 12 && deltaTC <= 25, `${unit.id} deltaT ${deltaTC}`);
      assert.ok(fanPct >= 50 && fanPct <= 99, `${unit.id} fan ${fanPct}`);
    }
  }
});

test('pdu electrical coherence: kW derives from load% and never exceeds the kVA rating', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'pdu')) {
      const { loadKw, loadPct, ratedKva, powerFactor } = unit.values;
      assert.equal(loadKw, Number((ratedKva * powerFactor * (loadPct / 100)).toFixed(1)), unit.id);
      assert.ok(loadKw < ratedKva, `${unit.id} kW ${loadKw} must sit inside ${ratedKva} kVA`);
      assert.ok(loadPct >= 40 && loadPct <= 95, `${unit.id} load ${loadPct}`);
    }
  }
});

test('ups coherence: runtime follows the battery bank divided by the actual kW draw', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'ups')) {
      const { loadPct, loadKw, batteryPct, runtimeMin, capacityKw, bankKwh } = unit.values;
      assert.equal(loadKw, Number((capacityKw * (loadPct / 100)).toFixed(1)), unit.id);
      assert.equal(runtimeMin, Math.round((60 * bankKwh * (batteryPct / 100)) / loadKw), unit.id);
      assert.ok(loadPct >= 40 && loadPct <= 95, `${unit.id} load ${loadPct}`);
      assert.ok(batteryPct > 0 && batteryPct <= 100, `${unit.id} battery ${batteryPct}`);
    }
  }
});

test('dry-cooler physics: water-out sits an approach above ambient, inside the coil band', () => {
  for (const tick of [0, 31]) {
    const model = createEquipmentModel({ tick });
    for (const unit of model.units.filter(({ kind }) => kind === 'dry')) {
      const { waterOutC, waterInC, approachK, fanPct, ambientC } = unit.values;
      assert.equal(ambientC, SIM_POLICY.ambientC, unit.id);
      assert.equal(waterOutC, Number((ambientC + approachK).toFixed(1)), unit.id);
      assert.ok(approachK >= 3.5 && approachK <= 9, `${unit.id} approach ${approachK}`);
      assert.ok(waterInC > waterOutC, `${unit.id} return water must be hotter than supply`);
      assert.ok(fanPct >= 50 && fanPct <= 99, `${unit.id} fan ${fanPct}`);
    }
  }
});

test('chip readings: one two-line reading per unit, per-kind format, es-MX copy, no em dashes', () => {
  const model = createEquipmentModel({ tick: 0 });
  const readings = chipReadingsOf(model);
  assert.deepEqual(Object.keys(readings).sort(), EQUIPMENT_INSTANCES.map(({ id }) => id).sort());
  for (const unit of model.units) {
    const reading = readings[unit.id];
    assert.ok(reading.primary.length > 0 && reading.secondary.length > 0, unit.id);
    assert.equal(reading.status, unit.status, unit.id);
    assert.ok(!reading.primary.includes('—') && !reading.secondary.includes('—'),
      `${unit.id}: em dashes are banned in copy`);
  }
  const byKind = (kind) => model.units.find((unit) => unit.kind === kind).id;
  assert.match(readings[byKind('rack')].primary, /°C$/);
  assert.match(readings[byKind('rack')].secondary, /kW$/);
  assert.match(readings[byKind('crac')].primary, /→.*°C$/);
  assert.match(readings[byKind('crac')].secondary, /^VENT \d+ %$/);
  assert.match(readings[byKind('inrow')].primary, /\//);
  assert.match(readings[byKind('pdu')].primary, /kW$/);
  assert.match(readings[byKind('pdu')].secondary, /^CARGA \d+ %$/);
  assert.match(readings[byKind('ups')].primary, /^CARGA \d+ %$/);
  assert.match(readings[byKind('ups')].secondary, /^BAT \d+ %$/);
  assert.match(readings[byKind('dry')].primary, /^AGUA .*°C$/);
});
