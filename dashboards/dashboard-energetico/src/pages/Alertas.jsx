import React, { useMemo, useState } from 'react';
import { Check, BellOff, X, Filter, Clock } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

const SEV = {
  high: { color: DANGER, label: 'CRÍTICO', rank: 0 },
  warn: { color: WARN,   label: 'ATENCIÓN', rank: 1 },
  info: { color: VOLT,   label: 'INFO',     rank: 2 },
};

const RULES = [
  { id: 'R01', name: 'Demanda > 88% del pico', scope: 'Por zona', severity: 'high', enabled: true },
  { id: 'R02', name: 'Factor de potencia < 0.93', scope: 'Planta', severity: 'warn', enabled: true },
  { id: 'R03', name: 'Transitorio + utilización > 70%', scope: 'Por zona', severity: 'warn', enabled: true },
  { id: 'R04', name: 'Tensión fuera de banda 217–223 V', scope: 'Punto medida', severity: 'info', enabled: true },
  { id: 'R05', name: 'Tarifa en banda PUNTA', scope: 'Programación', severity: 'warn', enabled: true },
  { id: 'R06', name: 'CO₂ mensual supera 80% presupuesto', scope: 'Sostenibilidad', severity: 'high', enabled: false },
  { id: 'R07', name: 'Desbalance de voltaje > 2%', scope: 'Calidad', severity: 'warn', enabled: true },
  { id: 'R08', name: 'THD-I > 10% (IEEE 519)', scope: 'Calidad', severity: 'high', enabled: true },
];

// Histórico sintético: últimas 48 h
function buildHistory() {
  const now = Date.now();
  const kinds = [
    { msg: 'Demanda pico en Cocina Industrial', zone: 'Cocina Industrial', sev: 'high' },
    { msg: 'Transitorio detectado · arranque de carga', zone: 'Carga Vehículos EV', sev: 'warn' },
    { msg: 'Tarifa en horario PUNTA', zone: 'Facturación', sev: 'warn' },
    { msg: 'Factor de potencia bajo 0.928', zone: 'Calidad de energía', sev: 'warn' },
    { msg: 'Tensión fuera de banda · 224.8 V', zone: 'Red eléctrica', sev: 'info' },
    { msg: 'Chiller #2 rearranque automático', zone: 'Planta de Enfriamiento', sev: 'high' },
    { msg: 'Alta demanda sostenida > 900 kW', zone: 'Planta', sev: 'high' },
    { msg: 'Solar PV salida reducida por nubosidad', zone: 'Fotovoltaico PV-A', sev: 'info' },
    { msg: 'Desbalance fases > 1.8%', zone: 'Calidad de energía', sev: 'warn' },
    { msg: 'Mantenimiento preventivo completado', zone: 'Manejadoras de Aire', sev: 'info' },
    { msg: 'THD-I elevada en AHU-03', zone: 'Manejadoras de Aire', sev: 'high' },
    { msg: 'Consumo hora PUNTA > histórico', zone: 'Facturación', sev: 'warn' },
    { msg: 'UPS data center en bypass', zone: 'Data Center', sev: 'high' },
    { msg: 'Alarma restablecida automáticamente', zone: 'Cocina Industrial', sev: 'info' },
  ];
  return kinds.map((k, i) => ({
    id: 'h-' + i,
    severity: k.sev,
    zone: k.zone,
    message: k.msg,
    at: new Date(now - (i * 2.3 + 0.2) * 3_600_000),
  }));
}

export default function Alertas({ data }) {
  const [sevFilter, setSevFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [ackedIds, setAckedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [silencedIds, setSilencedIds] = useState(new Set());

  const history = useMemo(() => buildHistory(), []);
  const all = useMemo(() => {
    const live = data.alerts.filter(a => !dismissedIds.has(a.id));
    return [...live, ...history];
  }, [data.alerts, dismissedIds, history]);

  const zones = Array.from(new Set(all.map(a => a.zone)));
  const rank = { high: 0, warn: 1, info: 2 };
  const visible = all
    .filter(a => sevFilter === 'all' || a.severity === sevFilter)
    .filter(a => zoneFilter === 'all' || a.zone === zoneFilter)
    .sort((a, b) => rank[a.severity] - rank[b.severity] || ((b.at || b.time) - (a.at || a.time)));

  const stats = {
    high: all.filter(a => a.severity === 'high').length,
    warn: all.filter(a => a.severity === 'warn').length,
    info: all.filter(a => a.severity === 'info').length,
    acked: ackedIds.size,
    silenced: silencedIds.size,
  };

  const ack = id => setAckedIds(prev => new Set(prev).add(id));
  const dismiss = id => setDismissedIds(prev => new Set(prev).add(id));
  const silence = id => setSilencedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <div className="r-grid r-cols-5" style={{ marginBottom: 16 }}>
        <KPICard label="CRÍTICAS" value={stats.high} color={DANGER} />
        <KPICard label="ATENCIÓN" value={stats.warn} color={WARN} />
        <KPICard label="INFO" value={stats.info} color={VOLT} />
        <KPICard label="ATENDIDAS" value={stats.acked} color={OK} />
        <KPICard label="SILENCIADAS" value={stats.silenced} color={TEXT_MUTED} />
      </div>

      <div style={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color={TEXT_DIM} strokeWidth={2} />
          <span style={styles.filterLabel}>SEVERIDAD</span>
          <ChipRow value={sevFilter} setValue={setSevFilter} options={[
            { id: 'all', label: 'Todas' },
            { id: 'high', label: 'Crítico' },
            { id: 'warn', label: 'Atención' },
            { id: 'info', label: 'Info' },
          ]} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={styles.filterLabel}>ZONA</span>
          <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={styles.select}>
            <option value="all">Todas las zonas</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <div className="r-grid r-row-2-wide">
        <Panel eyebrow="STREAM DE ALERTAS" title={`${visible.length} eventos visibles`} accent={DANGER} style={{ minHeight: 500 }}>
          <div style={styles.timeline}>
            {visible.length === 0 && (
              <div style={styles.emptyState}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: OK, boxShadow: '0 0 10px ' + OK, animation: 'pulseGlow 1.8s infinite' }} />
                Todo limpio · sin alertas que coincidan con los filtros
              </div>
            )}
            {visible.map(a => {
              const sev = SEV[a.severity];
              const isAcked = ackedIds.has(a.id);
              const isSilenced = silencedIds.has(a.id);
              const at = a.at || a.time;
              return (
                <div key={a.id} style={{ ...styles.event, borderLeftColor: sev.color, opacity: isAcked || isSilenced ? 0.55 : 1 }}>
                  <div style={styles.eventLeft}>
                    <div style={{ ...styles.sevChip, color: sev.color, borderColor: sev.color + '55', background: sev.color + '18' }}>
                      {sev.label}
                    </div>
                    <div style={styles.eventZone}>{a.zone}</div>
                    <div style={styles.eventMsg}>{a.message}</div>
                  </div>
                  <div style={styles.eventRight}>
                    <div style={styles.eventTime}>
                      <Clock size={10} color={TEXT_MUTED} strokeWidth={2} />
                      <span>{at.toLocaleString('es-MX', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={styles.actionRow}>
                      {!isAcked && (
                        <button style={{ ...styles.actionBtn, borderColor: OK + '55', color: OK }} onClick={() => ack(a.id)} title="Acknowledge">
                          <Check size={12} strokeWidth={2.4} /> ACK
                        </button>
                      )}
                      <button
                        style={{ ...styles.actionBtn, borderColor: (isSilenced ? TEXT : TEXT_MUTED) + '55', color: isSilenced ? TEXT : TEXT_MUTED }}
                        onClick={() => silence(a.id)}
                        title="Silenciar"
                      >
                        <BellOff size={12} strokeWidth={2.4} />
                        {isSilenced ? 'MUTEADO' : 'MUTE'}
                      </button>
                      <button style={{ ...styles.actionBtn, borderColor: DANGER + '55', color: DANGER }} onClick={() => dismiss(a.id)} title="Descartar">
                        <X size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel eyebrow="CONFIGURACIÓN" title={`Reglas Activas · ${RULES.filter(r => r.enabled).length}`} accent={VOLT} style={{ minHeight: 500 }}>
          <div style={styles.rulesList}>
            {RULES.map(r => {
              const sev = SEV[r.severity];
              return (
                <div key={r.id} style={styles.ruleRow}>
                  <div style={{ ...styles.ruleToggle, background: r.enabled ? OK : 'rgba(255,255,255,0.06)' }}>
                    <span style={{ ...styles.toggleDot, transform: r.enabled ? 'translateX(16px)' : 'translateX(0)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.ruleName}>{r.name}</div>
                    <div style={styles.ruleMeta}>
                      <span style={{ color: sev.color, fontWeight: 700 }}>{sev.label}</span>
                      <span style={{ color: TEXT_MUTED }}>·</span>
                      <span>{r.scope}</span>
                      <span style={{ color: TEXT_MUTED }}>·</span>
                      <span style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div className="glass" style={{ padding: '14px 16px', borderColor: color + '33' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.28em', color: TEXT_MUTED, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 32, fontWeight: 700, color, textShadow: `0 0 16px ${color}66`, marginTop: 4, letterSpacing: '0.02em', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function ChipRow({ value, setValue, options }) {
  return (
    <div style={chipStyles.wrap}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => setValue(o.id)}
          style={{ ...chipStyles.chip, ...(value === o.id ? chipStyles.active : null) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const chipStyles = {
  wrap: { display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER },
  chip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', padding: '5px 10px', borderRadius: 6, color: TEXT_DIM, textTransform: 'uppercase', transition: 'all 0.2s' },
  active: { background: 'linear-gradient(135deg, ' + DANGER + ', #ff7a7a)', color: '#070A15' },
};

const styles = {
  filterBar: {
    display: 'flex',
    gap: 24,
    padding: '12px 14px',
    marginBottom: 14,
    borderRadius: 10,
    background: 'rgba(10,14,32,0.55)',
    border: '1px solid ' + BORDER,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.22em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  select: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    padding: '6px 10px',
    borderRadius: 7,
    background: 'rgba(7,10,21,0.8)',
    color: TEXT,
    border: '1px solid ' + BORDER,
    letterSpacing: 0.4,
  },
  timeline: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 580, overflowY: 'auto' },
  event: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    padding: '12px 14px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.55)',
    borderLeft: '3px solid',
    transition: 'opacity 0.3s',
  },
  eventLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  eventRight: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  sevChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    letterSpacing: '0.18em',
    border: '1px solid',
    display: 'inline-block',
    width: 'fit-content',
  },
  eventZone: { fontSize: 11, color: TEXT_DIM, fontWeight: 500, letterSpacing: 0.2 },
  eventMsg: { fontSize: 12, color: TEXT, lineHeight: 1.4 },
  eventTime: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.4 },
  actionRow: { display: 'flex', gap: 4 },
  actionBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    padding: '4px 8px',
    borderRadius: 6,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '28px 16px',
    fontSize: 12,
    color: TEXT_DIM,
    justifyContent: 'center',
  },
  rulesList: { display: 'flex', flexDirection: 'column', gap: 8 },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid ' + BORDER,
  },
  ruleToggle: {
    width: 32, height: 16, borderRadius: 8,
    position: 'relative', transition: 'background 0.25s',
    padding: 2,
  },
  toggleDot: {
    display: 'block',
    width: 12, height: 12, borderRadius: 6,
    background: '#070A15',
    transition: 'transform 0.25s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  ruleName: { fontSize: 12, color: TEXT, fontWeight: 500, marginBottom: 3 },
  ruleMeta: {
    display: 'flex', gap: 8,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.12em',
    color: TEXT_DIM,
  },
};
