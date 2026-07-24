/**
 * FCUAnimator.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Multi-phase FCU animation with intro, transition, and infinite loop.
 *
 * Phases:
 *   OFF:        Show intro_0 (static, no effects)
 *   INTRO:      intro_0 → intro_1 → intro_2 → intro_3 → intro_4 (once)
 *   TRANSITION: loop_0 → loop_1 → loop_2 → loop_3 (once)
 *   LOOP:       loop_4 → loop_5 → ... → loop_9 → loop_4 (infinite)
 *
 * Images:
 *   {introPath}fcu_intro_0..4.png  (5 frames)
 *   {loopPath}fcu_loop_0..9.png    (10 frames)
 *
 * Usage:
 *   var anim = SNLS.FCUAnimator.create(canvas, {
 *     introPath: 'img/fcu/intro/',
 *     loopPath:  'img/fcu/loop/'
 *   });
 *   anim.setFanOn(true);   // start intro → transition → loop
 *   anim.setFanOn(false);  // stop, show intro_0
 *   anim.destroy();        // cleanup timers + images
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  var INTRO_COUNT = 5;
  var LOOP_COUNT = 10;
  var LOOP_START = 4;      // loop_4 is where infinite loop begins
  var FRAME_INTERVAL = 150; // ms between frames

  function create(canvas, options) {
    if (!canvas) return null;

    var opts = options || {};
    var introPath = opts.introPath || opts.basePath || 'img/fcu/intro/';
    var loopPath  = opts.loopPath  || 'img/fcu/loop/';

    var _introFrames = [];
    var _loopFrames = [];
    var _introLoaded = 0;
    var _loopLoaded = 0;
    var _allLoaded = false;
    var _phase = 'off';       // off | intro | transition | loop
    var _frameIdx = 0;
    var _timer = null;
    var _destroyed = false;
    var _ctx = canvas.getContext('2d');

    // DPR scaling
    var dpr = window.devicePixelRatio || 1;
    var parent = canvas.parentElement;
    var displayW = parent ? parent.clientWidth : 300;
    var displayH = parent ? parent.clientHeight : 300;
    var size = Math.min(displayW, displayH);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    _ctx.scale(dpr, dpr);

    // Pre-load intro frames
    for (var i = 0; i < INTRO_COUNT; i++) {
      (function(idx) {
        var img = new Image();
        img.onload = function() {
          _introLoaded++;
          _checkAllLoaded();
          // Show first frame immediately when loaded
          if (idx === 0 && _phase === 'off' && !_destroyed) {
            _drawImage(img);
          }
        };
        img.src = introPath + 'fcu_intro_' + idx + '.png';
        _introFrames[idx] = img;
      })(i);
    }

    // Pre-load loop frames
    for (var j = 0; j < LOOP_COUNT; j++) {
      (function(idx) {
        var img = new Image();
        img.onload = function() {
          _loopLoaded++;
          _checkAllLoaded();
        };
        img.src = loopPath + 'fcu_loop_' + idx + '.png';
        _loopFrames[idx] = img;
      })(j);
    }

    function _checkAllLoaded() {
      if (_introLoaded >= INTRO_COUNT && _loopLoaded >= LOOP_COUNT) {
        _allLoaded = true;
      }
    }

    function _drawImage(img) {
      if (_destroyed || !_ctx) return;
      if (!img || !img.complete || !img.naturalWidth) return;
      _ctx.clearRect(0, 0, size, size);
      _ctx.drawImage(img, 0, 0, size, size);
    }

    function _stopTimer() {
      if (_timer) {
        clearInterval(_timer);
        _timer = null;
      }
    }

    // ---- START: intro → transition → loop ----

    function _start() {
      if (_destroyed) return;
      if (!_allLoaded) {
        // Wait for images to load, then retry
        setTimeout(_start, 100);
        return;
      }

      _stopTimer();
      _phase = 'intro';
      _frameIdx = 0;

      _timer = setInterval(function() {
        if (_destroyed) { _stopTimer(); return; }

        if (_phase === 'intro') {
          _drawImage(_introFrames[_frameIdx]);
          _frameIdx++;
          if (_frameIdx >= INTRO_COUNT) {
            // Intro done — move to transition (loop_0 to loop_3)
            _phase = 'transition';
            _frameIdx = 0;
          }
        }
        else if (_phase === 'transition') {
          _drawImage(_loopFrames[_frameIdx]);
          _frameIdx++;
          if (_frameIdx >= LOOP_START) {
            // Transition done — move to infinite loop (loop_4 to loop_9)
            _phase = 'loop';
            _frameIdx = LOOP_START;
          }
        }
        else if (_phase === 'loop') {
          _drawImage(_loopFrames[_frameIdx]);
          _frameIdx++;
          if (_frameIdx >= LOOP_COUNT) {
            _frameIdx = LOOP_START; // loop back to loop_4
          }
        }
      }, FRAME_INTERVAL);
    }

    // ---- STOP: show intro_0, no animation ----

    function _stop() {
      _stopTimer();
      _phase = 'off';
      _frameIdx = 0;
      if (_introFrames[0] && _introFrames[0].complete) {
        _drawImage(_introFrames[0]);
      }
    }

    // ---- Public API ----

    return {
      setFanOn: function(on) {
        if (!!on) {
          if (_phase === 'off') _start();
        } else {
          _stop();
        }
      },

      start: function() {
        if (_phase === 'off') _start();
      },

      stop: function() {
        _stop();
      },

      destroy: function() {
        _destroyed = true;
        _stopTimer();
        _introFrames = [];
        _loopFrames = [];
        _ctx = null;
      },

      isRunning: function() {
        return _phase !== 'off' && _timer !== null;
      },

      getPhase: function() {
        return _phase;
      }
    };
  }

  SNLS.FCUAnimator = {
    create: create
  };

  window.SNLS = SNLS;

})(window);
