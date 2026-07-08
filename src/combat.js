// combat.js — Phase 4 in-play systems. Currently: the scene/adventure lifecycle engine
// (§3.17) — the app owns these events. The shared conflict tracker (5 types, zones,
// initiative passing, defeat flow) and the generic extended-task tracker land alongside.
//
// Lifecycle (§3.17):
//   End scene   — Momentum −1; temporary assets expire (permanent === false); Resist Defeat resets.
//   End adventure — Determination resets to start (1 + bonus talents, cap 3); challenged drive
//                   statements recover; the advance-purchase gate resets; temp assets expire.
// Both apply immediately with a summary + one-step Undo (snapshot/restore).

import { el } from './core.js';
import { modal, showToast, confirmModal } from './ui.js';
import { getPools, savePools, listCharacters, saveCharacter } from './store.js';
import { clampMomentum, clampDetermination } from './derived.js';
import { DATA } from '../data.js';

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
    el('h3', {}, 'Scene & adventure'),
    el('p', { class: 'small muted' }, 'End-of-scene and end-of-adventure bookkeeping (§3.17). Each shows what changed with one-step Undo.'),
    el('div', { class: 'cta-row' },
      control('End scene', endScene, 'End the scene? Momentum −1, temporary assets expire, and Resist Defeat resets for everyone.'),
      control('End adventure', endAdventure, 'End the adventure? Determination resets to its start value, challenged statements recover, and the advance-purchase gate resets.')));
}
