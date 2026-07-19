/**
 * Cartelera dashboard renderers — pure HTML/SVG string builders over the derived view model.
 * Light SaaS skin (client restyle 2026-07-15), tokens only; hand-rolled SVG, no libraries,
 * no icons. Anything the operator reads is es-MX; identifiers stay technical.
 *
 * Client simplification (2026-07-15): the fault/alarm scenario machinery is gone. Every unit is
 * live and delivering, so the status vocabulary collapsed to the one healthy pill; the deviation
 * tag stays because a healthy reading can legitimately leave the comfort band.
 */
import { buildEmbedUrl, buildViewerUrl } from './model.mjs';
import { createUnitSeries } from './series.mjs';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

/** The one status pill left: live delivery is the healthy simulation's only state. */
export const LIVE_PILL = Object.freeze({ className: 'pill pill-vivo', text: 'EN VIVO' });

/**
 * Correction item H — deviation vs consigna at a glance: a compact signed tag ("+1.2°"), marked
 * `fuera` when the reading leaves the ±COMFORT_TOLERANCE_C band the model derived. KEPT after
 * the simplification: the healthy series wanders past the band on its own.
 */
export function deviationTagFor(unit) {
  const delta = unit.temperature - unit.setpoint;
  const fuera = unit.temperature < unit.band[0] || unit.temperature > unit.band[1];
  return {
    className: fuera ? 'desvio fuera' : 'desvio',
    text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°`,
  };
}

export const CHART_SCALE = Object.freeze({ min: 17, max: 33 });
const yOf = (value, height) => height - ((value - CHART_SCALE.min) / (CHART_SCALE.max - CHART_SCALE.min)) * height;

function polylineOf(points, width, height) {
  return points
    .map((value, index) => `${((index * width) / (points.length - 1)).toFixed(1)},${yOf(value, height).toFixed(1)}`)
    .join(' ');
}

/**
 * Graft (a), from study-c: the compact 24 h sparkline per cartelera row. Subordinate by
 * construction — dim stroke, no axes, no dot; a flat line IS the healthy read.
 *
 * `hoverData` (viewer full-page round, default OFF): the half-hour points and their unit ride
 * data attributes so the viewer's ONE delegated pointer handler can serve the Tendencias grid.
 * The cartelera never asks for it — its fleet sparklines stay static, byte-identical.
 */
export function sparklineSvg(unit, { width = 120, height = 26, hoverData = false } = {}) {
  const points = createUnitSeries(unit.seriesIndex, {
    setpoint: unit.setpoint,
    temperature: unit.temperature,
  });
  const hoverAttrs = hoverData
    ? ` data-points="${points.map((value) => Number(value.toFixed(2))).join(',')}" data-unit="°C"`
    : '';
  return `<svg class="chispa" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"${hoverAttrs} aria-hidden="true">`
    + `<rect x="0" y="${yOf(unit.band[1], height).toFixed(1)}" width="${width}"`
    + ` height="${(yOf(unit.band[0], height) - yOf(unit.band[1], height)).toFixed(1)}" fill="var(--accent-soft)" opacity="0.55"/>`
    + `<polyline points="${polylineOf(points, width, height)}" fill="none" stroke="var(--dim)"`
    + ' stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>';
}

/** The unit view's 24 h chart: consigna band + gridlines + the live series. Hand-rolled SVG. */
export function chartSvg(unit, { width = 900, height = 220 } = {}) {
  const points = createUnitSeries(unit.seriesIndex, {
    setpoint: unit.setpoint,
    temperature: unit.temperature,
  });
  let grid = '';
  for (let index = 0; index <= 4; index += 1) {
    const x = (index * width) / 4;
    grid += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="var(--rule)" stroke-width="0.5"/>`;
  }
  for (let value = 18; value <= 32; value += 4) {
    const y = yOf(value, height).toFixed(1);
    grid += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="var(--rule)" stroke-width="0.5"/>`
      + `<text x="4" y="${(Number(y) - 4).toFixed(1)}">${value} °C</text>`;
  }
  return grid
    + `<rect x="0" y="${yOf(unit.band[1], height).toFixed(1)}" width="${width}"`
    + ` height="${(yOf(unit.band[0], height) - yOf(unit.band[1], height)).toFixed(1)}" fill="var(--accent-soft)" opacity="0.7"/>`
    + `<text x="${width - 6}" y="${(yOf(unit.band[1], height) - 5).toFixed(1)}" text-anchor="end">`
    + `consigna ${unit.band[0].toFixed(1)} a ${unit.band[1].toFixed(1)} °C</text>`
    + `<polyline points="${polylineOf(points, width, height)}" fill="none" stroke="var(--ink)"`
    + ' stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
    + `<circle cx="${width}" cy="${yOf(unit.temperature, height).toFixed(1)}" r="4" fill="var(--ink)"/>`;
}

/**
 * One cartelera slot. Value + state dominate; the sparkline stays a quiet strip beside them.
 * Item H: every slot declares its deviation vs consigna; the state pill is the one live state.
 */
export function slotHtml(unit) {
  const deviation = deviationTagFor(unit);
  const number = unit.salaNumber !== null
    ? `${String(unit.salaNumber).padStart(2, '0')}<i>${unit.familyTag}</i>`
    : '··';
  return `<button type="button" class="slot" data-unidad="${unit.unitId}"`
    + ` aria-label="Ver unidad ${unit.unitId}, ${escapeHtml(unit.zoneLabel)}">`
    + `<span class="num">${number}</span>`
    + `<span class="zona">${escapeHtml(unit.zoneLabel)}`
    + `<span class="sub">${unit.unitId} · ${unit.tc300Id} · bus ${unit.bus}</span></span>`
    + sparklineSvg(unit)
    + `<span class="temp">${unit.temperature.toFixed(1)} °C`
    + `<span class="${deviation.className}">${deviation.text} vs consigna</span></span>`
    + `<span class="${LIVE_PILL.className}">OK</span></button>`;
}

export function boardHtml(model) {
  return model.boardUnits.map(slotHtml).join('');
}

export function rollupHtml(model) {
  const { rollup } = model;
  return `<span>Flota: <b>${rollup.total} unidades</b></span>`
    + `<span>Entrega Niagara: <b>${rollup.total}/${rollup.total}</b></span>`
    + `<span class="estado-sistema">${escapeHtml(rollup.statusText)}</span>`;
}

/** The band visualization scale (fixed 17–33 °C, shared with the charts). */
export function bandGeometry(unit) {
  const pct = (value) => (((value - CHART_SCALE.min) / (CHART_SCALE.max - CHART_SCALE.min)) * 100);
  return {
    bandLeft: pct(unit.band[0]).toFixed(1),
    bandWidth: (pct(unit.band[1]) - pct(unit.band[0])).toFixed(1),
    needleLeft: Math.min(100, Math.max(0, pct(unit.temperature))).toFixed(1),
  };
}

/**
 * The unit view. Correction round: the delivery-chain panel is gone (item F); a "Ver en el visor
 * 3D" action joins the head (item C); the twin itself is embedded via the EMBED viewer URL
 * (item E). `viewerHref`/`embedSrc` arrive from the caller so the render stays pure — the
 * defaults derive from the unit alone, keeping the builder total. The `fuera` accents follow the
 * comfort band, the only out-of-range fact the healthy model still produces.
 */
export function unitViewHtml(unit, { viewerHref = null, embedSrc = null } = {}) {
  const fuera = unit.temperature < unit.band[0] || unit.temperature > unit.band[1];
  const geometry = bandGeometry(unit);
  const delta = unit.temperature - unit.setpoint;
  const visorHref = viewerHref ?? buildViewerUrl({ unitId: unit.unitId });
  const gemeloSrc = embedSrc ?? buildEmbedUrl({ unitId: unit.unitId });
  return `
  <div class="funcion-head">
    <span class="num">${unit.salaNumber !== null ? String(unit.salaNumber).padStart(2, '0') : '··'}</span>
    <h2 class="cond">${escapeHtml(unit.zoneLabel)}</h2>
    <span class="ids">${unit.unitId} · ${unit.tc300Id} · bus RS-485 ${unit.bus}</span>
    <a class="visor-action cond" href="${escapeHtml(visorHref)}">Ver en el visor 3D</a>
  </div>
  <div class="paneles">
    <section class="panel">
      <h3 class="cond">Temperatura vs consigna</h3>
      <div class="granvalor${fuera ? ' fuera' : ''}">${unit.temperature.toFixed(1)} <span class="u">°C</span></div>
      <div class="banda-viz" aria-hidden="true">
        <div class="zonaok" style="left:${geometry.bandLeft}%;width:${geometry.bandWidth}%"></div>
        <div class="aguja${fuera ? ' fuera' : ''}" style="left:${geometry.needleLeft}%"></div>
      </div>
      <div class="banda">consigna ${unit.band[0].toFixed(1)} a ${unit.band[1].toFixed(1)} °C · ${
  fuera ? `desvío ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} °C` : 'dentro de banda'}</div>
      <dl class="kv">
        <div><dt>Entrega Niagara</dt><dd>normal · dato de las ${unit.readingTime}</dd></div>
        <div><dt>Sensor</dt><dd>${unit.tc300Id}</dd></div>
        <div><dt>Bus de campo</dt><dd>RS-485 ${unit.bus} · UC100-${unit.bus}</dd></div>
      </dl>
    </section>
    <section class="panel">
      <h3 class="cond">Tendencia 24 h <span class="${LIVE_PILL.className}">${LIVE_PILL.text}</span></h3>
      <div class="grafica">
        <svg viewBox="0 0 900 220" width="100%" role="img" preserveAspectRatio="none"
             aria-label="Tendencia de temperatura de las últimas 24 horas">${chartSvg(unit)}</svg>
      </div>
    </section>
    <section class="panel panel-gemelo">
      <h3 class="cond">Unidad en el gemelo 3D <span class="ids">${unit.unitId}</span></h3>
      <div class="gemelo">
        <iframe src="${escapeHtml(gemeloSrc)}" loading="lazy"
                title="Unidad ${unit.unitId} en el visor 3D"></iframe>
      </div>
      <a class="abrir-visor" href="${escapeHtml(visorHref)}">Abrir en el visor 3D →</a>
    </section>
  </div>`;
}
