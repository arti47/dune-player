// gm.js — GM dashboard (Phase 6, toggle-gated by Settings.gmScreen): Threat pool, party peek
// sheets, the NPC compendium, and the §3.16 rollable tables (Story Hook Generator + House
// enemy generator). All read already-extracted data — no new rules content here.

import { el, capitalize, d20 } from './core.js';
import { getPools, savePools, listCharacters } from './store.js';
import { DATA } from '../data.js';
import { NPCS } from '../data-npcs.js';

const SKILL = DATA.skills, DRIVE = DATA.drives;

/** Story Hook Generator: 5 entries per column over ranges 1–4/5–8/… → index = floor((roll−1)/4). */
export function storyHookIndex(roll) { return Math.floor((roll - 1) / 4); }
/** Find the row of a ranged d20 table ({range:'a–b', …}) for a roll. */
export function rowForRoll(rows, roll) {
  return rows.find((r) => {
    const [lo, hi] = String(r.range).split('–').map((n) => Number(n.trim()));
    return roll >= lo && roll <= (hi ?? lo);
  }) || null;
}

let mountRoot = null;
function refresh() { if (mountRoot) { mountRoot.replaceChildren(); renderGM(mountRoot); } }

function stepper(value, onChange, { min = 0, max = 999, label = '' } = {}) {
  const dec = el('button', { class: 'step-btn', 'aria-label': `Decrease ${label}`, onclick: () => onChange(Math.max(min, value - 1)) }, '−');
  const inc = el('button', { class: 'step-btn', 'aria-label': `Increase ${label}`, onclick: () => onChange(Math.min(max, value + 1)) }, '+');
  if (value <= min) dec.disabled = true;
  return el('div', { class: 'stepper' }, dec, el('span', { class: 'stat-val' }, String(value)), inc);
}

export function renderGM(root) {
  mountRoot = root;
  root.append(
    el('section', { class: 'card' }, el('h2', {}, 'GM Screen'),
      el('p', { class: 'small muted' }, 'Run the table: Threat, the party at a glance, the NPC compendium, and rollable story/enemy tables.')),
    threatCard(),
    partyCard(),
    hookCard(),
    enemyCard(),
    npcCard(),
  );
}

// ---------- Threat pool ----------
function threatCard() {
  const pools = getPools();
  return el('section', { class: 'card' },
    el('h3', {}, 'Pools'),
    el('div', { class: 'pools-bar' },
      el('div', { class: 'pool-cell' }, el('span', { class: 'pool-name' }, 'Threat'),
        stepper(pools.threat, (v) => { savePools({ ...pools, threat: v }); refresh(); }, { min: 0, label: 'Threat' })),
      el('div', { class: 'pool-cell' }, el('span', { class: 'pool-name' }, 'Momentum'),
        stepper(pools.momentum, (v) => { savePools({ ...pools, momentum: Math.min(DATA.momentumRules.cap, v) }); refresh(); }, { min: 0, max: DATA.momentumRules.cap, label: 'Momentum' }))));
}

// ---------- Party peek ----------
function partyCard() {
  const chars = listCharacters();
  return el('section', { class: 'card' },
    el('h3', {}, `Party (${chars.length})`),
    chars.length
      ? el('div', {}, ...chars.map((c) => el('details', { class: 'tips' },
          el('summary', {}, `${c.identity.name || 'Unnamed'}${c.state?.defeated ? ' · DEFEATED' : ''} — Det ${c.determination}`),
          el('p', { class: 'small' }, el('strong', {}, 'Skills: '), SKILL.map((s) => `${s.name.slice(0, 3)} ${c.skills[s.id]}`).join(' · ')),
          el('p', { class: 'small' }, el('strong', {}, 'Drives: '), DRIVE.map((d) => `${d.name.slice(0, 3)} ${c.drives[d.id]}`).join(' · ')),
          (c.traits || []).length ? el('p', { class: 'small muted' }, 'Traits: ' + c.traits.map((t) => t.name).join(', ')) : null,
          Object.keys(c.driveStatements || {}).length
            ? el('p', { class: 'small muted' }, 'Statements: ' + Object.entries(c.driveStatements).map(([d, s]) => `${capitalize(d)}${s.challenged ? ' (challenged)' : ''}`).join(', ')) : null)))
      : el('p', { class: 'small muted' }, 'No characters yet.'));
}

// ---------- Story Hook Generator (§3.16) ----------
function hookCard() {
  const out = el('div', {});
  const roll = () => {
    const cols = DATA.storyHooks.columns;
    out.replaceChildren(el('ul', {}, ...Object.entries(cols).map(([name, entries]) => {
      const r = d20();
      return el('li', { class: 'small' }, el('strong', {}, capitalize(name) + ': '), entries[storyHookIndex(r)], el('span', { class: 'small muted' }, ` (d20=${r})`));
    })));
  };
  return el('section', { class: 'card' },
    el('h3', {}, 'Story hook generator'),
    el('p', { class: 'small muted' }, 'Rolls a d20 on each column (Plot · Goal · Location · Hazard · Character).'),
    el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: roll }, 'Roll a hook')),
    out);
}

// ---------- House enemy generator (§3.16, T20 tables) ----------
function enemyCard() {
  const out = el('div', {});
  const roll = () => {
    const hr = d20(), rr = d20();
    const h = rowForRoll(DATA.houseEnemies.hatred, hr), rn = rowForRoll(DATA.houseEnemies.reasons, rr);
    out.replaceChildren(
      el('p', { class: 'small' }, el('strong', {}, `${h?.name || '—'} `), el('span', { class: 'small muted' }, `(d20=${hr})`), ' — ', h?.effect || ''),
      el('p', { class: 'small' }, el('strong', {}, `${rn?.name || '—'} `), el('span', { class: 'small muted' }, `(d20=${rr})`), ' — ', rn?.desc || ''));
  };
  return el('section', { class: 'card' },
    el('h3', {}, 'Enemy generator'),
    el('p', { class: 'small muted' }, 'Rolls a rival House’s Hatred degree × Reason (d20 × d20).'),
    el('div', { class: 'cta-row' }, el('button', { class: 'btn secondary', onclick: roll }, 'Roll an enemy')),
    out);
}

// ---------- NPC compendium ----------
function npcBlock(n, kind) {
  return el('details', { class: 'tips' },
    el('summary', {}, `${n.name} — ${n.tier}${kind === 'iconic' ? ' · iconic' : ''}`),
    (n.traits || []).length ? el('p', { class: 'small muted' }, 'Traits: ' + n.traits.join(', ')) : null,
    el('p', { class: 'small' }, el('strong', {}, 'Skills: '), SKILL.map((s) => `${s.name.slice(0, 3)} ${n.skills?.[s.id] ?? '—'}`).join(' · ')),
    el('p', { class: 'small' }, el('strong', {}, 'Drives: '), DRIVE.map((d) => `${d.name.slice(0, 3)} ${n.drives?.[d.id] ?? '—'}`).join(' · ')),
    (n.focuses || []).length ? el('p', { class: 'small muted' }, 'Focuses: ' + n.focuses.map((f) => f.name).join(', ')) : null,
    (n.talents || []).length ? el('p', { class: 'small muted' }, 'Talents: ' + n.talents.join(', ')) : null,
    (n.assets || []).length ? el('p', { class: 'small muted' }, 'Assets: ' + n.assets.map((a) => a.name || a).join(', ')) : null);
}
function npcCard() {
  const search = el('input', { type: 'search', placeholder: 'Search NPCs…', 'aria-label': 'Search NPCs' });
  const list = el('div', {});
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const hit = (n) => !q || n.name.toLowerCase().includes(q);
    list.replaceChildren(
      el('h4', {}, `Generic archetypes (${NPCS.archetypes.filter(hit).length})`),
      ...NPCS.archetypes.filter(hit).map((n) => npcBlock(n, 'archetype')),
      el('h4', {}, `Iconic characters (${NPCS.iconics.filter(hit).length})`),
      ...NPCS.iconics.filter(hit).map((n) => npcBlock(n, 'iconic')));
  };
  search.addEventListener('input', draw);
  draw();
  return el('section', { class: 'card' },
    el('h3', {}, `NPC compendium (${NPCS.archetypes.length + NPCS.iconics.length})`),
    search, list);
}
