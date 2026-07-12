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

const campaignRef = (id) => fns.ref(db, `campaigns/${id}`);

function pushCampaign() {
  const c = store.getCampaign();
  if (!c) return;
  currentCampaignId = c.id;
  fns.update(campaignRef(c.id), { meta: c.meta, members: c.members }).catch(() => {});
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

/** Join an existing campaign by its join code: find it, add me as a member, then mirror it down. */
export async function joinByCode(code, member) {
  const q = fns.query(fns.ref(db, 'campaigns'), fns.orderByChild('meta/joinCode'), fns.equalTo(code));
  const snap = await fns.get(q);
  const val = snap.val();
  if (!val) throw new Error('No campaign found for that join code.');
  const id = Object.keys(val)[0];
  const me = myUid();
  await fns.update(fns.ref(db, `campaigns/${id}/members/${me}`),
    { displayName: 'Player', characterId: null, role: 'player', ...member });
  const full = (await fns.get(campaignRef(id))).val();
  applyingRemote = true;
  try { store.saveCampaign({ id, meta: full.meta, members: full.members }); }
  finally { applyingRemote = false; }
  watchCampaign(id);
  return id;
}
