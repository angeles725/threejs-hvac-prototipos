import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChevronRight } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import StripChart from '../components/StripChart.jsx';
import Unifilar from '../components/Unifilar.jsx';
import { tariffAt } from '../hooks/useEnergySimulation.js';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER, heatColor } from '../theme.js';

const PERIOD_LABELS = { daily: 'Día', weekly: 'Semana', monthly: 'Mes' };

const STATE_COLORS = { run: OK, standby: WARN, fault: DANGER };
const STATE_LABELS = { run: 'RUN', standby: 'STANDBY', fault: 'FAULT' };

// Árbol sintético de circuitos (navegable)
const CIRCUIT_TREE = [
  {
    id: 'TAB-MT', name: 'Tablero Media Tensión', kwLabel: 'Total: 640 kW',
    children: [
      { id: 'CCM-01', name: 'CCM-01 · HVAC', zones: ['CHILL', 'AHU'] },
    ],
  },
  {
    id: 'TAB-A', name: 'Tablero A · Servicios', kwLabel: 'Iluminación, Oficinas, Estacionamiento',
    children: [
      { id: 'SUB-ILU', name: 'SUB-ILU · Iluminación', zones: ['LIGHT', 'PARK'] },
      { id: 'SUB-OFI', name: 'SUB-OFI · Oficinas', zones: ['OFFICE'] },
    ],
  },
  {
    id: 'TAB-B', name: 'Tablero B · Cargas Comerciales', kwLabel: 'Cocina y EV',
    children: [
      { id: 'SUB-COC', name: 'SUB-COC · Cocina Industrial', zones: ['KITCH'] },
      { id: 'SUB-EV', name: 'SUB-EV · Estaciones de Carga', zones: ['EV'] },
    ],
  },
  {
    id: 'TAB-CR', name: 'Tablero Crítico · UPS', kwLabel: 'Data Center respaldado',
    children: [
      { id: 'UPS-01', name: 'UPS-01 · Data Center', zones: ['DATA'] },
    ],
  },
];

export default function ZonasCircuitos({ data }) {
  const [selectedId, setSelectedId] = useState(data.zones[0].id);
  const [period, setPeriod] = useState('daily');

  const zone = data.zones.find(z => z.id === selectedId) || data.zones[0];
  const zoneIdx = data.zones.findIndex(z => z.id === selectedId);
  const state = data.zoneStates[zone.id]?.state || 'run';

  const zoneShare = zone.kw / Math.max(1, data.totalKW);
  const zoneHist = data.history.map(h => h.demand * zoneShare * (0.9 + 0.2 * Math.sin(h.t / 10000 + zone.id.length)));
  const peak = Math.max(...zoneHist);
  const minKw = Math.min(...zoneHist);
  const runtime = data.zoneRuntime[zoneIdx] || 0;
  const runtimeTotal = 24;
  const kwhToday = zone.kw * runtime * 0.96 + 18; // aproximación

  const trend = data.loadTrends[zone.id];
  const series = trend ? trend[period] : [];
  const costToday = trend ? trend.daily.reduce((s, d) => s + d.cost, 0) : 0;

  return (
    <>
      <div className="r-grid" style={styles.gridTop}>
        {data.zones.map(z => {
          const st = data.zoneStates[z.id]?.state || 'run';
          const isSelected = z.id === selectedId;
          const color = heatColor(z.ratio);
          return (
            <button
              key={z.id}
              onClick={() => setSelectedId(z.id)}
              className="glass"
              style={{
                ...styles.zoneCard,
                borderColor: isSelected ? color : color + '33',
                boxShadow: isSelected ? `0 0 0 1px ${color}, 0 0 24px ${color}44` : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={styles.zoneCardTop}>
                <span style={styles.zoneTier}>{z.tier}</span>
                <span style={{
                  ...styles.stateLed, background: STATE_COLORS[st],
                  boxShadow: '0 0 6px ' + STATE_COLORS[st],
                }} />
              </div>
              <div style={styles.zoneCardName}>{z.name}</div>
              <div style={styles.zoneCardValue}>
                <span style={{ color }}>{z.kw.toFixed(1)}</span>
                <span style={styles.zoneCardUnit}>kW</span>
              </div>
              <div style={styles.zoneCardRatio}>
                <div style={styles.ratioTrack}>
                  <div style={{ ...styles.ratioFill, width: (z.ratio * 100) + '%', background: color }} />
                </div>
                <span style={styles.ratioPct}>{Math.round(z.ratio * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <Panel
        eyebrow="DIAGRAMA UNIFILAR"
        title="Topología Eléctrica · Tiempo Real"
        accent={VOLT}
        style={{ marginBottom: 16 }}
        actions={
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.12em' }}>
            CLIC EN UNA CARGA PARA INSPECCIONAR
          </span>
        }
      >
        <Unifilar data={data} selectedId={selectedId} onSelect={setSelectedId} />
      </Panel>

      <div className="r-grid r-row-narrow-content">
        {/* Tree on left */}
        <Panel
          eyebrow="TOPOLOGÍA ELÉCTRICA"
          title="Árbol de Circuitos"
          accent={VOLT}
          style={{ minHeight: 420 }}
        >
          <div style={styles.tree}>
            {CIRCUIT_TREE.map(trunk => (
              <div key={trunk.id} style={styles.trunk}>
                <div style={styles.trunkHeader}>
                  <div style={styles.trunkDot} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.trunkName}>{trunk.name}</div>
                    <div style={styles.trunkMeta}>{trunk.kwLabel}</div>
                  </div>
                </div>
                {trunk.children.map(sub => (
                  <div key={sub.id} style={styles.sub}>
                    <div style={styles.subHeader}>
                      <ChevronRight size={11} color={TEXT_MUTED} strokeWidth={2.2} />
                      <span style={styles.subName}>{sub.name}</span>
                    </div>
                    <div style={styles.leaves}>
                      {sub.zones.map(zId => {
                        const z = data.zones.find(x => x.id === zId);
                        if (!z) return null;
                        const selected = zId === selectedId;
                        const color = heatColor(z.ratio);
                        return (
                          <button
                            key={zId}
                            onClick={() => setSelectedId(zId)}
                            style={{
                              ...styles.leaf,
                              borderColor: selected ? color : BORDER,
                              background: selected ? color + '18' : 'rgba(10,14,32,0.4)',
                            }}
                          >
                            <span style={{ ...styles.leafDot, background: color, boxShadow: '0 0 6px ' + color }} />
                            <span style={styles.leafName}>{z.name}</span>
                            <span style={styles.leafKw}>{z.kw.toFixed(0)} kW</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>

        {/* Detail panel */}
        <Panel
          eyebrow={`ZONA ${zone.id}`}
          title={zone.name}
          accent={heatColor(zone.ratio)}
          style={{ minHeight: 420 }}
          actions={
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
              padding: '5px 10px', borderRadius: 6,
              background: STATE_COLORS[state] + '22', color: STATE_COLORS[state], border: '1px solid ' + STATE_COLORS[state] + '55',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: STATE_COLORS[state], boxShadow: '0 0 6px ' + STATE_COLORS[state], animation: 'pulseGlow 1.6s infinite' }} />
              {STATE_LABELS[state]}
            </span>
          }
        >
          <div className="r-grid r-cols-3" style={{ gap: 8 }}>
            <Stat label="DEMANDA ACTUAL" value={zone.kw.toFixed(1) + ' kW'} color={heatColor(zone.ratio)} />
            <Stat label="ENERGÍA HOY" value={kwhToday.toFixed(0) + ' kWh'} color={SOLAR} />
            <Stat label="PICO SESIÓN" value={peak.toFixed(1) + ' kW'} color={DANGER} />
            <Stat label="MÍNIMO SESIÓN" value={minKw.toFixed(1) + ' kW'} color={OK} />
            <Stat label="RUNTIME HOY" value={runtime.toFixed(1) + ' / ' + runtimeTotal + ' h'} color={COOL} />
            <Stat label="FP CARGA" value={(trend ? trend.pf : 0).toFixed(3)} color={trend && trend.pf < 0.9 ? WARN : OK} />
            <Stat label="UTILIZACIÓN" value={Math.round(zone.ratio * 100) + ' %'} color={VOLT} />
            <Stat label="COSTO HOY" value={'$' + costToday.toFixed(0)} color={SOLAR} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={styles.chartEyebrow}>TENDENCIA DE CONSUMO · {PERIOD_LABELS[period].toUpperCase()}</div>
              <PeriodTabs value={period} onChange={setPeriod} />
            </div>
            <TrendChart series={series} period={period} tick={data.tick} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={styles.chartEyebrow}>DEMANDA · VENTANA RODANTE</div>
            <StripChart
              series={[{ data: zoneHist, color: heatColor(zone.ratio) }]}
              height={160}
              tick={data.tick}
              formatY={v => v.toFixed(0) + ' kW'}
            />
          </div>

          <div style={styles.nameplate}>
            <div style={styles.chartEyebrow}>DATOS DE PLACA</div>
            <div style={styles.plateGrid}>
              <PlateRow label="Potencia nominal" value={zone.nominal + ' kW'} />
              <PlateRow label="Tensión nominal" value={zone.ratedV + ' V'} />
              <PlateRow label="Corriente nominal" value={zone.ratedI + ' A'} />
              <PlateRow label="Instalado" value={zone.installed} />
              <PlateRow label="Circuito" value={zone.circuit} />
              <PlateRow label="Tier" value={zone.tier} />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={statStyles.card}>
      <div style={statStyles.label}>{label}</div>
      <div style={{ ...statStyles.value, color }}>{value}</div>
    </div>
  );
}

function PlateRow({ label, value }) {
  return (
    <div style={plateStyles.row}>
      <span style={plateStyles.label}>{label}</span>
      <span style={plateStyles.value}>{value}</span>
    </div>
  );
}

function PeriodTabs({ value, onChange }) {
  return (
    <div style={tabStyles.wrap}>
      {Object.keys(PERIOD_LABELS).map(k => {
        const active = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              ...tabStyles.btn,
              color: active ? '#070A15' : TEXT_DIM,
              background: active ? VOLT : 'transparent',
              boxShadow: active ? '0 0 10px ' + VOLT + '88' : 'none',
            }}
          >
            {PERIOD_LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ series, period, tick }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    // Diario: color por banda tarifaria. Semana/mes: degradado plasma.
    let bg;
    if (period === 'daily') {
      bg = series.map((_, h) => tariffAt(h + 0.5).color + 'cc');
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 220);
      grad.addColorStop(0, PLASMA + 'CC');
      grad.addColorStop(1, PLASMA + '10');
      bg = grad;
    }

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: series.map(s => s.label),
        datasets: [{ label: 'kWh', data: series.map(s => s.kwh), backgroundColor: bg, borderRadius: 3 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)', borderColor: PLASMA + '55', borderWidth: 1,
            titleColor: TEXT, bodyColor: TEXT_DIM, padding: 10, cornerRadius: 8,
            callbacks: { label: c => c.parsed.y.toFixed(0) + ' kWh' },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, autoSkip: true, maxTicksLimit: 12 } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [tick, period, series]);

  return <div style={{ height: 220 }}><canvas ref={ref} /></div>;
}

const tabStyles = {
  wrap: { display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER },
  btn: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
    padding: '4px 10px', borderRadius: 6, transition: 'all 0.2s',
  },
};

const statStyles = {
  card: {
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.22em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textShadow: '0 0 10px currentColor',
  },
};

const plateStyles = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px dashed rgba(0,240,255,0.08)',
    fontSize: 11,
  },
  label: { color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em' },
  value: { color: TEXT, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 0.4 },
};

const styles = {
  gridTop: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  zoneCard: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'left',
    transition: 'all 0.25s',
    cursor: 'pointer',
  },
  zoneCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  zoneTier: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: '0.22em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  stateLed: { width: 9, height: 9, borderRadius: 5 },
  zoneCardName: { fontSize: 12, color: TEXT_DIM, fontWeight: 500 },
  zoneCardValue: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  zoneCardUnit: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.1em' },
  zoneCardRatio: { display: 'flex', alignItems: 'center', gap: 8 },
  ratioTrack: { flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  ratioFill: { height: '100%', transition: 'width 0.6s' },
  ratioPct: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT, fontWeight: 600 },

  tree: { display: 'flex', flexDirection: 'column', gap: 10 },
  trunk: {
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid ' + BORDER,
  },
  trunkHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  trunkDot: {
    width: 8, height: 8, borderRadius: 2,
    background: VOLT, boxShadow: '0 0 6px ' + VOLT,
  },
  trunkName: { fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: 0.2 },
  trunkMeta: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1 },
  sub: { marginLeft: 8, marginTop: 6 },
  subHeader: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 },
  subName: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_DIM, letterSpacing: '0.1em' },
  leaves: { display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 16 },
  leaf: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 7,
    border: '1px solid ' + BORDER,
    fontSize: 11,
    color: TEXT_DIM,
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left',
  },
  leafDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  leafName: { flex: 1 },
  leafKw: { fontFamily: "'JetBrains Mono', monospace", color: TEXT, fontWeight: 600, letterSpacing: 0.4 },

  chartEyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.24em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  nameplate: { marginTop: 14 },
  plateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 20px',
  },
};
