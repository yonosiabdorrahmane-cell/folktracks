/* ═══ Folktracks — small helpers ══════════════════════════════════════════ */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Tiny hyperscript. h('div.card', {onclick}, child, child)
    The props argument is optional: anything that isn't a plain object
    (a node, a string, an array, null) is taken as the first child, so
    h('div.row', childA, childB) works without a null placeholder. */
export function h(spec, props = null, ...kids) {
  const isProps = props != null && typeof props === 'object' &&
                  !Array.isArray(props) && props.nodeType === undefined;
  if (!isProps) { kids.unshift(props); props = null; }
  const [tagPart, ...classes] = String(spec).split('.');
  const tag = tagPart || 'div';
  const node = document.createElementNS(
    ['svg', 'path', 'circle', 'rect', 'g', 'use', 'line', 'text', 'polyline', 'defs', 'linearGradient', 'stop']
      .includes(tag) ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  if (classes.length) node.setAttribute('class', classes.join(' '));
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.setAttribute('class', [...classes, v].join(' '));
    else if (k === 'style' && typeof v === 'object') setStyle(node, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(4)) {
    if (kid == null || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

/** Custom properties (--x) are invisible to Object.assign on a style
    declaration — they must go through setProperty. */
export function setStyle(node, styles) {
  for (const [k, v] of Object.entries(styles)) {
    if (v == null) continue;
    if (k.startsWith('--')) node.style.setProperty(k, String(v));
    else node.style[k] = v;
  }
}

export const icon = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24"><use href="#i-${name}"/></svg>`;

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };
export const sum = (arr, f = x => x) => arr.reduce((a, b) => a + (f(b) || 0), 0);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const easeOutCubic  = t => 1 - (1 - t) ** 3;
export const easeInOutCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
export const easeInQuad = t => t * t;

/* ── Dates: keys are local-time YYYY-MM-DD ────────────────────────── */
export const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const keyToDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
export const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 86400000);
export const isToday = k => k === dayKey();
export const isFuture = k => keyToDate(k) > keyToDate(dayKey());

export function debounce(fn, ms = 220) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function throttleRaf(fn) {
  let queued = false, lastArgs;
  return (...a) => {
    lastArgs = a;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
  };
}
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
export const wait = ms => new Promise(r => setTimeout(r, ms));

/** Animate a number in a node, counting up. */
export function countTo(node, to, { from = 0, ms = 700, fmt = v => Math.round(v) } = {}) {
  if (document.documentElement.dataset.motion === 'off') { node.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = now => {
    const p = clamp((now - t0) / ms, 0, 1);
    node.textContent = fmt(lerp(from, to, easeOutCubic(p)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── Rolling counters ─────────────────────────────────────────────────
   countTo() eases straight to its target, which reads as "a number
   changed". For the portion editor we want the opposite: the digits
   should visibly *churn* and then lock, so a thumb on the stepper feels
   like it is driving a readout rather than editing a form field.

   The churn is jitter layered on top of the eased value, scaled by how
   far there is left to travel — wide and noisy at the start, nothing at
   all by the end. A floor keeps small deltas from settling silently.
   ─────────────────────────────────────────────────────────────────── */
const rolling = new WeakMap();

export function rollTo(node, to, { from = null, ms = 460, fmt = v => String(Math.round(v)), churn = 0.55 } = {}) {
  const prev = rolling.get(node);
  if (prev) cancelAnimationFrame(prev.raf);
  const start = from ?? prev?.value ?? to;

  if (document.documentElement.dataset.motion === 'off' || start === to) {
    rolling.set(node, { raf: 0, value: to });
    node.textContent = fmt(to);
    node.classList.remove('rolling');
    return;
  }

  // Never churn by less than a readable amount, or a 412 → 415 nudge
  // would ease across three units and look like nothing happened.
  const span = Math.max(Math.abs(to - start), Math.abs(to) * 0.14, 1);
  const t0 = performance.now();
  node.classList.add('rolling');

  const step = now => {
    const p = clamp((now - t0) / ms, 0, 1);
    if (p >= 1) {
      rolling.set(node, { raf: 0, value: to });
      node.textContent = fmt(to);
      node.classList.remove('rolling');
      return;
    }
    const eased = easeOutCubic(p);
    const jitter = (1 - eased) ** 2 * span * churn;
    // Clamp the churn to the direction of travel (with a little overshoot
    // past the target). Free-running jitter dips below the value you
    // started from, which on a "+" tap reads as a glitch, not a readout.
    const lo = Math.min(start, to);
    const hi = Math.max(start, to) + span * 0.08;
    const shown = clamp(lerp(start, to, eased) + (Math.random() * 2 - 1) * jitter, lo, hi);
    node.textContent = fmt(Math.max(0, shown));
    rolling.set(node, { raf: requestAnimationFrame(step), value: to });
  };
  rolling.set(node, { raf: requestAnimationFrame(step), value: to });
}

/** Forget a node's last value so the next rollTo() starts from scratch. */
export const resetRoll = node => rolling.delete(node);

export const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Fold accents so "poulet rôti" matches "roti".
    Ligatures and eszett have to be spelled out before the strip step, or
    "Weißbrot" normalises to "wei brot" and can never be typed; likewise
    Arabic needs its tashkeel removed and its alef and ta-marbuta forms
    unified, since almost nobody types the diacritics. */
const FOLD = [[/ß/g, 'ss'], [/œ/g, 'oe'], [/æ/g, 'ae'], [/ø/g, 'o'], [/ł/g, 'l'], [/đ/g, 'd']];
export const norm = s => {
  let out = String(s).toLowerCase();
  for (const [re, to] of FOLD) out = out.replace(re, to);
  return out
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u0652\u0670]/g, '')      // Arabic tashkeel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')  // آ أ إ ٱ → ا
    .replace(/\u0629/g, '\u0647')                // ة → ه
    .replace(/\u0649/g, '\u064a')                // ى → ي
    .replace(/[^a-z0-9\u0600-\u06ff ]+/g, ' ').replace(/\s+/g, ' ').trim();
};

export const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isiOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
