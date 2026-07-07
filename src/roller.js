// roller.js — the native 2d20 skill-test engine (Phase 3 core).
// Owns: skill+drive target number, buying dice (1/2/3 Momentum or Threat), focus crit ranges,
// natural-1 crits, natural-20 complications, Momentum generation, Determination (auto-1 before
// the roll + re-roll after, gated on an unchallenged drive statement), and roll-log writes.
// Deferred to later Phase-3 passes: opposed tests, assists, talent-embedded automation,
// Architect mode, rules-library citations.

import { el, rollD20s } from './core.js';
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
  };
  let result = null;           // { values:[…], reRolls:number } once rolled

  const container = el('div', {});
  const close = modal(container, { labelledBy: 'roll-title', onClose: () => onDone && onDone() });
  render();

  function skillRating() { return character.skills[cfg.skill]; }
  function tn() { return targetNumber(character, cfg.skill, cfg.drive); }
  function render() { result ? renderResult() : renderConfig(); }

  // ---------- pre-roll config ----------
  function renderConfig() {
    const pools = getPools();
    const eligible = determinationEligible(character, cfg.drive);
    if (!eligible) cfg.autoOne = false;

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
    detBox.disabled = !eligible;
    detBox.addEventListener('change', () => { cfg.autoOne = detBox.checked; });

    const afford = cfg.buyWith === 'momentum' ? pools.momentum >= cost : true;

    container.replaceChildren(
      el('h2', { id: 'roll-title' }, 'Roll a test'),
      el('div', { class: 'field' }, el('span', {}, 'Skill'), skillSel),
      el('div', { class: 'field' }, el('span', {}, 'Drive'), driveSel),
      el('p', {}, el('span', { class: 'pill' }, `Target number ${tn()}`),
        el('span', { class: 'pill' }, `${BASE_DICE + cfg.bought} dice`)),
      el('div', { class: 'field' }, el('span', {}, 'Difficulty'), diffSel),
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
          if (!afford) { showToast(`Not enough Momentum (need ${cost}).`); return; }
          doRoll();
        } }, 'Roll')),
    );
  }

  function doRoll() {
    const values = rollD20s(BASE_DICE + cfg.bought);
    if (cfg.autoOne) values[0] = 1;            // Determination auto-1 (a guaranteed crit)
    result = { values, reRolls: 0 };
    render();
  }

  // ---------- result ----------
  function renderResult() {
    const dice = evaluateDice(result.values, { tn: tn(), skillRating: skillRating(), focus: cfg.focus });
    const successes = dice.reduce((n, d) => n + d.successes, 0);
    const complications = dice.filter((d) => d.complication).length;
    const passed = successes >= cfg.difficulty;
    const momentum = passed ? successes - cfg.difficulty : 0;

    const detLeft = character.determination - (cfg.autoOne ? 1 : 0) - result.reRolls;
    const canReRoll = determinationEligible(character, cfg.drive) && detLeft > 0;
    const selected = new Set();

    const dieChip = (d, i) => {
      const cls = d.complication ? 'die comp' : d.crit ? 'die crit' : d.success ? 'die hit' : 'die miss';
      const chip = el('button', { type: 'button', class: cls, 'aria-pressed': 'false',
        title: canReRoll ? 'Select to re-roll' : '' }, String(d.value));
      if (canReRoll) chip.addEventListener('click', () => {
        if (selected.has(i)) { selected.delete(i); chip.setAttribute('aria-pressed', 'false'); chip.classList.remove('sel'); }
        else { selected.add(i); chip.setAttribute('aria-pressed', 'true'); chip.classList.add('sel'); }
      });
      return chip;
    };

    container.replaceChildren(
      el('h2', { id: 'roll-title' }, passed ? 'Success' : 'Failure'),
      el('p', { class: 'small muted' }, `${SKILLS.find((s) => s.id === cfg.skill).name} + ${DRIVES.find((x) => x.id === cfg.drive).name} · TN ${tn()} · Difficulty ${cfg.difficulty}`),
      el('div', { class: 'dice-row' }, ...dice.map(dieChip)),
      el('p', { 'aria-live': 'polite' },
        el('span', { class: 'pill' }, `${successes} success${successes === 1 ? '' : 'es'}`),
        el('span', { class: 'pill' }, passed ? `+${momentum} Momentum` : 'failed'),
        complications ? el('span', { class: 'pill danger-pill' }, `${complications} complication${complications === 1 ? '' : 's'}`) : null),
      canReRoll ? el('p', { class: 'small muted' }, `Tap dice to select, then re-roll for 1 Determination (${detLeft} left).`) : null,
      el('div', { class: 'modal-actions' },
        canReRoll ? el('button', { class: 'btn secondary', onclick: () => {
          if (!selected.size) { showToast('Select at least one die to re-roll.'); return; }
          for (const i of selected) result.values[i] = rollD20s(1)[0];
          result.reRolls++;
          render();
        } }, 'Re-roll selected') : null,
        el('button', { class: 'btn', onclick: () => commit({ successes, complications, passed, momentum }) }, 'Apply result')),
    );
  }

  function commit({ successes, complications, passed, momentum }) {
    const pools = getPools();
    const cost = buyCost(cfg.bought);
    let momentumDelta = 0, threatDelta = 0;
    if (cfg.bought) { if (cfg.buyWith === 'momentum') momentumDelta -= cost; else threatDelta += cost; }
    if (passed) momentumDelta += momentum;
    const detSpent = (cfg.autoOne ? 1 : 0) + result.reRolls;

    savePools({
      momentum: clampMomentum(pools.momentum + momentumDelta),
      threat: Math.max(0, pools.threat + threatDelta),
    });
    if (detSpent) saveCharacter({ ...character, determination: clampDetermination(character.determination - detSpent) });

    appendRoll({
      by: character.owner || null, characterName: character.identity.name || 'Unnamed',
      skill: cfg.skill, drive: cfg.drive, tn: tn(), dice: result.values.slice(),
      successes, complications, momentumDelta, threatDelta,
      note: `${passed ? 'Success' : 'Failure'} vs Diff ${cfg.difficulty}${detSpent ? ` · ${detSpent} Determination` : ''}`,
    });
    showToast(passed ? `Success · +${momentum} Momentum` : 'Failed');
    close();
  }
}
