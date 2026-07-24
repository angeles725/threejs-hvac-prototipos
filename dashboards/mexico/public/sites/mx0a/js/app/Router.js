(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  var currentPage = 'home';
  var _currentParams = null;
  var _onNavigateCallbacks = [];

  /**
   * Parse hash into { page, params }.
   * Supports: #home, #equipment, #detail/piso4/T1.4, #histories?id=xxx
   */
  function _parseHash(hash) {
    if (!hash) return { page: 'home', params: null };
    var parts = hash.split('/');
    var page = parts[0].split('?')[0];
    if (page === 'detail' && parts.length >= 3) {
      return {
        page: 'detail',
        params: { floorKey: parts[1], equipName: decodeURIComponent(parts[2]) }
      };
    }
    return { page: page, params: null };
  }

  /**
   * Extract query params from the current hash.
   * Example: #histories?id=xxx&range=last24Hours -> { id: 'xxx', range: 'last24Hours' }
   */
  function _getHashParams() {
    var hash = window.location.hash.slice(1);
    var qIdx = hash.indexOf('?');
    if (qIdx === -1) return {};
    var qs = hash.substring(qIdx + 1);
    var params = {};
    var pairs = qs.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      if (pair.length === 2) {
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
    }
    return params;
  }

  function navigate(page, params) {
    var parsed;
    // If page contains '/' it might be a full route like 'detail/piso4/T1.4'
    if (page && page.indexOf('/') >= 0) {
      parsed = _parseHash(page);
      page = parsed.page;
      params = parsed.params;
    }

    // Preserve full page string for hash, extract clean name for navigation
    var rawPage = page || 'home';
    var cleanPage = rawPage.split('?')[0];

    var prevPage = currentPage;
    currentPage = cleanPage;
    _currentParams = params || null;

    // Determine which nav item to highlight (detail highlights equipment)
    var navPage = (cleanPage === 'detail') ? 'equipment' : cleanPage;

    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      var el = navItems[i];
      if (el.dataset.page === navPage) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }

    // Determine which section to show (detail reuses page-detail)
    var pageId = 'page-' + cleanPage;
    var pages = document.querySelectorAll('.page');
    for (var j = 0; j < pages.length; j++) {
      var pg = pages[j];
      if (pg.id === pageId) {
        pg.classList.add('active');
      } else {
        pg.classList.remove('active');
      }
    }

    // Fire onNavigate callbacks BEFORE renderPage
    for (var k = 0; k < _onNavigateCallbacks.length; k++) {
      try { _onNavigateCallbacks[k](cleanPage, _currentParams, prevPage); }
      catch (e) {}
    }

    // Set hash BEFORE renderPage so getHashParams() works inside render
    if (cleanPage === 'detail' && _currentParams) {
      window.location.hash = 'detail/' + _currentParams.floorKey + '/' + encodeURIComponent(_currentParams.equipName);
    } else {
      window.location.hash = rawPage;
    }

    if (SNLS.DashboardApp && typeof SNLS.DashboardApp.renderPage === 'function') {
      SNLS.DashboardApp.renderPage(cleanPage, _currentParams);
    }
  }

  SNLS.Router = {
    init: function() {
      var navItems = document.querySelectorAll('.nav-item');
      for (var i = 0; i < navItems.length; i++) {
        (function(el) {
          el.addEventListener('click', function() {
            navigate(el.dataset.page);
          });
        })(navItems[i]);
      }

      // Handle browser back/forward
      window.addEventListener('hashchange', function() {
        var hash = window.location.hash.slice(1);
        var parsed = _parseHash(hash);
        if (parsed.page !== currentPage || parsed.page === 'detail') {
          navigate(parsed.page, parsed.params);
        }
      });

      var hash = window.location.hash.slice(1);
      var parsed = _parseHash(hash);
      navigate(parsed.page, parsed.params);
    },

    navigate: function(page, params) {
      navigate(page, params);
    },

    getCurrentPage: function() {
      return currentPage;
    },

    getParams: function() {
      return _currentParams;
    },

    getHashParams: function() {
      return _getHashParams();
    },

    onNavigate: function(callback) {
      _onNavigateCallbacks.push(callback);
    }
  };

  window.SNLS = SNLS;

})(window);
