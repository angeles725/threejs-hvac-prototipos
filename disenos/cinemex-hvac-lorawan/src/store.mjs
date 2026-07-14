import { deriveAlarms } from './alarms.mjs';
import {
  advanceSimulation,
  createSimulationState,
  injectFault,
  restoreAllFaults,
  restoreFault,
  setSetpoint,
} from './simulation.mjs';

function withAlarms(config, state) {
  return Object.freeze({ ...state, alarms: deriveAlarms(config, state) });
}

export function reduceState(config, state, action) {
  switch (action.type) {
    case 'TICK':
      return withAlarms(config, advanceSimulation(config, state, action.steps ?? 1));
    case 'SET_SETPOINT':
      return withAlarms(config, setSetpoint(config, state, action.deviceId, action.value));
    case 'INJECT_FAULT':
      return withAlarms(config, injectFault(config, state, action.faultId));
    case 'RESTORE_FAULT':
      return withAlarms(config, restoreFault(config, state, action.faultId));
    case 'RESTORE_ALL_FAULTS':
      return withAlarms(config, restoreAllFaults(config, state));
    default:
      throw new Error(`Unsupported action ${action.type}.`);
  }
}

export function createStore(config, options = {}) {
  let state = withAlarms(config, createSimulationState(config, options));
  const listeners = new Set();

  return Object.freeze({
    getState: () => state,
    dispatch(action) {
      state = reduceState(config, state, action);
      for (const listener of listeners) listener(state, action);
      return action;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Store listener must be a function.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
