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
