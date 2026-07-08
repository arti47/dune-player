// derived.js — target-number building, asset-cap checks, normalization/migration.
// This game derives almost nothing (§3.3): target number = Skill + Drive. That's it.

import { DATA } from '../data.js';
import { clamp, uid } from './core.js';

/** The only derived stat in the game. */
export function targetNumber(character, skillId, driveId) {
  const skill = character.skills?.[skillId] ?? 4;
  const drive = character.drives?.[driveId] ?? 4;
  return skill + drive;
}

/** Permanent-asset cap: base 5 + talent bonuses (Specialist +2, Improved Resources +1;
 *  both purchasable multiple times — each owned instance counts). */
export function permanentAssetCap(character) {
  let cap = DATA.assetRules.permanentCap;
  for (const owned of character.talents || []) {
    const def = DATA.talents.find((t) => t.name === owned.name);
    if (def?.auto?.type === 'assetCapBonus') cap += def.auto.bonus;
  }
  return cap;
}
export function permanentAssetCount(character) {
  return (character.assets || []).filter((a) => a.permanent).length;
}

/** Determination clamp (cap 3 per §3.1). */
export function clampDetermination(v) {
  return clamp(v, 0, DATA.determination.cap);
}

/** Momentum pool clamp (cap 6 per §3.1). */
export function clampMomentum(v) {
  return clamp(v, 0, DATA.momentumRules.cap);
}

/**
 * Normalization/migration: back-fill schema defaults on old characters.
 * Every schema addition MUST extend this (process rule: never crash on old data).
 */
export function normalizeCharacter(c) {
  const skills = { battle: 4, communicate: 4, discipline: 4, move: 4, understand: 4 };
  const drives = { duty: 4, faith: 4, justice: 4, power: 4, truth: 4 };
  return {
    id: c.id || uid(),
    owner: c.owner ?? null,
    campaignId: c.campaignId ?? null,
    identity: {
      name: '', archetype: null, factionTemplate: null, houseRole: null,
      appearance: '', ambition: '', portraitUrl: null, ...(c.identity || {}),
    },
    skills: { ...skills, ...(c.skills || {}) },
    drives: { ...drives, ...(c.drives || {}) },
    driveStatements: c.driveStatements || {},
    focuses: c.focuses || [],
    talents: c.talents || [],
    traits: c.traits || [],
    assets: c.assets || [],
    determination: clampDetermination(c.determination ?? 1),
    state: {
      defeated: false, lastingDefeat: false, resistUsedThisScene: false, stabilized: false,
      defeatTrack: { req: 0, progress: 0 }, ...(c.state || {}),
    },
    advancement: {
      points: 0, advancesPurchasedThisAdventure: 0, skillAdvancesTotal: 0,
      skillsAdvanced: [], log: [],   // skillsAdvanced: skill ids advanced (each skill once, §3.10)
      ...(c.advancement || {}),
    },
    // Creation in Play (T40): incomplete character defined during play. `used` counts each
    // limited-use define option; skill/drive rating pools enforce "each rating once".
    creationInPlay: {
      active: false, complete: false,
      used: { trait: 0, skills: 0, focuses: 0, talents: 0, drives: 0, ambition: 0, assets: 0 },
      skillRatingsUsed: [], driveRatingsUsed: [],
      ...(c.creationInPlay || {}),
      ...(c.creationInPlay ? { used: { trait: 0, skills: 0, focuses: 0, talents: 0, drives: 0, ambition: 0, assets: 0, ...(c.creationInPlay.used || {}) } } : {}),
    },
    notes: c.notes ?? '',
  };
}

/**
 * House normalization/migration (§7 house shape). The House is a shared campaign entity;
 * Core fills only narrative fields — skills/wealth/resources stay null unless The Great Game
 * populated them (greatGame toggle). Returns null for an absent House.
 */
export function normalizeHouse(h) {
  if (!h) return null;
  return {
    name: h.name || '',
    type: h.type || null,
    skills: h.skills || null,                 // Great Game only
    domains: Array.isArray(h.domains) ? h.domains : [],   // [{ id, tier, subtype? }]
    wealth: h.wealth ?? null,                 // Great Game only
    resources: h.resources ?? null,           // Great Game only
    homeworld: {
      name: '', weather: '', habitation: '', crimeRate: '', crimeStance: '', contentment: '', publicWealth: '',
      ...(h.homeworld || {}),
    },
    banner: { crest: '', colors: '', ...(h.banner || {}) },
    traits: Array.isArray(h.traits) ? h.traits : [],       // [{ name, type: 'domain'|'reputation' }]
    roles: h.roles || {},                     // { roleId: characterId | npcName }
    enemies: Array.isArray(h.enemies) ? h.enemies : [],    // [{ hatred, reason }]
  };
}
