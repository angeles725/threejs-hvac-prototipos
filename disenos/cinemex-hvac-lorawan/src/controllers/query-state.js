import { LIGHTING_LIGHT_STATES } from '../scene/lighting.js';
import {
  INTERACTION_LINK_VALUES,
  INTERACTION_SELECTION_VALUES,
  INTERACTION_STATE_VALUES,
  resolveLinkLayers,
  resolveSceneState,
} from '../scene/interaction.js';

const BOOLEAN_KEYS = Object.freeze(['roof', 'walls', 'cutaway', 'rs485', 'lorawan', 'internet', 'labels']);
const ENUM_VALUES = Object.freeze({
  mode: ['architectural', 'engineering'],
  camera: [
    'isometric', 'facade', 'lobby', 'concessions', 'kitchen', 'checkpoint',
    'corridor', 'auditorium', 'technical', 'ug67', 'network',
    'neutral', 'grazing', 'engineering-section', 'complete-network', 'sala-3',
    'family-master', 'rs485-master', 'roof-service', 'reference-match', 'material-floor',
    'network-schematic-detail',
  ],
  material_state: ['neutral'],
  nav: ['orbit', 'first-person'],
  view: ['all', 'architecture', 'hvac'],
  light_state: LIGHTING_LIGHT_STATES,
  state: INTERACTION_STATE_VALUES,
  selection: INTERACTION_SELECTION_VALUES,
  links: INTERACTION_LINK_VALUES,
});

export const DEFAULT_QUERY_STATE = Object.freeze({
  visualMode: 'architectural',
  // The DesignSpec's `deterministic_query_states.state`: the two visual states plus the five fault
  // and hot states this pass owns. It is the state the URL declares, `visualMode` is what it means.
  sceneState: 'architecture',
  camera: 'isometric',
  navigation: 'orbit',
  materialState: 'neutral',
  // The lighting pass owns two deterministic emission states; `on` is the shipped look.
  lightState: 'on',
  roof: true,
  walls: true,
  cutaway: false,
  view: 'all',
  rs485: false,
  lorawan: false,
  internet: false,
  labels: true,
  // Architecture state declares `labels: selective`: technical device labels only appear when the
  // capture asks for them explicitly, never as a default leak of the engineering state.
  labelsExplicit: false,
  selection: 'none',
  // `tick` is the ONLY clock a capture sees. When the URL pins it the animation is frozen there, so
  // tick 0 and tick 30 are two reproducible frames of the same packet pool.
  tick: 0,
  tickExplicit: false,
  posterFrame: 0,
  displayFrame: 0,
});

function parseBoolean(value) {
  if (value === '1' || value === 'on') return true;
  if (value === '0' || value === 'off') return false;
  return null;
}

function isEnumValue(key, value) {
  return ENUM_VALUES[key].includes(value);
}

/** Parse the reproducible QA state. Any malformed known token resets the state atomically. */
export function parseQueryState(search = '', warn = console.warn) {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  const candidate = { ...DEFAULT_QUERY_STATE };
  let invalid = false;

  if (params.has('state')) {
    const value = params.get('state');
    const scene = resolveSceneState(value);
    if (!scene) invalid = true;
    else {
      candidate.sceneState = value;
      candidate.visualMode = scene.visualMode;
    }
  }

  for (const [queryKey, stateKey] of [
    ['mode', 'visualMode'],
    ['camera', 'camera'],
    ['nav', 'navigation'],
    ['material_state', 'materialState'],
    ['light_state', 'lightState'],
    ['view', 'view'],
    ['selection', 'selection'],
  ]) {
    if (!params.has(queryKey)) continue;
    const value = params.get(queryKey);
    if (!isEnumValue(queryKey, value)) invalid = true;
    else candidate[stateKey] = value;
  }

  for (const key of BOOLEAN_KEYS) {
    if (!params.has(key)) continue;
    const value = parseBoolean(params.get(key));
    if (value === null) invalid = true;
    else {
      candidate[key] = value;
      if (key === 'labels') candidate.labelsExplicit = true;
    }
  }

  if (params.has('links')) {
    const layers = resolveLinkLayers(params.get('links'));
    if (!layers) invalid = true;
    else Object.assign(candidate, layers);
  }

  if (params.has('tick')) {
    const value = params.get('tick');
    if (!/^\d+$/.test(value)) invalid = true;
    else {
      candidate.tick = Number(value);
      candidate.tickExplicit = true;
    }
  }

  for (const [queryKey, stateKey] of [
    ['poster_frame', 'posterFrame'],
    ['display_frame', 'displayFrame'],
  ]) {
    if (!params.has(queryKey)) continue;
    const value = params.get(queryKey);
    if (value !== '0' && value !== '1') invalid = true;
    else candidate[stateKey] = Number(value);
  }

  if (invalid) {
    warn?.('Invalid application query state; canonical defaults were restored.');
    return { ...DEFAULT_QUERY_STATE };
  }
  return reconcileSceneState(candidate);
}

/**
 * `state` and `mode` describe the same axis at different resolutions. A fault state is always an
 * engineering capture, so it wins over a stale `mode` token; without a fault, `mode` decides and the
 * scene state follows it. The two can never disagree inside a captured URL.
 */
function reconcileSceneState(candidate) {
  const scene = resolveSceneState(candidate.sceneState);
  if (scene?.faultId) {
    candidate.visualMode = scene.visualMode;
    return candidate;
  }
  candidate.sceneState = candidate.visualMode === 'engineering' ? 'engineering' : 'architecture';
  return candidate;
}

/** Serialize in a fixed order so captures and reloads remain byte-stable. */
export function serializeQueryState(state = DEFAULT_QUERY_STATE) {
  const normalized = { ...DEFAULT_QUERY_STATE, ...state };
  const scene = resolveSceneState(normalized.sceneState);
  const sceneState = scene?.faultId
    ? normalized.sceneState
    : (normalized.visualMode === 'engineering' ? 'engineering' : 'architecture');
  const params = new URLSearchParams();
  params.set('mode', scene?.faultId ? 'engineering' : normalized.visualMode);
  params.set('state', sceneState);
  params.set('camera', normalized.camera);
  params.set('nav', normalized.navigation);
  params.set('material_state', normalized.materialState);
  params.set('light_state', normalized.lightState);
  for (const key of ['roof', 'walls', 'cutaway']) params.set(key, normalized[key] ? '1' : '0');
  params.set('view', normalized.view);
  for (const key of ['rs485', 'lorawan', 'internet', 'labels']) params.set(key, normalized[key] ? '1' : '0');
  params.set('selection', normalized.selection);
  params.set('tick', String(normalized.tick));
  params.set('poster_frame', String(normalized.posterFrame === 1 ? 1 : 0));
  params.set('display_frame', String(normalized.displayFrame === 1 ? 1 : 0));
  return params.toString();
}
