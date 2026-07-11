// house.js — the Great Game House Management tracker (T36) + example-House loading.
// Runs the yearly session loop on a live House: Income → Upkeep → Ventures → End of Year,
// with live Wealth/Resources/Status. All numbers come from EXPANSION.houseManagement
// (data-great-game.js); this module only computes and applies them. greatGame-gated.

import { el, rollD20s, clamp } from './core.js';
import { modal, showToast, confirmModal } from './ui.js';
import { getHouse, saveHouse, deleteHouse } from './store.js';
import { normalizeHouse } from './derived.js';
import { Settings } from './settings.js';
import { EXPANSION as GG } from '../data-great-game.js';

const goto = (id) => { location.hash = `#/${id}`; };

const HM = GG.houseManagement;               // economy (income + skill arrays)
const M = HM.management;                      // the session subsystem (steps, status, upkeep, ventures…)
const SKILLS = ['battle', 'communicate', 'discipline', 'move', 'understand'];
const SKILL_NAME = { battle: 'Battle', communicate: 'Communicate', discipline: 'Discipline', move: 'Move', understand: 'Understand' };

// Which income category a domain label falls in (societal vs tangible), tolerant of the
// example Houses' non-canonical labels (e.g. 'Logistics', 'Farming/Industrial').
const CAT = {};
M && HM.categoryModifiers.societal.domains.forEach((d) => (CAT[d] = 'societal'));
HM.categoryModifiers.tangible.domains.forEach((d) => (CAT[d] = 'tangible'));
export function resolveCategory(label) {
  const key = String(label || '').toLowerCase().split(/[/ ]/)[0];
  return CAT[key] || 'tangible';
}

/** Income for one domain (subtype × category × primary/secondary), floored (§ income model). */
export function domainIncome(subtype, category, tier) {
  const slot = tier === 'primary' ? 'primary' : 'secondary';
  const base = HM.subtypeIncome[subtype] && HM.subtypeIncome[subtype][slot];
  const mod = HM.categoryModifiers[category] && HM.categoryModifiers[category][slot];
  if (!base || !mod) return { resources: HM.minimum.resources, wealth: HM.minimum.wealth };
  return {
    resources: Math.max(HM.minimum.resources, base.resources + mod.resources),
    wealth: Math.max(HM.minimum.wealth, base.wealth + mod.wealth),
  };
}

/** Total yearly income for a House (all domains + a Treasurer's +10 Wealth). */
export function computeIncome(house) {
  let resources = 0, wealth = 0;
  for (const d of house.domains || []) {
    const inc = domainIncome(d.subtype, d.category || resolveCategory(d.id), d.tier);
    resources += inc.resources; wealth += inc.wealth;
  }
  if (house.roles && house.roles.treasurer) wealth += 10;
  return { resources, wealth };
}

/** Wealth upkeep for one House skill value (§ skill upkeep ladder). */
export function skillUpkeepFor(v) {
  if (v <= 4) return 0; if (v <= 6) return 2; if (v === 7) return 4;
  if (v === 8) return 8; if (v === 9) return 12; return 24;
}

/** Total yearly upkeep = Military + Population + Lifestyle levels + per-skill upkeep. */
export function computeUpkeep(house) {
  const up = house.management.upkeep;
  const mil = (M.militaryPower.find((x) => x.level === up.military) || {}).upkeep || 0;
  const pop = (M.populationLoyalty.find((x) => x.level === up.population) || {}).upkeep || 0;
  const life = (M.lifestyle.find((x) => x.level === up.lifestyle) || {}).upkeep || 0;
  let skills = 0;
  if (house.skills) for (const s of SKILLS) skills += skillUpkeepFor(house.skills[s] || 0);
  return { military: mil, population: pop, lifestyle: life, skills, total: mil + pop + life + skills };
}

/** The status level (Feeble…Dangerous) for a House's type + status value. Nascent uses the Minor band. */
export function statusLevel(type, status) {
  const t = type === 'nascent' ? 'minor' : type || 'major';
  for (const lv of M.status.levels) {
    const band = lv[t];
    if (!band) continue;
    const m = band.match(/^(\d+)(?:[–-](\d+))?(\+)?$/);
    if (!m) continue;
    const lo = +m[1], hi = m[2] ? +m[2] : m[3] ? Infinity : lo;
    if (status >= lo && status <= hi) return lv;
  }
  return M.status.levels[0];
}

const startStatus = (type) => M.status.startingByType[type === 'nascent' ? 'nascent' : type] ?? 25;

/** Build a playable House from one of the example Houses (crunch → live record) and save it. */
export function instantiateExampleHouse(name) {
  const ex = GG.landsraadHouses.find((h) => h.name === name);
  if (!ex) return null;
  const type = ex.type || 'major';
  const arr = HM.skillArrays[type];
  const skills = {}; SKILLS.forEach((s, i) => (skills[s] = arr[i]));
  const mk = (d, tier) => ({ id: d.domain, tier, subtype: d.subtype, category: resolveCategory(d.domain), note: d.note });
  const house = normalizeHouse({
    name: ex.name, type, skills,
    domains: [...ex.primary.map((d) => mk(d, 'primary')), ...ex.secondary.map((d) => mk(d, 'secondary'))],
    wealth: 0, resources: 0,
    banner: { colors: ex.colors, crest: ex.crest },
    traits: ex.traits.map((t) => ({ name: t, type: 'reputation' })),
    roles: {}, enemies: [], homeworld: {},
    management: { active: true, status: startStatus(type), year: 1, venturesUsed: 0, incomeCollected: false,
      upkeep: { military: 'None', population: 'Acceptance', lifestyle: 'Noble' },
      log: [{ y: 1, text: `Loaded ${ex.name} (${type}) — status ${startStatus(type)}.` }] },
  });
  saveHouse(house);
  return house;
}

/** Turn on management for an existing (wizard-built) House. */
function beginManagement(house) {
  const type = house.type || 'major';
  house.management = { active: true, status: startStatus(type), year: 1, venturesUsed: 0, incomeCollected: false,
    upkeep: { military: 'None', population: 'Acceptance', lifestyle: 'Noble' },
    log: [{ y: 1, text: `Began House management — status ${startStatus(type)}.` }] };
  if (house.wealth == null) house.wealth = 0;
  if (house.resources == null) house.resources = 0;
  saveHouse(house);
  return house;
}

// ---------- screen ----------
export function renderHouseManagement(root) {
  const render = () => { root.replaceChildren(); build(root, render); };
  build(root, render);
}

function build(root, render) {
  if (!Settings.greatGame()) {
    root.append(el('section', { class: 'card' },
      el('h2', {}, 'House management'),
      el('p', { class: 'small muted' }, 'The House Management system is part of The Great Game. Enable that toggle in Settings to use it.'),
      el('button', { class: 'btn', onclick: () => goto('settings') }, 'Open Settings')));
    return;
  }
  const house = getHouse();
  if (!house) {
    root.append(el('section', { class: 'card' },
      el('h2', {}, 'House management'),
      el('p', { class: 'small muted' }, 'You have no House yet. Create one, or load a ready-made House of the Landsraad to play.'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: () => goto('home') }, 'Create a House'),
        el('button', { class: 'btn secondary', onclick: () => openLoadExample(render) }, 'Load an example House'))));
    return;
  }
  if (!house.management || !house.management.active) {
    root.append(el('section', { class: 'card' },
      el('h2', {}, house.name || 'Your House'),
      el('p', { class: 'small muted' }, 'Begin House management to run the yearly session (income, upkeep, ventures) with live Wealth, Resources, and Status.'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: () => { beginManagement(house); render(); } }, 'Begin House management'),
        el('button', { class: 'btn secondary', onclick: () => openLoadExample(render) }, 'Load an example House instead'))));
    return;
  }
  renderTracker(root, house, render);
}

function openLoadExample(render) {
  const box = el('div', {});
  const close = modal(box, { labelledBy: 'lex-title' });
  const sel = el('select', { 'aria-label': 'Example House' },
    ...GG.landsraadHouses.map((h) => el('option', { value: h.name }, `${h.name}${h.type ? ` · ${h.type}` : ''}`)));
  const preview = el('p', { class: 'small muted' });
  const refresh = () => {
    const ex = GG.landsraadHouses.find((h) => h.name === sel.value);
    const type = ex.type || 'major';
    preview.textContent = `${type} · Traits ${ex.traits.join(', ')} · Skills ${HM.skillArrays[type].join('/')} · status ${startStatus(type)}. Domains: ` +
      [...ex.primary, ...ex.secondary].map((d) => `${d.domain} (${d.subtype})`).join(', ');
  };
  sel.addEventListener('change', refresh); refresh();
  box.append(
    el('h2', { id: 'lex-title' }, 'Load an example House'),
    el('p', { class: 'small muted' }, 'Instantiates the House as a playable record with management state. This replaces your current House.'),
    el('div', { class: 'field' }, el('span', {}, 'House'), sel),
    preview,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn secondary', onclick: () => close() }, 'Cancel'),
      el('button', { class: 'btn', onclick: async () => {
        if (getHouse() && !await confirmModal('Replace your current House with this example House?', { okLabel: 'Replace' })) return;
        instantiateExampleHouse(sel.value); close(); showToast('House loaded'); render();
      } }, 'Load & play')));
}

function pools(house) {
  return {
    wealth: house.wealth || 0, resources: house.resources || 0,
    status: house.management.status, year: house.management.year,
  };
}

function log(house, text) {
  house.management.log = [...(house.management.log || []), { y: house.management.year, text }].slice(-40);
}

function renderTracker(root, house, render) {
  const mgmt = house.management;
  const p = pools(house);
  const lvl = statusLevel(house.type, p.status);
  const income = computeIncome(house);
  const upkeep = computeUpkeep(house);
  const persist = () => { saveHouse(house); render(); };

  const stepper = (label, get, set, min = -Infinity) => el('div', { class: 'field' },
    el('span', {}, label),
    el('div', { class: 'stepper' },
      el('button', { class: 'step-btn', 'aria-label': `Less ${label}`, onclick: () => { set(Math.max(min, get() - 1)); persist(); } }, '−'),
      el('span', { class: 'stat-val' }, String(get())),
      el('button', { class: 'step-btn', 'aria-label': `More ${label}`, onclick: () => { set(get() + 1); persist(); } }, '+')));

  // Header
  root.append(el('section', { class: 'card' },
    el('h2', {}, house.name || 'Your House'),
    el('p', { class: 'small muted' }, `${(house.type || 'major')} House · Year ${p.year}`),
    el('p', {},
      el('span', { class: 'pill' }, `Status ${p.status} · ${lvl.name}`),
      el('span', { class: 'pill' }, `Wealth ${p.wealth}`),
      el('span', { class: 'pill' }, `Resources ${p.resources}`)),
    el('p', { class: 'small muted' }, lvl.effect),
    el('div', { class: 'grid-2' },
      stepper('Wealth', () => house.wealth || 0, (v) => { house.wealth = v; }, 0),
      stepper('Resources', () => house.resources || 0, (v) => { house.resources = v; }, 0),
      stepper('Status', () => mgmt.status, (v) => { mgmt.status = v; }, 0)),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: () => openLoadExample(render) }, 'Load another House'),
      el('button', { class: 'btn danger-btn', onclick: async () => {
        if (!await confirmModal(`Delete ${house.name || 'this House'}? This removes the House and its management state for everyone on this device.`, { okLabel: 'Delete' })) return;
        deleteHouse(); showToast('House deleted'); render();
      } }, 'Delete House'))));

  // Domains + income
  root.append(el('section', { class: 'card' },
    el('h3', {}, 'Domains'),
    (house.domains || []).length
      ? el('ul', { class: 'char-list' }, ...house.domains.map((d) => {
          const inc = domainIncome(d.subtype, d.category || resolveCategory(d.id), d.tier);
          return el('li', {}, el('span', {}, `${d.id} · ${d.tier} (${d.subtype})`),
            el('span', { class: 'small muted' }, ` +${inc.resources}R / +${inc.wealth}W`));
        }))
      : el('p', { class: 'small muted' }, 'No domains recorded.'),
    el('p', { class: 'small' }, el('strong', {}, 'Total income: '), `${income.resources} Resources · ${income.wealth} Wealth${house.roles && house.roles.treasurer ? ' (incl. Treasurer +10 W)' : ''}`)));

  // 6-step session
  const income$ = el('section', { class: 'card' },
    el('h3', {}, `Income — year ${p.year}`),
    el('p', { class: 'small muted' }, mgmt.incomeCollected ? 'Income already collected this year.' : `Collect ${income.resources} Resources and ${income.wealth} Wealth from your domains.`),
    el('button', { class: 'btn', disabled: mgmt.incomeCollected ? '' : null, onclick: () => {
      house.resources = (house.resources || 0) + income.resources;
      house.wealth = (house.wealth || 0) + income.wealth;
      mgmt.incomeCollected = true;
      log(house, `Income: +${income.resources}R / +${income.wealth}W.`); persist();
    } }, 'Collect income'));
  root.append(income$);

  // Upkeep
  const upSel = (label, list, key) => {
    const s = el('select', { 'aria-label': label }, ...list.map((o) => el('option', { value: o.level, selected: mgmt.upkeep[key] === o.level ? '' : null }, `${o.level} (${o.upkeep} W)`)));
    s.addEventListener('change', () => { mgmt.upkeep[key] = s.value; persist(); });
    return el('div', { class: 'field' }, el('span', {}, label), s);
  };
  root.append(el('section', { class: 'card' },
    el('h3', {}, 'Upkeep'),
    upSel('Military Power', M.militaryPower, 'military'),
    upSel('Population Loyalty', M.populationLoyalty, 'population'),
    upSel('Lifestyle', M.lifestyle, 'lifestyle'),
    el('p', { class: 'small muted' }, mgmt.upkeepPaid ? 'Upkeep already paid this year.' : `Skill upkeep ${upkeep.skills} W · Total upkeep ${upkeep.total} W.`),
    el('button', { class: 'btn', disabled: mgmt.upkeepPaid ? '' : null, onclick: () => {
      house.wealth = Math.max(0, (house.wealth || 0) - upkeep.total);
      mgmt.upkeepPaid = true;
      log(house, `Paid upkeep: −${upkeep.total}W (Mil ${upkeep.military}/Pop ${upkeep.population}/Life ${upkeep.lifestyle}/Skills ${upkeep.skills}).`); persist();
    } }, `Pay upkeep (${upkeep.total} W)`)));

  // Ventures
  const ventureList = [
    ...M.constructionVentures.map((v) => ({ ...v, kind: 'construction' })),
    ...M.boonVentures.map((v) => ({ ...v, kind: 'boon' })),
  ];
  const vSel = el('select', { 'aria-label': 'Venture' },
    ...ventureList.map((v, i) => el('option', { value: String(i) }, `${v.kind === 'boon' ? '◆ ' : ''}${v.name} — ${v.cost}`)));
  root.append(el('section', { class: 'card' },
    el('h3', {}, `Ventures — ${mgmt.venturesUsed} used`),
    el('p', { class: 'small muted' }, `${M.ventureRules.perSession} ventures/session (buy more at ${M.ventureRules.buyExtraCost} W). Boons: success +1 status, failure −1.`),
    el('div', { class: 'field' }, el('span', {}, 'Venture'), vSel),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: () => openVenture(house, ventureList[+vSel.value], render) }, 'Attempt venture'),
      el('button', { class: 'btn secondary', onclick: () => { mgmt.venturesUsed = Math.max(0, mgmt.venturesUsed - 1); persist(); } }, 'Undo a use'))));

  // End of year
  root.append(el('section', { class: 'card' },
    el('h3', {}, 'End of year & downtime'),
    el('p', { class: 'small muted' }, `Stockpile caps Resources at ${M.endOfYear.resourceStockpile} (more with Storage Facilities). Holding 20+ Wealth risks theft.`),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn', onclick: async () => {
        if (!await confirmModal(`End year ${p.year}? Resources over ${M.endOfYear.resourceStockpile} are lost and a new year begins.`, { okLabel: 'End year' })) return;
        endYear(house); persist();
      } }, 'End year'),
      el('button', { class: 'btn secondary', onclick: () => rollWealthTheft(house, render) }, 'Roll Wealth theft'))));

  // Log
  if ((mgmt.log || []).length) {
    root.append(el('section', { class: 'card' },
      el('h3', {}, 'Session log'),
      el('ul', { class: 'char-list' },
        ...mgmt.log.slice(-12).reverse().map((e) => el('li', {}, el('span', { class: 'small' }, `Y${e.y}`), el('span', { class: 'small muted' }, ' ' + e.text))))));
  }
}

// Parse a simple venture cost like 'R12' or 'W5' into a pool deduction (else null → manual).
function parseCost(cost) {
  let m = /^R(\d+)$/.exec(cost); if (m) return { resources: +m[1] };
  m = /^W(\d+)$/.exec(cost); if (m) return { wealth: +m[1] };
  return null;
}

function openVenture(house, v, render) {
  const mgmt = house.management;
  const box = el('div', {});
  const close = modal(box, { labelledBy: 'v-title', onClose: () => render() });
  const guessSkill = SKILLS.find((s) => new RegExp(SKILL_NAME[s], 'i').test(v.skill)) || 'communicate';
  const cfg = { skill: guessSkill, drive: 7, bought: 0,
    required: Number.isFinite(v.successes) ? v.successes : 1, result: null };
  const cost = parseCost(v.cost);

  const set = (...k) => box.replaceChildren(...k.filter((x) => x != null));
  const draw = () => {
    const skillSel = el('select', { 'aria-label': 'House skill' },
      ...SKILLS.map((s) => el('option', { value: s, selected: cfg.skill === s ? '' : null }, `${SKILL_NAME[s]} ${house.skills ? house.skills[s] : 0}`)));
    skillSel.addEventListener('change', () => { cfg.skill = skillSel.value; draw(); });
    const driveIn = el('input', { type: 'number', min: '4', max: '8', value: String(cfg.drive), 'aria-label': 'Leader drive' });
    driveIn.addEventListener('change', () => { cfg.drive = clamp(+driveIn.value || 4, 4, 8); draw(); });
    const reqIn = el('input', { type: 'number', min: '0', max: '10', value: String(cfg.required), 'aria-label': 'Successes required' });
    reqIn.addEventListener('change', () => { cfg.required = Math.max(0, +reqIn.value || 0); });
    const tn = (house.skills ? house.skills[cfg.skill] : 0) + cfg.drive;
    const buyDice = M.ventureRules.extraDieCosts;
    const buyCost = buyDice.slice(0, cfg.bought).reduce((a, b) => a + b, 0);

    const bought = el('div', { class: 'stepper' },
      el('button', { class: 'step-btn', 'aria-label': 'Fewer dice', onclick: () => { if (cfg.bought > 0) { cfg.bought--; draw(); } } }, '−'),
      el('span', { class: 'stat-val' }, String(cfg.bought)),
      el('button', { class: 'step-btn', 'aria-label': 'More dice', onclick: () => { if (cfg.bought < 3) { cfg.bought++; draw(); } } }, '+'));

    const resultBlock = cfg.result ? (() => {
      const { values, successes, passed } = cfg.result;
      return el('div', {},
        el('p', { 'aria-live': 'polite' },
          el('span', { class: 'pill' }, `[${values.join(', ')}]`),
          el('span', { class: 'pill' }, `${successes}/${cfg.required} successes`),
          el('span', { class: 'pill' }, passed ? 'SUCCESS' : 'FAILURE')));
    })() : null;

    set(
      el('h2', { id: 'v-title' }, v.name),
      el('p', { class: 'small muted' }, `${v.kind === 'boon' ? 'Boon' : 'Construction'} · Cost ${v.cost} · Skill ${v.skill} · ${Number.isFinite(v.successes) ? v.successes + ' successes' : 'variable successes'}`),
      el('p', { class: 'small' }, v.desc),
      el('div', { class: 'field' }, el('span', {}, 'House skill'), skillSel),
      el('div', { class: 'field' }, el('span', {}, 'Leader drive (4–8)'), driveIn),
      el('div', { class: 'field' }, el('span', {}, 'Successes required'), reqIn),
      el('p', {}, el('span', { class: 'pill' }, `Target number ${tn}`), el('span', { class: 'pill' }, `${2 + cfg.bought} dice`)),
      el('div', { class: 'field' }, el('span', {}, `Buy dice (${buyCost} W)`), bought),
      resultBlock,
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => close() }, 'Close'),
        // A venture is a single test with dice bought up front — no free re-roll.
        cfg.result ? null : el('button', { class: 'btn', onclick: () => {
          const n = 2 + cfg.bought;
          const values = rollD20s(n);
          const successes = values.reduce((a, d) => a + (d <= tn ? (d === 1 ? 2 : 1) : 0), 0);
          cfg.result = { values, successes, passed: successes >= cfg.required };
          if (buyCost) house.wealth = Math.max(0, (house.wealth || 0) - buyCost);
          draw();
        } }, 'Roll venture'),
        cfg.result ? el('button', { class: 'btn', onclick: () => {
          // Apply: pay cost, adjust status for boons, count the venture.
          if (cost) {
            if (cost.wealth) house.wealth = Math.max(0, (house.wealth || 0) - cost.wealth);
            if (cost.resources) house.resources = Math.max(0, (house.resources || 0) - cost.resources);
          }
          if (v.kind === 'boon') mgmt.status = Math.max(0, mgmt.status + (cfg.result.passed ? 1 : -1));
          mgmt.venturesUsed += 1;
          log(house, `${cfg.result.passed ? '✓' : '✗'} ${v.name} (${cfg.result.successes}/${cfg.required})${cost ? ` · −${cost.wealth ? cost.wealth + 'W' : cost.resources + 'R'}` : ''}${v.kind === 'boon' ? ` · status ${cfg.result.passed ? '+1' : '−1'}` : ''}.`);
          saveHouse(house); close(); showToast(cfg.result.passed ? 'Venture succeeded' : 'Venture failed');
        } }, 'Apply result') : null));
  };
  draw();
}

function endYear(house) {
  const mgmt = house.management;
  const before = house.resources || 0;
  house.resources = Math.min(M.endOfYear.resourceStockpile, before);
  const lost = before - house.resources;
  mgmt.year += 1; mgmt.venturesUsed = 0; mgmt.incomeCollected = false; mgmt.upkeepPaid = false;
  log(house, `End of year ${mgmt.year - 1}${lost > 0 ? ` · lost ${lost}R over stockpile` : ''}. Year ${mgmt.year} begins.`);
}

async function rollWealthTheft(house, render) {
  if ((house.wealth || 0) < 20) { showToast('Theft only threatens a hoard of 20+ Wealth.'); return; }
  const roll = rollD20s(1)[0];
  const row = M.endOfYear.wealthTheft.find((w) => {
    const m = w.roll.match(/^(\d+)(?:[–-](\d+))?$/); const lo = +m[1], hi = m[2] ? +m[2] : lo;
    return roll >= lo && roll <= hi;
  });
  const lost = row ? row.lost : 0;
  house.wealth = Math.max(0, (house.wealth || 0) - lost);
  log(house, `Wealth theft roll ${roll} → −${lost}W.`);
  saveHouse(house); showToast(`Rolled ${roll}: lost ${lost} Wealth`); render();
}
