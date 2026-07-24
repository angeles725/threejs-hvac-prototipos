/**
 * ConfigManager.js — SNLS namespace
 *
 * Loads the hardcoded module configuration from the servlet's /api/config
 * endpoint via XHR GET. Falls back to an empty object if the endpoint is
 * unreachable (development mode without a live station).
 *
 * API:
 *   SNLS.ConfigManager.load(callback)    — fetch config, call callback(cfg)
 *   SNLS.ConfigManager.getConfig()       — returns the last loaded config object
 *   SNLS.ConfigManager.isLoaded()        — returns true after first load attempt
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  var _config  = null;
  var _loaded  = false;

  // -------------------------------------------------------------------------
  // load(callback)
  //
  // Reads the endpoint URL from window.SNLS_CONFIG.api.config.
  // If that config key is absent (offline dev) the function resolves
  // immediately with an empty object so callers never block.
  // -------------------------------------------------------------------------

  function load(callback) {
    var cfg = window.SNLS_CONFIG;

    if (!cfg || !cfg.api || !cfg.api.config) {
      _config = {};
      _loaded = true;
      if (callback) {
        callback(_config);
      }
      return;
    }

    var url = cfg.api.config;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 200) {
        try {
          _config = JSON.parse(xhr.responseText);
        } catch (parseErr) {
          _config = {};
        }
      } else {
        _config = {};
      }

      _loaded = true;

      if (callback) {
        callback(_config);
      }
    };

    xhr.onerror = function() {
      _config = {};
      _loaded = true;
      if (callback) {
        callback(_config);
      }
    };

    xhr.send();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  SNLS.ConfigManager = {
    load:      load,
    getConfig: function() { return _config; },
    isLoaded:  function() { return _loaded; }
  };

  window.SNLS = SNLS;

})(window);
