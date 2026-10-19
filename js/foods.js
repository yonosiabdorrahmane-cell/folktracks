/* ═══ Folktracks — food catalogue, search and Open Food Facts bridge ═════ */
import { RAW } from '../data/library.js';
import { norm, round } from './util.js';
import { getLang } from './i18n.js';
import { getState, update } from './store.js';

/* ── Parse the packed library once ────────────────────────────────── */
function parseLibrary(raw) {
  const out = [];
  for (const line of raw.trim().split('\n')) {
    const p = line.split('|');
    if (p.length < 13) continue;
    const [id, name, emoji, cat, kcal, protein, carbs, fat, fiber, sugar, satfat, sodium,
           servings, aliases = '', barcode = '', loc = ''] = p;
    // Localised display names, tilde-separated in fr~es~de~ar order. An
    // empty slot just falls back to the English name.
    const [fr, es, de, ar] = loc.split('~');
    const names = {};
    if (fr) names.fr = fr;
    if (es) names.es = es;
    if (de) names.de = de;
    if (ar) names.ar = ar;
    out.push({
      id: `z:${id}`,
      name, emoji, cat, names,
      barcode: barcode || null,
      verified: true,
      per100: {
        kcal: +kcal, protein: +protein, carbs: +carbs, fat: +fat,
        fiber: +fiber, sugar: +sugar, satfat: +satfat, sodium: +sodium,
      },
      servings: servings.split(';').filter(Boolean).map(s => {
        const [label, g] = s.split('*');
        return { label, g: +g };
      }),
      search: norm(`${name} ${cat} ${aliases} ${loc.split('~').join(' ')} ${barcode}`),
    });
  }
  return out;
}

export const LIBRARY = parseLibrary(RAW);
const BY_ID = new Map(LIBRARY.map(f => [f.id, f]));

/* Barcodes we ship. A scan hits this before the network, so the shelf
   staples resolve instantly and keep working with no connection —
   which is the whole point of a library that lives on the device. */
const BY_BARCODE = new Map();
for (const f of LIBRARY) if (f.barcode) for (const c of f.barcode.split(';')) BY_BARCODE.set(c, f);

/** The food's name in the language the user is actually reading. */
export function foodName(f) {
  if (!f) return '';
  return f.names?.[getLang()] || f.name;
}

/** Teach the app that this barcode is this food. */
export function linkBarcode(code, foodId) {
  update(s => { s.barcodeLinks[code] = foodId; return s; });
}

/** A food for this barcode, or null. Checked before the network.
    Codes the user taught win over the shipped ones: they scanned the
    packet in their own kitchen, we did not. */
export function localBarcode(code) {
  if (!code) return null;
  const linked = getState().barcodeLinks?.[code];
  if (linked) {
    const f = BY_ID.get(linked) || getState().customFoods.find(c => c.id === linked);
    if (f) return f;
  }
  const hit = BY_BARCODE.get(code) ||
    // UPC-A is an EAN-13 with a leading zero; accept either spelling.
    (code.length === 13 && code[0] === '0' ? BY_BARCODE.get(code.slice(1)) : null) ||
    (code.length === 12 ? BY_BARCODE.get(`0${code}`) : null);
  return hit || null;
}

export const CATEGORIES = [
  { key: 'protein', emoji: '🍗' }, { key: 'carb', emoji: '🍚' },
  { key: 'veg', emoji: '🥦' }, { key: 'fruit', emoji: '🍎' },
  { key: 'dairy', emoji: '🥛' }, { key: 'fat', emoji: '🥑' },
  { key: 'nuts', emoji: '🌰' }, { key: 'meal', emoji: '🍽️' },
  { key: 'snack', emoji: '🍫' }, { key: 'drink', emoji: '🥤' },
  { key: 'condiment', emoji: '🥄' }, { key: 'supp', emoji: '💊' },
];

export function getFood(id) {
  if (!id) return null;
  return BY_ID.get(id) || getState().customFoods.find(f => f.id === id) || null;
}

export function allFoods() {
  return [...getState().customFoods, ...LIBRARY];
}

/* ── Local search ─────────────────────────────────────────────────────
   Scoring: exact name > name prefix > word prefix > substring, with a
   nudge for shorter names so "Egg" beats "Egg white" on the query "egg",
   and a lean toward base ingredients over composite dishes so "chicken"
   surfaces chicken breast before chicken curry. If nothing matches
   strictly, a bounded edit-distance pass catches typos.
   ─────────────────────────────────────────────────────────────────── */

// Base ingredients are what people log most; dishes and snacks rank below.
const CAT_WEIGHT = {
  protein: 12, carb: 11, veg: 10, fruit: 10, dairy: 10, fat: 9, nuts: 9,
  mine: 14, drink: 6, meal: 3, snack: 3, condiment: 2, supp: 2, off: 0,
};

/** Levenshtein distance, abandoned as soon as it exceeds `max`. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function fuzzyHit(term, hay) {
  const max = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  if (!max) return false;
  for (const word of hay.split(' ')) {
    if (!word) continue;
    // Compare against a same-length window so long words aren't penalised.
    const probe = word.length > term.length + max ? word.slice(0, term.length + max) : word;
    if (editDistance(term, probe, max) <= max) return true;
  }
  return false;
}

export function searchLocal(query, { limit = 40, category = null } = {}) {
  const q = norm(query);
  const pool = allFoods().filter(f => !category || f.cat === category);
  if (!q) return pool.slice(0, limit).map(f => ({ food: f, score: 0 }));

  const terms = q.split(' ').filter(Boolean);
  const favs = getState().favorites;

  const collect = (fuzzy) => {
    const scored = [];
    for (const f of pool) {
      const hay = f.search || norm(`${f.name} ${f.brand || ''}`);
      // Rank against the name the user is actually reading. Scoring the
      // English name meant "pomme" only ever scraped a substring hit on
      // the alias list, so the ordering ignored the chosen language.
      const nm = norm(foodName(f));
      let score = 0, ok = true;
      for (const term of terms) {
        let s = 0;
        if (nm === term) s = 120;
        else if (nm.startsWith(term)) s = 80;
        else if (new RegExp(`(^| )${term}`).test(hay)) s = 55;
        else if (hay.includes(term)) s = 25;
        else if (fuzzy && fuzzyHit(term, hay)) s = 12;
        else { ok = false; break; }
        score += s;
      }
      if (!ok) continue;
      score -= Math.min(18, nm.length * 0.25);
      score += CAT_WEIGHT[f.cat] ?? 5;
      if (f.custom) score += 20;
      if (favs.includes(f.id)) score += 22;
      scored.push({ food: f, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  };

  let out = collect(false);
  if (out.length < 3) {
    const seen = new Set(out.map(r => r.food.id));
    out = out.concat(collect(true).filter(r => !seen.has(r.food.id)));
  }
  return out.slice(0, limit);
}

/* ── Open Food Facts ──────────────────────────────────────────────────
   Optional, online-only. Folktracks works fully without it; when the device
   has a connection it widens the catalogue to millions of packaged
   products, matched to the user's language where possible.
   ─────────────────────────────────────────────────────────────────── */
const OFF_BASE = 'https://world.openfoodfacts.org';
const offCache = new Map();

function offToFood(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  if (kcal == null) return null;
  const name = (p.product_name || p.generic_name || '').trim();
  if (!name) return null;
  const servingG = Number(p.serving_quantity) || null;
  return {
    id: `off:${p.code}`,
    name,
    brand: (p.brands || '').split(',')[0].trim() || null,
    emoji: '🏷️',
    cat: 'off',
    barcode: p.code,
    image: p.image_front_small_url || null,
    remote: true,
    per100: {
      kcal: round(kcal, 1),
      protein: round(n.proteins_100g || 0, 1),
      carbs: round(n.carbohydrates_100g || 0, 1),
      fat: round(n.fat_100g || 0, 1),
      fiber: round(n.fiber_100g || 0, 1),
      sugar: round(n.sugars_100g || 0, 1),
      satfat: round(n['saturated-fat_100g'] || 0, 1),
      sodium: round((n.sodium_100g || 0) * 1000, 0),
    },
    servings: servingG
      ? [{ label: p.serving_size || 'serving', g: servingG }, { label: '100 g', g: 100 }]
      : [{ label: '100 g', g: 100 }],
  };
}

export async function searchRemote(query, { lang = 'en', signal, limit = 25 } = {}) {
  const key = `q:${lang}:${query}`;
  if (offCache.has(key)) return offCache.get(key);
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}` +
    `&fields=code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url` +
    `&lc=${lang}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`off-${res.status}`);
  const data = await res.json();
  const foods = (data.products || []).map(offToFood).filter(Boolean);
  offCache.set(key, foods);
  return foods;
}

export async function lookupBarcode(code, { signal } = {}) {
  const local = localBarcode(code);
  if (local) return local;
  const key = `b:${code}`;
  if (offCache.has(key)) return offCache.get(key);
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json` +
    `?fields=code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`off-${res.status}`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const f = offToFood(data.product);
  offCache.set(key, f);
  return f;
}

/* ── Portion helpers ──────────────────────────────────────────────── */
export function defaultServing(food) {
  return food.servings?.[0] || { label: '100 g', g: 100 };
}

export function scale(per100, grams) {
  const k = grams / 100;
  const out = {};
  for (const [key, v] of Object.entries(per100)) out[key] = round((v || 0) * k, 1);
  return out;
}

/** Build the entry we persist: a frozen per-100g snapshot, the grams, and
    the serving it came from so the row can still read "2 × fillet" later. */
export function makeEntry(food, grams, meal, serving) {
  const s = typeof serving === 'string' ? { label: serving, g: null } : (serving || {});
  return {
    foodId: food.id,
    // Snapshot the name as the user saw it when they logged it.
    name: foodName(food),
    brand: food.brand || null,
    emoji: food.emoji || '🍽️',
    grams: round(grams, 1),
    serving: s.label || null,
    servingG: s.g || null,
    per100: { ...food.per100 },
    meal,
  };
}
