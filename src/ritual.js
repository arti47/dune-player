// ritual.js — the full-screen roll ritual (Play redesign, 2026-10-07).
//
// Three big-tile steps instead of dropdowns: what you are doing (skill) → why it matters (drive,
// with the statement that backs it) → how hard (Difficulty) and whether a focus applies. Then the
// real roll dialog takes over, already rolled, so every rule (crits, complications, Momentum,
// Determination re-rolls, talents, succeed at a cost) runs through the one engine in roller.js.
// "More options" opens the same dialog unrolled, with the choices filled in.

import { el } from './core.js';
import { icon } from './icons.js';
import { modal } from './ui.js';
import { openRollDialog } from './roller.js';
import { driveName } from './content.js';
import { DATA } from '../data.js';
import { Settings } from './settings.js';

const SKILL_ICO = { battle: 'swords', communicate: 'group', discipline: 'shield', move: 'up', understand: 'compass' };

// Novice level: one plain line under each step's heading.
const GUIDE = [
  'Pick the kind of thing you are attempting. The number is your skill.',
  'Pick the reason it matters to you. Your target number is skill + drive: each die at or under it succeeds.',
  'The GM says how many successes you need. A focus makes more dice count double.',
];

export function openRollRitual(c, onDone = null) {
  if (!c) return;
  // Veteran level: straight to the full roll dialog.
  if (Settings.level() === 'veteran') { openRollDialog(c, onDone); return; }
  const st = { step: 0, skill: null, drive: null, difficulty: 1, focus: false };
  const body = el('div', { class: 'ritual' });
  let close = () => {};
  const drives = () => Object.keys(c.drives || {}).sort((a, b) => c.drives[b] - c.drives[a]);
  const focusesFor = (sid) => (c.focuses || []).filter((f) => f.skill === sid);

  const head = (title, n) => el('div', { class: 'ritual-head' },
    el('div', { class: 'ritual-dots', 'aria-hidden': 'true' }, ...[0, 1, 2].map((k) => el('i', { class: k === n ? 'on' : k < n ? 'done' : '' }))),
    el('h2', { id: 'ritual-title' }, title),
    Settings.level() === 'novice' ? el('p', { class: 'small muted ritual-guide' }, GUIDE[n]) : null);
  const back = () => el('button', { class: 'chip', onclick: () => { st.step--; draw(); } }, icon('undo', { size: 14 }), 'Back');

  function stepSkill() {
    return [head('What are you doing?', 0),
      el('div', { class: 'ritual-grid' }, ...DATA.skills.map((s) => el('button', {
        class: 'ritual-tile', 'aria-label': `${s.name} ${c.skills[s.id]} — ${s.tag}`,
        onclick: () => { st.skill = s.id; st.focus = false; st.step = 1; draw(); } },
        el('span', { class: 'ritual-ico' }, icon(SKILL_ICO[s.id] || 'd20', { size: 22 })),
        el('strong', { class: 'ritual-num num' }, String(c.skills[s.id])),
        el('span', { class: 'ritual-name' }, s.name),
        el('span', { class: 'ritual-sub' }, s.tag))))];
  }

  function stepDrive() {
    const sk = c.skills[st.skill];
    return [head('Why does it matter?', 1),
      el('div', { class: 'ritual-list' }, ...drives().map((id) => {
        const s = c.driveStatements && c.driveStatements[id];
        const tag = (DATA.drives.find((d) => d.id === id) || {}).tag || '';
        return el('button', { class: 'ritual-row', onclick: () => { st.drive = id; st.step = 2; draw(); } },
          el('span', { class: 'ritual-row-tn' }, el('strong', { class: 'num' }, String(sk + c.drives[id])), el('span', {}, 'TN')),
          el('span', { class: 'ritual-row-text' },
            el('strong', {}, `${driveName(id)} ${c.drives[id]}`),
            s && s.text ? el('span', { class: 'small' + (s.challenged ? ' struck' : '') }, `“${s.text}”`)
              : el('span', { class: 'small muted' }, tag)));
      })),
      el('p', { class: 'small muted' }, 'Pick the drive that fits your motive.'),
      back()];
  }

  function stepDifficulty() {
    const sk = c.skills[st.skill], tn = sk + c.drives[st.drive];
    const fs = focusesFor(st.skill);
    const d = DATA.difficulty[st.difficulty];
    const pool = DATA.dicePool.base;
    const roll = (auto) => () => {
      close();
      openRollDialog(c, onDone, { skill: st.skill, drive: st.drive, difficulty: st.difficulty, focus: st.focus, autoRoll: auto });
    };
    return [head('How hard is it?', 2),
      el('div', { class: 'ritual-diff', role: 'radiogroup', 'aria-label': 'Difficulty' }, ...DATA.difficulty.map((x) =>
        el('button', { class: 'ritual-pip' + (x.value === st.difficulty ? ' on' : ''), role: 'radio',
          'aria-checked': x.value === st.difficulty ? 'true' : 'false', 'aria-label': `${x.value} ${x.name}`,
          onclick: () => { st.difficulty = x.value; draw(); } }, String(x.value)))),
      el('p', { class: 'ritual-diff-name' }, el('strong', {}, d.name), el('span', { class: 'small muted' }, ` — ${d.example}`)),
      fs.length ? el('button', { class: 'ritual-focus' + (st.focus ? ' on' : ''), 'aria-pressed': st.focus ? 'true' : 'false',
        onclick: () => { st.focus = !st.focus; draw(); } },
        icon(st.focus ? 'check' : 'target', { size: 16 }),
        el('span', {}, `Focus applies: ${fs.map((f) => f.name).join(' / ')}`),
        el('span', { class: 'small muted' }, `crits on ≤ ${sk}`)) : null,
      el('div', { class: 'ritual-sum' },
        el('span', {}, `${DATA.skills.find((s) => s.id === st.skill).name} ${sk} + ${driveName(st.drive)} ${c.drives[st.drive]}`),
        el('strong', { class: 'num' }, `TN ${tn} · ${pool}d20 · need ${st.difficulty}`)),
      el('button', { class: 'btn ritual-go', onclick: roll(true) }, icon('d20', { size: 24 }), ' Roll'),
      el('div', { class: 'ritual-foot' }, back(),
        el('button', { class: 'chip', onclick: roll(false) }, icon('plus', { size: 14 }), 'More options'))];
  }

  function draw() {
    const kids = [stepSkill, stepDrive, stepDifficulty][st.step]();
    body.replaceChildren(...kids.filter((k) => k != null));
    const first = body.querySelector('button.ritual-tile, button.ritual-row, .ritual-go');
    if (first) first.focus({ preventScroll: true });
  }
  draw();   // first step before the modal opens, so the dialog takes its name from the heading
  close = modal([body], { sheet: true, labelledBy: 'ritual-title' });
  return close;
}
