// play.js — "How to play": the arc of an actual game, as three actionable checklists.
//
// The rest of the app's help explains individual controls. This screen answers the question those
// accordions do not: what do I actually do to start a game, keep it going, and finish it well.
//
// Each step is a live button that performs the thing it describes. Steps tick themselves wherever
// the app can see the evidence (a character exists, a roll was logged, an advance was bought);
// the rest — things that happen at the table, not in the app — are ticked by hand and kept in
// `Settings.play().done`.

import { el } from './core.js';
import { HELP } from '../data-help.js';
import { icon } from './icons.js';
import { Settings } from './settings.js';
import { showToast, confirmModal, modal } from './ui.js';
import {
  listCharacters, currentCharacterId, getCharacter, getHouse, getRollLog, getJournal, exportAll,
} from './store.js';
import { startCharacterWizard, openPregenPicker, startHouseWizard } from './wizard.js';
import { openRollDialog } from './roller.js';
import { endScene, endAdventure } from './combat.js';

let mountRoot = null;
const goto = (route) => { location.hash = `#/${route}`; };
function refresh() { if (mountRoot) { mountRoot.replaceChildren(); build(mountRoot); } }

/** The character in play, or null. */
function active() {
  const id = currentCharacterId();
  return (id && getCharacter(id)) || listCharacters()[0] || null;
}

// ---------- evidence: steps the app can confirm on its own ----------
// Anything not listed here is a table-side step the player ticks by hand.
const EVIDENCE = {
  learn: () => Settings.tutorial().completedLessons.length > 0,
  mode: () => Settings.journal() || Settings.gmScreen(),
  house: () => !!getHouse(),
  character: () => listCharacters().length > 0,
  hooks: () => {
    const c = active();
    if (!c) return false;
    const statements = Object.values(c.driveStatements || {}).filter((s) => s && s.text).length;
    return statements > 0 && !!c.identity?.ambition;
  },
  roll: () => getRollLog().length > 0,
  track: () => {
    const j = getJournal();
    return j.threads.length > 0 || j.contacts.length > 0;
  },
  advance: () => listCharacters().some((c) => (c.advancement?.log || []).length > 0),
};

function isDone(step) {
  const auto = EVIDENCE[step.id];
  if (auto && auto()) return true;
  return Settings.play().done.includes(step.id);
}
/** True when the app proved it, so the manual tick is not offered. */
function provenByApp(step) {
  const auto = EVIDENCE[step.id];
  return !!(auto && auto());
}

// ---------- actions: each button does the real thing ----------
function needCharacter() {
  const c = active();
  if (!c) { showToast('Make a character first'); return null; }
  return c;
}

const ACTIONS = {
  tutorial: { label: 'Open the tutorial', run: () => goto('tutorial') },

  mode: {
    label: 'Choose how you play',
    run: () => {
      const close = modal([
        el('h3', {}, 'How are you playing?'),
        el('p', { class: 'small muted' },
          'You can change this later in Settings — nothing here is permanent.'),
        el('div', { class: 'cta-row' },
          el('button', { class: 'btn', onclick: () => {
            Settings.set('journal', true); Settings.set('oracle', true);
            Settings.markPlayStep('mode');
            close(); showToast('Solo tools enabled'); refresh();
          } }, 'On my own (solo)'),
          el('button', { class: 'btn secondary', onclick: () => {
            Settings.markPlayStep('mode');
            close(); showToast('Play with a gamemaster'); refresh();
          } }, 'With a gamemaster')),
        el('p', { class: 'small muted' },
          'Running the game for others? Switch on the GM screen in Settings as well.'),
      ]);
    },
  },

  house: { label: 'Create your House', run: () => startHouseWizard() },

  character: {
    label: 'Make your character',
    run: () => {
      const close = modal([
        el('h3', {}, 'Make your character'),
        el('div', { class: 'cta-row' },
          el('button', { class: 'btn', onclick: () => { close(); startCharacterWizard(); } }, 'Use the wizard'),
          el('button', { class: 'btn secondary', onclick: () => { close(); openPregenPicker(); } }, 'Play an iconic')),
        el('p', { class: 'small muted' },
          'The wizard takes about ten minutes. An iconic character is ready immediately.'),
      ]);
    },
  },

  sheet: { label: 'Open your sheet', run: () => goto('sheet') },

  firstScene: {
    label: 'Start the first scene',
    run: () => {
      Settings.markPlayStep('firstScene');
      if (Settings.journal()) goto('journal');
      else { showToast('Your GM sets the scene — open your sheet and play'); goto('sheet'); }
    },
  },

  roll: {
    label: 'Roll a test',
    run: () => { const c = needCharacter(); if (c) openRollDialog(c, refresh); },
  },

  pools: { label: 'Where the pools live', run: () => goto('sheet') },
  track: { label: 'Open the Journal', run: () => goto('journal') },

  endScene: {
    label: 'End the scene',
    run: async () => {
      if (!listCharacters().length) { showToast('Make a character first'); return; }
      if (!await confirmModal('End the scene? Momentum drops, temporary assets expire, and Resist Defeat resets.',
        { okLabel: 'End scene' })) return;
      const r = endScene();
      Settings.markPlayStep('endScene');
      const close = modal([
        el('h3', {}, 'Scene ended'),
        el('ul', { class: 'small' }, ...r.summary.map((line) => el('li', {}, line))),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn secondary', onclick: () => { close(); r.undo(); showToast('Undone'); refresh(); } }, 'Undo'),
          el('button', { class: 'btn', onclick: () => { close(); refresh(); } }, 'Done')),
      ]);
    },
  },

  backup: {
    label: 'Export a backup',
    run: () => {
      const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `imperium-backup-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
      Settings.markPlayStep('save');
      showToast('Backup downloaded'); refresh();
    },
  },

  endAdventure: {
    label: 'End the adventure',
    run: async () => {
      if (!listCharacters().length) { showToast('Make a character first'); return; }
      if (!await confirmModal('End the adventure? Determination resets, challenged statements recover, and everyone may buy one advance.',
        { okLabel: 'End adventure' })) return;
      const r = endAdventure();
      Settings.markPlayStep('endAdventure');
      const close = modal([
        el('h3', {}, 'Adventure ended'),
        el('ul', { class: 'small' }, ...r.summary.map((line) => el('li', {}, line))),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn secondary', onclick: () => { close(); r.undo(); showToast('Undone'); refresh(); } }, 'Undo'),
          el('button', { class: 'btn', onclick: () => { close(); refresh(); } }, 'Done')),
      ]);
    },
  },

  advance: { label: 'Open advancement', run: () => { showToast('Advancement is on your sheet'); goto('sheet'); } },
};

// ---------- rendering ----------
const PHASE_ICON = { start: 'dune', sustain: 'd20', end: 'hourglass' };

/** Small SVG progress ring with the "done/total" count in the centre. */
function progressRing(done, total) {
  const r = 15, c = 2 * Math.PI * r, frac = total ? done / total : 0;
  const wrap = el('span', { class: 'ring', role: 'img', 'aria-label': `${done} of ${total} done` });
  wrap.innerHTML = `<svg viewBox="0 0 36 36" width="40" height="40" aria-hidden="true">
    <circle cx="18" cy="18" r="${r}" class="ring-track"/>
    <circle cx="18" cy="18" r="${r}" class="ring-fill" stroke-dasharray="${(c * frac).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 18 18)"/>
    <text x="18" y="21.5" text-anchor="middle" class="ring-text">${done}/${total}</text></svg>`;
  return wrap;
}
function stepRow(step) {
  const done = isDone(step);
  const act = step.action ? ACTIONS[step.action] : null;
  const proven = provenByApp(step);

  const tick = el('button', {
    class: 'play-tick' + (done ? ' done' : ''),
    'aria-label': done ? `Mark "${step.title}" not done` : `Mark "${step.title}" done`,
    disabled: proven ? '' : null,
    title: proven ? 'The app can see you have done this' : 'Tick when you have done this',
    onclick: () => {
      if (proven) return;
      done ? Settings.unmarkPlayStep(step.id) : Settings.markPlayStep(step.id);
      refresh();
    },
  }, done ? '✓' : '');

  return el('li', { class: 'play-step' + (done ? ' done' : '') },
    tick,
    el('div', { class: 'play-body' },
      el('div', { class: 'play-title' }, step.title),
      el('p', { class: 'small muted' }, step.text),
      act ? el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', onclick: act.run }, act.label)) : null));
}

function phaseCard(phase) {
  const total = phase.steps.length;
  const done = phase.steps.filter(isDone).length;
  return el('section', { class: 'card' },
    el('div', { class: 'section-head' },
      el('h3', { class: 'phase-title' }, el('span', { class: 'phase-medal' }, icon(PHASE_ICON[phase.id] || 'play', { size: 18 })), phase.title),
      progressRing(done, total)),
    el('p', { class: 'small muted' }, phase.lead),
    el('ul', { class: 'play-list' }, ...phase.steps.map(stepRow)));
}

function build(root) {
  const g = HELP.playGuide;
  root.append(
    el('p', { class: 'screen-lead small muted' }, g.intro),
    ...g.phases.map(phaseCard),
    // Audit 2: Reset is a quiet chip at the foot, not a button competing with the guide.
    el('div', { class: 'foot-actions' },
      el('button', { class: 'chip', onclick: async () => {
        if (!await confirmModal('Clear the ticks on this guide? Nothing else is affected.', { okLabel: 'Reset' })) return;
        Settings.resetPlayGuide(); showToast('Guide reset'); refresh();
      } }, icon('undo', { size: 14 }), 'Reset my progress')),
  );
}

export function renderPlay(root) {
  mountRoot = root;
  build(root);
}
