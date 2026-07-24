/**
 * CursorParityPlugin — sync vertical cursor line between Chart.js charts
 *                       of the same detail view.
 *
 * Public API: window.MX60.CursorParity = {
 *   setActiveT(t, viewId),
 *   getActiveT(viewId) -> timestamp|null,
 *   subscribe(chart, viewId, getRangeFn) -> unsubscribe,
 *   attachToChart(chart, viewId, getRangeFn) -> unsubscribe
 * }
 *
 * Activation criteria (D4): the vertical line is drawn ONLY when every
 * subscribed chart for the same viewId reports the same `range` (via
 * getRangeFn()). If ranges diverge across charts of the same view, the
 * overlay clears — semantically the cursor's timestamp would be ambiguous.
 *
 * Performance (R2): each chart owns an independent overlay <canvas>
 * positioned absolute on top of the chart canvas. We never call
 * `chart.update()`. Redraws use a per-view throttle (~16ms / 60fps).
 *
 * ES5 strict: var, function, no arrow, no template literals, no const/let.
 * Convention: `chihuahua-ux` frontend uses ES5 for Niagara compatibility.
 */
(function (global) {
  'use strict';

  var MX60 = global.MX60 = global.MX60 || {};
  if (MX60.CursorParity) return;  // idempotent — script may load twice in dev

  // ---------------------------------------------------------------------
  // Theme — crosshair stroke colour (CP3 follow-up)
  // ---------------------------------------------------------------------
  // The vertical cursor line was hardcoded white (rgba(255,255,255,0.55)) —
  // invisible on the light-theme chart surface. Themed via a module-level var,
  // primed at load and swapped by a ThemeStore subscription. NEVER call
  // getTheme() inside _drawVerticalLine — it runs on every throttled cursor move.
  function _cursorStrokeFor(theme) {
    return (theme === 'light')
      ? 'rgba(0, 0, 0, 0.7)'
      : 'rgba(255, 255, 255, 0.55)';
  }
  // Prime from the DOM attribute (set by the FOUC inline script before any
  // module loads) — NOT from ThemeStore.getTheme(). getTheme() returns its
  // 'dark' default until DashboardApp later calls ThemeStore.init(), and
  // init() seeds _theme without notifying subscribers — so a getTheme()-primed
  // value would stay stale (white) until the first manual theme toggle.
  var _cursorStroke = _cursorStrokeFor(
    document.documentElement.getAttribute('data-theme') === 'light'
      ? 'light'
      : 'dark'
  );
  if (MX60.ThemeStore && typeof MX60.ThemeStore.subscribe === 'function') {
    // Singleton plugin — lives for the page lifetime, so this subscription is
    // intentionally permanent (no destroy() to leak from). The next cursor move
    // after a theme toggle picks up the new colour; no forced redraw needed.
    MX60.ThemeStore.subscribe(function (theme) {
      _cursorStroke = _cursorStrokeFor(theme);
    });
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  // activeTByView: { viewId: timestamp|null }
  var activeTByView = {};

  // SDD mx60-detail-charts-parity WU10 (Path A fix): track which chart is
  // currently hovered per viewId. The vertical line is drawn ONLY on that
  // chart (not on the others of the same view, regardless of their range).
  // This replaces the previous "sync across charts" behavior — operator
  // feedback prefers the line localized to the chart under the cursor.
  // activeChartByView: { viewId: Chart instance | undefined }
  var activeChartByView = {};

  // subscribers: [{ chart, viewId, getRange, overlayCanvas, throttleHandle, resizeListener }]
  var subscribers = [];

  // Throttle frame (~60fps). Per-view to avoid one view starving another.
  var pendingDrawByView = {};

  // ---------------------------------------------------------------------
  // Overlay canvas — independent of Chart.js render cycle
  // ---------------------------------------------------------------------

  function _createOverlayCanvas(chart) {
    var chartCanvas = chart.canvas;
    if (!chartCanvas || !chartCanvas.parentElement) return null;

    var overlay = document.createElement('canvas');
    overlay.setAttribute('data-cursor-overlay', '1');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';
    // left/top set by _syncOverlaySize from chartCanvas.offsetLeft/Top so the
    // overlay tracks the canvas even when the parent wrap has padding (e.g.
    // .carc-trends-canvas-wrap, .dt-trends-canvas-wrap). Assuming (0,0) here
    // caused the crosshair to render shifted by the parent's padding.

    // The chart's parent is the canvas-wrap container (which is itself
    // position: relative in MX60 detail views). Append overlay there so it
    // sits on top of the chart canvas.
    var parent = chartCanvas.parentElement;
    if (parent.style.position !== 'absolute' && parent.style.position !== 'relative') {
      // Fail-safe: ensure overlay can position relative to the parent.
      parent.style.position = 'relative';
    }
    parent.appendChild(overlay);

    _syncOverlaySize(overlay, chartCanvas);
    return overlay;
  }

  function _syncOverlaySize(overlay, chartCanvas) {
    var rect = chartCanvas.getBoundingClientRect();
    // Use CSS size; canvas backing buffer uses devicePixelRatio for crispness.
    var dpr = global.devicePixelRatio || 1;
    // Align overlay origin with the chart canvas — parent may have padding
    // (e.g. Carcamo/Datalogger wraps use padding: 12px 16px), which would
    // otherwise shift the overlay left/up relative to the chart.
    overlay.style.left   = chartCanvas.offsetLeft + 'px';
    overlay.style.top    = chartCanvas.offsetTop  + 'px';
    overlay.style.width  = rect.width  + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.width  = Math.max(1, Math.floor(rect.width  * dpr));
    overlay.height = Math.max(1, Math.floor(rect.height * dpr));
    var ctx = overlay.getContext('2d');
    if (ctx) {
      // Reset transform then scale so we draw in CSS pixels.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  function _clearOverlay(overlay) {
    if (!overlay) return;
    var ctx = overlay.getContext('2d');
    if (!ctx) return;
    // Clear at backing-buffer scale, then restore CSS scale.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // Draw — vertical line at timestamp, gated by D4 activation criteria
  // ---------------------------------------------------------------------

  function _allRangesMatch(viewId) {
    var ranges = [];
    for (var i = 0; i < subscribers.length; i++) {
      if (subscribers[i].viewId === viewId) {
        ranges.push(subscribers[i].getRange());
      }
    }
    if (ranges.length <= 1) return true;  // single chart trivially matches itself
    var first = ranges[0];
    for (var j = 1; j < ranges.length; j++) {
      if (ranges[j] !== first) return false;
    }
    return true;
  }

  function _drawVerticalLine(entry, t) {
    var overlay = entry.overlayCanvas;
    if (!overlay) return;

    if (t === null || t === undefined) {
      _clearOverlay(overlay);
      return;
    }

    // SDD WU10 fix (Path A): only draw on the chart currently under the
    // cursor for this viewId. Other charts of the same view stay cleared
    // even if they share the timestamp. This is the operator-confirmed
    // behavior — vertical line localized, not synced across charts.
    var hovered = activeChartByView[entry.viewId];
    if (hovered && entry.chart !== hovered) {
      _clearOverlay(overlay);
      return;
    }

    var chart = entry.chart;
    if (!chart || !chart.scales || !chart.scales.x || !chart.chartArea) {
      _clearOverlay(overlay);
      return;
    }

    var xScale = chart.scales.x;
    var x;
    // Category-axis charts (MX60 uses HH:mm labels) need getPixelForValue with
    // the timestamp's index, not the timestamp itself. Try getValueForPixel
    // inverse via labels lookup; fallback to getPixelForValue(t).
    if (xScale.getPixelForValue) {
      x = xScale.getPixelForValue(t);
    }
    if (typeof x !== 'number' || isNaN(x)) {
      _clearOverlay(overlay);
      return;
    }

    var area = chart.chartArea;
    if (x < area.left || x > area.right) {
      _clearOverlay(overlay);
      return;
    }

    var ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Re-sync size if the chart resized since last draw (covers responsive resize).
    _syncOverlaySize(overlay, chart.canvas);

    _clearOverlay(overlay);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.strokeStyle = _cursorStroke;
    ctx.lineWidth = 1;
    // Dashed pattern matches the dashed legends elsewhere in MX60 detail views
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  function _redrawView(viewId) {
    var t = activeTByView.hasOwnProperty(viewId) ? activeTByView[viewId] : null;
    for (var i = 0; i < subscribers.length; i++) {
      if (subscribers[i].viewId === viewId) {
        _drawVerticalLine(subscribers[i], t);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  function setActiveT(t, viewId) {
    if (!viewId) return;
    activeTByView[viewId] = (t === undefined ? null : t);

    // Throttle: coalesce multiple setActiveT calls within one animation frame.
    if (pendingDrawByView[viewId]) return;
    pendingDrawByView[viewId] = true;

    var raf = global.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    raf(function () {
      pendingDrawByView[viewId] = false;
      _redrawView(viewId);
    });
  }

  function getActiveT(viewId) {
    if (!viewId) return null;
    return activeTByView.hasOwnProperty(viewId) ? activeTByView[viewId] : null;
  }

  function subscribe(chart, viewId, getRangeFn) {
    if (!chart || !chart.canvas || typeof getRangeFn !== 'function') {
      return function () {};  // noop unsubscribe
    }
    var overlay = _createOverlayCanvas(chart);

    var resizeHandler = function () {
      if (overlay && chart.canvas) _syncOverlaySize(overlay, chart.canvas);
      // After resize, redraw if there is an active timestamp for this view.
      var t = getActiveT(viewId);
      if (t !== null) _redrawView(viewId);
    };
    global.addEventListener('resize', resizeHandler);

    var entry = {
      chart: chart,
      viewId: viewId,
      getRange: getRangeFn,
      overlayCanvas: overlay,
      resizeListener: resizeHandler
    };
    subscribers.push(entry);

    return function unsubscribe() {
      // Remove from subscribers
      for (var i = subscribers.length - 1; i >= 0; i--) {
        if (subscribers[i] === entry) {
          subscribers.splice(i, 1);
          break;
        }
      }
      // Remove resize listener
      try { global.removeEventListener('resize', resizeHandler); } catch (e) {}
      // Remove overlay DOM
      if (overlay && overlay.parentElement) {
        try { overlay.parentElement.removeChild(overlay); } catch (e) {}
      }
    };
  }

  function attachToChart(chart, viewId, getRangeFn) {
    var unsub = subscribe(chart, viewId, getRangeFn);
    if (!chart || !chart.canvas) return unsub;

    var canvas = chart.canvas;

    var onMove = function (event) {
      // Compute the x in CSS pixels relative to the chart canvas.
      var rect = canvas.getBoundingClientRect();
      var xPx = event.clientX - rect.left;

      if (!chart.scales || !chart.scales.x) return;
      var xScale = chart.scales.x;

      var t = null;
      if (xScale.getValueForPixel) {
        t = xScale.getValueForPixel(xPx);
      }
      if (t === undefined || t === null || (typeof t === 'number' && isNaN(t))) {
        t = null;
      }
      // SDD WU10 fix (Path A): mark this chart as the active hovered chart
      // for the view BEFORE dispatching setActiveT, so _drawVerticalLine
      // knows which subscriber owns the line on this redraw cycle.
      activeChartByView[viewId] = chart;
      setActiveT(t, viewId);
    };

    var onLeave = function () {
      // Clearing activeChartByView before setActiveT(null) makes every
      // subscriber of this view clear its overlay on the next redraw.
      delete activeChartByView[viewId];
      setActiveT(null, viewId);
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    return function unsubscribeFull() {
      try { canvas.removeEventListener('mousemove', onMove); } catch (e) {}
      try { canvas.removeEventListener('mouseleave', onLeave); } catch (e) {}
      unsub();
    };
  }

  MX60.CursorParity = {
    setActiveT: setActiveT,
    getActiveT: getActiveT,
    subscribe: subscribe,
    attachToChart: attachToChart
  };
})(window);
