import React, { useState } from 'react';
import Panel from './Panel.jsx';
import { DANGER, WARN, OK, TEXT, TEXT_DIM, TEXT_MUTED, VOLT } from '../theme.js';

const SEV = {
  high: { color: DANGER, label: 'CRÍTICO' },
  warn: { color: WARN, label: 'ATENCIÓN' },
  info: { color: VOLT, label: 'INFO' },
};

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'high', label: 'Crítico' },
  { id: 'warn', label: 'Atención' },
];

export default function AlertsFeed({ data }) {
  const [filter, setFilter] = useState('all');

  const rank = { high: 0, warn: 1, info: 2 };
  const sorted = [...data.alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
  const visible = filter === 'all' ? sorted : sorted.filter(a => a.severity === filter);

  return (
    <Panel
      eyebrow="CENTRO DE NOTIFICACIONES"
      title={`Alertas Activas · ${visible.length}`}
      accent={DANGER}
      style={{ minHeight: 260 }}
      actions={
        <div style={chipStyles.wrap}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                ...chipStyles.chip,
                ...(filter === f.id ? chipStyles.active : null),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={styles.list}>
        {visible.length === 0 && (
          <div style={styles.empty}>
            <span style={{ ...styles.emptyDot, background: OK, boxShadow: '0 0 10px ' + OK }} />
            Sin alertas en este filtro
          </div>
        )}
        {visible.map(a => {
          const sev = SEV[a.severity];
          return (
            <div key={a.id} style={{ ...styles.item, borderLeftColor: sev.color }}>
              <div style={styles.itemTop}>
                <span style={{ ...styles.sevChip, color: sev.color, borderColor: sev.color + '55' }}>
                  {sev.label}
                </span>
                <span style={styles.zone}>{a.zone}</span>
                <span style={styles.time}>
                  {a.time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={styles.msg}>{a.message}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const chipStyles = {
  wrap: {
    display: 'flex',
    gap: 4,
    padding: 3,
    borderRadius: 10,
    background: 'rgba(10,14,32,0.6)',
    border: '1px solid rgba(0,240,255,0.12)',
  },
  chip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    padding: '5px 10px',
    borderRadius: 7,
    color: TEXT_DIM,
    textTransform: 'uppercase',
    transition: 'all 0.2s',
  },
  active: {
    background: 'linear-gradient(135deg, ' + DANGER + ', #ff7a7a)',
    color: '#070A15',
  },
};

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' },
  empty: {
    padding: '18px 14px',
    fontSize: 12,
    color: TEXT_DIM,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyDot: {
    width: 8, height: 8, borderRadius: 4,
    animation: 'pulseGlow 1.8s infinite',
  },
  item: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.5)',
    borderLeft: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  sevChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    letterSpacing: '0.16em',
    border: '1px solid',
  },
  zone: {
    fontSize: 11,
    color: TEXT_DIM,
    fontWeight: 500,
    flex: 1,
  },
  time: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.4,
  },
  msg: {
    fontSize: 12,
    color: TEXT,
    lineHeight: 1.4,
  },
};
