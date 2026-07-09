// combat.js — Phase 4 in-play systems. Currently: the scene/adventure lifecycle engine
// (§3.17) — the app owns these events. The shared conflict tracker (5 types, zones,
// initiative passing, defeat flow) and the generic extended-task tracker land alongside.
//
// Lifecycle (§3.17):
//   End scene   — Momentum −1; temporary assets expire (permanent === false); Resist Defeat resets.
//   End adventure — Determination resets to start (1 + bonus talents, cap 3); challenged drive
//                   statements recover; the advance-purchase gate resets; temp assets expire.
// Both apply immediately with a summary + one-step Undo (snapshot/restore).

import { el, uid } from './core.js';
import { modal, showToast, confirmModal, promptModal } from './ui.js';
import {
  getPools, savePools, listCharacters, getCharacter, saveCharacter, getTasks, saveTasks, getConflict, saveConflict,
} from './store.js';
import { clampMomentum, clampDetermination, hasSupportingStatement } from './derived.js';
import { cite } from './cite.js';
import { expansionNpcs } from './content.js';
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

/** A card with the End scene / End adventure controls. `onChange` re-renders the caller. */
export function renderLifecycle(onChange) {
  const control = (label, applyFn, confirmMsg) =>
    el('button', { class: 'btn secondary', onclick: async () => {
      if (!await confirmModal(confirmMsg, { okLabel: label })) return;
      const { summary, undo } = applyFn();
      onChange && onChange();
      showSummary(label, summary, undo, onChange);
    } }, label);

  return el('section', { class: 'card' },
    el('h3', {}, 'Scene & adventure', cite('Scene & adventure lifecycle')),
    el('p', { class: 'small muted' }, 'End-of-scene and end-of-adventure bookkeeping (§3.17). Each shows what changed with one-step Undo.'),
    el('div', { class: 'cta-row' },
      control('End scene', endScene, 'End the scene? Momentum −1, temporary assets expire, and Resist Defeat resets for everyone.'),
      control('End adventure', endAdventure, 'End the adventure? Determination resets to its start value, challenged statements recover, and the advance-purchase gate resets.')));
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
      el('strong', {}, task.name),
      done ? el('span', { class: 'tag' }, 'complete') : null,
      el('button', { class: 'pill-x', 'aria-label': `Delete ${task.name}`,
        onclick: () => { saveTasks(getTasks().filter((t) => t.id !== task.id)); onChange && onChange(); } }, '×')),
    el('div', { class: 'task-bar' }, el('div', { class: 'task-fill', style: `width:${pct}%` })),
    el('div', { class: 'task-foot' },
      el('span', { class: 'small muted' }, `${task.progress} / ${task.requirement}`),
      el('button', { class: 'btn small secondary', onclick: () => recordSuccessDialog(task, onChange) }, 'Record success')));
}

/** The extended-tasks card. `onChange` re-renders the caller. */
export function renderTasks(onChange) {
  const tasks = getTasks();
  return el('section', { class: 'card' },
    el('h3', {}, 'Extended tasks', cite('Extended tasks')),
    el('p', { class: 'small muted' }, 'Shared progress tracks — recovery, sandworm riding, projects. Each success scores 2 + an applicable asset’s Quality (§3.1); Momentum adds points, a complication subtracts.'),
    el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: () => newTaskDialog(onChange) }, '+ New task')),
    tasks.length ? el('ul', { class: 'task-list' }, ...tasks.map((t) => taskRow(t, onChange))) : el('p', { class: 'small muted' }, 'No active tasks.'));
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
      state: { ...st, defeated: false, resistUsedThisScene: true, defeatTrack: { ...track, progress: 0 } },
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
    showToast(`Recovery task created (requirement ${req})`);
    onChange && onChange();
  };

  const guided = [];
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
    guided.push(el('button', { class: 'btn secondary', onclick: () => save({ defeated: false, lastingDefeat: false, stabilized: false, defeatTrack: { ...track, progress: 0 } }) }, 'Clear defeat'));
  }

  return el('div', {},
    el('h4', {}, 'Defeat & recovery', cite('Defeat & recovery')),
    el('p', { class: 'small muted' }, 'Track = defender skill + defensive asset Quality; each hit scores 2 + attacker asset Quality (§3.7).'),
    el('div', { class: 'stat-row' }, el('span', { class: 'stat-name small' }, 'Requirement'),
      stepper(track.req, (v) => save({ defeatTrack: { ...track, req: v } }), { min: 0, max: 40, label: 'requirement' })),
    el('div', { class: 'task-bar' }, el('div', { class: 'task-fill' + (defeated ? ' danger' : ''), style: `width:${Math.min(100, Math.round((track.progress / Math.max(1, track.req)) * 100))}%` })),
    el('div', { class: 'task-foot' },
      el('span', { class: 'small muted' + (defeated ? ' danger-text' : '') }, `${track.progress} / ${track.req}${defeated ? ' · DEFEATED' : ''}`),
      el('button', { class: 'btn small secondary', onclick: recordHit }, 'Record a hit')),
    st.resistUsedThisScene ? el('p', { class: 'small muted' }, 'Resist Defeat used this scene (resets at End scene).') : null,
    ...guided);
}

// ---------- Local conflict helper (§3.12) ----------
// A single-device tracker for the 5 conflict types: zones, sides, round + initiative passing
// (Keep-the-Initiative not-twice-in-a-row, last-actor-picks-opener), per-combatant defeat
// tracks, and drop-in NPCs from the compendium. Two-way pending-contest sync is Phase 5.

export function opposingSide(s) { return s === 'a' ? 'b' : 'a'; }

/** Default defeat-track requirement for a dropped-in NPC by tier (minor = one hit). */
function npcDefaultReq(tier) { return tier === 'minor' ? 1 : tier === 'major' ? 7 : 5; }

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

/** New round: reset acted flags; the last actor's side opens (they pick — default to their side). */
export function nextRound(conflict) {
  const last = conflict.combatants.find((c) => c.id === conflict.lastActorId);
  return {
    ...conflict, round: conflict.round + 1, keptInitiative: false,
    currentSide: last ? last.side : conflict.currentSide,
    combatants: conflict.combatants.map((c) => ({ ...c, actedThisRound: false })),
  };
}

const SIDE_NAME = { a: 'Side A', b: 'Side B' };

export function renderConflict(onChange) {
  const conflict = getConflict();
  const save = (c) => { saveConflict(c); onChange && onChange(); };

  if (!conflict || !conflict.active) {
    const typeSel = el('select', { 'aria-label': 'Conflict type' },
      ...DATA.conflictTypes.map((t) => el('option', { value: t.id }, `${t.name} — ${t.scale}`)));
    return el('section', { class: 'card' },
      el('h3', {}, 'Conflict', cite('Conflict turn order')),
      el('p', { class: 'small muted' }, 'A local tracker for the five conflict types (§3.12): zones, sides, initiative, and defeat tracks. Drop in NPCs from the compendium.'),
      el('div', { class: 'field' }, el('span', {}, 'Type'), typeSel),
      el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: () => save(startConflict(typeSel.value)) }, 'Start a conflict')));
  }

  const typeDef = DATA.conflictTypes.find((t) => t.id === conflict.type) || {};
  const zoneName = (id) => (conflict.zones.find((z) => z.id === id) || {}).name || '—';

  // Header: type · round · whose initiative.
  const header = el('div', {},
    el('p', {},
      el('span', { class: 'pill' }, typeDef.name || conflict.type),
      el('span', { class: 'pill' }, `Round ${conflict.round}`),
      el('span', { class: 'pill' }, `${SIDE_NAME[conflict.currentSide]} to act`),
      conflict.keptInitiative ? el('span', { class: 'pill danger-pill' }, 'kept — ally +1 Difficulty') : null),
    el('p', { class: 'small muted' }, `Attack skill: ${typeDef.attackSkill ? capOf(typeDef.attackSkill) : '—'} · lasting defeat: ${typeDef.lastingDefeat || '—'}`));

  // Zones editor.
  const zonesUI = el('div', {},
    el('h4', {}, 'Zones'),
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
  const sideBlock = (side) => el('div', { class: 'side-block' },
    el('h4', {}, SIDE_NAME[side]),
    el('ul', { class: 'combatant-list' },
      ...conflict.combatants.filter((c) => c.side === side).map((c) => combatantRow(c))),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn small secondary', onclick: () => addCombatantDialog(side) }, '+ Add')));

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

    return el('li', { class: 'combatant-item' + (c.defeated ? ' defeated' : '') },
      el('div', { class: 'combatant-head' },
        el('strong', {}, c.name),
        c.npc ? el('span', { class: 'tag' }, c.tier || 'npc') : el('span', { class: 'tag' }, 'PC'),
        c.actedThisRound ? el('span', { class: 'tag' }, 'acted') : null,
        c.defeated ? el('span', { class: 'tag danger-tag' }, 'defeated') : null,
        el('button', { class: 'pill-x', 'aria-label': `Remove ${c.name}`, onclick: () => save({ ...conflict, combatants: conflict.combatants.filter((x) => x.id !== c.id) }) }, '×')),
      el('div', { class: 'combatant-ctl' },
        el('span', { class: 'small muted' }, 'Zone'), zoneSel),
      el('div', { class: 'combatant-ctl' },
        el('span', { class: 'small muted' }, `Defeat ${track.progress}/${track.req}`),
        stepper(track.req, (v) => save({ ...conflict, combatants: conflict.combatants.map((x) => x.id === c.id ? { ...x, defeatTrack: { ...track, req: v } } : x) }), { min: 0, max: 40, label: 'requirement' }),
        el('button', { class: 'btn small secondary', onclick: recordHit }, 'Hit +2')),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn small' + (isTurn ? '' : ' secondary'), disabled: c.defeated ? '' : null,
          onclick: () => save(takeTurn(conflict, c.id, keepBox.checked)) }, 'Take turn'),
        el('label', { class: 'small', for: `keep-${c.id}` }, keepBox, ` Keep initiative (2 ${typeDef.attackSkill ? 'Mom/Threat' : ''})`),
        (!c.npc && c.charId) ? el('button', { class: 'btn small secondary', disabled: c.defeated ? '' : null,
          onclick: () => extraAction(c.charId) }, 'Extra action (1 Det)') : null));
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
      commit({ id: uid(), charId: c.id, name: c.identity.name || 'Unnamed', side, zoneId: zoneSel.value, npc: false, actedThisRound: false, defeated: false, defeatTrack: { req: 0, progress: 0 } });
    };
    const addNpc = () => {
      const n = compendium[Number(npcSel.value)]; if (!n) return;
      commit({ id: uid(), name: n.name, side, zoneId: zoneSel.value, npc: true, tier: n.tier, actedThisRound: false, defeated: false, defeatTrack: { req: npcDefaultReq(n.tier), progress: 0 } });
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

  return el('section', { class: 'card' },
    el('h3', {}, 'Conflict'),
    header,
    zonesUI,
    sideBlock('a'),
    sideBlock('b'),
    el('div', { class: 'cta-row', style: 'margin-top:10px' },
      el('button', { class: 'btn secondary', onclick: () => save(nextRound(conflict)) }, 'Next round'),
      el('button', { class: 'btn secondary danger-btn', onclick: async () => {
        if (await confirmModal('End the conflict? The tracker is cleared.', { okLabel: 'End conflict' })) save(null);
      } }, 'End conflict')));
}

function capOf(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
