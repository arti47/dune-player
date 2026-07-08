// tests/run.mjs — Phase 0 regression checks (static + data invariants; no browser
// needed yet — the headless Playwright harness lands in Hardening).
// Run: npm test

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function check(name, ok, detail = '') {
  if (ok) { console.log(`  ✓ ${name}`); }
  else { failures++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('— File presence —');
const SHELL_FILES = [
  'index.html', 'styles.css', 'manifest.json', 'service-worker.js', 'icon.svg',
  'data.js', 'data-npcs.js', 'data-pregens.js',
  'data-sand-and-dust.js', 'data-great-game.js', 'data-power-and-pawns.js',
  'data-masters-of-dune.js', 'data-fall-of-imperium.js',
  'firebase-config.js', 'database.rules.json', 'README.md', 'CLAUDE.md',
  'src/core.js', 'src/ui.js', 'src/rules.js', 'src/derived.js', 'src/settings.js',
  'src/store.js', 'src/sync.js', 'src/wizard.js', 'src/roller.js', 'src/cite.js', 'src/sheet.js',
  'src/combat.js', 'src/gm.js', 'src/screens.js', 'src/router.js', 'src/main.js',
];
for (const f of SHELL_FILES) check(f, existsSync(join(root, f)));

console.log('— Service worker cache discipline —');
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
check('CACHE_VERSION present', /CACHE_VERSION = 'imperium-v[\d.]+'/.test(sw));
for (const f of SHELL_FILES.filter((f) => !['service-worker.js', 'database.rules.json', 'README.md', 'CLAUDE.md'].includes(f) && !f.startsWith('tests'))) {
  check(`SW shell lists ${f}`, sw.includes(`'./${f}'`));
}

console.log('— Data invariants (ledger 0a) —');
const { DATA } = await import(join(root, 'data.js'));
check('5 skills', DATA.skills.length === 5);
check('5 drives', DATA.drives.length === 5);
check('Every skill has a substantive description (≥40 chars)',
  DATA.skills.every((s) => typeof s.desc === 'string' && s.desc.length >= 40));
check('Discipline description covers authority over others (not just self-control)',
  /authority|others|influence/i.test(DATA.skills.find((s) => s.id === 'discipline').desc));
check('Every drive has a substantive description (≥40 chars)',
  DATA.drives.every((d) => typeof d.desc === 'string' && d.desc.length >= 40));
check('Power drive description names the ego',
  /ego/i.test(DATA.drives.find((d) => d.id === 'power').desc));
check('Focus examples: battle 13', DATA.focusExamples.battle.length === 13);
check('Focus examples: communicate 19', DATA.focusExamples.communicate.length === 19);
check('Focus examples: discipline 9', DATA.focusExamples.discipline.length === 9);
check('Focus examples: move 14', DATA.focusExamples.move.length === 14);
check('Focus examples: understand 27', DATA.focusExamples.understand.length === 27);
check('Difficulty ladder 0–5', DATA.difficulty.length === 6 &&
  DATA.difficulty.every((d, i) => d.value === i));
check('Dice pool 2 base / 5 max / buy 1,2,3',
  DATA.dicePool.base === 2 && DATA.dicePool.max === 5 &&
  JSON.stringify(DATA.dicePool.buyCosts) === '[1,2,3]');
check('Momentum cap 6, decay 1/scene',
  DATA.momentumRules.cap === 6 && DATA.momentumRules.sceneDecay === 1);
check('Momentum spends ≥ 9', DATA.momentumSpends.length >= 9);
check('Threat spends ≥ 7', DATA.threatSpends.length >= 7);
check('Determination: start 1, cap 3, 4 spends',
  DATA.determination.startPerAdventure === 1 && DATA.determination.cap === 3 &&
  DATA.determination.spends.length === 4);
check('Complication buy-off = 2 Threat', DATA.complications.buyOffThreat === 2);
check('Opposed test: defender first, tie to active',
  DATA.opposedTest.defenderRollsFirst === true && DATA.opposedTest.tieGoesToActive === true);
check('Extended task base 2 points', DATA.extendedTask.basePoints === 2);
check('5 conflict types', DATA.conflictTypes.length === 5);
check('Conflict attack skills duel/skirmish/warfare=battle, espionage=move, intrigue=communicate',
  DATA.conflictTypes.filter((c) => c.attackSkill === 'battle').length === 3 &&
  DATA.conflictTypes.find((c) => c.id === 'espionage')?.attackSkill === 'move' &&
  DATA.conflictTypes.find((c) => c.id === 'intrigue')?.attackSkill === 'communicate');
check('Asset cap 5, created-in-play Quality 0',
  DATA.assetRules.permanentCap === 5 && DATA.assetRules.createdInPlayQuality === 0);
check('Advancement: max 1/adventure, drives never by points',
  DATA.advancement.maxPerAdventure === 1 && DATA.advancement.drivesNeverAdvanceByPoints === true);
check('Advancement earn triggers named (Pain/Failure/Peril/Ambition/Impressing the Group)',
  ['Pain', 'Failure', 'Peril', 'Ambition', 'Impressing the Group']
    .every((t) => DATA.advancement.earn.some((e) => e.trigger === t)) &&
  DATA.advancement.earn.every((e) => typeof e.trigger === 'string' && e.trigger.length));
check('Supporting characters: minor skills 6/5/5/4/4, drive 4–8 typ 5; notable skills 7/6/5/5/4, drives 7&6',
  (() => {
    const sc = DATA.supportingCharacters;
    const m = sc.types.minor, n = sc.types.notable;
    return JSON.stringify(m.skills) === '[6,5,5,4,4]' &&
      m.drive.typical === 5 && m.drive.range[0] === 4 && m.drive.range[1] === 8 &&
      JSON.stringify(n.skills) === '[7,6,5,5,4]' &&
      JSON.stringify(n.drives.high) === '[7,6]' && n.drives.rest === 5;
  })());
check('Supporting characters: 5 uncontrolled actions incl. Sacrifice; notable limit 5/adventure',
  DATA.supportingCharacters.uncontrolled.actions.length === 5 &&
  DATA.supportingCharacters.uncontrolled.actions.some((a) => a.name === 'Sacrifice') &&
  /5/.test(DATA.supportingCharacters.types.notable.limit));
check('Sandworm riding 4/8/12/16',
  JSON.stringify(DATA.sandwormRiding.map((w) => w.requirement)) === '[4,8,12,16]');
check('Lifecycle: scene end includes momentum decay',
  DATA.lifecycle.sceneEnd.some((s) => /Momentum/i.test(s)));

console.log('— Data invariants (ledger 0b) —');
check('20 archetypes (incl. Smuggler + Strategist, added from owner’s book)',
  DATA.archetypes.length === 20 &&
  DATA.archetypes.some((a) => a.id === 'smuggler') &&
  DATA.archetypes.some((a) => a.id === 'strategist'));
check('Smuggler = Move/Battle (Pilot, Unobtrusive · Subtle Step); Strategist = Understand/Battle (Kanly, Strategy · Master-at-Arms)',
  (() => { const sm = DATA.archetypes.find((a) => a.id === 'smuggler');
    const st = DATA.archetypes.find((a) => a.id === 'strategist');
    return sm.primary === 'move' && sm.secondary === 'battle' && sm.talents[0] === 'Subtle Step' &&
      st.primary === 'understand' && st.secondary === 'battle' && st.talents[0] === 'Master-at-Arms'; })());
check('Every archetype has primary+secondary skill ids',
  DATA.archetypes.every((a) => DATA.skills.some((s) => s.id === a.primary) &&
                               DATA.skills.some((s) => s.id === a.secondary) &&
                               a.primary !== a.secondary));
check('Every archetype suggests ≥1 focus and ≥1 talent',
  DATA.archetypes.every((a) => a.focuses.length >= 1 && a.talents.length >= 1));
check('Every archetype has a description + drive suggestions (valid drive ids)',
  DATA.archetypes.every((a) => a.desc && a.desc.length &&
    Array.isArray(a.driveSuggestions) && a.driveSuggestions.length &&
    a.driveSuggestions.every((d) => DATA.drives.some((x) => x.id === d))));
check('Every faction suggested-archetype now resolves to a real archetype',
  DATA.factionTemplates.every((f) => f.suggestedArchetypes.every((n) =>
    DATA.archetypes.some((a) => a.name === n))));
// Wizard suggestion pre-fill needs: 2 focuses (primary/secondary), ≥1 talent, 2 drive suggestions.
check('Every archetype supplies exactly 2 suggested focuses + a talent + 2 drive suggestions (wizard pre-fill)',
  DATA.archetypes.every((a) => a.focuses.length === 2 && a.talents.length >= 1 &&
    a.driveSuggestions.length >= 2));
check('Every faction template has a description; faction intro present',
  typeof DATA.factionIntro === 'string' && DATA.factionIntro.length &&
  DATA.factionTemplates.every((f) => f.desc && f.desc.length));
check('5 faction templates, each with trait + mandatory talents',
  DATA.factionTemplates.length === 5 &&
  DATA.factionTemplates.every((t) => t.trait && t.mandatoryTalents.options.length >= 1));
check('Creation constants: 6/5/4 +5 cap 8; drives 8/7/6/5/4; 4 focuses; 3 talents; 3 assets',
  DATA.creation.skillArray.primary === 6 && DATA.creation.skillArray.freePoints === 5 &&
  DATA.creation.skillArray.cap === 8 &&
  JSON.stringify(DATA.creation.driveArray) === '[8,7,6,5,4]' &&
  DATA.creation.focuses.count === 4 && DATA.creation.talents.count === 3 &&
  DATA.creation.assets.count === 3 && DATA.creation.assets.minTangible === 1);

console.log('— Data invariants (ledger 0c) —');
check('55 talents (real count)', DATA.talents.length === 55);
check('Every talent has a name and effect', DATA.talents.every((t) => t.name && t.effect));
check('Every talent has an auto descriptor or explicit null',
  DATA.talents.every((t) => 'auto' in t));
check('Faction talents: BG 4, Mentat 5, Suk 3, Guild 3, Fremen 1',
  DATA.talents.filter((t) => t.faction === 'beneGesserit').length === 4 &&
  DATA.talents.filter((t) => t.faction === 'mentat').length === 5 &&
  DATA.talents.filter((t) => t.faction === 'sukDoctor').length === 3 &&
  DATA.talents.filter((t) => t.faction === 'guildAgent').length === 3 &&
  DATA.talents.filter((t) => t.faction === 'fremen').length === 1);
check('Voice: max 3 auto-successes via Threat',
  DATA.talents.find((t) => t.name === 'Voice')?.auto.max === 3);
check('Specialist: +2 cap, category-restricted, repeatable',
  (() => { const s = DATA.talents.find((t) => t.name === 'Specialist');
    return s?.auto.bonus === 2 && s.repeatable === true && s.pick === 'assetCategory'; })());
check('Every archetype-suggested talent resolves to a catalog entry (after normalization)',
  DATA.archetypes.every((a) => a.talents.every((n) =>
    DATA.talents.some((t) => n.replace(/\s*\(.*\)$/, '').toLowerCase() === t.name.toLowerCase()))));
check('Faction mandatory talents resolve to catalog entries (Foreknowledge = known gap)',
  DATA.factionTemplates.every((f) => f.mandatoryTalents.options.every((n) =>
    n === 'Foreknowledge' ||
    DATA.talents.some((t) => n.replace(/\s*\(.*\)$/, '').toLowerCase() === t.name.toLowerCase()))));

console.log('— Data invariants (ledger 0d: assets + wealth) —');
check('85 assets (real count)', DATA.assets.length === 85);
const ASSET_CATS = DATA.assetRules.categories;
check('Every asset: name, valid category, tangible ∈ {true,false,either}, numeric quality',
  DATA.assets.every((a) => a.name && ASSET_CATS.includes(a.category) &&
    [true, false, 'either'].includes(a.tangible) && Number.isFinite(a.quality) && a.rider));
check('Troop Quality ladder: Conscript 0 · Shield Infantry 1 · Specialist 2 · Elite 3 (3–4) · Fedaykin 4 · Sardaukar 4',
  (() => { const q = (n) => DATA.assets.find((a) => a.name === n)?.quality;
    return q('Conscript') === 0 && q('Shield Infantry') === 1 && q('Specialist Troops') === 2 &&
           q('Elite Troop') === 3 && q('Fedaykin') === 4 && q('Sardaukar') === 4; })());
check('Crysknife baseline Quality 1', DATA.assets.find((a) => a.name === 'Crysknife')?.quality === 1);
check('Ornithopter flagged fast; shields flagged defensive',
  DATA.assets.find((a) => a.name === 'Ornithopter')?.fast === true &&
  DATA.assets.find((a) => a.name === 'Shield (Full or Half)')?.defensive === true);
check('Every category has ≥1 asset',
  ASSET_CATS.every((c) => DATA.assets.some((a) => a.category === c)));
check('Wealth ladder tiers 0–5', DATA.wealth.ladder.length === 6 &&
  DATA.wealth.ladder.every((t, i) => t.tier === i && t.examples));
check('Wealth: personal ornithopter at tier 4, ½-point over-buy rule',
  /ornithopter/i.test(DATA.wealth.ladder[4].examples) && DATA.wealth.halfPointCost === 0.5 &&
  /negative/i.test(DATA.wealth.purchaseRule));

console.log('— Data invariants (ledger 0d: core House scaffolding) —');
check('4 core House types', DATA.houseTypes.length === 4);
check('9 core House domains', DATA.houseDomains.length === 9);
check('House scope note points numeric economy to The Great Game',
  /Great Game/.test(DATA.houseScopeNote) && /narrative/i.test(DATA.houseScopeNote));

console.log('— Data invariants (ledger 0d: T18–T21 core House lists) —');
check('Homeworld: 6 option categories, each non-empty',
  (() => { const o = DATA.homeworld.options;
    return ['weather', 'habitation', 'crimeRate', 'crimeStance', 'contentment', 'publicWealth']
      .every((k) => Array.isArray(o[k]) && o[k].length >= 2); })());
check('13 House roles, each with id + name + duty, Ruler present',
  DATA.houseRoles.length === 13 && DATA.houseRoles.every((r) => r.id && r.name && r.duty) &&
  DATA.houseRoles.some((r) => r.id === 'ruler'));
check('Enemy Hatred: 4 degrees on d20 covering 1–20; Dislike = +1 Difficulty',
  DATA.houseEnemies.rollDie === 'd20' && DATA.houseEnemies.hatred.length === 4 &&
  DATA.houseEnemies.hatred.map((h) => h.range).join(',') === '1–5,6–10,11–15,16–20' &&
  /\+1 Difficulty/.test(DATA.houseEnemies.hatred[0].effect));
check('Enemy Reasons: 10 entries (incl. "No Reason" 19–20), full d20 coverage',
  DATA.houseEnemies.reasons.length === 10 &&
  DATA.houseEnemies.reasons[9].name === 'No Reason' &&
  DATA.houseEnemies.reasons[9].range === '19–20' &&
  DATA.houseEnemies.reasons.some((r) => r.name === 'Competition' && r.range === '1–2'));
check('House traits: 3 reputation examples + domain-trait note referencing domains',
  DATA.houseTraits.reputationExamples.length === 3 &&
  DATA.houseTraits.reputationExamples.includes('Honorable') &&
  /primary domain/i.test(DATA.houseTraits.domainTraitNote));
check('Enemy count tied to House type: Nascent 0 · Minor 1 · Major 2 · Great 3 (principal + host), with rival types',
  (() => { const p = DATA.houseEnemies.perType;
    return p.nascent.count === 0 && p.nascent.types.length === 0 &&
      p.minor.count === 1 && JSON.stringify(p.minor.types) === '["minor"]' &&
      p.major.count === 2 && JSON.stringify(p.major.types) === '["major","minor"]' &&
      p.great.count === 3 && p.great.types[0] === 'great' &&
      p.great.types.filter((t) => t === 'minor').length === 2 &&
      DATA.houseTypes.every((t) => p[t.id] && typeof p[t.id].makeup === 'string'); })());

console.log('— Data invariants (Great Game houseManagement subsystem: T16/T17 numeric) —');
const { EXPANSION: GG } = await import(join(root, 'data-great-game.js'));
const HM = GG.houseManagement;
check('greatGame subsystem lists houseManagement', GG.subsystems.includes('houseManagement'));
check('House skill arrays: Nascent 6/5/5/4/4 · Minor 7/6/6/5/4 · Major 8/7/6/5/4 · Great 9/8/7/6/5',
  JSON.stringify(HM.skillArrays.nascent) === '[6,5,5,4,4]' &&
  JSON.stringify(HM.skillArrays.minor) === '[7,6,6,5,4]' &&
  JSON.stringify(HM.skillArrays.major) === '[8,7,6,5,4]' &&
  JSON.stringify(HM.skillArrays.great) === '[9,8,7,6,5]');
check('Great Game keeps only the economy (no domainCounts / startingThreat / domainDetails here)',
  HM.domainCounts === undefined && HM.startingThreatPerPlayer === undefined && HM.domainDetails === undefined);
check('Skill-array keys match the 4 core House type ids',
  DATA.houseTypes.every((t) => HM.skillArrays[t.id]));
check('Subtype income: Machinery P 12R/32W, Expertise P 6R/44W, Workers P 8R/40W',
  HM.subtypeIncome.machinery.primary.resources === 12 && HM.subtypeIncome.machinery.primary.wealth === 32 &&
  HM.subtypeIncome.expertise.primary.resources === 6 && HM.subtypeIncome.expertise.primary.wealth === 44 &&
  HM.subtypeIncome.workers.primary.resources === 8 && HM.subtypeIncome.workers.primary.wealth === 40);
check('Category modifiers: societal P −3R/+8W, tangible P +3R/−6W',
  HM.categoryModifiers.societal.primary.resources === -3 && HM.categoryModifiers.societal.primary.wealth === 8 &&
  HM.categoryModifiers.tangible.primary.resources === 3 && HM.categoryModifiers.tangible.primary.wealth === -6);
check('Modifier groups partition all 9 core domains, disjoint',
  (() => { const g = [...HM.categoryModifiers.societal.domains, ...HM.categoryModifiers.tangible.domains];
    return g.length === 9 && new Set(g).size === 9 &&
      DATA.houseDomains.every((d) => g.includes(d.id)); })());
check('Income minimum floor 2R/10W', HM.minimum.resources === 2 && HM.minimum.wealth === 10);
check('Income formula sample: Military(tangible) primary Machinery = 15R/26W; floor applies to Understanding(societal) secondary = 2R/26W',
  (() => {
    const income = (subtype, group, slot) => {
      const b = HM.subtypeIncome[subtype][slot], m = HM.categoryModifiers[group][slot];
      return { resources: Math.max(HM.minimum.resources, b.resources + m.resources),
               wealth: Math.max(HM.minimum.wealth, b.wealth + m.wealth) };
    };
    const mil = income('machinery', 'tangible', 'primary');       // 12+3, 32-6
    const und = income('understanding', 'societal', 'secondary');  // 3-1=2, 22+4
    return mil.resources === 15 && mil.wealth === 26 && und.resources === 2 && und.wealth === 26;
  })());
// Backs the wizard fix (ensureDomainSubtypes): a domain whose subtype was back-filled to the
// first subtype must still produce valid, non-zero income for both tiers — so a core House
// edited into Great Game never shows 0 income / fails subtype validation.
check('Every asset subtype has primary + secondary income (default subtype always yields income)',
  Object.keys(HM.subtypeIncome).every((st) =>
    HM.subtypeIncome[st].primary && HM.subtypeIncome[st].secondary &&
    HM.subtypeIncome[st].primary.wealth > 0 && HM.subtypeIncome[st].secondary.wealth > 0));

console.log('— Core House domain detail + starting Threat (Core Rulebook House chapter) —');
check('Core starting Threat per player: Nascent 0 · Minor 1 · Major 2 · Great 3',
  DATA.houseStartingThreat.nascent === 0 && DATA.houseStartingThreat.minor === 1 &&
  DATA.houseStartingThreat.major === 2 && DATA.houseStartingThreat.great === 3);
check('Core domain counts: Nascent 0/1 · Minor 1/1 · Major 1/2 · Great 2/3',
  DATA.houseDomainCounts.nascent.primary === 0 && DATA.houseDomainCounts.nascent.secondary === 1 &&
  DATA.houseDomainCounts.major.primary === 1 && DATA.houseDomainCounts.major.secondary === 2 &&
  DATA.houseDomainCounts.great.primary === 2 && DATA.houseDomainCounts.great.secondary === 3);
check('Starting-Threat & domain-count keys match the 4 core House type ids',
  DATA.houseTypes.every((t) => DATA.houseStartingThreat[t.id] != null && DATA.houseDomainCounts[t.id]));
check('Core houseDomainDetails covers all 9 domains',
  DATA.houseDomains.every((d) => DATA.houseDomainDetails[d.id]) && Object.keys(DATA.houseDomainDetails).length === 9);
check('Every domain has a description + an example list for all 5 subtypes',
  DATA.houseDomains.every((d) => {
    const det = DATA.houseDomainDetails[d.id];
    return det.desc && det.desc.length >= 20 &&
      Object.keys(DATA.houseSubtypeDefs).every((st) => Array.isArray(det.examples[st]) && det.examples[st].length);
  }));
check('Core subtypeDefs describe all 5 subtypes; domainGuidance has intro/primary/secondary',
  Object.keys(DATA.houseSubtypeDefs).length === 5 &&
  Object.values(DATA.houseSubtypeDefs).every((v) => typeof v === 'string' && v.length) &&
  ['intro', 'primary', 'secondary'].every((k) => typeof DATA.houseDomainGuidance[k] === 'string' && DATA.houseDomainGuidance[k].length));
check('Great Game subtypeIncome keys match the 5 core subtype ids',
  Object.keys(HM.subtypeIncome).every((st) => DATA.houseSubtypeDefs[st]) &&
  Object.keys(HM.subtypeIncome).length === Object.keys(DATA.houseSubtypeDefs).length);
check('Core "Rival House enters" Threat spend describes the enemy-House appearance (in person or rumor)',
  (() => { const s = DATA.threatSpends.find((x) => x.name === 'Rival House enters');
    return s && s.cost === '1' && /rumor/i.test(s.desc) && /enemy House/i.test(s.desc); })());

console.log('— Data invariants (ledger 0e: T27 NPC tier recipes) —');
const { NPCS } = await import(join(root, 'data-npcs.js'));
const TR = NPCS.tierRecipes;
check('Tier recipes present for minor/notable/major', TR && TR.minor && TR.notable && TR.major);
check('General: NPCs add/spend 3 Threat for a Determination effect, use Threat not Momentum',
  TR.general.threatPerDetermination === 3 && TR.general.usesThreatNotMomentum === true);
check('Minor: skills 6/5/5/4/4, single drive 4–8 (typ 5), 1 focus, 0–1 talent, one-hit defeat',
  JSON.stringify(TR.minor.skills) === '[6,5,5,4,4]' &&
  JSON.stringify(TR.minor.drive.range) === '[4,8]' && TR.minor.drive.typical === 5 &&
  TR.minor.focuses.count === 1 && TR.minor.talents.min === 0 && TR.minor.talents.max === 1 &&
  /single successful attack/i.test(TR.minor.defeat));
check('Notable: skills 7/6/5/5/4, drives 7&6 rest 5, 1 statement, 3 focuses, 1–2 talents, extended-task defeat',
  JSON.stringify(TR.notable.skills) === '[7,6,5,5,4]' &&
  JSON.stringify(TR.notable.drives.high) === '[7,6]' && TR.notable.drives.rest === 5 &&
  TR.notable.drives.statements === 1 && TR.notable.focuses.count === 3 &&
  TR.notable.talents.min === 1 && TR.notable.talents.max === 2 && /[Ee]xtended task/.test(TR.notable.defeat));
check('Major: drives 8/7/6/5/4, skills base 4 + 11 free cap 8, 3–5 focuses, 2–4 talents',
  JSON.stringify(TR.major.drives.array) === '[8,7,6,5,4]' &&
  TR.major.skills.base === 4 && TR.major.skills.freePoints === 11 && TR.major.skills.cap === 8 &&
  TR.major.focuses.min === 3 && TR.major.focuses.max === 5 &&
  TR.major.talents.min === 2 && TR.major.talents.max === 4);

console.log('— Data invariants (ledger 0e: T28 generic stat blocks + special abilities) —');
check('6 NPC special abilities incl. Proficiency & Additional Threat Option',
  NPCS.specialAbilities.length === 6 &&
  NPCS.specialAbilities.every((a) => a.name && a.effect) &&
  NPCS.specialAbilities.some((a) => a.name === 'Proficiency') &&
  NPCS.specialAbilities.some((a) => a.name === 'Additional Threat Option'));
check('25 generic archetype stat blocks, unique ids', NPCS.archetypes.length === 25 &&
  new Set(NPCS.archetypes.map((a) => a.id)).size === 25);
const SKILL_IDS = DATA.skills.map((s) => s.id);
const DRIVE_IDS = DATA.drives.map((d) => d.id);
check('Every stat block: 5 skills (4–8), 5 drives (4–8), ≥1 trait, ≥1 focus, ≥1 talent',
  NPCS.archetypes.every((n) =>
    SKILL_IDS.every((s) => Number.isInteger(n.skills[s]) && n.skills[s] >= 2 && n.skills[s] <= 8) &&
    DRIVE_IDS.every((d) => Number.isInteger(n.drives[d]) && n.drives[d] >= 3 && n.drives[d] <= 8) &&
    n.traits.length >= 1 && n.focuses.length >= 1 && n.talents.length >= 1));
check('Every focus references a valid skill id',
  NPCS.archetypes.every((n) => n.focuses.every((f) => SKILL_IDS.includes(f.skill))));
check('Every statement key is a valid drive id present on the block',
  NPCS.archetypes.every((n) => Object.keys(n.statements || {}).every((d) => DRIVE_IDS.includes(d) && n.drives[d])));
check('Tier inference: skill-8 blocks are Major, others Notable (4 Majors: RevMother, Fremen Elder/Warrior, Sardaukar)',
  NPCS.archetypes.every((n) => {
    const hasEight = SKILL_IDS.some((s) => n.skills[s] === 8);
    return n.tier === (hasEight ? 'major' : 'notable');
  }) && NPCS.archetypes.filter((n) => n.tier === 'major').length === 4);
check('Sardaukar: Battle 8, Duty 8 statement, 5 signature assets',
  (() => { const s = NPCS.archetypes.find((n) => n.id === 'sardaukar');
    return s.skills.battle === 8 && s.drives.duty === 8 && s.statements.duty && s.assets.length === 5; })());
check('Merchant prints its assets (Information Network, Ornithopter, Warehouse) — retrieval-gap correction',
  (() => { const m = NPCS.archetypes.find((n) => n.id === 'merchant');
    return m.assets.length === 3 && m.assets.includes('Information Network') &&
      m.assets.includes('Ornithopter') && m.assets.includes('Warehouse'); })());

console.log('— Data invariants (ledger 0e: T29 iconic stat blocks) —');
check('12 iconics (incl. Paul, owner-transcribed), unique ids', NPCS.iconics.length === 12 &&
  new Set(NPCS.iconics.map((i) => i.id)).size === 12 &&
  NPCS.iconics.some((i) => i.id === 'paulAtreides'));
check('All 12 iconics complete: full 5 skills + 5 drives (4–8), ≥1 statement, ≥1 talent',
  NPCS.iconics.filter((i) => i.statsIncomplete).length === 0 &&
  NPCS.iconics.every((i) =>
    SKILL_IDS.every((s) => i.skills[s] >= 4 && i.skills[s] <= 8) &&
    DRIVE_IDS.every((d) => i.drives[d] >= 4 && i.drives[d] <= 8) &&
    Object.keys(i.statements).length >= 1 && i.talents.length >= 1));
check('Rabban owner-transcribed stats: Battle 7 / Power 8 / 3 statements; Fenring: Move 8 / Power 8',
  (() => { const r = NPCS.iconics.find((i) => i.id === 'glossuRabban');
    const f = NPCS.iconics.find((i) => i.id === 'hasimirFenring');
    return r.skills.battle === 7 && r.drives.power === 8 && Object.keys(r.statements).length === 3 &&
      f.skills.move === 8 && f.drives.power === 8; })());
check('Paul owner-transcribed stats: Truth 8, Battle 6, 7 focuses, Voice + Prana-Bindu Conditioning',
  (() => { const p = NPCS.iconics.find((i) => i.id === 'paulAtreides');
    return p.drives.truth === 8 && p.skills.battle === 6 && p.focuses.length === 7 &&
      p.talents.includes('Voice') && p.talents.includes('Prana-Bindu Conditioning'); })());
check('Feyd owner-transcribed stats differ from Rabban (conflation resolved): Move 7, Comm 6, Understand 6, Short Blades',
  (() => { const f = NPCS.iconics.find((i) => i.id === 'feydRautha');
    const r = NPCS.iconics.find((i) => i.id === 'glossuRabban');
    return f.skills.move === 7 && f.skills.communicate === 6 && f.skills.understand === 6 &&
      f.focuses.some((x) => x.name === 'Short Blades') &&
      // conflation proof: Feyd's skills are NOT identical to Rabban's
      JSON.stringify(f.skills) !== JSON.stringify(r.skills); })());
check('Merchant assets present (owner-confirmed): Information Network, Ornithopter, Warehouse',
  (() => { const m = NPCS.archetypes.find((a) => a.id === 'merchant');
    return JSON.stringify(m.assets) === JSON.stringify(['Information Network', 'Ornithopter', 'Warehouse']); })());
check('Iconic statements/focuses reference valid drive/skill ids',
  NPCS.iconics.every((i) =>
    Object.keys(i.statements || {}).every((d) => DRIVE_IDS.includes(d)) &&
    (i.focuses || []).every((f) => SKILL_IDS.includes(f.skill))));
check('Leto: Duty 8 with 3 statements; Duncan: Battle 8 & Discipline 8',
  (() => { const leto = NPCS.iconics.find((i) => i.id === 'letoAtreides');
    const dun = NPCS.iconics.find((i) => i.id === 'duncanIdaho');
    return leto.drives.duty === 8 && Object.keys(leto.statements).length === 3 &&
      dun.skills.battle === 8 && dun.skills.discipline === 8; })());

console.log('— Data invariants (ledger 0e: T30 iconic pregens) —');
const { PREGENS } = await import(join(root, 'data-pregens.js'));
const { normalizeCharacter: normPre, targetNumber: tnPre } = await import(join(root, 'src/derived.js'));
check('12 pregens (all iconics complete: Paul/Rabban/Fenring/Feyd all included)', PREGENS.length === 12 &&
  ['paulAtreides', 'glossuRabban', 'hasimirFenring', 'feydRautha']
    .every((id) => PREGENS.some((p) => p.pregenId === id)));
check('Every pregen: name, 5 skills, 5 drives, ≥1 statement, ≥1 talent, Determination 1 (PC rule)',
  PREGENS.every((p) => p.identity.name &&
    SKILL_IDS.every((s) => Number.isInteger(p.skills[s])) &&
    DRIVE_IDS.every((d) => Number.isInteger(p.drives[d])) &&
    Object.keys(p.driveStatements).length >= 1 && p.talents.length >= 1 &&
    p.determination === 1));
check('Drive statements carry {text, challenged:false}; talents/traits carry source',
  PREGENS.every((p) => Object.values(p.driveStatements).every((s) => s.text && s.challenged === false) &&
    p.talents.every((t) => t.source === 'iconic') && p.traits.every((t) => t.negative === false)));
check('Pregen round-trips through normalizeCharacter with a working target number',
  (() => { const leto = PREGENS.find((p) => p.pregenId === 'letoAtreides');
    const c = normPre(leto);
    return c.identity.name === 'Duke Leto Atreides' && c.determination === 1 &&
      tnPre(c, 'communicate', 'duty') === 7 + 8; })());

console.log('— Data invariants (ledger 0e: T31 story hooks + T32 enemy generator) —');
check('Story Hook Generator: d20, 5 columns × 5 entries, 5 ranges covering 1–20',
  DATA.storyHooks.rollDie === 'd20' && DATA.storyHooks.ranges.length === 5 &&
  DATA.storyHooks.ranges[0] === '1–4' && DATA.storyHooks.ranges[4] === '17–20' &&
  ['plot', 'goal', 'location', 'hazard', 'character'].every((c) =>
    Array.isArray(DATA.storyHooks.columns[c]) && DATA.storyHooks.columns[c].length === 5 &&
    DATA.storyHooks.columns[c].every((e) => typeof e === 'string' && e.length)));
check('Story hook index maps d20 → 0..4 (floor((roll−1)/4)); roll 20 → last entry',
  (() => { const idx = (r) => Math.floor((r - 1) / 4);
    return idx(1) === 0 && idx(4) === 0 && idx(5) === 1 && idx(20) === 4 &&
      DATA.storyHooks.columns.goal[idx(20)] === 'Secret Spice Stores'; })());
check('T32 enemy generator ready: houseEnemies is a rollable d20 table',
  DATA.houseEnemies.rollDie === 'd20' &&
  DATA.houseEnemies.hatred.every((h) => h.range) && DATA.houseEnemies.reasons.every((r) => r.range));

console.log('— Data invariants (ledger T39: creation guidance) —');
const G = DATA.creationGuidance;
check('Drive-statement examples for all 5 drives (≥6 each)',
  DRIVE_IDS.every((d) => Array.isArray(G.driveStatementExamples[d]) && G.driveStatementExamples[d].length >= 6));
check('Drive-statement writing tips present', G.driveStatementTips.length >= 5);
check('Ambition themes for all 5 drives', DRIVE_IDS.every((d) => typeof G.ambitionByDrive[d] === 'string' && G.ambitionByDrive[d].length));
check('Appearance + relationship prompts present (6 each)',
  G.appearanceQuestions.length === 6 && G.relationshipQuestions.length === 6);
check('Ambition intro + change rule present; change rule cites the <6 threshold',
  typeof G.ambitionIntro === 'string' && G.ambitionIntro.length &&
  typeof G.ambitionChangeRule === 'string' && /6/.test(G.ambitionChangeRule));
check('Every focus example has a description',
  DATA.skills.every((s) => DATA.focusExamples[s.id].every((f) => f.desc && f.desc.length)));

console.log('— Data invariants (ledger T40: creation in play) —');
const CIP = DATA.creationInPlay;
check('Creation-in-play has all 7 define options',
  ['trait', 'skills', 'focuses', 'talents', 'drives', 'ambition', 'assets'].every((id) =>
    CIP.options.find((o) => o.id === id)));
check('Define-option use counts: trait 1 · skills 3 · focuses 2 · talents 2 · drives 4 · ambition 1 · assets 2',
  (() => { const u = Object.fromEntries(CIP.options.map((o) => [o.id, o.uses]));
    return u.trait === 1 && u.skills === 3 && u.focuses === 2 && u.talents === 2 &&
      u.drives === 4 && u.ambition === 1 && u.assets === 2; })());
check('Drive-importance table maps 1st–5th → 8/7/6/5/4 (matches the creation array)',
  JSON.stringify(CIP.driveImportance.map((d) => d.rating)) === JSON.stringify([...DATA.creation.driveArray]));
check('Creation-in-play notes cover the Determination grant + no-challenge-until-complete rules',
  CIP.notes.some((n) => /Determination/i.test(n)) && CIP.notes.some((n) => /challenge/i.test(n)));

console.log('— Creation rules from the Core Ch.3 text (focuses / talents / drive-ranking) —');
// Focus rule: at least one focus on the primary AND one on the secondary skill.
check('Focus creation requires ≥1 on primary AND ≥1 on secondary',
  DATA.creation.focuses.minOnPrimarySkill === 1 && DATA.creation.focuses.minOnSecondarySkill === 1);
// Talent pick metadata: skill/drive/asset-category-bound talents are flagged for the wizard.
const pickTalents = DATA.talents.filter((t) => t.pick);
check('Bound talents carry a valid pick (skill/drive/assetCategory)',
  pickTalents.length >= 8 && pickTalents.every((t) => ['skill', 'drive', 'assetCategory'].includes(t.pick)));
check('Bold is skill-bound · The Reason I Fight is drive-bound · Specialist is category-bound',
  DATA.talents.find((t) => t.name === 'Bold').pick === 'skill' &&
  DATA.talents.find((t) => t.name === 'The Reason I Fight').pick === 'drive' &&
  DATA.talents.find((t) => t.name === 'Specialist').pick === 'assetCategory');
// Step notes surfaced in the app.
check('Creation step notes cover skills/focuses/talents/drives',
  ['skills', 'focuses', 'talents', 'drives'].every((k) => typeof G.stepNotes[k] === 'string' && G.stepNotes[k].length >= 40));
check('Focuses note states the secondary-skill requirement; talents note explains repeatable skill picks',
  /secondary/i.test(G.stepNotes.focuses) && /Bold/.test(G.stepNotes.talents));
// "One Way to Choose Drives" pairwise method: all 10 unique pairs, each drive in 4 comparisons.
const dr = G.driveRanking;
check('Drive-ranking has all 10 unique pairs of the 5 drives',
  dr.pairs.length === 10 &&
  new Set(dr.pairs.map((p) => [...p].sort().join('|'))).size === 10 &&
  dr.pairs.every(([a, b]) => DRIVE_IDS.includes(a) && DRIVE_IDS.includes(b) && a !== b));
check('Each drive appears in exactly 4 comparisons',
  DRIVE_IDS.every((d) => dr.pairs.filter((p) => p.includes(d)).length === 4));
const { rankDrivesFromComparisons } = await import(join(root, 'src/rules.js'));
// Faith wins all its pairs → ranks first; then duty(3), power(2), truth(1), justice(0).
const rankWinners = ['faith', 'duty', 'duty', 'duty', 'faith', 'faith', 'faith', 'power', 'truth', 'power'];
check('rankDrivesFromComparisons orders by wins (head-to-head tie-break)',
  JSON.stringify(rankDrivesFromComparisons(dr.pairs, rankWinners)) ===
  JSON.stringify(['faith', 'duty', 'power', 'truth', 'justice']));

console.log('— Derived module invariants —');
const { targetNumber, normalizeCharacter, clampDetermination } = await import(join(root, 'src/derived.js'));
const c = normalizeCharacter({ skills: { battle: 6 }, drives: { duty: 8 } });
check('Target number = skill + drive (6+8=14)', targetNumber(c, 'battle', 'duty') === 14);
check('Normalized character has all 5 skills ≥4',
  ['battle', 'communicate', 'discipline', 'move', 'understand'].every((s) => c.skills[s] >= 4));
check('Determination clamps to cap 3', clampDetermination(9) === 3);
const { permanentAssetCap } = await import(join(root, 'src/derived.js'));
check('Asset cap: base 5; +2 with Specialist; +3 with Specialist+Improved Resources',
  permanentAssetCap(c) === 5 &&
  permanentAssetCap({ talents: [{ name: 'Specialist' }] }) === 7 &&
  permanentAssetCap({ talents: [{ name: 'Specialist' }, { name: 'Improved Resources' }] }) === 8);

console.log('— House normalization (Phase 1 House wizard) —');
const { normalizeHouse } = await import(join(root, 'src/derived.js'));
check('normalizeHouse(null) → null', normalizeHouse(null) === null);
check('normalizeHouse back-fills homeworld/banner/arrays and preserves fields',
  (() => {
    const h = normalizeHouse({ name: 'House Varrick', type: 'major',
      domains: [{ id: 'military', tier: 'primary' }], traits: [{ name: 'Brutal', type: 'reputation' }] });
    return h.name === 'House Varrick' && h.type === 'major' &&
      h.skills === null && h.wealth === null && h.resources === null &&      // core: numeric stays null
      h.homeworld.name === '' && h.homeworld.weather === '' && h.banner.crest === '' &&
      Array.isArray(h.roles === undefined ? [] : Object.keys(h.roles)) &&
      h.domains.length === 1 && h.traits[0].type === 'reputation' && Array.isArray(h.enemies);
  })());
check('normalizeHouse keeps Great Game numeric fields when present',
  (() => {
    const h = normalizeHouse({ name: 'H', type: 'great',
      skills: { battle: 9, communicate: 8, discipline: 7, move: 6, understand: 5 }, resources: 30, wealth: 52 });
    return h.skills.battle === 9 && h.resources === 30 && h.wealth === 52;
  })());

console.log('— Store JSON export/import (Phase 2) —');
// Minimal localStorage shim so store.js runs headless.
const _mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (_mem.has(k) ? _mem.get(k) : null),
  setItem: (k, v) => _mem.set(k, String(v)),
  removeItem: (k) => _mem.delete(k),
};
const store = await import(join(root, 'src/store.js'));
store.saveCharacter({ id: 'x1', identity: { name: 'Alia' }, skills: { battle: 6 }, drives: { duty: 8 },
  assets: [{ name: 'Crysknife', quality: 1, tangible: true, permanent: true }] });
store.savePools({ momentum: 4, threat: 2 });
const bundle = store.exportAll();
check('exportAll includes app tag + characters + pools',
  bundle.app === 'imperium-player' && bundle.characters.length === 1 && bundle.pools.momentum === 4);
check('importAll rejects a foreign file',
  (() => { try { store.importAll({ foo: 1 }); return false; } catch { return true; } })());
_mem.clear();
const r = store.importAll(bundle);
check('importAll round-trips characters + pools + normalizes',
  r.characters === 1 && store.listCharacters()[0].identity.name === 'Alia' &&
  store.listCharacters()[0].skills.communicate === 4 &&   // back-filled by normalizeCharacter
  store.getPools().momentum === 4);

console.log('— Dice engine invariants (roller: evaluateDice) —');
const { evaluateDice } = await import(join(root, 'src/roller.js'));
{
  const d = evaluateDice([1, 20, 5, 12], { tn: 14, skillRating: 6, focus: true });
  const succ = d.reduce((n, x) => n + x.successes, 0);
  const comps = d.filter((x) => x.complication).length;
  check('Nat 1 crits (2 successes) even at low TN', evaluateDice([1], { tn: 4, skillRating: 4, focus: false })[0].successes === 2);
  check('Nat 20 = complication, 0 successes', d[1].complication && d[1].successes === 0);
  check('Focus crits a die ≤ skill rating (5 ≤ 6 → 2 successes)', d[2].crit && d[2].successes === 2);
  check('Success ≤ TN without focus crit is 1 success (12 ≤ 14, > skill 6)', d[3].success && !d[3].crit && d[3].successes === 1);
  check('Pool [1,20,5,12] focus tn14 skill6 → 5 successes, 1 complication', succ === 5 && comps === 1);
  check('Without focus, a die ≤ skill but > … only crits on nat 1', evaluateDice([5], { tn: 14, skillRating: 6, focus: false })[0].successes === 1);
}

console.log('— Talent automation descriptors (roller: difficultyDelta + rerollOne) —');
{
  const byName = (n) => DATA.talents.find((t) => t.name === n);
  check('Nimble: difficultyDelta −2 on move', byName('Nimble')?.auto.type === 'difficultyDelta' && byName('Nimble').auto.delta === -2 && byName('Nimble').auto.skill === 'move');
  check('Masterful Innuendo: difficultyDelta +1 on communicate', byName('Masterful Innuendo')?.auto.delta === 1 && byName('Masterful Innuendo').auto.skill === 'communicate');
  check('Ransack: difficultyDelta −1 on understand, costs +2 Threat', byName('Ransack')?.auto.delta === -1 && byName('Ransack').auto.skill === 'understand' && /2\s*Threat/i.test(byName('Ransack').auto.cost));
  check('Constantly Watching: difficultyDelta −2, no skill restriction', byName('Constantly Watching')?.auto.type === 'difficultyDelta' && byName('Constantly Watching').auto.delta === -2 && !byName('Constantly Watching').auto.skill);
  check('Bold: rerollOne when dice bought with Threat, pick skill', byName('Bold')?.auto.type === 'rerollOne' && byName('Bold').auto.when === 'boughtDiceWithThreat' && byName('Bold').pick === 'skill');
  check('Cautious: rerollOne when dice bought with Momentum, pick skill', byName('Cautious')?.auto.when === 'boughtDiceWithMomentum' && byName('Cautious').pick === 'skill');
  check('Prana-Bindu Conditioning: rerollOne on move/discipline', byName('Prana-Bindu Conditioning')?.auto.type === 'rerollOne' && byName('Prana-Bindu Conditioning').auto.skills.includes('move') && byName('Prana-Bindu Conditioning').auto.skills.includes('discipline'));
  check('The Reason I Fight: rerollOne on battle using picked drive', byName('The Reason I Fight')?.auto.type === 'rerollOne' && byName('The Reason I Fight').auto.skill === 'battle' && byName('The Reason I Fight').auto.usesPickedDrive === true && byName('The Reason I Fight').pick === 'drive');
  check('Other Memory: autoSuccesses count 3, no skill restriction', byName('Other Memory')?.auto.type === 'autoSuccesses' && byName('Other Memory').auto.count === 3 && !byName('Other Memory').auto.skill);
  check('Cool Under Pressure: determinationAutoSucceed, 0 Momentum, pick skill', byName('Cool Under Pressure')?.auto.type === 'determinationAutoSucceed' && byName('Cool Under Pressure').auto.momentumGenerated === 0 && byName('Cool Under Pressure').pick === 'skill');
  check('Calculated Prediction: testForPredictions, Understand D4, +1 per 2 Momentum', byName('Calculated Prediction')?.auto.type === 'testForPredictions' && byName('Calculated Prediction').auto.skill === 'understand' && byName('Calculated Prediction').auto.difficulty === 4 && byName('Calculated Prediction').auto.extraPerMomentum === 2);
}

console.log('— Phase 3 remaining: Architect mode, opposed/assist, T38 citations —');
{
  const { slug } = await import(join(root, 'src/cite.js'));
  check('cite slug: title → stable rule id', slug('Skill test basics') === 'rule-skill-test-basics' && slug('Opposed tests') === 'rule-opposed-tests');
  const roller = readFileSync(join(root, 'src/roller.js'), 'utf8');
  check('Roller: Architect mode uses House skill + personal drive', /house\.skills\[cfg\.skill\]\s*\+\s*character\.drives\[cfg\.drive\]/.test(roller));
  check('Roller: opposed tie goes to active (successes >= Difficulty)', /successes\s*>=\s*diff/.test(roller));
  check('Roller: assist successes gated on leader ≥1 (leaderOwn)', /leaderOwn\s*>=\s*1/.test(roller));
  check('Roller: opposed failure banks shortfall as defender Momentum', /opposedShortfall/.test(roller) && /momentumDelta \+= opposedShortfall/.test(roller));
  check('Roller: cites the rules library (T38)', /cite\('Skill test basics'/.test(roller) && /cite\('Opposed tests'/.test(roller));
  // Every card title referenced by a cite() must exist as a rules card in screens.js.
  const screens = readFileSync(join(root, 'src/screens.js'), 'utf8');
  const citedTitles = [...roller.matchAll(/cite\('([^']+)'/g)].map((m) => m[1]);
  check('Every cite() target is a real rules card', citedTitles.every((t) => screens.includes(`ruleCard('${t}'`)),
    citedTitles.filter((t) => !screens.includes(`ruleCard('${t}'`)).join(', '));
}

console.log('— Phase 4: scene/adventure lifecycle engine (§3.17) —');
{
  const life = await import(join(root, 'src/combat.js'));
  // Seed one character with a temporary asset, a permanent asset, a challenged statement,
  // Resist used, low Determination, and set Momentum 4.
  _mem.clear();
  store.saveCharacter({
    id: 'l1', identity: { name: 'Chani' },
    skills: { battle: 6 }, drives: { duty: 8 },
    driveStatements: { duty: { text: 'The desert provides.', challenged: true } },
    assets: [{ name: 'Crysknife', quality: 1, permanent: true }, { name: 'Borrowed thopter', quality: 0, permanent: false }],
    determination: 3,
    state: { resistUsedThisScene: true, defeatTrack: { req: 0, progress: 0 } },
    advancement: { points: 5, advancesPurchasedThisAdventure: 1, skillAdvancesTotal: 0, log: [] },
  });
  store.savePools({ momentum: 4, threat: 2 });

  const es = life.endScene();
  const afterScene = store.getCharacter('l1');
  check('endScene: Momentum decays by 1 (4→3)', store.getPools().momentum === 3);
  check('endScene: temporary asset expired, permanent kept', afterScene.assets.length === 1 && afterScene.assets[0].name === 'Crysknife');
  check('endScene: Resist Defeat reset', afterScene.state.resistUsedThisScene === false);
  check('endScene: challenged statement NOT auto-recovered at scene end', afterScene.driveStatements.duty.challenged === true);
  es.undo();
  const undone = store.getCharacter('l1');
  check('endScene undo: restores Momentum + temp asset + resist flag', store.getPools().momentum === 4 && undone.assets.length === 2 && undone.state.resistUsedThisScene === true);

  const ea = life.endAdventure();
  const afterAdv = store.getCharacter('l1');
  check('endAdventure: Determination resets to start (1)', afterAdv.determination === 1);
  check('endAdventure: challenged statement recovers', afterAdv.driveStatements.duty.challenged === false);
  check('endAdventure: advance-purchase gate resets', afterAdv.advancement.advancesPurchasedThisAdventure === 0);
  check('endAdventure: temporary asset expired', afterAdv.assets.length === 1);
  ea.undo();
  const undone2 = store.getCharacter('l1');
  check('endAdventure undo: restores Determination + statement + gate', undone2.determination === 3 && undone2.driveStatements.duty.challenged === true && undone2.advancement.advancesPurchasedThisAdventure === 1);

  check('startAdventureDetermination: base 1, +1 with Unquestionable Loyalty (cap 3)',
    life.startAdventureDetermination({ talents: [] }) === 1 &&
    life.startAdventureDetermination({ talents: [{ name: 'Unquestionable Loyalty' }] }) === 2);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
