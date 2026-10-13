// cast.js — what links the scene to threads, people and fights (2026-10-13).
//
// Story Hooks start a scene (Location → Where, Character → Who, Plot + Goal → At stake, Hazard
// noted) and seed a thread + NPC + place. Open threads sit under the scene header (tap = this
// scene's stakes) and are reviewed at End scene. "Who is here?" is the cast: each name links to
// your NPCs & places and, through a compendium stat block, to a fight on Side B.
// No rules live here: hooks are DATA.storyHooks, stat blocks NPCS, fights go through combat.js.

import { el, uid } from './core.js';
import { icon } from './icons.js';
import { modal, showToast, promptModal } from './ui.js';
import { DATA } from '../data.js';
import { NPCS } from '../data-npcs.js';
import { expansionNpcs } from './content.js';
import { getJournal, saveJournal, updateScene, currentScene, appendFeed, getConflict, saveConflict, removeFeed } from './store.js';
import { npcBlock } from './gm.js';
import { fightNpc } from './combat.js';
import { withSpark } from './spark.js';

// ----- pure helpers -----
const strip = (s) => String(s || '').replace(/\s*\(.*\)\s*$/, '').trim();
const same = (a, b) => strip(a).toLowerCase() === strip(b).toLowerCase();

/** "Hegai, the smuggler" → { name: 'Hegai', role: 'the smuggler' }. */
export function splitCharacter(entry) {
  const [name, ...rest] = String(entry || '').split(', ');
  return { name: name.trim(), role: rest.join(', ').trim() };
}
/** A rolled Story Hook as the three scene fields + hazard. */
export function hookToScene(h) {
  const ch = splitCharacter(h.character);
  return {
    where: h.location,
    who: ch.role ? `${ch.name} (${ch.role})` : ch.name,
    stakes: `${h.plot.replace(/…$/, '')} ${h.goal}`,
    hazard: h.hazard,
  };
}
/** The cast: names in "Who is here?" (split on commas / "and"), each matched to a known contact. */
export function castOf(who, contacts = []) {
  return String(who || '').split(/\s*(?:,|;|\band\b)\s*/i).map((s) => s.trim()).filter(Boolean)
    .map((label) => ({ label, name: strip(label), contact: contacts.find((c) => c.type !== 'place' && same(c.name, label)) || null }));
}
/** Every compendium stat block with a stable key. */
export function allNpcs() {
  return [
    ...NPCS.archetypes.map((n) => ({ ...n, key: `archetype:${n.id}`, iconic: false })),
    ...NPCS.iconics.map((n) => ({ ...n, key: `iconic:${n.id}`, iconic: true })),
    ...expansionNpcs().map((n) => ({ ...n, key: `exp:${n.id}`, iconic: false })),
  ];
}
export function npcByKey(key) { return key ? allNpcs().find((n) => n.key === key) || null : null; }
/** Find-or-add a contact by name (case-insensitive); sets its stat-block link / note when given. */
export function ensureContact(j, { name, type = 'npc', npcKey = null, note = '' }) {
  let c = j.contacts.find((x) => x.type === type && same(x.name, name));
  if (!c) { c = { id: uid(), name: strip(name), type, note }; j.contacts.push(c); }
  if (npcKey) c.npcKey = npcKey;
  if (note && !c.note) c.note = note;
  return c;
}
/** Find-or-add an open thread by title. */
export function ensureThread(j, title) {
  let t = j.threads.find((x) => x.title.toLowerCase() === title.toLowerCase());
  if (!t) { t = { id: uid(), title, status: 'open', note: '' }; j.threads.push(t); }
  else t.status = 'open';
  return t;
}
/** A Story Hook's seeds go into the journal: thread (Plot + Goal), NPC (Character), place (Location). */
export function seedFromHook(h) {
  const j = getJournal();
  const s = hookToScene(h);
  const ch = splitCharacter(h.character);
  const thread = ensureThread(j, s.stakes);
  ensureContact(j, { name: ch.name, type: 'npc', note: ch.role });
  ensureContact(j, { name: h.location, type: 'place' });
  saveJournal(j);
  return thread.id;
}

// ----- the scene's link rows -----
/** Open threads as chips under the scene header; tap one → this scene's stakes. */
export function threadChips(scene, rerender) {
  const open = getJournal().threads.filter((t) => t.status !== 'resolved');
  const add = el('button', { class: 'chip', onclick: async () => {
    const title = await promptModal('New thread — an open question or goal to chase', { placeholder: 'e.g. Who poisoned the Duke?', okLabel: 'Add',
      wrap: (i) => withSpark(i, 'thread', {}, 'Roll a Story Hook plot') });
    if (!title) return;
    const j = getJournal(); ensureThread(j, title.trim()); saveJournal(j); rerender();
  } }, icon('plus', { size: 14 }), 'Thread');
  return el('div', { class: 'scene-links' },
    el('span', { class: 'scene-links-label' }, 'Threads'),
    ...open.map((t) => el('button', { class: 'chip' + (scene.threadId === t.id ? ' on' : ''), 'aria-pressed': scene.threadId === t.id ? 'true' : 'false',
      title: 'Make this the scene’s stakes',
      onclick: () => {
        if (scene.threadId === t.id) { updateScene(scene.id, { threadId: null }); rerender(); return; }
        updateScene(scene.id, { threadId: t.id, stakes: t.title }); showToast('Now at stake in this scene'); rerender();
      } }, t.title)),
    add);
}

/** The cast under the scene header; tap a name → stats / link / fight. */
export function castChips(scene, me, rerender) {
  const cast = castOf(scene.who, getJournal().contacts);
  return el('div', { class: 'scene-links' },
    el('span', { class: 'scene-links-label' }, 'Here'),
    ...cast.map((m) => el('button', { class: 'chip' + (m.contact && m.contact.npcKey ? ' on' : ''), onclick: () => castSheet(scene, m, me, rerender) },
      m.contact && m.contact.npcKey ? icon('swords', { size: 14 }) : null, m.label)),
    el('button', { class: 'chip', onclick: () => addToSceneSheet(scene, rerender) }, icon('plus', { size: 14 }), 'Someone'));
}

/** Put a compendium NPC in the open scene's cast (and your NPC list, linked to the stat block). */
export function addNpcToScene(n) {
  const j = getJournal(); ensureContact(j, { name: n.name, npcKey: n.key || keyOf(n) }); saveJournal(j);
  const scene = currentScene();
  if (scene && !castOf(scene.who).some((m) => same(m.name, n.name))) updateScene(scene.id, { who: [scene.who, n.name].filter(Boolean).join(', ') });
}
/** A compendium entry's key when it came from NPCS directly (no `key` field). */
function keyOf(n) { const hit = allNpcs().find((x) => x.id === n.id && x.name === n.name); return hit ? hit.key : null; }

/** Add a person to the scene: one of your NPCs, or a stat block from the compendium. */
export function addToSceneSheet(scene, rerender) {
  const box = el('div', {});
  let close = () => {};
  const add = (name, npcKey = null) => {
    const j = getJournal(); ensureContact(j, { name, npcKey }); saveJournal(j);
    const cast = castOf(scene.who);
    if (!cast.some((m) => same(m.name, name))) updateScene(scene.id, { who: [scene.who, strip(name)].filter(Boolean).join(', ') });
    close(); rerender();
  };
  const known = getJournal().contacts.filter((c) => c.type !== 'place');
  box.append(
    known.length ? el('div', { class: 'scene-links' }, el('span', { class: 'scene-links-label' }, 'Your NPCs'),
      ...known.map((c) => el('button', { class: 'chip', onclick: () => add(c.name) }, c.name))) : null,
    compendiumPicker((n) => add(n.name, n.key), 'Add to scene'));
  close = modal([el('h2', {}, 'Who else is here?'), box], { sheet: true });
}

/** Searchable compendium with one button per stat block. */
export function compendiumPicker(onPick, label) {
  const search = el('input', { type: 'search', placeholder: 'Search the NPC compendium…', 'aria-label': 'Search NPCs' });
  const list = el('div', {});
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren(...allNpcs().filter((n) => !q || n.name.toLowerCase().includes(q)).slice(0, 40)
      .map((n) => npcBlock(n, n.iconic ? 'iconic' : 'archetype', () => el('button', { class: 'btn btn-sm', onclick: () => onPick(n) }, label))));
  };
  search.addEventListener('input', draw); draw();
  return el('div', {}, el('h3', {}, 'NPC compendium'), search, list);
}

function castSheet(scene, m, me, rerender) {
  let close = () => {};
  const contact = m.contact;
  const npc = npcByKey(contact && contact.npcKey);
  const link = () => {
    close();
    const c2 = modal([el('h2', {}, `Stat block for ${m.name}`), el('p', { class: 'small muted' }, 'Pick the compendium entry that plays this person.'),
      compendiumPicker((n) => { const jj = getJournal(); ensureContact(jj, { name: m.name, npcKey: n.key }); saveJournal(jj); c2(); rerender(); }, 'Use for ' + m.name)],
    { sheet: true });
  };
  const fight = (typeId) => () => {
    const before = getConflict();
    saveConflict(fightNpc(before, npc, typeId, me));
    if (!before || !before.active) appendFeed({ kind: 'combat', text: `You face ${m.name} — ${(DATA.conflictTypes.find((t) => t.id === typeId) || {}).name || 'conflict'}.` });
    else appendFeed({ kind: 'combat', text: `${m.name} joins the fight.` });
    close(); location.hash = '#/conflict';
  };
  const active = getConflict() && getConflict().active;
  const remove = () => {
    const rest = castOf(scene.who).filter((x) => x.label !== m.label).map((x) => x.label).join(', ');
    updateScene(scene.id, { who: rest }); close(); rerender();
  };
  close = modal([
    el('h2', {}, m.label),
    contact && contact.note ? el('p', { class: 'small muted' }, contact.note) : null,
    npc ? (() => { const d = npcBlock(npc, npc.iconic ? 'iconic' : 'archetype'); d.open = true; return d; })() : el('p', { class: 'small' }, 'No stat block yet — link one to roll against them or fight them.'),
    npc ? el('div', {},
      el('h3', {}, active ? 'Fight' : 'Fight them — pick the kind of conflict'),
      active ? el('button', { class: 'btn', onclick: fight(null) }, icon('swords', { size: 16 }), ` Add ${m.name} to Side B`)
        : el('div', { class: 'starter-types' }, ...DATA.conflictTypes.map((t) =>
          el('button', { class: 'starter-type', onclick: fight(t.id) }, el('strong', {}, t.name), el('span', { class: 'small muted' }, t.scale))))) : null,
    el('div', { class: 'cta-row' },
      el('button', { class: 'chip', onclick: link }, icon('list', { size: 14 }), npc ? 'Change stat block' : 'Link a stat block'),
      !contact ? el('button', { class: 'chip', onclick: () => { const jj = getJournal(); ensureContact(jj, { name: m.name }); saveJournal(jj); close(); rerender(); } }, icon('plus', { size: 14 }), 'Save to NPCs') : null,
      el('button', { class: 'chip', onclick: remove }, icon('close', { size: 14 }), 'Not here')),
  ].filter((k) => k != null), { sheet: true });
}

// ----- End scene: did any thread move? -----
/** Resolves to { marks: {threadId: 'moved'|'resolved'}, newTitle } or null (cancel). Skipped
 *  (resolves {}) when there are no open threads. */
export function reviewThreads() {
  const open = getJournal().threads.filter((t) => t.status !== 'resolved');
  if (!open.length) return Promise.resolve({ marks: {}, newTitle: '' });
  return new Promise((resolve) => {
    let done = false;
    const marks = {};
    const row = (t) => {
      const opts = [['', 'No change'], ['moved', 'Moved'], ['resolved', 'Resolved']];
      const btns = opts.map(([v, label]) => el('button', { class: 'chip' + (v === '' ? ' on' : ''), 'aria-pressed': v === '' ? 'true' : 'false', onclick: () => {
        if (v) marks[t.id] = v; else delete marks[t.id];
        btns.forEach((b, i) => { const on = opts[i][0] === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      } }, label));
      return el('li', { class: 'thread-review' }, el('span', {}, t.title), el('div', { class: 'cta-row' }, ...btns));
    };
    const fresh = el('input', { type: 'text', placeholder: 'A new thread this scene raised (optional)', 'aria-label': 'New thread' });
    const finish = (v) => () => { done = true; close(); resolve(v ? { marks, newTitle: fresh.value.trim() } : null); };
    const close = modal([el('h2', {}, 'Did any thread move?'),
      el('ul', { class: 'thread-review-list' }, ...open.map(row)),
      withSpark(fresh, 'thread', {}, 'Roll a Story Hook plot'),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: finish(false) }, 'Cancel'),
        el('button', { class: 'btn', onclick: finish(true) }, 'Continue'))],
    { sheet: true, onClose: () => { if (!done) resolve(null); } });
  });
}
/** Apply a review: thread statuses + story lines. Returns an undo. */
export function applyThreadReview(review) {
  const before = getJournal();
  const j = getJournal();
  const ids = [];
  for (const t of j.threads) {
    const m = review.marks[t.id];
    if (!m) continue;
    if (m === 'resolved') t.status = 'resolved';
    ids.push(appendFeed({ kind: 'note', text: `${m === 'resolved' ? 'Thread resolved' : 'Thread moved'}: ${t.title}.` }).id);
  }
  if (review.newTitle) { ensureThread(j, review.newTitle); ids.push(appendFeed({ kind: 'note', text: `New thread: ${review.newTitle}.` }).id); }
  saveJournal(j);
  return () => { saveJournal(before); ids.forEach(removeFeed); };
}
