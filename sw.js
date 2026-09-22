/* ItalyTrip PWA service worker.
 * Strategy:
 *  - HTML / JS / CSS / JSON (app shell & data): NETWORK FIRST, cache fallback
 *    -> an updated site is picked up on the very next open, offline still works;
 *  - tickets / icons / vendor (PDF.js): CACHE FIRST (big, rarely changed).
 */
const CACHE = 'italytrip-v5';
const V = '?v=5';
const CORE = [
  './',
  './index.html',
  './app.css' + V,
  './app.js' + V,
  './manifest.webmanifest',
  './version.json',
  './trip.js' + V,
  './trip.json',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './tickets/vatican_2026-09-26_0830.pdf',
  './tickets/borghese_2026-09-26_1600.pdf',
  './tickets/colosseum_2026-09-27_1350.pdf',
  './tickets/train_roma_salerno_2026-09-28_0729.pdf',
  './tickets/train_salerno_firenze_2026-09-30_0923.pdf',
  './tickets/uffizi_2026-10-01_0900.pdf',
  './tickets/train_firenze_milano_2026-10-03_0955.pdf',
  './tickets/accademia_bargello_2026-09-30_1545.pdf',
  './tickets/verrazzano_2026-10-02_1000.pdf',
  './tickets/verrazzano_booking.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // add one by one: a single missing file must never break the install
      Promise.all(CORE.map((u) => cache.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
      // force already-open pages to reload so a fresh version is visible at once
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((c) => {
        try { return c.navigate(c.url) || null; } catch (err) { return null; }
      })))
      .catch(() => null)
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // never cache the version probe: it must always hit the network
  if (url.pathname.endsWith('version.json')) return;

  const isBigAsset = /\/(tickets|icons|vendor)\//.test(url.pathname);

  if (isBigAsset) {
    // cache first: fast + offline safe
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => null);
          }
          return res;
        }).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // app shell & data: network first, fall back to cache when offline
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => null);
      }
      return res;
    }).catch(() =>
      caches.match(req).then((hit) => hit || caches.match('./index.html'))
    )
  );
});
