// service-worker.js — network-first PWA cache. Bump CACHE_VERSION on ANY shipped-file change.

const CACHE_VERSION = 'imperium-v0.34.0';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon.svg',
  './data.js',
  './data-npcs.js',
  './data-pregens.js',
  './data-sand-and-dust.js',
  './data-great-game.js',
  './data-power-and-pawns.js',
  './data-masters-of-dune.js',
  './data-fall-of-imperium.js',
  './firebase-config.js',
  './src/core.js',
  './src/ui.js',
  './src/rules.js',
  './src/derived.js',
  './src/settings.js',
  './src/store.js',
  './src/sync.js',
  './src/wizard.js',
  './src/roller.js',
  './src/cite.js',
  './src/sheet.js',
  './src/combat.js',
  './src/gm.js',
  './src/screens.js',
  './src/router.js',
  './src/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first: fresh when online, cached when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
