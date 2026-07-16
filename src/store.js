// store.js — local/cloud character + House persistence, pools, roll log.
// Phase 0: localStorage only. Cloud mirroring arrives in Phase 5 via sync.js.

import { uid, capitalize } from './core.js';
import { normalizeCharacter, normalizeHouse } from './derived.js';
import { DATA } from '../data.js';
import { driveName } from './content.js';

const K_CHARS = 'imperium.characters';
const K_CURRENT = 'imperium.currentCharacterId';
const K_HOUSE = 'imperium.house';
const K_POOLS = 'imperium.pools';
const K_ROLLLOG = 'imperium.rollLog';
const K_DEVICE = 'imperium.deviceUid';
const K_CAMPAIGN = 'imperium.campaign';
const ROLL_LOG_CAP = 100;

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(what) { listeners.forEach((fn) => fn(what)); }

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------- Characters ----------
export function listCharacters() {
  return readJSON(K_CHARS, []).map(normalizeCharacter);
}
export function getCharacter(id) {
  return listCharacters().find((c) => c.id === id) || null;
}
export function saveCharacter(char) {
  const chars = readJSON(K_CHARS, []);
  const i = chars.findIndex((c) => c.id === char.id);
  if (i >= 0) chars[i] = char; else { char.id = char.id || uid(); chars.push(char); }
  writeJSON(K_CHARS, chars);
  notify('characters');
  return char;
}
export function deleteCharacter(id) {
  writeJSON(K_CHARS, readJSON(K_CHARS, []).filter((c) => c.id !== id));
  if (currentCharacterId() === id) setCurrentCharacterId(null);
  notify('characters');
}
export function currentCharacterId() { return localStorage.getItem(K_CURRENT) || null; }
export function setCurrentCharacterId(id) {
  if (id) localStorage.setItem(K_CURRENT, id); else localStorage.removeItem(K_CURRENT);
  notify('current');
}

// ---------- House (shared campaign entity; local mirror in local mode) ----------
export function getHouse() { return normalizeHouse(readJSON(K_HOUSE, null)); }
export function saveHouse(house) { writeJSON(K_HOUSE, house); notify('house'); }
export function deleteHouse() { localStorage.removeItem(K_HOUSE); notify('house'); }

// ---------- Pools (Momentum group pool, Threat mirror for local play) ----------
export function getPools() { return readJSON(K_POOLS, { momentum: 0, threat: 0 }); }
export function savePools(pools) { writeJSON(K_POOLS, pools); notify('pools'); }

// ---------- Campaign & device identity (Phase 5 foundation; local-first) ----------
// A stable per-device id that stands in for "me" as a member. In cloud mode the Firebase
// anonymous-auth uid takes over (sync.js), but the local id keeps membership working offline.
export function deviceUid() {
  let id = localStorage.getItem(K_DEVICE);
  if (!id) { id = 'u-' + uid(); localStorage.setItem(K_DEVICE, id); }
  return id;
}
// The campaign is the group container (§7): { id, meta{name,joinCode,createdAt,ownerUid},
// members{ uid:{displayName,characterId,role} } }. Locally the House/pools/conflict keep their
// own keys; cloud sync (later) makes this object the sync root.
export function getCampaign() { return readJSON(K_CAMPAIGN, null); }
export function saveCampaign(c) { writeJSON(K_CAMPAIGN, c); notify('campaign'); return c; }
export function deleteCampaign() { localStorage.removeItem(K_CAMPAIGN); notify('campaign'); }

// ---------- JSON export / import (local-mode backup & device transfer) ----------
export function exportAll() {
  return {
    app: 'imperium-player', schema: 1, exportedAt: Date.now(),
    characters: readJSON(K_CHARS, []),
    house: readJSON(K_HOUSE, null),
    pools: getPools(),
    tasks: readJSON(K_TASKS, []),
    campaign: getCampaign(),
    journal: getJournal(),
    currentCharacterId: currentCharacterId(),
  };
}
/** Replace local characters + House + pools from an exported bundle. Returns a summary. */
export function importAll(data) {
  if (!data || data.app !== 'imperium-player' || !Array.isArray(data.characters)) {
    throw new Error('Not an Imperium Player backup file.');
  }
  const characters = data.characters.map(normalizeCharacter);
  writeJSON(K_CHARS, characters);
  writeJSON(K_HOUSE, data.house ? normalizeHouse(data.house) : null);
  writeJSON(K_POOLS, data.pools && typeof data.pools === 'object' ? data.pools : { momentum: 0, threat: 0 });
  writeJSON(K_TASKS, Array.isArray(data.tasks) ? data.tasks : []);
  if (data.campaign && data.campaign.meta) writeJSON(K_CAMPAIGN, data.campaign); else localStorage.removeItem(K_CAMPAIGN);
  if (data.journal && typeof data.journal === 'object') writeJSON(K_JOURNAL, data.journal); else localStorage.removeItem(K_JOURNAL);
  if (data.currentCharacterId && characters.some((c) => c.id === data.currentCharacterId)) {
    localStorage.setItem(K_CURRENT, data.currentCharacterId);
  } else localStorage.removeItem(K_CURRENT);
  notify('characters'); notify('house'); notify('pools'); notify('current'); notify('journal');
  return { characters: characters.length, house: !!data.house };
}

// ---------- Character Markdown export / import (single-sheet, human-readable + lossless) ----------
// A readable Markdown sheet with a trailing HTML-comment data island so it round-trips exactly.
const MD_START = '<!-- IMPERIUM-CHARACTER v1';
const MD_END = '-->';
const skillName = (id) => (DATA.skills.find((s) => s.id === id) || {}).name || id;

export function characterToMarkdown(char) {
  const c = normalizeCharacter(char);
  const id = c.identity;
  const L = [];
  L.push(`# ${id.name || 'Unnamed'}`, '');
  const sub = [id.archetype && capitalize(id.archetype), id.factionTemplate && capitalize(id.factionTemplate),
    id.houseRole && capitalize(id.houseRole)].filter(Boolean).join(' · ');
  if (sub) L.push(`*${sub}*`, '');

  L.push('## Skills', ...DATA.skills.map((s) => `- ${s.name} ${c.skills[s.id]}`), '');
  const driveIds = Object.keys(c.drives).sort((a, b) => c.drives[b] - c.drives[a]);
  L.push('## Drives', ...driveIds.map((d) => `- ${driveName(d)} ${c.drives[d]}`), '');

  const stmts = Object.entries(c.driveStatements || {});
  if (stmts.length) L.push('## Drive statements',
    ...stmts.map(([d, s]) => `- **${driveName(d)}:** ${s.text}${s.challenged ? ' _(challenged)_' : ''}`), '');
  if ((c.focuses || []).length) L.push('## Focuses',
    ...c.focuses.map((f) => `- ${f.name} (${skillName(f.skill)})`), '');
  if ((c.talents || []).length) L.push('## Talents', ...c.talents.map((t) => {
    const p = t.skill ? skillName(t.skill) : t.drive ? driveName(t.drive) : t.category || null;
    return `- ${p ? `${t.name} (${p})` : t.name}`;
  }), '');
  if ((c.traits || []).length) L.push('## Traits',
    ...c.traits.map((t) => `- ${t.name}${t.negative ? ' _(negative)_' : ''}${t.source ? ` _(${t.source})_` : ''}`), '');
  if ((c.assets || []).length) L.push('## Assets',
    ...c.assets.map((a) => `- ${a.name} — Quality ${a.quality}, ${a.tangible ? 'tangible' : 'intangible'}${a.permanent ? ', permanent' : ''}`), '');

  L.push('## Determination', `${c.determination} / ${DATA.determination.cap}`, '');
  if (id.ambition) L.push('## Ambition', id.ambition, '');
  if (id.appearance) L.push('## Appearance', id.appearance, '');
  if (id.relationships) L.push('## Relationships', id.relationships, '');
  if (c.notes) L.push('## Notes', c.notes, '');

  // Lossless data island — invisible in a rendered Markdown viewer, parsed back on import.
  L.push(MD_START, JSON.stringify(c), MD_END, '');
  return L.join('\n');
}

/** Parse a character back from an app-exported Markdown sheet (reads the data island). */
export function characterFromMarkdown(md) {
  if (typeof md !== 'string' || !md.includes(MD_START)) {
    throw new Error('No Imperium character data found in this Markdown file.');
  }
  const after = md.slice(md.indexOf(MD_START) + MD_START.length);
  const end = after.indexOf(MD_END);
  const json = (end < 0 ? after : after.slice(0, end)).trim();
  let obj;
  try { obj = JSON.parse(json); } catch { throw new Error('The character data block is corrupt.'); }
  return normalizeCharacter(obj);
}

/** Import a Markdown sheet as a NEW character (fresh id); returns the saved character. */
export function importCharacterMarkdown(md) {
  const c = characterFromMarkdown(md);
  c.id = uid();
  return saveCharacter(c);
}

// ---------- Extended tasks (generic; §3.1 — local mirror, campaign-synced in Phase 5) ----------
const K_TASKS = 'imperium.tasks';
export function getTasks() { return readJSON(K_TASKS, []); }
export function saveTasks(tasks) { writeJSON(K_TASKS, tasks); notify('tasks'); }

// ---------- Conflict (local scene state; campaign-mirrored in Phase 5) ----------
const K_CONFLICT = 'imperium.conflict';
export function getConflict() { return readJSON(K_CONFLICT, null); }
export function saveConflict(conflict) {
  if (conflict) writeJSON(K_CONFLICT, conflict); else localStorage.removeItem(K_CONFLICT);
  notify('conflict');
}

// ---------- Journal (global/device-wide solo-play log; in the JSON backup) ----------
const K_JOURNAL = 'imperium.journal';
const EMPTY_JOURNAL = { entries: [], threads: [], contacts: [], scene: { setup: '', notes: '' } };
export function getJournal() {
  const j = readJSON(K_JOURNAL, null);
  if (!j) return { ...EMPTY_JOURNAL, scene: { ...EMPTY_JOURNAL.scene } };
  return {
    entries: Array.isArray(j.entries) ? j.entries : [],
    threads: Array.isArray(j.threads) ? j.threads : [],
    contacts: Array.isArray(j.contacts) ? j.contacts : [],
    scene: j.scene && typeof j.scene === 'object' ? { setup: '', notes: '', ...j.scene } : { setup: '', notes: '' },
  };
}
export function saveJournal(j) { writeJSON(K_JOURNAL, j); notify('journal'); }
/** Prepend a new entry (newest-first). Returns the created entry. */
export function addJournalEntry({ title = '', body = '', threadId = null } = {}) {
  const j = getJournal();
  const entry = { id: uid(), ts: Date.now(), title, body, threadId };
  j.entries.unshift(entry);
  saveJournal(j);
  return entry;
}

// ---------- Roll log (local, capped; synced copy arrives in Phase 5) ----------
export function getRollLog() { return readJSON(K_ROLLLOG, []); }
export function appendRoll(entry) {
  const log = getRollLog();
  log.unshift({ ts: Date.now(), ...entry });
  writeJSON(K_ROLLLOG, log.slice(0, ROLL_LOG_CAP));
  notify('rollLog');
}
/** Delete a single roll-log entry by its position in the newest-first log. */
export function deleteRollAt(index) {
  const log = getRollLog();
  if (index < 0 || index >= log.length) return;
  log.splice(index, 1);
  writeJSON(K_ROLLLOG, log);
  notify('rollLog');
}
export function clearRollLog() { writeJSON(K_ROLLLOG, []); notify('rollLog'); }
