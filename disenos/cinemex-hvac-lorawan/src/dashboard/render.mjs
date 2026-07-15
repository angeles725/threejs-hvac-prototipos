/**
 * Cartelera dashboard renderers — pure HTML/SVG string builders over the derived view model.
 * B15 Dark Scientific Terminal, tokens only; hand-rolled SVG, no libraries, no icons.
 * Anything the operator reads is es-MX; identifiers stay technical.
 */
import { createUnitSeries } from './series.mjs';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

/** STATUS pill (mandatory per B15): delivery truth per unit. */
export function pillFor(unit) {
  return unit.delivered
    ? { className: 'pill pill-vivo', text: 'EN VIVO' }
    : { className: 'pill pill-detenido', text: 'DETENIDO' };
}

const CHART_SCALE = Object.freeze({ min: 17, max: 33 });
const yOf = (value, height) => height - ((value - CHART_SCALE.min) / (CHART_SCALE.max - CHART_SCALE.min)) * height;

function polylineOf(points, width, height) {
  return points
    .map((value, index) => `${((index * width) / (points.length - 1)).toFixed(1)},${yOf(value, height).toFixed(1)}`)
    .join(' ');
}

/**
 * Graft (a), from study-c: the compact 24 h sparkline per cartelera row. Subordinate by
 * construction — dim stroke, no axes, no dot; a flat line IS the healthy read. `tone` switches
 * the strokes to canvas ink inside a reverse-video alarm row (dim fails contrast on alarm red).
 */
export function sparklineSvg(unit, { width = 120, height = 26, tone = 'normal' } = {}) {
  const points = createUnitSeries(unit.seriesIndex, {
    setpoint: unit.setpoint,
    temperature: unit.temperature,
    alarm: unit.alarm,
  });
  const stroke = tone === 'inverse' ? 'var(--canvas)' : 'var(--dim)';
  const band = tone === 'inverse' ? 'rgba(14,17,22,0.28)' : 'var(--rule)';
  return `<svg class="chispa" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">`
    + `<rect x="0" y="${yOf(unit.band[1], height).toFixed(1)}" width="${width}"`
    + ` height="${(yOf(unit.band[0], height) - yOf(unit.band[1], height)).toFixed(1)}" fill="${band}" opacity="0.55"/>`
    + `<polyline points="${polylineOf(points, width, height)}" fill="none" stroke="${stroke}"`
    + ' stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>';
}

/** The unit view's 24 h chart: consigna band + gridlines + the live series. Hand-rolled SVG. */
export function chartSvg(unit, { width = 900, height = 220 } = {}) {
  const points = createUnitSeries(unit.seriesIndex, {
    setpoint: unit.setpoint,
    temperature: unit.temperature,
    alarm: unit.alarm,
  });
  const stroke = unit.alarm ? 'var(--alarma)' : 'var(--ink)';
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
    + ` height="${(yOf(unit.band[0], height) - yOf(unit.band[1], height)).toFixed(1)}" fill="var(--rule)" opacity="0.55"/>`
    + `<text x="${width - 6}" y="${(yOf(unit.band[1], height) - 5).toFixed(1)}" text-anchor="end">`
    + `consigna ${unit.band[0].toFixed(1)} a ${unit.band[1].toFixed(1)} °C</text>`
    + `<polyline points="${polylineOf(points, width, height)}" fill="none" stroke="${stroke}"`
    + ' stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
    + `<circle cx="${width}" cy="${yOf(unit.temperature, height).toFixed(1)}" r="4" fill="${stroke}"/>`;
}

/** One cartelera slot. Value + state dominate; the sparkline stays a quiet strip beside them. */
export function slotHtml(unit) {
  const inverse = unit.alarm;
  const pill = unit.alarm
    ? '<span class="pill pill-alarma">Alarma</span>'
    : `<span class="${pillFor(unit).className}">${pillFor(unit).text}</span>`;
  const number = unit.salaNumber !== null
    ? `${String(unit.salaNumber).padStart(2, '0')}<i>${unit.familyTag}</i>`
    : '··';
  return `<button type="button" class="slot${inverse ? ' en-alarma' : ''}" data-unidad="${unit.unitId}"`
    + ` aria-label="Ver unidad ${unit.unitId}, ${escapeHtml(unit.zoneLabel)}">`
    + `<span class="num">${number}</span>`
    + `<span class="zona">${escapeHtml(unit.zoneLabel)}`
    + `<span class="sub">${unit.unitId} · ${unit.tc300Id} · bus ${unit.bus}</span></span>`
    + sparklineSvg(unit, { tone: inverse ? 'inverse' : 'normal' })
    + `<span class="temp">${unit.temperature.toFixed(1)} °C</span>${pill}</button>`;
}

export function boardHtml(model) {
  return model.boardUnits.map(slotHtml).join('');
}

/**
 * Graft (b), from study-b: the persistent alarm banner — reverse video, no glow, no pulse —
 * present on EVERY view, with the unambiguous operator action "VER UNIDAD".
 */
export function bannerHtml(model) {
  if (model.alarms.length === 0) return '';
  const first = model.alarms[0];
  const more = model.alarms.length > 1 ? ` · +${model.alarms.length - 1} evento(s) más` : '';
  return '<span class="cond">Alarma activa</span>'
    + `<span>${escapeHtml(first.zoneLabel)} · ${first.unitId} · ${escapeHtml(first.message)}${more}</span>`
    + `<button type="button" class="cta cond" data-unidad="${first.unitId}">Ver unidad</button>`;
}

export function rollupHtml(model) {
  const { rollup } = model;
  const alarma = rollup.alarma > 0
    ? `<span class="r-alarma">Alarma: <b>${rollup.alarma}</b></span>`
    : '<span>Alarma: <b>0</b></span>';
  return `<span>Flota: <b>${rollup.total} unidades</b></span>`
    + `<span>Normal: <b>${rollup.normal}</b></span>${alarma}`
    + `<span>Entrega Niagara: <b>${rollup.entregando}/${rollup.total}</b></span>`
    + `<span class="estado-sistema">${escapeHtml(rollup.statusText)}</span>`;
}

/** The instrument line: the unit's canonical chain with per-hop state, value and freshness. */
export function chainHtml(unit) {
  return unit.chain.map((hop) => (
    `<div class="nodo nodo-${hop.estado}">`
    + '<div class="punto"></div>'
    + `<div class="nombre">${escapeHtml(hop.label)}</div>`
    + `<div class="medio">${escapeHtml(hop.medio)}</div>`
    + `<div class="valor">${escapeHtml(hop.valor)}</div>`
    + `<div class="hop-estado">${hop.estado === 'ok' ? 'OK' : hop.estado === 'falla' ? 'FALLA' : 'SIN DATO'}</div>`
    + '</div>'
  )).join('');
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

export function unitViewHtml(unit) {
  const fuera = unit.temperature < unit.band[0] || unit.temperature > unit.band[1];
  const geometry = bandGeometry(unit);
  const pill = pillFor(unit);
  const delta = unit.temperature - unit.setpoint;
  return `
  <div class="funcion-head">
    <span class="num">${unit.salaNumber !== null ? String(unit.salaNumber).padStart(2, '0') : '··'}</span>
    <h2 class="cond">${escapeHtml(unit.zoneLabel)}</h2>
    <span class="ids">${unit.unitId} · ${unit.tc300Id} · bus RS-485 ${unit.bus}</span>
  </div>
  <div class="paneles">
    <section class="panel">
      <h3 class="cond">Temperatura vs consigna</h3>
      <div class="granvalor${unit.alarm ? ' fuera' : ''}">${unit.temperature.toFixed(1)} <span class="u">°C</span></div>
      <div class="banda-viz" aria-hidden="true">
        <div class="zonaok" style="left:${geometry.bandLeft}%;width:${geometry.bandWidth}%"></div>
        <div class="aguja${unit.alarm ? ' fuera' : ''}" style="left:${geometry.needleLeft}%"></div>
      </div>
      <div class="banda">consigna ${unit.band[0].toFixed(1)} a ${unit.band[1].toFixed(1)} °C · ${
  fuera ? `desvío ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} °C` : 'dentro de banda'}</div>
      <dl class="kv">
        <div><dt>Estado</dt><dd>${unit.alarm ? 'ALARMA' : 'NORMAL'}</dd></div>
        <div><dt>Entrega Niagara</dt><dd>${unit.delivered ? `normal · dato de las ${unit.readingTime}` : 'detenida'}</dd></div>
        <div><dt>Sensor</dt><dd>${unit.tc300Id}</dd></div>
        <div><dt>Bus de campo</dt><dd>RS-485 ${unit.bus} · UC100-${unit.bus}</dd></div>
      </dl>
    </section>
    <section class="panel">
      <h3 class="cond">Tendencia 24 h <span class="${pill.className}">${pill.text}</span></h3>
      <svg viewBox="0 0 900 220" width="100%" role="img" preserveAspectRatio="none"
           aria-label="Tendencia de temperatura de las últimas 24 horas">${chartSvg(unit)}</svg>
    </section>
    <section class="panel panel-cadena">
      <h3 class="cond">Cadena de entrega · sensor a Niagara <span class="${pill.className}">${pill.text}</span></h3>
      <div class="cadena">${chainHtml(unit)}</div>
      <p class="veredicto veredicto-${unit.verdict.kind}">${escapeHtml(unit.verdict.text)}</p>
    </section>
  </div>`;
}
