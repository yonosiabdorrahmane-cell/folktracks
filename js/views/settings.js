/* ═══ Folktracks — Settings ══════════════════════════════════════════════ */
import { h, icon, round, clamp, isiOS, isStandalone } from '../util.js';
import { t, nf, LANGS, setLang, getLang, getLangMeta } from '../i18n.js';
import {
  getState, update, exportJSON, importJSON, resetAll, clearLogs, deleteCustomFood,
} from '../store.js';
import { applyTheme, setTheme, setMotion, setGlass, effectiveTheme } from '../theme.js';
import { openPanel, openSheet, confirmSheet, toast, setRow, toggle, segmented, promptSheet } from '../ui.js';
import { getKey, setKey, hasKey, getModel, setModel, DEFAULT_MODEL } from '../vision.js';
import { runTutorial } from './tutorial.js';
import { haymakerCard } from '../characters.js';
import { haptic } from '../haptics.js';
import {
  computeGoals, activeGoals, tdee, bmr, dispWeight, weightUnit, inputWeightToKg,
  ACTIVITY, GOAL_DELTA, dispEnergy, energyUnitLabel, targetKcal,
} from '../nutrition.js';
import { openCreateFood } from './add.js';

export const APP_VERSION = '2.5.1';

export function openSettings({ origin, onChanged } = {}) {
  let panel;
  const rerender = () => { panel.body.innerHTML = ''; build(panel.body, panel); };

  panel = openPanel({
    title: t('set.title'),
    origin,
    onClose: onChanged,
    build,
  });

  function build(body) {
    const s = getState();
    const wrap = h('div.stack.stagger', { style: { padding: '4px 16px 30px' } });

    /* ── Profile ─────────────────────────────────────────────────── */
    wrap.append(h('button.card.glass', {
      style: { display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'start' },
      onclick: () => openProfile(rerender),
    },
      h('div.level-badge', { style: { background: 'var(--grad-brand)' } },
        (s.profile.name || t('c.you')).slice(0, 1).toUpperCase()),
      h('div.grow',
        h('div.level-name', null, s.profile.name || t('c.you')),
        h('div.level-sub', null,
          `${t(`goal.${s.profile.goal}`)} · ${nf(dispWeight(s.profile.weightKg, 1))} ${weightUnit()} · ${s.profile.age} ${t('set.age').toLowerCase()}`)),
      h('div.set-chev', { html: icon('chevron') })));

    /* ── Goals ───────────────────────────────────────────────────── */
    const g = activeGoals();
    wrap.append(group(t('set.goals'), [
      setRow({
        icon: 'target', tint: 'var(--mint)', label: t('set.dailyKcal'),
        value: `${nf(dispEnergy(g.kcal))} ${energyUnitLabel()}`, chevron: true,
        onClick: () => openGoals(rerender),
      }),
      setRow({
        icon: 'chart', tint: 'var(--violet)', label: t('set.macroSplit'),
        value: t(`set.split.${s.goals.auto ? s.goals.split : 'custom'}`), chevron: true,
        onClick: () => openGoals(rerender),
      }),
      setRow({
        icon: 'drop', tint: 'var(--c-water)', label: t('set.water'),
        value: `${nf(s.settings.waterGoalMl)} ${t('c.ml')}`, chevron: true,
        onClick: async () => {
          const v = await promptSheet({ title: t('set.water'), label: t('c.ml'), type: 'number', step: '50', value: String(s.settings.waterGoalMl) });
          if (v == null) return;
          update(st => { st.settings.waterGoalMl = clamp(Math.round(Number(v)), 500, 8000); return st; });
          toast(t('c.saved')); rerender();
        },
      }),
      setRow({
        icon: 'copy', tint: 'var(--aqua)', label: t('set.cupSize'),
        value: `${nf(s.settings.waterCupMl)} ${t('c.ml')}`, chevron: true,
        onClick: async () => {
          const v = await promptSheet({ title: t('set.cupSize'), label: t('c.ml'), type: 'number', step: '25', value: String(s.settings.waterCupMl) });
          if (v == null) return;
          update(st => { st.settings.waterCupMl = clamp(Math.round(Number(v)), 50, 1000); return st; });
          toast(t('c.saved')); rerender();
        },
      }),
      setRow({
        icon: 'clock', tint: 'var(--amber)', label: t('set.carryDeficit'), desc: t('set.carryDesc'),
        control: toggle(s.settings.carryDeficit, v => {
          update(st => { st.settings.carryDeficit = v; return st; });
        }),
      }),
    ]));

    /* ── Appearance ──────────────────────────────────────────────── */
    const themeBox = h('div.card.glass', { style: { padding: '16px' } },
      h('div.card-head', h('div.card-title', null, t('set.theme'))),
      themePicker(rerender),
      h('p.card-note', { style: { marginTop: '12px' } }, t('set.themeNote')));

    wrap.append(h('div.section-title', null, t('set.appearance')), themeBox);

    wrap.append(group(null, [
      setRow({
        icon: 'globe', tint: 'var(--azure)', label: t('set.language'),
        value: `${getLangMeta().flag}  ${getLangMeta().native}`, chevron: true,
        onClick: () => openLanguage(rerender),
      }),
      setRow({
        icon: 'scale', tint: 'var(--violet)', label: t('set.units'),
        control: segmented([
          { value: 'metric', label: t('set.metric') },
          { value: 'imperial', label: t('set.imperial') },
        ], s.settings.units, v => {
          update(st => { st.settings.units = v; return st; });
          haptic('select'); setTimeout(rerender, 260);
        }),
      }),
      setRow({
        icon: 'bolt', tint: 'var(--amber)', label: t('set.energyUnit'),
        control: segmented([
          { value: 'kcal', label: 'kcal' },
          { value: 'kJ', label: 'kJ' },
        ], s.settings.energyUnit, v => {
          update(st => { st.settings.energyUnit = v; return st; });
          haptic('select'); setTimeout(rerender, 260);
        }),
      }),
    ]));

    /* ── Feel ────────────────────────────────────────────────────── */
    wrap.append(group(t('set.feel'), [
      setRow({
        icon: 'sparkle', tint: 'var(--mint)', label: t('set.glass'), desc: t('set.glassDesc'),
        control: segmented([
          { value: 'full', label: t('set.glassFull') },
          { value: 'lite', label: t('set.glassLite') },
        ], s.settings.glass, v => { setGlass(v); haptic('select'); }),
      }),
      setRow({
        icon: 'moon', tint: 'var(--violet)', label: t('set.motion'), desc: t('set.motionDesc'),
        control: toggle(s.settings.motion === 'off', v => setMotion(v ? 'off' : 'full')),
      }),
      setRow({
        icon: 'heart', tint: 'var(--rose)', label: t('set.haptics'), desc: t('set.hapticsDesc'),
        control: toggle(s.settings.haptics, v => {
          update(st => { st.settings.haptics = v; return st; });
          if (v) haptic('success');
        }),
      }),
      setRow({
        icon: 'clock', tint: 'var(--aqua)', label: t('set.weekStart'),
        control: segmented([
          { value: 1, label: t('set.monday') },
          { value: 0, label: t('set.sunday') },
        ], s.settings.startOfWeek, v => { update(st => { st.settings.startOfWeek = v; return st; }); haptic('select'); }),
      }),
    ]));

    /* ── Motivation ──────────────────────────────────────────────── */
    wrap.append(group(t('set.game'), [
      setRow({
        icon: 'star', tint: 'var(--amber)', label: t('set.gameToggle'), desc: t('set.gameDesc'),
        control: toggle(s.settings.gamification, v => {
          update(st => { st.settings.gamification = v; return st; });
          haptic('medium'); onChanged?.();
        }),
      }),
      setRow({
        icon: 'bell', tint: 'var(--coral)', label: t('set.notifications'), desc: t('set.notifDesc'),
        control: toggle(s.settings.reminders.enabled, async v => {
          if (v && 'Notification' in window && Notification.permission !== 'granted') {
            const p = await Notification.requestPermission();
            if (p !== 'granted') { toast(t('c.offline'), { kind: 'bad' }); rerender(); return; }
          }
          update(st => { st.settings.reminders.enabled = v; return st; });
          if (v) toast(t('c.saved'));
        }),
      }),
    ]));

    /* ── Data ────────────────────────────────────────────────────── */
    const bytes = new Blob([JSON.stringify(getState())]).size;
    wrap.append(h('div', { style: { marginTop: '18px' } },
      haymakerCard(t('cast.haymaker'))));

    /* ── Meal photo scanning ─────────────────────────────────────
       The key is the user's own and lives only on this device: with no
       backend there is nowhere else to put one that is not readable by
       anyone who opens the page. */
    wrap.append(group(t('set.ai'), [
      setRow({
        icon: 'sparkle', tint: 'var(--violet)', label: t('set.aiKey'),
        desc: t('set.aiKeyDesc'),
        value: hasKey() ? t('set.aiKeySet') : t('set.aiKeyNone'),
        chevron: true,
        onClick: async () => {
          const v = await promptSheet({
            title: t('set.aiKey'), sub: t('set.aiWarn'), label: t('set.aiKey'),
            value: getKey(), placeholder: 'AIza…',
          });
          if (v === null) return;
          setKey(v);
          toast(v.trim() ? t('c.saved') : t('set.aiClear'));
          rerender();
        },
      }),
      setRow({
        icon: 'bolt', tint: 'var(--azure)', label: t('set.aiModel'), value: getModel(), chevron: true,
        onClick: async () => {
          const v = await promptSheet({
            title: t('set.aiModel'), label: t('set.aiModel'),
            value: getModel(), placeholder: DEFAULT_MODEL,
          });
          if (v === null) return;
          setModel(v);
          rerender();
        },
      }),
    ]));

    wrap.append(group(t('set.data'), [
      setRow({
        icon: 'download', tint: 'var(--azure)', label: t('set.export'), desc: t('set.exportDesc'),
        chevron: true, onClick: doExport,
      }),
      setRow({
        icon: 'upload', tint: 'var(--mint)', label: t('set.import'), desc: t('set.importDesc'),
        chevron: true, onClick: doImport,
      }),
      setRow({
        icon: 'sparkle', tint: 'var(--violet)', label: t('add.mine'),
        value: String(s.customFoods.length), chevron: true,
        onClick: () => openMyFoods(rerender),
      }),
      setRow({ icon: 'shield', tint: 'var(--ink-3)', label: t('set.storage'), value: `${(bytes / 1024).toFixed(0)} KB` }),
    ]));

    /* ── About ───────────────────────────────────────────────────── */
    const aboutRows = [
      setRow({
        icon: 'target', tint: 'var(--aqua)', label: t('set.tutorial'), desc: t('set.tutorialDesc'),
        chevron: true, onClick: () => { panel.close(); setTimeout(runTutorial, 300); },
      }),
      setRow({ icon: 'star', tint: 'var(--amber)', label: t('set.version'), value: APP_VERSION }),
      setRow({ icon: 'shield', tint: 'var(--mint)', label: t('set.privacy'), desc: t('set.privacyDesc') }),
    ];
    if (isiOS() && !isStandalone()) {
      aboutRows.unshift(setRow({
        icon: 'download', tint: 'var(--azure)', label: t('set.install'), desc: t('set.installIOS'),
      }));
    }
    wrap.append(group(t('set.about'), aboutRows));

    /* ── Danger ──────────────────────────────────────────────────── */
    wrap.append(group(t('set.danger'), [
      setRow({
        icon: 'trash', tint: 'var(--amber)', label: t('set.clearLogs'), desc: t('set.clearLogsDesc'),
        chevron: true,
        onClick: async () => {
          if (!await confirmSheet({ title: t('set.clearLogs'), message: t('set.confirmClear'), confirmLabel: t('c.delete') })) return;
          clearLogs(); haptic('warn'); toast(t('c.deleted'), { kind: 'bad' }); onChanged?.(); rerender();
        },
      }),
      setRow({
        icon: 'close', tint: 'var(--rose)', label: t('set.deleteAll'), desc: t('set.deleteAllDesc'),
        chevron: true,
        onClick: async () => {
          if (!await confirmSheet({ title: t('set.deleteAll'), message: t('set.confirmDelete'), confirmLabel: t('c.delete') })) return;
          resetAll(); haptic('warn'); location.reload();
        },
      }),
    ]));

    wrap.append(h('p.card-note', { style: { textAlign: 'center', padding: '18px 0 6px' } },
      `Folktracks ${APP_VERSION} · ${t('app.tagline')}`));

    body.append(wrap);
  }
}

/* ── helpers ──────────────────────────────────────────────────────── */
function group(title, rows) {
  const box = h('div.set-group.glass');
  rows.filter(Boolean).forEach(r => box.append(r));
  return title ? h('div', null, h('div.section-title', null, title), box) : box;
}

function themePicker(rerender) {
  const cur = getState().settings.theme;
  const opts = [
    { v: 'system', label: t('set.themeSystem'), top: 'linear-gradient(160deg,#f4f5f9,#e6e9f2)', bot: 'linear-gradient(160deg,#1b1e28,#07080c)' },
    { v: 'light', label: t('set.themeLight'), top: 'linear-gradient(160deg,#f4f5f9,#e6e9f2)', bot: 'linear-gradient(160deg,#f4f5f9,#e6e9f2)' },
    { v: 'dark', label: t('set.themeDark'), top: 'linear-gradient(160deg,#1b1e28,#07080c)', bot: 'linear-gradient(160deg,#1b1e28,#07080c)' },
  ];
  const grid = h('div.theme-picker');
  for (const o of opts) {
    grid.append(h('button.theme-opt', {
      role: 'radio', 'aria-checked': String(cur === o.v),
      onclick: () => {
        haptic('medium'); setTheme(o.v);
        [...grid.children].forEach((c, i) => c.setAttribute('aria-checked', String(opts[i].v === o.v)));
      },
    },
      h('div.theme-swatch',
        h('div.sw-top', { style: { background: o.top } }),
        h('div.sw-bot', { style: { background: o.bot } }),
        h('div.sw-card')),
      h('div.theme-opt-name', null, o.label)));
  }
  return grid;
}

function openLanguage(rerender) {
  openSheet({
    title: t('set.language'),
    build(body, api) {
      const box = h('div.set-group.glass', { style: { marginTop: '4px' } });
      for (const l of LANGS) {
        box.append(h('button.lang-row', {
          'aria-selected': String(getLang() === l.code),
          onclick: () => {
            haptic('medium');
            setLang(l.code);
            update(s => { s.settings.lang = l.code; return s; });
            api.close();
            setTimeout(() => location.reload(), 260);
          },
        },
          h('div.lang-flag', null, l.flag),
          h('div.grow', h('div.lang-name', null, l.native), h('div.lang-native', null, l.name)),
          h('div.lang-check', { html: icon('check') })));
      }
      body.append(box);
    },
  });
}

function openProfile(rerender) {
  const p = { ...getState().profile };
  const f = {
    name: h('input.field', { type: 'text', value: p.name || '', placeholder: t('set.name') }),
    age: h('input.field', { type: 'number', inputmode: 'numeric', value: String(p.age) }),
    height: h('input.field', { type: 'number', inputmode: 'decimal', value: String(getState().settings.units === 'imperial' ? round(p.heightCm / 2.54, 1) : p.heightCm) }),
    weight: h('input.field', { type: 'number', inputmode: 'decimal', step: '0.1', value: String(dispWeight(p.weightKg, 1)) }),
    target: h('input.field', { type: 'number', inputmode: 'decimal', step: '0.1', value: String(dispWeight(p.targetWeightKg, 1)) }),
    bf: h('input.field', { type: 'number', inputmode: 'decimal', step: '0.5', value: p.bodyFatPct ?? '', placeholder: t('c.optional') }),
  };
  let sex = p.sex, activity = p.activity, goal = p.goal;

  openSheet({
    title: t('set.editProfile'),
    build(body) {
      body.append(h('div.form-grid',
        h('div', null, h('label.form-lbl', null, t('set.name')), f.name),
        h('div', null, h('label.form-lbl', null, t('set.sex')),
          segmented([{ value: 'male', label: t('set.male') }, { value: 'female', label: t('set.female') }], sex, v => { sex = v; })),
        h('div.inline-2',
          h('div', null, h('label.form-lbl', null, t('set.age')), f.age),
          h('div', null, h('label.form-lbl', null, `${t('set.height')} (${getState().settings.units === 'imperial' ? 'in' : 'cm'})`), f.height)),
        h('div.inline-2',
          h('div', null, h('label.form-lbl', null, `${t('set.weight')} (${weightUnit()})`), f.weight),
          h('div', null, h('label.form-lbl', null, `${t('set.target')} (${weightUnit()})`), f.target)),
        h('div', null, h('label.form-lbl', null, t('set.bodyFat')), f.bf),
        h('div', null, h('label.form-lbl', null, t('set.activity')),
          h('div.pick-grid', ...Object.keys(ACTIVITY).map(k => pick(k, `act.${k}`, `act.${k}Desc`, activity === k, () => { activity = k; syncPicks('act'); })))),
        h('div', null, h('label.form-lbl', null, t('set.goals')),
          h('div.pick-grid', ...Object.keys(GOAL_DELTA).map(k => pick(k, `goal.${k}`, `goal.${k}Desc`, goal === k, () => { goal = k; syncPicks('goal'); }))))));

      function syncPicks(kind) {
        body.querySelectorAll(`[data-pick^="${kind}:"]`).forEach(el => {
          const key = el.dataset.pick.split(':')[1];
          el.setAttribute('aria-checked', String((kind === 'act' ? activity : goal) === key));
        });
      }
      function pick(key, nameKey, descKey, checked, onClick) {
        return h('button.pick', {
          dataset: { pick: `${nameKey.startsWith('act') ? 'act' : 'goal'}:${key}` },
          'aria-checked': String(checked),
          onclick: () => { haptic('select'); onClick(); },
        },
          h('div.grow', h('div.pick-name', null, t(nameKey)), h('div.pick-desc', null, t(descKey))),
          h('div.pick-check', { html: icon('check') }));
      }
    },
    actions: [{
      label: t('c.save'), kind: 'primary',
      onClick: api => {
        const units = getState().settings.units;
        update(s => {
          s.profile = {
            ...s.profile,
            name: f.name.value.trim(),
            sex, activity, goal,
            age: clamp(Math.round(Number(f.age.value) || 25), 12, 100),
            heightCm: clamp(units === 'imperial' ? Number(f.height.value) * 2.54 : Number(f.height.value), 100, 250),
            weightKg: clamp(inputWeightToKg(f.weight.value), 25, 400),
            targetWeightKg: clamp(inputWeightToKg(f.target.value), 25, 400),
            bodyFatPct: f.bf.value === '' ? null : clamp(Number(f.bf.value), 3, 60),
          };
          return s;
        });
        haptic('success'); toast(t('c.saved')); api.close(); rerender();
      },
    }],
  });
}

function openGoals(rerender) {
  const s = getState();
  let auto = s.goals.auto;
  let split = s.goals.split;
  let rate = s.profile.rate;
  const custom = {
    kcal: h('input.field', { type: 'number', inputmode: 'numeric', value: String(s.goals.kcal) }),
    protein: h('input.field', { type: 'number', inputmode: 'numeric', value: String(s.goals.protein) }),
    carbs: h('input.field', { type: 'number', inputmode: 'numeric', value: String(s.goals.carbs) }),
    fat: h('input.field', { type: 'number', inputmode: 'numeric', value: String(s.goals.fat) }),
  };
  const preview = h('div.tiles');
  const customBox = h('div.form-grid', { style: { marginTop: '14px' } },
    h('div', null, h('label.form-lbl', null, t('set.dailyKcal')), custom.kcal),
    h('div.inline-2',
      h('div', null, h('label.form-lbl', null, `${t('macro.protein')} g`), custom.protein),
      h('div', null, h('label.form-lbl', null, `${t('macro.carbs')} g`), custom.carbs)),
    h('div', null, h('label.form-lbl', null, `${t('macro.fat')} g`), custom.fat));

  function drawPreview() {
    const p = { ...getState().profile, rate };
    const g = auto ? computeGoals(p, split) : {
      kcal: Number(custom.kcal.value) || 0, protein: Number(custom.protein.value) || 0,
      carbs: Number(custom.carbs.value) || 0, fat: Number(custom.fat.value) || 0,
    };
    preview.innerHTML = '';
    preview.append(
      mini(t('macro.kcal'), `${nf(dispEnergy(g.kcal))}`, energyUnitLabel(), 'var(--c-kcal)'),
      mini(t('macro.protein'), nf(g.protein), 'g', 'var(--c-protein)'),
      mini(t('macro.carbs'), nf(g.carbs), 'g', 'var(--c-carbs)'),
      mini(t('macro.fat'), nf(g.fat), 'g', 'var(--c-fat)'));
    customBox.style.display = auto ? 'none' : 'grid';
  }
  function mini(label, v, unit, tint) {
    return h('div.tile.glass.glass-thin', { style: { '--tint': tint } },
      h('div.tile-top', h('span', null, label)),
      h('div.tile-val.num', null, v, h('small', null, unit)));
  }

  openSheet({
    title: t('set.goals'),
    build(body) {
      const rateRow = h('div', null,
        h('label.form-lbl', null, `${t('set.rate')} — ${nf(round(dispWeight(rate, 2), 2))} ${weightUnit()}`),
        segmented([
          { value: 0.25, label: t('ob.paceSlow') },
          { value: 0.5, label: t('ob.paceStd') },
          { value: 0.75, label: t('ob.paceFast') },
        ], rate, v => {
          rate = v;
          rateRow.querySelector('.form-lbl').textContent = `${t('set.rate')} — ${nf(round(dispWeight(rate, 2), 2))} ${weightUnit()}`;
          drawPreview();
        }));

      body.append(
        h('div.set-group.glass', setRow({
          icon: 'sparkle', tint: 'var(--mint)', label: t('set.autoGoals'), desc: t('set.autoGoalsDesc'),
          control: toggle(auto, v => { auto = v; drawPreview(); }),
        })),
        h('div', { style: { marginTop: '14px' } },
          h('label.form-lbl', null, t('set.macroSplit')),
          segmented([
            { value: 'balanced', label: t('set.split.balanced') },
            { value: 'highprotein', label: t('set.split.highprotein') },
            { value: 'lowcarb', label: t('set.split.lowcarb') },
          ], split, v => { split = v; drawPreview(); })),
        h('div', { style: { marginTop: '14px' } }, rateRow),
        h('div', { style: { marginTop: '16px' } }, preview),
        customBox,
        h('div.callout', { style: { marginTop: '14px' } },
          h('span', { html: icon('bolt') }),
          h('p', null, `${t('prog.bmr')} ${nf(dispEnergy(bmr()))} · ${t('prog.tdee')} ${nf(dispEnergy(tdee()))} ${energyUnitLabel()}`)));

      Object.values(custom).forEach(i => i.addEventListener('input', drawPreview));
      drawPreview();
    },
    actions: [{
      label: t('c.save'), kind: 'primary',
      onClick: api => {
        update(s2 => {
          s2.profile.rate = rate;
          s2.goals.auto = auto;
          s2.goals.split = split;
          if (auto) Object.assign(s2.goals, computeGoals({ ...s2.profile, rate }, split));
          else Object.assign(s2.goals, {
            kcal: clamp(Math.round(Number(custom.kcal.value) || 2000), 800, 8000),
            protein: Math.max(0, Math.round(Number(custom.protein.value) || 0)),
            carbs: Math.max(0, Math.round(Number(custom.carbs.value) || 0)),
            fat: Math.max(0, Math.round(Number(custom.fat.value) || 0)),
          });
          return s2;
        });
        haptic('success'); toast(t('c.saved')); api.close(); rerender();
      },
    }],
  });
}

function openMyFoods(rerender) {
  openSheet({
    title: t('add.mine'),
    build(body, api) {
      const list = h('div.result-list');
      const draw = () => {
        list.innerHTML = '';
        const foods = getState().customFoods;
        if (!foods.length) {
          list.append(h('div.empty-state',
            h('div.empty-icon', { html: icon('sparkle') }),
            h('div.empty-text', null, t('add.noResultsHint'))));
        }
        for (const f of foods) {
          list.append(h('div.result',
            h('div.result-badge', null, f.emoji || '⭐'),
            h('button.grow', { style: { textAlign: 'start' }, onclick: () => { api.close(); openCreateFood({ existing: f, onSaved: () => { rerender(); } }); } },
              h('div.food-name', null, f.name),
              h('div.food-meta', h('i', null, `${Math.round(f.per100.kcal)} kcal/100 g`))),
            h('button.meal-add', {
              html: icon('trash'),
              onclick: async () => {
                if (!await confirmSheet({ title: f.name, message: t('c.delete'), confirmLabel: t('c.delete') })) return;
                deleteCustomFood(f.id); haptic('warn'); draw();
              },
            })));
        }
      };
      draw();
      body.append(list);
      body.append(h('button.btn.btn-block.btn-ghost', {
        style: { marginTop: '12px' },
        onclick: () => { api.close(); openCreateFood({ onSaved: rerender }); },
      }, h('span', { html: icon('plus') }), t('add.create')));
    },
  });
}

/* ── Import / export ──────────────────────────────────────────────── */
function doExport() {
  const json = exportJSON();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `folktracks-${stamp}.json`;
  const blob = new Blob([json], { type: 'application/json' });

  // iOS standalone blocks <a download>; the share sheet is the reliable path.
  if (navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/json' })] })) {
    navigator.share({ files: [new File([blob], filename, { type: 'application/json' })], title: 'Folktracks' })
      .catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t('c.saved'));
}

function doImport() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    try {
      importJSON(await file.text());
      applyTheme();
      haptic('success'); toast(t('set.imported'));
      setTimeout(() => location.reload(), 700);
    } catch {
      haptic('warn'); toast(t('set.importFail'), { kind: 'bad' });
    }
  });
  input.click();
}
