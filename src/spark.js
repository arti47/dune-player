// spark.js — a die button beside a text field that rolls an idea into it.
//
// Book tables first (Story Hook columns, complication examples, ambition themes, reputation
// examples); the homebrew Meaning Tables and name lists from data-oracle.js add flavour and are
// labelled as homebrew where they appear. No rules live here.
//
// Tap behaviour: an empty field is filled. Tapping again while the field still holds the rolled
// text either adds homebrew words (scene fields, "book first, then words") or rolls afresh. If you
// have written your own text, the roll appears under the field as a suggestion with Use / Add /
// another roll, so your writing is never overwritten.

import { el } from './core.js';
import { icon } from './icons.js';
import { DATA } from '../data.js';
import { ORACLE } from '../data-oracle.js';

const pick = (list, rng = Math.random) => list[Math.floor(rng() * list.length)];
const words = (id) => ORACLE.tables.find((t) => t.id === id).words;
const low = (s) => s.toLowerCase();
const hook = (col, rng) => pick(DATA.storyHooks.columns[col], rng);
const plotGoal = (rng) => `${hook('plot', rng).replace(/…$/, '')} ${hook('goal', rng)}`;
const homebrewName = (rng) => `${pick(ORACLE.randomCharacter.first, rng)} ${pick(ORACLE.randomCharacter.family, rng)}`;

/** Ambition themes for a drive, split from the book's guidance line. */
export function ambitionThemes(driveId) {
  return (DATA.creationGuidance.ambitionByDrive[driveId] || '').replace(/\.$/, '').split('·')
    .map((t) => t.trim().replace(/^or\s+/i, '')).filter(Boolean);
}

/** Complication examples for a skill; Move/Understand have none in the source, so the book's
 *  examples for the other skills are offered instead. */
export function complicationExamples(skill) {
  const by = DATA.complications.examplesBySkill;
  return (by[skill] && by[skill].length) ? by[skill] : Object.values(by).flat();
}

/** Generators: { roll(rng, ctx) → text, more?(text, rng, ctx) → text }. */
export const SPARKS = {
  where: { roll: (r) => hook('location', r), more: (t, r) => `${t} — ${low(pick(words('descriptor'), r))}` },
  who: { roll: (r) => { const [n, ...role] = hook('character', r).split(', '); return role.length ? `${n} (${role.join(', ')})` : n; }, more: (t, r) => `${t} — ${low(pick(words('descriptor'), r))}` },
  stakes: { roll: (r) => plotGoal(r), more: (t, r) => `${t} — ${pick(words('lore'), r)}` },
  action: { roll: (r) => `${low(pick(words('action'), r))} — ${low(pick(words('descriptor'), r))}` },
  story: { roll: (r) => `${pick(words('action'), r)}, ${low(pick(words('descriptor'), r))} — ${low(pick(words('event'), r))}` },
  complication: { roll: (r, ctx = {}) => pick(complicationExamples(ctx.skill), r) },
  thread: { roll: (r) => plotGoal(r) },
  npc: { roll: (r) => homebrewName(r), more: (t, r) => `${t} — ${hook('character', r).split(', ').slice(1).join(', ')}` },
  place: { roll: (r) => hook('location', r), more: (t, r) => `${t} — ${low(pick(words('descriptor'), r))}` },
  charName: { roll: (r) => homebrewName(r) },
  personality: { roll: (r) => pick(ORACLE.randomCharacter.personality, r) },
  ambition: { roll: (r, ctx = {}) => { const t = pick(ambitionThemes(ctx.drive), r) || ''; return t.charAt(0).toUpperCase() + t.slice(1); } },
  appearance: { roll: (r) => { const [a, b] = [pick(words('descriptor'), r), pick(words('descriptor'), r)]; return `${a}, ${low(b)}`; } },
  houseName: { roll: (r) => `House ${pick(ORACLE.house.names, r)}` },
  world: { roll: (r) => pick(ORACLE.house.worlds, r) },
  crest: { roll: (r) => pick(ORACLE.house.crests, r) },
  colours: { roll: (r) => { const a = pick(ORACLE.house.colours, r); let b = a; while (b === a) b = pick(ORACLE.house.colours, r); return `${a} & ${b}`; } },
  reputation: { roll: (r) => pick(DATA.houseTraits.reputationExamples, r) },
};

/** Pure tap step: what the field should hold next, or a suggestion to show instead. */
export function sparkStep(kind, value, last, ctx = {}, rng = Math.random) {
  const g = SPARKS[kind];
  const v = String(value || '').trim();
  if (!v) { const t = g.roll(rng, ctx); return { fill: t, last: { text: t, stage: 'roll' } }; }
  if (last && v === last.text) {
    if (g.more && last.stage === 'roll') { const t = g.more(v, rng, ctx); return { fill: t, last: { text: t, stage: 'more' } }; }
    const t = g.roll(rng, ctx); return { fill: t, last: { text: t, stage: 'roll' } };
  }
  return { suggest: g.roll(rng, ctx) };
}

/** Wrap an input/textarea with a die button. `ctx` may be a function (read at tap time). */
export function withSpark(input, kind, ctx = {}, label = 'Roll an idea') {
  let last = null;
  const slot = el('div', { class: 'spark-slot', 'aria-live': 'polite' });
  const set = (text) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const btn = el('button', { type: 'button', class: 'spark-btn', 'aria-label': label, title: label, onclick: (e) => {
    e.preventDefault(); e.stopPropagation();
    const step = sparkStep(kind, input.value, last, typeof ctx === 'function' ? ctx() : ctx);
    if (step.fill != null) { last = step.last; set(step.fill); slot.replaceChildren(); return; }
    slot.replaceChildren(el('div', { class: 'spark-sugg' },
      el('span', { class: 'spark-text' }, step.suggest),
      el('button', { type: 'button', class: 'chip', onclick: () => { last = { text: step.suggest, stage: 'roll' }; set(step.suggest); slot.replaceChildren(); } }, 'Use'),
      el('button', { type: 'button', class: 'chip', onclick: () => { const t = `${input.value.trim()}${input.tagName === 'TEXTAREA' ? '\n' : ' — '}${step.suggest}`; last = null; set(t); slot.replaceChildren(); } }, 'Add'),
      el('button', { type: 'button', class: 'chip chip-icon', 'aria-label': 'Dismiss', onclick: () => slot.replaceChildren() }, icon('close', { size: 14 }))));
  } }, icon('d20', { size: 18 }));
  return el('div', { class: 'spark-field' }, el('div', { class: 'spark-row' }, input, btn), slot);
}
