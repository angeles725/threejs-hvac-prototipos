const LAYER_NAMES = Object.freeze(['roof', 'walls', 'rs485', 'lorawan', 'internet', 'labels']);
const VIEW_NAMES = Object.freeze(['all', 'architecture', 'hvac']);

export function createLayerController({ groups, renderer, materials, clippingPlane } = {}) {
  if (!groups || !renderer) throw new TypeError('groups and renderer are required.');

  const state = {
    visualMode: 'architectural',
    view: 'all',
    cutaway: false,
    roof: true,
    walls: true,
    rs485: false,
    lorawan: false,
    internet: false,
    labels: true,
  };

  function apply() {
    const architectureEnabled = state.view !== 'hvac';
    const engineeringEnabled = state.view !== 'architecture';
    groups.architecture.visible = architectureEnabled;
    groups.roof.visible = architectureEnabled && state.roof;
    groups.walls.visible = architectureEnabled && state.walls;
    groups.hvac.visible = engineeringEnabled;
    groups.zones.visible = engineeringEnabled && state.visualMode === 'engineering';
    groups.rs485.visible = engineeringEnabled && state.rs485;
    groups.lorawan.visible = engineeringEnabled && state.lorawan;
    groups.internet.visible = engineeringEnabled && state.internet;
    groups.labels.visible = state.labels;
    renderer.localClippingEnabled = state.cutaway;
    renderer.clippingPlanes = [];
    materials?.setCutaway?.(state.cutaway, clippingPlane);
  }

  function setVisualMode(mode) {
    if (mode !== 'architectural' && mode !== 'engineering') return false;
    state.visualMode = mode;
    materials?.setEngineeringMode?.(mode === 'engineering');
    apply();
    return true;
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

  function setCutaway(enabled) {
    state.cutaway = Boolean(enabled);
    apply();
  }

  function hydrate(nextState) {
    setVisualMode(nextState.visualMode);
    state.view = VIEW_NAMES.includes(nextState.view) ? nextState.view : state.view;
    for (const name of LAYER_NAMES) {
      if (name in nextState) state[name] = Boolean(nextState[name]);
    }
    state.cutaway = Boolean(nextState.cutaway);
    apply();
  }

  function getState() {
    return Object.freeze({ ...state });
  }

  apply();
  return { setVisualMode, setView, setLayer, setCutaway, hydrate, getState };
}
