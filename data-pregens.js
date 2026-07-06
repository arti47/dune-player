// data-pregens.js — T30: iconic characters as one-tap PC pregens.
// Checkpoint ruling #1: iconics are instantiated as PLAYER CHARACTERS (Determination, cap 3,
// start 1), not on NPC Threat rules. Built from the complete iconic stat blocks in
// data-npcs.js so the numbers stay single-sourced; the two stat-blocked iconics (Rabban,
// Fenring) can't be pregens without numbers and are excluded. Each pregen is a partial
// character record — normalizeCharacter() (derived.js) back-fills state/advancement/etc.

import { NPCS } from './data-npcs.js';
import { DATA } from './data.js';

/** Map an iconic NPC stat block into a partial PC record. */
function toPregen(ic) {
  return {
    pregenId: ic.id,
    identity: {
      name: ic.name, archetype: null, factionTemplate: null, houseRole: null,
      appearance: '', ambition: '', portraitUrl: null,
    },
    skills: { ...ic.skills },
    drives: { ...ic.drives },
    driveStatements: Object.fromEntries(
      Object.entries(ic.statements).map(([drive, text]) => [drive, { text, challenged: false }])),
    focuses: ic.focuses.map((f) => ({ skill: f.skill, name: f.name })),
    talents: ic.talents.map((name) => ({ name, source: 'iconic' })),
    traits: ic.traits.map((name) => ({ name, negative: false, source: 'iconic' })),
    assets: [], // iconic stat blocks print no assets (see NPCS.iconicsNote)
    determination: DATA.determination.startPerAdventure, // 1 (cap 3), ruling #1
  };
}

export const PREGENS = NPCS.iconics.filter((i) => !i.statsIncomplete).map(toPregen);
