// router.js — bottom-nav hash routing + conditional tab gating.
//
// Five tabs (UI overhaul): Home · Character · Table · Library · More. Every older route id stays
// routable (deep links, cite(), tutorial hand-offs): a route with `hub` renders under that tab's
// segmented control; a route with `parent` just lights that tab. A hub id (`#/table`, `#/library`)
// opens the segment you last used there.

import { qs, el } from './core.js';
import { icon } from './icons.js';
import { Settings } from './settings.js';
import { renderHome, renderRules, renderSettings } from './screens.js';
import { renderSheet } from './sheet.js';
import { renderGM } from './gm.js';
import { renderHouseManagement } from './house.js';
import { renderTutorial } from './tutorial.js';
import { renderJournal } from './journal.js';
import { renderPlay } from './play.js';
import { renderScene, renderTaskSeg, renderConflictSeg, renderMore, syncRollFab } from './hubs.js';
import { setSwipe, animateIn, neighbours } from './swipe.js';

const TABS = [
  { id: 'home',    label: 'Home',      ico: 'home' },
  { id: 'sheet',   label: 'Character', ico: 'person' },
  { id: 'table',   label: 'Table',     ico: 'table', hub: true },
  { id: 'library', label: 'Library',   ico: 'rules', hub: true },
  { id: 'more',    label: 'More',      ico: 'more' },
];

const ROUTES = [
  { id: 'home',     label: 'Home',      render: renderHome },
  { id: 'sheet',    label: 'Character', render: renderSheet },
  { id: 'scene',    label: 'Scene',     hub: 'table', render: renderScene },
  { id: 'tasks',    label: 'Tasks',     hub: 'table', render: renderTaskSeg },
  { id: 'conflict', label: 'Conflict',  hub: 'table', render: renderConflictSeg },
  { id: 'journal',  label: 'Journal',   hub: 'table', render: renderJournal, gated: () => Settings.journal() },
  { id: 'rules',    label: 'Rules',     hub: 'library', render: renderRules },
  { id: 'play',     label: 'How to play', hub: 'library', render: renderPlay },
  // Onboarding tutorial (Phase 7, §13 #4): a Library segment, never its own tab.
  { id: 'tutorial', label: 'Tutorial',  hub: 'library', render: renderTutorial },
  { id: 'more',     label: 'More',      render: renderMore },
  { id: 'house',    label: 'House',     parent: 'more', render: renderHouseManagement, gated: () => Settings.greatGame() },
  { id: 'gm',       label: 'GM',        parent: 'more', render: renderGM, gated: () => Settings.gmScreen() },
  { id: 'settings', label: 'Settings',  parent: 'more', render: renderSettings },
];

// Routes that may render (gating passes).
function routableRoutes() { return ROUTES.filter((r) => !r.gated || r.gated()); }
function segmentsOf(hub) { return routableRoutes().filter((r) => r.hub === hub); }

const LAST_KEY = 'imperium.lastSegment';
function lastSegment(hub) {
  let id = null;
  try { id = JSON.parse(localStorage.getItem(LAST_KEY) || '{}')[hub]; } catch { /* storage blocked */ }
  const segs = segmentsOf(hub);
  return segs.find((r) => r.id === id) || segs[0];
}
function rememberSegment(route) {
  try {
    const all = JSON.parse(localStorage.getItem(LAST_KEY) || '{}');
    all[route.hub] = route.id;
    localStorage.setItem(LAST_KEY, JSON.stringify(all));
  } catch { /* per-viewer convenience only */ }
}

export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const tab = TABS.find((t) => t.id === hash && t.hub);
  if (tab) return lastSegment(tab.id);
  return routableRoutes().find((r) => r.id === hash) || ROUTES[0];
}

/** The nav tab a route belongs to. */
export function tabOf(route) { return route.hub || route.parent || route.id; }

export function navigate(id) {
  location.hash = `#/${id}`;
}

export function renderNav() {
  const nav = qs('.bottom-nav');
  const active = tabOf(currentRoute());
  nav.replaceChildren(
    ...TABS.map((t) =>
      el('a', { href: `#/${t.id}`, 'aria-current': active === t.id ? 'page' : null },
        el('span', { class: 'nav-ico', 'aria-hidden': 'true' }, icon(t.ico, { size: 22 })),
        t.label)));
}

function segmentBar(route) {
  const segs = segmentsOf(route.hub);
  if (segs.length < 2) return null;
  return el('nav', { class: 'segmented', 'aria-label': TABS.find((t) => t.id === route.hub).label },
    ...segs.map((s) => el('a', { href: `#/${s.id}`, 'aria-current': s.id === route.id ? 'page' : null }, s.label)));
}

export function renderScreen() {
  const screen = qs('#screen');
  screen.replaceChildren();
  const route = currentRoute();
  let mount = screen;
  if (route.hub) {
    rememberSegment(route);
    const bar = segmentBar(route);
    if (bar) screen.append(bar);
    // Segments render into their own body: several screens clear their root on internal
    // refresh, which must never take the segment bar with it.
    mount = el('div', { class: 'hub-body' });
    screen.append(mount);
  }
  setSwipe(null); // each screen opts in; the Character screen sets its own
  route.render(mount, renderScreen);
  // Table segments: swipe left/right walks Scene · Tasks · Conflict · Journal (round 2 #5).
  if (route.hub === 'table') {
    const n = neighbours(segmentsOf('table').map((r) => r.id), route.id);
    setSwipe({ prev: n.prev && (() => navigate(n.prev)), next: n.next && (() => navigate(n.next)) });
    animateIn(mount);
  }
  renderNav();
  syncRollFab(tabOf(route), renderScreen);
  screen.focus({ preventScroll: true });
}

export function initRouter() {
  window.addEventListener('hashchange', renderScreen);
  renderScreen();
}
