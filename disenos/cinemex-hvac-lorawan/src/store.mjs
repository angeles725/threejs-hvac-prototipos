import { advanceSimulation, createSimulationState, setSetpoint } from './simulation.mjs';

export function reduceState(config, state, action) {
  switch (action.type) {
    case 'TICK':
      return advanceSimulation(config, state, action.steps ?? 1);
    case 'SET_SETPOINT':
      return setSetpoint(config, state, action.deviceId, action.value);
    default:
      throw new Error(`Unsupported action ${action.type}.`);
  }
}

export function createStore(config, options = {}) {
  let state = createSimulationState(config, options);
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
