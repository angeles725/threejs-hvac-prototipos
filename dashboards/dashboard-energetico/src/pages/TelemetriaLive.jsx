import React, { useState } from 'react';
import { Pause, Play, Activity, Zap, Gauge as GaugeIcon } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import StripChart from '../components/StripChart.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER, heatColor } from '../theme.js';

const STATE_COLORS = { run: OK, standby: WARN, fault: DANGER };
const STATE_LABELS = { run: 'RUN', standby: 'STANDBY', fault: 'FAULT' };

export default function TelemetriaLive({ data }) {
  const [zoneId, setZoneId] = useState(data.zones[0].id);
  const [paused, setPaused] = useState(false);

  const zone = data.zones.find(z => z.id === zoneId) || data.zones[0];
  const st = data.zoneStates[zone.id];

  // Per-zone synthesized history (reuse totals scaled by zone share)
  const zoneShare = zone.kw / Math.max(1, data.totalKW);
  const zoneHist = data.history.map(h => h.demand * zoneShare * (0.9 + 0.2 * Math.sin(h.t / 10000 + zone.id.length)));

  // 3-phase scaled from site-level
  const ph = data.phaseHistory;
  const zoneV = ph.map(p => p.vL1);
  const zoneVL2 = ph.map(p => p.vL2);
  const zoneVL3 = ph.map(p => p.vL3);

  const zoneI = ph.map(p => p.iL1 * zoneShare * 1.05);
  const zoneIL2 = ph.map(p => p.iL2 * zoneShare);
  const zoneIL3 = ph.map(p => p.iL3 * zoneShare * 0.95);

  const pfHist = data.pfHistory;

  return (
    <>
      <div style={styles.header}>
        <div style={styles.zoneBar}>
          {data.zones.map(z => {
            const state = data.zoneStates[z.id]?.state || 'run';
            const active = z.id === zoneId;
            return (
              <button
                key={z.id}
                onClick={() => setZoneId(z.id)}
                style={{
                  ...styles.zoneChip,
                  ...(active ? { background: VOLT, color: '#070A15' } : null),
                }}
              >
                <span style={{ ...styles.led, background: STATE_COLORS[state], boxShadow: '0 0 6px ' + STATE_COLORS[state] }} />
                <span>{z.name}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setPaused(p => !p)} style={styles.pauseBtn}>
          {paused ? <Play size={14} color="#070A15" strokeWidth={2.4} /> : <Pause size={14} color="#070A15" strokeWidth={2.4} />}
          <span>{paused ? 'REANUDAR' : 'PAUSAR'}</span>
        </button>
      </div>

      <div className="r-grid r-cols-6" style={{ marginBottom: 14 }}>
        <BigDigital label="POTENCIA" value={zone.kw.toFixed(1)} unit="kW" color={VOLT} />
        <BigDigital label="VOLTAJE L1" value={data.phase.vL1.toFixed(1)} unit="V" color={SOLAR} />
        <BigDigital label="CORRIENTE L1" value={(data.phase.iL1 * zoneShare * 1.05).toFixed(0)} unit="A" color={PLASMA} />
        <BigDigital label="FACTOR DE POT." value={data.powerFactor.toFixed(3)} unit="pu" color={data.powerFactor > 0.95 ? OK : WARN} />
        <BigDigital label="FRECUENCIA" value={data.frequency.toFixed(2)} unit="Hz" color={COOL} />
        <BigDigital label="RUNTIME HOY" value={data.zoneRuntime[data.zones.findIndex(z => z.id === zoneId)].toFixed(1)} unit="h" color={OK} />
      </div>

      <div style={styles.zoneHeader}>
        <div>
          <div style={styles.zoneEyebrow}>ZONA SELECCIONADA · MONITOREO EN VIVO</div>
          <div style={styles.zoneTitle}>{zone.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <StateBadge state={st?.state || 'run'} />
          <InfoBadge label="CIRCUITO" value={zone.circuit} />
          <InfoBadge label="TIER" value={zone.tier} />
          <InfoBadge label="NOMINAL" value={zone.nominal + ' kW'} />
        </div>
      </div>

      <div style={styles.gridCharts}>
        <Panel eyebrow="POTENCIA ACTIVA · 60 PTS" title="Demanda Instantánea" accent={VOLT} style={{ minHeight: 200 }}>
          <StripChart
            series={[{ data: paused ? zoneHist : zoneHist, color: VOLT }]}
            height={160}
            tick={paused ? null : data.tick}
            formatY={v => v.toFixed(0) + ' kW'}
          />
        </Panel>
        <Panel eyebrow="VOLTAJES 3 FASES · TRIFÁSICO" title="V L1 / L2 / L3" accent={SOLAR} style={{ minHeight: 200 }}>
          <StripChart
            series={[
              { data: zoneV, color: SOLAR },
              { data: zoneVL2, color: '#ffb3b3' },
              { data: zoneVL3, color: '#b2e3ff' },
            ]}
            height={160}
            tick={paused ? null : data.tick}
            yDomain={[215, 225]}
            formatY={v => v.toFixed(1) + ' V'}
          />
          <div style={styles.legendPhases}>
            <span style={{ color: SOLAR }}>● L1</span>
            <span style={{ color: '#ffb3b3' }}>● L2</span>
            <span style={{ color: '#b2e3ff' }}>● L3</span>
          </div>
        </Panel>
        <Panel eyebrow="CORRIENTES 3 FASES · A" title="I L1 / L2 / L3" accent={PLASMA} style={{ minHeight: 200 }}>
          <StripChart
            series={[
              { data: zoneI, color: PLASMA },
              { data: zoneIL2, color: '#c9b0ff' },
              { data: zoneIL3, color: '#9cd6ff' },
            ]}
            height={160}
            tick={paused ? null : data.tick}
            formatY={v => v.toFixed(0) + ' A'}
          />
          <div style={styles.legendPhases}>
            <span style={{ color: PLASMA }}>● L1</span>
            <span style={{ color: '#c9b0ff' }}>● L2</span>
            <span style={{ color: '#9cd6ff' }}>● L3</span>
          </div>
        </Panel>
        <Panel eyebrow="FACTOR DE POTENCIA · 30 PTS" title="Calidad (PF)" accent={OK} style={{ minHeight: 200 }}>
          <StripChart
            series={[{ data: pfHist, color: OK }]}
            height={160}
            tick={paused ? null : data.tick}
            yDomain={[0.88, 1.00]}
            formatY={v => v.toFixed(3)}
          />
        </Panel>
      </div>
    </>
  );
}

function BigDigital({ label, value, unit, color }) {
  return (
    <div className="glass" style={styles.digital}>
      <div style={styles.digitalLabel}>{label}</div>
      <div style={styles.digitalValue}>
        <span style={{ color, textShadow: '0 0 14px ' + color + '88' }}>{value}</span>
        <span style={styles.digitalUnit}>{unit}</span>
      </div>
    </div>
  );
}

function StateBadge({ state }) {
  const c = STATE_COLORS[state];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
      padding: '5px 10px', borderRadius: 6,
      background: c + '22', color: c, border: '1px solid ' + c + '55',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: c, boxShadow: '0 0 6px ' + c, animation: 'pulseGlow 1.6s infinite' }} />
      {STATE_LABELS[state]}
    </span>
  );
}

function InfoBadge({ label, value }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      padding: '5px 10px',
      borderRadius: 6,
      border: '1px solid ' + BORDER,
      background: 'rgba(10,14,32,0.5)',
      display: 'flex', gap: 8,
    }}>
      <span style={{ color: TEXT_MUTED, letterSpacing: '0.2em' }}>{label}</span>
      <span style={{ color: TEXT, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  zoneBar: {
    display: 'flex',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    background: 'rgba(10,14,32,0.6)',
    border: '1px solid ' + BORDER,
    flexWrap: 'wrap',
  },
  zoneChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    padding: '6px 10px',
    borderRadius: 7,
    color: TEXT_DIM,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s',
  },
  led: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  pauseBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    padding: '8px 14px',
    borderRadius: 8,
    background: 'linear-gradient(135deg, ' + SOLAR + ', #e8b980)',
    color: '#070A15',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  digital: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  digitalLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.22em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  digitalValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  digitalUnit: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: '0.1em',
  },
  zoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 4px',
    flexWrap: 'wrap',
    gap: 12,
  },
  zoneEyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.28em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  zoneTitle: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: TEXT,
    letterSpacing: '0.04em',
    marginTop: 2,
  },
  gridCharts: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: 14,
  },
  legendPhases: {
    display: 'flex',
    gap: 14,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.12em',
    marginTop: 4,
  },
};

