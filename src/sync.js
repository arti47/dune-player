// sync.js — campaigns, roles, memorable join codes, and (Phase 5) Firebase auth/sync.
// Local-first: everything here works on one device with localStorage. Cloud mode (Firebase
// Realtime Database + anonymous auth) layers on top when FIREBASE_ENABLED is true — the campaign
// object (§7) becomes the sync root and myUid() switches to the auth uid. Gated behind the
// First Session Playable milestone (§1.1 decision #1).

import { FIREBASE_ENABLED } from '../firebase-config.js';
import { uid } from './core.js';
import { getCampaign, saveCampaign, deleteCampaign, deviceUid } from './store.js';

export function cloudEnabled() { return !!FIREBASE_ENABLED; }

export function initSync() {
  // No-op in local mode. Cloud mode will init the Firebase app + anonymous auth here.
  return cloudEnabled();
}

// ---------- Memorable join codes (app flavor — not rules; original word set) ----------
// Three hyphenated words, e.g. "spice-falcon-blade" (§ Architecture: memorable join codes).
const CODE_WORDS = [
  'spice', 'falcon', 'blade', 'sietch', 'worm', 'dune', 'shield', 'crys', 'sand', 'water',
  'storm', 'moon', 'hawk', 'lion', 'ember', 'stone', 'reach', 'vigil', 'oath', 'crown',
  'raven', 'thorn', 'amber', 'cobalt', 'onyx', 'harvest', 'mirage', 'canyon', 'oasis', 'summit',
  'anvil', 'beacon', 'cipher', 'delta', 'echo', 'fable', 'gambit', 'herald', 'ivory', 'jade',
];
export function makeJoinCode(n = 3) {
  const pool = [...CODE_WORDS];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out.join('-');
}

// ---------- Identity ----------
// "Me" as a member: the device id locally; in cloud mode the anonymous-auth uid (set in initSync).
let authUid = null;
export function setAuthUid(id) { authUid = id || null; }
export function myUid() { return (cloudEnabled() && authUid) ? authUid : deviceUid(); }

// ---------- Campaign lifecycle (local implementations; cloud sync layers on later) ----------
const asRole = (r) => (r === 'gm' ? 'gm' : 'player');

/** Create (and locally activate) a campaign with me as owner + first member. */
export function createCampaign({ name = 'New Campaign', displayName = 'Player', role = 'player' } = {}) {
  const me = myUid();
  return saveCampaign({
    id: uid(),
    meta: { name: (name || '').trim() || 'New Campaign', joinCode: makeJoinCode(), createdAt: Date.now(), ownerUid: me },
    members: { [me]: { displayName: (displayName || 'Player').trim() || 'Player', characterId: null, role: asRole(role) } },
  });
}

export function getActiveCampaign() { return getCampaign(); }

/** All members as an array, owner first. */
export function party() {
  const c = getCampaign();
  if (!c) return [];
  return Object.entries(c.members || {})
    .map(([id, m]) => ({ uid: id, ...m, isOwner: id === c.meta.ownerUid, isMe: id === myUid() }))
    .sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));
}

export function myMember() { const c = getCampaign(); return c ? (c.members[myUid()] || null) : null; }
export function myRole() { const m = myMember(); return m ? m.role : null; }
export function isGM() { return myRole() === 'gm'; }
export function isOwner() { const c = getCampaign(); return !!c && c.meta.ownerUid === myUid(); }

/** Update one of my own member fields (role, displayName, characterId). No-op without a campaign. */
function patchMe(patch) {
  const c = getCampaign();
  if (!c) return null;
  const me = myUid();
  c.members[me] = { displayName: 'Player', characterId: null, role: 'player', ...c.members[me], ...patch };
  return saveCampaign(c);
}
export function setMyRole(role) { return patchMe({ role: asRole(role) }); }
export function setMyDisplayName(name) { return patchMe({ displayName: (name || '').trim() || 'Player' }); }
export function setMyCharacter(characterId) { return patchMe({ characterId: characterId || null }); }

/** Leave/dissolve the local campaign. (Cloud mode will detach the member instead of deleting.) */
export function leaveCampaign() { deleteCampaign(); }

/** Join by code — cloud-only: on one device there is no other campaign to join. */
export function joinCampaign(/* code, { displayName } */) {
  if (!cloudEnabled()) {
    throw new Error('Joining someone else’s campaign needs cloud sync — enable Firebase in firebase-config.js. Share your join code so others can join once cloud is on.');
  }
  throw new Error('Cloud join not yet wired.');   // Phase 5 cloud step
}
