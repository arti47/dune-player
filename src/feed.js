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
  root.append(...[
    head(c, count, sessionInfo(feed), rerender),
    items.length ? null : el('div', { class: 'feed-empty' }, sceneBand('play'),
      el('p', { class: 'feed-empty-title' }, 'Scene 1'),
      el('p', { class: 'small muted' }, 'Where are you, who is there, and what is at stake? Frame it with Note, then play.')),
    list,
    nextUp(c, rerender),
    dock(c, rerender),
  ].filter(Boolean));
  // Newest at the bottom, like a conversation: open on it.
  requestAnimationFrame(() => { const last = list.lastElementChild; if (last) last.scrollIntoView({ block: 'end' }); });
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
      count > 1 ? el('button', { class: 'chip', 'aria-label': `Switch character (${count})`, onclick: go('sheet') }, icon('group', { size: 14 }), String(count)) : null),
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
      row('star', 'New session', 'Start a fresh page in the feed. No rules change.', () => { appendFeed({ kind: 'session' }); rerender(); }))],
  { sheet: true });
}
