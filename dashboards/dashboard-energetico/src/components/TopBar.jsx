import React from 'react';
import { Bell, Settings, Menu } from 'lucide-react';
import { VOLT, VOLT_GLOW, SOLAR, TEXT, TEXT_DIM, TEXT_MUTED, BORDER, OK, DANGER } from '../theme.js';

export default function TopBar({ data, isDesktop = true, onToggleMenu }) {
  const { now, tariff, powerFactor, voltage, frequency, totalKW } = data;

  if (!isDesktop) {
    return (
      <header style={mobileStyles.bar}>
        <div style={mobileStyles.row1}>
          <button onClick={onToggleMenu} style={styles.menuBtn} aria-label="Abrir menu">
            <Menu size={18} color={TEXT} strokeWidth={2.2} />
          </button>

          <div style={mobileStyles.brand}>
            <img
              src={import.meta.env.BASE_URL + 'brand-logo-inverse.png'}
              alt={import.meta.env.VITE_BRAND_NAME || 'Dashboard'}
              style={mobileStyles.logo}
            />
          </div>

          <div style={mobileStyles.actions}>
            <button style={styles.iconBtn} title="Notificaciones">
              <Bell size={16} color={TEXT_DIM} strokeWidth={2} />
              <span style={styles.notifDot} />
            </button>
            <div style={styles.avatar}>CA</div>
          </div>
        </div>

        <div style={mobileStyles.row2}>
          <div style={mobileStyles.siteBlock}>
            <div style={styles.eyebrow}>SITIO OPERATIVO</div>
            <div style={mobileStyles.siteName}>
              Torre Corporativa
              <span style={styles.badge}>DEMO</span>
            </div>
          </div>

          <div style={mobileStyles.pillRow}>
            <Pill label="DEMANDA" value={totalKW.toFixed(0) + ' kW'} color={VOLT} pulse />
            <Pill label="TARIFA" value={tariff.band + ' · $' + tariff.rate.toFixed(2)} color={tariff.color} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <div>
          <div style={styles.eyebrow}>SITIO OPERATIVO</div>
          <div style={styles.title}>
            <span style={styles.titleText}>Torre Corporativa — Monterrey Norte</span>
            <span style={styles.badge}>DEMO</span>
          </div>
        </div>
      </div>

      <div style={styles.center}>
        <Pill label="DEMANDA" value={totalKW.toFixed(0) + ' kW'} color={VOLT} pulse />
        <Pill label="TARIFA" value={tariff.band + ' · $' + tariff.rate.toFixed(2)} color={tariff.color} />
        <Pill label="FP" value={powerFactor.toFixed(3)} color={powerFactor > 0.95 ? OK : DANGER} />
        <Pill label="V" value={voltage.toFixed(1) + ' V'} color={TEXT} />
        <Pill label="Hz" value={frequency.toFixed(2)} color={TEXT} />
      </div>

      <div style={styles.right}>
        <div style={styles.clockGroup}>
          <div style={styles.clock}>
            {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={styles.date}>
            {now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <button style={styles.iconBtn} title="Notificaciones">
          <Bell size={16} color={TEXT_DIM} strokeWidth={2} />
          <span style={styles.notifDot} />
        </button>
        <button style={styles.iconBtn} title="Configuración">
          <Settings size={16} color={TEXT_DIM} strokeWidth={2} />
        </button>
        <div style={styles.avatar}>CA</div>
      </div>
    </header>
  );
}

function Pill({ label, value, color, pulse }) {
  return (
    <div style={{ ...pillStyles.pill, borderColor: color + '55' }}>
      <span style={pillStyles.label}>{label}</span>
      <span style={{ ...pillStyles.value, color }}>
        {pulse && <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: color,
          boxShadow: '0 0 8px ' + color, marginRight: 6, animation: 'pulseGlow 1.2s infinite',
        }} />}
        {value}
      </span>
    </div>
  );
}

const styles = {
  bar: {
    minHeight: 72,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 20,
    borderBottom: '1px solid ' + BORDER,
    background: 'linear-gradient(180deg, rgba(12,16,33,0.9), rgba(12,16,33,0.4))',
    backdropFilter: 'blur(12px)',
    flexShrink: 0,
    zIndex: 10,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid ' + BORDER,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  left: { display: 'flex', alignItems: 'center', flex: '1 1 200px', minWidth: 0 },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.3em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: 0.2,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    background: SOLAR + '22',
    color: SOLAR,
    letterSpacing: '0.2em',
    border: '1px solid ' + SOLAR + '44',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: '1 1 auto',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  clockGroup: { textAlign: 'right', marginRight: 4 },
  clock: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15,
    fontWeight: 500,
    color: VOLT,
    letterSpacing: '0.12em',
    textShadow: '0 0 12px ' + VOLT_GLOW,
  },
  date: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.18em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid ' + BORDER,
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    background: DANGER,
    boxShadow: '0 0 6px ' + DANGER,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7df9ff, ' + VOLT + ')',
    color: '#070A15',
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
};

const mobileStyles = {
  bar: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 14px 12px',
    gap: 10,
    borderBottom: '1px solid ' + BORDER,
    background: 'linear-gradient(180deg, rgba(12,16,33,0.95), rgba(12,16,33,0.55))',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    flexShrink: 0,
    zIndex: 10,
  },
  row1: {
    display: 'grid',
    gridTemplateColumns: '38px 1fr auto',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    padding: '0 14px',
    borderRadius: 10,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
    border: '1px solid ' + BORDER,
    boxShadow: 'inset 0 0 22px rgba(0, 240, 255, 0.06)',
    overflow: 'hidden',
    minWidth: 0,
  },
  logo: {
    height: 22,
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.18))',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  row2: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  siteBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  siteName: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: 0.2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  pillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
};

const pillStyles = {
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(10,14,32,0.6)',
    border: '1px solid ' + BORDER,
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.24em',
    color: TEXT_MUTED,
  },
  value: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
  },
};
