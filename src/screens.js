// screens.js — top-level screens: home, rules library, settings/about.

import { el, esc, capitalize } from './core.js';
import { Settings, TOGGLE_DEFS } from './settings.js';
import { showToast } from './ui.js';
import { getPools, listCharacters, getHouse } from './store.js';
import { applyTheme } from './main.js';
import { startCharacterWizard, openPregenPicker, startHouseWizard } from './wizard.js';
import { DATA } from '../data.js';
import { EXPANSION as GREAT_GAME } from '../data-great-game.js';

const HOUSE_TYPE_NAME = Object.fromEntries(DATA.houseTypes.map((t) => [t.id, t.name]));
const SKILL_NAME = Object.fromEntries(DATA.skills.map((s) => [s.id, s.name]));
const DRIVE_NAME = Object.fromEntries(DATA.drives.map((d) => [d.id, d.name]));

// ---------- Home ----------
export function renderHome(root) {
  const pools = getPools();
  const chars = listCharacters();
  const house = getHouse();

  root.append(
    el('section', { class: 'card' },
      el('h2', {}, 'Welcome, Agent of the Imperium'),
      el('p', { class: 'muted' },
        'Your companion for Dune: Adventures in the Imperium — character creation, in-play tracking, and a native 2d20 dice engine.'),
      el('p', {},
        el('span', { class: 'pill' }, `Momentum ${pools.momentum}/${DATA.momentumRules.cap}`),
        el('span', { class: 'pill' }, `Threat ${pools.threat}`),
        el('span', { class: 'pill' }, `${chars.length} character${chars.length === 1 ? '' : 's'}`)),
    ),

    houseCard(house),

    el('section', { class: 'card' },
      el('h3', {}, chars.length ? 'Your characters' : 'Create a character'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: startCharacterWizard }, '+ New character'),
        el('button', { class: 'btn secondary', onclick: openPregenPicker }, 'Play an iconic')),
      chars.length
        ? el('ul', { class: 'char-list' }, ...chars.map((c) =>
            el('li', {},
              el('a', { href: '#/sheet' }, c.identity.name || 'Unnamed'),
              c.identity.archetype ? el('span', { class: 'small muted' }, ' · ' + capitalize(c.identity.archetype)) : null)))
        : el('p', { class: 'small muted' }, 'Build a character with the 8-step wizard, or jump in as an iconic pregen.'),
    ),
  );
}

/** The House is a shared, group-level entity: usually one person builds it, others join.
 *  Recommend it first when none exists, but never gate character creation behind it. */
function houseCard(house) {
  if (!house) {
    return el('section', { class: 'card' },
      el('h3', {}, 'Your House'),
      el('p', { class: 'small muted' },
        'The House is your group’s shared foundation — normally one person creates it and everyone else joins. Recommended first, but you can skip and add it later.'),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn', onclick: startHouseWizard }, 'Create your House')));
  }
  const domainNames = (house.domains || [])
    .map((d) => (DATA.houseDomains.find((x) => x.id === d.id) || {}).name)
    .filter(Boolean).join(', ');
  return el('section', { class: 'card' },
    el('h3', {}, house.name || 'Your House'),
    el('p', { class: 'small muted' },
      [HOUSE_TYPE_NAME[house.type], domainNames].filter(Boolean).join(' · ') || 'House'),
    house.resources != null
      ? el('p', {},
          el('span', { class: 'pill' }, `${house.resources} Resources`),
          el('span', { class: 'pill' }, `${house.wealth} Wealth`))
      : null,
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: startHouseWizard }, 'Edit House')));
}

// ---------- Rules library (searchable; renders extracted 0a tables) ----------
function ruleCard(title, node) {
  return el('section', { class: 'card', dataset: { search: title.toLowerCase() } },
    el('h3', {}, title), node);
}
function table(headers, rows) {
  return el('table', { class: 'rules' },
    el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', {}, h)))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c) => el('td', {}, c)))))
  );
}

export function renderRules(root) {
  const search = el('input', {
    type: 'search', placeholder: 'Search rules…', 'aria-label': 'Search rules',
  });
  const cards = [];

  cards.push(ruleCard('Skills', el('div', {},
    el('p', { class: 'small muted' }, 'Five skills, each rated 4–8.'),
    ...DATA.skills.map((s) => el('p', { class: 'small' },
      el('strong', {}, s.name + ': '), s.desc)))));

  cards.push(ruleCard('Building a character', el('div', {},
    el('p', { class: 'small muted' }, 'The wizard walks these steps; here are the rules behind each.'),
    ...Object.entries(DATA.creationGuidance.stepNotes).map(([step, note]) => el('p', { class: 'small' },
      el('strong', {}, capitalize(step) + ': '), note)))));

  cards.push(ruleCard('Drives', el('div', {},
    el('p', { class: 'small muted' }, 'Five drives, assigned 8/7/6/5/4 at creation. Your target number is Skill + Drive.'),
    ...DATA.drives.map((d) => el('p', { class: 'small' },
      el('strong', {}, d.name + ': '), d.desc)))));

  cards.push(ruleCard('Choosing drives', el('div', {},
    el('p', { class: 'small' }, DATA.creationGuidance.driveRanking.intro),
    el('p', { class: 'small muted' }, 'The ten comparisons:'),
    el('ul', {}, ...DATA.creationGuidance.driveRanking.pairs.map(([a, b]) =>
      el('li', { class: 'small' }, `${DRIVE_NAME[a]} or ${DRIVE_NAME[b]}?`))))));

  cards.push(ruleCard('Creating a character in play', el('div', {},
    el('p', { class: 'small' }, DATA.creationInPlay.intro),
    el('p', { class: 'small muted' }, 'Each remaining choice is a limited-use “define” option:'),
    table(['Define', 'Uses', 'How it works'],
      DATA.creationInPlay.options.map((o) => [o.name, String(o.uses), o.desc])),
    el('h4', {}, 'Defining a drive'),
    table(['Importance', 'Rating', 'Meaning'],
      DATA.creationInPlay.driveImportance.map((d) => [d.rank, String(d.rating), d.meaning])),
    el('ul', {}, ...DATA.creationInPlay.notes.map((n) => el('li', { class: 'small muted' }, n))))));

  cards.push(ruleCard('Skill test basics', el('p', { class: 'small' },
    `Roll ${DATA.dicePool.base}d20 (max ${DATA.dicePool.max}). Each die ≤ Skill + Drive scores 1 success. ` +
    `Meet the Difficulty to succeed; extra successes become Momentum. A natural 1 scores 2 successes; ` +
    `with an applicable focus, any die ≤ the Skill rating does. Each natural 20 causes a complication.`)));

  cards.push(ruleCard('Difficulty ladder', table(['#', 'Name', 'Example'],
    DATA.difficulty.map((d) => [String(d.value), d.name, d.example]))));

  cards.push(ruleCard('Buying extra dice', el('p', { class: 'small' },
    `Up to ${DATA.dicePool.buyMax} extra d20s before rolling: ` +
    DATA.dicePool.buyCosts.map((c, i) => `${i + 1}${['st', 'nd', 'rd'][i]} costs ${c}`).join(', ') +
    ` Momentum — or add the same amount to the GM's Threat instead.`)));

  cards.push(ruleCard('Momentum spends', table(['Spend', 'Cost', 'Effect'],
    DATA.momentumSpends.map((s) => [s.name, s.cost, s.desc]))));

  cards.push(ruleCard('Threat spends (GM)', table(['Spend', 'Cost', 'Effect'],
    DATA.threatSpends.map((s) => [s.name, s.cost, s.desc]))));

  cards.push(ruleCard('Determination', el('div', {},
    el('p', { class: 'small' }, `Start each adventure with ${DATA.determination.startPerAdventure}; pool cap ${DATA.determination.cap}. A drive statement must support the action to spend.`),
    table(['Use', 'Effect'], DATA.determination.spends.map((s) => [s.name, s.desc])),
    el('p', { class: 'small muted' }, 'Earning: ' + DATA.determination.earn.map((e) => e.desc).join(' · ')))));

  cards.push(ruleCard('Complications', el('div', {},
    el('p', { class: 'small' }, DATA.complications.effects.join(' · ') +
      `. Buy one off for ${DATA.complications.buyOffThreat} Threat.`),
    el('p', { class: 'small muted' },
      Object.entries(DATA.complications.examplesBySkill)
        .filter(([, list]) => list && list.length)
        .map(([skill, list]) => `${capitalize(skill)}: ${list.join(', ')}`)
        .join(' — ')))));

  cards.push(ruleCard('Opposed tests', el('p', { class: 'small' },
    'The defender rolls first; their successes (+1 per defensive asset in their zone) set the attacker\'s Difficulty. ' +
    'Equal successes = the active character wins. If the attacker fails, the defender gains the shortfall as Momentum, spendable immediately.')));

  cards.push(ruleCard('Extended tasks', el('p', { class: 'small' },
    `Each passed test scores ${DATA.extendedTask.basePoints} points + the Quality of an applicable asset. ` +
    'Momentum can add points; a complication can reduce them. Multiple characters may contribute to the same requirement.')));

  cards.push(ruleCard('Conflict types', table(['Type', 'Scale', 'Attack skill'],
    DATA.conflictTypes.map((c) => [c.name, c.scale, capitalize(c.attackSkill)]))));

  cards.push(ruleCard('Defeat & recovery', el('p', { class: 'small' },
    `Minor characters lose one contest and are out. Others have a defeat track (requirement ≈ skill + defensive Quality); each hit scores 2 + asset Quality. ` +
    `Resist Defeat once per scene (1 Momentum + attacker's asset Quality, suffer a complication). Lasting defeat costs the attacker 2 Momentum. ` +
    `Recovery: extended task 4 + Quality (normal) or a Difficulty 2 stabilize (lasting).`)));

  cards.push(ruleCard('Focus examples', el('div', {},
    el('p', { class: 'small muted' }, 'A focus widens your critical range on matching tests to any die ≤ your Skill rating. These are the book’s examples per skill; * = specify a specialty.'),
    ...DATA.skills.map((s) => el('details', { class: 'tips' },
      el('summary', {}, `${s.name} (${DATA.focusExamples[s.id].length})`),
      el('ul', {}, ...DATA.focusExamples[s.id].map((f) =>
        el('li', { class: 'small' }, el('strong', {}, f.name), f.desc ? ` — ${f.desc}` : ''))))))));

  cards.push(ruleCard('Advancement', el('div', {},
    table(['Advance', 'Cost'], Object.values(DATA.advancement.costs).map((c) => [c.name, c.cost])),
    el('p', { class: 'small muted' },
      `Max ${DATA.advancement.maxPerAdventure} advance per adventure. Earn: ` +
      DATA.advancement.earn.map((e) => `${e.desc} (${e.points})`).join(' · ') +
      '. Drives never advance by points. Retraining: halve a cost (round up) by dropping a skill point (min 4), focus, or talent.'))));

  cards.push(ruleCard('Archetypes', el('div', {},
    el('p', { class: 'small muted' }, `${DATA.archetypes.length} archetypes. Each sets a primary (6) and secondary (5) skill and suggests 2 focuses + 1 talent. Drive hints are guidance only.`),
    ...DATA.archetypes.map((a) => el('details', { class: 'tips' },
      el('summary', {}, `${a.name} — ${SKILL_NAME[a.primary]}/${SKILL_NAME[a.secondary]}`),
      el('p', { class: 'small' }, a.desc),
      el('p', { class: 'small muted' },
        `Focuses: ${a.focuses.join(', ')} · Talent: ${a.talents.join(', ')} · Drives: ${(a.driveSuggestions || []).map((d) => DRIVE_NAME[d]).join(', ')}`))))));

  cards.push(ruleCard('Faction templates', el('div', {},
    el('p', { class: 'small' }, DATA.factionIntro),
    ...DATA.factionTemplates.map((f) => el('details', { class: 'tips' },
      el('summary', {}, f.name),
      el('p', { class: 'small' }, f.desc),
      el('p', { class: 'small muted' },
        `Trait: ${f.trait} · Mandatory: ${f.mandatoryTalents.mode === 'all' ? '' : 'one of '}${f.mandatoryTalents.options.join(', ')}` +
        `${f.note ? ' · ' + f.note : ''}`))))));

  cards.push(ruleCard('Ambition', el('div', {},
    el('p', { class: 'small' }, DATA.creationGuidance.ambitionIntro),
    el('p', { class: 'small' }, DATA.creationGuidance.ambitionRule),
    el('table', { class: 'rules' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Highest drive'), el('th', {}, 'Ambitions tend toward…'))),
      el('tbody', {}, ...DATA.drives.map((d) =>
        el('tr', {}, el('td', {}, el('strong', {}, d.name)), el('td', {}, DATA.creationGuidance.ambitionByDrive[d.id]))))),
    el('p', { class: 'small muted' }, DATA.creationGuidance.ambitionChangeRule))));

  cards.push(ruleCard('Sandworm riding', table(['Worm', 'Extended task requirement'],
    DATA.sandwormRiding.map((w) => [w.size, String(w.requirement)]))));

  cards.push(ruleCard('Desert hazards', table(['Hazard', 'Effect'],
    DATA.desertHazards.map((h) => [h.name, h.effect]))));

  // House domains + starting Threat are Core narrative content — always shown.
  cards.push(ruleCard('House domains', el('div', {},
    el('p', { class: 'small' }, DATA.houseDomainGuidance.intro),
    el('p', { class: 'small' }, el('strong', {}, 'Primary: '), DATA.houseDomainGuidance.primary),
    el('p', { class: 'small' }, el('strong', {}, 'Secondary: '), DATA.houseDomainGuidance.secondary),
    el('p', { class: 'small muted' }, 'Each area of expertise is divided into five sections: ' +
      Object.entries(DATA.houseSubtypeDefs).map(([k, v]) => `${capitalize(k)} — ${v}`).join(' ')),
    ...DATA.houseDomains.map((dom) => {
      const d = DATA.houseDomainDetails[dom.id];
      return el('details', { class: 'tips' },
        el('summary', {}, dom.name),
        el('p', { class: 'small' }, d.desc),
        ...Object.entries(d.examples).map(([st, list]) => el('p', { class: 'small muted' },
          el('strong', {}, capitalize(st) + ': '), list.join(', '))));
    }))));

  cards.push(ruleCard('House type & Threat', el('div', {},
    el('p', { class: 'small' }, DATA.houseStartingThreatNote),
    table(['House type', 'Threat / player', 'Starting domains'],
      DATA.houseTypes.map((t) => [t.name, String(DATA.houseStartingThreat[t.id]),
        `${DATA.houseDomainCounts[t.id].primary}P / ${DATA.houseDomainCounts[t.id].secondary}S`])),
    el('p', { class: 'small muted' }, DATA.houseStartingDomainsNote),
    Settings.greatGame()
      ? el('p', { class: 'small muted' }, `Great Game adds the House skill values (${GREAT_GAME.houseManagement.skillArrays.major.join('/')} for a Major) and the domain income table.`)
      : null)));

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    cards.forEach((c) => {
      const hit = !q || c.textContent.toLowerCase().includes(q);
      c.style.display = hit ? '' : 'none';
    });
  });

  root.append(el('div', { class: 'card' }, search), ...cards);
}

// ---------- Settings / About ----------
export function renderSettings(root) {
  // Theme picker
  const themeSel = el('select', { 'aria-label': 'Theme' },
    ...['system', 'light', 'dark'].map((t) =>
      el('option', { value: t, selected: Settings.theme() === t ? '' : null }, capitalize(t))));
  themeSel.addEventListener('change', () => {
    Settings.set('theme', themeSel.value);
    applyTheme();
    showToast(`Theme: ${themeSel.value}`);
  });

  const toggleRows = TOGGLE_DEFS.map((def) => {
    const box = el('input', { type: 'checkbox', id: `tg-${def.flag}` });
    box.checked = !!Settings.get(def.flag);
    box.addEventListener('change', () => {
      Settings.set(def.flag, box.checked);
      showToast(`${def.label} ${box.checked ? 'on' : 'off'}`);
      // Router re-renders nav on next hashchange; force it for gated tabs:
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    return el('div', { class: 'toggle-row' },
      el('label', { for: `tg-${def.flag}` },
        el('div', {}, def.label),
        el('div', { class: 'small muted' }, def.desc)),
      box);
  });

  root.append(
    el('section', { class: 'card' },
      el('h2', {}, 'Settings'),
      el('div', { class: 'toggle-row' },
        el('label', {}, el('div', {}, 'Theme'), el('div', { class: 'small muted' }, 'System follows your device.')),
        themeSel)),
    el('section', { class: 'card' }, el('h3', {}, 'Content & surfaces'), ...toggleRows),
    el('section', { class: 'card' },
      el('h3', {}, 'About'),
      el('p', { class: 'small muted' },
        'Imperium Player is a personal play aid built from the owner\'s own rulebooks for Dune: Adventures in the Imperium (Modiphius 2d20). ' +
        'It contains paraphrased rules mechanics only — no book text, art, or logos. If you publish or distribute this app, licensing is your responsibility.')),
  );
}
