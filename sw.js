/* ItalyTrip PWA service worker: cache-first, fully offline after first visit. */
const CACHE = 'italytrip-v2';
const CORE = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './trip.js',
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
  './tickets/verrazzano_booking.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails hard on any 404; add one by one so a missing file never
      // breaks the whole install
      Promise.all(CORE.map((u) => cache.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        // keep successful same-origin responses in cache for next time
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => null);
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
