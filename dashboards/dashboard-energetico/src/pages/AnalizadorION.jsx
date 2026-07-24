import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Panel from '../components/Panel.jsx';
import PhasorDiagram from '../components/PhasorDiagram.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

const PHASES = ['L1', 'L2', 'L3'];
const CHANNEL_COLOR = { V: VOLT, I: SOLAR };
// Límite de armónico individual (% del fundamental) — IEEE 519 punto de acoplamiento común.
const INDIVIDUAL_LIMIT = { V: 3.0, I: 6.0 };

export default function AnalizadorION({ data }) {
  const [phase, setPhase] = useState('L1');
  const [channel, setChannel] = useState('I');
  const a = data.analyzer;
  const pp = a.perPhase[phase];

  return (
    <>
      {/* ── Parámetros globales tipo ION ── */}
      <div className="r-grid r-cols-6" style={{ marginBottom: 16 }}>
        <Metric label="THD-V PROM" value={a.thdVavg.toFixed(2) + '%'} accent={a.thdVavg > 5 ? DANGER : OK} sub="Límite 5%" />
        <Metric label="THD-I PROM" value={a.thdIavg.toFixed(2) + '%'} accent={a.thdIavg > 8 ? WARN : OK} sub="Distorsión corriente" />
        <Metric label="TDD" value={a.tddAvg.toFixed(2) + '%'} accent={COOL} sub={'sobre I nom ' + a.iRated + 'A'} />
        <Metric label="K-FACTOR" value={a.kFactorAvg.toFixed(1)} accent={a.kFactorAvg > 4 ? WARN : SOLAR} sub="Derrateo TR" />
        <Metric label="FP DESPLAZ." value={a.dpf.toFixed(3)} accent={VOLT} sub="cos φ fundamental" />
        <Metric label="FP VERDADERO" value={a.truePF.toFixed(3)} accent={a.truePF < 0.92 ? WARN : OK} sub="incluye distorsión" />
      </div>

      {/* ── Espectro + fasorial ── */}
      <div className="r-grid r-row-2-wide" style={{ marginBottom: 16 }}>
        <Panel
          eyebrow="ESPECTRO ARMÓNICO · ORDEN 2 — 50"
          title={`${channel === 'V' ? 'Tensión' : 'Corriente'} · Fase ${phase}`}
          accent={CHANNEL_COLOR[channel]}
          actions={
            <div style={{ display: 'flex', gap: 10 }}>
              <Segmented options={['V', 'I']} value={channel} onChange={setChannel} color={CHANNEL_COLOR[channel]} />
              <Segmented options={PHASES} value={phase} onChange={setPhase} color={VOLT} />
            </div>
          }
        >
          <Spectrum bars={a.harmonics[channel][phase]} channel={channel} tick={data.tick} />
          <div style={styles.note}>
            Barras sobre la línea punteada exceden el límite individual IEEE 519 ({INDIVIDUAL_LIMIT[channel].toFixed(1)}%).
            Dominan típicamente el 5° y 7° (cargas no lineales: variadores, UPS, LED).
          </div>
        </Panel>

        <Panel eyebrow="DIAGRAMA FASORIAL" title={`V / I · φ ≈ ${a.phi.toFixed(1)}°`} accent={PLASMA}>
          <PhasorDiagram phasors={a.phasors} size={260} />
          <div style={styles.legend}>
            {PHASES.map(p => (
              <div key={p} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: p === 'L1' ? VOLT : p === 'L2' ? PLASMA : SOLAR }} />
                <span style={{ color: TEXT_DIM }}>{p}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.12em' }}>
              — V sólido · ⋯ I punteado
            </span>
          </div>
        </Panel>
      </div>

      {/* ── Detalle por fase + parámetros de la fase seleccionada ── */}
      <div className="r-grid r-row-2-flip">
        <Panel eyebrow="ANÁLISIS POR FASE" title="Parámetros de Distorsión" accent={VOLT}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>FASE</th>
                <th style={styles.thR}>THD-V</th>
                <th style={styles.thR}>THD-I</th>
                <th style={styles.thR}>TDD</th>
                <th style={styles.thR}>K-FAC</th>
                <th style={styles.thR}>CF-I</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(p => {
                const r = a.perPhase[p];
                const sel = p === phase;
                return (
                  <tr key={p} onClick={() => setPhase(p)} style={{ cursor: 'pointer', background: sel ? 'rgba(0,240,255,0.06)' : 'transparent' }}>
                    <td style={{ ...styles.td, color: sel ? VOLT : TEXT, fontWeight: 700 }}>{p}</td>
                    <td style={styles.tdR}><span style={{ color: r.thdV > 5 ? DANGER : TEXT_DIM }}>{r.thdV.toFixed(2)}%</span></td>
                    <td style={styles.tdR}><span style={{ color: r.thdI > 8 ? WARN : TEXT_DIM }}>{r.thdI.toFixed(2)}%</span></td>
                    <td style={styles.tdR}>{r.tdd.toFixed(2)}%</td>
                    <td style={styles.tdR}><span style={{ color: r.kFactor > 4 ? WARN : TEXT_DIM }}>{r.kFactor.toFixed(1)}</span></td>
                    <td style={styles.tdR}>{r.crestI.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={styles.note}>
            CF-I = factor de cresta de corriente (senoide pura = 1.41). TDD referido a la corriente nominal de demanda.
          </div>
        </Panel>

        <Panel eyebrow={`ARMÓNICOS DOMINANTES · ${channel} ${phase}`} title="Top 6 por Magnitud" accent={CHANNEL_COLOR[channel]}>
          <TopHarmonics bars={a.harmonics[channel][phase]} channel={channel} />
        </Panel>
      </div>
    </>
  );
}

function Spectrum({ bars, channel, tick }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const limit = INDIVIDUAL_LIMIT[channel];
  const color = CHANNEL_COLOR[channel];

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bars.map(b => b.order),
        datasets: [
          {
            type: 'bar',
            label: 'Armónico',
            data: bars.map(b => b.mag),
            backgroundColor: bars.map(b =>
              b.mag > limit ? DANGER : (b.order % 2 === 1 ? color : 'rgba(148,163,184,0.45)')
            ),
            borderRadius: 2,
            order: 2,
          },
          {
            type: 'line',
            label: 'Límite IEEE 519',
            data: bars.map(() => limit),
            borderColor: DANGER,
            borderDash: [6, 4],
            borderWidth: 1.4,
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)', borderColor: color + '55', borderWidth: 1,
            titleColor: TEXT, bodyColor: TEXT_DIM, padding: 10, cornerRadius: 8,
            callbacks: {
              title: items => 'Armónico ' + items[0].label + '°',
              label: c => c.datasetIndex === 0 ? c.parsed.y.toFixed(2) + '% del fundamental' : 'Límite ' + limit + '%',
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, autoSkip: true, maxTicksLimit: 25 },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, callback: v => v + '%' },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [tick, channel, bars]);

  return <div style={{ height: 300 }}><canvas ref={ref} /></div>;
}

function TopHarmonics({ bars, channel }) {
  const color = CHANNEL_COLOR[channel];
  const top = [...bars].sort((x, y) => y.mag - x.mag).slice(0, 6);
  const max = Math.max(...top.map(b => b.mag), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
      {top.map(b => {
        const over = b.mag > INDIVIDUAL_LIMIT[channel];
        const c = over ? DANGER : color;
        return (
          <div key={b.order}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TEXT_DIM, letterSpacing: '0.1em' }}>
                {b.order}° armónico <span style={{ color: TEXT_MUTED }}>· {(60 * b.order)} Hz</span>
              </span>
              <span style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 13, color: c, fontWeight: 700 }}>{b.mag.toFixed(2)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (b.mag / max * 100) + '%', background: c, boxShadow: '0 0 8px ' + c, transition: 'width 0.5s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value, accent, sub }) {
  return (
    <div className="glass" style={{ ...styles.metricCard, borderColor: accent + '55' }}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: accent }}>{value}</div>
      <div style={styles.metricSub}>{sub}</div>
    </div>
  );
}

function Segmented({ options, value, onChange, color }) {
  return (
    <div style={styles.segmented}>
      {options.map(o => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              ...styles.segBtn,
              color: active ? '#070A15' : TEXT_DIM,
              background: active ? color : 'transparent',
              boxShadow: active ? '0 0 10px ' + color + '88' : 'none',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  metricCard: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 96 },
  metricLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: '0.2em', color: TEXT_MUTED, textTransform: 'uppercase' },
  metricValue: { fontFamily: "'Syncopate', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1, marginTop: 4, textShadow: '0 0 14px currentColor' },
  metricSub: { fontSize: 10, color: TEXT_DIM, marginTop: 4 },
  segmented: { display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER },
  segBtn: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    padding: '5px 12px', borderRadius: 6, transition: 'all 0.2s', minWidth: 34,
  },
  note: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.04em', lineHeight: 1.5, paddingTop: 12 },
  legend: { display: 'flex', alignItems: 'center', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 8 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.18em', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid ' + BORDER },
  thR: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.18em', textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid ' + BORDER },
  td: { padding: '9px 10px', color: TEXT, borderBottom: '1px dashed rgba(0,240,255,0.06)' },
  tdR: { padding: '9px 10px', color: TEXT_DIM, textAlign: 'right', borderBottom: '1px dashed rgba(0,240,255,0.06)', fontFamily: "'JetBrains Mono', monospace" },
};
