/* ═══ Folktracks — add-food flow: search, portion editor, scanner ════════ */
import { h, icon, debounce, round, clamp, norm, rollTo, uid, dayKey as todayKey } from '../util.js';
import { t, nf } from '../i18n.js';
import { getState, addEntry, updateEntry, removeEntry, toggleFavorite, isFavorite, saveCustomFood, getDay } from '../store.js';
import { searchLocal, searchRemote, lookupBarcode, linkBarcode, getFood, makeEntry, defaultServing, scale, foodName, CATEGORIES, LIBRARY } from '../foods.js';
import { openPanel, openSheet, toast, segmented, confirmSheet, dropdown } from '../ui.js';
import { haptic } from '../haptics.js';
import { award, flag, checkDailyAwards, recomputeStreak } from '../gamify.js';
import { dispEnergy, energyUnitLabel } from '../nutrition.js';
import { detectInVideo } from '../barcode.js';
import { analyseMeal, fileToBase64, hasKey } from '../vision.js';
import { uncekbarStare } from '../characters.js';
import { dayTotals, activeGoals } from '../nutrition.js';

export const MEALS = [
  { id: 'breakfast', emoji: '🌅' },
  { id: 'lunch', emoji: '☀️' },
  { id: 'dinner', emoji: '🌙' },
  { id: 'snack', emoji: '🍎' },
];
export const mealLabel = id => t(`meal.${id === 'snack' ? 'snack' : id}`);

/** Which meal a person most likely means, given the clock. */
export function suggestMeal() {
  const hr = new Date().getHours();
  if (hr < 10.5) return 'breakfast';
  if (hr < 15) return 'lunch';
  if (hr < 21) return 'dinner';
  return 'snack';
}

/* ══ Search panel ═══════════════════════════════════════════════════ */
export function openAddPanel({ origin, meal = suggestMeal(), day = todayKey(), onChanged } = {}) {
  let controller = null;
  let currentMeal = meal;
  let filter = 'recents';
  let query = '';

  return openPanel({
    title: t('add.title'),
    origin,
    build(body, api) {
      const search = h('input', {
        type: 'search', placeholder: t('add.searchPh'),
        autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search',
      });
      const bar = h('div.search-bar',
        h('span', { html: icon('search') }),
        search,
        h('button.search-scan', {
          'aria-label': t('add.scan'),
          onclick: () => openScanner({ onFound: f => openPortion({ food: f, meal: currentMeal, day, onDone: done }) }),
          html: icon('scan'),
        }),
        // Barcodes only exist on packaging; this is the way in for
        // everything that came out of a pan.
        h('button.search-scan', {
          'aria-label': t('add.meal'),
          onclick: () => openMealScan({ onFound: f => openPortion({ food: f, meal: currentMeal, day, onDone: done }) }),
          html: icon('camera'),
        }));

      const mealSeg = segmented(MEALS.map(m => ({ value: m.id, label: mealLabel(m.id) })), currentMeal, v => { currentMeal = v; });

      const chipRow = h('div.chips');
      const CHIPS = [
        { id: 'recents', label: t('add.recents') },
        { id: 'favorites', label: t('add.favorites') },
        { id: 'mine', label: t('add.mine') },
        ...CATEGORIES.map(c => ({ id: `cat:${c.key}`, label: `${c.emoji} ${t(`macro.${c.key}`) !== `macro.${c.key}` ? '' : ''}${catLabel(c.key)}` })),
      ];
      CHIPS.forEach(c => chipRow.appendChild(h('button.chip', {
        'aria-pressed': String(filter === c.id),
        onclick: () => { haptic('select'); filter = filter === c.id ? '' : c.id; syncChips(); run(); },
      }, c.label)));
      function syncChips() {
        [...chipRow.children].forEach((el, i) => el.setAttribute('aria-pressed', String(CHIPS[i].id === filter)));
      }

      const quickRow = h('div.row', { style: { gap: '10px', marginTop: '4px' } },
        h('button.btn.btn-sm.btn-ghost.grow', { onclick: () => openQuickAdd({ day, meal: currentMeal, onDone: done }) },
          h('span', { html: icon('bolt') }), t('add.quickKcal')),
        h('button.btn.btn-sm.btn-ghost.grow', { onclick: () => openCreateFood({ onSaved: f => openPortion({ food: f, meal: currentMeal, day, onDone: done }) }) },
          h('span', { html: icon('sparkle') }), t('add.create')));

      const results = h('div.result-list');
      const status = h('div.card-note', { style: { padding: '10px 4px' } });

      body.append(
        h('div', { style: { padding: '4px 16px 12px', display: 'grid', gap: '12px' } },
          bar, mealSeg, chipRow, quickRow,
          h('div', { style: { padding: '0 0 0 0' } }, status, results)));

      /* — result rendering — */
      function done() { onChanged?.(); }

      function renderList(items, { header } = {}) {
        if (header) results.appendChild(h('div.section-title', { style: { padding: '14px 4px 6px' } }, header));
        for (const f of items) results.appendChild(resultRow(f));
      }

      function resultRow(f) {
        const s = defaultServing(f);
        const per = scale(f.per100, s.g);
        return h('button.result', {
          onclick: () => { haptic('light'); openPortion({ food: f, meal: currentMeal, day, onDone: done }); },
        },
          h('div.result-badge', { class: f.remote ? 'brand' : f.custom ? '' : 'verified' }, f.emoji || '🍽️'),
          h('div.grow',
            h('div.food-name.truncate', null, foodName(f)),
            h('div.food-meta',
              f.brand ? h('i', null, f.brand) : null,
              h('i', null, `${s.label} · ${Math.round(s.g)} ${t('c.g')}`),
              h('i', null, `P ${round(per.protein, 1)} · C ${round(per.carbs, 1)} · F ${round(per.fat, 1)}`))),
          h('div.food-kcal', null, nf(dispEnergy(per.kcal)), h('small', null, energyUnitLabel())));
      }

      /* — the search itself — */
      let abort = null;
      const runRemote = debounce(async q => {
        if (!navigator.onLine || q.length < 3) return;
        abort?.abort();
        abort = new AbortController();
        status.textContent = t('add.searching');
        try {
          const remote = await searchRemote(q, { lang: document.documentElement.lang, signal: abort.signal });
          if (norm(search.value) !== norm(q)) return;
          status.textContent = '';
          const seen = new Set([...results.querySelectorAll('.food-name')].map(n => norm(n.textContent)));
          const fresh = remote.filter(f => !seen.has(norm(foodName(f)))).slice(0, 20);
          if (fresh.length) renderList(fresh, { header: t('add.online') });
        } catch (e) {
          if (e.name !== 'AbortError') status.textContent = '';
        }
      }, 480);

      function run() {
        query = search.value.trim();
        results.innerHTML = '';
        status.textContent = '';

        if (!query) {
          const s = getState();
          if (filter === 'recents') {
            const items = s.recents.map(r => getFood(r.id)).filter(Boolean).slice(0, 30);
            if (items.length) renderList(items, { header: t('add.recents') });
            else emptyHint(t('add.recents'));
          } else if (filter === 'favorites') {
            const items = s.favorites.map(getFood).filter(Boolean);
            if (items.length) renderList(items, { header: t('add.favorites') });
            else emptyHint(t('add.favorites'));
          } else if (filter === 'mine') {
            if (s.customFoods.length) renderList(s.customFoods, { header: t('add.mine') });
            else emptyHint(t('add.mine'));
          } else if (filter.startsWith('cat:')) {
            const key = filter.slice(4);
            renderList(LIBRARY.filter(f => f.cat === key).slice(0, 60), { header: catLabel(key) });
          } else {
            renderList(LIBRARY.slice(0, 40), { header: t('add.local') });
          }
          return;
        }

        const cat = filter.startsWith('cat:') ? filter.slice(4) : null;
        const local = searchLocal(query, { limit: 30, category: cat }).map(r => r.food);
        if (local.length) renderList(local, { header: t('add.local') });
        else status.textContent = navigator.onLine ? t('add.searching') : t('add.noResultsHint');
        runRemote(query);
      }

      function emptyHint(label) {
        results.appendChild(h('div.empty-state',
          h('div.empty-icon', { html: icon('search') }),
          h('div.empty-title', null, label),
          h('div.empty-text', null, t('add.noResultsHint'))));
      }

      search.addEventListener('input', run);
      search.addEventListener('search', run);
      run();
      setTimeout(() => { if (!('ontouchstart' in window)) search.focus(); }, 400);
      controller = api;
    },
  });
}

function catLabel(key) {
  const map = {
    protein: { en: 'Protein', fr: 'Protéines', es: 'Proteína', de: 'Protein', ar: 'بروتين' },
    carb: { en: 'Carbs', fr: 'Féculents', es: 'Carbos', de: 'Kohlenhydrate', ar: 'نشويات' },
    veg: { en: 'Veg', fr: 'Légumes', es: 'Verduras', de: 'Gemüse', ar: 'خضار' },
    fruit: { en: 'Fruit', fr: 'Fruits', es: 'Fruta', de: 'Obst', ar: 'فواكه' },
    dairy: { en: 'Dairy', fr: 'Laitiers', es: 'Lácteos', de: 'Milch', ar: 'ألبان' },
    fat: { en: 'Fats', fr: 'Lipides', es: 'Grasas', de: 'Fette', ar: 'دهون' },
    nuts: { en: 'Nuts', fr: 'Noix', es: 'Frutos secos', de: 'Nüsse', ar: 'مكسرات' },
    meal: { en: 'Meals', fr: 'Plats', es: 'Platos', de: 'Gerichte', ar: 'أطباق' },
    snack: { en: 'Snacks', fr: 'Snacks', es: 'Snacks', de: 'Snacks', ar: 'وجبات خفيفة' },
    drink: { en: 'Drinks', fr: 'Boissons', es: 'Bebidas', de: 'Getränke', ar: 'مشروبات' },
    condiment: { en: 'Sauces', fr: 'Sauces', es: 'Salsas', de: 'Saucen', ar: 'صلصات' },
    supp: { en: 'Supplements', fr: 'Compléments', es: 'Suplementos', de: 'Ergänzung', ar: 'مكملات' },
  };
  const lang = document.documentElement.lang || 'en';
  return map[key]?.[lang] || map[key]?.en || key;
}

/* ══ Portion editor ═════════════════════════════════════════════════ */
export function openPortion({ food, meal, day = todayKey(), entry = null, onDone }) {
  const f = food || (entry && {
    id: entry.foodId, name: entry.name, brand: entry.brand, emoji: entry.emoji, per100: entry.per100,
    servings: [{ label: entry.serving || '100 g', g: entry.servingG || entry.grams || 100 }, { label: '100 g', g: 100 }],
  });
  if (!f) return;

  const units = buildUnits(f);
  let unitIdx = 0;
  if (entry?.serving) {
    const i = units.findIndex(u => u.label === entry.serving);
    if (i >= 0) unitIdx = i;
    else unitIdx = units.length - 1;
  }
  let amount = entry ? round(entry.grams / units[unitIdx].g, 2) : 1;
  let chosenMeal = entry?.meal || meal || suggestMeal();

  const grams = () => amount * units[unitIdx].g;

  const kcalNum = h('span.portion-kcal-num', null, '0');
  const kcalEl = h('div.portion-kcal', kcalNum, h('small', null, energyUnitLabel()));
  const pmVals = { protein: h('div.pm-val'), carbs: h('div.pm-val'), fat: h('div.pm-val') };
  const factsBox = h('div.nutri-grid');
  const amountInput = h('input.field', { type: 'number', inputmode: 'decimal', step: '0.1', min: '0', value: String(amount) });

  // The unit list is fixed for a food, so the facts rows are too — only
  // the numbers move. Build them once and keep the value nodes so every
  // change rolls in place instead of the table flashing out and back.
  const updateFacts = buildFacts(factsBox, f);
  // The two controls are independent. Switching the unit used to rewrite
  // the amount so the gram total stayed put, which meant picking "100 g"
  // silently turned 1 into 3.5 — the field you did not touch changed
  // under you. Now each field only ever changes when you change it.
  const unitDd = dropdown(units.map(u => ({ label: u.label })), unitIdx, i => {
    unitIdx = i;
    refresh();
  }, { ariaLabel: t('add.unit') });

  const gramsLabel = () => [f.brand, `${Math.round(grams())} ${t('c.g')}`].filter(Boolean).join(' · ');
  let sheetApi = null;

  const grm = x => `${nf(round(x, 1))} ${t('c.g')}`;

  function refresh() {
    const g = grams();
    const v = scale(f.per100, g);
    rollTo(kcalNum, dispEnergy(v.kcal), { fmt: x => nf(Math.round(x)) });
    rollTo(pmVals.protein, v.protein, { fmt: grm });
    rollTo(pmVals.carbs, v.carbs, { fmt: grm });
    rollTo(pmVals.fat, v.fat, { fmt: grm });
    updateFacts(v, g);
    sheetApi?.setSub(gramsLabel());
  }

  openSheet({
    title: foodName(f),
    sub: gramsLabel(),
    build(body, api) {
      sheetApi = api;
      body.append(
        h('div.portion-hero', kcalEl),
        h('div.portion-macros',
          h('div.pm.glass.glass-thin', { style: { '--tint': 'var(--c-protein)' } }, pmVals.protein, h('div.pm-name', null, t('macro.protein'))),
          h('div.pm.glass.glass-thin', { style: { '--tint': 'var(--c-carbs)' } }, pmVals.carbs, h('div.pm-name', null, t('macro.carbs'))),
          h('div.pm.glass.glass-thin', { style: { '--tint': 'var(--c-fat)' } }, pmVals.fat, h('div.pm-name', null, t('macro.fat')))),

        h('div', { style: { marginTop: '18px' } },
          h('label.form-lbl', null, t('add.portion')),
          h('div.qty-row',
            h('div.stepper',
              h('button', { onclick: () => { amount = Math.max(0.1, round(amount - stepFor(amount), 2)); amountInput.value = String(amount); haptic('light'); refresh(); } }, '−'),
              amountInput,
              h('button', { onclick: () => { amount = round(amount + stepFor(amount), 2); amountInput.value = String(amount); haptic('light'); refresh(); } }, '+')),
            unitDd.el)),

        h('div', { style: { marginTop: '16px' } },
          h('label.form-lbl', null, t('add.addTo')),
          segmented(MEALS.map(m => ({ value: m.id, label: mealLabel(m.id) })), chosenMeal, v => { chosenMeal = v; })),

        h('div', { style: { marginTop: '20px' } },
          h('div.section-title', { style: { padding: '0 0 8px' } }, t('add.facts')),
          factsBox),

        h('div.row', { style: { marginTop: '16px', gap: '10px' } },
          h('button.btn.btn-sm.btn-ghost.grow', {
            'aria-pressed': String(isFavorite(f.id)),
            style: { color: isFavorite(f.id) ? 'var(--amber)' : '' },
            onclick: e => {
              const on = toggleFavorite(f.id);
              haptic('medium');
              toast(on ? t('add.favAdded') : t('add.favRemoved'), { iconName: 'star' });
              const btn = e.currentTarget;
              btn.setAttribute('aria-pressed', String(on));
              btn.style.color = on ? 'var(--amber)' : '';
              btn.querySelector('.ic').setAttribute('fill', on ? 'currentColor' : 'none');
            },
          },
            h('span', { html: icon('star') }),
            h('span.fav-lbl', null, t('add.favorites'))),
          entry ? h('button.btn.btn-sm.btn-ghost', {
            style: { color: 'var(--rose)' },
            onclick: async () => {
              removeEntry(day, entry.id);
              recomputeStreak();
              haptic('warn');
              toast(t('c.deleted'), { kind: 'bad' });
              api.close(); onDone?.();
            },
          }, h('span', { html: icon('trash') })) : null));

      amountInput.addEventListener('input', () => { amount = Math.max(0, Number(amountInput.value) || 0); refresh(); });
      refresh();
    },
    onClose: () => unitDd.close(),
    actions: [{
      label: entry ? t('c.save') : t('c.add'), kind: 'primary',
      onClick: api => {
        const g = grams();
        if (!(g > 0)) return;
        if (entry) {
          updateEntry(day, entry.id, { grams: round(g, 1), serving: units[unitIdx].label, servingG: units[unitIdx].g, meal: chosenMeal });
          toast(t('c.saved'));
        } else {
          addEntry(day, makeEntry(f, g, chosenMeal, units[unitIdx]));
          const res = award('entry', { day });
          if (f.barcode) flag('scanned');
          if (chosenMeal === 'breakfast' && new Date().getHours() < 8) flag('earlyBird');
          recomputeStreak();
          checkDailyAwards(day);
          celebrate(res);
          toast(t('add.added', { meal: mealLabel(chosenMeal) }));
          judgeDay(day);
        }
        haptic('success');
        api.close();
        onDone?.();
      },
    }],
  });
}

/* Uncekbar turns up the moment a day tips over its calorie budget, and
   only once per day — a character who never shuts up stops being funny. */
const judged = new Set();
function judgeDay(day) {
  if (judged.has(day)) return;
  const goal = activeGoals().kcal;
  if (!goal) return;
  if (dayTotals(day).kcal <= goal) return;
  judged.add(day);
  setTimeout(uncekbarStare, 900);
}

function stepFor(a) { return a >= 10 ? 5 : a >= 2 ? 1 : 0.5; }

function buildUnits(f) {
  const list = (f.servings || []).map(s => ({ label: s.label, g: s.g }));
  if (!list.some(u => Math.abs(u.g - 100) < 0.01)) list.push({ label: '100 g', g: 100 });
  list.push({ label: t('c.g'), g: 1 });
  if (getState().settings.units === 'imperial') list.push({ label: 'oz', g: 28.3495 });
  return list;
}

/** Lay the facts table out once for a food and hand back an updater.
    Which rows exist depends on the food, not on the portion, so the rows
    are stable and every refresh only rolls the numbers. */
function buildFacts(box, f) {
  box.innerHTML = '';
  const G = t('c.g');
  const rows = [];
  const line = (key, k, cls, fmt) => {
    const kEl = h('div.k', null, k);
    const vEl = h('div.v', null, '0');
    box.appendChild(h('div.nutri-line', { class: cls }, kEl, vEl));
    rows.push({ key, kEl, vEl, fmt });
  };
  const grm = x => `${nf(round(x, 1))} ${G}`;

  line('kcal', '', 'head', x => `${nf(Math.round(x))} ${energyUnitLabel()}`);
  line('protein', t('macro.protein'), '', grm);
  line('carbs', t('macro.carbs'), '', grm);
  if (f.per100.sugar) line('sugar', t('macro.sugar'), 'sub', grm);
  if (f.per100.fiber) line('fiber', t('macro.fiber'), 'sub', grm);
  line('fat', t('macro.fat'), '', grm);
  if (f.per100.satfat) line('satfat', t('macro.satfat'), 'sub', grm);
  if (f.per100.sodium) line('sodium', t('macro.sodium'), '', x => `${nf(Math.round(x))} mg`);

  const head = rows[0];
  return (v, g) => {
    // The header carries the live gram count, so it is the one label
    // that has to be rewritten rather than rolled.
    head.kEl.textContent = `${t('macro.kcal')} (${Math.round(g)} ${G})`;
    for (const r of rows) {
      const val = r.key === 'kcal' ? dispEnergy(v.kcal) : v[r.key];
      rollTo(r.vEl, val || 0, { fmt: r.fmt });
    }
  };
}

function celebrate(res) {
  if (!res) return;
  if (res.levelUp) {
    import('../ui.js').then(({ burst, toast: tt }) => {
      burst(innerWidth / 2, innerHeight * 0.42);
      tt(t('game.levelUp', { n: res.levelUp }), { iconName: 'sparkle' });
    });
  }
  for (const b of res.badges || []) toast(`${b.emoji}  ${b.name}`, { iconName: 'star', ms: 2600 });
}

/* ══ Quick add ══════════════════════════════════════════════════════ */
export function openQuickAdd({ day = todayKey(), meal = suggestMeal(), onDone } = {}) {
  const f = {
    kcal: h('input.field', { type: 'number', inputmode: 'numeric', placeholder: '0', min: '0' }),
    protein: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', min: '0' }),
    carbs: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', min: '0' }),
    fat: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', min: '0' }),
    name: h('input.field', { type: 'text', placeholder: t('add.quickTitle') }),
  };
  let chosen = meal;
  openSheet({
    title: t('add.quickTitle'), sub: t('add.quickHint'),
    build(body) {
      body.append(
        h('div.form-grid',
          h('div', null, h('label.form-lbl', null, t('add.namePh')), f.name),
          h('div', null, h('label.form-lbl', null, `${t('macro.kcal')} (${energyUnitLabel()})`), f.kcal),
          h('div.inline-2',
            h('div', null, h('label.form-lbl', null, `${t('macro.protein')} (g)`), f.protein),
            h('div', null, h('label.form-lbl', null, `${t('macro.carbs')} (g)`), f.carbs)),
          h('div', null, h('label.form-lbl', null, `${t('macro.fat')} (g)`), f.fat),
          h('div', null, h('label.form-lbl', null, t('add.addTo')),
            segmented(MEALS.map(m => ({ value: m.id, label: mealLabel(m.id) })), chosen, v => { chosen = v; }))));
      setTimeout(() => f.kcal.focus(), 240);
    },
    actions: [{
      label: t('c.add'), kind: 'primary',
      onClick: api => {
        let kcal = Number(f.kcal.value) || 0;
        if (getState().settings.energyUnit === 'kJ') kcal = kcal / 4.184;
        if (kcal <= 0) return;
        const grams = 100;
        addEntry(day, {
          foodId: null, name: f.name.value.trim() || t('add.quickTitle'), emoji: '⚡',
          grams, serving: null, servingG: null, quick: true, meal: chosen,
          per100: {
            kcal, protein: Number(f.protein.value) || 0, carbs: Number(f.carbs.value) || 0,
            fat: Number(f.fat.value) || 0, fiber: 0, sugar: 0, satfat: 0, sodium: 0,
          },
        });
        award('entry', { day }); recomputeStreak(); checkDailyAwards(day);
        haptic('success'); toast(t('add.added', { meal: mealLabel(chosen) }));
        api.close(); onDone?.();
      },
    }],
  });
}

/* ══ Create a custom food ═══════════════════════════════════════════ */
export function openCreateFood({ onSaved, existing = null } = {}) {
  const v = existing || {};
  const fields = {
    name: h('input.field', { type: 'text', placeholder: t('add.namePh'), value: v.name || '' }),
    brand: h('input.field', { type: 'text', placeholder: t('add.brandPh', { o: t('c.optional') }), value: v.brand || '' }),
    kcal: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', value: v.per100?.kcal ?? '' }),
    protein: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', value: v.per100?.protein ?? '' }),
    carbs: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', value: v.per100?.carbs ?? '' }),
    fat: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', value: v.per100?.fat ?? '' }),
    fiber: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '0', value: v.per100?.fiber ?? '' }),
    serving: h('input.field', { type: 'number', inputmode: 'decimal', placeholder: '100', value: v.servings?.[0]?.g ?? '' }),
    servingName: h('input.field', { type: 'text', placeholder: t('c.serving'), value: v.servings?.[0]?.label ?? '' }),
  };
  openSheet({
    title: existing ? t('c.edit') : t('add.createTitle'), sub: t('add.per') + ' 100 g',
    build(body) {
      body.append(h('div.form-grid',
        h('div', null, h('label.form-lbl', null, t('add.namePh')), fields.name),
        h('div', null, h('label.form-lbl', null, t('add.brandPh', { o: t('c.optional') })), fields.brand),
        h('div', null, h('label.form-lbl', null, `${t('macro.kcal')} / 100 g`), fields.kcal),
        h('div.inline-2',
          h('div', null, h('label.form-lbl', null, `${t('macro.protein')} g`), fields.protein),
          h('div', null, h('label.form-lbl', null, `${t('macro.carbs')} g`), fields.carbs)),
        h('div.inline-2',
          h('div', null, h('label.form-lbl', null, `${t('macro.fat')} g`), fields.fat),
          h('div', null, h('label.form-lbl', null, `${t('macro.fiber')} g`), fields.fiber)),
        h('div.inline-2',
          h('div', null, h('label.form-lbl', null, `${t('c.serving')} (g)`), fields.serving),
          h('div', null, h('label.form-lbl', null, t('add.namePh')), fields.servingName))));
      setTimeout(() => fields.name.focus(), 240);
    },
    actions: [{
      label: t('c.save'), kind: 'primary',
      onClick: api => {
        const name = fields.name.value.trim();
        const kcal = Number(fields.kcal.value);
        if (!name || !(kcal >= 0)) { haptic('warn'); return; }
        const sg = Number(fields.serving.value) || 100;
        const food = saveCustomFood({
          id: existing?.id, name, brand: fields.brand.value.trim() || null, emoji: '⭐', cat: 'mine',
          per100: {
            kcal, protein: Number(fields.protein.value) || 0, carbs: Number(fields.carbs.value) || 0,
            fat: Number(fields.fat.value) || 0, fiber: Number(fields.fiber.value) || 0,
            sugar: 0, satfat: 0, sodium: 0,
          },
          servings: [{ label: fields.servingName.value.trim() || t('c.serving'), g: sg }, { label: '100 g', g: 100 }],
          search: norm(`${name} ${fields.brand.value}`),
        });
        haptic('success'); toast(t('c.saved'));
        api.close(); onSaved?.(food);
      },
    }],
  });
}

/* ══ Food picker ════════════════════════════════════════════════════
   A stripped-down search used when the caller needs a food chosen rather
   than logged — currently only barcode linking. */
export function pickFood(onPick) {
  const input = h('input.field', { type: 'search', placeholder: t('add.searchPh'), autocomplete: 'off' });
  const list = h('div.result-list');

  const run = () => {
    list.innerHTML = '';
    for (const { food } of searchLocal(input.value, { limit: 24 })) {
      list.appendChild(h('button.result', {
        onclick: () => { haptic('light'); api.close(); onPick(food); },
      },
        h('div.result-badge', { class: food.custom ? '' : 'verified' }, food.emoji || '🍽️'),
        h('div.grow', h('div.food-name.truncate', null, foodName(food)))));
    }
  };
  const api = openSheet({
    title: t('add.linkPick'),
    build(body) {
      body.append(input, h('div', { style: { marginTop: '10px' } }, list));
      input.addEventListener('input', debounce(run, 140));
      run();
      setTimeout(() => input.focus(), 220);
    },
  });
}

/* ══ Meal photo ═════════════════════════════════════════════════════
   Photograph a plate, get an estimate. Two file inputs rather than a
   live camera feed: `capture` opens the camera straight away on a phone,
   the plain one reaches the library, and both hand back a real image
   without us having to manage a MediaStream for a single still. */
export function openMealScan({ onFound }) {
  let shot = null, busy = false, controller = null;

  const preview = h('img.meal-shot', { alt: '' });
  const previewWrap = h('div.meal-shot-wrap', { hidden: true }, preview);
  const status = h('div.card-note', { style: { textAlign: 'center', marginTop: '12px' } },
    hasKey() ? t('add.mealHint') : t('add.mealNoKey'));
  const result = h('div', { hidden: true });

  const camIn = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
  const libIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });

  const analyseBtn = h('button.btn.btn-block.btn-primary', { hidden: true, onclick: () => run() }, t('add.mealAnalyse'));

  async function loadFile(file) {
    if (!file) return;
    try {
      shot = await fileToBase64(file);
      preview.src = shot.preview;
      previewWrap.hidden = false;
      result.hidden = true; result.innerHTML = '';
      analyseBtn.hidden = !hasKey();
      status.textContent = hasKey() ? t('add.mealHint') : t('add.mealNoKey');
    } catch {
      status.textContent = t('add.mealFail');
    }
  }
  camIn.addEventListener('change', () => loadFile(camIn.files?.[0]));
  libIn.addEventListener('change', () => loadFile(libIn.files?.[0]));

  async function run() {
    if (!shot || busy) return;
    busy = true;
    analyseBtn.disabled = true;
    status.textContent = t('add.mealWorking');
    controller = new AbortController();
    try {
      const r = await analyseMeal(shot, { signal: controller.signal });
      status.textContent = '';
      showResult(r);
    } catch (e) {
      status.textContent = e?.message === 'no-key' || e?.message === 'bad-key'
        ? t('add.mealNoKey')
        : (navigator.onLine ? t('add.mealFail') : t('c.offline'));
      haptic('warn');
    } finally {
      busy = false;
      analyseBtn.disabled = false;
    }
  }

  function showResult(r) {
    const food = {
      id: `ai:${uid()}`,
      name: r.dish,
      emoji: '🍽️',
      cat: 'meal',
      per100: r.per100,
      servings: [{ label: t('add.mealEstimate'), g: r.grams }, { label: '100 g', g: 100 }],
    };
    result.hidden = false;
    result.innerHTML = '';
    result.append(
      h('div.meal-head',
        h('div.meal-name', null, r.dish),
        h('span.pill-tag', { style: { '--tint': r.confidence === 'high' ? 'var(--mint)' : r.confidence === 'medium' ? 'var(--amber)' : 'var(--rose)' } },
          `${t('add.mealConf')}: ${t(`conf.${r.confidence}`)}`)),
      h('div.meal-macros',
        h('div.mm', h('b', null, `${nf(dispEnergy(r.whole.kcal))}`), h('i', null, energyUnitLabel())),
        h('div.mm', h('b', null, `${nf(round(r.whole.protein, 1))}`), h('i', null, t('macro.protein'))),
        h('div.mm', h('b', null, `${nf(round(r.whole.carbs, 1))}`), h('i', null, t('macro.carbs'))),
        h('div.mm', h('b', null, `${nf(round(r.whole.fat, 1))}`), h('i', null, t('macro.fat')))),
      h('div.card-note', { style: { marginTop: '8px' } }, `${r.grams} ${t('c.g')} · ${t('add.mealItems')}: ${r.items.join(', ') || '—'}`),
      h('div.card-note', { style: { marginTop: '10px', opacity: '.85' } }, t('add.mealNote')),
      h('button.btn.btn-block.btn-primary', {
        style: { marginTop: '14px' },
        onclick: () => { haptic('medium'); api.close(); onFound?.(food); },
      }, t('c.continue')));
    analyseBtn.hidden = true;
  }

  const api = openSheet({
    title: t('add.meal'),
    build(body) {
      body.append(
        camIn, libIn,
        previewWrap,
        h('div.row', { style: { gap: '10px', marginTop: '4px' } },
          h('button.btn.btn-sm.btn-ghost.grow', { onclick: () => camIn.click() },
            h('span', { html: icon('camera') }), t('add.mealShoot')),
          h('button.btn.btn-sm.btn-ghost.grow', { onclick: () => libIn.click() },
            h('span', { html: icon('upload') }), t('add.mealPick'))),
        status, result,
        h('div', { style: { marginTop: '12px' } }, analyseBtn));
    },
    onClose: () => controller?.abort(),
  });
}

/* ══ Barcode scanner ════════════════════════════════════════════════ */
export function openScanner({ onFound }) {
  let stream = null, raf = 0, timer = 0, detector = null, stopped = false, resolving = false;
  // Two agreeing frames before we act. The decoder rejects noise on its
  // own, but a barcode read is about to become a network lookup and a
  // logged meal, so the second frame is cheap insurance.
  let lastSeen = null, agree = 0;
  // Codes we already asked Open Food Facts about and it did not know.
  // Without this the camera re-reads the same packet several times a
  // second and hammers the API with an identical miss.
  const missed = new Set();

  const video = h('video', { playsinline: '', autoplay: '' });
  const canvas = h('canvas');   // offscreen scratch for the fallback decoder
  let track = null;
  const torchBtn = h('button.btn.btn-sm.btn-ghost', {
    type: 'button', hidden: true, 'aria-pressed': 'false',
    onclick: async e => {
      const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      try {
        await track?.applyConstraints({ advanced: [{ torch: on }] });
        e.currentTarget.setAttribute('aria-pressed', String(on));
        haptic('light');
      } catch { /* the lamp is not always ours to drive */ }
    },
  }, h('span', { html: icon('flame') }), h('span', null, t('add.torch')));
  const manual = h('input.field', { type: 'tel', inputmode: 'numeric', placeholder: t('add.barcode') });
  const status = h('div.card-note', { style: { textAlign: 'center', marginTop: '10px' } }, t('add.scanHint'));
  const linkRow = h('div.row', { hidden: true, style: { marginTop: '10px' } });

  const api = openSheet({
    title: t('add.scan'),
    build(body) {
      body.append(
        h('div.scanner-view', video, h('div.scanner-frame'), h('div.scanner-laser')),
        status,
        h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, torchBtn),
        linkRow,
        h('div', { style: { marginTop: '14px' } },
          h('label.form-lbl', null, t('add.barcode')), manual));
      start();
    },
    actions: [{
      label: t('c.search'), kind: 'primary',
      onClick: () => { if (manual.value.trim()) resolveCode(manual.value.trim()); },
    }],
    onClose: stop,
  });

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = t('add.scanNoCam'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // `ideal` rather than a bare string: an exact constraint throws
        // OverconstrainedError on devices with only a front camera.
        // Ask high: a barcode across a third of the frame is ~3 px per
        // module at 1080p and barely 1 px at 480p, and 1 px per module is
        // where blur starts winning.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 }, height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }],
        },
      });
    } catch {
      status.textContent = t('add.scanNoCam');
      return;
    }
    video.srcObject = stream;
    track = stream.getVideoTracks()[0] || null;
    // Keep the lens hunting; a fixed-focus frame at 10 cm is a blur.
    try { await track?.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch { /* not offered */ }
    // Only show the lamp if this device actually exposes one.
    try { if (track?.getCapabilities?.().torch) torchBtn.hidden = false; } catch { /* older WebKit */ }
    // The attribute alone sets defaultMuted; iOS wants the property set
    // before it will play a stream inline without a user gesture.
    video.muted = true;
    video.setAttribute('muted', '');
    try { await video.play(); } catch { /* autoplay nudged; the stream is live either way */ }

    /* Prefer the platform decoder where there is one — it is faster and
       hardware-backed. There is none in WebKit, so on iOS (and on Linux
       Chromium) we fall through to our own reader rather than sitting
       there with a live preview that decodes nothing. */
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats?.() ?? [];
        const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => !formats.length || formats.includes(f));
        if (want.length) detector = new window.BarcodeDetector({ formats: want });
      } catch { detector = null; }
    }
    status.textContent = t('add.scanHint');
    loop();
  }

  async function loop() {
    if (stopped) return;
    let code = null;
    try {
      if (detector) {
        const codes = await detector.detect(video);
        if (codes.length) code = codes[0].rawValue;
      } else {
        code = detectInVideo(video, canvas)?.rawValue ?? null;
      }
    } catch { /* frame not ready yet, or the tab lost the camera */ }

    if (code && !missed.has(code)) {
      if (code === lastSeen) agree++; else { lastSeen = code; agree = 1; }
      if (agree >= 2) { haptic('success'); resolveCode(code); return; }
    }
    timer = setTimeout(() => { raf = requestAnimationFrame(loop); }, 110);
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    // Leave the lamp off behind us, then release the camera.
    try { track?.applyConstraints({ advanced: [{ torch: false }] }); } catch { /* already gone */ }
    stream?.getTracks().forEach(tr => tr.stop());
    stream = null; track = null;
    video.srcObject = null;
  }
  /** "This is that" — attach an unknown code to a food, once. */
  function offerLink(code) {
    if (linkRow.dataset.code === code) return;
    linkRow.dataset.code = code;
    linkRow.innerHTML = '';
    linkRow.hidden = false;
    linkRow.append(h('button.btn.btn-sm.btn-ghost.grow', {
      onclick: () => {
        stop();
        api.close();
        pickFood(food => {
          linkBarcode(code, food.id);
          toast(t('add.linked', { name: foodName(food) }), { iconName: 'check' });
          onFound?.(food);
        });
      },
    }, h('span', { html: icon('scan') }), t('add.linkCode', { code })));
  }

  async function resolveCode(code) {
    if (resolving) return;
    resolving = true;
    status.textContent = t('c.loading');
    try {
      const food = await lookupBarcode(code);
      if (!food) {
        // A good read of a product nothing has heard of — very common for
        // local brands. Offer to remember it rather than just failing.
        missed.add(code);
        status.textContent = t('add.scanFail');
        haptic('warn');
        offerLink(code);
        resolving = false; lastSeen = null; agree = 0;
        if (!stopped) loop();
        return;
      }
      flag('scanned');
      stop(); api.close();
      onFound?.(food);
    } catch (e) {
      // A 404 from OFF means "unknown product" just as much as a null
      // does; anything else (offline, rate limit) is worth retrying.
      if (/-404$/.test(e?.message || '')) missed.add(code);
      status.textContent = navigator.onLine ? t('add.scanFail') : t('c.offline');
      resolving = false; lastSeen = null; agree = 0;
      if (!stopped) loop();
    }
  }
}
