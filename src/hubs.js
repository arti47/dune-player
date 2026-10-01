// hubs.js — the in-play "Table" segments and the "More" menu (UI overhaul, Stage 1).
//
// No rules live here: each segment reuses an existing renderer (combat.js / sheet.js poolsHeader).
// `rerender` is the router's renderScreen, passed in so this module never imports the router.

import { el } from './core.js';
import { icon, emptyState } from './icons.js';
import { Settings } from './settings.js';
import { listCharacters, currentCharacterId } from './store.js';
import { poolsHeader } from './sheet.js';
import { renderLifecycle, renderTasks, renderConflict } from './combat.js';
import { startCharacterWizard, openPregenPicker } from './wizard.js';
import { openRollDialog } from './roller.js';
import { HELP } from '../data-help.js';

function activeCharacter() {
  const chars = listCharacters();
  return chars.find((c) => c.id === currentCharacterId()) || chars[0] || null;
}

// Scene and conflict act on the party; with nobody to play there is nothing to show yet.
function needCharacter(root) {
  root.append(el('section', { class: 'card' },
    emptyState('person', 'Make or pick a character first — the table tools act on your party.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: startCharacterWizard }, '+ New character'),
      el('button', { class: 'btn secondary', onclick: openPregenPicker }, 'Play an iconic'))));
}

export function renderScene(root, rerender) {
  if (!listCharacters().length) return needCharacter(root);
  root.append(...[poolsHeader(activeCharacter(), rerender), Settings.get('sceneIntroDone') ? null : sceneIntro(rerender), renderLifecycle(rerender)].filter(Boolean));
}

/** First-visit Scene guide (round 2 #8): how a scene runs + one-tap starters. "Got it" hides it for good. */
function sceneIntro(rerender) {
  const s = HELP.starters.scene;
  const go = (id) => () => { location.hash = `#/${id}`; };
  return el('section', { class: 'card starter-card' },
    el('h3', {}, s.title),
    el('p', { class: 'small' }, s.intro),
    el('ol', { class: 'help-steps' }, ...s.steps.map((t) => el('li', {}, t))),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => { const c = activeCharacter(); if (c) openRollDialog(c, rerender); } }, icon('d20', { size: 18 }), ' Roll a test'),
      el('button', { class: 'btn secondary', onclick: go('tasks') }, 'Start a task'),
      el('button', { class: 'btn secondary', onclick: go('conflict') }, 'Start a conflict')),
    el('button', { class: 'link-btn small', onclick: () => { Settings.set('sceneIntroDone', true); rerender(); } }, 'Got it — hide this'));
}

export function renderTaskSeg(root, rerender) {
  root.append(renderTasks(rerender));
}

export function renderConflictSeg(root, rerender) {
  if (!listCharacters().length) return needCharacter(root);
  root.append(poolsHeader(activeCharacter(), rerender), renderConflict(rerender));
}

// "More": the occasional destinations, as a tappable list.
export function renderMore(root) {
  const row = (href, ico, title, desc) =>
    el('li', {},
      el('a', { class: 'more-row', href },
        el('span', { class: 'more-ico' }, icon(ico, { size: 22 })),
        el('span', { class: 'more-text' }, el('strong', {}, title), el('span', { class: 'small muted' }, desc)),
        el('span', { class: 'more-chev', 'aria-hidden': 'true' }, '›')));
  root.append(el('section', { class: 'card' },
    el('h2', {}, 'More'),
    el('ul', { class: 'more-list' },
      Settings.greatGame() ? row('#/house', 'house', 'House', 'Run your House’s yearly session') : null,
      Settings.gmScreen() ? row('#/gm', 'gm', 'GM screen', 'Threat, party peek, tables, NPCs') : null,
      row('#/settings', 'settings', 'Settings', 'Toggles, theme, campaign, backup'))));
}

// ---------- Floating d20 Roll button (Character + Table tabs) ----------
let rollFab = null;

/** Show the Roll button on in-play tabs when there is a character to roll for. */
export function syncRollFab(tab, rerender) {
  if (!rollFab) {
    rollFab = el('button', { class: 'fab roll-fab', 'aria-label': 'Roll a test', title: 'Roll a test' },
      icon('d20', { size: 28 }));
    document.body.append(rollFab);
  }
  const c = activeCharacter();
  rollFab.hidden = !(c && (tab === 'sheet' || tab === 'table'));
  rollFab.onclick = () => { const cur = activeCharacter(); if (cur) openRollDialog(cur, rerender); };
}
