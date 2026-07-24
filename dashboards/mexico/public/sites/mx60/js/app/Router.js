/**
 * Router.js — MX60 namespace
 *
 * Hash-based router. Adapted from Angeles Router with one change:
 * MX60 detail uses a single param (equipName), not two (floorKey + equipName).
 *
 * Hash forms:
 *   #home
 *   #alarms
 *   #schedules
 *   #equipment
 *   #histories                 (or #histories?id=<id>)
 *   #detail/<equipName>
 *
 * Lifecycle:
 *   init(onNavigateCb) — install hashchange listener, dispatch initial hash
 *   destroy()          — remove listener (Rule #2: every component cleans up)
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _currentRoute = { page: '', params: [], query: {} };
  var _onNavigate   = null;
  var _initialized  = false;

  function parseHash(hash) {
    var raw = hash || '';
    if (raw.charAt(0) === '#') raw = raw.substring(1);

    var queryObj = {};
    var qIdx = raw.indexOf('?');
    var pathPart = raw;
    if (qIdx !== -1) {
      var qStr = raw.substring(qIdx + 1);
      pathPart = raw.substring(0, qIdx);
      var pairs = qStr.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split('=');
        if (kv[0]) {
          queryObj[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : '';
        }
      }
    }

    var segments = pathPart.split('/');
    var page = segments[0] || '';
    var params = [];
    for (var j = 1; j < segments.length; j++) {
      if (segments[j] !== '') params.push(decodeURIComponent(segments[j]));
    }

    // ADR-A4 (chihuahua-alarms-redesign-equipment-style):
    // #alarms/<encoded-ord> is a sub-page of #alarms — surface as 'alarm-detail'
    // page id so the dedicated page module mounts. Same pattern as #detail/<x>
    // being a sub-view of #equipment.
    if (page === 'alarms' && params.length >= 1) {
      page = 'alarm-detail';
      params = [params[0]];
    }

    return { page: page, params: params, query: queryObj };
  }

  function buildHash(page, params, query) {
    var hash = '#' + page;
    if (params && params.length > 0) {
      var encoded = [];
      for (var i = 0; i < params.length; i++) encoded.push(encodeURIComponent(params[i]));
      hash += '/' + encoded.join('/');
    }
    if (query) {
      var keys = [];
      for (var k in query) {
        if (query.hasOwnProperty(k)) {
          keys.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
        }
      }
      if (keys.length > 0) hash += '?' + keys.join('&');
    }
    return hash;
  }

  function highlightNav(page) {
    // Sub-view aliasing: detail → equipment, alarm-detail → alarms.
    var activePage = page;
    if (page === 'detail') activePage = 'equipment';
    else if (page === 'alarm-detail') activePage = 'alarms';
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      var item = navItems[i];
      var itemPage = item.getAttribute('data-page') || '';
      if (itemPage === activePage) item.classList.add('active');
      else item.classList.remove('active');
    }
  }

  function handleHashChange() {
    var prev = _currentRoute;
    var route = parseHash(window.location.hash);
    _currentRoute = route;
    highlightNav(route.page);
    if (typeof _onNavigate === 'function') _onNavigate(route, prev);
  }

  function _onNavClick(e) {
    var page = e.currentTarget.getAttribute('data-page');
    if (page) navigate('#' + page);
  }

  function init(onNavigateCb) {
    if (_initialized) return;
    _initialized = true;
    _onNavigate = onNavigateCb || null;

    // Bind nav buttons via data-page (Rule #1: no inline onclick).
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].addEventListener('click', _onNavClick, false);
    }

    window.addEventListener('hashchange', handleHashChange, false);

    // Initial dispatch — default to #home if no hash.
    if (!window.location.hash || window.location.hash.length <= 1) {
      window.location.hash = '#home';
    } else {
      handleHashChange();
    }
  }

  function navigate(hash) {
    if (!hash) return;
    if (hash.charAt(0) !== '#') hash = '#' + hash;
    if (hash === window.location.hash) {
      // Same hash — force a re-dispatch (e.g. clicking the active nav item).
      handleHashChange();
      return;
    }
    window.location.hash = hash;
  }

  function getCurrentRoute() { return _currentRoute; }

  function destroy() {
    window.removeEventListener('hashchange', handleHashChange, false);
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].removeEventListener('click', _onNavClick, false);
    }
    _initialized = false;
    _onNavigate = null;
    _currentRoute = { page: '', params: [], query: {} };
  }

  MX60.Router = {
    init: init,
    navigate: navigate,
    parseHash: parseHash,
    buildHash: buildHash,
    getCurrentRoute: getCurrentRoute,
    destroy: destroy
  };

  window.MX60 = MX60;

})(window);
