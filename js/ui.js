/* ═══ Folktracks — UI primitives: toasts, sheets, panels, confirms ═══════ */
import { h, icon, clamp, wait, nextFrame } from './util.js';
import { panelIn, panelOut } from './panelfx.js';
import { haptic } from './haptics.js';
import { t } from './i18n.js';

/* ── Toast ────────────────────────────────────────────────────────── */
export function toast(message, { kind = 'good', ms = 2100, iconName } = {}) {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = h('div.toast.glass.glass-chip', { class: kind },
    h('span', { html: icon(iconName || (kind === 'bad' ? 'close' : 'check')) }),
    h('span', null, message));
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
  return el;
}

/* ── Full-screen panel ────────────────────────────────────────────── */
export function openPanel({ title, build, origin = null, rounded = true, onClose, headRight, headLeft }) {
  const root = document.getElementById('panelRoot');
  const scrim = h('div.panel-scrim');
  const panel = h('div.panel.glass.glass-panel', { class: rounded ? 'rounded' : '' });

  const head = h('div.panel-head');
  if (rounded) head.appendChild(h('div.panel-grabber'));
  head.appendChild(headLeft || h('button.icon-btn.glass.glass-chip', {
    'aria-label': t('c.close'), onclick: () => api.close(),
  }, h('span', { html: icon('close') })));
  head.appendChild(h('div.panel-title', null, title || ''));
  head.appendChild(headRight || h('div', { style: { width: '40px' } }));

  const body = h('div.panel-body');
  panel.append(head, body);
  root.append(scrim, panel);

  let closing = false;
  const api = {
    panel, body, head,
    setTitle(v) { head.querySelector('.panel-title').textContent = v; },
    async close(silent = false) {
      if (closing) return;
      closing = true;
      scrim.classList.remove('on');
      await panelOut(panel, origin);
      panel.remove(); scrim.remove();
      if (!silent) onClose?.();
      document.removeEventListener('keydown', onKey);
    },
  };
  const onKey = e => { if (e.key === 'Escape') api.close(); };
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', () => api.close());

  build?.(body, api);

  // Lay out at full size, then run the warp inward from the origin.
  panel.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    scrim.classList.add('on');
    panelIn(panel, origin);
  });
  return api;
}

/* ── Bottom sheet with rubber-band drag-to-dismiss ────────────────── */
export function openSheet({ title, sub, build, actions = [], dismissible = true, onClose }) {
  const root = document.getElementById('sheetRoot');
  const scrim = h('div.sheet-scrim');
  const sheet = h('div.sheet.glass.glass-sheet');

  const subEl = sub ? h('div.sheet-sub', null, sub) : null;
  const head = h('div.sheet-head',
    dismissible ? h('div.sheet-grab') : null,
    title ? h('div.sheet-title', null, title) : null,
    subEl);
  const body = h('div.sheet-body');
  const foot = h('div.sheet-foot');

  sheet.append(head, body, foot);
  root.append(scrim, sheet);

  let closed = false;
  const api = {
    sheet, body, foot,
    /** Live-update the line under the title (the running gram count). */
    setSub(text) { if (subEl) subEl.textContent = text; },
    async close(result) {
      if (closed) return;
      closed = true;
      scrim.classList.remove('on');
      sheet.classList.remove('on');
      await wait(380);
      sheet.remove(); scrim.remove();
      onClose?.(result);
      document.removeEventListener('keydown', onKey);
    },
  };
  const onKey = e => { if (e.key === 'Escape' && dismissible) api.close(); };
  document.addEventListener('keydown', onKey);

  build?.(body, api);
  for (const a of actions) {
    foot.appendChild(h('button.btn.btn-block', {
      class: a.kind ? `btn-${a.kind}` : 'btn-ghost',
      onclick: () => { haptic(a.kind === 'danger' ? 'warn' : 'medium'); a.onClick?.(api); },
    }, a.label));
  }

  if (dismissible) {
    scrim.addEventListener('click', () => api.close());
    attachDragDismiss(sheet, head, () => api.close());
  }

  requestAnimationFrame(() => { scrim.classList.add('on'); sheet.classList.add('on'); });
  return api;
}

function attachDragDismiss(sheet, handle, onDismiss) {
  let startY = 0, dy = 0, dragging = false;
  const down = e => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    startY = y; dy = 0; dragging = true;
    sheet.classList.add('dragging');
  };
  const move = e => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dy = y - startY;
    // Rubber band upward, follow one-to-one downward.
    const off = dy < 0 ? -Math.sqrt(-dy) * 3 : dy;
    sheet.style.transform = `translateY(${off}px)`;
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    if (dy > 110) { haptic('light'); onDismiss(); }
  };
  handle.addEventListener('touchstart', down, { passive: true });
  handle.addEventListener('touchmove', move, { passive: true });
  handle.addEventListener('touchend', up, { passive: true });
  handle.addEventListener('mousedown', down);
  addEventListener('mousemove', move);
  addEventListener('mouseup', up);
}

/* ── Confirm ──────────────────────────────────────────────────────── */
export function confirmSheet({ title, message, confirmLabel, kind = 'danger' }) {
  return new Promise(resolve => {
    let settled = false;
    const api = openSheet({
      title,
      sub: message,
      dismissible: true,
      actions: [
        { label: confirmLabel || t('c.confirm'), kind, onClick: a => { settled = true; resolve(true); a.close(); } },
        { label: t('c.cancel'), onClick: a => { settled = true; resolve(false); a.close(); } },
      ],
      onClose: () => { if (!settled) resolve(false); },
    });
    return api;
  });
}

/* ── Prompt (single value) ────────────────────────────────────────── */
export function promptSheet({ title, sub, label, value = '', type = 'text', suffix, placeholder, step }) {
  return new Promise(resolve => {
    let settled = false;
    let input;
    openSheet({
      title, sub,
      build(body) {
        if (label) body.appendChild(h('label.form-lbl', null, label));
        input = h('input.field', {
          type, value, placeholder: placeholder || '', step: step || undefined,
          inputmode: type === 'number' ? 'decimal' : undefined,
        });
        body.appendChild(suffix
          ? h('div.row', null, input, h('span.muted', { style: { flex: '0 0 auto' } }, suffix))
          : input);
        setTimeout(() => input.focus(), 220);
      },
      actions: [
        { label: t('c.save'), kind: 'primary', onClick: a => { settled = true; resolve(input.value); a.close(); } },
        { label: t('c.cancel'), onClick: a => { settled = true; resolve(null); a.close(); } },
      ],
      onClose: () => { if (!settled) resolve(null); },
    });
  });
}

/* ── Segmented control ────────────────────────────────────────────── */
export function segmented(options, value, onChange) {
  const wrap = h('div.segmented');
  const thumb = h('div.seg-thumb');
  wrap.appendChild(thumb);
  const btns = options.map(o => h('button', {
    'aria-selected': String(o.value === value),
    onclick: () => { if (o.value === value) return; haptic('select'); value = o.value; sync(); onChange?.(o.value); },
  }, o.label));
  btns.forEach(b => wrap.appendChild(b));

  function sync() {
    btns.forEach((b, i) => b.setAttribute('aria-selected', String(options[i].value === value)));
    place();
  }
  function place() {
    const i = Math.max(0, options.findIndex(o => o.value === value));
    const b = btns[i];
    if (!b || !b.offsetWidth) return;
    thumb.style.width = `${b.offsetWidth}px`;
    thumb.style.transform = `translateX(${b.offsetLeft - 3}px)`;
  }
  requestAnimationFrame(place);
  setTimeout(place, 60);
  addEventListener('resize', place, { passive: true });
  wrap.setValue = v => { value = v; sync(); };
  return wrap;
}

/* ── Switch ───────────────────────────────────────────────────────── */
/* ── Dropdown ─────────────────────────────────────────────────────────
   A native <select> hands its popup to the OS, which on desktop means a
   flat white list that ignores the theme entirely. This renders the list
   ourselves so it matches the glass, and pins it to the viewport with
   position:fixed so the sheet's own overflow cannot clip it.
   ─────────────────────────────────────────────────────────────────── */
export function dropdown(options, index, onChange, { ariaLabel } = {}) {
  let idx = clamp(index, 0, Math.max(0, options.length - 1));
  let menu = null, onDocDown = null, onReflow = null;

  const label = h('span.dd-label', null, options[idx]?.label ?? '');
  const btn = h('button.field.dd-btn', {
    type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
    'aria-label': ariaLabel || null,
  }, label, h('span.dd-caret', { 'aria-hidden': 'true' }));

  function place() {
    if (!menu) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    menu.style.minWidth = `${r.width}px`;
    // getBoundingClientRect is physical, so anchor with physical `left`.
    // inset-inline-start would resolve to `right` under dir="rtl" and
    // throw the menu to the opposite side of the screen.
    const w = menu.offsetWidth || r.width;
    menu.style.left = `${clamp(r.left, margin, Math.max(margin, innerWidth - w - margin))}px`;
    // Flip above when there is not enough room below.
    const mh = menu.offsetHeight;
    const below = innerHeight - r.bottom - margin;
    menu.style.top = below >= mh || below >= r.top - margin
      ? `${Math.min(r.bottom + 6, innerHeight - mh - margin)}px`
      : `${Math.max(margin, r.top - mh - 6)}px`;
  }

  function close() {
    if (!menu) return;
    const m = menu;
    menu = null;
    btn.setAttribute('aria-expanded', 'false');
    m.classList.remove('on');
    setTimeout(() => m.remove(), 200);
    document.removeEventListener('pointerdown', onDocDown, true);
    removeEventListener('resize', onReflow);
    removeEventListener('scroll', onReflow, true);
  }

  function pick(i) {
    idx = i;
    label.textContent = options[idx].label;
    close();
    haptic('light');
    onChange?.(idx, options[idx]);
  }

  function open() {
    if (menu) return close();
    menu = h('div.dd-menu.glass.glass-sheet', { role: 'listbox' },
      ...options.map((o, i) => h('button.dd-opt', {
        type: 'button', role: 'option', 'aria-selected': String(i === idx),
        onclick: () => pick(i),
      }, h('span', null, o.label), h('span.dd-tick', { 'aria-hidden': 'true' }))));
    document.body.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    place();
    requestAnimationFrame(() => menu?.classList.add('on'));

    onDocDown = e => { if (!menu?.contains(e.target) && !btn.contains(e.target)) close(); };
    onReflow = () => close();
    document.addEventListener('pointerdown', onDocDown, true);
    addEventListener('resize', onReflow);
    addEventListener('scroll', onReflow, true);
  }

  btn.addEventListener('click', () => { haptic('light'); open(); });
  btn.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (menu) return;
      pick(clamp(idx + (e.key === 'ArrowDown' ? 1 : -1), 0, options.length - 1));
    }
  });

  return {
    el: btn,
    close,
    get index() { return idx; },
    setIndex(i) { idx = clamp(i, 0, options.length - 1); label.textContent = options[idx].label; },
  };
}

export function toggle(checked, onChange) {
  const input = h('input', { type: 'checkbox', checked: checked || null, role: 'switch' });
  input.addEventListener('change', () => { haptic(input.checked ? 'medium' : 'light'); onChange?.(input.checked); });
  return h('label.switch', null, input, h('span.track'), h('span.knob'));
}

/* ── Settings row helpers ─────────────────────────────────────────── */
export function setRow({ icon: ic, tint, label, desc, value, onClick, control, chevron = false }) {
  const kids = [
    ic ? h('div.set-icon', { style: { '--tint': tint || 'var(--azure)' }, html: icon(ic) }) : null,
    h('div.grow', null, h('div.set-label', null, label), desc ? h('div.set-desc', null, desc) : null),
    value != null ? h('div.set-value', null, value) : null,
    control || null,
    chevron ? h('div.set-chev', { html: icon('chevron') }) : null,
  ];
  return onClick
    ? h('button.set-row', { onclick: e => { haptic('light'); onClick(e); } }, kids)
    : h('div.set-row', null, kids);
}

/* ── Level-up burst ───────────────────────────────────────────────── */
export function burst(x = innerWidth / 2, y = innerHeight / 2, colors = ['#5ff0c2', '#48c9ff', '#a97bff', '#ffb545']) {
  if (document.documentElement.dataset.motion === 'off') return;
  const layer = h('div.burst');
  for (let i = 0; i < 26; i++) {
    const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
    const d = 90 + Math.random() * 130;
    layer.appendChild(h('i', {
      style: {
        left: `${x}px`, top: `${y}px`,
        background: colors[i % colors.length],
        '--bx': `${Math.cos(a) * d}px`,
        '--by': `${Math.sin(a) * d - 40}px`,
        '--br': `${Math.random() * 720 - 360}deg`,
        animationDelay: `${Math.random() * 90}ms`,
      },
    }));
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1400);
}

/* ── A tap-driven sheen sweep across any glass surface ────────────── */
export function sweep(el) {
  if (document.documentElement.dataset.motion === 'off') return;
  if (!el.querySelector(':scope > .sheen')) {
    el.classList.add('liquid');
    el.appendChild(h('div.sheen'));
  }
  el.classList.remove('sweep');
  void el.offsetWidth;
  el.classList.add('sweep');
  setTimeout(() => el.classList.remove('sweep'), 820);
}

export { nextFrame, clamp };
