// combat.js — Phase 4 in-play systems. Currently: the scene/adventure lifecycle engine
// (§3.17) — the app owns these events. The shared conflict tracker (5 types, zones,
// initiative passing, defeat flow) and the generic extended-task tracker land alongside.
//
// Lifecycle (§3.17):
//   End scene   — Momentum −1; temporary assets expire (permanent === false); Resist Defeat resets.
//   End adventure — Determination resets to start (1 + bonus talents, cap 3); challenged drive
//                   statements recover; the advance-purchase gate resets; temp assets expire.
// Both apply immediately with a summary + one-step Undo (snapshot/restore).

import { el, uid, d20 } from './core.js';
import { modal, showToast, showActionToast, confirmModal, promptModal, undoToast, actionChip } from './ui.js';
import { HELP } from '../data-help.js';
import {
  getPools, savePools, listCharacters, currentCharacterId, setCurrentCharacterId, getCharacter, saveCharacter, getTasks, saveTasks, getConflict, saveConflict, appendFeed, removeFeed,
} from './store.js';
import { clampMomentum, clampDetermination, hasSupportingStatement } from './derived.js';
import { cite } from './cite.js';
import { help, helpFrom } from './help.js';
import { icon, emptyState } from './icons.js';
import { expansionNpcs, driveName } from './content.js';
import { evaluateDice } from './roller.js';
import { DATA } from '../data.js';
import { NPCS } from '../data-npcs.js';

/** A compact −/value/+ stepper (local copy; combat.js has no sheet import). */
function stepper(value, onChange, { min = 0, max = 99, label = '' } = {}) {
  const dec = el('button', { class: 'step-btn', 'aria-label': `Decrease ${label}`, onclick: () => onChange(Math.max(min, value - 1)) }, '−');
  const inc = el('button', { class: 'step-btn', 'aria-label': `Increase ${label}`, onclick: () => onChange(Math.min(max, value + 1)) }, '+');
  if (value <= min) dec.disabled = true;
  if (value >= max) inc.disabled = true;
  return el('div', { class: 'stepper' }, dec, el('span', { class: 'stat-val' }, String(value)), inc);
}

/** Determination at the start of an adventure: 1 + any bonusDeterminationAtStart talents, cap 3. */
export function startAdventureDetermination(character) {
  let base = DATA.determination.startPerAdventure;
  for (const owned of character.talents || []) {
    const def = DATA.talents.find((d) => d.name === owned.name);
    if (def?.auto?.type === 'bonusDeterminationAtStart') base += def.auto.count || 0;
  }
  return clampDetermination(base);
}

function snapshot() {
  return {
    pools: { ...getPools() },
    chars: listCharacters().map((c) => JSON.parse(JSON.stringify(c))),
  };
}
function restore(snap) {
  savePools(snap.pools);
  snap.chars.forEach((c) => saveCharacter(c));
}

/** End of scene (§3.17). Returns { summary:[…], undo }. */
export function endScene() {
  const snap = snapshot();
  const pools = getPools();
  const newMomentum = clampMomentum(pools.momentum - DATA.momentumRules.sceneDecay);
  savePools({ ...pools, momentum: newMomentum });

  let tempExpired = 0, resistReset = 0, challengedRemaining = 0;
  for (const c of listCharacters()) {
    const kept = (c.assets || []).filter((a) => a.permanent !== false);   // only explicit temp assets expire
    const removed = (c.assets || []).length - kept.length;
    const hadResist = !!c.state?.resistUsedThisScene;
    challengedRemaining += Object.values(c.driveStatements || {}).filter((s) => s.challenged).length;
    if (removed || hadResist) {
      saveCharacter({ ...c, assets: kept, state: { ...c.state, resistUsedThisScene: false } });
      tempExpired += removed;
      if (hadResist) resistReset += 1;
    }
  }

  const summary = [
    `Momentum ${pools.momentum} → ${newMomentum}`,
    tempExpired ? `${tempExpired} temporary asset${tempExpired === 1 ? '' : 's'} expired` : 'No temporary assets to expire',
    resistReset ? `Resist Defeat reset for ${resistReset} character${resistReset === 1 ? '' : 's'}` : 'Resist Defeat already available',
    challengedRemaining ? `Reminder: ${challengedRemaining} challenged statement${challengedRemaining === 1 ? '' : 's'} may recover on reflection (§3.8)` : null,
  ].filter(Boolean);
  return { summary, undo: () => restore(snap) };
}

/** End of adventure (§3.17): wrap up + reset for the next adventure. Returns { summary, undo }. */
export function endAdventure() {
  const snap = snapshot();
  let recovered = 0, tempExpired = 0;
  for (const c of listCharacters()) {
    const stmts = { ...(c.driveStatements || {}) };
    let rec = 0;
    for (const k of Object.keys(stmts)) if (stmts[k].challenged) { stmts[k] = { ...stmts[k], challenged: false }; rec += 1; }
    const kept = (c.assets || []).filter((a) => a.permanent !== false);
    tempExpired += (c.assets || []).length - kept.length;
    recovered += rec;
    saveCharacter({
      ...c, driveStatements: stmts, assets: kept,
      determination: startAdventureDetermination(c),
      state: { ...c.state, resistUsedThisScene: false },
      advancement: { ...c.advancement, advancesPurchasedThisAdventure: 0 },
    });
  }
  const summary = [
    `Determination reset to start (cap ${DATA.determination.cap})`,
    recovered ? `${recovered} challenged statement${recovered === 1 ? '' : 's'} recovered` : 'No challenged statements to recover',
    'Advance-purchase gate reset',
    tempExpired ? `${tempExpired} temporary asset${tempExpired === 1 ? '' : 's'} expired` : null,
  ].filter(Boolean);
  return { summary, undo: () => restore(snap) };
}

// ---------- UI: the lifecycle card on the sheet ----------
function showSummary(title, summary, undo, onChange) {
  let undone = false;
  const close = modal([
    el('h2', {}, title),
    el('ul', {}, ...summary.map((s) => el('li', { class: 'small' }, s))),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => {
        if (!undone) { undo(); undone = true; onChange && onChange(); showToast('Undone'); }
        close();
      } }, 'Undo'),
      el('button', { class: 'btn', onclick: () => close() }, 'Done')),
  ]);
}

const LIFECYCLE_ACTIONS = {
  scene: ['End scene', () => endScene(),
    'End the scene? Momentum −1, temporary assets expire, and Resist Defeat resets for everyone.'],
  adventure: ['End adventure', () => endAdventure(),
    'End the adventure? Determination resets to its start value, challenged statements recover, and the advance-purchase gate resets.'],
};

/** Confirm → apply → summary with one-step Undo. Shared by the Scene card and Home's quick action. */
export async function runLifecycle(kind, onChange) {
  const [label, applyFn, confirmMsg] = LIFECYCLE_ACTIONS[kind];
  if (!await confirmModal(confirmMsg, { okLabel: label })) return;
  const { summary, undo } = applyFn();
  // Story feed: the scene/adventure end posts a divider; Undo takes it back out.
  const ev = appendFeed({ kind, text: label, summary });
  onChange && onChange();
  showSummary(label, summary, () => { undo(); removeFeed(ev.id); }, onChange);
}

/** A card with the End scene / End adventure controls. `onChange` re-renders the caller. */
export function renderLifecycle(onChange) {
  const control = (kind) => el('button', { class: 'btn secondary', onclick: () => runLifecycle(kind, onChange) },
    LIFECYCLE_ACTIONS[kind][0]);

  return el('section', { class: 'card' },
    el('h3', {}, 'Scene & adventure', cite('Scene & adventure lifecycle')),
    help('lifecycle'),
    el('p', { class: 'small muted' }, 'End-of-scene and end-of-adventure bookkeeping (§3.17). Each shows what changed with one-step Undo.'),
    el('div', { class: 'cta-row' },
      control('scene'),
      control('adventure')));
}

// ---------- Generic extended-task tracker (§3.1) ----------
/** Points scored on one passed test: base (2) + applicable asset Quality + Momentum-added
 *  points − points lost to a complication. Floored at 0. */
export function scoreExtendedTask({ assetQuality = 0, momentumPoints = 0, complicationPoints = 0 } = {}) {
  return Math.max(0, DATA.extendedTask.basePoints + assetQuality + momentumPoints - complicationPoints);
}

function newTaskDialog(onChange, preset = {}) {
  const name = el('input', { type: 'text', placeholder: 'e.g. Recovery, Ride the worm, Repair the ’thopter', value: preset.name || '' });
  let req = preset.requirement || 4;
  const reqBox = el('div', {});
  const drawReq = () => reqBox.replaceChildren(stepper(req, (v) => { req = v; drawReq(); }, { min: 1, max: 40, label: 'requirement' }));
  drawReq();
  const save = () => {
    const n = name.value.trim();
    if (!n) { showToast('Name the task.'); return; }
    saveTasks([...getTasks(), { id: uid(), name: n, requirement: req, progress: 0, contributors: [], log: [] }]);
    close(); onChange && onChange();
  };
  const close = modal([
    el('h2', {}, 'New extended task'),
    el('label', { class: 'field' }, el('span', {}, 'Name'), name),
    el('div', { class: 'field' }, el('span', {}, 'Requirement (points to complete)'), reqBox),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: save }, 'Create')),
  ]);
  name.focus();
}

function recordSuccessDialog(task, onChange) {
  const s = { assetQuality: 0, momentumPoints: 0, complicationPoints: 0 };
  const box = el('div', {});
  const draw = () => {
    const pts = scoreExtendedTask(s);
    box.replaceChildren(
      el('div', { class: 'field' }, el('span', {}, 'Applicable asset Quality'), stepper(s.assetQuality, (v) => { s.assetQuality = v; draw(); }, { min: 0, max: 5, label: 'quality' })),
      el('div', { class: 'field' }, el('span', {}, 'Points added by Momentum'), stepper(s.momentumPoints, (v) => { s.momentumPoints = v; draw(); }, { min: 0, max: 12, label: 'momentum points' })),
      el('div', { class: 'field' }, el('span', {}, 'Points lost to a complication'), stepper(s.complicationPoints, (v) => { s.complicationPoints = v; draw(); }, { min: 0, max: 12, label: 'complication points' })),
      el('p', {}, el('span', { class: 'pill' }, `Scores ${pts} point${pts === 1 ? '' : 's'} (base ${DATA.extendedTask.basePoints})`)));
  };
  draw();
  const apply = () => {
    const pts = scoreExtendedTask(s);
    const tasks = getTasks().map((t) => t.id === task.id
      ? { ...t, progress: t.progress + pts, log: [...(t.log || []), `+${pts} (Q${s.assetQuality}${s.momentumPoints ? ` +${s.momentumPoints}M` : ''}${s.complicationPoints ? ` −${s.complicationPoints}comp` : ''})`] }
      : t);
    saveTasks(tasks);
    close(); onChange && onChange();
    const done = tasks.find((t) => t.id === task.id);
    showToast(done.progress >= done.requirement ? 'Task complete!' : `+${pts} progress`);
  };
  const close = modal([
    el('h2', {}, `Record a success — ${task.name}`),
    box,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: apply }, 'Add progress')),
  ]);
}

function taskRow(task, onChange) {
  const done = task.progress >= task.requirement;
  const pct = Math.min(100, Math.round((task.progress / Math.max(1, task.requirement)) * 100));
  return el('li', { class: 'task-item' + (done ? ' done' : '') },
    el('div', { class: 'task-head' },
      el('span', { class: 'task-ico' }, icon(/sandworm/i.test(task.name) ? 'worm' : 'hourglass', { size: 18 })),
      el('strong', {}, task.name),
      done ? el('span', { class: 'tag' }, 'complete') : null,
      el('button', { class: 'chip chip-icon', 'aria-label': `Delete ${task.name}`, title: 'Delete',
        onclick: () => {
          const before = getTasks(); saveTasks(before.filter((t) => t.id !== task.id)); onChange && onChange();
          undoToast(`Deleted ${task.name}`, () => { saveTasks(before); onChange && onChange(); });
        } }, icon('trash', { size: 14 }))),
    // Audit 2: the track is drawn as worm segments — one per point of the requirement (max 20).
    el('div', { class: 'task-bar worm', style: `--seg:${Math.min(20, Math.max(1, task.requirement))}` },
      el('div', { class: 'task-fill', style: `width:${pct}%` })),
    el('div', { class: 'task-foot' },
      el('span', { class: 'small muted' }, `${task.progress} / ${task.requirement}`),
      el('button', { class: 'btn small secondary', onclick: () => recordSuccessDialog(task, onChange) }, 'Record success')));
}

/** The extended-tasks card. `onChange` re-renders the caller. */
export function renderTasks(onChange) {
  const tasks = getTasks();
  return el('section', { class: 'card' },
    el('h3', {}, 'Extended tasks', cite('Extended tasks')),
    help('tasks'),
    el('p', { class: 'small muted' }, 'Shared progress tracks — recovery, sandworm riding, projects. Each success scores 2 + an applicable asset’s Quality (§3.1); Momentum adds points, a complication subtracts.'),
    el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: () => newTaskDialog(onChange) }, '+ New task')),
    tasks.length ? el('ul', { class: 'task-list' }, ...tasks.map((t) => taskRow(t, onChange))) : taskStarters(onChange));
}

/** Empty Tasks (round 2 #8): what a task is for + one-tap starters built from the rules data. */
function taskStarters(onChange) {
  const add = (name, requirement) => {
    saveTasks([...getTasks(), { id: uid(), name, requirement, progress: 0, contributors: [], log: [] }]);
    showToast(`${name} — requirement ${requirement}`);
    onChange && onChange();
  };
  return el('div', { class: 'starter' },
    emptyState('hourglass', HELP.starters.tasks),
    el('p', { class: 'starter-label' }, 'Ride a sandworm', cite('Sandworm riding')),
    el('div', { class: 'starter-chips' }, ...DATA.sandwormRiding.map((w) =>
      el('button', { class: 'keep-chip', onclick: () => add(`Ride a sandworm — ${w.size}`, w.requirement) },
        `${w.size} · ${w.requirement}`))),
    el('p', { class: 'starter-label' }, 'Other starters'),
    el('div', { class: 'starter-chips' },
      el('button', { class: 'keep-chip', onclick: () => newTaskDialog(onChange, { name: 'Recover a defeated ally', requirement: DATA.defeat.recovery.normal.requirementBase }) },
        `Recover an ally · ${DATA.defeat.recovery.normal.requirementBase} + Quality`),
      el('button', { class: 'keep-chip', onclick: () => newTaskDialog(onChange) }, 'Custom task')));
}

// ---------- Guided defeat procedure + recovery (§3.7/§3.8) ----------
export function renderDefeat(character, onChange) {
  const st = character.state || {};
  const track = st.defeatTrack || { req: 0, progress: 0 };
  const defeated = !!st.defeated;
  const save = (patch) => { saveCharacter({ ...character, state: { ...st, ...patch } }); onChange && onChange(); };

  const recordHit = async () => {
    const q = await promptModal('Attacking asset Quality (0–5)?', { value: '0' });
    if (q == null) return;
    const quality = Math.max(0, Math.min(5, Number(q) || 0));
    const gain = DATA.defeat.pointsPerHitBase + quality;   // 2 + attacker asset Quality
    const progress = track.progress + gain;
    const nowDefeated = track.req >= 1 && progress >= track.req;
    save({ defeatTrack: { ...track, progress }, defeated: nowDefeated || defeated });
    showToast(nowDefeated ? `Hit for ${gain} — defeated!` : `Hit for ${gain}`);
  };

  const resist = async () => {
    const pools = getPools();
    if (pools.momentum < DATA.defeat.resistDefeat.momentumCost) { showToast('Not enough Momentum to Resist (1 + attacker Quality).'); return; }
    const comp = await promptModal('Resist Defeat — describe the complication you suffer:', { value: 'Wounded' });
    if (comp == null) return;
    savePools({ ...pools, momentum: clampMomentum(pools.momentum - DATA.defeat.resistDefeat.momentumCost) });
    saveCharacter({
      ...character,
      traits: [...(character.traits || []), { name: comp || 'Complication', negative: true, source: 'play' }],
      state: { ...st, defeated: false, resistUsedThisScene: true, painAwarded: false, defeatTrack: { ...track, progress: 0 } },
    });
    showToast('Resisted defeat — stayed in the scene');
    onChange && onChange();
  };

  const startRecovery = async () => {
    const q = await promptModal('Defeating asset Quality (for recovery requirement 4 + Quality)?', { value: '0' });
    if (q == null) return;
    const quality = Math.max(0, Math.min(5, Number(q) || 0));
    const req = DATA.defeat.recovery.normal.requirementBase + quality;
    saveTasks([...getTasks(), { id: uid(), name: `Recovery — ${character.identity.name || 'character'}`, requirement: req, progress: 0, contributors: [], log: [] }]);
    // Link: the recovery task lives on Table → Tasks, where allies record their successes.
    { const dismiss = showActionToast(`Recovery task created (requirement ${req}).`, 'Open Tasks', (d) => { d(); location.hash = '#/tasks'; }); setTimeout(dismiss, 8000); }
    onChange && onChange();
  };

  const guided = [];
  if (defeated && !st.painAwarded) {
    // Link defeat → advancement (§3.10): being defeated in a conflict earns 1 point ("Pain").
    const pain = DATA.advancement.earn.find((e) => e.trigger === 'Pain');
    if (pain) guided.push(el('button', { class: 'btn secondary', onclick: () => {
      const adv = character.advancement || { points: 0, log: [] };
      saveCharacter({ ...character, state: { ...st, painAwarded: true },
        advancement: { ...adv, points: (adv.points || 0) + pain.points,
          log: [...(adv.log || []), `${new Date().toISOString().slice(0, 10)} · Earned +${pain.points} (${pain.trigger})`] } });
      showToast(`+${pain.points} advancement (${pain.trigger} — ${pain.desc.toLowerCase()})`); onChange && onChange();
    } }, `+${pain.points} advancement (${pain.trigger})`));
  }
  if (defeated) {
    if (!st.resistUsedThisScene && !st.lastingDefeat) {
      guided.push(el('button', { class: 'btn secondary', onclick: resist }, 'Resist Defeat (1 Momentum + complication)'));
    }
    const lastingBox = el('input', { type: 'checkbox', id: 'def-lasting' });
    lastingBox.checked = !!st.lastingDefeat;
    lastingBox.addEventListener('change', () => save({ lastingDefeat: lastingBox.checked, stabilized: false }));
    guided.push(el('label', { class: 'toggle-row', for: 'def-lasting' },
      el('span', {}, `Lasting defeat (attacker spent ${DATA.defeat.lastingDefeatMomentumCost} Momentum) — ${DATA.conflictTypes[0].lastingDefeat}…`), lastingBox));
    if (st.lastingDefeat && !st.stabilized) {
      guided.push(el('button', { class: 'btn secondary', onclick: () => { save({ stabilized: true }); showToast('Stabilized (ally Difficulty 2) — permanent effect prevented'); } },
        `Stabilize — ally Difficulty ${DATA.defeat.recovery.lasting.difficulty} test`));
    }
    if (st.stabilized) guided.push(el('p', { class: 'small muted' }, DATA.defeat.recovery.lasting.outcome));
    guided.push(el('button', { class: 'btn secondary', onclick: startRecovery }, 'Start recovery task (4 + Quality)'));
    guided.push(el('button', { class: 'btn secondary', onclick: () => save({ defeated: false, lastingDefeat: false, stabilized: false, painAwarded: false, defeatTrack: { ...track, progress: 0 } }) }, 'Clear defeat'));
  }

  // Audit 2: just the bar + actions; the formula lives in the "?" sheet. Folds to one line while
  // nothing is happening (no hits, not defeated), opens itself once the track is in play.
  const live = defeated || track.progress > 0 || !!st.lastingDefeat;
  const pct = Math.min(100, Math.round((track.progress / Math.max(1, track.req)) * 100));
  const d = el('details', { class: 'defeat-block' + (defeated ? ' is-defeated' : '') },
    el('summary', {},
      el('h4', {}, icon('shield', { size: 16 }), 'Defeat',
        el('span', { class: 'defeat-sum num' + (defeated ? ' danger-text' : '') }, `${track.progress} / ${track.req || '—'}${defeated ? ' · DEFEATED' : ''}`),
        cite('Defeat & recovery')),
      helpFrom(HELP.defeat, 'How to use', () => el('p', { class: 'small muted' },
        'Track = defender skill + defensive asset Quality; each hit scores 2 + attacker asset Quality (§3.7).'))),
    el('div', { class: 'task-bar defeat-bar' }, el('div', { class: 'task-fill' + (defeated ? ' danger' : ''), style: `width:${pct}%` })),
    el('div', { class: 'task-foot' },
      el('span', { class: 'small muted' }, 'Requirement'),
      stepper(track.req, (v) => save({ defeatTrack: { ...track, req: v } }), { min: 0, max: 40, label: 'requirement' }),
      el('button', { class: 'btn small secondary', onclick: recordHit }, 'Record a hit')),
    st.resistUsedThisScene ? el('p', { class: 'small muted' }, 'Resist Defeat used this scene (resets at End scene).') : null,
    ...guided);
  d.open = live;
  return d;
}

// ---------- Local conflict helper (§3.12) ----------
// A single-device tracker for the 5 conflict types: zones, sides, round + initiative passing
// (Keep-the-Initiative not-twice-in-a-row, last-actor-picks-opener), per-combatant defeat
// tracks, and drop-in NPCs from the compendium. Two-way pending-contest sync is Phase 5.

export function opposingSide(s) { return s === 'a' ? 'b' : 'a'; }

/** Default defeat-track requirement for a dropped-in NPC by tier (minor = one hit). */
function npcDefaultReq(tier) { return tier === 'minor' ? 1 : tier === 'major' ? 7 : 5; }

/** §3.7 defeat-track requirement ≈ the defender's relevant (defence) skill + defensive asset
 *  Quality. Defaults to the conflict type's first defence skill; assets are added by the GM. */
export function defeatRequirementFor(character, conflictTypeId) {
  const t = DATA.conflictTypes.find((x) => x.id === conflictTypeId);
  const defSkill = (t && t.defendSkills && t.defendSkills[0]) || 'discipline';
  return (character.skills && character.skills[defSkill]) || 0;
}

export function startConflict(type) {
  return {
    active: true, type, round: 1,
    zones: [{ id: uid(), name: 'Zone 1' }, { id: uid(), name: 'Zone 2' }],
    currentSide: 'a', keptInitiative: false, lastActorId: null,
    combatants: [],
  };
}

/** A combatant takes their turn. `keep` = Keep the Initiative (only if not kept last turn). */
export function takeTurn(conflict, actorId, keep = false) {
  const actor = conflict.combatants.find((c) => c.id === actorId);
  if (!actor) return conflict;
  const canKeep = keep && !conflict.keptInitiative;   // never twice in a row
  return {
    ...conflict,
    combatants: conflict.combatants.map((c) => c.id === actorId ? { ...c, actedThisRound: true } : c),
    lastActorId: actorId,
    currentSide: canKeep ? actor.side : opposingSide(actor.side),
    keptInitiative: canKeep,
  };
}

/** New round: reset acted flags. Per §6, the last actor nominates the **opposing** side to open
 *  by default; paying 2 Momentum/Threat (`keepOpener`) lets their own side open instead. */
export function nextRound(conflict, keepOpener = false) {
  const last = conflict.combatants.find((c) => c.id === conflict.lastActorId);
  const opener = last ? (keepOpener ? last.side : opposingSide(last.side)) : conflict.currentSide;
  return {
    ...conflict, round: conflict.round + 1, keptInitiative: false,
    currentSide: opener,
    combatants: conflict.combatants.map((c) => ({ ...c, actedThisRound: false })),
  };
}

const SIDE_NAME = { a: 'Side A', b: 'Side B' };

/** §3.7: a character has ONE defeat track. A PC combatant's track mirrors the character's
 *  `state.defeatTrack`/`defeated`, so hits in a conflict show on the sheet (Resist Defeat,
 *  recovery, Home's "you are defeated") and sheet edits show in the conflict. */
export function hydratePcTracks(conflict) {
  if (!conflict || !conflict.combatants) return conflict;
  return { ...conflict, combatants: conflict.combatants.map((c) => {
    if (c.npc || !c.charId) return c;
    const ch = getCharacter(c.charId);
    const t = ch && ch.state && ch.state.defeatTrack;
    if (!t || (!t.req && !t.progress)) return c;   // character has no track yet → the combatant's seeds it on save
    return { ...c, defeatTrack: { req: t.req, progress: t.progress }, defeated: !!ch.state.defeated };
  }) };
}
export function pushPcTracks(conflict) {
  for (const c of (conflict && conflict.combatants) || []) {
    if (c.npc || !c.charId) continue;
    const ch = getCharacter(c.charId);
    if (!ch) continue;
    const st = ch.state || {};
    const t = c.defeatTrack || { req: 0, progress: 0 };
    const cur = st.defeatTrack || {};
    if (cur.req === t.req && cur.progress === t.progress && !!st.defeated === !!c.defeated) continue;
    saveCharacter({ ...ch, state: { ...st, defeatTrack: { req: t.req, progress: t.progress }, defeated: !!c.defeated } });
  }
}

export function renderConflict(onChange) {
  const conflict = hydratePcTracks(getConflict());
  const save = (c) => { if (c) pushPcTracks(c); saveConflict(c); onChange && onChange(); };

  if (!conflict || !conflict.active) {
    // Empty conflict (round 2 #8): explain, then one tap per conflict type — optionally with you on Side A.
    const me = listCharacters().find((c) => c.id === currentCharacterId()) || listCharacters()[0] || null;
    const meBox = el('input', { type: 'checkbox', id: 'cf-add-me' });
    meBox.checked = !!me;
    const begin = (typeId) => {
      const c = startConflict(typeId);
      if (me && meBox.checked) c.combatants.push({ id: uid(), charId: me.id, name: me.identity.name || 'Unnamed', side: 'a',
        zoneId: c.zones[0].id, npc: false, actedThisRound: false, defeated: !!(me.state && me.state.defeated),
        defeatTrack: { req: defeatRequirementFor(me, typeId), progress: (me.state && me.state.defeatTrack && me.state.defeatTrack.progress) || 0 } });
      save(c);
    };
    return el('section', { class: 'card' },
      el('h3', {}, 'Conflict', cite('Conflict turn order')),
      help('conflict'),
      el('div', { class: 'starter' },
        emptyState('swords', HELP.starters.conflict),
        me ? el('label', { class: 'toggle-row', for: 'cf-add-me' },
          el('span', {}, `Put ${me.identity.name || 'your character'} on Side A`), meBox) : null,
        el('div', { class: 'starter-types' }, ...DATA.conflictTypes.map((t) =>
          el('button', { class: 'starter-type', onclick: () => begin(t.id) },
            el('strong', {}, t.name), el('span', { class: 'small muted' }, t.scale))))));
  }

  const typeDef = DATA.conflictTypes.find((t) => t.id === conflict.type) || {};
  const zoneName = (id) => (conflict.zones.find((z) => z.id === id) || {}).name || '—';

  // Header: type · round · whose initiative.
  const header = el('div', { class: 'conflict-banner' },
    el('div', { class: 'conflict-turn' },
      el('span', { class: 'eyebrow' }, `${typeDef.name || conflict.type} · Round ${conflict.round}`),
      el('strong', { class: 'conflict-acting' }, `${SIDE_NAME[conflict.currentSide]} to act`),
      conflict.keptInitiative ? el('span', { class: 'pill danger-pill' }, 'kept — ally +1 Difficulty') : null),
    el('p', { class: 'small muted' }, `Attack skill: ${typeDef.attackSkill ? capOf(typeDef.attackSkill) : '—'} · lasting defeat: ${typeDef.lastingDefeat || '—'}`));

  // Zones editor.
  const zonesUI = el('details', { class: 'disclose' },
    el('summary', {}, `Zones (${conflict.zones.length}): ${conflict.zones.map((z) => z.name).join(' · ')}`),
    el('div', { class: 'zone-row' }, ...conflict.zones.map((z) => {
      const inp = el('input', { type: 'text', value: z.name, 'aria-label': 'Zone name' });
      inp.addEventListener('change', () => save({ ...conflict, zones: conflict.zones.map((x) => x.id === z.id ? { ...x, name: inp.value } : x) }));
      const del = el('button', { class: 'pill-x', 'aria-label': `Remove ${z.name}`, onclick: () => {
        if (conflict.zones.length <= 1) { showToast('Keep at least one zone.'); return; }
        save({ ...conflict, zones: conflict.zones.filter((x) => x.id !== z.id),
          combatants: conflict.combatants.map((c) => c.zoneId === z.id ? { ...c, zoneId: conflict.zones.find((x) => x.id !== z.id).id } : c) });
      } }, '×');
      return el('div', { class: 'zone-chip' }, inp, del);
    })),
    el('button', { class: 'btn small secondary', onclick: () => save({ ...conflict, zones: [...conflict.zones, { id: uid(), name: `Zone ${conflict.zones.length + 1}` }] }) }, '+ Zone'));

  // Combatants grouped by side.
  const sideBlock = (side) => {
    const members = conflict.combatants.filter((c) => c.side === side);
    return el('section', { class: `card side-card side-${side}` + (side === conflict.currentSide ? ' acting' : ''), 'aria-label': SIDE_NAME[side] },
      el('div', { class: 'section-head' },
        el('h3', {}, SIDE_NAME[side], el('span', { class: 'tag' }, String(members.length)),
          side === conflict.currentSide ? el('span', { class: 'tag acting-tag' }, 'to act') : null),
        actionChip('plus', 'Add', () => addCombatantDialog(side), { aria: `Add to ${SIDE_NAME[side]}` })),
      members.length
        ? el('ul', { class: 'combatant-list' }, ...members.map((c) => combatantRow(c)))
        : el('p', { class: 'small muted' }, 'Nobody here yet — add a PC or an NPC.'));
  };

  /** §6 Keep-the-Initiative / round-opener cost: a PC spends 2 Momentum (or adds 2 Threat when
   *  short); an enemy NPC spends 2 Threat. Returns false (and toasts) if an NPC can't afford it. */
  function spendKeepCost(isNpc, label) {
    const cost = DATA.initiative.keepInitiativeCost;   // 2
    const pools = getPools();
    if (isNpc) {
      if (pools.threat < cost) { showToast(`Not enough Threat for ${label} (needs ${cost}).`); return false; }
      savePools({ ...pools, threat: pools.threat - cost }); showToast(`${label} (−${cost} Threat)`); return true;
    }
    if (pools.momentum >= cost) { savePools({ ...pools, momentum: pools.momentum - cost }); showToast(`${label} (−${cost} Momentum)`); return true; }
    savePools({ ...pools, threat: pools.threat + cost }); showToast(`${label} (+${cost} Threat)`); return true;
  }
  /** Take a turn, charging the Keep-the-Initiative cost first (abort if an NPC can't pay). */
  function takeTurnWithCost(c, keep) {
    if (keep && !conflict.keptInitiative && !spendKeepCost(c.npc, 'Keep the Initiative')) return;
    save(takeTurn(conflict, c.id, keep));
  }

  function combatantRow(c) {
    const track = c.defeatTrack || { req: 0, progress: 0 };
    const zoneSel = el('select', { 'aria-label': 'Zone' },
      ...conflict.zones.map((z) => el('option', { value: z.id, selected: c.zoneId === z.id ? '' : null }, z.name)));
    zoneSel.addEventListener('change', () => save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === c.id ? { ...x, zoneId: zoneSel.value } : x) }));

    const isTurn = c.side === conflict.currentSide && !c.defeated;
    const keepBox = el('input', { type: 'checkbox', id: `keep-${c.id}` });
    keepBox.disabled = conflict.keptInitiative;   // can't keep twice in a row

    const recordHit = () => {
      const gain = DATA.defeat.pointsPerHitBase;   // + attacker Quality entered on the sheet; here base hit
      const progress = track.progress + gain;
      const defeated = track.req >= 1 && progress >= track.req;
      save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === c.id ? { ...x, defeatTrack: { ...track, progress }, defeated } : x) });
    };

    // Fighter card (round 2 #2): the two actions you use every turn up front; the rest in a ⋯ sheet.
    const pct = Math.min(100, Math.round((track.progress / Math.max(1, track.req)) * 100));
    const moreSheet = () => {
      const close = modal([
        el('h2', {}, c.name),
        el('div', { class: 'stat-row' }, el('span', { class: 'stat-name small' }, 'Defeat requirement'),
          stepper(track.req, (v) => { close(); save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === c.id ? { ...x, defeatTrack: { ...track, req: v } } : x) }); }, { min: 0, max: 40, label: 'requirement' })),
        el('div', { class: 'sheet-actions' },
          el('button', { class: 'btn secondary', onclick: () => { close(); recordHit(); } }, `Record a hit (+${DATA.defeat.pointsPerHitBase})`),
          (!c.npc && c.charId) ? el('button', { class: 'btn secondary', disabled: c.defeated ? '' : null,
            onclick: () => { close(); extraAction(c.charId); } }, 'Extra action (1 Determination)') : null,
          // Link: Resist Defeat, lasting defeat and recovery live on the character's sheet (same defeat track).
          (!c.npc && c.charId) ? el('button', { class: 'btn secondary', onclick: () => {
            close(); setCurrentCharacterId(c.charId); location.hash = '#/sheet';
          } }, c.defeated ? 'Open sheet — Resist Defeat / recovery' : 'Open character sheet') : null,
          el('button', { class: 'btn secondary danger-btn', onclick: () => {
            close(); save({ ...conflict, combatants: conflict.combatants.filter((x) => x.id !== c.id) });
            undoToast(`Removed ${c.name}`, () => save(conflict));
          } }, 'Remove from conflict')),
        el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: () => close() }, 'Done')),
      ].filter((n) => n != null), { sheet: true });
    };

    return el('li', { class: 'fighter' + (c.defeated ? ' defeated' : '') + (isTurn ? ' turn' : '') },
      el('div', { class: 'combatant-head' },
        el('strong', {}, c.name),
        c.npc ? el('span', { class: 'tag' }, c.tier || 'npc') : el('span', { class: 'tag' }, 'PC'),
        c.actedThisRound ? el('span', { class: 'tag' }, 'acted') : null,
        c.defeated ? el('span', { class: 'tag danger-tag' }, 'defeated') : null,
        el('button', { class: 'more-btn', 'aria-label': `More actions for ${c.name}`, onclick: moreSheet }, icon('more', { size: 20 }))),
      el('div', { class: 'combatant-ctl' }, el('span', { class: 'small muted' }, 'Zone'), zoneSel),
      el('div', { class: 'fighter-track', title: 'Hits taken / requirement to be defeated (§3.7)' },
        el('div', { class: 'task-bar defeat-bar' }, el('div', { class: 'task-fill' + (c.defeated ? ' danger' : ''), style: `width:${pct}%` })),
        el('span', { class: 'small muted' }, `Defeat ${track.progress} / ${track.req || '—'}`)),
      el('div', { class: 'fighter-actions' },
        el('button', { class: 'btn', disabled: c.defeated ? '' : null, onclick: () => attackDialog(c) },
          icon('swords', { size: 18 }), ' Attack'),
        el('button', { class: 'btn' + (isTurn ? '' : ' secondary'), disabled: c.defeated ? '' : null,
          onclick: () => takeTurnWithCost(c, keepBox.checked) }, 'Take turn'),
        el('label', { class: 'keep-chip', for: `keep-${c.id}`, title: `Keep the Initiative: costs ${DATA.initiative.keepInitiativeCost} Momentum (or Threat for NPCs); not twice in a row` },
          keepBox, ' Keep')));
  }

  // ---- Resolve a combatant to a "fighter" with rollable skills/drives/focuses ----
  function fighterOf(c) {
    if (!c.npc && c.charId) {
      const ch = getCharacter(c.charId);
      if (ch) return { name: ch.identity.name || 'PC', skills: ch.skills, drives: ch.drives, focuses: ch.focuses || [], isPc: true };
    }
    return { name: c.name, skills: c.skills || {}, drives: c.drives || {}, focuses: c.focuses || [], isPc: false };
  }
  const highestDrive = (drives) => Object.keys(drives || {}).sort((a, b) => drives[b] - drives[a])[0] || null;
  const rollPool = (n, tn, skillRating, focus) =>
    evaluateDice(Array.from({ length: n }, () => d20()), { tn, skillRating, focus });
  const sumSucc = (dice) => dice.reduce((s, d) => s + d.successes, 0);
  const countComp = (dice) => dice.filter((d) => d.complication).length;

  /** §3.7 attack: defender rolls first (successes + defensive assets = attacker Difficulty),
   *  then the attacker rolls; tie → attacker wins. A hit scores 2 + attacker asset Quality onto
   *  the target's defeat track; a miss banks the shortfall as defender Momentum. */
  function attackDialog(attacker) {
    const targets = conflict.combatants.filter((t) => t.side !== attacker.side && !t.defeated);
    if (!targets.length) { showToast('No undefeated target on the opposing side.'); return; }
    const atk = fighterOf(attacker);
    const atkSkill = typeDef.attackSkill || 'battle';
    const st = {
      targetId: targets[0].id,
      atkDrive: highestDrive(atk.drives),
      atkFocus: false,
      defSkill: (typeDef.defendSkills || ['discipline'])[0],
      defAssets: 0,
      defResult: null,   // { succ, comp }
      atkResult: null,   // { succ, comp }
      quality: 0,
    };
    const wrap = el('div', {});
    const close = modal([wrap]);
    render();

    function render() {
      const target = targets.find((t) => t.id === st.targetId) || targets[0];
      const def = fighterOf(target);
      const defDrive = highestDrive(def.drives);
      const atkTN = (atk.skills[atkSkill] || 0) + (st.atkDrive ? atk.drives[st.atkDrive] : 0);
      const defTN = (def.skills[st.defSkill] || 0) + (defDrive ? def.drives[defDrive] : 0);
      const difficulty = (st.defResult ? st.defResult.succ : 0) + st.defAssets;
      const atkHasFocus = (atk.focuses || []).some((f) => f.skill === atkSkill);

      const targetSel = el('select', { 'aria-label': 'Target' },
        ...targets.map((t) => el('option', { value: t.id, selected: t.id === st.targetId ? '' : null }, t.name)));
      targetSel.addEventListener('change', () => { st.targetId = targetSel.value; st.defResult = null; st.atkResult = null; render(); });

      const defSkillSel = el('select', { 'aria-label': 'Defence skill' },
        ...(typeDef.defendSkills || ['discipline']).map((s) => el('option', { value: s, selected: s === st.defSkill ? '' : null }, capOf(s))));
      defSkillSel.addEventListener('change', () => { st.defSkill = defSkillSel.value; st.defResult = null; render(); });

      // Filter nullish so a `? … : null` branch can't leave a stray "null" text node.
      wrap.replaceChildren(...[
        el('h2', {}, `Attack — ${atk.name}`, cite('Defeat & recovery')),
        el('p', { class: 'small muted' }, `${capOf(atkSkill)} conflict. The defender rolls first; their successes + defensive assets set your Difficulty. Tie goes to the attacker.`),

        el('div', { class: 'field' }, el('span', {}, 'Target'), targetSel),

        // --- Defender rolls first ---
        el('h4', {}, `Defender: ${def.name}`),
        el('div', { class: 'field' }, el('span', {}, 'Defence skill'), defSkillSel),
        el('p', { class: 'small muted' }, `Defence pool: ${capOf(st.defSkill)} ${def.skills[st.defSkill] || 0} + ${defDrive ? driveName(defDrive) : '—'} ${defDrive ? def.drives[defDrive] : 0} = TN ${defTN}`),
        el('div', { class: 'stat-row' }, el('span', { class: 'stat-name small' }, 'Defensive assets in zone (+1 Diff each)'),
          stepper(st.defAssets, (v) => { st.defAssets = v; render(); }, { min: 0, max: 6, label: 'defensive assets' })),
        el('div', { class: 'cta-row' },
          el('button', { class: 'btn secondary', onclick: () => { const dice = rollPool(2, defTN, def.skills[st.defSkill] || 0, false); st.defResult = { succ: sumSucc(dice), comp: countComp(dice), dice: dice.map((d) => d.value) }; render(); } }, 'Roll defender'),
          st.defResult ? el('span', { class: 'small' }, `[${st.defResult.dice.join(', ')}] → ${st.defResult.succ} successes${st.defResult.comp ? ` · ${st.defResult.comp} comp` : ''}`) : el('span', { class: 'small muted' }, 'not rolled')),
        el('p', {}, el('span', { class: 'pill' }, `Attacker Difficulty: ${difficulty}`)),

        // --- Attacker rolls ---
        el('h4', {}, `Attacker: ${atk.name}`),
        (() => {
          const driveSel = el('select', { 'aria-label': 'Attack drive' },
            ...Object.keys(atk.drives || {}).sort((a, b) => atk.drives[b] - atk.drives[a])
              .map((id) => el('option', { value: id, selected: id === st.atkDrive ? '' : null }, `${driveName(id)} ${atk.drives[id]}`)));
          driveSel.addEventListener('change', () => { st.atkDrive = driveSel.value; st.atkResult = null; render(); });
          return el('div', { class: 'field' }, el('span', {}, 'Attack drive'), driveSel);
        })(),
        el('p', { class: 'small muted' }, `Attack pool: ${capOf(atkSkill)} ${atk.skills[atkSkill] || 0} + drive = TN ${atkTN}`),
        atkHasFocus ? (() => {
          const box = el('input', { type: 'checkbox', id: 'atk-focus' }); box.checked = st.atkFocus;
          box.addEventListener('change', () => { st.atkFocus = box.checked; st.atkResult = null; render(); });
          return el('label', { class: 'toggle-row', for: 'atk-focus' }, el('span', {}, `Applicable focus (crit on ≤ ${atk.skills[atkSkill]})`), box);
        })() : null,
        el('div', { class: 'cta-row' },
          el('button', { class: 'btn', disabled: st.defResult ? null : '', onclick: () => {
            if (!st.defResult) { showToast('Roll the defender first.'); return; }
            const dice = rollPool(2, atkTN, atk.skills[atkSkill] || 0, st.atkFocus);
            st.atkResult = { succ: sumSucc(dice), comp: countComp(dice), dice: dice.map((d) => d.value) }; render();
          } }, 'Roll attack'),
          st.atkResult ? el('span', { class: 'small' }, `[${st.atkResult.dice.join(', ')}] → ${st.atkResult.succ} successes${st.atkResult.comp ? ` · ${st.atkResult.comp} comp` : ''}`) : el('span', { class: 'small muted' }, 'not rolled')),

        // --- Resolve ---
        st.atkResult ? resolveBlock(target, difficulty) : null,
        el('div', { class: 'modal-actions' }, el('button', { class: 'btn secondary', onclick: () => close() }, 'Close')),
      ].filter((k) => k != null));
    }

    function resolveBlock(target, difficulty) {
      const hit = st.atkResult.succ >= difficulty;   // tie → attacker wins (§3.7)
      const shortfall = Math.max(0, difficulty - st.atkResult.succ);
      const box = el('div', { class: 'recover-opt' }, el('h4', {}, hit ? 'HIT' : 'Miss'));
      if (hit) {
        box.append(
          el('div', { class: 'stat-row' }, el('span', { class: 'stat-name small' }, 'Attacker asset Quality'),
            stepper(st.quality, (v) => { st.quality = v; render(); }, { min: 0, max: 5, label: 'asset quality' })),
          el('p', { class: 'small muted' }, `Scores ${DATA.defeat.pointsPerHitBase} + ${st.quality} = ${DATA.defeat.pointsPerHitBase + st.quality} onto ${target.name}’s defeat track.`),
          el('button', { class: 'btn', onclick: () => {
            const score = DATA.defeat.pointsPerHitBase + st.quality;
            const track = target.defeatTrack || { req: 0, progress: 0 };
            const progress = track.progress + score;
            const defeated = track.req >= 1 && progress >= track.req;
            save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === target.id ? { ...x, defeatTrack: { ...track, progress }, defeated } : x) });
            showToast(`${target.name} hit for ${score}${defeated ? ' — DEFEATED' : ` (${progress}/${track.req})`}`);
            close();
          } }, `Apply hit (+${DATA.defeat.pointsPerHitBase + st.quality})`));
      } else {
        box.append(
          el('p', { class: 'small muted' }, `Failed attack — the defender banks the shortfall (${shortfall}) as Momentum (§3.7).`),
          el('button', { class: 'btn secondary', onclick: () => {
            const pools = getPools();
            savePools({ ...pools, momentum: clampMomentum(pools.momentum + shortfall) });
            showToast(`Defender gains ${shortfall} Momentum`);
            close();
          } }, `Bank ${shortfall} Momentum`));
      }
      return box;
    }
  }

  /** Determination spend §3.1: spend 1 to act again (stacks with Keep the Initiative).
   *  Gated on the PC having Determination and an unchallenged drive statement to support it. */
  function extraAction(charId) {
    const ch = getCharacter(charId);
    if (!ch) { showToast('Character not found.'); return; }
    if (ch.determination < 1) { showToast(`${ch.identity.name || 'This character'} has no Determination.`); return; }
    if (!hasSupportingStatement(ch)) { showToast('Extra action needs an unchallenged drive statement to support it.'); return; }
    saveCharacter({ ...ch, determination: clampDetermination(ch.determination - 1) });
    showToast(`${ch.identity.name || 'PC'}: extra action — act again (−1 Determination)`);
    onChange && onChange();
  }

  function addCombatantDialog(side) {
    const pcs = listCharacters();
    const compendium = [
      ...NPCS.archetypes.map((n) => ({ ...n, group: 'Archetypes' })),
      ...NPCS.iconics.map((n) => ({ ...n, group: 'Iconics' })),
      ...expansionNpcs().map((n) => ({ ...n, group: 'Expansion' })),   // toggle-gated
    ];
    const pcSel = el('select', { 'aria-label': 'Player character' }, el('option', { value: '' }, 'Player character…'),
      ...pcs.map((c) => el('option', { value: c.id }, c.identity.name || 'Unnamed')));
    const npcSel = el('select', { 'aria-label': 'NPC' }, el('option', { value: '' }, 'Drop in an NPC…'),
      ...compendium.map((n, i) => el('option', { value: String(i) }, `${n.name} (${n.tier}${n.group === 'Iconics' ? ' · iconic' : ''})`)));
    const zoneSel = el('select', { 'aria-label': 'Zone' }, ...conflict.zones.map((z) => el('option', { value: z.id }, z.name)));

    const addPc = () => {
      const c = pcs.find((x) => x.id === pcSel.value); if (!c) return;
      // §3.7 defeat requirement ≈ defender's relevant (defence) skill + defensive asset Quality.
      const req = defeatRequirementFor(c, conflict.type);
      commit({ id: uid(), charId: c.id, name: c.identity.name || 'Unnamed', side, zoneId: zoneSel.value, npc: false, actedThisRound: false, defeated: !!(c.state && c.state.defeated), defeatTrack: { req, progress: (c.state && c.state.defeatTrack && c.state.defeatTrack.progress) || 0 } });
    };
    const addNpc = () => {
      const n = compendium[Number(npcSel.value)]; if (!n) return;
      // Store the NPC's skills/drives/focuses so the attack flow can roll its pool.
      commit({ id: uid(), name: n.name, side, zoneId: zoneSel.value, npc: true, tier: n.tier,
        skills: { ...n.skills }, drives: { ...n.drives }, focuses: (n.focuses || []).map((f) => ({ ...f })),
        actedThisRound: false, defeated: false, defeatTrack: { req: npcDefaultReq(n.tier), progress: 0 } });
    };
    const commit = (combatant) => { save({ ...conflict, combatants: [...conflict.combatants, combatant] }); close(); };

    const close = modal([
      el('h2', {}, `Add to ${SIDE_NAME[side]}`),
      el('div', { class: 'field' }, el('span', {}, 'Zone'), zoneSel),
      el('div', { class: 'field' }, el('span', {}, 'Player character'), pcSel),
      el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: addPc }, 'Add PC')),
      el('div', { class: 'field' }, el('span', {}, 'NPC compendium'), npcSel),
      el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: addNpc }, 'Add NPC')),
      el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: () => close() }, 'Done')),
    ]);
  }

  // Radical UI (2026-10-07): the zone strip became a board. Each fighter is a token in its zone;
  // drag a token onto another zone, or tap a token then tap a zone (keyboard + screen reader path).
  // Moving between zones is the same free reposition as the fighter card's zone picker.
  const moveTo = (cid, zid) => {
    boardPick = null;
    const c0 = conflict.combatants.find((x) => x.id === cid);
    if (!c0 || c0.zoneId === zid) return onChange && onChange();
    save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === cid ? { ...x, zoneId: zid } : x) });
  };
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const token = (c) => {
    const t = el('button', { class: `token side-${c.side}` + (c.defeated ? ' out' : '') + (boardPick === c.id ? ' picked' : ''),
      'aria-pressed': boardPick === c.id ? 'true' : 'false', 'aria-label': `${c.name}, side ${c.side.toUpperCase()}${c.defeated ? ', defeated' : ''} — tap then pick a zone`,
      title: c.name }, initials(c.name));
    let start = null, dragged = false;
    t.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; dragged = false; t.setPointerCapture(e.pointerId); });
    t.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!dragged && Math.hypot(dx, dy) < 8) return;
      dragged = true; t.classList.add('dragging'); t.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    t.addEventListener('pointerup', (e) => {
      if (!start) return;
      start = null;
      if (!dragged) return;
      t.style.transform = ''; t.classList.remove('dragging');
      t.style.visibility = 'hidden';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      t.style.visibility = '';
      const zone = under && under.closest('[data-zone]');
      if (zone) moveTo(c.id, zone.dataset.zone);
    });
    t.addEventListener('click', () => {
      if (dragged) { dragged = false; return; }
      boardPick = boardPick === c.id ? null : c.id; onChange && onChange();
    });
    return t;
  };
  const zoneStrip = el('div', { class: 'zone-board' + (boardPick ? ' picking' : ''), role: 'group', 'aria-label': 'Zone board' },
    ...conflict.zones.map((z) => {
      const here = conflict.combatants.filter((c) => c.zoneId === z.id);
      return el('div', { class: 'zone-cell', dataset: { zone: z.id } },
        boardPick
          ? el('button', { class: 'zone-cell-name zone-target', onclick: () => moveTo(boardPick, z.id) }, icon('flag', { size: 12 }), ` ${z.name}`)
          : el('span', { class: 'zone-cell-name' }, z.name),
        el('div', { class: 'zone-tokens' }, ...here.map(token)));
    }));
  const headMore = () => {
    const close = modal([
      el('h2', {}, 'Conflict'),
      el('div', { class: 'sheet-actions' },
        el('button', { class: 'btn secondary danger-btn', onclick: async () => {
          close();
          if (await confirmModal('End the conflict? The tracker is cleared.', { okLabel: 'End conflict' })) save(null);
        } }, 'End conflict')),
      el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: () => close() }, 'Done')),
    ], { sheet: true });
  };

  return el('div', { class: 'conflict-board' },
    el('section', { class: 'card conflict-head' },
      el('div', { class: 'section-head' },
        el('h3', {}, 'Conflict', cite('Conflict turn order')),
        help('conflict'),
        el('button', { class: 'more-btn', 'aria-label': 'Conflict options', onclick: headMore }, icon('more', { size: 20 }))),
      header,
      zoneStrip,
      zonesUI,
      el('div', { class: 'cta-row' },
      // §6: default = the opposing side opens next round; pay 2 to keep the opener on your side.
      el('button', { class: 'btn', onclick: () => save(nextRound(conflict, false)) }, 'Next round'),
      conflict.lastActorId ? el('button', { class: 'btn secondary', onclick: () => {
        const last = conflict.combatants.find((x) => x.id === conflict.lastActorId);
        if (!spendKeepCost(last ? last.npc : false, 'Keep the opener')) return;
        save(nextRound(conflict, true));
      } }, 'Keep opener (2)') : null)),
    el('div', { class: 'conflict-sides' }, sideBlock('a'), el('div', { class: 'conflict-vs', 'aria-hidden': 'true' }, el('span', {}, 'VS')), sideBlock('b')));
}

// Zone-board selection (tap a token, then a zone). Survives the re-render it triggers.
let boardPick = null;

function capOf(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
