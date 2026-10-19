/* ═══ Folktracks — Progress ══════════════════════════════════════════════ */
import { h, icon, dayKey, addDays, keyToDate, round, clamp, sum } from '../util.js';
import { t, nf, ltr, dateMedium, weekdayShort } from '../i18n.js';
import { getState, weightSeries } from '../store.js';
import {
  dayTotals, activeGoals, bmi, bmiBand, bmr, tdee, leanMass,
  weightTrend, projectTargetDate, ewma, dispWeight, weightUnit, dispEnergy, energyUnitLabel,
} from '../nutrition.js';
import { lineChart, barChart, donut } from '../charts.js';
import { segmented } from '../ui.js';
import { levelProgress, rankName, badgeState, streakWindow } from '../gamify.js';
import { haptic } from '../haptics.js';

let range = 30;

export function render(root, ctx) {
  const wrap = h('div.stack.stagger');

  wrap.append(h('div', { style: { padding: '2px 0 2px' } },
    segmented([
      { value: 7, label: t('prog.week') },
      { value: 30, label: t('prog.month') },
      { value: 90, label: t('prog.quarter') },
    ], range, v => { range = v; haptic('select'); ctx.refresh(); })));

  wrap.append(weightCard());
  wrap.append(caloriesCard());
  wrap.append(macroCard());
  wrap.append(bodyCard());
  wrap.append(consistencyCard());
  if (getState().settings.gamification) wrap.append(levelCard(), badgesCard());

  root.append(wrap);
}

/* ── Weight ───────────────────────────────────────────────────────── */
function weightCard() {
  const raw = weightSeries().filter(p => keyToDate(p.d) >= new Date(Date.now() - range * 86400000));
  const s = getState();
  const unit = weightUnit();

  if (raw.length < 2) {
    return h('div.card.glass',
      h('div.card-head', h('div.card-title', null, t('prog.weight'))),
      h('div.empty-state', { style: { padding: '20px 0' } },
        h('div.empty-icon', { html: icon('scale') }),
        h('div.empty-text', null, t('c.nodata'))));
  }

  const smooth = ewma(raw, 0.3);
  const points = smooth.map(p => ({ v: dispWeight(p.kg, 2), label: dateMedium(keyToDate(p.d)) }));
  const tr = weightTrend(raw);
  const delta = raw[raw.length - 1].kg - raw[0].kg;
  const proj = s.profile.targetWeightKg ? projectTargetDate(raw, s.profile.targetWeightKg) : null;

  const chart = lineChart(points, {
    width: 330, height: 158, color: 'var(--violet)',
    goal: s.profile.targetWeightKg ? dispWeight(s.profile.targetWeightKg, 2) : null,
  });
  chart.style.height = '158px';

  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.weight')),
      h('span.pill-tag', { style: { '--tint': delta <= 0 ? 'var(--mint)' : 'var(--amber)' } },
        ltr(`${delta > 0 ? '+' : '−'}${nf(Math.abs(round(dispWeight(Math.abs(delta), 2), 2)))} ${unit}`))),
    chart,
    h('div.tiles', { style: { marginTop: '14px' } },
      tile('bolt', t('prog.weeklyAvg'),
        tr ? ltr(`${tr.perWeek > 0 ? '+' : '−'}${nf(Math.abs(round(dispWeight(Math.abs(tr.perWeek), 2), 2)))}`) : '—',
        unit, 'var(--violet)'),
      tile('target', t('set.target'), s.profile.targetWeightKg ? nf(dispWeight(s.profile.targetWeightKg, 1)) : '—', unit, 'var(--mint)')),
    proj ? h('div.callout', { style: { marginTop: '12px', '--tint': 'var(--mint)' } },
      h('span', { html: icon('sparkle') }),
      h('p', null, t('prog.projected', {
        w: nf(dispWeight(s.profile.targetWeightKg, 1)), unit,
        d: dateMedium(proj),
      }))) : null);
}

/* ── Calories ─────────────────────────────────────────────────────── */
function caloriesCard() {
  const g = activeGoals();
  const bars = [];
  for (let i = range - 1; i >= 0; i--) {
    const k = addDays(dayKey(), -i);
    bars.push({ v: dayTotals(k).kcal, label: range <= 14 && i % 2 === 0 ? weekdayShort(keyToDate(k)).slice(0, 2) : '' });
  }
  const logged = bars.filter(b => b.v > 0);
  const avg = logged.length ? sum(logged, b => b.v) / logged.length : 0;
  const chart = barChart(bars, { width: 330, height: 150, goal: g.kcal, color: 'var(--c-kcal)' });
  chart.style.height = '150px';

  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.calories')),
      h('span.card-note', null, `${t('c.avg')} ${nf(dispEnergy(avg))} ${energyUnitLabel()}`)),
    chart,
    h('div.chart-legend',
      h('span', h('i', { style: { background: 'var(--c-kcal)' } }), t('today.eaten')),
      h('span', h('i', { style: { background: 'var(--ink-3)' } }), `${t('c.goal')} ${nf(dispEnergy(g.kcal))}`),
      h('span', h('i', { style: { background: 'var(--coral)' } }), t('c.over'))));
}

/* ── Macro split ──────────────────────────────────────────────────── */
function macroCard() {
  let p = 0, c = 0, f = 0, days = 0;
  for (let i = range - 1; i >= 0; i--) {
    const tot = dayTotals(addDays(dayKey(), -i));
    if (tot.kcal <= 0) continue;
    p += tot.protein; c += tot.carbs; f += tot.fat; days++;
  }
  if (!days) {
    return h('div.card.glass',
      h('div.card-head', h('div.card-title', null, t('prog.macroSplit'))),
      h('div.empty-text', { style: { textAlign: 'center', padding: '14px 0' } }, t('c.nodata')));
  }
  const kcalP = p * 4, kcalC = c * 4, kcalF = f * 9;
  const total = kcalP + kcalC + kcalF || 1;
  const parts = [
    { v: kcalP, color: 'var(--c-protein)', key: 'protein', g: p / days },
    { v: kcalC, color: 'var(--c-carbs)', key: 'carbs', g: c / days },
    { v: kcalF, color: 'var(--c-fat)', key: 'fat', g: f / days },
  ];
  const ring = donut(parts, { size: 116, thickness: 20 });
  ring.style.width = '116px'; ring.style.height = '116px';

  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.macroSplit')),
      h('span.card-note', null, `${days} ${days === 1 ? t('c.day') : t('c.days')}`)),
    h('div.row', { style: { gap: '18px' } },
      ring,
      h('div.macro-list.grow',
        ...parts.map(part => h('div.macro-row',
          h('div.macro-name', h('span.macro-dot', { style: { '--tint': part.color } }), t(`macro.${part.key}`)),
          h('div.macro-val', h('b', null, `${Math.round((part.v / total) * 100)}%`), ` · ${Math.round(part.g)} g`))))));
}

/* ── Body metrics ─────────────────────────────────────────────────── */
function bodyCard() {
  const p = getState().profile;
  const b = bmi(p);
  const lm = leanMass(p);
  const bandTint = { under: 'var(--amber)', normal: 'var(--mint)', over: 'var(--amber)', high: 'var(--coral)' }[bmiBand(b)];

  return h('div.card.glass',
    h('div.card-head', h('div.card-title', null, t('prog.body'))),
    h('div.tiles',
      tile('user', t('prog.bmi'), nf(round(b, 1)), '', bandTint),
      tile('bolt', t('prog.bmr'), nf(dispEnergy(bmr(p))), energyUnitLabel(), 'var(--aqua)'),
      tile('flame', t('prog.tdee'), nf(dispEnergy(tdee(p))), energyUnitLabel(), 'var(--coral)'),
      lm ? tile('shield', t('prog.lbm'), nf(dispWeight(lm, 1)), weightUnit(), 'var(--mint)') : null));
}

/* ── Consistency ──────────────────────────────────────────────────── */
function consistencyCard() {
  const s = getState();
  let logged = 0;
  for (let i = range - 1; i >= 0; i--) {
    const k = addDays(dayKey(), -i);
    if ((s.days[k]?.entries?.length || 0) > 0) logged++;
  }
  const pct = Math.round((logged / range) * 100);

  const win = streakWindow(7);
  const strip = h('div.streak-strip', { style: { marginTop: '14px' } });
  for (const d of win) {
    strip.appendChild(h('div.streak-day', { class: `${d.hit ? 'hit' : ''} ${d.today ? 'today' : ''}` },
      h('div.streak-dot', { html: d.hit ? icon('check') : '' }),
      h('div.streak-label', null, new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'narrow' }).format(new Date(d.key)))));
  }

  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.consistency')),
      h('span.pill-tag', { style: { '--tint': pct >= 80 ? 'var(--mint)' : 'var(--amber)' } }, `${pct}%`)),
    h('div.tiles',
      tile('book', t('prog.daysLogged'), `${logged}`, `/ ${range}`, 'var(--azure)'),
      tile('flame', t('prog.streak'), `${s.game.streak}`, t('c.days'), 'var(--amber)'),
      tile('star', t('prog.best'), `${s.game.best}`, t('c.days'), 'var(--violet)')),
    strip);
}

/* ── Level & badges ───────────────────────────────────────────────── */
function levelCard() {
  const s = getState();
  const lp = levelProgress(s.game.xp);
  const fill = h('div.xp-fill');
  requestAnimationFrame(() => { fill.style.width = `${lp.pct * 100}%`; });
  return h('div.card.glass.level-card',
    h('div.level-top',
      h('div.level-badge.num', null, String(lp.level)),
      h('div.grow',
        h('div.level-name', null, `${t('prog.level', { n: lp.level })} · ${rankName(lp.level)}`),
        h('div.level-sub', null, `${nf(s.game.xp)} ${t('game.xp')}`))),
    h('div.xp-bar', fill),
    h('div.xp-meta',
      h('span', null, `${nf(lp.into)} / ${nf(lp.need)}`),
      h('span', null, t('prog.xpTo', { n: nf(lp.need - lp.into), l: lp.level + 1 }))));
}

function badgesCard() {
  const list = badgeState();
  const grid = h('div.badges');
  for (const b of list) {
    grid.appendChild(h('button.badge', {
      class: b.earned ? 'earned' : '',
      style: { '--tint': b.tint },
      onclick: () => { haptic('light'); import('../ui.js').then(({ toast }) => toast(`${b.emoji}  ${b.earned ? b.name : b.desc}`, { iconName: 'star', ms: 2600 })); },
    },
      h('div.badge-icon', null, b.emoji),
      h('div.badge-name', null, b.name)));
  }
  const earned = list.filter(b => b.earned).length;
  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.badges')),
      h('span.card-note', null, `${earned} / ${list.length}`)),
    grid);
}

/* ── tiny tile helper ─────────────────────────────────────────────── */
function tile(ic, label, value, unit, tint) {
  return h('div.tile.glass.glass-thin', { style: { '--tint': tint } },
    h('div.tile-top', h('span', { html: icon(ic) }), h('span', null, label)),
    h('div.tile-val.num', null, value, unit ? h('small', null, unit) : null));
}
