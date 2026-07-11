// service-worker.js — network-first PWA cache. Bump CACHE_VERSION on ANY shipped-file change.

const CACHE_VERSION = 'imperium-v0.72.0';

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
  './src/content.js',
  './src/sheet.js',
  './src/combat.js',
  './src/gm.js',
  './src/house.js',
  './src/tutorial.js',
  './src/screens.js',
  './src/router.js',
  './src/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // No auto skipWaiting: the new worker waits until the page's "Reload to update"
  // prompt is accepted (posts SKIP_WAITING below), so updates never disrupt a live session.
});

// The page posts this when the user accepts the update prompt.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') self.skipWaiting();
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
