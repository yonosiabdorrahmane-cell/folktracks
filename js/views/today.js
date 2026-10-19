/* ═══ Folktracks — Today ═════════════════════════════════════════════════ */
import { h, icon, uid, dayKey, addDays } from '../util.js';
import { t, nf, ltr } from '../i18n.js';
import { getState, getDay, mutateDay } from '../store.js';
import { ringsCard, mealsSection, waterCard, weightCard, sessionCard, insightCard, streakCard, quickActions } from './components.js';
import { workoutBurn, dispEnergy, energyUnitLabel, tdee, activeGoals, dayTotals } from '../nutrition.js';
import { toast } from '../ui.js';
import { haptic } from '../haptics.js';
import { recomputeStreak, checkDailyAwards } from '../gamify.js';
import { openAddPanel } from './add.js';

export function render(root, ctx) {
  const day = dayKey();
  const d = getDay(day);
  const refresh = () => ctx.refresh();

  const wrap = h('div.stack.stagger');

  wrap.append(ringsCard(day));
  wrap.append(quickActions(day, refresh));
  wrap.append(insightCard(day));

  wrap.append(h('div.tiles',
    waterCard(day, refresh),
    weightCard(day, refresh),
    sessionCard(day, () => ctx.go?.('train'))));

  wrap.append(h('div.section-title', null, t('today.meals')));
  wrap.append(mealsSection(day, refresh));

  // Yesterday's meals are the fastest way to fill a repeating day.
  const yesterday = getDay(addDays(day, -1));
  if (!d.entries.length && yesterday.entries.length) {
    wrap.append(h('button.btn.btn-block.btn-ghost', {
      onclick: () => {
        mutateDay(day, cur => {
          cur.entries = yesterday.entries.map(e => ({ ...e, id: uid(), at: Date.now() }));
        });
        recomputeStreak(); checkDailyAwards(day);
        haptic('success'); toast(t('c.saved')); refresh();
      },
    }, h('span', { html: icon('copy') }), t('today.copyYesterday')));
  }

  const sc = streakCard();
  if (sc) wrap.append(sc);

  wrap.append(energyLedger(day));

  root.append(wrap);
}

/** A small, honest ledger: what your body spends vs what you ate. */
function energyLedger(day) {
  const g = activeGoals();
  const tot = dayTotals(day);
  const burn = workoutBurn(day);
  const base = Math.round(tdee());
  const net = Math.round(tot.kcal - base - burn);

  const line = (label, value, tint) => h('div.row-between', { style: { padding: '9px 0' } },
    h('span.card-note', { style: { fontSize: '13px' } }, label),
    h('span.num', { style: { fontWeight: 650, color: tint || 'var(--ink-1)' } }, value));

  return h('div.card.glass',
    h('div.card-head',
      h('div.card-title', null, t('today.net')),
      h('span.card-note', null, `${t('c.goal')} ${nf(dispEnergy(g.kcal))} ${energyUnitLabel()}`)),
    h('div', { style: { display: 'grid' } },
      line(t('prog.tdee'), `${nf(dispEnergy(base))} ${energyUnitLabel()}`),
      burn ? line(t('train.burned'), ltr(`+${nf(dispEnergy(burn))}`), 'var(--coral)') : null,
      line(t('today.eaten'), ltr(`−${nf(dispEnergy(tot.kcal))}`), 'var(--azure)'),
      h('div', { style: { height: '1px', background: 'var(--hairline)', margin: '4px 0' } }),
      line(net < 0 ? t('today.deficit') : t('today.surplus'),
        ltr(`${net < 0 ? '−' : '+'}${nf(dispEnergy(Math.abs(net)))} ${energyUnitLabel()}`),
        net < 0 ? 'var(--mint)' : 'var(--amber)')));
}
