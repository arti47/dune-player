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
// Deferred to later Phase-3 passes: opposed tests, assists, Architect mode, rules citations.

import { el, rollD20s, clamp } from './core.js';
import { modal, showToast } from './ui.js';
import { getPools, savePools, saveCharacter, appendRoll } from './store.js';
import { targetNumber, clampMomentum, clampDetermination } from './derived.js';
import { DATA } from '../data.js';

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
    drive: DRIVES[0].id,
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
  };
  let result = null;           // { values:[…], reRolls:number } once rolled

  const container = el('div', {});
  // Native replaceChildren stringifies a null arg into a "null" text node — filter them out.
  const setUI = (...kids) => container.replaceChildren(...kids.filter((k) => k != null));
  const close = modal(container, { labelledBy: 'roll-title', onClose: () => onDone && onDone() });
  render();

  function skillRating() { return character.skills[cfg.skill]; }
  function tn() { return targetNumber(character, cfg.skill, cfg.drive); }
  function render() { result ? renderResult() : renderConfig(); }

  // Applicable traits shift Difficulty (§3.6 modifier model): negative harder (+1), positive easier (−1).
  function traitDelta() {
    const traits = character.traits || [];
    return [...cfg.appliedTraits].reduce((n, i) => n + (traits[i] && traits[i].negative ? 1 : -1), 0);
  }
  function effDiff() { return clamp(cfg.difficulty + traitDelta() + talentDiffDelta(), 0, 5); }
  // Talent-embedded automation, keyed off the machine-readable `auto` descriptors (§3.9).
  // Pair each character talent (with its picked skill/drive parameter) to its catalog def.
  function talentEntries() {
    return (character.talents || []).map((t, idx) => {
      const def = DATA.talents.find((d) => d.name === t.name);
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
    const dts = diffTalents();
    const dtIdx = new Set(dts.map((e) => e.idx));
    for (const i of [...cfg.talentDiffs]) if (!dtIdx.has(i)) cfg.talentDiffs.delete(i);

    const traits = character.traits || [];
    const traitSection = traits.length ? el('div', {},
      el('p', { class: 'small muted' }, 'Traits that apply here (negative = +1 Difficulty, positive = −1):'),
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
      ...DRIVES.map((d) => el('option', { value: d.id, selected: cfg.drive === d.id ? '' : null }, `${d.name} ${character.drives[d.id]}`)));
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

    const focusBox = el('input', { type: 'checkbox', id: 'roll-focus' });
    focusBox.checked = cfg.focus;
    focusBox.addEventListener('change', () => { cfg.focus = focusBox.checked; });

    const detBox = el('input', { type: 'checkbox', id: 'roll-auto1' });
    detBox.checked = cfg.autoOne;
    detBox.disabled = !eligible || cfg.coolAuto;
    detBox.addEventListener('change', () => { cfg.autoOne = detBox.checked; });

    const afford = cfg.buyWith === 'momentum' ? pools.momentum >= cost : true;

    setUI(
      el('h2', { id: 'roll-title' }, 'Roll a test'),
      el('div', { class: 'field' }, el('span', {}, 'Skill'), skillSel),
      el('div', { class: 'field' }, el('span', {}, 'Drive'), driveSel),
      el('p', {}, el('span', { class: 'pill' }, `Target number ${tn()}`),
        el('span', { class: 'pill' }, `${BASE_DICE + cfg.bought} dice`)),
      el('div', { class: 'field' }, el('span', {}, 'Difficulty'), diffSel),
      (traitDelta() + talentDiffDelta()) !== 0 ? (() => {
        const tot = traitDelta() + talentDiffDelta();
        return el('p', {}, el('span', { class: 'pill' }, `Effective Difficulty ${effDiff()} (${tot > 0 ? '+' : ''}${tot})`));
      })() : null,
      traitSection,
      talentSection,
      diffTalentSection,
      el('div', { class: 'field' }, el('span', {}, `Buy extra dice (max ${MAX_DICE - BASE_DICE})`),
        el('div', { class: 'stepper' }, buyDec, el('span', { class: 'stat-val' }, String(cfg.bought)), buyInc)),
      cfg.bought ? el('div', { class: 'field' }, el('span', {}, `Cost: ${cost} ${cfg.buyWith === 'momentum' ? 'Momentum' : 'Threat'}`), buyWithSel) : null,
      el('label', { class: 'toggle-row', for: 'roll-focus' }, el('span', {}, `Applicable focus (crit on ≤ ${skillRating()})`), focusBox),
      el('label', { class: 'toggle-row', for: 'roll-auto1' },
        el('span', {}, eligible ? 'Spend 1 Determination: one automatic 1' : 'Determination: needs an unchallenged statement on this drive'),
        detBox),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
        el('button', { class: 'btn', onclick: () => {
          if (!cfg.coolAuto && !afford) { showToast(`Not enough Momentum (need ${cost}).`); return; }
          doRoll();
        } }, cfg.coolAuto ? 'Auto-succeed' : 'Roll')),
    );
  }

  function doRoll() {
    if (cfg.coolAuto) { result = { auto: true, reRolls: 0, talentRerolls: new Set() }; render(); return; }
    const values = rollD20s(BASE_DICE + cfg.bought);
    let forced = (cfg.autoOne ? 1 : 0) + (cfg.mentatAutoOne ? 1 : 0);   // guaranteed 1s (crits)
    for (let i = 0; i < values.length && forced > 0; i++, forced--) values[i] = 1;
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
    const successes = dice.reduce((n, d) => n + d.successes, 0) + bonusAuto;
    const complications = dice.filter((d) => d.complication).length;
    const passed = successes >= diff;
    const momentum = passed ? successes - diff : 0;

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

    setUI(
      el('h2', { id: 'roll-title' }, passed ? 'Success' : 'Failure'),
      el('p', { class: 'small muted' }, `${SKILLS.find((s) => s.id === cfg.skill).name} + ${DRIVES.find((x) => x.id === cfg.drive).name} · TN ${tn()} · Difficulty ${diff}${cfg.voice ? ` · +${cfg.voice} Voice` : ''}${cfg.otherMemory && om ? ` · +${om.auto.count} ${om.name}` : ''}`),
      el('div', { class: 'dice-row' }, ...dice.map(dieChip)),
      el('p', { 'aria-live': 'polite' },
        el('span', { class: 'pill' }, `${successes} success${successes === 1 ? '' : 'es'}`),
        el('span', { class: 'pill' }, passed ? `+${momentum} Momentum` : 'failed'),
        complications ? el('span', { class: 'pill danger-pill' }, `${complications} complication${complications === 1 ? '' : 's'}`) : null),
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
        el('button', { class: 'btn', onclick: () => commit({ successes, complications, passed, momentum }) }, 'Apply result')),
    );
  }

  // Cool Under Pressure: automatic success, 0 Momentum, no dice rolled (§3.9).
  function renderAutoResult() {
    const cool = coolTalent();
    setUI(
      el('h2', { id: 'roll-title' }, 'Success'),
      el('p', { class: 'small muted' }, `${SKILLS.find((s) => s.id === cfg.skill).name} + ${DRIVES.find((x) => x.id === cfg.drive).name} · automatic success`),
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

  function commit({ successes, complications, passed, momentum }) {
    const pools = getPools();
    const cost = buyCost(cfg.bought);
    let momentumDelta = 0, threatDelta = 0;
    if (cfg.bought) { if (cfg.buyWith === 'momentum') momentumDelta -= cost; else threatDelta += cost; }
    if (cfg.voice) threatDelta += cfg.voice;      // Voice-style auto-successes are bought with Threat
    threatDelta += talentThreatCost();            // difficultyDelta talents that cost Threat (e.g. Ransack +2)
    if (passed) momentumDelta += momentum;
    const detSpent = (cfg.autoOne ? 1 : 0) + result.reRolls;
    const diffUsed = diffTalents().filter(({ idx }) => cfg.talentDiffs.has(idx)).map(({ def }) => def.name);

    savePools({
      momentum: clampMomentum(pools.momentum + momentumDelta),
      threat: Math.max(0, pools.threat + threatDelta),
    });
    if (detSpent) saveCharacter({ ...character, determination: clampDetermination(character.determination - detSpent) });

    const extras = [
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
