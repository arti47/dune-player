// derived.js — target-number building, asset-cap checks, normalization/migration.
// This game derives almost nothing (§3.3): target number = Skill + Drive. That's it.

import { DATA } from '../data.js';
import { clamp, uid } from './core.js';
import { findTalent } from './content.js';

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
    const def = findTalent(owned.name);
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

/** §3.1: does the character carry an unchallenged drive statement (needed to support a
 *  Determination spend such as Declaration or an Extra action)? */
export function hasSupportingStatement(character) {
  return Object.values((character && character.driveStatements) || {})
    .some((s) => s && s.text && !s.challenged);
}
/** Can this character spend Determination on a Declaration / Extra action right now? */
export function canSpendDetermination(character) {
  return (character?.determination || 0) >= 1 && hasSupportingStatement(character);
}

/** The rating at/above which a drive carries a statement (§3.8 keep/lose threshold) — the
 *  lowest of the statement-bearing creation ratings (8/7/6 → 6). */
export const STATEMENT_MIN_DRIVE = Math.min(...DATA.creation.driveStatements.onDrivesRated);

/**
 * §3.8 challenged-statement recovery via the −1/+1 route: lower the challenged drive by 1 and
 * raise the next-lowest drive by 1 (a swap that preserves the 8/7/6/5/4 array). The challenged
 * drive keeps its statement only if it stays ≥ 6, otherwise it's lost; and per the book, a drive
 * **raised to** 6 gains a statement (the player writes it — `promotedNeedsStatement`).
 * Returns { drives, driveStatements, kept, target, promotedNeedsStatement } — or null when the
 * route is unavailable (the challenged drive is already the lowest, so nothing below it to raise).
 */
export function recoverStatementByDriveShift(character, driveId) {
  const drives = { ...(character.drives || {}) };
  const cur = drives[driveId];
  if (cur == null) return null;
  // next-lowest = the OTHER drive with the greatest rating strictly below the challenged one.
  let target = null, targetVal = -Infinity;
  for (const [id, v] of Object.entries(drives)) {
    if (id === driveId || v >= cur) continue;
    if (v > targetVal) { target = id; targetVal = v; }
  }
  if (target == null) return null;
  drives[driveId] = cur - 1;
  drives[target] = targetVal + 1;
  const kept = drives[driveId] >= STATEMENT_MIN_DRIVE;
  const driveStatements = { ...(character.driveStatements || {}) };
  if (kept) driveStatements[driveId] = { ...driveStatements[driveId], challenged: false };
  else delete driveStatements[driveId];   // statement lost when the drive drops below 6
  // §3.8: "any drive increased to 6 gains a statement" — flag the promoted drive if it crossed
  // the threshold from below and doesn't already carry a statement.
  const promotedNeedsStatement = drives[target] >= STATEMENT_MIN_DRIVE
    && targetVal < STATEMENT_MIN_DRIVE && !driveStatements[target];
  return { drives, driveStatements, kept, target, promotedNeedsStatement };
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
    // Drives are exactly the character's five (standard OR swapped for an alternative drive,
    // Power and Pawns). Preserve the stored set as-is; only default to the standard five when absent.
    drives: (c.drives && Object.keys(c.drives).length) ? { ...c.drives } : { ...drives },
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
    // Great Game House Management session state (T36). null until management is begun.
    management: h.management ? {
      active: h.management.active !== false,
      status: Number.isFinite(h.management.status) ? h.management.status : 0,
      year: Number.isFinite(h.management.year) ? h.management.year : 1,
      venturesUsed: Number.isFinite(h.management.venturesUsed) ? h.management.venturesUsed : 0,
      incomeCollected: !!h.management.incomeCollected,   // income taken this year?
      upkeepPaid: !!h.management.upkeepPaid,              // upkeep paid this year?
      upkeep: {
        military: 'None', population: 'Acceptance', lifestyle: 'Noble',
        ...(h.management.upkeep || {}),
      },
      log: Array.isArray(h.management.log) ? h.management.log.slice(-40) : [],   // recent session log
    } : null,
  };
}
