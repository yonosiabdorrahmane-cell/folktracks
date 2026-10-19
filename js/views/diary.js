/* ═══ Folktracks — Diary (any past or future day) ════════════════════════ */
import { h, icon, dayKey, addDays, keyToDate, isToday, isFuture, round, debounce } from '../util.js';
import { t, nf, dateFull, weekdayShort } from '../i18n.js';
import { getState, getDay, mutateDay } from '../store.js';
import { ringsCard, mealsSection, waterCard, weightCard } from './components.js';
import { dayTotals, activeGoals, dispEnergy, energyUnitLabel } from '../nutrition.js';
import { barChart } from '../charts.js';
import { haptic } from '../haptics.js';

export function render(root, ctx) {
  const day = ctx.day || dayKey();
  const wrap = h('div.stack.stagger');

  /* date navigator */
  wrap.append(h('div.card.card-tight.glass.date-nav',
    h('button', { 'aria-label': t('c.back'), onclick: () => { haptic('light'); ctx.setDay(addDays(day, -1)); }, html: icon('back') }),
    h('div', { style: { textAlign: 'center' } },
      h('div.date-lbl', null, isToday(day) ? t('c.today') : dateFull(keyToDate(day))),
      h('div.card-note', null, `${nf(dispEnergy(dayTotals(day).kcal))} ${energyUnitLabel()}`)),
    h('button', {
      'aria-label': t('c.continue'), disabled: isFuture(addDays(day, 1)) || null,
      onclick: () => { haptic('light'); ctx.setDay(addDays(day, 1)); },
      html: icon('chevron'),
    })));

  wrap.append(ringsCard(day));
  wrap.append(weekStrip(day, ctx));

  wrap.append(h('div.section-title', null, t('today.meals')));
  wrap.append(mealsSection(day, () => ctx.refresh()));

  wrap.append(h('div.tiles', waterCard(day, () => ctx.refresh()), weightCard(day, () => ctx.refresh())));

  /* free-text note */
  const note = h('textarea.field', {
    rows: '3', placeholder: t('diary.notePh'),
    style: { height: 'auto', padding: '13px 15px', lineHeight: '1.45', resize: 'none' },
  });
  note.value = getDay(day).note || '';
  note.addEventListener('input', debounce(() => { mutateDay(day, d => { d.note = note.value; }); }, 400));
  wrap.append(h('div.card.glass',
    h('div.card-head', h('div.card-title', null, t('diary.note'))),
    note));

  root.append(wrap);
}

/** Last 14 days at a glance — tap any bar to jump to that day. */
function weekStrip(day, ctx) {
  const g = activeGoals();
  const bars = [];
  for (let i = 13; i >= 0; i--) {
    const k = addDays(dayKey(), -i);
    bars.push({ v: dayTotals(k).kcal, label: i % 3 === 0 ? weekdayShort(keyToDate(k)).slice(0, 2) : '', key: k });
  }
  const svg = barChart(bars, { width: 320, height: 132, goal: g.kcal, color: 'var(--c-kcal)' });
  svg.style.height = '132px';
  svg.addEventListener('click', e => {
    const r = svg.getBoundingClientRect();
    const idx = Math.floor(((e.clientX - r.left) / r.width) * bars.length);
    const b = bars[Math.max(0, Math.min(bars.length - 1, idx))];
    if (b) { haptic('select'); ctx.setDay(b.key); }
  });
  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('prog.calories')),
      h('span.card-note', null, `${t('c.goal')} ${nf(dispEnergy(g.kcal))}`)),
    svg);
}
