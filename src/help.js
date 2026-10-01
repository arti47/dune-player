// help.js — the one in-app guidance pattern used across every screen.
//
// Copy lives in data-help.js (app surfaces) and data-oracle.js `ORACLE.help` (the solo Journal).
// UI overhaul Stage 4: help is a small "?" button that opens a slide-up sheet with numbered steps
// and one worked example. Placed right after a card heading, the button docks into that heading
// (right-aligned); elsewhere it shows its label as a quiet text button.

import { el } from './core.js';
import { modal } from './ui.js';
import { HELP } from '../data-help.js';

/** Open the help sheet for a { steps, example, intro?, closing? } block.
 *  `extra(close)` returns nodes appended under the example (e.g. a hand-off button). */
export function openHelpSheet(block, label = 'How to use', extra = null) {
  let close = null;
  const done = () => close && close();
  close = modal([
    el('h2', {}, label),
    block.intro ? el('p', { class: 'small' }, block.intro) : null,
    el('ol', { class: 'small help-steps' }, ...block.steps.map((s) => el('li', {}, s))),
    block.example ? el('p', { class: 'small muted' }, el('strong', {}, 'Example: '), block.example) : null,
    block.closing ? el('p', { class: 'small muted' }, block.closing) : null,
    ...(extra ? [extra(done)].flat() : []),
    el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: done }, 'Got it')),
  ].filter((n) => n != null), { sheet: true });
  return close;
}

/** A "?" help button for a { steps, example } block. `extra(close)` adds nodes to the sheet. */
export function helpFrom(block, label = 'How to use', extra = null) {
  if (!block) return null;
  const btn = el('button', { type: 'button', class: 'help-btn', 'aria-label': `Help: ${label}`, title: label,
    onclick: (e) => { e.preventDefault(); e.stopPropagation(); openHelpSheet(block, label, extra); } },
  el('span', { class: 'help-q', 'aria-hidden': 'true' }, '?'),
  el('span', { class: 'help-label' }, label));
  // Dock into the heading it follows, so every card reads "Title …… ?".
  queueMicrotask(() => {
    const prev = btn.previousElementSibling;
    if (prev && /^H[2-4]$/.test(prev.tagName)) prev.append(btn);
  });
  return btn;
}

/** The help button for an app surface by its key in data-help.js. */
export function help(id, label = 'How to use') {
  return helpFrom(HELP[id], label);
}

/** Put a screen's "?" help in the app bar (audit 2: the screen name + help live in the top bar,
 *  not in a title card). The router clears the slot before each render. */
export function setAppHelp(btn) {
  const slot = typeof document !== 'undefined' && document.getElementById('app-help');
  if (!slot) return;
  slot.replaceChildren(...(btn ? [btn] : []));
}
