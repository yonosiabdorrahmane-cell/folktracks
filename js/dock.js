/* ═══ Folktracks — dock magnification ═════════════════════════════════════

   The macOS dock does two things at once, and only doing both makes it
   feel right:
     1. icons under the cursor scale up on a gaussian falloff, and
     2. their neighbours slide outward so the growth never overlaps.

   The spread is solved by walking outward from the icon nearest the
   pointer: each icon moves by half its own growth plus half its inner
   neighbour's, accumulated. Everything is written to CSS custom
   properties so the compositor does the actual work.
   ═══════════════════════════════════════════════════════════════════ */
import { clamp, throttleRaf } from './util.js';
import { haptic } from './haptics.js';

const AMP_WIDE = 0.62;      // peak scale − 1
const AMP_NARROW = 0.44;
const SIGMA = 64;           // px; how far the bulge reaches
const LIFT = 14;            // px the peak icon rises
const SPREAD = 0.62;        // damping on the neighbour push

export function initDock(dock, { onSelect } = {}) {
  const items = [...dock.querySelectorAll('.dock-item')];
  let metrics = [], settleTimer = null, engaged = false, lastPeak = -1;

  /* The item a release would commit to. The magnification is not just
     decoration any more: whatever is under the finger is *armed*, and
     lifting selects it. */
  let anchorIdx = -1, touchDrag = false, swallowClick = false, dockLeft = 0;

  const amp = () => (innerWidth < 400 ? AMP_NARROW : AMP_WIDE);
  const motionOn = () => document.documentElement.dataset.motion !== 'off';

  /** Index of the icon whose centre is closest to a dock-local x. */
  function nearest(x) {
    let best = Infinity, at = 0;
    metrics.forEach((m, i) => { const d = Math.abs(x - m.cx); if (d < best) { best = d; at = i; } });
    return at;
  }

  function measure() {
    const dr = dock.getBoundingClientRect();
    metrics = items.map(el => {
      const r = el.getBoundingClientRect();
      // Read the *unscaled* box: transforms are live while measuring.
      const w = el.offsetWidth;
      return { el, cx: r.left + r.width / 2 - dr.left, w, dockW: dr.width };
    });
  }

  function relax() {
    dock.classList.add('settling');
    dock.classList.remove('magnifying');
    items.forEach(el => {
      el.style.setProperty('--m', '1');
      el.style.setProperty('--lift', '0px');
      el.style.transform = 'translate3d(0,0,0) scale(1)';
      el.classList.remove('peak', 'armed');
    });
    lastPeak = -1;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => dock.classList.remove('settling'), 560);
  }

  const paint = throttleRaf(x => {
    // throttleRaf defers a frame, so a pointer that left (or a tap that
    // has settled) could otherwise be repainted magnified after relax().
    if (!engaged) return;
    if (!metrics.length) measure();
    const A = amp();

    const scales = metrics.map(m => 1 + A * Math.exp(-((x - m.cx) ** 2) / (2 * SIGMA ** 2)));
    const growth = metrics.map((m, i) => m.w * (scales[i] - 1) * SPREAD);

    // Anchor on the icon closest to the pointer, then push outward.
    const anchor = nearest(x);
    const best = Math.abs(x - metrics[anchor].cx);

    const shift = new Array(metrics.length).fill(0);
    for (let i = anchor + 1; i < metrics.length; i++) shift[i] = shift[i - 1] + (growth[i - 1] + growth[i]) / 2;
    for (let i = anchor - 1; i >= 0; i--) shift[i] = shift[i + 1] - (growth[i + 1] + growth[i]) / 2;

    const dockW = metrics[0].dockW;
    metrics.forEach((m, i) => {
      const s = scales[i];
      const lift = LIFT * ((s - 1) / A);
      // Never let an icon ride out of the dock's own glass.
      const maxOut = dockW / 2;
      const dx = clamp(shift[i], -maxOut, maxOut);
      m.el.style.setProperty('--m', s.toFixed(4));
      m.el.style.setProperty('--lift', `${lift.toFixed(2)}px`);
      m.el.style.transform = `translate3d(${dx.toFixed(2)}px, ${(-lift).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      m.el.classList.toggle('peak', i === anchor && s > 1.18);
    });

    if (anchor !== lastPeak && best < 34) { haptic('select'); lastPeak = anchor; }
  });

  function engage(clientX) {
    if (!engaged) {
      engaged = true;
      measure();
      // The dock cannot move mid-gesture, so read its box once. Reading it
      // per touchmove forced a synchronous layout on every frame, right
      // after the previous frame had written transforms.
      dockLeft = dock.getBoundingClientRect().left;
      dock.classList.remove('settling');
      if (motionOn()) dock.classList.add('magnifying');
    }
    if (!metrics.length) measure();
    const x = clientX - dockLeft;
    anchorIdx = nearest(x);
    // `armed` is set whether or not the bulge is drawn, so the target is
    // still visible to someone running with Reduce Motion on.
    items.forEach((el, i) => el.classList.toggle('armed', touchDrag && i === anchorIdx));
    // With motion off there is no bulge to draw, but the finger still has
    // to be able to pick a tab, so tracking continues regardless.
    if (motionOn()) paint(x);
  }
  function disengage() {
    if (!engaged) return;
    engaged = false;
    anchorIdx = -1;
    relax();
  }

  function select(item) {
    if (!item) return;
    bounce(item);
    onSelect?.(item);
  }

  /** Has the finger wandered far enough off the dock to mean "never mind"? */
  function nearDock(touch) {
    const r = dock.getBoundingClientRect();
    return touch.clientX >= r.left - 28 && touch.clientX <= r.right + 28 &&
           touch.clientY >= r.top - 76 && touch.clientY <= r.bottom + 76;
  }

  /* Pointer (mouse / trackpad) */
  dock.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') engage(e.clientX); });
  // Touch pointers raise pointerleave on lift, which would tear the
  // gesture down — clearing the armed target — before touchend gets to
  // read it. Same guard the pointermove handler above already uses.
  dock.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') disengage(); });
  dock.addEventListener('pointercancel', e => { if (e.pointerType !== 'touch') disengage(); });

  /* Touch: slide along the dock to aim, lift to commit. */
  dock.addEventListener('touchstart', e => {
    touchDrag = true;
    dock.classList.add('aiming');
    engage(e.touches[0].clientX);
  }, { passive: true });

  dock.addEventListener('touchmove', e => { if (touchDrag) engage(e.touches[0].clientX); }, { passive: true });

  dock.addEventListener('touchend', e => {
    dock.classList.remove('aiming');
    if (!touchDrag) return;
    touchDrag = false;

    const item = anchorIdx >= 0 ? items[anchorIdx] : null;
    const commit = !!item && nearDock(e.changedTouches[0]);

    // A tap also produces a click a moment later; a drag usually does not,
    // because WebKit drops the synthetic click once the touch has moved
    // past its slop threshold. That inconsistency is exactly why dragging
    // never selected anything before. Commit here for both, and swallow
    // whatever click may follow.
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 500);

    if (commit) {
      haptic('medium');
      disengage();
      select(item);
    } else {
      setTimeout(disengage, 90);
    }
  }, { passive: true });

  dock.addEventListener('touchcancel', () => {
    dock.classList.remove('aiming');
    touchDrag = false;
    disengage();
  }, { passive: true });

  /* Selection by mouse / trackpad / keyboard, where click is reliable. */
  dock.addEventListener('click', e => {
    if (swallowClick) { swallowClick = false; return; }
    const item = e.target.closest('.dock-item');
    if (!item) return;
    // A pointer that never leaves the dock would otherwise leave the icon
    // stuck at peak size with its label showing.
    disengage();
    select(item);
  });

  addEventListener('resize', () => { metrics = []; relax(); }, { passive: true });
  addEventListener('orientationchange', () => { metrics = []; relax(); });

  return {
    relax, measure,
    setActive(view) {
      items.forEach(el => el.setAttribute('aria-selected', String(el.dataset.view === view)));
    },
    itemFor(view) { return items.find(el => el.dataset.view === view) || null; },
    items,
  };
}

/** The dock bounce that says "this launched". */
export function bounce(item) {
  if (document.documentElement.dataset.motion === 'off') return;
  item.classList.remove('launching');
  void item.offsetWidth;
  item.classList.add('launching');
  setTimeout(() => item.classList.remove('launching'), 660);
}
