import React from 'react';
import {
  LayoutGrid, Activity, Grid3x3, Coins, AudioWaveform,
  Radar, Leaf, Bell, FileText, X,
} from 'lucide-react';
import { VOLT, VOLT_GLOW, TEXT, TEXT_DIM, TEXT_MUTED, BORDER, SURFACE } from '../theme.js';

const NAV = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'live', label: 'Telemetria en Vivo', Icon: Activity },
  { id: 'zones', label: 'Zonas & Circuitos', Icon: Grid3x3 },
  { id: 'tariff', label: 'Tarifas & Costo', Icon: Coins },
  { id: 'quality', label: 'Calidad de Energia', Icon: AudioWaveform },
  { id: 'analyzer', label: 'Analizador ION', Icon: Radar },
  { id: 'sustain', label: 'Sostenibilidad', Icon: Leaf },
  { id: 'alerts', label: 'Alertas', Icon: Bell },
  { id: 'reports', label: 'Reportes', Icon: FileText },
];

export default function Sidebar({ section, onSelect, isDesktop = true, open = false, onClose }) {
  const className = isDesktop
    ? ''
    : 'responsive-sidebar' + (open ? ' open' : '');

  return (
    <aside style={styles.aside} className={className}>
      <div style={styles.logoWrap}>
        <img
          // BASE_URL, not "/…": the visor serves this build from a subpath, and Vite only rewrites
          // asset URLs it can see at build time — a literal in JSX is not one of them.
          // The logo file itself is white-label: each client build drops its own brand-*.png in.
          src={import.meta.env.BASE_URL + 'brand-logo-inverse.png'}
          alt={import.meta.env.VITE_BRAND_NAME || 'Dashboard'}
          style={styles.logoImg}
        />
        {!isDesktop && (
          <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar menu">
            <X size={18} color={TEXT_DIM} strokeWidth={2} />
          </button>
        )}
      </div>

      <nav style={styles.nav}>
        {NAV.map(item => {
          const active = section === item.id;
          const color = active ? '#070A15' : TEXT_DIM;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : null),
              }}
            >
              <span style={styles.navIcon}>
                <item.Icon size={16} color={color} strokeWidth={2} />
              </span>
              <span style={styles.navLabel}>{item.label}</span>
              {active && <span style={styles.navActiveBar} />}
            </button>
          );
        })}
      </nav>

      <div style={styles.footer}>
        <div style={styles.footerStatus}>
          <span style={styles.pulseDot} />
          <span style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: 0.4 }}>SYSTEM ONLINE</span>
        </div>
        <div style={styles.footerMeta}>v1.0 • DEMO</div>
      </div>
    </aside>
  );
}

const styles = {
  aside: {
    width: 240,
    flexShrink: 0,
    background: 'linear-gradient(180deg, rgba(12,16,33,0.95), rgba(7,10,21,0.98))',
    borderRight: '1px solid ' + BORDER,
    display: 'flex',
    flexDirection: 'column',
    padding: '18px 12px',
    gap: 22,
    position: 'relative',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 4px 18px',
    borderBottom: '1px solid ' + BORDER,
    position: 'relative',
  },
  logoImg: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  },
  closeBtn: {
    position: 'absolute',
    right: 4,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid ' + BORDER,
    display: 'grid',
    placeItems: 'center',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 10,
    color: TEXT_DIM,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.2,
    transition: 'background 0.2s, color 0.2s',
    position: 'relative',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'linear-gradient(90deg, ' + VOLT + ' 0%, #7df9ff 100%)',
    color: '#070A15',
    fontWeight: 700,
    boxShadow: '0 4px 20px ' + VOLT_GLOW,
  },
  navIcon: { display: 'grid', placeItems: 'center', width: 18, height: 18 },
  navLabel: { flex: 1 },
  navActiveBar: {
    position: 'absolute',
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    background: '#070A15',
  },
  footer: {
    padding: '12px 8px',
    borderTop: '1px solid ' + BORDER,
  },
  footerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    background: '#10B981',
    boxShadow: '0 0 8px #10B981',
    animation: 'pulseGlow 1.8s infinite',
  },
  footerMeta: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: '0.2em',
  },
};
