// main.js — entry point / boot.

import { qs } from './core.js';
import { Settings } from './settings.js';
import { showActionToast } from './ui.js';
import { initRouter } from './router.js';
import { initSync } from './sync.js';

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/** Resolve + apply the theme (§1.1 decision #6: default follows system). */
export function applyTheme() {
  const pref = Settings.theme();
  const dark = pref === 'dark' || (pref === 'system' && systemDark.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
systemDark.addEventListener('change', () => {
  if (Settings.theme() === 'system') applyTheme();
});

function initThemeButton() {
  qs('#theme-btn').addEventListener('click', () => {
    // Quick toggle: flips between light/dark (explicit); Settings screen offers "system".
    const dark = document.documentElement.dataset.theme === 'dark';
    Settings.set('theme', dark ? 'light' : 'dark');
    applyTheme();
  });
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;

  let updateAccepted = false, reloading = false, prompted = false;

  // Reload once the new worker takes control — but only after the user accepted the
  // prompt (so the first-install clients.claim doesn't trigger a surprise reload).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateAccepted || reloading) return;
    reloading = true;
    location.reload();
  });

  const promptUpdate = (worker) => {
    if (prompted) return;
    prompted = true;
    showActionToast('A new version is available.', 'Reload', (dismiss) => {
      updateAccepted = true;
      dismiss();
      worker.postMessage({ type: 'SKIP_WAITING' });
      // Fallback in case controllerchange never fires (e.g. worker already active).
      setTimeout(() => { if (!reloading) { reloading = true; location.reload(); } }, 2000);
    });
  };

  navigator.serviceWorker.register('service-worker.js').then((reg) => {
    // A worker that finished installing while the page was away is already waiting.
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        // installed + an existing controller = an UPDATE (not the first install).
        if (sw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(sw);
      });
    });
  }).catch(() => { /* offline/file mode: fine */ });
}

applyTheme();
initThemeButton();
initServiceWorker();
initSync();
initRouter();
