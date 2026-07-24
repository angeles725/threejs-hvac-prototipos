// VOLT.Sigma — Energy Command Center theme
// Alineada con niagara-casino: cyan electrico + champagne gold, slates tenues.

export const BG = '#070A15';
export const BG_DEEP = '#04060F';
export const SURFACE = 'rgba(12, 16, 33, 0.65)';
export const SURFACE_SOLID = '#0C1021';
export const SURFACE_RAISED = 'rgba(18, 24, 44, 0.75)';
export const BORDER = 'rgba(0, 240, 255, 0.12)';
export const BORDER_STRONG = 'rgba(0, 240, 255, 0.28)';

// Firma cyan (idéntica a casino CYAN)
export const VOLT = '#00F0FF';
export const VOLT_DIM = '#00B8C7';
export const VOLT_GLOW = 'rgba(0, 240, 255, 0.35)';

// Champagne gold (idéntico a casino CASINO_ACCENT)
export const SOLAR = '#d4a26a';
export const SOLAR_DEEP = '#8b6a44';
export const SOLAR_GLOW = 'rgba(212, 162, 106, 0.35)';

// Slate cool accent (secundario frío)
export const PLASMA = '#6D8BFF';

// Semánticos (casino set)
export const OK = '#10B981';
export const WARN = '#eab308';
export const DANGER = '#ef4444';
export const COOL = '#38bdf8';

// Texto (casino set)
export const TEXT = '#F8FAFC';
export const TEXT_DIM = '#94a3b8';
export const TEXT_MUTED = '#64748b';

export const FONTS = {
  display: "'Syncopate', 'Space Grotesk', system-ui, sans-serif",
  body: "'Space Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// Heatmap — baja a alta intensidad (slate verde -> champagne -> rojo)
export const HEAT = ['#0e7c6a', '#10B981', '#a3e635', '#eab308', '#d4a26a', '#ef4444'];

export function heatColor(ratio) {
  const r = Math.max(0, Math.min(0.9999, ratio));
  const idx = Math.floor(r * HEAT.length);
  return HEAT[idx];
}

export function statusTone(value, thresholds) {
  if (value >= thresholds.danger) return { color: DANGER, label: 'CRITICO' };
  if (value >= thresholds.warn) return { color: WARN, label: 'ALTO' };
  return { color: OK, label: 'NORMAL' };
}

export function formatKWh(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1000) return (v / 1000).toFixed(2) + ' MWh';
  return v.toFixed(1) + ' kWh';
}

export function formatKW(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(1) + ' kW';
}

export function formatMoney(v) {
  if (v == null || isNaN(v)) return '—';
  return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
