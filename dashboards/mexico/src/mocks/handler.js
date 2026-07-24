/**
 * Handler compartido entre Vite (dev/preview) y Vercel Edge Runtime (prod).
 *
 * Contrato pure: tryHandle({ method, url }) → { status, headers, body } | null
 *   - null  → no aplica; el caller decide (next() en Vite, 404 en Vercel)
 *   - obj   → la request fue manejada; el caller convierte a su API (Node http o Web Response)
 *
 * Esto evita acoplar al API de Node (res.statusCode/setHeader/end) que NO
 * existe en Edge Runtime. Edge usa Request/Response del Web Fetch API.
 */

import {
  mx60Config,
  mx60Equipment,
  mx60Alarms,
  mx60AlarmCounts,
  mx60Version,
  mx60Schedules,
  mx60Zones,
} from './mx60.js';
import {
  snlsConfig,
  snlsEquipmentByFloor,
  snlsMonitorByFloor,
  snlsAlarms,
  snlsAlarmCounts,
  snlsSchedules,
  snlsHistoryList,
  snlsHistoryData,
} from './snls.js';

/* RequireJS / BajaScript stub — idempotente vía sentinel __NIAGARA_MOCK_OVERRIDE__ */
export var REQUIRE_STUB = [
  "(function(){",
  "  'use strict';",
  "  function reqStub(deps, cb, eb){",
  "    setTimeout(function(){",
  "      if (typeof eb === 'function') {",
  "        try { eb(new Error('niagara-mock: baja not available, falling back to REST')); }",
  "        catch (e) { /* swallow */ }",
  "      }",
  "    }, 20);",
  "  }",
  "  reqStub.config = function(){};",
  "  reqStub.toUrl = function(p){ return p; };",
  "  reqStub.defined = function(){ return false; };",
  "  reqStub.specified = function(){ return false; };",
  "  window.require = reqStub;",
  "  window.requirejs = reqStub;",
  "  window.define = function(){};",
  "  window.define.amd = {};",
  "  if (!window.__NIAGARA_MOCK_OVERRIDE__) {",
  "    window.__NIAGARA_MOCK_OVERRIDE__ = true;",
  "    try {",
  "      var _snls; var _mx60;",
  "      Object.defineProperty(window, 'SNLS_CONFIG', {",
  "        configurable: true,",
  "        set: function(v){ if (v) { v.pollInterval = 1500; v.minFetchIntervalMs = 50; v.bajaDebounceMs = 100; } _snls = v; },",
  "        get: function(){ return _snls; }",
  "      });",
  "      Object.defineProperty(window, 'MX60_CONFIG', {",
  "        configurable: true,",
  "        set: function(v){ if (v && v.pollMs) { v.pollMs.home = 1500; v.pollMs.equipment = 1500; } _mx60 = v; },",
  "        get: function(){ return _mx60; }",
  "      });",
  "    } catch (e) {}",
  "  }",
  "  var prePopAttempts = 0;",
  "  var prePopTimer = setInterval(function(){",
  "    prePopAttempts++;",
  "    if (prePopAttempts > 50) { clearInterval(prePopTimer); return; }",
  "    if (window.SNLS && window.SNLS.HistoryChart && window.SNLS.HistoryChart.addDataPoint && !window.__SNLS_PREPOP__) {",
  "      window.__SNLS_PREPOP__ = true;",
  "      ['piso4','piso5','piso6','piso7'].forEach(function(f){",
  "        fetch('/snls/api/equipment/' + f).then(function(r){return r.json();}).then(function(equips){",
  "          equips.forEach(function(e, idx){",
  "            var key = e.equipName || e.tag;",
  "            if (!key) return;",
  "            for (var t = 60; t > 0; t--) {",
  "              var phase = (idx + t) * 0.1;",
  "              window.SNLS.HistoryChart.addDataPoint(key, {",
  "                tempAmbiente: 22 + Math.sin(phase) * 1.6 + Math.sin(phase * 0.3) * 0.8,",
  "                humidity:     48 + Math.sin(phase * 0.7) * 5,",
  "                setPointCool: 22",
  "              });",
  "            }",
  "          });",
  "          if (window.SNLS.HistoryChart.drawChart) window.SNLS.HistoryChart.drawChart();",
  "        }).catch(function(){});",
  "      });",
  "    }",
  "    if (window.MX60 && window.MX60.LiveHistoryBuffer && window.MX60.LiveHistoryBuffer.addDataPoint && !window.__MX60_PREPOP__) {",
  "      window.__MX60_PREPOP__ = true;",
  "      fetch('/mx60/api/equipment').then(function(r){return r.json();}).then(function(equips){",
  "        var realDateNow = Date.now;",
  "        var realNow = realDateNow();",
  "        var pretendT = realNow;",
  "        Date.now = function(){ return pretendT; };",
  "        try {",
  "          for (var ei = 0; ei < equips.length; ei++) {",
  "            var e = equips[ei];",
  "            if (!e.id) continue;",
  "            for (var t = 60; t > 0; t--) {",
  "              pretendT = realNow - t * 60 * 1000;",
  "              var phase = (ei + t) * 0.13;",
  "              var s = e.summary || {};",
  "              window.MX60.LiveHistoryBuffer.addDataPoint(e.id, {",
  "                id: e.id, label: e.label, type: e.type, planta: e.planta,",
  "                status: e.status, alarms: e.alarms, ord: e.ord,",
  "                summary: {",
  "                  tempZona:      (s.tempZona      || 22)  + Math.sin(phase) * 1.5,",
  "                  tempAbasto:    (s.tempAbasto    || 17)  + Math.sin(phase * 0.7) * 1.2,",
  "                  tempRetorno:   (s.tempRetorno   || 25)  + Math.sin(phase * 0.5) * 1.0,",
  "                  tempExterior:  (s.tempExterior  || 28)  + Math.sin(phase * 0.2) * 2.0,",
  "                  humedadZona:   (s.humedadZona   || 52)  + Math.sin(phase * 0.6) * 5,",
  "                  currentA:      (s.currentA      || 18)  + Math.sin(phase * 0.3) * 3,",
  "                  ampCompresor1: (s.ampCompresor1 || 14)  + Math.sin(phase * 0.4) * 2,",
  "                  ampCompresor2: (s.ampCompresor2 || 13)  + Math.sin(phase * 0.4 + 1) * 2,",
  "                  ampAbanicos1:  (s.ampAbanicos1  || 4.5) + Math.sin(phase * 0.5) * 0.8,",
  "                  ampAbanicos2:  (s.ampAbanicos2  || 4.2) + Math.sin(phase * 0.5 + 0.5) * 0.8,",
  "                  ampFan:        (s.ampFan        || 3.8) + Math.sin(phase * 0.45) * 0.6,",
  "                  tempSuccion1:  (s.tempSuccion1  || 8)   + Math.sin(phase * 0.35) * 1.5,",
  "                  tempSuccion2:  (s.tempSuccion2  || 9)   + Math.sin(phase * 0.35 + 0.5) * 1.5,",
  "                  setpoint:      s.setpoint || 22,",
  "                  pressurePsi:   (s.pressurePsi   || 45)  + Math.sin(phase * 0.3) * 3,",
  "                  nivelCm:       (s.nivelCm       || 50)  + Math.sin(phase * 0.25) * 8",
  "                }",
  "              });",
  "            }",
  "          }",
  "        } finally {",
  "          Date.now = realDateNow;",
  "        }",
  "      }).catch(function(){});",
  "    }",
  "  }, 200);",
  "  console.log('[niagara-mock] stub installed (errback → REST, pollInterval=1.5s, pre-pop on)');",
  "})();",
].join('\n');

function json(payload) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  };
}

function js(src) {
  return {
    status: 200,
    headers: { 'content-type': 'application/javascript; charset=utf-8' },
    body: src,
  };
}

function html(s) {
  return {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: s,
  };
}

/**
 * tryHandle — pure function. Devuelve `{status, headers, body}` o `null`.
 * Acepta `{ method, url }` (object simple, NO Node req ni Web Request).
 */
export function tryHandle(input) {
  var method = input.method || 'GET';
  var fullUrl = input.url;
  var url = fullUrl.split('?')[0];

  if (url === '/requirejs/config.js' || url === '/module/js/com/tridium/js/ext/require/require.min.js') {
    return js(REQUIRE_STUB);
  }

  /* ── MX60 ─────────────────────────────────────────────────── */
  if (url === '/mx60/api/config')          return json(mx60Config());
  if (url === '/mx60/api/equipment')       return json(mx60Equipment());
  if (url === '/mx60/api/alarms')          return json(mx60Alarms());
  if (url === '/mx60/api/alarms/counts')   return json(mx60AlarmCounts());
  if (url === '/mx60/api/zones')           return json(mx60Zones());
  if (url === '/mx60/api/schedules')       return json(mx60Schedules());
  if (url === '/mx60/version.json')        return json(mx60Version());
  if (url === '/mx60/api/history/list')    return json([]);
  if (url === '/mx60/api/history/data')    return json({ points: [] });
  if (url.startsWith('/mx60/api/equipment-histories/')) return json({ points: [] });

  /* ── SNLS / MX0A ─────────────────────────────────────────── */
  if (url === '/snls/api/config')          return json(snlsConfig());
  if (url.startsWith('/snls/api/equipment/')) {
    var floor = url.replace('/snls/api/equipment/', '').replace(/\/$/, '');
    return json(snlsEquipmentByFloor(floor));
  }
  if (url.startsWith('/snls/api/monitor/')) {
    var floor2 = url.replace('/snls/api/monitor/', '').replace(/\/$/, '');
    return json(snlsMonitorByFloor(floor2));
  }
  if (url === '/snls/api/alarms')          return json(snlsAlarms());
  if (url === '/snls/api/alarms/counts')   return json(snlsAlarmCounts());
  if (url === '/snls/api/schedules')       return json(snlsSchedules());
  if (url === '/snls/api/history/list')    return json(snlsHistoryList());
  if (url === '/snls/api/history/data') {
    var qs = {};
    var qIdx = fullUrl.indexOf('?');
    if (qIdx >= 0) {
      fullUrl.slice(qIdx + 1).split('&').forEach(function (pair) {
        var parts = pair.split('=');
        if (parts.length === 2) qs[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      });
    }
    return json(snlsHistoryData(qs.id, qs.range));
  }
  if (url.startsWith('/snls/api/equipment-histories/')) return json({ points: [] });

  if (method === 'POST' && url.startsWith('/snls/api/alarms/ack/')) {
    var uuid = url.replace('/snls/api/alarms/ack/', '');
    return json({ ok: true, uuid: uuid, ackState: 'acked' });
  }

  if (url.startsWith('/ord/')) {
    return html('<html><body><p>ORD view not available in demo mode.</p></body></html>');
  }

  if (url === '/mx60/api/setpoint' || url === '/snls/api/setpoint' || url === '/mx60/api/write' || url === '/snls/api/write') {
    return json({ ok: true, mocked: true });
  }

  return null;
}
