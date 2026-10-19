/* ═══ Folktracks — first-run tutorial ═════════════════════════════════════
   The gestures this app leans on are invisible: a swipe changes tabs, a
   slide along the dock aims at one, and neither announces itself. Shown
   once after onboarding, and replayable from Settings.

   Each step draws its own gesture rather than describing it, because a
   moving diagram of a thumb on a dock lands faster than a sentence
   about one.
   ═══════════════════════════════════════════════════════════════════ */
import { h } from '../util.js';
import { t } from '../i18n.js';
import { haptic } from '../haptics.js';
import { getState, update } from '../store.js';

const SEEN = 'tutorialSeen';

export const tutorialDone = () => !!getState().settings[SEEN];

/** Show it, then remember that we did. */
export function runTutorial(onDone) {
  const steps = ['swipe', 'dock', 'add', 'privacy'];
  let step = 0;

  const root = document.getElementById('panelRoot');
  const panel = h('div.panel.glass.glass-panel.ob.tut.anim-rise');
  const progress = h('div.ob-progress', ...steps.map(() => h('i')));
  const art = h('div.tut-art');
  const title = h('h1.ob-h');
  const copy = h('p.ob-p');
  const bodyEl = h('div.ob-body', art, title, copy);
  const foot = h('div.ob-foot');

  panel.append(h('div', { style: { height: 'calc(var(--sat) + 18px)' } }), progress, bodyEl, foot);
  root.append(panel);

  function finish() {
    update(s => { s.settings[SEEN] = true; return s; });
    panel.classList.add('gone');
    setTimeout(() => panel.remove(), 320);
    onDone?.();
  }

  function draw() {
    [...progress.children].forEach((el, i) => el.classList.toggle('on', i <= step));
    const key = steps[step];
    art.innerHTML = '';
    art.append(ART[key]());
    art.dataset.step = key;
    title.textContent = t(`tut.${key}.t`);
    copy.textContent = t(`tut.${key}.p`);

    foot.innerHTML = '';
    const last = step === steps.length - 1;
    foot.append(h('button.btn.btn-block.btn-primary', {
      onclick: () => {
        haptic('medium');
        if (last) return finish();
        step++; draw();
      },
    }, last ? t('tut.done') : t('tut.next')));
    if (!last) foot.append(h('button.btn.btn-block.btn-ghost', { onclick: () => { haptic('light'); finish(); } }, t('tut.skip')));
  }

  draw();
}

/* ── The diagrams ───────────────────────────────────────────────────
   Plain elements with CSS animations rather than SVG paths, so they
   inherit the theme and cost nothing to keep in sync with the real UI. */
const ART = {
  swipe: () => h('div.tut-scene',
    h('div.tut-phone',
      h('div.tut-card.a'), h('div.tut-card.b'),
      h('div.tut-hand.swipe')),
    h('div.tut-hint', h('i.tut-arrow.left'), h('i.tut-arrow.right'))),

  dock: () => h('div.tut-scene',
    h('div.tut-phone',
      h('div.tut-dock',
        ...[0, 1, 2, 3, 4].map(i => h('i.tut-dot', { class: i === 2 ? 'big' : '' }))),
      h('div.tut-hand.slide'))),

  add: () => h('div.tut-scene',
    h('div.tut-phone',
      h('div.tut-plus', null, '+'),
      h('div.tut-fan',
        h('span.tut-chip', null, '🔍'),
        h('span.tut-chip', null, '||||'),
        h('span.tut-chip', null, '📷')))),

  privacy: () => h('div.tut-scene',
    h('div.tut-phone.calm',
      h('div.tut-lock', null, '🔒'),
      h('div.tut-nowifi', null, '⌁'))),
};
