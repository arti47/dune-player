// palette.js — the app-bar search (2026-10-07). With the Library tab gone from the nav, one search
// box reaches everything: screens (Play, Character, House, GM, Settings, Rules, How to play,
// Tutorial…), quick actions (Roll, New character, End scene…) and every rules card by title.
// Picking a rules card opens it in the library; "Search the rules for …" runs a full-text search.

import { el } from './core.js';
import { icon } from './icons.js';
import { modal } from './ui.js';
import { Settings } from './settings.js';
import { setCiteId } from './cite.js';
import { ruleCardTitles, setRuleQuery } from './screens.js';
import { listCharacters, currentCharacterId } from './store.js';
import { startCharacterWizard, openPregenPicker, startRandomCharacter } from './wizard.js';
import { openRollRitual } from './ritual.js';
import { runLifecycle } from './combat.js';

const go = (id) => () => { location.hash = `#/${id}`; };
// Open the rules screen exactly once (setting an unchanged hash fires no hashchange, so re-dispatch only then).
const toRules = () => { if (location.hash === '#/rules') window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#/rules'; };

/** Everything the palette can reach (screens + actions), filtered by toggles. */
export function paletteEntries() {
  const c = () => { const all = listCharacters(); return all.find((x) => x.id === currentCharacterId()) || all[0]; };
  return [
    ['d20', 'Play — story feed', go('home')],
    ['person', 'Character sheet', go('sheet')],
    ['hourglass', 'Extended tasks', go('tasks')],
    ['swords', 'Conflict', go('conflict')],
    Settings.journal() ? ['scroll', 'Journal (solo)', go('journal')] : null,
    Settings.greatGame() ? ['house', 'House management', go('house')] : null,
    Settings.gmScreen() ? ['gm', 'GM screen', go('gm')] : null,
    ['rules', 'Rules library', go('rules')],
    ['play', 'How to play', go('play')],
    ['star', 'Tutorial — learn to play', go('tutorial')],
    ['settings', 'Settings', go('settings')],
    ['person', 'Prep — characters, House, settings', go('prep')],
    ['d20', 'Roll a test', () => { const x = c(); if (x) openRollRitual(x); }],
    ['plus', 'New character', startCharacterWizard],
    ['star', 'Play an iconic character', openPregenPicker],
    ['d20', 'Random character', startRandomCharacter],
    ['hourglass', 'End scene', () => runLifecycle('scene', () => window.dispatchEvent(new HashChangeEvent('hashchange')))],
  ].filter(Boolean).map(([ico, label, run]) => ({ ico, label, run }));
}

export function openPalette() {
  const input = el('input', { type: 'search', placeholder: 'Search screens, actions and rules…', 'aria-label': 'Search' });
  const list = el('ul', { class: 'palette-list', role: 'listbox' });
  let rules = null;
  const close = modal([el('h2', { class: 'sr-only' }, 'Search'), input, list], { sheet: true });
  const row = (ico, label, sub, run) => el('li', {}, el('button', { class: 'palette-row', onclick: () => { close(); run(); } },
    el('span', { class: 'palette-ico' }, icon(ico, { size: 18 })), el('span', { class: 'palette-label' }, label),
    sub ? el('span', { class: 'small muted' }, sub) : null));
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const hit = (t) => !q || t.toLowerCase().includes(q);
    const entries = paletteEntries().filter((e) => hit(e.label)).slice(0, q ? 8 : 12);
    if (q && !rules) rules = ruleCardTitles();
    const ruleHits = q ? rules.filter((r) => hit(r.title)).slice(0, 8) : [];
    list.replaceChildren(...[
      ...entries.map((e) => row(e.ico, e.label, null, e.run)),
      ...ruleHits.map((r) => row('rules', r.title, 'Rule', () => { setCiteId(r.id); toRules(); })),
      q ? row('target', `Search the rules for “${input.value.trim()}”`, null, () => { setRuleQuery(input.value.trim()); toRules(); }) : null,
    ].filter(Boolean));
  };
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = list.querySelector('button'); if (b) b.click(); } });
  draw();
  setTimeout(() => input.focus(), 50);
}
