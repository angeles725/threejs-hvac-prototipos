/**
 * browser-shim.js — client-side stand-in for the Vercel edge function.
 *
 * On Vercel the dashboards get their data from `/api/router` (see api/router.js), which delegates to
 * the pure `tryHandle` contract. The visor is a static Cloudflare Pages deploy with no functions, so
 * this shim runs that same handler in the page: it patches `fetch` and `XMLHttpRequest`, answers the
 * mock routes locally, and forwards everything else to the network untouched.
 *
 * Loaded as a classic script from <head>, before any app code, so the very first request is covered.
 * Route matching uses the URL pathname, so it is independent of where the dashboard is mounted.
 */
import { tryHandle } from './handler.js';

(function () {
  'use strict';

  if (window.__NIAGARA_MOCK_SHIM__) return;
  window.__NIAGARA_MOCK_SHIM__ = true;

  /** Absolute or relative URL -> the "/path?query" shape tryHandle matches on. */
  function toRoute(url) {
    try {
      var parsed = new URL(String(url), window.location.href);
      return parsed.pathname + parsed.search;
    } catch (error) {
      return String(url);
    }
  }

  function resolve(method, url) {
    try {
      return tryHandle({ method: String(method || 'GET').toUpperCase(), url: toRoute(url) });
    } catch (error) {
      return null;
    }
  }

  /* ── fetch ── */
  var nativeFetch = window.fetch && window.fetch.bind(window);
  if (nativeFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = (init && init.method) || (input && input.method) || 'GET';
      var hit = resolve(method, url);
      if (!hit) return nativeFetch(input, init);
      return Promise.resolve(new Response(hit.body, { status: hit.status, headers: hit.headers || {} }));
    };
  }

  /* ── XMLHttpRequest ── */
  var NativeXHR = window.XMLHttpRequest;
  if (!NativeXHR) return;

  var open = NativeXHR.prototype.open;
  var send = NativeXHR.prototype.send;
  var getHeader = NativeXHR.prototype.getResponseHeader;
  var getAllHeaders = NativeXHR.prototype.getAllResponseHeaders;

  NativeXHR.prototype.open = function (method, url) {
    this.__mockCall = { method: method, url: url };
    return open.apply(this, arguments);
  };

  NativeXHR.prototype.send = function () {
    var call = this.__mockCall;
    var hit = call && resolve(call.method, call.url);
    if (!hit) return send.apply(this, arguments);

    this.__mockHit = hit;
    var xhr = this;
    // Own properties shadow the prototype getters, which stay untouched for real requests.
    define(xhr, 'readyState', 4);
    define(xhr, 'status', hit.status);
    define(xhr, 'statusText', hit.status === 200 ? 'OK' : '');
    define(xhr, 'responseText', hit.body);
    define(xhr, 'response', hit.body);
    define(xhr, 'responseURL', toRoute(call.url));

    // Async, like the network call it replaces: callers assign handlers after send().
    setTimeout(function () {
      dispatch(xhr, 'readystatechange');
      dispatch(xhr, 'load');
      dispatch(xhr, 'loadend');
    }, 0);
  };

  NativeXHR.prototype.getResponseHeader = function (name) {
    var hit = this.__mockHit;
    if (!hit) return getHeader.apply(this, arguments);
    var headers = hit.headers || {};
    var wanted = String(name).toLowerCase();
    for (var key in headers) if (key.toLowerCase() === wanted) return headers[key];
    return null;
  };

  NativeXHR.prototype.getAllResponseHeaders = function () {
    var hit = this.__mockHit;
    if (!hit) return getAllHeaders.apply(this, arguments);
    var headers = hit.headers || {};
    var out = '';
    for (var key in headers) out += key.toLowerCase() + ': ' + headers[key] + '\r\n';
    return out;
  };

  function define(target, prop, value) {
    try {
      Object.defineProperty(target, prop, { value: value, configurable: true, writable: true });
    } catch (error) {
      /* a locked-down property is not worth failing the page over */
    }
  }

  function dispatch(xhr, type) {
    try {
      xhr.dispatchEvent(new Event(type));
    } catch (error) {
      var handler = xhr['on' + type];
      if (typeof handler === 'function') handler.call(xhr);
    }
  }
})();
