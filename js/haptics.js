/* ═══ Folktracks — haptics ════════════════════════════════════════════════
   iOS Safari has no Vibration API, so on iPhone we fall back to a
   near-silent click through WebAudio, which reads as tactile enough
   alongside the visual spring. Android gets real vibration.
   ═══════════════════════════════════════════════════════════════════ */
import { getState } from './store.js';

let ctx = null;
const canVibrate = typeof navigator.vibrate === 'function';

const PATTERNS = {
  light:   { ms: 8,  freq: 2100, gain: .016 },
  medium:  { ms: 14, freq: 1500, gain: .028 },
  heavy:   { ms: 22, freq: 900,  gain: .04 },
  success: { ms: 0,  seq: [[1400, .022, 0], [2100, .022, 70]] },
  warn:    { ms: 0,  seq: [[700, .03, 0], [700, .03, 110]] },
  select:  { ms: 5,  freq: 2600, gain: .012 },
};

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function blip(freq, gain, delayMs = 0, ms = 12) {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const t0 = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + .004);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + ms / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0); osc.stop(t0 + ms / 1000 + .02);
}

export function haptic(kind = 'light') {
  if (!getState().settings.haptics) return;
  const p = PATTERNS[kind] || PATTERNS.light;
  if (canVibrate) {
    navigator.vibrate(p.seq ? p.seq.map(s => s[2] ? [s[2], 10] : [10]).flat() : p.ms);
    return;
  }
  if (p.seq) p.seq.forEach(([f, g, d]) => blip(f, g, d));
  else blip(p.freq, p.gain, 0, p.ms);
}

/** WebAudio needs a user gesture before it will make a sound on iOS. */
export function primeAudio() {
  const unlock = () => { const c = ensureCtx(); if (c?.state === 'suspended') c.resume(); };
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('pointerdown', unlock, { once: true });
}
