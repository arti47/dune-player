// cite.js — T38 rules citations. Every automated surface (roll results, defeat prompts,
// advancement) links to its rules-library entry. A citation link navigates to #/rules and
// asks renderRules to scroll the matching card into view and briefly highlight it.

import { el } from './core.js';

/** Stable card id from a rules-card title. */
export function slug(title) {
  return 'rule-' + String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

let pendingTarget = null;
/** Set the card the rules screen should focus on its next render. */
export function setCiteTarget(title) { pendingTarget = slug(title); }
/** Consume the pending target (renderRules calls this). */
export function takeCiteTarget() { const t = pendingTarget; pendingTarget = null; return t; }

/**
 * A small "ⓘ Rules" link to the named rules-library card. `title` must match the card's
 * title exactly. `closeFn` (optional) closes an open modal before navigating.
 */
export function cite(title, closeFn = null) {
  return el('a', {
    class: 'cite', href: '#/rules', title: `Rules: ${title}`,
    'aria-label': `Rules reference: ${title}`,
    onclick: () => { setCiteTarget(title); if (closeFn) closeFn(); },
  }, 'ⓘ');
}
