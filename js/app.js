/* ═══ Folktracks — bootstrap & router ════════════════════════════════════ */
import { $, h, icon, dayKey, keyToDate, isToday, wait } from './util.js';
import { t, setLang, getLang, dateFull, nf } from './i18n.js';
import { getState, subscribe, update } from './store.js';
import { applyTheme, watchSystemTheme } from './theme.js';
import { primeAudio, haptic } from './haptics.js';
import { initDock, bounce } from './dock.js';
import { pickTip } from './tips.js';
import { toast } from './ui.js';
import { recomputeStreak, syncBadges, checkDailyAwards } from './gamify.js';
import { openAddPanel, suggestMeal } from './views/add.js';
import { openSettings } from './views/settings.js';
import { runOnboarding } from './views/onboarding.js';
import { runTutorial, tutorialDone } from './views/tutorial.js';
import { greetOnEntry, uncekbarStare } from './characters.js';
import * as Today from './views/today.js';
import * as Diary from './views/diary.js';
import * as Progress from './views/progress.js';
import * as Train from './views/train.js';

const VIEWS = {
  today: { mod: Today, title: 'nav.today' },
  diary: { mod: Diary, title: 'nav.diary' },
  progress: { mod: Progress, title: 'nav.progress' },
  train: { mod: Train, title: 'nav.train' },
};
const ORDER = ['today', 'diary', 'progress', 'train'];

/* The splash has to outlast a glance now that it carries a tip; a tap
   anywhere cuts it short for anyone who has already read it. */
const BOOT_MS = 2900;

let current = 'today';
let selectedDay = dayKey();
let dock = null;
let busy = false;
let seenDiary = false;

/* ── Boot ─────────────────────────────────────────────────────────── */
init();

async function init() {
  const s = getState();
  setLang(s.settings.lang === 'auto' ? 'auto' : s.settings.lang);
  applyTheme();
  primeAudio();
  recomputeStreak();
  syncBadges();

  watchSystemTheme(() => { /* CSS handles the repaint; meta already synced */ });

  const app = $('#app');
  const boot = $('#boot');
  app.hidden = false;

  // setLang() ran above, so getLang() inside pickTip() already reflects
  // settings.lang — including 'auto' resolved against navigator.languages.
  const tipEl = $('#bootTip');
  if (tipEl) tipEl.textContent = pickTip();

  dock = initDock($('#dock'), { onSelect: onDockSelect });
  dock.setActive('today');

  $('#gearBtn').addEventListener('click', e => {
    haptic('medium');
    openSettings({ origin: e.currentTarget, onChanged: () => { applyTheme(); refresh(); } });
  });
  $('#streakBtn').addEventListener('click', () => { haptic('light'); go('progress'); });

  await dismissBoot(boot);

  /* Samsulekk greets on every entry. He has to wait for whatever else is
     on screen to get out of the way first: onboarding and the tutorial
     are not awaited, so checking `onboarded` here would read false for
     the whole of a first run and he would never appear at all. */
  const greetLater = () => setTimeout(greetOnEntry, 520);

  if (!s.profile.onboarded) {
    // The tutorial follows setup, not the other way round: gestures mean
    // nothing until there is something on screen to gesture at.
    runOnboarding(() => { refresh(); updateTopbar(); runTutorial(greetLater); });
  } else if (!tutorialDone()) {
    runTutorial(greetLater);
  } else {
    greetLater();
  }

  await mount('today', 'enter-fwd');
  updateTopbar();

  subscribe(() => { updateBadges(); });
  registerServiceWorker();
  scheduleReminders();
  guardMidnight();
  wireGlobalGestures();
}

/** Hold the splash long enough to read the tip, then fade it out.
    Resolves when the fade starts, so the first view mounts underneath it
    exactly as it did before. */
function dismissBoot(boot) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      boot.removeEventListener('pointerdown', finish);
      boot.classList.add('gone');
      setTimeout(() => boot.remove(), 620);
      resolve();
    };
    const timer = setTimeout(finish, BOOT_MS);
    boot.addEventListener('pointerdown', finish);
  });
}

/* ── Routing ──────────────────────────────────────────────────────── */
function onDockSelect(item) {
  if (item.dataset.action === 'add') {
    haptic('medium');
    openAddPanel({ origin: item, meal: suggestMeal(), day: selectedDay, onChanged: refresh });
    return;
  }
  const view = item.dataset.view;
  if (view) go(view);
}

export async function go(view) {
  if (busy || view === current) { if (view === current) scrollTop(); return; }
  haptic('light');
  const dir = ORDER.indexOf(view) > ORDER.indexOf(current) ? 'fwd' : 'back';
  const item = dock.itemFor(view);
  if (item) bounce(item);
  await mount(view, `enter-${dir}`, `leave-${dir}`);
  dock.setActive(view);
  updateTopbar();
}

/** Everything a view is allowed to ask of the shell. */
function makeCtx() {
  return {
    refresh,
    go,
    get day() { return selectedDay; },
    setDay(k) { selectedDay = k; refresh(); updateTopbar(); },
  };
}

async function mount(view, enterCls, leaveCls) {
  busy = true;
  const stage = $('#stage');
  const old = stage.querySelector('.view');
  const node = h('div.view', { class: enterCls, dataset: { view } });

  VIEWS[view].mod.render(node, makeCtx());

  stage.appendChild(node);
  current = view;

  if (old) {
    old.classList.remove('enter-fwd', 'enter-back');
    if (leaveCls) old.classList.add(leaveCls);
    setTimeout(() => old.remove(), 320);
  }
  // Uncekbar keeps an eye on the Diary. Once per session, so he stays a
  // character rather than a notification.
  if (view === 'diary' && !seenDiary) { seenDiary = true; setTimeout(uncekbarStare, 620); }

  await wait(60);
  busy = false;
  return node;
}

/** Re-render the active view in place, keeping the scroll position. */
export function refresh() {
  const stage = $('#stage');
  const old = stage.querySelector('.view');
  const top = old?.scrollTop || 0;
  const node = h('div.view', { dataset: { view: current } });
  VIEWS[current].mod.render(node, makeCtx());
  if (old) old.replaceWith(node); else stage.appendChild(node);
  node.scrollTop = top;
  updateTopbar();
  updateBadges();
}

function scrollTop() {
  const v = $('#stage .view');
  v?.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Chrome ───────────────────────────────────────────────────────── */
function updateTopbar() {
  const s = getState();
  const titleEl = $('#topTitle'), subEl = $('#topSub');
  if (current === 'today') {
    const hour = new Date().getHours();
    const name = s.profile.name ? `, ${s.profile.name.split(' ')[0]}` : '';
    const greet = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙';
    titleEl.textContent = `${t('nav.today')}${name}`;
    subEl.textContent = `${greet}  ${dateFull(new Date())}`;
  } else if (current === 'diary' || current === 'train') {
    titleEl.textContent = t(VIEWS[current].title);
    subEl.textContent = isToday(selectedDay) ? t('c.today') : dateFull(keyToDate(selectedDay));
  } else {
    titleEl.textContent = t(VIEWS[current].title);
    subEl.textContent = t('app.tagline');
  }
  updateBadges();
}

function updateBadges() {
  const s = getState();
  const n = s.game.streak;
  const el = $('#streakNum');
  if (!el) return;
  el.textContent = String(n);
  el.dataset.zero = n > 0 && s.settings.gamification ? '0' : '1';
  $('#streakBtn').style.display = s.settings.gamification ? '' : 'none';
}

/* ── Day rollover ─────────────────────────────────────────────────── */
function guardMidnight() {
  let known = dayKey();
  const check = () => {
    const now = dayKey();
    if (now !== known) {
      known = now;
      if (current === 'today') selectedDay = now;
      recomputeStreak();
      refresh();
    }
  };
  setInterval(check, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    check();
    recomputeStreak();
    checkDailyAwards();
    refresh();
  });
}

/* ── Reminders ────────────────────────────────────────────────────────
   iOS only delivers web push to installed PWAs and needs a push server,
   which Folktracks deliberately does not have. What works everywhere is a
   local notification fired while the app is running, so that is what we
   schedule — honest about its limits, useful in practice. */
function scheduleReminders() {
  const tick = () => {
    const s = getState();
    if (!s.settings.reminders.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (!s.settings.reminders.times.includes(hhmm)) return;
    const fired = sessionStorage.getItem('zenith.notif') || '';
    const stamp = `${dayKey()}-${hhmm}`;
    if (fired === stamp) return;
    sessionStorage.setItem('zenith.notif', stamp);
    const body = t('today.leftToday', { n: '—' });
    try {
      navigator.serviceWorker?.ready
        .then(reg => reg.showNotification('Folktracks', { body: t('set.notifDesc'), icon: './assets/icons/icon-192.png', badge: './assets/icons/icon-192.png', tag: 'folktracks-reminder' }))
        .catch(() => new Notification('Folktracks', { body: t('set.notifDesc') }));
    } catch { /* notifications unavailable */ }
  };
  setInterval(tick, 30_000);
}

/* ── Gestures & platform quirks ───────────────────────────────────── */
function wireGlobalGestures() {
  // Horizontal swipe between tabs, ignored while a sheet or panel is open.
  let x0 = 0, y0 = 0, tracking = false;
  const stage = $('#stage');
  stage.addEventListener('touchstart', e => {
    if ($('#panelRoot').children.length || $('#sheetRoot').children.length) return;
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    const rtl = document.documentElement.dir === 'rtl';
    const step = (rtl ? -1 : 1) * (dx < 0 ? 1 : -1);
    const i = ORDER.indexOf(current) + step;
    if (i >= 0 && i < ORDER.length) go(ORDER[i]);
  }, { passive: true });

  // Kill the double-tap zoom that makes iOS web apps feel non-native.
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  // Rubber-band scroll on the body would reveal Safari's chrome. Once a
  // scroll is already in flight the event is no longer cancelable, and
  // calling preventDefault on it just logs a warning.
  document.body.addEventListener('touchmove', e => {
    if (!e.cancelable) return;
    if (e.target.closest('.view, .panel-body, .sheet-body, .chips, textarea')) return;
    e.preventDefault();
  }, { passive: false });

  addEventListener('online', () => toast(t('c.retry'), { iconName: 'check' }));
  addEventListener('offline', () => toast(t('c.offline'), { kind: 'bad' }));

  // Keyboard shortcuts help enormously while testing in a desktop browser.
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { '1': 'today', '2': 'diary', '3': 'progress', '4': 'train' };
    if (map[e.key]) go(map[e.key]);
    if (e.key === 'a' || e.key === 'n') {
      openAddPanel({ origin: dock.items.find(i => i.dataset.action === 'add'), day: selectedDay, onChanged: refresh });
    }
    if (e.key === ',') openSettings({ origin: $('#gearBtn'), onChanged: refresh });
  });
}

/* ── Service worker ───────────────────────────────────────────────── */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    /* Assets are served stale-while-revalidate, so a launch that picks up
       a new worker is still running the previous build's JS — the update
       only lands on the launch after. On a Home Screen PWA there is no
       reload button to shortcut that, so an update can sit invisible for
       days. When a *new* worker takes over, reload once and be current. */
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;   // not the first install
      reloading = true;
      location.reload();
    });

    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    // Standalone apps are rarely "opened" fresh; ask explicitly.
    reg.update?.().catch(() => {});
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          toast(t('c.new'), { iconName: 'sparkle' });
        }
      });
    });
  } catch (e) {
    console.warn('[folktracks] sw registration failed', e);
  }
}

window.Folktracks = { go, refresh, getState };
