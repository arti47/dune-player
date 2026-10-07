// feed.js — the Play tab's story feed (Play redesign, 2026-10-07).
//
// The session as one timeline, oldest at the top: rolls (from the roll log), notes, scene framing,
// scene/adventure ends, session starts, oracle answers and Journal entries, merged by time. A
// compact head shows who you are, the pools (drawn as objects) and anything live (a conflict,
// open tasks, a defeat). A dock at the bottom holds the four things you do at the table: Roll ·
// Note · Ask (only with the Journal on — the yes/no oracle is homebrew) · End. No rules live here:
// rolls go through the ritual → roller.js, scene/adventure ends through combat.runLifecycle.

import { el } from './core.js';
import { icon, emptyState, sceneBand } from './icons.js';
import { medallion } from './crests.js';
import { poolsHeader } from './sheet.js';
import { openRollRitual } from './ritual.js';
import { runLifecycle } from './combat.js';
import { askOracle, answerText, yesChanceFor } from './journal.js';
import { modal, showToast, undoToast } from './ui.js';
import { help, setAppHelp } from './help.js';
import { startHouseWizard } from './wizard.js';
import { Settings } from './settings.js';
import {
  getFeed, appendFeed, removeFeed, restoreFeed, getRollLog, getConflict, getTasks, getJournal, getHouse,
} from './store.js';
import { driveName } from './content.js';
import { DATA } from '../data.js';
import { ORACLE } from '../data-oracle.js';

const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const FEED_SHOWN = 80;

/** Merge rolls, feed events and (optionally) Journal entries into one time-ordered list. Pure. */
export function feedItems({ rolls = [], feed = [], entries = [] } = {}) {
  return [
    ...rolls.map((r) => ({ kind: 'roll', ts: r.ts || 0, r })),
    ...feed,
    ...entries.map((e) => ({ kind: 'entry', ts: e.ts || 0, e })),
  ].sort((a, b) => a.ts - b.ts).slice(-FEED_SHOWN);
}

/** Session/scene counters for the head: scenes ended since the last session divider. Pure. */
export function sessionInfo(feed = []) {
  let session = 0, scene = 1;
  for (const e of feed) {
    if (e.kind === 'session') { session++; scene = 1; }
    else if (e.kind === 'scene' || e.kind === 'adventure') scene++;
  }
  return { session: Math.max(1, session), scene };
}

/** Recap of the current session (everything after the last session divider). Pure. */
export function sessionRecap(items = []) {
  let start = 0;
  items.forEach((it, i) => { if (it.kind === 'session') start = i + 1; });
  const cur = items.slice(start);
  const rolls = cur.filter((i) => i.kind === 'roll').map((i) => i.r);
  return {
    rolls: rolls.length,
    passed: rolls.filter((r) => /^Success|Automatic success/.test(r.note || '')).length,
    crits: rolls.reduce((n, r) => n + (r.dice || []).filter((v) => v === 1).length, 0),
    complications: rolls.reduce((n, r) => n + (r.complications || 0), 0),
    momentum: rolls.reduce((n, r) => n + Math.max(0, r.momentumDelta || 0), 0),
    scenes: cur.filter((i) => i.kind === 'scene').length,
    notes: cur.filter((i) => i.kind === 'note' || i.kind === 'frame').length,
  };
}
/** True when the table has been quiet long enough that this is probably a new sitting. Pure. */
export const SESSION_GAP_MS = 6 * 60 * 60 * 1000;
export function isNewSitting(items = [], now = Date.now()) {
  if (!items.length) return false;
  const last = items[items.length - 1];
  return last.kind !== 'session' && now - last.ts > SESSION_GAP_MS;
}

// ----- one contextual next step (moved from Home) -----
/** The single most useful thing to do next, or null. Pure (exported for tests). */
export function nextUpFor(c, { house, rolls, dismissed = [] } = {}) {
  const st = c.state || {};
  const stmts = Object.entries(c.driveStatements || {});
  if (c.creationInPlay && c.creationInPlay.active && !c.creationInPlay.complete)
    return { id: 'cip', text: 'Finish defining your character as you play.', action: 'Open sheet', go: 'sheet' };
  if (st.defeated) return { id: 'defeat', text: 'You are defeated — resist, stabilise or start recovery.', action: 'Open sheet', go: 'sheet' };
  const challenged = stmts.find(([, s]) => s && s.challenged);
  if (challenged) return { id: 'challenged', text: 'A drive statement is challenged — recover it when you get the chance.', action: 'Open sheet', go: 'sheet' };
  if (!rolls) return { id: 'firstRoll', text: 'Say what you do. When it’s risky, tap Roll.', action: 'Roll', go: 'roll' };
  if (!house && !dismissed.includes('house')) return { id: 'house', text: 'Your group has no House yet — it’s the shared home base for your characters.', action: 'Create a House', go: 'house', dismissible: true };
  return null;
}

export function renderFeed(root, c, count, rerender) {
  setAppHelp(help('firstRun', 'What do I do here?'));
  const feed = getFeed();
  const items = feedItems({ rolls: getRollLog(), feed, entries: Settings.journal() ? getJournal().entries : [] });
  const list = el('ol', { class: 'feed', 'aria-label': 'Session feed', 'aria-live': 'polite' },
    ...items.map((it) => el('li', { class: `feed-item kind-${it.kind}` }, ...itemBody(it, rerender))));
  const table = Settings.get('playView') === 'table';
  root.append(...[
    head(c, count, sessionInfo(feed), rerender),
    table ? tableView(c, rerender) : null,
    !table && !items.length ? el('div', { class: 'feed-empty' }, sceneBand('play'),
      el('p', { class: 'feed-empty-title' }, 'Scene 1'),
      el('p', { class: 'small muted' }, 'Where are you, who is there, and what is at stake? Frame it with Note, then play.')) : null,
    table ? null : list,
    !table && isNewSitting(items) && !welcomedBack ? beginCard(items, rerender) : null,
    table ? null : nextUp(c, rerender),
    dock(c, rerender),
  ].filter(Boolean));
  // Newest at the bottom, like a conversation: open on it.
  requestAnimationFrame(() => { const last = list.lastElementChild; if (last) last.scrollIntoView({ block: 'end' }); });
}

// ----- session ritual: welcome back → recap → begin -----
let welcomedBack = false;   // "Not now" hides the card until the app reloads
function recapList(r) {
  return el('ul', { class: 'recap' },
    el('li', {}, el('strong', { class: 'num' }, String(r.rolls)), el('span', {}, 'rolls')),
    el('li', {}, el('strong', { class: 'num' }, String(r.passed)), el('span', {}, 'succeeded')),
    el('li', {}, el('strong', { class: 'num' }, String(r.crits)), el('span', {}, 'natural 1s')),
    el('li', {}, el('strong', { class: 'num' }, String(r.complications)), el('span', {}, 'complications')),
    el('li', {}, el('strong', { class: 'num' }, `+${r.momentum}`), el('span', {}, 'Momentum earned')),
    el('li', {}, el('strong', { class: 'num' }, String(r.scenes)), el('span', {}, 'scenes ended')));
}
function beginCard(items, rerender) {
  return el('section', { class: 'card begin-card' },
    el('p', { class: 'eyebrow' }, 'Welcome back'),
    el('h3', {}, 'Last time'),
    recapList(sessionRecap(items)),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => { appendFeed({ kind: 'session' }); rerender(); } }, icon('star', { size: 18 }), ' Begin session'),
      el('button', { class: 'chip', onclick: () => { welcomedBack = true; rerender(); } }, 'Not now')));
}
/** End → New session: show the recap of the session that's closing, then post the divider. */
function newSession(rerender) {
  const items = feedItems({ rolls: getRollLog(), feed: getFeed(), entries: Settings.journal() ? getJournal().entries : [] });
  const close = modal([el('h2', {}, 'Session recap'), recapList(sessionRecap(items)),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: () => { close(); appendFeed({ kind: 'session' }); rerender(); } }, 'Begin new session'))]);
}

// ----- table view: the one-screen alternative to the feed -----
// Character, a giant d20 and the skill numbers — no timeline. Toggled from the head (Feed / Table).
function tableView(c, rerender) {
  const drives = Object.values(c.drives || {});
  const top = drives.length ? Math.max(...drives) : 0;
  return el('section', { class: 'table-view' },
    el('button', { class: 'big-d20', 'aria-label': 'Roll a test', onclick: () => openRollRitual(c, rerender) },
      icon('d20', { size: 96 }), el('span', {}, 'Tap to roll')),
    el('div', { class: 'tv-skills' }, ...DATA.skills.map((s) => el('div', { class: 'tv-skill' },
      el('strong', { class: 'num' }, String(c.skills[s.id])), el('span', {}, s.name.slice(0, 3)),
      el('span', { class: 'tv-tn num' }, `≤${c.skills[s.id] + top}`)))),
    el('p', { class: 'small muted' }, 'Numbers under each skill: the best target number with your highest drive.'));
}

// ----- head: who · pools · live -----
function head(c, count, info, rerender) {
  const go = (id) => () => { location.hash = `#/${id}`; };
  const conflict = getConflict();
  const cType = conflict && conflict.active ? (DATA.conflictTypes.find((t) => t.id === conflict.type) || {}).name : null;
  const open = getTasks().filter((t) => t.progress < t.requirement);
  const live = [
    c.state && c.state.defeated ? el('button', { class: 'live-pill danger', onclick: go('sheet') }, icon('shield', { size: 14 }), 'Defeated') : null,
    cType ? el('button', { class: 'live-pill', onclick: go('conflict') }, icon('swords', { size: 14 }), `${cType} · Side ${conflict.currentSide.toUpperCase()} to act`) : null,
    open.length ? el('button', { class: 'live-pill', onclick: go('tasks') }, icon('hourglass', { size: 14 }),
      open.length === 1 ? `${open[0].name} ${open[0].progress}/${open[0].requirement}` : `${open.length} tasks`) : null,
  ].filter(Boolean);
  return el('section', { class: 'feed-head' },
    el('div', { class: 'feed-who' },
      el('button', { class: 'feed-medal', 'aria-label': `Open ${c.identity.name || 'character'}’s sheet`, onclick: go('sheet') }, medallion(c.identity, 44)),
      el('div', { class: 'feed-id' },
        el('strong', { class: 'feed-name' }, c.identity.name || 'Unnamed'),
        el('span', { class: 'small muted' }, `Session ${info.session} · Scene ${info.scene}`)),
      count > 1 ? el('button', { class: 'chip', 'aria-label': `Switch character (${count})`, onclick: go('sheet') }, icon('group', { size: 14 }), String(count)) : null,
      // Feed / Table view switch (per-viewer preference).
      el('button', { class: 'chip view-chip', 'aria-pressed': Settings.get('playView') === 'table' ? 'true' : 'false',
        'aria-label': Settings.get('playView') === 'table' ? 'Show the story feed' : 'Show the table view',
        onclick: () => { Settings.set('playView', Settings.get('playView') === 'table' ? 'feed' : 'table'); rerender(); } },
        icon(Settings.get('playView') === 'table' ? 'scroll' : 'd20', { size: 14 }), Settings.get('playView') === 'table' ? 'Feed' : 'Table')),
    poolsHeader(c, rerender),
    live.length ? el('div', { class: 'live-row' }, ...live) : null);
}

// ----- feed items -----
function itemBody(it, rerender) {
  const time = el('time', { class: 'fi-time small muted' }, new Date(it.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  if (it.kind === 'roll') {
    const r = it.r;
    const passed = /^Success|Automatic success/.test(r.note || '');
    const dice = (r.dice || []).map((v) => el('span', { class: 'fi-die' + (v === 1 ? ' crit' : v >= 20 ? ' comp' : v <= r.tn ? ' hit' : '') }, String(v)));
    const deltas = [r.momentumDelta ? `${r.momentumDelta > 0 ? '+' : ''}${r.momentumDelta} Momentum` : null,
      r.threatDelta ? `${r.threatDelta > 0 ? '+' : ''}${r.threatDelta} Threat` : null,
      r.complications ? `${r.complications} complication${r.complications === 1 ? '' : 's'}` : null].filter(Boolean);
    return [
      el('div', { class: 'fi-line' }, icon('d20', { size: 16 }),
        el('strong', {}, `${SKILL_NAME[r.skill] || r.skill} + ${driveName(r.drive)}`),
        el('span', { class: 'small muted' }, `TN ${r.tn}`), time),
      el('div', { class: 'fi-dice-row' }, el('span', { class: 'fi-dice' }, ...dice),
        el('span', { class: 'fi-verdict ' + (passed ? 'ok' : 'bad') }, passed ? `✓ ${r.successes}` : `✗ ${r.successes}`)),
      deltas.length ? el('p', { class: 'small muted fi-sub' }, deltas.join(' · ')) : null,
      r.characterName ? el('p', { class: 'small muted fi-sub' }, r.characterName) : null,
    ];
  }
  if (it.kind === 'scene' || it.kind === 'adventure' || it.kind === 'session') {
    const label = it.kind === 'session' ? `Session · ${new Date(it.ts).toLocaleDateString()}` : it.text;
    return [el('div', { class: 'fi-divider' }, el('span', {}, label)),
      it.summary && it.summary.length ? el('details', { class: 'fi-summary' }, el('summary', { class: 'small muted' }, 'What changed'),
        el('ul', { class: 'small' }, ...it.summary.map((s) => el('li', {}, s)))) : null];
  }
  if (it.kind === 'oracle') {
    return [el('div', { class: 'fi-line' }, icon('oracle', { size: 16 }), el('strong', {}, it.question || 'Oracle'), time),
      el('p', { class: 'fi-answer ' + (it.yes ? 'yes' : 'no') }, it.answer),
      el('p', { class: 'small muted fi-sub' }, `${it.tierLabel} ${it.chance}% · rolled ${it.roll} · homebrew oracle`)];
  }
  if (it.kind === 'entry') {
    return [el('div', { class: 'fi-line' }, icon('scroll', { size: 16 }), el('strong', {}, it.e.title || 'Journal'), time),
      el('p', { class: 'fi-text' }, it.e.body)];
  }
  // note / frame (posted from the dock)
  const del = el('button', { class: 'fi-x', 'aria-label': 'Remove note', onclick: () => {
    const all = getFeed();
    removeFeed(it.id); rerender();
    undoToast('Note removed', () => { restoreFeed(all); rerender(); });
  } }, icon('close', { size: 14 }));
  return [it.kind === 'frame'
    ? el('div', { class: 'fi-frame' }, el('span', { class: 'eyebrow' }, 'Scene'), el('p', {}, it.text), del)
    : el('div', { class: 'fi-note' }, el('p', {}, it.text), el('span', { class: 'fi-note-meta' }, it.characterName ? el('span', { class: 'small muted' }, it.characterName) : null, time, del))];
}

function nextUp(c, rerender) {
  const dismissed = Settings.get('homeDismissed') || [];
  const n = nextUpFor(c, { house: getHouse(), rolls: getRollLog().length, dismissed });
  if (!n) return null;
  const go = () => n.go === 'roll' ? openRollRitual(c, rerender) : n.go === 'house' ? startHouseWizard() : (location.hash = `#/${n.go}`);
  return el('div', { class: 'feed-next' },
    icon('flag', { size: 16 }),
    el('span', { class: 'feed-next-text' }, n.text),
    el('button', { class: 'chip on', onclick: go }, n.action),
    n.dismissible ? el('button', { class: 'chip', onclick: () => { Settings.set('homeDismissed', [...dismissed, n.id]); rerender(); } }, 'Not now') : null);
}

// ----- dock: Roll · Note · Ask · End -----
function dock(c, rerender) {
  const b = (ico, label, onclick, cls = '') => el('button', { class: 'dock-btn ' + cls, onclick, 'aria-label': label },
    icon(ico, { size: cls.includes('dock-roll') ? 26 : 20 }), el('span', {}, label));
  return el('nav', { class: 'feed-dock', 'aria-label': 'Play actions' },
    b('pencil', 'Note', () => noteSheet(c, rerender)),
    Settings.journal() ? b('oracle', 'Ask', () => askSheet(rerender)) : null,
    b('d20', 'Roll', () => openRollRitual(c, rerender), 'dock-roll'),
    b('flag', 'End', () => endSheet(rerender)));
}

function noteSheet(c, rerender) {
  const text = el('textarea', { rows: '3', placeholder: 'What happens? What do you do?', 'aria-label': 'Note' });
  const post = (kind) => () => {
    if (!text.value.trim()) { showToast('Write something first'); return; }
    appendFeed({ kind, text: text.value.trim(), characterName: c.identity.name || '' });
    close(); rerender();
  };
  const close = modal([el('h2', {}, 'Add to the story'), text,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: post('frame') }, 'Frame a scene'),
      el('button', { class: 'btn', onclick: post('note') }, 'Post note'))], { sheet: true });
  setTimeout(() => text.focus(), 50);
}

function askSheet(rerender) {
  const j = getJournal();
  const q = el('input', { type: 'text', placeholder: 'Ask a yes/no question…', 'aria-label': 'Oracle question' });
  const ask = (tier) => () => {
    const r = askOracle(tier, j.chaos);
    appendFeed({ kind: 'oracle', question: q.value.trim(), answer: answerText(r), yes: r.yes, roll: r.roll, chance: r.chance, tierLabel: r.tierLabel });
    close(); rerender();
  };
  const close = modal([el('h2', {}, 'Ask the oracle'), q,
    el('p', { class: 'small muted' }, `How likely? (Chaos ${j.chaos}) · homebrew, not official rules`),
    el('div', { class: 'ask-tiers' }, ...ORACLE.yesNo.tiers.map((t) =>
      el('button', { class: 'btn secondary', onclick: ask(t) }, `${t.label} · ${yesChanceFor(t.yes, j.chaos)}%`)))], { sheet: true });
  setTimeout(() => q.focus(), 50);
}

function endSheet(rerender) {
  const row = (ico, title, sub, fn) => el('button', { class: 'intent-opt', onclick: () => { close(); fn(); } },
    el('span', { class: 'intent-ico' }, icon(ico, { size: 22 })),
    el('span', { class: 'intent-text' }, el('strong', {}, title), el('span', { class: 'small muted' }, sub)));
  const close = modal([el('h2', {}, 'End or begin'),
    el('div', { class: 'intent' },
      row('hourglass', 'End scene', `Momentum −${DATA.momentumRules.sceneDecay}, temporary assets expire.`, () => runLifecycle('scene', rerender)),
      row('flag', 'End adventure', 'Determination resets, challenged statements recover.', () => runLifecycle('adventure', rerender)),
      row('star', 'New session', 'See a recap, then start a fresh page. No rules change.', () => newSession(rerender)))],
  { sheet: true });
}
