// sheet.js — character list + full live in-play sheet (Phase 2).
// Editable in-play tracking: Momentum/Threat/Determination header, drive-statement
// challenge/recover (§3.8), traits (incl. complications), assets (5-permanent cap
// enforced, §3.11), notes. Every edit persists immediately via store + re-renders.

import { el, capitalize } from './core.js';
import {
  listCharacters, currentCharacterId, setCurrentCharacterId,
  saveCharacter, deleteCharacter, getPools, savePools, getRollLog,
} from './store.js';
import { permanentAssetCap, permanentAssetCount, clampDetermination, clampMomentum } from './derived.js';
import {
  skillAdvanceCost, focusAdvanceCost, talentAdvanceCost, assetPermanentCost, assetQualityCost, retrainedCost,
} from './rules.js';
import { focusExamplesFor } from './rules.js';
import { startCharacterWizard, openPregenPicker } from './wizard.js';
import { openRollDialog } from './roller.js';
import { renderLifecycle } from './combat.js';
import { modal, showToast, confirmModal } from './ui.js';
import { DATA } from '../data.js';

const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const DRIVE_NAME = Object.fromEntries(DATA.drives.map((d) => [d.id, d.name]));

const SOURCE_LABELS = { archetype: 'archetype', faction: 'faction', finishing: 'reputation' };
const sourceLabel = (src) => SOURCE_LABELS[src] || src;

let mountRoot = null;
function refresh() { if (mountRoot) { mountRoot.replaceChildren(); renderSheet(mountRoot); } }

/** A compact -/value/+ stepper. */
function stepper(value, onChange, { min = 0, max = 99, label = '' } = {}) {
  const dec = el('button', { class: 'step-btn', 'aria-label': `Decrease ${label}`,
    onclick: () => onChange(Math.max(min, value - 1)) }, '−');
  const inc = el('button', { class: 'step-btn', 'aria-label': `Increase ${label}`,
    onclick: () => onChange(Math.min(max, value + 1)) }, '+');
  if (value <= min) dec.disabled = true;
  if (value >= max) inc.disabled = true;
  return el('div', { class: 'stepper' }, dec, el('span', { class: 'stat-val' }, String(value)), inc);
}

/** Persistent Momentum/Threat/Determination header (§ Phase 2 · on the in-play sheet). */
export function poolsHeader(current) {
  const pools = getPools();
  const cell = (name, node) => el('div', { class: 'pool-cell' },
    el('span', { class: 'pool-name' }, name), node);

  return el('section', { class: 'card pools-bar', 'aria-label': 'Shared resources' },
    cell('Momentum',
      stepper(pools.momentum, (v) => { savePools({ ...pools, momentum: clampMomentum(v) }); refresh(); },
        { min: 0, max: DATA.momentumRules.cap, label: 'Momentum' })),
    cell('Threat',
      stepper(pools.threat, (v) => { savePools({ ...pools, threat: Math.max(0, v) }); refresh(); },
        { min: 0, max: 999, label: 'Threat' })),
    cell(current ? 'Determination' : 'Det.',
      current
        ? stepper(current.determination, (v) => {
            saveCharacter({ ...current, determination: clampDetermination(v) }); refresh();
          }, { min: 0, max: DATA.determination.cap, label: 'Determination' })
        : el('span', { class: 'stat-val muted' }, '—')));
}

export function renderSheet(root) {
  mountRoot = root;
  const chars = listCharacters();
  const currentId = currentCharacterId();
  const current = chars.find((c) => c.id === currentId) || chars[0] || null;

  root.append(poolsHeader(current));

  root.append(
    el('section', { class: 'card' },
      el('h2', {}, 'Characters'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: startCharacterWizard }, '+ New character'),
        el('button', { class: 'btn secondary', onclick: openPregenPicker }, 'Play an iconic')),
      chars.length
        ? el('ul', { class: 'char-list' }, ...chars.map((c) =>
            el('li', {},
              el('button', { class: 'link-btn',
                onclick: () => { setCurrentCharacterId(c.id); refresh(); } },
                c.identity.name || 'Unnamed'),
              c.id === (current && current.id) ? el('span', { class: 'tag' }, 'active') : null)))
        : el('p', { class: 'muted' }, 'No characters yet.')),
  );

  if (chars.length) root.append(renderLifecycle(refresh));

  if (current) root.append(liveSheet(current));
  else root.append(el('section', { class: 'card' },
    el('p', { class: 'small muted' }, 'Create or select a character to open the live sheet.')));
}

function liveSheet(c) {
  const id = c.identity;
  const statChip = (name, val) => el('div', { class: 'stat-chip' }, el('span', {}, name), el('strong', {}, String(val)));

  return el('section', { class: 'card' },
    el('h3', {}, id.name || 'Unnamed'),
    el('p', { class: 'small muted' },
      [id.archetype && capitalize(id.archetype), id.factionTemplate && capitalize(id.factionTemplate),
       id.houseRole && capitalize(id.houseRole)].filter(Boolean).join(' · ') || 'Character'),

    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => openRollDialog(c, refresh) }, '⚂ Roll a test')),

    el('h4', {}, 'Skills'),
    el('div', { class: 'stat-grid' }, ...DATA.skills.map((s) => statChip(s.name, c.skills[s.id]))),

    el('h4', {}, 'Drives'),
    el('div', { class: 'stat-grid' }, ...DATA.drives.map((d) => statChip(d.name, c.drives[d.id]))),

    statementsSection(c),
    el('h4', {}, 'Focuses'),
    el('p', { class: 'small' }, (c.focuses || []).map((f) => `${f.name} (${SKILL_NAME[f.skill]})`).join(', ') || '—'),

    el('h4', {}, 'Talents'),
    el('p', { class: 'small' }, (c.talents || []).map((t) => {
      const param = t.skill ? SKILL_NAME[t.skill] : t.drive ? DRIVE_NAME[t.drive] : t.category || null;
      return param ? `${t.name} (${param})` : t.name;
    }).join(', ') || '—'),

    traitsSection(c),
    assetsSection(c),

    id.ambition ? el('div', {}, el('h4', {}, 'Ambition'),
      el('p', { class: 'small' }, id.ambition)) : null,

    id.appearance || id.relationships
      ? el('div', {}, el('h4', {}, 'Details'),
          id.appearance ? el('p', { class: 'small' }, el('strong', {}, 'Appearance: '), id.appearance) : null,
          id.relationships ? el('p', { class: 'small' }, el('strong', {}, 'Relationships: '), id.relationships) : null)
      : null,

    advancementSection(c),
    notesSection(c),
    rollLogSection(),

    el('div', { class: 'cta-row', style: 'margin-top:14px' },
      el('button', { class: 'btn secondary danger-btn',
        onclick: async () => {
          if (await confirmModal(`Delete ${id.name || 'this character'}? This cannot be undone.`,
            { okLabel: 'Delete' })) { deleteCharacter(c.id); showToast('Character deleted'); refresh(); }
        } }, 'Delete character')),
  );
}

// ---------- Roll log (recent 2d20 tests) ----------
function rollLogSection() {
  const log = getRollLog().slice(0, 8);
  return el('div', {},
    el('h4', {}, 'Roll log'),
    log.length
      ? el('ul', { class: 'roll-log' }, ...log.map((r) => el('li', { class: 'small' },
          el('strong', {}, `${SKILL_NAME[r.skill] || r.skill} + ${DRIVE_NAME[r.drive] || r.drive} `),
          `TN ${r.tn} · [${(r.dice || []).join(', ')}] · ${r.successes} succ`,
          r.complications ? ` · ${r.complications} comp` : '',
          r.note ? ` · ${r.note}` : '')))
      : el('p', { class: 'small muted' }, 'No rolls yet — tap “Roll a test”.'));
}

// ---------- Drive statements: challenge / recover (§3.8) ----------
function statementsSection(c) {
  const entries = Object.entries(c.driveStatements || {});
  if (!entries.length) return null;
  return el('div', {},
    el('h4', {}, 'Drive statements'),
    el('ul', { class: 'stmt-list' }, ...entries.map(([drive, s]) =>
      el('li', { class: 'stmt-item' + (s.challenged ? ' challenged' : '') },
        el('div', { class: 'small' },
          el('strong', {}, DRIVE_NAME[drive] + ': '),
          s.text,
          s.challenged ? el('span', { class: 'tag danger-tag' }, 'challenged') : null),
        el('button', { class: 'link-btn',
          onclick: () => {
            const next = { ...c.driveStatements, [drive]: { ...s, challenged: !s.challenged } };
            saveCharacter({ ...c, driveStatements: next });
            showToast(s.challenged ? 'Statement recovered' : 'Statement challenged');
            refresh();
          } }, s.challenged ? 'Recover' : 'Challenge')))));
}

// ---------- Traits (incl. complications) ----------
function traitsSection(c) {
  return el('div', {},
    el('div', { class: 'section-head' },
      el('h4', {}, 'Traits'),
      el('button', { class: 'link-btn', onclick: () => addTraitDialog(c) }, '+ Add')),
    (c.traits || []).length
      ? el('div', { class: 'trait-list' }, ...c.traits.map((t, i) =>
          el('span', { class: 'pill' + (t.negative ? ' neg' : '') }, t.name,
            t.source ? el('span', { class: 'trait-src' }, ` ${sourceLabel(t.source)}`) : null,
            el('button', { class: 'pill-x', 'aria-label': `Remove ${t.name}`,
              onclick: () => {
                saveCharacter({ ...c, traits: c.traits.filter((_, j) => j !== i) }); refresh();
              } }, '×'))))
      : el('p', { class: 'small muted' }, 'No traits.'));
}

function addTraitDialog(c) {
  const name = el('input', { type: 'text', placeholder: 'e.g. Injured, Exhausted, Wary' });
  const neg = el('input', { type: 'checkbox', id: 'trait-neg' });
  const save = () => {
    const n = name.value.trim();
    if (!n) return;
    saveCharacter({ ...c, traits: [...(c.traits || []), { name: n, negative: neg.checked, source: 'play' }] });
    close(); refresh();
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const close = modal([
    el('h2', {}, 'Add trait'),
    el('label', { class: 'field' }, el('span', {}, 'Trait'), name),
    el('label', { class: 'toggle-row' },
      el('div', {}, el('div', {}, 'Complication (negative)'),
        el('div', { class: 'small muted' }, '+1 Difficulty on affected tests, or gates an action.')),
      neg),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: save }, 'Add')),
  ]);
  name.focus();
}

// ---------- Assets (5-permanent cap enforced, §3.11) ----------
function assetsSection(c) {
  const cap = permanentAssetCap(c);
  const permCount = permanentAssetCount(c);
  return el('div', {},
    el('div', { class: 'section-head' },
      el('h4', {}, `Assets · ${permCount}/${cap} permanent`),
      el('button', { class: 'link-btn', onclick: () => addAssetDialog(c) }, '+ Add')),
    (c.assets || []).length
      ? el('ul', { class: 'asset-list' }, ...c.assets.map((a, i) => assetRow(c, a, i, cap, permCount)))
      : el('p', { class: 'small muted' }, 'No assets.'));
}

function assetRow(c, a, i, cap, permCount) {
  const update = (patch) => { const assets = c.assets.map((x, j) => j === i ? { ...x, ...patch } : x); saveCharacter({ ...c, assets }); refresh(); };
  const atCap = permCount >= cap && !a.permanent;
  const permBtn = el('button', { class: 'link-btn' + (a.permanent ? ' on' : ''),
    onclick: () => {
      if (atCap) { showToast(`Permanent asset cap reached (${cap}).`); return; }
      update({ permanent: !a.permanent });
    } }, a.permanent ? 'permanent' : 'make permanent');
  if (atCap) permBtn.classList.add('disabled');

  return el('li', { class: 'asset-item' },
    el('div', { class: 'asset-main' },
      el('strong', {}, a.name),
      a.tangible === false ? el('span', { class: 'tag' }, 'intangible') : null,
      permBtn),
    el('div', { class: 'asset-controls' },
      el('span', { class: 'small muted' }, 'Quality'),
      stepper(a.quality || 0, (v) => update({ quality: v }), { min: 0, max: 5, label: 'Quality' }),
      el('button', { class: 'pill-x', 'aria-label': `Remove ${a.name}`,
        onclick: () => { saveCharacter({ ...c, assets: c.assets.filter((_, j) => j !== i) }); refresh(); } }, '×')));
}

function addAssetDialog(c) {
  const name = el('input', { type: 'text', placeholder: 'e.g. Crysknife, Spy Network' });
  const tangible = el('input', { type: 'checkbox', id: 'asset-tangible' });
  tangible.checked = true;
  const save = () => {
    const n = name.value.trim();
    if (!n) return;
    // Created-in-play assets default Quality 0, not permanent (§3.11 / ruling #3).
    saveCharacter({ ...c, assets: [...(c.assets || []), { name: n, quality: 0, tangible: tangible.checked, permanent: false }] });
    close(); refresh();
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const close = modal([
    el('h2', {}, 'Add asset'),
    el('label', { class: 'field' }, el('span', {}, 'Name'), name),
    el('label', { class: 'toggle-row' },
      el('div', {}, el('div', {}, 'Tangible'),
        el('div', { class: 'small muted' }, 'A physical item vs. an intangible asset (contact, favour).')),
      tangible),
    el('p', { class: 'small muted' }, 'New assets start at Quality 0 and non-permanent (§3.11).'),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: save }, 'Add')),
  ]);
  name.focus();
}

// ---------- Advancement (§3.10) ----------
function logAdvancement(c, entry) {
  const adv = c.advancement;
  return { ...adv, log: [...(adv.log || []), `${new Date().toISOString().slice(0, 10)} · ${entry}`] };
}

function advancementSection(c) {
  const adv = c.advancement;
  const gated = adv.advancesPurchasedThisAdventure >= DATA.advancement.maxPerAdventure;

  const earnRow = el('div', { class: 'cta-row' }, ...DATA.advancement.earn.map((e) =>
    el('button', { class: 'btn small secondary', title: e.desc, onclick: () => {
      saveCharacter({ ...c, advancement: { ...logAdvancement(c, `Earned +${e.points} (${e.trigger})`), points: adv.points + e.points } });
      showToast(`+${e.points} advancement`); refresh();
    } }, `+${e.points} ${e.trigger}`)));

  const buyBtn = el('button', { class: 'btn', onclick: () => openAdvanceDialog(c) }, 'Purchase an advance');
  if (gated) buyBtn.disabled = true;

  return el('div', {},
    el('h4', {}, `Advancement · ${adv.points} point${adv.points === 1 ? '' : 's'}`),
    el('p', { class: 'small muted' }, gated
      ? 'Advance already purchased this adventure — resets on End adventure.'
      : 'Earn points from play; spend between adventures (max 1 advance per adventure).'),
    earnRow,
    el('div', { class: 'stat-row' }, el('span', { class: 'stat-name small' }, 'Adjust points'),
      stepper(adv.points, (v) => { saveCharacter({ ...c, advancement: { ...adv, points: Math.max(0, v) } }); refresh(); },
        { min: 0, max: 999, label: 'points' })),
    el('div', { class: 'cta-row' }, buyBtn),
    (adv.log && adv.log.length)
      ? el('details', { class: 'tips' }, el('summary', {}, `Advancement log (${adv.log.length})`),
          el('ul', {}, ...adv.log.slice(-8).reverse().map((l) => el('li', { class: 'small' }, l))))
      : null);
}

/** Purchase-an-advance modal: the five advance types with live cost + affordability + retraining. */
function openAdvanceDialog(c) {
  const CALC = DATA.advancement.calc;
  const adv = c.advancement;
  const state = { type: 'skill', target: null, param: null, retrain: false, drop: null };

  const body = el('div', {});
  const close = modal([el('h2', {}, 'Purchase an advance'), body], { labelledBy: null });
  render();

  function ownedBaseNames() { return new Set((c.talents || []).map((t) => t.name)); }

  function baseCost() {
    if (state.type === 'skill') return skillAdvanceCost(c);
    if (state.type === 'focus') return focusAdvanceCost(c);
    if (state.type === 'talent') return talentAdvanceCost(c);
    if (state.type === 'assetPermanent') return assetPermanentCost();
    if (state.type === 'assetQuality') return state.target ? assetQualityCost(c.assets[state.target]) : 0;
    return 0;
  }
  function canRetrain() { return ['skill', 'focus', 'talent'].includes(state.type); }
  function finalCost() { return state.retrain && canRetrain() ? retrainedCost(baseCost()) : baseCost(); }

  function render() {
    const typeSel = el('select', { 'aria-label': 'Advance type' },
      ...Object.entries(DATA.advancement.costs).map(([k, v]) => el('option', { value: k, selected: state.type === k ? '' : null }, v.name)));
    typeSel.addEventListener('change', () => { state.type = typeSel.value; state.target = null; state.param = null; state.drop = null; render(); });

    body.replaceChildren(...[
      el('div', { class: 'field' }, el('span', {}, 'Advance'), typeSel),
      targetControl(),
      canRetrain() ? retrainControl() : null,
      el('p', {}, el('span', { class: 'pill' }, `Cost ${finalCost()} of ${adv.points} points`),
        state.retrain && canRetrain() ? el('span', { class: 'pill' }, `retrained from ${baseCost()}`) : null),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
        buyControl()),
    ].filter((x) => x != null));
  }

  function targetControl() {
    if (state.type === 'skill') {
      const eligible = DATA.skills.filter((s) => c.skills[s.id] < CALC.skill.skillCap && !(adv.skillsAdvanced || []).includes(s.id));
      if (!eligible.length) return el('p', { class: 'small muted' }, 'No skill is eligible (each advances once; cap 8).');
      const sel = el('select', { 'aria-label': 'Skill to advance' },
        el('option', { value: '' }, 'Choose a skill…'),
        ...eligible.map((s) => el('option', { value: s.id, selected: state.target === s.id ? '' : null }, `${s.name} ${c.skills[s.id]} → ${c.skills[s.id] + 1}`)));
      sel.addEventListener('change', () => { state.target = sel.value || null; render(); });
      return el('div', { class: 'field' }, el('span', {}, 'Skill (+1)'), sel);
    }
    if (state.type === 'focus') {
      const eligibleSkills = DATA.skills.filter((s) => c.skills[s.id] >= CALC.focus.minSkillForFocus);
      if (!eligibleSkills.length) return el('p', { class: 'small muted' }, `Need a skill rated ${CALC.focus.minSkillForFocus}+ to gain a focus.`);
      const sSel = el('select', { 'aria-label': 'Focus skill' }, el('option', { value: '' }, 'Skill…'),
        ...eligibleSkills.map((s) => el('option', { value: s.id, selected: state.target === s.id ? '' : null }, `${s.name} ${c.skills[s.id]}`)));
      sSel.addEventListener('change', () => { state.target = sSel.value || null; state.param = null; render(); });
      let nameCtl = null;
      if (state.target) {
        const owned = new Set((c.focuses || []).filter((f) => f.skill === state.target).map((f) => f.name));
        const opts = focusExamplesFor(state.target).map((f) => f.name).filter((n) => !owned.has(n));
        const nSel = el('select', { 'aria-label': 'Focus name' }, el('option', { value: '' }, 'Focus…'),
          ...opts.map((n) => el('option', { value: n, selected: state.param === n ? '' : null }, n)));
        nSel.addEventListener('change', () => { state.param = nSel.value || null; render(); });
        nameCtl = el('div', { class: 'field' }, el('span', {}, 'Focus'), nSel);
      }
      return el('div', {}, el('div', { class: 'field' }, el('span', {}, 'On skill (≥6)'), sSel), nameCtl);
    }
    if (state.type === 'talent') {
      const owned = ownedBaseNames();
      const allowed = DATA.talents.filter((t) => !t.creationOnly && (!t.faction || t.faction === c.identity.factionTemplate) && (t.pick || !owned.has(t.name)));
      const sel = el('select', { 'aria-label': 'Talent' }, el('option', { value: '' }, 'Choose a talent…'),
        ...allowed.map((t) => el('option', { value: t.name, selected: state.target === t.name ? '' : null }, t.name)));
      sel.addEventListener('change', () => { state.target = sel.value || null; state.param = null; render(); });
      let paramCtl = null;
      const def = allowed.find((t) => t.name === state.target);
      if (def && def.pick) {
        const list = def.pick === 'skill' ? DATA.skills : def.pick === 'drive' ? DATA.drives
          : DATA.assetRules.categories.map((x) => ({ id: x, name: capitalize(x) }));
        const pickLabel = def.pick === 'assetCategory' ? 'category' : def.pick;
        const pSel = el('select', { 'aria-label': 'Parameter' }, el('option', { value: '' }, `Choose ${pickLabel}…`),
          ...list.map((x) => el('option', { value: x.id, selected: state.param === x.id ? '' : null }, x.name)));
        pSel.addEventListener('change', () => { state.param = pSel.value || null; render(); });
        paramCtl = el('div', { class: 'field' }, el('span', {}, capitalize(pickLabel)), pSel);
      }
      return el('div', {}, el('div', { class: 'field' }, el('span', {}, 'Talent'), sel), paramCtl);
    }
    if (state.type === 'assetPermanent') {
      const cap = permanentAssetCap(c), have = permanentAssetCount(c);
      if (have >= cap) return el('p', { class: 'small muted' }, `Permanent-asset cap reached (${cap}).`);
      const temps = (c.assets || []).map((a, i) => ({ a, i })).filter(({ a }) => a.permanent === false);
      if (!temps.length) return el('p', { class: 'small muted' }, 'No temporary asset to make permanent.');
      const sel = el('select', { 'aria-label': 'Asset' }, el('option', { value: '' }, 'Choose an asset…'),
        ...temps.map(({ a, i }) => el('option', { value: String(i), selected: state.target === i ? '' : null }, a.name)));
      sel.addEventListener('change', () => { state.target = sel.value === '' ? null : Number(sel.value); render(); });
      return el('div', { class: 'field' }, el('span', {}, `Asset → permanent (${have}/${cap})`), sel);
    }
    if (state.type === 'assetQuality') {
      if (!(c.assets || []).length) return el('p', { class: 'small muted' }, 'No assets to improve.');
      const sel = el('select', { 'aria-label': 'Asset' }, el('option', { value: '' }, 'Choose an asset…'),
        ...c.assets.map((a, i) => el('option', { value: String(i), selected: state.target === i ? '' : null }, `${a.name} (Q${a.quality || 0} → ${(a.quality || 0) + 1})`)));
      sel.addEventListener('change', () => { state.target = sel.value === '' ? null : Number(sel.value); render(); });
      return el('div', { class: 'field' }, el('span', {}, 'Asset Quality +1'), sel);
    }
    return null;
  }

  function retrainControl() {
    const box = el('input', { type: 'checkbox', id: 'adv-retrain' });
    box.checked = state.retrain;
    box.addEventListener('change', () => { state.retrain = box.checked; state.drop = null; render(); });
    const row = el('label', { class: 'toggle-row', for: 'adv-retrain' },
      el('span', {}, 'Retrain — halve the cost by letting another ability atrophy'), box);
    if (!state.retrain) return row;
    // Drop selector: matching kind (skill −1 min 4 / remove a focus / remove a talent).
    let dropCtl;
    if (state.type === 'skill') {
      const droppable = DATA.skills.filter((s) => c.skills[s.id] > CALC.skill.skillFloor);
      dropCtl = selWrap('Drop a skill by 1 (min 4)', droppable.map((s) => [s.id, `${s.name} ${c.skills[s.id]} → ${c.skills[s.id] - 1}`]));
    } else if (state.type === 'focus') {
      dropCtl = selWrap('Remove a focus', (c.focuses || []).map((f, i) => [String(i), `${f.name} (${SKILL_NAME[f.skill]})`]));
    } else {
      dropCtl = selWrap('Remove a talent', (c.talents || []).map((t, i) => [String(i), t.name + (t.skill ? ` (${SKILL_NAME[t.skill]})` : t.drive ? ` (${DRIVE_NAME[t.drive]})` : '')]));
    }
    return el('div', {}, row, dropCtl);

    function selWrap(label, pairs) {
      const sel = el('select', { 'aria-label': label }, el('option', { value: '' }, `${label}…`),
        ...pairs.map(([v, t]) => el('option', { value: v, selected: state.drop === v ? '' : null }, t)));
      sel.addEventListener('change', () => { state.drop = sel.value || null; });
      return el('div', { class: 'field' }, el('span', {}, label), sel);
    }
  }

  function buyControl() {
    const btn = el('button', { class: 'btn', onclick: () => buy() }, 'Buy advance');
    const cost = finalCost();
    const ready = cost <= adv.points && targetReady() && (!state.retrain || !canRetrain() || state.drop != null);
    if (!ready) btn.disabled = true;
    return btn;
  }
  function targetReady() {
    if (state.type === 'focus') return state.target && state.param;
    if (state.type === 'talent') { const def = DATA.talents.find((t) => t.name === state.target); return state.target && (!def?.pick || state.param); }
    return state.target != null;
  }

  function buy() {
    const cost = finalCost();
    if (cost > adv.points) { showToast('Not enough advancement points.'); return; }
    const patch = { skills: { ...c.skills }, focuses: [...(c.focuses || [])], talents: [...(c.talents || [])], assets: (c.assets || []).map((a) => ({ ...a })) };
    let desc = '';
    let newAdv = { ...adv };

    if (state.type === 'skill') {
      patch.skills[state.target] += 1;
      newAdv.skillAdvancesTotal = (adv.skillAdvancesTotal || 0) + 1;
      newAdv.skillsAdvanced = [...(adv.skillsAdvanced || []), state.target];
      desc = `Skill: ${SKILL_NAME[state.target]} → ${patch.skills[state.target]}`;
    } else if (state.type === 'focus') {
      patch.focuses.push({ skill: state.target, name: state.param });
      desc = `Focus: ${state.param} (${SKILL_NAME[state.target]})`;
    } else if (state.type === 'talent') {
      const def = DATA.talents.find((t) => t.name === state.target);
      const t = { name: state.target, source: 'advancement' };
      if (def?.pick === 'skill') t.skill = state.param; else if (def?.pick === 'drive') t.drive = state.param; else if (def?.pick) t.category = state.param;
      patch.talents.push(t);
      desc = `Talent: ${state.target}${state.param ? ` (${state.param})` : ''}`;
    } else if (state.type === 'assetPermanent') {
      patch.assets[state.target].permanent = true;
      desc = `Asset permanent: ${patch.assets[state.target].name}`;
    } else if (state.type === 'assetQuality') {
      patch.assets[state.target].quality = (patch.assets[state.target].quality || 0) + 1;
      desc = `Asset Quality: ${patch.assets[state.target].name} → Q${patch.assets[state.target].quality}`;
    }

    // Retraining atrophy (skill −1 / remove focus / remove talent).
    if (state.retrain && canRetrain() && state.drop != null) {
      if (state.type === 'skill') { patch.skills[state.drop] -= 1; desc += ` · retrained (dropped ${SKILL_NAME[state.drop]})`; }
      else if (state.type === 'focus') { const f = patch.focuses[Number(state.drop)]; patch.focuses.splice(Number(state.drop), 1); desc += ` · retrained (dropped ${f?.name || 'focus'})`; }
      else { const tl = patch.talents[Number(state.drop)]; patch.talents.splice(Number(state.drop), 1); desc += ` · retrained (dropped ${tl?.name || 'talent'})`; }
    }

    newAdv.points = adv.points - cost;
    newAdv.advancesPurchasedThisAdventure = (adv.advancesPurchasedThisAdventure || 0) + 1;
    newAdv = { ...logAdvancement({ advancement: newAdv }, `Advance −${cost}: ${desc}`) };

    saveCharacter({ ...c, ...patch, advancement: newAdv });
    showToast(`Advance purchased: ${desc}`);
    close(); refresh();
  }
}

// ---------- Notes ----------
function notesSection(c) {
  const ta = el('textarea', { rows: '4', placeholder: 'Session notes, reminders…' }, c.notes || '');
  ta.value = c.notes || '';
  ta.addEventListener('change', () => { saveCharacter({ ...c, notes: ta.value }); });
  return el('div', {}, el('h4', {}, 'Notes'), ta);
}
