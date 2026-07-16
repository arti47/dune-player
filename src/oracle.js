// oracle.js — Floating "oracle" idea generator (homebrew, gated by Settings.oracle()).
//
// A global FAB (above the bottom nav) opens a modal that rolls a d100 on each of the four ORACLE
// tables → one word each → a 4-word spark for solo play / GM prep. Reroll-all, Copy, and Append to
// the last-opened character's notes. NOT official rules (labeled in-UI) — see data-oracle.js.

import { el, dN } from './core.js';
import { ORACLE } from '../data-oracle.js';
import { Settings } from './settings.js';
import { modal, showToast } from './ui.js';
import { appendToLatestEntry } from './store.js';

function rollTable(t) { return t.words[dN(100) - 1]; }
function rollAll() { return ORACLE.tables.map((t) => ({ id: t.id, label: t.label, word: rollTable(t) })); }

function labeledLine(rolls) {
  return 'Oracle — ' + rolls.map((r) => `${r.label}: ${r.word}`).join(' · ');
}

function openOracle() {
  let rolls = rollAll();
  const box = el('div', { class: 'oracle-modal' });

  function addToJournal() {
    const e = appendToLatestEntry(labeledLine(rolls), { newTitle: 'Meaning Tables' });
    showToast(e.body.includes('\n') ? 'Added to latest entry' : 'Logged as entry');
  }
  function copy() {
    try { navigator.clipboard?.writeText(labeledLine(rolls)); } catch {}
    showToast('Copied');
  }

  function closePop() {
    box.querySelector('.oracle-pop')?.remove();
    document.removeEventListener('click', onDocClick, true);
  }
  function onDocClick() { closePop(); }
  function showDef(anchor, word) {
    closePop();
    const def = ORACLE.loreDefs[word];
    if (!def) return;
    const pop = el('div', { class: 'oracle-pop', role: 'tooltip' }, def);
    box.append(pop);
    const a = anchor.getBoundingClientRect(), b = box.getBoundingClientRect();
    pop.style.left = Math.max(6, Math.min(a.left - b.left, box.clientWidth - pop.offsetWidth - 6)) + 'px';
    pop.style.top = (a.bottom - b.top + 6) + 'px';
    // Tap anywhere dismisses (capture so the same click that opened it doesn't immediately close).
    setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
  }

  function wordValue(r) {
    if (r.id === 'lore' && ORACLE.loreDefs[r.word]) {
      const btn = el('button', { class: 'oracle-word-val oracle-lore-btn', title: 'Tap for a definition' }, r.word);
      btn.addEventListener('click', (e) => { e.stopPropagation(); showDef(btn, r.word); });
      return btn;
    }
    return el('div', { class: 'oracle-word-val' }, r.word);
  }

  function draw() {
    closePop();
    box.replaceChildren(
      el('h3', {}, 'Meaning Tables'),
      el('p', { class: 'small muted' }, ORACLE.note),
      el('div', { class: 'oracle-words' },
        ...rolls.map((r) => el('div', { class: 'oracle-word' },
          el('div', { class: 'small muted' }, r.label),
          wordValue(r)))),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: () => { rolls = rollAll(); draw(); } }, 'Reroll'),
        el('button', { class: 'btn secondary', onclick: copy }, 'Copy'),
        el('button', { class: 'btn secondary', onclick: addToJournal }, 'Add to latest entry')));
  }
  draw();
  modal(box);
}

let fab = null;

/** Create the FAB (once) and keep its visibility in sync with the oracle toggle. */
export function initOracle() {
  fab = el('button', {
    class: 'oracle-fab', 'aria-label': 'Open the Meaning Tables idea generator', title: 'Meaning Tables',
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
