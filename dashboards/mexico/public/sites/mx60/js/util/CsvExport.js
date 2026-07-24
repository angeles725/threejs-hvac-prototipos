/**
 * MX60.util.CsvExport
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * RFC 4180 CSV download utility. Pure browser, no dependencies.
 *
 * Usage:
 *   MX60.util.CsvExport.download(rows, columnsDef, filename);
 *
 * columnsDef shape:
 *   [{ header: 'Fuente', getValue: function(row) { return row.source || ''; } }, ...]
 *
 * SDD-B chihuahua-alarms-bulk-and-export · REQ-B7, REQ-B8.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  function _quote(value) {
    var s = (value == null) ? '' : String(value);
    // RFC 4180: if contains comma, quote, or CR/LF — wrap in quotes and double-up internal quotes.
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 ||
        s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function _buildCsv(rows, columnsDef) {
    var lines = [];
    // Header
    var hdr = [];
    for (var i = 0; i < columnsDef.length; i++) {
      hdr.push(_quote(columnsDef[i].header));
    }
    lines.push(hdr.join(','));
    // Rows
    if (rows && rows.length) {
      for (var r = 0; r < rows.length; r++) {
        var cells = [];
        for (var c = 0; c < columnsDef.length; c++) {
          var raw;
          try {
            raw = columnsDef[c].getValue(rows[r]);
          } catch (e) { raw = ''; }
          cells.push(_quote(raw));
        }
        lines.push(cells.join(','));
      }
    }
    return lines.join('\r\n') + '\r\n';
  }

  function download(rows, columnsDef, filename) {
    if (!columnsDef || columnsDef.length === 0) return;
    var csv = _buildCsv(rows || [], columnsDef);

    // BOM for Excel UTF-8 support
    var BOM = '﻿';
    var blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename || ('export-' + Date.now() + '.csv');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Defer revoke so the download can start
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  // Helpers exposed for callers that want to format datestamps consistently.
  function timestamp() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : String(n); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  MX60.util.CsvExport = {
    download:  download,
    timestamp: timestamp
  };

  window.MX60 = MX60;

})(window);
