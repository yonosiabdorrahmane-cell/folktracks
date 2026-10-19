/* ═══ Folktracks — Train ═════════════════════════════════════════════════ */
import { h, icon, uid, dayKey, addDays, keyToDate, round, sum, clamp, norm } from '../util.js';
import { t, nf, ltr, dateMedium } from '../i18n.js';
import { getState, getWorkout, mutateWorkout, update } from '../store.js';
import { openSheet, toast, confirmSheet, segmented, promptSheet } from '../ui.js';
import { haptic } from '../haptics.js';
import { award, recomputeStreak, syncBadges } from '../gamify.js';
import { workoutBurn, dispEnergy, energyUnitLabel, dispWeight, weightUnit, inputWeightToKg } from '../nutrition.js';

/* ── Exercise library ─────────────────────────────────────────────── */
const EX = `
Bench press|chest|barbell
Incline bench press|chest|barbell
Dumbbell press|chest|dumbbell
Chest fly|chest|machine
Push-up|chest|body
Overhead press|shoulders|barbell
Dumbbell shoulder press|shoulders|dumbbell
Lateral raise|shoulders|dumbbell
Rear delt fly|shoulders|dumbbell
Face pull|shoulders|cable
Pull-up|back|body
Chin-up|back|body
Lat pulldown|back|cable
Barbell row|back|barbell
Dumbbell row|back|dumbbell
Seated cable row|back|cable
T-bar row|back|barbell
Deadlift|back|barbell
Romanian deadlift|hamstrings|barbell
Back squat|quads|barbell
Front squat|quads|barbell
Leg press|quads|machine
Bulgarian split squat|quads|dumbbell
Lunge|quads|dumbbell
Leg extension|quads|machine
Leg curl|hamstrings|machine
Hip thrust|glutes|barbell
Calf raise|calves|machine
Barbell curl|biceps|barbell
Dumbbell curl|biceps|dumbbell
Hammer curl|biceps|dumbbell
Preacher curl|biceps|machine
Triceps pushdown|triceps|cable
Skull crusher|triceps|barbell
Overhead triceps extension|triceps|dumbbell
Dip|triceps|body
Plank|core|body
Hanging leg raise|core|body
Cable crunch|core|cable
Russian twist|core|body
Farmer carry|core|dumbbell
Rowing machine|cardio|cardio
Treadmill run|cardio|cardio
Cycling|cardio|cardio
Stair climber|cardio|cardio
Jump rope|cardio|cardio
`.trim().split('\n').map(l => { const [name, muscle, kind] = l.split('|'); return { name, muscle, kind, search: norm(name + ' ' + muscle) }; });

const TEMPLATES = {
  push: ['Bench press', 'Overhead press', 'Incline bench press', 'Lateral raise', 'Triceps pushdown'],
  pull: ['Pull-up', 'Barbell row', 'Lat pulldown', 'Face pull', 'Barbell curl'],
  legs: ['Back squat', 'Romanian deadlift', 'Leg press', 'Leg curl', 'Calf raise'],
  upper: ['Bench press', 'Barbell row', 'Overhead press', 'Lat pulldown', 'Dumbbell curl', 'Triceps pushdown'],
  lower: ['Back squat', 'Hip thrust', 'Leg extension', 'Leg curl', 'Calf raise'],
  full: ['Back squat', 'Bench press', 'Barbell row', 'Overhead press', 'Plank'],
};

const MUSCLE_TINT = {
  chest: 'var(--rose)', back: 'var(--azure)', shoulders: 'var(--amber)',
  quads: 'var(--violet)', hamstrings: 'var(--violet)', glutes: 'var(--violet)',
  calves: 'var(--violet)', biceps: 'var(--mint)', triceps: 'var(--mint)',
  core: 'var(--aqua)', cardio: 'var(--coral)',
};

/* ── View ─────────────────────────────────────────────────────────── */
export function render(root, ctx) {
  const day = ctx.day || dayKey();
  const session = getWorkout(day);
  const wrap = h('div.stack.stagger');
  const refresh = () => ctx.refresh();

  const vol = sum(session, ex => sum(ex.sets || [], s => (s.kg || 0) * (s.reps || 0)));
  const setCount = sum(session, ex => (ex.sets || []).length);

  wrap.append(h('div.card.glass',
    h('div.card-head',
      h('div', null,
        h('div.card-title', null, t('train.today')),
        h('div.card-note', null, dateMedium(keyToDate(day)))),
      h('span.pill-tag', { style: { '--tint': 'var(--coral)' } },
        ltr(`${nf(dispEnergy(workoutBurn(day)))} ${energyUnitLabel()}`))),
    h('div.tiles',
      metric('dumbbell', t('train.totalVolume'), nf(Math.round(dispWeight(vol, 0) || 0)), weightUnit(), 'var(--violet)'),
      metric('bolt', t('train.sets'), String(setCount), '', 'var(--mint)'))));

  if (!session.length) {
    wrap.append(h('div.card.glass',
      h('div.empty-state',
        h('div.empty-icon', { html: icon('dumbbell') }),
        h('div.empty-title', null, t('train.noWorkout')),
        h('div.empty-text', null, t('train.noWorkoutHint')))));
  } else {
    const list = h('div.card.glass', { style: { padding: '4px 0' } });
    session.forEach((ex, i) => list.append(exerciseRow(ex, i, day, refresh)));
    wrap.append(list);
  }

  wrap.append(h('button.btn.btn-block.btn-primary', {
    onclick: () => openExercisePicker({ day, onDone: refresh }),
  }, h('span', { html: icon('plus') }), t('train.addExercise')));

  /* templates */
  const tplRow = h('div.chips');
  for (const [key, names] of Object.entries(TEMPLATES)) {
    tplRow.append(h('button.chip', {
      onclick: async () => {
        haptic('medium');
        mutateWorkout(day, w => {
          for (const n of names) {
            if (w.some(e => e.name === n)) continue;
            const meta = EX.find(e => e.name === n);
            w.push({ id: uid(), name: n, muscle: meta?.muscle || 'other', sets: [] });
          }
        });
        toast(t('c.saved')); refresh();
      },
    }, t(`train.tpl.${key}`)));
  }
  wrap.append(h('div', null, h('div.section-title', null, t('train.templates')), tplRow));

  wrap.append(historyCard(ctx));
  root.append(wrap);
}

function metric(ic, label, value, unit, tint) {
  return h('div.tile.glass.glass-thin', { style: { '--tint': tint } },
    h('div.tile-top', h('span', { html: icon(ic) }), h('span', null, label)),
    h('div.tile-val.num', null, value, unit ? h('small', null, unit) : null));
}

/* ── One exercise, with its sets ──────────────────────────────────── */
function exerciseRow(ex, index, day, refresh) {
  const sets = ex.sets || [];
  const vol = sum(sets, s => (s.kg || 0) * (s.reps || 0));
  const best = bestSet(sets);
  const prev = previousBest(ex.name, day);

  const pills = h('div.set-pills');
  sets.forEach((s, i) => {
    const isPr = prev != null && est1rm(s) > prev * 1.001;
    pills.append(h('button.set-pill', {
      class: isPr ? 'pr' : '',
      onclick: () => editSet({ day, exId: ex.id, index: i, set: s, refresh }),
    }, `${nf(round(dispWeight(s.kg, 1) ?? 0, 1))}${weightUnit()} × ${s.reps}${isPr ? ' 🏆' : ''}`));
  });
  pills.append(h('button.set-pill', {
    style: { color: 'var(--azure)' },
    onclick: () => editSet({ day, exId: ex.id, index: -1, set: sets[sets.length - 1] || { kg: 20, reps: 8 }, refresh }),
  }, `+ ${t('train.addSet')}`));

  return h('div.ex-row',
    h('div.meal-emoji', { style: { color: MUSCLE_TINT[ex.muscle] || 'var(--ink-2)' }, html: icon('dumbbell') }),
    h('div.grow',
      h('div.row-between',
        h('div.ex-name', null, ex.name),
        h('div.ex-vol.num', null, vol ? `${nf(Math.round(dispWeight(vol, 0)))} ${weightUnit()}` : '—')),
      h('div.ex-sets', null,
        `${sets.length} ${t('train.sets')}${best ? ` · ${t('train.est1rm')} ${nf(Math.round(dispWeight(est1rm(best), 0)))} ${weightUnit()}` : ''}`),
      pills),
    h('button.meal-add', {
      'aria-label': t('c.delete'),
      onclick: async () => {
        if (!await confirmSheet({ title: ex.name, message: t('c.delete'), confirmLabel: t('c.delete') })) return;
        mutateWorkout(day, w => { const i = w.findIndex(e => e.id === ex.id); if (i >= 0) w.splice(i, 1); });
        haptic('warn'); refresh();
      },
      html: icon('trash'),
    }));
}

const est1rm = s => (s.kg || 0) * (1 + (s.reps || 0) / 30);   // Epley
function bestSet(sets) { return sets.reduce((b, s) => (!b || est1rm(s) > est1rm(b) ? s : b), null); }

function previousBest(name, day) {
  const w = getState().workouts;
  let best = null;
  for (const [k, list] of Object.entries(w)) {
    if (k >= day) continue;
    for (const ex of list) {
      if (ex.name !== name) continue;
      for (const s of ex.sets || []) best = Math.max(best ?? 0, est1rm(s));
    }
  }
  return best;
}

/* ── Set editor ───────────────────────────────────────────────────── */
function editSet({ day, exId, index, set, refresh }) {
  const kgInput = h('input.field', { type: 'number', inputmode: 'decimal', step: '0.5', value: String(round(dispWeight(set.kg ?? 20, 1), 1)) });
  const repInput = h('input.field', { type: 'number', inputmode: 'numeric', step: '1', value: String(set.reps ?? 8) });
  openSheet({
    title: index < 0 ? t('train.addSet') : t('c.edit'),
    build(body) {
      body.append(h('div.inline-2',
        h('div', null, h('label.form-lbl', null, `${t('train.load')} (${weightUnit()})`), kgInput),
        h('div', null, h('label.form-lbl', null, t('train.reps')), repInput)));
      setTimeout(() => kgInput.focus(), 240);
    },
    actions: [
      {
        label: t('c.save'), kind: 'primary',
        onClick: api => {
          const kg = inputWeightToKg(kgInput.value);
          const reps = Math.max(1, Math.round(Number(repInput.value) || 0));
          if (!(kg >= 0)) return;
          mutateWorkout(day, w => {
            const ex = w.find(e => e.id === exId);
            if (!ex) return;
            ex.sets = ex.sets || [];
            if (index < 0) ex.sets.push({ kg: round(kg, 1), reps });
            else ex.sets[index] = { kg: round(kg, 1), reps };
          });
          if (index < 0) { award('workout', { day }); recomputeStreak(); syncBadges(); }
          haptic('success'); api.close(); refresh();
        },
      },
      index >= 0 ? {
        label: t('c.delete'), kind: 'danger',
        onClick: api => {
          mutateWorkout(day, w => { const ex = w.find(e => e.id === exId); ex?.sets.splice(index, 1); });
          haptic('warn'); api.close(); refresh();
        },
      } : null,
    ].filter(Boolean),
  });
}

/* ── Exercise picker ──────────────────────────────────────────────── */
function openExercisePicker({ day, onDone }) {
  const search = h('input.field', { type: 'search', placeholder: t('train.exercisePh'), autocomplete: 'off' });
  const list = h('div.result-list');

  function run() {
    const q = norm(search.value);
    list.innerHTML = '';
    const items = (q ? EX.filter(e => e.search.includes(q)) : EX).slice(0, 60);
    if (!items.length) {
      list.append(h('button.result', {
        onclick: () => addEx({ name: search.value.trim(), muscle: 'other' }),
      }, h('div.result-badge', null, '＋'), h('div.grow', h('div.food-name', null, search.value.trim()), h('div.food-meta', h('i', null, t('c.new'))))));
      return;
    }
    for (const e of items) {
      list.append(h('button.result', { onclick: () => addEx(e) },
        h('div.result-badge', { style: { color: MUSCLE_TINT[e.muscle] || 'var(--ink-2)' }, html: icon('dumbbell') }),
        h('div.grow', h('div.food-name', null, e.name), h('div.food-meta', h('i', null, e.muscle), h('i', null, e.kind)))));
    }
  }

  let sheet;
  function addEx(e) {
    if (!e.name) return;
    mutateWorkout(day, w => { w.push({ id: uid(), name: e.name, muscle: e.muscle, sets: [] }); });
    haptic('success'); sheet.close(); onDone?.();
  }

  sheet = openSheet({
    title: t('train.addExercise'),
    build(body) { body.append(search, h('div', { style: { height: '10px' } }), list); run(); search.addEventListener('input', run); },
  });
}

/* ── History ──────────────────────────────────────────────────────── */
function historyCard(ctx) {
  const w = getState().workouts;
  const keys = Object.keys(w).filter(k => w[k].length).sort().reverse().slice(0, 8);
  if (!keys.length) return h('div');
  const card = h('div.card.glass', { style: { padding: '4px 0' } });
  card.append(h('div.section-title', { style: { padding: '12px 16px 6px' } }, t('train.history')));
  for (const k of keys) {
    const vol = sum(w[k], ex => sum(ex.sets || [], s => (s.kg || 0) * (s.reps || 0)));
    card.append(h('button.food-row', { style: { width: '100%', textAlign: 'start' }, onclick: () => { haptic('light'); ctx.setDay?.(k); } },
      h('div.meal-emoji', { html: icon('clock') }),
      h('div.grow',
        h('div.food-name', null, dateMedium(keyToDate(k))),
        h('div.food-meta', h('i', null, w[k].map(e => e.name).slice(0, 3).join(', ')))),
      h('div.food-kcal.num', null, `${nf(Math.round(dispWeight(vol, 0)))}`, h('small', null, weightUnit()))));
  }
  return card;
}
