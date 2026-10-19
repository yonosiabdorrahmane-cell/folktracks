/* ═══ Folktracks — the cast ═══════════════════════════════════════════
   Small recurring characters that give the app a face. Each one is a
   still image plus a speech bubble, animated on transform and opacity
   only so they never cost a frame.

   Their lines are deliberately left in English in every locale: they are
   catchphrases belonging to a character, the way a name is, not UI copy
   to be translated.
   ═══════════════════════════════════════════════════════════════════ */
import { h } from './util.js';
import { haptic } from './haptics.js';

const CAST = './assets/characters';
const GREET_STORE = 'zenith.greet.n';
const GREETINGS = ['Hey there bro', 'Welcome back gymbro'];

const reduced = () => document.documentElement.dataset.motion === 'off';

function layer() {
  let el = document.getElementById('castRoot');
  if (!el) {
    // h() takes `tag.class.class` — it has no `#id` syntax. Writing
    // 'div#castRoot.cast-root' made the tag name literally "div#castRoot",
    // which Chromium shrugs at (an HTMLUnknownElement that still picks up
    // the class) but WebKit rejects outright: '#' is not a legal XML name
    // character, so createElementNS throws and the whole cast dies on iOS.
    el = h('div.cast-root', { id: 'castRoot', 'aria-live': 'polite' });
    document.body.append(el);
  }
  return el;
}

/**
 * Show a character.
 * `from` picks the entrance: 'right' slides in from the edge while
 * fading up, 'corner' rises from the bottom corner.
 */
export function character({ src, alt = '', text, from = 'right', ms = 3400, tone = '' }) {
  try {
    return show({ src, alt, text, from, ms, tone });
  } catch (e) {
    // Decoration is never worth a broken screen.
    console.warn('[folktracks] cast failed', e);
    return null;
  }
}

function show({ src, alt, text, from, ms, tone }) {
  const root = layer();
  // One at a time — two characters talking over each other reads as a bug.
  [...root.children].forEach(c => dismiss(c, true));

  const card = h(`div.cast.cast-${from}`, { class: tone },
    h('img.cast-face', { src: `${CAST}/${src}`, alt, decoding: 'async' }),
    h('div.cast-bubble', null, text));
  root.append(card);

  requestAnimationFrame(() => card.classList.add('on'));
  const timer = setTimeout(() => dismiss(card), ms);
  card.addEventListener('click', () => { clearTimeout(timer); haptic('light'); dismiss(card); });
  return card;
}

function dismiss(card, instant = false) {
  if (!card || card.dataset.going) return;
  card.dataset.going = '1';
  card.classList.remove('on');
  setTimeout(() => card.remove(), instant || reduced() ? 0 : 320);
}

/** Samsulekk, on the way in. Alternates his two lines every launch. */
export function greetOnEntry() {
  let n = 0;
  try { n = parseInt(localStorage.getItem(GREET_STORE) ?? '0', 10) || 0; } catch { /* private mode */ }
  const text = GREETINGS[n % GREETINGS.length];
  try { localStorage.setItem(GREET_STORE, String((n + 1) % 1000)); } catch { /* private mode */ }
  return character({ src: 'samsulekk.jpg', alt: 'Samsulekk', text, from: 'corner', ms: 5200, tone: 'cast-hype cast-big' });
}

/** Uncekbar has seen your calorie total and has nothing to say about it. */
export function uncekbarStare() {
  return character({ src: 'uncekbar.jpg', alt: 'Uncekbar', text: '...', from: 'right', ms: 3200, tone: 'cast-flat' });
}

/** Haymaker, sitting in Settings looking unimpressed. */
export function haymakerCard(line) {
  return h('div.haymaker',
    h('img.haymaker-face', { src: `${CAST}/haymaker.png`, alt: 'Haymaker', decoding: 'async' }),
    h('div.haymaker-say', null, line));
}
