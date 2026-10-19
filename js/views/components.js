/* ═══ Folktracks — shared day components (used by Today and Diary) ═══════ */
import { h, icon, round, clamp, dayKey as todayKey, countTo } from '../util.js';
import { t, nf, ltr, dateFull } from '../i18n.js';
import { getState, getDay, mutateDay, removeEntry, logWeight } from '../store.js';
import { activeGoals, dayTotals, mealTotals, entryTotals, dispEnergy, energyUnitLabel, dispWeight, weightUnit, inputWeightToKg, workoutBurn, dayBudget } from '../nutrition.js';
import { rings } from '../charts.js';
import { toast, promptSheet, sweep } from '../ui.js';
import { haptic } from '../haptics.js';
import { MEALS, mealLabel, openPortion, openAddPanel, openQuickAdd } from './add.js';
import { award, checkDailyAwards, recomputeStreak, streakWindow, levelProgress, rankName } from '../gamify.js';

/* ── Energy rings ─────────────────────────────────────────────────── */
export function ringsCard(day) {
  const g = activeGoals();
  const tot = dayTotals(day);
  const budget = dayBudget(day);
  const s = getState();
  const water = getDay(day).water || 0;
  const remaining = budget - tot.kcal;

  const ringSvg = rings([
    { pct: tot.kcal / budget, color: 'var(--c-kcal)' },
    { pct: tot.protein / g.protein, color: 'var(--c-protein)' },
    { pct: water / s.settings.waterGoalMl, color: 'var(--c-water)' },
  ]);

  const bigNum = h('div.rings-kcal.num');
  countTo(bigNum, Math.abs(dispEnergy(remaining)), { ms: 850, fmt: v => nf(Math.round(v)) });

  const macroRow = (key, val, goal, tint) => {
    const pct = clamp(val / goal, 0, 1.35);
    const fill = h('div.macro-fill', { class: pct > 1.02 ? 'over' : '' });
    requestAnimationFrame(() => { fill.style.width = `${Math.min(100, pct * 100)}%`; });
    return h('div.macro-row',
      h('div.macro-name', h('span.macro-dot', { style: { '--tint': tint } }), t(`macro.${key}`)),
      h('div.macro-val', h('b', null, nf(Math.round(val))), ` / ${nf(Math.round(goal))} g`),
      h('div.macro-bar', { style: { '--tint': tint } }, fill));
  };

  const card = h('div.card.glass.lens.rings-card',
    h('div.rings', ringSvg,
      h('div.rings-center',
        bigNum,
        h('div.rings-label', null, remaining >= 0 ? t('today.remaining') : t('c.over')))),
    h('div.macro-list',
      macroRow('protein', tot.protein, g.protein, 'var(--c-protein)'),
      macroRow('carbs', tot.carbs, g.carbs, 'var(--c-carbs)'),
      macroRow('fat', tot.fat, g.fat, 'var(--c-fat)'),
      h('div.rings-foot',
        h('span.card-note-sm', null, `${t('today.eaten')} ${nf(dispEnergy(tot.kcal))}`),
        h('span.card-note-sm', null, `${t('c.goal')} ${nf(dispEnergy(budget))}`))));

  card.addEventListener('click', () => sweep(card));
  return card;
}

/* ── Meals ────────────────────────────────────────────────────────── */
export function mealsSection(day, onChange) {
  const wrap = h('div.stack');
  for (const m of MEALS) {
    const entries = getDay(day).entries.filter(e => e.meal === m.id);
    const tot = mealTotals(day, m.id);
    const group = h('div.meal.glass', { class: entries.length ? 'has-items' : '' },
      h('div.meal-head',
        h('div.meal-emoji', null, m.emoji),
        h('div.grow',
          h('div.meal-name', null, mealLabel(m.id)),
          h('div.meal-sub', null, entries.length
            ? `${entries.length} ${entries.length === 1 ? t('c.serving') : t('c.servings')} · P ${Math.round(tot.protein)} C ${Math.round(tot.carbs)} F ${Math.round(tot.fat)}`
            : t('today.noItems'))),
        h('div.meal-kcal.num', null, nf(dispEnergy(tot.kcal))),
        h('button.meal-add', {
          'aria-label': t('today.addFood'),
          onclick: e => {
            e.stopPropagation(); haptic('light');
            openAddPanel({ origin: e.currentTarget, meal: m.id, day, onChanged: onChange });
          },
          html: icon('plus'),
        })));

    for (const entry of entries) group.appendChild(entryRow(entry, day, onChange));
    wrap.appendChild(group);
  }
  return wrap;
}

export function entryRow(entry, day, onChange) {
  const tot = entryTotals(entry);
  const surface = h('div.swipe-surface.food-row',
    h('div.meal-emoji', { style: { width: '30px', height: '30px', fontSize: '15px' } }, entry.emoji || '🍽️'),
    h('div.grow',
      h('div.food-name.truncate', null, entry.name),
      h('div.food-meta',
        entry.brand ? h('i', null, entry.brand) : null,
        h('i', null, servingLabel(entry)),
        h('i', null, `P ${Math.round(tot.protein)} · C ${Math.round(tot.carbs)} · F ${Math.round(tot.fat)}`))),
    h('div.food-kcal.num', null, nf(dispEnergy(tot.kcal)), h('small', null, energyUnitLabel())));

  const row = h('div.swipe',
    h('button.swipe-action', {
      'aria-label': t('c.delete'),
      onclick: () => { removeEntry(day, entry.id); recomputeStreak(); haptic('warn'); toast(t('c.deleted'), { kind: 'bad' }); onChange?.(); },
      html: icon('trash'),
    }),
    surface);

  surface.addEventListener('click', () => {
    if (row.dataset.swiped === '1') { resetSwipe(); return; }
    haptic('light');
    openPortion({ entry, day, onDone: onChange });
  });

  /* horizontal swipe → reveal delete */
  let x0 = 0, dx = 0, active = false;
  const OPEN = 88;
  function resetSwipe() { row.dataset.swiped = '0'; surface.style.transform = ''; }
  surface.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; dx = 0; active = true; }, { passive: true });
  surface.addEventListener('touchmove', e => {
    if (!active) return;
    dx = e.touches[0].clientX - x0;
    const rtl = document.documentElement.dir === 'rtl';
    const d = rtl ? -dx : dx;
    if (d < 0) { row.classList.add('dragging'); surface.style.transform = `translateX(${rtl ? -Math.max(d, -OPEN * 1.4) : Math.max(d, -OPEN * 1.4)}px)`; }
  }, { passive: true });
  surface.addEventListener('touchend', () => {
    active = false; row.classList.remove('dragging');
    const rtl = document.documentElement.dir === 'rtl';
    const d = rtl ? -dx : dx;
    if (d < -OPEN * 0.55) { row.dataset.swiped = '1'; surface.style.transform = `translateX(${rtl ? OPEN : -OPEN}px)`; haptic('light'); }
    else resetSwipe();
  }, { passive: true });

  return row;
}

/** "2 × fillet", "185 g", or nothing at all for a quick-add. */
function servingLabel(entry) {
  if (entry.quick) return t('add.quickTitle');
  const per = entry.servingG;
  if (per && per > 1 && entry.serving) {
    const n = round(entry.grams / per, 2);
    return `${nf(n)} × ${entry.serving} · ${Math.round(entry.grams)} ${t('c.g')}`;
  }
  return `${Math.round(entry.grams)} ${t('c.g')}`;
}

/* ── Water ────────────────────────────────────────────────────────── */
export function waterCard(day, onChange) {
  const s = getState();
  const goal = s.settings.waterGoalMl;
  const cup = s.settings.waterCupMl;
  // More than a dozen taps is a chore; above that the cups get bigger,
  // not more numerous.
  const rawCups = Math.ceil(goal / cup);
  const cups = Math.min(12, rawCups);
  const unit = goal / cups;
  const cur = getDay(day).water || 0;
  const filled = Math.round(cur / unit);

  const row = h('div.water-row');
  for (let i = 0; i < cups; i++) {
    row.appendChild(h('button.water-cup', {
      class: i < filled ? 'full' : '',
      'aria-label': `${Math.round((i + 1) * unit)} ml`,
      onclick: () => {
        const next = Math.round((i < filled ? i : i + 1) * unit);
        mutateDay(day, d => { d.water = next; });
        haptic('medium'); checkDailyAwards(day); onChange?.();
      },
    }));
  }

  return h('div.card.card-tight.glass', { style: { '--tint': 'var(--c-water)', gridColumn: '1 / -1' } },
    h('div.card-head',
      h('div.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--c-water)' }, html: icon('drop') }),
        h('div.card-title', null, t('today.water'))),
      h('div.card-note-sm.num', null, `${nf(cur)} / ${nf(goal)} ${t('c.ml')}`)),
    row);
}

/* ── Weight ───────────────────────────────────────────────────────── */
export function weightCard(day, onChange) {
  const d = getDay(day);
  const cur = d.weightKg ?? getState().profile.weightKg;
  const unit = weightUnit();

  return h('button.card.card-tight.glass', {
    style: { display: 'block', width: '100%', textAlign: 'start', '--tint': 'var(--violet)' },
    onclick: async () => {
      haptic('light');
      const v = await promptSheet({
        title: t('today.logWeight'),
        label: `${t('today.weight')} (${unit})`,
        type: 'number', step: '0.1',
        value: String(dispWeight(cur) ?? ''),
      });
      if (v == null || v === '') return;
      const kg = inputWeightToKg(v);
      if (!(kg > 20 && kg < 400)) { toast(t('set.importFail'), { kind: 'bad' }); return; }
      logWeight(day, round(kg, 1));
      award('weighIn', { day });
      haptic('success'); toast(t('c.saved'));
      onChange?.();
    },
  },
    h('div.card-head', { style: { marginBottom: '8px' } },
      h('div.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--violet)' }, html: icon('scale') }),
        h('div.card-title', null, t('today.weight'))),
      h('div.set-chev', { html: icon('chevron') })),
    h('div.tile-val.num', null, nf(dispWeight(cur) ?? '—'), h('small', null, unit)),
    h('div.tile-note', null, d.weightKg ? t('c.today') : t('today.logWeight')));
}

/* ── Today's training, at a glance ────────────────────────────────── */
export function sessionCard(day, onOpen) {
  const w = getState().workouts[day] || [];
  const sets = w.reduce((a, ex) => a + (ex.sets || []).length, 0);
  const vol = w.reduce((a, ex) => a + (ex.sets || []).reduce((b, s) => b + (s.kg || 0) * (s.reps || 0), 0), 0);

  return h('button.card.card-tight.glass', {
    style: { display: 'block', width: '100%', textAlign: 'start', '--tint': 'var(--coral)' },
    onclick: () => { haptic('light'); onOpen?.(); },
  },
    h('div.card-head', { style: { marginBottom: '8px' } },
      h('div.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--coral)' }, html: icon('dumbbell') }),
        h('div.card-title', null, t('nav.train'))),
      h('div.set-chev', { html: icon('chevron') })),
    h('div.tile-val.num', null, sets ? nf(Math.round(vol)) : '—', h('small', null, sets ? weightUnit() : '')),
    h('div.tile-note', null, sets
      ? `${sets} ${t('train.sets').toLowerCase()} · ${nf(dispEnergy(workoutBurn(day)))} ${energyUnitLabel()}`
      : t('train.noWorkout')));
}

/* ── Coach insight ────────────────────────────────────────────────── */
export function insightCard(day) {
  const s = getState();
  const g = activeGoals();
  const tot = dayTotals(day);
  const budget = dayBudget(day);
  const lines = [];

  const remaining = budget - tot.kcal;
  if (tot.kcal === 0) {
    lines.push(t('today.emptyText'));
  } else if (remaining < -60) {
    lines.push(t('today.overBy', { n: `${nf(dispEnergy(-remaining))} ${energyUnitLabel()}` }));
  } else if (Math.abs(remaining) <= 60) {
    lines.push(t('today.balanced'));
  } else {
    lines.push(t('today.leftToday', { n: nf(dispEnergy(remaining)) }));
  }

  if (tot.protein < g.protein * 0.9 && tot.kcal > 0) {
    lines.push(t('today.proteinLead', { a: Math.round(tot.protein), b: Math.round(g.protein) }));
  }

  const p = s.profile;
  const unit = weightUnit();
  if (p.goal === 'cut') lines.push(t('today.deficitOn', { n: nf(Math.round(Math.max(0, budget - tot.kcal + 0))), r: p.rate, unit }));
  else if (p.goal === 'bulk' || p.goal === 'lean_bulk') lines.push(t('today.surplusOn', { n: nf(Math.round(p.rate * 7700 / 7)), r: p.rate, unit }));
  else lines.push(t('today.maintainOn'));

  const late = getDay(day).entries.filter(e => new Date(e.at).getHours() >= 20);
  if (late.length && late.length >= getDay(day).entries.length * 0.5 && getDay(day).entries.length > 2) {
    lines.push(t('today.lateNote'));
  }

  const burn = workoutBurn(day);

  return h('div.card.glass', { style: { '--tint': 'var(--mint)' } },
    h('div.card-head',
      h('div.row', { style: { gap: '8px' } },
        h('span', { style: { color: 'var(--mint)' }, html: icon('sparkle') }),
        h('div.card-title', null, t('today.insight'))),
      burn ? h('span.pill-tag', { style: { '--tint': 'var(--coral)' } },
        ltr(`+${nf(dispEnergy(burn))} ${energyUnitLabel()}`)) : null),
    h('div.stack', { style: { gap: '9px' } },
      ...lines.slice(0, 3).map(l => h('p.body-copy', null, l))));
}

/* ── Streak + level (gamification, opt-out) ───────────────────────── */
export function streakCard() {
  const s = getState();
  if (!s.settings.gamification) return null;
  const win = streakWindow(7);
  const lp = levelProgress(s.game.xp);

  const strip = h('div.streak-strip');
  for (const d of win) {
    strip.appendChild(h('div.streak-day', { class: `${d.hit ? 'hit' : ''} ${d.today ? 'today' : ''}` },
      h('div.streak-dot', { html: d.hit ? icon('check') : '' }),
      h('div.streak-label', null, new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'narrow' })
        .format(new Date(d.key)))));
  }

  const xpFill = h('div.xp-fill');
  requestAnimationFrame(() => { xpFill.style.width = `${lp.pct * 100}%`; });

  return h('div.card.glass.level-card',
    h('div.level-top',
      h('div.level-badge.num', null, String(lp.level)),
      h('div.grow',
        h('div.level-name', null, rankName(lp.level)),
        h('div.level-sub', null, s.game.streak > 0
          ? t('game.streakDays', { n: s.game.streak })
          : t('today.streakRisk', { n: Math.max(1, s.game.best) }))),
      h('div.row', { style: { gap: '5px', color: 'var(--amber)' } },
        h('span', { html: icon('flame') }),
        h('span.num', { style: { fontWeight: 700 } }, String(s.game.streak)))),
    h('div.xp-bar', xpFill),
    h('div.xp-meta',
      h('span', null, `${nf(lp.into)} / ${nf(lp.need)} ${t('game.xp')}`),
      h('span', null, t('prog.xpTo', { n: nf(lp.need - lp.into), l: lp.level + 1 }))),
    strip);
}

/* ── Quick action row ─────────────────────────────────────────────── */
export function quickActions(day, onChange) {
  return h('div.row', { style: { gap: '10px' } },
    h('button.btn.btn-sm.btn-ghost.grow', {
      onclick: e => { haptic('light'); openAddPanel({ origin: e.currentTarget, day, onChanged: onChange }); },
    }, h('span', { html: icon('search') }), t('today.addFood')),
    h('button.btn.btn-sm.btn-ghost.grow', {
      onclick: () => { haptic('light'); openQuickAdd({ day, onDone: onChange }); },
    }, h('span', { html: icon('bolt') }), t('today.quickAdd')));
}

export { dayTotals, activeGoals };
