// oracle.js — Floating "oracle" idea generator (homebrew, gated by Settings.oracle()).
//
// A global FAB (above the bottom nav) opens a modal that rolls a d100 on each of the four ORACLE
// tables → one word each → a 4-word spark for solo play / GM prep. Reroll-all, Copy, and Append to
// the last-opened character's notes. NOT official rules (labeled in-UI) — see data-oracle.js.

import { el, dN } from './core.js';
import { ORACLE } from '../data-oracle.js';
import { Settings } from './settings.js';
import { modal, showToast } from './ui.js';
import { getCharacter, saveCharacter, currentCharacterId } from './store.js';

function rollTable(t) { return t.words[dN(100) - 1]; }
function rollAll() { return ORACLE.tables.map((t) => ({ label: t.label, word: rollTable(t) })); }

function labeledLine(rolls) {
  return 'Oracle — ' + rolls.map((r) => `${r.label}: ${r.word}`).join(' · ');
}

function openOracle() {
  let rolls = rollAll();
  const box = el('div', { class: 'oracle-modal' });

  function appendToNotes() {
    const id = currentCharacterId();
    const c = id && getCharacter(id);
    if (!c) { showToast('Open a character first'); return; }
    c.notes = (c.notes ? c.notes.replace(/\s*$/, '') + '\n' : '') + labeledLine(rolls);
    saveCharacter(c);
    showToast(`Added to ${c.identity?.name || 'character'} notes`);
  }
  function copy() {
    try { navigator.clipboard?.writeText(labeledLine(rolls)); } catch {}
    showToast('Copied');
  }

  function draw() {
    box.replaceChildren(
      el('h3', {}, 'Oracle'),
      el('p', { class: 'small muted' }, ORACLE.note),
      el('div', { class: 'oracle-words' },
        ...rolls.map((r) => el('div', { class: 'oracle-word' },
          el('div', { class: 'small muted' }, r.label),
          el('div', { class: 'oracle-word-val' }, r.word)))),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: () => { rolls = rollAll(); draw(); } }, 'Reroll'),
        el('button', { class: 'btn secondary', onclick: copy }, 'Copy'),
        el('button', { class: 'btn secondary', onclick: appendToNotes }, 'Add to notes')));
  }
  draw();
  modal(box);
}

let fab = null;

/** Create the FAB (once) and keep its visibility in sync with the oracle toggle. */
export function initOracle() {
  fab = el('button', {
    class: 'oracle-fab', 'aria-label': 'Open the oracle idea generator', title: 'Oracle',
    onclick: openOracle,
  }, '✦');
  document.body.append(fab);
  syncOracleFab();
  // Toggling the setting dispatches hashchange (see screens.js); re-check on every route.
  window.addEventListener('hashchange', syncOracleFab);
}

export function syncOracleFab() {
  if (fab) fab.hidden = !Settings.oracle();
}
