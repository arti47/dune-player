// router.js — bottom-nav hash routing + conditional tab gating.

import { qs, el } from './core.js';
import { Settings } from './settings.js';
import { renderHome, renderRules, renderSettings } from './screens.js';
import { renderSheet } from './sheet.js';
import { renderGM } from './gm.js';
import { renderHouseManagement } from './house.js';
import { renderTutorial } from './tutorial.js';
import { renderJournal } from './journal.js';

const ROUTES = [
  { id: 'home',     label: 'Home',     ico: '⌂', render: renderHome },
  { id: 'sheet',    label: 'Sheet',    ico: '☰', render: renderSheet },
  { id: 'rules',    label: 'Rules',    ico: '❖', render: renderRules },
  { id: 'journal',  label: 'Journal',  ico: '✒', render: renderJournal, gated: () => Settings.journal() },
  { id: 'house',    label: 'House',    ico: '🏛', render: renderHouseManagement, gated: () => Settings.greatGame() },
  { id: 'settings', label: 'Settings', ico: '⚙', render: renderSettings },
  { id: 'gm',       label: 'GM',       ico: '👁', render: renderGM, gated: () => Settings.gmScreen() },
  // Onboarding tutorial (Phase 7): routable but never in the bottom nav (§13 #4) —
  // reached from the first-launch prompt + a Settings button only.
  { id: 'tutorial', label: 'Learn',    ico: '🎓', render: renderTutorial, nav: false },
];

// Routes that may render (gating passes). Nav shows the subset with nav !== false.
function routableRoutes() { return ROUTES.filter((r) => !r.gated || r.gated()); }
function visibleRoutes() { return routableRoutes().filter((r) => r.nav !== false); }

export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  return routableRoutes().find((r) => r.id === hash) || ROUTES[0];
}

export function navigate(id) {
  location.hash = `#/${id}`;
}

export function renderNav() {
  const nav = qs('.bottom-nav');
  nav.replaceChildren(
    ...visibleRoutes().map((r) =>
      el('a', {
        href: `#/${r.id}`,
        'aria-current': currentRoute().id === r.id ? 'page' : null,
      },
      el('span', { class: 'nav-ico', 'aria-hidden': 'true' }, r.ico),
      r.label)
    )
  );
}

export function renderScreen() {
  const screen = qs('#screen');
  screen.replaceChildren();
  currentRoute().render(screen);
  renderNav();
  screen.focus({ preventScroll: true });
}

export function initRouter() {
  window.addEventListener('hashchange', renderScreen);
  renderScreen();
}
