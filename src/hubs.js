// hubs.js — the Play segments, the Prep page and the floating Roll button.
//
// No rules live here: each segment reuses an existing renderer (combat.js / sheet.js poolsHeader).
// `rerender` is the router's renderScreen, passed in so this module never imports the router.

import { el } from './core.js';
import { icon, emptyState, sceneBand } from './icons.js';
import { Settings } from './settings.js';
import { listCharacters, currentCharacterId, getHouse } from './store.js';
import { poolsHeader } from './sheet.js';
import { renderLifecycle, renderTasks, renderConflict } from './combat.js';
import { startCharacterWizard, openPregenPicker, startRandomCharacter, startHouseWizard } from './wizard.js';
import { medallion } from './crests.js';
import { houseBanner } from './banner.js';
import { openRollRitual } from './ritual.js';
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
      el('button', { class: 'btn', onclick: () => { const c = activeCharacter(); if (c) openRollRitual(c, rerender); } }, icon('d20', { size: 18 }), ' Roll a test'),
      el('button', { class: 'btn secondary', onclick: go('tasks') }, 'Start a task'),
      el('button', { class: 'btn secondary', onclick: go('conflict') }, 'Start a conflict')),
    el('button', { class: 'chip', onclick: () => { Settings.set('sceneIntroDone', true); rerender(); } }, icon('check', { size: 14 }), 'Got it — hide this'));
}

export function renderTaskSeg(root, rerender) {
  root.append(renderTasks(rerender));
}

export function renderConflictSeg(root, rerender) {
  if (!listCharacters().length) return needCharacter(root);
  root.append(poolsHeader(activeCharacter(), rerender), renderConflict(rerender));
}

// "Prep" (Play/Prep split): what you set up between sessions — who you play, the House, the
// GM tools and settings — as one page of big tiles instead of a menu.
export function renderPrep(root, rerender) {
  const c = activeCharacter();
  const count = listCharacters().length;
  const tile = (ico, title, desc, onclick, cls = '') => el('button', { class: 'prep-tile ' + cls, onclick },
    el('span', { class: 'prep-ico' }, typeof ico === 'string' ? icon(ico, { size: 26 }) : ico),
    el('strong', {}, title), desc ? el('span', { class: 'small muted' }, desc) : null);
  const go = (id) => () => { location.hash = `#/${id}`; };
  const house = getHouse();
  root.append(
    sceneBand('prep'),
    c ? el('button', { class: 'card prep-who', onclick: go('sheet') },
      medallion(c.identity, 56),
      el('span', { class: 'prep-who-text' },
        el('span', { class: 'eyebrow' }, count > 1 ? `Your characters · ${count}` : 'Your character'),
        el('strong', { class: 'prep-who-name' }, c.identity.name || 'Unnamed'),
        el('span', { class: 'small muted' }, 'Open the sheet')),
      el('span', { class: 'more-chev', 'aria-hidden': 'true' }, '›')) : null,
    el('div', { class: 'prep-grid' }, ...[
      tile('plus', 'New character', 'Step-by-step wizard', startCharacterWizard),
      tile('star', 'Play an iconic', 'Ready-made characters', openPregenPicker),
      tile('d20', 'Random', 'Roll a legal build', startRandomCharacter),
      house
        ? tile(houseBanner(house, 26), house.name || 'House', Settings.greatGame() ? 'Run the yearly session' : 'Edit your House', Settings.greatGame() ? go('house') : startHouseWizard)
        : tile('house', 'Create a House', 'Your group’s home base', startHouseWizard),
      Settings.gmScreen() ? tile('gm', 'GM screen', 'Threat, party, tables, NPCs', go('gm')) : null,
      tile('settings', 'Settings', 'Theme, books, backup', go('settings')),
    ].filter(Boolean)));
}

// ---------- Floating d20 Roll button (Character + Table tabs) ----------
let rollFab = null;

/** Show the Roll button on in-play tabs when there is a character to roll for. */
export function syncRollFab(route, rerender) {
  if (!rollFab) {
    rollFab = el('button', { class: 'fab roll-fab', 'aria-label': 'Roll a test', title: 'Roll a test' },
      icon('d20', { size: 26 }), el('span', { class: 'fab-label', 'aria-hidden': 'true' }, 'Roll'));
    document.body.append(rollFab);
    // Audit 2: an extended "Roll" pill at rest; it shrinks to a small d20 while you scroll down
    // (so it never sits on the control you're reaching for) and grows back on scroll up / at the top.
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      rollFab.classList.toggle('mini', y > lastY && y > 80);
      lastY = y;
    }, { passive: true });
  }
  const c = activeCharacter();
  // Shown on the character sheet and the Play segments — except Now, whose hero already has a
  // big Roll button and the skill tiles.
  rollFab.hidden = !(c && (route.id === 'sheet' || (route.hub === 'table' && route.id !== 'home')));
  rollFab.classList.remove('mini');
  rollFab.onclick = () => { const cur = activeCharacter(); if (cur) openRollRitual(cur, rerender); };
}
