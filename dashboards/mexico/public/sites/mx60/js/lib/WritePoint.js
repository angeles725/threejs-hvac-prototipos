/**
 * WritePoint.js — MX60 namespace
 *
 * Canonical write helper: BajaScript primary → REST fallback → Toast + reject.
 *
 * Branch 1 (happy path): baja.Ord.make(ord).get().then(p => p.set(value))
 * Branch 2 (REST fallback): POST /mx60/api/setpoint with JSON body
 * Branch 3 (dual fail): MX60.Toast.error + Promise.reject
 *
 * CONTRACT: the Toast on dual fail is INVIOLABLE. An operator who commands
 * equipment MUST see an error if the system cannot write. Silent failure
 * is an operational incident.
 *
 * Usage:
 *   MX60.writePoint(equip.ord + '/setpoint', 22.5)
 *     .then(function() { /* optional feedback *\/ })
 *     .catch(function() { /* toast already shown *\/ });
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // HIGH-5 fix: per-ord in-flight guard. Rapid double-click on a toggle would
  // fire two writes that race; the physical device may end in the wrong state.
  var _inFlight = {};

  // iSMA 4.13.2 BajaScript p.set() throws TypeError: getName undefined on
  // any write. After the first failure, mark BajaScript as broken and
  // route ALL subsequent writes directly through REST — same approach as
  // SanLuis (which never uses BajaScript p.set, always POSTs to backend).
  // Eliminates noisy console errors and saves the round-trip latency of
  // make→get→set→fail→fallback per click.
  // iSMA-Niagara 4.13.2.18 (MX60 Chihuahua station): BajaScript p.set() throws
  // "Cannot read properties of undefined (reading 'getName')" — always. Default
  // to broken so first write of every page load goes straight to REST.
  var _bajaSetBroken = true;

  function writePoint(ord, value) {
    return new Promise(function(resolve, reject) {

      // HIGH-5: reject overlapping writes for the same ord.
      if (_inFlight[ord]) {
        if (MX60.Toast && typeof MX60.Toast.warn === 'function') {
          MX60.Toast.warn('Comando en curso, esperá la confirmación.');
        }
        reject(new Error('writePoint in-flight for ' + ord));
        return;
      }
      _inFlight[ord] = true;
      function done(err) {
        delete _inFlight[ord];
        if (err) reject(err); else resolve();
      }

      // [Branch 3] Both BajaScript and REST failed — toast + reject.
      function toastAndFail(msg) {
        if (MX60.Toast && typeof MX60.Toast.error === 'function') {
          MX60.Toast.error('No se pudo escribir al equipo. Revisá la conexión.');
        }
        done(new Error(msg || 'writePoint dual fail'));
      }

      // [Branch 2] REST fallback — POST /api/setpoint with 423 Locked retry.
      // D6: If the server returns HTTP 423 (lock held by controlTick),
      // wait 100ms and retry up to 3 times before failing (REQ-202).
      function restFallback(reason, _retryCount) {
        var retryCount = _retryCount || 0;
        var cfg = MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function'
          ? MX60.ConfigManager.getConfig()
          : null;
        var url = (cfg && cfg.api && cfg.api.setpoint) ? cfg.api.setpoint : '/mx60/api/setpoint';
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload = function() {
          // D6: HTTP 423 Locked — yield 100ms and retry (up to 3 times).
          if (xhr.status === 423) {
            if (retryCount < 3) {
              console.info('[WritePoint] 423 Locked for ' + ord + ' — retry ' + (retryCount + 1) + '/3 in 100ms');
              setTimeout(function() { restFallback(reason, retryCount + 1); }, 100);
            } else {
              toastAndFail('Equipo bloqueado temporalmente. Intentá de nuevo en un momento.');
            }
            return;
          }
          // HIGH-1 fix: HTTP 200 alone is NOT success. Niagara routinely returns
          // 200 with {error: "..."} or {status: "fail"} for permission/type
          // rejects. Parse the body and reject if the server flagged failure.
          if (xhr.status === 200) {
            var ok = true;
            var body = xhr.responseText;
            if (body && body.length) {
              try {
                var parsed = JSON.parse(body);
                if (parsed && (parsed.error || parsed.status === 'fail' || parsed.ok === false)) {
                  ok = false;
                  console.warn('[WritePoint] REST reported failure:', parsed);
                }
              } catch (e) { /* non-JSON body, accept as success */ }
            }
            if (ok) {
              done();
            } else {
              toastAndFail('Niagara rejected write for ' + ord);
            }
          } else {
            toastAndFail(reason || 'REST ' + xhr.status);
          }
        };
        xhr.onerror = function() { toastAndFail('REST network error'); };
        xhr.send(JSON.stringify({ ord: ord, value: _serializeValue(value) }));
      }

      // [Branch 1] Try BajaScript first — happy path on Niagara 4.14.
      // Skip entirely once we know it's broken (iSMA 4.13.2) — prevents
      // ~50ms latency penalty + console noise per click.
      if (!_bajaSetBroken && window.baja && typeof window.baja.Ord !== 'undefined') {
        try {
          window.baja.Ord.make(ord).get().then(function(p) { return p.set(value); })
            .then(function() { done(); })
            .catch(function(err) {
              // First failure → mark broken so future writes go straight to REST.
              if (!_bajaSetBroken) {
                _bajaSetBroken = true;
                console.info('[WritePoint] BajaScript p.set() unsupported on this Niagara version — switching to REST-only for subsequent writes');
              }
              restFallback(err && err.message);
            });
          return;
        } catch (e) {
          if (!_bajaSetBroken) {
            _bajaSetBroken = true;
            console.info('[WritePoint] BajaScript threw — switching to REST-only:', e.message);
          }
          // fall through to REST
        }
      }
      // Direct REST path when BajaScript is known broken or unavailable.
      restFallback();
    });
  }

  // BajaScript values are wrapped objects (BStatusNumeric, BStatusString, etc.).
  // REST receives plain JSON — extract the raw value.
  function _serializeValue(v) {
    if (v && typeof v.getValue === 'function') return v.getValue();
    return v;
  }

  MX60.writePoint = writePoint;
  window.MX60 = MX60;

})(window);
