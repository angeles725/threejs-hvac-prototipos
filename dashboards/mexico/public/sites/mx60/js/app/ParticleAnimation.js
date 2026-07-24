/**
 * ParticleAnimation.js — MX60 namespace
 *
 * Network-style particle animation for the header canvas. Adapted from
 * SanLuis ParticleAnimation with three improvements (Rule #2 and a small
 * efficiency win):
 *   1. Exposes destroy() that cancels the RAF loop and removes the resize
 *      listener — no orphaned RAF callbacks if the header is ever torn down.
 *   2. Pauses the loop when the tab is hidden (visibilitychange API). Saves
 *      CPU during background tabs without losing state.
 *   3. Idempotent init() — calling init() twice does not stack two RAF loops.
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _canvas            = null;
  var _ctx               = null;
  var _particles         = [];
  var _rafId             = null;
  var _running           = false;
  var _initialized       = false;
  // T2.0.6 fix: flag para que visibilitychange (interno) no reanude la animacion
  // si fue pausada externamente (ej UpDetail.mount()). Previene bug en el escenario:
  // user entra a UpDetail (pause externo) → cambia de tab (pause interno, no-op) →
  // vuelve al tab (visibilitychange resume → seria incorrecto, user sigue en UpDetail).
  var _pausedByExternal  = false;

  // CP3 — theme-aware particle colour. Swapped by ThemeStore subscription;
  // read on every RAF frame (no getTheme() in _step — GATE-1b).
  // Primed at module-load from the DOM data-theme attribute (set by the FOUC
  // inline script before any module loads). Without this, a fresh light-theme
  // load shows the dark-teal particles until the first manual toggle, because
  // the subscribe callback in init() only fires on toggle, not at registration.
  var _particleColorPrefix = (document.documentElement.getAttribute('data-theme') === 'light')
    ? 'rgba(59,130,246,'
    : 'rgba(0,212,170,';
  var _themeUnsub          = null;

  var PARTICLE_COUNT = 60;
  var LINK_DIST      = 100;

  function _resize() {
    if (!_canvas || !_canvas.parentElement) return;
    _canvas.width  = _canvas.parentElement.offsetWidth;
    _canvas.height = _canvas.parentElement.offsetHeight;
  }

  function _seed() {
    _particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      _particles.push({
        x: Math.random() * _canvas.width,
        y: Math.random() * _canvas.height,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
  }

  function _step() {
    if (!_running || !_ctx || !_canvas) return;

    var W = _canvas.width;
    var H = _canvas.height;
    _ctx.clearRect(0, 0, W, H);

    var i, a, b, p, dx, dy, dist;

    // Move + draw nodes.
    for (i = 0; i < _particles.length; i++) {
      p = _particles[i];
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      else if (p.y > H) p.y = 0;

      _ctx.beginPath();
      _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      _ctx.fillStyle = _particleColorPrefix + p.opacity + ')';
      _ctx.fill();
    }

    // Connection lines (O(n²)).
    for (a = 0; a < _particles.length; a++) {
      for (b = a + 1; b < _particles.length; b++) {
        dx = _particles[a].x - _particles[b].x;
        dy = _particles[a].y - _particles[b].y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          _ctx.beginPath();
          _ctx.moveTo(_particles[a].x, _particles[a].y);
          _ctx.lineTo(_particles[b].x, _particles[b].y);
          _ctx.strokeStyle = _particleColorPrefix + (0.08 * (1 - dist / LINK_DIST)) + ')';
          _ctx.lineWidth = 0.5;
          _ctx.stroke();
        }
      }
    }

    _rafId = window.requestAnimationFrame(_step);
  }

  function _onVisibilityChange() {
    if (document.hidden) {
      _pause();
    } else if (!_pausedByExternal) {
      // T2.0.6 fix: solo reanudar si NO fue pausado por hook externo (UpDetail).
      // Si _pausedByExternal=true, el user sigue en UpDetail — NO reanudar el particle.
      _resume();
    }
  }

  function _pause() {
    if (!_running) return;
    _running = false;
    if (_rafId !== null) {
      window.cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  function _resume() {
    if (_running || !_ctx) return;
    _running = true;
    _rafId = window.requestAnimationFrame(_step);
  }

  function init(canvasId) {
    if (_initialized) return; // idempotent
    var id = canvasId || 'particle-canvas';
    _canvas = document.getElementById(id);
    if (!_canvas) return;

    _ctx = _canvas.getContext('2d');
    _resize();
    _seed();

    window.addEventListener('resize', _resize, false);
    document.addEventListener('visibilitychange', _onVisibilityChange, false);

    _initialized = true;
    _resume();

    // CP3: subscribe to ThemeStore so particle colour flips on toggle without
    // restarting the RAF loop (GATE-1b: no getTheme inside _step).
    if (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.subscribe === 'function') {
      _themeUnsub = MX60.ThemeStore.subscribe(function (theme) {
        _particleColorPrefix = (theme === 'light') ? 'rgba(59,130,246,' : 'rgba(0,212,170,';
      });
    }
  }

  function destroy() {
    _pause();
    // CP3: unsubscribe from ThemeStore (GATE-1a).
    if (_themeUnsub && window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.unsubscribe === 'function') {
      MX60.ThemeStore.unsubscribe(_themeUnsub);
      _themeUnsub = null;
    }
    window.removeEventListener('resize', _resize, false);
    document.removeEventListener('visibilitychange', _onVisibilityChange, false);
    if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _canvas      = null;
    _ctx         = null;
    _particles   = [];
    _initialized = false;
  }

  // T2.0.6: pause/resume expuestos como WRAPPERS que setean el flag _pausedByExternal.
  // Asi visibilitychange (interno) sabe respetar el estado externo cuando el user
  // vuelve al tab. Sin el flag, visibilitychange reanudaria mientras el user sigue
  // en UpDetail = bug.
  function _externalPause()  { _pausedByExternal = true;  _pause();  }
  function _externalResume() { _pausedByExternal = false; _resume(); }

  MX60.ParticleAnimation = {
    init:    init,
    destroy: destroy,
    pause:   _externalPause,
    resume:  _externalResume
  };

  window.MX60 = MX60;

})(window);
