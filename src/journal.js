// journal.js — Solo-play Journal (gated by Settings.journal(), global/device-wide).
//
// Four sections over store's global journal object:
//   • Current scene — one editable setup+notes pad (log it to an entry when the scene ends)
//   • Entries       — dated freeform log (title optional, optional link to a thread)
//   • Threads       — open plot questions/goals; toggle open/resolved
//   • NPCs & places  — a roster of who/what you've met
// Not rules content — a play aid. Everything persists immediately + rides the JSON backup.

import { el, uid } from './core.js';
import { getJournal, saveJournal, addJournalEntry } from './store.js';
import { confirmModal, promptModal, showToast } from './ui.js';

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return new Date(ts).toISOString(); }
}

export function renderJournal(root) {
  const draw = () => {
    const j = getJournal();
    root.replaceChildren();
    root.append(
      el('section', { class: 'card' },
        el('h2', {}, 'Journal'),
        el('p', { class: 'small muted' },
          'Your solo-play log: keep the running story, chase plot threads, and remember who you’ve met. Saved on this device and in the JSON backup.')),
      sceneCard(j, draw),
      newEntryCard(j, draw),
      entriesCard(j, draw),
      threadsCard(j, draw),
      contactsCard(j, draw),
    );
  };
  draw();
}

// ---------- Current scene pad ----------
function sceneCard(j, draw) {
  const setup = el('textarea', { rows: '2', placeholder: 'Scene setup: where, when, who, what’s at stake…', 'aria-label': 'Scene setup' });
  setup.value = j.scene.setup || '';
  const notes = el('textarea', { rows: '3', placeholder: 'What happens as the scene plays out…', 'aria-label': 'Scene notes' });
  notes.value = j.scene.notes || '';
  const save = () => { const cur = getJournal(); cur.scene = { setup: setup.value, notes: notes.value }; saveJournal(cur); };
  setup.addEventListener('input', save);
  notes.addEventListener('input', save);

  return el('section', { class: 'card' },
    el('h3', {}, 'Current scene'),
    el('label', { class: 'small muted', for: 'jr-setup' }, 'Setup'), setup,
    el('label', { class: 'small muted', for: 'jr-notes' }, 'Notes'), notes,
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => {
        if (!setup.value.trim() && !notes.value.trim()) { showToast('Scene is empty'); return; }
        const body = [setup.value.trim(), notes.value.trim()].filter(Boolean).join('\n\n');
        addJournalEntry({ title: 'Scene', body });
        const cur = getJournal(); cur.scene = { setup: '', notes: '' }; saveJournal(cur);
        showToast('Scene logged to entries'); draw();
      } }, 'Log scene → entry'),
      el('button', { class: 'btn secondary', onclick: async () => {
        if (!await confirmModal('Clear the current scene pad?', { okLabel: 'Clear' })) return;
        const cur = getJournal(); cur.scene = { setup: '', notes: '' }; saveJournal(cur); draw();
      } }, 'Clear scene')));
}

// ---------- New entry composer ----------
function newEntryCard(j, draw) {
  const title = el('input', { type: 'text', placeholder: 'Title (optional)', 'aria-label': 'Entry title' });
  const body = el('textarea', { rows: '3', placeholder: 'Write your entry…', 'aria-label': 'Entry body' });
  const openThreads = j.threads.filter((t) => t.status !== 'resolved');
  const threadSel = el('select', { 'aria-label': 'Link to a thread' },
    el('option', { value: '' }, 'No thread'),
    ...openThreads.map((t) => el('option', { value: t.id }, t.title)));

  return el('section', { class: 'card' },
    el('h3', {}, 'New entry'),
    title, body,
    openThreads.length ? el('label', { class: 'small muted' }, 'Link to thread', threadSel) : null,
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => {
        if (!body.value.trim() && !title.value.trim()) { showToast('Write something first'); return; }
        addJournalEntry({ title: title.value.trim(), body: body.value.trim(), threadId: threadSel.value || null });
        showToast('Entry added'); draw();
      } }, 'Add entry')));
}

// ---------- Entries list ----------
function entriesCard(j, draw) {
  const threadName = (id) => (j.threads.find((t) => t.id === id) || {}).title;
  return el('section', { class: 'card' },
    el('h3', {}, `Entries (${j.entries.length})`),
    j.entries.length
      ? el('ul', { class: 'journal-list' }, ...j.entries.map((e) => el('li', { class: 'journal-entry' },
          el('div', { class: 'journal-meta' },
            el('span', { class: 'small muted' }, fmtDate(e.ts)),
            e.threadId && threadName(e.threadId) ? el('span', { class: 'pill' }, threadName(e.threadId)) : null,
            el('button', { class: 'link-btn small', 'aria-label': 'Delete entry', onclick: async () => {
              if (!await confirmModal('Delete this entry?', { okLabel: 'Delete' })) return;
              const cur = getJournal(); cur.entries = cur.entries.filter((x) => x.id !== e.id); saveJournal(cur); draw();
            } }, '× delete')),
          e.title ? el('div', { class: 'journal-title' }, e.title) : null,
          e.body ? el('div', { class: 'journal-body' }, e.body) : null)))
      : el('p', { class: 'small muted' }, 'No entries yet. Play a scene, then log it here.'));
}

// ---------- Threads ----------
function threadsCard(j, draw) {
  const open = j.threads.filter((t) => t.status !== 'resolved');
  const done = j.threads.filter((t) => t.status === 'resolved');
  const row = (t) => el('li', { class: 'journal-row' + (t.status === 'resolved' ? ' resolved' : '') },
    el('div', {},
      el('div', { class: 'journal-title' }, t.title),
      t.note ? el('div', { class: 'small muted' }, t.note) : null),
    el('div', { class: 'journal-row-actions' },
      el('button', { class: 'link-btn small', onclick: () => {
        const cur = getJournal(); const x = cur.threads.find((y) => y.id === t.id);
        x.status = x.status === 'resolved' ? 'open' : 'resolved'; saveJournal(cur); draw();
      } }, t.status === 'resolved' ? 'reopen' : 'resolve'),
      el('button', { class: 'link-btn small', onclick: async () => {
        const note = await promptModal('Thread note', { value: t.note || '', okLabel: 'Save' });
        if (note == null) return;
        const cur = getJournal(); cur.threads.find((y) => y.id === t.id).note = note; saveJournal(cur); draw();
      } }, 'note'),
      el('button', { class: 'link-btn small', 'aria-label': 'Delete thread', onclick: async () => {
        if (!await confirmModal('Delete this thread?', { okLabel: 'Delete' })) return;
        const cur = getJournal(); cur.threads = cur.threads.filter((y) => y.id !== t.id); saveJournal(cur); draw();
      } }, '×')));

  return el('section', { class: 'card' },
    el('h3', {}, `Threads (${open.length} open)`),
    el('p', { class: 'small muted' }, 'Open questions and goals to chase. Resolve them as the story answers them.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: async () => {
        const title = await promptModal('New thread', { placeholder: 'e.g. Who poisoned the Duke?', okLabel: 'Add' });
        if (!title) return;
        const cur = getJournal(); cur.threads.push({ id: uid(), title, status: 'open', note: '' }); saveJournal(cur); draw();
      } }, '+ Thread')),
    open.length || done.length
      ? el('ul', { class: 'journal-list' }, ...open.map(row), ...done.map(row))
      : el('p', { class: 'small muted' }, 'No threads yet.'));
}

// ---------- NPCs & places ----------
function contactsCard(j, draw) {
  const row = (c) => el('li', { class: 'journal-row' },
    el('div', {},
      el('div', { class: 'journal-title' }, c.name, el('span', { class: 'pill' }, c.type === 'place' ? 'place' : 'NPC')),
      c.note ? el('div', { class: 'small muted' }, c.note) : null),
    el('div', { class: 'journal-row-actions' },
      el('button', { class: 'link-btn small', onclick: async () => {
        const note = await promptModal(`Note on ${c.name}`, { value: c.note || '', okLabel: 'Save' });
        if (note == null) return;
        const cur = getJournal(); cur.contacts.find((y) => y.id === c.id).note = note; saveJournal(cur); draw();
      } }, 'note'),
      el('button', { class: 'link-btn small', 'aria-label': 'Delete', onclick: async () => {
        if (!await confirmModal(`Delete ${c.name}?`, { okLabel: 'Delete' })) return;
        const cur = getJournal(); cur.contacts = cur.contacts.filter((y) => y.id !== c.id); saveJournal(cur); draw();
      } }, '×')));

  const add = (type) => async () => {
    const name = await promptModal(type === 'place' ? 'New place' : 'New NPC', { placeholder: 'Name', okLabel: 'Add' });
    if (!name) return;
    const cur = getJournal(); cur.contacts.push({ id: uid(), name, type, note: '' }); saveJournal(cur); draw();
  };

  return el('section', { class: 'card' },
    el('h3', {}, `NPCs & places (${j.contacts.length})`),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: add('npc') }, '+ NPC'),
      el('button', { class: 'btn secondary', onclick: add('place') }, '+ Place')),
    j.contacts.length
      ? el('ul', { class: 'journal-list' }, ...j.contacts.map(row))
      : el('p', { class: 'small muted' }, 'No one recorded yet.'));
}
