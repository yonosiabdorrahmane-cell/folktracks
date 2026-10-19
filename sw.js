/* ═══ Folktracks — service worker ═════════════════════════════════════════
   App shell is precached so the app opens instantly and works with no
   connection at all. Open Food Facts calls are network-first with a
   short-lived cache; everything else is cache-first with background
   revalidation.
   ═══════════════════════════════════════════════════════════════════ */
const VERSION = 'folktracks-v2.5.1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const REMOTE = `${VERSION}-remote`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/glass.css',
  './css/dock.css',
  './css/motion.css',
  './css/views.css',
  './js/app.js',
  './js/util.js',
  './js/store.js',
  './js/i18n.js',
  './js/theme.js',
  './js/haptics.js',
  './js/nutrition.js',
  './js/foods.js',
  './js/gamify.js',
  './js/panelfx.js',
  './js/characters.js',
  './js/dock.js',
  './js/barcode.js',
  './js/vision.js',
  './js/tips.js',
  './js/ui.js',
  './js/charts.js',
  './js/views/components.js',
  './js/views/today.js',
  './js/views/diary.js',
  './js/views/progress.js',
  './js/views/train.js',
  './js/views/add.js',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './js/views/tutorial.js',
  './data/library.js',
  // Icons, splashes and the cast: an installed app that opens
  // offline still has to paint its own launch screen and characters.
  './assets/icons/icon-1024.png',
  './assets/icons/icon-120.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-167.png',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-256.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-60.png',
  './assets/icons/icon-76.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/icon.svg',
  './assets/splash/splash-1125x2436.png',
  './assets/splash/splash-1170x2532.png',
  './assets/splash/splash-1179x2556.png',
  './assets/splash/splash-1242x2688.png',
  './assets/splash/splash-1284x2778.png',
  './assets/splash/splash-1290x2796.png',
  './assets/splash/splash-1620x2160.png',
  './assets/splash/splash-1668x2388.png',
  './assets/splash/splash-2048x2732.png',
  './assets/splash/splash-640x1136.png',
  './assets/splash/splash-750x1334.png',
  './assets/splash/splash-828x1792.png',
  './assets/characters/cat.jpg',
  './assets/characters/folk-bg.png',
  './assets/characters/haymaker.png',
  './assets/characters/samsulekk.jpg',
  './assets/characters/uncekbar.jpg',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // addAll is all-or-nothing; add individually so one 404 can't block install.
    await Promise.all(SHELL_ASSETS.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(err =>
        console.warn('[sw] skip', url, err.message))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  /* Open Food Facts — fresh when possible, cached copy as a fallback. */
  if (url.hostname.endsWith('openfoodfacts.org')) {
    event.respondWith(networkFirst(request, REMOTE, 6000));
    return;
  }

  /* Cross-origin anything else: leave it alone. */
  if (url.origin !== self.location.origin) return;

  /* Navigations always resolve to the shell so deep links work offline. */
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async res => {
    if (res && res.ok && res.type === 'basic') {
      const cache = await caches.open(RUNTIME);
      cache.put(request, res.clone());
    }
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ products: [], status: 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./index.html');
  })());
});
