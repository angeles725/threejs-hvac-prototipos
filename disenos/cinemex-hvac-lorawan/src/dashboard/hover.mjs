/**
 * Chart hover (correction item D) — pure, deterministic helpers for the unit view's 24 h chart.
 *
 * Everything derives from facts the dashboard already owns: the seeded series (48 samples,
 * 30 min apart, last sample = the live reading) and the sim's own clock (`unit.readingTime`,
 * itself derived from the deterministic tick — never Date.now). There is no calendar date in the
 * model, and the footer already declares the series synthetic, so point times stay HONEST
 * relative labels: "hoy HH:MM" / "ayer HH:MM" stepping 30 minutes back from the reading time.
 *
 * DOM wiring (pointer events, crosshair SVG nodes, tooltip element) lives in dashboard.html;
 * this module owns every decision the wiring makes, so all of it is node-testable.
 */
import { SERIES_POLICY } from './series.mjs';
import { CHART_SCALE } from './render.mjs';

const MINUTES_PER_DAY = 24 * 60;

/** Snap a chart-space x (viewBox units) to the nearest sample index, clamped to the series. */
export function nearestSampleIndex(viewX, width = 900, count = SERIES_POLICY.points) {
  if (!Number.isFinite(viewX) || !Number.isFinite(width) || width <= 0 || !Number.isInteger(count) || count < 2) {
    throw new RangeError('Snapping needs a finite x, a positive width and at least two samples.');
  }
  const raw = Math.round((viewX / width) * (count - 1));
  return Math.min(count - 1, Math.max(0, raw));
}

/**
 * The honest time label of sample `index`: the LAST sample is the live reading at the sim clock,
 * every step back is 30 min. Crossing midnight flips "hoy" to "ayer"; no fake calendar dates.
 */
export function sampleTimeLabel(index, readingTime, {
  points = SERIES_POLICY.points,
  minutesPerPoint = SERIES_POLICY.minutesPerPoint,
} = {}) {
  const parsed = /^(\d{2}):(\d{2})/.exec(String(readingTime ?? ''));
  if (!parsed) return 'N/D';
  const minutesBack = (points - 1 - index) * minutesPerPoint;
  let minutes = Number(parsed[1]) * 60 + Number(parsed[2]) - minutesBack;
  let day = 'hoy';
  if (minutes < 0) {
    minutes += MINUTES_PER_DAY;
    day = 'ayer';
  }
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

/**
 * Everything the crosshair + tooltip need for one snapped sample: chart-space coordinates on the
 * shared 17–33 °C scale, the time/value label, and which side the tooltip must open toward so it
 * never clips at the chart edges (left half opens right, right half opens left).
 */
export function chartHoverModel({
  points,
  index,
  width = 900,
  height = 220,
  readingTime,
  scale = CHART_SCALE,
} = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new RangeError('A hover model needs the sampled series.');
  }
  if (!Number.isInteger(index) || index < 0 || index >= points.length) {
    throw new RangeError('The hover index must address a sample.');
  }
  const value = points[index];
  const x = (index * width) / (points.length - 1);
  const y = height - ((value - scale.min) / (scale.max - scale.min)) * height;
  const timeLabel = sampleTimeLabel(index, readingTime, { points: points.length });
  return Object.freeze({
    index,
    value,
    x,
    y,
    timeLabel,
    align: x > width / 2 ? 'left' : 'right',
    label: `${timeLabel} · ${value.toFixed(1)} °C`,
  });
}
