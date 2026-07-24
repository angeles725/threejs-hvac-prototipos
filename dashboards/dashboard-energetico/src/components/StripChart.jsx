import React, { useEffect, useRef } from 'react';

// Live line-strip chart. Puede recibir múltiples series superpuestas.
// props:
//   series: [{ data: number[], color: string, label?: string, fill?: boolean }]
//   height, grid, yDomain: [min, max] opcional, tick dep para forzar redibujo
export default function StripChart({ series = [], height = 140, yDomain, tick, formatY }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (!series.length) return;
    const all = series.flatMap(s => s.data || []);
    if (all.length < 2) return;

    const autoMin = Math.min(...all);
    const autoMax = Math.max(...all);
    const pad = (autoMax - autoMin) * 0.1 || 1;
    const min = yDomain ? yDomain[0] : autoMin - pad;
    const max = yDomain ? yDomain[1] : autoMax + pad;
    const range = (max - min) || 1;

    // grid horizontal
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // grid vertical
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Axis labels (min / max)
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = 'right';
    ctx.fillText(formatY ? formatY(max) : max.toFixed(0), w - 4, 10);
    ctx.fillText(formatY ? formatY(min) : min.toFixed(0), w - 4, h - 4);

    series.forEach(s => {
      const data = s.data;
      if (!data || data.length < 2) return;
      const xs = data.map((_, i) => (i / (data.length - 1)) * w);
      const ys = data.map(v => h - 2 - ((v - min) / range) * (h - 6));

      if (s.fill !== false) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, s.color + '55');
        grad.addColorStop(1, s.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(xs[0], h);
        for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
        ctx.lineTo(xs[xs.length - 1], h);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) i === 0 ? ctx.moveTo(xs[i], ys[i]) : ctx.lineTo(xs[i], ys[i]);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // dot at last point
      const lx = xs[xs.length - 1];
      const ly = ys[ys.length - 1];
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 10; ctx.shadowColor = s.color;
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [series, tick, yDomain, formatY]);

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />;
}
