// rules.js — pure rules lookups over the data libraries. No DOM, no state.

import { DATA } from '../data.js';

export function skillById(id) {
  return DATA.skills.find((s) => s.id === id) || null;
}
export function driveById(id) {
  return DATA.drives.find((d) => d.id === id) || null;
}

export function difficultyInfo(value) {
  return DATA.difficulty.find((d) => d.value === value) || null;
}

export function focusExamplesFor(skillId) {
  return DATA.focusExamples[skillId] || [];
}

export function conflictTypeById(id) {
  return DATA.conflictTypes.find((c) => c.id === id) || null;
}

/** Momentum cost of buying the nth extra die (1-based). */
export function dieBuyCost(nth) {
  return DATA.dicePool.buyCosts[nth - 1] ?? null;
}

/** Does a focus name apply? (Simple name match; roll dialog passes the chosen focus.) */
export function characterHasFocusOnSkill(character, skillId) {
  return (character.focuses || []).some((f) => f.skill === skillId);
}

/**
 * "One Way to Choose Drives" (Core, Ch. 3): rank drives from pairwise comparisons.
 * `pairs` are [a,b] drive-id pairs; `winners[i]` is the drive chosen for pairs[i].
 * Returns the drive ids ordered highest→lowest (to be assigned 8/7/6/5/4). A two-way
 * tie is broken by the head-to-head result of that pair; three-way ties keep a stable
 * order (the book leaves those to the player). Drives never compared count as 0 wins.
 */
export function rankDrivesFromComparisons(pairs, winners) {
  const drives = [...new Set(pairs.flat())];
  const wins = Object.fromEntries(drives.map((d) => [d, 0]));
  const head = {}; // "x|y" (input order) -> winner id
  pairs.forEach(([a, b], i) => {
    const w = winners[i];
    if (w === a || w === b) { wins[w]++; head[`${a}|${b}`] = w; }
  });
  return [...drives].sort((x, y) => {
    if (wins[y] !== wins[x]) return wins[y] - wins[x];
    const h = head[`${x}|${y}`] ?? head[`${y}|${x}`];
    if (h === x) return -1;
    if (h === y) return 1;
    return 0;
  });
}
