/* ═══ Folktracks — SVG charts (no dependencies) ══════════════════════════ */
import { clamp, round } from './util.js';
import { nf, weekdayShort, dateMedium } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

/* ── Activity rings ───────────────────────────────────────────────── */
export function rings(values, size = 150) {
  // values: [{ pct, color }] outermost first
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}` });
  const c = size / 2;
  // Thin enough that three rings still leave a readable hole in the middle.
  const stroke = size * 0.068;
  const gap = stroke * 1.35;

  values.forEach((v, i) => {
    const r = c - stroke / 2 - i * gap - 2;
    const circ = 2 * Math.PI * r;
    svg.appendChild(svgEl('circle', {
      class: 'ring-track', cx: c, cy: c, r, 'stroke-width': stroke,
      opacity: 0.55,
    }));
    const arc = svgEl('circle', {
      class: 'ring-val', cx: c, cy: c, r, 'stroke-width': stroke,
      stroke: v.color, 'stroke-dasharray': circ,
      'stroke-dashoffset': circ,
    });
    arc.style.color = v.color;
    svg.appendChild(arc);
    // Animate on the next frame so the dash transition actually runs.
    requestAnimationFrame(() => {
      arc.setAttribute('stroke-dashoffset', String(circ * (1 - clamp(v.pct, 0, 1))));
    });
  });
  return svg;
}

/* ── Line chart with gradient area + goal band ────────────────────── */
export function lineChart(points, {
  width = 320, height = 150, color = '#4b8dff', goal = null, fmt = v => nf(round(v, 1)),
  padTop = 14, padBottom = 22, padSide = 16, labelEvery = null, area = true,
} = {}) {
  const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' });
  if (points.length < 2) return svg;

  const ys = points.map(p => p.v);
  const dataMin = Math.min(...ys), dataMax = Math.max(...ys);
  // A goal far outside the data would flatten the series into a straight
  // line, so only widen the domain when it is close enough to be useful.
  const room = Math.max((dataMax - dataMin) * 1.4, dataMax * 0.04);
  const goalInRange = goal != null && goal >= dataMin - room && goal <= dataMax + room;
  let min = goalInRange ? Math.min(dataMin, goal) : dataMin;
  let max = goalInRange ? Math.max(dataMax, goal) : dataMax;
  const pad = (max - min) * 0.18 || Math.max(1, max * 0.05);
  min -= pad; max += pad;
  const span = max - min || 1;

  const X = i => padSide + (i / (points.length - 1)) * (width - padSide * 2);
  const Y = v => padTop + (1 - (v - min) / span) * (height - padTop - padBottom);

  // horizontal guides
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (i / 3) * (height - padTop - padBottom);
    svg.appendChild(svgEl('line', { class: 'grid-line', x1: 0, x2: width, y1: y, y2: y }));
  }

  if (goalInRange) {
    svg.appendChild(svgEl('line', { class: 'goal-line', x1: 0, x2: width, y1: Y(goal), y2: Y(goal) }));
  }

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');

  if (area) {
    const gid = `g${Math.random().toString(36).slice(2, 8)}`;
    const defs = svgEl('defs');
    const lg = svgEl('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.appendChild(svgEl('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '.55' }));
    lg.appendChild(svgEl('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(lg); svg.appendChild(defs);
    svg.appendChild(svgEl('path', {
      class: 'area', d: `${d} L${X(points.length - 1)},${height - padBottom} L${X(0)},${height - padBottom} Z`,
      fill: `url(#${gid})`, opacity: '.9',
    }));
  }

  const path = svgEl('path', { class: 'line', d, stroke: color });
  svg.appendChild(path);
  // Draw-on reveal
  requestAnimationFrame(() => {
    const len = path.getTotalLength?.() || 0;
    if (!len || document.documentElement.dataset.motion === 'off') return;
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)';
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  });

  const last = points.length - 1;
  svg.appendChild(svgEl('circle', { class: 'dot', cx: X(last), cy: Y(points[last].v), r: 4, fill: color }));

  const every = labelEvery ?? Math.max(1, Math.ceil(points.length / 5));
  points.forEach((p, i) => {
    if (i % every && i !== last) return;
    if (!p.label) return;
    const txt = svgEl('text', {
      class: 'axis-txt', x: clamp(X(i), 20, width - 20), y: height - 5, 'text-anchor': 'middle',
    });
    txt.textContent = p.label;
    svg.appendChild(txt);
  });

  return svg;
}

/* ── Bar chart (daily calories vs goal) ───────────────────────────── */
export function barChart(bars, {
  width = 320, height = 150, goal = null, color = '#4b8dff', overColor = '#ff7a5c',
  padTop = 12, padBottom = 22,
} = {}) {
  const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}` });
  if (!bars.length) return svg;

  const max = Math.max(...bars.map(b => b.v), goal || 0) * 1.16 || 1;
  const plot = height - padTop - padBottom;
  const slot = width / bars.length;
  const bw = Math.max(4, Math.min(22, slot * 0.56));

  if (goal != null) {
    const gy = padTop + plot * (1 - goal / max);
    svg.appendChild(svgEl('line', { class: 'goal-line', x1: 0, x2: width, y1: gy, y2: gy }));
  }

  bars.forEach((b, i) => {
    const x = slot * i + (slot - bw) / 2;
    const hgt = Math.max(b.v > 0 ? 3 : 0, plot * clamp(b.v / max, 0, 1));
    const over = goal != null && b.v > goal * 1.05;
    const rect = svgEl('rect', {
      class: 'bar', x, y: padTop + plot, width: bw, height: 0, rx: bw / 2,
      fill: over ? overColor : color, opacity: b.v ? .92 : .25,
    });
    svg.appendChild(rect);
    requestAnimationFrame(() => {
      rect.setAttribute('height', hgt.toFixed(1));
      rect.setAttribute('y', (padTop + plot - hgt).toFixed(1));
    });
    if (b.label) {
      const txt = svgEl('text', { class: 'axis-txt', x: slot * i + slot / 2, y: height - 5, 'text-anchor': 'middle' });
      txt.textContent = b.label;
      svg.appendChild(txt);
    }
  });
  return svg;
}

/* ── Macro donut ──────────────────────────────────────────────────── */
export function donut(parts, { size = 120, thickness = 18 } = {}) {
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}` });
  const c = size / 2, r = c - thickness / 2;
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  let acc = 0;
  const g = svgEl('g', { transform: `rotate(-90 ${c} ${c})` });
  svg.appendChild(g);
  parts.forEach(p => {
    const frac = p.v / total;
    const seg = svgEl('circle', {
      cx: c, cy: c, r, fill: 'none', stroke: p.color, 'stroke-width': thickness,
      'stroke-dasharray': `${(frac * circ).toFixed(2)} ${circ}`,
      'stroke-dashoffset': `${(-acc * circ).toFixed(2)}`,
      'stroke-linecap': 'butt',
    });
    seg.style.transition = 'stroke-dasharray 800ms cubic-bezier(.22,1,.36,1)';
    g.appendChild(seg);
    acc += frac;
  });
  return svg;
}

export { weekdayShort, dateMedium };
