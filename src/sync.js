// sync.js — Firebase auth, campaigns, join codes, presence. Lands in Phase 5
// (gated behind the First Session Playable milestone, §1.1 decision #1).

import { FIREBASE_ENABLED } from '../firebase-config.js';

export function cloudEnabled() {
  return !!FIREBASE_ENABLED;
}

export function initSync() {
  // No-op in local mode. Phase 5 wires Firebase here.
  return cloudEnabled();
}
