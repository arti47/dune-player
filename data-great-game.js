// data-great-game.js — The Great Game (Houses of the Landsraad) expansion crunch,
// toggle-gated behind Settings.greatGame() (off by default). Campaign plot/lore excluded.
//
// Ledger T33–T37: talents/archetypes/factions/focuses/assets/NPCs NOT YET EXTRACTED (Phase 6).
// The House Management SUBSYSTEM (T36) IS extracted here now: the source places the numeric
// House economy — skill arrays, the domain Wealth/Resources income table, and the Income
// phase — in this book, NOT the Core Rulebook (corroborated 2026-07-06). The Core book creates
// a House only narratively (see DATA.houseTypes / DATA.houseDomains + DATA.houseScopeNote).

export const EXPANSION = {
  id: 'greatGame',
  extracted: false, // full T33–T37 pass pending; houseManagement subsystem + CHOAM options below are done
  archetypes: [],
  assets: [], npcs: [],
  subsystems: ['houseManagement', 'planetGenerator'],

  // ---------- GM planet generator (d20 tables; index = roll − 1) ----------
  planetGenerator: {
    rollDie: 'd20',
    tables: {
      planetType: ['Uninhabitable gas giant', 'Uninhabitable rocky world', 'Uninhabitable moon/planetoid', 'Uninhabitable ice giant', 'Uninhabitable toxic-atmosphere planet', 'Uninhabitable furnace planet', 'Abandoned volcanic planet', 'Asteroid', 'Ice asteroid', 'Mineral-rich asteroid', 'Habitable alpine world', 'Habitable mineral world', 'Habitable frozen world', 'Habitable ocean world', 'Habitable arid world', 'Habitable forested world', 'Habitable tropical world', 'Habitable savanna world', 'Habitable mined-out world', 'Earth-like planet'],
      politicalAffiliation: ['Core world under direct House Corrino control', 'Core world under a Great House', 'Core world under a Major House', 'Core world under a Minor/Nascent House', 'Industrial world, House Corrino governorship', 'Agricultural world, House Corrino governorship', 'Mineral-mining world, House Corrino governorship', 'Industrial world, Great House', 'Industrial world, Major House', 'Industrial world, Minor/Nascent House', 'Agricultural world, Great House', 'Agricultural world, Major House', 'Agricultural world, Minor/Nascent House', 'Mineral-mining world, Great House', 'Mineral-mining world, Major House', 'Mineral-mining world, Minor/Nascent House', 'Military-training planet, House Corrino', 'Military-training planet, Great House', 'Military-training planet, Major House', 'Outlier independent world, no affiliation'],
      militaryPower: ['Major ground forces, space fleet, heavy defenses (key world)', 'Major ground forces, space fleet, heavy defenses', 'Ground forces, space fleet, medium defenses', 'Ground forces, medium defenses', 'Police forces, medium defenses', 'Police forces, small fleet, medium defenses', 'Space fleet, heavy defenses', 'Major space fleet, ground forces, medium defenses', 'Military outpost, space fleet only', 'Military outpost, space fleet only', 'Ground forces, medium defenses', 'Ground forces, small fleet, medium defenses', 'Ground forces, large space fleet, medium defenses', 'Very large ground-training post, small fleet, medium defenses', 'Police forces, medium fleet, basic defenses', 'Police forces, medium fleet, no defenses', 'Police forces, small fleet, no defenses', 'Police forces on the ground, no defenses', 'Lightly policed, no defenses', 'Undefended, only local militia'],
      populationLifestyle: ['Massive population, trade wealth, bureaucratic services', 'Massive population, agrarian culture', 'Massive population, industrial culture', 'Massive population, mining/smelting', 'Average population, mixed business', 'Average population, higher education & training', 'Average population, military-training facility', 'Average population, agriculture', 'Average population, space shipyards & refitting', 'Average population, entertainment production', 'Low population, nature reserves/zoos/hunting', 'Low population, casinos & pleasure resorts', 'Low population, agriculture & fisheries', 'Low population, religious retreats', 'Low population, ore-refining stations', 'Low population, gas-refining stations', 'Low population, smuggler outpost(s)', 'Low population, Imperial outpost(s)', 'Small towns, subsistence farming', 'Small village(s), a few dozen people'],
    },
  },

  // ---------- CHOAM options (T33 · owner-supplied 2026-07-08) ----------
  // A CHOAM Agent faction template + 7 CHOAM talents + CHOAM focus examples. Paraphrased.
  factionTemplates: [
    {
      id: 'choamAgent',
      name: 'CHOAM Agent',
      trait: 'CHOAM Agent',
      mandatoryTalents: { mode: 'all', options: ['Hand of CHOAM'] },
      suggestedArchetypes: ['Analyst', 'Courtier', 'Envoy', 'Steward', 'Strategist'],
      desc: 'Embedded in a House to keep it profitable and compliant with the Landsraad trade bureaucracy — while quietly securing CHOAM’s share of every deal, and occasionally spying on their own House for the corporation. Often serves as treasurer, advisor, or envoy.',
      factionIntro: 'Serving two masters: a CHOAM agent enriches the House but answers to the corporation. Actions that threaten trade — or dishonest dealing that risks an Imperial audit — can put them at odds with the House they serve.',
    },
  ],
  talents: [
    { name: 'Hand of CHOAM', faction: 'choamAgent',
      effect: 'Once per session, on a test dealing with planetary or galactic trade you act in or assist, apply the effect of spending 1 Determination — revealing your CHOAM ties to everyone involved.',
      auto: { type: 'narrative', note: 'Once/session: a free Determination effect on a Trade test.' } },
    { name: 'Audit', faction: 'choamAgent',
      effect: 'Spend 1 Momentum to compel a House or CHOAM trade member to show their recent trade records (which may be falsified, but must show something). Abusing it may cost you the talent.',
      auto: { type: 'narrative' } },
    { name: 'Check the Books', faction: 'choamAgent',
      effect: 'Reviewing financial records, when you spend 1 Momentum to Obtain Information you may ask two questions for that first point instead of one.',
      auto: { type: 'obtainInfoBonus', extraQuestions: 1, condition: 'financial records' } },
    { name: 'Deep Pockets', faction: 'choamAgent',
      effect: 'Once per session create a temporary Wealth asset for trade or purchases; it expires at scene end and can’t be made permanent. Raise its Quality by +1 per Momentum spent when created.',
      auto: { type: 'createAsset', assetName: 'Wealth', temporary: true, qualityPerMomentum: 1, oncePerSession: true } },
    { name: 'Dirty Money', faction: 'choamAgent',
      effect: 'On a successful Discipline test, spend 1+ Momentum to legitimise one illegal asset (or a level of its Quality) for a scene; or 2 Momentum per asset/level to make another’s asset suspect, exposing it to CHOAM/Landsraad sanction.',
      auto: { type: 'narrative', skill: 'discipline' } },
    { name: 'Master of Coin', faction: 'choamAgent',
      effect: 'On a financial/economic test where CHOAM’s influence is relevant, re-roll 1d20 that didn’t succeed. Also: a Challenging (D2) Understand test adds +5 to your House’s Wealth for the session (House management).',
      auto: { type: 'rerollOne', skills: ['understand', 'communicate'], condition: 'financial/economic test where CHOAM is relevant' } },
    { name: 'Report Malfeasance', faction: 'choamAgent',
      effect: 'At any time, give a target who’d fear a CHOAM audit the complication “Reported to CHOAM”, lasting until they prove innocence or the investigation ends. Spurious reports invite CHOAM reprisal.',
      auto: { type: 'narrative' } },
    // CHOAM Director talents — high-level CHOAM agents (also eligible for the CHOAM talents above)
    { name: 'Access to CHOAM Facilities', faction: 'choamAgent',
      effect: 'Once per session, spend 1 Momentum to obtain any physical asset (knife to Heighliner) from CHOAM for the next scene, delivered at Quality 0 (rare items may take time, GM’s call).',
      auto: { type: 'narrative' } },
    { name: 'Financial Analysis', faction: 'choamAgent',
      effect: 'Your accountants forensically read any ledgers you access: Obtain Information about the status of any organisation whose records you hold.',
      auto: { type: 'narrative' } },
    { name: 'Pull the Strings', faction: 'choamAgent',
      effect: 'Nudge the Imperial market: every primary and secondary domain in your House generates an additional Wealth point during House management.',
      auto: { type: 'narrative' } },
    { name: 'Rich Beyond the Dreams of Avarice', faction: 'choamAgent',
      effect: 'Any asset you create starts at Quality 1; spend 1 Momentum to make it Quality 2 (in addition to any Momentum spent to make it permanent).',
      auto: { type: 'narrative' } },
    { name: 'Sanction Shareholder', faction: 'choamAgent',
      effect: 'Once per adventure, sanction a shareholder (usually stripping territory/production). The next time they move against you or your faction, their Threat costs the GM double.',
      auto: { type: 'narrative' } },
  ],
  focuses: [
    { skill: 'understand', name: 'CHOAM Bureaucracy', desc: 'The corporation’s trade rules, audits, and paperwork.' },
    { skill: 'understand', name: 'Data Analysis', desc: 'Reading ledgers, markets, and figures for the real story.' },
    { skill: 'understand', name: 'Imperial Politics', desc: 'The Landsraad and court forces that move trade.' },
    { skill: 'understand', name: 'Smuggling', desc: 'Moving goods around the rules — and spotting others doing it.' },
    { skill: 'communicate', name: 'Bartering', desc: 'Haggling a deal to your (and CHOAM’s) advantage.' },
  ],

  // ---------- House Management (T36) — the Wealth/Resources ECONOMY only ----------
  // Core owns the House's narrative + structural layer (type, domain names + counts, the
  // areas-of-expertise detail, starting Threat) in data.js. This file adds only the numeric
  // economy The Great Game layers on top: the House skill VALUES and the domain income table.
  houseManagement: {
    // House type → the five House skill values assigned. (Domain counts are Core: DATA.houseDomainCounts.)
    skillArrays: {
      nascent: [6, 5, 5, 4, 4],
      minor:   [7, 6, 6, 5, 4],
      major:   [8, 7, 6, 5, 4],
      great:   [9, 8, 7, 6, 5],
    },

    // Base passive income per asset-subtype, as a Primary vs Secondary domain (Income phase).
    subtypeIncome: {
      machinery:     { primary: { resources: 12, wealth: 32 }, secondary: { resources: 6, wealth: 16 } },
      produce:       { primary: { resources: 10, wealth: 30 }, secondary: { resources: 5, wealth: 18 } },
      expertise:     { primary: { resources: 6,  wealth: 44 }, secondary: { resources: 3, wealth: 22 } },
      workers:       { primary: { resources: 8,  wealth: 40 }, secondary: { resources: 4, wealth: 20 } },
      understanding: { primary: { resources: 6,  wealth: 42 }, secondary: { resources: 3, wealth: 22 } },
    },

    // The overarching domain category then modifies the base numbers.
    categoryModifiers: {
      societal: {
        label: 'Society & culture (Artistic, Espionage, Political, Religion) — fewer Resources, more Wealth',
        domains: ['artistic', 'espionage', 'political', 'religion'],
        primary:   { resources: -3, wealth: 8 },
        secondary: { resources: -1, wealth: 4 },
      },
      tangible: {
        label: 'Tangible output (Farming, Industrial, Kanly, Military, Science) — more Resources, less Wealth',
        domains: ['farming', 'industrial', 'kanly', 'military', 'science'],
        primary:   { resources: 3, wealth: -6 },
        secondary: { resources: 1, wealth: -4 },
      },
    },

    // Floor after all modifiers.
    minimum: { resources: 2, wealth: 10 },

    // income = subtypeIncome[subtype][slot] + categoryModifiers[group][slot], clamped to minimum.
    incomeFormula: 'Per domain: base income for its asset subtype (as Primary or Secondary) + its category modifier, but never below 2 Resources / 10 Wealth.',
    incomeNote: 'Wealth = abstract finances/investments; Resources = raw materials, workers, construction expertise. Generated passively each Income phase and spent on Ventures.',
  },
};
