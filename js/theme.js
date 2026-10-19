/* ═══ Folktracks — theme: system sync, status-bar colour, glass quality ═══ */
import { getState, update } from './store.js';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const STATUS = { light: '#f4f5f9', dark: '#07080c' };

function metaThemeColor() {
  let m = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  return m;
}

/** The theme actually painted right now — 'light' or 'dark'. */
export function effectiveTheme() {
  const pref = getState().settings.theme;
  if (pref === 'light' || pref === 'dark') return pref;
  return mq.matches ? 'dark' : 'light';
}

export function applyTheme() {
  const { settings } = getState();
  const root = document.documentElement;

  // 'system' stays on the attribute so CSS can mirror the OS via a media
  // query; explicit choices win over it in both directions.
  root.dataset.theme = settings.theme;
  root.dataset.motion = settings.motion === 'off' ? 'off' : 'full';
  root.dataset.glass = settings.glass;

  const eff = effectiveTheme();
  root.dataset.effective = eff;
  metaThemeColor().setAttribute('content', STATUS[eff]);

  // iOS reads the status bar style at launch, but keeping it in sync helps
  // Safari's UI tint while browsing.
  const bar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (bar) bar.setAttribute('content', 'black-translucent');
}

export function setTheme(pref) {
  update(s => { s.settings.theme = pref; return s; });
  applyTheme();
}

export function setMotion(mode) {
  update(s => { s.settings.motion = mode; return s; });
  applyTheme();
}

export function setGlass(mode) {
  update(s => { s.settings.glass = mode; return s; });
  applyTheme();
}

/** Follow the OS live — iOS flips this at sunset with Auto Appearance. */
export function watchSystemTheme(onChange) {
  const handler = () => { applyTheme(); onChange?.(effectiveTheme()); };
  mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
  return () => mq.removeEventListener?.('change', handler);
}

/** Lite mode: drop the heavy blurs, keep the tint and the specular rim. */
const liteStyle = document.createElement('style');
liteStyle.textContent = `
  html[data-glass="lite"] .glass,
  html[data-glass="lite"] .glass-bar,
  html[data-glass="lite"] .glass-chip,
  html[data-glass="lite"] .glass-sheet,
  html[data-glass="lite"] .glass-panel,
  html[data-glass="lite"] .dock,
  html[data-glass="lite"] .dock-label {
    -webkit-backdrop-filter: blur(8px) saturate(150%) !important;
    backdrop-filter: blur(8px) saturate(150%) !important;
  }
  html[data-glass="lite"] .lens::before { display: none; }
  html[data-glass="lite"] .grain { display: none; }
  html[data-glass="lite"] .orb { filter: blur(48px); }
`;
document.head.appendChild(liteStyle);
