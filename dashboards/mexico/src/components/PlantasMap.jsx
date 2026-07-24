import { useEffect, useRef, useState } from 'react';
import { FONTS, statusVar } from '../theme';
import {
  CITIES,
  PLANTS,
  plantsByCity,
  citySummary,
  globalSummary,
} from '../data/mockPlantas';
import { useTheme } from '../lib/ThemeStore';

/**
 * PlantasMap — Mapa central de operaciones Honeywell México.
 *
 * Reutiliza el outline SVG y la proyección lon/lat del proyecto niagara-casino
 * (originalmente del c3ntro-explorer). Generalizado a multi-ciudad y theme-aware
 * vía CSS custom properties.
 */

var SVG_W = 1000;
var SVG_H = 650;

function lonToX(lon) {
  return ((lon + 125) / 55) * SVG_W;
}
function latToY(lat) {
  return ((50 - lat) / 38) * SVG_H;
}

var MEXICO_PATH =
  'M143.1,298.7 L163.8,297.4 L186.9,295.6 L185.2,298.9 L212.6,307.2 L254.1,319.3 L290.3,319.2 L304.7,319.1 L304.7,312.1 L336.2,312.1 L342.9,318.2 L352.2,323.6 L363,331.1 L369,340 L373.5,349.4 L382.9,354.6 L398,359.7 L409.5,346.2 L424.3,345.9 L437.1,352.7 L446.3,364.4 L452.5,374.4 L463.3,384.2 L467.3,396.2 L472.4,404.2 L486.5,409.5 L499.5,413.3 L506.5,412.8 L499.5,427.8 L496.3,440.1 L495,463 L493.2,471.3 L496.4,480.7 L502,489 L505.6,502.3 L517.7,515 L522,524.8 L529.1,533.2 L548.4,537.7 L555.9,544.9 L571.8,540.1 L585.7,538.4 L599.3,535.3 L610.8,532.4 L622.3,525.4 L626.7,515.4 L628.2,501.1 L631.3,496.1 L643.6,491.6 L662.8,487.6 L678.9,488.2 L690,486.8 L694.3,490.4 L693.7,498.6 L683.9,508.8 L679.6,519.2 L683,522.2 L680.2,529.6 L675.7,542.9 L671.1,538.5 L667.3,538.8 L663.8,539 L657.3,549.4 L654,547.3 L651.8,548.1 L651.9,550.6 L635.1,550.5 L618.2,550.5 L618.1,560.1 L609.9,560.2 L616.7,565.9 L623.4,569.8 L625.4,573.5 L628.4,574.6 L627.9,580.4 L604.6,580.4 L595.8,594.4 L598.4,597.6 L596.3,601.6 L595.9,606.6 L575.3,588.2 L565.9,582.6 L551.1,578.1 L540.9,579.4 L526.3,585.8 L517.1,587.5 L504.3,583 L490.7,579.7 L473.7,571.9 L460,569.5 L439.5,561.5 L424.3,553.4 L419.7,548.8 L409.5,547.8 L390.9,542.4 L383.3,534.6 L363.8,524.9 L354.7,514.1 L350.3,505.7 L356.4,504.1 L354.5,499.2 L358.7,494.7 L358.8,488.8 L352.7,481.2 L351,474.3 L344.9,465.7 L328.9,448.7 L310.6,435.3 L301.8,424.7 L286.2,417.7 L282.8,413.5 L285.6,402.9 L276.3,399 L265.6,390.6 L261.1,378.7 L251.3,377.3 L240.7,368.3 L232.2,360 L231.4,354.6 L221.6,341.7 L215.2,328.6 L215.5,322.1 L202.3,315.3 L196.3,316 L185.9,311.3 L183,318.3 L186,326.5 L187.7,339.3 L194,346.4 L207.5,358.2 L210.5,362.2 L213.2,363.4 L215.6,369.3 L218.9,369 L222.5,380.1 L228,384.4 L231.9,390.5 L243.3,399.2 L249.4,415.1 L254.8,422.6 L259.8,430.6 L260.8,439.6 L269.6,440.2 L276.9,448 L283.5,455.6 L283,458.7 L275.4,465 L272.2,464.9 L267.4,454.5 L255.5,444.7 L242.4,436.5 L233.1,432.1 L233.7,419.6 L230.9,410.3 L222.2,405 L209.7,397.4 L207.3,399.6 L202.7,395.1 L191.5,391 L180.8,381.1 L182.1,379.8 L189.6,380.7 L196.4,374.3 L197.1,366.6 L183.1,354.4 L172.4,349.7 L165.7,339 L158.9,327.8 L150.5,314.1 Z';

function formatKw(kw) {
  if (kw >= 1000) return (kw / 1000).toFixed(2) + ' MW';
  return kw.toFixed(0) + ' kW';
}

export default function PlantasMap({ onSelectPlant }) {
  var [activeCityId, setActiveCityId] = useState(null);
  var [hoverPlantId, setHoverPlantId] = useState(null);
  var [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  var svgRef = useRef(null);
  var [theme, toggleTheme] = useTheme();

  /* Pre-warm de los endpoints mock para que cuando el cliente haga click
     en MX60 / MX0A el iframe ya tenga las respuestas en CDN cache.
     Dispara una sola vez al montar el Home (no bloqueante). */
  useEffect(function () {
    var urls = [
      '/snls/api/config',
      '/snls/api/equipment/piso4',
      '/snls/api/equipment/piso5',
      '/snls/api/equipment/piso6',
      '/snls/api/equipment/piso7',
      '/snls/api/monitor/piso4',
      '/snls/api/monitor/piso5',
      '/snls/api/monitor/piso6',
      '/snls/api/monitor/piso7',
      '/snls/api/alarms',
      '/snls/api/schedules',
      '/mx60/api/config',
      '/mx60/api/equipment',
      '/mx60/api/alarms',
      '/mx60/api/zones',
      '/mx60/api/schedules',
      '/requirejs/config.js',
    ];
    urls.forEach(function (u) {
      fetch(u, { method: 'GET', cache: 'force-cache' }).catch(function () {});
    });
  }, []);

  var summary = globalSummary();

  function handleDotClick(cityId, e) {
    setPopupPos({ x: e.clientX, y: e.clientY });
    setActiveCityId(function (prev) {
      return prev === cityId ? null : cityId;
    });
  }

  function handlePlantClick(plant) {
    setActiveCityId(null);
    if (onSelectPlant) onSelectPlant(plant);
  }

  return (
    <div className="planta-root" style={styles.root}>
      {/* Header — badge + title + sub CENTRADOS. Theme toggle absolute. */}
      <header className="planta-header">
        <div style={styles.headerGlow} />
        <button
          type="button"
          className="theme-toggle planta-theme-toggle"
          aria-label="Cambiar tema claro/oscuro"
          title={'Cambiar tema (actual: ' + theme + ')'}
          onClick={toggleTheme}
        >
          <SunIcon />
          <MoonIcon />
        </button>
        <span style={styles.headerLabel}>
          <PulseIcon /> CENTRO DE OPERACIONES MÉXICO
        </span>
        <h1 style={styles.headerTitle}>Honeywell — BMS Multi-Planta</h1>
        <p style={styles.headerSub}>
          {summary.plantCount} plantas · {summary.cityCount} ciudades · Tiempo real
        </p>
      </header>

      {/* Layout: sidebar + map */}
      <div className="planta-layout">
        {/* Sidebar */}
        <aside className="planta-sidebar" style={styles.sidebar}>
          <div style={styles.summaryBox}>
            <div style={styles.summaryTitle}>ESTADO GLOBAL</div>
            <div style={styles.summaryStats}>
              <SummaryStat value={summary.plantCount} label="Plantas" />
              <SummaryStat
                value={summary.operational + '/' + summary.plantCount}
                label="En línea"
                colorVar="--success"
              />
              <SummaryStat
                value={summary.alarms}
                label="Alarmas"
                colorVar={summary.alarms > 0 ? '--danger' : '--success'}
              />
            </div>
            <div style={styles.summaryFooter}>
              <span style={styles.summaryFooterLabel}>Potencia activa total</span>
              <span style={styles.summaryFooterValue}>{formatKw(summary.totalKw)}</span>
            </div>
          </div>

          {CITIES.map(function (city) {
            var summ = citySummary(city.id);
            var plants = plantsByCity(city.id);
            return (
              <div key={city.id} style={styles.sidebarSection}>
                <h3 style={styles.countryTitle}>
                  <span style={styles.cityFlag}>{city.state}</span>
                  {city.name.toUpperCase()}
                  <span style={styles.cityCount}>· {summ.plantCount}</span>
                </h3>
                {plants.map(function (p) {
                  return (
                    <div
                      key={p.id}
                      style={Object.assign({}, styles.dcEntry, {
                        background:
                          hoverPlantId === p.id
                            ? 'var(--accent-lighter)'
                            : 'transparent',
                      })}
                      onMouseEnter={function () {
                        setHoverPlantId(p.id);
                      }}
                      onMouseLeave={function () {
                        setHoverPlantId(null);
                      }}
                      onClick={function () {
                        handlePlantClick(p);
                      }}
                    >
                      <span
                        style={Object.assign({}, styles.statusDot, {
                          background: 'var(' + statusVar(p.status) + ')',
                          boxShadow: '0 0 6px var(' + statusVar(p.status) + ')',
                        })}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.dcName}>{p.name}</div>
                        <div style={styles.dcMetrics}>
                          <span style={styles.metric}>{formatKw(p.activePowerKw)}</span>
                          <span style={styles.metricSep}>·</span>
                          <span style={styles.metric}>{p.currentA.toFixed(0)} A</span>
                          <span style={styles.metricSep}>·</span>
                          <span style={styles.metric}>{p.temperatureC.toFixed(1)}°C</span>
                        </div>
                        <div style={styles.dcAddress}>{p.address}</div>
                      </div>
                      {p.alarms > 0 ? (
                        <span style={styles.alarmBadge}>{p.alarms}</span>
                      ) : null}
                      <span style={styles.dcArrow}>→</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={styles.badgeRow}>
            {['Niagara N4', 'Multi-planta', 'Tiempo real', 'Demo'].map(function (b) {
              return (
                <span key={b} style={styles.badge}>
                  {b}
                </span>
              );
            })}
          </div>
        </aside>

        {/* Map canvas */}
        <div style={styles.mapCanvas}>
          <svg
            ref={svgRef}
            viewBox={'0 0 ' + SVG_W + ' ' + SVG_H}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          >
            <defs>
              <radialGradient id="dotGlowOk" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="dotGlowWarn" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="dotGlowAlarm" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mapBgGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="var(--accent-glow)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            <rect width={SVG_W} height={SVG_H} fill="transparent" />
            <ellipse
              cx={SVG_W / 2}
              cy={SVG_H / 2}
              rx={400}
              ry={300}
              fill="url(#mapBgGrad)"
            />

            <path
              d={MEXICO_PATH}
              fill="var(--map-fill)"
              fillOpacity="var(--map-fill-opacity)"
              stroke="var(--map-stroke)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d={MEXICO_PATH}
              fill="none"
              stroke="var(--map-stroke-soft)"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {CITIES.map(function (city) {
              var summ = citySummary(city.id);
              var cx = lonToX(city.lon);
              var cy = latToY(city.lat);
              var statusCssVar = statusVar(summ.worstStatus);
              var glowId =
                summ.worstStatus === 'alarm'
                  ? 'url(#dotGlowAlarm)'
                  : summ.worstStatus === 'warning'
                  ? 'url(#dotGlowWarn)'
                  : 'url(#dotGlowOk)';
              return (
                <g
                  key={city.id}
                  style={{ cursor: 'pointer' }}
                  onClick={function (e) {
                    handleDotClick(city.id, e);
                  }}
                >
                  <circle cx={cx} cy={cy} r="35" fill={glowId} />

                  <circle
                    className="planta-pulse"
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill="none"
                    stroke={'var(' + statusCssVar + ')'}
                    strokeWidth="1.5"
                    opacity="0.35"
                  />
                  <circle
                    className="planta-pulse-2"
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill="none"
                    stroke={'var(' + statusCssVar + ')'}
                    strokeWidth="1"
                    opacity="0.2"
                  />

                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill={'var(' + statusCssVar + ')'}
                    stroke="var(--bg)"
                    strokeWidth="2.5"
                    style={{
                      filter: 'drop-shadow(0 0 8px var(' + statusCssVar + '))',
                    }}
                  />

                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fontFamily={FONTS.display}
                    fontSize="9"
                    fontWeight="800"
                    fill="var(--bg)"
                  >
                    {summ.plantCount}
                  </text>

                  <text
                    x={cx}
                    y={cy - 22}
                    textAnchor="middle"
                    fontFamily={FONTS.display}
                    fontSize="13"
                    fontWeight="700"
                    fill="var(--text-primary)"
                    style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }}
                  >
                    {city.name.toUpperCase()}
                  </text>
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fontFamily={FONTS.body}
                    fontSize="9"
                    fontWeight="500"
                    fill="var(--accent)"
                    opacity="0.85"
                  >
                    {summ.plantCount} {summ.plantCount === 1 ? 'PLANTA' : 'PLANTAS'} · {formatKw(summ.totalKw)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Popup — plants of selected city */}
      {activeCityId
        ? (function () {
            var city = CITIES.find(function (c) {
              return c.id === activeCityId;
            });
            if (!city) return null;
            var plants = plantsByCity(city.id);
            return (
              <div
                style={{
                  position: 'fixed',
                  left: Math.min(popupPos.x + 12, window.innerWidth - 320),
                  top: Math.max(popupPos.y - 80, 12),
                  zIndex: 200,
                  background: 'var(--surface)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 0',
                  minWidth: 280,
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
                <div
                  style={{
                    padding: '0 16px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: FONTS.display,
                  }}
                >
                  {city.name}, {city.state} — {plants.length}{' '}
                  {plants.length === 1 ? 'planta' : 'plantas'}
                </div>
                {plants.map(function (p) {
                  return (
                    <div
                      key={p.id}
                      onClick={function () {
                        handlePlantClick(p);
                      }}
                      onMouseEnter={function () {
                        setHoverPlantId(p.id);
                      }}
                      onMouseLeave={function () {
                        setHoverPlantId(null);
                      }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background:
                          hoverPlantId === p.id
                            ? 'var(--accent-lighter)'
                            : 'transparent',
                        transition: 'background 150ms ease',
                        borderLeft:
                          hoverPlantId === p.id
                            ? '3px solid var(--accent)'
                            : '3px solid transparent',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(' + statusVar(p.status) + ')',
                          fontSize: '0.6rem',
                        }}
                      >
                        ●
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: FONTS.display,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontFamily: FONTS.mono,
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                          }}
                        >
                          {formatKw(p.activePowerKw)} · {p.currentA.toFixed(0)} A ·{' '}
                          {p.temperatureC.toFixed(1)}°C
                        </div>
                      </div>
                      {p.alarms > 0 ? (
                        <span style={styles.alarmBadgeSmall}>{p.alarms}</span>
                      ) : null}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ marginLeft: 4, opacity: 0.5 }}
                      >
                        <path
                          d="M6 4L10 8L6 12"
                          stroke="var(--accent)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            );
          })()
        : null}

      {activeCityId ? (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={function () {
            setActiveCityId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Sub-components ── */

function PulseIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
      <circle className="header-pulse" cx="4" cy="4" r="3" fill="var(--accent)" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="theme-icon-sun"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
        <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
        <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
        <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="theme-icon-moon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z" fill="currentColor" />
    </svg>
  );
}

function SummaryStat({ value, label, colorVar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <span
        style={{
          fontFamily: FONTS.display,
          fontSize: '1.125rem',
          fontWeight: 800,
          color: colorVar ? 'var(' + colorVar + ')' : 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '0.625rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Styles ── */
var styles = {
  root: {
    backgroundColor: 'var(--bg)',
    backgroundImage: 'var(--bg-image)',
    backgroundSize: '100% 100%, 40px 40px, 40px 40px',
    backgroundAttachment: 'fixed',
  },
  headerGlow: {
    position: 'absolute',
    top: -40,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 700,
    height: 500,
    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.5,
  },
  headerLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: FONTS.display,
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    background: 'var(--accent-lighter)',
    border: '1px solid var(--accent-light)',
    padding: '8px 18px',
    borderRadius: 100,
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: 10,
    marginTop: 0,
    position: 'relative',
    zIndex: 1,
    animation: 'slideInUp 500ms cubic-bezier(0.4,0,0.2,1) both',
    animationDelay: '80ms',
  },
  headerSub: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    position: 'relative',
    zIndex: 1,
    animation: 'fadeIn 500ms ease both',
    animationDelay: '180ms',
    margin: 0,
  },
  sidebar: {
    background: 'var(--surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '20px 16px',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-card)',
  },
  summaryBox: {
    background: 'var(--accent-lighter)',
    border: '1px solid var(--accent-light)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 16,
  },
  summaryTitle: {
    fontFamily: FONTS.display,
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    marginBottom: 10,
  },
  summaryStats: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryFooterLabel: {
    fontFamily: FONTS.body,
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  summaryFooterValue: {
    fontFamily: FONTS.mono,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  sidebarSection: { marginBottom: 16 },
  countryTitle: {
    fontFamily: FONTS.display,
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    paddingBottom: 8,
    marginBottom: 8,
    marginTop: 0,
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cityFlag: {
    fontSize: '0.65rem',
    lineHeight: 1,
    fontWeight: 800,
    color: 'var(--accent)',
  },
  cityCount: {
    marginLeft: 'auto',
    fontFamily: FONTS.mono,
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  dcEntry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 150ms ease',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 5,
  },
  dcName: {
    fontFamily: FONTS.display,
    fontSize: '0.825rem',
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  dcMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metric: {
    fontFamily: FONTS.mono,
    fontSize: '0.68rem',
    color: 'var(--text-secondary)',
    letterSpacing: '0.01em',
  },
  metricSep: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  dcAddress: {
    fontSize: '0.66rem',
    color: 'var(--text-muted)',
    marginTop: 3,
    opacity: 0.85,
  },
  dcArrow: {
    color: 'var(--accent)',
    fontSize: '0.875rem',
    opacity: 0.5,
    marginTop: 4,
    flexShrink: 0,
  },
  alarmBadge: {
    background: 'color-mix(in srgb, var(--danger) 18%, transparent)',
    color: 'var(--danger)',
    border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  alarmBadgeSmall: {
    background: 'color-mix(in srgb, var(--danger) 18%, transparent)',
    color: 'var(--danger)',
    border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: FONTS.display,
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color: 'var(--text-muted)',
    background: 'var(--surface-dim)',
    border: '1px solid var(--border)',
    padding: '5px 12px',
    borderRadius: 100,
  },
  mapCanvas: {
    background: 'var(--surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 16,
    boxShadow: 'var(--shadow-card)',
    minHeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
