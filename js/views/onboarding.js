/* ═══ Folktracks — first run ═════════════════════════════════════════════ */
import { h, icon, clamp, round } from '../util.js';
import { t, nf, LANGS, setLang, getLang } from '../i18n.js';
import { getState, update } from '../store.js';
import { segmented } from '../ui.js';
import { haptic } from '../haptics.js';
import {
  ACTIVITY, GOAL_DELTA, computeGoals, dispWeight, weightUnit, inputWeightToKg,
  dispEnergy, energyUnitLabel, bmr, tdee,
} from '../nutrition.js';
import { applyTheme } from '../theme.js';

export function runOnboarding(onDone) {
  const draft = { ...getState().profile };
  let step = 0;
  const steps = ['welcome', 'about', 'goal', 'activity', 'pace', 'plan'];

  const root = document.getElementById('panelRoot');
  const panel = h('div.panel.glass.glass-panel.ob.anim-rise');
  const progress = h('div.ob-progress', ...steps.map(() => h('i')));
  const bodyEl = h('div.ob-body');
  const foot = h('div.ob-foot');
  panel.append(h('div', { style: { height: 'calc(var(--sat) + 18px)' } }), progress, bodyEl, foot);
  root.append(panel);

  function draw() {
    [...progress.children].forEach((el, i) => el.classList.toggle('on', i <= step));
    bodyEl.innerHTML = '';
    foot.innerHTML = '';
    bodyEl.scrollTop = 0;
    const render = RENDER[steps[step]];
    render();
  }

  const next = () => { haptic('medium'); step = Math.min(steps.length - 1, step + 1); draw(); };
  const back = () => { haptic('light'); step = Math.max(0, step - 1); draw(); };

  function footer(primaryLabel, onPrimary, { showBack = true } = {}) {
    foot.append(h('button.btn.btn-block.btn-primary', { onclick: onPrimary }, primaryLabel));
    if (showBack && step > 0) foot.append(h('button.btn.btn-block.btn-ghost', { onclick: back }, t('c.back')));
  }

  const RENDER = {
    welcome() {
      bodyEl.append(
        h('div', { style: { textAlign: 'center', padding: '26px 0 20px' } },
          h('div', {
            style: {
              width: '96px', height: '96px', margin: '0 auto 22px', borderRadius: '30px',
              background: 'var(--grad-brand)', display: 'grid', placeItems: 'center',
              boxShadow: '0 18px 44px -18px var(--aqua)',
            },
          }, h('span', { style: { fontSize: '44px' } }, '⛰️')),
          h('h1.ob-h', null, t('ob.welcome')),
          h('p.ob-p', null, t('ob.welcomeP'))),
        h('div', null,
          h('label.form-lbl', null, t('set.language')),
          h('div.set-group.glass', ...LANGS.map(l => h('button.lang-row', {
            'aria-selected': String(getLang() === l.code),
            onclick: e => {
              haptic('select');
              setLang(l.code);
              update(s => { s.settings.lang = l.code; return s; });
              [...e.currentTarget.parentElement.children].forEach(c => c.setAttribute('aria-selected', 'false'));
              e.currentTarget.setAttribute('aria-selected', 'true');
              setTimeout(draw, 120);
            },
          },
            h('div.lang-flag', null, l.flag),
            h('div.grow', h('div.lang-name', null, l.native)),
            h('div.lang-check', { html: icon('check') }))))));
      footer(t('ob.start'), next, { showBack: false });
    },

    about() {
      const units = getState().settings.units;
      const f = {
        name: h('input.field', { type: 'text', value: draft.name || '', placeholder: t('set.name') }),
        age: h('input.field', { type: 'number', inputmode: 'numeric', value: String(draft.age) }),
        height: h('input.field', { type: 'number', inputmode: 'decimal', value: String(units === 'imperial' ? round(draft.heightCm / 2.54, 1) : draft.heightCm) }),
        weight: h('input.field', { type: 'number', inputmode: 'decimal', step: '0.1', value: String(dispWeight(draft.weightKg, 1)) }),
      };
      bodyEl.append(
        h('h1.ob-h', null, t('ob.about')),
        h('p.ob-p', null, t('ob.aboutP')),
        h('div.form-grid',
          h('div', null, h('label.form-lbl', null, `${t('set.name')} (${t('c.optional')})`), f.name),
          h('div', null, h('label.form-lbl', null, t('set.units')),
            segmented([{ value: 'metric', label: t('set.metric') }, { value: 'imperial', label: t('set.imperial') }],
              units, v => { update(s => { s.settings.units = v; return s; }); setTimeout(draw, 200); })),
          h('div', null, h('label.form-lbl', null, t('set.sex')),
            segmented([{ value: 'male', label: t('set.male') }, { value: 'female', label: t('set.female') }],
              draft.sex, v => { draft.sex = v; })),
          h('div.inline-2',
            h('div', null, h('label.form-lbl', null, t('set.age')), f.age),
            h('div', null, h('label.form-lbl', null, `${t('set.height')} (${units === 'imperial' ? 'in' : 'cm'})`), f.height)),
          h('div', null, h('label.form-lbl', null, `${t('set.weight')} (${weightUnit()})`), f.weight)));
      footer(t('c.continue'), () => {
        draft.name = f.name.value.trim();
        draft.age = clamp(Math.round(Number(f.age.value) || 25), 12, 100);
        draft.heightCm = clamp(units === 'imperial' ? Number(f.height.value) * 2.54 : Number(f.height.value), 100, 250);
        draft.weightKg = clamp(inputWeightToKg(f.weight.value), 25, 400);
        if (!draft.targetWeightKg) draft.targetWeightKg = draft.weightKg;
        next();
      });
    },

    goal() {
      bodyEl.append(h('h1.ob-h', null, t('ob.goalQ')), h('p.ob-p', null, t('ob.goalP')));
      const emoji = { cut: '🔥', recomp: '⚖️', maintain: '🧭', lean_bulk: '🌱', bulk: '🏋️' };
      const grid = h('div.pick-grid');
      for (const k of Object.keys(GOAL_DELTA)) {
        grid.append(h('button.pick', {
          'aria-checked': String(draft.goal === k),
          onclick: () => {
            haptic('select'); draft.goal = k;
            [...grid.children].forEach((c, i) => c.setAttribute('aria-checked', String(Object.keys(GOAL_DELTA)[i] === k)));
          },
        },
          h('div.pick-emoji', null, emoji[k]),
          h('div.grow', h('div.pick-name', null, t(`goal.${k}`)), h('div.pick-desc', null, t(`goal.${k}Desc`))),
          h('div.pick-check', { html: icon('check') })));
      }
      bodyEl.append(grid);

      const tw = h('input.field', { type: 'number', inputmode: 'decimal', step: '0.1', value: String(dispWeight(draft.targetWeightKg || draft.weightKg, 1)) });
      bodyEl.append(h('div', { style: { marginTop: '18px' } },
        h('label.form-lbl', null, `${t('set.target')} (${weightUnit()})`), tw));

      footer(t('c.continue'), () => { draft.targetWeightKg = clamp(inputWeightToKg(tw.value), 25, 400); next(); });
    },

    activity() {
      bodyEl.append(h('h1.ob-h', null, t('ob.activityQ')), h('p.ob-p', null, t('ob.activityP')));
      const emoji = { sedentary: '🪑', light: '🚶', moderate: '🏃', active: '🚴', athlete: '🥇' };
      const keys = Object.keys(ACTIVITY);
      const grid = h('div.pick-grid');
      for (const k of keys) {
        grid.append(h('button.pick', {
          'aria-checked': String(draft.activity === k),
          onclick: () => {
            haptic('select'); draft.activity = k;
            [...grid.children].forEach((c, i) => c.setAttribute('aria-checked', String(keys[i] === k)));
          },
        },
          h('div.pick-emoji', null, emoji[k]),
          h('div.grow', h('div.pick-name', null, t(`act.${k}`)), h('div.pick-desc', null, t(`act.${k}Desc`))),
          h('div.pick-check', { html: icon('check') })));
      }
      bodyEl.append(grid);
      footer(t('c.continue'), next);
    },

    pace() {
      const maintain = draft.goal === 'maintain' || draft.goal === 'recomp';
      if (maintain) { draft.rate = 0; next(); return; }
      bodyEl.append(h('h1.ob-h', null, t('ob.paceQ')), h('p.ob-p', null, t('ob.paceP')));
      const opts = [
        { v: 0.25, k: 'Slow' }, { v: 0.5, k: 'Std' }, { v: 0.75, k: 'Fast' },
      ];
      const grid = h('div.pick-grid');
      for (const o of opts) {
        grid.append(h('button.pick', {
          'aria-checked': String(draft.rate === o.v),
          onclick: () => {
            haptic('select'); draft.rate = o.v;
            [...grid.children].forEach((c, i) => c.setAttribute('aria-checked', String(opts[i].v === o.v)));
            preview.textContent = paceLine();
          },
        },
          h('div.pick-emoji', null, o.k === 'Slow' ? '🐢' : o.k === 'Std' ? '⚡' : '🚀'),
          h('div.grow',
            h('div.pick-name', null, `${t(`ob.pace${o.k}`)} · ${nf(round(dispWeight(o.v, 2), 2))} ${weightUnit()}/${t('c.week').toLowerCase()}`),
            h('div.pick-desc', null, t(`ob.pace${o.k}D`))),
          h('div.pick-check', { html: icon('check') })));
      }
      const paceLine = () => {
        const g = computeGoals({ ...draft });
        return `${t('set.dailyKcal')}: ${nf(dispEnergy(g.kcal))} ${energyUnitLabel()}`;
      };
      const preview = h('p.card-note', { style: { marginTop: '16px', textAlign: 'center' } }, paceLine());
      bodyEl.append(grid, preview);
      footer(t('c.continue'), next);
    },

    plan() {
      const g = computeGoals(draft);
      bodyEl.append(
        h('h1.ob-h', null, t('ob.readyQ')),
        h('p.ob-p', null, t('ob.readyP')),
        h('div.card.glass', { style: { marginBottom: '14px' } },
          h('div.tiles',
            tile(t('macro.kcal'), nf(dispEnergy(g.kcal)), energyUnitLabel(), 'var(--c-kcal)'),
            tile(t('macro.protein'), nf(g.protein), 'g', 'var(--c-protein)'),
            tile(t('macro.carbs'), nf(g.carbs), 'g', 'var(--c-carbs)'),
            tile(t('macro.fat'), nf(g.fat), 'g', 'var(--c-fat)'))),
        h('div.callout', { style: { '--tint': 'var(--mint)' } },
          h('span', { html: icon('bolt') }),
          h('p', null,
            `${t('prog.bmr')} `, h('b', null, nf(dispEnergy(bmr(draft)))),
            ` · ${t('prog.tdee')} `, h('b', null, `${nf(dispEnergy(tdee(draft)))} ${energyUnitLabel()}`))),
        h('div.callout', { style: { marginTop: '10px', '--tint': 'var(--azure)' } },
          h('span', { html: icon('shield') }),
          h('p', null, t('set.privacyDesc'))));

      footer(t('ob.finish'), () => {
        update(s => {
          s.profile = { ...s.profile, ...draft, onboarded: true };
          s.goals = { ...s.goals, auto: true, ...computeGoals(s.profile, s.goals.split) };
          return s;
        });
        applyTheme();
        haptic('success');
        panel.classList.add('anim-fall');
        setTimeout(() => { panel.remove(); onDone?.(); }, 340);
      });
    },
  };

  function tile(label, v, unit, tint) {
    return h('div.tile.glass.glass-thin', { style: { '--tint': tint } },
      h('div.tile-top', h('span', null, label)),
      h('div.tile-val.num', null, v, h('small', null, unit)));
  }

  draw();
}
