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
  'src/store.js', 'src/sync.js', 'src/wizard.js', 'src/roller.js', 'src/cite.js', 'src/content.js', 'src/sheet.js',
  'src/combat.js', 'src/gm.js', 'src/house.js', 'src/tutorial.js', 'src/screens.js', 'src/router.js', 'src/main.js',
];
for (const f of SHELL_FILES) check(f, existsSync(join(root, f)));

console.log('— Service worker cache discipline —');
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
check('CACHE_VERSION present', /CACHE_VERSION = 'imperium-v[\d.]+'/.test(sw));
for (const f of SHELL_FILES.filter((f) => !['service-worker.js', 'database.rules.json', 'README.md', 'CLAUDE.md'].includes(f) && !f.startsWith('tests'))) {
  check(`SW shell lists ${f}`, sw.includes(`'./${f}'`));
}
// PWA update flow: the new worker must WAIT (no auto-skipWaiting in install) and skip on message.
const swInstallBlock = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('message'"));
check('SW install has no auto skipWaiting (waits for the update prompt)',
  !/self\.skipWaiting\(\)/.test(swInstallBlock) &&
  /addEventListener\('message'[\s\S]*?SKIP_WAITING[\s\S]*?self\.skipWaiting\(\)/.test(sw));
const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
check('main.js drives the update prompt (SKIP_WAITING message + controllerchange reload)',
  /postMessage\(\{ type: 'SKIP_WAITING' \}\)/.test(mainSrc) &&
  /controllerchange/.test(mainSrc) && /showActionToast/.test(mainSrc));
// a11y: every modal gets an accessible name (explicit labelledBy, else derived from its heading);
// confirm/prompt name themselves from their message; hidden file inputs carry an aria-label.
const uiSrc = readFileSync(join(root, 'src/ui.js'), 'utf8');
check('modal() names the dialog: role=dialog + aria-modal + aria-labelledby from heading fallback',
  /role: 'dialog'/.test(uiSrc) && /'aria-modal': 'true'/.test(uiSrc) &&
  /querySelector\('h1, h2, h3'\)/.test(uiSrc) && /setAttribute\('aria-labelledby'/.test(uiSrc));
check('confirmModal + promptModal pass labelledBy from their message; prompt input is aria-labelledby',
  (uiSrc.match(/labelledBy: msgId/g) || []).length >= 2 && /input[\s\S]*?'aria-labelledby': msgId/.test(uiSrc));
const sheetSrc = readFileSync(join(root, 'src/sheet.js'), 'utf8');
const screensSrc = readFileSync(join(root, 'src/screens.js'), 'utf8');
check('hidden file inputs carry an aria-label (MD import + JSON backup import)',
  /type: 'file'[\s\S]*?'aria-label'/.test(sheetSrc) && /type: 'file'[\s\S]*?'aria-label'/.test(screensSrc));

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
check('Threat: starts at 2 per player + 5 generation rules (3 player, 2 GM), each well-formed',
  DATA.threat.perPlayer === 2 && Array.isArray(DATA.threat.generation) && DATA.threat.generation.length === 5 &&
  DATA.threat.generation.filter((g) => g.by === 'Player').length === 3 &&
  DATA.threat.generation.filter((g) => g.by === 'GM').length === 2 &&
  DATA.threat.generation.every((g) => g.source && g.amount && g.desc) &&
  typeof DATA.threat.startNote === 'string' && DATA.threat.startNote.length > 20);
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
// §11 audit: Peril fires at 4+ Threat spent at once. The main chapter text (p.138 "four or
// more") is canonical over the p.139 quick-reference sidebar ("3 or more") — the two printed
// sources disagree; the detailed prose wins (§2 corroboration).
check('Advancement: Peril earns at GM spending 4+ Threat at once (p.138 main text, not the p.139 sidebar)',
  DATA.advancement.earn.some((e) => e.trigger === 'Peril' && /\b4\+ Threat\b/.test(e.desc)) &&
  !DATA.advancement.earn.some((e) => /\b3\+ Threat\b/.test(e.desc)));
// §11 audit (Core House chapter, owner-pasted): enemy Hatred + Reason d20 tables + starting Threat/domains.
check('House enemy Hatred d20: Dislike 1–5 / Rival 6–10 / Loathing 11–15 / Kanly 16–20',
  DATA.houseEnemies.hatred.map((h) => `${h.range}:${h.name}`).join('|') ===
    '1–5:Dislike|6–10:Rival|11–15:Loathing|16–20:Kanly');
check('House enemy Reason d20: 10 rows Competition→No Reason on 2-wide ranges',
  DATA.houseEnemies.reasons.length === 10 &&
  DATA.houseEnemies.reasons[0].name === 'Competition' && DATA.houseEnemies.reasons[0].range === '1–2' &&
  DATA.houseEnemies.reasons[9].name === 'No Reason' && DATA.houseEnemies.reasons[9].range === '19–20');
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
check('100 assets (Chapter 7 completeness pass)', DATA.assets.length === 100);
const ASSET_CATS = DATA.assetRules.categories;
check('Every asset: name, valid category, tangible ∈ {true,false,either}, numeric quality',
  DATA.assets.every((a) => a.name && ASSET_CATS.includes(a.category) &&
    [true, false, 'either'].includes(a.tangible) && Number.isFinite(a.quality) && a.rider));
check('Chapter 7 additions present (Lasgun/Maula Pistol/Kindjal/Heighliner/Truthsayer Drug/…)',
  ['Lasgun', 'Maula Pistol', 'Kindjal', 'Pulse-Sword', 'Ixian Damper', 'Maker Hooks', 'Stilltent',
   'Naval Transport', 'Heighliner', 'Flip-Dart', 'Shigawire Garrote', 'Shere', 'Truthsayer Drug',
   'Mentat Master of Assassins', 'Ambitious Newcomer', 'Intelligence']
    .every((n) => DATA.assets.some((a) => a.name === n)));
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

console.log('— Great Game example Houses of the Landsraad (crunch-only reference) —');
{
  const LH = GG.landsraadHouses;
  const VALID_SUBTYPES = Object.keys(HM.subtypeIncome);   // machinery/produce/expertise/workers/understanding
  check('18 example Houses extracted', Array.isArray(LH) && LH.length === 18);
  check('Every example House has 2–3 traits, colors, crest, ≥1 primary + ≥1 secondary domain',
    LH.every((h) => h.traits.length >= 2 && h.traits.length <= 3 && h.colors && h.crest &&
      h.primary.length >= 1 && h.secondary.length >= 1));
  check('Every domain entry uses a valid subtype + has a paraphrased note',
    LH.every((h) => [...h.primary, ...h.secondary].every((d) => VALID_SUBTYPES.includes(d.subtype) && d.domain && d.note)));
  check('type, when set, is one of the 4 core House types',
    LH.every((h) => h.type === null || DATA.houseTypes.some((t) => t.id === h.type)));
  check('Spot-check: Atreides Great, Honorable/Popular, pundi-rice primary Farming(produce)',
    (() => { const a = LH.find((h) => h.name === 'House Atreides');
      return a && a.type === 'great' && a.traits.includes('Honorable') &&
        a.primary[0].domain === 'Farming' && a.primary[0].subtype === 'produce'; })());
  check('Spot-check: Wydras 3 traits, Espionage(understanding) primary',
    (() => { const w = LH.find((h) => h.name === 'House Wydras');
      return w && w.traits.length === 3 && w.primary[0].domain === 'Espionage' && w.primary[0].subtype === 'understanding'; })());
}

console.log('— Great Game House Management subsystem (T36) —');
{
  const M = GG.houseManagement.management;
  check('Session has the 6-step yearly loop (News→…→End of Year)', M.steps.length === 6 &&
    M.steps[0].name.startsWith('News') && M.steps[1].name === 'Income' && M.steps[5].name.startsWith('End of Year'));
  check('Starting status by type: Nascent 15 · Minor 25 · Major 45 · Great 65',
    M.status.startingByType.nascent === 15 && M.status.startingByType.minor === 25 &&
    M.status.startingByType.major === 45 && M.status.startingByType.great === 65);
  check('6 status levels, Respected has no modifier, Dangerous generates Threat',
    M.status.levels.length === 6 && M.status.levels[2].name === 'Respected' &&
    /2 Threat/.test(M.status.levels[5].effect));
  check('NPC House Hatred→Drive: Ambivalent 4 … Kanly 8',
    M.npcHouseHatredDrive[0].drive === 4 && M.npcHouseHatredDrive[4].hatred === 'Kanly' && M.npcHouseHatredDrive[4].drive === 8);
  check('Space by type: Nascent 10 · Minor 35 · Major 60 · Great 100; primary 25 / secondary 10',
    M.space.byType.nascent === 10 && M.space.byType.minor === 35 && M.space.byType.major === 60 &&
    M.space.byType.great === 100 && M.space.primaryDomainSpaces === 25 && M.space.secondaryDomainSpaces === 10);
  check('Military Power ladder 0–5 with upkeep 0/5/10/20/30/50',
    M.militaryPower.length === 6 && M.militaryPower.map((m) => m.upkeep).join(',') === '0,5,10,20,30,50' &&
    M.militaryPower.map((m) => m.difficulty).join(',') === '0,1,2,3,4,5');
  check('Skill upkeep: 8→8W, 9→12W, 10→24W', (() => {
    const by = Object.fromEntries(M.skillUpkeep.map((s) => [s.skill, s.wealth]));
    return by['8'] === 8 && by['9'] === 12 && by['10'] === 24; })());
  check('21 construction, 24 boon, 12 personal ventures',
    M.constructionVentures.length === 21 && M.boonVentures.length === 24 && M.personalVentures.length === 12);
  check('Ventures: 2/session, +3 unused, extra dice 5/10/15',
    M.ventureRules.perSession === 2 && M.ventureRules.tradeUnused === 3 &&
    M.ventureRules.extraDieCosts.join('/') === '5/10/15');
  check('Events by status: Dangerous Opp 1–8 / Crisis 13–20; Respected Crisis 16–20',
    M.eventsByStatus[4].opportunity === '1–8' && M.eventsByStatus[4].crisis === '13–20' &&
    M.eventsByStatus[1].crisis === '16–20');
  check('10 opportunities + ≥9 crises; Convenient Misfortune at 19–20',
    M.opportunities.length === 10 && M.crises.length >= 9 &&
    M.opportunities[9].name === 'Convenient Misfortune');
  check('End-of-year Wealth theft: 1–7 none, 20 loses 20; ascension has 3 transitions',
    M.endOfYear.wealthTheft[0].lost === 0 && M.endOfYear.wealthTheft[4].lost === 20 && M.ascension.length === 3);
  // The management chapter corroborates the income + skill-array numbers already in the data.
  check('Income corroborated: Machinery P 12R/32W, Expertise P 6R/44W, floor 2R/10W',
    HM.subtypeIncome.machinery.primary.resources === 12 && HM.subtypeIncome.machinery.primary.wealth === 32 &&
    HM.subtypeIncome.expertise.primary.wealth === 44 && HM.minimum.resources === 2 && HM.minimum.wealth === 10);
}

console.log('— House Management tracker (src/house.js pure logic) —');
{
  // Minimal in-memory localStorage so instantiateExampleHouse (which saves) runs in node.
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const HOUSE = await import(join(root, 'src/house.js'));
  check('domainIncome floors: societal secondary Understanding = 2R (3−1) / 26W (22+4)',
    (() => { const i = HOUSE.domainIncome('understanding', 'societal', 'secondary'); return i.resources === 2 && i.wealth === 26; })());
  check('domainIncome: tangible primary Machinery = 15R (12+3) / 26W (32−6)',
    (() => { const i = HOUSE.domainIncome('machinery', 'tangible', 'primary'); return i.resources === 15 && i.wealth === 26; })());
  check('resolveCategory tolerates non-canonical labels (Logistics→tangible, Farming/Industrial→tangible, Artistic→societal)',
    HOUSE.resolveCategory('Logistics') === 'tangible' && HOUSE.resolveCategory('Farming/Industrial') === 'tangible' && HOUSE.resolveCategory('Artistic') === 'societal');
  check('skillUpkeepFor ladder: 4→0, 6→2, 7→4, 8→8, 9→12, 10→24',
    HOUSE.skillUpkeepFor(4) === 0 && HOUSE.skillUpkeepFor(6) === 2 && HOUSE.skillUpkeepFor(7) === 4 &&
    HOUSE.skillUpkeepFor(8) === 8 && HOUSE.skillUpkeepFor(9) === 12 && HOUSE.skillUpkeepFor(10) === 24);
  check('statusLevel: Major 45→Respected, Major 75→Problematic, Great 95→Dangerous, Nascent 15→Weak (Minor band)',
    HOUSE.statusLevel('major', 45).name === 'Respected' && HOUSE.statusLevel('major', 75).name === 'Problematic' &&
    HOUSE.statusLevel('great', 95).name === 'Dangerous' && HOUSE.statusLevel('nascent', 15).name === 'Weak');
  check('instantiateExampleHouse(Atreides): Great, skills 9/8/7/6/5, status 65, income treats domains',
    (() => {
      const h = HOUSE.instantiateExampleHouse('House Atreides');
      const inc = HOUSE.computeIncome(h);
      return h && h.type === 'great' && h.management.active && h.management.status === 65 &&
        h.skills.battle === 9 && h.skills.understand === 5 && inc.wealth > 0 && inc.resources > 0 &&
        h.domains.length === 4 && h.traits.some((t) => t.name === 'Honorable');
    })());
  check('computeUpkeep sums skill upkeep + level costs (Atreides Great, default upkeep = 10 Life + skills)',
    (() => {
      const h = HOUSE.instantiateExampleHouse('House Atreides');
      const up = HOUSE.computeUpkeep(h);
      // skills 9/8/7/6/5 → 12+8+4+2+2 = 28; lifestyle Noble 10; military None 0; population Acceptance 10
      return up.skills === 28 && up.lifestyle === 10 && up.population === 10 && up.total === 48;
    })());
  const { normalizeHouse } = await import(join(root, 'src/derived.js'));
  check('normalizeHouse management defaults incomeCollected + upkeepPaid to false (once-per-year guards)',
    (() => { const h = normalizeHouse({ management: { active: true } });
      return h.management.incomeCollected === false && h.management.upkeepPaid === false; })());
  check('normalizeHouse preserves a set upkeepPaid flag',
    normalizeHouse({ management: { active: true, upkeepPaid: true } }).management.upkeepPaid === true);
  delete globalThis.localStorage;
}

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
check('T28 audit spot-checks vs owner transcriptions (2026-07-10): RevMother Understand 8/faith stmt · Water Seller Battle 2 · Fremen Warrior Battle 8/Faith 8 · Tleilaxu Master Justice 3/Understand 7 · Sardaukar Duty 8/Battle 8',
  (() => { const get = (id) => NPCS.archetypes.find((n) => n.id === id);
    const rm = get('beneGesseritReverendMother'), ws = get('waterSeller'),
      fw = get('fremenWarrior'), tm = get('tleilaxuMaster'), sd = get('sardaukar');
    return rm.skills.understand === 8 && rm.statements.faith &&
      ws.skills.battle === 2 &&
      fw.skills.battle === 8 && fw.drives.faith === 8 &&
      tm.drives.justice === 3 && tm.skills.understand === 7 &&
      sd.drives.duty === 8 && sd.skills.battle === 8; })());

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
// §11 audit (T29 iconic stat blocks vs owner-pasted Ch.9, 2026-07-11): full skills+drives+talents
// spot-check across the range — verified all 12 match; pin representative values against regressions.
check('T29 iconic audit spot-checks: Leto/Gurney/Thufir/Duncan/Feyd/Fenring/Stilgar/Liet skills+drives+talents',
  (() => { const g = (id) => NPCS.iconics.find((i) => i.id === id);
    const leto = g('letoAtreides'), gur = g('gurneyHalleck'), thu = g('thufirHawat'),
      dun = g('duncanIdaho'), fen = g('hasimirFenring'), sti = g('stilgar'), lie = g('lietKynes');
    return leto.drives.duty === 8 && leto.drives.justice === 7 && leto.drives.power === 4 &&
      leto.skills.communicate === 7 && leto.talents.includes('Stirring Rhetoric') &&
      gur.skills.battle === 8 && gur.drives.duty === 8 && gur.talents.includes('Unquestionable Loyalty (House Atreides)') &&
      thu.skills.understand === 8 && thu.talents.includes('Mentat Discipline') && thu.talents.includes('Mind Palace') &&
      dun.skills.battle === 8 && dun.skills.discipline === 8 &&
      fen.skills.move === 8 && fen.drives.power === 8 && fen.talents.length === 6 &&
      sti.drives.faith === 8 && sti.skills.discipline === 7 &&
      lie.drives.faith === 8 && lie.skills.understand === 7; })());
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
// §11 audit (Core Ch.3 Creation-in-Play "Step Two"): archetype skills start at primary 7 /
// secondary 6 (rest 4), higher than planned creation's 6/5 — there is no +5-point step.
check('Creation-in-play skill base = primary 7 / secondary 6 / rest 4 (distinct from planned 6/5)',
  CIP.skillArray.primary === 7 && CIP.skillArray.secondary === 6 && CIP.skillArray.rest === 4 &&
  DATA.creation.skillArray.primary === 6 && DATA.creation.skillArray.secondary === 5);
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

const { hasSupportingStatement, canSpendDetermination } = await import(join(root, 'src/derived.js'));
check('hasSupportingStatement: true only with an unchallenged statement',
  hasSupportingStatement({ driveStatements: { duty: { text: 'Serve', challenged: false } } }) === true &&
  hasSupportingStatement({ driveStatements: { duty: { text: 'Serve', challenged: true } } }) === false &&
  hasSupportingStatement({ driveStatements: {} }) === false);
check('canSpendDetermination: needs Determination ≥1 AND a supporting statement (Declaration/Extra action §3.1)',
  canSpendDetermination({ determination: 1, driveStatements: { duty: { text: 'Serve', challenged: false } } }) === true &&
  canSpendDetermination({ determination: 0, driveStatements: { duty: { text: 'Serve', challenged: false } } }) === false &&
  canSpendDetermination({ determination: 2, driveStatements: { duty: { text: 'Serve', challenged: true } } }) === false);

const { recoverStatementByDriveShift, STATEMENT_MIN_DRIVE } = await import(join(root, 'src/derived.js'));
check('STATEMENT_MIN_DRIVE is 6 (lowest statement-bearing creation rating)', STATEMENT_MIN_DRIVE === 6);
{
  // §3.8 −1/+1 route: challenged 8-drive swaps with the next-lowest (7); stays ≥6 → statement kept.
  const hi = recoverStatementByDriveShift(
    { drives: { duty: 8, faith: 7, justice: 6, power: 5, truth: 4 }, driveStatements: { duty: { text: 'x', challenged: true } } }, 'duty');
  check('recoverStatementByDriveShift: 8→7 swaps with 7→8, statement kept (≥6), no promotion',
    hi && hi.drives.duty === 7 && hi.drives.faith === 8 && hi.kept === true &&
    hi.driveStatements.duty.challenged === false && hi.promotedNeedsStatement === false);
  // Challenged 6-drive drops to 5 → below 6 → statement lost; the 5→6 drive GAINS a statement (§3.8).
  const lo = recoverStatementByDriveShift(
    { drives: { duty: 6, faith: 5, justice: 4, power: 8, truth: 7 }, driveStatements: { duty: { text: 'x', challenged: true } } }, 'duty');
  check('recoverStatementByDriveShift: 6→5 loses its statement; the promoted 5→6 drive needs one',
    lo && lo.drives.duty === 5 && lo.drives.faith === 6 && lo.kept === false &&
    !('duty' in lo.driveStatements) && lo.promotedNeedsStatement === true);
  // Challenged lowest drive (4) → no lower drive → null (only "new statement" route in UI).
  const none = recoverStatementByDriveShift(
    { drives: { duty: 4, faith: 8, justice: 7, power: 6, truth: 5 }, driveStatements: { duty: { text: 'x', challenged: true } } }, 'duty');
  check('recoverStatementByDriveShift: lowest drive has no −1/+1 route (null)', none === null);
}

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

console.log('— Roll log: delete one / clear all —');
_mem.clear();
store.appendRoll({ skill: 'battle', drive: 'duty', tn: 14, dice: [3], successes: 1 });
store.appendRoll({ skill: 'move', drive: 'faith', tn: 12, dice: [20], successes: 0, complications: 1 });
store.appendRoll({ skill: 'understand', drive: 'truth', tn: 11, dice: [5], successes: 1 });
check('appendRoll stacks newest-first', store.getRollLog().length === 3 && store.getRollLog()[0].skill === 'understand');
store.deleteRollAt(0);   // remove the newest
check('deleteRollAt removes exactly that entry', store.getRollLog().length === 2 && store.getRollLog()[0].skill === 'move');
store.deleteRollAt(99);  // out of range = no-op
check('deleteRollAt ignores an out-of-range index', store.getRollLog().length === 2);
store.clearRollLog();
check('clearRollLog empties the log', store.getRollLog().length === 0);

console.log('— Character Markdown export / import (round-trip + reject) —');
_mem.clear();
{
  const src = normPre({ id: 'md1', identity: { name: 'Chani', archetype: 'warrior', ambition: 'Free Arrakis' },
    skills: { battle: 6, move: 5 }, drives: { duty: 8, faith: 7 },
    driveStatements: { duty: { text: 'Serve the tribe', challenged: false } },
    focuses: [{ skill: 'battle', name: 'Short Blades' }],
    talents: [{ name: 'Bold', skill: 'battle', source: 'chosen' }],
    traits: [{ name: 'Warrior', negative: false, source: 'archetype' }],
    assets: [{ name: 'Crysknife', quality: 1, tangible: true, permanent: true }], notes: 'Sietch Tabr' });
  const md = store.characterToMarkdown(src);
  check('characterToMarkdown renders readable headings + a data island',
    md.startsWith('# Chani') && md.includes('## Skills') && md.includes('- Battle 6') &&
    md.includes('IMPERIUM-CHARACTER v1'));
  const back = store.characterFromMarkdown(md);
  check('characterFromMarkdown round-trips the character losslessly',
    back.identity.name === 'Chani' && back.skills.battle === 6 && back.drives.duty === 8 &&
    back.driveStatements.duty.text === 'Serve the tribe' && back.talents[0].skill === 'battle' &&
    back.assets[0].name === 'Crysknife' && back.notes === 'Sietch Tabr');
  check('characterFromMarkdown rejects a Markdown file with no data island',
    (() => { try { store.characterFromMarkdown('# Just a heading\n\nsome prose'); return false; } catch { return true; } })());
  const imported = store.importCharacterMarkdown(md);
  check('importCharacterMarkdown saves under a fresh id (not the source id)',
    imported.id !== 'md1' && store.getCharacter(imported.id).identity.name === 'Chani');
}

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
  // Adjustable complication range: a die ≥ the threshold = a complication (default 20 = Normal).
  check('Complication range: default (no threshold) fires only on 20',
    evaluateDice([19, 20], { tn: 14, skillRating: 6, focus: false }).filter((x) => x.complication).length === 1);
  check('Complication range: Risky (threshold 19) fires on 19 and 20',
    evaluateDice([18, 19, 20], { tn: 14, skillRating: 6, focus: false, complicationThreshold: 19 }).filter((x) => x.complication).length === 2);
  check('Complication range: Treacherous (threshold 16) fires on 16–20',
    evaluateDice([15, 16, 17], { tn: 14, skillRating: 6, focus: false, complicationThreshold: 16 }).filter((x) => x.complication).length === 2);
}
// §Core complication data: the 5-step range table + succeed-at-a-cost.
check('DATA.complications.ranges: Normal 20 … Treacherous 16, thresholds 20/19/18/17/16',
  DATA.complications.ranges.length === 5 &&
  JSON.stringify(DATA.complications.ranges.map((r) => r.threshold)) === JSON.stringify([20, 19, 18, 17, 16]) &&
  DATA.complications.ranges[0].id === 'normal' && DATA.complications.ranges[4].id === 'treacherous');
check('DATA.complications.succeedAtCost: +1 complication for a 0-Momentum bare success',
  DATA.complications.succeedAtCost.addsComplications === 1 && DATA.complications.succeedAtCost.momentumGenerated === 0);
{
  const roller2 = readFileSync(join(root, 'src/roller.js'), 'utf8');
  check('Roller wires complication range (compThreshold → evaluateDice) + succeed-at-a-cost (bare success = diff, 0 Momentum)',
    /complicationThreshold:\s*compThreshold\(\)/.test(roller2) &&
    /sacOn\s*\?\s*diff\s*:\s*baseSuccesses/.test(roller2));
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
  check('Roller: opposed tie goes to active (successes >= Difficulty)', /[Ss]uccesses\s*>=\s*diff/.test(roller));
  check('Roller: assist successes gated on leader ≥1 (leaderOwn)', /leaderOwn\s*>=\s*1/.test(roller));
  check('Roller: opposed failure banks shortfall as defender Momentum', /opposedShortfall/.test(roller) && /momentumDelta \+= opposedShortfall/.test(roller));
  check('Roller: cites the rules library (T38)', /cite\('Skill test basics'/.test(roller) && /cite\('Opposed tests'/.test(roller));
  // Every card title referenced by a cite() anywhere must exist as a rules card in screens.js.
  const screens = readFileSync(join(root, 'src/screens.js'), 'utf8');
  const citeSources = ['src/roller.js', 'src/combat.js', 'src/sheet.js']
    .map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const citedTitles = [...new Set([...citeSources.matchAll(/cite\('([^']+)'/g)].map((m) => m[1]))];
  check('Every cite() target (roller/combat/sheet) is a real rules card', citedTitles.every((t) => screens.includes(`ruleCard('${t}'`)),
    citedTitles.filter((t) => !screens.includes(`ruleCard('${t}'`)).join(', '));

  // T38: the library covers every §3 mechanic the ledger enumerates.
  const requiredCards = ['Skill test basics', 'Difficulty ladder', 'Momentum spends', 'Threat spends (GM)',
    'Determination', 'Drive statements', 'Complications', 'Traits', 'Opposed tests', 'Assists',
    'Extended tasks', 'Conflict types', 'Conflict turn order', 'Defeat & recovery',
    'Scene & adventure lifecycle', 'Advancement', 'Assets & wealth', 'Powers'];
  check('T38 rules library covers every §3 mechanic',
    requiredCards.every((t) => screens.includes(`ruleCard('${t}'`)),
    requiredCards.filter((t) => !screens.includes(`ruleCard('${t}'`)).join(', '));
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

console.log('— Phase 4: advancement cost formulas (§3.10) —');
{
  const R = await import(join(root, 'src/rules.js'));
  const cA = { advancement: { skillAdvancesTotal: 0 }, focuses: [], talents: [] };
  const cB = { advancement: { skillAdvancesTotal: 2 }, focuses: [{}, {}, {}, {}], talents: [{}, {}] };
  check('Skill advance: 10 + 1 per previous (0→10, 2→12)', R.skillAdvanceCost(cA) === 10 && R.skillAdvanceCost(cB) === 12);
  check('Focus advance: number of focuses owned (0→0, 4→4)', R.focusAdvanceCost(cA) === 0 && R.focusAdvanceCost(cB) === 4);
  check('Talent advance: 3 × talents owned (0→0, 2→6)', R.talentAdvanceCost(cA) === 0 && R.talentAdvanceCost(cB) === 6);
  check('Asset permanent: flat 3', R.assetPermanentCost() === 3);
  check('Asset Quality +1: 3 × current Quality (Q2→6)', R.assetQualityCost({ quality: 2 }) === 6 && R.assetQualityCost({ quality: 0 }) === 0);
  check('Retrained cost halves, rounds up (12→6, 11→6)', R.retrainedCost(12) === 6 && R.retrainedCost(11) === 6);
  check('Advancement calc numbers live in DATA (no hardcode)', DATA.advancement.calc.skill.base === 10 && DATA.advancement.calc.talent.perTalentOwned === 3 && DATA.advancement.calc.skill.skillCap === 8);
  const nc = normalizeCharacter({});
  check('normalizeCharacter back-fills advancement.skillsAdvanced []', Array.isArray(nc.advancement.skillsAdvanced) && nc.advancement.skillsAdvanced.length === 0);
}

console.log('— Phase 4: extended tasks + defeat/recovery (§3.1/§3.7/§3.8) —');
{
  const { scoreExtendedTask } = await import(join(root, 'src/combat.js'));
  check('scoreExtendedTask: base 2 + Quality + Momentum − complication, floored',
    scoreExtendedTask({}) === 2 &&
    scoreExtendedTask({ assetQuality: 2 }) === 4 &&
    scoreExtendedTask({ assetQuality: 1, momentumPoints: 2 }) === 5 &&
    scoreExtendedTask({ assetQuality: 0, complicationPoints: 5 }) === 0);
  check('Defeat numbers in DATA: hit base 2, recovery base 4, resist 1 Momentum, lasting 2, stabilize Diff 2',
    DATA.defeat.pointsPerHitBase === 2 && DATA.defeat.recovery.normal.requirementBase === 4 &&
    DATA.defeat.resistDefeat.momentumCost === 1 && DATA.defeat.lastingDefeatMomentumCost === 2 &&
    DATA.defeat.recovery.lasting.difficulty === 2);
  check('normalizeCharacter back-fills state.stabilized = false', normalizeCharacter({}).state.stabilized === false);
  // Tasks store round-trip (localStorage shim already installed above).
  store.saveTasks([{ id: 't1', name: 'Ride the worm', requirement: 8, progress: 0, contributors: [], log: [] }]);
  check('getTasks/saveTasks round-trips', store.getTasks().length === 1 && store.getTasks()[0].requirement === 8);
}

console.log('— Phase 4: local conflict helper (§3.12 initiative) —');
{
  const { startConflict, takeTurn, nextRound, opposingSide, defeatRequirementFor } = await import(join(root, 'src/combat.js'));
  check('opposingSide flips a↔b', opposingSide('a') === 'b' && opposingSide('b') === 'a');
  // §3.7: a PC's defeat requirement defaults to the conflict type's defence skill (not 0).
  const pc = { skills: { battle: 6, communicate: 4, discipline: 7, move: 5, understand: 4 } };
  check('defeatRequirementFor: duel → Battle rating; espionage → Discipline rating; unknown → 0',
    defeatRequirementFor(pc, 'duel') === 6 && defeatRequirementFor(pc, 'espionage') === 7 &&
    defeatRequirementFor({ skills: {} }, 'duel') === 0);
  // Regression: the attack dialog builds its body with `? … : null` branches, so the
  // replaceChildren list must be nullish-filtered or a stray "null" text node renders.
  const combatSrc = readFileSync(join(root, 'src/combat.js'), 'utf8');
  check('attackDialog replaceChildren is nullish-filtered (no stray "null")',
    /wrap\.replaceChildren\(\.\.\.\[[\s\S]*\]\.filter\(\(k\) => k != null\)\)/.test(combatSrc));
  let cf = startConflict('duel');
  cf.combatants = [
    { id: 'A1', side: 'a', actedThisRound: false, defeated: false, defeatTrack: { req: 0, progress: 0 } },
    { id: 'B1', side: 'b', actedThisRound: false, defeated: false, defeatTrack: { req: 0, progress: 0 } },
  ];
  check('startConflict: round 1, 2 zones, side A opens', cf.round === 1 && cf.zones.length === 2 && cf.currentSide === 'a');
  cf = takeTurn(cf, 'A1');   // normal turn → initiative passes to B
  check('takeTurn passes initiative to the opposing side + marks acted + records last actor',
    cf.currentSide === 'b' && cf.combatants.find((c) => c.id === 'A1').actedThisRound === true && cf.lastActorId === 'A1' && cf.keptInitiative === false);
  const kept = takeTurn(cf, 'B1', true);   // Keep the Initiative → side stays B
  check('Keep the Initiative keeps the same side + sets keptInitiative', kept.currentSide === 'b' && kept.keptInitiative === true);
  const keptAgain = takeTurn(kept, 'B1', true);   // can't keep twice in a row → passes
  check('Keep the Initiative cannot be used twice in a row (passes instead)', keptAgain.currentSide === 'a' && keptAgain.keptInitiative === false);
  const acted = { ...cf, lastActorId: 'A1', combatants: cf.combatants.map((c) => ({ ...c, actedThisRound: true })) };
  const nr = nextRound(acted);
  check('nextRound: round+1, acted flags cleared, the OPPOSING side opens by default (§6)',
    nr.round === 2 && nr.combatants.every((c) => c.actedThisRound === false) && nr.currentSide === 'b');
  check('nextRound(keepOpener=true): the last actor’s own side opens (paid 2)',
    nextRound(acted, true).currentSide === 'a');
}

console.log('— Phase 2: Creation-in-Play interactive tracker (T40) —');
{
  const nc = normalizeCharacter({});
  check('normalizeCharacter back-fills creationInPlay (inactive, 7 used counters at 0)',
    nc.creationInPlay.active === false && nc.creationInPlay.complete === false &&
    Object.keys(nc.creationInPlay.used).length === 7 &&
    Object.values(nc.creationInPlay.used).every((v) => v === 0) &&
    Array.isArray(nc.creationInPlay.skillRatingsUsed) && Array.isArray(nc.creationInPlay.driveRatingsUsed));
  check('normalizeCharacter merges partial creationInPlay.used without losing keys',
    (() => { const m = normalizeCharacter({ creationInPlay: { active: true, used: { skills: 2 } } });
      return m.creationInPlay.active === true && m.creationInPlay.used.skills === 2 &&
        m.creationInPlay.used.drives === 0 && Object.keys(m.creationInPlay.used).length === 7; })());
  // Every define option in the data has an id the tracker handles + a positive use count.
  const ids = new Set(['trait', 'skills', 'focuses', 'talents', 'drives', 'ambition', 'assets']);
  check('creationInPlay options: all 7 known ids with positive uses',
    DATA.creationInPlay.options.length === 7 &&
    DATA.creationInPlay.options.every((o) => ids.has(o.id) && o.uses >= 1));

  // Redesign: Creation in Play is an alternative creation MODE entered in the wizard,
  // not a post-creation toggle on a finished sheet.
  const { stepsFor, buildCharacterInPlay } = await import(join(root, 'src/wizard.js'));
  check('wizard stepsFor: complete mode = 8 steps, inPlay mode = Concept+Archetype only',
    stepsFor({ mode: 'complete' }).length === 8 &&
    stepsFor({ mode: 'inPlay' }).length === 2 &&
    stepsFor({ mode: 'inPlay' }).map((s) => s.title).join(',') === 'Concept,Archetype');
  {
    // A "define in play" Warrior (Battle primary / Discipline secondary) starts incomplete:
    // tracker active, skills at the Creation-in-Play base (primary 7 / secondary 6 / rest 4 —
    // NOT the planned 6/5), all five drives at the floor 4, nothing else defined yet.
    const ip = buildCharacterInPlay({ mode: 'inPlay', archetype: 'warrior', factionTemplate: null,
      identity: { name: 'Test' } });
    check('buildCharacterInPlay starts an incomplete, active creation-in-play character',
      ip.creationInPlay.active === true && ip.creationInPlay.complete === false &&
      ip.identity.name === 'Test' &&
      ip.skills.battle === 7 && ip.skills.discipline === 6 &&
      ip.skills.communicate === 4 && ip.skills.move === 4 && ip.skills.understand === 4 &&
      Object.keys(ip.drives).length === 5 && Object.values(ip.drives).every((v) => v === 4) &&
      ip.focuses.length === 0 && ip.assets.length === 0 &&
      ip.traits.some((t) => t.source === 'archetype') &&
      ip.determination === DATA.determination.startPerAdventure);
  }
  {
    // A fixed faction (Bene Gesserit, mode:'all') grants its mandatory talent + trait up front.
    const bg = buildCharacterInPlay({ mode: 'inPlay', archetype: 'warrior', factionTemplate: 'beneGesserit',
      identity: { name: 'Sister' }, skills: { battle: 6, communicate: 4, discipline: 4, move: 5, understand: 4 } });
    check('buildCharacterInPlay: fixed faction grants trait + mandatory talent at creation',
      bg.traits.some((t) => t.source === 'faction') && bg.talents.some((t) => t.source === 'faction'));
  }
}

console.log('— Phase 6: GM screen rollable-table helpers (§3.16) —');
{
  const { storyHookIndex, rowForRoll } = await import(join(root, 'src/gm.js'));
  check('storyHookIndex maps d20 to 0–4 by 1–4/5–8/9–12/13–16/17–20',
    storyHookIndex(1) === 0 && storyHookIndex(4) === 0 && storyHookIndex(5) === 1 &&
    storyHookIndex(12) === 2 && storyHookIndex(16) === 3 && storyHookIndex(17) === 4 && storyHookIndex(20) === 4);
  check('Every story-hook column has an entry for all 20 rolls',
    Object.values(DATA.storyHooks.columns).every((col) =>
      Array.from({ length: 20 }, (_, i) => col[storyHookIndex(i + 1)]).every((v) => typeof v === 'string' && v.length)));
  check('rowForRoll resolves Hatred degrees + all 20 Reason rolls',
    rowForRoll(DATA.houseEnemies.hatred, 1)?.name === 'Dislike' &&
    rowForRoll(DATA.houseEnemies.hatred, 20)?.name != null &&
    Array.from({ length: 20 }, (_, i) => rowForRoll(DATA.houseEnemies.reasons, i + 1)).every((r) => r && r.name));
  check('NPC compendium spans 25 archetypes + 12 iconics', NPCS.archetypes.length === 25 && NPCS.iconics.length === 12);
}

console.log('— Phase 6: expansion crunch merge + CHOAM (The Great Game, T33) —');
{
  const { EXPANSION: GG } = await import(join(root, 'data-great-game.js'));
  check('data-great-game: 1 CHOAM faction template + 12 CHOAM talents (7 agent + 5 director) + focuses',
    GG.factionTemplates.length === 1 && GG.factionTemplates[0].id === 'choamAgent' &&
    GG.talents.length === 12 && GG.talents.every((t) => t.faction === 'choamAgent') &&
    GG.focuses.length >= 1);
  check('CHOAM mandatory talent (Hand of CHOAM) exists in the CHOAM talent set',
    GG.factionTemplates[0].mandatoryTalents.options[0] === 'Hand of CHOAM' &&
    GG.talents.some((t) => t.name === 'Hand of CHOAM'));
  check('CHOAM suggested archetypes all resolve to real core archetypes',
    GG.factionTemplates[0].suggestedArchetypes.every((n) => DATA.archetypes.some((a) => a.name === n)));
  check('Master of Coin automates a conditional single-die re-roll (Understand/Communicate)',
    GG.talents.find((t) => t.name === 'Master of Coin')?.auto.type === 'rerollOne' &&
    GG.talents.find((t) => t.name === 'Master of Coin').auto.skills.includes('understand'));

  const content = await import(join(root, 'src/content.js'));
  // localStorage shim is installed above (store block). Toggle greatGame off → CHOAM hidden.
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ greatGame: false }));
  check('greatGame OFF: CHOAM faction + talents excluded from the effective set',
    !content.allFactionTemplates().some((f) => f.id === 'choamAgent') &&
    !content.findTalent('Hand of CHOAM'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ greatGame: true }));
  check('greatGame ON: CHOAM faction + talents merged in; findTalent resolves CHOAM talents',
    content.allFactionTemplates().some((f) => f.id === 'choamAgent') &&
    content.findTalent('Hand of CHOAM')?.faction === 'choamAgent' &&
    content.focusExamplesFor('understand').some((f) => f.name === 'CHOAM Bureaucracy'));
  globalThis.localStorage.removeItem('imperium.settings');
}

console.log('— Sand and Dust: Fremen + Spice (T33) —');
{
  const { EXPANSION: SD } = await import(join(root, 'data-sand-and-dust.js'));
  check('6 Fremen archetypes, all faction:fremen with primary/secondary skills',
    SD.archetypes.length === 6 && SD.archetypes.every((a) => a.faction === 'fremen' &&
      DATA.skills.some((s) => s.id === a.primary) && DATA.skills.some((s) => s.id === a.secondary)));
  check('Fremen + Spice talents present (Crysknife Master, Water Wisdom, Spice Lore, Foresight)',
    ['Crysknife Master', 'Water Wisdom', 'Spice Lore', 'Foresight'].every((n) => SD.talents.some((t) => t.name === n)) &&
    SD.talents.filter((t) => t.faction === 'fremen').length >= 7 && SD.talents.filter((t) => t.spice).length >= 6);
  check('16 Fremen focuses with valid skill ids', SD.focuses.length === 16 &&
    SD.focuses.every((f) => DATA.skills.some((s) => s.id === f.skill)));
  check('Fremen life-events d20 table covers all 20 rolls',
    Array.from({ length: 20 }, (_, i) => SD.lifeEvents.table.find((r) => {
      const [lo, hi] = r.range.split('–').map(Number); return i + 1 >= lo && i + 1 <= (hi || lo);
    })).every(Boolean));
  check('Spice asset + addiction trait present', SD.spice.asset.name && SD.spice.addictionTrait === 'Spice Addicted');

  const content = await import(join(root, 'src/content.js'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ sandAndDust: false }));
  check('sandAndDust OFF: Fremen archetypes + talents excluded',
    !content.allArchetypes().some((a) => a.id === 'naib') && !content.findTalent('Crysknife Master'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ sandAndDust: true }));
  check('sandAndDust ON: Fremen archetype + talent + focus merged in',
    content.allArchetypes().some((a) => a.id === 'naib' && a.faction === 'fremen') &&
    content.findTalent('Crysknife Master')?.faction === 'fremen' &&
    content.focusExamplesFor('understand').some((f) => f.name === 'Desert Navigation'));
  globalThis.localStorage.removeItem('imperium.settings');
}

console.log('— Power and Pawns: court factions + Guild + political + new drives (T33) —');
{
  const { EXPANSION: PP } = await import(join(root, 'data-power-and-pawns.js'));
  check('4 faction templates (Sardaukar, Face Dancer, Ginaz Cadet, Ginaz Swordmaster)',
    ['sardaukar', 'faceDancer', 'ginazCadet', 'ginazSwordmaster'].every((id) => PP.factionTemplates.some((f) => f.id === id)));
  check('Face Dancer has TWO mode:all mandatory talents, both present in the talent set',
    (() => { const fd = PP.factionTemplates.find((f) => f.id === 'faceDancer');
      return fd.mandatoryTalents.mode === 'all' && fd.mandatoryTalents.options.length === 2 &&
        fd.mandatoryTalents.options.every((o) => PP.talents.some((t) => t.name === o)); })());
  check('Ginaz Cadet has no forced mandatory (empty options)',
    PP.factionTemplates.find((f) => f.id === 'ginazCadet').mandatoryTalents.options.length === 0);
  check('6 Guild archetypes (faction:guildAgent) with valid skills',
    PP.archetypes.length === 6 && PP.archetypes.every((a) => a.faction === 'guildAgent' &&
      DATA.skills.some((s) => s.id === a.primary)));
  check('Talent set spans Sardaukar/FaceDancer/Mentat/Swordmaster/Suk/Guild/political (≥60), names unique',
    PP.talents.length >= 60 && new Set(PP.talents.map((t) => t.name)).size === PP.talents.length);
  check('No Power-and-Pawns talent name collides with a core talent',
    !PP.talents.some((t) => DATA.talents.some((c) => c.name === t.name)));
  check('14 Guild focuses + 5 Suk assets + 6 new drives',
    PP.focuses.length === 14 && PP.assets.length === 5 && PP.drives.length === 6 &&
    PP.drives.every((d) => d.statements.length === 8));

  const content = await import(join(root, 'src/content.js'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ powerAndPawns: false }));
  check('powerAndPawns OFF: court factions + talents excluded',
    !content.allFactionTemplates().some((f) => f.id === 'sardaukar') && !content.findTalent('Facedance'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ powerAndPawns: true }));
  check('powerAndPawns ON: Sardaukar + Face Dancer factions, Guild archetypes, talents merged',
    content.allFactionTemplates().some((f) => f.id === 'sardaukar') &&
    content.allArchetypes().some((a) => a.id === 'guildScout' && a.faction === 'guildAgent') &&
    content.findTalent('Facedance') && content.findTalent('Methodical Efficiency')?.auto.type === 'rerollOne');
  globalThis.localStorage.removeItem('imperium.settings');
}

console.log('— The Great Game: CHOAM Director talents + planet generator (T33/T36) —');
{
  const { EXPANSION: GG } = await import(join(root, 'data-great-game.js'));
  const dirs = ['Access to CHOAM Facilities', 'Financial Analysis', 'Pull the Strings', 'Rich Beyond the Dreams of Avarice', 'Sanction Shareholder'];
  check('5 CHOAM Director talents present (faction:choamAgent)',
    dirs.every((n) => GG.talents.some((t) => t.name === n && t.faction === 'choamAgent')));
  check('Planet generator: 4 d20 tables, each with 20 entries',
    (() => { const t = GG.planetGenerator.tables;
      return ['planetType', 'politicalAffiliation', 'militaryPower', 'populationLifestyle']
        .every((k) => Array.isArray(t[k]) && t[k].length === 20 && t[k].every((e) => typeof e === 'string' && e.length)); })());
  check('No Great Game talent name collides with a core talent',
    !GG.talents.some((t) => DATA.talents.some((c) => c.name === t.name)));
}

console.log('— Expansion NPC stat blocks (T35) —');
{
  const { EXPANSION: SD } = await import(join(root, 'data-sand-and-dust.js'));
  const { EXPANSION: PP } = await import(join(root, 'data-power-and-pawns.js'));
  const SKILLS = ['battle', 'communicate', 'discipline', 'move', 'understand'];
  const wellFormed = (list) => list.every((n) =>
    n.id && n.name && n.tier &&
    Object.keys(n.skills).length === 5 && SKILLS.every((s) => Number.isInteger(n.skills[s])) &&
    Object.keys(n.drives).length === 5 &&
    (n.focuses || []).every((f) => SKILLS.includes(f.skill) && f.name) &&
    Object.keys(n.statements || {}).every((d) => d in n.drives) &&
    Array.isArray(n.talents) && Array.isArray(n.assets));
  check('Sand and Dust: 19 NPC stat blocks, all well-formed', SD.npcs.length === 19 && wellFormed(SD.npcs));
  check('Power and Pawns: 10 NPC stat blocks, all well-formed', PP.npcs.length === 10 && wellFormed(PP.npcs));
  const allIds = [...SD.npcs, ...PP.npcs].map((n) => n.id);
  check('Expansion NPC ids are unique', new Set(allIds).size === allIds.length);
  check('Spot-check: Fremen Infiltrator + Guild Navigator numbers',
    SD.npcs.find((n) => n.id === 'fremenInfiltrator')?.skills.communicate === 7 &&
    SD.npcs.find((n) => n.id === 'fremenInfiltrator')?.statements.truth === 'Learn about them.' &&
    PP.npcs.find((n) => n.id === 'guildNavigator')?.skills.move === 2 &&
    PP.npcs.find((n) => n.id === 'guildNavigator')?.drives.faith === 7);

  const content = await import(join(root, 'src/content.js'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ sandAndDust: false, powerAndPawns: false }));
  check('expansionNpcs OFF: no expansion NPCs when toggles off', content.expansionNpcs().length === 0);
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ sandAndDust: true, powerAndPawns: true }));
  check('expansionNpcs ON: 29 merged (19 S&D + 10 P&P), Fremen Infiltrator present',
    content.expansionNpcs().length === 29 && content.expansionNpcs().some((n) => n.id === 'fremenInfiltrator'));
  globalThis.localStorage.removeItem('imperium.settings');
}

console.log('— Alternative drives: merge + swapped-drive character integrity —');
{
  const content = await import(join(root, 'src/content.js'));
  const { targetNumber } = await import(join(root, 'src/derived.js'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ powerAndPawns: false }));
  check('drives merge: standard 5 only when powerAndPawns off', content.allDrives().length === 5 && !content.allDrives().some((d) => d.id === 'hate'));
  globalThis.localStorage.setItem('imperium.settings', JSON.stringify({ powerAndPawns: true }));
  check('drives merge: alternative drives appear when powerAndPawns on (Hate resolves + statements)',
    content.allDrives().some((d) => d.id === 'hate') && content.driveName('hate') === 'Hate' &&
    content.driveStatementExamplesFor('hate').length === 8);
  globalThis.localStorage.removeItem('imperium.settings');
  check('driveName falls back gracefully for an unknown id', content.driveName('duty') === 'Duty');
  // A character who swapped Duty→Hate keeps exactly five drives through normalize + target number.
  const swapped = normalizeCharacter({ skills: { battle: 6 }, drives: { hate: 8, faith: 7, justice: 6, power: 5, truth: 4 },
    driveStatements: { hate: { text: 'I hate my enemy.', challenged: false } } });
  check('normalizeCharacter preserves a swapped drive set (no re-added Duty)',
    Object.keys(swapped.drives).length === 5 && swapped.drives.hate === 8 && swapped.drives.duty === undefined);
  check('target number works with a swapped-in drive (Battle 6 + Hate 8 = 14)', targetNumber(swapped, 'battle', 'hate') === 14);
}

console.log('— Onboarding tutorial (Phase 7: src/tutorial.js) —');
{
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { LESSONS } = await import(join(root, 'src/tutorial.js'));
  const { PREGENS } = await import(join(root, 'data-pregens.js'));
  const { normalizeCharacter } = await import(join(root, 'src/derived.js'));
  const { Settings } = await import(join(root, 'src/settings.js'));
  const mkSandbox = (p = PREGENS[0]) => ({ char: normalizeCharacter({ id: 't', identity: { ...p.identity }, ...p }), pools: { momentum: 0, threat: 0, determination: 1 } });
  const beatsOk = (beats) => Array.isArray(beats) && beats.length === 5 && beats.every((b) => typeof b.title === 'string' && typeof b.render === 'function');
  check('Six lessons defined; every one has id/title/summary', LESSONS.length === 6 && LESSONS.every((l) => l.id && l.title && l.summary));
  check('Available lessons (with beats) = first-test + pools + drives; the remaining three are coming-soon',
    LESSONS.filter((l) => l.available).map((l) => l.id).join(',') === 'first-test,pools,drives' &&
    LESSONS.filter((l) => l.available).every((l) => typeof l.beats === 'function') &&
    LESSONS.filter((l) => !l.available).every((l) => !l.beats));
  check('firstTest lesson builds 5 stepped beats from a pregen sandbox, each with a title + render fn',
    beatsOk(LESSONS.find((l) => l.id === 'first-test').beats(mkSandbox())));
  check('pools lesson builds 5 stepped beats (Momentum/Threat/Determination widgets)',
    beatsOk(LESSONS.find((l) => l.id === 'pools').beats(mkSandbox())));
  check('drives lesson builds 5 stepped beats (challenge/recover widget)',
    beatsOk(LESSONS.find((l) => l.id === 'drives').beats(mkSandbox())));
  // Tutorial state schema (§13 sign-off): settings.tutorial = { seen, completedLessons[], pregenId }.
  check('Settings.tutorial() defaults to unseen / no lessons / no pregen',
    (() => { const t = Settings.tutorial(); return t.seen === false && Array.isArray(t.completedLessons) && t.completedLessons.length === 0 && t.pregenId === null; })());
  check('markLessonDone appends (dedups), setTutorial persists seen + pregenId, restartTutorial clears',
    (() => {
      Settings.setTutorial({ seen: true, pregenId: 'leto' });
      Settings.markLessonDone('first-test'); Settings.markLessonDone('first-test');
      const a = Settings.tutorial();
      Settings.restartTutorial();
      const b = Settings.tutorial();
      return a.seen === true && a.pregenId === 'leto' && a.completedLessons.length === 1 &&
        b.seen === false && b.completedLessons.length === 0 && b.pregenId === null;
    })());
  delete globalThis.localStorage;
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
