import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_CONFIG } from '../src/config.mjs';
import { advanceSimulation, createSimulationState, setSetpoint } from '../src/simulation.mjs';
import { createStore } from '../src/store.mjs';

test('same seed and tick produce identical telemetry while another seed differs', () => {
  const first = createSimulationState(APP_CONFIG, { seed: 401, tick: 12 });
  const replay = createSimulationState(APP_CONFIG, { seed: 401, tick: 12 });
  const alternate = createSimulationState(APP_CONFIG, { seed: 402, tick: 12 });

  assert.deepEqual(first.telemetry, replay.telemetry);
  assert.deepEqual(first.linkMetrics, replay.linkMetrics);
  assert.notEqual(first.telemetry['TC300-03'].temperature, alternate.telemetry['TC300-03'].temperature);
});

test('normal telemetry stays bounded and changes slowly with occupancy and packet metrics', () => {
  const current = createSimulationState(APP_CONFIG, { seed: 77, tick: 5 });
  const next = advanceSimulation(APP_CONFIG, current, 1);

  for (const thermostat of APP_CONFIG.devices.tc300) {
    const before = current.telemetry[thermostat.id];
    const after = next.telemetry[thermostat.id];
    assert.ok(before.temperature >= 20 && before.temperature <= 26, thermostat.id);
    assert.ok(Math.abs(after.temperature - before.temperature) <= 0.2, thermostat.id);
    assert.equal(after.communication, 'normal', thermostat.id);
  }
  assert.ok(next.telemetry['TC300-08'].occupancy >= 0 && next.telemetry['TC300-08'].occupancy <= 120);
  assert.equal(next.telemetry['TC300-01'].occupancy, null);
  assert.ok(next.linkMetrics['UC100-B'].rssi >= -120 && next.linkMetrics['UC100-B'].rssi <= -45);
  assert.ok(next.linkMetrics['UG67-01'].packetsReceived > current.linkMetrics['UG67-01'].packetsReceived);
});

test('setpoints are configurable, clamped and do not mutate the prior snapshot', () => {
  const original = createSimulationState(APP_CONFIG, { seed: 9 });
  const raised = setSetpoint(APP_CONFIG, original, 'TC300-01', 40);
  const lowered = setSetpoint(APP_CONFIG, raised, 'TC300-02', 10);

  assert.equal(original.telemetry['TC300-01'].setpoint, 22);
  assert.equal(raised.telemetry['TC300-01'].setpoint, 26);
  assert.equal(lowered.telemetry['TC300-02'].setpoint, 18);
  assert.notEqual(original, raised);
});

test('the simulation is always healthy: no fault-injection API survives the simplification', async () => {
  const simulation = await import('../src/simulation.mjs');
  for (const name of ['injectFault', 'restoreFault', 'restoreAllFaults', 'FAULT_IDS']) {
    assert.equal(name in simulation, false, `${name} must not be exported`);
  }
  const state = createSimulationState(APP_CONFIG, { seed: 21, tick: 3 });
  assert.equal('activeFaultIds' in state, false, 'no fault ledger in the state');
  for (const health of Object.values(state.healthById)) assert.equal(health, 'normal');
  for (const reading of Object.values(state.telemetry)) assert.equal(reading.status, 'normal');
});

test('immutable store dispatches deterministic ticks and setpoints only', () => {
  const store = createStore(APP_CONFIG, { seed: 100 });
  const notifications = [];
  const unsubscribe = store.subscribe((state) => notifications.push(state.tick));
  const initial = store.getState();

  store.dispatch({ type: 'SET_SETPOINT', deviceId: 'TC300-08', value: 23.5 });
  assert.equal(store.getState().telemetry['TC300-08'].setpoint, 23.5);

  store.dispatch({ type: 'TICK', steps: 2 });
  assert.equal(store.getState().tick, initial.tick + 2);
  assert.equal(notifications.length, 2);
  assert.throws(() => store.dispatch({ type: 'INJECT_FAULT', faultId: 'anything' }), /Unsupported action/);
  assert.throws(() => { initial.tick = 99; }, TypeError);
  unsubscribe();
});

