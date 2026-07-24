(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  var _pollTimer = null;
  var _clockTimer = null;
  var _currentPage = 'home';
  var _currentParams = null;
  var _allEquipment = {};
  var _monitorData = {};
  var _detailFCU = null;
  var _detailHistoryId = '';
  var _detailHistoryRange = 'lastHour';
  var _equipHistories = {};
  var _inlineCharts = {};
  var _detailRenderedKey = null;

  // Building page state
  var _buildingFloor = 4;
  var _buildingPopover = null;

  // RTU marker positions for 3D floor plan images (% coordinates)
  // Normalized images: 1516x600px, all same dimensions
  // Names verified by visual OCR of each cropped label from reference images
  var BUILDING_RTU_POSITIONS = {
    4: [  // 22 RTUs
      {num:'20.4', x:29, y:8},  {num:'18.4', x:24, y:12},
      {num:'19.4', x:19, y:18}, {num:'16.4', x:14, y:19},
      {num:'21.4', x:37, y:19}, {num:'17.4', x:29, y:27},
      {num:'22.4', x:58, y:31}, {num:'15.4', x:16, y:31},
      {num:'13.4', x:19, y:35}, {num:'7.4',  x:56, y:37},
      {num:'10.4', x:36, y:38}, {num:'9.4',  x:44, y:39},
      {num:'8.4',  x:48, y:39}, {num:'23.4', x:80, y:42},
      {num:'3.4',  x:65, y:48}, {num:'6.4',  x:48, y:50},
      {num:'14.4', x:16, y:53}, {num:'12.4', x:22, y:54},
      {num:'2.4',  x:61, y:54}, {num:'4.4',  x:55, y:54},
      {num:'5.4',  x:51, y:55}, {num:'1.4',  x:59, y:59}
    ],
    5: [  // 19 RTUs
      {num:'2.5',  x:45, y:22}, {num:'1.5',  x:49, y:22},
      {num:'12.5', x:27, y:24}, {num:'13.5', x:27, y:29},
      {num:'19.5', x:16, y:26}, {num:'18.5', x:21, y:27},
      {num:'11.5', x:33, y:27}, {num:'14.5', x:27, y:33},
      {num:'3.5',  x:48, y:31}, {num:'16.5', x:23, y:33},
      {num:'10.5', x:36, y:35}, {num:'8.5',  x:42, y:37},
      {num:'4.5',  x:46, y:38}, {num:'17.5', x:21, y:40},
      {num:'15.5', x:27, y:41}, {num:'5.5',  x:45, y:42},
      {num:'21.5', x:67, y:44}, {num:'9.5',  x:38, y:44},
      {num:'6.5',  x:44, y:45}, {num:'7.5',  x:43, y:49}
    ],
    6: [  // 19 RTUs
      {num:'16.6', x:34, y:12}, {num:'15.6', x:41, y:16},
      {num:'14.6', x:44, y:19}, {num:'12.6', x:26, y:22},
      {num:'13.6', x:43, y:23}, {num:'17.6', x:49, y:25},
      {num:'5.6',  x:32, y:25}, {num:'8.6',  x:18, y:25},
      {num:'18.6', x:53, y:25}, {num:'11.6', x:25, y:27},
      {num:'6.6',  x:20, y:31}, {num:'3.6',  x:35, y:32},
      {num:'10.6', x:24, y:33}, {num:'1.6',  x:40, y:34},
      {num:'9.6',  x:24, y:38}, {num:'7.6',  x:17, y:38},
      {num:'4.6',  x:32, y:44}, {num:'2.6',  x:36, y:44},
      {num:'19.6', x:77, y:56}
    ],
    7: [  // 22 RTUs
      {num:'20.7', x:65, y:14}, {num:'3.7',  x:47, y:14},
      {num:'1.7',  x:56, y:18}, {num:'4.7',  x:40, y:19},
      {num:'22.7', x:64, y:23}, {num:'15.7', x:27, y:24},
      {num:'14.7', x:21, y:25}, {num:'5.7',  x:47, y:25},
      {num:'21.7', x:65, y:26}, {num:'11.7', x:31, y:26},
      {num:'2.7',  x:53, y:29}, {num:'6.7',  x:47, y:29},
      {num:'19.7', x:69, y:31}, {num:'18.7', x:69, y:34},
      {num:'13.7', x:25, y:32}, {num:'7.7',  x:46, y:33},
      {num:'8.7',  x:41, y:34}, {num:'16.7', x:73, y:36},
      {num:'17.7', x:81, y:39}, {num:'12.7', x:24, y:40},
      {num:'10.7', x:35, y:44}, {num:'9.7',  x:38, y:44}
    ]
  };

  // Arrow lines for Piso 4 — from label position to RTU zone
  // {num, ax, ay} where ax/ay is the arrow TARGET position (%)
  // Calculated via building bounding box transform from labeled reference image
  var BUILDING_ARROWS = {
    4: [
      {num:'20.4', ax:29, ay:18},
      {num:'18.4', ax:24, ay:25},
      {num:'16.4', ax:24, ay:31},
      {num:'14.4', ax:20, ay:44},
      {num:'12.4', ax:26, ay:44}
    ]
  };

  // Dual-channel state
  var _bajaActive = false;
  var _lastFetchTime = {};
  var _minFetchInterval = 1000;

  // ---- Data Fetching (REST Polling — page-aware) ----

  function _fetchEquipment(floorKey, callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.equipment + floorKey, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (callback) callback(data);
        } catch (e) {}
      }
    };
    xhr.send();
  }

  function _fetchMonitor(floorKey, callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.monitor + floorKey, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (callback) callback(data);
        } catch (e) {}
      }
    };
    xhr.send();
  }

  /**
   * Determine which equipment floors to fetch based on current page.
   * Returns: 'none' | 'all' | '{floorKey}' (specific floor)
   *
   * Strategy:
   *   Monitors  → ALWAYS (lightweight, needed for Home LEDs + Building + nav)
   *   Equipment → ONLY when the active page needs individual RTU data
   *
   *   home      → none  (LEDs use monitor aggregates)
   *   schedules → none
   *   building  → none  (meters use monitor aggregates)
   *   alarms    → all   (AlarmManager needs all RTUs for threshold detection)
   *   equipment → depends on floor filter ('all' or specific floorKey)
   *   detail    → specific floorKey only
   *   histories → all   (HistoryChart ring buffer needs all RTUs)
   */
  function _getEquipmentStrategy() {
    switch (_currentPage) {
      case 'home':
      case 'schedules':
        return 'none';

      case 'building':
        return 'all';

      case 'alarms':
      case 'histories':
        return 'all';

      case 'equipment':
        if (SNLS.ViewManager) {
          var floor = SNLS.ViewManager.getCurrentFloor();
          if (floor && floor !== 'all') {
            // Map floor number to floorKey
            var cfg = window.SNLS_CONFIG;
            var floors = cfg ? cfg.floors : [];
            for (var i = 0; i < floors.length; i++) {
              if (floors[i].number === Number(floor)) {
                return floors[i].key;
              }
            }
          }
        }
        return 'all';

      case 'detail':
        if (_currentParams && _currentParams.floorKey) {
          return _currentParams.floorKey;
        }
        return 'none';

      default:
        return 'none';
    }
  }

  /** Process fetched equipment data — distribute to all consumers */
  function _processEquipmentData(floor, equipList) {
    _allEquipment[floor.key] = equipList;
    if (SNLS.ViewManager) {
      SNLS.ViewManager.setEquipmentData(floor.key, equipList);
    }
    if (SNLS.FloorPlanManager) {
      SNLS.FloorPlanManager.setEquipmentData(floor.number, equipList);
    }
    if (SNLS.AlarmManager) {
      SNLS.AlarmManager.processEquipmentAlarms(equipList, floor.name);
    }
    if (SNLS.HistoryChart) {
      for (var j = 0; j < equipList.length; j++) {
        var key = equipList[j].equipName || equipList[j].tag || '';
        if (key) {
          SNLS.HistoryChart.addDataPoint(key, equipList[j]);
        }
      }
    }
  }

  // ---- Dual-Channel: BajaScript push triggers instant REST fetch ----

  /**
   * Setup BajaScript subscriptions for the active page.
   * Subscribes to monitor ORDs — when any child changes, triggers
   * an immediate REST fetch (no waiting for next 5s poll cycle).
   */
  function _setupSubscriptions(page, params) {
    if (!SNLS.SubscriptionPool || SNLS.SubscriptionPool.isFailed()) return;

    SNLS.SubscriptionPool.cleanup('page');

    if (page === 'histories' || page === 'schedules') return;

    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];
    var keys = [];
    for (var i = 0; i < floors.length; i++) {
      keys.push(floors[i].key);
    }

    SNLS.SubscriptionPool.subscribeMonitors('page', keys, function(floorKey) {
      _bajaActive = true;
      _lastFetchTime[floorKey] = Date.now();

      // Instant REST fetch on BajaScript push
      _fetchMonitor(floorKey, function(summary) {
        _monitorData[floorKey] = summary;
        _renderIfNeeded();
      });

      var strategy = _getEquipmentStrategy();
      if (strategy === 'all' || strategy === floorKey) {
        var fl = cfg ? cfg.floors : [];
        for (var j = 0; j < fl.length; j++) {
          if (fl[j].key === floorKey) {
            (function(floor) {
              _fetchEquipment(floor.key, function(equipList) {
                _processEquipmentData(floor, equipList);
                _renderIfNeeded();
              });
            })(fl[j]);
            break;
          }
        }
      }
    });
  }

  /** Event-driven render — replaces the old 2s _simTimer */
  function _renderIfNeeded() {
    renderPage(_currentPage, _currentParams);
    if (SNLS.ViewManager && SNLS.ViewManager.isModalOpen()) {
      SNLS.ViewManager.refreshModal();
    }
    if (SNLS.FloorPlanManager && SNLS.FloorPlanManager.isOpen()) {
      SNLS.FloorPlanManager.refreshMarkers();
    }
  }

  function _pollAllData() {
    var cfg = window.SNLS_CONFIG;
    if (!cfg) return;
    var floors = cfg.floors || [];

    // ALWAYS: fetch monitors (lightweight — 4 small requests)
    // Skip floors that BajaScript updated recently (<4s)
    var now = Date.now();
    var skipThreshold = 4000;

    for (var i = 0; i < floors.length; i++) {
      (function(floor) {
        var recentPush = _lastFetchTime[floor.key] &&
                         (now - _lastFetchTime[floor.key]) < skipThreshold;
        if (!recentPush) {
          _fetchMonitor(floor.key, function(summary) {
            _monitorData[floor.key] = summary;
          });
        }
      })(floors[i]);
    }

    // CONDITIONALLY: fetch equipment based on active page
    var strategy = _getEquipmentStrategy();

    if (strategy === 'none') {
      return;
    }

    if (strategy === 'all') {
      for (var a = 0; a < floors.length; a++) {
        (function(floor) {
          _fetchEquipment(floor.key, function(equipList) {
            _processEquipmentData(floor, equipList);
          });
        })(floors[a]);
      }
    } else {
      // Fetch only the specific floor
      for (var b = 0; b < floors.length; b++) {
        if (floors[b].key === strategy) {
          (function(floor) {
            _fetchEquipment(floor.key, function(equipList) {
              _processEquipmentData(floor, equipList);
            });
          })(floors[b]);
          break;
        }
      }
    }
  }

  // ---- Page Renderers ----

  function renderPage(page, params) {
    _currentPage = page || _currentPage;
    _currentParams = params || _currentParams;

    // Cleanup detail FCU and chart when leaving
    if (_currentPage !== 'detail') {
      if (_detailFCU) {
        _detailFCU.destroy();
        _detailFCU = null;
      }
      // Destroy inline history charts
      var chartKeys = Object.keys(_inlineCharts);
      for (var ci = 0; ci < chartKeys.length; ci++) {
        try { _inlineCharts[chartKeys[ci]].destroy(); } catch (e) {}
      }
      _inlineCharts = {};
      _detailRenderedKey = null;
    }

    switch (_currentPage) {
      case 'home': _renderHome(); break;
      case 'alarms': _renderAlarms(); break;
      case 'schedules': _renderSchedules(); break;
      case 'building': _renderBuilding(); break;
      case 'equipment': _renderEquipment(); break;
      case 'histories': _renderHistories(); break;
      case 'detail': _renderDetail(_currentParams); break;
    }
    _updateNavBadge();
  }

  // ---- Count-Up Animation ----
  function _animateCountUp(el, target, duration) {
    var start = parseInt(el.textContent) || 0;
    if (start === target) return;
    var startTime = performance.now();
    duration = duration || 600;
    function step(now) {
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(start + (target - start) * eased);
      el.textContent = target < 10 ? ('0' + current).slice(-2) : current;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- Nav Badge ----
  function _updateNavBadge() {
    if (!SNLS.AlarmManager) return;
    var count = SNLS.AlarmManager.getActiveAlarms().length;
    if (SNLS.NavGenerator) {
      SNLS.NavGenerator.updateAlarmBadge(count);
    }
  }

  // ---- HOME (Reflow style) ----
  function _renderHome() {
    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];

    for (var f = 0; f < floors.length; f++) {
      var fl = floors[f];
      var m = _monitorData[fl.key] || {};
      var num = fl.number;

      var fanOn   = m.fanOn   || 0;
      var standby = m.standby || 0;
      var alarms  = m.alarms || 0;

      // RTU count
      var countEl = document.getElementById('home-floor-count-' + num);
      if (countEl) countEl.textContent = (m.total || 0) + ' RTUs';

      // Per-floor LEDs: green=prendidas, blue=espera, red=alarma
      var greenEl = document.getElementById('home-led-green-' + num);
      if (greenEl) greenEl.textContent = fanOn;
      var blueEl = document.getElementById('home-led-blue-' + num);
      if (blueEl) blueEl.textContent = standby;
      var redEl = document.getElementById('home-led-red-' + num);
      if (redEl) redEl.textContent = alarms;
    }

    _updateClock();
  }

  // ---- ALARMS ----
  var _alarmSource = 'threshold';

  function setAlarmSource(source) {
    _alarmSource = source;

    var tabs = document.querySelectorAll('.alarm-source-tab');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-source') === source) {
        tabs[i].classList.add('active');
      } else {
        tabs[i].classList.remove('active');
      }
    }

    var thresholdPanel = document.getElementById('alarm-panel-threshold');
    var niagaraPanel = document.getElementById('alarm-panel-niagara');
    if (thresholdPanel) thresholdPanel.style.display = source === 'threshold' ? '' : 'none';
    if (niagaraPanel) niagaraPanel.style.display = source === 'niagara' ? '' : 'none';

    if (source === 'niagara' && SNLS.NiagaraAlarms) {
      SNLS.NiagaraAlarms.fetchAlarms(function() {
        SNLS.NiagaraAlarms.renderAlarmTable('niagara-alarms-tbody');
        SNLS.NiagaraAlarms.renderPagination('niagara-alarms-pagination');
      });
    }
  }

  function _renderAlarms() {
    if (SNLS.NiagaraAlarms) {
      SNLS.NiagaraAlarms.fetchAlarms(function() {
        SNLS.NiagaraAlarms.renderAlarmTable('niagara-alarms-tbody');
        SNLS.NiagaraAlarms.renderPagination('niagara-alarms-pagination');
      });
    }
  }

  // ---- SCHEDULES ----
  function _renderSchedules() {
    if (SNLS.ScheduleView) {
      SNLS.ScheduleView.render();
    }
  }

  // ---- BUILDING ----
  function _renderBuilding() {
    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];

    // Render floor tabs
    var tabsEl = document.getElementById('bld-floor-tabs');
    if (tabsEl) {
      var tabsHtml = '';
      for (var t = 0; t < floors.length; t++) {
        var active = floors[t].number === _buildingFloor ? ' active' : '';
        tabsHtml += '<button class="floor-tab' + active + '" ' +
          'onclick="window.SNLS.setBuildingFloor(' + floors[t].number + ')">' +
          floors[t].name + '</button>';
      }
      tabsEl.innerHTML = tabsHtml;
    }

    // Render floor plan image + markers
    var wrap = document.getElementById('bld-floorplan-wrap');
    if (!wrap) return;

    var imgSrc = 'img/piso3d-' + _buildingFloor + '.jpeg';
    var positions = BUILDING_RTU_POSITIONS[_buildingFloor] || [];

    // Get equipment data for this floor
    var floorKey = 'piso' + _buildingFloor;
    var equipList = _allEquipment[floorKey] || [];

    // Build lookup by RTU number
    var equipLookup = {};
    for (var e = 0; e < equipList.length; e++) {
      var name = equipList[e].equipName || equipList[e].tag || '';
      // Extract RTU number from name like "RTU 1.4"
      var match = name.match(/(\d+\.\d+)/);
      if (match) equipLookup[match[1]] = equipList[e];
    }

    var markersHtml = '';
    for (var p = 0; p < positions.length; p++) {
      var pos = positions[p];
      var eq = equipLookup[pos.num];
      var statusCls = 'off';
      if (eq) {
        if (eq.alarm) statusCls = 'alarm';
        else if (eq.fanOn) statusCls = 'on';
      }
      markersHtml += '<div class="bld-marker ' + statusCls + '" ' +
        'style="left:' + pos.x + '%;top:' + pos.y + '%" ' +
        'onclick="window.SNLS.showBuildingPopover(\'' + _escJs(pos.num) + '\',' + _buildingFloor + ',event)">' +
        pos.num + '</div>';
    }

    // Build arrow SVG lines (only for floors that have them)
    var arrowsSvg = '';
    var arrows = BUILDING_ARROWS[_buildingFloor];
    if (arrows) {
      var arrowLines = '';
      for (var a = 0; a < arrows.length; a++) {
        var ar = arrows[a];
        // Find matching position
        for (var ap = 0; ap < positions.length; ap++) {
          if (positions[ap].num === ar.num) {
            // Offset start point to edge of label (not center)
            var sx = positions[ap].x;
            var sy = positions[ap].y;
            var dx = ar.ax - sx;
            var dy = ar.ay - sy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            // Move start 2% along the direction (approx label half-size)
            var offset = 2;
            if (dist > 0) {
              sx = sx + (dx / dist) * offset;
              sy = sy + (dy / dist) * offset;
            }
            arrowLines += '<line x1="' + sx.toFixed(1) + '%" y1="' + sy.toFixed(1) + '%" ' +
              'x2="' + ar.ax + '%" y2="' + ar.ay + '%" />';
            arrowLines += '<circle cx="' + ar.ax + '%" cy="' + ar.ay + '%" r="3" />';
            break;
          }
        }
      }
      if (arrowLines) {
        arrowsSvg = '<svg class="bld-arrows-layer" viewBox="0 0 100 100" preserveAspectRatio="none">' +
          arrowLines + '</svg>';
      }
    }

    wrap.innerHTML = '<div class="bld-floorplan-inner">' +
      '<img class="bld-floorplan-img" src="' + imgSrc + '" alt="Piso ' + _buildingFloor + '">' +
      arrowsSvg +
      '<div class="bld-markers-layer">' + markersHtml + '</div>' +
      '<div id="bld-popover" class="bld-popover" style="display:none"></div>' +
    '</div>';

    // Popover is re-created inside the inner container on each render
    _buildingPopover = null;
  }

  function _setBuildingFloor(num) {
    _buildingFloor = num;
    _buildingPopover = null;
    var popover = document.getElementById('bld-popover');
    if (popover) popover.style.display = 'none';
    _renderBuilding();
  }

  function _showBuildingPopover(rtuNum, floorNum, event) {
    event.stopPropagation();
    var popover = document.getElementById('bld-popover');
    if (!popover) return;

    var floorKey = 'piso' + floorNum;
    var equipList = _allEquipment[floorKey] || [];
    var equip = null;
    for (var i = 0; i < equipList.length; i++) {
      var name = equipList[i].equipName || equipList[i].tag || '';
      if (name.indexOf(rtuNum) !== -1) {
        equip = equipList[i];
        break;
      }
    }

    var equipName = equip ? (equip.equipName || equip.tag || 'RTU ' + rtuNum) : 'RTU ' + rtuNum;
    var temp = equip ? (parseFloat(equip.tempAmbiente) || 0).toFixed(1) : '--';
    var sp = equip ? Math.round(parseFloat(equip.setPointCool) || 22) : 22;
    var statusText = 'Sin datos';
    var statusCls = 'off';
    if (equip) {
      if (equip.alarm) { statusText = 'Alarma'; statusCls = 'alarm'; }
      else if (equip.fanOn) { statusText = 'Encendida'; statusCls = 'on'; }
      else { statusText = 'En espera'; statusCls = 'off'; }
    }

    _buildingPopover = { rtuNum: rtuNum, floorNum: floorNum };

    popover.innerHTML =
      '<div class="bld-popover-header">' +
        '<span class="bld-popover-title">RTU ' + _escHtml(rtuNum) + '</span>' +
        '<span class="bld-popover-badge ' + statusCls + '">' + statusText + '</span>' +
        '<button class="bld-popover-close" onclick="window.SNLS.closeBuildingPopover()">&times;</button>' +
      '</div>' +
      '<div class="bld-popover-body">' +
        '<div class="bld-popover-row">' +
          '<span class="bld-popover-label">Temp Ambiente</span>' +
          '<span class="bld-popover-value">' + temp + ' \u00b0C</span>' +
        '</div>' +
        '<div class="bld-popover-row bld-popover-sp-row">' +
          '<span class="bld-popover-label">Setpoint</span>' +
          '<div class="bld-popover-sp-controls">' +
            '<button class="detail-sp-btn" onclick="window.SNLS.adjustBuildingSp(-1,\'' + _escJs(rtuNum) + '\',' + floorNum + ')">-</button>' +
            '<input type="text" class="bld-popover-sp-input" id="bld-sp-input" value="' + sp + '" ' +
              'onkeydown="window.SNLS.onSpKeyDown(event)" ' +
              'onblur="window.SNLS.submitBuildingSp(\'' + _escJs(rtuNum) + '\',' + floorNum + ')" ' +
              'inputmode="numeric">' +
            '<span class="detail-point-unit">\u00b0C</span>' +
            '<button class="detail-sp-btn" onclick="window.SNLS.adjustBuildingSp(1,\'' + _escJs(rtuNum) + '\',' + floorNum + ')">+</button>' +
          '</div>' +
        '</div>' +
        '<button class="bld-popover-link" onclick="window.SNLS.goToDetailFromBuilding(\'' + _escJs(floorKey) + '\',\'' + _escJs(equipName) + '\')">' +
          'Ver Detalle &rarr;' +
        '</button>' +
      '</div>';

    popover.style.display = '';

    // Position popover directly below the clicked marker (extension of label)
    var marker = event.currentTarget || event.target;
    var inner = document.querySelector('.bld-floorplan-inner');
    if (marker && inner) {
      var innerRect = inner.getBoundingClientRect();
      var markerRect = marker.getBoundingClientRect();
      var pw = 280;

      // Marker center relative to inner container
      var mcx = markerRect.left + markerRect.width / 2 - innerRect.left;
      var mby = markerRect.bottom - innerRect.top;

      // Place popover centered below marker, no gap (touching the marker)
      var left = mcx - pw / 2;
      var top = mby;

      // Keep within bounds
      if (left < 0) left = 0;
      if (left + pw > innerRect.width) left = innerRect.width - pw;

      // Arrow should point to marker center
      var arrowLeft = mcx - left;
      if (arrowLeft < 16) arrowLeft = 16;
      if (arrowLeft > pw - 16) arrowLeft = pw - 16;

      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
      popover.className = 'bld-popover bld-popover-arrow-top';
      popover.style.setProperty('--arrow-left', arrowLeft + 'px');
    }
  }

  function _closeBuildingPopover() {
    _buildingPopover = null;
    var popover = document.getElementById('bld-popover');
    if (popover) {
      popover.style.display = 'none';
      popover.className = 'bld-popover';
    }
  }

  function _adjustBuildingSp(delta, rtuNum, floorNum) {
    var input = document.getElementById('bld-sp-input');
    if (!input) return;
    var current = parseInt(input.value, 10) || 22;
    var newVal = current + delta;
    input.value = newVal;
    _sendBuildingSp(newVal, rtuNum, floorNum);
  }

  function _submitBuildingSp(rtuNum, floorNum) {
    var input = document.getElementById('bld-sp-input');
    if (!input) return;
    var val = parseInt(input.value, 10);
    if (isNaN(val)) { input.value = '22'; return; }
    input.value = val;
    _sendBuildingSp(val, rtuNum, floorNum);
  }

  function _sendBuildingSp(value, rtuNum, floorNum) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.setpoint) return;
    var floorKey = 'piso' + floorNum;
    var equipList = _allEquipment[floorKey] || [];
    var equipName = '';
    for (var i = 0; i < equipList.length; i++) {
      var name = equipList[i].equipName || equipList[i].tag || '';
      if (name.indexOf(rtuNum) !== -1) {
        equipName = name;
        break;
      }
    }
    if (!equipName) return;

    var body = JSON.stringify({
      floorKey: floorKey,
      equipName: equipName,
      property: 'setPointCool',
      value: String(value)
    });
    var xhr = new XMLHttpRequest();
    xhr.open('POST', cfg.api.setpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(body);
  }

  function _goToDetailFromBuilding(floorKey, equipName) {
    _closeBuildingPopover();
    if (SNLS.Router) {
      SNLS.Router.navigate('detail/' + floorKey + '/' + encodeURIComponent(equipName));
    }
  }

  // ---- EQUIPMENT ----
  function _renderEquipment() {
    if (SNLS.ViewManager) {
      SNLS.ViewManager.renderEquipment();
    }
  }

  // ---- Equipment Histories (auto-detection) ----

  function _fetchEquipmentHistories(floorKey, callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.equipmentHistories) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.equipmentHistories + floorKey, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          _equipHistories[floorKey] = data;
          if (callback) callback(data);
        } catch (e) {}
      }
    };
    xhr.send();
  }

  // ---- DETAIL (Reflow style — full page) ----

  function _renderDetail(params) {
    if (!params) return;
    var floorKey = params.floorKey;
    var equipName = params.equipName;

    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];
    var floorName = floorKey;
    for (var f = 0; f < floors.length; f++) {
      if (floors[f].key === floorKey) {
        floorName = floors[f].name;
        break;
      }
    }

    var equip = SNLS.ViewManager ? SNLS.ViewManager.findEquipment(floorKey, equipName) : null;
    var container = document.getElementById('detail-content');
    if (!container) return;

    if (!equip) {
      container.innerHTML = '<div class="empty-state-enhanced">' +
        '<p>Equipo no encontrado: ' + equipName + '</p>' +
        '<div class="text-sm">Esperando datos del servidor...</div></div>';
      _detailRenderedKey = null;
      return;
    }

    var fanOn = !!equip.fanOn;
    var chilledWater = !!equip.chilledWater;
    var networkConn = !!equip.networkConnection;
    var tempAmbiente = parseFloat(equip.tempAmbiente) || 0;
    var humidity = parseFloat(equip.humidity) || 0;
    var setPointCool = parseFloat(equip.setPointCool) || 22;

    var detailKey = floorKey + '/' + equipName;

    // If same equipment is already rendered, only update values (no HTML rebuild)
    if (_detailRenderedKey === detailKey) {
      _updateDetailValues(fanOn, chilledWater, networkConn, tempAmbiente, humidity, setPointCool);
      if (_detailFCU) _detailFCU.setFanOn(fanOn);
      return;
    }

    // Full render (first time or equipment changed)
    _detailRenderedKey = detailKey;

    // Check for available histories
    var histories = _equipHistories[floorKey] && _equipHistories[floorKey][equipName];

    var breadcrumb =
      '<div class="detail-breadcrumb">' +
        '<a href="javascript:void(0)" onclick="window.SNLS.Router.navigate(\'equipment\')">Equipment</a>' +
        ' <span class="detail-bc-sep">/</span> ' +
        '<a href="javascript:void(0)" onclick="window.SNLS.Router.navigate(\'equipment\');window.SNLS.setFloor(\'' + _escJs(floorKey.replace('piso', '')) + '\')">' + _escHtml(floorName) + '</a>' +
        ' <span class="detail-bc-sep">/</span> ' +
        '<span>' + equipName + '</span>' +
        '<button class="detail-back-btn" onclick="window.SNLS.Router.navigate(\'equipment\')">' +
          '&larr; Volver' +
        '</button>' +
      '</div>';

    var titleHtml =
      '<div class="detail-title-section">' +
        '<h2 class="detail-equip-name">' + equipName + '</h2>' +
        '<div class="detail-equip-meta">' + floorName +
          (equip.ipAddress ? ' &middot; ' + equip.ipAddress : '') +
        '</div>' +
      '</div>';

    var layoutHtml =
      '<div class="detail-layout">' +
        '<div class="detail-fcu-wrap">' +
          '<canvas id="detail-fcu-canvas"></canvas>' +
        '</div>' +
        '<div class="detail-points-col">' +
          _fanToggleCardHtml(fanOn) +
          _boolCardHtml('Agua Helada', chilledWater, 'detail-val-cw') +
          _boolCardHtml('Red Termostato', networkConn, 'detail-val-net') +
        '</div>' +
        '<div class="detail-points-col">' +
          _numCardHtml('Temp Ambiente', tempAmbiente, '\u00b0C', 'detail-val-temp',
            histories && histories.tempAmbiente ? histories.tempAmbiente : null) +
          _setPointCardHtml(setPointCool) +
          _numCardHtml('Humedad', humidity, '%', 'detail-val-hum',
            histories && histories.humidity ? histories.humidity : null) +
        '</div>' +
      '</div>';

    // Schedule section (only if RTU has a schedule)
    var scheduleHtml = '';
    if (equip.scheduleOrd) {
      var schedClass = equip.scheduleActive ? 'active' : 'inactive';
      var schedText = equip.scheduleActive ? 'EN HORARIO' : 'FUERA DE HORARIO';
      scheduleHtml =
        '<div class="detail-schedule-section">' +
          '<div class="detail-section-title">Horario</div>' +
          '<div class="schedule-status-card">' +
            '<div class="schedule-status-indicator ' + schedClass + '"></div>' +
            '<div class="schedule-info">' +
              '<div class="schedule-status-text ' + schedClass + '">' + schedText + '</div>' +
            '</div>' +
            '<button class="schedule-edit-btn" onclick="window.SNLS.openScheduleEditor(\'' + _escJs(equip.scheduleOrd) + '\',\'' + _escJs(equipName) + '\')">Editar Horario</button>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML = breadcrumb + titleHtml + layoutHtml + scheduleHtml;

    // Always refresh equipment histories (linkmarks may have changed)
    _fetchEquipmentHistories(floorKey, function() {
      if (_detailRenderedKey !== detailKey) return;
      var freshHist = _equipHistories[floorKey] && _equipHistories[floorKey][equipName];
      if (freshHist && !histories) {
        _detailRenderedKey = null;
        _renderDetail(params);
      }
    });

    // Initialize FCU animation (only on full render)
    if (_detailFCU) {
      _detailFCU.destroy();
      _detailFCU = null;
    }
    if (SNLS.FCUAnimator) {
      var fcuCanvas = document.getElementById('detail-fcu-canvas');
      if (fcuCanvas) {
        _detailFCU = SNLS.FCUAnimator.create(fcuCanvas, {
          introPath: 'img/fcu/intro/',
          loopPath: 'img/fcu/loop/'
        });
        if (_detailFCU) _detailFCU.setFanOn(fanOn);
      }
    }
  }

  function _fanToggleCardHtml(fanOn) {
    var cls = fanOn ? 'detail-point-on' : 'detail-point-off';
    var btnLabel = fanOn ? 'APAGAR' : 'ENCENDER';
    var btnClass = fanOn ? 'fan-toggle-off' : 'fan-toggle-on';
    var cmdValue = fanOn ? 5 : 2;
    return '<div class="detail-point-card ' + cls + '" id="detail-val-fan-card">' +
      '<div class="detail-point-label">Fan</div>' +
      '<div class="detail-point-value" id="detail-val-fan">' + (fanOn ? 'ON' : 'OFF') + '</div>' +
      '<button class="fan-toggle-btn ' + btnClass + '" ' +
        'onclick="window.SNLS.sendFanCommand(' + cmdValue + ')">' + btnLabel + '</button>' +
    '</div>';
  }

  function _boolCardHtml(label, active, id) {
    var cls = active ? 'detail-point-on' : 'detail-point-off';
    return '<div class="detail-point-card ' + cls + '" id="' + id + '-card">' +
      '<div class="detail-point-label">' + label + '</div>' +
      '<div class="detail-point-value" id="' + id + '">' + (active ? 'ON' : 'OFF') + '</div>' +
    '</div>';
  }

  function _numCardHtml(label, value, unit, id, historyId) {
    var ic = (SNLS.Icons && SNLS.Icons.get) ? SNLS.Icons.get : function() { return ''; };
    var html = '<div class="detail-point-card" id="' + id + '-card">';
    html += '<div class="detail-point-label">' + label + '</div>';
    html += '<div class="detail-point-value" id="' + id + '">' + parseFloat(value).toFixed(1) +
      ' <span class="detail-point-unit">' + unit + '</span></div>';
    if (historyId) {
      html += '<button class="detail-history-btn-card" ' +
        'onclick="window.SNLS.toggleDetailHistory(\'' + _escJs(id) + '\',\'' + _escJs(historyId) + '\',\'' + _escJs(label) + '\')">' +
        ic('activity', 14) + ' Ver Historial' +
      '</button>';
      html += '<div class="detail-point-chart-wrap" id="' + id + '-chart-wrap" style="display:none">' +
        '<div id="' + id + '-range" class="detail-history-range"></div>' +
        '<button class="history-fullview-btn" onclick="window.SNLS.goToFullHistory(\'' + _escJs(historyId) + '\')">Ver completo &#8599;</button>' +
        '<div class="detail-point-chart-container">' +
          '<canvas id="' + id + '-chart"></canvas>' +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  /** Update only the values in the detail page without rebuilding HTML/canvas */
  function _updateDetailValues(fanOn, chilledWater, networkConn, tempAmbiente, humidity, setPointCool) {
    function _setBool(id, active) {
      var el = document.getElementById(id);
      var card = document.getElementById(id + '-card');
      if (el) el.textContent = active ? 'ON' : 'OFF';
      if (card) {
        card.className = 'detail-point-card ' + (active ? 'detail-point-on' : 'detail-point-off');
      }
    }
    // Fan card update (includes toggle button refresh)
    var fanEl = document.getElementById('detail-val-fan');
    var fanCard = document.getElementById('detail-val-fan-card');
    if (fanEl) fanEl.textContent = fanOn ? 'ON' : 'OFF';
    if (fanCard) {
      fanCard.className = 'detail-point-card ' + (fanOn ? 'detail-point-on' : 'detail-point-off');
      var toggleBtn = fanCard.querySelector('.fan-toggle-btn');
      if (toggleBtn) {
        toggleBtn.textContent = fanOn ? 'APAGAR' : 'ENCENDER';
        toggleBtn.className = 'fan-toggle-btn ' + (fanOn ? 'fan-toggle-off' : 'fan-toggle-on');
        toggleBtn.setAttribute('onclick', 'window.SNLS.sendFanCommand(' + (fanOn ? 5 : 2) + ')');
      }
    }
    _setBool('detail-val-cw', chilledWater);
    _setBool('detail-val-net', networkConn);

    var tempEl = document.getElementById('detail-val-temp');
    if (tempEl) tempEl.innerHTML = parseFloat(tempAmbiente).toFixed(1) + ' <span class="detail-point-unit">\u00b0C</span>';
    if (SNLS.SetPointUI) SNLS.SetPointUI.updateValue(setPointCool);
    var humEl = document.getElementById('detail-val-hum');
    if (humEl) humEl.innerHTML = parseFloat(humidity).toFixed(1) + ' <span class="detail-point-unit">%</span>';
  }

  // ---- HISTORIES ----

  function goToFullHistory(historyId) {
    SNLS.Router.navigate('histories?id=' + encodeURIComponent(historyId));
  }

  function _renderHistories() {
    if (SNLS.HistoryChart) {
      var allEquip = SNLS.ViewManager ? SNLS.ViewManager.getAllEquipmentFlat() : [];
      SNLS.HistoryChart.render(allEquip);
    }

    if (SNLS.NiagaraHistory) {
      SNLS.NiagaraHistory.render('histories-main-container');
    }
  }

  // ---- Clock ----
  function _updateClock() {
    var headerClock = document.getElementById('header-clock');
    if (headerClock) {
      var now = new Date();
      headerClock.textContent = now.toLocaleString('es-MX', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }

  // ---- Particle Animation (delegated to ParticleAnimation.js) ----
  function _initParticles() {
    if (SNLS.ParticleAnimation) SNLS.ParticleAnimation.init();
  }

  // ---- Set Point (delegated to SetPointUI.js) ----

  function _setPointCardHtml(coolValue) {
    return SNLS.SetPointUI ? SNLS.SetPointUI.renderCard(coolValue) : '';
  }

  // ---- Detail History — inline chart in point card ----

  function toggleDetailHistory(cardId, historyId, label) {
    var wrap = document.getElementById(cardId + '-chart-wrap');
    if (!wrap) return;

    var isOpen = wrap.style.display !== 'none';
    if (isOpen) {
      wrap.style.display = 'none';
      if (_inlineCharts[cardId]) {
        _inlineCharts[cardId].destroy();
        delete _inlineCharts[cardId];
      }
      return;
    }

    wrap.style.display = '';
    _detailHistoryId = historyId;
    _detailHistoryRange = 'lastHour';

    // Render range buttons
    var rangeContainer = document.getElementById(cardId + '-range');
    if (rangeContainer) {
      var rhtml = '';
      var RANGES = [
        { key: 'lastHour', label: '1h' },
        { key: 'last8Hours', label: '8h' },
        { key: 'today', label: 'Hoy' },
        { key: 'last24Hours', label: '24h' },
        { key: 'last7Days', label: '7d' }
      ];
      for (var r = 0; r < RANGES.length; r++) {
        var active = RANGES[r].key === _detailHistoryRange ? ' active' : '';
        rhtml += '<button class="history-range-btn' + active + '" ' +
          'data-range="' + RANGES[r].key + '" ' +
          'onclick="window.SNLS.loadInlineHistory(\'' + _escJs(cardId) + '\',\'' +
            _escJs(historyId) + '\',this.getAttribute(\'data-range\'))">' +
          RANGES[r].label + '</button>';
      }
      rangeContainer.innerHTML = rhtml;
    }

    // Load data
    _loadInlineChart(cardId, historyId, 'lastHour');
  }

  function loadInlineHistory(cardId, historyId, range) {
    // Update active button
    var rangeContainer = document.getElementById(cardId + '-range');
    if (rangeContainer) {
      var btns = rangeContainer.querySelectorAll('.history-range-btn');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-range') === range) {
          btns[i].classList.add('active');
        } else {
          btns[i].classList.remove('active');
        }
      }
    }
    _loadInlineChart(cardId, historyId, range);
  }

  function _loadInlineChart(cardId, historyId, range) {
    if (!SNLS.NiagaraHistory) return;
    SNLS.NiagaraHistory.loadHistoryData(historyId, range, function(resp) {
      _renderInlineChart(cardId, resp);
    });
  }

  function _renderInlineChart(cardId, historyData) {
    var canvas = document.getElementById(cardId + '-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    var data = historyData.data || [];
    var labels = [];
    var values = [];
    for (var i = 0; i < data.length; i++) {
      labels.push(new Date(data[i][0]));
      values.push(data[i][1]);
    }

    if (_inlineCharts[cardId]) {
      _inlineCharts[cardId].destroy();
    }

    _inlineCharts[cardId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: historyData.title || '',
          data: values,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0, 212, 170, 0.08)',
          borderWidth: 2,
          pointRadius: data.length > 200 ? 0 : 2,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'dd/MM HH:mm', displayFormats: { minute: 'HH:mm', hour: 'HH:mm', day: 'dd/MM' } },
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { font: { size: 9 }, color: '#94a3b8', maxTicksLimit: 6 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { font: { size: 10 }, color: '#94a3b8' },
            title: { display: !!historyData.units, text: historyData.units || '', font: { size: 10 }, color: '#94a3b8' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: 'rgba(6,8,13,0.9)', bodyFont: { family: "'JetBrains Mono', monospace" } }
        }
      }
    });
  }

  function _escJs(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function _escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
  function _escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  // ---- Navigation helpers ----
  function navigateToFloor(floorNum) {
    _buildingFloor = floorNum;
    if (SNLS.Router) {
      SNLS.Router.navigate('building');
    }
  }

  function goToAlarm() {
    if (SNLS.Router) {
      SNLS.Router.navigate('alarms');
    }
  }

  // ---- Polling + Dual-Channel Start ----
  function _startPolling() {
    _pollAllData();

    // REST polling always at 5s — provides reliable baseline.
    // BajaScript push is a bonus for instant updates when available.
    // Skip REST fetch for floors that BajaScript updated recently (<4s).
    _pollTimer = setInterval(function() {
      _pollAllData();
      _renderIfNeeded();
    }, 5000);

    // Lightweight clock update every 1s
    _clockTimer = setInterval(_updateClock, 1000);
  }

  // ---- Init ----
  function init() {
    _initParticles();

    if (SNLS.ConfigManager) {
      SNLS.ConfigManager.load(function() {
        if (SNLS.Router) SNLS.Router.init();
        if (SNLS.ViewManager) {
          SNLS.ViewManager.initSearch();
          SNLS.ViewManager.initModal();
        }
        if (SNLS.FloorPlanManager) SNLS.FloorPlanManager.init();
        if (SNLS.SubscriptionPool) SNLS.SubscriptionPool.init();

        // Hook navigation to manage BajaScript subscriptions per page
        if (SNLS.Router && SNLS.Router.onNavigate) {
          SNLS.Router.onNavigate(function(page, params, prevPage) {
            _setupSubscriptions(page, params);
          });
        }

        // Initial subscriptions for the entry page
        var initHash = window.location.hash.slice(1) || 'home';
        _setupSubscriptions(initHash.split('/')[0], null);

        if (SNLS.NiagaraAlarms) {
          SNLS.NiagaraAlarms.startCountPolling(function(counts) {
            var badge = document.getElementById('nav-alarm-badge');
            if (badge && counts && counts.unacked > 0) {
              badge.textContent = counts.unacked;
              badge.style.display = '';
            }
          });
        }

        _startPolling();
        _updateClock();
      });
    } else {
      if (SNLS.Router) SNLS.Router.init();
      _startPolling();
    }
  }

  // ---- Fan Command ----
  function sendFanCommand(value) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.setpoint) return;
    var params = SNLS.DashboardApp && SNLS.DashboardApp.getCurrentParams
      ? SNLS.DashboardApp.getCurrentParams() : _currentParams;
    if (!params) return;

    var body = JSON.stringify({
      floorKey: params.floorKey,
      equipName: params.equipName,
      property: 'fanCommand',
      value: String(value)
    });
    var xhr = new XMLHttpRequest();
    xhr.open('POST', cfg.api.setpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(body);
  }

  // Expose globals
  window.SNLS = window.SNLS || {};
  window.SNLS.navigateToFloor = navigateToFloor;
  window.SNLS.goToAlarm = goToAlarm;
  window.SNLS.setAlarmSource = setAlarmSource;
  window.SNLS.toggleDetailHistory = toggleDetailHistory;
  window.SNLS.loadInlineHistory = loadInlineHistory;
  window.SNLS.goToFullHistory = goToFullHistory;
  window.SNLS.sendFanCommand = sendFanCommand;
  window.SNLS.setBuildingFloor = _setBuildingFloor;
  window.SNLS.showBuildingPopover = _showBuildingPopover;
  window.SNLS.closeBuildingPopover = _closeBuildingPopover;
  window.SNLS.adjustBuildingSp = _adjustBuildingSp;
  window.SNLS.submitBuildingSp = _submitBuildingSp;
  window.SNLS.goToDetailFromBuilding = _goToDetailFromBuilding;
  window.SNLS.openScheduleEditor = function(navOrd, name) {
    if (!navOrd) return;
    var iframeUrl = '/ord/' + encodeURI(navOrd + '|view:schedule:WebScheduler') + '?fullScreen=true';
    var title = name || 'Schedule';
    var html =
      '<div class="schedule-modal-overlay" onclick="window.SNLS.closeScheduleModal()">' +
        '<div class="schedule-modal" onclick="event.stopPropagation()">' +
          '<div class="schedule-modal-header">' +
            '<div class="schedule-modal-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
                '<line x1="16" y1="2" x2="16" y2="6"/>' +
                '<line x1="8" y1="2" x2="8" y2="6"/>' +
                '<line x1="3" y1="10" x2="21" y2="10"/>' +
              '</svg> ' + _escHtml(title) +
            '</div>' +
            '<button class="schedule-modal-close" onclick="window.SNLS.closeScheduleModal()" title="Cerrar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<iframe class="schedule-modal-iframe" src="' + iframeUrl.replace(/"/g, '&quot;') + '" frameborder="0" allowfullscreen></iframe>' +
        '</div>' +
      '</div>';
    var root = document.createElement('div');
    root.id = 'schedule-modal-root';
    root.innerHTML = html;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
  };
  window.SNLS.closeScheduleModal = function() {
    var root = document.getElementById('schedule-modal-root');
    if (root) root.parentNode.removeChild(root);
    document.body.style.overflow = '';
  };

  SNLS.DashboardApp = {
    init: init,
    renderPage: renderPage,
    getCurrentParams: function() { return _currentParams; }
  };

  window.SNLS = SNLS;

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
    if (SNLS.SubscriptionPool) { SNLS.SubscriptionPool.cleanup('page'); }
  });

  // Close building popover on outside click
  document.addEventListener('click', function(e) {
    if (!_buildingPopover) return;
    var popover = document.getElementById('bld-popover');
    if (!popover) return;
    // If click is on marker or inside popover, do nothing
    if (e.target.closest && (e.target.closest('.bld-popover') || e.target.closest('.bld-marker'))) return;
    _closeBuildingPopover();
  });

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    SNLS.DashboardApp.init();
  });

})(window);
