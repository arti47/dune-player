// feed.js — the Play tab: the scene screen (2026-10-13; story feed since 2026-10-07).
//
// Play and journalling are one thing: the current scene (where · who · at stake), the story so far
// (rolls written as outcome sentences, your lines as prose, oracle answers, fight and task lines),
// and "What do you do?" choices — five skill verbs plus Write · Ask (solo) · Long effort · Fight ·
// End. Ended scenes read back as chapters; threads and NPCs/places live in a drawer. A compact head
// shows who you are, the pools and anything live. No rules live here: rolls go through the ritual →
// roller.js, scene/adventure ends through combat.runLifecycle; Chaos/oracle/scene check are the
// Journal's homebrew solo tools, shown only with solo play on.

import { el, dN } from './core.js';
import { icon, sceneBand } from './icons.js';
import { medallion } from './crests.js';
import { poolsHeader } from './sheet.js';
import { openRollRitual } from './ritual.js';
import { withSpark } from './spark.js';
import { runLifecycle } from './combat.js';
import { askOracle, answerText, yesChanceFor, sceneCheck, chaosAfterScene, rollEvent, eventLine, threadsCard, contactsCard } from './journal.js';
import { hookCard, npcCard } from './gm.js';
import { openOracle } from './oracle.js';
import { HELP } from '../data-help.js';
import { modal, showToast, undoToast, promptModal } from './ui.js';
import { help, setAppHelp } from './help.js';
import { startHouseWizard } from './wizard.js';
import { Settings } from './settings.js';
import {
  getFeed, appendFeed, removeFeed, restoreFeed, getRollLog, getConflict, getTasks, getJournal, getHouse,
  getStory, currentScene, beginScene, updateScene, endCurrentScene, setChaos, getCharacter, saveCharacter,
} from './store.js';
import { driveName } from './content.js';
import { DATA } from '../data.js';
import { ORACLE } from '../data-oracle.js';

const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const FEED_SHOWN = 80;

/** Merge rolls, feed events and (optionally) Journal entries into one time-ordered list. Pure. */
export function feedItems({ rolls = [], feed = [], entries = [], limit = FEED_SHOWN } = {}) {
  const all = [
    ...rolls.map((r) => ({ kind: 'roll', ts: r.ts || 0, r })),
    ...feed,
    ...entries.map((e) => ({ kind: 'entry', ts: e.ts || 0, e })),
  ].sort((a, b) => a.ts - b.ts);
  return limit ? all.slice(-limit) : all;
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
  if (!rolls) return { id: 'firstRoll', text: 'Pick what you do below — the app rolls and writes the result into the story.', action: 'Roll', go: 'roll' };
  if (!house && !dismissed.includes('house')) return { id: 'house', text: 'Your group has no House yet — it’s the shared home base for your characters.', action: 'Create a House', go: 'house', dismissible: true };
  return null;
}

// ===== Scene screen (2026-10-13) =====
// Play is one scene at a time, read like a story. Top: the scene (where · who · at stake).
// Middle: what has happened — rolls written as outcome sentences, your lines as prose, oracle
// answers, fight and task progress. Bottom: "What do you do?" — five verbs, one per skill, plus
// Write · Ask (solo) · Long effort · Fight · End. Every roll goes through the ritual → roller.js,
// so the rules are unchanged; the scene only decides where the result is written.
export function renderFeed(root, c, count, rerender) {
  setAppHelp(help('firstRun', 'What do I do here?'));
  const feed = getFeed();
  const scene = currentScene();
  const all = feedItems({ rolls: getRollLog(), feed, entries: Settings.journal() ? getJournal().entries : [], limit: 0 });
  const table = Settings.get('playView') === 'table';
  const lines = scene ? all.filter((it) => sceneOf(it) === scene.id) : [];
  const list = el('ol', { class: 'story', 'aria-label': 'This scene so far', 'aria-live': 'polite' },
    ...lines.map((it, i) => el('li', { class: `story-line kind-${it.kind}` }, ...lineBody(it, rerender, i === lines.length - 1 ? c : null))));
  root.append(...[
    head(c, count, { session: sessionInfo(feed).session, scene: scene ? scene.n : getStory().scenes.length + 1 }, rerender),
    table ? tableView(c, rerender) : null,
    scene ? sceneHeader(scene, rerender) : newSceneCard(c, rerender),
    scene && !table ? (lines.length ? list : el('p', { class: 'story-empty small muted' }, 'Nothing has happened yet. What do you do?')) : null,
    isNewSitting(all) && !welcomedBack ? beginCard(all, rerender) : null,
    nextUp(c, rerender, scene),
    scene ? choices(c, rerender) : null,
  ].filter(Boolean));
  // The newest line sits just above the choices, like the page of a book you are writing.
  requestAnimationFrame(() => { const last = list.lastElementChild; if (last) last.scrollIntoView({ block: 'end' }); });
}

/** Which scene a line belongs to (legacy lines have none). */
function sceneOf(it) { return it.kind === 'roll' ? it.r.sceneId : it.kind === 'entry' ? it.e.sceneId : it.sceneId; }

// ----- the scene: begin · header · read back -----
function newSceneCard(c, rerender) {
  const n = getStory().scenes.length + 1;
  const f = (label, ph) => el('input', { type: 'text', placeholder: ph, 'aria-label': label });
  const where = f('Where are you?', 'Where are you? (the Arrakeen palace, at night)');
  const who = f('Who is here?', 'Who is here? (Gurney, two guards)');
  const stakes = f('What is at stake?', 'What is at stake? (the Duke’s message)');
  const begin = (check) => () => {
    beginScene({ where: where.value.trim(), who: who.value.trim(), stakes: stakes.value.trim() });
    if (check) sceneCheckLine();
    rerender();
  };
  return el('section', { class: 'card scene-new' },
    sceneBand('play'),
    el('p', { class: 'eyebrow' }, `Scene ${n}`),
    el('h2', { class: 'scene-title' }, 'Set the scene'),
    withSpark(where, 'where', {}, 'Roll a place'), withSpark(who, 'who', {}, 'Roll who is here'), withSpark(stakes, 'stakes', {}, 'Roll what is at stake'),
    el('p', { class: 'small muted spark-note' }, 'Die: a Story Hook entry from the book; tap again for homebrew Meaning Table words.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: begin(false) }, icon('flag', { size: 18 }), ' Begin scene'),
      Settings.journal() ? el('button', { class: 'btn secondary', onclick: begin(true) }, 'Begin + scene check') : null),
    Settings.journal() ? el('p', { class: 'small muted' }, `Scene check rolls a d10 against Chaos ${getJournal().chaos} — homebrew solo tool.`) : null);
}

function sceneCheckLine() {
  const j = getJournal();
  const roll = dN(10);
  const outcome = sceneCheck(j.chaos, roll);
  const o = ORACLE.chaos.outcomes[outcome];
  const ev = outcome === 'interrupted' ? rollEvent(j) : null;
  appendFeed({ kind: 'check', text: `Scene check: ${o.label} — ${o.desc}`, detail: `d10 ${roll} vs Chaos ${j.chaos}`, event: ev ? eventLine(ev) : null });
}

function sceneHeader(scene, rerender) {
  const j = getJournal();
  return el('section', { class: 'card scene-head' },
    el('div', { class: 'scene-head-top' },
      el('p', { class: 'eyebrow' }, `Scene ${scene.n}`),
      Settings.journal() ? el('button', { class: 'chip', 'aria-label': `Chaos Factor ${j.chaos} — adjust`, onclick: () => chaosSheet(rerender) },
        icon('chaos', { size: 14 }), `Chaos ${j.chaos}`) : null),
    el('h2', { class: 'scene-title' }, scene.where || 'An unnamed place'),
    scene.who ? el('p', { class: 'scene-meta' }, el('span', { class: 'muted' }, 'Here: '), scene.who) : null,
    scene.stakes ? el('p', { class: 'scene-meta' }, el('span', { class: 'muted' }, 'At stake: '), scene.stakes) : null,
    el('div', { class: 'scene-tools' },
      el('button', { class: 'chip', onclick: () => editScene(scene, rerender) }, icon('pencil', { size: 14 }), 'Edit'),
      el('button', { class: 'chip', onclick: () => chaptersSheet() }, icon('scroll', { size: 14 }), 'Story so far'),
      el('button', { class: 'chip', onclick: () => notesDrawer(rerender) }, icon('list', { size: 14 }), 'Threads & people')));
}

function editScene(scene, rerender) {
  const f = (label, v) => { const i = el('input', { type: 'text', 'aria-label': label, placeholder: label }); i.value = v || ''; return i; };
  const where = f('Where are you?', scene.where), who = f('Who is here?', scene.who), stakes = f('What is at stake?', scene.stakes);
  const close = modal([el('h2', {}, `Scene ${scene.n}`), withSpark(where, 'where', {}, 'Roll a place'), withSpark(who, 'who', {}, 'Roll who is here'), withSpark(stakes, 'stakes', {}, 'Roll what is at stake'),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: () => {
        updateScene(scene.id, { where: where.value.trim(), who: who.value.trim(), stakes: stakes.value.trim() }); close(); rerender();
      } }, 'Save'))], { sheet: true });
}

function chaosSheet(rerender) {
  const val = el('span', { class: 'pool-sheet-val num' }, String(getJournal().chaos));
  const bump = (d) => () => { setChaos(getJournal().chaos + d); val.textContent = String(getJournal().chaos); };
  modal([el('h2', {}, 'Chaos Factor'), el('p', { class: 'small' }, ORACLE.chaos.note),
    el('div', { class: 'pool-sheet-step' },
      el('button', { class: 'step-btn big', 'aria-label': 'Lower Chaos', onclick: bump(-1) }, '−'), val,
      el('button', { class: 'step-btn big', 'aria-label': 'Raise Chaos', onclick: bump(1) }, '+')),
    el('p', { class: 'small muted' }, 'Homebrew solo tool, not official rules.')], { sheet: true, onClose: rerender });
}

/** Threads and NPCs & places, folded in from the old Journal tab, plus opposition and sparks. */
function notesDrawer(rerender) {
  const box = el('div', {});
  const draw = () => { const j = getJournal(); box.replaceChildren(threadsCard(j, draw), contactsCard(j, draw), hookCard(), npcCard()); };
  draw();
  modal([el('h2', {}, 'Threads & people'), box], { sheet: true, onClose: rerender });
}

/** Read back the story chapter by chapter (each ended scene is a chapter). */
function chaptersSheet() {
  const scenes = getStory().scenes;
  const all = feedItems({ rolls: getRollLog(), feed: getFeed(), entries: getJournal().entries, limit: 0 });
  const legacy = all.filter((it) => !sceneOf(it));
  const read = (title, items) => () => modal([el('h2', {}, title),
    items.length ? el('ol', { class: 'story reading' }, ...items.map((it) => el('li', { class: `story-line kind-${it.kind}` }, ...lineBody(it, null, null))))
      : el('p', { class: 'small muted' }, 'Nothing was recorded in this scene.')], { sheet: true });
  const row = (title, sub, items) => el('li', {}, el('button', { class: 'more-row', onclick: read(title, items) },
    el('span', { class: 'more-text' }, el('strong', {}, title), el('span', { class: 'small muted' }, sub)),
    el('span', { class: 'more-chev', 'aria-hidden': 'true' }, '›')));
  modal([el('h2', {}, 'The story so far'),
    el('ul', { class: 'more-list chapters' }, ...[
      legacy.length ? row('Before chapters', `${legacy.length} earlier lines`, legacy) : null,
      ...scenes.map((sc) => {
        const items = all.filter((it) => sceneOf(it) === sc.id);
        return row(`Chapter ${sc.n} · ${sc.where || 'An unnamed place'}`,
          [sc.stakes ? `At stake: ${sc.stakes}` : null, sc.ended ? `${items.length} lines` : 'Now playing'].filter(Boolean).join(' · '), items);
      }),
    ].filter(Boolean))], { sheet: true });
}

// ----- story lines -----
/** One line of the story. `narrateFor` (the character) adds the "say what happened" box under the
 *  newest roll; read-back passes null. */
function lineBody(it, rerender, narrateFor) {
  if (it.kind === 'roll') return rollLine(it.r, rerender, narrateFor);
  if (it.kind === 'note' || it.kind === 'frame') {
    const del = rerender ? el('button', { class: 'fi-x', 'aria-label': 'Remove line', onclick: () => {
      const all = getFeed(); removeFeed(it.id); rerender();
      undoToast('Line removed', () => { restoreFeed(all); rerender(); });
    } }, icon('close', { size: 14 })) : null;
    return [el('p', { class: 'story-prose' + (it.kind === 'frame' ? ' frame' : '') }, it.text, del)];
  }
  if (it.kind === 'oracle') {
    return [el('p', { class: 'story-sys' }, icon('oracle', { size: 14 }), ` ${it.question ? `“${it.question}” — ` : 'Oracle — '}`,
      el('strong', { class: it.yes ? 'yes' : 'no' }, it.answer)),
    el('p', { class: 'small muted story-sub' }, `${it.tierLabel} ${it.chance}% · rolled ${it.roll} · homebrew oracle`)];
  }
  if (it.kind === 'check') {
    return [el('p', { class: 'story-sys' }, icon('chaos', { size: 14 }), ` ${it.text}`),
      it.event ? el('p', { class: 'small story-sub' }, it.event) : null,
      el('p', { class: 'small muted story-sub' }, `${it.detail} · homebrew solo tool`)];
  }
  if (it.kind === 'combat' || it.kind === 'task') {
    return [el('p', { class: 'story-sys' }, icon(it.kind === 'combat' ? 'swords' : 'hourglass', { size: 14 }), ` ${it.text}`)];
  }
  if (it.kind === 'entry') {
    return [it.e.title ? el('p', { class: 'story-sys' }, icon('scroll', { size: 14 }), ` ${it.e.title}`) : null, el('p', { class: 'story-prose' }, it.e.body)];
  }
  // scene / adventure end, session start
  const label = it.kind === 'session' ? `Session · ${new Date(it.ts).toLocaleDateString()}` : it.text;
  return [el('div', { class: 'fi-divider' }, el('span', {}, label)),
    it.summary && it.summary.length ? el('details', { class: 'fi-summary' }, el('summary', { class: 'small muted' }, 'What changed'),
      el('ul', { class: 'small' }, ...it.summary.map((s) => el('li', {}, s)))) : null];
}

/** A roll as an outcome sentence (from the real result), the dice, and — under the newest roll —
 *  a box to say what happened, plus a prompt to name a complication as a trait (§3.6). */
function rollLine(r, rerender, narrateFor) {
  const passed = /^Success|Automatic success/.test(r.note || '');
  const who = r.characterName || 'You';
  const verb = (HELP.verbs || {})[r.skill];
  const did = r.action ? `tried to ${r.action}` : `${verb ? verb.toLowerCase() : 'tested'} (${SKILL_NAME[r.skill] || r.skill} + ${driveName(r.drive)})`;
  const facts = [`${r.successes} success${r.successes === 1 ? '' : 'es'}`, `TN ${r.tn}`,
    r.momentumDelta ? `${r.momentumDelta > 0 ? '+' : ''}${r.momentumDelta} Momentum` : null,
    r.threatDelta ? `${r.threatDelta > 0 ? '+' : ''}${r.threatDelta} Threat` : null,
    r.complications ? `${r.complications} complication${r.complications === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');
  const out = [
    el('p', { class: 'story-roll' },
      el('span', { class: 'story-verdict ' + (passed ? 'ok' : 'bad') }, passed ? '✓' : '✗'),
      el('span', {}, el('strong', {}, who), ` ${did} — `, el('strong', { class: passed ? 'yes' : 'no' }, passed ? 'success' : 'failure'), '.')),
    el('div', { class: 'story-sub fi-dice-row' },
      el('span', { class: 'fi-dice' }, ...(r.dice || []).map((v) => el('span', { class: 'fi-die' + (v === 1 ? ' crit' : v >= 20 ? ' comp' : v <= r.tn ? ' hit' : '') }, String(v)))),
      el('span', { class: 'small muted' }, facts)),
  ];
  if (narrateFor && rerender) {
    const say = el('input', { type: 'text', placeholder: passed ? 'Say what happened…' : 'Say how it went wrong…', 'aria-label': 'Say what happened' });
    const post = () => { if (!say.value.trim()) return; appendFeed({ kind: 'note', text: say.value.trim(), characterName: narrateFor.identity.name || '' }); rerender(); };
    say.addEventListener('keydown', (e) => { if (e.key === 'Enter') post(); });
    out.push(el('div', { class: 'narrate' }, withSpark(say, 'story', {}, 'Roll homebrew words'), el('button', { class: 'btn btn-sm', onclick: post }, 'Add')));
    if (r.complications) out.push(el('button', { class: 'chip narrate-comp', onclick: async () => {
      const name = await promptModal('Name the complication — it becomes a trait on your character until it stops being true.', { placeholder: 'e.g. Twisted ankle', okLabel: 'Add trait', wrap: (i) => withSpark(i, 'complication', { skill: r.skill }, 'Roll a complication from the book') });
      if (!name) return;
      const ch = getCharacter(narrateFor.id) || narrateFor;
      saveCharacter({ ...ch, traits: [...(ch.traits || []), { name, negative: true, source: 'complication' }] });
      appendFeed({ kind: 'note', text: `Complication: ${name}.`, characterName: ch.identity.name || '' });
      rerender();
    } }, icon('plus', { size: 14 }), 'Name the complication'));
  }
  return out;
}

// ----- choices: what do you do? -----
const SKILL_ICO = { battle: 'swords', communicate: 'group', discipline: 'shield', move: 'up', understand: 'compass' };
function choices(c, rerender) {
  const verb = (s) => el('button', { class: 'verb', 'aria-label': `${HELP.verbs[s.id]} — ${s.name} ${c.skills[s.id]}`,
    onclick: () => openRollRitual(c, rerender, { skill: s.id, verb: HELP.verbs[s.id] }) },
    icon(SKILL_ICO[s.id] || 'd20', { size: 20 }), el('span', { class: 'verb-name' }, HELP.verbs[s.id]),
    el('span', { class: 'verb-num num' }, String(c.skills[s.id])));
  const chip = (ico, label, fn) => el('button', { class: 'chip', onclick: fn }, icon(ico, { size: 14 }), label);
  const go = (id) => () => { location.hash = `#/${id}`; };
  return el('nav', { class: 'choice-dock', 'aria-label': 'What do you do?' },
    el('p', { class: 'choice-q' }, 'What do you do?'),
    el('div', { class: 'verbs' }, ...DATA.skills.map(verb)),
    el('div', { class: 'choice-more' },
      chip('pencil', 'Write', () => noteSheet(c, rerender)),
      Settings.journal() ? chip('oracle', 'Ask', () => askSheet(rerender)) : null,
      Settings.oracle() ? chip('star', 'Spark', () => { openOracle(); }) : null,
      chip('hourglass', 'Long effort', go('tasks')),
      chip('swords', 'Fight', go('conflict')),
      chip('flag', 'End', () => endSheet(rerender))));
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
/** End scene: (solo) were you in control? → Chaos ±1; then the §3.17 rules bundle, and the scene
 *  closes as a chapter. One Undo takes back all of it. */
async function endScene(rerender) {
  const solo = Settings.journal();
  const before = getJournal().chaos;
  let inControl = null;
  if (solo) { inControl = await askInControl(); if (inControl == null) return; }
  const scene = currentScene();
  await runLifecycle('scene', rerender, {
    before: () => { endCurrentScene(); if (solo) setChaos(chaosAfterScene(before, inControl)); },
    undo: () => { if (scene) updateScene(scene.id, { ended: false, endTs: null }); if (solo) setChaos(before); },
  });
}
function askInControl() {
  return new Promise((resolve) => {
    let done = false;
    const answer = (v) => () => { done = true; close(); resolve(v); };
    const close = modal([el('h2', {}, 'End of scene'),
      el('p', {}, 'Were you in control as the scene ended? In control lowers Chaos; out of control raises it (homebrew).'),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: answer(null) }, 'Cancel'),
        el('button', { class: 'btn secondary', onclick: answer(false) }, 'Not in control (+1)'),
        el('button', { class: 'btn', onclick: answer(true) }, 'In control (−1)'))],
    { onClose: () => { if (!done) resolve(null); } });
  });
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

function nextUp(c, rerender, scene) {
  const dismissed = Settings.get('homeDismissed') || [];
  const n = nextUpFor(c, { house: getHouse(), rolls: getRollLog().length, dismissed });
  if (!n || (n.id === 'firstRoll' && !scene)) return null;   // set the scene first; then the choices appear
  const go = () => n.go === 'roll' ? openRollRitual(c, rerender) : n.go === 'house' ? startHouseWizard() : (location.hash = `#/${n.go}`);
  return el('div', { class: 'feed-next' },
    icon('flag', { size: 16 }),
    el('span', { class: 'feed-next-text' }, n.text),
    el('button', { class: 'chip on', onclick: go }, n.action),
    n.dismissible ? el('button', { class: 'chip', onclick: () => { Settings.set('homeDismissed', [...dismissed, n.id]); rerender(); } }, 'Not now') : null);
}

function noteSheet(c, rerender) {
  const text = el('textarea', { rows: '3', placeholder: 'What happens? Write it in your own words.', 'aria-label': 'Story line' });
  const post = (kind) => () => {
    if (!text.value.trim()) { showToast('Write something first'); return; }
    appendFeed({ kind, text: text.value.trim(), characterName: c.identity.name || '' });
    close(); rerender();
  };
  const close = modal([el('h2', {}, 'Write the story'), withSpark(text, 'story', {}, 'Roll homebrew words'),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: post('note') }, 'Add to the story'))], { sheet: true });
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
      row('hourglass', 'End scene', `Close this chapter. Momentum −${DATA.momentumRules.sceneDecay}, temporary assets expire.`, () => endScene(rerender)),
      row('flag', 'End adventure', 'Determination resets, challenged statements recover.', () => runLifecycle('adventure', rerender)),
      row('star', 'New session', 'See a recap, then start a fresh page. No rules change.', () => newSession(rerender)))],
  { sheet: true });
}
