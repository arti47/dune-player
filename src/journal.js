// journal.js — Solo-play Journal (gated by Settings.journal(), global/device-wide).
//
// Laid out as the solo play loop, top to bottom:
//   1. Scene       — Chaos Factor · frame the scene · scene check (expected/altered/interrupted,
//                    interrupted rolls a random event) · play notes · End scene (adjusts Chaos,
//                    logs an entry, clears the pad)
//   2. Oracle      — in-scene yes/no questions, odds shifted by the current Chaos Factor
//   3. Entries     — the running log (with a folded-in "New entry" composer)
//   4. Threads     — open plot questions to chase
//   5. NPCs/places — who and what you've met
// Not rules content — a homebrew play aid. Persists immediately + rides the JSON backup.

import { el, uid, dN } from './core.js';
import {
  getJournal, saveJournal, addJournalEntry, appendToSceneNotes, setChaos, clampChaos,
  listCharacters, currentCharacterId, getCharacter, getRollLog,
} from './store.js';
import { promptModal, showToast, modal, undoToast } from './ui.js';
import { ORACLE } from '../data-oracle.js';
import { poolsHeader } from './sheet.js';
import { openOracle } from './oracle.js';
import { Settings } from './settings.js';
import { endScene as endGameScene } from './combat.js';
import { hookCard, npcCard } from './gm.js';
import { helpFrom, setAppHelp } from './help.js';
import { icon, pips, emptyState, dial } from './icons.js';

/** "?" help for a section — shared renderer, solo copy from ORACLE.help. */
function helpBlock(id, label = 'How to use') {
  return helpFrom(ORACLE.help.sections[id], label);
}

/** The whole solo loop, as the Journal heading's "?" sheet. */
function overviewBlock() {
  const o = ORACLE.help.overview;
  return helpFrom(o, o.title, (close) => el('div', { class: 'cta-row' },
    el('button', { class: 'btn secondary', onclick: () => { close(); location.hash = '#/tutorial'; } },
      'Walk me through it')));
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return new Date(ts).toISOString(); }
}

/** The character currently in play (the one the Sheet has open), or null. */
function activeCharacter() {
  const id = currentCharacterId();
  return (id && getCharacter(id)) || listCharacters()[0] || null;
}

export function renderJournal(root) {
  const draw = () => {
    const j = getJournal();
    const c = activeCharacter();
    root.replaceChildren();
    setAppHelp(overviewBlock());
    root.append(...[
      // Momentum/Threat/Determination stay on screen: solo, you spend both sides mid-scene (S3).
      c ? poolsHeader(c, draw) : null,
      el('p', { class: 'screen-lead small muted' },
        'Solo play, in order: frame a scene, check it against Chaos, play it with the oracle, then end the scene and log it.'),
      sceneCard(j, c, draw),
      consultCard(j, draw),
      entriesCard(j, draw),
      threadsCard(j, draw),
      contactsCard(j, draw),
      gmToolsCard(),
    ].filter((n) => n != null));
  };
  draw();
}

// Long-tail cards (Entries, Threads, NPCs & places, Opposition) fold to a one-line header with
// a count, so Scene + Oracle — the live loop — stay on screen. Open state lasts the session.
const openCards = new Set();
function collapseCard(key, title, helpNode, ...body) {
  const d = el('details', { class: 'card collapse-card' },
    el('summary', {}, el('h3', {}, title), helpNode),
    ...body.filter((n) => n != null));
  d.open = openCards.has(key);
  d.addEventListener('toggle', () => { d.open ? openCards.add(key) : openCards.delete(key); });
  return d;
}

// ---------- GM material a solo player needs without enabling the GM screen (S5) ----------
function gmToolsCard() {
  return collapseCard('gm', '6 · Opposition & sparks', null,
    el('p', { class: 'small muted' },
      'Solo you are the GM too: pull a stat block for whoever opposes you, or roll a story hook when you need a scene from nothing.'),
    el('details', { class: 'disclose' },
      el('summary', {}, 'Story hook generator'), hookCard()),
    el('details', { class: 'disclose' },
      el('summary', {}, 'NPC compendium'), npcCard()));
}

// ---------- Pure solo-engine helpers (unit-tested) ----------

/** Scene check: d10 vs Chaos. Higher than Chaos = as framed; else odd interrupts, even alters. */
export function sceneCheck(chaos, roll) {
  if (roll > chaos) return 'expected';
  return roll % 2 === 1 ? 'interrupted' : 'altered';
}

/** End-of-scene Chaos move: in control lowers it, out of control raises it. */
export function chaosAfterScene(chaos, inControl) {
  return clampChaos(chaos + (inControl ? -1 : 1));
}

/** Yes-chance for a tier at the current Chaos Factor (linear shift around the pivot). */
export function yesChanceFor(tierYes, chaos) {
  const c = ORACLE.chaos;
  const shifted = tierYes + (chaos - c.pivot) * c.oddsShiftPerStep;
  return Math.max(c.minChance, Math.min(c.maxChance, shifted));
}

/** Map a d100 roll onto the event-focus table. */
export function focusForRoll(roll) {
  return ORACLE.eventFocus.find((f) => roll <= f.max) || ORACLE.eventFocus[ORACLE.eventFocus.length - 1];
}

const pick = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
const wordFrom = (id) => {
  const t = ORACLE.tables.find((x) => x.id === id);
  return t.words[dN(100) - 1];
};

/** Roll a full random event: focus + whatever it pulls from the journal + two meaning words. */
function rollEvent(j) {
  const roll = dN(100);
  const focus = focusForRoll(roll);
  let subject = null;
  if (focus.pull === 'thread') subject = (pick(j.threads.filter((t) => t.status !== 'resolved')) || {}).title || null;
  if (focus.pull === 'contact') subject = (pick(j.contacts) || {}).name || null;
  return { roll, focus, subject, words: [wordFrom('action'), wordFrom('descriptor')] };
}

function eventLine(ev) {
  const subj = ev.subject ? ` (${ev.subject})` : '';
  return `Event — ${ev.focus.label}${subj} · ${ev.words.join(' / ')}`;
}

/** One-line summary of a roll-log entry, for pasting into scene notes (S2). */
export function rollLine(r) {
  if (!r) return null;
  const bits = [`${r.skill}+${r.drive} TN ${r.tn}`, `[${(r.dice || []).join(',')}]`,
    `${r.successes} success${r.successes === 1 ? '' : 'es'}`];
  if (r.complications) bits.push(`${r.complications} complication${r.complications === 1 ? '' : 's'}`);
  if (r.momentumDelta) bits.push(`${r.momentumDelta > 0 ? '+' : ''}${r.momentumDelta} Momentum`);
  if (r.threatDelta) bits.push(`${r.threatDelta > 0 ? '+' : ''}${r.threatDelta} Threat`);
  return `Roll — ${r.characterName ? r.characterName + ': ' : ''}${bits.join(' · ')}`;
}

// ---------- 1. Scene (Chaos · frame · check · play · roll · end) ----------
function sceneCard(j, character, draw) {
  const setup = el('textarea', { rows: '2', placeholder: 'Frame the scene you expect: where, when, who, what’s at stake…', 'aria-label': 'Scene setup' });
  setup.value = j.scene.setup || '';
  const notes = el('textarea', { rows: '4', placeholder: 'What actually happens as you play it out…', 'aria-label': 'Scene notes' });
  notes.value = j.scene.notes || '';
  const save = () => { const cur = getJournal(); cur.scene = { setup: setup.value, notes: notes.value }; saveJournal(cur); };
  setup.addEventListener('input', save);
  notes.addEventListener('input', save);

  const chaosPill = el('span', { class: 'pill chaos-pill' }, icon('chaos', { size: 14 }), ` Chaos ${j.chaos}`);
  const step = (delta) => () => { setChaos(j.chaos + delta); draw(); };
  const out = el('div', { class: 'oracle-answer', 'aria-live': 'polite' });

  function runCheck() {
    const roll = dN(10);
    const outcome = sceneCheck(j.chaos, roll);
    const o = ORACLE.chaos.outcomes[outcome];
    const ev = outcome === 'interrupted' ? rollEvent(j) : null;
    out.replaceChildren(
      el('div', { class: 'oracle-answer-val' + (outcome === 'expected' ? ' yes' : ' no') }, o.label),
      el('div', { class: 'small muted' }, `d10 ${roll} vs Chaos ${j.chaos} · ${o.desc}`),
      ev ? el('div', { class: 'small' }, el('strong', {}, ev.focus.label),
        ev.subject ? ` — ${ev.subject}` : '', ` · ${ev.words.join(' / ')}`) : null,
      ev ? el('div', { class: 'small muted' }, ev.focus.desc) : null,
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', onclick: () => {
          const line = `Scene check — ${o.label} [d10 ${roll} vs Chaos ${j.chaos}]` + (ev ? `\n${eventLine(ev)}` : '');
          appendToSceneNotes(line); showToast('Added to scene'); draw();
        } }, 'Add to scene')));
  }

  // Three-way on purpose: dismissing the dialog must NOT silently pick a Chaos move.
  function askInControl() {
    return new Promise((resolve) => {
      let done = false;
      const answer = (v) => () => { done = true; close(); resolve(v); };
      const close = modal([
        el('h3', {}, 'End of scene'),
        el('p', {}, 'Were you in control as the scene ended? In control lowers Chaos; out of control raises it.'),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn secondary', onclick: answer(null) }, 'Cancel'),
          el('button', { class: 'btn secondary', onclick: answer(false) }, 'Not in control (+1)'),
          el('button', { class: 'btn', onclick: answer(true) }, 'In control (−1)')),
      ], { onClose: () => { if (!done) resolve(null); } });
    });
  }

  // ONE end-of-scene action (S1): runs the §3.17 rules bundle (Momentum −1, temp assets expire,
  // Resist Defeat reset) AND the solo bookkeeping (Chaos move, entry, clear the pad), with a single
  // summary + one Undo that rolls back both halves.
  async function endScene() {
    if (!setup.value.trim() && !notes.value.trim()) { showToast('Scene is empty'); return; }
    const inControl = await askInControl();
    if (inControl == null) return;

    const journalBefore = getJournal();
    const next = chaosAfterScene(j.chaos, inControl);
    const rules = endGameScene();                       // §3.17 bundle + its own undo
    const body = [setup.value.trim(), notes.value.trim()].filter(Boolean).join('\n\n')
      + `\n\n[Chaos ${j.chaos} → ${next}]`;
    addJournalEntry({ title: 'Scene', body });
    const cur = getJournal();
    cur.scene = { setup: '', notes: '' };
    cur.chaos = next;
    saveJournal(cur);

    const undo = () => {
      rules.undo();
      saveJournal(journalBefore);
      showToast('Scene end undone'); draw();
    };
    const close = modal([
      el('h3', {}, 'Scene ended'),
      el('ul', { class: 'small' },
        el('li', {}, `Chaos ${j.chaos} → ${next} (${inControl ? 'in control' : 'not in control'})`),
        el('li', {}, 'Logged as a journal entry; scene pad cleared'),
        ...rules.summary.map((line) => el('li', {}, line))),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => { close(); undo(); } }, 'Undo'),
        el('button', { class: 'btn', onclick: () => { close(); draw(); } }, 'Done')),
    ]);
  }

  return el('section', { class: 'card' },
    el('h3', {}, '1 · Scene'),
    helpBlock('scene'),
    // Audit 2: Chaos as a dial (cool → hot) with −/+ either side; the pill keeps the plain-text value.
    el('div', { class: 'chaos-row' },
      el('button', { class: 'step-btn big', 'aria-label': 'Lower Chaos Factor', onclick: step(-1) }, '−'),
      dial(j.chaos, { min: ORACLE.chaos.min, max: ORACLE.chaos.max, label: `Chaos Factor ${j.chaos} of ${ORACLE.chaos.max}`, caption: 'CHAOS' }),
      el('button', { class: 'step-btn big', 'aria-label': 'Raise Chaos Factor', onclick: step(1) }, '+')),
    el('div', { class: 'journal-meta chaos-meta' }, chaosPill),
    el('p', { class: 'small muted' }, ORACLE.chaos.note),
    el('label', { class: 'small muted' }, 'Frame the scene'), setup,
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: runCheck }, 'Scene check (d10)')),
    out,
    el('label', { class: 'small muted' }, 'Play it out'), notes,
    // Dice live in the loop (S2): the floating d20 rolls without leaving the tab; paste the result
    // into the notes. Meaning Tables (homebrew sparks) live here too, gated by their toggle.
    el('div', { class: 'cta-row' },
      Settings.oracle()
        ? el('button', { class: 'btn secondary', onclick: openOracle }, icon('oracle', { size: 16 }), ' Meaning Tables')
        : null,
      character ? null : el('span', { class: 'small muted' }, 'Create a character to roll tests here.'),
      el('button', { class: 'btn secondary', onclick: () => {
        const line = rollLine(getRollLog()[0]);
        if (!line) { showToast('No rolls yet'); return; }
        appendToSceneNotes(line); showToast('Added to scene'); draw();
      } }, 'Add last roll')),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: endScene }, 'End scene → log entry'),
      el('button', { class: 'btn secondary', onclick: () => {
        const before = getJournal(); const cur = getJournal(); cur.scene = { setup: '', notes: '' }; saveJournal(cur); draw();
        undoToast('Scene pad cleared', () => { saveJournal(before); draw(); });
      } }, 'Clear scene')));
}

// ---------- 2. Consult the Oracle (yes/no; doubles = complication) ----------
function isDouble(roll) { return roll === 100 || (roll >= 11 && roll <= 99 && roll % 11 === 0); }

export function askOracle(tier, chaos) {
  const chance = yesChanceFor(tier.yes, chaos);
  const roll = dN(100);
  return { roll, chance, yes: roll <= chance, complication: isDouble(roll), tierLabel: tier.label };
}
export function answerText(r) {
  return (r.yes ? 'Yes' : 'No') + (r.complication ? ', but… (complication)' : '');
}
function oracleLine(question, r) {
  const q = question.trim() ? `Q: ${question.trim()} → ` : '';
  return `Oracle — ${q}${answerText(r)} [${r.tierLabel} ${r.chance}%, rolled ${r.roll}]`;
}

function consultCard(j, draw) {
  const { yesNo } = ORACLE;
  const question = el('input', { type: 'text', placeholder: 'Ask a yes/no question…', 'aria-label': 'Oracle question' });
  const tierSel = el('select', { 'aria-label': 'Likelihood' },
    ...yesNo.tiers.map((t) => el('option', { value: t.id, selected: t.id === 'even' ? '' : null },
      `${t.label} (${yesChanceFor(t.yes, j.chaos)}%)`)));
  const out = el('div', { class: 'oracle-answer', 'aria-live': 'polite' });
  let last = null;
  const tierById = (id) => yesNo.tiers.find((t) => t.id === id);

  function roll() {
    last = askOracle(tierById(tierSel.value), j.chaos);
    out.replaceChildren(
      el('div', { class: 'oracle-answer-val' + (last.yes ? ' yes' : ' no') }, answerText(last)),
      el('div', { class: 'small muted' },
        `${last.tierLabel} ${last.chance}% · rolled ${last.roll}${last.complication ? ' · doubles' : ''}`),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', onclick: () => {
          appendToSceneNotes(oracleLine(question.value, last)); showToast('Added to scene'); draw();
        } }, 'Add to scene'),
        el('button', { class: 'btn secondary', onclick: () => {
          addJournalEntry({ title: 'Oracle', body: oracleLine(question.value, last) });
          showToast('Logged as entry'); draw();
        } }, 'Log as entry')));
  }

  return el('section', { class: 'card' },
    el('h3', {}, '2 · Consult the Oracle'),
    helpBlock('oracle'),
    el('p', { class: 'small muted' }, `${yesNo.note} Odds shift with the Chaos Factor (now ${j.chaos}).`),
    question,
    el('div', { class: 'grid-2' },
      el('label', { class: 'small muted' }, 'Likelihood', tierSel),
      el('button', { class: 'btn', onclick: roll }, 'Consult')),
    out);
}

// ---------- 3. Entries (log + folded-in composer) ----------
function newEntryFields(j, draw) {
  const title = el('input', { type: 'text', placeholder: 'Title (optional)', 'aria-label': 'Entry title' });
  const body = el('textarea', { rows: '3', placeholder: 'Write your entry…', 'aria-label': 'Entry body' });
  const openThreads = j.threads.filter((t) => t.status !== 'resolved');
  const threadSel = el('select', { 'aria-label': 'Link to a thread' },
    el('option', { value: '' }, 'No thread'),
    ...openThreads.map((t) => el('option', { value: t.id }, t.title)));

  return el('details', { class: 'journal-compose' },
    el('summary', {}, '+ New entry'),
    title, body,
    openThreads.length ? el('label', { class: 'small muted' }, 'Link to thread', threadSel) : null,
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => {
        if (!body.value.trim() && !title.value.trim()) { showToast('Write something first'); return; }
        addJournalEntry({ title: title.value.trim(), body: body.value.trim(), threadId: threadSel.value || null });
        showToast('Entry added'); draw();
      } }, 'Add entry')));
}

function entriesCard(j, draw) {
  const threadName = (id) => (j.threads.find((t) => t.id === id) || {}).title;
  return collapseCard('entries', `3 · Entries (${j.entries.length})`, helpBlock('entries'),
    newEntryFields(j, draw),
    j.entries.length
      ? el('ul', { class: 'journal-list' }, ...j.entries.map((e) => el('li', { class: 'journal-entry' },
          el('div', { class: 'journal-meta' },
            el('span', { class: 'small muted' }, fmtDate(e.ts)),
            e.characterName ? el('span', { class: 'pill' }, e.characterName) : null,
            e.threadId && threadName(e.threadId) ? el('span', { class: 'pill' }, threadName(e.threadId)) : null,
            el('button', { class: 'chip chip-icon', 'aria-label': 'Delete entry', title: 'Delete entry', onclick: () => {
              const before = getJournal(); const cur = getJournal(); cur.entries = cur.entries.filter((x) => x.id !== e.id); saveJournal(cur); draw();
              undoToast('Entry deleted', () => { saveJournal(before); draw(); });
            } }, icon('trash', { size: 14 }))),
          e.title ? el('div', { class: 'journal-title' }, e.title) : null,
          e.body ? el('div', { class: 'journal-body' }, e.body) : null)))
      : emptyState('scroll', 'No entries yet. End a scene to log your first one.'));
}

// ---------- 4. Threads ----------
function threadsCard(j, draw) {
  const open = j.threads.filter((t) => t.status !== 'resolved');
  const done = j.threads.filter((t) => t.status === 'resolved');
  const row = (t) => el('li', { class: 'journal-row' + (t.status === 'resolved' ? ' resolved' : '') },
    el('div', {},
      el('div', { class: 'journal-title' }, t.title),
      t.note ? el('div', { class: 'small muted' }, t.note) : null),
    el('div', { class: 'journal-row-actions' },
      el('button', { class: 'chip', onclick: () => {
        const cur = getJournal(); const x = cur.threads.find((y) => y.id === t.id);
        x.status = x.status === 'resolved' ? 'open' : 'resolved'; saveJournal(cur); draw();
      } }, icon(t.status === 'resolved' ? 'undo' : 'check', { size: 14 }), t.status === 'resolved' ? 'Reopen' : 'Resolve'),
      el('button', { class: 'chip chip-icon', 'aria-label': 'Edit note', title: 'Note', onclick: async () => {
        const note = await promptModal('Thread note', { value: t.note || '', okLabel: 'Save' });
        if (note == null) return;
        const cur = getJournal(); cur.threads.find((y) => y.id === t.id).note = note; saveJournal(cur); draw();
      } }, icon('pencil', { size: 14 })),
      el('button', { class: 'chip chip-icon', 'aria-label': 'Delete thread', title: 'Delete', onclick: () => {
        const before = getJournal(); const cur = getJournal(); cur.threads = cur.threads.filter((y) => y.id !== t.id); saveJournal(cur); draw();
        undoToast('Thread deleted', () => { saveJournal(before); draw(); });
      } }, icon('trash', { size: 14 }))));

  return collapseCard('threads', `4 · Threads (${open.length} open)`, helpBlock('threads'),
    el('p', { class: 'small muted' }, 'Open questions and goals to chase. Random events draw on this list.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: async () => {
        const title = await promptModal('New thread', { placeholder: 'e.g. Who poisoned the Duke?', okLabel: 'Add' });
        if (!title) return;
        const cur = getJournal(); cur.threads.push({ id: uid(), title, status: 'open', note: '' }); saveJournal(cur); draw();
      } }, '+ Thread')),
    open.length || done.length
      ? el('ul', { class: 'journal-list' }, ...open.map(row), ...done.map(row))
      : emptyState('thread', 'No threads yet. Add the first open question.'));
}

// ---------- 5. NPCs & places ----------
function contactsCard(j, draw) {
  const row = (c) => el('li', { class: 'journal-row' },
    el('div', {},
      el('div', { class: 'journal-title' }, c.name, el('span', { class: 'pill' }, c.type === 'place' ? 'place' : 'NPC')),
      c.note ? el('div', { class: 'small muted' }, c.note) : null),
    el('div', { class: 'journal-row-actions' },
      el('button', { class: 'chip chip-icon', 'aria-label': `Edit note on ${c.name}`, title: 'Note', onclick: async () => {
        const note = await promptModal(`Note on ${c.name}`, { value: c.note || '', okLabel: 'Save' });
        if (note == null) return;
        const cur = getJournal(); cur.contacts.find((y) => y.id === c.id).note = note; saveJournal(cur); draw();
      } }, icon('pencil', { size: 14 })),
      el('button', { class: 'chip chip-icon', 'aria-label': `Delete ${c.name}`, title: 'Delete', onclick: () => {
        const before = getJournal(); const cur = getJournal(); cur.contacts = cur.contacts.filter((y) => y.id !== c.id); saveJournal(cur); draw();
        undoToast(`Deleted ${c.name}`, () => { saveJournal(before); draw(); });
      } }, icon('trash', { size: 14 }))));

  const add = (type) => async () => {
    const name = await promptModal(type === 'place' ? 'New place' : 'New NPC', { placeholder: 'Name', okLabel: 'Add' });
    if (!name) return;
    const cur = getJournal(); cur.contacts.push({ id: uid(), name, type, note: '' }); saveJournal(cur); draw();
  };

  return collapseCard('contacts', `5 · NPCs & places (${j.contacts.length})`, helpBlock('contacts'),
    el('p', { class: 'small muted' }, 'Who and what you’ve met. Random events draw on this list.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: add('npc') }, '+ NPC'),
      el('button', { class: 'btn secondary', onclick: add('place') }, '+ Place')),
    j.contacts.length
      ? el('ul', { class: 'journal-list' }, ...j.contacts.map(row))
      : emptyState('person', 'No one recorded yet.'));
}
