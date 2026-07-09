// screens.js — top-level screens: home, rules library, settings/about.

import { el, esc, capitalize } from './core.js';
import { Settings, TOGGLE_DEFS } from './settings.js';
import { showToast } from './ui.js';
import { getPools, listCharacters, getHouse, exportAll, importAll } from './store.js';
import { confirmModal } from './ui.js';
import { applyTheme } from './main.js';
import { startCharacterWizard, openPregenPicker, startHouseWizard } from './wizard.js';
import { slug, takeCiteTarget } from './cite.js';
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
  return el('section', { class: 'card', id: slug(title), dataset: { search: title.toLowerCase() } },
    el('h3', {}, title), node);
}
function table(headers, rows) {
  // Wrapped so a wide table scrolls inside its own container instead of overflowing the page (§5).
  return el('div', { class: 'table-scroll' },
    el('table', { class: 'rules' },
      el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', {}, h)))),
      el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c) => el('td', {}, c)))))));
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

  cards.push(ruleCard('Drive statements', el('div', {},
    el('p', { class: 'small' }, `Write a statement on your ${DATA.creation.driveStatements.onDrivesRated.join('/')}-rated drives. A statement must support an action to spend Determination on it.`),
    el('p', { class: 'small' }, el('strong', {}, 'When it conflicts: '),
      'the GM offers a Determination point — comply (take an immediate complication) or challenge (cross out the statement and lose that drive until it recovers). Writing a new statement in play grants +1 Determination.'),
    el('p', { class: 'small muted' }, el('strong', {}, 'Recovery: '),
      'at the end of a scene of reflection (if no Determination was spent or gained), or automatically between adventures — write a new statement, or −1 the challenged drive / +1 the next lowest (the statement is kept only if the drive stays ≥ 6).'))));

  cards.push(ruleCard('Complications', el('div', {},
    el('p', { class: 'small' }, DATA.complications.effects.join(' · ') +
      `. Buy one off for ${DATA.complications.buyOffThreat} Threat.`),
    el('p', { class: 'small muted' },
      Object.entries(DATA.complications.examplesBySkill)
        .filter(([, list]) => list && list.length)
        .map(([skill, list]) => `${capitalize(skill)}: ${list.join(', ')}`)
        .join(' — ')))));

  cards.push(ruleCard('Traits', el('div', {},
    el('p', { class: 'small' }, DATA.traitRule),
    el('p', { class: 'small muted' },
      `Complications add negative traits that auto-apply — +1 Difficulty on affected tests, or they gate an action entirely. ` +
      `Buy one off for ${DATA.complications.buyOffThreat} Threat, or an ally describes a fix and passes a test to clear it. ` +
      `Spend Momentum to create, alter, or remove a trait (see Momentum spends), or 1 Determination as a Declaration. ` +
      `A House may lend a trait to a character for a scene for 1 Momentum.`))));

  cards.push(ruleCard('Opposed tests', el('p', { class: 'small' },
    'The defender rolls first; their successes (+1 per defensive asset in their zone) set the attacker\'s Difficulty. ' +
    'Equal successes = the active character wins. If the attacker fails, the defender gains the shortfall as Momentum, spendable immediately.')));

  cards.push(ruleCard('Assists', el('p', { class: 'small' },
    `Each assistant rolls ${DATA.assists.dicePerAssistant}d20 with their own Skill + Drive (focuses apply; no bought dice). ` +
    `Their successes count only if the leader scores at least ${DATA.assists.leaderMustScore} success themselves. ` +
    `Assist dice follow all normal rules — a natural 1 still crits, a natural 20 still causes a complication (ruling #2).`)));

  cards.push(ruleCard('Extended tasks', el('p', { class: 'small' },
    `Each passed test scores ${DATA.extendedTask.basePoints} points + the Quality of an applicable asset. ` +
    'Momentum can add points; a complication can reduce them. Multiple characters may contribute to the same requirement.')));

  cards.push(ruleCard('Conflict types', table(['Type', 'Scale', 'Attack skill'],
    DATA.conflictTypes.map((c) => [c.name, c.scale, capitalize(c.attackSkill)]))));

  cards.push(ruleCard('Conflict turn order', el('div', {},
    el('p', { class: 'small' },
      `The GM picks the first actor (or spends ${DATA.initiative.gmSeizeFirstActionThreat} Threat to seize it). After each turn initiative passes to an opposing side. ` +
      `One action per turn — move one zone, attack, or create a trait/asset; ${DATA.movement.extraZoneMomentum} Momentum buys an extra zone or asset move.`),
    el('p', { class: 'small' },
      `Keep the Initiative: ${DATA.initiative.keepInitiativeCost} Momentum/Threat lets your side act again (that ally at +${DATA.initiative.keepInitiativePenalty} Difficulty), never twice in a row. The last actor of a round opens the next.`),
    el('p', { class: 'small muted' },
      `Subtle move (Difficulty ${DATA.movement.subtleMoveDifficulty}): no reactions, Keep the Initiative costs 0. Bold move (Difficulty ${DATA.movement.boldMoveDifficulty}): force an enemy asset to move a zone. ${DATA.movement.armorNote}`))));

  cards.push(ruleCard('Defeat & recovery', el('p', { class: 'small' },
    `Minor characters lose one contest and are out. Others have a defeat track (requirement ≈ skill + defensive Quality); each hit scores 2 + asset Quality. ` +
    `Resist Defeat once per scene (1 Momentum + attacker's asset Quality, suffer a complication). Lasting defeat costs the attacker 2 Momentum. ` +
    `Recovery: extended task 4 + Quality (normal) or a Difficulty 2 stabilize (lasting).`)));

  cards.push(ruleCard('Scene & adventure lifecycle', el('div', {},
    el('h4', {}, 'End of scene'),
    el('ul', {}, ...DATA.lifecycle.sceneEnd.map((x) => el('li', { class: 'small' }, x))),
    el('h4', {}, 'Start of adventure'),
    el('ul', {}, ...DATA.lifecycle.adventureStart.map((x) => el('li', { class: 'small' }, x))),
    el('h4', {}, 'End of adventure'),
    el('ul', {}, ...DATA.lifecycle.adventureEnd.map((x) => el('li', { class: 'small' }, x))))));

  cards.push(ruleCard('Focus examples', el('div', {},
    el('p', { class: 'small muted' }, 'A focus widens your critical range on matching tests to any die ≤ your Skill rating. These are the book’s examples per skill; * = specify a specialty.'),
    ...DATA.skills.map((s) => el('details', { class: 'tips' },
      el('summary', {}, `${s.name} (${DATA.focusExamples[s.id].length})`),
      el('ul', {}, ...DATA.focusExamples[s.id].map((f) =>
        el('li', { class: 'small' }, el('strong', {}, f.name), f.desc ? ` — ${f.desc}` : ''))))))));

  cards.push(ruleCard('Advancement', el('div', {},
    table(['Advance', 'Cost'], Object.values(DATA.advancement.costs).map((c) => [c.name, c.cost])),
    el('p', { class: 'small' },
      el('strong', {}, 'Earn: '),
      DATA.advancement.earn.map((e) => `${e.trigger} — ${e.desc} (${e.points})`).join(' · ')),
    el('p', { class: 'small muted' },
      `Max ${DATA.advancement.maxPerAdventure} advance, purchased between adventures. ` +
      DATA.advancement.drivesChangeNote + ' ' + DATA.advancement.retraining))));

  cards.push(ruleCard('Assets & wealth', el('div', {},
    el('p', { class: 'small' },
      `Assets are tangible or intangible, each with a Quality rating. A character keeps at most ${DATA.assetRules.permanentCap} permanent assets (the Specialist talent raises the cap). Assets created in play default to Quality ${DATA.assetRules.createdInPlayQuality}.`),
    el('p', { class: 'small muted' }, DATA.assetNote),
    el('h4', {}, 'Wealth ladder'),
    el('p', { class: 'small' }, DATA.wealth.purchaseRule),
    table(['Tier', 'Examples'], DATA.wealth.ladder.map((w) => [String(w.tier), w.examples])))));

  cards.push(ruleCard('Powers', el('p', { class: 'small' },
    'Voice, Mentat computation, prana-bindu conditioning, and prescience are not a separate subsystem — they are talents with embedded dice effects, resolved in the roller ' +
    '(e.g. Voice spends Threat for automatic successes; Mentat Discipline forces a die to count as a 1). Every talent with a dice effect is playable “tap to use” in the roll dialog.')));

  cards.push(ruleCard('Supporting characters', el('div', {},
    el('p', { class: 'small' }, DATA.supportingCharacters.intro),
    ...['minor', 'notable'].map((k) => {
      const t = DATA.supportingCharacters.types[k];
      const d = t.drive || t.drives;
      return el('details', { class: 'tips' },
        el('summary', {}, `${t.label} — ${t.concept}`),
        el('p', { class: 'small' }, el('strong', {}, 'Cost: '), t.cost),
        el('p', { class: 'small muted' }, el('strong', {}, 'Limit: '), t.limit),
        el('p', { class: 'small' }, el('strong', {}, 'Traits: '), t.traits),
        el('p', { class: 'small' }, el('strong', {}, 'Skills: '), t.skills.join('/') + (t.skillsUpgrade ? ` · ${t.skillsUpgrade}` : '')),
        el('p', { class: 'small' }, el('strong', {}, 'Drives: '), d.note),
        el('p', { class: 'small' }, el('strong', {}, 'Focuses: '), t.focuses.note),
        el('p', { class: 'small' }, el('strong', {}, 'Talents: '), t.talents.note));
    }),
    el('p', { class: 'small muted' }, el('strong', {}, 'Uncontrolled characters: '),
      DATA.supportingCharacters.uncontrolled.note),
    el('ul', {}, ...DATA.supportingCharacters.uncontrolled.actions.map((a) =>
      el('li', { class: 'small' }, el('strong', {}, a.name + ': '), a.desc))),
    el('p', { class: 'small muted' }, DATA.supportingCharacters.uncontrolled.onDefeat))));

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
    el('div', { class: 'table-scroll' }, el('table', { class: 'rules' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Highest drive'), el('th', {}, 'Ambitions tend toward…'))),
      el('tbody', {}, ...DATA.drives.map((d) =>
        el('tr', {}, el('td', {}, el('strong', {}, d.name)), el('td', {}, DATA.creationGuidance.ambitionByDrive[d.id])))))),
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

  // T38 citation: if a rules link brought us here, scroll its card into view + highlight it.
  const target = takeCiteTarget();
  if (target) {
    requestAnimationFrame(() => {
      const card = document.getElementById(target);
      if (!card) return;
      card.scrollIntoView({ block: 'center' });
      card.classList.add('cited');
      setTimeout(() => card.classList.remove('cited'), 2200);
    });
  }
}

// ---------- Data backup (JSON export / import) ----------
function dataCard() {
  const doExport = () => {
    const bundle = exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = el('a', { href: url, download: `imperium-backup-${stamp}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded');
  };

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); }
    catch { showToast('That file is not valid JSON.'); return; }
    if (!await confirmModal('Importing replaces all local characters, House, and pools. Continue?',
      { okLabel: 'Import' })) return;
    try {
      const r = importAll(data);
      showToast(`Imported ${r.characters} character${r.characters === 1 ? '' : 's'}${r.house ? ' + House' : ''}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) { showToast(e.message || 'Import failed.'); }
  });

  return el('section', { class: 'card' },
    el('h3', {}, 'Backup & transfer'),
    el('p', { class: 'small muted' },
      'Export all characters, your House, and pools to a JSON file, or import a backup to this device. Import replaces local data.'),
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: doExport }, 'Export JSON'),
      el('button', { class: 'btn secondary', onclick: () => fileInput.click() }, 'Import JSON'),
      fileInput));
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
    dataCard(),
    el('section', { class: 'card' },
      el('h3', {}, 'About'),
      el('p', { class: 'small muted' },
        'Imperium Player is a personal play aid built from the owner\'s own rulebooks for Dune: Adventures in the Imperium (Modiphius 2d20). ' +
        'It contains paraphrased rules mechanics only — no book text, art, or logos. If you publish or distribute this app, licensing is your responsibility.')),
  );
}
