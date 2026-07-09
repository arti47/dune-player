// roller.js — the native 2d20 skill-test engine (Phase 3 core).
// Owns: skill+drive target number, buying dice (1/2/3 Momentum or Threat), focus crit ranges,
// natural-1 crits, natural-20 complications, Momentum generation, Determination (auto-1 before
// the roll + re-roll after, gated on an unchallenged drive statement), and roll-log writes.
// Talent-embedded automation (§3.9) via the machine-readable `auto` descriptors: Voice
// (auto-successes for Threat), Mentat Discipline (one die auto-1), difficultyDelta talents
// (Nimble/Masterful Innuendo/Ransack/Constantly Watching — Difficulty shift, optional Threat
// cost), rerollOne talents (Bold/Cautious/Prana-Bindu/The Reason I Fight — a free
// single-die re-roll, condition-aware), Other Memory (autoSuccesses — +N flat successes),
// and Cool Under Pressure (determinationAutoSucceed — spend 1 Determination for an automatic
// success, 0 Momentum, no dice).
// Also: Architect mode (§3.12 — act for the House: House skill + personal drive as the target
// number, Great Game numeric layer only), Calculated Prediction (testForPredictions — a preset
// Understand D4 test that yields 1 prediction + 1 per 2 Momentum), assists (each assistant rolls
// 1d20, counting only if the leader scores ≥1 success — §3.1), and opposed tests (defender rolls
// first; their successes + defensive assets set the active Difficulty; tie → active wins; a failed
// active test banks the shortfall as defender Momentum — §3.1/§3.12). Every result links to its
// rules-library entry (T38 citations).

import { el, rollD20s, clamp } from './core.js';
import { modal, showToast } from './ui.js';
import { getPools, savePools, saveCharacter, appendRoll, getHouse, listCharacters } from './store.js';
import { targetNumber, clampMomentum, clampDetermination } from './derived.js';
import { cite } from './cite.js';
import { findTalent, driveName } from './content.js';
import { DATA } from '../data.js';

/** A character's drive ids, highest-rated first (drives may be standard or swapped-in). */
function charDriveIds(ch) { return Object.keys(ch.drives || {}).sort((a, b) => ch.drives[b] - ch.drives[a]); }

const SKILLS = DATA.skills;
const DRIVES = DATA.drives;
const { base: BASE_DICE, max: MAX_DICE, buyCosts: BUY_COSTS } = DATA.dicePool;

/** Total Momentum cost of buying `n` extra dice (0..3). */
function buyCost(n) {
  let c = 0;
  for (let i = 0; i < n; i++) c += BUY_COSTS[i] ?? 0;
  return c;
}

/** Evaluate a rolled pool against a target number. Each die ≤ TN = 1 success; a natural 1, or
 *  (with an applicable focus) any die ≤ the Skill rating, crits for 2; each natural 20 = a
 *  complication. */
export function evaluateDice(values, { tn, skillRating, focus }) {
  return values.map((v) => {
    const success = v <= tn;
    const crit = success && (v === 1 || (focus && v <= skillRating));
    return { value: v, success, crit, complication: v === 20, successes: crit ? 2 : success ? 1 : 0 };
  });
}

/** A drive statement must support the action to spend Determination (§3.1): require an
 *  unchallenged statement on the chosen drive. */
function determinationEligible(character, driveId) {
  const s = (character.driveStatements || {})[driveId];
  return !!(character.determination > 0 && s && s.text && !s.challenged);
}

export function openRollDialog(character, onDone = null) {
  if (!character) { showToast('Select a character first.'); return; }

  const cfg = {
    skill: SKILLS[0].id,
    drive: charDriveIds(character)[0] || DRIVES[0].id,   // the character's highest drive (may be a swapped-in one)
    difficulty: 1,
    bought: 0,
    buyWith: 'momentum',       // 'momentum' | 'threat'
    focus: false,
    autoOne: false,            // spend 1 Determination for one automatic 1 (crit)
    appliedTraits: new Set(),  // trait indices applied to this test (Difficulty modifiers)
    voice: 0,                  // auto-successes bought with Threat (Voice-style talent)
    mentatAutoOne: false,      // one die auto-counts as 1 (Mentat Discipline-style talent)
    talentDiffs: new Set(),    // idxs of applied difficultyDelta talents (Nimble, Ransack…)
    otherMemory: false,        // +N flat auto-successes (Other Memory-style autoSuccesses talent)
    coolAuto: false,           // spend 1 Determination for an automatic success (Cool Under Pressure)
    architect: false,          // §3.12 Architect mode: House skill + personal drive as the TN
    calcPred: false,           // Calculated Prediction: preset Understand D4 predictions test
    predExtra: 0,              // extra predictions bought at 2 Momentum each (after a passed calcPred)
    assists: [],               // [{ id, skill, drive, focus }] — each rolls 1d20 (§3.1 assist)
    opposed: { on: false, defenderId: '', dSkill: SKILLS[0].id, dDrive: DRIVES[0].id,
               dFocus: false, dAssets: 0, successes: null },   // defender rolls first (§3.1)
  };
  const house = getHouse();
  const architectReady = !!(house && house.skills);   // Great Game numeric layer only
  const others = listCharacters().filter((c) => c.id !== character.id);
  let result = null;           // { values:[…], reRolls:number } once rolled
  let assistDice = [];         // [{ id, name, skill, drive, value, successes }] once rolled

  const container = el('div', {});
  // Native replaceChildren stringifies a null arg into a "null" text node — filter them out.
  const setUI = (...kids) => container.replaceChildren(...kids.filter((k) => k != null));
  const close = modal(container, { labelledBy: 'roll-title', onClose: () => onDone && onDone() });
  render();

  // Architect mode (§3.12): act on behalf of the House — House skill + the character's drive.
  function skillRating() { return cfg.architect && architectReady ? house.skills[cfg.skill] : character.skills[cfg.skill]; }
  function tn() {
    return cfg.architect && architectReady
      ? house.skills[cfg.skill] + character.drives[cfg.drive]
      : targetNumber(character, cfg.skill, cfg.drive);
  }
  function render() { result ? renderResult() : renderConfig(); }

  // Calculated Prediction (§3.9): a preset Understand-D4 test that yields 1 prediction on
  // success, +1 per 2 Momentum spent afterward.
  function calcPredTalent() { return talentDefs().find((d) => d.auto?.type === 'testForPredictions'); }

  // Applicable traits shift Difficulty (§3.6 modifier model): negative harder (+1), positive easier (−1).
  function traitDelta() {
    const traits = character.traits || [];
    return [...cfg.appliedTraits].reduce((n, i) => n + (traits[i] && traits[i].negative ? 1 : -1), 0);
  }
  // Opposed test (§3.1): the defender's successes (+1 per defensive asset) set the active Difficulty.
  function opposedActive() { return cfg.opposed.on && cfg.opposed.successes != null; }
  function baseDiff() { return opposedActive() ? cfg.opposed.successes + cfg.opposed.dAssets : cfg.difficulty; }
  function effDiff() {
    return clamp(baseDiff() + traitDelta() + talentDiffDelta(), 0, opposedActive() ? 99 : 5);
  }
  // Assists (§3.1): pair each configured assist to its character; roll 1d20 each; successes count
  // only if the leader themselves scored ≥1. Focuses apply (ruling #2); a natural 20 still complicates.
  function assistChar(id) { return others.find((c) => c.id === id) || null; }
  function rollAssists() {
    return cfg.assists.map((a) => {
      const ch = assistChar(a.id);
      if (!ch) return null;
      const v = rollD20s(1)[0];
      const atn = (ch.skills[a.skill] ?? 4) + (ch.drives[a.drive] ?? 4);
      const success = v <= atn;
      const crit = success && (v === 1 || (a.focus && v <= (ch.skills[a.skill] ?? 4)));
      return { id: a.id, name: ch.identity.name || 'Unnamed', skill: a.skill, drive: a.drive,
        value: v, success, crit, complication: v === 20, successes: crit ? 2 : success ? 1 : 0 };
    }).filter(Boolean);
  }
  // Talent-embedded automation, keyed off the machine-readable `auto` descriptors (§3.9).
  // Pair each character talent (with its picked skill/drive parameter) to its catalog def.
  function talentEntries() {
    return (character.talents || []).map((t, idx) => {
      const def = findTalent(t.name);
      return def ? { t, def, idx } : null;
    }).filter(Boolean);
  }
  function talentDefs() { return talentEntries().map((e) => e.def); }
  function voiceTalent() { return talentDefs().find((d) => d.auto?.type === 'buyAutoSuccessesWithThreat' && d.auto.skill === cfg.skill); }
  function autoOneTalent() { return talentDefs().find((d) => d.auto?.type === 'autoOneDie' && d.auto.skill === cfg.skill); }
  // Other Memory-style flat auto-successes (no skill restriction, condition is narrative).
  function autoSuccessTalent() { return talentDefs().find((d) => d.auto?.type === 'autoSuccesses'); }
  // Cool Under Pressure-style: spend 1 Determination → the test auto-succeeds (skill-bound param must match).
  function coolTalent() { return talentEntries().find(({ t, def }) => def.auto?.type === 'determinationAutoSucceed' && (def.pick !== 'skill' || t.skill === cfg.skill))?.def; }

  // difficultyDelta talents applicable to the chosen skill (Nimble, Masterful Innuendo, Ransack, Constantly Watching).
  function diffTalents() {
    return talentEntries().filter(({ def }) => def.auto?.type === 'difficultyDelta' && (!def.auto.skill || def.auto.skill === cfg.skill));
  }
  function parseThreatCost(cost) { const m = /(\d+)\s*Threat/i.exec(cost || ''); return m ? Number(m[1]) : 0; }
  function talentDiffDelta() {
    return diffTalents().filter(({ idx }) => cfg.talentDiffs.has(idx)).reduce((n, { def }) => n + (def.auto.delta || 0), 0);
  }
  function talentThreatCost() {
    return diffTalents().filter(({ idx }) => cfg.talentDiffs.has(idx)).reduce((n, { def }) => n + parseThreatCost(def.auto.cost), 0);
  }
  // rerollOne talents that grant a free single-die re-roll on this test (Bold, Cautious, Prana-Bindu, The Reason I Fight).
  function rerollTalents() {
    return talentEntries().filter(({ t, def }) => {
      const a = def.auto;
      if (!a || a.type !== 'rerollOne') return false;
      if (a.when === 'boughtDiceWithThreat' && !(cfg.bought > 0 && cfg.buyWith === 'threat')) return false;
      if (a.when === 'boughtDiceWithMomentum' && !(cfg.bought > 0 && cfg.buyWith === 'momentum')) return false;
      if (a.skills && !a.skills.includes(cfg.skill)) return false;
      if (a.skill && a.skill !== cfg.skill) return false;
      if (a.usesPickedDrive && t.drive !== cfg.drive) return false;
      if (def.pick === 'skill' && t.skill && t.skill !== cfg.skill) return false;
      return true;
    });
  }

  // ---------- pre-roll config ----------
  function renderConfig() {
    const pools = getPools();
    const eligible = determinationEligible(character, cfg.drive);
    if (!eligible) cfg.autoOne = false;
    const vt = voiceTalent(), aot = autoOneTalent();
    const om = autoSuccessTalent(), cool = coolTalent();
    if (!vt) cfg.voice = 0;
    if (!aot) cfg.mentatAutoOne = false;
    if (!om) cfg.otherMemory = false;
    if (!cool || !eligible) cfg.coolAuto = false;
    if (cfg.coolAuto) cfg.autoOne = false;   // both spend Determination; auto-success supersedes auto-1
    if (!architectReady) cfg.architect = false;
    const cp = calcPredTalent();
    if (!cp) cfg.calcPred = false;
    if (cfg.calcPred) { cfg.skill = cp.auto.skill; cfg.difficulty = cp.auto.difficulty; cfg.opposed.on = false; }
    const dts = diffTalents();
    const dtIdx = new Set(dts.map((e) => e.idx));
    for (const i of [...cfg.talentDiffs]) if (!dtIdx.has(i)) cfg.talentDiffs.delete(i);

    const traits = character.traits || [];
    const traitSection = traits.length ? el('div', {},
      el('p', { class: 'small muted' }, 'Traits that apply here ', cite('Traits', close), ' (negative = +1 Difficulty, positive = −1):'),
      ...traits.map((tr, i) => {
        const box = el('input', { type: 'checkbox', id: `roll-tr-${i}` });
        box.checked = cfg.appliedTraits.has(i);
        box.addEventListener('change', () => { box.checked ? cfg.appliedTraits.add(i) : cfg.appliedTraits.delete(i); render(); });
        return el('label', { class: 'toggle-row', for: `roll-tr-${i}` },
          el('span', {}, tr.name, el('span', { class: 'tag' }, tr.negative ? 'negative' : 'positive')), box);
      })) : null;

    const talentSection = (vt || aot || om || cool) ? el('div', {},
      el('p', { class: 'small muted' }, 'Talents'),
      vt ? el('div', { class: 'field' },
        el('span', {}, `${vt.name}: auto-successes for Threat (max ${vt.auto.max})`),
        el('div', { class: 'stepper' },
          el('button', { class: 'step-btn', 'aria-label': 'Fewer Voice successes', onclick: () => { if (cfg.voice > 0) { cfg.voice--; render(); } } }, '−'),
          el('span', { class: 'stat-val' }, String(cfg.voice)),
          el('button', { class: 'step-btn', 'aria-label': 'More Voice successes', onclick: () => { if (cfg.voice < (vt.auto.max || 3)) { cfg.voice++; render(); } } }, '+'))) : null,
      aot ? (() => {
        const box = el('input', { type: 'checkbox', id: 'roll-tauto1' });
        box.checked = cfg.mentatAutoOne;
        box.addEventListener('change', () => { cfg.mentatAutoOne = box.checked; });
        return el('label', { class: 'toggle-row', for: 'roll-tauto1' }, el('span', {}, `${aot.name}: one die counts as 1`), box);
      })() : null,
      om ? (() => {
        const box = el('input', { type: 'checkbox', id: 'roll-om' });
        box.checked = cfg.otherMemory;
        box.addEventListener('change', () => { cfg.otherMemory = box.checked; render(); });
        return el('label', { class: 'toggle-row', for: 'roll-om' }, el('span', {}, `${om.name}: +${om.auto.count} automatic successes${om.auto.condition ? ` (${om.auto.condition})` : ''}`), box);
      })() : null,
      cool ? (() => {
        const box = el('input', { type: 'checkbox', id: 'roll-cool' });
        box.checked = cfg.coolAuto;
        box.addEventListener('change', () => { cfg.coolAuto = box.checked; render(); });
        return el('label', { class: 'toggle-row', for: 'roll-cool' }, el('span', {}, `${cool.name}: spend 1 Determination — automatic success (0 Momentum)`), box);
      })() : null) : null;

    const diffTalentSection = dts.length ? el('div', {},
      el('p', { class: 'small muted' }, 'Talent effects on Difficulty'),
      ...dts.map(({ def, idx }) => {
        const box = el('input', { type: 'checkbox', id: `roll-dt-${idx}` });
        box.checked = cfg.talentDiffs.has(idx);
        box.addEventListener('change', () => { box.checked ? cfg.talentDiffs.add(idx) : cfg.talentDiffs.delete(idx); render(); });
        const d = def.auto.delta, sign = d > 0 ? `+${d}` : String(d);
        const label = `${def.name}: ${sign} Difficulty${def.auto.cost ? ` (${def.auto.cost})` : ''}${def.auto.condition ? ` — ${def.auto.condition}` : ''}`;
        return el('label', { class: 'toggle-row', for: `roll-dt-${idx}` }, el('span', {}, label), box);
      })) : null;

    const skillSel = el('select', { 'aria-label': 'Skill' },
      ...SKILLS.map((s) => el('option', { value: s.id, selected: cfg.skill === s.id ? '' : null }, `${s.name} ${character.skills[s.id]}`)));
    skillSel.addEventListener('change', () => { cfg.skill = skillSel.value; render(); });

    const driveSel = el('select', { 'aria-label': 'Drive' },
      ...charDriveIds(character).map((id) => el('option', { value: id, selected: cfg.drive === id ? '' : null }, `${driveName(id)} ${character.drives[id]}`)));
    driveSel.addEventListener('change', () => { cfg.drive = driveSel.value; render(); });

    const diffSel = el('select', { 'aria-label': 'Difficulty' },
      ...DATA.difficulty.map((d) => el('option', { value: String(d.value), selected: cfg.difficulty === d.value ? '' : null }, `${d.value} · ${d.name}`)));
    diffSel.addEventListener('change', () => { cfg.difficulty = Number(diffSel.value); render(); });

    const cost = buyCost(cfg.bought);
    const buyDec = el('button', { class: 'step-btn', 'aria-label': 'Fewer bought dice', onclick: () => { if (cfg.bought > 0) { cfg.bought--; render(); } } }, '−');
    const buyInc = el('button', { class: 'step-btn', 'aria-label': 'More bought dice', onclick: () => { if (BASE_DICE + cfg.bought < MAX_DICE) { cfg.bought++; render(); } } }, '+');
    const buyWithSel = el('select', { 'aria-label': 'Pay bought dice with' },
      el('option', { value: 'momentum', selected: cfg.buyWith === 'momentum' ? '' : null }, 'spend Momentum'),
      el('option', { value: 'threat', selected: cfg.buyWith === 'threat' ? '' : null }, 'give GM Threat'));
    buyWithSel.addEventListener('change', () => { cfg.buyWith = buyWithSel.value; render(); });

    if (cfg.calcPred) { skillSel.disabled = true; diffSel.disabled = true; }

    // Architect mode (§3.12) — only when the House carries Great Game skill numbers.
    const architectSection = architectReady ? (() => {
      const box = el('input', { type: 'checkbox', id: 'roll-arch' });
      box.checked = cfg.architect;
      box.addEventListener('change', () => { cfg.architect = box.checked; render(); });
      return el('label', { class: 'toggle-row', for: 'roll-arch' },
        el('span', {}, `Architect mode: act for ${house.name || 'the House'} (House ${SKILLS.find((s) => s.id === cfg.skill).name} ${house.skills[cfg.skill]} + your drive)`, cite('Conflict types', close)), box);
    })() : null;

    // Calculated Prediction (§3.9) — preset Understand D4 predictions test. (`cp` declared above.)
    const calcPredSection = cp ? (() => {
      const box = el('input', { type: 'checkbox', id: 'roll-cp' });
      box.checked = cfg.calcPred;
      box.addEventListener('change', () => { cfg.calcPred = box.checked; render(); });
      return el('label', { class: 'toggle-row', for: 'roll-cp' },
        el('span', {}, `${cp.name}: preset Understand test (Difficulty ${cp.auto.difficulty}) — 1 prediction, +1 per 2 Momentum`), box);
    })() : null;

    const focusBox = el('input', { type: 'checkbox', id: 'roll-focus' });
    focusBox.checked = cfg.focus;
    focusBox.addEventListener('change', () => { cfg.focus = focusBox.checked; });

    const detBox = el('input', { type: 'checkbox', id: 'roll-auto1' });
    detBox.checked = cfg.autoOne;
    detBox.disabled = !eligible || cfg.coolAuto;
    detBox.addEventListener('change', () => { cfg.autoOne = detBox.checked; });

    const afford = cfg.buyWith === 'momentum' ? pools.momentum >= cost : true;

    // ---- Assists (§3.1): each assistant rolls 1d20; counts only if the leader scores ≥1. ----
    const available = others.filter((c) => !cfg.assists.some((a) => a.id === c.id));
    const assistRows = cfg.assists.map((a, i) => {
      const ch = assistChar(a.id);
      const sSel = el('select', { 'aria-label': 'Assist skill' },
        ...SKILLS.map((s) => el('option', { value: s.id, selected: a.skill === s.id ? '' : null }, `${s.name} ${ch.skills[s.id]}`)));
      sSel.addEventListener('change', () => { a.skill = sSel.value; render(); });
      const dSel = el('select', { 'aria-label': 'Assist drive' },
        ...charDriveIds(ch).map((id) => el('option', { value: id, selected: a.drive === id ? '' : null }, `${driveName(id)} ${ch.drives[id]}`)));
      dSel.addEventListener('change', () => { a.drive = dSel.value; render(); });
      const fBox = el('input', { type: 'checkbox', id: `assist-f-${i}` });
      fBox.checked = a.focus;
      fBox.addEventListener('change', () => { a.focus = fBox.checked; });
      return el('div', { class: 'field' },
        el('span', {}, `${ch.identity.name || 'Unnamed'} — TN ${(ch.skills[a.skill] ?? 4) + (ch.drives[a.drive] ?? 4)}`,
          el('button', { class: 'chip-x', 'aria-label': 'Remove assistant', onclick: () => { cfg.assists.splice(i, 1); render(); } }, '×')),
        el('div', { class: 'focus-row' }, sSel, dSel,
          el('label', { class: 'small', for: `assist-f-${i}` }, fBox, ' focus')));
    });
    const addAssistSel = available.length ? (() => {
      const sel = el('select', { 'aria-label': 'Add assistant' },
        el('option', { value: '' }, '+ Add assistant…'),
        ...available.map((c) => el('option', { value: c.id }, c.identity.name || 'Unnamed')));
      sel.addEventListener('change', () => { if (sel.value) { const ac = assistChar(sel.value); cfg.assists.push({ id: sel.value, skill: SKILLS[0].id, drive: charDriveIds(ac)[0] || DRIVES[0].id, focus: false }); render(); } });
      return sel;
    })() : null;
    const assistSection = (cfg.assists.length || available.length) ? el('div', {},
      el('p', { class: 'small muted' }, 'Assists ', cite('Assists', close),
        ' — each rolls 1d20; counts only if you score ≥ 1 success'),
      ...assistRows, addAssistSel) : null;

    // ---- Opposed test (§3.1): defender rolls first; their successes (+defensive assets) = Difficulty. ----
    const oppToggle = el('input', { type: 'checkbox', id: 'roll-opp' });
    oppToggle.checked = cfg.opposed.on;
    oppToggle.addEventListener('change', () => {
      cfg.opposed.on = oppToggle.checked;
      cfg.opposed.successes = cfg.opposed.on && !cfg.opposed.defenderId ? 0 : null;
      if (cfg.opposed.on) cfg.calcPred = false;
      render();
    });
    let opposedBody = null;
    if (cfg.opposed.on) {
      const defSel = el('select', { 'aria-label': 'Defender' },
        el('option', { value: '', selected: cfg.opposed.defenderId === '' ? '' : null }, 'Manual (enter successes)'),
        ...others.map((c) => el('option', { value: c.id, selected: cfg.opposed.defenderId === c.id ? '' : null }, c.identity.name || 'Unnamed')));
      defSel.addEventListener('change', () => {
        cfg.opposed.defenderId = defSel.value;
        cfg.opposed.successes = defSel.value ? null : 0;   // character defender must roll first
        if (defSel.value) cfg.opposed.dDrive = charDriveIds(assistChar(defSel.value))[0] || cfg.opposed.dDrive;
        render();
      });
      const assetsStep = el('div', { class: 'stepper' },
        el('button', { class: 'step-btn', 'aria-label': 'Fewer defensive assets', onclick: () => { if (cfg.opposed.dAssets > 0) { cfg.opposed.dAssets--; render(); } } }, '−'),
        el('span', { class: 'stat-val' }, String(cfg.opposed.dAssets)),
        el('button', { class: 'step-btn', 'aria-label': 'More defensive assets', onclick: () => { cfg.opposed.dAssets++; render(); } }, '+'));

      let defenderCtl;
      if (cfg.opposed.defenderId) {
        const dch = assistChar(cfg.opposed.defenderId);
        const dSkillSel = el('select', { 'aria-label': 'Defender skill' },
          ...SKILLS.map((s) => el('option', { value: s.id, selected: cfg.opposed.dSkill === s.id ? '' : null }, `${s.name} ${dch.skills[s.id]}`)));
        dSkillSel.addEventListener('change', () => { cfg.opposed.dSkill = dSkillSel.value; cfg.opposed.successes = null; render(); });
        const dDriveSel = el('select', { 'aria-label': 'Defender drive' },
          ...charDriveIds(dch).map((id) => el('option', { value: id, selected: cfg.opposed.dDrive === id ? '' : null }, `${driveName(id)} ${dch.drives[id]}`)));
        dDriveSel.addEventListener('change', () => { cfg.opposed.dDrive = dDriveSel.value; cfg.opposed.successes = null; render(); });
        const dfBox = el('input', { type: 'checkbox', id: 'opp-focus' });
        dfBox.checked = cfg.opposed.dFocus;
        dfBox.addEventListener('change', () => { cfg.opposed.dFocus = dfBox.checked; cfg.opposed.successes = null; render(); });
        const rollBtn = el('button', { class: 'btn secondary', onclick: () => {
          const dtn = dch.skills[cfg.opposed.dSkill] + dch.drives[cfg.opposed.dDrive];
          const v = rollD20s(BASE_DICE);
          let succ = 0;
          for (const x of v) succ += (x <= dtn) ? ((x === 1 || (cfg.opposed.dFocus && x <= dch.skills[cfg.opposed.dSkill])) ? 2 : 1) : 0;
          cfg.opposed.successes = succ;
          showToast(`${dch.identity.name || 'Defender'} rolled ${succ} success${succ === 1 ? '' : 'es'}`);
          render();
        } }, cfg.opposed.successes == null ? 'Roll defender first' : 'Re-roll defender');
        defenderCtl = el('div', {}, el('div', { class: 'focus-row' }, dSkillSel, dDriveSel),
          el('label', { class: 'small', for: 'opp-focus' }, dfBox, ' defender focus'), el('div', {}, rollBtn));
      } else {
        defenderCtl = el('div', { class: 'field' }, el('span', {}, 'Defender successes'),
          el('div', { class: 'stepper' },
            el('button', { class: 'step-btn', 'aria-label': 'Fewer defender successes', onclick: () => { cfg.opposed.successes = Math.max(0, (cfg.opposed.successes || 0) - 1); render(); } }, '−'),
            el('span', { class: 'stat-val' }, String(cfg.opposed.successes ?? 0)),
            el('button', { class: 'step-btn', 'aria-label': 'More defender successes', onclick: () => { cfg.opposed.successes = (cfg.opposed.successes || 0) + 1; render(); } }, '+')));
      }
      opposedBody = el('div', {}, el('div', { class: 'field' }, el('span', {}, 'Defender'), defSel),
        el('div', { class: 'field' }, el('span', {}, 'Defensive assets in their zone (+1 Difficulty each)'), assetsStep),
        defenderCtl,
        opposedActive()
          ? el('p', {}, el('span', { class: 'pill' }, `Difficulty ${effDiff()} (defender ${cfg.opposed.successes} + ${cfg.opposed.dAssets} assets)`))
          : el('p', { class: 'small muted' }, 'Defender rolls first — set their successes to lock the Difficulty.'));
    }
    const opposedSection = (others.length || cfg.opposed.on) ? el('div', {},
      el('label', { class: 'toggle-row', for: 'roll-opp' },
        el('span', {}, 'Opposed test ', cite('Opposed tests', close)), oppToggle),
      opposedBody) : null;

    const oppNeedsRoll = cfg.opposed.on && cfg.opposed.defenderId && cfg.opposed.successes == null;

    const rollBtn = el('button', { class: 'btn', onclick: () => {
      if (!cfg.coolAuto && !afford) { showToast(`Not enough Momentum (need ${cost}).`); return; }
      if (oppNeedsRoll) { showToast('Roll the defender first.'); return; }
      doRoll();
    } }, cfg.coolAuto ? 'Auto-succeed' : 'Roll');
    if (oppNeedsRoll) rollBtn.disabled = true;

    setUI(
      el('h2', { id: 'roll-title' }, 'Roll a test', cite('Skill test basics', close)),
      el('div', { class: 'field' }, el('span', {}, 'Skill'), skillSel),
      el('div', { class: 'field' }, el('span', {}, 'Drive'), driveSel),
      el('p', {}, el('span', { class: 'pill' }, `Target number ${tn()}`),
        el('span', { class: 'pill' }, `${BASE_DICE + cfg.bought} dice`)),
      architectSection,
      calcPredSection,
      cfg.opposed.on ? null : el('div', { class: 'field' }, el('span', {}, 'Difficulty'), diffSel),
      (!cfg.opposed.on && (traitDelta() + talentDiffDelta()) !== 0) ? (() => {
        const tot = traitDelta() + talentDiffDelta();
        return el('p', {}, el('span', { class: 'pill' }, `Effective Difficulty ${effDiff()} (${tot > 0 ? '+' : ''}${tot})`));
      })() : null,
      traitSection,
      talentSection,
      diffTalentSection,
      opposedSection,
      assistSection,
      el('div', { class: 'field' }, el('span', {}, `Buy extra dice (max ${MAX_DICE - BASE_DICE})`),
        el('div', { class: 'stepper' }, buyDec, el('span', { class: 'stat-val' }, String(cfg.bought)), buyInc)),
      cfg.bought ? el('div', { class: 'field' }, el('span', {}, `Cost: ${cost} ${cfg.buyWith === 'momentum' ? 'Momentum' : 'Threat'}`), buyWithSel) : null,
      el('label', { class: 'toggle-row', for: 'roll-focus' }, el('span', {}, `Applicable focus (crit on ≤ ${skillRating()})`), focusBox),
      el('label', { class: 'toggle-row', for: 'roll-auto1' },
        el('span', {}, eligible ? 'Spend 1 Determination: one automatic 1' : 'Determination: needs an unchallenged statement on this drive'),
        detBox),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
        rollBtn),
    );
  }

  function doRoll() {
    if (cfg.coolAuto) { result = { auto: true, reRolls: 0, talentRerolls: new Set() }; render(); return; }
    const values = rollD20s(BASE_DICE + cfg.bought);
    let forced = (cfg.autoOne ? 1 : 0) + (cfg.mentatAutoOne ? 1 : 0);   // guaranteed 1s (crits)
    for (let i = 0; i < values.length && forced > 0; i++, forced--) values[i] = 1;
    assistDice = cfg.assists.length ? rollAssists() : [];   // each assistant rolls a single d20 (§3.1)
    cfg.predExtra = 0;
    result = { values, reRolls: 0, talentRerolls: new Set() };   // talentRerolls: idxs of used free re-rolls
    render();
  }

  // ---------- result ----------
  function renderResult() {
    if (result.auto) { renderAutoResult(); return; }
    const dice = evaluateDice(result.values, { tn: tn(), skillRating: skillRating(), focus: cfg.focus });
    const diff = effDiff();
    const om = autoSuccessTalent();
    const bonusAuto = cfg.voice + (cfg.otherMemory && om ? om.auto.count : 0);   // Voice + Other Memory flat successes
    // Leader's own successes gate the assists (§3.1): assist successes count only if the leader scores ≥1.
    const leaderOwn = dice.reduce((n, d) => n + d.successes, 0) + bonusAuto;
    const assistSuccesses = leaderOwn >= 1 ? assistDice.reduce((n, a) => n + a.successes, 0) : 0;
    const assistComplications = assistDice.filter((a) => a.complication).length;
    const successes = leaderOwn + assistSuccesses;
    const complications = dice.filter((d) => d.complication).length + assistComplications;
    const passed = successes >= diff;    // tie → active wins (successes >= Difficulty)
    const momentum = passed ? successes - diff : 0;
    // Opposed failure banks the shortfall as defender Momentum (§3.1).
    const opposedShortfall = (cfg.opposed.on && !passed) ? diff - successes : 0;
    // Calculated Prediction: 1 base prediction on success, +1 per 2 Momentum spent afterward.
    const availMomentum = getPools().momentum + momentum
      + (cfg.bought && cfg.buyWith === 'momentum' ? -buyCost(cfg.bought) : 0);
    const maxPredExtra = Math.max(0, Math.floor(availMomentum / 2));
    if (cfg.predExtra > maxPredExtra) cfg.predExtra = maxPredExtra;
    const predictions = (cfg.calcPred && passed) ? 1 + cfg.predExtra : 0;

    const detLeft = character.determination - (cfg.autoOne ? 1 : 0) - result.reRolls;
    const canReRoll = determinationEligible(character, cfg.drive) && detLeft > 0;
    const freeRerolls = rerollTalents().filter(({ idx }) => !result.talentRerolls.has(idx));   // unused free single-die re-rolls
    const anyReroll = canReRoll || freeRerolls.length > 0;
    const selected = new Set();

    const dieChip = (d, i) => {
      const cls = d.complication ? 'die comp' : d.crit ? 'die crit' : d.success ? 'die hit' : 'die miss';
      const chip = el('button', { type: 'button', class: cls, 'aria-pressed': 'false',
        title: anyReroll ? 'Select to re-roll' : '' }, String(d.value));
      if (anyReroll) chip.addEventListener('click', () => {
        if (selected.has(i)) { selected.delete(i); chip.setAttribute('aria-pressed', 'false'); chip.classList.remove('sel'); }
        else { selected.add(i); chip.setAttribute('aria-pressed', 'true'); chip.classList.add('sel'); }
      });
      return chip;
    };

    const predStepper = (cfg.calcPred && passed) ? el('div', { class: 'field' },
      el('span', {}, `Predictions: ${predictions} (spend 2 Momentum each for more)`),
      el('div', { class: 'stepper' },
        el('button', { class: 'step-btn', 'aria-label': 'Fewer predictions', onclick: () => { if (cfg.predExtra > 0) { cfg.predExtra--; render(); } } }, '−'),
        el('span', { class: 'stat-val' }, String(predictions)),
        el('button', { class: 'step-btn', 'aria-label': 'More predictions', onclick: () => { if (cfg.predExtra < maxPredExtra) { cfg.predExtra++; render(); } } }, '+'))) : null;

    setUI(
      el('h2', { id: 'roll-title' }, passed ? 'Success' : 'Failure', cite('Skill test basics', close)),
      el('p', { class: 'small muted' }, `${SKILLS.find((s) => s.id === cfg.skill).name} + ${driveName(cfg.drive)} · TN ${tn()} · Difficulty ${diff}${cfg.architect ? ' · Architect' : ''}${cfg.voice ? ` · +${cfg.voice} Voice` : ''}${cfg.otherMemory && om ? ` · +${om.auto.count} ${om.name}` : ''}`),
      el('div', { class: 'dice-row' }, ...dice.map(dieChip)),
      assistDice.length ? el('div', {},
        el('p', { class: 'small muted' }, leaderOwn >= 1 ? 'Assist dice' : 'Assist dice (void — you scored 0 successes)'),
        el('div', { class: 'dice-row' }, ...assistDice.map((a) => el('span', {
          class: 'die ' + (a.complication ? 'comp' : a.crit ? 'crit' : a.success ? 'hit' : 'miss') + (leaderOwn >= 1 ? '' : ' miss'),
          title: `${a.name}: ${SKILLS.find((s) => s.id === a.skill).name}+${driveName(a.drive)}` }, String(a.value)))) ) : null,
      el('p', { 'aria-live': 'polite' },
        el('span', { class: 'pill' }, `${successes} success${successes === 1 ? '' : 'es'}`),
        el('span', { class: 'pill' }, passed ? `+${momentum} Momentum` : 'failed'),
        complications ? el('span', { class: 'pill danger-pill' }, `${complications} complication${complications === 1 ? '' : 's'}`) : null,
        assistSuccesses ? el('span', { class: 'pill' }, `+${assistSuccesses} assist`) : null,
        opposedShortfall ? el('span', { class: 'pill danger-pill' }, `defender +${opposedShortfall} Momentum`) : null,
        predictions ? el('span', { class: 'pill' }, `${predictions} prediction${predictions === 1 ? '' : 's'}`) : null),
      predStepper,
      anyReroll ? el('p', { class: 'small muted' }, canReRoll
        ? `Tap dice to select, then re-roll (1 Determination each, ${detLeft} left${freeRerolls.length ? '; or a free talent re-roll' : ''}).`
        : 'Tap one die to select, then use a free talent re-roll below.') : null,
      el('div', { class: 'modal-actions' },
        canReRoll ? el('button', { class: 'btn secondary', onclick: () => {
          if (!selected.size) { showToast('Select at least one die to re-roll.'); return; }
          for (const i of selected) result.values[i] = rollD20s(1)[0];
          result.reRolls++;
          render();
        } }, 'Re-roll selected') : null,
        ...freeRerolls.map(({ t, def, idx }) => el('button', { class: 'btn secondary', onclick: () => {
          if (!selected.size) { showToast('Select a die to re-roll.'); return; }
          const i = [...selected][0];
          result.values[i] = rollD20s(1)[0];
          result.talentRerolls.add(idx);
          render();
        } }, `Re-roll one · ${def.name}${t.skill ? ` (${SKILLS.find((s) => s.id === t.skill)?.name})` : ''}`)),
        el('button', { class: 'btn', onclick: () => commit({ successes, complications, passed, momentum, opposedShortfall, predictions, assistSuccesses }) }, 'Apply result')),
    );
  }

  // Cool Under Pressure: automatic success, 0 Momentum, no dice rolled (§3.9).
  function renderAutoResult() {
    const cool = coolTalent();
    setUI(
      el('h2', { id: 'roll-title' }, 'Success'),
      el('p', { class: 'small muted' }, `${SKILLS.find((s) => s.id === cfg.skill).name} + ${driveName(cfg.drive)} · automatic success`),
      el('p', { 'aria-live': 'polite' },
        el('span', { class: 'pill' }, `${cool?.name || 'Cool Under Pressure'}`),
        el('span', { class: 'pill' }, '+0 Momentum'),
        el('span', { class: 'pill' }, '−1 Determination')),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn', onclick: () => commitAuto() }, 'Apply result')),
    );
  }

  function commitAuto() {
    saveCharacter({ ...character, determination: clampDetermination(character.determination - 1) });
    appendRoll({
      by: character.owner || null, characterName: character.identity.name || 'Unnamed',
      skill: cfg.skill, drive: cfg.drive, tn: tn(), dice: [],
      successes: effDiff(), complications: 0, momentumDelta: 0, threatDelta: 0,
      note: `Automatic success · ${coolTalent()?.name || 'Cool Under Pressure'} · 1 Determination`,
    });
    showToast('Automatic success');
    close();
  }

  function commit({ successes, complications, passed, momentum, opposedShortfall = 0, predictions = 0, assistSuccesses = 0 }) {
    const pools = getPools();
    const cost = buyCost(cfg.bought);
    let momentumDelta = 0, threatDelta = 0;
    if (cfg.bought) { if (cfg.buyWith === 'momentum') momentumDelta -= cost; else threatDelta += cost; }
    if (cfg.voice) threatDelta += cfg.voice;      // Voice-style auto-successes are bought with Threat
    threatDelta += talentThreatCost();            // difficultyDelta talents that cost Threat (e.g. Ransack +2)
    if (passed) momentumDelta += momentum;
    if (opposedShortfall) momentumDelta += opposedShortfall;      // defender banks the shortfall (§3.1)
    if (predictions > 1) momentumDelta -= 2 * cfg.predExtra;      // Calculated Prediction: 2 Momentum per extra
    const detSpent = (cfg.autoOne ? 1 : 0) + result.reRolls;
    const diffUsed = diffTalents().filter(({ idx }) => cfg.talentDiffs.has(idx)).map(({ def }) => def.name);

    savePools({
      momentum: clampMomentum(pools.momentum + momentumDelta),
      threat: Math.max(0, pools.threat + threatDelta),
    });
    if (detSpent) saveCharacter({ ...character, determination: clampDetermination(character.determination - detSpent) });

    const extras = [
      cfg.architect ? `Architect (${house.name || 'House'} skill)` : null,
      cfg.opposed.on ? `opposed (Diff ${effDiff()})` : null,
      opposedShortfall ? `defender +${opposedShortfall} Momentum` : null,
      assistSuccesses ? `+${assistSuccesses} from ${cfg.assists.length} assist${cfg.assists.length === 1 ? '' : 's'}` : null,
      predictions ? `${predictions} prediction${predictions === 1 ? '' : 's'} (${calcPredTalent()?.name || 'Calculated Prediction'})` : null,
      detSpent ? `${detSpent} Determination` : null,
      cfg.voice ? `${voiceTalent()?.name || 'Voice'} +${cfg.voice}` : null,
      cfg.otherMemory && autoSuccessTalent() ? `${autoSuccessTalent().name} +${autoSuccessTalent().auto.count}` : null,
      cfg.mentatAutoOne ? (autoOneTalent()?.name || 'auto-1') : null,
      diffUsed.length ? diffUsed.join(', ') : null,
      result.talentRerolls.size ? `talent re-roll ×${result.talentRerolls.size}` : null,
      cfg.appliedTraits.size ? `${cfg.appliedTraits.size} trait${cfg.appliedTraits.size === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    appendRoll({
      by: character.owner || null, characterName: character.identity.name || 'Unnamed',
      skill: cfg.skill, drive: cfg.drive, tn: tn(), dice: result.values.slice(),
      successes, complications, momentumDelta, threatDelta,
      note: `${passed ? 'Success' : 'Failure'} vs Diff ${effDiff()}${extras.length ? ` · ${extras.join(' · ')}` : ''}`,
    });
    showToast(passed ? `Success · +${momentum} Momentum` : 'Failed');
    close();
  }
}
