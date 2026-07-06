// gm.js — GM dashboard: party panel, peek sheets, Threat pool, drop-in NPCs,
// rollable story-hook/enemy tables. Lands in Phase 6 (toggle-gated).

import { el } from './core.js';

export function renderGM(root) {
  root.append(
    el('section', { class: 'card' },
      el('h2', {}, 'GM Screen'),
      el('p', { class: 'muted' }, 'The GM dashboard arrives in Phase 6. Toggle found in Settings.')),
  );
}
