/**
 * MX60.ChartTheme — CP3 canvas theming
 *
 * Centralises Chart.js chrome options so UpDetail, CarcamoDetail and
 * DataloggerDetail no longer maintain independent copies of the same
 * colour literals.
 *
 * chrome(theme)         → flat options object { tooltip, scales:{x,y,y1} }
 * updateChart(chart, t) → splices chrome in-place + chart.update('none')
 *
 * ES5 STRICT — var only, no arrow functions, no template literals.
 * HistoryVocabulary script-tag precedent; loaded before all detail modules.
 */
(function (window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  // ---------------------------------------------------------------------------
  // Colour palettes
  // ---------------------------------------------------------------------------
  var _DARK = {
    tooltipBg:       'rgba(12,16,33,0.92)',
    tooltipTitle:    '#e2e8f0',
    tooltipBody:     '#94a3b8',
    tooltipBorder:   'rgba(0,240,255,0.2)',
    ticks:           '#64748b',
    grid:            'rgba(255,255,255,0.04)',
    border:          'rgba(255,255,255,0.08)'
  };

  var _LIGHT = {
    tooltipBg:       'rgba(255,255,255,0.95)',
    tooltipTitle:    '#1a202c',
    tooltipBody:     '#3f4a5c',
    tooltipBorder:   'rgba(15,23,42,0.12)',
    ticks:           '#475569',
    // grid/border bumped from 0.06/0.10 — at 6% the divider lines were
    // indistinguishable on the light chart surface (smoke-test feedback).
    grid:            'rgba(15,23,42,0.12)',
    border:          'rgba(15,23,42,0.22)'
  };

  // ---------------------------------------------------------------------------
  // chrome(theme) — returns flat Chart.js chrome sub-tree
  // ---------------------------------------------------------------------------
  function chrome(theme) {
    var c = (theme === 'light') ? _LIGHT : _DARK;
    return {
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor:      c.tooltipTitle,
        bodyColor:       c.tooltipBody,
        borderColor:     c.tooltipBorder,
        borderWidth:     1,
        titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
        bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
        padding:   10
      },
      scales: {
        x: {
          ticks:  { color: c.ticks,  font: { family: 'JetBrains Mono, monospace', size: 10 } },
          grid:   { color: c.grid },
          border: { color: c.border }
        },
        y: {
          ticks:  { color: c.ticks,  font: { family: 'JetBrains Mono, monospace', size: 10 } },
          grid:   { color: c.grid },
          border: { color: c.border }
        },
        y1: {
          ticks:  { color: c.ticks,  font: { family: 'JetBrains Mono, monospace', size: 10 } },
          grid:   { drawOnChartArea: false },
          border: { color: c.border }
        }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // updateChart(chart, theme) — splices chrome into a live Chart.js instance
  // ---------------------------------------------------------------------------
  function updateChart(chart, theme) {
    if (!chart || !chart.options) return;
    var ch = chrome(theme);

    // Tooltip
    var tp = chart.options.plugins && chart.options.plugins.tooltip;
    if (tp) {
      tp.backgroundColor = ch.tooltip.backgroundColor;
      tp.titleColor      = ch.tooltip.titleColor;
      tp.bodyColor       = ch.tooltip.bodyColor;
      tp.borderColor     = ch.tooltip.borderColor;
      tp.borderWidth     = ch.tooltip.borderWidth;
    }

    // Scales
    var scales = chart.options.scales;
    if (scales) {
      var axisKeys = ['x', 'y', 'y1'];
      for (var i = 0; i < axisKeys.length; i++) {
        var k = axisKeys[i];
        if (!scales[k]) continue;
        var src = ch.scales[k];
        if (scales[k].ticks) {
          scales[k].ticks.color = src.ticks.color;
        }
        if (scales[k].grid) {
          if (k === 'y1') {
            scales[k].grid.drawOnChartArea = false;
          } else {
            scales[k].grid.color = src.grid.color;
          }
        }
        if (scales[k].border) {
          scales[k].border.color = src.border.color;
        }
      }
    }

    chart.update('none');
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------
  MX60.ChartTheme = {
    chrome:      chrome,
    updateChart: updateChart
  };

  window.MX60 = MX60;

})(window);
