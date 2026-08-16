// Query-state controller — URL is the only way the capture harness drives scene states.
// An UNKNOWN value on ANY known key resets the ENTIRE state to defaults (loudly).
// This keeps the gate's URL a first-class code path and prevents silent partial-resets.

const KNOWN_KEYS = new Set([
  'dim', 'exhaust', 'demand', 'tout', 'people',
  'leadmode', 'recovery', 'layers', 'tick', 'view',
  'bayopen',
]);

const LAYER_VALUES = new Set(['roof', 'walls', 'ducts', 'enclosure', 'flow']);

const VALID_ENUM = {
  leadmode: new Set(['fixed', 'vsd']),
  recovery: new Set(['off', 'on']),
  view: new Set(['hero', 'compressor-room', 'compressor-skid', 'exhaust-wall', 'luminaire-grid', 'luminaire-plan', 'ahu-roof', 'duct-run', 'exterior']),
};

export const DEFAULTS = Object.freeze({
  dim: 0,
  exhaust: 85,
  demand: 380,
  tout: 35,
  people: 40,
  leadmode: 'fixed',
  recovery: 'off',
  // Mirrors design-spec.yaml ui_controls.layers.default — see the note there: the earlier
  // ['ducts','flow'] hid the walls and the compressor-room enclosure, making three critical
  // features invisible in their own gate shots.
  layers: Object.freeze(['walls', 'ducts', 'enclosure', 'flow']),
  tick: 0,
  view: 'hero',
  bayopen: 0,
});

function resetAll(key, raw) {
  console.error(
    `[nave-3sistemas] Invalid value "${raw}" for key "${key}" — resetting ALL state to defaults`,
  );
  return { ...DEFAULTS, layers: [...DEFAULTS.layers] };
}

/**
 * Parse window.location.search into validated control state.
 * Unknown key-values are ignored; an invalid value on a KNOWN key resets everything loudly.
 */
export function readQueryState() {
  const params = new URLSearchParams(window.location.search);
  const state = { ...DEFAULTS, layers: [...DEFAULTS.layers] };

  for (const [key, raw] of params.entries()) {
    if (!KNOWN_KEYS.has(key)) continue;

    if (key === 'dim') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 100) return resetAll(key, raw);
      state.dim = v;
    } else if (key === 'exhaust') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 95) return resetAll(key, raw);
      state.exhaust = v;
    } else if (key === 'demand') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 800) return resetAll(key, raw);
      state.demand = v;
    } else if (key === 'tout') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 20 || v > 42) return resetAll(key, raw);
      state.tout = v;
    } else if (key === 'people') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 60) return resetAll(key, raw);
      state.people = v;
    } else if (key === 'leadmode') {
      if (!VALID_ENUM.leadmode.has(raw)) return resetAll(key, raw);
      state.leadmode = raw;
    } else if (key === 'recovery') {
      if (!VALID_ENUM.recovery.has(raw)) return resetAll(key, raw);
      state.recovery = raw;
    } else if (key === 'layers') {
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.some((p) => !LAYER_VALUES.has(p))) return resetAll(key, raw);
      state.layers = parts;
    } else if (key === 'tick') {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 86400) return resetAll(key, raw);
      state.tick = Math.round(v);
    } else if (key === 'view') {
      if (!VALID_ENUM.view.has(raw)) return resetAll(key, raw);
      state.view = raw;
    } else if (key === 'bayopen') {
      const v = Number(raw);
      if (v !== 0 && v !== 1) return resetAll(key, raw);
      state.bayopen = v;
    }
  }

  return state;
}
