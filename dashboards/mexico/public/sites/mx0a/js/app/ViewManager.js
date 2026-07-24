(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  function _escJs(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function _escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var _currentFloor = 'all';
  var _searchQuery = '';
  var _searchTimeout = null;
  var _modalEquip = null;
  var _allEquipment = {};
  var _fcuAnimator = null;
  var _currentPage = 0;
  var _pageSize = 12;

  function setEquipmentData(floorKey, equipList) {
    _allEquipment[floorKey] = equipList;
  }

  function getAllEquipmentFlat() {
    var result = [];
    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];
    for (var i = 0; i < floors.length; i++) {
      var list = _allEquipment[floors[i].key] || [];
      for (var j = 0; j < list.length; j++) {
        result.push(list[j]);
      }
    }
    return result;
  }

  /**
   * Get the floor key for a given equip object.
   */
  function _getFloorKeyForEquip(equip) {
    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];
    for (var f = 0; f < floors.length; f++) {
      var list = _allEquipment[floors[f].key] || [];
      for (var j = 0; j < list.length; j++) {
        var eName = list[j].equipName || list[j].tag || '';
        var eTarget = equip.equipName || equip.tag || '';
        if (eName === eTarget) return floors[f].key;
      }
    }
    return '';
  }

  function _getFilteredRtus() {
    var cfg = window.SNLS_CONFIG;
    var floors = cfg ? cfg.floors : [];
    var rtus = [];

    if (_currentFloor === 'all') {
      rtus = getAllEquipmentFlat();
    } else {
      for (var f = 0; f < floors.length; f++) {
        if (floors[f].number === Number(_currentFloor)) {
          rtus = _allEquipment[floors[f].key] || [];
          break;
        }
      }
    }

    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      var filtered = [];
      for (var r = 0; r < rtus.length; r++) {
        var rtu = rtus[r];
        var name = (rtu.equipName || rtu.tag || '').toLowerCase();
        var ip = (rtu.ipAddress || '').toLowerCase();
        var loc = (rtu.location || '').toLowerCase();
        if (name.indexOf(q) >= 0 || ip.indexOf(q) >= 0 || loc.indexOf(q) >= 0) {
          filtered.push(rtu);
        }
      }
      rtus = filtered;
    }

    return rtus;
  }

  function renderEquipment() {
    var tabs = document.querySelectorAll('.floor-tab');
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.getAttribute('data-floor') === String(_currentFloor)) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }

    var searchIcon = document.getElementById('search-icon');
    var ic = SNLS.Icons ? SNLS.Icons.get : function() { return ''; };
    if (searchIcon && !searchIcon._injected) {
      searchIcon.innerHTML = ic('search', 16);
      searchIcon._injected = true;
    }

    var rtus = _getFilteredRtus();

    // Paginate
    var totalItems = rtus.length;
    var totalPages = Math.ceil(totalItems / _pageSize) || 1;
    if (_currentPage >= totalPages) _currentPage = totalPages - 1;
    if (_currentPage < 0) _currentPage = 0;

    var start = _currentPage * _pageSize;
    var paginatedRtus = rtus.slice(start, start + _pageSize);

    _renderGrid(paginatedRtus);
    _renderPagination(totalItems, totalPages);
  }

  function _renderGrid(rtus) {
    var container = document.getElementById('rtu-grid-container');
    if (!container) return;
    var ic = SNLS.Icons ? SNLS.Icons.get : function() { return ''; };

    if (rtus.length === 0) {
      container.innerHTML = '<div class="empty-state-enhanced" style="grid-column:1/-1">' +
        ic('search', 48) +
        '<p>Sin resultados</p>' +
        '<div class="text-sm">Intenta con otro termino de busqueda</div>' +
        '</div>';
      return;
    }

    var card = SNLS.EquipmentCard;
    if (!card) return;

    var html = '';
    for (var i = 0; i < rtus.length; i++) {
      var fKey = _getFloorKeyForEquip(rtus[i]);
      html += card.renderCard(rtus[i], fKey);
    }
    container.innerHTML = html;
  }

  function _renderPagination(totalItems, totalPages) {
    var container = document.getElementById('equip-pagination');
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var prevDisabled = _currentPage <= 0 ? ' disabled' : '';
    var nextDisabled = _currentPage >= totalPages - 1 ? ' disabled' : '';

    container.innerHTML =
      '<div class="equip-pagination">' +
        '<button class="pagination-btn"' + prevDisabled + ' onclick="window.SNLS.equipPagePrev()">Anterior</button>' +
        '<span class="pagination-info">' + (_currentPage + 1) + ' / ' + totalPages +
          ' (' + totalItems + ' equipos)</span>' +
        '<button class="pagination-btn"' + nextDisabled + ' onclick="window.SNLS.equipPageNext()">Siguiente</button>' +
      '</div>';
  }

  function equipPagePrev() {
    if (_currentPage > 0) {
      _currentPage--;
      renderEquipment();
    }
  }

  function equipPageNext() {
    var rtus = _getFilteredRtus();
    var totalPages = Math.ceil(rtus.length / _pageSize) || 1;
    if (_currentPage < totalPages - 1) {
      _currentPage++;
      renderEquipment();
    }
  }

  function setFloor(floor) {
    _currentFloor = floor;
    _currentPage = 0;
    renderEquipment();
  }

  function initSearch() {
    var input = document.getElementById('equip-search');
    if (!input) return;
    input.addEventListener('input', function() {
      clearTimeout(_searchTimeout);
      _searchTimeout = setTimeout(function() {
        _searchQuery = input.value.trim();
        _currentPage = 0;
        renderEquipment();
      }, 200);
    });
  }

  // ---- RTU Detail Modal ----

  function openModal(equip) {
    if (typeof equip === 'string') {
      try { equip = JSON.parse(unescape(equip)); } catch (e) { return; }
    }
    _modalEquip = equip;
    var overlay = document.getElementById('rtu-modal');
    if (!overlay) return;
    overlay.style.display = 'flex';
    _renderModal();

    if (SNLS.FCUAnimator) {
      var fcuCanvas = document.getElementById('modal-fcu-canvas');
      if (fcuCanvas) {
        _fcuAnimator = SNLS.FCUAnimator.create(fcuCanvas, {
          introPath: 'img/fcu/intro/',
          loopPath: 'img/fcu/loop/'
        });
        if (_fcuAnimator) {
          _fcuAnimator.setFanOn(!!equip.fanOn);
        }
      }
    }

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (_fcuAnimator) {
      _fcuAnimator.destroy();
      _fcuAnimator = null;
    }
    var overlay = document.getElementById('rtu-modal');
    if (overlay) overlay.style.display = 'none';
    _modalEquip = null;
    document.body.style.overflow = '';
  }

  function initModal() {
    var ic = SNLS.Icons ? SNLS.Icons.get : function() { return ''; };
    var closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
      closeBtn.innerHTML = ic('x', 20);
      closeBtn.addEventListener('click', closeModal);
    }
    var overlay = document.getElementById('rtu-modal');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (_modalEquip !== null) closeModal();
        else if (SNLS.FloorPlanManager && SNLS.FloorPlanManager.isOpen()) {
          SNLS.FloorPlanManager.close();
        }
      }
    });
  }

  function _renderModal() {
    if (!_modalEquip) return;
    var equip = _modalEquip;
    var ic = SNLS.Icons ? SNLS.Icons.get : function() { return ''; };

    var name = equip.equipName || equip.tag || 'RTU';
    var loc = equip.location || '';
    var online = equip.online;
    document.getElementById('modal-title').textContent = name + (loc ? ' — ' + loc : '');

    var dot = document.getElementById('modal-status-dot');
    dot.className = 'rtu-status-dot ' + (!online ? 'offline' : equip.fanOn ? 'on' : 'off');

    var badge = document.getElementById('modal-badge');
    if (!online) {
      badge.className = 'badge';
      badge.style.background = 'var(--offline)';
      badge.style.color = 'white';
      badge.innerHTML = ic('wifiOff', 12) + ' Offline';
    } else if (equip.fanOn) {
      badge.className = 'badge badge-ok';
      badge.style.background = '';
      badge.style.color = '';
      badge.innerHTML = ic('fan', 12) + ' Prendida';
    } else {
      badge.className = 'badge badge-info';
      badge.style.background = '';
      badge.style.color = '';
      badge.innerHTML = ic('pauseCircle', 12) + ' Standby';
    }

    document.getElementById('modal-metrics').innerHTML =
      _modalMetric(ic, 'thermometer', (equip.tempAmbiente || 0) + ' °C', 'Temp Ambiente', '') +
      _modalMetric(ic, 'gauge', (equip.setPointCool || 0) + ' °C', 'Setpoint', 'var(--accent)') +
      _modalMetric(ic, 'droplets', (equip.humidity || 0) + ' %', 'Humedad', '');

    var fanSpin = equip.fanOn ? ' icon-spin' : '';
    var cwOn = !!equip.chilledWater;
    var netOn = !!equip.networkConnection;
    document.getElementById('modal-indicators').innerHTML =
      '<div class="modal-indicator ' + (equip.fanOn ? 'on' : 'off') + '">' +
        '<span class="' + fanSpin + '">' + ic('fan', 18) + '</span>' +
        '<span>Ventilador<br><strong>' + (equip.fanOn ? 'ON' : 'OFF') + '</strong></span></div>' +
      '<div class="modal-indicator ' + (cwOn ? 'on' : 'off') + '">' +
        ic('droplets', 18) + '<span>Agua Helada<br><strong>' + (cwOn ? 'ON' : 'OFF') + '</strong></span></div>' +
      '<div class="modal-indicator ' + (netOn ? 'on' : 'off') + '">' +
        ic('wifi', 18) + '<span>Red Termostato<br><strong>' + (netOn ? 'ON' : 'OFF') + '</strong></span></div>';

    _renderModalHysteresis(equip);

    if (SNLS.HistoryChart) {
      SNLS.HistoryChart.drawModalChart(equip);
    }

    document.getElementById('modal-network-info').innerHTML =
      '<div class="modal-network-item"><div class="modal-network-label">Direccion IP</div>' +
        '<div class="modal-network-value">' + (equip.ipAddress || 'N/A') + '</div></div>' +
      '<div class="modal-network-item"><div class="modal-network-label">MAC Address</div>' +
        '<div class="modal-network-value">' + (equip.macAddress || 'N/A') + '</div></div>';
  }

  function _modalMetric(ic, iconName, value, label, color) {
    var colorStyle = color ? ' style="color:' + color + '"' : '';
    return '<div class="modal-metric">' +
      '<div class="modal-metric-icon">' + ic(iconName, 20) + '</div>' +
      '<div class="modal-metric-value"' + colorStyle + '>' + value + '</div>' +
      '<div class="modal-metric-label">' + label + '</div>' +
      '</div>';
  }

  function _renderModalHysteresis(equip) {
    var container = document.getElementById('modal-hysteresis');
    if (!container) return;
    var ic = SNLS.Icons ? SNLS.Icons.get : function() { return ''; };

    var sp = equip.setPointCool || 22;
    var barMin = sp - 3;
    var barMax = sp + 4;
    var range = barMax - barMin;

    var pct = function(val) {
      return Math.max(0, Math.min(100, (val - barMin) / range * 100));
    };

    var offEnd = pct(sp - 1);
    var dbStart = pct(sp - 1);
    var dbEnd = pct(sp + 1);
    var s1Start = pct(sp + 1);
    var s1End = pct(sp + 2);
    var s2Start = pct(sp + 2);
    var needlePos = pct(equip.tempAmbiente || 0);

    var tempVal = equip.tempAmbiente || 0;
    var needleColor = tempVal > sp + 1 ? 'var(--warn)' :
                      tempVal < sp - 1 ? 'var(--accent)' : 'var(--ok)';

    container.innerHTML =
      '<div class="modal-hyst-labels">' +
        '<span>' + ic('thermometer', 12) + ' ' + barMin.toFixed(1) + ' °C</span>' +
        '<span>SP: ' + sp.toFixed(1) + ' °C</span>' +
        '<span>' + barMax.toFixed(1) + ' °C</span>' +
      '</div>' +
      '<div class="modal-hyst-track">' +
        '<div class="modal-hyst-zone off-zone" style="left:0;width:' + offEnd + '%"></div>' +
        '<div class="modal-hyst-zone deadband" style="left:' + dbStart + '%;width:' + (dbEnd - dbStart) + '%"></div>' +
        '<div class="modal-hyst-zone stage1" style="left:' + s1Start + '%;width:' + (s1End - s1Start) + '%"></div>' +
        '<div class="modal-hyst-zone stage2" style="left:' + s2Start + '%;width:' + (100 - s2Start) + '%"></div>' +
        '<div class="modal-hyst-needle" style="left:' + needlePos + '%;background:' + needleColor + '">' +
          (equip.tempAmbiente || 0).toFixed ? (equip.tempAmbiente || 0).toFixed(0) : '0' +
        '</div>' +
      '</div>' +
      '<div class="modal-hyst-legend">' +
        '<div class="modal-hyst-legend-item"><div class="modal-hyst-legend-dot" style="background:rgba(0,212,170,0.2)"></div>OFF Zone</div>' +
        '<div class="modal-hyst-legend-item"><div class="modal-hyst-legend-dot" style="background:rgba(16,185,129,0.25)"></div>Deadband</div>' +
        '<div class="modal-hyst-legend-item"><div class="modal-hyst-legend-dot" style="background:rgba(245,158,11,0.4)"></div>Stage 1</div>' +
        '<div class="modal-hyst-legend-item"><div class="modal-hyst-legend-dot" style="background:rgba(239,68,68,0.4)"></div>Stage 2</div>' +
      '</div>';
  }

  function refreshModal() {
    if (_modalEquip !== null) {
      var name = _modalEquip.equipName || _modalEquip.tag || '';
      var allEquip = getAllEquipmentFlat();
      for (var i = 0; i < allEquip.length; i++) {
        var eName = allEquip[i].equipName || allEquip[i].tag || '';
        if (eName === name) {
          _modalEquip = allEquip[i];
          _renderModal();
          if (_fcuAnimator) {
            _fcuAnimator.setFanOn(!!_modalEquip.fanOn);
          }
          return;
        }
      }
    }
  }

  function isModalOpen() { return _modalEquip !== null; }

  /**
   * Find a specific equipment by floorKey and equipName.
   */
  function findEquipment(floorKey, equipName) {
    var list = _allEquipment[floorKey] || [];
    for (var i = 0; i < list.length; i++) {
      var name = list[i].equipName || list[i].tag || '';
      if (name === equipName) return list[i];
    }
    return null;
  }

  // Expose globally for onclick handlers
  window.SNLS = window.SNLS || {};
  window.SNLS.setFloor = setFloor;
  window.SNLS.openRTUModal = openModal;
  window.SNLS.equipPagePrev = equipPagePrev;
  window.SNLS.equipPageNext = equipPageNext;

  SNLS.ViewManager = {
    setEquipmentData: setEquipmentData,
    getAllEquipmentFlat: getAllEquipmentFlat,
    findEquipment: findEquipment,
    renderEquipment: renderEquipment,
    setFloor: setFloor,
    getCurrentFloor: function() { return _currentFloor; },
    initSearch: initSearch,
    openModal: openModal,
    closeModal: closeModal,
    initModal: initModal,
    refreshModal: refreshModal,
    isModalOpen: isModalOpen
  };

  window.SNLS = SNLS;
})(window);
