// wizard.js — character creation wizard (8 steps, §3.5) + one-tap pregens.
// House wizard (7 steps) lands next. Renders a full-screen flow into #screen; on completion
// it saves the character, sets it current, and routes to the sheet.

import { qs, el, capitalize, uid, d20 } from './core.js';
import { showToast, confirmModal } from './ui.js';
import { Settings } from './settings.js';
import { DATA } from '../data.js';
import { PREGENS } from '../data-pregens.js';
import { EXPANSION as GREAT_GAME } from '../data-great-game.js';
import { normalizeCharacter, normalizeHouse, permanentAssetCap } from './derived.js';
import { rankDrivesFromComparisons } from './rules.js';
import { saveCharacter, setCurrentCharacterId, getHouse, saveHouse, listCharacters } from './store.js';

const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const DRIVE_NAME = Object.fromEntries(DATA.drives.map((d) => [d.id, d.name]));
const SKILL_IDS = DATA.skills.map((s) => s.id);
const DRIVE_IDS = DATA.drives.map((d) => d.id);

/** Strip a trailing " (parenthetical)" so archetype/faction talent names match the catalog. */
const baseName = (n) => n.replace(/\s*\(.*\)$/, '').trim();
const archetypeById = (id) => DATA.archetypes.find((a) => a.id === id) || null;
const factionById = (id) => DATA.factionTemplates.find((f) => f.id === id) || null;

// ---------- Entry points ----------
export function startCharacterWizard() {
  const screen = qs('#screen');
  const state = freshState();
  const rerender = () => {
    screen.replaceChildren(renderWizard(state, rerender));
    screen.scrollTop = 0;
    screen.focus?.({ preventScroll: true });
  };
  rerender();
}

function freshState() {
  return {
    step: 0,
    factionTemplate: null,
    archetype: null,
    skills: null,                // set when archetype chosen
    focuses: [{ skill: '', name: '' }, { skill: '', name: '' }, { skill: '', name: '' }, { skill: '', name: '' }],
    talents: new Set(),          // talent names
    driveAssignment: { duty: null, faith: null, justice: null, power: null, truth: null },
    statements: {},              // drive -> text
    assets: new Set(),           // asset names
    identity: { name: '', appearance: '', ambition: '', relationships: '' },
    reputationTrait: '',
    houseRole: null,             // set at Finishing if a House exists
  };
}

// ---------- Step registry ----------
const STEPS = [
  { title: 'Concept', render: stepConcept, validate: () => null },
  { title: 'Archetype', render: stepArchetype, validate: (s) => s.archetype ? null : 'Choose an archetype.' },
  { title: 'Skills', render: stepSkills, validate: validateSkills },
  { title: 'Focuses', render: stepFocuses, validate: validateFocuses },
  { title: 'Talents', render: stepTalents, validate: validateTalents },
  { title: 'Drives', render: stepDrives, validate: validateDrives },
  { title: 'Assets', render: stepAssets, validate: validateAssets },
  { title: 'Finishing', render: stepFinishing, validate: validateFinishing },
];

function renderWizard(state, rerender) {
  const step = STEPS[state.step];
  const wrap = el('div', { class: 'wizard' });

  // Progress
  wrap.append(
    el('div', { class: 'wizard-progress', 'aria-label': `Step ${state.step + 1} of ${STEPS.length}` },
      ...STEPS.map((st, i) =>
        el('span', { class: 'wizard-dot' + (i === state.step ? ' active' : i < state.step ? ' done' : ''), title: st.title },
          String(i + 1)))),
    el('h2', {}, `${state.step + 1}. ${step.title}`),
  );

  // Body
  const body = el('div', { class: 'wizard-body' });
  step.render(state, body, rerender);
  wrap.append(body);

  // Nav
  const back = el('button', { class: 'btn secondary', onclick: () => {
    if (state.step === 0) { cancelWizard(rerender); return; }
    state.step--; rerender();
  } }, state.step === 0 ? 'Cancel' : 'Back');

  const isLast = state.step === STEPS.length - 1;
  const next = el('button', { class: 'btn', onclick: () => {
    const err = step.validate(state);
    if (err) { showToast(err); return; }
    if (isLast) { finish(state); return; }
    state.step++; rerender();
  } }, isLast ? 'Create character' : 'Next');

  wrap.append(el('div', { class: 'wizard-nav' }, back, next));
  return wrap;
}

async function cancelWizard(rerender) {
  const ok = await confirmModal('Discard this character and leave the wizard?', { okLabel: 'Discard' });
  if (ok) location.hash = '#/home';
}

// ---------- Step 1: Concept (optional faction template) ----------
function stepConcept(state, body) {
  body.append(el('p', { class: 'small muted' },
    'Optionally begin with a faction template. It grants a bonus trait and one or more mandatory talents (chosen at the Talents step). Max one per character.'));

  if (DATA.factionIntro) body.append(el('p', { class: 'small muted' }, DATA.factionIntro));

  const choose = (id) => { state.factionTemplate = id; syncMandatoryTalents(state); rerenderInto(body, () => stepConcept(state, body)); };

  const none = optionCard(state.factionTemplate === null, 'No faction template',
    'A mundane background — full freedom over talents.', () => choose(null));
  body.append(none);

  for (const f of DATA.factionTemplates) {
    const mand = f.mandatoryTalents.mode === 'all'
      ? `Mandatory: ${f.mandatoryTalents.options.join(', ')}`
      : `Mandatory: choose ≥1 of ${f.mandatoryTalents.options.join(', ')}`;
    body.append(optionCard(state.factionTemplate === f.id, f.name,
      `${f.desc ? f.desc + ' ' : ''}Trait: ${f.trait}. ${mand}.${f.note ? ' ' + f.note : ''}`, () => choose(f.id)));
  }
}

/** When faction has mode:'all', force those talents into the selection; keep set within cap otherwise. */
function syncMandatoryTalents(state) {
  state.talents = new Set(state.talents);
  const f = factionById(state.factionTemplate);
  // Drop previously-forced faction talents that no longer apply is left to the user at the Talents step.
  if (f && f.mandatoryTalents.mode === 'all') {
    for (const t of f.mandatoryTalents.options) state.talents.add(t);
  }
}

// ---------- Step 2: Archetype ----------
function stepArchetype(state, body, rerender) {
  body.append(el('p', { class: 'small muted' },
    'Sets your primary skill (6) and secondary skill (5); grants its name as a trait and suggests focuses and talents.'));
  const grid = el('div', { class: 'option-grid' });
  for (const a of DATA.archetypes) {
    grid.append(optionCard(state.archetype === a.id, a.name,
      `${a.desc ? a.desc + ' ' : ''}(${SKILL_NAME[a.primary]} / ${SKILL_NAME[a.secondary]}) · Focuses: ${a.focuses.join(', ')} · Talent: ${a.talents.join(', ')}`,
      () => {
        state.archetype = a.id;
        initSkills(state);
        rerender();
      }));
  }
  body.append(grid);
}

function initSkills(state) {
  const a = archetypeById(state.archetype);
  const { primary, secondary, rest } = DATA.creation.skillArray;
  state.skills = {};
  for (const s of SKILL_IDS) state.skills[s] = rest;
  state.skills[a.primary] = primary;
  state.skills[a.secondary] = secondary;
  state.skillBase = { ...state.skills };
}

// ---------- Step 3: Skills ----------
function skillSpent(state) {
  return SKILL_IDS.reduce((n, s) => n + (state.skills[s] - state.skillBase[s]), 0);
}
function validateSkills(state) {
  const spent = skillSpent(state);
  const { freePoints, cap } = DATA.creation.skillArray;
  if (spent !== freePoints) return `Distribute exactly ${freePoints} free points (${freePoints - spent} remaining).`;
  if (SKILL_IDS.some((s) => state.skills[s] > cap)) return `No skill may exceed ${cap}.`;
  return null;
}
function stepSkills(state, body, rerender) {
  const { freePoints, cap } = DATA.creation.skillArray;
  const remaining = freePoints - skillSpent(state);
  body.append(el('p', { class: 'small muted' },
    `Archetype set your base skills. Add ${freePoints} free points, cap ${cap}.`),
    el('p', {}, el('span', { class: 'pill' }, `Points remaining: ${remaining}`)));

  for (const s of SKILL_IDS) {
    const val = state.skills[s];
    const dec = el('button', { class: 'step-btn', 'aria-label': `Decrease ${SKILL_NAME[s]}`, onclick: () => {
      if (state.skills[s] > state.skillBase[s]) { state.skills[s]--; rerender(); }
    } }, '−');
    const inc = el('button', { class: 'step-btn', 'aria-label': `Increase ${SKILL_NAME[s]}`, onclick: () => {
      if (state.skills[s] < cap && skillSpent(state) < freePoints) { state.skills[s]++; rerender(); }
    } }, '+');
    body.append(el('div', { class: 'stat-row' },
      el('span', { class: 'stat-name' }, SKILL_NAME[s]),
      el('div', { class: 'stepper' }, dec, el('span', { class: 'stat-val' }, String(val)), inc)));
  }
}

// ---------- Step 4: Focuses ----------
function validateFocuses(state) {
  const { count, minOnPrimarySkill, minOnSecondarySkill } = DATA.creation.focuses;
  const filled = state.focuses.filter((f) => f.skill && f.name.trim());
  if (filled.length !== count) return `Pick exactly ${count} focuses (each needs a skill and a name).`;
  const { primary, secondary } = archetypeById(state.archetype);
  if (filled.filter((f) => f.skill === primary).length < minOnPrimarySkill)
    return `At least ${minOnPrimarySkill} focus must be on your primary skill (${SKILL_NAME[primary]}).`;
  if (filled.filter((f) => f.skill === secondary).length < minOnSecondarySkill)
    return `At least ${minOnSecondarySkill} focus must be on your secondary skill (${SKILL_NAME[secondary]}).`;
  return null;
}
function stepFocuses(state, body, rerender) {
  const a = archetypeById(state.archetype);
  body.append(el('p', { class: 'small muted' }, DATA.creationGuidance.stepNotes.focuses),
    el('p', { class: 'small muted' },
      `Keep at least one focus on your primary skill (${SKILL_NAME[a.primary]}) and one on your secondary (${SKILL_NAME[a.secondary]}). Archetype suggestions: ${a.focuses.join(', ')}.`));

  state.focuses.forEach((f, i) => {
    const skillSel = el('select', { 'aria-label': `Focus ${i + 1} skill` },
      el('option', { value: '' }, '— skill —'),
      ...SKILL_IDS.map((s) => el('option', { value: s, selected: f.skill === s ? '' : null }, SKILL_NAME[s])));
    skillSel.addEventListener('change', () => {
      f.skill = skillSel.value; f.name = ''; f.custom = false; rerender();
    });

    const row = el('div', { class: 'focus-row' }, skillSel);

    if (f.skill) {
      // Name dropdown limited to THIS skill's printed focus examples.
      const names = (DATA.focusExamples[f.skill] || []).map((e) => e.name);
      const nameSel = el('select', { 'aria-label': `Focus ${i + 1} name` },
        el('option', { value: '' }, '— focus —'),
        ...names.map((n) => el('option', { value: n, selected: f.name === n ? '' : null }, n)));
      nameSel.addEventListener('change', () => { f.name = nameSel.value; });
      row.append(nameSel);
    } else {
      row.append(el('span', { class: 'small muted' }, 'Choose a skill first'));
    }
    body.append(row);
  });
}

// ---------- Step 5: Talents ----------
function archetypeTalentNames(state) {
  return archetypeById(state.archetype).talents.map(baseName);
}
const talentParam = (key) => (key.match(/\(([^)]*)\)\s*$/) || [])[1]?.trim() || null;
/** Does a chosen talent key satisfy a faction/archetype option string? An unparameterised
 *  option (e.g. "The Reason I Fight") matches any binding of that talent; a parameterised
 *  option (e.g. "Resilience (Battle)") matches only that exact parameter. */
function talentKeyMatchesOption(key, opt) {
  if (baseName(key) !== baseName(opt)) return false;
  const op = talentParam(opt);
  return !op || op === talentParam(key);
}
function talentSatisfies(state, opt) {
  return [...state.talents].some((k) => talentKeyMatchesOption(k, opt));
}
function validateTalents(state) {
  const { count, minArchetypeRelated } = DATA.creation.talents;
  const picked = [...state.talents];
  if (picked.length !== count) return `Pick exactly ${count} talents (${picked.length} selected).`;
  const archNames = archetypeTalentNames(state).map((n) => n.toLowerCase());
  if (picked.filter((t) => archNames.includes(baseName(t).toLowerCase())).length < minArchetypeRelated)
    return `At least ${minArchetypeRelated} talent must be archetype-related (${archetypeById(state.archetype).talents.join(', ')}).`;
  const f = factionById(state.factionTemplate);
  if (f) {
    const opts = f.mandatoryTalents.options;
    if (f.mandatoryTalents.mode === 'all' && !opts.every((o) => talentSatisfies(state, o)))
      return `Your faction requires: ${opts.join(', ')}.`;
    if (f.mandatoryTalents.mode === 'atLeastOne' && !opts.some((o) => talentSatisfies(state, o)))
      return `Your faction requires at least one of: ${opts.join(', ')}.`;
  }
  return null;
}
/** Parameter option labels for a skill/drive/asset-category-bound talent.
 *  Skill options honour a "rated 6+" requirement (skills are set before this step);
 *  `suggested` folds in any archetype/faction-supplied param (e.g. "Warfare Assets"). */
function talentParamOptions(def, state, suggested) {
  let opts = [];
  if (def.pick === 'skill') {
    const need6 = /6\+/.test(def.requirement || '');
    opts = SKILL_IDS.filter((id) => !need6 || (state.skills?.[id] ?? 0) >= 6).map((id) => SKILL_NAME[id]);
  } else if (def.pick === 'drive') {
    opts = DRIVE_IDS.map((id) => DRIVE_NAME[id]);
  } else if (def.pick === 'assetCategory') {
    opts = ['Dueling', 'Warfare', 'Espionage', 'Intrigue'];
  }
  for (const s of suggested) if (s && !opts.includes(s)) opts.push(s);
  return opts;
}

function stepTalents(state, body, rerender) {
  const { count } = DATA.creation.talents;
  const f = factionById(state.factionTemplate);
  const archNames = new Set(archetypeTalentNames(state).map((n) => n.toLowerCase()));
  const status = el('span', { class: 'pill' }, `${state.talents.size}/${count} chosen`);
  const updateStatus = () => { status.textContent = `${state.talents.size}/${count} chosen`; };
  body.append(el('p', { class: 'small muted' }, DATA.creationGuidance.stepNotes.talents));
  body.append(el('p', { class: 'small muted' },
    `Pick ${count} talents, at least one archetype-related${f ? `; your faction mandates ${f.mandatoryTalents.mode === 'all' ? 'all of' : 'one of'}: ${f.mandatoryTalents.options.join(', ')}` : ''}.`),
    el('p', {}, status));

  const search = el('input', { type: 'search', placeholder: 'Search talents…', 'aria-label': 'Search talents' });
  body.append(search);
  const list = el('div', { class: 'check-list' });
  body.append(list);

  // One row per base talent. Faction options + archetype talents first, then the catalog.
  const factionOpts = f ? f.mandatoryTalents.options : [];
  const priorityKeys = [...factionOpts, ...archetypeById(state.archetype).talents];
  const bases = [];
  const seen = new Set();
  for (const key of [...priorityKeys, ...DATA.talents.map((t) => t.name)]) {
    const base = baseName(key);
    if (seen.has(base)) continue;
    seen.add(base);
    // Suggested param(s) from any parameterised priority key for this base (e.g. "Resilience (Battle)").
    const suggested = priorityKeys.filter((k) => baseName(k) === base && /\(.*\)$/.test(k))
      .map((k) => k.replace(/^.*\(([^)]*)\)$/, '$1').trim());
    bases.push({ base, suggested });
  }

  const renderList = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const { base, suggested } of bases) {
      if (q && !base.toLowerCase().includes(q)) continue;
      const def = DATA.talents.find((t) => t.name === base);
      const isArch = archNames.has(base.toLowerCase());
      const isFaction = factionOpts.some((o) => baseName(o) === base);
      const tags = el('div', {}, base,
        isArch ? el('span', { class: 'tag' }, 'archetype') : null,
        isFaction ? el('span', { class: 'tag' }, 'faction') : null,
        def?.faction ? el('span', { class: 'tag' }, 'faction-only') : null);
      const effect = el('div', { class: 'small muted' }, def ? def.effect : 'Faction/archetype talent (see rules library).');

      if (def && def.pick) {
        // Bound talent: choose a skill/drive/category, may add more than one (e.g. Bold (Battle) + Bold (Communicate)).
        const options = talentParamOptions(def, state, suggested);
        const sel = el('select', { 'aria-label': `${base} — choose ${def.pick === 'drive' ? 'drive' : def.pick === 'assetCategory' ? 'category' : 'skill'}` },
          el('option', { value: '' }, `— ${def.pick === 'drive' ? 'drive' : def.pick === 'assetCategory' ? 'category' : 'skill'} —`),
          ...options.map((o) => el('option', { value: o, selected: suggested[0] === o ? '' : null }, o)));
        const chips = el('div', { class: 'trait-list' });
        const renderChips = () => {
          chips.replaceChildren(...[...state.talents].filter((k) => baseName(k) === base).map((k) =>
            el('span', { class: 'pill' }, k,
              el('button', { type: 'button', class: 'chip-x', 'aria-label': `Remove ${k}`,
                onclick: () => { state.talents.delete(k); renderChips(); updateStatus(); } }, ' ×'))));
        };
        const addBtn = el('button', { type: 'button', class: 'btn secondary small', onclick: () => {
          if (!sel.value) { showToast(`Choose a ${def.pick === 'drive' ? 'drive' : def.pick === 'assetCategory' ? 'category' : 'skill'} first.`); return; }
          const key = `${base} (${sel.value})`;
          if (state.talents.has(key)) { showToast('Already chosen.'); return; }
          if (state.talents.size >= count) { showToast(`Only ${count} talents.`); return; }
          state.talents.add(key); renderChips(); updateStatus();
        } }, 'Add');
        renderChips();
        list.append(el('div', { class: 'check-item' },
          el('div', {},
            tags, effect,
            def.requirement ? el('div', { class: 'small muted' }, `Requires: ${def.requirement}.`) : null,
            el('div', { class: 'focus-row' }, sel, addBtn),
            chips)));
      } else {
        // Unbound talent: single checkbox toggling the base name.
        const box = el('input', { type: 'checkbox', id: `tal-${base}` });
        box.checked = state.talents.has(base);
        box.addEventListener('change', () => {
          if (box.checked) {
            if (state.talents.size >= count) { box.checked = false; showToast(`Only ${count} talents.`); return; }
            state.talents.add(base);
          } else state.talents.delete(base);
          updateStatus();
        });
        list.append(el('label', { class: 'check-item', for: `tal-${base}` }, box, el('div', {}, tags, effect)));
      }
    }
  };
  search.addEventListener('input', renderList);
  renderList();
}

// ---------- Step 6: Drives ----------
function validateDrives(state) {
  const vals = DRIVE_IDS.map((d) => state.driveAssignment[d]);
  if (vals.some((v) => v == null)) return 'Assign a value to every drive.';
  const sorted = [...vals].sort((a, b) => b - a).join(',');
  if (sorted !== [...DATA.creation.driveArray].sort((a, b) => b - a).join(','))
    return `Use each of ${DATA.creation.driveArray.join('/')} exactly once.`;
  const needStatements = DRIVE_IDS.filter((d) => DATA.creation.driveStatements.onDrivesRated.includes(state.driveAssignment[d]));
  if (needStatements.some((d) => !(state.statements[d] || '').trim()))
    return `Write a statement for each of your ${DATA.creation.driveStatements.onDrivesRated.join('/')}-rated drives.`;
  return null;
}
function stepDrives(state, body, rerender) {
  const array = DATA.creation.driveArray;
  const G = DATA.creationGuidance;
  const rated = DATA.creation.driveStatements.onDrivesRated;
  body.append(el('p', { class: 'small muted' }, G.stepNotes.drives),
    el('p', { class: 'small muted' },
      `Assign ${array.join(' / ')} across your five drives (each value once). Write a statement for the ${rated.join('/')}-rated drives.`));

  // "One Way to Choose Drives" — optional pairwise helper that fills the 8/7/6/5/4 order.
  if (G.driveRanking) {
    const picks = (state._drivePairPicks ||= {});
    const helper = el('details', { class: 'tips' }, el('summary', {}, 'Help me rank my drives'));
    helper.append(el('p', { class: 'small muted' }, G.driveRanking.intro));
    G.driveRanking.pairs.forEach(([a, b], i) => {
      const sel = el('select', { 'aria-label': `Comparison ${i + 1}: ${DRIVE_NAME[a]} or ${DRIVE_NAME[b]}` },
        el('option', { value: '' }, `${DRIVE_NAME[a]} or ${DRIVE_NAME[b]}?`),
        el('option', { value: a, selected: picks[i] === a ? '' : null }, DRIVE_NAME[a]),
        el('option', { value: b, selected: picks[i] === b ? '' : null }, DRIVE_NAME[b]));
      sel.addEventListener('change', () => { picks[i] = sel.value || null; });
      helper.append(el('div', { class: 'focus-row' }, el('span', { class: 'small muted' }, `${i + 1}.`), sel));
    });
    const apply = el('button', { type: 'button', class: 'btn secondary', onclick: () => {
      const winners = G.driveRanking.pairs.map((_, i) => picks[i]);
      if (winners.some((w) => !w)) { showToast('Answer all 10 comparisons first.'); return; }
      const order = rankDrivesFromComparisons(G.driveRanking.pairs, winners);
      order.forEach((d, idx) => { state.driveAssignment[d] = array[idx]; });
      showToast('Drives ranked — adjust below if you like.');
      rerender();
    } }, 'Apply ranking');
    helper.append(apply);
    body.append(helper);
  }

  for (const d of DRIVE_IDS) {
    // Only offer values not already taken by another drive (keep this drive's own value).
    const taken = new Set(DRIVE_IDS.filter((o) => o !== d)
      .map((o) => state.driveAssignment[o]).filter((v) => v != null));
    const sel = el('select', { 'aria-label': `${DRIVE_NAME[d]} value` },
      el('option', { value: '' }, '—'),
      ...array.filter((v) => !taken.has(v))
        .map((v) => el('option', { value: String(v), selected: state.driveAssignment[d] === v ? '' : null }, String(v))));
    sel.addEventListener('change', () => {
      state.driveAssignment[d] = sel.value ? Number(sel.value) : null;
      rerender(); // taken-value set changed → rebuild every dropdown + the statement fields
    });
    body.append(el('div', { class: 'stat-row' }, el('span', { class: 'stat-name' }, DRIVE_NAME[d]), sel));
  }

  const stmtArea = el('div', { class: 'stmt-area' }, el('h3', {}, 'Drive statements'));
  const needy = DRIVE_IDS.filter((d) => rated.includes(state.driveAssignment[d]));
  if (!needy.length) {
    stmtArea.append(el('p', { class: 'small muted' }, `Assign your ${rated.join(', ')} drives to unlock statement fields.`));
  } else {
    stmtArea.append(el('details', { class: 'tips' },
      el('summary', {}, 'How to write a good statement'),
      el('ul', {}, ...G.driveStatementTips.map((t) => el('li', { class: 'small' }, t)))));
    for (const d of needy) {
      const v = state.driveAssignment[d];
      const ta = el('textarea', { rows: '2', placeholder: `${DRIVE_NAME[d]} (${v}) statement`, 'aria-label': `${DRIVE_NAME[d]} statement` }, state.statements[d] || '');
      ta.addEventListener('input', () => { state.statements[d] = ta.value; });
      // "Insert an example…" drops a book example into the field (editable afterward).
      const ex = el('select', { class: 'example-pick', 'aria-label': `${DRIVE_NAME[d]} example statements` },
        el('option', { value: '' }, 'Insert an example…'),
        ...G.driveStatementExamples[d].map((s) => el('option', { value: s }, s)));
      ex.addEventListener('change', () => {
        if (ex.value) { state.statements[d] = ex.value; ta.value = ex.value; ex.value = ''; }
      });
      stmtArea.append(el('label', { class: 'field' }, el('span', {}, `${DRIVE_NAME[d]} (${v})`), ta, ex));
    }
  }
  body.append(stmtArea);
}

// ---------- Step 7: Assets ----------
function validateAssets(state) {
  const { count, minTangible } = DATA.creation.assets;
  const picked = [...state.assets].map((n) => DATA.assets.find((a) => a.name === n));
  if (picked.length !== count) return `Pick exactly ${count} assets (${picked.length} selected).`;
  if (picked.filter((a) => a.tangible === true).length < minTangible) return `At least ${minTangible} asset must be tangible.`;
  const cap = permanentAssetCap({ talents: [...state.talents].map((key) => ({ name: baseName(key) })) });
  if (picked.length > cap) return `Permanent-asset cap is ${cap}.`;
  return null;
}
function stepAssets(state, body) {
  const { count, minTangible } = DATA.creation.assets;
  const status = el('p', {}, el('span', { class: 'pill' }, `${state.assets.size}/${count} chosen`));
  body.append(el('p', { class: 'small muted' }, `Pick ${count} assets, at least ${minTangible} tangible.`), status);

  const search = el('input', { type: 'search', placeholder: 'Search assets…', 'aria-label': 'Search assets' });
  const list = el('div', { class: 'check-list' });
  body.append(search, list);

  const render = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const a of DATA.assets) {
      if (q && !(a.name.toLowerCase().includes(q) || a.category.includes(q))) continue;
      const box = el('input', { type: 'checkbox', id: `as-${a.name}` });
      box.checked = state.assets.has(a.name);
      box.addEventListener('change', () => {
        if (box.checked) {
          if (state.assets.size >= count) { box.checked = false; showToast(`Only ${count} assets.`); return; }
          state.assets.add(a.name);
        } else state.assets.delete(a.name);
        status.firstChild.textContent = `${state.assets.size}/${count} chosen`;
      });
      const tang = a.tangible === true ? 'tangible' : a.tangible === 'either' ? 'either' : 'intangible';
      list.append(el('label', { class: 'check-item', for: `as-${a.name}` }, box,
        el('div', {},
          el('div', {}, a.name,
            el('span', { class: 'tag' }, a.category),
            el('span', { class: 'tag' }, tang),
            a.quality ? el('span', { class: 'tag' }, `Q${a.quality}`) : null),
          el('div', { class: 'small muted' }, a.rider))));
    }
  };
  search.addEventListener('input', render);
  render();
}

// ---------- Step 8: Finishing ----------
function validateFinishing(state) {
  if (!state.identity.name.trim()) return 'Your character needs a name.';
  if (!state.reputationTrait.trim()) return 'Add one reputation or personality trait.';
  if (!state.identity.ambition.trim()) return 'Write an Ambition (tie it to your highest drive).';
  return null;
}
function stepFinishing(state, body) {
  const G = DATA.creationGuidance;
  const highest = DRIVE_IDS.reduce((best, d) => (state.driveAssignment[d] > (state.driveAssignment[best] ?? -1) ? d : best), DRIVE_IDS[0]);
  const field = (label, key, opts = {}) => {
    const input = opts.textarea
      ? el('textarea', { rows: '2', placeholder: opts.ph || '' }, state.identity[key] || '')
      : el('input', { type: 'text', placeholder: opts.ph || '', value: state.identity[key] || '' });
    input.addEventListener('input', () => { state.identity[key] = input.value; });
    return el('label', { class: 'field' }, el('span', {}, label), input);
  };
  const questionList = (summary, questions) => el('details', { class: 'tips' },
    el('summary', {}, summary),
    el('ul', {}, ...questions.map((q) => el('li', { class: 'small' }, q))));

  body.append(
    field('Name', 'name', { ph: 'Character name' }),

    (() => {
      const input = el('input', { type: 'text', placeholder: 'e.g. Honourable, Ruthless, Secretive', value: state.reputationTrait });
      input.addEventListener('input', () => { state.reputationTrait = input.value; });
      return el('label', { class: 'field' }, el('span', {}, 'Reputation / personality trait'), input);
    })(),

    field('Ambition', 'ambition', { ph: `A long-term goal tied to ${DRIVE_NAME[highest]} (${state.driveAssignment[highest]})` }),
    el('p', { class: 'small muted' }, G.ambitionRule),
    el('p', { class: 'small' }, el('strong', {}, `${DRIVE_NAME[highest]} ambitions: `), G.ambitionByDrive[highest]),
    el('p', { class: 'small muted' }, G.ambitionExample),

    field('Appearance', 'appearance', { textarea: true, ph: 'Optional — see prompts below' }),
    questionList('Appearance prompts', G.appearanceQuestions),

    field('Relationships', 'relationships', { textarea: true, ph: 'Optional — see prompts below' }),
    questionList('Relationship prompts', G.relationshipQuestions),
  );

  // House role — only when a House already exists (§3.5 step 8; ruling #4 House is shared).
  const house = getHouse();
  if (house) {
    const roleSel = el('select', { 'aria-label': 'House role' },
      el('option', { value: '' }, '— no role —'),
      ...DATA.houseRoles.map((r) => el('option', { value: r.id, selected: state.houseRole === r.id ? '' : null }, r.name)));
    roleSel.addEventListener('change', () => { state.houseRole = roleSel.value || null; });
    body.append(el('label', { class: 'field' }, el('span', {}, `House role in ${house.name || 'your House'}`), roleSel));
  }

  body.append(el('p', { class: 'small muted' }, 'Review complete. “Create character” saves and opens your sheet.'));
}

// ---------- Assembly ----------
function buildCharacter(state) {
  const a = archetypeById(state.archetype);
  const f = factionById(state.factionTemplate);

  const driveStatements = {};
  for (const d of DRIVE_IDS) {
    if ((state.statements[d] || '').trim()) driveStatements[d] = { text: state.statements[d].trim(), challenged: false };
  }
  const traits = [{ name: a.name, negative: false, source: 'archetype' }];
  if (f) traits.push({ name: f.trait, negative: false, source: 'faction' });
  if (state.reputationTrait.trim()) traits.push({ name: state.reputationTrait.trim(), negative: false, source: 'finishing' });

  // Talent keys are display strings ("Bold (Battle)", "Voice"). Store the base catalog name
  // plus the chosen parameter routed by the talent's pick type (§7: skill?/drive?/category?).
  const SKILL_BY_NAME = Object.fromEntries(DATA.skills.map((s) => [s.name, s.id]));
  const DRIVE_BY_NAME = Object.fromEntries(DATA.drives.map((d) => [d.name, d.id]));
  const archLower = archetypeTalentNames(state).map((n) => n.toLowerCase());
  const talents = [...state.talents].map((key) => {
    const base = baseName(key);
    const paramMatch = key.match(/\(([^)]*)\)\s*$/);
    const param = paramMatch ? paramMatch[1].trim() : null;
    const def = DATA.talents.find((t) => t.name === base);
    const entry = {
      name: base,
      source: f && f.mandatoryTalents.options.some((o) => talentKeyMatchesOption(key, o)) ? 'faction'
        : archLower.includes(base.toLowerCase()) ? 'archetype' : 'chosen',
    };
    if (param && def) {
      if (def.pick === 'skill' && SKILL_BY_NAME[param]) entry.skill = SKILL_BY_NAME[param];
      else if (def.pick === 'drive' && DRIVE_BY_NAME[param]) entry.drive = DRIVE_BY_NAME[param];
      else if (def.pick === 'assetCategory') entry.category = param;
    }
    return entry;
  });

  const assets = [...state.assets].map((n) => {
    const def = DATA.assets.find((x) => x.name === n);
    return { name: def.name, quality: def.quality, tangible: def.tangible === true, permanent: true };
  });

  return normalizeCharacter({
    id: uid(),
    identity: {
      name: state.identity.name.trim(), archetype: a.id, factionTemplate: f ? f.id : null,
      houseRole: state.houseRole || null, appearance: state.identity.appearance.trim(),
      ambition: state.identity.ambition.trim(), portraitUrl: null,
      relationships: state.identity.relationships.trim(),
    },
    skills: { ...state.skills },
    drives: { ...state.driveAssignment },
    driveStatements,
    focuses: state.focuses.filter((fo) => fo.skill && fo.name.trim()).map((fo) => ({ skill: fo.skill, name: fo.name.trim() })),
    talents,
    traits,
    assets,
    determination: DATA.determination.startPerAdventure,
  });
}

/** Route to a screen, forcing a re-render even when we're already on that hash
 *  (setting an unchanged location.hash does not fire the router's hashchange). */
function goToScreen(id) {
  const target = `#/${id}`;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

function finish(state) {
  const char = buildCharacter(state);
  saveCharacter(char);
  setCurrentCharacterId(char.id);
  // If they claimed a House role, record it on the shared House too (ruling #4: local player acts as GM/Ruler).
  if (state.houseRole) {
    const house = getHouse();
    if (house) { house.roles = { ...house.roles, [state.houseRole]: char.id }; saveHouse(house); }
  }
  showToast(`${char.identity.name} created.`);
  goToScreen('sheet');
}

// ---------- Pregens (ruling #1) ----------
export function openPregenPicker() {
  const screen = qs('#screen');
  const wrap = el('div', { class: 'wizard' });
  wrap.append(
    el('h2', {}, 'Play an iconic character'),
    el('p', { class: 'small muted' },
      'One-tap pregenerated player characters, built from the core rulebook’s iconic stat blocks (standard Determination rules).'),
  );
  const grid = el('div', { class: 'option-grid' });
  for (const p of PREGENS) {
    grid.append(optionCard(false, p.identity.name,
      `${SKILL_NAME[topSkill(p)]}-focused · ${p.talents.map((t) => t.name).slice(0, 3).join(', ')}…`,
      () => instantiatePregen(p)));
  }
  wrap.append(grid,
    el('div', { class: 'wizard-nav' },
      el('button', { class: 'btn secondary', onclick: () => { location.hash = '#/home'; } }, 'Back')));
  screen.replaceChildren(wrap);
  screen.scrollTop = 0;
}

function topSkill(p) {
  return SKILL_IDS.reduce((best, s) => (p.skills[s] > p.skills[best] ? s : best), SKILL_IDS[0]);
}

function instantiatePregen(pregen) {
  const char = normalizeCharacter({
    ...pregen,
    id: uid(),
    identity: { ...pregen.identity },
  });
  saveCharacter(char);
  setCurrentCharacterId(char.id);
  showToast(`${char.identity.name} ready to play.`);
  goToScreen('sheet');
}

// ---------- Small UI helpers ----------
function optionCard(selected, title, desc, onclick) {
  return el('button', { class: 'option-card' + (selected ? ' selected' : ''), onclick, 'aria-pressed': selected ? 'true' : 'false' },
    el('div', { class: 'option-title' }, title),
    el('div', { class: 'small muted' }, desc));
}
function rerenderInto(container, renderFn) {
  container.replaceChildren();
  renderFn();
}

// ========================================================================
// House wizard (7 steps, §3.5). Narrative core; the Great Game numeric layer
// (skill array + domain Wealth/Resources) surfaces only when the greatGame toggle is on.
// The House is a shared campaign entity (ruling #4): one member builds it; others join it.
// ========================================================================

const HM = GREAT_GAME.houseManagement;         // Great Game economy only (skill values + income)
const SUBTYPES = Object.keys(DATA.houseSubtypeDefs); // Core: the 5 areas-of-expertise sections

function domainGroup(domainId) {
  return HM.categoryModifiers.societal.domains.includes(domainId) ? 'societal' : 'tangible';
}
/** Great Game per-domain income = subtype base + category modifier, floored at the minimum. */
function domainIncome(domainId, tier, subtype) {
  const base = HM.subtypeIncome[subtype]?.[tier];
  if (!base) return { resources: 0, wealth: 0 };
  const mod = HM.categoryModifiers[domainGroup(domainId)][tier];
  return {
    resources: Math.max(HM.minimum.resources, base.resources + mod.resources),
    wealth: Math.max(HM.minimum.wealth, base.wealth + mod.wealth),
  };
}
function houseIncome(state) {
  return state.domains.reduce((tot, d) => {
    const inc = domainIncome(d.id, d.tier, d.subtype);
    return { resources: tot.resources + inc.resources, wealth: tot.wealth + inc.wealth };
  }, { resources: 0, wealth: 0 });
}
/** Roll d20 and return the ranged table entry it lands on (ranges use an en-dash, e.g. "1–5"). */
function rollOnTable(entries) {
  const roll = d20();
  return entries.find((e) => {
    const [lo, hi] = e.range.split('–').map((n) => Number(n.trim()));
    return roll >= lo && roll <= hi;
  }) || entries[0];
}

export function startHouseWizard() {
  const screen = qs('#screen');
  const state = freshHouseState(getHouse());
  const rerender = () => {
    screen.replaceChildren(renderHouseWizard(state, rerender));
    screen.scrollTop = 0;
    screen.focus?.({ preventScroll: true });
  };
  rerender();
}

function freshHouseState(h) {
  h = h || {};
  const traitOf = (type) => (h.traits || []).find((t) => t.type === type)?.name || '';
  return {
    step: 0,
    name: h.name || '',
    type: h.type || null,
    skillAssign: h.skills ? { ...h.skills } : null,
    domains: Array.isArray(h.domains) ? h.domains.map((d) => ({ ...d })) : [], // [{id,tier,subtype?}]
    homeworld: { name: '', weather: '', habitation: '', crimeRate: '', crimeStance: '', contentment: '', publicWealth: '', ...(h.homeworld || {}) },
    banner: { crest: h.banner?.crest || '', colors: h.banner?.colors || '' },
    traits: { domain: traitOf('domain'), reputation: traitOf('reputation') },
    roles: { ...(h.roles || {}) },
    enemies: Array.isArray(h.enemies) ? h.enemies.map((e) => ({ ...e })) : [],
    editing: !!h.name,
  };
}

const HOUSE_STEPS = [
  { title: 'Type', render: hStepType, validate: hValidateType },
  { title: 'Domains', render: hStepDomains, validate: hValidateDomains },
  { title: 'Homeworld', render: hStepHomeworld, validate: () => null },
  { title: 'Banner', render: hStepBanner, validate: () => null },
  { title: 'Traits', render: hStepTraits, validate: () => null },
  { title: 'Roles', render: hStepRoles, validate: () => null },
  { title: 'Enemies', render: hStepEnemies, validate: hValidateEnemies },
];

function renderHouseWizard(state, rerender) {
  const step = HOUSE_STEPS[state.step];
  const gg = Settings.greatGame();
  const wrap = el('div', { class: 'wizard' });

  wrap.append(
    el('div', { class: 'wizard-progress', 'aria-label': `Step ${state.step + 1} of ${HOUSE_STEPS.length}` },
      ...HOUSE_STEPS.map((st, i) =>
        el('span', { class: 'wizard-dot' + (i === state.step ? ' active' : i < state.step ? ' done' : ''), title: st.title }, String(i + 1)))),
    el('h2', {}, `${state.step + 1}. House · ${step.title}`),
    el('p', { class: 'small muted' }, gg
      ? 'The Great Game is on — numeric House economy included.'
      : 'Narrative House (enable The Great Game in Settings for the numeric economy).'),
  );

  const body = el('div', { class: 'wizard-body' });
  step.render(state, body, rerender);
  wrap.append(body);

  const back = el('button', { class: 'btn secondary', onclick: () => {
    if (state.step === 0) { location.hash = '#/home'; return; }
    state.step--; rerender();
  } }, state.step === 0 ? 'Cancel' : 'Back');
  const isLast = state.step === HOUSE_STEPS.length - 1;
  const next = el('button', { class: 'btn', onclick: () => {
    const err = step.validate(state);
    if (err) { showToast(err); return; }
    if (isLast) { finishHouse(state); return; }
    state.step++; rerender();
  } }, isLast ? (state.editing ? 'Save House' : 'Establish House') : 'Next');

  wrap.append(el('div', { class: 'wizard-nav' }, back, next));
  return wrap;
}

// ---------- House step 1: Type ----------
function assignSkillArray(typeId) {
  const arr = HM.skillArrays[typeId];
  const out = {};
  SKILL_IDS.forEach((s, i) => { out[s] = arr[i]; });
  return out;
}
/** Ensure the Great Game skill assignment exists (e.g. when editing a core House after enabling GG). */
function ensureSkillAssign(state) {
  if (Settings.greatGame() && state.type && !state.skillAssign) state.skillAssign = assignSkillArray(state.type);
}
function selectHouseType(state, typeId) {
  state.type = typeId;
  state.skillAssign = Settings.greatGame() ? assignSkillArray(typeId) : null;
}
function hValidateType(state) {
  if (!state.name.trim()) return 'Name your House.';
  if (!state.type) return 'Choose a House type.';
  ensureSkillAssign(state);
  if (Settings.greatGame()) {
    const want = [...HM.skillArrays[state.type]].sort((a, b) => b - a).join(',');
    const got = SKILL_IDS.map((s) => state.skillAssign[s]).sort((a, b) => b - a).join(',');
    if (want !== got) return `House skills must use the array ${HM.skillArrays[state.type].join('/')}.`;
  }
  return null;
}
function hStepType(state, body, rerender) {
  const gg = Settings.greatGame();
  const nameInput = el('input', { type: 'text', placeholder: 'House name (e.g. House Varrick)', value: state.name });
  nameInput.addEventListener('input', () => { state.name = nameInput.value; });
  body.append(el('label', { class: 'field' }, el('span', {}, 'House name'), nameInput));

  for (const t of DATA.houseTypes) {
    const c = DATA.houseDomainCounts[t.id];
    // Domain counts + starting Threat are Core; Great Game prepends the House skill array.
    const desc = `${gg ? `Skills ${HM.skillArrays[t.id].join('/')} · ` : ''}${c.primary}P / ${c.secondary}S domains · ${DATA.houseStartingThreat[t.id]} Threat/player`;
    body.append(optionCard(state.type === t.id, t.name, desc, () => { selectHouseType(state, t.id); rerender(); }));
  }
  if (state.type) {
    body.append(el('p', { class: 'small muted' },
      `The GM begins each session with ${DATA.houseStartingThreat[state.type]} Threat per player for a ${DATA.houseTypes.find((t) => t.id === state.type).name}.`));
  }

  if (gg && state.type) {
    ensureSkillAssign(state);
    body.append(el('h3', {}, 'House skills'),
      el('p', { class: 'small muted' }, `Assign the ${HM.skillArrays[state.type].join('/')} array to your House’s skills.`));
    const arr = HM.skillArrays[state.type];
    const distinct = [...new Set(arr)];
    for (const s of SKILL_IDS) {
      const sel = el('select', { 'aria-label': `${SKILL_NAME[s]} value` },
        ...distinct.map((v) => el('option', { value: String(v), selected: state.skillAssign[s] === v ? '' : null }, String(v))));
      sel.addEventListener('change', () => { state.skillAssign[s] = Number(sel.value); });
      body.append(el('div', { class: 'stat-row' }, el('span', { class: 'stat-name' }, SKILL_NAME[s]), sel));
    }
  }
}

// ---------- House step 2: Domains ----------
/** Great Game needs every domain to carry an asset subtype for its income. A House first
 *  built in core mode has domains with no subtype; back-fill a default so income computes
 *  and the subtype dropdown matches state (otherwise editing a core House into Great Game
 *  shows 0 income and fails validation despite a populated-looking dropdown). */
function ensureDomainSubtypes(state) {
  if (Settings.greatGame()) state.domains.forEach((d) => { if (!d.subtype) d.subtype = SUBTYPES[0]; });
}
function hValidateDomains(state) {
  ensureDomainSubtypes(state);
  const nPrim = state.domains.filter((d) => d.tier === 'primary').length;
  const nSec = state.domains.filter((d) => d.tier === 'secondary').length;
  // Starting domains per type are a Core rule — enforce the counts in every mode.
  const c = DATA.houseDomainCounts[state.type];
  if (nPrim !== c.primary || nSec !== c.secondary)
    return `A ${DATA.houseTypes.find((t) => t.id === state.type).name} starts with ${c.primary} primary and ${c.secondary} secondary domain(s).`;
  // Great Game additionally needs an asset subtype on each domain for its income.
  if (Settings.greatGame() && state.domains.some((d) => !d.subtype)) return 'Pick an asset subtype for every domain.';
  return null;
}
function hStepDomains(state, body, rerender) {
  const gg = Settings.greatGame();
  ensureDomainSubtypes(state);
  const counts = DATA.houseDomainCounts[state.type];  // Core: fixed per type.
  const nPrim = state.domains.filter((d) => d.tier === 'primary').length;
  const nSec = state.domains.filter((d) => d.tier === 'secondary').length;

  body.append(el('p', { class: 'small muted' }, `Choose ${counts.primary} primary and ${counts.secondary} secondary domain(s)` +
    (gg ? '; pick each domain’s asset subtype for income.' : '.')));
  // Primary/secondary meaning + the five subtype sections are Core guidance — always shown.
  const dg = DATA.houseDomainGuidance;
  body.append(el('details', { class: 'tips' },
    el('summary', {}, 'What primary and secondary domains mean'),
    el('p', { class: 'small' }, dg.intro),
    el('p', { class: 'small' }, el('strong', {}, 'Primary: '), dg.primary),
    el('p', { class: 'small' }, el('strong', {}, 'Secondary: '), dg.secondary),
    el('p', { class: 'small muted' }, ...SUBTYPES.map((st) =>
      el('span', {}, el('strong', {}, capitalize(st) + ': '), DATA.houseSubtypeDefs[st] + ' ')))));
  body.append(el('p', {},
    el('span', { class: 'pill' }, `Primary ${nPrim}/${counts.primary}`),
    el('span', { class: 'pill' }, `Secondary ${nSec}/${counts.secondary}`)));

  // Ghost out tier options once the type's cap is reached (a domain that already holds that
  // tier keeps its option so it can be changed/cleared).
  const primFull = nPrim >= counts.primary;
  const secFull = nSec >= counts.secondary;

  for (const dom of DATA.houseDomains) {
    const cur = state.domains.find((d) => d.id === dom.id);
    const tierSel = el('select', { 'aria-label': `${dom.name} tier` },
      el('option', { value: '' }, '—'),
      el('option', { value: 'primary', selected: cur?.tier === 'primary' ? '' : null,
        disabled: (primFull && cur?.tier !== 'primary') ? '' : null }, 'Primary'),
      el('option', { value: 'secondary', selected: cur?.tier === 'secondary' ? '' : null,
        disabled: (secFull && cur?.tier !== 'secondary') ? '' : null }, 'Secondary'));
    tierSel.addEventListener('change', () => {
      state.domains = state.domains.filter((d) => d.id !== dom.id);
      if (tierSel.value) state.domains.push({ id: dom.id, tier: tierSel.value, subtype: cur?.subtype || (gg ? SUBTYPES[0] : undefined) });
      rerender();
    });
    const row = el('div', { class: 'stat-row' }, el('span', { class: 'stat-name' }, dom.name), tierSel);
    const detail = DATA.houseDomainDetails[dom.id];   // Core: description + example lists.
    if (gg && cur?.tier) {
      const sub = el('select', { 'aria-label': `${dom.name} subtype` },
        ...SUBTYPES.map((st) => el('option', { value: st, selected: cur.subtype === st ? '' : null }, capitalize(st))));
      sub.addEventListener('change', () => { cur.subtype = sub.value; rerender(); });
      const inc = domainIncome(dom.id, cur.tier, cur.subtype);
      row.append(sub, el('span', { class: 'small muted' }, `+${inc.resources}R / +${inc.wealth}W`));
    }
    body.append(row);
    // Under a chosen domain, show its description + example items. In Great Game the examples
    // narrow to the picked subtype; in core narrative mode, show all five sections.
    if (cur?.tier && detail) {
      const ex = gg
        ? `E.g. ${capitalize(cur.subtype)}: ${detail.examples[cur.subtype].join(', ')}.`
        : SUBTYPES.map((st) => `${capitalize(st)}: ${detail.examples[st].join(', ')}`).join(' · ');
      body.append(el('p', { class: 'small muted domain-detail' }, `${detail.desc} ${ex}`));
    }
  }

  if (gg) {
    const tot = houseIncome(state);
    body.append(el('p', {},
      el('span', { class: 'pill' }, `Income: ${tot.resources} Resources`),
      el('span', { class: 'pill' }, `${tot.wealth} Wealth`)));
  }
}

// ---------- House step 3: Homeworld ----------
const HOMEWORLD_LABELS = {
  weather: 'Weather', habitation: 'Habitation', crimeRate: 'Crime rate',
  crimeStance: 'Stance on crime', contentment: 'Contentment', publicWealth: 'Public wealth',
};
function hStepHomeworld(state, body) {
  body.append(el('p', { class: 'small muted' }, DATA.homeworld.note));
  const nameInp = el('input', { type: 'text', placeholder: 'Homeworld name (e.g. Kaitain)', value: state.homeworld.name || '' });
  nameInp.addEventListener('input', () => { state.homeworld.name = nameInp.value; });
  body.append(el('label', { class: 'field' }, el('span', {}, 'Homeworld name'), nameInp));
  for (const key of Object.keys(HOMEWORLD_LABELS)) {
    const sel = el('select', { 'aria-label': HOMEWORLD_LABELS[key] },
      el('option', { value: '' }, '—'),
      ...DATA.homeworld.options[key].map((o) => el('option', { value: o, selected: state.homeworld[key] === o ? '' : null }, o)));
    sel.addEventListener('change', () => { state.homeworld[key] = sel.value; });
    body.append(el('label', { class: 'field' }, el('span', {}, HOMEWORLD_LABELS[key]), sel));
  }
}

// ---------- House step 4: Banner ----------
function hStepBanner(state, body) {
  body.append(el('p', { class: 'small muted' }, 'Optional heraldry — no copied crests.'));
  const crest = el('input', { type: 'text', placeholder: 'e.g. A hawk over crossed blades', value: state.banner.crest });
  crest.addEventListener('input', () => { state.banner.crest = crest.value; });
  const colors = el('input', { type: 'text', placeholder: '1–2 colours, e.g. crimson & bone', value: state.banner.colors });
  colors.addEventListener('input', () => { state.banner.colors = colors.value; });
  body.append(
    el('label', { class: 'field' }, el('span', {}, 'Crest'), crest),
    el('label', { class: 'field' }, el('span', {}, 'Colours'), colors));
}

// ---------- House step 5: Traits ----------
function hStepTraits(state, body) {
  const prim = state.domains.find((d) => d.tier === 'primary') || state.domains[0];
  const primName = prim ? (DATA.houseDomains.find((d) => d.id === prim.id)?.name || '') : '';
  if (!state.traits.domain && primName) state.traits.domain = primName;

  body.append(el('p', { class: 'small muted' }, DATA.houseTraits.domainTraitNote));
  const dom = el('input', { type: 'text', placeholder: 'Domain trait', value: state.traits.domain });
  dom.addEventListener('input', () => { state.traits.domain = dom.value; });
  body.append(el('label', { class: 'field' }, el('span', {}, 'Domain trait'), dom));

  const rep = el('input', { type: 'text', placeholder: 'e.g. Honourable', value: state.traits.reputation });
  rep.addEventListener('input', () => { state.traits.reputation = rep.value; });
  const pick = el('select', { class: 'example-pick', 'aria-label': 'Reputation examples' },
    el('option', { value: '' }, 'Insert an example…'),
    ...DATA.houseTraits.reputationExamples.map((r) => el('option', { value: r }, r)));
  pick.addEventListener('change', () => { if (pick.value) { state.traits.reputation = pick.value; rep.value = pick.value; pick.value = ''; } });
  body.append(el('label', { class: 'field' }, el('span', {}, 'Reputation trait'), rep, pick),
    el('p', { class: 'small muted' }, DATA.houseTraits.reputationNote));
}

// ---------- House step 6: Roles ----------
function hStepRoles(state, body) {
  const chars = listCharacters();
  body.append(el('p', { class: 'small muted' }, 'Assign House roles (optional). Choose a character or type an NPC name.'));
  for (const role of DATA.houseRoles) {
    const input = el('input', { type: 'text', list: 'role-chars', placeholder: role.duty, value: state.roles[role.id] || '', 'aria-label': role.name });
    input.addEventListener('input', () => {
      const v = input.value.trim();
      if (v) state.roles[role.id] = v; else delete state.roles[role.id];
    });
    body.append(el('label', { class: 'field' }, el('span', {}, role.name), input));
  }
  body.append(el('datalist', { id: 'role-chars' }, ...chars.map((c) => el('option', { value: c.identity.name || 'Unnamed' }))));
}

// ---------- House step 7: Enemies ----------
const HOUSE_TYPE_NAME = Object.fromEntries(DATA.houseTypes.map((t) => [t.id, t.name]));

/** Enforce the type's starting-enemy count as a minimum (Nascent 0 · Minor 1 · Major 2 · Great 2+;
 *  a GM may always add more rivals, so this is a floor, not a ceiling). */
function hValidateEnemies(state) {
  const rec = DATA.houseEnemies.perType[state.type];
  if (rec && state.enemies.length < rec.count) {
    const noun = rec.count === 1 ? 'enemy' : 'enemies';
    return `A ${HOUSE_TYPE_NAME[state.type]} starts with ${rec.count} ${noun} (${rec.makeup}) — you have ${state.enemies.length}.`;
  }
  return null;
}

function hStepEnemies(state, body, rerender) {
  const E = DATA.houseEnemies;
  const rec = E.perType[state.type] || { count: 0, types: [], makeup: '' };
  const draft = (state.enemyDraft = state.enemyDraft || { name: '', type: '', hatred: E.hatred[0].name, reason: E.reasons[0].name, notes: '' });
  if (!draft.type) draft.type = rec.types[state.enemies.length] || 'minor'; // next recommended rival size

  body.append(
    el('p', { class: 'small muted' }, `Enemies scale with House size. ${HOUSE_TYPE_NAME[state.type] || 'This House'}: ${rec.makeup}`),
    el('p', {}, el('span', { class: 'pill' }, `Enemies ${state.enemies.length}${rec.count ? ' / ' + rec.count : ''}`)));

  if (state.enemies.length) {
    const ul = el('ul', { class: 'char-list' });
    state.enemies.forEach((en, i) => {
      ul.append(el('li', {},
        el('div', {}, el('strong', {}, en.name || 'Unnamed rival'),
          en.type ? el('span', { class: 'small muted' }, ` · ${HOUSE_TYPE_NAME[en.type] || en.type}`) : null),
        el('div', { class: 'small' }, `${en.hatred} — ${en.reason}`),
        en.notes ? el('div', { class: 'small muted' }, en.notes) : null,
        el('button', { class: 'link-btn', onclick: () => { state.enemies.splice(i, 1); rerender(); } }, 'remove')));
    });
    body.append(ul);
  }

  body.append(el('h3', {}, 'Add an enemy'));
  const nameInp = el('input', { type: 'text', placeholder: 'Rival House name (e.g. House Acturi)', value: draft.name });
  nameInp.addEventListener('input', () => { draft.name = nameInp.value; });
  const typeSel = el('select', { 'aria-label': 'Rival type' },
    ...DATA.houseTypes.map((t) => el('option', { value: t.id, selected: draft.type === t.id ? '' : null }, t.name)));
  typeSel.addEventListener('change', () => { draft.type = typeSel.value; });
  const hSel = el('select', { 'aria-label': 'Hatred' },
    ...E.hatred.map((h) => el('option', { value: h.name, selected: draft.hatred === h.name ? '' : null }, h.name)));
  hSel.addEventListener('change', () => { draft.hatred = hSel.value; });
  const rSel = el('select', { 'aria-label': 'Reason' },
    ...E.reasons.map((r) => el('option', { value: r.name, selected: draft.reason === r.name ? '' : null }, r.name)));
  rSel.addEventListener('change', () => { draft.reason = rSel.value; });
  const notesInp = el('input', { type: 'text', placeholder: 'Notes (optional)', value: draft.notes });
  notesInp.addEventListener('input', () => { draft.notes = notesInp.value; });

  const roll = el('button', { class: 'btn secondary', onclick: () => {
    draft.hatred = rollOnTable(E.hatred).name; draft.reason = rollOnTable(E.reasons).name; rerender();
  } }, 'Roll Hatred & Reason');
  const add = el('button', { class: 'btn', onclick: () => {
    state.enemies.push({ name: draft.name.trim(), type: draft.type, hatred: draft.hatred, reason: draft.reason, notes: draft.notes.trim() });
    state.enemyDraft = null; rerender();
  } }, 'Add enemy');

  body.append(
    el('label', { class: 'field' }, el('span', {}, 'Name'), nameInp),
    el('label', { class: 'field' }, el('span', {}, 'Type'), typeSel),
    el('div', { class: 'focus-row' }, hSel, rSel),
    el('label', { class: 'field' }, el('span', {}, 'Notes'), notesInp),
    el('div', { class: 'cta-row' }, roll, add));
}

// ---------- House assembly ----------
function buildHouse(state) {
  const gg = Settings.greatGame();
  const traits = [];
  if (state.traits.domain.trim()) traits.push({ name: state.traits.domain.trim(), type: 'domain' });
  if (state.traits.reputation.trim()) traits.push({ name: state.traits.reputation.trim(), type: 'reputation' });
  const income = gg ? houseIncome(state) : null;

  return normalizeHouse({
    name: state.name.trim(),
    type: state.type,
    skills: gg ? { ...state.skillAssign } : null,
    domains: state.domains.map((d) => ({ id: d.id, tier: d.tier, ...(gg ? { subtype: d.subtype } : {}) })),
    wealth: income ? income.wealth : null,
    resources: income ? income.resources : null,
    homeworld: { ...state.homeworld },
    banner: { ...state.banner },
    traits,
    roles: { ...state.roles },
    enemies: state.enemies.map((e) => ({ ...e })),
  });
}
function finishHouse(state) {
  const house = buildHouse(state);
  saveHouse(house);
  showToast(`${house.name} ${state.editing ? 'updated' : 'established'}.`);
  goToScreen('home');
}
