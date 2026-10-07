// settings.js — feature/content toggles + preferences. LocalStorage-backed.
// Pattern (§8): off by default; explicit user choice beats defaults
// (true/false stored distinctly from unset).

const KEY = 'imperium.settings';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function write(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
}

export const Settings = {
  get(flag) { return read()[flag]; },
  set(flag, value) { const s = read(); s[flag] = value; write(s); },

  // Theme: 'system' | 'light' | 'dark'. Owner (2026-10-07, "build all the rest") moved the default
  // to dark — the cinematic night desert; an explicit choice (incl. 'system') always wins.
  theme() { return read().theme || 'dark'; },

  // Expansion toggles (§4) — committed: first three; stretch: last two
  sandAndDust()   { return !!read().sandAndDust; },
  greatGame()     { return !!read().greatGame; },
  powerAndPawns() { return !!read().powerAndPawns; },
  mastersOfDune() { return !!read().mastersOfDune; },
  fallOfImperium(){ return !!read().fallOfImperium; },

  // Surfaces
  gmScreen()           { return !!read().gmScreen; },
  oracle()             { return !!read().oracle; },
  journal()            { return !!read().journal; },
  advancedAutomation() { return !!read().advancedAutomation; },
  // Roll vibration (UI round 2 #6): ON unless the user switched it off (false stored explicitly).
  haptics()            { return read().haptics !== false; },
  // Simple mode (radical UI, 2026-10-07): fewer words and fewer controls at once — advanced roll
  // options behind a chip, intro lines hidden, Now shows only live tiles. ON unless switched off.
  simple()             { return read().simple !== false && this.level() !== 'veteran'; },
  // Experience level (2026-10-07): 'novice' | 'player' | 'veteran' (default player). Novice adds a
  // one-line guide to each roll step; Veteran turns Simple mode off and Roll skips the ritual.
  // Nothing is ever locked away: every rule stays one tap away at every level.
  level()              { const l = read().level; return ['novice', 'player', 'veteran'].includes(l) ? l : 'player'; },
  // Roll sounds (2026-10-07): synthesized sand hiss on a roll, drum on a crit. Off unless switched on.
  sound()              { return read().sound === true; },

  // Onboarding & tutorial state (§13 sign-off): { seen, completedLessons[], pregenId }.
  // seen gates the one-time first-launch prompt; completedLessons drives the menu ticks;
  // pregenId remembers the learner's chosen demo character. Not a §8 feature toggle.
  tutorial()           { return { seen: false, completedLessons: [], pregenId: null, ...(read().tutorial || {}) }; },
  setTutorial(patch)   { const s = read(); s.tutorial = { ...this.tutorial(), ...patch }; write(s); },
  markLessonDone(id)   { const t = this.tutorial(); if (!t.completedLessons.includes(id)) this.setTutorial({ completedLessons: [...t.completedLessons, id] }); },
  restartTutorial()    { const s = read(); delete s.tutorial; write(s); },

  // How-to-play guide progress: { done: [stepId] } — manual ticks for steps the app can't detect.
  play()               { return { done: [], ...(read().play || {}) }; },
  markPlayStep(id)     { const p = this.play(); if (!p.done.includes(id)) { const s = read(); s.play = { ...p, done: [...p.done, id] }; write(s); } },
  unmarkPlayStep(id)   { const p = this.play(); const s = read(); s.play = { ...p, done: p.done.filter((x) => x !== id) }; write(s); },
  resetPlayGuide()     { const s = read(); delete s.play; write(s); },
};

/** Toggle metadata for the Settings screen. */
export const TOGGLE_DEFS = [
  { flag: 'sandAndDust',    label: 'Sand and Dust',        desc: 'Arrakis sourcebook rules content (talents, assets, NPCs).' },
  { flag: 'greatGame',      label: 'The Great Game',       desc: 'Houses of the Landsraad rules content.' },
  { flag: 'powerAndPawns',  label: 'Power and Pawns',      desc: "The Emperor's Court rules content." },
  { flag: 'mastersOfDune',  label: 'Masters of Dune',      desc: 'Campaign sourcebook rules content (stretch).' },
  { flag: 'fallOfImperium', label: 'Fall of the Imperium', desc: 'Campaign sourcebook rules content (stretch).' },
  { flag: 'gmScreen',       label: 'GM screen',            desc: 'Gamemaster dashboard: Threat pool, NPCs, rollable tables.' },
  { flag: 'oracle',         label: 'Meaning Tables',       desc: 'Idea generator in the Journal (homebrew, not official rules) for solo/GM prep — rolls a 4-word spark.' },
  { flag: 'journal',        label: 'Journal',              desc: 'Solo-play journal tab: dated entries, plot threads, NPCs/places, and a current-scene pad.' },
];
