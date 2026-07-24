import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { AlertTriangle, Activity } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import Gauge from '../components/Gauge.jsx';
import StripChart from '../components/StripChart.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

const EVENT_META = {
  SAG:          { color: WARN,   label: 'Caída de Tensión (Sag)', icon: 'sag' },
  SWELL:        { color: SOLAR,  label: 'Sobretensión (Swell)',   icon: 'swell' },
  INTERRUPTION: { color: DANGER, label: 'Interrupción',            icon: 'int' },
  THD_HIGH:     { color: PLASMA, label: 'THD Elevada',             icon: 'thd' },
  UNBALANCE:    { color: COOL,   label: 'Desbalance de Fases',     icon: 'unb' },
};

export default function CalidadEnergia({ data }) {
  const ph = data.phase;
  const ph30 = data.phaseHistory;

  return (
    <>
      <div className="r-grid r-row-2-balanced" style={{ marginBottom: 16 }}>
        <Panel eyebrow="VOLTAJE · L1 L2 L3" title="Tensión por Fase" accent={SOLAR}>
          <div style={styles.gaugeRow}>
            <Gauge value={ph.vL1} min={210} max={230} unit="V" label="L1" nominalMin={215} nominalMax={225} size={150} />
            <Gauge value={ph.vL2} min={210} max={230} unit="V" label="L2" nominalMin={215} nominalMax={225} size={150} />
            <Gauge value={ph.vL3} min={210} max={230} unit="V" label="L3" nominalMin={215} nominalMax={225} size={150} />
          </div>
        </Panel>
        <Panel eyebrow="CORRIENTE · L1 L2 L3" title="Amperaje por Fase" accent={PLASMA}>
          <div style={styles.gaugeRow}>
            <Gauge value={ph.iL1} min={0} max={2000} unit="A" label="L1" size={150} color={PLASMA} />
            <Gauge value={ph.iL2} min={0} max={2000} unit="A" label="L2" size={150} color={PLASMA} />
            <Gauge value={ph.iL3} min={0} max={2000} unit="A" label="L3" size={150} color={PLASMA} />
          </div>
        </Panel>
      </div>

      <div className="r-grid r-row-2" style={{ marginBottom: 16 }}>
        <Panel eyebrow="TENDENCIA · 30 MUESTRAS" title="Factor de Potencia" accent={OK}>
          <StripChart
            series={[{ data: data.pfHistory, color: OK }]}
            height={180}
            tick={data.tick}
            yDomain={[0.88, 1.0]}
            formatY={v => v.toFixed(3)}
          />
          <div style={styles.pfMeta}>
            <MetaBadge label="ACTUAL" value={data.powerFactor.toFixed(3)} color={data.powerFactor > 0.95 ? OK : WARN} />
            <MetaBadge label="PROMEDIO" value={(data.pfHistory.reduce((s, v) => s + v, 0) / data.pfHistory.length).toFixed(3)} color={COOL} />
            <MetaBadge label="MÍN" value={Math.min(...data.pfHistory).toFixed(3)} color={DANGER} />
            <MetaBadge label="MÁX" value={Math.max(...data.pfHistory).toFixed(3)} color={VOLT} />
          </div>
        </Panel>

        <Panel eyebrow="DESBALANCE & FRECUENCIA" title="Parámetros de Red" accent={COOL}>
          <div style={styles.paramsGrid}>
            <Gauge value={data.unbalance} min={0} max={4} unit="%" label="DESBALANCE V" nominalMin={0} nominalMax={2} size={140} />
            <Gauge value={data.frequency} min={59.5} max={60.5} unit="Hz" label="FRECUENCIA" nominalMin={59.8} nominalMax={60.2} size={140} />
          </div>
          <div className="r-grid r-cols-3" style={{ marginTop: 8, padding: '12px 14px', borderRadius: 8, background: 'rgba(10,14,32,0.5)', border: '1px solid ' + BORDER, gap: 12 }}>
            <InfoRow label="V PROMEDIO" value={((ph.vL1 + ph.vL2 + ph.vL3) / 3).toFixed(2) + ' V'} />
            <InfoRow label="V MÁX-MÍN" value={(Math.max(ph.vL1, ph.vL2, ph.vL3) - Math.min(ph.vL1, ph.vL2, ph.vL3)).toFixed(2) + ' V'} />
            <InfoRow label="I TOTAL" value={(ph.iL1 + ph.iL2 + ph.iL3).toFixed(0) + ' A'} />
          </div>
        </Panel>
      </div>

      <div className="r-grid r-row-2-flip">
        <Panel eyebrow="DISTORSIÓN ARMÓNICA" title="THD Voltaje vs Corriente" accent={PLASMA}>
          <div style={styles.thdGrid}>
            <THDBar label="THD Voltaje" value={data.thdV} limit={5.0} color={SOLAR} />
            <THDBar label="THD Corriente" value={data.thdI} limit={10.0} color={PLASMA} />
          </div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, padding: '10px 0 0', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace" }}>
            IEEE 519 · Límite THD-V 5% / THD-I 10% en punto de acoplamiento común
          </div>
        </Panel>

        <Panel
          eyebrow="EVENTOS RECIENTES"
          title={`Bitácora de Calidad · ${data.qualityEvents.length}`}
          accent={DANGER}
        >
          <div style={styles.eventsList}>
            {data.qualityEvents.slice(0, 10).map(e => {
              const meta = EVENT_META[e.kind] || EVENT_META.SAG;
              return (
                <div key={e.id} style={{ ...styles.eventRow, borderLeftColor: meta.color }}>
                  <div style={styles.eventIcon}>
                    <AlertTriangle size={14} color={meta.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.eventKind}>{meta.label}</div>
                    <div style={styles.eventDetail}>
                      Fase <strong style={{ color: TEXT }}>{e.phase}</strong> · Magnitud <strong style={{ color: meta.color }}>{e.kind === 'THD_HIGH' || e.kind === 'UNBALANCE' ? e.magnitude.toFixed(2) + ' %' : (e.magnitude * 100).toFixed(1) + ' %'}</strong> · Duración <strong style={{ color: TEXT }}>{e.duration} ms</strong>
                    </div>
                  </div>
                  <div style={styles.eventTime}>
                    {e.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

function MetaBadge({ label, value, color }) {
  return (
    <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: TEXT_MUTED }}>{label}</span>
      <span style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 14, color, fontWeight: 700, letterSpacing: '0.02em' }}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.22em', color: TEXT_MUTED }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: TEXT, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function THDBar({ label, value, limit, color }) {
  const pct = Math.min(120, (value / limit) * 100);
  const barColor = pct > 100 ? DANGER : pct > 80 ? WARN : color;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', color: TEXT_DIM }}>{label}</span>
        <span style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 18, color: barColor, fontWeight: 700, textShadow: `0 0 10px ${barColor}88`, letterSpacing: '0.02em' }}>
          {value.toFixed(2)}<span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 4, fontFamily: "'JetBrains Mono', monospace" }}>%</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`, boxShadow: '0 0 10px ' + barColor, transition: 'width 0.6s' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '100%', borderLeft: '2px dashed rgba(239,68,68,0.7)' }} />
        <div style={{ position: 'absolute', top: -16, right: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: DANGER, letterSpacing: 0.4 }}>LIMIT {limit.toFixed(1)}%</div>
      </div>
    </div>
  );
}

const styles = {
  gaugeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10,
    justifyItems: 'center',
  },
  paramsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10,
    justifyItems: 'center',
  },
  pfMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: 8,
    marginTop: 10,
  },
  thdGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 320,
    overflowY: 'auto',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 7,
    background: 'rgba(10,14,32,0.5)',
    borderLeft: '3px solid',
  },
  eventIcon: { display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.03)' },
  eventKind: { fontSize: 11, color: TEXT, fontWeight: 600 },
  eventDetail: { fontSize: 10, color: TEXT_DIM, marginTop: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3 },
  eventTime: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.4 },
};
