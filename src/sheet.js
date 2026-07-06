// sheet.js — character list + (Phase 2) full live sheet. For now: list + wizard entry;
// a quick read-only summary of the current character so creation is verifiable end-to-end.

import { el, capitalize } from './core.js';
import { listCharacters, currentCharacterId, setCurrentCharacterId } from './store.js';
import { startCharacterWizard, openPregenPicker } from './wizard.js';
import { DATA } from '../data.js';

const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const DRIVE_NAME = Object.fromEntries(DATA.drives.map((d) => [d.id, d.name]));

const SOURCE_LABELS = { archetype: 'archetype', faction: 'faction', finishing: 'reputation' };
const sourceLabel = (src) => SOURCE_LABELS[src] || src;

export function renderSheet(root) {
  const chars = listCharacters();
  const currentId = currentCharacterId();
  const current = chars.find((c) => c.id === currentId) || chars[0] || null;

  root.append(
    el('section', { class: 'card' },
      el('h2', {}, 'Characters'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: startCharacterWizard }, '+ New character'),
        el('button', { class: 'btn secondary', onclick: openPregenPicker }, 'Play an iconic')),
      chars.length
        ? el('ul', { class: 'char-list' }, ...chars.map((c) =>
            el('li', {},
              el('button', { class: 'link-btn', onclick: () => { setCurrentCharacterId(c.id); root.replaceChildren(); renderSheet(root); } },
                c.identity.name || 'Unnamed'),
              c.id === (current && current.id) ? el('span', { class: 'tag' }, 'active') : null)))
        : el('p', { class: 'muted' }, 'No characters yet.')),
  );

  if (current) root.append(characterSummary(current));
  else root.append(el('section', { class: 'card' },
    el('p', { class: 'small muted' }, 'Create a character to see the full sheet (live editing arrives in Phase 2).')));
}

function characterSummary(c) {
  const stat = (name, val) => el('div', { class: 'stat-chip' }, el('span', {}, name), el('strong', {}, String(val)));
  const id = c.identity;
  return el('section', { class: 'card' },
    el('h3', {}, id.name || 'Unnamed'),
    el('p', { class: 'small muted' },
      [id.archetype && capitalize(id.archetype), id.factionTemplate && capitalize(id.factionTemplate)]
        .filter(Boolean).join(' · ') || 'Character'),

    el('h4', {}, 'Skills'),
    el('div', { class: 'stat-grid' }, ...DATA.skills.map((s) => stat(s.name, c.skills[s.id]))),

    el('h4', {}, 'Drives'),
    el('div', { class: 'stat-grid' }, ...DATA.drives.map((d) => stat(d.name, c.drives[d.id]))),

    Object.keys(c.driveStatements || {}).length
      ? el('div', {}, el('h4', {}, 'Statements'),
          el('ul', {}, ...Object.entries(c.driveStatements).map(([d, s]) =>
            el('li', { class: 'small' }, el('strong', {}, DRIVE_NAME[d] + ': '), s.text))))
      : null,

    el('h4', {}, 'Focuses'),
    el('p', { class: 'small' }, (c.focuses || []).map((f) => `${f.name} (${SKILL_NAME[f.skill]})`).join(', ') || '—'),

    el('h4', {}, 'Talents'),
    el('p', { class: 'small' }, (c.talents || []).map((t) => t.name).join(', ') || '—'),

    el('h4', {}, 'Traits'),
    (c.traits || []).length
      ? el('div', { class: 'trait-list' }, ...c.traits.map((t) =>
          el('span', { class: 'pill' }, t.name,
            t.source ? el('span', { class: 'trait-src' }, ` ${sourceLabel(t.source)}`) : null)))
      : el('p', { class: 'small' }, '—'),

    el('h4', {}, 'Assets'),
    el('p', { class: 'small' }, (c.assets || []).map((a) => `${a.name}${a.quality ? ` (Q${a.quality})` : ''}`).join(', ') || '—'),

    el('div', { class: 'stat-grid' },
      stat('Determination', c.determination),
      id.ambition ? el('div', { class: 'stat-chip wide' }, el('span', {}, 'Ambition'), el('strong', {}, id.ambition)) : null),

    id.appearance || id.relationships
      ? el('div', {},
          el('h4', {}, 'Details'),
          id.appearance ? el('p', { class: 'small' }, el('strong', {}, 'Appearance: '), id.appearance) : null,
          id.relationships ? el('p', { class: 'small' }, el('strong', {}, 'Relationships: '), id.relationships) : null)
      : null,

    el('p', { class: 'small muted' }, 'Live editing, in-play trackers, and the dice roller arrive in Phases 2–3.'),
  );
}
