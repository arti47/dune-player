// help.js — the one "How to use" accordion used across every screen.
//
// Copy lives in data-help.js (app surfaces) and data-oracle.js `ORACLE.help` (the solo Journal).
// Rendering is identical everywhere: a collapsed <details> with numbered steps and one worked
// example, so a first-time player can open any card and learn what it is for without leaving it.

import { el } from './core.js';
import { HELP } from '../data-help.js';

/** Render a collapsed help accordion from a { steps, example } block. */
export function helpFrom(block, label = 'How to use') {
  if (!block) return null;
  return el('details', { class: 'help-acc' },
    el('summary', {}, label),
    el('ol', { class: 'small' }, ...block.steps.map((s) => el('li', {}, s))),
    block.example ? el('p', { class: 'small muted' }, el('strong', {}, 'Example: '), block.example) : null);
}

/** Render the help for an app surface by its key in data-help.js. */
export function help(id, label = 'How to use') {
  return helpFrom(HELP[id], label);
}
