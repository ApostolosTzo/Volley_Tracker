/* =============================================================
 * sw.js — offline cache (app shell)
 * ============================================================= */
const CACHE = 'volley-tracker-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/config.js',
  './js/ui.js',
  './js/store.js',
  './js/stats.js',
  './js/charts.js',
  './js/export.js',
  './js/app.js',
  './js/views/entry.js',
  './js/views/dashboard.js',
  './js/views/setup.js',
  './js/views/tools.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  /* Στατιστικά/εικονίδια: cache-first (γρήγορα, αλλάζουν σπάνια) */
  if (e.request.destination === 'image' || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))
    );
    return;
  }

  /* HTML/CSS/JS: network-first — πάντα η πιο φρέσκια έκδοση όταν υπάρχει
     σύνδεση, και cache fallback όταν είμαστε offline. */
  e.respondWith(
    fetch(e.request)
      .then(put)
      .catch(() => caches.match(e.request).then((hit) => hit || offline()))
  );
});

function put(res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(res.url, copy));
  }
  return res;
}

function offline() {
  return caches.match('./index.html').then((hit) => hit || new Response(
    '<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif;padding:2rem">Offline χωρίς cache.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  ));
}