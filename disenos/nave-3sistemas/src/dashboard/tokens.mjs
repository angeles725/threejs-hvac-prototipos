// Visual tokens — the ONE place colour is decided.
//
// These values are not taste. The three system hues were run through the dataviz palette
// validator (`scripts/validate_palette.js --pairs all`) in BOTH modes and pass every check:
// lightness band, chroma floor, CVD separation, normal-vision floor, contrast vs surface.
//
// WHAT THE VALIDATOR CAUGHT (2026-08-13): the first assignment was HVAC=cyan #4AA8E0 and
// AIR=blue #2E90F0. All-pairs check: ΔE 7.9 in NORMAL vision — a hard fail, "hard to tell apart
// even with full colour vision" — and 4.4 under tritanopia, i.e. the two headline systems would
// have been the same colour for a colourblind reader. Adjacent-pairs-only had reported PASS,
// because the two blues were not adjacent in the list. Always run --pairs all.

// ---------------------------------------------------------------------------------------------
// System identity — fixed by ENTITY, never by rank or by series order.
// The same hue is used for a system's KPI accent, its chart series, and its 3D highlight, so a
// colour means one thing everywhere on the page.
// ---------------------------------------------------------------------------------------------
export const SYSTEM_COLOR = Object.freeze({
  air: { dark: '#3987e5', light: '#2a78d6', label: 'Aire comprimido' },
  lighting: { dark: '#c98500', light: '#eda100', label: 'Iluminación' },
  hvac: { dark: '#199e70', light: '#1baf7a', label: 'HVAC' },
});

// ---------------------------------------------------------------------------------------------
// Cooling-load contributors.
//
// DESIGN DECISION, not a workaround: six independent categorical hues could not clear the
// all-pairs CVD floor, and forcing them would have shipped a bar whose segments a colourblind
// reader cannot separate. Instead the segmentation follows the PHYSICS:
//
//   - The two contributors that ARE headline systems keep their system hue, so the stacked bar
//     and the system panels agree on what blue and yellow mean.
//   - Envelope and infiltration are ONE family — both are transfer with the outside, both driven
//     by the same outdoor temperature — so they merge into a single "Exterior" segment. Merging
//     them is physically honest; it is not a concession to the palette.
//   - Occupancy is a neutral, separated by LIGHTNESS, the one channel every form of colour
//     blindness preserves.
//
// Every segment is direct-labelled regardless, so identity is never colour-alone.
// ---------------------------------------------------------------------------------------------
export const CONTRIBUTOR_STYLE = Object.freeze({
  compressors: { dark: '#3987e5', light: '#2a78d6', system: 'air', label: 'Compresores' },
  lighting: { dark: '#c98500', light: '#eda100', system: 'lighting', label: 'Iluminación' },
  exterior: { dark: '#8a8a84', light: '#6f6e69', system: null, label: 'Exterior' },
  people: { dark: '#c3c2b7', light: '#a9a89f', system: null, label: 'Ocupación' },
});

/** Contributors as the stacked bar renders them: physics-merged, largest first. */
export const CONTRIBUTOR_ORDER = Object.freeze(['compressors', 'exterior', 'lighting', 'people']);

// ---------------------------------------------------------------------------------------------
// Status — reserved roles, never reused as a series colour. Each ships with a SHAPE as well,
// so state is never encoded by colour alone.
// ---------------------------------------------------------------------------------------------
export const STATUS = Object.freeze({
  normal: { color: '#0ca30c', shape: 'dot', label: 'Normal' },
  warning: { color: '#fab219', shape: 'triangle', label: 'Aviso' },
  alarm: { color: '#d03b3b', shape: 'circle-filled', label: 'Alarma' },
});

// ---------------------------------------------------------------------------------------------
// Surfaces and ink — continuous with the repo's gobernador-dashboard vocabulary.
// ---------------------------------------------------------------------------------------------
export const SURFACE = Object.freeze({
  canvas: '#070A0F',
  card: '#0F151E',
  card2: '#151C27',
  rule: '#1E2733',
  ink: '#EAF0F7',
  dim: '#8595A8',
  grid: '#2c2c2a',
  baseline: '#383835',
});

export const TYPE = Object.freeze({
  ui: "'IBM Plex Sans', system-ui, sans-serif",
  // Every numeric readout is monospace with tabular figures, so a value never reflows the
  // layout as it changes — a dashboard that twitches while you read it is unreadable.
  mono: "'IBM Plex Mono', ui-monospace, monospace",
});
