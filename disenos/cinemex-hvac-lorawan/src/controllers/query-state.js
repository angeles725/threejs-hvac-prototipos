import {
  INTERACTION_LINK_VALUES,
  INTERACTION_SELECTION_VALUES,
  INTERACTION_STATE_VALUES,
  resolveLinkLayers,
  resolveSceneState,
} from '../scene/interaction.js';

const BOOLEAN_KEYS = Object.freeze(['roof', 'walls', 'rs485', 'lorawan', 'internet', 'embed']);
// Single-view correction (2026-07-18): `camera` is NOT in this contract anymore. The client
// ships exactly ONE fixed view, so a `?camera=...` token is an unknown parameter like any other
// stranger — ignored, never applied, never a reason for the atomic reset. The camera presets
// themselves live on in src/controllers/camera.js as a module-level concern (QA hooks, evidence
// framing, the embed close-up), out of the product's URL surface.
// Limpieza fase 2 (2026-07-18): `mode` and `cutaway` are NOT in this contract anymore. The
// product ships the single architectural mode with no cutaway, so those tokens are unknown
// parameters like any other stranger — ignored, never applied, never a reason for the atomic
// reset. `state` survives as the deterministic interaction-state token.
const ENUM_VALUES = Object.freeze({
  material_state: ['neutral'],
  view: ['all', 'architecture', 'hvac'],
  state: INTERACTION_STATE_VALUES,
  selection: INTERACTION_SELECTION_VALUES,
  links: INTERACTION_LINK_VALUES,
});

export const DEFAULT_QUERY_STATE = Object.freeze({
  visualMode: 'architectural',
  // The DesignSpec's `deterministic_query_states.state`: the two visual states. It is the state
  // the URL declares, `visualMode` is what it means.
  sceneState: 'architecture',
  // Single-view correction (2026-07-18): the scene has exactly ONE view — the whole-building
  // `network` preset — pinned here as a constant so the boot pipeline keeps one source of
  // truth. No URL token can change it and no UI names it; a single view needs no label.
  camera: 'network',
  materialState: 'neutral',
  roof: true,
  walls: true,
  view: 'all',
  rs485: false,
  lorawan: false,
  internet: false,
  selection: 'none',
  // `tick` is the ONLY clock a capture sees. When the URL pins it the animation is frozen there, so
  // tick 0 and tick 30 are two reproducible frames of the same packet pool.
  tick: 0,
  tickExplicit: false,
  posterFrame: 0,
  displayFrame: 0,
  // EMBED mode (correction item E): the cartelera's unit page hosts this same viewer in an
  // iframe — bare canvas, no chrome, camera framed on the selected unit. One source of truth.
  embed: false,
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
    ['material_state', 'materialState'],
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
    else candidate[key] = value;
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
  return candidate;
}

/** Serialize in a fixed order so captures and reloads remain byte-stable. */
export function serializeQueryState(state = DEFAULT_QUERY_STATE) {
  const normalized = { ...DEFAULT_QUERY_STATE, ...state };
  const sceneState = normalized.visualMode === 'engineering' ? 'engineering' : 'architecture';
  const params = new URLSearchParams();
  params.set('state', sceneState);
  // Single-view correction (2026-07-18): the URL never names a camera — the view is pinned.
  // Limpieza fase 2 (2026-07-18): `nav` left the contract with first-person navigation.
  params.set('material_state', normalized.materialState);
  for (const key of ['roof', 'walls']) params.set(key, normalized[key] ? '1' : '0');
  params.set('view', normalized.view);
  for (const key of ['rs485', 'lorawan', 'internet']) params.set(key, normalized[key] ? '1' : '0');
  params.set('selection', normalized.selection);
  params.set('tick', String(normalized.tick));
  params.set('poster_frame', String(normalized.posterFrame === 1 ? 1 : 0));
  params.set('display_frame', String(normalized.displayFrame === 1 ? 1 : 0));
  // The embed flag is appended ONLY when set, so every gated capture URL stays byte-identical.
  if (normalized.embed) params.set('embed', '1');
  return params.toString();
}
