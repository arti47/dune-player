// store.js — local/cloud character + House persistence, pools, roll log.
// Phase 0: localStorage only. Cloud mirroring arrives in Phase 5 via sync.js.

import { uid } from './core.js';
import { normalizeCharacter, normalizeHouse } from './derived.js';

const K_CHARS = 'imperium.characters';
const K_CURRENT = 'imperium.currentCharacterId';
const K_HOUSE = 'imperium.house';
const K_POOLS = 'imperium.pools';
const K_ROLLLOG = 'imperium.rollLog';
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

// ---------- Pools (Momentum group pool, Threat mirror for local play) ----------
export function getPools() { return readJSON(K_POOLS, { momentum: 0, threat: 0 }); }
export function savePools(pools) { writeJSON(K_POOLS, pools); notify('pools'); }

// ---------- Roll log (local, capped; synced copy arrives in Phase 5) ----------
export function getRollLog() { return readJSON(K_ROLLLOG, []); }
export function appendRoll(entry) {
  const log = getRollLog();
  log.unshift({ ts: Date.now(), ...entry });
  writeJSON(K_ROLLLOG, log.slice(0, ROLL_LOG_CAP));
  notify('rollLog');
}
