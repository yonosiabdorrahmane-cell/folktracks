/* ═══ Folktracks — progression ════════════════════════════════════════════
   Deliberately quiet: XP accrues from the behaviours that actually drive
   results (logging consistently, hitting protein, training, weighing in),
   never from opening the app. Levels and badges are cosmetic; nothing in
   the app is gated behind them, and the whole layer can be switched off.
   ═══════════════════════════════════════════════════════════════════ */
import { getState, update } from './store.js';
import { dayKey, addDays, clamp, sum } from './util.js';
import { dayTotals, activeGoals } from './nutrition.js';
import { t } from './i18n.js';

export const XP = {
  entry: 5, entryDailyCap: 40,
  onTarget: 40, proteinHit: 25, waterHit: 15,
  workout: 50, weighIn: 10, firstOfDay: 15,
};

/** Cumulative XP required to *reach* a level. */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(140 * Math.pow(level - 1, 1.45));
}
export function levelFromXp(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp && l < 99) l++;
  return l;
}
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, cur, next, into: xp - cur, need: next - cur, pct: clamp((xp - cur) / (next - cur), 0, 1) };
}
export function rankName(level) {
  const i = level >= 40 ? 6 : level >= 25 ? 5 : level >= 15 ? 4 : level >= 8 ? 3 : level >= 4 ? 2 : 1;
  return t(`game.rank${i}`);
}

/* ── Badges ───────────────────────────────────────────────────────── */
export const BADGES = [
  { id: 'first',   emoji: '🌱', tint: '#5ff0c2', test: s => countEntries(s) >= 1 },
  { id: 'week',    emoji: '🔥', tint: '#ffb545', test: s => s.game.best >= 7 },
  { id: 'month',   emoji: '🏔️', tint: '#48c9ff', test: s => s.game.best >= 30 },
  { id: 'protein', emoji: '💪', tint: '#5ff0c2', test: s => proteinHits(s) >= 10 },
  { id: 'hydro',   emoji: '💧', tint: '#48c9ff', test: s => waterHits(s) >= 7 },
  { id: 'lift',    emoji: '🏋️', tint: '#a97bff', test: s => Object.values(s.workouts).filter(w => w.length).length >= 10 },
  { id: 'scan',    emoji: '📷', tint: '#4b8dff', test: s => hasFlag(s, 'scanned') },
  { id: 'chef',    emoji: '👨‍🍳', tint: '#ff7a5c', test: s => s.customFoods.length >= 1 },
  { id: 'precise', emoji: '🎯', tint: '#ff6f9c', test: s => preciseDays(s) >= 5 },
  { id: 'dawn',    emoji: '🌅', tint: '#ffb545', test: s => hasFlag(s, 'earlyBird') },
  { id: 'scale',   emoji: '⚖️', tint: '#a97bff', test: s => Object.values(s.days).filter(d => d.weightKg).length >= 14 },
  { id: 'peak',    emoji: '🏆', tint: '#5ff0c2', test: s => reachedTarget(s) },
];

const countEntries = s => sum(Object.values(s.days), d => d.entries.length);
const hasFlag = (s, f) => (s.game.seen || []).includes(f);

function proteinHits(s) {
  const g = activeGoals();
  return Object.keys(s.days).filter(k => dayTotals(k).protein >= g.protein * 0.95).length;
}
function waterHits(s) {
  return Object.values(s.days).filter(d => d.water >= s.settings.waterGoalMl).length;
}
function preciseDays(s) {
  const g = activeGoals();
  return Object.keys(s.days).filter(k => {
    const kc = dayTotals(k).kcal;
    return kc > 0 && Math.abs(kc - g.kcal) <= 50;
  }).length;
}
function reachedTarget(s) {
  const cur = s.profile.weightKg, tgt = s.profile.targetWeightKg;
  if (!tgt) return false;
  const start = Object.values(s.days).find(d => d.weightKg)?.weightKg ?? cur;
  return start > tgt ? cur <= tgt : cur >= tgt;
}

export function badgeState() {
  const s = getState();
  return BADGES.map(b => ({
    ...b,
    name: t(`badge.${b.id}.n`),
    desc: t(`badge.${b.id}.d`),
    earned: s.game.badges.includes(b.id) || b.test(s),
  }));
}

export function flag(name) {
  update(s => {
    s.game.seen = s.game.seen || [];
    if (!s.game.seen.includes(name)) s.game.seen.push(name);
    return s;
  }, { silent: true });
}

/* ── Awarding ─────────────────────────────────────────────────────── */
/** Returns { xp, levelUp, badges } describing what just happened. */
export function award(kind, { day = dayKey() } = {}) {
  if (!getState().settings.gamification) return { xp: 0, levelUp: null, badges: [] };
  const s = getState();
  let gain = 0;

  if (kind === 'entry') {
    const todayXp = (s.game.dayXp?.[day] || 0);
    gain = todayXp < XP.entryDailyCap ? XP.entry : 0;
    update(st => {
      st.game.dayXp = st.game.dayXp || {};
      st.game.dayXp[day] = (st.game.dayXp[day] || 0) + gain;
      return st;
    }, { silent: true });
  } else if (XP[kind] != null) {
    gain = XP[kind];
  }

  const before = levelFromXp(s.game.xp);
  update(st => { st.game.xp += gain; st.game.level = levelFromXp(st.game.xp); return st; }, { silent: true });
  const after = levelFromXp(getState().game.xp);

  const newBadges = syncBadges();
  return { xp: gain, levelUp: after > before ? after : null, badges: newBadges };
}

/** Persist any badge whose condition is now met; return the newly earned. */
export function syncBadges() {
  const s = getState();
  const fresh = BADGES.filter(b => !s.game.badges.includes(b.id) && b.test(s)).map(b => b.id);
  if (fresh.length) update(st => { st.game.badges.push(...fresh); return st; }, { silent: true });
  return fresh.map(id => {
    const b = BADGES.find(x => x.id === id);
    return { ...b, name: t(`badge.${id}.n`), desc: t(`badge.${id}.d`) };
  });
}

/* ── Streaks ──────────────────────────────────────────────────────── */
/** A day counts toward the streak once anything at all is logged on it. */
export function recomputeStreak() {
  const s = getState();
  const logged = k => (s.days[k]?.entries?.length || 0) > 0 || (s.workouts[k]?.length || 0) > 0;
  const today = dayKey();
  let cursor = logged(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged(cursor) && streak < 3650) { streak++; cursor = addDays(cursor, -1); }

  // Best-ever, scanned across every logged day.
  const keys = new Set([...Object.keys(s.days), ...Object.keys(s.workouts)].filter(logged));
  let best = 0;
  for (const k of keys) {
    if (keys.has(addDays(k, -1))) continue;   // not a run start
    let run = 0, c = k;
    while (keys.has(c)) { run++; c = addDays(c, 1); }
    best = Math.max(best, run);
  }

  update(st => {
    st.game.streak = streak;
    st.game.best = Math.max(best, streak, st.game.best || 0);
    st.game.lastDay = today;
    return st;
  }, { silent: true });
  return streak;
}

/** The last 7 calendar days, oldest first, flagged as logged or not. */
export function streakWindow(days = 7) {
  const s = getState();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(dayKey(), -i);
    out.push({
      key: k,
      hit: (s.days[k]?.entries?.length || 0) > 0 || (s.workouts[k]?.length || 0) > 0,
      today: i === 0,
    });
  }
  return out;
}

/** Awards that should fire once per day when its targets are met. */
export function checkDailyAwards(day = dayKey()) {
  const s = getState();
  if (!s.settings.gamification) return [];
  const g = activeGoals();
  const tot = dayTotals(day);
  const done = s.game.dayAwards?.[day] || [];
  const fired = [];

  const maybe = (id, cond, kind) => {
    if (done.includes(id) || !cond) return;
    award(kind, { day });
    fired.push(id);
  };
  maybe('protein', tot.protein >= g.protein * 0.95, 'proteinHit');
  maybe('target', tot.kcal > 0 && Math.abs(tot.kcal - g.kcal) <= g.kcal * 0.07, 'onTarget');
  maybe('water', (s.days[day]?.water || 0) >= s.settings.waterGoalMl, 'waterHit');

  if (fired.length) {
    update(st => {
      st.game.dayAwards = st.game.dayAwards || {};
      st.game.dayAwards[day] = [...done, ...fired];
      return st;
    }, { silent: true });
  }
  return fired;
}
