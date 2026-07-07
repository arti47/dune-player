// sheet.js — character list + full live in-play sheet (Phase 2).
// Editable in-play tracking: Momentum/Threat/Determination header, drive-statement
// challenge/recover (§3.8), traits (incl. complications), assets (5-permanent cap
// enforced, §3.11), notes. Every edit persists immediately via store + re-renders.

import { el, capitalize } from './core.js';
import {
  listCharacters, currentCharacterId, setCurrentCharacterId,
  saveCharacter, deleteCharacter, getPools, savePools,
} from './store.js';
import { permanentAssetCap, permanentAssetCount, clampDetermination, clampMomentum } from './derived.js';
import { startCharacterWizard, openPregenPicker } from './wizard.js';
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

    notesSection(c),

    el('div', { class: 'cta-row', style: 'margin-top:14px' },
      el('button', { class: 'btn secondary danger-btn',
        onclick: async () => {
          if (await confirmModal(`Delete ${id.name || 'this character'}? This cannot be undone.`,
            { okLabel: 'Delete' })) { deleteCharacter(c.id); showToast('Character deleted'); refresh(); }
        } }, 'Delete character')),
  );
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

// ---------- Notes ----------
function notesSection(c) {
  const ta = el('textarea', { rows: '4', placeholder: 'Session notes, reminders…' }, c.notes || '');
  ta.value = c.notes || '';
  ta.addEventListener('change', () => { saveCharacter({ ...c, notes: ta.value }); });
  return el('div', {}, el('h4', {}, 'Notes'), ta);
}
