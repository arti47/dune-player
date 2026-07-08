// content.js — the effective content set = core data + the crunch of any enabled expansion
// toggle (§4/§8). Every surface that offers talents, faction templates, or focus examples reads
// through here so expansion content (e.g. CHOAM under The Great Game) appears only when its
// toggle is on. No new rules data lives here — it only assembles the data libraries.

import { Settings } from './settings.js';
import { DATA } from '../data.js';
import { EXPANSION as GREAT_GAME } from '../data-great-game.js';
import { EXPANSION as SAND_AND_DUST } from '../data-sand-and-dust.js';
import { EXPANSION as POWER_AND_PAWNS } from '../data-power-and-pawns.js';
import { EXPANSION as MASTERS_OF_DUNE } from '../data-masters-of-dune.js';
import { EXPANSION as FALL_OF_IMPERIUM } from '../data-fall-of-imperium.js';

const EXPANSIONS = [GREAT_GAME, SAND_AND_DUST, POWER_AND_PAWNS, MASTERS_OF_DUNE, FALL_OF_IMPERIUM];

/** Expansion crunch is active only when its Settings toggle (matching EXPANSION.id) is on. */
export function activeExpansions() {
  return EXPANSIONS.filter((e) => e && typeof Settings[e.id] === 'function' && Settings[e.id]());
}
function collect(key) { return activeExpansions().flatMap((e) => e[key] || []); }

export function allTalents() { return [...DATA.talents, ...collect('talents')]; }
export function findTalent(name) { return allTalents().find((t) => t.name === name) || null; }
export function allFactionTemplates() { return [...DATA.factionTemplates, ...collect('factionTemplates')]; }
export function allArchetypes() { return [...DATA.archetypes, ...collect('archetypes')]; }

/** Focus examples for a skill: the core book list + any active-expansion focuses for that skill. */
export function focusExamplesFor(skillId) {
  return [...(DATA.focusExamples[skillId] || []), ...collect('focuses').filter((f) => f.skill === skillId)];
}
