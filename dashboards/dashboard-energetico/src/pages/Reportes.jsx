import React, { useState } from 'react';
import { FileText, Download, Calendar, Clock, Play, Mail, Filter } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

const REPORT_TYPES = [
  {
    id: 'daily',
    name: 'Reporte Diario',
    desc: 'Resumen de consumo, costo, eventos y performance del día previo.',
    color: VOLT,
    pages: 4,
    metrics: ['Consumo', 'Costo', 'Pico', 'CO₂', 'Alertas'],
  },
  {
    id: 'weekly',
    name: 'Reporte Semanal',
    desc: 'Agregación 7 días con comparativa semana anterior y proyección.',
    color: SOLAR,
    pages: 8,
    metrics: ['Agregados', 'Δ semanal', 'Factor carga', 'Tarifas'],
  },
  {
    id: 'monthly',
    name: 'Reporte Mensual',
    desc: 'Cierre de factura con análisis tarifario, benchmarking y recomendaciones.',
    color: PLASMA,
    pages: 16,
    metrics: ['Factura', 'Benchmarking', 'SLA', 'Ahorros'],
  },
  {
    id: 'custom',
    name: 'Reporte Personalizado',
    desc: 'Arma tu reporte con rango de fechas y métricas a la medida.',
    color: OK,
    pages: null,
    metrics: ['Rango libre', 'Multi-zona', 'Drill-down'],
  },
];

const SCHEDULED = [
  { id: 'sch-01', name: 'Reporte Diario Operativo', when: 'Cada día · 07:00', to: 'operaciones@sitio.mx', next: 'Mañana 07:00', enabled: true },
  { id: 'sch-02', name: 'Reporte Semanal Gerencia', when: 'Lunes · 09:00', to: 'gerencia@sitio.mx', next: 'Lun 28/Abr 09:00', enabled: true },
  { id: 'sch-03', name: 'Factura Mensual + Análisis', when: 'Día 3 · 10:00', to: 'finanzas@sitio.mx', next: 'Sáb 03/May 10:00', enabled: true },
  { id: 'sch-04', name: 'Alerta Mensual Sostenibilidad', when: 'Día 1 · 08:00', to: 'sustentabilidad@sitio.mx', next: 'Jue 01/May 08:00', enabled: false },
];

const HISTORY = [
  { id: 'h-10', name: 'Reporte Diario 2026-04-22', type: 'daily', size: '412 KB', generated: 'Hoy · 07:00', status: 'delivered' },
  { id: 'h-09', name: 'Reporte Diario 2026-04-21', type: 'daily', size: '398 KB', generated: 'Ayer · 07:00', status: 'delivered' },
  { id: 'h-08', name: 'Reporte Semanal S16-2026', type: 'weekly', size: '1.2 MB', generated: 'Lun · 09:00', status: 'delivered' },
  { id: 'h-07', name: 'Reporte Diario 2026-04-20', type: 'daily', size: '401 KB', generated: 'Dom · 07:00', status: 'delivered' },
  { id: 'h-06', name: 'Factura Marzo 2026 + Análisis', type: 'monthly', size: '3.8 MB', generated: '03/Abr · 10:00', status: 'delivered' },
  { id: 'h-05', name: 'Reporte Personalizado · Q1 2026', type: 'custom', size: '4.1 MB', generated: '31/Mar · 18:22', status: 'delivered' },
  { id: 'h-04', name: 'Reporte Semanal S15-2026', type: 'weekly', size: '1.2 MB', generated: '22/Abr · 09:00', status: 'delivered' },
  { id: 'h-03', name: 'Reporte Diario 2026-04-19', type: 'daily', size: '386 KB', generated: 'Sáb · 07:00', status: 'delivered' },
  { id: 'h-02', name: 'Reporte Personalizado · Cocina Abr-01/15', type: 'custom', size: '2.3 MB', generated: '16/Abr · 14:41', status: 'delivered' },
  { id: 'h-01', name: 'Reporte Diario 2026-04-18', type: 'daily', size: '418 KB', generated: 'Vie · 07:00', status: 'delivered' },
];

export default function Reportes({ data }) {
  const [generating, setGenerating] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const generate = (id) => {
    setGenerating(id);
    // Simulated async
    setTimeout(() => setGenerating(null), 2400);
  };

  const filtered = HISTORY.filter(h => typeFilter === 'all' || h.type === typeFilter);

  return (
    <>
      <div className="r-grid r-cols-4" style={{ marginBottom: 16 }}>
        {REPORT_TYPES.map(rt => {
          const busy = generating === rt.id;
          return (
            <Panel
              key={rt.id}
              eyebrow={rt.pages ? `PDF · ${rt.pages} PÁGS` : 'CUSTOM BUILDER'}
              title={rt.name}
              accent={rt.color}
              style={{ minHeight: 240 }}
            >
              <div style={styles.reportCardBody}>
                <div style={styles.reportDesc}>{rt.desc}</div>
                <div style={styles.metricsChips}>
                  {rt.metrics.map(m => (
                    <span key={m} style={{ ...styles.metricChip, borderColor: rt.color + '44', color: rt.color }}>{m}</span>
                  ))}
                </div>
                <PagePreview color={rt.color} />
                <button
                  disabled={busy}
                  onClick={() => generate(rt.id)}
                  style={{
                    ...styles.generateBtn,
                    background: busy ? 'rgba(10,14,32,0.7)' : `linear-gradient(135deg, ${rt.color}, ${rt.color}cc)`,
                    color: busy ? rt.color : '#070A15',
                    border: busy ? `1px solid ${rt.color}` : 'none',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  {busy ? (
                    <>
                      <span style={{ ...styles.spinner, borderTopColor: rt.color }} />
                      GENERANDO...
                    </>
                  ) : (
                    <>
                      <Play size={12} strokeWidth={2.4} />
                      GENERAR AHORA
                    </>
                  )}
                </button>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="r-grid r-row-2-flip">
        <Panel eyebrow="AUTOMATIZACIÓN" title="Reportes Programados" accent={COOL} style={{ minHeight: 340 }}>
          <div style={styles.schedList}>
            {SCHEDULED.map(s => (
              <div key={s.id} style={styles.schedRow}>
                <div style={{ ...styles.schedToggle, background: s.enabled ? OK : 'rgba(255,255,255,0.06)' }}>
                  <span style={{ ...styles.toggleDot, transform: s.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.schedName}>{s.name}</div>
                  <div style={styles.schedMeta}>
                    <Calendar size={10} color={TEXT_MUTED} strokeWidth={2} />
                    <span>{s.when}</span>
                    <span style={{ color: TEXT_MUTED }}>·</span>
                    <Mail size={10} color={TEXT_MUTED} strokeWidth={2} />
                    <span>{s.to}</span>
                  </div>
                </div>
                <div style={styles.schedNext}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.2em', color: TEXT_MUTED }}>PRÓXIMO</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: s.enabled ? COOL : TEXT_MUTED, fontWeight: 700 }}>{s.next}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="HISTORIAL"
          title={`Últimos Reportes · ${HISTORY.length}`}
          accent={VOLT}
          style={{ minHeight: 340 }}
          actions={
            <div style={chipStyles.wrap}>
              {[{ id: 'all', label: 'Todos' }, { id: 'daily', label: 'Diarios' }, { id: 'weekly', label: 'Semanales' }, { id: 'monthly', label: 'Mensuales' }, { id: 'custom', label: 'Custom' }].map(o => (
                <button key={o.id} onClick={() => setTypeFilter(o.id)} style={{ ...chipStyles.chip, ...(typeFilter === o.id ? chipStyles.active : null) }}>{o.label}</button>
              ))}
            </div>
          }
        >
          <div style={styles.historyList}>
            {filtered.map(h => {
              const typeObj = REPORT_TYPES.find(t => t.id === h.type) || REPORT_TYPES[0];
              return (
                <div key={h.id} style={styles.historyRow}>
                  <div style={{ ...styles.fileIcon, borderColor: typeObj.color + '55', color: typeObj.color }}>
                    <FileText size={16} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.historyName}>{h.name}</div>
                    <div style={styles.historyMeta}>
                      <span style={{ color: typeObj.color, fontWeight: 700 }}>{typeObj.name.replace('Reporte ', '')}</span>
                      <span style={{ color: TEXT_MUTED }}>·</span>
                      <Clock size={10} color={TEXT_MUTED} strokeWidth={2} />
                      <span>{h.generated}</span>
                      <span style={{ color: TEXT_MUTED }}>·</span>
                      <span>{h.size}</span>
                    </div>
                  </div>
                  <button style={styles.downloadBtn}>
                    <Download size={12} strokeWidth={2.4} />
                    <span>PDF</span>
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PagePreview({ color }) {
  return (
    <div style={previewStyles.wrap}>
      <div style={{ ...previewStyles.thumb, borderColor: color + '44' }}>
        <div style={{ ...previewStyles.header, background: color }} />
        <div style={previewStyles.lines}>
          <div style={{ ...previewStyles.line, width: '80%' }} />
          <div style={{ ...previewStyles.line, width: '60%' }} />
          <div style={{ ...previewStyles.block, background: color + '33' }} />
          <div style={{ ...previewStyles.line, width: '70%' }} />
          <div style={{ ...previewStyles.line, width: '50%' }} />
          <div style={{ ...previewStyles.block, background: color + '22' }} />
        </div>
      </div>
    </div>
  );
}

const previewStyles = {
  wrap: { display: 'flex', justifyContent: 'center', padding: '8px 0' },
  thumb: {
    width: 90,
    height: 110,
    borderRadius: 4,
    background: 'rgba(7,10,21,0.8)',
    border: '1px solid',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  header: { height: 16, opacity: 0.9 },
  lines: { padding: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  line: { height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.15)' },
  block: { height: 24, borderRadius: 2, marginTop: 2 },
};

const chipStyles = {
  wrap: { display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER },
  chip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 6, color: TEXT_DIM, textTransform: 'uppercase', transition: 'all 0.2s' },
  active: { background: 'linear-gradient(135deg, ' + VOLT + ', #7df9ff)', color: '#070A15' },
};

const styles = {
  reportCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
  },
  reportDesc: {
    fontSize: 11,
    color: TEXT_DIM,
    lineHeight: 1.5,
  },
  metricsChips: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  metricChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.12em',
    border: '1px solid',
    background: 'rgba(10,14,32,0.4)',
  },
  generateBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    padding: '10px 14px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s',
    marginTop: 'auto',
  },
  spinner: {
    width: 10, height: 10,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: 'currentColor',
    borderRadius: '50%',
    animation: 'rotate360 0.8s linear infinite',
  },
  schedList: { display: 'flex', flexDirection: 'column', gap: 8 },
  schedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid ' + BORDER,
  },
  schedToggle: {
    width: 32, height: 16, borderRadius: 8,
    position: 'relative', transition: 'background 0.25s',
    padding: 2, flexShrink: 0,
  },
  toggleDot: {
    display: 'block',
    width: 12, height: 12, borderRadius: 6,
    background: '#070A15',
    transition: 'transform 0.25s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  schedName: { fontSize: 12, color: TEXT, fontWeight: 500, marginBottom: 3 },
  schedMeta: {
    display: 'inline-flex', gap: 6, alignItems: 'center',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_DIM,
    letterSpacing: 0.3, flexWrap: 'wrap',
  },
  schedNext: { textAlign: 'right' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.4)',
    border: '1px solid transparent',
    transition: 'all 0.2s',
  },
  fileIcon: {
    width: 32, height: 40,
    borderRadius: 4,
    border: '1px solid',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  historyName: { fontSize: 12, color: TEXT, fontWeight: 500, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  historyMeta: {
    display: 'inline-flex', gap: 6, alignItems: 'center',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_DIM,
    letterSpacing: 0.3,
  },
  downloadBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
    padding: '6px 10px', borderRadius: 7,
    border: '1px solid ' + BORDER,
    color: VOLT,
    background: 'rgba(0,240,255,0.05)',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },
};
