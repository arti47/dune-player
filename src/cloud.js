// cloud.js — Firebase Realtime-Database sync adapter.
//
// Loaded ONLY via a dynamic import from sync.js when FIREBASE_ENABLED is true, so local mode never
// imports or references Firebase (the app stays keyless + offline by default).
//
// ⚠ OWNER-TESTED: there is no live Firebase backend in the build sandbox, so this module has NOT
// been run end-to-end. It is written against the documented Firebase v10 modular API and the app's
// existing seams; expect a short debug pass the first time cloud mode is enabled (see README).
//
// Model (local-first with a cloud mirror): the local store stays the source of truth on each
// device. This adapter mirrors the campaign meta/members and the shared Momentum/Threat pools
// to/from `campaigns/{id}` in RTDB. Local writes push up (via store.subscribe); remote changes pull
// down (via onValue), guarded by `applyingRemote` so an incoming update never echoes back out.

import { firebaseConfig } from '../firebase-config.js';
import * as store from './store.js';
import { setAuthUid, myUid } from './sync.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

let db = null, fns = null;
let applyingRemote = false;      // true while writing a remote snapshot into the local store
let currentCampaignId = null;
let watchingId = null;

/** Load the Firebase SDK, init the app, sign in anonymously, and start mirroring. */
export async function initCloud() {
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const auth = await import(`${SDK}/firebase-auth.js`);
  fns = await import(`${SDK}/firebase-database.js`);
  const app = initializeApp(firebaseConfig);
  db = fns.getDatabase(app);
  const a = auth.getAuth(app);

  const uid = await new Promise((resolve, reject) => {
    auth.onAuthStateChanged(a, (user) => { if (user) resolve(user.uid); });
    auth.signInAnonymously(a).catch(reject);
  });
  setAuthUid(uid);
  migrateLocalUid(uid);   // fix a campaign created before auth resolved (device id → auth uid)

  // Push local campaign/pool changes up as they happen.
  store.subscribe((what) => {
    if (applyingRemote) return;
    if (what === 'campaign') pushCampaign();
    if (what === 'pools') pushPools();
  });
  // If a campaign already exists on this device, publish it and start watching.
  const c = store.getCampaign();
  if (c) { pushCampaign(); watchCampaign(c.id); }
  return uid;
}

// If the local campaign was created before anonymous auth resolved, its ownerUid + member key are
// the local device id — which the security rules (auth.uid === $uid) reject. Rewrite them to the
// auth uid so the owner's own writes/reads are permitted.
function migrateLocalUid(authUid) {
  const c = store.getCampaign();
  if (!c) return;
  const dev = store.deviceUid();
  if (authUid === dev) return;
  let changed = false;
  if (c.meta && c.meta.ownerUid === dev) { c.meta.ownerUid = authUid; changed = true; }
  if (c.members && c.members[dev] && !c.members[authUid]) {
    c.members[authUid] = c.members[dev]; delete c.members[dev]; changed = true;
  }
  if (changed) { applyingRemote = true; try { store.saveCampaign(c); } finally { applyingRemote = false; } }
}

const campaignRef = (id) => fns.ref(db, `campaigns/${id}`);
const joinCodeRef = (code) => fns.ref(db, `joinCodes/${code}`);

function pushCampaign() {
  const c = store.getCampaign();
  if (!c) return;
  currentCampaignId = c.id;
  // Mirror the campaign, and publish a joinCodes/{code} → id index so others can resolve the code
  // WITHOUT reading the whole (member-gated) campaigns collection.
  fns.update(campaignRef(c.id), { meta: c.meta, members: c.members }).catch((e) => console.error('push campaign failed:', e));
  if (c.meta && c.meta.joinCode) fns.set(joinCodeRef(c.meta.joinCode), c.id).catch((e) => console.error('push joinCode failed:', e));
  watchCampaign(c.id);
}

function pushPools() {
  if (!currentCampaignId) return;
  const p = store.getPools();
  fns.update(campaignRef(currentCampaignId), { momentum: p.momentum, threat: p.threat }).catch(() => {});
}

/** Subscribe to a campaign's remote state and mirror it into the local store (echo-guarded). */
function watchCampaign(id) {
  if (watchingId === id) return;
  watchingId = id;
  currentCampaignId = id;
  fns.onValue(campaignRef(id), (snap) => {
    const remote = snap.val();
    if (!remote) return;
    applyingRemote = true;
    try {
      const local = store.getCampaign() || { id };
      store.saveCampaign({ id, meta: remote.meta || local.meta, members: remote.members || (local.members || {}) });
      if (remote.momentum != null || remote.threat != null) {
        store.savePools({ momentum: remote.momentum ?? 0, threat: remote.threat ?? 0 });
      }
    } finally { applyingRemote = false; }
  });
}

/** Join an existing campaign by its join code: resolve the code → id via the joinCodes index (no
 *  membership needed), add myself as a member, then read + mirror the campaign down. */
export async function joinByCode(code, member) {
  // 1. Resolve the code to a campaign id (a single-node read anyone authed can do).
  const idSnap = await fns.get(joinCodeRef(code));
  const id = idSnap.val();
  if (!id) throw new Error('No campaign found for that join code.');
  // 2. Write my own member node (the rules allow auth.uid === $uid to self-add).
  const me = myUid();
  await fns.set(fns.ref(db, `campaigns/${id}/members/${me}`),
    { displayName: 'Player', characterId: null, role: 'player', ...member });
  // 3. Now that I'm a member, I can read the full campaign and start mirroring.
  const full = (await fns.get(campaignRef(id))).val() || {};
  applyingRemote = true;
  try {
    store.saveCampaign({ id, meta: full.meta || { name: 'Campaign', joinCode: code, ownerUid: null }, members: full.members || {} });
  } finally { applyingRemote = false; }
  watchCampaign(id);
  return id;
}
