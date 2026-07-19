import { APP_CONFIG } from './src/config.mjs';
import { validateConfig } from './src/validation.mjs';
import { createCameraController, resolveUnitClosePreset } from './src/controllers/camera.js';
import { createLayerController } from './src/controllers/layers.js';
import { resolvePickedSelectionFromIntersections } from './src/controllers/picking.js';
import { parseQueryState } from './src/controllers/query-state.js';
import { runShaderWarmup } from './src/controllers/warmup.js';
import { createArchitectureStructure } from './src/scene/architecture.js';
import { createMaterialRegistry } from './src/scene/materials.js';
import { createSceneRuntime } from './src/scene/runtime.js';
import {
  deriveFleetRows,
  deriveHvacRows,
  deriveVentRows,
  fleetRowsToCsv,
  hvacRowsToCsv,
  renderSectionHtml,
  SECTIONS,
  ventRowsToCsv,
} from './src/dock/sections.mjs';
import { createAlertsModel } from './src/sim/alerts.mjs';

/** The deterministic clock: `tick` is the unit both the animation and every capture URL speak. */
const TICKS_PER_SECOND = 6;

function showFatal(error) {
  const safeError = error instanceof Error ? error : new Error(String(error));
  globalThis.showFatalApplicationError?.(safeError);
}

function writeQueryState() {
  // Client decision (2026-07-15): the viewer no longer persists its state into the URL — a bare
  // index.html always opens on the canonical boot state and the address stays clean. Deep-links
  // INTO the viewer still work because parseQueryState reads the URL on load (the dashboard's
  // "Ver en el visor 3D" and the embed mode rely on it); this writer is intentionally a no-op
  // so its existing call sites stay valid.
}

// ---------------------------------------------------------------------------
// WORKBENCH (lateral-menu round, 2026-07-16; the Vista deck died 2026-07-18):
// section menu, content dock, full-page sections and their view state. Pure DOM
// + the deterministic menu-data sims — no THREE, so it is wired BEFORE the CDN
// import and survives a slow or failed three.js load.
// ---------------------------------------------------------------------------
const WORKBENCH_STORAGE = Object.freeze({ menu: 'cinemex.menu.pin', dock: 'cinemex.dock.pin' });
const TABLET_OR_NARROWER = '(max-width: 1023px)';

function readStoredState(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStoredState(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: state stays per-session */ }
}

function setupWorkbench({ initialTick = 0 } = {}) {
  const shell = document.querySelector('#app');
  const menuPin = document.querySelector('#menu-pin');
  const dockPin = document.querySelector('#dock-pin');
  const dockReopen = document.querySelector('#dock-reopen');
  const drawerButton = document.querySelector('#menu-drawer');
  const scrim = document.querySelector('#menu-scrim');
  const menu = document.querySelector('#section-menu');
  const dockScroll = document.querySelector('#dock-scroll');
  const dockContent = document.querySelector('#dock-content');
  const pageCrumbSection = document.querySelector('#page-crumb-section');
  const pageSub = document.querySelector('#page-sub');
  const pageScroll = document.querySelector('#page-scroll');
  const pageContent = document.querySelector('#page-content');
  const alertsBadge = document.querySelector('#alerts-badge');
  const navButtons = [...document.querySelectorAll('.nav-item[data-section]')];

  // Connected once the scene controllers exist; menu clicks before that only swap content.
  let getTick = () => initialTick;
  let setRenderLoop = null;
  let activeSectionId = 'tablero';
  // Per-section VIEW state (client round 3): the HVAC zone detail and the Alertas filter/page
  // live here. A section activation resets it; a delegated click re-renders through the same
  // pure builder with the new view — determinism preserved, no DOM munging.
  let sectionView = {};

  function updateAlertsBadge() {
    const { total } = createAlertsModel({ tick: Math.floor(getTick()) });
    alertsBadge.hidden = total === 0;
    alertsBadge.textContent = String(total);
  }

  // The dock now carries ONLY the Tablero digest (its head is static markup): every other
  // section renders full-width in the page lane with the breadcrumb as its header.
  function renderTableroDock() {
    dockContent.innerHTML = renderSectionHtml('tablero', { tick: Math.floor(getTick()) });
    dockScroll.scrollTop = 0;
  }

  function renderPage(sectionId) {
    const section = SECTIONS[sectionId];
    sectionView = {};
    pageCrumbSection.textContent = section.label;
    pageSub.textContent = section.sub;
    pageContent.dataset.section = sectionId;
    pageContent.innerHTML = renderSectionHtml(sectionId, { tick: Math.floor(getTick()) });
    pageScroll.scrollTop = 0;
    hideSparkTip();
  }

  /** View refresh (client round 3): same section, same tick, new view — scroll stays put. */
  function refreshPageView(view) {
    sectionView = view;
    pageContent.innerHTML = renderSectionHtml(activeSectionId, { tick: Math.floor(getTick()), view });
    hideSparkTip();
  }

  function setMenuState(state, { persist = true } = {}) {
    shell.dataset.menu = state;
    menuPin.setAttribute('aria-pressed', String(state === 'pinned'));
    menuPin.querySelector('.pin-text').textContent = state === 'pinned' ? 'Menú fijado' : 'Fijar menú';
    if (persist) writeStoredState(WORKBENCH_STORAGE.menu, state);
  }

  function setDockState(state, { persist = true } = {}) {
    shell.dataset.dock = state;
    dockPin.setAttribute('aria-pressed', String(state === 'open'));
    dockReopen.hidden = state !== 'peeled';
    if (persist) writeStoredState(WORKBENCH_STORAGE.dock, state);
  }

  function closeDrawer({ restoreFocus = false } = {}) {
    if (shell.dataset.drawer !== 'open') return;
    delete shell.dataset.drawer;
    scrim.hidden = true;
    // Ronda B (responsive): the trigger reports its state and the body scroll unlocks.
    drawerButton.setAttribute('aria-expanded', 'false');
    delete document.body.dataset.drawerLock;
    if (restoreFocus) drawerButton.focus();
  }

  function openDrawer() {
    shell.dataset.drawer = 'open';
    scrim.hidden = false;
    // Ronda B (responsive): aria-expanded on the trigger + body scroll lock while it covers.
    drawerButton.setAttribute('aria-expanded', 'true');
    document.body.dataset.drawerLock = 'true';
    navButtons[0]?.focus();
  }

  // Full-page direction (client, mirrored from the DHL sibling): Tablero keeps the three-lane
  // workbench exactly as before (3D hero + dock digest). ANY other section swaps
  // the hero pane and the dock lane for one full page (menu stays). While a page is up the
  // WebGL context stays alive but the rAF loop STOPS (setRenderLoop) — OrbitControls, camera
  // and scene state survive untouched. Single-view correction (2026-07-18): no page moves the
  // camera anymore, by jump or otherwise — the scene has exactly ONE fixed view.
  // The dock peel state is a Tablero-only concern now and its stored state is respected.
  function activateSection(sectionId) {
    activeSectionId = sectionId;
    for (const button of navButtons) {
      if (button.dataset.section === sectionId) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    const isTablero = sectionId === 'tablero';
    shell.dataset.view = isTablero ? 'tablero' : 'page';
    if (isTablero) renderTableroDock();
    else renderPage(sectionId);
    updateAlertsBadge();
    setRenderLoop?.(isTablero);
    // Navigating closes the drawer; focus returns to the opener (no-op when it is closed).
    closeDrawer({ restoreFocus: true });
  }

  menuPin.addEventListener('click', () => {
    setMenuState(shell.dataset.menu === 'pinned' ? 'collapsed' : 'pinned');
  });
  dockPin.addEventListener('click', () => setDockState('peeled'));
  dockReopen.addEventListener('click', () => setDockState('open'));
  drawerButton.addEventListener('click', openDrawer);
  scrim.addEventListener('click', () => closeDrawer({ restoreFocus: true }));

  // Drawer keyboard contract (phone tier): Esc closes, Tab stays inside the open drawer.
  menu.addEventListener('keydown', (event) => {
    if (shell.dataset.drawer !== 'open') return;
    if (event.key === 'Escape') {
      closeDrawer({ restoreFocus: true });
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [menuPin, ...navButtons].filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  for (const button of navButtons) {
    button.addEventListener('click', () => activateSection(button.dataset.section));
  }

  // Delegated section-content actions (Tablero dock AND full pages). Single-view correction
  // (2026-07-18): the camera-moving branches died with the single fixed view. Client round 4:
  // every mockup control routes through this SAME pattern — a click only moves the section's
  // VIEW state and re-renders through the pure builder (the CSV export and the clipboard copy
  // are the two real side effects, and both read the already-derived state).
  function handleSectionContentClick(event) {
    const go = event.target.closest('[data-go-section]');
    if (go) {
      activateSection(go.dataset.goSection);
      return;
    }
    // --- Ronda B (responsive): tablet per-row detail reveal, one open row per section. ---
    const rowDetail = event.target.closest('[data-row-detail]');
    if (rowDetail) {
      const id = rowDetail.dataset.rowDetail;
      refreshPageView({ ...sectionView, rowDetail: sectionView.rowDetail === id ? null : id });
      return;
    }
    // --- HVAC (round 4): sortable headers, filter popover, mode chips, CSV export. ---
    const hvacSort = event.target.closest('[data-hvac-sort]');
    if (hvacSort) {
      const col = hvacSort.dataset.hvacSort;
      const dir = sectionView.hvacSort === col && sectionView.hvacDir !== 'desc' ? 'desc' : 'asc';
      refreshPageView({ ...sectionView, hvacSort: col, hvacDir: dir });
      return;
    }
    const hvacFilters = event.target.closest('[data-hvac-filters]');
    if (hvacFilters) {
      refreshPageView({ ...sectionView, hvacFilters: sectionView.hvacFilters !== true });
      return;
    }
    const hvacMode = event.target.closest('[data-hvac-mode]');
    if (hvacMode) {
      const value = hvacMode.dataset.hvacMode;
      refreshPageView({ ...sectionView, hvacMode: value === 'all' ? null : value });
      return;
    }
    const exportCsv = event.target.closest('[data-export-csv]');
    if (exportCsv) {
      // Export EXACTLY what the operator sees: the current filtered/sorted rows of the
      // section being looked at (round 5: Ventiladores and Flota RTU share the control).
      const tick = Math.floor(getTick());
      let csv;
      let filename;
      if (activeSectionId === 'ventiladores') {
        csv = ventRowsToCsv(deriveVentRows({ tick, view: sectionView }).filteredRows);
        filename = 'cinemex-ventiladores.csv';
      } else if (activeSectionId === 'cuarto') {
        csv = fleetRowsToCsv(deriveFleetRows({ tick, view: sectionView }).filteredRows);
        filename = 'cinemex-flota-rtu.csv';
      } else {
        csv = hvacRowsToCsv(deriveHvacRows({ tick, view: sectionView }).rows);
        filename = 'cinemex-unidades.csv';
      }
      const anchor = document.createElement('a');
      anchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      anchor.download = filename;
      anchor.click();
      return;
    }
    // --- Ventiladores (round 5): sortable headers, bus filter, pager, kebab menu. ---
    const ventSort = event.target.closest('[data-vent-sort]');
    if (ventSort) {
      const col = ventSort.dataset.ventSort;
      const dir = sectionView.ventSort === col && sectionView.ventDir !== 'desc' ? 'desc' : 'asc';
      refreshPageView({ ...sectionView, ventSort: col, ventDir: dir });
      return;
    }
    const ventFilters = event.target.closest('[data-vent-filters]');
    if (ventFilters) {
      refreshPageView({ ...sectionView, ventFilters: sectionView.ventFilters !== true });
      return;
    }
    const ventBus = event.target.closest('[data-vent-bus]');
    if (ventBus) {
      const value = ventBus.dataset.ventBus;
      refreshPageView({ ...sectionView, ventBus: value === 'all' ? null : value, ventPage: 1 });
      return;
    }
    const ventPager = event.target.closest('[data-vent-page]');
    if (ventPager && !ventPager.disabled) {
      const delta = ventPager.dataset.ventPage === 'next' ? 1 : -1;
      refreshPageView({ ...sectionView, ventPage: (sectionView.ventPage ?? 1) + delta });
      return;
    }
    const ventMenu = event.target.closest('[data-vent-menu]');
    if (ventMenu) {
      const id = ventMenu.dataset.ventMenu;
      refreshPageView({ ...sectionView, ventMenu: sectionView.ventMenu === id ? null : id });
      return;
    }
    // --- Cuarto de máquinas (round 5): bus filter + pager over the flota table. ---
    const cuartoFilters = event.target.closest('[data-cuarto-filters]');
    if (cuartoFilters) {
      refreshPageView({ ...sectionView, cuartoFilters: sectionView.cuartoFilters !== true });
      return;
    }
    const cuartoBus = event.target.closest('[data-cuarto-bus]');
    if (cuartoBus) {
      const value = cuartoBus.dataset.cuartoBus;
      refreshPageView({ ...sectionView, cuartoBus: value === 'all' ? null : value, cuartoPage: 1 });
      return;
    }
    const cuartoPager = event.target.closest('[data-cuarto-page]');
    if (cuartoPager && !cuartoPager.disabled) {
      const delta = cuartoPager.dataset.cuartoPage === 'next' ? 1 : -1;
      refreshPageView({ ...sectionView, cuartoPage: (sectionView.cuartoPage ?? 1) + delta });
      return;
    }
    // --- Iluminación (round 5): scene selection is SECTION view state only. The runtime has
    // no truthful lighting-scene hook (the retired handler only moved the camera, and the
    // house rig is a gated static pass), so no scene call touches the 3D — and the section's
    // copy says so. The single-view rule stays: nothing here names or moves a camera.
    const lightScene = event.target.closest('[data-light-scene]');
    if (lightScene) {
      refreshPageView({ ...sectionView, lightScene: lightScene.dataset.lightScene });
      return;
    }
    // --- Clima (round 5): forecast carousel dots. ---
    const climaDot = event.target.closest('[data-clima-page]');
    if (climaDot) {
      refreshPageView({ ...sectionView, climaPage: Number(climaDot.dataset.climaPage) });
      return;
    }
    // --- Horarios (round 5): today's-transitions history toggle. ---
    const horariosHistory = event.target.closest('[data-horarios-history]');
    if (horariosHistory) {
      refreshPageView({ ...sectionView, horariosHistory: sectionView.horariosHistory !== true });
      return;
    }
    // --- Energía (round 4): kW sort toggle + pager. The page-size select is a change event. ---
    const energySort = event.target.closest('[data-energy-sort]');
    if (energySort) {
      refreshPageView({ ...sectionView, energyDir: sectionView.energyDir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    const energyPager = event.target.closest('[data-energy-page]');
    if (energyPager && !energyPager.disabled) {
      const delta = energyPager.dataset.energyPage === 'next' ? 1 : -1;
      refreshPageView({ ...sectionView, energyPage: (sectionView.energyPage ?? 1) + delta });
      return;
    }
    // --- Alertas: category chips, severity cards, date sort, kebab menu, copy, pager. ---
    const categoryChip = event.target.closest('[data-alert-cat]');
    if (categoryChip) {
      const category = categoryChip.dataset.alertCat;
      refreshPageView({ ...sectionView, alertCat: category === 'all' ? null : category, alertPage: 1 });
      return;
    }
    const severityCard = event.target.closest('[data-alert-sev]');
    if (severityCard) {
      const severity = severityCard.dataset.alertSev;
      refreshPageView({
        ...sectionView,
        alertSev: sectionView.alertSev === severity ? null : severity,
        alertPage: 1,
      });
      return;
    }
    const alertSort = event.target.closest('[data-alert-sort]');
    if (alertSort) {
      refreshPageView({ ...sectionView, alertDateDir: sectionView.alertDateDir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    const kebab = event.target.closest('[data-alert-menu]');
    if (kebab) {
      const id = kebab.dataset.alertMenu;
      refreshPageView({ ...sectionView, alertMenu: sectionView.alertMenu === id ? null : id });
      return;
    }
    const copyDetail = event.target.closest('[data-copy-detail]');
    if (copyDetail) {
      navigator.clipboard?.writeText(copyDetail.dataset.copyDetail).catch(() => {});
      // Copying closes whichever kebab menu was open (Alertas or Ventiladores).
      refreshPageView({ ...sectionView, alertMenu: null, ventMenu: null });
      return;
    }
    const pagerButton = event.target.closest('[data-alert-page]');
    if (pagerButton && !pagerButton.disabled) {
      const token = pagerButton.dataset.alertPage;
      const current = sectionView.alertPage ?? 1;
      const next = token === 'next' ? current + 1 : token === 'prev' ? current - 1 : Number(token);
      refreshPageView({ ...sectionView, alertPage: next });
    }
  }
  dockContent.addEventListener('click', handleSectionContentClick);
  pageContent.addEventListener('click', handleSectionContentClick);

  // Live searches (HVAC / Ventiladores / Flota): every keystroke re-renders through the pure
  // builder; the fresh input gets its focus and caret back so typing never stutters.
  const SEARCH_INPUTS = [
    { selector: '[data-hvac-search]', key: 'hvacQuery' },
    { selector: '[data-vent-search]', key: 'ventQuery' },
    { selector: '[data-cuarto-search]', key: 'cuartoQuery' },
  ];
  pageContent.addEventListener('input', (event) => {
    const entry = SEARCH_INPUTS.find(({ selector }) => event.target.closest(selector));
    if (!entry) return;
    const value = event.target.closest(entry.selector).value;
    refreshPageView({ ...sectionView, [entry.key]: value });
    const restored = pageContent.querySelector(entry.selector);
    if (restored) {
      restored.focus();
      restored.setSelectionRange(value.length, value.length);
    }
  });

  // Rows-per-page selects (Energía / Alertas / Ventiladores / Flota): delegated change
  // events, back to page 1.
  const PAGE_SIZE_SELECTS = [
    { selector: '[data-energy-page-size]', sizeKey: 'energyPageSize', pageKey: 'energyPage' },
    { selector: '[data-alert-page-size]', sizeKey: 'alertPageSize', pageKey: 'alertPage' },
    { selector: '[data-vent-page-size]', sizeKey: 'ventPageSize', pageKey: 'ventPage' },
    { selector: '[data-cuarto-page-size]', sizeKey: 'cuartoPageSize', pageKey: 'cuartoPage' },
  ];
  pageContent.addEventListener('change', (event) => {
    const entry = PAGE_SIZE_SELECTS.find(({ selector }) => event.target.closest(selector));
    if (!entry) return;
    const select = event.target.closest(entry.selector);
    refreshPageView({ ...sectionView, [entry.sizeKey]: Number(select.value), [entry.pageKey]: 1 });
  });

  // Sparkline hover for the Tendencias full-page grid (pattern parity with the DHL sibling).
  // The builders embed data-points/data-unit on every .chispa; ONE delegated pointer handler
  // serves the whole grid. Compact tooltip (hora relativa + valor) on the B43 white card, plus
  // a vertical crosshair inside the hovered sparkline (preserveAspectRatio "none" maps the x
  // axis linearly, so index→x is exact). Tap = same tooltip. The series is 48 half-hour points
  // ending at the live reading, so the time label is honest-relative: "hace N h" / "ahora".
  const sparkTip = document.createElement('div');
  sparkTip.className = 'spark-tip num';
  sparkTip.hidden = true;
  document.body.appendChild(sparkTip);
  let sparkCross = null;
  function hideSparkTip() {
    sparkTip.hidden = true;
    if (sparkCross) { sparkCross.remove(); sparkCross = null; }
  }
  function onSparkPointer(event) {
    const svg = event.target.closest('svg.chispa[data-points]');
    if (!svg) { hideSparkTip(); return; }
    const points = svg.dataset.points.split(',').map(Number);
    if (points.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    const value = points[index];
    const unit = svg.dataset.unit || '';
    const stepsBack = points.length - 1 - index;
    const when = stepsBack === 0 ? 'ahora' : `hace ${(stepsBack / 2).toLocaleString('es-MX')} h`;
    sparkTip.textContent = `${when} · ${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
    sparkTip.hidden = false;
    const left = Math.max(6, Math.min(event.clientX + 12, window.innerWidth - sparkTip.offsetWidth - 6));
    sparkTip.style.left = `${left}px`;
    sparkTip.style.top = `${Math.max(6, rect.top - sparkTip.offsetHeight - 8)}px`;
    if (!sparkCross || sparkCross.ownerSVGElement !== svg) {
      hideSparkTip();
      sparkTip.hidden = false;
      sparkCross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      sparkCross.setAttribute('stroke', 'currentColor');
      sparkCross.setAttribute('stroke-width', '1');
      sparkCross.setAttribute('vector-effect', 'non-scaling-stroke');
      sparkCross.setAttribute('opacity', '0.45');
      svg.appendChild(sparkCross);
    }
    const viewBox = svg.viewBox.baseVal;
    const vx = (index * viewBox.width) / (points.length - 1);
    sparkCross.setAttribute('x1', vx);
    sparkCross.setAttribute('x2', vx);
    sparkCross.setAttribute('y1', '0');
    sparkCross.setAttribute('y2', String(viewBox.height));
  }
  pageContent.addEventListener('pointermove', onSparkPointer);
  pageContent.addEventListener('pointerdown', onSparkPointer);
  pageContent.addEventListener('pointerleave', hideSparkTip);
  pageScroll.addEventListener('scroll', hideSparkTip, { passive: true });

  // Boot states: persisted pin/peel wins; otherwise the tablet tier starts collapsed (BRIEF).
  const storedMenu = readStoredState(WORKBENCH_STORAGE.menu);
  const defaultMenu = window.matchMedia(TABLET_OR_NARROWER).matches ? 'collapsed' : 'pinned';
  setMenuState(storedMenu === 'pinned' || storedMenu === 'collapsed' ? storedMenu : defaultMenu, { persist: false });
  const storedDock = readStoredState(WORKBENCH_STORAGE.dock);
  setDockState(storedDock === 'peeled' ? 'peeled' : 'open', { persist: false });
  activateSection('tablero');

  return {
    /** Late-bind the scene: the workbench never owns state machinery of its own. */
    connectScene({ tickSource, renderLoop }) {
      getTick = tickSource;
      setRenderLoop = renderLoop;
      // The loop may have started before the operator left Tablero (slow CDN): reconcile now.
      setRenderLoop?.(activeSectionId === 'tablero');
    },
    /** Probe/QA conveniences — the shell drives sections without simulating menu clicks. */
    activateSection,
    getActiveSection: () => activeSectionId,
    /** bfcache restore: same section, same view — only the clock-driven readings re-render. */
    resyncClock() {
      updateAlertsBadge();
      if (activeSectionId === 'tablero') renderTableroDock();
      else refreshPageView(sectionView);
    },
  };
}

async function startApplication() {
  const validation = validateConfig(APP_CONFIG);
  if (!validation.valid) throw new Error(`Configuración inválida: ${validation.errors.join(' ')}`);

  const queryState = parseQueryState(location.search);
  // The workbench is chrome: embed mode (bare canvas) never boots it.
  const workbench = queryState.embed ? null : setupWorkbench({ initialTick: queryState.tick });

  const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);

  const viewer = document.querySelector('#viewer');
  const materialRegistry = createMaterialRegistry(THREE);
  const runtime = createSceneRuntime({
    THREE,
    RoomEnvironment,
    container: viewer,
    materials: materialRegistry,
  });
  const architectureAsset = createArchitectureStructure({
    THREE,
    groups: runtime.groups,
    materialRegistry,
  });
  const orbitControls = new OrbitControls(runtime.camera, runtime.renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.06;
  orbitControls.minDistance = 8;
  orbitControls.maxDistance = 150;
  orbitControls.maxPolarAngle = Math.PI * 0.49;
  orbitControls.target.set(0, 0, 0);

  const cameraController = createCameraController({ camera: runtime.camera, orbitControls });
  const layerController = createLayerController({ groups: runtime.groups });
  const createEvidenceViewContext = () => ({
    camera: runtime.camera,
    viewport: {
      width: runtime.renderer.domElement.clientWidth,
      height: runtime.renderer.domElement.clientHeight,
    },
  });
  layerController.hydrate(queryState);
  cameraController.applyPreset(queryState.camera);
  // The interior ceilings are the underside of the roof: they follow the Techo layer (UX item 7).
  architectureAsset.setRoofLayerVisible(queryState.roof);
  architectureAsset.setEvidenceCamera(queryState.camera, createEvidenceViewContext());
  architectureAsset.setSurfaceFrame({
    posterFrame: queryState.posterFrame,
    displayFrame: queryState.displayFrame,
  });
  architectureAsset.setInteractionState({
    state: queryState.sceneState,
    tick: queryState.tick,
    selection: queryState.selection,
  });
  // The sun shadow is static: bake it once the scene exists, and again whenever a state change
  // moves or hides a caster.
  runtime.bakeShadows();

  // EMBED mode (correction item E): the cartelera's unit page hosts this same viewer in an
  // iframe — ONE geometry source of truth. `body.embed` strips every piece of chrome via CSS
  // (bare interactive canvas); a TC300 selection reframes the camera on that unit's rooftop RTU
  // at a 3/4 close view instead of the generic top preset. Orbit stays enabled.
  if (queryState.embed) {
    document.body.classList.add('embed');
    const embedUnit = architectureAsset.plan.structural.roofService.packagedUnits
      .find((unit) => unit.tc300Id === queryState.selection);
    if (embedUnit) cameraController.applyFraming(resolveUnitClosePreset(embedUnit));
  }

  const mutableQuery = { ...queryState };
  const status = document.querySelector('#app-status');

  // Single-view correction (2026-07-18): the camera select died — the scene ships exactly ONE
  // fixed view (the pinned preset applied at boot above) and no UI selects, jumps to, or names
  // any other. The preset catalogue survives inside the camera controller for module-level
  // evidence tests and QA hooks only; free orbit remains the operator's movement.

  // Client round 3 (2026-07-18): the Vista deck died — the mode toggle, layer checkboxes and
  // full-screen controls left the DOM, so their handlers left with them. The scene runs on the
  // query-state defaults (architectural, roof+walls on, network layers off); URL deep links
  // still drive every axis through parseQueryState + layerController.hydrate above — only the
  // DOM wiring is gone, never the module APIs.

  // -------------------------------------------------------------------------
  // INTERACTION-UI: scene state, selection and the deterministic tick.
  // Correction item B: the information panel is gone — the essentials render into one compact
  // canvas overlay (the selection card).
  // -------------------------------------------------------------------------
  const selectionCard = document.querySelector('#selection-card');
  const selectionDetail = document.querySelector('#selection-detail');
  const selectionPathList = document.querySelector('#selection-path');
  const selectionCartelera = document.querySelector('#selection-cartelera');

  /** ONE deep-link builder into the cartelera: the temperature chips and the selection card
   *  share it, so both address a unit page the same way. */
  function dashboardUnitHref(tc300Id) {
    return `dashboard.html?unit=RTU-${tc300Id.slice(-2)}`;
  }

  function renderInteractionPanels() {
    const model = architectureAsset.getInteractionModel();
    if (model.selection === 'none') {
      selectionCard.hidden = true;
      selectionDetail.textContent = 'Ningún dispositivo seleccionado.';
      selectionPathList.replaceChildren();
      selectionCartelera.hidden = true;
      return;
    }
    const telemetry = model.telemetry[model.selection];
    selectionDetail.textContent = model.selection
      + (telemetry ? ` · ${telemetry.temperature.toFixed(1)} °C · consigna ${telemetry.setpoint} °C` : '');
    selectionPathList.replaceChildren(...model.selectionPath.nodeIds.map((nodeId) => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = nodeId;
      item.append(name);
      return item;
    }));
    // "Ver en cartelera →" only when the selection maps to a unit page (thermostats do).
    const isUnitSelection = model.selection.startsWith('TC300-');
    selectionCartelera.hidden = !isUnitSelection;
    if (isUnitSelection) selectionCartelera.href = dashboardUnitHref(model.selection);
    selectionCard.hidden = false;
  }

  // Limpieza fase 2 (2026-07-18): the visual-mode axis is gone — `state` no longer moves the
  // scene (the interaction model owns the deterministic token; nothing re-derives materials,
  // lighting or layers from it). Only selection and tick remain interactive.
  function applyInteraction({ selection, tick } = {}) {
    architectureAsset.setInteractionState({ selection, tick });
    const model = architectureAsset.getInteractionModel();
    if (selection !== undefined) mutableQuery.selection = model.selection;
    if (tick !== undefined) mutableQuery.tick = model.tick;
    renderInteractionPanels();
    if (selection !== undefined) writeQueryState(mutableQuery);
  }

  // The animation runs at the default 1× rate; the speed control was removed (client UI
  // simplification, 2026-07-15). The deterministic tick clock keeps advancing in `animate`.
  const animationSpeed = 1;

  // Raycast selection. Only the HVAC/IoT endpoints answer, and the answer is the URL contract.
  // A drag is an orbit, never a selection: the pick only fires when the pointer barely moved.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pressOrigin = { x: 0, y: 0 };
  const CLICK_SLOP_PX = 5;
  runtime.renderer.domElement.addEventListener('pointerdown', (event) => {
    pressOrigin.x = event.clientX;
    pressOrigin.y = event.clientY;
  });
  runtime.renderer.domElement.addEventListener('pointerup', (event) => {
    if (Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > CLICK_SLOP_PX) return;
    const bounds = runtime.renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, runtime.camera);
    // Integration point 1 (cartelera dashboard): a visible temperature chip is a navigation
    // target — clicking it opens that unit's page with the current scenario preserved.
    const chipsGroup = architectureAsset.temperatureChips?.group;
    if (chipsGroup?.visible) {
      // Label revision: the merged card is the ONE chip element, and it carries `tc300Id`,
      // so clicking it deep-links into the unit's cartelera page.
      const chipHit = raycaster.intersectObjects(chipsGroup.children, false)
        .find((hit) => hit.object.userData?.tc300Id);
      if (chipHit) {
        location.href = dashboardUnitHref(chipHit.object.userData.tc300Id);
        return;
      }
    }
    const hits = raycaster.intersectObjects(runtime.groups.hvac.children, true);
    const picked = resolvePickedSelectionFromIntersections(hits);
    applyInteraction({ selection: picked ?? 'none' });
  });

  renderInteractionPanels();

  let previousTime = performance.now();
  // rAF handle: null = loop paused (a full page covers the hero). 0 = not yet started.
  let animationFrame = null;
  // A pinned `tick` freezes the scene on that exact frame: a capture is never a race with a clock.
  const frozenTick = queryState.tickExplicit;
  let elapsedTicks = queryState.tick;
  let appliedTick = queryState.tick;
  function animate(now) {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;
    cameraController.update(deltaSeconds);
    // The temperature chips are exterior-only: the LIVE camera decides, so a free orbit crossing
    // the envelope hides/shows them exactly like the presets do.
    architectureAsset.setChipCameraPosition(runtime.camera.position);
    // Boot cut 3a: hidden network media skip their width-matrix recompute; this cheap per-frame
    // poll writes the pending matrices the first frame a layer toggle makes them visible again.
    architectureAsset.syncNetworkMediaWidths();
    if (!frozenTick) {
      elapsedTicks += Math.min(0.25, Math.max(0, deltaSeconds)) * TICKS_PER_SECOND * animationSpeed;
      const tick = Math.floor(elapsedTicks);
      if (tick !== appliedTick) {
        appliedTick = tick;
        architectureAsset.setInteractionState({ tick });
      }
    }
    runtime.render();
    animationFrame = requestAnimationFrame(animate);
  }
  // Full-page rAF guard (client direction, DHL parity): the loop STOPS while a full page hides
  // the hero. The renderer, scene, camera and OrbitControls all stay alive — resuming re-enters
  // the same loop at the same tick, so orbit state and readings pick up exactly where they
  // paused. `previousTime` resets on resume so the first frame back never sees the paused gap
  // as one giant delta.
  function setRenderLoop(active) {
    if (active) {
      if (animationFrame === null) {
        previousTime = performance.now();
        animationFrame = requestAnimationFrame(animate);
      }
    } else if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }
  // Boot lands on Tablero (or on the bare embed canvas): start rendering now. If the operator
  // already navigated to a full page while three.js was still loading, connectScene below
  // reconciles and pauses the loop immediately.
  setRenderLoop(true);

  // Section↔scene coordination (lateral-menu round). Single-view correction (2026-07-18): the
  // workbench only needs the tick source and the rAF guard now — no section drives a camera.
  workbench?.connectScene({
    tickSource: () => appliedTick,
    renderLoop: setRenderLoop,
  });

  function dispose() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    cameraController.dispose();
    architectureAsset.dispose();
    runtime.dispose();
    delete globalThis.__cinemexApp;
  }

  // QA hooks are DEVELOPMENT-ONLY. `build-publish.mjs` defines `globalThis.__CINEMEX_QA__` as
  // false so esbuild folds this to `if (false)` and drops the block from the shipped bundle.
  // Reason this must never ship: a live handle to the scene is a one-line theft —
  // `__cinemexApp.runtime.scene` + GLTFExporter exports the whole building, which defeats the
  // obfuscation completely. Measured on the pre-fix build: 185 meshes / 51,923 vertices lifted
  // from the console. The capture/probe harness still gets the hooks when running unbundled.
  const QA_HOOKS_ENABLED = globalThis.__CINEMEX_QA__ !== false;

  if (QA_HOOKS_ENABLED) {
    globalThis.__cinemexApp = Object.freeze({
      config: APP_CONFIG,
      runtime,
      cameraController,
      layerController,
      materialRegistry,
      architectureAsset,
      dispose,
      // Full-page round probes: the capture harness drives sections and reads the honest rAF
      // state (isRendering === false while a page covers the hero) without simulating clicks.
      workbench,
      isRendering: () => animationFrame !== null,
      getTick: () => appliedTick,
    });
  }
  // bfcache lifecycle (2026-07-18): leaving for the Cartelera must NOT tear the scene down —
  // the browser keeps this document alive in the back/forward cache, so Back restores the 3D
  // instantly instead of paying the full boot again. `pagehide` only pauses the rAF loop; the
  // real teardown runs solely on a genuine unload (`persisted === false`). On a bfcache restore
  // (`pageshow` with `persisted === true`) the scene comes back LIVE: the renderer re-fits (the
  // viewport may have changed while away), the clock-driven workbench readings re-render at the
  // preserved tick, and the loop resumes only where it was running (Tablero / embed — a covered
  // full page stays paused, exactly like before leaving).
  window.addEventListener('pagehide', (event) => {
    setRenderLoop(false);
    if (!event.persisted) dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    runtime.resize();
    workbench?.resyncClock();
    renderInteractionPanels();
    setRenderLoop(workbench ? workbench.getActiveSection() === 'tablero' : true);
  });
  // Pay every first-use shader compile (selection/status overlays) BEFORE readiness: captures
  // wait on `data-app-ready`, so warming later would race them.
  runShaderWarmup({
    renderer: runtime.renderer,
    scene: runtime.scene,
    camera: runtime.camera,
  });
  document.documentElement.dataset.appReady = 'true';
  status.textContent = 'Sistema listo · Telemetría en vivo';
  renderInteractionPanels();

  // QA instrumentation hook. `renderer.info.render` is three.js's own exact per-frame accounting —
  // the ground truth for draw calls and triangles. The external probe used to infer them by wrapping
  // WebGL draw entry points, which counted every InstancedMesh as ONE instance: it reported 59 draws
  // / 708 tris (about 12 triangles per draw — the size of a single box) for the whole multiplex, and
  // returned the same figure for two completely different cameras. A performance pass optimizing
  // against that number would be optimizing against a fiction.
  if (QA_HOOKS_ENABLED) {
    window.__qaRenderInfo = () => ({
      calls: runtime.renderer.info.render.calls,
      triangles: runtime.renderer.info.render.triangles,
      lines: runtime.renderer.info.render.lines,
      points: runtime.renderer.info.render.points,
      geometries: runtime.renderer.info.memory.geometries,
      textures: runtime.renderer.info.memory.textures,
      programs: runtime.renderer.info.programs?.length ?? null,
    });
  }
}

startApplication().catch(showFatal);
