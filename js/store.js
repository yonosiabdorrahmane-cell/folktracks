/* ═══ Folktracks — state store (localStorage-backed, observable) ══════════ */
import { dayKey, debounce, uid } from './util.js';

const KEY = 'zenith.state.v1';
const SCHEMA = 1;

const defaultState = () => ({
  schema: SCHEMA,
  createdAt: Date.now(),
  profile: {
    name: '', sex: 'male', age: 28, heightCm: 178, weightKg: 78,
    activity: 'moderate',        // sedentary | light | moderate | active | athlete
    goal: 'recomp',              // cut | recomp | maintain | lean_bulk | bulk
    rate: 0.5,                   // kg per week (magnitude)
    targetWeightKg: 74,
    bodyFatPct: null,
    onboarded: false,
  },
  settings: {
    theme: 'system',             // system | light | dark
    lang: 'auto',
    units: 'metric',             // metric | imperial
    energyUnit: 'kcal',          // kcal | kJ
    haptics: true,
    motion: 'full',              // full | off
    glass: 'full',               // full | lite  (blur cost on old devices)
    startOfWeek: 1,              // 0 Sun | 1 Mon
    waterGoalMl: 2500,
    waterCupMl: 250,
    gamification: true,
    reminders: { enabled: false, times: ['09:00', '13:00', '20:00'] },
    weekGoalDays: 6,
    carryDeficit: false,
    tutorialSeen: false,
  },
  goals: { auto: true, split: 'balanced', kcal: 2400, protein: 170, carbs: 250, fat: 75, fiber: 30 },
  days: {},                      // key -> { entries[], water, weightKg, note, steps }
  workouts: {},                  // key -> [ { id, name, muscle, sets:[{reps,kg}] } ]
  customFoods: [],
  favorites: [],                 // food ids
  recents: [],                   // { id, at }
  barcodeLinks: {},              // scanned code -> food id, taught by the user
  game: { xp: 0, level: 1, streak: 0, best: 0, lastDay: null, badges: [], seen: [] },
});

export const emptyDay = () => ({ entries: [], water: 0, weightKg: null, note: '', steps: null });

function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  // Deep-merge known branches so new settings appear for existing users.
  const merged = { ...base, ...raw };
  for (const k of ['profile', 'settings', 'goals', 'game']) merged[k] = { ...base[k], ...(raw[k] || {}) };
  merged.settings.reminders = { ...base.settings.reminders, ...(raw.settings?.reminders || {}) };
  merged.days = raw.days || {};
  merged.workouts = raw.workouts || {};
  merged.customFoods = raw.customFoods || [];
  merged.favorites = raw.favorites || [];
  merged.recents = raw.recents || [];
  merged.barcodeLinks = raw.barcodeLinks || {};
  merged.schema = SCHEMA;
  return merged;
}

let state = migrate(safeParse(localStorage.getItem(KEY)));
const listeners = new Set();

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

const persist = debounce(() => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('[folktracks] persist failed', e); }
}, 180);

export const getState = () => state;

/** Mutate through a recipe fn, then notify. */
export function update(fn, { silent = false } = {}) {
  const r = fn(state);
  if (r && typeof r === 'object') state = r;
  persist();
  if (!silent) listeners.forEach(l => l(state));
  return state;
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { listeners.forEach(l => l(state)); }

/* ── Day accessors ────────────────────────────────────────────────── */
export function getDay(key = dayKey()) { return state.days[key] || emptyDay(); }
export function mutateDay(key, fn) {
  return update(s => {
    s.days[key] = { ...emptyDay(), ...(s.days[key] || {}) };
    fn(s.days[key], s);
    return s;
  });
}

/* ── Entries ──────────────────────────────────────────────────────── */
export function addEntry(key, entry) {
  const e = { id: uid(), at: Date.now(), meal: 'lunch', ...entry };
  mutateDay(key, d => { d.entries.push(e); });
  touchRecent(entry.foodId || entry.ref);
  return e;
}
export function updateEntry(key, id, patch) {
  mutateDay(key, d => {
    const i = d.entries.findIndex(e => e.id === id);
    if (i >= 0) d.entries[i] = { ...d.entries[i], ...patch };
  });
}
export function removeEntry(key, id) {
  mutateDay(key, d => { d.entries = d.entries.filter(e => e.id !== id); });
}

/* ── Recents / favourites ─────────────────────────────────────────── */
export function touchRecent(foodId) {
  if (!foodId) return;
  update(s => {
    s.recents = [{ id: foodId, at: Date.now() }, ...s.recents.filter(r => r.id !== foodId)].slice(0, 60);
    return s;
  }, { silent: true });
}
export function toggleFavorite(foodId) {
  let on = false;
  update(s => {
    on = !s.favorites.includes(foodId);
    s.favorites = on ? [foodId, ...s.favorites] : s.favorites.filter(f => f !== foodId);
    return s;
  });
  return on;
}
export const isFavorite = id => state.favorites.includes(id);

/* ── Custom foods ─────────────────────────────────────────────────── */
export function saveCustomFood(food) {
  const f = { ...food, id: food.id || `c:${uid()}`, custom: true };
  update(s => {
    const i = s.customFoods.findIndex(x => x.id === f.id);
    if (i >= 0) s.customFoods[i] = f; else s.customFoods.unshift(f);
    return s;
  });
  return f;
}
export function deleteCustomFood(id) {
  update(s => { s.customFoods = s.customFoods.filter(f => f.id !== id); return s; });
}

/* ── Weight log ───────────────────────────────────────────────────── */
export function logWeight(key, kg) {
  mutateDay(key, d => { d.weightKg = kg; });
  update(s => { s.profile.weightKg = kg; return s; });
}
export function weightSeries() {
  return Object.entries(state.days)
    .filter(([, d]) => typeof d.weightKg === 'number' && d.weightKg > 0)
    .map(([k, d]) => ({ d: k, kg: d.weightKg }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
}

/* ── Workouts ─────────────────────────────────────────────────────── */
export function getWorkout(key = dayKey()) { return state.workouts[key] || []; }
export function mutateWorkout(key, fn) {
  return update(s => { s.workouts[key] = s.workouts[key] || []; fn(s.workouts[key], s); return s; });
}

/* ── Import / export / reset ──────────────────────────────────────── */
export function exportJSON() {
  return JSON.stringify({ app: 'Folktracks', exportedAt: new Date().toISOString(), state }, null, 2);
}
export function importJSON(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed.state || parsed;
  if (!incoming || typeof incoming !== 'object' || !incoming.profile) throw new Error('bad-file');
  state = migrate(incoming);
  localStorage.setItem(KEY, JSON.stringify(state));
  notify();
  return state;
}
export function resetAll({ keepProfile = false } = {}) {
  const p = keepProfile ? { ...state.profile } : null;
  const s = keepProfile ? { ...state.settings } : null;
  state = defaultState();
  if (p) { state.profile = p; state.settings = s; }
  localStorage.setItem(KEY, JSON.stringify(state));
  notify();
}
export function clearLogs() {
  update(s => { s.days = {}; s.workouts = {}; s.game = defaultState().game; return s; });
}
