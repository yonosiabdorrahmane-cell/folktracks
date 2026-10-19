/* ═══ Folktracks — nutrition & energy maths ═══════════════════════════════
   Mifflin–St Jeor for BMR (the best-validated predictive equation for
   non-athletes), Katch–McArdle when a body-fat % is known, activity
   multipliers for TDEE, then a goal-driven delta. 7700 kcal ≈ 1 kg of
   body mass is the standard planning constant.
   ═══════════════════════════════════════════════════════════════════ */
import { clamp, round, sum, dayKey } from './util.js';
import { getState, getDay } from './store.js';
import { t } from './i18n.js';

export const KCAL_PER_KG = 7700;
export const ATWATER = { protein: 4, carbs: 4, fat: 9, alcohol: 7 };

export const ACTIVITY = {
  sedentary: 1.25, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9,
};

export const GOAL_DELTA = {          // fraction of TDEE
  cut: -0.20, recomp: -0.05, maintain: 0, lean_bulk: 0.08, bulk: 0.15,
};

export const SPLITS = {
  balanced:    { proteinPerKg: 1.9, fatPct: 0.28 },
  highprotein: { proteinPerKg: 2.3, fatPct: 0.25 },
  lowcarb:     { proteinPerKg: 2.1, fatPct: 0.42 },
};

/* ── Unit helpers ─────────────────────────────────────────────────── */
export const kgToLb = kg => kg * 2.2046226;
export const lbToKg = lb => lb / 2.2046226;
export const cmToIn = cm => cm / 2.54;
export const inToCm = i => i * 2.54;
export const mlToFloz = ml => ml / 29.5735;

// Unit labels are localised: an Arabic UI should not read "77.3 kg".
export function weightUnit() { return t(getState().settings.units === 'imperial' ? 'c.lb' : 'c.kg'); }
export function heightUnit() { return getState().settings.units === 'imperial' ? 'in' : t('c.cm'); }
export function dispWeight(kg, d = 1) {
  if (kg == null) return null;
  return round(getState().settings.units === 'imperial' ? kgToLb(kg) : kg, d);
}
export function inputWeightToKg(v) {
  return getState().settings.units === 'imperial' ? lbToKg(Number(v)) : Number(v);
}
export function dispEnergy(kcal) {
  return getState().settings.energyUnit === 'kJ' ? Math.round(kcal * 4.184) : Math.round(kcal);
}
export function energyUnitLabel() {
  return getState().settings.energyUnit === 'kJ' ? 'kJ' : t('c.kcal');
}

/* ── Core equations ───────────────────────────────────────────────── */
export function bmr(profile = getState().profile) {
  const { sex, age, heightCm, weightKg, bodyFatPct } = profile;
  if (bodyFatPct > 0 && bodyFatPct < 60) {
    const lean = weightKg * (1 - bodyFatPct / 100);      // Katch–McArdle
    return 370 + 21.6 * lean;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

export function tdee(profile = getState().profile) {
  return bmr(profile) * (ACTIVITY[profile.activity] ?? 1.55);
}

export function leanMass(profile = getState().profile) {
  if (!(profile.bodyFatPct > 0)) return null;
  return profile.weightKg * (1 - profile.bodyFatPct / 100);
}

export function bmi(profile = getState().profile) {
  const m = profile.heightCm / 100;
  return m > 0 ? profile.weightKg / (m * m) : 0;
}

export function bmiBand(v) {
  if (v < 18.5) return 'under';
  if (v < 25) return 'normal';
  if (v < 30) return 'over';
  return 'high';
}

/** Daily kcal for the chosen goal, floored at a safe minimum. */
export function targetKcal(profile = getState().profile) {
  const t = tdee(profile);
  let kcal;
  if (profile.goal === 'cut' || profile.goal === 'bulk' || profile.goal === 'lean_bulk') {
    // A rate in kg/week converts directly to a daily delta.
    const sign = profile.goal === 'cut' ? -1 : 1;
    const daily = (profile.rate * KCAL_PER_KG) / 7;
    kcal = t + sign * daily;
    // Never let the requested rate drive an extreme deficit.
    const floorFrac = 1 + (profile.goal === 'cut' ? -0.3 : 0.25);
    kcal = profile.goal === 'cut' ? Math.max(kcal, t * floorFrac) : Math.min(kcal, t * floorFrac);
  } else {
    kcal = t * (1 + (GOAL_DELTA[profile.goal] ?? 0));
  }
  const hardFloor = profile.sex === 'female' ? 1200 : 1500;
  return Math.round(clamp(kcal, hardFloor, 6000));
}

/** Protein / fat anchored to body mass; carbs take the remainder. */
export function targetMacros(kcal, profile = getState().profile, split = getState().goals.split) {
  const cfg = SPLITS[split] || SPLITS.balanced;
  const refKg = leanMass(profile) ? leanMass(profile) * 1.15 : profile.weightKg;
  const protein = Math.round(clamp(refKg * cfg.proteinPerKg, 60, 300));
  const fat = Math.round(clamp((kcal * cfg.fatPct) / ATWATER.fat, 30, 200));
  const rest = kcal - protein * ATWATER.protein - fat * ATWATER.fat;
  const carbs = Math.max(20, Math.round(rest / ATWATER.carbs));
  const fiber = Math.round(clamp(kcal / 1000 * 14, 18, 50));
  return { protein, carbs, fat, fiber };
}

/** Recompute goals from the profile when auto mode is on. */
export function computeGoals(profile = getState().profile, split = getState().goals.split) {
  const kcal = targetKcal(profile);
  return { kcal, ...targetMacros(kcal, profile, split) };
}

export function activeGoals() {
  const s = getState();
  if (!s.goals.auto) return s.goals;
  return { ...s.goals, ...computeGoals(s.profile, s.goals.split) };
}

/* ── Entry & day totals ───────────────────────────────────────────── */
/** An entry stores grams (or a serving count) plus a per-100g snapshot,
    so historical rows never change if a food is later edited. */
export function entryTotals(entry) {
  const f = entry.per100 || {};
  const g = entry.grams ?? 0;
  const k = g / 100;
  return {
    kcal: (entry.kcal != null && !entry.per100) ? entry.kcal : (f.kcal || 0) * k,
    protein: (entry.protein != null && !entry.per100) ? entry.protein : (f.protein || 0) * k,
    carbs: (entry.carbs != null && !entry.per100) ? entry.carbs : (f.carbs || 0) * k,
    fat: (entry.fat != null && !entry.per100) ? entry.fat : (f.fat || 0) * k,
    fiber: (f.fiber || 0) * k,
    sugar: (f.sugar || 0) * k,
    satfat: (f.satfat || 0) * k,
    sodium: (f.sodium || 0) * k,
  };
}

export function dayTotals(key = dayKey()) {
  const d = getDay(key);
  const acc = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satfat: 0, sodium: 0 };
  for (const e of d.entries) {
    const t = entryTotals(e);
    for (const k of Object.keys(acc)) acc[k] += t[k] || 0;
  }
  for (const k of Object.keys(acc)) acc[k] = round(acc[k], 1);
  return acc;
}

export function mealTotals(key, meal) {
  const d = getDay(key);
  return d.entries.filter(e => e.meal === meal)
    .reduce((a, e) => { const t = entryTotals(e); a.kcal += t.kcal; a.protein += t.protein; a.carbs += t.carbs; a.fat += t.fat; return a; },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

/** Calories burned by a logged session — MET-based, deliberately modest. */
export function workoutBurn(key = dayKey()) {
  const w = getState().workouts[key] || [];
  if (!w.length) return 0;
  const sets = sum(w, ex => (ex.sets || []).length);
  const minutes = clamp(sets * 3, 0, 150);
  const met = 5.0;                                   // resistance training, vigorous
  const kg = getState().profile.weightKg;
  return Math.round((met * 3.5 * kg / 200) * minutes);
}

/** The day's actual calorie budget, optionally carrying the week's balance. */
export function dayBudget(key = dayKey()) {
  const g = activeGoals();
  let budget = g.kcal;
  const s = getState();
  if (s.settings.carryDeficit) {
    let carried = 0, k = key;
    for (let i = 0; i < 6; i++) {
      k = shiftKey(k, -1);
      const day = s.days[k];
      if (!day || !day.entries.length) break;
      carried += g.kcal - dayTotals(k).kcal;
    }
    budget += clamp(carried * 0.35, -400, 400);
  }
  return Math.round(budget);
}
function shiftKey(k, n) {
  const [y, m, d] = k.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}

/* ── Trend / projection ───────────────────────────────────────────── */
/** Least-squares slope over a weight series, in kg per day. */
export function weightTrend(series) {
  if (series.length < 3) return null;
  const t0 = new Date(series[0].d).getTime();
  const xs = series.map(p => (new Date(p.d).getTime() - t0) / 86400000);
  const ys = series.map(p => p.kg);
  const n = xs.length;
  const mx = sum(xs) / n, my = sum(ys) / n;
  const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (!den) return null;
  const slope = num / den;
  return { perDay: slope, perWeek: slope * 7, intercept: my - slope * mx, t0 };
}

export function projectTargetDate(series, targetKg) {
  const tr = weightTrend(series);
  if (!tr || Math.abs(tr.perWeek) < 0.02) return null;
  const last = series[series.length - 1];
  const days = (targetKg - last.kg) / tr.perDay;
  if (days <= 0 || days > 900) return null;
  const dt = new Date(new Date(last.d).getTime() + days * 86400000);
  return dt;
}

/** Exponentially-weighted moving average — smooths daily water noise. */
export function ewma(series, alpha = 0.25) {
  let acc = null;
  return series.map(p => {
    acc = acc == null ? p.kg : alpha * p.kg + (1 - alpha) * acc;
    return { d: p.d, kg: acc };
  });
}
