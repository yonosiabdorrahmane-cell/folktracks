/* ═══ Folktracks — panel transitions ══════════════════════════════════
   This used to be a genie warp: the panel was cloned into ~18 horizontal
   slices, each given its own position and width every frame so the
   bottom edge reached the dock before the top did. It looked like macOS
   and it cost like macOS — eighteen composited layers being re-laid-out
   sixty times a second, on a phone, behind a backdrop-filter. On real
   hardware it dropped frames every time a panel opened.

   This replaces it with the cheap version of the same idea: the panel
   scales up out of whatever you touched and fades in, as one layer, on
   transform and opacity only. Those two properties are the ones the
   compositor can animate without ever asking the main thread, so it
   holds 60fps regardless of how much is inside the panel.
   ═══════════════════════════════════════════════════════════════════ */
import { getState } from './store.js';

const DURATION = { open: 380, close: 260 };
const EASE_IN = 'cubic-bezier(.16,.84,.32,1)';   // settles, slight overshoot
const EASE_OUT = 'cubic-bezier(.4,0,.7,.2)';

const reduced = () => document.documentElement.dataset.motion === 'off' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where the panel should grow from, as a transform-origin on the panel. */
function originOn(node, origin) {
  if (!origin) return '50% 100%';
  const r = origin.getBoundingClientRect?.();
  if (!r || !r.width) return '50% 100%';
  const n = node.getBoundingClientRect();
  if (!n.width || !n.height) return '50% 100%';
  const x = ((r.left + r.width / 2) - n.left) / n.width * 100;
  const y = ((r.top + r.height / 2) - n.top) / n.height * 100;
  // Clamp so a control off the edge of the panel does not fling the
  // origin somewhere that reads as a slide rather than a growth.
  const c = v => Math.max(-15, Math.min(115, v));
  return `${c(x).toFixed(1)}% ${c(y).toFixed(1)}%`;
}

function run(node, origin, dir) {
  return new Promise(resolve => {
    // openPanel hides the panel so it can be laid out at full size before
    // the entrance runs. Whatever plays that entrance owns un-hiding it —
    // the old genie did, so this has to as well.
    if (dir === 'in') node.style.visibility = '';

    if (reduced()) {
      node.style.opacity = dir === 'in' ? '1' : '0';
      resolve();
      return;
    }
    const ms = dir === 'in' ? DURATION.open : DURATION.close;
    // Lite glass means an older device; shave the duration rather than
    // the effect so it still reads as deliberate.
    const scaled = getState().settings.glass === 'lite' ? Math.round(ms * 0.8) : ms;

    node.style.transformOrigin = originOn(node, origin);
    node.style.willChange = 'transform, opacity';

    const from = dir === 'in' ? { t: 'scale(.88) translateY(8px)', o: '0' } : { t: 'none', o: '1' };
    const to = dir === 'in' ? { t: 'none', o: '1' } : { t: 'scale(.92) translateY(6px)', o: '0' };

    node.style.transition = 'none';
    node.style.transform = from.t;
    node.style.opacity = from.o;
    // Applied before the un-hide takes effect on screen, so the panel is
    // never painted at full size for a frame.
    node.style.visibility = '';

    requestAnimationFrame(() => {
      node.style.transition = `transform ${scaled}ms ${dir === 'in' ? EASE_IN : EASE_OUT}, opacity ${Math.round(scaled * 0.7)}ms linear`;
      node.style.transform = to.t;
      node.style.opacity = to.o;
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      node.style.transition = '';
      node.style.willChange = '';
      if (dir === 'in') { node.style.transform = ''; node.style.opacity = ''; }
      node.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = e => { if (e.target === node && e.propertyName === 'transform') finish(); };
    node.addEventListener('transitionend', onEnd);
    setTimeout(finish, scaled + 90);   // transitionend can be skipped entirely
  });
}

export const panelIn = (node, origin) => run(node, origin, 'in');
export const panelOut = (node, origin) => run(node, origin, 'out');
