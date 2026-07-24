import React from 'react';
import Overview from './Overview.jsx';
import TelemetriaLive from './TelemetriaLive.jsx';
import ZonasCircuitos from './ZonasCircuitos.jsx';
import TarifasCosto from './TarifasCosto.jsx';
import CalidadEnergia from './CalidadEnergia.jsx';
import AnalizadorION from './AnalizadorION.jsx';
import Sostenibilidad from './Sostenibilidad.jsx';
import Alertas from './Alertas.jsx';
import Reportes from './Reportes.jsx';

export default function Dashboard({ data, section }) {
  const Page = PAGES[section] || Overview;
  return (
    <div style={styles.page}>
      <Page data={data} />
      <footer style={styles.footer}>
        <span>HONEYWELL · ENERGY COMMAND CENTER</span>
        <span style={styles.footerDot}>•</span>
        <span>DEMO · TODOS LOS DATOS SIMULADOS</span>
        <span style={styles.footerDot}>•</span>
        <span>tick #{data.tick}</span>
      </footer>
    </div>
  );
}

const PAGES = {
  overview: Overview,
  live: TelemetriaLive,
  zones: ZonasCircuitos,
  tariff: TarifasCosto,
  quality: CalidadEnergia,
  analyzer: AnalizadorION,
  sustain: Sostenibilidad,
  alerts: Alertas,
  reports: Reportes,
};

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    animation: 'fadeUp 0.4s ease',
  },
  footer: {
    marginTop: 28,
    padding: '16px 8px',
    borderTop: '1px solid rgba(0,240,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.24em',
    color: 'rgba(94,102,133,0.8)',
    textTransform: 'uppercase',
  },
  footerDot: { opacity: 0.4 },
};
