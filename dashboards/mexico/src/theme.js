/**
 * theme.js — solo lo que NO cambia con el theme.
 * Los colores viven en CSS custom properties (ver src/index.css).
 * El switch dark/light se hace via :root[data-theme="..."].
 */

export var FONTS = {
  display: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  body: "'DM Sans', system-ui, -apple-system, sans-serif",
  mono: "'DM Mono', 'JetBrains Mono', monospace",
};

/**
 * Devuelve el CSS variable name del color de status.
 * Uso: `color: var(${statusVar('alarm')})` → `color: var(--danger)`
 */
export function statusVar(status) {
  if (status === 'operational') return '--success';
  if (status === 'alarm') return '--danger';
  if (status === 'warning') return '--warning';
  return '--offline';
}
