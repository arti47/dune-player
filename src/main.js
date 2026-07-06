// main.js — entry point / boot.

import { qs } from './core.js';
import { Settings } from './settings.js';
import { showToast } from './ui.js';
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
  navigator.serviceWorker.register('service-worker.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('Update available — reload to apply.');
        }
      });
    });
  }).catch(() => { /* offline/file mode: fine */ });
}

applyTheme();
initThemeButton();
initServiceWorker();
initSync();
initRouter();
