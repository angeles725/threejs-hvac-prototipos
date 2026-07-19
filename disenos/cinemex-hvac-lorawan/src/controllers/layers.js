const LAYER_NAMES = Object.freeze(['roof', 'walls', 'rs485', 'lorawan', 'internet']);
const VIEW_NAMES = Object.freeze(['all', 'architecture', 'hvac']);

/**
 * Layer visibility only. Limpieza fase 2 (2026-07-18): the visual-mode axis (architectural vs
 * engineering) and the cutaway clipping machinery were retired — the product ships the single
 * architectural mode, so this controller now owns exactly the view + layer toggles.
 */
export function createLayerController({ groups } = {}) {
  if (!groups) throw new TypeError('groups are required.');

  const state = {
    view: 'all',
    roof: true,
    walls: true,
    rs485: false,
    lorawan: false,
    internet: false,
  };

  function apply() {
    const architectureEnabled = state.view !== 'hvac';
    const engineeringEnabled = state.view !== 'architecture';
    groups.architecture.visible = architectureEnabled;
    groups.roof.visible = architectureEnabled && state.roof;
    groups.walls.visible = architectureEnabled && state.walls;
    groups.hvac.visible = engineeringEnabled;
    groups.rs485.visible = engineeringEnabled && state.rs485;
    groups.lorawan.visible = engineeringEnabled && state.lorawan;
    groups.internet.visible = engineeringEnabled && state.internet;
    // The `labels` group (architectural wall signage + the temperature chips) is always shown; the
    // device-label billboard toggle was removed with the billboard system (2026-07-15 client mandate).
  }

  function setView(view) {
    if (!VIEW_NAMES.includes(view)) return false;
    state.view = view;
    apply();
    return true;
  }

  function setLayer(name, visible) {
    if (!LAYER_NAMES.includes(name)) return false;
    state[name] = Boolean(visible);
    apply();
    return true;
  }

  function hydrate(nextState) {
    state.view = VIEW_NAMES.includes(nextState.view) ? nextState.view : state.view;
    for (const name of LAYER_NAMES) {
      if (name in nextState) state[name] = Boolean(nextState[name]);
    }
    apply();
  }

  function getState() {
    return Object.freeze({ ...state });
  }

  apply();
  return { setView, setLayer, hydrate, getState };
}
